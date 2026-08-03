---
status: confirmed
layer: feature-quality
task: SYS-TENANT-DATA-RETENTION-P10
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
source: [docs/features/feat-tenant-data-retention/acceptance-record.md, docs/features/feat-tenant-data-retention/quality-assurance-report.md]
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: []
---

# feat-tenant-data-retention P10 独立最終レビュー記録

- graph_node_id: `SYS-TENANT-DATA-RETENTION-P10`
- feature_context_digest: `sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`
- レビュー実施日: 2026-08-03
- レビュー方法: [acceptance-record.md](./acceptance-record.md) (P07) と [quality-assurance-report.md](./quality-assurance-report.md) (P09) を突き合わせ、両者が同じ根拠 (テスト証跡) を指しているかを再検証する独立レビュー

## 1. quality_constraints 6 件の最終確認

| quality_constraint | P07 (acceptance-record.md) の記載 | P09 (quality-assurance-report.md) の記載 | 突き合わせ結果 |
| --- | --- | --- | --- |
| `c4-revision-tenant-data-retention-qa045-048-appr007` | A2 (削除完全性) の対応 constraint | §2 削除不完全対策 (即時完全削除・soft delete 不使用) | 一致。DB は R2 参照+メタデータのみ保持する列制約という同一の根拠 |
| `tenant-data-envelope-encryption-numeric-contract` | A3 (暗号化検証) の対応 constraint | §1 テナント越境読取防止の封筒暗号化行に含む | 一致。UNIQUE(tenant_id,purpose,key_version)・rotation の同一根拠 |
| `immediate-full-deletion-r2-db-backup-contract` | A2 の対応 constraint | §2 の R2 blob 削除・backup 断面非復元行 | 一致。R2 blob・DB row・backup tombstone を同一 transaction/workflow で更新する記述が両文書で同一 |
| `tenant-cross-boundary-read-prevention-t14-r2-prefix` | A1 (テナント分離) の対応 constraint | §1 全体 (T14 対策 5 層) | 一致。P09 は P07 の 3 項目 (スキーマ駆動テスト・R2 prefix 分離・存在秘匿) に加え、認可 MW 通過後の復号という 4 層目を追加確認しており、矛盾なく補強関係にある |
| `r2-usage-monitoring-alert-cron-extension` | acceptance 3 件の直接対象外と明記、P06 実装済みと記録 | §3 で運用確認として独立に検証 (cron 登録・閾値通知・Turso secret planned 状態) | 一致。P07 が「対象外だが実装済み」とした暫定記載を、P09 が cron dispatch 登録・通知閾値・secret 運用状態まで独立に実測して確定させている |
| `tenant-data-api-endpoint-detail-deferred-to-p02` | A1/A2 の実行経路として API-1〜API-5 (20 tests) を記載 | §1/§2 で同じ API-3〜API-5 テストを根拠として引用 | 一致 |

**6 件すべて、P07 と P09 で参照するテスト証跡・実装事実に矛盾がないことを確認した。**

## 2. acceptance 3 件の最終確認

| acceptance | P07 判定 | P09 による補強確認 | 最終判定 |
| --- | --- | --- | --- |
| A1: テナント分離 (他テナントの業務データが取得不可) | 満たす | §1 で認可 MW 通過後にのみ復号する経路 (先に復号してから認可判定する経路が無い) を追加確認、越境防止がスキーマ・暗号化・R2 key・認可 MW の 4 層で独立に効く構成であることを確認 | **満たす** |
| A2: 削除完全性 (R2 blob・DB row・backup 断面から残存しない) | 満たす | §2 で監査 event 記録・API 経路での一覧/取得からの即時消失を追加確認 | **満たす** |
| A3: 封筒暗号化 (R2 上に平文が存在しない、テナント別 DEK) | 満たす | §1 (封筒暗号化行) で cross-tenant unwrap 拒否・AAD 不一致・rotation を再言及、矛盾なし | **満たす** |

## 3. feature context の scope_in/acceptance 全件の P10 責務追跡

`feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327` の
scope_in は本ファイル (`final-review-record.md`) 1 件のみであり、P10 の acceptance 2 件
(quality_constraints 6件・acceptance 3件の最終確認記載、feature context 全 scope_in の追跡) は
本ファイルの §1〜§2 (6件・3件の確認) と本節 (未割当 0 件の明記) でともに充足する。

**未割当項目: 0 件。**

## 4. 最終レビュー判定

**quality_constraints 6 件・acceptance 3 件のいずれも、P07 と P09 の独立した検証経路から矛盾のない
結論が得られており、問題は検出されなかった。**

P07 (acceptance-record.md) にも記載の通り、本レビューは**テスト環境での確認**の範囲であり、本番環境
での smoke test は P13 (リリース/デプロイ) の範囲である。P13 未実施の時点では「本番で動作する」ことを
主張しない。また Turso Platform API の secret (`TURSO_API_TOKEN` 等) は `planned` (未投入) のままで
あり、この運用状態は P09 で確認済みの制約として P10 でも変更なく引き継ぐ。

P11 (再現可能な証跡) へ引き継ぐ。

## 5. 2026-08-03 最終差分レビューの是正

最終レビューで、既存 global DEK の KEK-wrap AAD を変更すると既存 `salary` / `idp_secret` を復号できなくなる
後方互換性の欠陥と、`tenant_data_tombstones` が日次 export 対象外で古い backup restore に効かない欠陥を検出した。
どちらも承認済みの AD-1 / AD-6 を変えるものではなく、実装を ADR の安全条件へ戻す是正である。

| 是正 | 判定根拠 | 検証 |
| --- | --- | --- |
| global DEK AAD | legacy 形式 `${purpose}:v${keyVersion}` を維持し、tenant_data だけ tenant id を加える。scope の runtime 検査も追加 | legacy wrap からの salary round-trip、tenant id 欠落の fail-closed テスト |
| backup tombstone | export を `allTables` 対象にし、削除後 manifest を古い snapshot restore に適用 | DMDB-T06 の実 restore、DMDB-T16 TC-8 |

対象 DB テスト、型検査、整形、artifact placement、task-spec validator、graph schema validator を再実行し、いずれも PASS。
本番 deploy / secret 投入 / smoke は P13 の外部操作として未実施のまま維持する。
