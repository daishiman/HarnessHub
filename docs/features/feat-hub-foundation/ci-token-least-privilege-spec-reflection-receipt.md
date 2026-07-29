---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-bda4
dev_graph_node_id: issue-ci-token-least-privilege-20260725
feature_node_id: feat-hub-foundation
spec_impact: reflected
reviewed_at: 2026-07-29
---

# Cloudflare token 最小権限分離 仕様反映受領書

## 1. 依頼と目的

`HarnessHub-bda4` (`issue-ci-token-least-privilege-20260725`) の最終レビューとして、GitHub Actions が共用していた Cloudflare token を Workers deploy と R2 object 操作に分離し、漏洩時の影響範囲を一方の用途へ閉じ込める。dev-graph node ID は `issue-ci-token-least-privilege-20260725`。

## 2. 結論

- **仕様影響: あり (`reflected`)**。CI/CD credential の権限境界が変わるため、`infrastructure.web` を正式に reopen し `qa-090` として再確定した。
- **製品契約への影響: なし**。外部 API、DB schema、認証認可モデル、UI、Cloudflare Worker の deploy unit は変更しない。
- **repository 実装: 完了**。workflow、機械可読 secret 台帳、静的回帰テスト、運用文書、feature / architecture / task / issue の正本を同期した。
- **外部実測: 未完了**。Cloudflare token 発行、GitHub secret 投入、deploy token の R2 write 拒否、R2 token での workflow 完走が残るため、Beads は継続中とする。

## 3. 中学生向けの説明

今までは、同じ 1 本の「合鍵」でアプリの入れ替えとバックアップの書き換えの両方ができました。この合鍵が盗まれると、アプリとバックアップをまとめて壊されるおそれがあります。

そこで合鍵を 2 本に分けました。1 本はアプリの入れ替え専用、もう 1 本はバックアップ専用です。どちらかが盗まれても、もう片方までは操作できません。プログラムが間違った鍵を使っていないことは自動テストで確認します。本物の鍵の発行と GitHub への登録は、秘密の値を安全に扱える環境で別途行います。

## 4. 専門的な説明

`CLOUDFLARE_API_TOKEN` を Workers deploy / rollback に限定し、`CLOUDFLARE_R2_API_TOKEN` を日次 backup と production smoke の R2 object put/get/delete に限定した。Wrangler の `r2 object ... --remote` は Cloudflare REST API を使うため、S3 互換 API 専用の bucket-scoped `Workers R2 Storage Bucket Item Write` は利用できない。R2 token は account-scoped `Workers R2 Storage Write` とし、Workers Scripts 権限を付与しない。

静的ゲートは、Actions secret 台帳と workflow 実参照の双方向一致に加え、deploy step と R2 操作 step が互いの token を参照しないことを検査する。実環境の権限は静的検査では証明できないため、`--live` 検査、拒否系実測、workflow run を完了証拠とする。

## 5. 仕様反映の正規フロー

1. `system-spec/spec-state.json` の `infrastructure.web` を reopen。
2. `qa-090` で qa-084 の runtime 認証・rollout 契約を保持しつつ、2 token の権限境界、REST API の permission 制約、外部実測待ちの完了境界を統合。
3. system-spec coverage / source citation を検証。
4. 正規 compiler で `system-spec/infrastructure.md` を再生成。
5. 詳細仕様・上位設計・feature・task・issue へ差分反映。

反映先:

- `system-spec/spec-state.json`
- `system-spec/infrastructure.md`
- `docs/infrastructure-spec.md`
- `docs/features/feat-hub-foundation/runbook.md`
- `docs/features/feat-hub-foundation/release-notes.md`
- `features/feat-hub-foundation.md`
- `specs/harness-hub-system-specification.md`
- `architecture/harness-hub-infrastructure.md`
- `tasks/feat-hub-foundation/sys-hub-foundation-p13.md`
- `issues/ci-token-least-privilege-20260725.md`

## 6. 最終レビューと品質ゲート

| ゲート | 結果 |
| --- | --- |
| main 同期 | `origin/main` = local `main` = `ca776dea`、本 branch へ fast-forward merge 済み |
| `git status` / diff review | 本件 17 ファイルだけを対象化。既存の無関係差分なし |
| Actions secret 台帳 | workflow 参照 13 件 = 台帳 13 件 |
| 対象 Vitest | `actions-secrets.test.ts`: 15/15 pass |
| workflow step guard | 10 workflows / violations 0、self-test 6 pass |
| task 仕様 | `feat-hub-foundation` / `feat-domain-model-db` とも `status: pass` / `violations: []` |
| system-spec | coverage complete + foundation pass、source citation pass、harness tests 432 pass |
| dev-graph | schema valid、変更 5 node の source digest mismatch 0 |
| workspace 全体 | `pnpm verify` exit 0。Worker bundle 1.200 MiB / 3.000 MiB |
| CI 集約 | 123 pass / 4 段階導入 warning / 0 fail |
| 文書 | artifact placement pass、line limit 419 文書 pass、変更文書はすべて 300 行以下 |
| patch | `git diff --check` pass |

system-spec 検証の初回実行ではスクリプトの配置パスを誤って exit 2 となったが、正本の `plugins/system-spec-harness/scripts/` を確認して再実行し、上表の最終結果を得た。CI 集約の初回実行ではローカル Python の `rpds-py` が異なる CPU architecture で、`jsonschema` import が失敗した。`requirements-dev.txt` を再導入後に同じゲートを再実行し、123 pass / 0 fail を確認した。

## 7. 残課題

- Cloudflare で deploy token と R2 token を発行する。
- GitHub repository secret へ用途別に投入し、`node scripts/ci/check-actions-secrets.mjs --live` を通す。
- deploy token による R2 write が拒否されることを実測する。
- `hub-backup` と production smoke を R2 token で完走させる。
- 以上の証跡が揃うまで `HarnessHub-bda4` を close しない。
