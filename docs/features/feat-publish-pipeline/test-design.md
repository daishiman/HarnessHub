---
status: confirmed
layer: feature-design
task: SYS-PUBLISH-PIPELINE-P04
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/design-review-notes.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline テスト設計 (テストファースト)

> **位置づけ**: P04 の成果物。[architecture-decision-record.md](./architecture-decision-record.md) (P02) と [design-review-notes.md](./design-review-notes.md) (P03) を入力に、実装 (P05) に先立って全テストケースを設計する。P03 §9 の 7 要求はすべて本書へ反映済み。

## 0. quality_constraints / acceptance → テスト対応表

| 制約・受入条件 | 検証するテスト系統 | ファイル |
|---|---|---|
| `publish-request-state-machine-section7-2-property-test-qa009` | T1 状態機械 property test | `apps/hub/tests/publish-pipeline/state-machine.test.ts` |
| `green-auto-publish-yellow-red-needs-fix-i2` | T1-E / T3 verdict 写像 | `state-machine.test.ts` / `verdict-mapping.test.ts` |
| `inspection-pipeline-shared-pure-function-package-qa010-qa020` | T2 検査ルール | `packages/inspection/src/package-rules.test.ts` |
| `targetchannel-serialization-single-inflight-publishrequest` | T4 直列化 (2 経路) | `apps/hub/tests/publish-pipeline/serialization.test.ts` |
| `r2-content-addressed-package-registry-domain-model-db-consumer` | T5 package upload | `apps/hub/tests/publish-pipeline/package-upload.test.ts` |
| `append-only-audit-event-all-publish-operations` | T6 監査 | `apps/hub/tests/publish-pipeline/audit.test.ts` |
| `rest-zod-single-source-authz-middleware-qa009` | T7 REST 契約 / T8 冪等性 | `routes.test.ts` → `routes-{auth,request,release}.cases.ts` / `idempotency.test.ts` |
| `publish-api-dual-principal-csrf-boundary-qa059` | T7 認証主体・CSRF / auth entry | `routes-auth.cases.ts` / `tests/security/middleware-entry.test.ts` |
| `immutable-release-targetchannel-stable-pointer-atomic-rollback-i3` | T9 promote/rollback | `apps/hub/tests/publish-pipeline/promote-rollback.test.ts` |
| **acceptance 1** 状態遷移が §7.2 準拠で property test を通る | T1 | — |
| **acceptance 2** 検査 FAIL 時に Needs Fix へ差戻り旧 stable が維持される | T1-E + T9-C | — |
| **acceptance 3** 全操作が append-only 監査 event に記録される | T6 | — |

---

## T1. 状態機械 property test

**対象**: `apps/hub/src/lib/publish/state-machine.ts` の `transition(state, event)`

### T1-A 全数網羅 (property)

9 状態 × 全イベントの直積を生成し、遷移表に載っている組だけが `ok: true` を返し、それ以外がすべて `ok: false, reason: 'illegal_transition'` を返すことを検証する。

> **設計意図**: 「許可された遷移が通る」だけを試すと、**許可していない遷移も通ってしまう**バグが検出できない。直積の全点を確認することで、遷移表が許可の上界であることを保証する。

### T1-B 不変条件 (property)

- 終端状態 (`published` / `failed`) からはどのイベントでも遷移しない。
- 遷移結果は必ず 9 状態のいずれか (未知の状態値を作らない)。
- 同じ (state, event) を何度呼んでも同じ結果 (純関数性)。

### T1-C 到達可能性

`draft` から `published` へ至る経路が少なくとも 1 本存在すること、`draft` から `failed` へ至る経路が存在することを幅優先探索で確認する。

### T1-D 到達不能経路の明示 (P03 R-02 対応)

`ready --submit--> approval_pending` は遷移表に載るが MVP では発火しない。テスト名を
`'ready --submit--> approval_pending は定義上許可されるが MVP では未使用 (Stage 2 で有効化)'`
とし、**到達不能であること自体を assert する** (MVP の policy が Green を自動承認する限り、`ready` に到達した request へ `submit` を送る経路がサービス層に存在しない)。

### T1-E 検査結果の分岐 (acceptance 2 の前半)

- `validating --inspection_green--> ready`
- `validating --inspection_yellow--> needs_fix`
- `validating --inspection_red--> needs_fix`

Yellow と Red が**同じ遷移先**であることを明示的に確認する (MVP サブセットの意図が実装に写っているか)。

### T1-F 終端集合の一致 (P03 §4.1 対応)

`TERMINAL_STATUSES` (状態機械が持つ定数) が、DB の partial UNIQUE index 述語 `status NOT IN ('published','failed','draft')` の補集合と一致することを検証する。

> **設計意図**: index の述語は SQL 文字列であり型検査が効かない。片方だけ変更されると「直列化が効かない状態が生まれる」という、通常のテストでは気づけない破損になる。定数と述語文字列を突き合わせるテストを 1 本置くことで、この乖離を CI で捕まえる。

---

## T2. 検査ルール (packages/inspection)

**対象**: `packages/inspection/src/package-rules.ts` に新規登録する業務ルール群

| ルール ID | stage | 既定 severity | 検証内容 |
|---|---|---|---|
| `PKG-REQUIRED-MANIFEST` | static-validation | error | manifest (`plugin.json` 相当) の存在 |
| `PKG-REQUIRED-META` | static-validation | error | name / version / description の必須メタ |
| `PKG-SEMVER` | static-validation | error | version が semver 形式 |
| `PKG-SKILLS-ONLY` | static-validation | error | skills-package に skills 以外の実行資産が無い |
| `PKG-FORBIDDEN-HOOK` | policy | error | hooks 定義の混入 |
| `PKG-FORBIDDEN-SCRIPT` | policy | error | 実行可能 script (`.sh` / `.py` / `.mjs` 等) の混入 |
| `PKG-FORBIDDEN-BINARY` | policy | error | バイナリ資産の混入 |
| `PKG-RISKY-INSTRUCTIONS` | policy | warn | 高リスク指示パターン (外部送信・認証情報要求・破壊的操作の教唆) |
| `PKG-OWNER-DECLARED` | static-validation | error | owner / 公開範囲の宣言 |
| `PKG-CATALOG-SUMMARY` | static-validation | warn | Catalog 生成に必要な summary の有無 |

### T2-A ルール単体テスト

各ルールにつき最低 3 ケース: (1) 違反なし → findings 0 件、(2) 単一違反 → 1 件、(3) 複数違反 → 件数と location が正しい。

### T2-B 純関数性 (property)

同一 target を 2 回評価して findings が完全一致すること。ルール実装に乱数・時刻・I/O が混入していないことをこれで検出する。

### T2-C pipeline 決定性

ルール登録順を入れ替えて `runInspection` を呼んでも `findings` と `verdict` が一致すること (`createInspectionPipeline` の正準整列が効いているか)。

### T2-D Python 資産との挙動同値

移植元 `plugins/harness-creator/skills/assign-plugin-package-evaluator/scripts/validate-plugin-package.py` の PKG-xxx 判定と、同一入力に対する verdict の一致を検証する。

> **範囲の明示**: Python 側は plugin 全体 (marketplace 登録・contract schema) を検査対象とするが、本 feature が扱うのは publish される skills-package であり、対象が完全に同一ではない。よって**同値を主張するのは「両者が共通して持つ判定項目」に限る**。共通しない項目は本テストの対象外であることを test 名に含め、P08 の移植記録へ差分一覧を残す。

### T2-E severity 方針

`resolveVerdict` は error → `fail`、warn → `warn` に畳む。この畳み込み結果が publish の分岐 (T3) を決めるため、**各ルールの severity 選択が業務判断そのもの**である。severity を変えると公開可否が変わるため、ルールごとに severity を固定した回帰テストを置く。

---

## T3. verdict 写像 (P03 §2.4 対応)

**対象**: `apps/hub/src/lib/publish/verdict.ts`

`InspectionVerdict` (`pass` / `warn` / `fail`) → `publish_requests.verdict` (`green` / `yellow` / `red`) の写像。

- T3-A: `pass → green`, `warn → yellow`, `fail → red` の 3 点。
- T3-B: 写像が 1 箇所にのみ存在すること — `grep` ベースの構造テストで、`'green'` / `'yellow'` / `'red'` のリテラルが写像 module 以外に現れないことを確認する。

> **設計意図**: 語彙が 2 系統 (検査側 / DB 側) あるため、写像が 2 箇所に散ると片方だけ変わる。リテラルの出現箇所を制約することで、写像の単一性を機械的に守る。

---

## T4. TargetChannel 直列化 (2 経路)

**対象**: `apps/hub/src/lib/publish/service.ts` の `submitPublishRequest`

- **T4-A 通常経路**: 同一 channel に別の非終端 request が既に存在する状態で Draft を submit → 409 `channel_busy`。DB へ状態遷移を書かないこと (事前読取で弾く) を port のモック呼出回数で確認する。
- **T4-B 競合経路**: 事前読取では「非終端なし」に見えるが `Draft→Validating` の CAS UPDATE が partial UNIQUE 違反する状況を port モックで再現 → 同じ 409 になること。
- **T4-C 終端後の submit**: 先行 request が `published` / `failed` / `draft` のいずれかなら後続 Draft の submit が通ること (3 状態それぞれ)。
- **T4-D 別 channel は独立**: channel が違えば同時に非終端 request を持てること。

> **P03 §9-4 の要求**: A と B の**両方**を独立にテストする。片方だけでは 2 段構えの意味が検証されない。

---

## T5. package upload (R2 consumer)

**対象**: `PUT /api/v1/publish/:id/package`

- T5-A: サイズ上限超過 → 413 を返し、**`putPackage` が呼ばれない**こと (検査が put の前にあることの確認)。
- T5-B: 種別違反 → 415 を返し、`putPackage` が呼ばれないこと。
- T5-C: 正常時に `putPackage` → `PackagesRepo.record()` の順で呼ばれること。
- T5-D: 同一内容の再アップロードで `contentHash` が同じになり、`record()` が冪等であること。

> **書かないテスト (P03 §9-5)**: `putPackage` 自体の put-once 動作・sha256 の正しさ・key 導出は `packages/db/__tests__/r2-registry.test.ts` に既存。本 feature で重複させない。

---

## T6. 監査 event (acceptance 3)

**対象**: サービス層の全操作

- T6-A: Project 作成の `project.create` と 6 操作 (`publish.request` / `publish.approve` / `publish.cancel` / `channel.promote` / `channel.rollback` / `release.suspend`) + `deployment.register` が、成功時にそれぞれ 1 件の監査 event を追加すること。
- T6-B: 失敗時 (状態不正で 409) には監査 event を**追加しない**こと。
- T6-C: summary に secret・token・package 本体が含まれないこと (許可キーの allowlist で検証)。
- T6-D: 監査 append が失敗したとき、操作全体が失敗として扱われること (監査だけ落ちて操作が成功する経路を作らない)。

> **書かないテスト (P03 §9-6)**: hash chain (seq / prev_hash / event_hash) の整合性検証は `packages/db` 側に既存。

---

## T7. REST 契約

**対象**: 12 経路

- T7-A: 全 route が `withAuthz` を通っていること (`scripts/ci/check-shared-layer-duplicates.mjs` の `unwrapped-route-handler` 検出に依存。追加テスト不要だが、CI 実行を P06 の証跡に含める)。
- T7-B: 各 route の zod 入力検証 — 必須欠落 / 型不正 / 未知フィールドで 400 (`application/problem+json`) を返すこと。
- T7-C: 認可拒否の status 写像 — 未認証 401 / 権限不足 403 / 他テナント 404 (`denyStatusFor` の既存規約に従う)。
- T7-D: 一覧系 (`GET /publish`, `GET /projects/:id/releases`) の cursor ページングが `paginatedSchema` に適合すること。
- T7-E (P03 R-01 解消): `POST /publish/:id/cancel` が `ACTION_RULES['publish.cancel']` (owner / scope `publish:write` / session or Bearer) に従うこと。session owner と Bearer owner は成功し、別 owner・別 tenant/workspace は拒否されることを固定する。session 変更系の Origin/CSRF と、invalid Bearer を session へ fallback しない境界も維持する。

---

## T8. Idempotency

**対象**: `apps/hub/src/lib/publish/idempotency.ts`

- T8-A: `Idempotency-Key` 欠落 → 400。
- T8-B: 未記録の key → handler 実行 + ledger へ記録。
- T8-C: 記録済み + 同一 payload → handler を**実行せず**記録済み応答を再生。
- T8-D: 記録済み + 異なる payload → 422、handler を実行しない。
- T8-E: `expiresAt` 超過の記録は照合対象外 → handler を再実行。
- T8-F: scope が `(tenant, endpoint)` — 別テナントの同一 key が干渉しないこと。

---

## T9. promote / rollback / suspend

- T9-A: promote が `setStableRelease` を 1 回だけ呼ぶこと。
- T9-B: rollback が 2 版目以降でのみ許可されること (release 1 件の channel では 409)。
- T9-C (**acceptance 2 の後半**): `publishing` 中の失敗で `setStableRelease` が**呼ばれない**こと。旧 stable pointer が変化しないことを port の状態で確認する。
- T9-D: rollback 先 release の検査が実行されること (2 版目以降)。検査 fail なら 422 で pointer 不変。
- T9-E: suspend が release の status のみを変えること (`updateReleaseStatus` 以外の更新経路を使わない)。

---

## 10. テスト配置

```text
apps/hub/tests/publish-pipeline/
  state-machine.test.ts     T1
  verdict-mapping.test.ts   T3
  service.test.ts           T4 / T6 / T9 収集入口
  service-request.cases.ts  T4 / request 側 T6
  package-inspection.test.ts T5
  service-release.cases.ts  release 側 T6 / T9
  routes.test.ts            T7 収集入口
  routes-auth.cases.ts      T7 認可・rate limit
  routes-request.cases.ts   T7 request・package
  routes-release.cases.ts   T7 publish・Release・channel
  idempotency.test.ts       T8
  support/harness.ts        port の in-memory fake (共通)
  support/route-context.ts  route runtime / Request builder (共通)
packages/inspection/src/
  package-rules.test.ts     T2
```

> 既存の hub テストは `apps/hub/tests/` 配下 (`auth-tenancy` / `security` 等) に置かれているため、spec が記す `apps/hub/src/__tests__/publish-pipeline/` ではなく**既存慣習に合わせて `apps/hub/tests/publish-pipeline/`** とする。テストの置き場所が 2 系統に分かれると vitest の設定と CI の収集対象が二重になるため。この逸脱は P06 の test-run-results へ記録する。

## 11. port fake の方針

DB / R2 はすべて port の in-memory fake で差し替える (P05 の `ports.ts` が定義する interface に対する実装)。

- 実 DB を使わない理由: 直列化テスト (T4-B) は「UNIQUE 違反が起きた状況」を**意図的に**作る必要があり、実 DB では競合の再現が非決定的になる。fake なら `record()` が投げる例外を直接指定できる。
- ただし T1-F (終端集合と index 述語の一致) だけは fake を経由せず、schema 定義の文字列を直接読んで突き合わせる。

## 12. 検証

- 本書の受入条件 (P04 acceptance): quality_constraints 9 件・acceptance 3 件すべてに対応するテストケースを §0 の対応表で明示し、T1〜T9 に詳細を記載した。
- P03 §9 の 7 要求はすべて反映済み (T1-D / T1-F / T3-B / T4-A+B / T5 の除外方針 / T6 の除外方針 / T8 の 4 分岐)。
