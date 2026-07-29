---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-9ndl
  - HarnessHub-dyxr
  - HarnessHub-bk8v
dev_graph_node_id: issue-decompose-live-trial-audit-defects-20260726
feature_node_id: feat-dev-pipeline-improvement
spec_impact: reflected
reviewed_at: 2026-07-29
---

# C14 live-trial acceptance 強化 — 仕様反映受領書

## 依頼と目的

`HarnessHub-9ndl` と `HarnessHub-dyxr` の変更全体を最終レビューし、task 仕様書の品質ゲートを再実行した。目的は、C14 decompose live-trial の PASS が「監査へ渡した入力の言い換え」や「clone 後に消える一時ファイル」を根拠にせず、再現可能な実測証拠を表す状態にすることである。

## 仕様影響の結論

**反映あり。ただし製品契約は非変更。**

影響は Harness Hub repository 内の開発品質ゲートと AI skill の受入証拠契約に限定される。製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

## 正規フローでの反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/spec-state.json` | ユーザーの明示指示を `appr-011`、実走証拠契約を `qa-089` として登録 |
| `system-spec/testing-qa.md` | scenario 束縛、durable evidence、pre/post 実測、監査 provenance を横断品質契約として確定 |
| `specs/harness-hub-system-specification.md` | system-spec 正本への参照型反映と製品境界を記録 |
| `architecture/harness-hub-testing-qa.md` | run 内証拠 containment、scenario 失効、帰属分離、composite provenance の設計を反映 |
| `features/feat-dev-pipeline-improvement.md` | Beads 2 件の実装結果と境界を feature 履歴へ反映 |
| `tasks/feat-dev-pipeline-improvement/*-p12.md` / `*-p13.md` | 横断品質ゲートと P13 書き戻しの実施記録を追補 |

## 実装への対応

- live-trial verdict は現行 scenario の required observations と実引数 flag を照合する。
- evidence ref は verdict の run directory 内にある実在ファイルだけを受理する。
- scenario ID の変更だけでなく、fixture から scenario が削除された場合も旧 PASS を失効させる。
- scenario が task.md の必須・禁止手順を宣言した場合は実 task.md を照合し、実装不能な指示を別 operation へ読み替えた run を拒否する。旧試行で feature promotion に task 完了専用 operation を誤指定した task を不採用とし、通常 C02 upsert を必須化した。
- decompose 監査は publication を実 graph、write count を pre/post state、binding を永続 graph から導出する。
- draft gate と candidate external-adapter dry-run のゼロ帰属を分離する。
- `main` 統合時の差分レビューで、旧 r6 run の `evaluated_digest` が 64 桁形式を満たす一方、最終 persisted node の正準 digest と一致しないことを検出した。旧 r8/r9 は最終受入証拠として採用しない。
- scenario r7 は、昇格 node の `confirmation_evidence` だけを除いた正準 JSON から SHA-256 を再計算して宣言値と突合し、placeholder と昇格後の stale PASS を拒否する。
- 同じ最終 graph から「evaluation pass だが readiness incomplete」「blocked draft に publication intent」の 2 検体を作り、正準 validator の該当節が両方を拒否することを要求する。
- 500 行超の手書き Python / test は責務別に分離し、scenario 契約を含む全監査 module を composite provenance に含める。

## 品質ゲート

- 広域 pytest: `9284 passed, 7 skipped`（`tests/` + Dev Graph + harness-creator）。
- repository CI parity: `123 PASS / 4 WARN / 0 FAIL`。4 WARN は段階導入中の既存 completeness / rubric-ref 検査で、本変更起因の failure は 0。
- task package: `feature-package/feat-dev-pipeline-improvement` の現行 generation digest `af8a73…da6` を検証し、P01〜P13 exact-set・contract `1.1.0`・violations 0。
- Dev Graph schema: repository graph は `implementation_readiness=complete`、missing/violations 0。
- content review: 独立 reviewer score 94、high/medium finding 0。統合した C14 監査の focused test は 42 PASS。
- live-trial: r10 beads と r11 none の fresh apply 2 系列が scenario r7 の observations 7/7、args/task contract 一致、独立 verifier PASS。両 run で最終 node digest の再計算一致と negative control 2/2 拒否を確認した。
- lint: content-review 75 skills、Dev Graph verdict 9 件、script naming `VIOLATION=0`、Python compile、`git diff --check` を通過。repository 全体 verdict lint の既存 6 missing は record-only WARN で、本変更対象 Dev Graph の missing は 0。

## Beads / dev-graph

- `HarnessHub-9ndl` / `issue-decompose-live-trial-audit-defects-20260726`
- `HarnessHub-dyxr` / `issue-c14-live-trial-scenario-coverage-gap-20260726`
- `HarnessHub-bk8v` / `issue-c02-upsert-lifecycle-regression-20260729`（最終レビューで発見した範囲外 follow-up）
- 主 branch node: `issue-decompose-live-trial-audit-defects-20260726`

## 残課題

- `HarnessHub-4t9g`: 生成本文にプレースホルダが残ったまま readiness complete になる既存課題。
- `HarnessHub-fonh`: system-dev-plan Skill 呼出しの scenario coverage が不足する既存課題。
- `HarnessHub-bk8v`: 同じ draft feature 入力の再 upsert が、先に進めた lifecycle を退行させる今回発見の範囲外課題。前進状態を保持するか stale before-image を拒否する C02 契約と回帰テストが必要。

これらは今回の C14 監査・scenario acceptance とは責務を分離し、既存の無関係差分を本 commit に混ぜない。
