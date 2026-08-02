---
status: confirmed
layer: feature-quality
task: SYS-PUBLISHER-PLUGIN-P09
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: docs/features/feat-publisher-plugin/refactoring-migration-note.md
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin 品質・セキュリティ・運用保証 (P09)

> **位置づけ**: P09 の成果物。[refactoring-migration-note.md](./refactoring-migration-note.md) (P08) 完了時点の実装に対し、`docs/security-spec-authentication.md` §2.2/§2.2.1 (旧 `docs/security-spec.md` §2.2 相当) が定める Device Flow 数値契約・scope 最小権限と、secret 非平文保存・両 OS 同一動作を確認する。

確認日: 2026-08-02

---

## 1. Device Flow 数値契約遵守の確認

正本: `docs/security-spec-authentication.md` §2.2 (Hub 側の確定値は `apps/hub/src/lib/auth/config.js` の `AUTH_NUMERIC_CONTRACT` が保持)。Publisher クライアント側の責務は、この契約を独自に再定義せず**サーバ応答をそのまま使う**か、**サーバと同値の固定値を持つ**かのいずれかで遵守することである。

| 契約項目 | 確定値 | Publisher クライアント側の遵守方法 | 確認結果 |
|---|---|---|---|
| `device_code` TTL | 10 分 | 独自の TTL 定数を持たず、`POST /api/v1/device/code` 応答の `expires_in` をそのまま `DevicePollState.expiresInSeconds` に格納し、`isDeviceCodeExpired` で判定する (`auth/device-flow.ts` `startDevicePoll`/`isDeviceCodeExpired`) | 一致 (サーバ値に追従する設計のため契約変更時も改修不要) |
| `user_code` (8 文字 Crockford Base32) | Hub 側が生成 | クライアントは `user_code` を生成・検証せず、`verification_uri_complete` をブラウザで開くだけ (`cli/session.ts` `loginWithDeviceFlow`) | 一致 (クライアントの責務範囲外であることを構造的に保証) |
| polling `interval` 初期値 5 秒 | Hub 応答の `interval` をそのまま使用 (`startDevicePoll`) | 一致 |
| `slow_down` 時 +5 秒・上限 60 秒 | `DEVICE_POLL_BACKOFF_SECONDS = 5`、`DEVICE_POLL_MAX_INTERVAL_SECONDS = 60` を固定値として保持し、`applyPollResponse` の `slow_down` 分岐で `Math.min(interval + 5, 60)` を適用 (`auth/device-flow.ts`) | 一致 (`pt2-device-flow-auth.test.ts` で数値契約を直接 assert) |
| 正常 polling 時 −5 秒減衰・下限 5 秒 | **Hub 側の内部会計のみ** (`apps/hub/src/lib/auth/device-flow/transforms.ts` `decreaseInterval`)。RFC 8628 には成功/pending 応答で server が推奨 interval を下げて通知する仕組みが無く、client が独自に模倣する経路が存在しない | client 側での再実装は不要と判断 (`auth/device-flow.ts` 冒頭コメントに「client 側は『backoff 増分』と『増加の上限』だけを固定値として持てば足りる」と明記済み) |
| access token TTL 15 分 | `ACCESS_TOKEN_TTL_SECONDS = 15 * 60` を Hub と同値で保持 (`auth/device-flow.ts`) | 一致 (`pt2-device-flow-auth.test.ts` で直接 assert) |
| access token 非保存 | `PublisherCredentialRecord` スキーマに `access_token` フィールドを持たない (`packages/schemas/publisher-plugin/credential-record.ts`)。1 回の実行ごとに device flow か refresh で再取得する (`cli/session.ts` 冒頭コメント) | 一致 |
| refresh token TTL 90 日 | `REFRESH_TOKEN_ROTATION_SECONDS = 90 * 24 * 60 * 60` を Hub と同値で保持 | 一致 (`pt2-device-flow-auth.test.ts` で直接 assert) |
| refresh rotation (使い捨て) | `obtainAccessToken` (`cli/session.ts`) が login/refresh いずれの経路でも応答に含まれる**新しい** `refresh_token` を `saveToken` で保存し直す (Keychain 側は `-U` 更新フラグで上書き、`credential-store.ts`) | 一致 |
| 再利用検知 (family 全失効) | 判定自体は Hub 側 (feat-auth-tenancy) の責務。client 側は `refreshOrClear` (`auth/token-manager.ts`) が refresh 失敗時に `invalid_grant`/`access_denied` を区別せず無条件で `clearToken` する | 一致。`pt2-device-flow-auth.test.ts` PT2-C で client 側の無条件クリア動作を確認 (family 判定自体は `it.todo` で Hub 側責務と明記、feat-auth-tenancy へ委譲) |
| クライアント保存先 | macOS Keychain (`security` CLI) / Windows Credential Manager (`PasswordVault`) | 一致 (§2 で詳述) |

**結論**: Publisher クライアント側が数値契約を独自に誤って再定義している箇所は無い。減衰ロジックの不在は実装漏れではなく、RFC 8628 のプロトコル制約上 Hub 側にしか持てない会計であることを構造的に確認した。

---

## 2. OS 資格情報域保存の確認

| 確認事項 | 証跡 |
|---|---|
| macOS: Keychain (`security` CLI) を子プロセス経由で使用 | `auth/credential-store.ts` `createMacKeychainAdapter` (`add-generic-password`/`find-generic-password`/`delete-generic-password`)。ネイティブ addon (keytar 等) に依存しない |
| Windows: Credential Manager (`Windows.Security.Credentials.PasswordVault`) を PowerShell 経由で使用 | `auth/credential-store.ts` `createWindowsCredentialManagerAdapter` |
| 保存形式は zod スキーマで検証してから保存 | `publisherCredentialRecordSchema.parse(record)` を保存直前に通す (両 adapter 共通) |
| 12 件のテストで両 adapter の保存/取得/削除・エラー処理を確認済み | `auth/credential-store.test.ts` 12 件 pass (test-run-results.md §2) |

**結論**: OS 資格情報域保存は既に P05 で実装され P06/P07 で検証済み。本 task で実装・テストへの再確認を行い、逸脱は無いことを確認した。

---

## 3. scope 最小権限の確認

`docs/security-spec-authentication.md` §2.2.1 (S-D7): 「scope は加算的に付与しない」「発行時に最小権限を選ぶ」。

| 確認事項 | 証跡 |
|---|---|
| `publish` サブコマンドは `publish:write` のみを要求する | `auth/scopes.ts` `scopesForCommand('publish')` → `['publish:write']` |
| `feedback` サブコマンドは `feedback:write` のみを要求する (`publish:write` を含めない) | `auth/scopes.ts` `scopesForCommand('feedback')` → `['feedback:write']` |
| `metrics:write`/`aijob:process` を要求する経路が存在しない | `apps/publisher/src/` 全文検索で `metrics:write`/`aijob:process` の出現は 0 件 (該当 scope はハーネス実行環境・AI worker 用であり Publisher CLI の対象外) |

**結論**: Publisher CLI はコマンドごとに必要最小限の scope のみを要求しており、加算的付与は行っていない。

---

## 4. secret 非平文保存の確認 (静的チェックスクリプト新規追加)

`apps/publisher/scripts/check-plaintext-secret-storage.mjs` を新規作成し、以下 4 観点を機械的に確認するようにした (`apps/hub/scripts/check-*.mjs` の既存パターンに準拠)。

| 観点 | 確認内容 | 結果 |
|---|---|---|
| fs-write-absence | 本番コード (`apps/publisher/src/`, テスト除く) が Node `fs` 経由でファイルへ書き込んでいない | 違反 0 件 (token 永続化は OS 資格情報域のみを経由) |
| env-credential-absence | `process.env.*TOKEN*`/`*SECRET*`/`*CREDENTIAL*`/`*PASSWORD*` のような環境変数参照が無い | 違反 0 件 |
| log-leak-absence | `log(`/`console.*(` 呼び出しの引数に `access_token`/`refresh_token`/`device_code` 相当の識別子が渡っていない | 違反 0 件 |
| secret-file-absence | `.env`/`.env.*`/`credentials.json`/`*.pem`/`*.key` に該当するファイルが `apps/publisher/` 配下に commit されていない | 違反 0 件 |

実行結果: `[plaintext-secret-storage-absence] OK: 走査 24 本番ファイル / 4 観点 / 違反 0 件`

fail-closed であることの確認: scratchpad 上に `writeFileSync`・`process.env.MY_SECRET_TOKEN`・`console.log('token', access_token)` を含む fake ファイルを用意し、本スクリプトの走査対象を差し替えて実行したところ、3 件の違反 (`fs-write-absence`・`env-credential-absence`・`log-leak-absence`) を正しく検出した (`exit 1`)。誤って常に pass するスクリプトになっていないことを確認済み。

`package.json` に `check:plaintext-secret-storage` script を追加し `pnpm --filter @harness-hub/publisher check:plaintext-secret-storage` で実行できるようにした。`biome.json` の `files.includes` に `apps/publisher/scripts/**/*.mjs` を追加し (`apps/hub/scripts/**/*.mjs` と同様)、biome lint の対象に含めた。

---

## 5. 両 OS pnpm script 同一動作の確認 (qa-043)

`pt6-cross-platform-toolchain.test.ts` PT6-A が既に `package.json` の `scripts` 文字列を静的検査しており (ハードコードされた `\` path 区切り、POSIX シェル依存構文 `&&`/`||`/`$()` の不在)、本 task で追加した `check:plaintext-secret-storage` script (`"node scripts/check-plaintext-secret-storage.mjs"`) もこの検査対象に含まれ pass することを確認した。

---

## 6. Normative implementation closure の再確認

正本 task spec §Normative implementation closure が定める Mandatory evidence は P07 の [acceptance-record.md](./acceptance-record.md) §2 で突き合わせ、本 task はそのうち Security 観点 (Device Flow・OS 資格情報域・scope・secret 非平文保存) を深掘りして再確認した。Security 実装の逸脱は無い。一方、実サービスを使う macOS/Windows E2E・初回 15 分・marketplace source content hash は未完であり、この P09 の静的検証で完了に読み替えない。

---

## 7. 実行コマンドと結果

| # | コマンド | 結果 |
|---|---|---|
| C1 | `pnpm --filter @harness-hub/publisher typecheck` | pass (エラー 0 件) |
| C2 | `pnpm exec biome check apps/publisher packages/schemas/publisher-plugin` | pass (No fixes applied、49 files) |
| C3 | `pnpm --filter @harness-hub/publisher exec vitest run --coverage` | 19 files / 108 tests passed / 4 todo (112) — exit 0、カバレッジ既存水準を維持 (Statements 89.52%) |
| C4 | `node scripts/ci/check-shared-layer-duplicates.mjs` | 走査 506 ファイル (新規 script 追加分 +1) / 違反 0 件 |
| C5 | `node apps/publisher/scripts/check-plaintext-secret-storage.mjs` (新規) | 走査 24 本番ファイル / 4 観点 / 違反 0 件 |
| C6 | `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publisher-plugin` | `status: pass`, violations 0 件 |

---

## 8. 判定

Required evidence (Device Flow 数値契約・OS 資格情報域保存・scope 最小権限・secret 非平文保存・両 OS pnpm script 同一動作) の全確認結果を記載した。逸脱は検出されず、rollback は不要。

P10 (独立最終レビュー) へ引き継ぐ。
