---
status: accepted
layer: frontend-implementation-guide
feature: feat-hub-foundation
spec_qa_refs: [qa-201, qa-203, qa-204]
reviewed_at: 2026-08-08
---

# UI 基盤の使い方と検証

## 中学生向けの説明

Web 画面を「毎回ちがう材料で作る」のではなく、同じレゴ部品で作れるようにした。ヘッダー、本文の幅、メニュー、カード、色、余白を共通部品にし、読み込み中・ページが無い・権限が無いときも同じ伝え方をする。

さらに本物の Chrome で、小さい画面・中くらいの画面・大きい画面を開く。ボタンが小さすぎないか、右側が画面の外へはみ出していないか、見た目が前回から勝手に変わっていないかを自動で確認する。

## 実装者向けの要点

### 1. 画面骨格

新しい業務画面は、原則として次の順に組み立てる。

```tsx
<AppShell brand="Harness Hub">
  <SidebarLayout nav={<NavList label="主要ナビ" items={items} />}>
    <PageHeader title="画面名" />
    <Stack gap={5}>
      <Card>内容</Card>
    </Stack>
  </SidebarLayout>
</AppShell>
```

- `AppShell` が skip link、header、main landmark を所有する。
- `Container` が本文幅と左右余白を所有する。
- `SidebarLayout` の列切替は base CSS が所有する。
- 画面側は色や任意 px を増やす前に token / primitive で表現できるか確認する。

### 2. token と breakpoint

| 項目 | 正本 |
|---|---|
| 色・余白・文字・密度 | `packages/ui/src/tokens/tokens.ts` |
| focus ring | `packages/ui/src/tokens/focus-ring.ts` |
| base CSS | `packages/ui/src/tokens/base-css.ts` |
| breakpoint | `breakpointTokens` (`480 / 768 / 1120`) |

CSS の media query に 768px などを直接増やさず、`mediaUp()` または base CSS generator を通す。light / dark の文字色は 4.5:1、操作部品の輪郭は 3:1 を token test で確認する。

### 3. 状態の選び方

| 状況 | 使用する表現 |
|---|---|
| データ取得中 | `LoadingScreen` |
| データが 0 件 | `EmptyState` と次の操作 |
| URL に対応するものが無い | `NotFoundScreen` |
| 403・権限不足 | `ForbiddenScreen` |
| 予期しない例外 | `ErrorScreen` |

403 を「もう一度サインイン」に変換しない。権限不足は再認証で解消しないため、ループではなく管理者への依頼導線を示す。

### 4. 表と狭い画面

表は列を無理に潰さず、`DataTable` の局所スクロール容器で受け止める。`document.documentElement.scrollWidth` が viewport を超える状態は不合格である。折り返せない URL や長い識別子も実ブラウザ fixture に含める。

### 5. catalog と VRT

`apps/hub/tests/browser/catalog-entries.tsx` に entry を追加するときは分類を付け、light / dark の両方で意味が通る fixture にする。時刻・乱数・外部 API 応答など毎回変わる値を snapshot に入れない。

VRT が落ちた場合は actual / diff を目で確認する。意図した変更なら対応 OS の baseline を更新し、意図しない変更なら実装を直す。CPU architecture 差だけで baseline を分けない。

## ローカル検証

```bash
pnpm --filter @harness-hub/ui typecheck
pnpm --filter @harness-hub/ui test
pnpm --filter @harness-hub/hub typecheck
pnpm --filter @harness-hub/hub run check:screen-states
pnpm --filter @harness-hub/hub run test:browser
```

Chromium が未導入なら `pnpm --filter @harness-hub/hub exec playwright install chromium` を先に実行する。

## 関連文書

- 規範追補: `specs/harness-hub-ui-foundation-addendum.md`
- frontend 全体仕様: `docs/frontend-spec.md`
- 仕様反映受領書: `docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md`
