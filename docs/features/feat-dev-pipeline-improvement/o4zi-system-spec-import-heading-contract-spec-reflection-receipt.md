---
status: recorded
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-system-spec-import-heading-contract-20260808
beads_id: HarnessHub-o4zi
spec_impact: reflected-internal-design
reviewed_at: "2026-08-08"
---

# system-spec import heading contract — 仕様反映受領書

## 結論

製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変えない。一方で Dev Graph の C11 readiness と C19 live trial が受理する artifact 形を変えるため、repository 内部の仕様・設計影響はあり、`system-spec/`、`specs/`、`architecture/`、`features/`、`tasks/`、`docs/` へ反映した。

## 中学生向けの説明

提出物には種類ごとの目次があります。学校全体の「目次ページ」は 4 個の見出し、学校方針は 9 個、詳しい設計書は 10 個です。今までは目次ページにも詳しい設計書と同じ数を要求して不合格にする一方、空っぽの設計書を合格にしていました。今回、提出元とファイル名を見て正しい用紙を選び、空っぽの設計書は確実に止めるよう直しました。

## 専門的な説明

`conditional_triggers` を template contract へ導入し、`family` 以外の条件を `source_lineage` へ AND 完全一致させる。system-spec index は 4 見出し、requirements definition は U1〜U9、通常 architecture は base 10 見出しを要求する。`HEADING_MISSING_KINDS` を `{architecture, specification, task}` とし、base 完全準拠を conditional 発火時も候補に残す。空条件・lineage 型不正は発火しない。

## 反映先

| 層 | 反映 |
|---|---|
| `system-spec/` | `dev-workflow.web` を qa-205 へ R4-reopen → 再確定し、compiler で再生成。 |
| `specs/` | dev-graph authority addendum に lineage trigger と fail-closed 対称性を追記。 |
| `architecture/` | dev-workflow に contract / validator / fixture の責務境界を追記し、testing-qa を新 architecture heading contract へ適合。 |
| `features/` | feat-dev-pipeline-improvement に o4zi の到達状態を追記。 |
| `tasks/` | P13 handoff へ fresh C19 live trial を残ゲートとして追記。 |
| `docs/` | feature changelog と本受領書へ実装・検証・残課題を記録。 |

## 検証

- focused pytest: 3 files / 57 tests PASS（3 contract copy の byte parity test を含む）。
- full Dev Graph pytest: 966 PASS / 1 xfail / 5 subtests PASS / 7 FAIL。失敗 7 件は C01/C02/C03/C04/C05/C14/C18 の `stale behavior closure digest` に限定され、fresh live trial が必要。
- 3 contract copy の byte equality: PASS（最終ゲートで再確認）。
- system-spec transition / compile / citation gate: PASS。
- system-spec foundation gate: 既存 U1〜U9 source-index 9 件欠落で FAIL。qa-205 由来ではなく、元発言を捏造できないため `HarnessHub-iys4` へ分離した。
- full graph schema gate: local main / p0lr branch / o4zi branch の全てが同一の 160 件（frontmatter 44、parity 5、heading 111）で FAIL。今回追加した 2 ノードの違反は 0 件で、既存 artifact 移行 debt は `HarnessHub-o4zi` で継続する。
- fresh C19 live trial: 未実施。既存 behavior-closure digest は script/template 変更により stale であり、draft PR の残ゲートとして明示する。

## レビューで是正した点

初期差分は `plugins/dev-graph/templates/template-contract.json` だけを更新し、`.dev-graph/templates/` と `plugin-plans/` が古いままだった。実行場所によって判定が変わるため、3 コピーを同期対象へ追加した。

## 残課題

- incremental plan に従い fresh C19 live trial を実行し、stale behavior-closure digest を更新する。
- `HarnessHub-iys4` で system-spec foundation U1〜U9 の真正な source-index を復旧する。
- `HarnessHub-o4zi` で main 由来の既存 artifact 見出し・frontmatter 160 件を段階移行する。
- PR merge と fresh evidence が揃うまで `HarnessHub-o4zi` を close しない。

## 500 行制約

変更した実装・文書はいずれも 500 行以下。既存 500 行超過 generated artifact は今回の手編集・分割対象にしない。
