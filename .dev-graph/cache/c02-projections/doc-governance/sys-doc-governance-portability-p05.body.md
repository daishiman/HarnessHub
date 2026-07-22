# 実装 — lint script 3 本・allowlist schema・回帰テスト・governance-check.yml 配線

> task projection (P05 / parent: feat-doc-governance-portability)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-05-implementation.md`
- package digest: `sha256:d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec SHA-256: `sha256:b122b968e5a6f2a6f9e7d235ab88506069e7ed6e280f46999a26ca28160d1198`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/dev-graph-registration-receipt.json`

## 依存

- 直前 phase (SYS-DOC-GOVERNANCE-PORTABILITY-P04) の完了に依存する (直列 DAG)。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
