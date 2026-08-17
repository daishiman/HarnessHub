---
status: current
layer: information-design
surface: S18.SYSTEM
route: /settings/system
---

# S18.SYSTEM 配色の採用状況

provider-admin が、全テナントを横断した配色の人数と構成比だけを見る画面。
個人は特定しない。導線はサイドバー「システム」。認可の正本は `appearance.usage_read`。

## 画面プロファイル

Surface: `S18.SYSTEM` / route: `/settings/system`。role、task-mode、density、wide/middle/narrow pattern、sticky policy は `docs/screen-inventory.md` の同 surface 行だけを正本とする。個人を特定しない集計だけを出すため、行あたりの単位は「利用者数」であって利用者そのものではない。

## pattern 選定

| 候補 / hybrid | 必要 task capability への適合 | 弱点 | a11y/fallback | 判定 |
|---|---|---|---|---|
| chart+table | この画面の問いは「どの配色が多いか」という**構成比**なので、ドーナツで割合の形を掴み、人数と構成比の実数は表から読む | 縦に長い | グラフの値は必ず同じ Panel の表にもある (グラフだけが数値の唯一の出口にならない) | **採用** |
| table のみ | 5 配色の大小は読めるが、「過半か拮抗か」の形が数字の比較になる | — | — | 不採用 |
| chart のみ | 人数の実数が読めない。母数の小ささ (計測率) を見落とす | — | — | 不採用 |

narrow では「配色 × 明るさ」の表だけをカードへ畳む (`narrowAs="card-collection"`)。行数が最も多く、狭い画面で横へはみ出すのがこの表だけであるため。
