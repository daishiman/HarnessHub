---
status: confirmed
category: infrastructure
aggregate: 確定
spec_cells: [infrastructure.web, infrastructure.mobile, infrastructure.tablet, infrastructure.desktop-windows, infrastructure.desktop-linux, infrastructure.desktop-macos]
serves_goals: [G1, G2, G4, G5, G6]
---

# インフラ (infrastructure)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-250 |
| モバイル (mobile) | 対象外 | 理由: native モバイル向け配信基盤なし (ブラウザ経由提供) |
| タブレット (tablet) | 対象外 | 理由: native タブレット向け配信基盤なし (ブラウザ経由提供) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-281 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop 向け Publisher 配布は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-281 |

## 確定内容 (質疑録)

### qa-250 (対応セル: web)

**質問**: スクリーンショットの保存先と、容量と可読性の両立をどう確定するか (knowledge_ref 訂正を含む再確定)。

**回答**: [逐語] 「R2でOKです。できるだけ画像で情報を取らせ、容量オーバーにならないように、この辺ちょっと工夫はしておいてほしいです。ただし、文字が読めないぐらい解像度を低くするのはやめておいてください。」

[技術的具体化] 保存先は R2。既存 wrangler.jsonc に R2 bucket が 4 本あるので、5 本目として改善要望スクリーンショット専用の bucket binding を追加し、既存 bucket へ相乗りさせない (保持期間と削除方針が違うものを同じ bucket に混ぜると、片方の一括削除がもう片方を巻き込む)。DB には R2 オブジェクトキーとバイト数・幅・高さだけを保存し、画像実体を DB に入れない。参考実装は data URL を DB 列へ入れていたが、行サイズが肥大して一覧クエリまで重くなるため踏襲しない。

容量と可読性の両立: 長辺を 1600px まで縮小したうえで JPEG 品質を段階的に下げ、目標バイト数 (概ね 700KB) に収める。ただし長辺 1600px は下限として固定し、目標に収まらない場合でもこれ以上は縮小しない。文字が読めなくなった時点でスクリーンショットの目的 (どこが問題か伝える) が失われ、容量を節約した意味がなくなるため。品質下限に達しても目標を超える場合は、縮小せずそのまま保存し、管理側に「大きい画像」として記録する。

圧縮はブラウザ側 canvas で行い、サーバへは圧縮済みの 1 枚だけを送る。回線が細い端末で巨大な原寸画像を上げさせない。

オブジェクトキー: tenant / 年月 / 要望 ID から決定的に組み立て、再送で同じキーへ上書きされるようにする。キーに投稿者名や画面名の生文字列を入れない (キーが漏れたときに内容を推測させない)。

配信: 公開 URL を持たせず、認可を通す API route が R2 から取得してストリームする。Cache-Control は private とし、CDN へ載せない。

cron: 既存 Worker の日次 cron に、DB から参照されない孤児オブジェクトの回収を追加する。種別が request の要望については、対応完了から一定期間後に診断情報も削除するため、削除対象の判定は種別を見る。

### qa-281 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者デスクトップ環境 (macOS / Windows) の infrastructure (配布・実行基盤・ツールチェーン) は何を正本とするか? (C07 監査指摘への対応: infrastructure.desktop-windows/desktop-macos の qa_ref=qa-003 は Hub web hosting 中心の回答で desktop 固有の裏付けが薄い。既確定内容の集約による専用質疑化であり新規決定は含まない)

**回答**: 既確定の qa-003 / qa-010 / qa-034 / qa-039 / qa-041 の desktop 該当部分を infrastructure.desktop の専用正本として集約確定する。(1) 配布経路 (qa-003): Publisher / Skill の作者環境への配布は URL 型 marketplace (native source) または Bootstrap Installer の 2 経路を Stage 0 technical gate (H7) で検証し、成立した経路を採用する (一般利用者に GitHub アカウントを要求しない = I6)。(2) 実行形態 (qa-010): 専用 desktop GUI は作らず、Publisher core は TypeScript (Node + pnpm) で実装し Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する。target=web_app の出口は作者 local session での wrangler CLI スクリプト実行 (I5。Hub は URL 登録・公開範囲検査・health 確認のみ)。(3) ツールチェーン (qa-039): 作者/提供者環境は macOS 主・Windows 従で、Claude Code + pnpm (corepack 経由・他パッケージマネージャ禁止) + git + wrangler CLI。両 OS で同一の pnpm script が動作すること (パス区切り・改行コード・シェル依存をコマンドへ埋め込まない)。ローカルは preview 用 Turso または local SQLite を binding し production DB を指さない。production への deploy/migration の正本経路は CI (緊急時のみローカル + 事後記録)。(4) 資格情報基盤 (qa-041): Device Flow token は OS 資格情報域 (macOS Keychain / Windows Credential Manager) のみに保存。(5) 環境・binding の詳細正本は docs/infrastructure-spec.md (qa-034)、desktop 側の運用規律は dev-workflow (qa-039) と security (qa-041) の各確定に従属し、本 qa は infrastructure.desktop 行への接地点を提供する。

【本 entry の位置づけ (2026-08-15)】
本 entry は qa-043 を **回答本文について逐語で全面継承した自己完結版** である。第 4 回 completeness evaluator が medium finding (`design_knowledge_reflection`) として、legacy_backfill 経路 4 章 (backend / dev-workflow / infrastructure / testing-qa) の `design_applications` が『〜という責務分離に適用した』のように原則名の言い換えに留まり、dialogue 経路より具体性が低いと指摘した。writer (`set-qa-design-applications`) は完了済み backfill と異なる解釈の再適用を構造的に拒否するため、既存 entry を書き換える経路が無い。そこで reopen → 本 entry で再確定という正規経路を採る。
**変更したのは設計解釈 (`design_applications`) だけであり、上記の回答本文が定める要件は 一切変更していない。** 仕様章 (compile-spec-doc.py) は確定セルの現 qa_ref に対応する節だけを 出力するため、追補のみの entry で再確定すると基礎契約が章から消える。それを防ぐため本文を 丸ごと引き継いでいる (qa-216 / qa-217 と同じ方式)。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Site Reliability Engineering — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/site-reliability-engineering.md`

#### 目的

実行基盤・環境・リソースの構成を、目標信頼性 (SLO) と運用負荷の観点から選び、稼働中の状態を観測して是正できる形にする。

#### 解決する問題

- 目標信頼性が未定義のまま冗長化・監視を積み、費用と運用負荷だけが増える。
- 環境 (本番/検証/ローカル) の差分が人の記憶に残り、本番でのみ再現する障害が生まれる。
- 稼働中の構成 (環境変数・binding・シークレット) を外から確認できず、障害時に仮説を検証できない。
- 復旧手順が実行されたことのない文書として存在し、実際の障害時に機能しない。
- 手作業の運用 (トイル) が担当者に固定化され、人の交代で運用品質が落ちる。

#### 適用条件

- 利用者に対する可用性・遅延の期待があり、逸脱を検知して是正する責任を負う。
- 環境が複数あり (本番・検証・ローカル)、差分が事故要因になり得る。
- 観測・デプロイ・復旧を自動化する余地があり、運用担当が継続的に関与する。

#### 非適用条件

- 利用者も稼働期間も限定された使い捨て環境に、SLO 運用とエラーバジェット会計を先行適用しない。
- 実測データが無い段階で SLO を数値確定しない (暫定値であることを明示して観測から始める)。
- マネージド基盤が既に保証している性質を、自前の冗長化で二重化しない (責任分界点を先に確認する)。

#### トレードオフ・失敗モード

- SLO を高く置きすぎ、変更速度と費用を不必要に犠牲にする。
- 監視項目を増やすこと自体を目的化し、誰も見ないダッシュボードとアラート疲れを生む。
- Infrastructure as Code を導入しても本番へ手作業変更を許し、宣言と実体が乖離する (drift)。
- 復旧手順を一度も実行せず、実際の障害時に前提条件の欠落が判明する。
- 稼働中ビルドの素性を確認する手段を用意せず、「コードは直っている」と「本番が直っている」を区別できなくなる。

#### goalへの寄与

- 基盤選定の判断を、製品名の比較ではなく目標指標への寄与として記述でき、後から根拠を検証できる。
- エラーバジェットにより、機能追加と安定化の優先順位を都度の力関係でなく事前合意で決められる。
- 稼働実体の観測手段を要件に含めることで、障害の切り分け時間を短縮し、原因究明のラウンド数を減らす。

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

##### 確定内容 qa-250 (対応セル: web)

- 確定要件: 「[逐語] 「R2でOKです。できるだけ画像で情報を取らせ、容量オーバーにならないように、この辺ちょっと工夫はしておいてほしいです。ただし、文字が読めないぐらい解…」 (全文は本章「確定内容 (質疑録)」の `qa-250` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: 大容量バイナリを別系へ逃がし、DB にはメタデータだけを持たせる (関心の分離) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 画像を DB 行へ入れると、一覧クエリが本文だけを欲しいときでも巨大な行を読むことになり、要望が増えるほど管理画面が遅くなる。R2 にキーで逃がし、DB にはバイト数と寸法だけ残す。
  - トレードオフ:
    - R2 と DB が別系になり原子性が失われる。書込み順序を R2 先行に固定し、壊れる向きを孤児側へ寄せる
    - 詳細表示で 1 往復増える。認可を通す必要がありどのみち API 経由になるため実質の追加コストは小さい
- 原則: 劣化させる順序を明示する (graceful degradation の優先順位) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 容量目標と可読性が衝突したとき、どちらを犠牲にするかを実装者の裁量に委ねると端末や画面によって結果がばらつく。品質を先に落とし、長辺 1600px は下限として固定する順序を仕様で決める。
  - トレードオフ:
    - 情報量の多い画面では目標バイト数を超えたまま保存される。超過は許容し、記録して監視する
    - JPEG 化により文字の輪郭に圧縮ノイズが乗る。PNG 維持より可読性はわずかに落ちるが 1600px 下限で実用範囲に収める
- 原則: 推測不能な識別子と、署名なし公開 URL の禁止 (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: スクリーンショットには業務画面がそのまま写るため、キーが漏れただけで内容へ到達できてはならない。決定的だが内容を推測させないキーにし、配信は必ず認可を通す route を経由する。
  - トレードオフ:
    - CDN キャッシュが効かず閲覧のたびに Worker と R2 を経由する。閲覧者は管理者に限られ件数が小さいため許容する
##### 確定内容 qa-281 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 「既確定の qa-003 / qa-010 / qa-034 / qa-039 / qa-041 の desktop 該当部分を infrastructure.d…」 (全文は本章「確定内容 (質疑録)」の `qa-281` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: 環境の再現性 (Infrastructure as Code) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の【(3) ツールチェーン】が定める『両 OS で同一の pnpm script が動作すること (パス区切り・改行コード・シェル依存をコマンドへ埋め込まない)』と『ローカルは preview 用 Turso または local SQLite を binding し production DB を指さない』の部分へ効く。この章で特に効く理由は、desktop が CI と違って作者ごとに環境が異なり、しかも誰も観測していない場所だからである。そのため再現性を『同じ結果が出ること』ではなく『同じコマンドが同じ意味で動くこと』として 書き下す必要があり、pnpm を corepack 経由に固定し他パッケージマネージャを禁じる規定も、OS 差ではなく作者間の差を消すためのものである。代替案として『OS 別に script を分けて差異を吸収する』方式を検討したが、分岐が増えるほど片方だけが壊れたまま気づかれない期間が伸び、macOS 主・Windows 従という利用実態ではその期間が Windows 側に偏って長くなるため採らなかった。
  - トレードオフ:
    - shell 依存を排する制約により、書ける script の表現力が下がる
    - OS 固有の最適化を捨てるため一部の処理は遅くなる
- 原則: Secure defaults and usable security (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の【(4) 資格情報基盤】『Device Flow token は OS 資格情報域 (macOS Keychain / Windows Credential Manager) のみに保存』と、【(1) 配布経路】『一般利用者に GitHub アカウントを要求しない (I6)』の部分へ効く。両者は『安全な既定が使いにくければ迂回される』という同一の判断から出ている。Device Flow を選んだのは、作者に長命 secret を手で管理させないためであり、OS 資格情報域へ限定したのは、保存先を利用者の裁量に委ねた瞬間に最も手軽な場所 (repository 内の設定ファイル) が選ばれるためである。代替案として『.env や専用の設定ファイルへ 平文保存し権限を 600 にする』方式を検討したが、作者の repository 直下は git 管理下に入り得る場所で、`.gitignore` の書き漏れ 1 つが公開事故になるため採らなかった。
  - トレードオフ:
    - OS 資格情報 API ごとの adapter 実装と保守が必要になる
    - ヘッドレス環境や CI では別の安全な資格情報経路を用意する必要がある
- 原則: 本番への単一経路 (Deployment pipeline) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/continuous-delivery.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 本回答の【(3) ツールチェーン】『production への deploy/migration の正本経路は CI (緊急時のみローカル + 事後記録)』の部分へ効く。この章に固有の事情は、desktop に wrangler CLI が 入っている以上、本番へ直接到達できる手段が物理的に存在してしまう点である。そこで『禁止』ではなく 『正本経路を 1 つに定め、例外は事後記録を義務づける』形を採った。禁止にすると、障害時に手段を 封じられた作業者が結局それを使い、しかも使ったことが記録に残らないという最悪の状態になるためである。代替案として『production 資格情報を desktop から完全に排除する』方式を検討したが、復旧手段が CI の可用性へ完全に従属し、CI 自体の障害時に打つ手が無くなるため採らなかった。
  - トレードオフ:
    - ローカルからの本番操作という経路が制度上は残り続ける
    - 事後記録の実効性は運用の規律に依存し、機械的には強制しきれない
- 資するゴール: G1, G2, G4, G5, G6

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| cloudflare-workers | 2026-08-16 (本文照合日。公式 MCP 経路のため、ページ本文が宣言する最終更新日の行は返却チャンクに含まれず取得できていない) | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
| wrangler | 4.123.0 | Cloudflare, Inc. (github.com) | https://github.com/cloudflare/workers-sdk/releases | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
| cloudflare-r2 | Aug 7, 2026 | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/r2/pricing/ | 2026-08-15T00:14:15Z | 2026-08-15T00:14:15Z |
| opennext-cloudflare | 1.20.2 | OpenNext (OSS) (opennext.js.org) | https://opennext.js.org/cloudflare | 2026-08-15T00:15:16Z | 2026-08-15T00:15:16Z |
| opennext-cloudflare-env-vars | 1.20.2 (@opennextjs/cloudflare の現行版) | OpenNext (OSS) (opennext.js.org) | https://opennext.js.org/cloudflare/howtos/env-vars | 2026-08-15T01:35:54Z | 2026-08-15T01:35:54Z |
