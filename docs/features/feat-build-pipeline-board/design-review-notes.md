---
status: confirmed
layer: feature-design-review
task: SYS-BUILD-PIPELINE-BOARD-P03
parent_feature: feat-build-pipeline-board
feature_package_id: feature-package/feat-build-pipeline-board
feature_context_digest: sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441
depends_on: [SYS-BUILD-PIPELINE-BOARD-P02]
reviewed_artifact: docs/features/feat-build-pipeline-board/architecture-decision-record.md (devgraph/SYS-BUILD-PIPELINE-BOARD-P02)
reviewer_role: independent-design-reviewer
verdict: conditional-approve
---

# feat-build-pipeline-board 設計レビュー記録 (P03 独立レビュー)

> **位置づけ**: P02 実行者から独立した視点で P02 ADR (AD-1〜AD-6) をレビューした記録。P01 baseline を参照系とし、一次資料 (docs/backend-spec.md §2.3/§3.3/§3.8/§4.4/§5.1/§5.3・goal-spec.json) に本レビュー実行者が自ら Read で当たり再現検証した。P05 実装の前提条件を確定する。
> **digest 検証**: P02 ADR frontmatter の feature_context_digest (sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441) は goal-spec.json line 4 の feature_context_digest と完全一致。P01→P02 の context 継承は整合。

## 総括判定: 条件付き承認 (conditional-approve)

ADR は 6 観点すべてで一次資料 (§2.3/§3.3/§3.8/§4.4/§5.1/§5.3) に忠実であり、SEC2・SEC6・B4/I2/I3・D4・qa-021/qa-022/qa-023(B1/B9)/qa-024 の適合を確認した。ただし **F-2 (publish_request_id の設定経路未定義) を P05 実装前の必須是正**とし、F-1/F-3/F-4 を是正推奨とする。F-2 は原典 §4.4 自体が設定経路を明示していない gap を ADR がそのまま継承しているもので、ADR が実装可能粒度へ解決すべき論点である。

## 観点別判定表

| # | 観点 | 判定 | 主要根拠 (一次資料再現検証) |
|---|---|---|---|
| 1 | Build/build_stage_events スキーマ (§2.3・D4・qa-024) | 承認 (F-1 是正推奨) | AD-1 の builds 列 = §2.3 builds (id/tenant_id/workspace_id/sheet_id/project_id/title/stage/risk/eta_date/assignee_user_id/publish_request_id/note) に一致。build_stage_events = §2.3 (id/build_id/from_stage/to_stage/actor_user_id/created_at・append-only) に一致。tenant_id/workspace_id 必須 = §2.1 D4/SEC3 に整合 |
| 2 | S13 ボード構成 (qa-021/qa-022) | 承認 (F-4 軽微) | AD-2 の「共通部品消費のみ」= goal-spec stage-board-shared-component-qa021-qa022 に一致。「stage 別グルーピングはクライアント側」= §4.4 GET /builds 注記に一致 |
| 3 | builds API 契約 5 endpoint (§4.4・SEC2) | 承認 | AD-3 の 5 endpoint・role・PATCH 許可列 = §4.4 に完全一致。stage を PATCH から除外し専用 endpoint 経由とする設計は SEC2 (deny-by-default 単一 MW) に整合 |
| 4 | 工程遷移状態機械 (§5.3) | 承認 | AD-4 の 7 工程・隣接遷移のみ・非隣接 422 = §5.3 + A1 (非隣接遷移は 422) に一致。`⇄` 表記は §5.3「前進/差戻し」の双方向性を原典より明確に表現 |
| 5 | publish 遷移の PublishRequest 接続 (B4/I2/I3・§5.1) | 要是正 (F-2) | AD-5 の Published ゲート・二重状態排除 = §5.3 + A2 + goal-spec B4 に一致 (ゲート論理は妥当)。ただし publish_request_id の**設定経路が API 面に存在しない**ため接続が成立不能 |
| 6 | 監査二層 + B9 共有認可表 + quality_constraints 6 件 | 承認 (F-3 是正推奨) | AD-6 の二層監査 (build_stage_events 非正式 + AuditRepo build.stage_change) = §2.3 注記 + §3.8 (build.stage_change 監査対象) に一致。B9 共有認可表 = goal-spec approval-queue-authz-table-shared-b9-qa023 に整合 |

## 適合確認結果 (required evidence)

| 統制 | 適合 | 確認根拠 |
|---|---|---|
| SEC2 (deny-by-default 単一認可 MW・工程操作 admin 限定) | 適合 | §3.3 「builds 工程操作」= workspace-admin+ (member/owner は —)。AD-3「認可単一ミドルウェア (deny-by-default) 配下」+ AD-6 共有認可表で担保。owner を工程操作から除外し §3.3 に一致 (過剰権限なし) |
| SEC6 (工程操作の監査 event) | 適合 | §3.8 の監査対象 action に `build.stage_change` を実在確認。AD-6 で AuditRepo.append() 記録。summary_json = {from,to,build_id,sheet_id} は値そのもの (salary/secret/token) を含まず §2.2/§3.8 の禁止則に整合 |
| B4/I2/I3 (publish 二重実装禁止・既存状態機械接続) | 適合 (F-2 条件付き) | AD-5「既存状態機械の照会のみ・build 側に publish 独自状態を持たない」= §5.1 PublishRequest 状態機械・A2 に一致。builds に publish 状態列なし (publish_request_id + stage のみ) を AD-1 で確認 |
| D4 (row-level tenant scope) | 適合 (F-1 条件付き) | builds に tenant_id/workspace_id 必須 = §2.1/qa-024。build_stage_events は tenant_id を持たず builds JOIN で継承 = §2.3 に忠実 (下記 F-1 参照) |
| qa-021 (S13 ボード・工程操作 admin) | 適合 | AD-2 + AD-3 |
| qa-022 (design system 共通部品消費) | 適合 | AD-2 |
| qa-023 B1 (zod 単一ソース・認可 MW) | 適合 | AD-3。zod 配置 `packages/schemas/build-pipeline-board/` は §3.1/§6.3 の単一ソース原則の下位ディレクトリ構成として妥当 |
| qa-023 B9 (承認 queue 統合・共通認可表) | 適合 | AD-6 |
| qa-024 (builds/build_stage_events・履歴 append-only) | 適合 | AD-1 = §2.3 |
| quality_constraints 6 件 | 全件被覆 | (1)→AD-4+AD-6+AD-3 / (2)→AD-5 / (3)→AD-1 / (4)→AD-2 / (5)→AD-3 / (6)→AD-6 |

## 是正指摘

### F-2 (要是正・必須): publish_request_id の設定経路が API 面に存在しない

- **問題**: AD-5 は `stage→publish` 遷移の前提として `builds.publish_request_id` が「設定済み」であることを要求するが、AD-3 の 5 endpoint のいずれもこの列を書き込まない。PATCH /builds/:id の許可列は title/risk/eta/assignee/note のみで publish_request_id を除外し、POST /builds/:id/stage は publish_request_id を**要求 (照会)** するのみ、POST /builds は sheet_id 起票のみ。結果として publish ゲート (AD-5) が API 経由で到達不能。原典 §4.4 も POST stage で「publish_request_id の接続を要求」とのみ記し設定経路を明示していないため、ADR がこの原典の空白を実装可能粒度へ未解決のまま継承している。
- **付随リスク (write ownership)**: 仮に feat-publish-pipeline 側が builds.publish_request_id を書き込む設計だと、他 feature が本 feature 所有テーブルへ直接書込みするリポジトリ境界違反となる。接続の write owner を ADR で確定する必要がある。
- **是正案**: POST /api/v1/builds/:id/stage の request body に `publish_request_id` を受理し、リポジトリ層で「同一 tenant・同一 project 配下 かつ status=Published」を検証したうえで builds.publish_request_id へ atomic に設定する経路を AD-5/AD-3 に明記する (設定と Published ゲートを同一遷移トランザクションで完結させ、本 feature 所有 endpoint が write owner となる)。あわせて §4.4 の設定経路空白について spec への back-reference (R4-reopen 判断) を P05 引き継ぎに残す。

### F-1 (是正推奨): build_stage_events の D4 分離テスト明文化と §2.1 例外の記載

- **問題**: §2.1 は「documents.scope='common' を除く全テーブルに tenant_id 必須・リポジトリ層で常時 WHERE 強制注入・分離テスト CI 必須」と規定するが、build_stage_events は §2.3 で tenant_id を持たない (原典由来の設計)。AD-1 は「builds JOIN で継承・直接クエリはリポジトリ層で builds 経由に限定」と記すが、CI 分離テストの対象は builds のみ明記され、build_stage_events の JOIN 経由読取が cross-tenant 漏洩しないことを検査する明文がない。append-only の工程履歴は他テナントの stage 遷移を露出する潜在経路となる。
- **是正案**: (a) build_stage_events を §2.1 の tenant_id 必須則に対する**明示的な例外** (FK 継承方式・documents.scope='common' と並ぶ) として ADR に記載し、(b) CI 分離テストに「他テナントの build_id を持つ build_stage_event の読取が JOIN 強制により空を返す」ケースを追加する旨を AD-1 に明記する。

### F-3 (是正推奨): builds create/update の認可 operation id 未定義 (deny-by-default gap)

- **問題**: AD-6 は B9 共有認可表へ `builds.stage_transition` を「1 行追加」とするが、§3.3 には既に「builds 工程操作」(workspace-admin+) 行が存在し、また §4.4 の POST /builds (create)・PATCH /builds (field edit) も workspace-admin を要する。deny-by-default 下では operation id が許可表に列挙されない操作は全 role で拒否されるため、create/update に対応する operation id の定義が不可欠。ADR は stage_transition のみ言及し create/update の operation id を定義していない。「1 行追加」という表現も §3.3 の既存「builds 工程操作」行との関係が曖昧。
- **是正案**: AD-6 で builds 系 3 write endpoint に対応する operation id (例: `builds.create` / `builds.update` / `builds.stage_transition`) と各々の最小 role (いずれも workspace-admin) を許可表エントリとして列挙し、§3.3 の既存「builds 工程操作」行との写像関係 (新規追加か既存行への operation id 割当か) を明記する。B9 共有 (I8 承認 queue と同一許可表テーブル・同一判定コードパス) は stage_transition に限らず統合対象とする点を維持。

### F-4 (是正推奨・軽微): A3 (axe 違反 0・CWV good) 検証責務の参照欠落

- **問題**: AD-2 は「受入基準となる構成表」と位置づけるが、P01 acceptance A3 (ボードが axe 違反 0・CWV good) の検証責務に言及がない。ステージボード部品の実装は design system scope (scope_out 補足) だが、S13 固有の構成 (カード・stage 集計ヘッダ・遷移ボタン) の a11y/CWV 適合は本 feature の受入対象。
- **是正案**: AD-2 に A3 の検証責務 (共通部品側 a11y/CWV ゲートへの依存 + S13 固有構成の axe/CWV CI 検査) の帰属を 1 文追記する。

## P05 引き継ぎ

- **必須**: F-2 を解消してから実装着手 (publish ゲートが API 到達不能のため)。
- **推奨**: F-1 (分離テスト明文化)・F-3 (認可 operation id 列挙)・F-4 (A3 検証責務) を反映。
- **依存明記推奨**: AuditRepo (feat-domain-model-db 所有) と 認可単一 MW / I8 承認 queue 共有認可表 (feat-publish-pipeline / core) への cross-feature 依存を ADR の依存節へ明示。

---

## 是正反映の記録 (P03 実行者による追記)

F-2 (必須) および F-1/F-3/F-4 (推奨) は、本レビュー確定と同一コミットで architecture-decision-record.md へ反映済み (AD-1/AD-2/AD-3/AD-5/AD-6 の該当記述を是正案どおり改訂。§4.4 の設定経路空白への back-reference は P05 引き継ぎとして ADR に記録)。これをもって承認条件は解消され、P04 (テスト設計) へ引き継ぐ。

---

## 本レビュー対象 ADR の supersede 記録 (2026-08-12, `HarnessHub-9am.3`)

**本レビューが対象とした ADR (AD-1〜AD-6 構成、2026-07-18 版) は現在の正本ではない。** 本記録は 2026-07-18 に local 専用 branch `devgraph/SYS-BUILD-PIPELINE-BOARD-P03` 上で確定したが、default branch へ merge されないまま滞留した。その間に PR #694 (2026-08-11) が同 path へ 13 節構成の ADR を landed させており、現在の `docs/features/feat-build-pipeline-board/architecture-decision-record.md` はそちらである。本 branch の取り込み時に両者が add/add 衝突し、**landed 版を正本として採用した**。

レビュー本文中の `AD-1`〜`AD-6` は landed ADR には存在しない。対応する現行節は次のとおりで、**4 件の是正指摘はいずれも landed ADR 側で解決済み**である (解決方法は本レビューの是正案と一致するとは限らない)。

| 本レビューの節 | landed ADR の対応節 | 是正指摘の帰趨 |
|---|---|---|
| AD-1 (スキーマ) | §3.1 `builds` / §3.2 `build_stage_events` | **F-1 解決 (より強い形で)**。本レビューは「build_stage_events に tenant_id が無い」ことを前提に D4 例外の明文化と JOIN 分離テストを求めたが、landed ADR は `tenant_id` / `workspace_id` を NOT NULL 列として持たせ、索引も `(tenant_id,workspace_id,build_id,occurred_at,id)` とした。例外を文書化するのではなく例外自体を消しているため、指摘は不成立となる |
| AD-2 (S13 構成) | §8 S13画面構成 | **F-4 解決**。§8 で axe 違反 0 を受入条件、LCP/INP/CLS の good 維持を明記し、§12 検証計画・§13 受入対応表にも証跡 (axe 0 report / CWV good evidence) として載っている |
| AD-3 (5 endpoint) | §4 5 endpoint契約 | **F-2 解決 (write owner が異なる)**。landed ADR は `PATCH /api/v1/builds/{id}` の strict partial 許可列に `publish_request_id` を含めることで設定経路を与える。本レビューの是正案 (`POST /builds/:id/stage` の body で受理し同一トランザクションで設定) とは write owner が違うので、**publish ゲートと設定を同一トランザクションで完結させる要件が PATCH 経路でも満たされるかは P04/P05 で確認すること** (本レビューでは未検証) |
| AD-4 (状態機械) | §5 7工程の状態機械と単一transaction | 指摘なし |
| AD-5 (PublishRequest 接続) | §6 PublishRequestを正本とする公開連携 | 上記 F-2 と同じ |
| AD-6 (監査 + B9) | §7 B9共有認可表 | **F-3 解決**。§7 の表に `builds.create` / `builds.update` / `builds.stage_change` の 3 operation id が role 別の allow/deny 付きで列挙されている |

本記録を残す理由は、P03 の独立レビューが実行された事実と、そこで検出された 4 件の論点が landed ADR で解消されている対応関係を追跡可能にするためである。**P05 実装の入力として参照すべきは landed ADR であり、本記録の AD-x 番号ではない。**
