---
status: confirmed
layer: feature-design-review
task: SYS-PUBLISHER-PLUGIN-P03
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: [docs/features/feat-publisher-plugin/architecture-decision-record.md, docs/features/feat-publisher-plugin/requirements-baseline.md]
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin 独立設計レビュー記録 (P03)

> **位置づけ**: P03 (独立設計レビュー) の成果物。[architecture-decision-record.md](./architecture-decision-record.md) (P02, AD-1〜AD-6) を、[requirements-baseline.md](./requirements-baseline.md) (P01) および `.dev-graph/plans/feature-package-feat-publisher-plugin/goal-spec.json` の quality_constraints 8 件と、ADR の記述を鵜呑みにせず一次資料へ立ち返って独立に突合した記録である。当初のレビューは ADR・baseline を編集せず懸念点 (R-01〜R-03) の指摘に留めたが、task spec の rollback 規約 (「レビューで矛盾が発見された場合、P02 に差し戻し architecture-decision-record.md を修正した上で本 task を再実行する」) に従い、R-01 (引用元誤り)・R-02 (根拠不足)・R-03 (Stage 0 ゲート依存の未記載) の3点を ADR へ反映修正した上で本レビューを再確認し、本書を確定させた。反映内容は本書 §4 に記録する。

## 0. レビュー対象・レビュー方法

**レビュー対象**

- `docs/features/feat-publisher-plugin/architecture-decision-record.md` (P02, AD-1〜AD-6, status=confirmed)
- `docs/features/feat-publisher-plugin/requirements-baseline.md` (P01, status=confirmed)

**突合した正本・関連文書**

- `.dev-graph/plans/feature-package-feat-publisher-plugin/goal-spec.json` (quality_constraints 8 件・scope_in 5 件・scope_out 2 件・acceptance 3 件)
- `docs/backend-spec.md`、`docs/backend-spec-api-state.md`、`docs/security-spec.md`、`docs/security-spec-authentication.md`
- `features/feat-publisher-plugin.md`
- cross-feature 突合先: `features/feat-feedback-loop.md`、`docs/features/feat-feedback-loop/requirements-baseline.md`、`.dev-graph/plans/feature-package-feat-feedback-loop/goal-spec.json`、`docs/features/feat-auth-tenancy/requirements-baseline.md`、`docs/features/feat-publish-pipeline/requirements-baseline.md`
- Stage 0/1 ゲート突合先: `features/feat-stage0-distribution-gate.md`、`docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md`、`issues/sys-h7-git-subdir-revalidation-20260730.md`
- `packages/inspection/` の実装物 (構造確認)
- beads (`bd show`): `HarnessHub-zdh` (Publisher epic)・`HarnessHub-j71` (Stage0 gate)・`HarnessHub-n2c0` (H7 再検証)・`HarnessHub-dfm` (feat-publish-pipeline)

**方法**: ADR の各 AD (AD-1〜AD-6) の「根拠」欄が引用する一次資料を実際に開き、(a) 引用文言が該当ファイルに実在するか、(b) 文脈上の意味が ADR の主張と一致するかを独立に再確認した。cross-feature 境界 (owner 分割) については、feat-publisher-plugin 側の主張のみで判断せず、依存・被依存の相手側 feature の確定済み文書 (P01 baseline・goal-spec.json) を直接参照し、双方の記述に矛盾がないかを検証した。加えて、ADR が言及しない cross-feature 依存 (feature.md の `depends_on`) が存在しないかを確認した。

---

## 1. 4 観点の確認結果

### 観点 1: inspection 二重実装回避 (qa-010/qa-020) — **合格**

- AD-3 は `packages/inspection` の実装 owner を feat-publish-pipeline と確定し、本 feature (`inspection-client/`) は import する consumer に徹すると定める。
- quality_constraint `inspection-pipeline-shared-no-duplicate-impl-qa010-qa020` の原文 (「Publisher のローカル pre-check と Hub の公式検査は同一パッケージを参照し、判定 [Green/Yellow/Red] が同値になるようにテストで担保する」) と AD-3 の決定は一致する。
- AD-3 が引用する docs/backend-spec.md §6.1「Publisher (ローカル pre-check) と Hub (公式検査) で同一パッケージを共有」は、実測 (L208) で一字一句一致することを確認した。引用は正確。
- 実装物 `packages/inspection/` (archive.ts, package-rules.ts, pipeline.ts, publish-inspection.ts, secret-scan-*.ts, verdict.ts 等) が実在し、AD-3 が想定する「純関数の共有パッケージ」構造と矛盾しない。
- AD-3 は「越境実装すると owner 境界を破る」と明記し、`hub-api-implementation-out-of-scope-depends-on-feat-publish-pipeline` とも整合する。
- 判定: **合格**。引用・実装物ともに独立検証でき、二重実装を防ぐ設計になっている。

### 観点 2: token 保存方式 (qa-008/qa-041) — **合格**

- AD-4 は access token (15 分, サーバ非保存) と refresh token (90 日 rotation) を macOS Keychain / Windows Credential Manager にのみ保存し、平文ファイル・環境変数・リポジトリへの保存経路を作らないと定める。
- docs/security-spec-authentication.md §2.2 の数値契約 (device_code TTL 10 分・SHA-256 ハッシュ保存・user_code 8 文字 Crockford Base32・access token 15 分・refresh token 90 日 rotation・再利用検知で family 全失効) と AD-4 の記述は一致する。
- scope を publish:write / metrics:write / feedback:write / aijob:process の 4 種の最小権限とする quality_constraint `device-flow-auth-os-credential-storage-qa008-qa041` の原文と AD-4 は一致する (AD-6 の帰結で `feedback:write` を追加要求するが、これは既定の 4 種の枠内であり逸脱ではない)。
- 2026-08-12の外部Docs同期では、初回レビュー時の4種を履歴として残しつつ `docs:write` を第5の専用scopeとして追加した。Docs CLIへ他scopeを同梱しないため、AD-4の最小権限原則は維持される。
- AD-4 は「`auth/` に OS 別 credential adapter を実装し、`cli/`・`core/`・`deploy/` は抽象インターフェースのみに依存する」としており、平文ファイル・環境変数への保存経路を作らない設計上の裏付け (adapter 境界への隔離) がある。
- 判定: **合格**。

### 観点 3: wrangler 実行方式限定 (I5/qa-003/qa-043) — **合格 (是正指摘 R-01 を伴う)**

- AD-5 は target=web_app の出口を「作者 local session での wrangler CLI local script 実行」に限定し、Hub は URL 登録・公開範囲検査・health 確認のみを担い、Hub 側で wrangler を代理実行する経路は作らないと明記する。決定内容自体は quality_constraint `web-app-egress-wrangler-cli-script-execution-i5-qa003-qa043` の原文および system-spec/00-requirements-definition.md I5・system-spec/spec-state.json qa-043 の記述と整合する。
- **しかし AD-5 の根拠欄が引用する「docs/backend-spec.md §1 が『target=web_app の出口は作者 local session での wrangler CLI スクリプト実行とし、Hub は URL 登録・公開範囲検査・health 確認のみを担う』と定める」という記述は誤りである。** docs/backend-spec.md §1 全文を確認したが該当文言は存在しない (grep 0 件)。§1 が実際に含むのは monorepo 構成案と「検査 pipeline / 試算エンジン / 通知ディスパッチは純関数の共有パッケージ (Publisher と Hub で二重実装しない)」という別趣旨の記述のみである。
- 正しい出典は system-spec/00-requirements-definition.md の I5 行 (「Web App 出口: 作者 local session で Publisher が wrangler CLI をスクリプト実行し、Hub は URL 登録・公開範囲検査・health 確認のみ担う」) および system-spec/spec-state.json qa-043 (infrastructure.desktop 正本)。これは requirements-baseline.md §5 の同一 quality_constraint 行が既に正しく引用している出典と一致する。
- 決定内容そのものは要件と整合し実装上の齟齬を生む誤りではないが、一次資料を実際に確認して引用するという設計プロセスの信頼性に関わるため、是正すべき citation 誤りとして指摘する (R-01)。
- 判定: **合格 (是正指摘 R-01 を伴う)**。

### 観点 4: desktop GUI 非作成 (qa-007) — **合格**

- AD-2 は「専用 desktop GUI を作らず、Claude Code/Codex plugin (slash command + skill + scripts) を Publisher の操作面とする」という quality_constraint `no-dedicated-desktop-gui-qa007` を満たす構成 (`plugins/harness-hub-publisher/`) を定めている。
- plugin 側は `apps/publisher/src/cli/` を呼び出す薄いラッパーとし、業務ロジックを複製しないとしており、AD-2 自身の「二重実装しない」原則とも整合する。
- 既存 plugin (`plugins/harness-creator`, `plugins/prompt-creator` 等) と同じ配置規約 (`.claude-plugin/` + `commands/` + `skills/` + `scripts/`) に従うとしており、governance-check (成果物配置 lint) との整合も取れている。
- 判定: **合格**。

---

## 2. scope_in / acceptance 追跡表の独立検証

goal-spec.json の scope_in 5 件・acceptance 3 件を、ADR §0 の記述を見ずに独立で再割当てし、ADR の主張と突合した。

| 項目 | 分類 | ADR の割当 | 独立検証結果 |
|---|---|---|---|
| package 収集 + manifest 補完 | scope_in 1 | AD-1 + AD-3 | 一致。AD-1 core/ の責務定義と AD-3 の inspection-client 経由呼出が quality_constraint 原文の 5 責務分割と対応する |
| ローカル pre-check (Hub と検査ロジック共有) | scope_in 2 | AD-3 | 一致 |
| Device Flow 認証 + OS 資格情報域保存 | scope_in 3 | AD-4 | 一致 |
| web_app 経路の wrangler スクリプト実行 | scope_in 4 | AD-5 | 一致 |
| Python 資産の挙動同値移植テスト | scope_in 5 | AD-1 | 一致。AD-1 帰結が移植元参照範囲を明示している |
| macOS/Windows 両実機で publish E2E が成功する | acceptance 1 | AD-1 + AD-5 | 一致 |
| pre-check と Hub 検査の判定が同値 | acceptance 2 | AD-3 | 一致 |
| 初回 publish 15 分以内の実測記録 | acceptance 3 | AD-5 | 一致 |

quality_constraints 8 件も ADR §0 の索引テーブルに重複・欠落なく割り当てられていることを確認した (`publisher-typescript-unification-...` / `author-toolchain-...` → AD-1、`no-dedicated-desktop-gui-...` → AD-2、`inspection-pipeline-...` / `hub-api-implementation-out-of-scope-...` → AD-3、`device-flow-auth-...` → AD-4、`web-app-egress-...` / `initial-publish-15min-...` → AD-5、上流未解決事項 → AD-6)。

→ ADR が主張する「scope_in/acceptance 追跡・未割当 0 件」は独立検証でも成立する。**この追跡表自体は正確**。

---

## 3. 上流未解決事項 (AD-6) の解消についての評価 — **懸念あり (要是正 R-02)**

P01 requirements-baseline.md §7 は「`claude harness feedback` CLI 受付コマンドの実装 owner が未確定」であり、「feat-feedback-loop の plan (2026-07-17) は Web/API 側のみを scope とし、CLI コマンド本体は既存 Device Flow 基盤の再利用前提でスコープ外へ明記した」と述べ、P02 (AD-6) での解消を必須としていた。

AD-6 はこれを受けて「owner を本 feature に確定する」と決定し、根拠として同一の「feat-feedback-loop の 2026-07-17 plan は『CLI コマンド本体は既存 Device Flow 基盤の再利用前提でスコープ外』と明記」という主張を再掲している。

**この主張を feat-feedback-loop 側の実際の確定文書に対して独立に検証したところ、裏付けが取れなかった。**

- リポジトリ全体を grep したが、「CLI コマンド本体」「既存 Device Flow 基盤の再利用前提」という文言は feat-publisher-plugin 自身の文書 (`features/feat-publisher-plugin.md`、`requirements-baseline.md`、`architecture-decision-record.md`) にしか出現せず、feat-feedback-loop 側のどの文書 (`goal-spec.json`、`requirements-baseline.md`、`feature.md`、`.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/` 配下の 13 task spec) にも存在しない。
- それどころか、feat-feedback-loop の**確定済み (status=confirmed) P01 requirements-baseline.md** の scope_in 2 番目の項目は「CLI 受付 (`claude harness feedback`) + S14 Web フォームの 2 経路」であり、これは**明示的に scope_in (対象内)** とされている。scope_out は「publish パイプラインの変更」「自動マージ」の 2 件のみで、CLI コマンド本体を除外する記述は存在しない。
- `features/feat-feedback-loop.md` の「機能間依存」節も feat-publisher-plugin への言及を一切含まない。
- quality_constraint `feedback-two-route-single-resource-b6-i12` の原文 (「フィードバックは CLI [Bearer=harness] と Web フォーム [session=manual] の 2 経路とも `POST /api/v1/feedback` を通じて同一 feedbacks テーブルへ格納される」) は backend endpoint の dual-principal 処理を述べたものであり、CLI 実行バイナリ自体の実装主体を明言してはいない。したがって「CLI 受付」がサーバ側の受入経路定義を指し、CLI 実行体 (`claude harness feedback` コマンド本体) の実装主体とは別問題である、という解釈も理屈としては成立しうる。

しかし、この解釈上の切り分け (「受付」= サーバ側 vs 「コマンド本体」= クライアント側) は**feat-feedback-loop 側のどの確定文書にも明記されていない**。AD-6 はこの切り分けを自明の前提として扱い、feat-feedback-loop の実際の scope_in 文言と正面から突き合わせずに「スコープ外へ明記した」と断定している。P01 §7 の記述自体がこの引用をすでに含んでおり、AD-6 はそれを一次資料で検証せずに再利用している。

これは「上流未解決事項が P02 で解消されたか」という設問に対して、**文書上は解消済みと書かれているが、根拠の一次資料が存在しないため実質的には未解消**、と判定せざるを得ない。2 つの confirmed P01 baseline (feat-publisher-plugin と feat-feedback-loop) が同じ `claude harness feedback` という CLI 表面について、一方は「owner 未確定 → 本 feature が確定する」、他方は「(暗黙に) 自らの scope_in に含む」という、互いを参照しないまま矛盾しうる主張を持っている。

判定: **懸念あり (要是正 R-02)**。AD-6 の**結論** (owner を feat-publisher-plugin に置き、feedback API 実装・データモデルは feat-feedback-loop の責務のまま変更しない) 自体は、CLI/plugin 操作面の一元化という feat-publisher-plugin の purpose に照らして妥当な落とし所である。しかし、その**論拠の立証が不十分**であり、feat-feedback-loop 側の scope_in と字面上矛盾しうる状態を解消しないまま「確定した」と記録している点は、cross-feature owner 確定の手続きとして不十分である。「無理な論理飛躍」とまでは断定しないが、相手側 feature の確定文書を実際に参照・引用せずに一方的な宣言で完結させている点は看過できない。

---

## 4. 発見した懸念点まとめ

### R-01 (軽微・是正済み): AD-5 の引用元誤り

docs/backend-spec.md §1 に該当文言は存在しない。正しい出典は system-spec/00-requirements-definition.md I5 / system-spec/spec-state.json qa-043。**是正済み**: ADR AD-5 根拠欄を正しい出典に訂正した。

### R-02 (中〜重大・是正済み): AD-6 の根拠が一次資料で裏付けられない

第 3 節の通り、当初 AD-6 が引用していた「feat-feedback-loop の 2026-07-17 plan」は feat-feedback-loop 側のどの確定文書にも見当たらなかった。**是正済み**: 独立に feat-feedback-loop の 13 task spec を追加調査したところ、confirmed P05 task spec (`phase-05-implementation.md`) の「スコープ外」節に「`claude harness feedback` CLI クライアント本体の実装 (既存 Device Flow Publisher/CLI 基盤を利用する前提であり、本 feature は同一 endpoint の受理ロジックのみ実装する)」という一次資料上の明記を発見した。これにより「CLI 受付」(feat-feedback-loop の scope_in) = サーバ側受理ロジック、「CLI クライアント本体」= feat-publisher-plugin が owner、という境界が feat-feedback-loop 側の確定文書自体で裏付けられることを確認し、ADR AD-6 の根拠欄をこの正確な出典に差し替えた。

### R-03 (重大・プロセスレベル・ADR へ明記完了/ゲート自体は未解除): Stage 0 fail-closed gate が未解除のまま Stage 1 機能の設計が進行している

- `features/feat-publisher-plugin.md` の frontmatter `depends_on` は `["feat-publish-pipeline", "feat-stage0-distribution-gate"]` であり、feat-stage0-distribution-gate (Stage 0 の H7 配布経路 technical gate) への依存が明記されている。
- しかし ADR §7「Cross-feature 依存の確認」は feat-publish-pipeline と feat-auth-tenancy のみを扱い、**feat-stage0-distribution-gate には一切言及していない**。
- feat-stage0-distribution-gate の状態を独立に確認したところ、`docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md` の verdict は `H7_NOT_ESTABLISHED`、`stage1_entry_condition` は `NOT_MET` であり、「不成立のまま Stage 1 (Publisher + Thin Dual Catalog MVP) へ進むことは baseline §6 `h7-unresolved-blocks-stage1-fail-closed-gate` により禁じられている」と明記されている。
- beads 追跡でも、Stage0 ゲートの epic (`HarnessHub-j71`) の close reason は「Stage 0 technical gate (H7) 終結。verdict=H7_NOT_ESTABLISHED / stage1_entry_condition=NOT_MET。Stage 1 へは進めない」であり、この epic は Publisher epic (`HarnessHub-zdh`) の DEPENDS ON に含まれる (bd 上は「closed」なので依存関係チェックは機械的には通過するが、close reason 自体が明示的な禁止判定である点に注意)。
- 2026-07-30 の post-close revalidation (`HarnessHub-n2c0`, 現在 IN_PROGRESS) は、公式 `git-subdir` source の追加を受けた再検証だが、最新ノート (2026-07-30) でも「Windows skill 実行と明示 cleanup は未実行。A1 pass 維持、A2 未充足、A3 blocked、H7_NOT_ESTABLISHED / Stage1 NOT_MET を維持」と記録されている。本レビュー実施時点 (2026-08-02) でもこの状態は解除されていない。
- 一方、feat-publish-pipeline (feat-publisher-plugin が consumer として依存する側) は 13/13 タスク完了・PR #620 マージ済みであることを `gh pr view 620` で実際に確認済みであり、ADR §7 のこの部分の主張自体は正確である。懸念があるのは feat-stage0-distribution-gate 側のみである。

**この事実は AD-1〜AD-6 の技術的な設計内容の当否とは独立した、より上位のプロセス上の矛盾である。** Stage 1 機能である feat-publisher-plugin が、Stage 0 の fail-closed ゲートが不成立 (`NOT_MET`) のまま P01→P02→P03 と設計フェーズを進めている状態は、system-spec が定めた fail-closed 規約 (「H7 が Stage 0 で成立確認されない限り Stage 1 へは進めない」) と文面上矛盾する。

**是正状況**: ユーザー判断により、設計フェーズ (P01〜P04) はゲート解除を待たず続行し、ADR §7 に本件の依存関係・現在の verdict・P05 entry gate 条件を明記する対応とした。ADR への明記は完了したが、**Stage 0 ゲート (`stage1_entry_condition`) 自体はレビュー時点 (2026-08-02) でも `NOT_MET` のままであり、この是正はリスクの可視化と P05 着手条件の明文化に留まる**。P05 (実装) は ADR §7 の entry gate (ゲート解除 or 作者のリスク受容判断) を満たすまで着手してはならない。

---

## 5. 承認可否の結論: **承認 (是正反映済み、P05 entry gate を明記)**

**理由**

- 4 観点 (inspection 二重実装回避・token 保存方式・wrangler 実行方式限定・desktop GUI 非作成) はいずれも AD-2/AD-3/AD-4/AD-5 の内容として技術的に合格であり、scope_in/acceptance/quality_constraints の追跡表も過不足なく独立検証できた。**AD-1〜AD-5 の設計内容そのものを差し戻す理由はない。**
- 本レビュー完了後、以下の是正が ADR (architecture-decision-record.md) へ反映されたことを確認した。

**是正の反映状況**

1. **R-02 是正 (完了)**: AD-6 の根拠を、feat-feedback-loop 側の confirmed P05 task spec (`phase-05-implementation.md` スコープ外節「`claude harness feedback` CLI クライアント本体の実装 [...] は本 feature の write_scope には含めない」) の一次資料引用に差し替えた。これにより「CLI 受付」= サーバ側受理ロジック、「CLI クライアント本体」= 本 feature (feat-publisher-plugin) が owner、という境界が feat-feedback-loop 側の確定文書自体で裏付けられることを確認した。字面上の矛盾は解消された。
2. **R-03 是正 (ADR への明記は完了。ゲート自体の解除は未達)**: ADR §7 に feat-stage0-distribution-gate への依存、現在の verdict (`H7_NOT_ESTABLISHED` / `stage1_entry_condition: NOT_MET`)、および「設計フェーズ (P01〜P04) はゲート解除を待たず並行するが、**P05 (実装) の entry gate として Stage 0 の `stage1_entry_condition` が `MET` に更新されていること、または作者の明示的なリスク受容判断が別途記録されていることを必須とする**」というシーケンス方針を明記した。**Stage 0 ゲート自体はレビュー時点 (2026-08-02) でも `NOT_MET` のままであり、この是正はリスクの可視化・P05 entry gate の明文化であって、ゲートの解除そのものではない。**
3. **R-01 是正 (完了)**: AD-5 根拠欄の引用元を docs/backend-spec.md §1 から system-spec/00-requirements-definition.md I5 / system-spec/spec-state.json qa-043 に訂正した。

**結論**: 上記の是正により、本レビューは ADR (P02) を**承認**する。AD-1〜AD-6 はそのまま P04 (テストファースト設計) へ進んでよい。ただし、**P05 (実装着手) は ADR §7 に明記された entry gate (Stage 0 `stage1_entry_condition` の MET 化、または作者のリスク受容判断) を満たすまで着手してはならない**。これは P04 完了時点の P05 entry gate 確認事項として、P04 の引き継ぎ事項に明示的に含めること。

---

## 6. 参照

- レビュー対象: [architecture-decision-record.md](./architecture-decision-record.md)、[requirements-baseline.md](./requirements-baseline.md)
- 正本: `.dev-graph/plans/feature-package-feat-publisher-plugin/goal-spec.json`、[docs/backend-spec.md](../../backend-spec.md)、[docs/backend-spec-api-state.md](../../backend-spec-api-state.md)、[docs/security-spec-authentication.md](../../security-spec-authentication.md)
- cross-feature 突合: `features/feat-feedback-loop.md`、[docs/features/feat-feedback-loop/requirements-baseline.md](../feat-feedback-loop/requirements-baseline.md)、`.dev-graph/plans/feature-package-feat-feedback-loop/goal-spec.json`、`features/feat-stage0-distribution-gate.md`、[docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md](../feat-stage0-distribution-gate/stage0-gate-conclusion.md)
- beads 追跡: `HarnessHub-zdh` (Publisher epic)、`HarnessHub-j71` (Stage0 gate)、`HarnessHub-n2c0` (H7 再検証)、`HarnessHub-dfm` (feat-publish-pipeline)
