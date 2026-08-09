---
status: recorded
layer: feature-spec-reflection
feature_id: feat-dual-catalog-web
graph_node_id: issue-hub-cwv-tbt-over-budget-20260724
beads_id: HarnessHub-aqi
spec_impact: reflected
reviewed_at: "2026-08-10"
---

# Catalog validator load boundary — 仕様反映受領書

## 結論

client bundle と実行順の設計に影響があるため、`system-spec/`・`specs/`・`architecture/`・`features/`・`tasks/`・`docs/` へ反映した。API、DB、認証認可、cache の意味は変えない。本番 TBT ≤ 200ms は fresh CWV 待ちのため `HarnessHub-aqi` を継続する。

## 中学生向けの説明

エラーの返事なのに、答えの細かい採点表まで先にダウンロードしていました。今回は「成功した返事のときだけ採点表を取りに行く」ようにし、成功したときの厳しいチェックは残しました。画面が運ぶ荷物を減らしつつ、間違ったデータを通さない変更です。

## 専門的な説明

`http-adapter.ts` は非 2xx を分類した後でのみ、薄い `response-schemas.ts` を namespace dynamic import する。2xx では `response.json()` と schema chunk load を `Promise.all` で重ね、Zod parse を fail-closed に維持する。Next.js の package import 最適化対象にも schema package を追加する。

## 反映先

| 層 | 内容 |
|---|---|
| `system-spec/` | C04 knowledge compile による 4 章更新と同一 PR で、変更全体の正規 compile 状態を保持。catalog の製品要件 ID は変えない。 |
| `specs/` | validator load boundary、検証維持、非変更契約を追補。 |
| `architecture/` | frontend adapter の遅延読込責務を追補。 |
| `features/` | dual catalog の性能境界と CWV 残条件を追補。 |
| `tasks/` | P10/P12/P13 のレビュー・文書・PR handoff を追補。 |
| `docs/` | frontend 注意点、ADR の陳腐化訂正、本受領書を反映。 |

## 検証と残課題

- validator load boundary の focused Vitest、Hub typecheck、task-spec gate、doc line gate を draft PR 前に再実行する。
- 401/403/fatal polling 即時停止と visibility 復帰再開は `HarnessHub-h2pe`、marketplace 未認証 consumer 経路は `HarnessHub-dctf` へ分離した。
- `HarnessHub-aqi` は本番 `hub-cwv` の TBT ≤ 200ms 確認後に close する。
