'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Button } from '@toposonics/ui';
import type { Composition } from '@toposonics/types';
import { fetchCompositions } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function CompositionsPage() {
  const { token } = useAuth();
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompositions();
  }, [token]);

  const loadCompositions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchCompositions(token);
      setCompositions(data);
    } catch (err) {
      console.error('Failed to load compositions:', err);
      setError('Failed to load compositions');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="animate-pulse text-gray-400">Loading compositions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="text-red-400 mb-4">{error}</div>
          <Button onClick={loadCompositions}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Compositions</h1>
          <p className="text-gray-400">Browse and replay your soundscapes</p>
        </div>
        <Link href="/studio">
          <Button variant="primary">Create New</Button>
        </Link>
      </div>

      {compositions.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-2xl font-semibold mb-2">No compositions yet</h2>
          <p className="text-gray-400 mb-6">
            Create your first soundscape in the studio
          </p>
          <Link href="/studio">
            <Button variant="primary" size="lg">
              Open Studio
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {compositions.map((composition) => (
            <Link key={composition.id} href={`/compositions/${composition.id}`}>
              <Card
                title={composition.title}
                subtitle={composition.description}
                variant="elevated"
                padding="lg"
                onClick={() => {}}
              >
                <div className="mt-4 space-y-2 text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>Key:</span>
                    <span className="text-gray-300">
                      {composition.key} {composition.scale.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Notes:</span>
                    <span className="text-gray-300">{composition.noteEvents.length}</span>
                  </div>
                  {composition.tempo && (
                    <div className="flex justify-between">
                      <span>Tempo:</span>
                      <span className="text-gray-300">{composition.tempo} BPM</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="text-gray-300">
                      {new Date(composition.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
