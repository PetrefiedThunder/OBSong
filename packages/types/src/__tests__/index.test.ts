import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  ApiResponse,
  ApiErrorResponse,
  NoteEvent,
  Composition,
  CompositionSummary,
  CreateCompositionDTO,
  UpdateCompositionDTO,
  ImageAnalysisResult,
  MappingMode,
  VoiceType,
  ScaleType,
  KeyType,
  DepthSource,
  DepthUnit,
  User,
} from '../index';

/**
 * These are type-level contract tests: the package ships only types, so "behavior" is
 * the shape of the public API. Type assertions fail compilation (and thus the suite)
 * if a contract changes shape; the few runtime assertions pin literal unions.
 */
describe('@toposonics/types public contracts', () => {
  it('exports a barrel with the documented type surface', async () => {
    const mod = await import('../index');
    // Type-only package: the barrel compiles and resolves without runtime exports.
    expect(mod).toBeDefined();
  });

  it('keeps ApiResponse/ApiErrorResponse discriminated by `success`', () => {
    const ok: ApiResponse<{ id: string }> = { success: true, data: { id: 'c1' } };
    const err: ApiErrorResponse = {
      success: false,
      error: { code: 'NOT_FOUND', message: 'missing' },
    };
    expect(ok.success).toBe(true);
    expect(err.success).toBe(false);
    expectTypeOf(ok.data).toEqualTypeOf<{ id: string }>();
    expectTypeOf(err.error.code).toBeString();
  });

  it('keeps MappingMode limited to the three shipped modes', () => {
    const modes: MappingMode[] = ['LINEAR_LANDSCAPE', 'DEPTH_RIDGE', 'MULTI_VOICE'];
    expect(modes).toHaveLength(3);
    // @ts-expect-error - modes outside the shipped set must not type-check
    const invalid: MappingMode = 'RANDOM_WALK';
    void invalid;
  });

  it('keeps VoiceType limited to the four multi-voice layers', () => {
    const voices: VoiceType[] = ['bass', 'melody', 'pad', 'fx'];
    expect(voices).toHaveLength(4);
    // @ts-expect-error - unknown voice names must not type-check
    const invalid: VoiceType = 'soprano';
    void invalid;
  });

  it('keeps the 12-tone KeyType union intact', () => {
    const keys: KeyType[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    expect(keys).toHaveLength(12);
  });

  it('accepts all documented ScaleType values', () => {
    const scales: ScaleType[] = [
      'C_MAJOR',
      'C_MINOR',
      'D_MAJOR',
      'E_MINOR',
      'A_MINOR',
      'A_SHARP_MINOR',
      'G_MAJOR',
      'C_PENTATONIC',
      'A_MINOR_PENTATONIC',
      'C_BLUES',
      'D_DORIAN',
      'A_DORIAN',
      'C_MIXOLYDIAN',
      'E_PHRYGIAN',
      'A_HARMONIC_MINOR',
      'C_LYDIAN',
      'C_WHOLE_TONE',
    ];
    expect(scales).toHaveLength(17);
  });

  it('keeps DepthSource/DepthUnit literal unions stable', () => {
    const sources: DepthSource[] = ['ARCORE_DEPTH_API', 'TOF_SENSOR', 'SIMULATED', 'HEURISTIC', 'UNKNOWN'];
    const units: DepthUnit[] = ['meters', 'millimeters', 'normalized', 'unknown'];
    expect(sources).toHaveLength(5);
    expect(units).toHaveLength(4);
  });

  it('types a well-formed NoteEvent and Composition', () => {
    const note: NoteEvent = { note: 'C4', start: 0, duration: 0.5, velocity: 0.8 };
    const composition: Composition = {
      id: 'c1',
      userId: 'u1',
      title: 'Study',
      noteEvents: [note],
      mappingMode: 'LINEAR_LANDSCAPE',
      key: 'C',
      scale: 'C_MAJOR',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    expect(composition.noteEvents).toHaveLength(1);
    expectTypeOf(composition.mappingMode).toEqualTypeOf<MappingMode>();

    const dto: CreateCompositionDTO = {
      userId: 'u1',
      title: 'Study',
      noteEvents: [note],
      mappingMode: 'DEPTH_RIDGE',
      key: 'A',
      scale: 'A_MINOR',
    };
    // CreateCompositionDTO must not carry server-owned fields.
    expectTypeOf(dto).not.toHaveProperty('id');
    expectTypeOf(dto).not.toHaveProperty('createdAt');

    const patch: UpdateCompositionDTO = { title: 'Renamed' };
    expectTypeOf(patch).toMatchTypeOf<Partial<CreateCompositionDTO>>();
    void patch;
  });

  it('keeps CompositionSummary free of heavy fields', () => {
    expectTypeOf<CompositionSummary>().not.toHaveProperty('noteEvents');
    expectTypeOf<CompositionSummary>().not.toHaveProperty('imageData');
    expectTypeOf<CompositionSummary>().toHaveProperty('id');
    expectTypeOf<CompositionSummary>().toHaveProperty('userId');
    expectTypeOf<CompositionSummary>().toHaveProperty('title');
  });

  it('types an ImageAnalysisResult with the required profiles', () => {
    const analysis: ImageAnalysisResult = {
      width: 4,
      height: 4,
      brightnessProfile: [0, 128, 200, 255],
      ridgeStrength: [0, 0.5, 0.75, 1],
      metadata: { depthSource: 'SIMULATED', depthUnit: 'normalized' },
    };
    expect(analysis.brightnessProfile).toHaveLength(4);
    expectTypeOf(analysis.brightnessProfile).toEqualTypeOf<number[]>();
  });

  it('types the User stub contract', () => {
    const user: User = { id: 'u1', email: 'dev@toposonics.com', createdAt: new Date(0) };
    expect(user.email).toContain('@');
    expectTypeOf(user.displayName).toEqualTypeOf<string | undefined>();
  });
});
