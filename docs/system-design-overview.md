---
status: draft
layer: system-wide-design
sources: [system-spec/00-requirements-definition.md, system-spec/index.md]
---

# Harness Hub システム全体設計 (段階 0 / 横串) — 目次と構成図

> 本書は**参照型**: 要件・数値・技術決定の正本は `system-spec/` (憲法)。ここには「全体の形」だけを書き、正本の内容を複製しない。
> 4 部構成: 本書 (構成図・データフロー・全体タスクマップ) / [user-journeys.md](user-journeys.md) / [screen-inventory.md](screen-inventory.md) / [shared-layers.md](shared-layers.md)

## 1. システム構成図 (コンテナレベル)

```mermaid
graph LR
    subgraph 作者環境["作者環境 (macOS / Windows)"]
        CC["Claude Code / Codex<br/>+ Publisher plugin<br/>(qa-010)"]
        WR["wrangler CLI<br/>(WebApp deploy 実行)"]
    end
    subgraph 顧客側["顧客 IdP / Cloudflare (Hub 外部境界)"]
        IDP["顧客 IdP<br/>(Google Workspace /<br/>Entra ID)"]
        CFA["顧客 Cloudflare<br/>(公開 WebApp)"]
    end
    subgraph Hub["Hub (Cloudflare Workers 1 個 / D1 決定)"]
        UI["Hub Web UI<br/>(Next.js App Router SSR)"]
        API["Hub API<br/>(Route Handlers + zod)"]
        MW["認可ミドルウェア (単一層)<br/>Tenant/Workspace scope 強制<br/>(qa-006 / qa-020 / D4)"]
    end
    DB[("Turso (libSQL)<br/>control-plane DB<br/>(D2)")]
    R2[("R2<br/>immutable<br/>PackageRegistry<br/>+ DB backup")]
    USR["利用者ブラウザ<br/>(member / admin)"]
    CLI2["利用者の Claude Code<br/>(URL 型 marketplace /<br/>Bootstrap Installer, I6)"]

    CC -->|"Device Flow 認証 (qa-008)<br/>publish API"| API
    CC --> WR -->|deploy| CFA
    USR --> UI
    USR -.->|SSO redirect| IDP
    UI --> API
    API --> MW --> DB
    API --> R2
    CLI2 -->|package 取得| API
    USR -->|Web アプリを開く| CFA
```

- Hub は**単一 Worker** (UI + API 同居、D1 決定)。分割しない理由 = C1 (個人運用) と D1 の確定内容。
- C4 改訂 (qa-045〜048 / appr-007) により、Hub は顧客の業務ナレッジ・ドキュメントと harness 実行入出力を `tenant_data` として保持できる。R2 ではテナント別 DEK の封筒暗号化を必須とし、削除要求では R2 blob・DB row・backup 断面を即時完全削除する。顧客業務システムへの接続 credential と WebApp runtime は引き続き保持しない。WebApp は顧客側 Cloudflare で動き、Hub は URL 登録・公開範囲検査・health 確認のみを担う (I5)。

## 2. 主要データフロー (どのデータがどこで生まれ、どこに置かれるか)

| フロー | 経路 | 正本の置き場 | 根拠 |
|---|---|---|---|
| 公開 (publish) | Publisher → API → 検査 pipeline → Green なら Release 確定 | package 実体 = R2 (immutable)、メタ = Turso | I2, I3 |
| 公開ポインタ | Promote / Rollback = TargetChannel の stable pointer 差替のみ | Turso (pointer)、R2 は不変 | I3 |
| catalog 閲覧 | ブラウザ → UI (SSR) → API → Turso | Turso (CatalogEntry) | I4 |
| package 導入 | 利用者 Claude Code → marketplace URL → API → R2 | R2 | I6 |
| テナント業務データ | S12/S15 → API → tenant scope・認可 → 暗号化 → R2。削除時は DB/R2/backup を同時に消去 | メタ = Turso、暗号文 = R2 | qa-045〜048, appr-007 |
| 監査 | 全変更操作 → 監査 event 書込 (append-only) → Stage 2 で画面/export | Turso (監査 event) | I8 |
| バックアップ | Turso 日次 export → R2 保存 → 四半期 restore drill | R2 | qa-019 |

## 3. 全体タスクマップ (何をやらないといけないかの地図)

横 = 15 feature (既存 8 + Studio 追加 6 + C4 改訂 1 の縦串)、縦 = 成果物の種類。各セルの詳細設計は該当 feature の P02 task で行う (ここでは所在だけを固定する)。

| feature | 画面 (screen-inventory 参照) | API / ドメイン | 共通層への依存 (shared-layers 参照) |
|---|---|---|---|
| feat-stage0-distribution-gate | なし (検証レポートのみ) | なし (H3/H6/H7 検証) | なし (最初に単独実行可) |
| feat-hub-foundation | 共通レイアウト・エラー/縮退表示 | /health, プロジェクト骨格 | **共通層すべての実装 owner** |
| feat-domain-model-db | なし | Tenant/Workspace/Project/Release/TargetChannel/CatalogEntry/PublishRequest/監査event のスキーマと repository | repository 層, zod schemas |
| feat-auth-tenancy | S07 サインイン, S08 Device 承認 | Auth.js OIDC 動的解決, Device Flow, role 4種 (qa-005) | 認可 MW, auth adapter |
| feat-tenant-data-retention | S12 実行入出力 / S15 添付への保管導線 | tenant_data_objects CRUD、R2 封筒暗号化、即時完全削除、使用量監視 | repository 層, 認可 MW, PII/tenant_data guard |
| feat-publish-pipeline | なし (状態は S03 が表示) | PublishRequest 状態機械, 検査 (Green/Yellow/Red), Release 採番, promote/rollback | 検査共有 package, 監査 logger |
| feat-publisher-plugin | なし (CLI/plugin 対話面) | Hub API クライアント, wrangler スクリプト実行, URL 登録 | 検査共有 package (ローカル pre-check) |
| feat-dual-catalog-web | S01 一覧, S02 詳細, S03 公開状態, S04 Workspace 設定 | catalog 読取 API, 低品質報告, 更新通知 | design system, 認可 MW |
| feat-workspace-governance | S05 承認キュー, S06 監査ログ | approval queue, granular RBAC, audit export, Yellow review | 認可 MW, 監査 logger |

### Studio mockup 反映による feature 追加 (2026-07-17 追加 → 要件層反映済み。6 feature とも P01 要件ベースライン確定 = [docs/features/](features/) 配下)

| feature | 画面 (screen-inventory) | API / ドメイン | 共通層への依存 |
|---|---|---|---|
| feat-metrics-tracking | S09 ダッシュボード, S16 利用・削減効果 | 実行ログ ingest (B2)・rollup (B3)・MetricsEvent | 試算エンジン, チャート部品 |
| feat-hearing-intake | S10 ヒアリング, S11/S12 シート | HearingSheet/FormData API・受付番号採番 | AI 処理キュー (D5), ウィザード部品 |
| feat-build-pipeline-board | S13 構築パイプライン | Build (7 stage)・工程操作 (admin) | ステージボード部品, 監査 logger |
| feat-feedback-loop | S14 改善要望・レビュー | Feedback (CLI+Web 2 経路)・status 遷移 | AI 処理キュー (D5), Markdown 部品 |
| feat-docs-cms | S15 ドキュメント | Doc (common/tenant scope)・AI 下書き | Markdown 部品 (XSS sanitize), AI キュー |
| feat-user-org-admin | S17 ユーザー管理, S18 アカウント設定 | User CRUD・role・係数設定・通知設定 | PII ガード, 試算エンジン, 通知ディスパッチ |

依存の向き: いずれも feat-hub-foundation / feat-domain-model-db / feat-auth-tenancy の下流。feat-metrics-tracking は feat-user-org-admin (年収データ) に、feat-feedback-loop は feat-publish-pipeline に依存する。

### 構築優先順位 (2026-07-18 ユーザー確定 — 本節が優先順位の正本)

> ユーザー指示 (2026-07-18): 「認証を最初に構築して他の全ページで反映」「最優先 = ヒアリング (シート作成・一覧・詳細) と、ハーネスをアップロード/管理/ダウンロードできるプラグイン Hub + 構築パイプライン」「次 = 改善要望レビュー・ドキュメント管理」「その次 = ユーザー・利用削減効果」「ダッシュボードは低優先」「管理者/一般の分離 (画面) は低優先で OK」「マルチシステム前提」。
> 本書でいう**マルチシステム**は、(1) 複数 Tenant/Workspace を安全に分離するマルチテナント、(2) 1 Workspace 内で複数 Project と複数の公開出口 (`skill` / `web_app`、将来の追加 target) を同じ Hub で扱うこと、の両方を指す。特定 1 社・1 ハーネス・1 target をコードへ固定しない。
> 画面単位の優先度は [screen-inventory.md](screen-inventory.md) の優先度列、実装順への展開は frontend-spec §10 / backend-spec §10、feature 単位の逆引きは [features/README.md](features/README.md) を参照する。

| phase | 対象 feature | 画面 | ねらい・備考 |
|---|---|---|---|
| **P0 基盤 (最初)** | feat-stage0-distribution-gate + feat-hub-foundation / feat-domain-model-db → **feat-auth-tenancy (認証)** → feat-tenant-data-retention | S07 サインイン / S08 Device 承認 / 共通シェル (+ S04 のうち IdP 接続登録のみ先行) | Stage 0 配布検証と最小 scaffold/DB は認証を載せる技術前提として先行・並行可。ただし **Auth Gate (SSO、tenant scope、deny-by-default、共通 route guard) が通るまで P1 以降の保護画面へ着手しない**。認証後に tenant_data 保管契約を確立し、S12/S15 はその API を任意統合できる |
| **P1 ヒアリング (最優先)** | feat-hearing-intake | S10 ウィザード / S11 シート一覧 / S12 シート詳細 | 作成 → 受付番号 → AI 生成 (D5 キュー) → 一覧/詳細で結果確認までを 1 slice で閉じる。S11 は status/title/domain/department/対象人数・工数/申請者/更新日、S12 は生成本文・入力 snapshot・試算 snapshot・生成状態・build 導線を持つ |
| **P2 プラグイン Hub + 構築パイプライン (最優先)** | feat-publish-pipeline → feat-publisher-plugin / feat-dual-catalog-web → feat-build-pipeline-board | S01 一覧 + 公開ウィザード / S02 詳細・管理・導入 / S03 公開状態 / S13 パイプライン | S01 から CLI 取込または ZIP 代替 upload → 検査・公開 → S02 で版/状態を管理 → 安定版を install/download できるまでを 1 slice で閉じる。S13 の公開工程は PublishRequest に接続し二重状態を持たない |
| **P3 改善ループ・ドキュメント** | feat-feedback-loop / feat-docs-cms | S14 改善要望・レビュー / S15 ドキュメント | フィードバック 2 経路受付と AI 対応、社内ナレッジ CMS |
| **P4 ユーザー・効果測定** | feat-user-org-admin / feat-metrics-tracking (S16 まで) | S17 ユーザー管理 / S18 アカウント設定 / S16 利用・削減効果 | 年収 (PII) と係数はここで投入。metrics ingest (B2)・rollup (B3) も S16 と同時 |
| **P5 ダッシュボード・統制 (低)** | feat-metrics-tracking の残り / feat-workspace-governance | S09 ダッシュボード / S05 承認キュー / S06 監査ログ | S09 は rollup が蓄積された後に仕上げる。管理者向け統制画面 (granular RBAC・承認キュー・監査 UI) も低優先 |

- **「管理者/一般の分離を後回し」の正確な意味**: role 4 種と認可ミドルウェア (deny-by-default) の**枠組みは P0 で最初から入る** (画面の出し分け・admin 限定操作に必要)。優先度を下げるのは S17 ユーザー管理 UI や S05/S06 統制画面という**画面側**であり、認可制御そのものではない。
- **phase 内の依存順**: `publish-pipeline → publisher-plugin / dual-catalog-web → build-pipeline-board`、`hub-foundation + domain-model-db + auth-tenancy → tenant-data-retention`、`user-org-admin → metrics-tracking`。矢印は「左が先に契約を供給し、右が消費する」を表す。同じ phase でもこの順を逆転しない。`publisher-plugin` と `dual-catalog-web` は並列であり、相互依存しない。
- **完了判定**: 各 phase は API だけ、画面だけ、一覧だけでは完了としない。P1 は「作成→一覧→詳細」、P2 は「upload→検査/公開→管理→install/download」と認証・テナント分離テストが端から端まで通った時点で完了とする。

## 4. 本書で「書かない」もの (境界の宣言)

- **対象外 platform**: native モバイル / タブレット / Linux desktop (収集マトリクスで理由付き対象外確定済み)
- **Stage 3-5 の構想** (独自 runtime, deployment engine, 公開 marketplace, 収益分配, Result Dashboard): U7 対象外。設計しない
- **ER 図のカラム定義・API スキーマ・画面ワイヤーフレーム**: 縦串 P02 (各 feature の architecture task) の成果物。横串には書かない
- **技術選定の理由・比較**: D1-D4 (要件定義書の意思決定表) に確定済み。再説明しない
- **品質数値 (WCAG 2.2 AA / CWV good / SLO 99.5%)**: qa-018 / qa-019 が正本。参照のみ
