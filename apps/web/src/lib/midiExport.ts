import { compositionToMidiBlob } from '@toposonics/core-audio';
import type { Composition, KeyType, MappingMode, NoteEvent, ScaleType } from '@toposonics/types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'composition';
}

interface ExportCompositionInput {
  noteEvents: NoteEvent[];
  tempoBpm: number;
  title?: string;
  description?: string;
  mappingMode: MappingMode;
  key: KeyType;
  scale: ScaleType;
  presetId?: string;
  userId?: string;
  metadata?: Composition['metadata'];
}

function buildComposition(input: ExportCompositionInput): Composition {
  const now = new Date();

  return {
    id: `local-export-${now.getTime()}`,
    userId: input.userId || 'local-user',
    title: input.title?.trim() || 'TopoSonics Composition',
    description: input.description,
    noteEvents: input.noteEvents,
    mappingMode: input.mappingMode,
    key: input.key,
    scale: input.scale,
    presetId: input.presetId,
    tempo: input.tempoBpm,
    createdAt: now,
    updatedAt: now,
    metadata: {
      noteCount: input.noteEvents.length,
      ...input.metadata,
    },
  };
}

export function exportCompositionToMidi(input: ExportCompositionInput) {
  if (!input.noteEvents.length) {
    throw new Error('No notes to export');
  }

  const composition = buildComposition(input);
  const blob = compositionToMidiBlob(composition, input.tempoBpm);
  const filename = `${sanitizeFilename(composition.title)}.mid`;

  downloadBlob(blob, filename);
}
