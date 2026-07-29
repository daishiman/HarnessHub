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
| Web (web) | 確定 | 確定質疑: qa-069 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-088 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-092 |

## 確定内容 (質疑録)

### qa-069 (対応セル: web)

**質問**: dev-graph/beads (bd) のタスク優先度選定 (schedule/ready の判断軸) を、どのような基準へ変更しますか? 現行の品質・本質先行の選定で何が問題になっていますか?

**回答**: 現行は AI が文脈から『本質的なシステムを作り上げること』を最優先に選定するため、同じ基盤タスクを繰り返し実行して解決せず、依存関係でつながった他タスクまで止まり、いちばん作りたかった機能から離れていく (根本原因は品質と再現性を求めすぎる完璧主義がスケジューラの優先度に転写されたこと)。変更後の判断軸は (1) 目的=何のために作るか、(2) 背景=どういう経緯で必要になったか、(3) MVP=今必要な動くもの、の3軸とし、品質を先回りする基盤・本質課題解決タスクよりも『まず使えるものを構築する』タスクを優先して選定する。まず作って、使って、課題をあぶり出す回転 (build-use-learn) に戻すことが狙い。具体的には feature/task の選定時に MVP 適合 (今必要な動くものに直結するか) を第一ソートキーへ昇格し、品質・再現性強化系は MVP 成立後に繰り延べる。CI/CD・quality gate 等の既確定の dev-workflow 要件 (qa-066) 自体は維持し、優先度選定の判断軸のみ組み替える

### qa-088 (対応セル: desktop-windows)

**質問**: qa-039 のローカル開発契約と qa-087 の並列 worktree 安全契約を、章単独で情報を失わない自己完結した契約としてどう確定しますか?

**回答**: ユーザーの 2026-07-28 最終レビュー・仕様反映指示を明示承認として、qa-039 と qa-087 を統合した次のローカル開発契約を確定する。

【1. ローカル環境】Claude Code または Codex、corepack 経由の pnpm、git、wrangler CLI を使う。macOS を主環境、Windows を従環境とし、両者で同じ pnpm script が動くようパス区切り・改行・特定 shell への依存を避ける。

【2. CI と local の一致】PR の required status checks と同じ実装を pnpm script から実行できるようにし、CI 専用の検査手順を CI 側だけに持たない。merge 前ゲートの正本は CI とする。

【3. commit 前のローカルゲート】lint と format は早期検知の補助として任意実行し、secret scan も local から実行可能にする。一方、並列 worktree による既存変更の巻き戻しはデータ消失リスクなので、通常の lint/format と分離した整合性ガードとして fail-closed にする。index tree が HEAD と同一内容の祖先 tree に一致する場合、または staged 削除が安全閾値を超える場合は pre-commit で拒否する。

【4. 並列 worktree の ref 整合性】全 worktree が共有する git common dir 配下へ hook bundle を設置し、core.hooksPath はその絶対パスを指す。reference-transaction hook は、別 worktree が checkout 中の refs/heads/* への直接更新を transaction 確定前に拒否する。ref 更新は修復にも必要な根幹経路なので worktree 情報を取得できない場合は fail-open とし、前項の pre-commit が二層目として fail-closed で止める。共有 bundle は現在の worktree の beads hook へ委譲する。tracked template、installed bundle、core.hooksPath、beads 保険経路の欠落・陳腐化は pre-push と CI で検知する。並列環境の stash は stash@{N} を永続識別子にせず、固有メッセージから commit SHA を直接取得して復元する。

【5. ローカルからの本番操作】production への wrangler deploy と production Turso migration の正本経路は CI とし、ローカルからの日常実行を禁止する。緊急実行時は事後に PR または commit へ記録する。ローカル開発は preview Turso または local SQLite を使い production DB を指さない。

【6. Web App 出口との境界】作者 local session から顧客 Web App を公開する I5 は Hub 本体の開発フローと分離する。本契約は Hub repository の開発フローに限り、Hub の外部 API、データモデル、認証認可、Cloudflare deploy unit は変更しない。

### qa-092 (対応セル: desktop-macos)

**質問**: Dev Graph の implementation readiness が本文未記入の成果物を通さないため、C11 のローカル開発契約へどの本文検査境界を追加しますか?

**回答**: ユーザーの 2026-07-29 最終レビュー・仕様反映指示を明示承認として、qa-088 と qa-090 のローカル開発契約を全面維持し、Dev Graph C11 の artifact 本文検査を追補する。C11 は YAML frontmatter と fenced code example を本文判定から除外し、template-contract.json が各 artifact kind に定める required section の内容を canonical template と照合する。節本文が空、canonical template の angle-bracket placeholder を残す、または本文全体が TBD / TODO / 未定だけの場合は placeholder_only_section として implementation_readiness=incomplete にし、該当節名を missing_sections へ列挙する。architecture のように親節が構造 container である場合は substantive な必須 child section を含めば親節を未記入扱いしない。C02 upsert は生成後に同じ C11 を通すため、本文なしの新規 template 生成と --regenerate-body による placeholder 復帰を transaction rollback 付きで拒否する。一方、既存の実内容を metadata-only update で保持する経路と、substantive な --body-file / input body による作成・復旧は維持する。全 artifact kind の canonical template、実内容、見出しだけへ潰した mutation を回帰テストで固定する。本契約は repository 内の Dev Graph readiness、tracker 投影、system build handoff に限定し、Harness Hub 製品の API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

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
