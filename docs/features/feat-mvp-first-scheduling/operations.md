---
status: confirmed
layer: feature-operations
task: SYS-MVP-FIRST-SCHEDULING-P12
parent_feature: feat-mvp-first-scheduling
feature_package_id: feature-package/feat-mvp-first-scheduling
design: docs/features/feat-mvp-first-scheduling/design.md
final_review: docs/features/feat-mvp-first-scheduling/final-review.md
evidence_manifest: eval-log/dev-graph/mvp-first-scheduling/evidence-manifest.json
architecture_refs: [arch-harness-hub-dev-workflow]
written_at: "2026-07-23T14:21:00Z"
---

# feat-mvp-first-scheduling 運用手順 (P12)

> **位置づけ**: MVP 適合軸 metadata (`mvp_alignment`) の設定手順と、選定 receipt (選定理由の記録) の読み方を運用担当向けに明文化する。実装仕様の正本は design.md、判定根拠の正本は acceptance-report.md / evidence-manifest.json であり、本書はそれらへの運用導線を提供する。

## 1. mvp_alignment とは (30 秒サマリー)

- feature/task node に **任意 (optional)** で付けられる MVP 判断軸 metadata。未設定でも既存 node は今までどおりスケジュールされ続ける (一括書き換え不要 — compatibility-note.md で実測済み)。
- 付けると `schedule-graph` (next/schedule) と `bd-bridge --op ready` の着手候補順序が **MVP 適合度ファースト**になる。
- 順序は `direct (0) → enabling (1) → 未設定 (2) → deferred (3)` の rank 順、同 rank 内は node_id 辞書順。**deferred も除外はされない** (ソフト繰り延べ＝順序が後ろになるだけ)。

| mvp_fit | 意味 | いつ付けるか |
|---|---|---|
| `direct` | 今必要な動くもの (MVP) に直結する | MVP を構成する実装 task |
| `enabling` | MVP の前提を作る | schema・基盤など MVP が依存する task |
| (未設定) | 判断していない | 既存 node のデフォルト。焦って埋めない |
| `deferred` | 品質・再現性強化系。MVP 成立後に回す | リファクタ・網羅テスト強化など |

## 2. 設定手順 (既存 node への適用例つき)

### 2.1 手順の原則

- **書込は必ず C02 (`upsert-node.py`) 経由**で行う。graph.json の手編集は禁止 (guard で遮断される)。
- `mvp_alignment` は 4 サブフィールド**全部必須** (`mvp_fit` / `purpose` / `background` / `rationale`)。一部だけ書くと schema FAIL になる (additionalProperties: false + required)。
- 外すときは `"mvp_alignment": null` を patch する (キー削除ではなく null 化)。

### 2.2 適用例: 既存 task node に direct を付ける

```bash
# 1) patch ファイルを作る (.dev-graph/cache/ は作業領域として書込可)
cat > .dev-graph/cache/patch-mvp-alignment-example.json <<'EOF'
{
  "patch": {
    "graph_node_id": "SYS-EXAMPLE-FEATURE-P05",
    "updated_at": "2026-07-23T14:21:00Z",
    "mvp_alignment": {
      "mvp_fit": "direct",
      "purpose": "スケジュール本体の MVP 動作を成立させる実装",
      "background": "qa-069: 品質先行タスクの繰り返しで MVP から離れる停滞が起きた",
      "rationale": "この task が done にならない限り使って学ぶ回転が始まらないため direct"
    }
  }
}
EOF

# 2) C02 で適用 (まず --dry-run で差分確認を推奨)
python3 plugins/dev-graph/scripts/upsert-node.py --repo-root . \
  --input .dev-graph/cache/patch-mvp-alignment-example.json --dry-run
python3 plugins/dev-graph/scripts/upsert-node.py --repo-root . \
  --input .dev-graph/cache/patch-mvp-alignment-example.json

# 3) schema 検証 (exit 0 / violations 0 を確認)
python3 plugins/dev-graph/scripts/validate-graph-schema.py \
  --graph .dev-graph/state/graph.json --repo-root .
```

`graph_node_id` と各文字列を実際の node に合わせて書き換えれば、そのまま既存 node への適用手順になる。deferred を付ける場合は `mvp_fit: "deferred"` にし、rationale へ「なぜ MVP 後で良いか」を書く。

### 2.3 適用後に必ずやること: parity manifest の再生成 (順序制約)

mvp_alignment を付与・変更すると **graph の canonical digest (正規化した全体のハッシュ値) が変わる**。beads 経路の parity manifest (graph と bd の対応表) は digest で鮮度検査されるため、次の順序を守ること:

```
mvp_alignment 付与 (C02) → graph digest 変化 → parity manifest 再生成 → bd-bridge ready → schedule-graph
```

古い manifest のまま `schedule-graph --ready-json` を実行すると `beads parity snapshot is stale` で **exit 2 (全体停止)** になる。これは故障ではなく設計どおりの fail-closed (異常時に安全側で止まる動作) であり、P09 プローブ C で実測済み。対処は manifest の再生成のみ。ゲート緩和で回避しない。

再生成は **C03 (`run-dev-graph-sync`) の正規経路**で行い、現行 graph から
`generated_at` / `source_graph_digest` / `nodes[]` を一体で作り直す。`source_graph_digest`
だけを手書きで現行値へ合わせると stale 検出が働かなくなるため禁止する。また、変更した
node の `mvp_alignment.mvp_fit` が parity manifest の同じ node の `mvp_fit` へ転写されて
いることを確認する。キー欠落・null のままでは C28 は後方互換 rank 2 として扱うため、
`bd-bridge ready` の表示順が MVP-first にならない。

C03 が `eval-log/run-dev-graph-schedule-parity-manifest.json` を再生成した後は、C28 ready
receipt を一時ファイルへ出してから置き換え、続けて C16 schedule を実行する。直接 `>`
で既存 receipt を開くと、C28 が失敗した時に正常な旧 receipt を 0 byte へ切り詰めるため
避ける。

```bash
# C28: 現行 parity manifest と bd ready を突合する
ready_tmp="$(mktemp .dev-graph/cache/mvp-ready.XXXXXX)"
if python3 plugins/dev-graph/scripts/bd-bridge.py --op ready --repo-root . \
  --parity-manifest eval-log/run-dev-graph-schedule-parity-manifest.json \
  > "$ready_tmp"; then
  mv -f "$ready_tmp" eval-log/run-dev-graph-schedule-beads-ready.json
else
  rm -f "$ready_tmp"
  exit 1
fi

# C16: C28 receipt と git common-dir の lease 正本から選定 plan を算出する
python3 plugins/dev-graph/scripts/schedule-graph.py \
  --repo-root . \
  --graph .dev-graph/state/graph.json \
  --ready-json eval-log/run-dev-graph-schedule-beads-ready.json \
  --leases "$(git rev-parse --git-common-dir)/dev-graph/leases.json" \
  --eval-log eval-log/run-dev-graph-schedule-execution.json
```

`schedule-graph.py` が exit 0 になり、出力の `parity_provenance.source_graph_digest` が
現行 graph と一致して初めて再生成完了とみなす。manifest の digest や receipt を手で
書き換えて PASS にしない。

## 3. 選定 receipt の読み方

`schedule-graph` の plan 出力 (stdout) に常に `selection_receipt` キーが含まれる (eval-log 出力に依存しない)。

```json
"selection_receipt": {
  "policy": "mvp-first/v1",
  "mvp_established": { "feat-example": false },
  "entries": [ { "graph_node_id": "...", "artifact_kind": "task", "order_index": 0,
                 "mvp_fit": "direct", "sort_rank": 0,
                 "purpose": "...", "background": "...", "rationale": "...",
                 "deferral_reason": null } ]
}
```

### 3.1 読み方の要点

- **entries は選定順** (`order_index` = 並列 batch へ分割される前の通し順)。「なぜこの task が先か」は `sort_rank` と `rationale` を見る。
- **未設定 node も silent drop されない**: `mvp_fit: null, sort_rank: 2, deferral_reason: null` の行として必ず記録される。行が無い場合はそもそも ready 候補でない (依存未解決・lease 競合など receipt 外の事由)。
- **mvp_established** は「parent feature の direct task が全件 done か」の feature 単位 map:
  - `true` = MVP 成立済み / `false` = 未成立 / `null` = **direct task が 0 件で MVP 未定義** (true と読み間違えないこと)。
  - `--scope` 指定に依存せず全 graph から計算されるので、閲覧範囲を変えても値は変わらない。

### 3.2 deferral_reason の 4 変種 (deferred 行に必ず入る)

| 状況 | 文字列 (前方一致で判別可) |
|---|---|
| parent feature の MVP 未成立 | `quality-after-mvp: parent feature の MVP (direct 全件 done) が未成立のため繰り延べ` |
| parent feature の direct task 0 件 | `quality-after-mvp: MVP 未定義 (direct task 0 件) のため繰り延べ順序のみ適用` |
| parent_feature なしの単発 task | `quality-after-mvp: parent feature なしのため mvp_established 判定対象外、繰り延べ順序のみ適用` |
| parent feature の MVP 成立済み | `quality-after-mvp: parent feature の MVP 成立済み。deferred rank による繰り延べ順序のみ適用` |

> 注: design.md DEF-4 は執筆時点で 3 種と記載しているが、実装・テスト (TC-MVP-RCPT-03/04) は上記 4 種を固定している。design 側の追従は P13 writeback の責務 (final-review.md non-blocking 1)。運用上は本表の 4 種を正とする。

### 3.3 bd-bridge 側の読み方

`bd-bridge.py --op ready` の出力トップレベルにある `ready_set` は、parity manifest の
各行へ `mvp_fit` が転写されている場合に同じ rank 規則で並ぶ。キー欠落・null は後方互換
rank 2 へ fallback するため、MVP-first の表示順を得るには §2.3 の C03 再生成と転写確認が
必要になる。

**不正な mvp_fit を持つ候補行は `conflicts[]` へ隔離され、他の候補は生き残る**
(per-candidate fail-closed)。`unsupported mvp_fit in parity manifest: '...'` が出た場合は、
先に実 graph の schema 検証を行う。

- graph が invalid: C02 で当該 node の `mvp_alignment` を修正し、C03 から再実行する。
- graph が valid: parity manifest が stale または破損している。node を変更せず C03 で
  manifest 全体を再生成する。

どちらの場合も manifest の `mvp_fit` や `source_graph_digest` を直接修正しない。

## 4. 異常時の切り分け (fail-closed の非対称)

| 症状 | 原因 | 対処 |
|---|---|---|
| schedule-graph が exit 2 `unsupported mvp_fit '...'` | graph 正本の node に enum 外の mvp_fit | C02 で当該 node の mvp_alignment を修正 (全体停止は契約どおり) |
| schedule-graph が exit 2 `beads parity snapshot is stale` | graph 変更後に古い manifest/receipt を使用 | parity manifest を再生成 (§2.3 の順序) |
| bd-bridge の conflicts[] に `unsupported mvp_fit` | manifest 行に enum 外の値 | graph schema を検証。invalid なら C02 修正、valid なら node は変えず C03 で manifest 全体を再生成。他候補は影響なし |
| 未設定 node が候補から消えた気がする | mvp とは無関係 (未設定は rank 2 で残る仕様) | receipt に行があるか確認。無ければ依存・lease 等 receipt 外の事由 |

schedule-graph (graph 正本の汚染) は**全体停止**、bd-bridge (manifest 行の汚染) は**行単位隔離** — この非対称は design F-6/SI-3 の契約で、P09 (qa-fail-closed-report.json) が実測固定している。

## 5. 品質ゲート非退行の確認手順

mvp_alignment の運用変更 (付与・修正) 後に品質ゲートが退行していないことは、次で確認する:

```bash
# 本 feature の回帰テスト 3 本 (22 件 pass が期待値)
python3 -m pytest plugins/dev-graph/tests/test_schedule_graph_mvp_first.py \
  plugins/dev-graph/tests/test_bd_bridge_mvp_ready_order.py \
  plugins/dev-graph/tests/test_graph_node_mvp_schema_registration.py

# 実 graph の schema 検証
python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .

# 全件回帰
python3 -m pytest plugins/dev-graph/tests/ -q
```

- 全件回帰は **HarnessHub-4y5 (live-trial 再取得) が完了するまで** test_skill_criteria_evidence.py の 9 件が `stale behavior closure digest` で fail する既知状態 (分類: designed freshness gate、詳細は evidence-manifest.json → test-run-p06.json)。それ以外の fail が出たら退行なので手を止める。
- **禁止事項**: ゲートの緩和・skip 追加・live-trial receipt/verdict の手書き修正 (証跡改ざん)。fail はゲートが機能している証拠であり、正当な解消手段 (live-trial 再取得・実装修正) のみを使う。

### カテゴリ別に絞って再実行するときの正しい `-k` 式

テスト命名の都合で、直感的な `-k backward_compat` / `-k fail_closed` は **0 件収集 (exit 5)** になる (final-review.md non-blocking 2)。正しい式は:

| 目的 | 正しいコマンド |
|---|---|
| 後方互換 (COMPAT) | `python3 -m pytest plugins/dev-graph/tests/test_schedule_graph_mvp_first.py -k compat` |
| schedule 側 fail-closed | `python3 -m pytest plugins/dev-graph/tests/test_schedule_graph_mvp_first.py -k fails_closed` |
| bd-bridge 側 fail-closed/fallback | `python3 -m pytest plugins/dev-graph/tests/test_bd_bridge_mvp_ready_order.py -k 'invalid or tolerant'` |
| schema 登録の FAIL 系 | `python3 -m pytest plugins/dev-graph/tests/test_graph_node_mvp_schema_registration.py -k fails` |

## 6. 一次資料への導線

| 知りたいこと | 参照先 |
|---|---|
| 仕様の確定根拠 (rank 規則・receipt 形式) | docs/features/feat-mvp-first-scheduling/design.md (DEF-1〜5) |
| acceptance 判定と AC-5 の逸脱注記 | docs/features/feat-mvp-first-scheduling/acceptance-report.md |
| 既存 node が書き換え不要である実測根拠 | docs/features/feat-mvp-first-scheduling/compatibility-note.md |
| 証跡の digest と再実行コマンド | eval-log/dev-graph/mvp-first-scheduling/evidence-manifest.json |
| 悪性入力時の実測挙動 | eval-log/dev-graph/mvp-first-scheduling/qa-fail-closed-report.json |
| 横断整合と P13 への引き継ぎ事項 | docs/features/feat-mvp-first-scheduling/final-review.md |
