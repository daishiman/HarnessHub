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
| Web (web) | 確定 | 確定質疑: qa-ui-ux-web |
| モバイル (mobile) | 対象外 | 理由: 本システムはクライアント実装を含まず、モバイル向け成果物を作らないため |
| タブレット (tablet) | 対象外 | 理由: 本システムはクライアント実装を含まず、タブレット向け成果物を作らないため |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |

## 確定内容 (質疑録)

### qa-ui-ux-web (対応セル: web)

**質問**: カテゴリ ui-ux × platform web の要件は何か (system-spec/requirements-brief.md §3 の確定回答を一次入力とする)

**回答**: UI は持たない。API の使い勝手として、エラー応答を `{"error": {"code", "message"}}` に統一し、OpenAPI 定義を `/openapi.json` でローカル提供する。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| presentation | Apple Human Interface Guidelines | 画面設計・操作フロー・情報階層・アクセシビリティの上流原則 | https://developer.apple.com/design/human-interface-guidelines |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

- `ref-system-design-knowledge/references/resource-map.yaml` (このカテゴリ専用の deep card は resource-map に未定義。本章の設計判断は「上流指針 (doctrine anchor)」節の authority と「確定内容 (質疑録)」を正本とする)

---

### UI 非提供システムにおける presentation concern の読み替え

- project candidate: `api-usability-without-ui` (`deepened`)
- 解決対象: 確定内容が『UI は持たない』のため、画面設計を前提とする presentation 指針をそのまま適用できない

#### 目的

presentation concern を『画面の使い勝手』から『API の使い勝手』へ読み替え、確定内容 (エラー応答 {"error": {"code", "message"}} の統一・/openapi.json のローカル提供) を指針へ接地させる

#### 解決する問題

- UI を持たない API で『使い勝手』の評価軸が空になり、章が形骸化する

#### 適用条件

- 成果物が HTTP API だけで、クライアント実装を含まない本システムの構成

#### 非適用条件

- 画面を持つ成果物。Apple HIG のような画面前提の指針は本章では画面設計としては適用せず、『API 使用性 (エラー形状の一貫性・自己記述性)』へ読み替えて適用する

#### トレードオフ

- 視覚的な作り込みを評価できない代わりに、機械可読な契約 (/openapi.json) で使い勝手を検証できる

#### 失敗モード

- エラー形状が実装ごとに分岐し OpenAPI 定義と乖離する。定義を生成物から出すことで乖離を防ぐ

#### goalへの寄与

G2 (401 を含む異常系の一貫した表現) / G4 (定義 1 本で使い方が伝わる)

---

#### 本章での適用

- 上記原則は確定内容 qa-ui-ux-web (対応セル: web) の判断へ適用する
- 資するゴール: G2, G4

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
