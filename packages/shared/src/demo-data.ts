import type { NoteEvent } from '@toposonics/types';

/**
 * Content for the interactive onboarding tour on the web landing page.
 */

/** Tempo used when the tour plays the sample notes below. */
export const tourDemoTempoBpm = 90;

// A short multi-voice phrase the tour plays during the "From Data to Music" step.
export const mockNoteEvents: NoteEvent[] = [
  { note: 'D3', start: 0, duration: 2, velocity: 0.7, trackId: 'bass' },
  { note: 'A4', start: 1, duration: 1, velocity: 0.9, effects: { reverbSend: 0.8 }, trackId: 'melody' },
  { note: 'C5', start: 1.5, duration: 0.5, velocity: 1.0, effects: { reverbSend: 0.6 }, trackId: 'melody' },
  { note: 'E4', start: 2.5, duration: 1, velocity: 0.8, effects: { reverbSend: 0.9 }, trackId: 'melody' },
  { note: 'F4', start: 3, duration: 2, velocity: 0.6, trackId: 'pad' },
  { note: 'A3', start: 4, duration: 2, velocity: 0.7, trackId: 'bass' },
];

export interface TourStep {
  title: string;
  content: string;
  /** Side effect the tour runs when this step becomes active. */
  action?: 'PLAY_MUSIC';
}

// The content for each step of the guided tour. Steps only promise what the tour
// actually delivers: PLAY_MUSIC audibly plays mockNoteEvents while its step is open.
export const tourSteps: TourStep[] = [
  {
    title: 'Welcome to TopoSonics',
    content:
      'This is a tool for turning images into music. This quick tour will walk you through the core concepts and show you what’s possible.',
  },
  {
    title: 'The Image Analysis Pipeline',
    content:
      'Everything starts with image analysis. When you upload a photo in the Studio, TopoSonics inspects its pixel data to extract musical features — not just brightness, but edges, textures, and depth.',
  },
  {
    title: 'Mapping Modes: The Creative Core',
    content:
      'Once analyzed, the data is sent to a Mapping Mode. Each mode interprets the analysis differently to create a unique musical result. Multi-Voice, for example, creates a full soundscape with bass, melody, and pads.',
  },
  {
    title: 'From Data to Music',
    content:
      'The mapping process generates a sequence of standard musical notes. Here is a short example phrase — it should be playing right now.',
    action: 'PLAY_MUSIC',
  },
  {
    title: 'Ready for Your Workflow',
    content:
      'TopoSonics is designed to be the start of your creative process. Export your generation as MIDI and seamlessly integrate it with Ableton Live, Logic Pro, or any other music software.',
  },
];
