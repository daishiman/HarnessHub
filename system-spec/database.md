---
status: confirmed
category: database
aggregate: 確定
spec_cells: [database.web, database.mobile, database.tablet, database.desktop-windows, database.desktop-linux, database.desktop-macos]
serves_goals: [G2, G4, G5]
---

# データベース (database)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-334 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアントを作らないためモバイル固有の永続化なし |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアントを作らないためタブレット固有の永続化なし |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |

## 確定内容 (質疑録)

### qa-334 (対応セル: web)

**質問**: GitHub Issue 出口の前提で、改善要望の永続化の形をどう確定するか。

**回答**: [appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 API」は発想ごと撤回し、Issue は人間が読む従来型の不具合・要望票として書く。Claude Code から改善へ繋ぐ導線は独自 API ではなく既存の gh CLI (gh issue list / gh issue view) が担う。

[appr-061 Q2 / appr-063 で変わった点] スクリーンショットと診断情報を GitHub 側へ出す。appr-048 以前の設計 (qa-255(b)3) は「画像の所在として管理画面の詳細 URL だけを載せ、実体は認可の内側に置く」だったが、これを改める。対応する側が Issue だけを見れば状況を再現できる状態を優先する。ただし GitHub は Issue への画像添付を公式 API として提供していない。公式ドキュメントが案内するのはブラウザ UI からのドラッグ&ドロップだけで、ブラウザが内部で使う uploads.github.com / user-attachments は文書化されていない経路である (https://docs.github.com/en/rest/issues/issues, https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files を 2026-08-16 に確認)。したがってサーバ側から「添付」する公式手段は存在しない。appr-063 で利用者が選んだ実現方法は **GitHub Contents API で対象リポジトリへ画像と診断ファイルを commit し、その raw URL を Issue 本文へ Markdown の画像参照・リンクとして書く** ことである。保存先 path は要望 ID から決まる固定形 `improvement-requests/<要望 ID>/screenshot.png` および `improvement-requests/<要望 ID>/diagnostics.json` とする。以降この章で「添付」と書く場合は、この commit + 本文参照を指す。

[Q2 / appr-063 の帰結として利用者が選択した扱い] 黒塗り (マスキング) は任意のままとし、未黒塗りでの送信を止めない。改善要望を上げる GitHub リポジトリの可視性も仕様では制約しない。したがって次の 3 点は仕様として受け入れたリスクであり、隠さず記録する: (i) 44 の業務画面の中身が黒塗りされないまま GitHub 側へ出る投稿が一定数生じうる。(ii) commit した画像と診断ファイルは対象リポジトリの git 履歴へ永久に残る。ファイルを削除する commit を積んでも履歴からは消えないため、qa-255(k) が持っていた「自分の側で消した情報を外部の複製から到達できないようにする」原則は、GitHub へ出したものについては成立しない。削除時に本文の差し替えとファイル削除 commit は行うが、履歴からの消去は保証しない (履歴の書き換えはリポジトリ全体に影響するため、仕組みとしては用意しない)。(iii) Hub が保持する GitHub トークンは、Issue の起票・更新に加えて対象リポジトリの contents 書込み権限を要する。トークンが漏れた場合の影響は Issue の改変にとどまらず、リポジトリの改変に及ぶ。権限は対象 1 リポジトリに限定し、Cloudflare Workers Secret から出さないことで抑える。なお raw URL の到達範囲はリポジトリの可視性に従い、public なら誰でも閲覧でき、private ならリポジトリへの権限が要る。可視性を仕様で制約しないという appr-061 の選択は維持する。

[復元元] appr-048 以前の qa-254 の内容を正本として戻す。指示文 API 前提の列 (配信 ID・指示文ハッシュ等) は導入されなかったものとして扱い、issue_number を持つ体系へ戻す。

(a) 列の分離 — 診断本体は improvement_requests 本表とは別の 1:1 の子表 (improvement_request_diagnostics) に置き、本表には持たせない。本表の 1 行を 32KB 太らせると、一覧の索引走査やソートで診断を読まないクエリまでページ読み込みが増える。D1/libSQL は行単位で読むため、太い列を本表に置くことは一覧性能に直接効く。

(b) サマリの非正規化 — error グループ数・warn グループ数・失敗 request グループ数・総 count・truncated・診断バイト数は本表の列として持つ。一覧の表示と絞り込みに使うため、子表への join を一覧の必須経路にしない。非正規化した値は投稿時と管理者による診断再取得時にのみ書かれ、他の経路からは更新されない。

(c) 上限の宣言 — 診断列は 32KB を超えない前提だが、DB 側にも CHECK 相当の長さ検証を置く。アプリの検証を通らない経路 (migration や手作業の修正) で上限を破ったデータが入ることを防ぐ。

(d) 一覧索引 — 一覧の既定並び (作成日時降順) と絞り込み (会社・状態・種別・route pattern) に対応する複合索引を張る。qa-250 で確認したとおり D1 の課金は走査行数で決まるため、索引の無い列で絞り込むと返す行が少なくても走査行数が膨らむ。

(e) 画像 — R2 のオブジェクトキーとバイト数・寸法だけを DB に持ち、実体は入れない。appr-061 Q2 / appr-063 により対象リポジトリへ commit するため、commit 済みかどうかを示す列 (github_asset_committed_at) を加える。commit 先の path と raw URL は保存しない。いずれも要望 ID から一意に決まる固定形であり、保存しても導出できる値を二重に持つだけになる。加えて、削除しても DB 側から到達経路を残すことになり、削除記録と矛盾する。到達可能性が残ること自体は Issue 本文と git 履歴に現れるため、DB で持つ意味がない。更新時に必要な blob sha も保存しない (commit 直前に Contents API から GET する。保存すると、リポジトリ側で人手が入ったときに DB の値が黙って古くなる)。

(f) Issue 同期のための列 — github_issue_number、github_issue_body_hash (最後に GitHub へ反映した本文の正規化ハッシュ)、body_hash_current (現在の内容から導出した本文ハッシュ。body・handled_note・種別・状態・診断サマリのいずれかを更新するたびに同じ書込みの中で再計算する)、github_synced_at、github_sync_state (値に sending を含む)。一覧の Issue 状態列は、github_issue_number の有無と 2 つのハッシュの比較だけで表示でき、追加の問い合わせを要しない。

(g) 廃棄・削除のための列と状態値 — status の CHECK 制約を open / doing / done / dropped / discarded の 5 値へ広げる。dropped (見送り: 要望としては妥当だが対応しない) と discarded (廃棄: 要望として成立していない。誤投稿・重複・テスト投稿) を別の値にするのは、両者で運用が違うためである。見送りは実装判断の記録として一覧に残す価値があり、廃棄は既定の一覧から外したい。同じ値にすると、既定ビューの定義がどちらかを犠牲にする。
加えて discarded_at / discarded_by_id / discard_reason、deleted_at / deleted_by_id / delete_reason、duplicate_of_id (重複を理由に廃棄したときの重複先。同一 tenant 内の要望 ID への自己参照) を持つ。理由列は状態と同じ書込みで必ず埋め、空文字を許さない。

(h) tombstone — 削除された行は物理削除せず、body・handled_note・shot_key・route 情報を NULL 化し、診断の子表の行を消したうえで deleted_at を立てる。id・code・tenant_id・作成日時・削除記録・github_issue_number は残す。物理削除すると、既に発番された表示用 code が欠番になった理由を後から追えず、Issue から辿ってきた管理者が「そんな要望は無かった」と誤解する。既定の一覧は deleted_at IS NULL かつ status != 'discarded' で絞り、廃棄済みと削除済みは専用のビューでのみ見る。

(i) 索引の追随 — (tenant_id, workspace_id, status, updated_at) は deleted_at を含む形へ広げる。既定の一覧が deleted_at IS NULL を必ず条件に持つため、索引に含めないと削除済みを含む全行の走査になる。

(j) 保持 — 種別別削除方針を維持する。対応済み・見送りから一定期間を過ぎたとき、診断は request のみ削除して bug は残す。削除は子表の行を落とす形で行い、本表の行とサマリ列は残す。過去に診断があったこと自体は履歴として意味があるため、サマリは残して本体だけを消す。

(k) マルチテナント — 全ての表に tenant_id を持たせ、会社境界の強制は UI ではなく API とクエリで行う (G4)。一括操作の ID 配列に対する検証も tenant_id の一致で行い、アプリ層の分岐に依存しない。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| data-access | Robert C. Martin — Clean Architecture | 永続化を境界の外側へ追い出し interface adapter で隔離する | Clean Architecture — gateways/repositories boundary |
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |

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

### Cloud Architecture Patterns — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/cloud-architecture-patterns.md`

#### 目的

マネージドなクラウド基盤 (オブジェクトストレージ・リレーショナル/KV ストア・エッジ実行環境・キュー) を組み合わせるとき、データの配置・整合性の境界・劣化の順序を、後から検証できる根拠とともに決める。

#### 解決する問題

- 大容量バイナリを DB 行へ格納し、本文を必要としない一覧クエリまで巨大な行の読み出しに巻き込む。
- 複数のマネージドサービスに跨る書込みを、暗黙に原子的だと仮定して整合性の破れを設計外に置く。
- 障害時に何を先に諦めるかが未定義で、劣化の仕方が実行環境や実装者ごとにばらつく。
- 署名や認可を通さない公開 URL でバイナリを配信し、識別子の漏洩がそのまま内容の漏洩になる。
- サービス固有の制約 (実行時間・ペイロード上限・同時実行) を非機能要件として書き出さず、規模が伸びた時点で設計をやり直す。

#### 適用条件

- マネージドな複数サービス (ストレージ・DB・実行環境) を組み合わせ、単一トランザクションで閉じない書込みがある。
- 利用者が生成するバイナリ (画像・添付) を保存し、その一覧や検索を別途提供する。
- 実行環境に明示的な資源上限があり、超過が機能の失敗として現れる。

#### 非適用条件

- 単一ノード・単一 DB で完結し、外部ストレージを持たない構成に、跨る書込みの補償設計を先行導入しない。
- バイナリが小さく件数も限られる場合 (例: 数 KB のアイコン数十件) に、参照の間接化による往復増を払わない。
- 基盤が既に保証している性質 (オブジェクトストレージ側の耐久性・多重化) を、自前の複製で二重化しない。

#### トレードオフ・失敗モード

- バイナリを外へ出すと、DB とストレージが別系になり原子性が失われる。書込み順序の固定と孤児回収を設計に含めないと、参照切れが蓄積する。
- 冪等キーを導入すると、鍵の生存期間と保管場所という新しい状態が増える。期限設計を怠ると、正当な再投稿まで重複として捨てる。
- 認可を通す配信は CDN キャッシュを効きにくくする。閲覧者数が大きい経路にそのまま適用すると費用と遅延が悪化する。
- 制約を非機能要件に書いても、実測せずに数値を置くと「守っているつもり」の仕様になる。上限付近の実測を伴わない宣言は根拠にならない。
- 劣化順序を決めても、超過時の記録を残さないと、仕様どおり劣化したのか単に壊れたのかを事後に区別できない。

#### goalへの寄与

- データ配置の判断を、製品名ではなく「何が原子的か・何が検索対象か」という検証可能な性質へ還元でき、後から根拠を追える。
- 一覧の読み出し費用を保存量から独立させ、利用が伸びても管理画面の応答が劣化しない構造を先に確保する。
- 壊れる向きを事前に選ぶことで、障害時の復旧手順が「どちらが正か」を都度判断しない決定的な手順になる。

---

#### 本章での適用

##### 確定内容 qa-334 (対応セル: web)

- 確定要件: 「[appr-061 による再確定] 出口は GitHub Issue。appr-048 で導入した「Claude Code への指示文を配信する Hub 独自 …」 (全文は本章「確定内容 (質疑録)」の `qa-334` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: アクセス頻度と大きさが異なるデータを同じ表に混ぜない (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 一覧は全行を頻繁に読み、診断本体は特定の 1 行を稀に読む。同じ表に置くと、頻繁な読み取りが稀にしか要らない 32KB を毎回引き摺る。1:1 の子表へ分けることで、読み取り特性の違いを物理配置に反映する。
  - トレードオフ:
    - 詳細表示で join か追加クエリが 1 回要る。詳細は 1 行だけの操作なので影響は小さい
    - 投稿時の書込みが 2 表に分かれる。D1 batch による原子的保存の対象に子表を含めることで整合を保つ
- 原則: 集約の外へ出した値の更新経路を限定する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/ddd.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: サマリ列は子表の内容から導かれる冗長な値であり、任意の経路から書けると本体と食い違う。書込み経路を投稿時と診断再取得時の 2 つに限定し、それ以外からは更新しないことを不変則として決める。
  - トレードオフ:
    - 本体を直接編集した場合にサマリが古くなる。診断は投稿後に編集しない項目であり、編集経路自体を設けない
- 原則: コストの計上単位に合わせて設計する (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: qa-250 の一次資料照合で、D1 の rows read が返却行数ではなく走査行数で計上されることを確認している。絞り込み条件に索引が無いと、管理画面を 1 回開くだけで全行走査が計上される。
  - トレードオフ:
    - 索引の分だけ書込み時の rows written と storage が増える。読み取り側の削減が上回ることは一次資料でも明示されている
    - 主 DB は Turso であり D1 は退避先ヘッジのため、この計上規則は現時点では直接には効かない。移行時に設計を組み直さずに済むよう先に合わせておく
- 原則: 意味の違う結末を、同じ状態値に押し込めない (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/ddd.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 「対応しないと判断した」と「そもそも要望として成立していない」は、記録として残すべきかどうかも、一覧に出すべきかどうかも逆である。1 つの状態値にまとめると、既定ビューの定義がどちらかの運用を必ず壊す。
  - トレードオフ:
    - 状態値が 5 つに増え、画面の語彙と絞り込みの選択肢も増える。誤投稿の混入は実運用で必ず起きるため、区別しないほうの負担が大きい
    - 既存 feedbacks 表の 3 値からさらに離れる。qa-236 で既に揃えない判断をしており、方針は変わらない
- 原則: 消えた事実そのものを、消さずに残す (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-code.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 物理削除すると、発番済みの表示用 code が欠番になった理由を後から追えない。Issue から管理画面へ辿ってきた人には「最初から無かった」ようにしか見えず、削除されたのか権限で見えないのかも区別できない。抜け殻の行を残し、削除された事実と削除者を残す。
  - トレードオフ:
    - 行が完全には消えず、件数の集計に tombstone を除く条件が要る。既定の一覧が deleted_at IS NULL を必ず持つため条件は 1 箇所に集まる
    - 個人情報の完全消去を求められた場合に行が残る。Hub 側の本文・診断・画像は実体ごと消すが、GitHub リポジトリへ commit した画像は git 履歴に残る (appr-061 Q2 と appr-063 の帰結)
- 原則: 到達経路そのものを保存しない (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: commit したファイルの raw URL を DB へ保存すると、削除済みの行から画像へ到達する経路を自分の側で維持することになり、削除記録と矛盾する。GitHub へ出したという事実 (時刻) だけを持ち、path・raw URL・blob sha は持たない。raw URL は要望 ID から決まる固定形なので、必要なときは要望 ID から組み立て直せる。保存しないことで情報が失われるわけではなく、削除済みの行が到達経路を握り続けないようにするための選択である。
  - トレードオフ:
    - 管理画面から画像へ直接飛べない。Issue 番号から Issue を開けば本文に埋めた raw URL から辿れ、要望 ID から path が決まるので raw URL を組み立て直すこともできる。実務上の不足はない
- 原則: 自分の側で消した情報を、外部の複製から到達できないようにする (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `not_applicable`
  - 章固有の根拠: appr-061 Q2 でスクリーンショットと診断を GitHub 側へ出す決定が下り、黒塗りは任意・リポジトリ可視性は不問と定められた。さらに appr-063 で、公式 API に Issue 添付が存在しないことを受けて Contents API による repository への commit 方式が選ばれた。commit した画像と診断ファイルは git 履歴に永久に残り、削除 commit を積んでも履歴からは消えないため、この原則は GitHub へ出したものに対しては成立しない。適用できないことを not_applicable として明示し、成立しているかのように書かない。
  - トレードオフ:
    - 要望を削除しても、GitHub リポジトリへ commit した画像は git 履歴に残り、要望 ID から決まる raw URL や履歴上の blob から到達できる可能性が残る。削除 commit を積んでも履歴からは消えない。仕様として受け入れたリスク
    - 代替の防護 (黒塗り必須化・private 限定) は利用者が明示的に選ばなかったため張らない。投稿時の注意喚起文言のみを残す
- 資するゴール: G2, G4, G5

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| turso | 2026-08-07 (取得日。ページ内に明示の更新日なし) | Turso (turso.tech) | https://turso.tech/pricing | 2026-08-15T01:35:54Z | 2026-08-15T01:35:54Z |
| drizzle-orm | 0.45.2 (安定版) / 1.0.0-rc.4 (v1 プレリリース現行) | Drizzle Team (github.com) | https://github.com/drizzle-team/drizzle-orm/releases | 2026-08-15T00:15:16Z | 2026-08-15T00:15:16Z |
| cloudflare-d1 | 2026-08-16 (本文照合日。公式 MCP 経路のため、ページ本文が宣言する最終更新日の行は返却チャンクに含まれず取得できていない) | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/workers/platform/pricing/#d1 | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
