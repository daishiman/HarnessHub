---
status: confirmed
layer: gate-conclusion
parent_feature: feat-stage0-distribution-gate
feature_package_id: feature-package/feat-stage0-distribution-gate
verdict: H7_NOT_ESTABLISHED
stage1_entry_condition: NOT_MET
concluded_at: "2026-07-21T09:40:00+09:00"
---

# Stage 0 technical gate (H7) 終結記録

> **位置づけ**: feat-stage0-distribution-gate の終結記録。作者判断により本 feature をここで終結させたため、13 phase のうち P08-P13 は実行されない。**この文書は「未完了のまま放置した」のではなく「gate が不成立という結論を出した」ことを記録する。**

## 1. 結論

# **H7 は成立しなかった。Stage 1 開始条件は満たされていない。**

Stage 0 technical gate の目的は「Stage 1 へ投資する前に配布経路を確定すること」である。**成立しないと分かることも gate の所期の成果**であり、本 feature は「投資判断に必要な事実を確定させる」という責務を果たした上で終結する。

不成立のまま Stage 1 (Publisher + Thin Dual Catalog MVP) へ進むことは、baseline §6 `h7-unresolved-blocks-stage1-fail-closed-gate` により禁じられている。

## 2. acceptance の最終状態

| acceptance | 結果 | 要点 |
|---|---|---|
| **A1** 2 経路以上の実機検証記録 | **pass** | `url-marketplace` / `bootstrap-installer` の 2 経路が macOS・Windows とも `Skills (1)` を解決 |
| **A2** 採用経路の decision record 登録 | **未実行** | fail-closed により C01 writer を実行していない。`decisions[]` に `D7` は不在 |
| **A3** Windows E2E が成功する | **blocked** | install・列挙・冪等性・非汚染は Windows 実機で pass。**skill の実行 (T-A3-03) のみ**認証情報不在で実行できず |

必須証跡 E1-E6 のうち **E1 / E5 / E6 が pass、E2 が blocked、E3 / E4 が不在**。

## 3. 実行した phase と実行しなかった phase

| phase | 状態 |
|---|---|
| P01 要件ベースライン | 完了 |
| P02 アーキテクチャ決定 | 完了 |
| P03 独立設計レビュー | 完了 |
| P04 テストファースト設計 | 完了 |
| P05 検証用 artifact 実装 | 完了 |
| P06 実機検証実行 | 完了 |
| P07 受入判定 | 完了 (**verdict: REJECTED**) |
| P08-P13 | **実行しない** (P07 が REJECTED であり fail-closed により着手条件を満たさないため) |

## 4. Stage 1 へ持ち越す知見 (本 gate の実質的な成果)

### 4.1 plugin は専用リポジトリのルートか npm パッケージである必要がある

remote URL 型 marketplace は、外部 `github` source を指定しても**リポジトリのサブディレクトリへスコープできない**。`path` / `subdir` はいずれも実行時に無視され、リポジトリ全体がクローンされて **repo ルートが plugin root として扱われる**。

正本 `fetched-references.json` は「remote URL 型では相対パス source が解決不能」までしか記していないが、**外部 source でも subdir 不可**という更に厳しい制約が実測で判明した。

→ **Publisher (Stage 1) が「plugin ごとに専用リポジトリを持つ」か「npm 公開する」かの選択を迫られる。** アーキテクチャ選択に直接影響する。

### 4.2 `github` 型 source は SSH でクローンする

CLI は `github` 型 source を `git@github.com:` でクローンする。**SSH 鍵のない環境では public リポジトリでも install が失敗する** (Windows CI で `Permission denied (publickey)` を実測)。

macOS で成功していたのは、検証実行環境にローカルの GitHub SSH 鍵が存在したためであった。**開発者の PC で検証すると偽陽性が出る**典型例である。

→ 本 feature の想定利用者は**非エンジニアの作者**であり、SSH 鍵の存在を前提にできない。回避策 (`git config --global url."https://github.com/".insteadOf "git@github.com:"`) は存在するが、これを作者に要求することは baseline §6 `solo-operator-ai-assisted-verification-c1` (運用負荷の低さ・保守性が最優先基準) に対する明確な減点である。

→ **`source.type=npm` は SSH を要さないため有力な代替候補**だが、本 feature では未検証 (T-A1-07 blocked)。**Stage 1 の設計着手前に検証すべき最優先項目**である。

### 4.3 配布成功の判定には `claude plugin details` が必須

以下がすべて成功を示していても、skill が読み込まれていない状態が実在する。

| 検査 | 誤設定時の結果 |
|---|---|
| `claude plugin validate --strict` | ✔ Validation passed |
| `claude plugin marketplace add` | exit 0 |
| `claude plugin install` | exit 0 |
| `claude plugin list` | Status: ✔ enabled |
| **`claude plugin details`** | **Skills (0)** ← ここだけが失敗を露見させる |

→ **Publisher の受入設計に `details` の component inventory 検査を組み込むこと。** exit code と `list` だけでは配布の成否を判定できない。

## 5. 終結にあたり撤去した検証資産

| 資産 | 状態 | 影響 |
|---|---|---|
| public リポジトリ `daishiman/h7-probe` | **削除** | `verification-artifacts/marketplace.json` の外部 source が解決不能になり、**A1 の検証は再現できない**。記録された観測は実行済みの事実として有効 |
| `.github/workflows/h7-windows-e2e.yml` | **削除** | Windows 検証の再実行手段が失われた。git 履歴 (PR #12 / #13) から復元可能 |

**再開する場合に必要な作業**: (1) plugin を repo ルートに持つ検証用リポジトリの再作成、(2) `marketplace.json` の外部 source の再設定、(3) Windows 実行環境の確保 (作者実機または CI workflow の復元)、(4) T-A3-03 のための認証情報。

## 6. 未解決のまま残る事項

| # | 事項 | 備考 |
|---|---|---|
| 1 | **A3 の skill 実行検証** | 配布機構の問題ではなく認証情報の可用性の問題。配布そのものは Windows 実機で pass 済み |
| 2 | **npm source 経路 (T-A1-07)** | `pnpm pack` までは成功。レジストリ公開が未実施のため未検証。§4.2 の SSH 問題の回避策候補として **Stage 1 前に検証すべき** |
| 3 | **正本への還流** | §4.1 / §4.2 は `system-spec/fetched-references.json` の claude-code-plugins entry を補強する新事実だが、同ファイルの更新は C02 (`run-system-spec-doc-fetch`) の所管であり本 feature の scope 外 |
| 4 | **採用経路 decision (D7) の未登録** | A1-A3 未充足のため fail-closed。`decisions[]` は D1-D6 のまま |

## 7. 関連成果物

- [requirements-baseline.md](./requirements-baseline.md) — 要件ベースラインと fail-closed 契約 (§7)
- [architecture-decision-record.md](./architecture-decision-record.md) — D1-D5
- [design-review-notes.md](./design-review-notes.md) — 独立設計レビューと差し戻し解決
- [test-design.md](./test-design.md) — test ID 定義
- [test-run-results.md](./test-run-results.md) — macOS 実機検証結果
- [acceptance-record.md](./acceptance-record.md) — 受入判定 (REJECTED) と改訂 2
- `.dev-graph/cache/stage0-stage1-gate-receipt.json` — Stage 1 開始条件判定 receipt
