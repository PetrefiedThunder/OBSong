# Cross-Platform Testing Guide

This guide provides comprehensive testing procedures for ensuring TopoSonics works correctly across Desktop, Android, iOS, and Chrome browser environments.

## Table of Contents
- [Desktop Testing (Mac/Windows/Linux)](#desktop-testing)
- [Chrome Browser Testing](#chrome-browser-testing)
- [Android Testing](#android-testing)
- [iOS Testing](#ios-testing)
- [Performance Testing](#performance-testing)
- [Accessibility Testing](#accessibility-testing)

## Desktop Testing

### macOS (Warp Terminal)

#### Prerequisites
- macOS 11.0 (Big Sur) or higher
- Node.js 18+ installed
- pnpm 8+ installed
- Warp terminal installed

#### Test Procedure
```bash
# 1. Clone and setup
git clone https://github.com/PetrefiedThunder/OBSong.git
cd OBSong
pnpm install
pnpm build

# 2. Run dev servers
pnpm dev:all

# 3. Verify ports
lsof -ti:3000  # Web should be running
lsof -ti:3001  # API should be running

# 4. Test in browsers
open -a "Google Chrome" http://localhost:3000
open -a "Safari" http://localhost:3000
open -a "Firefox" http://localhost:3000
```

#### Expected Results
- ✅ All dependencies install without errors
- ✅ Build completes in < 60 seconds
- ✅ Dev servers start successfully
- ✅ Web app loads in all browsers
- ✅ No console errors in browser DevTools

### Windows (PowerShell/CMD)

#### Prerequisites
- Windows 10/11
- Node.js 18+ installed
- pnpm 8+ installed

#### Test Procedure
```powershell
# 1. Clone and setup
git clone https://github.com/PetrefiedThunder/OBSong.git
cd OBSong
pnpm install
pnpm build

# 2. Run dev servers
pnpm dev:all

# 3. Test in browsers
start chrome http://localhost:3000
start msedge http://localhost:3000
```

#### Expected Results
- ✅ Build completes on Windows without path issues
- ✅ Dev servers start correctly
- ✅ Web app works in Chrome and Edge
- ✅ File uploads work correctly

### Linux (Ubuntu/Debian)

#### Prerequisites
- Ubuntu 20.04+ or Debian 11+
- Node.js 18+ installed
- pnpm 8+ installed

#### Test Procedure
```bash
# 1. Clone and setup
git clone https://github.com/PetrefiedThunder/OBSong.git
cd OBSong
pnpm install
pnpm build

# 2. Run dev servers
pnpm dev:all

# 3. Test in browsers
google-chrome http://localhost:3000
firefox http://localhost:3000
```

## Chrome Browser Testing

### Minimum Chrome Version: 90+
### Recommended: Latest stable Chrome

### Test Matrix

| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| **Web Audio API** | Play composition | ✅ Audio plays without glitches |
| **Canvas API** | Upload image | ✅ Image renders correctly |
| **File Upload** | Drag & drop | ✅ Files upload successfully |
| **Local Storage** | Save settings | ✅ Settings persist on reload |
| **Responsive Design** | Resize window | ✅ Layout adapts smoothly |
| **DevTools** | Open console | ✅ No errors or warnings |

### Chrome-Specific Tests

#### 1. Audio Context Test
```javascript
// Open Chrome DevTools Console (Cmd+Option+J)
// Run this test:
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
console.log('Audio Context State:', audioContext.state);
// Expected: "suspended" or "running"
```

#### 2. Canvas Test
```javascript
// Test canvas support
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
console.log('Canvas 2D Support:', ctx !== null);
// Expected: true
```

#### 3. ES Module Test
```javascript
// Check for ES2020+ support
console.log('BigInt support:', typeof BigInt !== 'undefined');
console.log('Optional chaining:', typeof ({})?.test !== 'undefined');
// Expected: both true
```

### Chrome Performance Profiling

#### Recording Performance
1. Open DevTools (Cmd+Option+J)
2. Go to Performance tab
3. Click Record
4. Perform these actions:
   - Upload an image
   - Generate composition
   - Play composition
   - Stop playback
5. Stop recording
6. Analyze results

#### Expected Metrics
- **Load Time**: < 3 seconds
- **Image Upload**: < 500ms
- **Composition Generation**: < 2 seconds
- **Audio Playback Start**: < 100ms
- **Frame Rate during playback**: > 30 FPS

### Chrome Memory Testing

#### Memory Profiling
1. Open DevTools → Memory tab
2. Take heap snapshot before actions
3. Perform actions (upload, generate, play)
4. Take heap snapshot after
5. Compare snapshots

#### Expected Results
- ✅ No memory leaks (< 10MB growth per cycle)
- ✅ Garbage collection cleans up properly
- ✅ Audio buffers are released after playback

## Android Testing

### Prerequisites
- Android device (Android 8.0+) or emulator
- Expo Go app installed
- Device and dev machine on same WiFi

### Test Procedure

#### 1. Start Expo Dev Server
```bash
cd OBSong
pnpm dev:mobile
```

#### 2. Connect Android Device
```bash
# Scan QR code with Expo Go app
# Or connect via URL in Expo Go
```

#### 3. Test Features

| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| **Navigation** | Navigate between screens | ✅ Smooth transitions |
| **Image Picker** | Select from gallery | ✅ Image loads correctly |
| **Camera** | Take new photo | ✅ Camera opens and captures |
| **API Calls** | Fetch compositions | ✅ Data loads from API |
| **Offline Mode** | Disable WiFi | ✅ Cached data available |
| **Audio** | Play composition | ✅ Audio plays correctly |

#### 4. Device Testing Matrix

Test on multiple Android versions:
- ✅ Android 14 (API 34)
- ✅ Android 13 (API 33)
- ✅ Android 12 (API 32)
- ✅ Android 11 (API 30)
- ✅ Android 10 (API 29)
- ✅ Android 9 (API 28)

### Android-Specific Checks

#### Permissions
```bash
# Check camera permission
adb shell pm list permissions -d -g
# Should show camera permission granted
```

#### Performance
```bash
# Monitor performance
adb shell dumpsys gfxinfo com.toposonics.mobile
# Check for frame drops
```

## iOS Testing

### Prerequisites
- iPhone/iPad (iOS 14.0+) or simulator
- Expo Go app installed (from App Store)
- Device and dev machine on same WiFi

### Test Procedure

#### 1. Start Expo Dev Server
```bash
cd OBSong
pnpm dev:mobile
```

#### 2. Connect iOS Device
```bash
# Scan QR code with Camera app
# Opens in Expo Go automatically
```

#### 3. Test Features

| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| **Sign in with Apple** | Auth flow | ✅ Apple auth works |
| **Haptic Feedback** | Button presses | ✅ Haptics trigger correctly |
| **Image Picker** | Select from Photos | ✅ Image loads correctly |
| **Camera** | Take photo | ✅ Camera permission works |
| **Safe Area** | Notch handling | ✅ UI respects safe areas |
| **Dark Mode** | Toggle in Settings | ✅ Theme adapts correctly |

#### 4. Device Testing Matrix

Test on multiple iOS versions:
- ✅ iOS 17.x
- ✅ iOS 16.x
- ✅ iOS 15.x
- ✅ iOS 14.x

### iOS-Specific Checks

#### Bundle Identifier
```bash
# Check in Expo configuration
cat apps/mobile/app.json | grep bundleIdentifier
```

#### Permissions
Verify `Info.plist` contains:
- Camera usage description
- Photo library usage description
- Microphone usage description (for audio recording)

## Performance Testing

### Load Testing

#### Web App
```bash
# Use Apache Bench or similar tool
ab -n 1000 -c 10 http://localhost:3000/

# Expected:
# - Response time: < 500ms average
# - 0% failed requests
```

#### API Server
```bash
# Test API endpoints
ab -n 1000 -c 10 http://localhost:3001/health

# Expected:
# - Response time: < 100ms average
# - 0% failed requests
```

### Audio Performance

#### Latency Testing
1. Play composition in web app
2. Use DevTools Performance tab
3. Measure time between:
   - Click play button
   - First audio output

**Target**: < 100ms latency

#### Buffer Testing
Test with different buffer sizes:
- Small: 256 samples
- Medium: 512 samples (default)
- Large: 1024 samples

**Expected**: No audio glitches at medium/large sizes

### Image Processing Performance

#### Test Cases
Test with various image sizes:
- Small: 800x600
- Medium: 1920x1080 (recommended)
- Large: 3840x2160 (4K)
- Very Large: 7680x4320 (8K)

#### Expected Processing Times
- Small: < 500ms
- Medium: < 1000ms
- Large: < 2000ms
- Very Large: < 4000ms or memory error

## Accessibility Testing

### Keyboard Navigation
- ✅ Tab through all interactive elements
- ✅ Enter/Space activates buttons
- ✅ Escape closes modals
- ✅ Arrow keys navigate lists

### Screen Reader Testing

#### macOS VoiceOver
```bash
# Enable VoiceOver: Cmd+F5
# Navigate app with VoiceOver enabled
```

#### Checks:
- ✅ All buttons have labels
- ✅ Form inputs have labels
- ✅ Images have alt text
- ✅ Focus order is logical

### Color Contrast
Use Chrome DevTools Lighthouse:
1. Open DevTools
2. Go to Lighthouse tab
3. Run Accessibility audit

**Target Score**: > 90/100

### Responsive Design

#### Test Breakpoints
- ✅ Mobile: 375px (iPhone SE)
- ✅ Tablet: 768px (iPad)
- ✅ Desktop: 1024px
- ✅ Large Desktop: 1920px

#### Chrome DevTools Device Emulation
1. Open DevTools (Cmd+Option+J)
2. Click device toolbar (Cmd+Shift+M)
3. Test on:
   - iPhone 12 Pro
   - iPad Pro
   - Desktop 1920x1080

## Automated Testing

### Linting
```bash
# Run ESLint
pnpm lint

# Expected: 0 errors
```

### Type Checking
```bash
# Run TypeScript compiler
pnpm typecheck

# Expected: 0 type errors
```

### Build Testing
```bash
# Test production build
pnpm build

# Expected: All packages build successfully
```

## Continuous Integration

### GitHub Actions
Check `.github/workflows/` for CI configuration

#### CI Checks:
- ✅ Linting passes
- ✅ Type checking passes
- ✅ Build succeeds
- ✅ No security vulnerabilities

## Issue Reporting

When reporting cross-platform issues, include:

1. **Platform**: macOS/Windows/Linux/Android/iOS
2. **Browser/Version**: Chrome 120, Safari 17, etc.
3. **Node Version**: `node --version`
4. **pnpm Version**: `pnpm --version`
5. **Error Messages**: Full error output
6. **Steps to Reproduce**: Detailed steps
7. **Expected vs Actual**: What should happen vs what happens
8. **Screenshots/Videos**: Visual evidence if applicable

## Testing Checklist

Before releasing:

### Desktop
- [ ] Clone fresh on macOS with Warp terminal
- [ ] Clone fresh on Windows with PowerShell
- [ ] Clone fresh on Linux
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest, macOS only)
- [ ] Test in Edge (latest, Windows only)

### Mobile
- [ ] Test on Android device (latest OS)
- [ ] Test on Android device (older OS)
- [ ] Test on iPhone (latest iOS)
- [ ] Test on iPhone (older iOS)
- [ ] Test on iPad
- [ ] Test Expo Go installation

### Functionality
- [ ] Image upload works
- [ ] Composition generation works
- [ ] Audio playback works
- [ ] MIDI export works
- [ ] Save to library works
- [ ] Authentication works
- [ ] Offline mode works (mobile)

### Performance
- [ ] Load time < 3 seconds
- [ ] Audio latency < 100ms
- [ ] No memory leaks
- [ ] Smooth 60 FPS animations
- [ ] Image processing < 2 seconds

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast passes
- [ ] Responsive on all devices

---

**Testing Complete!** All platforms should work smoothly. ✅
