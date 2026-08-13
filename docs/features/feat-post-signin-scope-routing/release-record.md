---
status: confirmed
layer: feature-operations
---

# リリース記録 — feat-post-signin-scope-routing

> **履歴注記 (2026-08-13):** 本書の `/sheets` は当時のリリース受入値。現行の確認先は後続の appr-034 により `/dashboard` へ更新されており、実行手順は `release-completion-checklist.md` を正とする。

> P13 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-13-release-deploy.md`
> 目的: 本番反映と業務画面 6 種の本番実測到達確認、および確定 spec/architecture 正本への書き戻し照合を記録する。

## 本番デプロイと実測: 未実施

本 task-spec (phase-13-release-deploy.md) は cloudflare-workers/hub への本番デプロイと、業務画面 6 種 (`/sheets` `/sheets/new` `/sheets/{sheetId}` `/catalog` `/catalog/releases` `/catalog/{projectId}`) への本番実測到達確認を必須の受入条件としている。

本セッションの作業方針は「実際の commit・push・PR 作成・デプロイは明示指示があるまで行わない」（保守的プロファイル）であり、ユーザーへ確認のうえ **本番デプロイは実施しない** ことを確定した。したがって以下は未実施であり、証跡は存在しない。

- cloudflare-workers/hub への本番デプロイ
- 本番 URL での業務画面 6 種の到達実測
- 本番での deny-by-default 非退行・open redirect 防止の実測 (P09 の変異検証はローカルでの実測であり、本番実測ではない)

task-spec の受入条件のうち、次の項目は**本番実測を要求するため未充足**として明記する。

- 「サインイン成功後、遷移元がなければ `/sheets` に着地する」の本番実測
- 「戻り先に絶対 URL 等を与えても既定着地へ落ちる」の本番実測
- 「業務画面 6 種が通常のブラウザ操作で 403 にならない」の本番実測
- 「認可の reason 分布」の本番確認

ローカルでのテスト実行 (P06: 1103 PASS / 1 SKIP / 0 FAIL) と変異検証 (P09: 3 検査全て FAIL 反転を実測) は完了しており、実装の正しさそのものはローカル証跡で担保されている。本番反映の可否判断とデプロイ実行はユーザー側の別途指示を待つ。

## Beads 課題の扱い

`HarnessHub-3sjj.13` は本番デプロイが未実施のため `close` しない。open のまま残し、本番デプロイ実施時に本記録を更新してクローズする。

## Architecture/spec 正本への書き戻し照合

### 1. `architecture/harness-hub-frontend.md`

- 既存の「## 2026-08-02 サインイン後スコープと Web 完結導線」節 (L118-130) を確認した。
- 記述内容 (遷移先解決順・open redirect 防止・scope 2 系統の合流・`authorize()` 経由) は、本 feature の実装 (`apps/hub/src/lib/routing/post-signin-landing.ts`, `apps/hub/src/middleware/authz.ts`) と**意味変更なく一致**していることを確認した。
- 対応: 変更なし (既存記述が正確であることの照合のみ)。

### 2. `architecture/harness-hub-security.md`

- 既存文書には qa-135/qa-137 (scope 2 系統・`ambiguous_scope`・open redirect 防止) を対象にした専用節が無いことを確認した (grep で `authorize`/`scope`/`redirect` 関連の既存節は qa-120/qa-128 のみで本 feature の対象外)。
- 対応: 「差分追記 (2026-08-03 / `feat-post-signin-scope-routing` / qa-135・qa-137)」節を追加した (`authorize()` の判定順不変・scope 2 系統の定義・`ambiguous_scope`/`missing_tenant_scope` の区別・open redirect 防止規則)。既存の他節は変更していない。

### 3. `specs/harness-hub-post-signin-workspace-scope-addendum.md`

- A 節 (サインイン後の着地先) と B 節 (ブラウザ通常遷移でのスコープ解決) を確認した。
- 記述内容は本 feature の実装と**意味変更なく一致**していることを確認した (この addendum は feature 着手前の確定契約として先に登録されており、実装がこれに従って作られたため)。
- 対応: 変更なし (既存記述が正確であることの照合のみ)。frontmatter の `confirmation_status: confirmed` および受入基準 1-2, 5-7 (本番実測を要する項目) は、本番デプロイ未実施のため引き続き未実測のままとする。

## docs/frontend-spec.md, docs/user-journeys.md, operations-runbook.md (P12 で先行更新済み)

P12 で以下を additive に更新済み (本記録では再照合のみ行い、変更は加えない)。

- `docs/frontend-spec.md` §11 (着地先解決・scope 2 系統・`authorize()` reason 一覧)
- `docs/user-journeys.md` J2 の 1.5 行 (サインイン完了後の遷移)
- `docs/features/feat-post-signin-scope-routing/operations-runbook.md` (3 分岐の一次切り分け手順、新規作成)

仕様影響の最終判定、各正本への反映有無、品質ゲートと残課題は
[仕様反映受領書](./spec-reflection-receipt.md) に集約する。本番デプロイ・本番実測・PR マージは
引き続き本 task の完了条件であり、この参照追加だけで完了扱いにはしない。

## スコープ外の確認

- 本体実装の変更は行っていない (owner=P05)
- `authorize()` の判定順・role 判定の変更は行っていない (owner=feat-auth-tenancy、スコープ外)
- Workspace 選択画面の UI 実装は行っていない (owner=feat-workspace-switch-ux、スコープ外)

## 2026-08-08 production coverage smoke 準備

`HarnessHub-p0lr` で OIDC O5 と S1〜S8 を `ci.yml` の production deploy job へ結線した。local は focused Vitest 21 tests と Hub/DB typecheck が PASS。本番実走は draft PR merge 後であり、現時点の状態は「runner 準備済み・production evidence 待ち」である。詳細は [仕様反映受領書](production-coverage-smoke-spec-reflection-receipt.md) を参照する。

## 2026-08-08 production coverage smoke 実走完了

PR #681 merge 後の main `35a10b87` / hub-ci run `31253674292` で deploy job と OIDC O5、coverage S1〜S8 が SUCCESS。`smoke:coverage-production` 全体は `status: pass`、使い捨て tenant は削除済みで残存行 0 だった。これにより本記録冒頭の「未実施」は履歴として残しつつ、現時点の production acceptance は充足済みとする。
