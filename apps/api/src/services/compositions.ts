import type {
  CompositionResponseDTO,
  CreateCompositionDTO,
  UpdateCompositionDTO,
  CompositionPayloadDTO,
} from '@toposonics/types';
import { compositionPayloadSchema, compositionResponseSchema } from '@toposonics/types';
import { supabaseAdmin } from '../supabase';

interface CompositionRow {
  id: string;
  user_id: string;
  name?: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at?: string | null;
}

export class CompositionDataValidationError extends Error {
  constructor(
    message: string,
    public readonly compositionId: string,
    public readonly details: unknown
  ) {
    super(message);
    this.name = 'CompositionDataValidationError';
  }
}

function toIsoDate(value: string | Date | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function stripProtectedFields(value: Record<string, unknown>): Record<string, unknown> {
  const { id, userId, createdAt, updatedAt, ...payload } = value;
  void id;
  void userId;
  void createdAt;
  void updatedAt;
  return payload;
}

function parsePayload(row: CompositionRow): CompositionPayloadDTO {
  const rawPayload = row.data && typeof row.data === 'object' ? stripProtectedFields(row.data) : {};
  const result = compositionPayloadSchema.safeParse({
    schemaVersion: 1,
    title: row.name || undefined,
    ...rawPayload,
  });

  if (!result.success) {
    throw new CompositionDataValidationError(
      `Stored composition ${row.id} failed schema validation`,
      row.id,
      result.error.flatten()
    );
  }

  return result.data;
}

function toPersistedPayload(payload: unknown): CompositionPayloadDTO {
  return compositionPayloadSchema.parse(payload);
}

function mapRowToComposition(row: CompositionRow): CompositionResponseDTO {
  const payload = parsePayload(row);
  const createdAt = toIsoDate(row.created_at, new Date(0).toISOString());
  const updatedAt = toIsoDate(row.updated_at, createdAt);

  const composition = {
    ...payload,
    id: row.id,
    userId: row.user_id,
    title: payload.title || row.name || 'Untitled',
    createdAt,
    updatedAt,
  };

  const result = compositionResponseSchema.safeParse(composition);
  if (!result.success) {
    throw new CompositionDataValidationError(
      `Stored composition ${row.id} could not be converted to an API DTO`,
      row.id,
      result.error.flatten()
    );
  }

  return result.data;
}

export async function listCompositions(userId: string): Promise<CompositionResponseDTO[]> {
  const query = supabaseAdmin
    .from('compositions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const compositions: CompositionResponseDTO[] = [];
  for (const row of data as CompositionRow[]) {
    try {
      compositions.push(mapRowToComposition(row));
    } catch (error) {
      if (!(error instanceof CompositionDataValidationError)) {
        throw error;
      }
    }
  }
  return compositions;
}

export async function getCompositionById(
  userId: string,
  id: string
): Promise<CompositionResponseDTO | null> {
  const { data, error } = await supabaseAdmin
    .from('compositions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return mapRowToComposition(data as CompositionRow);
}

export async function createComposition(
  userId: string,
  payload: Omit<CreateCompositionDTO, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<CompositionResponseDTO> {
  const compositionPayload = toPersistedPayload({
    ...payload,
    schemaVersion: payload.schemaVersion ?? 1,
  });

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
  userId: string,
  id: string,
  updates: UpdateCompositionDTO
): Promise<CompositionResponseDTO | null> {
  const existing = await getCompositionById(userId, id);
  if (!existing) return null;

  const merged = toPersistedPayload({
    ...stripProtectedFields(existing as unknown as Record<string, unknown>),
    ...updates,
    schemaVersion: 1,
  });
  const updatedAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('compositions')
    .update({
      name: merged.title,
      data: merged,
      updated_at: updatedAt,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return mapRowToComposition(data as CompositionRow);
}

export async function deleteComposition(userId: string, id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('compositions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return false;
    throw error;
  }
  return true;
}
