---
status: confirmed
layer: feature-architecture
task: SYS-DOCS-CMS-P03
parent_feature: feat-docs-cms
feature_package_id: feature-package/feat-docs-cms
source: docs/features/feat-docs-cms/architecture-decision-record.md
reviewer: P03 independent reviewer (not the P02 author)
---

# feat-docs-cms 独立設計レビュー (P03)

> 対象: [architecture-decision-record.md](architecture-decision-record.md) (P02 成果物)。
> 参照: [requirements-baseline.md](requirements-baseline.md) の acceptance 3件・quality_constraints 8件。

## 判定: **条件付き承認 (Conditional Approval)**

設計の大筋 (既存 `hearing-intake` パターンの踏襲、zod 単一ソース、認可単一ミドルウェア配下、AiJob pull キューの汎化、共通 Markdown レンダラの消費) は妥当であり、致命的な (quality_constraints を原理的に満たせない) 破綻は無い。ただし、認可設計に1件、P05 実装前に **必ず** 明確化・補強すべき懸念点 (下記 §A) がある。また DB スキーマの精度根拠に1件、P05 実装時の注意点として引き継げる懸念 (§B) がある。これらへの対応を条件として P04 へ進めてよい。

---

## 適合確認結果 (項目別)

| 項目 | 適合状況 | 備考 |
|---|---|---|
| SEC2 (docs-edit-admin-only, 認可単一ミドルウェア deny-by-default) | **適合** | `docs.read`/`docs.write_tenant`/`docs.write_common` は `rules.ts:70-72` に確定済み。全 route は `withAuthz` 配下 (§3 で明記)。role×操作許可表 (§3.2) は `rules.ts` の minRole と整合することを実装コードで確認済み (workspace-admin: write_tenant ✅ / write_common ❌、provider-admin: 両方 ✅)。 |
| SEC6 (doc-edit-audit) | **適合 (懸念小)** | `docs.create`/`docs.update` の発火点は明確。AI 下書き書戻しを `ai_job.complete` 監査で代替する設計は、`ai-jobs/[id]/complete/route.ts:49-62` に実装済みの既存監査 (action, tenantId, resourceType, resourceId, metadata) をそのまま確認でき、`ref_type='document'` が乗ることで追跡可能というADRの主張は妥当。ただし「二重記録しない」判断が SEC6 の意図 (人間による確定編集の追跡) と「AI が何を書いたか」の追跡を1つの監査ストリームに混在させる点は、監査ログを読む運用者にとって `docs.update` (人間編集) と `ai_job.complete` (AI下書き) を突き合わせる追加ロジックが要ることを意味する。致命的ではないが、P05 実装時に運用者向けドキュメント (監査ログの読み方) を残すことを推奨。 |
| SEC7 (markdown-sanitize) | **適合** | `packages/ui/src/components/Markdown.tsx` に `rehype-sanitize` (`defaultSchema`) を使う `MarkdownView`/`MarkdownEditor` が実在し、`dangerouslySetInnerHTML` を使わず AST から要素を組み立てている。ADR の記述と実装が一致。 |
| SEC8 (ai-queue-authz-payload-secret-ban) | **適合** | `docDraftPayloadSchema` に secret 系フィールドを持たせない設計。pull は `aijob.pull` (Device Flow token 必須、`rules.ts:85-90` で `credential: TOKEN`) をそのまま流用しており、既存の Device Flow 縛りを壊さない。 |
| qa-021/qa-022 (S15, markdown 共通部品) | **適合** | `MarkdownView`/`MarkdownEditor` を消費するのみで独自実装をしない設計。既存コンポーネントが実在することを確認済み。UI 側の admin 判定は表示制御のみで実際の許可判定は API 側、という多層防御の位置づけも明記されており妥当。 |
| qa-023 B1/B7 (zod 単一ソース・authz単一ミドルウェア・common/tenant スコープ) | **適合 (懸念小、§A参照)** | zod スキーマの一元化方針は妥当。ただし `docs.write_common` の追加チェックが `tenant_mismatch` の判定ロジックと絡む部分に設計上の緊張があり、下記 §A で詳述。 |
| qa-024 (tenant scope の row-level 強制) | **適合** | repository 層を1本化し (`packages/db/repository/docs-cms.ts`)、feature 側に直接 drizzle query を書かせない設計。`documents_tenant_scope_updated_idx` のインデックス設計も query パターン (tenant_id, scope, updated_at) と整合している。 |

---

## §A. 認可設計の懸念 (P05 実装前に明確化必須・条件付き承認の条件)

### A-1. `resource.tenantId` の scope-aware 差し替えが、既存コードの明示的アンチパターンと衝突する

ADR §3.1 (`GET /api/v1/docs/:id` の行) は次の設計を提案している:

> `scope='common'` の doc について、`resolveResource` が `resource.tenantId` を doc の実 `tenant_id` ではなく `ctx.tenantId` として resolve する

しかし `apps/hub/src/lib/authz/with-authz.ts` の `resolveResource` オプションのドキュメントコメントは、まさにこのパターンを明示的に禁止事項として記載している:

```
* `principal` を渡すのは所有者判定 (自分の資源か) のためだけ。
* **`resource.tenantId` を `principal.tenantId` から写さないこと** —
* 写した瞬間に両者が常に一致し、越境検査 (`tenant_mismatch`) が到達不能になる。
```

同様に `apps/hub/src/lib/authz/resource.ts` の `requestScopedResource` コメントも:

```
* **申告値をそのまま使う**のが要点。ここで principal のテナントに寄せると
* 越境要求が「自テナントへの要求」に化けて検査をすり抜ける。
```

ADR の設計は「`scope==='common'` の場合に限る」条件付きなので、tenant-scope doc の分離検査 (acceptance 1件目) 自体は壊れない — これは確認済み。しかし、この差し替えには実装コードで確認できる**副作用**がある。

`with-authz.ts` は次の監査発火条件を持つ:

```ts
if (principal.role === 'provider-admin' && principal.tenantId !== resource.tenantId) {
  await deps.audit.record({ ..., action: 'provider.cross_tenant_access', ... });
}
```

これは「provider-admin の越境要求は許可・拒否にかかわらず必ず監査へ落とす」という同ファイルの設計原則 (コメントに明記) を実装したものである。ADR の提案通り `scope==='common'` の doc で `resource.tenantId` を `ctx.tenantId` (= `principal.tenantId` 相当) に差し替えると、provider-admin が他テナント作成の common doc を読む/書く際に `principal.tenantId !== resource.tenantId` が**恒常的に false** になり、`provider.cross_tenant_access` 監査が一切発火しなくなる。これは SEC6 の直接対象 (quality_constraints 8件) ではないが、既存コードが明示的に維持している越境監査の不変条件を、docs-cms 機能だけが黙って迂回する設計になっている。

**指摘の性質**: 機能要件 (tenant 分離テスト・common 可視性) は満たすが、既存の監査不変条件 (「provider-admin の越境は必ず記録される」) を局所的に破る。これは P02 で意図的に許容するのか、それとも見落としなのかが ADR 本文からは判別できない。

**推奨対応 (P05 着手前に P02 へ差し戻すレベルの明確化が必要)**:
1. この差し替えを行うかどうかを ADR に明示的な設計判断として記載し、「common doc への provider-admin アクセスを cross_tenant_access 監査対象外とする」ことを意図的な決定として承認を得る。または
2. 差し替えを避ける代替設計を検討する。例えば `resource.tenantId` は常に doc の実 `tenant_id` を保持したまま、`decide()` の外側 (handler 内、`docs.write_common` 追加チェックと同じ手法) で `scope==='common'` かつ `tenant_mismatch` の場合だけ `docs.read` の代わりに再評価する、または `resolveEffectiveRole` に「public/common resource は tenant 一致を要求しない」という明示的な分岐を認可コア (`decide.ts`) に追加する (このコアの変更は本 feature 単独のスコープを超えるため、その場合は up-stream 論点として明記し、P02 へ差し戻して代替案を出す)。

このいずれかの判断を明文化しない限り、P05 の実装者は「監査コメントに反する実装をして良いか」を独力で判断することになり、既存のセキュリティ不変条件が feature 単位でなし崩しに崩れるリスクがある。**これが本レビューを「条件付き承認」に留め「無条件承認」にしない主な理由。**

### A-2. `docs.write_common` の追加チェックパターンは `sheets` route の用途と異なるが、設計としては妥当

ADR は「`sheets` route の `authz.can()` パターンを踏襲する」と述べているが、実際の `sheets/route.ts` (`GET`) での `authz.can('sheets.read_all')` の用途は「読み取りクエリの範囲を広げるかどうかの分岐」であり、書き込みを追加で拒否する用途ではない。用途は異なるが、`with-authz.ts` の `AuthzContext.can` のドキュメントコメントに「同じ principal/resource に対する追加 capability の照会」と明記されており、書き込み拒否方向への使用もこの設計意図の範囲内である。`try/catch` で `AuthzError` を拾って 403 に変換する仕組みも `with-authz.ts` に実装済みで、handler 内で `throw new AuthzError('insufficient_role', 403)` するパターンは wrapper がサポートしている。**この点は懸念ではなく適合と判断する** (ADR の「sheets と同じパターン」という説明表現はやや不正確だが、設計自体は既存機構の正しい使い方)。

ただし A-1 の tenantId 差し替えが PATCH にも及ぶ場合 (ADR §3.1 PATCH 行が GET 行を「同様に」参照している)、workspace-admin が他テナント作成の common doc を PATCH しようとした際に、tenantId 差し替えなしなら `tenant_mismatch` (404) で弾かれ、差し替えありなら base gate を通過して `docs.write_common` 追加チェックで `insufficient_role` (403) になる、という差し替えの有無でエラー応答が変わる。差し替えを採用する場合、これは「どのテナントが common doc を最初に作ったか」によらず一貫した 403 を返す (むしろ望ましい一貫性) という利点もある。A-1 の判断とセットで P02 に明記させること。

---

## §B. DB スキーマの根拠精度に関する懸念 (P05 実装時の注意点として引き継げるレベル)

ADR §1 は `documents` テーブルが `workspace_id` を持たない根拠として `tenantCoefficients` テーブルを先例に挙げている。しかし実装コード (`packages/db/schema/hearing-intake/schema.ts`) を確認すると:

- `tenantCoefficients` は `tenantId` を **primary key** に持つ tenant 単位の**設定シングルトン** (`id` 列すら無い、tenant あたり1行の係数テーブル)。
- 一方、同じ feature 内で新設された `hearingSheets` (行ベースのコンテンツエンティティ) と `aiJobs` (pull キュー) はいずれも `tenantId`・`workspaceId` を **両方 NOT NULL** で持つ。

`documents` は `hearingSheets` と同型の「1テナントに複数行が存在するコンテンツエンティティ」であり、構造的な近縁先例は `tenantCoefficients` (シングルトン設定) ではなく `hearingSheets`/`aiJobs` (複数行コンテンツ) である。ADR が挙げる先例は表面的には成立する (workspace_id を持たないテーブルは実在する) が、テーブルの性質が異なるため説得力が弱い。

加えて、`packages/db/scripts/check-tenant-isolation-coverage.ts` (ADR は誤って `scripts/check-tenant-isolation-coverage.ts` とパス表記しているが実体は `packages/db/scripts/` 配下) は `tenant_id` 列の有無のみを機械検査しており、`workspace_id` の要否は一切検査していないことをコード上で確認した。つまり「D4 の tenant_id/workspace_id 必須」は現状 tenant_id のみが CI で機械強制されており、workspace_id 省略は少なくとも既存の自動ゲートには抵触しない。

**指摘の性質**: requirements-baseline §3.1 (「本 feature の scope 粒度は tenant/common の2値であり workspace 粒度を要求しない」) を踏まえれば、`workspace_id` 省略という**結論自体**は妥当と考えられる (doc の可視性は workspace ではなく tenant/common で決まる設計であり、要件と整合する)。したがって P02 への差し戻しは不要。

**推奨対応 (P05 実装時の注意点)**:
- ADR の先例根拠を `tenantCoefficients` から `documents` の実際の設計理由 (「doc の可視性粒度は tenant/common の2値であり、workspace はスコープ軸に含まれない」という requirements-baseline §3.1 由来の要件) に差し替えるか、少なくとも「`tenantCoefficients` は構造の異なるシングルトンテーブルであり、真の根拠は要件 §3.1 である」と明記する形で ADR を補記することを推奨する。P05 実装者が `documents` テーブルの migration レビュー時にこの結論の妥当性を再確認できるようにするため。
- `packages/db/scripts/check-tenant-isolation-coverage.ts` へのパス表記の誤り (`scripts/` → `packages/db/scripts/`) を修正する。

---

## §C. AiJob 共通化 (pull/complete route 汎化) について

ADR §4.2 の設計 (`pullAiJobRequestSchema` の `kind` を `z.enum(AI_JOB_KINDS)` へ拡張、`claimNextSheetGenerationJob` を `claimNextJob(context, kind?)` へ一般化し既存呼び出しを薄いラッパーとして後方互換を保つ、route handler 内で `job.kind` に応じて adapter を分岐) は、既存の `ai-jobs/pull/route.ts` / `[id]/complete/route.ts` の実装を実際に確認した限り、破壊的変更なしに実現可能と判断する。

- `pull/route.ts` は現状 `pullSheetGenerationJobRequestSchema` (`kind: z.literal('sheet_generation')` 固定) を直接使っているが、リクエストスキーマを汎化しても、`hearingIntakeRuntime().repository.claimNextSheetGenerationJob(...)` の呼び出し側を薄いラッパーとして残す設計なら既存の型・戻り値契約を壊さない。
- `[id]/complete/route.ts` の監査記録 (`ai_job.complete`, `metadata: { kind: job.kind, ref_type: job.refType, ref_id: job.refId, ... }`) は `kind` を汎用フィールドとして既に扱っており、`doc_draft` を追加しても監査スキーマ変更は不要。

未解決論点として ADR §4.4 に明記されている「adapter registry パターンへの一般化は scope 外」「`pullAiJobRequestSchema` の置き場所が `hearing-intake/contracts.ts` のままで非対称性が残る」は、いずれも技術的負債として許容範囲であり、P02 の判断 (scope 外として先送り) は妥当。P05 で 2 分岐の if/switch を実装する形で問題ない。

---

## まとめ

| 判定要素 | 結果 |
|---|---|
| acceptance 3件 (tenant 分離テスト・XSS sanitize テスト・監査 event 記録) | 設計上は充足可能。ただし §A-1 の監査不変条件の扱いを明確化しないと、監査要件の「意図」に対する解釈がぶれる |
| quality_constraints 8件 | 全て設計上充足可能。§A-1 のみ既存コードの明示的アンチパターンとの衝突が要説明 |
| 致命的欠陥 (差し戻し相当) | **無し** |
| 条件付き承認の条件 | §A-1: `resource.tenantId` の common-scope 差し替えによる provider-admin 越境監査の抑制について、意図的な設計判断であることを ADR に明記するか、代替設計を検討すること (P04 着手前に対応) |
| P05 実装時の注意点として引き継ぐ事項 | §B (先例根拠の精度、パス表記修正)、§C (AiJob 汎化の実装順序) |

以上により、**条件付き承認**とする。§A-1 の明確化を P02 (本 ADR の追記) で行った上で P04 (詳細設計/実装計画) へ進めることを推奨する。

## 追記: §A-1 対応完了 (承認条件充足)

ADR §3.1/§6 を改訂し、`resource.tenantId` を doc の実 tenant_id へ差し替える設計を撤回した。改訂後は `resource.tenantId` を常に header 申告値のまま解決し (`resource.ts`/`with-authz.ts` の既存不変条件を維持)、common doc の可視性は repository 層の `or(scope='common', tenant_id=ctx.tenantId)` 条件のみで担保する設計に変更した。これにより `decide()` の `tenant_mismatch` 判定にも `provider.cross_tenant_access` 監査発火条件にも影響を与えない。§B (先例根拠) も `documents` の実質的根拠 (requirements-baseline §3.1) へ差し替え済み。承認条件はすべて充足したため、**無条件承認**へ更新し P04 へ進めることを確認する。
