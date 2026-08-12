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
  buildHarnessCreatorHandoffInstruction,
  buildSystemOrchestratorHandoff,
  buildSystemOrchestratorHandoffInstruction,
  type GeneratedSections,
} from '../../src/features/hearing-intake/export-adapter/index.js';

const BASE_FORM_SNAPSHOT: HearingSheetFormSnapshot = {
  schemaVersion: 3,
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
  informationSources: ['会計システム', '取引先から届く請求書'],
  trueProblem: '単純転記に時間を奪われ、例外判断へ集中できないこと',
  knowledgeAssets: ['経理マニュアル v3', '過去の仕訳ルール一覧'],
  requestPatterns: [],
  integrationTools: [],
  existingDataSources: [],
  referenceUrls: [],
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
    expect(text).toContain(BASE_FORM_SNAPSHOT.trueProblem ?? '');
    expect(text).toContain('会計システム');
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

  it('HI-EXPORT-005b: 旧 11 項目は推測値や undefined ではなく明示的な未回答として扱う', () => {
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

    // 旧 11 項目は decode 時に用途プロファイル軸を unknown へ、情報源/真の課題を null へ補完する。
    expect(text).toContain('不明・わからない');
    expect(text).toContain('未回答');
    expect(text).not.toMatch(/undefined|null/);
    expect(text).not.toContain('アプリ開発');
  });

  it('HI-EXPORT-005c: 情報源は null (未回答) と空配列 (回答済み 0 件) を区別する', () => {
    const unanswered = buildHarnessCreatorHandoff({
      formSnapshot: { ...BASE_FORM_SNAPSHOT, informationSources: null },
      generatedSections: null,
    });
    const answeredNone = buildHarnessCreatorHandoff({
      formSnapshot: { ...BASE_FORM_SNAPSHOT, informationSources: [] },
      generatedSections: null,
    });

    expect(unanswered).toContain('## 情報源\n未回答');
    expect(answeredNone).toContain('## 情報源\nなし');
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
    expect(text).toContain('会計システム');
    expect(text).toContain(BASE_FORM_SNAPSHOT.trueProblem ?? '');
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

describe('HI-EXPORT: トークン付き共有URL方式の誘導文 (instruction_text)', () => {
  const SHARE_URL = 'https://hub.example.com/api/hearing/tok_abc123';

  it('HI-EXPORT-010: HarnessCreator 向け誘導文はトークンURLを含む', () => {
    const text = buildHarnessCreatorHandoffInstruction({ shareUrl: SHARE_URL });

    expect(text).toContain(SHARE_URL);
  });

  it('HI-EXPORT-011: システム開発向け誘導文はトークンURLを含む', () => {
    const text = buildSystemOrchestratorHandoffInstruction({ shareUrl: SHARE_URL });

    expect(text).toContain(SHARE_URL);
  });

  it('HI-EXPORT-012: audience ごとに誘導文の文面が異なる', () => {
    const harnessText = buildHarnessCreatorHandoffInstruction({ shareUrl: SHARE_URL });
    const systemText = buildSystemOrchestratorHandoffInstruction({ shareUrl: SHARE_URL });

    expect(harnessText).not.toBe(systemText);
    expect(harnessText).toContain('HarnessCreator');
    expect(systemText).toContain('開発計画');
  });
});
