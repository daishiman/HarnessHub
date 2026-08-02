'use client';

/**
 * S02 の導入パネル (「追加する」「ダウンロード」「Web アプリを開く」)。
 *
 * **descriptor の内容を UI で組み立てない** (frontend-spec §3.2)。
 * R2 key や配布 URL をクライアントで合成すると、pointer が切り替わった瞬間に
 * 「画面には出るが実際には取得できない」導線になる。サーバが返した値だけを出す。
 */
import type { InstallDescriptor } from '@harness-hub/schemas';
import { Alert, Button } from '@harness-hub/ui';
import { useRef, useState } from 'react';
import type { CatalogFailure, CatalogPort, CatalogScope } from '../../lib/catalog/index.js';
import { catalogCapabilities, httpCatalogPort } from '../../lib/catalog/index.js';

export interface CatalogInstallPanelProps {
  scope: CatalogScope;
  projectId: string;
  /** stable release。未公開なら null で、導入導線を出さない。 */
  releaseId: string | null;
  port?: CatalogPort;
  /** 縮退中はサーバ状態を変える操作 (導入数の加算) を止める。 */
  degraded?: boolean | undefined;
  initialDescriptor?: InstallDescriptor | undefined;
}

export function CatalogInstallPanel({
  scope,
  projectId,
  releaseId,
  port = httpCatalogPort,
  degraded = false,
  initialDescriptor,
}: CatalogInstallPanelProps) {
  const [descriptor, setDescriptor] = useState<InstallDescriptor | null>(initialDescriptor ?? null);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);
  const [pending, setPending] = useState<boolean>(false);
  /**
   * 同じ導入操作では同じ鍵を送る。再試行のたびに鍵を作り直すと
   * download count が重複加算され、利用統計が実態から離れる (ADR §2.1)。
   */
  const idempotencyKey = useRef<string | null>(null);

  const handleInstall = async (): Promise<void> => {
    if (releaseId === null) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setPending(true);
    const result = await port.requestInstall(scope, projectId, { releaseId, idempotencyKey: idempotencyKey.current });
    setPending(false);
    if (result.ok) {
      setDescriptor(result.value);
      setFailure(null);
      return;
    }
    setFailure(result.failure);
  };

  const canCopy = failure === null || catalogCapabilities(failure.kind).canCopyInstallDescriptor;

  return (
    <section aria-labelledby="catalog-install-heading">
      <h3 id="catalog-install-heading">導入する</h3>

      {releaseId === null ? (
        <p>公開されている版がまだありません。</p>
      ) : (
        <Button type="button" onClick={() => void handleInstall()} disabled={pending || degraded}>
          {pending ? '取得しています' : '追加する'}
        </Button>
      )}

      {degraded ? <p>Hub が応答していないため、新しい導入情報は取得できません。</p> : null}

      {failure === null ? null : (
        <Alert tone="warning" title="導入情報を取得できませんでした" description={failure.message} />
      )}

      {descriptor !== null && canCopy ? (
        <div aria-live="polite">
          <h4>{descriptor.label}</h4>
          <dl>
            <dt>版</dt>
            <dd>{descriptor.version}</dd>
            {descriptor.command === null ? null : (
              <>
                <dt>導入コマンド</dt>
                <dd>
                  <code>{descriptor.command}</code>
                </dd>
              </>
            )}
            {descriptor.download_url === null ? null : (
              <>
                <dt>ダウンロード</dt>
                <dd>
                  <a href={descriptor.download_url}>パッケージを取得する</a>
                </dd>
              </>
            )}
            {descriptor.launch_url === null ? null : (
              <>
                <dt>Web アプリ</dt>
                <dd>
                  <a href={descriptor.launch_url}>Web アプリを開く</a>
                </dd>
              </>
            )}
          </dl>
          {descriptor.expires_at === null ? null : <p>この導入情報は {descriptor.expires_at} まで有効です。</p>}
        </div>
      ) : null}
    </section>
  );
}
