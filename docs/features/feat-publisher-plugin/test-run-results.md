---
status: confirmed
layer: feature-quality
task: SYS-PUBLISHER-PLUGIN-P06
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: docs/features/feat-publisher-plugin/test-design.md
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin テスト実行結果 (P06)

> **位置づけ**: P06 の成果物。[test-design.md](./test-design.md) (P04) で設計し [implementation-notes.md](./implementation-notes.md) (P05) で実装対象を揃えたテストケースを実行し、結果を確定する。

実行日: 2026-08-02 / 実行環境: darwin 25.3.0 (本開発環境), Node.js (pnpm workspace), vitest v3.2.7

---

## 1. 実行コマンドと結果 (実測)

| # | コマンド | 結果 |
|---|---|---|
| C1 | `pnpm --filter @harness-hub/publisher typecheck` | pass (エラー 0 件) |
| C2 | `pnpm exec biome check apps/publisher packages/schemas/publisher-plugin` | pass (No fixes applied) |
| C3 | `pnpm --filter @harness-hub/publisher exec vitest run --coverage` | **19 files / 108 tests passed \| 4 todo (112)** — exit 0 |
| C4 | `node scripts/ci/check-shared-layer-duplicates.mjs` | 登録共通層 12 件 + 運用機構 4 件 / 走査 528 ファイル / **違反 0 件** |
| C5 | `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publisher-plugin` | `status: pass`, violations 0 件 |

C3 のカバレッジ (グローバル集計, 閾値 80%): Statements 89.52% / Branches 95.13% / Functions 89.7% / Lines 89.52%。

---

## 2. 全テストケース pass/fail 一覧 (`apps/publisher/src/__tests__/` + 各 unit test)

| ファイル | 件数 | pass | todo | 主たる検証対象 |
|---|---:|---:|---:|---|
| `pt1-core-manifest-and-python-parity.test.ts` | 7 | 6 | 1 | PT1: manifest 補完・5 サブディレクトリ責務境界 |
| `pt2-device-flow-auth.test.ts` | 14 | 13 | 1 | PT2: Device Flow 状態機械・token 数値契約・OS 資格情報域 |
| `pt3-inspection-client-parity.test.ts` | 4 | 4 | 0 | PT3: Publisher/Hub context の verdict 一致 (acceptance 2) |
| `pt4-wrangler-deploy-wrapper.test.ts` | 8 | 7 | 1 | PT4: wrangler CLI 実行ラッパー、PT4-D 実機 E2E タイムボックス計測 |
| `pt5-plugin-surface-structure.test.ts` | 6 | 6 | 0 | PT5: plugin 面の構造・apps/publisher への単一接続 |
| `pt6-cross-platform-toolchain.test.ts` | 4 | 3 | 1 | PT6: pnpm script の OS 非依存性、PT6-B E2E 成功確認 (acceptance 1) |
| `pt7-feedback-subcommand.test.ts` | 3 | 3 | 0 | PT7: feedback サブコマンドの薄いクライアント契約 |
| `core/collect.test.ts` | 3 | 3 | 0 | package 収集 |
| `core/catalog.test.ts` | 2 | 2 | 0 | catalog 表示用整形 |
| `core/package-archive.test.ts` | 3 | 3 | 0 | ZIP 組み立て |
| `auth/device-flow.test.ts` | 6 | 6 | 0 | polling 状態機械 |
| `auth/credential-store.test.ts` | 12 | 12 | 0 | Keychain/Credential Manager adapter |
| `auth/token-claims.test.ts` | 3 | 3 | 0 | access token claims 復元 |
| `cli/index.test.ts` | 12 | 12 | 0 | argv 解析・dispatch 早期リターン |
| `cli/publish-command.test.ts` | 9 | 9 | 0 | `runPublishCommand` 分岐網羅 |
| `cli/session.test.ts` | 3 | 3 | 0 | device flow / refresh 経路選択 |
| `cli/http-client.test.ts` | 6 | 6 | 0 | Hub API クライアント |
| `cli/device-endpoints.test.ts` | 4 | 4 | 0 | device code/token endpoint 構築 |
| `shared/process.test.ts` | 3 | 3 | 0 | 子プロセス実行 (実 `security` CLI 相当の統合) |
| **計** | **112** | **108** | **4** | |

todo 4 件の内訳: PT1-B (Python 資産同値の追加観点、P08 へ引き継ぎ)、PT2-D の一部 (同上、implementation-notes.md §3 既述)、PT4-D の Windows 分、PT6-B の Windows 分。**fail は 0 件。**

---

## 3. PT4-D / PT6-B 実機 E2E タイムボックス計測

test-design.md §11 の運用方針 (2026-08-02 作者確認) どおり、macOS は自動テストで計測し、Windows は手動再現手順書に留める。

### 3.1 macOS: 自動計測結果

`apps/publisher/src/__tests__/support/e2e-fixture.ts` の `runInitialPublishTimebox()` が、package 収集 → pre-check → Device Flow 認証 (初回、保存済み token 無し) → wrangler 実行 → Hub 登録 まで `runPublishCommand` を 1 回実行し、`performance.now()` の差分を計測する。

**計測の限界 (誠実性のための明記)**: この計測が測っているのは *ソフトウェア自身の処理オーバーヘッド* のみである。Hub API・wrangler CLI 子プロセス・ブラウザでの実 OAuth 認可操作はすべて fake (即時応答) に置き換えている。実ネットワーク往復・人間が認可ボタンを押すまでの待ち時間・実 Cloudflare デプロイの所要時間は一切含まれない。この開発環境には実 Hub サーバー・実 tenant・実ブラウザ操作が存在しないため、真の実機実測 (人間が実際に 15 分以内で完了できるか) はこのセッションでは実行できない。

| 実行回 | elapsedMs (ソフトウェア処理オーバーヘッドのみ) |
|---:|---:|
| 1 | 42.56 |
| 2 | 9.93 |
| 3 | 9.29 |
| 4 | 2.07 |
| 5 | 5.12 |
| 平均 | 13.80 |
| 最大 | 42.56 |

**15 分 (900,000ms) 以内達成可否**: fake I/O 境界での実行では **達成 (最大 42.56ms ≪ 900,000ms)**。ただし上記の限界により、これは「ソフトウェアが自分の処理を秒未満で終える」ことの確認であり、「作者が実際に 15 分以内で初回 publish を完了できる」ことの実機証明ではない。後者は下記 3.2 の手動手順書で別途確認する必要がある。

### 3.2 Windows: 手動実施用再現手順書

この開発環境に Windows 実機が存在しないため自動計測は行わない。作者が Windows 実機で以下を実施し、15 分以内に完了することを確認する。

**前提**: Node.js LTS・pnpm・wrangler CLI (認証済み)・対象 tenant への `publish:write` scope を持つアカウントが用意されていること。

**手順**:

1. 計測開始時刻を記録する (ストップウォッチ、または PowerShell で `Get-Date`)。
2. リポジトリ直下で依存関係を導入する: `pnpm install`
3. 公開対象パッケージを用意する (`plugin.json` に `name`/`version`/`description` を含む skills-package ディレクトリ)。
4. 以下のコマンドで publish を実行する:
   ```
   pnpm --filter @harness-hub/publisher cli publish --hub-url <HUB_BASE_URL> --tenant-slug <TENANT_SLUG> --origin <CLI_ORIGIN> --package-dir <PACKAGE_DIR> --project-id <PROJECT_ID> --target skill --visibility private
   ```
   (target=web_app で wrangler deploy まで確認する場合は `--target web_app --wrangler-config <WRANGLER_TOML_PATH>` を追加する。)
5. コンソールに表示される「ブラウザで次の URL を開いて認可してください」の URL をブラウザで開き、OAuth 認可を完了する (これが唯一の人手操作)。
6. CLI が `公開が完了しました (id=..., status=published)` を表示し、exit code 0 で終了することを確認する。
7. Hub 側 (Web UI または `GET /api/v1/publish/:id`) で該当 publish request が `published` になっていることを確認する。
8. 計測終了時刻を記録し、手順 1〜7 の合計所要時間が 15 分 (900 秒) 以内であることを確認する。

**期待結果**: exit code 0、Hub 側で `status=published` を確認できること、手順全体が 15 分以内に完了すること。**この開発環境では手順 5〜7 の実機実測が未了である** — 実施結果は別途 Windows 実機で得られ次第、本節を更新する。

---

## 4. quality_constraints / acceptance 3 件の判定 (一次確認、最終判定は P07)

| # | 対応 | 判定 | 証跡 |
|---|---|:--:|---|
| acceptance 1: macOS/Windows 両実機で publish E2E が成功する | PT6-B | **macOS: pass** / **Windows: 未実測 (手動手順書のみ、§3.2)** | `pt6-cross-platform-toolchain.test.ts` の macOS 自動テスト 1 件 pass |
| acceptance 2: pre-check と Hub 検査の判定が同値 | PT3-A | **pass** | `pt3-inspection-client-parity.test.ts` 4 件 pass。Publisher/Hub 双方が `createPublishInspectionRules()` を同一入力で呼び verdict が一致することを確認 |
| acceptance 3: 初回 publish 15 分以内の実測記録 | PT4-D | **macOS: pass (fake I/O 境界)** / **Windows: 未実測 (手動手順書のみ、§3.2)** | `pt4-wrangler-deploy-wrapper.test.ts` の macOS 自動テスト 1 件 pass。§3.1 の限界明記を判定の一部として扱う |

---

## 5. 未実行のもの

| 項目 | 理由 |
|---|---|
| Windows 実機での PT4-D/PT6-B 実測 | この開発環境に Windows 実機が存在しない (test-design.md §11 既定方針)。§3.2 の手順書で代替し、実測は後続の実機確保後に別途実施する |
| Python 資産との出力差分の実測 (PT1-B の一部) | 移植元の Python 資産は本リポジトリに存在しない。implementation-notes.md §5-2 に引き継ぎ済み |

---

## 6. 判定

**quality_constraints 8 件 + acceptance 3 件のうち、macOS 実機分は全て pass。Windows 実機分 (acceptance 1・3 の一部) は手動手順書ベースで検証可能な状態に留まり、実測は未了。** これは test-design.md §11 が事前に合意した既定方針どおりであり、本 phase の実装漏れではない。P07 (受入) は、この制約を前提に判定する。

fail は 0 件。P08 (リファクタリング) へ引き継ぐ。
