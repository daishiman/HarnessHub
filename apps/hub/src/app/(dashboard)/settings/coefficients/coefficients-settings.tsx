'use client';

/**
 * 見積係数フォーム (AD-4)。GET/PATCH /api/v1/tenant/coefficients を叩く。
 * `updateTenantCoefficientsRequestSchema` は3項目とも optional の部分更新契約なので、
 * 変更されたフィールドだけを PATCH body に含める。
 */
import type { TenantCoefficientsResponse, UpdateTenantCoefficientsRequest } from '@harness-hub/schemas';
import { Alert, Button, TextInput } from '@harness-hub/ui';
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
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '見積係数を取得できませんでした。');
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
      try {
        const annualHours = Number.parseInt(form.annualHours, 10);
        if (!Number.isInteger(annualHours) || annualHours <= 0) {
          setError('年間稼働時間は正の整数で入力してください。');
          return;
        }
        const minutesPerRun = Number.parseInt(form.minutesPerRun, 10);
        if (!Number.isInteger(minutesPerRun) || minutesPerRun <= 0) {
          setError('1回あたりの実行時間は正の整数で入力してください。');
          return;
        }
        const sheetReductionRate = Number(form.sheetReductionRate);
        if (!Number.isFinite(sheetReductionRate) || sheetReductionRate < 0 || sheetReductionRate > 1) {
          setError('シート削減率は 0 以上 1 以下の数値で入力してください。');
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
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '見積係数の更新に失敗しました。');
      } finally {
        setSaving(false);
      }
    },
    [current, form, tenantId],
  );

  if (loading) return <p aria-live="polite">読み込み中です。</p>;
  if (current === null || form === null) return <p role="alert">見積係数を取得できませんでした。</p>;

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="エラー" description={error} />}
      {notice === null ? null : <Alert tone="success" title="更新しました" description={notice} />}
      <p>最終更新者: {current.updated_by}</p>
      <form aria-label="見積係数の編集" onSubmit={(event) => void save(event)}>
        <TextInput
          label="年間稼働時間 (時間)"
          name="annualHours"
          inputMode="numeric"
          required
          value={form.annualHours}
          onChange={(event) => setForm({ ...form, annualHours: event.target.value })}
        />
        <TextInput
          label="1回あたりの実行時間 (分)"
          name="minutesPerRun"
          inputMode="numeric"
          required
          value={form.minutesPerRun}
          onChange={(event) => setForm({ ...form, minutesPerRun: event.target.value })}
        />
        <TextInput
          label="シート削減率 (0〜1)"
          name="sheetReductionRate"
          inputMode="decimal"
          required
          value={form.sheetReductionRate}
          onChange={(event) => setForm({ ...form, sheetReductionRate: event.target.value })}
        />
        <Button type="submit" disabled={saving}>
          保存する
        </Button>
      </form>
    </>
  );
}
