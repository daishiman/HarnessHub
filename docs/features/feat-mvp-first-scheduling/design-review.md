---
status: confirmed
layer: feature-design
task: SYS-MVP-FIRST-SCHEDULING-P03
parent_feature: feat-mvp-first-scheduling
feature_package_id: feature-package/feat-mvp-first-scheduling
review_target: docs/features/feat-mvp-first-scheduling/design.md
requirements_baseline: docs/features/feat-mvp-first-scheduling/requirements-baseline.md
architecture_refs: [arch-harness-hub-dev-workflow]
reviewed_at: "2026-07-23"
reviewer: independent-design-reviewer (P02 非関与の独立 context subagent)
---

# feat-mvp-first-scheduling 設計レビュー (P03)

> **位置づけ**: P02 design.md を P02 非関与の独立視点でレビューし、実装 (P05) 着手可否を判定する。レビューは実測 (対象 script・schema・manifest の読解と検証コマンド実行) に基づき、伝聞や設計文書の自己申告を根拠にしない。

## 1. レビュー方法

- レビュー担当: 独立 context の設計レビュー subagent (P02 設計の作成者 context を共有しない)。
- 入力: design.md / requirements-baseline.md / schedule-graph.py / bd-bridge.py / graph-node.schema.json / validate-graph-schema.py / parity manifest 実物 / 既存テスト群。
- 検証手段: 設計中の「実測事実 (§1 F-1〜F-7)」を対象ファイルで逐一照合し、schema 検査挙動 (F-4) は validate-graph-schema.py の実挙動 (jsonschema 経路・fallback 経路の両方) を実行して確認した。

## 2. 必須 3 観点の判定 (P03 Required evidence)

| # | 観点 | 判定 | 根拠 |
|---|---|---|---|
| R-1 | **単一 writer 原則** — schedule-graph.py が着手候補順序の唯一の決定点であること | **承認** | 設計 §3 は順序決定を `schedule-graph.py:298` の candidates 構築 1 箇所に限定し、batches()/features 分割は順序を継承するのみ (F-7 照合済み)。§4 の bd-bridge 側ソートは「表示順の整合 (SI-3)」であり、正本は graph node の mvp_alignment を直接参照する schedule-graph.py 側と明記されている。順序決定点は増えない。 |
| R-2 | **後方互換** — MVP metadata 未設定 node の fallback で既存挙動から劣化しないこと | **条件付き承認 → 修正反映を確認し承認** | 方針 (optional/nullable schema・未設定 rank 2 で deferred より前・INV-3) は妥当。ただし初版 design.md には findings 1〜4 の曖昧さ・事実誤認があり、条件付き承認とした。修正反映 (§3 参照) を確認済み。 |
| R-3 | **qa-066 非退行** — 既存品質ゲート要件と衝突しないこと | **承認** | 変更は (a) schema への optional フィールド追加、(b) ソートキー置換、(c) receipt への additive キー、(d) bd-bridge の tolerant ソートのみ。qa-066 系ゲート (CI/テスト/リンタ) の定義・閾値には触れない (scope_out 2 遵守)。AC-5 は P06 で既存テスト全件により検証する設計 (§8) が明記されている。 |

## 3. findings と処置

blocking (P05 着手前に design.md 修正が必要) 4 件、non-blocking 5 件。**全 blocking と non-blocking 5/7/8/9 は 2026-07-23 に design.md へ反映済み**。

| # | 区分 | 指摘 | 処置 (design.md 反映箇所) |
|---|---|---|---|
| 1 | blocking (high) | 不正 mvp_fit / 不正型 mvp_alignment の fail-closed 挙動が未規定。silent fallback で不正値が rank 2 に丸まると AC-3 の裏面が破れる | §3「fail-closed 規則 (schedule-graph 側)」: dict/null 以外 → ContractError、enum 外の非 null → ContractError。§4「fail-closed 規則 (bd-bridge 側)」: per-candidate ContractError → conflicts[] 転記 (bd-bridge.py:380-388 の既存パターンに整合) |
| 2 | blocking (medium) | F-4 の事実誤認: validate-graph-schema.py の unknown properties 検査は nested のみで、トップレベルは additionalProperties 未設定のため検出されない (レビューで実測)。schema 追加の真の根拠は AC-3 の不正値 FAIL (subschema enum + additionalProperties: false) | §1 F-4 を実測どおりに修正 |
| 3 | blocking (medium) | order_index の定義が曖昧 (features/tasks 分割前後どちらの index か不定) | §6「order_index の定義 (一意)」: 分割前の単一 candidates リストの通し index と規定し、entries に artifact_kind を追加 |
| 4 | blocking (medium) | mvp_established の計算範囲 (--scope 依存か)・direct 0 件の意味論・map 掲載対象が未定義 | §5 に 3 点とも規定: 全 graph から scope 非依存で計算 / direct 0 件は null (空虚な真で true と誤読させない) / 掲載対象は entries に現れる parent_feature 集合 + entries 中の feature 自身 |
| 5 | non-blocking | parent_feature=null の deferred task の deferral_reason が未定義 | §5 に状況別 3 種の理由文字列を規定 |
| 6 | non-blocking | F-3 が「他 kind は null 固定 (schema 強制)」と過大表現 (実際は description 契約上の運用) | §1 F-3 を修正 |
| 7 | non-blocking | §2「feature は rollup 判定 §5 で使用」が §5 の実計算 (子 task 集計) と不一致 | §2 を修正: feature への許可は features batch の並び順への rank 適用のためで、mvp_established は子 task 集計と明記 |
| 8 | non-blocking | mvp_alignment 付与で graph.json digest が変わり既存 parity manifest が stale 化する運用影響が未記載 | §7 に「付与 → manifest 再生成 (C03)」の順序を P12 申し送りとして追記 |
| 9 | non-blocking | schema の `"default": null` は validator が値を注入しない宣言のみで無効果 | §2 から削除し、省略時 None は読み出しコードが担保する旨を注記 |

## 4. 総合判定

**承認 (実装可能)** — 初版に対する判定は「条件付き承認」。blocking findings 1〜4 の design.md 反映を確認したため、P05 は修正後の design.md のみを根拠に実装へ着手できる。P02 再実行レベルの差し戻しは不要。

- 承認範囲: design.md §2〜§7 の設計決定 (mvp_alignment schema・MVP_FIT_RANK ソート・tolerant bd-bridge 契約・ソフト繰り延べ・selection_receipt・後方互換方針)。
- 実装時の遵守事項: rank 定数の両 script 同一性はテストで固定 (F-6)。fail-closed 規則 (§3/§4) を省略しない。receipt は additive のみで既存キーへ触れない。
- 差し戻し条件 (rollback): P05 実装中に本レビューが承認した設計と実装が乖離した場合、実装側での設計上書きは禁止し design.md へ差し戻す (design.md §9)。

## 5. P04 への引き継ぎ

- design.md §8 のテスト観点表を P04 test-plan.md の起点とする。findings 反映で追加された検証対象:
  - 不正 mvp_fit / 不正型 mvp_alignment の ContractError (schedule-graph 側 plan fail / bd-bridge 側 conflicts[] 転記) — AC-3 裏面。
  - order_index の混在通し番号・artifact_kind 付き entries — AC-4。
  - mvp_established の direct 0 件 → null・parent_feature=null の deferral_reason — AC-4。
