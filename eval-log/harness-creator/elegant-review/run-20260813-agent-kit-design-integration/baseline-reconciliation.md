# PR #721 baseline 統合判断

対象は、2026-08-13 に main へ統合済みの PR #721 と、本 review で検証した後続の未コミット差分である。
目的は「後から merge した側を偶然採用する」のではなく、同じデザイン領域の具体値と行動契約を明示的に選ぶことにある。

| 論点 | 判断 | 統合後の正本 | 根拠 |
|---|---|---|---|
| Graphite × Amber の役割 | keep | primary=操作、accent=実行中。モバイル下部タブのactive iconだけ明示例外 | ユーザー仕様と `jp-web-design` Mode A |
| Light/Dark/auto | keep | UI token + `UiProvider`。選択永続化とOS追従を維持 | PR #721 と後続差分が同じ契約 |
| breakpoint | replace | `sm=480`、`md=641`、`lg=1025`。帯は `〜640 / 641〜1024 / 1025〜` | min-width境界の二重適用を避け、ユーザー仕様の帯域を厳密表現 |
| 日本語書体 | replace | ヒラギノ角ゴ / 游ゴシック等のsystem font。IBM Plex Sansは英数字、JetBrains MonoはID・log | 和文Webフォントのpayloadと遅延切替を避ける。ユーザー仕様の日本語system fontに一致 |
| navigation現在地 | keep | PR #721 の最長一致resolverと回帰testを保持 | `/metrics` と `/metrics/usage` の二重現在地を再発させない |
| 角丸 | replace | frame 14 / card 10 / md 8 / sm 4 の有限4段 | ユーザー仕様の14/10/8を維持し、役割不明の12px段を廃止 |
| 色の具体値 | replace | 意味契約は原案、具体値はtoken contrast testを通る補正版 | light accent とborderStrongのAA/非文字contrast不足を解消 |
| UI部品集約 | replace | `TextButton`、`Thumbnail`、`Tile`、共通action/status表現 | 画面が色・角丸・影を再定義しない4層構造へ統一 |
| G17静的検査 | replace | `apps/<name>/src` 自動発見 + 新規app/複数行JSX/正常fixtureの毎回検査 | 新規appをfail-openにせず、検査器自身のlivenessも保証 |
| system-spec / specs / receipt | merge then update | PR #721で追加された正本を取り込み、上記の置換点だけ後続仕様へ更新 | 仕様履歴を失わず、具体値の三重帳簿を解消 |
| Linux VRT | defer | PR CIの既存画像を保持し、統合後のbrowser検証とCIを必須化 | ローカルmacOSでLinux baselineを偽生成しない |

この表にない PR #721 の変更は原則 keep とし、後続差分が同じファイルを変更する場合も、行動契約と回帰テストを落とさない。
