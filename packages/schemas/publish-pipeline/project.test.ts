import { describe, expect, it } from 'vitest';

import { publishProjectListSchema } from './project.js';

describe('Project 表示名一覧契約', () => {
  it('名前と公開 capability を返し、余計な所有者情報は受け付けない', () => {
    expect(
      publishProjectListSchema.parse({
        items: [{ id: 'project-1', name: '問い合わせ整理', description: '', can_publish: true }],
      }),
    ).toEqual({
      items: [{ id: 'project-1', name: '問い合わせ整理', description: '', can_publish: true }],
    });

    expect(
      publishProjectListSchema.safeParse({
        items: [
          {
            id: 'project-1',
            name: '問い合わせ整理',
            description: '',
            can_publish: true,
            owner_user_id: 'user-1',
          },
        ],
      }).success,
    ).toBe(false);
  });
});
