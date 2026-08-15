---
status: confirmed
layer: feature-evidence
---

# 検証エビデンス索引 (feat-demo-coverage-dataset / P11)

本 feature の検証結果 (P06 テスト実行・P07 受入・P09 品質保証・P10 最終レビュー) を 1 か所に索引化した文書である。後続 feature `feat-ui-integrity-audit-harness` の担当者が「本 feature は何をどこまで保証しているのか」「その保証を自分の手で再現するには何を叩けばよいか」を、この 1 ファイルから辿れることを目的とする。

- 作成日: 2026-08-15
- **参照切れ: 0 件** (§4 の到達性検査で実測)
- 前提: `final-review-notes.md` (P10) が 3 constraint 全件充足

すべての path は repository root からの相対 path である。コマンドも repository root で実行する前提で書いている。

## 1. 成果物の索引

| 工程 | 成果物 | 何が記録されているか | 再実行コマンド |
|---|---|---|---|
| P06 テスト実行 | [test-run-report.md](docs/features/feat-demo-coverage-dataset/test-run-report.md) | T1〜T6 の 6 カテゴリ全件の pass/fail、CLI での 2 回連続実行によるダンプ差分 0 行の実測 | `pnpm install --frozen-lockfile` のあと `pnpm --filter @harness-hub/db test`。計画検査は `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset` |
| P07 受入 | [acceptance-report.md](docs/features/feat-demo-coverage-dataset/acceptance-report.md) | acceptance A1〜A7 の 7 項目それぞれの pass/fail 判定と根拠 | `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset` |
| P09 品質保証 | [quality-assurance-report.md](docs/features/feat-demo-coverage-dataset/quality-assurance-report.md) | 品質ゲート G1〜G7 (lint / test+coverage / typecheck / 未カバー 0 件 / enum 全値 / 冪等性 / ローカル専用ガード) の実測 | `pnpm --filter @harness-hub/db lint` と `pnpm --filter @harness-hub/db test -- --coverage` |
| P10 最終レビュー | [final-review-notes.md](docs/features/feat-demo-coverage-dataset/final-review-notes.md) | 3 constraint (冪等性 / ローカル専用ガード / 未カバー 0 件) の最終充足判定と、独立再検査 5 件の結果 | `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset` |

上流の設計・要件文書も併せて索引する (再実行コマンドは持たないが、判定の根拠を辿るために必要になる)。

| 工程 | 成果物 | 役割 |
|---|---|---|
| P01 | [requirements-baseline.md](docs/features/feat-demo-coverage-dataset/requirements-baseline.md) | acceptance A1〜A7 と 28 route × 5 状態の対応表骨子の正本 |
| P02 | [architecture-decision-record.md](docs/features/feat-demo-coverage-dataset/architecture-decision-record.md) | 設計判断 D1〜D7 とガード方針 G4、検査方針 §9.2/§9.3 |
| P03 | [design-review-notes.md](docs/features/feat-demo-coverage-dataset/design-review-notes.md) | 設計独立レビュー (論点 1〜4)、申し送り H3 |
| P04 | [test-design.md](docs/features/feat-demo-coverage-dataset/test-design.md) | 検査 T1〜T6 の定義と CLI 契約 |
| P05 | [route-state-matrix.md](docs/features/feat-demo-coverage-dataset/route-state-matrix.md) | 28 route × 5 状態の対応表 (適用 105 / 非適用 35 / 未割当 0) |
| P08 | [refactoring-migration-note.md](docs/features/feat-demo-coverage-dataset/refactoring-migration-note.md) | migration 不要 (N/A) 判定と、将来必要になる 3 条件 |

## 2. 検証を担う実行可能物

報告書は「そのとき緑だった」ことしか示さない。**今この瞬間に緑かどうか**を確かめるには次を直接叩く。

| # | 何を確かめるか | コマンド | 期待 |
|---|---|---|---|
| E1 | route × 状態の未カバー 0 件 (A7 / G4) | [verify-demo-coverage-matrix.ts](packages/db/scripts/verify-demo-coverage-matrix.ts) を `packages/db` から実行 | exit 0 / 「未カバー 0 件」 |
| E2 | 冪等性 (A5 / G6) | `pnpm --filter @harness-hub/db exec vitest run __tests__/seed-coverage/idempotency.test.ts` | 5 件 pass |
| E3 | ローカル専用ガード (A6 / G7) | `pnpm --filter @harness-hub/db exec vitest run __tests__/seed-coverage/local-guard.test.ts` | 4 件 pass |
| E4 | enum 全値網羅 (G5) | `pnpm --filter @harness-hub/db exec vitest run __tests__/seed-coverage/enum-coverage.test.ts` | 全件 pass |
| E5 | 全検査 + カバレッジ | `pnpm --filter @harness-hub/db test` | 49 files / 388 tests pass、4 指標とも 80% 以上 |
| E6 | デモデータの投入 (ローカルのみ) | [seed-coverage.ts](packages/db/scripts/seed-coverage.ts) をローカル file URL で実行 | exit 0 |

> **E6 の注意:** 非ローカル URL を渡すと exit 2 で拒否される (これは不具合ではなく仕様。`isLocalDatabaseUrl` による本 feature の安全装置)。本番・staging の DB URL を渡してはならない。

**環境の注意 (macOS arm64):** 既定の `node` が x64 スライスで起動すると `@rollup/rollup-darwin-x64` を要求して vitest が落ちることがある。その場合は arm64 の node を直接指定する。

```bash
cd packages/db && /opt/homebrew/bin/node "$(pnpm root)/vitest/vitest.mjs" run
```

## 3. 実装ファイルの索引

| ファイル | 役割 |
|---|---|
| [seed-coverage.ts](packages/db/scripts/seed-coverage.ts) | 投入 CLI。URL 判定を他のどの引数検査よりも先に行う |
| [verify-demo-coverage-matrix.ts](packages/db/scripts/verify-demo-coverage-matrix.ts) | 未カバー 0 件の検査 CLI。DB へ接続せず、対応表と fixture 宣言を突き合わせる |
| [demo-coverage/](packages/db/scripts/demo-coverage/) | fixture 宣言・対応表・決定論 ID・投入本体 |
| [seed-coverage テスト](packages/db/__tests__/seed-coverage/) | T1〜T6 のテスト 6 ファイル |

## 4. 参照切れの検査

本索引が指す path がすべて実在することを、次のコマンドで機械的に確認できる。索引は放置すると参照先の移動・改名で静かに腐るため、判定は目視ではなくこの実行結果を根拠にする。

```bash
python3 - <<'PY'
import pathlib, re, sys
index = pathlib.Path('docs/features/feat-demo-coverage-dataset/evidence/index.md')
targets = sorted(set(re.findall(r'\]\((\.\.[^)]+)\)', index.read_text(encoding='utf-8'))))
missing = [t for t in targets if not (index.parent / t).exists()]
print(f'参照 {len(targets)} 件 / 参照切れ {len(missing)} 件')
for m in missing:
    print('  MISSING:', m)
sys.exit(1 if missing else 0)
PY
```

実測 (2026-08-15): 参照 14 件 / **参照切れ 0 件** (exit 0)。

## 5. 不整合

**なし。** 索引先の成果物どうしに矛盾は見つかっていない (constraint の一貫性判定は `final-review-notes.md` §2 が担う)。

## 6. 後続 feature への引き継ぎ

`feat-ui-integrity-audit-harness` が本 feature に依存して前提にできるのは、次の 3 点である。

1. **28 route × 5 状態の到達手順が機械可読な形で存在する** — `packages/db/scripts/demo-coverage/coverage-matrix.ts` が正本。表の route 集合は `apps/hub/src/app` 配下の `page.tsx` 実測集合と一致することが検査済み。
2. **その到達手順が指す fixture は実在する** — 表だけ埋まって実行すると画面が空、という状態は E1 が検出する。
3. **同じ seed を何度実行しても同じ状態になる** — 監査を繰り返しても前提データが変動しない (E2)。

逆に**前提にできないこと**は `final-review-notes.md` §5 に列挙してある。特に「画面を実際に開いて崩れがないこと」は本 feature の保証範囲外である。
