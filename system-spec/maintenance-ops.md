---
status: confirmed
category: maintenance-ops
aggregate: 確定
spec_cells: [maintenance-ops.web, maintenance-ops.mobile, maintenance-ops.tablet, maintenance-ops.desktop-windows, maintenance-ops.desktop-linux, maintenance-ops.desktop-macos]
serves_goals: [G1, G2, G3, G4, G5]
---

# 保守運用管理 (maintenance-ops)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-188 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。運用対象は Hub (web) と作者環境 (macOS/Windows) のみ |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。運用対象は Hub (web) と作者環境 (macOS/Windows) のみ |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-044 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-044 |

## 確定内容 (質疑録)

### qa-188 (対応セル: web)

**質問**: C07 独立監査ラウンド10 (verdict PASS) が MEDIUM 2 件を残した。うち 1 件は 『9 件目の分類語彙の見落とし』の継続指摘である。packages/db/schema/core/identity.ts:14 の tenants.status (text('status', {enum: ['active','suspended']})) が、apps/hub/src/lib/auth/db-ports.ts:306-308 (enabled: tenant.status === 'active'、コメント『停止中テナントは接続を解決させない。認証の入口で閉じる方が安全側』) と resolveTenantOidcConfig を通じて段0 (認証基盤可用性) の判定に直接使われているにもかかわらず、qa_log のいずれにも記録されていない。段0 語彙へ追加せよ。

**回答**: C07 の指摘を受け入れ、**tenants.status を段0 の語彙へ追加する**。qa-178-a と同一の基準で扱う。

[qa-188-a 段0 へ含める根拠] qa-175 で定めた物差しは『操作結果としてのエラー種別か、認証解決前の前提状態記述か』であり、後者を段0 とする。tenants.status は「このテナントで認証解決を試みてよいか」という**前提状態の記述**であって、処理を試みた後に返る業務エラーではない。qa-178-a で段0 へ入れた IdpCredentialStatus (pending/tested/active/disabled) と同じ側にある。コード上の理由づけも酷似しており、db-ports.ts の『認証の入口で閉じる方が安全側』は idp-lifecycle.ts の『認証解決に使ってよい唯一の状態』と同じ設計思想の表明である。同じ思想で書かれた 2 つの語彙のうち片方だけを段0 に入れるのは、基準の一貫性を欠く。

[qa-188-b これは本 feature の症状の候補 (3) に直結する] qa-185 で残した候補 (3)「認証以外の原因 (テナント接続未登録・無効化)」の実体がこれである。tenants.status === 'suspended' のとき resolveTenantOidcConfig は接続を解決せず、signin ページは『このテナントではサインインできません』へ倒れる。**この経路は秘密の投入状態とは完全に独立している**。つまり本番症状は、secret が正しく投入され正しく読めていても、テナントが suspended であるだけで同じように発生し得る。そして現状、利用者にも運用者にも **どちらが起きたのかを区別する手段が無い**。候補 (3) を候補 (1)(2) と同格で残すべき理由がここで具体化した。

[qa-188-c E-3 の記録項目への追加] E-3 が記録すべき『縮退の理由』に、次を区別可能な形で含める: (i) テナントが解決できない (slug 不一致)、(ii) テナントは在るが status が active でない、(iii) OIDC 接続が登録されていない、(iv) 環境値が解決できない (名前を記録)、(v) cookie が無い、(vi) 署名検証に失敗した。**値は記録しない** (qa-151 [147-b] の非記録契約を維持)。記録するのは分類と名前だけである。現状これら 6 つが利用者から見てほぼ同一の出力へ潰れていることが、本 feature の欠陥の中身である。

[qa-188-d 併記する既存文書の状態] docs/backend-spec.md:55 は tenants テーブルの status(active/suspended) を**スキーマとしては既に文書化している**。欠けているのはスキーマの存在ではなく、その値が認証可用性へ連動するという**結線の記述**である。これは qa-182 で扱った E-4 と同じ型の錯誤 (既にあるものを無いと見なす) を避けるための注記であり、本 turn は『新しい列を作れ』ではなく『既存列と認証可用性の連動を文書と語彙に載せろ』を求める。

[qa-188-e 併せて残る DeviceAuthorizationStatus の三重定義] C07 が前回から継続指摘している DeviceAuthorizationStatus の情報源が 3 つある件 (ports.ts:117 / repository/device-flow.ts:23 / drizzle schema publish.ts:106) も未対応のまま残る。V7 (同一のリテラル union が 2 箇所に独立定義されている状態を検出する) の対象に、**drizzle schema を第 3 の情報源として含める**ことを明記する。型宣言と zod だけを突合する実装にすると、この 3 件目が検査をすり抜ける。

### qa-044 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者デスクトップ環境 (macOS / Windows) の保守運用 (更新導線・サポート・資格情報とローカル環境の維持) は何を正本とするか? (C07 監査指摘への対応: maintenance-ops.desktop-windows/desktop-macos の qa_ref=qa-011 は Hub web 側運用中心の回答で desktop 固有の裏付けが薄い。既確定内容の集約による専用質疑化であり新規決定は含まない)

**回答**: 既確定の qa-011 / qa-027 / qa-039 / qa-041 の desktop 該当部分を maintenance-ops.desktop の専用正本として集約確定する。(1) plugin 更新導線 (qa-011): 作者環境の Publisher / Skill 更新は marketplace / Bootstrap Installer の更新導線 (「更新あり」表示 + 手動 update) で提供し、自動強制更新はしない。(2) 作者サポート (qa-011): 相談は予約制 office hour (供給上限あり §11.3)。(3) 退職・棚卸し (qa-027): 四半期のユーザー棚卸し (退職者アカウント無効化・owner 再割当確認) は作者デスクトップの token 失効 (Hub Web からの即時失効 = qa-041) と対にして実施する。(4) ローカル環境の維持 (qa-039): CI と同一実装の pnpm verify (lint/typecheck/test/bundle size) を local から実行可能に保ち「local では通るが CI で落ちる」を構造的に減らす。pre-commit hook (lint/format/secret scan) は早期検知の補助で、正本の遮断は CI 側。(5) 資格情報のインシデント初動 (qa-041): token 窃取疑い時は Hub Web から失効 → family 全失効 → 監査確認 (docs/security-spec.md §8.6)。refresh token 再利用検知は provider-admin + 該当 workspace-admin へ即時通知。(6) 障害縮退 (qa-011 維持): Hub 障害時も作者環境の導入済み Skill・公開済み Web App は動作継続し、新規公開・追加・更新のみ停止する。本 qa は maintenance-ops.desktop 行への接地点を提供し、詳細 runbook は maintenance-ops (qa-011/qa-027) の web 行確定に従属する。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Clean Code — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/clean-code.md`

#### 目的

codeを、次の変更者が意図・制約・failureを短時間で理解し、安全に変更・検証できる作業媒体にする。

#### 解決する問題

- 名前と抽象度が意図を表さず、readerが実装詳細からbusiness ruleを逆算する。
- 一つの変更理由が複数moduleへ散り、副作用とerror pathを予測できない。
- 重複したruleが別々に更新され、仕様のSSOTが崩れる。
- testがimplementation detailへ結合し、refactoringを妨げる。

#### 適用条件

- 複数人・長期保守・高変更頻度・重要ruleがあり、理解と変更の費用が支配的。
- test/lint/review/observabilityで改善効果をfeedbackできる。
- domain languageとcoding conventionをteamで合意・更新できる。

#### 非適用条件

- throwaway explorationでは全規則を先行適用せず、学習後に残すcodeだけを整理する。
- generated/vendor codeへ手動styleを強制しない。generation inputとboundaryを管理する。
- 短い関数、class化、DRY等を絶対値として扱い、局所的な明瞭さを悪化させる場合は適用しない。

#### トレードオフ・失敗モード

- naming/refactoring/testへ時間を使うため、寿命とriskが低いcodeでは投資超過になり得る。
- micro-function化でcontrol flowが多数fileへ散り、かえって読みにくくなる。
- DRYを急ぎ、異なるdomain conceptを一つの抽象へ結合して変更を難しくする。
- commentを全否定して、理由、trade-off、外部制約、security decisionまで消す。
- coverageやlint scoreを目的化し、重要behaviorの未検証を隠す。

#### goalへの寄与

- goalに関わるbusiness ruleを名前とtestで明示し、仕様→code→evidenceのtraceを短くする。
- maintenance objectiveには変更lead time、review指摘、escaped defect、rollback率などのoutcomeを使う。
- 無料toolの導入自体を成功とせず、teamが継続運用でき、重要riskを減らすかで判断する。

---

#### 本章での適用

##### 確定内容 qa-188 (対応セル: web)

- 確定要件: C07 の指摘を受け入れ、**tenants.status を段0 の語彙へ追加する**。qa-178-a と同一の基準で扱う。

[qa-188-a 段0 へ含める根拠] qa-175 で定めた物差しは『操作結果としてのエラー種別か、認証解決前の前提状態記述か』であり、後者を段0 とする。tenants.status は「このテナントで認証解決を試みてよいか」という**前提状態の記述**であって、処理を試みた後に返る業務エラーではない。qa-178-a で段0 へ入れた IdpCredentialStatus (pending/tested/active/disabled) と同じ側にある。コード上の理由づけも酷似しており、db-ports.ts の『認証の入口で閉じる方が安全側』は idp-lifecycle.ts の『認証解決に使ってよい唯一の状態』と同じ設計思想の表明である。同じ思想で書かれた 2 つの語彙のうち片方だけを段0 に入れるのは、基準の一貫性を欠く。

[qa-188-b これは本 feature の症状の候補 (3) に直結する] qa-185 で残した候補 (3)「認証以外の原因 (テナント接続未登録・無効化)」の実体がこれである。tenants.status === 'suspended' のとき resolveTenantOidcConfig は接続を解決せず、signin ページは『このテナントではサインインできません』へ倒れる。**この経路は秘密の投入状態とは完全に独立している**。つまり本番症状は、secret が正しく投入され正しく読めていても、テナントが suspended であるだけで同じように発生し得る。そして現状、利用者にも運用者にも **どちらが起きたのかを区別する手段が無い**。候補 (3) を候補 (1)(2) と同格で残すべき理由がここで具体化した。

[qa-188-c E-3 の記録項目への追加] E-3 が記録すべき『縮退の理由』に、次を区別可能な形で含める: (i) テナントが解決できない (slug 不一致)、(ii) テナントは在るが status が active でない、(iii) OIDC 接続が登録されていない、(iv) 環境値が解決できない (名前を記録)、(v) cookie が無い、(vi) 署名検証に失敗した。**値は記録しない** (qa-151 [147-b] の非記録契約を維持)。記録するのは分類と名前だけである。現状これら 6 つが利用者から見てほぼ同一の出力へ潰れていることが、本 feature の欠陥の中身である。

[qa-188-d 併記する既存文書の状態] docs/backend-spec.md:55 は tenants テーブルの status(active/suspended) を**スキーマとしては既に文書化している**。欠けているのはスキーマの存在ではなく、その値が認証可用性へ連動するという**結線の記述**である。これは qa-182 で扱った E-4 と同じ型の錯誤 (既にあるものを無いと見なす) を避けるための注記であり、本 turn は『新しい列を作れ』ではなく『既存列と認証可用性の連動を文書と語彙に載せろ』を求める。

[qa-188-e 併せて残る DeviceAuthorizationStatus の三重定義] C07 が前回から継続指摘している DeviceAuthorizationStatus の情報源が 3 つある件 (ports.ts:117 / repository/device-flow.ts:23 / drizzle schema publish.ts:106) も未対応のまま残る。V7 (同一のリテラル union が 2 箇所に独立定義されている状態を検出する) の対象に、**drizzle schema を第 3 の情報源として含める**ことを明記する。型宣言と zod だけを突合する実装にすると、この 3 件目が検査をすり抜ける。
- 設計原則の採否根拠: (legacy_exempt — design-app contract 制定前の 確定であり遡及記録は不能。免除の根拠は spec-state.legacy_migration。理由: モック harness-studio-v2 の UI/UX 反映に伴い ui-ux/frontend/backend/database の web セルを再確定する必要があるが、legacy 1.0 + 確定セルで全 writer 経路が到達不能だったため。既存 225 qa entry は design-app contract 制定前の記録であり遡及適用不能なので legacy_exempt として明示記録する (schema 1.0 時代に validator が暗黙免除していた範囲と同一)。)
##### 確定内容 qa-044 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 既確定の qa-011 / qa-027 / qa-039 / qa-041 の desktop 該当部分を maintenance-ops.desktop の専用正本として集約確定する。(1) plugin 更新導線 (qa-011): 作者環境の Publisher / Skill 更新は marketplace / Bootstrap Installer の更新導線 (「更新あり」表示 + 手動 update) で提供し、自動強制更新はしない。(2) 作者サポート (qa-011): 相談は予約制 office hour (供給上限あり §11.3)。(3) 退職・棚卸し (qa-027): 四半期のユーザー棚卸し (退職者アカウント無効化・owner 再割当確認) は作者デスクトップの token 失効 (Hub Web からの即時失効 = qa-041) と対にして実施する。(4) ローカル環境の維持 (qa-039): CI と同一実装の pnpm verify (lint/typecheck/test/bundle size) を local から実行可能に保ち「local では通るが CI で落ちる」を構造的に減らす。pre-commit hook (lint/format/secret scan) は早期検知の補助で、正本の遮断は CI 側。(5) 資格情報のインシデント初動 (qa-041): token 窃取疑い時は Hub Web から失効 → family 全失効 → 監査確認 (docs/security-spec.md §8.6)。refresh token 再利用検知は provider-admin + 該当 workspace-admin へ即時通知。(6) 障害縮退 (qa-011 維持): Hub 障害時も作者環境の導入済み Skill・公開済み Web App は動作継続し、新規公開・追加・更新のみ停止する。本 qa は maintenance-ops.desktop 行への接地点を提供し、詳細 runbook は maintenance-ops (qa-011/qa-027) の web 行確定に従属する。
- 設計原則の採否根拠: (legacy_exempt — design-app contract 制定前の 確定であり遡及記録は不能。免除の根拠は spec-state.legacy_migration。理由: モック harness-studio-v2 の UI/UX 反映に伴い ui-ux/frontend/backend/database の web セルを再確定する必要があるが、legacy 1.0 + 確定セルで全 writer 経路が到達不能だったため。既存 225 qa entry は design-app contract 制定前の記録であり遡及適用不能なので legacy_exempt として明示記録する (schema 1.0 時代に validator が暗黙免除していた範囲と同一)。)
- 資するゴール: G1, G2, G3, G4, G5

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
