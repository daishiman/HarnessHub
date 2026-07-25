"""層別方針の導出規則・冪等性・契約版境界値 (TS-B01..B10).

対応 task: SYS-TASK-SPEC-TEST-STRATEGY-P05 / test 設計正本:
`docs/features/feat-task-spec-test-strategy/test-plan.md` §4。

`Workstream applicability` の applicable 宣言から必須テスト層を導き、層別方針が
その層の必須マーカーを含むかを検査する経路を対象にする。全体 fixture を組まず
公開関数へ直接入力するのは、対象を導出規則そのものに絞るため (単体)。
"""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import test_runtime as fx
from test_task_spec_test_strategy_sections import (
    CONTRACT_VERSION,
    ITEMS,
    spec_with_strategy,
    strategy_block,
)


VALIDATOR = fx.VALIDATOR
SCHEMA = json.loads(
    (fx.PLUGIN / "schemas" / VALIDATOR.TEST_STRATEGY_SCHEMA).read_text(encoding="utf-8")
)
PACKAGE_SCHEMA = json.loads(
    (fx.PLUGIN / "schemas" / "feature-execution-package.schema.json").read_text(encoding="utf-8")
)


def spec(workstream: str, policies: str = ITEMS["層別方針"]) -> str:
    return spec_with_strategy(
        "P01", block=strategy_block({**ITEMS, "層別方針": policies}), workstream=workstream
    )


def violation_codes(text: str, *, enforced: bool = True) -> list[str]:
    return [code for code, _ in VALIDATOR.test_strategy_violations(text, enforced=enforced)]


class LayerDerivationTests(unittest.TestCase):
    """applicable な workstream から必須層を導き、方針の欠落を拒否する。"""

    def test_frontend_applicable_requires_behavior_policy(self):
        """TS-B01: フロントが applicable なら behavior ベースの方針が要る (qa-072)。"""
        text = spec("- Frontend: applicable; 画面を追加する")
        self.assertEqual(VALIDATOR.derive_required_layers(text), ["frontend"])
        self.assertIn("task-spec-test-strategy-layer", violation_codes(text))
        self.assertEqual(violation_codes(spec("- Frontend: applicable; 画面を追加する",
                                              "frontend: behavior ベースで検証する")), [])

    def test_backend_applicable_requires_contract_and_db_policy(self):
        """TS-B02: バックエンドは API 契約と DB 結合の双方が要る。片方だけでは通さない。"""
        text = spec("- Backend: applicable; 集計処理を足す")
        self.assertEqual(VALIDATOR.derive_required_layers(text), ["backend"])
        self.assertIn("task-spec-test-strategy-layer", violation_codes(text))
        half = spec("- Backend: applicable; 集計処理を足す", "backend: API 契約テストを置く")
        self.assertEqual(violation_codes(half), ["task-spec-test-strategy-layer"])
        full = spec("- Backend: applicable; 集計処理を足す",
                    "backend: API 契約テストとロジック単体、DB 結合テストを置く")
        self.assertEqual(violation_codes(full), [])

    def test_infrastructure_applicable_requires_iac_and_smoke_policy(self):
        """TS-B03: インフラは IaC 静的検証と smoke の双方が要る。"""
        text = spec("- Infrastructure: applicable; デプロイ定義を変える")
        self.assertEqual(VALIDATOR.derive_required_layers(text), ["infrastructure"])
        self.assertIn("task-spec-test-strategy-layer", violation_codes(text))
        full = spec("- Infrastructure: applicable; デプロイ定義を変える",
                    "infrastructure: IaC 静的検証と smoke テストを行う")
        self.assertEqual(violation_codes(full), [])

    def test_api_or_data_alone_still_requires_backend_policy(self):
        """TS-B04: API のみ / Data のみでも backend 層へ OR 結合される。

        層は「どのファイルを触るか」ではなく「どの実行基盤が壊れうるか」で決まる。
        API 契約変更も migration も壊す先は同じ backend である。
        """
        for line in ("- API: applicable; 契約を変える", "- Data: applicable; migration を足す"):
            with self.subTest(line=line):
                text = spec(line)
                self.assertEqual(VALIDATOR.derive_required_layers(text), ["backend"])
                self.assertIn("task-spec-test-strategy-layer", violation_codes(text))

    def test_all_layers_not_applicable_requires_explicit_na(self):
        """TS-B05: 全層 N/A なら方針は `N/A:` 明示で足りるが、空欄は許さない。

        「該当なし」と「書き忘れ」を機械可読に区別することが目的であり、
        沈黙を合格にすると層別方針は容易に空文になる。
        """
        text = spec("- Quality: applicable; 検証だけ行う\n- Frontend: N/A: 画面変更なし")
        self.assertEqual(VALIDATOR.derive_required_layers(text), [])
        self.assertEqual(violation_codes(text), [])
        self.assertIn("task-spec-test-strategy-item-empty",
                      violation_codes(spec("- Quality: applicable; 検証だけ行う", "")))

    def test_non_layer_workstreams_derive_no_layer(self):
        """Security/Quality/Documentation/Operations は層別テスト方針を導出しない。"""
        lines = "\n".join(
            f"- {name}: applicable; 変更する"
            for name in ("Security", "Quality", "Documentation", "Operations")
        )
        self.assertEqual(VALIDATOR.derive_required_layers(spec(lines)), [])

    def test_layer_order_is_stable_for_multiple_applicable_workstreams(self):
        """複数層が applicable でも戻り順は固定 (violation 列の決定性の前提)。"""
        text = spec(
            "- Infrastructure: applicable; deploy\n- Backend: applicable; logic\n"
            "- Frontend: applicable; view"
        )
        self.assertEqual(VALIDATOR.derive_required_layers(text), ["frontend", "backend", "infrastructure"])


class IdempotencyAndContractTests(unittest.TestCase):
    """再生成冪等性と契約版の境界値。"""

    def test_parse_is_idempotent_for_identical_input(self):
        """TS-B06: 同一本文の parse は項目集合も順序も一致する。"""
        text = spec_with_strategy("P01")
        first, first_errors = VALIDATOR.parse_test_strategy(text)
        second, second_errors = VALIDATOR.parse_test_strategy(text)
        self.assertEqual(first, second)
        self.assertEqual(list(first), list(second))
        self.assertEqual(first_errors, second_errors)
        self.assertEqual(
            list(first), ["schema_version", *(key for _, key in VALIDATOR.TEST_STRATEGY_ITEMS)]
        )

    def test_violations_are_idempotent_for_identical_input(self):
        """TS-B07: 同一入力の violation 列は順序まで完全一致する (証跡の再現性)。"""
        text = spec("- Backend: applicable; 集計処理を足す")
        first = VALIDATOR.test_strategy_violations(text, enforced=True)
        self.assertEqual(first, VALIDATOR.test_strategy_violations(text, enforced=True))
        self.assertEqual([code for code, _ in first], ["task-spec-test-strategy-layer"] * 2)

    def test_schema_required_matches_canonical_item_labels(self):
        """TS-B08: schema 正本の required と Python 側の 4 項目定数の drift を検出する。"""
        self.assertEqual(
            sorted(SCHEMA["required"]),
            sorted(["schema_version", *(key for _, key in VALIDATOR.TEST_STRATEGY_ITEMS)]),
        )
        self.assertEqual(SCHEMA["additionalProperties"], False)
        self.assertEqual(set(SCHEMA["properties"]), set(SCHEMA["required"]))

    def test_contract_version_threshold_boundaries(self):
        """TS-B09: 1.1.0=legacy / 1.2.0=enforced / 2.0.0=enforced / 不正形式=legacy+schema violation。

        不正形式を legacy へ落としても、package schema の pattern が別途 violation を
        出すため「壊れた版宣言で検査を黙って無効化する」抜け道にはならない。
        """
        for version, expected in (("1.1.0", "legacy"), ("1.2.0", "enforced"), ("2.0.0", "enforced"),
                                  ("1.2", "legacy"), (None, "legacy")):
            with self.subTest(version=version):
                package = {} if version is None else {"spec_contract_version": version}
                self.assertEqual(VALIDATOR.test_strategy_mode(package), expected)
        malformed_schema = {
            "type": "object",
            "properties": {
                "spec_contract_version": PACKAGE_SCHEMA["properties"]["spec_contract_version"]
            },
        }
        self.assertTrue(VALIDATOR.schema_violations({"spec_contract_version": "1.2"}, malformed_schema))
        self.assertFalse(VALIDATOR.schema_violations({"spec_contract_version": "1.2.0"}, malformed_schema))

    def test_existing_generation_shape_stays_passing(self):
        """TS-B10: 15 section のみの既存形状は pass のまま (AC-7 の実装側根拠)。"""
        with tempfile.TemporaryDirectory() as td:
            root = Path(td); repository_id = fx.make_repo(root)
            staging, digest = fx.make_fixture(root, repository_id)
            before = VALIDATOR.validate(staging, repository_id)
            self.assertEqual(before["status"], "pass")
            self.assertEqual(before["validated_digest"], digest)
            self.assertEqual(before["violations"], [])
            self.assertEqual(before["phase_refs"], VALIDATOR.PHASES)
            self.assertEqual(
                VALIDATOR.test_strategy_violations(
                    fx.task_spec_text("P01"), enforced=False
                ),
                [],
            )
            self.assertEqual(CONTRACT_VERSION, ".".join(
                str(x) for x in VALIDATOR.TEST_STRATEGY_MIN_CONTRACT))


if __name__ == "__main__":
    unittest.main()
