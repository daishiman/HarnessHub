---
graph_node_id: "issue-auth-tenancy-ci-wiring-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["follow-up","ci","auth-tenancy","qa-020","sec2"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "feat-auth-tenancy の認証・認可 CI 検査 3 件が CI 未結線 (手動実行でしか走らない)"
owners: ["daishiman"]
created_at: "2026-07-25T00:37:03Z"
updated_at: "2026-07-25T16:26:12.100248Z"
status: "done"
depends_on: []
related_nodes: ["feat-auth-tenancy"]
resource_scope: ["apps/hub/package.json","package.json","scripts/ci/"]
purpose: "feat-auth-tenancy が追加した 3 つの静的検査 (check-auth-adapter-boundary.mjs = Auth.js 境界隔離 / check-single-authz-middleware.mjs = 認可判定の単一集約 + route 例外の厳密一致 / check-dev-auth-provider-absence.mjs = dev 専用 provider の非存在) は、束ね役の check-auth-gates.mjs 経由で手動実行すれば緑になるが、CI からは 1 度も呼ばれていない。呼ばれない検査は存在しないのと同じで、Auth.js 型の境界外流出・authz 例外の増殖・dev バイパスの混入が無検出で通る。apps/hub/package.json と root の verify は本 feature の write scope 外のため P09/P10/P11/P13 で未達として記録済み。あわせて tests/auth-tenancy/tenant-isolation.test.ts (D4 の row-level-scope を守る 12 ケース) が hub テストスイート内で走るだけで CI 必須ゲートとして名指しされておらず、将来テストが分割・skip されたとき静かに外れうる"
goal: "認証・認可の 3 検査と分離テストが、人間の記憶ではなく CI の exit code で守られている状態"
scope_in: ["apps/hub/package.json へ検査スクリプト起動用の script を追加","root verify から当該 script を呼ぶ結線","分離テストの CI 必須ゲート指定"]
scope_out: ["検査スクリプト自体のロジック変更 (feat-auth-tenancy で確定済み)","next-auth の導入判断"]
acceptance: ["root の verify (または hub の同等スクリプト) から check-auth-gates.mjs が起動し、3 検査が exit code で判定される","検査を意図的に赤化させた状態で verify が fail することを 1 回実測する","tests/auth-tenancy/tenant-isolation.test.ts が CI 必須ゲートとして名指しで記録される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-auth-tenancy-ci-wiring-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T00:37:03Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-auth-tenancy/quality-assurance-report.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "feat-auth-tenancy P09/P10/P11 が未達として記録した CI 結線を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-auth-tenancy-ci-wiring-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-1f28","linked_at":"2026-07-25T00:40:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-25T15:33:17Z","evidence_refs":[".github/workflows/ci.yml","package.json","apps/hub/package.json","scripts/ci/check-tenant-isolation-gate.mjs","docs/shared-layers.md","docs/features/feat-hub-foundation/architecture-decision-record.md","architecture/harness-hub-dev-workflow.md","issues/sys-auth-tenancy-ci-wiring-20260725.md"],"policy":"manual","reconciled_at":null,"source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T15:33:17Z","missing_sections":[],"status":"complete"}
---



# 概要

feat-auth-tenancy が追加した認証・認可の静的検査 3 件と tenant 分離テストが CI から呼ばれておらず、手動実行でしか走っていなかったため、CI と root `pnpm verify` の両方へ結線した。

## 背景と問題

feat-auth-tenancy は 3 つの静的検査 (`check-auth-adapter-boundary.mjs` = Auth.js 境界隔離 / `check-single-authz-middleware.mjs` = 認可判定の単一集約 + route 例外の厳密一致 / `check-dev-auth-provider-absence.mjs` = dev 専用 provider の非存在) と、束ね役の `check-auth-gates.mjs` を実装した。しかし共有 CI (`apps/hub/package.json`・root `package.json`・`.github/workflows/`) は当該 feature の write scope 外だったため、P09/P10/P11/P13 で「未達」と記録したまま結線されずに残っていた。

呼ばれない検査は存在しないのと同じで、Auth.js 型の境界外流出・authz 例外の増殖・dev バイパスの混入が無検出で通る。あわせて `apps/hub/tests/auth-tenancy/tenant-isolation.test.ts` (D4 row-level-scope を守る 12 ケース) は `pnpm -r test` に含まれて走っているだけで、CI 必須ゲートとして名指しされていなかった。

## 現在の挙動 (対応前の観測)

- `node apps/hub/scripts/check-auth-gates.mjs` を手で叩けば 3 検査とも緑になる (実測: 3 ゲート全て pass)。
- `.github/workflows/ci.yml` を全文検索しても `check-auth-gates` の呼び出しは 1 件も無い。
- root `pnpm verify` のチェーンにも含まれておらず、ADR §6 R-18 (required status checks と同一コマンドを local から実行できるようにする) を満たしていない。
- `tenant-isolation.test.ts` は `pnpm -r test` 経由でのみ実行され、ファイル分割や `it.skip` で 1 件も走らなくなっても CI は緑のまま通る。

## 期待する挙動

- CI と root `pnpm verify` の双方から 3 検査が起動し、違反があれば exit code で落ちる。
- tenant 分離テストが「名指しされた対象」として CI 必須ゲートに登録され、対象の消失・無効化を機械が検出する。

## 再現手順またはユースケース

1. adapter 境界の外 (`apps/hub/src/lib/auth/` 直下など) に `import type { Session } from 'next-auth';` を書く。
2. 対応前は `pnpm verify` が緑のまま通り、PR を出して初めて (あるいは CI にも無いので永久に) 気づけない。
3. 対応後は `pnpm verify` が `check:auth` で停止する。

## 影響と優先度

- 影響範囲: system (認証・認可の構造的制約が無検出で壊れうる)
- 深刻度: high
- 緊急度: feat-auth-tenancy の実装が進むほど違反が混入する面が広がるため、後回しにするほど是正コストが上がる。

## スコープ

- In: `apps/hub/package.json` への検査起動 script 追加 / root `verify` からの結線 / 分離テストの CI 必須ゲート指定 / 登録簿・ADR の同時改訂
- Out: 検査スクリプト自体のロジック変更 (feat-auth-tenancy で確定済み) / next-auth の導入判断

## 関連グラフ

- 原因/親ノード: feat-auth-tenancy
- 関連仕様: qa-038【2】(required status checks) / qa-020 / SEC2 / SEC3 / D3 / D4 / I7
- 関連アーキテクチャ: feat-hub-foundation ADR §6 (CI 品質ゲートの設計) / docs/shared-layers.md §3 CI 品質ゲート登録簿

## 受入条件

- [x] root の verify (または hub の同等スクリプト) から check-auth-gates.mjs が起動し、3 検査が exit code で判定される
  - root `pnpm check:auth` = `check-required-package-script.mjs apps/hub/package.json check:auth-gates` + `pnpm --filter @harness-hub/hub run check:auth-gates` を `verify` チェーンの 3 番目に結線。CI は `static-gates` job の G12 ステップで同一スクリプトを呼ぶ。
- [x] 検査を意図的に赤化させた状態で verify が fail することを 1 回実測する
  - 下記「検証証跡」の 2. を参照。
- [x] tests/auth-tenancy/tenant-isolation.test.ts が CI 必須ゲートとして名指しで記録される
  - `.github/workflows/ci.yml` の「G4 名指し tenant 分離テスト」ステップ、`docs/shared-layers.md` 登録簿の「G4 の名指し部分」、ADR §6 の同項に記録。`scripts/ci/check-tenant-isolation-gate.mjs` が対象実在・T-ISO ID 網羅・skip/todo/only の不在を検査してから名指し実行する。

## 検証証跡

コマンドと実測結果 (2026-07-25):

1. **平常時 (緑)**
   - `pnpm check:auth` → `[auth-gates] OK: 3 ゲート全て pass` / exit 0
   - `node scripts/ci/check-tenant-isolation-gate.mjs` → `OK: 12 ケース / 必須 ID 7 種を確認` / exit 0
   - `pnpm verify` → exit 0 (全ゲート通過)

2. **意図的赤化 → verify が fail (受入条件 2 の実測)**
   - `apps/hub/src/lib/auth/__ci-redteam-probe.ts` に `import type { Session } from 'next-auth';` を仕込む (adapter 境界の外)。
   - `pnpm verify` → `check:duplicates` まで緑で進み、`check:auth` で以下を出力して停止:
     - `[auth-adapter-boundary] NG: 境界違反 1 件 - [authjs-import-outside-adapter] apps/hub/src/lib/auth/__ci-redteam-probe.ts:1`
     - `[auth-gates] NG: 1/3 ゲートが fail (auth-adapter-boundary)`
     - `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` → `ELIFECYCLE Command failed with exit code 1`
   - 一時ファイルを削除して復旧済み (作業ツリーに残していない)。

3. **tenant 分離ゲートの実効性 (3 条件を個別に実測)**
   - `it('T-ISO-01:` → `it.skip('T-ISO-01:` に一時変更 → `NG: skip / todo / only により無効化されたケースがあります: L59: it.skip('T-ISO-01: ...` / exit 1
   - T-ISO-01 のケースを丸ごと削除 → `NG: ケース数が 12 件から 11 件へ減っています` / exit 1
   - いずれも `git restore` で復旧し、復旧後に exit 0 を再確認済み。

証跡 path: `.github/workflows/ci.yml` (G12 / G4 名指しステップ) / `scripts/ci/check-tenant-isolation-gate.mjs` / CI 実行時は `artifacts/auth-gates.json`・`artifacts/tenant-isolation-gate.json` に JSON 要約を出力する。

## 申し送り

`docs/shared-layers.md` の不変条件に従い、ci.yml・登録簿・ADR §6 を同一変更で揃えた。`system-spec/spec-state.json` は改訂していない — G12 は G9・G10 と同じく qa-038【2】の「8 種」に数えない横断品質ゲートであり、qa-038【2】が列挙する 9 項目を増減させないため (この判断根拠は登録簿へ明記した)。

調査の副産物として、**required status checks のうち G7 (破壊的 DDL) / G7b (tenant 分離網羅・接続層隔離) / G9 (axe a11y) が local `pnpm verify` に未結線**であることが判明した。ADR §6 R-18 の観点では本 issue と同型の欠落であり、別 issue として追跡する。

## 仕様・設計への反映 (2026-07-26 追記)

正規フローに沿った反映先と判断は次のとおり。

| 層 | 反映 | 判断 |
| --- | --- | --- |
| `system-spec/` | **なし** | qa-038【2】が列挙する 9 項目も、qa-039【2】(CI と local の乖離防止) の要件文も変わらない。G12 は G9・G10 と同じく「8 種」に数えない横断品質ゲートで、G4 の名指しはゲート数を増やさないため。`spec-state.json` は compile 成果物であり、要件が変わらない限り触らない |
| `specs/` | なし | 同上 (system-spec の投影) |
| `architecture/` | `harness-hub-dev-workflow.md` に差分追記 | 「CI にしか存在しないゲートは着手前に気づけない」という構造リスクを Risks and verification へ記録。全書換禁止 (C18/C19) に従い差分追記形式 |
| `docs/` (設計正本) | `features/feat-hub-foundation/architecture-decision-record.md` §6 / `shared-layers.md` §3 | G12 の追加、G4 名指し、local 実行対応表の新設 |
| `docs/features/feat-auth-tenancy/` | 8 文書へ解消追記 | P09〜P13 が「CI 未結線」と記録していた箇所を、当時の記録を残したまま解消済みへ更新 |
| `features/` `tasks/` | なし | feature/task spec は当時の write scope を記述しており、事後の結線で書き換える対象ではない |
