# 開発管理パイプライン改善 (lifecycle close-loop / eval-log 規約 / handoff disposition)

> macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

開発管理パイプライン (dev-graph 11 verb・beads 課題管理・plugin-plans 13 phase 計画・eval-log 証跡・issues/tasks/features 成果物管理) の運用実態調査 (2026-07-21, qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1 (作者の配布・運用効率)・G4 (品質ゲート)・G5 (運用持続性) を支える開発基盤の健全性を回復する

## 到達状態

qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態

## スコープ

**対象 (in):**

- lifecycle close-loop の機械化 (解決済み事象の open 残置検出と md/graph/beads 3 表現の同時 close 導線)
- eval-log/ 配置規約の明文化と CI lint による強制 (skill 名 prefix サブディレクトリ・1MB 超 gitignore・重複/変種遮断)
- improvement-handoff schema への disposition (applied|deferred|rejected) 必須化と未消化 findings の beads 起票
- tasks/ frontmatter status の意味論明記 (実行状態の正本は beads/graph 側)
- graph.json 肥大対策の再検討トリガー記録 (500 node / merge 衝突頻発)
- dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与
- spec-drift-guardian の verdict close gate 配線
- 陳腐化文書の定期棚卸し GC の sync verb 運用組込み

**対象外 (out):**

- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- bd CLI 本体の変更
- graph.json 分割の実装 (トリガー記録のみ)

## 受入

- 解決済み事象の open 残置を検出する決定論検査が存在し、issue-bd-bridge-notes-passthrough-20260721 が close-loop で閉じている
- eval-log/ 配置規約が eval-log/README.md に明文化され、CI lint が直下残置・バイト同一重複・1MB 超の git 追跡を遮断する
- improvement-handoff schema に per-finding disposition と根拠 ref が必須化され、既存 21 ファイル 94 findings に消化状態が付与されている
- task template に status = 文書ライフサイクル (active/superseded) の意味論が明記され、実行状態の二重正本が無い
- graph.json 分割の再検討トリガーが仕様に記録されている
- spec-drift-guardian の C03/C04 verdict が close gate に配線され、proposal のみでの close が遮断される
- 陳腐化文書 (解決済み open issue・0-findings handoff) の棚卸し手順が sync verb 運用に組み込まれている

## アーキテクチャ参照

- [arch-harness-hub-dev-workflow](../architecture/harness-hub-dev-workflow.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- なし (プロダクト feature と独立。既存パイプライン実装への改善)

## Handoff

- 次工程: `/dev-graph plan --feature-id feat-dev-pipeline-improvement --feature-context features/feat-dev-pipeline-improvement.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
