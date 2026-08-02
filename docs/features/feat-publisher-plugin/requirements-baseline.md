---
status: confirmed
layer: feature-design
task: SYS-PUBLISHER-PLUGIN-P01
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: .dev-graph/plans/feature-package-feat-publisher-plugin/goal-spec.json
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints/lineage を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

作者が Claude Code / Codex から自己完結で publish できる操作面 (slash command + skill + スクリプト) を TypeScript で提供し、既存 Python 資産を挙動同値で移植する

## 2. ゴール (goal)

作者環境 (macOS/Windows) から初回 publish が 15 分以内 (O4/H8) に完了する状態

## 3. スコープ

### 3.1 scope_in

1. package 収集 + manifest 補完
2. ローカル pre-check (Hub と検査ロジック共有)
3. Device Flow 認証 + OS 資格情報域保存
4. web_app 経路の wrangler スクリプト実行
5. Python 資産の挙動同値移植テスト

### 3.2 scope_out

1. Hub 側 API 実装
2. 専用 desktop GUI (作らない: qa-007)

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. macOS/Windows 両実機で publish E2E が成功する
2. pre-check と Hub 検査の判定が同値
3. 初回 publish 15 分以内の実測記録

## 5. 品質制約 (quality_constraints — 現行 goal-spec 8 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| publisher-typescript-unification-python-parity-migration-qa010-c3 | 作者側 Publisher の実装形態は TypeScript 統一。Publisher core は TypeScript (Node + pnpm) で新規実装し、Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する。責務は package 収集・manifest 補完・ローカル pre-check・Hub API 呼出 (Device Flow 認証)・target=web_app の wrangler CLI スクリプト実行と結果報告・URL 登録。既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) を仕様の正本 (移植元) として参照し、挙動同値性をテストで担保して TypeScript へ移植する (C3 整合)。 | system-spec/spec-state.json qa-010 (「作者側 Publisher の実装形態は? … 既存 Python 資産 [harness-creator の package check / package contract / marketplace catalog] は仕様の正本 [移植元] として参照し、挙動同値性をテストで担保して TypeScript へ移植する [C3整合]」); system-spec/00-requirements-definition.md U8 制約 C3 (「既存資産再利用: harness-creator / package contract / package check / marketplace catalog / version・cache 処理 / review workflow を Publisher 内部の quality engine として再利用する [§15]」); features/feat-publisher-plugin.context.json purpose および scope_in (「Python 資産の挙動同値移植テスト」) |
| device-flow-auth-os-credential-storage-qa008-qa041 | Publisher (作者 local session) から Hub API への認証は OAuth Device Authorization Flow (RFC 8628) を採用する。device_code TTL 10 分・SHA-256 ハッシュのみ DB 保存、access token 15 分 (短命 JWT・サーバ非保存)・refresh token 90 日 rotation 必須・再利用検知で同一 family 全失効 + 監査 event + 通知。token は OS の資格情報域 (macOS Keychain / Windows Credential Manager) にのみ保存し、平文ファイル・環境変数・リポジトリへの保存を禁止する (長命 secret のコピペを非エンジニアに求めない = G1 整合)。scope は publish:write / metrics:write / feedback:write / aijob:process の 4 種の最小権限とし、失効は Hub Web から本人・admin が即時実行できる。 | system-spec/spec-state.json qa-008 (「Publisher [作者 local session] から Hub API を呼ぶ認証方式は? … OAuth Device Authorization Flow を採用。… OS の資格情報域 [macOS Keychain / Windows Credential Manager] に保存する。長命 secret のコピペを非エンジニアに求めない [G1整合]」); qa-041 (Device Flow 数値契約: device_code TTL 10分・user_code 8文字・access token 15分・refresh token 90日 rotation・再利用検知で family 全失効・保存先=OS資格情報域のみ・scope最小権限4種・失効導線=Hub Web); features/feat-publisher-plugin.context.json scope_in (「Device Flow 認証 + OS 資格情報域保存」) |
| inspection-pipeline-shared-no-duplicate-impl-qa010-qa020 | 検査ロジック (pre-check) は Hub 側 (Workers=JS) と共有し二重実装を回避する純関数の共有パッケージ (packages/inspection) として実装する。Publisher のローカル pre-check と Hub の公式検査は同一パッケージを参照し、判定 (Green/Yellow/Red) が同値になるようにテストで担保する。 | system-spec/spec-state.json qa-010 (「検査ロジックは Hub 側 [Workers=JS] と共有し二重実装を回避する」); qa-020 (「検査 pipeline の純関数化: Publisher と Hub で検査ロジックを共有パッケージ化、qa-010 の挙動同値移植をテストで担保」); features/feat-publisher-plugin.context.json scope_in (「ローカル pre-check [Hub と検査ロジック共有]」) および acceptance (「pre-check と Hub 検査の判定が同値」) |
| web-app-egress-wrangler-cli-script-execution-i5-qa003-qa043 | target=web_app の出口は作者 local session での wrangler CLI スクリプト実行とし、Hub は URL 登録・公開範囲検査・health 確認のみを担う。デプロイツールは wrangler CLI (Cloudflare Workers)。 | system-spec/00-requirements-definition.md I5 (「Web App 出口: 作者 local session で Publisher が wrangler CLI をスクリプト実行し、Hub は URL 登録・公開範囲検査・health 確認のみ担う」serves G3) および U7 スコープ in (「Web App 出口 [作者 local session での wrangler CLI スクリプト実行 + Hub への URL・release 登録]」); system-spec/spec-state.json qa-003 (デプロイは wrangler CLI); qa-043 (infrastructure.desktop 正本「target=web_app の出口は作者 local session での wrangler CLI スクリプト実行 [Hub は URL 登録・公開範囲検査・health 確認のみ]」); features/feat-publisher-plugin.context.json scope_in (「web_app 経路の wrangler スクリプト実行」) |
| no-dedicated-desktop-gui-qa007 | 作者向けクライアントは専用 desktop GUI を作らず、Claude Code / Codex plugin (slash command + skill + スクリプト) を Publisher の操作面とする。 | system-spec/spec-state.json qa-007 (「作者向けクライアントは専用 desktop GUI を作らず、Claude Code / Codex plugin [slash command + skill + スクリプト] を Publisher の操作面とする [§5.1: Web に会話型 Creator を作らない]」); features/feat-publisher-plugin.context.json scope_out (「専用 desktop GUI (作らない: qa-007)」) |
| hub-api-implementation-out-of-scope-depends-on-feat-publish-pipeline | Hub 側 API 実装は本 feature のスコープ外とし、feat-publish-pipeline (PublishRequest 状態機械・検査 pipeline サーバ側実装・R2/Catalog pointer atomic 更新) の責務とする。本 feature は同 feature へ依存する。 | features/feat-publisher-plugin.context.json scope_out (「Hub 側 API 実装」); features/feat-publisher-plugin.md 機能間依存 (「feat-publish-pipeline」) および frontmatter depends_on: ["feat-publish-pipeline"] |
| initial-publish-15min-target-o4-h8 | 作者環境 (macOS/Windows) から初回 publish が 15 分以内 (定量目標 O4、仮説 H8) に完了する状態を到達ゴールとする。 | system-spec/00-requirements-definition.md qa-013 (定量目標「O4: H8 初回 publish 15 分以内」を全て選択); features/feat-publisher-plugin.context.json goal (「作者環境 [macOS/Windows] から初回 publish が 15 分以内 [O4/H8] に完了する状態」) および acceptance (「初回 publish 15 分以内の実測記録」) |
| author-toolchain-macos-primary-windows-secondary-same-pnpm-script-qa043 | 作者/提供者環境は macOS 主・Windows 従とし、Claude Code + pnpm (corepack 経由・他パッケージマネージャ禁止) + git + wrangler CLI を用いる。両 OS で同一の pnpm script が動作すること (パス区切り・改行コード・シェル依存をコマンドへ埋め込まない)。 | system-spec/spec-state.json qa-043 (infrastructure.desktop 正本、ツールチェーン節・qa-039 該当部分の集約確定: 「作者/提供者環境は macOS 主・Windows 従で、Claude Code + pnpm [corepack 経由・他パッケージマネージャ禁止] + git + wrangler CLI。両 OS で同一の pnpm script が動作すること」); features/feat-publisher-plugin.context.json acceptance (「macOS/Windows 両実機で publish E2E が成功する」) |

## 6. 系譜 (lineage — goal-spec 4 件の確定転記)

| path | 正本 sha256 | wrapper sha256 | digest_status |
|---|---|---|---|
| features/feat-publisher-plugin.context.json | d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41 | — | verified |
| architecture/harness-hub-backend.md | f6ba21931374775143fb656c55c7689e8490662b56a19b170902c6ab565dd465 | bd5a3821ec76b881b5a39c53c90534db720aeb6cc588a712995f8d0bc1ba702b | resolved |
| architecture/harness-hub-security.md | cf1d1fbb63146f77a1885fbba762035ddadad6638cc405790274b7b5161beb07 | 5af5237572ae6fe9d661ad09ee074377967c6f9d276779e2105645cd89d51605 | resolved |
| specs/harness-hub-system-specification.md | 6b24a06e4116a9665e1cd6f7a978918010599f51c2c5faf0aedf7ca7ce88fc15 | a4c26b6d4e7e8c3556d4a78089c12c6bb8dee445c20c623b151079d5747fd22d | resolved |

sha256 は正本ファイル (system-spec/*.md 等) 側の digest。wrapper sha256 は各 wrapper ファイル自体 (architecture/*.md, specs/*.md) を対象に独立再計算した値。features/feat-publisher-plugin.context.json は caller 提供の feature_context_digest とロックファイル feature_digest の一致によりクロス検証済み (verified)。

## 7. 上流未解決事項 — CLI/plugin 操作面 owner 境界 (P02 必須解消)

`claude harness feedback` CLI 受付コマンド (I12/J5 の CLI 経路) の実装 owner が未確定。feat-feedback-loop の plan (2026-07-17) は Web/API 側のみを scope とし、CLI コマンド本体は既存 Device Flow 基盤の再利用前提でスコープ外へ明記した。CLI/plugin 操作面の owner である本 feature が feedback サブコマンドを scope に含めるかを P02 で確定する (出典: feat-feedback-loop plan 設計判断 2026-07-17、features/feat-publisher-plugin.md 「上流未解決 (P02 設計時に解消)」節)。

## 8. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-publisher-plugin/goal-spec.json` (feature_context_digest = sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41、verification.status=complete)
- 本文書の受入条件 (P01 acceptance): 現行 goal-spec の purpose・goal・scope_in 5 件・scope_out 2 件・acceptance 3 件 (§4)・quality_constraints 8 件 (§5)・lineage 4 件 (§6) が過不足なく転記され、上流未解決事項 (§7) が明記されていること
