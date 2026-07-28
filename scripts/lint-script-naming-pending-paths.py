"""Pending script-name exceptions split from lint-script-naming.py.

These paths require coordinated reference updates before they can be renamed.
"""

PENDING_RENAME_PATHS = {
    # task-graph consumer 族 (harness-creator の project-task-status / record-task-graph-knowledge
    # と同種) を planner 側 run-plugin-dev-plan にも同梱: project-task-status.py (TG-C09 status
    # live 投影) は verb 'project'、check-cycle-knowledge.py (依存 closure の循環検出 knowledge
    # ガード) は verb 'check' が ALLOWED_VERBS 外。SKILL.md(script_refs)/tests/schemas 参照の
    # 原子的更新を伴う後続 Change Governance 一括改名 PR まで PENDING (既存 check-* 群と同種)。
    "plugins/plugin-dev-planner/skills/run-plugin-dev-plan/scripts/project-task-status.py",
    "plugins/plugin-dev-planner/skills/run-plugin-dev-plan/scripts/check-cycle-knowledge.py",
    # run-skill-live-trial 初回投入 (anti-goodhart D2/D12): §4.3 (kebab-case) は満たすが
    # 接頭辞が <feature>-<role> 形 (live-trial-*) で verb が ALLOWED_VERBS 外。boot/send/
    # poll/status/verdict は trial セッションのライフサイクル語で許可動詞に対応語が無く、
    # backend は tmux 輸送層の版依存モジュール境界 (唯一の tmux 呼出点) の固有名。許可動詞化
    # は SKILL.md(script_refs)/references/tests 参照と同時に実施する後続 Change Governance PR
    # まで PENDING (notion-gmail-send / plugin-dev-planner と同種の「初回投入時の verb pending」扱い)。
    "plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-backend.py",
    "plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-boot.py",
    "plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-send.py",
    "plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-status.py",
    "plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-poll.py",
    "plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py",
    # system-spec-harness 初回投入: §4.3 (kebab-case) は満たすが verb が ALLOWED_VERBS 外。
    # compile (収集仕様→章立て仕様書へコンパイル) / apply (spec-state 遷移適用) / aggregate
    # (観点別 verdict を総合 verdict へ集約) は許可動詞に対応語が無い。許可動詞化は
    # SKILL.md(script_refs)/prompts/tests/agent 参照を原子的に更新する後続 Change Governance
    # 一括改名 PR まで PENDING (plugin-dev-planner check-* / notion-gmail-send emit-observable
    # と同種の「新規 plugin 初回投入時の verb pending」扱い)。
    "plugins/system-spec-harness/skills/run-system-spec-compile/scripts/compile-spec-doc.py",
    "plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py",
    "plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/scripts/aggregate-completeness.py",
    # extract-system-blueprint (新規 plugin 初回投入): ドメイン固有 verb (fetch/authz/browser/doc/
    # mermaid/layout/emit/recount) が SKILL.md/prompts/tests/EVALS/workflow-manifest に深く参照されるため、
    # 参照一括更新を伴う rename は後続 Change Governance PR まで PENDING 扱い (system-spec-harness と同種)。
    "plugins/extract-system-blueprint/scripts/fetch-snapshot.py",
    "plugins/extract-system-blueprint/scripts/authz-classify.py",
    "plugins/extract-system-blueprint/scripts/browser-render.py",
    "plugins/extract-system-blueprint/scripts/doc-emit.py",
    "plugins/extract-system-blueprint/scripts/mermaid-validate.py",
    "plugins/extract-system-blueprint/scripts/layout-template-dedup.py",
    "plugins/extract-system-blueprint/skills/assign-blueprint-fidelity-evaluator/scripts/emit-verdict.py",
    "plugins/extract-system-blueprint/skills/assign-blueprint-fidelity-evaluator/scripts/recount-palette-orphans.py",
    # ubm-goal-setting YouTube取込+相談グラフ初回投入: §4.3 (kebab-case) は満たすが verb が
    # ALLOWED_VERBS 外。index (成果物グラフ索引化) / consult (read-only グラフ相談) / run
    # (scheduler one-shot 実行体) / check (backfill 完全性の決定論ゲート・既存 check-* 族と同種)
    # は許可動詞に対応語が無い。youtube_provider.py は run-youtube-sync-oneshot.py / tests が
    # `import youtube_provider` する provider I/F 共有 module のためハイフン不可 (§4.3 例外・
    # company-master notion_config.py と同列の underscore 許容)。許可動詞化は SKILL.md
    # (script_refs)/workflow-manifest/tests/EVALS.json 参照を原子的に更新する後続
    # Change Governance 一括改名 PR まで PENDING。
    "plugins/ubm-goal-setting/scripts/index-harness-artifact-graph.py",
    "plugins/ubm-goal-setting/scripts/consult-harness-artifact-graph.py",
    "plugins/ubm-goal-setting/skills/run-ubm-youtube-ingest/scripts/run-youtube-sync-oneshot.py",
    "plugins/ubm-goal-setting/skills/run-ubm-youtube-ingest/scripts/check-youtube-backfill-completeness.py",
    "plugins/ubm-goal-setting/skills/run-ubm-youtube-ingest/scripts/youtube_provider.py",
    # dev-graph / system-dev-planner 投入 (マクロ/ミクロ二層 + verification-obligation 拡張):
    # domain 動詞 (promote/resolve/check/init/manage/schedule/reconcile/register/derive/record/
    # plan/sandbox/run) と bd-/gh- bridge, _common.py が ALLOWED_VERBS 外。SKILL.md script_refs /
    # hooks / manifest / test 参照を原子的に更新する後続 Change Governance PR (許可動詞化 or 一括
    # リネーム) まで PENDING。
    "plugins/system-dev-planner/scripts/promote-system-plan.py",
    "plugins/system-dev-planner/scripts/resolve-project-context.py",
    "plugins/system-dev-planner/scripts/check-implementation-readiness.py",
    "plugins/system-dev-planner/scripts/init-project-layout.py",
    "plugins/system-dev-planner/scripts/manage-system-plan-lock.py",
    "plugins/dev-graph/scripts/bd-bridge.py",
    "plugins/dev-graph/scripts/manage-worktree-lease.py",
    "plugins/dev-graph/scripts/gh-bridge.py",
    "plugins/dev-graph/scripts/schedule-graph.py",
    "plugins/dev-graph/scripts/_common.py",
    "plugins/dev-graph/scripts/reconcile-github-lifecycle.py",
    "plugins/dev-graph/scripts/resolve-repo-context.py",
    "plugins/dev-graph/scripts/register-package.py",
    # migrate-pipeline-improvement.py: 'migrate' は skill-governance-migration/scripts/migrate/*.py
    # と同種の domain 動詞で ALLOWED_VERBS 外。SKILL.md/CI/test 参照を原子的に更新する後続
    # Change Governance PR (許可動詞化 or リネーム) まで PENDING。
    "plugins/dev-graph/scripts/migrate-pipeline-improvement.py",
    # dev-graph 運用ループ v2 (node/sync/status verb 対応): domain 動詞 (sync/status/upsert) と
    # WAL transaction モジュール node_transaction.py (§4.3 underscore) が ALLOWED_VERBS 外。
    # 上記 dev-graph 群と同じく SKILL.md script_refs / README / test 参照を原子的に更新する
    # 後続 Change Governance PR (許可動詞化 or 一括リネーム) まで PENDING。
    "plugins/dev-graph/scripts/node_transaction.py",
    "plugins/dev-graph/scripts/node_body.py",
    "plugins/dev-graph/scripts/node_lifecycle.py",
    "plugins/dev-graph/scripts/registration_preflight.py",
    "plugins/dev-graph/scripts/registration_schema.py",
    "plugins/dev-graph/scripts/sync-graph.py",
    "plugins/dev-graph/scripts/status-graph.py",
    "plugins/dev-graph/scripts/upsert-node.py",
    "plugins/harness-creator/skills/run-build-skill/scripts/derive-route-build-obligations.py",
    "plugins/harness-creator/skills/run-build-skill/scripts/derive-verification-contract.py",
    "plugins/harness-creator/skills/run-build-skill/scripts/record-verification-evidence.py",
    "plugins/harness-creator/skills/run-build-skill/scripts/plan-verification-obligations.py",
    "plugins/harness-creator/skills/run-plugin-package-check/scripts/sandbox-plugin-lifecycle.py",
    "plugins/harness-creator/skills/run-plugin-package-check/scripts/run-pkg-015.py",
    "plugins/harness-creator/skills/run-skill-live-trial/scripts/plan-live-trials.py",
    # coverage_foundation.py: validate-coverage-matrix.py (500行分割 4例目) から
    # `from coverage_foundation import validate_foundation` される import 専用 support
    # module のため Python import 上ハイフン不可 (§4.3 恒久例外・node_transaction.py 等の
    # dev-graph 系 support module と同種)。
    "plugins/system-spec-harness/scripts/coverage_foundation.py",
}
