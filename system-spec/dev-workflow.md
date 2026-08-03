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
| Web (web) | 確定 | 確定質疑: qa-139 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-140 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-102 |

## 確定内容 (質疑録)

### qa-139 (対応セル: web)

**質問**: C02 atomic writer の単一書込み境界を維持しながら、inline Python が変数や Path 式で graph authority を組み立てる迂回を C10 PreToolUse でどう扱いますか?

**回答**: ユーザーの 2026-08-03 最終レビュー・仕様反映・公開指示を明示承認として、qa-122 と最新 main の qa-138 を全面維持し、C10 の inline Python 書込み検出を追加確定する。

【1. 保護境界】graph authority は `.dev-graph/state/`、`.dev-graph/config.json`、`graph-node.schema.json` とし、初期 config / graph は正規 writer、node 更新は C02 `upsert-node.py` だけが書く。`.dev-graph/tmp/`、`cache/`、`templates/` は再生成領域なので一律遮断しない。

【2. AST 静的検出】`python -c` と heredoc の本文は実行せず AST で解析し、変数代入、Path の `/`・`joinpath`・`parent`・`with_name`・`with_suffix`、`os.path.join`、f-string、`%` / `format`、list/tuple join、import 別名、`str` / `os.fspath` 包み、bytes path を定数伝播で評価する。`open` / `os.open` / Path 書込み / shutil / os rename・remove 系を対象とし、rename / move は元と宛先の双方を変更対象として判定する。

【3. fail-closed と性能】評価不能な式でも `.dev-graph/` prefix または `state/graph.json` 末尾が確定すれば安全側で遮断する。遮断判定は subprocess、network、graph 全件検証を起動せず、PreToolUse timeout が許可窓になる構造を作らない。読取専用と保護外領域は通し、誤遮断で正規手順を壊さない。

【4. 意図的な限界】`exec` / `eval` 内の再帰的 source、任意の文字列変換、別 script file の本文解析は C10 の範囲外とする。再帰実行や任意 file 読込みは遮断時間を入力に依存させるためで、script 経由の drift は PostToolUse 監査と C02 writer 規約で補完する。

【5. 回帰と責務分離】BLOCK / PASS、実プロセス exit 2、subprocess 非起動、深さ上限、性能余裕、既知の限界を自動テストで固定する。path 評価、書込み対象収集、hook entrypoint、境界テストを責務別ファイルへ分離する。

【6. 製品境界】変更は repository 内の Dev Graph 開発品質ゲートに限定し、Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

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
