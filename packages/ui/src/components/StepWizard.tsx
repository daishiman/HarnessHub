'use client';

/** ステップウィザード。現在地の明示・戻る/次へ・step 単位 validation の受け口を統一する。 */
import { type ReactNode, useState } from 'react';

import { colorVar, spaceVar } from '../internal/style.js';
import { useUi } from '../theme/UiProvider.js';
import { Button } from './Button.js';
import { ProgressBar } from './Progress.js';

export interface WizardStep {
  id: string;
  title: string;
  content: ReactNode;
}

export interface StepWizardProps {
  /** ウィザード全体が何の手続きかの説明。 */
  label: string;
  steps: readonly WizardStep[];
  /** 現在位置を外部管理する場合に渡す。 */
  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  /**
   * 次へ進めるか。step 単位の validation 結果を渡す。
   * 既定は true だが、フォームを持つ step では必ず明示すること。
   */
  canProceed?: boolean;
  /** 最終ステップでの完了操作。 */
  onComplete?: () => void;
}

export function StepWizard({
  label,
  steps,
  activeIndex,
  defaultActiveIndex = 0,
  onActiveIndexChange,
  canProceed = true,
  onComplete,
}: StepWizardProps): ReactNode {
  const { t } = useUi();
  const [internalIndex, setInternalIndex] = useState(defaultActiveIndex);
  const currentIndex = activeIndex ?? internalIndex;
  const currentStep = steps[currentIndex];

  const goTo = (index: number): void => {
    const clamped = Math.min(steps.length - 1, Math.max(0, index));
    if (activeIndex === undefined) setInternalIndex(clamped);
    onActiveIndexChange?.(clamped);
  };

  const isLast = currentIndex === steps.length - 1;

  return (
    <section aria-label={label}>
      <ProgressBar
        label={`${label} ${t('wizard.progress')}`}
        value={steps.length <= 1 ? 100 : (currentIndex / (steps.length - 1)) * 100}
      />

      {/* 現在地は色ではなく aria-current と番号テキストで伝える */}
      <ol style={{ display: 'flex', gap: spaceVar(3), listStyle: 'none', padding: 0 }}>
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? 'step' : undefined}
              style={{
                color: isCurrent ? colorVar('primary') : colorVar('textMuted'),
                fontWeight: isCurrent ? 'var(--hh-font-weight-bold)' : 'var(--hh-font-weight-normal)',
              }}
            >
              {`${t('wizard.stepLabel')} ${index + 1}: ${step.title}`}
            </li>
          );
        })}
      </ol>

      <div style={{ padding: `${spaceVar(4)} 0` }}>
        <h2 style={{ fontSize: 'var(--hh-font-size-lg)' }}>{currentStep?.title}</h2>
        {currentStep?.content}
      </div>

      <div style={{ display: 'flex', gap: spaceVar(2) }}>
        <Button variant="secondary" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
          {t('action.back')}
        </Button>
        {isLast ? (
          <Button variant="primary" onClick={onComplete} disabled={!canProceed}>
            {t('action.finish')}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => goTo(currentIndex + 1)} disabled={!canProceed}>
            {t('action.next')}
          </Button>
        )}
      </div>
    </section>
  );
}
