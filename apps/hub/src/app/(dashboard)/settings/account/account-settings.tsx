'use client';

/**
 * S18 アカウント設定 (AD-2)。プロフィール・通知設定・表示設定の3セクション。
 *
 * - プロフィールは `GET/PATCH /api/v1/me`。編集できるのは name のみ (`updateMeRequestSchema` の値域どおり)。
 *   email/department/role は自己編集不可な項目として読み取り専用表示にする。
 * - 通知設定・表示設定は on/off・選択式のみで、共通部品に Checkbox/Switch が無いため
 *   (`packages/ui` は Select/TextInput のみ提供) UOA-A11Y-006 の確定済み契約と同じ Select で表現する。
 * - 表示設定を保存できたら `useUi()` の setTheme/setDensity/setLocale をその場で呼び、
 *   リロードなしで反映する。API 側の 'system' は UiProvider 側の 'auto' に対応する
 *   (DB 列の既定値 'system' と UI 部品の命名 'auto' が異なるため、ここで変換する)。
 */
import type {
  DisplaySettingsResponse,
  MeResponse,
  NotificationSettingsResponse,
  UpdateDisplaySettingsRequest,
  UpdateNotificationSettingsRequest,
} from '@harness-hub/schemas';
import type { ThemePreference as UiThemePreference } from '@harness-hub/ui';
import { Alert, Select, TextInput, useUi } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

interface AccountSettingsProps {
  readonly tenantId: string;
}

const ON_OFF_OPTIONS = [
  { value: 'true', label: '有効' },
  { value: 'false', label: '無効' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
  { value: 'system', label: 'OS設定に合わせる' },
];

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'ゆったり' },
  { value: 'compact', label: 'コンパクト' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
];

/** API 契約側の 'system' と UiProvider 側の 'auto' の対応づけ。 */
function toUiTheme(theme: DisplaySettingsResponse['theme']): UiThemePreference {
  return theme === 'system' ? 'auto' : theme;
}

export function AccountSettings({ tenantId }: AccountSettingsProps): ReactNode {
  const ui = useUi();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettingsResponse | null>(null);
  const [display, setDisplay] = useState<DisplaySettingsResponse | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const scopeHeaders = useMemo((): HeadersInit => ({ 'x-harness-tenant-id': tenantId }), [tenantId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meResponse, notificationResponse, displayResponse] = await Promise.all([
        fetch('/api/v1/me', { credentials: 'same-origin', headers: scopeHeaders }),
        fetch('/api/v1/me/notification-settings', { credentials: 'same-origin', headers: scopeHeaders }),
        fetch('/api/v1/me/display-settings', { credentials: 'same-origin', headers: scopeHeaders }),
      ]);
      if (!meResponse.ok || !notificationResponse.ok || !displayResponse.ok) {
        throw new Error('設定を取得できませんでした。');
      }
      const meBody = (await meResponse.json()) as MeResponse;
      const notificationBody = (await notificationResponse.json()) as NotificationSettingsResponse;
      const displayBody = (await displayResponse.json()) as DisplaySettingsResponse;
      setMe(meBody);
      setName(meBody.name);
      setNotifications(notificationBody);
      setDisplay(displayBody);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '設定を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [scopeHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveName = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      try {
        const response = await fetch('/api/v1/me', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { ...scopeHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('プロフィールの更新に失敗しました。');
        setMe((await response.json()) as MeResponse);
        setNotice('プロフィールを更新しました。');
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'プロフィールの更新に失敗しました。');
      }
    },
    [name, scopeHeaders],
  );

  const saveNotifications = useCallback(
    async (patch: UpdateNotificationSettingsRequest): Promise<void> => {
      try {
        const response = await fetch('/api/v1/me/notification-settings', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { ...scopeHeaders, 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!response.ok) throw new Error('通知設定の更新に失敗しました。');
        setNotifications((await response.json()) as NotificationSettingsResponse);
        setNotice('通知設定を更新しました。');
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '通知設定の更新に失敗しました。');
      }
    },
    [scopeHeaders],
  );

  const saveDisplay = useCallback(
    async (patch: UpdateDisplaySettingsRequest): Promise<void> => {
      try {
        const response = await fetch('/api/v1/me/display-settings', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { ...scopeHeaders, 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!response.ok) throw new Error('表示設定の更新に失敗しました。');
        const result = (await response.json()) as DisplaySettingsResponse;
        setDisplay(result);
        ui.setTheme(toUiTheme(result.theme));
        ui.setDensity(result.density);
        ui.setLocale(result.language);
        setNotice('表示設定を更新しました。');
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '表示設定の更新に失敗しました。');
      }
    },
    [scopeHeaders, ui],
  );

  if (loading) return <p aria-live="polite">読み込み中です。</p>;
  if (me === null || notifications === null || display === null) {
    return <p role="alert">設定を取得できませんでした。</p>;
  }

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="エラー" description={error} />}
      {notice === null ? null : <Alert tone="success" title="更新しました" description={notice} />}

      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading">プロフィール</h2>
        <dl>
          <dt>メールアドレス</dt>
          <dd>{me.email}</dd>
          <dt>部門</dt>
          <dd>{me.department ?? '—'}</dd>
        </dl>
        <form aria-label="プロフィールの編集" onSubmit={(event) => void saveName(event)}>
          <TextInput
            label="表示名"
            name="displayName"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit">保存する</button>
        </form>
      </section>

      <section aria-labelledby="notification-settings-heading">
        <h2 id="notification-settings-heading">通知設定</h2>
        <Select
          label="生成完了の通知"
          name="notify_generation"
          options={ON_OFF_OPTIONS}
          value={String(notifications.notify_generation)}
          onChange={(event) => void saveNotifications({ notify_generation: event.target.value === 'true' })}
        />
        <Select
          label="レビュー依頼の通知"
          name="notify_review"
          options={ON_OFF_OPTIONS}
          value={String(notifications.notify_review)}
          onChange={(event) => void saveNotifications({ notify_review: event.target.value === 'true' })}
        />
        <Select
          label="週次レポートの通知"
          name="notify_weekly"
          options={ON_OFF_OPTIONS}
          value={String(notifications.notify_weekly)}
          onChange={(event) => void saveNotifications({ notify_weekly: event.target.value === 'true' })}
        />
        <Select
          label="フィードバック依頼の通知"
          name="notify_feedback"
          options={ON_OFF_OPTIONS}
          value={String(notifications.notify_feedback)}
          onChange={(event) => void saveNotifications({ notify_feedback: event.target.value === 'true' })}
        />
        <Select
          label="メール通知チャンネル"
          name="email_enabled"
          options={ON_OFF_OPTIONS}
          value={String(notifications.email_enabled)}
          onChange={(event) => void saveNotifications({ email_enabled: event.target.value === 'true' })}
        />
      </section>

      <section aria-labelledby="display-settings-heading">
        <h2 id="display-settings-heading">表示設定</h2>
        <Select
          label="テーマ"
          name="theme"
          options={THEME_OPTIONS}
          value={display.theme}
          onChange={(event) => void saveDisplay({ theme: event.target.value as DisplaySettingsResponse['theme'] })}
        />
        <Select
          label="表示密度"
          name="density"
          options={DENSITY_OPTIONS}
          value={display.density}
          onChange={(event) => void saveDisplay({ density: event.target.value as DisplaySettingsResponse['density'] })}
        />
        <Select
          label="言語"
          name="language"
          options={LANGUAGE_OPTIONS}
          value={display.language}
          onChange={(event) =>
            void saveDisplay({ language: event.target.value as DisplaySettingsResponse['language'] })
          }
        />
      </section>
    </>
  );
}
