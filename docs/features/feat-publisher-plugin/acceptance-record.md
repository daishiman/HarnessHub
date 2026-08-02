---
status: confirmed
layer: feature-quality
task: SYS-PUBLISHER-PLUGIN-P07
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: docs/features/feat-publisher-plugin/test-run-results.md
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin 受入記録 (P07)

> **位置づけ**: P07 の成果物。[test-run-results.md](./test-run-results.md) (P06) の実行結果を根拠に、goal-spec の acceptance 3 件を受入判定する。判定は **P06 で実際に実行された証跡のみ** に基づく (task spec の Trace rule: 「P07/P10 adjudicate only executed evidence」)。

確認日: 2026-08-02

---

## 1. acceptance 3 件の判定

### A1. macOS/Windows 両実機で publish E2E が成功する

**判定: 未達（実サービスを使う macOS/Windows 両実機 E2E の証跡が未取得）**

| 確認事項 | 証跡 |
|---|---|
| macOS: 初回 publish (package 収集→pre-check→Device Flow→wrangler 実行→Hub 登録) が実サービスで exit code 0・`status=published`・`deployedUrl` まで完了する | **未実測**。PT4-D/PT6-B は Hub API、Wrangler、ブラウザ認可を fake に置き換えたローカル制御フローテストであり、この証跡にはならない |
| Windows: 実機での確認 | **未実測**。この開発環境に Windows 実機が存在しないため (test-design.md §11 既定方針)、test-run-results.md §3.2 の手動再現手順書で代替した。実機実測は後続の実機確保後に別途実施する |

> **判定根拠**: task spec は「macOS/Windows **両実機**で publish E2E が成功」と要求し、P07/P10 は実行済み証跡だけで判定する。手順書と fake I/O テストは実装・再現準備の根拠にはなるが、実機 E2E の代替にはならない。したがって、実機証跡が揃うまで A1 は未達とする。

### A2. pre-check と Hub 検査の判定が同値

**判定: 満たす**

| 確認事項 | 証跡 |
|---|---|
| Publisher 側 (`inspection-client/`) と Hub 側が同一入力に対し同一 verdict を返す | `pt3-inspection-client-parity.test.ts` PT3-A、4 件 pass (test-run-results.md §2) |
| 判定ロジックの owner は `packages/inspection` の 1 箇所に閉じており、Publisher 側は `createPublishInspectionRules()`/`runInspection()` を呼ぶだけで再実装していない | implementation-notes.md §1.2 (`inspection-client/index.ts` の責務)、AD-3 |

### A3. 初回 publish 15 分以内の実測記録

**判定: 未達（実サービスを含む初回 publish の 15 分以内実測が未取得）**

| 確認事項 | 証跡 |
|---|---|
| macOS: 初回 publish 全体の所要時間が 15 分 (900,000ms) 以内である | **未実測**。test-run-results.md §3.1 の 5 回計測（平均 13.80ms・最大 42.56ms）は fake I/O の処理オーバーヘッドのみを示す |
| 上記実測の性質 | Hub API・wrangler CLI・ブラウザでの実 OAuth 操作をすべて fake (即時応答) に置き換えた上でのソフトウェア自身の処理オーバーヘッドの計測であり、実ネットワーク往復・人間の認可待ち時間・実 Cloudflare デプロイ時間を含まない (test-run-results.md §3.1 に明記済み) |
| Windows: 実機での実測 | **未実測**。test-run-results.md §3.2 の手動手順書 (15 分計測手順を含む) で代替 |

> fake I/O 計測は、Publisher 自身の処理が主なボトルネックではなさそうだという補助根拠に限る。実ネットワーク、OAuth 認可待ち、Wrangler deploy を含めた macOS/Windows の各計測を取得しない限り、A3 の「初回 publish 15 分以内」は満たせない。Hub サーバー・tenant・ブラウザ操作可能な各 OS 環境で別途実施して本記録を更新する。

---

## 2. Normative implementation closure (P07 分) の Mandatory evidence 突き合わせ

正本 task spec §Normative implementation closure が定める必須証跡を、既存フェーズの成果物で突き合わせる。

| Mandatory evidence | 状態 | 証跡 |
|---|:--:|---|
| plugin manifest/slash command/skill/script の実体 | **済み** | implementation-notes.md §1.3 (`plugins/harness-hub-publisher/.claude-plugin/plugin.json`, `commands/publish.md`, `skills/run-publisher-publish/`)、`pt5-plugin-surface-structure.test.ts` 6 件 pass |
| apps/publisher への単一接続 (二重実装なし) | **済み** | implementation-notes.md §1.3、`pt5-plugin-surface-structure.test.ts` PT5-B (`run-publisher-publish.sh` は 1 行 exec のみ) |
| Keychain/Credential Manager (OS 資格情報域) | **済み** | `apps/publisher/src/auth/credential-store.ts` (`createMacKeychainAdapter`/`createWindowsCredentialManagerAdapter`)、`auth/credential-store.test.ts` 12 件 pass |
| macOS/Windows E2E | **未達** | fake I/O テストは pass したが、実サービスを使う両 OS の E2E 証跡がない |
| 初回 15 分 | **未達** | fake I/O 計測は pass したが、実サービスを含む両 OS の計測記録がない |
| marketplace source の content hash | **未着手 (P13 の責務)** | P13 は marketplace 公開に必要な申請文書・チェックリストの作成までを担当し (ADR §7 既存合意)、実際の marketplace 登録・content hash 確定はユーザー承認後に行う。本 task (P07) は現時点で存在しない証跡を先取りして判定しない |

---

## 3. 受入判定

**A2 は満たすが、A1・A3 は未達である。** task spec の rollback 規約に従い、実装の再作成ではなく、実サービスを使う macOS/Windows E2E と 15 分計測の実行・証跡保存を P06 へ差し戻す。P08 以降の文書はこの未達を隠して完了扱いにしない。

marketplace source の content hash は P07 の対象外 (P13 の責務) であり、本記録は P13 完了を主張しない。
