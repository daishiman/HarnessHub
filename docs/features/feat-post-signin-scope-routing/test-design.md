# P04 テスト設計

対象: `HarnessHub-3sjj.4`。テストは実装と同じ契約を直接検査する。

| ID | 入力 | 期待値 | 実装テスト |
| --- | --- | --- | --- |
| T-LANDING-01 | `returnTo` なし | `/sheets` | `post-signin-landing.test.ts` |
| T-LANDING-02 | absolute / scheme / `//` / `/\\` | `/sheets` | 同上 |
| T-ROOT-01 | 有効 session で `/` | `/sheets` redirect | `home-page.test.tsx` |
| T-SCOPE-01 | cookie ありの browser route | principal tenant で許可 | `authz-session-scope.test.ts` |
| T-SCOPE-02 | header と session が不一致 | `ambiguous_scope` / 403 | 同上 |
| T-SCOPE-03 | API / Bearer / cookie なし | `missing_tenant_scope` / 403 | 同上 |
| T-WORKSPACE-01 | 非所属 workspace cookie | `null` | `active-workspace-cookie.test.ts` |

この表は acceptance 8 件を少なくとも 1 つのテストで覆う。既存 tenant-isolation と auth gate も回帰検査として併用する。
