---
graph_node_id: "issue-ci-post-deploy-smoke-propagation-window-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["ci","deploy","cloudflare-workers","fail-closed","smoke"]
priority: "high"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "post-deploy smoke が配信伝播完了前に走る窓を塞ぐ"
owners: ["daishiman"]
created_at: "2026-08-08T00:00:00Z"
updated_at: "2026-08-07T22:19:22Z"
status: "active"
depends_on: []
related_nodes: ["feat-build-identity-deploy-freshness","spec-post-signin-landing-observability"]
resource_scope: [".github/workflows/ci.yml","apps/hub/tests/ci/production-auth-gates.test.ts","docs/infrastructure-spec.md","specs/harness-hub-post-signin-landing-observability-addendum.md"]
purpose: "配信版一致ゲート通過後も残る colo 間伝播ムラの窓を塞ぎ、smoke が旧版を検査して偽の赤を出すことを防ぐ。"
goal: "伝播が遅い状況で smoke が旧版へ当たる前に fail-closed で停止し、正常時は deploy 所要時間を実用範囲に保つ。"
scope_in: ["version_gate の連続一致要求または smoke 直前の version 再確認","追加検査が fail-open でないことの契約テスト","infrastructure-spec / addendum への反映"]
scope_out: ["認可判定ロジック (tenant_mismatch の status)","Cloudflare 側の配信基盤設定変更","rollback 方針そのものの再設計"]
acceptance: ["伝播が遅い状況で smoke より前に赤で停止することを再現できる","追加した待機・再試行が fail-open でないことがテストで固定されている","正常時の deploy job 所要時間の増分が実用上問題にならない範囲に収まる"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ci-post-deploy-smoke-propagation-window-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"3785a2c548943b38839c405c936aff16d43cc696ee847a84fabc463b14bfb5d7","evaluator":"CI 実測 (hub-ci run 31221676748 / 31222374425) による原因確定","evidence_ref":"specs/harness-hub-post-signin-landing-observability-addendum.md"}
source_lineage: {"imported_at":"2026-08-08T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "version_gate 実装後に残った運用上の窓を、変更本体から分離して追跡する issue。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ci-post-deploy-smoke-propagation-window-20260808.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-u9zq","linked_at":"2026-08-07T22:19:22Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T00:00:00Z","missing_sections":[],"status":"complete"}
---

# post-deploy smoke が配信伝播完了前に走る窓を塞ぐ

## 背景

2026-08-07 に `.github/workflows/ci.yml` へ「配信版が今デプロイした版であることの検査」step (id: `version_gate`) を入れた。deploy step が控えた version id と `/health` の `version` を突き合わせ、一致しなければ smoke より前に fail-closed で停止する。これで「deploy は success なのに配信は古い版のまま、その古い版を smoke が叩いて赤くなり、その赤がまた rollback を呼ぶ」という循環は断ち切れた。

ただしこのゲートは `/health` が **1 回**一致した時点で通過する。Cloudflare Workers の配信伝播は colo (エッジ拠点) ごとにタイミングが異なるため、ゲートを通した直後の smoke が別 colo の旧版へ当たる窓が残っている。

## 実測 (2026-08-07)

| run | 観測 | 結果 |
|---|---|---|
| 31221676748 | deploy 直後の `/health` は旧版 `2e4a6c5b` を返し、1.3 秒後に新版 `af5778f5` へ切替わった | `version_gate` は PASS。しかし後続の hearing smoke が `POST /api/v1/ai-jobs/pull` で `expected=404 actual=403` で失敗した (403 は `tenant_mismatch` を 404 へ直す前のコードの応答) |
| 31222374425 | 配信が落ち着いた後に同一 commit を再配備 | `deployed=served=a2aef34d` で一致し、smoke を含む全 step が success |

つまり前区間で「deployment が昇格しない」と見えていた現象は、実体としては **伝播遅延**であり、ゲート自体は正しく機能している。残っているのは「ゲート通過 ≠ 全 colo で伝播完了」というズレだけである。

## 対応候補 (いずれも fail-open にしない)

1. `version_gate` で **N 回連続一致**を要求する (単発の一致で通さない)
2. smoke 実行の**直前にも version を再確認**し、不一致なら一定回数まで再試行する
3. ゲート通過後に**短い待機**を置く

いずれも「一定時間待っても一致しなければ失敗する」形にし、待っただけで通す実装にはしない。

## 受入条件

- 伝播が遅い状況を再現したとき、smoke が旧版へ当たる前に赤で止まる
- 伝播が正常な状況では、追加された待機・再試行によって deploy job の所要時間が実用上問題にならない範囲に収まる
- 追加した検査が fail-open でない (タイムアウト時に success へ倒れない) ことがテストで固定されている

## 根拠文書

- `specs/harness-hub-post-signin-landing-observability-addendum.md` §2.11 (V7-a..d)
- `docs/infrastructure-spec.md` §7 (deploy job の内容 / rollback step の契約)
- `apps/hub/tests/ci/production-auth-gates.test.ts` (version_gate の順序と rollback 抑止の契約テスト)

## 実装結果 (2026-08-08)

対応候補のうち **(1) N 回連続一致** を採用し、待機 (3) はその間隔として内包させた。実装は `.github/workflows/ci.yml` の `version_gate` step。

- 連続 3 回一致 (間隔 3 秒・上限 90 秒) を通過条件とし、不一致を 1 回でも観測したら計数を 0 へ戻す (通算一致回数で代用しない)。回数・間隔・上限は `VERSION_GATE_STREAK` / `VERSION_GATE_INTERVAL_SECONDS` / `VERSION_GATE_TIMEOUT_SECONDS` で調整できる。
- 観測のたびに cache-buster クエリと `Cache-Control: no-cache` を付け、途中のキャッシュ済み応答を「配信中の版」と誤認しない。
- 応答の `cf-ray` から当たった colo を記録し、何拠点を観測したうえで通したかを後から検証できるようにした。
- 通過判定の根拠は `/health` の JSON だけに置いた。`wrangler deployments list` の出力は表示仕様が変わりうるため、パース失敗が空文字になって素通りする (fail-open) 危険があり、診断表示に限定した。

### 採らなかった案と理由

**(2) smoke 実行直前の version 再確認**は採らなかった。`version_gate` 自体が smoke 群の直前に位置しており、連続一致がその役割を果たすため。smoke の実行中 (数分) に配信が旧版へ戻る事象は観測されていない。もし観測されたらこの判断を見直す。

### 検証

`apps/hub/tests/ci/version-gate-behavior.test.ts` を新設した。workflow の記述内容 (必要な式が書かれているか) を見るだけでは、条件式を書き間違えて常に通過するようになっても緑のままになる。そこで `ci.yml` から `run` 本文をそのまま抜き出し、偽の `curl` を PATH 先頭に置いて bash で実行し、次を **exit code** で固定した。

| ケース | 期待 | 結果 |
|---|---|---|
| 最初から一致 (正常時) | 通過 | exit 0 |
| 4 回目で切替 (伝播遅延) | 連続一致に到達して通過 | exit 0・切替前に `streak=0/3` を観測 |
| 新旧が混ざる (colo 伝播ムラ) | **通過させない** | exit 1 |
| 入れ替わらないまま期限切れ | 失敗 (fail-open にしない) | exit 1 |

3 件目が旧実装 (単発一致) の通していた状況そのもので、今回塞いだ窓に対応する。記述面の契約は `apps/hub/tests/ci/production-auth-gates.test.ts` に 3 件追加した (連続一致の要求・キャッシュ誤認防止と colo 記録・判定根拠を `/health` に限定)。

### 実運用での確認 (run 31224919542 / 2026-08-07 22:52)

連続一致を入れた最初の deploy で、窓が実在することが確認できた。

| attempt | colo | served | streak |
|---|---|---|---|
| 1 | IAD | `0da075d8` (新) | 1/3 |
| 2 | IAD | `a2aef34d` (**旧**) | **0/3** |
| 3-5 | IAD | `0da075d8` (新) | 1/3 → 2/3 → 3/3 で通過 |

旧実装は attempt=1 で通過していた。その直後の smoke は attempt=2 が示すとおり旧版へ当たりうる状態だった。

**新旧が混ざったのは同一 colo (IAD) 内である。** 当初の仮説は「colo 間で切替時刻が違う」だったが、実際には同一拠点内でも切替が段階的に進む。粒度は仮説より細かく、単発一致は原理的に不十分だった。`cf-ray` の記録がなければこの区別はつかなかった。

### 残る限界

連続一致は伝播ムラに対する**確率的な**緩和であり、確定的な保証ではない。どの経路に当たるかは呼び出し側で制御できないため、「3 回とも先に切替わった側に当たった」場合は依然として通過しうる。上の実測が示すとおり切替は同一 colo 内でも段階的なので、この可能性は colo 単位で考えるより高いと見るべきである。`cf-ray` の記録は、この限界が実際に起きたかを事後に判別するために入れてある。観測されたら次の手 (拠点を分散させる観測、または Cloudflare API による deployment 状態の直接確認) を検討する。
