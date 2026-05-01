import { MappingMode, KeyType, ScaleType } from './mapping';
import { NoteEvent } from './audio';
import type { ISODateString } from './api';

/**
 * A complete musical composition generated from an image.
 */
export interface Composition {
  /** Persisted data schema version. */
  schemaVersion?: 1;
  /** Unique composition identifier. */
  id: string;
  /** User ID of the creator. */
  userId: string;
  /** Composition title. */
  title: string;
  /** Optional description or notes. */
  description?: string;
  /** Array of all note events in this composition. */
  noteEvents: NoteEvent[];
  /** Mapping mode used to generate this composition. */
  mappingMode: MappingMode;
  /** Musical key. */
  key: KeyType;
  /** Musical scale. */
  scale: ScaleType;
  /** Sound preset used. */
  presetId?: string;
  /** Tempo in BPM (beats per minute). */
  tempo?: number;
  /** Optional: Base64-encoded thumbnail of source image. */
  imageThumbnail?: string;
  /** Optional: Full image data URL (may be large). */
  imageData?: string;
  /** Creation timestamp. */
  createdAt: Date | ISODateString;
  /** Last update timestamp. */
  updatedAt: Date | ISODateString;
  /** Optional: Additional metadata. */
  metadata?: {
    /** Source image width. */
    imageWidth?: number;
    /** Source image height. */
    imageHeight?: number;
    /** Number of generated notes. */
    noteCount?: number;
    /** Duration in seconds. */
    duration?: number;
    /** User-defined tags. */
    tags?: string[];
  };
}

/**
 * DTO for creating a new composition (excludes generated fields).
 */
export type CreateCompositionDTO = Omit<Composition, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * DTO for updating an existing composition.
 */
export type UpdateCompositionDTO = Partial<
  Omit<Composition, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Composition DTO returned by the JSON API. Dates are always ISO strings on the wire.
 */
export interface CompositionResponseDTO extends Omit<Composition, 'createdAt' | 'updatedAt'> {
  createdAt: ISODateString;
  updatedAt: ISODateString;
  schemaVersion: 1;
}
