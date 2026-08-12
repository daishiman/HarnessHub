'use client';

/**
 * Notion連携の設定画面。`account-settings.tsx` と同じ骨格 (面ごとの結果表示・
 * 読込失敗と保存失敗の書き分け) を踏襲する。
 *
 * - mode ('url' | 'api_key') を切り替えて登録する。1 workspace につき登録は 1 件
 *   (mode を切り替えると既存の登録を更新する — API 側の upsert がその前提)。
 * - api_key はサーバーから絶対に平文で返らない (`api_key_masked` のみ)。
 *   再保存時に api_key 欄を空のままにすると、既存の登録済みキーを維持する
 *   (`checkNotionIntegrationRequirements` の判定と対応する挙動)。
 */
import type { NotionIntegrationMode, NotionIntegrationResponse } from '@harness-hub/schemas';
import { Alert, Button, DefinitionList, LiveStatus, Panel, Select, Stack, TextInput } from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

interface NotionSettingsProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /** `notion-integration.write` を満たす場合だけ保存・解除 UI を出す。 */
  readonly canManage: boolean;
}

interface SectionFeedback {
  readonly tone: 'success' | 'danger';
  readonly message: string;
}

/** 面の中に置く結果表示。`account-settings.tsx` の `SectionResult` と同じ形。 */
function SectionResult({ result }: { readonly result: SectionFeedback | undefined }): ReactNode {
  if (result === undefined) return null;
  return (
    <Alert
      tone={result.tone}
      title={result.tone === 'success' ? '更新しました' : '保存できませんでした'}
      description={result.message}
    />
  );
}

const MODE_OPTIONS: ReadonlyArray<{ readonly value: NotionIntegrationMode; readonly label: string }> = [
  { value: 'url', label: 'URL方式 (Notionページのリンクを登録)' },
  { value: 'api_key', label: 'APIキー方式 (Notion Integrationのキーを登録)' },
];

export function NotionSettings({ tenantId, workspaceId, canManage }: NotionSettingsProps): ReactNode {
  const [integration, setIntegration] = useState<NotionIntegrationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<SectionFeedback | undefined>(undefined);

  const [mode, setMode] = useState<NotionIntegrationMode>('url');
  const [pageUrl, setPageUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const scopeHeaders = useMemo(
    (): HeadersInit => ({ 'x-harness-tenant-id': tenantId, 'x-harness-workspace-id': workspaceId }),
    [tenantId, workspaceId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/me/notion-integration', {
        credentials: 'same-origin',
        headers: scopeHeaders,
      });
      if (!response.ok) throw new Error('Notion連携の設定を取得できませんでした。');
      const body = (await response.json()) as NotionIntegrationResponse | null;
      setIntegration(body);
      if (body !== null) {
        setMode(body.mode);
        setPageUrl(body.page_url ?? '');
      }
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Notion連携の設定を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [scopeHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setSaving(true);
      try {
        const trimmedPageUrl = pageUrl.trim();
        const trimmedApiKey = apiKey.trim();
        const response = await fetch('/api/v1/me/notion-integration', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { ...scopeHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({
            mode,
            // 空欄はどちらも「未指定 (=送らない)」として扱う。api_key を空欄のまま保存すると
            // 既存の登録済みキーを維持する挙動 (service 層の判定) に揃える。
            ...(trimmedPageUrl.length > 0 ? { page_url: trimmedPageUrl } : {}),
            ...(trimmedApiKey.length > 0 ? { api_key: trimmedApiKey } : {}),
          }),
        });
        if (!response.ok) {
          const problem = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(problem?.detail ?? '保存できませんでした。');
        }
        const result = (await response.json()) as NotionIntegrationResponse;
        setIntegration(result);
        // 保存済みのAPIキーを画面の入力欄に残さない (マスク済み表示は DefinitionList 側で行う)。
        setApiKey('');
        setFeedback({ tone: 'success', message: 'Notion連携を保存しました。' });
      } catch (cause) {
        setFeedback({ tone: 'danger', message: cause instanceof Error ? cause.message : '保存できませんでした。' });
      } finally {
        setSaving(false);
      }
    },
    [apiKey, mode, pageUrl, scopeHeaders],
  );

  const remove = useCallback(async (): Promise<void> => {
    setDeleting(true);
    try {
      const response = await fetch('/api/v1/me/notion-integration', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: scopeHeaders,
      });
      if (!response.ok && response.status !== 204) throw new Error('連携を解除できませんでした。');
      setIntegration(null);
      setPageUrl('');
      setApiKey('');
      setMode('url');
      setFeedback({ tone: 'success', message: 'Notion連携を解除しました。' });
    } catch (cause) {
      setFeedback({ tone: 'danger', message: cause instanceof Error ? cause.message : '連携を解除できませんでした。' });
    } finally {
      setDeleting(false);
    }
  }, [scopeHeaders]);

  if (loading) return <LiveStatus>Notion連携の設定を読み込み中です。</LiveStatus>;
  if (loadError !== null && integration === null) {
    // 「未登録」は正常系 (body が null で 200) なので、ここに来るのは本当の読込失敗のときだけ。
    return (
      <Panel>
        <Stack gap={3}>
          <p role="alert" style={{ margin: 0 }}>
            {loadError}
          </p>
          <div>
            <Button type="button" variant="secondary" onClick={() => void load()}>
              読み込み直す
            </Button>
          </div>
        </Stack>
      </Panel>
    );
  }

  return (
    <Stack gap={4}>
      <section id="notion-integration-heading" aria-label="Notion連携">
        <Panel
          title="Notion連携"
          description="URL方式またはAPIキー方式のいずれかで、Notionのページ・ワークスペースを登録します。"
        >
          <Stack gap={3}>
            {integration !== null ? (
              <DefinitionList
                label="現在の登録内容"
                columns={2}
                items={[
                  { term: '方式', description: integration.mode === 'url' ? 'URL方式' : 'APIキー方式' },
                  { term: 'ページURL', description: integration.page_url ?? '未登録' },
                  {
                    term: 'APIキー',
                    description: integration.api_key_masked ?? '未登録',
                    hint: '末尾4文字のみ表示しています。',
                  },
                ]}
              />
            ) : (
              <p style={{ margin: 0 }}>まだNotion連携が登録されていません。</p>
            )}

            {canManage ? (
              <form aria-label="Notion連携の登録・変更" onSubmit={(event) => void save(event)}>
                <Stack gap={3}>
                  <Select
                    label="連携方式"
                    name="mode"
                    options={MODE_OPTIONS}
                    value={mode}
                    onChange={(event) => setMode(event.target.value as NotionIntegrationMode)}
                  />
                  <TextInput
                    label="NotionページのURL"
                    name="pageUrl"
                    description={
                      mode === 'url'
                        ? 'URL方式では必須です。'
                        : '任意です。登録しておくとドキュメント画面から「Notionで開く」導線が使えます。'
                    }
                    required={mode === 'url'}
                    value={pageUrl}
                    onChange={(event) => setPageUrl(event.target.value)}
                    placeholder="https://www.notion.so/..."
                  />
                  {mode === 'api_key' ? (
                    <TextInput
                      label="Notion Integration APIキー"
                      name="apiKey"
                      type="password"
                      description="登録済みのキーを変更しない場合は空欄のままにしてください。"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder={integration?.api_key_masked ?? undefined}
                    />
                  ) : null}
                  <SectionResult result={feedback} />
                  <div style={{ display: 'flex', gap: 'var(--hh-space-3)' }}>
                    <Button type="submit" disabled={saving}>
                      {saving ? '保存中…' : '保存する'}
                    </Button>
                    {integration !== null ? (
                      <Button type="button" variant="secondary" disabled={deleting} onClick={() => void remove()}>
                        {deleting ? '解除中…' : '連携を解除する'}
                      </Button>
                    ) : null}
                  </div>
                </Stack>
              </form>
            ) : (
              <p style={{ margin: 0 }}>閲覧のみ可能です。変更や解除はワークスペース管理者に依頼してください。</p>
            )}
          </Stack>
        </Panel>
      </section>
    </Stack>
  );
}
