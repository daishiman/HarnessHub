---
status: confirmed
layer: feature-design
task: SYS-FEEDBACK-LOOP-P03
parent_feature: feat-feedback-loop
---

# feat-feedback-loop 設計レビュー記録 (P03)

> **位置づけ**: [architecture-decision-record.md](./architecture-decision-record.md) (P02 成果物) に対する独立設計レビュー。設計担当者本人ではないレビュー担当として、requirements-baseline.md / docs/backend-spec.md / docs/backend-spec-api-state.md / system-spec/security.md のみを根拠に批判的に判定する。

## 結論: **条件付き承認 → 対応完了により承認**

2026-08-03、下表「指摘事項まとめ」の # 1〜5 全件を ADR (architecture-decision-record.md) へ反映した。

| # | 対応内容 |
|---|---|
| 1 (承認条件) | ADR §5 を選択肢 (a) — kind 非依存のまま qa-048 の workspace-admin 開放を feedback_response にも適用し、baseline の provider-admin 限定記述は書き換えず goal-spec 再確認を P03 申し送り事項 (ADR §11) とする — で確定した |
| 2 | ADR §11 に、requirements-baseline.md §5 の qa-048 未反映を goal-spec 側の governance タスクとして起票する旨を明記した |
| 3 | ADR §6 の `channels` を「`in_app` は常時 + `email` は `user_settings.notify_feedback` opt-in 時のみ」に修正した |
| 4 | ADR §1 の `body` 列に「raw 保存・レンダリング時 sanitize」を `documents.body_md` と同水準で明記した |
| 5 | ADR §9 の acceptance 対応表に §5 (pull 型処理) の引用を追加した |

以上により指摘事項は全件解消し、本レビューの結論を **承認** とする。P04 (テストファースト設計) へ引き継ぐ。

ADR の大半 (7/8 の quality_constraints) は既存 spec への接続方式を過不足なく明記しており、新規実装を追加しない再構成という P02 の位置づけに忠実である。ただし §5 (AiJob pull 権限) の設計は、ADR 自身が §8 で宣言する「feature 固有の認可コードパスを新設しない」という原則と技術的に両立できない可能性が高く、この矛盾を解消しないまま P05 (実装) へ進めると実装段階で手戻りが生じる。P03 として、この 1 点の設計方針明確化を条件とする。

---

## 観点別の適合確認

### 1. feedbacks テーブルの tenant_id/workspace_id スコープ列強制注入 (D4)

**適合**。ADR §1 は `tenant_id`/`workspace_id` を必須列とし「リポジトリ層で WHERE 句へ強制注入」と明記。`docs/backend-spec.md` §2.1「テナント分離規約」("documents.scope='common' を除く全テーブルに tenant_id を必須とし、リポジトリ層で常時 WHERE 句へ強制注入。分離テストを CI 必須とする") および §2.3 `feedbacks` 行の記述と一致する。requirements-baseline.md `feedback-entity-tenant-scope-d4` の文言とも一致。

### 2. feedback status 変更の workspace-admin 限定 + 監査 event (SEC6)

**適合**。ADR §3「`PATCH /api/v1/feedback/:id` (workspace-admin 限定) が唯一の遷移経路。遷移ごとに監査 event `feedback.status_change` を記録する」は、`docs/backend-spec-api-state.md` §4.7 (`PATCH /api/v1/feedback/:id | workspace-admin | ... 監査 event`) および `docs/backend-spec.md` §3.3 認可マトリクス (「feedback status 変更 | — | — | ✓ | ✓」)・§3.8 監査対象 action 列挙 (`feedback.status_change` を含む) と整合する。

### 3. AiJob(`feedback_response`) の pull/書戻し権限 — **要修正**

ADR §5 の指摘 (「requirements-baseline は provider-admin 限定と書いているが、`docs/backend-spec-api-state.md` §4.11 は qa-048 で workspace-admin にも開放されている」) を実際に両文書で検証した。

- **指摘は正確**。requirements-baseline.md §5 (`ai-response-pull-queue-d5-sec8`) は「pull/書戻しの実行主体は provider-admin の Device Flow token 保有者に限定し (qa-031)」と明記し、引用元として `docs/backend-spec.md §4.11 (pull は provider-admin のみ・...)` という**現在の内容と一致しない旧記述**を転記している。一方 `docs/backend-spec-api-state.md` §4.11 は「pull 権限 (qa-048 で改訂・2026-07-18 中立再確認): workspace-admin にも開放する」と明記し、`docs/backend-spec.md` §3.3 の認可マトリクス行「ai-jobs pull/complete | — | — | — | ✓」は provider-admin のみに ✓ のまま (qa-048 未反映)。§9 確定記録の行 7 でも「AiJob pull 権限 (行 3 の改訂): workspace-admin にも開放 (2026-07-18, qa-048)」と明記されており、qa-048 は qa-031 を**明示的に改訂**した確定事項である。ADR の事実認識に誤りはない。

- **「P02 で独自解決せず申し送りとする」判断の評価: 部分的に妥当だが、技術的な矛盾を残したままである。**
  1. `POST /api/v1/ai-jobs/pull` は kind 横断の**単一・汎用エンドポイント**であり、`docs/backend-spec-api-state.md` §4.11 の記述上「kind filter 可」= kind は絞り込みクエリに過ぎず、認可判定の軸ではない。認可は `docs/backend-spec.md` §1「認可は単一ミドルウェアに集約」の原則に従い role のみで判定される。
  2. `docs/backend-spec.md` §10 (構築優先順位) では P1 で `ai-jobs pull/complete/fail` が全 kind 共通で実装され、P3 (feedback) はその**後**に位置づけられる。つまり feat-feedback-loop が実装される時点で、既に汎用 pull エンドポイントは qa-048 の workspace-admin 開放を反映した状態で稼働している可能性が高い。
  3. ADR §8 は「認可判定は既存の単一ミドルウェア (deny-by-default) に role×resource エントリを追加するのみで、feature 固有の認可コードパスを新設しない」と明記している。
  4. (1)〜(3) を踏まえると、ADR §5 が言う「baseline の記述 (provider-admin 限定) をそのまま設計の前提とする」は、**kind=`feedback_response` だけを他 kind と異なる権限で pull 制限する**ことを意味するが、それは単一・kind非依存の汎用エンドポイントと単一ミドルウェア原則 (§8) の両方に反する — つまり ADR は §5 と §8 で両立しない 2 つの設計方針を同時に述べている。この自己矛盾は「P03 で goal-spec 再確認の要否を判定する」という申し送りだけでは解消されない。**実装時にどちらの原則を優先するか (a) kind 非依存のまま workspace-admin 開放を feedback_response にも適用し baseline 側を rollback する、(b) kind 別認可分岐を新設し §8 原則を明示的に例外化する、のいずれかを P02 側で決め打ちすべきであり、決め打ちせずに P05 へ渡すと実装者が独自判断で分岐コードを書く (B1/deny-by-default 原則の空洞化) リスクがある。**
  - なお、requirements-baseline.md 自体が P01 の確定 baseline でありながら現行の `docs/backend-spec-api-state.md` §4.11 と矛盾する旧内容を引用している状態は、baseline 冒頭の rollback 規約 (「転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す」) が想定する事態そのものである。ADR がこれを発見していながら P02 の時点で rollback を起票せず P03 へ申し送るだけに留めた判断は、独立設計レビューとしては「妥当性の最終判断を先送りしすぎている」と評価する。

### 4. Markdown sanitize (SEC7) を feature 側で独自実装しない

**適合**。ADR §1 (`body` 列は「共通レンダラで sanitize 済み HTML として描画のみ行う」)、§2 (「共通 Markdown レンダラ ... sanitize は共通レンダラ側の責務」) は requirements-baseline.md `feedback-markdown-sanitize-sec7` と一致する。

軽微な指摘 (ブロッキングではない): `docs/backend-spec.md` §2.3 の `documents` 行は「body_md は raw 保存・レンダリング時 sanitize (SEC7)」と保存方式まで明記しているのに対し、ADR §1 の `feedbacks.body` 行にはこの「raw 保存」である旨の明記がない。sanitize 済み HTML を保存しない (描画時のみ sanitize) という意図は ADR 文中で読み取れるが、docs と同水準の明示があれば実装者の解釈ゆれを防げる。

### 5. resolved 通知: アプリ内正本 + メール補助、PII 非含有 (SEC9)

**概ね適合、1 点要確認**。ADR §6 は NotificationDispatcher を経由し、Resend を直接呼ばず、メール本文に PII (feedback body) を含めない設計としており、requirements-baseline.md `resolved-notification-inapp-primary-resend-supplementary-d6-b8-sec9` および `docs/backend-spec.md` §2.3 `notifications` 行・§4.10 と整合する。

要確認点: `docs/backend-spec.md` §4.10 は Resend メールを「opt-in」と明記し、§2.3 `user_settings` テーブルには `notify_feedback` (機能別通知設定) と `email_enabled` (メール可否) の列が存在する。これは feedback resolved 通知についてユーザーごとにメール配信の可否を選択できる設計を示唆する。ADR §6 は「channels には常に `['in_app', 'email']` を渡し」と記述しており、これが「NotificationDispatcher 内部で `user_settings.notify_feedback`/`email_enabled` を見て実送信の可否を判定する」ことを前提とした表現なのか、feature 側が opt-in 判定を怠っているのかが ADR 本文だけでは判別できない。NotificationDispatcher 自体の設計は §10 で scope out (owner=feat-hub-foundation) とされているため P02 が再設計する必要はないが、「常に渡す」という表現が opt-in 尊重を暗黙の前提としている旨を一言明記すべきである。

### 6. 修正版 publish の既存 PublishRequest 状態機械への接続 (I2/I3, scope_out)

**適合**。ADR §7 は新規状態機械を作らず、`feedback_id` 一意で `Build` を冪等作成し (`docs/backend-spec-api-state.md` §4.11・§5.3 の既存規約と一致)、`ai_response` の自動 publish を明示的に避け (「自動マージ不採用」)、既存 publish 導線 (`POST /api/v1/publish` → `PublishRequest`) を workspace-admin 以上の人手確認を経て使うとしている。`docs/backend-spec.md` §2.3 `builds` 行の CHECK 制約 (起点は Sheet/Feedback のどちらか一方) とも整合する。

### 7. feedback REST 資源群の B1 (zod 単一ソース) / 認可単一ミドルウェア配下への位置づけ

**適合**。ADR §4・§8 は `packages/schemas/feedback-loop/` を単一ソースとし、既存の認可単一ミドルウェア (deny-by-default) の role×resource エントリを追加するのみで feature 固有の認可分岐コードを持たないとしている。`docs/backend-spec.md` §3.3 の許可表・§1「認可は単一ミドルウェアに集約」と一致する。

ただし観点 3 で指摘した AiJob pull の扱いは、この「feature 固有の認可コードパスを新設しない」という原則そのものと矛盾する可能性があるため、本観点の適合判定は観点 3 の是正と連動する。

### 8. ADR §9 quality_constraints 充足マッピング表の過不足

**適合 (表の対応関係は正確)、軽微な指摘あり**。ADR §9 の 8 行は requirements-baseline.md §5 の 8 件の id と 1:1 で完全一致しており、過不足はない。

軽微な指摘: ADR §9 末尾「acceptance 3 件は §2 (経路正規化)・§3+§4 (status 遷移監査)・§6 (通知) で満たされる設計とした」は、acceptance #2「AI 対応が pull 型で処理され status 遷移が監査記録される」のうち「pull 型で処理され」の部分の充足箇所として §5 (AiJob 連携方式) を明示引用していない。内容は §5 に存在するため実質的な欠落ではないが、追跡可能性 (trace) の観点で引用漏れである。

---

## 指摘事項まとめ

| # | 深刻度 | 内容 | 該当箇所 |
|---|---|---|---|
| 1 | **要修正 (承認条件)** | AiJob pull 権限について、ADR §5 (baseline の provider-admin 限定を設計前提とする) と ADR §8 (feature 固有の認可コードパスを新設しない) が両立しない。汎用 `POST /api/v1/ai-jobs/pull` は kind 非依存の role ベース単一判定であり、qa-048 で workspace-admin に開放済み。P02 は (a) kind 非依存のまま開放を受け入れ baseline を rollback するか、(b) kind 別認可分岐を明示的に設計し §8 の例外として記述するか、いずれかを決め打ちすべき | ADR §5, §8, §11 |
| 2 | 要確認 | requirements-baseline.md §5 (`ai-response-pull-queue-d5-sec8`) 自体が `docs/backend-spec.md §4.11` の旧内容 (「pull は provider-admin のみ」) を引用しており、qa-048 改訂後の現行 `backend-spec-api-state.md` §4.11 と矛盾する。baseline 冒頭の rollback 規約に照らせば、P02 の時点でこの相違を発見した以上、P03 の判断を待たず goal-spec 再確認 (rollback) を起票すべきだったとも言える | requirements-baseline.md §5, ADR §5/§11 |
| 3 | 要確認 | ADR §6「channels には常に `['in_app', 'email']` を渡し」が、`user_settings.notify_feedback`/`email_enabled` による opt-in 判定を NotificationDispatcher 側で尊重する前提かどうかが本文から読み取れない。Resend は `docs/backend-spec.md` §4.10 で「opt-in」と明記されている | ADR §6, docs/backend-spec.md §2.3 (user_settings), §4.10 |
| 4 | 軽微 | `feedbacks.body` が raw 保存でレンダリング時のみ sanitize する旨、`documents.body_md` と同水準で明記されていない | ADR §1 |
| 5 | 軽微 | ADR §9 の acceptance #2 充足箇所引用に §5 (AiJob pull 型処理) が含まれていない (trace の欠落。内容自体は §5 に存在) | ADR §9 |

## 参照ドキュメントに関する補足 (レビュー実施上の制約)

レビュー指示で参照対象とされた `system-spec/security.md` qa-025 (SEC2/SEC6/SEC7/SEC8/SEC9) は、現行の `system-spec/security.md` には存在しない (同ファイルは qa-133/qa-073 中心の内容に全面更新されており、qa-025 は含まれていない)。qa-025 の本文は `system-spec/spec-state.json` に残存しており、その内容 (SEC2 認可・SEC6 監査対象追加・SEC7 XSS・SEC8 AI キュー・SEC9 メール) は requirements-baseline.md の引用と一致することを確認したため、本レビューはこの spec-state.json の記述を実質的な根拠として用いた。ただし `system-spec/security.md` というレビュー対象ファイル自体に qa-025 が欠落している点は、feat-feedback-loop の設計とは別軸の spec 鮮度の問題として付記する (ADR の指摘事項ではないため上表には含めない)。
