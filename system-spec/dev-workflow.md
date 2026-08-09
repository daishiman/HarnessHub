---
status: confirmed
category: dev-workflow
aggregate: 確定
spec_cells: [dev-workflow.web, dev-workflow.mobile, dev-workflow.tablet, dev-workflow.desktop-windows, dev-workflow.desktop-linux, dev-workflow.desktop-macos]
serves_goals: [G1, G4, G5]
---

# 開発フロー (dev-workflow)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-216 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-216 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-216 |

## 確定内容 (質疑録)

### qa-216 (対応セル: web, desktop-windows, desktop-macos)

**質問**: 実装済み selector と現行配線に合わせて dev-workflow の stale 記述と tier 語彙をどう補正するか。

**回答**: 【本 entry の位置づけ】
本 entry は qa-214 を全面継承し、2026-08-09 の selector 実装済み事実と tier 語彙の統一を反映した自己完結版である。仕様章 (compile-spec-doc.py) は確定セルの現 qa_ref に対応する節だけを出力するため、追補のみを持つ entry でセルを再確定すると、基礎となる契約本文が章から消える。章が仕様の中核を語らなくなるのを防ぐため、追補を重ねるときは基礎契約を丸ごと引き継いだ統合 entry を作る。以下、統合元ごとに節を分ける。

===== web (CI/CD) の 3 tier と決定論的選択 (統合元: qa-208) =====
【当該 entry の質問】品質検証が一律最大深度で実行され、1 周 2〜3 時間から 10 時間超に達して MVP 原則 (まず動くものを速く出し、そこから検証する) に反しています。検証時間の上限値ではなく検証深度の基準そのものを変えるとき、どの深度をどの根拠で選ぶかを CI 側でどう決定論的に定めますか?

ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-143 の plugin hook entry point 3 者一致契約および qa-142 以前の dev-workflow.web 契約を全面維持したまま、検証深度を risk 比例で決める verification profile を追加確定する。時間上限を成功基準にしない (実行すべき検証量は変更内容と物量に依存し、一律の時間予算は検証の形骸化 = Goodhart 化を招くため)。

【1. 3 tier と決定論的選択】検証深度を mvp / standard / critical の 3 tier とし、tier は人の裁量ではなく変更差分から決定論的に導出する。導出入力は (a) 変更 path 集合、(b) 逆転不能性、(c) 公開面の 3 つだけとする。critical は認証認可・DB migration・データ削除経路・production deploy unit・公開 catalog のいずれかに触れた場合。standard は製品 runtime コード (外部 API / UI / DB 読み取り経路) に触れた場合。いずれにも該当しない repository 内 tooling・plugin・spec 文書・未公開 feature 実装は mvp とする。判定は scripts/select-verification-tier.py が変更 path から算出し、算出根拠 (該当した規則 id と path) を JSON で出力する。同じ差分に対して常に同じ tier を返し、環境や実行者で揺れない。

【2. tier 引き上げの自動性と引き下げの記録義務】規則が上位 tier を指す場合は自動的に引き上げる。人が算出結果より低い tier で実行する場合は --downgrade-to <tier> --reason <理由> を必須とし、理由と算出根拠を eval-log へ残したうえで後述の deferred issue を必ず起票する。無記録の引き下げは fail-closed で拒否する。

【3. tier に依らず常時 fail-closed の 3 ゲート】secret / credential 漏洩検査、データ破壊・worktree clobber ガード (qa-140 の pre-commit 整合性ガード)、build / type check の 3 種は全 tier で blocking を維持する。理由はいずれも失敗の代償が検証時間を上回る不可逆事故 (公開後に取り消せない漏洩・作業そのものの消失・壊れたものを動くものとして出荷) であり、MVP の速度目的と衝突しないためである。

【4. tier 別の blocking 集合】mvp は上記 3 ゲートに加えて、変更 module に対する focused test だけを blocking とする。standard は加えて該当 package の単体・結合テストと契約検証を blocking とする。critical は従来どおり全深度 (完成度 evaluator 全 aspect・独立監査 fork・live-trial 全 scenario) を blocking として維持する。blocking から外れた検査は無効化せず advisory として実行し、結果は run を止めずに報告する。

【5. 降格分の被覆保全 (放棄でなく延期)】advisory へ降格した検査の finding は 0 件へ潰さず、bd の follow-up issue として必ず起票する。issue は元ゲート名・算出 tier・降格根拠・対象 path・再実行コマンドを持ち、deferred-verification ラベルで台帳化する。起票に失敗した場合は降格自体を fail-closed で拒否する (降格が黙って被覆を消す経路を作らない)。Stage 1 公開判定の直前に 1 箇所だけ deferred-verification の未解決 0 件ゲートを置き、MVP 期間中に積んだ延期分をそこで必ず回収する。

【6. 製品境界】変更は repository 内の CI・品質ゲート・plugin 配布に限定する。Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

【再採番・rebase 追記 (2026-08-09)】本 entry は当初 qa-144 として起票したが、並行セッションが 同一番号を別論点 (サインイン後のスコープ解決とルーティング結線) で先に確定させていたため qa-208 へ 再採番した。回答内容は変更していない。本文が「維持する」と述べる既存契約の参照点は、main 取込後の 最新確定 (dev-workflow.web=qa-199 / testing-qa.web=qa-205) まで含めて読むこと。本 entry はそれらを 覆さず、その上へ tier 別の検証深度契約を重ねる。

===== desktop ローカル環境での tier 再現 (統合元: qa-209) =====
【当該 entry の質問】作者のローカル desktop 環境 (macOS 主 / Windows 従) で、CI と同じ verification profile を再現しつつ、goal-seek ループ・独立監査 fork・live-trial といった重い検証をどこまで既定で省略しますか?

ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-140 の並列 worktree 安全契約・更新時刻クラスタ診断契約と qa-102 の C11 本文 readiness・C02 lifecycle / document layer parity・live-trial session 環境隔離契約を全面維持したまま、ローカル実行側の verification profile を追加確定する。

【1. tier 正本の一元化】tier 算出の正本は scripts/select-verification-tier.py の 1 実装とし、ローカルも CI も同じ script を同じ入力で呼ぶ。ローカル専用の緩い判定表を別に持たない。macOS と Windows で同一の pnpm script から起動でき、パス区切り・改行・特定 shell に依存しない。

【2. 既定 tier と goal-seek ループ回数】ローカル既定は mvp とする。skill の goal_seek.max_loops は tier 別に mvp=1 / standard=3 / critical=5 とし、frontmatter の固定値 5 を tier 解決値で上書きする。max_loops に達して未達が残る場合、mvp では失敗にせず未達 checklist を deferred-verification issue へ落として正常終了する (critical では従来どおり未達を fail とする)。

【3. 独立監査 fork と live-trial の起動条件】assign-*-evaluator の独立監査 fork と run-skill-live-trial は tier=critical でのみ必須とする。mvp / standard では既定で起動せず、起動を省略した事実と対象を deferred-verification issue へ記録する。--tier critical または --force で明示起動する経路は残し、必要時にいつでも全深度へ戻せるようにする。

【4. 常時 fail-closed の維持】qa-140 の pre-commit 整合性ガード (index tree が HEAD 同一内容の祖先 tree に一致する場合と staged 削除が安全閾値を超える場合の拒否)、reference-transaction hook、secret scan、build / type check はローカルでも tier に依らず維持する。並列 worktree の巻き戻しはデータ消失であり、短縮対象にしない。

【5. 回帰と境界】tier 算出の正負例 (path 別・逆転不能性別・公開面別)、downgrade の理由必須、deferred issue 起票失敗時の fail-closed、max_loops の tier 別解決、fork / live-trial の起動条件を自動テストする。変更は repository 内の開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

【再採番・rebase 追記 (2026-08-09)】本 entry は当初 qa-145 として起票したが、並行セッションが 同一番号を別論点 (サインイン後のスコープ解決とルーティング結線) で先に確定させていたため qa-209 へ 再採番した。回答内容は変更していない。本文が「維持する」と述べる既存契約の参照点は、main 取込後の 最新確定 (dev-workflow.web=qa-199 / testing-qa.web=qa-205) まで含めて読むこと。本 entry はそれらを 覆さず、その上へ tier 別の検証深度契約を重ねる。

===== 検査結果の履歴保存・evaluator cache・selector 利用不能時の境界 (統合元: qa-212、現行補正: qa-216) =====
【当該 entry の質問】MVP tier で省略・降格した検査を後から検証できるように tier 選択と検査結果をどう残すべきか。また実装済み selector が利用不能になった場合、実行系はどう失敗を扱うべきか。

【1. 検査結果の履歴保存 (施策1)】
tier 選択のたびに `eval-log/verification-tier/<run-id>/tier-decision.json` を 1 件生成する。必須フィールドは次のとおりとする。

- `run_id` / `decided_at` (UTC ISO8601) / `target` (feature id または task id)
- `tier` (mvp | standard | critical) と `matched_rules` (tier を決めた規則 id の配列)
- `inputs`: tier 導出に使った決定入力の実測値 (変更 path 集合・変更 file 数・実効変更行数・影響 package 数)
- `checks`: 検査ごとに `{id, disposition, reason}`。`disposition` は `executed` | `deferred` | `skipped` の 3 値
- `deferred_issue_refs`: `deferred` にした検査を受け止める beads issue id の配列 (空配列を許さない。deferred が 1 件でもあれば必須)

`skipped` と `deferred` を同じ値に潰さない。`skipped` は「この tier では恒久的に実行しない」、`deferred` は「この周回では実行しないが、後続で必ず実行する」であり、後者だけが issue 追跡義務を負う。両者を潰すと「省略した」と「落ちた」が事後に区別できなくなる。

保存は append-only とし、既存 run の tier-decision.json を上書き・削除しない。critical tier へ昇格したときも過去の mvp 判定を消さず、`supersedes` に旧 run_id を書いて連鎖を残す。

【2. evaluator 結果の cache (施策2)】
同一入力に対する evaluator の再実行を避けるため、`eval-log/verification-tier/cache/<cache-key>.json` に結果を保存する。`cache_key` は次の 3 要素の sha256 とする。

- 評価対象の実体 digest (対象 file 群の内容 sha256 を path 昇順で連結したもの。mtime や path 単体は使わない)
- evaluator の識別子と version (rubric 改訂で cache が自動失効するため)
- 評価に効く設定値 (tier、閾値、有効化した検査 id 集合)

cache hit を採用した場合も `checks[].disposition` は `executed` とし、`cache_hit: true` と `cache_key` を併記する。cache を根拠に「実行した」と申告しつつ、どの入力に対する結果かを追えない状態を作らない。cache miss と cache 破損 (schema 不適合・digest 不一致) は区別し、破損時は cache を使わず再実行する (fail-open で古い PASS を再利用しない)。

【3. selector の現行実装と利用不能時の境界 (施策4・2026-08-09 補正)】
`scripts/select-verification-tier.py` は 2026-08-09 に実装済みであり、変更 path から mvp / standard / critical を決定論的に算出する。CI は `.github/workflows/governance-check.yml` から同 script を 1 回だけ起動し、`--derive-checks` で gate 台帳を一方向に導出して `tier-decision.json` を保存する。`tier_selector` には script path・source digest・rules digest を記録し、`scripts/validate-tier-decision.py` は `tier_selector: "absent"` を受理しない。

selector の欠落・破損・base ref 解決不能・変更 path 空集合は、通常運用では standard への黙示 fallback にせず run を fail-closed で停止する。過去または bootstrap 環境で `tier_selector: "absent"` を記録済みの run は有効な tier 判定とみなさず、critical tier 相当の再検証対象とする。これにより、判断主体が不在のまま mvp の検査削減だけが既定化する経路を閉じる。

現行 CI 配線は tier・blocking/advisory/deferred 集合の算出、妥当性検査、artifact 保存までを実装済みである。一方、下流 gate の実行自体を tier に応じて切り替える処理は未実装であり、`HarnessHub-xcl3` で追跡する。evaluator cache の writer/lookup/store 機構は `scripts/build-evaluator-cache.py` に実装済みだが、実 evaluator 呼出元への接続は未完了であり `HarnessHub-6nf1` で追跡する。実装済み機構と実運用で効いている機能を混同しない。

## 上流指針 (doctrine anchor)

- 本カテゴリは共通シード (categories) 外のプロジェクト固有カテゴリで、approved な pending 例外 (owner: daishiman) として上流指針を確定している。

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

- `ref-system-design-knowledge/references/resource-map.yaml` (このカテゴリ専用の deep card は resource-map に未定義。本章の設計判断は「上流指針 (doctrine anchor)」節の authority と「確定内容 (質疑録)」を正本とする)

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
