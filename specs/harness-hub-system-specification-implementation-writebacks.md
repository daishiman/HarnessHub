---
graph_node_id: "spec-harness-hub-system-specification-implementation-writebacks"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["system-spec","writeback","document-split","traceability"]
priority: "high"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "Harness Hub システム要件仕様 — 実装 writeback 分冊"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-15T00:00:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-dev-workflow","issue-audit-fork-ledger-forgery-20260728","issue-rubric-proposal-20260806-review","task-rubric-proposal-retention-final-review-handoff-20260810","doc-rubric-proposal-retention-spec-reflection-receipt-20260810","issue-production-tenant-bootstrap-readiness-20260814"]
resource_scope: ["specs/harness-hub-system-specification-implementation-writebacks.md","specs/harness-hub-system-specification.md","system-spec/index.md","docs/features/feat-dev-pipeline-improvement/audit-ledger-transition-c19-final-review-20260808.md","docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-rubric-proposal-retention-final-review-handoff.md"]
purpose: "総合仕様を500行以下に保ちながら既存の実装 writeback と正本・受領書の参照関係を維持する"
goal: "分冊後も各実装確定事項から system-spec 正本と仕様反映受領書へ追跡できる"
scope_in: ["確定済み system-spec 契約に対する既存実装 writeback と仕様反映受領書への索引"]
scope_out: ["新しい製品要求","公開 API・DB schema・認証認可・UI・配備単位の変更"]
acceptance: ["通常文書が500行を超えない","移動前の意味と参照を保持する","artifact placement と graph schema を通過する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-system-specification-implementation-writebacks.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1dd8b46509c53dec769288b60792b7f3bbd4e781842742b280ee131a092fa779","evaluator":"final-review","evidence_ref":"docs/features/feat-dev-pipeline-improvement/audit-ledger-transition-c19-final-review-20260808.md"}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":"40ff8d45a094fe76e250d4585094cf5fe26f6329e4025db6fc6a9fe613347aff","source_path":"specs/harness-hub-system-specification.md","source_plugin":"final-review","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "総合仕様の500行上限を守るため、既存の実装反映索引を単一責務の仕様分冊として登録する"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-system-specification-implementation-writebacks.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-09T00:00:00Z","missing_sections":[],"status":"complete"}
---

# Harness Hub システム要件仕様 — 実装 writeback 分冊

この文書は [システム要件仕様 wrapper](harness-hub-system-specification.md) から分離した実装反映の索引である。要件の正本は `system-spec/`、判断と検証の正本は各仕様反映受領書に置く。

## 目的と成功状態

総合 wrapper を500行以下に保ちながら、既存の実装確定事項と正本・受領書の参照関係を失わない。

## スコープ

- In: 確定済み system-spec 契約に対する既存実装 writeback と、各仕様反映受領書への索引。
- Out: 新しい製品要求、公開 API、DB schema、認証認可判断、UI、配備単位の追加・変更。

## 用語と主体

| Term/Actor | Definition/Responsibility |
|---|---|
| writeback | 確定した実装境界を仕様索引へ戻す記録。要件正本ではない。 |
| system-spec | 製品要求と利用者判断の正本。 |
| Dev Graph | 本分冊の所在と依存関係を登録する台帳。 |

## ユースケースとユーザーフロー

1. 開発者または agent が総合 wrapper から本分冊を開き、対象実装の正本章と受領書へ移動する。

## 機能要件

- `FR-WB-001`: 移動前に総合 wrapper が示した各実装確定事項を意味単位で保持する。
- `FR-WB-002`: 各節から要件正本と仕様反映受領書へ到達できる。

## 非機能要件

- Maintainability: 本文は500行以下を維持し、新しい独立責務は別の登録済み分冊へ置く。
- Security/Privacy: secret の値や利用者データを記録しない。

## UI・状態遷移

N/A: 文書索引であり、製品 UI や runtime 状態遷移を提供しない。

## ビジネスルールと検証

- `BR-WB-001`: 本分冊だけを製品要求の承認根拠として使用しない。

## API契約

N/A: 公開または内部 API の契約を変更しない。

## データモデル

N/A: DB、object storage、cache の schema を変更しない。

## 認証・認可

N/A: 認証方式と権限判定を変更せず、確定済み契約への索引だけを保持する。

## エラー・例外・回復

リンク切れまたは正本との不一致を検出した場合は更新を止め、対応する受領書と Dev Graph node を修復する。

## イベント・非同期処理

N/A: runtime event、queue、非同期配信を追加しない。

## 可観測性

Dev Graph の artifact placement、schema、link 検査を文書の観測手段とする。

## 互換性・移行・リリース

総合 wrapper から本文を移し、元位置に本分冊へのリンクを残す。問題時は同じ意味単位を wrapper へ戻して登録 node を閉じる。

## テストと受入条件

- [x] `AC-WB-001`: wrapper と本分冊の合計で移動前の実装 writeback を保持する。
- [x] `AC-WB-002`: artifact placement と graph schema の検査を通過する。

## 未決事項

N/A: 今回の分冊に伴う製品判断はない。

## 共有 Google OAuth client 方式 (2026-08-01 / `HarnessHub-fnej` / qa-110〜qa-115)

- `idp_connections.credential_mode` は `customer_google` と `shared_google` を明示し、未知値・設定不備を別方式へフォールバックさせない。既存行は `customer_google` を既定にして従来の tenant 別 callback と暗号化 secret を維持する。
- 共有方式は環境単位の Google client 1 組と固定 callback `/api/auth/shared/callback/tenant-oidc` を使う。tenant は 10 分 TTL の署名付き `state` と HttpOnly binding cookie で復元し、PKCE S256 と nonce は Auth.js に残す。
- Auth.js が検証した Google ID token の `hd` を tenant の `allowed_workspace_domains` と完全一致させる。欠落、別 Workspace、サブドメイン、tenant 差し替えでは JIT 利用者・session を作らない。
- 共有 client ID/secret は tenant DB 行、ログ、response、Git、GitHub Secretsへ複製しない。Cloudflare Worker の環境 secret とし、共有方式を使わない環境の未設定は許す。
- migration `0003_auth-tenancy-shared-google-oidc.sql` は列追加のみ。rollback は shared tenant を customer mode へ戻して旧 callback を確認してから Worker code を戻す。
- 正本は [auth](../system-spec/auth.md)、[backend](../system-spec/backend.md)、[security](../system-spec/security.md)、[database](../system-spec/database.md)、[infrastructure](../system-spec/infrastructure.md)、[maintenance-ops](../system-spec/maintenance-ops.md)。判断と検証は [仕様反映受領書](../docs/features/feat-auth-tenancy/shared-google-oidc-spec-reflection-receipt.md) を参照する。

## 外部参考 Skill の所有境界 (2026-08-02 / `HarnessHub-ym9h` / qa-122)

- `doc/参考Skill/` は外部由来の比較・移管記録であり、能動 plugin の契約正本にしない。
- `aiworkflow-requirements` を前提にする参考コピーは directory 単位で削除し、利用中の外部 CLI 契約だけを consumer plugin 配下へ履歴付きで移す。
- 変更は repository の開発文書・plugin reference 所有に限定され、製品 UI、外部 API、DB schema、認証認可、Cloudflare deploy unit は変更しない。
- 正本は [dev-workflow](../system-spec/dev-workflow.md) の `qa-122`、判断・検証・復元経路は [仕様反映受領書](../docs/features/feat-doc-governance-portability/aiworkflow-reference-cleanup-spec-reflection-receipt.md) を参照する。

## 顧客持ち込み Google OAuth client 管理 (2026-08-02 / `HarnessHub-uk2i` / qa-124〜qa-130)

- `provider-admin` は `/settings/auth` と管理 API から顧客 client の登録、接続テスト、有効化、無停止 rotation、取消、無効化、安全な再開を行う。
- lifecycle は `pending → tested → active → disabled`。認証は `active` のみを使い、再開には新 credential の staging と再テストを必須にする。
- client ID・secret・方式・許可ドメインは tenant ごとの staging へ一式保存し、暗号文 CAS で同時昇格する。secret は暗号化保存と last4 表示だけに限定する。
- 管理 API は tenant scope・同一 origin・Google issuer・provider-admin を fail-closed で強制し、有効化後の実ブラウザ login を別ゲートとする。
- 正本は [auth](../system-spec/auth.md)、[backend](../system-spec/backend.md)、[database](../system-spec/database.md)、[frontend](../system-spec/frontend.md)、[security](../system-spec/security.md)、[maintenance-ops](../system-spec/maintenance-ops.md)、[testing-qa](../system-spec/testing-qa.md)。詳細は [仕様反映受領書](../docs/features/feat-auth-tenancy/customer-managed-google-oidc-spec-reflection-receipt.md) を参照する。

## C10 inline Python graph authority guard (2026-08-03 / `HarnessHub-f84o` / qa-139)

- `python -c` / heredoc の変数、Path 式、join、format、import 別名を AST 定数伝播で復元し、graph authority への書込みを C02 writer 迂回として遮断する。rename / move は元と宛先の双方を変更対象とする。
- 遮断経路は subprocess / network / graph 全件検証を起動せず、未解決でも authority prefix または graph store 末尾が確定すれば fail-closed にする。読取と tmp/cache/templates は巻き込まない。
- `exec` / `eval` 内の再帰 source、任意文字列変換、別 script 本文は性能境界から対象外とし、PostToolUse 監査と C02 規約で補完する。製品 runtime 契約は非変更。判断と検証は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/f84o-inline-python-guard-spec-reflection-receipt.md) を参照する。

## C16 Beads ready payload 欠落報告 (2026-08-03 / HarnessHub-xz0u / qa-141・qa-142)

- 選択範囲内かつ schedulable な Beads node が bd ready payload に無いとき、C16 は node を黙って除外せず `unmapped[]` に `reason=ready_payload_entry_absent` と `source=schedule-graph` を記録する。
- pre-lease は ready set と unmapped、最終 report は active lease/resource conflict の conflicts を加えた和で候補 node を被覆する。P01 parent / dependency 形状は fail-closed、parity dependency は順序非依存で比較し、依存未充足・parity・manifest 分類とは別 reason とする。復旧は C03/C28 の同期・linkage 修復・fresh parity manifest の後に再実行し、欠落 node を推測で ready set へ加えない。
- 変更は repository 内の Dev Graph 開発品質契約に限り、Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。正規反映と検証は [xz0u 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/xz0u-ready-payload-entry-absent-spec-reflection-receipt.md) を参照する。

## C04 deep knowledge card writeback (2026-08-10 / `HarnessHub-ldq`)

- `ui-ux` / `testing-qa` / `dev-workflow` / `infrastructure` に、それぞれ Usability & Accessibility / Test Strategy / Continuous Delivery / Site Reliability Engineering の deep card を割り当てる。
- `resource-map.yaml` を章から card への対応正本、`knowledge-catalog.json` の dependency order を compile 順の正本とし、相互の欠落・順序 drift を検査する。
- canonical compiler で上記 4 章へ反映する。製品 runtime、外部 API、DB、認証認可、Cloudflare deploy unit は変更しない。
- 受入結果は [deep knowledge cards 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/ldq-design-knowledge-cards-spec-reflection-receipt.md) を正とする。

## C19 resume completion writeback (2026-08-10)

- 初回 build は evaluator の完全 `agentId` に対応する native completion より後の C02 import を要求する。
- current receipt の resume は evaluator 再実行を禁止し、deterministic runner 1 回、upstream Skill / Agent / direct upsert 0 回、`system-spec-resume-closure/v1` の全 step exit 0 を要求する。
- `Write` / `Edit` の代筆判定は target path に限定し、status evidence 本文に `completeness-report.json` が現れるだけでは違反にしない。
- これは `qa-216` / `qa-217` の検証証拠契約を閉じる実装 writeback であり、新しい製品 API・DB・認証・UI 要件は追加しない。詳細は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/c19-resume-closure-spec-reflection-receipt.md) を正とする。

## rubric 自動生成提案の保持 writeback (2026-08-10 / `HarnessHub-lzfs`)

- 2026-08-06 の draft 提案は、採否判断そのものではなく human review へ渡す入力として履歴へ保存する。
- 未判断の `friction_density` 25 件と旧 worktree 絶対 path の集計キー問題は、Beads `HarnessHub-lzfs` と dev-graph `issue-rubric-proposal-20260806-review` で追跡する。commit / draft PR だけでは close しない。
- 製品 API、DB schema、認証認可、UI、Cloudflare deploy unit、rubric 本体の閾値・重み・template は変更しない。`system-spec/spec-state.json` は legacy schema 1.0 の read-only 境界を維持し、既存確定契約の実装 writeback として本分冊・architecture・feature・task・受領書へ記録する。
- `system-spec/index.md` の「実装 writeback 索引」から本節と受領書へ接続し、確定 QA を増やさずに `system-spec/` と実装記録の追跡可能性を保つ。
- 判断理由、検証、残作業は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md) を正とする。

## ローカル開発ランタイム信頼性 writeback (2026-08-11 / `HarnessHub-bmhq` / qa-230)

- ローカル state は repository 配下の git-ignore 済み `.local-state/hub/` に絶対パスで固定し、DB・秘密設定・PID・ログを一つの lifecycle owner が管理する。
- macOS は launchd が supervisor を、supervisor が sqld と Next.js を監視する。loopback 以外へ公開せず、異常終了後の再起動と同一 DB の継続利用を検査する。
- Hub health は HTTP loopback sqld だけを token なしで許可し、remote URL の credential 不足は引き続き fail-closed にする。認証付き API smoke と read-only Cookie 発行は seed から分離する。
- middleware 公開契約は `apps/hub/src/middleware-contract.ts` に一意化し、Next.js の予約 page 名との衝突を避ける。
- 製品の公開 API、DB schema、本番 Cloudflare deploy unit は変更しない。正本は [maintenance / operations](../system-spec/maintenance-ops.md) の `qa-230`、検証と残課題は [仕様反映受領書](../docs/features/feat-hub-foundation/local-dev-runtime-reliability-spec-reflection-receipt.md) を参照する。
### system-spec 設計適用 backfill の完了

- schema 1.1 移行時に一時免除されていた確定 QA 11件へ、question / answer / source を変えず `design_applications` を補完した。
- 補完は単一 transition writer の `set-qa-design-applications` だけを使い、`legacy_exempt: true` と理由を持つ旧 QA だけを対象に `design_application_provenance.mode=legacy_backfill` を残す。完了済み補完の同じ入力は冪等（べきとう＝再実行しても同じ結果）、対話時解釈への由来後付けと異なる解釈・由来の上書きは fail-closed とする。
- compiler / evaluator は `unrecorded|dialogue|legacy_backfill` を同じ語彙で扱い、未記録の緑化を拒否する。validator は未参照 QA を含む全 provenance を機械検査する。
- `validate-coverage-matrix.py --require-complete --require-foundation` は不足0件で PASS し、各 canonical 章へ章固有の原則・理由・トレードオフを再コンパイルした。

## 監査 fork 台帳 schema 1.2 writeback (2026-08-11 / `HarnessHub-uypz`)

- PostToolUse は matching tool call ごとに top-level `tool_use_id` と call 全体 `tool_response` を渡し、writer は schema 1.2 で ID / whole-response digest / `verdict_state` / 生 verdict を同一行へ記録する。
- consumer は schema 1.2 を session+ID で fail-closed 照合し、schema 1.1 は旧 Task の ID 無し legacy のみ受理する。1.2 の ID 欠落を 1.1 へ downgrade しない。
- unit / fixture の parallel canary PASS は defensive hardening であり、正式 evaluator の parallel 許可ではない。fresh live-trial 完了まで `1 message = 1 foreground fork` を維持する。
- 新しい利用者要求・`spec-state.json` セル変更・製品 API / DB / 認証 / UI / deploy unit は無い。`system-spec/` 確定章は reopen せず、architecture と [uypz 受領書](../docs/features/feat-dev-pipeline-improvement/uypz-audit-fork-schema12-spec-reflection-receipt.md) に内部契約を記録する。

## 配色仕様書 v2 writeback (2026-08-13)

- 見た目契約（色・書体・breakpoint・sidebar 幅・カード角・nav 最長一致）を UI 基盤追補へ戻す。製品 API / DB / 認可 / deploy unit は非変更。
- 確定質疑 qa-226 の md=768 逐語は未 reopen。実装正本は本変更の token と [UI 基盤追補](harness-hub-ui-foundation-addendum.md) FR-UIF-003/014。
- 判断と検証は [受領書](../docs/features/feat-hub-foundation/visual-system-v2-20260813-spec-reflection-receipt.md)。

## 本番テナント bootstrap CLI writeback (2026-08-15 / `HarnessHub-s8oe`)

- 画面と JIT は最初の tenant / workspace / `workspace-admin` を作れない。本番の唯一経路は dry-run 既定の `bootstrap-tenant` CLI とする。
- 既存行の name / plan は上書きせず、無い行だけを足す。role 変更・所属追加・監査は 1 transaction。監査失敗は成功扱いにしない。
- 公開 API、DB schema、role 語彙、JIT の `member` 固定は変更しない。確定章は reopen せず、本分冊と運用追補へ写す。
- 正本の接続は [database](../system-spec/database.md) / [auth](../system-spec/auth.md)、判断と検証は [仕様反映受領書](../docs/features/feat-auth-tenancy/s8oe-spec-reflection-receipt.md)。

## hearing-sheet-overhaul writeback (2026-08-12 / `HarnessHub-a70b`)

- S10 を 7 画面へ統合し、profile/priority enum を既存値破壊なしで加算する。作成時添付ステージングと S12 form_snapshot 全項目表示、S17 email/最終ログイン表示を含む。
- 製品 API path・tenant 認可・AI キュー kind・DB テーブル集合は不変。フィールド数 FormData 30 / snapshot 29 を維持。
- 詳細正本は `docs/frontend-spec.md` と [仕様反映受領書](../docs/features/feat-hearing-intake/mvp-sheet-overhaul-spec-reflection-receipt.md)。

## 成果物カード一覧 / 強調アイコン / 編集安全化 writeback (2026-08-15)

- ui-ux / frontend / security へ qa-232 / qa-233 / qa-234 を確定反映した。一覧のカード既定・
  カードブロック記法・編集/プレビュー 2 ペインは仕様として確定し、製品実装は list-shell /
  block-authoring が後続する。
- 強調表現は絵文字を使わず、packages/ui の inline SVG と semantic token に限定する。
  絵文字混入は CI G19 で fail-closed。
- Docs / Sheets 通常 CRUD は Idempotency-Key と entity revision ETag/If-Match を純増する。
  Catalog / PublishRequest と外部 import 専用 revision は非変更。
- 判断と検証は [仕様反映受領書](../docs/features/feat-semantic-emphasis-icons/card-family-20260815-spec-reflection-receipt.md)。

## 成果物カード一覧 製品実装 writeback (2026-08-16)

- qa-232 / qa-233 の確定契約は reopen しない。一覧カード既定・`:::cards`・2 ペインを製品コードへ落とした。
- Docs / Sheets / Catalog は URL query を絞込の正本、sessionStorage は view mode だけ。
  `status_counts` と title/body/tags 検索は repository 応答への純増。
- sanitize allowlist の差分は `hh-cards` / `hh-card` と正規化済み `data-cols` だけ。
- S09 は `/dashboard` へ同居、S16 は `/tracking`。旧 `/metrics` 系は 308 転送のみ。
- 配色 5 種と Build create/update は確定 QA を変えず、本分冊と architecture 差分へ写す。
- 判断と検証は [カード wave 受領書](../docs/features/feat-card-list-shell/card-family-20260816-spec-reflection-receipt.md)。
