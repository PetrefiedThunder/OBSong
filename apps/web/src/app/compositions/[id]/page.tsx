'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@toposonics/ui';
import type { Composition } from '@toposonics/types';
import { fetchComposition, updateComposition, deleteComposition } from '@/lib/api';
import { exportCompositionToMidi } from '@/lib/midiExport';
import { getPresetById, getDefaultPreset } from '@toposonics/core-audio';
import { useAuth } from '@/contexts/AuthContext';
import { useToneEngine } from '@/hooks/useToneEngine';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TimelineVisualizer } from '@/components/TimelineVisualizer';
import { LoginModal } from '@/components/LoginModal';

export default function CompositionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, login, isLoading: authLoading } = useAuth();

  const [composition, setComposition] = useState<Composition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [tempo, setTempo] = useState(90);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const id = params.id as string;

  const loadComposition = useCallback(async () => {
    if (!token) return;

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
  }, [id, token]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!token) {
      setComposition(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    void loadComposition();
  }, [authLoading, loadComposition, token]);

  const handleLogin = async (email: string, password?: string) => {
    setIsLoggingIn(true);
    try {
      await login(email, password);
      setIsLoginModalOpen(false);
    } catch (error) {
      console.error('Failed to sign in for composition detail:', error);
      alert('Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const startEditing = () => {
    if (!composition) return;
    setEditTitle(composition.title);
    setEditDescription(composition.description || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!token || !composition) return;
    const title = editTitle.trim();
    if (!title) {
      alert('Title cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateComposition(
        composition.id,
        { title, description: editDescription.trim() },
        token
      );
      setComposition(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update composition:', err);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportMidi = () => {
    if (!composition || composition.noteEvents.length === 0) return;
    try {
      exportCompositionToMidi({
        noteEvents: composition.noteEvents,
        tempoBpm: tempo,
        title: composition.title,
        description: composition.description,
        mappingMode: composition.mappingMode,
        key: composition.key,
        scale: composition.scale,
        presetId: composition.presetId,
        userId: composition.userId,
        metadata: composition.metadata,
      });
    } catch (err) {
      console.error('Failed to export MIDI:', err);
      alert('Failed to export MIDI');
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

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="animate-pulse text-gray-400">Checking your session...</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
            <p className="text-gray-400 mb-6">
              This composition belongs to your private library.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="primary" onClick={() => setIsLoginModalOpen(true)}>
                Sign In
              </Button>
              <Button variant="outline" onClick={() => router.push('/compositions')}>
                Back to Library
              </Button>
            </div>
          </div>
        </div>
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={handleLogin}
          isLoggingIn={isLoggingIn}
          title="Sign In to View This Composition"
          description="Your saved compositions are private. Sign in to open this detail page."
        />
      </>
    );
  }

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
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium mb-1">
                Title
              </label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
                className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                disabled={isSaving}
                loading={isSaving}
              >
                Save
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{composition.title}</h1>
              {composition.description && (
                <p className="text-gray-400">{composition.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {canDelete && (
                <Button variant="outline" onClick={startEditing}>
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleExportMidi}
                disabled={composition.noteEvents.length === 0}
              >
                Export MIDI
              </Button>
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
        )}
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
            tempo={tempo}
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
