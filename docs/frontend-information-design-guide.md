---
status: accepted
layer: frontend-implementation-guide
feature: feat-hub-foundation
spec_refs: [spec-harness-hub-information-design-addendum]
reviewed_at: 2026-08-11
---

# 画面情報設計の手順とレビュー

## 中学生向けの説明

画面づくりで一番やりがちな失敗は、データベースの項目をそのまま表にして、あとから色をつけて「デザインした」ことにしてしまうことです。そうすると全部の文字が同じ大きさで並び、読む人はどこを見ればいいのか分からなくなります。

そうならないように、この文書は順番を決めます。まず「誰がどんな場面で何を終えたいか」を書き、次に必要な情報を選びます。ラベルや線を全部消すのではなく、入力欄には名前、密な表には区切り、初見の操作には文字付きアイコンというように、要素ごとに役割を判断します。残った情報へ大事さの順番をつけ、読みやすい形に加工してから並べます。

## 実装者向けの要点

規範は [画面情報設計追補](../specs/harness-hub-information-design-addendum.md)。本書はその適用手順であり、画面設計ではこちらから開始する。工程 7 で部品へ写像するときに [UI 基盤の使い方と検証](frontend-ui-foundation-spec.md) の shell / token / 状態表現 / 品質ゲートを適用する。

### 1. 工程順序 (FR-IDS-001)

```text
利用文脈 → 取捨 → 要素別意味判定 → グループ化 → 顕著度 → 表示加工
        → パターン選定 → 配置 → 機能追加 → 意味装飾
```

先に表を組むと思考が固定され、カード・フォーム・master-detail などの選択肢に戻れなくなる。表を選ぶ判断自体は正当だが、それは 7 番目の工程で根拠付きで行う。

「ここまで設計、ここからデザイン」と線を引かない。上の 10 工程はすべて設計であり、装飾はその最後の一手である。

### 2. 各工程で何をするか

| # | 工程 | 実際の作業 | 落とし穴 |
|---|---|---|---|
| 1 | 利用文脈 | role・場所・端末・並行作業・完了したいタスクを書く | 「管理者が使う」だけで task-mode / breakpoint を書かない |
| 2 | 取捨 | 項目と操作を列挙し、必須・補助・不要を根拠付きで分ける | DB の全列を「念のため」で残す、または利用タスクだけで業務上必須の監査情報を落とす |
| 3 | 要素別意味判定 | ラベル、線/余白、アイコン、画像、整列/反復の採否を個別に決める | いったん全ラベルを外す。フォーム label や表 header まで装飾扱いする |
| 4 | グループ化 | 利用者がひとまとまりと理解する単位へ分ける | 固定個数へ合わせるため、意味の違うものを混ぜる/同じものを分ける |
| 5 | 顕著度 | グループ間とグループ内に `lead / context / metadata` を振る | すべてを `lead` にする。逆に並列の主要判断を機械的に 1 件へ絞る |
| 6 | 表示加工 | 保存値を読める形へ変換する | クライアントで金額・KPI を再計算する (`BR-IDS-003` 違反) |
| 7 | パターン選定 | registry からタスク能力が合う候補を比較し、必要なら複合する | 固定四択に閉じる、または無選定で `DataTable` を置く |
| 8 | 配置 | 顕著度の高いものを自然な読み順の早い位置へ | CSS の `order` で読み順と視覚順序をずらす |
| 9 | 機能追加 | 操作・リンク・メニューをここで足す | 工程 1〜8 の前に機能を足して情報を押し出す |
| 10 | 意味装飾 | 押せる / 選択中 / 重要 / 危険 / 境界 / 反復を視覚化し、a11y を再検証する | 意味を持たない縞模様・影・角丸を足す、または必要な境界まで消す |

「利用文脈は 3 行」「グループは 2〜4」「`lead` は 1 件」「同じ顕著度は 5 件未満」のような数は、初期検討の heuristic (目安) には使えても受入条件にしない。画面の複雑性、並列する主要判断、利用テストの結果で超えてよい。WCAG contrast、tap target、確定済み breakpoint、性能 budget 等の品質下限だけはこの heuristic 化の対象外である。

### 3. 顕著度の作り方 (FR-IDS-006)

任意の px と色を新設せず、`packages/ui` の token の段だけで表現する。

| 顕著度 | 文字サイズ | 太さ | 色 | 使う場所 |
|---|---|---|---|---|
| `lead` | semantic heading / metric の強い段 | `fontWeightBold` | `text` | 画面の主対象、並列する主要数値、次の一手 |
| `context` | semantic body の標準段 | `fontWeightNormal` | `text` | 判断に必要な本文・通常属性 |
| `metadata` | semantic caption の補助段 | `fontWeightNormal` | `textMuted` | 補助属性、単位、メタ情報 |

`lead / context / metadata` は画面内情報の強弱であり、構築 phase P0〜P5、[frontend-responsive-mobile-spec](frontend-responsive-mobile-spec.md) §6.3 のレスポンシブパターン P1〜P10、Button の `primary` / `danger`、見出し level とは別軸である。`typographyTokens` の太さは 400 と 700 の 2 段しかないため、中間が欲しくなっても任意の 600 を足さず semantic size / color / spacing で作る。

状態の色は `docs/frontend-spec.md` §2.4 の状態語彙辞書だけを写像点とする。色だけで区別せず、必ずラベルか形を併記する (`FR-IDS-010`)。

### 4. 表示加工の許容範囲 (FR-IDS-008 / BR-IDS-003)

| 加工 | 例 | 可否 |
|---|---|---|
| 時刻の表現 | 「2026-08-04 14:30 JST」を可視表示し、「1 週間前」を補助併記 | 可 (`title` だけに絶対値を隠すのは不可) |
| enum → 日本語ラベル | `received` → 「受付」 | 可 (辞書経由のみ) |
| 単位の整形 | `120` → 「120 人」、`1440` 分 → 「24 時間」 | 可 |
| 識別子の短縮 | `HS-2026-000123` → `HS-…0123` + 可視 disclosure/copy で完全値へ到達 | 可 (`title` だけに完全値を置くのは不可) |
| 金額・削減額の算出 | `salary × hours × 係数` をクライアントで計算 | **不可** (SEC5。`estimate_json` / rollup の値だけを表示) |
| KPI の分母算出 | 完了率をクライアントで割り算 | **不可** (サーバ集計値。分母 0 は `0%` でなく `—`) |

判断の線は「読み方を変えるだけか、値そのものを作るか」である。前者は表示層、後者はサーバの責務。

### 5. 要素別の意味契約 (FR-IDS-003 / 004 / 013〜016)

| 要素 | 積極的に使う条件 | 省略できる条件 | a11y 契約 |
|---|---|---|---|
| 可視ラベル | form control、破壊/送信操作、状態・金額・日時・PII・略語、同形値が複数ある | 読み取り専用で周辺見出し・単位・形式から一意に分かり、利用テストでも誤読しない | 読み取り専用値は `dl/dt/dd` や表見出し等の意味構造、操作部品は accessible name を残す。placeholder・`title`・アイコンだけで代用しない |
| 余白 | 同じグループ内の弱い区切り、読みのリズム | 高密度比較や折返しで所属が曖昧になる場合は余白だけにしない | zoom/reflow 後も DOM の所属と見た目の所属を一致させる |
| 線 / surface | table row/column、密な比較領域、階層・状態・操作領域の境界 | 近接・見出しだけで所属が明確 | 操作部品の境界は 3:1。装飾線だけを意味の唯一の手掛かりにしない |
| アイコン | 種類の素早い認識、反復操作、状態/方向の補助 | 初見・破壊・送信・意味が定着していない操作ではテキスト併記 | accessible name、focus-visible、tap target。tooltip は補助のみ |
| 画像 / 図 | 対象識別、証拠、内容理解、比較がテキストより速い | 純粋な雰囲気づくり、内容と無関係 | 用途に合う alt、複雑図の同等表/本文、画像内文字へ依存しない、width/height 明示 |
| 整列 / 反復 | 同じ意味の値・状態・操作を走査/比較するとき | 意味の異なるものを見た目だけ揃えない | DOM 読み順と視覚順を一致させ、同じ操作の名前・位置・順序を反復する |

「削るほど良い」と「足すほど親切」はどちらも規則にしない。理解・比較・操作の手掛かりになる要素は積極的に使い、役割を説明できない要素だけを省く。

### 6. open-world 表示パターン台帳 (FR-IDS-002)

初期 registry は `table / card-collection / list / grid / form / wizard / timeline-stepper / board / chart+table / tree / master-detail`。全候補を毎回比較する必要はなく、タスクに必要な能力で絞った複数候補を比較する。たとえば「複数行の比較・ソート・一括選択」が要件なら table、「依存する入力を段階的に完了」が要件なら wizard と form、「全体傾向と正確な値」が要件なら chart+table を候補にする。

registry は閉じないが、中央 SSOT は [画面情報設計追補](../specs/harness-hub-information-design-addendum.md) の表示パターン台帳である。新しい pattern または hybrid は、まず情報設計シートへ次を追加して候補化する。

- stable な `pattern id` と owner
- 得意/不得意な task capability
- keyboard / screen reader / touch の契約
- wide / middle / narrow の変換と、変換後も保持する critical fields/actions
- fallback と、既存 pattern では足りない根拠

共通規範 owner は既存 pattern と重複判定し、同じ能力なら既存 id の variant へ統合する。異なる能力を持つ場合だけ、根拠・review trigger とともに追補の中央台帳へ追加する。中央台帳への昇格前は、他画面から再利用可能な pattern として参照しない。

### 7. PR チェックリスト

新画面、または情報設計を変える改修の PR では次を満たす。

- [ ] `docs/features/<feature>/information-design/<screen-id>.md` に情報設計シートがある (`FR-IDS-012`)
- [ ] `docs/screen-inventory.md` の当該 role / task-mode / breakpoint profile を参照した (`FR-IDS-011`)
- [ ] task capability に合う複数候補を registry から比較し、選定/複合の根拠を書いた (`FR-IDS-002`)
- [ ] ラベルを一律に外さず、可視ラベルが必要な要素と省略可能な読み取り専用値を意味契約で判定した (`BR-IDS-002`)
- [ ] `lead / context / metadata` が主要タスクの見つけやすさを作り、固定個数だけを根拠にしていない (`FR-IDS-005`)
- [ ] 強弱が token の段だけで構成され、任意 px / 任意色が増えていない (`FR-IDS-006`)
- [ ] 360 / 768 / 1280px で critical fields/actions と主要タスクの開始・完了・回復が保たれる (`FR-IDS-007`)
- [ ] 状態・系列が色単独で区別されていない (`FR-IDS-010`)
- [ ] 絶対日時と完全識別子を可視表示または操作可能な disclosure/copy で確認でき、`title` だけへ隠していない (`FR-IDS-008`)
- [ ] ラベル、線/余白、アイコン、画像、整列/反復の採否と意味を PR 説明に書いた (`BR-IDS-004`)
- [ ] narrow profile でも比較・ソート・選択・一括操作など必要な業務能力を別表現で維持した (`BR-IDS-005`)
- [ ] baseline と同じ代表タスクでタスク完了率・時間・誤操作/後戻り・最初の選択を比較した
- [ ] axe/token/DOM/VRT 等の machine gate と、意味理解/選定根拠の manual gate を別々に記録した

### 8. 適応型画面プロファイルの読み方 (FR-IDS-011)

画面 ID だけで「理解優先/密度優先」を決めない。同じ画面でも閲覧と管理、wide と narrow で `intent / density / pattern` は変わり得る。たとえば board を narrow で選択 stage の list へ変換しても、全 stage の件数、現在 stage、移動操作は保持する。個別画面の値はここへ書かず `screen-inventory` を参照する。

profile の軸は次のとおり。

| 軸 | 値 | 意味 |
|---|---|---|
| `role` | `public / member / owner / workspace-admin / provider-admin` 等 | 認可済み表示候補と操作範囲。UI で認可を再判定しない |
| `task-mode` | 画面ごとの安定した業務タスク名 | browse/manage/review/edit 等。1 画面に複数可 |
| `breakpoint` | `wide / middle / narrow` | responsive 数値は UI 基盤 token が正本 |
| `intent` | `scan / compare / compose / monitor` | 認識、比較、作成編集、経過確認のどれを主にするか |
| `density` | `comfortable / balanced / compact` | 余白と一画面情報量。機能削除の許可ではない |
| `pattern` | registry の pattern id または hybrid | その条件で採る表現 |

画面ごとの値は [screen-inventory](screen-inventory.md) の profile 表だけが正本である。本ガイドや feature 文書へ割当一覧を複製しない。

### 9. 情報設計シートの雛形

```markdown
# <画面 ID> <画面名> 情報設計シート

## 利用文脈
role / 場所 / 端末 / 並行作業 / 完了したいタスク

## 画面プロファイル
screen-inventory の profile 行を参照。重複記載せず、この変更で差分が必要なら inventory を先に更新

## 表示項目とグループ
| グループ | 項目 | 顕著度 (lead/context/metadata) | 表示加工 | 可視ラベル | accessible name/description |

## pattern 選定
| 候補 / hybrid | 必要 task capability への適合 | 弱点 | a11y/fallback | 判定 |

## 削った情報
項目 — 削れる理由 (何から伝わるか)

## 視覚要素の意味契約
| 要素 (label/line/space/icon/image/alignment/repetition) | 採用/省略 | 伝える意味 | a11y 代替 |

## 成功指標と証跡境界
代表タスク / baseline / target / 実測。manual gate と current machine gate を分け、future gate は予定として記録
```

## 適用例: S11 ヒアリングシート一覧

同じ 9 項目から出発しても、工程順序を守るかどうかで結果が変わる。

**工程を飛ばした場合**: `status / HS コード / title / domain / department / people / hours / applicant / updated_at` を 9 列の表にし、全列を同じ大きさで並べ、行を縞模様にし、右端に「詳細」ボタンを置く。読む人はどの列を見るか毎回探す。

**工程を守った場合**: 利用文脈は「member が自分の申請の進み具合を、他の作業の合間に確認する」。`title` と `status` は `lead`、`HS コード` と `対象人数・月工数` は `context`、`domain / department / applicant / updated_at` は `metadata` にする。`updated_at` は「2026-08-08 14:30 JST (3 日前)」と絶対値 + 補助相対値で表示する。wide profile は既存仕様どおり table、narrow profile は card-collection を選び、どちらも filter・検索・完全値・詳細導線を保つ。状態 Badge、カード/行の押せる手掛かり、項目の所属を示す整列と余白を使い、密な table で所属が曖昧なら罫線も使う。縞模様は行追跡の実測改善がない限り入れない。

現行の `docs/frontend-spec.md` §3.2 は S11 のデスクトップを 6 列 table、モバイルを [frontend-responsive-mobile-spec](frontend-responsive-mobile-spec.md) §6.3 のレスポンシブ変換パターン `P3` による card-collection と定めている。この `P3` は情報顕著度ではない。本追補は確定済みの表現を変えず、**role / task-mode / breakpoint と選定根拠を伴って同じ結論へ到達すること**を求める。profile の値は `screen-inventory` だけへ記録する。

## 関連文書

- 規範追補: [specs/harness-hub-information-design-addendum.md](../specs/harness-hub-information-design-addendum.md)
- 部品契約: [docs/frontend-ui-foundation-spec.md](frontend-ui-foundation-spec.md) / [specs/harness-hub-ui-foundation-addendum.md](../specs/harness-hub-ui-foundation-addendum.md)
- 詳細正本: [docs/frontend-spec.md](frontend-spec.md) §2.4 状態語彙辞書 / §3.3 状態表示、[frontend-responsive-mobile-spec.md](frontend-responsive-mobile-spec.md) §6.3 レスポンシブ変換パターン
- 画面台帳: [docs/screen-inventory.md](screen-inventory.md)
- architecture: [architecture/harness-hub-frontend.md](../architecture/harness-hub-frontend.md)
