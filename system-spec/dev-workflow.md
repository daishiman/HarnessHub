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
| Web (web) | 確定 | 確定質疑: qa-198 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-140 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-102 |

## 確定内容 (質疑録)

### qa-198 (対応セル: web)

**質問**: qa-197-f で定めた決着用の観測を利用者が本番で実行した。

  curl -s https://harness-hub.daishimanju.workers.dev/harness-hub/signin | grep -o 'callbackUrl[^>]*'
  → callbackUrl" value="/"

  curl -s -o /dev/null -w '%{http_code}' https://harness-hub.daishimanju.workers.dev/sheets
  → 401

原因を確定してよいか、確定するなら是正は何か。

**回答**: [出所] 本 entry は appr-038 の委任下で AI が確定した。観測値は利用者が本番で実行した実測である。

[qa-198-a 根本原因の確定] **本番の signin ページは `callbackUrl` に `/` を送っている。** サインインが成功すると Auth.js はこの値へ戻すため、利用者はサイト直下 `/` に着地する。これが症状 (サインイン後に業務画面へ到達しない) の直接原因である。認証は成功しており、失敗していたのではない。

[qa-198-b 帰属の接地 — どのビルドかまで一意に特定できた] この値は推測ではなく、リポジトリの履歴と直接照合できる。commit 43e06e10 (2026-07-30 14:11:56 +0900) 時点の `tenant-oidc-signin-form.tsx` は `<input type="hidden" name="callbackUrl" value="/" />` を**定数としてベタ書き**していた。commit 150a0f14 (2026-08-03 13:02:33 +0900) がこれを `DEFAULT_POST_SIGNIN_LANDING = '/sheets'` 由来の値へ置き換えた。**本番の実測は 43e06e10 側と一致し、150a0f14 側と一致しない。** したがって本番で動いているビルドは 150a0f14 を含んでいない。

[qa-198-c 是正の内容 — 新規実装は不要である] 修正コードは**既にリポジトリに存在する**。150a0f14 は 2 重の是正を入れている — (i) signin form の callbackUrl を `/sheets` にする、(ii) `app/page.tsx` (`/`) 自体に、有効な session cookie があれば `DEFAULT_POST_SIGNIN_LANDING` へ redirect する処理を足す。(ii) があるため、仮に古い cookie で `/` へ来ても業務画面へ送られる。**是正は「150a0f14 以降を本番へ deploy する」ことに尽きる。** コード変更は不要である。

[qa-198-d 併せて確認できたこと] `/sheets` は未認証で 401 を返した。これは middleware が認可拒否を JSON で返す設計どおりの挙動であり (qa-197-d)、着地先が壊れているのではないことの確認になる。

[qa-198-e なぜ 10 ラウンド以上かかったのか — 本仕様の存在理由] 原因は最終的に **1 回の GET と 1 行の grep** で確定した。それまでに時間を要したのは、次の 2 点が観測不能だったためである。(1) **本番で動いているビルドが、リポジトリのどの commit に対応するかを知る手段が無い。** そのため『コードは直っている』と『本番が直っている』が区別できず、コードを読むほど誤った確信が強まる状態になっていた。(2) **着地先が既定値へ落ちた事象を記録する手段が無い。** 認証失敗なら signin へ戻るので気づけるが、『成功したが意図しない場所へ着地した』は成功として通過し、痕跡が残らない。この 2 点はいずれも本仕様の V2・V6・V7 が対象としている欠落である。**本件は、本仕様が無ければどう迷走するかの実測データそのものになった。**

[qa-198-f 受入基準への反映] 本 entry を根拠に次を要求へ加える。(1) V6 (build 同一性) — 稼働中の成果物から、それがどの commit に対応するかを**認証なしで**確認できること。本件の切り分けを 1 回の GET で終わらせるための最小要件である。(2) V2 (遷移経路の実測) — 『認証は成功したが着地先が既定値へ落ちた』事象を、認証失敗とは区別して記録すること。成功として通過する異常こそ記録の対象である。(3) V7 (deploy 反映) — 本番の稼働ビルドが既定 branch の HEAD より古い状態が続いていることを検出すること。本件は 2026-08-03 の修正が 2026-08-07 時点で未反映だった (4 日間)。

[qa-198-g 引き継ぎ] 本 entry は dev-workflow/web の正本を qa-197 から引き継ぐ。qa-197 が保持していた未解決事項 6・9・10 は本 entry が引き継いで保持する。qa-196 の照会規律 8 項目は引き続き有効である。**原因究明は本 entry で完了した。** 未解決事項のうち原因に関するものは解消し、残るのは plugin 側の課題 (6・8・9・10) と実装 verb の既知タスク (V5 検査 script) である。

[qa-198-h 実装 writeback 索引 (2026-08-08)] qa-198-f の V6 (稼働ビルドの素性) / V7 (deploy 反映鮮度) は elicitation（要件の聞き取り）正本のまま維持し、**新規 qa_log は起票しない**（既確定要求の実装であり、聞き取りセルの再オープンを要しない）。実装確定契約の正本は次へ分離した。

- 実装契約: [`specs/harness-hub-build-identity-deploy-freshness-addendum.md`](../specs/harness-hub-build-identity-deploy-freshness-addendum.md)
- 親追補索引: [`specs/harness-hub-post-signin-landing-observability-addendum.md`](../specs/harness-hub-post-signin-landing-observability-addendum.md) §8
- feature: `feat-build-identity-deploy-freshness` / Beads `HarnessHub-hf9y`
- 受領書: `docs/features/feat-build-identity-deploy-freshness/spec-reflection-receipt.md`

### qa-140 (対応セル: desktop-windows)

**質問**: qa-088 の並列 worktree 安全契約を情報欠落なく継承しながら、2026-07-31 の更新時刻クラスタの原因訂正と、再発診断ツールの運用境界をどのように確定しますか?

**回答**: ユーザーの 2026-08-03 最終レビュー・仕様反映指示を明示承認として、qa-088 の契約を次のとおり自己完結して再確定する。

【1. ローカル環境と CI 整合】Claude Code または Codex、corepack 経由の pnpm、git、wrangler CLI を使う。macOS を主環境、Windows を従環境とし、両者で同じ pnpm script が動くようパス区切り・改行・特定 shell への依存を避ける。PR の required status checks と同じ実装を pnpm script から実行できるようにし、merge 前ゲートの正本は CI とする。

【2. commit 前の防御】lint、format、secret scan は早期検知の補助として local から実行可能にする。一方、並列 worktree による既存変更の巻き戻しはデータ消失リスクなので、通常の lint/format と分離した整合性ガードとして fail-closed にする。index tree が HEAD と同一内容の祖先 tree に一致する場合、または staged 削除が安全閾値を超える場合は pre-commit で拒否する。

【3. 並列 worktree と復旧】全 worktree が共有する git common dir 配下へ hook bundle を設置し、core.hooksPath はその絶対パスを指す。reference-transaction hook は、別 worktree が checkout 中の refs/heads/* への直接更新を transaction 確定前に拒否する。ref 更新は修復にも必要な根幹経路なので worktree 情報を取得できない場合は fail-open とし、前項の pre-commit が二層目として fail-closed で止める。共有 bundle は現在の worktree の beads hook へ委譲し、tracked template、installed bundle、core.hooksPath、beads 保険経路の欠落・陳腐化は pre-push と CI で検知する。並列環境の stash は stash@{N} を永続識別子にせず、固有メッセージから commit SHA を直接取得して復元する。

【4. 更新時刻クラスタ診断】複数の独立ディレクトリに分単位で一致する mtime (更新時刻) クラスタは一括書込みの調査開始点であって、非 Git 系 clobber の確定証拠ではない。2026-07-31 06:56 の事象は reflog の `reset: moving to HEAD` と直後の `pull: Fast-forward` が秒単位で一致する直接証拠により、`git reset --hard` + `git pull` が最有力原因である。`scripts/lint-worktree-clobber-mtime.py` は変更・未追跡ファイルを直接集計し、閾値以上のファイル数と独立ディレクトリ数を持つクラスタを JSON または人間向けに報告する診断専用ツールとする。検知時は exit 1 だが hook / commit blocking へ配線せず、Git 状態を取得できない場合は exit 0 の fail-open とする。説明不能なテスト失敗や大量差分を見た利用者は runbook の reflog・差分・実体照合で裏取りしてから復旧判断を行う。

【5. 製品境界】production への wrangler deploy と production Turso migration の正本経路は CI とし、ローカルからの日常実行を禁止する。緊急実行時は事後に PR または commit へ記録する。Hub 本体の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

### qa-102 (対応セル: desktop-macos)

**質問**: qa-092 の C11 本文 readiness を維持しながら、C02 の lifecycle・document layer 整合性と live-trial の session 環境隔離を、自己完結した dev-workflow.desktop-macos 契約としてどう統合しますか?

**回答**: ユーザーの 2026-07-30 CI 失敗修正・最終レビュー・仕様反映指示を明示承認として、qa-090 の live-trial session 所有権境界、qa-092 の C11 本文 readiness、HarnessHub-bk8v の C02 lifecycle 保全を維持し、C02 document layer parity と tmux session 環境隔離を統合した次の契約を確定する。

【1. C11 本文 readiness】C11 は YAML frontmatter と fenced code example を本文判定から除外し、template-contract.json が artifact kind ごとに定める required section を検査する。空節、canonical placeholder、TBD / TODO / 未定だけの本文は implementation_readiness=incomplete とし、C02 は本文なしの新規生成と --regenerate-body による placeholder 復帰を transaction rollback 付きで拒否する。既存の実内容を metadata-only update で保持する経路と、substantive な --body-file / input body による作成・復旧は維持する。

【2. C02 lifecycle と document layer parity】昇格済み feature に古い full snapshot が再送され、status / confirmation_status / evaluation_status / implementation_readiness.status が後退する場合、C02 は stale before-image として dry-run / apply の双方で無変更のまま拒否する。artifact_kind=document は graph-node.schema.json#/$defs/documentLayer に適合する空でない小文字 kebab-case の layer を必須とし、非 document node では layer を禁止する。旧 document node だけが graph に layer を持たず既存 artifact frontmatter に単一 scalar を持つ場合、C02 はその値を一度だけ graph へ移行する。新規 document の暗黙 default、欠落、重複、形式不正を fail-closed にし、既存本文を byte-for-byte 保持して再実行を noop にする。docs 配置 lint は同じ schema 定義を読み、別の許容値表を持たない。

【3. live-trial session 環境の正本】tmux server が保持する global environment は live-trial の routing 正本にしない。hook の証拠出力先など trial 固有の環境変数は、boot 呼び出し元の現在値を new-session -e で対象 session へ明示的に上書きする。呼び出し元で未設定なら空値を渡し、過去 trial の値へ fallback しない。backend は環境変数名を identifier 形式に限定し、値に NUL・改行・復帰を許さない。転送対象は harness が宣言した session-scoped allow-list に限定する。

【4. 監査証拠の接地】system-spec 監査台帳は contained fixture 内の path と current session id に束縛し、canonical aggregate gate が report・ledger・session の三点を突合して exit 0 になった場合だけ C02 import と live-trial PASS を許す。台帳欠落・別 session・別 path は fail-closed とし、手作業で台帳を複製または捏造しない。失敗 run は上書きせず append-only に保持する。

【5. 回帰と境界】document migration、本文保持、lifecycle 後退、layer 正負例、fake tmux の new-session -e argv、実 tmux の stale global 値上書き、C19 の正規四 entry point・三監査・canonical aggregate・C02 import を検証する。変更は repository 内の Dev Graph metadata、live-trial transport、開発品質証拠に限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

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
