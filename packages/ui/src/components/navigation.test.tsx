/** タブ・ウィザード・ステージボードの単体テスト。キーボード操作と現在地の伝達を固定する。 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog, StageBoard, StepWizard, Tabs } from '../index.js';
import { renderWithUi } from '../test-utils.js';

const tabItems = [
  { id: 'overview', label: '概要', content: <p>概要の内容</p> },
  { id: 'releases', label: 'リリース', content: <p>リリースの内容</p> },
  { id: 'publish', label: '公開', content: <p>公開の内容</p> },
];

describe('Tabs', () => {
  it('tablist / tab / tabpanel の関係を組む', () => {
    renderWithUi(<Tabs label="ハーネス詳細" items={tabItems} />);

    const tablist = screen.getByRole('tablist', { name: 'ハーネス詳細' });
    expect(tablist).toBeDefined();

    const tab = screen.getByRole('tab', { name: '概要' });
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.getAttribute('id'));
    expect(tab.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
  });

  it('選択中のタブだけが Tab キーの到達点になる (roving tabindex)', () => {
    renderWithUi(<Tabs label="タブ" items={tabItems} />);

    expect(screen.getByRole('tab', { name: '概要' }).getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('tab', { name: 'リリース' }).getAttribute('tabindex')).toBe('-1');
  });

  it('矢印キーで移動できる', async () => {
    const user = userEvent.setup();
    renderWithUi(<Tabs label="タブ" items={tabItems} />);

    await user.click(screen.getByRole('tab', { name: '概要' }));
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'リリース' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('リリースの内容')).toBeDefined();
  });

  it('端では反対側へ回り込む (到達できないタブを作らない)', async () => {
    const user = userEvent.setup();
    renderWithUi(<Tabs label="タブ" items={tabItems} />);

    await user.click(screen.getByRole('tab', { name: '概要' }));
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByRole('tab', { name: '公開' }).getAttribute('aria-selected')).toBe('true');
  });

  it('Home / End で端へ移動する', async () => {
    const user = userEvent.setup();
    renderWithUi(<Tabs label="タブ" items={tabItems} />);

    await user.click(screen.getByRole('tab', { name: '概要' }));
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: '公開' }).getAttribute('aria-selected')).toBe('true');

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: '概要' }).getAttribute('aria-selected')).toBe('true');
  });

  it('外部管理時は onActiveIdChange のみ通知する', async () => {
    const user = userEvent.setup();
    const onActiveIdChange = vi.fn();
    renderWithUi(<Tabs label="タブ" items={tabItems} activeId="overview" onActiveIdChange={onActiveIdChange} />);

    await user.click(screen.getByRole('tab', { name: 'リリース' }));

    expect(onActiveIdChange).toHaveBeenCalledWith('releases');
    expect(screen.getByRole('tab', { name: '概要' }).getAttribute('aria-selected')).toBe('true');
  });
});

const wizardSteps = [
  { id: 'basic', title: '基本情報', content: <p>基本情報の入力</p> },
  { id: 'scope', title: '公開範囲', content: <p>公開範囲の選択</p> },
  { id: 'confirm', title: '確認', content: <p>内容の確認</p> },
];

describe('StepWizard', () => {
  it('現在のステップを aria-current="step" で示す', () => {
    renderWithUi(<StepWizard label="公開ウィザード" steps={wizardSteps} />);

    const current = screen.getByText('ステップ 1: 基本情報');
    expect(current.getAttribute('aria-current')).toBe('step');
  });

  it('進捗バーを持つ', () => {
    renderWithUi(<StepWizard label="公開ウィザード" steps={wizardSteps} />);
    expect(screen.getByRole('progressbar', { name: '公開ウィザード 進捗' })).toBeDefined();
  });

  it('最初のステップでは「戻る」を押せない', () => {
    renderWithUi(<StepWizard label="ウィザード" steps={wizardSteps} />);
    expect((screen.getByRole('button', { name: '戻る' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('「次へ」で次のステップへ進む', async () => {
    const user = userEvent.setup();
    renderWithUi(<StepWizard label="ウィザード" steps={wizardSteps} />);

    await user.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.getByText('公開範囲の選択')).toBeDefined();
    expect(screen.getByText('ステップ 2: 公開範囲').getAttribute('aria-current')).toBe('step');
  });

  it('canProceed が false なら次へ進めない (step 単位 validation の受け口)', () => {
    renderWithUi(<StepWizard label="ウィザード" steps={wizardSteps} canProceed={false} />);
    expect((screen.getByRole('button', { name: '次へ' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('最終ステップでは「完了」を出し onComplete を呼ぶ', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderWithUi(<StepWizard label="ウィザード" steps={wizardSteps} defaultActiveIndex={2} onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: '完了' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

/** 算出された accessible name を空白無視で照合する matcher。 */
const withoutSpaces = (expected: string) => (name: string) => name.replace(/\s+/g, '') === expected.replace(/\s+/g, '');

const boardColumns = [
  {
    stage: 'hearing' as const,
    cards: [{ id: 'c1', title: '経費精算の自動化', meta: '担当: 佐藤', risk: 'warn' as const }],
  },
  { stage: 'design' as const, cards: [] },
  { stage: 'publish' as const, cards: [{ id: 'c2', title: '請求書チェック' }] },
];

describe('StageBoard', () => {
  it('工程名と件数を見出しに出す', () => {
    renderWithUi(<StageBoard label="構築パイプライン" columns={boardColumns} />);

    // 算出名の空白の入り方 (子要素の連結) は dom-accessibility-api の版で揺れるため空白を無視して比較する
    expect(screen.getByRole('heading', { name: withoutSpaces('ヒアリング (1件)') })).toBeDefined();
    expect(screen.getByRole('heading', { name: withoutSpaces('設計 (0件)') })).toBeDefined();
  });

  it('リスクを色だけでなく文言でも示す', () => {
    renderWithUi(<StageBoard label="パイプライン" columns={boardColumns} />);
    expect(screen.getByText('注意')).toBeDefined();
  });

  it('移動ハンドラが無ければ操作ボタンを出さない (閲覧専用)', () => {
    renderWithUi(<StageBoard label="パイプライン" columns={boardColumns} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('隣接工程への移動を通知する (DnD ではなくボタン操作)', async () => {
    const user = userEvent.setup();
    const onMoveCard = vi.fn();
    renderWithUi(<StageBoard label="パイプライン" columns={boardColumns} onMoveCard={onMoveCard} />);

    await user.click(screen.getByRole('button', { name: '次へ: 経費精算の自動化' }));
    expect(onMoveCard).toHaveBeenCalledWith('c1', 'next');
  });

  it('両端では対応する移動を無効化する', () => {
    renderWithUi(<StageBoard label="パイプライン" columns={boardColumns} onMoveCard={vi.fn()} />);

    expect((screen.getByRole('button', { name: '戻る: 経費精算の自動化' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '次へ: 請求書チェック' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('空の工程には空メッセージを出す', () => {
    renderWithUi(<StageBoard label="パイプライン" columns={boardColumns} />);
    expect(screen.getByText('該当するデータがありません')).toBeDefined();
  });
});

describe('ConfirmDialog', () => {
  const setup = (reversible: boolean, onConfirm = vi.fn(), onCancel = vi.fn()) => {
    renderWithUi(
      <ConfirmDialog
        open
        title="リリースを停止しますか"
        description="停止すると新規の導入ができなくなります。"
        reversible={reversible}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel };
  };

  it('閉じているときは何も描画しない', () => {
    renderWithUi(
      <ConfirmDialog open={false} title="確認" description="説明" reversible onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('modal ダイアログとして題名と説明を紐付ける', () => {
    setup(true);

    const dialog = screen.getByRole('dialog', { name: 'リリースを停止しますか' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    const describedBy = dialog.getAttribute('aria-describedby');
    expect(document.getElementById(describedBy ?? '')?.textContent).toContain('停止すると');
  });

  it('取り消せない操作では警告文と danger ボタンを出す', () => {
    setup(false);

    expect(screen.getByText('この操作は取り消せません。')).toBeDefined();
    expect(screen.getByRole('button', { name: '実行する' }).getAttribute('data-variant')).toBe('danger');
  });

  it('取り消せる操作では可逆であることを明示する', () => {
    setup(true);

    expect(screen.getByText('この操作はあとから取り消せます。')).toBeDefined();
    expect(screen.getByRole('button', { name: '実行する' }).getAttribute('data-variant')).toBe('primary');
  });

  it('開いたら内部の要素へフォーカスを移す', () => {
    setup(true);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('Tab がダイアログの外へ抜けない', async () => {
    const user = userEvent.setup();
    setup(true);

    const dialog = screen.getByRole('dialog');
    for (let index = 0; index < 5; index += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('Escape で取り消す', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup(true);

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('確認・取消をそれぞれ通知する', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup(true);

    await user.click(screen.getByRole('button', { name: '実行する' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
