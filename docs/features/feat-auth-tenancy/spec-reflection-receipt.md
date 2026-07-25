---
status: confirmed
layer: feature-evidence
beads_ids:
  - HarnessHub-b7ng
  - HarnessHub-mr3c
dev_graph_node_id: issue-auth-tenancy-production-adapter-20260725
spec_impact: reflected
reflected_at: 2026-07-26
---

# Auth.js・本番認証 adapter 仕様反映受領書

## 1. 受領対象

`HarnessHub-b7ng` で、初回 feature 完了時には 501 応答だった Auth.js route と、
in-memory 実装だけだった `AuthPorts` を本番 DB へ結線した。
最終レビューでは同時要求とテナント分離の競合も再点検し、仕様・設計への影響を
「あり」と判定した。

- Beads ID: `HarnessHub-b7ng`
- dev-graph node ID: `issue-auth-tenancy-production-adapter-20260725`
- documentation drift: `HarnessHub-mr3c`
- 対象 branch: `devgraph/issue-auth-tenancy-production-adapter-20260725`

## 2. 仕様・設計影響の判定

判定は **reflected（仕様反映あり）**。
単なる内部整理ではなく、次の外部契約とデータ契約が変わるためである。

| 影響 | 反映した契約 |
|---|---|
| 認証 URL | `/api/auth/{tenant_slug}/{action}` でテナントを path に保持する |
| session | Auth.js cookie と認可 middleware が同じ `SessionClaims` JWT を使う |
| secret | session と Publisher access token の署名鍵を用途分離する |
| DB | `publisher_tokens.workspace_id`、Device Flow の scope・試行回数・poll 状態を永続化する |
| concurrency | approve・consume・user-code 失敗回数・refresh rotation を CAS で競合拒否する |
| tenant isolation | `user_workspaces` の主キーへ `tenant_id` を含め、同じ user/workspace ID をテナント間で許す |
| runtime | Secret・DB binding 値が変わった場合は isolate 内キャッシュを再構築する |

## 3. 正規フローによる反映

`system-spec/spec-state.json` の確定質疑を writer で更新し、手編集ではなく compile で
`system-spec/` を再生成した。

| 確定質疑 | 章 | 内容 |
|---|---|---|
| `qa-074` | auth | Auth.js route、session bridge、canonical origin、JIT、署名鍵分離 |
| `qa-075` | security | CAS、refresh race の境界、Secret 更新時の runtime 再生成 |
| `qa-082` | backend | 本番 composition root と DB ports |
| `qa-083` | database | schema・migration・guarded write |
| `qa-084` | infrastructure | Workers Secret/var と migration rollout |

反映先:

- `system-spec/auth.md`
- `system-spec/security.md`
- `system-spec/backend.md`
- `system-spec/database.md`
- `system-spec/infrastructure.md`
- `system-spec/spec-state.json`
- `specs/harness-hub-system-specification.md`
- `architecture/harness-hub-backend.md`
- `architecture/harness-hub-data.md`
- `architecture/harness-hub-security.md`
- `architecture/harness-hub-infrastructure.md`
- `features/feat-auth-tenancy.md`
- `tasks/feat-auth-tenancy/sys-auth-tenancy-p11.md`
- `docs/backend-spec.md`
- `docs/security-spec.md` と責務別 6 分冊
- `docs/infrastructure-spec.md`
- `docs/features/feat-auth-tenancy/` の履歴・受入・リリース証跡

## 4. 実装と安全性

認証の vendor 依存は `apps/hub/src/lib/auth/adapter/` 内だけに置き、
route へは Web 標準の `(Request) => Promise<Response>` だけを公開した。
OIDC client secret は DB で封筒暗号化された値を必要時だけ復号し、
未登録・停止中テナントを既定 provider へフォールバックさせない。

Device Flow は状態と `attempts` を一緒に比較する CAS を採用した。
これにより、同じ user code への 5 本の同時失敗を取りこぼさず、
approve と consume の競合で二重発行を作らない。
refresh token も active 行だけを CAS 失効してから次の枝を発行する。

## 5. migration と運用上の注意

`0001_auth-tenancy-device-flow-contract.sql` は、既存の
`publisher_tokens` と `device_authorizations` を作り直す破壊的 migration である。
既存 refresh token / device code は引き継がず、利用者に再認証を求める。
先に schema を移行し、その後 Worker を配信する。ロールバック時も旧 schema へ戻さず、
新 schema を理解する Worker version へ戻す。

必要な認証設定:

- Secret: `AUTH_SESSION_SECRET`, `AUTH_ACCESS_TOKEN_SECRET`,
  `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ENCRYPTION_KEK`
- var: `AUTH_ALLOWED_ORIGINS`, `AUTH_DEVICE_VERIFICATION_URI`,
  `AUTH_CANONICAL_ORIGIN`

## 6. 反映検証

仕様 writer と dev-graph writer の決定論的検査:

- system-spec coverage: complete/foundation ともに pass
- source citation validation: pass
- system-spec compile: pass（11 成果物生成）
- dev-graph schema validation: pass
- task specification quality gate: pass（13 phase、違反 0、digest `98fd3cc3…`）

実装ゲート:

- Auth.js handler、DB ports、Device Flow の対象テスト: 50 cases pass
- DB 全 test: 68 cases pass（schema、migration lineage、write conflict を含む）
- hub 全 test: 288 cases pass、全 workspace test pass
- typecheck、Next build、OpenNext Workers build: pass
- repository 全体 `pnpm verify`: pass
- Worker bundle: gzip 1.141 MiB / 予算 3 MiB

## 7. 500 行超の扱い

今回編集した手書き TypeScript のうち 500 行を超えた Device Flow service は、
型契約を `device-flow/contracts.ts` へ分離して `service.ts` を 496 行にした。
609 行だった Device Flow test も発行・承認と token lifecycle に分け、
共有 harness を独立させた（305 / 258 / 64 行）。
910 行だった `docs/security-spec.md` は旧節番号を維持した索引と、
foundation / authentication / authorization / data-integrity /
request-controls / assurance の 6 分冊へ分け、全分冊を 300 行以下にした。
これにより line-limit allowlist から `docs/security-spec.md` を除外した。
`graph.json`、migration snapshot、lockfile、system-spec state は各 writer/tool の
機械生成物なので人手分割しない。新規受領書も独立ファイルにした。

## 8. 残課題

本変更の受入を偽って広げないため、次を別 Beads として残す。

- `HarnessHub-mb7c`: 残る DB write を `guardedWrite` へ統一し CI で検査する
- `HarnessHub-njkm`: プロセス外 `SQLITE_BUSY` 後の接続復旧または fail-fast
- `HarnessHub-v22l`: refresh rotation の CAS 敗北を監査可能にする

これらは今回の Auth.js・本番 ports 結線を無効にする欠陥ではないが、
ローカル DB の耐障害性と Workers 上の観測性を強化する後続作業である。
