---
status: confirmed
layer: feature-design
task: SYS-BUILD-IDENTITY-P03
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P03 設計レビュー — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`

P02 の決定に対し、「この設計で壊れうる箇所はどこか」を先に洗い出した記録。

## 検討した失敗様式 (failure mode)

| # | 失敗様式 | この設計での抑止 | 抑止が効かなくなる条件 |
|---|---|---|---|
| F1 | 埋込が外れても検査が緑のまま | `commit-unavailable` で exit 1（AD-4） | `evaluateFreshness` の早期 return を削る改変 → P04 のテストで固定 |
| F2 | 短縮 sha や branch 名を素性と誤認 | schema と `resolveCommit` の両方で `^[0-9a-f]{40}$` 強制 | 片方だけ緩める改変 → 双方にテストを置いて固定 |
| F3 | しきい値が文書と実装で食い違う | 定数は script 1 箇所のみ（AD-5） | 文書に数値を再掲すること自体が危険なので、運用文書は定数名で参照する |
| F4 | 判定式の書き間違いで常時通過 | 純関数 `evaluateFreshness` を本物のまま子プロセスで呼ぶ挙動テスト | workflow の文言検査だけにすると F4 を検出できない |
| F5 | キャッシュ済み応答を配信中の版と誤認 | `Cache-Control: no-cache` を明示 | — |
| F6 | 鮮度失敗が rollback を誘発し古い版へ固定 | rollback の除外分岐（AD-7） | env 配線 `DEPLOY_FRESHNESS_OUTCOME` が外れると分岐が常に真になる → workflow テストで配線を固定 |
| F7 | commit 露出が情報漏洩になる | 40 桁 hex 以外は schema が拒否するため、path や token は構造的に入り得ない | — |

## 型レベルの論点: `exactOptionalPropertyTypes`

本 repository は `exactOptionalPropertyTypes: true` を有効にしており、
**「key が無い」と「key が undefined」を型が区別する**。

`buildHealthResponse` の入力を `commit?: string` とすると、呼び出し側は
`resolveCommit(env)` の戻り（`string | undefined`）をそのまま渡せず、呼び出し側に条件分岐を書かせることになる。
そこで意図的に `commit?: string | undefined` と明示し、**「解決できなかった」をそのまま渡せる** ようにした。
key を落とす判断は `buildHealthResponse` の内側に 1 箇所だけ置く（AD-3 の実装位置）。

## テスト経路の論点: TS から `.mjs` を検査する

`tsconfig` が `allowJs: false` のため、TS テストから `check-deploy-freshness.mjs` を直接 import すると
typecheck が落ちる。既存の `apps/hub/tests/ci/*` が全て subprocess 経由なのと同じ制約である。

採った経路は 2 段構え:

1. **判定の網羅** — `node --input-type=module -e` の子プロセスで本物の module を import させ、
   `evaluateFreshness` の戻りを JSON で受け取る。モックではなく本物を動かす。
2. **実際に落ちること** — 本物の CLI を localhost の stub `/health` サーバへ向けて起動し、**exit code** で測る。

## レビュー指摘と反映

- 指摘: `evaluateFreshness` が `servedCommit === headCommit` を先に見ると、両方空文字のときに「一致」で通ってしまう
  → 反映: 形式検査を **先に** 置き、空文字は `commit-unavailable` で落とす。P04 に「埋込が壊れていても
  `===` 成立で通さない」テストを追加。
- 指摘: 境界（乖離 = しきい値ちょうど）の扱いが曖昧
  → 反映: `lagMinutes < maxLagMinutes` を猶予の条件とし、**ちょうどは stale 側に倒す**。テストで固定。
- 指摘: ci.yml へ step を挿入すると、既存 `version-gate-behavior.test.ts` が区間を切り出す際の
  end marker（OIDC smoke）までに新 step の YAML が紛れ込む
  → 反映: end marker を `- name: 稼働ビルドの鮮度検査` へ変更。
