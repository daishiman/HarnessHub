---
status: confirmed
layer: feature-evidence
beads_ids:
  - HarnessHub-hls0
dev_graph_node_id: issue-prompt-only-line-budget-20260802
spec_impact: reflected
reviewed_at: 2026-08-02
---

# プロンプト成果物への行数ゲート限定 — 仕様反映受領書

## 1. 受領対象

`HarnessHub-hls0` は、一般コードとテストを一律に 500 行以下へ分割する
運用を廃止し、実行時コンテキストへ入る成果物だけへ上限を分離する変更である。

| 項目 | 値 |
| --- | --- |
| Beads | `HarnessHub-hls0` (CLOSED) |
| dev-graph node | `issue-prompt-only-line-budget-20260802` |
| 種別 | repository development tooling / NON_VISUAL |
| 実装の入口 | `plugins/skill-governance-lint/scripts/lint-skill-tree.py` |

変更後の契約は次のとおりである。

- `SKILL.md` 本文は既存どおり 300 行上限とする。
- skill の直下 `prompts/*.md` と `prompts/*.yaml` は 500 行上限とする。
- 一般コード、テスト、reference、template に一律の数値行数上限は設けない。
- コードの分割は変更理由、責務境界、公開契約、テスト容易性を根拠に判断する。

## 2. 仕様・設計への影響判定

**reflected（開発品質の仕様・設計に影響あり、製品機能への影響なし）**と判定した。

500 行での機械的なコード分割は、import 専用 module の増加、entry point 判定の
偽陽性、harness coverage の分母希釈を招いていた。今回、品質ゲートの対象を
「実際に prompt として読まれる Markdown/YAML」へ限定するため、既存の開発品質
契約そのものが変わる。一方で、Harness Hub の外部 API、DB schema、認証認可、UI、
Cloudflare deploy unit は変更しない。

## 3. 正規フローで反映した層

| 層 | 反映内容 |
| --- | --- |
| `system-spec/` | `dev-workflow.md` の qa-134 と `spec-state.json` に、コード非対象・SKILL 300 行・prompt 500 行の境界を確定した。 |
| `specs/` | `spec-harness-hub-requirements` を C02 writer で再取込し、`system-spec/spec-state.json` の source lineage を現行 digest へ更新した。 |
| `architecture/` | dev-workflow / testing-qa から、コード分割を行数でなく責務境界に基づける設計へ更新した。 |
| `docs/` | 本受領書と feature changelog に、判定・検証・参照先を記録した。 |
| `features/` | HLS0 は `parent_feature: null` の standalone issue のため、既存 feature 本文は変更しない。関連する開発品質の経緯は本証跡を正とする。 |
| `tasks/` | 既存 P01〜P13 は content-addressed（内容の hash で固定する）package の投影であり、HLS0 は新しい feature phase ではない。直接編集すると再現可能な digest を壊すため変更しない。全 19 package を再検証した。 |

## 4. 実装と回帰テスト

`lint-skill-tree.py` に `check_prompt_line_limits()` を追加した。直下の `prompts/`
だけを列挙し、`.md` / `.yaml` が 501 行以上なら `P0-prompt-line-limit違反` として
非 0 終了にする。`test_skill_governance_lint__lint_skill_tree.py` は、500 行の prompt
が通ること、501 行の prompt が止まること、501 行の Python が対象外であることを
実 fixture で固定する。

併せて、一般コードの 500 行上限を理由にしていた active なコメントとテスト説明を、
責務分離の理由へ置換した。動作、公開 CLI、JSON 出力、plugin package 契約は変えていない。

## 5. 品質ゲート

| Gate | 結果 |
| --- | --- |
| task specification | 19 feature package、各 P01〜P13、全件 `status: pass` / `violations: []` |
| focused regression | 186 passed (`skill tree`、plugin package、completeness の変更対象) |
| skill tree | `plugins/skill-governance-lint/skills` を実走査して PASS |
| plugin package / completeness | 23 plugin、blocking failure 0 / complete |
| document line limit | 506 文書、300 行上限、違反 0 |
| system-spec | coverage matrix: complete + foundation PASS |
| graph / evidence | schema、source digest、HLS0 evidence ref、artifact placement は PASS |
| diff hygiene | `git diff --cached --check` は PASS |

本受領書は 500 行未満である。今回の数値ゲートは prompt と正規文書へ限定しており、
状態 snapshot の `system-spec/spec-state.json` は schema に従う単一 JSON 正本のため
行数による分割対象にしない。

## 6. 中学生向けの説明

長いプログラムを、長さだけを理由に細かく切ると、かえって部品が増えて分かりにくく
なることがあります。今回の変更は、「先生に渡す説明書」は短く保つ一方で、プログラムは
役割が分かれるときだけ分けるルールに直したものです。説明書のうち AI がそのまま読む
指示文は、長すぎると大事なことを見落としやすいため、500 行で止めます。

## 7. 技術者向けの説明

品質属性を file-length という代理指標へ畳み込まず、prompt context budget と source-code
maintainability を別契約に分離した。`prompts/` の直下 Markdown/YAML だけを deterministic
scan し、境界値 500/501 と非対象 Python を fixture 化して、対象拡大による偽陽性を防ぐ。
既存 feature package は immutable な promotion digest で検証するため、standalone issue の
write-back を task projection へ直接注入せず、system-spec / architecture / evidence receipt /
Beads の各正本へ記録する。

## 8. 残課題

- `HarnessHub-2mor` は既存の support module と harness coverage floor の扱いを追跡する。
  今回は、今後の機械的な 500 行分割という発生源を取り除いたが、既存データの評価は別課題である。
- HLS0 の受入条件に関する未解決事項はない。draft PR のレビューと merge は承認フローとして残る。
