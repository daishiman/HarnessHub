---
graph_node_id: "spec-harness-hub-requirements"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["system-spec-import","platform"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub システム要件仕様 (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-07-30T04:40:19Z"
status: "active"
depends_on: []
related_nodes: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-dev-workflow","arch-harness-hub-frontend","arch-harness-hub-infrastructure","arch-harness-hub-security","arch-harness-hub-testing-qa"]
resource_scope: ["specs/harness-hub-system-specification.md"]
purpose: "非エンジニアの AI 自己解決の実現 (U1) に向けた Harness Hub の要件正本への参照点を dev-graph に固定する"
goal: "全 feature/task が U1-U9 と G1-G4 へトレースできる状態を維持する"
scope_in: ["system-spec/00-requirements-definition.md","system-spec/index.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-system-specification.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"190b5c6131b7c7817919692648e4b4cecd7124a3b038dbaddc7d206c9dfe081b","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260724-testing-qa-r2.json"}
source_lineage: {"imported_at":"2026-07-24T12:35:34Z","origin_kind":"system-spec-harness","source_digest":"190b5c6131b7c7817919692648e4b4cecd7124a3b038dbaddc7d206c9dfe081b","source_path":"system-spec/00-requirements-definition.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-system-specification.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-17T00:35:59Z","missing_sections":[],"status":"complete"}
---

# Harness Hub システム要件仕様 (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/00-requirements-definition.md](../system-spec/00-requirements-definition.md) (sha256: `190b5c6131b7c78…`)
- [system-spec/index.md](../system-spec/index.md) (sha256: `862938b8c222c01c…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260724-testing-qa-r2.json`、evaluated_digest `190b5c6131b7c78…`)
- 取込日時: 2026-07-24T12:35:34Z / plugin: system-spec-harness v0.1.0

## 目的と成功状態

要件の正本は system-spec/00-requirements-definition.md (U1-U9 憲法・意思決定 D1-D4) と各技術章。本 specification node は内容を複製せず正本を参照し、feature 分解の lineage 起点となる。

## スコープ

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 用語と主体

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## ユースケースとユーザーフロー

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 機能要件

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 非機能要件

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## UI・状態遷移

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## ビジネスルールと検証

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## API契約

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## データモデル

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 認証・認可

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**実装反映 (2026-07-26 / HarnessHub-b7ng)**:

- `qa-074`、`qa-075`、`qa-082`〜`qa-086` として auth / security / backend / database / infrastructure の web セルを R4 reopen →再確定した。
- Auth.js 本番 route、DB-backed AuthPorts、CAS 一回性、テナント付き所属主キー、Worker Secret、要求間 write 分離と rollout 順序を正本へ書き戻した。
- 反映先と検証の対応は [仕様反映受領書](../docs/features/feat-auth-tenancy/spec-reflection-receipt.md) を正とする。

**本番反映 (2026-07-30 / `SYS-AUTH-TENANCY-P13` / qa-097〜qa-099)**:

- productionはGoogle OIDC / HarnessHub 1テナントを現行rollout境界とする。製品の複数テナント分離契約、
  分離試験、将来の共通Google OAuth client方式と顧客持ち込み方式は維持する。
- tenant別CSRF cookie/tokenを取得してから同じAuth.js basePathへnative form POSTし、
  Googleへの302をブラウザ遷移として処理する。CSRF取得失敗・空値・不一致はfail-closedとする。
- Google client secretは1Passwordから登録時だけmasked展開し、purpose別DEKでDBへ暗号化する。
  Workerは共通`ENCRYPTION_KEK`を使い、GitHubやテナント別Worker Secretへ値を複製しない。
- 正本は[auth](../system-spec/auth.md)・[security](../system-spec/security.md)・
  [infrastructure](../system-spec/infrastructure.md)、対応表は
  [P13仕様反映受領書](../docs/features/feat-auth-tenancy/p13-spec-reflection-receipt.md)を参照する。

## エラー・例外・回復

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**開発フロー反映 (2026-07-28 / `HarnessHub-7xi9`)**:

- `system-spec/dev-workflow.md` の desktop-windows / desktop-macos を R4-reopen し、`qa-088` で `qa-039` の既存ローカル開発契約と並列 worktree の整合性契約を自己完結して再確定した。
- ref 更新は `reference-transaction` で予防し、判定不能時は修復可能性を残すため fail-open とする。巻き戻し commit は `pre-commit` で fail-closed に止める二層境界を正本とした。
- 影響は repository の開発運用に限定され、Hub の外部 API・データモデル・認証認可・Cloudflare deploy unit は変更しない。

## イベント・非同期処理

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 可観測性

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 互換性・移行・リリース

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**認証production rollout (2026-07-30 / `SYS-AUTH-TENANCY-P13`)**:

- `wrangler.jsonc`の公開URL 3変数と必須Worker Secret名5件を配備契約とし、値はGitへ保存しない。
- Google/HarnessHub 1テナントでprovider/CSRF/sign-in、JIT、Workspace所属、Device Flow、
  refresh rotation/reuse失効、session revocationをR1〜R5として本番実測した。
- 2番目のproduction tenantを本リリース条件から外したことと、製品全体の複数テナント分離保証を
  外したことを混同しない。後続方式は`HarnessHub-fnej` / `HarnessHub-uk2i`で追跡する。
- **実装ゲート追補**: CIはmigration前にdeploy依存設定の存在を検査し、deploy後は
  provider/canonical callback、未知tenant拒否、CSRF、Google認可URLの
  `state`・`nonce`・PKCEまでを本番URLで検査する。owner認可はDBのbase roleではなく
  resourceとの関係roleとして、全action×role表とcross-tenant拒否を名前付きゲートで再実行する。
  これは`qa-091` / `qa-097` / `qa-099`と既存認可表の検証手段を固定する追補であり、
  製品仕様・role順序・API・DB schemaは変更しない。

**差分追記 (2026-07-25 / feat-domain-model-db P13 / `SYS-DOMAIN-MODEL-DB-P13`)** — 詳細正本は [docs/infrastructure-spec.md](../docs/infrastructure-spec.md) §7 / §10、実測証跡は [docs/features/feat-domain-model-db/release-record.md](../docs/features/feat-domain-model-db/release-record.md)。

- **リリースの成立条件**: production migration の台帳一致 → deploy → `/health` → 本番スモーク 6 項目 (接続 / ULID / release 不変性 / R2 往復 / audit chain / export-restore dry-run) の全 pass。1 項目でも欠ければリリース成功と数えない。
- **前方互換の約束**: schema 変更は expand-only。旧 code が新 schema 上で動作することを前提に、障害時は **code のみ巻き戻し DB は前進させたまま**とする。
- **バックアップの成功定義**: 「upload できた」ではなく「取り直したバイト列が一致し、その日次成果物を restore CLI が検証付きで復元できた」。保存形式・四半期 drill・障害復旧を control-plane JSONL の単一経路へ揃える。

**差分追記 (2026-07-26 / `HarnessHub-fnzl`・`HarnessHub-0yvi`)**

- **設定契約**: GitHub Actions の secret / variable は `scripts/ci/actions-secrets-registry.json` を機械可読な正本とし、workflow 実参照との双方向突合を CI の静的ゲートで実行する。実投入状況は同じ検査の `--live` で確認する。
- **復元契約**: `backup.yml` は `export-control-plane.ts` の JSONL を gzip して R2 に保存し、`restore-control-plane.ts` が header・行数・audit chain・暗号断面を fail-closed で検査する。日次形式と drill の不一致を許容しない。
- **仕様影響判定**: qa-011 / qa-019 の RPO・RTO・復元可能性要件を具体化した実装反映であり、外部 API・データモデル・確定 QA の変更はない。

**差分追記 (2026-07-29 / `HarnessHub-bda4` / qa-091)**

- **Cloudflare credential 契約**: Actions の deploy / rollback は R2 write 権限を持たない `CLOUDFLARE_API_TOKEN`、backup / production smoke の R2 object 操作は Workers Scripts 権限を持たない `CLOUDFLARE_R2_API_TOKEN` を使う。
- **R2 permission 契約**: Wrangler の remote object 操作は Cloudflare REST API を使うため、R2 token には account-scoped の `Workers R2 Storage Write` を付与する。bucket-scoped item 権限は S3 互換 API 専用なので代替にしない。
- **受入契約**: workflow と `scripts/ci/actions-secrets-registry.json` の双方向一致、および deploy / R2 token の相互不参照を静的ゲートで遮断する。実投入は `--live`、拒否系と完走は GitHub Actions の外部実測を根拠とし、文書更新だけで完了扱いにしない。
- **仕様影響判定**: CI/CD credential の権限境界を変更したため infrastructure.web を正式に reopen し qa-091 として反映した。外部 API、DB schema、認証認可モデル、UI、deploy unit の変更はない。

## テストと受入条件

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-25 / feat-domain-model-db P13)**: P13 の受入 6 項目は文書上のチェックリストではなく `packages/db/scripts/smoke-production.ts` の exit code に係留する。検証で作成した行と R2 オブジェクトは `finally` で必ず削除し、**削除失敗自体をテスト失敗**として扱う (本番へ検証ゴミを残したまま緑にしない)。CLI の結合検査は `packages/db/__tests__/backup-restore.test.ts` が R2 CLI stub で機械検証する。

**差分追記 (2026-07-26)**: `packages/db/__tests__/runbook-invocation.test.ts` は runbook に記載した `pnpm --filter ... exec` コマンドをそのまま実走し、引数区切りと cwd (実行時の基準ディレクトリ) の回帰を検出する。`apps/hub/tests/ci/actions-secrets.test.ts` は台帳の 4 方向突合と live 設定検査の fail-closed 性を固定する。

**開発品質反映 (2026-07-29 / `HarnessHub-9ndl`・`HarnessHub-dyxr`)**:

- `system-spec/testing-qa.md` の qa-089 として、AI skill の live-trial を受入根拠にする場合の durable evidence（repository に残り clean clone でも解決できる証拠）、scenario・task 手順束縛と失効、pre/post 実測、最終 node への評価 digest 束縛、反証可能な negative control、監査 provenance を確定した。
- 影響は repository 内の開発品質ゲートに限定され、Harness Hub 製品の外部 API・データモデル・認証認可・UI・Cloudflare deploy unit は変更しない。
- 反映先と検証は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/live-trial-acceptance-hardening-spec-reflection.md) を正とする。

**開発品質追補 (2026-07-30 / `HarnessHub-yn71`)**:

- qa-100 は qa-089 の受領境界を fail-closed（確認不能なら失敗）にし、live-trial の `scenario_contract`、全 required observation、引数、宣言済み task 契約、run 内 evidence を criteria-test で再照合する。旧形式の欠落は互換成功にせず fresh run で更新する。
- 影響は開発証拠の受領だけで、schedule skill 本体と製品契約は非変更。反映対応は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/live-trial-scenario-contract-required-spec-reflection.md) を正とする。

**開発運用反映 (2026-07-29 / `HarnessHub-cjwm`・`HarnessHub-0vs2`)**:

- `system-spec/dev-workflow.md` の qa-090 として、live-trial session の通常 cleanup は
  session 名の run prefix、記録済み run-id、記録済み owner PID の完全一致へ限定する。
- run-id または owner PID が無い通常 `reap` は拒否し、全件削除は明示的な管理者操作
  `--all` だけに限定する。別 owner、別 run、metadata 無し session は通常 cleanup で削除しない。
- 影響は repository 内の macOS 開発用 acceptance harness に限定される。製品仕様は非変更。
  反映先と検証は
  [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/live-trial-reaper-spec-reflection.md)
  を正とする。

**開発品質反映 (2026-07-29 / `HarnessHub-4t9g`)**:

- `system-spec/dev-workflow.md` の `qa-092` として、Dev Graph C11 が artifact の
  required section 本文を検査する契約を確定した。
- 空本文、canonical placeholder の残存、`TBD` / `TODO` / `未定` だけの節は
  `implementation_readiness=incomplete` とし、節名を `missing_sections` に返す。
- C02 の template-only 新規生成と placeholder への再生成は transaction rollback
  する。実本文の保持と substantive body による作成・復旧は維持する。
- 影響は repository 内の readiness、tracker 投影、system build handoff に限定する。
  製品 API・DB・認証認可・UI・Cloudflare deploy unit は変更しない。
  反映先と検証は
  [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/c11-artifact-body-readiness-spec-reflection.md)
  を正とする。

**運用監視反映 (2026-07-29 / `HarnessHub-dbx6` / qa-094)**:

- 日次 backup は Worker 日次 cron と別の Better Stack heartbeat を使い、`CRON_HEARTBEAT_URL` と `BACKUP_HEARTBEAT_URL` を共用しない。
- `BACKUP_HEARTBEAT_URL` は required。backup workflow は未投入を前提確認で拒否し、全 step 成功後だけ heartbeat を送る。
- backup heartbeat は `period=86400` 秒 / `grace=3600` 秒。repository 内実装、外部資源、GitHub secret、main 成功 run、着信実測を分離し、後者 4 件が揃うまで完了を主張しない。
- 反映先と検証は [backup heartbeat 分離 仕様反映受領書](../docs/features/feat-hub-foundation/backup-heartbeat-spec-reflection-receipt.md) を正とする。

**開発品質ゲートの空走査反映 (2026-07-30 / `HarnessHub-foq6` / qa-096)**:

- `system-spec/dev-workflow.md` の web セルを正規に reopen し、qa-069 の
  MVP ファースト契約を維持したまま qa-096 へ再確定した。
- 品質ゲートは directory 不在・検査対象 0 件を既定で失敗させ、
  意図的な空走査だけを明示 opt-in で許可する。
- `qa-092` / `appr-013` は main 側 C11 契約を保持し、本変更は空き ID
  `qa-096` / `appr-015` へ再採番した。
- 製品 API・DB・認証認可・UI・deploy unit は変更しない。反映と検証は
  [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/foq6-workflow-step-guard-spec-reflection.md)
  を正とする。

**開発管理整合性の反映 (2026-07-29 / `HarnessHub-bk8v`)**:

- dev-graph C02 は、昇格済み feature へ古い full snapshot が再送されても lifecycle を
  暗黙に後退させない。stale before-image は dry-run / apply とも無変更で拒否し、
  意図的な再評価は変更フィールドを列挙した明示 patch に限定する。
- 反映対象は repository 内の開発管理契約である。Harness Hub 製品の外部 API、
  DB schema、認証認可、UI、Cloudflare deploy unit、確定済み QA 回答は変更しない。
- 実装契約、設計判断、検証結果の対応は
  [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/bk8v-c02-lifecycle-spec-reflection.md)
  を正とする。

**開発品質反映 (2026-07-29 / `HarnessHub-xswf` / qa-095)**:

- skill 構造 lint は人が管理する tree の深さ・命名・許可 directory を検査し、
  test tool が生成する dot directory、`__pycache__`、`.pyc` は構造判定から除外する。
- repository root と配布 plugin の lint 実装は同一バイト列を維持し、
  `.pytest_cache` / `.mypy_cache` / 任意の dot cache と通常の nested directory 違反を
  正負の回帰検体にする。
- per-plugin pytest の直後に repository criteria test を実行しても結果が変わらないことを
  task の広域回帰証拠とする。製品 API・DB・認証認可・UI・deploy unit は変更しない。
- 反映先と検証は
  [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/skill-tree-cache-spec-reflection-receipt.md)
  を正とする。

**開発品質反映 (2026-07-30 / `HarnessHub-ml57` / qa-088 実装具体化)**:

- CI の repository-root Python 検査と local pre-push の hard gate を、
  script path と正規化済み引数の集合として突合する meta-lint を追加した。
- CI blocking invocation は local hard gate または理由付き allowlist のどちらかに
  必ず属し、未被覆、理由欠落、stale allowlist は fail-closed で拒否する。
- 外部資格情報、working-tree write、CI non-blocking の呼び出しは、実行しない理由を
  exact invocation ごとに記録し、「CI 全体を local で完全再現する」という過大な宣言を避ける。
- これは qa-088 の local development contract の具体化であり、製品 API、DB schema、
  認証認可、UI、Cloudflare deploy unit は変更しない。
- 反映先と最終検証は
  [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/local-ci-parity-spec-reflection-receipt.md)
  を正とする。

**公式出典鮮度と Stage 0 再検証の反映 (2026-07-30 / `HarnessHub-e2u`)**:

- C08 公式出典台帳の確認値を Next.js 16.2.12、Drizzle stable 0.45.2 /
  v1 prerelease rc.4、Wrangler 4.115.0、Claude Code 2.1.220 時点へ更新した。
  これらは採用版の自動変更ではなく、実装・依存更新前に再確認する固定点である。
- Claude Code の現行公式 `git-subdir` source は旧 H7 後に確認された有効な
  配信候補である。ただし、macOS / Windows の Skills 列挙と実 skill 起動が
  未検証なので、Stage 0 の `NOT_ESTABLISHED` と Stage 1 fail-closed を維持する。
- 後続 `HarnessHub-n2c0` が公式契約の再照合、2 OS E2E、設定非汚染を検証する。
  製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。
- 層別の反映先、非影響判断、検証結果は
  [仕様反映受領書](../docs/features/feat-stage0-distribution-gate/source-freshness-spec-reflection-receipt.md)
  を正とする。

**開発品質反映 (2026-07-30 / `HarnessHub-ory6`)**:

- ID を `set` / `dict` へ正規化して参照実在性を検査する repository 内
  validator は、正規化の前に同一 ID の重複を fail-closed で拒否する。
  重複した別要素を 1 件へ畳み込んだ後の「参照先あり」を合格根拠にしない。
- 適用対象は plugin-dev-planner の task/component ID、ubm-goal-setting の
  transcript turn ID、harness-creator の handoff route ID。正常系は従来の
  exit 0 を維持し、重複 fixture は CLI 非 0 終了まで回帰テストで固定する。
- 影響は repository 内の validation contract に限定される。製品 API、DB schema、
  認証認可、UI、Cloudflare deploy unit、確定済み QA 回答は変更しない。
- 反映先と検証は
  [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/qa33ho-spec-reflection-receipt.md)
  を正とする。

**開発品質反映 (2026-07-30 / `HarnessHub-35ai`)**:

- feature scope の renderer は registration receipt を検証できた場合だけ
  `verified` を表示し、receipt 未指定の探索表示は `not_performed` とする。
- 同じ 13 child graph を receipt 有り／無しで描画する正負の回帰テストにより、
  見かけの task 件数だけで登録成功を推測する偽陽性を禁止する。
- CLI receipt、可視 HTML banner、埋込み metadata は同じ判定を返す。
  影響は repository 内の検証契約に限定され、製品 API、DB schema、認証認可、
  UI、Cloudflare deploy unit、確定済み QA 回答は変更しない。
- 反映先と検証は
  [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/render-registration-verification-spec-reflection-receipt.md)
  を正とする。

## 未決事項

- なし (C05 完成度評価 PASS 時点)
