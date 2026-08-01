---
status: confirmed
layer: feature-quality
task: SYS-PUBLISH-PIPELINE-P07
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/test-run-results.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline 受入記録

> **位置づけ**: P07 の成果物。[test-run-results.md](./test-run-results.md) (P06) の全 pass を前提に、goal-spec の acceptance 3 件を最終確認する。

確認日: 2026-07-28

## 1. acceptance 3 件の判定

### A1. 状態遷移が docs/backend-spec.md §7.2 準拠で property test を通る

**判定: 満たす**

| 確認事項 | 証跡 |
|---|---|
| 遷移表に載る組がすべて `ok: true` を返す | `state-machine.test.ts` T1-A (9 状態 × 全イベントの直積を全数生成) |
| 遷移表に**無い**組がすべて `ok: false, reason: 'illegal_transition'` を返す | 同上。許可の**上界**であることを直積の全点で確認している |
| 終端状態 (`published` / `failed`) からはどのイベントでも遷移しない | T1-B |
| 同じ (state, event) を何度呼んでも同じ結果 (純関数) | T1-B |
| `draft → published` / `draft → failed` の経路が存在する | T1-C (幅優先探索) |
| `ready --submit--> approval_pending` は定義上許可されるが MVP では到達不能 | T1-D。到達不能であること自体を assert している |

> **なぜ直積の全数か**: 「許可された遷移が通る」だけを試すと、**許可していない遷移も通ってしまう**バグを検出できない。遷移表を許可の上界として固定するには、載っていない組が拒否されることを全点で見る必要がある。

対応する quality_constraint: `publish-request-state-machine-section7-2-property-test-qa009` (P06 Q1 pass)。

### A2. 検査 FAIL 時に Needs Fix へ差し戻り、旧 stable が維持される

**判定: 満たす**

前半 (Needs Fix への差し戻し) と後半 (旧 stable の維持) を分けて確認した。

| 確認事項 | 証跡 |
|---|---|
| 検査 verdict が `fail` (Red) のとき状態が `needs_fix` へ遷移する | `verdict-mapping.test.ts` + `state-machine.test.ts` T1-E |
| verdict が `warn` (Yellow) も同じく `needs_fix` へ差し戻る (自動公開しない) | `verdict-mapping.test.ts` |
| verdict が `pass` (Green) のときのみ自動承認へ進む | 同上 |
| 差し戻し時に channel の stable ポインタを**書き換えない** | `service-request.cases.ts` / `service-release.cases.ts`。検査 fail の request は pointer 操作へ到達しない |
| 差し戻し後も旧 Release 行が不変のまま残る | `packages/db/__tests__/release-immutable.test.ts` |
| 検査は static validation + secret scan + policy の 3 本立てで行われる | `packages/inspection/src/publish-inspection.test.ts` + `check-publish-inspection-gate.mjs` |

> **本 phase で確認の質が上がった点**: P06 §4-1 で、検査が構造ルールのみで走っており secret scan が結線されていなかったことが判明した。是正前は「A2 を満たしている」という判定が**検査の中身の欠落を見ないまま**成立してしまっていた。現在は合成が単一化され、静的ゲートで固定されている。

対応する quality_constraint: `green-auto-publish-yellow-red-needs-fix-i2` (Q3) + `immutable-release-targetchannel-stable-pointer-atomic-rollback-i3` (Q4)。

### A3. 全操作が append-only 監査 event に記録される

**判定: 満たす**

| 確認事項 | 証跡 |
|---|---|
| 変更系の全操作 (create / package upload / submit / approve / cancel / promote / rollback / suspend / deployment 登録) が監査 event を 1 件以上残す | `service-request.cases.ts` / `service-release.cases.ts` の監査群。`PUBLISH_AUDIT_ACTIONS` の各 action に対応するテストがある |
| event が append-only である (更新・削除の経路が無い) | `AuditLogger` は追記のみを公開しており、更新 API を持たない |
| `seq` / `prev_hash` / `event_hash` の連鎖が破綻しない | `packages/db/__tests__/audit-chain.test.ts` + cron の `verify-audit-chain` |
| 失敗した操作も記録される (成功だけを残さない) | `service-request.cases.ts` / `service-release.cases.ts`。業務失敗 (409 / 422) の経路も確認 |

対応する quality_constraint: `append-only-audit-event-all-publish-operations` (Q6)。

## 2. quality_constraints との突き合わせ

P06 の 9 件 pass に対し、acceptance 3 件が依拠する constraint は下表のとおり。**未使用の constraint は無い** (9 件すべてがいずれかの acceptance か非機能要件を支えている)。

| quality_constraint | 支える acceptance | 備考 |
|---|---|---|
| `publish-request-state-machine-section7-2-property-test-qa009` | A1 | |
| `green-auto-publish-yellow-red-needs-fix-i2` | A2 前半 | |
| `immutable-release-targetchannel-stable-pointer-atomic-rollback-i3` | A2 後半 | |
| `append-only-audit-event-all-publish-operations` | A3 | |
| `inspection-pipeline-shared-pure-function-package-qa010-qa020` | A2 の前提 | 検査が二重実装だと A2 の判定が Hub と Publisher でずれる |
| `r2-content-addressed-package-registry-domain-model-db-consumer` | A2 の前提 | 同一内容の再アップロードが同一 Release を指すこと |
| `rest-zod-single-source-authz-middleware-qa009` | 全体の前提 | 認可を通らない経路から状態を動かせないこと |
| `targetchannel-serialization-single-inflight-publishrequest` | A2 後半の前提 | 同時 2 件を許すと「旧 stable の維持」が競合で壊れる |
| `publish-api-dual-principal-csrf-boundary-qa059` | 全体の前提 | 許可された session/Bearer だけが状態を動かし、invalid Bearer を session へ fallback しない |

## 3. 受入判定

**acceptance 3 件すべて満たす。P08 (リファクタリング/移行) へ引き継ぐ。**

ただし本記録は**テスト環境での確認**であり、本番環境での smoke test は P13 の範囲である。P13 未実施の状態で「本番で動作する」ことは主張しない。
