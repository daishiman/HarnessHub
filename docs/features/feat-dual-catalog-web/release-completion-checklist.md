---
status: confirmed
layer: feature-release
---

# feat-dual-catalog-web リリース完了チェックリスト

本書は [release-record.md](./release-record.md) から、U5 判定、リリース実行、完了条件、引き継ぎを分離したもの。

## 1. U5 (Stage 1 完了条件)

U5 は「2 社以上の顧客 Workspace で Hub が同時稼働し、各 Workspace で公開 (G1) と owner 以外の再利用 (G2) が成立する」二値判定で、判定主体は提供者代表。

本 feature は全取得で tenant/workspace を必須化し、欠落を fetch 前に拒否し、通信を `CatalogPort` へ集約した。
DC-TEN-01..10 は header、認可複製禁止、403 後の stale 非表示、同一／別 scope の 503 を検証済み。
ただし 2 社の同時閲覧・導入は実環境で未検証であり、U5 は **未判定**。

### 判定手順

1. ~~本 feature を含む版を本番へ deploy する~~ → **完了 (2026-08-02 / merge `16a6f915` / run `30727984628`)**。
2. 2 顧客 Workspace の各々で、作者の公開と owner 以外の発見・導入を確認する。
3. 同時に成立し、互いの catalog に相手の項目が現れないことを確認する。
4. pass/fail と証跡を本書へ追記する。

手順 2〜4 は認証済みセッションと 2 社分の実 Workspace を要するため、CI/CLI からは実行できない。

## 2. リリース判定

**本番反映済み・完了判定は未成立 (2026-08-02 実測)。** PR #628 が main へ merge され deploy job も success したが、
production smoke・CWV・U5 の外部実測が残る。**CWV は現行経路では実行不能であることが判明した** (下表)。

### 実行手順

```bash
gh run list --workflow ci.yml --branch main --limit 1   # deploy 状態の確認
# CWV は下記を実行済み。認証必須 route のため 401 で失敗する (release-record §2.3-3)
gh workflow run hub-cwv --ref main \
  -f target_url="https://harness-hub.daishimanju.workers.dev/catalog"
```

残る smoke (release record §3.1〜3.4) は認証済みセッションを要するため、人手で実施する。

### 完了条件

- [x] `ci.yml` deploy job が success — run `30727984628` / wrangler deploy・/health・OIDC・DB/R2 smoke すべて success
- [ ] catalog 一覧・詳細・marketplace smoke が pass — **未実行** (認証セッションが要るため CI/CLI 不可)
- [ ] catalog route の CWV が LCP ≤ 2500ms / CLS ≤ 0.1 / TBT ≤ 200ms — **計測不能** (run `30736055772` が 401 で失敗)
- [ ] acceptance record が実測値付き pass — 上 2 件に従属
- [ ] marketplace `source_status` が Stage 0 gate verdict と一致 — **実装は一致を確認** (DC-MKT-10 pass /
      正本 `stage0-gate-conclusion.md` の `verdict: H7_NOT_ESTABLISHED` に対し `resolveAdoptedSourceResolver()` は
      `null` を返す)。ただし**本番配信面は未確認** — `/marketplace.json` も認証必須のため CI/CLI から応答を取れない
- [x] PR merge と default branch reconciliation が完了 — merge commit `16a6f915` (2026-08-02T01:57:58Z)

1 件でも欠けたまま P01〜P13、親 Beads、dev-graph node を完了にしない。
**2026-08-02 時点で 6 件中 2 件が成立**したにとどまるため、dhy ファミリーは依然 close しない。

### dev-graph PR linkage の記録 (未実施)

`SYS-DUAL-CATALOG-WEB-P01`〜`P13` と `feat-dual-catalog-web` の `pull_request_linkages` は空のままである。
正規経路 `reconcile-github-lifecycle.py --mode check` が 2026-08-02 時点で `eligible: false` を返し、
次の 2 点を conflict として報告するため、graph へ手で書き込まない。

1. **PR #628 に exact marker も `gh:pr` gate も無い。** 判定は本文の `dev-graph: <graph_node_id>` マーカーが
   ちょうど 1 件あるか、beads 側の `gh:pr` gate が存在するかを見る。#628 は merge 済みであり、
   本文への後付けは「merge 前に紐付けを宣言する」という gate の趣旨を満たさない。
2. **worktree が clean かつ remote default branch と同期していない。** 未コミット変更を保持する間は解消しない。

本ブランチの変更を commit・push し main へ反映したうえで、node ごとに下記で状態を確認する。
gate を張ると `--mode reconcile` が completion 方向 (beads close・feature rollup) へ進む経路が開くため、
§2 の完了条件 6 件が揃うまでは `check` に留めること。

```bash
python3 plugins/dev-graph/scripts/reconcile-github-lifecycle.py \
  --repo-root . --graph .dev-graph/state/graph.json \
  --mode check --graph-node-id SYS-DUAL-CATALOG-WEB-P13 \
  --repo daishiman/HarnessHub --pr 628
```

## 3. 引き継ぎ

| 項目 | 状態 | 次のアクション |
|---|---|---|
| repository 実装・テスト・文書 | 完了 | — (PR #628 merge 済 / `16a6f915`) |
| dev-graph PR linkage | 未記録 | commit/push 後に §2 の `--mode check` で eligible を確認 |
| 本番デプロイ | **完了 (2026-08-02)** | — (`hub-ci` run `30727984628`) |
| smoke | 未実行 | 認証セッションを用意し release record §3.1〜3.4 を実施 |
| axe | 8 files / 63 tests 内で pass | CI 再確認 |
| CWV | **未達 (計測経路が無い)** | 認証付き Lighthouse 経路を feat-hub-foundation 側で整備 |
| U5 | 未判定 | 提供者代表が本書 §1 の手順 2〜4 を実施 |
| 低品質報告導線 | 未実装 | S14 実装後 |
| 配布出口 | `pending-h7` | Stage 0 H7 結論待ち |
