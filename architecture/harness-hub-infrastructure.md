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
updated_at: "2026-07-30T04:40:19Z"
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
confirmation_evidence: {"evaluated_digest":"dcaea21237f4c45e484054c3c1a3c00f04f92b40de5654cf625136d185e940bf","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260721-231238.json"}
source_lineage: {"imported_at":"2026-07-30T04:40:19Z","origin_kind":"system-spec-harness","source_digest":"7d41dd5eec8e690b938df18bd37eff64a493355fd8aab2dacec182319dc69d8f","source_path":"system-spec/infrastructure.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
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

- [system-spec/infrastructure.md](../system-spec/infrastructure.md) (sha256: `7d41dd5eec8e690b…`)
- [system-spec/maintenance-ops.md](../system-spec/maintenance-ops.md) (sha256: `0329c87bf2e5be42…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`system-spec/completeness-report.json`)
- 再取込日時: 2026-07-30T04:40:19Z / plugin: system-spec-harness v0.1.0

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

## Risks and verification

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-25 / feat-domain-model-db P13)**

- **最小権限リスク**: 2026-07-25 時点では `CLOUDFLARE_API_TOKEN` を Workers deploy と R2 write で共用していた。2026-07-29 に repository 内の参照分離を実装し、外部環境での token 発行・投入・拒否確認・workflow 完走は `issue-ci-token-least-privilege-20260725` (`HarnessHub-bda4`) で継続追跡する。
- **未検証境界**: 更新版 `backup.yml` の成功と、main 上の `ci.yml` が migration → deploy → health → smoke を完走することは landing 後の GitHub Actions 実走待ち。追跡: `issue-actions-secrets-missing-20260725` (`HarnessHub-fnzl`)。
- **検証済み**: 本番 Turso 18 table / 12 index、D1 hedge 同一断面、R2 往復、スモーク 6/6、restore drill 2 段、rollback 3 分岐 (deploy 未成功 / rollback 成功 / rollback 失敗)。証跡は [docs/features/feat-domain-model-db/release-record.md](../docs/features/feat-domain-model-db/release-record.md)。

**差分追記 (2026-07-28 / `HarnessHub-vns9`)**

- **未検証境界の更新**: `HarnessHub-fnzl` 由来の secret / variable 投入は完了し `check-actions-secrets.mjs --live` が exit 0 (台帳 9 件 = workflow 参照 9 件)。`ci.yml` の完走は run `30143422049` で達成済み。**残るのは `backup.yml` の成功のみ**で、是正版が main へ land した後の `workflow_dispatch` 実走待ち。
- **観測経路の欠落 (2026-07-29 更新)**: 3 夜連続失敗が無音だった原因に対し、backup 専用 heartbeat、required secret、workflow 前提確認、限定適用 CLI をローカル実装した。外部適用・secret 投入・main 成功 run・着信実測は未完了であり、運用上の欠落が閉じたとはまだ数えない。追跡: `issue-backup-failure-undetected-20260728` (`HarnessHub-dbx6`)。

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
