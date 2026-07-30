---
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-local-ci-gate-drift-20260728
beads_id: HarnessHub-ml57
status: recorded
updated: 2026-07-30
---

# CI-local 品質ゲート parity — 仕様反映受領書

## 1. 目的と背景

`scripts/run-ci-checks.sh` は、push 前に CI 相当の検査をローカルで再実行する入口である。
しかし 2026-07-28 の棚卸しでは、GitHub Actions が呼ぶ repository root の Python 検査の
うち 19 件がこの入口から欠落していた。さらに同じ script でも `--ratchet` や `--check`
の有無で判定が変わるため、script 名だけの比較では実際の事故を防げなかった。

本変更は、CI と local の検査呼び出しを「script path + 意味のある引数」の集合として
比較し、local hard gate または理由付き allowlist のどちらにも属さない呼び出しを
fail-closed（判定できないときは安全側に倒して失敗させる）で止める。

## 2. 対象

| 項目 | 値 |
|---|---|
| Beads | `HarnessHub-ml57` |
| dev-graph node | `issue-local-ci-gate-drift-20260728` |
| branch | `devgraph/issue-local-ci-gate-drift-20260728` |
| base | `main` |
| task type | implementation / NON_VISUAL |
| deploy unit | repository development tooling |

## 3. 中学生向けの説明

### なぜ必要か

学校で「明日の持ち物は全部確認した」と言われたのに、先生の本番チェック表には
家の確認表に載っていない項目があったら、登校してから忘れ物に気づきます。
これまでの push 前チェックは、この「一部が抜けた確認表」になっていました。

### 何を作ったか

先生の本番チェック表と、家で使う確認表を自動で見比べる係を作りました。
家では実行できない項目もありますが、その場合は「外部サービスへの接続が必要」
「ファイルを書き換えるので push 前には実行しない」のように理由を書く必要があります。
理由も実行も無い項目が 1 つでもあれば、確認は失敗します。

### 用語の言い換え

| 用語 | 日常語での意味 |
|---|---|
| CI | サーバー側で行う本番の自動点検 |
| local gate | 自分の PC で先に行う点検 |
| parity | 2 つの点検表の対応が取れていること |
| allowlist | 実行しない理由を承認して記録した例外表 |
| fail-closed | 分からないときに見逃さず、いったん止めること |
| invocation | script と引数を合わせた、実際の呼び出し方 |

## 4. 技術者向けの説明

### 4.1 不変条件

次の集合包含を repository gate として固定した。

```text
CI blocking invocations
  ⊆ local hard-fail invocations ∪ reasoned allowlist
```

CI non-blocking invocation も黙って除外せず、local hard gate に昇格しない理由を
allowlist に要求する。allowlist entry が CI から消えた場合や local hard gate に
移った場合は stale として失敗し、例外が永続的に積み残されることを防ぐ。

### 4.2 呼び出しの正規化

- 対象は repository root から実行される `python3 scripts/*.py`。
- key は script path と正規化済み引数の組であり、件数や比率は合否に使わない。
- `--foo=value` と `--foo value`、long option の順序差は同一視する。
- option の有無、option value、positional argument の順序差は保持する。
- job / step の `working-directory` が repository root 以外なら plugin-local として除外する。
- 動的な `working-directory` を静的解決できない場合は解析を続けず失敗する。

### 4.3 追加したインターフェース

```bash
python3 scripts/lint-ci-local-check-parity.py
python3 scripts/lint-ci-local-check-parity.py \
  --repo-root <repository> \
  --allowlist scripts/ci-local-check-allowlist.json
```

終了コードは `0=parity`、`1=集合差または allowlist 違反`、
`2=入力または解析エラー`。allowlist は schema version 1 とし、
各 entry に `script`、`args`、空でない `reason` を要求する。

### 4.4 結線

- `.github/workflows/governance-check.yml`: meta-lint 自体を CI の blocking step に追加。
- `Makefile`: `make lint` から同じ実装を起動。
- `scripts/run-ci-checks.sh`: pre-push の hard gate として起動。
- 読み取り専用の欠落検査を local hard gate へ追加。
- 外部資格情報、working-tree write、CI non-blocking などの例外を allowlist に分離。

## 5. 受入条件との対応

| 受入条件 | 実装・証拠 |
|---|---|
| allowlist に無い集合差で失敗 | `audit()` の set difference と focused negative test |
| 件数や比率を使わない | `set[Invocation]` の包含判定 |
| script 名と意味のある引数を比較 | `Invocation(script, normalize_args(args))` |
| 意図的な local 非実行に理由を要求 | schema version 1 の `reason` 必須 + stale 検査 |
| 実際の被覆範囲と表示を一致 | `run-ci-checks.sh` を「ローカルで安全に再実行可能」に修正 |

## 6. 仕様・設計への影響判定

**影響あり**と判断した。

- `system-spec/dev-workflow.md`: `qa-088` の「CI と local の一致」を、呼び出し集合の
  機械検査・理由付き例外・fail-closed 境界として具体化した。
- `architecture/harness-hub-dev-workflow.md`: CI/local parity の集合契約と責務境界を追加した。
- `specs/harness-hub-system-specification.md`: system spec の要約と trace を追加した。
- `features/feat-dev-pipeline-improvement.md`: 実装履歴と受領書への導線を追加した。
- `tasks/feat-dev-pipeline-improvement/`: P09/P12/P13 の実装・仕様反映・リリース検証へ記録した。

Harness Hub 製品の API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。
変更範囲は repository 内の開発品質ゲートと、そのローカル再現性に限定される。

## 7. 最終検証

最終値は `origin/main` を local `main` へ取り込み、local `main` を本 branch へ
マージした後の統合 tree で記録する。必須ゲートは次のとおり。

- focused parity tests
- `tests/scripts-root` 全体
- `scripts/run-ci-checks.sh`
- task specification package validator
- PR-ready pre-flight
- document line limit / graph schema / diff whitespace

## 8. 残課題

本変更の受入条件から新しい残課題は検出していない。既存 issue
`HarnessHub-11qt`（メタ層 lint の local 入口）と `HarnessHub-yhc3`
（required checks の未結線）は、本 meta-lint が検出・例外理由を要求する対象として
引き続き独立管理する。
