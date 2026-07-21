// opennextjs-cloudflare build の生成物 (.open-next/worker.js) に対する型宣言。
// 生成物は typecheck 時に存在しないことがあり、存在しても JS のため型情報を持たない。
// 生成物へ型を要求せず、custom entry (src/worker.ts) が必要とする形だけをここで固定する。
declare module '*.open-next/worker.js' {
  const handler: {
    fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
  };
  export default handler;

  // OpenNext が生成する Durable Object 実装。custom entry から素通しで再 export する
  export const DOQueueHandler: unknown;
  export const DOShardedTagCache: unknown;
  export const BucketCachePurge: unknown;
}
