---
status: confirmed
layer: feature-design
---

# アーキテクチャ決定 — feat-post-signin-scope-routing

> P02 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-02-architecture.md`
> 前提: [requirements-baseline.md](./requirements-baseline.md) の Scope in / Quality constraints / cross-feature 境界を満たすこと。

本 feature は「新機能の追加」ではなく「既存実装同士の配線修正」である。そのため各決定は、**既存の `authorize()` の判定順・role 判定・deny-by-default の枠組みに触れずに、入力だけを増やす** ことを最優先の制約として選定した。

## 決定1: scope 解決の合流点の位置

**決定:** 合流点を `apps/hub/src/middleware/authz.ts` の `authorize()` 内、既存の `resolveRequestedScope(pathname, headers)` 呼び出し直後・tenant/workspace 判定分岐の直前に置く。ここで明示ヘッダー由来の scope と、新設する session 由来の scope（決定2で定義）をマージしてから、既存の `scope.tenantId === null → missing_tenant_scope` 等の判定へ渡す。

**根拠:** `authorize()` の判定順「public判定→認証→スコープ一意性→tenant一致→workspace所属」は quality constraint により変更禁止。scope 解決の「入力を集める」フェーズと「判定を下す」フェーズはこの関数内で既に分離されており、合流点を入力集約フェーズの末尾に置けば判定順そのものには一切手を入れずに済む。

**却下案:**
- 案A「`apps/hub/src/middleware/scope.ts` の `resolveRequestedScope()` 自体を拡張し、session 情報を第3引数で受け取る」→ 却下。`middleware/scope.ts` は P05 の Write scope（`apps/hub/src/lib/authz/resource.ts`, `types.ts`, `middleware/authz.ts`, `lib/auth/session.ts`, `lib/routing/post-signin-landing.ts`, `tenant-oidc-signin-form.tsx`, `page.tsx`）に含まれておらず、境界を越える。
- 案B「`apps/hub/src/middleware.ts`（エントリファイル）側で事前にヘッダーへ合成してから `authorize()` へ渡す（既存の cwv probe と同じパターン）」→ 却下。`middleware.ts` も P05 の Write scope 外であり、かつ既存の cwv probe パターンは「不一致検出（ambiguous_scope）」を行わない単純上書きのため、要件の「両方あって不一致なら拒否」を満たせない。

## 決定2: 入出力契約 — session 由来 scope の解決関数

**決定:** `apps/hub/src/lib/authz/resource.ts` に `resolveSessionScope(principal: Principal | null, cookieHeader: string | null): RequestedScope | null` を新設する。

- `principal === null` なら `null` を返す（未認証は既存の認証チェックで先に弾かれるため到達しない想定だが、fail-closed のため明示的に null を返す）。
- `apps/hub/src/lib/auth/session.ts` に新設する `resolveActiveWorkspaceId(cookieHeader, principal.workspaceIds)`（決定5で定義）を呼び、active workspace が確定した場合のみ `{ tenantId: principal.tenantId, workspaceId }` を返す。確定しない場合は `null` を返す（= session 系統は「存在しない」として扱う）。

`authorize()` 側は、明示ヘッダー由来 scope（`explicit`）と session 由来 scope（`session`）を次の規則でマージする。

| explicit | session | 結果 |
|---|---|---|
| あり | あり・一致 | explicit を採用 |
| あり | あり・不一致 | `ambiguous_scope` |
| あり | なし | explicit を採用 |
| なし | あり | session を採用 |
| なし | なし | `{tenantId: null, workspaceId: null}`（既存どおり `missing_tenant_scope` へ） |

**根拠:** `Principal` 型（`shared/auth/index.ts`）と `SessionClaims` 型（`@harness-hub/schemas`）はどちらも P05 の Write scope 外であるため変更できない。両方に触れずに session 由来 scope を得るには、既存の検証済み `Principal.workspaceIds`（所属一覧）と、新設する軽量な cookie（active workspace の「選択状態」のみを表す）を突き合わせる方式が唯一 scope 内で完結する。

**却下案:**
- 案A「JWT session claims に `activeWorkspaceId` を直接追加する」→ ユーザー確認で一度は選ばれた方針だが、`SessionClaims` 型の定義元 `@harness-hub/schemas` が P05 の Write scope に含まれないことが判明したため、本 task では採用しない。P05 実装時にこの制約を再確認し、scope 内で完結する代替（本決定の cookie 方式）へ切り替える。
- 案B「`authorize()` を async化し、cookie から session token を再検証してテナント/ワークスペースを都度導出する」→ 却下。`authorize()` の呼び出し元 `middleware.ts` は既に principal 解決を完了済みであり、二重に session token を検証するのは冗長かつ secret の受け渡し経路が Write scope 外のファイルに波及する。

## 決定3: 既定着地の単一定数化

**決定:** `apps/hub/src/lib/routing/post-signin-landing.ts`（新設）に `export const DEFAULT_POST_SIGNIN_LANDING = '/sheets'` を1箇所だけ定義する。`apps/hub/src/app/page.tsx`（認証済み redirect）と `tenant-oidc-signin-form.tsx`（戻り先解決）はこの定数を import して使う。

**根拠:** quality constraint `post-signin-landing-resolution-single-default-constant` により複数箇所への重複定義を禁止されている。

**却下案:**
- 案「各画面が個別に `'/sheets'` をハードコードする」→ 却下。画面追加のたびに既定着地がずれるリスクがあり、quality constraint に反する。

## 決定4: 同一 origin 相対 path 制限（open redirect 防止）の実装方式

**決定:** `post-signin-landing.ts` に `resolvePostSigninLanding(returnTo: string | null | undefined): string` を実装する。検証は文字列の前方一致（`startsWith('/')` 等）だけに頼らず、`new URL(returnTo, 'http://harnesshub-internal.invalid')` でパースし、結果の `origin` が基準 origin と一致する場合のみ `returnTo` をそのまま返す。不一致・パース失敗時は `DEFAULT_POST_SIGNIN_LANDING` を返す。

**根拠:** `//evil.com`（protocol-relative）や `\/\/evil.com`、制御文字を混ぜたトリックは単純な文字列前方一致では見逃す場合があるが、`URL` パーサーに base を与えてパースする方式なら、ブラウザの URL 正規化ルールに準拠した判定になり、既知の open redirect バイパス手法に対して頑健。

**却下案:**
- 案「`returnTo.startsWith('/') && !returnTo.startsWith('//')` の文字列チェックのみ」→ 却下。バックスラッシュを使ったトリック（`/\evil.com`）や制御文字混入など、ブラウザの URL 解釈の揺れを文字列チェックだけでは網羅できない。
- 案「許可 path のホワイトリストを持つ」→ 却下。業務画面が増えるたびに保守が必要になり、quality constraint の「既定着地の単一定数化」というシンプルな設計方針とも整合しない。

## 決定5: session への active workspace 束縛と、切替のたびの所属再検証のタイミング

**決定:** `apps/hub/src/lib/auth/session.ts` に軽量 cookie `ACTIVE_WORKSPACE_COOKIE_NAME = 'hh_active_workspace'` と関数 `resolveActiveWorkspaceId(cookieHeader: string | null, memberWorkspaceIds: readonly string[]): string | null` を追加する。

- cookie に値があれば、`memberWorkspaceIds.includes(value)` を **毎リクエスト** 検査する。含まれなければ `null`（束縛しない。直前の値へフォールバックしない = fail-closed）。
- cookie が未設定の場合、`memberWorkspaceIds.length === 1` のときだけ自動的にその1件を採用する（選択の余地がないため）。2件以上あるときは `null`（未確定。workspace 選択 UI は feat-workspace-switch-ux の scope）。

この cookie は「どの workspace を選んだか」という利用者の意思表示に過ぎず、認可上の正当性は毎回 `Principal.workspaceIds`（session 検証済みの所属一覧）に対して再検証するため、cookie 自体に署名は不要（改ざんされても所属外なら弾かれる）。

**根拠:** 「切替のたびの所属再検証」を満たすには、cookie 値を信頼せず毎リクエスト所属集合と突き合わせる必要がある。署名済み JWT を都度発行し直す方式より実装コストが低く、かつ P05 の Write scope（`session.ts`）内で完結する。

**却下案:**
- 案「active workspace を server 側セッションストア（DB/KV）に保持する」→ 却下。本 feature は新規データストアを設けない前提（requirements-baseline.md Scope out）であり、既存 session（stateless JWT）の枠組みを維持する方が影響範囲が小さい。
- 案「所属を外れた場合、直前の正当な workspace へ自動フォールバックする」→ 却下。deny-by-default の思想（疑わしきは拒否）に反する。所属を外れたら明示的に未確定状態へ落とし、再選択を促すのが安全。

## 決定サマリー表

| # | 決定 | 配置ファイル |
|---|---|---|
| 1 | 合流点 = `authorize()` 内の scope 収集フェーズ末尾 | `middleware/authz.ts` |
| 2 | `resolveSessionScope()` 新設、merge ルールは表のとおり | `lib/authz/resource.ts` |
| 3 | `DEFAULT_POST_SIGNIN_LANDING` 単一定数 | `lib/routing/post-signin-landing.ts`（新設） |
| 4 | `new URL(..., base).origin` 一致判定 | `lib/routing/post-signin-landing.ts`（新設） |
| 5 | `resolveActiveWorkspaceId()`、cookie は毎リクエスト所属再検証、フォールバック無し | `lib/auth/session.ts` |
