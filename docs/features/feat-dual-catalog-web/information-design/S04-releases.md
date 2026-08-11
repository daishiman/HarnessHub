# S04 Release 履歴 情報設計シート

## 利用文脈

member 以上 (current は閲覧のみ)。「いま動いている版はどれか」「いつ何を出したか」を確かめ、**過去の版どうしを見比べる**ことが目的。rollback は owner 以上の planned capability だが、現行 route に操作面は無い。端末は wide が主。

## 画面プロファイル

Surface: `S04.RELEASES` / route: `/catalog/releases`。role、task-mode、density、wide/middle/narrow pattern、sticky policy は `docs/screen-inventory.md` の同 surface 行だけを正本とする。current は read-only table / card-collection で、master-detail と rollback は実装済みと扱わない。

## 表示項目とグループ

| グループ | 項目 | 顕著度 | 表示加工 | 可視ラベル | accessible name/description |
|---|---|---|---|---|---|
| 識別 | 版 | (見出し) | そのまま | 列見出し「版」 | — |
| 判断 | 状態 | lead | `StatusChip domain="release"` | 列見出し「状態」 | チップの語が読み上げ名 |
| 経過 | 作成日時 | context | `formatDateTime` (JST 固定・時計名つき) | 列見出し「作成日時」 | — |
| 照合 | 内容の指紋 | metadata | `IdBadge`。省略表示のまま、開くと全文 | 列見出し「内容の指紋」 | 「内容の指紋: <全文>」 |

指紋 (digest) を `metadata` に置くのは、読む値ではなく**照合する値**だからである。名前と同じ大きさで並べると「読むもの」に見え、行の意味が指紋に引っ張られる。

## pattern 選定

| 候補 / hybrid | 必要 task capability への適合 | 弱点 | a11y/fallback | 判定 |
|---|---|---|---|---|
| table (wide/middle) | 版を縦に並べ、日時・状態・内容の指紋を突き合わせられる | 列が増えると narrow で溢れる | `stickyHeader`。指紋は `IdBadge` で幅を持たせない | **採用** |
| card-collection (narrow) | 1 版ずつ読める。順序 (新しい順) はカードの縦の並びに残る | 版どうしの比較はできない | 状態を lead、作成日時を context に置き、読む順を保つ | **採用** |
| timeline-stepper | 時系列の見せ方としては自然だが、状態と指紋を同時に載せられない | — | — | 不採用 |

## 削った情報

- **リリースノート本文** — current route には表示しない。将来、詳細 route または master-detail を承認するときに、その detail 側へ置く。
- **公開者** — 履歴の照合には版と日時で足り、誰が出したかは監査ログ (S06) の担当。
- **サイズ・ダウンロード数** — 戻す判断に使わない。

## 視覚要素の意味契約

| 要素 | 採用/省略 | 伝える意味 | a11y 代替 |
|---|---|---|---|
| label | 採用 | 列見出し。カードでも項目名を残す | `<th scope="col">` |
| line | 採用 | 行の境界のみ | — |
| space | 採用 | `compact`。版が縦に多数並ぶため 1 行を詰める | — |
| icon | 省略 | 状態はチップの語で伝わる | — |
| alignment | 採用 | すべて先頭揃え。数値列を持たない | — |
| repetition | 採用 | 状態チップの語彙と色は `StatusChip` の `release` domain が唯一の持ち主 | — |

## 成功指標と証跡境界

- 代表タスク: 「いま stable な版と、その 1 つ前の版を特定する」。
- machine gate (現行): a11y テスト、`IdBadge` が全文を DOM に残すこと (`packages/ui/src/components/IdBadge.test.tsx`)、日時が JST 固定であること (`apps/hub/tests/ui-foundation/datetime-format.test.ts`)。
- manual gate: 指紋を開いてコピーした値が、そのまま照合に使えること。
- future gate (予定): rollback の製品承認後にだけ、到達までの操作回数を定義する。
