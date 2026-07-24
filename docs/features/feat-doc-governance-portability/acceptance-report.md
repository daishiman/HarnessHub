---
status: draft
layer: acceptance-report
task: SYS-DOC-GOVERNANCE-PORTABILITY-P07
parent_feature: feat-doc-governance-portability
goal_spec_digest: "sha256:d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee"
---

# 受入判定 — goal-spec acceptance 4 件の突合

判定はすべて実測 evidence に基づく (P06 test-run / P08 migration-receipt / P09 QA)。

## acceptance 1 — **PASS**

> 300 行超過の新規違反が CI で fail-closed に遮断され、allowlist は既存 6 文書のみ・縮小のみ許す ratchet として検査される

- 新規違反の遮断: `test_main_exit1_new_violation` ほか MUST_DETECT が exit 1 を固定
  (evidence: `eval-log/dev-graph/doc-governance-portability/test-run-p06.json` pytest 76 件)。
- CI 配線: `.github/workflows/governance-check.yml` change-category-guard job に
  `--ratchet-base origin/main` 付き・`continue-on-error: false` で配線。
- allowlist が「既存 6 文書のみ・縮小のみ」であること自体の機械検査: `--ratchet-base` が
  新規エントリ追加・baseline 拡大・line_limit 拡大を exit 1 で遮断
  (evidence: `qa-fail-closed-report.json` 1a/1b/1c)。
- 現行 allowlist は対象 6 文書のうち 5 件 (1 件は 276 行へ縮小し卒業 = 縮小方向のみの変化)
  (evidence: `migration-receipt.json`)。
- 注: 「CI で」の実環境 (GitHub Actions 上) 実証は P13 の release-receipt が所有する。
  本判定はローカル実測 + CI 配線の静的確認に基づく。

## acceptance 2 — **PASS**

> 仕組み側ファイルへの repo 固有ナレッジ hard-coded 参照を検出する検査が存在し、検出時に exit 非 0 で停止する

- `scripts/lint-mechanism-knowledge-boundary.py` が K1 qa 番号 / K2 ナレッジ path /
  K3 feat-/issue- node id のコード値リテラルを exit 1 で遮断
  (evidence: test-run-p06.json の T2=28 件 / qa-fail-closed-report.json 2a・3a-3e)。
- 分割記述 (連結・f-string・%・format) も定数畳み込みで遮断 (P09 差し戻し後)。
- 根拠引用 (コメント/docstring/help=) の false-positive 非発生を対向ケースで確認
  (qa-fail-closed-report.json benign_counter_cases)。実リポジトリは violation 0 で exit 0。

## acceptance 3 — **PASS**

> extract-blueprint / install-bundle がナレッジを既定で含めず、明示 opt-in なしの同梱を検査が遮断する

- 現状 baseline (bundles.json = plugin 名のみ / plugin.json = distributable が仕組み単位 /
  install-bundle.sh = ナレッジ content-root 不参照) を
  `scripts/lint-portability-knowledge-optin.py` が固定検査し、実リポジトリ exit 0
  (evidence: test-run-p06.json)。
- opt-in なしの同梱宣言・bundle plugins へのナレッジ path 混入・インラインコメント偽装を
  exit 1 で遮断する。install script のコメントや `echo` に gate token を置く偽装も
  条件式ではないため遮断する
  (evidence: qa-fail-closed-report.json 2b〜2d・4a・4b、T3=19 件)。

## acceptance 4 — **PASS**

> 3 検査が CI ゲートへ組み込まれ、同一入力での再実行が差分 0 に収束する (冪等)

- CI 配線: governance-check.yml に 3 step とも `continue-on-error: false` で存在。
- 冪等: 3 検査とも同一 worktree で 2 回実行し JSON 出力 diff 0
  (evidence: test-run-p06.json の rerun_diff=0 × 3)。
- P08 migration の再実行差分 0 (evidence: migration-receipt.json verification.idempotency)。

## P08 完了待ちだった項目の扱い

- acceptance 1 の「allowlist は既存 6 文書のみ」は P08 の baseline 遡及付与完了が前提。
  本判定時点で P08 は完了済み (migration-receipt.json) であり、暫定ではなく最終判定とした。
  1 文書 (docs/features/feat-dev-pipeline-improvement/design.md) は分割 remediation
  (HarnessHub-3d8 側) により 276 行へ縮小済みで allowlist を卒業している。これは
  「縮小のみ許す」ratchet の正方向の変化であり、受入の意図 (拡大・新規追加の禁止) に反しない。

## 未達・差し戻し

なし。4 件すべて PASS。P13 (release) が所有する残項目は「main 反映後の CI 実環境での
fail-closed 動作の実証」のみ (差し戻しではなく後続 phase の責務)。
