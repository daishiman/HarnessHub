---
status: confirmed
category: frontend
aggregate: 確定
spec_cells: [frontend.web, frontend.mobile, frontend.tablet, frontend.desktop-windows, frontend.desktop-linux, frontend.desktop-macos]
serves_goals: [G1, G2, G5, G6, G7]
---

# フロントエンド (frontend)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-252 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザ表示は web 行のレスポンシブでカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザ表示は web 行のレスポンシブでカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-257 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-257 |

## 確定内容 (質疑録)

### qa-252 (対応セル: web)

**質問**: クライアント側の診断収集を、どの単位でどこまで有界にするか (収集時の上限・畳み込み・切り詰め順序)。

**回答**: [技術的具体化] qa-234 で確定した収集項目 (console error/warn、未捕捉例外、失敗した network request、viewport/DPR/theme、route pattern、build 版数、直近 navigation) は変えず、保持の仕方だけを次のとおり有界にする。

(a) リングバッファ — 収集はページ読込時から常時走るため、無制限に貯めると長時間開いたままの画面でメモリを食う。console 系は直近 50 件、失敗 network request は直近 30 件、navigation は直近 3 件のリングバッファに固定する。溢れた分は古いものから捨てる。

(b) 指紋による畳み込み — 同一原因の反復を件数で潰さない。console 系は (level, message の先頭 200 文字, stack の先頭 1 フレーム) を指紋として畳み、network は (method, route pattern, status) を指紋として畳む。各グループは count・first_at・last_at を持つ。React の再描画ループのように同じ error が数百件出る場合、生の 50 件は同じ内容の羅列になるが、畳めば 1 グループ + count=数百 として原因を保ったまま 1/50 以下になる。

(c) 1 件あたりの切り詰め — message は 1,000 文字、stack は先頭 5 フレーム、失敗 request の response body は保持しない (状態コードと route pattern だけ)。network の URL は query string を落として route pattern へ正規化してから記録する。長い body や query を抱えないことは、そのまま個人情報の巻き込み防止にもなる。

(d) グループ数の上限 — 畳んだ後で console 系 30 グループ、network 20 グループを上限とし、超過分は count 降順・last_at 降順で上位を残す。

(e) 総量上限と削り順 — 送信直前に JSON 化してバイト数を測り、32KB を超える場合は次の順で捨てる: 1) navigation 履歴 2) warn グループの last_at が古い順 3) network グループの last_at が古い順 4) error グループの last_at が古い順。環境情報 (viewport/DPR/theme/route pattern/build 版数/UA) と error グループの最新 3 件は捨てない中核とし、ここまで削っても 32KB に収まらない場合はそのまま送る (中核だけで 32KB を超えることは実際上起きないが、中核を削る分岐を作らないことで「削りすぎて原因が分からない診断」が生まれる余地をなくす)。

(f) 捨てた記録 — 切り詰めた場合は truncated=true と、種別ごとの dropped_count を診断 JSON に持たせる。管理者が「これで全部か」を判断できないまま読むことのほうが、情報が足りないことより害が大きい。

本文入力は 2,000 文字、注釈は 1 画面あたりの図形数 100 を上限とし、いずれも入力時点で止める。送信してからサーバに弾かれるより、書いている最中に上限が見えるほうが投稿者の手戻りが小さい。

### qa-257 (対応セル: desktop-windows, desktop-macos)

**質問**: デスクトップ環境 (macOS / Windows) の frontend は何を正本とするか? (C05 監査指摘への対応: frontend.desktop-windows/desktop-macos の qa_ref=qa-007 は Hub Web 全体の構成を述べた回答で、desktop 固有の裏付けが薄い。infrastructure が qa-043 で行った『既確定内容の desktop 専用集約』と同型の是正であり、新規決定は含まない)

**回答**: 既確定の qa-007 / qa-010 / qa-234 / qa-252 の desktop 該当部分を frontend.desktop の専用正本として集約確定する。

(1) クライアント形態 (qa-007 / qa-010) — 専用の desktop GUI アプリケーションは作らない。macOS / Windows の利用者が触れるのは、desktop ブラウザ (Chromium 系 = Chrome / Edge、および macOS の Safari) で開く同一の Next.js App Router クライアントである。desktop 向けに別のコード経路・別のビルド成果物を持たず、web と同じ bundle を配信する。したがって frontend.desktop は『web の構成を desktop ブラウザで成立させる条件』を正本とし、独立した実装層を持たない。

(2) 作者向けクライアント (qa-010) — 作者 (Publisher) の操作面は Claude Code / Codex の plugin (slash command + skill + スクリプト) であり、Hub の frontend ではない。desktop 上で動く作者向け GUI を frontend の責務に含めない。

(3) 改善要望ウィジェットの desktop 成立条件 (qa-234 / qa-252) — 右下常設ボタンとウィジェットは、desktop ブラウザで次を満たす。(a) modern-screenshot の domToCanvas は Chromium 系と Safari の双方で SVG foreignObject 経路が動作することを Stage 0 で確認し、動作しない環境では撮影を伴わない投稿へ縮退する (投稿そのものは落とさない)。(b) desktop は画面幅が広く、ウィジェットを画面全体に被せる必要がない。注釈エディタは中央のダイアログとし、背後の業務画面が見える配置にする (投稿者が元画面を見ながら書ける)。(c) 診断情報の収集 (console / network / navigation のリングバッファ) は実行環境に依存しない Web API のみを使い、desktop 固有の分岐を持たない。

(4) 対象ブラウザと最低バージョン — 業務利用の実態に合わせ、Chromium 系と Safari の各最新 2 メジャーを対象とする。これを外れた環境では、ウィジェットの読み込み自体を行わず業務画面の動作を妨げない (改善要望は業務の付随機能であり、その失敗が本体を壊してはならない)。

(5) desktop-linux — 対象外の既存判断 (作者環境および利用者環境が macOS + Windows) を維持する。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| presentation | Apple Human Interface Guidelines | 画面設計・操作フロー・情報階層・アクセシビリティの上流原則 | https://developer.apple.com/design/human-interface-guidelines |
| application-architecture | Robert C. Martin — Clean Architecture | レイヤ境界・依存方向 (内向き)・ユースケース中心設計 | Clean Architecture (2017), the Dependency Rule |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

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

#### 本章での適用

##### 確定内容 qa-252 (対応セル: web)

- 確定要件: 「[技術的具体化] qa-234 で確定した収集項目 (console error/warn、未捕捉例外、失敗した network request、viewpor…」 (全文は本章「確定内容 (質疑録)」の `qa-252` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: 無制限に増える資源には、収集の入口で固定の上限を置く (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 診断収集はページを開いている間ずっと走る。上限を送信時のバリデーションだけに置くと、送信するまでの間にクライアントのメモリを無制限に消費し、そもそも改善要望を出したい不安定な画面ほど先に重くなる。リングバッファで入口を有界にする。
  - トレードオフ:
    - バッファ長を超えた古い事象は失われる。改善要望は「今この画面で困っている」時点で出されるため、直近が残れば目的を満たす
    - 常時収集のためのフックが全画面に載る。件数上限があるので処理コストは一定に収まる
- 原則: 量の削減を、情報の削除ではなく同一物の集約で行う (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/information-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 同じ error が 300 回出ていることは、1 回出ていることとは異なる事実であり、単純に上位 N 件へ切ると『何回起きたか』という一番強い手掛かりが失われる。指紋で畳んで count を残せば、バイト数は 1/50 以下にしながら反復という事実は保てる。
  - トレードオフ:
    - 指紋が粗いと別原因が同一グループへ混ざる。message 先頭 200 文字と stack 先頭フレームを含めることで、同一発生源かどうかは区別できる粒度にする
    - 畳み込み処理をクライアントで行うぶん実装が増える。サーバ側で畳むと畳む前の生データを送ることになり、削減の目的を果たさない
- 原則: 劣化させる順序を明示し、最後まで残す中核を決める (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/site-reliability-engineering.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 総量上限に当たったときに何から捨てるかを実装者の裁量に任せると、画面や端末によって届く診断が変わり、管理者は届いた内容が何を意味するのか判断できない。捨てる順序と、絶対に捨てない中核 (環境情報と直近 error 3 件) を仕様で固定する。
  - トレードオフ:
    - 極端な場合に navigation 履歴が常に落ちる。再現手順の推定材料としては route pattern と直近 error が主で、navigation は補助にとどまる
    - 中核を削らないため理論上は 32KB を超えて送られ得る。中核の実サイズは数 KB 程度で、上限を破る分岐を作らないことの利益が上回る
- 原則: 収集しないことを、最も確実な保護手段として使う (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: response body と query string は、量が膨らむ主因であると同時に、個人情報やトークンが最も混入しやすい場所でもある。route pattern へ正規化して body を保持しないことで、量の問題と混入の問題を同じ一手で閉じる。
  - トレードオフ:
    - 失敗レスポンスのエラーメッセージ本文が届かず、原因特定に往復が要る場合がある。状態コードと route pattern で切り分けの起点は足りる
    - query に載る検索条件などの文脈が失われる。管理者は画面名と route pattern から再現条件を尋ねられる
##### 確定内容 qa-257 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 「既確定の qa-007 / qa-010 / qa-234 / qa-252 の desktop 該当部分を frontend.desktop の専用正本として…」 (全文は本章「確定内容 (質疑録)」の `qa-257` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: 配信先の違いを、実装の分岐ではなく同一実装が満たすべき条件として扱う (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: desktop は別のクライアント種別ではなく、同じ Web クライアントを開く画面幅と入力手段の一組である。desktop 専用の実装層を作ると、同じ機能が 2 箇所で保守される。frontend.desktop の正本を『web 実装が desktop で満たす条件』として書くことで、実装の単一性を保ったまま desktop 固有の要求を明示できる。
  - トレードオフ:
    - desktop 固有の最適化 (ネイティブなキーボード統合など) を諦める。業務画面から要望を出すという用途に対しては過剰であり、失うものは小さい
    - 条件として書くため、検証は実装ではなく動作確認に寄る。対象ブラウザを 2 メジャーに限定して検証範囲を有界にする
- 原則: 付随機能の失敗が主機能を巻き込まないようにする (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/usability-accessibility.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 改善要望ウィジェットは全 44 業務画面に載る。対象外ブラウザや撮影 API の不成立でウィジェットが例外を投げると、業務画面そのものが壊れる。読み込み自体を行わない、あるいは撮影なしへ縮退するという 2 段の退避を desktop の成立条件へ明示する。
  - トレードオフ:
    - 縮退時に投稿の情報量が落ちる。投稿できないより望ましい
    - 退避経路の分だけ検証項目が増える。対象ブラウザを限定しているため件数は有界である
- 原則: 利用可能な画面領域に応じて情報の配置を変える (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/information-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: desktop は画面幅が広く、注釈作業中に元の業務画面を見られる。全画面を覆う配置は狭い画面での妥協であり、desktop でそのまま使うと、投稿者は何について書いているかを見失う。中央ダイアログ配置を desktop の条件として固定する。
  - トレードオフ:
    - web と desktop で見え方が変わる。同一実装のレスポンシブな分岐で吸収でき、コード経路は分かれない
- 資するゴール: G1, G2, G5, G6, G7

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| nextjs | 16.3.1 | Vercel, Inc. (nextjs.org) | https://nextjs.org/docs | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
| nextjs-proxy | 16 (改名は 16.0 で導入。middleware.ts は deprecated) | Vercel, Inc. (nextjs.org) | https://nextjs.org/docs/app/guides/upgrading/version-16 | 2026-08-15T01:35:54Z | 2026-08-15T01:35:54Z |
| modern-screenshot | 4.7.0 | qq15725 (modern-screenshot maintainers) (github.com) | https://github.com/qq15725/modern-screenshot | 2026-08-15T00:15:16Z | 2026-08-15T00:15:16Z |
