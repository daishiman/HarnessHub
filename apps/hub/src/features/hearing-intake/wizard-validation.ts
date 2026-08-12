import { HEARING_SHEET_FORM_LIMITS, type HearingSheetFormInput } from '@harness-hub/schemas';

import {
  CONSTRAINT_TAG_OPTIONS,
  CONTEXT_OPTIONS,
  EXPERTISE_OPTIONS,
  MOTIVATION_OPTIONS,
  ROLE_OPTIONS,
  SHARING_INTENT_OPTIONS,
  USAGE_PURPOSE_OPTIONS,
} from './profile-options.js';

function textWithinLimit(value: string, maxLength: number): boolean {
  const length = value.trim().length;
  return length > 0 && length <= maxLength;
}

function optionalTextWithinLimit(value: string | null, maxLength: number): boolean {
  return value === null || textWithinLimit(value, maxLength);
}

function optionalListIsValid(entries: readonly string[] | null, maxItems: number): boolean {
  if (entries === null) return true;
  return (
    entries.length <= maxItems &&
    entries.every((entry) => textWithinLimit(entry, HEARING_SHEET_FORM_LIMITS.shortTextLength))
  );
}

function hasOption<T extends string>(options: readonly { readonly value: T }[], value: unknown): value is T {
  return typeof value === 'string' && options.some((option) => option.value === value);
}

function optionalListValidationError(
  label: string,
  entries: readonly string[] | null,
  maxItems: number,
): string | undefined {
  if (entries === null) return undefined;
  if (entries.length > maxItems) {
    return `${label}は ${maxItems} 件以内で入力してください。`;
  }
  if (entries.some((entry) => entry.trim().length > HEARING_SHEET_FORM_LIMITS.shortTextLength)) {
    return `${label}は 1 件あたり ${HEARING_SHEET_FORM_LIMITS.shortTextLength} 文字以内で入力してください。`;
  }
  return undefined;
}

export function informationSourcesValidationError(sources: readonly string[] | null): string | undefined {
  return optionalListValidationError('情報源', sources, HEARING_SHEET_FORM_LIMITS.informationSources);
}

export function knowledgeAssetsValidationError(assets: readonly string[] | null): string | undefined {
  return optionalListValidationError('ナレッジ資産', assets, HEARING_SHEET_FORM_LIMITS.knowledgeAssets);
}

/** StepWizard の「次へ」と最終 POST 直前が共有する入力判定。 */
export function hearingIntakeStepIsValid(form: HearingSheetFormInput, stepIndex: number): boolean {
  switch (stepIndex) {
    case 0:
      return [form.taskName, form.company, form.applicant, form.domain].every((value) =>
        textWithinLimit(value, HEARING_SHEET_FORM_LIMITS.shortTextLength),
      );
    case 1:
      return (
        textWithinLimit(form.issue, HEARING_SHEET_FORM_LIMITS.requiredTextLength) &&
        textWithinLimit(form.tools, HEARING_SHEET_FORM_LIMITS.requiredTextLength) &&
        Number.isInteger(form.hours) &&
        form.hours >= 1 &&
        form.hours <= 160 &&
        Number.isInteger(form.people) &&
        form.people >= 1 &&
        form.people <= 500 &&
        Number.isInteger(form.salary) &&
        form.salary >= 0 &&
        form.salary <= 100_000_000
      );
    case 2:
      return (
        (form.usagePurpose === null || hasOption(USAGE_PURPOSE_OPTIONS, form.usagePurpose)) &&
        (form.expertise === null || hasOption(EXPERTISE_OPTIONS, form.expertise)) &&
        (form.role === null || hasOption(ROLE_OPTIONS, form.role)) &&
        (form.context === null || hasOption(CONTEXT_OPTIONS, form.context)) &&
        (form.motivation === null || hasOption(MOTIVATION_OPTIONS, form.motivation)) &&
        (form.sharingIntent === null || hasOption(SHARING_INTENT_OPTIONS, form.sharingIntent)) &&
        (form.constraintTags === null ||
          (form.constraintTags.length <= CONSTRAINT_TAG_OPTIONS.length &&
            form.constraintTags.every((tag) => hasOption(CONSTRAINT_TAG_OPTIONS, tag)))) &&
        optionalTextWithinLimit(form.shareTarget, HEARING_SHEET_FORM_LIMITS.shortTextLength) &&
        optionalListIsValid(form.informationSources, HEARING_SHEET_FORM_LIMITS.informationSources) &&
        optionalTextWithinLimit(form.trueProblem, HEARING_SHEET_FORM_LIMITS.requiredTextLength) &&
        optionalListIsValid(form.knowledgeAssets, HEARING_SHEET_FORM_LIMITS.knowledgeAssets)
      );
    case 3:
      return (
        textWithinLimit(form.features, HEARING_SHEET_FORM_LIMITS.requiredTextLength) &&
        textWithinLimit(form.output, HEARING_SHEET_FORM_LIMITS.requiredTextLength)
      );
    case 4:
      return [0, 1, 2, 3].every((index) => hearingIntakeStepIsValid(form, index));
    default:
      return false;
  }
}
