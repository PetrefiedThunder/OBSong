import Link from 'next/link';
import { Button, Card } from '@toposonics/ui';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <div className="text-center mb-20">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
          Turn Images into Musical Landscapes
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          TopoSonics transforms your photos into unique soundscapes. Upload any image and
          watch as visual features become pitch, rhythm, and spatial effects.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/studio">
            <Button variant="primary" size="lg">
              Open Studio
            </Button>
          </Link>
          <Link href="/compositions">
            <Button variant="outline" size="lg">
              Browse Compositions
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-20">
        <Card title="Visual Mapping" padding="lg">
          <p className="text-gray-400">
            Horizontal movement = time, vertical = pitch. Brightness and depth control
            effects like panning, reverb, and filter cutoff.
          </p>
        </Card>
        <Card title="Musical Control" padding="lg">
          <p className="text-gray-400">
            Choose from multiple scales (Major, Minor, Pentatonic, Blues), all 12 keys,
            and various synth presets to match your image's mood.
          </p>
        </Card>
        <Card title="Real-time Playback" padding="lg">
          <p className="text-gray-400">
            Hear your composition instantly with Tone.js synthesis. Adjust tempo and
            effects, then save to play back later.
          </p>
        </Card>
      </div>

      {/* How It Works */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-xl font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Upload an Image</h3>
              <p className="text-gray-400">
                Choose a photo from your device or capture one with your camera.
                Landscapes, cityscapes, and abstract patterns all work beautifully.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-xl font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Configure Musical Parameters</h3>
              <p className="text-gray-400">
                Select your preferred key (C, D, A, etc.), scale (Major, Minor,
                Pentatonic), and sound preset (Sine, Sawtooth, etc.).
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-xl font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Generate & Listen</h3>
              <p className="text-gray-400">
                TopoSonics analyzes the image, creates a sequence of musical notes, and
                plays them back instantly. Save your favorites!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-20">
        <Link href="/studio">
          <Button variant="primary" size="lg">
            Get Started →
          </Button>
        </Link>
      </div>
    </div>
  );
}
