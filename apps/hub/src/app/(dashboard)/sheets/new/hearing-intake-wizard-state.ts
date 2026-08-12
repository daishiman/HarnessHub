import type {
  HearingConstraintTag,
  HearingExistingDataSource,
  HearingIntegrationTool,
  HearingRequestPattern,
  HearingSheetFormInput,
} from '@harness-hub/schemas';
import { hearingReferenceUrlSchema } from '@harness-hub/schemas';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import {
  collectUnknownFields,
  INITIAL_HEARING_FORM,
  toggleExistingDataSourceOnForm,
  toggleIntegrationToolOnForm,
  toggleRequestPatternOnForm,
  toggleWithExclusiveValue,
} from './hearing-intake-wizard-model.js';

type SelectField = 'usagePurpose' | 'expertise' | 'role' | 'context' | 'motivation' | 'sharingIntent';

export interface HearingWizardFormState {
  readonly form: HearingSheetFormInput;
  readonly knowledgeAssetsText: string;
  readonly referenceUrlDraft: string;
  readonly referenceNoteDraft: string;
  readonly referenceUrlError: string | null;
  readonly unknownFields: readonly string[];
  readonly restoreDraft: (draft: Partial<HearingSheetFormInput>) => void;
  readonly setText: (
    key: keyof HearingSheetFormInput,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  readonly setNumber: (key: 'hours' | 'people' | 'salary') => (event: ChangeEvent<HTMLInputElement>) => void;
  readonly setSelect: (key: SelectField) => (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly setPriority: (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly setKnowledgeAssets: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly setReferenceUrlDraft: (value: string) => void;
  readonly setReferenceNoteDraft: (value: string) => void;
  readonly toggleConstraintTag: (tag: HearingConstraintTag) => void;
  readonly toggleRequestPattern: (pattern: HearingRequestPattern) => void;
  readonly toggleIntegrationTool: (tool: HearingIntegrationTool) => void;
  readonly toggleExistingDataSource: (source: HearingExistingDataSource) => void;
  readonly addReferenceUrl: () => void;
  readonly removeReferenceUrl: (index: number) => void;
}

export function useHearingWizardFormState(): HearingWizardFormState {
  const [form, setForm] = useState<HearingSheetFormInput>(INITIAL_HEARING_FORM);
  // 末尾の空行を維持するため、ナレッジ資産の入力テキストと送信用配列を分ける。
  const [knowledgeAssetsText, setKnowledgeAssetsText] = useState(INITIAL_HEARING_FORM.knowledgeAssets.join('\n'));
  const [referenceUrlDraft, setReferenceUrlDraft] = useState('');
  const [referenceNoteDraft, setReferenceNoteDraft] = useState('');
  const [referenceUrlError, setReferenceUrlError] = useState<string | null>(null);

  const restoreDraft = useCallback((draft: Partial<HearingSheetFormInput>): void => {
    setForm({ ...INITIAL_HEARING_FORM, ...draft });
    if (Array.isArray(draft.knowledgeAssets)) setKnowledgeAssetsText(draft.knowledgeAssets.join('\n'));
  }, []);

  const setText = useCallback(
    (key: keyof HearingSheetFormInput) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
      },
    [],
  );

  const setNumber = useCallback(
    (key: 'hours' | 'people' | 'salary') =>
      (event: ChangeEvent<HTMLInputElement>): void => {
        setForm((current) => ({ ...current, [key]: Number(event.target.value) }));
      },
    [],
  );

  const setSelect = useCallback(
    (key: SelectField) =>
      (event: ChangeEvent<HTMLSelectElement>): void => {
        setForm((current) => ({ ...current, [key]: event.target.value }) as HearingSheetFormInput);
      },
    [],
  );

  const setPriority = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setForm((current) => ({
      ...current,
      priority: event.target.value as HearingSheetFormInput['priority'],
    }));
  }, []);

  const toggleConstraintTag = useCallback((tag: HearingConstraintTag): void => {
    setForm((current) => ({
      ...current,
      constraintTags: toggleWithExclusiveValue(current.constraintTags, tag, 'unknown'),
    }));
  }, []);

  const toggleRequestPattern = useCallback((pattern: HearingRequestPattern): void => {
    setForm((current) => toggleRequestPatternOnForm(current, pattern));
  }, []);

  const toggleIntegrationTool = useCallback((tool: HearingIntegrationTool): void => {
    setForm((current) => toggleIntegrationToolOnForm(current, tool));
  }, []);

  const toggleExistingDataSource = useCallback((source: HearingExistingDataSource): void => {
    setForm((current) => toggleExistingDataSourceOnForm(current, source));
  }, []);

  const setKnowledgeAssets = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    const text = event.target.value;
    setKnowledgeAssetsText(text);
    setForm((current) => ({
      ...current,
      knowledgeAssets: text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    }));
  }, []);

  const addReferenceUrl = useCallback((): void => {
    const parsed = hearingReferenceUrlSchema.safeParse({
      url: referenceUrlDraft.trim(),
      ...(referenceNoteDraft.trim().length > 0 ? { note: referenceNoteDraft.trim() } : {}),
    });
    if (!parsed.success) {
      setReferenceUrlError('URL の形式が正しくありません。https:// から始まる URL を入力してください。');
      return;
    }
    setForm((current) => {
      if (current.referenceUrls.length >= 10) return current;
      return { ...current, referenceUrls: [...current.referenceUrls, parsed.data] };
    });
    setReferenceUrlDraft('');
    setReferenceNoteDraft('');
    setReferenceUrlError(null);
  }, [referenceNoteDraft, referenceUrlDraft]);

  const removeReferenceUrl = useCallback((index: number): void => {
    setForm((current) => ({
      ...current,
      referenceUrls: current.referenceUrls.filter((_, existingIndex) => existingIndex !== index),
    }));
  }, []);

  const unknownFields = useMemo(() => collectUnknownFields(form), [form]);

  return {
    form,
    knowledgeAssetsText,
    referenceUrlDraft,
    referenceNoteDraft,
    referenceUrlError,
    unknownFields,
    restoreDraft,
    setText,
    setNumber,
    setSelect,
    setPriority,
    setKnowledgeAssets,
    setReferenceUrlDraft,
    setReferenceNoteDraft,
    toggleConstraintTag,
    toggleRequestPattern,
    toggleIntegrationTool,
    toggleExistingDataSource,
    addReferenceUrl,
    removeReferenceUrl,
  };
}
