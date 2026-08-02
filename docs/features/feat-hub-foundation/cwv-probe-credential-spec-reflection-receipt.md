---
status: reflected
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-9cgb
dev_graph_node_id: issue-hub-cwv-auth-required-route-unmeasurable-20260802
feature_node_id: feat-hub-foundation
spec_impact: reflected
reviewed_at: 2026-08-02
---

# protected CWV probe credential 仕様反映受領書

## 1. 依頼と目的

`HarnessHub-9cgb` の未計測問題を解消する。`/catalog` は認証必須なので、ログアウト状態の Lighthouse が 401 を返していた。401 を性能が良い証拠と誤読せず、通常ユーザーの認証情報を CI に渡さないまま実画面を測ることが目的である。

## 2. 結論

- **仕様影響: あり (`reflected`)**。認証、セキュリティ、インフラ、テスト品質の web 契約に最小権限 CWV credential を追加した。
- **通常の製品利用契約: 変更なし**。OIDC、session、Publisher token、外部 API、DB schema、UI の権限は変えない。
- **repository 実装: 完了**。短命 ticket、URL 除去 Cookie bootstrap、read-only 経路制限、CI target 固定、artifact sanitizer、secret 台帳、負例テストを同じ変更で維持した。
- **外部実測: 未完了**。Worker/GitHub secret の投入、代表 tenant/workspace の選定、main deploy、最初の Lighthouse 成功まで `HarnessHub-9cgb` は open とする。

## 3. 中学生向けの説明

カタログの部屋は、誰でも入れる部屋ではありません。今までの性能テストは鍵を持っていなかったので、ドアの前で「入れません」と言われただけでした。それでは部屋の中が速いかどうかは分かりません。

そこで、性能テストだけが使える「5 分で消える見学券」を作ります。この券はカタログを見ることだけができ、追加・公開・設定変更はできません。券はすぐ URL から消し、テスト結果のファイルにも残さないので、ほかの人に渡っても悪用しにくくなります。

## 4. 専門的な説明

GitHub Actions は `HUB_CWV_PROBE_SECRET` から HS256 JWT を mint し、`typ=cwv_probe`、`aud=harness-hub-cwv`、HTTPS origin、固定 tenant/workspace、`iat`、`exp≤iat+300` を載せる。Worker は同じ secret で検証し、`GET /catalog` の bootstrap で query ticket を除去する 307 と `__Host-harness-hub.cwv-probe` Cookie を返す。

Cookie は HttpOnly / Secure / SameSite=Strict / Path=/、bootstrap 応答は `Cache-Control: no-store` / `Referrer-Policy: no-referrer` とする。edge と route は GET/HEAD の catalog read allowlist と `harnesses.read` の credential 規則を二段で検査する。通常 session/access token は workflow に参照させず、probe の失効は 5 分 TTL と署名鍵 rotation で行う。Lighthouse JSON は upload 前に ticket を除去・検査し、CWV report には ticket を含まない URL だけを残す。

## 5. 仕様反映の正規フロー

1. `auth.web`、`security.web`、`infrastructure.web`、`testing-qa.web` を R4 reopen した。
2. main 統合後、ユーザーの 2026-08-02 の「ok」を `appr-025`、設計回答を `qa-133` として single transition writer で再確定した。main の `appr-024` と `qa-131` / `qa-132` は保持する。
3. C03 compiler で `system-spec/` を再生成した。
4. C02 import で `specs/` と system-spec 参照 architecture の lineage を更新し、source digest の不整合を検査する。
5. 詳細仕様、feature、task、runbook、CI secret 台帳、Beads を同期する。

主な反映先:

- `system-spec/spec-state.json`、`system-spec/auth.md`、`system-spec/security.md`、`system-spec/infrastructure.md`、`system-spec/testing-qa.md`
- `docs/security-spec-*.md`、`docs/infrastructure-spec.md`、`docs/features/feat-hub-foundation/runbook.md`
- `features/feat-hub-foundation.md`、`specs/harness-hub-system-specification.md`、`architecture/`
- `tasks/feat-hub-foundation/sys-hub-foundation-p13.md`

## 6. 検証

| ゲート | 結果 |
| --- | --- |
| repository 統合 | main 統合後の `pnpm verify` が exit 0（pnpm / 重複 / Worker secret / auth / lint / 全 workspace typecheck / build / Worker build / 全 test / tenant isolation / secrets / drift / bundle / client bundle） |
| TypeScript と対象回帰 | `pnpm --filter @harness-hub/hub run typecheck` pass、CWV/authz/workflow 台帳の Vitest 5 files・83 tests pass |
| system-spec | C03 compiler、coverage+foundation、source citation、knowledge / doctrine / required-info / cross graph pass |
| CWV credential | mint/verify、期限、origin、scope、method/path、URL 除去 Cookie、public path を含む allowlist 外拒否、artifact sanitizer の正負テスト pass |
| Actions 台帳 | workflow の実参照 16 件と `scripts/ci/actions-secrets-registry.json` の双方向一致 pass |
| Worker secret 台帳 | `CWV_PROBE_*` を必須として宣言し、台帳 13 件と `apps/hub/wrangler.jsonc` の宣言 10 件の一致 pass |
| task / graph / 文書 | feat-hub-foundation / feat-dual-catalog-web task spec、C02 source digest、graph schema、evidence refs、artifact placement、300 行上限、`git diff --check` pass |

## 7. 残課題

- `CWV_PROBE_SECRET`、`CWV_PROBE_TENANT_ID`、`CWV_PROBE_WORKSPACE_ID` を Worker secret へ投入する。
- 同じ値を `HUB_CWV_PROBE_*` GitHub Actions secrets へ投入する。
- 読み取り専用の代表 tenant/workspace を選び、main deploy 後に `hub-cwv` を実行する。
- artifact に ticket が無く、LCP / CLS / TBT が得られることを確認してから Beads を close する。
