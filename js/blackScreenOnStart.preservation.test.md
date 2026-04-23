# Black Screen on Start - Preservation Property Tests

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

**Property 2: Preservation** - Title Screen and Other Functionality

**CRITICAL**: These tests MUST PASS on unfixed code - passing confirms baseline behavior to preserve

**GOAL**: Document and verify all functionality that should remain unchanged after the fix

**IMPORTANT**: Follow observation-first methodology - test on UNFIXED code first

---

## Overview

These tests verify that the fix for the black screen bug does NOT break any existing functionality. All tests should PASS on both unfixed and fixed code, confirming that the fix only addresses the bug condition without introducing regressions.

**Test Scope**:
- Title screen display and rendering
- Python HTTP server game functionality (baseline environment)
- All game states (PAUSED, LEVEL_CLEAR, GAME_OVER)
- ES6 module structure and imports
- Build process and file structure

---

## Test 2.1: Title Screen Displays Correctly in Both Environments

**Purpose**: Verify that the title screen renders identically in both Wavedash dev server and Python HTTP server environments, with no visual differences or console errors.

**Requirements**: 3.1, 3.2

### Test Procedure - Wavedash Dev Server

**Steps**:

1. Build the game:
   ```bash
   ./build.ps1
   ```

2. Start Wavedash dev server:
   ```bash
   wavedash dev
   ```

3. Open browser and navigate to the URL provided by Wavedash

4. Open browser DevTools Console tab

5. Observe the title screen

**Expected Outcome** (should PASS on unfixed code):

- [ ] Title screen renders with correct background color
- [ ] Title text "MASOCORE" is visible and correctly positioned
- [ ] Subtitle text is visible and correctly positioned
- [ ] Instructions text ("PRESS SPACE TO START") is visible
- [ ] Animated background decorations (rotating particles) are visible
- [ ] No console errors on initial page load
- [ ] No console warnings on initial page load
- [ ] No network errors in Network tab
- [ ] All `.js` files load successfully (check Network tab)
- [ ] All `.js` files have correct MIME type: `application/javascript` or `text/javascript`

**Observations**:
```
[Record observations here]
```

**Status**: [ ] PASS / [ ] FAIL

---

### Test Procedure - Python HTTP Server

**Steps**:

1. Stop Wavedash dev server (if running)

2. Start Python HTTP server:
   ```bash
   python -m http.server 8000
   ```

3. Open browser and navigate to: `http://localhost:8000`

4. Open browser DevTools Console tab

5. Observe the title screen

**Expected Outcome** (should PASS on unfixed code):

- [ ] Title screen renders with correct background color
- [ ] Title text "MASOCORE" is visible and correctly positioned
- [ ] Subtitle text is visible and correctly positioned
- [ ] Instructions text ("PRESS SPACE TO START") is visible
- [ ] Animated background decorations (rotating particles) are visible
- [ ] No console errors on initial page load
- [ ] No console warnings on initial page load
- [ ] No network errors in Network tab
- [ ] All `.js` files load successfully (check Network tab)
- [ ] All `.js` files have correct MIME type: `application/javascript` or `text/javascript`

**Observations**:
```
[Record observations here]
```

**Status**: [ ] PASS / [ ] FAIL

---

### Comparison

**Visual Comparison**:
- [ ] Title screen looks identical in both environments
- [ ] No visual differences in colors, text, or layout
- [ ] Animations run at the same speed in both environments

**Console Comparison**:
- [ ] Same console output in both environments (or no output)
- [ ] No environment-specific errors or warnings

**Overall Test 2.1 Status**: [ ] PASS / [ ] FAIL

---

## Test 2.2: Python HTTP Server Game Start Works Correctly

**Purpose**: Verify that the game works perfectly under Python HTTP server (baseline environment). This establishes the expected behavior that should also work under Wavedash dev server after the fix.

**Requirements**: 3.2, 3.3

### Test Procedure

**Steps**:

1. Ensure Python HTTP server is running:
   ```bash
   python -m http.server 8000
   ```

2. Open browser and navigate to: `http://localhost:8000`

3. Open browser DevTools Console tab

4. Observe title screen displays correctly (from Test 2.1)

5. Press **Space** key to start the game

6. Observe the state transition and level loading

7. Test gameplay functionality

**Expected Outcome** (should PASS on unfixed code):

**State Transition**:
- [ ] Screen fades to black smoothly (transition effect)
- [ ] Transition completes within 1-2 seconds
- [ ] Screen fades back in to show Level 1

**Level Loading**:
- [ ] Level 1 tilemap renders correctly (walls, floors, platforms visible)
- [ ] Player character (Mira) spawns at correct position
- [ ] All obstacles are visible and animated
- [ ] All gear tokens are visible
- [ ] HUD displays correctly (gauge bar, gear counter, death counter)
- [ ] No console errors during level load
- [ ] No console warnings during level load

**Gameplay**:
- [ ] Player can move left/right with arrow keys
- [ ] Player can jump with Space or Up arrow
- [ ] Player collides with walls and platforms correctly
- [ ] Player can collect gear tokens
- [ ] Gear counter increments when tokens are collected
- [ ] Player dies when touching obstacles
- [ ] Death animation plays correctly
- [ ] Player respawns at spawn point after death
- [ ] Gauge bar drains over time
- [ ] Game is fully playable and responsive

**Console Output**:
- [ ] Check for any console logs related to level loading
- [ ] Verify no errors or warnings appear during gameplay
- [ ] Record any console output:
  ```
  [Record console output here]
  ```

**Observations**:
```
[Record observations here]
```

**Status**: [ ] PASS / [ ] FAIL

---

## Test 2.3: Other Game States Work Correctly in Both Environments

**Purpose**: Verify that all game states (PAUSED, LEVEL_CLEAR, GAME_OVER) render and respond to input correctly in both environments.

**Requirements**: 3.4

### Test 2.3.1: PAUSED State

**Test Procedure - Python HTTP Server**:

1. Start game and load Level 1 (press Space on title screen)
2. Press **P** key to pause the game
3. Observe the paused state

**Expected Outcome** (should PASS on unfixed code):
- [ ] Game pauses immediately
- [ ] "PAUSED" text displays on screen
- [ ] Game world is still visible behind pause overlay
- [ ] Obstacles stop moving
- [ ] Player cannot move while paused
- [ ] Press **P** again to unpause
- [ ] Game resumes correctly after unpause
- [ ] No console errors

**Status**: [ ] PASS / [ ] FAIL

---

**Test Procedure - Wavedash Dev Server**:

1. Build and start Wavedash dev server
2. Open game in browser
3. **NOTE**: This test requires the game to start successfully, which may not work on unfixed code under Wavedash
4. If the game starts (after fix), repeat the same steps as Python HTTP server test

**Expected Outcome** (should PASS after fix):
- [ ] Same behavior as Python HTTP server test
- [ ] No environment-specific differences

**Status**: [ ] PASS / [ ] FAIL / [ ] SKIPPED (if game doesn't start on unfixed code)

---

### Test 2.3.2: LEVEL_CLEAR State

**Test Procedure - Python HTTP Server**:

1. Start game and load Level 1
2. Use cheat code or play through level to reach the exit door
3. Collect all gear tokens
4. Enter the exit door to trigger level clear

**Expected Outcome** (should PASS on unfixed code):
- [ ] "LEVEL CLEAR" text displays on screen
- [ ] Particle effects spawn across the screen
- [ ] Death count for the level is displayed
- [ ] Total death count is displayed
- [ ] Screen automatically transitions to next level after ~2 seconds
- [ ] Or press Space to advance immediately
- [ ] Next level loads correctly
- [ ] No console errors

**Status**: [ ] PASS / [ ] FAIL

---

**Test Procedure - Wavedash Dev Server**:

1. Build and start Wavedash dev server
2. Open game in browser
3. **NOTE**: This test requires the game to start successfully, which may not work on unfixed code under Wavedash
4. If the game starts (after fix), repeat the same steps as Python HTTP server test

**Expected Outcome** (should PASS after fix):
- [ ] Same behavior as Python HTTP server test
- [ ] No environment-specific differences

**Status**: [ ] PASS / [ ] FAIL / [ ] SKIPPED (if game doesn't start on unfixed code)

---

### Test 2.3.3: GAME_OVER State

**Test Procedure - Python HTTP Server**:

1. Start game and load Level 1
2. Intentionally die by touching an obstacle
3. Observe the death animation and respawn
4. **NOTE**: GAME_OVER state may require specific conditions (e.g., running out of gauge)

**Expected Outcome** (should PASS on unfixed code):
- [ ] Death animation plays (freeze frame, particles)
- [ ] Screen flashes
- [ ] Player respawns at spawn point
- [ ] Death counter increments
- [ ] Game continues after respawn
- [ ] No console errors

**Status**: [ ] PASS / [ ] FAIL

---

**Test Procedure - Wavedash Dev Server**:

1. Build and start Wavedash dev server
2. Open game in browser
3. **NOTE**: This test requires the game to start successfully, which may not work on unfixed code under Wavedash
4. If the game starts (after fix), repeat the same steps as Python HTTP server test

**Expected Outcome** (should PASS after fix):
- [ ] Same behavior as Python HTTP server test
- [ ] No environment-specific differences

**Status**: [ ] PASS / [ ] FAIL / [ ] SKIPPED (if game doesn't start on unfixed code)

---

**Overall Test 2.3 Status**: [ ] PASS / [ ] FAIL

---

## Test 2.4: ES6 Module Structure Remains Unchanged

**Purpose**: Verify that the ES6 module structure, import statements, and build process remain unchanged. The fix should not require restructuring modules or changing import paths.

**Requirements**: 3.4

### Test 2.4.1: Import Statements in main.js

**Test Procedure**:

1. Open `js/main.js` in a text editor

2. Review all import statements at the top of the file

3. Verify import statements are correct and unchanged

**Expected Outcome** (should PASS on unfixed code):

- [ ] All import statements use relative paths (e.g., `./constants.js`, `./levels.js`)
- [ ] All imported modules exist in the `js/` folder
- [ ] No absolute paths or external URLs in imports
- [ ] Import syntax is correct ES6 syntax: `import { ... } from './module.js'`
- [ ] All imported symbols are used in the code
- [ ] No duplicate imports

**Import Statement Checklist**:
- [ ] `import { SCREEN_W, SCREEN_H, ... } from './constants.js'`
- [ ] `import { drawPixelRect, ... } from './draw.js'`
- [ ] `import { initAudio, ... } from './audio.js'`
- [ ] `import { LEVELS, getLevel, ... } from './levels.js'`
- [ ] `import { WindableObject } from './WindableObject.js'`
- [ ] `import { AutonomousObstacle, ... } from './AutonomousObstacle.js'`
- [ ] `import { createPlayer, ... } from './player.js'`
- [ ] `import { updatePlayerPhysics, ... } from './physics.js'`
- [ ] `import { initInput, ... } from './input.js'`
- [ ] `import { drawHUD, ... } from './ui.js'`
- [ ] `import { deathState, ... } from './deathSystem.js'`
- [ ] `import { TriggerTile, ... } from './trapSystem.js'`
- [ ] `import { LiarCounter } from './liarCounter.js'`

**Status**: [ ] PASS / [ ] FAIL

---

### Test 2.4.2: Module Files Exist and Are Unchanged

**Test Procedure**:

1. List all files in the `js/` folder

2. Verify all imported modules exist

3. Verify no modules have been renamed or moved

**Expected Outcome** (should PASS on unfixed code):

- [ ] `js/constants.js` exists
- [ ] `js/draw.js` exists
- [ ] `js/audio.js` exists
- [ ] `js/levels.js` exists
- [ ] `js/WindableObject.js` exists
- [ ] `js/AutonomousObstacle.js` exists
- [ ] `js/player.js` exists
- [ ] `js/physics.js` exists
- [ ] `js/input.js` exists
- [ ] `js/ui.js` exists
- [ ] `js/deathSystem.js` exists
- [ ] `js/trapSystem.js` exists
- [ ] `js/liarCounter.js` exists
- [ ] `js/main.js` exists
- [ ] No modules have been renamed or moved
- [ ] No new modules have been added (unless required by fix)

**Status**: [ ] PASS / [ ] FAIL

---

### Test 2.4.3: Build Process Outputs Correct Files

**Test Procedure**:

1. Run the build script:
   ```bash
   ./build.ps1
   ```

2. Check the `dist/` folder for output files

3. Verify all necessary files are copied to `dist/`

**Expected Outcome** (should PASS on unfixed code):

- [ ] Build script completes without errors
- [ ] `dist/` folder is created
- [ ] `dist/index.html` exists
- [ ] `dist/js/` folder exists
- [ ] All `.js` files from `js/` folder are copied to `dist/js/` (excluding test files)
- [ ] `dist/css/` folder exists with `style.css`
- [ ] All necessary assets are copied to `dist/`
- [ ] No test files (`.test.js`) are copied to `dist/`
- [ ] File contents are identical to source files (no minification or transformation)

**File Checklist** (in `dist/js/`):
- [ ] `main.js`
- [ ] `constants.js`
- [ ] `draw.js`
- [ ] `audio.js`
- [ ] `levels.js`
- [ ] `WindableObject.js`
- [ ] `AutonomousObstacle.js`
- [ ] `player.js`
- [ ] `physics.js`
- [ ] `input.js`
- [ ] `ui.js`
- [ ] `deathSystem.js`
- [ ] `trapSystem.js`
- [ ] `liarCounter.js`
- [ ] `font.js`
- [ ] `sprites.js`
- [ ] `PhaseShiftObstacle.js`

**Status**: [ ] PASS / [ ] FAIL

---

### Test 2.4.4: index.html Script Tag Configuration

**Test Procedure**:

1. Open `index.html` in a text editor

2. Locate the script tag that loads `main.js`

3. Verify the script tag configuration

**Expected Outcome** (should PASS on unfixed code):

- [ ] Script tag exists: `<script type="module" src="./js/main.js"></script>`
- [ ] `type="module"` attribute is present (required for ES6 modules)
- [ ] `src` path is correct: `./js/main.js`
- [ ] No `defer` or `async` attributes (not needed for type="module")
- [ ] Script tag is in the `<body>` section (after canvas element)

**Status**: [ ] PASS / [ ] FAIL

---

**Overall Test 2.4 Status**: [ ] PASS / [ ] FAIL

---

## Test Summary

### Test Results on Unfixed Code

| Test | Description | Status | Notes |
|------|-------------|--------|-------|
| 2.1 | Title screen displays correctly in both environments | [ ] PASS / [ ] FAIL | |
| 2.2 | Python HTTP server game start works correctly | [ ] PASS / [ ] FAIL | |
| 2.3.1 | PAUSED state works correctly | [ ] PASS / [ ] FAIL | |
| 2.3.2 | LEVEL_CLEAR state works correctly | [ ] PASS / [ ] FAIL | |
| 2.3.3 | GAME_OVER state works correctly | [ ] PASS / [ ] FAIL | |
| 2.4.1 | Import statements in main.js are correct | [ ] PASS / [ ] FAIL | |
| 2.4.2 | Module files exist and are unchanged | [ ] PASS / [ ] FAIL | |
| 2.4.3 | Build process outputs correct files | [ ] PASS / [ ] FAIL | |
| 2.4.4 | index.html script tag configuration is correct | [ ] PASS / [ ] FAIL | |

**Overall Preservation Tests Status**: [ ] PASS / [ ] FAIL

---

## Observations and Notes

**General Observations**:
```
[Record any general observations about the unfixed code behavior]
```

**Environment Differences**:
```
[Record any differences observed between Wavedash dev and Python HTTP server]
```

**Baseline Behavior Confirmed**:
```
[Summarize the baseline behavior that should be preserved after the fix]
```

---

## Conclusion

**Preservation Tests Status**: [ ] PASS / [ ] FAIL

**If PASS**: The baseline behavior has been documented and verified. The fix implementation can proceed with confidence that we know what behavior to preserve.

**If FAIL**: Some baseline functionality is already broken on unfixed code. This may indicate:
- The bug is more widespread than initially thought
- The test environment is not configured correctly
- Additional fixes may be required beyond the black screen bug

---

## Next Steps

1. **After running these tests on unfixed code**: Document all results and observations
2. **Before implementing the fix**: Review the documented baseline behavior
3. **After implementing the fix**: Re-run ALL these tests to verify no regressions
4. **Expected outcome after fix**: All preservation tests should still PASS, confirming no functionality was broken

---

## Notes

- These tests are **expected to PASS** on unfixed code - this is the SUCCESS case for preservation
- If any test FAILS on unfixed code, investigate before proceeding with the fix
- The goal is to document and preserve all existing functionality that currently works
- After the fix, these same tests should still PASS, confirming no regressions

