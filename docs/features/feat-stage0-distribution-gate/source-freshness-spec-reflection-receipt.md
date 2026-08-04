---
title: C08 出典鮮度監査の仕様反映受領書
status: confirmed
layer: feature-evidence
beads_ids:
  - HarnessHub-e2u
  - HarnessHub-n2c0
dev_graph_node_id: issue-source-freshness-ops-20260722
feature_node_id: feat-stage0-distribution-gate
spec_impact: reflected
reviewed_at: "2026-07-30"
---

# C08 出典鮮度監査の仕様反映受領書

## 対象と結論

`HarnessHub-e2u` で Next.js、Drizzle ORM、Claude Code plugin marketplace、
Wrangler の公式一次資料を再照合した。Claude Code の `git-subdir` は旧 H7 の
設計前提を変えるため仕様・設計影響 **あり**、他 3 件は出典鮮度と依存更新方針への
影響 **あり** と判断し、正本と各投影層へ反映した。

過去の Stage 0 `NOT_ESTABLISHED` は当時の実測なので書き換えない。
現行仕様による再検証は `HarnessHub-n2c0` へ分離し、証跡が揃うまで
Stage 1 を fail-closed のままにする。

## 層別の反映

| 層 | 反映先 | 反映内容 |
|---|---|---|
| canonical registry | `system-spec/fetched-references.json` / `system-spec/index.md` | 公式 URL、確認時刻、版、追随条件 |
| product specification | `specs/harness-hub-system-specification.md` | 採用版の自動変更ではないこと、非影響範囲、Stage 1 gate |
| architecture | `architecture/harness-hub-infrastructure.md` | `git-subdir` 候補経路、project-local Wrangler と lockfile 境界 |
| feature | `features/feat-stage0-distribution-gate.md` | post-close 再検証トリガー |
| task | `tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p12.md` | P12 非実行の維持と後続 task への引継ぎ |
| evidence docs | `docs/features/feat-stage0-distribution-gate/` | 要件、試験、結論への dated addendum |
| issue | `issues/sys-source-freshness-ops-20260722.md` | 再照合結果、検証、影響判断、残課題 |

## 正規フロー

1. 公式一次資料と package registry を照合し、確認値と追随条件を確定した。
2. C02 `run-system-spec-doc-fetch` の assembler を使って canonical registry を生成した。
3. `compile-spec-doc.py` で `system-spec/index.md` を再生成した。
4. 履歴文書は全書換えせず、2026-07-30 addendum として仕様・設計・task 層へ投影した。
5. 未検証の OS 別 E2E は `HarnessHub-n2c0` へ分離し、旧 H7 の判定を勝手に反転させなかった。

## 影響しない範囲

本変更は資料と開発ゲートの更新である。runtime dependency、外部 API、DB schema、
認証認可、UI、Cloudflare Worker の deploy unit、確定済み QA 回答は変更しない。
Wrangler 4.115.0 などの数値は出典台帳の確認値であり、lockfile の更新ではない。

## 中学生向けの説明

使っている道具の「最新の説明書」を読み直したところ、以前は使えなかった配り方が
公式に追加されていた。ただし、説明書に書いてあるだけでは本当に Windows と Mac の
両方で動くとは言えない。そのため、昔のテスト結果は残し、新しい配り方を別の課題で
実際に試すことにした。合格するまでは次の開発へ進まない。

## 専門的な説明

Anthropic の `git-subdir` source は `url` / `path` と任意の `ref` / `sha` を
契約に持ち、sparse partial clone で monorepo の plugin subtree を取得する。
これは旧 H7 が試した `github` source の subdirectory 解決とは異なる。
採用には macOS / Windows の install、`plugin details` の Skills 1 件以上、
実 skill の期待出力、global Git 設定非依存、隔離領域 cleanup の E2E 証跡が必要である。

## 検証と残課題

- exact-13 task 仕様 gate:
  `validate-system-plan.py --feature-package feature-package/feat-stage0-distribution-gate`
- source citation gate: target / reference の 1:1、必須属性、公式 host を検査
- deterministic build: `system-spec/index.md` の byte-for-byte 一致を検査
- graph / issue: C02 writer と dev-graph validation で対応関係を検査
- 残課題: `HarnessHub-n2c0` の macOS / Windows 実機 E2E
- 500 行規則: 本変更の人手管理対象はすべて 500 行以下。機械生成の
  `.dev-graph/state/graph.json` は分割対象外
