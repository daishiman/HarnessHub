# Prompt: R4-reopen

> 7 層プロンプト。確定済みセルを根拠付きで再オープンし追加質問サイクルへ戻す責務。再オープン経由でない確定セルの直接変更は writer (および C11 hook) が遮断する。

## メタ

| key | value |
|---|---|
| name | reopen |
| skill | run-system-spec-elicit |
| responsibility | R4-reopen (確定セル → 未収集 再ヒアリング) |
| layers_covered | [L1, L2, L3, L4, L5, L6, L7] |
| output_schema | references/spec-state-contract.md (reopen_log) |
| reproducible | true |

## Layer 1: 基本定義層 (不変原則)

### 1.1 不変ルール
- `確定` セルの状態を動かせるのは `action=reopen` (要 reason) だけ。
- reopen 非経由の `確定`→`未収集`/`対象外` 直接変更は writer が `TransitionError` で拒否する (C11 hook も遮断)。
- reopen は当該セルを `未収集` へ戻し `reopen_log` に根拠を残す。

### 1.2 倫理ガード
- 根拠 (reason) なき再オープンをしない。確定を無断で消さない。

## Layer 2: ドメイン層 (本質ロジック)

### 2.1 責務 (Single Responsibility)
- 担当: 確定済みセルの根拠付き再オープンと追加質問サイクルへの差し戻し。
- 非担当: 初期化 (R1)、一次ヒアリング (R2)、resume 保存 (R3)。

### 2.2 ドメインルール
- reopen 後のセルは `未収集`。以後 R2/R3 の対象に戻る。
- 再オープンは影響カテゴリ集約を writer が真理値表で再計算 (`確定`→`収集中` 等)。
- **reopen を使わずに済む変更を reopen しない**: `serves_goals` だけ、または `approval_ref` だけを直したい場合は、確定セル限定の追記専用 op である `set-serves` / `set-approval` を使う。どちらも `state=確定` を変えないため確定巻き戻し防御に抵触しない。reopen は確定内容そのものを問い直す操作であり、reopen すると `qa_ref` / `serves_goals` / `serves_intents` / `approval_ref` が `reopen_log[].discarded` へ退避されてセルから外れる。トレース属性の修正のために reopen すると、再確定後に `approval_ref` を別 turn の `set-approval` で戻す手間が生じ、戻し忘れると承認への機械追跡が切れる。
- **再確定の answer は元の回答本文を verbatim (逐語) で保つ**: 再確定 turn の `answer` に「本 turn は回答本文を変更していない」といった変更メタ情報を書かない。`answer` は compile 後の仕様書へ本文としてそのまま印字されるため、メタ注記は仕様書の本文を汚し、reopen を繰り返すと巡回のたびに層が積み上がる。変更の理由と経緯は `reopen_log[].reason` と `qa_log[].question` / `ops` が既に保持している。追記してよいのは仕様内容そのもの (新しい節・新しい決定) だけで、その追記も「何を変えたか」ではなく「仕様がどうであるか」で書く。
- **reopen 後の approval_ref 復元**: reopen 前のセルの `approval_ref` を控えておき、再確定が「承認済みの内容へ追記しただけで、承認の対象そのものは変えていない」場合に限り、再確定後の別 turn で `set-approval` により元の値を戻す。承認の対象が変わった場合は元の値を戻さず、新しい承認を取り直す。
- **質問の中立性 (qa-196-f)**: 再オープンに伴って利用者へ問い直す場合、選択肢がある質問は全選択肢のコスト、節ごとの分量、語調・情緒価を対称にする。問いより前に利用者が未決定の評価的結論を置かず、AI が予期する案を先頭に固定せず、断定・前提埋め込み型の framing を避ける。自分に有利・不利のどちら向きの非対称も同じ厳しさで検査し、生の質問文・全選択肢・提示順序を `approval_log` に逐語で残す。「現状維持 (reopen 前の確定内容をそのまま再確定する)」が成立する場合は対称な選択肢として含める。
- **再確認の独立性 (appr-036 / appr-050 / appr-051 の教訓)**: reopen は既存の確定内容を問い直す操作であり、構造上つねに「前回結論あり」の再確認になる。前回の確定内容を先頭の選択肢に置かず、既定として提示せず、「前回はこう確定した」という誘導を問いより前に置かない。reopen 後の再確定が前回と同じ結論になるとは限らないことを前提に質問を設計し、結論が維持された場合も「誘導なしで維持を選択した」ことが後から検証できる形で記録する。
- **推奨の分離**: `AskUserQuestion` の選択肢ラベル・説明文へ「(推奨)」等の評価ラベルを付けない。AI の見解を示す必要があるときは本文の独立節として書き、選択肢の並びへ織り込まない。選択肢の並び順は決定論的規則で決める。

### 2.3 入力契約
| field | type | required | 説明 |
|---|---|---|---|
| spec_state | path | yes | 現在の spec-state.json |
| target_cell | {category, platform} | yes | 再オープン対象の確定セル |
| reason | string | yes | 再検討の根拠 |

### 2.4 出力契約
- 更新後 `spec-state.json` (対象セル `未収集`、`reopen_log` に entry 追加)。

## Layer 3: インフラ層

### 3.1 参照リソース
| id | path | when_to_read |
|---|---|---|
| contract | references/spec-state-contract.md | reopen 契約/ログ形状の確認時 |
| question_bank | references/elicit-question-bank.md | 追加質問設計時 |

### 3.2 外部ツール
- `Bash`: `python3 scripts/apply-spec-transition.py apply --state spec-state.json --op '{"action":"reopen","category":"<c>","platform":"<p>","reason":"<why>"}'`
- reopen を要さない追記専用 op (確定セル限定):
  - `--op '{"action":"set-serves","category":"<c>","platform":"<p>","serves_goals":["G1"]}'`
  - `--op '{"action":"set-approval","category":"<c>","platform":"<p>","approval_ref":"appr-040"}'`

## Layer 4: 共通ポリシー

### 4.1 失敗時挙動
- 対象が `確定` でない → writer が拒否。対象セル状態を確認して停止 (fail-closed)。
- reason 欠落 → writer が拒否。

### 4.2 最大反復
- 再オープンは根拠ごとに単発。連鎖再オープンは根拠を都度記録。

### 4.3 観測
- reopen 後 `validate-coverage-matrix.py` (loop) が exit0 を確認 (集約が真理値表一致)。

### 4.4 セキュリティ
- reopen_log に秘匿情報を残さない。

## Layer 5: エージェント層 (l5-contract v2.0.0)

### 5.1 担当 agent
- run-system-spec-elicit の R4 局面 (inline)。

### 5.2 ゴール定義
- 目的: 前提が崩れた確定要件を、監査可能な根拠付きで安全に再検討へ戻す。
- 背景: 確定の無断巻き戻しは仕様の信頼を毀損する。reopen 経路に一本化し reopen_log で追跡する。
- 達成ゴール: 対象セルが根拠付きで `未収集` に戻り、集約が真理値表と一致し、再ヒアリング対象になっている。

### 5.3 完了チェックリスト (停止条件)
- [ ] reopen対象の直前状態が`確定`である
- [ ] reopen後の対象状態がreason付きの`未収集`である
- [ ] `reopen_log` に根拠 entry が残っている
- [ ] 影響カテゴリの `category_aggregate` が真理値表と一致する
- [ ] `validate-coverage-matrix.py` (loop) が exit0
- [ ] reopen に伴う選択式の問い直しが qa-196-f の 8 規律を満たし、質問文・全選択肢・提示順序が approval_log に逐語で残っている
- [ ] 選択肢ラベル・説明文に「(推奨)」等の評価ラベルが 0 件で、前回の確定内容が先頭に固定されていない
- [ ] 「現状維持 (前回の確定内容を再確定する)」が成立する論点では、それが対称な選択肢として含まれている
- [ ] 目的が `serves_goals` / `approval_ref` の修正だけでないこと (それだけなら reopen せず `set-serves` / `set-approval` を使う)
- [ ] 再確定 turn の `answer` に変更メタ注記が 0 件で、元の回答本文が verbatim で保たれている
- [ ] reopen 前に `approval_ref` があったセルは、承認対象が不変なら別 turn の `set-approval` で復元され、変わったなら承認が取り直されている

### 5.4 実行方式
- 固定手順を持たない。状況に応じて必要な再検討内容を都度設計し、5.3 の全停止条件を満たす場合だけR2/R3へ差し戻す。

## Layer 6: オーケストレーション

### 6.1 上位接続
- 呼び出し元: run-system-spec-elicit。後段: R2-interview / R3-reask (再ヒアリング)。

### 6.2 並列性
- 単発 (状態依存)。

## Layer 7: UI / 提示

### 7.1 提示形式
- 再オープン理由と対象セルを明示して提示する。
- 再オープンに伴う問い直しでは、前回の確定内容を先頭に置かず、既定として提示せず、選択肢の並び順を決定論的規則で決める。AI の見解は選択肢ラベルではなく本文の独立節として書く。

### 7.2 言語
- 日本語 (JSON キー/platform id は英語)。

---

## 出力指示

再検討の根拠を確認し、`python3 scripts/apply-spec-transition.py apply --state spec-state.json --op '{"action":"reopen",...,"reason":"..."}'` で対象確定セルを `未収集` へ戻す。`reopen_log` の追記と `validate-coverage-matrix.py` (loop) の exit0 を確認し、R2/R3 へ差し戻す。確定の直接変更 (reopen 非経由) は writer が拒否する。reopen に伴って利用者へ問い直す場合は qa-196-f の中立性規律を適用し、前回の確定内容を先頭に固定せず既定としても提示せず、選択肢ラベル・説明文へ「(推奨)」等の評価ラベルを付けず、AI の見解は本文の独立節として分離する。「現状維持」が成立する論点では対称な選択肢として含める。生の質問文・全選択肢・提示順序を `approval_log` に逐語で残す。余計な前置き・思考過程出力は禁止。
