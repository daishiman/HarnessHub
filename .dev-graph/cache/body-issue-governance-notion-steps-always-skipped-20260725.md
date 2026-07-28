# 概要

`governance-check.yml` の Notion 検査 2 step が `if: ${{ env.NOTION_TOKEN != '' }}` で分岐しているが、参照先の `env.NOTION_TOKEN` は同じ step の `env:` にしか定義が無い。GitHub Actions は step-level の `if` を step の `env` 適用より前に評価するため式は恒久的に `'' != '' = false` となり、secret を投入しても 2 step は一度も実行されない (常時 skip の fail-open)。

## 背景と問題

`HarnessHub-fnzl` (GitHub Actions secret 台帳の整備) で `NOTION_TOKEN` の挙動を裏取りした際に発見した。台帳には「未設定時は該当 step が skip される設計」と書かれていたが、実際には投入しても skip される。

「設定漏れなら skip」という意図に対し、実際は「常時 skip」である。両者は同じ緑を出すため、CI の結果からは区別がつかない。Notion 3DB の schema drift と relation invariants は SSOT (`doc/notion-schema/*.schema.json`) と実 DB の乖離を検出する唯一の機械経路なので、これが動かない状態は「検査が存在しない」のと同じである。

この書き方は静的には自然に見え、人手のレビューでは再発しやすい。同型を機械遮断する必要がある。

## 現在の挙動

修正前の `governance-check.yml:64,69`。

```yaml
      - name: notion schema drift check (3DB SSOT vs Notion)
        if: ${{ env.NOTION_TOKEN != '' }}
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
        run: python3 scripts/sync-notion-schema.py --check
```

workflow-level にも job-level にも `env:` は無い (1-60 行)。`steps.if` からは `secrets` context を参照できないため、`if` の条件を secret 有無へ結び付ける経路がそもそも存在しなかった。

## 期待する挙動

- `NOTION_TOKEN` を投入した状態では 2 step が実際に実行される。
- 未投入時は従来どおり skip し、workflow 全体は成功する。
- 同型 (step-level `if` が解決不能な `env` / `secrets` を参照) の再発が機械的に遮断される。

## 再現手順またはユースケース

```bash
# defect 形が token 投入でも skip のままであることを再現する
python3 scripts/lint-workflow-step-guard.py --self-test

# 実 workflow の Notion 3 step の run/skip を実測する
python3 scripts/lint-workflow-step-guard.py --simulate \
  --workflow governance-check.yml --secret NOTION_TOKEN=dummy
python3 scripts/lint-workflow-step-guard.py --simulate \
  --workflow governance-check.yml
```

## 影響と優先度

- 影響範囲: system。メタ層 (スキルハーネス) の CI ゲート 2 件が恒久的に無効。
- 深刻度: high。fail-open は「検査した結果の緑」と「検査していない緑」を区別できなくする。
- 緊急度: `NOTION_TOKEN` 未投入の現状では実被害は無いが、投入しても直らないため放置すると恒久化する。

## スコープ

- In: `governance-check.yml` の secret 有無 gate の是正 / DB ID の条件付き必須化 / 同型再発の遮断 lint と回帰テスト / 台帳 (`scripts/ci/actions-secrets-registry.json`) の記述更新 / Notion 設定契約ドキュメントの実装追従。
- Out: secret / variable の実投入そのもの (`HarnessHub-vns9` 側)。`backup.yml` 系の台帳整備 (`HarnessHub-fnzl` 側)。メタ層 lint の local 入口設計 (`HarnessHub-11qt` 側)。

## 関連グラフ

- 原因/親ノード: なし (`HarnessHub-fnzl` 由来。`HarnessHub-vns9` / `issue-actions-secrets-provisioning-evidence-20260725` は graph 未登録の orphan external ref のため `related_nodes` に置けない。orphan の解消は `HarnessHub-mfh7` 側)
- 関連仕様: `docs/infrastructure-spec.md` §7 (Actions secret / variable 台帳)
- 関連アーキテクチャ: `arch-harness-hub-dev-workflow`
- 解決タスク: 本 issue 内で完結 (task 分解なし)

## 受入条件

- [x] secret 有無の判定を job-level env の真偽値 `HAS_NOTION_TOKEN` 経由で行い、step-level `if` から解決できる
- [x] `NOTION_TOKEN` 投入時に 3 step (config 準備 + schema drift + relation invariants) が run されることを実測した
- [x] 未投入時は 3 step とも skip され workflow 全体は成功する
- [x] `NOTION_TOKEN` 投入時に DB ID 3 件が欠けていれば `prepare notion config` step が exit 1 で落ちる
- [x] 同型 (step-level `if` の解決不能な `env` / `secrets` 参照) を全 workflow に対し fail-closed で遮断する lint が CI に配線されている

## 検証証跡

- コマンド/テスト:
  - `python3 -m pytest tests/scripts-root/test_root__lint_workflow_step_guard.py -q` (31 passed)
  - `python3 -m pytest tests/ -q` (7530 passed / 5 skipped)
  - `make lint` / `python3 scripts/lint-workflow-step-guard.py` (`workflows=10 violations=0`)
  - `node scripts/ci/check-actions-secrets.mjs` (workflow 参照 12 件 = 台帳 12 件)
- 証跡 path: `tests/scripts-root/test_root__lint_workflow_step_guard.py` / `scripts/lint-workflow-step-guard.py` / `.github/workflows/governance-check.yml`
