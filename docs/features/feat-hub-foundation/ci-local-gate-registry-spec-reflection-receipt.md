---
layer: feature-spec-reflection
feature_id: feat-hub-foundation
beads_ids: [HarnessHub-yhc3, HarnessHub-42g]
dev_graph_node_id: issue-shared-layers-registry-baseline-drift-20260724
task_node_id: SYS-HUB-FOUNDATION-P13
spec_impact: reflected
status: verified
updated: 2026-08-04
---

# CI 品質ゲート登録簿と local `verify` の整合 — 仕様反映受領書

## 1. 依頼・目的・背景

`HarnessHub-yhc3` は、CI にだけ結線されていた G7 (破壊的 DDL)、G7b
(tenant 分離網羅・connection isolation)、G9 (axe a11y) を root の `pnpm verify`
からも実行できるようにする課題である。`HarnessHub-42g` は、feature の
requirements baseline が昔の 5 項目を現在のゲート集合であるかのように読める
ドリフトを解消する課題である。

今回の目的は、ローカルで緑でも PR で初めて赤になる往復を防ぎ、CI 品質ゲートの
正本・要約・実行入口を同じ実装へそろえることである。

## 2. 結論

仕様・設計への影響は **あり (`reflected`)** と判断した。製品の API、データベース
schema、認証・認可の振る舞い、UI、Cloudflare deploy unit は変更しない。一方で、
qa-038 / qa-039 が求める CI と local の同値（同じ確認を手元でも実行できること）の
具体的な実行契約を拡張するため、開発フロー仕様と architecture の出典追跡を更新した。

G11 は main 反映後にだけ走る Core Web Vitals の定期測定であるため、PR の
merge-blocking gate や local `verify` へ含めない。この例外はコストと測定時点が
異なるためであり、確認漏れとして扱わない。

## 3. 中学生向けの説明

提出前に家で使うチェック表と、先生が学校で使うチェック表が違うとします。家では
「全部できた」と思っても、学校へ行ってから初めて足りない物に気づきます。

今回、家のチェック表である `pnpm verify` に、学校の自動チェックで使う
「データを危なく壊していないか」「別の会社のデータが混ざらないか」
「画面が使いやすいか」「ログインの安全ルールを守れているか」を追加しました。
また、古い短いチェック表は「昔のメモ」であり、今の正しい一覧は登録簿を見ると
分かるように直しました。

## 4. 技術的な説明

root `package.json` に次の wrapper を追加し、package script の実在を確認してから
既存実装を起動するようにした。

| local 入口 | CI 登録簿 | 再利用する既存実装 |
| --- | --- | --- |
| `check:ddl` | G7 | `@harness-hub/db#check:ddl` |
| `check:tenant-isolation-coverage` | G7b | `@harness-hub/db#check:tenant-isolation-coverage` |
| `check:connection-isolation` | G7b | `@harness-hub/db#check:connection-isolation` |
| `check:a11y` | G9 | UI と Hub の既存 `test:a11y` |
| `check:auth-release-contract` | G14 | `@harness-hub/hub#test:auth-release-contract` |

wrapper は `check-required-package-script.mjs` を先行させる。これにより package 内の
script が rename / 削除されたとき、`pnpm --filter` の曖昧な成功や無実行として通さず
fail-closed（確認できない場合は止める）にできる。`verify` は CI と同じ実装を
G1〜G10・G12〜G14 の順で呼び出す。G7b は 2 つの補助検査に分かれるが、登録簿上は
tenant 分離を守る 1 つの品質境界である。

## 5. 仕様反映の正規フロー

| 層 | 反映内容 |
| --- | --- |
| `system-spec/` | `dev-workflow.md` の qa-140 に、local `verify` が再利用する gate、G11 の除外理由、script 実在確認を追記 |
| `specs/` | **変更なし**。`specs/harness-hub-system-specification.md` は `00-requirements-definition.md` と `index.md` だけを出典にする参照型 wrapper で、`dev-workflow.md` は scope 外である。ここへ差分を複製すると正規フローに反し、495 行の文書を 500 行上限を超えて肥大化させるため、該当する architecture wrapper を更新した。 |
| `architecture/` | `arch-harness-hub-dev-workflow` を C02 `upsert-node.py` で更新し、source digest を `system-spec/dev-workflow.md` の実測 SHA-256 へ同期 |
| `features/` | `feat-hub-foundation` の completion evidence に本受領書を C02 経由で追加 |
| `tasks/` | 凍結済み exact-13 本文を改変せず、`SYS-HUB-FOUNDATION-P13` の completion evidence に本受領書を C02 経由で追加 |
| `docs/` | G1〜G14 の登録簿、インフラ要約、ADR、requirements baseline を同じ事実へ同期 |

C02 の更新は全件で既存本文を保持した (`body_source=preserved`、本文置換 0 行)。
`system-spec/spec-state.json` は変更していない。確定済み QA の回答を変えず、既存の
CI/local 同値契約を具体化したためである。

## 6. 影響判定の根拠

- **影響あり**: local gate の集合と実行順を変更するため、開発フローの品質契約に影響する。
- **仕様状態の改訂なし**: qa-038 の required status checks 8 種の数え方は変わらない。
  G14 は G4 に含まれていた認証・tenant 契約を名指し実行へ引き上げる横断 gate であり、
  G11 と同様にこの 8 種を増減させない。
- **製品への影響なし**: runtime の機能・公開インターフェース・データ保存形式・認可規則は
  変更していない。変更対象は repository 内の開発時検査入口だけである。

## 7. 検証

| 検証 | 結果 |
| --- | --- |
| task package quality gate | PASS — `validate-system-plan.py --feature-package feature-package/feat-hub-foundation`、P01〜P13、violations 0 |
| Dev Graph schema | PASS — `validate-graph-schema.py`、`valid=true` |
| G7 | PASS — migration 8 件、未承認の破壊的 DDL 0 件 |
| G7b | PASS — scoped 25/25、packages/db 外の driver 直接 import 0 件 |
| G9 | PASS — UI 30 tests、Hub 3 tests、axe 違反 0 |
| G14 | PASS — auth / tenant / production OIDC contract 59 tests |
| root `pnpm verify` | PASS — lint、typecheck、build、全 workspace test と G1〜G10・G12〜G14 を終了コード 0 で完走 |
| system-spec coverage matrix | PASS — `validate-coverage-matrix.py --require-complete --require-foundation` |
| architecture source digest | PASS — `validate-source-digest.py --registered arch-harness-hub-dev-workflow`、実ファイル SHA-256 と一致 |
| artifact placement | PASS — graph 登録・docs frontmatter・配置規約に違反なし |

テスト開始時は worktree の optional dependency
`@rollup/rollup-darwin-x64` が欠けていた。`pnpm install --frozen-lockfile` で lockfile を
変更せず依存関係だけを修復してから、G9 と G14 を再実行した。

## 8. ファイルサイズ

本変更で更新・追加した文書はすべて 500 行以下である。500 行超過による分割対象はない。

## 9. 残課題

- final commit 後に HEAD 束縛の `build-spec-reflection-receipt.py` を実行し、draft PR を作成する。
- PR 上の GitHub Actions とレビュー結果を確認する。
