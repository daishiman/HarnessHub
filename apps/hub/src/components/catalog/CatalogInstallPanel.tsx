'use client';

/**
 * S02 の導入パネル (「追加する」「ダウンロード」「Web アプリを開く」)。
 *
 * **descriptor の内容を UI で組み立てない** (frontend-spec §3.2)。
 * R2 key や配布 URL をクライアントで合成すると、pointer が切り替わった瞬間に
 * 「画面には出るが実際には取得できない」導線になる。サーバが返した値だけを出す。
 */
import type { InstallDescriptor } from '@harness-hub/schemas';
import { Alert, Button, DefinitionList, Panel, Stack } from '@harness-hub/ui';
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

  // 「取得できた導入手段」を並べる。生の <dl> をここで書くと余白と折り返しが
  // 他画面とずれるため、詳細画面と同じ DefinitionList に寄せる (§5-1 の写し方)
  const descriptorItems =
    descriptor === null
      ? []
      : [
          { term: '版', description: descriptor.version },
          ...(descriptor.command === null
            ? []
            : [{ term: '導入コマンド', description: <code>{descriptor.command}</code> }]),
          ...(descriptor.download_url === null
            ? []
            : [{ term: 'ダウンロード', description: <a href={descriptor.download_url}>パッケージを取得する</a> }]),
          ...(descriptor.launch_url === null
            ? []
            : [{ term: 'Web アプリ', description: <a href={descriptor.launch_url}>Web アプリを開く</a> }]),
        ];

  return (
    <Panel
      title="このツールを使い始める"
      description="お使いの環境へ追加するための情報を取り出します。"
      headingLevel={2}
    >
      {/* 見出しは Panel が出すので、ここは読み上げ用の名前だけ持たせる (見出しの階層飛びを作らない) */}
      <section aria-label="このツールを使い始める">
        <Stack gap={3}>
          {releaseId === null ? (
            <p style={{ margin: 0 }}>
              公開されている版がまだないため、追加できません。公開されるとここに導線が出ます。
            </p>
          ) : (
            <div>
              <Button type="button" onClick={() => void handleInstall()} disabled={pending || degraded}>
                {pending ? '取得しています…' : '自分の環境に追加する'}
              </Button>
            </div>
          )}

          {degraded ? <p style={{ margin: 0 }}>Hub が応答していないため、新しい導入情報は取得できません。</p> : null}

          {failure === null ? null : (
            <Alert tone="warning" title="導入情報を取得できませんでした" description={failure.message} />
          )}

          {descriptor !== null && canCopy ? (
            <div aria-live="polite">
              <DefinitionList
                label={`${descriptor.label} の導入情報`}
                items={[
                  ...descriptorItems,
                  ...(descriptor.expires_at === null
                    ? []
                    : [
                        {
                          term: '有効期限',
                          description: descriptor.expires_at,
                          hint: '期限を過ぎたら、もう一度「自分の環境に追加する」を押してください。',
                        },
                      ]),
                ]}
              />
            </div>
          ) : null}
        </Stack>
      </section>
    </Panel>
  );
}
