import type { ImageAnalysisResult, NoteEvent } from '@toposonics/types';

/**
 * Mock data and content for the interactive onboarding tour.
 */

// A sample ImageAnalysisResult that simulates the analysis of a mountain landscape.
export const mockAnalysisResult: ImageAnalysisResult = {
  width: 800,
  height: 600,
  brightnessProfile: [20, 30, 80, 150, 200, 210, 205, 180, 150, 120, 90, 60],
  ridgeStrength: [0.1, 0.1, 0.2, 0.8, 0.9, 0.3, 0.1, 0.2, 0.7, 0.4, 0.1, 0.1],
  depthProfile: [0.9, 0.8, 0.7, 0.5, 0.4, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.0],
  horizonProfile: [0.4, 0.4, 0.45, 0.5, 0.55, 0.6, 0.55, 0.5, 0.45, 0.4, 0.4, 0.4],
  textureProfile: [0.2, 0.2, 0.3, 0.5, 0.4, 0.3, 0.3, 0.4, 0.6, 0.5, 0.3, 0.2],
};

// A sample NoteEvent array generated from the mock analysis.
export const mockNoteEvents: NoteEvent[] = [
  { note: 'D3', start: 0, duration: 2, velocity: 0.7, trackId: 'bass' },
  { note: 'A4', start: 1, duration: 1, velocity: 0.9, effects: { reverbSend: 0.8 }, trackId: 'melody' },
  { note: 'C5', start: 1.5, duration: 0.5, velocity: 1.0, effects: { reverbSend: 0.6 }, trackId: 'melody' },
  { note: 'E4', start: 2.5, duration: 1, velocity: 0.8, effects: { reverbSend: 0.9 }, trackId: 'melody' },
  { note: 'F4', start: 3, duration: 2, velocity: 0.6, trackId: 'pad' },
  { note: 'A3', start: 4, duration: 2, velocity: 0.7, trackId: 'bass' },
];

// The content for each step of the guided tour.
export const tourSteps = [
  {
    targetId: '#logo',
    title: 'Welcome to TopoSonics',
    content: 'This is a tool for turning images into music. This quick tour will walk you through the core concepts and show you what’s possible. No other tool on the market offers this level of creative, generative control directly from visual data.',
  },
  {
    targetId: '#image-analysis-panel', // Assumes a panel with this ID exists
    title: 'The Image Analysis Pipeline',
    content: `Everything starts with image analysis. TopoSonics inspects the pixel data of an image to extract musical features. We don\'t just look at brightness; we analyze edges, textures, and depth to create a rich dataset. Let\'s run our demo image through the engine.`,
    action: 'RUN_ANALYSIS',
  },
  {
    targetId: '#mapping-mode-selector', // Assumes a selector with this ID
    title: 'Mapping Modes: The Creative Core',
    content: `Once analyzed, the data is sent to a **Mapping Mode**. This is where the magic happens. Each mode interprets the analysis data differently to create a unique musical result. The \'MULTI_VOICE\' mode, for example, creates a full soundscape with bass, melody, and pads.`,
  },
  {
    targetId: '#playback-controls', // Assumes playback controls with this ID
    title: 'From Data to Music',
    content: 'The mapping process generates a sequence of standard musical notes. Now you can play it, tweak it, or export it as a MIDI file to use in any professional Digital Audio Workstation (DAW). Hear what our demo image sounds like!',
    action: 'PLAY_MUSIC',
  },
  {
    targetId: '#export-button',
    title: 'Ready for Your Workflow',
    content: 'TopoSonics is designed to be the start of your creative process. Export your generation as MIDI and seamlessly integrate it with Ableton Live, Logic Pro, or any other music software.',
  },
];
