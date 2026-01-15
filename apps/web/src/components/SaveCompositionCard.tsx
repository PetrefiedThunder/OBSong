'use client';

import { useState } from 'react';
import { Button, Card } from '@toposonics/ui';
import { useAuth } from '@/contexts/AuthContext';
import { createComposition } from '@/lib/api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { LoginModal } from './LoginModal';
import type { NoteEvent, MappingMode, KeyType, ScaleType } from '@toposonics/types';

interface SaveCompositionCardProps {
  noteEvents: NoteEvent[];
  mappingMode: MappingMode;
  keyType: KeyType;
  scale: ScaleType;
  presetId: string;
  tempo: number;
}

export function SaveCompositionCard({ noteEvents, mappingMode, keyType, scale, presetId, tempo }: SaveCompositionCardProps) {
  const { user, token, login } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginForSave = async (email: string, password?: string) => {
    setIsLoggingIn(true);
    try {
      const { token: newToken } = await login(email, password);
      setIsLoginModalOpen(false);
      await handleSave(newToken);
    } catch (error) {
      alert('Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSave = async (overrideToken?: string) => {
    const effectiveToken = overrideToken || token;

    if (!effectiveToken) {
      setIsLoginModalOpen(true);
      return;
    }

    const compositionTitle = title || `Composition ${new Date().toLocaleDateString()}`;

    setIsSaving(true);
    try {
      const savedComposition = await createComposition(
        {
          title: compositionTitle,
          description: description || 'Generated from uploaded image',
          noteEvents,
          mappingMode,
          key: keyType,
          scale,
          presetId,
          tempo,
        },
        effectiveToken
      );

      alert('Composition saved!');
      logAnalyticsEvent('composition_saved', { compositionId: savedComposition.id, noteCount: noteEvents.length });
    } catch (error) {
      console.error('Failed to save composition:', error);
      alert('Failed to save composition');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
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
            onClick={() => handleSave()}
            disabled={isSaving}
            loading={isSaving}
          >
            Save to Library
          </Button>
        </div>
      </Card>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLoginForSave}
        isLoggingIn={isLoggingIn}
      />
    </>
  );
}
