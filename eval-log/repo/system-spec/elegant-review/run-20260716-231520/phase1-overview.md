# Phase 1 俯瞰レポート（elegant-reset-observer）

対象: system-spec/（12ファイル）
run: run-20260716-231520

## 1. 全関連ファイル列挙

| パス (system-spec/ 配下) | 概算行数 | 一言サマリ |
|---|---|---|
| index.md | 54 | 8章×6プラットフォームの収集マトリクス索引。全章「確定」。14件の技術出典一覧 |
| 00-requirements-definition.md | 85 | 憲法。U1-U9 (目的/背景/ゴールG1-G4/目標O1-O4/成功基準/関係者/スコープ/制約C1-C4/意図I1-I9) + 意思決定D1-D3 |
| database.md | 71 | 収集状態表 + DDD汎用知識カードのみ。スキーマ・採用DBの記載なし |
| auth.md | 71 | 収集状態表 + Secure by Design汎用カードのみ。認証フロー・role定義の記載なし |
| ui-ux.md | 32 | 収集状態表のみ。「resource-map未定義。選定・深化してから確定する」の保留注記のまま confirmed |
| security.md | 71 | 収集状態表 + Secure by Design汎用カードのみ。脅威モデル未展開 |
| infrastructure.md | 32 | 収集状態表のみ。ui-ux と同じ resource-map 未定義注記のまま confirmed |
| backend.md | 155 | 収集状態表 + 汎用カード3枚 (Clean Architecture / API Design Patterns / DDD)。API仕様の実体なし |
| frontend.md | 69 | 収集状態表 + Clean Architecture汎用カードのみ |
| maintenance-ops.md | 71 | 収集状態表 + Clean Code汎用カードのみ。runbook未展開 |
| fetched-references.json | 145 | 14技術 (Next.js 16.2.10 / TS 7.0 / pnpm 11 / zod 4 / Turso / Drizzle / Auth.js / CF Workers・R2・D1 / OpenNext / wrangler / GH Actions / claude-code-plugins) の出典・バージョン・注意事項 |
| spec-state.json | 1031 | 事実上の正本。マトリクス状態 + qa_log (qa-001〜015、実質的な仕様決定の全文) + approval_log + reopen_log + requirements_foundation + decisions D1-D3 詳細 |

## 2. 俯瞰レポート

**目的**: HarnessHub — 非エンジニアの業務当事者が AI (Claude Code / Codex) で作った解決物 (skill package / Web App) を、Git・PR・CI を意識せず 1 操作で社内公開・更新・rollback できるマルチテナント社内配布ハブ。North Star は「owner 以外の同僚による再利用の成立」(G2)。Stage 0 (technical gate 検証) 〜 Stage 2 (Governance) が仕様化スコープ。

**技術構成** (qa_log / D1-D3 から): Hub 本体 = Next.js App Router + TypeScript を @opennextjs/cloudflare で Cloudflare Workers 1 Worker として実行 (D1)。control-plane DB = Turso Free (libSQL) + Drizzle ORM、SQLite 方言互換を保ち D1 への退避経路を温存 (D2、AI推奨と異なるユーザー決定)。SkillPackage 実体 = R2 (immutable content-addressed)。認証 = Auth.js + テナント別 OIDC (顧客既存 IdP へ委譲、独自アカウント基盤なし、role 4種) (D3)。Publisher = TypeScript 製 Claude Code / Codex plugin、OAuth Device Flow で Hub API 認証、Web App 出口は作者 local session での wrangler 実行。API = REST + zod 単一ソースから OpenAPI 生成。pnpm 固定 (npm 禁止)。CI/CD = GitHub Actions。費用ゼロ (無料枠のみ) 制約。

**仕様書群の構造**: 「index (マトリクス) → 要件定義 (憲法) → 8技術章」の3層に見えるが、実際の仕様内容 (エンティティ・状態機械・認証方式・運用方針) は spec-state.json の qa_log 回答文に集中しており、各技術章の本文は「プラットフォーム別収集状態表 + プロジェクト非固有の設計知識カード」で構成される。つまり Markdown 章は状態管理の器で、実体は JSON 側にあるという逆転構造。加えて qa-006/009/011 は「詳細は仕様書コンパイル時に展開」と後工程を予告しており、本ディレクトリは中間生成物として読める。

## 3. 第一印象の懸念点リスト (19件)

1. **技術章本文の空洞化** (database/auth/security/backend/frontend/maintenance-ops.md): 各章はシステム固有の仕様を含まず、決定内容は spec-state.json の qa_log にのみ存在する。
2. **DBスキーマ不在** (database.md): Tenant/Workspace/Project/TargetChannel/Release/CatalogEntry/PublishRequest/監査event のテーブル定義・ER・不変条件が章に記載されていない (qa-002/004 の回答文のみ)。
3. **認証仕様の章内不在** (auth.md): Auth.js+テナント別OIDC・Device Flow・role 4種・JWTセッションという qa-005/008 の決定が章本文に反映されていない。D3 caveat が要求した「セッション失効・role変更反映遅延の許容時間の仕様化」も未実施。
4. **保留注記のまま確定** (ui-ux.md): resource-map 未定義注記のまま status: confirmed。初期4画面 (qa-007) の画面仕様・遷移・レスポンシブ基準が未記述。
5. **同上** (infrastructure.md): 環境構成 (dev/prod)・wrangler 設定方針・ドメイン/DNS・環境変数/secret 管理・構成図が未記述。
6. **脅威モデル先送り** (security.md / qa-006): 「OWASP ASVS に沿って仕様書コンパイル時に展開」とされ未展開。監査 event schema・retention・分離テスト観点も未定義。
7. **API仕様の実体不在** (backend.md): エンドポイント一覧・エラー契約・PublishRequest 状態機械の正式定義がなく、状態機械は外部文書「§7.2 準拠」の参照のみ (qa-009)。
8. **runbook先送り** (maintenance-ops.md / qa-011): バックアップの RPO/RTO・監視閾値・外部死活監視の具体が「仕様書コンパイルで展開」のまま。
9. **外部文書依存で自己完結しない**: §6.2/§7.2/§9/§10.2/§15/HH-D07/HH-D13/HH-D14/doc/harness-hub-platform-concept.md を多数参照するが、参照先が system-spec 内に同梱されておらず単体で追跡不能。
10. **ゴール定義の食い違い** (spec-state.json): qa-012 回答の G2-G4 が正本 U3 の G2-G4 と異なる。qa-013 の O2 も U4 の O2 と不一致。
11. **Worker 3MiB 制約の未反映**: opennext-cloudflare の summary は「D1 決定の caveat に追加」と記すが、D1 の recommendation.caveats に該当項目が存在しない。
12. **Auth.js の帰趨リスク未反映**: 「Auth.js is now part of Better Auth」の告知が references に記録済みだが、auth.md 本文と D3 caveats に反映されていない。
13. **採用DBが章から読めない** (database.md vs D2): database.md 単体では採用 DB も退避経路も判らない。
14. **Stage 0 technical gate の検証仕様不在**: I9 でスコープ内の H3/H6/H7 検証について、手順・合否基準・失敗時分岐がどの章にも記述されていない。
15. **Codex 側の裏取り不在** (fetched-references.json): 出典は claude-code-plugins のみで Codex のプラグイン機構の参照がない。
16. **npm の二義性**: 「npm 不使用 (パッケージマネージャ)」と「npm も配布 source 候補」が区別の明示なく併存。
17. **非機能要件の置き場所欠落**: 性能 (無料枠 CPU 10ms/呼出との整合)・可用性目標・データ保持期間・i18n/アクセシビリティを扱う章が存在しない。
18. **マトリクスの収束** (index.md): mobile/tablet/desktop-linux が全カテゴリ「対象外」で、6プラットフォーム軸は実質2面に収束。
19. **「確定」の意味論**: aggregate「確定」はヒアリング質疑の完了を示し、実装可能な詳細仕様の存在を保証していない。
