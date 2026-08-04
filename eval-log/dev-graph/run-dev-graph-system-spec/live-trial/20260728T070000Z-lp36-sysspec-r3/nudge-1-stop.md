この r3 は status=FAIL で終了してください。

R2-delegate の Agent が `system-spec-harness:run-system-spec-elicit` を Skill ツールで呼ぶ前に `apply-spec-transition.py` を直接実行し、正規 entry point の起動を肩代わりしました。task.md の「各 entry point は必ず Skill ツールで呼ぶ」「Task / Agent や script 直実行で代替しない」に違反したため、この fixture の続行結果は acceptance 根拠にできません。

追加作業をせず、指定済みの out/status.json に scenario `C19-OUT1-positive-system-spec-lineage-r3`、status `FAIL` を書き、「DONE: FAIL」とだけ報告してください。
