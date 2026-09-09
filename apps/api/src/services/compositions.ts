import type {
  Composition,
  CompositionSummary,
  CreateCompositionDTO,
  UpdateCompositionDTO,
} from '@toposonics/types';
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

// PostgREST JSON projection for list views: pulls only the scalar fields out of the `data`
// JSONB column so the heavy blobs (noteEvents, imageData) never leave the database.
// ->> extracts as text, -> keeps JSON (tempo stays numeric, metadata stays an object).
const SUMMARY_SELECT =
  'id, user_id, name, created_at, updated_at, ' +
  'title:data->>title, description:data->>description, mappingMode:data->>mappingMode, ' +
  'key:data->>key, scale:data->>scale, presetId:data->>presetId, tempo:data->tempo, ' +
  'imageThumbnail:data->>imageThumbnail, metadata:data->metadata';

interface CompositionSummaryRow {
  id: string;
  user_id: string;
  name?: string | null;
  created_at: string;
  updated_at?: string | null;
  title: string | null;
  description: string | null;
  mappingMode: string | null;
  key: string | null;
  scale: string | null;
  presetId: string | null;
  // data->tempo is JSON so numbers round-trip as numbers, but coerce defensively below.
  tempo: number | string | null;
  imageThumbnail: string | null;
  metadata: Composition['metadata'] | null;
}

function mapRowToCompositionSummary(row: CompositionSummaryRow): CompositionSummary {
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  const updatedAt = row.updated_at ? new Date(row.updated_at) : createdAt;

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || row.name || 'Untitled',
    description: row.description ?? undefined,
    mappingMode: row.mappingMode as CompositionSummary['mappingMode'],
    key: row.key as CompositionSummary['key'],
    scale: row.scale as CompositionSummary['scale'],
    presetId: row.presetId ?? undefined,
    tempo: row.tempo == null ? undefined : Number(row.tempo),
    imageThumbnail: row.imageThumbnail ?? undefined,
    // Old rows were saved before metadata.noteCount existed; leave those undefined.
    noteCount: row.metadata?.noteCount,
    createdAt,
    updatedAt,
  };
}

export interface ListCompositionsOptions {
  /** Page size (rows to return). */
  limit?: number;
  /** Rows to skip before the page (offset pagination; ignored when cursor is set). */
  offset?: number;
  /**
   * Opaque cursor from a previous page's `nextCursor` (base64url of `<isoCreatedAt>|<id>`).
   * When present, results are keyset-paginated by the stable (created_at DESC, id DESC)
   * ordering and offset is ignored.
   */
  cursor?: string;
}

export interface ListCompositionsResult {
  compositions: CompositionSummary[];
  /** Cursor to pass for the next page; undefined on the last page. */
  nextCursor?: string;
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, 'utf8').toString('base64url');
}

/** Returns null for a malformed cursor so the route can answer 400 instead of 500. */
function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const sep = decoded.lastIndexOf('|');
  if (sep <= 0) return null;
  const createdAt = decoded.slice(0, sep);
  const id = decoded.slice(sep + 1);
  // created_at must round-trip as a real timestamp; id must be a UUID.
  if (Number.isNaN(new Date(createdAt).getTime())) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return { createdAt, id };
}

export async function listCompositions(
  userId: string,
  options: ListCompositionsOptions = {}
): Promise<ListCompositionsResult> {
  // Fail closed: never list the whole table. All access is via the service-role client,
  // which bypasses RLS, so this filter is the only tenant isolation.
  if (!userId) {
    throw new Error('listCompositions requires a userId');
  }
  const limit = options.limit ?? 50;
  const cursor = options.cursor ? decodeCursor(options.cursor) : null;
  if (options.cursor && !cursor) {
    throw new Error('Invalid cursor');
  }

  let query = supabaseAdmin
    .from('compositions')
    .select(SUMMARY_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (cursor) {
    // Keyset filter for (created_at, id) DESC: rows strictly after the cursor position.
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
    // One extra row tells us whether another page exists.
    query = query.range(0, limit);
  } else {
    const offset = options.offset ?? 0;
    query = query.range(offset, offset + limit);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  const rows = data as unknown as CompositionSummaryRow[];
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);

  // With an explicit offset (no cursor) the client drives paging, so nextCursor is only
  // emitted when this page provably isn't the last one. In cursor mode it is undefined on
  // the final page, which is the termination signal.
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(last.created_at, last.id) : undefined;

  return {
    compositions: pageRows.map(mapRowToCompositionSummary),
    nextCursor,
  };
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
