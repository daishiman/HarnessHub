---
status: confirmed
category: dev-workflow
aggregate: 確定
spec_cells: [dev-workflow.web, dev-workflow.mobile, dev-workflow.tablet, dev-workflow.desktop-windows, dev-workflow.desktop-linux, dev-workflow.desktop-macos]
serves_goals: [G1, G2, G5]
---

# 開発フロー (dev-workflow)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-338 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-283 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-283 |

## 確定内容 (質疑録)

### qa-338 (対応セル: web)

**質問**: GitHub Issue の起票・更新の経路と、Issue 本文の情報量の配分をどう確定するか。

**回答**: [appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 API」は発想ごと撤回し、Issue は人間が読む従来型の不具合・要望票として書く。Claude Code から改善へ繋ぐ導線は独自 API ではなく既存の gh CLI (gh issue list / gh issue view) が担う。

[appr-061 Q2 / appr-063 で変わった点] スクリーンショットと診断情報を GitHub 側へ出す。appr-048 以前の設計 (qa-255(b)3) は「画像の所在として管理画面の詳細 URL だけを載せ、実体は認可の内側に置く」だったが、これを改める。対応する側が Issue だけを見れば状況を再現できる状態を優先する。ただし GitHub は Issue への画像添付を公式 API として提供していない。公式ドキュメントが案内するのはブラウザ UI からのドラッグ&ドロップだけで、ブラウザが内部で使う uploads.github.com / user-attachments は文書化されていない経路である (https://docs.github.com/en/rest/issues/issues, https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files を 2026-08-16 に確認)。したがってサーバ側から「添付」する公式手段は存在しない。appr-063 で利用者が選んだ実現方法は **GitHub Contents API で対象リポジトリへ画像と診断ファイルを commit し、その raw URL を Issue 本文へ Markdown の画像参照・リンクとして書く** ことである。保存先 path は要望 ID から決まる固定形 `improvement-requests/<要望 ID>/screenshot.png` および `improvement-requests/<要望 ID>/diagnostics.json` とする。以降この章で「添付」と書く場合は、この commit + 本文参照を指す。

[Q2 / appr-063 の帰結として利用者が選択した扱い] 黒塗り (マスキング) は任意のままとし、未黒塗りでの送信を止めない。改善要望を上げる GitHub リポジトリの可視性も仕様では制約しない。したがって次の 3 点は仕様として受け入れたリスクであり、隠さず記録する: (i) 44 の業務画面の中身が黒塗りされないまま GitHub 側へ出る投稿が一定数生じうる。(ii) commit した画像と診断ファイルは対象リポジトリの git 履歴へ永久に残る。ファイルを削除する commit を積んでも履歴からは消えないため、qa-255(k) が持っていた「自分の側で消した情報を外部の複製から到達できないようにする」原則は、GitHub へ出したものについては成立しない。削除時に本文の差し替えとファイル削除 commit は行うが、履歴からの消去は保証しない (履歴の書き換えはリポジトリ全体に影響するため、仕組みとしては用意しない)。(iii) Hub が保持する GitHub トークンは、Issue の起票・更新に加えて対象リポジトリの contents 書込み権限を要する。トークンが漏れた場合の影響は Issue の改変にとどまらず、リポジトリの改変に及ぶ。権限は対象 1 リポジトリに限定し、Cloudflare Workers Secret から出さないことで抑える。なお raw URL の到達範囲はリポジトリの可視性に従い、public なら誰でも閲覧でき、private ならリポジトリへの権限が要る。可視性を仕様で制約しないという appr-061 の選択は維持する。

[復元元] appr-048 以前の qa-255 の内容を正本として戻す。指示文の組み立てと配信対象という設計は撤回し、GitHub Issue の起票・更新へ戻す。

(a) 総予算 — Issue 本文は 60,000 文字を上限として組み立てる。GitHub の本文上限 65,536 文字に対する安全余裕であり、絵文字や日本語の表現差で境界を超えないようにする。

(b) 配分 — 固定区画から順に埋め、残りを診断へ回す。1) 見出し・メタ情報 (画面名・route pattern・投稿者ロール・会社・投稿日時・種別) 約 1,000 文字、2) 投稿者の本文 (全文、最大 2,000 文字)、3) **スクリーンショットの参照** 約 300 文字 (appr-061 Q2 / appr-063 により、画像そのものを Contents API で対象リポジトリへ commit し、本文にはその raw URL を Markdown の画像参照 `![screenshot](<raw URL>)` として書く。raw URL は要望 ID から決まる固定 path を指すため長さが一定で、予算配分がぶれない。管理画面の詳細 URL も併記する)、4) 想定変更箇所と受入条件の雛形 約 4,000 文字、5) 診断。1〜4 は必ず入り、診断だけが可変になる。

(c) 種別別の診断の出し方 — bug は『診断詳細』節として本文へ展開し、error グループ上位 5 件と失敗 request グループ上位 5 件を表にする (順位は count 降順、同数なら last_at 降順)。request は『参考情報 (自動収集)』の折りたたみに、サマリ 1 行と error グループ上位 3 件だけを入れる。種別によらず診断サマリ 1 行 (error 件数・失敗 request 件数・truncated) は折りたたみの外に出す。

(d) 溢れた分 — 予算に収まらない診断は本文へ入れず、診断 JSON の全文を `improvement-requests/<要望 ID>/diagnostics.json` として対象リポジトリへ commit し、本文からリンクする (appr-061 Q2 の「診断も Issue へ出す」に、appr-063 の commit 方式で従う)。本文には省略した件数とファイルへのリンク、および管理画面の詳細 URL を併記する。qa-251 の承認どおり、Issue 単体で実装できる状態は必要な情報の所在を必ず示すことで満たす。

(e) コメントへの分割はしない — 本文が溢れたときに続きをコメントへ流す方式は採らない。Issue が長く読みにくくなるうえ、再送時にコメントが重複しやすく冪等性を壊す。溢れた分は commit したファイルへ退避する。

(f) 再送との整合 — 予算適用後の本文からハッシュを取り、同じ入力からは常に同じ本文が生成されることを保証する。上位 N 件の選択が実行ごとに揺れると、再送のたびに Issue 本文が書き換わって差分が発生する。順位付けの規則 (count 降順・last_at 降順・同値時は指紋の辞書順) を決定的に固定する。画像・診断ファイルの raw URL は要望 ID から決まる固定 path を指すため、本文へ埋めても本文ハッシュは安定する。commit そのものは本文ハッシュの計算対象に含めない (同じ path へ同じ内容を再度 commit しないため、再送で commit が積み増されない)。

(g) ラベル — improvement-request を常に付け、type:<bug|request> と状態ラベルを維持する。type ラベルは排他とし、種別変更時に古いほうを外す。

(h) 起票と更新の判定 — 一覧からの一括送信を受けて、1 件ごとの動作を状態遷移の記録ではなく現在値からの導出で決める。判定に使うのは issue_number の有無と、現在の内容から組み立てた本文の正規化ハッシュ (body_hash_current) と、最後に GitHub へ反映した本文のハッシュ (issue_body_hash) の 3 つだけ。
- issue_number が無い → POST で新規作成し、返った番号と本文ハッシュを保存する。
- issue_number があり 2 つのハッシュが一致 → GitHub を呼ばない。結果は skipped (変更なし)。
- issue_number があり ハッシュが不一致 → PATCH で本文・タイトル接頭辞・ラベルを更新する。
- 直前が失敗の行 → 失敗という状態を見て分岐せず、上の 3 分岐をやり直す。
この導出により、対応しうるパターンを数え上げて分岐を増やす必要がなくなる。

(i) 孤児 Issue の回収 — POST が成功した直後に DB 更新が失敗すると、番号が記録されないまま Issue だけが残り、次回の送信で二重に作られる。これを防ぐため、Issue 本文の末尾に機械可読マーカー <!-- improvement-request: <要望 ID> --> を必ず埋める。送信処理は POST の前に GitHub 検索で同じマーカーを持つ open/closed の Issue を探し、見つかれば作成せずその番号を回収して更新経路へ回す。

(j) 一括送信の単位 — 1 回の送信で扱うのは最大 20 件とし、サーバは逐次 (並列度 1) で処理する。並列化しない理由は 2 つある。1 つは GitHub の副次レート制限が短時間の集中書込みで発動すること。もう 1 つは、公式が contents API について『削除 endpoint と作成/更新 endpoint を並行で呼ぶと衝突するため直列に使うこと』と明記していることで、画像・診断ファイルの commit と削除 commit が同時にリポジトリを触らないようにする必要がある。後者は appr-063 の commit 方式に固有の制約で、レート制限が緩和されても消えない。行ごとの結果 (created / updated / skipped / failed) を配列で返し、失敗行だけを pending_retry へ積んで既存 cron の再送に載せる。

(k) 廃棄・見送り・削除と Issue の対応 — GitHub の Issue は API で削除できないため、close と状態ラベルで表現する。見送り (dropped) は close + status:dropped、廃棄 (discarded) は close + status:discarded とし、いずれも理由を Issue へコメントとして 1 件付ける。重複を理由とする廃棄では、重複先の Issue 番号を本文の相互リンクとして書く。削除 (tombstone 化) では Issue を close + status:discarded にしたうえで、本文の診断・画像参照部分を「元の要望は削除されました」に置き換える。あわせて `improvement-requests/<要望 ID>/` 配下のファイルを削除する commit を積む。**ただしこれは git 履歴からの消去ではない** (appr-063 の帰結)。削除 commit 以後の tree からは消えるが、過去の commit を辿れば内容に到達できる。この限界を README と削除確認画面に明記する。close 済みの行を再度送信対象にした場合は reopen せず close のまま本文だけを更新する。

(l) トークンの投入導線 — GitHub トークンは Cloudflare Workers Secret (GITHUB_ISSUE_TOKEN) として保持し、DB・リポジトリ・設定 JSON へ書かない。必要権限は appr-063 により Issue の読み書きに加えて対象リポジトリの contents 書込みを含む (fine-grained personal access token の場合は Issues: Read and write と Contents: Read and write を、対象 1 リポジトリだけに与える)。権限が strong になるぶん、対象リポジトリを 1 つに絞ることを必須の運用条件とする。そのうえで、トークンを投入する箇所すべてに取得先 URL と必要権限を併記する。対象は 3 箇所: 1) `.dev.vars.example` の該当行の直上コメント、2) `wrangler secret put GITHUB_ISSUE_TOKEN` を案内する README の連携設定手順、3) 管理画面の GitHub 連携設定セクション。
記載内容は 3 箇所で同一とする: 取得先は fine-grained personal access token の作成画面 https://github.com/settings/personal-access-tokens/new 、必要権限は対象リポジトリを絞ったうえで **Issues = Read and write、Contents = Read and write、Metadata = Read-only の 3 つ** (Contents は appr-063 の commit 方式に必須で、これが無いと画像・診断ファイルの commit が全て失敗する。Metadata は fine-grained token で他の権限を選ぶと自動的に必須になる読み取り専用権限)、classic token を使う場合は https://github.com/settings/tokens/new?scopes=repo (repo scope は必要以上に広いため fine-grained を推奨する)、有効期限は必ず設定し失効前に入れ替える。手順の解説は https://docs.github.com/en/authentication/keeping-your-account-secure/managing-your-personal-access-tokens を参照先として示す。文言は 1 箇所 (共有定数) に置き、3 箇所から参照する。

(m) Claude Code からの利用 — 起票された Issue は gh CLI から扱う。`gh issue list --label improvement-request`、`gh issue view <番号>` で内容を読み、改善作業を行い、PR の本文へ `Fixes #<番号>` を書いて Issue を閉じる。Hub 側に Claude Code 向けの独自 API・独自トークン・独自認証を設けない (appr-061)。gh の既存認証をそのまま使うため、利用者が新たに保管すべき秘密情報は増えない。

### qa-283 (対応セル: desktop-windows, desktop-macos)

**質問**: 実装済み selector と現行配線に合わせて dev-workflow の stale 記述と tier 語彙をどう補正するか。

**回答**: 【本 entry の位置づけ】
本 entry は qa-214 を全面継承し、2026-08-09 の selector 実装済み事実と tier 語彙の統一を反映した自己完結版である。仕様章 (compile-spec-doc.py) は確定セルの現 qa_ref に対応する節だけを出力するため、追補のみを持つ entry でセルを再確定すると、基礎となる契約本文が章から消える。章が仕様の中核を語らなくなるのを防ぐため、追補を重ねるときは基礎契約を丸ごと引き継いだ統合 entry を作る。以下、統合元ごとに節を分ける。

===== web (CI/CD) の 3 tier と決定論的選択 (統合元: qa-208) =====
【当該 entry の質問】品質検証が一律最大深度で実行され、1 周 2〜3 時間から 10 時間超に達して MVP 原則 (まず動くものを速く出し、そこから検証する) に反しています。検証時間の上限値ではなく検証深度の基準そのものを変えるとき、どの深度をどの根拠で選ぶかを CI 側でどう決定論的に定めますか?

ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-143 の plugin hook entry point 3 者一致契約および qa-142 以前の dev-workflow.web 契約を全面維持したまま、検証深度を risk 比例で決める verification profile を追加確定する。時間上限を成功基準にしない (実行すべき検証量は変更内容と物量に依存し、一律の時間予算は検証の形骸化 = Goodhart 化を招くため)。

【1. 3 tier と決定論的選択】検証深度を mvp / standard / critical の 3 tier とし、tier は人の裁量ではなく変更差分から決定論的に導出する。導出入力は (a) 変更 path 集合、(b) 逆転不能性、(c) 公開面の 3 つだけとする。critical は認証認可・DB migration・データ削除経路・production deploy unit・公開 catalog のいずれかに触れた場合。standard は製品 runtime コード (外部 API / UI / DB 読み取り経路) に触れた場合。いずれにも該当しない repository 内 tooling・plugin・spec 文書・未公開 feature 実装は mvp とする。判定は scripts/select-verification-tier.py が変更 path から算出し、算出根拠 (該当した規則 id と path) を JSON で出力する。同じ差分に対して常に同じ tier を返し、環境や実行者で揺れない。

【2. tier 引き上げの自動性と引き下げの記録義務】規則が上位 tier を指す場合は自動的に引き上げる。人が算出結果より低い tier で実行する場合は --downgrade-to <tier> --reason <理由> を必須とし、理由と算出根拠を eval-log へ残したうえで後述の deferred issue を必ず起票する。無記録の引き下げは fail-closed で拒否する。

【3. tier に依らず常時 fail-closed の 3 ゲート】secret / credential 漏洩検査、データ破壊・worktree clobber ガード (qa-140 の pre-commit 整合性ガード)、build / type check の 3 種は全 tier で blocking を維持する。理由はいずれも失敗の代償が検証時間を上回る不可逆事故 (公開後に取り消せない漏洩・作業そのものの消失・壊れたものを動くものとして出荷) であり、MVP の速度目的と衝突しないためである。

【4. tier 別の blocking 集合】mvp は上記 3 ゲートに加えて、変更 module に対する focused test だけを blocking とする。standard は加えて該当 package の単体・結合テストと契約検証を blocking とする。critical は従来どおり全深度 (完成度 evaluator 全 aspect・独立監査 fork・live-trial 全 scenario) を blocking として維持する。blocking から外れた検査は無効化せず advisory として実行し、結果は run を止めずに報告する。

【5. 降格分の被覆保全 (放棄でなく延期)】advisory へ降格した検査の finding は 0 件へ潰さず、bd の follow-up issue として必ず起票する。issue は元ゲート名・算出 tier・降格根拠・対象 path・再実行コマンドを持ち、deferred-verification ラベルで台帳化する。起票に失敗した場合は降格自体を fail-closed で拒否する (降格が黙って被覆を消す経路を作らない)。Stage 1 公開判定の直前に 1 箇所だけ deferred-verification の未解決 0 件ゲートを置き、MVP 期間中に積んだ延期分をそこで必ず回収する。

【6. 製品境界】変更は repository 内の CI・品質ゲート・plugin 配布に限定する。Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

【再採番・rebase 追記 (2026-08-09)】本 entry は当初 qa-144 として起票したが、並行セッションが 同一番号を別論点 (サインイン後のスコープ解決とルーティング結線) で先に確定させていたため qa-208 へ 再採番した。回答内容は変更していない。本文が「維持する」と述べる既存契約の参照点は、main 取込後の 最新確定 (dev-workflow.web=qa-199 / testing-qa.web=qa-205) まで含めて読むこと。本 entry はそれらを 覆さず、その上へ tier 別の検証深度契約を重ねる。

===== desktop ローカル環境での tier 再現 (統合元: qa-209) =====
【当該 entry の質問】作者のローカル desktop 環境 (macOS 主 / Windows 従) で、CI と同じ verification profile を再現しつつ、goal-seek ループ・独立監査 fork・live-trial といった重い検証をどこまで既定で省略しますか?

ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-140 の並列 worktree 安全契約・更新時刻クラスタ診断契約と qa-102 の C11 本文 readiness・C02 lifecycle / document layer parity・live-trial session 環境隔離契約を全面維持したまま、ローカル実行側の verification profile を追加確定する。

【1. tier 正本の一元化】tier 算出の正本は scripts/select-verification-tier.py の 1 実装とし、ローカルも CI も同じ script を同じ入力で呼ぶ。ローカル専用の緩い判定表を別に持たない。macOS と Windows で同一の pnpm script から起動でき、パス区切り・改行・特定 shell に依存しない。

【2. 既定 tier と goal-seek ループ回数】ローカル既定は mvp とする。skill の goal_seek.max_loops は tier 別に mvp=1 / standard=3 / critical=5 とし、frontmatter の固定値 5 を tier 解決値で上書きする。max_loops に達して未達が残る場合、mvp では失敗にせず未達 checklist を deferred-verification issue へ落として正常終了する (critical では従来どおり未達を fail とする)。

【3. 独立監査 fork と live-trial の起動条件】assign-*-evaluator の独立監査 fork と run-skill-live-trial は tier=critical でのみ必須とする。mvp / standard では既定で起動せず、起動を省略した事実と対象を deferred-verification issue へ記録する。--tier critical または --force で明示起動する経路は残し、必要時にいつでも全深度へ戻せるようにする。

【4. 常時 fail-closed の維持】qa-140 の pre-commit 整合性ガード (index tree が HEAD 同一内容の祖先 tree に一致する場合と staged 削除が安全閾値を超える場合の拒否)、reference-transaction hook、secret scan、build / type check はローカルでも tier に依らず維持する。並列 worktree の巻き戻しはデータ消失であり、短縮対象にしない。

【5. 回帰と境界】tier 算出の正負例 (path 別・逆転不能性別・公開面別)、downgrade の理由必須、deferred issue 起票失敗時の fail-closed、max_loops の tier 別解決、fork / live-trial の起動条件を自動テストする。変更は repository 内の開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

【再採番・rebase 追記 (2026-08-09)】本 entry は当初 qa-145 として起票したが、並行セッションが 同一番号を別論点 (サインイン後のスコープ解決とルーティング結線) で先に確定させていたため qa-209 へ 再採番した。回答内容は変更していない。本文が「維持する」と述べる既存契約の参照点は、main 取込後の 最新確定 (dev-workflow.web=qa-199 / testing-qa.web=qa-205) まで含めて読むこと。本 entry はそれらを 覆さず、その上へ tier 別の検証深度契約を重ねる。

===== 検査結果の履歴保存・evaluator cache・selector 利用不能時の境界 (統合元: qa-212、現行補正: qa-216) =====
【当該 entry の質問】MVP tier で省略・降格した検査を後から検証できるように tier 選択と検査結果をどう残すべきか。また実装済み selector が利用不能になった場合、実行系はどう失敗を扱うべきか。

【1. 検査結果の履歴保存 (施策1)】
tier 選択のたびに `eval-log/verification-tier/<run-id>/tier-decision.json` を 1 件生成する。必須フィールドは次のとおりとする。

- `run_id` / `decided_at` (UTC ISO8601) / `target` (feature id または task id)
- `tier` (mvp | standard | critical) と `matched_rules` (tier を決めた規則 id の配列)
- `inputs`: tier 導出に使った決定入力の実測値 (変更 path 集合・変更 file 数・実効変更行数・影響 package 数)
- `checks`: 検査ごとに `{id, disposition, reason}`。`disposition` は `executed` | `deferred` | `skipped` の 3 値
- `deferred_issue_refs`: `deferred` にした検査を受け止める beads issue id の配列 (空配列を許さない。deferred が 1 件でもあれば必須)

`skipped` と `deferred` を同じ値に潰さない。`skipped` は「この tier では恒久的に実行しない」、`deferred` は「この周回では実行しないが、後続で必ず実行する」であり、後者だけが issue 追跡義務を負う。両者を潰すと「省略した」と「落ちた」が事後に区別できなくなる。

保存は append-only とし、既存 run の tier-decision.json を上書き・削除しない。critical tier へ昇格したときも過去の mvp 判定を消さず、`supersedes` に旧 run_id を書いて連鎖を残す。

【2. evaluator 結果の cache (施策2)】
同一入力に対する evaluator の再実行を避けるため、`eval-log/verification-tier/cache/<cache-key>.json` に結果を保存する。`cache_key` は次の 3 要素の sha256 とする。

- 評価対象の実体 digest (対象 file 群の内容 sha256 を path 昇順で連結したもの。mtime や path 単体は使わない)
- evaluator の識別子と version (rubric 改訂で cache が自動失効するため)
- 評価に効く設定値 (tier、閾値、有効化した検査 id 集合)

cache hit を採用した場合も `checks[].disposition` は `executed` とし、`cache_hit: true` と `cache_key` を併記する。cache を根拠に「実行した」と申告しつつ、どの入力に対する結果かを追えない状態を作らない。cache miss と cache 破損 (schema 不適合・digest 不一致) は区別し、破損時は cache を使わず再実行する (fail-open で古い PASS を再利用しない)。

【3. selector の現行実装と利用不能時の境界 (施策4・2026-08-09 補正)】
`scripts/select-verification-tier.py` は 2026-08-09 に実装済みであり、変更 path から mvp / standard / critical を決定論的に算出する。CI は `.github/workflows/governance-check.yml` から同 script を 1 回だけ起動し、`--derive-checks` で gate 台帳を一方向に導出して `tier-decision.json` を保存する。`tier_selector` には script path・source digest・rules digest を記録し、`scripts/validate-tier-decision.py` は `tier_selector: "absent"` を受理しない。

selector の欠落・破損・base ref 解決不能・変更 path 空集合は、通常運用では standard への黙示 fallback にせず run を fail-closed で停止する。過去または bootstrap 環境で `tier_selector: "absent"` を記録済みの run は有効な tier 判定とみなさず、critical tier 相当の再検証対象とする。これにより、判断主体が不在のまま mvp の検査削減だけが既定化する経路を閉じる。

現行 CI 配線は tier・blocking/advisory/deferred 集合の算出、妥当性検査、artifact 保存までを実装済みである。一方、下流 gate の実行自体を tier に応じて切り替える処理は未実装であり、`HarnessHub-xcl3` で追跡する。evaluator cache の writer/lookup/store 機構は `scripts/build-evaluator-cache.py` に実装済みだが、実 evaluator 呼出元への接続は未完了であり `HarnessHub-6nf1` で追跡する。実装済み機構と実運用で効いている機能を混同しない。

【本 entry の位置づけ (2026-08-15)】
本 entry は qa-216 を **回答本文について逐語で全面継承した自己完結版** である。第 4 回 completeness evaluator が medium finding (`design_knowledge_reflection`) として、legacy_backfill 経路 4 章 (backend / dev-workflow / infrastructure / testing-qa) の `design_applications` が『〜という責務分離に適用した』のように原則名の言い換えに留まり、dialogue 経路より具体性が低いと指摘した。writer (`set-qa-design-applications`) は完了済み backfill と異なる解釈の再適用を構造的に拒否するため、既存 entry を書き換える経路が無い。そこで reopen → 本 entry で再確定という正規経路を採る。
**変更したのは設計解釈 (`design_applications`) だけであり、上記の回答本文が定める要件は 一切変更していない。** 仕様章 (compile-spec-doc.py) は確定セルの現 qa_ref に対応する節だけを 出力するため、追補のみの entry で再確定すると基礎契約が章から消える。それを防ぐため本文を 丸ごと引き継いでいる (qa-216 / qa-217 と同じ方式)。

## 上流指針 (doctrine anchor)

- 本カテゴリは共通シード (categories) 外のプロジェクト固有カテゴリで、approved な pending 例外 (owner: daishiman) として上流指針を確定している。

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Continuous Delivery — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/continuous-delivery.md`

#### 目的

変更の取り込みから本番反映までの経路を、常にリリース可能な状態を保ちながら、誰が実行しても同じ結果になる自動化された経路にする。

#### 解決する問題

- 本番反映が特定の担当者の手順に依存し、再現も検証もできない。
- ローカルでは通るが CI では落ちる (あるいはその逆) という環境乖離が、原因調査の大半を占める。
- 長命ブランチの統合が遅れ、統合時にまとめて壊れる。
- 修正が完了しているのに本番へ反映されず、「コードは直っている」と「本番が直っている」が混同される。
- リリースの単位と手順が変更ごとに変わり、逆操作 (ロールバック) が定義されない。

#### 適用条件

- 変更が継続的に発生し、複数人が同じ成果物へ手を入れる。
- 自動検証を CI で実行でき、失敗時に統合を止める権限がある。
- 本番反映の権限と手順を組織として決められる。

#### 非適用条件

- 単発の使い捨て成果物に、多段パイプラインと昇格手順を先行構築しない。
- 自動検証が無い状態で本番への自動反映だけを先に入れない (検証なき自動化は事故の高速化になる)。
- 外部審査や法定手続きが介在する反映に、承認点なしの全自動を適用しない。

#### トレードオフ・失敗モード

- パイプラインの構築と維持に継続的な工数がかかり、変更頻度が低い対象では投資超過になる。
- 緊急時のローカル実行を常態化させ、正本経路が形骸化する。
- CI が緑であることを本番の健全性と読み替え、反映漏れ (デプロイ鮮度) を検知できない。
- フィーチャーフラグを消さずに残し、経路の組み合わせ爆発と死んだコードを抱える。
- 手順を文書化しただけで自動化せず、担当者交代で運用品質が落ちる。

#### goalへの寄与

- リードタイム・変更失敗率・復旧時間を、ワークフロー判断の成否指標として要件へ接続できる。
- 正本経路の一本化により、「誰が実行したか」ではなく「どの検証を通ったか」で本番反映を説明できる。
- 稼働ビルドの素性を確認可能にすることで、症状の切り分けを最小回数の観測で終わらせられる。

---

#### 本章での適用

##### 確定内容 qa-338 (対応セル: web)

- 確定要件: 「[appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 …」 (全文は本章「確定内容 (質疑録)」の `qa-338` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: 限られた表示面に対して、優先度の高い情報から順に固定枠を割り当てる (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/information-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: Issue 本文という有限の面に対し、何が入るかを実装時の成り行きに任せると、診断が多い投稿ほど受入条件や想定変更箇所という実装に最も必要な部分が押し出される。固定区画を先に確保し、可変部を診断だけに限定する。
  - トレードオフ:
    - 診断が予算に収まらない場合、本文だけでは全容が読めない。commit したファイルへの link と省略件数を明示することで、読み手が『これで全部か』を誤らないようにする
    - 配分値が固定なので、将来の節追加時に見直しが要る
- 原則: 同じ入力から同じ出力を得られる形で外部へ反映する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/continuous-delivery.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 起票は失敗時に再送される。上位 N 件の順位付けが非決定的だと、再送のたびに本文が変わって Issue の更新履歴が汚れ、内容が変わったのか再送なのか区別できなくなる。順位規則を完全に決定的にし、本文ハッシュで同一性を判定する。ファイルの commit を本文ハッシュの計算対象から外すのは、commit が 1 度きりの操作で再送のたびに積み増してはならないためである。raw URL は要望 ID から決まる固定 path を指すので、本文へ埋めてもハッシュは安定する。
  - トレードオフ:
    - 同値の場合に指紋の辞書順という意味のない基準で順位が決まる。決定性のほうが表示順の自然さより重要である
    - commit をハッシュ対象外にしたため、画像を差し替えても本文更新は起きない。画像は投稿後に編集しない項目であり編集経路を設けない
- 原則: 状態の組合せを数え上げず、現在値から動作を導出する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/design-patterns.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 「未起票 / 起票済みで変更なし / 起票済みで変更あり / 前回失敗」というパターンを状態遷移として持つと、項目が 1 つ増えるたびに分岐が掛け算で増え、いずれ組合せを網羅できなくなる。issue_number の有無と 2 つの本文ハッシュの一致だけを見れば、失敗後の再実行を含めて常に同じ判定へ収束する。
  - トレードオフ:
    - 毎回ハッシュを計算する分だけ送信処理が重くなる。本文組み立てはどのみち必要で、追加は数十バイトのハッシュ計算だけである
    - 「なぜ skip されたか」が状態列から直接読めない。ハッシュ一致という理由を結果の配列に明示して返すことで補う
- 原則: 外部システムに作った実体を、自分の記録が壊れても回収できる形で刻印する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/continuous-delivery.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: Issue を作った直後に DB 更新が失敗すると、番号を記録できないまま Issue だけが残り、次の送信で二重に作られる。本文へ要望 ID のマーカーを埋め、作成前に検索して回収することで、二重起票の可能性を DB の書込み成功に依存させない。
  - トレードオフ:
    - 作成のたびに検索 API を 1 回呼ぶためレート制限の消費が増える。二重起票の後始末は人手になるため、呼び出し 1 回のほうが安い
    - GitHub の検索索引には反映遅延があり、極端に短い間隔での連続実行では回収に漏れが出る。一括送信は逐次処理であり、同一要望を秒間隔で送る経路がない
- 原則: 権限は必要最小に絞り、その最小構成を導線と同じ場所に明示する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: トークンの必要権限を案内に書かないと、設定する管理者は迷った末に最も広い scope (classic の repo) を選ぶ。Issues = Read and write と Metadata = Read-only という最小構成を取得先 URL と並べて書くことで、最小権限が既定の選択になる。
  - トレードオフ:
    - GitHub 側の権限名や作成画面の URL が変わると案内が古くなる。文言を共有定数へ 1 本化し、変更時の追随箇所を 1 つに限る
    - fine-grained token はリポジトリ単位の指定が要り、classic より設定の手数が多い。過大な権限を渡す危険のほうが重い
- 原則: 既にある道具で目的が果たせるなら、新しい経路を作らない (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 『このディレクトリから Claude Code で改善要望を読んで実行したい』という当初の要望は、gh CLI が既存の認証で満たす。独自 API・独自トークン・独自認証・1Password 保管という一式は、この目的のためだけに新設される経路であり、保守と秘密管理の対象を増やす。appr-061 でこれを撤回した。
  - トレードオフ:
    - gh CLI がインストールされ認証済みであることが前提になる。開発者の手元には既にある道具であり追加の導入負担がない
    - Claude Code 向けに最適化した機械可読形式を配れなくなる。Issue の本文構成を安定させることで、読み取り側で十分に扱える
- 原則: 自分の側で消した情報を、外部の複製から到達できないようにする (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `not_applicable`
  - 章固有の根拠: appr-061 Q2 でスクリーンショットと診断を GitHub 側へ出す決定が下り、黒塗りは任意・リポジトリ可視性は不問と定められた。さらに appr-063 で、公式 API に Issue 添付が存在しないことを受けて Contents API による repository への commit 方式が選ばれた。commit した画像と診断ファイルは git 履歴に永久に残り、削除 commit を積んでも履歴からは消えないため、この原則は GitHub へ出したものに対しては成立しない。適用できないことを not_applicable として明示し、成立しているかのように書かない。
  - トレードオフ:
    - 要望を削除しても、GitHub リポジトリへ commit した画像は git 履歴に残り、要望 ID から決まる raw URL や履歴上の blob から到達できる可能性が残る。削除 commit を積んでも履歴からは消えない。仕様として受け入れたリスク
    - 代替の防護 (黒塗り必須化・private 限定) は利用者が明示的に選ばなかったため張らない。投稿時の注意喚起文言のみを残す
##### 確定内容 qa-283 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 「【本 entry の位置づけ】…」 (全文は本章「確定内容 (質疑録)」の `qa-283` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: デプロイパイプライン (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/continuous-delivery.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の web 節【1. 3 tier と決定論的選択】が定める『導出入力は (a) 変更 path 集合、(b) 逆転不能性、(c) 公開面の 3 つだけとする』と【2. tier 引き上げの自動性と引き下げの記録義務】の 部分へ効く。パイプラインの各段は通過・不通過が観測可能でなければ意味を持たないが、『どれだけ検査するか』自体を人が決めると、段の意味が実行者ごとに変わってしまう。入力を 3 つに 限定した理由は、入力が増えるほど同じ差分に別の tier が出る余地が広がるためである。代替案として 『変更行数や file 数も導出入力に加える』方式を検討したが、1 行の認証変更より 1000 行の文書変更が 重くなるという逆転が起きるため採らなかった (行数は tier-decision.json の `inputs` へ実測値として 記録はするが、導出には使わない)。引き下げを禁止せず `--downgrade-to` + `--reason` の記録義務に したのも同じ判断で、禁止は無記録の逸脱を生む。
  - トレードオフ:
    - selector の規則表と gate 台帳を継続的に保守する必要がある
    - 3 入力に還元できない risk (外部サービス側の変更等) は tier へ反映されない
- 原則: ゲートと改善ループ (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/test-strategy.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の web 節【5. 降格分の被覆保全 (放棄でなく延期)】が定める『Stage 1 公開判定の直前に 1 箇所だけ deferred-verification の未解決 0 件ゲートを置き、MVP 期間中に積んだ延期分をそこで必ず回収する』と、desktop 節【2. 既定 tier と goal-seek ループ回数】の『max_loops に達して未達が残る場合、mvp では 失敗にせず未達 checklist を deferred-verification issue へ落として正常終了する』の部分へ効く。降格を『放棄』でなく『延期』にするには回収点が要り、その回収点を各 run の中ではなく run の外側 (Stage 1 公開判定の直前 1 箇所) に置いたことが本章の設計上の核心である。代替案として 『降格した検査を次の run で必ず実行する』方式を検討したが、mvp が連続する期間でも毎回全量へ戻ることに なり短縮効果が消えるため採らなかった。起票失敗時に降格自体を fail-closed で拒否する規定は、回収点への到達を機械的に保証するための最後の錠である。
  - トレードオフ:
    - Stage 1 直前に延期分が集中し、公開判定が長時間化しうる
    - issue 台帳が唯一の回収経路になるため、台帳の可用性に依存する
- 原則: Explicit effects and errors (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-code.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の施策4節【3. selector の現行実装と利用不能時の境界】が定める『selector の欠落・破損・base ref 解決不能・変更 path 空集合は、通常運用では standard への黙示 fallback にせず run を fail-closed で停止する』および『過去または bootstrap 環境で tier_selector: "absent" を記録済みの run は有効な tier 判定とみなさず、critical tier 相当の再検証対象とする』の部分へ効く。fallback は一見すると安全側の設計に見えるが、standard へ落とすと『判定できなかった』と 『判定した結果 standard だった』が記録上まったく同じ姿になり、判断主体が不在のまま検査削減だけが 既定化する経路を開いてしまう。代替案として『critical へ fallback する』方式を検討したが、停止と同じだけの待ち時間を払いながら原因が記録に残らないため、停止より劣ると判断して採らなかった。
  - トレードオフ:
    - selector の一時的な不調でも run 全体が止まる
    - bootstrap 期の既存 run を再検証対象として抱え続ける必要がある
- 原則: 観測可能性 (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の施策1節【1. 検査結果の履歴保存】が定める『skipped と deferred を同じ値に潰さない。skipped は「この tier では恒久的に実行しない」、deferred は「この周回では実行しないが、後続で必ず 実行する」であり、後者だけが issue 追跡義務を負う』と、施策2節【2. evaluator 結果の cache】の 『cache hit を採用した場合も checks[].disposition は executed とし、cache_hit: true と cache_key を 併記する』の部分へ効く。両者に共通するのは『同じ結果値へ意味の違うものを潰さない』という一点である。cache_key を実体 digest (対象 file 群の内容 sha256 を path 昇順で連結) から作り mtime や path 単体を 使わないのも、cache が『どの入力に対する結果か』を追える形でしか成立しないためである。代替案として『cache 破損時は直近の PASS を再利用する』方式を検討したが、検証していないものを検証済みとして記録する fail-open になるため採らなかった。
  - トレードオフ:
    - disposition と cache metadata の schema を保守し続ける必要がある
    - 実体 digest 方式は対象 file が多い場合に算出費用が増える
- 資するゴール: G1, G2, G5

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| typescript | 7.0.2 | Microsoft (www.typescriptlang.org) | https://www.typescriptlang.org/docs/ | 2026-08-15T00:15:16Z | 2026-08-15T00:15:16Z |
| pnpm | 11.22.0 | pnpm maintainers (github.com) | https://github.com/pnpm/pnpm/releases | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
| github-actions | 2026-08-07 (取得日。ページ本文に最終更新日の明示なし) | GitHub, Inc. (docs.github.com) | https://docs.github.com/en/actions | 2026-08-15T01:35:54Z | 2026-08-15T01:35:54Z |
| claude-code-plugins | 2026-08-16 (公式 plugin sources 表の直接照合日。ページ本文に最終更新日の明示なし) | Anthropic (code.claude.com) | https://code.claude.com/docs/en/plugin-marketplaces | 2026-08-16T12:29:34Z | 2026-08-16T12:29:34Z |
| octokit-rest | 22.0.1 | GitHub, Inc. (Octokit) (github.com) | https://github.com/octokit/rest.js | 2026-08-15T00:15:16Z | 2026-08-15T00:15:16Z |
