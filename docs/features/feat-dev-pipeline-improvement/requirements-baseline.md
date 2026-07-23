---
status: confirmed
layer: feature-design
task: SYS-DEV-PIPELINE-IMPROVEMENT-P01
parent_feature: feat-dev-pipeline-improvement
feature_package_id: feature-package/feat-dev-pipeline-improvement
source: .dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f/goal-spec.json
package_digest: sha256:f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f
feature_context_digest: sha256:16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085
architecture_refs: [arch-harness-hub-dev-workflow]
---

# feat-dev-pipeline-improvement 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**逐語転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

開発管理パイプライン (dev-graph 11 verb・beads・plugin-plans・eval-log・成果物管理) の運用実態調査 (qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1/G4/G5 を支える開発基盤の健全性を回復する

## 2. ゴール (goal)

qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態

## 3. スコープ

### 3.1 scope_in (8 件)

| # | 項目 (逐語) | 主担当 phase |
|---|---|---|
| SI-1 | lifecycle close-loop の機械化 (open 残置検出と md/graph/beads 3 表現の同時 close 導線) | P02 / P05 / P12 / P13 |
| SI-2 | eval-log/ 配置規約の明文化と CI lint 強制 | P02 / P05 / P08 |
| SI-3 | improvement-handoff schema への disposition 必須化と未消化 findings の beads 起票 | P02 / P05 / P08 |
| SI-4 | tasks/ frontmatter status の意味論明記 | P02 / P05 |
| SI-5 | graph.json 肥大対策の再検討トリガー記録 | P02 / P12 |
| SI-6 | dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与 | P02 / P08 |
| SI-7 | spec-drift-guardian の verdict close gate 配線 | P02 / P05 |
| SI-8 | 陳腐化文書の定期棚卸し GC の sync verb 運用組込み | P02 / P12 |

未割当: **0 件**。

### 3.2 scope_out (4 件)

1. Hub プロダクト本体機能 (Web/API/DB) の変更
2. dev-graph への新 verb 追加
3. bd CLI 本体の変更
4. graph.json 分割の実装 (トリガー記録のみ)

## 4. 受入条件 (acceptance / 7 件)

| # | 受入条件 (逐語) | 対応 scope_in | 検証 phase |
|---|---|---|---|
| AC-1 | 解決済み事象の open 残置を検出する決定論検査が存在し、issue-bd-bridge-notes-passthrough-20260721 が close-loop で閉じている | SI-1 | P06 / P07 / P13 |
| AC-2 | eval-log/ 配置規約が README に明文化され、CI lint が直下残置・バイト同一重複・1MB 超の git 追跡を遮断する | SI-2 | P06 / P08 / P09 |
| AC-3 | improvement-handoff schema に per-finding disposition と根拠 ref が必須化され、既存 21 ファイル 94 findings に消化状態が付与されている | SI-3 / SI-6 | P06 / P08 |
| AC-4 | task template に status = 文書ライフサイクル (active/superseded) の意味論が明記され、実行状態の二重正本が無い | SI-4 | P07 |
| AC-5 | graph.json 分割の再検討トリガーが仕様に記録されている | SI-5 | P07 / P12 |
| AC-6 | spec-drift-guardian の C03/C04 verdict が close gate に配線され、proposal のみでの close が遮断される | SI-7 | P06 / P09 |
| AC-7 | 陳腐化文書の棚卸し手順が sync verb 運用に組み込まれている | SI-8 | P12 |

## 5. 品質制約 (quality_constraints / 6 件・id 単位)

| id | summary (逐語) |
|---|---|
| `choke-point-preservation` | beads mutation は bd-bridge.py の単一チョークポイントを維持する。lifecycle close-loop の機械化はこのチョークポイントを経由して 3 表現 (issue md / graph node / beads) を閉じるのであって、guard-graph-schema の遮断を緩和・迂回する実装を導入しない (issue-bd-bridge-notes-passthrough-20260721 の scope_out を踏襲)。 |
| `single-writer-boundary` | eval-log 再配置・disposition 遡及付与・tasks status 意味論の明記において、graph の単一 writer (upsert-node.py) と spec-state の単一 writer (apply-spec-transition.py) を迂回した正本直接編集を行わない。md/graph の 2 表現更新は必ず writer 経由で WAL 保護下に行う。 |
| `digest-immutability` | 既存 confirmed 文書・live-trial 証跡・promoted package の digest を失効させる変更を避ける。証跡関連の修正では既存 digest を変えないことを最優先し、digest 単独書き換えの誘因を再生産しない。 |
| `fail-closed-lint` | 新設する検査 (open 残置検出・eval-log 配置 lint・handoff disposition 検査) は検出時に exit 非 0 で停止する fail-closed とし、警告のみで通過させる soft lint にしない。CI ゲートへの組込みまでを実装範囲とする。 |
| `no-dual-authority` | tasks/ frontmatter の status は文書ライフサイクル (active/superseded) のみを表すと定義し、実行状態の正本は beads/graph 側 (execution_contexts / beads_linkage / completion_evidence) に一元化する。md への実行状態の投影・複製で二重正本を作らない。 |
| `idempotent-migration` | eval-log 既存ファイルの再配置と improvement-handoff 94 findings への disposition 遡及付与は、再実行しても差分 0 に収束する冪等 migration として実装し、実行証跡を eval-log 配下へ保存する。 |

## 6. qa-067 の 8 要件との対応表

正本: `system-spec/dev-workflow.md` qa-067 (`sha256:bdf3c60e2ab89540c6dd7bdf6009316070d66f9cf36aee17743d825668b6ae21`)。

| qa-067 要件 | scope_in | acceptance |
|---|---|---|
| 1. lifecycle close-loop の機械化 | SI-1 | AC-1 |
| 2. eval-log/ 配置規約の明文化と CI lint 強制 | SI-2 | AC-2 |
| 3. improvement-handoff disposition 必須化 | SI-3 | AC-3 |
| 4. tasks/ frontmatter status の意味論明記 | SI-4 | AC-4 |
| 5. graph.json 肥大対策の再検討トリガー記録 | SI-5 | AC-5 |
| 6. dev-graph 中核 handoff 31 findings の差分監査 | SI-6 | AC-3 (内数) |
| 7. spec-drift-guardian の verdict close gate 配線 | SI-7 | AC-6 |
| 8. 陳腐化文書の定期棚卸し GC | SI-8 | AC-7 |

## 7. 転記元 lineage (digest 固定)

| path | sha256 | status |
|---|---|---|
| `features/feat-dev-pipeline-improvement.context.json` | `16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085` | verified |
| `architecture/harness-hub-dev-workflow.md` | `ee6ff7b9b95d37d41921f2ca482ae7b90e094e9c6236aff9794be1a1e8a61db3` | verified |
| `specs/harness-hub-system-specification.md` | `a619518374201b03723ebd2cfd4d1406b3f9aa1a986f01756a10ccea091a11dc` | verified |
| `system-spec/dev-workflow.md` | `bdf3c60e2ab89540c6dd7bdf6009316070d66f9cf36aee17743d825668b6ae21` | verified |

## 8. P02 で確定すべき据置事項 (4 件)

| id | 据置事項 | 確定先 |
|---|---|---|
| DEF-1 | 検査 script 3 本 (`lint-open-residue.py` / `lint-eval-log-layout.py` / `lint-handoff-disposition.py`) の入出力契約 — 引数・exit code・検出条件・JSON 出力形状 | P02 design.md §2 |
| DEF-2 | improvement-handoff schema の後方互換方式 — disposition 必須化を既存 21 ファイルへ適用する遡及 migration の判別キー | P02 design.md §3 |
| DEF-3 | eval-log 再配置対象一覧 — 直下残置のうち移動対象／凍結対象の区分と判定根拠 | P02 design.md §4 |
| DEF-4 | close-loop の bd-bridge 経由手順 — md/graph/beads 3 表現を choke-point を迂回せず同時に閉じる操作列 | P02 design.md §6 |

## 9. 実測ベースライン (2026-07-21 時点)

P02 以降の設計・検証はこの実測値を出発点とする。

| 指標 | 実測値 | 取得コマンド |
|---|---|---|
| improvement-handoff ファイル数 | 21 | `ls plugin-plans/**/improvement-handoff*.json` |
| findings 総数 | 94 | 各ファイルの `findings[]` 合計 |
| うち dev-graph 中核 3 ファイル | 31 (macro 12 / beads 10 / 無印 9) | 同上 |
| disposition 付与済み findings | 0 | 同上 |
| `eval-log/` 直下の git 追跡ファイル | 91 | `git ls-files eval-log \| grep -c '^eval-log/[^/]*$'` |
| うち他所から参照されているもの | 41 | 全リポジトリ grep |
| graph node 総数 | 235 | `.dev-graph/state/graph.json` |
| open 残置候補 (`issue-bd-bridge-notes-passthrough-20260721`) | md=closed / graph=closed / beads=CLOSED / completion_evidence.status=**open** | `bd show HarnessHub-8ql` + graph.json |

## 10. rollback

本 baseline が goal-spec と乖離した場合、本文書を編集せず `/dev-graph plan` の再実行で package を再生成し、P01 から再着手する。
