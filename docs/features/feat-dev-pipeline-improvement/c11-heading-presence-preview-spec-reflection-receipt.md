---
title: "C11 必須見出し存在・stdin preview の仕様反映受領書"
status: "recorded"
layer: "feature-spec-reflection"
reviewed_at: "2026-08-04"
beads_ids: ["HarnessHub-85z0", "HarnessHub-3tw"]
dev_graph_node_id: "issue-required-heading-presence-validation-20260729"
system_spec_qa: "qa-143"
approval_id: "appr-032"
spec_impact: "reflected"
---

# C11 必須見出し存在・stdin preview — 仕様反映受領書

## 目的と背景

既存の C11 は「見出しはあるが本文が空」の場合を検出できた一方、必須見出しそのものが
本文に無い specification を通していた。あわせて C14 decompose の dry-run は、まだファイルを
書いていない正当な preview まで `artifact_missing` として拒否していた。

## 結論

**repository 内の Dev Graph 開発品質契約には影響あり、Harness Hub 製品 runtime には影響なし**。
specification の不足見出しは `heading_missing` として readiness を incomplete にし、stdin preview は
未書込み artifact だけを許容する。外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は
変更していない。

## 中学生向けの説明

仕様書を作るとき、前は「中身が空の見出し」だけを見つけられました。今回から、そもそも
必要な見出しを作り忘れた場合も見つけます。また、下書きをまだ保存していない確認では、
「ファイルがないから失敗」とせず、下書きの形そのものは厳しく確認します。

## 正規フローでの反映

| 層 | 反映内容 |
|---|---|
| C01 / `system-spec/spec-state.json` | R4 reopen → `qa-143` / `appr-032` で `dev-workflow.web` を再確定 |
| C02 / `system-spec/retrieval-evidence/` | 20 件の公式 URL を再取得し、最小証跡と SHA-256 を記録。正規 assembler で `fetched-references.json` を再生成 |
| C03 / `system-spec/` | compile により `dev-workflow.md`、index、security/testing-qa の参照表示を再生成 |
| `specs/` | 既存 specification 2 件を canonical template の全必須見出しへ移行 |
| `architecture/` / `features/` | C11 の対象限定、C14 の許容範囲、製品 runtime 非変更を追記 |
| `tasks/` | P11 に回帰証拠を追記。300 行上限に達している P12/P13 は変更せず、移行・運用・PR handoff の受領は本書に集約 |
| `docs/` | 本書で判断、根拠、残課題を受領 |

## 技術契約

- `artifact_kind=specification` だけが template-contract の required headings と本文を照合する。
  欠落した節は `heading_missing`、存在しても空・placeholder・TBD/TODO/未定だけなら
  `placeholder_only_section` とする。
- task / issue の required headings は conditional template を解決していないため、単純照合は
  誤検出になる。対象拡張は `HarnessHub-yzv0` へ切り分けた。
- `--graph - --repo-root <repo>` は dry-run preview 専用で、`artifact_missing` だけを skip する。
  schema、frontmatter、path containment、既存 artifact の内容・parity は fail-closed のまま残す。
- `system-spec/retrieval-evidence/*.json` は C02 の最小取得証跡だけを置く配置例外とし、
  `validate-source-citation.py` が `fetched-references.json` の `evidence_ref` と SHA-256 を
  fail-closed で照合する。ほかの system-spec サブディレクトリや非 JSON 混入は配置 lint が拒否する。

## 検証

- C11/C14 focused regression: **20 passed**。
- exact-13 task specification gate: **pass**（P01〜P13、violations 0）。
- canonical graph schema: **valid**（violations 0）。
- C01 coverage / C02 citation: **pass**（20 records、証跡 SHA-256 一致）。
- C03 compile / acceptance test: **12 files generated、36 passed**。
- `git diff --check`: pass。
- main 統合直後の共有 `test_skill_criteria_evidence.py` は **14 passed、8 failed** で、C01/C02/C03/C04/C05/C14/C18/C19
  の旧 verdict が現在の `skill_dir_tree_sha` と不一致だった。これは C11/C14 focused regression の失敗ではない。
  fresh live-trial の再取得と受領書選択の恒久修正は
  [live-trial 証跡選択の受領書](live-trial-evidence-selection-spec-reflection-receipt.md) に分離して完了した。

## 500 行上限

今回の手書き実装・テスト・文書はすべて 500 行未満である。574 行だった統合テストは、
`test_validate_graph_schema_c11_heading_presence.py` と
`test_validate_graph_schema_artifact_preview.py` に責務で分離した。`system-spec/spec-state.json` は
C01 single writer が単一 JSON を要求する機械生成の正本（3501 行）であり、分割すると atomic
transition と schema を壊すため例外とする。C02 の各取得証跡は 7 行に分離している。

## 追跡と残課題

- Beads: `HarnessHub-85z0`、`HarnessHub-3tw`
- primary Dev Graph node: `issue-required-heading-presence-validation-20260729`
- 2026-08-04 に `origin/main` の `c560c0e8` を local `main` 経由で本 branch へ merge commit
  `3916de67` として統合した。自動マージで競合はなく、PR #664 は `MERGEABLE` を確認済み。
- 後続: `HarnessHub-yzv0` が task / issue conditional template resolver と heading check 拡張を扱う。
- 共有証跡: C01/C02/C03/C04/C05/C14/C18/C19 の fresh live-trial を再取得し、
  criteria receipt を current PASS verdict へ更新済み。選択規約と C19 の独立評価を含む詳細は
  [live-trial 証跡選択の受領書](live-trial-evidence-selection-spec-reflection-receipt.md) を正とする。
- Draft PR #664 の CI / review 完了後に main merge 後の reconciliation を行う。
