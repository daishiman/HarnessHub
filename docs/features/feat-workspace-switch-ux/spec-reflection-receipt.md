---
title: "feat-workspace-switch-ux 仕様反映受領書"
layer: "feature-evidence"
feature: "feat-workspace-switch-ux"
graph_node_id: "feat-workspace-switch-ux"
beads_ids:
  - "HarnessHub-f91a"
recorded_at: "2026-08-10"
status: "accepted_with_release_pending"
---

# feat-workspace-switch-ux 仕様反映受領書

## 結論

今回の変更は **仕様・設計への影響あり**。サインイン後に解決済みの Workspace scope を
利用者が認識・切替できるようにし、scope 未解決時に 403 の生値で行き止まりにしない
回復導線を共通シェルへ常設した。scope 解決規則そのもの（`authorize()`）は
`feat-post-signin-scope-routing` の所有のまま変更していない。

## 正規フローでの反映判定

| 層 | 判定 | 記録または反映内容 |
| --- | --- | --- |
| `system-spec/` | 変更なし（製品契約） | qa-135/136 の選択・切替前提は既存。testing-qa の smoke 周辺のみ stmx 連動で更新。 |
| `specs/` | 更新 | `harness-hub-post-signin-workspace-scope-addendum.md` C 節に server-only 切替・中間文書・安全 returnTo を追記。 |
| `architecture/` | 更新 | `harness-hub-frontend.md` に WorkspaceSwitcher の server-only 境界と旧 scope 非表示を追記。 |
| `features/` | 更新 | `features/feat-workspace-switch-ux.md` の受入進捗を実装済みへ更新。 |
| `tasks/` | 変更なし | exact-13 package 未生成の macro epic。 |
| `docs/` | 更新 | `frontend-spec.md` 共通シェル、本受領書。 |

## 実装の要点

- UI: `packages/ui/src/shell/WorkspaceSwitcher.tsx`（server component + details + anchor）
- 結線: `ShellHeader` / HubShell / layout 経由で desktop・mobile に常設
- 切替受け口: `/signin/workspace` が cookie 設定後、scope なし中間文書 → meta refresh
- 回復: `deny-navigation` / `screen-states` の ErrorState が同じ回復文言と導線を共有
- 所属 1 件: 切替 UI 非表示（現在値表示のみ）

## 品質ゲート受領 (MVP 最小)

| ゲート | 結果 |
| --- | --- |
| UI shell.test（WorkspaceSwitcher 含む） | PASS（34 tests、axe 含む） |
| workspace-switch-ux / shell-identity / workspace-entry | PASS（Hub focused 314 tests に含む） |
| typecheck (ui / hub) | PASS |

## 残課題

- 本番反映と実ブラウザでの切替確認は epic close 前に別途
- multi-workspace 実アカウントでの目視は最小限で可（MVP）

## 500 行制約

`WorkspaceSwitcher.tsx` 135 行、関連テスト 174 行。分割不要。

## 2026-08-13 追補 (開閉専用 client island)

- **仕様影響あり (reflected)**: server-only 文言を server-first に更新。切替は document 遷移のまま、
  外側クリック・Escape・排他開閉だけを `TransientDisclosure` が担う。
- 反映先: `features/feat-workspace-switch-ux.md`、`specs/harness-hub-post-signin-workspace-scope-addendum.md`、
  `architecture/harness-hub-frontend.md`、`docs/frontend-spec.md`、本メモ、
  [統合受領書](../feat-hub-foundation/ui-disclosure-empty-state-20260813-spec-reflection-receipt.md)。
- graph node: `issue-ui-disclosure-empty-state-20260813` / Beads: `HarnessHub-0wj9`（関連 epic `HarnessHub-f91a`）
