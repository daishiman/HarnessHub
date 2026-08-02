---
name: run-publisher-publish
description: skills-package を Harness Hub へ publish したいとき、apps/publisher CLI (Device Flow 認証・pre-check・wrangler デプロイ) を実行したいときに使う。
disable-model-invocation: false
user-invocable: true
argument-hint: "--package-dir <dir> --hub-url <url> --tenant-slug <slug> --project-id <id> --target <skill|web_app> --visibility <private|workspace> --origin <origin> [--wrangler-config <path>]"
arguments: [package-dir, hub-url, tenant-slug, project-id, target, visibility, origin, wrangler-config]
allowed-tools:
  - Bash(bash *)
kind: run
prefix: run
effect: external-mutation
owner: harness maintainers
since: 2026-08-02
version: 0.1.0
source: docs/features/feat-publisher-plugin/design-review-notes.md
script_refs:
  - scripts/run-publisher-publish.sh
---

# run-publisher-publish

`apps/publisher` (`@harness-hub/publisher`) の CLI を実行し、skills-package を Harness Hub へ
publish します。本 skill は `scripts/run-publisher-publish.sh` を呼ぶだけの薄いラッパーで、
package 収集・manifest 補完・pre-check・Device Flow 認証・wrangler 実行のいずれの業務ロジックも
ここには実装しません (AD-1: 実装の唯一の owner は `apps/publisher/src/`)。

## 実行

```
bash scripts/run-publisher-publish.sh --package-dir <dir> --hub-url <url> --tenant-slug <slug> \
  --project-id <id> --target <skill|web_app> --visibility <private|workspace> --origin <origin> \
  [--wrangler-config <path>]
```

引数は全てそのまま `apps/publisher` の CLI (`publish` サブコマンド) へ渡されます。
終了コードも CLI の戻り値をそのまま返します (0: 成功、非 0: 失敗)。

## 前提

- リポジトリ直下で `pnpm install` 済みであること (`apps/publisher` は `node_modules` の
  workspace link 経由で `@harness-hub/schemas` / `@harness-hub/inspection` を解決する)
- `--target web_app` を指定する場合は `--wrangler-config` が必須 (未指定だと CLI がエラーで停止する)
