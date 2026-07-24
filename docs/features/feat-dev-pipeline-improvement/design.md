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

1. `--beads-export FILE` で利用者が明示した固定 snapshot
2. `bd` が PATH 上にあれば `bd export -o <一時ファイル>` を実行し、Dolt DB の live 状態を取得
3. いずれも不可の場合、`--require-beads` (既定 true) なら JSON に `beads_axis: unavailable` を残して **exit 2 (fail-closed)**

`.beads/issues.jsonl` は受動エクスポートであり、状態通信の正本として暗黙には読まない。**保証境界**: CI checkout は Dolt DB を持たないため `--no-require-beads` で `OR-001` / `OR-002` を強制し、`OR-003` / `OR-004` の未評価を JSON に明示する。ローカル P06/P09/P12 ゲートは live `bd export` を必須とする。

### 2.4 CLI

`lint-open-residue.py --repo-root PATH [--graph PATH] [--beads-export PATH] [--no-require-beads] [--node-id ID] [--json-out PATH]` (既定 graph は `.dev-graph/state/graph.json`)。

### 2.5 出力 JSON 追加フィールド

共通形状 (§1) に `beads_axis` (resolved/unavailable)・`beads_source`・`baselined_residue`・`resolved_baseline_entries` を加える。各 violation は `rule`/`path`/`graph_node_id`/`bd_issue_id`/`detail` を持つ。

### 2.6 実測ベースライン (2026-07-21)

初回は `OR-003`=15 件。bd-bridge/docs-recompose の2件を close-loop で収束後、2026-07-22 の live 実測は `OR-001/002/004`=0、非 baseline `OR-003`=0、`SYS-STAGE0-DISTRIBUTION-GATE-P01..P13` の13件だけが所有者 `HarnessHub-vy0` の shrink-only baseline。baseline は `OR-003` にだけ適用し、同じ node の `OR-001/002/004` を隠さない。

## 3. D2: `lint-eval-log-layout.py` (SI-2 / AC-2)

### 3.1 配置規約

1. `eval-log/` 直下に新規ファイルを置かない。**skill 名 prefix のサブディレクトリ** (`eval-log/<skill-or-plugin-slug>/`) 配下へ置く
2. 同一バイト列のファイルを複数 path で git 追跡しない
3. 1 MiB (1048576 bytes) を超えるファイルを git 追跡しない (`.gitignore` へ回す)

### 3.2 既存 91 件への適用方式 — ratchet (凍結 allowlist)

`eval-log/` 直下の git 追跡ファイルは初回 91 件。**49 件**を再配置し、参照が残る **40 件**を凍結 allowlist、`README.md` 等 **2 件**を恒久例外とした。2026-07-22 の実測は allowlist=40、未登録直下残置=0。2026-07-24 に `.gitignore` が揮発投影として除外済みの `run-dev-graph-{init,node,requirements,schedule}-{progress.json,intermediate.jsonl}` 8 件を追跡解除し、現行 allowlist は **32 件**となった (`HarnessHub-ym5`)。

参照ありファイルの移動は `digest-immutability` (promoted package の再ハッシュ) と `single-writer-boundary` (`spec-state.json` の直接編集) に抵触するため、参照ゼロだけを再配置し、参照ありは凍結 allowlist へ登録する。

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
- **emit 側**: `emit-improvement-handoff.py` の既定を 1.1.0 にし、入力 finding の disposition 3 項目を正規化して出力する。未 triage、旧 1.0.0 指定、時刻不正は emit 時点で拒否し、1.0.0 を新規生成して lint を回避する経路を閉じる。schema parity テストが正本 schema との整合を保証する。

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

### 5.1 実装契約

`check-triage-complete.py` (C10) は tracker key を GitHub issue 番号または Beads id の文字列として受理し、4 artifact の `issue` も同じ union 型で検証する。C07 hook は `gh issue close`、`bd close`、`bd update --status closed`、`bd-bridge.py --op close` を捕捉する。Beads は `.spec-drift/<id>/` が存在する対象だけを gate し、通常 task は通過させる。対象 artifact があれば proposal-only、C03/C04 不足、C10 不完全、変数で id を解決不能な close を exit 2 で遮断する。

hook は plugin manifest と生成済み `.claude/settings.json` の両方に登録する。Web UI/API/Actions の server-side close は本ローカル hook の保証外として EV-008 に明示する。

### 5.4 `improvement-handoff-elegant-verify.json` 8 findings 対応表

| id | 判定 | 根拠 ref |
|---|---|---|
| EV-001 | `applied` | `plugins/spec-drift-guardian/scripts/parse-spec-diff.py` (完全 diff 再構成が実装済み) |
| EV-002 | `applied` | `plugins/spec-drift-guardian/schemas/triage-report.schema.json` (4 軸 + semantics を schema 固定) |
| EV-003 | `applied` | `plugins/spec-drift-guardian/scripts/check-triage-complete.py` (propose/apply 二段階 + allowlist/hash 検査) |
| EV-004 | `applied` | `plugins/spec-drift-guardian/hooks/guard-spec-drift-close.py` + `scripts/check-triage-complete.py` + `.claude/settings.json` |
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

`.dev-graph/templates/task.md` と `plugins/dev-graph/templates/task.md` の両方へ明記する (2 コピーの drift 防止 — P03-R6c)。`status` は **文書ライフサイクル**のみを表し、取り得る値は graph-node.schema.json の enum (`draft`/`active`/`blocked`/`done`/`closed`/`tombstoned`) に一致させる。**`superseded` は enum に無いため使わず**、後継置換は `closed`+`related_nodes` で表す (P03-R6a)。実行状態の正本は md ではなく graph 側 (`completion_evidence`/`execution_contexts`/`beads_linkage`) に一元化する。`status=closed` かつ `completion_evidence.status=in_progress` は矛盾ではなく「文書は役割終了・実行 reconcile は未了」を意味する (§2.2 の rule 分離の前提)。

### 7.2 graph.json 分割の再検討トリガー (SI-5 / AC-5)

`system-spec/dev-workflow.md` へ記録する。**トリガーの記録のみ**行い分割は実装しない (scope_out)。閾値: node 数 **500** 到達 → feature 単位 shard / 同一ファイル merge 衝突 **週 3 回以上** → 書込単位分割 / ファイルサイズ **5 MiB** 到達 → 圧縮・binary 化。

### 7.3 陳腐化文書の棚卸し GC (SI-8 / AC-7)

`sync` verb 運用へ組み込む。詳細手順は P12 `operations.md` が所有する。対象抽出: 解決済み open issue (`OR-003` 違反 → §6 の close-loop)、消化対象を持つ handoff (`improvements[]`/`clusters[]` を含む — P03-R4 で「0-findings」誤認を撤回。`1.1.0` + disposition 化して保持)、参照元が消滅した凍結 eval-log (`resolved_*_entries` → 次回 sync で削除)。GC は自動削除せず**候補提示に留める** (`digest-immutability` の削除を機械に委ねない)。

## 8. D7: dev-graph 中核 handoff 31 findings の差分監査手順 (SI-6)

対象: `plugin-plans/dev-graph/` の `improvement-handoff-macro.json`(12)/`-beads.json`(10)/`improvement-handoff.json`(9) = **31 findings**。P08 が 123 項目付与の内数として実行する。1 finding ごとに `target_ref` の実装対象を解決し、現行実装 (`plugins/dev-graph/`) に要求構造が実在すれば `applied` (ref=実ファイル path)、未実装だが妥当なら `deferred` (ref=`bd:<id>`。**起票なき deferred 不可**)、不採用なら `rejected` (ref=却下根拠 path)。`applied` の確証には実ファイル参照を必須とし、確認できないものは `deferred` へ倒す (判定不能を applied にしない)。`migration-receipt.json` の `core_handoff_audit[]` に 31 行を残す。

## 9. quality_constraints 6 件への適合根拠

| id | 適合根拠 |
|---|---|
| `choke-point-preservation` | §6 が beads mutation を `bd-bridge.py --op close` に限定し `bd close` 直呼び禁止。`guard-graph-schema.py` を緩和しない |
| `single-writer-boundary` | §6 手順 2 が `upsert-node.py` 経由。eval-log 再配置は `spec-state.json`/graph を触らず、status 意味論は template のみ変更 |
| `digest-immutability` | §3.2 で参照あり 40 件を初回凍結し、依存のない揮発投影 8 件だけを追跡解除して、残る 32 件と digest 固定物 (`.dev-graph/plans/generations/`) の参照 path を不動。handoff findings 本文を書き換えずキー追加のみ |
| `fail-closed-lint` | §1 で exit 2 規定。§4.2 で `1.0.0` 据置回避を塞ぎ、§8 で判定不能を applied へ倒さない |
| `no-dual-authority` | §7.1 で `status` を文書ライフサイクルへ限定し実行状態を graph 側へ一元化。§2.2 で 2 軸を別 rule 検査 |
| `idempotent-migration` | §3.5/§4 は正しい配置・disposition 完備なら no-op。receipt が移動 0/付与 0 を記録し差分 0 に収束 (実測済み) |

## 10. rollback

設計が既存 choke-point / 単一 writer と衝突した場合、本 design.md を破棄し P01 baseline から再設計する。
