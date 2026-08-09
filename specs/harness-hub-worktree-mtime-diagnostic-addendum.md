---
graph_node_id: "spec-harness-hub-worktree-mtime-diagnostic-20260803"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["worktree","diagnostic","qa-140"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "並列 worktree 更新時刻診断の追補"
owners: ["daishiman"]
created_at: "2026-08-03T00:00:00Z"
updated_at: "2026-08-04T00:00:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["issue-worktree-main-ref-desync-20260728","arch-harness-hub-dev-workflow"]
resource_scope: ["specs/harness-hub-worktree-mtime-diagnostic-addendum.md"]
purpose: "並列 worktree の異常調査で mtime クラスタを断定材料として誤用しない。"
goal: "一括書込みの疑いを検知し、直接証拠に基づいて安全に復旧判断できる。"
scope_in: ["repository の開発運用と診断ツール"]
scope_out: ["Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["mtime クラスタが診断専用である","reflog 等の直接証拠で原因を確認する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-worktree-mtime-diagnostic-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7863d7fc569ddf9661497519d63763bfab0cc1b525497f2bb541ef8c86ec3e05","evaluator":"system-spec-harness compile + coverage validation (qa-139, qa-140)","evidence_ref":"system-spec/dev-workflow.md"}
source_lineage: {"imported_at":"2026-08-03T09:45:00Z","origin_kind":"system-spec-harness","source_digest":"7863d7fc569ddf9661497519d63763bfab0cc1b525497f2bb541ef8c86ec3e05","source_path":"system-spec/dev-workflow.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "qa-140 の確定 system-spec から導出する開発運用仕様の追補"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-worktree-mtime-diagnostic-addendum.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的と成功状態

`HarnessHub-7xi9` の再調査で、2026-07-31 06:56 の更新時刻クラスタは、reflog に記録された `git reset --hard` と直後の `git pull` で説明できると判明した。mtime (ファイル更新時刻) の一致を非 Git 系 clobber (意図しない一括上書き) の確定証拠と扱うと、復旧判断を誤る。

成功状態: mtime クラスタの検知結果を「調査のきっかけ」として使い、`git reflog` 等の直接証拠で原因を確認してから復旧判断する運用が定着している状態。

## スコープ

- In: repository の開発運用と診断ツール (`scripts/lint-worktree-clobber-mtime.py`)
- Out: Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit

## 用語と主体

| Term/Actor | Definition/Responsibility |
|---|---|
| mtime クラスタ | 変更・未追跡ファイルの更新時刻が短時間に集中している状態。診断の入口シグナルであり、原因の確定証拠ではない |
| 非 Git 系 clobber | Git 操作以外の要因 (エディタの一括保存、外部同期ツール等) による意図しないファイル一括上書き |
| 開発者/オペレーター | 並列 worktree で作業し、異常時に本ツールで調査する repository 利用者 |
| `lint-worktree-clobber-mtime.py` | mtime クラスタを診断し材料を報告するスクリプト。gate には配線しない |

## ユースケースとユーザーフロー

1. 開発者が並列 worktree 運用中に想定外のファイル変更に気づく。
2. `scripts/lint-worktree-clobber-mtime.py` を実行し、mtime クラスタの有無を確認する。
3. クラスタが検知された場合、`git reflog` と `git diff --shortstat HEAD` で直接証拠を確認する。
4. 直接証拠が Git 操作 (reset/pull 等) を示せば、mtime クラスタを clobber の確定証拠として扱わず通常の復旧判断に進む。
5. 直接証拠が Git 操作で説明できない場合のみ、非 Git 系 clobber の疑いとして追加調査に進む。

## 機能要件

- `FR-001`: `scripts/lint-worktree-clobber-mtime.py` は変更・未追跡ファイルの mtime クラスタを診断する。
- `FR-002`: 検知時は exit 1 で材料 (クラスタを構成するファイル一覧・時刻幅) を報告する。
- `FR-003`: Git 状態を取得できない場合は exit 0 とする (fail-open、診断不能時に開発を止めない設計)。
- `FR-004`: 本スクリプトは hook や commit を停止する gate には配線しない。診断専用ツールとして独立実行する。

## 非機能要件

- Performance: 通常の worktree 規模 (数百ファイル程度) で対話的実行に支障のない応答時間とする。
- Availability/Reliability: Git 状態取得に失敗しても fail-open (exit 0) とし、開発フローを止めない。
- Accessibility/Usability: 報告内容はクラスタが「診断材料」であり「確定証拠」でないことが分かる文言とする。
- Security/Privacy: N/A: ローカル repository のファイルメタデータのみを扱い、外部送信や機微情報の記録を行わない。
- Maintainability/Operability: 誤検知時の一次切り分け手順 (`git reflog` / `git diff --shortstat HEAD`) を出力またはドキュメントで示す。

## UI・状態遷移

N/A: 本ツールは CLI script であり、GUI/API 状態遷移を持たない。実行結果は exit code (0/1) と標準出力のみ。

## ビジネスルールと検証

- `BR-001`: mtime 単独で原因を断定しない。原因は `git reflog`、`git diff --shortstat HEAD`、対象実体の照合で確認する。
- `BR-002`: 検知は hook や commit を停止する gate に配線しない (fail-closed な強制停止にしない)。

## API契約

N/A: 本追補は CLI 診断スクリプトのみを対象とし、API エンドポイントを公開・変更しない。

## データモデル

N/A: 永続化する Entity/Value を持たない。実行のたびに Git 状態 (working tree のファイルメタデータ) を読み取るのみで、診断結果を保存しない。

## 認証・認可

N/A: ローカル repository 上で開発者本人の権限で実行するローカル CLI ツールであり、認証・認可機構を持たない。

## エラー・例外・回復

- Error taxonomy: Git 状態取得失敗 (exit 0、fail-open) / mtime クラスタ検知 (exit 1、診断材料の報告)。
- Retry/Timeout/Fallback: Git コマンド実行に失敗した場合はリトライせず fail-open で終了する。
- Idempotency/Concurrency: 読み取り専用診断のため副作用がなく、繰り返し実行しても結果は Git 状態のみに依存する (冪等)。

## イベント・非同期処理

N/A: 同期的な CLI 実行のみで、非同期メッセージングやイベント基盤を伴わない。

## 可観測性

- Logs/Metrics/Traces/Audit: 標準出力への診断結果表示のみ。専用ログ/メトリクス基盤への送出は行わない。
- Alert/SLO dashboard: N/A: 診断専用ツールであり自動アラートやダッシュボード連携を持たない。

## 互換性・移行・リリース

- Compatibility/versioning: スクリプト単体のバージョニングのみで、既存 hook や CI gate との配線関係を変更しない後方互換な追加。
- Migration/backfill: N/A: 既存データの移行を伴わない。
- Rollout/rollback: スクリプトファイルを削除するだけでロールバック可能。段階的リリースは不要。

## テストと受入条件

- [ ] `AC-001`: mtime クラスタの検知結果が「診断専用の材料」であり、単独で clobber の確定証拠として扱われないことがドキュメント/出力から明確である。
- [ ] `AC-002`: 検知後の一次切り分けが `git reflog` 等の直接証拠で行われ、mtime のみで原因を断定しない運用になっている。
- [ ] `AC-003`: Git 状態を取得できない環境で実行しても exit 0 で終了し、他の開発フローをブロックしない。
- Contract/integration/e2e/security/performance: unit test で mtime クラスタ検知ロジックと fail-open 経路 (Git 状態取得失敗時の exit 0) を固定する。hook 未配線であることは configuration (pre-commit 等) のレビューで確認する。

## 未決事項

- なし (2026-08-03 時点で qa-139/qa-140 は確定済み。新規未決は未検出)。

## 影響境界

本追補は repository の開発・復旧運用だけを対象とし、Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit を変更しない。正本は `system-spec/dev-workflow.md` の `qa-140`、設計参照は `architecture/harness-hub-dev-workflow.md`、操作手順は `docs/worktree-desync-recovery-runbook.md` とする。

## 目的と成功状態

mtime クラスタを異常の手掛かりとして検知しつつ、直接証拠なしに clobber 原因を断定しない復旧判断を成功状態とする。

## 用語と主体

mtime はファイル更新時刻、クラスタは近接時刻の変更群。診断 script が観測し、作業者が reflog と diff で判断する。

## スコープ

並列 worktree の診断と復旧判断だけを対象とし、製品 runtime と通常の commit gate は対象外とする。

## ユースケースとユーザーフロー

作業者は異常な一括更新を疑ったとき診断を実行し、報告された群を reflog・diff・実体照合で確認する。

## 機能要件

変更・未追跡 file の mtime クラスタを列挙し、検知時は exit 1 で診断材料を返す。

## ビジネスルールと検証

mtime 単独を原因確定に使わず、Git の直接証拠を優先する。診断不能は通常開発を止めない。

## データモデル

入力は path、mtime、Git 追跡状態。出力は閾値内の path 群と診断理由であり、永続 DB は持たない。

## API契約

CLI はクラスタなしで exit 0、検知で exit 1、Git 状態取得不能では診断用 fail-open として exit 0 を返す。

## イベント・非同期処理

手動実行の同期診断であり、hook・queue・定期 job へは配線しない。

## UI・状態遷移

製品 UI は変更しない。terminal の診断結果だけを提供する。

## 認証・認可

認証認可への影響はない。対象 repository を読めるローカル権限だけを使う。

## 非機能要件

読み取り専用、有限時間、path を明示する再現可能な診断とする。

## エラー・例外・回復

Git 状態を読めない場合は原因断定を避けて診断不能を返し、作業者が repository path と worktree 状態を確認する。

## 可観測性

検知した時刻帯、対象 path、件数を出力し、reflog・diff の確認へつなげる。

## 互換性・移行・リリース

既存 hook や commit 動線へ追加しないため互換性影響はない。診断 script の単独提供を維持する。

## テストと受入条件

mtime 群の検出、群なし、Git 状態取得不能、直接証拠優先の契約を fixture で検証する。

## 未決事項

blocking な未決事項はない。mtime を gate に昇格する場合は別仕様で false positive と復旧手順を確定する。
