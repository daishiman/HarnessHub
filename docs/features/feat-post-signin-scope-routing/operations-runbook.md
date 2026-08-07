---
status: confirmed
layer: feature-operations
---

# 運用 Runbook — feat-post-signin-scope-routing

> P12 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-12-documentation-operations.md`
> 目的: サインイン後に業務画面 (`/sheets` 等) へ到達できない、または想定外の画面に飛ばされるという申告を受けた際の一次切り分け手順を固定する。実装根拠: `apps/hub/src/middleware/authz.ts`, `apps/hub/src/lib/authz/resource.ts`, `apps/hub/src/lib/auth/session.ts`, `apps/hub/src/lib/routing/post-signin-landing.ts`。

## 前提: authorize() の判定順と reason (`apps/hub/src/middleware/authz.ts`)

判定は上から順に評価し、該当した時点で確定する (fail-closed、途中で許可側へフォールバックしない)。

1. public path 判定 (`isPublicPath`) → 該当すれば常に許可
2. 認証 → 未認証なら `unauthenticated` (401)
3. スコープ一意性 (`ambiguous_scope`) → 明示ヘッダーと session の workspace が食い違う場合に 403
4. tenant 一致 → スコープ未申告 (`missing_tenant_scope`) は 403、他テナント (`tenant_mismatch`) は **404** (T-ISO-06 存在秘匿: 403 だと「その ID の資源が他テナントに在る」ことが応答から伝わるため。route 層の `denyStatusFor` と middleware の両方で 404 に揃える)
5. workspace 所属 → 申告した workspace に principal が所属していない (`workspace_not_member`) で 403

## 一次切り分け: 3 分岐

申告 (「業務画面に入れない」「変な画面に飛ばされる」) を受けたら、まず HTTP status とレスポンスの `reason` (アプリログまたはネットワークタブで確認) を見て、次の 3 分岐のどれかへ振り分ける。**ただし分岐の手前で必ず「分岐 0」を通す。**

### 分岐 0 (最初に必ず確認): 見ている本番は、直したコードが動いている版か

- **なぜ最初に見るか**: Cloudflare Workers は **version (アップロードされた版)** と **deployment (実際に配信される版)** が別概念で、`wrangler deploy` が成功しても配信が入れ替わらない状態が成立する。この状態では、コードを直して merge しても本番の挙動が一切変わらないため、下の分岐 A〜C をいくら追っても原因に到達しない。2026-08-07 に実際に踏んだ (8/4 の失敗時 rollback で固定された版 `2e4a6c5b` が 2 run 連続で配信され続け、修正済みの `tenant_mismatch → 404` が「直っていない」ように見えた)。
- **確認手順**:
  1. `curl -s "$HUB_HEALTH_URL" | jq -r .version` で **いま配信されている version** を得る (この値は `CF_VERSION_METADATA` binding 由来なので、ビルド時に埋め込んだ文字列と違い rollback 後も嘘をつかない)。
  2. 対象の CI run の `wrangler deploy` step のログから `Current Version ID` を読む。
  3. 両者が一致しない場合、**本番は旧コードで動いている**。分岐 A〜C の切り分けには進まない。
- **対応**: `pnpm --filter @harness-hub/hub exec wrangler deployments list` / `versions list` で現在の deployment を確認し、意図した version へ deployment を昇格させる。この不一致は CI の「配信版が今デプロイした版であることの検査」step が fail-closed で検出するため、通常は smoke より前に赤で止まる (`docs/infrastructure-spec.md` §7)。

### 分岐 A: 未認証 (`unauthenticated`, 401)

- **症状**: 業務画面 (`/sheets` 等) へのアクセスが 401、またはサインイン画面へ差し戻される。
- **原因**: session cookie が無い、または session token が失効・不正 (`verifySessionToken` が `malformed` / `bad_signature` / `bad_claims` / `expired` のいずれかを返した)。
- **確認手順**:
  1. ブラウザの Cookie に session cookie が存在するか確認する。
  2. 存在する場合、`AUTH_NUMERIC_CONTRACT.sessionMaxAgeSeconds` (`apps/hub/src/lib/auth/config.ts`) を超えて経過していないか、session の `iat` から算出する。
  3. サインインをやり直させ、`/api/auth` 経路 (public path) でエラーが出ていないか確認する。
- **対応**: 通常は再サインインで解消する。再サインイン後も同じ結果が続く場合は IdP 側の設定 (tenant 別 OIDC) の疑いがあるため feat-auth-tenancy 側の runbook へ引き継ぐ。

### 分岐 B: scope 未解決・二重申告 (`missing_tenant_scope` / `ambiguous_scope`, 403)

- **症状**: 認証は通っている (401 ではなく 403) が、業務画面へ到達できない。
- **原因**: `missing_tenant_scope` は明示ヘッダーにも session にも tenant/workspace の申告が無い状態。`ambiguous_scope` は明示ヘッダーの `workspaceId` と session の active workspace が異なる値を同時に申告している状態 (`mergeScopes()` の二重申告検出)。
- **確認手順**:
  1. reason が `missing_tenant_scope` の場合: session に active workspace が束縛されているか確認する。`resolveActiveWorkspaceId()` (`apps/hub/src/lib/auth/session.ts`) は cookie 由来の workspace を所属一覧で毎回再検証しており、所属が複数ある状態で cookie が無い場合は `null` (未確定) を返す仕様であるため、これは想定内の deny であり bug ではない。利用者に workspace 選択操作を案内する。
  2. reason が `ambiguous_scope` の場合: 明示ヘッダー (`x-harness-tenant-id` / `x-harness-workspace-id`) を送るクライアント (API・機械クライアント) が、session の active workspace と異なる workspace を指定していないか確認する。ブラウザの通常遷移でこの reason が出た場合は、リクエストに意図しない明示ヘッダーが混入していないか (プロキシ・拡張機能等) を疑う。
- **対応**: 想定内の deny であるため実装を疑う前に利用者の操作 (workspace 未選択・複数申告) を確認する。issue 化する場合は、実際に単一の正しい workspace のみを申告しているにも関わらず deny された再現手順が必須。

### 分岐 C: 所属なし・越境 (`tenant_mismatch` は 404 / `workspace_not_member` は 403)

- **症状**: 認証も scope 申告もできているが、特定の tenant/workspace への到達だけ拒否される。越境の場合、資源が存在しないかのように 404 が返る (存在秘匿)。
- **原因**: `tenant_mismatch` は申告した `tenantId` が principal 自身の `tenantId` と異なる (越境)。`workspace_not_member` は申告した `workspaceId` に principal が所属していない。
- **確認手順**:
  1. reason が `tenant_mismatch` の場合: 利用者がブックマーク等で別テナントの URL を開いていないか確認する。正当な tenant 変更 (異動等) であれば、Workspace 管理者にディレクトリ側の所属更新を依頼する。
  2. reason が `workspace_not_member` の場合: 申告した workspace への所属が実際にあるか、Workspace 管理者にディレクトリ側の所属一覧で確認してもらう。所属追加直後であれば session が古い所属情報のまま (`shouldRefreshSession()` の `updateAge` 未経過) の可能性があるため、再サインインで解消するか確認する。
- **対応**: 所属変更が正しく反映されているかはディレクトリ側 (Directory/IdP) が正本であり、Hub 側の authz 層はそれを再検証しているに過ぎない。ディレクトリ側の反映を確認してから再現するか判断する。

## 着地先が想定外の画面になる場合 (open redirect 防止の副作用)

- **通常の解決順**: サインイン開始時の `returnTo` が同一 origin の相対 path ならその path、無いまたは無効なら既定着地 `/sheets` を使う。`/` 自体は未認証時に稼働確認を表示し、認証済み session がある場合だけ `/sheets` へ redirect する。
- **症状**: サインイン後、期待した戻り先ではなく既定着地 (`/sheets`) へ飛ばされる。
- **原因**: `resolvePostSigninLanding()` (`apps/hub/src/lib/routing/post-signin-landing.ts`) は同一 origin の相対 path 以外の戻り先を全て既定着地へフォールバックする (絶対 URL・スキーム付き・protocol-relative・バックスラッシュトリック・資格情報付き URL を含む)。これは bug ではなく open redirect 防止の設計上の挙動。
- **確認手順**: 戻り先として渡された値が `/` から始まる相対 path かどうかを確認する。外部リンクや旧 URL からの遷移で絶対 URL 形式の戻り先が渡されていないか確認する。
- **対応**: 呼び出し元 (戻り先を組み立てる箇所) を同一 origin の相対 path に修正する。フォールバック自体を緩めない (`quality-assurance-record.md` 検査2で fail-closed であることを実測済み)。

## スコープ外の確認

- 本 runbook は一次切り分けまでを扱う。tenant/workspace の所属変更そのもの (ディレクトリ側の操作) は本 feature の scope 外であり、対象の管理画面・運用手順に従う。
- IdP 設定 (tenant 別 OIDC) の障害切り分けは feat-auth-tenancy 側の runbook を参照する (本 feature は認可判定のみを扱う)。
