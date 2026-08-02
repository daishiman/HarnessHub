---
status: accepted
layer: feature-design
task: issue-auth-tenancy-customer-managed-google-oidc-20260729
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
beads_ids:
  - HarnessHub-uk2i
accepted_at: 2026-08-02
---

# 仕様反映受領書: 顧客持ち込み Google OAuth client 管理

## 1. 対象

- Beads ID: `HarnessHub-uk2i`
- dev-graph node ID: `issue-auth-tenancy-customer-managed-google-oidc-20260729`
- 実装ブランチ: `devgraph/issue-auth-tenancy-customer-managed-google-oidc-20260729`
- 正本 task: `issues/sys-auth-tenancy-customer-managed-google-oidc-20260729.md`
- 実行日: 2026-08-02

顧客が Google Cloud で用意した OAuth client を provider-admin が Hub へ登録し、
接続テスト、有効化、無停止 rotation、取消、無効化、再開まで管理できる変更を受領した。

## 2. 影響判定

**仕様・設計への影響あり**と判定した。

理由は、管理画面の追加だけではなく、外部 API、認可 action、tenant 分離、DB migration、
credential 状態機械、秘密値の扱い、運用手順、テスト完了条件が変わるためである。
単なる内部リファクタリング（外から見える動きが変わらない整理）には該当しない。

## 3. system-spec 正規反映

確定済みセルを理由付きで reopen（再検討のため一度開くこと）し、正規 writer と compiler を通して
再確定した。既存契約は情報を落とさず維持し、今回差分だけを追加した。

| 章 | 確定質疑 | 反映内容 |
| --- | --- | --- |
| auth | `qa-124` | pending / tested / active / disabled、明示有効化、暗黙 fallback 禁止、disabled 再開 |
| backend | `qa-125` | Google 専用管理 API、provider-admin、issuer 境界、CAS、監査語彙 |
| database | `qa-126` | migration 0004、staging 列、原子的昇格、現行/pending CAS、nullable domain 契約訂正 |
| frontend | `qa-127` | `/settings/auth`、Workspace domain 入力、状態/rotation 表示、固定エラー文言 |
| security | `qa-128` | secret 非露出、tenant/issuer 境界、fail-closed、probe と実 login の分離 |
| maintenance-ops | `qa-129` | 顧客と Hub の責任境界、登録/rotation/停止/再開 runbook |
| testing-qa | `qa-130` | 実 DB、認可、CAS、非露出、a11y、全品質ゲート、外部実測残余 |

反映先は `system-spec/spec-state.json` と各章
(`auth.md` / `backend.md` / `database.md` / `frontend.md` / `security.md` /
`maintenance-ops.md` / `testing-qa.md`) である。

## 4. 関連文書への反映

| 層 | 反映先 | 受領内容 |
| --- | --- | --- |
| 統合仕様 | `specs/harness-hub-system-specification.md` | lifecycle、API、DB、UI、安全境界、運用 |
| feature | `features/feat-auth-tenancy.md` | 実装範囲と検証結果 |
| architecture | `architecture/harness-hub-backend.md` | 管理 service、Google issuer 分離、CAS |
| architecture | `architecture/harness-hub-data.md` | migration 0004、暗号化 staging、原子的昇格 |
| architecture | `architecture/harness-hub-frontend.md` | provider-admin 管理画面と bundle 境界 |
| architecture | `architecture/harness-hub-security.md` | secret、tenant、認可、fail-closed |
| architecture | `architecture/harness-hub-testing-qa.md` | 実 DB / route / a11y / secret scan |
| task | `tasks/feat-auth-tenancy/sys-auth-tenancy-p11.md` | P11 実装・検証証跡 |
| operations | `docs/features/feat-auth-tenancy/runbook-customer-managed-google-oidc.md` | 登録、rotation、無効化、再開、実 login |
| verification | `docs/features/feat-auth-tenancy/test-run-results-customer-managed-google-oidc.md` | 品質ゲート実測値と受入条件対応 |

## 5. 最終レビューで是正した事項

1. active / tested の現行 credential 再テストでも `last_tested_at` を更新するようにした。
2. Google 接続を有効化したとき、別 issuer の active IdP を誤って降格させる処理を除去した。
3. Google 専用 API は一覧と ID 指定の両方で issuer を固定し、別 issuer を非列挙・操作拒否にした。
4. Workspace domain 入力を画面へ追加し、小文字化・空白除去・重複排除して送信するようにした。
5. 接続 probe は redirect URI を検証できないため、実ブラウザ login を別完了ゲートにした。
6. disabled の接続へ新 credential を staging すると pending へ戻り、再テスト後だけ再開できるようにした。
7. 管理 API のエラー応答を未知文字列まで受理しない runtime 型ガードへ変更した。
8. clipboard 失敗を未処理 Promise にせず安全に扱うようにした。
9. client bundle へ Zod 全体を含めないようにし、未知エラー拒否を維持したまま
   `/settings/auth` を 133.6 KiB から 113.3 KiB へ削減した。
10. 手書きファイルを単一責務で分割し、対象を 500 行以内にした。

## 6. 品質ゲート受領結果

`CI=1 pnpm verify` を修正後に再実行し、exit 0 を受領した。

- Hub: 85 files / 1040 tests pass
- DB: 31 files / 256 tests pass
- UI: 12 files / 266 tests pass
- schemas: 6 files / 86 tests pass
- inspection: 9 files / 151 tests pass
- estimation: 3 files / 40 tests pass
- tenant isolation: 12 tests pass
- secret scan: 538 files / findings 0
- Worker bundle: 1.332 MiB / 3.000 MiB
- `/settings/auth` client bundle: 113.3 KiB / 120.0 KiB
- system plan、dev-graph schema、system-spec coverage / foundation / citation /
  knowledge / doctrine / required-info / cross: 全て pass
- `git diff --check`: pass

## 7. main 同期受領結果

- `origin/main`: `7bab5a2ff6c732eabc709649ffdeec79fd51c807`
- local `main`: `7bab5a2ff6c732eabc709649ffdeec79fd51c807`
- 初回同期 merge: `961ee43b491d687f452799407fed567ea55c8fe8`
- 最新 main の feature への反映: 本受領書を含む最新 merge commit
- `git merge-base --is-ancestor origin/main HEAD`: pass

リモート main をローカル main へ同期した後、その local main を feature branch へマージした。
初回同期後に main が PR #633 まで前進したため再同期した。`system-spec/spec-state.json` では
main 側の Hub 基盤 closeout `qa-123` と今回分の旧 `qa-123` が衝突したため、main の
`qa-123` を維持し、今回分を `qa-124`〜`qa-130` へ再採番した。7 章すべてを正規 writer の
reopen → confirm → set-serves と compiler で再反映し、手作業の片側採用は行っていない。
マージ後に system plan、dev-graph schema、system-spec 全決定論ゲートを再実行して pass した。

## 8. 500 行制約

手書き実装・テストは責務ごとに分離し、全て 500 行以内にした。
`packages/db/migrations/meta/0004_snapshot.json` は Drizzle が migration 系譜から生成する
機械生成物である。`system-spec/spec-state.json` は system-spec writer / compiler が単一 state として
検証する正本である。どちらも手作業で分割すると schema drift または validator 不整合を起こすため、
500 行制約の機械生成・単一正本例外として受領する。

## 9. 受領時点の残課題

- 顧客の実 Google OAuth client を使った probe とブラウザ login。
- Playwright（実ブラウザを自動操作するテスト）導入後の画面操作確認。
- production 環境への migration 0004 適用と smoke test。
- draft PR の review / CI / merge 完了後に Beads を close すること。

これらは外部 credential または production 権限、PR merge を必要とするため、repository 内の
実装完了と分離して追跡する。現時点では Beads を `in_progress` のまま維持する。

## 10. 受領結論

仕様影響を「あり」として正規反映し、実装、仕様、architecture、feature、task、運用、検証証跡の
対応が取れていることを受領した。repository 内で実行可能な品質ゲートは全て合格している。
