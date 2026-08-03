---
status: blocked
layer: feature-final-review-receipt
task: SYS-USER-ORG-ADMIN-P10
feature_package_id: feature-package/feat-user-org-admin
reviewed_at: 2026-08-03
spec_impact: none
---

# feat-user-org-admin 仕様反映・最終レビュー受領書

## 結論

今回の実装差分は、既存の feature / task / system specification が定める機能を実装しようとするものであり、要件・公開 API 契約・設計判断の変更はない。したがって `system-spec/`、`specs/`、`architecture/`、`features/`、`tasks/` の正本は変更しない。

ただし、実装は既存仕様に未達である。仕様を実装へ合わせて緩めるのではなく、受入判定を blocked に訂正し、実装を仕様へ戻す。

## 確認した正本と判断理由

| 正本 | 確認結果 |
|---|---|
| `system-spec/` / `specs/` | 係数変更の監査、通知ディスパッチ経由、PII 非露出を既に規定。変更不要。 |
| `architecture/` | 既存 architecture 参照は変更不要。feature ADR の未解決事項へ実装未達を追記。 |
| `features/feat-user-org-admin.md` | goal は係数管理・通知ディスパッチ接続を要求しており、変更不要。 |
| `tasks/feat-user-org-admin/` | P05 の完了条件は未達。content-addressed task specification は手編集せず、Beads を再オープンして正規の再実行へ戻す。 |
| `docs/features/feat-user-org-admin/` | acceptance / QA / final review / runbook / evidence を blocked の実測に訂正した。 |

## 未達と再開条件

1. `PATCH /api/v1/tenant/coefficients` を `501` ではなく、owner の `updateCoefficients` port 経由で更新する。
2. 更新時に `AuditRepo.append(... action: 'coefficient.change')` を記録し、値そのものを summary に含めない。
3. feature が共通 `NotificationDispatcher` を実際に呼び、PII を含まないメッセージを配送する。
4. 上記を HTTP 結合テストへ昇格し、全品質ゲートを再実行する。

## 再実行結果

- task specification validator: PASS（legacy package の構造検査）
- focused feature / authz tests: `124 passed / 21 todo`
- Hub build, lint, typecheck, single-authz-middleware gate: PASS

この受領書は PR 前の HEAD 束縛受領書の代替ではない。2026-08-04 のユーザー明示指示により、未達を残課題として明記する draft PR のみ作成する。commit / merge / release の可否を示す受領書は、残課題解消後に clean HEAD で `scripts/build-spec-reflection-receipt.py` を実行して改めて記録する。
