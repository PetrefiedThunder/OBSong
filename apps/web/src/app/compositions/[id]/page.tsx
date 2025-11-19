'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@toposonics/ui';
import type { Composition } from '@toposonics/types';
import { fetchComposition, deleteComposition } from '@/lib/api';
import { getPresetById, getDefaultPreset } from '@toposonics/core-audio';
import { useAuth } from '@/contexts/AuthContext';
import { useToneEngine } from '@/hooks/useToneEngine';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TimelineVisualizer } from '@/components/TimelineVisualizer';

export default function CompositionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const [composition, setComposition] = useState<Composition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tempo, setTempo] = useState(90);

  const id = params.id as string;

  useEffect(() => {
    loadComposition();
  }, [id, token]);

  const loadComposition = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchComposition(id, token);
      setComposition(data);
      setTempo(data.tempo || 90);
    } catch (err) {
      console.error('Failed to load composition:', err);
      setError('Failed to load composition');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !composition) return;

    if (!confirm('Are you sure you want to delete this composition?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteComposition(composition.id, token);
      router.push('/compositions');
    } catch (err) {
      console.error('Failed to delete composition:', err);
      alert('Failed to delete composition');
    } finally {
      setIsDeleting(false);
    }
  };

  // Audio engine
  const preset =
    (composition && getPresetById(composition.presetId || '')) || getDefaultPreset();
  const { play, stop, isPlaying, isLoading: audioLoading, currentTime } = useToneEngine({
    noteEvents: composition?.noteEvents || [],
    tempo,
    preset,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="animate-pulse text-gray-400">Loading composition...</div>
        </div>
      </div>
    );
  }

  if (error || !composition) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="text-red-400 mb-4">{error || 'Composition not found'}</div>
          <Button onClick={() => router.push('/compositions')}>Back to Compositions</Button>
        </div>
      </div>
    );
  }

  const canDelete = user && user.id === composition.userId;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/compositions')}
          className="mb-4"
        >
          ← Back to Compositions
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{composition.title}</h1>
            {composition.description && (
              <p className="text-gray-400">{composition.description}</p>
            )}
          </div>
          {canDelete && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              loading={isDeleting}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Metadata */}
        <Card title="Details" padding="lg">
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-gray-400">Musical Key</div>
              <div className="font-medium">
                {composition.key} {composition.scale.replace(/_/g, ' ')}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Mapping Mode</div>
              <div className="font-medium">
                {composition.mappingMode.replace('_', ' ')}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Sound Preset</div>
              <div className="font-medium">{preset.name}</div>
            </div>
            <div>
              <div className="text-gray-400">Note Count</div>
              <div className="font-medium">{composition.noteEvents.length}</div>
            </div>
            <div>
              <div className="text-gray-400">Created</div>
              <div className="font-medium">
                {new Date(composition.createdAt).toLocaleString()}
              </div>
            </div>
            {composition.metadata?.duration && (
              <div>
                <div className="text-gray-400">Duration</div>
                <div className="font-medium">
                  {composition.metadata.duration.toFixed(1)}s
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Playback */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Playback" padding="lg">
            <PlaybackControls
              isPlaying={isPlaying}
              isLoading={audioLoading}
              tempo={tempo}
              onPlay={play}
              onStop={stop}
              onTempoChange={setTempo}
            />
          </Card>

          <TimelineVisualizer
            noteEvents={composition.noteEvents}
            currentTime={currentTime}
          />

          {composition.imageThumbnail && (
            <Card title="Source Image" padding="lg">
              <img
                src={composition.imageThumbnail}
                alt="Source"
                className="w-full rounded-lg"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
