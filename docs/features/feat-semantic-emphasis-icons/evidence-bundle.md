---
status: recorded
layer: feature-evidence
parent_feature: feat-semantic-emphasis-icons
recorded_at: 2026-08-14
---

# feat-semantic-emphasis-icons 証跡バンドル (P11)

P01〜P10 の判定根拠となった検証を、**そのまま再実行できる形** (コマンド全文と実測出力) で
1 箇所へ集約する。他 phase の報告書は本書の実測を参照する。

収集日時: 2026-08-14 (JST)。実行環境は §1 のとおり。

## 1. 実行環境

| 項目 | 値 |
| --- | --- |
| OS | Darwin 25.3.0 (macOS / arm64) |
| Python | 3.11.4 |
| Node (検証時に使用) | v22.21.1 / arm64 (`/opt/homebrew/opt/node@22/bin/node`) |
| リポジトリ HEAD | `11417ec9` |
| 実行場所 | **ローカル** (CI ランナー上の実行ではない) |
| リポジトリ root | `/Users/dm/orca/workspaces/HarnessHub/成果物のカード一覧` |

> **Node の注意**: 対話 shell の `node` は fnm 管理の別スライスが先に解決され、
> `@rollup/rollup-darwin-x64` を要求して vitest が起動できないことがある。
> 本書の vitest 実行は arm64 の `/opt/homebrew/bin/node` から `vitest.mjs` を直接起動している。
> `which -a node` で解決順を確認すること。

以下の実測は**ローカル実行**であり、CI 上の run ではない。CI で同じ結果になることは
ワークフロー定義 (§5) が同一コマンドを呼んでいることをもって担保する。

## 2. 絵文字 lint (G19 相当)

### 2.1 適合ケース — 本リポジトリ

```bash
python3 scripts/lint-ui-text-emoji.py --repo-root .
```

```
OK: ui-text-emoji 適合 (検査 534 file, root packages/ui/src, apps/hub/src)
```

`exit 0`。

### 2.2 違反ケース — 意図的に絵文字を置いた probe

```bash
probe="$(mktemp -d)"
mkdir -p "$probe/packages/ui/src"
printf "export const label = '\xF0\x9F\x8E\x89 done';\n" > "$probe/packages/ui/src/probe.ts"
python3 scripts/lint-ui-text-emoji.py --repo-root "$probe" --root packages/ui/src
```

```
VIOLATION: ui-text-emoji: packages/ui/src/probe.ts:1:23 に絵文字 '🎉' (U+1F389) がある。
強調・状態表現は packages/ui/src/icons の inline SVG アイコンと tokens.ts の semantic color token で表す
FAIL: ui-text-emoji 違反 1 件 (検査 1 file)
```

`exit 1`。行・列・符号位置つきで報告される。

### 2.3 設定エラーケース — root 不在

同じ probe で `--root` を省く。既定 root の `apps/hub/src` が probe ツリーに無い。

```bash
python3 scripts/lint-ui-text-emoji.py --repo-root "$probe"
```

```
設定エラー: 検査対象 root が存在しない: apps/hub/src
```

`exit 2`。**「違反あり (1)」と「検査できなかった (2)」が別値**であることが、CI の実効性
チェックを `exit 1 ちょうど`に狭められる根拠である。

| 実行 | exit |
| --- | --- |
| 適合 | 0 |
| 違反検出 | 1 |
| 設定エラー | 2 |

## 3. 単体テスト

### 3.1 lint script (pytest)

```bash
python3 -m pytest tests/scripts-root/test_root__lint_ui_text_emoji.py -q
```

```
......................                                                   [100%]
22 passed in 6.65s
```

### 3.2 共通 UI 層 (vitest)

```bash
cd packages/ui && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run
```

```
Test Files  26 passed (26)
     Tests  811 passed (811)
  Duration  4.58s
```

本 feature に対応する内訳:

| test file | 件数 |
| --- | --- |
| `src/components/Markdown.test.tsx` | 30 |
| `src/icons/icons.test.tsx` | 29 |
| `src/tokens/contrast.test.ts` | 14 |
| `src/tokens/tokens.test.ts` | 394 |
| `src/a11y/axe.test.tsx` | 30 |
| `src/components/visual-contract.test.tsx` | 2 |

### 3.3 画面層の a11y (vitest)

```bash
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run tests/a11y
```

```
 ✓ tests/a11y/hub-screens.spec.ts (5 tests) 230ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Duration  2.65s
```

## 4. 画面層のハードコーディング検査 (G17)

```bash
node scripts/ci/check-ui-hardcoding.mjs
```

```
check:ui-hardcoding OK — 画面層に視覚のハードコーディングはありません
```

`exit 0`。CI では `pnpm check:ui-hardcoding` が検査本体の前に
`node --test scripts/ci/check-ui-hardcoding.test.mjs` を走らせる。

## 5. CI 定義の該当箇所 (`.github/workflows/ci.yml`)

`static-gates` ジョブ (80-102 行):

```yaml
- name: G19 共通 UI 層の絵文字混入検査 (semantic emphasis icons)
  run: |
    mkdir -p artifacts
    python3 scripts/lint-ui-text-emoji.py --repo-root . --json > artifacts/ui-text-emoji.json
- name: G19 detector 実効性 (意図的な絵文字を検出できること)
  run: |
    probe="$(mktemp -d)"
    mkdir -p "$probe/packages/ui/src"
    printf "export const label = '\xF0\x9F\x8E\x89 done';\n" > "$probe/packages/ui/src/probe.ts"
    set +e
    python3 scripts/lint-ui-text-emoji.py --repo-root "$probe" --root packages/ui/src > /dev/null 2>&1
    code=$?
    set -e
    rm -rf "$probe"
    if [ "$code" -ne 1 ]; then
      echo "絵文字 lint が意図的違反を検出できていません (期待 exit=1, 実際 exit=$code)"; exit 1
    fi
    echo "絵文字 lint 実効性チェック完了 (exit=$code)"
```

`test` ジョブ (138-141 行) は `needs: static-gates` を宣言し、`deploy` (247 行) は
`needs: [static-gates, test]`。`static-gates` 内のステップに `continue-on-error` と `if:` は
いずれも 0 件。

## 6. コントラスト実測 (WCAG 2.1 相対輝度)

`packages/ui/src/tokens/contrast.ts` の `contrastRatio` と同じ式を、既定 (グレー) palette の
実 hex に適用した結果。基準は本文 4.5 / 非テキスト (アイコン・枠線) 3.0。

### 6.1 ライトモード

| 種別 | 面 | 本文 | アイコン+枠線 |
| --- | --- | --- | --- |
| point | `infoBlueSoft` #e7effb | 15.88 | 5.79 |
| attention | `dangerSoft` #f6e2e0 | 14.77 | 5.20 |
| warning | `warningSoft` #f3e8d3 | 15.14 | 4.77 |
| note | `infoBlueSoft` #e7effb | 15.88 | 3.15 |

### 6.2 ダークモード

| 種別 | 面 | 本文 | アイコン+枠線 |
| --- | --- | --- | --- |
| point | #152845 | 14.16 | 8.19 |
| attention | #3b201f | 14.25 | 7.81 |
| warning | #362a15 | 13.42 | 8.58 |
| note | #152845 | 14.16 | 3.32 |

全項目が基準を超過。5 配色 × light/dark の全組み合わせは `contrast.test.ts` (14 件) と
`tokens.test.ts` (394 件) が宣言ベースで検証しており、本表はそれを実 hex から独立に
確かめた二重確認である。

## 7. 所有境界の実測

```bash
grep -rn "<svg" apps/hub/src --include="*.tsx" | wc -l          # → 0
grep -rn "lucide\|react-icons\|heroicons\|@tabler/icons" \
  package.json apps/*/package.json packages/*/package.json | wc -l   # → 0
grep -rn "export const iconNames" packages apps --include="*.tsx"    # → 1 箇所
```

| 検査 | 結果 |
| --- | --- |
| `apps/hub/src` 内の `<svg` | 0 件 |
| アイコンライブラリ依存 | 0 件 |
| `iconNames` の定義箇所 | `packages/ui/src/icons/index.tsx` の 1 箇所 |

## 8. 再実行手順 (まとめ)

上から順に実行すれば本書の全実測を再現できる。

```bash
cd <repo-root>
python3 scripts/lint-ui-text-emoji.py --repo-root .                         # exit 0
python3 -m pytest tests/scripts-root/test_root__lint_ui_text_emoji.py -q    # 22 passed
node scripts/ci/check-ui-hardcoding.mjs                                     # exit 0
(cd packages/ui && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run)
(cd apps/hub  && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run tests/a11y)
```

probe による違反ケース (§2.2 / §2.3) は CI の G19 実効性ステップが毎 run 実行する。
