# Notion スキーマ SSOT

xl-skills のプラグイン量産フローを Notion 上の 3 DB と連動させるための schema-as-code 定義。
**スキーマ構造（properties 定義）は本 repo の SSOT、DB ID は per-repo 設定 (`.notion-config.json`) に分離**。

## 構成

| ファイル | 対応 Notion DB | config key |
|---|---|---|
| `hearing-sheet.schema.json` | Skillヒアリングシート | `hearing-sheet` |
| `skill-list.schema.json` | Skill一覧（プラグイン単位） | `skill-list` |
| `improvement-request.schema.json` | Skill改善要望 | `improvement-request` |

実 DB ID は `<repo-root>/.notion-config.json#databases.<key>.db_id` で解決される。
他リポジトリへの導入手順は **[plugins/harness-creator/references/notion-per-repo-setup.md](../../plugins/harness-creator/references/notion-per-repo-setup.md)** を参照。

## リレーション

```
ヒアリングシート ──(1:1)── スキル一覧 ──(1:N)── 改善要望
   紐づくプラグイン       紐づくヒアリングシート / 改善要望     対象プラグイン
```

- ヒアリングシート 1 件 = プラグイン 1 件
- スキル一覧の行 = プラグイン 1 件（個別 Skill はページ本文に列挙）
- 改善要望は必ず `対象プラグイン` でいずれか 1 プラグインに紐づく

## 反映

```bash
# 差分検知
python3 scripts/sync-notion-schema.py --check

# 適用
python3 scripts/sync-notion-schema.py --apply
```

DB ID / token が解決できない場合は **exit 2 で停止** する (fail-closed)。「設定が無いから成功扱い」に
しないのは、`--check` で「検査した結果の緑」と「検査していない緑」が区別できなくなるため。Notion 連携を
使わない repo では、このコマンド自体を起動しない。

Notion API トークンは macOS Keychain (config の `keychain_service`/`keychain_account`) → legacy fallback →
`INTAKE_ALLOW_ENV_TOKEN=1` のときだけ env `NOTION_TOKEN`、の順で解決する (env は最優先ではない)。
CI での投入手順は [notion-per-repo-setup.md §6](../../plugins/harness-creator/references/notion-per-repo-setup.md) を参照。

## 制約メモ

- Notion API は `status` 型プロパティの作成/更新を許可しない（UI のみ）。本スキーマでは進行管理を `select` で表現。
- `dual_property` relation は片側追加で相手側プロパティが自動生成される。スキーマでは正式名のみを定義し、初回適用時に逆プロパティをリネームする。
- `rollup` は対象 relation が存在しないと作成不可。`sync-notion-schema.py` は relation → rollup の順で適用する。
