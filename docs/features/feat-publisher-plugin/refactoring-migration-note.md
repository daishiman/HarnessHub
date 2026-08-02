---
status: confirmed
layer: feature-quality
task: SYS-PUBLISHER-PLUGIN-P08
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: docs/features/feat-publisher-plugin/acceptance-record.md
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin リファクタリング/マイグレーション note (P08)

> **位置づけ**: P08 の成果物。本 feature は永続 DB migration を持たないため、正本 task spec §背景 の読み替えにより、(1) Python 資産参照コメントの整理、(2) `packages/inspection` 消費コードの重複排除確認、(3) Python 資産本体への非改変の明記、の 3 点を行う。[acceptance-record.md](./acceptance-record.md) (P07) で受入判定済みの実装が対象。

確認日: 2026-08-02

---

## 1. Python 資産参照コメントの整理結果

`apps/publisher/src/` を全文検索した結果、Python 資産への参照コメントは `__tests__/pt1-core-manifest-and-python-parity.test.ts` の PT1-B ブロック (1 箇所、3 行) にのみ存在した。それぞれの主張を実際の Python 資産と突き合わせて検証した。

| コメントの主張 | 突き合わせ先 | 検証結果 |
|---|---|---|
| Python 側は `.claude-plugin/plugin.json` という別 path・別収集方式 (個別ファイルグロブ) を対象にしており、ファイル一覧そのものは TS 側の汎用再帰 walk と形が異なるため直接比較できない | `plugins/harness-creator/skills/assign-plugin-package-evaluator/scripts/validate-plugin-package.py` | 一致。同 script はファイル一覧の網羅比較ではなく個別ファイル読取り方式であり、TS 側 `collectPackageFiles` (汎用再帰 walk) とは収集方式が異なる |
| 両側で唯一比較可能なのは「必須メタキーの集合」だけ | 同上、52 行目 `PLUGIN_JSON_REQUIRED = {"name", "version", "description"}` | 一致。`apps/publisher/src/core/manifest.ts` の `REQUIRED_FIELDS = ['name', 'version', 'description']` と完全に同じ集合 |
| (関連参照) `pkg-id-catalog.yaml` / `aggregate-pkg-findings.py` の実在 | `plugins/harness-creator/skills/ref-pkg-contract/references/pkg-id-catalog.yaml`、`plugins/harness-creator/skills/run-plugin-package-check/scripts/aggregate-pkg-findings.py` (implementation-notes.md §1.2 / test-design.md PT1-B が言及) | 両 path とも実在を確認 (`find` で検証済み) |

**結論**: 3 箇所のコメントはいずれも stale 化しておらず、参照先の Python 資産の実装と正確に一致している。誤りの訂正や書き換えを要する箇所は無いため、コメント文言自体への変更は行わない。

---

## 2. `packages/inspection` 消費コードの重複排除確認

`apps/publisher/src/` 配下で判定ロジック (pre-check の可否判定) を持ちうる箇所を確認し、`packages/inspection` の判定ロジックを再実装していないかを検証した。

| ファイル | 役割 | 判定ロジックの重複 |
|---|---|---|
| `inspection-client/index.ts` (`runLocalPreCheck`) | `createPublishInspectionRules()` と `runInspection()` を呼ぶだけの 1 行実装 | 無し (AD-3 が定める薄い wrapper の原則をそのまま満たす) |
| `core/collect.ts` (`collectPackageFiles`) | 全ファイルをそのまま収集するのみで、正しい package 構造かどうかの判定は行わない (冒頭コメントに明記、構造判定は inspection-client 経由の PKG-* ルールへ委譲) | 無し |
| `core/catalog.ts` (`buildCatalogEntry`) | 表示用の整形のみを行い、公開可否の判定は一切行わない (冒頭コメントに明記) | 無し |
| `core/manifest.ts` (`completePackageManifest`) | 必須フィールド欠落・semver 形式エラーの検出は `packages/inspection` の PKG-SEMVER 判定と同じ結果になるよう実装されているが、判定規則の定義自体は `packages/inspection` 側が owner (PT1-A テストで同値確認済み) | 無し |

**結論**: `apps/publisher/src/` 内に判定ロジックの独自実装・二重実装は 0 件。判定ロジックの owner は `packages/inspection` の 1 箇所に閉じている (acceptance 2、implementation-notes.md §1.2 で既に確認済みの状態を本 phase で再確認した)。

---

## 3. Python 資産本体への非改変の明記

本 task の作業範囲は `apps/publisher/src/` (コメント調査・確認) と本ファイルの新規作成のみであり、`plugins/harness-creator` 配下の Python 資産本体には一切変更を加えていない。これは正本 task spec §スコープ外 が定める「`plugins/harness-creator` (Python 資産本体) への変更は本 feature の対象外 (参照のみで改変しない)」に従う。

---

## 4. Backend 以外のワークストリームの適用状況

正本 task spec §Workstream applicability の宣言どおり、本 phase で変更が発生したのは Backend (`apps/publisher/src/` の確認、変更差分は無し) と Documentation (本ファイルの新規作成) のみである。

| ワークストリーム | 適用状況 | 理由 |
|---|---|---|
| Frontend | N/A | 本 feature は frontend 実装物を持たない |
| Backend | applicable | 上記 §1・§2 の確認を実施 (コード変更は無し、確認のみ) |
| API | N/A | API 契約自体の変更は伴わない |
| Data | N/A | 本 feature は DB migration を持たない |
| Infrastructure | N/A | 新規インフラのプロビジョニングは対象外 |
| Security | N/A | セキュリティ観点の詳細検証は P09 で扱う |
| Quality | applicable | 本ファイルに整理結果を記録 |
| Documentation | applicable | 本ファイルを新規作成 |
| Operations | N/A | 運用手順の具体化は P12 で行う |

---

## 5. コード変更の有無

**本 phase ではソースコードへの変更は発生しなかった** (§1・§2 の調査の結果、既存コメント・実装が全て正確かつ重複が無いことを確認したのみ)。そのため、typecheck / biome / vitest の再実行は不要と判断し、正本 task spec §実行契約 が定める rerun コマンドのみを再実行した。

| # | コマンド | 結果 |
|---|---|---|
| C1 | `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publisher-plugin` | `status: pass`, violations 0 件 |

---

## 6. 判定

Required evidence (Python 資産参照コメントの整理結果・inspection 呼び出しの重複排除確認・Python 資産本体への非改変の明記) の 3 点をいずれも記載した。P07 で受入判定済みの実装との乖離は検出されず、rollback は不要。

P09 (品質・セキュリティ保証) へ引き継ぐ。
