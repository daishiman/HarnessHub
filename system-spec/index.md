---
kind: index
---

# システム構築仕様書 index

収集マトリクス (カテゴリ×プラットフォーム) の各章と集約状態の相互参照。
集約状態は 未着手 / 収集中 / 確定 / 対象外 の 4 値 (真理値表導出)。

## 要件定義書 (上位概念・憲法)

- [要件定義書](./00-requirements-definition.md) — 上位概念 U1-U9 の正本 (確定マーカー: `confirmed`)。各技術章は serves_goals でここのゴールへトレース (anchor) する。
- **本質的目的 (U1)**: 非エンジニアの業務当事者が、自分の業務課題を AI (Claude Code / Codex) と自分で解決し、その解決物を Git や公開工程の複雑さを意識せずに自力で社内へ届けられる状態を実現する。提供者の手離れや事業収益はこの自己解決の帰結として位置付ける。
- **ゴール (U3)**: G1=非エンジニアの作者が、提供者の代理作業なし・Git 操作ゼロで公開・更新・rollback を自走できる, G2=公開された業務ツールを owner 以外の同僚が見つけて追加・利用し、業務での再利用が成立する (North Star), G3=Claude Code / Codex 契約のない社員にも Web App 出口でブラウザから成果が届く, G4=Workspace 管理者が承認・監査・公開停止を行え、shadow IT 化せず統制点が一元化される, G5=導入されたハーネスの利用実態と削減効果 (時間・金額換算) が可視化され、フィードバック→AI 対応→再公開の改善ループが定着する

## 章一覧と集約状態

| カテゴリ | 章 | 集約状態 | 確定マーカー | 資するゴール | 対応セル |
|---|---|---|---|---|---|
| データベース (database) | [database.md](./database.md) | 確定 | `confirmed` | G4 G5 | database.web database.mobile database.tablet database.desktop-windows database.desktop-linux database.desktop-macos |
| 認証(ログイン) (auth) | [auth.md](./auth.md) | 確定 | `confirmed` | G2 G4 G1 | auth.web auth.mobile auth.tablet auth.desktop-windows auth.desktop-linux auth.desktop-macos |
| UI-UX (ui-ux) | [ui-ux.md](./ui-ux.md) | 確定 | `confirmed` | G1 G2 G3 G5 | ui-ux.web ui-ux.mobile ui-ux.tablet ui-ux.desktop-windows ui-ux.desktop-linux ui-ux.desktop-macos |
| セキュリティ (security) | [security.md](./security.md) | 確定 | `confirmed` | G4 G5 G1 | security.web security.mobile security.tablet security.desktop-windows security.desktop-linux security.desktop-macos |
| インフラ (infrastructure) | [infrastructure.md](./infrastructure.md) | 確定 | `confirmed` | G1 G4 G5 G2 | infrastructure.web infrastructure.mobile infrastructure.tablet infrastructure.desktop-windows infrastructure.desktop-linux infrastructure.desktop-macos |
| バックエンド (backend) | [backend.md](./backend.md) | 確定 | `confirmed` | G4 G5 G1 G3 | backend.web backend.mobile backend.tablet backend.desktop-windows backend.desktop-linux backend.desktop-macos |
| フロントエンド (frontend) | [frontend.md](./frontend.md) | 確定 | `confirmed` | G1 G2 G3 G5 | frontend.web frontend.mobile frontend.tablet frontend.desktop-windows frontend.desktop-linux frontend.desktop-macos |
| 保守運用管理 (maintenance-ops) | [maintenance-ops.md](./maintenance-ops.md) | 確定 | `confirmed` | G1 G2 G3 G4 G5 | maintenance-ops.web maintenance-ops.mobile maintenance-ops.tablet maintenance-ops.desktop-windows maintenance-ops.desktop-linux maintenance-ops.desktop-macos |
| 開発フロー (dev-workflow) | [dev-workflow.md](./dev-workflow.md) | 確定 | `confirmed` | G1 G4 G5 | dev-workflow.web dev-workflow.mobile dev-workflow.tablet dev-workflow.desktop-windows dev-workflow.desktop-linux dev-workflow.desktop-macos |
| テスト戦略・品質保証 (testing-qa) | [testing-qa.md](./testing-qa.md) | 確定 | `confirmed` | G1 G4 G5 | testing-qa.web testing-qa.mobile testing-qa.tablet testing-qa.desktop-windows testing-qa.desktop-linux testing-qa.desktop-macos |

## 集約状態サマリ

- **未着手**: —
- **収集中**: —
- **確定**: database, auth, ui-ux, security, infrastructure, backend, frontend, maintenance-ops, dev-workflow, testing-qa
- **対象外**: —

## 実装 writeback 索引 (確定章への追記ではない)

elicitation（要件ヒアリング）確定後に実装へ落とした契約の索引。`spec-state.json` のセル状態は変更せず、実装契約は `specs/` 追補と architecture へ書く。

| 主題 | 要求の出所 | 実装契約 | feature / Beads |
|---|---|---|---|
| 稼働ビルドの素性 (acceptance V6) と反映鮮度・smoke 前伝播安定性 (acceptance V7) | `dev-workflow.md` qa-198-f / qa-198-h | [build-identity 実装追補](../specs/harness-hub-build-identity-deploy-freshness-addendum.md) | `feat-build-identity-deploy-freshness` / `HarnessHub-hf9y`、伝播安定性 follow-up `HarnessHub-u9zq` |
| 文書内リンク integrity / Beads Dolt baseline / VRT update 経路 (製品契約非変更) | 開発運用・品質ゲート | [wt-1-6 仕様反映受領書](../docs/features/feat-hub-foundation/wt-1-6-ops-governance-final-review-spec-reflection-receipt.md) | `HarnessHub-j7a4` / `jab2` / `7mc6` |
| rubric 自動生成提案の保全と human review 引継ぎ | `dev-workflow.md` qa-216 の P13 write-back / scope separation / 未完了項目の durable tracking | [rubric 提案保持 writeback](../specs/harness-hub-system-specification-implementation-writebacks.md#rubric-自動生成提案の保持-writeback-2026-08-10--harnesshub-lzfs) / [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md) | `feat-dev-pipeline-improvement` / `HarnessHub-lzfs` (human triage 完了まで open) |
| publish smoke の channel 解放順序、DB 再確認、fixture lease と cancel 後回収 | `testing-qa.md` qa-217 の disposable cleanup / fail-closed 契約（状態機械・UNIQUE 契約は不変） | [production coverage smoke 追補](../specs/harness-hub-production-coverage-smoke-addendum.md) / [channel slot 検証受領書](../docs/features/feat-hub-foundation/production-smoke-channel-slot-verification-spec-reflection-receipt.md) / [2026-08-11 受領書](../docs/features/feat-dual-catalog-web/mvp-ops-reliability-20260811-spec-reflection-receipt.md) | `feat-publish-pipeline` / `HarnessHub-pf5o`・`HarnessHub-aauo`（本番再実走・force-cancel 証跡まで open） |
| catalog G13 headroom と token 葉 module | `frontend.md` / `ui-ux` の First Load JS 予算 | [frontend-spec §8](../docs/frontend-spec.md) / [frontend architecture](../architecture/harness-hub-frontend.md) / [2026-08-11 受領書](../docs/features/feat-dual-catalog-web/mvp-ops-reliability-20260811-spec-reflection-receipt.md) | `feat-dual-catalog-web` / `HarnessHub-vwxc` |
| required-check 台帳と verification tier 未配線明示 | `dev-workflow.md` qa-216 の tier / gate 強制 | [dev-workflow architecture](../architecture/harness-hub-dev-workflow.md) / [2026-08-11 受領書](../docs/features/feat-dual-catalog-web/mvp-ops-reliability-20260811-spec-reflection-receipt.md) | `feat-dev-pipeline-improvement` / `HarnessHub-ic7w`・`HarnessHub-xcl3`・`HarnessHub-sl6o` |
| 複数監査 dispatch 台帳 schema 1.2（製品要求の reopen なし） | 開発品質 follow-up（利用者要求・QA セル変更なし） | 製品章は非変更。内部契約は [dev-workflow architecture](../architecture/harness-hub-dev-workflow.md) / [uypz 受領書](../docs/features/feat-dev-pipeline-improvement/uypz-audit-fork-schema12-spec-reflection-receipt.md) | `feat-dev-pipeline-improvement` / `HarnessHub-uypz`（fresh live-trial まで open） |

## 全体ドキュメント出典 (未割当参照)

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| nextjs | 16.3.0 | Vercel, Inc. (nextjs.org) | https://nextjs.org/docs | 2026-08-07T03:25:17Z | 2026-08-07T03:25:17Z |
| typescript | 7.0.2 | Microsoft (www.typescriptlang.org) | https://www.typescriptlang.org/docs/ | 2026-08-07T03:25:36Z | 2026-08-07T03:25:36Z |
| pnpm | 11.20.0 | pnpm maintainers (github.com) | https://github.com/pnpm/pnpm/releases | 2026-08-07T03:25:42Z | 2026-08-07T03:25:42Z |
| zod | 4.4.3 | Zod maintainers (Colin McDonnell) (zod.dev) | https://zod.dev/ | 2026-08-07T03:25:45Z | 2026-08-07T03:25:45Z |
| github-actions | 2026-08-07 (取得日。ページ本文に最終更新日の明示なし) | GitHub, Inc. (docs.github.com) | https://docs.github.com/en/actions | 2026-08-07T03:30:09Z | 2026-08-07T03:30:09Z |
| turso | 2026-08-07 (取得日。ページ内に明示の更新日なし) | Turso (turso.tech) | https://turso.tech/pricing | 2026-08-07T03:30:09Z | 2026-08-07T03:30:09Z |
| drizzle-orm | 0.45.2 (安定版) / 1.0.0-rc.4 (v1 プレリリース現行) | Drizzle Team (github.com) | https://github.com/drizzle-team/drizzle-orm/releases | 2026-08-07T03:25:48Z | 2026-08-07T03:25:48Z |
| authjs | next-auth 5.0.0-beta.32 (@auth/* namespace の v5 系。latest tag 4.24.15 は旧 v4 系) | Auth.js (OSS) (authjs.dev) | https://authjs.dev/getting-started | 2026-08-07T03:26:21Z | 2026-08-07T03:26:21Z |
| claude-code-plugins | 2026-08-07 (取得日。ページ本文に最終更新日の明示なし。2026-07-30 の直接取得時のローカル CLI 実測は 2.1.220) | Anthropic (code.claude.com) | https://code.claude.com/docs/en/plugin-marketplaces | 2026-08-07T03:30:09Z | 2026-08-07T03:30:09Z |
| cloudflare-workers | Jul 7, 2026 (2026-07-22 の直接取得時に確認したページ表示日。今回の WebSearch 経路ではページ本文の日付表示を再確認できていない (要 WebFetch/直接取得)) | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-08-07T03:30:09Z | 2026-08-07T03:30:09Z |
| wrangler | 4.119.0 | Cloudflare, Inc. (github.com) | https://github.com/cloudflare/workers-sdk/releases | 2026-08-07T03:26:24Z | 2026-08-07T03:26:24Z |
| cloudflare-r2 | May 28, 2026 (2026-07-22 の直接取得時に確認したページ表示日。今回の WebSearch 経路ではページ本文の日付表示を再確認できていない (要 WebFetch/直接取得)) | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/r2/pricing/ | 2026-08-07T03:30:09Z | 2026-08-07T03:30:09Z |
| cloudflare-d1 | Apr 21, 2026 (2026-07-22 の直接取得時に確認したページ表示日。今回の WebSearch 経路ではページ本文の日付表示を再確認できていない (要 WebFetch/直接取得)) | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/d1/platform/pricing/ | 2026-08-07T03:30:09Z | 2026-08-07T03:30:09Z |
| opennext-cloudflare | 1.20.2 | OpenNext (OSS) (opennext.js.org) | https://opennext.js.org/cloudflare | 2026-08-07T03:26:30Z | 2026-08-07T03:26:30Z |
| resend | 2026-08-07 (取得日。ページ内に明示の更新日なし) | Resend, Inc. (resend.com) | https://resend.com/pricing | 2026-08-07T03:30:09Z | 2026-08-07T03:30:09Z |
| nextjs-proxy | 16 (改名は 16.0 で導入。middleware.ts は deprecated) | Vercel, Inc. (nextjs.org) | https://nextjs.org/docs/app/guides/upgrading/version-16 | 2026-08-07T07:17:12Z | 2026-08-07T07:17:12Z |
| cloudflare-workers-secrets | 2026-08-07 (取得日。WebSearch 経路のためページ本文の更新日表示は未確認) | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/workers/configuration/secrets/ | 2026-08-07T07:17:12Z | 2026-08-07T07:17:12Z |
| opennext-cloudflare-env-vars | 1.20.2 (@opennextjs/cloudflare の現行版) | OpenNext (OSS) (opennext.js.org) | https://opennext.js.org/cloudflare/howtos/env-vars | 2026-08-07T07:17:12Z | 2026-08-07T07:17:12Z |
| tailwindcss-v4 | 4.3 | Tailwind Labs (tailwindcss.com) | https://tailwindcss.com/docs/upgrade-guide | 2026-08-10T11:54:59Z | 2026-08-10T11:54:59Z |
| shadcn-ui | 2026-08-10 | shadcn (ui.shadcn.com) | https://ui.shadcn.com/docs/tailwind-v4 | 2026-08-10T11:54:59Z | 2026-08-10T11:54:59Z |
| radix-primitives | 2026-08-10 | WorkOS (www.radix-ui.com) | https://www.radix-ui.com/primitives/docs/overview/introduction | 2026-08-10T11:54:59Z | 2026-08-10T11:54:59Z |
| wcag-2-2 | 2.2 | W3C (www.w3.org) | https://www.w3.org/TR/WCAG22/ | 2026-08-10T11:54:59Z | 2026-08-10T11:54:59Z |
