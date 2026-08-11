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
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-230 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-230 |

## 確定内容 (質疑録)

### qa-188 (対応セル: web)

**質問**: C07 独立監査ラウンド10 (verdict PASS) が MEDIUM 2 件を残した。うち 1 件は 『9 件目の分類語彙の見落とし』の継続指摘である。packages/db/schema/core/identity.ts:14 の tenants.status (text('status', {enum: ['active','suspended']})) が、apps/hub/src/lib/auth/db-ports.ts:306-308 (enabled: tenant.status === 'active'、コメント『停止中テナントは接続を解決させない。認証の入口で閉じる方が安全側』) と resolveTenantOidcConfig を通じて段0 (認証基盤可用性) の判定に直接使われているにもかかわらず、qa_log のいずれにも記録されていない。段0 語彙へ追加せよ。

**回答**: C07 の指摘を受け入れ、**tenants.status を段0 の語彙へ追加する**。qa-178-a と同一の基準で扱う。

[qa-188-a 段0 へ含める根拠] qa-175 で定めた物差しは『操作結果としてのエラー種別か、認証解決前の前提状態記述か』であり、後者を段0 とする。tenants.status は「このテナントで認証解決を試みてよいか」という**前提状態の記述**であって、処理を試みた後に返る業務エラーではない。qa-178-a で段0 へ入れた IdpCredentialStatus (pending/tested/active/disabled) と同じ側にある。コード上の理由づけも酷似しており、db-ports.ts の『認証の入口で閉じる方が安全側』は idp-lifecycle.ts の『認証解決に使ってよい唯一の状態』と同じ設計思想の表明である。同じ思想で書かれた 2 つの語彙のうち片方だけを段0 に入れるのは、基準の一貫性を欠く。

[qa-188-b これは本 feature の症状の候補 (3) に直結する] qa-185 で残した候補 (3)「認証以外の原因 (テナント接続未登録・無効化)」の実体がこれである。tenants.status === 'suspended' のとき resolveTenantOidcConfig は接続を解決せず、signin ページは『このテナントではサインインできません』へ倒れる。**この経路は秘密の投入状態とは完全に独立している**。つまり本番症状は、secret が正しく投入され正しく読めていても、テナントが suspended であるだけで同じように発生し得る。そして現状、利用者にも運用者にも **どちらが起きたのかを区別する手段が無い**。候補 (3) を候補 (1)(2) と同格で残すべき理由がここで具体化した。

[qa-188-c E-3 の記録項目への追加] E-3 が記録すべき『縮退の理由』に、次を区別可能な形で含める: (i) テナントが解決できない (slug 不一致)、(ii) テナントは在るが status が active でない、(iii) OIDC 接続が登録されていない、(iv) 環境値が解決できない (名前を記録)、(v) cookie が無い、(vi) 署名検証に失敗した。**値は記録しない** (qa-151 [147-b] の非記録契約を維持)。記録するのは分類と名前だけである。現状これら 6 つが利用者から見てほぼ同一の出力へ潰れていることが、本 feature の欠陥の中身である。

[qa-188-d 併記する既存文書の状態] docs/backend-spec.md:55 は tenants テーブルの status(active/suspended) を**スキーマとしては既に文書化している**。欠けているのはスキーマの存在ではなく、その値が認証可用性へ連動するという**結線の記述**である。これは qa-182 で扱った E-4 と同じ型の錯誤 (既にあるものを無いと見なす) を避けるための注記であり、本 turn は『新しい列を作れ』ではなく『既存列と認証可用性の連動を文書と語彙に載せろ』を求める。

[qa-188-e 併せて残る DeviceAuthorizationStatus の三重定義] C07 が前回から継続指摘している DeviceAuthorizationStatus の情報源が 3 つある件 (ports.ts:117 / repository/device-flow.ts:23 / drizzle schema publish.ts:106) も未対応のまま残る。V7 (同一のリテラル union が 2 箇所に独立定義されている状態を検出する) の対象に、**drizzle schema を第 3 の情報源として含める**ことを明記する。型宣言と zod だけを突合する実装にすると、この 3 件目が検査をすり抜ける。

### qa-230 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者デスクトップ環境の既存保守契約を維持しつつ、macOS 上の Hub ローカル開発ランタイムを再現可能かつ障害から自動復旧できる状態へどう固定するか。

**回答**: 【既存契約の維持】qa-044 の作者デスクトップ保守契約を全面維持する。plugin 更新は marketplace / Bootstrap Installer の手動 update、相談は予約制 office hour、四半期の利用者棚卸しと token 失効を対にし、CI と同一実装の pnpm verify を local から実行可能に保つ。pre-commit は早期検知の補助、正本の遮断は CI とする。token 窃取疑いは Hub Web から失効し、Hub 障害時も導入済み Skill と公開済み Web App は継続し、新規公開・追加・更新だけを停止する。

【1. 保存境界】macOS の Hub ローカル開発データは repository 内の git-ignore 済み `.local-state/hub` を安定した state root とする。DB、秘密環境ファイル、runtime/PID、lock、launchd plist、sqld/Next/supervisor log を同 root に置き、DB は sqld へ絶対 path で渡す。移行はコピー元を削除せず、既存の移行先を上書きしない。state root は 0700、秘密環境ファイルは 0600 とする。

【2. lifecycle と監督】`pnpm --filter @harness-hub/hub local:{start,status,stop,restart,smoke,cookie,paths}` を単一入口とする。start は worktree 固有 label の launchd job を登録し、supervisor が sqld と Next.js を子プロセスとして監督する。子の異常終了は 1 秒後に再起動し、stop は process group へ SIGTERM、10 秒後も残る場合だけ SIGKILL とする。start は 8081/3100 の既存 listener を拒否し、sqld ready 後に Next を起動する。両 listener は 127.0.0.1 に限定する。

【3. health 契約】remote Turso は URL と非空 token を必須のまま維持する。例外は `http://127.0.0.1`、`http://localhost`、`http://[::1]` の loopback sqld だけで、token 無しでも実 `SELECT 1` を行う。HTTPS、libsql、localhost の suffix host は例外に含めない。R2 binding 不在は既存どおり degraded / HTTP 200、DB 不通は down / HTTP 503 とする。

【4. 認証付き smoke】seed 投入と session 発行を分離する。cookie 再発行は local sqld を read-only query し、本番と同じ HS256、8 時間 TTL、tenant/workspace scope で発行する。smoke は `/health`、root、認証と scope header 付き `/api/v1/sheets` を検査し、HTTP 200 と 3 件を要求する。cookie や secret の値は status/smoke の出力へ載せない。

【5. 公開入口と観測性】Next.js の予約された `src/middleware.ts` と同一 route に解決される `src/middleware/index.ts` は併存させない。認可 middleware の公開 contract は `src/middleware-contract.ts` とし、shared-layer registry、静的 detector、consumer import を同じ入口へ揃える。ログは 5 MiB 到達時に最大 5 世代へ rotation する。

【6. 完了境界】unit/contract test、typecheck、lint、task spec gate、`local:status`、認証付き `local:smoke`、sqld/Next の異常終了後 PID 変化、DB 3 件保持、Duplicate page warning 0 を local implementation の完了証拠とする。in-app Browser が利用不能な場合、実画面確認だけは Beads と Draft PR の残課題に残し、未実施を PASS と表現しない。Windows の作者環境は qa-044 の契約を維持し、launchd 固有部分は macOS にだけ適用する。

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
##### 確定内容 qa-230 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 【既存契約の維持】qa-044 の作者デスクトップ保守契約を全面維持する。plugin 更新は marketplace / Bootstrap Installer の手動 update、相談は予約制 office hour、四半期の利用者棚卸しと token 失効を対にし、CI と同一実装の pnpm verify を local から実行可能に保つ。pre-commit は早期検知の補助、正本の遮断は CI とする。token 窃取疑いは Hub Web から失効し、Hub 障害時も導入済み Skill と公開済み Web App は継続し、新規公開・追加・更新だけを停止する。

【1. 保存境界】macOS の Hub ローカル開発データは repository 内の git-ignore 済み `.local-state/hub` を安定した state root とする。DB、秘密環境ファイル、runtime/PID、lock、launchd plist、sqld/Next/supervisor log を同 root に置き、DB は sqld へ絶対 path で渡す。移行はコピー元を削除せず、既存の移行先を上書きしない。state root は 0700、秘密環境ファイルは 0600 とする。

【2. lifecycle と監督】`pnpm --filter @harness-hub/hub local:{start,status,stop,restart,smoke,cookie,paths}` を単一入口とする。start は worktree 固有 label の launchd job を登録し、supervisor が sqld と Next.js を子プロセスとして監督する。子の異常終了は 1 秒後に再起動し、stop は process group へ SIGTERM、10 秒後も残る場合だけ SIGKILL とする。start は 8081/3100 の既存 listener を拒否し、sqld ready 後に Next を起動する。両 listener は 127.0.0.1 に限定する。

【3. health 契約】remote Turso は URL と非空 token を必須のまま維持する。例外は `http://127.0.0.1`、`http://localhost`、`http://[::1]` の loopback sqld だけで、token 無しでも実 `SELECT 1` を行う。HTTPS、libsql、localhost の suffix host は例外に含めない。R2 binding 不在は既存どおり degraded / HTTP 200、DB 不通は down / HTTP 503 とする。

【4. 認証付き smoke】seed 投入と session 発行を分離する。cookie 再発行は local sqld を read-only query し、本番と同じ HS256、8 時間 TTL、tenant/workspace scope で発行する。smoke は `/health`、root、認証と scope header 付き `/api/v1/sheets` を検査し、HTTP 200 と 3 件を要求する。cookie や secret の値は status/smoke の出力へ載せない。

【5. 公開入口と観測性】Next.js の予約された `src/middleware.ts` と同一 route に解決される `src/middleware/index.ts` は併存させない。認可 middleware の公開 contract は `src/middleware-contract.ts` とし、shared-layer registry、静的 detector、consumer import を同じ入口へ揃える。ログは 5 MiB 到達時に最大 5 世代へ rotation する。

【6. 完了境界】unit/contract test、typecheck、lint、task spec gate、`local:status`、認証付き `local:smoke`、sqld/Next の異常終了後 PID 変化、DB 3 件保持、Duplicate page warning 0 を local implementation の完了証拠とする。in-app Browser が利用不能な場合、実画面確認だけは Beads と Draft PR の残課題に残し、未実施を PASS と表現しない。Windows の作者環境は qa-044 の契約を維持し、launchd 固有部分は macOS にだけ適用する。
- 原則: Automation and toil reduction (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: ad-hoc な nohup 再起動を、絶対 state path・単一 lifecycle・readiness・監督・認証付き smoke に置換し、同じ障害の手動再調査を減らした。
  - トレードオフ:
    - macOS では launchd への依存が増える
    - 短時間の手動起動より初回設定の構成要素が増える
- 原則: Least Privilege (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: listener を loopback に限定し、remote DB の token 必須を維持し、秘密ファイルの権限と非表示出力を固定した。
  - トレードオフ:
    - 別端末からローカル Hub へ直接接続できない
    - remote Turso の簡易な token 無し検証は許可しない
- 資するゴール: G1, G2, G3, G4, G5

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
