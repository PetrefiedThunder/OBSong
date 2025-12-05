# Native Audio Engine Specification

## Executive Summary

This document specifies the implementation of a native audio synthesis engine for the TopoSonics Android application. The native audio engine will replace the current `expo-av` based implementation, which uses pitch-shifted WAV files, with a real-time polyphonic synthesizer using Google's **Oboe** library for low-latency audio.

---

## Objectives

1. **Eliminate Audio Artifacts**: Remove "chipmunk" effects from pitch-shifted samples
2. **Real-time Synthesis**: Generate audio waveforms on-the-fly using oscillators
3. **Low Latency**: Achieve < 10ms latency for responsive playback
4. **Feature Parity**: Match Web's Tone.js capabilities (oscillators, ADSR, filters)
5. **Polyphonic Playback**: Support multiple simultaneous notes

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│           TypeScript Layer (React Native)           │
│  ┌─────────────────────────────────────────────┐   │
│  │      NativeAudioEngine.ts                   │   │
│  │  - scheduleEvents(notes: NoteEvent[])      │   │
│  │  - play() / stop()                          │   │
│  │  - loadPreset(preset: SoundPreset)         │   │
│  └──────────────────┬──────────────────────────┘   │
└────────────────────┼────────────────────────────────┘
                     │ JNI Bridge
┌────────────────────▼────────────────────────────────┐
│              Kotlin Bridge Layer                    │
│  ┌─────────────────────────────────────────────┐   │
│  │   NativeAudioEngineModule.kt                │   │
│  │  - Expo Module Definition                   │   │
│  │  - JNI Method Calls                         │   │
│  └──────────────────┬──────────────────────────┘   │
└────────────────────┼────────────────────────────────┘
                     │ JNI
┌────────────────────▼────────────────────────────────┐
│              C++ Audio Engine (Oboe)                │
│  ┌─────────────────────────────────────────────┐   │
│  │  AudioEngine.cpp                            │   │
│  │  - Oboe AudioStream                         │   │
│  │  - Mixer (combines voices)                  │   │
│  │  - Voice Pool (polyphonic)                  │   │
│  │                                             │   │
│  │  Voice.cpp                                  │   │
│  │  - Oscillator (Sine, Square, Saw, Triangle)│   │
│  │  - ADSR Envelope                            │   │
│  │  - StateVariableFilter (Lowpass)            │   │
│  │                                             │   │
│  │  Scheduler.cpp                              │   │
│  │  - Event queue (time-sorted)                │   │
│  │  - Sample-accurate timing                   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
            Android Audio Output
```

---

## Package Structure

Create a new package: `packages/native-audio-engine`

```
packages/native-audio-engine/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts                    # TypeScript API
├── android/
│   ├── build.gradle                # Gradle configuration
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/com/toposonics/nativeaudioengine/
│   │   │   ├── NativeAudioEngineModule.kt
│   │   │   └── NativeAudioEnginePackage.kt
│   │   └── cpp/
│   │       ├── CMakeLists.txt      # CMake build config
│   │       ├── native-audio-engine.cpp  # JNI entry point
│   │       ├── AudioEngine.h       # Main engine
│   │       ├── AudioEngine.cpp
│   │       ├── Voice.h             # Synthesis voice
│   │       ├── Voice.cpp
│   │       ├── Oscillator.h        # Waveform generators
│   │       ├── Oscillator.cpp
│   │       ├── Envelope.h          # ADSR envelope
│   │       ├── Envelope.cpp
│   │       ├── Filter.h            # State-variable filter
│   │       ├── Filter.cpp
│   │       ├── Scheduler.h         # Event scheduler
│   │       └── Scheduler.cpp
└── ios/                            # iOS implementation (future)
    └── NativeAudioEngineModule.swift
```

---

## TypeScript API

### Interface Definition

```typescript
// packages/native-audio-engine/src/index.ts

/**
 * Oscillator waveform types
 */
export enum OscillatorType {
  SINE = 'sine',
  SQUARE = 'square',
  SAWTOOTH = 'sawtooth',
  TRIANGLE = 'triangle',
}

/**
 * Sound preset configuration
 */
export interface SoundPreset {
  /** Oscillator waveform type */
  oscillator: OscillatorType;

  /** ADSR envelope parameters */
  envelope: {
    attack: number;   // Attack time in seconds
    decay: number;    // Decay time in seconds
    sustain: number;  // Sustain level (0-1)
    release: number;  // Release time in seconds
  };

  /** Filter configuration (optional) */
  filter?: {
    type: 'lowpass' | 'highpass' | 'bandpass';
    frequency: number;  // Cutoff frequency in Hz
    resonance: number;  // Q factor (0-10)
  };

  /** Master volume (0-1) */
  volume: number;
}

/**
 * Note event for scheduling
 */
export interface NoteEvent {
  /** Musical note (e.g., "C4", "A#3") */
  note: string;

  /** Frequency in Hz (alternative to note) */
  frequency?: number;

  /** Start time in seconds (relative to playback start) */
  start: number;

  /** Duration in seconds */
  duration: number;

  /** Velocity (0-1) */
  velocity: number;

  /** Pan (-1 left, 0 center, 1 right) */
  pan?: number;
}

/**
 * Native Audio Engine API
 */
export interface NativeAudioEngine {
  /**
   * Initialize the audio engine
   * @returns Promise that resolves when engine is ready
   */
  initialize(): Promise<void>;

  /**
   * Load a sound preset
   * @param preset The preset configuration
   */
  loadPreset(preset: SoundPreset): Promise<void>;

  /**
   * Schedule a batch of note events
   * @param events Array of note events to schedule
   */
  scheduleEvents(events: NoteEvent[]): Promise<void>;

  /**
   * Start playback of scheduled events
   */
  play(): Promise<void>;

  /**
   * Stop playback and clear all scheduled events
   */
  stop(): Promise<void>;

  /**
   * Pause playback (retains scheduled events)
   */
  pause(): Promise<void>;

  /**
   * Resume playback from paused state
   */
  resume(): Promise<void>;

  /**
   * Check if audio engine is available
   */
  isAvailable(): boolean;

  /**
   * Release all resources and shut down the engine
   */
  shutdown(): Promise<void>;
}

/**
 * Create and return the native audio engine instance
 */
export function createNativeAudioEngine(): NativeAudioEngine;
```

---

## Kotlin Bridge Implementation

### Module Definition

```kotlin
// NativeAudioEngineModule.kt

package com.toposonics.nativeaudioengine

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class NativeAudioEngineModule : Module() {
  companion object {
    init {
      System.loadLibrary("native-audio-engine")
    }
  }

  override fun definition() = ModuleDefinition {
    Name("NativeAudioEngine")

    AsyncFunction("initialize") {
      withContext(Dispatchers.Default) {
        nativeInitialize()
      }
    }

    AsyncFunction("loadPreset") { presetJson: String ->
      withContext(Dispatchers.Default) {
        nativeLoadPreset(presetJson)
      }
    }

    AsyncFunction("scheduleEvents") { eventsJson: String ->
      withContext(Dispatchers.Default) {
        nativeScheduleEvents(eventsJson)
      }
    }

    AsyncFunction("play") {
      withContext(Dispatchers.Default) {
        nativePlay()
      }
    }

    AsyncFunction("stop") {
      withContext(Dispatchers.Default) {
        nativeStop()
      }
    }

    AsyncFunction("pause") {
      withContext(Dispatchers.Default) {
        nativePause()
      }
    }

    AsyncFunction("resume") {
      withContext(Dispatchers.Default) {
        nativeResume()
      }
    }

    AsyncFunction("shutdown") {
      withContext(Dispatchers.Default) {
        nativeShutdown()
      }
    }
  }

  // JNI method declarations
  private external fun nativeInitialize()
  private external fun nativeLoadPreset(presetJson: String)
  private external fun nativeScheduleEvents(eventsJson: String)
  private external fun nativePlay()
  private external fun nativeStop()
  private external fun nativePause()
  private external fun nativeResume()
  private external fun nativeShutdown()
}
```

---

## C++ Implementation

### CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.18)
project(native-audio-engine)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add Oboe library
set(OBOE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/oboe)
add_subdirectory(${OBOE_DIR} ./oboe)

# Source files
add_library(native-audio-engine SHARED
  native-audio-engine.cpp
  AudioEngine.cpp
  Voice.cpp
  Oscillator.cpp
  Envelope.cpp
  Filter.cpp
  Scheduler.cpp
)

# Include directories
target_include_directories(native-audio-engine PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}
  ${OBOE_DIR}/include
)

# Link libraries
target_link_libraries(native-audio-engine
  oboe
  log
  android
)
```

### AudioEngine.h

```cpp
#ifndef TOPOSONICS_AUDIO_ENGINE_H
#define TOPOSONICS_AUDIO_ENGINE_H

#include <oboe/Oboe.h>
#include <memory>
#include <vector>
#include <mutex>
#include "Voice.h"
#include "Scheduler.h"

namespace toposonics {

class AudioEngine : public oboe::AudioStreamDataCallback {
public:
  AudioEngine();
  ~AudioEngine();

  // Initialization
  bool initialize();
  void shutdown();

  // Preset configuration
  void loadPreset(const PresetConfig& preset);

  // Event scheduling
  void scheduleEvents(const std::vector<NoteEvent>& events);
  void clearEvents();

  // Playback control
  void play();
  void stop();
  void pause();
  void resume();

  // Oboe callback
  oboe::DataCallbackResult onAudioReady(
    oboe::AudioStream* stream,
    void* audioData,
    int32_t numFrames
  ) override;

private:
  static constexpr int kMaxVoices = 16;

  std::shared_ptr<oboe::AudioStream> stream_;
  std::vector<std::unique_ptr<Voice>> voices_;
  std::unique_ptr<Scheduler> scheduler_;

  PresetConfig currentPreset_;

  bool isPlaying_;
  double sampleRate_;
  uint64_t frameCount_;

  std::mutex mutex_;

  // Voice allocation
  Voice* allocateVoice();
  void releaseVoice(Voice* voice);

  // Audio rendering
  void renderAudio(float* buffer, int32_t numFrames);
};

} // namespace toposonics

#endif
```

### Oscillator.h

```cpp
#ifndef TOPOSONICS_OSCILLATOR_H
#define TOPOSONICS_OSCILLATOR_H

#include <cmath>

namespace toposonics {

enum class OscillatorType {
  SINE,
  SQUARE,
  SAWTOOTH,
  TRIANGLE
};

class Oscillator {
public:
  Oscillator();

  void setType(OscillatorType type);
  void setFrequency(float frequency);
  void setSampleRate(float sampleRate);
  void reset();

  float process();

private:
  OscillatorType type_;
  float frequency_;
  float sampleRate_;
  float phase_;
  float phaseIncrement_;

  void updatePhaseIncrement();

  float processSine();
  float processSquare();
  float processSawtooth();
  float processTriangle();
};

} // namespace toposonics

#endif
```

### Envelope.h (ADSR)

```cpp
#ifndef TOPOSONICS_ENVELOPE_H
#define TOPOSONICS_ENVELOPE_H

namespace toposonics {

enum class EnvelopeStage {
  IDLE,
  ATTACK,
  DECAY,
  SUSTAIN,
  RELEASE
};

struct EnvelopeConfig {
  float attack;   // seconds
  float decay;    // seconds
  float sustain;  // 0-1
  float release;  // seconds
};

class Envelope {
public:
  Envelope();

  void configure(const EnvelopeConfig& config, float sampleRate);
  void noteOn();
  void noteOff();
  void reset();

  float process();
  bool isActive() const;

private:
  EnvelopeConfig config_;
  EnvelopeStage stage_;
  float sampleRate_;
  float currentLevel_;
  uint64_t sampleCount_;

  uint64_t attackSamples_;
  uint64_t decaySamples_;
  uint64_t releaseSamples_;
};

} // namespace toposonics

#endif
```

### Voice.h

```cpp
#ifndef TOPOSONICS_VOICE_H
#define TOPOSONICS_VOICE_H

#include "Oscillator.h"
#include "Envelope.h"
#include "Filter.h"

namespace toposonics {

struct NoteEvent {
  float frequency;
  float velocity;
  float pan;
  uint64_t startFrame;
  uint64_t durationFrames;
};

class Voice {
public:
  Voice();

  void configure(
    OscillatorType oscType,
    const EnvelopeConfig& envConfig,
    float sampleRate
  );

  void noteOn(const NoteEvent& event);
  void noteOff();
  void reset();

  bool isActive() const;
  float process();

private:
  Oscillator oscillator_;
  Envelope envelope_;
  Filter filter_;

  float velocity_;
  float pan_;
  bool active_;
};

} // namespace toposonics

#endif
```

---

## Oboe Integration

### Adding Oboe Dependency

1. **Download Oboe**:
   ```bash
   cd packages/native-audio-engine/android/src/main/cpp
   git clone https://github.com/google/oboe.git
   cd oboe
   git checkout 1.7.0  # Use stable release
   ```

2. **Configure in build.gradle**:
   ```gradle
   android {
     externalNativeBuild {
       cmake {
         path file('src/main/cpp/CMakeLists.txt')
         cppFlags '-std=c++17', '-Wall', '-Wextra'
         arguments '-DANDROID_STL=c++_shared'
       }
     }
   }
   ```

---

## Performance Considerations

### Latency Optimization

- Use Oboe's **Fast Mixer** path for < 10ms latency
- Request `Performance::LowLatency` in stream configuration
- Use `SharingMode::Exclusive` if available

### CPU Efficiency

- Pre-calculate phase increments for oscillators
- Use lookup tables for sine waves (optional)
- Implement voice stealing for polyphony limit
- Minimize allocations in audio callback

### Thread Safety

- Audio callback runs on real-time thread
- Use lock-free data structures for event queue
- Protect shared state with mutexes (minimal critical sections)

---

## Integration with Existing Audio Player

### Migration Path

**Phase 1: Parallel Implementation**
- Keep existing `expo-av` implementation
- Add native audio engine as optional feature
- Feature flag: `USE_NATIVE_AUDIO`

**Phase 2: Gradual Rollout**
- Test native engine on select devices
- Compare quality and latency metrics
- Fallback to expo-av if native engine fails

**Phase 3: Full Migration**
- Remove expo-av dependency
- Use native engine exclusively
- Update documentation

### Code Changes in audioPlayer.ts

```typescript
import { createNativeAudioEngine, NoteEvent } from '@toposonics/native-audio-engine';

const audioEngine = createNativeAudioEngine();

export async function playNoteEvents(
  events: NoteEvent[],
  options: PlaybackOptions
): Promise<void> {
  try {
    // Initialize engine
    await audioEngine.initialize();

    // Load preset based on options
    const preset = createPresetFromOptions(options);
    await audioEngine.loadPreset(preset);

    // Schedule events
    await audioEngine.scheduleEvents(events);

    // Play
    await audioEngine.play();

  } catch (error) {
    console.error('Native audio engine failed:', error);
    // Fallback to expo-av if needed
    throw error;
  } finally {
    await audioEngine.shutdown();
  }
}
```

---

## Testing Strategy

### Unit Tests (C++)

- Test oscillator waveform generation
- Test ADSR envelope stages
- Test filter frequency response
- Test voice allocation/deallocation

### Integration Tests

- Test full audio rendering pipeline
- Test event scheduling accuracy
- Test polyphony limits
- Test latency measurements

### Performance Tests

- Measure CPU usage during playback
- Measure memory allocations
- Test on various devices (low-end, high-end)
- Test battery impact

---

## Success Metrics

1. **Latency**: < 10ms round-trip latency
2. **Audio Quality**: No artifacts or clicks
3. **Polyphony**: Support 16+ simultaneous voices
4. **CPU Usage**: < 10% on mid-range devices
5. **Stability**: Zero crashes in 1000+ playback sessions

---

## Timeline Estimate

- **Package Setup**: 2 days
- **Oboe Integration**: 3 days
- **Oscillator Implementation**: 2 days
- **ADSR Envelope**: 2 days
- **Filter Implementation**: 2 days
- **Voice Management**: 3 days
- **Event Scheduler**: 2 days
- **JNI Bridge**: 2 days
- **TypeScript API**: 1 day
- **Testing & Debug**: 5 days
- **Integration**: 2 days

**Total**: ~26 days (1 month with buffer)

---

## Future Enhancements

1. **iOS Support**: Implement using Core Audio / AVAudioEngine
2. **Effects**: Reverb, delay, chorus
3. **Wavetable Synthesis**: More complex waveforms
4. **MIDI Support**: Real-time MIDI input
5. **Audio Recording**: Capture generated audio to file

---

## References

- [Oboe Documentation](https://github.com/google/oboe/blob/main/docs/GettingStarted.md)
- [Android Audio Latency](https://developer.android.com/ndk/guides/audio/audio-latency)
- [Expo Native Modules](https://docs.expo.dev/modules/overview/)
- [Tone.js (Web Reference)](https://tonejs.github.io/)

---

**Document Version**: 1.0
**Last Updated**: 2025-12-05
**Status**: Ready for Implementation
