#!/usr/bin/env bash
# CI のうちローカルで安全に再実行できる機械チェックを一括実行する。
# pre-push hook / 手動実行 (bash scripts/run-ci-checks.sh) の双方から呼ばれる SSOT。
# 内容の良し悪し (LLM 自由度領域) は判定対象外。構造・命名・SSOT・symlink drift のみ。
# CI-only の呼び出しは scripts/lint-ci-local-check-parity.py が引数形まで突合し、
# 副作用・認証・non-blocking 等の理由付き allowlist 以外を fail-closed で遮断する。
#
# 失敗したチェックを蓄積して全て表示するため、最初の失敗で抜けず continue する。
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAILED=()
PASSED=()
WARNED=()

# ── python3 の解決 (HarnessHub-sl6o) ──
# git hook はログインシェルの rc を読まないため PATH が手動実行と異なり、jsonschema を
# 持たない python3 が選ばれて validate-plugin-packages だけが hook 文脈で FAIL していた。
# PATH 順ではなく「必要な依存を実際に import できるか」で選び、決定した interpreter を
# `python3` として PATH 前置する。以降の literal `python3` 行も、make / 子 bash スクリプトも
# 同じ interpreter に解決される。
# 解決できない場合は無言 fallback せず FAILED に積む (fail-closed。棄却理由は lib 側が列挙)。
# shellcheck source=scripts/lib/resolve-python.sh
. "$ROOT/scripts/lib/resolve-python.sh"
if RESOLVED_PYTHON="$(hh_resolve_python3 --required "jsonschema yaml")"; then
  hh_shim_python3 "$RESOLVED_PYTHON"
  trap 'rm -rf "${HH_PYTHON_SHIM_DIR:-}"' EXIT
  echo "[run-ci-checks] python3 = $HH_PYTHON ($("$HH_PYTHON" -c 'import sys; print(sys.version.split()[0])'))"
else
  FAILED+=("resolve-python (依存を満たす python3 が見つからない)")
fi

# SS-201 段階導入: 新規拡張 plugin の既存違反は warning 止まり。
# STRICT_ALL_PLUGINS=1 で error 化 (将来の既定化を見据えた opt-in)。
STRICT_ALL_PLUGINS="${STRICT_ALL_PLUGINS:-0}"

run() {
  local label="$1"; shift
  if "$@"; then
    PASSED+=("$label")
  else
    FAILED+=("$label")
  fi
}

# 段階導入用: 失敗しても STRICT_ALL_PLUGINS=1 でない限り warning 扱い
run_soft() {
  local label="$1"; shift
  if "$@"; then
    PASSED+=("$label")
  elif [ "$STRICT_ALL_PLUGINS" = "1" ]; then
    FAILED+=("$label")
  else
    echo "[WARN] $label failed (段階導入中: STRICT_ALL_PLUGINS=1 で error 化)" >&2
    WARNED+=("$label")
  fi
}

# ── 構造・命名・frontmatter ──
run "guard-change-category"                 python3 scripts/guard-change-category.py --base origin/main --bypass-cooldown
run "lint-script-naming"                   python3 scripts/lint-script-naming.py
run "lint-artifact-placement --self-test"  python3 scripts/lint-artifact-placement.py --self-test
run "lint-artifact-placement"              python3 scripts/lint-artifact-placement.py
run "lint-doc-line-limit"                  python3 scripts/lint-doc-line-limit.py --repo-root . --ratchet-base origin/main
run "lint-doc-internal-link-integrity"     python3 scripts/lint-doc-internal-link-integrity.py --repo-root . --max-violations 302
run "lint-mechanism-knowledge-boundary"    python3 scripts/lint-mechanism-knowledge-boundary.py --repo-root .
run "lint-portability-knowledge-optin"     python3 scripts/lint-portability-knowledge-optin.py --repo-root .
# workflow の step gate 自体が壊れていないかを pre-push 段で検査する。step-level `if` から同一 step の
# `env:` を参照すると Actions の評価順 (if → env) で式が恒久 false になり、secret 投入後も step が
# 永久 skip される (= 検査が存在しないのと同じ緑)。CI 側 governance-check.yml と同一実装。
run "lint-workflow-step-guard --self-test" python3 scripts/lint-workflow-step-guard.py --self-test
run "lint-workflow-step-guard"             python3 scripts/lint-workflow-step-guard.py
run "lint-ci-local-check-parity"           python3 scripts/lint-ci-local-check-parity.py
# 必須ゲート台帳↔実 workflow の parity (HarnessHub-ic7w)。read-only・外部依存なしの静的検査で、
# gh 認証を要する --check-protection は付けない (認証不在が緑になる経路を作らない)。
run "validate-required-gates"              python3 scripts/validate-required-gates.py
# tier-decision.json の生成 (writer) は CI 側だけで行い、ここでは既存記録の妥当性だけ見る。
# 記録が 1 件も無い local では「検査 0 件」と帰属を明示して緑になる (0 件を全通過と読ませない)。
run "validate-tier-decision"               python3 scripts/validate-tier-decision.py --scan eval-log/verification-tier
run "lint-skill-description (harness-creator)" python3 scripts/lint-skill-description.py
run "lint-dependency-direction (harness-creator)" python3 scripts/lint-dependency-direction.py --skills-dir plugins/harness-creator/skills
run "lint-dependency-direction (all)"      python3 scripts/lint-dependency-direction.py --skills-dir plugins
run "lint-external-refs"                   python3 scripts/lint-external-refs.py --skills-dir plugins/harness-creator/skills --allowed-prefix .claude/ --allowed-prefix eval-log/ --allowed-prefix references/ --allowed-prefix plugins/ --allowed-prefix scripts/ --allowed-prefix doc/ --fail-on-external

# ── SSOT / drift ──
run "lint-feedback-protocol --strict"      python3 scripts/lint-feedback-protocol.py --strict
run "lint-content-review (all)"            python3 scripts/lint-content-review.py --all
run "lint-live-trial-verdict (all)"        python3 scripts/lint-live-trial-verdict.py --all
run "live-trial digest provenance"         python3 scripts/lint-live-trial-verdict.py --check-provenance origin/main
run "lint-feedback-contract (all)"         python3 scripts/lint-feedback-contract.py --all
run "lint-prompt-contract-drift (all)"     python3 scripts/lint-prompt-contract-drift.py --all
run "lint-vendored-ssot"                   python3 scripts/lint-vendored-ssot.py
run "lint-legacy-plugin-name"              python3 scripts/lint-legacy-plugin-name.py
run "lint-runtime-portability"             python3 scripts/lint-runtime-portability.py
# harness-creator-kit-ci.yml では lint-runtime-portability の直後に置かれているが
# run-ci-checks には非包含だった。README の bash フェンスを触る変更が pre-push を
# 素通りし CI で初めて落ちた (2026-07-28)。現在は個別結線に加え
# lint-ci-local-check-parity が同型の将来 drift を集合差で遮断する。
run "lint-readme-plugin-root-portability"  python3 scripts/lint-readme-plugin-root-portability.py
run "lint-company-master-vendored-deps"    python3 scripts/lint-company-master-vendored-deps.py
run "lint-knowledge-layout"                python3 scripts/lint-knowledge-layout.py
# 同じ「CI にあってローカルに無い」型の 2 例目 (同日中の再発)。新規 script を 1 本足すと
# llm_eval 被覆率が floor を割り CI verify が落ちる。引数なしの bare 実行は PASS を返すため、
# script 名だけの突合では検出できない (--ratchet の有無で意味が変わる)。読み取り専用。
run "validate-harness-coverage --ratchet"  python3 scripts/validate-harness-coverage.py --ratchet
run "validate-harness-coverage --self-test" python3 scripts/validate-harness-coverage.py --self-test
run "check-scripts-drift"                  bash scripts/check-scripts-drift.sh
run "build-plugins-from-harness --check-only" python3 scripts/build-plugins-from-harness.py --check-only
run "native-surfaces-check"                 make native-surfaces-check
# ── discovery 派生台帳 parity (roster / llm-coverage が discovery と一致するか) ──
# governance-check.yml と対称。この2つが run-ci-checks 非包含だと改名/skill 変更時に
# pre-push を素通りして CI で初めて露見する (2026-07-02 harness-creator 改名で criteria
# roster STALE を CI が検出・pre-push 緑だった事故の恒久対策)。両生成器を書き込みなし
# モード (roster=引数なし / llm-coverage=--check) で走らせ stale を先行 fail-closed 検出。
run "criteria-roster-parity"               python3 tests/criteria/build_criteria_roster.py
run "llm-coverage-parity"                  python3 scripts/validate-llm-coverage.py --all --check
run "lint-ssot-duplication --strict"       python3 plugins/harness-creator/skills/run-build-skill/scripts/lint-ssot-duplication.py --plugin-dir plugins/harness-creator --strict
run "lint-goal-seek --self-test"           python3 plugins/harness-creator/skills/run-build-skill/scripts/lint-goal-seek.py --self-test
run "lint-goal-seek conformance"           python3 plugins/harness-creator/skills/run-build-skill/scripts/lint-goal-seek.py --skills-dir plugins/harness-creator/skills

# ── completeness / frontmatter (harness-creator + prompt-creator) ──
run "lint-skill-tree (harness-creator)"      python3 plugins/skill-governance-lint/scripts/lint-skill-tree.py --skills-dir plugins/harness-creator/skills
run "lint-skill-tree (prompt-creator)"     python3 plugins/skill-governance-lint/scripts/lint-skill-tree.py --skills-dir plugins/prompt-creator/skills
run "lint-skill-completeness (harness-creator)" python3 plugins/skill-governance-lint/scripts/lint-skill-completeness.py --skills-dir plugins/harness-creator/skills
run "validate-frontmatter --self-test"     python3 plugins/skill-governance-lint/scripts/validate-frontmatter.py --self-test
run "validate-frontmatter (harness-creator)" python3 plugins/skill-governance-lint/scripts/validate-frontmatter.py --skills-dir plugins/harness-creator/skills
run "validate-frontmatter (prompt-creator)" python3 plugins/skill-governance-lint/scripts/validate-frontmatter.py --skills-dir plugins/prompt-creator/skills
run "lint-skill-name (prompt-creator)"     python3 plugins/skill-governance-lint/scripts/lint-skill-name.py --skills-dir plugins/prompt-creator/skills
run "lint-skill-description (prompt-creator)" python3 plugins/skill-governance-lint/scripts/lint-skill-description.py --skills-dir plugins/prompt-creator/skills
run "lint-skill-completeness (prompt-creator)" python3 plugins/skill-governance-lint/scripts/lint-skill-completeness.py --skills-dir plugins/prompt-creator/skills

# ── completeness / frontmatter (全 plugin 段階導入: SS-201) ──
# harness-creator / prompt-creator は上の strict 行が正。その他 plugin は
# 既存違反の棚卸しが済むまで run_soft (warning) で観測し breakage を避ける。
for skills_dir in plugins/*/skills; do
  [ -d "$skills_dir" ] || continue
  plugin="$(basename "$(dirname "$skills_dir")")"
  case "$plugin" in
    harness-creator|prompt-creator) continue ;;  # 上で strict 検査済み
  esac
  run_soft "lint-skill-tree ($plugin)"         python3 plugins/skill-governance-lint/scripts/lint-skill-tree.py --skills-dir "$skills_dir"
  run_soft "lint-skill-completeness ($plugin)" python3 plugins/skill-governance-lint/scripts/lint-skill-completeness.py --skills-dir "$skills_dir"
  run_soft "validate-frontmatter ($plugin)"    python3 plugins/skill-governance-lint/scripts/validate-frontmatter.py --skills-dir "$skills_dir"
done

# ── rubric 正本-派生照合 (elegant-review run-20260610-175852 で修復・配線) ──
# check-rubric-sync は 2026-05-24 に「チェックリスト化のみで実体未配線」のまま腐った前例があり、
# 配線漏れ自体が今回の根本原因 (SS-205/SS-213)。strict 配線で再発を機械遮断する。
run "check-rubric-sync (L0/L2 rubric drift)" python3 plugins/skill-governance-lint/scripts/check-rubric-sync.py
# LS-215: governance lint scripts 自身の削除済み root (creator-kit) 残存参照を fail-closed 検出
run "lint-stale-root-refs (governance scripts)" python3 plugins/skill-governance-lint/scripts/lint-path-canonical.py --scripts-dir plugins/skill-governance-lint/scripts
# rubric_refs 解決検査は registry/symlink 由来の既存違反棚卸しが済むまで soft 観測
run_soft "lint-rubric-refs-exist"          python3 plugins/skill-governance-lint/scripts/lint-rubric-refs-exist.py

# ── governance-lint 回帰テスト (MD-208/LS-211/LS-215 の挙動保証) ──
if python3 -c "import pytest" 2>/dev/null; then
  run "pytest (governance-lint regressions)" python3 -m pytest plugins/skill-governance-lint/tests/ -q
else
  echo "[Warn] pytest 不在のため governance-lint 回帰テストを skip (CI では harness-creator-kit-ci.yml が実行)"
fi

# ── knowledge loop ──
run "lint-knowledge-loop --self-test"      python3 plugins/harness-creator/skills/run-build-skill/scripts/lint-knowledge-loop.py --self-test
run "lint-knowledge-loop --store-only"     python3 plugins/harness-creator/skills/run-build-skill/scripts/lint-knowledge-loop.py plugins/harness-creator --store-only --strict

# ── manifest sanity (jq) ──
if command -v jq >/dev/null 2>&1; then
  run "marketplace.json plugins>=1" jq -e '.plugins | length >= 1' .claude-plugin/marketplace.json
  for manifest in plugins/*/.claude-plugin/plugin.json; do
    run "manifest:$manifest" jq -e '.name and .version and .description' "$manifest"
  done
else
  echo "[WARN] jq 未インストールにつき manifest 検証 skip"
fi

# ── marketplace ↔ plugins / bundles 双方向整合 (MK-001..003 / BD-001) ──
# 実体ディレクトリ起点で「全 plugin が marketplace.json + bundles.json 両方に登録」を
# fail-closed 検査する。配線漏れで腐ると登録漏れ (notion-gmail-send 未表示) を永久に
# 見逃す自己強化ループに陥るため hard 配線で再発を機械遮断する (F4/F5)。
run "validate-plugin-completeness (MK/BD)" python3 scripts/validate-plugin-completeness.py
run "lint-plugin-lint-coverage"            python3 scripts/lint-plugin-lint-coverage.py
# 同じ「CI にあってローカルに無い」型の 3 例目 (同日中の 3 度目)。名前が
# validate-plugin-completeness と紛らわしいが別物で、こちらは package-contract
# (PKG-002..014) を検査する。plugin-root scripts/ に shebang 付き .py を
# 実行ビット無しで足すと PKG-007 が blocking FAIL になる。
run "validate-plugin-packages (PKG-*)"     python3 scripts/validate-plugin-packages.py
run "contract-intake-enum-ssot"            python3 scripts/contract-intake-enum-ssot.py

# ── test discovery coverage (全 test が CI 実行で到達するか) ──
# elegant-review 2026-06-30 (LS-F1/SS-02/SS-05): tests/・plugins/ 以外 (scripts/・doc/・
# repo-root 直下) に置いた test は CI の探索 2 機構の境界外で無言未実行になりうる。
# 実 test 集合 ⊆ CI 到達集合 を fail-closed 検査し silent-skip を loud failure 化する。
run "lint-test-discovery-coverage"         python3 scripts/lint-test-discovery-coverage.py

# ── git hook 配線 (hook が「存在するのに動いていない」状態の検知) ──
# core.hooksPath はリポジトリに 1 つしか設定できず、beads の .beads/hooks と repo の
# .githooks が競合する。片方が選ばれるともう片方の hook は無言で死ぬため、失敗が
# 起きず気づけない (本検査の導入前、.githooks/pre-push の CI 等価チェックは実際に
# 死んでいた)。CI ではファイル整合を fail-closed 検査し、ローカル設定 (core.hooksPath)
# は pre-push 側の run-repo-guards.sh が --check-local-config 付きで検査する。
run "validate-git-hooks-wiring"            python3 scripts/validate-git-hooks-wiring.py

# ── サマリ ──
echo
echo "========================================"
echo "PASS: ${#PASSED[@]} / WARN: ${#WARNED[@]} / FAIL: ${#FAILED[@]}"
echo "========================================"
if (( ${#WARNED[@]} > 0 )); then
  echo "Warned checks (段階導入中、STRICT_ALL_PLUGINS=1 で error 化):"
  for w in "${WARNED[@]}"; do echo "  - $w"; done
fi
if (( ${#FAILED[@]} > 0 )); then
  echo "Failed checks:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi
echo "All locally reproducible CI checks passed (reasoned CI-only allowlist verified)."
exit 0
