/**
 * Metrics 画面が業務ツール ID を表示名へ解決するための読取専用アダプタ。
 *
 * 認可と tenant/workspace の範囲決定は `/api/v1/projects` に任せ、ここで役割判定や
 * project の抽出条件を複製しない。取得失敗は metrics 本体の失敗とは別扱いにし、
 * 呼び出し元が ID 表示へ縮退できるよう例外で通知する。
 */

interface ProjectNameItem {
  readonly id: string;
  readonly name: string;
}

function projectNameItems(value: unknown): readonly ProjectNameItem[] | null {
  if (value === null || typeof value !== 'object' || !('items' in value) || !Array.isArray(value.items)) return null;
  const items: ProjectNameItem[] = [];
  for (const candidate of value.items) {
    if (
      candidate === null ||
      typeof candidate !== 'object' ||
      !('id' in candidate) ||
      typeof candidate.id !== 'string' ||
      !('name' in candidate) ||
      typeof candidate.name !== 'string'
    ) {
      return null;
    }
    items.push({ id: candidate.id, name: candidate.name });
  }
  return items;
}

export async function fetchMetricsProjectNames(input: {
  readonly tenantId: string;
  readonly workspaceId: string;
}): Promise<ReadonlyMap<string, string>> {
  const response = await fetch('/api/v1/projects', {
    credentials: 'same-origin',
    headers: {
      'x-harness-tenant-id': input.tenantId,
      'x-harness-workspace-id': input.workspaceId,
    },
  });
  if (!response.ok) throw new Error('業務ツール名を取得できませんでした。');

  const items = projectNameItems(await response.json());
  if (items === null) throw new Error('業務ツール名の応答形式が不正です。');

  return new Map(items.map((item) => [item.id, item.name.trim()]));
}
