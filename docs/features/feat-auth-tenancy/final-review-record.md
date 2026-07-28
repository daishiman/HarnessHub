---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P10
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy P10 最終レビュー記録

- graph_node_id: `sys-auth-tenancy-p10`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`
- 判定対象: goal-spec の quality_constraints **7 件**
- 判定材料: P02 architecture-decision-record.md / P06 test-run-results.md / P07 acceptance-record.md / P09 quality-assurance-report.md に**実行済みとして記録された証跡のみ**

> 本 task は P02 実行者から独立した視点で最終確認する。計画中・未実行のものは充足の根拠にしない。

---

## 総括

初回レビュー (2026-07-25) は **充足 3 / 条件付き充足 4 / 未充足 0** で、条件付き 4 件の未達部分は
(1) 検査スクリプトの CI 未結線 (`HarnessHub-1f28`)、(2) Auth.js・本番 AuthPorts adapter・DB 永続化契約の
未結線 (`HarnessHub-b7ng`) に集約されていた。**両課題は closed であり、下表は 2026-07-28 の再判定である。**

| # | quality_constraint | 初回判定 | 再判定 (2026-07-28) |
| --- | --- | --- | --- |
| QC-1 | `tenant-oidc-dynamic-resolution-authjs-d3-qa005` | ⚠️ 条件付き | ✅ **充足** (動的解決 + 実依存 + DB ports 結線) |
| QC-2 | `role4-authorization-matrix-single-middleware-deny-by-default-sec2` | ✅ 充足 | ✅ 充足 |
| QC-3 | `device-flow-os-credential-token-revocation-qa008` | ✅ 充足 | ✅ 充足 (所有範囲において) |
| QC-4 | `auth-adapter-boundary-better-auth-migration-hedge-d3-qa020` | ⚠️ 条件付き | ✅ **充足** (実依存 + CI 結線 + 遮断実測) |
| QC-5 | `tenant-workspace-row-level-scope-isolation-test-ci-d4` | ⚠️ 条件付き | ✅ **充足** (名指し必須ゲート + 無効化検査) |
| QC-6 | `no-hub-native-account-idp-delegation-i7` | ⚠️ 条件付き | ✅ **充足** (CI 結線) |
| QC-7 | `session-jwt-staleness-emergency-revocation-qa036` | ✅ 充足 | ✅ 充足 |

再判定の根拠実測 (2026-07-28 最終HEAD): `pnpm check:auth` 3/3 pass (走査 127/132/132)、
`pnpm check:tenant-isolation` 12 ケース / 必須 ID 7 種、`tests/auth-tenancy` 310 ケース pass、
hub 全体 508 pass / 0 skip、`check:secrets` 走査 362 / 検出 0、
`validate-system-plan.py --feature-package feature-package/feat-auth-tenancy` status=pass / violations 0。
**遮断挙動も実測済み** (P09 §4.1): 境界違反・`it.skip` のいずれでも exit 1。

**最終判定: 7 件すべて充足。P10 の差し戻しは 0 件。**

---

## QC-1 `tenant-oidc-dynamic-resolution-authjs-d3-qa005`

**要求**: テナント別 OIDC provider を Auth.js で動的解決する (D3 / qa-005)

**判定: ✅ 充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| tenant_slug から OIDC 接続を動的に解決する構造 | ✅ | `TenantOidcConnectionPort.findByTenantSlug()` (`apps/hub/src/lib/auth/ports.ts`)。無い/無効なら `null` を返し、推測で補完しない |
| OIDC 検証契約 (issuer/aud 不一致・nonce/state 欠落・PKCE 未使用の拒否) | ✅ | `T-OIDC-01`〜`T-OIDC-18` 26 ケース pass (P06 §2) |
| テナント間の sub 混線防止 | ✅ | `(tenantId, idpSubject)` の複合キー。別テナントの同値 sub と混線しない |
| JIT provisioning の role 固定 | ✅ | `UserDirectoryPort.createFromOidc` が **role = member 固定**で作る契約。IdP の claim で role が動かない |
| Auth.js 実装との実結線 | ✅ **解消 (2026-07-26)** | `@auth/core` 0.41.3。`adapter/authjs-handler.ts` が tenant 別 `basePath: /api/auth/{tenant_slug}` で `Auth()` を駆動し、`/api/auth/[...nextauth]/route.ts` が委譲する (`HarnessHub-b7ng`) |
| 実結線の動作証跡 | ✅ | `tests/auth-tenancy/authjs-handler.test.ts` 5 ケース + `db-ports-integration.test.ts` 17 ケース pass (2026-07-28) |
| **本番 OIDC provider 登録下での 2 テナント実ログイン** | ⏳ **未実施** | 本番 provider 登録・本番デプロイ・スモークテストはいずれも **P13** の責務 (`release-record.md` R1〜R5 未実施) |

**独立レビューの所見**: 初回に不足としたのは Auth.js ライブラリとの物理的な結線であり、これは解消した。
「動的解決」の判断ロジック・検証契約・実結線・動作証跡はコードとテストの水準で揃っている。
残るのは**本番環境での実ログイン確認**のみである。

**初回に付した「未達を解消する条件」の扱い**: 初回条件は
「`next-auth` (または Better Auth) を導入し実結線したうえで、**2 テナントでの実ログインを P13 の
スモークテストで確認すること**」だった。前半は充足済みだが、後半は P10 時点では原理的に確認できない
(phase 順が P10 → P11 → P12 → P13 のため、P10 の充足条件に P13 の結果を置くと循環参照になる)。
したがって、P10 は要求名どおり「テナント別 OIDC provider を Auth.js で動的解決するコードと
実行済み証跡」を判定し、**充足**とする。本番 2 テナントの実ログインは P13 が独立して完了判定する。
これは本番確認を免除する判断ではなく、P10 と P13 の証跡を混同しないための責務分離である。

---

## QC-2 `role4-authorization-matrix-single-middleware-deny-by-default-sec2`

**要求**: role 4 種の認可マトリクスを単一ミドルウェアへ集約し、deny-by-default とする (SEC2)

**判定: ✅ 充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| role 4 種の全行網羅 | ✅ | `T-AUTHZ-01`〜`T-AUTHZ-13` の 22 ケースで、正本 37 action + 補助 5 action × role 4 種を被覆 |
| deny-by-default | ✅ | `tests/security/authz-deny-by-default.test.ts` 11 ケース pass。未知 action・用途外の資格情報は既定で拒否 |
| 単一集約 (静的検証) | ✅ | `check-single-authz-middleware.mjs` 走査 110 ファイル / 違反 0 件 / route 例外 5 件が期待集合と一致 (P09 §1 G3) |
| route が wrapper を通っているか | ✅ | 既存 `check-shared-layer-duplicates.mjs` の `unwrapped-route-handler` 走査 274 ファイル / 違反 0 件 (P09 §3) |
| 2 段構え (edge scope 門 + route 決定点) の役割分離 | ✅ | `src/middleware/` は role 語彙を一切持たない (G3 検査で機械的に保証) |

**独立レビューの所見**: 本項目のみ、**検査が「落ちること」を偶発的にではなく実際に確認できている**。
初回実行時に死んだ allowlist エントリ 2 件を検出して赤くなり、除外を削除して緑に戻した。
検査が生きていることの実証としてはこれで十分と判断する。

`role` の 4 種と `users.role` 列の 3 値の分割線 (owner は列の値ではなく `projects.owner_user_id` という**関係**)
についても、`sessionRoleSchema = z.enum(['provider-admin','workspace-admin','member'])` として
型レベルで固定されていることを確認した。

初回時点で CI 結線が無くても充足と判定した理由: 本項目の主要な保証は**テスト (`T-AUTHZ-*`)** であり、
それは既存の `pnpm --filter @harness-hub/hub test` に含まれ CI で自動実行される。
静的検査 G3 は補強であって、単独の充足条件ではない。**現在は G3 も CI 結線済み**のため、
この判断に依存せず充足する (P09 §4)。

---

## QC-3 `device-flow-os-credential-token-revocation-qa008`

**要求**: Device Flow による token 発行と、OS 資格情報域保存・token 失効導線 (qa-008)

**判定: ✅ 充足 (本 package の所有範囲において)**

| 観点 | 所有 | 判定 | 根拠 |
| --- | --- | --- | --- |
| device code 発行 / approve / token 交換 | 本 package | ✅ | `T-DEV-01`〜`T-DEV-14` 26 ケース pass |
| 短命 access token (15 分) | 本 package | ✅ | `T-SESS-01` 数値契約一致 |
| refresh rotation + family-wide reuse detection | 本 package | ✅ | `T-DEV-E2E-01` 工程 6・8 |
| 本人/管理者による失効導線 | 本 package | ✅ | `T-DEV-E2E-01` 工程 7 (`revokedCount: 1`)。冪等 (何回実行しても結果が同じ) |
| token response / revocation の公開 contract | 本 package | ✅ | `T-TOKC-01`〜`T-TOKC-04` 14 ケース pass |
| **OS 資格情報域への保存** (macOS Keychain / Windows Credential Manager) | **`feat-publisher-plugin`** | — | 本 package の所有物ではない |

**独立レビューの所見 (重要)**: 制約名に `os-credential` が含まれるため、
**本 package が Keychain 保存を実装したかのように読める。実装していない。**
本 package が提供するのは token response / rotation / revocation の公開 contract と downstream evidence key であり、
保存側の E2E 証跡は publisher package のものを相互参照する。循環依存は作らない。

P06/P07 は server-side Device Flow (`T-DEV-*`) と downstream token contract (`T-TOKC-*`) を
別 ID として分離記録しており、Normative evidence 要求を満たしている。

**リリース時の注意**: publisher token を失効させても、発行済み access token は最大 15 分間有効なまま残る
(stateless JWT の設計上の帰結)。即時遮断が必要な場合は session_revocations 経由の緊急失効を併用する。
P12 runbook.md §2 に手順を記載。

---

## QC-4 `auth-adapter-boundary-better-auth-migration-hedge-d3-qa020`

**要求**: Auth.js 依存を adapter 境界に隔離し、Better Auth への乗り換え余地を残す (D3 caveat / qa-020)

**判定: ✅ 充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| 境界外からの Auth.js 固有 API import が 0 件 | ✅ | `T-BND-01` exit 0 / 走査 **127** ファイル (2026-07-28 最終HEAD) |
| 公開入口経由の型の素通しが 0 件 | ✅ | `T-BND-02` exit 0 (到達可能性解析) |
| 検査が実際に落ちることの確認 | ✅ | 境界外 `@auth/core/types` import を投入して **exit 1** を実測 (P09 §4.1) |
| 乗り換え時に触る面が `adapter/` 4 枚に閉じている | ✅ | P08 §1.1 |
| 隔離対象が実在する状態での検査か | ✅ | `@auth/core` 0.41.3 導入済み。`adapter/authjs-handler.ts` が `Auth()` を駆動 |
| **CI での自動検査** | ✅ | `ci.yml` `static-gates` の G12 + root `pnpm check:auth` (`verify` チェーン) |

**独立レビューの所見**: 初回判定で「充足」としなかった理由は 2 つあり、両方とも解消している。
(1) qa-020 が求める「CI で機械検証」に対し、検査が手動実行でしか走っていなかった。
(2) Auth.js が未導入で、**隔離すべき対象が存在しない状態での境界検査**に過ぎなかった。

現在は `@auth/core` が実在し、その依存が `adapter/` の外へ 1 件も漏れていないことを CI が
自動で確認し、漏らせば落ちる。P09 §4.1 で遮断挙動を実測しているため、
「結線したが実質無効」という状態でもない。

なお P08 §1.2 が記録するとおり、本 feature では実装側の逸脱ではなく**検査側の穴**を是正した
(入口 1 枚しか見ていなかった → 到達可能性解析へ)。これは境界の実効性を高める方向の変更である。

---

## QC-5 `tenant-workspace-row-level-scope-isolation-test-ci-d4`

**要求**: Tenant/Workspace の row-level-scope を分離テストで保証し、CI 必須ゲート化する (D4)

**判定: ✅ 充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| 2 テナント同時稼働での行混入 0 件 | ✅ | `T-ISO-02` |
| role × action 総当たりでの越境拒否 | ✅ | `T-ISO-05` (provider-admin 以外は全 role 拒否) |
| provider-admin 越境の許可 + 監査必須 | ✅ | `T-ISO-04` (`provider.cross_tenant_access` 1 件) |
| 404 (存在秘匿) と 403 (権限不足) の区別 | ✅ | `T-ISO-06` |
| tenant 跨ぎの device_code / refresh token 流用拒否 | ✅ | `T-ISO-07` |
| **分離テストの CI 必須ゲート化** | ✅ | `ci.yml` の「G4 名指し tenant 分離テスト」+ root `pnpm check:tenant-isolation` |
| revisit トリガー (テナント 10 超過) の監視手順 | ✅ | P12 runbook.md §3 に記載 |

**独立レビューの所見**: 初回判定で懸念したのは「分離テストが hub のテストスイートに紛れて実行されている」
という点だった。**将来テストが増えて分割・スキップされたとき、必須ゲートとして明示されていない
分離テストは静かに外れうる**からである。

この懸念そのものが `scripts/ci/check-tenant-isolation-gate.mjs` によって塞がれている。
同スクリプトは対象ファイルの実在 / `T-ISO-01`〜`T-ISO-07` の ID 網羅 / `skip`・`todo`・`only` の不在
の 3 点を fail-closed に検査する。**「テストが緑」ではなく「テストが無効化されていない」を
検査対象にした点**が本質で、静かに外れる経路を機械的に潰している。

実測 (2026-07-28): `T-ISO-01` を `it.skip` 化すると exit 1 で行番号つき検出、撤去で exit 0 復帰
(12 ケース / 必須 ID 7 種、P09 §4.1)。なお **ゲート数は増えない** (G4 の内訳を明示するだけ) ため
qa-038【2】の「8 種」の数え方は不変。

---

## QC-6 `no-hub-native-account-idp-delegation-i7`

**要求**: Hub ネイティブアカウントを持たず、認証を IdP へ委譲する (I7 / qa-036)

**判定: ✅ 充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| 認証バイパス語群の非存在 | ✅ | `T-BND-03` 検出 0 件 (禁止語 10 種 / 走査 110 ファイル) |
| パスワード資格情報語群の非存在 (auth 実装 path) | ✅ | `T-BND-04` 検出 0 件 (禁止語 5 種) |
| 公開 API にパスワード認証経路が無い | ✅ | `T-OIDC-18` pass |
| Dev tenant も本番と同一 OIDC 経路 | ✅ (手順として) | P08 §3.3 に登録手順を確定。**実登録は P13** |
| **CI での自動検査** | ✅ | QC-4 と同一結線 (`ci.yml` G12 + root `check:auth`) |

**独立レビューの所見**: 検査の設計は妥当と判断する。特に、
禁止語を「射程つき」で 2 群に分けた点 (P08 §2.3) は、
`users.passwordHash` 列 (owner: `feat-domain-model-db`) を誤検出せずに
auth 実装のパスワード非依存を主張できる形になっている。

走査範囲から外した場所を検査結果 JSON の `excluded_from_scan` に記録している点も評価する。
**穴を作ること自体は避けられないが、黙って作られた穴は後から見つからない。**

**残る限定**: 「Dev tenant も本番と同一 OIDC 経路」は*手順として*確定しているだけで、
実際の provider 登録は P13 の責務である。I7 が要求する「Hub ネイティブアカウントを持たない」
というコード上の性質は充足しているが、本番の Dev tenant 登録までを本項の充足根拠にはしていない。

---

## QC-7 `session-jwt-staleness-emergency-revocation-qa036`

**要求**: JWT の最大 15 分の反映遅延を許容しつつ、退職・侵害時は即時失効できる (qa-036)

**判定: ✅ 充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| session `updateAge` 15 分 (role 変更の反映遅延の受容) | ✅ | `T-SESS-01` 数値契約一致 |
| `session_revocations` による即時失効 | ✅ | `T-SESS-02`〜`T-SESS-14` 23 ケース pass |
| 失効判定のキャッシュ (TTL 60 秒) | ✅ | `T-SESS-01` |
| DB 障害時の fail-closed | ✅ | `revocation.ts` が例外時に `true` (失効扱い) を返す |
| 「失効あり」の粘着 | ✅ | 失効を掴んだら以後 DB を見ずに拒否し続ける |
| 2 段構え (edge は DB へ届かない → route が決定点) | ✅ | `with-authz.ts` の設計コメントおよび G3 検査 |

**独立レビューの所見**: 本項目には P06 §5 の逸脱 2 (`T-SESS-05` の等号境界) が関わる。
test-design.md は `iat == revoked_at` を「通過」と書き、実装は「失効」としている。

**独立レビューとしても実装側を支持する。** `revoked_at` も `iat` も秒精度であり、
緊急失効を打ったのと同じ秒に発行された session は現実に存在しうる。
境界を「通過」に倒すと、**緊急失効の直後 1 秒間に発行された session だけが生き残る**。
qa-036 が求めるのは「退職・侵害時の即時失効」であり、そこに 1 秒の穴を開ける理由がない。

test-design.md §`T-SESS-05` の文言は次回改訂時に実装へ追随させること (本 task の write scope 外)。

**運用上の注意**: fail-closed の代償として、control-plane DB が全断すると
**全ユーザーが認可を通れなくなる** (可用性より安全を採った結果)。
この障害モードと対処は P12 runbook.md §1 に記載する。

---

## 差し戻し判定

| 差し戻し先 | 初回判定 (2026-07-25) | 現状 (2026-07-28) |
| --- | --- | --- |
| P05 (実装) | ✅ 必要 (`HarnessHub-b7ng`: Auth.js / 本番 adapter) | ❌ 不要。`HarnessHub-b7ng` closed、`@auth/core` 実結線済み |
| P06 (テスト実行) | ❌ 不要 | ❌ 不要 |
| P07 (受入) | ✅ 必要 (AC-3 は条件付き) | ❌ 不要。AC-3 は ✅ pass 確定 (`acceptance-record.md`) |
| P09 (品質保証) | ✅ 必要 (`HarnessHub-1f28`: CI 必須ゲート化) | ❌ 不要。`HarnessHub-1f28` closed、6 ゲートすべて CI 結線 |

**差し戻し 0 件。** 初回に条件付きとした 4 件の未達部分は、共有 CI への結線 (write scope 外) と
依存導入の意思決定 (`@auth/core`) に起因していたが、いずれも follow-up 課題として起票・完了済みである。
残る本番作業 (本番 OIDC provider 登録・Dev tenant 登録・本番スモークテスト) は
P13 `release-record.md` の責務であり、P10 の差し戻し事由ではない。

## 2026-07-26 本番結線の最終再レビュー

`HarnessHub-b7ng` で Auth.js・本番 DB ports・CAS 永続化を結線した後、branch 全差分を
Cloudflare Workers の要求分離と stream 処理の観点で再レビューした。
未認証 Auth.js POST の全量メモリ化と、DB write の module-scope Promise を要求間で
共有し得る 2 点を検出し、いずれも commit 前に修正した。

- Request body は buffer 化せず、正規 origin へ stream のまま引き継ぐ。
- DB adapter は `process-local` / `request-bound` を型で明示し、ローカルだけを直列化する。
- system-spec は `qa-086` で自己完結した契約へ再確定し、反映受領書へ判断と検証を追記した。
- Draft PR の default branch merge と lifecycle reconciliation だけを残し、実装上の blocker は 0 件と判定する。
