---
status: confirmed
layer: feature-evidence
task: issue-auth-tenancy-shared-google-oidc-20260729
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
beads_ids:
  - HarnessHub-fnej
dev_graph_node_id: issue-auth-tenancy-shared-google-oidc-20260729
---

# 共有 Google OIDC 仕様反映受領書

## 1. 依頼・目的・結論

`HarnessHub-fnej` の全変更を最終レビューし、task 仕様書の品質ゲートを再実行した。
目的は、新規テナントごとの Google OAuth client 登録を不要にする共有方式を、安全な
tenant 分離と既存顧客方式の互換性を保ったまま導入できるようにすることである。

結論は **仕様・設計影響あり / 正規反映済み / blocker 0 件**。
認証経路、信頼境界、DB schema、Cloudflare secret、rollout/rollback が変わるため、
実装だけの変更として扱わず `system-spec/` を R4-reopen（確定仕様を正式に開き直す手順）した。

- Beads ID: `HarnessHub-fnej`
- dev-graph node ID: `issue-auth-tenancy-shared-google-oidc-20260729`
- branch: `devgraph/issue-auth-tenancy-shared-google-oidc-20260729`
- PR base: `main`

## 2. main 統合

1. `origin/main` を fetch し、ローカル main を `4306919c` まで fast-forward した。
2. 作業差分を SHA で識別した stash に退避した。
3. ローカル main を本ブランチへ merge し、merge commit `cfa3362b` を作成した。
4. stash を復元し、衝突した無関係の `eval-log/` 2 件は元の作業差分を保持した。

したがって、ユーザー指定の `remote main → local main → feature branch` の順序を満たす。

## 3. system-spec 正規反映

専用 transition writer と canonical compiler を使い、直接 JSON/生成章を書き換えていない。

| QA | セル | 確定した差分 |
| --- | --- | --- |
| `qa-115` | `auth.web` | 2 credential mode、固定 callback、署名付き state、`hd`、principal 分離 |
| `qa-110` | `backend.web` | route dispatch、credential resolver、callback 処理順、顧客方式非回帰 |
| `qa-111` | `security.web` | login CSRF、PKCE/nonce、ID token `hd`、secret 非複製、fail-closed |
| `qa-112` | `database.web` | `credential_mode`、allow-list、共有行の保存不変条件、migration/rollback |
| `qa-113` | `infrastructure.web` | Google 固定 URI、Worker secret、段階配備、rotation |
| `qa-114` | `maintenance-ops.web` | runbook、監視、rollback、PR merge 後の完了収束 |

並行仕様更新が `qa-109` を先に使用したことを最終監査で検出したため、auth を
未使用の `qa-115` へ再採番した。現在の QA ID 重複は 0 件で、auth cell は正しい質疑を参照する。

## 4. 層別の反映先

| 層 | 反映内容 |
| --- | --- |
| `system-spec/` | auth/backend/security/database/infrastructure/maintenance-ops と state |
| `specs/` | システム仕様 wrapper に共有方式の契約と正本リンクを追記 |
| `architecture/` | security/backend/infrastructure の設計判断を追記 |
| `features/` | feat-auth-tenancy に実装結果と完了条件を追記 |
| `tasks/` | P11 evidence task にレビュー・検証の入口を追記 |
| `issues/` | 実装 issue の evidence と resource scope を更新 |
| `docs/` | AD-10、rollout runbook、本テスト結果、本受領書 |
| code/schema | Auth.js adapter、state/credential core、DB schema/repository/migration、zod schema |

dev-graph 管理 artifact は C02 単一 writer で preview 後に apply し、各回で
`write_count=0`（preview）と `write_count=2`（graph + artifact）を確認した。

## 5. 最終レビューで確認した境界

- Auth.js は OIDC provider の `idToken !== false` で、署名・nonce 検証済み ID token claims を
  sign-in callback の `profile` に渡す。したがって `hd` は UserInfo の未検証値ではない。
- 共有 state は HS256、10 分 TTL、token type、tenant id/slug、binding hash を持つ。
- callback は state/binding を DB lookup より前に検証し、`hd` を JIT 利用者作成より前に検証する。
- 同じ Google `sub` も `(tenant_id, sub)` で別 principal になる。
- 共有 client secret は tenant 行へ保存せず、JSON 化時も伏せる。
- `customer_google` の callback、Auth.js state cookie、DB secret 復号、session claims は維持する。
- migration は列追加だけで、既存行は DB default により `customer_google` のままになる。

## 6. 品質ゲート受領

| ゲート | 結果 |
| --- | --- |
| `pnpm verify` | **exit 0** |
| auth 境界 | 212/218 files、違反 0、route 例外集合一致 |
| lint / typecheck | 430 files error 0 / 全 6 workspace pass |
| build | Next.js + OpenNext Worker pass |
| 全テスト | 132 files / 1,691 tests pass |
| 共有 OIDC 集中テスト | 4 files / 64 tests pass |
| tenant isolation | 12/12 pass |
| secret scan | 484 files / findings 0 |
| schema drift | 4/4 pass |
| Worker bundle | gzip 1.230 MiB / 3.000 MiB |
| client bundle | 最大 116.3 KiB / 120.0 KiB |
| system plan | P01〜P13 exact 13 / violations 0 |
| system-spec | coverage + foundation pass / source citation pass |
| dev-graph | schema valid / source digest 4 checked・mismatch 0 |
| 文書 | line-limit 460 文書 pass / artifact placement pass |
| diff | `git diff --check` pass |

負例テストが出力する `AccessDenied`、`guardedWrite NG`、bundle 予算超過は、拒否・検出器が
本当に赤になることを確認する fixture の期待出力であり、suite の最終判定は pass である。

## 7. 500 行超の分割判断

手書きの新規テスト 2 ファイルが 656/527 行だったため、責務で 4 分割した。

- callback flow: 370 行
- credential / Workspace: 337 行
- state / provider config: 358 行
- policy / customer regression: 265 行

新規手書き文書・実装ファイルは 500 行以下。`0003_snapshot.json`（1,883 行）、
`system-spec/spec-state.json`、`.dev-graph/state/graph.json` は writer が管理する機械生成の
単一正本であり、分割すると schema・digest・migration lineage を壊すため例外とした。

## 8. 残課題・完了条件

- 予約 slug `shared` の登録時拒否は、将来の tenant 登録 API と同時に実装する。
- Worker secret の必須台帳化と Google Cloud の client/brand/domain verification は production rollout 時に行う。
- 顧客 credential の管理/rotation UI は `issue-auth-tenancy-customer-managed-google-oidc-20260729` の範囲。
- draft PR の merge と default branch reconciliation までは、Beads と dev-graph node を
  `in_progress` / active のまま維持する。merge 後に正規 sync して close する。

以上により、仕様影響判定、正本反映、設計・実装・検証・残課題の追跡可能性を受領する。
