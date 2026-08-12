/**
 * HI-EXPORT-*: 用途別コピペ出力 (export-adapter) の契約。
 *
 * 「HarnessCreator 向け」「システム開発向け」の 2 経路が、それぞれ想定読者にとって
 * 必要な情報 (用途・真の課題・共有相手・ナレッジ資産・優先度など) を漏らさず含み、
 * かつ salary のような送ってはいけない値を含まないことを固定する。
 */
import { type HearingSheetFormSnapshot, normalizeHearingSheetFormSnapshot } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import {
  buildHarnessCreatorHandoff,
  buildSystemOrchestratorHandoff,
  type GeneratedSections,
} from '../../src/features/hearing-intake/export-adapter/index.js';

const BASE_FORM_SNAPSHOT: HearingSheetFormSnapshot = {
  schemaVersion: 2,
  taskName: '請求書処理',
  company: '株式会社サンプル',
  applicant: '山田',
  domain: '経理',
  issue: '転記が多く手作業のミスが多発している',
  tools: 'Excel / 会計システム',
  hours: 40,
  people: 5,
  features: 'OCR による自動仕訳',
  output: 'CSV 出力と承認フロー',
  priority: 'high',
  usagePurpose: 'system_development',
  expertise: 'novice',
  role: 'employee',
  context: 'business',
  motivation: 'efficiency',
  sharingIntent: 'small_group',
  constraintTags: ['time', 'budget'],
  shareTarget: 'チーム内の経理担当',
  knowledgeAssets: ['経理マニュアル v3', '過去の仕訳ルール一覧'],
};

const GENERATED_SECTIONS: GeneratedSections = {
  overview: '請求書処理を自動化する提案です。',
  issue: '手作業の転記が多く、ミスが発生しやすい。',
  feature_tags: ['請求書処理', 'OCR'],
  estimated_effect: '年間 840 時間の削減が見込めます。',
};

describe('HI-EXPORT: HarnessCreator 向け引き渡しテキスト', () => {
  it('HI-EXPORT-001: 用途・真の課題・出力先・共有相手・ナレッジ資産・熟練度・制約・優先度を含む', () => {
    const text = buildHarnessCreatorHandoff({ formSnapshot: BASE_FORM_SNAPSHOT, generatedSections: null });

    expect(text).toContain('システム開発');
    expect(text).toContain(BASE_FORM_SNAPSHOT.issue);
    expect(text).toContain(BASE_FORM_SNAPSHOT.output);
    expect(text).toContain(BASE_FORM_SNAPSHOT.shareTarget);
    expect(text).toContain('経理マニュアル v3');
    expect(text).toContain('過去の仕訳ルール一覧');
    expect(text).toContain('非技術');
    expect(text).toContain('時間');
    expect(text).toContain('予算');
    expect(text).toContain('高');
  });

  it('HI-EXPORT-002: ナレッジ資産は箇条書き (先頭に "- ") で出力される', () => {
    const text = buildHarnessCreatorHandoff({ formSnapshot: BASE_FORM_SNAPSHOT, generatedSections: null });

    expect(text).toContain('- 経理マニュアル v3');
    expect(text).toContain('- 過去の仕訳ルール一覧');
  });

  it('HI-EXPORT-003: 生成済みセクションがあればそのまま含め、無ければ未生成である旨を示す', () => {
    const withSections = buildHarnessCreatorHandoff({
      formSnapshot: BASE_FORM_SNAPSHOT,
      generatedSections: GENERATED_SECTIONS,
    });
    const withoutSections = buildHarnessCreatorHandoff({ formSnapshot: BASE_FORM_SNAPSHOT, generatedSections: null });

    expect(withSections).toContain('年間 840 時間の削減が見込めます。');
    expect(withSections).toContain('請求書処理を自動化する提案です。');
    expect(withoutSections).toContain('（未生成）');
  });

  it('HI-EXPORT-004: 制約が未選択のときは「なし」と表示する', () => {
    const text = buildHarnessCreatorHandoff({
      formSnapshot: { ...BASE_FORM_SNAPSHOT, constraintTags: [] },
      generatedSections: null,
    });

    expect(text).toContain('なし');
  });

  it('HI-EXPORT-005: salary や年収などの禁止情報を含まない', () => {
    const text = buildHarnessCreatorHandoff({ formSnapshot: BASE_FORM_SNAPSHOT, generatedSections: null });

    expect(text).not.toMatch(/salary|年収/i);
  });

  it('HI-EXPORT-005b: 旧 11 項目は推測値や undefined ではなく未回答と明示する', () => {
    const legacy = normalizeHearingSheetFormSnapshot({
      taskName: BASE_FORM_SNAPSHOT.taskName,
      company: BASE_FORM_SNAPSHOT.company,
      applicant: BASE_FORM_SNAPSHOT.applicant,
      domain: BASE_FORM_SNAPSHOT.domain,
      issue: BASE_FORM_SNAPSHOT.issue,
      tools: BASE_FORM_SNAPSHOT.tools,
      hours: BASE_FORM_SNAPSHOT.hours,
      people: BASE_FORM_SNAPSHOT.people,
      features: BASE_FORM_SNAPSHOT.features,
      output: BASE_FORM_SNAPSHOT.output,
      priority: BASE_FORM_SNAPSHOT.priority,
    });
    const text = buildHarnessCreatorHandoff({ formSnapshot: legacy, generatedSections: null });

    expect(text).toContain('未回答（旧形式のシート）');
    expect(text).not.toMatch(/undefined|null/);
    expect(text).not.toContain('アプリ開発');
  });
});

describe('HI-EXPORT: システム開発向け引き渡しテキスト', () => {
  it('HI-EXPORT-006: 業務名・会社名・業務領域・課題・ほしい機能・希望する出力・優先度を含む', () => {
    const text = buildSystemOrchestratorHandoff({ formSnapshot: BASE_FORM_SNAPSHOT, generatedSections: null });

    expect(text).toContain(BASE_FORM_SNAPSHOT.taskName);
    expect(text).toContain(BASE_FORM_SNAPSHOT.company);
    expect(text).toContain(BASE_FORM_SNAPSHOT.domain);
    expect(text).toContain(BASE_FORM_SNAPSHOT.issue);
    expect(text).toContain(BASE_FORM_SNAPSHOT.features);
    expect(text).toContain(BASE_FORM_SNAPSHOT.output);
    expect(text).toContain('高');
  });

  it('HI-EXPORT-007: 用途プロファイル一式 (用途/熟練度/役割/文脈/動機/共有意図/制約/共有相手) を含む', () => {
    const text = buildSystemOrchestratorHandoff({ formSnapshot: BASE_FORM_SNAPSHOT, generatedSections: null });

    expect(text).toContain('システム開発');
    expect(text).toContain('非技術');
    expect(text).toContain('会社員');
    expect(text).toContain('業務');
    expect(text).toContain('効率化');
    expect(text).toContain('少人数');
    expect(text).toContain('時間、予算');
    expect(text).toContain(BASE_FORM_SNAPSHOT.shareTarget);
  });

  it('HI-EXPORT-008: usagePurpose の値ごとにラベルが分岐する', () => {
    const appDev = buildSystemOrchestratorHandoff({
      formSnapshot: { ...BASE_FORM_SNAPSHOT, usagePurpose: 'app_development' },
      generatedSections: null,
    });
    const harnessDev = buildSystemOrchestratorHandoff({
      formSnapshot: { ...BASE_FORM_SNAPSHOT, usagePurpose: 'harness_development' },
      generatedSections: null,
    });
    const other = buildSystemOrchestratorHandoff({
      formSnapshot: { ...BASE_FORM_SNAPSHOT, usagePurpose: 'other' },
      generatedSections: null,
    });

    expect(appDev).toContain('アプリ開発');
    expect(harnessDev).toContain('ハーネス開発');
    expect(other).toContain('その他');
  });

  it('HI-EXPORT-009: salary や年収などの禁止情報を含まない', () => {
    const text = buildSystemOrchestratorHandoff({ formSnapshot: BASE_FORM_SNAPSHOT, generatedSections: null });

    expect(text).not.toMatch(/salary|年収/i);
  });
});
