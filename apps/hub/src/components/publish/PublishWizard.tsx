'use client';

/**
 * S01 Web 公開。Project 準備から既存 Publish API、状態確認、同一 request 再投入までを 1 画面に束ねる。
 */
import type { PublishProject, PublishProjectChoice, PublishRequestView, PublishVisibility } from '@harness-hub/schemas';
import { ActionLink, Alert, Button, IdBadge, Select, Textarea, TextInput } from '@harness-hub/ui';
import { type FormEvent, lazy, type ReactNode, Suspense, useEffect, useId, useRef, useState } from 'react';

import type { PublishJourneyPort, PublishJourneyScope } from '../../lib/publish-journey/index.js';
import { lazyHttpPublishJourneyPort } from './lazy-publish-journey-port.js';
import { createPublishWizardCheckpoint } from './publish-journey-checkpoint.js';
import { publishStatusHref } from './publish-status-href.js';

/**
 * 状態追跡と結果表示は**公開要求が生まれてから**しか動かないので、初期チャンクから外す
 * (HarnessHub-5vlq / HarnessHub-vwxc)。`/catalog/publish` は G13 予算の残余が最も薄い route で、
 * ここに検査結果の書式化・9 状態分の文言・polling の停止判定が同居していた。
 * 遅延読込中も同じ位置に文言を残して高さの跳ね (CLS) を抑える。
 *
 * `next/dynamic` ではなく `React.lazy` を使うのは、前者が loadable の追加ランタイム
 * (async-local-storage の shim を含む) を持ち込むため (error.tsx 群と同じ判断)。
 * `(workspace)` グループでこの分割を使うのはここだけなので、その追加ランタイムは
 * 共有 chunk へ寄せられず `/catalog/publish` の route chunk が全額を負担していた
 * (HarnessHub-vwxc の実測: page chunk 7,915 → 下表の差分)。
 */
const PublishWizardTracker = lazy(async () => ({
  default: (await import('./PublishWizardTracker.js')).PublishWizardTracker,
}));

export interface PublishWizardProps {
  readonly scope: PublishJourneyScope;
  readonly port?: PublishJourneyPort;
  readonly initialProjectId?: string;
  readonly initialPublishId?: string;
}

type ProjectMode = 'new' | 'existing';
type SubmissionPhase = 'idle' | 'submitting' | 'failed';

interface SelectedArchive {
  readonly file: File;
  readonly checkpoint: ReturnType<typeof createPublishWizardCheckpoint>;
}

const VISIBILITY_OPTIONS: readonly { value: PublishVisibility; label: string }[] = [
  { value: 'workspace', label: 'この Workspace のメンバー向けに公開する' },
  { value: 'private', label: '自分だけに公開する' },
];

const PROJECT_MODE_OPTIONS: readonly { value: ProjectMode; label: string }[] = [
  { value: 'new', label: '新しい Project を作る' },
  { value: 'existing', label: '既存の Project を使う' },
];

export function PublishWizard({
  scope,
  port = lazyHttpPublishJourneyPort,
  initialProjectId = '',
  initialPublishId = '',
}: PublishWizardProps): ReactNode {
  const [projectMode, setProjectMode] = useState<ProjectMode>(initialProjectId === '' ? 'new' : 'existing');
  const [projectId, setProjectId] = useState(initialProjectId);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [preparedProject, setPreparedProject] = useState<PublishProject | null>(null);
  const [projectChoices, setProjectChoices] = useState<readonly PublishProjectChoice[]>([]);
  const [projectListLoading, setProjectListLoading] = useState(true);
  const [projectListFailure, setProjectListFailure] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PublishVisibility>('workspace');
  const [archive, setArchive] = useState<File | null>(null);
  const [phase, setPhase] = useState<SubmissionPhase>('idle');
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [request, setRequest] = useState<PublishRequestView | null>(null);
  const [statusFailure, setStatusFailure] = useState<string | null>(null);
  const projectKey = useRef(crypto.randomUUID());
  const selectedArchiveRef = useRef<SelectedArchive | null>(null);
  const activeSubmissionRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);
  const fileFieldId = useId();

  const submitting = phase === 'submitting';
  const canRetryRequest = request === null || request.status === 'needs_fix' || request.status === 'failed';
  const projectReady =
    projectMode === 'new' ? projectName.trim() !== '' || preparedProject !== null : projectId.trim() !== '';
  const ready = archive !== null && projectReady && canRetryRequest;

  // port が AbortSignal を無視しても unmount 後に state/history を更新しない。
  useEffect(() => {
    return () => {
      activeSubmissionRef.current?.abort();
    };
  }, []);

  // Project 名は補助読取。失敗しても共有URLの状態確認や、既知IDでの再投入を壊さない。
  useEffect(() => {
    const controller = new AbortController();
    setProjectListLoading(true);
    void port.listProjects(scope, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setProjectChoices(result.value);
        setProjectListFailure(null);
      } else {
        setProjectListFailure(result.failure.message);
      }
      setProjectListLoading(false);
    });
    return () => controller.abort();
  }, [port, scope]);

  // 共有された publish ID や再読込後の状態確認。以後の自動更新も同じ port を使う。
  useEffect(() => {
    if (initialPublishId.trim() === '' || request !== null) return;
    const controller = new AbortController();
    void port.getRequest(scope, initialPublishId.trim(), controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setRequest(result.value);
        setProjectId(result.value.project_id);
        setProjectMode('existing');
        setStatusFailure(null);
      } else {
        setStatusFailure(result.failure.message);
      }
    });
    return () => controller.abort();
  }, [initialPublishId, port, request, scope]);

  async function prepareProject(signal: AbortSignal): Promise<string | null> {
    if (projectMode === 'existing') return projectId.trim();
    if (preparedProject !== null) return preparedProject.id;
    const result = await port.createProject(
      scope,
      {
        name: projectName.trim(),
        description: projectDescription.trim(),
        idempotencyKey: projectKey.current,
      },
      signal,
    );
    if (signal.aborted) return null;
    if (!result.ok) {
      setFailureMessage(result.failure.message);
      return null;
    }
    setPreparedProject(result.value);
    setProjectId(result.value.id);
    return result.value.id;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const selectedArchive = selectedArchiveRef.current;
    if (submittingRef.current || submitting || !projectReady || !canRetryRequest || selectedArchive === null) return;

    const controller = new AbortController();
    activeSubmissionRef.current = controller;
    submittingRef.current = true;
    setPhase('submitting');
    setFailureMessage(null);
    try {
      const resolvedProjectId = await prepareProject(controller.signal);
      if (controller.signal.aborted) return;
      if (resolvedProjectId === null) {
        setPhase('failed');
        return;
      }

      const resetBeforeUpload = request?.status === 'needs_fix';
      // initialPublishId の読込と ZIP 選択が前後した場合だけ、最新 request ID へ揃える。
      // 通信失敗後の同じ ZIP の再試行では、選択時の checkpoint をそのまま再利用する。
      const nextCheckpoint =
        phase !== 'failed' && resetBeforeUpload && selectedArchive.checkpoint.requestId !== request.id
          ? createPublishWizardCheckpoint(request.id)
          : phase !== 'failed' && request?.status === 'failed' && selectedArchive.checkpoint.requestId !== null
            ? createPublishWizardCheckpoint()
            : selectedArchive.checkpoint;
      if (nextCheckpoint !== selectedArchive.checkpoint && selectedArchiveRef.current === selectedArchive) {
        selectedArchiveRef.current = { ...selectedArchive, checkpoint: nextCheckpoint };
      }
      const archiveBuffer = await selectedArchive.file.arrayBuffer();
      if (controller.signal.aborted) return;
      const result = await port.submitPackage(
        scope,
        { projectId: resolvedProjectId, visibility, archive: archiveBuffer },
        nextCheckpoint,
        { resetBeforeUpload },
        controller.signal,
      );
      if (controller.signal.aborted) return;

      if (!result.ok) {
        if (selectedArchiveRef.current?.file === selectedArchive.file) {
          selectedArchiveRef.current = {
            file: selectedArchive.file,
            checkpoint: result.failure.checkpoint ?? nextCheckpoint,
          };
        }
        setFailureMessage(result.failure.message);
        setPhase('failed');
        return;
      }

      setRequest(result.value.request);
      if (selectedArchiveRef.current?.file === selectedArchive.file) {
        selectedArchiveRef.current = { file: selectedArchive.file, checkpoint: result.value.checkpoint };
      }
      setPhase('idle');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', publishStatusHref(scope, result.value.request.id));
      }
    } catch {
      if (controller.signal.aborted) return;
      // File 読み出し・adapter・検証器の予期しない例外でも loading 表示に固着させない。
      setFailureMessage('ZIP を読み取るか公開処理を開始できませんでした。ファイルを確認して再試行してください。');
      setPhase('failed');
    } finally {
      if (activeSubmissionRef.current === controller) activeSubmissionRef.current = null;
      submittingRef.current = false;
    }
  }

  function onArchiveChange(file: File | null): void {
    const previousRequestId =
      request?.status === 'needs_fix'
        ? request.id
        : phase === 'failed'
          ? (selectedArchiveRef.current?.checkpoint.requestId ?? null)
          : null;
    // file と鍵を同じ同期 event で ref に保存する。React state の commit や module import を
    // 待たないため、この change の直後に submit されても旧 ZIP の鍵は観測されない。
    selectedArchiveRef.current =
      file === null ? null : { file, checkpoint: createPublishWizardCheckpoint(previousRequestId) };
    setArchive(file);
    // 内容が変われば package の指紋も変わる。同じ鍵を再利用せず、request ID だけを引き継ぐ。
    if (file !== null && phase === 'failed') setFailureMessage(null);
  }

  const buttonLabel =
    request?.status === 'needs_fix'
      ? '修正した ZIP を再投入する'
      : request?.status === 'failed'
        ? '新しい公開要求でやり直す'
        : phase === 'failed'
          ? '同じ処理を再試行する'
          : '検査して公開する';

  return (
    <section aria-labelledby="publish-wizard-heading">
      <h2 id="publish-wizard-heading">Skill を公開する</h2>
      <p>Project を準備し、ZIP を投入します。Hub 側の検査と権限は Publisher CLI と共通です。</p>

      <Alert
        tone="info"
        title="Web アプリの公開には Publisher CLI が必要です"
        description="Web アプリは wrangler によるデプロイと疎通確認が必要なため、この画面では選べません。Publisher CLI をすでに起動している場合だけ、次のボタンから別タブで Device 承認を開いてください(この画面はそのまま残ります)。"
        action={
          <ActionLink href="/device" openInNewTab>
            別タブで Device 承認を開く
          </ActionLink>
        }
      />

      <form onSubmit={onSubmit}>
        <Select
          label="Project"
          description="初めて公開する場合は新しく作成できます。"
          options={PROJECT_MODE_OPTIONS}
          value={projectMode}
          onChange={(event) => {
            setProjectMode(event.currentTarget.value as ProjectMode);
            setFailureMessage(null);
          }}
          required
        />

        {projectMode === 'new' ? (
          preparedProject === null ? (
            <>
              <TextInput
                label="Project 名"
                description="利用者がツールを識別できる名前を入力してください。"
                value={projectName}
                onChange={(event) => setProjectName(event.currentTarget.value)}
                maxLength={120}
                required
              />
              <Textarea
                label="説明"
                description="何ができる Skill かを簡潔に記載します。"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.currentTarget.value)}
                maxLength={2_000}
              />
            </>
          ) : (
            <Alert
              tone="success"
              title="Project を準備しました"
              description={`${preparedProject.name} を現在の Workspace に作成し、あなたを owner に設定しました。`}
            />
          )
        ) : projectListLoading ? (
          <p role="status">Project の候補を読み込んでいます。</p>
        ) : projectChoices.some((project) => project.can_publish) ? (
          <>
            <Select
              label="既存の Project"
              description="現在の Workspace で公開できる Project を名前で選びます。"
              options={[
                { value: '', label: 'Project を選択してください' },
                ...projectChoices
                  .filter((project) => project.can_publish)
                  .map((project) => ({ value: project.id, label: project.name })),
                ...(projectId !== '' && !projectChoices.some((project) => project.id === projectId)
                  ? [{ value: projectId, label: '現在の Project（名前未解決）' }]
                  : []),
              ]}
              value={projectId}
              onChange={(event) => setProjectId(event.currentTarget.value)}
              required
            />
            {projectId === '' ? null : <IdBadge value={projectId} label="Project ID" />}
          </>
        ) : projectListFailure === null ? (
          <Alert
            tone="info"
            title="公開できる Project がありません"
            description="新しい Project を作るか、Project の owner に権限を確認してください。"
          />
        ) : (
          <>
            <Alert tone="warning" title="Project 名を取得できませんでした" description={projectListFailure} />
            <TextInput
              label="Project ID"
              description="名前一覧を取得できない場合だけ、現在の Workspace の識別子を指定します。"
              value={projectId}
              onChange={(event) => setProjectId(event.currentTarget.value)}
              spellCheck={false}
              required
            />
          </>
        )}

        <Select
          label="公開範囲"
          description="公開記録の閲覧範囲を指定します。実際の導入は H7 成立後に有効になります。"
          options={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={(event) => setVisibility(event.currentTarget.value as PublishVisibility)}
          required
        />

        <div>
          <label htmlFor={fileFieldId}>パッケージ (ZIP)</label>
          <p id={`${fileFieldId}-description`}>plugin.json を含む ZIP を選んでください。</p>
          <input
            id={fileFieldId}
            aria-describedby={`${fileFieldId}-description`}
            type="file"
            accept=".zip,application/zip"
            required
            disabled={submitting}
            onChange={(event) => onArchiveChange(event.currentTarget.files?.[0] ?? null)}
          />
        </div>

        <Button type="submit" variant="primary" loading={submitting} disabled={!ready}>
          {buttonLabel}
        </Button>
      </form>

      {failureMessage === null ? null : (
        <Alert
          tone="danger"
          live="assertive"
          title="処理を完了できませんでした"
          description={`${failureMessage} ZIP を変更していなければ、同じ処理を安全に再試行できます。`}
        />
      )}

      {statusFailure === null ? null : (
        <Alert tone="warning" title="公開状態を更新できませんでした" description={statusFailure} />
      )}

      {request === null ? null : (
        <Suspense fallback={<p>公開状況を読み込んでいます。</p>}>
          <PublishWizardTracker
            scope={scope}
            port={port}
            request={request}
            onRequest={setRequest}
            onStatusFailure={setStatusFailure}
          />
        </Suspense>
      )}
    </section>
  );
}
