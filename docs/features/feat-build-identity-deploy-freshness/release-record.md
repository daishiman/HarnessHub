---
status: confirmed
layer: feature-release
task: SYS-BUILD-IDENTITY-P13
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P13 リリース判定と書き戻し — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`
記録日: 2026-08-08

## リリース判定

**判定: 実装完了。最終レビュー指示により commit / push / draft PR を実施する。**

| 条件 | 状態 |
|---|---|
| 受け入れ条件 5/5 | PASS（`acceptance-report.md`） |
| 品質ゲート（lint / typecheck / test / auth-gates / plan 整合） | 全て緑（`quality-report.md`） |
| 証跡固定（source digest + 再実行コマンド） | 完了（`evidence.md`） |
| 運用手順 | 完了（`operations.md`） |
| 本番実測 | **未取得**（merge → deploy 後にしか取れない） |

## deploy 後に取るべき実測（未実施）

deploy が通った直後に次を実行し、結果をこの節へ追記する。

```bash
# 1. commit が返ること
curl -s -H 'Cache-Control: no-cache' "$HUB_HEALTH_URL" | jq '{version, commit}'
#    期待: commit が 40 桁 hex で、その run の GITHUB_SHA と一致する

# 2. 鮮度検査が緑で通ること
#    期待: deploy job の「稼働ビルドの鮮度検査」step が outcome=success、
#          JSON 証跡の outcome が up-to-date（または deploy 直後なら lagging-within-grace）
#
# 3. 最初の smoke が deploy 版へ当たること
#    期待: deploy job の「smoke 直前の配信版再確認」step が outcome=success、
#          /tmp/smoke-version-recheck.json が deployment version と /health.version の
#          連続 3 回一致を記録する。失敗時は smoke / rollback が実行されないこと。
```

**取得するまで「確認済み」とは書かない。** 未取得を確認済みと書くことこそ、
本 feature が防ごうとしている失敗そのものである。

## 書き戻し先

| 先 | 内容 |
|---|---|
| `specs/harness-hub-build-identity-deploy-freshness-addendum.md` | V6/V7 の実装確定契約（親 addendum が 500 行超になるため分離） |
| `docs/features/feat-post-signin-landing-surface/landing-observability-investigation.md` | §8 は索引のみ（契約本文は上記追補へ） |
| `architecture/harness-hub-infrastructure.md` | 2026-08-08 節へ実装確定を追記 |
| `docs/infrastructure-spec.md` | `/health.commit`・鮮度検査 step・rollback 除外 |
| `system-spec/dev-workflow.md` / `index.md` | 実装 writeback 索引（elicitation セルは再オープンしない） |
| `docs/features/.../spec-reflection-receipt.md` | 仕様反映受領書 |

## 次の外側ループへの引き継ぎ

1. **本番実測の取得** — 上記 2 項目。deploy 後に本文書へ追記する。
2. **検査 ID の整理** — 仕様追補の §4 見出し（V6 = 環境値の読み出し規律 / V7 = 縮退の観測可能性）と
   acceptance 末尾の括弧（V6 = 稼働ビルドの素性 / V7 = 反映鮮度）で、同じ ID が別の対象を指している。
   本 feature では **どちらにも寄せず、両方の存在を記録するに留めた**。
   ID を再割当てすると過去の議事録・issue 本文との対応が切れるため、整理は独立した判断として行うべきである。
3. **鮮度検査の適用範囲** — 現在は production deploy job のみ。preview Worker は PR ごとに払い出されるため
   「毎回が初回 deploy」であり、鮮度という概念が当てはまらない。適用しないという判断を明示的に残す。

## 学びとして残すこと

今回の障害の本体は、サインインの不具合ではなく **「本番で動いているのが何なのか分からなかったこと」** だった。
修正済みのコードに対して smoke が落ち続け、その失敗が rollback を呼び、古い版への固定を強めていた。
**成功を返し続ける仕組みは、壊れていることを隠す。**

そこから引いた設計原則は 3 つである。

1. **欠落は欠落のまま表す** — `unknown` を入れると「素性不明」と「素性 = unknown」が区別できない
2. **「検査できなかった」を「成功」と混同しない** — fail-open は、配線が壊れた瞬間に検査を永久に緑にする
3. **証拠が無いなら戻さない** — 鮮度検査で止まった時点で smoke は未実行 = 新版が壊れている証拠は無い
