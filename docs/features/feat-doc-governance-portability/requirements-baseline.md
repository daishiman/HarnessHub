---
status: draft
layer: requirements-baseline
task: SYS-DOC-GOVERNANCE-PORTABILITY-P01
parent_feature: feat-doc-governance-portability
source: system-spec/dev-workflow.md (qa-070, appr-008)
goal_spec: .dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/goal-spec.json
feature_context_digest: "sha256:6855a739f483347401636b9254be473536ac2d9168cc24470f1abf05bd9286fb"
---

# 要件ベースライン — qa-070 ドキュメント規約 2 件・3 検査スコープ

feat-doc-governance-portability の P02 以降の全 phase が参照する要件正本の転記。
goal-spec.json の各項目を逐語一致で固定する (再解釈・要約・欠落を禁止)。

## 出典

- 仕様正本: `system-spec/dev-workflow.md` の qa-070 (appr-008 承認)。**参照のみ**とし、
  条文本文は本書へ複製しない (single-writer-boundary: 情報は単一正本を参照する)。
- goal-spec: frontmatter `goal_spec` の content-addressed package 内 JSON
  (feature_context_digest は frontmatter に記載)。

## purpose (逐語)

qa-070 (appr-008 承認) で確定したドキュメント規約 2 件 — 仕組みとナレッジのオン・オフ分離・1 文書 300 行上限 — を機械的に強制する検査群を実装し、G1 (仕組みの持ち出しによる配布・運用効率)・G4 (fail-closed 品質ゲート)・G5 (ドキュメント管理の持続性) を支える

## goal (逐語)

3 検査 (300 行 lint・仕組み-ナレッジ境界検査・移植導線 opt-in 検査) が CI で fail-closed に動作し、既存超過 6 文書の allowlist は縮小のみ許す ratchet で管理され、再実行しても同じ結果 (冪等) になる状態

## scope_in (逐語・3 件) と 3 検査スコープの対応

| # | scope_in (逐語) | 対応する検査 |
|---|---|---|
| 1 | markdown 正本文書 (system-spec 章・architecture・features・tasks・docs) の 300 行上限 fail-closed CI lint (既存超過 6 文書は縮小のみ許す remediation allowlist ratchet 付き) | 検査(1) 300 行 fail-closed lint と 6 文書 allowlist ratchet — `scripts/lint-doc-line-limit.py` |
| 2 | 仕組み側ファイル (plugins/・.claude/skills/ 等) への repo 固有ナレッジ (固有 node id・固有 path・固有 qa 番号) hard-coded 参照の検査 | 検査(2) 仕組みファイルの hard-coded ナレッジ参照検査 — `scripts/lint-mechanism-knowledge-boundary.py` |
| 3 | extract-blueprint / install-bundle の『仕組みのみ既定 (オン)・ナレッジ同梱は明示 opt-in (オフ既定)』検査 | 検査(3) 移植チャネルの mechanism-only 既定 / knowledge opt-in 検査 — `scripts/lint-portability-knowledge-optin.py` |

## scope_out (逐語・4 件)

1. 規約自体の変更 (qa-070 で確定済み)
2. 既存超過 6 文書の分割実施 (issue-doc-granularity-remediation-20260722 / HarnessHub-3d8 側)
3. Hub プロダクト本体機能 (Web/API/DB) の変更
4. dev-graph への新 verb 追加

## acceptance (逐語・4 件)

1. 300 行超過の新規違反が CI で fail-closed に遮断され、allowlist は既存 6 文書のみ・縮小のみ許す ratchet として検査される
2. 仕組み側ファイルへの repo 固有ナレッジ hard-coded 参照を検出する検査が存在し、検出時に exit 非 0 で停止する
3. extract-blueprint / install-bundle がナレッジを既定で含めず、明示 opt-in なしの同梱を検査が遮断する
4. 3 検査が CI ゲートへ組み込まれ、同一入力での再実行が差分 0 に収束する (冪等)

## quality_constraints (逐語・id 単位・4 件)

- **fail-closed-lint**: 300 行上限 lint・仕組み-ナレッジ境界検査・移植導線 opt-in 検査の 3 検査は、qa-070 の『超過を fail-closed の CI lint で遮断する』原則に従い、検出時に exit 非 0 で停止する fail-closed とし、警告のみで通過させる soft lint にしない。
- **idempotent-verification**: 3 検査は goal の『再実行しても同じ結果 (冪等) になる状態』および qa-070 が明示的に踏襲する qa-067 の冪等 migration・beads 起票パターンに従い、同一入力での再実行が差分 0 に収束する冪等な検査として実装する。
- **single-writer-boundary**: 仕組み側ファイルへのナレッジ焼き込みや、ナレッジ側への仕組みロジック複製など『境界を跨ぐ複製』を新設しない (qa-070)。文書分割時も index/一覧表からの参照で辿れる形を維持し、情報を複製せず単一の正本を参照する構造を守る。
- **digest-immutability**: 既存の confirmed 文書・remediation allowlist の digest を不要に失効させる変更を避ける。300 行 lint の allowlist は既存超過 6 文書に限定し縮小のみ許す ratchet として管理し、対象外の確定済み文書へ digest 変動を招く書き換えを行わない。

## remediation allowlist の移行対象 (P08 スコープの初期記載)

`issues/sys-doc-granularity-remediation-20260722.md` (HarnessHub-3d8) に記載の既存超過
6 文書 (P08 spec 記載の 2026-07-22 実測値):

| path | baseline (2026-07-22) |
|---|---|
| docs/security-spec.md | 910 |
| docs/backend-spec.md | 434 |
| docs/features/feat-hub-foundation/design-review-notes.md | 366 |
| docs/features/feat-dev-pipeline-improvement/design.md | 365 |
| docs/features/feat-stage0-distribution-gate/design-review-notes.md | 320 |
| docs/features/feat-hub-foundation/final-review-notes.md | 303 |

分割実施は scope_out (HarnessHub-3d8 側)。P08 は baseline 遡及付与のみを行い、6 文書の
内容・digest を変更しない。ratchet の縮小追随により、300 行以下へ縮小済みの文書は
allowlist から卒業 (エントリ削除) する — 卒業は「縮小のみ許す」の最強形であり適合。

## P02 で確定すべき据置事項 (4 点)

1. **3 検査の入出力契約** — 引数・exit code・検出条件・JSON 出力形状。
2. **allowlist schema** — `scripts/doc-line-limit-allowlist.json` の構造と ratchet 方式
   (実測が baseline 超で fail-closed、baseline 未満へ縮小したら baseline も追随)。
3. **hard-coded 参照検出の false-positive 除外基準** — 制御フロー・既定値のリテラル
   (FAIL) と、コメント・docstring 内の根拠引用 (PASS) の判定基準。
4. **CI 配線先** — `.github/workflows/governance-check.yml` のどの job へ fail-closed
   で配線するか。

→ 4 点とも P02 成果物 `docs/features/feat-doc-governance-portability/design.md` で確定する
(確定結果の正本は design.md であり、本書へは複製しない)。
