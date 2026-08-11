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
  SessionRole,
  UpdateDisplaySettingsRequest,
  UpdateNotificationSettingsRequest,
} from '@harness-hub/schemas';
import type { ThemePreference as UiThemePreference } from '@harness-hub/ui';
import { Alert, Button, DefinitionList, LiveStatus, Panel, Select, Stack, TextInput, useUi } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

interface AccountSettingsProps {
  readonly tenantId: string;
}

const ROLE_LABELS: Readonly<Record<SessionRole, string>> = {
  'provider-admin': 'プロバイダー管理者',
  'workspace-admin': 'ワークスペース管理者',
  member: 'メンバー',
};

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

/** 面ごとの結果表示。3 つの面が別々の API を叩くので、結果もその面の中で返す。 */
type SettingsSection = 'profile' | 'notifications' | 'display';

interface SectionFeedback {
  readonly tone: 'success' | 'danger';
  readonly message: string;
}

/** 面の中に置く結果表示。見出しは成否で言い分けて、色だけに頼らせない。 */
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

export function AccountSettings({ tenantId }: AccountSettingsProps): ReactNode {
  const ui = useUi();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettingsResponse | null>(null);
  const [display, setDisplay] = useState<DisplaySettingsResponse | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  // 「設定を読み込めなかった」と「変更を保存できなかった」を 1 つの state で持たない。
  // 読み込みの失敗は画面全体の話、保存の失敗は操作した面だけの話で、出す場所も違う。
  const [loadError, setLoadError] = useState<string | null>(null);
  // 保存の結果は操作した面の中に返す。この画面は 3 つの面が別々の API を叩くので、
  // 画面上端にまとめて出すと「どの操作の結果なのか」が読み手側にしか分からなくなる。
  const [feedback, setFeedback] = useState<Partial<Record<SettingsSection, SectionFeedback>>>({});

  const report = useCallback((section: SettingsSection, tone: SectionFeedback['tone'], message: string): void => {
    setFeedback((current) => ({ ...current, [section]: { tone, message } }));
  }, []);

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
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : '設定を取得できませんでした。');
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
        report('profile', 'success', 'プロフィールを更新しました。');
      } catch (cause) {
        report('profile', 'danger', cause instanceof Error ? cause.message : 'プロフィールの更新に失敗しました。');
      }
    },
    [name, report, scopeHeaders],
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
        report('notifications', 'success', '通知設定を更新しました。');
      } catch (cause) {
        report('notifications', 'danger', cause instanceof Error ? cause.message : '通知設定の更新に失敗しました。');
      }
    },
    [report, scopeHeaders],
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
        report('display', 'success', '表示設定を更新しました。');
      } catch (cause) {
        report('display', 'danger', cause instanceof Error ? cause.message : '表示設定の更新に失敗しました。');
      }
    },
    [report, scopeHeaders, ui],
  );

  if (loading) return <LiveStatus>アカウント設定を読み込み中です。</LiveStatus>;
  // 読み込めていない = 画面に出せる中身が無い。ここだけが画面全体を置き換える条件で、
  // 保存の失敗ではこの分岐に入らない (入力中の値を消さない)
  if (me === null || notifications === null || display === null) {
    return (
      <Panel>
        <Stack gap={3}>
          <p role="alert" style={{ margin: 0 }}>
            {loadError ?? '設定を取得できませんでした。'}
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
      {/* 見出しは Panel が出す。id は通知ベルからの飛び先 (UIS-NAV-005) なので section 側に残す */}
      <section id="profile-heading" aria-label="プロフィール">
        <Panel title="プロフィール" description="ご自身の表示名を変えられます。">
          <Stack gap={3}>
            {/* 自分では変えられない項目は、1 つの対象の属性なので定義リストで並べる (§5-1 の写し方) */}
            <DefinitionList
              label="変更できない項目"
              columns={2}
              items={[
                { term: 'メールアドレス', description: me.email, hint: '管理者が変更します。' },
                { term: '部門', description: me.department ?? '未登録', hint: '管理者が変更します。' },
                { term: 'ロール', description: ROLE_LABELS[me.role], hint: '管理者が変更します。' },
              ]}
            />
            <form aria-label="プロフィールの編集" onSubmit={(event) => void saveName(event)}>
              <Stack gap={3}>
                <TextInput
                  label="表示名"
                  name="displayName"
                  description="画面右上や一覧に表示される名前です。"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                {/* 保存の結果は押したボタンの隣に出す。画面上端の帯に出すと、
                    入力欄を見ている利用者の視野の外で結果が告知されることになる */}
                <SectionResult result={feedback.profile} />
                <div>
                  <Button type="submit">表示名を保存する</Button>
                </div>
              </Stack>
            </form>
          </Stack>
        </Panel>
      </section>

      <section id="notification-settings-heading" aria-label="通知設定">
        <Panel title="通知設定" description="受け取りたい知らせだけを有効にできます。変更するとすぐ保存されます。">
          <Stack gap={3}>
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
            {/* 選ぶとすぐ保存される面なので、結果もこの面の中で返す */}
            <SectionResult result={feedback.notifications} />
          </Stack>
        </Panel>
      </section>

      <section id="display-settings-heading" aria-label="表示設定">
        <Panel title="表示設定" description="画面の見た目と言語を切り替えます。選ぶとすぐ反映されます。">
          <Stack gap={3}>
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
              onChange={(event) =>
                void saveDisplay({ density: event.target.value as DisplaySettingsResponse['density'] })
              }
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
            <SectionResult result={feedback.display} />
          </Stack>
        </Panel>
      </section>
    </Stack>
  );
}
