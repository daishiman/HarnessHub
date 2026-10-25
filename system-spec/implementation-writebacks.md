---
kind: implementation-writeback-index
generated: false
---

# 実装 writeback 索引

elicitation（要件ヒアリング）確定後に実装へ落とした契約の索引。`spec-state.json` のセル状態は変更せず、実装契約は `specs/` 追補と architecture へ書く。このファイルは生成章ではなく、`run-system-spec-compile` の再実行でも上書きしない正本とする。

- [システム構築仕様書 index](./index.md)

| 主題 | 要求の出所 | 実装契約 | feature / Beads |
|---|---|---|---|
| 稼働ビルドの素性 (acceptance V6) と反映鮮度・smoke 前伝播安定性 (acceptance V7) | `dev-workflow.md` qa-198-f / qa-198-h | [build-identity 実装追補](../specs/harness-hub-build-identity-deploy-freshness-addendum.md) | `feat-build-identity-deploy-freshness` / `HarnessHub-hf9y`、伝播安定性 follow-up `HarnessHub-u9zq` |
| 文書内リンク integrity / Beads Dolt baseline / VRT update 経路 (製品契約非変更) | 開発運用・品質ゲート | [wt-1-6 仕様反映受領書](../docs/features/feat-hub-foundation/wt-1-6-ops-governance-final-review-spec-reflection-receipt.md) | `HarnessHub-j7a4` / `jab2` / `7mc6` |
| rubric 自動生成提案の保全と human review 引継ぎ | `dev-workflow.md` qa-216 の P13 write-back / scope separation / 未完了項目の durable tracking | [rubric 提案保持 writeback](../specs/harness-hub-system-specification-implementation-writebacks.md#rubric-自動生成提案の保持-writeback-2026-08-10--harnesshub-lzfs) / [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md) | `feat-dev-pipeline-improvement` / `HarnessHub-lzfs` (human triage 完了まで open) |
| publish smoke の channel 解放順序、DB 再確認、fixture lease と cancel 後回収 | `testing-qa.md` qa-217 の disposable cleanup / fail-closed 契約（状態機械・UNIQUE 契約は不変） | [production coverage smoke 追補](../specs/harness-hub-production-coverage-smoke-addendum.md) / [channel slot 検証受領書](../docs/features/feat-hub-foundation/production-smoke-channel-slot-verification-spec-reflection-receipt.md) / [2026-08-11 受領書](../docs/features/feat-dual-catalog-web/mvp-ops-reliability-20260811-spec-reflection-receipt.md) | `feat-publish-pipeline` / `HarnessHub-pf5o`・`HarnessHub-aauo`（本番再実走・force-cancel 証跡まで open） |
| catalog G13 headroom と token 葉 module | `frontend.md` / `ui-ux` の First Load JS 予算 | [frontend-spec §8](../docs/frontend-spec.md) / [frontend architecture](../architecture/harness-hub-frontend.md) / [2026-08-11 受領書](../docs/features/feat-dual-catalog-web/mvp-ops-reliability-20260811-spec-reflection-receipt.md) | `feat-dual-catalog-web` / `HarnessHub-vwxc` |
| required-check 台帳と verification tier 未配線明示 | `dev-workflow.md` qa-216 の tier / gate 強制 | [dev-workflow architecture](../architecture/harness-hub-dev-workflow.md) / [2026-08-11 受領書](../docs/features/feat-dual-catalog-web/mvp-ops-reliability-20260811-spec-reflection-receipt.md) | `feat-dev-pipeline-improvement` / `HarnessHub-ic7w`・`HarnessHub-xcl3`・`HarnessHub-sl6o` |
| 複数監査 dispatch 台帳 schema 1.2（製品要求の reopen なし） | 開発品質 follow-up（利用者要求・QA セル変更なし） | 製品章は非変更。内部契約は [dev-workflow architecture](../architecture/harness-hub-dev-workflow.md) / [uypz 受領書](../docs/features/feat-dev-pipeline-improvement/uypz-audit-fork-schema12-spec-reflection-receipt.md) | `feat-dev-pipeline-improvement` / `HarnessHub-uypz`（fresh live-trial まで open） |
| サインイン後の既定着地を `/dashboard` に実装結線 | `frontend.md` qa-170 / `ui-ux.md` qa-171（値は確定済み。実装と派生文書の現行値を揃える） | [着地 observability 契約](../specs/harness-hub-post-signin-landing-observability-contract.md) / [受領書](../docs/features/feat-hub-foundation/elegant-home-review-20260813-spec-reflection-receipt.md) | `feat-hub-foundation` / `HarnessHub-1cno` |
| 配色仕様書 v2（グラファイト×アンバー、書体役割分離、md=641/lg=1025） | `frontend.md` / `ui-ux.md` の見た目契約。qa-226 の md=768 逐語は FR-UIF-003/014 が実装正本として上書き | [UI 基盤追補](../specs/harness-hub-ui-foundation-addendum.md) FR-UIF-003/014 / [受領書](../docs/features/feat-hub-foundation/visual-system-v2-20260813-spec-reflection-receipt.md) | `feat-hub-foundation` / `HarnessHub-l0o6` |
| 本番最初の tenant / workspace / workspace-admin 投入経路 | 既存の tenant・role・JIT member 契約（確定 QA 本文は非変更）。画面経路が無い運用ギャップの実装写し | [writeback](../specs/harness-hub-system-specification-implementation-writebacks.md#本番テナント-bootstrap-cli-writeback-2026-08-15--harnesshub-s8oe) / [受領書](../docs/features/feat-auth-tenancy/s8oe-spec-reflection-receipt.md) | `feat-auth-tenancy` / `HarnessHub-s8oe` |
| 成果物一覧のカード既定と本文 `:::cards`（qa-232 / qa-233 の実装 writeback） | `ui-ux.md` / `frontend.md` の確定契約。回答本文は reopen しない | [カード実装 writeback](../specs/harness-hub-system-specification-implementation-writebacks.md#成果物カード一覧-製品実装-writeback-2026-08-16) / [運用](../docs/features/feat-card-list-shell/operations.md) / [受領書](../docs/features/feat-card-list-shell/card-family-20260816-spec-reflection-receipt.md) | `feat-card-list-shell` / `feat-card-block-authoring` / `HarnessHub-ma7t` / `HarnessHub-iz3n` |
