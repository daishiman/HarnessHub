/**
 * @vitest-environment jsdom
 *
 * S01 公開ウィザードと、そこへ到達する導線の検査
 * (feat-web-only-publish-journey 受入 1・4・5)。
 *
 * 「公開できた」で終わらせない画面かどうかを見る。CLI を持たない利用者にとっての行き止まりは
 * 2 種類ある —— 投入する場所が無いこと (受入 1) と、`/device` に迷い込んで進めなくなること
 * (受入 4)。前者は結果表示が導入案内まで繋がるか、後者は案内が実際に描画されるかで確かめる。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLISH_RESUBMIT_ACTION_LABEL, type PublishRequestView } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeviceApprovalPurposeNotice } from '../../app/device/device-approval-purpose-notice.js';
// 結果表示は `React.lazy` の内側 (HarnessHub-vwxc の bundle 分割) にある。
// 静的に 1 度読んで module registry を温めておかないと、`lazy()` の解決が
// 実 I/O 待ちになり、負荷の高い全体実行では findBy* の既定待ち時間を超えうる。
// 本番の遅延読込は変えず、テスト側の待ち条件だけを決定的にするための import。
import '../../components/publish/PublishWizardTracker.js';
import { PublishWizard } from '../../components/publish/PublishWizard.js';
import type { PublishJourneyPort, PublishJourneyResult } from '../../lib/publish-journey/index.js';
import { PUBLISH_WIZARD_HREF, PUBLISH_WIZARD_LINK_LABEL } from '../../lib/routing/publish-wizard-entry.js';

// next/font はビルド時変換が前提で、テスト実行時には解決できない
vi.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter', variable: '--font-inter' }),
  Noto_Sans_JP: () => ({ className: 'noto', variable: '--font-noto' }),
  IBM_Plex_Sans: () => ({ className: 'plex', variable: '--font-ibm-plex-sans' }),
  JetBrains_Mono: () => ({ className: 'jetbrains', variable: '--font-jetbrains-mono' }),
}));

// vitest の globals を使わない設定なので、DOM の後片付けは明示的に行う
afterEach(cleanup);

const hubRoot = process.cwd();
const SCOPE = { tenantId: 'tenant-acme', workspaceId: 'workspace-a' } as const;

function publishRequest(overrides: Partial<PublishRequestView> = {}): PublishRequestView {
  return {
    id: 'pubreq-1',
    project_id: 'project-1',
    channel_id: 'ch-1',
    status: 'published',
    verdict: 'green',
    findings: [],
    release_id: 'rel-1',
    content_hash: 'sha256-abc',
    requested_by: 'user-1',
    created_at: '2026-08-10T00:00:00.000Z',
    ...overrides,
  } as PublishRequestView;
}

/** 実 API を持たない環境で、投入の結果だけを差し替える。 */
function fakePort(result: PublishJourneyResult<PublishRequestView>): PublishJourneyPort {
  return {
    listProjects: async () => ({
      ok: true,
      value: [{ id: 'project-1', name: '問い合わせ整理', description: '', can_publish: true }],
    }),
    createProject: async (_scope, input) => ({
      ok: true,
      value: { id: 'project-created', name: input.name, description: input.description },
    }),
    submitPackage: async (_scope, _input, checkpoint) =>
      result.ok
        ? { ok: true, value: { request: result.value, checkpoint } }
        : { ok: false, failure: { ...result.failure, checkpoint } },
    getRequest: async () => result,
  };
}

function renderInUi(node: ReactNode) {
  return render(<UiProvider>{node}</UiProvider>);
}

function selectArchive(name = 'tool.zip', byte = 4): HTMLInputElement {
  // jsdom の input.files は readonly、かつ File.arrayBuffer が無い。
  // どちらもブラウザには存在する API なので、実装側ではなくテスト側で環境差を埋める。
  const bytes = new Uint8Array([80, 75, 3, byte]);
  const file = new File([bytes], name, { type: 'application/zip' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.buffer,
    configurable: true,
  });
  const fileInput = screen.getByLabelText(/パッケージ \(ZIP\)/);
  Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
  fireEvent.change(fileInput);
  return fileInput as HTMLInputElement;
}

function submitSelectedArchive(): void {
  const button = screen.getByRole('button', {
    name: /検査して公開する|同じ処理を再試行する|修正した ZIP を再投入する|新しい公開要求でやり直す/,
  });
  expect(button.getAttribute('type')).toBe('submit');
  expect((button as HTMLButtonElement).disabled).toBe(false);
  // jsdom は submit ボタンの click から form の submit を起こさないので、form へ直接投げる
  fireEvent.submit(button.closest('form') as HTMLFormElement);
}

/** ZIP を選んで送信するところまでを 1 手で行う。 */
async function submitArchive(): Promise<void> {
  const projectId = screen.queryByLabelText(/Project ID/);
  if (projectId !== null) fireEvent.change(projectId, { target: { value: 'project-1' } });

  selectArchive();
  submitSelectedArchive();
}

describe('受入 1: Web だけで投入から導入案内まで到達できる', () => {
  it('WOP-W-001: S01 の route が存在する', () => {
    expect(existsSync(join(hubRoot, 'src', 'app', '(workspace)', 'catalog', 'publish', 'page.tsx'))).toBe(true);
  });

  it('WOP-W-002: 投入に必要な入力が最初から揃っている', () => {
    renderInUi(<PublishWizard scope={SCOPE} port={fakePort({ ok: true, value: publishRequest() })} />);

    expect(screen.getByLabelText(/Project 名/)).toBeDefined();
    expect(screen.getByLabelText(/説明/)).toBeDefined();
    expect(screen.getByLabelText(/公開範囲/)).toBeDefined();
    expect(screen.getByLabelText(/パッケージ \(ZIP\)/)).toBeDefined();
    expect(screen.getByText(/Web アプリの公開には Publisher CLI が必要/)).toBeDefined();

    const deviceApprovalLink = screen.getByRole('link', { name: '別タブで Device 承認を開く' });
    expect(deviceApprovalLink.getAttribute('href')).toBe('/device');
    expect(deviceApprovalLink.getAttribute('target')).toBe('_blank');
    expect(deviceApprovalLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('WOP-W-003: 公開 ID を状態確認へ伝播し、H7 未成立の導入リンクを成功扱いで出さない', async () => {
    renderInUi(
      <PublishWizard
        scope={SCOPE}
        initialProjectId="project-1"
        port={fakePort({ ok: true, value: publishRequest() })}
      />,
    );
    await submitArchive();

    const link = await screen.findByRole('link', { name: 'この公開状態を確認する' });
    expect(link.getAttribute('href')).toContain('publish=pubreq-1');
    expect(screen.getByText('導入経路はまだ利用できません')).toBeDefined();
    expect(screen.queryByRole('link', { name: '導入手順を見る' })).toBeNull();
  });

  it('WOP-W-004: 検査で差し戻されたら指摘と再投入の案内を出す', async () => {
    const rejected = publishRequest({
      status: 'needs_fix',
      verdict: 'red',
      release_id: null,
      findings: [
        {
          rule_id: 'secret-scan/aws-key',
          stage: 'secret-scan',
          severity: 'error',
          message: '認証情報らしき文字列が含まれています',
          path: 'src/config.ts',
          line: 12,
        },
      ],
    } as Partial<PublishRequestView>);

    renderInUi(
      <PublishWizard scope={SCOPE} initialProjectId="project-1" port={fakePort({ ok: true, value: rejected })} />,
    );
    await submitArchive();

    // 書式は共通整形 (受入 3) が決める。ここではそれが画面に届いているかだけを見る
    expect(
      await screen.findByText('[secret-scan/aws-key] 認証情報らしき文字列が含まれています (src/config.ts:12)'),
    ).toBeDefined();
    expect(screen.getByText(PUBLISH_RESUBMIT_ACTION_LABEL)).toBeDefined();
    // 差し戻しなのに導入案内が出れば「公開された」と誤解させる
    expect(screen.queryByRole('link', { name: '導入手順を見る' })).toBeNull();
  });

  it('WOP-W-005: 通信や権限で失敗したら理由を告知し、公開扱いにしない', async () => {
    renderInUi(
      <PublishWizard
        scope={SCOPE}
        initialProjectId="project-1"
        port={fakePort({
          ok: false,
          failure: {
            stage: 'request',
            status: 403,
            message: 'この Workspace でツールを公開する権限がありません。',
          },
        })}
      />,
    );
    await submitArchive();

    await waitFor(() => {
      expect(screen.getByText(/権限がありません/)).toBeDefined();
    });
    expect(screen.queryByRole('link', { name: '導入手順を見る' })).toBeNull();
  });

  it('WOP-W-006: 新規 Project を作成してから同じ投入フローへ収束する', async () => {
    const createProject = vi.fn(async (_scope, input: { name: string; description: string }) => ({
      ok: true as const,
      value: { id: 'project-created', name: input.name, description: input.description },
    }));
    const submitPackage = vi.fn(async (_scope, _input, checkpoint) => ({
      ok: true as const,
      value: { request: publishRequest({ project_id: 'project-created' }), checkpoint },
    }));
    const port: PublishJourneyPort = {
      listProjects: async () => ({ ok: true, value: [] }),
      createProject,
      submitPackage,
      getRequest: async () => ({ ok: true, value: publishRequest({ project_id: 'project-created' }) }),
    };
    renderInUi(<PublishWizard scope={SCOPE} port={port} />);
    fireEvent.change(screen.getByLabelText(/Project 名/), { target: { value: '問い合わせ整理' } });
    await submitArchive();

    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
    expect(submitPackage).toHaveBeenCalledWith(
      SCOPE,
      expect.objectContaining({ projectId: 'project-created' }),
      expect.any(Object),
      { resetBeforeUpload: false },
      expect.any(AbortSignal),
    );
  });

  it('WOP-W-007: 業務ツール一覧から S01 へ行ける', () => {
    const catalog = readFileSync(join(hubRoot, 'src', 'app', '(workspace)', 'catalog', 'page.tsx'), 'utf8');
    expect(catalog).toContain('PUBLISH_WIZARD_HREF');
    expect(catalog).toContain('PUBLISH_WIZARD_LINK_LABEL');
  });

  it('WOP-W-008: ZIP 変更直後の submit は request ID だけ引き継ぎ、旧 idempotency key を使わない', async () => {
    const submitPackage = vi.fn<PublishJourneyPort['submitPackage']>(async (_scope, _input, checkpoint) => ({
      ok: false,
      failure: {
        stage: 'package',
        status: null,
        message: '一時的に接続できませんでした。',
        checkpoint: { ...checkpoint, requestId: 'pubreq-partial' },
      },
    }));
    const port: PublishJourneyPort = {
      listProjects: async () => ({
        ok: true,
        value: [{ id: 'project-1', name: '問い合わせ整理', description: '', can_publish: true }],
      }),
      createProject: async () => {
        throw new Error('既存 Project では呼ばれません');
      },
      submitPackage,
      getRequest: async () => ({ ok: true, value: publishRequest() }),
    };
    renderInUi(<PublishWizard scope={SCOPE} initialProjectId="project-1" port={port} />);

    await submitArchive();
    await waitFor(() => expect(submitPackage).toHaveBeenCalledTimes(1));
    await screen.findByText(/一時的に接続できませんでした/);

    // ZIP を変えない通信再試行は、途中まで進んだ同じ checkpoint を使う。
    submitSelectedArchive();
    await waitFor(() => expect(submitPackage).toHaveBeenCalledTimes(2));
    const firstCheckpoint = submitPackage.mock.calls[0]?.[2];
    const retriedCheckpoint = submitPackage.mock.calls[1]?.[2];
    expect(retriedCheckpoint).toMatchObject({
      requestId: 'pubreq-partial',
      requestKey: firstCheckpoint?.requestKey,
      resetKey: firstCheckpoint?.resetKey,
      packageKey: firstCheckpoint?.packageKey,
      submitKey: firstCheckpoint?.submitKey,
    });

    await screen.findByText(/一時的に接続できませんでした/);
    // change と submit の間で非同期処理を待たない。ref が同期更新されていなければ旧鍵が渡る。
    selectArchive('fixed.zip', 5);
    submitSelectedArchive();
    await waitFor(() => expect(submitPackage).toHaveBeenCalledTimes(3));
    const changedCheckpoint = submitPackage.mock.calls[2]?.[2];
    expect(changedCheckpoint?.requestId).toBe('pubreq-partial');
    expect(changedCheckpoint?.requestKey).not.toBe(retriedCheckpoint?.requestKey);
    expect(changedCheckpoint?.resetKey).not.toBe(retriedCheckpoint?.resetKey);
    expect(changedCheckpoint?.packageKey).not.toBe(retriedCheckpoint?.packageKey);
    expect(changedCheckpoint?.submitKey).not.toBe(retriedCheckpoint?.submitKey);
  });

  it('WOP-W-009: submit 中の unmount は signal を中止し、遅れて返る結果を反映しない', async () => {
    type SubmitResult = Awaited<ReturnType<PublishJourneyPort['submitPackage']>>;
    let finishSubmit: ((result: SubmitResult) => void) | undefined;
    const submitPackage = vi.fn<PublishJourneyPort['submitPackage']>(
      (_scope, _input, _checkpoint, _options, _signal) =>
        new Promise<SubmitResult>((resolve) => {
          finishSubmit = resolve;
        }),
    );
    const port: PublishJourneyPort = {
      listProjects: async () => ({
        ok: true,
        value: [{ id: 'project-1', name: '問い合わせ整理', description: '', can_publish: true }],
      }),
      createProject: async () => {
        throw new Error('既存 Project では呼ばれません');
      },
      submitPackage,
      getRequest: async () => ({ ok: true, value: publishRequest() }),
    };
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const view = renderInUi(<PublishWizard scope={SCOPE} initialProjectId="project-1" port={port} />);

    await submitArchive();
    await waitFor(() => expect(submitPackage).toHaveBeenCalledTimes(1));
    const signal = submitPackage.mock.calls[0]?.[4];
    expect(signal?.aborted).toBe(false);

    view.unmount();
    expect(signal?.aborted).toBe(true);
    const checkpoint = submitPackage.mock.calls[0]?.[2];
    if (checkpoint === undefined || finishSubmit === undefined) throw new Error('submit が開始されていません');
    await act(async () => {
      finishSubmit?.({ ok: true, value: { request: publishRequest(), checkpoint } });
    });
    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe('受入 4・5: /device の行き止まりを塞ぐ', () => {
  it('WOP-D-101: 心当たりのない確認コードを承認しない旨を警告する', () => {
    renderInUi(<DeviceApprovalPurposeNotice />);

    expect(screen.getByText('自分で開始していない確認コードは承認しないでください')).toBeDefined();
    expect(screen.getByText(/他人の端末にあなたの権限を渡すことになります/)).toBeDefined();
  });

  it('WOP-D-102: CLI を使わない利用者を S01 へ送る', () => {
    renderInUi(<DeviceApprovalPurposeNotice />);

    const link = screen.getByRole('link', { name: PUBLISH_WIZARD_LINK_LABEL });
    expect(link.getAttribute('href')).toBe(PUBLISH_WIZARD_HREF);
  });

  it('WOP-D-103: 警告は session 状態に関わらず出る (状態分岐を持たない)', () => {
    const source = readFileSync(join(hubRoot, 'src', 'app', 'device', 'device-approval-purpose-notice.tsx'), 'utf8');
    // props も条件分岐も持たない = どの状態でも同じものが出る
    expect(source).not.toMatch(/DeviceApprovalPurposeNotice\([^)]+\)/);
    const body = source.slice(source.indexOf('export function'));
    expect(body).not.toContain('if (');
    expect(body).not.toContain('?');
  });
});
