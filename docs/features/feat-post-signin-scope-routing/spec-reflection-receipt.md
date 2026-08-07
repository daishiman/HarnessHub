---
title: "SYS-POST-SIGNIN-SCOPE-P13 仕様反映受領書"
layer: "feature-evidence"
feature: "feat-post-signin-scope-routing"
graph_node_id: "SYS-POST-SIGNIN-SCOPE-P13"
beads_ids:
  - "HarnessHub-3sjj"
  - "HarnessHub-3sjj.1"
  - "HarnessHub-3sjj.2"
  - "HarnessHub-3sjj.3"
  - "HarnessHub-3sjj.4"
  - "HarnessHub-3sjj.5"
  - "HarnessHub-3sjj.6"
  - "HarnessHub-3sjj.7"
  - "HarnessHub-3sjj.8"
  - "HarnessHub-3sjj.9"
  - "HarnessHub-3sjj.10"
  - "HarnessHub-3sjj.11"
  - "HarnessHub-3sjj.12"
  - "HarnessHub-3sjj.13"
recorded_at: "2026-08-03"
status: "accepted_with_release_pending"
---

# SYS-POST-SIGNIN-SCOPE-P13 仕様反映受領書

## 結論

今回の変更は、既に確定していた「サインイン後は `/sheets` へ着地し、browser session
から tenant/workspace scope を解決する」契約を実装へ結線するものである。製品の
要求・API・データモデルは変更していない。一方、scope の2入力系統、不一致時の
`ambiguous_scope` 拒否、open redirect 防止を security architecture に明文化する必要が
あったため、architecture 層へ additive（既存内容を壊さない追記）で反映した。

## 正規フローでの反映判定

| 層 | 判定 | 記録または反映内容 |
| --- | --- | --- |
| `system-spec/` | 変更なし | `frontend.md` の active workspace 選択、`security.md` の deny-by-default は実装と一致。新しい要件セルは不要。 |
| `specs/` | 変更なし | `harness-hub-post-signin-workspace-scope-addendum.md` A/B 節が、着地先・2系統・不一致拒否・複数 workspace の選択前提を既に規定する。 |
| `architecture/` | 更新 | `architecture/harness-hub-security.md` に qa-135/qa-137 の scope 合流、`ambiguous_scope`、安全な戻り先の規則を追記した。`harness-hub-frontend.md` は既存節が同じ契約を保持するため変更なし。 |
| `features/` | 変更なし | `features/feat-post-signin-scope-routing.md` は今回の scope と `feat-workspace-switch-ux` への境界を既に正確に表す。source digest を不必要に変えない。 |
| `tasks/` | 更新 | P13 task projection に本受領書と全正本層を追加し、反映または no-change 判断を受入条件化した。 |
| `docs/` | 更新 | frontend spec、user journey、運用 runbook、release record、本受領書に利用者向け挙動・運用・証跡を記録した。 |

## 実装・設計の確認

- `authorize()` は public 判定 → 認証 → scope 一意性 → tenant 一致 → workspace 所属の
  判定順を維持する。session scope はこの単一の認可関数で明示ヘッダーと合流する。
- active workspace cookie は毎回 `principal.workspaceIds` と照合し、所属外・複数所属で
  未選択の値を許可しない（fail-closed = 疑わしい場合は拒否する）。
- 戻り先は同一 origin の相対 path のみを許可し、絶対 URL、スキーム、`//host`、
  backslash trick を `/sheets` へフォールバックする。
- `middleware/index.ts` の公開境界を守り、session scope の合流は `authz.ts` に置いた。
  これにより、認可モジュールの循環 import を作らない。

## 品質ゲート受領

| ゲート | 結果 |
| --- | --- |
| task-spec quality gate | `validate-system-plan.py` PASS（P01〜P13、violations 0、contract 1.3.0） |
| generation lineage | PASS（checked 1、violations 0） |
| task projection rerun | PASS（checked 13、missing 0） |
| feature-focused test | PASS（main マージ後に 7 files、77 tests） |
| shared-layer boundary test | PASS（1 file、26 tests） |
| lint / typecheck | PASS（Biome、TypeScript） |
| Hub 全体 unit / integration | PASS（92 files、1107 tests PASS、1 skipped）。CI が検出した旧 catalog 契約を現行仕様へ整合させた後の再実行。 |

テスト開始時に欠けていた lockfile 既定の macOS Rollup optional dependency は、
`pnpm install --frozen-lockfile` で lockfile を変更せず復元した。全体テストの途中で
公開境界違反を検出し、同じレビューで修正して shared-layer と feature-focused の
再実行を合格させた。

## 残課題

- `HarnessHub-3sjj.13` は本番デプロイ、実環境での到達確認、PR の main マージと
  default-branch reconciliation が未完了のため open のまま維持する。
- 所属 workspace が2件以上の利用者が active workspace を選択・切替する UI と、
  `missing_tenant_scope` からの回復導線は別 feature
  `feat-workspace-switch-ux` の責務である。本変更はその選択値を安全に再検証して
  認可へ渡す境界までを実装した。

以上により、仕様影響の判定、正本への反映または no-change 理由、実装・検証・残課題を
同一の追跡可能な記録として受領する。

## 追補 (2026-08-04): 本番反映時に発見した conformance fix

P13 の本番デプロイ試行 (secret 投入後の CI 再実行) で、本番 hearing smoke テストの
SEC8-a (他テナントの Bearer token で自テナントのヘッダーを騙るリクエスト) が
`tenant_mismatch` (404) ではなく `ambiguous_scope` (403) を返す不具合を検出した。

### 原因

`specs/harness-hub-post-signin-workspace-scope-addendum.md` §B は scope 解決の正規入力を
「(a) 明示ヘッダー = API/機械クライアント専用」「(b) session の active
tenant/workspace = ブラウザ通常遷移専用」の 2 系統に明確に分離済みだった。しかし
`authz.ts` の実装は `resolveSessionScope()` を principal の種別を区別せず常に呼んでおり、
Bearer token (Device Flow access token) 保持クライアントにも session cookie 由来の
singleton-workspace 自動選択 (所属 1 件なら cookie 無しでも active workspace を自動確定
する §C の規則) を適用していた。所属 1 workspace の principal が明示ヘッダーで別
workspace を指定すると、session 側の自動確定値と衝突し `ambiguous_scope` に落ちていた。

### 判定: 新しい仕様変更ではない

§B は既に「明示ヘッダー系統は API/機械クライアント専用、session 系統はブラウザ通常遷移
専用」と規定しており、今回の修正はこの既存契約に実装を合わせる conformance fix
(仕様の意味を変えない適合修正) である。`system-spec/`・`specs/`・`architecture/`・
`features/` のいずれも新規反映は不要と判定する。

### 実装

- `apps/hub/src/middleware/authz.ts`: `AuthzInput` に `allowSessionScope?: boolean`
  (既定 `true`) を追加し、`false` のとき `resolveSessionScope()` を呼ばず
  session scope を `null` として扱う。
- `apps/hub/src/middleware.ts`: `authorize()` 呼び出しに
  `allowSessionScope: bearer === null` を配線し、Bearer token 保持リクエストにのみ
  session scope 解決を無効化する。

### 検証

- 回帰テスト追加: `apps/hub/tests/authz/scope-resolution.test.ts` TID-SCOPE-06
  (2 tests) — Bearer 経路 (`allowSessionScope: false`) で明示ヘッダーが優先され
  `ambiguous_scope` にならないこと、既定値 (session 許可) では singleton 自動確定と
  衝突しないことを確認。
- `apps/hub/tests/authz/scope-resolution.test.ts` (18 tests) と
  `apps/hub/tests/security/` (34 tests) は計 52 tests 全て PASS。
- `tsc --noEmit`、`biome check` (対象 3 ファイル) ともに PASS。
- 本テスト実行環境固有の事象として、`tests/authz/scope-resolution.test.ts` の
  TID-INT-01/TID-INT-03 (HomePage SSR redirect、本修正と無関係な既存テスト) が
  この worktree でのみ `ReferenceError: React is not defined` で失敗した。同一コミット
  content を独立した git worktree (fresh checkout) で実行すると再現しないことを確認
  済みであり、CI が使う fresh checkout 環境には影響しない worktree ローカルの
  キャッシュ/環境要因と判断する。pre-push hook (`scripts/run-ci-checks.sh`) は
  vitest を実行しないため、この事象は push をブロックしない。

P13 は本番再デプロイと実環境確認が残るため引き続き open のまま維持する。
