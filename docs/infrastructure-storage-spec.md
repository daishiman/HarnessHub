---
status: confirmed
layer: implementation-spec
sources: [docs/infrastructure-spec.md, system-spec/infrastructure.md, system-spec/security.md]
---

# Harness Hub R2 storage 実装仕様書

`docs/infrastructure-spec.md` §3 から分離した R2 の詳細正本。Workers binding は同書 §2、backup/DR は §10 を参照する。

| バケット | key 設計 | 書込経路 (それ以外は禁止) | 公開 |
|---|---|---|---|
| `harness-hub-packages` | `packages/<sha256>.zip` (content-addressed, **immutable**) | publish pipeline (`PUT /publish/:id/package` 検査通過後) のみ | 非公開。配信は Worker 経由 (認可 + 監査) |
| `harness-hub-backups` | `db-export/<YYYY>/<YYYY-MM-DD>.jsonl.gz` | GitHub Actions 日次 export のみ | 非公開 |
| `harness-hub-tenant-data` | `tenant/<tenant_id>/<workspace_id>/<kind>/<object_id>` (行ごとに一意) | Hub tenant-data API (認可・所有権検証・監査通過後) のみ | 非公開。暗号文のみを保存し、削除時は直ちに物理削除 |

- packages は上書き・削除を行わない (content hash 一致 = 同一実体。suspend は DB 側 status で表現)。
- S01 の Web upload と Publisher CLI upload は同じ staging prefix・検査 pipeline・content hash 確定処理へ収束させる。ブラウザから R2 への公開 write URL は発行しない。
- install/download は Worker の `POST /api/v1/harnesses/:projectId/install` を必ず経由する。R2 bucket/object key を UI/API へ返さない。Stage 0 で raw ZIP を採用した場合だけ、安定版に固定した TTL 5 分以内・単回の短命 URL を発行する。
- backups の保持: **直近 90 日 + 各月 1 日断面を 12 ヶ月** (R2 lifecycle rule で自動削除)。salary は暗号文のまま格納される (qa-032: バックアップ断面にも平文を残さない)。
- `tenant_data` は `harness-hub-tenant-data` に暗号文だけを保存する。PackageRegistry と bucket を分離し、行単位 AAD と即時物理削除を両立させる。同一内容の重複保存は許容する。
- 無料枠: 10GB / Class A 100万 ops/月 / Class B 1,000万 ops/月。使用量は月次レビュー (infrastructure-spec §11)。
