---
graph_node_id: "spec-harness-hub-information-design-addendum"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["information-design","frontend","ui-ux","accessibility","screen-design"]
priority: "high"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "Harness Hub 画面情報設計追補"
owners: ["daishiman"]
created_at: "2026-08-11T05:56:54Z"
updated_at: "2026-08-11T07:04:22.525743Z"
status: "active"
depends_on: ["spec-harness-hub-ui-foundation-addendum"]
related_nodes: ["arch-harness-hub-frontend","feat-hub-foundation"]
resource_scope: ["specs/harness-hub-information-design-addendum.md","docs/frontend-information-design-guide.md","docs/screen-inventory.md","docs/frontend-ui-foundation-spec.md","docs/frontend-spec.md","docs/frontend-responsive-mobile-spec.md","architecture/harness-hub-frontend.md"]
purpose: "利用文脈から情報の取捨・グループ化・顕著度・表示加工・パターン・視覚要素・検証を一体で決める適応型情報設計契約を固定する"
goal: "利用者が主要状態と次の操作を過度な探索なしに判別でき、実装者が画面ごとの設計根拠と検証結果を再現できる状態にする"
scope_in: ["S01-S18 と共通シェルの10工程の情報設計","lead/context/metadata の情報顕著度と semantic token への写像","role/task-mode/breakpoint ごとの適応型画面プロファイル","open-world 表示パターン台帳と responsive 変換時の業務能力維持","ラベル・線/余白・アイコン・画像・整列/反復の要素別意味契約","表示加工、実利用指標、manual/current-machine/future-machine gate の境界"]
scope_out: ["部品の実装契約と design token の値","公開 API・DB schema・認可判定","未実装の profile/pattern validator と画面別 critical parity E2E"]
acceptance: ["新画面または情報設計変更に情報設計シートと確定した画面プロファイルがある","可視ラベル・意味構造・accessible name が要素種別に応じて維持される","顕著度が semantic token の段だけで構成される","breakpoint 変換後も比較・ソート・選択・一括操作・完全値への到達を失わない","表示加工がサーバ集計値の再計算を含まず正確値へ到達できる","代表タスクの実測と manual/current-machine gate の証跡が分離される"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-information-design-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7d8607f94a958c44e0ecf045260c15ad665c6ee32b0ead021e13a5cb7621aae6","evaluator":"30思考法の独立SubAgentレビュー (9+9+12) + deterministic validators","evidence_ref":"eval-log/elegant-review/harness-hub-information-design-20260811/verdict.json"}
source_lineage: {"imported_at":"2026-08-11T05:56:54Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "UI 基盤追補が扱わない情報設計層を、画面横断の規範契約として定義する製品仕様追補"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-information-design-addendum.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-11T07:06:00Z","missing_sections":[],"status":"complete"}
---

# Harness Hub 画面情報設計追補

## 目的と成功状態

利用者 (非エンジニアの業務担当者) が画面をじっと読まずに「今どうなっているか」と「次に何をするか」を判別できる状態を成功とする。既存の [UI 基盤追補](harness-hub-ui-foundation-addendum.md) が *どの部品を使うか* (shell / surface / 状態表現 / 品質ゲート) を固定するのに対し、本追補は *その部品へ何を載せ、何を削り、何を強調するか* という情報設計の工程・成果物・受入を固定する。

不足していた層は次で観測された。画面ごとの表示項目が「保存値をそのまま並べる」形で決まり、優先順位・表示加工・一覧形式の選定根拠が文書に残らない。結果として部品契約は満たすが読み取りに時間がかかる画面が成立してしまう。

## スコープ

- In: S01〜S18 と共通シェルの情報設計 (利用文脈の明示、情報の取捨、要素別意味判定、グループ化、情報顕著度、表示加工、pattern 選定、意味装飾)、新画面および情報設計を変える改修の成果物とレビュー基準。
- Out: 部品の実装契約と品質ゲート (UI 基盤追補)、公開 API / DTO / DB schema、認可判定、design token の値そのもの、ブランド表現。
- owner: 画面を実装する feature。共通規範の owner は本追補。
- consumer: `apps/hub` の各画面と `packages/ui` の surface 部品。

## 用語と主体

| Term/Actor | Definition/Responsibility |
|---|---|
| 情報設計シート | 1 画面 1 枚。利用文脈・表示項目・グループ・優先度・加工・一覧形式の選定根拠を記録する設計成果物 |
| 情報顕著度 | `lead / context / metadata` の 3 段。構築 phase の P0〜P5、レスポンシブパターンの P1〜P10 と衝突させない画面内の強弱語彙 |
| 表示加工 | 保存値を利用文脈で読める形へ整形する表示層の変換 (絶対日時 + 補助的な相対表現、enum → 状態語彙) |
| 意味装飾 | 「押せる / 選択中 / 重要 / 危険 / 隠れた機能がある」を伝える目的の装飾 |
| 表示パターン台帳 | タスクへの適合能力・a11y 契約・breakpoint 変換を持つ拡張可能な registry。固定候補集合ではない |
| 画面プロファイル | `role × task-mode × breakpoint` ごとの `intent / density / pattern` 宣言。同じ画面でも利用状況により変わる |
| first viewport | 各 breakpoint の初期描画でスクロールせずに見える領域 |

## ユースケースとユーザーフロー

1. 実装者は画面着手時に、誰が・どこで・どの端末を使い・何を完了したいかを書く。
2. 使える項目と操作を列挙し、必須・補助・不要を利用タスクと権限から判定する。
3. 各要素について可視ラベル、区切り、アイコン、画像が意味理解に必要かを要素別意味契約で判定する。全要素を一律に外す操作は禁止する。
4. 項目を利用者がひとまとまりと理解できる単位へグループ化する。
5. グループ間とグループ内に `lead / context / metadata` を与える。
6. 各項目の表示加工を決める。日時・識別子は可視の完全値を保ち、相対表現や短縮を補助に限定する。
7. 表示パターン台帳からタスクに適合する候補を選び、role / task-mode / breakpoint ごとの選定根拠を残す。
8. DOM の読み順と一致する順で配置する。
9. 操作・リンク・メニューを足し、タスク完遂と権限境界を確認する。
10. 意味を伝える装飾を当て、視覚・キーボード・スクリーンリーダー・タッチで再検証する。

## 機能要件

- `FR-IDS-001`: 画面設計は「利用文脈 → 取捨 → 要素別意味判定 → グループ化 → 顕著度 → 表示加工 → パターン選定 → 配置 → 機能追加 → 意味装飾」の 10 工程で行う。表・カード・フォーム等の確定を最初の工程にしない。設計と見た目を別工程として分割しない。
- `FR-IDS-002`: 表示形式は open-world な表示パターン台帳から、現在のタスクに必要な能力を持つ候補だけを比較して選ぶ。初期台帳は table / card-collection / list / grid / form / wizard / timeline-stepper / board / chart+table / tree / master-detail を含むが、候補をこの集合に限定しない。`DataTable` を無選定の既定にしない。比較・ソート・多列突合・一括操作が主タスクなら table を有力候補に含める。
- `FR-IDS-003`: ラベル、罫線・区切り、余白、アイコン、画像、整列・反復は要素別意味契約に従って採否を決める。全ラベル・全罫線等をいったん外す一括操作は禁止する。見出し階層、フォームの可視ラベル、表の `caption` / `th scope`、状態・金額・日時・PII・略語など誤読リスクがある値の手掛かりは削減対象にしない。
- `FR-IDS-004`: 可視ラベルは、入力・選択・破壊操作、初見で値の意味が決まらない項目、同形値が複数ある項目に必須とする。周辺の見出し・単位・既知の形式から一意に理解できる読み取り専用値だけ省略を検討できるが、その場合も `dl` / `dt` / `dd`、表見出し等の意味構造と情報設計シート上の根拠を必須とする。操作部品は可視ラベルの有無にかかわらず accessible name を持つ。placeholder、`title`、アイコンだけをラベルの代用にしない。
- `FR-IDS-005`: 項目は利用者がひとまとまりと理解できる単位へグループ化し、グループ間とグループ内に情報顕著度 `lead / context / metadata` を与える。グループ数や各段の件数は固定上限にせず、主要タスクの見つけやすさ・比較速度・誤読率を根拠に調整する。複数の `lead` も、並列する主要判断を利用テストで説明できる場合は許可する。
- `FR-IDS-006`: 情報顕著度は design token の段で表現する。`lead` は強い見出し/数値 token、`context` は標準本文 token、`metadata` は補助文字 token を使い、具体的 token は UI 基盤の semantic mapping を参照する。任意 px と任意色を新設しない。顕著度は見出し level や操作の primary/danger variant を決める語彙ではない。
- `FR-IDS-007`: 顕著度の高い情報を自然な読み順の早い位置へ置き、DOM 順と視覚順序を一致させる。CSS の `order` や絶対配置で読み順を入れ替えない。主要操作・回復操作は、対応する対象と状態から探索負荷なく到達できる位置に置く。first viewport への固定個数は要求せず、タスク時間と見落としの観測で判断する。
- `FR-IDS-008`: 保存値を利用文脈で読める形へ加工する。加工は表示層に閉じ、値そのものの導出はサーバ集計値だけを使う。日時は timezone を伴う絶対日時を可視表示し、相対時間は補助として併記する。識別子の短縮表示には、可視の完全値またはキーボード/タッチで到達できる disclosure と copy 手段を用意し、`title` 属性だけに完全値を置かない。
- `FR-IDS-009`: 装飾は「押せる / 選択中 / 重要 / 危険 / 隠れた機能がある / 同じ種類が反復している / 別グループへ切り替わった」を伝える目的で使う。余白は弱い区切り、線・surface は密な比較領域や階層境界、アイコンは認識補助、画像は対象の識別・証拠・内容理解に寄与する場合に積極採用する。意味を説明できない縞模様、影、罫線、画像を増やさない。状態の色は状態語彙辞書 (`docs/frontend-spec.md` §2.4) を唯一の写像点とする。
- `FR-IDS-010`: 状態・系列・情報顕著度を色だけで区別しない。形、ラベル、位置、文字サイズのいずれかを併記する。
- `FR-IDS-011`: 画面プロファイルを画面 ID 単位の二値へ固定しない。`role × task-mode × breakpoint` ごとに `intent (scan / compare / compose / monitor)`, `density (comfortable / balanced / compact)`, `pattern` を宣言する。同じ業務能力は breakpoint をまたいで保持し、表をカードへ変換しても比較・選択・一括操作・完全値への到達手段を失わない。プロファイル割当の唯一の正本は `docs/screen-inventory.md` とし、他文書は値を複製しない。
- `FR-IDS-012`: 新画面、および情報設計を変える改修は、情報設計シートを `docs/features/<feature>/information-design/<screen-id>.md` へ置き、`role / task-mode / breakpoint` ごとの画面プロファイルを `docs/screen-inventory.md` へ記録する。実装と同一 PR で更新する。
- `FR-IDS-013`: 罫線・surface の境界は 3:1 以上のコントラストが必要な操作部品と、装飾的なグループ境界を区別する。余白だけでグループが誤読される高密度領域は線・見出し・surface を併用し、ズーム/折返しでも所属が変わって見えないことを確認する。
- `FR-IDS-014`: アイコン単独操作は、反復頻度が高く意味が広く定着し、かつ誤操作時の危険が低い場合に限定する。常に accessible name と 44px (compact は 36px) 以上の操作域を持たせ、初見・破壊・送信操作では可視テキストを併記する。tooltip は補助であり唯一の説明にしない。
- `FR-IDS-015`: 内容画像は用途に応じた `alt`、説明が本文にある場合は空 `alt`、複雑図は同等情報の本文/表を持つ。画像内文字を唯一の情報源にせず、固定 width/height、responsive crop の焦点、dark theme、拡大時の判読性を確認する。
- `FR-IDS-016`: 整列・近接・反復を同一種の情報と操作の予測可能性に使う。同じ意味の要素は位置・語彙・token・操作順を反復し、見た目だけ同じで意味が異なる部品、または意味が同じなのに位置が毎回変わる部品を作らない。

## 非機能要件

- Usability: 主要タスクの開始点・現在状態・次の操作を利用者が探索できる。固定個数や固定グループ数ではなく、タスク完了率・完了時間・誤操作/後戻り・最初の選択の正答率を feature ごとの baseline と比較する。
- Accessibility: 削減は視覚表現にだけ適用する。強弱表現後も通常文字 4.5:1、操作部品の輪郭 3:1、タップ域 44px (compact は 36px 以上) を維持する。
- Consistency: 同じ意味は全画面で同じ語彙・状態 token・アイコンの意味へ写す。顕著度は `role / task-mode / breakpoint` に応じて変えてよいが、変更根拠を profile に残し、見た目が同じで意味が違う表現を作らない。
- Performance: 情報設計を理由に client component や追加通信を増やさない。加工は server component で完了できる形を既定とする。
- Maintainability: 情報設計シートは 1 画面 1 枚に保ち、実装が正、シートが従にならないよう同一 PR で更新する。

## UI・状態遷移

情報の役割から表現・token への写像を次に固定する。

| 情報の役割 | 表現 | 顕著度と token |
|---|---|---|
| 画面の主対象 (識別子・タイトル) | 可視見出し | `lead`: 強い見出し token + `text`。`title` 属性に依存しない |
| 状態・判定 | Badge (色 + ラベル) | 状態語彙辞書の token。色単独にしない |
| 主要数値 (件数・工数・削減) | 数値と可視の単位/定義を近接配置 | 数値 `lead`、単位 `metadata`。複数 KPI が並列なら複数 `lead` を許す |
| 補助属性 (部門・申請者・更新日時) | 意味が保てる範囲で近接・整列 | `metadata`。絶対日時を可視、相対時間は補助 |
| 主操作 | `ActionLink` / Button。タスクごとに明確化 | action の `primary` variant。情報顕著度とは別軸 |
| 破壊操作 | `ConfirmDialog` (`reversible` 必須) | `danger` |
| 隠れた機能 | disclosure / メニュー。存在を可視ラベルまたは定着した記号で示す | accessible name + focus-visible + 必要な輪郭 |

表示パターン台帳の中央 SSOT は本節とし、初期エントリを次に定める。これは閉じた候補集合ではない。新規パターンはまず情報設計シートで候補化し、`id / task capabilities / weak points / a11y contract / responsive transform / owner / evidence / review trigger` を揃える。共通規範 owner が既存 pattern との重複を検査し、意味が同じなら variant へ統合し、異なる能力を持つ場合だけ本節へ行を追加する。本節へ昇格するまで他画面の再利用可能 pattern として扱わない。複数 pattern の複合は、各構成要素と保持する業務能力を profile に列挙する。

| pattern id | 得意な task capability | 最低限の a11y / fallback 契約 |
|---|---|---|
| `table` | 多列比較、ソート、絞込、一括選択 | `caption`, `th scope`, `aria-sort`、狭幅でも完全値と操作へ到達 |
| `card-collection` | 異種属性の走査、対象単位の操作、画像併載 | 見出しを持つ article/list semantics、カード全体リンクの重複名と nested interactive の競合を回避 |
| `list` | 順序、履歴、短い反復項目 | `ul/ol` または同等 semantics、現在位置と未読状態を色以外でも表示 |
| `grid` | 画像・図・同型対象の視覚走査 | DOM 読み順、zoom 後の並び、画像 alt、キーボード移動を維持 |
| `form` | 単票入力・設定編集 | 可視 label、fieldset/legend、説明・error 関連付け、送信結果 focus |
| `wizard` | 依存する複数段階の入力 | 現在 step、全体進捗、戻る/再開、各 step の error summary |
| `timeline-stepper` | 時系列・進捗・非同期状態 | 現在/完了/失敗を語句で表し、時間/順序を DOM でも保つ |
| `board` | 状態別の作業分布・遷移 | DnD 以外の操作、列見出し/件数、狭幅で選択 stage と全体位置を保持 |
| `chart+table` | 傾向・比較・分布 | `role=img` の説明に加え同じ値の表を切替/併記。色単独にしない |
| `tree` | 階層の探索・展開 | `tree` を採る場合は完全な keyboard contract、単純な階層は nested list を優先 |
| `master-detail` | 一覧を保った対象切替と詳細確認 | 選択状態、focus 移動、URL/履歴、狭幅で一覧へ戻る導線を保持 |

空状態・読込中・権限不足・取得失敗も情報設計の対象とする。EmptyState の「次の一手」と ErrorState の回復導線は `lead` として、原因の生値より先に理解できる位置へ置く。

## ビジネスルールと検証

- `BR-IDS-001`: 情報設計シートを伴わない新画面を受け入れない。
- `BR-IDS-002`: ラベルの全外しは禁止する。可視ラベルの省略は `FR-IDS-004` の限定条件・accessible name・情報設計シートの根拠がすべて揃う場合だけ許可する。
- `BR-IDS-003`: 表示加工は表示層に閉じる。金額・削減額・KPI をクライアントで再計算しない (SEC5 / qa-022)。
- `BR-IDS-004`: ラベル、線/余白、アイコン、画像、整列/反復を足す・省くときは、伝える意味と代替手段を情報設計シートに書く。意味を説明できない要素は入れず、必要な手掛かりは「装飾だから」と削らない。
- `BR-IDS-005`: profile 変換で業務能力を落とさない。狭幅で列を畳む場合も、比較・選択・ソート・一括操作・完全値確認を別の到達可能な表現で維持する。role が変わる場合だけ認可に従い候補から外す。
- `BR-IDS-006`: 優先度付けを権限判定の代わりに使わない。権限外の項目は優先度を下げるのではなく表示候補から外す (deny-by-default)。

## API契約

N/A: 公開 endpoint、request / response schema、status code を変更しないため。表示加工は取得済み DTO の描画時変換に閉じる。

## データモデル

N/A: 永続 Entity、field、relation、index、migration を変更しない。情報顕著度と適応型画面プロファイルは描画時の設計属性である。

## 認証・認可

- Authorization: 既存の deny-by-default を維持し、UI は判定を複製しない。情報設計は「表示候補に入るか」の後段で優先度を決める。
- PII: salary など権限限定の値は `intent=compare / density=compact` の profile であっても既定マスクと明示 toggle を維持し、強弱表現で目立たせない (SEC4)。

## エラー・例外・回復

- 失敗表示は行き止まりにしない。ErrorState / ForbiddenState / EmptyState はいずれも回復導線を `lead` として持つ。
- 403 を再認証導線へ変換しない規則は UI 基盤追補のまま維持する。
- 情報設計の不備 (主要タスクの開始点不明、色単独の状態表現、可視ラベル/accessible name 欠落) はレビューで差し戻す。実装後の装飾追加で解消したとみなさない。

## イベント・非同期処理

N/A: queue、event producer / consumer、delivery、ordering、DLQ を追加しない。非同期の受付表示は既存の「受付番号 + 生成中チップ + 完了通知」パターン (qa-021) を `lead / context` へ写像するだけである。

## 可観測性

- PR テンプレートの情報設計チェックリスト (`docs/frontend-information-design-guide.md` §7) で工程順序と削減の妥当性を確認する。
- catalog fixture へ、情報密度の代表例 (card collection・compact table・form・EmptyState) を light / dark で登録し、強弱表現の退行を VRT で検出する。
- 既存の contrast token test とタップ域検査を強弱表現の下限として流用する。
- feature は実装前 baseline と実装後を同じ代表タスクで比較し、タスク完了率、完了時間、誤操作/後戻り、最初の選択の正答率を記録する。製品横断の固定目標値は置かず、利用頻度・危険度に応じた target を情報設計シートへ宣言する。
- 現行の machine gate は、既存 UI 基盤で実装済みの unit/axe、token 検査、responsive fixture の overflow・tap target・column switch を再利用する。catalog VRT は対応 workflow を実行した変更だけの見た目の回帰証跡であり、「意味が伝わる」ことや各画面の業務能力を自動証明しない。
- 現行の manual gate はパターン選定根拠、グループと顕著度、ラベル/線/アイコン/画像の意味、主要タスクの理解、画像 alt の妥当性、可視ラベルと意味構造、breakpoint 間の critical field/action と業務能力 parity を対象とする。
- 将来の machine gate は profile schema と pattern registry の validator、inventory 未登録検出、画面別 critical-field/action parity の E2E を候補とする。実装されるまでは予定を PASS 証跡として扱わない。

## 互換性・移行・リリース

- 既存画面を一括改修しない。改修時に対象画面の情報設計シートを起こし、その画面だけを本追補へ寄せる。
- `docs/screen-inventory.md` の画面プロファイル表は割当の唯一の正本である。未記入を暗黙の既定値へ落とさず、実装前に role / task-mode / breakpoint の行を追加する。
- 問題時は情報設計シートと実装を同一変更単位で revert し、シートだけを更新して実画面との乖離を残さない。

## テストと受入条件

- [ ] `AC-IDS-001`: 新画面 PR に情報設計シートがあり、利用文脈・グループ・顕著度・加工・profile・表示パターンの選定根拠が埋まっている。
- [ ] `AC-IDS-002`: 可視ラベルが必要な control/値に残り、省略を選んだ読み取り専用値は根拠と意味構造を持ち、操作部品は accessible name を持つことを review + axe / unit test で確認できる。
- [ ] `AC-IDS-003`: 強弱表現が token の段だけで構成され、任意 px / 任意色が増えていない。
- [ ] `AC-IDS-004`: 各 role / task-mode / breakpoint で主要タスクの開始・完了・回復操作へ到達でき、critical field/action parity を確認できる。
- [ ] `AC-IDS-005`: 状態・系列が色単独で区別されていない。
- [ ] `AC-IDS-006`: breakpoint の pattern 変換後も比較・ソート・選択・一括操作・完全値への到達手段が失われていない。
- [ ] `AC-IDS-007`: 表示加工がサーバ集計値の再計算を含まず、日時・識別子の完全値を `title` だけへ隠していない。
- [ ] `AC-IDS-008`: `docs/screen-inventory.md` に当該画面の role / task-mode / breakpoint 別 profile が記録されている。
- [ ] `AC-IDS-009`: ラベル、線/余白、アイコン、画像、整列/反復の採否と意味が要素別契約に沿い、a11y の代替表現がある。
- [ ] `AC-IDS-010`: baseline と同じ代表タスクで成功指標を記録し、manual gate と machine gate の結果を混同していない。

## 未決事項

`packages/ui` の `typographyTokens` は `fontWeightNormal` (400) と `fontWeightBold` (700) の 2 段しかない。`lead / context / metadata` の差は既存の semantic size / color / spacing の組合せで表し、中間段 (600) を前提にしない。中間段を追加するかは `packages/ui` 側の token 変更として別途判断する。本追補の受入は 2 段のままで成立する。

## 正本と証跡

- 上位規範: [UI 基盤追補](harness-hub-ui-foundation-addendum.md)、[system-spec/ui-ux.md](../system-spec/ui-ux.md) qa-226、[system-spec/frontend.md](../system-spec/frontend.md) qa-007
- 実装ガイド: [docs/frontend-information-design-guide.md](../docs/frontend-information-design-guide.md)
- 画面台帳: [docs/screen-inventory.md](../docs/screen-inventory.md)
- 詳細正本: [docs/frontend-spec.md](../docs/frontend-spec.md) §2.4 / §3.3、[docs/frontend-responsive-mobile-spec.md](../docs/frontend-responsive-mobile-spec.md) §6.3
- doctrine anchor: Apple Human Interface Guidelines (system-spec/ui-ux.md の presentation authority)
