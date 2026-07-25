---
graph_node_id: "issue-auth-tenancy-spec-delta-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["follow-up","spec-drift","auth-tenancy","qa-036","qa-041","r4-reopen"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "feat-auth-tenancy の実装が security-spec の確定値を 2 点だけ超えており R4-reopen が要る"
owners: ["daishiman"]
created_at: "2026-07-25T11:40:00Z"
updated_at: "2026-07-25T12:00:46.215663Z"
status: "closed"
depends_on: []
related_nodes: ["feat-auth-tenancy","arch-harness-hub-security"]
resource_scope: ["system-spec/spec-state.json","system-spec/auth.md","docs/security-spec.md"]
purpose: "feat-auth-tenancy の実装は security-spec / auth.md の確定値を 2 点だけ超えている。(1) session JWT claims: docs/security-spec.md §2.1 の表と system-spec/auth.md qa-036 は claims を sub/tenant_id/role/status/iat/exp の『最小集合』と列挙して確定しているが、実装 (packages/schemas/auth-tenancy/session.ts) は edge が Workspace 越境を DB 往復なしで弾けるよう workspace_ids を追加している。列挙で確定した集合に対する追加であり、cookie 肥大と membership 変更の 15 分遅延という代償を伴う。(2) Device Flow polling interval: docs/security-spec.md §2.2 の数値契約は『5 秒 (slow_down 受信時は +5 秒)』までで、上限も減衰も確定していない。実装は server 強制の上限 60 秒と、interval を守った polling に対する -5 秒の減衰を導入した (ADR 追補 §10.7)。上限が無いと単調増加した interval が device_code TTL 600 秒を追い越し、server 側から flow を詰ませるため導入した決定である。いずれも Publisher CLI から観測できる契約であり、実装側のリファクタでは消えない。正本 (system-spec/ は spec-state.json の qa_log からの compile 成果物、docs/security-spec.md は本文に『内容変更には R4-reopen が必要』と明記) を手編集すると確定ヒアリング記録の改竄になり、かつ docs/security-spec.md は doc-line-limit allowlist の縮小のみ許す ratchet 対象 (baseline 910 行) のため加筆が CI で落ちる。よって正規フローは R4-reopen による再確認である"
goal: "session claims の確定集合と Device Flow polling の上限・減衰が、実装ではなく確定済み仕様側に記録され、Publisher CLI 実装者が仕様書だけを読んで正しい client を書ける状態"
scope_in: ["qa-036 (auth.web: session/token 失効反映) の R4-reopen で session claims へ workspace_ids を追加するか、edge の Workspace 判定を別手段へ変えるかを確定する","qa-041 (auth/security の desktop-*: Device Flow 数値契約) の R4-reopen で polling interval の上限値と減衰規則を確定する","確定後に system-spec/spec-state.json へ登録し system-spec/auth.md を再 compile、docs/security-spec.md §2.1/§2.2 の該当行を置換 (行数を増やさない置換に留める)"]
scope_out: ["実装の変更 (現行実装は動作しており、確定の結果が現行と異なる場合にのみ改修する)","docs/security-spec.md の 300 行分割 (HarnessHub-3d8 が所有)","feat-auth-tenancy の他の未達 (CI 結線=HarnessHub-1f28 / Auth.js 実結線=HarnessHub-b7ng)"]
acceptance: ["spec-state.json の qa_log に、session claims への workspace_ids 追加の可否と根拠がユーザー確認付きで登録されている","spec-state.json の qa_log に、polling interval の上限値 (現行実装は 60 秒) と減衰規則の可否がユーザー確認付きで登録されている","docs/security-spec.md §2.1 の claims 行と §2.2 の polling 行が確定内容と一致し、lint-doc-line-limit.py が exit 0 のままである","packages/schemas/auth-tenancy/session.ts と apps/hub/src/lib/auth/config.ts の値が確定内容と一致する (差がある場合は実装を改修する)"]
architecture_refs: ["arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-auth-tenancy-spec-delta-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T11:40:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-auth-tenancy/architecture-implementation-notes.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "feat-auth-tenancy の最終レビューで検出した、確定仕様を超える実装決定 2 件を R4-reopen へ送る issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-auth-tenancy-spec-delta-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-l2g9","linked_at":"2026-07-25T02:34:26Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-25T11:06:52Z","evidence_refs":["system-spec/spec-state.json","system-spec/auth.md","system-spec/security.md","docs/security-spec.md","docs/features/feat-auth-tenancy/architecture-implementation-notes.md"],"policy":"manual","reconciled_at":"2026-07-25T11:06:52Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T11:06:52Z","missing_sections":[],"status":"complete"}
---

# 概要

feat-auth-tenancy の実装が、確定済みの security 仕様を **2 点だけ超えていた**。どちらも Publisher CLI から観測できる契約なので、実装側のコメントではなく仕様側の確定として記録し直す必要があった。

> **解決済み (2026-07-25)**: R4-reopen → ユーザー確認 (`appr-010`) → `qa-072` / `qa-073` として確定登録し、`system-spec/auth.md`・`system-spec/security.md` の再 compile と `docs/security-spec.md` §2.1/§2.2 の置換まで完了。実装の改修は不要 (両方ともユーザーが現行実装を追認)。経路の詳細は「## 解決の経路」を参照。

## 背景と問題

`docs/security-spec.md` は 2026-07-17 / 07-18 の往復ヒアリング (qa-036 / qa-041) でユーザー確認により確定した実装仕様正本で、本文末尾に **「本書の変更は `system-spec/spec-state.json` の確定セルに紐づく。内容変更には R4-reopen (根拠付き) が必要」** と明記されている。

実装 (P05) は、確定値では決まらない 2 箇所で判断を要した。判断そのものは根拠を持つが、**確定値の列挙に対する追加**であるため、実装側で決めきると「仕様書だけを読んだ Publisher CLI 実装者が正しい client を書けない」状態が残る。

## 検出時の挙動 (2026-07-25 起票時点)

### D1. session JWT claims に `workspace_ids` が増えている

| 場所 | 記述 |
|---|---|
| `docs/security-spec.md` §2.1 の表 | `sub`(user_id) / `tenant_id` / `role` / `status` / `iat` / `exp` — 「認可 MW が DB 往復なしで判定できる**最小集合**」 |
| `system-spec/auth.md` qa-036 の回答 | 同じ 6 claim を列挙して確定 |
| 実装 `packages/schemas/auth-tenancy/session.ts` | 上記 6 つ + **`workspace_ids: string[]`** |

追加の理由は `docs/features/feat-auth-tenancy/architecture-implementation-notes.md` §10.2 に記録済み。edge の認可 middleware が Workspace 越境を DB 往復なしで弾くために所属集合が要る。載せない場合、edge は membership を判定できず全 Workspace スコープ要求が落ちる。

代償も同§に記録されている。**cookie が所属数に比例して膨らむ**こと、**membership 変更の反映が最大 `updateAge` (15 分) 遅れる**こと。後者は role/status と同じ受容済みの陳腐化だが、membership については確定記録が無い。

### D2. Device Flow polling interval に上限 60 秒と減衰 −5 秒が入っている

| 場所 | 記述 |
|---|---|
| `docs/security-spec.md` §2.2 の数値契約表 | polling `interval` = **5 秒** (`slow_down` 受信時は **+5 秒**) / 根拠 RFC 8628 §3.5 |
| 実装 `apps/hub/src/lib/auth/config.ts` | `devicePollIntervalSeconds: 5` / `devicePollBackoffSeconds: 5` / **`devicePollMaxIntervalSeconds: 60`** |
| 実装 `apps/hub/src/lib/auth/device-flow/service.ts` | `nextPollIntervalSeconds()` = +5 秒 (上限 60 秒) / **`relaxedPollIntervalSeconds()` = −5 秒 (下限 5 秒)** |

RFC 8628 §3.5 が定めているのは「`slow_down` を返したら `interval` を 5 秒増やす」までで、**上限も、規約どおり待った client への減衰も規定していない**。文面どおり増やすだけだと interval は単調増加し、`device_code` TTL (600 秒) を追い越す。そうなると client は「次に叩いてよい時刻」に達する前に code が失効し、**server の側から flow を詰ませる**。

実装は加算と減算を同じ幅で対にした。幅が同じなら「速く叩いて罰を受け、次の 1 回だけ守って帳消しにする」交互 polling が差し引き 0 にしかならない。上限 60 秒は TTL 600 秒に対し最悪でも 10 回叩けることを値の選択で担保する。詳細は同 notes §10.7。

ADR 追補は上限値について **「backend-spec / security-spec には無い本 feature の決定である」** と自ら明記しており、この issue はその申し送りを受けたものである。

## 期待する挙動

`docs/security-spec.md` と `system-spec/auth.md` だけを読んだ実装者が、

- session cookie に `workspace_ids` が載ること (と、それが最小集合の定義に含まれること) を知っている
- polling interval が server 側で 60 秒に頭打ちし、規約どおり待てば 5 秒まで戻ることを知っている

状態。**2026-07-25 時点で達成済み** — `docs/security-spec.md` §2.1 の claims 行と §2.2 の polling 行の両方に、値・根拠・代償が記載されている。

## 再現手順またはユースケース

1. `docs/security-spec.md` の §2.1 JWT claims 行と、`packages/schemas/auth-tenancy/session.ts` の `sessionClaimsSchema` を突き合わせる → 実装側に `workspace_ids` が 1 つ多い
2. `docs/security-spec.md` §2.2 の polling `interval` 行と、`apps/hub/src/lib/auth/config.ts` の `AUTH_NUMERIC_CONTRACT` を突き合わせる → 実装側に `devicePollMaxIntervalSeconds` と減衰規則が多い
3. feat-publisher-plugin の実装者が仕様書だけを根拠に polling client を書く → 上限と減衰を知らず、`slow_down` のたびに自前 interval を無限に増やし、TTL 内に叩かなくなりうる

## 影響と優先度

- 影響範囲: system (仕様記録の完全性) / 下流 feature (feat-publisher-plugin の client 実装)
- 深刻度: medium — 現行実装は動作しており、セキュリティ上の穴ではない。壊れるのは「仕様書を信じた下流実装」
- 緊急度: feat-publisher-plugin の Device Flow client 着手前まで。それ以降は誤実装が実際に発生しうる

## 正本を直接編集できなかった理由 (起票時の制約)

| 反映先 | 直接編集できない理由 |
|---|---|
| `system-spec/auth.md` | `spec-state.json` の `qa_log` から compile される成果物。手編集は**ユーザーが確認した事実の書き換え**にあたり、再 compile で消える |
| `specs/` `architecture/` | `source_digest` で正本章を指す wrapper。`arch-harness-hub-security` は `scope_out` に「正本章の内容複製」を明示 |
| `docs/security-spec.md` | 本文が R4-reopen を要求。加えて `scripts/doc-line-limit-allowlist.json` の **baseline 910 行・縮小のみ許す ratchet** 対象で、加筆は `lint-doc-line-limit.py` が CI で落とす |
| `docs/backend-spec.md` | 同 ratchet 対象 (baseline 434 行) |

行数を増やさない「置換」なら ratchet は通るが、置換内容の確定自体が R4-reopen の対象であるため、確定を経ずに書き換えることはしない。

## 解決の経路

1. **R4-reopen 起票**: `spec-state.json` の `reopen_log` へ 5 セル (`auth.web` / `auth.desktop-windows` / `auth.desktop-macos` / `security.desktop-windows` / `security.desktop-macos`) を `from: 確定` で登録
2. **ユーザー確認**: D1 / D2 それぞれ 3 択を `AskUserQuestion` で提示 → D1 は「実装を追認して 7 claim で確定」、D2 は「上限 60 秒・減衰 −5 秒を確定」を選択 (`approval_log` の `appr-010` に逐語記録)
3. **確定登録**: `qa-072` (auth.web) / `qa-073` (auth・security の desktop-*) を `qa_log` へ追加し、`matrix` の該当 5 セルの `qa_ref` を差し替え
4. **再 compile**: `system-spec/auth.md` / `system-spec/security.md` の確定質疑節を `qa-072` / `qa-073` へ更新
5. **実装仕様へ反映**: `docs/security-spec.md` §2.1 の claims 行と §2.2 の polling 行を**行数を増やさない置換**で更新し、frontmatter `qa_ref` と §9 改訂履歴も追随
6. **実装側の出所コメント更新**: `session.ts` / `config.ts` / `service.ts` / `session-revocation.test.ts` の「仕様書由来ではない」旨の注記を、確定済み仕様 (`qa-072` / `qa-073`) を指す記述へ置換

**実装の値は 1 つも変えていない** (両方ともユーザーが現行実装を追認したため)。変わったのは仕様側の記録と、出所を指すコメントだけである。

## スコープ

- In: qa-036 / qa-041 の R4-reopen、`spec-state.json` への確定登録、`system-spec/auth.md` の再 compile、`docs/security-spec.md` の該当 2 行の置換
- Out: 実装の変更 (確定結果が現行と異なる場合にのみ改修)、`docs/security-spec.md` の 300 行分割 (`HarnessHub-3d8`)、feat-auth-tenancy の他の未達 (`HarnessHub-1f28` / `HarnessHub-b7ng`)

## 関連グラフ

- 原因/親ノード: `feat-auth-tenancy`
- 関連仕様: `spec-harness-hub-requirements`
- 関連アーキテクチャ: `arch-harness-hub-security`
- 解決タスク: 本 issue 内で R4-reopen を実施 (別 task ノードは採番せず、`qa-072` / `qa-073` の確定登録をもって完了)

## 受入条件

- [x] `spec-state.json` の `qa_log` に、session claims への `workspace_ids` 追加の可否と根拠がユーザー確認付きで登録されている → `qa-072` / `appr-010`
- [x] `spec-state.json` の `qa_log` に、polling interval の上限値 (現行実装は 60 秒) と減衰規則の可否がユーザー確認付きで登録されている → `qa-073` / `appr-010`
- [x] `docs/security-spec.md` §2.1 の claims 行と §2.2 の polling 行が確定内容と一致し、`lint-doc-line-limit.py` が exit 0 のままである → 検査 361 文書 / allowlist 5 件で exit 0
- [x] `packages/schemas/auth-tenancy/session.ts` と `apps/hub/src/lib/auth/config.ts` の値が確定内容と一致する → 値の変更なし (ユーザーが現行実装を追認)。出所コメントのみ確定仕様を指すよう更新

## 検証証跡

| 検査 | 結果 |
|---|---|
| `python3 scripts/lint-doc-line-limit.py --repo-root .` | exit 0 (検査 361 文書 / 上限 300 行 / allowlist 5 件) |
| `pnpm --filter @harness-hub/hub run test` | 23 files / 260 passed・1 skipped |
| `validate-graph-schema.py --graph .dev-graph/state/graph.json` | `valid: true` / violations 0 |
| `validate-evidence-refs.py --repo-root .` | dangling 0 (evidence 保持 259 ノード) |

- 証跡 path: `docs/features/feat-auth-tenancy/architecture-implementation-notes.md` §10.2 / §10.7、`system-spec/spec-state.json` (`qa-072` / `qa-073` / `appr-010` / `reopen_log` 5 セル)
