---
name: run-system-spec-elicit
description: システム仕様のヒアリングを開始するとき、システム構築の要件をカテゴリ×プラットフォームの収集マトリクスで往復ヒアリングして spec-state.json に確定させたいときに使う。
disable-model-invocation: false
user-invocable: true
kind: run
prefix: run
hierarchy: L1
effect: local-artifact
owner: team-platform
since: 2026-07-11
version: 0.1.0
source: plugins/system-spec-harness/skills/run-system-spec-elicit/references/spec-state-contract.md
output_language: ja
argument-hint: "[--spec-state <path>] [--resume]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - WebSearch
  - WebFetch
  - AskUserQuestion
  - Task
trigger_conditions:
  - システム仕様のヒアリングを開始
  - システム構築の要件収集
  - spec-hearing-start
responsibility_refs:
  - prompts/R0-foundation.md
  - prompts/R1-init.md
  - prompts/R2-interview.md
  - prompts/R3-reask.md
  - prompts/R4-reopen.md
  - prompts/R5-decision-guide.md
  - prompts/R6-audit-hearing.md
  - prompts/R7-audit-matrix.md
reference_refs:
  - references/resource-map.yaml
  - references/elicit-question-bank.md
  - references/spec-state-contract.md
  - references/required-info-catalog.json
script_refs:
  - scripts/apply-spec-transition.py
  - ../../scripts/validate-coverage-matrix.py
  - ../../scripts/validate-design-knowledge-refs.py
  - ../../scripts/validate-knowledge-graph.py
schema_refs:
  - ../../schemas/spec-state.schema.json
responsibilities:
  - id: R0-foundation
    name: elicit-foundation
    prompt_required: true
  - id: R1-init
    name: init-matrix
    prompt_required: true
  - id: R2-interview
    name: interview
    prompt_required: true
  - id: R3-reask
    name: reask
    prompt_required: true
  - id: R4-reopen
    name: reopen
    prompt_required: true
  - id: R5-decision-guide
    name: guide-decision
    prompt_required: true
  # R6/R7 = 本 skill の成果物を監査する責務。所有の分割理由は本文「責務 (prompts/)」節の注記が正本。
  # ここで宣言するのは、responsibility_refs だけに置くと責務集合と anchor 集合が割れるため。
  - id: R6-audit-hearing
    name: audit-hearing
    prompt_required: true
  - id: R7-audit-matrix
    name: audit-matrix
    prompt_required: true
combinators:
  - with-goal-seek
  - with-feedback-contract
goal_seek:
  engine: inline
  fork: subagent
  max_loops: 5
completeness_exempt:
  - "manifest: inline goal-seek selects the next unmet interview/checklist responsibility dynamically; the SKILL body is the runtime SSOT."
deterministic_checks:
  - ../../scripts/validate-coverage-matrix.py
  - ../../scripts/validate-knowledge-graph.py --profile required-info
  # knowledge_ref は repo 相対なので --repo-root を省くと cwd 既定になり、repo root 以外を
  # cwd に実行したとき参照解決が崩れる。matrix path も $CLAUDE_PROJECT_DIR 起点で統一する。
  - ../../scripts/validate-design-knowledge-refs.py --matrix $CLAUDE_PROJECT_DIR/system-spec/spec-state.json --repo-root $CLAUDE_PROJECT_DIR
feedback_contract:
  max_iterations: 5
  criteria:
    - id: IN1
      loop_scope: inner
      text: validate-coverage-matrix.py が spec-state.json に対し 6 canonical platform 全存在・各セルが未収集/対象外/確定の3値・対象外に理由(または approval_ref)・確定に qa_ref・カテゴリ集約が真理値表一致・不正値0件を機械検証して exit0 になる。schema 1.1 の確定 qa は design_applications に knowledge_ref/principle/applicability/rationale/非空tradeoffs を必須とし、marker 無し exact schema 1.0 は read-only、明示 init だけが migration 可能、schema/marker 欠落・不一致の修復は拒否する。R0-foundation 完了後は --require-foundation も付け、requirements_foundation の U1-U9(値ありまたは明示 N/A・U1/U2/U3 は値必須)・decisions 契約・各確定セルの serves_goals トレースも exit0 で検証する(R0 完了前の foundation 未確定段階では --require-foundation を課さない段階条件)。あわせて validate-design-knowledge-refs.py --matrix $CLAUDE_PROJECT_DIR/system-spec/spec-state.json --repo-root $CLAUDE_PROJECT_DIR が exit0 で、design_applications[].knowledge_ref の path と anchor 見出しの実在を検証する(coverage matrix 側は解釈の形状しか見ないため、参照先の無い引用はこのゲートが無いと緑のまま通る)。
      verify_by: script
    - id: OUT1
      loop_scope: outer
      text: 往復ヒアリングを経て全セルが確定または対象外(理由付き)で埋まり未収集0になった最終 spec-state.json を validate-coverage-matrix.py --require-complete が exit0 で確認し、受入テストが resume 保存も含めて再現する。
      verify_by: test
    - id: OUT2
      loop_scope: outer
      text: 実対話のlive trialで、U1-U9確定、needs_guidance時の最新根拠付き2〜3案、free/low-cost候補、AI推奨保留、ユーザー確認、最終未収集0までを機密情報なしのsandbox stateで完走できる。
      verify_by: live-trial
---

# run-system-spec-elicit

> システム構築の仕様を、まず **上位概念 (本質的目的/背景/ゴール/目標/成功基準/具体的やりたいこと U1-U9)** を深掘りヒアリングで確定し (R0-foundation)、その上で **カテゴリ×canonical platform id** の収集マトリクスを往復ヒアリングで終端化する L1 skill。ユーザーが決めきれない項目は R5 が最新公式根拠付き2〜3案（無料/低コスト案を含む）を目的適合で比較し、AI推奨・理由・注意点を示してユーザー確認へ導く。foundation / decisions / matrix の書込は本 skill 所有の**単一 transition writer**のみ。

監査 fork の genuine Agent 応答・verdict 台帳は completeness evaluator (C05) の所有であり、C01 の状態遷移受領条件へ重複して持ち込まない。C01 は設計適用を構造化した spec-state を作り、C05 がその内容と独立監査 evidence を評価する。

## 上位概念 anchor (要件 C9・spec drift 防止)

> 上位概念がブレると、仕様が整ってもブレる。技術マトリクス (下位概念) の**手前**で上位概念 (U1-U9) を最初にしっかり抽出して `requirements_foundation` に固定し、各技術決定 (確定セル) を `serves_goals` でそこへトレース (anchor) する。どのゴールにも資さない収集は drift として検出する。

- **bootstrap** サブコマンドが空のstate envelopeを作り、**R0-foundation** が `set-foundation` で U1-U9 を確定してから **R1-init** がmatrixを初期化する。schema 1.1 の確定には全 U の `effective_source_refs.U<N>.{qa_ref,approval_ref}` が必須で、writer/coverage は参照先の一意な実在、QA question による対象 U の明示、利用者一次入力の source、非 retired、現行 approval との整合を強制する。canonical `qa-foundation-u1`〜`u9` は初回履歴として immutable に保持する。確定値の更新時は変更対象 U の新 QA/approval とトップレベル `approval_ref` を同時に更新し、値だけを旧証拠へ付け替える操作を writer が拒否する。exact schema 1.0 だけ canonical fallback を許す。
- **共有 foundation QA は例外契約**: 複数 U が同じ `qa_ref` を指すときだけ、各 binding に consumer 別 `evidence_quote` / `evidence_sha256` を必須とする。writer/coverage は question marker 集合、answer 内の quote 完全一致、quote hash、consumer 間の独立性、approval 同一性を機械検査し、C06 が quote の意味的な裏付けと逐語性を監査する。
- 各 `確定` セルに `serves_goals: [<goal_id>, ...]` を付与 (confirm 同時付与 or `set-serves` op) し、どの上位概念に資するかを明示する。
- C03 (`run-system-spec-compile`) は `requirements_foundation` を `system-spec/00-requirements-definition.md` (要件定義書=憲法) として先頭章に生成し、各技術章 frontmatter に `serves_goals` を持たせて全章を貫通させる。
- 検証: `../../scripts/validate-coverage-matrix.py --require-foundation` が U1-U5 非空・各確定セルの serves_goals トレース・drift 候補を機械検証する (opt-in)。

## Purpose & Output Contract

**入力**: ヒアリング応答 (対話) / 既存 `spec-state.json` (resume 時) / C04 taxonomy。
**出力**: `spec-state.json` (`references/spec-state-contract.md` の形状。現行 schema 1.1 の plugin 共有データ契約。上位概念 `requirements_foundation` を含む)。
**完了条件**: `requirements_foundation` が確定し、schema 1.1 では各 U が `effective_source_refs` の1論点 QAと承認へ遡及できる。対話は `source.kind=user-dialogue`、書面は path/section・逐語 `answer`・SHA-256を持つ。AI生成文は一次根拠にせず、新しい利用者入力なしに approval を作らない。全セルは `確定` または理由付き `対象外`、未収集0。確定 qa は `design_applications[]` を持つ。`validate-coverage-matrix.py --require-complete --require-foundation` と required-info/knowledge gates が exit0。
`coverage_certificate.blocking_items` は未解決一覧ではなく `missing_effect=block` の収集必須 item ID 一覧であり、各 ID を確定 foundation/matrix/decision の利用者根拠へ接地する。

- **platforms (6)**: `web` / `mobile` / `tablet` / `desktop-windows` / `desktop-linux` / `desktop-macos`。
- **cell states (3値, loop 中)**: `未収集` / `対象外` / `確定`。最終時は `未収集` を0にする。
- **category_aggregate (4値)**: 真理値表から導出 (直接指定しない)。全セル未収集=未着手 / 未収集混在=収集中 / 全セル対象外=対象外 / それ以外で未収集0=確定。
- **カテゴリ初期集合の正本**: C04 `plugins/system-spec-harness/skills/ref-system-design-knowledge/references/system-category-taxonomy.json` を Read して得る (prompt へ直書き禁止)。

## 単一 transition writer 防御 (SSOT)

`spec-state.json` への状態書込は **`scripts/apply-spec-transition.py` の一経路のみ**。本 writer は以下を機械的に強制する:

1. **確定巻き戻しの拒否**: `確定` セルを `confirm` / `exclude` で直接変更しようとすると `TransitionError` で拒否する。Bash や別 script から CLI を叩いても同じく拒否される (single-writer 防御)。
2. **R4-reopen 経由のみ確定変更**: `確定` セルの状態を動かせるのは `action=reopen` (要 reason) だけ。reopen は当該セルを `未収集` へ戻し `reopen_log` に根拠を残す。その後 `confirm` / `exclude` で再遷移できる。
3. **確定/対象外の付帯必須**: `confirm` は `qa_ref` (qa_log entry 参照) 必須、`exclude` は `reason` か `approval_ref` (approval_log 参照) 必須。
4. **設計解釈の必須性と形状検証**: 新規 state は `schema_version: "1.1"` と `design_application_contract_version: "1.0"` を持つ。writer は turn の `design_applications` の具体原則・採否・章固有理由・非空 trade-off を検証して回答原文とは別 field に保存し、`validate-coverage-matrix.py --require-complete` は確定セルが参照する全 qa entry で解釈と provenance の存在・形状を再検査する。marker の無い旧 schema 1.0 state は読み取り専用で、更新時は R1 `init --state` により matrix を未収集へ再初期化して 1.1 へ移行する。1.1 へ移行済みで `legacy_exempt: true` と非空理由が残る既存 qa に限り、`set-qa-design-applications` が質問・回答を改変せず設計解釈だけを追記し、`design_application_provenance.mode=legacy_backfill` を残す。provenance の無い既存解釈は対話経路として保護し、既存の異なる解釈や provenance の上書きも拒否する。C03 は `unrecorded|dialogue|legacy_backfill` を章へ描画し、C05 は `unrecorded` を未記録 finding とし、backfill の回答適合を再照合する。1.1 以降は marker 欠落を fail-closed に拒否する。
5. **集約は導出のみ**: `category_aggregate` は真理値表から再計算する。手書き代入を認めない。

> 本文・prompt・CLI いずれの経路でも、マトリクスの状態遷移は上記 writer を経由すること。直接 JSON 編集で `確定`→`未収集` を書くのは契約違反。

## 責務 (prompts/)

| id | prompt | 責務 |
|---|---|---|
| R0-foundation | `prompts/R0-foundation.md` | マトリクス収集の**手前**で上位概念 (U1-U9) を深掘りヒアリング (5 Whys で U1・JTBD で U6) し `set-foundation` で `requirements_foundation` を確定。書面要件があるときは U ごとの 1論点 source-index を `qa_log` に残す。未確定は再質問し放置しない。 |
| R1-init | `prompts/R1-init.md` | C04 taxonomy を Read し、カテゴリ×6必須platform の全存在(対象外は理由付き)を検証して初期化。カテゴリ軸の拡張発見もここ。 |
| R2-interview | `prompts/R2-interview.md` | required-info の `collection_order` に従って未収集セルを質問→回答→仕様反映し、各セルを `確定` か `対象外+理由` へ遷移する。人向け UI の有無を分岐し、UI ありなら question bank の情報設計9項目、なしなら理由付き N/A を `frontend-arch` より先に確定する。確定回答ごとの具体的な設計原則採否は `design_applications[]` に分離記録。 |
| R3-reask | `prompts/R3-reask.md` | 未確定セルを再質問。再確定時も `design_applications[]` を記録し、1 invocation の 5 loop 到達時は未完了状態と next_question を保存して resumable な結果を返す。未収集を完了扱いしない。 |
| R4-reopen | `prompts/R4-reopen.md` | 確定済みセルを根拠付きで再オープンし追加質問サイクルへ戻す。reopen 非経由の確定直接変更は writer が遮断する。 |
| R5-decision-guide | `prompts/R5-decision-guide.md` | `needs_guidance` を最新公式情報とC04 deep knowledgeから2〜3案へ展開し、無料/低コスト案を含めgoal fit/TCO/security/operations/lock-inで比較。AI推奨は`recommended_pending_confirmation`、ユーザー選択だけを`confirmed`にする。加えて `../../scripts/validate-knowledge-graph.py --profile required-info --input references/required-info-catalog.json` の exit0 を要求し、`coverage_certificate.blocking_items` (`missing_effect=block` の収集必須 item ID 一覧) を確定 foundation/matrix/decision の根拠へ接地できるまで当該 domain の `confirmed` を禁じる収集ゲートを課す。`--profile knowledge --order` の topo_order (上位概念→下位概念) 順で知識を消費する。 |
| R6-audit-hearing | `prompts/R6-audit-hearing.md` | 本 skill の往復ヒアリング (質問設計と回答反映) を独立 context で監査し、5 軸 (聞き漏れ / 誘導質問 / 早期停止 / トレーサビリティ (qa_ref) / 上位概念の遡及性) を検出する。軸の呼称は `prompts/R6-audit-hearing.md` の見出しが正本。第 5 軸は C05 側 (`assign-system-spec-completeness-evaluator`) で「foundation 利用者根拠」と呼ぶ同一軸で、あちらは 4 軸への退行を防ぐテストが語を固定しているため呼称を残す。read-only。 |
| R7-audit-matrix | `prompts/R7-audit-matrix.md` | 本 skill が出力した収集マトリクスを独立 context で監査し、未収集セルの放置・対象外理由の妥当性・確定セルの `qa_ref` トレーサビリティ・カテゴリ集約の真理値表整合・canonical platform 行の全存在を検証する。read-only。 |

> R6/R7 は**本 skill の成果物を対象とする監査責務**なので prompt 本文の正本は本 skill が持つ。
> 一方その起動アダプタ (`../../agents/system-spec-{hearing,matrix}-auditor.md`) は
> `assign-system-spec-completeness-evaluator` の `agent_refs` が所有する。監査対象と同じ skill が
> 監査の判定まで自分で回すと独立性が失われるため、本文の所有と起動の所有をこの 2 skill へ分けている。
> この分割の帰結として、本 skill のゴールシークループが各周回で選ぶ責務の母集合は **R0-R5 に限る**。
> 自分のループで自分の監査を回すと監査対象と判定者が同一になるため、R6/R7 の起動は C05 側に置く。
> R 番号は skill ごとの名前空間で、`run-system-spec-doc-fetch` の `R4-audit-doc-freshness` と
> 本 skill の `R4-reopen` は別 skill の別責務であり衝突ではない。

## ゴールシーク実行

- engine=inline / fork=subagent / max_loops=5 / loop_semantics = **per-invocation chunk limit**。
- 各周回で選ぶ責務の母集合は **R0-R5 に限る** (R6/R7 を除く理由は上記「責務 (prompts/)」節の注記が正本)。
- 1 invocation で最大 5 loop (質問→回答→反映) を回す。5 loop 到達で未収集が残れば `hearing_progress.complete=false` と `next_question` を保存し、resumable に返す (`--resume` で続行)。
- chunk は未収集0を満たしたときだけ `complete=true`・`next_question=null` を書く。未収集セルを完了扱いしない。`reopen` / `add-category` / `apply` を含む全 matrix writer も同じ不変則へ再同期するため、更新後の `hearing_progress` を stale のまま残さない。
- `hearing_progress` の各 field の意味論 (`loop_count` = 直近 chunk の turn 数で累計ではない / 全 matrix writer が `complete` と `next_question` を再同期する) の正本は `references/spec-state-contract.md`「hearing_progress の意味論 (SSOT)」。完了判定には `complete` 単独でなく `--require-complete` を使う。
- ループの各周回は「未達 = 未収集セル」を最小化する手順を都度立案→ writer で適用→ `validate-coverage-matrix.py` で検証、を繰り返す (固定手順を持たない)。

## feedback-contract (with-feedback-contract)

- **IN1 (inner / script)**: 以下 path 表記は本節を正本とし、`spec-state.json` は常に正本位置 `$CLAUDE_PROJECT_DIR/system-spec/spec-state.json` を指す (短縮形で書かない)。`python3 ../../scripts/validate-coverage-matrix.py --matrix $CLAUDE_PROJECT_DIR/system-spec/spec-state.json` が exit0 (loop 中の網羅性)。R0-foundation 完了後は `--require-foundation` も付けて exit0 とし、上位概念 U1-U9・decisions 契約・serves_goals トレースを段階的に課す (foundation 未確定の R0 完了前には課さない)。あわせて `python3 ../../scripts/validate-design-knowledge-refs.py --matrix $CLAUDE_PROJECT_DIR/system-spec/spec-state.json --repo-root $CLAUDE_PROJECT_DIR` が exit0 (`--repo-root` の既定は cwd で `knowledge_ref` は repo 相対のため、省略すると repo root 以外を cwd にしたとき参照解決が崩れる) (`design_applications[].knowledge_ref` の path と anchor 見出しが実在)。coverage matrix 側は解釈の形状しか見ないため、参照先の無い引用はこのゲートが無いと緑のまま通る。
- **OUT1 (outer / test)**: 最終 `spec-state.json` を `--require-complete` が exit0 で受理し、受入テスト (`tests/`) が resume 保存を含めて再現する。
- **収集ゲート (C16 / IN1 補完)**: `../../scripts/validate-knowledge-graph.py --profile required-info --input references/required-info-catalog.json` が exit0 で、`coverage_certificate.blocking_items` に列挙された収集必須 item (product-goal / target-platforms / screen-information-priority / domain-model / auth-model / security-posture) が確定 foundation/matrix/decision の根拠へ接地していることを意味層で確認する。`screen-information-priority` は、人向け UI があれば question bank の9項目、なければ理由付き N/A を根拠とする。UI ありで未接地なら UI-UX と `frontend-arch` の `confirmed` を許さず、UI なしの理由付き N/A は後続を block しない。`frontend-arch depends_on screen-information-priority` は validator の `collection_order` で前後関係を決定論的に固定する (R5 が回答接地の prose ゲートを施行し、決定論 writer=apply-spec-transition への接地検査組込は follow-up)。

## 使い方 (ゴールへ向けた反復)

> `spec-state.json` の正本位置は `$CLAUDE_PROJECT_DIR/system-spec/spec-state.json`。以下のパス例はこの正本を指す (別ディレクトリに二重生成しない)。

1. **bootstrap**: `apply-spec-transition.py bootstrap --out $CLAUDE_PROJECT_DIR/system-spec/spec-state.json` で空foundation/decisions/targets/logsを持つstate envelopeを用意する (`init` は taxonomy から matrix を初期化する別subコマンドで、envelope 生成は `bootstrap`)。
2. **R0-foundation**: U1-U9 を深掘りし、初回 canonical QAを履歴として記録、全 U の `effective_source_refs` と現行 `approval_ref` を `set-foundation` で確定する。QA question は binding 先の `U<N>` を明示する。後続の確定値変更は新 QA/approval、対象 binding、トップレベル `approval_ref` を同時に更新する。
3. **R1-init**: taxonomy を Readしてmatrixをpopulateする。既存foundation/decisionsを保持する。
4. **R2/R3/R5**: required-info の `collection_order` で未収集セルをヒアリングする。人向け UI があれば `screen-information-priority` の9項目を、なければ理由付き N/A を `frontend-arch` より先に確定する。不明・未決定ならR5で根拠付き候補と推奨を提示する。確定セル/decisionはgoalへトレースし、5 loop超でresume保存。
5. **R4-reopen**: 確定セルの見直しが要るときのみ reopen。
6. **検証**: 各周回でvalidator、最終で`--require-complete --require-foundation`。source/設計解釈/knowledge ref の補完は各専用writerを使う。歴史的な誘導 entry は本文を改変せず、matrix/effective consumer 0件を確認して `retire-qa --qa-id <id> --reason <reason>` を使う。retired entry を現行参照へ残してはならない。`chunk` 全消化が必要なら `--require-all` を付ける。

## Gotchas

1. カテゴリを prompt へ直書きしない。必ず C04 taxonomy が正本。
2. `確定`→`未収集` の直接書換は禁止 (reopen を使う)。
3. 5 loop 到達で未収集が残るなら未完了として保存する。未収集を勝手に確定/対象外にしない。
4. `category_aggregate` は writer が真理値表から再計算する (手書きしない)。
5. platform id は canonical 6 種のみ (別名を作らない)。
6. `qa_log` は 1 entry = 1 論点。複数論点を束ねると C06 が論点別に中立性を検証できない。書面要件も利用者の一次入力なので、U1-U9 ごとに path/section・原文 SHA-256 を持つ source-index を記録する。既登録 entry の逐語は改変せず、束ねが判明したら分離索引を新規 entry として追記する (契約は `references/spec-state-contract.md` の「qa_log の論点分離`)。
7. `screen-information-priority` を「カード UI にする」等の見た目の結論だけで確定しない。利用者ロール・主タスク・熟練度・端末・頻度・データ量・比較/一括操作・誤操作コスト・visual device 方針を揃え、ラベル/線/アイコン/画像は意味上の役割から採否を決める。

## Additional Resources

- `references/spec-state-contract.md` — spec-state.json 形状 + 真理値表 + writer 契約の正本。
- `references/elicit-question-bank.md` — カテゴリ×platform 質問テンプレ集。
- `references/resource-map.yaml` — Progressive Disclosure 索引。
- `scripts/apply-spec-transition.py` — 単一 transition writer (init/apply/chunk/aggregate)。
- `../../scripts/validate-coverage-matrix.py` — 網羅性の決定論ゲート (IN1/OUT1)。
- `../../scripts/validate-design-knowledge-refs.py` — `design_applications[].knowledge_ref` の参照先実在ゲート (IN1 補完)。
- `references/required-info-catalog.json` — C16 必須情報カタログ (domain 別 block/degrade/warn item・収集順序 depends_on・coverage certificate の正本)。
- `../../scripts/validate-knowledge-graph.py` — 知識グラフ / required-info の決定論ゲート (`--profile required-info` が domain 被覆・item 形状・blocking_items を、`--profile knowledge --order` が topo_order を検証)。
- C04: `../ref-system-design-knowledge/references/system-category-taxonomy.json` — カテゴリ初期集合の正本。
