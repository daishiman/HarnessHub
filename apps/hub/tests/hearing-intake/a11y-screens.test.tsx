// @vitest-environment jsdom
// P04 テストスタブ (SYS-HEARING-INTAKE-P04)
// HI-A11Y-*: S10/S11/S12 の axe 違反 0 件 (acceptance 4 / qa-018 / WCAG 2.2 AA)。
//
// P05 で追加した実画面の検査も P06 で実行テストへ昇格済み。
// ただし AD-8 は「S10-S12 は共通部品を消費し、独自実装を持たない」と決めているので、
// **AD-8 が指定した部品を AD-8 が指定した構成で組んだ DOM** は今すぐ検査できる。
// ここで違反が出るなら P05 の画面も必ず違反する = 部品選定そのものが誤りだったことになる。
// (部品単体の検査は packages/ui の HF-QA-A11Y-001 が担うので、ここでは重複させず「組み合わせ」を見る)

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataTable, MarkdownView, StatusChip, StepWizard, TextInput, UiProvider } from '@harness-hub/ui';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HearingSheetDetail } from '../../src/app/(dashboard)/sheets/[id]/hearing-sheet-detail.js';
import { HearingSheetList } from '../../src/app/(dashboard)/sheets/hearing-sheet-list.js';
import { HearingIntakeWizard } from '../../src/app/(dashboard)/sheets/new/hearing-intake-wizard.js';

/** SSR 済み HTML を jsdom の document へ載せる。landmark 込みで検査するため main で包む。 */
function mountScreen(node: ReactNode): void {
  const html = renderToStaticMarkup(
    <html lang="ja">
      <body>
        <main>
          <UiProvider>{node}</UiProvider>
        </main>
      </body>
    </html>,
  );
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');

  // <title> は Next が metadata から head へ注入する。実配信と同じ状態で検査するためここで再現する
  // (JSX で <head> を書くと Next の規約に反するため、DOM 側で組み立てる)
  const title = parsed.createElement('title');
  title.textContent = 'ヒアリングシート';
  parsed.head.appendChild(title);

  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

async function violationsOf(): Promise<readonly string[]> {
  const results = await axe.run(document, { resultTypes: ['violations'] });
  return results.violations.map((violation) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`);
}

// ---------------------------------------------------------------------------
// S10: ヒアリングウィザード (4 大工程 / 8 画面 / FormData 28 項目)
// ---------------------------------------------------------------------------

interface WizardField {
  readonly name: string;
  readonly label: string;
  readonly type: string;
}

/** AD-8 の主要入力工程を最小fixtureで再現。実装の8画面/28項目はHI-A11Y-101とschema契約で検査する。 */
const WIZARD_FIELD_STEPS: readonly { readonly title: string; readonly fields: readonly WizardField[] }[] = [
  {
    title: '基本情報',
    fields: [
      { name: 'taskName', label: '業務名', type: 'text' },
      { name: 'company', label: '会社名', type: 'text' },
      { name: 'applicant', label: '申請者', type: 'text' },
      { name: 'domain', label: '業務領域', type: 'text' },
    ],
  },
  {
    title: '現状',
    fields: [
      { name: 'issue', label: '現在の課題', type: 'text' },
      { name: 'tools', label: '利用中のツール', type: 'text' },
      { name: 'hours', label: '月間工数 (時間)', type: 'number' },
      { name: 'people', label: '対象人数', type: 'number' },
      { name: 'salary', label: '想定年収 (円)', type: 'number' },
    ],
  },
  {
    title: '要望',
    fields: [
      { name: 'features', label: 'ほしい機能', type: 'text' },
      { name: 'output', label: '出力形式', type: 'text' },
      { name: 'priority', label: '優先度', type: 'text' },
    ],
  },
];

const WIZARD_STEPS = [
  ...WIZARD_FIELD_STEPS.map(({ title, fields }) => ({
    id: title,
    title,
    content: (
      <>
        {fields.map((field) => (
          <TextInput key={field.name} name={field.name} label={field.label} type={field.type} required />
        ))}
      </>
    ),
  })),
  {
    id: '確認',
    title: '確認',
    // AD-6 / SEC5: 確認ステップの参考表示は時間のみ。金額はサーバ計算後にしか出さない
    content: <p>削減できる時間の目安: 月 70 時間</p>,
  },
];

// ---------------------------------------------------------------------------
// S11: シート一覧 (6 列)
// ---------------------------------------------------------------------------

interface SheetListItem {
  id: string;
  status: 'received' | 'generating' | 'review' | 'completed';
  code: string;
  title: string;
  domain: string;
  department: string;
  people: number;
  hours: number;
  applicant: string;
  updatedAt: string;
}

const LIST_ROWS: readonly SheetListItem[] = [
  {
    id: 'sheet-1',
    status: 'received',
    code: 'HS-0042',
    title: '請求書処理',
    domain: '経理',
    department: '管理部',
    people: 5,
    hours: 40,
    applicant: '山田',
    updatedAt: '2026-07-01',
  },
  {
    id: 'sheet-2',
    status: 'generating',
    code: 'HS-0043',
    title: '経費精算',
    domain: '経理',
    department: '管理部',
    people: 3,
    hours: 12,
    applicant: '佐藤',
    updatedAt: '2026-07-02',
  },
];

const LIST_COLUMNS = [
  {
    key: 'status',
    header: '状態',
    // ラベル直書きを禁止し、状態語彙辞書 (StatusChip) を唯一の出所にする (frontend-spec §2.4)
    render: (row: SheetListItem) => <StatusChip domain="sheet" status={row.status} />,
  },
  { key: 'code', header: 'HS コード / 業務名', value: (row: SheetListItem) => `${row.code} ${row.title}` },
  { key: 'domain', header: '領域 / 部署', value: (row: SheetListItem) => `${row.domain} / ${row.department}` },
  { key: 'scale', header: '人数 / 工数', value: (row: SheetListItem) => `${row.people} 人 / ${row.hours} h` },
  { key: 'applicant', header: '申請者', value: (row: SheetListItem) => row.applicant, sortable: true },
  { key: 'updatedAt', header: '更新日', value: (row: SheetListItem) => row.updatedAt, sortable: true },
];

// ---------------------------------------------------------------------------
// S12: シート詳細 (生成 4 セクション + snapshot)
// ---------------------------------------------------------------------------

const GENERATED_SECTIONS = {
  overview: '## 概要\n\n請求書処理を自動化します。',
  issue: '## 現在の課題\n\n手作業の転記が多い。',
  feature_tags: '## 推奨機能タグ\n\n- 請求書処理\n- OCR',
  estimated_effect: '## 想定削減効果\n\n年間 **840** 時間。',
} as const;

/** S12 のメタ領域。form_json は salary を含まない 11 項目 (AD-2 / OPEN-2)。 */
const SNAPSHOT_ROWS: readonly (readonly [string, string])[] = [
  ['業務名', '請求書処理'],
  ['月間工数', '40 時間'],
  ['対象人数', '5 人'],
  ['年間削減時間', '840 時間'],
  ['年間削減額', '2,520,000 円'],
];

function SheetDetail(): ReactNode {
  return (
    <article>
      <h1>
        HS-0042 請求書処理 <StatusChip domain="sheet" status="review" />
      </h1>
      {Object.entries(GENERATED_SECTIONS).map(([key, markdown]) => (
        <section key={key}>
          <MarkdownView content={markdown} />
        </section>
      ))}
      <table>
        <caption>元入力と試算の snapshot</caption>
        <tbody>
          {SNAPSHOT_ROWS.map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

// ---------------------------------------------------------------------------

describe('HI-A11Y: S10-S12 の共通部品構成に axe 違反が無い (AD-8)', () => {
  it('HI-A11Y-001: S10 の4大工程fixtureにaxe違反が無く、旧来12項目のラベル契約を維持する', async () => {
    mountScreen(<StepWizard label="ヒアリングシート作成" steps={WIZARD_STEPS} />);

    expect(await violationsOf()).toEqual([]);

    // 空 DOM で緑化しないための実在確認 (Goodhart 対策)
    expect(document.querySelectorAll('li[aria-current], ol li')).toHaveLength(4);
    // 既存12項目のラベル契約が3つの主要入力工程へ過不足なく割り当てられている
    expect(WIZARD_FIELD_STEPS.reduce((total, step) => total + step.fields.length, 0)).toBe(12);
    // StepWizard は現在 step のみ描画するので、DOM 上の入力欄数は step1 の 4 項目と一致する
    expect(document.querySelectorAll('input')).toHaveLength(WIZARD_FIELD_STEPS[0]?.fields.length ?? 0);
    for (const input of document.querySelectorAll('input')) {
      // 全入力欄がラベルと結び付いていること (axe の label 規則の二重確認)
      expect(input.getAttribute('id')).not.toBeNull();
      expect(document.querySelector(`label[for="${input.getAttribute('id')}"]`)).not.toBeNull();
    }
  });

  it('HI-A11Y-002: S10 の確認ステップは時間のみ表示し、金額を出さない (SEC5 / AD-6)', () => {
    const confirmStep = WIZARD_STEPS.at(-1);
    mountScreen(<section aria-label="確認">{confirmStep?.content}</section>);

    expect(document.body.textContent).toContain('時間');
    // 金額表記 (円 / ¥ / カンマ区切りの金額) がクライアント側の確認画面に出ない
    expect(document.body.textContent).not.toMatch(/円|¥/);
  });

  it('HI-A11Y-003: S11 一覧構成に axe 違反が無く、6 列 + 状態チップが描画される', async () => {
    mountScreen(
      <DataTable caption="ヒアリングシート一覧" columns={LIST_COLUMNS} rows={LIST_ROWS} rowKey={(row) => row.id} />,
    );

    expect(await violationsOf()).toEqual([]);
    expect(document.querySelectorAll('th[scope="col"]')).toHaveLength(6);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(document.querySelector('caption')).not.toBeNull();
  });

  it('HI-A11Y-004: received の表示ラベルは全画面共通で「受付」になる (AD-8 / 旧表示「下書き」を使わない)', () => {
    mountScreen(
      <DataTable caption="ヒアリングシート一覧" columns={LIST_COLUMNS} rows={LIST_ROWS} rowKey={(row) => row.id} />,
    );

    const chip = document.querySelector('[data-status-domain="sheet"][data-status="received"]');
    expect(chip?.textContent).toBe('受付');
    expect(document.body.textContent).not.toContain('下書き');
  });

  it('HI-A11Y-005: S12 詳細構成に axe 違反が無く、生成 4 セクションが描画される', async () => {
    mountScreen(<SheetDetail />);

    expect(await violationsOf()).toEqual([]);
    expect(document.querySelectorAll('[data-hh-markdown]')).toHaveLength(4);
    expect(document.querySelectorAll('h2')).toHaveLength(4);
    expect(document.querySelector('h1')?.textContent).toContain('HS-0042');
  });

  it('HI-A11Y-006: S12 の snapshot 表示に salary 原値が現れない (AD-2 / SEC4)', () => {
    mountScreen(<SheetDetail />);

    const text = document.body.textContent ?? '';
    expect(text).toContain('2,520,000 円'); // 削減額は member にも見せる集計値
    expect(text).not.toContain('年収');
    expect(text).not.toContain('6,000,000');
    expect(SNAPSHOT_ROWS.map(([label]) => label)).not.toContain('想定年収');
  });

  it('HI-A11Y-007: S12 本文は dangerouslySetInnerHTML ではなく MarkdownView を通る (SEC7)', () => {
    // 生成本文に script を混ぜても描画結果へ漏れない = 共通レンダラ経由であることの実測
    mountScreen(<MarkdownView content={'## 概要\n\n<script>alert(1)</script>\n\n本文'} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('h2')?.textContent).toBe('概要');
  });
});

// --- 以下は P05 実装 (apps/hub/src/app/sheets/**) を対象とする受入契約 ---

describe('HI-A11Y: P05 実装後の受入契約', () => {
  const wizardSource = () =>
    readFileSync(resolve(process.cwd(), 'src/app/(dashboard)/sheets/new/hearing-intake-wizard.tsx'), 'utf8');
  const listSource = () =>
    readFileSync(resolve(process.cwd(), 'src/app/(dashboard)/sheets/hearing-sheet-list.tsx'), 'utf8');
  const detailSource = () =>
    readFileSync(resolve(process.cwd(), 'src/app/(dashboard)/sheets/[id]/hearing-sheet-detail.tsx'), 'utf8');

  it('HI-A11Y-101: hearing-intake の実コンポーネントに axe 違反が 0 件', async () => {
    mountScreen(<HearingIntakeWizard tenantId="tenant-a" workspaceId="ws-1" />);
    expect(await violationsOf()).toEqual([]);
    // 4大工程を8画面へ展開する現行フローを実DOMで固定する。
    expect(document.querySelectorAll('ol li')).toHaveLength(8);
    expect(document.querySelectorAll('input')).toHaveLength(4);
  });

  it('HI-A11Y-102: hearing-sheets 一覧の実コンポーネントに axe 違反が 0 件', async () => {
    mountScreen(<HearingSheetList tenantId="tenant-a" workspaceId="ws-1" />);
    expect(await violationsOf()).toEqual([]);
    expect(document.querySelector('table')).not.toBeNull();
  });

  it('HI-A11Y-103: hearing-sheets 詳細の初期状態に axe 違反が 0 件', async () => {
    mountScreen(<HearingSheetDetail id="sheet-1" tenantId="tenant-a" workspaceId="ws-1" />);
    expect(await violationsOf()).toEqual([]);
    expect(document.body.textContent).toContain('読み込み中');
    expect(document.querySelector('h1')?.textContent).toContain('ヒアリングシート詳細');
  });

  it('HI-A11Y-104: 提出成功応答を generating の完了パネルと HS コードへ反映する', () => {
    const source = wizardSource();
    expect(source).toContain('setCreated(body)');
    expect(source).toContain('{created.code}');
    expect(source).toContain('<StatusChip domain="sheet" status={created.status}');
    // 文言は業務の言葉へ言い換えた (「キューへ登録」= 内部の言い方)。伝える事実は同じ
    expect(source).toContain('シート本文の作成を開始しました');
  });

  it('HI-A11Y-105: generating がある間だけ 30 秒ポーリングする', () => {
    for (const source of [listSource(), detailSource()]) {
      expect(source).toMatch(/status\s*(?:===|!==)\s*'generating'/);
      expect(source).toContain('30_000');
      expect(source).toContain('window.clearInterval(timer)');
    }
  });

  it('HI-A11Y-106: dead job と received 差戻しを利用者へ説明する表示を持つ', () => {
    const detail = detailSource();
    const repository = readFileSync(
      resolve(process.cwd(), '../../packages/db/repository/hearing-intake-queue.ts'),
      'utf8',
    );
    expect(detail).toContain("sheet.ai_job_status === 'dead'");
    expect(detail).toContain('生成を完了できませんでした');
    expect(repository).toContain("status: 'received'");
  });

  it('HI-A11Y-107: 非同期 status は aria-live で通知される', () => {
    expect(listSource()).toContain('aria-live="polite"');
    expect(detailSource()).toContain('aria-live="polite"');
    expect(listSource()).toContain('生成が完了しました');
    expect(detailSource()).toContain('シート本文が完成しました');
  });

  it('HI-A11Y-108: admin 領域はサーバ permission が true の場合だけ描画する', () => {
    const source = detailSource();
    expect(source).toContain('sheet.can_manage ?');
    expect(source).toContain('aria-label="管理者操作"');
  });

  it('HI-A11Y-109: 一覧 UI は権限フィルタを持たず、service が applicantUserId を repository 条件へ渡す', () => {
    const list = listSource();
    const service = readFileSync(resolve(process.cwd(), 'src/features/hearing-intake/service.ts'), 'utf8');
    expect(list).not.toMatch(/filter\([^)]*(?:applicant|userId)/);
    expect(service).toContain('input.readAll ? {} : { applicantUserId: input.applicantUserId }');
  });

  it('HI-A11Y-110: 印刷 DOM は salary と操作領域を除外する', () => {
    const source = detailSource();
    const printable = source.slice(source.indexOf('return ('), source.lastIndexOf(');'));
    expect(printable).not.toContain('form_snapshot.salary');
    expect(printable).toContain('data-print-exclude');
    expect(source).toContain('window.print()');
  });

  it('HI-A11Y-111: S11 は正本の filter・全文検索・cursor ページングを API query へ渡す', () => {
    const source = listSource();
    expect(source).toContain("query.set('status'");
    expect(source).toContain("query.set('department'");
    expect(source).toContain("query.set('q'");
    expect(source).toContain("query.set('cursor'");
    expect(source).toContain('body.next_cursor');
    // ページ送りは共通部品へ寄せた。CursorPager が aria-label="ヒアリングシート一覧のページ送り" を出す
    expect(source).toContain('<CursorPager');
    expect(source).toContain('label="ヒアリングシート一覧"');
  });

  it('HI-A11Y-112: S10-S12 のリンクは正本の /sheets route に閉じる', () => {
    expect(wizardSource()).toMatch(/href=\{`\/sheets\/\$\{created\.id\}/);
    expect(listSource()).toMatch(/href=\{`\/sheets\/\$\{row\.id\}/);
    expect(listSource()).not.toContain('/hearing-sheets');
  });

  it('HI-A11Y-113: S10 の途中入力は tenant/workspace ごとに sessionStorage を分離する', () => {
    const source = wizardSource();
    expect(source).toMatch(/draftStorageKey\s*=\s*`\$\{STORAGE_KEY\}:\$\{tenantId\}:\$\{workspaceId\}`/);
    expect(source).toContain('sessionStorage.setItem(draftStorageKey');
    expect(source).toContain('sessionStorage.removeItem(draftStorageKey');
  });

  it('HI-A11Y-114: S12 は申請者・部門・申請日時・生成状態・関連 Build を同じ属性面に表示する', () => {
    const source = detailSource();
    expect(source).toContain("term: '申請者'");
    expect(source).toContain('sheet.applicant.name');
    expect(source).toContain("term: '部門'");
    expect(source).toContain('sheet.department');
    // 日時は全画面共通の部品で出す (絶対表記 + 直近なら「3 日前」の併記)。
    // ここで整形関数を直に呼ぶ形に戻すと、この画面だけ相対表記が出なくなる
    expect(source).toContain('<DateTimeText value={sheet.created_at} />');
    expect(source).toContain('AI_JOB_STATUS_LABELS[sheet.ai_job_status]');
    expect(source).toContain('sheet.build_ref');
    expect(source).toContain('label="Build ID"');
    expect(source).toContain('href={`/builds?tenant=');
  });
});
