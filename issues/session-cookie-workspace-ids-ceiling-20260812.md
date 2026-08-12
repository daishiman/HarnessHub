---
graph_node_id: "issue-session-cookie-workspace-ids-ceiling-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "backend"
tags: ["authentication","scalability"]
priority: "low"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "所属が 90 件を超えると、名前を落としてもサインインできない"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T06:47:29.517989Z"
status: "done"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/lib/auth/session.ts","apps/hub/src/lib/auth/jwt.ts","apps/hub/src/lib/auth/config.ts"]
purpose: "claims 焼き込み方式の cookie サイズ上限を記録し、workspace_ids を安易に削る誤りを防ぐ。"
goal: "所属数がいくつでもサインインでき、所属どおりの場所に入れる状態にする。"
scope_in: ["上限の記録と実測値の保存","方式変更の選択肢の整理 (都度引く / session を stateful にする)","想定利用規模が判明した時点での優先度見直し"]
scope_out: ["workspace_names のサイズガード (2026-08-12 に実装済み)","workspace_ids をサイズを理由に削る実装 (到達可否が黙って減るため不正解)"]
acceptance: ["所属 100 件以上の利用者がサインインでき、cookie が保存される","所属どおりの Workspace に到達でき、権限が黙って減らない","workspace_ids を削らずに達成されている"]
architecture_refs: ["arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/session-cookie-workspace-ids-ceiling-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"c869a9df06a610b9a18fb3a548dc1b1e55b8bdcca7dfd61629f8d02caef5a7d0","evaluator":"2026-08-12 の cookie サイズガード実装時の実測","evidence_ref":"issues/session-cookie-workspace-ids-ceiling-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"apps/hub/src/lib/auth/session.ts","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "認証基盤の構造的な制約であり、実装単位で追跡すべき課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/session-cookie-workspace-ids-ceiling-20260812.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-alyy","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-12T05:41:08Z","evidence_refs":["issues/session-cookie-workspace-ids-ceiling-20260812.md","apps/hub/tests/auth-tenancy/session-cookie-ceiling.test.ts"],"policy":"manual","reconciled_at":"2026-08-12T06:33:00Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 所属が 90 件を超えると、名前を落としてもサインインできない

## 概要

session は署名付き JWT を cookie に載せる方式で、claims に所属 Workspace の識別子一覧
(`workspace_ids`) を焼き込んでいる。**この一覧は所属数に比例して伸びるが、サイズを理由に
削ることができない。** 所属 90 件前後で cookie が 4096 バイトの上限を超え、ブラウザが
エラーを返さずに cookie を捨てるため、サインインしてもログイン画面に戻され続ける。

2026-08-12 に入れた `workspace_names` のサイズガード (`apps/hub/src/lib/auth/session.ts`)
は、**表示用の名前だけを落とす**もので、この上限は塞いでいない。ガードが効いた後に残る
`workspace_ids` だけで予算を超えるのが、この課題が扱う範囲。

## 背景と問題

### 実測値 (2026-08-12 に手元で計測)

| 項目 | 値 |
|---|---|
| cookie 1 個の上限 | 4096 バイト |
| cookie 属性 (`serializeSessionCookie('')`) | 82 文字 |
| JWT の envelope (header + `.` 2 個 + HS256 署名) | 81 文字 |
| 安全余白 | 256 バイト |
| **claims JSON に使える予算** | **2757 バイト** |
| `workspace_ids` 1 件あたり | 29 バイト (ULID 26 文字 + 引用符 + 区切り) |

`workspace_ids` だけの claims のサイズ:

| 所属数 | claims JSON | 予算 2757 に対して |
|---|---|---|
| 80 | 2434 バイト | 収まる |
| **90 前後** | **約 2724 バイト** | **境界** |
| 100 | 3014 バイト | 超過 |
| 120 | 3594 バイト | 超過 |
| 140 | 4174 バイト | 超過 |

### なぜ `workspace_names` と同じ手が使えないのか

**ここがこの課題の要点で、記録に残したい結論そのもの。**

`workspace_names` は表示のためだけの情報なので、落としても到達できる範囲は 1 つも変わらない
(画面は識別子の表示に戻るだけ)。だから「入り切らないなら捨てる」でよかった。

`workspace_ids` は違う。**これは到達可否そのもの**で、削った瞬間「入れるはずの場所に入れない」
状態になる。しかも利用者にはエラーが出ず、黙って権限が減ったように見える。今回塞いだ
「サインインできない」より診断が難しい症状になるため、**サイズを理由に削ってよい claim ではない。**

将来サイズ問題に当たった人が、2026-08-12 のガードを見て「名前と同じように削ればいい」と
考えるのが最もありそうな誤りである。**同じ形を `workspace_ids` に適用してはいけない。**

## 期待する挙動

所属数がいくつでも、サインインできて所属どおりの場所に入れる。

これは**方式を変えないと達成できない。** claims 焼き込みという方式の構造的な上限であり、
閾値や余白の調整では動かない。取り得る方向は 2 つ。

1. **所属一覧を cookie から外し、必要なときに引く。** 認可判定のたびに所属を読み直す形にする。
   cookie は太らなくなるが、いま DB 結線を持たない描画経路にも往復が入るため、画面の描画が
   DB の可用性に依存するようになる。2026-08-12 に `workspace_names` の実装方式を決めた際、
   この理由で採らなかった経緯がある (判断自体はその時点では妥当)。
2. **session を stateful にする。** cookie には識別子だけを載せ、claims の実体は
   サーバ側 (KV など) に置く。cookie サイズの問題は根本から消えるが、session の失効・
   同期・保存先の可用性という別の設計が必要になる。

どちらを採るかはこの課題では決めない。**現に上限があること**と、**安易な削減が不正解であること**
を記録するのが目的。

## 再現手順またはユースケース

所属 Workspace を 100 件持つ利用者でサインインする。`Set-Cookie` は返るが保存されず、
次の要求で未サインインとしてサインイン画面へ戻る。画面にもログにも理由は出ない。

手元で `buildSessionClaims` に 100 件の所属を渡すと、claims JSON が 3014 バイトとなり
予算 2757 を超えることを確認できる。

## 影響と優先度

**優先度 low。**

いまの想定利用規模で 90 所属が現実的かどうかを判断する材料が無い。だが、判断材料が無いことは
記録しない理由にならない。踏んだときの症状が「エラー無しで締め出される」であり、
所属の多い利用者だけが踏むため、開発用アカウント (所属 1〜2 件) では絶対に再現しない。
先に記録が無ければ、実際に起きたときに原因へ辿り着けない種類の欠陥である。

想定規模が判明した時点で優先度を見直すこと。

## スコープ

- **含む**: 上限の記録、方式変更の選択肢の整理、想定規模が判明した時点での優先度見直し。
- **含まない**: `workspace_names` のサイズガード (2026-08-12 に実装済み)。
  `workspace_ids` をサイズを理由に削る実装 (上記のとおり不正解)。

## 関連グラフ

- `apps/hub/src/lib/auth/session.ts` (`COOKIE_BYTE_LIMIT` / `CLAIMS_JSON_BUDGET_BYTES` /
  `buildSessionClaims` のガード)
- `apps/hub/src/lib/auth/jwt.ts` (`JWT_ENVELOPE_CHARS`)
- `apps/hub/src/lib/auth/config.ts` (`SESSION_COOKIE_NAME` / `serializeSessionCookie`)
- `apps/hub/src/__tests__/ui-shell/display-name.test.ts` (UIS-SZ-001〜005)
- 関連課題: `HarnessHub-62ah` (識別子ではなく人が読める表示名を出す)

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 に `buildSessionClaims` へ所属 80/100/120/140 件を渡してプローブし、
claims JSON のバイト数を実測した。`serializeSessionCookie('')` と `JWT_ENVELOPE_CHARS` の
実長も同じ実行で読み出している。リポジトリ全体を grep し、`workspace_ids` の件数に
上限を設ける実装・検査が 1 件も無いことを確認した。
