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

# Security assurance — 検証・監視・incident・確定記録

> [security-spec.md](security-spec.md) の分冊。旧節番号を維持し、既存の仕様参照との対応を保つ。

## 8. 検証

### 8.1 ASVS 到達目標 (S-D2 確定)

**ASVS Level 1 を全面適用し、以下の重点領域のみ Level 2 相当を選択適用**する。未達項目は残余リスクとして本書 §1.4 に明示する (checklist 準拠の形骸化を避ける — Secure by Design カードの failure mode)。

| 領域 | 目標 | 理由 |
|---|---|---|
| 認証 (Authentication) | **L2 相当** | Device Flow の token 窃取 (T7) が公開統制の突破口になる |
| セッション管理 (Session) | **L2 相当** | 失効の意味論 (§2.1) が G4 の統制点に直結する |
| **アクセス制御 (Access Control)** | **L2 相当** | T2/T3 = マルチテナント分離の破綻は最大の被害 |
| **データ保護 (Data Protection)** | **L2 相当** | salary (PII) と `tenant_data` は保持対象の高機密データであり、封筒暗号化・分離・完全削除を外せない |
| **ログと監査 (Logging)** | **L2 相当** | G4 (統制点の一元化) の成立条件 |
| 暗号 (Cryptography) | **L2 相当** | 封筒暗号化の実装誤りは検知しにくい |
| その他の全領域 | **L1** | C1 (1 名 + AI) 下で運用可能な範囲 |
| version | 取得は C02 (`targets` に `owasp-asvs` を追加済み) で行い、version と確認時刻を `fetched-references.json` に記録する | 版を推測で固定しない |

### 8.2 CI 禁止検査 (静的)

| # | 検査 | 目的 |
|---|---|---|
| CI-1 | `Credentials` provider / `SKIP_AUTH` / `NEXTAUTH_DEV` 等の出現禁止 | §2.5 (dev 専用認証の混入防止) |
| CI-2 | `audit_events` への `update`/`delete` 呼出の出現禁止 | §5.1 (append-only) |
| CI-3 | `dangerouslySetInnerHTML` の使用箇所が共通レンダラ 1 箇所のみ | §6.2 (XSS) |
| CI-4 | secret scan (**リポジトリ全体**。`gitleaks` 等) | §4.5 |
| CI-5 | zod スキーマに `.strict()` が付いていること | §6.1 (mass assignment) |
| CI-6 | リポジトリ層関数が `TenantCtx` を受けていること (型検査で担保) | §3.6 (tenant scope) |
| CI-7 | 依存の脆弱性検査 (`pnpm audit` — 高危険度は fail) | 供給チェーン |
| CI-8 | salary を含む DTO 型が member 向け route から参照されていないこと | §4.2 |
| CI-9 | リポジトリ層の呼出が `withAuthz()` の内側からのみ行われること (route handler から直接呼ばない) | §3.1.3 (越境監査の強制)・§3.2 (単一 MW) |

### 8.3 単体・結合テスト (必須)

| # | 対象 | 内容 |
|---|---|---|
| T-1 | **認可 (§3.5)** | **全 action × 全 role × (自テナント/他テナント/owner/非 owner) の組合せを網羅**。deny-by-default を「規則の無い action は拒否」で検証 |
| T-1b | **許可表の単調性 (§3.1.1)** | 全 action について `atLeast` 順序で許可が単調に増えることを検査する。**非単調な規則が入ったら fail** (全順序という判定の前提が壊れたことを検出する) |
| T-1c | **越境の監査強制 (§3.1.3)** | provider-admin の越境 (読取を含む) で `provider.cross_tenant_access` が必ず記録されること。`withAuthz()` を経由しない DB アクセス経路が無いこと |
| T-2 | scope (§2.2.1) | `metrics:write` token で publish が拒否されること |
| T-3 | PII (§4.2) | member 向け API レスポンスに salary が**含まれないこと**。export がマスクされること。k=3 未満の部門集計が金額を返さないこと |
| T-4 | 暗号化 (§4.1) | 暗号文が復号できること。**DB 断面・export に平文が存在しないこと**。IV が再利用されないこと。AAD 不一致で復号が失敗すること |
| T-5 | 鍵ローテーション (§4.1.2) | 旧 `key_version` の行が新 KEK 適用後も復号できること |
| T-6 | 監査 chain (§5.4) | 中間行の改竄・削除・挿入を検証が**検出すること**。並行 append で seq が重複しないこと |
| T-7 | ingest (§6.4) | 時刻・金額の申告が**保存されないこと**。冪等キー重複が二重計上しないこと。`run_count` 範囲外が 422 |
| T-8 | ZIP (§6.3) | zip slip / zip bomb / 圧縮比超過 / シンボリックリンクが**拒否されること** |
| T-9 | XSS (§6.2) | `<script>` / `onerror=` / `javascript:` / `data:` を含む Markdown が無害化されること |
| T-10 | Device Flow (§2.2) | 期限切れ device_code の拒否。**refresh 再利用で family 全失効**。user_code 5 回失敗で denied |
| T-11 | セッション失効 (§2.1) | `session_revocations` 追加後の旧 JWT が拒否されること |
| T-12 | 存在秘匿 (§3.7) | 他テナントのリソース ID に対して 404 が返ること (403 でないこと) |
| T-13 | ヒアリング所有者境界 | member の一覧/詳細が自分の `applicant_user_id` だけを返し、form 内の `applicant` 改ざんで他人のシートを取得できないこと。admin は自テナント全件だけ取得できること |
| T-14 | Project/配布境界 (§6.3.1) | 作成者だけが owner になり、他 Project の publish が拒否されること。install が stable/available だけを返し、他 tenant・任意 release/R2 key 指定を 404 にすること。短命 URL は期限切れ/再利用で拒否されること |
| T-15 | tenant_data 削除完全性 (T15) | 削除後に R2 blob と DB 行が消え、tombstone manifest を削除前の backup restore に重ねても object 参照が復元されないこと。削除監査 event が 1 件だけ残ること |

### 8.4 テナント分離テスト (CI 必須・SEC3)

**独立した必須ゲート**とする (T3 が最大の被害であるため)。

| 項目 | 内容 |
|---|---|
| 方式 | 2 テナント (A/B) の完全なフィクスチャを作り、**A の principal で全 API を呼び、B の資源が 1 件も返らないこと**を検証する |
| 対象 | `tenant_id` を持つ**全テーブル**。テーブル追加時にテストが自動で対象を拾う (スキーマ駆動) |
| 網羅の担保 | **新テーブル追加時にこのテストが未対応なら CI が fail する** (テーブル一覧とテスト対象の差分検査) |
| tenant_data | R2 key は tenant/workspace/kind/object id ごとに一意。別 tenant の object は 404 とし、認可前に復号しない |
| 例外 | `documents.scope='common'` のみ (読取は両テナントから可・書込は provider-admin) |
| 頻度 | **全 PR** |

### 8.5 運用時の監視

| 項目 | 閾値・頻度 | 通知先 |
|---|---|---|
| 監査 chain 全体検証 | 日次 cron (§5.4.4) | provider-admin |
| Turso 使用量 | 日次 (既存 qa-031/qa-032) | provider-admin |
| R2 使用量 | 日次。70% warning / 90% critical を tenant-data と packages の bucket 別に評価 | provider-admin (構造化ログ) |
| `token.reuse_detected` | 即時 | provider-admin + 該当 workspace-admin |
| `metrics.anomaly` (§6.4) | 日次 | provider-admin |
| rate limit 429 の急増 | 日次 | provider-admin |
| CSP violation report | 週次サマリー | provider-admin |
| 依存の新規脆弱性 | 週次 (`pnpm audit`) | provider-admin |

### 8.6 インシデント対応 (最小)

C1 (1 名 + AI) 下で実行可能な最小手順のみを定める。

| 事象 | 手順 |
|---|---|
| Publisher token 窃取の疑い | Hub Web から該当 token を失効 (即時) → `publisher_tokens` の family 全失効 → 監査確認 |
| KEK/DEK 侵害の疑い | KEK ローテーション (§4.1.2) → DEK ローテーション → 全 session 失効 (`AUTH_SESSION_SECRET` 更新) |
| テナント IdP secret 漏洩 | 顧客と合意して IdP 側で secret 再発行 → Hub の `idp_connections` 更新 (監査 event) |
| 監査 chain 不一致検出 | 該当テナントの監査画面に警告表示 → 提供者が原因調査 → 顧客管理者へ通知 |
| 不正 package の公開判明 | `release.suspend` (即時) → `channel.rollback` → 監査 event → 影響 Workspace へ通知 |

### 8.7 構築順に対する security gate

| phase | その phase を開始する前の必須条件 |
|---|---|
| **P0 認証** | SSO/session・Device Flow・単一認可 MW・tenant scope・deny-by-default・失効・監査 logger を完成させる。dev bypass は不可 |
| **P1 ヒアリング** | `sheets.create/read_own/read_all/status_change` と T-13 を通す。salary 原値を一覧・詳細・PDFへ出さない |
| **P2 Hub/パイプライン** | `projects.create/update`、upload の session/Bearer 両経路、ZIP 検査、`harnesses.install` と T-14 を通す。R2 の直接公開は禁止 |
| **P3 以降** | 同じ middleware/tenant repository を流用し、新 action は許可表と全 role テストを同時追加する |

管理者 UI (S17/S05/S06) の実装が P4/P5 でも、admin/member の認可判定は P0 から有効にする。「後から role を付ける」移行は許可しない。

## 9. backend-spec.md への反映差分 (本書で確定し反映済み)

| # | backend-spec.md の箇所 | 変更 |
|---|---|---|
| 1 | §2.2 `idp_connections` | `client_secret_ref` (Workers Secret 参照名) → `client_secret_enc` (封筒暗号化)。「暗号化方式は feature P02」を解消 (§4.3) |
| 2 | §2.2 `audit_events` | `seq` / `prev_hash` / `event_hash` を追加 (§5.4) |
| 3 | §2.2 (新規) | `encryption_keys` テーブルを追加 (§4.1.1) |
| 4 | §2.2 (新規) | `session_revocations` テーブルを追加 (§2.1) |
| 5 | §2.2 `publisher_tokens` | `scopes_json` の値域を §2.2.1 の現行5 scopeに確定 (`docs:write` は2026-08-12追加) |
| 6 | §3.2 | session/token の TTL 数値を §2.1/§2.2 で確定 |
| 7 | §3.7 | 「数値は feature P02 で確定」→ §7.2 の確定値へ置換 |
| 8 | §3.8 | `user.salary_read` / `idp.connection_change` / `token.reuse_detected` / `provider.cross_tenant_access` を追加 (§5.2) |
| 9 | §7 (cron) | 監査 chain 日次検証を追加 (§5.4.4) |
| 10 | §3.3 (許可表) | 表が**単調である**ことを仕様上の前提として明示し、T-1b が検査する (§3.1.1) |
| 11 | §2.2 `workspaces` | 「共有・権限の境界」→ **「共有・カタログの境界 (権限の境界は tenant)」** へ修正 (§3.1.2 の矛盾解決) |

## 10. 確定記録

- **2026-07-17**: `/spec-hearing-start` の往復ヒアリング (R4-reopen → R2-interview) で S-D1〜S-D8 をユーザー確認により確定。対象セル: `security.{web,desktop-windows,desktop-macos}` / `auth.{web,desktop-windows,desktop-macos}` / `database.web` / `backend.web`。
- **2026-07-18**: 継続ヒアリング (qa-036/qa-037) で 4 論点 — ASVS 到達目標 (L1 全面 + 重点領域 L2 = §8.1)・セッション/トークンの失効反映 ≤15 分 (§2.1/§2.2)・rate limit 確定テーブル (§7.2)・nonce ベース strict CSP (§7.1) — を AskUserQuestion で再提示し、ユーザーが再確認 (いずれも本書の確定内容と一致)。spec-state の確定登録: `auth.web` = qa-036、`database.web`/`backend.web` = qa-037 (並行セッション登録)、`auth/security の desktop-windows・desktop-macos` = qa-041、`security.web` = qa-042 (並行ヒアリングとの qa 採番衝突を修復して再登録)。本書 frontmatter を `status: confirmed` へ更新。
- **2026-07-18 (C4 改訂追従)**: qa-050 で確定済みの C4 改訂 delta (qa-045/qa-046・appr-007) を本文へ転記 — §1.2 に業務データ 2 種 (最高機密区分) を追加、§1.3 に T14 (保持業務データのテナント越境読取)・T15 (削除不完全による残存) を追加、§1.4 の旧 N2 を撤回済へ更新。新規の内容変更ではなく確定済み qa の転記漏れ是正 (R4-reopen 不要)。業務データ delta の DDL・検証手順の全面展開は qa-046 の据置どおり feature P02 前の security 深掘りで実施する。
- **2026-07-25**: `HarnessHub-l2g9` の R4-reopen とユーザー確認 (`appr-010`) により、session claims の `workspace_ids` を `qa-072`、Device Flow polling の上限 60 秒・−5 秒減衰を `qa-073` として再確定。今後も本書の内容変更には `system-spec/spec-state.json` の確定セルに紐づく R4-reopen (根拠付き) が必要。
