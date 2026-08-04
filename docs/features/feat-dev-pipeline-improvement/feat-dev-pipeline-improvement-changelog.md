---
status: active
layer: implementation-notes
---

# 開発管理パイプライン改善 — 差分追記ログ

> [features/feat-dev-pipeline-improvement.md](../../../features/feat-dev-pipeline-improvement.md) から分離した変更履歴分冊。300 行上限 (`lint-doc-line-limit.py`) を超えたための分割remediation (先例: `HarnessHub-3d8` の `docs/security-spec.md` 分冊)。時系列は本体側で追記せず、新規エントリはここへ追記する。

## 2026-08-04: C19 r10 自走受入と C14 参照順序の是正

- `main` 統合後の C19 r4 live-trial は、C14 の knowledge catalog が定める前提順と C03 の設計参照順が一致しない不備を FAIL として検出した。`build-knowledge-order.py` へ依存関係の topological order（前提を先にする順序）を分離し、backend の参照を `ddd → clean-architecture → api-design-patterns` に是正した。
- compile / source-citation の focused pytest は 131 passed。r5 は最終 status 出力前に中断し、r6 は実行内容が PASS でも nudge=1 のため `DEGRADED` とした。r7 は audit-ledger 保護強化前の旧挙動、r8 は stale progress / intermediate を独立 verifier が検出した FAIL として監査履歴に残した。新しい隔離 fixture の fresh r10 は `overall=PASS`、nudge=0、gate=0、正規4 entry point、C02 登録、source digest・evidence reference、独立検証の 3 観測をすべて満たし、唯一の成功証跡として登録した。
- task-contract / verdict lint は criteria receipt の OUT1 PASS evidence を優先し、時計ずれで将来日付になった歴史的 run や r7 が r10 を上書きしないようにした。回帰 pytest と両 lint の PASS で選択規則を固定した。
- 製品 API・DB・認証認可・UI・deploy unit は非変更。層別判断、試験失敗の根因、再開条件は [r2 follow-up 受領書](c19-task-contract-r2-followup-spec-reflection-receipt.md) を正とする。

## 2026-08-03: C19 task contract r2 の fresh live-trial 受領

- `HarnessHub-eiky` の C19 scenario r2 への更新で旧受領書が `scenario-contract-superseded` となったため、`HarnessHub-m0bd` / Dev Graph `issue-c19-live-trial-rerun-task-contract-r2-20260803` で fresh live-trial を実行した。
- `main` 統合後の `20260806T020000Z-m0bd-c19-r3-postmain` は overall=PASS。r2 task contract の `upsert-node.py`、fixture 内の `SYSTEM_SPEC_AUDIT_FORK_LEDGER`、公式ページを実取得して現行 version を記録する条件を満たした。製品仕様への影響がない層別判断と証跡は [r2 follow-up 受領書](c19-task-contract-r2-followup-spec-reflection-receipt.md) を正とする。

## 2026-08-03 追記: 更新時刻クラスタを診断材料へ訂正

- `HarnessHub-7xi9` の 2026-07-31 事象は、reflog の直接証拠により `git reset --hard` と
  直後の `git pull` が最有力原因と判明した。mtime 一致だけで非 Git 系 clobber と断定しない。
- `scripts/lint-worktree-clobber-mtime.py` は変更・未追跡ファイルを横断してクラスタを報告する
  非ブロッキング診断とし、検知後は runbook の reflog・差分・実体照合で裏取りする。
- 正本は system-spec `qa-140` と
  [更新時刻診断追補](../../../specs/harness-hub-worktree-mtime-diagnostic-addendum.md) を正とする。
  製品 API・DB・認証認可・UI・deploy unit は非変更。

## 2026-08-02: prompt の行数ゲートをコードから分離

- `HarnessHub-hls0` で、一般コード・テストの一律 500 行分割を廃止し、`SKILL.md` 本文 300 行と
  skill `prompts/*.md|yaml` 500 行の機械ゲートへ分離した。
- 製品 API・DB・認証・UI・Cloudflare deploy unit は変更しない。仕様・設計の反映、既存 task package を
  書き換えない理由、検証結果は [仕様反映受領書](prompt-line-budget-spec-reflection-receipt.md) を正とする。

## 2026-07-26 最終レビュー追記

- C10 guard の破壊操作遮断を subprocess 非依存へ変更し、hook timeout による fail-open 窓を解消した。
- quote 外 redirect だけを解析して、Beads notes 等に記載した例示コマンドの誤遮断を解消した。
- `.dev-graph/config.json` と初期 graph store に preview/receipt 付き sanctioned writer を追加し、init が `Path.write_text()` を含む直接書込みへ退避しない契約にした。

## 2026-07-28 並列 worktree 安全契約の横断追補

`HarnessHub-7xi9`（`issue-worktree-main-ref-desync-20260728`）で、別 worktree が
checkout 中の branch ref だけを動かして作業ツリーを古いまま残す事故への二層防御を
追加した。これは本 feature の promoted exact-13 package を再生成する変更ではなく、
開発管理パイプラインを利用する全 feature に共通する repository 運用の追補である。

- 仕様正本: `system-spec/dev-workflow.md` `qa-088`
- 設計正本: `architecture/harness-hub-dev-workflow.md`
- 運用正本: `docs/worktree-parallel-operations-runbook.md`
- 検査: `reference-transaction` で ref 更新を予防し、`pre-commit` で巻き戻しを遮断、
  `pre-push` / CI で共有 hook bundle の欠落・陳腐化を検知する
- C02 node upsert は既存 Markdown 本文を既定保持し、明示 `--regenerate-body` だけが再生成できる。
- `local_only` task の PR 連動完了 policy を `manual` へ正規化し、完了不能な 167 node を移行した。
- 500 行を超えた手書き実装・テスト・命名例外台帳を責務別ファイルへ分離し、今回変更した手書き Python をすべて 500 行以下にした。
- 最終品質ゲートは Dev Graph pytest 539 passed / 2 skipped、current 19 task package の Phase P01〜P13 が 19/19 PASS、fresh live-trial が 9/9 PASS。
- C19 live-trial の task 指示と fixture 前提のずれは `HarnessHub-768b` として分離し、最終再試験は requirements brief から正規4 skillを実行して独立 completeness evaluator とも PASS。
- graph 管理された docs を C02 writer で再登録すると `layer` が落ちる既存契約差は `HarnessHub-dqca` として分離し、本変更では最終レビュー文書の `layer: feature-design` を復元した。
- 変更は開発基盤内部の契約であり、製品 API・state・security・UI の仕様を変えない。正本は `plugins/dev-graph/references/`、下流の設計判断は `architecture/harness-hub-dev-workflow.md` に反映し、`system-spec/` と `specs/` は qa-066 の二重正本防止に従い非変更とした。

## 2026-07-28 追記: entry point 宣言契約の是正

- 500 行分割で生まれた import 専用 support module (`hooks/guard_graph_commands.py`) を、plugin 完全性の契約テストが「未宣言の entry point」として落としていた (PR #82 の CI 失敗)。500 行分割規約と entry point 宣言規約が同時には満たせない構造で、実装の不備ではない。
- 是正として、`package-contract.json` の `entry_points.hooks` を「`hooks/` のファイル一覧」ではなく **`hooks/hooks.json` の登録内容**と突合するよう不変条件を変更した。宣言・登録・実体の 3 者一致を検査し、残る未宣言ファイルは「単体起動の入口を持たない」ことまで検査したときだけ support module として許容する。
- 契約テストは repo-root `tests/` にあり behavior closure の外側のため、既存 live-trial receipt 9 件は 1 件も失効していない。
- 986 行に達した契約テストを責務で 3 ファイルへ分割し、共有 fixture を `tests/scripts-root/_plugin_completeness_fixtures.py` へ集約した (各 367 / 386 / 197 行)。
- 検証: 最新 `main` (`515b849`) を本 branch へ merge した後、`pytest tests plugins/dev-graph/tests` は 8037 passed / 7 skipped / 0 failed、Dev Graph 単独は 539 passed / 2 skipped、C02 live trial r4 も PASS した。
- 残る被覆差 (repo 全体の `validate-plugin-completeness.py` は hooks について `declared ⊆ actual` しか強制せず、`hooks.json` 登録との parity は dev-graph 専用テストにしか無い) は `HarnessHub-vf66` として分離した。
- 3 例目として `validate-plugin-packages.py` の PKG-006 (hook 登録整合) / PKG-007 (script shebang・実行ビット) も落ちた。両 check は「`hooks/`・`scripts/` 配下は全て起動対象」を前提にしており、import 専用 module 5 件を P0 で遮断していた。entry point 契約テストと同じ構造判定 (`is_import_only_support_module`: `.py` / import 可能名 / shebang なし / `__main__` なし) で統一し、単体テスト 8 件で境界を固定。同時に検出された `build-repo-config.py` の実行ビット欠落は真の不備だったので `chmod +x` で是正した。986 行の契約テストは責務で 3 分割 (364 / 386 / 301 行 + 共有 fixture 73 行)。
- 同じ衝突が harness coverage にも現れた。`scripts/llm_eval` は分母をファイル数で数えるため、500 行分割で新規 7 件が verdict 未添付のまま母数へ加わり 64.1% → 63.1% へ希釈された。7 件を除くと 64.2% で floor 超え、分割元 `upsert-node.py` の verdict も PASS/91 のままであり、回帰の全量が分母希釈に由来する。先例 2 件と同型に floor を実測値へ手動 baseline reset し (`--update-floor` は回帰時据え置きのため使えない)、verdict を書いて率を戻す Goodhart 経路は取らなかった。構造的是正は `HarnessHub-2mor` として分離した。

## 2026-07-28 追記: C19 task / fixture 前提契約

- `HarnessHub-768b` を実装し、C19 fixture が置く入力、置かない成果物、必須 entry point、観測条件を `TASK_CONTRACT` と scenario JSON から一つの digest へ束ねた。
- 旧 task の「確定成果物は事前配置済み」「正規 flow を再実行しない」前提を実物回帰で拒否し、fixture 契約へ合わせた fresh PASS task は誤検出しない。
- 650 行だった lint は CLI／report と契約解析 module に分け、双方を 500 行未満へ収束した。
- focused pytest 29 PASS、latest verdict task に対する `--all` は checked 1 / violation 0。
- 技術契約は `plugins/dev-graph/references/live-trial-task-contract.md`、仕様影響なしの層別判断は `docs/features/feat-dev-pipeline-improvement/c19-task-contract-spec-reflection.md` を正本とする。

## 2026-07-29 追記: interpreter 書込み guard の被覆修正

`HarnessHub-lp36` で C10 の interpreter 判定を補正した。`Path.write_text/write_bytes`、
`shutil.copy*/move`、`os.replace/rename`、`json.dump` と書込み可能な `open()` mode を
graph authority 直書込みとして遮断し、読取専用の `r` / `rb` は許可する。判定は静的な
共起検査であり、任意の Python 実行を完全解析するものではない。既存正本
`plugins/dev-graph/references/claude-code-hooks-contract.md` の「graph authority 直書込み禁止」
に対する適合修正であり、列挙 API の保証境界は実装 docstring と focused test に固定した。

本変更は既存プラグイン内部契約への適合を直し、HarnessHub 製品の API・state・security・UI
contract は変えない。`system-spec/`・`specs/` は qa-066 の二重正本防止に従い非変更、
凍結済み exact-13 の `tasks/feat-dev-pipeline-improvement/` も手編集せず、実装結果は
本 feature 履歴、architecture、final review、standalone issue に記録する。

最終受入では focused pytest 48 passed / 2 skipped、Dev Graph 全体 697 passed / 2 skipped、
9 skill の fresh live-trial 9/9 PASS、exact-13 P01-P13 / violation 0、graph schema violation 0、
repository CI PASS 123 / WARN 4 / FAIL 0 を確認した。`HarnessHub-lp36` は証跡を追記して
close した。

## 2026-07-29 追記: C14 live-trial acceptance の証拠完全性

- `HarnessHub-9ndl` で C14 decompose 監査を、preview の自己申告ではなく実 graph、pre/post state 差分、永続 `tracker_binding`、実装 schema probe から判定するよう修正した。
- `HarnessHub-dyxr` で scenario 正本の required observations と実引数を verdict に束縛し、未回収、scenario 更新・削除、存在しない evidence ref を fail-closed にした。
- 最終実走で feature promotion に task 完了専用 operation を誤指定した task.md を検出したため、通常 C02 upsert を必須、完了専用 operation を禁止として task 手順そのものも verdict に束縛した。
- `main` 統合レビューで、旧 r6 の昇格証跡が 64 桁形式を満たすだけで最終 node 内容と一致しないことを検出した。scenario r7 は最終 persisted node の正準 digest 突合と、同じ graph から作る 2 種の gate 違反を正準 validator が拒否する negative control を必須化した。
- none 系列の再実走で、生成時の draft feature を同じ入力で再 upsert すると先に進めた lifecycle が退行する別責務の欠陥を検出し、`HarnessHub-bk8v` へ分離した。C14 の最終判定は通常 C02 経路で明示的に再昇格した後の graph を監査する。
- draft gate の起票 0 件と promoted candidate の external adapter dry-run による 0 件を別の帰属として記録する。
- 500 行を超えた手書き実装・テストは import 専用 support module と責務別テストへ分離し、監査 provenance は全 module の複合 digest を保持する。
- 仕様・設計への影響は開発品質ゲートの証拠経路に限定される。qa-089、`architecture/harness-hub-testing-qa.md`、[仕様反映受領書](live-trial-acceptance-hardening-spec-reflection.md) に反映した。
- 最新 `main` (`bb95580`) 統合後の最終ゲートは広域 pytest 9308 passed / 7 skipped、repository CI 123 PASS / 4 既存 WARN / 0 FAIL、task package P01〜P13・graph schema・fresh r7 live-trial 2 系列が PASS。後続 main の CI token 最小権限変更は本 feature の Python / C14 behavior closure を変えない。
- PR #598 のコンフリクト解消では、本 feature の lp36 interpreter guard、C14 acceptance 強化、PR #600 の live-trial session ownership 履歴をすべて保持した。C14 受領証拠は統合後も有効な behavior closure `c0d843d7…4801` の beads r3 / none r1 とし、旧 reaper に終了された beads r1/r2 は監査用の失敗証跡としてのみ保持した。無差別回収の原因は最新 main の ownership 契約で修正済みである。

## 2026-07-30 追記: scenario contract 受領の fail-closed 化

- `HarnessHub-yn71` は criteria-test が `scenario_contract` 欠落を許容した穴を閉じ、全 required observation の同数・同順、引数、task 契約、run 内 evidence を再照合する。C15 schedule は現行 scenario で fresh live-trial を実走し、4/4 観測の durable run へ更新した。
- 製品機能は変えず、開発品質ゲートの設計影響を qa-100 と [仕様反映受領書](live-trial-scenario-contract-required-spec-reflection.md) へ記録する。

## 2026-07-29 追記: C02 stale feature lifecycle の拒否

- `HarnessHub-bk8v` で、C14 の古い full feature snapshot が昇格済み lifecycle を
  `draft` / `pending` / `incomplete` へ暗黙に戻す経路を、C02 の書込み前に拒否した。
- `node` envelope と bare canonical node は再試行 snapshot、変更フィールドを列挙した
  `patch` は意図的な reset として区別する。feature 以外の artifact kind は従来挙動を保つ。
- 各退行フィールドを単独に検証する回帰テストと正の対照を追加し、main 統合後の C14
  fresh live-trial `20260729T054655Z-bk8v-final-r5-none` も独立評価込みで PASS した。
- plugin 契約の正本は `plugins/dev-graph/references/execution-tracker-contract.md`、
  製品仕様・設計へ影響しない判断は
  [仕様反映受領書](bk8v-c02-lifecycle-spec-reflection.md)
  に記録し、重複報告 `HarnessHub-j66m` は同じ `HarnessHub-bk8v` / `issue-c02-upsert-lifecycle-regression-20260729` の完了証拠へ統合した。

## 2026-07-29 追記: live-trial reaper の並行安全性

- `HarnessHub-cjwm` と重複 `HarnessHub-0vs2` を実装し、通常の `reap` を
  run-id と boot owner PID の完全一致へ限定した。
- session 作成時に tmux metadata へ所有情報を記録し、別 owner、別 run、
  metadata 無し session は通常 cleanup の対象外とする。
- 暗黙の全件削除を廃止し、全 live-trial session の回収は明示 `--all` だけに分離した。
- 1,600 行超だった test module は 6 責務と共通 support へ分割し、全ファイルを
  500 行未満へ収束した。
- 仕様影響はローカル開発運用に限定される。system-spec `qa-090`、
  `architecture/harness-hub-dev-workflow.md`、
  [仕様反映受領書](live-trial-reaper-spec-reflection.md)
  に反映した。製品 API・DB・認証認可・UI・deploy unit は非変更。

## 2026-07-29 追記: C11 artifact 本文 readiness

- `HarnessHub-4t9g` で、artifact file と frontmatter だけが揃った未記入 template を
  `implementation_readiness=complete` とする fail-open を是正した。
- C11 は artifact kind 別の canonical template と required section を照合し、
  空本文、canonical placeholder、`TBD` / `TODO` / `未定` だけの節を
  `placeholder_only_section` として `missing_sections` へ返す。
- fenced code block は説明本文として数えず、構造 container は実内容のある child
  section を含む場合だけ充足とする。
- C02 の template-only 作成と placeholder 再生成は rollback し、実本文を保持する
  metadata-only update と substantive body による作成・復旧を維持する。
- 仕様影響は repository 内の readiness、tracker 投影、system build handoff に限定する。
  system-spec `qa-092`、
   `architecture/harness-hub-dev-workflow.md`、
   [仕様反映受領書](c11-artifact-body-readiness-spec-reflection.md)
   に反映した。製品 API・DB・認証認可・UI・deploy unit は非変更。

## 2026-07-29 追記: skill tree lint の test cache 偽陽性修正

- `HarnessHub-xswf` で、per-plugin pytest が生成する `.pytest_cache/v/cache` を
  skill tree の第13条違反として数える実行順序依存を修正した。
- dot directory とその配下を一般規則で除外し、`__pycache__` / `.pyc` の既存除外と統合した。
- `.pytest_cache`、`.mypy_cache`、`.tool-cache` の正例と通常 nested directory の負例、
  root / plugin script の byte parity を回帰テストにした。
- `system-spec/spec-state.json` を単一 writer で R4-reopen し、
  `system-spec/testing-qa.md` qa-095、`architecture/harness-hub-testing-qa.md`、
  `specs/harness-hub-system-specification.md`、P12/P13 task spec へ反映した。
- 製品 API・DB・認証認可・UI・deploy unit は非変更。判断と検証は
  [仕様反映受領書](skill-tree-cache-spec-reflection-receipt.md)
  を正とする。

## 2026-07-30 追記: CI-local 品質ゲート parity

- `HarnessHub-ml57` で、GitHub Actions の repository-root Python 検査が
  local hard gate または理由付き allowlist に含まれることを検証する meta-lint を追加した。
- 比較 key は script path と意味のある引数であり、件数・比率や script 名だけの
  proxy metric（代理指標＝本当に守りたい性質を間接的に測る値）は採用しない。
- 読み取り専用検査を `scripts/run-ci-checks.sh` へ追加し、外部資格情報、
  working-tree write、CI non-blocking の例外は exact invocation と理由を台帳化した。
- `governance-check.yml`、`make lint`、pre-push の 3 入口へ同じ meta-lint を結線した。
- 製品 runtime への影響はなく、system-spec `qa-088` と
  `architecture/harness-hub-dev-workflow.md` の development tooling contract を具体化した。
  判断と検証は
  [仕様反映受領書](local-ci-parity-spec-reflection-receipt.md)
  を正とする。

## 2026-07-29 追記: workflow step guard の空走査 fail-closed

- `HarnessHub-foq6` で、workflow directory 不在または YAML 0 件を成功扱いしていた
  `lint-workflow-step-guard.py` を既定 fail-closed に変更した。
- 意図的な空走査だけを `--allow-empty` で許可し、通常の CI / `make lint` /
  pre-push 経路は実検査件数を伴う緑だけを受け入れる。
- 520 行になった包括テストから空走査契約を専用ファイルへ分離し、全対象を 500 行未満にした。
- 仕様影響は開発品質ゲートに限定され、system-spec `qa-096` と
  [仕様反映受領書](foq6-workflow-step-guard-spec-reflection.md)
  に反映した。製品 API・DB・認証認可・UI・deploy unit は非変更。

## 2026-07-30 追記: validator ID 一意性の横断 gate

- `HarnessHub-ory6` で、task graph、consult transcript、route build handoff の
  ID が `set` / `dict` 化の前に一意であることを fail-closed で検査するようにした。
- task node / component、turn、route の各重複を別内容の負例 fixture で再現し、
  公開 CLI の非 0 終了まで固定した。正常な既存入力は exit 0 を維持する。
- 500 行を超えていた validator / test は `validate-route-report-contract.py`、
  `validate-task-graph-shapes.py`、`test_validate_task_graph_shapes.py` へ
  責務分離し、変更対象の手書きファイルをすべて 500 行以下にした。
- 仕様・設計への影響は repository 内の validation contract に限定される。
  `system-spec/testing-qa.md`、`specs/harness-hub-system-specification.md`、
  `architecture/harness-hub-testing-qa.md`、P12 write-back と
  [仕様反映受領書](qa33ho-spec-reflection-receipt.md)
  に同一 wave で反映した。製品 API・DB・認証認可・UI・deploy unit は非変更。

- 2026-07-30 `HarnessHub-35ai`: receipt 検証済みだけを `verified`、未指定を `not_performed` とする契約・層別反映は [受領書](render-registration-verification-spec-reflection-receipt.md) を正とする。

## 2026-07-30 追記: PR #610 CI の live-trial 証拠更新

- `HarnessHub-dqca` では、C02 の共有挙動変更で stale になった Dev Graph 9 skill を fresh session で再取得した。C04 fixture の architecture lineage、C19 の tmux session-scoped 監査台帳注入も修正済みで、正本は `qa-102` / `appr-019`、最終判断は [仕様反映確認](c02-document-layer-spec-reflection.md) を正とする。

## 2026-08-01 追記: 遮断レイテンシ test の代理指標を構造検査へ置換

- `HarnessHub-5iuq` で、`test_guard_graph_schema_fail_open_window.py` が並列 worktree 稼働下のマシン負荷で偽陽性 (`assert 3.559s < 1.0s`) になっていた問題を是正した。
- 絶対所要時間という代理指標を、遮断コマンドが `context_ok()` (repository context 解決) へ到達しないことを直接検証する構造契約へ置換した。陽性対照を添え、実プロセス exit-2 smoke は維持した。
- `guard-graph-schema.py` 本体の遮断ロジックは非変更。仕様影響は開発品質ゲートのテスト検証方法に限定され、
  [仕様反映受領書](5iuq-guard-latency-proxy-metric-spec-reflection.md)
  に反映した。製品 API・DB・認証認可・UI・deploy unit は非変更。

## 2026-08-01 追記: `bd-bridge.py` と mfh7 実測ログの責務分割

- `HarnessHub-w7n7` で `bd-bridge.py` の CLI / receipt を残し、判定ロジックを
  `contracts` / `graph` / `projection` / `audit` の四 module へ分離した。
- 既存 private symbol と `bd` / `git` monkeypatch 境界を adapter で維持し、
  Beads mutation の単一チョークポイントは変更していない。
- mfh7 文書は課題定義 130 行と時系列実測ログ 422 行に分け、全手書き対象を
  500 行以下へ収束させた。
- 仕様・設計反映と検証結果は
  [仕様反映受領書](w7n7-bd-bridge-split-spec-reflection-receipt.md) を正とする。

## 2026-08-02 追記: Beads 自由フィールドの正規更新経路

- `HarnessHub-dc7` で `priority`、`assignee`、`labels` の更新を `bd-bridge.py` へ追加した。
- guard の全直接更新遮断は維持し、「自由」は graph parity 対象外という意味に明確化した。
- labels は冪等な `--set-labels` 置換、priority は create/update 共通正規化を使う。
- 契約・設計・検証結果は
  [仕様反映受領書](dc7-bd-free-field-write-route-spec-reflection-receipt.md) を正とする。
## 2026-08-02 追記: exact-13 再登録と task projection の冪等性

- `HarnessHub-cvli` で、registration manifest が省略する task frontmatter 六項目を
  C02 投影済み node から限定的に保持し、同じ generation の再登録を安全な no-op にした。
- manifest の明示値は優先し、`updated_at` の前進以外、時刻後退、不正時刻、他フィールド差分は
  drift として fail-closed にする。exact-13、source digest、immutable receipt は従来どおり保護する。
- 変更は repository 内の開発管理契約に限定され、製品 API・DB・認証認可・UI・deploy unit は非変更。
  層別の判断と検証は
  [仕様反映受領書](register-package-projection-idempotency-spec-reflection-receipt.md) を正とする。

## 2026-08-03 追記: inline Python の変数経由 graph 書込み遮断

- `HarnessHub-f84o` で、`python -c` / heredoc の path 変数、`Path` 結合、join、format、import 別名を AST 定数伝播で解決する C10 層を追加した。
- `open` / `os.open` / pathlib / shutil / os mutation を対象とし、rename / move は元と宛先の双方を変更として扱う。読取と `.dev-graph/tmp/` / `cache/` / `templates/` は許可する。
- path 評価と書込み収集、core case と性能・既知限界 test を責務分割し、変更した手書きファイルを 500 行以下へ収束させた。
- `exec` / `eval`、任意文字列変換、別 script file 本文は性能上の既知限界として明記し、PostToolUse drift audit と C02 writer 規約で補完する。
- 正本は `system-spec/dev-workflow.md` の `qa-139` / `appr-028`、設計・検証・製品非変更の判断は [仕様反映受領書](f84o-inline-python-guard-spec-reflection-receipt.md) を正とする。
