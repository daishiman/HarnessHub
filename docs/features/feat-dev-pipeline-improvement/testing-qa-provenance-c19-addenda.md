---
status: active
layer: architecture-addendum
title: testing-qa 追補 — system-spec provenance と C19 受理境界
parent: architecture/harness-hub-testing-qa.md
related: ["HarnessHub-o4zi", "HarnessHub-iys4"]
updated_at: "2026-08-09"
---

# testing-qa 追補: system-spec provenance 復旧と live-trial 受理境界

本ファイルは `architecture/harness-hub-testing-qa.md` の 300 行上限を守るための責務分離先である。概要は親ファイル、詳細は本追補と [o4zi 仕様反映受領書](./o4zi-system-spec-import-heading-contract-spec-reflection-receipt.md) を参照する。

## 2026-08-08 system-spec provenance 復旧と live-trial 受理境界

- U1〜U9 の foundation coverage は、新しい要件文を作って埋めない。既存の
  `qa-012`〜`qa-014` と `appr-001` の記録済みユーザー発言だけを、正規 transition writer
  から `qa-foundation-u1`〜`qa-foundation-u9` へ結び付ける。
- 受理は `--require-complete --require-foundation` coverage gate、source citation gate、
  compiler 関連 test が同時に PASS する場合に限る。compiler が生む無関係な章差分は
  復旧差分と混ぜない。
- C19 OUT1 の「ロジック複製 0」は、elicitation/compile の処理実装を dev-graph 側に
  二重実装しない意味である。確定済み source artifact の本文を node body へ verbatim
  import することは lineage と本文の同一性を保つ正規 R3 契約であり、複製ロジックと
  判定しない。
- 最終 graph schema gate は baseline failure を許容しない。新契約で検出した旧 artifact は
  標準見出しへ移行し、`valid=true`、violations 0、readiness complete を受入条件とする。
