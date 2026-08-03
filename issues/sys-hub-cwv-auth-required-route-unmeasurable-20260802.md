---
graph_node_id: "issue-hub-cwv-auth-required-route-unmeasurable-20260802"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","cwv","hub","ci","measurement-path"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "cwv.yml が認証必須 route の CWV を計測できない (/catalog が未認証で 401)"
owners: ["daishiman"]
created_at: "2026-08-02T06:43:52Z"
updated_at: "2026-08-02T06:43:52Z"
status: "draft"
depends_on: []
related_nodes: ["issue-hub-cwv-tbt-over-budget-20260724","SYS-DUAL-CATALOG-WEB-P13"]
resource_scope: [".github/workflows/cwv.yml","docs/features/feat-dual-catalog-web/acceptance-record.md","docs/features/feat-dual-catalog-web/release-record.md"]
purpose: "feat-dual-catalog-web の acceptance 2 (CWV 全指標 good を実測) は cwv.yml の Lighthouse 実測だけを根拠にするが、対象の /catalog は deny-by-default により未認証で 401 を返し、cwv.yml は認証済みセッションを持たない。計測経路が存在しないため、この受入条件は本番反映後も原理的に達成できず、HarnessHub-dhy ファミリーと対応する dev-graph node を完了にできない状態が続く"
goal: "認証必須 route に対しても Lighthouse による CWV 実測が成立する計測経路を用意し、401 による計測不能と閾値超過による未達を区別できる状態にする"
mvp_alignment: null
scope_in: ["cwv.yml が認証必須 route を計測できる経路 (計測用セッション付与、計測可能な到達経路の用意、認証済み実行環境への切替のいずれか) を決定し実装する","計測不能 (401) と閾値超過を受領側で区別し、どちらも good と誤記録しない fail-closed を維持する","feat-dual-catalog-web の acceptance 2 を実測値付きで判定できる状態にする"]
scope_out: ["/catalog の認可設計そのものの緩和 (deny-by-default は仕様であり変更しない)","公開ルート / の First Load JS 削減と G13 予算ゲート (issue-hub-cwv-tbt-over-budget-20260724 が所管)","feat-dual-catalog-web 側の画面実装変更"]
acceptance: ["認証必須 route に対する Lighthouse 実行が 401 で失敗せず、LCP / TBT (INP lab 代理) / CLS の実測値を取得できる","計測不能を pass にも good にも落とさず、未計測として fail-closed に扱い続けることがテストまたはゲートで担保される","feat-dual-catalog-web の acceptance-record.md acceptance 2 が実測値付きで判定済みになる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hub-cwv-auth-required-route-unmeasurable-20260802.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-02T06:43:52Z","origin_kind":"manual","source_digest":null,"source_path":".github/workflows/cwv.yml","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "本番反映後の実測で判明した CI 計測経路の欠落であり、製品機能ではなく品質計測基盤 (feat-hub-foundation 所管の cwv.yml) の独立した修正単位である"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-cwv-auth-required-route-unmeasurable-20260802.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9cgb","linked_at":"2026-08-02T06:48:10Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-02T06:43:52Z","missing_sections":[],"status":"complete"}
---

# 概要

`.github/workflows/cwv.yml` は Core Web Vitals（表示速度など、利用者の体感品質を表す指標）を
Lighthouse で実測する経路である。この workflow は**未認証**のまま公開 URL へ Lighthouse を実行する。

一方 Hub の `/catalog` は deny-by-default（既定で拒否。テナントを特定できない要求は通さない）により、
認証セッションが無い要求へ HTTP 401 を返す。結果として Lighthouse はページを読み込めず、
計測そのものが成立しない。

## 実測 (2026-08-02)

feat-dual-catalog-web を本番へ反映（merge commit `16a6f915` / `hub-ci` run `30727984628` の
deploy job success）した後、`release-completion-checklist.md` の手順どおりに実行した。

```bash
gh workflow run hub-cwv --ref main \
  -f target_url="https://harness-hub.daishimanju.workers.dev/catalog"
```

run `30736055772` は「Lighthouse 実行」step で次のエラーにより失敗し、「CWV 閾値判定」は skipped となった。

> Runtime error encountered: Lighthouse was unable to reliably load the page you requested.
> Make sure you are testing the correct URL and that the server is properly responding to all requests.
> (Status code: 401)

# なぜ問題か

feat-dual-catalog-web の acceptance 2（CWV 全指標 good を実測で満たす）は、この計測を**唯一の根拠**とする。
計測経路が存在しない限りこの受入条件は永久に未達となり、`HarnessHub-dhy` ファミリー（P01〜P13）と
対応する dev-graph node を完了にできない状態が続く。

「未計測を good と見なさない」fail-closed の原則は正しく機能している。
問題は原則ではなく、**正しく機能した結果として達成経路の無い受入条件が残っている**ことである。

# 誤解しやすい点

- **401 は障害ではない。** deny-by-default の設計どおりの応答であり、ロールバック対象ではない
  （`release-record.md` §4.3 の判定基準にも該当しない）。
- **阻害要因は「`vars.HUB_PUBLIC_URL` 未設定」でも「未デプロイ」でもない。** どちらも解消済みである。
  先行 phase はこの 2 つを順に阻害要因と記録していたが、いずれも真因ではなかった。
- **公開ルート `/` は計測できる。** 2026-07-24 に TBT 926ms を実測した実績があり、
  その予算超過は `issue-hub-cwv-tbt-over-budget-20260724` (`HarnessHub-aqi`) が追跡している。
  計測できないのは**認証必須 route だけ**である。

# 対応方針の候補

| # | 方針 | 論点 |
|---|---|---|
| 1 | `cwv.yml` へ計測用の認証済みセッションを与える | 短命な計測用資格情報を CI secret に置く運用と、その漏洩リスクをどう抑えるか |
| 2 | 計測可能な到達経路を用意する | 認証不要の read-only プレビュー route を足すと認可境界が増える |
| 3 | 認証済みブラウザ環境で Lighthouse を実行する経路へ切り替える | GitHub Actions 無料枠 2,000 分/月 (infrastructure-spec §11) との兼ね合い |

いずれも `.github/workflows/cwv.yml` と Hub の認証境界に触れるため、**feat-hub-foundation の所管**で判断する。
feat-dual-catalog-web の Write scope 外であり、同 feature 側では実施しない。

# 関連

- `docs/features/feat-dual-catalog-web/release-record.md` §2.3-3（実測の一次記録）
- `docs/features/feat-dual-catalog-web/acceptance-record.md` §2.2 再訂正 / §2.4
- `docs/features/feat-dual-catalog-web/release-completion-checklist.md` §2（完了条件 6 件中 2 件成立）
- `issue-hub-cwv-tbt-over-budget-20260724`（公開ルートの TBT 予算超過。対象 route が異なる別課題）
