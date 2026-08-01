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

1. 本 feature を含む版を本番へ deploy する。
2. 2 顧客 Workspace の各々で、作者の公開と owner 以外の発見・導入を確認する。
3. 同時に成立し、互いの catalog に相手の項目が現れないことを確認する。
4. pass/fail と証跡を本書へ追記する。

## 2. リリース判定

**未リリース (deploy 未実施)。** 低品質報告導線を除く repository 内実装は完了しているが、
deploy、production smoke、CWV、U5 の外部実測が残る。

### 実行手順

```bash
git status
gh run list --workflow ci.yml --branch main --limit 1
gh workflow run hub-cwv --ref main \
  -f target_url="https://harness-hub.daishimanju.workers.dev/catalog"
gh run watch
```

deploy 後は release record §3.1〜3.4 の smoke を実行する。

### 完了条件

- [ ] `ci.yml` deploy job が success
- [ ] catalog 一覧・詳細・marketplace smoke が pass
- [ ] catalog route の CWV が LCP ≤ 2500ms / CLS ≤ 0.1 / TBT ≤ 200ms
- [ ] acceptance record が実測値付き pass
- [ ] marketplace `source_status` が Stage 0 gate verdict と一致
- [ ] PR merge と default branch reconciliation が完了

1 件でも欠けたまま P01〜P13、親 Beads、dev-graph node を完了にしない。

## 3. 引き継ぎ

| 項目 | 状態 | 次のアクション |
|---|---|---|
| repository 実装・テスト・文書 | 完了 | draft PR review / merge |
| 本番デプロイ | 未実施 | main merge 後の CI |
| smoke | 未実行 | deploy 後に release record §3 |
| axe | 8 files / 63 tests 内で pass | CI 再確認 |
| CWV | 未達 | catalog route deploy 後に実測 |
| U5 | 未判定 | 提供者代表が本書 §1 を実施 |
| 低品質報告導線 | 未実装 | S14 実装後 |
| 配布出口 | `pending-h7` | Stage 0 H7 結論待ち |
