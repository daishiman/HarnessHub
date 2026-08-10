'use client';

/**
 * S01 Web 公開。Project 準備から既存 Publish API、状態確認、同一 request 再投入までを 1 画面に束ねる。
 */
import {
  formatPublishFinding,
  PUBLISH_NEEDS_FIX_HEADING,
  PUBLISH_RESUBMIT_ACTION_LABEL,
  type PublishProject,
  type PublishRequestState,
  type PublishRequestView,
  type PublishVisibility,
  publishNeedsFixSummary,
} from '@harness-hub/schemas';
import { ActionLink, Alert, Button, Select, StatusChip, Textarea, TextInput } from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { publishStatusChipValue, resolveRetryDelayMs, shouldContinuePolling } from '../../lib/catalog/index.js';
import {
  createPublishJourneyCheckpoint,
  httpPublishJourneyPort,
  type PublishJourneyCheckpoint,
  type PublishJourneyPort,
  type PublishJourneyScope,
} from '../../lib/publish-journey/index.js';

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

function statusDescription(status: PublishRequestState): string {
  switch (status) {
    case 'draft':
      return 'ZIP の投入を再開できます。';
    case 'validating':
      return 'Hub が ZIP を検査しています。';
    case 'needs_fix':
      return '指摘を直した ZIP を選び、同じ公開要求へ再投入してください。';
    case 'ready':
      return '検査を通過し、公開の準備ができています。';
    case 'approval_pending':
      return 'Workspace 管理者の確認を待っています。';
    case 'approved':
      return '承認済みです。公開処理の開始を待っています。';
    case 'publishing':
      return '公開処理を進めています。';
    case 'failed':
      return '公開処理は完了しませんでした。ZIP を確認し、新しい公開要求でやり直してください。';
    case 'published':
      return 'Hub への公開処理が完了しました。';
  }
}

function statusHref(scope: PublishJourneyScope, requestId: string): string {
  const query = new URLSearchParams({
    tenant: scope.tenantId,
    workspace: scope.workspaceId,
    publish: requestId,
  });
  return `/catalog/publish?${query.toString()}`;
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

    const run = async (): Promise<void> => {
      const result = await port.getRequest(scope, requestId, controller.signal);
      if (cancelled) return;
      if (result.ok) {
        failures = 0;
        lastStatus = result.value.status;
        setRequest(result.value);
        setStatusFailure(null);
      } else {
        failures += 1;
        setStatusFailure(result.failure.message);
      }
      if (
        !shouldContinuePolling({
          status: lastStatus,
          consecutiveFailures: failures,
          elapsedMs: Date.now() - startedAt,
          documentVisible: isDocumentVisible(),
          inFlight: false,
        })
      ) {
        return;
      }
      timer = window.setTimeout(() => void run(), resolveRetryDelayMs(attempt, null));
      attempt += 1;
    };

    if (
      shouldContinuePolling({
        status: requestStatus,
        consecutiveFailures: 0,
        elapsedMs: 0,
        documentVisible: isDocumentVisible(),
        inFlight: false,
      })
    ) {
      timer = window.setTimeout(() => void run(), resolveRetryDelayMs(0, null));
    }

    return () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
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
        window.history.replaceState(null, '', statusHref(scope, result.value.request.id));
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

function PublishWizardOutcome({
  scope,
  request,
}: {
  readonly scope: PublishJourneyScope;
  readonly request: PublishRequestView;
}): ReactNode {
  return (
    <section aria-labelledby="publish-wizard-result-heading">
      <h3 id="publish-wizard-result-heading">公開状態</h3>
      <p aria-live="polite">
        <StatusChip domain="publish" status={publishStatusChipValue(request.status)} />
      </p>
      <p>{statusDescription(request.status)}</p>
      <p>
        公開要求 ID: <code>{request.id}</code>
      </p>
      <ActionLink href={statusHref(scope, request.id)}>この公開状態を確認する</ActionLink>

      {request.status === 'needs_fix' ? (
        <section aria-labelledby="publish-wizard-findings-heading">
          <h4 id="publish-wizard-findings-heading">{PUBLISH_NEEDS_FIX_HEADING}</h4>
          <p>{publishNeedsFixSummary(request.verdict)}</p>
          {request.findings.length === 0 ? null : (
            <ul>
              {request.findings.map((finding) => (
                <li key={`${finding.stage}-${finding.rule_id}-${finding.path ?? ''}-${finding.line ?? ''}`}>
                  {formatPublishFinding(finding)}
                </li>
              ))}
            </ul>
          )}
          <p>{PUBLISH_RESUBMIT_ACTION_LABEL}</p>
        </section>
      ) : null}

      {request.status === 'published' ? (
        <Alert
          tone="warning"
          title="導入経路はまだ利用できません"
          description="Skill の配布方式を決める Stage 0 technical gate (H7) が未成立です。Hub への公開記録は完了していますが、誤った導入コマンドや利用不能なリンクは表示しません。H7 成立後、この公開状態から導入案内へ接続します。"
        />
      ) : null}
    </section>
  );
}
