# Quick Start Guide for Mac & Warp Terminal

This guide provides step-by-step instructions for cloning, setting up, and running the TopoSonics app on macOS with Warp terminal for a live demo in Chrome browser.

## Prerequisites

### 1. Install Warp Terminal (if not already installed)
```bash
# Download from https://www.warp.dev/
# Or install via Homebrew
brew install --cask warp
```

### 2. Install Node.js (v18 or higher)
```bash
# Using Homebrew
brew install node@20

# Verify installation
node --version  # Should show v18.0.0 or higher
```

### 3. Install pnpm (Required - DO NOT use npm)
```bash
# Install pnpm globally
npm install -g pnpm@8.15.0

# Verify installation
pnpm --version  # Should show 8.15.0 or higher
```

## Quick Start (5 Minutes)

### 1. Clone the Repository
```bash
# Clone via HTTPS
git clone https://github.com/PetrefiedThunder/OBSong.git
cd OBSong

# Or clone via SSH
git clone git@github.com:PetrefiedThunder/OBSong.git
cd OBSong
```

### 2. Install Dependencies
```bash
# ⚠️ IMPORTANT: Use pnpm, NOT npm
pnpm install

# This will install all workspace dependencies
# Should complete in 30-60 seconds with good internet
```

### 3. Build All Packages
```bash
# Build shared packages and applications
pnpm build

# This compiles TypeScript and prepares all packages
# Should complete in 20-40 seconds
```

### 4. Start the Development Servers

#### Option A: Run All Services (Recommended for Demo)
```bash
# Start API, Web, and Mobile dev servers concurrently
pnpm dev:all
```

#### Option B: Run Individual Services
```bash
# Terminal 1: Start the API server (port 3001)
pnpm dev:api

# Terminal 2: Start the Web app (port 3000)
pnpm dev:web

# Terminal 3: Start the Mobile app (Expo)
pnpm dev:mobile
```

### 5. Open in Chrome Browser
```bash
# Web application will be available at:
# http://localhost:3000

# Open in Chrome (macOS)
open -a "Google Chrome" http://localhost:3000

# Or manually navigate to http://localhost:3000 in Chrome
```

## Demo Flow in Chrome

### For Live Demo Presentation:

1. **Landing Page** (`http://localhost:3000`)
   - Shows project overview and features
   - Demo compositions play automatically

2. **Studio** (`http://localhost:3000/studio`)
   - Upload an image (drag & drop works great!)
   - Select Scene Pack (Nature, Urban, or Atmospheric)
   - Configure musical parameters:
     - Key & Scale (e.g., C Major, D Minor)
     - Mapping Mode (Linear Landscape or Depth Ridge)
     - Tempo (40-200 BPM)
   - Click "Generate Composition"
   - Use playback controls to play/pause
   - Watch the scanline sweep across the image during playback
   - Export as MIDI or save to library

3. **Compositions** (`http://localhost:3000/compositions`)
   - Browse saved compositions
   - Play back previously generated music
   - View composition metadata

## Environment Configuration (Optional)

For full functionality including authentication and cloud storage:

### Web App (.env.local)
```bash
# Copy example env file
cp apps/web/.env.local.example apps/web/.env.local

# Edit with your values
nano apps/web/.env.local
```

Required variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### API Server (.env)
```bash
# Copy example env file
cp apps/api/.env.example apps/api/.env

# Edit with your values
nano apps/api/.env
```

Required variables:
```env
PORT=3001
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Troubleshooting

### "command not found: pnpm"
**Solution:**
```bash
npm install -g pnpm@8.15.0
```

### "This project requires pnpm" error
**Solution:** This is expected when using npm. Use pnpm instead:
```bash
pnpm install  # NOT npm install
```

### Port 3000 or 3001 already in use
**Solution:** Kill existing processes:
```bash
# Find process on port 3000
lsof -ti:3000 | xargs kill -9

# Find process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Build fails with TypeScript errors
**Solution:** Clean and rebuild:
```bash
pnpm clean
rm -rf node_modules
pnpm install
pnpm build
```

### Chrome shows blank page or errors
**Solution:** 
1. Clear browser cache (Cmd+Shift+Delete)
2. Hard reload (Cmd+Shift+R)
3. Check browser console for errors (Cmd+Option+J)
4. Ensure dev server is running in terminal

## Chrome DevTools Tips for Demo

### Opening DevTools
- `Cmd + Option + J` - Console
- `Cmd + Option + I` - Elements
- `Cmd + Option + C` - Inspect Element

### Useful DevTools Panels
- **Console** - View logs and errors
- **Network** - Monitor API calls
- **Application** - View local storage and cache
- **Performance** - Record and analyze playback

### Recommended Chrome Extensions for Demo
- **React Developer Tools** - Inspect React components
- **Redux DevTools** - Debug state (if using Redux)

## Performance Tips for Smooth Demo

### 1. Close Unnecessary Applications
```bash
# Free up memory before demo
# Close unused browser tabs
# Close heavy applications (Slack, Docker, etc.)
```

### 2. Use Chrome's Performance Mode
- Go to Chrome Settings
- Search for "Performance"
- Enable "Memory Saver" and "Energy Saver"

### 3. Preload Demo Images
- Keep 2-3 landscape images ready
- Recommended: High contrast, clear horizon line
- Format: JPG or PNG, 1920x1080 or similar

### 4. Test Audio Before Demo
```bash
# Check system audio output
# Ensure volume is at comfortable level
# Test with a sample composition
```

## Mobile App (iOS/Android)

### For iOS Demo on Physical Device:
```bash
# 1. Start Expo dev server
pnpm dev:mobile

# 2. Install Expo Go on your iPhone
# Download from App Store

# 3. Scan QR code shown in terminal with Camera app
# Or connect via same WiFi network
```

### For Android Demo on Physical Device:
```bash
# 1. Start Expo dev server
pnpm dev:mobile

# 2. Install Expo Go on your Android device
# Download from Google Play Store

# 3. Scan QR code with Expo Go app
```

## Advanced: Production Build

For deploying or testing production builds:

```bash
# Build for production
pnpm build

# Start production web server
cd apps/web
pnpm start

# Production API server
cd apps/api
pnpm start
```

## Platform-Specific Notes

### macOS (Apple Silicon)
- All packages work natively on M1/M2/M3 chips
- No Rosetta emulation required
- Build times are optimized for ARM architecture

### macOS (Intel)
- Fully supported
- No additional configuration needed

### Chrome Version Requirements
- Minimum: Chrome 90+
- Recommended: Latest stable Chrome
- Features require: Web Audio API, Canvas API, ES2020+

## Warp Terminal Specific Features

### Custom Blocks for Better Output
Warp's blocks feature makes it easy to:
- Separate command outputs visually
- Share specific outputs with team
- Bookmark important commands

### AI Command Search (Optional)
Use Warp's AI to get command suggestions:
- Type `#` to start AI search
- Ask: "How do I start the dev server?"
- Warp will suggest the correct pnpm command

### Workflows (Optional)
Save common command sequences:
1. Click "Workflows" in Warp sidebar
2. Create new workflow: "TopoSonics Demo"
3. Add commands:
   ```
   cd ~/path/to/OBSong
   pnpm dev:all
   open -a "Google Chrome" http://localhost:3000
   ```

## Next Steps

After successful setup, refer to:
- [README.md](../README.md) - Full project documentation
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development guidelines
- [TESTING.md](../TESTING.md) - Manual testing scenarios
- [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) - Technical architecture

## Quick Reference Commands

```bash
# Clone
git clone https://github.com/PetrefiedThunder/OBSong.git

# Setup
cd OBSong && pnpm install && pnpm build

# Run
pnpm dev:all

# Open
open -a "Google Chrome" http://localhost:3000

# Stop
# Press Ctrl+C in terminal
```

## Support

If you encounter issues:
1. Check [GitHub Issues](https://github.com/PetrefiedThunder/OBSong/issues)
2. Review error messages in terminal
3. Check browser console for JavaScript errors
4. Ensure all prerequisites are installed correctly

---

**Ready to Demo!** 🎵 

Your TopoSonics app should now be running in Chrome at http://localhost:3000
