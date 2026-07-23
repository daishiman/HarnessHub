# 実装 — lint script 3 本・handoff schema・eval-log 規約・task template 追記・CI 配線

> task projection (P05 / parent: feat-dev-pipeline-improvement)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f`
- task spec: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f/task-specs/phase-05-implementation.md`
- package digest: `sha256:f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f`
- task spec SHA-256: `sha256:900d478a0e3cbe696bfe2c7072179f2eb2e707e8c3123f55a8bc53dc8724e0ba`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f/dev-graph-registration-receipt.json`

## 依存

- 直前 phase (SYS-DEV-PIPELINE-IMPROVEMENT-P04) の完了に依存する (直列 DAG)。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
