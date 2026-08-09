---
status: active
layer: architecture-operations-addenda
parent: architecture/harness-hub-infrastructure.md
---

# Harness Hub infrastructure 運用追補

本書は [infrastructure アーキテクチャ](harness-hub-infrastructure.md) から分離した運用履歴である。
製品要求の正本は各節から参照する `system-spec/` 文書に置く。

## SLO 公開実測の差分追記 (2026-08-02 / `HarnessHub-37h.15` / qa-116)

- **実測境界**: Better Stack の設定申告ではなく、認証不要の status page `/index.json` を読み、resource `external_id` を主鍵に現在状態と日次履歴を突合する。取得不能は fail-closed とする。
- **観測窓**: UTC の完了日だけを数え、進行中の当日と `not_monitored` を除外する。30 日未満は `collecting`、外形単独の目標判定は `null` を維持する。
- **最終判定**: 30 日到達後も Workers Analytics 5xx 率が揃うまで `observation_complete_pending_application_error_rate` とし、外形監視だけで 99.5% 達成を主張しない。
- **再現性と秘密**: 検証 CLI は一致 0 / 不一致 1 / 取得・入力不能 2 を返し、公開 URL だけを読む。API token と heartbeat URL を証跡へ保存しない。
- 正本は [system-spec/infrastructure.md](../system-spec/infrastructure.md) の qa-116、実装・検証・残課題は [仕様反映受領書](../docs/features/feat-hub-foundation/slo-observation-spec-reflection-receipt.md) を参照する。

## Delivery closure と SLO verdict の分離 (2026-08-02 / qa-123)

- SLO target、観測窓、複合算定、エラーバジェットは qa-019 / qa-116 を維持する。
- feature / P13 の delivery lifecycle は exact-13、release、health、bundle、共通層の証跡で閉じ、ユーザーが不要とした運用 follow-up は `not_applicable` として非 blocker にする。
- waiver を稼働品質 PASS へ変換しない。観測再開時は同一 issue の reopen または新 issue と、既存 runbook / CLI / 生データを必要とする。
- この変更は acceptance governance の境界だけで、API、DB schema、認証認可、UI、Worker deploy unit の構造を変えない。詳細は [仕様反映受領書](../docs/features/feat-hub-foundation/feature-closeout-spec-reflection-receipt.md) を参照する。

## Shared Google rollout 追補 (2026-08-01 / `HarnessHub-fnej` / qa-113・qa-114)

- 環境ごとに Google OAuth client を 1 件作り、redirect URI は `AUTH_CANONICAL_ORIGIN + /api/auth/shared/callback/tenant-oidc` の 1 本に固定する。tenant 追加ごとの client/URI 登録は行わない。
- `SHARED_GOOGLE_OAUTH_CLIENT_ID` と `SHARED_GOOGLE_OAUTH_CLIENT_SECRET` は Cloudflare Worker の環境 secret とし、repository と GitHub Actions Secrets を受渡し元にしない。共有 tenant がない環境では未設定を許す。
- rollout は backup/dry-run → migration 0003 → secret 投入 → Worker deploy → tenant mode 変更 → 共有/顧客両方式 smoke の順。個人 Google、別 Workspace、tenant state 差し替えの拒否も確認する。
- rollback は tenant を customer mode へ戻し、旧 callback の成功を確認してから Worker code を戻す。DB migration と証跡は自動で戻さない。
- secret rotation は新 secret 投入 → Worker 反映 → login 確認 → 旧 secret revoke。手順と証跡は [rollout runbook](../docs/features/feat-auth-tenancy/runbook-shared-google-oidc-rollout.md) を正とする。

## 2026-08-07 稼働ビルドの素性と deploy 反映鮮度の設計反映

サインイン後に業務画面へ到達できない事象の原因究明 (qa-185〜qa-190) を受けて、確定章 [system-spec/infrastructure.md](../system-spec/infrastructure.md) の qa-187 が次を確定した。本節はその参照索引であり、内容の正本は確定章側にある。

- **isolate 再利用と環境値の stale 化 (qa-187-a/-b)**: binding だけを変更する deploy では Cloudflare が実行中の isolate を再利用し得るため、env 由来の値を module 最上位 (global scope) で保持すると、binding 差し替え後も stale な値が持続し得る。公式が名指しする anti-pattern であり、正しい形は request ごとに解決することである。
- **断定の強さと根拠の強さを揃える (qa-187-c)**: 上記は「機序として公式記述で確認済み」であって「本番でそれが起きた」ことの確認ではない。本番の isolate 生成時刻と secret 投入時刻の前後関係は取得していないため、未ゲート経路など他の候補も併存させる。
- **設計への反映 (qa-187-d)**: 認証に関わる構築物を module scope に保持せず request ごとに解決することを acceptance に置き、module 最上位での環境値依存構築を検査で検出する。検査の説明文には「何を防ぐ検査か」(isolate 再利用による stale) を書き添える。

本設計を実行へ落とす macro feature は `feat-build-identity-deploy-freshness` (稼働ビルドの素性確認 V6 と deploy 反映鮮度検出 V7) および `feat-runtime-env-resolution-discipline` (実行時環境変数の解決規律) である。

## 2026-08-08 稼働ビルドの素性と反映鮮度 — 実装確定

上節の macro feature `feat-build-identity-deploy-freshness` を実装した。要点は 5 つ:

1. `/health` へ optional `commit` (40 桁 hex) を載せ、deploy 時 `--var HUB_COMMIT_SHA` で注入する。
2. version gate 直後に鮮度検査を置き、deploy 経路自体の長期停止を捉える。
3. 不一致ではなく HEAD 到達からの乖離継続時間で判定し、しきい値正本は script 定数 1 箇所に置く。
4. 鮮度検査失敗は rollback 対象外とする（smoke 未実行＝新版故障の証拠なし）。
5. `HarnessHub-u9zq` では、鮮度検査の後・最初の smoke の前に deployment version と `/health.version` の連続一致を再確認する。colo 間の伝播ムラ、不一致、通信失敗、version 欠落は fail-closed とし、smoke 未実行なので rollback は打たない。

契約正本: [build-identity 実装追補](../specs/harness-hub-build-identity-deploy-freshness-addendum.md) / 判断根拠: [architecture decision](../docs/features/feat-build-identity-deploy-freshness/architecture-decision.md)。本番実測は未取得であり、deploy 後に `release-record.md` へ追記する。
