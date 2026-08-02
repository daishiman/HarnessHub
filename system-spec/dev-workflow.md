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
| Web (web) | 確定 | 確定質疑: qa-122 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-088 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-102 |

## 確定内容 (質疑録)

### qa-122 (対応セル: web)

**質問**: qa-096 の開発品質契約を情報欠落なく維持しながら、外部参考 Skill の削除と有効な外部 CLI 契約の移設を dev-workflow.web の自己完結した現行契約としてどう確定しますか?

**回答**: ユーザーの 2026-08-02 最終レビュー・仕様反映・公開指示を明示承認として、qa-069 と qa-096 の契約を情報欠落なく維持し、repository 内の参考層と能動層の所有契約を追加確定する。

【1. タスク優先度】feature / task の選定は、目的、背景、MVP（今必要な動くもの）への直結度を第一判断軸とする。品質・再現性強化だけを目的とする基盤タスクは MVP 成立後へ繰り延べ、まず作り、使い、課題を学ぶ build-use-learn の回転を優先する。これは既確定の CI/CD・quality gate を緩和または削除する契約ではない。

【2. CI と local の品質ゲート】required status check と同じ検査実装を local の script からも実行可能にし、CI 専用の検査ロジックを持たない。検査器は、対象ディレクトリ不在または検査対象 0 件を既定で非 0 にして fail-closed とする。『違反 0 件』と『1 件も検査していない』を同じ緑へ潰さない。

【3. 意図的な空走査】単独配布物など、検査対象が無いこと自体が正しい環境だけは `--allow-empty` のような明示 opt-in で成功を許可する。repository の通常 CI / make lint / pre-push 経路は opt-in を付けず、実際の検査件数を summary へ出す。

【4. 回帰証拠】missing directory、empty directory、explicit allow-empty の三分岐を専用テストで固定し、self-test と実 repository scan の双方でゲートの生存を確認する。500 行を超える検査ファイルは単一責務で分冊し、分割後も同じ CLI 実装を検証する。

【5. C02 writer の後退防止】dev-graph の C02 writer は、昇格済み feature に古い full snapshot が再送された場合、status、confirmation_status、evaluation_status、implementation_readiness.status の後退を stale before-image として dry-run / apply の双方で無変更かつ fail-closed に拒否する。意図的な再評価は変更フィールドを列挙した明示 patch に限る。実装契約の正本は `plugins/dev-graph/references/execution-tracker-contract.md`、判断と検証の受領書は `docs/features/feat-dev-pipeline-improvement/bk8v-c02-lifecycle-spec-reflection.md` とする。

【6. 既存境界】本契約は Harness Hub repository の開発品質ゲートに限定する。Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

【7. 正本所有】`doc/参考Skill/` は外部由来の比較・移管記録であり、実行中 plugin の契約正本にしない。能動 plugin が利用する契約は consumer plugin 配下へ置き、SKILL/resource map/隣接 reference から repository 内の相対 path で到達できる状態にする。

【8. 削除と移設】`aiworkflow-requirements` を前提にする `doc/参考Skill/skill-creator/` は directory 単位で削除し、現在も利用する `external-cli-agents-guide.md` だけを `plugins/harness-creator/skills/delegate-codex-skill-review/references/` へ履歴付きで移す。部分コピーを残して二重正本にしない。

【9. 履歴と復元】`eval-log/` など凍結済み履歴に残る旧 path・旧名称は実行依存と区別して保持できる。削除対象の復元正本は `xl-skills` と git 履歴とし、cleanup / transfer 計画に件数、根拠、復元経路を記録する。

【10. 追加検証と製品境界】削除前後の追跡件数、active code/plugin/docs からの旧 path と `aiworkflow-requirements` 実行依存 0、移設先の resource map 到達、legacy-name lint、artifact placement、文書行数、task spec、repository CI を検証する。この追加契約も repository documentation / plugin reference ownership に限定し、Harness Hub 製品の UI、外部 API、DB schema、認証認可、Cloudflare deploy unit は変更しない。

### qa-088 (対応セル: desktop-windows)

**質問**: qa-039 のローカル開発契約と qa-087 の並列 worktree 安全契約を、章単独で情報を失わない自己完結した契約としてどう確定しますか?

**回答**: ユーザーの 2026-07-28 最終レビュー・仕様反映指示を明示承認として、qa-039 と qa-087 を統合した次のローカル開発契約を確定する。

【1. ローカル環境】Claude Code または Codex、corepack 経由の pnpm、git、wrangler CLI を使う。macOS を主環境、Windows を従環境とし、両者で同じ pnpm script が動くようパス区切り・改行・特定 shell への依存を避ける。

【2. CI と local の一致】PR の required status checks と同じ実装を pnpm script から実行できるようにし、CI 専用の検査手順を CI 側だけに持たない。merge 前ゲートの正本は CI とする。

【3. commit 前のローカルゲート】lint と format は早期検知の補助として任意実行し、secret scan も local から実行可能にする。一方、並列 worktree による既存変更の巻き戻しはデータ消失リスクなので、通常の lint/format と分離した整合性ガードとして fail-closed にする。index tree が HEAD と同一内容の祖先 tree に一致する場合、または staged 削除が安全閾値を超える場合は pre-commit で拒否する。

【4. 並列 worktree の ref 整合性】全 worktree が共有する git common dir 配下へ hook bundle を設置し、core.hooksPath はその絶対パスを指す。reference-transaction hook は、別 worktree が checkout 中の refs/heads/* への直接更新を transaction 確定前に拒否する。ref 更新は修復にも必要な根幹経路なので worktree 情報を取得できない場合は fail-open とし、前項の pre-commit が二層目として fail-closed で止める。共有 bundle は現在の worktree の beads hook へ委譲する。tracked template、installed bundle、core.hooksPath、beads 保険経路の欠落・陳腐化は pre-push と CI で検知する。並列環境の stash は stash@{N} を永続識別子にせず、固有メッセージから commit SHA を直接取得して復元する。

【5. ローカルからの本番操作】production への wrangler deploy と production Turso migration の正本経路は CI とし、ローカルからの日常実行を禁止する。緊急実行時は事後に PR または commit へ記録する。ローカル開発は preview Turso または local SQLite を使い production DB を指さない。

【6. Web App 出口との境界】作者 local session から顧客 Web App を公開する I5 は Hub 本体の開発フローと分離する。本契約は Hub repository の開発フローに限り、Hub の外部 API、データモデル、認証認可、Cloudflare deploy unit は変更しない。

### qa-102 (対応セル: desktop-macos)

**質問**: qa-092 の C11 本文 readiness を維持しながら、C02 の lifecycle・document layer 整合性と live-trial の session 環境隔離を、自己完結した dev-workflow.desktop-macos 契約としてどう統合しますか?

**回答**: ユーザーの 2026-07-30 CI 失敗修正・最終レビュー・仕様反映指示を明示承認として、qa-090 の live-trial session 所有権境界、qa-092 の C11 本文 readiness、HarnessHub-bk8v の C02 lifecycle 保全を維持し、C02 document layer parity と tmux session 環境隔離を統合した次の契約を確定する。

【1. C11 本文 readiness】C11 は YAML frontmatter と fenced code example を本文判定から除外し、template-contract.json が artifact kind ごとに定める required section を検査する。空節、canonical placeholder、TBD / TODO / 未定だけの本文は implementation_readiness=incomplete とし、C02 は本文なしの新規生成と --regenerate-body による placeholder 復帰を transaction rollback 付きで拒否する。既存の実内容を metadata-only update で保持する経路と、substantive な --body-file / input body による作成・復旧は維持する。

【2. C02 lifecycle と document layer parity】昇格済み feature に古い full snapshot が再送され、status / confirmation_status / evaluation_status / implementation_readiness.status が後退する場合、C02 は stale before-image として dry-run / apply の双方で無変更のまま拒否する。artifact_kind=document は graph-node.schema.json#/$defs/documentLayer に適合する空でない小文字 kebab-case の layer を必須とし、非 document node では layer を禁止する。旧 document node だけが graph に layer を持たず既存 artifact frontmatter に単一 scalar を持つ場合、C02 はその値を一度だけ graph へ移行する。新規 document の暗黙 default、欠落、重複、形式不正を fail-closed にし、既存本文を byte-for-byte 保持して再実行を noop にする。docs 配置 lint は同じ schema 定義を読み、別の許容値表を持たない。

【3. live-trial session 環境の正本】tmux server が保持する global environment は live-trial の routing 正本にしない。hook の証拠出力先など trial 固有の環境変数は、boot 呼び出し元の現在値を new-session -e で対象 session へ明示的に上書きする。呼び出し元で未設定なら空値を渡し、過去 trial の値へ fallback しない。backend は環境変数名を identifier 形式に限定し、値に NUL・改行・復帰を許さない。転送対象は harness が宣言した session-scoped allow-list に限定する。

【4. 監査証拠の接地】system-spec 監査台帳は contained fixture 内の path と current session id に束縛し、canonical aggregate gate が report・ledger・session の三点を突合して exit 0 になった場合だけ C02 import と live-trial PASS を許す。台帳欠落・別 session・別 path は fail-closed とし、手作業で台帳を複製または捏造しない。失敗 run は上書きせず append-only に保持する。

【5. 回帰と境界】document migration、本文保持、lifecycle 後退、layer 正負例、fake tmux の new-session -e argv、実 tmux の stale global 値上書き、C19 の正規四 entry point・三監査・canonical aggregate・C02 import を検証する。変更は repository 内の Dev Graph metadata、live-trial transport、開発品質証拠に限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

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

### 実装反映注記 (2026-08-01 / `HarnessHub-w7n7`)

Beads 操作の単一チョークポイント（書き込みを必ず通す一本の入口）である
`plugins/dev-graph/scripts/bd-bridge.py` は、CLI 引数解析、preflight、Beads 実行、
receipt 出力だけを保持する。判定処理は次の四責務へ分離する。

- `bd_bridge_contracts.py`: exact-set 語彙と外部 I/O を持たない純粋判定
- `bd_bridge_graph.py`: canonical graph、manifest、artifact の read-only 解決
- `bd_bridge_projection.py`: graph node から Beads issue への投影
- `bd_bridge_audit.py`: orphan 棚卸しと node 削除 preflight の read-only 監査

分離後も CLI、operation、receipt schema、既存 private symbol、書込権限は変更しない。
Beads / git を使う処理は実行関数を引数で受け、CLI module の薄い adapter が呼出時に
注入することで、既存の hermetic test（外部状態を偽物へ差し替えるテスト）を維持する。
変更対象の手書きファイルは 500 行以下に保ち、分割先は harness coverage の scripts 分母へ
追加しない `plugins/dev-graph/lib/` とする。Harness Hub 製品の API、DB schema、認証認可、
UI、Cloudflare deploy unit は変更しない。判断と最終検証は
`docs/features/feat-dev-pipeline-improvement/w7n7-bd-bridge-split-spec-reflection-receipt.md`
を正とする。

### 実装反映注記 (2026-08-02 / `HarnessHub-dc7`)

`plugins/dev-graph/references/execution-tracker-contract.md` §2 の Beads mutation
単一チョークポイントを維持し、Dev Graph parity の対象外である
`priority`、`assignee`、`labels` も書き込み経路だけは C28
`bd-bridge.py` に限定する。「自由領域」は graph と完全一致させないという意味であり、
guard を迂回して直接更新できるという意味ではない。

bridge は三フィールドを `bd update` の `--priority`、`--assignee`、`--set-labels` へ
転送する。priority は create と共通の正規化を使い、labels は再実行可能な置換だけを許す。
直接 `bd update` の遮断は緩めず、空 labels、更新値なし、別 operation への更新専用引数は
fail-closed に拒否する。これは既存の開発管理契約を実行可能にする内部実装具体化であり、
確定済み QA 回答、製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。
判断と検証は `docs/features/feat-dev-pipeline-improvement/dc7-bd-free-field-write-route-spec-reflection-receipt.md`
を正とする。

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
