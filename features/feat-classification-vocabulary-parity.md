---
graph_node_id: "feat-classification-vocabulary-parity"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["ci","type-safety","observability","web-only"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "分類語彙の列挙一致を到達可能性ベースで検査する"
owners: ["daishiman"]
created_at: "2026-08-07T11:12:00Z"
updated_at: "2026-08-07T11:12:00Z"
status: "draft"
depends_on: ["feat-post-signin-transition-observability"]
related_nodes: ["spec-post-signin-landing-observability","arch-harness-hub-testing-qa","arch-harness-hub-data"]
resource_scope: ["apps/hub/scripts","packages"]
purpose: "縮退の分類語彙が型宣言・zod・ORM schema の複数箇所に独立定義されると、片方だけ増えた状態が静かに成立し、記録の分類が実態からずれる。この乖離を機械検査で塞ぐ。"
goal: "分類語彙の収集が到達可能性ベースで行われ、3 経路すべてを突合し、宣言外の app/package が増えたら検査が落ちる状態にする。"
scope_in: ["分類語彙の収集を到達可能性ベース (宣言リストではなく実際に到達する範囲) で行う","型宣言・zod 導出・ORM schema 導出の 3 経路すべてを情報源にする","同一のリテラル union が複数箇所に独立定義されている状態の検出","段0 の分類語彙に tenants.status (active/suspended) を含める","実測で見落とした 8 件の fixture 全てで検査が発火することの test 固定"]
scope_out: ["分類語彙そのものの設計 (feat-post-signin-transition-observability の担当)","ORM schema の構造変更"]
acceptance: ["分類語彙の収集が到達可能性ベースで行われ、宣言外の app/package が増えたら検査が落ちる","分類語彙の収集が型宣言・zod 導出・ORM schema 導出の 3 経路すべてを対象にしている","同一のリテラル union が複数箇所に独立定義されている状態を検査が検出し、3 経路すべてを情報源として突合する","段0 の分類語彙に tenants.status (active/suspended) が含まれ、検査が実際に発火する","実測で見落とした 8 件の fixture 全てで検査が発火することが test で固定されている"]
architecture_refs: ["arch-harness-hub-testing-qa","arch-harness-hub-data"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-classification-vocabulary-parity.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-07T11:12:00Z","origin_kind":"system-spec-harness","source_digest":"e1ecf64f6bd0dfc66926fc252aae33dd70303563a0bfda48954e3f58f64a9146","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "確定仕様追補 spec-post-signin-landing-observability (qa-170〜qa-199) を macro 分解した feature"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-classification-vocabulary-parity.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-07T11:12:00Z","missing_sections":[],"status":"incomplete"}
---

# 分類語彙の列挙一致を到達可能性ベースで検査する

## 0. なぜこの feature があるのか

検査が「落ちない」ことと「見ていない」ことは、exit code の上では区別が付かない。

本 feature の主眼は、分類語彙の突合そのものよりも、**検査の対象範囲が宣言リストで固定されていない**ことにある。宣言リスト方式は、新しい app/package が増えた瞬間に静かに穴が開く。到達可能性ベースなら、増えたものは自動的に検査対象になる。

## 1. 目的

縮退の分類語彙が型宣言・zod・ORM schema の複数箇所に独立定義されると、片方だけ増えた状態が静かに成立し、記録の分類が実態からずれる。この乖離を機械検査で塞ぐ。

## 2. ゴール

分類語彙の収集が到達可能性ベースで行われ、3 経路すべてを突合し、宣言外の app/package が増えたら検査が落ちる状態にする。

## 3. 含むもの

- 分類語彙の収集を到達可能性ベース (宣言リストではなく実際に到達する範囲) で行う
- 型宣言・zod 導出・ORM schema 導出の 3 経路すべてを情報源にする
- 同一のリテラル union が複数箇所に独立定義されている状態の検出
- 段0 の分類語彙に tenants.status (active/suspended) を含める
- 実測で見落とした 8 件の fixture 全てで検査が発火することの test 固定

## 4. 含まないもの

- 分類語彙そのものの設計 (feat-post-signin-transition-observability の担当)
- ORM schema の構造変更

## 5. 受入基準

- 分類語彙の収集が到達可能性ベースで行われ、宣言外の app/package が増えたら検査が落ちる
- 分類語彙の収集が型宣言・zod 導出・ORM schema 導出の 3 経路すべてを対象にしている
- 同一のリテラル union が複数箇所に独立定義されている状態を検査が検出し、3 経路すべてを情報源として突合する
- 段0 の分類語彙に tenants.status (active/suspended) が含まれ、検査が実際に発火する
- 実測で見落とした 8 件の fixture 全てで検査が発火することが test で固定されている

## 6. 前提となる feature

- `feat-post-signin-transition-observability`

## 7. 参照するアーキテクチャ

- `arch-harness-hub-testing-qa`
- `arch-harness-hub-data`

## 8. 補足

> **8 件の fixture** は実測で見落としたケースであり、検査を書いた後にこれら全てで実際に発火することを test で固定する。『書いた検査が対象を捕まえること』を検査するのが目的で、検査の存在だけを確認する test では意味がない。

## 9. 出所

確定仕様追補 [`spec-post-signin-landing-observability`](../specs/harness-hub-post-signin-landing-observability-addendum.md) を macro 分解したもの。
正本は `system-spec/spec-state.json` (qa-170〜qa-199, digest `e1ecf64f6bd0dfc6…`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。
