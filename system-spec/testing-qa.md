---
status: confirmed
category: testing-qa
aggregate: 確定
spec_cells: [testing-qa.web, testing-qa.mobile, testing-qa.tablet, testing-qa.desktop-windows, testing-qa.desktop-linux, testing-qa.desktop-macos]
serves_goals: [G2, G5, G1]
---

# テスト戦略・品質保証 (testing-qa)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-341 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の mobile 行と同根拠)。テスト実行は web 行 (CI) と desktop-windows/desktop-macos 行 (作者ローカル) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の tablet 行と同根拠)。テスト実行は web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-282 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。dev-workflow の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner 上のテスト実行は CI 実行基盤として web 行の品質ゲート要件でカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-282 |

## 確定内容 (質疑録)

### qa-341 (対応セル: web)

**質問**: GitHub Issue 出口の前提で、改善要望機能の検証範囲をどう確定するか。何を自動テストで固定し、何を固定しないか。

**回答**: [appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 API」は発想ごと撤回し、Issue は人間が読む従来型の不具合・要望票として書く。Claude Code から改善へ繋ぐ導線は独自 API ではなく既存の gh CLI (gh issue list / gh issue view) が担う。

[appr-061 Q2 / appr-063 で変わった点] スクリーンショットと診断情報を GitHub 側へ出す。appr-048 以前の設計 (qa-255(b)3) は「画像の所在として管理画面の詳細 URL だけを載せ、実体は認可の内側に置く」だったが、これを改める。対応する側が Issue だけを見れば状況を再現できる状態を優先する。ただし GitHub は Issue への画像添付を公式 API として提供していない。公式ドキュメントが案内するのはブラウザ UI からのドラッグ&ドロップだけで、ブラウザが内部で使う uploads.github.com / user-attachments は文書化されていない経路である (https://docs.github.com/en/rest/issues/issues, https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files を 2026-08-16 に確認)。したがってサーバ側から「添付」する公式手段は存在しない。appr-063 で利用者が選んだ実現方法は **GitHub Contents API で対象リポジトリへ画像と診断ファイルを commit し、その raw URL を Issue 本文へ Markdown の画像参照・リンクとして書く** ことである。保存先 path は要望 ID から決まる固定形 `improvement-requests/<要望 ID>/screenshot.png` および `improvement-requests/<要望 ID>/diagnostics.json` とする。以降この章で「添付」と書く場合は、この commit + 本文参照を指す。

[Q2 / appr-063 の帰結として利用者が選択した扱い] 黒塗り (マスキング) は任意のままとし、未黒塗りでの送信を止めない。改善要望を上げる GitHub リポジトリの可視性も仕様では制約しない。したがって次の 3 点は仕様として受け入れたリスクであり、隠さず記録する: (i) 44 の業務画面の中身が黒塗りされないまま GitHub 側へ出る投稿が一定数生じうる。(ii) commit した画像と診断ファイルは対象リポジトリの git 履歴へ永久に残る。ファイルを削除する commit を積んでも履歴からは消えないため、qa-255(k) が持っていた「自分の側で消した情報を外部の複製から到達できないようにする」原則は、GitHub へ出したものについては成立しない。削除時に本文の差し替えとファイル削除 commit は行うが、履歴からの消去は保証しない (履歴の書き換えはリポジトリ全体に影響するため、仕組みとしては用意しない)。(iii) Hub が保持する GitHub トークンは、Issue の起票・更新に加えて対象リポジトリの contents 書込み権限を要する。トークンが漏れた場合の影響は Issue の改変にとどまらず、リポジトリの改変に及ぶ。権限は対象 1 リポジトリに限定し、Cloudflare Workers Secret から出さないことで抑える。なお raw URL の到達範囲はリポジトリの可視性に従い、public なら誰でも閲覧でき、private ならリポジトリへの権限が要る。可視性を仕様で制約しないという appr-061 の選択は維持する。

[復元元] appr-048 以前の qa-248 の内容を正本として戻す。指示文 API の endpoint に対する検証は撤回し、GitHub Issue 起票経路の検証へ戻す。

既存の vitest 構成 (全パッケージ coverage 閾値 80%、契約横断は tests/、feature 単位は src/__tests__/) に載せる。閾値はパッケージ全体の集計なので、実装と同じ PR でテストを入れないと既存の緑を割る。

自動テストで固定するもの:
1. 冪等性 — 同じ submissionKey で順次 2 回・並行 2 回送っても行が 1 件であること。並行は unique 制約違反を捕まえて既存行を返す経路まで通す。
2. 認可 — member が一覧・詳細・状態更新の各 API を叩くと拒否されること、workspace-admin が他 workspace の要望へ到達できないこと、provider-admin の越境が監査記録を残すこと。UI の出し分けではなく API 応答で確かめる。
3. 状態遷移 — 見送りに理由メモが無いと拒否されること、廃棄に廃棄理由が無いと拒否されること、同一状態かつ同一メモの更新が拒否されること、対応済みから未対応へ戻せること。
4. 画像検証 — png/jpeg/webp の正しい magic bytes が通り、拡張子や MIME だけ偽装したものが落ちること。上限判定を復号後バイトで行うこと。
5. route pattern 正規化 — 動的 route が pattern へ畳まれること、query と URL 断片が落ちること、台帳にない path が unknown へ落ちること。
6. 診断情報のマスキング — トークン様文字列・メールアドレスが伏せ字になること、query string と request/response body が保持されないこと。
7. 種別推定 — 未捕捉例外だけがある診断、console error だけがある診断、5xx の失敗リクエストだけがある診断のそれぞれで bug と推定されること。いずれも無い診断で request と推定されること。推定根拠 (kind_rationale) が判定条件と対応すること。
8. 推定の上書き保護 — 管理者が種別を変えると kind_source が manual になり、以降の更新で推定が再適用されないこと。推定が管理者の判断を上書きし返す退行は画面上正常に見えたまま起きるため、明示的に固定する。
9. 診断サマリ — 件数が診断情報の実内容と一致すること、全て 0 のとき「特記事項なし」と表示されること。
10. GitHub Issue 起票 — 両種別で共通必須項目 (要望本文・発生画面・スクリーンショット参照・診断サマリ・実装の手掛かり・受入条件雛形・出典) が欠けないこと。bug では診断詳細と再現手順が本文に展開され、request では診断詳細が折りたたみ内にあること。起票失敗が pending_retry として残り再送で解消すること。GitHub API はモックする。
11. 起票と更新の判定 — issue_number 無しで POST、ハッシュ一致で GitHub 未呼び出し (skipped)、ハッシュ不一致で PATCH、直前失敗の行でも同じ 3 分岐へ収束すること。この 4 ケースは仕様の中核であり、分岐が崩れると二重起票か更新漏れのどちらかが静かに起きる。
12. 孤児 Issue の回収 — 本文マーカーを持つ既存 Issue がある状態で送信すると、新規作成せず番号を回収して更新経路へ回ること。DB 更新失敗を注入して二重起票が起きないことを確認する。
13. 画像・診断ファイルの commit — スクリーンショットと (溢れた場合の) 診断 JSON が `improvement-requests/<要望 ID>/` 配下の固定 path へ commit され、本文にその raw URL が Markdown 参照として入ること。同じ path に同じ内容が既にある場合に Contents API を呼ばないこと (再送で commit が積み増されない)。commit だけが失敗した場合に本文の起票は成立し、commit が pending_retry へ積まれ、本文に画像が未反映である旨の 1 行が入ること。**raw URL は要望 ID から決まる固定 path なので、commit の成否によらず本文ハッシュが変わらないこと** を明示的に固定する (変わると再送のたびに本文更新が発生する)。
14. ラベル排他 — improvement-request が常に付くこと、type:bug と type:request が同時に付かないこと、種別変更時に古い type ラベルが外れること。
15. 一括送信 — 20 件超で 400、他社 ID 混入で要求全体が 403、1 件失敗でも残りが処理され行ごとの結果が返ること、同時実行で sending への条件付き更新により GitHub 呼び出しが 1 回に収束すること。
16. 保持期間 — 対応完了から一定期間後、request の診断が削除され bug の診断が残ること。スクリーンショットは種別によらず削除され行は残ること。期限の直前・直後と種別の組み合わせという境界値で固定する。
17. 削除 — 削除で本表の本文系列が NULL 化され子表の行が消えること、tombstone が一覧に ID と削除記録だけで現れること、削除の取り消し API が存在しないこと。
18. 種別を含む一覧フィルタ — 種別フィルタが認可 (workspace 境界) と組み合わさっても他 workspace の行を返さないこと。
19. route 台帳の網羅 — 認証済み画面の route が全て台帳に載っていることを機械検査する。画面追加時に台帳更新を忘れると unknown が増えるため、CI で落とす。
20. Issue state の照合 — Issue が close されている行の対応状態が done へ寄ること、open のままの行が変化しないこと。GitHub API はモックする。

自動テストで固定しないもの: (i) DOM 再描画スクリーンショットの見た目の忠実度と canvas 注釈の描画結果。ヘッドレス環境のフォント・アンチエイリアスの差でピクセル差分が常時発生し、偽陽性が続くとテスト全体が信用されなくなる。撮影は「例外を投げずに非空の画像を返す」ことだけを固定し、忠実度は目視で確認する。(ii) 黒塗りが行われたかどうか。appr-061 で黒塗りは任意と決まったため、未黒塗りの送信は仕様どおりの動作であり、テストで落とす対象にならない。投稿フォームに保存先を示す文言が存在することだけを固定する。

### qa-282 (対応セル: desktop-windows, desktop-macos)

**質問**: ローカル desktop でテストを実行するとき、mvp tier の focused test をどう選び、広域回帰をどう扱いますか?

**回答**: ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-095 の skill 構造 lint の生成物境界契約と層別テスト方針を全面維持したまま、tier 別のテスト選択契約を追加確定する。

【1. focused test の決定論的選択】mvp tier の blocking テストは、変更 path から到達する package の focused test に限定する。選択は scripts/select-verification-tier.py が出力する影響 package 集合を入力とし、実行者の勘で選ばない。該当 package が特定できない変更 (共有 utility や設定) は standard へ自動昇格させ、選択不能を暗黙の省略にしない。

【2. 広域回帰の非同期化】実際の実行順序を再現する広域回帰は mvp tier の blocking から外し、CI の非同期 job として実行する。失敗は当該変更の merge を止めず deferred-verification issue として起票し、次の standard 以上の実行または Stage 1 公開判定ゲートで回収する。critical tier では従来どおり広域回帰を同期 blocking として維持する。

【3. 層別方針の維持】frontend は behavior ベース、backend は API 契約 / ロジック単体 / DB 結合、infrastructure と repository tooling は静的契約 / 実行順序 / fail-closed 境界という層別方針は tier に依らず維持する。pixel・DOM 内部構造・一時生成物の物理配置へ品質判定を密結合させない方針も維持する。tier が変えるのは検証の量と同期性であって、検証の当たり所ではない。

【4. 生成物境界の維持】skill 構造 lint が dot cache および __pycache__ / .pyc を構造判定から除外する qa-095 の契約は tier に依らず維持する。

【5. platform と製品境界】同じ Python / pnpm 実装と同じコマンドを desktop-windows / desktop-macos で利用する。変更は repository 内の開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

【再採番・rebase 追記 (2026-08-09)】本 entry は当初 qa-147 として起票したが、並行セッションが 同一番号を別論点 (サインイン後のスコープ解決とルーティング結線) で先に確定させていたため qa-211 へ 再採番した。回答内容は変更していない。本文が「維持する」と述べる既存契約の参照点は、main 取込後の 最新確定 (dev-workflow.web=qa-199 / testing-qa.web=qa-205) まで含めて読むこと。本 entry はそれらを 覆さず、その上へ tier 別の検証深度契約を重ねる。

【本 entry の位置づけ (2026-08-15)】
本 entry は qa-211 を **回答本文について逐語で全面継承した自己完結版** である。第 4 回 completeness evaluator が medium finding (`design_knowledge_reflection`) として、legacy_backfill 経路 4 章 (backend / dev-workflow / infrastructure / testing-qa) の `design_applications` が『〜という責務分離に適用した』のように原則名の言い換えに留まり、dialogue 経路より具体性が低いと指摘した。writer (`set-qa-design-applications`) は完了済み backfill と異なる解釈の再適用を構造的に拒否するため、既存 entry を書き換える経路が無い。そこで reopen → 本 entry で再確定という正規経路を採る。
**変更したのは設計解釈 (`design_applications`) だけであり、上記の回答本文が定める要件は 一切変更していない。** 仕様章 (compile-spec-doc.py) は確定セルの現 qa_ref に対応する節だけを 出力するため、追補のみの entry で再確定すると基礎契約が章から消える。それを防ぐため本文を 丸ごと引き継いでいる (qa-216 / qa-217 と同じ方式)。

## 上流指針 (doctrine anchor)

- 本カテゴリは共通シード (categories) 外のプロジェクト固有カテゴリで、approved な pending 例外 (owner: daishiman) として上流指針を確定している。

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Test Strategy — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/test-strategy.md`

#### 目的

検証手段を層ごとに配分し、想定する失敗が本番到達前に、原因を特定できる粒度で検出される状態をつくる。

#### 解決する問題

- 高層 (E2E) に検証を寄せ、実行が遅く不安定になり、失敗が調査されず無視される。
- テストが実装詳細 (内部構造・DOM 構造・一時生成物の配置) に結合し、リファクタリングのたびに壊れる。
- 契約 (API・スキーマ・列挙値) の不整合が、実行時まで検出されない。
- カバレッジ率が閾値を満たしても、重要な分岐や失敗経路が未検証のまま残る。
- 同じ検証が複数層で重複し、実行時間だけが増えて検出力が上がらない。

#### 適用条件

- 変更が継続し、回帰の再発コストが検証コストを上回る。
- 検証対象の契約 (入出力・状態遷移・権限) を明文化できる。
- CI などで自動実行でき、失敗が担当者へ届き是正される運用がある。

#### 非適用条件

- 仕様が未確定の探索段階で、全層のテストを先行整備しない (残す実装が決まってから固める)。
- 外部サービスの挙動そのものを検証対象にしない (契約の消費側の扱いを検証する)。
- 生成物 (キャッシュ・ビルド出力) の物理配置など、設計契約でない実装詳細を合否条件にしない。

#### トレードオフ・失敗モード

- カバレッジ閾値の充足を品質と読み替え、重要な失敗経路の未検証を隠す (Goodhart 化)。
- モックを積み過ぎ、実装と乖離した世界だけで合格するテスト群になる。
- 不安定テスト (flaky) を再実行で通し、検出力を失いながら実行時間だけ払い続ける。
- E2E で網羅しようとして実行時間が伸び、開発中に回らなくなる。
- 検査ツールが情報源の一部しか見ておらず、同一定義の 3 件目がすり抜ける (網羅範囲の未定義)。

#### goalへの寄与

- 「どの失敗を防ぐためのテストか」を層ごとに記述でき、テスト追加の是非を目的から判断できる。
- 契約テストにより、仕様変更が利用側へ波及する箇所を実装前に特定できる。
- 品質ゲートを改善ループ込みで定義することで、合否表示ではなく是正の完了を確定条件にできる。

---

#### 本章での適用

##### 確定内容 qa-341 (対応セル: web)

- 確定要件: 「[appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 …」 (全文は本章「確定内容 (質疑録)」の `qa-341` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: 壊れても画面上は正常に見える不変則を優先してテストする (risk-based testing) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/test-strategy.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 認可漏れ・二重登録・推定が管理者の手動上書きを踏み潰す退行・commit を本文ハッシュに含めたことによる再送ループは、いずれも画面が正常に見えたまま損害が出るため手動確認では見つからない。逆に注釈の見た目はレビューで気づける。前者を自動テストへ、後者を目視へ振り分ける。
  - トレードオフ:
    - 注釈描画の退行が自動検知できず、リリース後に気づく可能性が残る
    - 認可と推定規則が変わるたびにテストの追随コストが乗る。規則が仕様であることの裏返しとして受け入れる
- 原則: スクリーンショット差分による視覚回帰テスト (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/test-strategy.md#非適用条件`)
  - 採否: `not_applicable`
  - 章固有の根拠: 検証対象が「スクリーンショットを撮る機能」であり、ヘッドレス環境のフォント・アンチエイリアスの差でピクセル差分が常時発生する。偽陽性が続くとテスト全体が信用されなくなるため導入しない。
  - トレードオフ:
    - 撮影の忠実度に関する退行を機械的に捉えられない。撮影不能ノード (canvas/iframe) の検出を実装側の警告で補う
- 原則: 境界値で削除条件を固定し、分岐を入れたら両側で共通必須項目を検査する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/test-strategy.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 保持期間による削除は条件を 1 つ誤るだけで消してはいけないデータを消し、しかも消えた後では検証できない。Issue 本文の種別分岐も、片方で必須項目を落とす退行が起きやすい。どちらも「消えていないこと」を明示的に検査する。
  - トレードオフ:
    - 時刻依存のテストになるため、時刻を注入できる形に実装を作る制約が生じる
    - Issue 本文の構成を変えるたびに必須項目リストの更新が要る。情報の完全性要求を守る仕掛けとして必要なコストとする
- 原則: 台帳の網羅性を CI で機械検査する (drift の自動検出) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/test-strategy.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: route pattern 台帳は画面追加のたびに更新が要るが、忘れても機能は動いてしまい集計だけが静かに壊れる。人の注意に頼らず CI で落とす。
  - トレードオフ:
    - 画面追加のたびに台帳更新が必須になり開発の摩擦がわずかに増える。集計が壊れる代償より小さいと判断する
- 原則: 決定が「やらない」であるものを、テストで暗黙に「やる」へ戻さない (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/test-strategy.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: appr-061 で黒塗りは任意と決まった。未黒塗りの送信を落とすテストを書くと、テストが仕様を上書きして必須化を実現してしまい、利用者の決定と食い違う実装になる。固定するのは文言の存在だけに留める。
  - トレードオフ:
    - 未黒塗り投稿を機械的に検出する手段が無い。仕組みでの防護を利用者が選ばなかった以上、テストで代替しない
##### 確定内容 qa-282 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 「ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-095 の skill 構造 lint の生成物境界契約と層別テスト方針を全面維…」 (全文は本章「確定内容 (質疑録)」の `qa-282` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: テストサイズ (実行環境の制約) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/test-strategy.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の【1. focused test の決定論的選択】が定める『変更 path から到達する package の focused test に 限定する。選択は scripts/select-verification-tier.py が出力する影響 package 集合を入力とし、実行者の勘で選ばない』および『該当 package が特定できない変更 (共有 utility や設定) は standard へ 自動昇格させ、選択不能を暗黙の省略にしない』の部分へ効く。この章で特に効く理由は、desktop ローカルが待ち時間を人の集中で直接支払う場所であり、テストサイズの制約が最も強く現れるからである。設計の要点は『選択不能なら重くする』という向きにあり、代替案 1 の『選択不能時は全件実行』は ローカルでは実質的に実行されなくなって mvp の意味が消えるため、代替案 2 の『選択不能時は mvp のまま skip』は最も影響範囲の広い変更 (共有 utility) が最も薄く検査される逆転を生むため、いずれも採らなかった。
  - トレードオフ:
    - 影響 package 集合の算出精度に検証の妥当性が完全に依存する
    - 自動昇格が頻発すると mvp の短縮効果が実質的に失われる
- 原則: 層別の責務配分 (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/test-strategy.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の【3. 層別方針の維持】が定める『tier が変えるのは検証の量と同期性であって、検証の当たり所では ない』と『pixel・DOM 内部構造・一時生成物の物理配置へ品質判定を密結合させない』の部分へ効く。frontend は behavior、backend は API 契約 / ロジック単体 / DB 結合、infrastructure と repository tooling は静的契約 / 実行順序 / fail-closed 境界、という当たり所を tier から独立させたことが本章の 設計上の核心である。代替案として『tier ごとに検査対象そのものを変える (低 tier では frontend を見ない等)』方式を検討したが、低 tier で『そもそも見ない層』が生まれ、その層のバグは tier が上がるまで一切検出 されず、しかも検出されなかった事実が記録に残らないため採らなかった。
  - トレードオフ:
    - 全層の検査を薄くでも維持するため、最小構成でも検査の種類は減らせない
    - 複数層へまたがる変更は focused test の枠に収まらず昇格を招きやすい
- 原則: 観測可能性 (延期と放棄の区別) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の【2. 広域回帰の非同期化】が定める『失敗は当該変更の merge を止めず deferred-verification issue として起票し、次の standard 以上の実行または Stage 1 公開判定ゲートで回収する』の部分へ効く。非同期化とは『実行しない』ではなく『実行結果の到着を待たない』ことであり、両者を分ける唯一の担保が 回収先の実在である。したがって issue 起票は付随的な記録ではなく非同期化の成立条件そのものとして 位置づけている。代替案として『非同期 job の失敗を通知だけで済ませる』方式を検討したが、通知は既読になれば消え、回収されたか否かが事後に検証できないため採らなかった。【4. 生成物境界の維持】が dot cache や __pycache__ / .pyc を構造判定から除外するのも同じ理由で、観測対象に実行の副産物が混ざると、検査結果が『何を見た結果か』を追えなくなる。
  - トレードオフ:
    - mvp で merge した時点では広域回帰の結果が未確定のまま残る
    - issue を回収する運用が滞ると deferred が積み上がり Stage 1 の直前に集中する
- 資するゴール: G2, G5, G1

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| vitest | 4.1.10 | VoidZero / Vitest team (vitest.dev) | https://vitest.dev/blog/vitest-4-1.html | 2026-08-15T00:15:16Z | 2026-08-15T00:15:16Z |
| playwright | 1.62.1 | Microsoft (playwright.dev) | https://playwright.dev/docs/release-notes | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
| testing-library | @testing-library/react 16.3.2 | Testing Library (OSS) (testing-library.com) | https://testing-library.com/docs/react-testing-library/intro/ | 2026-08-15T00:15:16Z | 2026-08-15T00:15:16Z |
