---
graph_node_id: "arch-harness-hub-infrastructure"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "harness-hub"
domain: "infrastructure"
tags: ["system-spec-import","infrastructure"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub infrastructure アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-08-02T08:32:31.653436Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-infrastructure.md"]
purpose: "Cloudflare Workers 一体型 (OpenNext) + 無料枠運用・SLO 99.5%・エラーバジェット・監視/ポストモーテム運用の正本参照"
goal: "qa-003/qa-011/qa-019/qa-068 の確定要件 (D7: 常設 staging なし・production 1 組 + 使い捨て preview) に適合する infrastructure/運用の指針を提供する"
scope_in: ["system-spec/infrastructure.md","system-spec/maintenance-ops.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-infrastructure.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ccec5f9db6ebdbe69e5936c1e8821058a782dd4c08c884bda399277345440f74","evaluator":"validate-coverage-matrix.py","evidence_ref":"system-spec/spec-state.json"}
source_lineage: {"imported_at":"2026-08-02T00:00:00Z","origin_kind":"system-spec-harness","source_digest":"fe2ef626f06de681c39979e67255940fa0f57832b017378c0e929edcea7c1b07","source_path":"system-spec/infrastructure.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-infrastructure.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-17T00:35:59Z","missing_sections":[],"status":"complete"}
---

# Harness Hub infrastructure アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/infrastructure.md](../system-spec/infrastructure.md) (sha256: `47d9b82aba718106…`)
- [system-spec/maintenance-ops.md](../system-spec/maintenance-ops.md) (sha256: `960ed37334a8cbcf…`)

- confirmation: `confirmed` / evaluator: `validate-coverage-matrix.py` → **PASS**（SLO 運用契約を維持し、delivery closure を qa-123 で分離）
- 再取込日時: 2026-08-02T05:37:45Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/infrastructure.md と system-spec/maintenance-ops.md。Workers Free (3MiB 制限)・R2/D1 無料枠・GitHub Actions CI/CD (pnpm 強制)・SLO 99.5% + エラーバジェット (qa-019)。doctrine anchor: Google SRE。

## Context and drivers

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: infrastructure — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Delivery, migration and rollback

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-25 / feat-domain-model-db P13 / `SYS-DOMAIN-MODEL-DB-P13`)** — 詳細正本は [docs/infrastructure-spec.md](../docs/infrastructure-spec.md) §7 / §10。

- **deploy パイプラインの段構成**: migrate (dry-run → 本適用) → build → `wrangler deploy` → `/health` → **本番スモーク 6 項目** → `if: failure()` rollback。単一 workflow (`ci.yml`) 内で連鎖させる制約 (qa-038【5】) を維持する。
- **migration の適用境界**: 適用台帳は drizzle 公式の `__drizzle_migrations` を単一の正とし、生 DDL の直接投入は採らない。台帳件数が journal 件数へ到達しない場合は fail-closed で deploy へ進ませない。
- **rollback の非対称性**: Worker は直前 version へ戻すが **DB は自動で戻さない**。migration が expand-only である限り旧 code は新 schema 上で整合するため、code のみ巻き戻す方が復旧が速く副作用が小さい。巻き戻しは「壊れた新 version が既に本番へ出ている」= deploy step success のときに限る。
- **バックアップの検証境界**: upload 成功ではなく **再取得したバイト列の一致**を成功条件に置く。日次保存形式を control-plane JSONL に統一し、同じ `restore-control-plane.ts` が header・schema・行数・audit chain・暗号断面を判定する。drill 専用の別形式は持たない。
- **Actions 設定境界**: secret / variable の用途・種類・必須度・利用 workflow は `scripts/ci/actions-secrets-registry.json` が正本。CI は workflow の実参照と双方向で突合し、手動 `--live` は GitHub 上の投入済み集合まで照合する。

**差分追記 (2026-07-26 / HarnessHub-b7ng)**:

- migration → 認証 Secret/環境設定確認 → Worker deploy → OIDC / Device Flow smoke の順で rollout する。
- migration は旧 publisher token を移送しないため、利用者告知と Device Flow 再認証を release 条件に含める。
- rollback は既存どおり DB を前進させたまま Worker code を戻す。

**差分追記 (2026-07-30 / `SYS-AUTH-TENANCY-P13` / qa-099)**:

- productionの公開設定は`AUTH_CANONICAL_ORIGIN`、`AUTH_ALLOWED_ORIGINS`、
  `AUTH_DEVICE_VERIFICATION_URI`を`wrangler.jsonc`で管理する。
- 必須Worker Secret名は`AUTH_SESSION_SECRET`、`AUTH_ACCESS_TOKEN_SECRET`、
  `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`ENCRYPTION_KEK`の5件。
  Google client secretやテナント別`IDP_SECRET_*`を追加しない。
- 現行rolloutの外部受入はGoogle/HarnessHub 1テナント。複数テナント分離試験を維持し、
  「本番1件」と「製品が単一テナント」を混同しない。

**差分追記 (2026-08-02 / `HarnessHub-9cgb` / qa-131)**:

- `hub-cwv` は自由入力 URL を受けず、`HUB_PUBLIC_URL` の HTTPS `/catalog` にだけ短命 ticket を
  発行する。必須設定が無い場合は未計測を成功扱いにせず fail-closed で停止する。
- Worker は `CWV_PROBE_SECRET`、`CWV_PROBE_TENANT_ID`、`CWV_PROBE_WORKSPACE_ID`、Actions は
  対応する `HUB_CWV_PROBE_*` を用途限定で使う。標準の auth secret やユーザー credential を
  GitHub に複製しない。
- Lighthouse upload 前に ticket を除去・検査し、集計 report には ticket を含まない URL だけを残す。
  secret の投入、read-only scope 選定、main deploy、初回成功は外部 follow-up として Beads を open に保つ。
- R1〜R5はprovider/CSRF/sign-in、JIT、Workspace所属、Device Flow、
  refresh再利用失効、session revocationまで本番実測し、release recordへ記録する。

**差分追記 (2026-07-28 / `HarnessHub-vns9`)** — 詳細正本は [docs/infrastructure-spec.md](../docs/infrastructure-spec.md) §7 / §10。

- **backup 成果物の採否判定境界**: 採用するか否かの判定は `packages/db/scripts/verify-export-artifact.ts` (実体は `parseExportArtifact`) の**一箇所へ集約**する。workflow の shell 側に header の `grep` や行数の `awk` を置かない。判定が 2 箇所に分かれると**弱い方が先に判定する**ため、ライブラリ側の fail-closed 検査 (header 形式・`format_version`・`coreTables` 19 テーブルとの集合一致・header 宣言行数と実際の行数の一致) が届かなくなる。
- **qa-019「復元できないバックアップを成功と数えない」の適用範囲**: この確定要件が禁じるのは*復元できない断面*の採用であって、*データ行 0 の断面*の採用ではない。migration 済みで全 19 テーブル 0 行の断面は restore すれば同じ空 DB を再現するため採用し、`::warning::` だけ残す。旧実装はこの取り違えにより、稼働直後の本番 DB を 3 夜連続で不採用にしていた。

**差分追記 (2026-07-29 / `HarnessHub-dbx6` / qa-094)**:

- **heartbeat の責務分離**: Worker 日次 cron と GitHub Actions 日次 backup は別々の Better Stack heartbeat を使う。`CRON_HEARTBEAT_URL` と `BACKUP_HEARTBEAT_URL` を共用すると、一方の成功が他方の失敗を隠すため禁止する。
- **失敗検知の時間境界**: backup 専用 `hub-backup-daily` は `period=86400` 秒 / `grace=3600` 秒とし、UTC 17:00 の予定 run が完走しなければおおむね UTC 18:00 (JST 03:00) までに異常化させる。heartbeat は全 backup step 成功後だけ送る。
- **fail-closed と完了境界**: `BACKUP_HEARTBEAT_URL` は required。未投入なら workflow の前提確認で停止する。repository 内実装だけで適用済みと数えず、Better Stack 資源、GitHub secret、main の成功 run、着信実測が揃うまで `HarnessHub-dbx6` は継続する。

**配信経路・依存版の差分追記 (2026-07-30 / `HarnessHub-e2u`)**:

- Claude Code marketplace の候補経路に、`url` / `path` と任意の `ref` / `sha` を
  持つ公式 `git-subdir` source を加える。旧 `github` source の `path` 無視とは
  別契約として扱い、macOS / Windows の install、component inventory、skill 実行が
  揃うまで採用 decision を確定しない。追跡は `HarnessHub-n2c0`。
- Wrangler は project-local dependency と frozen lockfile を CI / deploy の固定点にする。
  台帳上の現行確認値 4.115.0 は自動更新せず、依存更新 PR で build / dry-run /
  deploy 関連ゲートを通してから lockfile を更新する。
- Next.js 16.2.12、Drizzle stable 0.45.2 / v1 rc.4 は出典鮮度と採用判断の
  境界を明確にする記録であり、本変更では runtime dependency、deploy unit、
  DB schema、外部 API を変更しない。

**Publish pipeline 差分追記 (2026-07-30 / `HarnessHub-dfm` / qa-106・qa-107)**:

- Worker は Turso repository と R2 `PackageRegistry` binding を合成し、ZIP 本文は
  圧縮時 10 MiB の上限まで stream で読み、上限超過時は早期に 413 を返す。
- package は `packages/<sha256>` へ content-addressed 保存する。DB の package 行と
  Release が同じ hash を参照し、本番 smoke は R2 再取得後の hash 一致まで検査する。
- release gate は型・テスト・境界検査・secret scan・build の後に S1〜S6 smoke を実行し、
  Green 公開、secret rejection、直列化、promote/rollback、R2、監査 chain を横断確認する。
- 障害時は直前 Worker version へ code-only rollback し、DB migration、immutable Release、
  R2 object、append-only 監査は戻さない。これにより調査履歴と参照整合性を保つ。
- 実測値、残る運用リスク、正規仕様遷移は
  [仕様反映受領書](../docs/features/feat-publish-pipeline/spec-reflection-receipt.md) を参照する。

**P13 CI 再実行経路 (2026-08-01 / `HarnessHub-o2i.13`)**:

- main merge による自動 deploy を通常経路として維持する。`on.push.paths` 対象外の docs-only merge で
  run が発火しない場合だけ、main の `workflow_dispatch` を同一 pipeline の再実行入口として許可する。
- dispatch でも `static-gates → test → deploy → health → OIDC / DB-R2 smoke` の依存を短絡しない。
  feature branch の dispatch と、手元からの通常 Wrangler deploy は引き続き本番経路にしない。
- deploy unit、secret 境界、migration 順序、rollback の非対称性は変更しない。詳細正本は
  [infrastructure spec](../docs/infrastructure-spec.md) §7、実測は
  [hearing intake P13 release notes](../docs/features/feat-hearing-intake/release-notes.md) とする。

## Risks and verification

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-25 / feat-domain-model-db P13)**

- **最小権限リスク**: 2026-07-25 時点では `CLOUDFLARE_API_TOKEN` を Workers deploy と R2 write で共用していた。2026-07-29 に repository 内の参照分離を実装し、外部環境での token 発行・投入・拒否確認・workflow 完走は `issue-ci-token-least-privilege-20260725` (`HarnessHub-bda4`) で継続追跡する。
- **検証済み境界 (2026-08-01)**: main 上の `ci.yml` は run `30684710098` で migration → deploy → health → smoke を完走し、`backup.yml` は run `30686023662` で export 19 テーブル / 64 行、R2 往復一致、heartbeat ping まで完走した。追跡していた `HarnessHub-fnzl` は受入条件 6/6 で closed。
- **検証済み**: 本番 Turso 18 table / 12 index、D1 hedge 同一断面、R2 往復、スモーク 6/6、restore drill 2 段、rollback 3 分岐 (deploy 未成功 / rollback 成功 / rollback 失敗)。証跡は [docs/features/feat-domain-model-db/release-record.md](../docs/features/feat-domain-model-db/release-record.md)。

**差分追記 (2026-07-28 / `HarnessHub-vns9`)**

- **未検証境界の解消 (2026-08-01)**: `check-actions-secrets.mjs --live` は現行の workflow 参照 13 件 = 台帳 13 件で exit 0。main の `hub-ci` run `30684710098` と `hub-backup` run `30686023662` がともに success となり、deploy と日次 backup の外部受入を満たした。
- **観測経路の欠落を解消**: backup 専用 Better Stack heartbeat `477775` を Worker cron 用 `475650` と分離して適用し、required secret 投入と ping の HTTP 2xx 受理を実測した。cron 不発と途中失敗はいずれも `period=86400` + `grace=3600` の期限超過として概ね JST 03:00 までに異常化する。`HarnessHub-dbx6` は受入条件 4/4 で closed。

**差分追記 (2026-07-29 / `HarnessHub-bda4` / qa-091)**

- **credential 境界**: `CLOUDFLARE_API_TOKEN` は Workers deploy / rollback 専用、`CLOUDFLARE_R2_API_TOKEN` は日次 backup と本番 smoke の R2 object 操作専用とする。前者へ R2 write、後者へ Workers Scripts 権限を付与しない。
- **permission 選択**: Wrangler の `r2 object ... --remote` は Cloudflare REST API 経路のため、S3 互換 API 専用の bucket-scoped item 権限ではなく account-scoped の `Workers R2 Storage Write` を使う。account scope の広さは、Worker 改変権限との分離と workflow 利用箇所の限定で補う。
- **完了境界**: repository の静的ゲートは token の相互利用を拒否する。Cloudflare token 発行、GitHub secret 投入、deploy token の R2 write 拒否、R2 token での backup / production smoke 完走は外部証跡が揃うまで未完了とする。
- **非影響範囲**: 外部 API、DB schema、認証認可モデル、UI、Cloudflare Worker の deploy unit は変更しない。

**deploy検証追補 (2026-07-30 / `SYS-AUTH-TENANCY-P13`)**

- pipeline順序を`required settings preflight → migration → deploy → health →
  OIDC start-flow smoke → DB/R2 smoke`に固定する。
- preflight失敗はdeploy前失敗なのでrollback対象なし。deploy成功後のhealth/OIDC/DB-R2失敗は
  直前Workerへrollbackし、DBはexpand-onlyのため前進状態を維持する。
- OIDC smokeは秘密値を保持せず、tenant provider・canonical callback・未知tenant拒否・
  CSRF・Google 302・state/nonce/PKCEを検査する。Google callback後の実ログインは
  人の資格情報をCIへ置かず、運用E2E証跡で扱う。
- owner認可は既存の`tenant境界 → base role → resource owner関係合成`を変更せず、
  G14で全action×role・非owner・cross-tenantを名指し再検証する。
- PR #612後のrun `30518334455`はR2専用token未登録で失敗したが自動rollbackは成功した。
  repository側の再発防止と、Cloudflare所有者による最小権限token発行は別の信頼境界として扱う。

## SLO 公開実測の差分追記 (2026-08-02 / `HarnessHub-37h.15` / qa-116)

- **実測境界**: Better Stack の設定申告ではなく、認証不要の status page `/index.json` を読み、resource `external_id` を主鍵に現在状態と日次履歴を突合する。取得不能は fail-closed とする。
- **観測窓**: UTC の完了日だけを数え、進行中の当日と `not_monitored` を除外する。30 日未満は `collecting`、外形単独の目標判定は `null` を維持する。
- **最終判定**: 30 日到達後も Workers Analytics 5xx 率が揃うまで `observation_complete_pending_application_error_rate` とし、外形監視だけで 99.5% 達成を主張しない。
- **再現性と秘密**: 検証 CLI は一致 0 / 不一致 1 / 取得・入力不能 2 を返し、公開 URL だけを読む。API token と heartbeat URL を証跡へ保存しない。
- 正本は [system-spec/infrastructure.md](../system-spec/infrastructure.md) の qa-116、実装・検証・残課題は [仕様反映受領書](../docs/features/feat-hub-foundation/slo-observation-spec-reflection-receipt.md) を参照する。

## Delivery closure と SLO verdict の分離 (2026-08-02 / qa-123)

- SLO target、観測窓、複合算定、エラーバジェットは qa-019 / qa-116 を維持する。
- feature / P13 の delivery lifecycle は exact-13、release、health、bundle、共通層の証跡で閉じ、ユーザーが不要とした運用 follow-up は `not_applicable` として非 blocker にする。
- waiver を稼働品質 PASS へ変換しない。観測再開時は同一 issue の reopen または新 issue と、既存 runbook / CLI / 生データを必要とする。
- この変更は acceptance governance の境界だけで、API、DB schema、認証認可、UI、Worker deploy unit の構造を変えない。詳細は [仕様反映受領書](../docs/features/feat-hub-foundation/feature-closeout-spec-reflection-receipt.md) を参照する。

**差分追記 (2026-08-01 / `HarnessHub-fnej` / qa-113・qa-114)**:

- 環境ごとに Google OAuth client を 1 件作り、redirect URI は
  `AUTH_CANONICAL_ORIGIN + /api/auth/shared/callback/tenant-oidc` の 1 本に固定する。
  tenant 追加ごとの client/URI 登録は行わない。
- `SHARED_GOOGLE_OAUTH_CLIENT_ID` と `SHARED_GOOGLE_OAUTH_CLIENT_SECRET` は
  Cloudflare Worker の環境 secret とし、repository と GitHub Actions Secrets を
  受渡し元にしない。共有 tenant がない環境では未設定を許す。
- rollout は backup/dry-run → migration 0003 → secret 投入 → Worker deploy →
  tenant mode 変更 → 共有/顧客両方式 smoke の順。個人 Google、別 Workspace、
  tenant state 差し替えの拒否も確認する。
- rollback は tenant を customer mode へ戻し、旧 callback の成功を確認してから
  Worker code を戻す。DB migration と証跡は自動で戻さない。
- secret rotation は新 secret 投入 → Worker 反映 → login 確認 → 旧 secret revoke。
  手順と証跡は
  [rollout runbook](../docs/features/feat-auth-tenancy/runbook-shared-google-oidc-rollout.md)
  を正とする。
