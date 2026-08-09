"""Small, deterministic system-spec-harness PASS bundle for C19 resume trials."""
from __future__ import annotations

import hashlib
import json

from .base_shape import FIXED_TS


REQUIREMENTS = """---
status: confirmed
category: requirements-definition
---

# 要件定義書 (上位概念)

## U1 本質的目的 (essential_purpose)
ローカルの TODO を外部へ送らず管理する。

## U2 背景 (background)
外部 SaaS と通信せず再現可能な受入 fixture が必要である。

## U3 ゴール (goals)
認証済み利用者が永続化された TODO を操作できる。

## U4 目標 (objectives)
単一プロセスと単一 SQLite ファイルで動作する。

## U5 成功基準 (success_criteria)
未認証は 401、再起動後も作成済み TODO が取得できる。

## U6 ステークホルダー (stakeholders)
利用者兼運用者 1 名。

## U7 スコープ (scope)
TODO CRUD、token 認証、SQLite 永続化を対象とする。

## U8 制約 (constraints)
localhost のみで外向き通信を行わない。

## U9 具体的にやりたいこと (concrete_intents)
curl から TODO の作成・取得・更新・削除を行う。
"""

INDEX = """---
kind: index
---

# システム構築仕様書 index

## 要件定義書 (上位概念・憲法)
[要件定義書](./00-requirements-definition.md) は confirmed である。

## 章一覧と集約状態
| カテゴリ | 集約状態 |
|---|---|
| requirements | 確定 |

## 集約状態サマリ
未収集 0、確定 1。

## 全体ドキュメント出典 (未割当参照)
未割当参照なし。
"""

COMPLETENESS = {
    "schema_version": "1.0.0",
    "verdict": "PASS",
    "evaluated_at": FIXED_TS,
    "gates": {
        "coverage": "PASS",
        "source_citation": "PASS",
        "evaluator": "PASS",
    },
}


def _json(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def content(plugin_version: str) -> dict[str, str]:
    artifacts = {
        "system-spec/index.md": INDEX,
        "system-spec/00-requirements-definition.md": REQUIREMENTS,
        "system-spec/completeness-report.json": _json(COMPLETENESS),
    }
    receipt = {
        "schema_version": "1.0.0",
        "producer": {
            "plugin": "system-spec-harness",
            "version": plugin_version,
            "entry_point": "assign-system-spec-completeness-evaluator",
        },
        "verdict": "PASS",
        "gates": COMPLETENESS["gates"],
        "artifacts": {
            path: hashlib.sha256(body.encode("utf-8")).hexdigest()
            for path, body in sorted(artifacts.items())
        },
        "created_at": FIXED_TS,
    }
    return {**artifacts, "system-spec/resume-receipt.json": _json(receipt)}
