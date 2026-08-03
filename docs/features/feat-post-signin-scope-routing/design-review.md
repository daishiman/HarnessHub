# 設計レビュー — feat-post-signin-scope-routing

> P03 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-03-design-review.md`
> 審査対象: [architecture-decision.md](./architecture-decision.md)（P02 の5決定）

本 feature は認可（アクセス許可の判定）に触れる変更であるため、設計段階の見落としが本番の権限漏れに直結する。以下の3リスク観点で P02 の設計を審査する。

## リスク1: 認可迂回路（着地先解決が `authorize()` を経ずに画面へ到達する経路がないか）

**審査項目:** `resolvePostSigninLanding()` が返した path へ redirect した後、その path へのアクセスが通常の `authorize()` 判定をスキップしていないか。

**検証:** `resolvePostSigninLanding()`（決定4）は文字列を返すだけで、実際の画面遷移は通常の HTTP redirect（`Location` ヘッダー）経由でブラウザが再度リクエストを発行する形になる。この再リクエストは Next.js の `middleware.ts`（`config.matcher: ['/((?!_next/static|_next/image).*)']`）に必ず通り、`authorize()` の全判定を通常どおり受ける。着地先解決関数自体は認可の判定を一切代行しない「文字列を選ぶだけの純粋関数」として設計されているため、迂回路にはならない。

**結論:** 指摘なし。requirements-baseline.md の受入条件8「戻り先の解決結果に対しても authorize() が適用される」は、redirect が通常の HTTP フローを経る（＝特別な認可バイパスの仕組みを作らない）という設計そのものによって自動的に満たされる。ここを崩す変更（例: middleware をスキップする内部 rewrite の導入）は今後も禁止とする。

## リスク2: open redirect（戻り先検証が文字列前方一致だけになっていないか）

**審査項目:** protocol-relative（`//evil.com`）やバックスラッシュトリック（`/\evil.com`）など、単純な文字列前方一致では見逃されうるパターンを検出できるか。

**検証:** 決定4は `new URL(returnTo, 'http://harnesshub-internal.invalid')` でパースし、結果の `origin` が基準 origin と一致するかで判定する方式を採用している。これは文字列の前方一致（`startsWith('/')` 系）に依存しないため、`//evil.com` は `new URL()` によって `scheme://evil.com` として解釈され origin が一致せず弾かれる。`/\evil.com` も同様に、多くの URL パーサー実装（WHATWG URL 仕様準拠）でバックスラッシュがスラッシュとして正規化された上でホスト部として解釈されるため、origin 不一致で弾かれる。

**指摘（軽微、P04で検査対象化）:** `new URL()` の挙動は JavaScript ランタイム（Node.js / V8）の WHATWG URL 実装に依存する。Cloudflare Workers ランタイム（`apps/hub` のデプロイ先）でも同じ WHATWG 準拠の `URL` 実装が使われることを P04 のテスト設計で明示的に確認する（`//`, `/\`, 制御文字混入, 資格情報付きURL `http://x@evil.com` 等の具体的なテストケースとして列挙する）。

**結論:** 設計は妥当。ただし実装依存の挙動を持つため、P04 でランタイム挙動込みの境界値テストとして必ず検証する対応 phase を割り当てる。

## リスク3: deny-by-default 退行（session 由来 scope の追加で「scope 入力なし」の分岐が到達不能になっていないか）

**審査項目:** 決定2のマージ規則により、ログイン済み利用者は常に何らかの session scope を持つことになり、`missing_tenant_scope`（scope 入力が両方とも無い場合の拒否）が実質的に発生しなくなっていないか。

**検証:** 決定2・決定5の設計は、session scope が「存在する」とみなされるのは **active workspace cookie が所属検証を通過して確定した場合のみ** に限定している。cookie が無く、かつ `principal.workspaceIds` が複数（1件に自動確定できない）の場合、`resolveSessionScope()` は `null` を返し、session 系統は「存在しない」ものとして扱われる。この場合、明示ヘッダーも無ければ、マージ結果は `{tenantId: null, workspaceId: null}` となり、既存どおり `missing_tenant_scope` に到達する。

`principal.workspaceIds.length === 1` の場合は cookie 無しでも自動確定する設計（決定5）だが、これは「選択の余地がない」ケースに限定されており、複数 workspace 所属者に対する deny-by-default は保持される。

**結論:** 指摘なし。単一 workspace 所属者にとって「常に session scope が存在する」状態になるのは意図した挙動であり（それが本 feature の目的そのもの — 通常のブラウザ遷移でも到達可能にする）、複数 workspace 所属者については既存の deny-by-default が保持されることを確認した。P04 で「所属 workspace が2件以上かつ cookie 無し」のケースを明示的な回帰テストとして固定する対応 phase を割り当てる。

## 指摘一覧と対応 phase

| # | リスク | 指摘内容 | 深刻度 | 対応 phase |
|---|---|---|---|---|
| 1 | open redirect | `new URL()` のランタイム挙動を Cloudflare Workers 上で明示的に境界値テストする | 軽微 | P04（テスト設計）で `//`, `/\`, 制御文字, 資格情報付きURL のテストケースを定義し、P06 で実行する |
| 2 | deny-by-default 退行 | 複数 workspace 所属 + cookie 無しのケースを明示的な回帰テストとして固定する | 軽微 | P04（テスト設計）で回帰テストとして定義し、P06 で実行する |

未解決の重大指摘（設計そのものの差し戻しを要するもの）は **0件**。P02 の architecture-decision.md への差し戻しは不要と判断する。
