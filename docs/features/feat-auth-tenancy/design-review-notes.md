---
status: approved-with-conditions
layer: feature-design-review
task: SYS-AUTH-TENANCY-P03
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
reviewed_artifact: docs/features/feat-auth-tenancy/architecture-decision-record.md
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy 独立設計レビュー記録 (P03)

> **位置づけ**: P02 の [architecture-decision-record.md](./architecture-decision-record.md) を、P02 の判断過程に依存せず**証跡から再導出**して検証した記録。本書はレビューのみを行い、ADR 自体は編集しない (要是正判定が出た場合は P02 差し戻しを記録する)。

## 総合判定

| 観点 | 対象 AD | 判定 |
|---|---|---|
| R1. スキーマ owner 境界 | AD-1 | **承認** |
| R2. role 分割線 (列 3 値 / 実効 4 値) | AD-3 | **承認** |
| R3. 単一認可ミドルウェア + deny-by-default | AD-4 | **条件付き承認** (条件 C1・C2) |
| R4. OIDC 検証契約 | AD-5, AD-7 | **承認** |

**総合: 条件付き承認。** R3 の条件 C1・C2 を P05 実装で満たすことを前提に P04 へ進んでよい。ADR への差し戻しは不要 (ADR 自体が条件を既に明記しているため、条件は P05 の実装拘束として引き継ぐ)。

---

## R1. スキーマ owner 境界の再現性検証 — **承認**

### 検証方法

P02 が挙げた 3 系統の証跡を、P02 の記述を読まずに独立に参照し、同じ結論に到達するかを確認した。

### 証跡 ①: docs/backend-spec.md §2.2

`session_revocations` / `users` / `publisher_tokens` / `device_authorizations` / `idp_connections` はいずれも §2.2「コアドメイン (公開基盤)」の表に列定義付きで存在する。§2.2 全体が feat-domain-model-db の write scope であることは、同 feature の published task spec の Write scope から確認できる。

→ **再現**。

### 証跡 ②: feat-domain-model-db の phase-02 architecture spec

先行 feature が「コアドメイン 18 テーブル全体の owner」を宣言済みであり、部分的な owner 分割 (認証関連 5 テーブルだけ別 feature が持つ) を許す記述はない。

→ **再現**。

### 証跡 ③: 本 feature の write scope の構造的制約

P05 spec の Write scope に `(packages/db/schema/ 配下は対象外)` が明記されている。owner を主張しようとしても物理的に書けない。

→ **再現**。

### write_scope 衝突の有無

feat-domain-model-db の resource_scope (`packages/db/`) と本 feature の resource_scope (`apps/hub/src/lib/auth/`, `apps/hub/src/lib/authz/`, `apps/hub/src/app/...`, `packages/schemas/auth-tenancy/`, `apps/hub/src/middleware.ts`) に**交差はない**。

### 追加所見 (レビュアからの指摘 / 是正不要)

ADR の AD-1 は「port は本 feature が所有し、スキーマは所有しない」と切り分けている。この切り分けは正しいが、**port の所有それ自体が将来の衝突源になりうる**。具体的には、feat-domain-model-db が land した後に repository の署名が port と食い違った場合、どちらを直すかの判断者が未定である。

→ ADR §10 の申し送り #1 が同じ論点を「結線タスク」として既に引き受けているため、**是正指摘とはしない**。ただし結線タスク起票時に「不一致時は port 側を repository 署名に合わせる (スキーマ owner が上位)」という優先順位を明記すべきである、と付記する。

---

## R2. role 分割線の再現性検証 — **承認**

### 検証: backend-spec §2.2 の users 定義

`users.role` の CHECK 制約に相当する値域は `provider-admin` / `workspace-admin` / `member` の 3 値である。`owner` は含まれない。

→ ADR AD-3 の「列は 3 値」は **一致**。

### 検証: backend-spec §3.3 の認可マトリクス

`owner` 列には「対象 Project」の注記が付いている。これは owner が**リソースに相対的**であることを示しており、利用者に固定的に付く属性ではない。ADR が `projects.owner_user_id` との関係から合成すると述べているのと **一致**。

### 検証: 単調性

§3.3 の 21 行 × 4 列を左 (member) から右 (provider-admin) へ読み、許可が減る行が存在しないことを確認した。

- 全 21 行で単調性が成立している。
- `token.revoke_own` のような `selfOnly` 行も、「member でも自分のものなら可、上位 role は他人のものも可」という形で単調性を壊していない (selfOnly は minRole とは直交する追加条件)。

→ ADR の全順序 `member < owner < workspace-admin < provider-admin` は **妥当**。

### 追加所見: 「owner 合成は member のときだけ」の妥当性

ADR AD-3 は「`workspace-admin` 以上は既に owner の許可を包含するので合成は member のみでよい」としている。これは単調性が成立する限り正しい。**ただし単調性が崩れた瞬間にこの最適化は誤りになる。**

→ ADR は単調性検査テスト (T-1b) を明示しているため、この依存関係は既に検査で守られている。**是正不要**。

---

## R3. 単一認可ミドルウェア + deny-by-default — **条件付き承認**

### 検証: qa-020 (認可判定の一箇所集約) との整合

qa-020 の要求は「認可判定が散在しないこと」である。ADR AD-4 は判定を `lib/authz/decide()` に集約し、edge middleware には role 比較を置かないと定めている。これは要求を満たす。

しかし本レビューは、この設計に**2 つの検証されるべき前提**があると判定する。

### 条件 C1: 「edge に role 判定を書かない」が検査されていない

ADR は責務分割を**規約として**述べているが、規約は破られる。foundation 側の `src/middleware/` に将来 role 比較が書かれても、現状の CI 検査 (`check-shared-layer-duplicates.mjs` の `unwrapped-route-handler`) は route handler の `withAuthz` 有無しか見ておらず、**middleware 内の role 比較は検出しない**。

> **要求**: P09 の `check-single-authz-middleware.mjs` は、「route handler が `withAuthz` を経由しているか」だけでなく、**`lib/authz/` 以外に role 全順序の語彙 (`provider-admin` 等の role リテラルによる比較や `ROLE_ORDER` 相当の配列) が現れないこと**を検査すること。

**判定: 条件付き承認。** ADR の設計自体は正しいが、規約を機械検査へ落とさない限り qa-020 は満たされたと言えない。

### 条件 C2: route handler exemption の「静かな増殖」

ADR AD-4 は RFC 8628 の 3 経路を `route_handler_policy.exemptions` へ登録するとしている。この判断自体は**妥当**である (principal が存在しない段階の要求に principal 前提の wrapper を強制するのは、wrapper を偽の principal で呼ぶという**より悪い**回避を誘発する)。

しかし exemptions は共有ファイルであり、他 feature が追記できる。「認可を外してよい route の一覧」が誰でも追記でき、かつ誰も総量を見ていない状態は、deny-by-default の実質的な失効を招く。

> **要求**: P09 の検査は exemption 一覧を**期待集合との厳密一致 (集合として等しい)** で照合すること。部分集合検査 (「期待するものが含まれている」) では増殖を検出できない。

**判定: 条件付き承認。** ADR は「厳密一致で照合する」と既に書いているため、実装がそれを守るかの確認事項として P05/P09 へ引き継ぐ。

### 検証: deny-by-default の二重化

| 層 | 既定拒否か | 検証 |
|---|---|---|
| edge | `PUBLIC_PATH_PREFIXES` allowlist 方式 | **成立**。allowlist に無い = 認証必須 |
| decision | `ACTION_RULES` に無い action は `no_rule` | **成立**。規則表に無い = 拒否 |

両層とも「書き忘れたら通る」ではなく「書き忘れたら落ちる」側に倒れている。これは deny-by-default の本質的要件を満たす。

### 検証: 越境監査の強制

ADR は `decide()` を route から直接呼ばせず `withAuthz()` を唯一の入口とし、`crossTenant === true` のとき監査 append を関数内で必ず実行するとしている。

これは「呼び出し側が監査を書き忘れる」という失敗モードを構造的に消している。**適切**。

> **付記**: `decide()` が公開されていると `withAuthz()` を迂回できる。P05 は `decide()` を lib/authz の公開面に出す場合でも、route handler からの直接使用が検査で落ちる状態を保つこと (C1 の検査で `lib/authz` 外の role 語彙を禁じれば、`decide()` 単独使用は結果として route 側の判定分岐を要求するため検出される)。

---

## R4. OIDC 検証契約 — **承認**

### qa-005 (テナント別 OIDC 動的解決) との整合

| ADR の内容 | qa-005 の要求 | 判定 |
|---|---|---|
| `/{tenant_slug}/signin` でテナント先行確定 | テナントごとに異なる provider を解決 | 一致 |
| 当該テナントの `idp_connections` のみを候補にする | テナント跨ぎの候補提示をしない | 一致 |
| `UNIQUE(tenant_id, idp_subject)` による sub 束縛 | 他テナントの sub と混線しない | 一致 |

### T1 (トークン偽造・すり替え) 対策の網羅性

| 攻撃 | ADR の対策 | 判定 |
|---|---|---|
| 別 IdP が発行した token の持ち込み | `issuer` 厳密一致 + discovery の issuer とも一致 | 有効 |
| 別クライアント向け token の流用 | `aud` 一致 + `azp` 一致 | 有効 |
| リプレイ | `nonce` 一致 + **欠落を拒否** | 有効 |
| CSRF | `state` + **欠落を拒否** | 有効 |
| 認可コード横取り | PKCE **S256 のみ**受理 | 有効 |
| email 詐称による他人へのなりすまし | `email_verified === true` のみ受理 + **email を識別子にしない** | 有効 |
| JIT による特権昇格 | 初回作成は `role='member'` 固定 | 有効 |

**「欠落を拒否」の明記は重要**である。`nonce` や `state` を「存在すれば比較する」実装は、攻撃者が当該パラメータを省略するだけで検査を回避できる。ADR がこれを明示している点を**評価する**。

### qa-036 (session staleness / 緊急失効) との整合

| ADR の内容 | 判定 |
|---|---|
| maxAge 8h / updateAge 15 分 | backend-spec §3.2 と一致 |
| role/status 変更の反映が最大 15 分遅れることを**受容と明記** | 一致。暗黙の妥協ではなく明示された選択である点を評価 |
| 緊急失効は `session_revocations` + `iat < revoked_at` で即時 | 一致 |
| 失効キャッシュ TTL 60 秒 | ADR 独自の設計判断。緊急失効の反映が最大 60 秒遅れる |

### 追加所見: 失効キャッシュの fail-closed

ADR AD-7 は「キャッシュ miss かつ port 失敗時は拒否側へ倒す」としている。これは**正しい**。

fail-open にすると「DB 障害中は緊急失効が効かない」という、攻撃者が DB を落とすインセンティブを持つ設計になる。fail-closed の代償 (障害中に全員がログインできない) は、可用性の問題であってセキュリティの問題ではないため、この選択は妥当である。

> **付記**: fail-closed が「全ユーザのアクセス断」を意味することは P12 runbook に運用影響として記載すべきである。

---

## 是正指摘事項 (P05 への拘束)

| id | 内容 | 引受 phase |
|---|---|---|
| C1 | `lib/authz/` 以外に role 全順序の語彙が現れないことを CI 検査する | P05 (構造) / P09 (検査実装) |
| C2 | route handler exemption 一覧を期待集合と**厳密一致**で照合する | P09 |
| N1 (付記) | port と repository 署名が不一致の場合、port 側を repository に合わせる (スキーマ owner が上位) | 結線タスク起票時 |
| N2 (付記) | 失効キャッシュ fail-closed の運用影響 (障害中は全断) を runbook に記載 | P12 |

## P02 差し戻しの要否

**不要。** 全観点が承認または条件付き承認であり、条件はいずれも ADR の記述と矛盾せず、P05/P09/P12 の実装拘束として引き継げる。

## 参照

- レビュー対象: [architecture-decision-record.md](./architecture-decision-record.md)
- 要件: [requirements-baseline.md](./requirements-baseline.md)
- 正本: [docs/backend-spec.md](../../backend-spec.md) §2.2 / §3.3 / §4.1、[docs/security-spec.md](../../security-spec.md) §2.5 / §3.1 / §3.5 / §3.7
