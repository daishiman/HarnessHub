---
status: confirmed
layer: feature-design
task: SYS-BUILD-IDENTITY-P01
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P01 要件ベースライン — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`

## 何を解こうとしているか

2026-08-03 に「サインイン後の着地先」を直した commit が、2026-08-07 まで **4 日間** 本番へ反映されていなかった。
その間、

- GitHub Actions の deploy job は `success` を返し続けた
- `/health` は 200 を返し続けた
- 続く smoke は「修正前のコード」を叩くため落ち、その失敗がまた rollback を呼んで古い版への固定を強めていた

つまり **誰も「本番で動いているのが 4 日前のコードだ」と気づける手段を持っていなかった**。
本 feature が解くのはサインインの不具合そのものではなく、**その不具合が 4 日間見えなかったこと**である。

## 本質的な欠落

`/health` が返していたのは Cloudflare の `version id` だけだった。version id は「いま配信されている版」を示すが、
**それが repository のどの commit なのか** は分からない。この対応が取れないことが障害の本体である。

| 問い | 従来 | 必要 |
|---|---|---|
| いま何が配信されている？ | version id で分かる | — |
| その版はどの commit？ | **分からない** | `/health` の `commit` |
| その commit は古くないか？ | **分からない** | 鮮度検査 |

## 要件 (R)

| id | 要件 | 由来 |
|---|---|---|
| R1 | 稼働中の成果物が「どの commit か」を認証なしで確認できる | 障害時に誰でも即座に切り分けられること |
| R2 | commit の埋込は CI の deploy 時に自動で行い、人手更新に依存しない | 手動更新は必ず腐る |
| R3 | 稼働版が既定 branch の HEAD より古い状態が **続いている** ことを検出する | 「古いこと」自体は deploy 中に常時起きる |
| R4 | しきい値超過を再現した fixture で、検査が **実際に落ちる** ことをテストで固定する | 判定式の書き間違いで常時緑になる事故を防ぐ |
| R5 | 露出する値に内部 path・secret・個人データを含めない | security-spec §5.2 / qa-151 [147-b] 非記録契約 |

## 受け入れ条件 (acceptance)

1. `/health` の応答から稼働成果物の commit が認証なしで読める
2. commit は CI の deploy 時に自動で埋め込まれ、手動更新の手順を必要としない
3. HEAD より古い状態が継続していることを検出する経路が CI に配線されている
4. しきい値を超えた状態を再現する fixture で、検査が exit 非 0 で落ちることがテストで固定されている
5. 露出値が内部 path・secret・個人データを含まない

## 非スコープ (scope_out)

- サインイン不具合そのものの修正（別 feature `feat-post-signin-scope-routing` の担当）
- Cloudflare 側の deployment 履歴 API を判定根拠にすること（表示仕様変更でパース失敗が空文字になり素通りしうるため、判定は `/health` の JSON だけに寄せる）
- 鮮度検査失敗を契機とした自動 rollback（後述 P02 の決定を参照）
