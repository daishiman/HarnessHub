# 概要

C07 (system-spec-matrix-auditor) の 2026-07-22 事後 fork 監査で、security.web の確定 qa_ref 系譜 (qa-061 → qa-050 → qa-042/qa-046) の answer 本文に qa-017/qa-020/qa-025 の ID citation が存在せず、コード構造規約 (qa-020: 認可単一ミドルウェア集約) への遡及が本文チェーンで途切れていることが medium として検出された。

## 背景と問題

backend.web / database.web / frontend.web の 3 系統は多段 chain 経由で qa-017/qa-020 へ明示的に到達できるが、security.web のみ断絶が継続している。過去指摘 (reopen_log 937/943) の是正意図が、後続の深掘り再確定 (qa-042/qa-046/qa-050) で再び失われた。内容自体 (decide()/resolveEffectiveRole()/withAuthz() を単一接点とする) は qa-020 の規約を実質反映しており、出典 ID 引用の断絶に限定される。

## 対応方針

次回 spec 改訂時に、security.web の確定 qa の answer 本文へ『qa-020 (コード構造規約の security 適用) を全面維持』の一文を C01 transition writer 経由 (R4-reopen → 新 qa) で明示追加し、他 4 カテゴリと同水準の chain-of-custody を回復する。確定内容そのものは変更しない。
