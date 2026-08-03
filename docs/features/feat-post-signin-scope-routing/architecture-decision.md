# P02 アーキテクチャ決定

対象: `HarnessHub-3sjj.2`。

| 決定 | 根拠 | 却下案 |
| --- | --- | --- |
| scope の合流点を `authorize()` に一本化 | 画面と API で判定がずれることを防ぐ | page ごとの個別判定 |
| active workspace は `hh_active_workspace` cookie から都度所属確認して採用 | JWT 再発行なしで即時切替を反映し、改ざん値を採用しない | workspace を無検証で JWT claim として信用 |
| 既定着地を `DEFAULT_LANDING_PATH` に集約 | `/` と `/sheets` の直書き drift を防ぐ | 各画面が独自に決定 |
| `returnTo` は安全な相対 path だけ許可 | open redirect を防ぐ | URL をそのまま callback URL に渡す |
| `/api/` と Bearer 要求に session scope を補完しない | 機械クライアントの明示 scope 契約を維持 | cookie があればすべて補完 |

path/header の相互不一致は従来どおり拒否する。path に明示した値は URL の宣言を優先し、session は path に無い項目だけを補完する。
