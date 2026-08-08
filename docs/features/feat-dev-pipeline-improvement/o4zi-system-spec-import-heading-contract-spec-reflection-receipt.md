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
| `system-spec/` | 最新 main の qa-206 / qa-207 を保持し、`dev-workflow.web` を qa-208 へ R4-reopen → 再確定して compiler で再生成。foundation U1〜U9 の source-index も確定済み QA から正規 transition で復旧。 |
| `specs/` | dev-graph authority addendum に lineage trigger、fail-closed 対称性、素材の verbatim import と実行ロジック複製の区別を追記。 |
| `architecture/` | dev-workflow / testing-qa に contract・validator・fixture の責務境界、provenance 復旧、C19 の data / logic 境界を反映。 |
| `features/` | feat-dev-pipeline-improvement に o4zi の fresh C19 PASS と到達状態を追記。 |
| `tasks/` | P13 handoff へ C19 / foundation の解決と、PR merge 後 reconciliation のみが残ることを記録。 |
| `docs/` | feature / workflow changelog と本受領書へ実装・検証・残課題を記録。 |

## 検証

- focused pytest: 3 files / 57 tests PASS（3 contract copy の byte parity test を含む）。
- full Dev Graph pytest: 975 PASS / 5 subtests PASS / 0 FAIL / 0 xfail。旧 C19 DEGRADED を前提にした固定 path テストも fresh PASS receipt 参照へ是正。
- 3 contract copy の byte equality: PASS。
- system-spec foundation / source-citation gate: PASS。最新 `main` 取込後の system-spec-harness tests は 508 PASS。U1〜U9 の原文は過去の確定済み QA を正とし、推測・捏造 0 件。
- fresh live trial: C01 / C02 / C03 / C04 / C05 / C14 / C18 / C19 の 8 件が独立評価込みですべて PASS。C19 正本 run は `20260808T154500Z-o4zi-c19r3`、actual model `claude-opus-5`、nudge=0、gate=0、behavior closure `d090d08557e35d65477b10fc7d6f692f0f1b1b146abf8a200dbc1fc78e1832f2`。
- C19 は target Skill と harness 正規4 Skill を literal call で順番どおり実行し、3件の独立監査、completeness gate、C02 経由の2 node、source / evidence digest、writer 経路、複製ロジック 0 を確認。
- full graph schema の 160 件（frontmatter 44、parity 5、heading 111）は `origin/main` と同一の既存 baseline。今回変更 node の違反は 0 件で、無関係な過去 artifact を本 commit で一括変更しない。

## レビューで是正した点

初期差分は `plugins/dev-graph/templates/template-contract.json` だけを更新し、`.dev-graph/templates/` と `plugin-plans/` が古いままだった。実行場所によって判定が変わるため、3 コピーを同期対象へ追加した。

C19 初回証跡は compile の literal Skill call が欠落したため採用せず、必須4 call が揃う fresh run を独立再評価した。また、node body と source body の一致は「ロジック複製」ではなく、lineage 付き素材を保存する正規 verbatim import であることを skill / fixture / test / 仕様へ明記した。

## 残課題

- Draft PR の CI と review / merge。merge 後の default-branch reconciliation まで `HarnessHub-o4zi` は in_progress を維持する。
- `origin/main` 由来の既存 artifact 見出し・frontmatter 160 件は、本変更と切り離した段階移行対象とする。

## 500 行制約

変更した実装・文書はいずれも 500 行以下。既存 500 行超過 generated artifact は今回の手編集・分割対象にしない。
