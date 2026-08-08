# 実装要件定義書: feat-build-identity-deploy-freshness (稼働ビルドの同一性確認と deploy 反映鮮度の検出)

- 生成: 2026-08-07T12:45:00Z / snapshot: `sha256:43e0f4ac2ea27edfa47d9d9332aea09e7d85e4c429404c9d1485a733f3926403` (graph_revision 1238)
- handoff target: task-graph / package: `feature-package/feat-build-identity-deploy-freshness` (generation `9a7908d1a6d1…`)
- snapshot_digest の算出規則: `sha256(canonical JSON of snapshot_inputs; sort_keys=true, separators=(',',':'), UTF-8)`。入力は handoff package の `snapshot_inputs` に全件記載してあり、同じ規則で再計算できる。

## 要件の出所 (lineage)

- 確定仕様: `system-spec/spec-state.json` の qa-170〜qa-199 (source_digest `e1ecf64f6bd0dfc6…`) — 本番で動いているビルドが repository のどの commit に対応するかを知る手段が無く、「コードは直っている」と「本番が直っている」を区別できない観測不能状態を断つ。
- 仕様追補文書: `specs/harness-hub-post-signin-landing-observability-addendum.md` (`spec-post-signin-landing-observability`)
- architecture: `architecture/harness-hub-infrastructure.md` (`arch-harness-hub-infrastructure`・source_digest `ab473653…`・readiness complete)、`architecture/harness-hub-testing-qa.md` (`arch-harness-hub-testing-qa`・source_digest `585614ac…`・readiness complete)
- feature: `features/feat-build-identity-deploy-freshness.md` (confirmed/pass・plan evaluator C1..C4 PASS)

> 本 run 開始時、上記 architecture 2 node は本セッションの spec 追補 (qa-187 / qa-190) により recorded digest が stale になっており、`validate-source-digest.py` が exit 2 で停止した。wrapper は参照型のため内容を複製せず、現行の確定章から正本節 sha256・取込日時・node の `source_lineage` を再取込して解消した (`checked=16` / `registered_mismatch=[]` / exit 0)。

## 目的 (なぜ作るか)

本番で動いているビルドが repository のどの commit に対応するかを知る手段が無いため、『コードは直っている』と『本番が直っている』を区別できず、1 回の GET で決まる事実の確定に 10 ラウンド以上を要した。この観測不能状態を解消する。

利用者の当初の困りごと (サインイン後に業務画面へ到達しない) の確定原因は、着地先を `/sheets` へ直した commit `150a0f14` (2026-08-03) が本番の稼働ビルドに含まれていなかったことであり、是正自体は再デプロイのみである。本 feature はその**是正ではなく、同じ切り分けに再び 10 ラウンドを要さないための観測基盤**を作る。

## 完了状態 (goal)

稼働中の成果物から対応 commit を認証なしで確認でき、稼働ビルドが既定 branch の HEAD より古い状態が続くことを CI が検出する状態にする。

## 実装要件 (要約)

1. **commit 識別子の埋込 (V6)**: 稼働成果物へ commit 識別子を埋め込み、CI の build 時に自動付与する。手動更新に依存しない。
2. **認証なしの読出経路 (V6)**: 埋め込んだ識別子を認証なしで読み出せる経路を用意する。認証が壊れている疑いがあるときに認証を要する経路でしか素性を確認できなければ、本件と同じ袋小路に入るため。
3. **露出範囲の限定**: 露出してよいのは commit 識別子までとし、内部 path・secret・個人データを混ぜない。
4. **鮮度検出 (V7)**: 稼働ビルドの commit と既定 branch HEAD の乖離が**継続していること**を検出する。deploy 直後の一時的な乖離を落とすと運用が回らないため、「古いこと」ではなく「古い状態が続いていること」を判定条件にする。
5. **しきい値と通知先の決定**: 乖離検出のしきい値と通知先を決める。本件は 2026-08-03 の修正が 2026-08-07 時点で未反映 = 4 日間継続していた実測がある。
6. **発火性の固定**: しきい値を超えた状態を再現する fixture で、検査が実際に落ちることを test で固定する。検査が存在するだけで発火しない状態を許さない。
7. **実行時環境値の解決規律との整合**: 確定章 qa-187 は、env 由来の値を module 最上位で保持すると isolate 再利用により stale が持続し得ることを公式記述から確定している。本 feature の読出経路は request ごとの解決に従う。

## スコープ外 (変更禁止)

- deploy そのものの実行 (運用操作であり本 feature の成果物ではない)
- deploy pipeline の構成変更 (GitHub Actions 経由という既存経路を維持する)
- 認証を要する管理画面での表示 (認証なしで読めることが要件のため)

## 実行単位

P01..P13 exact-13 package (`.dev-graph/plans/generations/feature-package-feat-build-identity-deploy-freshness/9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9`) の task projections。依存は P01 → P13 の直列前方依存である。

| phase | node | 入口 (projection) | 内容 |
|---|---|---|---|
| P01 | `SYS-BUILD-IDENTITY-P01` | `tasks/feat-build-identity-deploy-freshness/sys-build-identity-p01.md` | 要件ベースライン確定 — V6/V7 の要件確定 |
| P02 | `SYS-BUILD-IDENTITY-P02` | `…/sys-build-identity-p02.md` | アーキテクチャ決定 — 埋込経路・公開読出経路・鮮度判定の所在 |
| P03 | `SYS-BUILD-IDENTITY-P03` | `…/sys-build-identity-p03.md` | 設計レビュー — 情報露出・deploy 直後の誤検出・CI 依存の 3 リスク検証 |
| P04 | `SYS-BUILD-IDENTITY-P04` | `…/sys-build-identity-p04.md` | テスト設計 — 埋込・公開読出・鮮度検出の実行可能テスト定義 |
| P05 | `SYS-BUILD-IDENTITY-P05` | `…/sys-build-identity-p05.md` | 実装 — build 時の埋込・認証なし読出経路・鮮度検査 script |
| P06 | `SYS-BUILD-IDENTITY-P06` | `…/sys-build-identity-p06.md` | テスト実行 — P04 のテスト ID 実行と結果証跡の収集 |
| P07 | `SYS-BUILD-IDENTITY-P07` | `…/sys-build-identity-p07.md` | 受入判定 — acceptance 5 件の実測証跡による判定 |
| P08 | `SYS-BUILD-IDENTITY-P08` | `…/sys-build-identity-p08.md` | リファクタリングと移行 — しきい値の単一定数化と既存 check 系列への整列 |
| P09 | `SYS-BUILD-IDENTITY-P09` | `…/sys-build-identity-p09.md` | 品質保証 — 露出範囲の非退行と検査の発火性の固定 |
| P10 | `SYS-BUILD-IDENTITY-P10` | `…/sys-build-identity-p10.md` | 最終レビュー — 実行済み証跡のみによるリリース可否判定 |
| P11 | `SYS-BUILD-IDENTITY-P11` | `…/sys-build-identity-p11.md` | 証跡固定 — source digest と再実行コマンドの保存 |
| P12 | `SYS-BUILD-IDENTITY-P12` | `…/sys-build-identity-p12.md` | ドキュメントと運用 — 確認手順と鮮度警告時の対応手順 |
| P13 | `SYS-BUILD-IDENTITY-P13` | `…/sys-build-identity-p13.md` | リリース判定と確定仕様・アーキテクチャへの書き戻し |

## 受入 (feature acceptance)

- 稼働中の成果物から、それが repository のどの commit に対応するかを認証なしで確認できる
- commit 識別子の埋め込みが CI の build 時に自動で行われ、手動更新に依存しない
- 稼働ビルドが既定 branch の HEAD より古い状態が続いていることを検出できる
- 検出のしきい値を超えた状態を再現する fixture で、検査が実際に落ちることが test で固定されている
- commit 識別子の露出が、内部 path・secret・個人データを含まない

## 品質ゲート

四 gate を graph_revision 1238 の同一 snapshot で PASS 済み。

| gate | 実行 | 結果 |
|---|---|---|
| C11 graph schema | `validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .` | exit 0 / `valid=true` / `violations=[]` / `implementation_readiness=complete` |
| C02 saved state | closure 16 node の保存値照合 | 全 node `confirmed` / `pass` / `complete` / `missing_sections=[]` |
| source digest | `validate-source-digest.py --registered <closure 16 node>` | exit 0 / `checked=16` / `registered_mismatch=[]` |
| system plan | `validate-system-plan.py --repo-root . --feature-package feature-package/feat-build-identity-deploy-freshness` | exit 0 / `status=pass` / `phase_refs=P01..P13` / `contract_version=1.3.0` |

`--registered` には feature・architecture 2 件・P01..P13 の lineage closure 16 node を全件指定した (task 13 件だけの検査は closure 不足として拒否される)。本 skill は実装コードを生成しない (生成 code file 0 件)。

## 未解消の逸脱 (handoff 先へ引き継ぐ)

1. **`source_lineage.confirmed=false` (medium)** — package の `workstream-inventory.json` は `confirmed=false` のまま昇格している。promotion gate 7 項目に lineage confirmation は含まれないため package は有効だが、各 task spec の Handoff が定める「Ready when: confirmed かつ evaluation pass」は未充足である。**promotion が成立していることと P01 に着手してよいことは別**であり、着手前に上流の完成度評価を PASS へ到達させるか、利用者の明示的な緩和判断を要する。
2. **完成度 evaluator の総合 FAIL (medium)** — system-spec の完成度 evaluator は本セッション時点で総合 FAIL である。利用者は appr-039 で「完成度 evaluator の総合 PASS を以降の verb の前提とする」点**のみ**を緩和し、他の完了条件 (確定章の登録・source_digest 検証・evidence_ref 検証・各 verb 固有の完了条件) は緩めないと明示した。本 handoff はその判断の下で emit している。readiness matrix の `evaluation_status=pass` は総合判定ではなく、各 node 登録時に evidence 付きで確定した node 単位の値である。
3. **feature artifact frontmatter の drift (low)** — `register-package` / promote が graph node だけを更新するため、`features/feat-build-identity-deploy-freshness.md` の frontmatter が `draft/pending/incomplete` のまま残っていた。本 run で値を creation せず graph node から転記する形で C02 単一 writer 経由で突合した (graph_revision 1237→1238)。plugin 側で graph と artifact の同時更新を担保する follow-up が要る。
4. **C08 readiness gate の 2 つの穴 (info)** — 既定 completeness report path が harness の実出力名と一致しない、および上流 verdict を判定に使っていない。本 run の判定には影響しないが、readiness gate が fail-open になり得る構造として記録する。
5. **Beads 未起票により実行フェーズへ進めない (high) — 2026-08-07 に解消済み** — 発生時、本 feature の 14 node (feature + P01..P13) は `beads_linkage=null` であり、次の 2 つが同時に起きていた。
   - `next` (schedule) の scope 内 ready_set が空になる。parity manifest の bd 紐付き投影 `nodes[]` (357 件) に 14 node が載らないため、C28 が読める候補が scope 内に存在しない。`graph_node_ids[]` (437 件) には載っているので「graph が知らない」のではなく「tracker へまだ投影していない」状態である。**これを「着手可能な作業が無い」と読み替えてはならない。**
   - `sync` が収束しない。`sync-graph.py` は remote issue を新規作成せず、linkage 無し node を `pending_retry` (`reason=external_linkage_missing`) に置くだけである。よって `pending_retry=0` は sync 単体では構造的に到達不能である。

   **是正手順 (実施済み・3 段):** ①C28 `bd-bridge.py --op create` で 14 issue を起票 (feature=`HarnessHub-hf9y`、P01=`HarnessHub-7sac`、以下 `bod6`/`8x08`/`ivao`/`8u3p`/`8djt`/`oekv`/`dgkk`/`j05t`/`vdhi`/`gchm`/`rtcd`/`gvg3`)。②`--op dep-add` で P01→P13 の直列依存 12 本を張る。③C02 `upsert-node.py` で各 node の `beads_linkage` を graph へ書き戻す。

   **帰属の実測裏付け:** 是正後に `sync --apply` (156 node 適用・body は 156/156 が `preserved`) → 再 `--dry-run` で `changes=0` / `imports=0` / `exports=0` / `conflicts=0` / `write_count=0` に到達し、`next` 再算出で feature 1 件 + `SYS-BUILD-IDENTITY-P01` が ready_set へ出現した。前回の「ready 0 件」を未起票へ帰属させた判断は、投影後に候補が出たことで実測的に裏付けられた。

   **本件から派生した plugin 側の finding (別途 follow-up が要る):**
   - **`sync-graph.py` が `external_ref` 逆引きを実装していない** — `_collect_remote` は `beads_linkage.bd_issue_id` を起点にしか remote を読まず、issue 側の `external_ref` (`dev-graph:<graph_node_id>`) から遡らない。したがって `create` だけでは remote が見えず `external_linkage_missing` のまま残る。**この linkage 書き戻しは decompose の publication 責務に含まれるべきだが、現状どの verb も自動実行しない**（本 run では手作業で C02 を経由した）。
   - **draft node が `pending_retry` に積まれ続ける分類漏れ** — repo 全体に残る `pending_retry` 47 件のうち 9 件 (issue 5 / feature 4) は `confirmation_status=draft` で、decompose 契約が「draft/unconfirmed/readiness incomplete を tracker へ投影しない」と定める**起票してはならない** node である。これが `pending_retry` に混ざるため `pending_retry=0` が構造的に到達不能になっている。本来は `skipped_by_contract` のような別分類にすべきである。残り 38 件は他 feature の未起票 task で、本 run のスコープ外。
   - **`bd-bridge --op create --dry-run` が本実行を保証しない** — dry-run 分岐が `--title` 必須検査より手前で return するため、dry-run が全件 exit 0 でも本実行が `create requires --graph-node-id and --title` で落ちた。

## パイプライン実行状況 (2026-08-07 時点・起票是正後に更新)

| verb | 結果 | 備考 |
|---|---|---|
| requirements | PASS | 本書・readiness matrix・handoff package を emit 済み |
| node | skip | 上位 command が未登録の成果物が無いため (素性不明の draft 文書は lineage 無しでは登録しない) |
| next | PASS (ready_set 非空) | 起票前は ready 0 件で、その帰属は上記逸脱 5。是正後の再算出で feature 1 + `SYS-BUILD-IDENTITY-P01` が出現。conflict_pairs 0・graph/lease/tracker digest すべて不変。C17 独立 verifier verdict=PASS・discrepancies 0 |
| worktree list | PASS | lease 52 件・active 0 件。claim は実装開始時に行うため未実行 |
| status | PASS | 14 node すべて active。C11 exit 0 / digest 不変 (`beads_linkage` はこの時点では null、後段で解消) |
| sync | PASS (対象 feature scope) / 未収束 (repo scope) | 起票是正 → `--apply` (156 node 適用・`body_source` は 156/156 が `preserved`・graph_revision 1253→1409) → 確認 `--dry-run` で `changes=0` / `write_count=0`。対象 feature 14 node は `pending_retry=0` で完全収束。repo 全体では 47 件が残る (内訳は逸脱 5 参照) |
| render | PASS (live trial は未実施) | `.dev-graph/render/index.html` (437 node / 317 edge / 27 feature / 進捗 162-of-273) と `.dev-graph/render/feat-build-identity-deploy-freshness.html` (14 node / 12 edge / 0-of-13)。両方とも外部 script/link 0 件・http(s) 参照 0 件のゼロ依存。registration receipt 未指定のため照合は `not_performed` と明示。実ブラウザ表示は未実施のため PASS にせず UNVERIFIED として残す |

`sync --dry-run` が当初示した `imports` 173 件は、本 feature の node に 1 件も触れない repo 全体の差分である (status 136 件 = 97 件 active→closed・39 件 draft→closed、title 28 件、depends_on 9 件)。適用前に `HarnessHub-15h` / `HarnessHub-dfm` / `HarnessHub-xwt.1` を `bd show --json` で実測し、3 件とも bd 側が closed (`closed_at` あり) であることを確認したうえで、Beads を正本とする収束として適用した。物理削除は 0 件で、すべて status transition である。
