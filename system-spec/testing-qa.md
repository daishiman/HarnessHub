---
status: confirmed
category: testing-qa
aggregate: 確定
spec_cells: [testing-qa.web, testing-qa.mobile, testing-qa.tablet, testing-qa.desktop-windows, testing-qa.desktop-linux, testing-qa.desktop-macos]
serves_goals: [G1, G4, G5]
---

# テスト戦略・品質保証 (testing-qa)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-217 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の mobile 行と同根拠)。テスト実行は web 行 (CI) と desktop-windows/desktop-macos 行 (作者ローカル) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の tablet 行と同根拠)。テスト実行は web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-211 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。dev-workflow の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner 上のテスト実行は CI 実行基盤として web 行の品質ゲート要件でカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-211 |

## 確定内容 (質疑録)

### qa-217 (対応セル: web)

**質問**: testing-qa.web の full / critical 表記ずれを、閉じた tier 語彙とどう整合させるか。

**回答**: 【本 entry の位置づけ】
本 entry は qa-215 を全面継承し、tier 語彙を mvp / standard / critical に統一した自己完結版である。仕様章 (compile-spec-doc.py) は確定セルの現 qa_ref に対応する節だけを出力するため、追補のみを持つ entry でセルを再確定すると、基礎となる契約本文が章から消える。章が仕様の中核を語らなくなるのを防ぐため、追補を重ねるときは基礎契約を丸ごと引き継いだ統合 entry を作る。以下、統合元ごとに節を分ける。

===== production coverage smoke (統合元: qa-205 / `HarnessHub-p0lr`) =====
ユーザーの 2026-08-08 最終レビュー・仕様反映指示を明示承認として、既存の test pyramid、production rollout、credential 最小権限、rollback 契約を全面維持し、次の production coverage smoke 契約を追加確定する。

【1. 実行順序】Worker deploy、health、配信版 identity / freshness、OIDC・既存 data・hearing smoke の後に coverage smoke を毎デプロイ実行する。coverage smoke の失敗は既存 smoke と同じ rollback 判断へ入力し、deploy freshness または配信版再確認だけで停止した場合は未実行 smoke を失敗と誤認して rollback しない。

【2. scope 判定】S1-S8 として unauthenticated、missing_tenant_scope、ambiguous_scope、tenant mismatch の存在秘匿 404、workspace 非所属、Bearer credential 不許可、scope 不足、provider-admin 越境の edge 実挙動を検査する。サインインページ O5 は外部 returnTo が callbackUrl・href・action・content の遷移位置へ入らず、安全な既定 /sheets へ落ちることを SSR 応答で検査する。

【3. Feedback / Docs】Feedback は create、service read、AI pull、complete writeback、status 遷移を同じ使い捨て tenant で往復し、Docs は document 作成、doc_draft enqueue、pull、complete writeback、別 tenant 非可視、Bearer read 拒否を往復する。session-only action は新しい Google OIDC secret を追加せず route と同じ server code と production DB adapter で実行し、HTTP 側では Bearer credential の拒否を実測する。token 経路は本番 Device Flow の access token を使う。

【4. 隔離と後始末】2 個の使い捨て tenant を作り、成功・失敗にかかわらず feedbacks、documents、builds を含む関連行を削除して残数 0 を確認する。secret 値、token、本文をログへ出さない。

【5. 未確定境界】provider-admin 越境は edge 404・監査行 0 と route 層契約が不一致なため、本 smoke は現行挙動を診断として固定し、設計統一を別 Beads 課題 HarnessHub-stmx で追跡する。smoke:publish-production は新規 PUBLISH_ACCESS_TOKEN と権限台帳更新が必要なため本変更では CI 結線せず、追跡課題を完了するまで手動 runner のままとする。実 production deploy の実走証拠が無い限り、関連 P13 task を完了扱いにしない。

【6. 製品境界】外部 API、DB schema、認証認可の製品判断、UI、Cloudflare deploy unit は変更しない。変更は既存契約を本番で観測する品質ゲート、使い捨て試験データの cleanup、CI rollback 判断への証拠追加に限定する。

【実装後の実測 (2026-08-08)】main `35a10b87` / hub-ci run `31253674292` で coverage smoke が `status: pass`、S1〜S8 / F1〜F5 / D1〜D6 SUCCESS、使い捨て 2 tenant の残存行 0 を確認した。これにより【5】の「実走証拠」条件は充足済み。P13 close は default-branch reconciliation と `HarnessHub-stmx` の契約状態に従う。

===== tier 別必須ゲート集合と被覆の取りこぼし防止 (統合元: qa-210) =====
【当該 entry の質問】タスク管理・要件定義・タスク仕様書 (exact-13) の各成果物について、完了条件を全ゲート PASS から tier 別の必須集合へ変えるとき、被覆の取りこぼしをどう防ぎますか?

ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-134 の task 仕様書の世代非依存 rerun command 契約と qa-076〜qa-132 の testing-qa.web 契約を全面維持したまま、成果物側の readiness 判定を tier 別へ変更する契約を追加確定する。

【1. タスク管理 (bd / dev-graph)】task の close 条件を全ゲート PASS ではなく、算出 tier の blocking 集合の PASS とする。advisory 結果は close を妨げず、finding があれば deferred-verification issue として当該 task に blocks でない関連辺で紐づける。deferred issue が 0 件生成された場合と advisory を実行しなかった場合を同じ 0 に潰さず、zero_attribution (not-run / run-and-clean / downgraded) を記録して区別する。

【2. 要件定義 (dev-graph requirements readiness)】readiness 判定を tier 別の必須項目集合へ変える。mvp の必須は 受入基準・影響範囲 (変更する path 集合)・検証コマンド の 3 項目のみとし、それ以外の項目は任意として不足を readiness 不成立にしない。standard は加えて 非機能要件・依存関係、critical は従来の全項目を必須とする。任意扱いにした項目は空欄のまま放置せず deferred-verification issue へ落とす。

【3. タスク仕様書 (exact-13)】intra-feature DAG が壊れるため 13 package の骨格 (P01-P13 の存在と依存辺) は tier に依らず維持する。一方 promotion 条件は tier 別とし、mvp では実装に直接必要なコア package の本文完成のみを必須とする。本文未完の package は空欄ではなく deferred_body として理由と再開コマンド付きで明示し、同名の deferred-verification issue を持つ。feature epic の rollup gate は exact-13 closed を要求し続けるが、deferred_body を持つ package は closed 到達前に本文を埋める必要があるため、MVP の高速化と最終的な完全性が両立する。

【4. 完成度 evaluator の aspect 分離】assign-system-spec-completeness-evaluator の 6 aspect を、tier=mvp / standard では foundation_trace と matrix_coverage を blocking、doc_freshness・design_knowledge_reflection・decision_guidance・prompt_quality を advisory とする。tier=critical では従来どおり 6 aspect 全てを blocking とする。advisory の FAIL は verdict を FAIL にせず ADVISORY_FAIL として区別し、deferred-verification issue を起票する。依存 version の世代落ちのような時間経過由来の finding が MVP 実装を止める現状の詰まりは、この分離で解消する。

【5. 回帰と証跡】tier 別 readiness の正負例、deferred_body を含む package の validate/projection、zero_attribution の 3 値、advisory FAIL が verdict を落とさないこと、deferred issue 起票失敗時の fail-closed を自動テストする。結果と仕様反映範囲を受領書および Beads notes へ残す。

【再採番・rebase 追記 (2026-08-09)】本 entry は当初 qa-146 として起票したが、並行セッションが 同一番号を別論点 (サインイン後のスコープ解決とルーティング結線) で先に確定させていたため qa-210 へ 再採番した。回答内容は変更していない。本文が「維持する」と述べる既存契約の参照点は、main 取込後の 最新確定 (dev-workflow.web=qa-199 / testing-qa.web=qa-205) まで含めて読むこと。本 entry はそれらを 覆さず、その上へ tier 別の検証深度契約を重ねる。

===== blocking 軸と execution 軸の分離 (統合元: qa-213) =====
【当該 entry の質問】web セルの検査は現状「実行する / しない」の 2 値で語られているが、advisory 検査を実行したまま blocking 集合だけ縮めても wall-clock は縮まない (F-0003)。検査の扱いをどう表現し直すべきか。

【1. execution 軸の導入 (施策3)】
検査の扱いを「blocking か advisory か」の 1 軸で語るのをやめ、**blocking 軸と execution 軸の 2 軸**で表現する。

- `blocking` 軸: `blocking` | `advisory`。失敗が run を止めるかどうかだけを決める。
- `execution` 軸: `sync` | `async` | `skip`。いつ実行するか (あるいは実行しないか) を決める。

| execution | 意味 | wall-clock への寄与 |
|---|---|---|
| `sync` | 当該 run の中で実行し、完了を待つ | 加算される |
| `async` | 実行はするが完了を待たず、結果は後続 run か issue で回収する | 加算されない |
| `skip` | この tier では実行しない | 加算されない |

従来「advisory にして高速化する」と述べていた箇所は、実際には `blocking=advisory, execution=sync` を意味しており、待ち時間は一切減っていなかった。高速化を意図する場合は `execution` を `async` か `skip` へ落とすこと。`blocking` を緩めるのは失敗時の停止可否を変えるだけで、速度の施策ではない。

【2. tier ごとの既定】
- mvp: 主要検査は `sync`、重い横断検査 (E2E・full matrix・rubric 全周) は `async`。`skip` は「この tier で恒久的に不要」と説明できるものだけに限る。
- standard: 全検査 `sync`。
- critical: 全検査 `sync` かつ全て `blocking`。

`async` にした検査は `tier-decision.json` の `checks[].disposition` を `deferred` とし、`deferred_issue_refs` に回収先 issue を必ず持たせる (qa-212【1】と同一契約)。`async` は「後で必ず実行する」約束であり、回収先のない `async` は実質 `skip` なので、そう書くこと。

【3. 適用範囲】
本 entry は testing-qa の web セルに対する契約である。desktop-windows / desktop-macos は qa-211 の契約 (検証深度の tier 別契約) を維持し、execution 軸は web の実測で有効性を確認してから展開する。先に全 platform へ広げない理由は、`async` の回収機構が未実装であり、回収されない `deferred` を 3 platform 分同時に生むリスクを避けるためである。

【4. tier 語彙の正本 (2026-08-09 補正)】
検証 tier の閉じた語彙は `mvp` / `standard` / `critical` の 3 値だけとする。qa-213 に残っていた `full` は `critical` の旧表記であり、新規の第 4 tier ではない。台帳・CLI・CI・仕様本文では `critical` だけを生成・受理し、過去記録の `full` を読む必要がある場合だけ legacy alias として `critical` へ正規化する。

### qa-211 (対応セル: desktop-windows, desktop-macos)

**質問**: ローカル desktop でテストを実行するとき、mvp tier の focused test をどう選び、広域回帰をどう扱いますか?

**回答**: ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-095 の skill 構造 lint の生成物境界契約と層別テスト方針を全面維持したまま、tier 別のテスト選択契約を追加確定する。

【1. focused test の決定論的選択】mvp tier の blocking テストは、変更 path から到達する package の focused test に限定する。選択は scripts/select-verification-tier.py が出力する影響 package 集合を入力とし、実行者の勘で選ばない。該当 package が特定できない変更 (共有 utility や設定) は standard へ自動昇格させ、選択不能を暗黙の省略にしない。

【2. 広域回帰の非同期化】実際の実行順序を再現する広域回帰は mvp tier の blocking から外し、CI の非同期 job として実行する。失敗は当該変更の merge を止めず deferred-verification issue として起票し、次の standard 以上の実行または Stage 1 公開判定ゲートで回収する。critical tier では従来どおり広域回帰を同期 blocking として維持する。

【3. 層別方針の維持】frontend は behavior ベース、backend は API 契約 / ロジック単体 / DB 結合、infrastructure と repository tooling は静的契約 / 実行順序 / fail-closed 境界という層別方針は tier に依らず維持する。pixel・DOM 内部構造・一時生成物の物理配置へ品質判定を密結合させない方針も維持する。tier が変えるのは検証の量と同期性であって、検証の当たり所ではない。

【4. 生成物境界の維持】skill 構造 lint が dot cache および __pycache__ / .pyc を構造判定から除外する qa-095 の契約は tier に依らず維持する。

【5. platform と製品境界】同じ Python / pnpm 実装と同じコマンドを desktop-windows / desktop-macos で利用する。変更は repository 内の開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

【再採番・rebase 追記 (2026-08-09)】本 entry は当初 qa-147 として起票したが、並行セッションが 同一番号を別論点 (サインイン後のスコープ解決とルーティング結線) で先に確定させていたため qa-211 へ 再採番した。回答内容は変更していない。本文が「維持する」と述べる既存契約の参照点は、main 取込後の 最新確定 (dev-workflow.web=qa-199 / testing-qa.web=qa-205) まで含めて読むこと。本 entry はそれらを 覆さず、その上へ tier 別の検証深度契約を重ねる。

## 上流指針 (doctrine anchor)

- 本カテゴリは共通シード (categories) 外のプロジェクト固有カテゴリで、approved な pending 例外 (owner: daishiman) として上流指針を確定している。

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Test Strategy — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/test-strategy.md`

#### 目的

検証手段を層ごとに配分し、想定する失敗が本番到達前に、原因を特定できる粒度で検出される状態をつくる。

#### 解決する問題

- 高層 (E2E) に検証を寄せ、実行が遅く不安定になり、失敗が調査されず無視される。
- テストが実装詳細 (内部構造・DOM 構造・一時生成物の配置) に結合し、リファクタリングのたびに壊れる。
- 契約 (API・スキーマ・列挙値) の不整合が、実行時まで検出されない。
- カバレッジ率が閾値を満たしても、重要な分岐や失敗経路が未検証のまま残る。
- 同じ検証が複数層で重複し、実行時間だけが増えて検出力が上がらない。

#### 適用条件

- 変更が継続し、回帰の再発コストが検証コストを上回る。
- 検証対象の契約 (入出力・状態遷移・権限) を明文化できる。
- CI などで自動実行でき、失敗が担当者へ届き是正される運用がある。

#### 非適用条件

- 仕様が未確定の探索段階で、全層のテストを先行整備しない (残す実装が決まってから固める)。
- 外部サービスの挙動そのものを検証対象にしない (契約の消費側の扱いを検証する)。
- 生成物 (キャッシュ・ビルド出力) の物理配置など、設計契約でない実装詳細を合否条件にしない。

#### トレードオフ・失敗モード

- カバレッジ閾値の充足を品質と読み替え、重要な失敗経路の未検証を隠す (Goodhart 化)。
- モックを積み過ぎ、実装と乖離した世界だけで合格するテスト群になる。
- 不安定テスト (flaky) を再実行で通し、検出力を失いながら実行時間だけ払い続ける。
- E2E で網羅しようとして実行時間が伸び、開発中に回らなくなる。
- 検査ツールが情報源の一部しか見ておらず、同一定義の 3 件目がすり抜ける (網羅範囲の未定義)。

#### goalへの寄与

- 「どの失敗を防ぐためのテストか」を層ごとに記述でき、テスト追加の是非を目的から判断できる。
- 契約テストにより、仕様変更が利用側へ波及する箇所を実装前に特定できる。
- 品質ゲートを改善ループ込みで定義することで、合否表示ではなく是正の完了を確定条件にできる。

---

#### 本章での適用

##### 確定内容 qa-217 (対応セル: web)

- 確定要件: 【本 entry の位置づけ】
本 entry は qa-215 を全面継承し、tier 語彙を mvp / standard / critical に統一した自己完結版である。仕様章 (compile-spec-doc.py) は確定セルの現 qa_ref に対応する節だけを出力するため、追補のみを持つ entry でセルを再確定すると、基礎となる契約本文が章から消える。章が仕様の中核を語らなくなるのを防ぐため、追補を重ねるときは基礎契約を丸ごと引き継いだ統合 entry を作る。以下、統合元ごとに節を分ける。

===== production coverage smoke (統合元: qa-205 / `HarnessHub-p0lr`) =====
ユーザーの 2026-08-08 最終レビュー・仕様反映指示を明示承認として、既存の test pyramid、production rollout、credential 最小権限、rollback 契約を全面維持し、次の production coverage smoke 契約を追加確定する。

【1. 実行順序】Worker deploy、health、配信版 identity / freshness、OIDC・既存 data・hearing smoke の後に coverage smoke を毎デプロイ実行する。coverage smoke の失敗は既存 smoke と同じ rollback 判断へ入力し、deploy freshness または配信版再確認だけで停止した場合は未実行 smoke を失敗と誤認して rollback しない。

【2. scope 判定】S1-S8 として unauthenticated、missing_tenant_scope、ambiguous_scope、tenant mismatch の存在秘匿 404、workspace 非所属、Bearer credential 不許可、scope 不足、provider-admin 越境の edge 実挙動を検査する。サインインページ O5 は外部 returnTo が callbackUrl・href・action・content の遷移位置へ入らず、安全な既定 /sheets へ落ちることを SSR 応答で検査する。

【3. Feedback / Docs】Feedback は create、service read、AI pull、complete writeback、status 遷移を同じ使い捨て tenant で往復し、Docs は document 作成、doc_draft enqueue、pull、complete writeback、別 tenant 非可視、Bearer read 拒否を往復する。session-only action は新しい Google OIDC secret を追加せず route と同じ server code と production DB adapter で実行し、HTTP 側では Bearer credential の拒否を実測する。token 経路は本番 Device Flow の access token を使う。

【4. 隔離と後始末】2 個の使い捨て tenant を作り、成功・失敗にかかわらず feedbacks、documents、builds を含む関連行を削除して残数 0 を確認する。secret 値、token、本文をログへ出さない。

【5. 未確定境界】provider-admin 越境は edge 404・監査行 0 と route 層契約が不一致なため、本 smoke は現行挙動を診断として固定し、設計統一を別 Beads 課題 HarnessHub-stmx で追跡する。smoke:publish-production は新規 PUBLISH_ACCESS_TOKEN と権限台帳更新が必要なため本変更では CI 結線せず、追跡課題を完了するまで手動 runner のままとする。実 production deploy の実走証拠が無い限り、関連 P13 task を完了扱いにしない。

【6. 製品境界】外部 API、DB schema、認証認可の製品判断、UI、Cloudflare deploy unit は変更しない。変更は既存契約を本番で観測する品質ゲート、使い捨て試験データの cleanup、CI rollback 判断への証拠追加に限定する。

【実装後の実測 (2026-08-08)】main `35a10b87` / hub-ci run `31253674292` で coverage smoke が `status: pass`、S1〜S8 / F1〜F5 / D1〜D6 SUCCESS、使い捨て 2 tenant の残存行 0 を確認した。これにより【5】の「実走証拠」条件は充足済み。P13 close は default-branch reconciliation と `HarnessHub-stmx` の契約状態に従う。

===== tier 別必須ゲート集合と被覆の取りこぼし防止 (統合元: qa-210) =====
【当該 entry の質問】タスク管理・要件定義・タスク仕様書 (exact-13) の各成果物について、完了条件を全ゲート PASS から tier 別の必須集合へ変えるとき、被覆の取りこぼしをどう防ぎますか?

ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-134 の task 仕様書の世代非依存 rerun command 契約と qa-076〜qa-132 の testing-qa.web 契約を全面維持したまま、成果物側の readiness 判定を tier 別へ変更する契約を追加確定する。

【1. タスク管理 (bd / dev-graph)】task の close 条件を全ゲート PASS ではなく、算出 tier の blocking 集合の PASS とする。advisory 結果は close を妨げず、finding があれば deferred-verification issue として当該 task に blocks でない関連辺で紐づける。deferred issue が 0 件生成された場合と advisory を実行しなかった場合を同じ 0 に潰さず、zero_attribution (not-run / run-and-clean / downgraded) を記録して区別する。

【2. 要件定義 (dev-graph requirements readiness)】readiness 判定を tier 別の必須項目集合へ変える。mvp の必須は 受入基準・影響範囲 (変更する path 集合)・検証コマンド の 3 項目のみとし、それ以外の項目は任意として不足を readiness 不成立にしない。standard は加えて 非機能要件・依存関係、critical は従来の全項目を必須とする。任意扱いにした項目は空欄のまま放置せず deferred-verification issue へ落とす。

【3. タスク仕様書 (exact-13)】intra-feature DAG が壊れるため 13 package の骨格 (P01-P13 の存在と依存辺) は tier に依らず維持する。一方 promotion 条件は tier 別とし、mvp では実装に直接必要なコア package の本文完成のみを必須とする。本文未完の package は空欄ではなく deferred_body として理由と再開コマンド付きで明示し、同名の deferred-verification issue を持つ。feature epic の rollup gate は exact-13 closed を要求し続けるが、deferred_body を持つ package は closed 到達前に本文を埋める必要があるため、MVP の高速化と最終的な完全性が両立する。

【4. 完成度 evaluator の aspect 分離】assign-system-spec-completeness-evaluator の 6 aspect を、tier=mvp / standard では foundation_trace と matrix_coverage を blocking、doc_freshness・design_knowledge_reflection・decision_guidance・prompt_quality を advisory とする。tier=critical では従来どおり 6 aspect 全てを blocking とする。advisory の FAIL は verdict を FAIL にせず ADVISORY_FAIL として区別し、deferred-verification issue を起票する。依存 version の世代落ちのような時間経過由来の finding が MVP 実装を止める現状の詰まりは、この分離で解消する。

【5. 回帰と証跡】tier 別 readiness の正負例、deferred_body を含む package の validate/projection、zero_attribution の 3 値、advisory FAIL が verdict を落とさないこと、deferred issue 起票失敗時の fail-closed を自動テストする。結果と仕様反映範囲を受領書および Beads notes へ残す。

【再採番・rebase 追記 (2026-08-09)】本 entry は当初 qa-146 として起票したが、並行セッションが 同一番号を別論点 (サインイン後のスコープ解決とルーティング結線) で先に確定させていたため qa-210 へ 再採番した。回答内容は変更していない。本文が「維持する」と述べる既存契約の参照点は、main 取込後の 最新確定 (dev-workflow.web=qa-199 / testing-qa.web=qa-205) まで含めて読むこと。本 entry はそれらを 覆さず、その上へ tier 別の検証深度契約を重ねる。

===== blocking 軸と execution 軸の分離 (統合元: qa-213) =====
【当該 entry の質問】web セルの検査は現状「実行する / しない」の 2 値で語られているが、advisory 検査を実行したまま blocking 集合だけ縮めても wall-clock は縮まない (F-0003)。検査の扱いをどう表現し直すべきか。

【1. execution 軸の導入 (施策3)】
検査の扱いを「blocking か advisory か」の 1 軸で語るのをやめ、**blocking 軸と execution 軸の 2 軸**で表現する。

- `blocking` 軸: `blocking` | `advisory`。失敗が run を止めるかどうかだけを決める。
- `execution` 軸: `sync` | `async` | `skip`。いつ実行するか (あるいは実行しないか) を決める。

| execution | 意味 | wall-clock への寄与 |
|---|---|---|
| `sync` | 当該 run の中で実行し、完了を待つ | 加算される |
| `async` | 実行はするが完了を待たず、結果は後続 run か issue で回収する | 加算されない |
| `skip` | この tier では実行しない | 加算されない |

従来「advisory にして高速化する」と述べていた箇所は、実際には `blocking=advisory, execution=sync` を意味しており、待ち時間は一切減っていなかった。高速化を意図する場合は `execution` を `async` か `skip` へ落とすこと。`blocking` を緩めるのは失敗時の停止可否を変えるだけで、速度の施策ではない。

【2. tier ごとの既定】
- mvp: 主要検査は `sync`、重い横断検査 (E2E・full matrix・rubric 全周) は `async`。`skip` は「この tier で恒久的に不要」と説明できるものだけに限る。
- standard: 全検査 `sync`。
- critical: 全検査 `sync` かつ全て `blocking`。

`async` にした検査は `tier-decision.json` の `checks[].disposition` を `deferred` とし、`deferred_issue_refs` に回収先 issue を必ず持たせる (qa-212【1】と同一契約)。`async` は「後で必ず実行する」約束であり、回収先のない `async` は実質 `skip` なので、そう書くこと。

【3. 適用範囲】
本 entry は testing-qa の web セルに対する契約である。desktop-windows / desktop-macos は qa-211 の契約 (検証深度の tier 別契約) を維持し、execution 軸は web の実測で有効性を確認してから展開する。先に全 platform へ広げない理由は、`async` の回収機構が未実装であり、回収されない `deferred` を 3 platform 分同時に生むリスクを避けるためである。

【4. tier 語彙の正本 (2026-08-09 補正)】
検証 tier の閉じた語彙は `mvp` / `standard` / `critical` の 3 値だけとする。qa-213 に残っていた `full` は `critical` の旧表記であり、新規の第 4 tier ではない。台帳・CLI・CI・仕様本文では `critical` だけを生成・受理し、過去記録の `full` を読む必要がある場合だけ legacy alias として `critical` へ正規化する。
- 設計原則の採否根拠: (未記録 — qa_log[].design_applications を writer 経由で補完すること)
##### 確定内容 qa-211 (対応セル: desktop-windows, desktop-macos)

- 確定要件: ユーザーの 2026-08-08 レビュー・仕様反映指示を明示承認として、qa-095 の skill 構造 lint の生成物境界契約と層別テスト方針を全面維持したまま、tier 別のテスト選択契約を追加確定する。

【1. focused test の決定論的選択】mvp tier の blocking テストは、変更 path から到達する package の focused test に限定する。選択は scripts/select-verification-tier.py が出力する影響 package 集合を入力とし、実行者の勘で選ばない。該当 package が特定できない変更 (共有 utility や設定) は standard へ自動昇格させ、選択不能を暗黙の省略にしない。

【2. 広域回帰の非同期化】実際の実行順序を再現する広域回帰は mvp tier の blocking から外し、CI の非同期 job として実行する。失敗は当該変更の merge を止めず deferred-verification issue として起票し、次の standard 以上の実行または Stage 1 公開判定ゲートで回収する。critical tier では従来どおり広域回帰を同期 blocking として維持する。

【3. 層別方針の維持】frontend は behavior ベース、backend は API 契約 / ロジック単体 / DB 結合、infrastructure と repository tooling は静的契約 / 実行順序 / fail-closed 境界という層別方針は tier に依らず維持する。pixel・DOM 内部構造・一時生成物の物理配置へ品質判定を密結合させない方針も維持する。tier が変えるのは検証の量と同期性であって、検証の当たり所ではない。

【4. 生成物境界の維持】skill 構造 lint が dot cache および __pycache__ / .pyc を構造判定から除外する qa-095 の契約は tier に依らず維持する。

【5. platform と製品境界】同じ Python / pnpm 実装と同じコマンドを desktop-windows / desktop-macos で利用する。変更は repository 内の開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

【再採番・rebase 追記 (2026-08-09)】本 entry は当初 qa-147 として起票したが、並行セッションが 同一番号を別論点 (サインイン後のスコープ解決とルーティング結線) で先に確定させていたため qa-211 へ 再採番した。回答内容は変更していない。本文が「維持する」と述べる既存契約の参照点は、main 取込後の 最新確定 (dev-workflow.web=qa-199 / testing-qa.web=qa-205) まで含めて読むこと。本 entry はそれらを 覆さず、その上へ tier 別の検証深度契約を重ねる。
- 設計原則の採否根拠: (未記録 — qa_log[].design_applications を writer 経由で補完すること)
- 資するゴール: G1, G4, G5

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| vitest | 4.1.10 | VoidZero / Vitest team (vitest.dev) | https://vitest.dev/blog/vitest-4-1.html | 2026-08-07T03:26:46Z | 2026-08-07T03:26:46Z |
| playwright | 1.62.1 | Microsoft (playwright.dev) | https://playwright.dev/docs/release-notes | 2026-08-07T03:26:57Z | 2026-08-07T03:26:57Z |
| testing-library | @testing-library/react 16.3.2 | Testing Library (OSS) (testing-library.com) | https://testing-library.com/docs/react-testing-library/intro/ | 2026-08-07T03:27:06Z | 2026-08-07T03:27:06Z |
