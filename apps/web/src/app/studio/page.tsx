'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card } from '@toposonics/ui';
import type {
  KeyType,
  ScaleType,
  MappingMode,
  NoteEvent,
  ImageAnalysisResult,
} from '@toposonics/types';
import {
  mapLinearLandscape,
  mapImageToMultiVoiceComposition,
  getPresetById,
  getDefaultPreset,
  getAllTopoPresets,
  getScenePreset,
  getAllScenePacks,
  type TopoPreset,
  type ScenePack,
} from '@toposonics/core-audio';
import { analyzeImageFile, analyzeImageFileMultiVoice } from '@/lib/imageProcessing';
import { createComposition } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToneEngine } from '@/hooks/useToneEngine';
import { ImageUploader } from '@/components/ImageUploader';
import { MappingControls } from '@/components/MappingControls';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TimelineVisualizer } from '@/components/TimelineVisualizer';
import { ScenePackSelector } from '@/components/ScenePackSelector';
import { exportCompositionToMidi } from '@/lib/midiExport';

export default function StudioPage() {
  const { user, token, login } = useAuth();
  const searchParams = useSearchParams();

  // State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Image analysis result
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null);

  // Musical parameters
  const [key, setKey] = useState<KeyType>('C');
  const [scale, setScale] = useState<ScaleType>('C_MAJOR');
  const [mappingMode, setMappingMode] = useState<MappingMode>('LINEAR_LANDSCAPE');
  const [presetId, setPresetId] = useState('sine-soft');
  const [tempo, setTempo] = useState(90);

  // TopoPreset state
  const [selectedTopoPreset, setSelectedTopoPreset] = useState<TopoPreset | null>(null);

  // ScenePack state
  const [selectedScenePack, setSelectedScenePack] = useState<ScenePack | null>(null);

  // Generated composition
  const [noteEvents, setNoteEvents] = useState<NoteEvent[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Tone.js engine
  const preset = getPresetById(presetId) || getDefaultPreset();
  const { play, stop, isPlaying, isLoading: audioLoading, currentTime } = useToneEngine({
    noteEvents,
    tempo,
    preset,
  });

  const compositionDurationBeats = useMemo(() => {
    if (!noteEvents.length) return 0;
    return noteEvents.reduce((max, event) => Math.max(max, event.start + event.duration), 0);
  }, [noteEvents]);

  const compositionDurationSeconds = useMemo(
    () => compositionDurationBeats * (60 / Math.max(1, tempo)),
    [compositionDurationBeats, tempo]
  );

  const scanlineProgress = useMemo(() => {
    if (!compositionDurationSeconds) return 0;
    return Math.min(currentTime / compositionDurationSeconds, 1);
  }, [compositionDurationSeconds, currentTime]);

  // Handle URL params for deep linking
  useEffect(() => {
    const sceneParam = searchParams.get('scene');
    if (sceneParam) {
      const allScenePacks = getAllScenePacks();
      const targetScenePack = allScenePacks.find((pack) => pack.id === sceneParam);
      if (targetScenePack) {
        handleScenePackSelect(targetScenePack);
      }
    }
  }, [searchParams]);

  // Handle image selection
  const handleImageSelected = async (file: File) => {
    setImagePreview(URL.createObjectURL(file));

    // Auto-analyze using the appropriate analyzer based on mode
    setIsAnalyzing(true);
    try {
      const result = mappingMode === 'MULTI_VOICE'
        ? await analyzeImageFileMultiVoice(file)
        : await analyzeImageFile(file);
      setAnalysis(result.analysis);
    } catch (error) {
      console.error('Failed to analyze image:', error);
      alert('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle scene pack selection
  const handleScenePackSelect = (scenePack: ScenePack | null) => {
    setSelectedScenePack(scenePack);

    if (scenePack) {
      // Find and apply the associated preset
      const allPresets = getAllTopoPresets();
      const associatedPreset = getScenePreset(scenePack, allPresets);

      if (associatedPreset) {
        setSelectedTopoPreset(associatedPreset);
        setKey(associatedPreset.defaultKey);
        setScale(associatedPreset.defaultScale);
        setTempo(associatedPreset.defaultTempoBpm);
        setMappingMode(associatedPreset.mappingMode as MappingMode);
      }
    } else {
      // Clear preset when scene pack is cleared
      setSelectedTopoPreset(null);
    }
  };

  // Handle preset selection (manual override)
  const handlePresetSelect = (preset: TopoPreset | null) => {
    setSelectedTopoPreset(preset);
    // Clear scene pack if manually selecting preset
    setSelectedScenePack(null);

    if (preset) {
      setKey(preset.defaultKey);
      setScale(preset.defaultScale);
      setTempo(preset.defaultTempoBpm);
      setMappingMode(preset.mappingMode as MappingMode);
    }
  };

  // Handle demo loading
  const handleLoadDemo = (demoNotes: NoteEvent[], scenePack: ScenePack) => {
    // Load the demo composition
    setNoteEvents(demoNotes);

    // Apply scene pack preset settings
    const allPresets = getAllTopoPresets();
    const associatedPreset = getScenePreset(scenePack, allPresets);

    if (associatedPreset) {
      setKey(associatedPreset.defaultKey);
      setScale(associatedPreset.defaultScale);
      setTempo(associatedPreset.defaultTempoBpm);
      setMappingMode(associatedPreset.mappingMode as MappingMode);
    }

    // Set title
    setTitle(`${scenePack.name} Demo`);
  };

  // Generate composition
  const handleGenerate = () => {
    if (!analysis) {
      alert('Please upload an image first');
      return;
    }

    let events: NoteEvent[];

    if (mappingMode === 'MULTI_VOICE') {
      // Multi-voice mode: generate bass, melody, and pad voices
      events = mapImageToMultiVoiceComposition(
        analysis,
        {
          key,
          scale,
          tempoBpm: tempo,
          enableBass: true,
          enableMelody: true,
          enablePad: true,
        },
        selectedTopoPreset || undefined
      );
    } else {
      // Linear landscape mode (default)
      events = mapLinearLandscape(analysis, {
        key,
        scale,
        maxNotes: 64,
        noteDurationBeats: 0.5,
        enablePanning: true,
        enableVelocityVariation: true,
      });
    }

    setNoteEvents(events);
  };

  // Save composition
  const handleSave = async () => {
    let effectiveToken = token;
    let effectiveUser = user;

    if (!effectiveToken) {
      // Prompt for login
      const email = prompt('Enter your email to save:');
      if (email) {
        const password = prompt('Enter your Supabase password:');
        try {
          const loginResult = await login(email, password || undefined);
          effectiveToken = loginResult.token;
          effectiveUser = loginResult.user;
        } catch (error) {
          alert('Login failed');
          return;
        }
      } else {
        return;
      }
    }

    if (!noteEvents.length || !effectiveToken || !effectiveUser) return;

    const compositionTitle = title || `Composition ${new Date().toLocaleDateString()}`;

    setIsSaving(true);
    try {
      await createComposition(
        {
          title: compositionTitle,
          description: description || 'Generated from uploaded image',
          noteEvents,
          mappingMode,
          key,
          scale,
          presetId,
          tempo,
          userId: effectiveUser.id,
        },
        effectiveToken
      );

      alert('Composition saved!');
    } catch (error) {
      console.error('Failed to save composition:', error);
      alert('Failed to save composition');
    } finally {
      setIsSaving(false);
    }
  };

  // Export composition as MIDI
  const handleExportMidi = () => {
    if (!noteEvents.length) {
      alert('Generate a composition first');
      return;
    }

    try {
      exportCompositionToMidi({
        noteEvents,
        tempoBpm: tempo,
        title: title || 'TopoSonics Composition',
        description,
        mappingMode,
        key,
        scale,
        presetId,
        userId: user?.id,
        metadata: {
          duration: compositionDurationSeconds,
        },
      });
    } catch (error) {
      console.error('Failed to export MIDI', error);
      alert('Unable to export MIDI');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Studio</h1>
        <p className="text-gray-400">Upload an image and generate a soundscape</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column: Image & Controls */}
        <div className="space-y-6">
          <Card title="1. Choose Scene Pack" padding="lg">
            <ScenePackSelector
              selectedScenePack={selectedScenePack}
              onScenePackChange={handleScenePackSelect}
              onLoadDemo={handleLoadDemo}
            />
          </Card>

          <Card title="2. Upload Image" padding="lg">
            <ImageUploader
              onImageSelected={handleImageSelected}
              preview={imagePreview}
              showScanline={isPlaying && noteEvents.length > 0}
              scanlineProgress={isPlaying ? scanlineProgress : 0}
            />
            {isAnalyzing && (
              <div className="mt-4 text-center text-sm text-gray-400">
                Analyzing image...
              </div>
            )}
          </Card>

          <Card title="3. Configure Mapping" padding="lg">
            <MappingControls
              key={key}
              scale={scale}
              mappingMode={mappingMode}
              presetId={presetId}
              selectedTopoPreset={selectedTopoPreset}
              onKeyChange={setKey}
              onScaleChange={setScale}
              onMappingModeChange={setMappingMode}
              onPresetChange={setPresetId}
              onTopoPresetChange={handlePresetSelect}
            />
          </Card>

          <Card title="4. Generate" padding="lg">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleGenerate}
              disabled={!analysis || isAnalyzing}
            >
              Generate Composition
            </Button>
          </Card>
        </div>

        {/* Right Column: Playback & Visualization */}
        <div className="space-y-6">
          <Card title="Playback" padding="lg">
            <PlaybackControls
              isPlaying={isPlaying}
              isLoading={audioLoading}
              tempo={tempo}
              onPlay={play}
              onStop={stop}
              onTempoChange={setTempo}
              disabled={noteEvents.length === 0}
            />
          </Card>

          <TimelineVisualizer noteEvents={noteEvents} currentTime={currentTime} />

          {noteEvents.length > 0 && (
            <Card title="Save Composition" padding="lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Composition"
                    className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                    className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={handleSave}
                  disabled={isSaving}
                  loading={isSaving}
                >
                  Save to Library
                </Button>
                <Button variant="outline" size="lg" fullWidth onClick={handleExportMidi}>
                  Export as MIDI
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
