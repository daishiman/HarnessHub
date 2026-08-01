---
status: confirmed
layer: feature-evidence
beads_ids:
  - HarnessHub-15h
  - HarnessHub-15h.5
  - HarnessHub-15h.13
  - HarnessHub-k3n6
  - HarnessHub-b7ng
  - HarnessHub-mr3c
  - HarnessHub-v22l
dev_graph_node_id: issue-auth-tenancy-production-adapter-20260725
dev_graph_node_ids:
  - feat-auth-tenancy
  - SYS-AUTH-TENANCY-P05
  - SYS-AUTH-TENANCY-P13
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
| request handling | 未認証 Auth.js POST の本文を全量展開せず stream のまま正規 origin へ渡す |
| write scope | ローカル DB だけを process 内直列化し、Workers の要求間で I/O Promise を共有しない |

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
| `qa-086` | database | schema・migration と実行環境別 write scope の自己完結した統合契約 |

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

最終レビューで、未認証 Auth.js endpoint の本文全量バッファと、module scope の
書き込み待ち Promise を Workers の要求間で共有し得る点を修正した。
Auth.js の Request は body stream を維持し、DB adapter は
`process-local` / `request-bound` を型で必須化した。前者だけを直列化し、
後者は DB の排他・CAS と競合再試行へ委ねる。

## 5. migration と運用上の注意

`0001_auth-tenancy-device-flow-contract.sql` は、既存の
`publisher_tokens` と `device_authorizations` を作り直す破壊的 migration である。
既存 refresh token / device code は引き継がず、利用者に再認証を求める。
先に schema を移行し、その後 Worker を配信する。ロールバック時も旧 schema へ戻さず、
新 schema を理解する Worker version へ戻す。

必要な認証設定:

- Secret: `AUTH_SESSION_SECRET`, `AUTH_ACCESS_TOKEN_SECRET`,
  `TURSO_AUTH_TOKEN`, `ENCRYPTION_KEK`
- var: `AUTH_ALLOWED_ORIGINS`, `AUTH_DEVICE_VERIFICATION_URI`,
  `AUTH_CANONICAL_ORIGIN`, `TURSO_DATABASE_URL`

## 6. 反映検証

仕様 writer と dev-graph writer の決定論的検査:

- system-spec coverage: complete/foundation ともに pass
- source citation validation: pass
- system-spec compile: pass（12 成果物生成）
- dev-graph schema validation: pass
- task specification quality gate: pass（13 phase、違反 0、digest `98fd3cc3…`）

実装ゲート:

- Auth.js handler、DB ports、Device Flow の対象テスト: 50 cases pass
- write conflict / write scope の集中テスト: 4 cases pass
- DB 全 test: 70 cases pass（schema、migration lineage、write conflict / scope を含む）
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
- `HarnessHub-v22l`: refresh rotation の CAS 敗北を監査可能にする（第 9 節で完了）

これらは今回の Auth.js・本番 ports 結線を無効にする欠陥ではないが、
ローカル DB の耐障害性と Workers 上の観測性を強化する後続作業である。

## 9. 追補: HarnessHub-v22l（refresh rotation の CAS 敗北を監査可能にする）

### 9.1 受領対象

第 8 節の残課題のうち `HarnessHub-v22l` を完了した。`revokeIfActive` の CAS
（compare-and-swap＝比較して一致した場合だけ更新する排他制御）敗北、すなわち
同時提示された refresh token のうち勝者以外の枝を、監査 action
`token.refresh_race` として記録する。

- Beads ID: `HarnessHub-v22l`
- dev-graph node ID: `issue-refresh-race-observability-20260726`
- 対象 branch: `devgraph/issue-refresh-race-observability-20260726`

### 9.2 仕様・設計影響の判定

判定は **not_reflected（仕様反映不要）**。理由は次の 3 点である。

1. `system-spec/security.md` qa-075 が確定する外部契約・振る舞い（CAS 敗北時は
   `invalid_grant` を返し、その瞬間に family 失効へ昇格しない）を一切変更しない。
   今回追加したのは「その事象が起きたこと」を監査ログへ 1 行残す内部観測性だけであり、
   client から見える応答もデータベースの schema も変わらない。
2. `token.refresh_race` は `token.reuse_detected`（失効済み token の再提示という
   確定的な窃取シグナル）とは意味が異なる別 action として追加した。既存 action の
   置換・拡張ではないため、qa-075 が確定した「昇格させない」という判断そのものを
   変えるものではない。
3. 監査 action 語彙の正本はそもそも `docs/backend-spec.md` §3.8 と
   `docs/security-spec-data-integrity.md` §5.2 であり、`system-spec/` は個々の
   action 名の完全列挙を正本としていない。下流の詳細を上流へ逆輸入して二重正本に
   しない（qa-066 の原則）ため、`system-spec/`・`specs/`・`architecture/` への反映は
   不要と判断した。

### 9.3 変更内容

- `apps/hub/src/lib/auth/device-flow/service.ts`: CAS 敗北分岐に
  `token.refresh_race` 監査記録を追加
- `docs/backend-spec.md` §3.8、`docs/security-spec-data-integrity.md` §5.2:
  action 語彙表へ 1 行追加
- `docs/features/feat-auth-tenancy/runbook.md`: §2.5.1
  「`token.refresh_race` との切り分け」を追加
- `apps/hub/tests/auth-tenancy/db-ports-integration.test.ts`: CAS 敗北を強制し
  監査記録が 1 行残ることを検証するテストケースを追加

### 9.4 反映検証

- vitest（auth-tenancy 統合テストを含む全 309 cases、1 skip）: pass
- typecheck: pass
- lint: pass

### 9.5 500 行超の扱い

`token.refresh_race` 監査記録の追加で `apps/hub/src/lib/auth/device-flow/service.ts`
が 507 行になった。`normalizeUserCode`・polling 間隔調整
（`nextPollIntervalSeconds` / `relaxedPollIntervalSeconds`）・一覧表示用の
`toSummary` という、DB / clock に依存しない純粋変換関数だけを
`device-flow/transforms.ts`（78 行）へ分離し、`service.ts` を 436 行にした。
`normalizeUserCode` は `device-flow/index.ts`・`auth/index.ts` から再 export
されている公開 API のため、`service.ts` からも re-export し既存の import 経路を
壊さないようにした。

### 9.6 残課題

第 8 節の残課題から `HarnessHub-v22l` を除く。残り 2 件（`HarnessHub-mb7c`、
`HarnessHub-njkm`）は本追補の対象外のまま残る。

## 10. 追補: 2026-07-28 最終レビューと本番認証導線

### 10.1 受領対象

`HarnessHub-15h` の最終レビューとして、P05 のサインイン・Device Flow 導線と、
P13 の本番設定手順を再確認した。`HarnessHub-k3n6` では
`AUTH_DEVICE_VERIFICATION_URI` が指す `/device` 承認画面を追加している。

- Beads ID: `HarnessHub-15h` / `HarnessHub-15h.5` / `HarnessHub-15h.13` /
  `HarnessHub-k3n6`
- dev-graph node ID: `feat-auth-tenancy` / `SYS-AUTH-TENANCY-P05` /
  `SYS-AUTH-TENANCY-P13`
- 対象 branch: `devgraph/feat-auth-tenancy-rollup-20260728`

### 10.2 仕様・設計影響の判定

判定は **not_reflected（新たな仕様反映不要）**。今回の変更は、すでに正規フローで
確定・反映済みの契約を実装と運用手順へ接地するもので、新しい仕様判断を追加しない。

| 照合した正本 | 今回の実装との対応 |
| --- | --- |
| `system-spec/auth.md` qa-074 | サインイン先を既存契約 `/api/auth/{tenant_slug}/{action}` と一致させた |
| `system-spec/backend.md` qa-082 | 既存の `POST /api/v1/device/approve` を承認画面から利用する |
| `system-spec/security.md` qa-075 / qa-036 | 承認 API に加え、画面表示時も既存の緊急失効判定を再利用する |
| `system-spec/infrastructure.md` qa-084 | 既存変数 `AUTH_DEVICE_VERIFICATION_URI` の設定例を `/device` へ具体化した |
| `specs/harness-hub-system-specification.md` | 上記確定章への参照と実装反映の関係に変更はない |
| `architecture/harness-hub-backend.md` / `harness-hub-security.md` / `harness-hub-infrastructure.md` | adapter 境界、deny-by-default、環境 binding の既存判断に従っている |

API の request/response、DB schema、role、数値契約、Secret の分類、trust boundary
（信頼境界＝どこまでを信用するかの境目）は変更していない。`/device` は
`AUTH_DEVICE_VERIFICATION_URI` という既存の設定可能な絶対 URL の現行配備先であり、
system-spec に固定 path を追加する契約変更ではない。

このため `system-spec/` の writer と compile は起動しない。新しい確定回答が無いのに
生成物を更新すると、同じ契約を二重管理するためである。`system-spec/`・`specs/`・
`architecture/` は差分なしとし、本節を影響なしの受領記録とする。

### 10.3 実装・文書反映

- サインイン form action を tenant path の Auth.js handler 契約へ一致させた。
- `/device` に確認コード入力、Workspace 選択、状態別の安全なエラー表示を追加した。
- 画面表示でも session の緊急失効を確認し、失効済み利用者へ Workspace を表示しない。
- middleware は `/device` だけを公開し、`/device/*` と承認 API は認証必須のままにした。
- `production-auth-manual-setup.md` と OIDC onboarding / release 記録へ、
  Secret・通常変数・OIDC 接続・スモークテストの未実施境界を記録した。
- feature / P05 / P13 の投影文書へ本受領書と実行状態を追記した。

### 10.4 検証と残る境界

- task spec validator: pass（13 phase、violations 0）
- 集中テスト: 4 files / 33 cases pass
- auth-tenancy: 23 files / 310 cases pass
- hub 全体: 44 files / 508 cases pass、coverage 4 指標 90% 以上
- hub typecheck / lint: pass
- Next.js / OpenNext Workers build: pass
- Worker bundle: gzip 1.075 MiB / 3 MiB、`/device` client bundle: 107.7 KiB / 120 KiB
- doc line limit（上限 300 行）/ artifact placement: pass

本番 Secret・通常変数・2 テナント分の OIDC 資格情報投入、デプロイ、
本番 Device Flow / 2 テナントログインのスモークは未実施である。
したがって `HarnessHub-15h.13` は `in_progress` のまま維持する。
