---
graph_node_id: "spec-post-signin-landing-observability"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["post-signin","landing","observability","auth","runtime-env","web-only","frontend","ui-ux","infrastructure","testing-qa"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub サインイン後 着地不達の原因究明と遷移経路の継続検証 仕様追補"
owners: ["daishiman"]
created_at: "2026-08-07T10:59:42Z"
updated_at: "2026-08-08T15:01:54.446911Z"
status: "draft"
depends_on: ["spec-harness-hub-requirements","spec-post-signin-workspace-scope"]
related_nodes: ["spec-harness-hub-requirements","spec-post-signin-workspace-scope","arch-harness-hub-frontend","arch-harness-hub-security","arch-harness-hub-infrastructure","arch-harness-hub-testing-qa"]
resource_scope: ["specs/harness-hub-post-signin-landing-observability-contract.md","specs/harness-hub-post-signin-landing-observability-addendum.md","system-spec/frontend.md","system-spec/ui-ux.md","system-spec/infrastructure.md","system-spec/testing-qa.md","system-spec/maintenance-ops.md"]
purpose: "サインイン後に稼働状況しか表示されない不具合について、安全側の縮退が観測できず静かな全面停止と区別できない状態を是正し、原因を事後に判別できる状態を作る (本件の原因は qa-198 で確定した = 本番の稼働ビルドが着地先を直した commit 150a0f14 を含んでいなかった。是正はコード変更ではなく再デプロイ。本追補が固定するのは、その確定に 10 ラウンド以上を要した観測不能状態のほうである)"
goal: "qa-170〜qa-199 と appr-034 / appr-035 / appr-037 / appr-038 / appr-039 を実装計画が参照できる単一の仕様境界として維持し、再発を CI が検出できる状態にする"
scope_in: ["着地不達の原因を事後に判別可能にする仕組み (縮退の記録点の統一)","環境値の解決層の一本化と module 最上位での構築禁止","縮退した事実と解決できなかった名前の記録 (値は記録しない)","既定着地 /dashboard と着地画面の内容 (利用者の直接決定)","分類語彙の列挙一致を到達可能性ベースで検査する仕組み","縮退の観測可能性を検査する仕組み","既存の deploy 時ゲート (必須 secret の実投入検査) の限界の明記と回帰防止","稼働中の成果物と repository の commit の対応を認証なしで確認できる仕組み (build 同一性)","認証成功したまま着地先が既定値へ後退した事象を、認証失敗と区別して記録する仕組み","本番の稼働ビルドが既定 branch の HEAD より古い状態が続くことの検出"]
scope_out: ["相対 path 検証・open redirect 防止・scope 解決の契約変更 (先行仕様のまま)","S09 ダッシュボードの KPI・推移・完了率・ランキング・部門別削減 (P5 据え置き)","authorize() の判定順・role 判定の変更","検査 script の実装そのもの (task 工程)"]
acceptance: ["認証を含む全ての環境値読み出しが既存の吸収層を通り、吸収層外の直接読み出しが 0 件である","module 最上位で環境値に依存する構築を行っていない","縮退時に、縮退した事実と解決できなかった名前が記録され、値は記録されない","遷移元が無いサインイン成功で /dashboard へ着地し / に留まらない","着地画面が所属テナント／ワークスペースを常時表示し、複数所属ならその場で切り替えられる","着地画面が自分が最後に触ったものを種別横断で提示し、空状態でも次の行動への導線を示す","着地画面が既存業務画面群への導線を持ち行き止まりにならない","稼働状況が通常時に表示されず、稼働状況が主役の画面が既定着地になっていない","scope 未解決時に生の 403 でなく回復手段が提示される","認証基盤が使えない状態が利用者の操作ミスに見える文言で表示されない","権限不足 (403) で再サインインへ誘導せずループを作らない","分類語彙の収集が到達可能性ベースで行われ、宣言外の app/package が増えたら検査が落ちる","実測で見落とした 8 件の fixture 全てで検査が発火することが test で固定されている","分類語彙の収集が型宣言・zod 導出・ORM schema 導出の 3 経路すべてを対象にしている","同一のリテラル union が複数箇所に独立定義されている状態を検査が検出し、型宣言・zod・drizzle schema の 3 経路すべてを情報源として突合する","認証に関わる構築物が module scope に保持されず、リクエストごとに解決される","縮退の記録が、テナント未解決・テナント非 active・OIDC 接続未登録・環境値未解決 (名前)・cookie 不在・署名検証失敗の 6 種を互いに区別できる","段0 の分類語彙に tenants.status (active/suspended) が含まれ、検査が実際に発火する","既存の deploy 時ゲートが維持され、必須名を 1 つ外した状態で deploy が実際に失敗する","認証系の環境値について、投入の有無と実装が読める経路かの両方が別々に検査される","初回 deploy 相当 (secret 未投入の新規 Worker) でも deploy が不足名の列挙で失敗し、preview Worker が検査対象から外れていない","縮退の記録に、どの経路・どの environment から環境値を解決したかが含まれる","現在の middleware.ts / app/page.tsx / lib/authz/runtime.ts の 3 箇所すべてに対して環境値規律の検査が実際に発火する","既定着地の値がテストで複製されず実装定数を import している","稼働中の成果物から、それが repository のどの commit に対応するかを認証なしで確認できる (V6)","認証は成功したが着地先が既定値へ後退した事象が、認証失敗とは区別して記録される (V2)","本番の稼働ビルドが既定 branch の HEAD より古い状態が続いていることを検出できる (V7)"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security","arch-harness-hub-infrastructure","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-post-signin-landing-observability-contract.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "fail"
confirmation_evidence: {"evaluated_digest":"e1ecf64f6bd0dfc66926fc252aae33dd70303563a0bfda48954e3f58f64a9146","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-07T10:59:42Z","origin_kind":"system-spec-harness","source_digest":"e1ecf64f6bd0dfc66926fc252aae33dd70303563a0bfda48954e3f58f64a9146","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "qa-170〜qa-199 / appr-034〜appr-039 の確定契約を横断参照する製品仕様追補"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-post-signin-landing-observability-contract.md","confidence":0.99},{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-infrastructure.md","confidence":0.42}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-07T10:59:42Z","missing_sections":[],"status":"complete"}
---

# サインイン後の着地と観測可能性 — 正規 contract

詳細な調査経緯、反証、監査記録は
[`harness-hub-post-signin-landing-observability-addendum.md`](./harness-hub-post-signin-landing-observability-addendum.md)
に保持する。本書は Dev Graph の specification template に沿った実装契約の正本であり、詳細資料の内容を重複させない。

## 目的と成功状態

サインインから既定着地までの各段階を区別して観測でき、失敗時に原因と利用者の回復行動を一意に判断できる状態を成功とする。

## 用語と主体

利用者、tenant 管理者、provider 管理者、運用者を主体とする。「段」は認証基盤から着地表示までの失敗分類、「稼働版」は実際に応答した build を指す。

## スコープ

認証基盤の可用性、認可、token、利用者確定、session、redirect、device flow、縮退表示、稼働 build の識別を対象とする。

## ユースケースとユーザーフロー

利用者は tenant の signin から認証し、session 発行後に `/dashboard` へ着地する。失敗時は段に応じた理由と回復導線を受け取る。

## 機能要件

既定着地、safe return path、環境値読出し規律、分類語彙の完全性、縮退の記録、稼働 build の commit / version 照合を提供する。

## ビジネスルールと検証

観測できない失敗を同一結果へ潰さず、認証基盤が使えない状態と業務認可の拒否を分ける。人の列挙でなく到達可能性と fixture で完全性を検証する。

## データモデル

既存 tenant status、IdP credential status、session、role、device authorization status を利用する。分類語彙の重複定義は検査で拒否する。

## API契約

既存 signin / callback / health / device route を維持する。`/health` の build identity は別追補の optional contract を参照する。

## イベント・非同期処理

認証 callback、session 発行、redirect、deploy、version gate、smoke の順序を区別する。新しい product queue は追加しない。

## UI・状態遷移

成功、tenant で signin 不可、認証基盤未結線、401、403、device 承認失敗を同一画面へ潰さず、状態ごとに回復導線を示す。

## 認証・認可

secret と IdP 接続状態を認証前提、role / scope を認可判断として分離し、どの段でも deny-by-default を維持する。

## 非機能要件

secret 値を記録せず名前と分類だけを観測し、判定は有限時間・決定論的・fail-closed とする。

## エラー・例外・回復

到達不能、設定欠落、認可拒否、token 不正、session 失敗、redirect 不正、stale build を別理由で報告し、再試行・再 signin・管理者連絡を使い分ける。

## 可観測性

段 0〜7、拒否理由、build commit / version、deploy と smoke の対応を secret なしで記録する。

## 互換性・移行・リリース

既存 route と schema を維持し、観測と検査を先に追加する。詳細な build identity / freshness 契約は分離済み追補を正本とする。

## テストと受入条件

安全な return path、分類語彙、環境値読出し、secret gate、縮退記録、build identity、version の連続一致を fixture と CI で検証する。

## 未決事項

外部一次資料の再照合、system-spec 履歴 schema の表現力、照会中立性の機械検査は詳細資料の未解決事項として追跡し、本 contract の実装を待たせない。
