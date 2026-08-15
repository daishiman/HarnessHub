import { describe, expect, it } from 'vitest';

import {
  canonicalPayloadHash,
  entityEtag,
  parseEntityIfMatch,
  parseIdempotencyKey,
} from '../../src/lib/http/mutation-safety';

describe('CARD-MUTATION-HTTP: POST/PATCH preconditions', () => {
  it('hashes semantically identical JSON payloads to the same canonical hash', async () => {
    await expect(canonicalPayloadHash({ title: 'A', nested: { b: 2, a: 1 } })).resolves.toBe(
      await canonicalPayloadHash({ nested: { a: 1, b: 2 }, title: 'A' }),
    );
  });

  it('accepts only UUID v4 idempotency keys and entity-revision If-Match values', () => {
    expect(parseIdempotencyKey('123e4567-e89b-42d3-a456-426614174000')).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(() => parseIdempotencyKey(null)).toThrow(/Idempotency-Key/);
    expect(() => parseIdempotencyKey('not-a-uuid')).toThrow(/Idempotency-Key/);

    expect(entityEtag('docs', 7)).toBe('"docs-7"');
    expect(parseEntityIfMatch('"docs-7"', 'docs')).toBe(7);
    expect(() => parseEntityIfMatch(null, 'docs')).toThrow(expect.objectContaining({ status: 428 }));
    expect(() => parseEntityIfMatch('"docs-import-7"', 'docs')).toThrow(/If-Match/);
    expect(() => parseEntityIfMatch('"sheets-7"', 'docs')).toThrow(/If-Match/);
  });
});
