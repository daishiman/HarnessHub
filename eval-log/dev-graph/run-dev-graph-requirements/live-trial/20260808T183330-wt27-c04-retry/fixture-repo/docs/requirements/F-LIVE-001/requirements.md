# 要件定義書: live-trial fixture の確定 feature (F-LIVE-001)

> dev-graph `run-dev-graph-requirements` が確定 system-spec と
> system-dev-planner の exact-13 package から導出した実装要件。
> 本書は要件と handoff までを担い、実装コードは生成しない。

## 1. 識別と束縛 digest

| 項目 | 値 |
| --- | --- |
| feature_id | `F-LIVE-001` |
| feature_package_id | `feature-package/F-LIVE-001` |
| repository_id | `local:sha256:7209f443a2a2b0ffc66cbc1b89766220c0920c7e0568ec7275e7fbb565b1794b` |
| package canonical digest | `sha256:30caeebd524eac9ee07cbf195dda000fb94c46de59a3ef0d281477e077b54e46` |
| feature source lineage digest | `13510cc39db4dfd200920fb418aa959781074b683c82f316e8de97fdde25f1de` (`system-spec/00-requirements-definition.md`) |
| graph snapshot digest | `sha256:6ca5bf7b77755061f4997cb2632ac8e56fe2ffc7fc605681d577aa453cf88313` |
| graph_revision | `3` |

## 2. 目的・背景 (確定 system-spec からの引用)

- 目的: live-trial の被験 skill が参照する確定要件を、実 repository から隔離して固定する
  (出典: `system-spec/00-requirements-definition.md` / 「## 目的」)。
- feature purpose: 確定 system-spec から exact-13 package を導出した macro feature
- feature goal: readiness 完了時に capability-build へ handoff できる状態
- architecture 基準: `LT-ARCH-001` — package の全 task が同一の deploy unit 前提で書かれている状態 (`architecture/lt-arch-001.md`)

## 3. スコープ

### scope_in
- 確定 system-spec からの要件導出
- exact-13 package の readiness 判定

### scope_out
- 実装コードの生成
- 実 repository への書き込み

## 4. 要件とトレーサビリティ (requirement → source → package phase → handoff field)

| ID | 要件 | source | package phase | handoff field |
| --- | --- | --- | --- | --- |
| REQ-01 | exact-13 package の全 task が implementation_readiness=complete である | `system-spec/00-requirements-definition.md` 「## 受入条件」 | P01..P13 | `execution_tasks[].implementation_readiness` |
| REQ-02 | 要件の引用元が確定 system-spec に閉じている | `system-spec/00-requirements-definition.md` 「## 受入条件」 | P01 | `digest_binding.feature_source_lineage_digest` |
| REQ-03 | package の全 task が同一 deploy unit 前提で書かれている | `architecture/lt-arch-001.md` (`LT-ARCH-001`) | P02, P03 | `package_reference.upstream_p01_entry_gate` |
| REQ-04 | 13 task が機能内前方 dependency の DAG を構成する | `system-plan/F-LIVE-001/task-graph.json` | P01→P13 | `execution_tasks[].depends_on` |
| REQ-05 | 実装は capability-build/task-graph build へ handoff し dev-graph は code を生成しない | feature `scope_out` | P05 | `self_generated_implementation_files` (空) |

## 5. 実装要件 (phase 別 handoff 対象)

| phase | task node | title | depends_on | task spec | readiness |
| --- | --- | --- | --- | --- | --- |
| P01 | `SYS-LIVE-001-P01` | 要件ベースライン確定 (P01) | - | `system-plan/F-LIVE-001/task-specs/phase-01-requirements.md` | complete |
| P02 | `SYS-LIVE-001-P02` | アーキテクチャとワークストリーム設計 (P02) | SYS-LIVE-001-P01 | `system-plan/F-LIVE-001/task-specs/phase-02-architecture.md` | complete |
| P03 | `SYS-LIVE-001-P03` | 独立設計レビュー (P03) | SYS-LIVE-001-P02 | `system-plan/F-LIVE-001/task-specs/phase-03-design-review.md` | complete |
| P04 | `SYS-LIVE-001-P04` | テストファースト設計 (P04) | SYS-LIVE-001-P03 | `system-plan/F-LIVE-001/task-specs/phase-04-test-design.md` | complete |
| P05 | `SYS-LIVE-001-P05` | 実装 (P05) | SYS-LIVE-001-P04 | `system-plan/F-LIVE-001/task-specs/phase-05-implementation.md` | complete |
| P06 | `SYS-LIVE-001-P06` | テスト実行 (P06) | SYS-LIVE-001-P05 | `system-plan/F-LIVE-001/task-specs/phase-06-test-run.md` | complete |
| P07 | `SYS-LIVE-001-P07` | feature 受入判定 (P07) | SYS-LIVE-001-P06 | `system-plan/F-LIVE-001/task-specs/phase-07-acceptance.md` | complete |
| P08 | `SYS-LIVE-001-P08` | リファクタリングと移行 (P08) | SYS-LIVE-001-P07 | `system-plan/F-LIVE-001/task-specs/phase-08-refactoring-migration.md` | complete |
| P09 | `SYS-LIVE-001-P09` | 品質・セキュリティ・運用保証 (P09) | SYS-LIVE-001-P08 | `system-plan/F-LIVE-001/task-specs/phase-09-quality-assurance.md` | complete |
| P10 | `SYS-LIVE-001-P10` | 独立最終レビュー (P10) | SYS-LIVE-001-P09 | `system-plan/F-LIVE-001/task-specs/phase-10-final-review.md` | complete |
| P11 | `SYS-LIVE-001-P11` | 再現可能な証跡整備 (P11) | SYS-LIVE-001-P10 | `system-plan/F-LIVE-001/task-specs/phase-11-evidence.md` | complete |
| P12 | `SYS-LIVE-001-P12` | ドキュメントと運用手順 (P12) | SYS-LIVE-001-P11 | `system-plan/F-LIVE-001/task-specs/phase-12-documentation-operations.md` | complete |
| P13 | `SYS-LIVE-001-P13` | リリースとクローズアウト (P13) | SYS-LIVE-001-P12 | `system-plan/F-LIVE-001/task-specs/phase-13-release-deploy.md` | complete |

## 6. 四 gate 検証結果

| gate | 実行 | 結果 |
| --- | --- | --- |
| C11 `validate-graph-schema.py` | `--graph .dev-graph/state/graph.json --repo-root <root>` | exit 0 / `valid=true` / violations 0 |
| C02 保存済み readiness/evaluation | `.dev-graph/plan-state/current/feature-package-F-LIVE-001.json` + `atomic-promotion-receipt.json` | implementation_readiness=`complete` / published_digest 一致 |
| `validate-source-digest.py` | `--registered` に lineage closure 15 件 (昇順・重複除去) | exit 0 / checked=15 / registered_mismatch 0 |
| `validate-system-plan.py` | `--repo-root <root> --feature-package feature-package/F-LIVE-001` | exit 0 / status=pass / P01..P13 exact-13 / violations 0 |

lineage closure (15 件): `F-LIVE-001`, `LT-ARCH-001`, `SYS-LIVE-001-P01`, `SYS-LIVE-001-P02`, `SYS-LIVE-001-P03`, `SYS-LIVE-001-P04`, `SYS-LIVE-001-P05`, `SYS-LIVE-001-P06`, `SYS-LIVE-001-P07`, `SYS-LIVE-001-P08`, `SYS-LIVE-001-P09`, `SYS-LIVE-001-P10`, `SYS-LIVE-001-P11`, `SYS-LIVE-001-P12`, `SYS-LIVE-001-P13`

## 7. missing sections / remediation

- missing_sections: 0 件 (scope 15 node 全件)
- incomplete / pending / fail / stale node: 0 件
- remediation owner: 該当なし

## 8. handoff

- 宛先: capability-build / task-graph build (`docs/requirements/F-LIVE-001/capability-build-handoff.json`)
- 束縛: feature `F-LIVE-001` / `feature-package/F-LIVE-001` / package digest `sha256:30caeebd524eac9ee07cbf195dda000fb94c46de59a3ef0d281477e077b54e46` / graph snapshot digest `sha256:6ca5bf7b77755061f4997cb2632ac8e56fe2ffc7fc605681d577aa453cf88313`
- 本 skill が生成した実装 source file: 0 件 (要件・matrix・digest・handoff の 4 成果物のみ)
