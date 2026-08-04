---
status: confirmed
layer: feature-operations
task: SYS-PUBLISHER-PLUGIN-P12
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: docs/features/feat-publisher-plugin/evidence-summary.md
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin runbook (P12)

> **位置づけ**: P12 の成果物。[evidence-summary.md](./evidence-summary.md) (P11) までに確立された実装・証跡をもとに、作者 (この Publisher CLI/plugin を使う人) 向けの publish 手順・token 失効導線・障害時対応手順を 1 冊にまとめる。実装コード (`apps/publisher/`, `plugins/harness-hub-publisher/`) の変更は行わない (スコープ外)。

作成日: 2026-08-02

---

## 1. 作者向け publish 手順

### 1.1 Claude Code / Codex から (推奨経路)

skills-package (公開したい plugin/skill) のディレクトリを用意した状態で、Claude Code/Codex 上で `/publish` を実行する。内部では `plugins/harness-hub-publisher/skills/run-publisher-publish/scripts/run-publisher-publish.sh` が `apps/publisher/bin/harness-publisher.mjs publish` を 1 行 exec するだけであり (implementation-notes.md §1.3)、plugin 面と CLI 本体で処理が重複することはない。

### 1.2 CLI 直接実行

```bash
node apps/publisher/bin/harness-publisher.mjs publish \
  --hub-url <HUB_BASE_URL> \
  --tenant-slug <TENANT_SLUG> \
  --origin <CLI_ORIGIN> \
  --package-dir <PACKAGE_DIR> \
  --project-id <PROJECT_ID> \
  --target skill \
  --visibility private
```

`--target web_app` の場合は `--wrangler-config <WRANGLER_TOML_PATH>` を追加する (`apps/publisher/src/cli/index.ts` `dispatchPublish`)。

### 1.3 内部で何が起きるか (`apps/publisher/src/cli/publish-command.ts` `runPublishCommand`)

1. `--package-dir` 配下のファイルを収集し、`plugin.json` の必須項目 (`name`/`version`/`description`) を補完する。
2. ローカル pre-check (`@harness-hub/inspection` を Hub と共有、AD-3) を実行する。
3. 初回は Device Flow でブラウザ認可 (§1.1 の URL が自動で開く)、2 回目以降は保存済み refresh token から access token を再取得する (access token 自体は保存しない、AD-4)。
4. Hub へ `POST /api/v1/publish` → package 転送 → `POST /api/v1/publish/:id/submit` の順に送信する。
5. `target=web_app` かつ `published` の場合のみ、ローカルの `wrangler deploy` を実行し結果を Hub へ登録する。

成功時は `公開が完了しました (id=..., status=published)` と表示され、exit code は `0` になる (web_app の場合は続けて `deploy URL: ...` も表示される)。

---

## 2. token 失効導線

正本: `docs/backend-spec-api-state.md` §4.1、`docs/security-spec-authentication.md`。

| 操作 | エンドポイント | 認証 | 備考 |
|---|---|---|---|
| 自分の Publisher token 一覧を見る | `GET /api/v1/tokens` | session | admin は Workspace 全体を見られる |
| token を失効させる | `DELETE /api/v1/tokens/:id` | session (本人 または admin) | 即時反映 (`publisher_tokens.revoked_at` を毎リクエスト参照)。`token.revoke` として監査 event に記録される |

**作者本人が失効させたい場合**: Hub Web にログインし、上記 `GET /api/v1/tokens` の一覧画面 (Hub Web 側の実装は本 feature のスコープ外、owner=feat-user-org-admin 等) から対象デバイスの token を選んで失効させる。失効後、Publisher CLI は次回実行時に refresh 失敗を検知し (§3.2)、自動的に Device Flow へフォールバックする。

**紛失デバイス・退職者対応 (admin による失効)**: Workspace admin が同じ `DELETE /api/v1/tokens/:id` を該当ユーザーの token に対して実行する。緊急停止 (退職・侵害) で全セッションを即時無効化したい場合は、これとは別に `session_revocations` テーブルを使う緊急失効経路がある (`docs/security-spec-authentication.md` §3.6) が、これは Publisher token 単体の失効ではなく Hub 全体の緊急対応であり、feat-auth-tenancy 側の責務である。

---

## 3. 障害時対応手順

### 3.1 pre-check 失敗時

`runPublishCommand` は 2 段階でローカル判定を行う (`apps/publisher/src/cli/publish-command.ts`)。

| 症状 | 表示メッセージ | 原因 | 対処 |
|---|---|---|---|
| manifest 必須項目不足 | `plugin.json の必須項目が不足しています: <フィールド名...>` | `--package-dir` 内の `plugin.json` に `name`/`version`/`description` のいずれかが無い | 不足フィールドを `plugin.json` に追記して再実行する |
| ローカル pre-check エラー | `ローカル pre-check で修正が必要な項目が見つかりました:` に続けて `- [ルールID] メッセージ` の箇条書き | secret scan・禁止 Hook/script/binary 検出・必須メタ欠落など (`packages/inspection` の PKG-* ルール) | 箇条書きの各項目 (owner/公開範囲・secret・禁止ファイル等) を修正し再実行する。**Hub 側と同一の検査ロジックを使っている** (AD-3) ため、ここを通過すれば Hub 側の pre-check でも大きく食い違うことはない |

いずれも exit code `1` で終了し、Hub へは何も送信されない (ローカルで完結する)。

### 3.2 Device Flow タイムアウト時

`apps/publisher/src/auth/device-flow.ts` `pollForToken` が polling ループを管理する。

| 症状 | 原因 | 対処 |
|---|---|---|
| `device_code の有効期限が切れました。最初からやり直してください` (polling 中に検知) または `device_code の有効期限が切れました` (`expired_token` 応答) | `POST /api/v1/device/code` が発行した `device_code` の TTL (10 分) 内にブラウザでの認可が完了しなかった | `publish` コマンドを再実行する (device_code は使い捨てのため再利用不可)。表示された URL を **できるだけ早く** ブラウザで開き認可を完了する |
| `認可が拒否されました` | ブラウザ側で「拒否」を選択した (`access_denied`) | 意図的な拒否でなければ再実行し、正しいアカウントで承認する |
| `device token 交換に失敗しました: <code>` | 上記以外の未知のエラー応答 | Hub 側の障害の可能性がある。Hub の稼働状況を確認し、解消しない場合は運用担当へ連絡する |

polling 自体は 5 秒間隔から開始し、Hub が `slow_down` を返すたびに +5 秒ずつ (上限 60 秒) 増える (`DEVICE_POLL_BACKOFF_SECONDS`/`DEVICE_POLL_MAX_INTERVAL_SECONDS`)。これは正常動作であり待てば良い。

### 3.3 wrangler 実行失敗時

`apps/publisher/src/deploy/wrangler.ts` `runWranglerDeploy` を参照。**重要**: wrangler の失敗は publish 自体の失敗として扱わない設計になっている (`publish-command.ts` のコメントに明記)。Hub 側の `PublishRequest` は既に `published` (Release/Catalog へ反映済み) であり、wrangler はその後のローカルデプロイ手段に過ぎないため。

| 症状 | 原因 | 対処 |
|---|---|---|
| `wrangler deploy に失敗しました: <stderr>` (コンソールログのみ、コマンド自体は exit code `0` で正常終了し `deploy URL` は表示されない) | `pnpm exec wrangler deploy --config <path>` の exit code が非 0 (認証切れ・設定ミス・Cloudflare 側エラーなど) | 表示された stderr を確認し、`wrangler login` の再認証や `wrangler.toml` の設定を見直した上で、`--target web_app --wrangler-config <path>` を指定して同じコマンドを再実行する。Hub 側の publish は既に成功しているため、`publish` を最初からやり直す必要はない |
| `wrangler の出力から URL を抽出できませんでした` | exit code は 0 だが stdout に `*.workers.dev` 形式の URL が見当たらない (wrangler の出力形式変更など) | `pnpm exec wrangler deploy --config <path>` を手動実行し、stdout を目視で確認する。URL 抽出パターン (`DEPLOY_URL_PATTERN`) の更新が必要な場合は実装側の修正 issue を起票する |

いずれの場合も、Hub 側の Catalog エントリ自体は影響を受けない。deployment 登録 (`POST /api/v1/projects/:id/deployment`) だけが未実施のまま残るため、wrangler 再実行が成功すれば追って登録される。

---

## 4. feature context 全件の P12 責務追跡 (未割当 0 件)

| scope_in / acceptance | P12 が runbook 化した範囲 |
|---|---|
| package 収集 + manifest 補完 | §1.3 手順 1、§3.1 表 |
| ローカル pre-check (Hub と検査ロジック共有) | §1.3 手順 2、§3.1 表 |
| Device Flow 認証 + OS 資格情報域保存 | §1.3 手順 3、§2 (token 失効導線)、§3.2 |
| web_app 経路の wrangler スクリプト実行 | §1.3 手順 5、§3.3 |
| Python 資産の挙動同値移植テスト | 対象外 (実行手順ではなく実装検証事項、evidence-summary.md §5 で追跡済み) |
| acceptance 1〜3 | 対象外 (P11 evidence-summary.md が既に追跡完了。P12 は運用手順の文書化が責務) |

未割当 0 件 (Python 資産同値検証と acceptance 3 件は P12 の責務範囲外であることを明記した上で対象外と判定)。

---

## 5. Normative implementation closure との整合

本 runbook が参照する実装ファイル (`apps/publisher/src/cli/`, `auth/`, `deploy/`) は、P05 (implementation-notes.md) で構築され P06 (test-run-results.md) で macOS/Windows 検証済みの plugin artifact のみである。P12 は新しい実装経路を作らず、既存実装の操作手順・失効導線・障害対応を文書化するのみであり、正本 task spec の「P12/P13 は不足している実装/証跡をドキュメントや計画中の作業で代替してはならない」という Trace rule に抵触しない (実装済みの動作のみを説明している)。

---

## 6. 判定

作者向け publish 手順・token 失効導線・pre-check 失敗時/Device Flow タイムアウト時/wrangler 失敗時の障害時対応手順の 3 系統を、いずれも実装コード (`apps/publisher/src/`) の実際の分岐・メッセージ文言に基づいて記載した。差し戻し対象は 0 件。

P13 (リリース/デプロイ、marketplace 申請文書・チェックリスト作成) へ引き継ぐ。
