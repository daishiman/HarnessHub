/** 進捗・通知・エラー表示部品の単体テスト。読み上げの割り込み方と「次の一手」の既定を固定する。 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  Alert,
  Button,
  DegradedBanner,
  EmptyState,
  ErrorState,
  ProgressBar,
  Skeleton,
  useToast,
} from '../index.js';
import { renderWithUi } from '../test-utils.js';

describe('ProgressBar', () => {
  it('進捗値を読み上げ可能な形で持つ', () => {
    renderWithUi(<ProgressBar label="公開処理" value={40} />);

    const bar = screen.getByRole('progressbar', { name: '公開処理' });
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('値が読めない処理では aria-valuenow を出さない (不確定として伝える)', () => {
    renderWithUi(<ProgressBar label="検査中" />);
    expect(screen.getByRole('progressbar', { name: '検査中' }).getAttribute('aria-valuenow')).toBeNull();
  });

  it('0-100 の範囲に丸める', () => {
    renderWithUi(<ProgressBar label="進捗" value={150} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
});

describe('Skeleton', () => {
  it('装飾なので支援技術からは隠す', () => {
    const { container } = renderWithUi(<Skeleton />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('行数分のプレースホルダを描く', () => {
    const { container } = renderWithUi(<Skeleton lines={3} />);
    expect(container.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(3);
  });
});

describe('Alert', () => {
  it('既定は polite で読み上げる', () => {
    renderWithUi(<Alert tone="primary" title="保存しました" />);

    // トーストの常駐リージョンとも role="status" が重なるため、本文から辿って特定する
    const alert = screen.getByText('保存しました').closest('[role="status"]');
    expect(alert?.getAttribute('aria-live')).toBe('polite');
  });

  it('assertive 指定では alert role になる', () => {
    renderWithUi(<Alert tone="danger" title="失敗しました" live="assertive" />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('次の一手を差し込める', () => {
    renderWithUi(<Alert tone="warning" title="注意" action={<Button>再試行</Button>} />);
    expect(screen.getByRole('button', { name: '再試行' })).toBeDefined();
  });
});

describe('ErrorState', () => {
  it('既定で次の一手の文言を出す', () => {
    renderWithUi(<ErrorState />);

    expect(screen.getByText('問題が発生しました')).toBeDefined();
    expect(screen.getByText('時間をおいて、もう一度お試しください。')).toBeDefined();
  });

  it('操作を止める必要があるので assertive で読み上げる', () => {
    renderWithUi(<ErrorState />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('文言と導線を差し替えられる', () => {
    renderWithUi(
      <ErrorState title="公開できません" description="検査に失敗しました" nextAction={<Button>検査結果を見る</Button>} />,
    );

    expect(screen.getByText('公開できません')).toBeDefined();
    expect(screen.getByRole('button', { name: '検査結果を見る' })).toBeDefined();
  });
});

describe('EmptyState', () => {
  it('既定文言と導線を出せる', () => {
    renderWithUi(<EmptyState action={<Button>作成する</Button>} />);

    expect(screen.getByText('まだ何もありません')).toBeDefined();
    expect(screen.getByRole('button', { name: '作成する' })).toBeDefined();
  });
});

describe('DegradedBanner', () => {
  it('既定で「導入済みツールはそのまま使えます」を出す (qa-019)', () => {
    renderWithUi(<DegradedBanner />);

    expect(screen.getByText('一部の機能が使えません')).toBeDefined();
    expect(screen.getByText('導入済みツールはそのまま使えます。')).toBeDefined();
  });
});

function ToastTrigger(): ReactNode {
  const { showToast } = useToast();
  return (
    <Button onClick={() => showToast({ title: '保存しました', description: '変更を反映しました', durationMs: 0 })}>
      通知を出す
    </Button>
  );
}

describe('ToastProvider / useToast', () => {
  it('ライブリージョンは常に DOM 上にある (出現自体を見逃さないため)', () => {
    renderWithUi(<span>本文</span>);
    expect(screen.getByRole('status', { name: '通知' })).toBeDefined();
  });

  it('showToast で通知を表示し、閉じるで消える', async () => {
    const user = userEvent.setup();
    renderWithUi(<ToastTrigger />);

    await user.click(screen.getByRole('button', { name: '通知を出す' }));
    expect(screen.getByText('保存しました')).toBeDefined();

    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByText('保存しました')).toBeNull();
  });

  it('provider の外で useToast を呼ぶと例外にする', () => {
    // React が投げるエラーログでテスト出力が埋まるのを避ける
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<ToastTrigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
