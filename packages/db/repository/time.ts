// サーバ時刻の単一注入点 (qa-032 / SEC5)。
// 時刻列は INTEGER (epoch ms)。リポジトリ層だけがこの関数で値を発行し、クライアント申告時刻は保存しない。

export function serverNow(): number {
  return Date.now();
}
