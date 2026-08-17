---
graph_node_id: "spec-system-spec-index"
artifact_kind: "specification"
artifact_subtypes: ["api","backend","data","security"]
project_id: "system-spec-import"
domain: "system-spec"
tags: ["system-spec","source-lineage","imported"]
priority: null
start_date: null
target_date: null
iteration: null
title: "system-spec compiled specification"
owners: ["system-spec-harness"]
created_at: "2026-08-17T08:41:48Z"
updated_at: "2026-08-17T08:41:48Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/index.md","system-spec/completeness-report.json"]
purpose: "確定済み system-spec の index を参照可能にする。"
goal: "仕様と architecture context を source lineage 付きで結ぶ。"
scope_in: ["confirmed system-spec index artifact"]
scope_out: ["confirmed artifacts are not rewritten by this adapter"]
acceptance: ["source lineage と evaluator evidence を保持する","architecture node を参照する"]
architecture_refs: ["arch-system-spec-overview"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/system-spec-index.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7ed726cf030c9db0f1a9175068c1aea5879c32bc5d152337ae23eb485f85426b","evaluator":"system-spec-harness/assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-17T08:41:48Z","origin_kind":"system-spec-harness","source_digest":"f261a184f7635ce5c1de61db1b432ec3e67c7fe50c23928b94e0476973ccf7f7","source_path":"system-spec/index.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "system-spec-harness が compile した specification index の import。"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/system-spec-index.md","confidence":1.0}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-17T08:41:48Z","evidence_refs":["system-spec/completeness-report.json"],"policy":"manual","reconciled_at":"2026-08-17T08:41:48Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-17T08:41:48Z","missing_sections":[],"status":"complete"}
---

# システム構築仕様書 index

収集マトリクス (カテゴリ×プラットフォーム) の各章と集約状態の相互参照。
集約状態は 未着手 / 収集中 / 確定 / 対象外 の 4 値 (真理値表導出)。

## 要件定義書 (上位概念・憲法)

- [要件定義書](../system-spec/00-requirements-definition.md) — 上位概念 U1-U9 の正本 (確定マーカー: `confirmed`)。各技術章は serves_goals でここのゴールへトレース (anchor) する。
- **本質的目的 (U1)**: 1 つの Hub に複数の顧客企業 Workspace を同居させ、事業として横展開できる基盤を持つこと。非エンジニアの業務当事者が自分の業務課題を AI (Claude Code / Codex) と自分で解決し、Git や公開工程の複雑さを意識せず社内へ届けられる状態は、この事業展開を成立させるための手段として位置付ける。提供者の手離れも同じく手段であり、それ自体を目的にしない。 (appr-062 / qa-296。appr-001 の『非エンジニアの自己解決の実現を目的とし、手離れと収益はその帰結』から中立再確認により変更した)
- **ゴール (U3)**: G1=作者の自己完結 publish: 非エンジニアの作者が、提供者の代理作業なし・Git 操作ゼロで公開・更新・rollback を自走できる, G2=統制と安全性の担保: Workspace 管理者が承認・監査・公開停止を行え、shadow IT 化せず統制点が一元化される, G3=既存資産の再利用による最小工数: harness-creator の package check / package contract / marketplace catalog / version・cache 処理 / review workflow を移植元の正本として再利用し、二重実装を避けて構築する, G4=複数顧客への同時展開基盤: マルチテナント論理分離を Stage 1 から実装し、1 つの Hub に複数顧客 Workspace をデータ・権限・Catalog の境界を保ったまま同居させる, G5=導入されたハーネスの利用実態と削減効果 (時間・金額換算) が可視化され、フィードバック→AI 対応→再公開の改善ループが定着する, G6=公開された業務ツールを owner 以外の同僚が見つけて追加・利用し、業務での再利用が成立する (North Star), G7=Claude Code / Codex 契約のない社員にも Web App 出口でブラウザから成果が届く

## 章一覧と集約状態

| カテゴリ | 章 | 集約状態 | 確定マーカー | 資するゴール | 対応セル |
|---|---|---|---|---|---|
| データベース (database) | [database.md](../system-spec/database.md) | 確定 | `confirmed` | G2 G4 G5 | database.web database.mobile database.tablet database.desktop-windows database.desktop-linux database.desktop-macos |
| 認証(ログイン) (auth) | [auth.md](../system-spec/auth.md) | 確定 | `confirmed` | G2 G4 G5 G6 G1 | auth.web auth.mobile auth.tablet auth.desktop-windows auth.desktop-linux auth.desktop-macos |
| UI-UX (ui-ux) | [ui-ux.md](../system-spec/ui-ux.md) / [設計知識付録](../system-spec/ui-ux-design-knowledge.md) | 確定 | `confirmed` | G1 G2 G5 G6 G7 | ui-ux.web ui-ux.mobile ui-ux.tablet ui-ux.desktop-windows ui-ux.desktop-linux ui-ux.desktop-macos |
| セキュリティ (security) | [security.md](../system-spec/security.md) | 確定 | `confirmed` | G2 G4 G5 G6 G1 | security.web security.mobile security.tablet security.desktop-windows security.desktop-linux security.desktop-macos |
| インフラ (infrastructure) | [infrastructure.md](../system-spec/infrastructure.md) | 確定 | `confirmed` | G1 G2 G4 G5 G6 | infrastructure.web infrastructure.mobile infrastructure.tablet infrastructure.desktop-windows infrastructure.desktop-linux infrastructure.desktop-macos |
| バックエンド (backend) | [backend.md](../system-spec/backend.md) | 確定 | `confirmed` | G1 G2 G5 G3 | backend.web backend.mobile backend.tablet backend.desktop-windows backend.desktop-linux backend.desktop-macos |
| フロントエンド (frontend) | [frontend.md](../system-spec/frontend.md) | 確定 | `confirmed` | G1 G2 G5 G6 G7 | frontend.web frontend.mobile frontend.tablet frontend.desktop-windows frontend.desktop-linux frontend.desktop-macos |
| 保守運用管理 (maintenance-ops) | [maintenance-ops.md](../system-spec/maintenance-ops.md) | 確定 | `confirmed` | G2 G5 G1 | maintenance-ops.web maintenance-ops.mobile maintenance-ops.tablet maintenance-ops.desktop-windows maintenance-ops.desktop-linux maintenance-ops.desktop-macos |
| 開発フロー (dev-workflow) | [dev-workflow.md](../system-spec/dev-workflow.md) | 確定 | `confirmed` | G1 G2 G5 | dev-workflow.web dev-workflow.mobile dev-workflow.tablet dev-workflow.desktop-windows dev-workflow.desktop-linux dev-workflow.desktop-macos |
| テスト戦略・品質保証 (testing-qa) | [testing-qa.md](../system-spec/testing-qa.md) | 確定 | `confirmed` | G2 G5 G1 | testing-qa.web testing-qa.mobile testing-qa.tablet testing-qa.desktop-windows testing-qa.desktop-linux testing-qa.desktop-macos |

## 集約状態サマリ

- **未着手**: —
- **収集中**: —
- **確定**: database, auth, ui-ux, security, infrastructure, backend, frontend, maintenance-ops, dev-workflow, testing-qa
- **対象外**: —

## 実装 writeback

- [実装 writeback 索引](../system-spec/implementation-writebacks.md) — 要件確定後の実装契約を、再compileの所有範囲外で保持する正本

## 全体ドキュメント出典 (未割当参照)

- (全ての取得済みドキュメントは各章へ割り当て済み)
