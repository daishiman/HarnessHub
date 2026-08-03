---
status: pass
layer: feature-acceptance
task: SYS-USER-ORG-ADMIN-P07
feature_package_id: feature-package/feat-user-org-admin
source_digest: sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14
---

# feat-user-org-admin 受入判定

P06 のテスト実行結果 (beads issue `HarnessHub-xwt.6` の notes に記録済み。本 feature は P06 で `test-run-report.md` を生成しない設計のため、beads notes を一次記録として扱う) だけを根拠に、goal-spec の acceptance 3 件と quality constraint 9 ID exact-set を判定した。

| # | acceptance | 判定 | 根拠 |
|---|---|---|---|
| 1 | salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録) | pass | `UOA-PII-001~009` (workspace-admin/provider-adminのみ閲覧可、member/ownerは***マスク、exportは常時マスク、role文字列比較不使用)。`UOA-A11Y-002`(S17一覧にsalary列自体が存在しない)・`UOA-A11Y-102b`(computeEditableRowsはadmin viewerのときだけsalary行を含む)。`UOA-ROUTE-002`(workspace-adminでGET /api/v1/usersを呼ぶとsalary実値が返る=maskPii実結線) |
| 2 | 係数変更が監査 event に記録される (SEC6) | pass | `PATCH /api/v1/tenant/coefficients` は owner の `updateCoefficients()` 経由で更新し、`coefficient.change` を `changedFields` のみの summary で記録する。real-DB HTTP 結合 `UOA-COEF-102` / `UOA-AUDIT-103` は係数値の非混入も確認する。 |
| 3 | S17/S18 と /legal が axe 違反 0 で動作し、/legal は全利用者が閲覧できる | pass | `UOA-A11Y-001~008`・`UOA-A11Y-101/102a/102b/102c/103` (axe違反0件を`toStrictEqual([])`で固定)。`UOA-LEGAL-001/002/101~104`(未ログインでも到達可能、`withAuthz`を経由しない設計、axe違反0件、salary/PII語彙が本文に含まれない)。`tests/security/middleware-entry.test.ts`の実HTTP到達性テスト |

## quality constraint 9 ID exact-set (Mandatory evidence)

`UOA-QC-001~004` により以下を実測確認した。

- `requirements-baseline.md` §5 の8件 (`role-4-integration`/`salary-pii-guard`/`audit-event-expansion`/`notification-dispatch-common-layer`/`backend-b10-user-management`/`coefficient-and-user-entities`/`auth-delegation-unchanged`/`axe-a11y-zero`) と、`architecture-decision-record.md`が申し送る9件目 `legal-static-page-all-users` を合わせた9件が exact-set と一致する (重複なし)
- `requirements-baseline.md`と`architecture-decision-record.md`の`feature_context_digest`が一致する
- 8件+1件へ意図的に文書を分割している設計であり、ドリフトではない (`quality-constraints-exact-set-contract.test.ts`のコメント参照)

## Automated commands

- `pnpm --filter hub build`: 成功
- focused feature / authz / middleware / shared-layer tests: 13 files / 132 passed / 10 todo / 0 failed
- `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-user-org-admin`: `status: pass`, `validated_digest: sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14`, `violations: []`

## 判定

3/3 pass。`audit-event-expansion`、`coefficient-and-user-entities`、`notification-dispatch-common-layer` は owner port・監査・共有通知の実結線で充足した。残る 15 件の todo は本受入3項目の未達ではない。
