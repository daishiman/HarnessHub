'use client';

/**
 * 見積係数フォーム (AD-4)。GET/PATCH /api/v1/tenant/coefficients を叩く。
 * `updateTenantCoefficientsRequestSchema` は3項目とも optional の部分更新契約なので、
 * 変更されたフィールドだけを PATCH body に含める。
 */
import type { TenantCoefficientsResponse, UpdateTenantCoefficientsRequest } from '@harness-hub/schemas';
import { Alert, Button, DefinitionList, IdBadge, LiveStatus, Panel, Stack, TextInput } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

interface CoefficientsSettingsProps {
  readonly tenantId: string;
}

interface FormState {
  readonly annualHours: string;
  readonly minutesPerRun: string;
  readonly sheetReductionRate: string;
}

function toFormState(response: TenantCoefficientsResponse): FormState {
  return {
    annualHours: String(response.annual_hours),
    minutesPerRun: String(response.minutes_per_run),
    sheetReductionRate: String(response.sheet_reduction_rate),
  };
}

export function CoefficientsSettings({ tenantId }: CoefficientsSettingsProps): ReactNode {
  const [current, setCurrent] = useState<TenantCoefficientsResponse | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // 「読み込めなかった」と「保存できなかった」を 1 つの state で持たない。
  // 混ぜると、保存に失敗しただけで設定そのものが読めなくなったように見える。
  // 読み込みの失敗は画面全体の話、保存の失敗は押したボタンの話なので、出す場所も分ける。
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/tenant/coefficients', {
        credentials: 'same-origin',
        headers: { 'x-harness-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('見積係数を取得できませんでした。');
      const body = (await response.json()) as TenantCoefficientsResponse;
      setCurrent(body);
      setForm(toFormState(body));
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : '見積係数を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (form === null || current === null) return;
      setSaving(true);
      setNotice(null);
      setSaveError(null);
      try {
        const annualHours = Number.parseInt(form.annualHours, 10);
        if (!Number.isInteger(annualHours) || annualHours <= 0) {
          setSaveError('年間稼働時間は正の整数で入力してください。');
          return;
        }
        const minutesPerRun = Number.parseInt(form.minutesPerRun, 10);
        if (!Number.isInteger(minutesPerRun) || minutesPerRun <= 0) {
          setSaveError('1回あたりの実行時間は正の整数で入力してください。');
          return;
        }
        const sheetReductionRate = Number(form.sheetReductionRate);
        if (!Number.isFinite(sheetReductionRate) || sheetReductionRate < 0 || sheetReductionRate > 1) {
          setSaveError('シート削減率は 0 以上 1 以下の数値で入力してください。');
          return;
        }

        const patch: UpdateTenantCoefficientsRequest = {};
        if (annualHours !== current.annual_hours) patch.annual_hours = annualHours;
        if (minutesPerRun !== current.minutes_per_run) patch.minutes_per_run = minutesPerRun;
        if (sheetReductionRate !== current.sheet_reduction_rate) patch.sheet_reduction_rate = sheetReductionRate;

        if (Object.keys(patch).length === 0) {
          setNotice('変更はありません。');
          return;
        }

        const response = await fetch('/api/v1/tenant/coefficients', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'x-harness-tenant-id': tenantId, 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!response.ok) throw new Error('見積係数の更新に失敗しました。');
        const result = (await response.json()) as TenantCoefficientsResponse;
        setCurrent(result);
        setForm(toFormState(result));
        setNotice('見積係数を更新しました。');
        setSaveError(null);
      } catch (cause) {
        setSaveError(cause instanceof Error ? cause.message : '見積係数の更新に失敗しました。');
      } finally {
        setSaving(false);
      }
    },
    [current, form, tenantId],
  );

  if (loading) return <LiveStatus>見積係数を読み込んでいます。</LiveStatus>;
  // 読み込めていない = 画面に出せる中身が無い。ここだけが画面全体を置き換える条件で、
  // 保存の失敗ではこの分岐に入らない (入力中の値を消さない)
  if (current === null || form === null)
    return (
      <Panel>
        <Stack gap={3}>
          <p role="alert" style={{ margin: 0 }}>
            {loadError ?? '見積係数を取得できませんでした。'}
          </p>
          <div>
            <Button type="button" variant="secondary" onClick={() => void load()}>
              読み込み直す
            </Button>
          </div>
        </Stack>
      </Panel>
    );

  return (
    <Stack gap={4}>
      {notice === null ? null : <Alert tone="success" title="更新しました" description={notice} />}

      <Panel title="いまの設定" description="この係数は、ヒアリングシートの削減時間・削減額の試算に使われます。">
        <DefinitionList
          label="いまの見積係数"
          columns={2}
          items={[
            { term: '年間稼働時間', description: `${current.annual_hours} 時間` },
            { term: '1 回あたりの実行時間', description: `${current.minutes_per_run} 分` },
            { term: 'シート削減率', description: String(current.sheet_reduction_rate) },
            {
              term: '最後に変更した人',
              description:
                current.updated_by === 'system' || current.updated_by === 'system-default' ? (
                  'システム'
                ) : current.updated_by_name === undefined ? (
                  <IdBadge value={current.updated_by} label="利用者 ID" />
                ) : (
                  <Stack gap={1}>
                    <span>{current.updated_by_name}</span>
                    <IdBadge value={current.updated_by} label="利用者 ID" />
                  </Stack>
                ),
            },
          ]}
        />
      </Panel>

      <Panel title="係数を変更する">
        <form aria-label="見積係数の編集" onSubmit={(event) => void save(event)}>
          <Stack gap={3}>
            <TextInput
              label="年間稼働時間 (時間)"
              description="1 人が 1 年で働く時間。時間あたり単価の計算に使います。"
              name="annualHours"
              inputMode="numeric"
              required
              value={form.annualHours}
              onChange={(event) => setForm({ ...form, annualHours: event.target.value })}
            />
            <TextInput
              label="1 回あたりの実行時間 (分)"
              description="ツールを 1 回動かすのにかかる時間の目安です。"
              name="minutesPerRun"
              inputMode="numeric"
              required
              value={form.minutesPerRun}
              onChange={(event) => setForm({ ...form, minutesPerRun: event.target.value })}
            />
            <TextInput
              label="シート削減率 (0〜1)"
              description="今の工数のうち、どれだけ減らせると見込むかの割合です (0.35 なら 35%)。"
              name="sheetReductionRate"
              inputMode="decimal"
              required
              value={form.sheetReductionRate}
              onChange={(event) => setForm({ ...form, sheetReductionRate: event.target.value })}
            />
            {/* 保存の失敗は押したボタンの隣に出す。画面上端の帯に出すと、
                入力欄を見ている利用者の視野の外で失敗が告知されることになる */}
            {saveError === null ? null : <Alert tone="danger" title="保存できませんでした" description={saveError} />}
            <div>
              <Button type="submit" variant="primary" loading={saving} disabled={saving}>
                保存する
              </Button>
            </div>
          </Stack>
        </form>
      </Panel>
    </Stack>
  );
}
