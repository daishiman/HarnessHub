---
status: active
layer: feature-runbook
feature_id: feat-hub-foundation
beads_id: HarnessHub-bmhq
updated: 2026-08-11
---

# Hub ローカル開発ランタイム

この手順は、ローカル libSQL（sqld）と Next.js を同じ DB・同じ設定で再現可能に起動するための正本です。`nohup` の手作業ではなく、macOS の `launchd`（ログイン中の常駐プロセスを監視する仕組み）が supervisor を、supervisor が sqld と Next.js を監視します。

## 保証する範囲

- DB・秘密設定・ログ・PID は git-ignore 済みの `.local-state/hub/` に固定する。
- sqld と Next.js は `127.0.0.1` のみで待ち受ける。
- 子プロセスの異常終了時は supervisor が再起動し、supervisor 自体の異常終了時は launchd が再起動する。
- `start / status / stop / restart / smoke / cookie` を単一の CLI で扱う。
- `stop` と `restart` は DB を削除しない。
- Cookie 更新は DB を変更しない。seed の流し直しとは明確に分離する。

macOS ログイン前やユーザーがログアウトした状態での稼働は対象外です。`launchd` の LaunchAgent はログインセッション単位で動きます。

## 一度だけ行う既存DBの移行

稼働中DBをコピーしないでください。まず旧 sqld / Next.js を停止し、旧DBとenvの**絶対パス**を確認してから次を実行します。移行元は削除されず、移行先が既にあれば上書きせず停止します。

```bash
pnpm --filter @harness-hub/hub local:migrate -- \
  --from-db /absolute/path/to/hub-local.sqld \
  --from-env /absolute/path/to/hub-local.env
```

移行後の正本は `.local-state/hub/hub-local.sqld` です。旧 `hub-local.db` や scratchpad の相対パスを再び起動に使わないでください。

## 日常操作

```bash
pnpm --filter @harness-hub/hub local:start
pnpm --filter @harness-hub/hub local:status
pnpm --filter @harness-hub/hub local:smoke
pnpm --filter @harness-hub/hub local:restart
pnpm --filter @harness-hub/hub local:stop
```

`local:status` は launchd、supervisor、sqld、Next.js、sqld `/health`、Hub `/health`、Hub `/` をまとめて確認します。ローカルに R2 binding がない場合、Hub `/health` のアプリ状態は `degraded` でも HTTP 200 が正常です。DB が `down`、HTTP 503、またはプロセス不在なら不合格です。

`local:smoke` は新しい管理者 Cookie をメモリ内だけで発行し、tenant/workspace scope を付けて `/api/v1/sheets` が3件返るところまで検査します。出力へ Cookie や secret は表示しません。

## ブラウザ確認用 Cookie

```bash
pnpm --filter @harness-hub/hub local:cookie -- --account admin
```

このコマンドは既存の `local` tenant、`ws-local` workspace、`admin@local.test` を読み取るだけで、DBを変更しません。出力された `__Host-harness-hub.session` をブラウザの Cookie 管理画面へ `Secure / HttpOnly / SameSite=Lax / Path=/ / Domainなし` で登録し、`http://localhost:3100/sheets` を開きます。Console の `document.cookie` では HttpOnly を設定できないため、正規手順にはしません。

Cookie は発行から8時間で失効します。期限切れ時は `local:cookie` だけを再実行し、`seed:local` は実行しません。

## ログと復旧

保存先は次で確認できます（secret の値は表示しません）。

```bash
pnpm --filter @harness-hub/hub local:paths
```

sqld・Next.js のログは5 MiBでローテーションし、直近5世代を保持します。異常時は `local:status` → ログ確認 → `local:restart` → `local:smoke` の順で復旧確認します。PIDを手入力して停止したり、別の作業ディレクトリから `sqld -d ./hub-local.sqld` を直接実行したりしないでください。

`local:stop` 後も DB、env、ログは保持されます。データの物理削除はこの CLI の責務外です。

## 仕様・設計と受入証跡

- 正規仕様: [maintenance / operations](../../../system-spec/maintenance-ops.md) の `qa-230`
- 実装 writeback: [システム仕様 writeback](../../../specs/harness-hub-system-specification-implementation-writebacks.md)
- 構成判断: [infrastructure 運用追補](../../../architecture/harness-hub-infrastructure-operations-addenda.md)
- 最終判断と検証: [仕様反映受領書](local-dev-runtime-reliability-spec-reflection-receipt.md)

CLI、health、API smoke、自動復旧は自動検証する。HttpOnly Cookie を使った実画面表示は
ブラウザでのみ最終確認できるため、未実施の場合は CLI の成功から画面 PASS を推測せず、
Beads `HarnessHub-bmhq` を open のまま残す。
