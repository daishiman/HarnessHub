---
status: confirmed
category: requirements-definition
---

# 要件定義書 (上位概念)

> 本章は spec-state.json の requirements_foundation を正本とする、システム構築の憲法。
> 以降の各技術章は frontmatter の serves_goals でここ (ゴール) へトレース (anchor) する。
> 上位概念がブレなければ、仕様が整った後もブレない。

- 確定マーカー: `status: confirmed`

## U1 本質的目的 (essential_purpose)

非エンジニアの業務当事者が、自分の業務課題を AI (Claude Code / Codex) と自分で解決し、その解決物を Git や公開工程の複雑さを意識せずに自力で社内へ届けられる状態を実現する。提供者の手離れや事業収益はこの自己解決の帰結として位置付ける。

## U2 背景 (background)

提供者が shadow publish 的な代理作業で公開を肩代わりしており、公開数に比例して提供者の時間が消える構造に限界を実感した。ユーザーは解決物を「作れる」のに、Git・PR・CI を伴う公開・共有の基盤がないことがボトルネックになっている (doc/harness-hub-platform-concept.md §2.2 の障壁認識。同認識は仮説 H0 として Stage 0 で再検証する)。

## U3 ゴール (goals)

| ID | ゴール |
|---|---|
| G1 | 非エンジニアの作者が、提供者の代理作業なし・Git 操作ゼロで公開・更新・rollback を自走できる |
| G2 | 公開された業務ツールを owner 以外の同僚が見つけて追加・利用し、業務での再利用が成立する (North Star) |
| G3 | Claude Code / Codex 契約のない社員にも Web App 出口でブラウザから成果が届く |
| G4 | Workspace 管理者が承認・監査・公開停止を行え、shadow IT 化せず統制点が一元化される |

## U4 目標 (objectives)

| ID | 目標 | 測定基準 |
|---|---|---|
| O1 | 一般作者の公開自走率 80% (仮説 H1) | 提供者の代理作業なし・Git 操作ゼロで公開完了した一般作者の割合 ≥ 80% (Stage 1 開始後の初回計測。数値は Stage 0 実測で更新) |
| O2 | 30 日以内の他者再利用 30% (仮説 H4) | 公開 Project のうち 30 日以内に owner 以外の再利用が成立した割合 ≥ 30% (Stage 1 運用中) |
| O3 | 非 AI 利用者の実利用成立 (仮説 H5) | Web App 出口経由の非 Claude 利用者の実利用が各顧客 Workspace で 1 件以上 (Stage 1 運用中) |
| O4 | 1 公開当たり提供者支援時間 15 分未満 (仮説 H8) | 卒業後の定常運用で 1 公開当たりの提供者介入時間 < 15 分 (Stage 1 卒業判定時。office hour 収入で支援時間を回収できること) |

## U5 成功基準 (success_criteria)

- 2 社以上の顧客 Workspace で Hub が同時稼働し、それぞれの Workspace で公開 (G1) と owner 以外の再利用 (G2) が成立していること (二値判定)。判定は提供者代表が行い、根拠を記録する

## U6 ステークホルダー (stakeholders)

- 作者: 顧客企業の非エンジニア社員。JTBD: 自分の業務課題を AI と自分で解決し、解決物を同僚へ届けたい
- 利用者: 作者の同僚 (Claude Code / Codex 契約の有無を問わない)
- Workspace 管理者: 公開範囲・承認・監査・owner 再割当・初回 Cloudflare 接続の統制を担う
- 提供者 (本リポジトリ owner): 教育・有料助言・Platform 運用。個別納品と受託保守は負わない
- 顧客の情報システム / セキュリティ部門: Hub 導入の審査と監査 mirror 要否の判断

## U7 スコープ (scope)

- **対象 (in)**: Stage 0: Discovery Pilot と technical gate 検証 (H3 / H6 / H7: wrangler CLI 公開・URL 型 marketplace・Bootstrap Installer), Stage 1: Publisher + Thin Dual Catalog MVP (skills-only package の Green 自動公開・Project / TargetChannel / Release / CatalogEntry・version 自動採番・stable pointer と rollback・Workspace Catalog), Stage 2: Workspace Governance (管理者 approval queue・granular RBAC・formal audit log・Yellow review・update 通知), マルチテナント論理分離を Stage 1 から実装する (1 つの Hub に複数顧客 Workspace を同居させ、データ・権限・Catalog を Workspace 境界で分離する。コンセプト文書の 1 Workspace 想定からの変更点), Web App 出口 (作者 local session での wrangler CLI スクリプト実行 + Hub への URL・release 登録)
- **対象外 (out)**: 独自 Web App runtime / Hosted Harness runtime (恒久非目標。§6.2), 共通 Runtime Connector (Stage 5 の条件付き拡張), Result Dashboard / opt-in 利用計測 (Stage 4 の条件付き拡張), 独自 Cloudflare deployment engine (Stage 3 の条件付き拡張), Hook・script・binary の自動公開 (Stage 5 の review 経路), 公開 marketplace・SNS・ランキング・収益分配 (Stage 5 以降), Web 会話型 Creator (非目標。Web 起点の作成需要が反復確認された場合のみ再検討)

## U8 制約 (constraints)

- C1 開発体制: 実装・運用は提供者 1 名 + AI (Claude Code / Codex) のみ。運用負荷の低さと保守性を技術選定の最優先基準とする
- C2 インフラコスト: 固定費を極小化する (従量課金・無料枠優先)。顧客 Workspace 数が増えても固定費が比例して増えないこと
- C3 既存資産再利用: harness-creator / package contract / package check / marketplace catalog / version・cache 処理 / review workflow を Publisher 内部の quality engine として再利用する (§15)
- C4 非保持境界: Hub は顧客の業務データ・secret・Web App runtime を保持しない (§6.2 / HH-D07 / HH-D14 の境界を不変制約とする。マルチテナントでも Hub 側の漏洩リスクと運用責任が顧客数に比例しない)

## U9 具体的にやりたいこと (concrete_intents)

| ID | やりたいこと | 資するゴール |
|---|---|---|
| I1 | 公開を 1 操作にする (/harness-hub:publish または自然言語)。branch / commit / PR / CI / merge / version / cache を利用者から隠す | G1 |
| I2 | static validation・secret scan・policy 判定 (Green 自動公開、Yellow / Red は Needs Fix 差し戻し) | G1, G4 |
| I3 | immutable Release + TargetChannel 別 stable pointer による atomic な公開・更新・rollback | G1, G4 |
| I4 | Workspace Catalog (業務ツール一覧・詳細・「追加する」「Web アプリを開く」導線・低品質報告導線) | G2, G3 |
| I5 | Web App 出口: 作者 local session で Publisher が wrangler CLI をスクリプト実行し、Hub は URL 登録・公開範囲検査・health 確認のみ担う | G3 |
| I6 | URL 型 marketplace (native source) または Bootstrap Installer による Git レス配布・更新 (一般利用者に GitHub アカウントを要求しない) | G1, G2 |
| I7 | マルチ Workspace 論理分離と顧客既存 IdP / SSO への認証委譲 (Hub 独自アカウント基盤を作らない) | G4 |
| I8 | Stage 2 Governance: 管理者 approval queue・granular RBAC・formal audit log・export | G4 |
| I9 | Stage 0 technical gate: URL 型 marketplace / Bootstrap Installer / wrangler 公開の成立検証 (H3 / H6 / H7) と Stage 1 開始条件の判定 | G1, G3 |

## 意思決定支援 (decisions)

| ID | 論点 | 状態 | 選択肢 (費用・適合・注意点) | AI推奨 | ユーザー決定 | 資するゴール |
|---|---|---|---|---|---|---|
| D1 | Hub 本体 (Next.js + TypeScript) の実行環境・hosting をどれにするか | confirmed | cf-workers-opennext:Cloudflare Workers 一体型 (@opennextjs/cloudflare) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '無料枠 (10万req/日) 内は月額0円。超過時は Workers Paid $5/月〜の従量。構築は OpenNext adapter の学習コストのみ、撤退時は Node hosting へ移行可能'} / free=100,000 リクエスト/日、CPU 時間制限あり (無料枠) / fit=Web App 出口が顧客側 Cloudflare (HH-D07) のため生態系が統一され、提供者の運用知見が 1 系統に集約される / pros=デプロイ対象が 1 つ (C1 適合), R2 native binding, 固定費ゼロ, wrangler 運用が Web App 出口と共通 / cons=OpenNext adapter 経由のため Next.js 全機能の互換確認が必要, Workers ランタイム制約 (Node API 一部非互換) / risks=OpenNext/Next.js のバージョン追随が遅れる可能性 / lock-in=中 / ops=低 / evidence=https://developers.cloudflare.com/workers/platform/pricing/, https://opennext.js.org/cloudflare<br>pages-plus-worker:Cloudflare Pages (UI) + 専用 Worker API (Hono) 分離 / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '両方無料枠内で月額0円。ただし 2 系統のビルド・デプロイ・認証連携の構築保守工数が加算'} / free=Pages: ビルド 500 回/月、Workers: 10万 req/日 / fit=API の独立進化には有利だが、個人運用 (C1) では管理対象が増える / pros=API を独立してスケール・進化できる, 関心の分離が明確 / cons=デプロイ 2 系統, 認証・セッションの連携設計が増える / risks=個人開発での保守負荷増 / lock-in=中 / ops=中 / evidence=https://developers.cloudflare.com/pages/<br>vercel-hobby:Vercel Hobby / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '月額0円だが商用利用不可のため、顧客展開時は Pro ($20/月/席) が必須になり費用ゼロ制約と衝突'} / free=Hobby は非商用利用限定 / fit=Next.js 最適化は最強だが、商用マルチテナント SaaS は Hobby 規約違反 / pros=Next.js 互換性が完全, DX が高い / cons=商用利用不可 (Hobby), R2/Turso へ native binding 不可 / risks=規約違反による停止リスク / lock-in=中 / ops=低 / evidence=https://vercel.com/docs/plans/hobby | cf-workers-opennext — 費用ゼロ制約 (C2 強化) と個人運用制約 (C1) の下で、Web App 出口 (顧客側 Cloudflare) と運用知見を 1 系統に統一でき、デプロイ対象が 1 つで済む (注意: OpenNext adapter の Next.js バージョン互換を実装着手時に公式ドキュメントで再確認する, Workers ランタイムの Node API 非互換 (一部ライブラリ) に注意; confidence=high; checked=2026-07-16T00:00:00+09:00) | cf-workers-opennext @ 2026-07-16T00:00:00+09:00 | G1, G4 |
| D2 | Hub control-plane DB (Tenant/Workspace/Project/Release/Catalog/監査event) の永続化をどれにするか | confirmed | d1-drizzle:Cloudflare D1 + Drizzle ORM / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '無料枠 (5GB・読取500万行/日) 内は月額0円。Workers native binding で外部依存なし'} / free=5GB ストレージ、読取 500万行/日、書込 10万行/日 / fit=顧客 Web App の標準 DB (HH-D14) と同一技術で知見が共通化 / pros=native binding でレイテンシ最小, 外部サービス依存ゼロ, Drizzle で型安全 / cons=SQLite 由来の同時書込制約, リージョン単一 (read replica はベータ) / risks=大規模化時のスループット上限 / lock-in=中 / ops=低 / evidence=https://developers.cloudflare.com/d1/platform/pricing/, https://orm.drizzle.team/docs/connect-cloudflare-d1<br>turso-free:Turso Free (libSQL) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '無料枠内は月額0円。Workers からは @libsql/client (HTTP) 接続。無料枠改定時は D1 へ移行 (Drizzle 両対応で移行コスト小)'} / free=無料プランに DB 数・ストレージ・行読取の上限あり (公式 pricing 参照) / fit=SQLite 方言で D1 と互換。ブランチ機能・組込みレプリカなど開発体験が良い / pros=SQLite 互換で D1 退避経路を温存, DB ブランチなど開発機能, エッジレプリカ / cons=native binding ではなく HTTP 経由, 外部サービス依存が 1 つ増える / risks=スタートアップ依存の無料枠改定・事業継続リスク / lock-in=低 / ops=低 / evidence=https://docs.turso.tech/, https://turso.tech/pricing<br>supabase-free:Supabase Free (Postgres) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '無料枠は月額0円だが 1 週間非アクセスで pause。商用継続なら Pro $25/月が現実的で費用ゼロ制約と衝突'} / free=500MB DB、1 週間非アクティブで自動 pause、2 プロジェクトまで / fit=リレーショナル機能は最も充実するが、Workers からは HTTP 経由 / pros=Postgres の表現力, 管理 UI / cons=無料枠の pause 挙動が本番不適, SQLite 系と非互換で D1 との知見分断 / risks=無料枠での本番運用は実質不可 / lock-in=中 / ops=中 / evidence=https://supabase.com/pricing | d1-drizzle — native binding・外部依存ゼロ・顧客 Web App 標準 DB (HH-D14) との知見統一の 3 点で、個人運用と費用ゼロ制約に最も適合 (注意: D1 の同時書込特性と read replica の成熟度を実装着手時に再確認する; confidence=medium; checked=2026-07-16T00:00:00+09:00) | turso-free @ 2026-07-16T00:00:00+09:00 | G1, G2, G4 |
| D3 | Hub Web / API の認証・認可基盤をどれにするか (Hub 独自アカウント基盤は作らない前提) | confirmed | authjs-oidc:Auth.js (旧 NextAuth) + テナント別 OIDC / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': 'OSS で月額0円。構築はテナント別 OIDC 設定の動的解決実装、運用は IdP 設定変更対応のみ'} / free=制限なし (OSS) / fit=テナントごとに顧客既存 IdP (Google Workspace / Microsoft Entra ID) を登録でき、Hub 独自アカウント基盤を作らない §10.2 と整合 / pros=完全無料, Next.js との統合が自然, テナント別 IdP を Hub のデータモデルで管理できる / cons=OIDC 設定の動的マルチテナント解決は自前実装, セッション失効管理を自分で設計 / risks=実装ミスによる認可漏れ (分離テストで担保) / lock-in=低 / ops=中 / evidence=https://authjs.dev/, https://authjs.dev/getting-started/providers/microsoft-entra-id<br>cloudflare-access:Cloudflare Access (Zero Trust) 前段 / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '50 ユーザーまで月額0円。超過で有料プラン。アプリ側は JWT 検証のみで構築工数最小'} / free=無料は 50 ユーザーまで / fit=コード最小だが、顧客 IdP を提供者の Cloudflare アカウントへ登録する形になり Tenant 境界が Hub のデータモデル外に漏れる / pros=実装コード最小, IdP 連携が設定だけで済む / cons=50 ユーザー上限が複数顧客展開 (U5) と早期に衝突, テナント境界の管理が Cloudflare ダッシュボード依存 / risks=ユーザー数成長で即有償化 / lock-in=高 / ops=低 / evidence=https://developers.cloudflare.com/cloudflare-one/policies/access/, https://www.cloudflare.com/plans/zero-trust-services/<br>idaas-free:IDaaS (Clerk / Auth0 無料枠) / cost={'category': 'free', 'amount': 0, 'currency': 'JPY', 'billing_period': 'month', 'tco': '無料枠は月額0円だが MAU 上限・機能制限あり。マルチテナント SSO (SAML/OIDC per tenant) は多くの IDaaS で有償上位プラン'} / free=MAU 上限・テナント別エンタープライズ SSO は有償プランが多い / fit=テナント別 IdP 連携がまさに有償機能に該当しやすく、費用ゼロ制約と衝突 / pros=実装最速, UI 込み / cons=テナント別 SSO が有償になりがち, 価格改定・ロックイン / risks=無料枠縮小の前例が業界に多い / lock-in=高 / ops=低 / evidence=https://clerk.com/pricing, https://auth0.com/pricing | authjs-oidc — 費用ゼロ・複数顧客同時展開 (U5)・テナント境界を Hub のデータモデルで管理する要件を同時に満たすのは Auth.js のみ (注意: マルチテナント OIDC の動的 provider 解決は Auth.js の標準外パターンのため設計レビューを行う, セッション失効・role 変更の反映遅延 (JWT) を許容時間として仕様化する; confidence=high; checked=2026-07-16T00:00:00+09:00) | authjs-oidc @ 2026-07-16T00:00:00+09:00 | G2, G4 |
