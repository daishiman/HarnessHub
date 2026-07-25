---
status: approved-with-conditions
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

| # | quality_constraint | 判定 |
| --- | --- | --- |
| QC-1 | `tenant-oidc-dynamic-resolution-authjs-d3-qa005` | ⚠️ **条件付き充足** |
| QC-2 | `role4-authorization-matrix-single-middleware-deny-by-default-sec2` | ✅ 充足 |
| QC-3 | `device-flow-os-credential-token-revocation-qa008` | ✅ 充足 (所有範囲において) |
| QC-4 | `auth-adapter-boundary-better-auth-migration-hedge-d3-qa020` | ⚠️ **条件付き充足** |
| QC-5 | `tenant-workspace-row-level-scope-isolation-test-ci-d4` | ⚠️ **条件付き充足** |
| QC-6 | `no-hub-native-account-idp-delegation-i7` | ⚠️ **条件付き充足** |
| QC-7 | `session-jwt-staleness-emergency-revocation-qa036` | ✅ 充足 |

**充足 3 件 / 条件付き充足 4 件 / 未充足 0 件。条件付き4件は完了扱いにせず差し戻す。**

条件付き充足 4 件の未達部分は、(1) 検査スクリプトの CI 未結線 (`HarnessHub-1f28`) と、
(2) `next-auth`・本番 AuthPorts adapter・DB 永続化契約の未結線 (`HarnessHub-b7ng`) に集約される。
どちらも現 write scope を越えるため、未達を隠さず後続課題へ分離した。

> **解消追記 (2026-07-25 / `issue-auth-tenancy-ci-wiring-20260725`)**: (1) は解消した。
> QC-4 / QC-5 の「未達を解消する条件」(下記各節) を満たす結線が完了している。
> ただし本記録は P10 時点の独立レビュー結果であり、判定の再評価は QC-4 / QC-5 の
> 解消追記を根拠に P09 差し戻し (`HarnessHub-1f28` closed) の解除として扱う。
> (2) は未解消のまま `HarnessHub-b7ng` が引き受ける。

---

## QC-1 `tenant-oidc-dynamic-resolution-authjs-d3-qa005`

**要求**: テナント別 OIDC provider を Auth.js で動的解決する (D3 / qa-005)

**判定: ⚠️ 条件付き充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| tenant_slug から OIDC 接続を動的に解決する構造 | ✅ | `TenantOidcConnectionPort.findByTenantSlug()` (`apps/hub/src/lib/auth/ports.ts`)。無い/無効なら `null` を返し、推測で補完しない |
| OIDC 検証契約 (issuer/aud 不一致・nonce/state 欠落・PKCE 未使用の拒否) | ✅ | `T-OIDC-01`〜`T-OIDC-18` 26 ケース pass (P06 §2) |
| テナント間の sub 混線防止 | ✅ | `(tenantId, idpSubject)` の複合キー。別テナントの同値 sub と混線しない |
| JIT provisioning の role 固定 | ✅ | `UserDirectoryPort.createFromOidc` が **role = member 固定**で作る契約。IdP の claim で role が動かない |
| Auth.js 実装との実結線 | ⏳ **未実施** | `next-auth` 未導入、`/api/auth` は 501、本番 runtime も未結線 (`HarnessHub-b7ng`) |

**独立レビューの所見**: 「動的解決」の**判断ロジックと検証契約**は実装され、テストで証明されている。
不足しているのは Auth.js ライブラリとの物理的な結線のみで、これは QC-4 (D3 caveat) が
「Better Auth へ乗り換えられる状態を保つ」ことを要求している以上、
**依存導入を後回しにする判断自体は D3 と整合している**。

ただし、この状態を「テナント別 OIDC ログインが動作する」と読み替えることはできない。
現状で `/{tenant_slug}/signin` からの実ログインは通らない。

**未達を解消する条件**: `next-auth` (または Better Auth) を導入し、`adapter/authjs-config.ts` を実結線したうえで、
2 テナントでの実ログインを P13 のスモークテストで確認すること。

---

## QC-2 `role4-authorization-matrix-single-middleware-deny-by-default-sec2`

**要求**: role 4 種の認可マトリクスを単一ミドルウェアへ集約し、deny-by-default とする (SEC2)

**判定: ✅ 充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| role 4 種の全行網羅 | ✅ | `T-AUTHZ-01`〜`T-AUTHZ-13` の 22 ケースで、正本 37 action + 補助 5 action × role 4 種を被覆 |
| deny-by-default | ✅ | `tests/security/authz-deny-by-default.test.ts` 11 ケース pass。未知 action・用途外の資格情報は既定で拒否 |
| 単一集約 (静的検証) | ✅ | `check-single-authz-middleware.mjs` 走査 97 ファイル / 違反 0 件 / route 例外 5 件が期待集合と一致 (P09 §1 G3) |
| route が wrapper を通っているか | ✅ | 既存 `check-shared-layer-duplicates.mjs` の `unwrapped-route-handler` 走査 250 ファイル / 違反 0 件 (P09 §3) |
| 2 段構え (edge scope 門 + route 決定点) の役割分離 | ✅ | `src/middleware/` は role 語彙を一切持たない (G3 検査で機械的に保証) |

**独立レビューの所見**: 本項目のみ、**検査が「落ちること」を偶発的にではなく実際に確認できている**。
初回実行時に死んだ allowlist エントリ 2 件を検出して赤くなり、除外を削除して緑に戻した。
検査が生きていることの実証としてはこれで十分と判断する。

`role` の 4 種と `users.role` 列の 3 値の分割線 (owner は列の値ではなく `projects.owner_user_id` という**関係**)
についても、`sessionRoleSchema = z.enum(['provider-admin','workspace-admin','member'])` として
型レベルで固定されていることを確認した。

CI 結線が無くても充足と判定する理由: 本項目の主要な保証は**テスト (`T-AUTHZ-*`)** であり、
それは既存の `pnpm --filter @harness-hub/hub test` に含まれ CI で自動実行される。
静的検査 G3 は補強であって、単独の充足条件ではない。

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

**判定: ⚠️ 条件付き充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| 境界外からの Auth.js 固有 API import が 0 件 | ✅ | `T-BND-01` exit 0 / 走査 92 ファイル |
| 公開入口経由の型の素通しが 0 件 | ✅ | `T-BND-02` exit 0 (到達可能性解析) |
| 検査が実際に落ちることの確認 | ✅ | 2 段再輸出を投入して exit 1 と検出経路を確認 (P06 §3 / P08 §1.2) |
| 乗り換え時に触る面が `adapter/` 4 枚に閉じている | ✅ | P08 §1.1 |
| Auth.js 未導入でも認証面が開かない | ✅ | `denyAllAuthProvider` が既定 (fail-closed) |
| **CI での自動検査** | ❌ **未実施** | `apps/hub/package.json` / `.github/` は write scope 外 (P09 §4) |

**独立レビューの所見**: qa-020 は「CI で機械検証する」ことを求めている。
検査は**存在し、pass し、赤化も確認済み**だが、**CI が自動で落としてはくれない**。
人間が忘れれば検査は動かない。したがって「充足」とは判定できない。

なお P08 §1.2 が記録するとおり、本 task では実装側の逸脱ではなく**検査側の穴**を是正した
(入口 1 枚しか見ていなかった → 到達可能性解析へ)。これは境界の実効性を高める方向の変更である。

**未達を解消する条件**: `apps/hub/package.json` へ `"check:auth-gates": "node scripts/check-auth-gates.mjs"` を追加し、
root の `pnpm verify` から呼ぶこと (follow-up 起票済み)。

> **解消 (2026-07-25 / `issue-auth-tenancy-ci-wiring-20260725`)**: 条件を満たした。
> root `pnpm check:auth` を `verify` チェーンへ、`.github/workflows/ci.yml` の `static-gates` job へ
> **G12** として結線済み。実測: `pnpm verify` exit 0 / `[auth-gates] OK: 3 ゲート全て pass`、
> かつ Auth.js の意図的な境界違反を投入すると `pnpm verify` が `check:auth` で exit 1。

---

## QC-5 `tenant-workspace-row-level-scope-isolation-test-ci-d4`

**要求**: Tenant/Workspace の row-level-scope を分離テストで保証し、CI 必須ゲート化する (D4)

**判定: ⚠️ 条件付き充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| 2 テナント同時稼働での行混入 0 件 | ✅ | `T-ISO-02` |
| role × action 総当たりでの越境拒否 | ✅ | `T-ISO-05` (provider-admin 以外は全 role 拒否) |
| provider-admin 越境の許可 + 監査必須 | ✅ | `T-ISO-04` (`provider.cross_tenant_access` 1 件) |
| 404 (存在秘匿) と 403 (権限不足) の区別 | ✅ | `T-ISO-06` |
| tenant 跨ぎの device_code / refresh token 流用拒否 | ✅ | `T-ISO-07` |
| **分離テストの CI 必須ゲート化** | ⚠️ **部分的** | `tests/auth-tenancy/` は `pnpm --filter @harness-hub/hub test` に含まれ CI で走る。ただし「必須ゲート」としての明示的な指定 (このテストだけが落ちたらリリースを止める、という結線) は行っていない |
| revisit トリガー (テナント 10 超過) の監視手順 | ✅ | P12 runbook.md §3 に記載 |

**独立レビューの所見**: 分離テスト自体は既存の hub テストスイートに含まれるため、
CI では実際に実行される (261 ケース中の 12 ケース)。QC-4 ほど深刻ではない。
ただし D4 が求めているのは「分離テストが CI 必須ゲートであること」であり、
現状は「hub のテストスイートに紛れて実行されている」に留まる。

**この差は運用上意味を持つ**: 将来 hub のテストが増えて実行時間短縮のため分割・スキップされたとき、
「必須ゲート」として明示されていない分離テストは静かに外れうる。

**未達を解消する条件**: 分離テストを名指しした CI ステップを設けるか、
少なくとも `check-auth-gates.mjs` と同時に必須実行される位置へ結線すること。

> **解消 (2026-07-25 / `issue-auth-tenancy-ci-wiring-20260725`)**: 条件を満たした。
> `ci.yml` に「G4 名指し tenant 分離テスト」ステップを設け、root は `pnpm check:tenant-isolation` で同一実装を呼ぶ。
> 「静かに外れうる」という本節の懸念そのものを `scripts/ci/check-tenant-isolation-gate.mjs` が
> 対象実在 / T-ISO-01〜07 の ID 網羅 / `skip`・`todo`・`only` の不在 の 3 点で fail-closed に検査する。
> 実測: `it.skip` 化とケース削除の両方で exit 1 になることを確認済み。
> なお **ゲート数は増えない** (G4 の内訳を明示するだけ) ため qa-038【2】の「8 種」の数え方は不変。

---

## QC-6 `no-hub-native-account-idp-delegation-i7`

**要求**: Hub ネイティブアカウントを持たず、認証を IdP へ委譲する (I7 / qa-036)

**判定: ⚠️ 条件付き充足**

| 観点 | 判定 | 根拠 |
| --- | --- | --- |
| 認証バイパス語群の非存在 | ✅ | `T-BND-03` 検出 0 件 (禁止語 10 種) |
| パスワード資格情報語群の非存在 (auth 実装 path) | ✅ | `T-BND-04` 検出 0 件 (禁止語 5 種) |
| 公開 API にパスワード認証経路が無い | ✅ | `T-OIDC-18` pass |
| Dev tenant も本番と同一 OIDC 経路 | ✅ (手順として) | P08 §3.3 に登録手順を確定。実登録は P13 |
| **CI での自動検査** | ❌ **未実施** | QC-4 と同一原因 (P09 §4) |

**独立レビューの所見**: 検査の設計は妥当と判断する。特に、
禁止語を「射程つき」で 2 群に分けた点 (P08 §2.3) は、
`users.passwordHash` 列 (owner: `feat-domain-model-db`) を誤検出せずに
auth 実装のパスワード非依存を主張できる形になっている。

走査範囲から外した場所を検査結果 JSON の `excluded_from_scan` に記録している点も評価する。
**穴を作ること自体は避けられないが、黙って作られた穴は後から見つからない。**

**未達を解消する条件**: QC-4 と同一 (CI 結線)。

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

| 判定 | 結果 |
| --- | --- |
| P05 (実装) への差し戻し | ✅ 必要 (`HarnessHub-b7ng`: Auth.js / 本番 adapter) |
| P06 (テスト実行) への差し戻し | ❌ 不要 |
| P07 (受入) への差し戻し | ✅ 必要 (AC-3 は条件付き) |
| P09 (品質保証) への差し戻し | ✅ 必要 (`HarnessHub-1f28`: CI 必須ゲート化) → **2026-07-25 解消**。`HarnessHub-1f28` closed |

条件付き充足 4 件の未達部分は、いずれも**本 feature の write scope 外の作業** (共有 CI への結線) と
**別途の意思決定を要する依存導入** (`next-auth`) に起因する。
どちらも follow-up として起票し、P11 evidence-summary.md / P13 release-record.md に引き継ぐ。

→ P11 の証跡集約は実施できるが、P10 は follow-up 完了後に再レビューする。
