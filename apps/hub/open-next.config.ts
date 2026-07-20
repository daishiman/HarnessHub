// @opennextjs/cloudflare の設定。Next.js App Router を単一 Worker (cloudflare-workers/hub) へ一体型デプロイする
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// ADR §4: deploy unit は単一 Worker。UI (SSR) と API を同居させ分割しない。
// 費用ゼロ制約 (C2) のため、追加課金が発生する incremental cache / queue / tag cache は
// 既定では有効化しない (無効時は OpenNext が no-op 実装にフォールバックする)。
export default defineCloudflareConfig({});
