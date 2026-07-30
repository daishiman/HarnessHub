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
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-092 |

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

### qa-092 (対応セル: desktop-macos)

**質問**: Dev Graph の implementation readiness が本文未記入の成果物を通さないため、C11 のローカル開発契約へどの本文検査境界を追加しますか?

**回答**: ユーザーの 2026-07-29 最終レビュー・仕様反映指示を明示承認として、qa-088 と qa-090 のローカル開発契約を全面維持し、Dev Graph C11 の artifact 本文検査を追補する。C11 は YAML frontmatter と fenced code example を本文判定から除外し、template-contract.json が各 artifact kind に定める required section の内容を canonical template と照合する。節本文が空、canonical template の angle-bracket placeholder を残す、または本文全体が TBD / TODO / 未定だけの場合は placeholder_only_section として implementation_readiness=incomplete にし、該当節名を missing_sections へ列挙する。architecture のように親節が構造 container である場合は substantive な必須 child section を含めば親節を未記入扱いしない。C02 upsert は生成後に同じ C11 を通すため、本文なしの新規 template 生成と --regenerate-body による placeholder 復帰を transaction rollback 付きで拒否する。一方、既存の実内容を metadata-only update で保持する経路と、substantive な --body-file / input body による作成・復旧は維持する。全 artifact kind の canonical template、実内容、見出しだけへ潰した mutation を回帰テストで固定する。本契約は repository 内の Dev Graph readiness、tracker 投影、system build handoff に限定し、Harness Hub 製品の API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

### 実装反映注記 (2026-07-30 / `HarnessHub-ml57`)

qa-088【2】の「CI と local の一致」を、運用上の心がけではなく repository gate として
具体化した。GitHub Actions が repository root から実行する
`python3 scripts/*.py` の呼び出しを script path と意味のある引数の組へ正規化し、
local hard-fail gate または理由付き allowlist に含まれることを set membership で検査する。
allowlist に無い差分、理由のない例外、CI から消えた stale 例外、動的 working-directory
など静的に境界を確定できない入力は fail-closed とする。

local gate の責務は「CI のうち手元で安全に再実行できる検査」であり、外部資格情報が必要、
working tree を書き換える、CI 自体が non-blocking という呼び出しは、正確な引数形と理由を
`scripts/ci-local-check-allowlist.json` に記録する。製品 API、DB schema、認証認可、UI、
Cloudflare deploy unit は変更しない。判断と最終検証は
`docs/features/feat-dev-pipeline-improvement/local-ci-parity-spec-reflection-receipt.md`
を正とする。

### 実装反映注記 (2026-07-30 / `HarnessHub-pyb3`)

qa-088【2】と qa-096【2】の CI / local 共通ゲートを具体化し、`pnpm -r test` の入口を
変えずに `pnpm-workspace.yaml` の `workspaceConcurrency: 1` で package 間だけを直列化する。
各 package が持つ Vitest worker pool の同時起動による RPC timeout を防ぎ、設定欠落・値変更は
`pnpm check:pnpm` の正負テストで fail-closed に拒否する。製品 API、DB schema、認証認可、
UI、Cloudflare deploy unit、確定済み QA 回答は変更しない。反映と検証は
`docs/features/feat-hub-foundation/g4-workspace-test-concurrency-spec-reflection-receipt.md` を正とする。

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
