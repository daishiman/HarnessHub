# Elegant review improvement summary

対象は、`run-elegant-review` エージェントキット、Harness Studio の Graphite × Amber デザイン契約、HarnessHub の認証後共通シェルである。成果物は削除せず、Phase 1 で既存判断を事実と仮説へ分離してから、Phase 2 を 9/9/12 の3分析群で並列実行し、Phase 3 を1反復で収束させた。

## 改善結果

- 30思考法を省略なし・一意ID・正規名で固定し、`why` を G-problem、担当を9/9/12へ統一した。
- orchestratorをsingle-writerとし、commit/pushは `commit_authorized=true` の明示時だけ許可する契約へ統一した。
- findings schema、condition matrix、issues、signal、scorecard、verdictを決定論的に導出・照合できるようにした。
- canonical pluginと `.claude` / `.codex` / `.agents` の配布surface、manifest、resource map、prompt、agent、commandを同期した。
- Graphite × Amber、Light/Dark/auto、641/1025 breakpoint、system Japanese font、IBM Plex Sans、JetBrains Mono、44px操作域、contrast契約を実装・仕様・検査へ反映した。
- 認証後の全業務画面に共通の戻る/進むと動的なroute titleを追加した。個別 `ScreenHeader`、公開shell、bottom tabへは複製していない。
- route titleは exact → dynamic → 最長一致nav fallbackで解決し、`/metrics/usage`を`/metrics`と誤認しない。
- 360pxではWorkspace文脈と操作列を2段化し、履歴2操作を各44px、titleを48px以上、横overflow 0にした。
- desktopで検索欄と検索アイコンが二重表示されるCSS優先順位を修正した。
- 履歴client islandから共通Icon集とstyle helperの依存を除き、client bundleを120KiB以内へ戻した。
- Light/Dark VRTを更新し、空になったMobileTabBar見本も目視で発見・修正した。

## 検証証拠

- kit contract tests: 88 passed
- UI tests: 501 passed、coverage 95.20%
- Hub tests: 2,188 passed / 8 todo
- browser tests: 42 passed（実Chromium、VRT、360/768/1280）
- build: Next.js production build PASS、OpenNext Cloudflare bundle PASS
- client bundle: 120KiB gate PASS
- lint / typecheck / a11y / duplicate / auth / tenant isolation / secret / DDL / drift / hardcoding gates: PASS

最終findingは30件全て `issues=[]`、C1〜C4全てPASS、`loop_count=1`、`run_status=complete` とした。
