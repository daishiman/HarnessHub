---
status: recorded
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: "2026-08-11"
feature_ids:
  - feat-dual-catalog-web
  - feat-publish-pipeline
  - feat-hub-foundation
  - feat-dev-pipeline-improvement
dev_graph_node_ids:
  - issue-catalog-route-bundle-headroom-20260810
  - issue-production-smoke-cancel-cleanup-20260810
  - issue-publish-smoke-unwired-20260808
  - issue-governance-gate-not-required-check-20260809
  - issue-verification-tier-unwired-20260809
beads_ids:
  - HarnessHub-vwxc
  - HarnessHub-aauo
  - HarnessHub-pf5o
  - HarnessHub-ic7w
  - HarnessHub-xcl3
  - HarnessHub-sl6o
---

# Hub MVP ops / reliability (2026-08-11) — 仕様反映受領書

## 1. 依頼と目的

今回変更している Beads 課題群を最終レビューし、実装差分と仕様・設計の正本を一致させたうえで
commit / draft PR する。MVP のため評価は最小限とし、本番実走証跡や外部設定は follow-up に残す。

## 2. 結論

| Beads | 内容 | 受入 | 仕様影響 |
|---|---|---|---|
| `HarnessHub-vwxc` | catalog 全 route の G13 95% 未満 | **達成**（production build 実測） | あり（frontend / docs / features / architecture） |
| `HarnessHub-aauo` | cancel 後 smoke fixture 独立回収 | **ローカル実装達成**（本番証跡は残件） | あり（DB expand migration / testing-qa 追補） |
| `HarnessHub-pf5o` | publish smoke の channel 解放順序 | **ローカル実装達成**（本番再実走は残件） | あり（smoke 手順契約） |
| `HarnessHub-ic7w` | required-check 台帳と parity | **部分達成**（protection 未適用） | あり（dev-workflow 設計の強制境界） |
| `HarnessHub-xcl3` | tier 下流切替 | **未配線を明示**（部分切替撤回） | あり（未配線境界の設計契約） |
| `HarnessHub-sl6o` | pre-push jsonschema 誤判定 | **実装達成**（実 push 経路証跡は残件） | なし（開発ツール境界のみ） |

## 3. 中学生向けの説明

1. **画面の荷物**: カタログのページが運びすぎる荷物を減らし、「もうすぐいっぱい」の黄色い線の内側に戻した。
2. **試験データのお片付け**: 本番の自動点検が途中で止まっても、あとから「期限切れの試験用アカウント」を探して消せる名簿を作った。
3. **検査の名簿**: 「マージ前に必ず通すべき検査」の一覧を 1 冊の台帳にまとめた。まだ本丸の鍵（branch protection）はかけていない。
4. **検査の重さ**: 変更の大きさで検査を軽くする仕組みはあるが、途中までしか繋がないと危ないので「まだ繋いでいない」とはっきり書いた。
5. **手元の検査道具**: パソコンの python 設定の差で「部品が無い」と誤って止まるのを直した。

## 4. 専門的な説明

- **G13 headroom**: `packages/ui` の token **名前**を `token-names.ts` へ降ろし、`contrast` 計算と色値表を client First Load から外した。PublishWizard は `React.lazy` + Tracker/HTTP adapter 遅延読込。同期 checkpoint で ZIP 変更直後の idempotency 競合を防ぐ。
- **fixture lease**: `smoke_fixture_leases` が削除 authority。全 smoke 入口が同一 lifecycle で tenant+lease を atomic 登録。TTL 不正は fail-closed。sweeper は schedule 設定 15 分だが GitHub Actions 遅延があり得るため SLA ではない。
- **publish smoke sequencing**: S3 `needs_fix` は partial UNIQUE index 上の active channel slot を保持するため、cancel API で `draft` へ戻してから S4 の blocker を `ready` にする。CI build の DB package 公開入口には lifecycle factory の値 export も追加した。
- **required-check**: check run 単位は job。paths filter 付き required 化は hard violation。`no-branch-protection` モードを台帳に明示。
- **tier wiring**: 9 gate 全件 `wiring_state=unwired`。governance 内 1 件だけの advisory 切替は撤回。時間短縮の本丸は hub-ci / plugin pytest 側。
- **python resolver**: `scripts/lib/resolve-python.sh` を SSOT。`validate-plugin-packages.py` が jsonschema 不足時に再 exec。

## 5. 反映先

| 層 | 反映 |
|---|---|
| `system-spec/` | 確定章は reopen せず、`index.md` の実装 writeback 索引へ 3 行追加 |
| `specs/` | production coverage smoke 追補のデータモデル / 移行節を lease 対応へ更新 |
| `architecture/` | frontend / testing-qa / dev-workflow / infrastructure |
| `features/` | dual-catalog / publish-pipeline / hub-foundation / dev-pipeline-improvement |
| `tasks/` | publish P13 / dual-catalog P13 / verification-tier handoff へ実行記録 |
| `docs/` | frontend-spec §8、本受領書 |
| `issues/` | 4 件の進捗節（実装時点で記載済み）を最終レビューで再確認 |

## 6. 影響なし / 非変更境界

- 製品公開 API の request/response schema、ACTION_RULES の role 判定、Cloudflare deploy unit の形は変更しない。
- `smoke_fixture_leases` は **試験用 lifecycle 専用**の expand-only 表であり、業務テナントのドメインモデルではない。
- `HarnessHub-sl6o` は CI/hook 実行環境の interpreter 解決のみで、製品仕様の契約を変えない。
- 確定章 (`system-spec/*.md`) の qa 逐語は R4-reopen していない。実装契約は writeback 索引 + `specs/` / `architecture/` が正本。

## 7. 検証（MVP 最小）

- task 仕様書: `feat-publish-pipeline` / `feat-dual-catalog-web` / `feat-dev-pipeline-improvement` の P01〜P13 がすべて存在し、契約違反 0 件。
- focused Hub: production publish / coverage smoke と PublishWizard / CLI parity の **62/62 PASS**。
- focused DB: backup / migration lineage / hearing / publish smoke の **29/29 PASS**。
- Hub 全スイート: **162 files / 1,800 tests PASS（8 todo）**。初回は並列負荷下の `--help` 子プロセスが 30 秒で timeout したため、実行契約は変えず該当 integration test の上限のみ 90 秒へ補正した。
- DB / Hub typecheck、Hub production build、Next / OpenNext build、Biome / lint は PASS。catalog の First Load JS は一覧 113 kB / 詳細 113 kB / publish 112 kB。
- Python / governance: required-gate 関連の **78 tests PASS**。required check 未登録 3 件は `INCOMPLETE` と明示し、静的契約自体は PASS。
- repository CI 合成ゲート: **PASS 141 / WARN 5 / FAIL 0**（WARN は段階導入中の既存 advisory）。
- `git diff --check`、doc 行数ラチェット（681 文書 / 上限 300 行）、手書きファイル 500 行制約は PASS。

## 8. 残課題

- `HarnessHub-aauo`: 本番 migration 適用後の force-cancel / sweeper 実走証跡
- `HarnessHub-pf5o`: 修正 SHA の production publish smoke 再実走証跡
- `HarnessHub-ic7w`: branch protection 適用と required 3 件登録（30 回安定 green 後）
- `HarnessHub-xcl3`: 9 gate の cross-workflow 配線と blocking 切替
- `HarnessHub-sl6o`: 修正 commit 後の通常 `git push` 経路での受入
- `HarnessHub-preq`: navigation VRT baseline +197px
- `HarnessHub-x30r`: 非 catalog route の G13 警告帯

## 9. 500 行制約

- `smoke-production-publish-support.ts` を 521 → 418 行へ削減し、ZIP 生成を `smoke-production-publish-zip.ts`（116 行）へ分離。
- `smoke-production-coverage.ts` を 509 → 491 行へ縮小し、help / 固定 fixture を `smoke-production-coverage-contract.ts` へ分離。
- `validate-required-gates.py` は 499 行で境界内。
- 生成物（migration snapshot / graph.json 等）は分割対象外。`.github/workflows/ci.yml` は main 時点で 562 行の既存単一 workflow であり、required-check context・permissions・secret scope を変える分割は今回の局所修正より高リスクなため別責務と判断した。
