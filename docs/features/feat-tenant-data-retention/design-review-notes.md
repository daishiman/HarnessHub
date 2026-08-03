---
status: resolved
layer: feature-design-review
task: SYS-TENANT-DATA-RETENTION-P03
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
source: docs/features/feat-tenant-data-retention/architecture-decision-record.md
reviewed_artifact: docs/features/feat-tenant-data-retention/architecture-decision-record.md
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: [arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-infrastructure]
---

# feat-tenant-data-retention 独立設計レビュー記録 (P03)

> **位置づけ**: P02 の [architecture-decision-record.md](./architecture-decision-record.md) (以下 ADR) を、P02 の判断過程に依存せず要件・既存実装・既存 security-spec の証跡から再導出して検証した記録。本書はレビューのみを行い、ADR 自体は編集しない。是正指摘は AD-1〜AD-3/AD-6 に対する **P05 実装の拘束条件**として引き継ぐ。

## 総合判定

| 観点 | 対象 AD | 判定 |
|---|---|---|
| R1. encryption_keys 拡張の非破壊性・DEK 管理契約の完全性 | AD-1 | **条件付き承認** (是正指摘 C1・C2) |
| R2. R2 object 単位 AAD 運用の正しさ | AD-2 | **要是正** (是正指摘 C3 — R3 と根が同じ設計欠陥) |
| R3. R2 tenant prefix 分離とコンテンツアドレス方式の整合 | AD-3 | **要是正** (是正指摘 C3) |
| R4. API 設計 (endpoint・zod・rate limit) の規約整合 | AD-4 | **承認** (付記 N1) |
| R5. R2 使用量監視の cron 統合方針 | AD-5 | **承認** |
| R6. 削除完全性テスト T-15 の採番・網羅性 | AD-6 | **条件付き承認** (是正指摘 C3 の帰結・付記 N2) |
| R7. テナント越境読取ケースの §8.4 追加 | AD-7 | **承認** |

**総合: 要是正 (P02 へ差し戻し)。** C3 (AD-2/AD-3 のコンテンツアドレス方式と行単位 AAD/物理削除の非両立) は acceptance #2 (削除完全性) と #3 (暗号化検証) の両方に波及する設計矛盾であり、P05 着手前に AD-2/AD-3/AD-6 のいずれかを修正して解消する必要がある。C1/C2 は AD-1 の実装拘束条件として明記されていないため、ADR 本文への追記(または P05 引き継ぎ文書での明記)を要求する。

---

## R1. `encryption_keys` 拡張の非破壊性・DEK 管理契約の完全性 — 条件付き承認

### 検証: 既存 salary/idp_secret との非破壊共存

`packages/db/schema/core/security.ts:34-46` を確認した。既存 `encryptionKeys` は `purpose: enum(['salary','idp_secret'])` と `UNIQUE(purpose, key_version)` のみで tenant scope 列を持たない。AD-1 の `tenant_id` nullable 列追加 + partial index 置換 (`WHERE tenant_id IS NULL` / `WHERE tenant_id IS NOT NULL`) は、既存行が全て `tenant_id=NULL` のまま解釈されるため意味論を変えない。§8 の migration compatibility 節も非破壊化の手順 (ADD COLUMN → partial index 置換 → 既存 `encryption.test.ts` の継続 PASS) を明記しており、**非破壊性は妥当**。

### 是正指摘 C1: `wrapAad` (KEK wrap 用 AAD) の tenant scope が未更新のまま — 是正必須

`packages/db/repository/crypto.ts:124-126` の `wrapAad(purpose, keyVersion)` は `ColumnRef.rowId` を `` `${purpose}:v${keyVersion}` `` で構成する。既存の `UNIQUE(purpose, key_version)` 制約下ではこの文字列が `encryption_keys` の行を一意に指すため、`docs/security-spec-data-integrity.md` §4.1 の AAD 規約 (「暗号文の他行への移植 [cut-and-paste 攻撃] を防ぐ」) が成立している。

AD-1 が追加する `UNIQUE(tenant_id, purpose, key_version)` の下では、`purpose='tenant_data'` かつ同一 `key_version` を持つ行が**テナントごとに複数存在しうる**。ところが AD-1 は「active 強制は既存の guardedWrite によるアプリ層トランザクション制御を踏襲する (既存 rotateDek と同一パターン)」と述べるのみで、この KEK-wrap 用 AAD (`wrapAad`) を tenant_id を含む形へ更新することに触れていない。このままでは、複数テナントの `encryption_keys` 行が同一の AAD (`tenant_data:v1` など) を持ちうる状態になり、AAD による行紐付け (cut-and-paste 防止) が tenant_data の行に対して機能しなくなる。

> **要求**: AD-1 (または P05 引き継ぎ) に「`wrapAad` 相当の AAD 材料に `tenant_id` (または `encryption_keys.id`) を含める」ことを明記すること。

### 是正指摘 C2: テナント別 active DEK 判定クエリの scope が明記されていない — 是正必須

AD-1 は新設ファイル `packages/db/src/repository/tenant-deks.ts` を挙げるが、「既存 `ColumnCipher` の purpose 別 DEK cache パターンを踏襲する」という記述のみで、`activeDekVersion` / `latestDekVersion` 相当のクエリが `tenant_id` を WHERE 句に含めるべきことを明示していない。既存実装 (`crypto.ts:128-146`) は `purpose` のみで絞り込んでおり、これをそのまま流用すると tenant_data では「他テナントの active DEK」を誤って参照する経路が生まれる (テナント越境の暗号化コンテキスト混線)。

> **要求**: AD-1 に「tenant-deks.ts の active/latest 判定は `tenant_id` と `purpose` の両方で絞り込むこと」を明記すること。

### 是正指摘なし: DEK 削除手順

requirements-baseline.md quality_constraint (`tenant-data-envelope-encryption-numeric-contract`) は「rotation/deletion を実装する」と要求しているが、AD-1 は rotation のみを詳述し DEK 自体の削除 (テナント解約時等) を明記していない。ただし acceptance 基準・AD-6 のいずれも「テナントデータの削除」を要求しているのみで「DEK 台帳行の削除」までは要求していないため、**是正指摘とはしない**。P08/P12 の runbook でテナント解約時の DEK 取り扱い (retire のみか、物理削除もするか) を明記すべき、と付記に留める。

---

## R2/R3. R2 object 単位 AAD 運用 と tenant prefix コンテンツアドレス方式の整合 — 要是正

### 検証方法

AD-2 (AAD = `` `tenant_data_objects:content:{id}` ``) と AD-3 (R2 key = `tenant/{tenant_id}/{workspace_id}/{kind}/{content_hash}` による content-addressed 収束) を、それぞれ独立に読んだ上で組み合わせて動作させたときに矛盾が生じないかを検証した。

### 是正指摘 C3 (重大): コンテンツアドレス収束と行単位 AAD/物理削除が両立しない

AD-3 は「同一内容の再アップロードは同一 key に収束し重複保存を避ける」と明記している。これは同一 `tenant_id`/`workspace_id`/`kind`/`content_hash` の組で **複数の `tenant_data_objects` 行が同一 R2 key を共有しうる**ことを意味する (例: 同じドキュメントを 2 回・2 人がアップロードした場合)。

一方で AD-2 は AAD を行 ID (`tenantDataObjectId`) に束縛している。複数行が同一 R2 key (=同一暗号文の格納先) を共有する場合、以下のいずれかの矛盾が生じる。

1. **2 回目のアップロードが実際に暗号化・upload を実行する場合**: 2 回目は行 id2 の AAD で暗号化した ciphertext を同じ R2 key へ上書きする。すると 1 回目の行 (id1) が後から `GET content` しようとした際、実際に格納されている ciphertext は id2 の AAD で暗号化されているため、id1 の AAD で復号を試みると **AAD 不一致で復号が失敗する** (`crypto.ts:95-97` の `EncryptionError`)。これは削除も編集もしていない行が突然読めなくなるという可用性・正当性の欠陥である。
2. **2 回目のアップロードが「既に key が存在するのでスキップ」する場合**: 行 id2 は自分の AAD (id2 束縛) で復号することを期待するが、格納されているのは id1 の AAD で暗号化された ciphertext であるため、**id2 の `GET content` が最初から復号不能**になる。

さらに AD-6 の T-15 は「R2 実体: 削除 API 実行後、当該 `r2_key` に対する GET が 404 になること」を求めている。行 id1 の削除 API を呼ぶと、同じ `r2_key` を共有している行 id2 (未削除・削除 API を呼ばれていない) の実体まで物理削除されてしまう。これは「削除していない業務データが、他者の削除操作によって消える」という acceptance #2 (削除完全性) の趣旨に反する重大な副作用であり、同時に AD-3 が意図した重複排除の利点を安全に享受できないことを意味する。

> **要求 (P02 差し戻し・いずれかで解消)**:
> - (a) content-addressed 収束を撤回し、行ごとに一意な key (例: `.../{kind}/{tenantDataObjectId}` または `{content_hash}-{tenantDataObjectId}`) を採用して重複保存を許容する。AAD 行束縛をそのまま維持できる。
> - (b) 収束を維持する場合、R2 key を「参照カウント付き content-addressed blob」として扱い、暗号化キー材料は行単位ではなく `(tenant_id, content_hash)` 単位で固定し (AAD も `content_hash` 束縛に変更)、削除 API は参照カウントが 0 になった時点でのみ物理削除する設計へ変更する。この場合 T-15 のテストケース定義 (「削除 API 実行後、当該 r2_key への GET が 404」) も「他行から参照されていない場合に限る」への修正が必要。
>
> いずれを選んでも AD-2・AD-3・AD-6 の記述整合を取り直す必要があるため、**P02 への差し戻し**とする。

---

## R4. API 設計 (endpoint・zod・rate limit) の規約整合 — 承認

### 検証: ベースパス・スキーマ単一ソース・エラー形式

`docs/backend-spec.md` §3.1 相当の確定 (ベースパス `/api/v1`・zod 単一ソース `packages/schemas`・RFC 9457) と AD-4 の記述は一致する。認可 MW (deny-by-default) を全 endpoint に通す方針も §8.7 の gate 要求と一致する。

### 検証: rate limit 数値の整合性

`docs/security-spec-request-controls.md` §7.2 の既存確定テーブルと AD-4 の数値を突き合わせた。

| AD-4 | 既存 §7.2 の類似カテゴリ | 整合 |
|---|---|---|
| upload 20/分 | `publish`/`feedback` 20/分 (書込系の一般的閾値) | 整合 |
| 一覧・メタ取得 120/分 | 「一般 API (session) 120/分」 | 整合 (同一カテゴリ) |
| 本体取得 60/分 | `metrics/events` 60/分 (中間的な閾値の実例あり) | 妥当な範囲内 |
| 削除 20/分 | upload と同様の書込系 | 整合 |

### 付記 N1: §7.2 表への反映漏れ

§7.2 は「調整 (feature P02) は実測に基づく調整のみ。方式・鍵の変更は R4-reopen」と定めているが、tenant-data 5 endpoint は §7.2 の表に**行として存在しない新規追加**である。ADR は新規行の追加という性質を明示しておらず、`docs/security-spec-request-controls.md` §7.2 への転記(通常の spec reflection receipt 経路)が P02 の成果物からは読み取れない。**是正指摘とはしないが**、P05/P12 で §7.2 表への当該 5 行の反映を確実に行うことを申し送る。

---

## R5. R2 使用量監視の cron 統合方針 — 承認

`docs/infrastructure-spec.md` §5 の cron dispatch 構成 (`0 15 * * *` の ① metrics rollup → ② Turso 使用量監視 → ③ orphan_candidate 通知 → ④ token 掃除) と、AD-5 が「② の直後に追加」とする記述は一致する。新規 cron trigger を追加しない設計は、同 §5 の「cron trigger 5 本はアカウント単位で共有され、増設は避けるべき」という制約とも整合し、**妥当な判断**。既存 Turso 監視と同一閾値 (70%/90%) を踏襲し、バケット種別を通知に明記する点も admin 判別性を担保しており問題ない。

---

## R6. 削除完全性テスト T-15 の採番・網羅性 — 条件付き承認

### 検証: 採番衝突の有無

`docs/security-spec-assurance.md` §8.3 の単体・結合テスト一覧は `T-1`〜`T-14` まで採番済みで `T-15` は空き番号である。AD-6 の「§8.3 テスト ID の T-15」と「§1.3 脅威モデルの T15」が異なる採番空間である旨の注記も、`docs/security-spec-foundations.md` の記述 (脅威 ID 独自連番) と整合しており、**採番衝突は無い**。

### 条件: C3 の解消が前提

T-15 の 4 点確認のうち「1. R2 実体: 削除 API 実行後、当該 `r2_key` への GET が 404」は、R2/R3 で指摘した C3 (コンテンツアドレス収束と物理削除の非両立) が解消されない限り、正しく定義できない (共有 blob のケースで判定基準が矛盾する)。**判定は条件付き承認とし、C3 解消後にテストケース定義を合わせて確定すること。**

### 付記 N2: backup tombstone の適用範囲

AD-6 の 3 番目 (backup tombstone) は P01 の Normative implementation closure を正しく汲んでおり、`docs/security-spec-foundations.md` T15 の「§8.3 削除完全性テスト (R2実体・DB行・キャッシュ)」記載よりも厳格 (tombstone 確認を追加) にしている。この上書きは要件の上位互換であり問題ない。

---

## R7. テナント越境読取ケースの §8.4 追加 — 承認

`docs/security-spec-foundations.md` T14 の検証先が「§8.4 分離テスト (業務データ越境読取ケース)」と既に明記されており、AD-7 が新規テスト ID を採番せず既存テナント分離テストスイート (§8.4・CI 必須・SEC3) へケース追加するとした判断は、`docs/security-spec-assurance.md` §8.4 の「テーブル追加時にこのテストが未対応なら CI が fail する (スキーマ駆動)」という既存の網羅担保の仕組みとも整合する。requirements-baseline.md acceptance #1 とも一致する。**是正指摘なし。**

---

## 是正指摘事項 (P02 差し戻し・P05 拘束)

| id | 内容 | 深刻度 | 引受 phase |
|---|---|---|---|
| C3 | AD-3 のコンテンツアドレス収束 (同一 key 共有) と AD-2 の行単位 AAD・AD-6 の行単位物理削除が両立しない。複数行が同一 R2 key を共有した場合、他行の削除操作で自行の実体が消える、または AAD 不一致で復号不能になる | **重大 (acceptance #2/#3 に波及)** | P02 (ADR 修正)。方式 (a) 一意 key 化 / (b) 参照カウント方式のいずれかを選定し AD-2/AD-3/AD-6 を整合させること |
| C1 | `wrapAad` (KEK wrap 用 AAD) を tenant_id 込みへ更新することを AD-1 に明記する | 重大 (テナント間 AAD 紐付けの弱体化) | P02 (ADR 追記) / P05 (実装) |
| C2 | tenant-deks.ts の active/latest DEK 判定クエリが `tenant_id` と `purpose` の両方で絞り込むことを AD-1 に明記する | 重大 (テナント間 DEK 混線の恐れ) | P02 (ADR 追記) / P05 (実装) |
| N1 (付記) | tenant-data 5 endpoint の rate limit を `docs/security-spec-request-controls.md` §7.2 表へ反映する | 軽微 | P05/P12 |
| N2 (付記) | テナント解約時の DEK 取り扱い (retire のみか物理削除も行うか) を P08/P12 runbook に明記する | 軽微 | P08/P12 |

## P02 差し戻しの要否

**要 → 反映済み (2026-08-03)。** C3 は AD-2・AD-3・AD-6 の 3 系統にまたがる設計矛盾であり、acceptance #2 (削除完全性テスト PASS) と acceptance #3 (暗号化検証テスト PASS) の両方に波及するため、P05 着手前に ADR の該当箇所を修正する必要があった。[architecture-decision-record.md](./architecture-decision-record.md) を以下のとおり修正済み:

- C3: AD-3 の R2 key を content-addressed (`content_hash` 末尾) から**行単位で一意** (`tenant_data_objects.id` 末尾) へ変更。方式 (a) を採用し content-addressed 収束を撤回。AD-2 (行単位 AAD)・AD-6 (行単位物理削除) との整合を回復した。
- C1: AD-1 に `wrapAad` の tenant_id 込み化 (`` `${purpose}:${tenantId ?? 'global'}:v${keyVersion}` ``) を追記。
- C2: AD-1 に `tenant-deks.ts` の active/latest DEK 判定クエリが `tenant_id` と `purpose` の両方で絞り込むことを追記。
- N1/N2: AD-4/§8 にそれぞれ申し送りとして追記済み。

修正後、`python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-tenant-data-retention` を再実行し PASS を確認した。P04 (テストファースト設計) は着手可能な状態である。

## 参照

- レビュー対象: [architecture-decision-record.md](./architecture-decision-record.md)
- 要件: [requirements-baseline.md](./requirements-baseline.md)
- 正本: `docs/security-spec-data-integrity.md` §4.1/§4.1.1/§4.1.2、`docs/security-spec-foundations.md` §1.3 (T14/T15)、`docs/security-spec-assurance.md` §8.3/§8.4、`docs/security-spec-request-controls.md` §7.2、`docs/infrastructure-spec.md` §3/§5、`docs/backend-spec.md` §3.1、`packages/db/schema/core/security.ts`、`packages/db/repository/crypto.ts`
