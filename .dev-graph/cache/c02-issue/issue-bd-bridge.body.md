# 概要

`guard-graph-schema` が beads mutation を `bd-bridge.py` の単一チョークポイントに限定しているが、その `bd-bridge.py` が `--notes` / `--design` を通さないため、beads の notes を更新する正規経路が存在しない。

## 背景と問題

エージェントが課題の進捗メモ (`notes`) を残そうとすると、直接 `bd update --notes` は guard hook に遮断され、許可された `bd-bridge.py --op update` は `--notes` を受け付けない。結果として「記録すべきだが記録手段がない」状態になる。

HarnessHub-9ao (finding 4/5) の実行時に実際に発生し、作業完了メモを課題側へ残せなかった。

## 現在の挙動

```
$ bd update 9ao --notes "..."
[guard-graph-schema] BLOCKED: Beads mutation は scripts/bd-bridge.py の単一チョークポイント経由に限定
```

`bd-bridge.py` の `main()` が `--op update` に対して受け付けるのは `--status` / `--title` / `--description` のみ (`plugins/dev-graph/scripts/bd-bridge.py`)。`--notes` / `--design` の引数定義自体が存在しない。

同種の欠落として `--op create` にも `--priority` が無く、本 issue 自身の起票 (HarnessHub-8ql) で md の `priority: low` を beads へ伝達できず bd 既定の P2 になった。フィールド欠落は notes/design 単独ではなくチョークポイント全体の被覆問題として扱う。

## 期待する挙動

`bd-bridge.py --op update --bd-issue-id <id> --notes "<text>"` が成功し、guard hook を迂回せずに notes が更新される。

## 再現手順またはユースケース

1. 任意の beads 課題に対し `bd update <id> --notes "test"` を実行する
2. guard hook が BLOCKED を返す
3. `python3 plugins/dev-graph/scripts/bd-bridge.py --op update --bd-issue-id <id> --notes "test"` を実行する
4. `unrecognized arguments: --notes` で失敗する

## 影響と優先度

- 影響範囲: system (エージェントの課題記録ワークフロー)
- 深刻度: low
- 緊急度: 低 — 進捗は commit message と issue markdown に残せるため代替はある。ただしチョークポイント設計の穴なので、迂回運用が常態化する前に塞ぐのが望ましい。

## スコープ

- In: `bd-bridge.py --op update` への `--notes` / `--design` パススルー追加、`--op create` への `--priority` パススルー追加、回帰テスト
- Out: `guard-graph-schema` の緩和 (チョークポイント自体は維持する)、bd CLI 側の変更

## 関連グラフ

- 原因/親ノード: issue-docs-recompose-followups-20260718
- 関連仕様: —
- 関連アーキテクチャ: arch-harness-hub-dev-workflow
- 解決タスク: —

## 受入条件

- [ ] `bd-bridge --op update --bd-issue-id <id> --notes <text>` が成功する
- [ ] guard hook を迂回せずに notes 更新が完了する
- [ ] 回帰テストが `plugins/dev-graph/tests` に存在する

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/dev-graph/tests -q`
- 証跡 path: (未取得)
