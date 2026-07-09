import type { Composition, CreateCompositionDTO, UpdateCompositionDTO } from '@toposonics/types';
import { supabaseAdmin } from '../supabase';

interface CompositionRow {
  id: string;
  user_id: string;
  name?: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at?: string | null;
}

// Explicit allowlist of client-writable composition fields. Everything else (id, userId,
// createdAt, updatedAt, and any unknown keys) is derived server-side, never taken from the
// request body — this prevents mass assignment into the stored JSONB blob.
const WRITABLE_FIELDS = [
  'title',
  'description',
  'noteEvents',
  'mappingMode',
  'key',
  'scale',
  'presetId',
  'tempo',
  'imageThumbnail',
  'imageData',
  'metadata',
] as const;

function pickWritableFields(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (input[field] !== undefined) {
      out[field] = input[field];
    }
  }
  return out;
}

function mapRowToComposition(row: CompositionRow): Composition {
  const payload = row.data as unknown as Composition;
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  const updatedAt = row.updated_at ? new Date(row.updated_at) : payload.updatedAt ? new Date(payload.updatedAt) : createdAt;

  return {
    ...payload,
    id: row.id,
    userId: row.user_id,
    title: payload.title || row.name || 'Untitled',
    createdAt,
    updatedAt,
  };
}

export async function listCompositions(userId: string): Promise<Composition[]> {
  // Fail closed: never list the whole table. All access is via the service-role client,
  // which bypasses RLS, so this filter is the only tenant isolation.
  if (!userId) {
    throw new Error('listCompositions requires a userId');
  }
  const { data, error } = await supabaseAdmin
    .from('compositions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data as CompositionRow[]).map(mapRowToComposition);
}

export async function getCompositionById(id: string): Promise<Composition | null> {
  const { data, error } = await supabaseAdmin.from('compositions').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    // A malformed (non-UUID) id raises Postgres 22P02; treat it as "not found" rather than
    // surfacing a 500 with internal SQL details.
    if (error.code === '22P02') return null;
    throw error;
  }
  return mapRowToComposition(data as CompositionRow);
}

export async function createComposition(
  userId: string,
  payload: Omit<CreateCompositionDTO, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<Composition> {
  const now = new Date();
  const compositionPayload: Composition = {
    ...pickWritableFields(payload as unknown as Record<string, unknown>),
    id: '',
    userId,
    createdAt: now,
    updatedAt: now,
  } as Composition;

  const { data, error } = await supabaseAdmin
    .from('compositions')
    .insert({
      user_id: userId,
      name: payload.title,
      data: compositionPayload,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapRowToComposition(data as CompositionRow);
}

export async function updateComposition(
  id: string,
  userId: string,
  updates: UpdateCompositionDTO
): Promise<Composition | null> {
  const existing = await getCompositionById(id);
  // Scope by owner so the mutating query is defended in depth (not only by the route's
  // read-then-check), closing the TOCTOU gap. NOTE: this still writes the whole data blob
  // (last-write-wins across the object); a partial/JSONB merge is a follow-up.
  if (!existing || existing.userId !== userId) return null;

  const merged: Composition = {
    ...existing,
    ...pickWritableFields(updates as unknown as Record<string, unknown>),
    id: existing.id,
    userId: existing.userId,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };

  const { data, error } = await supabaseAdmin
    .from('compositions')
    .update({
      name: merged.title,
      data: merged,
      updated_at: merged.updatedAt.toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.code === '22P02') return null;
    throw error;
  }

  return mapRowToComposition(data as CompositionRow);
}

export async function deleteComposition(id: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('compositions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');
  if (error) {
    if (error.code === '22P02') return false;
    throw error;
  }
  // Returns the deleted rows; empty means nothing matched (missing or not owned).
  return Array.isArray(data) && data.length > 0;
}
