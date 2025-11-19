/**
 * Generate demo compositions for each Scene Pack
 *
 * This script:
 * 1. Loads sample images for each scene pack (from public/demo/)
 * 2. Analyzes them using core-image
 * 3. Generates compositions using the associated TopoPreset
 * 4. Saves the compositions as JSON in public/demo/compositions/
 *
 * Usage:
 *   pnpm tsx scripts/generateSceneDemos.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getAllScenePacks,
  getAllTopoPresets,
  getScenePreset,
  mapImageToMultiVoiceComposition,
  type ScenePack,
  type TopoPreset,
  type NoteEvent,
} from '@toposonics/core-audio';

// TODO: For full implementation, you would:
// 1. Use node-canvas or similar to load images
// 2. Extract pixel data
// 3. Use analyzeImageForMultiVoice from core-image
// For now, we'll create stub compositions with the correct structure

interface DemoComposition {
  scenePackId: string;
  presetId: string;
  key: string;
  scale: string;
  tempoBpm: number;
  noteEvents: NoteEvent[];
  createdAt: string;
}

function generateStubComposition(
  scenePack: ScenePack,
  preset: TopoPreset
): DemoComposition {
  // Create a stub composition with a few example notes
  // In a real implementation, this would come from image analysis
  const stubNotes: NoteEvent[] = [
    // Bass voice
    {
      note: `${preset.defaultKey}2`,
      start: 0,
      duration: 3,
      velocity: 0.6,
      trackId: 'bass',
      effects: { reverbSend: 0.4 },
    },
    // Melody voice
    {
      note: `${preset.defaultKey}4`,
      start: 0.75,
      duration: 0.75,
      velocity: 0.7,
      pan: -0.3,
      trackId: 'melody',
      effects: { reverbSend: 0.6 },
    },
    // Pad voice
    {
      note: `${preset.defaultKey}3`,
      start: 0,
      duration: 6,
      velocity: 0.5,
      trackId: 'pad',
      effects: { reverbSend: 0.8 },
    },
  ];

  return {
    scenePackId: scenePack.id,
    presetId: preset.id,
    key: preset.defaultKey,
    scale: preset.defaultScale,
    tempoBpm: preset.defaultTempoBpm,
    noteEvents: stubNotes,
    createdAt: new Date().toISOString(),
  };
}

async function main() {
  console.log('🎵 Generating Scene Pack demo compositions...\n');

  const scenePacks = getAllScenePacks();
  const allPresets = getAllTopoPresets();

  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), 'public', 'demo', 'compositions');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Created directory: ${outputDir}\n`);
  }

  for (const scenePack of scenePacks) {
    const preset = getScenePreset(scenePack, allPresets);

    if (!preset) {
      console.log(`⚠️  No preset found for scene pack: ${scenePack.id}`);
      continue;
    }

    console.log(`🎨 ${scenePack.name}`);
    console.log(`   Preset: ${preset.name}`);
    console.log(`   Key: ${preset.defaultKey} ${preset.defaultScale}`);
    console.log(`   Tempo: ${preset.defaultTempoBpm} BPM`);

    // TODO: Load actual image and analyze
    // For now, generate stub composition
    const composition = generateStubComposition(scenePack, preset);

    // Save to JSON
    const outputPath = path.join(outputDir, `${scenePack.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(composition, null, 2), 'utf-8');

    console.log(`   ✅ Saved to: ${outputPath}`);
    console.log(`   Notes: ${composition.noteEvents.length}\n`);
  }

  console.log('✅ Demo generation complete!\n');
  console.log('📝 Note: These are stub compositions.');
  console.log('   To generate from real images:');
  console.log('   1. Place images in public/demo/ (e.g., scene-majestic-mountains.jpg)');
  console.log('   2. Uncomment image loading code in this script');
  console.log('   3. Use analyzeImageForMultiVoice + mapImageToMultiVoiceComposition\n');
}

main().catch((error) => {
  console.error('Error generating demos:', error);
  process.exit(1);
});
