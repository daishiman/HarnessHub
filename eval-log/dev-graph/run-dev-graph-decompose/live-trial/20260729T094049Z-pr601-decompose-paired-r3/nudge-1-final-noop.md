監査の時系列を補正してください。

beads fixture は 2 回目の target Skill 呼出し後、confirmation_evidence digest の補正 patch で
final persisted node が更新されています。このまま none fixture へ進まず、補正後の最終 graph を
読み直して target Skill を同じ args で再度 Skill ツール呼出しし、全 5 node が
operation=noop / write_count=0 になることを transcript に残してください。その後の beads graph と
audit が一致することも再確認してください。

none fixture でも、2 回目の target Skill 呼出し後に digest や node を補正した場合は、完了前に
補正後の最終 graph を対象として target Skill をもう一度 Skill ツール呼出しし、全 5 node の
noop / write_count=0 を確認してください。直接 upsert-node.py を並べるだけでは target Skill
再実行の代用にしないでください。
