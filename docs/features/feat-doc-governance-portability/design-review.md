---
status: draft
layer: design-review
task: SYS-DOC-GOVERNANCE-PORTABILITY-P03
parent_feature: feat-doc-governance-portability
reviewed: docs/features/feat-doc-governance-portability/design.md
source: system-spec/dev-workflow.md (qa-070, appr-008)
---

# 設計レビュー — fail-closed・冪等・単一 writer 境界・digest 不変・境界非複製

P02 設計 (design.md §1-§3) を quality_constraints 4 件 + 仕組み-ナレッジ境界非複製の
5 観点で検証した。検証は設計記述と実装 (`scripts/lint-*.py` 3 本) の突合、および実測
(pytest 76 件・実リポジトリ 3 lint 実走 2 回) に基づく。

## 観点別 verdict

### 1. fail-closed — **PASS**

- 3 検査とも exit 契約が `0=適合 / 1=違反 / 2=設定エラー` で、違反・設定エラーの
  いずれも非 0 で停止する。警告のみで exit 0 のまま通過する warning-only 経路は、
  NOTE (ratchet の縮小追随促し・卒業・stale entry・初導入 skip) に限定され、NOTE は
  規約違反を表さない (違反はすべて VIOLATION → exit 1)。
- 設定エラー側も fail-closed: allowlist 不在/malformed (exit 2)、git repo 外 (exit 2)、
  `--ratchet-base` の rev 解決不能 (exit 2)。「読めないから通す」経路はない。
- CI 配線は `.github/workflows/governance-check.yml` change-category-guard job に
  `continue-on-error: false` で 3 step。job 失敗に直結する。

### 2. 冪等 (idempotent-verification) — **PASS**

- 3 検査とも読み取り専用の純関数構成 (走査は `sorted`、時刻・乱数を出力に含めない)。
  同一入力での再実行は同一出力に収束する。実測: 各 lint を同一 worktree で 2 回実行し
  JSON 出力の diff 0 (P06 test-run 証跡)。
- allowlist ratchet の縮小追随 (baseline 更新) は運用者の明示編集であり、検査自体は
  状態を書き換えない。P08 の baseline 遡及付与も再実行差分 0 (migration-receipt 証跡)。

### 3. 単一 writer 境界 (single-writer-boundary) — **PASS**

- 3 検査はいずれも読み取り専用で、graph (upsert-node.py) / beads (bd-bridge.py) の
  単一 writer を迂回する書込み経路を持たない。
- 検査追加によって index/一覧表参照構造を変える箇所はない。allowlist は
  `scripts/doc-line-limit-allowlist.json` が単一正本で、lint はそれを参照するのみ。

### 4. digest 不変 (digest-immutability) — **PASS**

- 検査対象 (既存 confirmed 文書・promoted package) への書込みは一切ない。P08 の
  baseline 遡及付与は allowlist 側のみの変更で、対象 6 文書の sha256 は不変
  (migration-receipt で付与前後の sha256 一致を記録)。
- `--ratchet-base` は git object の読み取り (`git show`) のみで履歴へ書込まない。

### 5. 仕組み-ナレッジ境界の非複製 — **PASS**

- 検査 script (仕組み側) は repo 固有ナレッジ (固有 node id・固有 path・qa 条文本文)
  をコード値へ焼き込んでいない。qa-070 への言及はコメント/docstring の根拠引用のみで、
  これは lint-mechanism-knowledge-boundary.py 自身の PASS 基準 (citation) と整合する。
  (注: 同 lint の走査対象は plugins/ で scripts/ は対象外だが、設計原則としては
  scripts/ 側も同基準で自己適用されていることを確認した。)
- 検出トークン設計 (K1 qa 番号 / K2 ナレッジ path / K3 feat-/issue- node id) は
  「特定ナレッジの複製」ではなく「ナレッジ参照の形」を検査するもので、境界非複製の
  原則そのものをコード化している。allowlist の 6 文書 path 列挙は「どの文書が超過して
  いるか」という remediation 状態 (ナレッジ) を data (JSON) 側に置き、仕組み (lint 本体)
  から分離しており、qa-070 のオン・オフ分離と整合する。

## 差し戻し履歴 (P09 → P02/P05)

P09 の迂回実測と最終監査で 3 系統の突破が確認され、P02 契約を拡張のうえ P05 を
差し戻し修正した:

1. **allowlist 不正追加**: 当初設計は allowlist を信頼済み設定として扱い、新規エントリ
   追加・baseline 拡大を機械検査しなかった (acceptance『allowlist は既存 6 文書のみ・
   縮小のみ許す ratchet として検査される』に対する gap)。→ `--ratchet-base` を追加し
   基準 rev 比較で遮断 (design.md §1)。
2. **qa 番号分割記述**: `"qa-" + "070"` 等の定数連結が literal 走査をすり抜けた。
   → 定数畳み込み検査を追加し遮断 (design.md §2)。
3. **移植 opt-in gate のコメント/非条件コード偽装**: コメントや `echo` に
   `INCLUDE_KNOWLEDGE` を置くだけで gate と誤認した。
   → コメント除去後の `if` / `test` / `case` 等の条件式だけを gate と認めるよう強化
   (design.md §3)。

いずれも修正後に MUST_DETECT/MUST_PASS を test-plan.md へ追補し、P06 で再実測済み。

## 判定

5 観点すべて **PASS**。P04 (テスト設計) へ進む。差し戻し理由は存在しない。
