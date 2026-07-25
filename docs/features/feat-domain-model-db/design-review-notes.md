---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P03
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
reviewer: independent-fork (P02 実行 context から独立した subagent。read-only で一次資料を再参照)
consumes: [docs/features/feat-domain-model-db/architecture-decision-record.md, docs/backend-spec.md, docs/shared-layers.md, .dev-graph/plans/feature-package-feat-user-org-admin/workstream-inventory.json, .dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-02-architecture.md]
---

# feat-domain-model-db 独立設計レビュー記録 (P03)

> **位置づけ**: P02 の architecture-decision-record.md を P02 実行者から独立した context (read-only subagent fork) でレビューした記録。ADR 自体の書き換えは行わず、判定と根拠のみを記録する。

## 観点 1: User 基底テーブル owner 判断 — **承認**

3 系統の証跡を独立に再参照し、結論「feat-domain-model-db が users テーブル (department/salary 含む) の owner」を再現できた。

- (a) docs/backend-spec.md:53 の users 行は department/salary を含む単一行の既存確定・不変定義であり、§2.3 Studio 拡張は users.department/users.salary を定義・所有しない。
- (b) feat-user-org-admin の実 write_scope は `.dev-graph/plans/feature-package-feat-user-org-admin/workstream-inventory.json:450` (P05) / `:740` (P08) で `packages/db/schema/user-org-admin/` に限定され、`packages/db/schema/core/` と分離している。goal-spec の `user-base-table-schema-owner-unresolved-p02` が付託する「P02 必須解消」を ADR §1 は正しく discharge している。
- (c) salary の admin 限定 (docs/backend-spec.md:126,173)・封筒暗号化と監査 (docs/security-spec.md:481-492)・PII ガード共通層 owner=feat-hub-foundation (feat-user-org-admin 自身の phase-02 スコープ外記述:76 でも裏づけ) により、スキーマ owner と業務ロジック owner の分離は妥当。
- cross-feature follow-up (feat-user-org-admin phase-02 の「User 拡張カラム設計」記述 :37/:48 との矛盾) の申し送りは正当。

## 観点 2: 18 テーブル定義の一致性 — **承認**

backend-spec §2.2 = 18 テーブル、ADR §2 = 同一 18 テーブルで過不足なし。encryption_keys は security-spec §4.1.1 と、audit_events の seq/prev_hash/event_hash は §5.4.1 と完全一致。宣言済み設計判断 (target_channels/releases 等への tenant_id 非正規化 = §2.1 blanket rule と qa-024 に整合、created_at 補完 = 「主な列」の非網羅性と qa-032 に整合、tenant 非スコープ 4 テーブルの TENANT_SCOPE_EXEMPT 宣言 + P09 fail-closed 検査) はいずれも妥当。未宣言の欠落・余分は検出されなかった。tenant_id 保有 14 + 非スコープ 4 = 18 の内訳も内部整合。

## 観点 3: 接続層隔離設計 — **承認**

spec-state.json qa-020 と docs/backend-spec.md:19-24 の規約 (DB アクセスをリポジトリ層に閉じ、D2 ヘッジをアプリ層へ波及させない) に対し、ADR §3 の DatabaseAdapter 境界 + CI 禁止検査 (check-connection-layer-isolation.ts) は合致。D1 に interactive transaction が無い前提は D1 実行モデル (batch のみ) の既知の性質として妥当で、libSQL=BEGIN IMMEDIATE (security-spec §5.4.3 と一致) / D1=UNIQUE 競合検出+再試行の両立設計は技術的に正しい。

## 観点 4: qa-045 scope-out 判断 — **承認**

goal-spec (6ac94e1d…) を `qa-045|tenant_data_objects|retention` で grep して該当 0 件 (出現 qa は qa-002/004/011/017/019/020/024/032 のみ) — ADR §11 の結論を再現できた。follow-up feature は `features/feat-tenant-data-retention.md` として実在し、beads_linkage = HarnessHub-47b が ADR の記述と一致。同 feature の scope_out が feat-domain-model-db 既管理の封筒暗号化を明示的に除外しており、責務境界は明確。

## 総合判定 — **全観点承認** (P02 への差し戻し不要)

軽微な文言精度の注記 2 点 (要是正ではない。ADR へ反映済み):

1. ADR §1 証跡 1 の「§2.3 に department への言及が一切ない」は、hearing_sheets.department (申請者部門の snapshot 列 = 別テーブルの非正規化コピー) の存在により厳密には不正確。users 列の owner 主張には影響しない。
2. ADR §11 の grounding qa 列挙 (qa-004/017/019/020/024/032) は goal-spec に出現する qa-002/qa-011 を含まない。qa-045 不在という核心的結論には影響しない。

## Rollout

全観点承認のため P04 (テストファースト設計) へ引き継ぐ。差し戻し条件 (いずれかの観点で要是正) には該当しない。
