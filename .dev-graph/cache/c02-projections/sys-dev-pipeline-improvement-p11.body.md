# 証跡固定 — 実測ログと digest の evidence manifest 化

> task projection (P11 / parent: feat-dev-pipeline-improvement)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f`
- task spec: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f/task-specs/phase-11-evidence.md`
- package digest: `sha256:f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f`
- task spec SHA-256: `sha256:00c7da83cbfa31a521e30a372bd2335050c67772a8e4193bfa3223d1c8bd907a`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f/dev-graph-registration-receipt.json`

## 依存

- 直前 phase (SYS-DEV-PIPELINE-IMPROVEMENT-P10) の完了に依存する (直列 DAG)。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
