---
status: confirmed
category: maintenance-ops
aggregate: 確定
spec_cells: [maintenance-ops.web, maintenance-ops.mobile, maintenance-ops.tablet, maintenance-ops.desktop-windows, maintenance-ops.desktop-linux, maintenance-ops.desktop-macos]
serves_goals: [G2, G5, G1]
---

# 保守運用管理 (maintenance-ops)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-335 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。運用対象は Hub (web) と作者環境 (macOS/Windows) のみ |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。運用対象は Hub (web) と作者環境 (macOS/Windows) のみ |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-230 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-230 |

## 確定内容 (質疑録)

### qa-335 (対応セル: web)

**質問**: GitHub Issue 出口の前提で、定期処理と監視、管理者の運用をどう確定するか。

**回答**: [appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 API」は発想ごと撤回し、Issue は人間が読む従来型の不具合・要望票として書く。Claude Code から改善へ繋ぐ導線は独自 API ではなく既存の gh CLI (gh issue list / gh issue view) が担う。

[appr-061 Q2 / appr-063 で変わった点] スクリーンショットと診断情報を GitHub 側へ出す。appr-048 以前の設計 (qa-255(b)3) は「画像の所在として管理画面の詳細 URL だけを載せ、実体は認可の内側に置く」だったが、これを改める。対応する側が Issue だけを見れば状況を再現できる状態を優先する。ただし GitHub は Issue への画像添付を公式 API として提供していない。公式ドキュメントが案内するのはブラウザ UI からのドラッグ&ドロップだけで、ブラウザが内部で使う uploads.github.com / user-attachments は文書化されていない経路である (https://docs.github.com/en/rest/issues/issues, https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files を 2026-08-16 に確認)。したがってサーバ側から「添付」する公式手段は存在しない。appr-063 で利用者が選んだ実現方法は **GitHub Contents API で対象リポジトリへ画像と診断ファイルを commit し、その raw URL を Issue 本文へ Markdown の画像参照・リンクとして書く** ことである。保存先 path は要望 ID から決まる固定形 `improvement-requests/<要望 ID>/screenshot.png` および `improvement-requests/<要望 ID>/diagnostics.json` とする。以降この章で「添付」と書く場合は、この commit + 本文参照を指す。

[Q2 / appr-063 の帰結として利用者が選択した扱い] 黒塗り (マスキング) は任意のままとし、未黒塗りでの送信を止めない。改善要望を上げる GitHub リポジトリの可視性も仕様では制約しない。したがって次の 3 点は仕様として受け入れたリスクであり、隠さず記録する: (i) 44 の業務画面の中身が黒塗りされないまま GitHub 側へ出る投稿が一定数生じうる。(ii) commit した画像と診断ファイルは対象リポジトリの git 履歴へ永久に残る。ファイルを削除する commit を積んでも履歴からは消えないため、qa-255(k) が持っていた「自分の側で消した情報を外部の複製から到達できないようにする」原則は、GitHub へ出したものについては成立しない。削除時に本文の差し替えとファイル削除 commit は行うが、履歴からの消去は保証しない (履歴の書き換えはリポジトリ全体に影響するため、仕組みとしては用意しない)。(iii) Hub が保持する GitHub トークンは、Issue の起票・更新に加えて対象リポジトリの contents 書込み権限を要する。トークンが漏れた場合の影響は Issue の改変にとどまらず、リポジトリの改変に及ぶ。権限は対象 1 リポジトリに限定し、Cloudflare Workers Secret から出さないことで抑える。なお raw URL の到達範囲はリポジトリの可視性に従い、public なら誰でも閲覧でき、private ならリポジトリへの権限が要る。可視性を仕様で制約しないという appr-061 の選択は維持する。

[復元元] appr-048 以前の qa-249 の内容を正本として戻す。指示文 API の配信状況監視は撤回し、GitHub Issue の起票失敗と孤児 Issue 回収へ戻す。

日次 cron の 3 責務:

(a) Issue 再送 — 起票・更新の失敗を pending_retry から拾って再送する。再送対象には、種別・対応状態の変更に伴うラベルとタイトル接頭辞の同期失敗、および画像・診断ファイルの commit 失敗を含める。投稿時の起票と同じ pending_retry の仕組みに載せ、別系統を作らない。再送はバッチサイズを絞り、GitHub のレート制限に当たらないようにする。

(b) R2 孤児オブジェクトの回収 — DB から参照されない R2 オブジェクトを回収する。削除処理が DB → R2 の順で行われるため、途中失敗は必ず孤児側に寄る。

(c) 保持期間による削除 — 種別で分ける。対応済み・見送りから一定期間を過ぎたとき、スクリーンショットは種別によらず削除し (画面に業務データが写るため)、診断情報は request のみ削除して bug は残す。bug の診断は同種の不具合が再発したときの比較材料になるため。行そのものと本文・対応メモは種別によらず残す。
**この削除は Hub 側 (R2 と DB) と、対象リポジトリの最新 tree にのみ効く。git 履歴に残った画像・診断ファイルには効かない** (appr-063 の帰結)。保持期間の運用が git 履歴には及ばないことを、運用手順書に明記する。履歴からの消去が必要な場合は、リポジトリ管理者が履歴の書き換えを手作業で判断する。リポジトリ全体に影響する操作であり、仕組みとしては用意しない。

監視: 既存の監視項目 (起票失敗の連続・孤児の増加・R2 使用量) に、種別推定の偏りを加える。request と推定される割合が急に変わった場合、推定規則か診断収集のどちらかが壊れている可能性が高い。新しい通知系統は作らず、既存の記録経路に乗せる。加えて truncated=true の割合を記録する。

管理者の運用: 一覧の既定表示に、状態別・画面別に加えて種別別の件数を出す。不具合が特定画面に集中しているのか、要望が特定画面に集中しているのかで打ち手が変わるため、両者を混ぜた件数だけでは判断できない。画面別集計は種別で分けて表示する。

連携の逃げ道: GitHub 連携を環境変数で無効化できる。無効期間中は種別変更もラベル同期の pending_retry として積み、再有効化後にまとめて流す。

データ移行: 本機能は新規テーブルの追加であり、種別列も初回 migration に含めるため、後追いの backfill は発生しない。ただし推定規則を将来変更したときのために、kind_source が inferred の行だけを対象に種別を再計算できるバッチを用意する。manual で上書きされた行は再計算の対象外とし、管理者の判断を機械が踏み潰さないようにする。

PR マージによる完了検知: 開発者が PR 本文へ `Fixes #<Issue 番号>` を書けば、マージ時に GitHub が Issue を自動で close する。Hub 側は PR ではなく **Issue の state** を日次で照合し、close されている行の対応状態を done へ寄せる。PR を直接見に行かないのは、Issue と PR の対応関係を Hub が保持する必要をなくすためである。

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

##### 確定内容 qa-335 (対応セル: web)

- 確定要件: 「[appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 …」 (全文は本章「確定内容 (質疑録)」の `qa-335` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: 再計算バッチの対象を、人が触っていないものに限定する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 推定規則を改善して全行に再適用すると、管理者が手で直した分類まで機械の推定に戻る。kind_source=inferred だけを対象にすることで、人の判断を機械が上書きしない不変則をバッチ側でも守る。
  - トレードオフ:
    - 手動で直した行は規則改善の恩恵を受けない。管理者の判断のほうが規則より確からしいため、その扱いで問題ない
- 原則: 分類の分布そのものを監視対象にする (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 診断収集が壊れると診断が空になり、全ての投稿が request と推定される。個々の処理は成功しているため通常のエラー監視では気づけない。種別の割合の急変を、収集経路の故障の代理指標として見る。
  - トレードオフ:
    - 利用状況の変化でも割合は動くため、閾値超えが必ず故障とは限らない。気づく契機として扱い、自動でのアラート停止措置は取らない
- 原則: 打ち手が異なるものを同じ数値に混ぜない (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/information-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 画面別件数を種別で混ぜると、不具合が集中している画面と要望が集中している画面が同じ「件数の多い画面」に見える。前者は修正、後者は設計見直しで打ち手が違うため、集計を分ける。
  - トレードオフ:
    - 一覧の集計表示が横に広がる。件数の多い順という単一指標の分かりやすさは失うが、判断を誤らせないほうを採る
- 原則: 外部システムとの対応関係を、自分の側で二重に持たない (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: PR のマージを検知して完了へ寄せるには、要望と PR の対応を Hub が保持する必要がある。Issue の state を見るだけなら、対応関係は既に持っている issue_number だけで足り、GitHub の Fixes 記法がリンクを担う。持たなくてよい状態を持たない。
  - トレードオフ:
    - PR がマージされてから Issue が閉じるまでの GitHub 側の遅延がそのまま Hub の完了検知の遅延になる。日次照合であり実務上の差はない
    - Fixes 記法を書き忘れると Issue が閉じず、Hub 側も完了にならない。手作業での close で回復でき、記法は README の手順に含める
- 原則: 自動化が及ばない範囲を、手順書で明示する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 保持期間による削除は Hub 側 (DB・R2) にしか効かず、GitHub の対象リポジトリへ commit した画像と診断は残る。削除 commit を積めば最新の tree からは消えるが、git 履歴からは消えない。仕組みが全てを掃除しているかのように見えると、運用側は残存に気づかない。及ばない範囲 (最新 tree には効く / 履歴には効かない) を書き分けておくことで、必要になったときに手作業で扱える。
  - トレードオフ:
    - 手順書に依存する運用が 1 つ増える。仕組みで解く選択肢 (黒塗り必須化・private 限定) は利用者が選ばなかったため、明示で補う
- 原則: 自分の側で消した情報を、外部の複製から到達できないようにする (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `not_applicable`
  - 章固有の根拠: appr-061 Q2 でスクリーンショットと診断を GitHub 側へ出す決定が下り、黒塗りは任意・リポジトリ可視性は不問と定められた。さらに appr-063 で、公式 API に Issue 添付が存在しないことを受けて Contents API による repository への commit 方式が選ばれた。commit した画像と診断ファイルは git 履歴に永久に残り、削除 commit を積んでも履歴からは消えないため、この原則は GitHub へ出したものに対しては成立しない。適用できないことを not_applicable として明示し、成立しているかのように書かない。
  - トレードオフ:
    - 要望を削除しても、GitHub リポジトリへ commit した画像は git 履歴に残り、要望 ID から決まる raw URL や履歴上の blob から到達できる可能性が残る。削除 commit を積んでも履歴からは消えない。仕様として受け入れたリスク
    - 代替の防護 (黒塗り必須化・private 限定) は利用者が明示的に選ばなかったため張らない。投稿時の注意喚起文言のみを残す
##### 確定内容 qa-230 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 「【既存契約の維持】qa-044 の作者デスクトップ保守契約を全面維持する。plugin 更新は marketplace / Bootstrap Installe…」 (全文は本章「確定内容 (質疑録)」の `qa-230` を正本とする)
- 設計解釈の記録経路: `dialogue`
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
- 資するゴール: G2, G5, G1

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
