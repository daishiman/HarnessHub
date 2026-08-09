---
status: recorded
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-system-spec-import-heading-contract-20260808
beads_id: HarnessHub-o4zi
spec_impact: reflected-internal-design
reviewed_at: "2026-08-09"
---

# system-spec import heading contract — 仕様反映受領書

## 結論

製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変えない。一方で Dev Graph の C11 readiness と C19 live trial が受理する artifact 形を変えるため、repository 内部の仕様・設計影響はある。内部契約を `specs/`・`architecture/`、導線と受領記録を `features/`・`tasks/`・`docs/` へ反映し、`system-spec/` は確定済み要件の source-index 復旧だけを保持した。

## 中学生向けの説明

提出物には種類ごとの目次があります。学校全体の「目次ページ」は 4 個の見出し、学校方針は 9 個、詳しい設計書は 10 個です。今までは目次ページにも詳しい設計書と同じ数を要求して不合格にする一方、空っぽの設計書を合格にしていました。今回、提出元とファイル名を見て正しい用紙を選び、空っぽの設計書は確実に止めるよう直しました。

## 専門的な説明

`conditional_triggers` を template contract へ導入し、`family` 以外の条件を `source_lineage` へ AND 完全一致させる。system-spec index は 4 見出し、requirements definition は U1〜U9、通常 architecture は base 10 見出しを要求する。`HEADING_MISSING_KINDS` を `{architecture, specification, task}` とし、base 完全準拠を conditional 発火時も候補に残す。空条件・lineage 型不正は発火しない。

## 反映先

| 層 | 反映 |
|---|---|
| `system-spec/` | 最新 main の `qa-216` / `qa-217` と schema 1.0 の読み取り専用境界を保持。C11/C19 は製品要件の追加ではなく、上流の最終レビューで既に内部実装契約へ反映済みのため重複 QA を作らない。main 競合で欠落した foundation U1〜U9 の source-index 9 entry は、本 branch で正規生成済みだった確定内容を意味マージして復旧した。 |
| `specs/` | dev-graph authority addendum に lineage trigger、fail-closed 対称性、素材の verbatim import と実行ロジック複製の区別を追記。新契約で検出された旧 specification 5 件も標準セクションへ移行。500 行超の着地観測仕様は 122 行の正規 contract と既存の詳細調査資料へ責務分離。 |
| `architecture/` | dev-workflow / testing-qa に contract・validator・fixture の責務境界、provenance 復旧、C19 の data / logic 境界を反映。 |
| `features/` | feat-dev-pipeline-improvement に o4zi の fresh C19 PASS と到達状態を追記。 |
| `tasks/` | P13 handoff へ C19 / foundation の解決と、PR merge 後 reconciliation のみが残ることを記録。旧補助 task 2 件も実行可能な 13 セクションへ移行。 |
| `docs/` | feature / workflow changelog と本受領書へ実装・検証・残課題を記録。 |

## 検証

- focused pytest: main マージ前 51 tests、マージ後 5 files / 82 tests が PASS（3 contract copy の byte parity test を含む）。
- full Dev Graph pytest: main マージ前 975 PASS / 5 subtests PASS / 0 FAIL / 0 xfail。マージ後は MVP 指示に従い対象契約へ絞った 82 tests で再確認した。
- 3 contract copy の byte equality: PASS。
- system-spec foundation / source-citation gate: PASS。最新 `main` 取込後の system-spec-harness tests は 508 PASS。U1〜U9 の原文は過去の確定済み QA を正とし、推測・捏造 0 件。
- fresh live trial: C01 / C02 / C03 / C04 / C05 / C14 / C18 / C19 の 8 件が独立評価込みですべて PASS。C14 正本 run は `20260808T190000Z-o4zi-c14r11`、actual model `claude-opus-5`、nudge=0、gate=0、behavior closure `b0c1f6192f5f0322a5b61f442ca7d2acdc2c2a3163b7554ea3fce79df797d4e8`。C19 は最新 main の正本 run `20260809T132550Z-wt27-c19-ci-r1`（90.067 秒、289,434 accounted tokens、network / upstream Skill call 0）を採用する。
- main 同期: `origin/main` の `2049626d` を local `main` の `b340e52e` へ統合し、その local `main` を本 branch へ `5286c6f1` でマージした。`spec-state.json` は最新 main の `qa-216` / `qa-217` を正本として保持した。
- C19 は最新 main の bounded import で C02 経由の architecture / specification 2 node、source / evidence digest、writer 経路、複製ロジック 0 を確認する。旧 branch run は正本が更新されたため重複証拠として残さない。
- full graph schema: 旧 specification 5 件・task 2 件に残っていた 160 件（frontmatter 44、parity 5、heading 111）を正規 writer と明示 migration で解消し、`valid=true` / violation 0 / readiness complete へ収束。

## レビューで是正した点

初期差分は `plugins/dev-graph/templates/template-contract.json` だけを更新し、`.dev-graph/templates/` と `plugin-plans/` が古いままだった。実行場所によって判定が変わるため、3 コピーを同期対象へ追加した。

C19 初回証跡は compile の literal Skill call が欠落したため採用せず、fresh run を独立再評価した。その後 main で bounded import 契約と新しい正本 run が確定したため、競合解消では新しい証拠を採用した。また、node body と source body の一致は「ロジック複製」ではなく、lineage 付き素材を保存する正規 verbatim import であることを skill / fixture / test / 仕様へ明記した。

最終 gate で旧 artifact 160 件が検出されたため、失敗を baseline として残さず標準見出しへ移行した。詳細な調査履歴が 500 行を超える着地観測仕様は、短い正規 contract を新設し、既存 addendum を履歴資料として保持する形に分離した。

最新 main 取込直後は foundation source-index 9 件の参照先だけが競合解消で欠落し、coverage gate が fail-closed になった。旧番号を新規 QA として作り直さず、main の `qa-216` / `qa-217` を維持したまま、本 branch で公式 transition writer により生成済みだった `qa-foundation-u1`〜`u9` を意味マージし、coverage / source citation の両 gate を再び PASS へ戻した。

## 最終レビュー (2026-08-09)

- `git status` / `origin/main...HEAD` を確認し、本変更の残差分は heading contract の文書・issue・旧 artifact 移行・graph 更新に限定した。
- focused pytest（heading readiness / fixture builders）57 PASS、3 contract copy の byte parity PASS、`validate-graph-schema.py` は `valid=true` / violation 0。
- 製品 API / DB / 認証 / UI / deploy unit への影響は無し。repository 内部の Dev Graph 契約影響は既に `system-spec/`・`specs/`・`architecture/`・`features/`・`tasks/`・`docs/` へ反映済みで、本受領書がその証跡。
- C19 正本は main の `20260809T132550Z-wt27-c19-ci-r1` に束縛。branch 固有の重複 run `20260808T154500Z-o4zi-c19r3` は削除した。
- リモート `origin/main` (`2049626d`) は local `main` 経由で本 branch に取り込み済み。Draft PR を再 push して CI を再判定する。

## 残課題

- Draft PR #680 の CI と review / merge。merge 後の default-branch reconciliation まで `HarnessHub-o4zi` は in_progress を維持する。
- Gate beads `HarnessHub-8ctp` (gh:pr 680) は PR merge 後に close する。

## 500 行制約

変更した手書きの実装・文書はいずれも 500 行以下で、repository のより厳しい 300 行 gate も 649 文書・違反 0 で PASS した。旧 570 行の着地観測 addendum は直接変更せず、122 行の `harness-hub-post-signin-landing-observability-contract.md` を正規 graph contract として分離した。500 行を超えるのは `.dev-graph/state/graph.json` と `system-spec/spec-state.json` だけであり、いずれも遷移履歴と参照位置を一体で検証する生成状態の正本（SSOT＝唯一の正しい保存先）のため分割しない。
