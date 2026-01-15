'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@toposonics/ui';
import { getAllScenePacks } from '@toposonics/core-audio';
import type { ScenePack, NoteEvent, ImageAnalysisResult } from '@toposonics/types';
import { LandingDemoPlayer } from '@/components/LandingDemoPlayer';
import { TourProvider, useTour } from '@/components/tour/TourProvider';
import { TourPopup } from '@/components/tour/TourPopup';
import { mockAnalysisResult, mockNoteEvents } from '@toposonics/shared/dist/demo-data';
import { theme } from '@toposonics/ui/dist/theme';

type Category = 'All' | 'Nature' | 'Urban' | 'Atmospheric';

function TourWrapper() {
  const { tourStep } = useTour();
  const [demoAnalysis, setDemoAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [demoNotes, setDemoNotes] = useState<NoteEvent[] | null>(null);

  useEffect(() => {
    if (tourStep?.action === 'RUN_ANALYSIS') {
      setDemoAnalysis(mockAnalysisResult);
    }
    if (tourStep?.action === 'PLAY_MUSIC') {
      setDemoNotes(mockNoteEvents);
    }
  }, [tourStep]);

  // This component will eventually display the analysis results and trigger playback
  // For now, it just handles the state logic.

  return null;
}

export default function HomePage() {
  return (
    <TourProvider>
      <HomePageContent />
      <TourPopup />
      <TourWrapper />
    </TourProvider>
  );
}

function HomePageContent() {
  const allScenePacks = getAllScenePacks();
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [activeDemo, setActiveDemo] = useState<{
    scenePack: ScenePack;
    noteEvents: NoteEvent[];
  } | null>(null);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const { startTour } = useTour();

  // Filter scene packs by category
  const scenePacks = selectedCategory === 'All'
    ? allScenePacks
    : allScenePacks.filter(pack => pack.category === selectedCategory);

  const handlePlayDemo = async (scenePack: ScenePack) => {
    setLoadingDemo(scenePack.id);
    try {
      const response = await fetch(`/demo/compositions/${scenePack.id}.json`);
      if (!response.ok) {
        throw new Error('Demo not found');
      }
      const data = await response.json();
      setActiveDemo({ scenePack, noteEvents: data.noteEvents });
    } catch (error) {
      console.error('Failed to load demo:', error);
      alert('Demo composition not available for this scene pack');
    } finally {
      setLoadingDemo(null);
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 id="logo" className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
            Turn Images into Musical Landscapes
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            TopoSonics transforms your photos into unique soundscapes using curated musical
            presets. Choose a scene, upload an image, and hear your visual landscape come to life.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/studio">
              <Button variant="primary" size="lg">
                Open Studio
              </Button>
            </Link>
            <Button variant="secondary" size="lg" onClick={startTour}>
              Take the Tour
            </Button>
          </div>
        </div>

        {/* Scene Pack Showcase */}
        <div id="image-analysis-panel" className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Explore Scene Packs</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-6">
              Each scene pack is a carefully crafted musical experience designed for specific
              types of imagery. Try a demo or jump straight into the studio.
            </p>

            {/* Category Filter */}
            <div id="mapping-mode-selector" className="flex justify-center gap-2 flex-wrap">
              {(['All', 'Nature', 'Urban', 'Atmospheric'] as Category[]).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-elevated text-gray-300 hover:bg-surface-elevated'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenePacks.map((pack) => (
              <div
                key={pack.id}
                className="group relative rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${pack.uiThemeHints?.accentColor || theme.colors.secondary.DEFAULT}15, transparent)`,
                }}
              >
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{pack.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-gray-400 border border-gray-700">
                        {pack.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{pack.tagline}</p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-300 line-clamp-3">{pack.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {pack.recommendedSubjects.slice(0, 3).map((subject, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded bg-surface-elevated"
                        style={{
                          color: pack.uiThemeHints?.accentColor || theme.colors.secondary.DEFAULT,
                        }}
                      >
                        {subject}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div id="playback-controls" className="flex gap-2 pt-2">
                    <button
                      onClick={() => handlePlayDemo(pack)}
                      disabled={loadingDemo === pack.id}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: pack.uiThemeHints?.accentColor || theme.colors.secondary.DEFAULT,
                      }}
                    >
                      {loadingDemo === pack.id ? 'Loading...' : '▶ Try Demo'}
                    </button>
                    <Link
                      id="export-button"
                      href={`/studio?scene=${pack.id}`}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border text-center"
                      style={{
                        borderColor: pack.uiThemeHints?.accentColor || theme.colors.secondary.DEFAULT,
                        color: pack.uiThemeHints?.accentColor || theme.colors.secondary.DEFAULT,
                      }}
                    >
                      Open →
                    </Link>
                  </div>
                </div>

                {/* Accent gradient overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at top right, ${pack.uiThemeHints?.accentColor || theme.colors.secondary.DEFAULT}, transparent)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Choose a Scene Pack</h3>
                <p className="text-gray-400">
                  Start with a curated musical preset that matches your image's mood—from
                  majestic mountains to industrial cityscapes.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Upload an Image</h3>
                <p className="text-gray-400">
                  Choose a photo that matches the scene pack's recommendations—or experiment
                  with something unexpected.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-xl font-.bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Generate & Listen</h3>
                <p className="text-gray-400">
                  TopoSonics analyzes the image using multi-voice architecture—bass from
                  horizons, melodies from ridges, pads from textures—and plays back your
                  unique soundscape.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/studio">
            <Button variant="primary" size="lg">
              Get Started →
            </Button>
          </Link>
        </div>
      </div>

      {/* Demo Player Modal */}
      {activeDemo && (
        <LandingDemoPlayer
          demoNotes={activeDemo.noteEvents}
          scenePack={activeDemo.scenePack}
          onClose={() => setActiveDemo(null)}
        />
      )}
    </>
  );
}
