---
status: recorded_no_spec_change
layer: feature-spec-reflection
beads_id: HarnessHub-6o0r
dev_graph_node_id: issue-hub-catalog-scope-unreachable-20260802
reviewed_at: 2026-08-03
---

# `/catalog` 通常ハードナビゲーション確認の仕様反映受領書

## 判定

仕様・設計への**新規の影響はなし**。今回確定したのは、既存の通常 session が
tenant/workspace scope を持たずに `/catalog` へ遷移すると `403 missing_tenant_scope` になる、という
既存の deny-by-default（既定拒否）契約の実測である。認可規則、route、API、データ、CWV probe の実装は変更していない。

## 照合結果

- `system-spec/`: 変更なし。`auth.md` / `security.md` qa-133 は、署名済み `__cwv_probe` が固定 scope の catalog read だけを許可し、任意の query/header で権限を上げない既存契約を既に定める。
- `specs/`: 変更なし。今回のテストはその既存契約を変更せず、通常 session の経路との差を確認するだけである。
- `architecture/`: 変更なし。`architecture/harness-hub-security.md` の CWV probe 境界と矛盾しない。feature ADR は「RSC の query は表示用で認可判断ではない」こと、および probe が通常経路の例外ではないことを明確化した。
- `features/`・`tasks/`: 変更なし。一般利用者向けの公開経路を追加しておらず、P01〜P13 の契約・完了状態を変えない。
- `docs/`: ADR、issue 証跡、本受領書、実 middleware を通す回帰テストを更新した。

## 検証

`pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web/catalog-hard-navigation-scope.test.ts` で、通常 session の query あり/なしの 403 と、path/header の scope 解決規則を検証する。CWV bootstrap の到達性・URL ticket 除去・read-only 制限は、既存の `apps/hub/tests/security/middleware-entry.test.ts` を正とする。

## 残課題

`/catalog` を一般利用者へ公開する場合は、query の信頼、canonical path、または session-bound bootstrap のどれを採るかを別タスクで決定する。その変更は単一認可層に影響するため、system-spec の R4 reopen、ADR 改訂、受領書、関連する feature/task projection を同じ変更で行う。CWV probe の再利用は計測 credential の最小権限境界を壊すため対象外とする。
