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
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-144 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-102 |

## 確定内容 (質疑録)

### qa-143 (対応セル: web)

**質問**: 全 plugin の hook entry point について、package-contract の宣言・Claude Code への登録・実体ファイルをどのように fail-closed で一致させ、手動実行スクリプトを誤って自動 hook と扱わないようにしますか?

**回答**: ユーザーの 2026-08-04 最終レビュー・品質ゲート再実行・仕様反映・公開指示を明示承認として、qa-142 を全面維持したまま repository 内の plugin 完全性検査へ hook entry point の 3 者一致を追加確定する。

【1. 登録と宣言の双方向検査】`scripts/validate-plugin-completeness.py` は `package-contract.json` の `entry_points.hooks` を台帳の正本として、manifest inline hooks と `hooks/hooks.json` の和集合で得た登録 entry point に突合する。登録済みで未宣言なら HK-001、登録構成（inline manifest または hooks.json）がある plugin で宣言済み・未登録なら HK-002 として非 0 終了にする。`hooks/foo.py` と `./hooks/foo.py` の相対 command も登録として読む。

【2. 実体と責務境界】宣言または登録された entry point は `hooks/` に実在しなければならない。残余の Python は import 可能な名前、shebang 不在、`__main__` block 不在の全条件を満たす import 専用 support module だけを許容し、それ以外と shell script は HK-003 で拒否する。自動 event に接続しない手動運用スクリプトは `hooks/` ではなく `scripts/` に置き、entry point 台帳・自動登録・手動操作を混同しない。

【3. 単一責務と回帰】検査本体が 500 行を超えたため、hook/sidecar の純粋な収集・判定を `validate-plugin-hooks.py` に分離する。CLI と判定ロジックを別責務にしても同じ単体テストと repo 全体契約テストから呼び、plugin 専用の実装が全体ゲートを追い越す被覆差を作らない。

【4. 製品境界】変更は repository 内の plugin 配布、CI、開発品質ゲートだけに限定する。Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

### qa-144 (対応セル: desktop-windows)

**質問**: CI の merge-blocking 品質ゲートと root pnpm verify の実行契約を、G7/G7b/G9/G14 を含めてどのように一致させますか?

**回答**: ユーザーの 2026-08-04 最終レビュー・仕様反映・公開指示を明示承認として、qa-038 / qa-039 の既存 CI/local 同値契約を次のとおり具体化する。root の pnpm verify は、CI の merge-blocking gate が再利用する既存 package script を同じ順序で起動する入口とし、G7 (破壊的 DDL)、G7b (tenant 分離網羅・connection isolation)、G9 (axe a11y)、G14 (OIDC / owner 認可 release contract) を CI 専用 step として残さない。package 内 script を pnpm --filter で呼ぶ wrapper は、先に required script の実在を検査し、rename / 削除で無実行の緑になることを fail-closed で防ぐ。G11 は main 反映後の定期 Core Web Vitals 測定であり、PR merge-blocking gate でも local verify の対象でもない。今回の変更は repository 内の開発品質契約と証跡に限定し、Harness Hub の外部 API、DB schema、認証認可規則、UI、Cloudflare deploy unit は変更しない。

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
