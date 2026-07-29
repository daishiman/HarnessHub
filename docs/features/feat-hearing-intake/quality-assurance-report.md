---
status: pass
layer: feature-quality
task: SYS-HEARING-INTAKE-P09
feature_package_id: feature-package/feat-hearing-intake
---

# feat-hearing-intake 品質保証報告

| ゲート | 判定 | 実測 |
|---|---|---|
| axe / WCAG 2.2 AA | pass | S10/S11/S12実コンポーネント、axe違反0件 |
| Tenant/Workspace分離 (D4) | pass | scoped 19 / exempt 4 / fixture 19/19、別tenant読取と同一tenant別workspaceのsheet更新・job claimを拒否 |
| SEC5 サーバ試算限定 | pass | `estimateSavings`単一呼び出し、requestの自己申告値をstrict拒否 |
| SEC7 Markdown sanitize | pass | script・event属性・危険schemeを除去、4描画経路を共通化 |
| SEC8 queue認可 | pass | access token + `aijob:process` + role、tenant/workspace・claim token一致 |
| 認可単一middleware | pass | 走査156ファイル、違反0件 |
| 共通層重複 | pass | 登録12層 + 運用4機構、違反0件 |
| DB write gate | pass | 20 repository / 44 writes、全件 `guardedWrite` |
| Worker bundle | pass | gzip 1.200 MiB / 3 MiB |
| Client bundle | pass | 最大116.3 KiB / route予算120 KiB |

手動ブラウザの接続先が無かったためスクリーンショットだけは未取得。空DOMで緑にならない
axeテスト、SSR描画、Next.js/OpenNext buildを実行済みであり、リリース前の接続可能環境では
runbookに従って目視smokeを追加する。

## P12への運用引き継ぎ (qa-027)

- `queued` の最古 `created_at` と件数をtenant別に監視する。
- lease期限を過ぎた `processing` を検出し、worker停止またはtoken問題として扱う。
- 15分超をwarning、60分超または `dead` 増加をcriticalの初期目安とする。
- アラート時はtoken scope、worker pull実行、tenantヘッダー、直近fail errorの順で確認する。
- 監視基盤そのものの新設は共有Hub基盤のscope外なので、本featureではrunbook化までとする。
