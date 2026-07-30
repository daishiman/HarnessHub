---
status: confirmed
layer: feature-spec-reflection
task: HarnessHub-3d8
graph_node_id: issue-doc-granularity-remediation-20260722
related_feature: feat-doc-governance-portability
recorded_at: 2026-07-30
---

# 300 行超過文書 remediation — 仕様反映受領書

## 1. 目的と背景

qa-070 で確定した「Markdown 正本文書は 300 行以内、既存超過は縮小のみ許す
allowlist で段階解消する」という規約に従い、Beads `HarnessHub-3d8` が所有する残り
4 文書を責務単位で分割した。目的は、仕様内容を変えずに全対象を 300 行以下へ収め、
`scripts/doc-line-limit-allowlist.json` を空にすることである。

## 2. 結論

**仕様・設計への意味的な影響はない (`spec-impact: none`)。**

今回の変更は既に確定済みの qa-070 を実施した文書構造の整理であり、新しい要件、
API、状態遷移、データ契約、認証認可、アーキテクチャ判断を追加・変更していない。
そのため `system-spec/`・`specs/`・`architecture/` の正本は変更しない。

## 3. 分割内容と情報保持

| 親文書 | 分割先 | 分割後行数 | 情報保持 |
|---|---|---:|---|
| `docs/backend-spec.md` | `docs/backend-spec-api-state.md` | 279 / 208 | 元の §§4–5 と分割先本文が文字単位で一致 |
| `docs/features/feat-hub-foundation/design-review-notes.md` | `design-review-findings.md` | 300 / 95 | 元の §§7–8 と分割先本文が文字単位で一致 |
| `docs/features/feat-stage0-distribution-gate/design-review-notes.md` | `design-review-environment-evidence.md` | 285 / 62 | 元の §§4–5 と分割先本文が文字単位で一致 |
| `docs/features/feat-hub-foundation/final-review-notes.md` | 既存 `final-review-round2-notes.md` への索引を縮約 | 296 | Round 1 / Round 2 / follow-up の責務と参照先を維持 |

親文書には元の節番号と相対リンクを残したため、既存の章構造から詳細正本へ辿れる。
本文の複製は行わず、詳細は分割先 1 箇所だけを正本とする。

## 4. 正本・設計・task への影響確認

| 層 | 確認結果 | 反映判断 |
|---|---|---|
| `docs/` | 詳細本文の責務分割と allowlist=0 の現行状態を記録 | 本変更で反映 |
| `features/` | `feat-doc-governance-portability` の目的・受入条件・scope は現状と整合 | 意味変更がないため本文変更なし |
| `system-spec/` | qa-070 の 300 行上限・fail-closed・段階 remediation 契約は不変 | reopen / re-confirm 不要 |
| `specs/` | Harness Hub の機能要件・外部契約に差分なし | R3-import 不要 |
| `architecture/` | component・dependency・data flow・運用境界に差分なし | ADR / wrapper 更新不要 |
| `tasks/` | P08 は allowlist 初期化の履歴、分割実施は当初から `HarnessHub-3d8` の責務 | content-addressed task spec は変更なし |

これは「確認を省略した」のではなく、各層の役割に照らして差分を確認し、正本を
不必要に更新しないと判断した記録である。

## 5. 中学生向けの説明

長すぎる説明書を、内容を消さずに「目次」と「くわしい説明」に分けた。元の場所から
リンクを押せば続きが読めるので、書いてあるルールは変わらない。全部の説明書が
300 行以内になったため、長すぎる文書を一時的に許す特別リストも空にできた。

## 6. 技術者向けの説明

本変更は information-preserving refactor である。既存 section anchor を親文書の
index heading として維持し、抽出本文を frontmatter 付き child document へ移した。
`git show HEAD:<parent>` から抽出した旧 section と child body の byte-equivalent な
文字列比較で 3 組すべて一致を確認した。contract surface は不変であり、変更境界は
Markdown の配置・相対リンク・line-limit allowlist の縮小に限定される。

## 7. 検証

- `git diff --check`: PASS
- 分割本文の文字列一致比較: 3 / 3 PASS
- `lint-doc-line-limit.py --ratchet-base origin/main`: 428 文書 PASS / allowlist 0
- `lint-artifact-placement.py`: PASS
- `validate-graph-schema.py`: PASS / violations 0
- `validate-system-plan.py`: 影響した 3 feature package がすべて P01–P13 / violations 0
- focused test: 29 PASS
- `make test`: 7,620 PASS / 5 SKIP / exit 0

## 8. トレーサビリティ

- Beads: `HarnessHub-3d8`
- dev-graph node: `issue-doc-granularity-remediation-20260722`
- 規約正本: `system-spec/dev-workflow.md` qa-070 / appr-008
- 実装 feature: `feat-doc-governance-portability`
