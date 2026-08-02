---
status: confirmed
layer: feature-runbook
---

# feat-dual-catalog-web 運用 runbook (P12)

- graph node: `SYS-DUAL-CATALOG-WEB-P12` / beads: `HarnessHub-dhy.12`
- 作成日: 2026-08-01
- 消費: `evidence-summary.md` (P11) / `docs/infrastructure-spec.md`
- 対象読者: カタログ利用者 (member 以上) / Workspace 管理者 / Hub 運用者

> **この文書の書き方**: 手順の数値 (ポーリング間隔・キャッシュ秒数・失敗分類) を本文へ書き写していない箇所がある。
> 定数を 2 か所に持つと、実装を直したのに runbook が古いまま残る。**出所の関数を示し、値はそこを正本とする**。

## 1. カタログ利用者向け操作手順 (S01 → S02)

### 1.1 画面と URL

| 画面 | URL | 実装 |
|---|---|---|
| S01 業務ツール一覧 | `/catalog?tenant=<tenantId>&workspace=<workspaceId>` | `app/(workspace)/catalog/page.tsx` |
| S02 業務ツール詳細 | `/catalog/<projectId>?tenant=…&workspace=…` | `app/(workspace)/catalog/[projectId]/page.tsx` |
| S03 公開状態 (S02 のタブ) | 上記に `&publish=<publishId>` を付けたとき**だけ**タブが出る | `components/catalog/CatalogPublishStatus.tsx` |
| S04 リリース履歴 (単独ルート) | `/catalog/releases?tenant=…&workspace=…&project=<projectId>` | `app/(workspace)/catalog/releases/page.tsx` |

**`tenant` と `workspace` は必須。** 省略すると画面は「Workspace が特定できないため表示できません。」を出して
一切データを取りに行かない (`http-adapter.ts` の `scopeHeaders()` が `null` を返して fetch 前に打ち切る)。
これは不具合ではなく、**空の scope を「全件」と解釈させないための deny-by-default** である (§4.4 も参照)。

> 一覧から詳細へのリンクは `tenant` / `workspace` を自動で引き継ぐ (`CatalogList` の `detailHref()`)。
> 利用者が URL を手で組み立てる必要があるのは、外部から直接 S02 を開く場合だけ。

### 1.2 探す (S01)

1. `/catalog` を開く。表の列は **名前 / 説明 / 種別 / 公開状態 / 版 / 導入数**。
2. 「種別」で `すべての種別 / Skill / Web アプリ` を選ぶ。
3. 「キーワード」に語を入れる (名前と説明を検索)。
4. 「絞り込む」を押す。**押すまで再取得しない** — 一覧は自動更新しない設計 (ADR §2.2)。
   最新の公開状況を見たいときは絞り込みを押し直すか、画面を再読み込みする。
5. 絞り込み条件は URL の `target` / `q` に載る。**URL をそのまま共有すれば同じ絞り込みで開ける**。

「表示できる業務ツールがまだありません。」= 条件に合う公開済みツールが 0 件。
Hub 障害と区別が付かない場合は §4 の切り分け表を見る (障害時は画面上部にバナーが出る)。

### 1.3 導入する (S02)

1. 一覧の名前リンクから詳細へ移動する。タブは **概要 / (公開状態) / リリース履歴**。
2. 「概要」タブの下部に **「導入する」** の見出しがある。
   - 公開済みの版が無い場合は「公開されている版がまだありません。」と表示され、ボタンは出ない。
3. **「追加する」** を押すと導入情報 (install descriptor) をサーバから取得する。取得中の表示は「取得しています」。
4. 取得後に出る項目は、サーバが返した値だけを表示する。**画面側で URL やコマンドを組み立てない** (frontend-spec §3.2):
   - **版**
   - **導入コマンド** (`command` が返ったときのみ)
   - **パッケージを取得する** リンク (`download_url` が返ったときのみ)
   - **Web アプリを開く** リンク (`launch_url` が返ったときのみ) ← Web アプリ種別の導線
   - 有効期限 (`expires_at` が返ったときのみ)「この導入情報は … まで有効です。」

**再試行しても導入数は二重に増えない。** 同じ導入操作の間は同じ `Idempotency-Key` を再送する
(`CatalogInstallPanel` の `idempotencyKey` ref)。ただし**画面を再読み込みすると鍵は作り直される**ので、
「押しても反応しない → リロードして押し直す」を繰り返すと導入数が増える点は利用者へ案内しないこと
(＝運用者は導入数を厳密な実導入数として扱わない)。

### 1.4 公開状態を追う (S03 = S02 の「公開状態」タブ)

`?publish=<publishId>` 付きで開いたときだけタブが出る。表示は状態チップと「修正が必要な内容」の一覧。

- 自動更新の間隔と停止条件は **`lib/catalog/polling.ts` が唯一の正本**。画面側に数値は無い。
  概要: 初回間隔から指数的に伸び、上限で頭打ち。連続失敗・総経過時間・タブ非表示のいずれかで止まる。
- サーバが `Retry-After` を返した場合は**サーバ指示を優先する** (client の backoff がレート制御を上書きしない)。
- 止まると「自動更新を停止しました」と **「再試行」ボタン**が出る。押すと購読を張り直す。
- 人の操作を待つ状態 (`needs_fix` / `ready` / `approval_pending` 等) では**そもそも叩き続けない**。
  「止まっている＝壊れている」ではないので、問い合わせを受けたらまず状態チップを確認する。

### 1.5 この画面で**できないこと**

以下は本 feature の責務外であり、**画面にボタンが存在しないことが正しい状態**。
「あるはずのボタンが無い」という問い合わせは、下表の所管 feature へ回す。

| 操作 | 所管 |
|---|---|
| プラグインの公開 (取込・アップロード・公開ウィザード) | feat-publisher-plugin / feat-publish-pipeline |
| 昇格 (promote) / 切り戻し (rollback) / 公開停止 | feat-publish-pipeline |
| 承認キュー (Yellow review) | feat-workspace-governance (Stage 2) |
| 低品質報告 | **未実装** (§7-1) |

---

## 2. Workspace 管理者向け操作手順 (S04)

### 2.1 リリース履歴を見る

- S02 詳細の「リリース履歴」タブ、または `/catalog/releases?...&project=<projectId>` の単独ルート。
- `project` を指定しない場合は「業務ツールを選ぶと、その公開履歴を表示します。」を表示する (空表ではない)。
- 列は **版 / 状態 / 公開日時 / 内容の指紋**。
  - 現在の stable には版の後ろに「（現在の版）」が付く。
  - 「内容の指紋」は `package_hash` の**先頭 12 文字**。同一性の確認 (別 Workspace の同名版と中身が一致するか) に使う。
    全長が必要な場合は API 応答 (`GET /api/v1/projects/<projectId>/releases`) を直接見る。

### 2.2 履歴画面から状態は変えられない

昇格・切り戻しの操作は**意図的に置いていない** (`CatalogReleaseHistory` 冒頭の設計コメント / DC-SCOPE-03)。
「見るつもりで押した」事故を防ぐため。切り戻しが必要な場合は feat-publish-pipeline 側の手順に従う。

### 2.3 権限による見え方の違い

| 応答 | 画面の挙動 | 運用者の一次対応 |
|---|---|---|
| 401 | 閲覧不可。サインインへ誘導する分類 (`requiresSignIn: true`) | セッション切れ。サインインし直してもらう |
| 403 | 閲覧不可。**サインインへは誘導しない** | 権限不足。再サインインではループするだけなので role を確認する |

---

## 3. `marketplace.json` の形式仕様

### 3.1 配信

| 項目 | 値 | 出所 |
|---|---|---|
| エンドポイント | `GET /marketplace.json` | `app/marketplace.json/route.ts` |
| 認可 | `harnesses.read` (カタログ閲覧と同じ権限。追加権限を要求しない) | 同上 `withAuthz` |
| テナント境界 | リクエストの scope から解決 (`requestScopedResource`) | 同上 |
| `Cache-Control` | `private, max-age=60, stale-while-revalidate=300` | 同上 `CACHE_CONTROL` |
| `Vary` | `Cookie, x-harness-tenant-id, x-harness-workspace-id` | session/scope ごとの cache 分離 |
| 追加ヘッダ | `x-catalog-source-status: <source_status と同値>` | 同上 `SOURCE_STATUS_HEADER` |

`stale-while-revalidate=300` は §6.1 縮退の実体でもある — **同じ session/scope の private cache では、Hub が応答しない間も直近の document を最大 5 分間再利用できる**。
認証済みで tenant ごとに内容が変わるため shared cache は禁止する。`public` へ戻すと CDN から別 tenant へ再配信され得る。
`max-age=60` に抑えているのは、配布経路が確定したときの切り替え遅延を 1 分程度に収めるため。

### 3.2 本文の形

`.claude-plugin/marketplace.json` (Claude Code の marketplace 形式) と**同一キー**で出力する。
Hub 固有の追加キーは `source_status` **1 つだけ**で、これは DC-MKT-01 が機械的に固定している
(勝手なキー追加はテストで落ちる)。

```jsonc
{
  "name": "harness-hub-workspace",
  "description": "Harness Hub Workspace で公開されている業務ツール (Skill / Web アプリ)",
  "version": "0.1.0",
  "metadata": { "description": "…", "version": "0.1.0" },
  "owner": { "name": "Harness Hub" },
  "plugins": [
    {
      "name": "<CatalogEntry.name>",
      "source": "<採用配布経路が解決した参照>",
      "description": "<CatalogEntry.summary>",
      "version": "<stable_version>",
      "category": "skill | web_app",
      "tags": ["<target>", "<visibility>"]
    }
  ],
  "source_status": "ready | pending-h7"
}
```

`plugins[]` に載る条件は 3 つすべてを満たすこと (`marketplace.ts` の `isDistributable()`):

1. `visibility === 'workspace'` — private (作者のみ) は載せない
2. `stable_version !== null` — 一度も公開されていないものは載せない
3. `release_status === 'available'` — 停止・非推奨の版を新規導入させない

### 3.3 `source_status` の読み方 — **運用上いちばん重要**

`plugins: []` になる理由は 2 通りあり、**両者を同じ「空」として扱ってはいけない**。

| `source_status` | 意味 | 運用者の対応 |
|---|---|---|
| `ready` | 配布経路は確定している。空なら**本当に公開対象が 0 件** | 対応不要 (公開を待つ) |
| `pending-h7` | **採用配布経路 (Stage 0 technical gate H7) が未確定**。中身の有無に関わらず空 | 配布は始められない。gate の結論を待つ |

**現在は `pending-h7` である。** 判定の正本は
`docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md` の frontmatter `verdict`
(現在 `H7_NOT_ESTABLISHED`)。実装 (`resolveAdoptedSourceResolver()`) が `null` を返す状態と
この verdict の一致は DC-MKT-10 が固定しており、**片方だけ変えるとテストが落ちる**。

> 判定条件に decision ID (`D7` 等) を使わないこと。`spec-state.json` の `D7` は
> 「環境構成: 常設 staging を持つか」であり配布経路とは無関係。ID の再利用で
> 「登録された＝経路が確定した」と誤読すると、未成立のまま配布が始まる (P10 §4.1)。

### 3.4 監視のしかた

本文を読まない中継 (CDN・監視ツール) からも状態を見られるよう、`x-catalog-source-status` ヘッダに同じ値を出している。

```bash
# 経路確定を待つ監視 (pending-h7 の間は 1、確定したら 0)
curl -sI "$HUB_URL/marketplace.json" -H "cookie: $SESSION" \
  -H "x-harness-tenant-id: $TENANT" -H "x-harness-workspace-id: $WORKSPACE" \
  | grep -ci 'x-catalog-source-status: pending-h7'
```

---

## 4. Hub 障害時の縮退 runbook (§6.1 / qa-011)

### 4.1 大原則 — 何が止まり、何が続くか

| 対象 | Hub 停止中 |
|---|---|
| **導入済み Skill の実行** | **継続する。** 実行経路に Hub Worker が入らない (acceptance 3 の根拠) |
| 公開済み Web アプリ | 継続する (Hub とは別の Worker) |
| `marketplace.json` の配信 | 直近の内容が最大 5 分間継続 (`stale-while-revalidate=300`) |
| カタログの**閲覧** | 取得済みの内容は消さずに残す + 画面上部に縮退バナー |
| カタログの**新規取得** | 止まる (バナーで告知) |
| 新規導入 (「追加する」) | **止める。** ボタンを `disabled` にし「Hub が応答していないため、新しい導入情報は取得できません。」を出す |

> **利用者へ最初に伝える一文**: 「すでに追加済みのツールはそのまま使えます。新しく追加する操作だけが一時的にできません。」
> これを伝えないと、導入済みツールまで止まったと誤解して問い合わせが増える。

### 4.2 失敗の 4 分類と画面の見え方

分類規則は `lib/catalog/degradation.ts` の `classifyCatalogFailure()` / `catalogCapabilities()` が正本。

| 分類 | 主な原因 | 閲覧 | 導入情報の表示 | 変更操作 | 画面表示 |
|---|---|---|---|---|---|
| `degraded` | ネットワーク到達不能 / 408 / 429 / 5xx / **404** | ○ | ○ | × | 縮退バナー (画面は残る) |
| `unauthorized` | 401 | × | × | × | サインインへ誘導 |
| `forbidden` | 403 / scope 欠落 | × | × | × | エラー表示 (再サインインへは誘導しない) |
| `fatal` | 上記以外の 4xx / 契約に合わない応答 | × | × | × | エラー表示 |

`unauthorized` / `forbidden` / `fatal` では、同じ画面で直前の取得に成功していても以前の一覧・詳細・履歴を消す。
`degraded` で stale を残せるのは同じ tenant/workspace/project だけで、scope 切替後に旧 tenant の内容は再利用しない。

**404 を `degraded` に落としているのは意図的**。本 feature が消費する `/api/v1/harnesses*` は
feat-publish-pipeline 側で未実装であり (ADR §0 A2)、未実装を「壊れている」と表示すると
**健全な縮退状態が障害として報告される**。API 実装前の環境で常時バナーが出るのは**期待どおり**。

もう 1 つの経路: 応答は 200 だが**検証器 chunk の取得に失敗した**場合も `degraded` に寄せる
(`http-adapter.ts`)。実質オフラインであり、Hub 停止と同じ案内で足りるため。

### 4.3 一次切り分け手順

```bash
# 1) Hub 自体が生きているか
curl -sS -o /dev/null -w '%{http_code}\n' "$HUB_URL/marketplace.json"

# 2) 401/403 が返るなら認証・テナント境界の問題 (Hub 障害ではない)
#    → §2.3 の表に従う

# 3) 200 だが一覧だけ縮退バナー → /api/v1/harnesses* の 404 を疑う
curl -sS -o /dev/null -w '%{http_code}\n' "$HUB_URL/api/v1/harnesses" \
  -H "x-harness-tenant-id: $TENANT" -H "x-harness-workspace-id: $WORKSPACE"
#    404 なら feat-publish-pipeline 未実装。障害ではない (§4.2)
```

### 4.4 「Workspace が特定できません」が出るとき

Hub 障害ではない。URL から `tenant` / `workspace` が落ちている。
この場合 **fetch そのものを行っていない** (`scopeHeaders()` が `null` を返して打ち切る) ので、
サーバ側のログには何も残らない。ログが無いことを「到達していない障害」と読み違えないこと。

### 4.5 復旧後の確認

1. 画面を再読み込みし、縮退バナーが消えることを確認する。
2. S01 で「絞り込む」を押し、一覧が再取得されることを確認する (一覧は自動更新しない)。
3. S02 の「追加する」ボタンが `disabled` から戻っていることを確認する。
4. `marketplace.json` の `x-catalog-source-status` が期待値であることを確認する (§3.4)。

---

## 5. plugin 更新通知導線の運用手順

### 5.1 現状 — **push 型の通知は本 feature に存在しない**

要件上の「update 通知」(I12 / G2) は **Stage 2 (Workspace Governance)** の範囲であり、
送信手段は D6 (`resend-free`) で確定しているが、**本 feature は通知の送信も購読も持たない**。
本 feature が提供するのは **pull 型 (利用者が見に行けば分かる) の更新確認導線**である。

無い機能の手順を書かないこと。「通知が来ない」という問い合わせは仕様どおりであり、
Stage 2 / feat-feedback-loop 側の実装待ちとして扱う (§7-6)。

### 5.2 利用者が更新に気づける経路 (pull 型)

| # | 経路 | 見る場所 | 反映の遅さ |
|---|---|---|---|
| 1 | 一覧の「版」列 | S01 `/catalog` | 絞り込み・再読み込みしたとき |
| 2 | 詳細の「現在の版」 | S02 概要タブ | 画面を開いたとき |
| 3 | リリース履歴 | S02 タブ / `/catalog/releases` | 画面を開いたとき |
| 4 | `marketplace.json` の `plugins[].version` | 配布経路側 (Claude Code の plugin 更新) | 最大 60 秒 (+ stale 最大 5 分) |
| 5 | 導入情報の「版」 | S02「追加する」実行後 | 押したとき |

### 5.3 更新を周知するときの運用手順

新版を公開した後、利用者へ確実に届けたい場合は**現状は人手の周知が必要**。

1. **公開の完了を確認する** — S02 リリース履歴で、新版に「（現在の版）」が付いていること。
   付いていなければ stable pointer がまだ切り替わっていない (feat-publish-pipeline 側の処理待ち)。
2. **配布面への反映を確認する** — `marketplace.json` の該当 `plugins[].version` が新版であること。
   `source_status` が `pending-h7` の間は**そもそも配布面に出ない** (§3.3)。この状態で「更新しました」と
   周知すると、利用者が取得できない案内になる。**周知前に必ず `source_status` を確認する。**
3. **反映待ちを見込む** — `max-age=60` のため、公開直後は最大 1 分ほど旧内容が返り得る。
   中継が stale を返す場合はさらに最大 5 分。**公開直後の 1 分間に「反映されない」と判断しない。**
4. **周知する** — 現状は Hub 外のチャネル (社内連絡等) で行う。文面には
   「S02 の『追加する』を押し直すと最新版の導入情報が出る」ことを含める。
5. **利用者側の更新** — 配布経路が確定している場合、Claude Code 側の plugin 更新操作で新版を取得する。
   経路未確定 (`pending-h7`) の間は、S02 の導入情報 (コマンド / パッケージ取得リンク) が唯一の導線。

> 運用注意点・follow-up・P13 引き継ぎは [runbook-follow-ups.md](./runbook-follow-ups.md) へ責務分離した。
