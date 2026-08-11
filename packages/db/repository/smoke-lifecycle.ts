/** production smoke の全 fixture が参加する共通 lifecycle 契約。 */
export const SMOKE_FIXTURE_KINDS = ['database', 'hearing', 'coverage', 'publish'] as const;
export type SmokeFixtureKind = (typeof SMOKE_FIXTURE_KINDS)[number];

/** 未指定時の lease TTL。実行中の別 run を保護しつつ、残骸を定期 sweeper が回収できる長さ。 */
export const DEFAULT_SMOKE_FIXTURE_TTL_MINUTES = 30;

/** 使い捨て fixture の素性。専用 lease 台帳へ保存し、表示名や slug へは埋め込まない。 */
export interface SmokeFixtureLifecycle {
  readonly runId: string;
  readonly kind: SmokeFixtureKind;
  readonly expiresAt: number;
}

/** 回収候補の tenant 1 件。呼び出し側はこの `tenantId` をそのまま cleanup へ渡す。 */
export interface SmokeTenantSweepCandidate {
  readonly tenantId: string;
  readonly slug: string;
  readonly runId: string;
  readonly kind: SmokeFixtureKind;
  readonly expiresAt: number;
}

/** run_id に許す文字。台帳・ログ・artifact の間で同じ値を安全に扱える集合へ限定する。 */
const RUN_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

/** 任意文字列を run_id の値域へ落とす。CI の run id と手元実行の識別子を同じ形式にそろえる。 */
export function normalizeSmokeRunId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 128);
  if (!RUN_ID_PATTERN.test(normalized)) {
    throw new Error(`smoke run id として使える文字が残りませんでした (${value})`);
  }
  return normalized;
}

/**
 * TTL env を分へ変換する。未指定だけが既定値を使い、空文字・小数・0・負数・NaN は拒否する。
 * 不正値を既定値へ丸めると設定事故を隠すため、必ず fail-closed（安全側で失敗）にする。
 */
export function parseSmokeFixtureTtlMinutes(
  raw: string | undefined,
  defaultMinutes: number = DEFAULT_SMOKE_FIXTURE_TTL_MINUTES,
): number {
  if (!Number.isSafeInteger(defaultMinutes) || defaultMinutes < 1) {
    throw new Error(`smoke fixture の既定 TTL は 1 以上の整数である必要があります (${defaultMinutes})`);
  }
  if (raw === undefined) return defaultMinutes;
  const normalized = raw.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new Error(`HUB_SMOKE_FIXTURE_TTL_MINUTES は 1 以上の整数である必要があります (${raw})`);
  }
  const minutes = Number(normalized);
  if (!Number.isSafeInteger(minutes)) {
    throw new Error(`HUB_SMOKE_FIXTURE_TTL_MINUTES が安全な整数の範囲外です (${raw})`);
  }
  return minutes;
}

/** run id / kind / TTL を検証して、DB 台帳へ保存できる lifecycle を作る。 */
export function createSmokeFixtureLifecycle(input: {
  readonly runId: string;
  readonly kind: SmokeFixtureKind;
  readonly now?: number;
  readonly ttlMinutes: number;
}): SmokeFixtureLifecycle {
  const runId = normalizeSmokeRunId(input.runId);
  if (!SMOKE_FIXTURE_KINDS.includes(input.kind)) {
    throw new Error(`未知の smoke fixture kind です (${input.kind})`);
  }
  if (!Number.isSafeInteger(input.ttlMinutes) || input.ttlMinutes < 1) {
    throw new Error(`smoke fixture TTL は 1 以上の整数である必要があります (${input.ttlMinutes})`);
  }
  const now = input.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now < 0) throw new Error(`smoke fixture の now が不正です (${now})`);
  const expiresAt = now + input.ttlMinutes * 60_000;
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    throw new Error(`smoke fixture の expiresAt が安全な epoch ミリ秒ではありません (${expiresAt})`);
  }
  return { runId, kind: input.kind, expiresAt };
}

/**
 * 回収してよいか。
 *
 * 期限切れ (`expiresAt <= now`) か、**自分の run が作った** fixture のときだけ true。
 * 前者だけだと中断された run の後始末に TTL 分待つことになり、後者だけだと過去 run の残骸を拾えない。
 */
export function isSweepableSmokeFixture(
  lifecycle: SmokeFixtureLifecycle,
  input: { readonly now: number; readonly runId?: string | undefined },
): boolean {
  if (input.runId !== undefined && lifecycle.runId === input.runId) return true;
  return lifecycle.expiresAt <= input.now;
}
