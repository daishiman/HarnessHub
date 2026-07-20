---
kind: index
---

# システム構築仕様書 index

収集マトリクス (カテゴリ×プラットフォーム) の各章と集約状態の相互参照。
集約状態は 未着手 / 収集中 / 確定 / 対象外 の 4 値 (真理値表導出)。

## 要件定義書 (上位概念・憲法)

- [要件定義書](./00-requirements-definition.md) — 上位概念 U1-U9 の正本 (確定マーカー: `confirmed`)。各技術章は serves_goals でここのゴールへトレース (anchor) する。
- **本質的目的 (U1)**: 非エンジニアの業務当事者が、自分の業務課題を AI (Claude Code / Codex) と自分で解決し、その解決物を Git や公開工程の複雑さを意識せずに自力で社内へ届けられる状態を実現する。提供者の手離れや事業収益はこの自己解決の帰結として位置付ける。
- **ゴール (U3)**: G1=非エンジニアの作者が、提供者の代理作業なし・Git 操作ゼロで公開・更新・rollback を自走できる, G2=公開された業務ツールを owner 以外の同僚が見つけて追加・利用し、業務での再利用が成立する (North Star), G3=Claude Code / Codex 契約のない社員にも Web App 出口でブラウザから成果が届く, G4=Workspace 管理者が承認・監査・公開停止を行え、shadow IT 化せず統制点が一元化される

## 章一覧と集約状態

| カテゴリ | 章 | 集約状態 | 確定マーカー | 資するゴール | 対応セル |
|---|---|---|---|---|---|
| データベース (database) | [database.md](./database.md) | 確定 | `confirmed` | G1 G2 G4 | database.web database.mobile database.tablet database.desktop-windows database.desktop-linux database.desktop-macos |
| 認証(ログイン) (auth) | [auth.md](./auth.md) | 確定 | `confirmed` | G2 G4 G1 | auth.web auth.mobile auth.tablet auth.desktop-windows auth.desktop-linux auth.desktop-macos |
| UI-UX (ui-ux) | [ui-ux.md](./ui-ux.md) | 確定 | `confirmed` | G1 G2 G3 | ui-ux.web ui-ux.mobile ui-ux.tablet ui-ux.desktop-windows ui-ux.desktop-linux ui-ux.desktop-macos |
| セキュリティ (security) | [security.md](./security.md) | 確定 | `confirmed` | G4 | security.web security.mobile security.tablet security.desktop-windows security.desktop-linux security.desktop-macos |
| インフラ (infrastructure) | [infrastructure.md](./infrastructure.md) | 確定 | `confirmed` | G1 G4 G2 | infrastructure.web infrastructure.mobile infrastructure.tablet infrastructure.desktop-windows infrastructure.desktop-linux infrastructure.desktop-macos |
| バックエンド (backend) | [backend.md](./backend.md) | 確定 | `confirmed` | G1 G2 G4 G3 | backend.web backend.mobile backend.tablet backend.desktop-windows backend.desktop-linux backend.desktop-macos |
| フロントエンド (frontend) | [frontend.md](./frontend.md) | 確定 | `confirmed` | G2 G3 G1 | frontend.web frontend.mobile frontend.tablet frontend.desktop-windows frontend.desktop-linux frontend.desktop-macos |
| 保守運用管理 (maintenance-ops) | [maintenance-ops.md](./maintenance-ops.md) | 確定 | `confirmed` | G1 G2 | maintenance-ops.web maintenance-ops.mobile maintenance-ops.tablet maintenance-ops.desktop-windows maintenance-ops.desktop-linux maintenance-ops.desktop-macos |

## 集約状態サマリ

- **未着手**: —
- **収集中**: —
- **確定**: database, auth, ui-ux, security, infrastructure, backend, frontend, maintenance-ops
- **対象外**: —

## 全体ドキュメント出典 (未割当参照)

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| nextjs | 16.2.10 | Vercel, Inc. (nextjs.org) | https://nextjs.org/docs | 2026-07-16T07:43:43Z | 2026-07-16T07:43:43Z |
| typescript | 7.0 | Microsoft (www.typescriptlang.org) | https://www.typescriptlang.org/docs/ | 2026-07-16T07:58:02Z | 2026-07-16T07:58:02Z |
| pnpm | 11.x | pnpm maintainers (pnpm.io) | https://pnpm.io/motivation | 2026-07-16T07:43:50Z | 2026-07-16T07:43:50Z |
| zod | 4 | Zod maintainers (Colin McDonnell) (zod.dev) | https://zod.dev/ | 2026-07-16T07:43:54Z | 2026-07-16T07:43:54Z |
| github-actions | 2026-07-16 (取得日。ページ本文に最終更新日の明示なし) | GitHub, Inc. (docs.github.com) | https://docs.github.com/en/actions | 2026-07-16T07:43:59Z | 2026-07-16T07:43:59Z |
| turso | 2026-07-16 (取得日。ページ内に明示の更新日なし) | Turso (turso.tech) | https://turso.tech/pricing | 2026-07-16T08:15:11Z | 2026-07-16T08:15:11Z |
| drizzle-orm | v1.0.0-rc.4 (v1 プレリリース現行) / 安定版 0.45.2 | Drizzle Team (orm.drizzle.team) | https://orm.drizzle.team/docs/latest-releases | 2026-07-16T14:08:23Z | 2026-07-16T14:09:13Z |
| authjs | next-auth@5.0.0-beta 以降 (@auth/* namespace) | Auth.js (OSS) (authjs.dev) | https://authjs.dev/getting-started | 2026-07-16T08:11:29Z | 2026-07-16T08:15:11Z |
| claude-code-plugins | 2026-07-16 (取得日。本文に Claude Code v2.1.196 時点の挙動として記載あり) | Anthropic (code.claude.com) | https://code.claude.com/docs/en/plugin-marketplaces | 2026-07-16T08:11:29Z | 2026-07-16T08:15:11Z |
| cloudflare-workers | Jul 7, 2026 | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-07-16T08:42:05Z | 2026-07-16T08:42:05Z |
| wrangler | Jul 3, 2026 | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/workers/wrangler/ | 2026-07-16T08:42:06Z | 2026-07-16T08:42:06Z |
| cloudflare-r2 | May 28, 2026 | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/r2/pricing/ | 2026-07-16T08:42:06Z | 2026-07-16T08:42:06Z |
| cloudflare-d1 | Apr 21, 2026 | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/d1/platform/pricing/ | 2026-07-16T08:42:06Z | 2026-07-16T08:42:06Z |
| opennext-cloudflare | 2026-07-16 (取得日。ページに更新日・バージョン表記なし) | OpenNext (OSS) (opennext.js.org) | https://opennext.js.org/cloudflare | 2026-07-16T08:42:07Z | 2026-07-16T08:42:07Z |
