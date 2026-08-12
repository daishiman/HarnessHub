/**
 * 画面の採用パターン (`docs/screen-inventory.md` の Route surface profile SSOT) を
 * 実装と突き合わせるための判定。
 *
 * ここに純関数だけを置いてあるのは、**ゲート自身の検出力を同じテストの中で確かめるため**。
 * ファイルを読みながら判定する形にすると、判定が正しいかを人工の不一致で試せない。
 * 入出力を切り離しておけば、合成した表と合成したソースを通して「食い違いを食い違いと言うか」を
 * 直接見られる (screen-pattern-gate.test.ts の SPG-LIVE-*)。
 *
 * 実装から読み取る「印」は、UI 部品の使い方に現れるものに限る。
 * たとえば「wide は表・narrow はカード」は `DataTable` に `narrowAs="card-collection"` を
 * 渡したかどうかで決まるので、その 1 点を見れば表の記載と突き合わせられる。
 * 一方で `form` や `content` のように、部品の選び方に印が出ないパターンもある。
 * それらは **判定できないものとして数える** (「違反 0 件」と「そもそも見ていない」を
 * 同じ緑にしないため)。
 */

/** SSOT 表の 1 行 (必要な列だけ)。 */
export interface RouteSurfaceRow {
  /** `current` か `planned`。判定対象は `current` のみ (planned は実装が無い)。 */
  readonly state: string;
  readonly surfaceId: string;
  readonly route: string;
  readonly wide: string;
  readonly middle: string;
  readonly narrow: string;
}

/**
 * 実装から読み取れる印。ソース文字列 1 本 (route から辿った全ファイルの連結) から作る。
 */
export interface ImplementationEvidence {
  readonly dataTable: boolean;
  /** `narrowAs="card-collection"` = 狭い画面でカードへ畳む指定 */
  readonly narrowAsCard: boolean;
  readonly board: boolean;
  readonly wizard: boolean;
  readonly chart: boolean;
}

export type PatternVerdict = 'ok' | 'mismatch' | 'not-judgeable';

export interface RowJudgement {
  readonly surfaceId: string;
  readonly route: string;
  readonly verdict: PatternVerdict;
  /** `mismatch` と `not-judgeable` の理由。緑のときは空。 */
  readonly reason: string;
}

/** SSOT 表の marker。表の外にある同じ形の表を巻き込まないための境界。 */
const TABLE_BEGIN = '<!-- ROUTE_SURFACES_BEGIN -->';
const TABLE_END = '<!-- ROUTE_SURFACES_END -->';

/**
 * SSOT 表を行の配列にする。marker が無ければ例外
 * (表が移動・改名されたときに「0 行を全部緑」と読まないため)。
 */
export function parseRouteSurfaces(markdown: string): readonly RouteSurfaceRow[] {
  const begin = markdown.indexOf(TABLE_BEGIN);
  const end = markdown.indexOf(TABLE_END);
  if (begin === -1 || end === -1) {
    throw new Error(`Route surface profile SSOT の marker (${TABLE_BEGIN}) が見つからない`);
  }

  const rows: RouteSurfaceRow[] = [];
  for (const line of markdown.slice(begin + TABLE_BEGIN.length, end).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    // 見出し行と区切り行を飛ばす
    if (cells.length < 10 || cells[0] === 'State' || cells[0]?.startsWith('---')) continue;
    rows.push({
      state: cells[0] as string,
      surfaceId: cells[1] as string,
      route: (cells[2] as string).replace(/`/g, ''),
      wide: cells[6] as string,
      middle: cells[7] as string,
      narrow: cells[8] as string,
    });
  }
  return rows;
}

/** 実装のソース (連結済み) から印を読む。 */
export function readEvidence(source: string): ImplementationEvidence {
  return {
    dataTable: source.includes('<DataTable'),
    narrowAsCard: source.includes('narrowAs="card-collection"'),
    board: source.includes('<StageBoard'),
    // 共通の StepWizard を直に使う画面と、専用の *Wizard へ包んだ画面がある
    wizard: /<\w*Wizard\b/.test(source),
    chart: /<(BarChart|LineChart|DonutChart|Sparkline)\b/.test(source),
  };
}

/**
 * 表の 1 行と実装の印を突き合わせる。
 *
 * 判定の軸は wide 側の語彙で決める (表の canonical な形)。narrow 側はその変形として見る。
 * これは表が「wide でどう見せ、狭くなったらどう畳むか」の順で書かれているため。
 */
export function judgeRow(row: RouteSurfaceRow, evidence: ImplementationEvidence): RowJudgement {
  const base = { surfaceId: row.surfaceId, route: row.route };
  const has = (cell: string, token: string) => cell.includes(token);

  // `chart+table` のように語彙が合成されるので、当てはまる軸を全部見る。
  // 先に当たった 1 軸で打ち切ると、表の記載の片側だけを検査して緑にしてしまう
  const problems: string[] = [];
  let judged = false;

  if (has(row.wide, 'chart')) {
    judged = true;
    if (!evidence.chart) problems.push('グラフと書いてあるがグラフ部品を使っていない');
  }

  if (has(row.wide, 'table')) {
    judged = true;
    if (!evidence.dataTable) {
      problems.push('表と書いてあるが DataTable を使っていない');
    } else if (has(row.narrow, 'card-collection') && !evidence.narrowAsCard) {
      problems.push('狭い画面はカードと書いてあるが narrowAs="card-collection" が無い (表のまま畳まれない)');
    } else if (has(row.narrow, 'table') && evidence.narrowAsCard) {
      problems.push('狭い画面も表と書いてあるが narrowAs="card-collection" でカードへ畳んでいる');
    }
  }

  if (has(row.wide, 'board')) {
    judged = true;
    if (!evidence.board) problems.push('工程ボードと書いてあるが StageBoard を使っていない');
  }

  if (has(row.wide, 'wizard')) {
    judged = true;
    if (!evidence.wizard) problems.push('手順を追う形と書いてあるが Wizard 部品を使っていない');
  }

  if (!judged) {
    return {
      ...base,
      verdict: 'not-judgeable',
      reason: `「${row.wide}」は部品の選び方に印が出ないため機械では判定しない`,
    };
  }
  return problems.length === 0
    ? { ...base, verdict: 'ok', reason: '' }
    : { ...base, verdict: 'mismatch', reason: problems.join(' / ') };
}
