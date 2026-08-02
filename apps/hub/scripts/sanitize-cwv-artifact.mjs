#!/usr/bin/env node
// Lighthouse artifact から bootstrap ticket を除去してから upload する。

import { readFileSync, writeFileSync } from 'node:fs';

export function sanitizeCwvArtifact(value, ticket) {
  if (Array.isArray(value)) return value.map((item) => sanitizeCwvArtifact(item, ticket));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeCwvArtifact(item, ticket)]));
  }
  if (typeof value !== 'string') return value;

  const withoutTicketQuery = value.replaceAll(ticket, '[redacted]');
  try {
    const url = new URL(withoutTicketQuery);
    if (url.searchParams.has('__cwv_probe')) {
      url.searchParams.delete('__cwv_probe');
      return url.toString();
    }
  } catch {
    // URL ではない文字列にも ticket が混ざる可能性があるため、上の literal 除去だけは必ず行う。
  }
  return withoutTicketQuery;
}

export function containsTicket(value, ticket) {
  if (typeof value === 'string') return value.includes(ticket);
  if (Array.isArray(value)) return value.some((item) => containsTicket(item, ticket));
  if (value !== null && typeof value === 'object')
    return Object.values(value).some((item) => containsTicket(item, ticket));
  return false;
}

function main() {
  const [inputPath, ticket] = process.argv.slice(2);
  if (inputPath === undefined || ticket === undefined || process.argv.length !== 4) {
    throw new Error('使用法: sanitize-cwv-artifact.mjs <lighthouse.json> <ticket>');
  }
  const parsed = JSON.parse(readFileSync(inputPath, 'utf8'));
  const sanitized = sanitizeCwvArtifact(parsed, ticket);
  if (containsTicket(sanitized, ticket)) throw new Error('CWV artifact から ticket を除去できませんでした');
  writeFileSync(inputPath, `${JSON.stringify(sanitized, null, 2)}\n`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) main();
