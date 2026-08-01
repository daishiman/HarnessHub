---
status: confirmed
layer: feature-quality
task: SYS-PUBLISH-PIPELINE-P11
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/final-review-record.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline 証跡サマリ

> **位置づけ**: P11 の成果物。P06/P07/P09/P10 の証跡を集約し、**第三者が同じコマンド列で同じ結果を再現できる**手順を確立する。

集約日: 2026-07-30

## 1. 再現手順 (全体)

リポジトリルートで以下を順に実行する。すべて exit 0 になることが期待結果。

```bash
pnpm install --frozen-lockfile

# 型
pnpm typecheck

# テスト
pnpm --filter hub test                          # 68 files / 842 passed
pnpm --filter @harness-hub/inspection test      # 9 files / 151 passed
pnpm --filter @harness-hub/db test              # 30 files / 231 passed

# 静的ゲート
node apps/hub/scripts/check-db-schema-boundary.mjs
node apps/hub/scripts/check-publish-inspection-gate.mjs
node apps/hub/scripts/check-single-authz-middleware.mjs
node scripts/ci/check-tenant-isolation-gate.mjs
node scripts/ci/check-shared-layer-duplicates.mjs
node packages/inspection/scripts/scan-secrets.mjs

# lint
pnpm lint
```

各ゲートは `--json <path>` を付けると機械可読な結果ファイルを出力する (`check-db-schema-boundary.mjs` / `check-publish-inspection-gate.mjs`)。

## 2. quality_constraint ごとの再現コマンド

| # | quality_constraint | 再現コマンド | 期待結果 |
|---|---|---|---|
| Q1 | `publish-request-state-machine-section7-2-property-test-qa009` | `pnpm --filter hub test -- tests/publish-pipeline/state-machine.test.ts` | 19 passed |
| Q2 | `inspection-pipeline-shared-pure-function-package-qa010-qa020` | `pnpm --filter @harness-hub/inspection test` + `node scripts/ci/check-shared-layer-duplicates.mjs` | 151 passed / 違反 0 件 |
| Q3 | `green-auto-publish-yellow-red-needs-fix-i2` | `pnpm --filter hub test -- tests/publish-pipeline/verdict-mapping.test.ts` + `node apps/hub/scripts/check-publish-inspection-gate.mjs` | 10 passed / 違反 0 件 |
| Q4 | `immutable-release-targetchannel-stable-pointer-atomic-rollback-i3` | `pnpm --filter hub exec vitest run tests/publish-pipeline/service.test.ts` + `pnpm --filter @harness-hub/db test` | 45 passed / DB suite pass |
| Q5 | `r2-content-addressed-package-registry-domain-model-db-consumer` | `pnpm --filter hub test -- tests/publish-pipeline/package-inspection.test.ts` + `node apps/hub/scripts/check-db-schema-boundary.mjs` | 13 passed / 違反 0 件 |
| Q6 | `append-only-audit-event-all-publish-operations` | `pnpm --filter @harness-hub/db test` (`audit-chain.test.ts` を含む) | 231 passed |
| Q7 | `rest-zod-single-source-authz-middleware-qa009` | `pnpm --filter hub exec vitest run tests/publish-pipeline/routes.test.ts tests/publish-pipeline/idempotency.test.ts` + `node apps/hub/scripts/check-single-authz-middleware.mjs` | 52 + 26 passed / 違反 0 件 |
| Q8 | `targetchannel-serialization-single-inflight-publishrequest` | `pnpm --filter hub exec vitest run tests/publish-pipeline/service.test.ts` | 45 passed |
| Q9 | `publish-api-dual-principal-csrf-boundary-qa059` | `pnpm --filter hub exec vitest run tests/publish-pipeline/routes.test.ts tests/security/middleware-entry.test.ts tests/auth-tenancy/authz-decision-matrix.test.ts tests/auth-tenancy/authz-entry.test.ts` | dual principal / CSRF / fail-closed Bearer pass |

> `pnpm --filter hub test -- <path>` は vitest へ path を渡す形だが、本リポジトリの設定では全ファイルが走る。ファイル単位で絞る場合は `cd apps/hub && npx vitest run <path>` を使う。

## 3. 非機能要件 (qa-037) の再現コマンド

| # | 要件 | 再現コマンド | 期待結果 |
|---|---|---|---|
| N1 | レート制限 10 回/分 | `pnpm --filter hub exec vitest run tests/publish-pipeline/rate-limit.test.ts` | 15 passed |
| N2-N4 | 冪等鍵 TTL / スコープ / 422 | `pnpm --filter hub exec vitest run tests/publish-pipeline/idempotency.test.ts` | 26 passed |
| N5 | tenant/workspace 隔離 | `node scripts/ci/check-tenant-isolation-gate.mjs` | 12 ケース / 必須 ID 7 種 |
| N6 | secret scan CI ゲート | `node packages/inspection/scripts/scan-secrets.mjs` | 検出 0 件 |
| N7 | authz 判定の一元化 | `node apps/hub/scripts/check-single-authz-middleware.mjs` | 走査 211 / 違反 0 / route 例外 5 件一致 |

## 4. 実測値 (2026-07-30 landing review)

| 対象 | 値 |
|---|---|
| `apps/hub` テスト | 68 files / 842 passed |
| `apps/hub` カバレッジ | Statements 80.52% / Branches 87.90% / Functions 84.50% / Lines 80.52% (閾値 80%) |
| うち `tests/publish-pipeline/` | 10 files / 205 tests |
| `packages/inspection` | 9 files / 151 passed |
| `packages/db` | 30 files / 231 passed |
| `packages/schemas` | 6 files / 86 passed |
| `pnpm lint` | 423 files / error 0 (biome config migration の info 1 件) |
| `check-db-schema-boundary` | 走査 206 ファイル / 違反 0 件 |
| `check-publish-inspection-gate` | 走査 40 ファイル / 違反 0 件 |
| `check-shared-layer-duplicates` | 共通層 12 + 運用機構 4 / 走査 501 ファイル / 違反 0 件 |
| `check-single-authz-middleware` | 走査 211 ファイル / 違反 0 件 |

## 5. 証跡の所在

| phase | 文書 | 内容 |
|---|---|---|
| P06 | [test-run-results.md](./test-run-results.md) | quality_constraints 9 件の pass/fail、検出した欠落 2 件と是正 |
| P07 | [acceptance-record.md](./acceptance-record.md) | acceptance 3 件の判定と根拠 |
| P08 | [refactoring-migration-note.md](./refactoring-migration-note.md) | 移植の最終整理、CI 検査 2 件の新設 |
| P09 | [quality-assurance-report.md](./quality-assurance-report.md) | qa-037 の 7 要件、レート制限の限界 |
| P10 | [final-review-record.md](./final-review-record.md) | 「守らせている機構」の観点での最終確認 |

## 6. 再現できないもの (明示)

| 項目 | 理由 |
|---|---|
| 本番環境での smoke test | P13 の範囲。本リリース時点で未実施 (release-record.md 参照) |
| Python 資産との出力差分 | 移植元が本リポジトリに存在しない (P08 §2-1) |
| isolate 跨ぎのレート制限 | 単一 isolate 内でしか検証できない。分散カウンタは未実装 (P09 §2-4) |
| `db-ports.ts` の実 DB 経路 | 実接続を要するため未到達 (カバレッジ 2.6%) |

この 4 点は「確認していない」のであって「動かない」ではない。ただし**確認済みとして扱ってはならない**。

## 7. P13 と landing 再レビューによる更新 (2026-07-30)

§6 の「本番 smoke 未実施」は P11 集約時点の履歴である。その後 P13 で S1〜S6 を実行し、
Green v1/v2 公開、secret ZIP rejection、channel 直列化、rollback/promote、
R2 object hash、21 audit events の hash chain を本番で確認した。
正本記録は [release-record.md](./release-record.md) §3〜§4。

landing 前レビューでは task package `845b61b…cdd4d` の品質ゲートを再実行し、
上限付き request body、runtime env/DB row validation、500 行分割を追加した。
最新のコマンドと結果は [仕様反映受領書](./spec-reflection-receipt.md) と
[最終レビュー記録](./final-review-record.md) §6 を参照する。

未解消なのは isolate 跨ぎの分散 rate limit と将来変更に対する F8〜F10 である。
これらは現行の単一 isolate 機能受入を妨げないが、分散 counter または owner 側の
静的整合検査が必要な follow-up として Beads に保持する。
