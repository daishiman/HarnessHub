---
title: "Live-trial 証跡選択と C02 receipt 検出 — 仕様反映受領書"
status: "recorded"
layer: "feature-spec-reflection"
reviewed_at: "2026-08-10"
beads_ids: ["HarnessHub-85z0", "HarnessHub-3tw"]
dev_graph_node_id: "issue-required-heading-presence-validation-20260729"
system_spec_qa: null
approval_ids: []
spec_impact: "none"
---

# Live-trial 証跡選択と C02 receipt 検出 — 仕様反映受領書

## 目的と背景

`origin/main` 統合後、fresh live-trial を実行済みにもかかわらず、CI は将来時刻の run-id を
辞書順で「最新」とみなし、古い behavior closure SHA を検査して失敗した。C04 の fresh run を
検査すると、registration receipt を説明文で参照しただけの progress 書込みまで C02 迂回として
誤検出した。

## 結論

**今回の再統合では製品仕様・設計への新規影響なし**。承認済み
criteria receipt がある skill は receipt が指す唯一の verdict を検査する。receipt が不正なら
fallback せず失敗する。C02 scanner は receipt そのものへの変更だけを拒否する。

## 2026-08-10 再統合判断

旧 branch 内で用いた `qa-145` / `qa-146` は current `main` では別の製品機能へ再採番済みであり、
本変更の正本として再利用しない。今回の差分は dev-graph の内部 lint を不正 receipt で
fail-closed に戻すものだけで、製品 API、DB schema、認証認可、UI、Cloudflare deploy unit、
`system-spec/`、`architecture/` の新規変更はない。このため C01/C03 は実行せず、HEAD 束縛の
機械受領書へ `spec-impact=none` と判断理由を記録する。

## 中学生向けの説明

古い日付が間違って未来になっているフォルダを、最新版だと勘違いしていました。これからは
「合格として採用した」と書かれた受領書を見ます。また、文章の中で領収書の名前を書いただけで
不正と決めつけず、本当に領収書を書き換えたときだけ止めます。

## 正規フローでの反映

| 層 | 反映内容 |
|---|---|
| `system-spec/` / `architecture/` | current `main` の正本を維持 | branch-local QA ID を再利用しない |
| `specs/` | requirements 索引を current `main` に整合 | 現行 hook parity は `qa-143` を参照 |
| `features/` / `tasks/` | handoff と変更履歴の参照を再採番 | linter 強化の製品仕様への波及はない |
| `docs/` | 本受領書へ再統合判断を追記 | 判断根拠と検証を追跡する |

外部技術の新事実を導入していないため、C02 source fetch は不要である。既存の
`fetched-references.json` を用いた C03 compile は実行した。

## 技術契約

- `criteria-test/scenario-verdict.json` に `verify_by=live-trial` があれば、全 criterion は
  一つの `live_trial_verdict_ref` へ一致しなければならない。
- ref は相対パス・`verdict.json`・同一 `eval-log/<plugin>/<skill>/live-trial/` 配下・実在を
  必須とする。不正、欠落、外部参照、複数 ref は fail-closed である。
- criteria receipt が存在しない legacy skill のみ、後方互換として run-id 辞書順の最新 verdict を
  採用する。
- C02 bypass は receipt literal と mutation の同一操作、または receipt path alias が実際の
  mutation target である場合だけ検出する。`progress.json` 等の説明値に出る名前は対象外である。
- 過去 run は append-only に保持し、criteria receipt だけを fresh PASS run へ更新する。digest
  単独更新は既存 provenance gate が拒否する。

## 再取得した実走証跡

| component | fresh run | behavior closure SHA |
|---|---|---|
| C01 init | `20260804T052500Z-ci-c01-r3` | `4352f924…172e5a` |
| C02 node | `20260804T052500Z-ci-c02-r2` | `d4060e74…04a711` |
| C03 sync | `20260804T054000Z-ci-c03-r2` | `35cda14b…f4171` |
| C04 requirements | `20260804T060000Z-ci-c04-r2` | `9ca546bf…ffe1a7` |
| C05 render | `20260804T062000Z-ci-c05-r2` | `7cd173c5…e330a` |
| C14 decompose | `20260804T064000Z-ci-c14-r2` | `c03fb6fe…b1be93` |
| C18 status | `20260804T071000Z-ci-c18-r2` | `92db4c41…cc6326` |
| C19 system-spec | `20260804T073000Z-ci-c19-r2` | `f067749c…cd13f` |

各 run は `overall=PASS`、nudge=0、gate=0 で、独立 evaluator の
`independent-verification.json` を含む。C19 は初回 evaluator の FAIL を保存したまま、正規の
C01/C02 補強・再 compile・再 fork 後に PASS となった。

## 検証

- `validate-coverage-matrix.py --require-complete --require-foundation`: PASS。
- `compile-spec-doc.py compile`: 12 files generated。
- `tests/test_lint_live_trial_verdict.py` と `tests/test_receiptguard_helper.py`: 34 passed。
- `lint-live-trial-verdict.py --all`: 9 verdicts verified、record-only WARN 6、FAIL 0。
- `test_skill_criteria_evidence.py`: fresh evidence を対象に再実行する。

## 500 行上限と残課題

変更した Python は 469 行以下、helper は 200 行以下、各新規文書は 500 行以下である。
既存の `specs/harness-hub-system-specification.md` と P12/P13 本体は上限近傍のため、詳細は
本受領書と P13 handoff に分離した。500 行を超える生成済み `transcript.jsonl` / `pane.txt` は
verdict の SHA-256 が束縛する immutable live evidence のため分割せず、改変不能な証跡例外として
保持する。`HarnessHub-yzv0` の task/issue conditional template resolver は本変更の対象外として継続する。
