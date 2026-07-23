---
status: confirmed
layer: feature-design
task: SYS-DEV-PIPELINE-IMPROVEMENT-P04
parent_feature: feat-dev-pipeline-improvement
feature_package_id: feature-package/feat-dev-pipeline-improvement
source: docs/features/feat-dev-pipeline-improvement/design.md
package_digest: sha256:f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f
architecture_refs: [arch-harness-hub-dev-workflow]
---

# feat-dev-pipeline-improvement テスト設計 (P04)

> **位置づけ**: P02 design.md の決定論契約に対する回帰テストを設計し、P06 で実行可能なテスト ID 一覧を確定する。P05 は本文書のテスト ID と 1 対 1 で対応する実装を行う。

## 0. テスト配置と実行

| ファイル | 対象 | 検証する設計節 |
|---|---|---|
| `plugins/dev-graph/tests/test_lint_open_residue.py` | `lint-open-residue.py` | design §2 |
| `plugins/dev-graph/tests/test_lint_eval_log_layout.py` | `lint-eval-log-layout.py` | design §3 |
| `plugins/dev-graph/tests/test_lint_handoff_disposition.py` | `lint-handoff-disposition.py` | design §4 |
| `plugins/spec-drift-guardian/tests/test_guard_spec_drift_close.py` / `test_check_triage_complete.py` | GitHub/Beads close と C10 | design §5 |
| `plugins/dev-graph/tests/test_migrate_pipeline_improvement.py` | P08 冪等 migration | design §3.5 / §4 / §8 |
| `plugins/harness-creator/tests/test_emit_improvement_handoff.py` / `test_emit_handoff_schema_parity.py` | 新規 handoff emit の1.1.0強制 | design §4 |

実行コマンド (P06):

```bash
python3 -m pytest plugins/dev-graph/tests/test_lint_open_residue.py \
                 plugins/dev-graph/tests/test_lint_eval_log_layout.py \
                 plugins/dev-graph/tests/test_lint_handoff_disposition.py \
                 plugins/dev-graph/tests/test_migrate_pipeline_improvement.py \
                 plugins/spec-drift-guardian/tests/test_guard_spec_drift_close.py \
                 plugins/spec-drift-guardian/tests/test_check_triage_complete.py \
                 plugins/harness-creator/tests/test_emit_improvement_handoff.py \
                 plugins/harness-creator/tests/test_emit_handoff_schema_parity.py -q
```

全テストは `tmp_path` 上に最小 fixture を構築し、実リポジトリを変更しない。

## 1. `lint-open-residue.py` (design §2)

### 1.1 MUST_DETECT (悪性 / 期待 exit 2)

| test ID | 投入する違反 | 期待 rule |
|---|---|---|
| `OR-D01` | md frontmatter `status: active` / graph node `status: closed` | `OR-001` |
| `OR-D02` | md の `completion_evidence.status` が `done` / graph node は `open` | `OR-002` |
| `OR-D03` | beads export で `closed` / graph node `completion_evidence.status: open` | `OR-003` |
| `OR-D04` | beads export で `open` / graph node `completion_evidence.status: done` | `OR-004` |
| `OR-D05` | beads 状態が解決できず `--require-beads` (既定) — exit 2 かつ `beads_axis` が `unavailable` | fail-closed |
| `OR-D06` | `OR-001` と `OR-003` を同時に含む node — violations に両方が現れる | 複合検出 |

### 1.2 MUST_PASS (良性 / 期待 exit 0)

| test ID | 投入する正常形 |
|---|---|
| `OR-P01` | md と graph の `status` / `completion_evidence` が完全一致し、beads も `closed` + `completion_evidence.status: done` |
| `OR-P02` | `status: closed` かつ `completion_evidence.status: in_progress` かつ beads も **未 close** — design §7.1 の意味論により矛盾ではない |
| `OR-P03` | `tracker_binding` が `beads` でない node は走査対象外 |
| `OR-P04` | `--no-require-beads` 指定で beads 不在 — `OR-001`/`OR-002` のみ評価し exit 0、`beads_axis: "unavailable"` を記録 |
| `OR-P05` | `completion_evidence.status: not_applicable` + beads `closed` — `OR-003` を発火させない |

### 1.3 契約テスト

| test ID | 検証内容 |
|---|---|
| `OR-C01` | 出力 JSON が design §1 の共通形状 (`lint`/`repo_root`/`scanned`/`violations`/`violation_count`/`exit_code`) を持つ |
| `OR-C02` | `violations` の順序が入力順に依存せず `sorted` で決定論的 (node を逆順に並べた graph でも同じ出力) |
| `OR-C03` | JSON 内の `path` がすべて repo 相対 (絶対 path を含まない) |
| `OR-C04` | 同一入力に対する 2 回実行の stdout がバイト一致 (冪等) |

## 2. `lint-eval-log-layout.py` (design §3)

### 2.1 MUST_DETECT (期待 exit 2)

| test ID | 投入する違反 | 期待 rule |
|---|---|---|
| `EL-D01` | allowlist に無いファイルを `eval-log/` 直下へ git 追跡で追加 | `EL-001` |
| `EL-D02` | `eval-log/a/x.json` と `eval-log/b/y.json` が同一バイト列 | `EL-002` |
| `EL-D03` | `eval-log/big/huge.bin` が 1 MiB + 1 byte で git 追跡 | `EL-003` |
| `EL-D04` | 3 rule を同時に含む — violations に 3 件すべてが現れる | 複合検出 |
| `EL-D05` | 同一バイト列が 3 path に存在 — detail に他 2 path が列挙される | `EL-002` |

### 2.2 MUST_PASS (期待 exit 0)

| test ID | 投入する正常形 |
|---|---|
| `EL-P01` | 直下ファイルがすべて allowlist 内、重複なし、全ファイル 1 MiB 未満 |
| `EL-P02` | allowlist エントリが実在しない (再配置済み) — `resolved_allowlist_entries` に記録し exit 0 |
| `EL-P03` | git 追跡外のファイルが直下にある — 検査対象外なので exit 0 |
| `EL-P04` | 0 byte のファイルが複数 path にある — 重複判定から除外され exit 0 |
| `EL-P05` | ちょうど 1 MiB (1048576 bytes) のファイル — 「超える」ではないので exit 0 |

### 2.3 ratchet 契約テスト

| test ID | 検証内容 |
|---|---|
| `EL-C01` | script 内の凍結 allowlist `_FROZEN_RESIDUE` が 40 件であり、全件が実リポジトリの `git ls-files eval-log` 直下に実在する |
| `EL-C02` | `--allowlist` でリストを差し替えたとき、差し替え後のリストのみが有効 (テスト用 override が本番リストへ混ざらない) |
| `EL-C03` | 実リポジトリに対する実行が exit 0 (P08 migration 完了後の到達状態) |

## 3. `lint-handoff-disposition.py` (design §4)

### 3.1 MUST_DETECT (期待 exit 2)

| test ID | 投入する違反 | 期待 rule |
|---|---|---|
| `HD-D01` | `schema_version: "1.0.0"` の handoff | `HD-001` |
| `HD-D02` | `schema_version` キー自体が無い handoff | `HD-001` |
| `HD-D03` | `1.1.0` だが finding に `disposition` が無い (**schema_version 偽装**) | `HD-002` |
| `HD-D04` | `disposition: "wontfix"` (enum 外) | `HD-002` |
| `HD-D05` | `disposition_ref` が空文字 / 空白のみ | `HD-003` |
| `HD-D06` | `disposition_ref` が repo 内に実在しない path | `HD-004` |
| `HD-D07` | `disposition_recorded_at` が無い / `"yesterday"` のような非 ISO-8601 | `HD-005` |

### 3.2 MUST_PASS (期待 exit 0)

| test ID | 投入する正常形 |
|---|---|
| `HD-P01` | `1.1.0` + 全 finding に `applied` + 実在 path の `disposition_ref` + ISO-8601 |
| `HD-P02` | `disposition_ref` が `bd:HarnessHub-xxx` 形式 — 実在検査を行わず通過 |
| `HD-P03` | `findings: []` (0-findings handoff) + `schema_version: "1.1.0"` — 検査対象 0 件で exit 0 |
| `HD-P04` | `disposition_ref` が `path#anchor` 形式で path 部分が実在 |
| `HD-P05` | 実リポジトリに対する実行が exit 0 (P08 migration 完了後の到達状態) |

### 3.3 契約テスト

| test ID | 検証内容 |
|---|---|
| `HD-C01` | `plugins/plugin-dev-planner/skills/run-plugin-dev-plan/schemas/improvement-handoff.schema.json` が JSON Schema として妥当で、`1.0.0` / `1.1.0` の条件分岐 (`allOf` + `if/then`) を持つ |
| `HD-C02` | schema の `1.1.0` 分岐が `disposition` / `disposition_ref` / `disposition_recorded_at` を `required` に含む |
| `HD-C03` | 既存 findings 本文キー (`id`/`severity`/`summary`/`recommendation`/`target_ref`) を schema が禁止していない (`digest-immutability`: 既存内容を保持できる) |

### 3.4 emitter 契約

| test ID | 検証内容 |
|---|---|
| `HD-E01` | 新規 emit の既定が1.1.0で、入力 disposition 3項目を保持し正本 schema に適合する |
| `HD-E02` | 1.0.0指定、disposition欠落、非ISO時刻を emit 前に拒否する |

## 4. spec-drift-guardian close gate の beads 経路 (design §5)

### 4.1 MUST_BLOCK (期待 exit 2)

| test ID | 投入する状況 |
|---|---|
| `SG-B01` | `.spec-drift/HarnessHub-abc/` に triage-report と sync-proposal のみ (verdict 2 件が欠落) の状態で `bd close HarnessHub-abc` — **proposal のみでの close の遮断** |
| `SG-B02` | 同状況で `bd-bridge.py --op close --bd-issue-id HarnessHub-abc` |
| `SG-B03` | 同状況で `bd update HarnessHub-abc --status closed` |
| `SG-B04` | `.spec-drift/<key>/` は存在するが 4 artifact が 1 つも無い状態での close |
| `SG-B05` | `bd close` を検出したが issue id を抽出できない (`bd close $ID` のような変数展開) — 確証不能で遮断 |
| `SG-B06` | 4 artifact が揃っているが C10 が INCOMPLETE を返す (triage_verdict.agree=false) |

### 4.2 MUST_PASS (期待 exit 0)

| test ID | 投入する状況 |
|---|---|
| `SG-P01` | `.spec-drift/<key>/` が存在しない issue の `bd close` — spec-drift 対象外なので pass-through |
| `SG-P02` | 4 artifact が揃い C10 が OK を返す状態での `bd close` |
| `SG-P03` | close ではない bd コマンド (`bd show` / `bd list` / `bd ready`) — pass-through |
| `SG-P04` | 既存の `gh issue close` 経路の挙動が変わっていない (回帰: artifact 欠落で exit 2) |
| `SG-P05` | `bd close` を含まない無関係な Bash コマンド — pass-through |

### 4.3 配線テスト

| test ID | 検証内容 |
|---|---|
| `SG-C01` | `.claude/settings.json` の `PreToolUse` / matcher `Bash` に `guard-spec-drift-close.py` が登録されている |
| `SG-C02` | `plugins/spec-drift-guardian/.claude-plugin/plugin.json` の既存登録が保持されている (二重登録による二重実行が冪等) |

## 5. P08 冪等 migration (design §3.5 / §4 / §8)

### 5.1 冪等性

| test ID | 検証内容 |
|---|---|
| `MG-I01` | migration script を同一入力に 2 回実行し、2 回目の receipt が `moved: 0` / `dispositions_added: 0` になる |
| `MG-I02` | 2 回実行後のファイル tree が 1 回実行後とバイト一致 (差分 0 収束) |
| `MG-I03` | 既に正しい配置・`1.1.0` 完備の状態から実行しても no-op |

### 5.2 全件性

| test ID | 検証内容 |
|---|---|
| `MG-A01` | migration 後、fixture 1件を除く20ファイルすべての `schema_version` が `1.1.0` |
| `MG-A02` | findings 94 + improvements 18 + clusters 11 = 123項目全件に disposition 3項目が存在する |
| `MG-A03` | `migration-receipt.json` の `core_handoff_audit[]` が **31 行**あり、finding id が dev-graph 中核 3 ファイルの id 集合と完全一致する |
| `MG-A04` | `core_handoff_audit[]` の各行が `finding_id` / `target_ref` / `verified_path` / `disposition` / `rationale` を持つ |
| `MG-A05` | `disposition: "deferred"` の finding はすべて `disposition_ref` が `bd:` 形式 (design §8.1: 起票を伴わない deferred を認めない) |

### 5.3 非破壊性

| test ID | 検証内容 |
|---|---|
| `MG-N01` | migration が既存 findings 本文キー (`id`/`severity`/`summary`/`recommendation`/`target_ref`) の値を 1 文字も変更しない |
| `MG-N02` | migration 後に `validate-evidence-refs.py` が exit 0 (再配置による dangling evidence_ref が 0 件) |
| `MG-N03` | 再配置対象が `.dev-graph/plans/generations/` から参照されている path を含まない (digest 固定物を動かさない) |

## 6. トレーサビリティ (テスト ID ↔ 受入条件)

| 受入条件 | 対応テスト ID |
|---|---|
| AC-1 (open 残置検出 + bd-bridge issue の close) | `OR-D01`〜`OR-D06` / `OR-P01`〜`OR-P05` / `OR-C01`〜`OR-C04` |
| AC-2 (eval-log 配置規約 + CI lint) | `EL-D01`〜`EL-D05` / `EL-P01`〜`EL-P05` / `EL-C01`〜`EL-C03` |
| AC-3 (disposition 必須化 + 123項目付与) | `HD-D01`〜`HD-D07` / `HD-P01`〜`HD-P05` / `HD-C01`〜`HD-C03` / `HD-E01`〜`HD-E02` / `MG-A01`〜`MG-A05` |
| AC-4 (task template status 意味論) | P07 で文書検証 (実行テストなし。`OR-P02` が意味論を間接検証) |
| AC-5 (graph.json 分割トリガー) | P07 で文書検証 (実行テストなし) |
| AC-6 (C03/C04 verdict close gate) | `SG-B01`〜`SG-B06` / `SG-P01`〜`SG-P05` / `SG-C01`〜`SG-C02` |
| AC-7 (棚卸し GC 手順) | P12 で文書検証 (実行テストなし) |

テスト ID 総数: **69** (実行可能 pytest。1関数で複数契約を検査する場合あり)。文書検証のみ: AC-4 / AC-5 / AC-7。

## 7. P05 実装対象との 1 対 1 対応

| P05 実装対象 | 対応テスト ID 群 |
|---|---|
| `plugins/dev-graph/scripts/lint-open-residue.py` | `OR-*` (15) |
| `plugins/dev-graph/scripts/lint-eval-log-layout.py` | `EL-*` (13) |
| `plugins/dev-graph/scripts/lint-handoff-disposition.py` | `HD-D*` / `HD-P*` (12) |
| `plugins/plugin-dev-planner/skills/run-plugin-dev-plan/schemas/improvement-handoff.schema.json` | `HD-C*` (3) |
| `plugins/harness-creator/scripts/emit-improvement-handoff.py` | `HD-E*` (2) |
| `plugins/spec-drift-guardian/hooks/guard-spec-drift-close.py` | `SG-B*` / `SG-P*` (11) |
| `.claude/settings.json` の hook 登録 | `SG-C*` (2) |
| P08 migration script | `MG-*` (11) |
| `eval-log/README.md` / `.dev-graph/templates/task.md` / `.github/workflows/dev-pipeline-lint.yml` | P07 文書検証 |

未対応の実装対象: **0 件**。
