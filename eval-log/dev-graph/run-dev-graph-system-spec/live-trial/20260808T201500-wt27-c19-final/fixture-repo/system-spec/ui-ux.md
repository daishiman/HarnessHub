---
status: confirmed
category: ui-ux
aggregate: 確定
spec_cells: [ui-ux.web, ui-ux.mobile, ui-ux.tablet, ui-ux.desktop-windows, ui-ux.desktop-linux, ui-ux.desktop-macos]
serves_goals: [G2, G4]
---

# UI-UX (ui-ux)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-023 |
| モバイル (mobile) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、モバイル向け成果物を作らないため |
| タブレット (tablet) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、タブレット向け成果物を作らないため |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |

## 確定内容 (質疑録)

### qa-023 (対応セル: web)

**質問**: UI-UX × Web (web) について、利用者との接点をどう設計しますか。画面を持つ/持たないの判断と、その判断に至った設計上の理由を教えてください。

**回答**: UI は持たない。API の使い勝手として、エラー応答を `{"error": {"code", "message"}}` に統一し、OpenAPI 定義を `/openapi.json` でローカル提供する。

【適用した上流指針・設計原則と、その原則がこの要件になった理由】
- Apple HIG (presentation concern) の consistency 原則を、UI を持たない本システムでは『API 応答の一貫性』へ適用 → 確定内容の『エラー応答を `{"error": {"code", "message"}}` に統一』 → 呼び出し側 (curl や自作 script) が失敗理由を経路ごとの個別解釈なしに判別でき、G2 の認証失敗 (401) を含む異常系を一様に扱えるため。
- Apple HIG の discoverability 原則を『操作可能性の発見』へ適用 → 確定内容の『OpenAPI 定義を `/openapi.json` で提供』 → 専用クライアントを持たない構成 (U7 out) でも利用可能な操作の全体像を利用者が発見でき、G4 を損なわないため。
- 上記 HIG 適用時の制約として提供先を localhost に限定 → 確定内容の『ローカル提供』 → 発見可能性の向上が外部への情報送出にならないようにし G1 を侵さないため。画面を持たない判断は U7 out (GUI クライアント実装) に従う。

(上流指針: Apple Human Interface Guidelines (presentation) / deep card: 該当なし。上の各 - は 1 論点で、spec-state-contract の「qa_log の論点分離」に従い qa-023-p1..p3 として分離索引 entry も追記している。)

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| presentation | Apple Human Interface Guidelines | 画面設計・操作フロー・情報階層・アクセシビリティの上流原則 | https://developer.apple.com/design/human-interface-guidelines |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

- `ref-system-design-knowledge/references/resource-map.yaml` (このカテゴリ専用の deep card は resource-map に未定義。本章の設計判断は「上流指針 (doctrine anchor)」節の authority と「確定内容 (質疑録)」を正本とする)

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
