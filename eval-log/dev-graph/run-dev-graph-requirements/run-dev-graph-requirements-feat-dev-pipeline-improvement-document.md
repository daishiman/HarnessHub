# 実装要件定義: feat-dev-pipeline-improvement (task-graph handoff)

- 生成日時: 2026-07-22T10:00:00Z
- snapshot digest: `sha256:ecf9ce5b54eceab6b09af4d79ee4d0583e85f966d783548b24d042d8883d363c`
- graph snapshot: revision `364` / raw sha256 `6107b737cbde37e4fc90b5d94c027098d8118a8c1dfd906f618deb24a397c390`
- package: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b` (canonical `sha256:9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b`)
- 仕様正本: system-spec/dev-workflow.md qa-067/qa-071 / features/feat-dev-pipeline-improvement.context.json

## 目的

開発管理パイプライン (dev-graph 11 verb・beads・plugin-plans・eval-log・成果物管理) の運用実態調査 (qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1/G4/G5 を支える開発基盤の健全性を回復する

## 到達状態

qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態

## 仕様 lineage (QA 確定)

| 確定 QA | 内容 |
|---------|------|
| qa-067 | 開発管理パイプライン改善 8 要件 (lifecycle close-loop / eval-log 配置 lint / handoff disposition / task template / graph.json 分割 / findings 監査 / spec-drift-guardian / GC) |
| qa-071 | dev-graph 方法論 8 要件 (マクロ構造・exact-13・外側ループ・内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) を追加確定。qa-067/qa-070 の確定内容を全面維持 |

## 実装スコープ (8 要件)

- lifecycle close-loop の機械化 (open 残置検出と md/graph/beads 3 表現の同時 close 導線)
- eval-log/ 配置規約の明文化と CI lint 強制
- improvement-handoff schema への disposition 必須化と未消化 findings の beads 起票
- tasks/ frontmatter status の意味論明記
- graph.json 肥大対策の再検討トリガー記録
- dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与
- spec-drift-guardian の verdict close gate 配線
- 陳腐化文書の定期棚卸し GC の sync verb 運用組込み

## 受入条件 (7 件)

- 解決済み事象の open 残置を検出する決定論検査が存在し、issue-bd-bridge-notes-passthrough-20260721 が close-loop で閉じている
- eval-log/ 配置規約が README に明文化され、CI lint が直下残置・バイト同一重複・1MB 超の git 追跡を遮断する
- improvement-handoff schema に per-finding disposition と根拠 ref が必須化され、既存 21 ファイル 94 findings に消化状態が付与されている
- task template に status = 文書ライフサイクル (active/superseded) の意味論が明記され、実行状態の二重正本が無い
- graph.json 分割の再検討トリガーが仕様に記録されている
- spec-drift-guardian の C03/C04 verdict が close gate に配線され、proposal のみでの close が遮断される
- 陳腐化文書の棚卸し手順が sync verb 運用に組み込まれている

## 品質制約 (6 件・全 task に適用)

- **choke-point-preservation**: beads mutation は bd-bridge.py の単一チョークポイントを維持する。lifecycle close-loop の機械化はこのチョークポイントを経由して 3 表現 (issue md / graph node / beads) を閉じるのであって、guard-graph-schema の遮断を緩和・迂回する実装を導入しない (issue-bd-bridge-notes-passthrough-20260721 の scope_out を踏襲)。
- **single-writer-boundary**: eval-log 再配置・disposition 遡及付与・tasks status 意味論の明記において、graph の単一 writer (upsert-node.py) と spec-state の単一 writer (apply-spec-transition.py) を迂回した正本直接編集を行わない。md/graph の 2 表現更新は必ず writer 経由で WAL 保護下に行う。
- **digest-immutability**: 既存 confirmed 文書・live-trial 証跡・promoted package の digest を失効させる変更を避ける。証跡関連の修正では既存 digest を変えないことを最優先し、digest 単独書き換えの誘因を再生産しない。
- **fail-closed-lint**: 新設する検査 (open 残置検出・eval-log 配置 lint・handoff disposition 検査) は検出時に exit 非 0 で停止する fail-closed とし、警告のみで通過させる soft lint にしない。CI ゲートへの組込みまでを実装範囲とする。
- **no-dual-authority**: tasks/ frontmatter の status は文書ライフサイクル (active/superseded) のみを表すと定義し、実行状態の正本は beads/graph 側 (execution_contexts / beads_linkage / completion_evidence) に一元化する。md への実行状態の投影・複製で二重正本を作らない。
- **idempotent-migration**: eval-log 既存ファイルの再配置と improvement-handoff 94 findings への disposition 遡及付与は、再実行しても差分 0 に収束する冪等 migration として実装し、実行証跡を eval-log 配下へ保存する。

## 実装単位

P01..P13 の exact-13 task (直列 DAG)。各 task の正本仕様書は package の task-specs/ にあり、実行入口は tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p01..13.md。beads epic HarnessHub-k2u (children .1〜.13) が実行 tracker。

## Handoff 先

task-graph build。実装コードの生成は本 handoff の受領側が行う (本 requirements 文書はコードを含まない)。

## ゲート証跡

- **QA-071 lineage closure**: spec-state.json#qa_log にエントリあり。approval_log(appr-009)で承認。system-spec/dev-workflow.md に `### qa-071` セクションあり。elicit-verification.json で `lineage-system-spec/dev-workflow.md=PASS` 確認済み
- **C11 graph schema**: valid=true / violations=0 / plan_findings_verdict=PASS / atomic_promotion_receipt=promoted/complete
- **C02 saved state**: feature+13 task 全14件 confirmed/pass/complete。registration_receipt: source_digest=`sha256:9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b`、graph_revision_after=364、applied=13。task-spec 全 13 本の sha256 が system-build-handoff.json#source_inputs と一致
- **feature context digest**: `sha256:f6403a6d76bc22797e51615b4f9f80156d0d75424daf413a33cfeff18ab23a78` (feature-package.json#source_feature_digest と一致)
- **validate-system-plan**: status=pass / P01..P13 exact 13 / violations=0 (external validator, `--staging .dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b`)
- **missing_sections**: 0
- **stale_digest_count**: 0
- **handoff target**: `task-graph`
- **requirements/handoff/readiness matrix は同一 snapshot digest に固定**: `sha256:ecf9ce5b54eceab6b09af4d79ee4d0583e85f966d783548b24d042d8883d363c`
- **本 requirements 実行による実装コード生成**: 0 件
