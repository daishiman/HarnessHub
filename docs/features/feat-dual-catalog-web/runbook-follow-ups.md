---
status: confirmed
layer: feature-runbook
---

# feat-dual-catalog-web 運用注意点・follow-up

本書は [runbook.md](./runbook.md) から、導入数の解釈、既知の注意点、P13 以降の残課題と引き継ぎを分離したもの。

## 1. 更新に伴う導入数の扱い

更新のたびに「追加する」を押し直すと `download_count` が増える。
**導入数は「導入操作の回数」であり「現在の利用者数」ではない**。KPI として使う場合はこの差を明示すること。

## 2. 運用時の既知の注意点

| # | 事象 | 説明 |
|---|---|---|
| 1 | `/catalog/releases` は `releases` という `project_id` の詳細を開けない | Next.js は静的セグメント `releases` を動的セグメント `[projectId]` より優先する。現在の識別子生成規則では衝突しないが、規則変更時に衝突しうる (§3-5) |
| 2 | 一覧が自動更新されない | 仕様 (ADR §2.2)。常時通信しないことで CWV と無料枠を温存している |
| 3 | API 未実装環境では常時縮退バナー | 仕様 (runbook §4.2)。障害ではない |
| 4 | 導入数が実導入数より多く出ることがある | runbook §1.3 / 本書 §1 |

## 3. follow-up (P13 以降・他 feature へ引き継ぐ)

| # | 項目 | 内容 | 前提 |
|---|---|---|---|
| 1 | **低品質報告導線** | I4 が本 feature の責務として列挙するが**未実装**。S02 詳細へ `/feedback?harness=<projectId>` 相当の導線を追加する | S14 (`/feedback`) の実装 (feat-feedback-loop, P3)。リンク先が無い今追加すると 404 になるため保留 (P10 §4.3) |
| 2 | **SLO への CWV 反映** | `apps/hub/monitoring/slo-dashboard.json` に CWV panel が無い。`cwv-evidence` を入力とする panel と閾値を追加する | 本 feature の Write scope 外。feat-hub-foundation 所管 |
| 3 | **CWV 計測経路の欠落** | 本番反映後に `cwv.yml` を `/catalog` 指定で実行したが、**未認証で 401 のため Lighthouse が読めず計測不能** (2026-08-02 / run `30736055772`)。`cwv.yml` に認証済みセッションを与えるか、計測可能な到達経路を用意しないと acceptance 2 は永久に未達 | `cwv.yml` は feat-hub-foundation 所管で本 feature の Write scope 外。旧版を測って good と記録しないこと |
| 4 | **E2E (Playwright)** | 画面遷移・タブ切替・縮退時の導線を通しで検証する | 導入は Write scope 外 |
| 5 | **route 命名の drift** | `frontend-spec.md` は `/harnesses`、実装は `/catalog`。どちらかへ寄せる | frontend-spec の更新権限 |
| 6 | **push 型 update 通知** | 本 feature には存在しない。Stage 2 で実装する | feat-workspace-governance / feat-feedback-loop |
| 7 | **テナントヘッダ定数の一元化** | middleware と adapter の同じ header 名を DC-TEN-03 で照合中。client bundle risk を評価後に統合する | G13 予算の余裕 |

## 4. P13 への引き継ぎ

- runbook の 4 必須項目 (利用者/管理者手順、marketplace 形式、縮退、更新通知) は記載済み。
- acceptance 2 (CWV good) は未計測のため、P13 で完了と記録しない。
- リリース時は最初に `marketplace.json` の `source_status` を確認する。`pending-h7` の間はカタログ画面を使えても配布出口は空である。
