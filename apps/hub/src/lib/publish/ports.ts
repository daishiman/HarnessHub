/**
 * publish pipeline が必要とする問い合わせの形 (port)。ADR AD-9。
 *
 * **consumer が形を決める**。これは feat-auth-tenancy が `lib/auth/ports.ts` で採った
 * 「port が先・スキーマが後」と同じ手順で、実装 (`packages/db` の repository) は
 * `db-ports.ts` がこの形へ合わせる。逆向き — repository の行型をそのまま業務ロジックへ流す —
 * にすると、列名の変更が route まで一直線に波及する。
 *
 * ここで宣言する record 型は **`packages/db` が公開する行の型と同名にしない**
 * (`PublishRequestRow` ではなく `PublishRequestRecord`)。同名にすると
 * `scripts/ci/check-shared-layer-duplicates.mjs` の「登録共通層の公開 API と同名の export が
 * owner package 外にある」に該当して CI が落ちる。名前が違うのは飾りではなく、
 * 「これは DB の行そのものではなく、業務が要求する形だ」という区別の表明である。
 *
 * 値域 (状態 9 値・verdict 3 値など) はここで再宣言せず `@harness-hub/schemas` の型を使う。
 */

import type {
  DeploymentProvider,
  PublishFinding,
  PublishRequestState,
  PublishTarget,
  PublishVerdict,
  ReleaseStatus,
} from '@harness-hub/schemas';

/**
 * DB アクセスのスコープ。`tenantId` は必須で、header 申告ではなく
 * **認可を通過した principal のテナント**を入れる (越境は withAuthz が既に落としている)。
 */
export interface PublishScope {
  readonly tenantId: string;
  readonly workspaceId?: string | undefined;
  readonly actorId: string;
}

/**
 * owner 認可に必要な Project の最小投影。
 *
 * name/description などを載せないのは、認可前の resource 解決が業務データを
 * 読み出す経路にならないようにするため。
 */
export interface PublishProjectAccess {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly ownerUserId: string;
}

export interface PublishProjectRecord extends PublishProjectAccess {
  readonly name: string;
  readonly description: string;
}

export interface ProjectAccessPort {
  findById(scope: PublishScope, id: string): Promise<PublishProjectAccess | null>;
  /** 現在の Workspace で参照できる active Project。一覧UIの表示名解決にも使う。 */
  list(scope: PublishScope): Promise<readonly PublishProjectRecord[]>;
  create(
    scope: PublishScope,
    input: { readonly name: string; readonly description: string },
  ): Promise<PublishProjectRecord>;
}

/**
 * `publish_requests.findings_json` に載せる封筒 (envelope)。
 *
 * `content_hash` を専用列ではなくここへ入れているのは、本 feature が
 * `packages/db/schema/` を変更しない (AD-1) ため。列を足せば素直だが、それは
 * feat-domain-model-db の責務であり、cross-feature の DDL 変更を実装 phase で
 * 独断で入れると schema owner の合意なしにテーブルが変わる。
 * 封筒の形をこの 1 箇所に閉じることで、後から列へ移すときの変更点も 1 箇所で済む
 * (follow-up: `publish_requests.content_hash` 列の追加提案)。
 */
export interface PublishPayload {
  /** アップロード済みパッケージの content hash。未アップロードなら null。 */
  readonly contentHash: string | null;
  readonly findings: readonly PublishFinding[];
}

export interface PublishRequestRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly channelId: string;
  readonly status: PublishRequestState;
  readonly verdict: PublishVerdict | null;
  readonly payload: PublishPayload;
  readonly releaseId: string | null;
  readonly requestedBy: string;
  readonly createdAt: number;
}

export interface CreatePublishRequestPortInput {
  readonly workspaceId: string;
  readonly projectId: string;
  readonly channelId: string;
  readonly requestedBy: string;
  readonly idempotencyKey?: string | undefined;
}

/**
 * 状態遷移の入力。`from` は CAS の期待値。
 * `payload` は**全置換**にしてある。部分更新にすると「findings だけ更新したいが
 * contentHash は保持したい」の合成を呼び出し側ごとに書くことになり、
 * 片方を落とす実装が必ず現れる。
 */
export interface TransitionPortInput {
  readonly from: PublishRequestState;
  readonly to: PublishRequestState;
  readonly verdict?: PublishVerdict | null;
  readonly payload?: PublishPayload;
  readonly releaseId?: string | null;
}

export interface PublishListFilter {
  readonly projectId?: string | undefined;
  readonly channelId?: string | undefined;
  readonly status?: PublishRequestState | undefined;
  readonly cursor?: string | undefined;
  readonly limit: number;
}

export interface PublishRequestPort {
  create(scope: PublishScope, input: CreatePublishRequestPortInput): Promise<PublishRequestRecord>;
  findById(scope: PublishScope, id: string): Promise<PublishRequestRecord | null>;
  list(scope: PublishScope, filter: PublishListFilter): Promise<readonly PublishRequestRecord[]>;
  /**
   * 同一 channel の非終端 request (0 件 or 1 件)。直列化の**早期判定**専用。
   * これは正本ではない — 正本は partial UNIQUE index であり、ここは
   * 「明らかに塞がっている」場合に無駄な書込を避けるための先読みにすぎない
   * (読んだ直後に他者が入る余地は残る。だから index 側の防御が要る)。
   */
  findActiveByChannel(scope: PublishScope, channelId: string): Promise<PublishRequestRecord | null>;
  /** CAS。現在状態が `from` でなければ null (競合。例外にしない)。 */
  transition(scope: PublishScope, id: string, input: TransitionPortInput): Promise<PublishRequestRecord | null>;
}

export interface ChannelRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly target: PublishTarget;
  readonly stableReleaseId: string | null;
  readonly createdAt: number;
}

export interface ChannelPort {
  findById(scope: PublishScope, id: string): Promise<ChannelRecord | null>;
  /** `target_channels_project_target_uq` があるので 0 件か 1 件。 */
  findByProjectTarget(scope: PublishScope, projectId: string, target: PublishTarget): Promise<ChannelRecord | null>;
  /** 無ければ作る。並行作成は UNIQUE で 1 本に収束させる。 */
  ensureForProjectTarget(scope: PublishScope, projectId: string, target: PublishTarget): Promise<ChannelRecord>;
  /** stable pointer の atomic 切替。promote も rollback も同じ操作 (向きが違うだけ)。 */
  setStableRelease(scope: PublishScope, channelId: string, releaseId: string | null): Promise<ChannelRecord>;
}

export interface ReleaseRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly channelId: string;
  readonly version: string;
  readonly packageHash: string;
  readonly manifestJson: string;
  readonly status: ReleaseStatus;
  readonly createdBy: string;
  readonly createdAt: number;
}

export interface CreateReleasePortInput {
  readonly projectId: string;
  readonly channelId: string;
  readonly packageHash: string;
  readonly manifestJson: string;
  readonly createdBy: string;
}

export interface ReleasePort {
  /** `created=false` は「直前 release と同一 content のため採番しなかった」を意味する。 */
  create(scope: PublishScope, input: CreateReleasePortInput): Promise<{ release: ReleaseRecord; created: boolean }>;
  findById(scope: PublishScope, id: string): Promise<ReleaseRecord | null>;
  listByChannel(scope: PublishScope, channelId: string): Promise<readonly ReleaseRecord[]>;
  listByProject(scope: PublishScope, projectId: string): Promise<readonly ReleaseRecord[]>;
  /** immutable Release の唯一の更新口 (status のみ)。 */
  updateStatus(scope: PublishScope, id: string, status: ReleaseStatus): Promise<ReleaseRecord>;
}

export interface StoredPackage {
  readonly contentHash: string;
  readonly sizeBytes: number;
}

/**
 * パッケージ本体の保管。R2 への put と `packages` 表への参照登録を**まとめて 1 操作**にする。
 * 分けて公開すると、R2 に載ったが表に無い (= 参照できない孤児) 状態を呼び出し側が作れてしまう。
 */
export interface PackagePort {
  store(bytes: Uint8Array): Promise<StoredPackage>;
  findByHash(contentHash: string): Promise<StoredPackage | null>;
  /** rollback 先を現行ルールで再検査するため、R2 の本体を content hash から読む。 */
  load(contentHash: string): Promise<Uint8Array | null>;
}

export interface IdempotencyEntry {
  readonly requestHash: string;
  readonly responseStatus: number;
  readonly responseBodyJson: string | null;
  readonly expiresAt: number;
}

export interface IdempotencyPort {
  get(scope: PublishScope, ledgerScope: string, key: string): Promise<IdempotencyEntry | null>;
  put(scope: PublishScope, ledgerScope: string, key: string, entry: IdempotencyEntry): Promise<void>;
}

export interface DeploymentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly channelId: string;
  readonly releaseId: string;
  readonly url: string;
  readonly provider: DeploymentProvider;
  readonly orphanCandidate: boolean;
  readonly registeredBy: string;
  readonly createdAt: number;
}

export interface RegisterDeploymentPortInput {
  readonly projectId: string;
  readonly channelId: string;
  readonly releaseId: string;
  readonly url: string;
  readonly provider: DeploymentProvider;
  readonly orphanCandidate: boolean;
  readonly registeredBy: string;
}

export interface DeploymentPort {
  register(scope: PublishScope, input: RegisterDeploymentPortInput): Promise<DeploymentRecord>;
}

/** 時刻。TTL 判定に使うため注入する (テストが実時間を待たずに期限切れを再現できるように)。 */
export interface ClockPort {
  /** epoch ミリ秒。`packages/db` の時刻列 (INTEGER epoch ms) と単位を揃える。 */
  nowMs(): number;
}

/** publish pipeline が要求する依存一式。合成点 (`runtime.ts`) だけが実体を知る。 */
export interface PublishPorts {
  readonly projects: ProjectAccessPort;
  readonly requests: PublishRequestPort;
  readonly channels: ChannelPort;
  readonly releases: ReleasePort;
  readonly packages: PackagePort;
  readonly idempotency: IdempotencyPort;
  readonly deployments: DeploymentPort;
  readonly clock: ClockPort;
}
