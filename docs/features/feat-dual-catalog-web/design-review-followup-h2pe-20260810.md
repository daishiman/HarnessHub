# design-review follow-up 解消記録 — HarnessHub-h2pe

元の所見は [design-review-notes.md](./design-review-notes.md) §5.3 に発見時証跡として残す。本ファイルが現行判定の正本である。

## 解消内容（2026-08-10）

- **C1**: `PollingState.lastFailureKind` と `isTerminalCatalogFailure()` へ集約し、401 / 403 / fatal を初回応答後に停止する。`polling-contract.test.ts` と lifecycle 検査の双方で固定する。
- **C2**: `visibilitychange` を購読し、可視性だけを理由に停止した場合に限って再開する。timer 予約後に hidden へ変わる競合もあるため、応答後だけでなく**通信開始前**にも共通判定を行う。`polling-lifecycle.test.tsx` は hidden 中の request 増分 0 を検査する。
- **C3**: 実装を正とし、`validating` / `approved` / `publishing` だけを pollable とする。`needs_fix` / `ready` / `approval_pending` は人の操作待ちなので停止し、visible 復帰でも再開しない。
- **配線共有**: S03 (`CatalogPublishStatus`) と S01 (`PublishWizard`) は同じ純関数契約を利用する。停止条件を各画面へ複製せず、画面側は timer / listener の lifecycle 配線だけを担う。

以上により V3 の C1〜C3 は解消した。
