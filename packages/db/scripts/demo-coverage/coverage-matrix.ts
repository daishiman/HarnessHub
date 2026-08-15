// route × 状態 の対応表 (requirements-baseline.md §6.3 の実装)。
//
// 28 route × 5 状態 = 140 セルを、適用 (到達手順つき) と非適用 (理由記号つき) のどちらかへ必ず解決する。
// 「空欄・保留なし」が A7 の機械検査対象であり、verify-demo-coverage-matrix.ts がこの表を検査する。
//
// route 一覧をここに書き写しているのは意図的である。apps/hub の page.tsx から自動導出すると、
// 画面が増えたときに表も黙って増え、「状態の割り当てを考え忘れた」ことを検知できなくなる。
// 実測集合との一致は T1-7 が別経路で突き合わせる。

export const ROUTE_STATES = ['empty', 'single', 'bulk', 'longText', 'error'] as const;
export type RouteState = (typeof ROUTE_STATES)[number];

export const NOT_APPLICABLE_REASONS = {
  N1: '静的コンテンツのみで、件数に依存する表示を持たない',
  N2: '入力専用画面で、初期表示が常に未入力の 1 状態である',
  N3: 'データ取得を伴わないため取得失敗・権限不足・未同期が発生しない',
  N4: '詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める',
  N5: '単一フォームで、繰り返し要素のページング境界を持たない',
  N6: '単一ドキュメントの表示・編集で、一覧のページング境界を持たない',
  N7: '認証済み利用者が必ず 1 件以上存在するため 0 件が成立しない',
} as const;
export type NotApplicableReason = keyof typeof NOT_APPLICABLE_REASONS;

export interface ReachStep {
  /** どの役割で開くか。 */
  readonly actor: string;
  /** 実際に開く URL。動的 segment は決定論 ID へ解決済み。 */
  readonly url: string;
  /** その状態を成立させる seed fixture の論理キー。 */
  readonly fixtures: readonly string[];
  /** 画面を開いた後に必要な操作。不要なら省略する。 */
  readonly operation?: string;
}

export type Applicability =
  | { readonly kind: 'applicable'; readonly reach: ReachStep[] }
  | { readonly kind: 'notApplicable'; readonly reason: NotApplicableReason };

export interface RouteCoverage {
  readonly screenCode: string;
  readonly route: string;
  readonly states: Record<RouteState, Applicability>;
}

/** 状態ごとに共通で効く fixture と操作。route 固有の fixture と併せて 1 手順にする。 */
const STATE_REACH: Record<RouteState, { fixtures: readonly string[]; operation?: string }> = {
  empty: { fixtures: ['tenant/empty/0001'], operation: '子データを持たないテナントで開く' },
  single: { fixtures: ['tenant/main/0001'] },
  bulk: {
    fixtures: ['tenant/main/0001'],
    operation: '既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る',
  },
  longText: { fixtures: ['long-text/heading/0001', 'long-text/body/0001'] },
  error: { fixtures: ['tenant/suspended/0001'], operation: '停止テナントの資源を要求する' },
};

/**
 * 詳細画面の URL に埋める決定論 ID。表と seed が同じ論理キーを見ていることの担保でもある。
 *
 * ここで `seedId()` を呼ばず確定値を直接置いているのは、この表が `@harness-hub/db` の公開 API
 * (`src/index.ts`) から出ており、Edge Runtime の middleware まで届くためである。`seed-id.ts` は
 * `node:crypto` を使うので、import すると middleware の build が UnhandledSchemeError で落ちる。
 * 値が `seedId(<論理キー>)` と一致することは `__tests__/seed-coverage/coverage-matrix.test.ts` が
 * 機械検査するので、論理キーを変えたときの取り残しはテストで落ちる。
 */
const DEMO = {
  tenantSlug: 'demo',
  /** seedId('project/active/0001') */
  projectId: '5MESXC670Q78A7MMMDXZVH3S6S',
  /** seedId('document/tenant-published/0001') */
  documentId: '07JBX1XEMRY7QAEX3C2BZ8HXBM',
  /** seedId('feedback/open/0001') */
  feedbackId: '23RK79TWQSKVKE890HY56KFXDY',
  /** seedId('hearing-sheet/completed/0001') */
  sheetId: '0JWEE6BZ9X72KHY5ECHPBKWDY6',
  /** seedId('user/member/0001') */
  userId: '5WMVZRDFGS5XQAJJY933AXS1K2',
} as const;

/** `DEMO` の各 ID がどの論理キー由来かの正本。テストが `seedId()` と突き合わせる。 */
export const DEMO_ID_SOURCE_KEYS = {
  projectId: 'project/active/0001',
  documentId: 'document/tenant-published/0001',
  feedbackId: 'feedback/open/0001',
  sheetId: 'hearing-sheet/completed/0001',
  userId: 'user/member/0001',
} as const satisfies Record<Exclude<keyof typeof DEMO, 'tenantSlug'>, string>;

/** テストが事前計算値を突き合わせるための公開点。表の利用者は URL 済みの値だけを見ればよい。 */
export const DEMO_IDS: Readonly<Record<keyof typeof DEMO_ID_SOURCE_KEYS, string>> = DEMO;

interface RouteSpec {
  readonly screenCode: string;
  readonly route: string;
  readonly url: string;
  readonly actor: string;
  /** その画面を成立させる route 固有の fixture 論理キー。 */
  readonly fixtures: readonly string[];
  readonly na: Partial<Record<RouteState, NotApplicableReason>>;
}

const ROUTE_SPECS: readonly RouteSpec[] = [
  {
    screenCode: 'SCR-01',
    route: '/',
    url: '/',
    actor: 'anonymous',
    fixtures: ['tenant/main/0001'],
    na: { empty: 'N1', single: 'N1', bulk: 'N1', longText: 'N1' },
  },
  {
    screenCode: 'SCR-02',
    route: '/[tenant_slug]/signin',
    url: `/${DEMO.tenantSlug}/signin`,
    actor: 'anonymous',
    fixtures: ['tenant/main/0001', 'idp-connection/active/0001'],
    na: { empty: 'N2', bulk: 'N1', longText: 'N1' },
  },
  {
    screenCode: 'SCR-03',
    route: '/device',
    url: '/device',
    actor: 'anonymous',
    fixtures: ['device-authorization/pending/0001'],
    na: { empty: 'N2', bulk: 'N1', longText: 'N1' },
  },
  {
    screenCode: 'SCR-04',
    route: '/legal',
    url: '/legal',
    actor: 'anonymous',
    fixtures: ['document/common-published/0001'],
    na: { empty: 'N1', single: 'N1', bulk: 'N1', error: 'N3' },
  },
  {
    screenCode: 'SCR-05',
    route: '/dashboard',
    url: '/dashboard',
    actor: 'member',
    fixtures: ['metrics-rollup/tenant-daily/0001', 'build/hearing/0001'],
    na: {},
  },
  {
    screenCode: 'SCR-06',
    route: '/catalog',
    url: '/catalog',
    actor: 'member',
    fixtures: ['project/active/0001', 'catalog-entry/workspace/0001'],
    na: {},
  },
  {
    screenCode: 'SCR-07',
    route: '/catalog/[projectId]',
    url: `/catalog/${DEMO.projectId}`,
    actor: 'member',
    fixtures: ['project/active/0001', 'release/available/0001'],
    na: { empty: 'N4' },
  },
  {
    screenCode: 'SCR-08',
    route: '/catalog/publish',
    url: '/catalog/publish',
    actor: 'workspace-admin',
    fixtures: ['publish-request/ready/0001', 'target-channel/skill/0001'],
    na: { empty: 'N2', bulk: 'N5' },
  },
  {
    screenCode: 'SCR-09',
    route: '/catalog/releases',
    url: '/catalog/releases',
    actor: 'workspace-admin',
    fixtures: ['release/available/0001', 'release/deprecated/0001'],
    na: {},
  },
  {
    screenCode: 'SCR-10',
    route: '/builds',
    url: '/builds',
    actor: 'member',
    fixtures: ['build/hearing/0001', 'build-stage-event/initial/0001'],
    na: {},
  },
  {
    screenCode: 'SCR-11',
    route: '/docs',
    url: '/docs',
    actor: 'member',
    fixtures: ['document/tenant-published/0001', 'document/tenant-draft/0001'],
    na: {},
  },
  {
    screenCode: 'SCR-12',
    route: '/docs/new',
    url: '/docs/new',
    actor: 'member',
    fixtures: ['document/tenant-draft/0001'],
    na: { empty: 'N2', bulk: 'N5' },
  },
  {
    screenCode: 'SCR-13',
    route: '/docs/[id]',
    url: `/docs/${DEMO.documentId}`,
    actor: 'member',
    fixtures: ['document/tenant-published/0001'],
    na: { empty: 'N4', bulk: 'N6' },
  },
  {
    screenCode: 'SCR-14',
    route: '/docs/[id]/edit',
    url: `/docs/${DEMO.documentId}/edit`,
    actor: 'member',
    fixtures: ['document/tenant-published/0001'],
    na: { empty: 'N4', bulk: 'N6' },
  },
  {
    screenCode: 'SCR-15',
    route: '/feedback',
    url: '/feedback',
    actor: 'member',
    fixtures: ['feedback/open/0001', 'feedback/resolved/0001'],
    na: {},
  },
  {
    screenCode: 'SCR-16',
    route: '/feedback/new',
    url: '/feedback/new',
    actor: 'member',
    fixtures: ['project/active/0001'],
    na: { empty: 'N2', bulk: 'N5' },
  },
  {
    screenCode: 'SCR-17',
    route: '/feedback/[id]',
    url: `/feedback/${DEMO.feedbackId}`,
    actor: 'member',
    fixtures: ['feedback/open/0001', 'ai-job/feedback-processing/0001'],
    na: { empty: 'N4' },
  },
  {
    screenCode: 'SCR-18',
    route: '/metrics',
    url: '/metrics',
    actor: 'member',
    fixtures: ['metrics-rollup/tenant-daily/0001', 'metrics-rollup/harness-weekly/0001'],
    na: {},
  },
  {
    screenCode: 'SCR-19',
    route: '/metrics/usage',
    url: '/metrics/usage',
    actor: 'member',
    fixtures: ['metrics-event/base/0001', 'tenant-coefficient/main/0001'],
    na: {},
  },
  {
    screenCode: 'SCR-20',
    route: '/sheets',
    url: '/sheets',
    actor: 'member',
    fixtures: ['hearing-sheet/completed/0001', 'hearing-sheet/received/0001'],
    na: {},
  },
  {
    screenCode: 'SCR-21',
    route: '/sheets/new',
    url: '/sheets/new',
    actor: 'member',
    fixtures: ['tenant-coefficient/main/0001'],
    na: { empty: 'N2', bulk: 'N5' },
  },
  {
    screenCode: 'SCR-22',
    route: '/sheets/[id]',
    url: `/sheets/${DEMO.sheetId}`,
    actor: 'member',
    fixtures: ['hearing-sheet/completed/0001', 'hearing-screenshot/main/0001'],
    na: { empty: 'N4' },
  },
  {
    screenCode: 'SCR-23',
    route: '/users',
    url: '/users',
    actor: 'workspace-admin',
    fixtures: ['user/workspace-admin/0001', 'user/inactive/0001'],
    na: { empty: 'N7' },
  },
  {
    screenCode: 'SCR-24',
    route: '/users/[id]',
    url: `/users/${DEMO.userId}`,
    actor: 'workspace-admin',
    fixtures: ['user/member/0001', 'user-workspace/member/0001'],
    na: { empty: 'N4' },
  },
  {
    screenCode: 'SCR-25',
    route: '/settings/account',
    url: '/settings/account',
    actor: 'member',
    fixtures: ['user/member/0001', 'user-setting/member/0001'],
    na: { empty: 'N7', bulk: 'N5' },
  },
  {
    screenCode: 'SCR-26',
    route: '/settings/notion',
    url: '/settings/notion',
    actor: 'workspace-admin',
    fixtures: ['notion-integration/url/0001'],
    na: { bulk: 'N5' },
  },
  {
    screenCode: 'SCR-27',
    route: '/settings/auth',
    url: '/settings/auth',
    actor: 'workspace-admin',
    fixtures: ['idp-connection/active/0001', 'idp-connection/disabled/0001'],
    na: { bulk: 'N5' },
  },
  {
    screenCode: 'SCR-28',
    route: '/settings/coefficients',
    url: '/settings/coefficients',
    actor: 'workspace-admin',
    fixtures: ['tenant-coefficient/main/0001', 'metrics-rollup/tenant-daily/0001'],
    na: {},
  },
];

function buildStates(spec: RouteSpec): Record<RouteState, Applicability> {
  const states = {} as Record<RouteState, Applicability>;
  for (const state of ROUTE_STATES) {
    const reason = spec.na[state];
    if (reason !== undefined) {
      states[state] = { kind: 'notApplicable', reason };
      continue;
    }
    const stateReach = STATE_REACH[state];
    const step: ReachStep = {
      actor: spec.actor,
      url: spec.url,
      fixtures: [...spec.fixtures, ...stateReach.fixtures],
      ...(stateReach.operation === undefined ? {} : { operation: stateReach.operation }),
    };
    states[state] = { kind: 'applicable', reach: [step] };
  }
  return states;
}

export const COVERAGE_MATRIX: readonly RouteCoverage[] = ROUTE_SPECS.map((spec) => ({
  screenCode: spec.screenCode,
  route: spec.route,
  states: buildStates(spec),
}));
