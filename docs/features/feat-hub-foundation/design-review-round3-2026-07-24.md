---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P03
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
package_digest: sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502
reviewed_artifact: docs/features/feat-hub-foundation/architecture-decision-record.md
parent_note: docs/features/feat-hub-foundation/design-review-notes.md
verdict: 承認
collected_at: "2026-07-24"
---

# P03 設計レビュー Round 3 再レビュー (2026-07-24) — ADR 改訂 2/3 の是正確認

> **本書の位置づけ**: 初回レビュー (design-review-notes.md §1〜§11、判定: 差し戻し) の指摘 27 件が、ADR 改訂 2 (commit `0880eec`「P03 独立レビューの差し戻し 27 件を P02 へ反映」) および改訂 3 (§11.6) で是正されたかを、初回と同じ独立基準で照合した記録。正本の判定文書 design-review-notes.md が doc-line-limit (300 行 ratchet) を超えないよう、Round 3 の照合明細を本別紙へ分離した。design-review-notes.md frontmatter の `verdict: 承認` が本別紙の照合を根拠とする。
>
> ADR §11 の是正主張を鵜呑みにせず、ADR 本文の該当節と実装ファイルで裏取りした。
>
> **レビュー実施**: 2026-07-24 (実装 merge 済みの main 系ツリー上。初回レビュー時と異なり実装ファイルが存在するため、設計主張の一部は実装で追加裏取りできた)

## 1. 指摘 27 件の照合結果

| ID | 判定 | 裏取り箇所 |
|---|---|---|
| R-01 (重大) | **是正確認** | ADR §4 が qa-038 準拠 (常設 staging なし・preview 使い捨て) へ改訂。ユーザー確定 2026-07-21 の記録あり (§11.1)。system-spec 側の追随 (F-1) も D7 決定として `spec-state.json` へ C01 writer 経由で登録済み |
| R-02 (重大) | **是正確認** | ADR §4/§6「単一 workflow `ci.yml` 内で連鎖」。実装裏取り: `.github/workflows/ci.yml` の deploy job は `needs: [static-gates, test]` で同一 run 内連鎖 |
| R-03 (重大) | **是正確認** | ADR §6 が G1〜G11 の 11 ゲート表へ再構成。実装裏取り: ci.yml に G2/G3/G4/G6/G7/G8/G9/G5 の step が実在 |
| R-04 (重大) | **是正確認** | §11.3-4「計算の骨格は基盤、業務的な算出定義は consumer (feat-metrics-tracking)」で estimation の owner 分界を宣言 |
| R-05 (重大) | **是正確認** | §6 G11 (main 反映後 Lighthouse 定期計測) を新設。実装裏取り: `.github/workflows/cwv.yml` 実在、2026-07-24 に実測実行済み (LCP/CLS good、TBT 超過で fail-closed に赤 → 是正起票対象) |
| R-06 (高) | **是正確認** | §11.3-1 振り分け基準「Worker 外部から参照されうるもの → package 化」を確定。6 層の配置が基準から導出可能になった |
| R-07 (高) | **是正確認** | §6「inspection の第 2 consumer は CI 自身」。実装裏取り: ci.yml G6 が `@harness-hub/inspection` の scan:secrets を呼ぶ |
| R-08 (高) | **是正確認** | §3 バックアップ行が実装物 (`backup.yml`) + owner 宣言へ復帰。実装裏取り: `.github/workflows/backup.yml` 実在、日次 schedule で稼働 (secrets 未投入のため fail-closed で赤 = 設計どおり) |
| R-09 (高) | **是正確認** | §4 deploy unit に scheduled handler (cron 2 系統) と custom entry 構成を追加。実装裏取り: `apps/hub/src/worker.ts` + `src/worker/cron.ts` 実在、cron テスト 13 件 pass (acceptance-report §2) |
| R-10 (中) | **是正確認** | §4「wrangler.jsonc の内容正本は infrastructure-spec §2」と参照型へ改訂。R2 native binding / ASSETS を明示 |
| R-11 (中) | **是正確認** | §7 SLO 算定式「外形監視 downtime + Workers analytics 5xx 率」へ訂正 |
| R-12 (中) | **是正確認** | §7 エラーバジェット「70% 警告 / 100% 凍結」の 2 段へ分離 |
| R-13 (中) | **是正確認** | §11.2 で「第 3 の利用者」閾値へ訂正 (構成変更なしの根拠書き直し) |
| R-14 (中) | **是正確認** | §11.3-7 db の A4 発効条件を確定。実装裏取り: `scripts/ci/shared-layer-registry.json` に `boundary_only: true` |
| R-15 (中) | **是正確認** | §11.3-2 命名 `@harness-hub/<name>`・exports 単一入口・package 名 import 規約を確定 |
| R-16 (中) | **是正確認** | §11.3-5 migration 分担 (SQL 生成 = feat-domain-model-db / CI 自動適用・G7 = 本 feature) |
| R-17 (中) | **是正確認** | §11.3-6 rate limiting 分担 (境界 = 本 feature / 数値 = feat-auth-tenancy) |
| R-18 (中) | **是正確認** | §6 local 再現。実装裏取り: root package.json に `verify` script、`pnpm verify` exit 0 の実測記録 (evidence/local-verify-2026-07-21.md) |
| R-19 (中) | **是正確認** | §11.3-3 withAuthz wrapper factory + 未 wrap 検出静的検査。実装裏取り: `scripts/ci/check-shared-layer-duplicates.mjs` に `unwrapped-route-handler` 検出が実在 |
| R-20 (中) | **是正確認** | §6 G1「corepack で pin (正本機構)」。実装裏取り: ci.yml に `corepack enable` step、`only-allow` は補助として保持 |
| R-21 (低) | **是正確認** | §11.2 で P05 実装時対処と位置づけ (pnpm 10 の lifecycle script 制約)。P05 実装は完了しビルドが通っている |
| R-22 (低) | **是正確認** | §6 G1 の検出対象に yarn.lock / bun.lockb を追加。実測: HF-A1-CI-002 で 4 種すべて検出 pass |
| R-23 (低) | **記録確認** | 是正不要 (意図表明として保持) の初回判定どおり |
| R-24 (低) | **是正確認** | §11.3-8 で `plugins/publisher/` 予約を ADR から取り下げ、feat-publisher-plugin の P02 へ委譲 |
| R-25 (低) | **是正確認** | §11.3 で estimation 追加の調停理由を本節へ格上げ |
| R-26 (低) | **記録確認** | §7 に既知リスクとして記録 (初回判定は「リスク記録」で足りる) |
| R-27 (低) | **是正確認** | §11.3-8 で WebApp 出口のツール系統を scope 外と明記 |

**集計: 是正確認 25 / 記録確認 2 / 未是正 0**

## 2. 是正が新たな矛盾を生んでいないかの確認

- **qa-003 / qa-019 / qa-007 / qa-018 への適合**: 初回 §2 で不適合・条件付きだった項目 (R2 binding 未言及・SLO 算定式・restore drill・CWV 計測経路・corepack) はいずれも是正で適合へ転じた。qa-018(2) の CWV は計測経路が実在し実測が回っている (良否は G11 の運用で判定される設計であり、設計適合の判定を覆さない)。
- **§11.6 (改訂 3) の追加調停**: F-01 (/health の binding 依存) / F-11 (応答契約の二重定義) / R2 縮退区分は、いずれも「正本を一本化する」方向の調停であり初回指摘と整合。矛盾なし。
- **未消化の申し送り**: F-2 (docs/shared-layers.md §3 のゲート表が 5 項目のまま) は未実施。ただし同 §3 には 2026-07-21 追記で「宣言の正本は system-spec/dev-workflow.md」と正本ポインタが張られており二重正本にはなっていない。ADR §11.4 の follow-up 起票対象として維持する (P03 承認のブロッカーではない。HarnessHub-dxy として起票済み)。

## 3. 判定

**承認。** 初回指摘 27 件は全件が是正確認または初回判定どおりの記録確認であり、重大 (Blocker) 5 件を含む是正要 25 件に未是正はない。是正は上流確定仕様への接地を回復する方向で一貫しており、新たな矛盾は検出されなかった。P04 以降の成果物がこの改訂版 ADR に依拠することを妥当と判定する。

- design-review-notes.md frontmatter の verdict を「承認」へ更新した (本 Round 3 の判定)。
- 残 follow-up: F-2 (shared-layers §3 ゲート表の追随更新) のみ。HarnessHub-dxy として個別管理する。
