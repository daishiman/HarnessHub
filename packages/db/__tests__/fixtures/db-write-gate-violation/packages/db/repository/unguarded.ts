// scripts/ci/check-db-write-gate.mjs の実効性検証専用 fixture (HarnessHub-mb7c)。
// 静的検査 (正規表現走査) 用のダミーコードで、import 解決も実行もされない。
// 実 repository の import 経路を模倣すると tsc の対象になり型エラーになるため、自己完結にする。

function guardedWrite<T>(_owner: unknown, run: () => T): T {
  return run();
}

const db = {
  insert: (_values: unknown) => undefined,
  update: (_values: unknown) => undefined,
  delete: (_values: unknown) => undefined,
};
const adapter = { client: db };

function updateInsideHelper(values: Record<string, unknown>) {
  return db.update(values);
}

export function guardedInsert(values: Record<string, unknown>) {
  return guardedWrite(adapter, () => adapter.client.insert(values));
}

export function guardedHelperUpdate(values: Record<string, unknown>) {
  return guardedWrite(adapter, () => updateInsideHelper(values));
}

export function unguardedInsert(values: Record<string, unknown>) {
  return adapter.client.insert(values);
}

export function unguardedAliasUpdate(values: Record<string, unknown>) {
  return db.update(values);
}

export function unguardedDeleteAfterUrl(values: Record<string, unknown>) {
  const url = 'https://example.com/write';
  if (url.length === 0) throw new Error('unreachable');
  return adapter.client.delete(values);
}
