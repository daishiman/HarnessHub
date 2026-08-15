---
status: recorded
layer: feature-evidence
parent_feature: feat-semantic-emphasis-icons
recorded_at: 2026-08-14
---

# feat-semantic-emphasis-icons 運用手引き (P12)

強調・状態表現を絵文字ではなく inline SVG アイコンと semantic color token で行う運用を、
日常作業の手順として記録する。対象は「アイコンを増やす」「lint に引っかかった」
「CI が赤い」の 3 場面と、所有境界のルールである。

## 1. アイコンを追加する

アイコンの正本は `packages/ui/src/icons/index.tsx` 1 ファイルだけ。追加は 2 箇所を触る。

### 1.1 手順

**(a) `iconNames` へ公開名を追加する**

```ts
export const iconNames = [
  'home',
  // ...
  'infoCircle',
  'yourNewIcon',   // ← camelCase で追加
] as const;
```

`as const` により `IconName` 型が自動で広がる。型定義を別途書く必要はない。

**(b) `iconPaths` へ図形を追加する**

```ts
const iconPaths: Record<IconName, ReactNode> = {
  // ...
  yourNewIcon: (
    <>
      <path d="M4 12h16" />
      <circle cx="12" cy="12" r="8.5" />
    </>
  ),
};
```

`Record<IconName, ReactNode>` なので、`iconNames` に足して `iconPaths` を忘れると
**typecheck (G3) が落ちる**。片方だけの追加は CI で止まる。

### 1.2 図形を描くときの制約

| 項目 | 値 | 理由 |
| --- | --- | --- |
| `viewBox` | `0 0 24 24` | `Icon` 側で固定。図形はこの座標系で描く |
| 塗り | なし (`fill="none"`) | stroke 表現で視覚的な重さを揃える |
| 色 | 指定しない | `stroke="currentColor"` で親の文字色を継承する。色は token 側の責務 |
| 線幅 | 指定しない | `strokeWidth={1.6}` 固定 |

**色を SVG 内に直接書かない**こと。書くと配色 palette の切り替えに追従せず、G17 の
ハードコード検査にも掛かる。

### 1.3 `aria-label` の方針

`Icon` は `label` の有無で a11y 上の扱いが変わる。

| `label` | DOM | 使う場面 |
| --- | --- | --- |
| 渡す | `role="img"` + `aria-label` | **アイコンだけで意味を伝えるとき** (アイコンボタン等) |
| 省く | `aria-hidden` | 隣に可視テキストがあり、アイコンは装飾のとき |

判断基準は「アイコンを消したら意味が失われるか」。失われるなら `label` を渡す。
隣にラベル文字列があるのに `label` も渡すと、支援技術が同じ内容を二重に読む。

callout は `Callout` 側が `aria-label={label}` を持つため、内部のアイコンは装飾扱いでよい。

### 1.4 追加後に走らせるもの

```bash
cd packages/ui && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run src/icons
```

`icons.test.tsx` (29 件) が `iconNames` と `iconPaths` の対応を検査する。

## 2. 絵文字 lint に引っかかったとき

### 2.1 まず出力を読む

```
VIOLATION: ui-text-emoji: packages/ui/src/Foo.tsx:12:8 に絵文字 '🎉' (U+1F389) がある。
```

**ファイル・行・列・符号位置 (U+XXXX) が出る**ので、該当箇所を特定できる。

### 2.2 正しい直し方

| 元の表現 | 置き換え |
| --- | --- |
| 状態を絵文字で表す (✅ ❌ ⚠️) | `Icon` の該当アイコン + semantic color token |
| 強調の飾り (🎉 🔥) | 削除するか、`Badge` / `Callout` へ置き換える |
| 空状態の挿絵 | `Icon` を大きめの `size` で使う |

### 2.3 誤検知かどうかの見分け

lint は **`Emoji_Presentation=Yes` の符号位置**と、**U+FE0F (異体字セレクタ) を伴って
絵文字表示へ切り替わる文字**だけを違反にする。次は違反にならない (既定でテキスト表示):

```
→ ← ▲ ▼ ↕ ■ ▾ ▸
```

つまり「日本語コメント中の矢印」「ソート方向の三角」「risk 記号」は素通りする。

**もし上記のようなテキスト記号で落ちたら、それは誤検知**である。対処は次のとおり。

1. 出力の `U+XXXX` を控える
2. その符号位置が本当に `Emoji_Presentation=Yes` か確認する
   ```bash
   python3 -c "import unicodedata; print(hex(ord('▲')), unicodedata.name('▲'))"
   ```
3. 判定基準の誤りなら `scripts/lint-ui-text-emoji.py` の判定を直し、
   **同時に `tests/scripts-root/test_root__lint_ui_text_emoji.py` の MUST_PASS 群へ
   その文字を追加する** (再発を固定する)

**allowlist で個別に除外しない**。誤検出を許容リストで潰し続けると、lint が
「例外まみれで誰も直さないもの」になり、ゲートとして死ぬ。判定基準そのものを直す。

### 2.4 一時退避 (恒久対処までのつなぎ)

lint の誤検知で開発全体が止まる場合に限り、`.github/workflows/ci.yml` の G19 の
2 ステップを一時的に除去する。lint script 自体は消さない。除去したら**その場で
再有効化の issue を立てる** (外したまま忘れると防御が消える)。

## 3. CI が落ちたときの切り分け

### 3.1 どのステップで落ちたか

| ステップ | 意味 | 対処 |
| --- | --- | --- |
| `G19 共通 UI 層の絵文字混入検査` | ソースに絵文字が入った | §2 の手順で直す |
| `G19 detector 実効性` | **lint が検出能力を失った** | §3.2 |
| `G17 画面層の視覚ハードコーディング検査` | 画面層に色・サイズ直書き | token へ置き換える |
| `G9 axe a11y` | a11y 違反 | 失敗テストの出力を読む |
| `G4` の `contrast.test.ts` | コントラスト閾値割れ | token の hex を見直す |

### 3.2 実効性ステップが落ちた場合

メッセージは次の形で出る。

```
絵文字 lint が意図的違反を検出できていません (期待 exit=1, 実際 exit=$code)
```

`実際 exit` の値で原因が分かれる。

| 実際 exit | 意味 | 原因の典型 |
| --- | --- | --- |
| 0 | 絵文字を置いたのに違反 0 件 | 判定ロジックが空になった / 検査対象の拡張子から `.ts` が外れた |
| 2 | 検査自体ができていない | 既定 root を変えたのに probe の `--root` を更新していない |

**exit 2 が出たら、まず `--root` の指定を疑う**。probe の一時ツリーには
`packages/ui/src` しか作らないので、既定 root に新しい root を足すと `--root` 省略時に
必ず設定エラーになる。この落とし穴は実際に一度踏んでいる (`design-review.md` §3.2)。

### 3.3 ローカルで CI と同じことを試す

```bash
# lint 本体 (CI の 1 ステップ目と同じ)
python3 scripts/lint-ui-text-emoji.py --repo-root .

# 実効性 probe (CI の 2 ステップ目と同じ)
probe="$(mktemp -d)"
mkdir -p "$probe/packages/ui/src"
printf "export const label = '\xF0\x9F\x8E\x89 done';\n" > "$probe/packages/ui/src/probe.ts"
python3 scripts/lint-ui-text-emoji.py --repo-root "$probe" --root packages/ui/src
echo "exit=$?"   # 1 なら健全
rm -rf "$probe"
```

### 3.4 落ちた範囲の見極め

G19 は `static-gates` ジョブにある。`test` は `needs: static-gates` なので、
**G19 が落ちるとテストもビルドも「実行されていない」** (失敗ではなく未実行)。
「テストが落ちた」と読み違えないこと。

## 4. 所有境界の運用ルール

### 4.1 ルール

> **アイコンは `packages/ui` だけが供給する。`apps/hub` 側で SVG を書かない。**

| やること | やらないこと |
| --- | --- |
| `packages/ui/src/icons/index.tsx` へ追加し `Icon` で使う | 画面ファイルに `<svg>` を直接書く |
| 既存の `iconNames` から選ぶ | `lucide` などのアイコンライブラリを追加する |
| 足りなければ共通 UI 層へ追加する | 画面固有だからと画面側に置く |

### 4.2 なぜか

アイコンが複数箇所から供給されると、線幅・サイズ・色の継承規則が箇所ごとにずれ、
「同じ意味なのに見た目が違う」状態が生まれる。`Icon` が `strokeWidth={1.6}` と
`currentColor` を固定しているのは、この揺れを構造的に防ぐためである。

### 4.3 現状 (2026-08-14 実測)

| 検査 | 結果 |
| --- | --- |
| `apps/hub/src` 内の `<svg` | 0 件 |
| アイコンライブラリ依存 | 0 件 |
| `iconNames` の定義箇所 | 1 箇所 |

### 4.4 注意: このルールを守らせる CI ゲートは無い

現状、所有境界の違反 (画面側での inline SVG 再実装) を自動検出する lint は**存在しない**。
レビュー時の確認事項として扱うこと。確認コマンド:

```bash
grep -rn "<svg" apps/hub/src --include="*.tsx"        # 0 件であること
grep -rn "lucide\|react-icons\|heroicons\|@tabler/icons" \
  package.json apps/*/package.json packages/*/package.json   # 0 件であること
```

所有境界 lint の追加はフォローアップ課題として起票済み。

## 5. 参照

| 目的 | 文書 |
| --- | --- |
| 判定基準・CI 位置の設計理由 | [`architecture-decision.md`](./architecture-decision.md) |
| 実測値と再実行手順 | [`evidence-bundle.md`](./evidence-bundle.md) |
| CI ゲートの充足範囲と限界 | [`quality-gate-report.md`](./quality-gate-report.md) |
