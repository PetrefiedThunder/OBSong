# Audio Assets

## Required File: beep.wav

This directory needs a `beep.wav` file for audio playback functionality.

The file should be:
- A simple beep/tone sound
- WAV format
- Approximately 440 Hz base frequency
- Short duration (0.5-1 second)

This file is referenced in `src/services/audioPlayer.ts` and is used to generate note playback by adjusting the playback rate to achieve different pitches.

## Temporary Workaround

If the beep.wav file is not present, the audio playback feature will fail gracefully with an error message. To fully enable audio playback, add a suitable beep.wav file to this directory.
