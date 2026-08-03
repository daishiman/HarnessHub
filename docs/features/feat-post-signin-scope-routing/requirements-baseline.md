# P01 要件ベースライン

対象: `feat-post-signin-scope-routing` / Beads `HarnessHub-3sjj.1`。

## 目的

認可規則を緩めず、サインイン成功後に通常のブラウザ操作が `missing_tenant_scope` で止まる結線欠落を解消する。

## 確定要件

- 明示 header は API・機械クライアント用、検証済み session はブラウザ画面用の scope 入力とする。
- 不一致は `ambiguous_scope`、入力なしは `missing_tenant_scope` とし、既定拒否を維持する。
- active workspace は principal の所属を毎回確認してから採用する。
- 戻り先は安全な相対 path のみ許可し、既定着地は `/sheets` の単一定数とする。
- 認証済みの `/` は既定着地へ redirect し、未認証時の稼働状況表示は維持する。

## 受入・品質境界

8 つの acceptance（既定着地、外部 redirect 拒否、root redirect、業務画面到達、不一致拒否、入力なし拒否、所属検証、redirect 後の認可）を P04–P07 で検証する。判定順、role 判定、業務画面 API、Workspace 選択 UI は scope 外である。
