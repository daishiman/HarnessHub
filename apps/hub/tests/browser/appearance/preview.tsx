/**
 * 配色 (palette) の参考画像を撮るための見本画面 (feat-appearance-theming)。
 *
 * カタログ (`catalog/entries.tsx`) は「部品ごとの見た目」を撮る場所で、group 単位に分かれている。
 * 配色の確認はそれとは目的が違い、**1 枚の中に面・文字・境界・強調色が同時に写っている**
 * 必要がある。配色の破綻は「単体では読めるが、隣り合うと沈む」形で出るため、
 * 部品を跨いだ 1 枚を別に用意する。
 *
 * 見本のデータは全て固定値。日付や乱数を入れると、変更していないのに画素差分が出て
 * VRT が「たまに落ちる検査」に退化する (カタログ側と同じ約束)。
 */

import {
  Alert,
  AppearancePicker,
  Button,
  Card,
  Container,
  type PaletteName,
  ProgressBar,
  ScreenHeader,
  Select,
  Stack,
  TextInput,
  type ThemeName,
  Tile,
  UiProvider,
} from '@harness-hub/ui';
import type { ReactNode } from 'react';

/** 配色の見本に載せる配色名の表示。撮影対象がどれか画像上で分かるようにする。 */
const PALETTE_LABELS: Readonly<Record<PaletteName, string>> = {
  gray: 'グレー',
  blue: 'ブルー',
  beige: 'ベージュ',
  green: 'グリーン',
  navy: 'ネイビー',
};

/**
 * 1 配色ぶんの見本画面。
 *
 * 配色は `<html>` 側 (文書外周の背景) と `UiProvider` 側 (その配下の部品) の両方へ同じ値を渡す。
 * provider は自前で `data-theme` / `data-palette` を持つ div を描くため、html 属性だけでは
 * 配下の部品が provider の既定値 (auto/gray) に引き戻され、dark を撮ったつもりで
 * light の写真が残る (density で同じ対処をしている responsive テストと同型)。
 */
export function renderAppearancePreview(palette: PaletteName, theme: ThemeName = 'light'): ReactNode {
  return (
    <UiProvider defaultPreferences={{ palette, theme }}>
      <Container size="standard">
        <Stack gap={6}>
          <ScreenHeader
            title={`配色の見本: ${PALETTE_LABELS[palette]}`}
            description="面・文字・境界・強調色の関係を 1 枚で確認する。"
          />
          <Card title="操作部品" description="押せるものが背景から浮いて見えるか。">
            <Stack gap={3} direction="horizontal">
              <Button>主操作</Button>
              <Button variant="secondary">副操作</Button>
              <Button variant="ghost">補助</Button>
              <Button variant="danger">削除</Button>
            </Stack>
          </Card>
          <Card title="入力部品" description="枠線と背景のコントラストが保たれているか。">
            <Stack gap={3}>
              <TextInput label="ツール名" description="30 文字まで" defaultValue="見積もり作成支援" />
              <Select
                label="公開範囲"
                defaultValue="tenant"
                options={[
                  { value: 'tenant', label: 'テナント全体' },
                  { value: 'private', label: '自分のみ' },
                ]}
              />
              <ProgressBar label="生成の進捗" value={40} />
            </Stack>
          </Card>
          <Card title="状態の色" description="情報・注意・失敗が配色に埋もれず区別できるか。">
            <Stack gap={3}>
              <Alert tone="info" title="お知らせ" description="内容の説明。" />
              <Alert tone="warning" title="注意" description="確認が必要です。" />
              <Alert tone="danger" title="失敗" description="保存できませんでした。" />
              <Tile dashed tone="muted">
                まだ何もありません。
              </Tile>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </UiProvider>
  );
}

/**
 * 外観メニュー単体の見本。アカウントメニューから開く「テーマメニュー」に相当する。
 *
 * 見本は選択を通知しない (`onChange` 省略)。VRT は「今の配色で描いた見た目」を撮るので、
 * ここから配色を切り替えると撮影中に画素が動く。
 */
export function renderAppearanceMenu(theme: ThemeName = 'light'): ReactNode {
  return (
    <UiProvider defaultPreferences={{ theme }}>
      <Container size="narrow">
        <Stack gap={4}>
          <ScreenHeader title="外観" description="配色と明るさを選ぶ。選択はアカウントに保存される。" />
          <Card title="テーマメニュー">
            <AppearancePicker name="preview" />
          </Card>
        </Stack>
      </Container>
    </UiProvider>
  );
}
