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
| Web (web) | 確定 | 確定質疑: qa-092 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-088 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-090 |

## 確定内容 (質疑録)

### qa-092 (対応セル: web)

**質問**: MVP ファーストの優先度判断を維持したまま、CI / local の品質ゲートが検査対象 0 件で緑になる fail-open を防ぐ dev-workflow.web 契約を、章単独で情報を失わない形でどう確定しますか?

**回答**: ユーザーの 2026-07-29 最終レビュー・仕様反映指示を明示承認として、qa-069 の MVP ファーストな優先度契約を全面維持し、品質ゲートの空走査境界を統合した次の dev-workflow.web 契約を確定する。

【1. タスク優先度】feature / task の選定は、目的、背景、MVP（今必要な動くもの）への直結度を第一判断軸とする。品質・再現性強化だけを目的とする基盤タスクは MVP 成立後へ繰り延べ、まず作り、使い、課題を学ぶ build-use-learn の回転を優先する。これは既確定の CI/CD・quality gate を緩和または削除する契約ではない。

【2. CI と local の品質ゲート】required status check と同じ検査実装を local の script からも実行可能にし、CI 専用の検査ロジックを持たない。検査器は、対象ディレクトリ不在または検査対象 0 件を既定で非 0 にして fail-closed とする。『違反 0 件』と『1 件も検査していない』を同じ緑へ潰さない。

【3. 意図的な空走査】単独配布物など、検査対象が無いこと自体が正しい環境だけは `--allow-empty` のような明示 opt-in で成功を許可する。repository の通常 CI / make lint / pre-push 経路は opt-in を付けず、実際の検査件数を summary へ出す。

【4. 回帰証拠】missing directory、empty directory、explicit allow-empty の三分岐を専用テストで固定し、self-test と実 repository scan の双方でゲートの生存を確認する。500 行を超える検査ファイルは単一責務で分冊し、分割後も同じ CLI 実装を検証する。

【5. C02 writer の後退防止】dev-graph の C02 writer は、昇格済み feature に古い full snapshot が再送された場合、status、confirmation_status、evaluation_status、implementation_readiness.status の後退を stale before-image として dry-run / apply の双方で無変更かつ fail-closed に拒否する。意図的な再評価は変更フィールドを列挙した明示 patch に限る。実装契約の正本は plugins/dev-graph/references/execution-tracker-contract.md、判断と検証の受領書は docs/features/feat-dev-pipeline-improvement/bk8v-c02-lifecycle-spec-reflection.md とする。

【6. 境界】本契約は Harness Hub repository の開発品質ゲートに限定する。Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

### qa-088 (対応セル: desktop-windows)

**質問**: qa-039 のローカル開発契約と qa-087 の並列 worktree 安全契約を、章単独で情報を失わない自己完結した契約としてどう確定しますか?

**回答**: ユーザーの 2026-07-28 最終レビュー・仕様反映指示を明示承認として、qa-039 と qa-087 を統合した次のローカル開発契約を確定する。

【1. ローカル環境】Claude Code または Codex、corepack 経由の pnpm、git、wrangler CLI を使う。macOS を主環境、Windows を従環境とし、両者で同じ pnpm script が動くようパス区切り・改行・特定 shell への依存を避ける。

【2. CI と local の一致】PR の required status checks と同じ実装を pnpm script から実行できるようにし、CI 専用の検査手順を CI 側だけに持たない。merge 前ゲートの正本は CI とする。

【3. commit 前のローカルゲート】lint と format は早期検知の補助として任意実行し、secret scan も local から実行可能にする。一方、並列 worktree による既存変更の巻き戻しはデータ消失リスクなので、通常の lint/format と分離した整合性ガードとして fail-closed にする。index tree が HEAD と同一内容の祖先 tree に一致する場合、または staged 削除が安全閾値を超える場合は pre-commit で拒否する。

【4. 並列 worktree の ref 整合性】全 worktree が共有する git common dir 配下へ hook bundle を設置し、core.hooksPath はその絶対パスを指す。reference-transaction hook は、別 worktree が checkout 中の refs/heads/* への直接更新を transaction 確定前に拒否する。ref 更新は修復にも必要な根幹経路なので worktree 情報を取得できない場合は fail-open とし、前項の pre-commit が二層目として fail-closed で止める。共有 bundle は現在の worktree の beads hook へ委譲する。tracked template、installed bundle、core.hooksPath、beads 保険経路の欠落・陳腐化は pre-push と CI で検知する。並列環境の stash は stash@{N} を永続識別子にせず、固有メッセージから commit SHA を直接取得して復元する。

【5. ローカルからの本番操作】production への wrangler deploy と production Turso migration の正本経路は CI とし、ローカルからの日常実行を禁止する。緊急実行時は事後に PR または commit へ記録する。ローカル開発は preview Turso または local SQLite を使い production DB を指さない。

【6. Web App 出口との境界】作者 local session から顧客 Web App を公開する I5 は Hub 本体の開発フローと分離する。本契約は Hub repository の開発フローに限り、Hub の外部 API、データモデル、認証認可、Cloudflare deploy unit は変更しない。

### qa-090 (対応セル: desktop-macos)

**質問**: 並行 live-trial の後片付けが別実行の tmux session を終了させないため、macOS のローカル開発契約へどの所有権境界を追加しますか?

**回答**: ユーザーの 2026-07-29 最終レビュー・仕様反映指示を明示承認として、qa-088 のローカル開発契約を全面維持し、live-trial cleanup の所有権境界を追補する。各 tmux session は起動時に安全な run-id と owner PID を metadata として保持する。通常の reap は session 名の run prefix、記録済み run-id、記録済み owner PID の三つが完全一致した session だけを削除し、同じ run-id の別 owner、別 run-id、metadata 無し session を削除しない。run-id または owner PID が無い通常 reap は fail-closed で拒否する。全 live-trial session の削除は明示的な管理者操作 --all に限定し、通常の終了経路で使用しない。boot は記録した owner PID を READY 出力で呼出元へ渡し、cleanup は現在の shell PID で代用しない。fake tmux と実 tmux の回帰テストで sibling session の生存を固定する。本契約は repository 内の開発用 acceptance harness に限定し、製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

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
