---
status: confirmed
layer: feature-spec-reflection
beads_id: HarnessHub-dfm
dev_graph_node_id: SYS-PUBLISH-PIPELINE-P13
package_digest: sha256:845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d
recorded_at: 2026-07-30
---

# feat-publish-pipeline 仕様反映受領書

## 1. 判定

仕様・設計への影響は **あり**。

公開 REST API、PublishRequest 状態機械、TargetChannel 直列化、immutable Release、
R2 package storage、session/Bearer 認可、production smoke と rollback を実装で
具体化したため、既存文書の言い換えだけではなく正本の再確認が必要と判断した。

UI と Publisher クライアントは本 feature の対象外であり、画面仕様への影響はない。
DB schema は `feat-domain-model-db` の既存所有物を使用し、新しい migration は追加しない。

## 2. 正規フローの受領

system-spec harness の C01 writer から `web` セルを R4 reopen し、
承認 `appr-020` を根拠に次を回答・再確定した。

| QA | 正本 | 受領した契約 |
|---|---|---|
| `qa-103` | `system-spec/backend.md` | REST API、状態機械、Green 自動公開、直列化 |
| `qa-104` | `system-spec/security.md` | session/Bearer、tenant/owner、CSRF、冪等性、監査 |
| `qa-105` | `system-spec/database.md` | schema consumer、immutable Release、partial UNIQUE、stable pointer |
| `qa-106` | `system-spec/infrastructure.md` | Turso/R2 binding、上限付き本文、production gate |
| `qa-107` | `system-spec/maintenance-ops.md` | smoke、code-only rollback、履歴保持 |
| `qa-108` | `system-spec/testing-qa.md` | 状態・認可・検査・DB/R2・本番証跡の受入束 |

coverage matrix の complete 検査、source citation 検査、spec compile、
compile regression 42 件はいずれも pass した。

landing 品質ゲートは Hub 842、inspection 151、DB 231、schemas 86 tests、
workspace 6 project の typecheck、Biome 423 files、OpenNext Worker build、
artifact placement、doc line limit 451 文書、dev-graph schema、system-plan
contract 1.2.0 をすべて pass した。境界 detector が検出した DB deep import 2 件と
test support 名衝突 1 件は `createPublishSmokeDbProbe` と test-only alias で是正し、
501 ファイル / violations 0 を再確認した。

## 3. 反映先

- `system-spec/`: backend / security / database / infrastructure /
  maintenance-ops / testing-qa と `spec-state.json`
- `specs/`: Harness Hub 要件 wrapper の Publish pipeline 追補
- `architecture/`: backend / data / security / infrastructure の実装判断
- `features/`: macro feature の実装・最終受入状態
- `tasks/`: P01〜P13 を C02 writer で package digest `845b61b…cdd4d` へ再投影
- `docs/`: 要件、ADR、境界統合決定、設計、テスト、QA、証跡、runbook、release と本受領書

## 4. 500 行ルール

手書きの実装・テスト・運用スクリプトは 500 行以下へ責務分割する。

以下は機械生成・単一正本のため分割しない。

- `.dev-graph/state/graph.json`: C02 が graph revision と task artifact を原子的に更新する正本
- `system-spec/spec-state.json`: C01 の質問・承認・遷移を保持する正本
- content-addressed generation の JSON: package digest と schema がファイル単位を規定する成果物

これらを人手で分割すると hash、schema、writer の transaction contract
（一括更新の約束）を壊すため、行数より再現性と改ざん検知を優先する。

## 5. 完了境界

本受領書は仕様反映の完了を示す。Beads task の完了は示さない。
`HarnessHub-dfm.1`〜`.13` と親 `HarnessHub-dfm` は draft PR merge と
default branch reconciliation まで `in_progress` を維持する。

## 6. CI 是正追補（2026-08-01）

PR #620 の GitHub Actions run `30552438567` では、Hub の production smoke
entrypoint が使用する `tsx` を `apps/hub` が直接宣言しておらず、clean install
環境で `Command "tsx" not found` となった。`tsx` を Hub の devDependency へ追加し、
テストも内部 binary の直接呼び出しではなく公開 package script を検証する形へ揃えた。

この是正による仕様・設計への**追加影響はなし**と判断する。変更対象は開発時の実行依存と
テスト入口だけであり、REST API、PublishRequest 状態、認証認可、DB/R2、production smoke
の S1〜S6 契約は変わらないためである。したがって qa-103〜qa-108 の再 reopen は不要で、
本受領書の既存反映を維持する。

再検証では smoke script test 2 件、Hub 842 件、schemas 86 件、workspace typecheck、
Biome 423 files を pass した。workspace 並列テストで一度だけ schemas の全 86 件成功後に
Vitest worker RPC timeout が発生したが、schemas 単独再実行は 86/86 pass しており、
今回の差分に起因するテスト失敗ではないことを確認した。
