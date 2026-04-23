# Black Screen on Start - Bug Condition Exploration Test

**Validates: Requirements 1.1, 1.2, 1.3**

**Property 1: Bug Condition** - Black Screen on Start Under Wavedash Dev

**CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists

**DO NOT attempt to fix the test or the code when it fails**

**NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation

**GOAL**: Surface counterexamples that demonstrate the bug exists

---

## Test Environment Setup

This is an **environment-specific bug** that requires manual testing in both environments:

1. **Wavedash Dev Server** (where bug manifests)
2. **Python HTTP Server** (baseline - works correctly)

---

## Test Procedure

### Phase 1: Baseline Test (Python HTTP Server)

**Purpose**: Confirm the game works correctly in the baseline environment

**Steps**:

1. Start Python HTTP server:
   ```bash
   python -m http.server 8000
   ```

2. Open browser and navigate to: `http://localhost:8000`

3. Open browser DevTools:
   - Console tab (for JavaScript errors)
   - Network tab (for module load failures)

4. Observe title screen displays correctly ✓

5. Press **Space** key to trigger state transition from TITLE to PLAYING

6. **Expected Outcome** (baseline - should PASS):
   - Screen fades to black briefly
   - Level 1 loads successfully
   - Game world renders (tiles, player, obstacles visible)
   - Player can move and interact with the game
   - No errors in Console
   - All `.js` files load with correct MIME type (`application/javascript`)

7. **Document Results**:
   - [ ] Title screen displayed correctly
   - [ ] Space key triggered transition
   - [ ] Level 1 loaded successfully
   - [ ] Game is playable
   - [ ] No console errors
   - [ ] No network errors

---

### Phase 2: Bug Reproduction Test (Wavedash Dev Server)

**Purpose**: Reproduce the bug and identify the exact failure point

**Steps**:

1. Stop Python HTTP server (Ctrl+C)

2. Build the game:
   ```bash
   ./build.ps1
   ```

3. Start Wavedash dev server:
   ```bash
   wavedash dev
   ```

4. Open browser and navigate to the URL provided by Wavedash (typically `http://localhost:3000` or similar)

5. Open browser DevTools:
   - **Console tab** (for JavaScript errors)
   - **Network tab** (for module load failures and MIME types)
   - **Application tab** (to check for service worker activity)

6. Observe title screen displays correctly ✓

7. Press **Space** key to trigger state transition from TITLE to PLAYING

8. **Expected Outcome** (bug condition - should FAIL):
   - Screen goes black and remains black (bug manifests)
   - Level 1 does NOT render
   - Game is unresponsive
   - Console shows errors
   - Network tab may show failed requests or incorrect MIME types

9. **Document Observed Failures** (counterexamples that prove the bug exists):

   **Console Errors**:
   - [ ] Check for module load errors (e.g., "Failed to load module script")
   - [ ] Check for MIME type errors (e.g., "Expected a JavaScript module script but the server responded with a MIME type of 'text/plain'")
   - [ ] Check for undefined errors (e.g., "Cannot read properties of undefined (reading 'length')")
   - [ ] Check for function call errors (e.g., "loadLevel is not a function")
   - [ ] Record exact error messages:
     ```
     [Record error messages here]
     ```

   **Network Tab**:
   - [ ] Check if any `.js` files failed to load (404 errors)
   - [ ] Check MIME types for `.js` files (should be `application/javascript` or `text/javascript`)
   - [ ] Check for CORS errors
   - [ ] Record failed requests:
     ```
     [Record failed requests here]
     ```

   **Application Tab**:
   - [ ] Check if a service worker is registered
   - [ ] Check service worker activity during state transition
   - [ ] Record service worker details:
     ```
     [Record service worker info here]
     ```

   **Game State**:
   - [ ] Check if `game.state` transitioned to `STATES.PLAYING` (use browser console: `window.game.state`)
   - [ ] Check if `loadLevel(1)` executed (check console logs)
   - [ ] Check if level data loaded correctly (use browser console: `window.game.levelData`)
   - [ ] Check if tiles array is populated (use browser console: `window.game.tiles`)
   - [ ] Check if rendering functions execute (check for render errors in console)

10. **Root Cause Analysis**:

Based on the observed failures, identify the most likely root cause:

- [ ] **MIME Type Misconfiguration**: `.js` files served with incorrect MIME type
- [ ] **Service Worker Interference**: Wavedash service worker corrupts module imports
- [ ] **Path Resolution Issues**: Module imports resolve to incorrect paths
- [ ] **CORS Policy Restrictions**: Stricter CORS policies block module loading
- [ ] **Module Caching Issues**: Cached modules are corrupted or unavailable

**Most Likely Root Cause**: _[Fill in based on observations]_

---

## Test Results

### Baseline Test (Python HTTP Server)

**Status**: [ ] PASS / [ ] FAIL

**Notes**:
```
[Record any observations]
```

---

### Bug Reproduction Test (Wavedash Dev Server)

**Status**: [ ] FAIL (expected - confirms bug exists) / [ ] PASS (unexpected - bug not reproduced)

**Counterexamples Found** (evidence that bug exists):
```
[Record all error messages, failed requests, and observations]
```

**Root Cause Hypothesis**:
```
[Based on the evidence, what is the most likely root cause?]
```

---

## Conclusion

**Bug Confirmed**: [ ] YES / [ ] NO

If YES, the test has successfully reproduced the bug and identified counterexamples. The fix implementation can now proceed based on the root cause analysis.

If NO, the bug could not be reproduced. This may indicate:
- The bug has already been fixed
- The test environment is not configured correctly
- The bug is intermittent or requires specific conditions

---

## Next Steps

1. **If bug confirmed**: Proceed to implement the fix based on the root cause analysis
2. **If bug not confirmed**: Re-investigate the bug conditions and update the test procedure
3. **After fix implementation**: Re-run this test to verify the fix works correctly

---

## Notes

- This is a **manual test** because the bug is environment-specific and requires real browser testing
- The test is **expected to FAIL** on unfixed code - this is the SUCCESS case for exploration
- Do NOT attempt to fix the code during this test - the goal is to document the bug
- The counterexamples found will guide the fix implementation
