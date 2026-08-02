---
graph_node_id: "arch-harness-hub-testing-qa"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "harness-hub"
domain: "testing-qa"
tags: ["system-spec-import","testing-qa"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub testing-qa アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-24T12:35:34Z"
updated_at: "2026-08-01T16:30:33Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-infrastructure","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-testing-qa.md"]
purpose: "テスト戦略・品質保証 (testing-qa) の確定仕様 — テストレベル 4 種網羅 (単体・結合・境界値・回帰)、カバレッジ 80% 品質ゲートと改善ループ、FE/BE/インフラ層別テスト方針、behavior ベースの保守しやすい UI テスト、タスク仕様書へのテスト戦略の冪等組込 — を dev-graph から参照する"
goal: "qa-076/qa-077/qa-079/qa-080/qa-089/qa-095 の確定内容と D8 (Testing Library 採用) に適合し、タスク仕様書のテスト戦略セクション必須化・カバレッジ 80% ゲート・UI 微調整で壊れない behavior ベーステスト・一時生成物に左右されない skill lint・再利用可能な live-trial 証拠・失敗時改善ループの指針を提供する"
scope_in: ["system-spec/testing-qa.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-testing-qa.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"8773724d5676e514cb316f19335a0712467133f0c9399225c27db13babf22f93","evaluator":"validate-coverage-matrix.py","evidence_ref":"system-spec/spec-state.json"}
source_lineage: {"imported_at":"2026-08-01T16:30:33Z","origin_kind":"system-spec-harness","source_digest":"8773724d5676e514cb316f19335a0712467133f0c9399225c27db13babf22f93","source_path":"system-spec/testing-qa.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-testing-qa.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-24T12:35:34Z","missing_sections":[],"status":"complete"}
---

# Harness Hub testing-qa アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/testing-qa.md](../system-spec/testing-qa.md) (sha256: `8773724d5676e514…` (完全値は frontmatter source_lineage.source_digest))

- confirmation: `confirmed` / evaluator: `validate-coverage-matrix.py` → **PASS** (`system-spec/spec-state.json`)
- 取込日時: 2026-08-01T16:30:33Z / plugin: system-spec-harness v0.1.0

## 確定内容の要点 (参照のみ・正本は上記)

- **テストレベル網羅 (qa-076)**: タスク仕様書は単体・結合・境界値・既存回帰の 4 レベルを必須テスト戦略セクションとして持ち、変更内容からテスト種別を導出する。
- **カバレッジ品質ゲート (qa-077)**: 80% 以上 (変更対象 line/branch 既定・層別調整可) を CI で機械検証。失敗・未達はマージ停止のうえ改善ループ (失敗分析→修正→再実行) へ。数値の目的化は禁止し behavior 検証を優先。
- **層別方針と保守性 (qa-095、qa-078 維持)**: FE=component 単体 + 操作フロー結合 (behavior ベース、accessible role/ラベル選択、pixel/DOM 構造依存の禁止)、BE=API 契約 + ロジック単体 + DB 結合、repository tooling=静的契約 + 実行順序 + fail-closed 境界。
- **冪等な仕組み化 (qa-079/qa-095、qa-081 維持)**: テスト戦略セクションをタスク仕様書テンプレート必須項目とし、system-dev-planner の task spec 必須 section 契約で機械検証、欠落は fail-closed で拒否。
- **platform 境界 (qa-080)**: CI 実行=web 行、作者ローカル実行=desktop-windows/desktop-macos 行。mobile/tablet/desktop-linux は対象外。
- **ツール確定 (D8)**: Vitest (単体・結合) + Playwright (E2E) + @testing-library/react (UI コンポーネント、behavior ベース) の 3 点構成。
- **実走証拠の完全性 (qa-089)**: live-trial の PASS は scenario 正本・全 observation・実引数・task.md の必須/禁止手順・transcript digest・挙動閉包 SHA を束縛し、observation の evidence ref を run 内の実在ファイルへ閉じ込める。再利用 planner は scenario ID の変更だけでなく削除も失効として扱う。
- **実測アーキテクチャ (qa-089)**: publication/write は pre/post state、binding は永続 graph から導出する。draft gate と candidate adapter dry-run のゼロ帰属を分離する。昇格済み node の `confirmation_evidence.evaluated_digest` は、最終 persisted node から自己参照 field だけを除いた正準 JSON の SHA-256 と突合する。監査 module と scenario 契約全体の composite provenance、同一 graph を壊して正準 validator の拒否節まで確認する negative control を品質ゲートにする。
- **受領側の非省略境界 (qa-100)**: `verify_by=live-trial` の criteria-test は `scenario_contract` の存在を必須にし、required/observed の同数・同順、`unobserved=[]`、引数、宣言済み task 契約、run 内 evidence の実在を再照合する。schema の後方互換性と acceptance の合格条件を分離し、旧受領書は fresh run で更新する。
- **変更境界 (qa-100)**: 変更は証拠を受領するテスト層に閉じる。C15 schedule の新規 run は現行動作の再観測であり、scheduler、公開 API、DB、認証認可、UI、deploy unit の構造は変えない。
- **一時生成物の境界 (qa-095)**: skill 構造 lint は dot directory、`__pycache__`、`.pyc` を test tool の生成物として構造判定から除外し、通常の nested directory 違反は維持する。root / plugin 実装の byte parity と per-plugin → repository の実行順序回帰を固定する。

## 2026-07-29 実装反映

`HarnessHub-9ndl` / `HarnessHub-dyxr` で上記境界を `run-skill-live-trial` と C14 decompose 監査へ実装した。製品 API・DB・認証認可・UI・deploy unit への影響は無く、設計影響は開発品質ゲートの証拠経路に限定される。反映と検証の対応は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/live-trial-acceptance-hardening-spec-reflection.md) を参照する。

`HarnessHub-xswf` では、per-plugin pytest が生成する hidden cache を人が設計した
skill tree と誤認しない境界を qa-095 として実装した。生成物名の個別列挙ではなく
dot directory 全般へ一般化し、通常の深さ違反、root / plugin parity、実行順序回帰を
テストで固定した。詳細は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/skill-tree-cache-spec-reflection-receipt.md) を参照する。

## 2026-07-30 ID 一意性 gate の実装反映

`HarnessHub-ory6` で、複数 plugin の validator に共通する
「ID を集合・辞書へ変換してから参照を検査する」境界を見直した。
設計上の順序を `raw entries → duplicate ID gate → set/dict lookup →
既存の参照・shape 検査` に固定し、同一 ID の別要素が last-write-wins
（後勝ち＝後の定義が前を消す挙動）で隠れる経路を閉じた。

task/component、transcript turn、handoff route は別 bounded context
（責務境界）なので共通ライブラリへ過剰統合せず、各 plugin 内の小さな
決定論 helper と負例 fixture で同じ不変条件を実装する。500 行を超えた
validator / test は CLI、report contract、graph shape、回帰テストの責務で
分離し、公開 CLI path と JSON 出力契約を維持する。

影響は repository 内の validation contract に限定される。製品 API、DB、
認証認可、UI、deploy unit、確定 QA の内容は変えない。反映と検証の対応は
[仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/qa33ho-spec-reflection-receipt.md)
を参照する。

## 2026-07-30 renderer 登録検証表示の実装反映

`HarnessHub-35ai` では、feature progress projection と registration proof を
分離した。証拠経路は `registration receipt → receipt validator →
registration_verification state → CLI / visible banner / embedded metadata`
とし、validator を通過した場合だけ `verified` を返す。

receipt が無い探索表示は `not_performed` とする。同じ 13 child graph を
receipt 有り／無しで描画する正負テストにより、件数が偶然一致しただけの
偽陽性を遮断する。影響は repository 内の renderer 品質契約だけであり、
製品 API、DB、認証認可、UI、deploy unit は変えない。詳細は
[仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/render-registration-verification-spec-reflection-receipt.md)
を参照する。

## 2026-07-30 plugin-local browser CI 到達設計

`HarnessHub-nznu` / `task-slide-report-generator-browser-ci-20260730` では、
slide/report の browser acceptance を「テストが存在する」状態から
「clean GitHub-hosted runner が実行する」状態へ接続した。

```
plugin/workflow diff
  → plugin-local Node/Playwright + Chromium 復元
  → vendor npm test（Chromium 起動・16:9・2 screenshots・report self-test）
  → read-only runtime check（version・実体・plugin-local path）
```

- GitHub Actions は `testing-qa.web` の CI 実行基盤であり、作者の
  desktop-macos / desktop-windows 環境とは別の責務として扱う。
- `actions/cache` は高速化だけを担い、成功判定の正本にしない。最終 check が
  browser 実行ファイルの存在と plugin-local directory への包含を再確認する。
- workflow 自体の path trigger、working directory、install/test/check 配線は
  Python 契約テストで固定し、テスト本体があっても CI から未到達になる退行を遮断する。
- workflow token は `contents: read` に限定し、repository secret を追加しない。
- 製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

仕様正本は `system-spec/testing-qa.md` qa-109、実装判断と検証の対応は
[仕様反映受領書](../docs/features/feat-task-spec-test-strategy/slide-report-browser-ci-spec-reflection-receipt.md)
を参照する。

## 2026-08-01 dual catalog 回帰設計

- 成功→403 の順序付き component test で一覧・詳細・Release 履歴の stale 非表示を固定する。
- 同一 scope の成功→503 は stale 維持、scope 切替後の成功→503 は旧 tenant 内容 0 件を要求する。
- 認証済み marketplace route の private cache と Cookie/tenant/workspace `Vary` を route test で固定する。
- 一覧は入力中 request 0 回、submit で 1 回だけ増えることを component test で固定する。
- 本番 CWV と 2 社同時稼働は repository test で代替せず P13 の外部実測として残す。正本は [system-spec/testing-qa.md](../system-spec/testing-qa.md) の `qa-119`。

## 上流指針 (doctrine anchor)

- reliability + operations (Google SRE)。doctrine-anchor-registry.json の pending_exceptions に approved 登録済み (owner: daishiman, 2026-07-24)。

## 2026-08-02 顧客持ち込み Google OAuth 回帰設計

- 実 libSQL と封筒暗号化で lifecycle、rotation、取消、disabled 再開、現行再テスト、
  暗号文 CAS、migration 旧 writer 互換を検査する。
- route test は role 4 種、CSRF、tenant A/B、Google 以外 issuer、secret 非露出を含む。
- UI は実見出し階層で axe-core 違反 0、password/autocomplete、Workspace domain 正規化を検査する。
  Google 実 client、Playwright、production migration は別の外部実測として残す。
- 正本は [system-spec/testing-qa.md](../system-spec/testing-qa.md) の `qa-130`。
