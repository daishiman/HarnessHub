'use client';

/** トースト通知。共通シェルに常駐する 1 つのライブリージョンへ集約し、読み上げの取りこぼしを防ぐ。 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { colorVar, radiusVar, spaceVar } from '../internal/style.js';
import { statusToneColors, type StatusTone } from '../i18n/status-vocabulary.js';
import { useUiText } from '../theme/UiProvider.js';

export interface ToastOptions {
  title: string;
  // 省略可能な表示 prop は `| undefined` を明示する (理由は FormFieldProps のコメント)
  description?: string | undefined;
  tone?: StatusTone | undefined;
  /** 自動的に消えるまでの時間 (ms)。0 を指定すると消えない。 */
  durationMs?: number | undefined;
}

/**
 * 表示中のトースト 1 件。`Required<Omit<ToastOptions, ...>>` で導出しないのは、
 * `exactOptionalPropertyTypes` 下では `Required<>` が `?` を外しても宣言型の `| undefined` を
 * 残すため、`tone` が undefined を含んだまま index 参照に使われてしまうから。明示的に書く。
 */
export interface ToastItem {
  id: string;
  title: string;
  description?: string | undefined;
  tone: StatusTone;
  durationMs: number;
}

export interface ToastContextValue {
  toasts: readonly ToastItem[];
  /** トーストを出す。戻り値は個別に閉じるための id。 */
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
  defaultDurationMs?: number | undefined;
}

/** トーストの状態と表示領域を提供する。共通シェルの最上位に 1 つだけ置く。 */
export function ToastProvider({ children, defaultDurationMs = 6000 }: ToastProviderProps): ReactNode {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const sequence = useRef(0);
  const t = useUiText();

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions): string => {
      sequence.current += 1;
      const id = `toast-${sequence.current}`;
      const durationMs = options.durationMs ?? defaultDurationMs;

      setToasts((current) => [
        ...current,
        { id, title: options.title, description: options.description, tone: options.tone ?? 'primary', durationMs },
      ]);

      if (durationMs > 0) {
        setTimeout(() => dismissToast(id), durationMs);
      }
      return id;
    },
    [defaultDurationMs, dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        ライブリージョンは常に DOM 上に存在させる。
        通知が出た瞬間に領域ごと現れる作りだと、支援技術が変化を検出できないことがある。
      */}
      <div
        role="status"
        aria-live="polite"
        aria-label={t('notification.region')}
        style={{
          position: 'fixed',
          insetInlineEnd: spaceVar(4),
          insetBlockEnd: spaceVar(4),
          display: 'flex',
          flexDirection: 'column',
          gap: spaceVar(2),
        }}
      >
        {toasts.map((toast) => {
          const { foreground, background } = statusToneColors[toast.tone];
          return (
            <div
              key={toast.id}
              style={{
                minWidth: '240px',
                padding: spaceVar(3),
                borderRadius: radiusVar('md'),
                border: `1px solid ${colorVar(foreground)}`,
                background: colorVar(background),
                color: colorVar(foreground),
              }}
            >
              <strong>{toast.title}</strong>
              {toast.description ? <p style={{ margin: 0 }}>{toast.description}</p> : null}
              <button
                type="button"
                data-hh-focusable=""
                onClick={() => dismissToast(toast.id)}
                style={{
                  marginTop: spaceVar(1),
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  color: 'inherit',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                {t('action.close')}
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** トーストを出す。ToastProvider の外で呼ぶと例外にする。 */
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast は ToastProvider の内側で呼び出してください');
  }
  return value;
}
