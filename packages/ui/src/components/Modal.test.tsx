/**
 * 汎用モーダルとボトムシートの単体テスト。
 * 「開いている間の閉じ込め」と「閉じたあとの復帰」という、目に見えないが壊れやすい約束を固定する。
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe, { type Result } from 'axe-core';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BottomSheet, Button, Modal, ToastProvider, UiProvider } from '../index.js';
import { renderWithUi } from '../test-utils.js';

describe('Modal', () => {
  it('閉じているあいだは何も描画しない', () => {
    renderWithUi(
      <Modal open={false} title="導入手順" onClose={vi.fn()}>
        <p>本文</p>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('見出しと説明を dialog の名前・説明として結び付ける', () => {
    renderWithUi(
      <Modal open title="導入手順" description="コマンドをコピーして実行します" onClose={vi.fn()}>
        <p>本文</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: '導入手順' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy as string)?.textContent).toBe('コマンドをコピーして実行します');
  });

  it('説明を渡さないときは aria-describedby を付けない', () => {
    renderWithUi(
      <Modal open title="導入手順" onClose={vi.fn()}>
        <p>本文</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBeNull();
  });

  it('Escape と閉じるボタンの両方で閉じられる', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithUi(
      <Modal open title="導入手順" onClose={onClose}>
        <p>本文</p>
      </Modal>,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('Tab は末尾から先頭へ巻き戻り、外へ逃げない', async () => {
    const user = userEvent.setup();
    renderWithUi(
      <Modal open title="導入手順" onClose={vi.fn()} footer={<Button>実行</Button>}>
        <button type="button">中身</button>
      </Modal>,
    );

    // 開いた直後は最初のフォーカス可能要素 (閉じるボタン) にいる
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '閉じる' }));

    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '実行' }));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '閉じる' }));

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '実行' }));
  });

  it('閉じたら開く前のフォーカス位置へ戻す', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            開く
          </button>
          <Modal open={open} title="導入手順" onClose={() => setOpen(false)}>
            <p>本文</p>
          </Modal>
        </>
      );
    }

    renderWithUi(<Harness />);
    const opener = screen.getByRole('button', { name: '開く' });

    await user.click(opener);
    expect(document.activeElement).not.toBe(opener);

    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(opener);
  });

  it('開いているあいだは背面のスクロールを止め、閉じたら元に戻す', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Modal open={open} title="導入手順" onClose={() => setOpen(false)}>
          <p>本文</p>
        </Modal>
      );
    }

    renderWithUi(<Harness />);
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('dismissible=false のときは背景・Escape・閉じるボタンで未保存内容を破棄しない', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = renderWithUi(
      <Modal open title="公開ウィザード" dismissible={false} onClose={onClose}>
        <p>本文</p>
      </Modal>,
    );

    expect(container.querySelectorAll('button[aria-hidden="true"]')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: '閉じる' })).toBeNull();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('BottomSheet', () => {
  it('dialog として開き、Escape で閉じる', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithUi(
      <BottomSheet open title="その他" onClose={onClose}>
        <p>本文</p>
      </BottomSheet>,
    );

    expect(screen.getByRole('dialog', { name: 'その他' })).toBeDefined();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('閉じているあいだは描画しない', () => {
    renderWithUi(
      <BottomSheet open={false} title="その他" onClose={vi.fn()}>
        <p>本文</p>
      </BottomSheet>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('dismissible=false のときは背景・Escape・閉じるボタンで未保存内容を破棄しない', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = renderWithUi(
      <BottomSheet open title="入力中の設定" dismissible={false} onClose={onClose}>
        <button type="button">保存して閉じる</button>
      </BottomSheet>,
    );

    expect(container.querySelectorAll('button[aria-hidden="true"]')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: '閉じる' })).toBeNull();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('モーダル層の axe 検査', () => {
  it.each([
    [
      'Modal',
      <Modal
        key="modal"
        open
        title="導入手順"
        description="手順の説明"
        onClose={vi.fn()}
        footer={<Button>実行</Button>}
      >
        <p>本文</p>
      </Modal>,
    ],
    [
      'BottomSheet',
      <BottomSheet key="sheet" open title="その他" onClose={vi.fn()}>
        <p>本文</p>
      </BottomSheet>,
    ],
  ])('%s に違反がない', async (_name, node) => {
    const { container } = render(
      <UiProvider>
        <ToastProvider>
          <main>{node}</main>
        </ToastProvider>
      </UiProvider>,
    );

    const results = await axe.run(container, { resultTypes: ['violations'] });
    const violations = results.violations.map(
      (violation: Result) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(' | ')}`,
    );

    expect(violations).toEqual([]);
  });
});
