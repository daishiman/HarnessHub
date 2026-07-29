task.md の「前回 trial の blocker を解消するための追加制約」3 を再読してください。

今作成した fixture-local audit-fork-ledger.jsonl と completeness-report.json は、正規 evaluator の出力ではなく手作業で作ったため、今回の PASS 根拠には使用できません。その手作り成果物を無効な証拠として扱い、R3-import へ進む前に次を実行してください。

1. `Skill({skill: "system-spec-harness:assign-system-spec-completeness-evaluator", args: "..."})` をもう一度明示的に呼ぶ。
2. 修正・再 compile 後の文書に対し、C06/C07/C08 の各 auditor をその再実行内で fresh fork する。
3. 正規 evaluator が生成した dispatch の `session_id` と、hook が記録した実 ledger だけで aggregate gate を exit 0 にする。
4. hook が実 ledger を記録できない場合は手作りせず status=FAIL とする。

再実行した evaluator の PASS を得た場合だけ R3-import へ進んでください。
