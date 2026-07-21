/** フォーム部品の単体テスト。ラベル紐付け・エラー通知・キーボード操作が部品側で担保されることを固定する。 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, FormField, Select, Textarea, TextInput } from '../index.js';
import { renderWithUi } from '../test-utils.js';

describe('Button', () => {
  it('既定の type は button (フォームの誤送信を防ぐ)', () => {
    renderWithUi(<Button>保存</Button>);
    expect(screen.getByRole('button', { name: '保存' }).getAttribute('type')).toBe('button');
  });

  it('type を submit に上書きできる', () => {
    renderWithUi(<Button type="submit">送信</Button>);
    expect(screen.getByRole('button', { name: '送信' }).getAttribute('type')).toBe('submit');
  });

  it('クリックで onClick を呼ぶ', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithUi(<Button onClick={onClick}>実行</Button>);

    await user.click(screen.getByRole('button', { name: '実行' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('loading 中は押せず aria-busy を立てる', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithUi(
      <Button loading onClick={onClick}>
        送信中
      </Button>,
    );

    const button = screen.getByRole('button', { name: '送信中' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(true);

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('variant を data 属性で示す', () => {
    renderWithUi(<Button variant="danger">削除</Button>);
    expect(screen.getByRole('button', { name: '削除' }).getAttribute('data-variant')).toBe('danger');
  });

  it('キーボードで到達できる (focus-visible の対象になる)', async () => {
    const user = userEvent.setup();
    renderWithUi(<Button>フォーカス</Button>);

    await user.tab();
    const button = screen.getByRole('button', { name: 'フォーカス' });
    expect(document.activeElement).toBe(button);
    expect(button.hasAttribute('data-hh-focusable')).toBe(true);
  });
});

describe('FormField', () => {
  it('ラベルと入力欄を id で紐付ける', () => {
    renderWithUi(<FormField label="タイトル">{(control) => <input {...control} />}</FormField>);

    expect(screen.getByLabelText('タイトル')).toBeDefined();
  });

  it('補足とエラーを aria-describedby でまとめて参照させる', () => {
    renderWithUi(
      <FormField label="件名" description="30 文字以内" error="必須です">
        {(control) => <input {...control} />}
      </FormField>,
    );

    const input = screen.getByLabelText('件名');
    const describedBy = input.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(describedBy).toHaveLength(2);

    const texts = describedBy.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toContain('30 文字以内');
    expect(texts).toContain('必須です');
  });

  it('エラー時は aria-invalid を立てる', () => {
    renderWithUi(
      <FormField label="件名" error="必須です">
        {(control) => <input {...control} />}
      </FormField>,
    );
    expect(screen.getByLabelText('件名').getAttribute('aria-invalid')).toBe('true');
  });

  it('エラーが無ければ aria-invalid も describedby も付けない', () => {
    renderWithUi(<FormField label="件名">{(control) => <input {...control} />}</FormField>);

    const input = screen.getByLabelText('件名');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });
});

describe('TextInput', () => {
  it('ラベルで参照でき、入力を反映する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithUi(<TextInput label="名前" onChange={onChange} />);

    await user.type(screen.getByLabelText('名前'), 'あ');
    expect(onChange).toHaveBeenCalled();
  });

  it('hideLabel でもラベル自体は支援技術から参照できる', () => {
    renderWithUi(<TextInput label="検索" hideLabel />);
    expect(screen.getByLabelText('検索')).toBeDefined();
  });

  it('必須表示を出す', () => {
    renderWithUi(<TextInput label="メール" required />);
    expect(screen.getByText('必須')).toBeDefined();
  });
});

describe('Select', () => {
  const options = [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
  ];

  it('選択肢を描画し、選択を通知する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithUi(<Select label="言語" options={options} onChange={onChange} defaultValue="ja" />);

    await user.selectOptions(screen.getByLabelText('言語'), 'en');
    expect(onChange).toHaveBeenCalled();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('placeholder を先頭の未選択項目として出す', () => {
    renderWithUi(<Select label="部署" options={options} placeholder="選択してください" />);
    expect(screen.getAllByRole('option')[0]?.textContent).toBe('選択してください');
  });

  it('disabled な選択肢を反映する', () => {
    renderWithUi(<Select label="言語" options={[{ value: 'fr', label: 'Français', disabled: true }]} />);
    expect((screen.getByRole('option', { name: 'Français' }) as HTMLOptionElement).disabled).toBe(true);
  });
});

describe('Textarea', () => {
  it('ラベルで参照でき、行数を指定できる', () => {
    renderWithUi(<Textarea label="本文" rows={10} />);
    const textarea = screen.getByLabelText('本文') as HTMLTextAreaElement;
    expect(textarea.rows).toBe(10);
  });

  it('エラーを表示する', () => {
    renderWithUi(<Textarea label="本文" error="入力してください" />);
    expect(screen.getByText('入力してください')).toBeDefined();
  });
});
