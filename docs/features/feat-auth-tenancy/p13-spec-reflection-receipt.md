---
title: "SYS-AUTH-TENANCY-P13 仕様反映受領書"
layer: "feature-evidence"
feature: "feat-auth-tenancy"
graph_node_id: "sys-auth-tenancy-p13"
beads_ids:
  - "HarnessHub-15h.13"
  - "HarnessHub-x2x9"
  - "HarnessHub-fnej"
  - "HarnessHub-uk2i"
recorded_at: "2026-07-30T04:40:19Z"
status: "accepted"
---

# SYS-AUTH-TENANCY-P13 仕様反映受領書

## 1. 結論

本変更には**仕様・設計への影響がある**。次の3点が既存実装への接地だけではなく、
現行production rolloutの確定事項になったためである。

1. 本番対象をGoogle OIDCとHarnessHub 1テナントに限定した。
2. Google client secretの保管・受け渡し・実行時復号の信頼境界を確定した。
3. tenant別CSRF cookie/tokenを取得してからAuth.jsへnative form POSTする契約を確定した。

製品としてのrow-level tenant isolation、複数テナント回帰試験、将来の追加IdP対応は維持する。
したがって「現在の本番対象が1テナント」と「製品が単一テナント専用」は同義ではない。

## 2. 対象

| 種別 | ID |
| --- | --- |
| task | `SYS-AUTH-TENANCY-P13` |
| dev-graph node | `sys-auth-tenancy-p13` |
| 実行task | `HarnessHub-15h.13` |
| secret台帳修正 | `HarnessHub-x2x9` |
| 後続: 共通Google client | `HarnessHub-fnej` |
| 後続: 顧客持ち込みclient | `HarnessHub-uk2i` |

## 3. 正規フローの受領

ユーザーの2026-07-30最終レビュー指示を明示承認`appr-016`として記録し、
R4 reopen経由で次のセルを再確定した。

| 確定記録 | 正本 | 受領した契約 |
| --- | --- | --- |
| `qa-097` | `system-spec/auth.md` | Google/HarnessHub 1テナントの現行rollout、tenant別CSRF、native form遷移 |
| `qa-098` | `system-spec/security.md` | 1Passwordからmasked登録、DB暗号文、共通`ENCRYPTION_KEK`、fail-closed |
| `qa-099` | `system-spec/infrastructure.md` | 公開変数3件、必須Secret名5件、本番R1〜R5 |

canonical compilerで`system-spec/spec-state.json`と上記3章を再生成した。
その後、C02 writer（正規のgraph書き込み経路）で仕様・architecture・feature・task nodeを更新し、
source digestを再計算した。秘密値は正本、受領書、graphのいずれにも記録していない。

## 4. 反映先

| 層 | 反映内容 |
| --- | --- |
| `system-spec/` | auth / security / infrastructureの確定セルと状態 |
| `specs/` | 現行rollout、CSRF、credential custody、将来境界 |
| `architecture/` | backend処理、security信頼境界、infrastructure配備契約 |
| `features/` | production実装、本番R1〜R5、完了ポリシー |
| `tasks/` | P13の実行結果、G-01〜G-09、後続task |
| `docs/` | setup、onboarding、runbook、release証跡、secret台帳 |
| `apps/hub/` | CSRF取得form、native navigation、Wrangler配備契約、回帰試験 |

旧資料に残る「2テナント」「Microsoft Entra ID」等は、過去時点の記録または製品の将来契約である。
`release-record.md`では履歴節と現行判定節を明示的に分離したため、今回それらを履歴改変していない。

## 5. 検証受領

| ゲート | 結果 |
| --- | --- |
| 対象authテスト | 4 files / 25 tests pass |
| 全workspaceテスト（直列再実行） | 1,279 tests pass |
| tenant isolation | 12 tests pass |
| secret scan | 402 files / 0 findings |
| schema drift | 4 tests pass |
| task plan | P01〜P13、violations 0 |
| generation lineage | violations 0 |
| task projection rerun | 13 checked / missing 0 |
| system-spec coverage | final + foundation pass |
| source digest | 4 checked / mismatch 0 |
| Worker bundle | gzip 1.201 MiB / 3 MiB |
| sign-in client bundle | 109.0 KiB / 120 KiB |
| Wrangler deploy dry-run | pass |
| 文書line limit / placement / diff | pass |

`pnpm verify`は各assertionがschemas 86/86まで合格した後、Vitestの
`onTaskUpdate` RPC timeoutでexit 1となった。機能失敗との混同を避けるため、
全workspace testを直列で再実行し1,279件の合格を確認した。

旧`system-spec/completeness-report.json`を対象にした追加確認は
`dispatch.session_id`欠落で不合格となる。これは今回の確定章の欠落ではなく、
既存report形式の移行課題`HarnessHub-6ib`で追跡中である。

## 6. 文書分割判断

変更した手書き文書はすべて500行以下である。500行を超える
`.dev-graph/state/graph.json`と`system-spec/spec-state.json`は単一writerが管理する
機械生成の正本であり、分割するとschema・digest契約を壊すため分離対象外とした。

## 7. 残課題と完了条件

- `HarnessHub-15h.13`は実装・本番acceptance完了。ただしlinked PRのmergeと
  default-branch reconciliationまで`in_progress`を維持する。
- `HarnessHub-fnej`と`HarnessHub-uk2i`は将来のOAuth client方式を扱うためopenで継続する。
- `HarnessHub-x2x9`はsecret台帳と実装の一致を本変更で解消した。
- `HarnessHub-6ib`は旧completeness reportの`dispatch.session_id`移行として別管理する。

以上により、仕様影響の判定、正本への反映、設計・実装・検証への追跡可能性を受領する。
