/** Web S01 の書込境界。状態機械と検査は既存 Publish API の所有物として再利用する。 */
import type { PublishProject, PublishProjectChoice, PublishRequestView, PublishVisibility } from '@harness-hub/schemas';

export interface PublishJourneyScope {
  tenantId: string;
  workspaceId: string;
}

export type PublishJourneyStage = 'project' | 'request' | 'reset' | 'package' | 'submit' | 'status';

/**
 * 1 回の投入を再開するための checkpoint。
 *
 * 各 API の鍵を固定し、通信断後も同じ request と同じ副作用を再生する。修正した ZIP の再投入では
 * requestId だけを引き継いで新しい checkpoint を作るため、別内容へ同じ鍵を使うこともない。
 */
export interface PublishJourneyCheckpoint {
  readonly requestId: string | null;
  readonly requestKey: string;
  readonly resetKey: string;
  readonly packageKey: string;
  readonly submitKey: string;
}

export interface PublishJourneyFailure {
  readonly stage: PublishJourneyStage;
  readonly status: number | null;
  readonly message: string;
  readonly checkpoint?: PublishJourneyCheckpoint | undefined;
}

export type PublishJourneyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: PublishJourneyFailure };

export interface PublishProjectPreparation {
  readonly name: string;
  readonly description: string;
  readonly idempotencyKey: string;
}

export interface PublishSubmission {
  readonly projectId: string;
  /** Web S01 は H7 と wrangler の前提を持たない Skill のみに限定する。 */
  readonly visibility: PublishVisibility;
  readonly archive: ArrayBuffer;
}

export interface PublishJourneyProgress {
  readonly request: PublishRequestView;
  readonly checkpoint: PublishJourneyCheckpoint;
}

export interface PublishJourneyPort {
  listProjects(
    scope: PublishJourneyScope,
    signal?: AbortSignal,
  ): Promise<PublishJourneyResult<readonly PublishProjectChoice[]>>;

  createProject(
    scope: PublishJourneyScope,
    input: PublishProjectPreparation,
    signal?: AbortSignal,
  ): Promise<PublishJourneyResult<PublishProject>>;

  /** create request → 必要なら cancel → package → submit。各段は checkpoint から再開できる。 */
  submitPackage(
    scope: PublishJourneyScope,
    input: PublishSubmission,
    checkpoint: PublishJourneyCheckpoint,
    options: { readonly resetBeforeUpload: boolean },
    signal?: AbortSignal,
  ): Promise<PublishJourneyResult<PublishJourneyProgress>>;

  getRequest(
    scope: PublishJourneyScope,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<PublishJourneyResult<PublishRequestView>>;
}
