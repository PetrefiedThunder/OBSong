'use client';

import { useState } from 'react';
import { Button, Card } from '@toposonics/ui';
import type {
  KeyType,
  ScaleType,
  MappingMode,
  NoteEvent,
  ImageAnalysisResult,
} from '@toposonics/types';
import { mapLinearLandscape, getPresetById, getDefaultPreset } from '@toposonics/core-audio';
import { analyzeImageFile } from '@/lib/imageProcessing';
import { createComposition } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToneEngine } from '@/hooks/useToneEngine';
import { ImageUploader } from '@/components/ImageUploader';
import { MappingControls } from '@/components/MappingControls';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TimelineVisualizer } from '@/components/TimelineVisualizer';

export default function StudioPage() {
  const { user, token, login } = useAuth();

  // State
  const [imageFile, setImageFile] = useState<File | null>(null);
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

  // Handle image selection
  const handleImageSelected = async (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    // Auto-analyze
    setIsAnalyzing(true);
    try {
      const result = await analyzeImageFile(file);
      setAnalysis(result.analysis);
    } catch (error) {
      console.error('Failed to analyze image:', error);
      alert('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate composition
  const handleGenerate = () => {
    if (!analysis) {
      alert('Please upload an image first');
      return;
    }

    const events = mapLinearLandscape(analysis, {
      key,
      scale,
      maxNotes: 64,
      noteDurationBeats: 0.5,
      enablePanning: true,
      enableVelocityVariation: true,
    });

    setNoteEvents(events);
  };

  // Save composition
  const handleSave = async () => {
    if (!token) {
      // Prompt for login
      const email = prompt('Enter your email to save:');
      if (email) {
        try {
          await login(email);
        } catch (error) {
          alert('Login failed');
          return;
        }
      } else {
        return;
      }
    }

    if (!noteEvents.length || !token) return;

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
          userId: user!.id,
        },
        token
      );

      alert('Composition saved!');
    } catch (error) {
      console.error('Failed to save composition:', error);
      alert('Failed to save composition');
    } finally {
      setIsSaving(false);
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
          <Card title="1. Upload Image" padding="lg">
            <ImageUploader onImageSelected={handleImageSelected} preview={imagePreview} />
            {isAnalyzing && (
              <div className="mt-4 text-center text-sm text-gray-400">
                Analyzing image...
              </div>
            )}
          </Card>

          <Card title="2. Configure Mapping" padding="lg">
            <MappingControls
              key={key}
              scale={scale}
              mappingMode={mappingMode}
              presetId={presetId}
              onKeyChange={setKey}
              onScaleChange={setScale}
              onMappingModeChange={setMappingMode}
              onPresetChange={setPresetId}
            />
          </Card>

          <Card title="3. Generate" padding="lg">
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
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
