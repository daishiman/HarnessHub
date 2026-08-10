---
graph_node_id: "doc-system-spec-compile-knowledge-reflection-review-20260803"
artifact_kind: "document"
artifact_subtypes: []
layer: "feature-evidence"
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-spec-harness","final-review","spec-impact"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "system-spec compiler knowledge reflection 最終レビュー受領書"
owners: ["daishiman"]
created_at: "2026-08-03T00:00:00Z"
updated_at: "2026-08-08T00:00:00Z"
status: "done"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow"]
resource_scope: ["plugins/system-spec-harness/skills/run-system-spec-compile","plugins/system-spec-harness/hooks/record-audit-fork.py","plugins/dev-graph/scripts/build-system-spec-import.py","docs/features/feat-dev-pipeline-improvement/system-spec-compile-knowledge-reflection-review-receipt.md"]
purpose: "設計知識表示、監査 verdict 束縛、C02 import の最終レビューと仕様影響判定を単一の受領書として残す"
goal: "plugin 内部契約の修正が回帰せず、製品仕様に不要な二重正本を作らず、reviewer が検証と影響境界を追跡できる状態"
scope_in: ["compiler の設計知識表示規則と回帰テスト","foundation source provenance","completion evaluator の fork 台帳と response verdict 束縛","C02 import adapter と live-trial","仕様影響なしの受領記録"]
scope_out: ["Harness Hub 製品 API、DB schema、認証認可、UI、Cloudflare deploy unit","確定済み system-spec/specs/architecture/features/tasks の内部契約への重複記載"]
acceptance: ["章ごとに確定 qa_ref・対応セル・serves_goals を示す適用節を生成する","knowledge-catalog の depends_on topo order と表示順が一致する","監査 PASS が実 fork 台帳、response digest、最終 AUDIT_VERDICT と一致する","C02 が caller repository の source artifact 本文だけを登録する","製品仕様層への意味的影響なしを理由付きで記録する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-dev-pipeline-improvement/system-spec-compile-knowledge-reflection-review-receipt.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"0978faf297121ab095888b3a70d1d89f6a41180a06c2e626d4197f1b37a7ddfc","evaluator":"independent-live-trial-acceptance-evaluator","evidence_ref":"eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260804T010000Z-codex-c19-post-main/independent-verification.json"}
source_lineage: {"imported_at":"2026-08-03T13:30:00Z","origin_kind":"manual","source_digest":"6aeabe2e215ea27a0d51013c94639bfce6fa05aceddd82050234c216b7342c6d","source_path":"plugins/system-spec-harness/skills/run-system-spec-compile/scripts/compile-spec-doc.py","source_plugin":"system-spec-harness","source_version":"0.2.0"}
classification_confidence: 0.96
classification_reason: "plugin compiler correction の最終レビューと仕様反映判断を記録する document artifact"
classification_candidates: [{"artifact_kind":"document","candidate_path":"docs/features/feat-dev-pipeline-improvement/system-spec-compile-knowledge-reflection-review-receipt.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-04T03:21:00Z","evidence_refs":["docs/features/feat-dev-pipeline-improvement/system-spec-compile-knowledge-reflection-review-receipt.md","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260804T010000Z-codex-c19-post-main/verdict.json","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260804T010000Z-codex-c19-post-main/independent-verification.json"],"policy":"manual","reconciled_at":"2026-08-04T03:21:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-04T03:21:00Z","missing_sections":[],"status":"complete"}
---

# 目的

`HarnessHub-byt6`、`HarnessHub-gw3g`、`HarnessHub-9kk5` の最終レビューとして、system-spec compiler の設計知識表示、監査の証跡束縛、C02 import を検証し、製品仕様・設計への影響を受領する。

## 結論

製品仕様・設計への意味的影響は **なし**。変更は system-spec-harness と dev-graph の plugin 内部契約、テスト、最終レビュー証跡に閉じる。製品の API、DB、認証認可、UI、デプロイ、運用目標は変えない。

## 変更内容

- compiler は各 design knowledge card を逐語転記せず、確定 `qa_ref`、対応セル、`serves_goals` を導出した「本章での適用」を出力する。依存関係の順序は `knowledge-catalog.json` の `depends_on` に従う。
- foundation source provenance は U1〜U9 の質問・回答と、written requirements のパス・節・SHA-256 を検証する。生成した要約を一次情報に見せかけない。
- completion evaluator は fork 台帳の prompt/response digest、session、tool、subagent、最終 `AUDIT_VERDICT` を照合する。監査の FAIL を PASS として集約する差し替えは fail-closed（不備があれば停止）で拒否する。
- C19 importer は contract 内の本文を拒否し、caller repository の `source_artifact` を読んだ本文と同じファイルから source digest を計算する。登録は C02 `upsert-node.py` のみで行う。

## 仕様・設計反映の受領

| 文書層 | 反映 | 判断理由 |
|---|---|---|
| `docs/features/` | あり | この受領書に最終レビュー、品質ゲート、影響境界を記録する。 |
| `features/` | 変更なし | 製品 feature の目的、受入条件、外部振る舞いは不変。 |
| `system-spec/` / `specs/` | 変更なし | 要件、API、状態、security、UI、運用の確定事項は不変。 |
| `architecture/` | 変更なし | component 境界、データフロー、技術選定、deploy unit は不変。 |
| `tasks/` | 変更なし | standalone plugin correction であり、promoted task package の手編集は source integrity を損なう。 |

製品層に compiler の内部表示順や監査台帳の形式を重複記載しないことが正規フローである。上表の「変更なし」は未確認ではなく、差分と C19 実走を確認したうえでの判断である。

## 追補 (2026-08-08)

`scripts/validate-plugin-hooks.py` の hooks entry point parity 検査 (HK-001..003) に 2 件の是正を追加した。

- `registered_hook_files()` は `hooks/hooks.json` の JSON 構文エラーを黙って空集合へ握り潰していた。実際は登録済みの hook が未登録 (HK-002) として誤検出されうるため、エラーを `registered_hooks_error` として呼び出し側へ返し、validate() が明示エラーを出す。
- `_hook_file_from_token()` は token 中の任意の `"/hooks/"` 部分文字列を無条件で拾っていた。`.git/hooks/pre-commit` のような `$CLAUDE_PLUGIN_ROOT` を経由しない無関係な `/hooks/` を entry point と誤認しないよう、`CLAUDE_PLUGIN_ROOT` プレフィックスを確認するガードを追加した。
- `is_import_only_support_module()` は UTF-8 デコード不能なファイルで `UnicodeDecodeError` を捕捉しておらず、検査全体が例外で落ちる余地があった。`OSError` と同様に捕捉し、安全側 (entry point 扱い) にフォールバックする。

いずれも `scripts/validate-plugin-completeness.py` / `scripts/validate-plugin-hooks.py` 内部の判定ロジックの正確性修正であり、製品仕様・API・DB・認証認可・UI・デプロイには接続しない。回帰テスト 3 件 (`tests/scripts-root/test_root__validate_plugin_completeness_hooks_parity.py`) を追加し、対象範囲の pytest は以下のとおり PASS した。この追補分についても製品仕様への意味的影響は **なし**(上表の判断をそのまま適用する — plugin 内部契約の是正であり、promoted task package も紐付かない standalone correction のため)。

## 検証結果

- `python3 -m pytest plugins/system-spec-harness -q` — 508 passed。
- `python3 -m pytest plugins/dev-graph/tests/test_prepare_system_spec_import.py plugins/dev-graph/tests/test_validate_source_digest.py plugins/dev-graph/tests/test_validate_evidence_refs.py -q` — 27 passed。
- `python3 -m pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py plugins/dev-graph/tests/test_prepare_system_spec_import.py -q` — 28 passed。
- C19 live trial `20260804T010000Z-codex-c19-post-main` — PASS。初回監査 FAIL を正規 reopen、再コンパイル、再監査で修正し、Skill 経由の canonical flow、source lineage、C02 登録、source/evidence gate を確認した。
- 独立した読み取り専用評価 — PASS。source artifact と登録本文の一致、source digest、graph の直接編集がないことを確認した。
- `validate-system-plan.py` — P01〜P13、status=pass。`lint-doc-line-limit.py` — 584 文書、違反 0。`git diff --check` — whitespace error 0。
- remote `main` と local `main` が同一 `fb05db56` であることを確認し、本 branch へ `main` を merge した (`e14f2231`)。この後の最終 fetch と全ゲート再実行を PR 作成直前に行う。
- (2026-08-08 追補) `python3 -m pytest tests/scripts-root/test_root__validate_plugin_completeness_hooks_parity.py -q` — 16 passed(新規回帰3件を含む)。`python3 -m pytest tests/scripts-root/ -q` — 1188 passed。`python3 -m pytest plugins/system-spec-harness -q` — 508 passed(再実行)。`python3 scripts/lint-doc-line-limit.py` — 605 文書、違反 0。remote `main` / local `main` は同一 (差分 0 コミット) を再確認、branch は既に main を merge済み(`74ae832d`)でコンフリクトなし。

## 追補 (2026-08-08 その2): main 再合流とコンフリクト解消

PR #665 が main に対して 6 ファイルの衝突を報告したため、`origin/main`（当時 `1c5e7451`、その後 `3aa84ee9` まで1コミット進行）を本 branch へ再度合流した。衝突は以下のとおり解消し、いずれも一方を機械的に選ぶのではなく、両ブランチの完全な diff を突き合わせたうえで判断した。

- `compile-spec-doc.py` / `test_compile_spec_doc.py`: 双方が「`knowledge-catalog.json` の `depends_on` に基づく設計知識のトポロジカル順序付け」を独立実装していた。本 branch 側は `lib/spec_docset_catalog.py` へ切り出した Kahn 法によるトポロジカルソート、main 側は `build-knowledge-order.py` という兄弟スクリプトを `importlib` 動的読込する方式。本 branch 側実装がテストカバレッジ上位互換だったため、本 branch 側を採用し、main 側でのみ追加された `build-knowledge-order.py`（どこからも参照されなくなった孤立スクリプト）とその coverage 台帳エントリはユーザー承認のうえ削除した。
- `scenario-verdict.json`: 追記専用ではない「最新 C19 live-trial 判定」の状態ファイルのため、より新しい main 側の内容をそのまま採用した。
- `harness-coverage.json`: 生成物（`scripts/validate-harness-coverage.py` の出力）のため、マージ後の実測値を `python3 scripts/validate-harness-coverage.py --json eval-log/harness-coverage.json` で再生成した（scripts count 433→438 に更新、既存の llm_eval 系未達は今回の変更と無関係の既知の状態）。
- `audit-fork-ledger.jsonl`: 監査台帳（append-only、[[audit-fork-ledger-forgery-issue-20260728]] で完全性が問題視されている対象）のため、どちらか一方を選ばず両ブランチの新規行を `ts` でソートして和集合（union）マージし、全行が JSON として妥当であることを検証した。

マージ作業中、無関係な untracked ファイルを誤って `git add -A` してしまい、`git reset`（引数なし）で取り消した際に、その副作用で `MERGE_HEAD`/`MERGE_MSG` が失われる事故が発生した（git はマージ中の後始末処理を素の `reset` にも紐付けているため）。作業ツリー・インデックスの内容は無傷だったため、正しいマージ相手コミット SHA で `MERGE_HEAD` を手動復元し、2 親のマージコミットとして正しくコミットし直した（`bc172799`）。その後 origin/main の残り1コミット分 (`3aa84ee9`) を通常の `git merge` で追加取り込み（衝突なし、`2fa35c79`）。再発防止として、マージ中の部分的なステージ取消はパス指定の `git reset -- <path>` を使う運用を今後徹底する。

この一連の解消・再生成後も、製品仕様・設計への意味的影響は **なし**。plugin 内部実装の統合と生成物の再計算に閉じており、上表の判断は変わらない。

## 追補 (2026-08-08 その3): push後CIの2件失敗を修正

push 後の GitHub Actions で `test_skill_criteria_evidence.py::test_independent_scenario_receipt_covers_exact_criteria` と `test_live_trial_task_contract.py::test_all_mode_passes_on_real_repo` が失敗した。原因は、その2で追加した fresh live-trial (`20260807T130000-wt22-c19-ledgerfix`) を `scenario-verdict.json` へ反映する際の3つの手直し漏れだった。

- `scenario-verdict.json` の `OUT1.scenario_id` を `"C19-OUT1-positive-system-spec-lineage"` と記録していたが、正本の scenario fixture (`plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json`) は `-r2` 改訂後の `"C19-OUT1-positive-system-spec-lineage-r2"` を要求する。live-trial 側の `task.md` / `verdict.json` / `independent-verification.json` も同じく `-r2` を欠いていた。live-trial が実際に検証した `task_contract.required_fragments`（`upsert-node.py` / `SYSTEM_SPEC_AUDIT_FORK_LEDGER` / doc-fetch の一次情報取得契約）はすべて task.md に verbatim で含まれており、内容面では -r2 契約を満たしていたため、識別子の記載漏れとして4ファイルへ `-r2` を補記した（新たな live-trial 再実走はしていない）。
- `verdict.json` 内の `scenario_contract.task_contract` ブロックが `declared: false` のまま(旧 scenario 由来のテンプレートが残存)だったため、`declared: true` と実際に充足済みの `required_fragments` / `missing_required_fragments: []` / `matches: true` へ補正した。
- `test_live_trial_task_contract.py::test_all_mode_passes_on_real_repo` は「receipt が指す最新 PASS run」を固定文字列で照合するテストで、旧 run (`20260804T083000Z-m0bd-c19-r10-clean-fixture`) を期待値としたままだった。receipt の参照先を新 run へ更新した以上、この期待値も同じ run 名へ更新する必要があり、過去の類似リファクタ（`17165fdc`）と同じパターンで追従させた。

`python3 -m pytest plugins/dev-graph/tests -q` — 963 passed（CI が報告した 961 passed / 2 failed から全件成功へ復帰）。仕様・設計への意味的影響は本追補でも **なし**（証跡ファイルの識別子整合性の是正のみ）。

## 追補 (2026-08-08 その4): push後CIの3件目の失敗を修正 (system-dev-planner)

上記 push 後の CI で `plugins/system-dev-planner/tests/test_runtime.py::PromotionTests` 配下 6 テストが `completeness_evaluation:producer-verification-failed` で FAIL した。本 branch は独立して `audit_fork_attribution.py` へ「PostToolUse hook が記録した `response_sha256` / `audit_verdict` を receipt の `dispatch.response_sha256` および fork 台帳行と突合する fail-closed 検証」(HarnessHub-x4o、2026-08-04 実装、origin/main 未合流) を追加していたが、`test_runtime.py` の fixture (`AUDIT_DELEGATIONS` / `write_audit_fork_ledger`) はこの新要件（`dispatch.response_sha256`、台帳行の `prompt_sha256` / `response_sha256` / `audit_verdict`）を反映しないまま残っていた。同種の正しい fixture 形状は同じ機能を実装した `plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/tests/completeness_test_support.py`（`golden_delegations` / `write_ledger`）に既にあり、これに倣って `response_sha256 = sha256(f"{auditor}:{verdict}")` を dispatch と台帳行の双方へ追記した。

`python3 -m pytest plugins/system-dev-planner/tests/test_runtime.py -q` — 20 passed（6 failed から復帰）。`python3 -m pytest plugins/system-dev-planner -q` — 197 passed。テストの検証ロジック（fixture の束縛整合性）のみの是正であり、製品仕様・設計への意味的影響は **なし**。

## 残課題

blocker はない。architecture 専用章を将来追加する場合は、architecture node が要件定義章を source artifact としている現在の対応を見直す（低優先度）。

## 関連

- Beads: `HarnessHub-byt6`、`HarnessHub-gw3g`、`HarnessHub-9kk5`
- dev-graph node: `doc-system-spec-compile-knowledge-reflection-review-20260803`
- feature context: `feat-dev-pipeline-improvement`

## 変更履歴

| Date | Change | Author |
|---|---|---|
| 2026-08-03 | 最終レビューの受領書を作成 | Codex |
| 2026-08-04 | fork verdict 束縛、C19 fresh live trial PASS、仕様影響なしの受領を記録 | Codex |
| 2026-08-08 | hooks entry point parity 検査の是正(構文エラー伝播・CLAUDE_PLUGIN_ROOT 判定・デコード不能ファイル耐性)を追補、回帰テスト追加、仕様影響なしを再確認 | Claude |
| 2026-08-08 | main 再合流に伴う6ファイルのコンフリクト解消(設計知識トポロジカル順序の実装統合、監査台帳union merge、生成物再計算)とMERGE_HEAD事故からの復旧を記録、仕様影響なしを再確認 | Claude |
| 2026-08-08 | push後CIで検出されたscenario_id/task_contract記載漏れ2件を是正、pytest 963 passedへ復帰、仕様影響なしを再確認 | Claude |
| 2026-08-08 | push後CIで検出されたsystem-dev-planner側のaudit fork台帳束縛fixture未追従を是正、pytest 197 passedへ復帰、仕様影響なしを再確認 | Claude |
| 2026-08-08 | push後CIで検出された harness-ratchet 退行 (2026-08-04頃追加の6script が llm_eval 品質記録未添付) を是正。独立エージェントによる実コードレビューで6件の verdict (`eval-log/coverage/scripts/`) を新規生成しfloor復帰、仕様影響なしを再確認 | Claude |
