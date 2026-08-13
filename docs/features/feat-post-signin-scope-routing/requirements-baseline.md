---
status: confirmed
layer: feature-design
---

# 要件ベースライン — feat-post-signin-scope-routing

> P01 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-01-requirements.md`
> feature context digest: `sha256:d2f1b1eafc3773a672b279d784dbe1fec10902d32a31643edd8d0bf8379cfcfb`
> QA trace: qa-135 (フロントエンドの着地先・scope 伝搬), qa-136 (Web 完結 UX), qa-137 (認可境界)

## 1. Purpose（目的）

サインイン（ログイン）自体は成功するのに、業務画面（`/sheets` `/catalog` 系）を通常のブラウザ操作で開くと `403 missing_tenant_scope`（テナント/ワークスペース情報が特定できず拒否される状態）になる不具合を、認可（アクセス許可の判定）の判定順と deny-by-default（既定は拒否、明示的に許可されたときだけ通す方針）を変えずに解消する。

原因は利用者の操作ミスではなく、既にデプロイ済みのコード同士の **結線欠落**（配線し忘れ）であり、次の3点に整理される。

1. サインイン後の戻り先が `/` に固定されている。
2. `/` は認証不要の稼働確認ページであり、業務画面ではない。
3. 通常のブラウザ遷移では、`authorize()`（認可判定関数）が要求する「テナント/ワークスペースの申告」を運ぶヘッダーが付与されず、scope（アクセス範囲）が解決できない。

## 2. Goal（完了状態）

scope の入力系統が2系統（明示ヘッダー / session の active tenant-workspace）に拡張され、かつサインイン後の着地先解決が結線されることで、業務画面6種（`/sheets`, `/sheets/new`, `/sheets/{sheetId}`, `/catalog`, `/catalog/releases`, `/catalog/{projectId}`）へ通常のブラウザ操作で到達できる状態。

## 3. Scope in（対応範囲、10件）

1. scope 解決の2系統: 明示ヘッダー（API・機械クライアント向け）と session の active tenant/workspace（ブラウザ通常遷移向け）を server 側で解決する。
2. 両方が存在して不一致なら `ambiguous_scope`（どちらとも決めがたい状態）で拒否し、どちらかを黙って優先しない。
3. 両方とも存在しない場合は従来どおり `missing_tenant_scope` とする（deny-by-default の非退行 = 後退させない）。
4. 両経路を同一の `authorize()` へ収束させ、判定を二重実装しない。
5. session への active workspace 束縛（今どのワークスペースを使っているかの紐付け）と、切替のたびの所属再検証。
6. サインイン後の着地先解決: `callbackUrl` の固定値 `"/"` を廃止し、遷移元 path → 既定着地 `/dashboard` の順で解決する（appr-034 による後続更新）。
7. 既定着地を単一定数から解決し、画面ごとに散らさない。
8. 戻り先を同一 origin の相対 path のみに制限し、絶対 URL・スキーム付き・protocol-relative（`//` で始まる形式）は既定着地へ落とす（open redirect 防止 = 外部サイトへ誘導されるのを防ぐ）。
9. 戻り先の解決結果にも通常の `authorize()` を適用し、redirect を認可の迂回路にしない。
10. `/` の扱い: 未認証時は稼働確認表示を維持し、認証済み session がある場合は既定着地へ redirect する。

## 4. Scope out（対応範囲外、6件）

1. `authorize()` の判定順・role 判定・deny-by-default そのものの変更（owner=feat-auth-tenancy）。
2. catalog / sheets API 実装と DB schema の変更。
3. Workspace 選択画面の UI 実装（owner=feat-workspace-switch-ux）。
4. Web 公開ウィザードの導線（owner=feat-web-only-publish-journey）。
5. サイドバー9項目の段階表示契約の変更（docs/frontend-spec.md §10）。
6. Device Flow 確認コード制約の変更（現行維持）。

## 5. Acceptance（受入条件、8件）

1. 遷移元が無いサインイン成功で `/dashboard` に着地し、`/` に留まらない。
2. 戻り先に絶対 URL・スキーム付き・protocol-relative を与えても外部へ遷移せず既定着地へ落ちる。
3. 認証済み session で `/` を開くと既定着地へ redirect される。
4. 業務画面6種が通常のブラウザ操作で `403 missing_tenant_scope` にならない。
5. 明示ヘッダーと session scope が併存し不一致のとき `ambiguous_scope` で拒否される。
6. どちらの scope 入力も無い場合は `missing_tenant_scope` のままである（deny-by-default 非退行）。
7. principal（認証済み利用者を表すデータ）の所属検証を通らない workspace は session へ束縛されない。
8. 戻り先の解決結果に対しても `authorize()` が適用される。

## 6. Quality constraints（品質制約、6件）

1. `authz-decision-order-and-deny-by-default-non-regression` — `authorize()` の判定順「public判定→認証→スコープ一意性→tenant一致→workspace所属」を変更しない。deny-by-default を後退させない。
2. `scope-resolution-two-inputs-ambiguous-rejection` — scope 解決は明示ヘッダーと session の2入力を受け取り、不一致は `ambiguous_scope` として拒否する。
3. `session-active-workspace-binding-membership-revalidation` — session への active workspace 束縛は、都度 principal の所属一覧（workspaceIds）と照合し、所属を外れた値は無効化する（fail-closed = 疑わしきは拒否）。
4. `post-signin-landing-resolution-single-default-constant` — 既定着地 `/dashboard` は単一定数として定義し、複数箇所に重複定義しない。
5. `open-redirect-prevention-same-origin-relative-only` — 戻り先の検証は同一 origin の相対 path のみを許可する形で実装する。
6. `integration-fix-not-new-capability-cross-feature-boundary` — 本 feature は新機能を追加するのではなく既存実装間の結線を修正するものであり、`authorize()` の判定規則自体・業務画面本体・Workspace 選択 UI・Web 公開ウィザード導線には踏み込まない。

## 7. Cross-feature 境界と P02 必須解消事項

本 feature が所有するのは **scope 解決の入力系統** と **着地先解決の結線** に限られる。以下は本 feature の所有範囲外であり、P02（アーキテクチャ決定）で「どのファイル・どの関数がこの境界線を守るか」を明確にする必要がある未解決事項として引き継ぐ。

- `authorize()`（`apps/hub/src/middleware/authz.ts`）の判定順・role 判定・deny-by-default の枠組みは変更しない。P02 では「session 由来の入力をどこで合流させれば判定順を変えずに済むか」を確定する。
- session claims の型（`SessionClaims`、`@harness-hub/schemas` パッケージ）は P05 の Write scope 外であるため、P02 では「active workspace の状態をどこに保持するか（session claims 本体を変更せずに実現する設計）」を確定する。
- Principal 型（`apps/hub/src/shared/auth/index.ts`）も P05 の Write scope 外であるため、P02 では「Principal を変更せずに session 由来 scope を解決する経路」を確定する。

## 8. 参照情報

- System specification: `specs/harness-hub-post-signin-workspace-scope-addendum.md`（A節〜G節）, `system-spec/spec-state.json` qa_log（qa-135, qa-136, qa-137）
- Detailed authoritative source: `docs/frontend-spec.md`（サインイン後遷移とサイドバー段階表示）, `docs/user-journeys.md`（J1 サインイン後導線）, `apps/hub/src/middleware/authz.ts`（authorize の判定順）
- Architecture: `architecture/harness-hub-frontend.md`, `architecture/harness-hub-security.md`
- Dependencies: なし（P01 は本 package の起点 task）
