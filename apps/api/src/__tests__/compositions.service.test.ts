import { describe, it, expect } from 'vitest';
import { listCompositions } from '../services/compositions';

// supabase.ts is importable here because vitest.config.ts supplies dummy Supabase env;
// no network call is made — the guard below runs before any query is built.
describe('listCompositions fail-closed (#92)', () => {
  it('throws instead of returning all rows when called without a userId', async () => {
    await expect(listCompositions('' as unknown as string)).rejects.toThrow(/userId/i);
    // @ts-expect-error exercising the runtime guard with a missing argument
    await expect(listCompositions(undefined)).rejects.toThrow(/userId/i);
  });
});
