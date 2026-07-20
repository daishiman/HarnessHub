---
name: h7-probe-echo
description: Stage 0 technical gate (H7) の配布経路検証で、install 後に skill が実際に実行できることを確認するためのプローブ。呼び出されたら固定の検証トークンを出力する。業務用途では使わない。
---

# h7-probe-echo

配布経路検証 (H7) の **T-A3-03 (skill の実行)** 専用のプローブ skill です。

## 目的

`claude plugin install` が exit code 0 を返しても、skill が実際に読み込まれ実行できるとは限りません。この skill は「入ったが使えない」状態を検出するために、実行されたら**固定の検証トークン**を出力します。

## 手順

呼び出されたら、以下の 1 行を**そのまま**出力してください。前後に説明を加えないでください。

```
H7-PROBE-OK: skill executed via distributed plugin
```

## 判定

test-design.md の T-A3-03 は、上記トークン文字列が出力に含まれることを pass 条件とします。トークンが出力されない場合、plugin は install されていても skill が機能していないため `fail` です。
