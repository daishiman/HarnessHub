---
status: confirmed
layer: feature-quality
task: SYS-PUBLISH-PIPELINE-P10
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/quality-assurance-report.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline 最終レビュー記録

> **位置づけ**: P10 の成果物。P03 (設計レビュー) とは**独立した視点**で、実装後の成果物に対して現行 quality_constraints 9 件・acceptance 3 件・cross-feature 境界判断 3 件の妥当性を確認する。

確認日: 2026-07-28

## 0. レビューの視点

P03 は「設計が要求を満たすか」を見た。本 phase は「**実装が設計を満たしていると誰が保証しているか**」を見る。具体的には、各 constraint について「それを守らせている機構は何か」「その機構が外れたとき CI は落ちるか」を問う。

この視点を採る理由は本 feature の実測にある。P06 §4-1 で見つかった secret scan の欠落は、**テストが 142 件すべて緑のまま**成立していた。「テストが通っている」は「守られている」を意味しない。守らせている機構を名指しできない項目は、いつ外れても気づけない。

## 1. quality_constraints 9 件の最終確認

| # | constraint | 守らせている機構 | 外れたら落ちるか |
|---|---|---|:--:|
| Q1 | state-machine §7.2 property test | `state-machine.test.ts` の**直積全数**テスト。遷移表に無い組が通れば必ず落ちる | ○ |
| Q2 | 検査 pipeline の純関数共有 | `shared-layer-registry.json` + `check-shared-layer-duplicates.mjs` (複製検出) | ○ |
| Q3 | Green 自動公開 / Yellow・Red は Needs Fix | `verdict-mapping.test.ts` (写像) + `check-publish-inspection-gate.mjs` (**結線**) | ○ |
| Q4 | Release 不変・stable ポインタ・原子的 rollback | `service-release.cases.ts` + `packages/db/__tests__/release-immutable.test.ts` | ○ |
| Q5 | R2 content-addressed registry (db が owner) | `check-db-schema-boundary.mjs` (境界) + `r2-registry.test.ts` | ○ |
| Q6 | append-only 監査 event | `audit-chain.test.ts` + cron `verify-audit-chain` (実行時にも検証) | ○ |
| Q7 | REST は zod 単一定義 / authz ミドルウェア一元 | `check-single-authz-middleware.mjs` + `routes.test.ts` | ○ |
| Q8 | TargetChannel 直列化 (単一 in-flight) | DB の partial UNIQUE index + `support/harness.ts` が述語を**直接**再現 | ○ |
| Q9 | dual principal / CSRF / fail-closed Bearer | `routes-auth.cases.ts` + `middleware-entry.test.ts` + authz matrix/entry | ○ |

### 1-1. Q8 の機構について特記

テスト土台 `support/harness.ts` は DB の partial UNIQUE index 述語 `status NOT IN ('published','failed','draft')` を**ハードコードで写している**。アプリ側の `TERMINAL_STATES` を import していない。

一見すると重複だが、これは意図的である。偽物 (in-memory 土台) が本物 (アプリ定数) へ自動追従すると、**両者がずれたときにテストがずれを検出できなくなる**。DB の制約は DB 側の宣言であり、アプリ定数とは独立に変わりうる。

> ただしこれは「DB のスキーマ定義とテスト土台の写しが手で同期される」ことを意味する。スキーマ owner は feat-domain-model-db なので、向こうが述語を変えた場合に本 feature のテストが**通ったまま実態とずれる**リスクが残る。§4 F8 として起票する。

### 1-2. Q3 の機構が二重である理由

Q3 だけが「振る舞いのテスト」と「静的検査」の両方を持つ。冗長ではない。

- 振る舞いのテスト (`publish-inspection.test.ts`) は「**束が正しい**」ことを守る
- 静的検査 (`check-publish-inspection-gate.mjs`) は「**Hub がその束を使っている**」ことを守る

束が正しくても Hub 側が束を使わず自前で組み直せば secret scan は消える。実際に起きていたのは後者である。

## 2. acceptance 3 件の最終確認

P07 の判定 (3 件すべて満たす) を再確認した。追加の指摘は以下 1 点。

### A2 の「旧 stable が維持される」の検証範囲

現在の検証は**サービス層**での確認である。「検査 fail の request は `promoteChannel` へ到達しない」ことをテストしている。

これは正しいが、**DB レベルで stable ポインタが守られている**ことまでは示していない。仮に将来 promote を呼ぶ別経路ができた場合、サービス層のテストは無傷のまま A2 が破れる。

現時点では publish の変更系はすべて `withPublishMutation` を通り、`promoteChannel` の呼び出し元は 1 箇所なので実害はない。ただし「経路が 1 本であること」を固定する検査は無い。§4 F9 として起票する。

## 3. cross-feature 境界判断 3 件の最終確認

| # | 境界 | owner | 本 feature の立場 | 固定している機構 | 判定 |
|---|---|---|---|---|:--:|
| B1 | DB スキーマ (`publish_requests` 他 7 テーブル) | feat-domain-model-db | consumer | `check-db-schema-boundary.mjs` (subpath 全面禁止 + 相対到達禁止) | **妥当** |
| B2 | 認可ミドルウェア (`withAuthz` / ロール判定) | feat-auth-tenancy | 利用者 | `check-single-authz-middleware.mjs` (判定語彙の局在) | **妥当** |
| B3 | 検査 pipeline (`packages/inspection`) | **feat-publish-pipeline** | owner | `shared-layer-registry.json` + 複製検出器 | **妥当** |

### 3-1. B1 について

`packages/db` の `package.json` が `"./schema"` を公開 subpath として出しているのは**境界の穴**である。本 feature はこれを塞げない (owner が違う) ので、代わりに「apps/hub 側から通らない」ことを検査で固定した。

現時点で subpath 参照は 0 件なので、この禁止は既存コードを 1 行も曲げていない。つまり追加の制約ではなく**現状の固定**である。

### 3-2. B2 について

本 feature は `withAuthz` を**呼ぶだけ**で、ロール判定表を持たない。P09 §6 で検出した違反 (テスト名に `minRole` が含まれていた) は、境界が実際に監視されていることの実証でもある。

`publishScopeOf` が `tenantId` を resource 側から取る設計判断は本 feature の責任範囲であり、B2 を侵していない (判定結果の**使い方**であって判定そのものではない)。

### 3-3. B3 について

本 feature が owner である以上、「他所に複製が生まれない」ことだけでなく「**自分が正本を提供し続ける**」義務がある。Publisher (feat-publisher-plugin) が未実装の現在、`createPublishInspectionRules()` の唯一の呼び出し元は Hub である。

Publisher が実装されたとき、同じ関数を呼ばずに独自実装した場合の検出手段は現状**複製検出器のみ**で、これは「コードが似ているか」を見る。より確実なのは `PipelineDescriptor` の照合 (両者の `ruleIds` が一致するか) だが、Publisher が無い今は書けない。§4 F10 として起票する。

## 4. 本 phase で追加した follow-up

| # | 内容 | 理由 |
|---|---|---|
| F8 | DB スキーマ述語とテスト土台の写しの同期検査 | 手で同期しており、owner 側の変更で静かにずれうる (§1-1) |
| F9 | `promoteChannel` の呼び出し元が 1 箇所であることの静的検査 | A2 後半の保証がサービス層のテストに依存している (§2) |
| F10 | Publisher 実装時に `PipelineDescriptor` 照合テストを追加 | 検査の挙動同値を「似ているか」ではなく「同じか」で見る (§3-3) |

## 5. 判定

**quality_constraints 9 件・acceptance 3 件・cross-feature 境界判断 3 件、すべて妥当。P11 (証跡集約) へ引き継ぐ。**

新規の blocker は無い。F8〜F10 はいずれも「現時点で実害は無いが、将来の変更で静かに壊れうる箇所」であり、本 feature の受入を妨げない。

## 6. Landing 前の再レビュー (2026-07-30)

`git status` と main 差分をクリーン worktree で再構成し、publish pipeline と無関係な
元 worktree の既存差分を対象外にした。現行 package digest は `845b61b…cdd4d` で、
P01〜P13 の task projection を C02 正規ライターから再生成した。

追加レビューで、Workers の request body を `request.text()` /
`request.arrayBuffer()` へ無制限に積む経路、Cloudflare runtime env と DB row の
二重型キャスト、605 行の publish service を検出した。本文は上限付き stream reader、
env/row は runtime validation、service は契約・公開要求・Release 操作へ分離した。

仕様影響は「あり」と判定した。理由は REST API、状態機械、DB/R2、認可、
production smoke/rollback の外部・運用契約を実装で具体化したためである。
`appr-020`、`qa-103`〜`qa-108` により system-spec を正規に再確定し、
[仕様反映受領書](./spec-reflection-receipt.md)へ対応表を記録した。

500 行超の手書き成果物は責務別に分割する。content-addressed generation、
`graph.json`、`spec-state.json` は機械可読な単一正本であり、分割すると digest・
schema・writer の原子性を壊すため例外とする。
repository 固有の 300 行文書ゲートで検出した ADR 341 行も、設計本体と
[境界統合決定](./architecture-integration-decisions.md)へ 246/118 行で分冊した。

品質ゲート再実行では、共有層 detector が production smoke の DB deep import 2 件と
test support の公開 API 名衝突 1 件を検出した。前者は
`createPublishSmokeDbProbe` に fixture 準備・証跡読取・cleanup を閉じ、
後者は test-only alias へ改名して是正した。再実行結果は Hub 842、
inspection 151、DB 231、schemas 86 tests、全 workspace typecheck、lint 423 files、
OpenNext Worker build、境界 detector 501 files / violations 0 である。
