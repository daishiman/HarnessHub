---
status: confirmed
qa_ref: [qa-037, qa-042, qa-045, qa-046, qa-048, qa-050, qa-061, qa-072, qa-073, qa-074, qa-075]
layer: implementation-spec
sources:
  - system-spec/security.md
  - system-spec/auth.md
  - system-spec/00-requirements-definition.md
  - docs/backend-spec.md
  - docs/mockups/harness-studio-v2-analysis.md
doctrine_anchor: OWASP ASVS + Secrets Management Cheat Sheet
serves_goals: [G1, G2, G3, G4, G5]
---

# Security foundations — 前提・設計判断・脅威モデル

> [security-spec.md](security-spec.md) の分冊。旧節番号を維持し、既存の仕様参照との対応を保つ。

## 0. 前提と確定根拠

### 0.1 不変制約 (要件定義書より)

| id | 制約 | security への含意 |
|---|---|---|
| C1 | 実装・運用は提供者 1 名 + AI | 検証・運用の負荷が 1 名で回る範囲に control を絞る。security theater を避ける |
| C2 | 固定費を極小化・顧客数に固定費が比例しない | テナント追加が提供者の手作業を要する設計を採らない (→ §4.3 の IdP secret 方式の根拠) |
| C4 | Hub は顧客業務データを保護条件付きで保持できるが、顧客業務システムへの接続 credential と Web App runtime は保持しない | `tenant_data` はテナント別封筒暗号化・認可後復号・即時完全削除を必須とする。`users.salary` も保持例外ではなく要保護 PII として §4.2 で保護する |

### 0.2 上流指針 (doctrine anchor)

OWASP ASVS + Secrets Management Cheat Sheet (`https://owasp.org/www-project-application-security-verification-standard/`)。到達目標は §8.1。

### 0.3 本書で確定した設計判断 (2026-07-17 ユーザー確認)

| # | 論点 | 確定 | 主根拠 |
|---|---|---|---|
| S-D1 | security 詳細正本の配置 | `docs/security-spec.md` を新設し `system-spec/security.md` から参照 | backend-spec / infrastructure-spec と対称 |
| S-D2 | 検証の到達目標 | **ASVS L1 全面 + 重点領域のみ L2 相当** | C1 下で運用可能な範囲に検証投資を集中 |
| S-D3 | rate limit / TTL の数値 | **本書で確定値として定める** (feature P02 は実測に基づく調整のみ) | 「security 仕様をすべて記述」の要求 |
| S-D4 | 開発・デモ時の認証 | **提供者の Google Workspace を dev tenant の OIDC として使用** | 認証経路を 1 本に保ち dev 専用コードの本番混入をゼロにする |
| S-D5 | テナント別 IdP client_secret | **DB へ封筒暗号化保存 (KEK は Workers Secret 1 本)** | テナント追加が DB 書込だけで完結 (C1/C2) |
| S-D6 | audit_events の改竄防止 | **アプリ層 append-only + hash chain** | 低コストで改竄検知性を得る。提供者自身の再計算は残余リスクとして明示 (§5.4) |
| S-D7 | 実行ログ ingest の認証 | **Device Flow token を scope 分離して利用** (`metrics:write`) | token 発行・失効導線を 1 本に保つ |
| S-D8 | 暗号鍵のローテーション | **封筒暗号化 (KEK/DEK)** | KEK 更新が DEK 再暗号化だけで済み、全行再暗号化が不要 |
| S-D9 | provider-admin のテナント越境 | **許可 + `crossTenant` 監査強制** (§3.1.3) | break-glass は自己承認になり統制として機能しない (C1)。透明性で統制する |
| S-D10 | workspace-admin の実効範囲 | **tenant 単位** (§3.1.2) | `users` に workspace 所属列が無く、認可判定で突合する対象が存在しない |

> S-D9/S-D10 は本書の執筆中に、`resolveEffectiveRole` (§3.5) の実装を通じて確定した。特に **S-D10 は既存確定どうしの矛盾** (`workspaces` = 「共有・権限の境界」 vs `users` に workspace 所属列なし) を露呈させたもので、本書で「workspace は権限の境界ではない」と解決した。

## 1. 脅威モデル

### 1.1 信頼境界

```
[作者/利用者ブラウザ] --(1)--> [Hub Web/API (Cloudflare Workers)] --(2)--> [Turso (control plane DB)]
                                        |                                 --(3)--> [R2 (package/backup)]
[Publisher CLI / AI worker] --(4)------>|
[顧客 IdP (Google/Entra)] --(5)-------->|
                                        |--(6)--> [Resend (メール)]
[ハーネス実行環境 (顧客端末)] --(7)---->|  (metrics ingest / feedback)
```

| 境界 | 内容 | 主要 control |
|---|---|---|
| (1) | ブラウザ ↔ Hub | OIDC session (§2.1)・CSP (§7.1)・CSRF (§7.3)・認可 MW (§3) |
| (2) | Hub ↔ DB | tenant scope 強制注入 (§3.6)・封筒暗号化 (§4)・append-only (§5) |
| (3) | Hub ↔ R2 | immutable package (content hash)・監査断面 |
| (4) | CLI/AI worker ↔ Hub | Device Flow token + scope (§2.2) |
| (5) | Hub ↔ 顧客 IdP | issuer 固定検証 (§2.3)・client_secret 封筒暗号化 (§4.3) |
| (6) | Hub ↔ Resend | API key は Workers Secret binding のみ・PII 非送信 (§4.5) |
| (7) | 顧客端末 ↔ Hub | サーバ時刻採用・冪等キー・回数のみ受理 (§6.4) |

### 1.2 保護資産と影響

| 資産 | 機密性 | 完全性 | 可用性 | 侵害時の影響 |
|---|---|---|---|---|
| `users.salary` (年収 PII) | **高** | 中 | 低 | 個人情報漏洩。顧客との信頼喪失・法的責任 (G4 毀損) |
| テナント IdP client_secret | **高** | 高 | 中 | 顧客 IdP へのなりすまし。被害が顧客側へ波及 |
| control plane データ (Project/Release/Catalog) | 中 | **高** | 中 | 不正な業務ツール配布 (供給チェーン攻撃の起点) |
| audit_events | 中 | **高** | 中 | 統制点の否認可能性。G4 (統制点の一元化) が成立しなくなる |
| metrics_events / rollups | 低 | **高** | 低 | 削減効果の捏造。G5 (効果の可視化) が意思決定を誤らせる |
| Publisher/ingest token | **高** | 高 | 中 | なりすまし publish・偽メトリクス投入 |
| 顧客業務ナレッジ / ドキュメント (`tenant_data`) | **最高** | 高 | 中 | 顧客の内部業務情報の漏洩。C4 改訂 (qa-045〜048・appr-007) で保持対象となった最高機密区分 |
| ハーネス実行の入出力データ (`tenant_data`) | **最高** | 高 | 中 | 顧客業務の生データ漏洩。同上 (C4 改訂で保持対象・最高機密区分) |

### 1.3 STRIDE × abuse case (対策と検証先)

| id | 脅威 (STRIDE) | abuse case | 対策 | 検証 |
|---|---|---|---|---|
| T1 | Spoofing | 攻撃者が他テナントの利用者になりすまして Hub にログインする | OIDC の issuer/aud/nonce 検証 + tenant 束縛 (§2.3) | §8.3 認証テスト |
| T2 | Elevation of Privilege | member が API を直接叩いて `sheets status 変更`・`係数変更` を行う | 単一 MW の deny-by-default + 許可表 (§3.3)。画面側の非表示に依存しない | §8.3 認可テスト (全 action × 全 role) |
| T3 | Information Disclosure | **テナント A の利用者がテナント B のシート/ハーネス/監査を読む** | 全クエリへの tenant scope 強制注入 (§3.6) | §8.4 **分離テスト CI 必須** |
| T4 | Information Disclosure | **member が同僚の年収 (salary) を API レスポンスから取得する** | 列レベル認可 + DTO 境界での除外 + 封筒暗号化 (§4.2) | §8.3 PII テスト |
| T5 | Tampering | 利用者が実行回数を水増しして削減効果 KPI を捏造する | 回数のみ受理・係数/金額はサーバ計算・冪等キー・サーバ時刻 (§6.4) | §8.3 ingest テスト |
| T6 | Tampering | **提供者/攻撃者が audit_events を書換えて統制の証跡を消す** | アプリ層 append-only + hash chain (§5) | §8.3 監査 chain 検証 |
| T7 | Spoofing | 窃取した Publisher token で不正な業務ツールを publish する | 短命 access token + refresh rotation + 再利用検知 + 失効導線 (§2.2) | §8.3 token テスト |
| T8 | Tampering | 悪意ある package (zip slip / secret 混入 / 巨大展開) を公開する | ZIP 検査 (§6.3) + secret scan + skills-only 制限 + Green/Yellow | §8.3 package 検査テスト |
| T9 | Tampering | doc / feedback の Markdown に script を埋めて他利用者のセッションを奪う | 共通レンダラの allowlist sanitize (§6.2) + CSP (§7.1) | §8.3 XSS テスト |
| T10 | Elevation of Privilege | AI job の payload に指示を注入し AI worker に想定外の書戻しをさせる | payload の data 化 + 書戻し先の job 束縛 + scope 限定 (§6.5) | §8.3 AI job テスト |
| T11 | Repudiation | 提供者 (provider-admin) が顧客データへアクセスした事実を否認する | provider-admin 操作も監査対象 + 顧客管理者が自テナント監査を閲覧可能 (§5.3) | §8.3 監査テスト |
| T12 | Denial of Service | Device Flow / ingest への大量リクエストで無料枠を枯渇させる | rate limit (§7.2) + 冪等キー + 使用量監視 | §8.5 |
| T13 | Information Disclosure | DB / バックアップ断面の流出で salary・client_secret が平文で読まれる | 封筒暗号化 (§4)。export・R2 断面にも平文を残さない | §8.3 暗号化テスト |
| T14 | Information Disclosure | **テナント A の利用者/管理者が保持業務データ (tenant_data) をテナント越境で読む** | purpose=`tenant_data` の封筒暗号化 (§4) + D4 row-level + R2 tenant prefix 分離。認可 MW 通過後のみ復号 | §8.4 分離テスト (業務データ越境読取ケース) |
| T15 | Information Disclosure | **削除不完全により、削除操作後も業務データが R2 実体・DB 行・バックアップ断面に残存する** | 即時完全削除 + 削除監査 event + restore drill での非復元確認 | §8.3 削除完全性テスト (R2 実体・DB 行・キャッシュ) |

### 1.4 明示的な非目標 (残余リスクとして受容)

| # | 内容 | 受容理由 |
|---|---|---|
| N1 | 提供者 (DB 直接アクセス保持者) による監査の完全な改竄防止 | hash chain は検知性を上げるが、chain 全体の再計算は防げない。外部 WORM は C1 の運用負荷に見合わない (§5.4) |
| ~~N2~~ | ~~顧客業務データの保護~~ | **撤回済 (qa-046・C4 改訂 2026-07-18・appr-007)**。Hub は業務ナレッジ/ドキュメントとハーネス実行入出力を保持できるため非目標から対策対象へ変更 (T14/T15)。業務システム接続 credential は引き続き非保持 |
| N3 | ハーネス実行環境そのものの安全性 | Hub は package の検査と配布統制のみを担う。実行時サンドボックスは Claude Code 側の責務 |
| N4 | 独自 MFA / パスワードポリシー | D3 により IdP の責務 (§2.4) |
