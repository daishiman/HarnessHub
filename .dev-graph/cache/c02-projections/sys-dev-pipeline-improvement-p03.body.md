# 設計レビュー — 単一 writer・choke-point・sync authority との整合検証

> task projection (P03 / parent: feat-dev-pipeline-improvement)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f`
- task spec: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f/task-specs/phase-03-design-review.md`
- package digest: `sha256:f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f`
- task spec SHA-256: `sha256:8965cc518f0c5f36932a52c63ea65d10bee474018f9be0514b2078e329d8141c`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/f9dcb78262870bf542c4200647b2dd9f0e5c14a882c928a4554d5e9d67dd2e9f/dev-graph-registration-receipt.json`

## 依存

- 直前 phase (SYS-DEV-PIPELINE-IMPROVEMENT-P02) の完了に依存する (直列 DAG)。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
