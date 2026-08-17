/**
 * feat-build-pipeline-board 契約の固定テスト。
 *
 * ここで固定するのは「schema が何を通し、何を落とすか」の境界だけである。
 * 隣接判定 (業務規則) は repository/route の責務なので、schema には期待しない。
 */
import { describe, expect, it } from 'vitest';
import {
  BUILD_STAGE_ORDER,
  buildListQuerySchema,
  buildListResponseSchema,
  buildStageSchema,
  buildStageTransitionRequestSchema,
  buildStageTransitionResponseSchema,
  isAdjacentBuildStage,
} from './contracts.js';

describe('BPB-SCHEMA: build stage の値域', () => {
  /**
   * `@harness-hub/db` を import して突き合わせない。schemas は最下層で db に依存しないため、
   * 両側が同じ literal を固定する形にする (db 側は build-stage-transition.test.ts が同じ列挙を固定する)。
   */
  it('7 値・順序を literal で固定する (隣接判定の正本が黙って変わらない)', () => {
    expect([...BUILD_STAGE_ORDER]).toEqual(['hearing', 'requirements', 'design', 'build', 'test', 'review', 'publish']);
  });

  it('未知の工程名は parse エラーになる', () => {
    expect(buildStageSchema.safeParse('deploy').success).toBe(false);
  });

  it('isAdjacentBuildStage は index 差 ±1 のみ真 (同一工程・飛ばしは偽)', () => {
    expect(isAdjacentBuildStage('design', 'build')).toBe(true);
    expect(isAdjacentBuildStage('build', 'design')).toBe(true);
    expect(isAdjacentBuildStage('design', 'design')).toBe(false);
    expect(isAdjacentBuildStage('design', 'test')).toBe(false);
  });
});

describe('BPB-SCHEMA: POST /api/v1/builds/:id/stage の request 契約', () => {
  it('隣接でない遷移値も schema としては通る (妥当性判定はサービス層の責務)', () => {
    const skipping = buildStageTransitionRequestSchema.safeParse({
      to_stage: 'publish',
      expected_stage: 'hearing',
    });
    expect(skipping.success).toBe(true);

    // 逆行も同様に schema は通す。許否は状態機械が決める。
    expect(
      buildStageTransitionRequestSchema.safeParse({ to_stage: 'hearing', expected_stage: 'requirements' }).success,
    ).toBe(true);
  });

  it('expected_stage が欠けていると parse エラーになる (CAS を省略できる経路を作らない)', () => {
    const parsed = buildStageTransitionRequestSchema.safeParse({ to_stage: 'build' });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path.join('.') === 'expected_stage')).toBe(true);
  });

  it('未知キーを .strict() で弾く (typo した予約語が黙って捨てられない)', () => {
    const parsed = buildStageTransitionRequestSchema.safeParse({
      to_stage: 'build',
      expected_stage: 'design',
      force: true,
    });
    expect(parsed.success).toBe(false);
  });

  it('reason は省略可・空白のみは不可', () => {
    expect(buildStageTransitionRequestSchema.safeParse({ to_stage: 'build', expected_stage: 'design' }).success).toBe(
      true,
    );
    expect(
      buildStageTransitionRequestSchema.safeParse({ to_stage: 'build', expected_stage: 'design', reason: '   ' })
        .success,
    ).toBe(false);
  });
});

describe('BPB-SCHEMA: 応答契約', () => {
  const buildItem = {
    id: '01JBUILD0000000000000000AA',
    workspace_id: '01JWS0000000000000000000AA',
    type: 'improvement' as const,
    stage: 'build' as const,
    sheet_id: null,
    feedback_id: '01JFB00000000000000000AAAA',
    publish_request_id: null,
    title: '検索結果の並び順改善',
    risk: 'none' as const,
    // カード編集の手入力列。実効値 (title / risk) と併記する契約なので、
    // 「上書きなし」の null も含めて 1 件の完全な形として固定する。
    title_override: null,
    risk_override: null,
    assignee_user_id: null,
    note: null,
    created_at: 1_760_000_000_000,
    updated_at: 1_760_000_100_000,
  };

  it('遷移応答は build と event の組で、未知キーを弾く', () => {
    const payload = {
      build: buildItem,
      event: {
        id: '01JEV00000000000000000AAAA',
        build_id: buildItem.id,
        from_stage: 'design' as const,
        to_stage: 'build' as const,
        actor_user_id: '01JUSER000000000000000AAAA',
        reason: null,
        occurred_at: 1_760_000_100_000,
      },
    };
    expect(buildStageTransitionResponseSchema.safeParse(payload).success).toBe(true);
    expect(buildStageTransitionResponseSchema.safeParse({ ...payload, audit_event_id: 'x' }).success).toBe(false);
  });

  it('一覧 query の limit は既定 50 で、範囲外を弾く', () => {
    expect(buildListQuerySchema.parse({})).toMatchObject({ limit: 50 });
    expect(buildListQuerySchema.safeParse({ limit: 1_000 }).success).toBe(false);
  });

  it('一覧は route が算出した工程操作 capability を任意で返せる', () => {
    expect(buildListResponseSchema.safeParse({ items: [buildItem], next_cursor: null, can_manage: true }).success).toBe(
      true,
    );
    // 旧 consumer との段階的互換を保ち、省略時は client が false として扱う。
    expect(buildListResponseSchema.safeParse({ items: [buildItem], next_cursor: null }).success).toBe(true);
    expect(
      buildListResponseSchema.safeParse({ items: [buildItem], next_cursor: null, can_manage: 'yes' }).success,
    ).toBe(false);
  });
});
