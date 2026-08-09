---
status: active
layer: investigation-history
related_spec: "specs/harness-hub-post-signin-landing-observability-contract.md"
graph_node_id: "spec-post-signin-landing-observability"
updated_at: "2026-08-09"
title: "post-signin landing observability 詳細調査履歴 (1/3)"
part: 1
---

# post-signin landing observability 詳細調査履歴 (1/3)

正規 contract: [`specs/harness-hub-post-signin-landing-observability-contract.md`](../../../specs/harness-hub-post-signin-landing-observability-contract.md)。索引: [index](./landing-observability-investigation.md)。他パート: [part2](./landing-observability-investigation-part2.md) · [part3](./landing-observability-investigation-part3.md)。

## 0. この文書は何か

サインイン後に業務画面へ到達できず「稼働状況 / Hub の実行基盤が起動しています」だけが表示される不具合について、**なぜそうなっているのか**を追跡し、**同じことが再発したときに気付ける仕組み**を製品契約として固定する。

**原因は確定した (§2.10)。本番で動いていたビルドが、着地先を直した commit を含んでいなかった。**認証は成功しており、signin ページが送っていた戻り先 `/` へ正しく着地していた。是正はコード変更ではなく再デプロイに尽きる。

**それでも本書の主題は原因ではなく、原因を判別可能にする仕組みのほうである。** 1 回の GET と 1 行の grep で決まる事実の確定に 10 ラウンド以上を要したこと自体が、「稼働中のビルドがどの commit か」と「着地先が既定値へ後退した事実」のどちらも観測できない状態の代償である。§2.10 末尾の V6 / V2 / V7 がその是正にあたる。

先行する [Workspace スコープ導線 仕様追補](harness-hub-post-signin-workspace-scope-addendum.md) (2026-08-02 確定) は同じ症状を扱い、契約 A (サインイン済みで `/` に来たら着地先へ送る) を定めた。**その契約は実装済みだったが、症状は解消しなかった**。本書はその理由を扱う。

正本は `system-spec/spec-state.json` の qa-170〜qa-199 (原因の確定は qa-198、停止条件の緩和承認は appr-039)。本書はそれを実装計画が参照できる単一の仕様境界へ束ねたものであり、内容を複製せず要点と根拠を記す。

**独立監査の結果も本書に残す。** 完成度評価 (`system-spec/completeness-report.json`) の総合判定は **FAIL** である。内訳は「過去に起きた事実の記録」「plugin 側で直すべき課題」「実装工程でやる作業」のみで、ヒアリング工程の側に打てる手は残っていない (独立監査 C06 の 2 インスタンスが一致して確認)。この状態のまま以降の工程へ進む判断は利用者のものであり、appr-039 に逐語で保存してある。

## 1. 症状

| 観測 | 内容 |
|---|---|
| 入口 | `https://harness-hub.daishimanju.workers.dev/harness-hub/signin` でサインイン画面は表示される |
| 通過後 | `https://harness-hub.daishimanju.workers.dev/#main` に着地する |
| 表示 | 「稼働状況 / Hub の実行基盤が起動しています / 依存先を含む死活状態は /health で確認できます。」のみ |
| 期待 | ダッシュボードや詳細画面などの業務画面 |

URL 末尾の `#main` は `apps/hub/src/app/layout.tsx` のスキップリンク (`<a href="#main">本文へスキップ</a>`) の断片であり、症状とは無関係である。混乱の元になるため明記しておく。

## 2. 原因 (確定済み。本節には確定に至るまでの反証の経緯も残す)

> **本節の位置づけは調査の途中で 3 度変わった。** 当初は「原因を実測で特定した」と書き、次にその機序が**いずれも反証されて**未特定へ戻り、最終的に本番への 2 回の観測で確定した。確定した原因は §2.10 にある。**2.3〜2.6 に残した反証の経緯は削除していない。** 誤った推論そのものが、本文書が要求している仕組み (V2/V6/V7) の必要性の根拠だからである。特に 2.4「残っている候補」は、**そこに挙げた候補のいずれもが真の原因ではなかった**。消去法で絞り込んだ候補を観測せずに原因と呼ぶ危うさの実例として残す。

### 2.1 契約 A は実装されていた (この事実は変わらない)

`apps/hub/src/app/page.tsx` は、session 秘密が読めてかつ有効な session cookie があれば `DEFAULT_POST_SIGNIN_LANDING` へ redirect する。仕様どおりである。

着地先は `apps/hub/src/lib/routing/post-signin-landing.ts` の `DEFAULT_POST_SIGNIN_LANDING = '/sheets'` で、`src/app/(dashboard)/sheets/page.tsx` として**実在する**。すなわち「着地先が未実装だから飛べない」ではない。

### 2.2 認証の環境値は 3 箇所から独立に読まれている

このリポジトリには、Cloudflare Workers 上で環境値を読むための吸収層が既にある。

```
apps/hub/src/app/health/runtime-env.ts
  → @opennextjs/cloudflare の getCloudflareContext().env から読み、
    Workers ランタイム外では process.env へフォールバックする
```

`lib/tenant-data/runtime.ts` と `lib/publish/runtime.ts` はこの層を使っている。一方、**認証に関わる 3 箇所は吸収層を通らず `process.env` を直接読む**。

| 読み出し箇所 | 経路 | 失敗時の見え方 |
|---|---|---|
| `app/health/runtime-env.ts` | `getCloudflareContext().env` → fallback `process.env` | — |
| `lib/tenant-data/runtime.ts` | 同上 | — |
| `lib/publish/runtime.ts` | 同上 | — |
| **`middleware.ts:26-35`** | `process.env` 直読み。しかも **module 最上位** | provider を差さない = deny-all。理由は残らない |
| **`app/page.tsx`** | `process.env` 直読み | redirect せず稼働状況を表示。理由は残らない |
| **`lib/authz/runtime.ts:220`** | `authRuntime(source = process.env)` | 例外 → サインイン画面が「認証基盤が未結線です」を表示 |

3 つ目は調査の終盤で見つかった。**当初この文書は読み出し箇所を 2 箇所と書いていた。実装より狭い列挙であり、分類語彙で 8 回繰り返したのとまったく同じ型の誤りが、検査対象の列挙でも起きていた。**

### 2.3 反証された 2 つの機序

**機序 1 (撤回)**: 「Workers は secret を `process.env` へ供給しないため、投入済みでもゲート緑・`middleware` からは `undefined`」

反証: Cloudflare 公式 changelog (`2025-03-11-process-env-support`) により、`nodejs_compat` 有効かつ `compatibility_date` が 2025-04-01 以降なら `nodejs_compat_populate_process_env` が既定で有効になり、secret は **module 最上位を含む任意の scope** で `process.env` から読める。`apps/hub/wrangler.jsonc:12,14` は `compatibility_date: "2025-09-23"` / `compatibility_flags: ["nodejs_compat"]` であり、この条件を満たす。**この機序は本リポジトリでは成立しない。**

**機序 2 (撤回)**: 「Next.js の edge ビルドが `process.env.X` をビルド時にインライン化し、CI build 時点で未設定の値が `undefined` として焼き込まれる」

反証: `AUTH_SESSION_SECRET` を env から除いた状態で `pnpm run build:next` を実行し、生成物を直接確認した。

```js
// .next/server/src/middleware.js (実測)
let iz=process.env.AUTH_SESSION_SECRET,iA=process.env.AUTH_ACCESS_TOKEN_SECRET,...
```

**インライン化されず、実行時のプロパティ参照として残っている。** `.next/server/edge-runtime-webpack.js` にも `process` の shim は含まれない (1504 bytes、grep 0 件)。したがって `process` は host runtime のものであり、`nodejs_compat` の populate 対象になる。**この機序も成立しない。**

### 2.4 残っている候補 (いずれも本番の観測なしには判別できない)

1. **現在稼働している本番 Worker が deploy 時ゲートを通っていない版である** — 2026-08-02 より前の deploy、または手元からの `wrangler deploy` (2.9)
2. **isolate の再利用による stale 値の焼き付き** — 下記のとおり、機序としては**公式記述で成立が確認された**
3. **認証以外の原因** — 具体的には `tenants.status !== 'active'`。下記のとおり実体が特定された

**候補 2 について (qa-187)**: Cloudflare 公式 [Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) は、**binding だけを変更しコードを変更しない deploy では isolate が再利用されることがある**と明記し、env 由来の値を global scope のインスタンスへ保持すると「基盤の binding が変わっても stale な値のまま持続し得る」ことを名指しの anti-pattern として警告している。正しい形は「リクエストごとに新しいインスタンスを作る」ことである。あわせて [process ドキュメント](https://developers.cloudflare.com/workers/runtime-apis/nodejs/process/)より、lazy populate は `process` への**最初のアクセス時点**で一度きり行われ、投入有無を再評価しないことが確認できる。

`middleware.ts:26-35` は module 最上位で読んだ値から `authAdapter` を構築し module scope に保持する。module 最上位は isolate 起動ごとに 1 回しか評価されない。**この形は公式が警告している anti-pattern と構造的に一致する。** ある isolate が secret 未投入の時点で `process` に触れて `undefined` を populate すると、その後 secret を投入しても、その deploy が binding のみの変更であれば同じ isolate が再利用され、deny-all 版がそのまま使われ続ける。isolate が evict されるまで解消しない。

ただし**本番でこれが起きたとは断定しない**。断定するには当該 isolate の生成時刻と secret 投入時刻の前後関係という本番の実測が要り、本セッションでは取得していない。記録の強さは「機序として確認済み・実際の発生は未確認」である。

**候補 3 について (qa-188)**: `packages/db/schema/core/identity.ts:14` の `tenants.status` (`text('status', {enum: ['active','suspended']})`) が、`apps/hub/src/lib/auth/db-ports.ts:306-308` の `enabled: tenant.status === 'active'` を通じて `resolveTenantOidcConfig` の判定に使われている。同箇所のコメントは「停止中テナントは接続を解決させない。認証の入口で閉じる方が安全側」と述べている。

つまり **`status` が `suspended` であるだけで、秘密が正しく投入され正しく読めていても同じ症状になる**。この経路は秘密の投入状態と完全に独立している。「秘密を直せば直る」と決め打つと外し得る。候補 3 を候補 1・2 と同格で残す理由がここで具体化した。

### 2.5 本当の欠陥 (ここは反証されていない。むしろ強まった)

問題は縮退したことではなく、**縮退したことが誰にも分からないこと**である。エラーも 5xx も警告も出ず、正常に見える画面が返る。

`middleware.ts` の deny-all 自体は正しい設計である。実装のコメントが述べているとおり、「秘密が無いときは検証を飛ばす」実装にすると設定漏れがそのまま認証バイパスになる。**安全側に倒すこと自体は妥当**だ。

> 安全側の縮退は、観測できなければ静かな全面停止と区別がつかない。

**そして本セッションそのものが、この欠陥の実証になっている。** 公式文書を当たり、リポジトリを読み、ビルドを実行し、独立監査を 2 系統回してなお、私は「本番で何が起きているか」を言えていない。本番へ curl を打てないからではない。**打てたとしても、2.4 の 3 候補すべてで外から見える応答はほぼ同じになる**からである。3 経路とも安全側に倒れ、3 経路とも「どの名前が解決できなかったか」を残さない。

なお 3 経路のうち `lib/authz/runtime.ts` 経由だけは、サインイン画面に「認証基盤が未結線です」と表示する。ADR §10「認証基盤が未結線であることを画面上でも隠さない」の実装であり、同ファイルは in-memory 実装を本番へ差さない理由も「未結線が 200 応答で隠れる」と明記している。**この設計思想は既にリポジトリにある。** E-3 が求めているのは新しい思想ではなく、既にある思想を残り 2 経路へ及ぼすことである。

### 2.6 本セッションで確認できなかったこと

本番 URL への直接アクセス (curl) は本セッションで許可されなかった。したがって以下は**未確認**である。

- 本番環境で秘密が未投入なのか、投入済みだが解決できていないのか、そもそも認証以外が原因なのか
- 縮退がいつから発生しているのか

このため実装順序を **観測 (2.7 の E-3) を先、修正 (E-1 / E-2) を後** とする。原因が特定できていない以上、これは選択ではなく必然である。判別手段を持たないまま修正を入れると、直ったのか症状が別の形に移ったのかを区別できない。

### 2.7 契約

- **E-1 環境値の解決層を 1 つにする**。認証を含む全ての環境値読み出しは既存の吸収層を通す。認証だけが例外である理由は無い。
- **E-2 module 最上位で環境値に依存する構築をしない**。リクエスト context の外で確定させると、後から供給されても反映されない。根拠は 2 本ある: (a) Workers は request context 外の I/O を許可しない (公式)、(b) binding のみの deploy では isolate が再利用され、global/module scope に保持した env 由来の値は stale なまま持続し得る (公式が名指しで警告する anti-pattern・2.4 候補 2)。認証に関わる構築物は module scope に保持せず、リクエストごとに解決する。
- **E-3 縮退した事実と、どの名前が解決できなかったかを記録する**。値は決して記録しない (名前のみ)。記録の契機はリクエスト毎ではなく、解決状態が変化したときと、縮退中に拒否が起きたとき。どの environment で解決したかも記録する (値は記録しない)。記録は次の 6 つを**互いに区別できる形**で残す (qa-188-c):
  1. テナントが解決できない (slug 不一致)
  2. テナントは在るが `status` が `active` でない
  3. OIDC 接続が登録されていない
  4. 環境値が解決できない (**どの名前か**を記録)
  5. cookie が無い
  6. 署名検証に失敗した

  現状この 6 つが利用者から見てほぼ同一の出力へ潰れていることが、本 feature の欠陥の中身である。値・token・cookie の中身・claim 本体・個人データは記録しない (qa-151 [147-b] 非記録契約)。
- **E-4 必須の秘密が投入されていない状態を本番へ出さない — これは新設ではなく、既に存在する**。名前だけを宣言し値は設定ファイルへ入れないという方式は [Cloudflare Workers 公式](https://developers.cloudflare.com/workers/configuration/secrets/)が示すとおりだが、本リポジトリはこれを 2026-08-02 (`HarnessHub-o2i.13`) に既に land 済みである。詳細は 2.8 に記す。仕様が求めるのは新設ではなく、**既存ゲートの限界の明示と回帰防止**である。

### 2.8 秘密が読めない状態は目視で判別できない

Cloudflare の secret は書込専用で、投入後は Wrangler からも dashboard からも値を読み戻せない。したがって「投入済みだが読めていない」のか「未投入」なのかは、**値を見る方法では原理的に判別できない**。6 章の未解決事項 1 がこの仕様上、E-3 の観測を実装する以外に解けないのはこのためである。

なお `@opennextjs/cloudflare` の公式 how-to には「環境変数は `process.env` でのみ利用可能」という記述がある。これは `next dev` 配下の **local 開発の文脈**を指すと解するのが Workers の binding モデルからの演繹として妥当だが、**この解釈は一次ソースの逐語では未確認である** (未解決事項 5)。ただし本文書の結論はこの解釈に依存しない。2.3 で見たとおり、本リポジトリの compat 設定では `process.env` から secret は読める。したがって **E-1 / E-2 の根拠は「読めないから」ではない** — E-2 は module 最上位の評価が isolate 生成時の 1 回きりで再評価されないこと、E-1 は縮退の記録点を 1 つに束ねることが根拠である (2.7)。**欠陥は吸収層の設計ではなく、認証に関わる 3 箇所がそこを通っておらず、倒れた理由を残さないことに限定される**。

また Workers は `cloudflare:workers` から `env` を import すればリクエスト処理の外からも secret を読める。これは E-1 の実装選択肢を増やすが、**E-2 を免除しない**。公式は同時に **Workers がリクエスト context の外での I/O を許可しない**ことも明記しており、module 最上位で認証基盤を組み立てる設計はこの制約と正面から衝突する。読めることと、読んだ結果をプロセス生存期間ずっと固定してよいかは別の問題である。

### 2.9 deploy 時ゲートは既に存在する。それでもこの症状は起きた

本文書の草稿は当初、E-4 を「新しく追加すべき契約」として書いていた。これは誤りだった。実測すると、同等のゲートは 5 日前の 2026-08-02 (`HarnessHub-o2i.13`) に既に land している。

- `docs/infrastructure-spec.md` L76 — 機械可読な台帳 `scripts/ci/worker-secrets-registry.json` を正本とし、`scripts/ci/check-worker-secrets.mjs` が **台帳 ↔ `apps/hub/wrangler.jsonc` の `secrets.required` ↔ 本番の実投入** を三方向で突合する
- `apps/hub/wrangler.jsonc` — `secrets.required` に `AUTH_SESSION_SECRET` を宣言済み
- `.github/workflows/ci.yml:249` — `check-worker-secrets.mjs --live` を `wrangler deploy` **より前**の step に置く。違反 1 件で exit≠0 となり deploy step へ到達しない

さらに台帳は `AUTH_SESSION_SECRET` について「未投入なら middleware が session provider を差さず deny-all のままになる (認証バイパスにはならないがログインが一切通らない)」と書いている。**本文書 1 章の報告症状そのものが、5 日前に別の文書へ既に書かれていた。**

では、なぜ防げなかったか。**ゲートが検査する層と、実装が読む層が違うからである。**

`--live` が確かめるのは Cloudflare 側 Worker に secret が**投入されているか**であり、取得できるのは `wrangler secret list` の返す**名前だけ**である (値は write-only で読み戻せない)。**このゲートは「その名前が入っている」ことしか言えず、「実装がそれを読めた」ことは何も言わない。**

草稿はここから「Workers は `process.env` へ供給しないから読めていないのだ」と続けていたが、その事実前提は 2.3 で反証された。したがって**なぜ防げなかったかは、現時点では答えられていない**。答えられているのは、ゲートが答えられる範囲の狭さだけである — 投入されていることと、実装がそれを読めることは、別々に確かめるべき 2 つの事実であり、E-4 は前者しか見ない。後者を見るのは V6 であり、そのための前提を作るのが E-1 / E-2 / E-3 である。

この節を書いた時点では、ここから「秘密は投入済みであり、残るのは読めていない側だけ」と結論した。**その結論は 2.3 で反証された。** 現在言えるのは次の 2 点に留まる。(1) 本番 Worker が現行 CI 経路で deploy されたものであれば `AUTH_SESSION_SECRET` は投入されている。(2) その前提自体を、本番への curl が許諾されていない以上リポジトリの静的読取だけでは確定できない — 手元から `wrangler deploy` された版が残っていればゲートは一度も通っていない。この判別を不要にするのが E-3 であり、原因が 3 候補に開いたままである現状は、E-3 を先に実装する順序の根拠をむしろ強めている。

なお `docs/infrastructure-spec.md` L77 は、このゲートを作った契機を「`AUTH_ACCESS_TOKEN_SECRET` が未投入のまま本番が稼働していた。発覚が遅れたのは middleware が fail-closed だったため — 鍵が無いとき `principal=null` に倒す設計は正しいが、副作用として『鍵が無い』と『token が不正』が同じ 401 へ潰れ、設定漏れが障害として立ち上がらなかった」と記録している。**本文書 2.4 が「本当の欠陥」として特定した機序は、同じリポジトリが 5 日前に別の secret について既に書き残していた機序と同型である。**同じ機序が別の入り口から二度成立したという事実こそが、E-3 (縮退そのものを観測可能にする) を単発の是正ではなく恒久契約として置くべき理由である。

### 2.10 確定した原因 — 本番が古いビルドのまま動いていた

2 回の観測で確定した。

```
$ curl -s https://harness-hub.daishimanju.workers.dev/api/auth/harness-hub/csrf
$ curl -s -X POST .../api/auth/harness-hub/signin/tenant-oidc \
      --data-urlencode "csrfToken=$T" --data-urlencode "callbackUrl=/sheets"
  → HTTP/2 302
    location: https://accounts.google.com/o/oauth2/v2/auth?...

$ curl -s https://harness-hub.daishimanju.workers.dev/harness-hub/signin | grep -o 'callbackUrl[^>]*'
  → callbackUrl" value="/"
```

**1 つ目でサインインの入口が正常だと分かり、2 つ目で原因が確定した。**

本番の signin 画面は、サインイン後の戻り先 (`callbackUrl`) として `/` を送っている。認証は成功しており、Auth.js はその指示どおり `/` へ戻していた。**失敗していたのではなく、指示された場所へ正しく着地していた。**

この値は履歴と一意に照合できる。

| commit | 日時 | `callbackUrl` の値 |
|---|---|---|
| `43e06e10` | 2026-07-30 14:11 | `value="/"` を**定数としてベタ書き** |
| `150a0f14` | 2026-08-03 13:02 | `DEFAULT_POST_SIGNIN_LANDING` (= `/sheets`) 由来へ置換 |

本番の実測は前者と一致し、後者と一致しない。**本番で動いているビルドは `150a0f14` を含んでいない。**

#### 是正の内容 — 新しいコードは要らない

`150a0f14` は 2 重の是正を既に入れている。

1. signin form の `callbackUrl` を `/sheets` にする
2. `app/page.tsx` (`/` そのもの) に、有効な session cookie があれば `DEFAULT_POST_SIGNIN_LANDING` へ redirect する処理を足す

2 があるため、古い cookie で `/` に来た利用者も業務画面へ送られる。**是正は「`150a0f14` 以降を本番へ deploy する」ことに尽きる。**

#### なぜ確定まで 10 ラウンド以上かかったのか

最終的には 1 回の GET と 1 行の grep で決まった。それまで迷走したのは、次の 2 つが観測できなかったからである。

- **稼働中のビルドがどの commit に対応するかを知る手段が無い。** そのため「コードは直っている」と「本番が直っている」を区別できず、**コードを読めば読むほど誤った確信が強まる**状態になっていた。実際、原因として挙げた機序は 2.3〜2.6 のとおり全て反証された。
- **着地先が既定値へ落ちた事象を記録する手段が無い。** 認証に失敗すればサインイン画面へ戻るので気づける。しかし「認証は成功したが、意図しない場所へ着地した」は**成功として通過し、痕跡が残らない**。

この 2 点はそのまま、本文書が要求する V2 / V6 / V7 の存在理由である。したがって受入基準へ次を加える。

| 検証 | 追加する要求 | 本件での効果 |
|---|---|---|
| V6 | 稼働中の成果物から、対応する commit を**認証なしで**確認できること | 切り分けが 1 回の GET で終わる |
| V2 | 「認証成功・着地先が既定値へ後退」を、認証失敗と**区別して**記録すること | 成功として通過する異常を可視化する |
| V7 | 稼働ビルドが既定 branch の HEAD より古い状態が続くことを検出すること | 本件は修正から 4 日間 (08-03 → 08-07) 未反映だった |

### 2.11 なぜ古いビルドが配信され続けたのか — deploy 成功 ≠ 配信更新 (2026-08-07 実測)

§2.10 は「本番が古い」ことまでを確定したが、**なぜ古いままだったのか**は開いていた。2026-08-07 の再配備 2 回でこれが確定したので、V7 の機序として記録する。

Cloudflare Workers は **version (アップロードされた版)** と **deployment (実際に配信される版)** が別概念であり、`wrangler deploy` が成功して `Current Version ID` を返しても、配信される deployment が入れ替わらない状態が成立する。実測は次のとおりで、2 run とも deploy した版は配信されなかった。

| run | `wrangler deploy` の Current Version ID | 直後の `/health` の `version` |
|---|---|---|
| 31218362101 (main への push) | `c3d03c71-0231-4a64-ab9f-e86d745346a2` | `2e4a6c5b-20f6-4eca-9599-862f77e5f37b` |
| 31219592345 (同一 commit の workflow_dispatch) | `c7a1ca03-ab24-4319-8951-462920241062` | `2e4a6c5b-20f6-4eca-9599-862f77e5f37b` |

`2e4a6c5b` は 2026-08-04 の失敗時 rollback で固定された版である。**この状態は自己強化する**: 配信が旧版のまま → 後続の smoke が古いコードを検査して失敗 → `if: failure()` の rollback が「直前 version へ戻す」を実行 → 古い版への固定がさらに強まる、という閉じた循環になる。修正を何度 merge しても本番が変わらないため、コードを読むほど誤った確信が強まるという §2.10 の観測不能性が、そのまま持続する。

**判定材料は最初から応答に載っていた。** `/health` の `version` は `CF_VERSION_METADATA` binding 由来で「いま実行されている version」を返すため、ビルド時に埋め込む文字列と違い rollback 後も嘘をつかない (V6 の実装がこれにあたる)。欠けていたのは値ではなく**突合**であり、CI は deploy した version と `/health` が返す version を一度も比較していなかった。

したがって V7 の要求を次のとおり具体化する。実装は `.github/workflows/ci.yml` の「配信版が今デプロイした版であることの検査」step、回帰固定は `apps/hub/tests/ci/production-auth-gates.test.ts`、運用手順は infrastructure-spec §7 と feature runbook の「分岐 0」を正本とする。

- **V7-a**: deploy 直後に、deploy した version id と `/health` が返す version を突合し、不一致なら **smoke より前に fail-closed で停止する**。以降の smoke を古いコードに対して走らせない (無関係な差分で赤くなり、真因が埋まるため)。
- **V7-b**: 伝播遅延と未昇格を取り違えない。一定時間 (現行 60 秒) の再試行を経てなお不一致の場合にだけ失敗とする。
- **V7-c**: 不一致時は deployment / version の一覧を診断出力し、次の是正が推測でなく実測から始められる状態にする。
- **V7-d**: 配信版が入れ替わっていない場合は **rollback しない**。本番に出ているのは元から旧版であって「壊れた新 version」ではなく、そこで rollback を打つと未昇格の原因である古い版への固定をこちらから強めてしまう。

### 2.12 一致は 1 回では足りない — colo 間の伝播ムラ (2026-08-07 実測・V7-e/V7-f)

V7-a〜V7-d を実装した直後の run で、**ゲートは通ったのに smoke は旧コードを検査して失敗する**という状態が観測された。§2.11 で「未昇格」と読んだ現象は、実体としては**伝播遅延**だったことがここで確定した。

| run | 観測 | 結果 |
|---|---|---|
| 31221676748 | `/health` 疎通確認 (21:59:24) の応答は旧版 `2e4a6c5b`。1.3 秒後の突合では新版 `af5778f5` へ切替わっていた | version_gate は PASS。しかし 21:59:46 開始の hearing smoke が `POST /api/v1/ai-jobs/pull` で `expected=404 actual=403` で失敗 (403 は `tenant_mismatch` を 404 へ直す前のコードの応答) |
| 31222374425 | 配信が落ち着いた後に同一 commit を再配備 | `deployed=served=a2aef34d` で一致し、hearing smoke を含む全 step が success |

Cloudflare は **colo (エッジ拠点) ごとに切替タイミングが違う**。したがって「ある 1 回の `/health` が新版を返した」ことは「全拠点で入れ替わった」ことを意味しない。単発の一致でゲートを通すと、直後の smoke が別拠点の旧版へ当たる窓が残る。

- **V7-e**: 配信版の一致は **連続 N 回** (既定 3 回・間隔 3 秒・上限 90 秒) を通過条件とする。不一致を 1 回でも観測したら計数を 0 へ戻す (通算一致回数で代用しない)。期限内に連続一致へ到達しなければ失敗させ、待っただけで通す実装にはしない。観測のたびに cache-buster と `Cache-Control: no-cache` を付け、途中のキャッシュ済み応答を「配信中の版」と誤認しない。応答の `cf-ray` から当たった colo を記録し、何拠点を観測したうえで通したかを後から検証できるようにする。
- **V7-f**: 通過判定の根拠は `/health` の JSON だけに置く。`wrangler deployments list` などの一覧出力は表示仕様が変わりうるため、パース失敗が空文字になって素通りする (fail-open) 危険がある。wrangler の呼び出しは不一致時の診断表示に限定する。

**検査の対象は文言ではなく挙動とする。** workflow に必要な式が書かれているかだけを見ると、条件式を書き間違えて常に通過するようになっても緑のままになる。`apps/hub/tests/ci/version-gate-behavior.test.ts` は `ci.yml` から `run` 本文をそのまま抜き出し、偽の `curl` を PATH 先頭に置いて bash で実行し、(1) 正常時は通過、(2) 遅延しても連続一致すれば通過、(3) 新旧が混ざる状況では通過させない、(4) 入れ替わらないまま期限切れなら失敗、を **exit code** で固定する。(3) は旧実装が通していた状況そのものであり、今回塞いだ窓に対応する。

**実運用でこの窓が実在することが確認された (run 31224919542 / 2026-08-07 22:52)。** 連続一致を入れた最初の deploy で、次の観測が得られた。

| attempt | colo | served | streak |
|---|---|---|---|
| 1 | IAD | `0da075d8` (新) | 1/3 |
| 2 | IAD | `a2aef34d` (**旧**) | **0/3** |
| 3 | IAD | `0da075d8` (新) | 1/3 |
| 4 | IAD | `0da075d8` (新) | 2/3 |
| 5 | IAD | `0da075d8` (新) | 3/3 → 通過 |

旧実装は attempt=1 の時点で通過していた。その直後に走る smoke は、attempt=2 が示すとおり旧版へ当たりうる状態だった。連続一致は attempt=2 で計数を 0 へ戻し、17 秒待って通している。

**さらに、新旧が混ざったのは同一 colo (IAD) 内である。** 当初の仮説は「colo 間で切替時刻が違う」だったが、実際には**同一拠点内でも切替が段階的に進む**。粒度は仮説より細かく、単発の一致は原理的に不十分だったことになる。`cf-ray` の記録がなければこの区別はつかなかった。

なお「smoke 実行の直前にも version を再確認する」案は、この時点では採らなかった。version_gate 自体が smoke 群の直前に位置しており、連続一致がその役割を果たすと考えたためである。**この判断は §2.13 で撤回した。**

### 2.13 ゲート通過は「以降ずっと新版」を意味しない — smoke 直前の再確認 (2026-08-08・V7-g/V7-h)

§2.12 末尾で「version_gate は smoke 群の直前にある」と書いたが、これは正しくない。実際の step 順は `version_gate` → **稼働ビルド鮮度検査** → 最初の smoke であり、間に別の検査が 1 つ挟まる。鮮度検査は `/health.commit` と既定 branch HEAD を突合するもので、しきい値まで再試行しうる。つまりゲート通過から smoke 開始までには**無視できない時間差**が存在する。

さらに §2.12 の実測が示したのは、切替が **同一 colo 内でも段階的に進む**ことだった。粒度がそこまで細かいのなら、「連続 3 回一致した」ことが保証するのは *その観測時点で* 安定していたことだけであって、数十秒後まで保たれることではない。§2.12 で採らなかった理由 (「version_gate が smoke の直前にある」「連続一致がその役割を果たす」) は、どちらも前提が成り立っていなかった。よって候補 (2) を採用する。

- **V7-g**: 最初の smoke の**直前**に、配信版が deploy した版のままであることを再確認する (`scripts/ci/assert-served-version.mjs`)。連続 3 回一致 (間隔 2 秒・上限 60 秒) に達したときだけ通す。version_gate との役割の違いを明示する — version_gate の不一致は「まだ届いていない」(伝播の立ち上がり / 待てば解消しうる)、この検査の不一致は「届いた版が保てていない」(smoke が旧版を検査する状態そのもの) である。**通信失敗・HTTP エラー・JSON 不正・`version` 欠落はすべて不一致として数え**、連続計数を 0 へ戻す。取得できなかったことを「変化なし」と読み替えない。一度一致してから崩れた場合は `flapped=true` として区別し、観測ごとの colo とあわせて JSON 証跡へ残す (この検査が塞ぐ状態が実際に起きたかを事後に判別するため)。
- **V7-h**: この検査の失敗では **rollback しない**。時点として smoke は 1 件も走っておらず「新 version が壊れている」証拠が無い (V7-d / 鮮度検査と同型)。加えてこの失敗は「配信版が deploy した版で安定していない」状態そのものなので、`wrangler rollback` を打っても**どの版へ戻るのかが確定しない**。戻す判断の材料が無い以上、戻さないのが正しい。

**ここでも検査対象は文言ではなく挙動とする。** `apps/hub/tests/ci/smoke-version-recheck.test.ts` は実 HTTP サーバ (`node:http`) を立て、script を実プロセスとして起動し、(1) 安定一致は通過、(2) 新旧が混ざれば通さず `flapped=true` を報告、(3) 旧版のままなら期限切れで失敗、(4) 5xx を「変化なし」と読み替えない、(5) `version` 欠落を一致とみなさない、(6) 接続不能でも success へ倒れない、(7) 判定根拠を JSON 証跡へ残す、を **exit code** で固定する。合否判定を `if (false)` へ差し替える変異を入れると (1)(7) を除く 5 件が赤へ反転することを確認済みで、テストが「書いてあること」ではなく「落ちること」を見ていることの裏取りとした。
