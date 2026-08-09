---
graph_node_id: "spec-build-identity-deploy-freshness-addendum"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["build-identity","deploy","observability","ci","web-only"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "稼働ビルドの素性と反映鮮度 — 実装確定追補"
owners: ["daishiman"]
created_at: "2026-08-08T11:00:00Z"
updated_at: "2026-08-08T14:56:41.578322Z"
status: "active"
depends_on: ["spec-post-signin-landing-observability","feat-build-identity-deploy-freshness"]
related_nodes: ["spec-post-signin-landing-observability","feat-build-identity-deploy-freshness","arch-harness-hub-infrastructure"]
resource_scope: ["specs/harness-hub-build-identity-deploy-freshness-addendum.md","docs/features/feat-build-identity-deploy-freshness"]
purpose: "qa-198-f の稼働ビルド素性 (V6) と deploy 反映鮮度 (V7) を実装確定契約として固定する"
goal: "実装・CI・運用が参照できる単一の実装確定契約境界を維持する"
scope_in: ["/health への commit 露出契約","deploy 時 HUB_COMMIT_SHA 注入","鮮度検査の判定と rollback 境界"]
scope_out: ["deploy 操作そのもの","preview Worker への鮮度検査適用"]
acceptance: ["稼働成果物から commit を認証なしで確認できる","HEAD より古い稼働版の継続を CI が検出できる","鮮度検査失敗では自動 rollback しない"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-build-identity-deploy-freshness-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9","evaluator":"final-review","evidence_ref":"docs/features/feat-build-identity-deploy-freshness/spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-08T11:00:00Z","origin_kind":"manual","source_digest":"9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9","source_path":"features/feat-build-identity-deploy-freshness.md","source_plugin":"manual-final-review","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "feat-build-identity-deploy-freshness 実装確定契約の製品仕様追補"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-build-identity-deploy-freshness-addendum.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-08T11:00:00Z","missing_sections":[],"status":"complete"}
---

# 稼働ビルドの素性と反映鮮度 — 実装確定追補 (2026-08-08)

親追補 [`harness-hub-post-signin-landing-observability-addendum.md`](./harness-hub-post-signin-landing-observability-addendum.md) の acceptance にある次の 2 点を、macro feature `feat-build-identity-deploy-freshness` として実装した。

1. 稼働中の成果物から、それが repository のどの commit に対応するかを**認証なしで**確認できる（acceptance 括弧表記の V6 = 稼働ビルドの素性）
2. 本番の稼働ビルドが既定 branch の HEAD より古い状態が続いていることを検出できる（acceptance 括弧表記の V7 = 反映鮮度）

本追補は確定した契約の索引である。判断の根拠と運用手順の正本は `docs/features/feat-build-identity-deploy-freshness/` 配下とする。

## 1. 確定した契約

- **素性の露出先は `/health`**。応答へ optional な `commit` を追加する。制約は `^[0-9a-f]{40}$`（40 桁小文字 hex）。短縮 sha・branch 名・大文字は素性として受け付けない。専用 endpoint は作らない — 見る場所が割れると、割れた分だけ実際には見られなくなる。
- **埋込は deploy 時注入**。CI が `wrangler deploy --var "HUB_COMMIT_SHA:${GITHUB_SHA}"` で渡す。`wrangler.jsonc` へは値を書かない（親追補 2.7 の規約と両立する）。commit sha は公開情報のため Secret にしない。
- **欠落は欠落のまま表す**。埋込が無い環境では `unknown` や空文字を入れず、`commit` の key ごと落とす。代替値を入れると「素性不明」と「素性 = その値」が区別できなくなる。
- **鮮度は「古いこと」ではなく「古い状態が続いていること」で測る**。既定 branch HEAD が入ってから一定時間（`DEFAULT_MAX_LAG_MINUTES`）を超えてなお稼働版が古いときだけ落とす。deploy には数分かかるため、更新直後の乖離まで落とすと CI が常に赤くなり、誰も見なくなる。経過時間の基準は committer date とする — author date は cherry-pick / rebase で過去のまま残り、「いつ既定 branch へ入ったか」を表さない。
- **しきい値の正本は 1 箇所**。検査 script の定数のみを正本とし、CI からは環境変数で上書きする。複数箇所へ数値を書くと「検査は 30 分・文書は 60 分」の食い違いが起き、運用判断が割れる。
- **fail-open にしない**。commit を申告しない版・形式不正・`/health` 到達不能・引数不備は、いずれも「検査をスキップして通す」ではなく**落とす**。通した瞬間、埋込配線が壊れている限り検査は永久に緑になる。これは親追補 2.11 で観測した「deploy が success を返し続ける」のと同型の失敗である。
- **鮮度検査の失敗では巻き戻さない**。鮮度検査で止まった時点で後続 smoke は未実行であり、「新しい版が壊れている」証拠が無い。ここで戻すと素性を確認できない古い版へ後退させるだけになる（親追補 2.11 で実際に起きた悪化ループ）。既存の version_gate 除外（親追補 2.12）と同じ立て付けである。
- **smoke の直前にも配信版を再確認する**。`version_gate` は「新しい版が届いた」こと、鮮度検査は「既定 branch への反映が長期間止まっていない」ことを確認する。いずれも通った後に別 colo（エッジ拠点）の旧版へ smoke が当たる伝播ムラは別の失敗モードである。`assert-served-version.mjs` が deploy step の version id と `/health.version` の連続 3 回一致を要求し、不一致・到達不能・version 欠落は有限時間で fail-closed にする。再確認が失敗した時点では smoke は未実行なので、rollback はしない（`HarnessHub-u9zq`）。
- **検査を一時的に無効化する手段は用意しない**。一時無効化は恒久化する。止めたい事情があるなら、検査ではなく deploy 経路の側を止める。

## 2. 検査 ID の重複について（整理せず記録する）

親追補内で `V6` / `V7` が **2 通りの対象を指している**。

| ID | 親追補 §4 の見出しが指すもの | acceptance 末尾の括弧が指すもの |
|---|---|---|
| V6 | 環境値の読み出し規律 | 稼働ビルドの素性（commit の露出） |
| V7 | 縮退の観測可能性 | 反映鮮度（HEAD からの乖離継続の検出） |

**どちらかへ寄せる再割当ては行わない。** ID を振り直すと、過去の議事録・issue 本文・実装コメントとの対応が切れる。ここでは重複の存在を明示的に記録するに留め、整理は独立した判断として扱う。以後この契約を参照するときは、ID ではなく対象名（「環境値の読み出し規律」「反映鮮度」等）で指すこと。

## 3. 検証状態

実装・テスト・CI 配線は完了し、静的ゲートと対象テストが緑である（`docs/features/feat-build-identity-deploy-freshness/test-results.md`）。

**本番での実測（実際に `/health` から commit が返ること）は未取得**であり、merge と deploy の後に `docs/features/feat-build-identity-deploy-freshness/release-record.md` へ追記する。未取得を「確認済み」とは扱わない。

## 4. 関連成果物

| 層 | パス |
|---|---|
| feature | `features/feat-build-identity-deploy-freshness.md` |
| tasks | `tasks/feat-build-identity-deploy-freshness/sys-build-identity-p01.md` 〜 `p13.md` |
| 運用・証跡 | `docs/features/feat-build-identity-deploy-freshness/` |
| architecture | `architecture/harness-hub-infrastructure.md`（2026-08-08 節） |
| 実装 | `apps/hub/scripts/check-deploy-freshness.mjs`、`packages/schemas/src/health.ts`、`apps/hub/src/app/health/*`、`.github/workflows/ci.yml` |

## 目的と成功状態

稼働中の Hub がどの commit かを `/health` から確認でき、既定 branch より古い状態が許容時間を超えて継続した場合に CI が検出する。

## 用語と主体

「稼働版」は Cloudflare から応答する build、「既定版」は既定 branch の HEAD を指す。CI が比較主体で、運用者が失敗時の調査主体となる。

## スコープ

commit SHA の deploy 時注入、`/health` での公開、反映鮮度検査、smoke 直前の配信版再確認を対象とする。

## ユースケースとユーザーフロー

運用者は `/health` の `commit` を確認し、CI は既定版との差と経過時間を評価してから smoke test へ進む。

## 機能要件

40 桁小文字 hex の commit を公開し、欠落・形式不正・到達不能・許容時間超過・連続一致不足を非 0 終了で拒否する。

## ビジネスルールと検証

更新直後の差は許容するが、差が継続する場合は失敗とする。鮮度検査の失敗だけを理由に古い版へ rollback しない。

## データモデル

`/health.commit` は optional な 40 桁 SHA。未注入時は key 自体を省略し、代替文字列を保存しない。

## API契約

既存 `/health` 応答へ後方互換な optional `commit` を加える。専用 endpoint は追加しない。

## イベント・非同期処理

GitHub Actions の deploy、鮮度検査、配信版の連続確認、smoke の順序を固定する。

## UI・状態遷移

製品 UI は変更しない。CI 状態だけが pass / fail として遷移する。

## 認証・認可

commit SHA は公開情報なので `/health` では認証を要求せず、secret として扱わない。

## 非機能要件

検査は有限時間・決定論的・fail-closed とし、しきい値は検査 script の一箇所を正本とする。

## エラー・例外・回復

欠落、形式不正、到達不能、stale、colo 間不一致は原因を区別して報告する。鮮度失敗時は調査し、無根拠な rollback を行わない。

## 可観測性

稼働 commit、既定 commit、経過分、配信 version の一致回数を CI log に残す。

## 互換性・移行・リリース

`commit` は optional なので既存 consumer を壊さない。deploy 後の実測結果は release record へ追記する。

## テストと受入条件

schema、health route、freshness script、workflow 配線、連続 3 回一致を自動テストし、実測前は確認済みと扱わない。

## 未決事項

本番実測は merge と deploy 後に取得する。V6 / V7 の既存重複 ID は本変更では再採番しない。
