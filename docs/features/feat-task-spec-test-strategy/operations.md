---
status: confirmed
layer: feature-operations
task: SYS-TASK-SPEC-TEST-STRATEGY-P12
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
consumes: [docs/features/feat-task-spec-test-strategy/final-review.md, eval-log/system-dev-planner/task-spec-test-strategy/evidence-manifest.json]
---

# テスト戦略 section 運用ガイド

> **位置づけ**: P12 (ドキュメント・運用) の成果物。system-dev-planner でタスク仕様書を書く/生成する担当者が、テスト戦略 4 項目を迷わず一貫して記述できるようにする手順書。**本文書は仕様上の制約の運用手順であり、テスト実行基盤 (Vitest / Playwright) の設定や CI 配線は範囲外** (goal-spec scope_out 1/2)。

## 1. 3 行サマリ

1. `## テスト戦略` を `## スコープ外` と `## Verification and evidence` の**間**に置く。
2. 4 項目を **`テストレベル選定` → `カバレッジ目標` → `層別方針` → `保守性制約` の順**で、`- ラベル: 本文` の形で書く。
3. 契約 version は package の canonical digest から台帳解決される。新規 package は未登録 = `1.2.0` なので、欠落は promotion 前に **exit 2** で止まる。

## 2. 記述手順 (5 ステップ)

### Step 1 — 配置を決める

```markdown
## スコープ外
...

## テスト戦略          ← ここ

## Verification and evidence
```

順序が違うと `task-spec-test-strategy-placement` で拒否される。「scope が決まる → テスト範囲が決まる → 検証手段が決まる」という依存順に読み順を合わせるための固定である。

### Step 2 — `テストレベル選定` を書く

**単体・結合・境界値・回帰の 4 語すべて**を本文に出す。適用しないレベルは消さずに `N/A: 理由` を書く。

```markdown
- テストレベル選定: 単体=導出関数、結合=validate() 全経路、境界値=契約版の閾値、回帰=既存スイート全件。
```

> 4 語のいずれかが欠けると `task-spec-test-strategy-content` で拒否される。「今回は単体だけ」と書きたい場合も、残り 3 レベルを `N/A: 理由` の形で言及する。**書かないことと、適用外だと判断したことは別**であり、後者だけを許す。

### Step 3 — `カバレッジ目標` を書く

**`80%` という数値表現を必ず含める**。層別に上げ下げする場合は既定値を書いたうえで上書き値と理由を併記する。

```markdown
- カバレッジ目標: 既定 80% を維持する。認証境界の分岐のみ 90% へ引き上げる (侵害時の影響が非可逆なため)。
```

> 検査は「既定値 80% の存在」だけを見る。追記は禁止されないので、上書きは自由に書ける。

### Step 4 — `層別方針` を書く

`## Workstream applicability` で **applicable と宣言した層**に対応する方針を書く。対応表は次のとおり (Backend / API / Data はどれか 1 つでも applicable なら `backend` 層が必須)。

| Workstream が applicable | 必須の語 | 書く内容 |
|---|---|---|
| Frontend | `behavior` | accessible role / ラベルで要素を選ぶ behavior ベースのテスト |
| Backend / API / Data | `API 契約` かつ `DB 結合` | API 契約テスト + ビジネスロジック単体 + DB 結合テスト |
| Infrastructure | `IaC` かつ `smoke` | IaC / 設定の静的検証 + デプロイ後 smoke |
| Security / Quality / Documentation / Operations | (なし) | 層別テスト方針の対象外。単独ならこの項目は `N/A: 理由` |

どの層も触らない task (ドキュメント専業など) は空欄にせず `N/A: 理由` を書く。

```markdown
- 層別方針: N/A: 実行基盤の層を触らない dev-tooling の変更である。
```

> 欠落は `task-spec-test-strategy-layer` で拒否される。この検査は **Workstream applicability の宣言と突き合わせる**ので、「Frontend: applicable」と書いておいて層別方針に `behavior` が無い、という食い違いはその場で落ちる。

### Step 5 — `保守性制約` を書く

**`pixel` と `DOM` の両方**を、禁止の文脈で書く。あわせて過剰テストの線引きを書く。

```markdown
- 保守性制約: pixel 位置依存と DOM 構造依存のテストを禁止する。実装詳細 (内部 state 名・private 関数) に密結合するテストは作らない。
```

## 3. 保守性制約 (pixel 位置・DOM 構造依存の禁止) の運用

### 3.1 なぜ仕様段階で縛るか

ボタンを 8px ずらす、`<div>` を `<section>` に変える — こうした**振る舞いが変わらない変更**でテストが赤くなると、チームは「テストを直す」ではなく「テストを消す」方向へ流れる。実装後の努力目標では守れないので、タスク仕様書の必須項目として先に固定する (qa-078)。

### 3.2 判断基準 (レビュー時のチェック)

| 書き方 | 判定 | 理由 |
|---|---|---|
| `getByRole('button', { name: '保存' })` | ✅ 推奨 | 利用者が認識する役割と名前で選んでいる |
| `getByLabelText('メールアドレス')` | ✅ 推奨 | 同上 |
| `container.querySelector('div > div:nth-child(3)')` | ❌ 禁止 | DOM 構造依存。要素を 1 つ挟むだけで壊れる |
| `expect(el.style.top).toBe('120px')` | ❌ 禁止 | pixel 位置依存 |
| `expect(wrapper.state().isOpen).toBe(true)` | ❌ 禁止 | 実装詳細への密結合 (過剰テスト) |
| `expect(screen.getByText('保存しました')).toBeVisible()` | ✅ 推奨 | 利用者が観測できる結果を見ている |

### 3.3 「どこまで管理するか」の線引き

- **書く**: 利用者・呼び出し側が観測できる振る舞い (表示される文言、API のレスポンス契約、永続化された状態)。
- **書かない**: 内部 state 名、private 関数、中間データ構造、CSS の具体値。これらは実装を改善するたびにテストを道連れにする。
- 迷ったら「**この実装をまるごと書き直しても、このテストは意味を保つか**」を問う。保たないなら過剰テストである。

> 本 feature が実装するのは**仕様への明記まで**である。pixel / DOM 依存を静的に検出する lint は goal-spec scope_out 4 として明示的に範囲外であり、現時点ではレビュー時の人手判断で運用する。

## 4. 契約 version の運用

契約 version は package が自己申告するのではなく、**canonical digest から台帳 `plugins/system-dev-planner/assets/validation-contract-baseline.json` を引いて**解決する。

| 台帳の登録状態 | 解決される版 | モード | section の扱い |
|---|---|---|---|
| 未登録 (新規 package はこれ) | `1.2.0` | `enforced` | 13 task spec 全件で必須。欠落は exit 2 |
| `1.1.0` / `1.0.0` で登録済み | 登録値 | `legacy` | 任意。**ただし書いた場合は 4 項目検査が同じ厳格さで発火する** (strict-if-present) |
| digest 再計算不能 | `1.2.0` | `enforced` | fail-closed。緩い側へは倒れない |

新規 feature package は何も宣言しなくても `1.2.0` で検証される。台帳への追記は 「現行契約で pass しない promoted 世代の救済」に限る (受入条件は台帳の `policy.amendment` に明文化)。既存 package を上げる手順は `compatibility-note.md` §5 を参照。

**確認方法**: validator の出力 JSON に必ず `test_strategy_contract` が出る。

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/<slug> | python3 -m json.tool
```

```json
"test_strategy_contract": { "mode": "enforced", "contract_version": "1.2.0", "enforced_from": "1.2.0" }
```

> `mode` を常に出力するのは、**「検査した結果 OK」と「そもそも検査していない」を証跡から区別できるようにする**ためである。ここが `legacy` のまま緑になっているのを見たら、それは「合格した」ではなく「まだ効いていない」と読む。

## 5. トラブルシュート (violation code → 対処)

| violation code | 意味 | 対処 |
|---|---|---|
| `…-missing` | enforced なのに section が無い | Step 1..5 で section を追加する |
| `…-duplicate` | `## テスト戦略` が 2 個以上 | 1 個に統合する (どちらを正とするか機械には決められない) |
| `…-placement` | 配置位置が違う | `## スコープ外` と `## Verification and evidence` の間へ移す |
| `…-empty` | 見出しだけで本文が無い | 4 項目を書く |
| `…-item-missing` | 4 項目のどれかが無い | 不足ラベルを追加する (detail に不足ラベル名が出る) |
| `…-item-order` | 項目の順序が違う | 固定順に並べ替える |
| `…-item-empty` | ラベルだけで本文が空 | 本文を書く。適用外なら `N/A: 理由` |
| `…-content` | 必須語 (4 レベル語 / `80%` / `pixel` / `DOM`) が無い | Step 2/3/5 を見直す |
| `…-layer` | applicable な層の方針が無い | Step 4 の対応表で必須語を補う。detail に `<層>: missing marker` が出る |

いずれも 1 件でも積まれれば `validate()` は `status=fail` を返し、`main()` は **exit 2** で終了する (promotion されない)。

## 6. 生成側 (自動生成) の運用

タスク仕様書は原則 `/system-dev-plan` で生成する。生成側の正本は次の 2 つで、**手で書き換えたら両方を同時に更新する**。

| ファイル | 役割 |
|---|---|
| `plugins/system-dev-planner/references/system-task-spec-template.md` | テンプレート正本 (`template_version: 1.2.0`) |
| `plugins/system-dev-planner/skills/run-system-dev-plan/prompts/R3-emit.md` | 生成側の指示 (section 数・版・チェックリスト) |

片方だけ更新すると、生成器が矛盾する 2 つの指示を受けて section を出力しない事故になる (P03 finding F-2 の実測根拠)。

**既知の注意点**: 生成される task spec の Verification 節には `validate-system-plan.py --repo-root . --staging .` という**実行不能な形**が入る。再実行時は世代非依存の `--feature-package <id>` 形へ読み替える (`final-review.md` §7 D-2)。この生成側の修正は本 feature の範囲外で、P13 の申し送り事項である。
