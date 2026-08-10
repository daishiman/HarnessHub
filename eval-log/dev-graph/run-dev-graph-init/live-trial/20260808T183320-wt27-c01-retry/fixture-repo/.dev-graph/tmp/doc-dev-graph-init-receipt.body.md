# 目的

C01 init live-trial が fixture-repo 内で実行した dev-graph 初期化の結果を、後続 responsibility と監査者が再確認できる受領書として固定する。6 content root の生成、repo-local な config/state/templates の配置、hook source の解決結果を 1 か所に集約し、再初期化や差分調査のたびに元 receipt を読み直さずに済む状態にする。

## 対象読者

dev-graph の初期化と node 登録を実行する harness maintainer、および live-trial の結果を独立検証する監査 agent を想定する。想定読者の前提知識レベルは、dev-graph の content root 命名と `.dev-graph/` 配下の役割分担を既に理解している運用者とする。

## 要約

初期化は成功し、fixture-repo は dev-graph の書込み先として受理された。`issues` `tasks` `specs` `architecture` `features` `docs` の 6 content root が repository 直下に揃い、`.dev-graph/config.json` `.dev-graph/state/graph.json` `.dev-graph/templates/` が repo-local に生成された。graph は 4-key envelope (`schema_version` `repository_id` `graph_revision` `nodes`) で作られ、初期状態は `graph_revision=0`、`nodes` 空配列だった。hook は `claude_hooks.source=plugin` として受理され、repo 側へ複製されていない。

## 本文

初期化で確認した事実を 3 系統に分けて記録する。

第一に content root である。`.dev-graph/config.json` の `content_roots` は `issues`, `tasks`, `specifications=specs`, `architecture`, `features`, `documents=docs` の 6 種を repository-relative で宣言し、対応するディレクトリが repository 直下に実在する。`system_spec` は同じ `content_roots` に宣言されるが system-spec-harness 由来の import 先であり、通常 artifact の routing 対象ではない。artifact_kind から root への写像は決定論的で、本受領書は `document` なので `docs/` に配置される。

第二に repo-local state である。`local_state` は graph を `.dev-graph/state/graph.json`、cache を `.dev-graph/cache`、lock を `.dev-graph/locks` に固定する。graph envelope の `repository_id` は `.dev-graph/config.json` と一致し、C24 の `resolve-repo-context.py --mode write` が返す `repository_id` とも一致した。`path_policy` は `authority=caller-repository`、`stored_paths=repository-relative`、`allow_outside_repository=false` で、成果物に環境固有の絶対 path を残さない契約になっている。`.dev-graph/templates/` には document を含む kind 別 template と `template-contract.json` が repo-local に配置され、利用者が編集した template はそのまま保持される。

第三に hook である。`claude_hooks` は `source=plugin` で、`session_start` `post_tool_reconcile` `task_completed_gate` の 3 種が有効として受理された。plugin 側の実体を参照するため、repository には hook スクリプトの複製が生成されない。この受領書自体は C02 単一 writer である `upsert-node.py` 経由で `docs/` と `.dev-graph/state/graph.json` へ atomic 登録され、graph と artifact frontmatter の parity を保った状態で作成された。

## 決定事項

- 初期化の記録は `document` として登録する。仕様や設計判断ではなく実行結果の記録であり、`specification` や `architecture` の必須節を満たす内容を持たないため。
- graph への書込みは `upsert-node.py` だけを経路とする。`.dev-graph/state/graph.json` と `.dev-graph/config.json` への直接編集は C10 guard の迂回にあたるため行わない。
- `.dev-graph/templates/` の既存 template は初期化後も上書きしない。利用者編集を保持することが再初期化の冪等性要件であるため、本文は template 由来ではなく `--body-file` 経由で与える。
- tracker への投影は行わない。本文書は実行管理対象の課題ではないため `tracker_binding=none`、`github_publication.mode=local_only` とする。

## 運用・更新方法

- 更新契機: fixture-repo で dev-graph を再初期化したとき、content root 構成または `.dev-graph/config.json` の宣言が変わったとき。
- 更新責任者: harness maintainers。
- 鮮度確認: `resolve-repo-context.py --mode write` の `repository_id` と graph envelope の `repository_id` が一致すること、および `validate-graph-schema.py` が exit 0 を返すことを更新のたびに実測する。

## 関連資料

- `doc-dev-graph-init-receipt` (本文書、`docs/dev-graph-init-receipt.md`)
- `.dev-graph/config.json` (content_roots、local_state、path_policy、claude_hooks の正本)
- `.dev-graph/state/graph.json` (4-key envelope の canonical graph store)
- `.dev-graph/templates/template-contract.json` (kind 別必須 section の契約)

## 変更履歴

| Date | Change | Author |
|---|---|---|
| 2026-08-08 | C01 init live-trial の初期化結果を受領書として新規登録 | harness maintainers |
