# BROKEN CLOCKWORK

**Broken Clockwork** is a steampunk puzzle-platformer with a "troll" design inspired by "World's Hardest Game." You control the main character using a wind-up key to activate machinery and overcome psychologically deceptive challenges.

## 🎯 Design Philosophy

The game is designed according to the principle: **"The trap must be VISIBLE in hindsight. The player dies and immediately understands why — but never saw it coming the first time."**

The difficulty comes not from reflexes or skill, but from **psychological deception**:
- Areas that look safe but are dangerous
- Wide paths that look easy to navigate but are harder than narrow ones
- Decorative gears that can kill you
- Symmetrical movements with a phase shift
- Obstacles that silently speed up after every 3 deaths

## ⚙️ How to Launch the Game

Since the game uses JavaScript Modules (`type="module"`), you **cannot** open the `index.html` file directly from your browser by double-clicking. You need to run a local server.

### 🖥️ Running Locally

#### Option 1: Using VS Code (Recommended)
1. Install the **Live Server** extension in VS Code.
2. Right-click on the `index.html` file and select **Open with Live Server**.
3. The browser will automatically open the game at `http://localhost:5500`.

#### Option 2: Using NodeJS
If you have NodeJS installed, run the following command in the project directory:
```bash
npx serve .
```
Then access the provided address (usually `http://localhost:3000`).

#### Option 3: Using Python
If you have Python installed:

**Python 3:**
```bash
python -m http.server 8000
```

**Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

Then access `http://localhost:8000` in your browser.

### 🧪 Running Tests
To run the test suite to verify game correctness:
```bash
# Install dependencies (only need to run once)
npm install

# Run all tests
npm test

# Run tests in watch mode (automatically restarts on changes)
npm run test:watch
```

### 🔄 Updating the Build Directory (dist)

After making changes to the code (`js/`, `css/`, etc.), you need to update the `dist/` directory for these changes to take effect when deploying or running from the build:

**Using npm (Recommended):**
```bash
npm run build
```

**Or run the PowerShell script directly:**
```powershell
.\build.ps1
```

This script will:
1. Delete the old `dist/` directory.
2. Create a new directory structure.
3. Copy `index.html`, `css/`, and all game logic from `js/` (excluding test files).

### 🚀 Deploying to Wavedash

Wavedash is a free HTML5 game hosting platform. To deploy the game to Wavedash:

#### Step 1: Install Wavedash CLI
```bash
# Install Wavedash CLI globally
npm install -g wavedash
```

#### Step 2: Log in to Wavedash
```bash
# Log in to your Wavedash account
wavedash login
```

#### Step 3: Build the Game
Run the build script to create the `dist/` directory containing game files (excluding tests and node_modules):

**On Windows (PowerShell):**
```powershell
.\build.ps1
```

**On Linux/Mac:**
```bash
# Create a similar build.sh script or run manually:
mkdir -p dist/css dist/js
cp index.html dist/
cp css/style.css dist/css/
cp js/*.js dist/js/ --exclude="*.test.js" --exclude="*.integration.test.js"
```

#### Step 4: Deploy
```bash
# Deploy game to Wavedash
wavedash deploy
```

Wavedash will:
- Read configuration from `wavedash.toml`
- Upload files in the `dist/` directory
- Provide a URL to play the game online

#### Wavedash Configuration
The `wavedash.toml` file contains the deployment configuration:
```toml
game_id = "j974v1beb094kvdcrnbkv5y4s585938v"  # Your game ID
upload_dir = "dist"                            # Directory containing build files
entrypoint = "index.html"                      # Entry point file
```

#### Deployment Notes
- ✅ Only files in `dist/` are uploaded (no tests, node_modules).
- ✅ Game ID is pre-configured in `wavedash.toml`.
- ✅ Always run `build.ps1` before deploying to ensure `dist/` is updated.
- ⚠️ If you change the code, remember to rebuild before deploying.

---

## 🎮 Controls

| Key | Action |
|------|-----------|
| **W, A, S, D** or **Arrow Keys** | Move / Jump |
| **Space** or **Enter** | Jump / Confirm |
| **E** | Wind up machinery |
| **P** or **Esc** | Pause |
| **R** | Retry |

---

## 🛠️ Core Game Mechanics

- **Wind up:** The world around you has stopped working. You must use your key to power mobile platforms, fans, elevators, and other devices.
- **Energy Gauge:** Winding up consumes energy. Manage your resources well so you don't get stuck.
- **Collect Gears:** Each level has gears to collect to open the exit door.
- **Overcome Obstacles:** Use dexterity and logic to activate machines at the right time, creating a path to the finish.

---

## 🎭 8 Types of Troll Traps

### 1. **Trigger Tiles (Hidden Activation Tiles)**
- **How it works:** Invisible floor tiles that trigger obstacles when stepped on.
- **Sound:** An "activate" sound when the trap is triggered.
- **Death Taunts:** "YOU TRIGGERED THAT.", "WATCH YOUR STEP."

### 2. **FAKE_SAFE_ZONE**
- **How it works:** Areas that look safe, but obstacles will rush in after 1-2 seconds.
- **Characteristics:** Looks identical to a real safe zone.
- **Death Taunts:** "THAT WASN'T SAFE.", "NOWHERE IS SAFE.", "THE SAFE ZONE LIED."

### 3. **TROLL_TOKEN (Trap Gears)**
There are 3 sub-types:

#### a) ONE_WAY_PRISON
- **How it works:** When you pick up the gear, obstacles block the way back.
- **Effect:** You are trapped and cannot turn back.

#### b) RUSH_BAIT
- **How it works:** Picking up the gear increases obstacle speed by 30-40%.
- **Effect:** Everything suddenly moves faster.

#### c) WIND_TRAP (Spawn Trap)
- **How it works:** Picking up the gear spawns additional obstacles near you.
- **Effect:** Balls or dangerous objects appear unexpectedly.

**General Taunts:** "GREED KILLS.", "SHOULD'VE LEFT IT.", "THAT WAS A TRAP. OBVIOUSLY."

**Special UI:** Liar Counter - Displays the incorrect gear count for 0.5 seconds.

### 4. **HIDDEN_KILL_GEAR**
- **How it works:** Among many decorative gears, there is one with a lethal hitbox.
- **Sound:** A low "hum" when nearby (gets louder as you get closer).
- **Characteristics:** Looks identical to normal decorative gears.
- **Death Taunts:** "THAT ONE WAS REAL.", "NOT ALL GEARS ARE DECORATIVE.", "TRUST NOTHING."

### 5. **BAIT_PATH**
- **How it works:** Wide paths look easy to navigate but have MORE obstacles than narrow paths.
- **Psychology:** Players often choose the wide path thinking it's safer.
- **Death Taunts:** "THE EASY PATH IS NEVER EASY.", "WIDE ROADS, NARROW CHANCES."

### 6. **ONE_FRAME_WINDOW**
- **How it works:** The gap between pistons/pendulums is only 0.1 seconds or less.
- **Characteristics:** Passable but requires extremely precise timing.
- **Appearance:** Primarily in Level 5 (HEART OF THE MACHINE).

### 7. **PHASE_SHIFT_OBSTACLE**
- **How it works:** Speed increases by 10% after every 3 deaths.
- **Characteristics:** Changes are very subtle and hard to notice.
- **Reset:** Speed returns to normal when the level is reloaded.
- **Appearance:** Levels 3, 4, 5.

### 8. **ALMOST_MOMENT**
- **How it works:** When the final gear is collected, obstacles block the exit.
- **Sound:** A fake "buzz" from the exit door.
- **Psychology:** Creates tension at the moment of victory.
- **Death Taunts:** "SO CLOSE.", "VICTORY WAS RIGHT THERE.", "ALMOST DOESN'T COUNT."

### 9. **MIRROR_CORRIDOR**
- **How it works:** Two obstacles look symmetrical but have a phase offset.
- **Characteristics:** Movements look the same but timing is different.
- **Psychology:** Players think they are synchronized and miscalculate.
- **Appearance:** Levels 2, 3, 4, 5.

---

## 🗺️ Levels

### Level 1: FIRST TOCK (Introduction)
- **Purpose:** Introduce 4 basic trap types + ALMOST_MOMENT.
- **Traps:** Fake Safe Zone, Troll Token (RUSH_BAIT), Hidden Kill Gear, Bait Path.
- **Difficulty:** Gentle, teaches players not to trust appearances.

### Level 2: THE CAROUSEL (Pattern Deception)
- **Purpose:** Add Mirror Corridor.
- **Traps:** All Level 1 traps + Mirror Corridor with orbit spheres.
- **Difficulty:** Exploits the player's pattern recognition.

### Level 3: THE SENTINEL (Dynamic Difficulty)
- **Purpose:** Add Phase Shift Obstacle.
- **Traps:** All Level 2 traps + Pendulum that speeds up based on death count.
- **Difficulty:** Players must adapt to changing speeds.

### Level 4: THE CLOCK TOWER (Vertical Troll)
- **Purpose:** Traps in a gravity and climbing environment.
- **Traps:** All Level 3 traps in a vertical layout.
- **Difficulty:** Traps exploit the player's focus on climbing.

### Level 5: HEART OF THE MACHINE (The Ultimate Challenge)
- **Purpose:** All 8 trap types combined.
- **Traps:** Includes One Frame Window, multiple Phase Shifts, multiple Mirror Corridors.
- **Difficulty:** Requires mastery of all previous lessons.
- **Special:** Sequence puzzle with multiple traps to confuse thinking.

---

## 🔊 Audio System

The game uses sound to provide subtle clues:

- **Piston Clunk:** A "clunk" sound when a piston moves (helps with timing).
- **Hidden Gear Hum:** A low "hum" when near a lethal gear (volume increases as you get closer).
- **Trigger Activate:** An "activate" sound when a trap is triggered.
- **Fake Exit Buzz:** A fake "buzz" when Almost Moment activates.

**Note:** Audio is a crucial clue. Keep your sound on while playing!

---

## 💀 Death System & Taunts

Each trap type has its own set of taunts when you die:

- **Fake Safe Zone:** "THAT WASN'T SAFE.", "NOWHERE IS SAFE."
- **Troll Token:** "GREED KILLS.", "SHOULD'VE LEFT IT."
- **Hidden Kill Gear:** "THAT ONE WAS REAL.", "TRUST NOTHING."
- **Bait Path:** "THE EASY PATH IS NEVER EASY.", "YOU CHOSE POORLY."
- **Almost Moment:** "SO CLOSE.", "VICTORY WAS RIGHT THERE."

Taunts help you understand **WHY** you died, but only after you've died!

---

## 🧪 Testing & Correctness

The game is developed with **Property-Based Testing** to ensure correctness:

### Running Tests
```bash
npm test
```

### Properties Tested

1. **Trigger Tile Collision Detection** - Accurate collision detection.
2. **Fake Safe Zone Timing** - Correct activation delay.
3. **Obstacle Behavior Preservation** - Obstacles maintain behavior.
4. **Troll Token Trap Activation** - Activates the correct trap type.
5. **Hidden Kill Gear Collision** - Accurate collision and lethality.
6. **Distance-Based Volume** - Volume calculated by distance.
7. **Bait Path Obstacle Density** - Wide paths have more obstacles.
8. **One Frame Window Synchronization** - Accurate timing synchronization.
9. **Phase Shift Speed Calculation** - Speed increases according to formula.
10. **Phase Shift Reset** - Speed resets on reload.
11. **Almost Moment Activation** - Activates when the last gear is collected.
12. **Mirror Corridor Symmetry** - Accurate position symmetry.
13. **Mirror Corridor Phase Offset** - Correct phase offset values.
14. **Trap-Specific Taunt Selection** - Selects the correct taunt for the trap type.
15. **Liar Counter Timer** - Accurate 0.5-second countdown.
16. **Liar Counter Lie Calculation** - Displays incorrect count by ±1.
17. **Proximity Trigger Activation** - Activates based on distance.

**Total:** 266 tests ensure the game works correctly!

---

## 📁 Directory Structure

```
broken-clockwork/
├── index.html              # Entry point
├── css/
│   └── style.css          # Stylesheet
├── js/
│   ├── main.js            # Main game loop
│   ├── input.js           # Keyboard handling
│   ├── constants.js       # Game configuration
│   ├── player.js          # Player logic
│   ├── physics.js         # Physics (gravity, collision)
│   ├── draw.js            # Graphic rendering
│   ├── ui.js              # User interface
│   ├── audio.js           # Audio system
│   ├── levels.js          # Configuration for 5 levels
│   ├── deathSystem.js     # Death & taunt system
│   ├── trapSystem.js      # 8 types of troll traps
│   ├── liarCounter.js     # Liar Gear Counter UI
│   ├── PhaseShiftObstacle.js    # Speeding-up obstacle
│   ├── AutonomousObstacle.js    # Automated obstacle
│   ├── WindableObject.js        # Wind-up object
│   └── *.test.js          # Test files
├── .kiro/
│   └── specs/
│       └── troll-level-redesign/  # Design documentation
│           ├── requirements.md     # Feature requirements
│           ├── design.md          # Detailed design
│           └── tasks.md           # Implementation plan
└── package.json           # Dependencies & scripts
```

---

## 🎓 Pro Tips

1. **Don't trust appearances:** Areas that look safe might be traps.
2. **Listen to the audio:** The "hum" warns of dangerous gears.
3. **Narrow paths might be safer:** Don't always choose the wide path.
4. **Count your deaths:** After every 3 deaths, obstacles might get faster.
5. **Observe carefully after death:** Taunts and replays help you understand traps.
6. **Watch out for the last gear:** It might trigger the Almost Moment trap.
7. **Symmetry doesn't mean synchronization:** Mirror Corridors have a phase offset.
8. **Decorative gears can kill you:** Listen for the "hum" to detect them.

---

## 🛠️ Development & Contributing

### Install Dependencies
```bash
npm install
```

### Running Tests
```bash
npm test              # Run all tests
npm test -- --watch   # Run tests in watch mode
```

### Test Structure
- **Unit Tests:** Test individual components.
- **Integration Tests:** Test interactions between systems.
- **Property-Based Tests:** Test correctness with 100+ random test cases.

### Adding New Levels
1. Open `js/levels.js`.
2. Add a new level configuration with traps.
3. Refer to Levels 1-5 for structure.
4. Write integration tests in `js/levelX.integration.test.js`.

### Adding New Trap Types
1. Add a new class to `js/trapSystem.js`.
2. Add property tests to verify correctness.
3. Add taunts to `js/deathSystem.js`.
4. Add audio (if needed) to `js/audio.js`.
5. Update documentation in the README.

---

## 📚 Design Documentation

Details on design and implementation can be found in the `.kiro/specs/troll-level-redesign/` directory:

- **requirements.md:** 20 functional requirements with acceptance criteria.
- **design.md:** System architecture, data models, 17 correctness properties.
- **tasks.md:** 25 implementation tasks (100% complete).

---

## 🏆 Achievements

- ✅ 266 tests passed
- ✅ 17 correctness properties validated
- ✅ 8 trap types implemented
- ✅ 5 levels redesigned
- ✅ Property-based testing methodology
- ✅ Trap-specific death taunts
- ✅ Audio cue system
- ✅ Liar Counter UI

---

Enjoy your (potentially frustrating) experience with **BROKEN CLOCKWORK**! 🕰️✨

*"The trap must be VISIBLE in hindsight. Player dies and immediately understands why — but never saw it coming the first time."*
