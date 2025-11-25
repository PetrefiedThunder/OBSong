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

export async function listCompositions(userId?: string): Promise<Composition[]> {
  let query = supabaseAdmin.from('compositions').select('*').order('created_at', { ascending: false });
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data as CompositionRow[]).map(mapRowToComposition);
}

export async function getCompositionById(id: string): Promise<Composition | null> {
  const { data, error } = await supabaseAdmin.from('compositions').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
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
    ...payload,
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
  updates: UpdateCompositionDTO
): Promise<Composition | null> {
  const existing = await getCompositionById(id);
  if (!existing) return null;

  const merged: Composition = {
    ...existing,
    ...updates,
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
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapRowToComposition(data as CompositionRow);
}

export async function deleteComposition(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('compositions').delete().eq('id', id);
  if (error) {
    throw error;
  }
  return true;
}
