'use client';

// next/dynamic から package namespace 全体を読むと UI barrel の全 client component が
// client-reference manifest に入るため、必要な named export だけを通す遅延境界にする。
export { MarkdownEditor as DocsMarkdownEditor } from '@harness-hub/ui';
