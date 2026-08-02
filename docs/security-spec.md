---
status: confirmed
qa_ref: [qa-037, qa-042, qa-045, qa-046, qa-048, qa-050, qa-061, qa-072, qa-073, qa-074, qa-075]
layer: implementation-spec
sources:
  - system-spec/security.md
  - system-spec/auth.md
  - system-spec/00-requirements-definition.md
  - docs/backend-spec.md
  - docs/mockups/harness-studio-v2-analysis.md
doctrine_anchor: OWASP ASVS + Secrets Management Cheat Sheet
serves_goals: [G1, G2, G3, G4, G5]
---

# Harness Hub security 実装仕様書

> **位置づけ**: security 詳細正本の入口。本文は責務ごとの分冊を正本とし、この索引から参照する。
>
> **確定根拠**: 2026-07-17 の 8 設計判断、2026-07-25 の R4-reopen (`qa-072` / `qa-073`)、2026-07-26 の本番 adapter 反映 (`qa-074` / `qa-075`)。
>
> **重複回避**: テーブル・endpoint 一覧は [backend-spec.md](backend-spec.md) が正本。security 分冊は脅威、認証・認可、鍵・監査、入力境界、Web 防御、検証だけを保持する。

## 分冊一覧

| 旧節 | 正本 | 責務 |
|---|---|---|
| §0–§1 | [security-spec-foundations.md](security-spec-foundations.md) | 前提、設計判断、脅威モデル |
| §2 | [security-spec-authentication.md](security-spec-authentication.md) | Web session、OIDC、Device Flow |
| §3 | [security-spec-authorization.md](security-spec-authorization.md) | role、許可表、判定契約、tenant scope |
| §4–§5 | [security-spec-data-integrity.md](security-spec-data-integrity.md) | 暗号化、Secret、監査、hash chain |
| §6–§7 | [security-spec-request-controls.md](security-spec-request-controls.md) | 入力検査、CSP、rate limit、CSRF |
| §8–§10 | [security-spec-assurance.md](security-spec-assurance.md) | テスト、監視、incident、確定記録 |

`/catalog` の protected CWV 計測用 credential は [authentication §2.1.1](security-spec-authentication.md#211-protected-cwv-probe運用専用人のログインではない) と [authorization §3.7.1](security-spec-authorization.md#371-cwv-probe-の最小権限境界qa-133) を正本とする。

## 参照規約

既存の「`docs/security-spec.md §N`」参照は、この索引の旧節番号から対応分冊へ解決する。新規参照は分冊ファイルを直接リンクし、節番号も併記する。

## 変更規約

- 値や振る舞いを変えるときは system-spec の R4-reopen を先に行う。
- 各分冊は 300 行以下を維持する。
- 横断的な導線変更時は、この索引と [仕様反映受領書](features/feat-auth-tenancy/spec-reflection-receipt.md) を同時更新する。
