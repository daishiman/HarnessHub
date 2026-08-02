---
status: confirmed
layer: feature-quality
task: SYS-PUBLISHER-PLUGIN-P11
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: docs/features/feat-publisher-plugin/final-review-record.md
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin 証跡集約 (P11)

> **位置づけ**: P11 の成果物。[test-run-results.md](./test-run-results.md) (P06)・[acceptance-record.md](./acceptance-record.md) (P07)・[quality-assurance-report.md](./quality-assurance-report.md) (P09)・[final-review-record.md](./final-review-record.md) (P10) の証跡を、実機を持たない第三者でも同一手順で再現・検証できる形に集約する。実機 E2E の再実行そのものはスコープ外 (本 task は証跡集約と再現手順の明記のみ)。

集約日: 2026-08-02

---

## 1. 再現に必要な前提条件

| 項目 | 値 |
|---|---|
| リポジトリ | github:daishiman/HarnessHub |
| ブランチ/worktree | `devgraph/feat-publisher-plugin` |
| package digest | `sha256:b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df` |
| feature context digest | `sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41` |
| Node/pnpm | pnpm workspace (`pnpm-workspace.yaml` に `apps/publisher` 登録済み) |
| Python | `python3` (validate-system-plan.py 実行用) |
| 実機 E2E (macOS) | この開発環境 (darwin 25.3.0) では fake I/O のローカル自動テストのみ実行済み。Hub・Device Flow・Wrangler を実サービスで接続する E2E は未実測 |
| 実機 E2E (Windows) | この開発環境には存在しない。§4 の手動手順書に従い別途 Windows 実機で実施する必要がある |

---

## 2. P06 (テスト実行結果) の再現手順

| # | コマンド | 期待結果 (test-run-results.md §1 実測値) |
|---|---|---|
| C1 | `pnpm --filter @harness-hub/publisher typecheck` | pass (エラー 0 件) |
| C2 | `pnpm exec biome check apps/publisher packages/schemas/publisher-plugin` | pass (No fixes applied) |
| C3 | `pnpm --filter @harness-hub/publisher exec vitest run --coverage` | 19 files / 108 tests passed / 4 todo (112) — exit 0。カバレッジ: Statements 89.52% / Branches 95.13% / Functions 89.7% / Lines 89.52% |
| C4 | `node scripts/ci/check-shared-layer-duplicates.mjs` | 登録共通層 12 件 + 運用機構 4 件 / 走査 528 ファイル / 違反 0 件 |
| C5 | `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publisher-plugin` | `status: pass`, violations 0 件 |

todo 4 件の内訳 (test-run-results.md §2): PT1-B (Python 資産同値の追加観点、P08 で確認済み)、PT2-C (family 全失効判定は Hub 側 feat-auth-tenancy の責務、client 側は無条件クリアのみ検証、`pt2-device-flow-auth.test.ts` 101 行目)、PT4-D の Windows 分、PT6-B の Windows 分。fail は 0 件。

---

## 3. P07 (受入判定) / P09 (品質保証) の再現手順

P07 は P06 の実行結果のみを根拠とする判定であり、追加コマンドは発生しない (acceptance-record.md §1)。P09 は以下を追加実行する。

| # | コマンド | 期待結果 (quality-assurance-report.md §7 実測値) |
|---|---|---|
| C1 | `pnpm --filter @harness-hub/publisher typecheck` | pass (エラー 0 件) |
| C2 | `pnpm exec biome check apps/publisher packages/schemas/publisher-plugin` | pass (No fixes applied、49 files) |
| C3 | `pnpm --filter @harness-hub/publisher exec vitest run --coverage` | 19 files / 108 tests passed / 4 todo (112) — exit 0 |
| C4 | `node scripts/ci/check-shared-layer-duplicates.mjs` | 走査 506 ファイル (P09 で追加した `check-plaintext-secret-storage.mjs` 分 +2) / 違反 0 件 |
| C5 | `node apps/publisher/scripts/check-plaintext-secret-storage.mjs` | 走査 24 本番ファイル / 4 観点 (fs-write-absence/env-credential-absence/log-leak-absence/secret-file-absence) / 違反 0 件 |
| C6 | `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publisher-plugin` | `status: pass`, violations 0 件 |

---

## 4. macOS/Windows 実機 E2E タイムボックス実測値 (P06 §3 の転記 + 再現手順)

### 4.1 macOS: 自動計測 (実測値、test-run-results.md §3.1)

再現コマンド: `pnpm --filter @harness-hub/publisher exec vitest run src/__tests__/pt4-wrangler-deploy-wrapper.test.ts src/__tests__/pt6-cross-platform-toolchain.test.ts`

`apps/publisher/src/__tests__/support/e2e-fixture.ts` の `runInitialPublishTimebox()` が package 収集→pre-check→Device Flow 認証→wrangler 実行→Hub 登録の 1 サイクルを `performance.now()` で計測する。

| 実行回 | elapsedMs |
|---:|---:|
| 1 | 42.56 |
| 2 | 9.93 |
| 3 | 9.29 |
| 4 | 2.07 |
| 5 | 5.12 |
| 平均 | 13.80 |
| 最大 | 42.56 |

15 分 (900,000ms) 以内達成可否: **未判定**。最大 42.56ms は fake I/O の処理オーバーヘッドに過ぎず、実サービスを含む初回 publish の計測ではない。

**計測の限界 (誠実性のための転記)**: Hub API・wrangler CLI 子プロセス・ブラウザでの実 OAuth 認可操作はすべて fake (即時応答) に置き換えている。実ネットワーク往復・人間が認可ボタンを押すまでの待ち時間・実 Cloudflare デプロイの所要時間は一切含まれない。これは「ソフトウェア自身の処理オーバーヘッドが 15 分のボトルネックにならないこと」の確認であり、「作者が実際に 15 分以内で初回 publish を完了できる」ことの実機証明ではない。

### 4.2 Windows: 手動実施用再現手順書 (未実測)

この開発環境に Windows 実機が存在しないため自動計測は行っていない。作者が Windows 実機で以下を実施し、15 分以内に完了することを確認する必要がある (test-run-results.md §3.2 の転記)。

**前提**: Node.js LTS・pnpm・wrangler CLI (認証済み)・対象 tenant への `publish:write` scope を持つアカウント。

**手順**:

1. 計測開始時刻を記録する (PowerShell: `Get-Date`)。
2. `pnpm install`
3. `plugin.json` に `name`/`version`/`description` を含む skills-package ディレクトリを用意する。
4. 以下を実行する:
   ```
   pnpm --filter @harness-hub/publisher cli publish --hub-url <HUB_BASE_URL> --tenant-slug <TENANT_SLUG> --origin <CLI_ORIGIN> --package-dir <PACKAGE_DIR> --project-id <PROJECT_ID> --target skill --visibility private
   ```
   (target=web_app で wrangler deploy まで確認する場合は `--target web_app --wrangler-config <WRANGLER_TOML_PATH>` を追加。)
5. 表示された URL をブラウザで開き OAuth 認可を完了する (唯一の人手操作)。
6. `公開が完了しました (id=..., status=published)` の表示と exit code 0 を確認する。
7. Hub 側 (`GET /api/v1/publish/:id`) で `published` を確認する。
8. 計測終了時刻を記録し、手順 1〜7 の合計が 15 分 (900 秒) 以内であることを確認する。

**現状**: 手順 5〜7 の実機実測はこの開発環境では未了 (acceptance-record.md §1 A1/A3、final-review-record.md §1・§2 に明記済み)。実施結果を得次第、本節と test-run-results.md §3.2 の両方を更新する。

---

## 5. feature context 全件の P11 責務追跡 (未割当 0 件)

| scope_in / acceptance | P11 が集約した証跡 |
|---|---|
| package 収集 + manifest 補完 | §2 C3 (`pt1-core-manifest-and-python-parity.test.ts` 経由) |
| ローカル pre-check (Hub と検査ロジック共有) | §2 C3 (`pt3-inspection-client-parity.test.ts`) |
| Device Flow 認証 + OS 資格情報域保存 | §3 (quality-assurance-report.md §1・§2)、§2 C3 (`pt2-device-flow-auth.test.ts`) |
| web_app 経路の wrangler スクリプト実行 | §2 C3 (`pt4-wrangler-deploy-wrapper.test.ts`) |
| Python 資産の挙動同値移植テスト | §2 todo 内訳 (PT1-B、P08 refactoring-migration-note.md §1 で確認済み) |
| acceptance 1 (macOS/Windows E2E) | §4 |
| acceptance 2 (pre-check と Hub 検査の判定同値) | §2 C3 (`pt3-inspection-client-parity.test.ts` 4 件 pass) |
| acceptance 3 (初回 publish 15 分以内) | §4 |

未割当 0 件。

---

## 6. Normative implementation closure の Mandatory evidence (証跡としての再掲)

| Mandatory evidence | 状態 | 集約元 |
|---|:--:|---|
| plugin manifest/slash command/skill/script の実体 | 済み | final-review-record.md §5 |
| apps/publisher への単一接続 | 済み | final-review-record.md §5 |
| Keychain/Credential Manager | 済み | final-review-record.md §5、quality-assurance-report.md §2 |
| macOS/Windows E2E | 未達（実サービスを使う両 OS の実測待ち） | 本書 §4 |
| 初回 15 分 | 未達（実サービスを含む両 OS の計測待ち） | 本書 §4 |
| marketplace source の content hash | 未着手 (P13 の責務) | acceptance-record.md §2、final-review-record.md §5 |

---

## 7. 判定

P06/P07/P09/P10 の証跡を、実機を持たない第三者が同一コマンドで再現できる形に source digest 付きで集約した。ローカル自動試験の再現手順に不備は発見されなかった。一方、実サービスを使う両 OS の E2E と 15 分実測は、この集約で完了に読み替えない。

実機証跡取得後に P06/P07/P10/P11/P13 を再判定する。

---

## 8. 最終レビュー再実行 (2026-08-02)

最終レビューで、Wrangler が URL 出力後に非 0 終了した場合に deployment を Hub へ記録しない経路を修正した。`orphan_candidate` として URL/exit code を登録するテストを追加し、次を再実行した。

| コマンド | 結果 |
|---|---|
| `pnpm --filter @harness-hub/publisher test` | **19 files / 110 tests passed / 4 todo (114)** — exit 0。Statements / Branches / Functions / Lines の全カバレッジ指標が閾値 80% 以上 |
| `pnpm --filter @harness-hub/publisher typecheck` | pass (エラー 0 件) |
| `pnpm exec biome check apps/publisher packages/schemas/publisher-plugin` | pass |

この再実行も fake I/O のローカル試験である。A1/A3 の実機 E2E・15 分実測の未達判断は変わらない。
