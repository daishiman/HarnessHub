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
| Web (web) | 確定 | 確定質疑: qa-143 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-140 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-102 |

## 確定内容 (質疑録)

### qa-143 (対応セル: web)

**質問**: C16 の qa-142 契約を保全したまま、HarnessHub-85z0 の C11 必須見出し欠落検出と HarnessHub-3tw の未書込み stdin preview 検証を、どのような fail-closed 境界として dev-workflow.web に再確定しますか?

**回答**: ユーザーの 2026-08-04 最終レビュー、task 仕様書品質ゲート、仕様・設計の正規反映、origin/main→local main→task branch 統合、commit/push/draft PR 作成の明示指示を承認として、qa-142 の C16 契約を変更せず保全したうえで、C11 と stdin preview の内部品質契約を追加確定する。

【1. C16 契約の保全】selected かつ schedulable な node は pre-lease で ready または unmapped のいずれかになり、active lease/resource conflict を含む最終 report は `ready_set ∪ unmapped ∪ conflicts` で候補を被覆する。P01 parent_feature、depends_on、parent の depends_on が不正なら停止し、Beads parity の dependency は順序ではなく集合で比較する。依存未充足を payload/parity 判定より先に評価し、各 node は最初に成立した reason だけを記録する。依存を満たす Beads node の payload entry 欠落だけを `ready_payload_entry_absent` / `source=schedule-graph` として C03/C28 同期、linkage 修復、fresh parity manifest 後に再実行し、推測で ready set へ追加しない。

【2. C11 必須見出しの存在】`artifact_kind=specification` は、template-contract の `required_sections` と body から解析した見出し名を照合する。見出しが本文に存在しないときは exact code `heading_missing` と section 名を findings / `missing_sections` に入れ、implementation_readiness を incomplete にする。既に存在する見出しの空本文、template placeholder、TBD/TODO/未定 は従来どおり `placeholder_only_section` で検出する。既存の specification 2 件は同じ意味を保ったまま canonical template の全必須見出しへ移行する。

【3. 対象限定と C02】task / issue の required_sections は conditional template を未解決のまま単純照合すると旧 artifact を誤検出するため、heading_missing は specification のみに限定する。task / issue への拡張は conditional-template resolver を実装してから別 Beads `HarnessHub-yzv0` で扱う。C02 では template-only 作成、placeholder 再生成、見出し欠落状態を rollback し、substantive body を持つ specification だけを登録・復旧可能にする。

【4. stdin preview 境界】`validate-graph-schema.py --graph - --repo-root <repo>` は decompose dry-run の未書込み preview を検証する専用入口とする。この入口は `artifact_missing` だけを許容するが、schema、frontmatter、path containment、既存 artifact の壊れた本文、frontmatter parity は従来どおり fail-closed とする。`--repo-root` は必須であり、file path の canonical graph 検証は `artifact_missing` を引き続き fail とする。

【5. 製品境界】変更は repository 内の Dev Graph C11/C02/C14 開発品質契約に限定する。Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

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
