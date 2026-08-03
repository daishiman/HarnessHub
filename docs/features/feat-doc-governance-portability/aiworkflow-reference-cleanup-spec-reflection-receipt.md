---
layer: feature-spec-reflection
feature_id: feat-doc-governance-portability
graph_node_id: task-remove-aiworkflow-reference-skill-20260802
beads_id: HarnessHub-ym9h
status: recorded
spec_impact: reflected
updated: 2026-08-02
---

# 外部参考 Skill 削除・CLI 契約移設 仕様反映受領書

## 目的と背景

`doc/参考Skill/skill-creator/` は `xl-skills` 由来の参考コピーであり、
HarnessHub の正本ではない。一方、外部 CLI エージェント契約 1 ファイルだけは
`delegate-codex-skill-review` が利用していた。参考層への能動依存を解消しながら
利用中の契約を失わないため、参考コピーを削除し、契約を利用者側へ移設した。

## 結論

仕様影響は **あり** と判定し、`system-spec/dev-workflow.md` の `qa-122` へ正規反映した。
影響は repository 内の開発文書と plugin reference の所有境界に限られる。
製品 UI、外部 API、DB schema、認証認可、Cloudflare deploy unit の仕様・挙動は変わらない。

## 中学生向けの説明

倉庫に置いていた「昔の説明書一式」を片づけた。ただし今も使っている 1 冊だけは捨てず、
実際に使う道具の隣へ移した。どこを見れば正しい説明があるかが一つに決まり、古い説明を
間違って使う危険が減る。Web 画面や利用者向け機能そのものは変えていない。

## 技術的な説明

- `aiworkflow-requirements` を前提にする参考 Skill 275 tracked files を削除する。
- `external-cli-agents-guide.md` は Git rename として consumer plugin 配下へ移設する。
- `codex-connection.md` と `resource-map.yaml` から新 path へ到達可能にする。
- 能動契約化する Codex 節は `codex-cli 0.146.0` の `--help` と現行 Codex Manual を照合し、
  `codex exec`、sandbox、保存済み認証 / `CODEX_API_KEY` の契約へ更新する。
- cleanup / transfer 計画と legacy-name lint の allowlist 説明を同じ所有境界へ揃える。
- `eval-log/` の凍結履歴は実行依存ではないため保持し、復元元を `xl-skills` と git 履歴に固定する。

## 正規の仕様反映経路

1. ユーザーの 2026-08-02 の最終レビュー・仕様反映・公開指示を `appr-022` として記録した。
2. `dev-workflow.web` を R4 reopen し、既存 `qa-096` の契約を省略しない `qa-122` へ再確定した。
3. system-spec compiler で章を再生成し、既存の手書き実装注記は保持した。
4. `specs/`、`architecture/`、`features/`、`tasks/`、本 `docs/` 受領書へ同じ影響境界を投影した。

`qa-121` は最初の再確定履歴として `qa_log` に残るが、既存契約の要約で情報が不足したため
現行 matrix は自己完結した `qa-122` を参照する。これは履歴を消さずに後続遷移で是正した記録である。

## main 同期

- `origin/main` と local `main` は `706c236c` へ fast-forward した。
- local `main` を本 branch へ merge した commit は `b9be145a`。
- merge conflict はなく、main 由来の変更を本作業の独自差分として commit しない。

## 品質ゲート

- task specification: PASS。`validate-system-plan.py` は 13 phase、違反 0、digest
  `d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee` を確認した。
- dev-graph: PASS。schema valid、implementation readiness complete、違反 0。
- system-spec: coverage / foundation / source citation が PASS、回帰テスト 529 件 PASS。
- 参照整合: 削除前 275 tracked files、削除後 index / worktree 0。旧 path への能動参照 0、
  `aiworkflow-requirements` 実行依存 0、新 guide は隣接 reference と resource map の 2 経路から到達可能。
- plugin / 文書: dependency direction、external refs、legacy name、artifact placement、
  mechanism-knowledge boundary、document line limit、`git diff --check` が PASS。
- repository CI: `bash scripts/run-ci-checks.sh` は `PASS 136 / WARN 4 / FAIL 0`。
  4 warning は段階導入中の別 plugin にある既存基準で、本変更に関する blocking failure は 0。

## 行数と分割判断

本変更で新規・手編集した各ファイルは 500 行以下。repository 文書 lint は stage 済みの新規
task / receipt を含む 484 文書を検査し、300 行規約の違反 0。機械生成の
`system-spec/spec-state.json` は正規 writer が管理する JSON 正本で、手作業による分割対象ではない。

## 復元と残課題

削除内容は git revert で directory と参照を同時に復元でき、外部原本は `xl-skills` に残る。
draft PR 作成時点では task / Beads を `in_progress` に維持し、merge 後に default branch から
完了へ reconcile（整合させること）する。製品機能に関する残課題はない。
