// @vitest-environment jsdom
// UOA-LEGAL-*: /legal 静的ページの全利用者アクセス方針 (Normative implementation closure / quality_constraint
// legal-static-page-all-users / acceptance3「/legal は全利用者が閲覧できる」)。
//
// Normative implementation closure (task spec) の要求: 「/legal の全role access・非ログイン方針・静的内容・
// axe=0・salary非露出をテストへ含める」。/legal は未ログインを含む全利用者に公開する静的ページであり、
// 認可判定 (ACTION_RULES) の対象に含めない設計が前提になる。
//
// P05 実装後の配置補足: sys-user-org-admin-p05.md の scope_in は `apps/hub/src/app/legal/__tests__/`
// を挙げるが、vitest.config.ts の include は `tests/**` と `src/__tests__/**` のみを収集する
// (`src/app/**/__tests__/` は対象外で、置くと収集 0 件のまま緑になる罠がある — 同 config のコメント参照)。
// そのため実テストは本ファイル (P04 から引き続く tests/user-org-admin/) に置き、
// 画面本体は AD-2 の配置通り `apps/hub/src/app/legal/page.tsx` (route group 外) に実装した。

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UiProvider } from '@harness-hub/ui';
import axe from 'axe-core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LegalPage from '../../src/app/legal/page.js';
import { findActionRule } from '../../src/lib/authz/rules.js';
import { authorize, isPublicPath } from '../../src/middleware/authz.js';

const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const LEGAL_APP_DIR = path.join(HUB_ROOT, 'src/app/legal');

function renderLegalPage(): void {
  // `<main>` をテスト側で敷かないのは、/legal が PublicShell 経由で自前の main ランドマークを
  // 持つようになったため。ここで包むと main が入れ子になり axe の landmark-main-is-top-level に触れる。
  const html = renderToStaticMarkup(
    <html lang="ja">
      <body>
        <UiProvider>
          <LegalPage />
        </UiProvider>
      </body>
    </html>,
  );
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');
  const titleEl = parsed.createElement('title');
  titleEl.textContent = '利用規約・プライバシーポリシー';
  parsed.head.appendChild(titleEl);
  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

describe('契約: /legal の認可設計 (全利用者アクセス方針)', () => {
  it('UOA-LEGAL-001: legal.* という認可 action は ACTION_RULES に存在しない (=withAuthz で role 制限しない設計)', () => {
    // /legal は「全利用者が閲覧できる」静的ページなので、他画面のように action を新設して
    // workspace-admin 等へ絞る設計にはしない。ACTION_RULES に legal 系 action が無いことを、
    // 「まだ実装していないから無い」ではなく「設計上そもそも要らない」の確認として固定する。
    expect(findActionRule('legal.read')).toBeNull();
    expect(findActionRule('legal.write')).toBeNull();
  });

  it('UOA-LEGAL-002: /legal 実装ディレクトリが AD-2 の配置 (route group 外) で存在する', () => {
    expect(existsSync(LEGAL_APP_DIR)).toBe(true);
  });

  it('UOA-LEGAL-101: 未ログイン状態 (principal=null) でも /legal への要求は許可される (withAuthz を経由しない設計の実測)', () => {
    expect(isPublicPath('/legal')).toBe(true);
    const decision = authorize({ pathname: '/legal', headers: new Map(), principal: null });
    expect(decision.allowed).toBe(true);
  });
});

describe('契約: /legal の描画内容 (静的・salary 非露出・axe=0)', () => {
  it('UOA-LEGAL-102: LegalPage は role 等の引数を取らない (呼出しごとに同一内容になる設計の実測)', () => {
    expect(LegalPage.length).toBe(0);
  });

  it('UOA-LEGAL-103 (@vitest-environment jsdom 前提): /legal は axe 違反 0 件で描画される', async () => {
    renderLegalPage();
    const results = await axe.run(document, { resultTypes: ['violations'] });
    expect(results.violations.map((violation) => violation.id)).toStrictEqual([]);
  });

  it('UOA-LEGAL-104: /legal のコンテンツに salary/年収/PII 系語彙を一切含まない', () => {
    renderLegalPage();
    for (const keyword of ['salary', '年収', '¥', '給与']) {
      expect(document.body.textContent).not.toContain(keyword);
    }
  });
});

describe('P12 引き継ぎ (運用ドキュメント確定待ちのため it.todo)', () => {
  it.todo(
    'UOA-LEGAL-105: /legal の内容更新 owner が誰か (Normative evidence「/legal role matrix」に対応する運用ドキュメントの存在確認。P12 で内容更新 owner を確定する申し送りとの整合)',
  );
});
