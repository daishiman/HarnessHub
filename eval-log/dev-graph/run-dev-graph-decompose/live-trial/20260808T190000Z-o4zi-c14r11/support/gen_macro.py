#!/usr/bin/env python3
"""C14 macro decomposition: build node inputs + bodies into a fixture staging dir.

Writes only C02 staging inputs (node input JSON, body Markdown, apply-order) and the
macro-contract source that source_lineage pins.  It never writes the graph store and
never materialises the preview graph.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
BINDING = sys.argv[2]
TS = "2026-08-08T17:15:00Z"

WANT = (
    "社内向けの業務ポータルを作りたい。利用者は自分のアカウントでログインでき、"
    "ログイン後のダッシュボードで自分に割り当てられた作業と期限を一覧できる。"
    "期限が近い作業は通知として届き、管理者は全社の進捗を集計したレポートを閲覧できる。"
)

STAGING = ROOT / ".dev-graph/cache/staging"
STAGING.mkdir(parents=True, exist_ok=True)

CONTRACT_REL = ".dev-graph/cache/staging/c14-macro-contract.json"
contract = {
    "contract": "dev-graph/C14/macro-decomposition",
    "want": WANT,
    "granularity": {
        "metric": "max_inter_feature_depends_on_per_feature",
        "max_value": 3,
    },
    "layer": "macro-only: feature + architecture + inter-feature depends_on",
    "excluded": "P01..P13 phase tasks are owned by system-dev-planner, not by C14",
    "features": [
        "feat-account-login",
        "feat-work-assignment",
        "feat-personal-dashboard",
        "feat-deadline-notification",
        "feat-admin-progress-report",
    ],
    "architecture": ["arch-portal-platform", "arch-portal-experience"],
}
contract_bytes = (
    json.dumps(contract, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
).encode("utf-8")
(ROOT / CONTRACT_REL).write_bytes(contract_bytes)
CONTRACT_DIGEST = hashlib.sha256(contract_bytes).hexdigest()


def lineage() -> dict:
    return {
        "origin_kind": "generated",
        "source_plugin": "dev-graph/run-dev-graph-decompose",
        "source_path": CONTRACT_REL,
        "source_version": "1.0.0",
        "source_digest": CONTRACT_DIGEST,
        "imported_at": TS,
    }


def base(node_id: str, kind: str, title: str, resource: str) -> dict:
    return {
        "graph_node_id": node_id,
        "artifact_kind": kind,
        "artifact_subtypes": [],
        "title": title,
        "project_id": "internal-business-portal",
        "domain": "workplace-productivity",
        "status": "draft",
        "owners": ["dev-graph-live-trial"],
        "tags": ["macro-decompose", "c14"],
        "priority": None,
        "start_date": None,
        "target_date": None,
        "iteration": None,
        "created_at": TS,
        "updated_at": TS,
        "depends_on": [],
        "related_nodes": [],
        "resource_scope": [resource],
        "parent_feature": None,
        "feature_package_id": None,
        "phase_ref": None,
        "file_path": resource,
        "template_id": kind,
        "template_version": "1.0.0",
        "confirmation_status": "draft",
        "evaluation_status": "pending",
        "confirmation_evidence": {
            "evaluator": None,
            "evidence_ref": None,
            "evaluated_digest": None,
        },
        "source_lineage": lineage(),
        "classification_confidence": 0.95,
        "classification_reason": (
            "自然文 want を macro 分解した結果の " + kind + " ノード (C14 macro contract 由来)"
        ),
        "classification_candidates": [],
        "github_publication": {
            "mode": "local_only",
            "project_aliases": [],
            "labels": [],
            "milestone": None,
        },
        "issue_linkage": None,
        "tracker_binding": BINDING,
        "beads_linkage": None,
        "github_project_linkages": [],
        "pull_request_linkages": [],
        "execution_contexts": [],
        "completion_evidence": {
            "policy": "manual",
            "status": "open",
            "source": None,
            "completed_at": None,
            "reconciled_at": None,
            "evidence_refs": [],
        },
        "implementation_readiness": {
            "status": "incomplete",
            "missing_sections": ["independent-evaluation"],
            "checked_at": TS,
        },
        "purpose": None,
        "goal": None,
        "scope_in": [],
        "scope_out": [],
        "acceptance": [],
        "architecture_refs": [],
    }


ARCH_BODY = """# Architecture overview

社内向け業務ポータルを、認証基盤・作業割当ドメイン・通知配信・集計レポートの4系統に
分けて支えるプラットフォーム側の構成を定める。全 feature が共有する実行基盤と横断契約は
このノードが所有し、feature ノードは architecture_refs でこれを参照するだけにする。

## Context and drivers

- Business/technical context: 全社員が日次で使う業務ポータルで、就業時間帯に負荷が集中する。
- Quality attribute priorities: 認証の安全性を最優先、次いで一覧応答の速さ、通知の到達確実性。
- Constraints: 社内ネットワーク前提、既存の人事マスタを唯一の従業員正本として読み取る。

## Goals and non-goals

- Goals: 認証・作業割当・通知・集計の4系統が同じ実行基盤と同じ権限モデルの上で動くこと。
- Non-goals: 社外公開、モバイル専用クライアント、ワークフロー自動化エンジンは扱わない。

## System context and boundaries

- Users/external systems: 一般利用者、管理者、人事マスタ、社内メール配信基盤。
- Trust/deployment/data boundaries: 社内網の内側にアプリ層と永続層を置き、人事マスタは
  読み取り専用の外部境界として扱う。メール配信基盤は送信のみの外向き境界とする。
- Context diagram: 利用者 と 管理者 が portal API を呼び、portal API が業務DBと
  人事マスタ読み取りアダプタとメール配信アダプタに接続する一段構成で表す。

## Container and component view

| Container/Component | Responsibility | Interface | Data owner | Deployment unit |
|---|---|---|---|---|
| portal-api | 認証・作業割当・集計の同期要求を処理する | HTTP JSON | 業務DB | api service |
| notifier | 期限接近を判定して通知を送る | 内部キュー | 通知ログ | worker service |
| portal-db | 利用者・作業・期限・通知履歴を保持する | SQL | 業務DB | managed database |

## Cross-cutting contracts

- Identity/access: セッションは portal-api が発行し、役割は一般利用者と管理者の二値に閉じる。
- Errors/resilience: 通知送信は再試行可能な冪等操作として扱い、二重送信を通知ログで抑止する。
- Observability/audit: ログイン、権限昇格、集計閲覧の3種を監査ログへ必ず残す。
- Configuration/secrets: 接続情報は実行環境の秘密ストアから注入し、リポジトリに置かない。
- Compatibility/versioning: portal-api は後方互換な追加のみを許し、破壊的変更は版を分ける。

## Subtype architecture

合成対象を記録し、該当テンプレートを埋める。

- Frontend: N/A. 画面側の構成は arch-portal-experience が所有する。
- Backend: portal-api と notifier の責務分割をこのノードで確定する。
- Infrastructure: api service と worker service と managed database の3実行単位で構成する。
- Data: N/A. 一覧と集計の読み取りモデルは arch-portal-experience が所有する。
- Security: セッション発行と役割二値モデルと監査ログをこのノードで確定する。

## Architecture decisions

| ADR | Decision | Alternatives | Trade-on rationale | Consequences |
|---|---|---|---|---|
| ADR-1 | 通知を worker service へ分離する | api 内で同期送信 | 就業時間帯の応答時間を守るため | 実行単位が1つ増える |
| ADR-2 | 人事マスタは読み取り専用参照にする | 従業員情報を複製保持 | 正本を二重化しないため | 参照先停止時は縮退運転 |

## Delivery, migration and rollback

- Build/deploy topology: api service と worker service を同一版で同時に配備する。
- Migration sequence: スキーマ追加、api service 配備、worker service 配備の順に進める。
- Rollback trigger/procedure: ログイン失敗率が閾値を超えたら直前版へ戻し、スキーマは
  追加のみのため後方互換のまま残す。

## Risks and verification

- Risk/assumption: 人事マスタの応答遅延がログイン全体を遅くする恐れがある。
- Architecture fitness test: portal-api が人事マスタへ書き込まないことを依存方向検査で自動確認する。
- Load/failure/security validation: 就業開始時刻の同時ログインを想定した負荷試験と、
  人事マスタ停止時の縮退試験と、権限昇格の否定試験を実施する。
"""

EXP_BODY = """# Architecture overview

ログイン後のダッシュボードと管理者レポートが共有する、画面構成と読み取りモデルの構成を定める。
書き込み側と実行基盤は arch-portal-platform が所有し、このノードは表示と集計読み取りに閉じる。

## Context and drivers

- Business/technical context: 利用者は自分の作業と期限、管理者は全社進捗という別々の粒度を見る。
- Quality attribute priorities: 一覧の初回表示の速さを最優先、次いで集計値の一貫性。
- Constraints: 画面は社内標準ブラウザで動作し、追加の常駐クライアントを配らない。

## Goals and non-goals

- Goals: 個人向け一覧と全社集計を同じ読み取りモデル語彙の上で提供すること。
- Non-goals: 任意軸のアドホック分析、ダッシュボードの利用者別自由レイアウトは扱わない。

## System context and boundaries

- Users/external systems: 一般利用者の画面、管理者の画面、portal-api の読み取り経路。
- Trust/deployment/data boundaries: 画面は自分の作業だけを要求し、全社集計は管理者役割の
  要求だけが到達できる境界に置く。
- Context diagram: 画面が読み取り専用エンドポイントを呼び、そのエンドポイントが
  個人ビューと集計ビューの2つの読み取りモデルを引く構成で表す。

## Container and component view

| Container/Component | Responsibility | Interface | Data owner | Deployment unit |
|---|---|---|---|---|
| portal-web | ダッシュボードと管理者レポートを描画する | HTTP | なし | static bundle |
| read-model | 個人ビューと集計ビューを提供する | SQL view | 業務DB | managed database |

## Cross-cutting contracts

- Identity/access: 画面は役割を自称せず、読み取り範囲は常にサーバ側の役割判定に従う。
- Errors/resilience: 集計が未更新のときは古い時刻を明示して表示し、無言で欠測を隠さない。
- Observability/audit: 集計閲覧の要求は利用者と対象範囲を対にして記録する。
- Configuration/secrets: 画面側に接続情報を埋め込まず、同一起点の相対参照だけを使う。
- Compatibility/versioning: 読み取りモデルの列削除は行わず、追加と非推奨表明で移行する。

## Subtype architecture

合成対象を記録し、該当テンプレートを埋める。

- Frontend: ダッシュボード画面と管理者レポート画面の構成をこのノードで確定する。
- Backend: N/A. 書き込み経路と実行単位は arch-portal-platform が所有する。
- Infrastructure: N/A. 実行基盤の構成は arch-portal-platform が所有する。
- Data: 個人ビューと集計ビューの2読み取りモデルをこのノードで確定する。
- Security: N/A. 認証と役割モデルは arch-portal-platform が所有する。

## Architecture decisions

| ADR | Decision | Alternatives | Trade-on rationale | Consequences |
|---|---|---|---|---|
| ADR-1 | 集計は事前計算ビューで持つ | 都度全件走査 | 管理者レポートの応答を安定させるため | 更新時刻の明示が必要 |
| ADR-2 | 画面は役割判定を持たない | 画面側で表示分岐 | 権限判定の正本を1か所にするため | 画面の分岐が減る |

## Delivery, migration and rollback

- Build/deploy topology: static bundle を読み取りモデルの版と同時に切り替える。
- Migration sequence: ビュー追加、読み取り経路追加、画面切替の順に進める。
- Rollback trigger/procedure: 表示不整合を検知したら画面のみ直前版へ戻す。ビューは
  追加のみのため巻き戻し不要とする。

## Risks and verification

- Risk/assumption: 集計の更新遅延が実態と異なる進捗を見せる恐れがある。
- Architecture fitness test: 画面が書き込みエンドポイントを呼ばないことを依存方向検査で確認する。
- Load/failure/security validation: 全社規模の集計件数での表示時間測定と、一般利用者が
  集計ビューへ到達できないことの否定試験を実施する。
"""

ARCHS = [
    ("arch-portal-platform", "業務ポータル共通プラットフォーム構成",
     ["backend", "infrastructure", "security"],
     "architecture/arch-portal-platform.md", ARCH_BODY),
    ("arch-portal-experience", "業務ポータル画面・読み取りモデル構成",
     ["frontend", "data"],
     "architecture/arch-portal-experience.md", EXP_BODY),
]

FEATURES = [
    {
        "id": "feat-account-login",
        "title": "自分のアカウントでのログイン",
        "purpose": "利用者が自分のアカウントで本人として業務ポータルへ入れないと、"
                   "以降の個人別の一覧も通知も成立しないため。",
        "goal": "登録済み従業員が自分のアカウントでログインし、役割に応じた画面へ"
                "到達できる状態になっている。",
        "scope_in": ["アカウント認証とセッション発行", "一般利用者と管理者の役割判定",
                     "ログイン監査ログの記録"],
        "scope_out": ["社外利用者向けの登録導線", "多要素認証の追加要素"],
        "acceptance": ["登録済みアカウントでログインすると自分向け画面へ遷移する",
                       "未登録または資格情報不一致のログインは拒否され監査ログに残る"],
        "arch": ["arch-portal-platform"],
        "deps": [],
        "dep_reason": "他 feature の前提となる起点であり、先行する機能間依存を持たない。",
    },
    {
        "id": "feat-work-assignment",
        "title": "作業と期限の割当管理",
        "purpose": "誰にどの作業がいつまで割り当てられているかという正本が無いと、"
                   "一覧も通知も集計も同じ事実を指せないため。",
        "goal": "作業と担当者と期限が業務DB上の単一の正本として保持され、"
                "更新履歴が追える状態になっている。",
        "scope_in": ["作業の登録と更新", "担当者の割当", "期限の設定と変更履歴"],
        "scope_out": ["作業の自動割当アルゴリズム", "工数見積の算出"],
        "acceptance": ["作業に担当者と期限を設定でき、変更が履歴として残る",
                       "担当者が退職状態の作業は未割当として識別できる"],
        "arch": ["arch-portal-platform"],
        "deps": ["feat-account-login"],
        "dep_reason": "割当先の担当者はログイン可能なアカウント識別子で表すため、認証が先行する。",
    },
    {
        "id": "feat-personal-dashboard",
        "title": "ログイン後の自分の作業と期限の一覧",
        "purpose": "利用者が今日何をいつまでにやるかを1画面で把握できないと、"
                   "ポータルを日次で使う動機が生まれないため。",
        "goal": "ログインした利用者が、自分に割り当てられた作業と期限を"
                "期限順の一覧として確認できる状態になっている。",
        "scope_in": ["自分向け作業一覧の表示", "期限順の並びと期限超過の識別",
                     "個人ビュー読み取りモデルの提供"],
        "scope_out": ["他人の作業の閲覧", "一覧レイアウトの利用者別カスタマイズ"],
        "acceptance": ["ログイン直後の画面に自分の作業と期限が期限順で表示される",
                       "他利用者の作業は同じ画面から到達できない"],
        "arch": ["arch-portal-platform", "arch-portal-experience"],
        "deps": ["feat-account-login", "feat-work-assignment"],
        "dep_reason": "表示対象の本人特定に認証が要り、表示内容の正本に作業割当が要るため。",
    },
    {
        "id": "feat-deadline-notification",
        "title": "期限接近作業の通知配信",
        "purpose": "期限が近い作業に気づけないと、一覧を開かない日に期限超過が発生するため。",
        "goal": "期限が接近した作業が担当者へ重複なく通知として届き、"
                "送信結果が通知ログで追える状態になっている。",
        "scope_in": ["期限接近判定", "担当者への通知送信", "重複送信の抑止と通知ログ"],
        "scope_out": ["通知チャネルの利用者別選択", "エスカレーション経路"],
        "acceptance": ["期限接近と判定された作業について担当者へ通知が1回だけ送られる",
                       "送信失敗は通知ログに残り再試行しても二重送信にならない"],
        "arch": ["arch-portal-platform"],
        "deps": ["feat-work-assignment", "feat-personal-dashboard"],
        "dep_reason": "判定対象の期限は作業割当が正本で、通知から辿る先が個人一覧になるため。",
    },
    {
        "id": "feat-admin-progress-report",
        "title": "管理者向け全社進捗集計レポート",
        "purpose": "全社の進捗が集計されないと、管理者は遅延の偏りを把握して"
                   "手当てする判断ができないため。",
        "goal": "管理者が全社の作業進捗と期限超過の状況を集計レポートとして"
                "閲覧できる状態になっている。",
        "scope_in": ["全社進捗の集計", "期限超過の集計", "管理者役割への閲覧限定"],
        "scope_out": ["任意軸のアドホック分析", "外部BIツールへの連携"],
        "acceptance": ["管理者は全社の進捗と期限超過件数を集計値として閲覧できる",
                       "一般利用者は集計レポートへ到達できない"],
        "arch": ["arch-portal-platform", "arch-portal-experience"],
        "deps": ["feat-account-login", "feat-work-assignment", "feat-personal-dashboard"],
        "dep_reason": "閲覧者の役割判定に認証、集計母数に作業割当、集計語彙の一致に"
                      "個人一覧の読み取りモデルが前提となるため。",
    },
]


def feature_body(spec: dict) -> str:
    scope_in = "\n".join(f"- スコープ内: {item}" for item in spec["scope_in"])
    scope_out = "\n".join(f"- スコープ外: {item}" for item in spec["scope_out"])
    acc = "\n".join(f"- [ ] {item}" for item in spec["acceptance"])
    refs = "\n".join(f"- `architecture_refs`: {ref}" for ref in spec["arch"])
    if spec["deps"]:
        deps = "\n".join(f"- `depends_on`: {dep}" for dep in spec["deps"])
    else:
        deps = "- `depends_on`: 先行 feature なし (macro DAG の起点)"
    return f"""# 目的

{spec["purpose"]}

## 到達状態

{spec["goal"]}

## スコープ

{scope_in}
{scope_out}

## 受入

{acc}

## アーキテクチャ参照

{refs}

## 機能間依存

{deps}
- 依存理由: {spec["dep_reason"]}

## Handoff

- per-feature planning: この feature が ready になった時点で system-dev-planner の
  run-system-dev-plan を起動するか、人手の system-dev-plan 実行結果を同じ登録経路で受理する。
- 生成物: P01 から P13 までの exact 13 executable task specs と 13 ノードの intra-feature DAG。
- 登録先: 全 task を同一 parent_feature と feature_package_id で C02 経由の atomic 登録に載せる。
- 完了rollup: exact 13 が全 done で、P07 と P10 と P11 の evidence が本 feature の
  受入条件を満たした場合だけ done へ巻き上げる。
"""


order = []
for node_id, title, subtypes, path, body in ARCHS:
    node = base(node_id, "architecture", title, path)
    node["artifact_subtypes"] = subtypes
    (STAGING / f"{node_id}.node.json").write_text(
        json.dumps({"node": node}, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    (STAGING / f"{node_id}.body.md").write_text(body, encoding="utf-8")
    order.append(node_id)

for spec in FEATURES:
    path = f"features/{spec['id']}.md"
    node = base(spec["id"], "feature", spec["title"], path)
    node["purpose"] = spec["purpose"]
    node["goal"] = spec["goal"]
    node["scope_in"] = spec["scope_in"]
    node["scope_out"] = spec["scope_out"]
    node["acceptance"] = spec["acceptance"]
    node["architecture_refs"] = spec["arch"]
    node["depends_on"] = spec["deps"]
    (STAGING / f"{spec['id']}.node.json").write_text(
        json.dumps({"node": node}, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    (STAGING / f"{spec['id']}.body.md").write_text(feature_body(spec), encoding="utf-8")
    order.append(spec["id"])

(STAGING / "apply-order.json").write_text(
    json.dumps({"binding": BINDING, "order": order}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(json.dumps({"staging": str(STAGING), "contract_digest": CONTRACT_DIGEST,
                  "nodes": len(order), "binding": BINDING}, ensure_ascii=False))
