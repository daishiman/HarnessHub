/** 辞書と状態語彙の単体テスト。表示ラベルの唯一の出所であることを固定する。 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  enMessages,
  getStatusLabel,
  getStatusTone,
  jaMessages,
  statusToneColors,
  statusVocabulary,
  translateUiMessage,
  uiLocales,
  uiMessages,
  ScopeChip,
  StatusChip,
} from '../index.js';
import { renderWithUi } from '../test-utils.js';

describe('辞書', () => {
  it('対応言語は ja / en', () => {
    expect([...uiLocales]).toEqual(['ja', 'en']);
  });

  it('en は ja と同じキー集合を持つ (欠落があれば型エラーになる契約の実行時確認)', () => {
    expect(Object.keys(enMessages).sort()).toEqual(Object.keys(jaMessages).sort());
  });

  it('全ての文言が空でない', () => {
    for (const locale of uiLocales) {
      for (const [key, value] of Object.entries(uiMessages[locale])) {
        expect(value.trim(), `${locale}.${key}`).not.toBe('');
      }
    }
  });

  it('translateUiMessage が言語ごとの文言を返す', () => {
    expect(translateUiMessage('ja', 'action.cancel')).toBe('キャンセル');
    expect(translateUiMessage('en', 'action.cancel')).toBe('Cancel');
  });
});

describe('状態語彙', () => {
  it('frontend-spec §2.4 の写像を保持する', () => {
    expect(getStatusLabel('sheet', 'generating', 'ja')).toBe('生成中');
    expect(getStatusLabel('feedback', 'open', 'ja')).toBe('未対応');
    expect(getStatusLabel('release', 'suspended', 'ja')).toBe('停止中');
    expect(getStatusLabel('publish', 'approval_pending', 'ja')).toBe('承認待ち');
    expect(getStatusLabel('buildStage', 'requirements', 'ja')).toBe('要件定義');
  });

  it('en ラベルも全 domain で定義されている', () => {
    for (const [domain, entries] of Object.entries(statusVocabulary)) {
      for (const [value, entry] of Object.entries(entries)) {
        expect(entry.labels.en.trim(), `${domain}.${value}`).not.toBe('');
      }
    }
  });

  it('未対応は danger、対応済みは success の tone', () => {
    expect(getStatusTone('feedback', 'open')).toBe('danger');
    expect(getStatusTone('feedback', 'resolved')).toBe('success');
  });

  it('未登録の状態は例外にする (画面での勝手なラベル追加を防ぐ)', () => {
    // @ts-expect-error 型では弾かれるが、実行時にも落ちることを確かめる
    expect(() => getStatusLabel('feedback', 'unknown', 'ja')).toThrow(/未登録/);
  });

  it('全ての tone に配色が定義されている', () => {
    const usedTones = new Set(
      Object.values(statusVocabulary).flatMap((entries) =>
        Object.values(entries).map((entry) => entry.tone),
      ),
    );
    for (const tone of usedTones) {
      expect(statusToneColors[tone]).toBeDefined();
    }
  });

  it('build stage は 7 工程', () => {
    expect(Object.keys(statusVocabulary.buildStage)).toHaveLength(7);
  });

  it('publish は 9 状態', () => {
    expect(Object.keys(statusVocabulary.publish)).toHaveLength(9);
  });
});

describe('StatusChip', () => {
  it('辞書のラベルを表示する', () => {
    renderWithUi(<StatusChip domain="sheet" status="review" />);
    expect(screen.getByText('レビュー待ち')).toBeDefined();
  });

  it('言語設定に追従する', () => {
    renderWithUi(<StatusChip domain="sheet" status="review" />, { locale: 'en' });
    expect(screen.getByText('In review')).toBeDefined();
  });
});

describe('ScopeChip', () => {
  it('スコープ種別と名前を省略せず出す', () => {
    renderWithUi(<ScopeChip scope="workspace" name="開発部" />);
    expect(screen.getByText('ワークスペース: 開発部')).toBeDefined();
  });

  it('en では英語の種別名を出す', () => {
    renderWithUi(<ScopeChip scope="tenant" name="Acme" />, { locale: 'en' });
    expect(screen.getByText('Tenant: Acme')).toBeDefined();
  });
});
