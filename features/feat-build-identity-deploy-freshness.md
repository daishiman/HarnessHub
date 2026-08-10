---
graph_node_id: "feat-build-identity-deploy-freshness"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["build-identity","deploy","observability","ci","web-only"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "稼働ビルドの同一性確認と deploy 反映鮮度の検出"
owners: ["daishiman"]
created_at: "2026-08-07T11:12:00Z"
updated_at: "2026-08-07T14:09:32.848833Z"
status: "active"
depends_on: []
related_nodes: ["spec-post-signin-landing-observability","arch-harness-hub-infrastructure","arch-harness-hub-testing-qa"]
resource_scope: ["apps/hub/scripts","apps/hub/src/app/api/health",".github/workflows/ci.yml"]
purpose: "本番で動いているビルドが repository のどの commit に対応するかを知る手段が無いため、『コードは直っている』と『本番が直っている』を区別できず、1 回の GET で決まる事実の確定に 10 ラウンド以上を要した。この観測不能状態を解消する。"
goal: "稼働中の成果物から対応 commit を認証なしで確認でき、稼働ビルドが既定 branch の HEAD より古い状態が続くことを CI が検出する状態にする。"
scope_in: ["稼働成果物へ commit 識別子を埋め込み、認証なしで読み出せる経路を用意する (V6)","稼働ビルドの commit と既定 branch HEAD の乖離が続くことを検出する仕組み (V7)","乖離検出の閾値と通知先の決定","検出が実際に発火することを test で固定する"]
scope_out: ["deploy そのものの実行 (運用操作であり本 feature の成果物ではない)","deploy pipeline の構成変更 (GitHub Actions 経由という既存経路を維持する)","認証を要する管理画面での表示 (認証なしで読めることが要件のため)"]
acceptance: ["稼働中の成果物から、それが repository のどの commit に対応するかを認証なしで確認できる","commit 識別子の埋め込みが CI の build 時に自動で行われ、手動更新に依存しない","稼働ビルドが既定 branch の HEAD より古い状態が続いていることを検出できる","検出のしきい値を超えた状態を再現する fixture で、検査が実際に落ちることが test で固定されている","commit 識別子の露出が、内部 path・secret・個人データを含まない"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-build-identity-deploy-freshness.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-build-identity-deploy-freshness/9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-07T11:12:00Z","origin_kind":"system-spec-harness","source_digest":"e1ecf64f6bd0dfc66926fc252aae33dd70303563a0bfda48954e3f58f64a9146","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "確定仕様追補 spec-post-signin-landing-observability (qa-170〜qa-199) を macro 分解した feature"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-build-identity-deploy-freshness.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-hf9y","linked_at":"2026-08-07T13:44:16Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-07T11:35:00Z","missing_sections":[],"status":"complete"}
---

# 稼働ビルドの同一性確認と deploy 反映鮮度の検出

## 0. なぜこの feature があるのか

本 feature は、利用者の当初の困りごと (サインイン後に業務画面へ到達しない) の**原因そのものを二度と見失わないため**の観測基盤である。

原因は「本番で動いていたビルドが、着地先を直した commit `150a0f14` を含んでいなかった」ことだった (仕様追補 §2.10)。是正自体は再デプロイだけで済む。しかしその確定に 10 ラウンド以上を要したのは、**稼働ビルドの素性を問い合わせる手段が無かった**からである。コードを読めば読むほど「直っているはずだ」という誤った確信が強まり、実際に立てた原因仮説は仕様追補 §2.3〜2.6 のとおり全て反証された。

本 feature が入れば、同種の切り分けは 1 回の GET で終わる。

## 1. 目的

本番で動いているビルドが repository のどの commit に対応するかを知る手段が無いため、『コードは直っている』と『本番が直っている』を区別できず、1 回の GET で決まる事実の確定に 10 ラウンド以上を要した。この観測不能状態を解消する。

## 2. ゴール

稼働中の成果物から対応 commit を認証なしで確認でき、稼働ビルドが既定 branch の HEAD より古い状態が続くことを CI が検出する状態にする。

## 3. 含むもの

- 稼働成果物へ commit 識別子を埋め込み、認証なしで読み出せる経路を用意する (V6)
- 稼働ビルドの commit と既定 branch HEAD の乖離が続くことを検出する仕組み (V7)
- 乖離検出の閾値と通知先の決定
- 検出が実際に発火することを test で固定する

## 4. 含まないもの

- deploy そのものの実行 (運用操作であり本 feature の成果物ではない)
- deploy pipeline の構成変更 (GitHub Actions 経由という既存経路を維持する)
- 認証を要する管理画面での表示 (認証なしで読めることが要件のため)

## 5. 受入基準

- 稼働中の成果物から、それが repository のどの commit に対応するかを認証なしで確認できる
- commit 識別子の埋め込みが CI の build 時に自動で行われ、手動更新に依存しない
- 稼働ビルドが既定 branch の HEAD より古い状態が続いていることを検出できる
- 検出のしきい値を超えた状態を再現する fixture で、検査が実際に落ちることが test で固定されている
- commit 識別子の露出が、内部 path・secret・個人データを含まない

## 6. 前提となる feature

- なし (他 feature の完了を待たずに着手できる)

## 7. 参照するアーキテクチャ

- `arch-harness-hub-infrastructure`
- `arch-harness-hub-testing-qa`

## 8. 補足

> **認証なしで読めること**が要件である点に注意する。認証が壊れている疑いがあるときに認証を要する経路でしか素性を確認できなければ、本件と同じ袋小路に入る。一方で露出してよいのは commit 識別子までであり、内部 path・secret・個人データを混ぜない。

> V7 (鮮度検出) は「古いこと」ではなく「**古い状態が続いていること**」を検出する。deploy 直後の一時的な乖離まで落とすと運用が回らない。本件は 2026-08-03 の修正が 2026-08-07 時点で未反映 = 4 日間継続していた。

## 9. 出所

確定仕様追補 [`spec-post-signin-landing-observability`](../docs/features/feat-post-signin-landing-surface/landing-observability-investigation.md) を macro 分解したもの。
正本は `system-spec/spec-state.json` (qa-170〜qa-199, digest `e1ecf64f6bd0dfc6…`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。

## 10. 実装状態 (2026-08-08)

P01〜P13 の成果物を実装し、契約・挙動・CI 配線の品質ゲートを緑にした。

| 層 | 参照 |
|---|---|
| 実装確定契約 | [`specs/harness-hub-build-identity-deploy-freshness-addendum.md`](../specs/harness-hub-build-identity-deploy-freshness-addendum.md) |
| 親追補索引 | [`docs/features/feat-post-signin-landing-surface/landing-observability-investigation.md`](../docs/features/feat-post-signin-landing-surface/landing-observability-investigation.md) §8 |
| architecture | [`architecture/harness-hub-infrastructure.md`](../architecture/harness-hub-infrastructure.md) 2026-08-08 節 |
| 運用・証跡 | [`docs/features/feat-build-identity-deploy-freshness/`](../docs/features/feat-build-identity-deploy-freshness/) |
| 仕様反映受領書 | [`docs/features/feat-build-identity-deploy-freshness/spec-reflection-receipt.md`](../docs/features/feat-build-identity-deploy-freshness/spec-reflection-receipt.md) |
| Beads epic | `HarnessHub-hf9y`（子 P01-P13: `7sac` / `bod6` / `8x08` / `ivao` / `8u3p` / `8djt` / `oekv` / `dgkk` / `j05t` / `vdhi` / `gchm` / `rtcd` / `gvg3`） |
| dev-graph node | `feat-build-identity-deploy-freshness` / `SYS-BUILD-IDENTITY-P01` 〜 `P13` |

**残課題:** 本番 deploy 後の `/health.commit` 実測と鮮度検査 step の緑確認（`release-record.md` に手順あり。未取得を確認済みと書かない）。

## 11. 伝播安定性 follow-up (2026-08-08)

`HarnessHub-u9zq` は V7 の既確定要件を変更せず、実装後に見つかった **smoke が旧 colo（エッジ拠点）の版へ当たる時間帯**を塞ぐ follow-up である。`version_gate` は新版の到達、鮮度検査は既定 branch からの長期乖離を確認するが、どちらも通過後の短い伝播ムラは別に確認する必要がある。

CI は最初の smoke の直前に deployment version と `/health.version` の連続一致を要求する。不一致、通信失敗、version 欠落は smoke を走らせず失敗にし、smoke 未実行なので rollback もしない。実装・設計根拠・検証は `specs/harness-hub-build-identity-deploy-freshness-addendum.md`、`architecture/harness-hub-infrastructure.md`、`docs/features/feat-build-identity-deploy-freshness/spec-reflection-receipt.md` を正本とする。
