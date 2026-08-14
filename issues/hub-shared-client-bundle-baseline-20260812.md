---
graph_node_id: "issue-hub-shared-client-bundle-baseline-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["performance","bundle","hub"]
priority: "medium"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "全 page route 共通の client bundle 土台 104796 バイトを分解する"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T06:56:16.160002Z"
status: "active"
depends_on: ["issue-users-sheets-client-bundle-headroom-20260810"]
related_nodes: []
resource_scope: ["apps/hub/src/app/layout.tsx","apps/hub/src/components","apps/hub/next.config.ts"]
purpose: "route 局所の遅延読み込みでは動かない共通土台を対象に据え、指標だけ緑にして最悪 route を放置する是正を防ぐ。"
goal: "全 page route が client bundle 予算 122880 バイトの 95% 警告帯 (116736) を下回る状態にする。"
scope_in: ["共通 chunk 87c73c54 / 18 / 6463 の内訳分解","全 route 共通で読み込まれる依存の棚卸し","route 局所ではなく共通土台側の削減"]
scope_out: ["個別 route への dynamic import 追加 (共通土台が減らず他 route を悪化させる)","予算値 122880 の引き上げ"]
acceptance: ["27 page route すべてが 95% 警告帯 116736 バイトを下回る","最悪 route である /docs/[id] が警告帯を下回る","削減が共通 chunk 側で起きていることを chunk 単位の実測で示す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/hub-shared-client-bundle-baseline-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f175059503e96c33c6eb52133cf2486a8cbe974febc65aaa5a9f4a5d6bdaf5ff","evaluator":"2026-08-12 の x30r 実測 (27 route の gzip 実サイズと共通 chunk 内訳)","evidence_ref":"issues/hub-shared-client-bundle-baseline-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-x30r の実測で、警告帯の原因が route 局所ではなく全 route 共通の土台にあると判明したため、対象を共通土台へ据え直した後続課題である。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/hub-shared-client-bundle-baseline-20260812.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-a7tk","linked_at":"2026-08-12T05:40:31Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 全 page route 共通の client bundle 土台 104796 バイトを分解する

## 概要

client bundle 予算は 1 route あたり 122880 バイト (gzip) で、95% を警告帯 (116736 バイト) としている。実測すると、**全 page route が無条件に読み込む共通部分だけで 104796 バイト、予算の 85.3% を占めている。** 各 route が自前で持てるのは残り 18084 バイトしかない。

## 背景と問題

`HarnessHub-x30r` は「`/users/[id]` と `/sheets/new` の警告帯を解消する」という route 単位の課題として起票されたが、2026-08-12 の実測で課題設定そのものが誤りだと判明した。

共通 chunk の内訳は次のとおり。

| chunk | gzip バイト |
| --- | --- |
| `87c73c54` | 54227 |
| `18` | 46359 |
| `6463` | 4210 |
| **合計** | **104796** |

27 ある page route のうち **19 本が警告帯に入っている**。分布は次のとおり。

| route | gzip バイト | 予算比 |
| --- | --- | --- |
| `/docs/[id]` | 122233 | 99.5% |
| `/users/[id]` | 118142 | 96.1% |
| `/sheets/new` | 118130 | 96.1% |
| `/legal` (最軽量) | 110699 | 90.1% |

**最悪は x30r が対象としていなかった `/docs/[id]` で、残り 647 バイトしかない。** 最も軽い `/legal` ですら 90.1% であり、これは route 固有のコードがほぼゼロでも警告帯の手前まで来ていることを意味する。

### 関連 PR で顕在化した予算超過 (2026-08-12)

PR #707 (docs の rich editing) の GitHub Actions run `31566113938` では、この余白不足が実際の merge blocker として顕在化した。G13 の実測は `/docs/[id]` 229527 bytes、`/docs` 227968 bytes、`/docs/[id]/edit` 226684 bytes、`/docs/new` 226325 bytes で、4 route とも 122880 bytes の上限を超えている。

PR #707 の route 固有機能は同 PR 側で初期 chunk から分離する必要がある。一方、それだけでは全 page route 共通の 104796 bytes は減らないため、本課題の共通土台削減も独立して継続する。予算を引き上げて両方をまとめて通すことは、原因を隠すため受入れない。

## 現在の挙動

route 単位の遅延読み込み (dynamic import) を入れても、共通土台 104796 バイトは 1 バイトも減らない。2026-08-11 に x30r で試みた route 局所の是正が他 route を悪化させたのは、分割で生まれた新しい chunk が共通側へ回ったためで、方式上の必然だった。

## 期待する挙動

共通 chunk 側の依存を削減し、27 route すべてが警告帯 116736 バイトを下回る。削減が共通側で起きていることを chunk 単位の実測で示す。

## 再現手順またはユースケース

Hub を本番構成でビルドし、route ごとの client bundle の gzip サイズと、共通 chunk の内訳を測る。共通 chunk の合計が 104796 バイト付近であること、最悪 route が `/docs/[id]` であることを確認できる。

## 影響と優先度

**medium。** 現時点で予算超過 (122880 バイト超) の route は無いため本番は動く。ただし残余が最小 647 バイトの route が存在し、次に追加する共通依存が 1 つでも大きければ即座に超過する。route 局所の是正を続ける限りこの余裕は増えないため、対象を共通土台へ据え直す必要がある。

## スコープ

- **含む**: 共通 chunk 3 本の内訳分解、全 route 共通で読み込まれる依存の棚卸し、共通土台側の削減。
- **含まない**: 個別 route への dynamic import 追加 (共通土台が減らず、他 route を悪化させる)。予算値 122880 の引き上げ (予算を動かすと検出力が失われる)。

## 関連グラフ

`HarnessHub-x30r` の実測から派生した。x30r は route 単位の課題として閉じ、対象の据え直しを本課題が引き受ける。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 に Hub の本番ビルドから 27 page route の gzip サイズと共通 chunk 内訳を実測した。API route handler は 103452 バイトで、page route とは別集計である。

### 2026-08-13 追測: 共通 chunk 3 本の中身を特定した (受入条件の前提が崩れた)

本課題は共通 chunk 3 本の内訳分解を scope_in に置いていたが、**分解した結果、削減対象になり得るのは 3 本のうち 1 本・4674 バイトだけ**だと判明した。残りはアプリの依存ではなくフレームワーク本体である。

`main` (b8edb583) の production build から、各 chunk に残る文字列リテラルで同定した。

| chunk | gzip | 正体 | 同定根拠 |
| --- | --- | --- | --- |
| `87c73c54` | 54227 | **react-dom** (DOM renderer / reconciler) | `DetermineComponentFrameRoot`、fiber tag の `case 26/27/5` 分岐、`setAttribute`/`removeAttribute` 属性処理 |
| `18` | 46359 | **Next.js App Router の client runtime** | `fetchServerResponse`、`NEXT_RSC_UNION_QUERY`、`PrefetchKind`、`flightRouterState`、`Failed to fetch RSC payload for ... Falling back to browser navigation.` |
| `6463` | 4674 | **アプリの共通 UI** (`UiProvider` / shell / Alert / EmptyState) | `useUi は UiProvider の内側で呼び出してください`、`メインコンテンツへ移動`、`主要ナビゲーション` |
| 合計 | 105260 | うち **フレームワーク 100586 (95.6%)** / アプリ 4674 (4.4%) | |

この構成から次が従う。

- **最軽量 route は `/_not-found` の 112248 バイト**で、これがフレームワーク + 最小 layout の下限である。アプリ側の変更では下げられない。
- したがって**どの route も、警告帯 116736 バイトを下回るには route 固有コードを 4488 バイト未満に収めるしかない**。
- **`6463` を丸ごと消しても、最悪 route `/docs/[id]` は 122150 → 117476 で警告帯 116736 を超えたままである。** `UiProvider` は全 route が必要とするため、そもそも消せない。

実測 (2026-08-13, 警告帯 116736 に対する不足):

| route | first load | route 固有 | 警告帯まで |
| --- | --- | --- | --- |
| `/docs/[id]` | 122150 | 9902 | **-5414** |
| `/settings/auth` | 122116 | 9868 | -5380 |
| `/users` | 121370 | 9122 | -4634 |
| `/users/[id]` | 120232 | 7984 | -3496 |
| `/device` | 117077 | 4829 | -341 |
| `/catalog` | 114806 | 2558 | +1930 |

予算超過 (122880 超) は 0 件で `check:client-bundle` は exit 0。警告帯に入っているのは 29 page route 中 11 本。

### 結論: 受入条件は現在の形では達成できない

acceptance の「27 page route すべてが 95% 警告帯 116736 バイトを下回る」を **scope_in (共通土台側の削減) だけで満たすことは原理的に不可能**である。共通土台の 95.6% が react-dom と Next.js App Router の runtime であり、削減可能なアプリ部分は 4674 バイトしかないのに対し、最悪 route の不足は 5414 バイトある。

本課題は `HarnessHub-x30r` の「route 単位」という誤った課題設定を「共通土台」へ据え直したものだが、**その据え直しも実測に照らすと誤り**だった。共通土台に積み上がっているのはアプリの依存ではない。

据え直しの候補は次の 3 つで、いずれも本課題の scope では決められないため C02 起点の再計画が要る。

1. **警告帯の基準を絶対値へ変える** — 予算比 95% は、下限が予算の 91.3% を占める現状では「route 固有コードを 4488 バイト以内に収めよ」と同義で、実質すべての機能 route を警告対象にする。「下限 112248 からの増分」で測る方が、実際に制御できる量を測ることになる。
2. **重い route の固有コードを遅延読込へ回す** — 本課題は scope_out にしているが、それは「共通土台が減らないから」という理由だった。共通土台が減らせないと確定した以上、警告帯を下回る手段はこちらしか残らない。
3. **予算 122880 の根拠を再評価する** — 予算値は Next.js 15 の framework baseline に 17 KiB の余裕を見て決めた値だが、その後 App Router runtime 側が増えて下限が 112248 まで上がっている。予算を動かすと検出力が落ちるため、単純な引き上げではなく「下限 + 許容増分」の形へ組み替える必要がある。

なお本追測ではコード変更を一切行っていない。上記は `main` (b8edb583) そのままの実測値である。
