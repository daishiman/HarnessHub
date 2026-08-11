---
graph_node_id: "issue-governance-gate-not-required-check-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["ci","branch-protection","governance","follow-up"]
priority: "medium"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "governance-check の各ゲートが merge をブロックしない (branch protection 不在)"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T03:48:29.706523Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: [".github/workflows/governance-check.yml"]
purpose: "「CI に job はあるが merge を止めない」状態を解消し、ゲートの強制力を一元化する。"
goal: "必須ゲートの集合が 1 箇所で管理され、未登録のゲートが機械的に検出される状態にする。"
scope_in: ["main の branch protection と required status checks の方針決定","必須ゲート集合の単一管理 (台帳と実 workflow の parity 検査)"]
scope_out: ["個別ゲートのロジック変更","governance-check.yml の step 追加そのもの"]
acceptance: ["必須ゲートの台帳が存在し、実 workflow の job/step と突合できる","台帳にあるのに required check に未登録のゲートが機械的に検出される","protection を敷かない方針を選ぶ場合は、その判断と代替の強制手段が記録されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/governance-gate-not-required-check-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "「CI に job はあるが merge を止めない」状態を解消し、ゲートの強制力を一元化する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/governance-gate-not-required-check-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ic7w","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
---

## 実測

```
gh api repos/:owner/:repo/branches/main/protection
-> 404 Branch not protected
```

main に branch protection が無く、required status checks も設定されていない。

## なぜ問題か

HarnessHub-hz8m で `--phase-order` 経路へ signal/verdict 検査を組み込み `continue-on-error: false`
にしたが、**job が落ちても merge は止まらない**。つまり「CI に job はあるが required check に
登録されていない」状態で、hz8m が塞いだ配線断 (旗が no-op) と同型の空洞がもう一段外側に残っている。

elegant-review run-20260809-remnants の MD-05 が指摘したとおり、他プロジェクトでは必須化経路が
branch protection という 1 箇所に一元化されるが、本 repo では「実装済みのゲートを呼ぶかどうか」が
個々の workflow 側に散っている。

## やること

1. main に protection を敷くか、敷かない方針を明示的に選ぶ (敷かないなら代替の強制手段を記録)
2. 必須ゲートの集合を台帳として 1 箇所で管理し、実 workflow との parity を機械検査する

## 注意

protection を先に敷くと既存の赤いゲート (例: validate-graph-schema の全体 exit 1) で全 PR が
止まる。台帳側で「必須にするゲート」を明示的に選ぶ設計にすること。

## 部分対応 (2026-08-11, HarnessHub-ic7w)

台帳と静的 parity 検査までは実装したが、branch protection は未適用である。したがって
「required 宣言済み」は将来の登録候補を表すだけで、現時点の merge を強制しない。
本課題は完了ではなく、外部設定を適用して初めて強制力が成立する。

- `scripts/required-check-ledger.json` — 必須ゲート候補と登録実態の台帳。
  `protection_policy.mode = "no-branch-protection"` を明示し、required 宣言済みだが
  未登録の job には**理由文字列を必須**にした。workflow 一覧、check context、PR trigger、
  paths filter は実 YAML から導出し、静的情報の二重正本を持たない。
- `scripts/validate-required-gates.py` — 台帳↔実 workflow の parity 検査。
  台帳に無い job・workflow から消えた job・理由の無い未登録を fail-closed で落とす。
  `--check-protection` は gh 認証を要するため CI 既定では付けない
  (認証不在で実 protection を検証したことにしない)。静的検査の成功時も
  `INCOMPLETE: branch protection 未適用` を出し、merge 強制の未完了を区別する。
- `.github/workflows/governance-check.yml` と `scripts/run-ci-checks.sh` (local hard gate) の
  両方へ validator を配線。read-only・外部依存なしなので local 側も blocking で置ける。

required status check の単位は step ではなく **check run = job** である点を検査器に反映した。
paths filter 付き job を required 化すると対象外 PR が永久 pending になるため、これを
hard violation にしてある (実際 `ci.yml` の `build & test (G2-G9 required status checks)` は
名前で required を自称しているが paths filter 付きで required 化できず、台帳では
`advisory` + 理由付きにしている)。

実測 (2026-08-11): `gh api repos/:owner/:repo/branches/main/protection` は
`404 Branch not protected`。workflow 13 / job 16 / required 宣言 3、うち required check 未登録 3
(`change-category-guard` / `dev-pipeline-lint` / `verify`)。この 3 件が
「protection を敷く際に最初に登録する集合」として台帳に固定されている。
テストは `tests/scripts-root/test_root__validate_required_gates.py`。

**未了**: 実際の branch protection 適用そのもの。
外部設定への破壊的変更のため本セッションでは実行していない。適用時は
`python3 scripts/validate-required-gates.py --check-protection` で台帳との一致を確認する。
