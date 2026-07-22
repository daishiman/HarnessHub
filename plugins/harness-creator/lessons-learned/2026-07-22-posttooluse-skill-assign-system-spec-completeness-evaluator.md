---
date: 2026-07-22
trigger_event: PostToolUse
tool: Skill
severity: medium
capability: skill-invoke
---

## observation

最終確定依頼: system-spec/ 一式 (qa-070 反映後) の completeness report を独立検証の上で確定・保存してほしい。監査 3 軸はすべて完了済み: (1) C07 マトリクス網羅性 = PASS (54 セル未収集 0・qa_ref dangling 0・集約一致)、(2) C08 出典鮮度 = PASS (17 target 全件一致・low 3 件は issue-source-freshness-ops-20260722 へ起票済み

## hypothesis

(自動記録: 失敗パターンを検出。根本原因は要 human triage)

## proposed_action

- 当該 capability に対する rubric 強化 / validator 追加を検討
- 再現条件を別 issue に起票
