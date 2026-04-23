# Black Screen on Start - Fix Verification Guide

**Task 3.6 & 3.7**: Verify bug condition exploration test passes and preservation tests still pass

---

## Changes Implemented

The following defensive fixes have been implemented to address the black screen bug:

### 3.1: Defensive Module Import Checks
- Added runtime checks in `loadLevel()` to verify critical imports are defined
- Checks for `LEVELS`, `getLevel`, `STATES`, `TILE`, and `OBJ` constants
- Logs environment information (detects Wavedash environment)
- Logs detailed module load status during state transition

### 3.2: Inline Constant Fallbacks
- Extended inline fallback pattern (similar to line 1367 in handleCloseCall)
- Added fallbacks for `TILE`, `SCREEN_W`, `SCREEN_H` in critical functions
- Used pattern: `const value = (typeof CONSTANT !== 'undefined') ? CONSTANT : fallbackValue`
- Applied to `loadLevel()` spawn point calculation and `updateCamera()` function

### 3.3: State Transition Error Handling
- Wrapped `startTransition` callback in try-catch block
- Added detailed error logging for level load failures
- Logs state before and after transition attempt
- Displays visual error message on canvas if level load fails
- Reverts to title screen on error with error message

### 3.4: Module Load Error Detection
- Added `onerror` handler to script tag in index.html
- Logs module load failures with detailed diagnostic information
- Displays fallback error message on page if main.js fails to load
- Verified `type="module"` attribute is present

### 3.5: Build Process Verification
- Verified build.ps1 copies all JS modules correctly to dist folder
- Verified wavedash.toml has correct `upload_dir = "dist"` setting
- Ran build and confirmed all files are present in dist folder
- Note: Wavedash MIME type configuration is not available in wavedash.toml

---

## Manual Testing Required

### Sub-task 3.6: Verify Bug Condition Test Passes

**IMPORTANT**: Re-run the SAME test from Task 1 (js/blackScreenOnStart.manual.test.md)

**Test Procedure**:

1. **Build the game** (with fixes applied):
   ```bash
   ./build.ps1
   ```

2. **Start Wavedash dev server**:
   ```bash
   wavedash dev
   ```

3. **Open game in browser** (use URL provided by Wavedash)

4. **Open browser DevTools**:
   - Console tab (to see diagnostic logs)
   - Network tab (to check module loading)

5. **Observe title screen** - should display correctly ✓

6. **Press Space key** to trigger state transition

7. **Expected Outcome** (bug should be FIXED):
   - [ ] Screen fades to black briefly (transition effect)
   - [ ] Console shows diagnostic logs:
     ```
     [GAME] Space pressed on title, starting transition...
     [GAME] Transition callback executing...
     [LOAD_LEVEL] Starting level load, index: 1
     [LOAD_LEVEL] Environment check - WavedashJS: present/not present
     [LOAD_LEVEL] Module checks passed, calling getLevel...
     [LOAD_LEVEL] Level data retrieved: success
     [GAME] loadLevel(1) completed successfully
     [GAME] Now in PLAYING state, level loaded.
     ```
   - [ ] Level 1 loads and renders correctly
   - [ ] Game world is visible (tiles, player, obstacles)
   - [ ] Player can move with arrow keys
   - [ ] Player can jump with Space
   - [ ] Game is fully playable
   - [ ] No errors in console
   - [ ] No "LOAD ERROR" message appears

8. **If test FAILS** (black screen persists):
   - Check console for error messages
   - Look for module load failures in Network tab
   - Check if any critical imports are undefined
   - Document the specific error and report back

9. **If test PASSES**: Bug is fixed! ✓

---

### Sub-task 3.7: Verify Preservation Tests Pass

**IMPORTANT**: Re-run the SAME tests from Task 2 (js/blackScreenOnStart.preservation.test.md)

**Quick Verification Checklist**:

#### Test 2.1: Title Screen (Both Environments)

**Wavedash Dev**:
- [ ] Title screen displays correctly
- [ ] No console errors on load
- [ ] All visual elements present

**Python HTTP Server**:
- [ ] Title screen displays correctly (unchanged)
- [ ] No console errors on load
- [ ] Identical to Wavedash dev

#### Test 2.2: Python HTTP Server Game Start

1. Start Python server: `python -m http.server 8000`
2. Open `http://localhost:8000`
3. Press Space on title screen
4. **Expected**: Game loads and works perfectly (unchanged)
   - [ ] Level 1 loads correctly
   - [ ] Game is playable
   - [ ] No regressions

#### Test 2.3: Other Game States

**PAUSED State**:
- [ ] Press P during gameplay → game pauses
- [ ] Press P again → game resumes
- [ ] Works in both environments

**LEVEL_CLEAR State**:
- [ ] Complete level → level clear screen shows
- [ ] Transitions to next level correctly
- [ ] Works in both environments

**GAME_OVER State**:
- [ ] Die → death animation plays
- [ ] Respawn works correctly
- [ ] Works in both environments

#### Test 2.4: ES6 Module Structure

- [ ] All import statements unchanged in main.js
- [ ] All module files exist in js/ folder
- [ ] Build process outputs all files to dist/
- [ ] No module files renamed or moved

---

## Expected Console Output (Fixed Code)

When the game starts successfully under Wavedash dev, you should see:

```
[GAME] Space pressed on title, starting transition...
[GAME] Transition callback executing...
[GAME] State before transition: 0
[GAME] Level before transition: 1
[GAME] Calling loadLevel(1)...
[LOAD_LEVEL] Starting level load, index: 1
[LOAD_LEVEL] Environment check - WavedashJS: present
[LOAD_LEVEL] Module checks passed, calling getLevel...
[LOAD_LEVEL] Level data retrieved: success
[GAME] loadLevel(1) completed successfully
[GAME] State after transition: 1
[GAME] Now in PLAYING state, level loaded.
```

**No errors should appear in the console.**

---

## Troubleshooting

### If Module Load Fails

If you see this error in console:
```
[MODULE_LOAD] CRITICAL: Failed to load main.js module
```

**Possible causes**:
- MIME type issue (Wavedash serving .js files with wrong MIME type)
- Path resolution issue
- CORS policy blocking module load
- Service worker interference

**Check**:
1. Network tab → Find main.js request → Check "Content-Type" header
2. Should be `application/javascript` or `text/javascript`
3. If it's `text/plain` or other, that's the root cause

### If Level Load Fails

If you see this error in console:
```
[GAME] CRITICAL ERROR during state transition
```

**Check**:
- Error message and stack trace in console
- Which module or constant is undefined
- Whether getLevel() returned valid data

### If Game Works in Python Server but Not Wavedash

This confirms the bug is environment-specific. The fixes should handle this, but if it persists:
- Check if Wavedash is using a service worker (Application tab in DevTools)
- Check if service worker is intercepting module requests
- The inline fallbacks should prevent undefined constant errors

---

## Success Criteria

**Task 3.6 PASSES if**:
- Game loads successfully under Wavedash dev server
- Level 1 renders and is playable
- No console errors
- No black screen

**Task 3.7 PASSES if**:
- All preservation tests still pass
- Title screen works in both environments
- Python HTTP server game start still works
- All game states work correctly
- No regressions introduced

---

## Next Steps

1. **Run the manual tests** following this guide
2. **Document results** in the test files
3. **If tests pass**: Mark Task 3 complete ✓
4. **If tests fail**: Document the specific failure and investigate further

---

## Notes

- The fixes are **defensive** - they add error handling and fallbacks without changing core logic
- The fixes should work even if Wavedash serves files with incorrect MIME types
- The inline fallbacks ensure constants are available even if module imports fail
- The error logging helps diagnose any remaining issues
- The visual error display ensures errors are visible in Wavedash environment

