---
status: confirmed
layer: feature-design
task: SYS-PUBLISHER-PLUGIN-P02
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: docs/features/feat-publisher-plugin/requirements-baseline.md
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin アーキテクチャ決定記録 (ADR)

> **位置づけ**: P02 の成果物。[requirements-baseline.md](./requirements-baseline.md) の現行 quality_constraints 8 件・acceptance 3 件・上流未解決事項 1 件を実装可能な構造へ具体化する。本書で確定した決定は P05 実装の拘束条件であり、実装が本書と矛盾した場合は実装側を是正する (P05 rollback 規約)。Normative implementation closure (2026-07-19, [SYS-PUBLISHER-PLUGIN-P02 task spec](../../../tasks/feat-publisher-plugin/sys-publisher-plugin-p02.md)) に反する決定はできない。

## 0. 決定一覧 (索引)

| id | 決定 | 対応する quality_constraint |
|---|---|---|
| [AD-1](#1-ad-1-appspublisher-はtsnodepnpmの共有-clilibrary-実体とし-5-サブディレクトリに分割する) | apps/publisher は TS/Node/pnpm の共有 CLI/library 実体とし、`cli/ core/ inspection-client/ auth/ deploy/` の 5 サブディレクトリに分割する | publisher-typescript-unification-python-parity-migration-qa010-c3 / author-toolchain-macos-primary-windows-secondary-same-pnpm-script-qa043 |
| [AD-2](#2-ad-2-pluginharness-hub-publisher-に-slash-commandskillscriptsmanifest-を配置し-appspublisher-を呼び出すラッパーとする) | Claude Code/Codex plugin 面は `plugins/harness-hub-publisher/` に slash command (`/harness-hub:publish`) + skill + scripts + manifest として配置し、`apps/publisher` を呼び出すラッパーとする (二重実装しない) | no-dedicated-desktop-gui-qa007 / publisher-typescript-unification-python-parity-migration-qa010-c3 |
| [AD-3](#3-ad-3-packagesinspection-の-owner-は-feat-publish-pipeline-本-feature-は-local-pre-check-の-consumer-に徹する) | `packages/inspection` の実装 owner は feat-publish-pipeline。本 feature は `inspection-client/` から import する consumer に徹し、判定ロジックを再実装しない | inspection-pipeline-shared-no-duplicate-impl-qa010-qa020 / hub-api-implementation-out-of-scope-depends-on-feat-publish-pipeline |
| [AD-4](#4-ad-4-device-flow-token-は-os-credential-store-にのみ保存し-scope-を最小権限に限定する) | Device Flow token は OS credential store (macOS Keychain / Windows Credential Manager) にのみ保存し、scope は必要最小権限に限定する | device-flow-auth-os-credential-storage-qa008-qa041 |
| [AD-5](#5-ad-5-targetweb_app-の出口は-publisher-による-wrangler-cli-local-実行とし-hub-へ結果登録する) | target=web_app の出口は Publisher による wrangler CLI local script 実行とし、結果を `POST /api/v1/projects/:id/deployment` へ登録する | web-app-egress-wrangler-cli-script-execution-i5-qa003-qa043 / initial-publish-15min-target-o4-h8 |
| [AD-6](#6-ad-6-claude-harness-feedback-cli-サブコマンドの-owner-を本-feature-に確定する) | `claude harness feedback` CLI サブコマンドの owner を本 feature に確定する (CLI 操作面 owner として薄いラッパーを実装し、feedback API 実装は feat-feedback-loop に委譲する) | 上流未解決事項 (requirements-baseline.md §7) |

### scope_in / acceptance 追跡 (未割当 0 件)

| 項目 | 分類 | 割当 AD |
|---|---|---|
| package 収集 + manifest 補完 | scope_in 1 | AD-1 (core/) + AD-3 (inspection-client/ 経由の manifest 補完呼出) |
| ローカル pre-check (Hub と検査ロジック共有) | scope_in 2 | AD-3 |
| Device Flow 認証 + OS 資格情報域保存 | scope_in 3 | AD-4 |
| web_app 経路の wrangler スクリプト実行 | scope_in 4 | AD-5 |
| Python 資産の挙動同値移植テスト | scope_in 5 | AD-1 (旧資産の参照範囲確定) |
| macOS/Windows 両実機で publish E2E が成功する | acceptance 1 | AD-1 (toolchain) + AD-5 (wrangler 実行の cross-platform 対応) |
| pre-check と Hub 検査の判定が同値 | acceptance 2 | AD-3 |
| 初回 publish 15 分以内の実測記録 | acceptance 3 | AD-5 |

---

## 1. AD-1: apps/publisher はTS/Node/pnpmの共有 CLI/library 実体とし、5 サブディレクトリに分割する

### 決定

`apps/publisher` を TypeScript (Node + pnpm) の**単一の共有 CLI/library 実体**として新設し、内部を次の 5 責務に分割する。

```text
apps/publisher/src/
  cli/               エントリポイント・コマンド定義 (plugin の slash command/skill script から呼ばれる)
  core/              package 収集・manifest 補完のオーケストレーション
  inspection-client/ packages/inspection の consumer wrapper (ローカル pre-check 呼出のみ、AD-3)
  auth/              Device Flow クライアント・OS credential adapter (AD-4)
  deploy/            wrangler CLI 実行ラッパー・deployment 登録呼出 (AD-5)
```

Hub API (device/publish/deployment 系 endpoint) の呼出しには `packages/schemas` が生成する zod 型を import し (B1 の単一ソース原則)、request/response 型を本 feature 側で再定義しない。

### 根拠

- docs/backend-spec.md §1 の monorepo 構成案が `apps/publisher Publisher CLI (Claude Code / Codex plugin, qa-010)` を既存確定として示す。
- quality_constraint `publisher-typescript-unification-python-parity-migration-qa010-c3` は実装形態を TypeScript 統一と明記し、責務を「package 収集・manifest 補完・ローカル pre-check・Hub API 呼出 (Device Flow 認証)・target=web_app の wrangler CLI スクリプト実行と結果報告・URL 登録」の 5 系統に分けている。5 サブディレクトリはこの 5 責務に 1:1 対応する。
- `author-toolchain-macos-primary-windows-secondary-same-pnpm-script-qa043` は「両 OS で同一の pnpm script が動作すること (パス区切り・改行コード・シェル依存をコマンドへ埋め込まない)」を要求する。単一 TypeScript 実体であれば OS 分岐は `auth/` (credential adapter) と `deploy/` (wrangler 呼出コマンド組立) の 2 箇所に閉じ込められ、他の 3 責務は OS 非依存に保てる。

### 帰結

既存 Python 資産 (harness-creator の `skills/run-plugin-package-check/scripts/*.py` 等の package check / package contract / marketplace catalog ロジック) は `core/` 実装時の**移植元 (仕様の正本)** として参照し、挙動同値テスト (scope_in 5) の対象とする。Python 資産自体は本 feature の write scope に含めず、移植完了後も harness-creator 側に残置する (P08 リファクタリング/マイグレーションで参照コメント整理を行う)。

---

## 2. AD-2: plugins/harness-hub-publisher に slash command/skill/scripts/manifest を配置し、apps/publisher を呼び出すラッパーとする

### 決定

Claude Code/Codex plugin 面は既存 plugin 群 (`plugins/harness-creator` 等) と同じ配置規約に従い、`plugins/harness-hub-publisher/` 配下に次を実装する。

```text
plugins/harness-hub-publisher/
  .claude-plugin/plugin.json   manifest (name/version/description)
  commands/publish.md          slash command定義 (/harness-hub:publish)
  skills/run-publisher-publish/ skill本体 (SKILL.md + scripts/)
  scripts/                     plugin 直下の補助 script (あれば)
```

plugin 側の scripts/skill は **apps/publisher/src/cli/ を呼び出すだけの薄いラッパー**とし、業務ロジック (package 収集・検査呼出・Device Flow・wrangler 実行) を plugin 側に複製しない。P13 の marketplace 登録は、P05 で構築し P06 で macOS/Windows 検証済みの plugin artifact のみを参照する。

### 根拠

- P02 task spec の Normative implementation closure が「Claude Code/Codex plugin面は plugins/harness-hub-publisher/ に slash command、skill、scripts、manifestを実装する。apps/publisherは共有CLI/library実体としてplugin scriptから呼び出し、二つの独立実装を作らない」と明記する (本書はこれに反する決定をできない)。
- quality_constraint `no-dedicated-desktop-gui-qa007` は「作者向けクライアントは専用 desktop GUI を作らず、Claude Code / Codex plugin (slash command + skill + スクリプト) を Publisher の操作面とする」と定める。plugin 面を唯一の操作面とすることでこれを満たす。
- 既存 plugin (`plugins/harness-creator`, `plugins/prompt-creator` 等) は全て `.claude-plugin/` + `commands/` + `skills/` + `scripts/` の配置規約を採用しており、新規 plugin もこの規約に従うことで governance-check (成果物配置 lint) との整合が保たれる。

### 帰結

「二つの独立実装を作らない」制約により、plugin 側に業務ロジックの単体テストは持たず、apps/publisher 側の単体テストと E2E (plugin 経由の起動確認) のみで担保する。

---

## 3. AD-3: packages/inspection の owner は feat-publish-pipeline。本 feature は local pre-check の consumer に徹する

### 決定

`packages/inspection` (owner/公開範囲確認・secret scan・必須メタ検証・skills-only 制約・禁止 Hook/script/binary 検出・高リスク instructions パターン検出・manifest 補完・試験 install・Catalog 生成の各純関数) の実装 owner は **feat-publish-pipeline** である。本 feature (`inspection-client/`) は同パッケージを `import` する consumer に徹し、判定ロジックを再実装・分岐複製しない。

### 根拠

- docs/backend-spec.md §6.1 は「Publisher (ローカル pre-check) と Hub (公式検査) で同一パッケージを共有」と定める。
- quality_constraint `inspection-pipeline-shared-no-duplicate-impl-qa010-qa020` は「Publisher のローカル pre-check と Hub の公式検査は同一パッケージを参照し、判定 (Green/Yellow/Red) が同値になるようにテストで担保する」と明記する。
- `hub-api-implementation-out-of-scope-depends-on-feat-publish-pipeline` により Hub 側 API 実装 (検査 pipeline のサーバ側統合を含む) は feat-publish-pipeline の責務であり、本 feature が越境実装すると owner 境界 (requirements-baseline.md §7 に準じる cross-feature 境界) を破る。

### 帰結

acceptance「pre-check と Hub 検査の判定が同値」は、`inspection-client/` が feat-publish-pipeline の公開する純関数を直接呼び出す構造そのもの (二重実装がないため判定が構造的に一致する) によって満たす。挙動同値テストは P04/P06 で `packages/inspection` の同一関数を Publisher context / Hub context の両方から呼び出す形で設計する。

---

## 4. AD-4: Device Flow token は OS credential store にのみ保存し、scope を最小権限に限定する

### 決定

`auth/` は OAuth Device Authorization Flow (RFC 8628) のクライアントを実装し、`POST /api/v1/device/code` → `POST /api/v1/device/token` (polling, interval 5 秒・`slow_down` 受信時 +5 秒・上限 60 秒) の経路で認証する。取得した access token (15 分, サーバ非保存) と refresh token (90 日, rotation) は **macOS Keychain / Windows Credential Manager の OS credential store にのみ**保存し、平文ファイル・環境変数・リポジトリへの保存を行う経路を作らない。要求する scope は Publisher の操作 (`publish:write` 等) に必要な最小権限に限定する。

### 根拠

- docs/backend-spec-api-state.md §4.1 が `POST /api/v1/device/code` / `POST /api/v1/device/token` の 2 endpoint と RFC 8628 準拠のポーリング応答 (`authorization_pending` / `slow_down` / `expired_token`) を定める。
- docs/security-spec-authentication.md が device_code TTL 10 分・SHA-256 ハッシュ保存・user_code 8 文字 Crockford Base32・polling interval 5 秒 (上限 60 秒、qa-073) の数値契約と「クライアント保存先: macOS Keychain / Windows Credential Manager (qa-008 既存確定)」を定める。
- quality_constraint `device-flow-auth-os-credential-storage-qa008-qa041` は同数値契約と保存先制約を要求し、scope は「publish:write / metrics:write / feedback:write / aijob:process の 4 種の最小権限」と明記する。

> **2026-08-12 外部Docs同期による後続拡張:** 上記4種は初回リリース時点の記録である。現行値域には
> `docs:write` を加えた5種を使い、`docs` サブコマンドは `docs:write` だけを要求する。Device Flowの
> TTL・rotation・保存先制約は変更しない。

### 帰結

`auth/` は OS ごとに credential adapter を実装する (macOS: Keychain Services、Windows: Credential Manager)。adapter 差異は `auth/` 内に閉じ込め、`cli/`・`core/`・`deploy/` は adapter の抽象インターフェース (`getToken()`/`clearToken()`) のみに依存する。credentialの保存keyとrecordは正規化済みHTTPS Hub origin + tenantに束縛し、異なるoriginが指定された場合はrefresh tokenを送信せず再認可で停止する。scope はコマンドが要求する操作に応じて最小のものだけを要求し (feedback は `feedback:write`、docs は `docs:write`)、一括で全 scope を要求しない。

---

## 5. AD-5: target=web_app の出口は Publisher による wrangler CLI local 実行とし、Hub へ結果登録する

### 決定

`deploy/` は target=web_app の deploy を **作者 local session での wrangler CLI スクリプト実行**として実装する。実行結果 (exit code / URL) は `POST /api/v1/projects/:id/deployment` へ登録し、Hub 側は URL 登録・公開範囲検査・HTTP health 確認のみを担う。Hub 側で wrangler を代理実行する経路は作らない。

### 根拠

- system-spec/00-requirements-definition.md の I5 (「Web App 出口: 作者 local session で Publisher が wrangler CLI をスクリプト実行し、Hub は URL 登録・公開範囲検査・health 確認のみ担う」serves G3) および system-spec/spec-state.json qa-043 (infrastructure.desktop 正本「target=web_app の出口は作者 local session での wrangler CLI スクリプト実行 [Hub は URL 登録・公開範囲検査・health 確認のみ]」) が本決定の直接の出典である (P03 独立レビュー R-01 で、当初 docs/backend-spec.md §1 を出典としていたが同 §1 に該当文言が存在しないことが判明したため訂正)。
- docs/backend-spec-api-state.md が `POST /api/v1/projects/:id/deployment` (Bearer / owner) を「wrangler 実行結果 (exit code/URL) の登録 + HTTP health 確認。Catalog 昇格失敗時は orphan_candidate 記録」と定義する。
- quality_constraint `web-app-egress-wrangler-cli-script-execution-i5-qa003-qa043` と `initial-publish-15min-target-o4-h8` は、この経路が初回 publish 15 分以内 (O4/H8) の実測対象であることを要求する。

### 帰結

`deploy/` は wrangler CLI のプロセス実行・exit code/stdout URL 抽出・`packages/schemas` の deployment 型による Hub API 呼出までを担い、health 確認・Catalog 昇格判定は行わない (Hub 側の責務)。15 分以内の実測は P06 (テスト実行) で E2E タイムボックス計測として設計・記録する。

---

## 6. AD-6: `claude harness feedback` CLI サブコマンドの owner を本 feature に確定する

### 決定

requirements-baseline.md §7 の上流未解決事項 (`claude harness feedback` CLI 受付コマンドの owner 未確定) を、**CLI/plugin 操作面の owner である本 feature が owner** と確定する。実装は `apps/publisher/src/cli/` に `feedback` サブコマンドとして追加し、AD-4 の Device Flow 基盤 (認証済み Bearer token) を再利用して Hub の feedback API を呼び出す薄いクライアントとする。feedback API 本体の実装・データモデルは feat-feedback-loop の責務のまま変更しない。

### 根拠

- feat-publisher-plugin.md の frontmatter・本文が明記する通り、本 feature の purpose は「Claude Code / Codex から自己完結で publish できる**操作面** (slash command + skill + スクリプト)」の提供であり、CLI コマンド体系全体の窓口である。
- feat-feedback-loop 側の confirmed P05 task spec (`.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/task-specs/phase-05-implementation.md`) の「スコープ外」節が「`claude harness feedback` CLI クライアント本体の実装 (既存 Device Flow Publisher/CLI 基盤を利用する前提であり、本 feature は同一 endpoint の受理ロジックのみ実装する)」と明記している。これにより、feat-feedback-loop の scope_in「CLI 受付 (`claude harness feedback`)」は**サーバ側 (`POST /api/v1/feedback`) が Bearer=harness principal を受理するロジック**を指し、CLI 実行バイナリ本体の実装主体を意味しないことが一次資料で裏付けられる (P03 独立レビュー R-02 で、当初根拠としていた「feat-feedback-loop の 2026-07-17 plan」という表現が feat-feedback-loop 側のどの確定文書にも見つからなかったため、上記の正確な出典に差し替えた)。
- 同 P05 spec は CLI クライアント本体について「既存の Device Flow ベース Publisher/CLI 基盤 (docs/backend-spec.md §3.2) が提供する認証済み HTTP クライアントを利用して同一 endpoint を呼び出す想定」と明記しており、Device Flow 基盤 (= 本 feature が AD-4 で確定する) への依存方向を feat-feedback-loop 側も前提としている。
- scope_out「Hub 側 API 実装」は feedback API の**実装**を指し、CLI からの**呼出**を除外しない。よって `feedback` サブコマンドの追加は本 feature の scope_out と矛盾しない。

### 帰結

`feedback` サブコマンドは scope に追加され、P04 (テストファースト設計) 以降のテスト対象・acceptance 追跡表に含める。scope 追加に伴い、`auth/` が要求する scope 一覧に `feedback:write` を追加する (AD-4)。feat-feedback-loop 側の API 契約 (endpoint・request/response 型) には変更を加えない。

---

## 7. Cross-feature 依存の確認

- **feat-publish-pipeline**: `packages/inspection` の実装 owner (AD-3)。Hub 側 device/publish/deployment endpoint の実装 owner。本 feature の `HarnessHub-zdh` は `HarnessHub-dfm` (feat-publish-pipeline) に依存し、dfm は子タスク 13/13 完了・PR #620 マージ済みのため、本 feature が consumer として依存する Hub API・検査 pipeline は実装済みである。
- **feat-auth-tenancy**: Device Flow の Hub 側 endpoint 実装 (device/code・device/token) を提供する。本 feature は同 endpoint の consumer である。
- **feat-stage0-distribution-gate** (P03 独立レビュー R-03 是正): `features/feat-publisher-plugin.md` の frontmatter `depends_on` は本 feature を Stage 0 配布経路 technical gate (H7) に依存させている。`docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md` の結論は `verdict: H7_NOT_ESTABLISHED` / `stage1_entry_condition: NOT_MET` であり、「不成立のまま Stage 1 (Publisher を含む) へ進むことは baseline §6 `h7-unresolved-blocks-stage1-fail-closed-gate` により禁じられている」と明記する。2026-07-30 の post-close revalidation (`HarnessHub-n2c0`, 追加候補経路として Anthropic 公式 git-subdir を検証中) でも、macOS/Windows skill 実行証跡が未完了のため同判定は維持されている。
  - **リスク受容・シーケンス方針**: 本 feature の設計フェーズ (P01〜P04: 要件確定・アーキテクチャ決定・独立レビュー・テスト設計) は投資判断を確定させない範囲の作業であり、Stage 0 ゲート解除を待たずに並行して進める。ただし **P05 (実装着手) の entry gate として、Stage 0 の `stage1_entry_condition` が `MET` へ更新されていること、または作者による明示的なリスク受容判断が別途記録されていることを必須の前提条件とする**。この条件が満たされない限り、本 feature は設計成果物 (P01〜P04) が揃っていても P05 へ進めない。
  - **P05 entry gate 充足記録 (作者リスク受容, 2026-08-02)**: 作者 (daishiman) は、Stage 0 `stage1_entry_condition` が `NOT_MET` (H7_NOT_ESTABLISHED) のまま P05 (実装着手) へ進むことについて、明示的な質問 (「P05 着手条件: 作者としてリスクを受容し進める / P04 までで一旦停止」の二択) に対し「作者としてリスクを受容し進める」を選択した。これにより本条件の後段 (作者による明示的なリスク受容判断) を充足し、P05 以降 (実装・テスト実行・受入・以降の phase) へ進む前提条件が満たされたものとして記録する。**この受容は Stage 0 ゲート自体の解除を意味しない**。post-close revalidation (`HarnessHub-n2c0`) で `stage1_entry_condition` が `NOT_MET` のまま確定した場合、本 feature の実装成果 (P05〜) は配布経路が存在しないリスクを負ったまま存在することになり、その場合は作者の追加判断で実装のやり直し・破棄・凍結のいずれかを選択する必要がある。同時に、以下 2 点も同一のヒアリングで確定した: (1) P06 (テスト実行) の macOS/Windows 両実機 E2E 要件は、macOS (本開発環境) では自動テストで実施し、Windows 実機分は手動実施用の再現手順書に留める (実機実測ができないことを P06 成果物に明記する)。(2) P13 (リリース/デプロイ) は marketplace 公開に必要な申請文書・チェックリストの作成までとし、実際の公開申請の送信はユーザー承認後に別途行う。
