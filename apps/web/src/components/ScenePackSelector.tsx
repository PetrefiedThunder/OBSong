'use client';

import { useState } from 'react';
import type { ScenePack, NoteEvent } from '@toposonics/types';
import { getAllScenePacks } from '@toposonics/core-audio';

interface ScenePackSelectorProps {
  selectedScenePack: ScenePack | null;
  onScenePackChange: (pack: ScenePack | null) => void;
  onLoadDemo?: (noteEvents: NoteEvent[], scenePack: ScenePack) => void;
}

export function ScenePackSelector({
  selectedScenePack,
  onScenePackChange,
  onLoadDemo,
}: ScenePackSelectorProps) {
  const scenePacks = getAllScenePacks();
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);

  const handleLoadDemo = async (scenePack: ScenePack) => {
    if (!onLoadDemo) return;

    setLoadingDemo(scenePack.id);
    try {
      const response = await fetch(`/demo/compositions/${scenePack.id}.json`);
      if (!response.ok) {
        throw new Error('Demo not found');
      }
      const data = await response.json();
      onLoadDemo(data.noteEvents, scenePack);
    } catch (error) {
      console.error('Failed to load demo:', error);
      alert('Demo composition not available for this scene pack');
    } finally {
      setLoadingDemo(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-3">Scene Pack</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Custom / No Pack Option */}
          <button
            onClick={() => onScenePackChange(null)}
            className={`p-4 rounded-lg text-left transition-all border-2 ${
              selectedScenePack === null
                ? 'bg-primary-600/20 border-primary-500'
                : 'bg-surface-secondary border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="font-medium">Custom</div>
            <div className="text-xs text-gray-400 mt-1">Manual configuration</div>
          </button>

          {/* Scene Pack Cards */}
          {scenePacks.map((pack) => (
            <button
              key={pack.id}
              onClick={() => onScenePackChange(pack)}
              className={`p-4 rounded-lg text-left transition-all border-2 ${
                selectedScenePack?.id === pack.id
                  ? 'border-2'
                  : 'bg-surface-secondary border-gray-700 hover:border-gray-600'
              }`}
              style={{
                borderColor:
                  selectedScenePack?.id === pack.id
                    ? pack.uiThemeHints?.accentColor || '#A855F7'
                    : undefined,
                backgroundColor:
                  selectedScenePack?.id === pack.id
                    ? `${pack.uiThemeHints?.accentColor || '#A855F7'}20`
                    : undefined,
              }}
            >
              <div className="font-medium">{pack.name}</div>
              <div className="text-xs text-gray-400 mt-1 line-clamp-2">{pack.tagline}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Scene Pack Details */}
      {selectedScenePack && (
        <div className="bg-surface-secondary rounded-lg p-4 space-y-3 border border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-sm mb-1">Description</h3>
              <p className="text-sm text-gray-400">{selectedScenePack.description}</p>
            </div>
            {onLoadDemo && (
              <button
                onClick={() => handleLoadDemo(selectedScenePack)}
                disabled={loadingDemo === selectedScenePack.id}
                className="ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: selectedScenePack.uiThemeHints?.accentColor || '#A855F7',
                }}
              >
                {loadingDemo === selectedScenePack.id ? 'Loading...' : 'Play Demo'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h3 className="font-medium text-sm mb-1">Best For</h3>
              <div className="flex flex-wrap gap-1">
                {selectedScenePack.recommendedSubjects.map((subject, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-surface-elevated px-2 py-1 rounded"
                    style={{
                      color: selectedScenePack.uiThemeHints?.accentColor || '#A855F7',
                    }}
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-1">Lighting</h3>
              <p className="text-sm text-gray-400">{selectedScenePack.recommendedLighting}</p>
            </div>
          </div>

          {selectedScenePack.recommendedUsageNotes && (
            <div>
              <h3 className="font-medium text-sm mb-1">Tips</h3>
              <p className="text-sm text-gray-400">{selectedScenePack.recommendedUsageNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
