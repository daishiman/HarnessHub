---
status: confirmed
layer: feature-design
task: SYS-DEV-PIPELINE-IMPROVEMENT-P02
parent_feature: feat-dev-pipeline-improvement
feature_package_id: feature-package/feat-dev-pipeline-improvement
source: docs/features/feat-dev-pipeline-improvement/requirements-baseline.md
package_digest: sha256:f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f
feature_context_digest: sha256:16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085
architecture_refs: [arch-harness-hub-dev-workflow]
---

# feat-dev-pipeline-improvement 設計 (P02)

> **位置づけ**: P01 baseline の据置事項 DEF-1〜DEF-4 を確定し、P05 実装が参照する決定論契約を固定する。本文書が P04 テスト設計と P05 実装の唯一の入力である。

## 0. 設計対象 7 件と据置事項の対応

| # | 設計 | 節 | 解消する据置事項 |
|---|---|---|---|
| D1 | `lint-open-residue.py` 入出力契約 | §2 | DEF-1 |
| D2 | `lint-eval-log-layout.py` 入出力契約 | §3 | DEF-1 / DEF-3 |
| D3 | `lint-handoff-disposition.py` 入出力契約 + schema 拡張 | §4 | DEF-1 / DEF-2 |
| D4 | spec-drift-guardian C03/C04 verdict の close gate 配線 | §5 | — |
| D5 | close-loop の bd-bridge 経由手順 | §6 | DEF-4 |
| D6 | tasks status 意味論 / graph.json 分割トリガー / 棚卸し GC | §7 | — |
| D7 | dev-graph 中核 handoff 31 findings 差分監査手順 | §8 | — |

未確定の持ち越し: **0 件**。

## 1. 共通契約

全 lint script は既存 `plugins/dev-graph/scripts/` の慣例に従う。

- `argparse` / 標準ライブラリのみ / `requires-python: ">=3.11"` / PEP 723 script メタブロック
- **exit code**: `0` = 違反 0 件、`2` = 違反検出 (fail-closed)、`1` = 一般エラー (入力不正・ファイル読取失敗)
- **stdout**: 検査結果の JSON を 1 個だけ出力する (`ensure_ascii=False`, `indent=2`)。stderr には日本語のサマリのみ
- **`--repo-root PATH`** 必須。全 path は repo-root 相対で出力し、絶対 path を JSON へ書かない (再実行時の差分 0 を保つ)
- **決定論**: 走査順は `sorted()` で固定する。時刻・乱数を出力へ含めない

共通 JSON 形状:

```json
{
  "lint": "<script 名>",
  "repo_root": "<相対表記 '.'>",
  "scanned": 0,
  "violations": [ { "rule": "<RULE-ID>", "path": "<repo 相対>", "detail": "<日本語>" } ],
  "violation_count": 0,
  "exit_code": 0
}
```

`fail-closed-lint` 制約: `violations` が 1 件でもあれば exit 2。警告レベルは設けない。

## 2. D1: `lint-open-residue.py` (SI-1 / AC-1)

### 2.1 目的

「解決済み事象の open 残置」= 実行が完了しているのに md / graph node / beads の 3 表現のいずれかが未クローズのまま放置されている状態を、決定論で検出する。

### 2.2 検出軸 (4 rule)

`no-dual-authority` 制約に従い、**`status` は文書ライフサイクル**、**`completion_evidence.status` は実行状態**として扱い、比較軸を分離する。

| rule | 条件 | 根拠となる正本 |
|---|---|---|
| `OR-001` | issue/task md frontmatter の `status` と graph node の `status` が不一致 | 文書ライフサイクルの 2 表現乖離 |
| `OR-002` | md frontmatter の `completion_evidence` と graph node の `completion_evidence` が不一致 | 実行状態の投影ずれ |
| `OR-003` | beads issue が `closed` なのに graph node の `completion_evidence.status` が `done` / `not_applicable` のいずれでもない | **解決済みの open 残置 (本命)** |
| `OR-004` | graph node の `completion_evidence.status` が `done` なのに beads issue が `closed` でない | 逆向き残置 (未完了を done と主張) |

対象 node: `artifact_kind ∈ {issue, task}` かつ `tracker_binding == "beads"`。

### 2.3 beads 状態の解決順序と保証境界

`OR-003` / `OR-004` は beads 側の状態を要する。解決順序:

1. `--beads-export FILE` で明示指定された JSONL
2. `.beads/issues.jsonl` (beads の受動エクスポート) が存在すればそれ
3. `bd` が PATH 上にあれば `bd export -o <一時ファイル>` を実行
4. いずれも不可の場合、`--require-beads` (既定 true) なら **exit 2 (fail-closed)**

**宣言された保証境界**: CI 実行環境に beads (Dolt DB) が無い場合は `--no-require-beads` を用い、`OR-001` / `OR-002` のみを強制する。この場合 JSON の `beads_axis` に `"unavailable"` を記録し、`OR-003` / `OR-004` は未評価であることを明示する。git 追跡ファイルのみで完結する `OR-001` / `OR-002` は常時 fail-closed で動作する。beads を CI へ供給する経路の整備は follow-up 課題とする (spec-drift-guardian EV-008 の「保証境界を明示し open issue として保持する」前例に倣う)。

### 2.4 CLI

```
lint-open-residue.py --repo-root PATH
                     [--graph PATH]            # 既定 .dev-graph/state/graph.json
                     [--beads-export PATH]
                     [--no-require-beads]
                     [--node-id ID]            # 反復指定。診断用に対象を絞る
                     [--json-out PATH]         # 結果 JSON をファイルへも書く
```

### 2.5 出力 JSON 追加フィールド

```json
{
  "lint": "lint-open-residue",
  "beads_axis": "resolved | unavailable",
  "beads_source": "<解決に使った経路>",
  "scanned": 212,
  "violations": [
    {
      "rule": "OR-003",
      "path": "issues/sys-bd-bridge-notes-passthrough-20260721.md",
      "graph_node_id": "issue-bd-bridge-notes-passthrough-20260721",
      "bd_issue_id": "HarnessHub-8ql",
      "detail": "beads=closed だが completion_evidence.status=open"
    }
  ]
}
```

### 2.6 実測ベースライン (2026-07-21)

`OR-001` = 0 件、`OR-002` = 0 件、`OR-003` = **15 件** (`issue-bd-bridge-notes-passthrough-20260721` / `issue-docs-recompose-followups-20260718` / `SYS-STAGE0-DISTRIBUTION-GATE-P01..P13`)、`OR-004` = 0 件。15 件すべて beads 側は `closed` 済みであり、graph の `completion_evidence` だけが追従していない純粋な投影遅れである。§6 の close-loop 手順で全件を reconcile する。

## 3. D2: `lint-eval-log-layout.py` (SI-2 / AC-2)

### 3.1 配置規約

1. `eval-log/` 直下に新規ファイルを置かない。**skill 名 prefix のサブディレクトリ** (`eval-log/<skill-or-plugin-slug>/`) 配下へ置く
2. 同一バイト列のファイルを複数 path で git 追跡しない
3. 1 MiB (1048576 bytes) を超えるファイルを git 追跡しない (`.gitignore` へ回す)

### 3.2 既存 91 件への適用方式 — ratchet (凍結 allowlist)

`eval-log/` 直下の git 追跡ファイルは 2026-07-21 時点で 91 件。うち **41 件**が他所 (`plugins/` 配下の SKILL.md・script 41 ファイル、`tests/` 3、`scripts/` 4、`.github/workflows/` 2、digest 固定済み package 成果物、`system-spec/spec-state.json`) から path 文字列で参照されている。

これらを移動すると `digest-immutability` (promoted package の再ハッシュ) と `single-writer-boundary` (`spec-state.json` の直接編集) に抵触するため、**参照ゼロの 50 件のみ再配置し、参照ありの 41 件は凍結 allowlist へ登録する** 方式を採る。

- 凍結 allowlist は **script 内の `frozenset` 定数** `_FROZEN_RESIDUE` として保持する。外部 JSON にしないのは、緑化のための追記が diff 上で必ず可視になるようにするため
- allowlist は **shrink-only**。エントリが実在しなくなった場合は違反ではなく `resolved_allowlist_entries` として報告し、リストからの削除を促す (exit 0)
- allowlist に無い直下ファイルは即 `EL-001` 違反

### 3.3 検出 rule

| rule | 条件 |
|---|---|
| `EL-001` | `eval-log/` 直下の git 追跡ファイルが凍結 allowlist に無い |
| `EL-002` | `eval-log/` 配下の git 追跡ファイルに同一 sha256 の組が 2 つ以上ある (バイト同一重複) |
| `EL-003` | `eval-log/` 配下の git 追跡ファイルが 1 MiB を超える |

`EL-002` の重複判定は sha256 で行い、違反 detail に重複相手の path 全件を列挙する。空ファイル (0 byte) は重複判定から除外する (意味を持たない同一性のため)。

### 3.4 CLI

```
lint-eval-log-layout.py --repo-root PATH
                        [--eval-log-dir PATH]   # 既定 eval-log
                        [--max-bytes N]         # 既定 1048576
                        [--allowlist PATH]      # テスト用に凍結リストを差し替える
                        [--json-out PATH]
```

git 追跡ファイルの列挙は `git ls-files -- <eval-log-dir>` を使う。git 管理外の実行時生成物は検査対象外 (規約は「git 追跡」に対して課される)。

### 3.5 再配置対象一覧の決定手順 (DEF-3)

1. `git ls-files eval-log` から直下 (`/` を 1 個だけ含む) の path を列挙する
2. 各 path 文字列を `eval-log/` 以外の全 git 追跡ファイルへ grep し、参照数 0 のものを移動対象とする
3. 移動先は path 先頭の skill 名 prefix から導出する。導出規則:
   - `run-<verb>-...` 形式 → `eval-log/<plugin-slug>/<残り>` (例: `run-dev-graph-init-goal-spec.json` → `eval-log/dev-graph/run-dev-graph-init/goal-spec.json`)
   - prefix を導出できないもの → `eval-log/legacy/<basename>`
4. 移動は `git mv` 相当 (`Path.rename` + git 追跡) で行い、`migration-receipt.json` に旧 path → 新 path を記録する

## 4. D3: `lint-handoff-disposition.py` + schema 拡張 (SI-3 / SI-6 / AC-3)

### 4.1 schema 拡張 (正本 schema を改訂。新設しない — P03-R5)

improvement-handoff の schema 正本は `plugins/plugin-dev-planner/skills/run-plugin-dev-plan/schemas/improvement-handoff.schema.json` であり、`plugins/harness-creator/tests/test_emit_handoff_schema_parity.py` が emit 出力との parity を CI で守っている。dev-graph 側に別 schema を新設すると同一 artifact に二重 authority が生じ parity テストを割るため、**正本 schema を後方互換で拡張する**。

`findings.items.properties` へ `disposition` / `disposition_ref` / `disposition_recorded_at` を optional 追加し (additionalProperties:false を維持)、`allOf` に「`schema_version == "1.1.0"` のとき per-finding でこの 3 キーを required」とする条件節を足す。1.0.0 の既存出力・emit 既定は無変更 (後方互換)。

`disposition_ref` は判定根拠の実在参照。形式は `<repo 相対 path>` / `<path>#<anchor>` / `bd:<issue-id>`。

### 4.2 検査対象と後方互換方式 (DEF-2 / P03-R4)

- 対象配列は `findings[]` だけでなく `improvements[]` / `clusters[]` も含む。extract-system-blueprint 系 4 ファイルは improvements[]、mf-kessai round2 は clusters[] を使い、これを「0-findings」と誤認すると 29 項目が素通りする。実データは 20 ファイル計 **123 項目** (findings 94 + improvements 18 + clusters 11)。
- golden fixture (`/fixtures/` `/finish/` を含む path) は別形状のため除外し、`excluded_fixtures` に明示記録する。
- lint は **`1.0.0` を通さない** (P08 migration が 20 ファイル全件を 1.1.0 化)。「schema_version を据え置けば回避」を塞ぐため。逆向き偽装 (1.1.0 を名乗るが disposition 欠落) は `HD-002` が捕捉する。legacy な `schema` キー (`improvement-handoff/v1` 等) も schema_version 未設定として `HD-001` が捕捉する。
- **emit 側**: `emit-improvement-handoff.py` の既定 schema_version を 1.1.0 化し disposition を emit 時に付与する改修は、disposition が triage 後に決まる後付け情報であることと parity/emit テストへの波及があるため follow-up 課題 (HarnessHub-k2u 配下) とする。それまで新規 emit 出力は commit 前に triage (1.1.0 化) する運用とする。

### 4.3 検出 rule

| rule | 条件 |
|---|---|
| `HD-001` | `schema_version` が `1.1.0` でない (未設定・`1.0.0`・legacy `schema` キーを含む) |
| `HD-002` | item に `disposition` が無い、または enum 外 |
| `HD-003` | `disposition_ref` が無い・空文字・空白のみ |
| `HD-004` | `disposition_ref` が `<path>` 形式なのに repo 内に実在しない |
| `HD-005` | `disposition_recorded_at` が無い、または ISO-8601 date-time として解釈できない |

`HD-004` の `bd:<issue-id>` 形式は実在検査を行わない (beads 可用性に依存しないため)。

### 4.4 CLI

```
lint-handoff-disposition.py --repo-root PATH
                            [--glob PATTERN]   # 既定 plugin-plans/**/improvement-handoff*.json
                            [--json-out PATH]
```

## 5. D4: spec-drift-guardian の C03/C04 verdict close gate 配線 (SI-7 / AC-6)

### 5.1 現状 (実装済み部分)

`plugins/spec-drift-guardian/scripts/check-triage-complete.py` (C10) は 4 artifact (C01 triage-report / C03 triage-verdict / C02 sync-proposal / C04 sync-audit-verdict) を突合し、`applied_verified` または `independently_verified_no_change` のみ OK とする。`plugins/spec-drift-guardian/hooks/guard-spec-drift-close.py` (C07) が PreToolUse/Bash で C10 を呼ぶ。すなわち **verdict → gate の判定ロジックは既に存在する**。

### 5.2 実際に残っているギャップ

| gap | 内容 |
|---|---|
| `GAP-1` | C07 の close 検出が `gh issue close` **のみ**。本リポジトリの tracker は beads (`.dev-graph/config.json` `execution_tracker.mode=beads`、`github.enabled=false`) であり、実際の close 経路は `bd close <id>` と `bd-bridge.py --op close` である。したがって現行 gate は**実運用の close 経路を 1 つも捕捉していない** |
| `GAP-2` | C07 が `plugins/spec-drift-guardian/.claude-plugin/plugin.json` にのみ登録され、リポジトリの `.claude/settings.json` の PreToolUse には登録が無い。plugin 未導入セッションでは hook が発火しない |

`GAP-1` は EV-004 (「C03/C04 の独立 verdict が close gate へ配線されていなかった」) が gh 前提のまま解決扱いになっていたことに起因する。tracker が beads へ移った時点で配線は実質的に外れていた。

### 5.3 判定: beads close-gate は本 feature scope から除外し EV-004 を deferred で保持する (P03-R2)

当初は `guard-spec-drift-close.py` を beads close 経路へ拡張する設計だったが、独立レビュー (P03) が実ファイルを読んで次を確認したため、**本 feature では実装しない**:

- C10 (`check-triage-complete.py`) の `--issue` は `type=int` で required、4 artifact schema も `"issue": integer`。beads id (`HarnessHub-8ql`) は構造上 C10 へ渡せない。
- `.spec-drift/<key>/` を beads id で生成する producer が repo 内に存在しない (C01 は GitHub issue 番号キーで生成)。`.spec-drift/` は transient で git 追跡もされない。
- したがって「`.spec-drift/<key>/` が無ければ pass-through」は beads 運用では常に pass-through となり gate が空洞化する。

beads 経路の gate を成立させるには C10 の int→str 拡張・beads キーの artifact producer 新設・settings 登録の 3 点が要り、これは feature scope (「新 verb 追加なし」「既存 close gate の配線」) を超える。よって **AC-6 の判定基準を gh 経路 (実装済みで機能する) に限定**し、beads 経路配線は **EV-004 を deferred** として `bd:HarnessHub-k2u` で追跡する。緑化された FAIL を残すより誠実な選択である (P03-R2(b) 採用)。

### 5.4 `improvement-handoff-elegant-verify.json` 8 findings 対応表

| id | 判定 | 根拠 ref |
|---|---|---|
| EV-001 | `applied` | `plugins/spec-drift-guardian/scripts/parse-spec-diff.py` (完全 diff 再構成が実装済み) |
| EV-002 | `applied` | `plugins/spec-drift-guardian/schemas/triage-report.schema.json` (4 軸 + semantics を schema 固定) |
| EV-003 | `applied` | `plugins/spec-drift-guardian/scripts/check-triage-complete.py` (propose/apply 二段階 + allowlist/hash 検査) |
| EV-004 | `deferred` | `bd:HarnessHub-k2u` — beads 経路 gate は C10 の int→str 拡張と beads キー producer 新設を要し scope 超過。§5.3 参照 |
| EV-005 | `applied` | `plugins/spec-drift-guardian/tests/test_command_wiring.py` (component 数の整合検証) |
| EV-006 | `applied` | `plugins/spec-drift-guardian/references/field-impact-map/field-impact-map.json` + `schemas/` (envelope へ配置済み) |
| EV-007 | `applied` | `plugins/spec-drift-guardian/tests/fixtures/issue17-matrix.json` (差分カテゴリ matrix) |
| EV-008 | `deferred` | `plugin-plans/spec-drift-guardian/improvement-handoff-elegant-verify.json#EV-008` — Web/API/Actions 経路の server-side gate は scope_out |

## 6. D5: close-loop の bd-bridge 経由手順 (DEF-4 / SI-1)

`choke-point-preservation` と `single-writer-boundary` を守り、3 表現を以下の順で閉じる。**逆順は不可** (beads を先に閉じないと OR-003 が発火しないため、検出可能性を保った順序にする)。

```bash
# 1) beads を閉じる (choke-point = bd-bridge。bd を直接叩かない)
python3 plugins/dev-graph/scripts/bd-bridge.py --op close \
  --repo-root . --bd-issue-id <BD-ID> --reason "<完了根拠>"

# 2) graph node と md の 2 表現を単一 writer 経由で同時に done へ遷移させる。
#    upsert-node.py は patch envelope を受け取り graph.json と artifact md を
#    アトミックに書き換えるため、md を手編集する必要はない (してはならない)。
cat > .dev-graph/state/close-patch.json <<'JSON'
{
  "graph_node_id": "<NODE-ID>",
  "patch": {
    "graph_node_id": "<NODE-ID>",
    "completion_evidence": {
      "policy": "linked_pr_merged_all",
      "status": "done",
      "source": "manual",
      "completed_at": "<ISO-8601>",
      "reconciled_at": "<ISO-8601>",
      "evidence_refs": ["<実在する証跡 path>"]
    }
  }
}
JSON
python3 plugins/dev-graph/scripts/upsert-node.py --repo-root . \
  --input .dev-graph/state/close-patch.json

# 3) 残置が解消したことを検査で確認する
python3 plugins/dev-graph/scripts/lint-open-residue.py --repo-root .
```

- 手順 1 を `bd close` で代替しない (`guard-graph-schema.py` の choke-point 遮断対象)
- 手順 2 を `graph.json` / md の直接編集で代替しない (`upsert-node.py` が WAL 保護下の単一 writer であり、graph と md を 1 トランザクションで更新する)
- `--input` に渡す patch ファイルは repository 内に置く必要がある (`upsert-node.py` の `contained()` 制約)。一時ファイルは適用後に削除する
- 同じ patch を再適用すると `operation: "noop"` / `write_count: 0` を返す (冪等)
- 手順 3 が exit 0 になって初めて close-loop 完了とする

## 7. D6: tasks status 意味論 / graph.json 分割トリガー / 棚卸し GC

### 7.1 tasks/ frontmatter `status` の意味論 (SI-4 / AC-4)

`.dev-graph/templates/task.md` へ次を明記する。

> `status` は **文書ライフサイクル**のみを表す。取り得る値は `draft` (起案中) / `active` (有効) / `closed` (文書として役割終了) / `superseded` (後継文書へ置換) / `tombstoned` (論理削除) である。
> **実行状態 (未着手・進行中・完了) の正本は md ではない。** 実行状態は graph node 側の `completion_evidence` (実行の完了根拠)・`execution_contexts` (実行中の worktree/branch)・`beads_linkage` (課題トラッカー上の状態) に一元化される。md へ実行状態を書き写して二重正本を作ってはならない。

`no-dual-authority` 制約の実装形。`status=closed` かつ `completion_evidence.status=in_progress` は矛盾ではなく「文書は役割終了、実行の reconcile は未了」を意味する — この分離が §2.2 の rule 設計の前提である。

### 7.2 graph.json 分割の再検討トリガー (SI-5 / AC-5)

`system-spec/dev-workflow.md` へ記録する。現状 235 node / 単一 `.dev-graph/state/graph.json`。

| トリガー | 閾値 | 再検討する内容 |
|---|---|---|
| node 数 | **500 node** 到達 | feature 単位の shard 分割と index ファイルの導入 |
| merge 衝突 | 同一ファイルの衝突が **1 週間に 3 回以上** | 書込単位の分割 (node ごとファイル化) と upsert-node の書込境界変更 |
| ファイルサイズ | **5 MiB** 到達 | 圧縮または binary format への移行 |

いずれかに達した時点で再検討を起票する。本 feature では**トリガーの記録のみ**を行い分割は実装しない (scope_out)。

### 7.3 陳腐化文書の棚卸し GC (SI-8 / AC-7)

`sync` verb の運用へ組み込む。詳細手順は P12 `operations.md` が所有する。対象抽出:

| 対象 | 抽出コマンド | 処置 |
|---|---|---|
| 解決済み open issue | `lint-open-residue.py` の `OR-003` 違反 | §6 の close-loop で 3 表現を閉じる |
| 0-findings handoff | `findings` が空配列の `improvement-handoff*.json` (現状 5 件) | disposition 不要。`schema_version` を `1.1.0` へ更新し保持 (削除しない — 「検査対象なし」という結論自体が証跡) |
| 陳腐化 eval-log | `eval-log/` 直下の凍結 allowlist エントリで参照元が消滅したもの | `lint-eval-log-layout.py` の `resolved_allowlist_entries` として報告 → 次回 sync で削除 |

周期: `sync` verb 実行時に毎回。GC 自体は自動削除を行わず**候補提示に留める** (`digest-immutability` に抵触する削除を機械に委ねない)。

## 8. D7: dev-graph 中核 handoff 31 findings の差分監査手順 (SI-6)

対象: `plugin-plans/dev-graph/improvement-handoff-macro.json` (12) / `improvement-handoff-beads.json` (10) / `improvement-handoff.json` (9) = **31 findings**。94 findings 全件付与の内数として P08 が実行する。

### 8.1 判定手順 (1 finding ごと)

1. `target_ref` が指す実装対象 (`component-inventory.json#Cxx` / script path / schema path) を解決する
2. 現行実装 (`plugins/dev-graph/` 配下の実ファイル) を読み、`recommendation` が要求する構造が**実在するか**を確認する
3. 判定:
   - **`applied`**: 要求された構造が現行実装に実在する。`disposition_ref` = その実ファイル path (可能なら `#<関数名/キー名>` まで)
   - **`deferred`**: 未実装だが妥当。`disposition_ref` = 追跡する beads issue (`bd:<id>`)。**起票を伴わない `deferred` は認めない**
   - **`rejected`**: 設計判断として採用しない。`disposition_ref` = 却下根拠を記した文書 path (本 design.md の該当節を含む)
4. `migration-receipt.json` の `core_handoff_audit[]` へ 31 件分の監査行 (finding id / target_ref / 確認した実ファイル / 判定 / 根拠) を残す

### 8.2 残り 63 findings の扱い

dev-graph 中核 3 ファイル以外の 18 ファイル 63 findings も同じ 3 値で判定するが、差分監査 (実装との突合) は求めない。`applied` と判定するには実ファイル参照を必須とし、確認できないものは `deferred` + beads 起票とする (`fail-closed` の思想を migration にも適用する)。

## 9. quality_constraints 6 件への適合根拠

| id | 適合根拠 |
|---|---|
| `choke-point-preservation` | §6 の close-loop 手順が beads mutation を `bd-bridge.py --op close` に限定し、`bd close` 直呼びを禁止。`guard-graph-schema.py` の遮断を緩和しない。§5.3 の gate 拡張は close を**追加で遮断する**方向であり、迂回路を開かない |
| `single-writer-boundary` | §6 手順 2 が `upsert-node.py` 経由。§3.5 の eval-log 再配置は `spec-state.json` / graph を触らない。tasks status 意味論の明記は template のみを変更 |
| `digest-immutability` | §3.2 で参照ありの 41 件を凍結し、digest 固定済み package 成果物 (`.dev-graph/plans/generations/`) が参照する path を一切動かさない。既存 handoff の findings 本文 (`id`/`severity`/`summary`/`recommendation`/`target_ref`) を書き換えず、キー追加のみ行う |
| `fail-closed-lint` | §1 で exit 2 を規定。§4.2 で `1.0.0` 据置による回避を塞ぎ、§5.3 で id 抽出不能を遮断。§8.2 で「確認できないものは deferred」とし判定不能を applied へ倒さない |
| `no-dual-authority` | §7.1 で `status` を文書ライフサイクルへ限定し、実行状態を graph 側へ一元化。§2.2 で 2 つの軸を別 rule として分離検査する |
| `idempotent-migration` | §3.5 の再配置は移動先が既に正しい場合 no-op。§4 の disposition 付与は既に `1.1.0` + disposition 完備なら no-op。receipt は移動 0 件・付与 0 件を記録して差分 0 に収束する |

## 10. rollback

設計が既存 choke-point / 単一 writer と衝突すると判明した場合、本 design.md を破棄し P01 baseline から再設計する。
