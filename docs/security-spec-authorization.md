---
status: confirmed
qa_ref: [qa-037, qa-042, qa-045, qa-046, qa-048, qa-050, qa-061, qa-072, qa-073, qa-074, qa-075]
layer: implementation-spec
sources:
  - system-spec/security.md
  - system-spec/auth.md
  - system-spec/00-requirements-definition.md
  - docs/backend-spec.md
  - docs/mockups/harness-studio-v2-analysis.md
doctrine_anchor: OWASP ASVS + Secrets Management Cheat Sheet
serves_goals: [G1, G2, G3, G4, G5]
---

# Authorization — role・許可表・判定契約

> [security-spec.md](security-spec.md) の分冊。旧節番号を維持し、既存の仕様参照との対応を保つ。

## 3. 認可仕様

### 3.1 role モデル

| role | 由来 | 範囲 |
|---|---|---|
| `provider-admin` | `users.role` | 全テナント (提供者自身)。**T11 の対象 — 全操作が監査される** |
| `workspace-admin` | `users.role` | 自テナント / 自 Workspace |
| `member` | `users.role` | 自テナント / 自 Workspace の一般利用者 |
| `owner` | **`projects.owner_user_id` による関係 role (合成)** | 当該 Project のみ |

> `owner` は列ではなく**関係**である (`backend-spec.md` §2.2 既存確定)。同一利用者が Project A では `owner`、Project B では `member` になる。したがって認可判定は **(principal, action, resource) の 3 項**を要し、principal だけでは決まらない。

#### 3.1.1 role の全順序 (許可表の単調性に依存)

```
member  <  owner  <  workspace-admin  <  provider-admin
```

- `backend-spec.md` §3.3 の許可表は**単調**である (左から右へ許可が増えるだけで、上位 role が下位 role の許可を失う行が 1 つも無い)。この事実により、実効 role を**単一値の全順序**として扱え、判定を `effective >= rule.minRole` に還元できる (§3.5)。
- **この単調性は仕様上の前提であり、暗黙の仮定ではない**。表が非単調になった瞬間に判定が壊れるため、テスト T-1 (全 action × 全 role 網羅) が単調性の検査を兼ねる (§8.3)。
- したがって実効 role の合成は「適用しうる role のうち**最大**を返す」で足りる (§3.5)。

#### 3.1.2 workspace-admin の実効範囲は **tenant 単位** (データモデルからの帰結)

| 事実 | 出典 |
|---|---|
| `users` は `tenant_id` を持つが **workspace 所属列を持たない** | `backend-spec.md` §2.2 |
| `workspaces` は「共有・権限の境界」と定義されている | `backend-spec.md` §2.2 |

**この 2 つは矛盾する。** principal に workspace 所属が無い以上、認可判定で `ResourceRef.workspaceId` を突合する対象が存在せず、`workspace-admin` は**名前に反して tenant 単位の管理者**として動作する。

| 判断 | 内容 |
|---|---|
| 本書の確定 | **workspace は共有・カタログの境界であり、権限の境界ではない**。権限の境界は tenant とする。`backend-spec.md` §3.3 が `audit-events 閲覧` を「自テナント」と書いていることとも整合する |
| `ResourceRef.workspaceId` の用途 | 認可判定に**使わない**。データ取得の絞り込み (カタログの可視範囲) にのみ使う |
| 根拠 | C1 (提供者 1 名) 下で、1 テナント内に権限分離が必要なほど多数の workspace を持つ顧客は現時点で想定されない。workspace 単位の権限分離を入れると `workspace_memberships` (M:N) とその分離テストが必要になり、便益に対して運用負荷が見合わない |
| 将来の拡張 | 顧客が「部門ごとに管理者を分けたい」と要求した時点で `workspace_memberships` を追加し、**R4-reopen** で本節を再確定する。それまで role 名は既存確定 (qa-005) を維持する |
| 残余リスク | 1 テナント内の全 workspace が 1 人の workspace-admin から見える。テナント内の部門間機密は保護されない (**顧客への明示事項**) |

### 3.2 判定原則

1. **deny-by-default**: 許可表に一致する規則が無ければ拒否する。
2. **単一ミドルウェア**: 判定は 1 箇所 (`packages/authz`) に集約する。画面側の出し分けは UX であり、**認可ではない**。
3. **両面適用**: 画面 (Server Component / route handler) と API の両方が同じ関数を通る。
4. **tenant scope は認可の前提**: リソースの `tenant_id` と principal の `tenant_id` が一致しない限り、role を見る前に拒否する (`provider-admin` の扱いは §3.5)。
5. **token principal は role ∧ scope の両方**を満たすこと。

### 3.3 許可表 (正本)

正本は `backend-spec.md` §3.3 の認可マトリクス (リソース × role)。**本書はこれを再掲しない**。本書は §3.4 で action 語彙を、§3.5 で判定契約を定める。

### 3.4 action 語彙 (認可の判定単位)

許可表の各行を、コードから参照する安定 id にする。**監査 action (`backend-spec.md` §3.8) と 1:1 でない**ことに注意 — 認可は読取も判定するが、監査は変更のみ記録する。

| action | 対象 | 最小 role |
|---|---|---|
| `metrics.read_aggregate` | dashboard/tracking 集計 | member (金額は集計値のみ) |
| `sheets.create` / `sheets.read_own` | 自分のヒアリングシート | member |
| `sheets.read_all` | テナント内全シート | workspace-admin |
| `sheets.status_change` / `sheets.regenerate` | シート状態 | workspace-admin |
| `builds.read` | 工程ボード閲覧 | member |
| `builds.stage_change` | 工程操作 | workspace-admin |
| `projects.create` | Project 作成 (作成者を owner に固定) | member |
| `projects.update` | Project 情報変更 | owner |
| `harnesses.read` / `harnesses.install` | カタログ閲覧・安定版の導入/ダウンロード descriptor 発行 | member |
| `publish.request` | 自 Project の公開 | owner |
| `publish.approve` / `publish.reject` | Yellow 承認 | workspace-admin |
| `channel.promote` / `channel.rollback` | stable pointer | owner |
| `release.suspend` | 公開停止 | owner (自 Project) / workspace-admin |
| `feedback.create` / `feedback.read` | 改善要望 | member |
| `feedback.status_change` | 状態変更 | workspace-admin |
| `docs.read` | ドキュメント閲覧 | member |
| `docs.write_tenant` | scope=tenant の編集 | workspace-admin |
| `docs.write_common` | scope=common の編集 | **provider-admin** |
| `users.read` | ユーザー一覧 | workspace-admin |
| `users.write` / `users.role_change` | ユーザー管理 | workspace-admin |
| `users.read_salary` / `users.write_salary` | **PII (§4.2)** | workspace-admin |
| `coefficients.change` | 係数設定 | workspace-admin |
| `audit.read` | 監査閲覧 | workspace-admin (自テナント) |
| `aijob.pull` | AI キュー claim | **workspace-admin (自テナントのジョブのみ・D4 scope 内) / provider-admin (全テナント・cross-tenant は監査付き唯一の定常例外)** + scope `aijob:process` (qa-048 改訂 = backend-spec §4.11/§9 と同期) |
| `aijob.complete` / `aijob.fail` | 結果書戻し | **claim 者のみ** + scope `aijob:process` (backend-spec §4.11) |
| `token.revoke_own` | 自分の token 失効 | member (本人) |
| `token.revoke_any` | 他人の token 失効 | workspace-admin |
| `metrics.ingest` | 実行ログ投入 | token + scope `metrics:write` |

### 3.5 判定契約 (`packages/authz`)

認可の心臓部。**この関数を通らない DB アクセス経路を作らない**。

```ts
// packages/authz/src/types.ts
export type BaseRole = 'provider-admin' | 'workspace-admin' | 'member'
export type EffectiveRole = BaseRole | 'owner'
export type Scope = 'publish:write' | 'metrics:write' | 'feedback:write' | 'aijob:process'

export type Principal =
  | { kind: 'session'; userId: string; tenantId: string; role: BaseRole; status: 'active' | 'inactive'; issuedAt: number }
  | { kind: 'token'; tokenId: string; userId: string; tenantId: string; role: BaseRole; scopes: Scope[] }

/** 判定対象リソース。tenantId は必須 (テナント非依存リソースは scope='common' の documents のみ) */
export type ResourceRef = {
  type: 'sheet' | 'build' | 'project' | 'release' | 'feedback' | 'document' | 'user' | 'coefficient' | 'audit' | 'aijob' | 'token' | 'metrics'
  id?: string                  // 監査記録用 (一覧操作では未指定)
  tenantId: string | null      // documents.scope='common' のみ null
  workspaceId?: string         // 認可判定には使わない — 取得の絞り込み専用 (§3.1.2)
  ownerUserId?: string         // projects.owner_user_id — owner 合成に使う
  subjectUserId?: string       // user/token リソースの対象者 — 本人判定に使う
}

/** §3.4 の表を機械可読にしたもの。selfOnly は「本人なら下位 role でも可」を表す (token.revoke_own 等) */
export type ActionRule = { minRole: EffectiveRole; scope?: Scope; selfOnly?: boolean }

export type Decision =
  | { allow: true; effectiveRole: EffectiveRole; crossTenant: boolean }   // crossTenant=true は監査必須 (§5.3)
  | { allow: false; reason: 'tenant_mismatch' | 'inactive_user' | 'revoked_session' | 'missing_scope' | 'insufficient_role' | 'no_rule' }
```

```ts
// packages/authz/src/decide.ts
import { ACTION_RULES } from './rules'   // §3.4 の表を機械可読にしたもの (action -> 最小 role, 必要 scope)

/**
 * 認可判定の単一入口。deny-by-default。
 * 呼び出し側は allow=false のとき RFC 9457 の 403 を返す (存在秘匿が要る場合は 404 — §3.7)。
 */
export function decide(p: Principal, action: Action, r: ResourceRef): Decision {
  const rule = ACTION_RULES[action]
  if (!rule) return { allow: false, reason: 'no_rule' }              // 原則 1: 規則が無ければ拒否

  if (p.kind === 'session' && p.status !== 'active') return { allow: false, reason: 'inactive_user' }
  if (p.kind === 'session' && isRevoked(p.tenantId, p.issuedAt)) return { allow: false, reason: 'revoked_session' }
  if (p.kind === 'token' && rule.scope && !p.scopes.includes(rule.scope)) return { allow: false, reason: 'missing_scope' }

  const effective = resolveEffectiveRole(p, r)                        // ← テナント境界と owner 合成
  if (!effective) return { allow: false, reason: 'tenant_mismatch' }

  // 本人限定 action (token.revoke_own 等) は role 順序で表現できないため個別判定する
  if (rule.selfOnly && r.subjectUserId !== p.userId && !atLeast(effective, 'workspace-admin')) {
    return { allow: false, reason: 'insufficient_role' }
  }
  if (!atLeast(effective, rule.minRole)) return { allow: false, reason: 'insufficient_role' }

  return { allow: true, effectiveRole: effective, crossTenant: r.tenantId !== null && p.tenantId !== r.tenantId }
}

/** §3.1.1 の全順序。許可表の単調性に依存する (T-1 が単調性を検査する) */
const ROLE_ORDER: readonly EffectiveRole[] = ['member', 'owner', 'workspace-admin', 'provider-admin']
const atLeast = (a: EffectiveRole, b: EffectiveRole) => ROLE_ORDER.indexOf(a) >= ROLE_ORDER.indexOf(b)

/**
 * principal と resource から実効 role を決める。テナント境界の唯一の判定点。
 * null を返す = テナント境界違反 (role を見るまでもなく拒否)。
 *
 * 判定順は「テナント境界 → base role → owner 合成」。境界を role より先に見るのが原則 4 (§3.2)。
 */
export function resolveEffectiveRole(p: Principal, r: ResourceRef): EffectiveRole | null {
  // (2) documents.scope='common' は tenant 非依存の共有領域。境界判定の対象外とし role 規則へ委譲する
  //     (書込は rule.minRole='provider-admin' が阻む — §3.4 docs.write_common)
  if (r.tenantId === null) return p.role

  // (1) テナント越境は provider-admin のみ。他は role を見るまでもなく拒否する
  //     越境の可否は §3.1.3 の根拠による。crossTenant として decide() が返し監査を強制する (§5.3)
  if (p.tenantId !== r.tenantId) return p.role === 'provider-admin' ? 'provider-admin' : null

  // (4) workspace-admin は tenant 単位 (§3.1.2)。r.workspaceId は認可判定に使わない
  // (3) owner は関係 role。全順序の下では workspace-admin 以上が既に owner を包含するため、
  //     合成が要るのは member のみ (= 適用しうる role の最大を返す — §3.1.1)
  if (p.role !== 'member') return p.role
  return r.ownerUserId === p.userId ? 'owner' : 'member'
}
```

#### 3.1.3 provider-admin のテナント越境 (確定と根拠)

| 判断 | 内容 |
|---|---|
| 確定 | **越境を許す。ただし暗黙にせず `Decision.crossTenant` として返し、呼び出し側に監査を強制する** |
| 越境が必須な理由 | `idp.connection_change` (§4.3 テナント IdP 設定の登録は提供者の責務)・`aijob.pull` (§3.4 全テナントのジョブを 1 つの AI worker が処理する D5 pull 型)・`docs.write_common`・顧客サポート。越境を全面禁止すると運用が成立しない |
| 却下した案: break-glass (期限付き support session) | 最小権限としては優れるが、承認者が提供者自身 (C1: 1 名) であるため**自己承認**になり、統制として機能しない。手順だけ増えて実効的な防御にならない (security theater — Secure by Design カードの failure mode) |
| 却下した案: 全面禁止 | 上記の必須操作が実行不能になる |
| 代替する統制 | **透明性**: 越境は必ず監査され (`provider.cross_tenant_access` — §5.2)、**顧客の workspace-admin が自テナントの監査で確認できる** (§5.3)。提供者は自分のアクセスを顧客から隠せない |
| 残余リスク | 提供者は DB へ直接到達できるため、アプリ層を経由しないアクセスは記録されない (N1)。**アプリ層の越境禁止はこのリスクを減らさない**一方、監査経路を強制することは減らす |

**既存確定 (qa-031 / `backend-spec.md` §9-3「cross-tenant は監査付き唯一例外」) との関係**: 当該確定は `aijob.pull` を指しており、本節はこれを**否定せず一般化**する。

| 種別 | 経路 | 監査 |
|---|---|---|
| **定常・自動**の越境 | `aijob.pull` / `aijob.complete` のみ (qa-031 の「唯一例外」を維持) | `ai_job.complete` + `provider.cross_tenant_access` |
| **例外的・人手**の越境 | IdP 設定登録 (§4.3)・顧客サポート・障害調査 | `provider.cross_tenant_access` (同一の記録を通す) |

> 定常経路を 1 本に保つ (qa-031 の意図) ことと、例外的越境を**禁止したことにして記録しない**ことは別問題である。後者は監査を迂回させるだけなので、本節は「越境は起きる。ただし必ず記録される」を選ぶ。

**強制の仕組み (呼び出し側の善意に依存しない)**: `decide()` の戻り値を直接使わせず、`withAuthz()` ラッパーを唯一の入口にする。`crossTenant=true` のとき監査 append を**関数内で必ず実行**する。

```ts
export async function withAuthz<T>(p: Principal, action: Action, r: ResourceRef, fn: () => Promise<T>): Promise<T> {
  const d = decide(p, action, r)
  if (!d.allow) throw new AuthzError(d.reason)                       // §3.7 の応答へ写像
  if (d.crossTenant) await auditRepo.append(r.tenantId!, {           // 呼び出し側が忘れられない位置で監査する
    actorType: 'user', actorId: p.userId, action: 'provider.cross_tenant_access',
    entityType: r.type, entityId: r.id, summary: { action },
  })
  return fn()
}
```

### 3.6 tenant scope の強制注入 (T3 対策)

認可判定 (§3.5) は「その操作をしてよいか」を決めるが、**クエリが他テナントの行を返さないこと**は別の防御層で担保する。二重にする理由は、認可の 1 箇所の抜けが即座に全テナント漏洩にならないようにするため (defense in depth)。

| 層 | 実装 | 検証 |
|---|---|---|
| 認可 MW | `decide()` の `tenant_mismatch` 判定 (§3.5) | §8.3 |
| **リポジトリ層** | 全 SELECT/UPDATE/DELETE に `WHERE tenant_id = ?` を**強制注入**する。tenant を受け取らないリポジトリ関数を作らない | §8.4 分離テスト CI |
| 型 | リポジトリ関数の第 1 引数を `TenantCtx` 型 (branded) にし、**忘れるとコンパイルエラー**にする | tsc |
| 例外 | `documents.scope='common'` のみ tenant 非依存 (読取専用・書込は provider-admin) | §8.4 |

```ts
// 例: 型で tenant を強制する
type TenantCtx = { readonly tenantId: string; readonly __brand: 'TenantCtx' }
export function listSheets(ctx: TenantCtx, cursor?: string): Promise<Sheet[]>  // ctx を省略できない
```

### 3.7 拒否時の応答 (存在秘匿)

| 状況 | 応答 | 理由 |
|---|---|---|
| 認証なし | `401` | — |
| 認可拒否・**同一テナント内**のリソース | `403` (RFC 9457) | 存在は既知でよい |
| 認可拒否・**他テナント**のリソース | **`404`** | ID の存在有無を漏らさない (T3 の情報源にしない) |
| scope 不足 (token) | `403` + `detail` に必要 scope | CLI 側で再認可を促す |
