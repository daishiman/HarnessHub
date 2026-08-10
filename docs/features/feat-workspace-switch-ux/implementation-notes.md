---
title: "feat-workspace-switch-ux 実装メモ (MVP)"
status: "active"
layer: "feature-evidence"
feature: "feat-workspace-switch-ux"
graph_node_id: "feat-workspace-switch-ux"
beads_ids:
  - "HarnessHub-f91a"
recorded_at: "2026-08-10"
---

# 実装メモ — Workspace 切替 UX (MVP)

## コンポーネント境界

| 層 | 所有 |
| --- | --- |
| `packages/ui` WorkspaceSwitcher | 見た目と server-only 操作（details + a） |
| `apps/hub` workspace-switcher-items / resolve-shell-props | 所属一覧・現在値・returnTo の組み立て |
| `/signin/workspace` | cookie 書込 + 中間文書 + 安全 returnTo |
| deny-navigation / screen-states | scope 不足の回復文言（403 非露出） |

## 切替シーケンス

1. 利用者が切替リンクを押す（GET、CSRF 不要）
2. server が active workspace cookie を更新
3. scope 業務データを含まない intermediate HTML を返す（meta refresh）
4. ブラウザが returnTo（同一 origin 相対 path のみ）へ進む
5. 新 scope の RSC が描画されるまで旧 scope の一覧・詳細は出ない

## テスト配置

- `apps/hub/src/__tests__/workspace-switch-ux/`
- `packages/ui/src/shell/shell.test.tsx`
- `apps/hub/tests/routing/workspace-entry.test.ts`
