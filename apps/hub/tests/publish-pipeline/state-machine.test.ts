import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { publishRequestStateSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import {
  allowedEvents,
  isTerminal,
  occupiesChannel,
  PUBLISH_REQUEST_EVENTS,
  PUBLISH_REQUEST_STATES,
  TERMINAL_STATES,
  transition,
} from '@/lib/publish/state-machine';

/**
 * 遷移表の期待値。**実装とは独立にここへ書き下す** (実装から導出すると何も検証できない)。
 * docs/backend-spec.md §5.1 の遷移図を読み写したもの。
 */
const EXPECTED_TRANSITIONS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  draft: { submit: 'validating' },
  validating: { inspection_green: 'ready', inspection_yellow: 'needs_fix', inspection_red: 'needs_fix' },
  needs_fix: { cancel: 'draft' },
  ready: { approve: 'approved', submit: 'approval_pending', cancel: 'draft' },
  approval_pending: { approve: 'approved', reject: 'needs_fix', cancel: 'draft' },
  approved: { start_publishing: 'publishing', cancel: 'draft' },
  publishing: { publish_succeeded: 'published', publish_failed: 'failed' },
  failed: {},
  published: {},
};

describe('状態と イベントの値域 (T1-A)', () => {
  it('状態は zod の enum から導出され 9 値である', () => {
    expect(PUBLISH_REQUEST_STATES).toEqual(publishRequestStateSchema.options);
    expect(PUBLISH_REQUEST_STATES).toHaveLength(9);
  });

  it('イベントは 10 種で重複が無い', () => {
    expect(PUBLISH_REQUEST_EVENTS).toHaveLength(10);
    expect(new Set(PUBLISH_REQUEST_EVENTS).size).toBe(10);
  });
});

describe('遷移表の全数検証 (T1-A)', () => {
  it('9 状態 × 10 イベント の全 90 通りが期待表と一致する', () => {
    // 直積を全部回すのは、表に無い組が「たまたま」通ってしまう抜けを残さないため。
    // 状態機械が純関数なのはこの網羅を現実的な費用で回すためでもある
    const actual: Record<string, Record<string, string>> = {};
    let checked = 0;

    for (const state of PUBLISH_REQUEST_STATES) {
      actual[state] = {};
      for (const event of PUBLISH_REQUEST_EVENTS) {
        checked += 1;
        const result = transition(state, event);
        if (result.ok) (actual[state] as Record<string, string>)[event] = result.state;
      }
    }

    expect(checked).toBe(90);
    expect(actual).toEqual(EXPECTED_TRANSITIONS);
  });

  it('表に無い組は illegal_transition を返す (例外を投げない)', () => {
    const result = transition('published', 'submit');

    expect(result.ok).toBe(false);
    expect(result).toEqual({ ok: false, reason: 'illegal_transition' });
  });
});

describe('終端状態 (T1-B)', () => {
  it.each(['published', 'failed'] as const)('%s からはどのイベントでも動かない', (state) => {
    const moves = PUBLISH_REQUEST_EVENTS.filter((event) => transition(state, event).ok);

    expect(moves).toEqual([]);
  });

  it('draft は「終端」だが遷移はできる (直列化の語彙であって停止状態ではない)', () => {
    // TERMINAL_STATES は「channel を占有しない状態」の集合であり、
    // 状態機械の停止状態とは別概念。draft がここに入るのはそのため
    expect(isTerminal('draft')).toBe(true);
    expect(transition('draft', 'submit').ok).toBe(true);
  });
});

describe('publishing 中の取消 (T1-C)', () => {
  it('publishing からは cancel できない', () => {
    // 進行中に取り消せると、R2 書込と Release 生成の中断点しだいで DB と R2 の整合が崩れる
    expect(transition('publishing', 'cancel').ok).toBe(false);
  });

  it('publishing から進める先は成功と失敗の 2 つだけ', () => {
    expect(allowedEvents('publishing')).toEqual(['publish_succeeded', 'publish_failed']);
  });

  it.each(['needs_fix', 'ready', 'approval_pending', 'approved'] as const)(
    '%s からは cancel で draft へ戻る',
    (state) => {
      expect(transition(state, 'cancel')).toEqual({ ok: true, state: 'draft' });
    },
  );
});

describe('Stage 2 用の辺 (T1-D)', () => {
  it('ready --submit--> approval_pending は表には存在する', () => {
    expect(transition('ready', 'submit')).toEqual({ ok: true, state: 'approval_pending' });
  });

  it('approval_pending は検査イベントを受け付けない (入ると検査経路へ戻れない)', () => {
    // だから MVP では service 側の入口でこの辺を塞いでいる (service-request.cases.ts の T1-D を参照)
    expect(transition('approval_pending', 'inspection_green').ok).toBe(false);
    expect(transition('approval_pending', 'inspection_yellow').ok).toBe(false);
    expect(transition('approval_pending', 'inspection_red').ok).toBe(false);
  });
});

describe('Yellow / Red の扱い (制約 i2)', () => {
  it('yellow と red は遷移先が同じ needs_fix だが、イベントは分かれている', () => {
    expect(transition('validating', 'inspection_yellow')).toEqual({ ok: true, state: 'needs_fix' });
    expect(transition('validating', 'inspection_red')).toEqual({ ok: true, state: 'needs_fix' });
    // イベントを統合すると監査ログから「警告で止まった／違反で止まった」の区別が消える
    expect(PUBLISH_REQUEST_EVENTS).toContain('inspection_yellow');
    expect(PUBLISH_REQUEST_EVENTS).toContain('inspection_red');
  });
});

describe('直列化の語彙と DB 制約の一致 (T1-F)', () => {
  it('occupiesChannel は isTerminal の否定である', () => {
    for (const state of PUBLISH_REQUEST_STATES) {
      expect(occupiesChannel(state)).toBe(!isTerminal(state));
    }
  });

  it('TERMINAL_STATES が partial UNIQUE index の述語と一致する', () => {
    // 型では守れない一致なので、schema 定義の**実ファイル**から述語を読み出して突き合わせる。
    // 片方だけ変えると「index が効かない非終端状態」が生まれ、同一 channel へ並行 publish が通る
    const schemaPath = fileURLToPath(new URL('../../../../packages/db/schema/core/publish.ts', import.meta.url));
    const source = readFileSync(schemaPath, 'utf8');

    const predicate = /status NOT IN \(([^)]*)\)/.exec(source);
    expect(predicate).not.toBeNull();

    const excluded = [...(predicate?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(excluded.sort()).toEqual([...TERMINAL_STATES].sort());
  });

  it('index の対象は 6 状態 (非終端) である', () => {
    expect(PUBLISH_REQUEST_STATES.filter(occupiesChannel)).toEqual([
      'validating',
      'needs_fix',
      'ready',
      'approval_pending',
      'approved',
      'publishing',
    ]);
  });
});
