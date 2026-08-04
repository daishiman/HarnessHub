---
status: confirmed
layer: feature-release
task: SYS-PUBLISHER-PLUGIN-P13
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: docs/features/feat-publisher-plugin/final-review-record.md
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin リリース/デプロイ記録 (P13)

> **位置づけ**: P13 (本 feature 最終 task) の成果物。[runbook.md](./runbook.md) (P12)・[final-review-record.md](./final-review-record.md) (P10) を踏まえ、(1) marketplace.json への Publisher plugin 登録内容の確定、(2) acceptance 3 件の最終充足の close-out 判断、(3) feat-publish-pipeline 依存の利用可能性確認、の 3 点を扱う。本 feature は Hub 本体のデプロイを持たないため、実デプロイではなくこの 3 点が P13 の責務となる (正本 task spec §目的)。配布完全性ゲートのための registry entry はこの Draft PR に含めるが、A1/A3 未達の間は merge・公開開始を行わない。

確認日: 2026-08-02

---

## 1. acceptance 3 件の最終充足確認 (close-out 判断)

P07 (acceptance-record.md)・P10 (final-review-record.md §2) で既に独立確認済みの判定を、本 task の close-out 判断としてそのまま確定する。P13 で新たな検証は行わず (Trace rule: 「P07/P10 adjudicate only executed evidence」)、判定内容に変化がないことのみを確認した。

| # | acceptance | 判定 | 根拠 |
|---|---|:--:|---|
| A1 | macOS/Windows 両実機で publish E2E が成功する | **未達** | final-review-record.md §2。fake I/O テストと手順書は実機 E2E 証跡ではない |
| A2 | pre-check と Hub 検査の判定が同値 | **満たす** | final-review-record.md §2、`pt3-inspection-client-parity.test.ts` 4 件 pass |
| A3 | 初回 publish 15 分以内の実測記録 | **未達** | final-review-record.md §2、evidence-summary.md §4。実サービスを含む両 OS の計測が必要 |

**close-out 判断: fail-closed（登録依頼を保留）**。A1/A3 はどちらも実行済み証跡を満たさない。test-design.md §11 自身が「実測未了のまま合格と扱わない」と定めるため、作者のリスク受容や手順書を完了証跡に読み替えない。実サービスを使う macOS/Windows E2E と初回 publish の 15 分計測を P06 で取得し、P07/P10/P11 で再判定するまで marketplace 登録依頼は発行しない。

---

## 2. marketplace.json 登録依頼内容

登録先: `.claude-plugin/marketplace.json`（このリポジトリの plugin 一覧の正本）および `.claude-plugin/bundles.json`（`skills-full` bundle）。本 draft PR には、配布パッケージ整合ゲートを通すための append-only 登録を含める。ただし draft PR が未マージである間は、利用者へ配布されない。

### 2.1 登録依頼エントリ (案)

既存エントリと同じスキーマ (`name`/`source`/`description`/`version`/`category`/`tags`) に合わせ、`plugins/harness-hub-publisher/.claude-plugin/plugin.json` の内容から起こした登録依頼案は以下のとおり。

```json
{
  "name": "harness-hub-publisher",
  "source": "./plugins/harness-hub-publisher",
  "description": "skills-package を Harness Hub へ publish したいとき、Device Flow 認証・pre-check・wrangler デプロイまでを一括で実行したいときに使う。業務ロジックは持たず apps/publisher CLI (@harness-hub/publisher) を呼び出すだけの薄いラッパー。",
  "version": "0.1.0",
  "category": "productivity",
  "tags": ["publisher", "harness-hub", "device-flow", "wrangler", "cli"]
}
```

### 2.2 marketplace source の content hash

正本 task spec の Mandatory evidence が求める「marketplace source の content hash」について、本 task 時点の状態を誠実に記録する。

| 項目 | 値 |
|---|---|
| git 管理状態 | `plugins/harness-hub-publisher/`・`apps/publisher/` と registry entry は本 draft PR の対象。最終的な配布 source は merge 対象 commit で確定する |
| 正式な content hash | **保留**。A1/A3 が未達のため、この時点では配布 source として確定・記録しない。受入再判定後、対象 commit に対して `git rev-parse <commit>:plugins/harness-hub-publisher` で取得する |
| 暫定 digest | 記録しない。未確定 tree の digest を正式値のように利用することを避ける |

**登録依頼の発行条件**: 上記の理由により、正式な content hash の確定と marketplace.json への実書込は、本 feature の commit・push 後に dev-graph/C01 writer 相当のプロセスが行う。P13 はここまでの登録依頼内容 (§2.1) と content hash 確定手順 (§2.2) を確定するに留める (正本 task spec のスコープ外節「marketplace.json への実書込」に該当)。

### 2.3 実際の公開申請送信について

P13 は marketplace 公開に必要な申請文書・チェックリストを準備できる。registry entry は、CI が「インストール可能な package」であることを検査するためこの draft PR に含めるが、A1/A3 が未達の間はこの PR を merge せず、登録依頼も公開申請も発行しない。実際の公開は、受入再判定で A1〜A3 が全て満たされた後に、ユーザー承認を得て別途行う。

---

## 3. feat-publish-pipeline 依存の利用可能性確認

Publisher CLI (`apps/publisher/src/cli/publish-command.ts`) が呼び出す Hub 側 API 4 本について、feat-publish-pipeline 側の実装状況を確認した。

| エンドポイント | Hub 側実装ファイル | テスト |
|---|---|---|
| `POST /api/v1/publish` | `apps/hub/src/app/api/v1/publish/route.ts` | `apps/hub/tests/publish-pipeline/routes-request.cases.ts` |
| `PUT /api/v1/publish/:id/package` | `apps/hub/src/app/api/v1/publish/[id]/package/route.ts` | 同上、`idempotency.test.ts`、`rate-limit.test.ts` |
| `POST /api/v1/publish/:id/submit` | `apps/hub/src/app/api/v1/publish/[id]/submit/route.ts` | 同上 (`submitRoute` 呼び出しテスト) |
| `POST /api/v1/projects/:id/deployment` | `apps/hub/src/app/api/v1/projects/[id]/deployment/route.ts` | `routes-release.cases.ts`、`routes-auth.cases.ts`、`service-release.cases.ts`、`production-smoke-script.test.ts` |

4 エンドポイントとも実装・authz/冪等/rate-limit ミドルウェア・テストが揃っており、`docs/features/feat-publish-pipeline/acceptance-record.md`・`final-review-record.md` (いずれも `status: confirmed`) で完了済みと確認されている。

**Beads 上の状態に関する留意事項**: `HarnessHub-dfm` (feat-publish-pipeline epic) は `status: in_progress` のままだが、これは feat-publish-pipeline 自身の未完によるものではない。子課題 13 件は全て closed 済み、実装 PR (#620) は main へ merge 済みであり、epic が open のまま残っているのは、feat-publish-pipeline が依存する別 epic (`HarnessHub-15h` feat-auth-tenancy・`HarnessHub-u6q` feat-domain-model-db) が別件で未 close のためである。

**結論**: feat-publish-pipeline への依存は、コード上は main へ merge済みで**利用可能**と判断する。epic の open 状態は governance 上の記録に過ぎず、Publisher CLI が呼び出す 4 エンドポイントの実装可用性を損なうものではない。

---

## 4. feature context 全件の P13 責務追跡 (未割当 0 件)

| scope_in / acceptance | P13 が確定した範囲 |
|---|---|
| package 収集 + manifest 補完 | §1 A1/A2 の根拠 (final-review-record.md 経由で追跡済み) |
| ローカル pre-check (Hub と検査ロジック共有) | §1 A2、§3 (Hub 側検査エンドポイントの利用可能性) |
| Device Flow 認証 + OS 資格情報域保存 | §1 A1/A3 (final-review-record.md 経由で追跡済み) |
| web_app 経路の wrangler スクリプト実行 | §1 A1/A3、§3 (deployment 登録エンドポイントの利用可能性) |
| Python 資産の挙動同値移植テスト | 対象外 (P08/P09 で追跡完了済み、P13 の責務範囲外) |
| acceptance 1〜3 | §1（A2 のみ充足、A1/A3 は fail-closed で保留） |

未割当 0 件。

---

## 5. Normative implementation closure の Mandatory evidence 最終状態

| Mandatory evidence | 状態 | 参照 |
|---|:--:|---|
| plugin manifest/slash command/skill/script の実体 | **済み** | final-review-record.md §5 |
| apps/publisher への単一接続 | **済み** | final-review-record.md §5 |
| Keychain/Credential Manager | **済み** | final-review-record.md §5 |
| macOS/Windows E2E | **未達** | 本書 §1。実サービスを使う両 OS の E2E 証跡が必要 |
| 初回 15 分 | **未達** | 本書 §1。実サービスを含む両 OS の計測記録が必要 |
| marketplace source の content hash | **保留** | 本書 §2.2。受入未達のため登録依頼は発行しない |

---

## 6. 判定

A2 は満たすが、A1/A3 は未達であるため、marketplace 登録依頼・公開申請を fail-closed で保留する。feat-publish-pipeline 依存の 4 エンドポイントは main で利用可能だが、これは Publisher の実機 E2E と 15 分計測を代替しない。P06/P07/P10/P11/P13 は実機証跡取得後に再開する。したがって、P01〜P05/P08/P09/P12 の成果物は維持しつつ、feature の最終 close-out は行わない。
