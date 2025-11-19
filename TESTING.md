# TopoSonics Testing Guide

Manual test procedures for verifying core functionality across the TopoSonics platform.

## Prerequisites

Before testing, ensure you have:

1. ✅ Installed all dependencies: `pnpm install`
2. ✅ Built shared packages: `pnpm build` (or they'll build automatically)
3. ✅ Backend API running: `pnpm dev:api`
4. ✅ Web app running: `pnpm dev:web`
5. ✅ (Optional) Mobile app running: `pnpm dev:mobile`

## Test 1: API Health Check

**Purpose**: Verify backend is running and responding

**Steps**:
1. Open terminal
2. Run: `curl http://localhost:3001/health`
3. Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-...",
     "version": "0.1.0",
     "uptime": 123
   }
   ```

**Pass Criteria**: HTTP 200, status = "ok"

---

## Test 2: Web - Image Upload & Analysis

**Purpose**: Verify image processing pipeline

**Steps**:
1. Navigate to `http://localhost:3000/studio`
2. Click "Select Image" or drag-and-drop an image
   - Use a landscape photo or any image
3. Wait for "Analyzing image..." message to complete
4. Verify image preview displays correctly

**Pass Criteria**:
- Image uploads without errors
- Preview shows correctly
- No console errors
- Analysis completes within ~1-2 seconds

---

## Test 3: Web - Generate Composition

**Purpose**: Verify core-image and core-audio integration

**Steps**:
1. After uploading an image in Studio
2. Configure musical parameters:
   - Key: C
   - Scale: C Major
   - Mapping Mode: Linear Landscape
   - Preset: Soft Sine
3. Click "Generate Composition"
4. Verify Timeline Visualizer displays note events
   - Should show colored bars representing notes
   - X-axis = time, Y-axis = pitch

**Pass Criteria**:
- Note events are generated (check visualizer)
- No errors in console
- Visualizer shows data
- Notes are visible as colored bars

---

## Test 4: Web - Audio Playback

**Purpose**: Verify Tone.js integration and audio synthesis

**Steps**:
1. After generating a composition
2. Click "▶ Play" button
3. Listen for audio output
   - Should hear a sequence of notes
   - Pitch should vary (high/low)
   - May hear stereo panning (left/right)
4. Click "⏹ Stop" button
5. Verify playback stops immediately

**Pass Criteria**:
- Audio plays without glitches
- Notes are audible and pitched correctly
- Stop button works immediately
- No audio artifacts or errors

**Troubleshooting**:
- If no audio: Check browser console, try clicking page first (autoplay policy)
- If garbled audio: Refresh page and regenerate

---

## Test 5: Web - Save Composition

**Purpose**: Verify API integration and authentication

**Steps**:
1. After generating a composition
2. In "Save Composition" card, enter:
   - Title: "Test Mountain Landscape"
   - Description: "Test composition"
3. Click "Save to Library"
4. If prompted for email, enter: `test@example.com`
5. Click save again
6. Verify success message appears

**Pass Criteria**:
- Composition saves successfully
- No errors in console
- Success alert/message appears

**Verify in API**:
```bash
curl http://localhost:3001/compositions
```

Should see your saved composition in the response.

---

## Test 6: Web - View Compositions List

**Purpose**: Verify composition fetching and display

**Steps**:
1. Navigate to `http://localhost:3000/compositions`
2. Verify compositions list displays
   - Should show at least 2 sample compositions (from seed data)
   - Plus any you created in Test 5
3. Verify each card shows:
   - Title
   - Description
   - Key/Scale
   - Note count
   - Created date

**Pass Criteria**:
- List loads without errors
- All compositions visible
- Metadata displays correctly

---

## Test 7: Web - Composition Detail & Replay

**Purpose**: Verify composition playback from storage

**Steps**:
1. From compositions list, click any composition card
2. Verify detail page loads:
   - Title and description
   - Metadata (key, scale, note count, etc.)
   - Playback controls
   - Timeline visualizer
3. Click "▶ Play Composition"
4. Verify audio plays back
5. Adjust tempo slider (60-180 BPM)
6. Play again with new tempo
7. Verify tempo change is audible

**Pass Criteria**:
- Detail page loads correctly
- Playback works
- Tempo adjustment works
- Visualizer shows notes
- No errors

---

## Test 8: Mobile - Navigation

**Purpose**: Verify mobile app navigation structure

**Prerequisites**: Expo dev server running (`pnpm dev:mobile`)

**Steps**:
1. Open Expo Go app on phone or simulator
2. Scan QR code from terminal
3. App should load with Home screen
4. Tap "Create Soundscape" → Should navigate to Editor
5. Tap back arrow → Should return to Home
6. Tap "View Compositions" → Should navigate to Compositions
7. Tap a composition (if any) → Should navigate to Detail

**Pass Criteria**:
- All navigation works smoothly
- No crashes or errors
- Screens render correctly

---

## Test 9: Mobile - Image Picker

**Purpose**: Verify image picker integration

**Steps**:
1. Navigate to Editor screen
2. Tap "Pick from Gallery"
   - Grant permission if requested
3. Select an image from gallery
4. Verify image displays in preview
5. Tap "Change Image"
6. Select different image
7. Verify new image displays

**Pass Criteria**:
- Permissions granted successfully
- Image picker opens
- Selected image displays
- Change image works

---

## Test 10: Mobile - API Integration

**Purpose**: Verify mobile app can fetch from API

**Prerequisites**: API running at `http://localhost:3001`

**Note**: You may need to update API_URL in screens to use your machine's IP (e.g., `http://192.168.1.100:3001`)

**Steps**:
1. Navigate to Compositions screen
2. Verify loading indicator appears
3. Wait for compositions to load
4. Verify list displays compositions from API

**Pass Criteria**:
- API request succeeds
- Compositions display
- No network errors

**Troubleshooting**:
- If fails, update API_URL to your machine's local IP
- Ensure phone/simulator on same network
- Check API is accessible from mobile device

---

## Test 11: End-to-End Web Flow

**Purpose**: Complete workflow from image to saved composition

**Steps**:
1. Start at `http://localhost:3000`
2. Click "Open Studio"
3. Upload a mountain landscape image
4. Wait for analysis
5. Configure:
   - Key: A
   - Scale: A Minor Pentatonic
   - Preset: Rich Sawtooth
   - Keep tempo at 90
6. Click "Generate Composition"
7. Click "Play" and listen to full playback
8. Enter title: "Mountain Sunset"
9. Enter description: "Generated from landscape photo"
10. Save composition
11. Navigate to Compositions page
12. Find "Mountain Sunset" in list
13. Click to view details
14. Play again from detail page

**Pass Criteria**:
- Complete flow works without errors
- Composition sounds appropriate for mountain landscape
- Saved composition persists
- Can replay from library

**Quality Check**:
- Notes should sound cohesive (in A Minor Pentatonic)
- Brightness variations should map to pitch changes
- Panning should be subtle but noticeable

---

## Test 12: Different Mapping Modes

**Purpose**: Verify LINEAR_LANDSCAPE vs DEPTH_RIDGE modes

**Steps**:
1. Upload same image twice (in two sessions)
2. First time, use LINEAR_LANDSCAPE mode
   - Generate and note the pattern
3. Second time, use DEPTH_RIDGE mode
   - Generate and compare pattern

**Expected Differences**:
- DEPTH_RIDGE may have fewer notes (filtered by ridge threshold)
- DEPTH_RIDGE should emphasize edges/peaks more
- Linear should be more continuous

**Pass Criteria**:
- Both modes generate valid compositions
- Some audible difference between modes
- No errors in either mode

---

## Test 13: Performance Test

**Purpose**: Verify performance with various image sizes

**Steps**:
1. Test with small image (<500KB)
2. Test with medium image (1-3MB)
3. Test with large image (>5MB, >3000px wide)
4. Measure analysis time for each

**Pass Criteria**:
- Small: <1s analysis
- Medium: 1-2s analysis
- Large: 2-5s analysis (auto-resized to 1200px)
- No crashes or memory issues

---

## Test 14: Error Handling

**Purpose**: Verify graceful error handling

**Tests**:

**14a. Invalid file type**:
1. Try to upload a .txt or .pdf file
2. Verify appropriate error message

**14b. API offline**:
1. Stop the API server
2. Try to save a composition
3. Verify error message appears
4. Restart API
5. Retry save

**14c. Empty composition**:
1. Try to save without generating notes
2. Verify appropriate validation

**Pass Criteria**:
- Errors are caught and displayed
- No uncaught exceptions in console
- User gets helpful error messages
- App doesn't crash

---

## Test 15: Browser Compatibility

**Purpose**: Verify cross-browser support

**Browsers to Test**:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

**Steps**: Run Tests 2-7 in each browser

**Pass Criteria**:
- All features work in all browsers
- Audio playback works (may require user interaction first in Safari)
- UI renders correctly

---

## Performance Benchmarks

### Expected Performance

| Operation                | Expected Time | Max Acceptable |
| ------------------------ | ------------- | -------------- |
| Image analysis (800x600) | ~5-10ms       | 100ms          |
| Note generation (64)     | <5ms          | 20ms           |
| Tone.js initialization   | 100-300ms     | 1000ms         |
| API composition save     | 50-200ms      | 1000ms         |
| Page load (web)          | 1-2s          | 5s             |

---

## Regression Test Checklist

Before any release, verify:

- [ ] All 15 tests pass
- [ ] No console errors or warnings
- [ ] Audio plays smoothly
- [ ] API endpoints respond correctly
- [ ] Mobile app navigates properly
- [ ] Saved compositions persist
- [ ] Performance within benchmarks

---

## Troubleshooting Guide

### No audio in browser

- Click on page first (autoplay policy)
- Check browser permissions
- Try different browser
- Check system volume
- Open browser console for errors

### API connection errors

- Verify API is running: `curl http://localhost:3001/health`
- Check correct port (3001)
- Verify CORS settings
- Check network tab in devtools

### Image won't upload

- Check file is valid image (JPG, PNG, etc.)
- Try smaller file
- Check browser console
- Try different image

### Mobile app won't connect to API

- Update API_URL to machine's local IP
- Ensure devices on same network
- Check firewall settings
- Verify API accessible: `curl http://<your-ip>:3001/health`

### Tone.js errors

- Refresh page
- Clear browser cache
- Check Tone.js version compatibility
- Verify note events format

---

## Automated Testing (Future)

For production, implement:

- **Unit tests**: Jest for core packages
- **Integration tests**: Supertest for API
- **E2E tests**: Playwright for web app
- **Component tests**: React Testing Library
- **Performance tests**: Lighthouse CI

---

## Test Data

Sample images for testing:
- Mountain landscape (high contrast)
- City skyline (sharp edges)
- Beach sunset (gradual gradients)
- Abstract art (varied patterns)
- Black & white photo (high contrast)

Each should produce noticeably different soundscapes.

---

## Reporting Issues

If tests fail:

1. Note which test failed
2. Capture console errors
3. Note browser/environment
4. Screenshot if UI issue
5. Document steps to reproduce
6. Check GitHub issues

---

## Success Criteria

TopoSonics is ready for demo/release when:

✅ All 15 manual tests pass
✅ No critical console errors
✅ Audio playback is smooth
✅ Image analysis works reliably
✅ API CRUD operations work
✅ Mobile app navigates properly
✅ Performance within benchmarks
✅ Cross-browser compatible
