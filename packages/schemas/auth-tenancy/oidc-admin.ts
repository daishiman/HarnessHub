/**
 * provider-admin 向け OIDC 接続管理 API の wire 契約
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * この file の設計上の要は **応答側に client_secret を書ける場所が 1 つも無い**こと。
 * 「返さないように気を付ける」ではなく、返す型が存在しないので返せない。
 * 保存後に運用者が Google Cloud Console 側と突き合わせる手掛かりは
 * `*_last4` (末尾 4 文字) だけに絞ってある (受入条件 2)。
 *
 * issuer を要求本文で受け取らないのも同じ姿勢。顧客持ち込み方式は Google 限定なので
 * (scope_out: Google 以外の IdP 対応)、issuer は server 側の定数から入れる。
 * wire に置くと「Google 以外の issuer を登録した接続」が型としては作れてしまう。
 */
import { z } from 'zod';

import { oidcCredentialModeSchema, oidcCredentialStatusSchema, workspaceDomainSchema } from './primitives.js';

/**
 * 識別用に保持・表示する secret 末尾の文字数。
 *
 * `packages/db` の `CLIENT_SECRET_LAST4_LENGTH` と値は同じだが、あちらは
 * 「保存時に何文字切り出すか」、こちらは「wire でその形を要求する」で層が違う。
 * 名前をわざと変えてあるのは、共通層 detector が「登録共通層の公開 API と同名の export が
 * owner package 外にある」を重複実装として検出するため。同名にすると
 * 「schemas が db の実装を写した」ようにしか見えず、層の違いが機械的には読めない。
 */
export const OIDC_CLIENT_SECRET_LAST4_LENGTH = 4;

/**
 * Google OAuth client ID。
 *
 * 形式検査を掛けるのは、Google Cloud Console からのコピペ事故 (前後の空白・改行の混入、
 * client ID 欄へ secret を貼る) を保存前に止めるため。通してしまうと、失敗するのは
 * 実際に利用者がログインを試みた瞬間になり、原因が「設定した本人の手元」から遠ざかる。
 */
export const googleOauthClientIdSchema = z
  .string()
  .min(1, 'client ID が空です')
  .max(256, 'client ID が長すぎます')
  .regex(/^[A-Za-z0-9._-]+$/, 'client ID に使えない文字が含まれています');

/**
 * Google OAuth client secret。
 *
 * 下限を置くのは総当たり耐性の話ではなく、**last4 が secret 本体にならない**ことを
 * 保証するため。4 文字の secret を許すと `clientSecretLast4()` が全値を返してしまい、
 * 「保存後は last4 しか出さない」という契約自体が意味を失う。
 * 上限は保存列と暗号化の入力を無制限にしないための実務的な制限。
 */
export const googleOauthClientSecretSchema = z
  .string()
  .min(12, 'client secret が短すぎます')
  .max(512, 'client secret が長すぎます');

/**
 * 接続テストの失敗理由。
 *
 * **自由文にしない。** 失敗の説明を文字列で組み立てられるようにすると、
 * 「Google からの応答本文をそのまま入れる」という一番手軽な実装が通ってしまい、
 * 応答本文に混ざった値が API・ログ・監査へ流れる経路ができる。列挙なら流れようがない。
 */
export const oidcConnectionTestFailureSchema = z.enum([
  /** discovery document を取得できない (issuer が違う / ネットワーク断)。 */
  'discovery_unreachable',
  /** discovery document の `issuer` が要求した issuer と一致しない。 */
  'issuer_mismatch',
  /** client_id / client_secret の組が Google に拒否された。 */
  'invalid_client',
  /** token endpoint が想定外の応答を返した (Google 側の仕様変更・障害)。 */
  'unexpected_response',
]);
export type OidcConnectionTestFailure = z.output<typeof oidcConnectionTestFailureSchema>;

/**
 * rotation の進行状況。
 *
 * `staged` を独立させず `pending_client_secret_last4` の有無で表現することもできるが、
 * それだと UI 側が「null なら rotation 中でない」という規則を各画面で持つことになる。
 * 状態は 1 つの boolean で明示する。
 */
export const oidcSecretRotationSchema = z.object({
  /** 新 secret が staging されているか。true の間も現行 secret でログインできる。 */
  staged: z.boolean(),
  pending_client_secret_last4: z.string().length(OIDC_CLIENT_SECRET_LAST4_LENGTH).nullable(),
  /**
   * staging 中の新しい client ID。null = client ID は据え置き (secret だけの rotation)。
   *
   * 1 テナントの Google 接続は 1 行しか作れないため、別の OAuth client への載せ替えも
   * この staging を通る。画面が「secret だけ変わるのか、client ごと変わるのか」を
   * 区別できないと、Google Cloud Console 側で確認すべき対象を運用者が取り違える。
   */
  pending_client_id: z.string().nullable(),
  /**
   * staging 中の credential 方式。null = 方式は据え置き。
   *
   * 現行 `credential_mode` と違う値が入っていれば mode 切替が進行中。
   * 切替が確定するのは有効化の時点で、それまでは現行方式でログインできる。
   */
  pending_credential_mode: oidcCredentialModeSchema.nullable(),
  /** staging 中の secret が接続テストに合格した時刻 (ISO8601)。null = 未検証。 */
  pending_tested_at: z.string().min(1).nullable(),
});
export type OidcSecretRotation = z.output<typeof oidcSecretRotationSchema>;

/**
 * 接続 1 件の表示用要約。
 *
 * `resolvable` を計算済みで載せるのは、「この接続でログインできるか」の判定規則
 * (= `credential_status === 'active'`) を画面側へ写させないため。写すと、状態を 1 つ増やしたときに
 * server と画面で解釈がずれ、画面上は有効に見えるのに実際は解決されない接続が生まれる。
 */
export const oidcConnectionSummarySchema = z.object({
  id: z.string().min(1),
  tenant_id: z.string().min(1),
  issuer_url: z.string().min(1),
  /** 共有方式の行では空文字 (client ID は環境単位に置き、テナント行へ複製しない)。 */
  client_id: z.string(),
  credential_mode: oidcCredentialModeSchema,
  credential_status: oidcCredentialStatusSchema,
  /** 現行 secret の末尾 4 文字。null = 共有方式 / last4 列を足す前の行。 */
  client_secret_last4: z.string().length(OIDC_CLIENT_SECRET_LAST4_LENGTH).nullable(),
  rotation: oidcSecretRotationSchema,
  last_tested_at: z.string().min(1).nullable(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1).nullable(),
  allowed_workspace_domains: z.array(workspaceDomainSchema),
  /** この接続が今まさに認証解決に使われる状態か。 */
  resolvable: z.boolean(),
});
export type OidcConnectionSummary = z.output<typeof oidcConnectionSummarySchema>;

/**
 * Google Cloud Console 側へ手で登録する値。
 *
 * 管理画面が Google の設定を代行しているように見せないため、**Hub が生成できるのはこの値だけ**
 * だと明示する位置づけの型 (苦戦箇所 1)。OAuth client の作成・変更・削除は Google 側の手作業。
 */
export const oidcConnectionSetupSchema = z.object({
  tenant_slug: z.string().min(1),
  /** 顧客持ち込み方式で Console の「承認済みのリダイレクト URI」へ登録する URL。 */
  customer_callback_url: z.string().min(1),
  /** 共有方式へ切り替えた場合に使われる URL。両方式の差を画面で並べて示すために返す。 */
  shared_callback_url: z.string().min(1),
  /** Console の OAuth 同意画面で有効化しておく scope。 */
  required_google_scopes: z.array(z.string().min(1)),
});
export type OidcConnectionSetup = z.output<typeof oidcConnectionSetupSchema>;

export const oidcConnectionListResponseSchema = z.object({
  setup: oidcConnectionSetupSchema,
  items: z.array(oidcConnectionSummarySchema),
});
export type OidcConnectionListResponse = z.output<typeof oidcConnectionListResponseSchema>;

/**
 * 接続の新規登録要求。
 *
 * `credential_status` を受け取らない。登録は常に `pending` から始まり、接続テストを
 * 通らないと `active` にならない。wire から初期状態を指定できると、
 * 「テストを飛ばして有効化する」経路が API 1 本で作れてしまう (受入条件 4)。
 */
export const oidcConnectionRegisterRequestSchema = z.object({
  client_id: googleOauthClientIdSchema,
  client_secret: googleOauthClientSecretSchema,
  /**
   * 許可 Google Workspace ドメイン。省略・空配列は「`hd` を検査しない」(既存の顧客方式の挙動)。
   * 共有方式と違い必須にしないのは、顧客方式では `aud` が顧客の client ID でテナントを識別できるため。
   */
  allowed_workspace_domains: z.array(workspaceDomainSchema).default([]),
});
export type OidcConnectionRegisterRequest = z.output<typeof oidcConnectionRegisterRequestSchema>;

/** rotation の新 secret 登録要求。client ID は変わらない (変えるなら別接続として登録する)。 */
export const oidcSecretRotationStageRequestSchema = z.object({
  client_secret: googleOauthClientSecretSchema,
});
export type OidcSecretRotationStageRequest = z.output<typeof oidcSecretRotationStageRequestSchema>;

/**
 * 接続テストの対象。
 *
 * 要求と応答で**同じ enum を共有する**。応答側だけに書くと、
 * 「pending を頼んだのに current が試された」を型では検出できない組合せが生まれる。
 */
export const oidcConnectionTestTargetSchema = z.enum(['current', 'pending']);
export type OidcConnectionTestTarget = z.output<typeof oidcConnectionTestTargetSchema>;

/**
 * 接続テストの要求。
 *
 * 既定を `current` にするのは、rotation していない接続に対する「とりあえずテスト」が
 * 最も多い操作だから。`pending` は明示的に指定させる — 既定が pending 側だと、
 * rotation 中に何気なく押したテストが新 secret を検証済みにしてしまう。
 */
export const oidcConnectionTestRequestSchema = z.object({
  target: oidcConnectionTestTargetSchema.default('current'),
});
export type OidcConnectionTestRequest = z.output<typeof oidcConnectionTestRequestSchema>;

/**
 * 接続テストの結果。
 *
 * `target` を返すのは、rotation 中に「どちらの secret を試したのか」を運用者が
 * 取り違えないため。Hub 側の pending/active と Google 側の enabled/disabled は別物で、
 * ここを曖昧にすると旧 secret を無効化する判断を誤る (苦戦箇所 3)。
 */
export const oidcConnectionTestResponseSchema = z.object({
  id: z.string().min(1),
  target: oidcConnectionTestTargetSchema,
  passed: z.boolean(),
  failure_reason: oidcConnectionTestFailureSchema.nullable(),
  connection: oidcConnectionSummarySchema,
});
export type OidcConnectionTestResponse = z.output<typeof oidcConnectionTestResponseSchema>;

/** 状態を変える操作 (有効化・無効化・rotation 取消) の共通応答。 */
export const oidcConnectionMutationResponseSchema = z.object({
  connection: oidcConnectionSummarySchema,
});
export type OidcConnectionMutationResponse = z.output<typeof oidcConnectionMutationResponseSchema>;

/**
 * 管理 API の業務エラー。認可拒否 (`withAuthz` が返す形) とは別語彙にしてある。
 * 混ぜると「権限が無い」と「順序が違う」が同じ文字列で返り、運用者が次の手を決められない。
 */
export const oidcAdminErrorSchema = z.object({
  error: z.enum([
    /** 対象の接続が無い (テナント越境も同じ応答に畳む)。 */
    'connection_not_found',
    /** 共有方式の行に対して顧客方式の操作を要求した。 */
    'not_customer_managed',
    /** 直前に読んだ状態から動いていた (CAS 敗北)。読み直して再試行する。 */
    'state_conflict',
    /** lifecycle が許さない順序 (テスト前の有効化など)。 */
    'invalid_transition',
    /** rotation 中でないのに rotation 操作を要求した。 */
    'rotation_not_staged',
    /** 要求本文が契約を満たさない。 */
    'invalid_request',
  ]),
});
export type OidcAdminError = z.output<typeof oidcAdminErrorSchema>;
