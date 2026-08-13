/**
 * 情報の並べ方を決める部品群。
 *
 * これまで各画面が「一覧はとりあえず表」「詳細はとりあえず生の `<dl>`」で書いていたため、
 * 余白・区切り・狭い画面での折り返しが画面ごとにずれていた。
 * どの型を選ぶかは specs/harness-hub-information-design-addendum.md の registry と
 * docs/screen-inventory.md の profile が正本で (この package は選定に関与しない)、
 * ここはその 4 つの型 (表 / カード / 定義リスト / KPI) のうち、
 * 表以外の 3 つと、それらを並べる器を実装する。
 *
 * すべて server component (`'use client'` を付けない)。ここに状態を持たせると
 * 全画面が client bundle へ載り、First Load JS 予算 (120KiB) を骨格だけで食い潰す。
 */
import type { CSSProperties, ElementType, FormEvent, ReactNode } from 'react';

import { colorVar, radiusVar, spaceVar, surfaceStyle, visuallyHidden } from '../internal/style.js';
import { type Salience, salienceStyle } from './salience.js';
import { screenHeaderStackEndInset } from './sticky-stack.js';

export interface DefinitionListItem {
  /** 項目名。業務の言葉で書く (API のフィールド名をそのまま出さない)。 */
  term: ReactNode;
  /** 値。未設定を表したいときは `—` ではなく「未登録」などの理由語を渡す。 */
  description: ReactNode;
  /** 値の下に小さく添える補足 (単位の説明・値の出どころなど)。 */
  hint?: ReactNode | undefined;
}

export interface DefinitionListProps {
  items: readonly DefinitionListItem[];
  /**
   * 広い画面での列数。既定 1。
   * 項目名が短く値も短いもの (種別・状態・版など) を並べるときだけ 2 にする。
   */
  columns?: 1 | 2 | undefined;
  /** 読み上げ用の名前。同じ画面に定義リストが 2 つ以上あるときに渡す。 */
  label?: string | undefined;
  /**
   * 値 (`<dd>`) の顕著度。既定は `context` (本文と同じ重み)。
   * 「見分けるためだけの値」を並べるなら `metadata`、
   * 「真っ先に読ませたい値」なら `lead` を渡す。
   * ラベル (`<dt>`) は段に関わらず常に metadata 相当のまま (値の手がかりでしかないため)。
   */
  salience?: Salience | undefined;
  style?: CSSProperties | undefined;
}

/**
 * ラベルと値を縦に積む定義リスト。詳細画面 (`[id]`) の属性表示はすべてこれに寄せる。
 *
 * 生の `<table>` で「ラベル: 値」を書いていた画面があったが、対象が 1 件なら
 * 比較相手がいないので列見出しが意味を持たず、狭い画面では横スクロールだけが増える。
 *
 * 列数の分岐は inline style に `@media` を書けないため CSS 変数 `--hh-dl-columns` へ逃がす。
 * 変数の実際の値 (狭い画面では常に 1 列) は base 層が持ち、ここはその変数を読むだけにする。
 */
export function DefinitionList({
  items,
  columns = 1,
  label,
  salience = 'context',
  style,
}: DefinitionListProps): ReactNode {
  return (
    <dl
      data-hh-definition-list={columns}
      data-hh-salience={salience}
      {...(label === undefined ? {} : { 'aria-label': label })}
      style={{
        display: 'grid',
        gridTemplateColumns: columns === 1 ? 'minmax(0, 1fr)' : 'var(--hh-dl-columns, minmax(0, 1fr))',
        gap: spaceVar(3),
        margin: 0,
        ...style,
      }}
    >
      {items.map((item, index) => (
        // 項目名は ReactNode なので key に使えない。並べ替えも差し込みも起きない静的な列なので index が唯一の安定 key
        // biome-ignore lint/suspicious/noArrayIndexKey: 上記のとおり
        <div key={index} style={{ minWidth: 0 }}>
          {/* ラベルは値の手がかりでしかないので、値の段に関わらず常に metadata 相当。
              行送りだけ tight にしているのは、ラベルが 1 行で終わる短い語だから */}
          <dt
            style={{
              ...salienceStyle.metadata,
              margin: 0,
              lineHeight: 'var(--hh-line-height-tight)',
            }}
          >
            {item.term}
          </dt>
          <dd
            style={{
              ...salienceStyle[salience],
              margin: `${spaceVar(1)} 0 0`,
              overflowWrap: 'anywhere',
            }}
          >
            {item.description}
            {item.hint === undefined ? null : (
              <span
                style={{
                  ...salienceStyle.metadata,
                  display: 'block',
                  marginBlockStart: spaceVar(1),
                }}
              >
                {item.hint}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface TagRowProps {
  children: ReactNode;
  /**
   * 読み上げ用の名前。既定は「状態とスコープ」。
   * チップは単体だと何の分類か分からないため、まとまりに名前を与える。
   */
  label?: string | undefined;
  style?: CSSProperties | undefined;
}

/**
 * 状態チップ・スコープチップを横に並べる帯。
 *
 * これまで各画面が裸の `<p>` にチップを直接置いていたため、本文をスクロールすると
 * 「いまどのテナントの、どの状態のものを見ているか」が画面外へ流れていた。
 * `ScreenHeader` の `tags` に渡すことで、sticky な見出し帯の中に留まる。
 */
export function TagRow({ children, label = '状態とスコープ', style }: TagRowProps): ReactNode {
  return (
    // biome-ignore lint/a11y/useSemanticElements: 状態チップの並びに対応する HTML 要素は無く、名前を持つ「ひとかたまり」だけが欲しいので role=group が最小
    <div
      data-hh-tag-row=""
      role="group"
      aria-label={label}
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spaceVar(2), ...style }}
    >
      {children}
    </div>
  );
}

/** 並べるものの大きさ。最小幅だけを決め、列数はブラウザに任せる (breakpoint を増やさないため)。 */
const cardGridMinWidth = {
  /** 数値を数個だけ大きく見せる KPI タイル */
  kpi: '200px',
  /** 一覧のカード */
  cards: '280px',
  /** グラフなど中身が横幅を要求するもの */
  wide: '320px',
} as const;
export type CardGridColumns = keyof typeof cardGridMinWidth;

export interface CardGridProps {
  children: ReactNode;
  /** 既定は `cards`。 */
  columns?: CardGridColumns | undefined;
  as?: ElementType | undefined;
  style?: CSSProperties | undefined;
}

/**
 * カード・KPI・グラフを敷き詰める器。
 *
 * `auto-fit` + `minmax` にしているのは、画面幅ごとに列数を書き分けると
 * breakpoint が部品の数だけ増えるため。最小幅だけ決めれば列数は自動で決まる。
 */
export function CardGrid({ children, columns = 'cards', as: Tag = 'div', style }: CardGridProps): ReactNode {
  return (
    <Tag
      data-hh-card-grid={columns}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${cardGridMinWidth[columns]}), 1fr))`,
        gap: spaceVar(4),
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

export interface DataCardProps {
  /** 一覧の 1 件の名前。`href` があれば見出しごとリンクになる。 */
  title: ReactNode;
  href?: string | undefined;
  /** 状態チップ・スコープチップ。見出しの上に置く (何であるかより先に、いまどうなっているかが要るため)。 */
  tags?: ReactNode | undefined;
  /**
   * 見出しの次に読ませる値 (`lead` 段)。**その 1 件に対する判断が変わる値だけ**を置く。
   * 表を狭い画面でカードへ畳んだとき、左寄りの重要な列がここへ来る。
   * 「見分けるための値」は `meta` (metadata 段) 側で、ここへ混ぜると段差が消える。
   */
  lead?: readonly DefinitionListItem[] | undefined;
  /** 1〜2 行の要約 (`context` 段)。長い本文は入れない。 */
  description?: ReactNode | undefined;
  /**
   * `lead` を読むために要る情報 (`context` 段)。要約と同じ重みで、ラベル付きで並べたいときに使う。
   * 表をカードへ畳んだとき、`salience: 'context'` を宣言した列がここへ来る。
   */
  context?: readonly DefinitionListItem[] | undefined;
  /** カード下部に小さく並べる属性 (`metadata` 段)。「比較する値」ではなく「見分けるための値」だけを置く。 */
  meta?: readonly DefinitionListItem[] | undefined;
  /** カード内の操作。遷移だけで済む一覧では渡さない。 */
  actions?: ReactNode | undefined;
  /**
   * 見出しの階層。`Panel` の中に置くなら 3。既定 3。
   *
   * `'none'` は「見出しにしない」。表を狭い画面でカードへ畳むときに使う。
   * 表とカードは**常に両方 DOM にあり**、片方を CSS で隠しているだけなので、
   * ここを見出しにすると広い画面 (表を見ている状態) の見出し一覧にも、
   * 画面に出ていないカードぶんの見出しが並んでしまう。
   */
  headingLevel?: 2 | 3 | 4 | 'none' | undefined;
}

/**
 * 一覧の 1 件を表すカード。
 *
 * 「行をまたいで値を比べない一覧」を表で出すと、列見出しの分だけ読む量が増えるのに
 * 得られるのは 1 件ぶんの情報でしかない。状態とタグが主役の一覧はこちらを使う
 * (部品への写し方は docs/frontend-ui-foundation-spec.md §5-1)。
 *
 * `<a>` を見出しの中に置くのは、リンク名を見出しと一致させるため。
 * カード全体をリンクにすると、中に置いた操作が押せなくなる。
 */
export function DataCard({
  title,
  href,
  tags,
  lead,
  description,
  context,
  meta,
  actions,
  headingLevel = 3,
}: DataCardProps): ReactNode {
  const Heading = headingLevel === 'none' ? 'p' : (`h${headingLevel}` as const);
  const titleStyle = { margin: 0, fontSize: 'var(--hh-font-size-md)', overflowWrap: 'anywhere' } as const;

  return (
    <article
      style={{
        ...surfaceStyle,
        padding: spaceVar(4),
        display: 'flex',
        flexDirection: 'column',
        gap: spaceVar(3),
        minWidth: 0,
      }}
    >
      {tags === undefined ? null : tags}

      <Heading
        // 見出しでないときも見た目は変えない (太字と大きさは「1 件の名前」であることの手がかり)
        style={headingLevel === 'none' ? { ...titleStyle, fontWeight: 'var(--hh-font-weight-bold)' } : titleStyle}
      >
        {href === undefined ? (
          title
        ) : (
          <a href={href} data-hh-focusable="" style={{ color: colorVar('primary') }}>
            {title}
          </a>
        )}
      </Heading>

      {lead === undefined || lead.length === 0 ? null : (
        // 見出しの直後、要約より前。カードを流し読みするときに目が止まる位置に、
        // 判断が変わる値 (状態・期限など) を大きく置く
        <DefinitionList items={lead} columns={2} salience="lead" style={{ gap: spaceVar(2) }} />
      )}

      {description === undefined ? null : (
        // 要約は context 段。以前は metadata と同じ sm + textMuted で、要約と属性が
        // 同じ重みに見えていた (見出し以外が 1 段に潰れ、3 段のはずが 2 段だった)
        <p style={{ ...salienceStyle.context, margin: 0, overflowWrap: 'anywhere' }}>{description}</p>
      )}

      {context === undefined || context.length === 0 ? null : (
        <DefinitionList items={context} columns={2} salience="context" style={{ gap: spaceVar(2) }} />
      )}

      {meta === undefined || meta.length === 0 ? null : (
        // 属性はカードの下端に寄せる。要約の行数が 1 行と 3 行で混在すると、
        // 上詰めのままでは隣り合うカードで属性の位置が段違いになり、目線が毎回上下する
        <DefinitionList
          items={meta}
          columns={2}
          salience="metadata"
          style={{ gap: spaceVar(2), marginBlockStart: 'auto' }}
        />
      )}

      {actions === undefined ? null : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spaceVar(2), marginBlockStart: 'auto' }}>{actions}</div>
      )}
    </article>
  );
}

export interface LiveStatusProps {
  children: ReactNode;
  /**
   * 目でも見える形で出すか。既定は読み上げ専用。
   * 「読み込んでいます」のような一過性の状態は、画面に出しっぱなしにすると
   * 完了後も残っているように見えるため既定は隠す。
   */
  visible?: boolean | undefined;
}

/**
 * 読み込み状況・件数の変化を支援技術へ伝える一行。
 *
 * 一覧画面がそれぞれ `<p aria-live="polite">` と読み上げ専用の inline style を
 * 書き写していたので、ここへ 1 つだけ置く。
 */
export function LiveStatus({ children, visible = false }: LiveStatusProps): ReactNode {
  return (
    <p
      aria-live="polite"
      style={
        visible
          ? { margin: 0, color: colorVar('textMuted'), fontSize: 'var(--hh-font-size-sm)' }
          : { ...visuallyHidden, margin: 0 }
      }
    >
      {children}
    </p>
  );
}

export interface FilterBarProps {
  children: ReactNode;
  /**
   * 絞り込み条件のまとまりに与える名前。読み上げ時に「何を絞り込むのか」が分かるようにする。
   * 例: 「ドキュメントの絞り込み」。
   */
  label: string;
  /** 見出しを目で見える形でも出すか。既定は読み上げ専用。 */
  showLabel?: boolean | undefined;
  /**
   * 「絞り込む」ボタンで確定する形の帯なら、この帯自体を `<form>` として描く。
   * 外側に `<form>` を書いて内側に role="group" を置くと、
   * 同じ名前のまとまりが二重に読み上げられるため、どちらか一方に寄せる。
   */
  onSubmit?: ((event: FormEvent<HTMLFormElement>) => void) | undefined;
  /**
   * 「絞り込む」「条件をクリア」などの操作。**帯の中に直接置かず必ずここへ渡す**。
   * children に混ぜるとラベルを持たないぶん背が低く、補足文言を持つ欄の隣で位置が揃わない。
   * このスロットはラベル 1 行ぶん下げて描かれ、入力欄と頭が揃う。
   */
  actions?: ReactNode | undefined;
  /** 適用中の絞り込み条件を表すチップなど。帯の下段に横並びで出す。 */
  appliedChips?: ReactNode | undefined;
  /**
   * 見出し帯 (`ScreenHeader sticky`) の真下に貼り付けたままにするか。一覧画面では true。
   * 貼り付け位置は `StickyHeaderOffset` が書き出す `--hh-screen-header-height` を読む
   * (見出し帯の高さは画面ごとに違うため、固定値を書かない)。
   */
  sticky?: boolean | undefined;
  /**
   * 帯の見え方。
   *
   * - `bar` (既定): 本文の幅いっぱいに敷いて下辺の線で本文と切る。表が続く一覧画面向け。
   * - `card`: 角丸のカードとして独立させる。下に表ではなくカードや図が並ぶ画面向け
   *   (帯だけ角が立っていると、下のカード群と縁が揃わず「別の層」に見えるため)。
   *
   * 画面側で `style` に角丸を書いて作り分けていたものを prop へ引き上げたもの。
   */
  variant?: 'bar' | 'card' | undefined;
  style?: CSSProperties | undefined;
}

/**
 * 絞り込み欄を並べる帯。全画面でこの 1 つだけを使う (画面ごとの書き起こしをしない)。
 *
 * 整列は grid で、各欄の**上端**を揃える。以前は flex + 下端合わせだったため、
 * 補足文言 (`description`) を持つ欄だけ背が高くなり、隣のボタンが押し下げられていた。
 * 実際の grid 指定は base 層の `[data-hh-filter-bar]` が持つ (inline style に `@media` を書けないため)。
 *
 * 確定の作法は 1 つに統一する。「絞り込む」ボタンで確定する形とし、`onSubmit` を渡して
 * この帯自体を `<form>` にする。入力の変化で即時に問い合わせる形は、打鍵ごとに要求が飛び
 * 「まだ打ち終わっていないのに結果が変わる」ため採らない。
 * 操作ボタンは `children` ではなく `actions` へ、適用中の条件は `appliedChips` へ渡す。
 */
export function FilterBar({
  children,
  label,
  showLabel = false,
  onSubmit,
  actions,
  appliedChips,
  sticky = false,
  variant = 'bar',
  style,
}: FilterBarProps): ReactNode {
  const barStyle: CSSProperties = {
    padding: spaceVar(4),
    background: colorVar('surfaceMuted'),
    ...(variant === 'card'
      ? { border: `1px solid ${colorVar('border')}`, borderRadius: radiusVar('card') }
      : { borderBlockEnd: `1px solid ${colorVar('border')}` }),
    ...(sticky
      ? {
          position: 'sticky',
          insetBlockStart: screenHeaderStackEndInset,
          // 見出し帯 (15) より下、表の見出し (10) より上。3 つの重なり順をここで固定する
          zIndex: 14,
        }
      : {}),
    ...style,
  };
  const inner = (
    <>
      <span
        style={
          showLabel
            ? { gridColumn: '1 / -1', fontSize: 'var(--hh-font-size-sm)', color: colorVar('textMuted') }
            : visuallyHidden
        }
      >
        {label}
      </span>
      {children}
      {actions === undefined ? null : <div data-hh-filter-actions="">{actions}</div>}
      {appliedChips === undefined ? null : (
        <div
          data-hh-filter-applied=""
          style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: spaceVar(2), alignItems: 'center' }}
        >
          {appliedChips}
        </div>
      )}
    </>
  );

  // 「絞り込む」で確定する形なら、この帯自体を form にする。
  // 外に form・中に role="group" と二重にすると、同じ名前のまとまりが 2 回読み上げられる
  if (onSubmit !== undefined) {
    return (
      <form data-hh-filter-bar="" aria-label={label} onSubmit={onSubmit} style={barStyle}>
        {inner}
      </form>
    );
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> は入力群の意味を持つ要素で、送信を伴わない絞り込み帯には重い。名前を持つ「ひとかたまり」だけが欲しいので role=group が最小
    <div data-hh-filter-bar="" role="group" aria-label={label} style={barStyle}>
      {inner}
    </div>
  );
}
