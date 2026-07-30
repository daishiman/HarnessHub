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
| Web (web) | 確定 | 確定質疑: qa-096 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-088 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-097 |

## 確定内容 (質疑録)

### qa-096 (対応セル: web)

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

### qa-097 (対応セル: desktop-macos)

**質問**: Dev Graph の C02 writer が graph 管理 document の layer frontmatter を失わず、graph validation と docs 配置 lint が同じ正本を使うため、ローカル開発契約へどの metadata 境界を追加しますか?

**回答**: ユーザーの 2026-07-30 最終レビュー・仕様反映指示を明示承認として、qa-088 / qa-090 / qa-092 のローカル開発契約と HarnessHub-bk8v の C02 lifecycle 保全契約を全面維持し、HarnessHub-dqca で実測した document layer の graph/frontmatter 不整合を次の契約で補強する。

【1. C11 本文 readiness】C11 は YAML frontmatter と fenced code example を本文判定から除外し、template-contract.json が artifact kind ごとに定める required section を検査する。空節、canonical placeholder、TBD / TODO / 未定だけの本文は implementation_readiness=incomplete とし、C02 は本文なしの新規生成と --regenerate-body による placeholder 復帰を transaction rollback 付きで拒否する。既存の実内容を metadata-only update で保持する経路と、substantive な --body-file / input body による作成・復旧は維持する。

【2. C02 lifecycle 保全】昇格済み feature に古い full snapshot が再送され、status / confirmation_status / evaluation_status / implementation_readiness.status が後退する場合、C02 は stale before-image として dry-run / apply の双方で無変更のまま拒否する。意図的な再評価は変更 field を列挙した explicit patch に限る。

【3. document layer parity】artifact_kind=document は graph-node.schema.json#/$defs/documentLayer に適合する空でない小文字 kebab-case の layer を必須とし、非 document node では layer を禁止する。固定 enum は置かず役割追加を許すが、許容形式の正本はこの schema 定義一つとする。旧 document node だけが graph に layer を持たず既存 artifact frontmatter に単一 scalar を持つ場合、C02 はその値を一度だけ graph へ移行して正準 frontmatter を再生成する。新規 document への暗黙 default、既存 artifact にも layer が無い状態、重複 key、形式不正は fail-closed とする。docs 配置 lint は同じ $defs.documentLayer を読み、別の許容値表を持たない。metadata 移行時も既存本文は byte-for-byte 保持し、再実行は noop とする。

【4. 検証と境界】document / legacy migration / missing / invalid / non-document の focused regression、全 Dev Graph test、graph schema、artifact placement、repository lint を実行する。変更は repository 内の Dev Graph metadata と開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

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
