closure digest を手作業で推測しないでください。repository の正規 helper
`plugins/harness-creator/skills/run-skill-live-trial/scripts/build-skill-behavior-closure.py`
を使って current target Skill closure を機械計算してください。必要なら `--help` を確認し、
指定済みの `0467a3057442a5a9a4ad0e1dc8f00eb15d475153ee8486a4dfd9f7458380831b`
との一致だけを記録します。

その後は none fixture の goal-seek progress / intermediate を pending・null evidence なしで完了し、
両 audit pass、両 binding、最終 digest 一致、最終 noop 証拠を確認して status.json を書いて
終了してください。新しい検証アルゴリズムは作らないでください。
