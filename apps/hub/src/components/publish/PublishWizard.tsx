'use client';

/**
 * S01 Web 公開。Project 準備から既存 Publish API、状態確認、同一 request 再投入までを 1 画面に束ねる。
 */
import type { CatalogFailureKind, PublishProject, PublishRequestView, PublishVisibility } from '@harness-hub/schemas';
import { ActionLink, Alert, Button, Select, Textarea, TextInput } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';

import type { PollingState } from '../../lib/catalog/index.js';
import {
  classifyCatalogFailure,
  resolveRetryDelayMs,
  shouldContinuePolling,
  shouldResumeOnVisible,
} from '../../lib/catalog/index.js';
import {
  createPublishJourneyCheckpoint,
  httpPublishJourneyPort,
  type PublishJourneyCheckpoint,
  type PublishJourneyPort,
  type PublishJourneyScope,
} from '../../lib/publish-journey/index.js';
import { publishStatusHref } from './publish-status-href.js';

/**
 * 結果表示は**公開要求が生まれてから**しか描画されないので、初期チャンクから外す
 * (HarnessHub-5vlq)。`/catalog/publish` は G13 予算の残余が最も薄い route で、
 * ここに検査結果の書式化と 9 状態分の文言が同居していた。
 * 遅延読込中も同じ位置に文言を残して高さの跳ね (CLS) を抑える。
 */
const PublishWizardOutcome = dynamic(async () => (await import('./PublishWizardOutcome.js')).PublishWizardOutcome, {
  loading: () => <p>公開状況を読み込んでいます。</p>,
});

export interface PublishWizardProps {
  readonly scope: PublishJourneyScope;
  readonly port?: PublishJourneyPort;
  readonly initialProjectId?: string;
  readonly initialPublishId?: string;
}

type ProjectMode = 'new' | 'existing';
type SubmissionPhase = 'idle' | 'submitting' | 'failed';

const VISIBILITY_OPTIONS: readonly { value: PublishVisibility; label: string }[] = [
  { value: 'workspace', label: 'この Workspace のメンバー向けに公開する' },
  { value: 'private', label: '自分だけに公開する' },
];

const PROJECT_MODE_OPTIONS: readonly { value: ProjectMode; label: string }[] = [
  { value: 'new', label: '新しい Project を作る' },
  { value: 'existing', label: '既存の Project を使う' },
];

function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export function PublishWizard({
  scope,
  port = httpPublishJourneyPort,
  initialProjectId = '',
  initialPublishId = '',
}: PublishWizardProps): ReactNode {
  const [projectMode, setProjectMode] = useState<ProjectMode>(initialProjectId === '' ? 'new' : 'existing');
  const [projectId, setProjectId] = useState(initialProjectId);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [preparedProject, setPreparedProject] = useState<PublishProject | null>(null);
  const [visibility, setVisibility] = useState<PublishVisibility>('workspace');
  const [archive, setArchive] = useState<File | null>(null);
  const [phase, setPhase] = useState<SubmissionPhase>('idle');
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [request, setRequest] = useState<PublishRequestView | null>(null);
  const [statusFailure, setStatusFailure] = useState<string | null>(null);
  const [checkpoint, setCheckpoint] = useState<PublishJourneyCheckpoint | null>(null);
  const projectKey = useRef(crypto.randomUUID());
  const fileFieldId = useId();

  const submitting = phase === 'submitting';
  const canRetryRequest = request === null || request.status === 'needs_fix' || request.status === 'failed';
  const projectReady =
    projectMode === 'new' ? projectName.trim() !== '' || preparedProject !== null : projectId.trim() !== '';
  const ready = archive !== null && projectReady && canRetryRequest;
  const requestId = request?.id ?? null;
  const requestStatus = request?.status ?? null;

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

  // 自動で進む状態だけを既存 catalog polling 契約で追う。人待ち状態は叩き続けない。
  useEffect(() => {
    if (requestId === null || requestStatus === null) return;
    const controller = new AbortController();
    const startedAt = Date.now();
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;
    let failures = 0;
    let lastStatus = requestStatus;
    let lastFailureKind: CatalogFailureKind | null = null;
    let pausedForVisibility = false;
    let inFlight = false;

    /** 停止判定の入力。S03 と同じ純関数へ渡し、条件をこの画面側に写さない。 */
    const currentState = (): PollingState => ({
      status: lastStatus,
      consecutiveFailures: failures,
      elapsedMs: Date.now() - startedAt,
      documentVisible: isDocumentVisible(),
      inFlight,
      lastFailureKind,
    });

    const run = async (): Promise<void> => {
      if (cancelled) return;

      // 待機中に hidden へ変わった場合も、通信を始める前に共通契約へ問い直す。
      // 応答後だけ判定すると hidden 中に 1 回余分な request が発生する。
      const beforeRequest = currentState();
      if (!beforeRequest.documentVisible) {
        if (shouldResumeOnVisible(beforeRequest)) pausedForVisibility = true;
        return;
      }

      inFlight = true;
      const result = await port.getRequest(scope, requestId, controller.signal);
      inFlight = false;
      if (cancelled) return;
      if (result.ok) {
        failures = 0;
        lastFailureKind = null;
        lastStatus = result.value.status;
        setRequest(result.value);
        setStatusFailure(null);
      } else {
        failures += 1;
        // PublishJourneyFailure は kind を持たないため、catalog と同じ分類器で導出する。
        // ここで独自の分類を書くと S01 と S03 で終端の定義が割れる
        lastFailureKind = classifyCatalogFailure(result.failure.status);
        setStatusFailure(result.failure.message);
      }
      const state = currentState();
      if (shouldContinuePolling(state)) {
        timer = window.setTimeout(() => void run(), resolveRetryDelayMs(attempt, null));
        attempt += 1;
        return;
      }
      // 可視性だけが理由なら復帰で再開する。終端失敗・終端状態はここで完全に止まる
      if (shouldResumeOnVisible(state)) pausedForVisibility = true;
    };

    const handleVisibilityChange = (): void => {
      if (cancelled) return;
      if (!pausedForVisibility) return;
      if (!isDocumentVisible()) return;
      if (!shouldResumeOnVisible(currentState())) return;
      pausedForVisibility = false;
      void run();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const initialState = currentState();
    if (shouldContinuePolling(initialState)) {
      timer = window.setTimeout(() => void run(), resolveRetryDelayMs(0, null));
    } else if (shouldResumeOnVisible(initialState)) {
      pausedForVisibility = true;
    }

    return () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [port, requestId, requestStatus, scope]);

  async function prepareProject(): Promise<string | null> {
    if (projectMode === 'existing') return projectId.trim();
    if (preparedProject !== null) return preparedProject.id;
    const result = await port.createProject(scope, {
      name: projectName.trim(),
      description: projectDescription.trim(),
      idempotencyKey: projectKey.current,
    });
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
    if (submitting || !ready || archive === null) return;

    setPhase('submitting');
    setFailureMessage(null);
    try {
      const resolvedProjectId = await prepareProject();
      if (resolvedProjectId === null) {
        setPhase('failed');
        return;
      }

      const resetBeforeUpload = request?.status === 'needs_fix';
      const nextCheckpoint =
        phase === 'failed' && checkpoint !== null
          ? checkpoint
          : createPublishJourneyCheckpoint(request?.status === 'needs_fix' ? request.id : null);
      const result = await port.submitPackage(
        scope,
        { projectId: resolvedProjectId, visibility, archive: await archive.arrayBuffer() },
        nextCheckpoint,
        { resetBeforeUpload },
      );

      if (!result.ok) {
        setCheckpoint(result.failure.checkpoint ?? nextCheckpoint);
        setFailureMessage(result.failure.message);
        setPhase('failed');
        return;
      }

      setRequest(result.value.request);
      setCheckpoint(result.value.checkpoint);
      setPhase('idle');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', publishStatusHref(scope, result.value.request.id));
      }
    } catch {
      // File 読み出し・adapter・検証器の予期しない例外でも loading 表示に固着させない。
      setFailureMessage('ZIP を読み取るか公開処理を開始できませんでした。ファイルを確認して再試行してください。');
      setPhase('failed');
    }
  }

  function onArchiveChange(file: File | null): void {
    setArchive(file);
    // 内容が変われば package の指紋も変わる。同じ鍵を再利用せず、request ID だけを引き継ぐ。
    if (file !== null && phase === 'failed' && checkpoint !== null) {
      setCheckpoint(createPublishJourneyCheckpoint(checkpoint.requestId));
      setFailureMessage(null);
    }
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
        description="Web アプリは wrangler によるデプロイと疎通確認が必要なため、この画面では選べません。Publisher CLI を開始した場合だけ Device 承認へ進んでください。"
        action={<ActionLink href="/device">Device 承認を開く</ActionLink>}
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
        ) : (
          <TextInput
            label="Project ID"
            description="現在の Workspace で自分が owner の Project を指定します。"
            value={projectId}
            onChange={(event) => setProjectId(event.currentTarget.value)}
            spellCheck={false}
            required
          />
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

      {request === null ? null : <PublishWizardOutcome scope={scope} request={request} />}
    </section>
  );
}
