---
title: "SYS-AUTH-TENANCY-P13 post-merge OIDC・owner認可ゲート 仕様影響受領書"
layer: "feature-evidence"
feature: "feat-auth-tenancy"
graph_node_id: "sys-auth-tenancy-p13"
beads_ids:
  - "HarnessHub-15h.13"
  - "HarnessHub-bda4"
recorded_at: "2026-07-30"
status: "accepted_with_external_action"
spec_impact: "none"
---

# SYS-AUTH-TENANCY-P13 post-merge OIDC・owner認可ゲート 仕様影響受領書

## 1. 結論

PR #612 の main 反映後、`hub-ci` run `30518334455` は DB 系の S1〜S3 を通過した後、
R2 操作用の `CLOUDFLARE_R2_API_TOKEN` が GitHub repository に未登録だったため失敗した。
自動 rollback は成功し、本番 Worker は直前 version へ復帰した。

今回の追補に**製品仕様・認証認可モデル・API・DB schemaへの変更はない**。
既に確定している次の契約を、CI と本番スモークへ fail-closed
（検査不能を合格にしない方式）で接地する変更だからである。

- `qa-097`: tenant別 provider / CSRF / native form POST / Google OIDC の開始フロー
- `qa-099`: deploy後に provider / CSRF / sign-in を実測し、失敗時に rollbackする
- `docs/security-spec-authorization.md` §3: `owner` はDBのbase roleではなく
  `projects.owner_user_id`との関係から合成し、tenant境界を先に判定する
- `qa-091`: Workers deploy tokenとR2 object操作tokenを最小権限で分離する

したがって `system-spec` の確定セルを R4 reopen せず、既存 `qa-091` / `qa-097` /
`qa-099` の実装証跡だけを追補した。この判断により、仕様正本をCI実装の詳細で
不用意に再定義しない。

## 2. 事故の原因と安全性

| 項目 | 記録 |
| --- | --- |
| 直接原因 | `secrets.CLOUDFLARE_R2_API_TOKEN` が未登録で、Wranglerへ渡る `CLOUDFLARE_API_TOKEN` が空だった |
| 通過済み | DB接続・schema、ULID、release不変性 |
| cleanup | 検証用tenantの残存行0件 |
| 復旧 | post-deploy smoke失敗を検知し、Worker rollback成功 |
| OIDCへの影響 | 既存本番での実ログイン/JIT証跡は維持。失敗runではOIDC自動試験がまだ存在しなかった |

## 3. 実装へ反映した契約

| 仕組み | 判定内容 |
| --- | --- |
| production deploy preflight | migration前に必要なsecret 5件・variable 2件の存在を確認し、値ではなく欠落名だけを出す |
| OIDC start-flow smoke | tenant provider、canonical callback、未知tenant 404、CSRF cookie/token、Google 302、`state`・`nonce`・PKCE S256 |
| G14 auth release contract | Auth.js callback、CSRF form、ownerを含む全action×role表、tenant分離、本番OIDC smokeを名指し実行 |
| rollback evidence | preflight、migration、deploy、health、OIDC smoke、DB/R2 smokeの各outcomeを記録する |

Googleアカウントへの実ログインは、人の資格情報をCIへ保存しないため自動化しない。
CIはauthorization endpointへ安全に遷移できるところまでを検査し、実ログイン/JITは
既存の本番R1証跡と運用時の手動E2Eで確認する。

追補CLIを現在のproduction originへ実走し、O1 provider/callback、O2未知tenant 404、
O3 CSRF cookie/token、O4 Google redirect/state/nonce/PKCEの4項目が合格した。

## 4. 所有者認可契約の受領

`owner` は `users.role` に保存しない。判定順序は
「tenant境界 → base role → 対象資源のowner関係合成」のまま維持する。
G14は次を専用ゲートとして固定する。

1. member / owner / workspace-admin / provider-admin の全action期待表
2. owner本人の許可と非ownerの拒否
3. 同じID表現でも別tenantならowner権限を合成しない
4. routeが共通認可wrapperを通り、session失効を迂回しない

## 5. 外部所有者アクション

repository側の契約は実装できるが、Cloudflareのaccount token発行はアカウント所有者の
権限境界である。ローカルWrangler OAuthでaccount token permission APIを読んだ結果は
HTTP 403であり、個人OAuth tokenをGitHubへ転用しない。

所有者はCloudflare Dashboardで、account-scopedの
`Workers R2 Storage Write`だけを持ち、Workers Scripts権限を持たない専用tokenを発行する。
値をログやコマンド履歴へ出さず、GitHub secret `CLOUDFLARE_R2_API_TOKEN`へ登録する。
登録後の完了証跡は `check-actions-secrets.mjs --live`で本secretの欠落が0件になることと、
mainの`hub-ci`完走である。他workflowの設定欠落は、それを所有するBeadsで別に判定する。

## 6. 反映先

- `docs/`: 本受領書、release record、infrastructure spec
- `features/`: P13 post-merge追補
- `specs/`: 既存確定契約と実装ゲートの対応
- `architecture/`: deploy前提検査・OIDC smoke・rollback順序
- `tasks/`: P13のmerge後事故と未完了の外部所有者アクション
- `system-spec/`: `qa-091` / `qa-097` / `qa-099` を再確認。意味変更がないため再生成なし

## 7. 検証

| ゲート | 結果 |
| --- | --- |
| production OIDC smoke | O1〜O4 pass |
| auth release contract | 5 files / 59 tests pass |
| Hub全テスト（single fork） | 57 files / 634 tests pass、coverage閾値pass |
| schema | 6 files / 86 tests pass |
| DB runbook結合（単独再実行） | 3 tests pass |
| lint / typecheck / Next build / Worker build | pass |
| secret / DDL / tenant coverage / connection isolation | pass |
| a11y | UI 30 + Hub 3 tests pass |
| Worker / client bundle | 1.201 MiB / 3 MiB、signin 109.0 KiB / 120 KiB |
| P13 task plan / lineage / projection | violations 0 / missing 0 |

rootの`pnpm verify`は高負荷のworkspace並列testで、DB runbook 1件とschema drift 2件が
timeoutしexit 1になった。各対象を単独で再実行すると全件passし、Hubはsingle forkで
634件passした。assertion不一致ではなく既知のVitest worker通知timeoutとして区別し、
集約コマンド自体を成功とは記録しない。

## 8. 文書分割判断

変更した手書きファイルはすべて500行以下である。本受領書も事故・仕様影響・外部境界を
単一責務で記録し、既存のP13仕様変更受領書とは分離した。
