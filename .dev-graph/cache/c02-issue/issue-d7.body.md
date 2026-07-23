# 概要

C06 (system-spec-hearing-auditor) の 2026-07-21 監査で、decisions 配列の D7 (環境構成: 常設 staging 可否、confirmed_at=2026-07-21) が qa_log への遡及参照を持たないことが medium finding として検出された。

## 背景と問題

D5 (質疑証跡: qa-028)・D6 (質疑証跡: qa-029) と異なり、D7 の user_decision.note には対応する qa id の記録が無く、AskUserQuestion 往復の逐語記録が qa_log に存在しない。このため決定プロセスの中立性を独立監査で検証できない。

## 対応方針

次回 spec 改訂時に、D7 の決定往復 (質問・選択肢・ユーザー回答) を qa として elicit writer 経由で追記登録し、D7 の user_decision.note へ質疑証跡 id を記録する。決定内容 (ephemeral-preview-only) 自体は確定済みであり変更しない。
