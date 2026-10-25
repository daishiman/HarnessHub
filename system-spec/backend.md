---
status: confirmed
category: backend
aggregate: 確定
spec_cells: [backend.web, backend.mobile, backend.tablet, backend.desktop-windows, backend.desktop-linux, backend.desktop-macos]
serves_goals: [G1, G2, G5, G3]
---

# バックエンド (backend)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-337 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアント向け API 差分なし (ブラウザ経由は web 行でカバー) |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアント向け API 差分なし (ブラウザ経由は web 行でカバー) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-280 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-280 |

## 確定内容 (質疑録)

### qa-337 (対応セル: web)

**質問**: 改善要望のサーバ側 API を、GitHub Issue 出口の前提でどう確定するか。受入・保存・応答の各段の情報量の抑え方を含む。

**回答**: [appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 API」は発想ごと撤回し、Issue は人間が読む従来型の不具合・要望票として書く。Claude Code から改善へ繋ぐ導線は独自 API ではなく既存の gh CLI (gh issue list / gh issue view) が担う。

[appr-061 Q2 / appr-063 で変わった点] スクリーンショットと診断情報を GitHub 側へ出す。appr-048 以前の設計 (qa-255(b)3) は「画像の所在として管理画面の詳細 URL だけを載せ、実体は認可の内側に置く」だったが、これを改める。対応する側が Issue だけを見れば状況を再現できる状態を優先する。ただし GitHub は Issue への画像添付を公式 API として提供していない。公式ドキュメントが案内するのはブラウザ UI からのドラッグ&ドロップだけで、ブラウザが内部で使う uploads.github.com / user-attachments は文書化されていない経路である (https://docs.github.com/en/rest/issues/issues, https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files を 2026-08-16 に確認)。したがってサーバ側から「添付」する公式手段は存在しない。appr-063 で利用者が選んだ実現方法は **GitHub Contents API で対象リポジトリへ画像と診断ファイルを commit し、その raw URL を Issue 本文へ Markdown の画像参照・リンクとして書く** ことである。保存先 path は要望 ID から決まる固定形 `improvement-requests/<要望 ID>/screenshot.png` および `improvement-requests/<要望 ID>/diagnostics.json` とする。以降この章で「添付」と書く場合は、この commit + 本文参照を指す。

[Q2 / appr-063 の帰結として利用者が選択した扱い] 黒塗り (マスキング) は任意のままとし、未黒塗りでの送信を止めない。改善要望を上げる GitHub リポジトリの可視性も仕様では制約しない。したがって次の 3 点は仕様として受け入れたリスクであり、隠さず記録する: (i) 44 の業務画面の中身が黒塗りされないまま GitHub 側へ出る投稿が一定数生じうる。(ii) commit した画像と診断ファイルは対象リポジトリの git 履歴へ永久に残る。ファイルを削除する commit を積んでも履歴からは消えないため、qa-255(k) が持っていた「自分の側で消した情報を外部の複製から到達できないようにする」原則は、GitHub へ出したものについては成立しない。削除時に本文の差し替えとファイル削除 commit は行うが、履歴からの消去は保証しない (履歴の書き換えはリポジトリ全体に影響するため、仕組みとしては用意しない)。(iii) Hub が保持する GitHub トークンは、Issue の起票・更新に加えて対象リポジトリの contents 書込み権限を要する。トークンが漏れた場合の影響は Issue の改変にとどまらず、リポジトリの改変に及ぶ。権限は対象 1 リポジトリに限定し、Cloudflare Workers Secret から出さないことで抑える。なお raw URL の到達範囲はリポジトリの可視性に従い、public なら誰でも閲覧でき、private ならリポジトリへの権限が要る。可視性を仕様で制約しないという appr-061 の選択は維持する。

[復元元] appr-048 以前の qa-253 の内容を正本として戻す。以下は qa-253 の確定内容であり、指示文 API の endpoint 群はここへ差し替わらず、そもそも存在しなかったものとして扱う。

(a) 受入 — 診断 JSON は 32KB を上限として検証し、超過したリクエストは 413 で拒否する。クライアントが切り詰める責任を負うが、サーバはそれを信じない。クライアント側の実装ミスや改造された要求で、上限のない診断が保存されることを構造的に防ぐ。qa-235 で確定した投稿 API の上限(リクエスト全体・画像枚数・magic bytes 検証・rate limit) はそのまま維持する。

(b) 正規化 — 受け取った診断はサーバ側でも指紋による畳み込みを 1 度通してから保存する。クライアントで畳み込み済みなら結果は変わらず (冪等)、畳み込まれていない要求だけが是正される。畳み込み後もグループ数上限を超える場合はサーバ側で切り、truncated=true を立てる。

(c) 保存 — 診断は 32KB 以内が保証されるので、専用列に JSON テキストとして保存する。合わせて診断サマリ (error グループ数・warn グループ数・失敗 request グループ数・総 count・truncated) を独立した列へ非正規化して持つ。

(d) 応答 — 一覧 API は診断本体を返さない。返すのはサマリ列だけとする。1 ページ 50 件の一覧で診断本体を返すと最悪 50 × 32KB = 1.6MB の応答になり、管理者が一覧を眺めるだけで毎回それが流れる。詳細 API だけが本体を返す。

(e) 一覧の本文 — 本文も一覧では先頭 200 文字に切って返す。全文は詳細でのみ返す。

(f) Issue 起票時 — 起票ペイロードの組み立てはサーバ側で行い、予算超過分は本文へ入れない(配分は dev-workflow 側で確定)。GitHub API へ 65,536 文字を超える本文を投げて 422 で弾かれる経路を作らない。

(g) 一括送信 API — 管理画面の一覧から選択された要望 ID の配列を受け、1 件ずつ GitHub へ反映する API を持つ。受入は最大 20 件で、超過は 400 で拒否する。処理は逐次 (並列度 1) とし、行ごとに created / updated / skipped / failed と理由を返す。1 件の失敗で全体を中断せず、残りを処理してから結果をまとめて返す。失敗行は github_sync_state=pending_retry へ落とし、日次 cron が拾う。
二重送信の抑止: 送信対象の行は処理開始時に github_sync_state を sending へ条件付き更新(現在値が sending でない場合のみ) する。既に sending の行は skipped (処理中) として返す。管理者が 2 人同時に同じ行を送っても GitHub 呼び出しは 1 回に収束する。
認可: 一括送信は会社境界を跨げない。選択 ID の配列に自社以外の行が 1 件でも含まれていれば、その行だけを黙って除外するのではなく要求全体を 403 で拒否する。ID の総当たりで他社行の存在を推測できてしまうため、部分成功を返さない。

(h) 廃棄・削除 API — 状態変更 API に discarded を加え、廃棄理由を必須とする。見送り (dropped) と廃棄 (discarded) は別の状態として扱い、見送り理由と廃棄理由をそれぞれ必須にする。廃棄は workspace-admin 以上が実行でき、行は残る。
削除 API は provider-admin だけが呼べ、対象は discarded の行に限る。削除は (1) 診断の子表の行を消し、本表の body・handled_note・shot_key・route 情報を NULL 化して deleted_at / deleted_by_id / delete_reason を書く (ここまでを 1 つの batch で原子的に行う)、(2) R2 のスクリーンショットオブジェクトを消す、(3) Issue があれば close と本文差し替えを pending_retry として積む、の順で行う。DB を先にするのは、途中で失敗したときに壊れる向きを孤児側 (DB から参照されない R2 オブジェクトが残る) へ寄せるためで、これは日次 cron の孤児回収がそのまま後始末する。逆順にすると参照だけが残って画像を開けない行が生まれ、回収する仕組みが無い。削除済み行は API のどの応答からも本文を返さず、一覧では tombstone として ID と削除記録だけを返す。
**ただし GitHub へ出した画像・診断ファイルは (2) の対象外である。** R2 の実体を消しても、対象リポジトリへ commit した画像は git 履歴に残る。削除時にはファイルを削除する commit を積むが、履歴からは消えない。削除の効果が Hub 側に限られることを、削除の確認画面と API の応答の双方で明示する。
復帰: 廃棄の取り消し (undiscard) を用意する。削除の取り消しは用意しない。実体を消しているため復元できず、取り消せるように見せると誤解を生む。

(i) 一括廃棄 — 一括送信と同じ形で、選択した最大 20 件を一括で廃棄する API を持つ。理由は 1 回の要求に対して 1 つとし、全件へ同じ理由を書く。一括削除は用意しない。削除は復帰できない操作であり、1 件ずつ明示的に行わせる。

(j) 監視 — truncated=true の割合を記録する。この割合が高いままなら上限が実態に合っていない兆候であり、上限値を見直す判断材料にする。上限を無効化する設定は用意しない。

(k) 画像・診断ファイルの commit — GitHub Contents API (PUT /repos/{owner}/{repo}/contents/{path}) で対象リポジトリへ commit する。path は要望 ID から決まる固定形 `improvement-requests/<要望 ID>/screenshot.png` および `improvement-requests/<要望 ID>/diagnostics.json` とし、Issue 起票/更新の一連の処理の中でサーバ側から行う。クライアントに GitHub への直接アップロードをさせない (そのためにはクライアントへ GitHub の権限を渡すことになり、トークンを Workers Secret に閉じ込める方針と衝突する)。冪等性: Contents API の更新は既存 blob の sha を要求するため、commit の前に同じ path を GET し、(a) 存在しなければ作成、(b) 存在して内容が同一なら何もしない、(c) 存在して内容が異なる場合のみ sha を添えて更新する。画像は投稿後に差し替わらないため、実際には (a) か (b) に収束し、再送で commit が積み増されない。**1 リクエスト 1 ファイル**: 公式仕様上、contents API は 1 回の PUT で 1 ファイルしか commit しない (複数ファイルを 1 commit にまとめるには Git Database API で blob → tree → commit → ref 更新を組む必要がある)。本仕様は 1 要望につき screenshot.png と diagnostics.json の 2 ファイルを出すため、commit は 2 回に分かれ、リポジトリには要望 1 件あたり 2 つの commit が積まれる。これを 1 commit にまとめるかどうかはGitHub API クライアントの実装選択 (D12) の範囲として扱い、本章では 2 回の PUT を既定とする。
**直列化**: 公式は削除 endpoint と作成/更新 endpoint を並行で呼ぶと衝突してエラーになるため直列に使うよう明記している。したがって同一リポジトリへの commit 操作は、要望をまたぐ場合も含めて並列度 1 で行う。(g) の一括送信を逐次処理と定めているのはGitHub の副次レート制限への配慮だったが、contents API の衝突回避という別の理由からも同じ結論になる。1 要望内の 2 ファイルも同時ではなく順に commit し、先の commit の応答を受けてから次を出す。削除 (h)(3) で積む削除 commit も同じ直列列へ乗せ、作成/更新中の要望と削除中の要望が同時にリポジトリを触らないようにする。
commit に失敗した場合は本文の起票自体は成立させ、commit だけを pending_retry として積む。2 ファイルのうち片方だけ成功した場合も、成功した側を巻き戻さず、失敗した側だけを再送対象にする (path は要望 ID から決まる固定形なので、再送しても同じ path へ同じ内容が入り冪等である)。画像が付かないことは情報の欠落だが、要望そのものが GitHub へ届かないことのほうが損害が大きい。この場合、本文の画像参照は存在しない path を指すため、本文には画像が未反映であることを 1 行で明記してから参照を書く。

### qa-280 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者側 Publisher の実装形態は?

**回答**: TypeScript 統一を採用。Publisher core は TypeScript (Node + pnpm) で新規実装し、Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する。責務: package 収集・manifest 補完・ローカル pre-check・Hub API 呼出 (Device Flow 認証)・target=web_app の wrangler CLI スクリプト実行と結果報告・URL 登録。検査ロジックは Hub 側 (Workers=JS) と共有し二重実装を回避する。既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) は仕様の正本 (移植元) として参照し、挙動同値性をテストで担保して TypeScript へ移植する (C3 整合)。

【本 entry の位置づけ (2026-08-15)】
本 entry は qa-010 を **回答本文について逐語で全面継承した自己完結版** である。第 4 回 completeness evaluator が medium finding (`design_knowledge_reflection`) として、legacy_backfill 経路 4 章 (backend / dev-workflow / infrastructure / testing-qa) の `design_applications` が『〜という責務分離に適用した』のように原則名の言い換えに留まり、dialogue 経路より具体性が低いと指摘した。writer (`set-qa-design-applications`) は完了済み backfill と異なる解釈の再適用を構造的に拒否するため、既存 entry を書き換える経路が無い。そこで reopen → 本 entry で再確定という正規経路を採る。
**変更したのは設計解釈 (`design_applications`) だけであり、上記の回答本文が定める要件は 一切変更していない。** 仕様章 (compile-spec-doc.py) は確定セルの現 qa_ref に対応する節だけを 出力するため、追補のみの entry で再確定すると基礎契約が章から消える。それを防ぐため本文を 丸ごと引き継いでいる (qa-216 / qa-217 と同じ方式)。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| application-architecture | Robert C. Martin — Clean Architecture | レイヤ境界・依存方向 (内向き)・ユースケース中心設計 | Clean Architecture (2017), the Dependency Rule |
| data-access | Robert C. Martin — Clean Architecture | 永続化を境界の外側へ追い出し interface adapter で隔離する | Clean Architecture — gateways/repositories boundary |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Domain-Driven Design — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/ddd.md`

#### 目的

businessの重要なruleと用語をmodel/code/会話で一致させ、複雑性を適切な境界へ閉じ込め、継続的な学習をsoftwareへ反映する。

#### 解決する問題

- 仕様語、画面語、DB列、code名がずれ、変更時に意味を再解釈する。
- 異なる業務文脈の同名概念を一modelへ押し込み、巨大で矛盾したmodelになる。
- invariantとtransaction ownerが不明で、どこからでもdataを変更できる。
- legacy codeのtechnical構造がbusiness capabilityを隠し、改善順を決められない。

#### 適用条件

- rule、例外、用語、状態遷移が多く、domain expertとの継続的なmodel学習が価値を持つ。
- team/部門ごとに言葉やownershipが異なり、integrationで翻訳が必要。
- core domainの差別化がsystemの本質的目的に直結する。

#### 非適用条件

- 単純CRUD、汎用supporting機能、既製serviceで十分なgeneric subdomain。
- domain expertへアクセスできず、用語とruleを検証するfeedback loopを作れない段階。
- bounded contextをservice数へ機械変換する目的。monolith内moduleでも境界は成立する。

#### トレードオフ・失敗モード

- workshop、model、mapping、専門語彙の維持に継続的な時間が必要。
- aggregateを大きくしすぎてlock/latencyを増やす、細かくしすぎてinvariantをeventual consistencyへ漏らす。
- 「Repository/Entity」等のpattern名だけ採用したanemic modelになり、business ruleがserviceへ散る。
- bounded contextを組織図やDB tableから決め、実際の言語・capability境界を検証しない。
- eventを事実でなくcommandとして命名し、ordering/idempotency/failure recoveryを設計しない。

#### goalへの寄与

- U1-U9の語彙をmodelへ接続し、goalがどのcontext/capability/invariantで実現されるかを示す。
- core domainへ設計投資を集中し、generic領域は無料/低コストserviceや標準実装も比較対象にできる。
- refactoringは一括rewriteでなく、重要なbusiness rule周辺からstrangler/bubble context等で境界を育てる。

---

### Clean Architecture — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/clean-architecture.md`

#### 目的

変化しやすいUI、DB、framework、外部サービスから、長く保持したい業務ルールとuse caseを隔離し、技術交換やテストを目的達成の阻害要因にしない。

#### 解決する問題

- 業務ルールがcontroller/ORM/UI lifecycleへ埋まり、単体で検証できない。
- 外部技術変更が内側のuse caseまで波及し、置換費用を予測できない。
- 入出力形式やvendor型が境界を越え、責務と所有者が曖昧になる。

#### 適用条件

- business ruleが外部I/Oより長寿命で、UI/DB/providerの変更可能性がある。
- 複数delivery channelや外部integrationから同じuse caseを再利用する。
- 重要なpolicyを高速・決定論的にテストする価値が、境界導入費を上回る。

#### 非適用条件

- 寿命の短い検証用prototypeで、交換可能性より学習速度が明確に優先される。
- domain ruleがほぼ無い単純変換scriptで、port/adapterが実質的な抽象を生まない。
- 外部製品そのものがsystemの目的で、抽象化すると必要機能が失われる。ただしsecurity/audit boundaryは別途必要。

#### トレードオフ・失敗モード

- 境界、DTO、mapping、dependency injectionの量が増え、小規模systemでは認知負荷が先行する。
- 「4層を作ること」が目的化すると、変化軸のないinterfaceやpass-through use caseが増える。
- domain modelを万能化してdelivery固有の制約を隠すと、現実のlatency/transaction/error semanticsを見失う。
- portを外側が定義したりinner layerがORM型を返したりすると、名前だけcleanな依存逆転になる。

#### goalへの寄与

- `essential_purpose`に直結するpolicyを外部詳細から守り、goal達成ロジックの検証を速くする。
- 制約に「vendor lock-in低減」「複数platform」「高い変更頻度」がある場合、変更範囲と移行riskを局所化する。
- 適用判断は「何層あるか」でなく、守るgoal、予想される変更、boundary testで観測する。

---

### API Design Patterns — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/api-design-patterns.md`

#### 目的

consumerとproviderの独立変更を支える安定した契約を作り、再試行、失敗、並行更新、pagination、evolutionを予測可能にする。

#### 解決する問題

- resource/operationの意味、error、null、time、identifierがendpointごとに揺れる。
- timeout後の再試行で二重処理が起き、clientが成功/失敗を判断できない。
- collection増大や並行更新でoffset paginationと全件responseが破綻する。
- version/evolution方針がなく、provider変更がconsumerを突然壊す。

#### 適用条件

- 複数client/team/organizationが独立releaseで同じservice boundaryを利用する。
- network failureとretryが通常事象で、operation結果の重複や不明状態を制御する必要がある。
- contractの長期互換性とobservabilityが局所的な実装簡潔性より重要。

#### 非適用条件

- 同一process内のprivate callで、network boundaryや独立versioningが存在しない。
- hard real-time stream、双方向session、巨大event flowなど、request/response RESTが問題形状に合わない。
- 単純CRUD表面化がdomain invariantを迂回させる場合。use-case operationまたは別interaction modelを選ぶ。

#### トレードオフ・失敗モード

- version、idempotency ledger、schema governance、compatibility testに運用費がかかる。
- 「名詞URL」だけ守ってtransaction、authorization、error semanticsを設計しない表層RESTになる。
- offset paginationは簡単だが大規模/更新中datasetで遅延・重複・欠落を起こす。
- idempotency keyのscope/TTL/payload bindingが曖昧だと、別requestを誤って同一視する。
- breaking changeを新versionで逃がし続けると、複数version保守とsecurity patch負担が増える。

#### goalへの寄与

- mobile/web/desktop間で一貫したbusiness capabilityを共有し、platform別再実装を減らす。
- reliability goalにはretry-safe operationと明示的error、delivery goalにはcontract testとadditive evolutionを結ぶ。
- 選択はAPI様式の流行でなく、consumer、latency、consistency、offline、security、cost constraintsへの適合で評価する。

---

#### 本章での適用

##### 確定内容 qa-337 (対応セル: web)

- 確定要件: 「[appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 …」 (全文は本章「確定内容 (質疑録)」の `qa-337` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: クライアントが守った前提をサーバで再検証する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 上限をクライアントの切り詰め処理だけに置くと、実装ミスや改造された要求で無制限の診断が保存される。受入時に 32KB を検証し、畳み込みもサーバで冪等に通すことで、保存済みデータの性質を要求元に依存させない。
  - トレードオフ:
    - 同じ畳み込み処理がクライアントとサーバの双方に要る。共有可能な純関数として 1 箇所に置き、実装の二重化は避ける
    - 境界ちょうどの要求が 413 になる。上限に余裕があるため通常の投稿では起こらない
- 原則: 一覧表現と詳細表現を分け、一覧に重い項目を含めない (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/api-design-patterns.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 管理者の主な操作は一覧を眺めて対象を選ぶことであり、その時点で必要なのは診断の有無と規模だけである。一覧で本体を返すと最悪 1.6MB の応答になり、選ぶだけの操作に本体の転送コストを毎回払う。
  - トレードオフ:
    - 詳細表示で 1 往復増える。一覧の応答が 2 桁小さくなる利益が上回る
    - 一覧に出せる情報がサマリに限られる。件数と truncated が分かれば開くべきかの判断には足りる
- 原則: 一括操作は、全体の成否ではなく要素ごとの結果を返す (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/api-design-patterns.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 20 件の送信で 1 件が GitHub 側の一時障害で落ちたとき、全体を失敗として返すと管理者は何が反映されたか分からず、再実行すべきかも判断できない。行ごとに created / updated / skipped / failed と理由を返せば、失敗行だけを選び直して再送できる。
  - トレードオフ:
    - HTTP の状態コード 1 つでは結果を表現できず、本体の配列を読ませる必要がある。管理画面という単一の呼び出し元しかないため負担にならない
    - 途中失敗時に処理済みと未処理が混在する。各行の結果が現在値から導出されるため、再実行しても二重に反映されない
- 原則: 境界違反は部分的に無視せず、要求全体を拒否する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 一括送信の ID 配列に他社の行が混じったとき、その行だけを黙って除外すると、結果配列の欠落から他社行の存在を推測できる。要求全体を 403 で拒否すれば、存在の有無が応答から漏れない。
  - トレードオフ:
    - 選択のどこかに古い ID が 1 つ混じっただけで全体が失敗する。管理画面は自社の一覧からしか選べないため、正常な操作では起こらない
- 原則: 取り消せる操作と取り消せない操作を、別の操作として分ける (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 誤投稿の片付けと実体の抹消を 1 つの「削除」に束ねると、日常的に使う前者の勢いで後者を実行してしまう。廃棄は行を残して復帰でき、削除は provider-admin が廃棄済みに対してだけ行える 2 段構えにすることで、取り返しのつかない操作へ到達するまでに必ず 1 段挟まる。
  - トレードオフ:
    - 誤投稿を消すのに 2 操作が要る。廃棄した時点で既定の一覧から外れるため、日常の運用は廃棄だけで完結する
    - 廃棄済みの行が溜まる。保持期間による削除が対象に含めることで自然に減る
- 原則: 秘密情報を通す経路を増やさない (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 画像・診断ファイルの commit をクライアントから直接行わせると、GitHub の contents 書込み権限をブラウザへ渡すことになる。appr-063 の方式では必要権限が Issues: Read and write に加えて Contents: Read and write まで広がるため、渡した場合の影響は Issue の改変にとどまらずリポジトリの改変に及ぶ。トークンを Cloudflare Workers Secret に閉じ込める方針と両立させるため、commit はサーバ側からのみ行う。
  - トレードオフ:
    - 画像がサーバを 1 往復する分だけ起票処理が重くなる。起票は投稿ごとに 1 回の稀な処理であり許容する
    - commit 失敗時に本文だけが先に立つ状態が生じる。contents API は 1 リクエスト 1 ファイルで、2 ファイルのうち片方だけ成功することもある。pending_retry で追いつかせ、要望自体が届かない事態を避ける
- 原則: 自分の側で消した情報を、外部の複製から到達できないようにする (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `not_applicable`
  - 章固有の根拠: appr-061 Q2 でスクリーンショットと診断を GitHub 側へ出す決定が下り、黒塗りは任意・リポジトリ可視性は不問と定められた。さらに appr-063 で、公式 API に Issue 添付が存在しないことを受けて Contents API による repository への commit 方式が選ばれた。commit した画像と診断ファイルは git 履歴に永久に残り、削除 commit を積んでも履歴からは消えないため、この原則は GitHub へ出したものに対しては成立しない。適用できないことを not_applicable として明示し、成立しているかのように書かない。
  - トレードオフ:
    - 要望を削除しても、GitHub リポジトリへ commit した画像は git 履歴に残り、要望 ID から決まる raw URL や履歴上の blob から到達できる可能性が残る。削除 commit を積んでも履歴からは消えない。仕様として受け入れたリスク
    - 代替の防護 (黒塗り必須化・private 限定) は利用者が明示的に選ばなかったため張らない。投稿時の注意喚起文言のみを残す
##### 確定内容 qa-280 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 「TypeScript 統一を採用。Publisher core は TypeScript (Node + pnpm) で新規実装し、Claude Code / …」 (全文は本章「確定内容 (質疑録)」の `qa-280` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: Ports and Adapters / DIP (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の『Publisher core は TypeScript (Node + pnpm) で新規実装し、Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する』の部分へ効く。core が担う package 収集・manifest 補完・ローカル pre-check は配布形態から独立した純粋な処理で、slash command / skill / スクリプトという 3 つの起動面はいずれも core を呼ぶ adapter にすぎない。この章で特に効く理由は、実行環境が Hub の Workers ランタイムではなく『作者の desktop』であり、同一の core を Hub API 呼出 (Device Flow 認証) と wrangler CLI 実行という性質の異なる 2 つの出口へ 繋ぐためである。出口ごとの分岐を core へ持ち込むと、desktop 側の都合による変更が Hub 側の 検査結果を動かす。代替案として『plugin の slash command 実装へ処理を直接書く』方式を検討したが、Claude Code と Codex という 2 系統の plugin 規約へ同じ処理を二重実装することになり、同じ回答が定める『検査ロジックは Hub 側と共有し二重実装を回避する』と正面から矛盾するため採らなかった。
  - トレードオフ:
    - core と adapter の境界型・mapping を維持する費用が生じる
    - 起動面が 1 つしか無い段階では adapter 層が過剰設計に見える
- 原則: Appropriate abstraction / DRY (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-code.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の『検査ロジックは Hub 側 (Workers=JS) と共有し二重実装を回避する』の部分へ効く。同じ package 契約を Publisher (desktop / Node) と Hub (Workers / JS) の双方が検査するため、規則が二重実装されると『ローカル pre-check は通ったが Hub で弾かれる』という、作者から見て 原因が特定できない失敗が生じる。TypeScript 統一を採った理由はここにあり、言語を揃えること自体が 目的ではなく、検査規則を 1 つの成果物として共有できることが目的である。代替案として 『Publisher を既存 Python 資産のまま維持し、検査規則だけを JSON schema 等の宣言的形式で共有する』方式を検討したが、package 契約の検査には条件分岐を伴う手続きが含まれ宣言形式へ完全には落とせず、落ちない部分が結局二重実装として残るため採らなかった。
  - トレードオフ:
    - 共有境界の変更が Publisher と Hub の双方へ同時に波及する
    - 偶然似ているだけの処理まで統合しないための継続的な見極めが要る
- 原則: Executable examples (移植の同値検証) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/test-strategy.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の『既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) は仕様の正本 (移植元) として参照し、挙動同値性をテストで担保して TypeScript へ移植する (C3 整合)』の部分へ効く。移植は新規実装と異なり『正解が既に動いている』状態であり、期待値を人が書き起こすと、その書き起こしの誤りがそのまま仕様の劣化として定着する。したがって検証は Python 実装と TypeScript 実装へ同一入力を与えて出力を突き合わせる同値テストとし、期待値の出所を人の解釈に置かない。代替案として『TypeScript 側に新規のテストを書き起こす』方式を 検討したが、移植漏れは書き起こした範囲の外側で起きるため定義上検出できず採らなかった。
  - トレードオフ:
    - 移植期間中は Python と TypeScript の両実装を保守する必要がある
    - 同値テストは既存実装の誤りまで正解として固定するため、既知の不具合は移植前に切り分ける必要がある
- 資するゴール: G1, G2, G5, G3

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| zod | 4.4.3 | Zod maintainers (Colin McDonnell) (zod.dev) | https://zod.dev/ | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
| resend | 2026-08-07 (取得日。ページ内に明示の更新日なし) | Resend, Inc. (resend.com) | https://resend.com/pricing | 2026-08-15T01:35:54Z | 2026-08-15T01:35:54Z |
| github-issues-api | 2026-08-16 (取得日。WebSearch 経路のためページ本文の更新日表示は未確認) | GitHub, Inc. (docs.github.com) | https://docs.github.com/en/rest/issues/issues | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
| github-contents-api | 2026-08-16 (取得日。WebSearch 経路のためページ本文の更新日表示は未確認) | GitHub, Inc. (docs.github.com) | https://docs.github.com/en/rest/repos/contents | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
