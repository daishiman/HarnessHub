---
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
