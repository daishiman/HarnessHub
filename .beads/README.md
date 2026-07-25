# Beads - AI ネイティブな課題管理

Beads へようこそ! このリポジトリは課題管理に **Beads** を使用します。Beads は、コードのすぐ隣、リポジトリの中に直接住まわせる、モダンで AI ネイティブなツールです。

## Beads とは?

Beads はリポジトリ内で動く課題管理ツールで、AI コーディングエージェントや、課題をコードの近くに置きたい開発者に最適です。Web UI は不要で、すべて CLI から操作でき、git とシームレスに統合されます。

**詳しく知る:** [github.com/steveyegge/beads](https://github.com/steveyegge/beads)

## ⚠️ 本リポジトリ固有の制約

**課題を変更する操作（create / update / close）は `bd` を直接実行できません。**
`plugins/dev-graph/hooks/guard-graph-schema.py` が、変更操作を `plugins/dev-graph/scripts/bd-bridge.py` の単一経路に強制しているためです。直接実行すると BLOCK されます。

```bash
# ✅ 変更操作はこちら（--graph-node-id は必須: 課題は dev-graph node と 1 対 1 で紐づく）
python3 plugins/dev-graph/scripts/bd-bridge.py --op create --repo-root . \
  --graph-node-id <graph-node-id> --title "<タイトル>"

# ✅ 読み取り操作は bd を直接実行してよい（guard 対象外）
bd list / bd show <id> / bd ready / bd stats
```

コンフリクト解消・書込経路・事故時の復旧手順は **[docs/beads-operations-runbook.md](../docs/beads-operations-runbook.md)** を参照してください。以下は Beads 一般の説明です。

## クイックスタート

### 基本コマンド

```bash
# 新しい課題を作成する（※本リポジトリでは bd-bridge.py 経由。上記の制約を参照）
bd create "Add user authentication"

# 全課題を表示する
bd list

# 課題の詳細を表示する
bd show <issue-id>

# 課題ステータスを更新する（※本リポジトリでは bd-bridge.py 経由）
bd update <issue-id> --claim
bd update <issue-id> --status done

# Dolt リモートと同期する
bd dolt push
```

### 課題の取り扱い

Beads における課題は次の特徴を持ちます:
- **git ネイティブ**: バージョン管理とブランチ機能を備えた Dolt データベースに格納される
- **AI フレンドリー**: CLI ファーストの設計で AI コーディングエージェントと相性が良い
- **ブランチ対応**: 課題がブランチのワークフローに追従できる
- **同期対応**: バックアップやチーム共有に Dolt リモートを利用する

## なぜ Beads か?

✨ **AI ネイティブな設計**
- AI 支援の開発ワークフロー向けに特化して構築
- CLI ファーストのインターフェースが AI コーディングエージェントとシームレスに連携
- Web UI へのコンテキストスイッチが不要

🚀 **開発者志向**
- 課題はコードのすぐ隣、リポジトリ内に置かれる
- オフラインで動作し、push 時に同期する
- 高速・軽量で、作業の邪魔をしない

🔧 **git 統合**
- bd dolt push / bd dolt pull による Dolt ネイティブな同期
- ブランチ対応の課題管理
- Dolt ネイティブな 3-way マージ解決

## Beads を使い始める

自分のプロジェクトで Beads を試すには:

```bash
# Beads をインストールする
curl -sSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash

# リポジトリで初期化する
bd init

# 最初の課題を作成する
bd create "Try out Beads"
```

## さらに詳しく

- **ドキュメント**: [github.com/steveyegge/beads/docs](https://github.com/steveyegge/beads/tree/main/docs)
- **クイックスタートガイド**: `bd quickstart` を実行
- **サンプル**: [github.com/steveyegge/beads/examples](https://github.com/steveyegge/beads/tree/main/examples)

---

*Beads: 思考の速度で動く課題管理* ⚡
