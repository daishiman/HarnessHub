---
status: accepted
layer: frontend-implementation-guide
feature: feat-hub-foundation
spec_qa_refs: [qa-204, qa-206, qa-207]
reviewed_at: 2026-08-08
---

# UI 基盤の使い方と検証

## 中学生向けの説明

Web 画面を「毎回ちがう材料で作る」のではなく、同じレゴ部品で作れるようにした。ヘッダー、本文の幅、メニュー、カード、色、余白を共通部品にし、読み込み中・ページが無い・権限が無いときも同じ伝え方をする。

さらに本物の Chrome で、小さい画面・中くらいの画面・大きい画面を開く。ボタンが小さすぎないか、右側が画面の外へはみ出していないか、見た目が前回から勝手に変わっていないかを自動で確認する。

## 実装者向けの要点

### 0. 部品を選ぶ前に情報設計を済ませる

本書は *どの部品を使うか* と *その部品へ何を載せ、何を削り、何を強調するか* の共通指針である。画面ごとの根拠は `docs/features/*/information-design/*.md`、profile 割当は [screen-inventory](screen-inventory.md) が SSOT。

- 工程順序は「利用文脈 → 取捨 → 要素別意味判定 → グループ化 → 顕著度 → 表示加工 → パターン選定 → 配置 → 機能追加 → 意味装飾」の 10 工程。`DataTable` や `Panel` を置くところから始めない。
- 画面内の情報顕著度は `lead / context / metadata`。構築 phase P0〜P5、screen inventory の wide / middle / narrow pattern、Button variant と別語彙であり、`typographyTokens` / `colorTokens` / spacing token の段だけで表す。
- 視覚ラベルを一律に外さない。form control、初見/破壊操作、状態・金額・日時・PII・略語は可視ラベル/見出しを既定とし、読み取り専用で意味が一意な場合だけ根拠付きで省略する。placeholder、`title`、アイコンだけを label の代用にしない。
- 表現形式は open-world registry から選ぶ。初期値は table / card-collection / list / grid / form / wizard / timeline-stepper / board / chart+table / tree / master-detail で、必要なら hybrid/new pattern を登録する。
- 余白・線/surface・アイコン・画像・整列/反復は、グループ境界・認識・証拠・操作の予測可能性を高めるなら積極採用する。意味を説明できない縞模様・影等は足さず、必要な境界を「装飾だから」と消さない。
- role / task-mode / breakpoint ごとの profile 割当は [screen-inventory](screen-inventory.md) だけを正本とし、狭幅への変換でも critical fields/actions と業務能力を維持する。

#### Route surface を閉じる手順

1. 実 route 1 つに `current` surface ID を 1 つ割り当てる。同一 journey の一覧・新規・詳細・編集は別 surface variant とする。
2. role / task-mode / density / wide / middle / narrow / sticky policy は `docs/screen-inventory.md` にだけ書く。sheet に値を複製しない。
3. 各 sheet は `Surface: <ID> / route: <path>` で逆参照し、表示項目、ラベル、pattern 選定理由、削除情報、machine/manual gate を記録する。
4. current 行の information-design sheet と test evidence は実在させる。future route、modal化、role 変更は `planned` 行と Decision ref に分ける。
5. `tests/specs/test_screen_inventory_closure.py` で、実 route ↔ current 行 ↔ sheet ↔ evidence の全単射と参照実在性を検査する。

### 1. 画面骨格

新しい業務画面は、原則として次の順に組み立てる。

```tsx
<HubShell scope={scope} accountName={name} accountRole={role}>
  <ScreenHeader title="画面名" actions={<ActionLink href="/new">新規作成</ActionLink>} />
  <Panel title="情報のまとまり">内容</Panel>
</HubShell>
```

- `(dashboard)` / `(workspace)` layout の `HubShell` が skip link、header、main landmark、sidebar、mobile tab、footer を所有する。
- 公開画面は `PublicShell` を使い、root layout 自体は `main` を持たない。
- 画面側は `ScreenHeader` と `Panel` を組み合わせ、色や任意 px を増やす前に token / primitive で表現できるか確認する。
- navigation は実在 route と active session role から投影し、role 未確定時は管理者用リンクを表示しない。

### 2. token と breakpoint

| 項目 | 正本 |
|---|---|
| 色・余白・文字・密度 | `packages/ui/src/tokens/tokens.ts` |
| focus ring | `packages/ui/src/tokens/focus-ring.ts` |
| base CSS | `packages/ui/src/tokens/base-css.ts` |
| breakpoint | `breakpointTokens` (`480 / 641 / 1025`) |
| 角丸・影 | `radiusTokens` (frame 14 > card 10 > md 8 > sm 4 の 4 段 + `full`。旧 `lg` は token ごと削除済み) / `shadowTokens` (`frame` / `raised` の 2 種のみ) |

CSS の media query に px を直接増やさず、`mediaUp()` / `mediaDown()` または base CSS generator を通す。light / dark の文字色は 4.5:1、操作部品の輪郭は 3:1 を token test で確認する。`md 641` / `lg 1025` はデザインシステム §4 の 3 区分 (〜640 / 641〜1024 / 1025〜) の min-width 表現で、640/1024 を両方の向きに使うと 1px 分の帯が二重に当たるため 1 を足してある。`sm 480` は narrow 内の layout step であり、区分を 4 つに増やす意味は持たない。色は「無彩色で構造・有彩色は状態」で、アンバー (`accent`) は**動作中**専用 (AI 専用色は持たない)。

### 3. 状態の選び方

| 状況 | 使用する表現 |
|---|---|
| データ取得中 | `LoadingScreen` |
| データが 0 件 | `EmptyState` と次の操作 |
| URL に対応するものが無い | `NotFoundScreen` |
| 403・権限不足 | `ForbiddenScreen` |
| 予期しない例外 | `ErrorScreen` |

403 を「もう一度サインイン」に変換しない。権限不足は再認証で解消しないため、ループではなく管理者への依頼導線を示す。

### 4. overlay と取り消せない操作

- 閲覧・編集の重なりには `Modal`、モバイルの操作面には `BottomSheet` を使う。どちらも focus trap、Esc、focus 復帰、scroll lock を共有する。
- これらは既定で背景クリック・Escape・閉じる操作から閉じる。未保存の入力を持つ場合は
  `dismissible=false` とし、保存または破棄確認を伴う明示操作以外では閉じない。
- 実行確認、とくに削除・再生成・下書き破棄には `ConfirmDialog` を使い、`reversible` で取り消せるか必ず表示する。
- ボトムタブの「その他」、Workspace 切替、アカウントメニューは modal ではなく
  `details/summary` disclosure。背景を遮らないため focus trap は使わず、標準 Tab 順を保つ。
  一時的な navigation disclosure は同時に 1 つだけ開き、外側クリック・Escape・別 disclosure の
  開始で閉じる。Escape では開閉元へフォーカスを戻し、外側クリックではクリック先から
  フォーカスを奪わない。本文中の `details`（長文の開閉）はこの排他契約の対象外とする。

### 5. 表と狭い画面

`screen-inventory` の narrow profile が `table` を維持する場合は列を無理に潰さず、`DataTable` の局所スクロール容器で受け止める。profile が `card-collection` / `list` へ変換する場合も、critical fields、filter、sort、selection、一括操作、完全値への到達を別表現で維持する。`document.documentElement.scrollWidth` が viewport を超える状態は不合格である。折り返せない URL や長い識別子も実ブラウザ fixture に含める。

### 5-1. 選んだ型を部品へ写す

**どの型を選ぶかはここでは決めない。** 表現形式は §0 の open-world registry (table / card-collection / list / grid / form / wizard / timeline-stepper / board / chart+table / tree / master-detail、必要なら追加登録) から能力で比較して選び、画面ごとの割当は [screen-inventory](screen-inventory.md) の profile だけを正本とする。

以前ここには「読み手のふるまい 4 種 → 部品 1 つ」の決定表を置き、上から当てて最初に当たったものを採る形にしていた。これは 2 つの点で誤りだったので撤回する。

- **候補を 4 つに閉じていた。** registry は 11 件あり、`master-detail` や `board` のように 4 択のどれにも当たらない型を選ぶと「表でも カードでもないから仕様違反」に見えてしまう。型は閉じた選択肢ではなく、能力 (比較・絞り込み・選択・一括操作・完全値への到達) を満たすかで比べるもの。
- **最初に当たったものを採る、という順序規則を持っていた。** 同じ画面が複数の条件に当たるのは普通で、そのとき「上に書いてある条件が勝つ」ことに根拠がない。実際には role・task-mode・幅ごとに違う型が要る (screen-inventory が profile を 3 つに分けて持っているのはこのため)。

型が決まったあと、それを部品へ写すときの決めごとだけをここに置く。

| registry の型 | 使う部品 | 写すときの注意 |
|---|---|---|
| table | `DataTable` | 列見出しを sticky にする (`stickyHeader`)。行数が画面高を超えるとどの列か分からなくなる |
| card-collection | `DataTable narrowAs="card-collection"`、または `DataCard` を `CardGrid` へ | 同じ一覧を幅で切り替えるなら前者。表とカードを別々に書き起こさない |
| chart+table | `KpiCard` / 各 chart + `DataTable` | 図と表で同じ数字を出す。片方だけ更新される書き方をしない |
| 単一対象の属性列挙 (registry の型を選ぶ前段) | `DefinitionList` | 生の `<dl>` を画面側に書かない。余白・区切り・折り返しが画面ごとにずれる |

- **詳細画面 (`[id]`) に `DataTable` を置いてよい。** 「対象が 1 件だから表は不要」は、その画面に *1 件しか無いもの* しか無い場合にだけ成り立つ。詳細画面が持つ履歴・明細・関連一覧は、それ自体が複数行を見比べる対象なので表が正しい (例: リリース履歴)。対象そのものの属性を並べる箇所に表を使わない、というのが本来の意図だった。
- カードで出す一覧でも、並べ替えや比較の要求が出たら型を選び直してよい。その場合は screen-inventory の profile を先に直す (実装だけ変えると台帳と食い違う)。

### 5-2. 常時見えているべきもの

スクロールで画面外へ流れてよいのは**本文だけ**である。次の 3 つは常に見える。

1. **アプリのヘッダー** (`ShellHeader`) — 検索・通知・アカウント。既に `position: sticky`。
2. **画面のヘッダー** (`ScreenHeader sticky`) — 画面名・パンくず・主要アクション・**状態チップとスコープチップ**。状態とスコープは「いまどのテナントの、どの状態のものを見ているか」を示すため、本文をどれだけスクロールしても消えてはならない。チップは `ScreenHeader` の `tags` に渡す (裸の `<p>` に置かない)。
3. **フッター** (`ShellFooter`) — 規約リンク。`.hh-shell__body` を画面高に固定し、本文ペイン (`.hh-shell__main`) だけを縦スクロールさせることで実現する。

sticky の重なり順は ヘッダー 20 > 画面ヘッダー 15 > 表の列見出し 10 とし、`z-index` を画面側で直書きしない。

### 5-3. サイドバーの構造

`ShellSidebar` はフラットな一覧にせず、**グループ (見出し + 区切り線)** で分ける。グループは業務の言葉で命名し、実際の画面構成に対応させる。

| グループ | 含む画面 |
|---|---|
| 業務 | ヒアリングシート / 業務ツール / ドキュメント / 改善要望 |
| 分析 | ダッシュボード / パイプライン / 使用状況・削減効果 |
| 管理 | ユーザー管理 / アカウント設定 / 認証設定 / 見積係数設定 |

グループ見出しは、サイドバーが畳まれている幅 (md) では読み上げ専用にし、区切り線だけを残す。

### 5-4. 画面の組み立ての型

全画面で同じ順に組む。逸脱するときは理由をコードコメントに残す。

```tsx
<ScreenHeader title="画面名" breadcrumbs={[...]} tags={<TagRow>...</TagRow>} actions={<ActionLink .../>} sticky />
<Panel title="情報のまとまり">…</Panel>
```

- 見出しは `ScreenHeader` が `<h1>` を持つ。画面側で生の `<h1>` を書かない。
- 操作は `Button` / `ActionLink` / `TextButton` を使う。生の `<button>` を置かない（§5-9）。
- 絞り込みフォームは `FilterBar` に入れる。画面ごとに `display: flex` を書き起こさない。
  「絞り込む」ボタンで確定する画面は `onSubmit` を渡し、帯そのものを `<form>` にする
  (外に `<form>`・中に `role="group"` と二重にすると、同じ名前のまとまりが 2 回読み上げられる)。
- 0 件・権限なし・未選択は必ず `EmptyState` で、**理由と次の操作**を 1 行ずつ出す。無言の空表を出さない。

### 5-5. 絞り込み・検索バーの共通仕様

絞り込みは画面ごとに形を変えない。以下を全画面で 1 つに固定し、実装は `FilterBar` 1 か所に持たせる。

| 決めごと | 唯一の作法 | 理由 |
| --- | --- | --- |
| ラベルの位置 | 入力欄の**上**（`FormField` が描く。`hideLabel` は使わない） | 横並びラベルは狭い画面で折り返し位置が画面ごとにずれる |
| 補足文言 (`description`) | 入力欄の**下**。表示しても他の要素の位置を動かさない | 補足を 1 行足すと隣のボタンだけ下がる、を構造で潰す |
| 整列 | grid。各欄の**上端**を揃える (`align-items: start`) | 下端合わせだと背の高い欄に引きずられる |
| 部品の高さ | 入力・セレクト・ボタンとも `--hh-control-height` | 3 種の高さが揃わないと帯が波打って見える |
| 確定の仕方 | **「絞り込む」ボタンで確定**。入力の変化での即時反映はしない | 打鍵ごとに結果が入れ替わると、打ち終わる前に画面が動く |
| ボタンの語彙 | 全画面「絞り込む」 | 同じ形の帯で操作名だけ違うと毎回読み直しになる |
| ボタンの置き場所 | `actions` prop（`children` に混ぜない） | ラベル 1 行ぶん下げて入力欄と頭を揃えるスロット |
| 適用中の条件 | `appliedChips` prop に渡し、帯の下段へチップで出す | 「いま何で絞っているか」を一覧側まで探しに行かせない |
| 位置 | ページ見出し (`ScreenHeader sticky`) の直下に置き、一緒に留める | スクロール後に条件を変えるため画面上端へ戻らせない |

寸法の実体は base 層 (`packages/ui/src/tokens/base-css.ts`) の `[data-hh-filter-bar]` / `[data-hh-field]` /
`[data-hh-filter-actions]` が持つ。ボタンの下げ幅 `--hh-field-label-offset` は
「ラベルの font-size × line-height + ラベル下余白」の式で、`FormField` のラベル指定と対で動く。片方だけ変えない。

### 5-6. 画面間の不揃い点検 (12 観点)

画面を足すとき・直すときは、次の 12 観点を機械的に確認する。ここで「画面ごとに書き起こす」判断をした
時点で不揃いが生まれるため、各観点の唯一の受け皿を決めてある。

| # | 観点 | 唯一の受け皿 |
| --- | --- | --- |
| 1 | ページ見出しの書式 | `ScreenHeader`（画面で生の `<h1>` を書かない。同じ役割の 2 つ目の部品は公開しない） |
| 2 | 説明文 | `ScreenHeader description` に 1 行。省略しない |
| 3 | 主要操作の位置と語彙 | `ScreenHeader actions`（見出しと同じ行。「新しく作成」等の語彙も揃える） |
| 4 | 絞り込み UI | `FilterBar`（§5-5） |
| 5 | 一覧の表現 | 型は §0 の registry から選び、割当は `docs/screen-inventory.md` の profile が正本。部品への写し方は §5-1 |
| 6 | 空状態 | `ListState` の `emptyTitle` / `emptyDescription` |
| 7 | 読み込み中 | `DataTable loading` と `LiveStatus`（件数は読み込み完了後だけ読み上げる） |
| 8 | エラー表示 | `ListState error`（取得失敗）／操作の失敗は操作の隣に `Alert` |
| 9 | 日時の書式 | 絶対表記は `formatDate` / `formatDateTime` (JST)。相対併記が要る箇所は `DateTimeText` だけを使う（画面ごとに相対計算を書かない） |
| 10 | ID の見せ方 | `IdBadge`（生の `<code>` や素の文字列で出さない） |
| 11 | ステータスバッジ | `StatusChip`（domain ごとの語彙と色は部品側が持つ） |
| 12 | ボタンの語彙 | 「絞り込む」「再試行する」「新しく作成」など、同じ意味に同じ語 |

観点 6・7・8 は 1 つの部品 `ListState` に集約してある。取得失敗・読み込み中・0 件・中身の 4 状態は
**排他**であり、画面側で「上にエラーバナー、下に空メッセージ」と並べない
（取得に失敗しただけなのに「0 件です」と読める状態を構造で潰す）。

### 5-7. 日時の相対併記 (`DateTimeText`)

- 相対表記は **絶対表記の置き換えではなく併記**。記録として日付を控える用途を壊さない。
- 上限は `RELATIVE_TIME_MAX_AGE_DAYS = 30` の 1 定数。画面ごとに変えない。
- 「昨日」の境目は経過 24 時間ではなく **JST のカレンダー日差**。
- 相対表記は描画後に足す（初回描画は絶対表記のみ）。サーバとブラウザの hydration 不一致を避ける。
- 自動更新（1 分ごとの書き換え）は一覧で行わない。開いた時点の相対表記で足りる。

### 5-8. 一覧検索 (`q`)

- ヘッダー検索は、一覧 API が `q` を **実際に処理する** route にだけ結線する。押しても効かない欄を置かない。
- 検索語の受け取りは `listSearchTermSchema`（空白のみ拒否・上限 200）。SQL の部分一致は
  `packages/db/repository/search.ts` の `containsTerm` / `containsTermInAny` に一本化し、
  LIKE の `%` / `_` を利用者入力として扱わない（ESCAPE）。
- 検索対象列は各 domain の query schema JSDoc が正本。placeholder 文言と一致させる。

### 5-9. 面と操作の共通部品（画面で style を書かないための受け皿）

色・角丸・影・breakpoint を画面が決めると、テーマ切替とコントラスト保証が「この画面のこのボタンだけ」
という形で部分的に壊れる。壊れ方が局所的なので目視では見つからない。次の対応表で必ず部品へ寄せる。

| 画面がやりたいこと | 使う部品 | 補足 |
| --- | --- | --- |
| 面を 1 段置く | `Card` / `Panel` | 角丸は `card` 段。画面側で `borderRadius` を書かない |
| カードの内側にもう 1 段（添付 1 件・目次・整形済みテキスト） | `Tile` | `dashed` は「まだ空・ここに置ける」、`tone="muted"` は補助情報 |
| 押せるもの | `Button variant` | `primary` / `secondary` / `danger` / `ghost` |
| 遷移するもの | `ActionLink variant` | `Button` と同じ style 定義を共有し、見た目が必ず一致する |
| 文章や表のセルに混ぜる小さな操作 | `TextButton tone` | 見た目はリンク・意味はボタン。`<p>` の中に置いても妥当な HTML |
| 画像のサムネイル | `Thumbnail size` | `inline` は一覧の行頭、`block` は詳細。`alt` の既定は空（装飾扱い） |
| 帯ではなくカードとして出す絞り込み | `FilterBar variant="card"` | 画面側で `borderRadius` を上書きしない |

**判断の順序**: 既存の部品で足りない → 画面で style を書く、ではなく → **部品に variant を足す**。
画面が視覚を触りたくなったら、それは部品の表現力不足という信号として扱う。
逸脱は CI ゲート `check:ui-hardcoding` (G17) が落とす。詳細は
[デザインシステム アーキテクチャ](../architecture/harness-hub-design-system.md) §1。

### 6. catalog と VRT

`apps/hub/tests/browser/catalog/entries*.tsx` に entry を追加するときは分類を付け、light / dark の両方で意味が通る fixture にする。1 ファイル 500 行を超えないよう、surface 群ごとに分ける。時刻・乱数・外部 API 応答など毎回変わる値を snapshot に入れない。

公開部品を足したら **必ず entry を追加する**。載せ忘れるとその部品だけが視覚回帰の網から静かに外れるため、
`tests/ci/catalog-coverage.test.ts` が `index.ts` と突き合わせて落とす。entry 名は公開部品名と完全一致させる。

VRT が落ちた場合は actual / diff を目で確認する。意図した変更なら対応 OS の baseline を更新し、意図しない変更なら実装を直す。CPU architecture 差だけで baseline を分けない。

## ローカル検証

```bash
pnpm --filter @harness-hub/ui typecheck
pnpm --filter @harness-hub/ui test
pnpm --filter @harness-hub/hub typecheck
pnpm --filter @harness-hub/hub run check:screen-states
pnpm --filter @harness-hub/hub exec vitest run tests/ui-foundation/relative-time.test.tsx tests/ui-foundation/screen-pattern-gate.test.ts
pnpm --filter @harness-hub/hub run test:browser
python3 -m pytest -q tests/specs/test_screen_inventory_closure.py
```

Chromium が未導入なら `pnpm --filter @harness-hub/hub exec playwright install chromium` を先に実行する。

## 初期 client JS の分割境界（2026-08-12）

- G13 の上限は route ごとに gzip 後 120 KiB。予算を上げず、重い client 画面本体を
  route-local `next/dynamic` へ分離する。
- `StickyHeaderOffset` は sticky filter/table を持つ画面だけが配置し、共通 shell から全 route へ配らない。
- 遅延分割は検査逃れに使わない。screen-pattern gate は通常 import と `import()` の両方を辿る。
- loading fallback は `aria-live="polite"` を持ち、データ取得・保存・認可の契約は分割前から変えない。

## 関連文書

- 規範追補: `specs/harness-hub-ui-foundation-addendum.md`
- route surface profile 割当 SSOT: `docs/screen-inventory.md`
- 画面ごとの情報設計と選定根拠: `docs/features/*/information-design/*.md`
- 画面 profile 割当 SSOT: `docs/screen-inventory.md`
- frontend 全体仕様: `docs/frontend-spec.md`
- 仕様反映受領書: `docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md`
- 共通シェル追補の受領書: `docs/features/feat-hub-foundation/hub-shell-page-surface-spec-reflection-receipt.md`
- 2026-08-12 UI MVP wave 受領書: `docs/features/feat-hub-foundation/ui-mvp-wave-20260812-spec-reflection-receipt.md`
