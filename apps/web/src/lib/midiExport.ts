import { noteEventsToMidiBlob } from '@toposonics/core-audio';
import type { NoteEvent } from '@toposonics/types';

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

export function exportNoteEventsToMidi(noteEvents: NoteEvent[], tempoBpm: number, name?: string) {
  if (!noteEvents.length) {
    throw new Error('No notes to export');
  }

  const blob = noteEventsToMidiBlob(noteEvents, tempoBpm, name);
  const filename = `${sanitizeFilename(name || 'composition')}.mid`;

  downloadBlob(blob, filename);
}
