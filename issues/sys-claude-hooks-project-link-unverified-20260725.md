---
graph_node_id: "issue-claude-hooks-project-link-unverified-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","schema","validation","claude-hooks","run-dev-graph-init"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "claude_hooks.source=project でも project_plugin_link の実在と plain-symlink 性が機械検査されない"
owners: ["daishiman"]
created_at: "2026-07-25T03:25:00Z"
updated_at: "2026-07-25T03:19:13.592819Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/schemas/repo-config.schema.json","plugins/dev-graph/scripts/validate-repo-config.py","plugins/dev-graph/skills/run-dev-graph-init/prompts/R5-hooks.md"]
purpose: "hook fallback 経路の前提 (link が実在し plain symlink である) を、config を検証する決定論経路で機械的に保証する"
goal: "source=project かつ project_plugin_link が不在または非 plain-symlink の config が、validate-repo-config.py で確実に落ちる状態"
mvp_alignment: null
scope_in: ["repo-config.schema.json へ claude_hooks の条件付き制約を追加するか、validate-repo-config.py の path 層で source=project 時の実在検査を行う","source が plugin/disabled のとき project_plugin_link を必須にし続けるかを決める","plain-symlink 要求を機械検査へ落とすか、検査対象外と明示する"]
scope_out: ["hook 適用そのもの (R5-hooks の deep-merge/rollback 実装)","guard-graph-schema の fail-open 修正 (issue-guard-graph-schema-timeout-fail-open-20260725)"]
acceptance: ["source=project かつ project_plugin_link が不在の config が exit 非 0 で落ちる","source=plugin のとき現行の正常 config が引き続き通る","fixture が declared-but-absent な link を持たない、または持つ理由が明示される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-claude-hooks-project-link-unverified-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T03:25:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "live-trial の fresh evaluator が宣言 path と実体の乖離として申し送り、schema と validator の実装を追って条件付き検査の欠落と確定した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-claude-hooks-project-link-unverified-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-7tn1","linked_at":"2026-07-25T03:19:04Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T03:25:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`claude_hooks.project_plugin_link` は schema で**無条件必須**だが、その値が指す path の実在も plain-symlink 性も、どの決定論経路でも検査されない。`source: "project"` (hook fallback を使う唯一のモード) のときですら検査が無いため、fallback が黙って成立しない config が正当な config として通る。

## 背景と問題

`repo-config.schema.json` の `claude_hooks` は 5 key すべてを `required` にしている。

```json
"required": ["source", "project_plugin_link", "session_start", "post_tool_reconcile", "task_completed_gate"]
```

`source` の enum は `plugin` / `project` / `disabled` の 3 値だが、`project_plugin_link` が意味を持つのは `project` のときだけである。それでも 3 モードすべてで必須なので、`plugin` モードの repo は**使わない path を宣言させられる**。

一方 `validate-repo-config.py` の `declared_paths()` は `project_plugin_link` を path 層の検査対象に含めるが (L140-143)、そこで効くのは repo 内包と重複だけで、実在は `required_content_roots` に列挙された key にしか要求されない。`project_plugin_link` がそこへ入ることはない。

結果として **`source: "project"` かつ link が存在しない config が exit 0 で通る**。

`prompts/R5-hooks.md` は fallback の前提をこう書いている。

> C24で検証した`.claude/dev-graph-plugin`からC10/C25全eventを既存settingsへpreview付きdeep-merge
> fallbackはplain-symlinkかつeffective plugin hook不在時のみ許可し既存key上書き/二重登録をしない。

「実在すること」「plain symlink であること」がどちらも前提だが、どちらも機械検査へ落ちていない。

同じ schema は条件付き制約の書き方を**既に持っている**。

```json
"allOf": [{"if": {"properties": {"execution_tracker": {"properties": {"mode": {"enum": ["github","both"]}}}}},
           "then": {"properties": {"github": {"properties": {"enabled": {"const": true}}}}}}]
```

`execution_tracker.mode` と `github.enabled` の間には条件付き制約があるのに、`claude_hooks.source` と `project_plugin_link` の間には無い。idiom の不在ではなく、適用漏れである。

## 現在の挙動

2026-07-25 の live-trial (`20260725T014705Z-init-wt9`) で fresh evaluator が観測した実例。

- 生成された fixture config は `claude_hooks.project_plugin_link: ".claude/dev-graph-plugin"` を持つ。
- fixture に `.claude/` は存在しない。
- `source` は `plugin` なので fallback merge は走らず、live-trial の観測項目 4 (hook source の解決と receipt 記録) は満たされる。
- `validate-repo-config.py` は exit 0 / `violations: []` を返す。

この個別ケースは無害だが、同じ検査の緩さが `source: "project"` でも効いてしまう点が問題である。

## 期待する挙動

`source: "project"` のとき、`project_plugin_link` が実在しない (または plain symlink でない) config は検証で落ちる。

## 再現手順

```bash
# schema に claude_hooks の条件付き制約が無いことを示す
python3 -c "
import json, pathlib
s = json.loads(pathlib.Path('plugins/dev-graph/schemas/repo-config.schema.json').read_text())
print('top-level allOf:', bool(s.get('allOf')))
print('claude_hooks conditional:', s['properties']['claude_hooks'].get('allOf') or s['properties']['claude_hooks'].get('if') or 'なし')
"

# path 層が実在を要求するのは required_content_roots だけであることを示す
sed -n '128,150p' plugins/dev-graph/scripts/validate-repo-config.py
```

## 影響と優先度

- 影響範囲: component。`source: "project"` を選んだ repo で hook fallback が黙って不成立になる。hook は C10 guard の配線経路なので、不成立は保護の欠落を意味する。
- 深刻度: medium
- 緊急度: 現行の運用既定は `source: "plugin"` なので即時被害は無い。plain-symlink 導入時に初めて踏む。

## スコープ

- In: schema の条件付き制約追加、または validator の path 層での条件付き実在検査。`plugin`/`disabled` で `project_plugin_link` を必須にし続けるかの判断。plain-symlink 要求を機械検査へ落とすか、検査対象外と明示するかの判断。
- Out: R5-hooks の deep-merge / rollback 実装そのもの。guard の fail-open 修正。

## 設計選択肢

1. **schema 側で条件付き必須にする** — `execution_tracker`/`github` と同じ `allOf` + `if/then` idiom を踏襲する。宣言的で一貫するが、実在 (filesystem) は schema では表現できないので path 層の追加が別途要る。
2. **validator 側の path 層で条件付き実在検査** — `source == "project"` のときだけ `project_plugin_link` を実在要求へ加える。filesystem を見られるので plain-symlink 判定まで一箇所で書ける。
3. **両方** — schema は「project なら key が要る」、validator は「その path が実在し plain symlink である」を担当する。層の責務が素直に分かれる。

推奨は 3。ただし `plugin` モードで未使用 path を必須にし続けるかは別途決めること。外すなら既存 config の後方互換に注意する。

## 関連グラフ

- 原因/親ノード: <該当なし>
- 関連仕様: `spec-dev-workflow`
- 関連アーキテクチャ: <該当なし>
- 解決タスク: <未起票>

## 受入条件

- [ ] `source: "project"` かつ `project_plugin_link` が不在の config が exit 非 0 で落ちる
- [ ] `source: "plugin"` の現行正常 config が引き続き exit 0 で通る
- [ ] plain-symlink 要求が機械検査されるか、検査対象外であることが文書に明示される
- [ ] `python3 -m pytest plugins/dev-graph/tests -q` が緑を維持する

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/dev-graph/tests -q`、上記再現手順
- 証跡 path: `eval-log/dev-graph/run-dev-graph-init/live-trial/20260725T014705Z-init-wt9/` (fresh evaluator の申し送り)、`eval-log/dev-graph/live-trial-fixtures/init-wt9/.dev-graph/config.json`

## 注意

`repo-config.schema.json` と `validate-repo-config.py` はいずれも run-dev-graph-init の behavior closure (18 ファイル) に含まれる。触れば `skill_dir_tree_sha` が動き live-trial verdict が stale になるため、`issue-guard-graph-schema-timeout-fail-open-20260725` および `issue-init-closure-doc-debts-20260725` と同じ周回で扱い、live-trial 再取得を 1 回に抑えること。
