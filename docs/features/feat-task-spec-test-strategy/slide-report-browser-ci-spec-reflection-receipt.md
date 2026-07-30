---
status: confirmed
layer: feature-evidence
beads_ids:
  - HarnessHub-nznu
dev_graph_node_id: task-slide-report-generator-browser-ci-20260730
feature_node_id: feat-task-spec-test-strategy
spec_impact: reflected
reviewed_at: 2026-07-30
---

# slide-report-generator browser CI 仕様反映受領書

## 1. 受領対象

Beads `HarnessHub-nznu` で救出した `slide-report-generator` の実 Chromium
（ブラウザの実体）受入試験について、GitHub Actions から到達できる保証が不足していた。
本変更は clean runner で依存と Chromium を plugin 内へ復元し、`npm test` と最終
read-only check を順番に実行する専用 workflow を追加する。

- Beads ID: `HarnessHub-nznu`
- dev-graph node ID: `task-slide-report-generator-browser-ci-20260730`
- branch: `devgraph/task-slide-report-generator-browser-ci-20260730`
- 対象 feature: `feat-task-spec-test-strategy`

## 2. 判定結論

判定は **reflected（仕様・設計への影響あり、正規フローで反映済み）**。

Harness Hub 製品の UI、API、DB、認証、デプロイ契約は変わらない。一方で、
「実ブラウザの受入試験が CI から必ず実行され、失敗時に blocking failure
（マージを止める失敗）になる」という testing/QA の運用契約を追加するため、
単なる実装詳細ではなく testing architecture への影響として扱った。

## 3. 正規フローでの反映

1. `testing-qa.web` を R4-reopen（確定済み回答を理由付きで再オープンする操作）した。
2. `qa-102` で既存回答を維持しつつ、plugin-local Chromium の復元、
   `npm test`、最終 `--check`、cache 非正本、契約テストを確定した。
3. ユーザーの最終レビュー・仕様反映指示を `appr-019` として承認記録へ追加した。
4. coverage matrix と出典検査を通し、`system-spec/testing-qa.md` へコンパイル結果を反映した。
5. C02 writer（dev-graph の正規書き込み口）で task node、feature、architecture の
   lineage（どの正本から作られたかの追跡情報）を更新した。

## 4. 反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/spec-state.json` | `testing-qa.web` を `qa-102` / `appr-019` で再確定 |
| `system-spec/testing-qa.md` | CI 到達、実 Chromium、cache、回帰検知の正本契約 |
| `specs/harness-hub-system-specification.md` | testing/QA の統合仕様へ横断追補 |
| `architecture/harness-hub-testing-qa.md` | workflow の責務、実行順、権限、境界 |
| `features/feat-task-spec-test-strategy.md` | 既存テスト戦略を本 plugin へ適用した記録 |
| `tasks/task-slide-report-generator-browser-ci-20260730.md` | 単一責務の実行・受入・検証仕様 |
| `docs/features/feat-task-spec-test-strategy/` | 本受領書 |
| `.github/workflows/slide-report-generator-ci.yml` | GitHub-hosted runner への実行経路 |

`docs/`、`features/`、`system-spec/`、`architecture/`、`tasks/` をすべて同期した。
`specs/` も統合仕様の追補対象に含めた。

## 5. 実装契約

- pull request で plugin または workflow が変わると専用 job を起動する。
- `main` への push と手動実行でも同じ job を起動できる。
- Node.js 22 / Python 3.11 / macOS runner を使う。
- token 権限は `contents: read` のみに限定し、secret は追加しない。
- plugin-local browser cache は高速化だけに使い、正常性の正本にはしない。
- `--install` が lockfile に従って依存を復元し、`npm test` が実 Chromium を使う。
- 最終 `--check` が Playwright の版、配置、実行ファイルの存在を再確認する。
- Python 契約テストが path、実行順、最小権限、timeout の配線消失を検知する。

## 6. 最終レビューと品質ゲート

| ゲート | 実測結果 |
|---|---|
| plugin Python tests | `137 passed` / `0 failed` |
| vendor `npm test` | render / coverage / consistency / Playwright / slide screenshots / report self-test の全件 PASS |
| runtime `--check` | Playwright `1.60.0`、plugin-local Chromium、warning 0、ready=true |
| task system plan | PASS、P01〜P13、violation 0。既存 package は contract 1.1.0 の legacy exemption |
| task dev-graph schema | valid=true、missing section 0、violation 0 |
| dev-graph source digest | feature / architecture の 2 node とも mismatch 0 |
| system-spec coverage | 未収集 0、foundation trace を含め PASS |
| system-spec source citation | 全件対応・必須項目・公式 host 一致で PASS |
| repository local CI | blocking `136 PASS / 0 FAIL`、段階導入中の既存 warning 4 件 |
| 文書配置 | orphan / frontmatter / system-spec / root の全検査 PASS |
| 文書行数 | 新規 task 143 行、本受領書 110 行。変更対象に 500 行超なし |
| whitespace | `git diff --check` PASS |

task system plan の legacy exemption は既存 `feat-task-spec-test-strategy` package の
contract version が 1.1.0 であるための互換措置であり、検査省略ではない。本 task 自体には
単体・結合・境界・回帰の検証方法、受入条件、write scope、risk、handoff を明記し、
dev-graph schema で実装準備完了を検証した。

## 7. 影響がない領域

- 製品 UI と利用者操作
- API request/response
- DB schema と保存データ
- 認証認可・個人情報
- Cloudflare production runtime と deploy unit
- Playwright の版

したがって、product architecture の新 component や data flow は追加していない。
変更点は repository の testing/QA 実行経路に限定される。

## 8. 残課題

GitHub-hosted runner 上の初回実行結果は、draft PR 作成後に GitHub Actions が記録する。
ローカルでは同一 `npm test` と runtime check を実行済みである。初回 run が外部 download
障害で失敗した場合も skip や retry で隠さず、原因を残して再実行する。
