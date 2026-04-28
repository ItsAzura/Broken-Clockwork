/*
 * ui.js
 * HUD, title, level-clear, game-over overlays, in-world wind prompt,
 * deaths counter, gear counter, taunt panel.
 *
 * Masocore additions:
 *   - Ghost Mira replay (alpha 0.3, drawn behind live Mira)
 *   - Close-call indicators ("!" and "!!" above Mira)
 *   - Checkpoint rendering (brass clock on wall)
 *   - Level clear judge messages
 *   - Second Wind countdown display
 */

import {
  COLORS,
  SCREEN_W,
  SCREEN_H,
  GAUGE_LOW_THRESHOLD,
} from './constants.js';
import {
  drawPixelRect,
  drawPixelBorder,
  drawPixelText,
  drawPixelSprite,
  drawSpeechBubble,
  measurePixelText,
  drawPixelSpriteFlipped,
} from './draw.js';
import { SMALL_GEAR, OBJECT_PALETTE, MIRA, MIRA_PALETTE } from './sprites.js';
import { getLevelClearJudge } from './deathSystem.js';
import { progressionSystem } from './progressionSystem.js';
import { difficultySystem } from './difficultySystem.js';
import { accessibilitySystem } from './accessibilitySystem.js';
import { speedrunSystem } from './speedrunSystem.js';

export function drawHUD(ctx, game) {
  const tick = game.tick;
  const p = game.player;

  const levelLabel = game.levelData.isTutorial ? 'TUTORIAL' : 'LVL ' + String(game.level).padStart(2, '0');
  drawPixelText(
    ctx,
    levelLabel,
    4,
    4,
    COLORS.UI_TEXT,
    1,
  );
  if (!game.levelData.isTutorial) {
    drawPixelText(ctx, game.levelData.name, 4, 14, COLORS.UI_MUTED, 1);
  }

  drawDeathCounter(ctx, game.deathCount || 0, tick);

  ctx.save();
  ctx.translate(SCREEN_W - 10, 10);
  ctx.rotate((tick * 0.05) % (Math.PI * 2));
  ctx.translate(-4, -4);
  drawPixelSprite(ctx, SMALL_GEAR, 0, 0, OBJECT_PALETTE, 1);
  ctx.restore();

  const bx = 4,
    by = SCREEN_H - 18,
    bw = 60,
    bh = 14;
  drawPixelBorder(
    ctx,
    bx,
    by,
    bw,
    bh,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );
  drawPixelText(ctx, 'WIND', bx + 3, by + 3, COLORS.UI_MUTED, 1);

  const gx = bx + 22,
    gy = by + 4,
    gw = 32,
    gh = 5;
  drawPixelRect(ctx, gx, gy, gw, gh, COLORS.GAUGE_BG);
  const fillW = Math.round(gw * (p.gauge / p.gaugeMax));
  const low = p.gauge <= GAUGE_LOW_THRESHOLD;
  const flash = low && Math.floor(tick / 15) % 2 === 0;
  let color = COLORS.GAUGE_FULL;
  if (low) color = flash ? COLORS.GAUGE_LOW : COLORS.GAUGE_BG;
  drawPixelRect(ctx, gx, gy, fillW, gh, color);

  if (game.gearTokens && game.gearTokens.length > 0) {
    // Use liar counter display instead of actual count
    const displayCount = game.liarCounter
      ? game.liarCounter.getDisplayCount()
      : game.gearsCollected || 0;
    const totalGears =
      game.gearTokens.length + (game.trollTokens ? game.trollTokens.length : 0);
    drawGearCounter(ctx, displayCount, totalGears);
  }

  if (game.message && game.messageTimer > 0) {
    const tw = measurePixelText(game.message, 1);
    drawPixelText(
      ctx,
      game.message,
      ((SCREEN_W - tw) / 2) | 0,
      SCREEN_H - 32,
      COLORS.GLOW_WARM,
      1,
    );
  }

  // ─── Second Wind countdown ───
  if (game.secondWindActive && game.secondWindTimer > 0) {
    const countText = Math.ceil(game.secondWindTimer).toString();
    const tw = measurePixelText(countText, 2);
    const pulse = Math.abs(Math.sin(tick * 0.15));
    const alpha = 0.5 + pulse * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawPixelText(
      ctx,
      countText,
      ((SCREEN_W - tw) / 2) | 0,
      30,
      COLORS.GAUGE_LOW,
      2,
    );
    ctx.restore();
  }

  // ─── Difficulty indicator ───
  const difficulty = difficultySystem.getDifficulty();
  const diffShort = difficulty.charAt(0); // C, N, or H
  const diffColor =
    difficulty === 'Casual'
      ? COLORS.GLOW_WARM
      : difficulty === 'Normal'
        ? COLORS.UI_TEXT
        : COLORS.GAUGE_LOW;

  // Draw difficulty indicator in top-right corner
  const diffX = SCREEN_W - 20;
  const diffY = 4;
  drawPixelBorder(
    ctx,
    diffX,
    diffY,
    12,
    10,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );
  drawPixelText(ctx, diffShort, diffX + 3, diffY + 2, diffColor, 1);
}

export function drawDeathCounter(ctx, count, tick) {
  const label = 'DEATHS: ' + String(count).padStart(3, '0');
  const scale = 2;
  const tw = measurePixelText(label, scale);
  const x = ((SCREEN_W - tw) / 2) | 0;
  const y = 4;

  let color = COLORS.UI_TEXT;
  if (count >= 100) color = COLORS.METAL_LIGHT;
  else if (count >= 50) color = COLORS.SPARK_1;
  else if (count >= 25)
    color = Math.floor(tick / 10) % 2 === 0 ? COLORS.GAUGE_LOW : COLORS.UI_BG;
  else if (count >= 10) color = COLORS.GAUGE_LOW;

  drawPixelText(ctx, label, x, y, color, scale);
}

export function drawGearCounter(ctx, collected, total) {
  const label = 'GEARS: ' + collected + '/' + total;
  const tw = measurePixelText(label, 1);
  const x = SCREEN_W - tw - 4;
  const y = SCREEN_H - 8;
  drawPixelText(
    ctx,
    label,
    x,
    y,
    collected === total ? COLORS.GLOW_WARM : COLORS.UI_TEXT,
    1,
  );
}

function getDifficultyColor(difficulty) {
  if (difficulty === 'Casual') return '#FFD700';
  if (difficulty === 'Hardcore') return '#CC3300';
  return '#C8A832';
}

function wrapPixelText(text, maxWidth, scale = 1) {
  const words = String(text || '').split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (measurePixelText(testLine, scale) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

const TITLE_MENU_COLORS = Object.freeze({
  background: '#0D0A00',
  panelBg: '#1A1400',
  border: '#8B6914',
  text: '#C8A832',
  highlight: '#FFD700',
  danger: '#CC3300',
  muted: '#5A4A1A',
  dimGold: '#3A2E0A',
  ink: '#0D0A00',
  scanline: 'rgba(139,105,20,0.08)',
  shadow: 'rgba(13,10,0,0.42)',
  gearWatermark: 'rgba(139,105,20,0.05)',
});

function getTitleDifficultySummary(difficulty) {
  switch (difficulty) {
    case 'Casual':
      return 'Slower obstacles, more forgiving timing, extra safety aids.';
    case 'Hardcore':
      return 'Faster obstacles, tighter timing, no mercy hints or ghost replay.';
    default:
      return 'Balanced obstacle speed with standard safety features enabled.';
  }
}

function ellipsizePixelText(text, maxWidth, scale = 1) {
  const suffix = '...';
  let clipped = String(text || '').trim();
  if (!clipped) return '';
  if (measurePixelText(clipped, scale) <= maxWidth) return clipped;

  while (
    clipped.length > 0 &&
    measurePixelText(`${clipped}${suffix}`, scale) > maxWidth
  ) {
    clipped = clipped.slice(0, -1).trimEnd();
  }

  return clipped ? `${clipped}${suffix}` : suffix;
}

function wrapPixelTextClamped(text, maxWidth, maxLines, scale = 1) {
  if (maxLines <= 0) return [];

  const lines = wrapPixelText(text, maxWidth, scale);
  if (lines.length <= maxLines) return lines;

  const clamped = lines.slice(0, maxLines - 1);
  const overflowLine = lines.slice(maxLines - 1).join(' ');
  clamped.push(ellipsizePixelText(overflowLine, maxWidth, scale));
  return clamped;
}

export function getTitleMenuOptions(titleState = {}) {
  const { isFirstTimePlayer = false } = titleState;

  if (isFirstTimePlayer) {
    return [
      {
        selection: 0,
        label: 'START TUTORIAL',
        key: 'ENTER',
        accent: COLORS.GLOW_WARM,
        subtitle: 'Guided walkthrough',
        description:
          'Learn the basics step-by-step as you play your first level.',
        isPrimary: true,
      },
      {
        selection: 1,
        label: 'QUICK START',
        key: 'Q',
        accent: COLORS.METAL_LIGHT,
        subtitle: 'Jump straight in',
        description: 'Skip the tutorial and start playing immediately.',
        isPrimary: false,
      },
      {
        selection: 2,
        label: 'SETTINGS',
        key: 'O',
        accent: COLORS.METAL_LIGHT,
        subtitle: 'Audio · Controls · Accessibility',
        description:
          'Configure difficulty, audio, controls, and accessibility options.',
        isPrimary: false,
      },
    ];
  }

  // For returning players
  return [
    {
      selection: 0,
      label: 'BEGIN RUN',
      key: 'ENTER',
      accent: COLORS.GLOW_WARM,
      subtitle: 'Start Level 1',
      description: 'Jump into Level 1 with your current difficulty settings.',
      isPrimary: true,
    },
    {
      selection: 1,
      label: 'SETTINGS',
      key: 'O',
      accent: COLORS.METAL_LIGHT,
      subtitle: 'Audio · Controls · Accessibility',
      description:
        'Adjust difficulty, audio levels, control mapping, and accessibility.',
      isPrimary: false,
    },
  ];
}

export function getTitleMenuLayout(titleState = {}) {
  const options = getTitleMenuOptions(titleState);

  // ═══ REFACTORED CLEAN LAYOUT ═══
  // Left panel: Purely Identity & Brand (wider, more breathing room)
  const heroPanel = { x: 12, y: 12, w: 184, h: 120 };

  // Right panel: Focus on Action (centered buttons)
  const actionPanel = { x: 204, y: 12, w: 104, h: 120 };

  // Bottom bar: Subtle HUD (full width, less boxy)
  const footerPanel = { x: 12, y: 138, w: SCREEN_W - 24, h: 30 };

  // ═══ ACTION BUTTONS LAYOUT ═══
  const buttonHeight = 28;
  const buttonGap = 6;
  const totalButtonHeight = options.length * buttonHeight + (options.length - 1) * buttonGap;
  const buttonStartY = actionPanel.y + ((actionPanel.h - totalButtonHeight) / 2 | 0) + 4;

  const buttons = options.map((option, index) => ({
    ...option,
    x: actionPanel.x + 4,
    y: buttonStartY + index * (buttonHeight + buttonGap),
    w: actionPanel.w - 8,
    h: buttonHeight,
  }));

  // ═══ SETTINGS CHIPS (Tucked at bottom of hero panel) ═══
  const toggleY = heroPanel.y + heroPanel.h - 18;
  const chipW = 82;
  const chipGap = 8;
  
  return {
    options,
    heroPanel,
    actionPanel,
    footerPanel,
    footerStats: {
      x: footerPanel.x + 8,
      y: footerPanel.y + 11,
      w: 160,
    },
    footerTooltip: {
      x: footerPanel.x + footerPanel.w - 110,
      y: footerPanel.y + 7,
      w: 102,
      h: 18,
    },
    difficultyChip: {
      x: heroPanel.x + 8,
      y: toggleY,
      w: chipW,
      h: 12,
    },
    speedrunChip: {
      x: heroPanel.x + 8 + chipW + chipGap,
      y: toggleY,
      w: heroPanel.w - chipW - chipGap - 16,
      h: 12,
    },
    buttons,
  };
}

function pointInRect(x, y, rect) {
  return (
    x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
  );
}

export function getTitleMenuInteraction(titleState = {}, x, y) {
  const layout = getTitleMenuLayout(titleState);
  const button = layout.buttons.find((candidate) =>
    pointInRect(x, y, candidate),
  );
  if (button) {
    return { type: 'menu', selection: button.selection };
  }
  if (pointInRect(x, y, layout.difficultyChip)) {
    return { type: 'difficulty' };
  }
  if (pointInRect(x, y, layout.speedrunChip)) {
    return { type: 'speedrun' };
  }
  return null;
}

function drawTitleSelectionCursor(ctx, x, y, color) {
  drawPixelRect(ctx, x, y + 2, 1, 3, color);
  drawPixelRect(ctx, x + 1, y + 1, 1, 5, color);
  drawPixelRect(ctx, x + 2, y, 1, 7, color);
}

function drawTitleToggle(
  ctx,
  rect,
  label,
  value,
  valueColor,
  highlighted = false,
  hovered = false,
) {
  // Determine border style based on state
  const isActive = highlighted || hovered;
  const borderColor = isActive
    ? TITLE_MENU_COLORS.highlight
    : TITLE_MENU_COLORS.border;
  const borderWidth = isActive ? 2 : 1;

  drawPixelBorder(
    ctx,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    borderColor,
    TITLE_MENU_COLORS.muted,
    TITLE_MENU_COLORS.panelBg,
    borderWidth,
  );

  // Draw directional arrows only on hover
  if (hovered) {
    drawPixelText(
      ctx,
      '◀',
      rect.x + 3,
      rect.y + 2,
      TITLE_MENU_COLORS.highlight,
      1,
    );
    drawPixelText(
      ctx,
      '▶',
      rect.x + rect.w - 9,
      rect.y + 2,
      TITLE_MENU_COLORS.highlight,
      1,
    );
  }

  // Draw label and value (centered with arrows visible)
  const labelX = hovered ? rect.x + 12 : rect.x + 4;
  drawPixelText(ctx, label, labelX, rect.y + 2, TITLE_MENU_COLORS.muted, 1);

  const valueX = labelX + measurePixelText(label, 1) + 3;
  drawPixelText(ctx, value, valueX, rect.y + 2, valueColor, 1);
}

function drawTitleFooterStat(
  ctx,
  x,
  y,
  label,
  value = '',
  labelColor = TITLE_MENU_COLORS.muted,
) {
  // Draw label
  drawPixelText(ctx, label, x, y, labelColor, 1);
  let width = measurePixelText(label, 1);

  // Draw value (if provided)
  if (value) {
    drawPixelText(ctx, value, x + width + 5, y, TITLE_MENU_COLORS.highlight, 1);
    width += 5 + measurePixelText(value, 1);
  }

  return width;
}

function getTitleTooltipContent(
  titleState,
  layout,
  activeOption,
  difficulty,
  speedrunEnabled,
) {
  const hoverRegion = titleState.hoverRegion || null;
  const tooltipWidth = layout.footerTooltip.w - 6;

  // Show helpful info based on what the player is hovering over
  if (hoverRegion && hoverRegion.type === 'difficulty') {
    const diffSummary = getTitleDifficultySummary(difficulty);
    return {
      title: 'DIFFICULTY',
      lines: wrapPixelTextClamped(diffSummary, tooltipWidth, 2, 1),
    };
  }

  if (hoverRegion && hoverRegion.type === 'speedrun') {
    const speedrunCopy = speedrunEnabled
      ? 'Active: timer & ghost tracking enabled.'
      : 'Enable timer and performance tracking.';
    return {
      title: 'SPEEDRUN',
      lines: wrapPixelTextClamped(speedrunCopy, tooltipWidth, 2, 1),
    };
  }

  if (hoverRegion && hoverRegion.type === 'menu') {
    const hoveredOption = layout.options.find(
      (option) => option.selection === hoverRegion.selection,
    );
    if (hoveredOption) {
      return {
        title: hoveredOption.label,
        lines: wrapPixelTextClamped(
          hoveredOption.description,
          tooltipWidth,
          2,
          1,
        ),
      };
    }
  }

  // Default tooltip when nothing is hovered
  return {
    title: 'HOVER INFO',
    lines: ['Hover over buttons', 'for more details'],
  };
}

export function drawTitle(ctx, tick, titleState = {}) {
  const {
    selectedOption = 0,
    isFirstTimePlayer = false,
    speedrunEnabled = false,
    hoverRegion = null,
  } = titleState;

  const layout = getTitleMenuLayout(titleState);
  const menuOptions = layout.options;
  const activeIndex = Math.max(
    0,
    Math.min(selectedOption, menuOptions.length - 1),
  );
  const activeOption = menuOptions[activeIndex];

  // ═══ BACKGROUND & ATMOSPHERE ═══
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, TITLE_MENU_COLORS.background);
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, TITLE_MENU_COLORS.shadow);

  // Subtle scanlines for CRT feel
  for (let y = 0; y < SCREEN_H; y += 8) {
    drawPixelRect(ctx, 0, y, SCREEN_W, 1, TITLE_MENU_COLORS.scanline);
  }

  // Outer frame border
  drawPixelBorder(
    ctx,
    4,
    4,
    SCREEN_W - 8,
    SCREEN_H - 8,
    TITLE_MENU_COLORS.border,
    TITLE_MENU_COLORS.muted,
    'rgba(0,0,0,0)',
    1,
  );

  // Rotating background gears (ambient decoration)
  drawBgGears(ctx, tick, {
    outer: TITLE_MENU_COLORS.border,
    inner: TITLE_MENU_COLORS.muted,
  });

  // ═══ ZONE A — IDENTITY & SETTINGS (LEFT PANEL) ═══
  drawTitleHeroPanel(ctx, layout, tick, hoverRegion, speedrunEnabled);

  // ═══ ZONE B — MAIN ACTION BUTTONS (RIGHT PANEL) ═══
  drawTitleActionPanel(ctx, layout, activeIndex, hoverRegion, menuOptions, tick);

  // ═══ ZONE C — PROGRESSION & INFO (BOTTOM BAR) ═══
  drawTitleFooterPanel(ctx, layout, hoverRegion, activeOption);
}

/**
 * Renders the left panel with game identity, description, and difficulty/speedrun toggles.
 */
function drawTitleHeroPanel(ctx, layout, tick, hoverRegion, speedrunEnabled) {
  // Hero panel border (using a more subtle double-border for depth)
  drawPixelBorder(
    ctx,
    layout.heroPanel.x,
    layout.heroPanel.y,
    layout.heroPanel.w,
    layout.heroPanel.h,
    TITLE_MENU_COLORS.border,
    TITLE_MENU_COLORS.muted,
    TITLE_MENU_COLORS.panelBg,
    1,
  );

  // Animated gear watermark (moved to top-right for better balance)
  drawGearWatermark(
    ctx,
    layout.heroPanel.x + layout.heroPanel.w - 30,
    layout.heroPanel.y + 25,
    tick,
  );

  // Game title: Emphasized and cleaner
  drawPixelText(
    ctx,
    'BROKEN',
    layout.heroPanel.x + 10,
    layout.heroPanel.y + 12,
    TITLE_MENU_COLORS.text,
    4, // Increased scale for impact
  );
  drawPixelText(
    ctx,
    'CLOCKWORK',
    layout.heroPanel.x + 10,
    layout.heroPanel.y + 44,
    TITLE_MENU_COLORS.highlight,
    2,
  );

  // Warning tagline (more subtle, acts as a divider)
  ctx.save();
  ctx.globalAlpha = 0.8;
  drawPixelRect(ctx, layout.heroPanel.x + 10, layout.heroPanel.y + 64, 40, 1, TITLE_MENU_COLORS.danger);
  drawPixelText(
    ctx,
    'EVERYTHING HERE IS HOSTILE.',
    layout.heroPanel.x + 10,
    layout.heroPanel.y + 70,
    TITLE_MENU_COLORS.danger,
    1,
  );
  ctx.restore();

  // Description (Simplified to 1 line for clarity)
  const description = 'A precision trap platformer.';
  drawPixelText(
    ctx,
    description,
    layout.heroPanel.x + 10,
    layout.heroPanel.y + 84,
    TITLE_MENU_COLORS.muted,
    1,
  );

  // Difficulty and Speedrun toggles
  const difficulty = difficultySystem.getDifficulty();
  const diffColor = getDifficultyColor(difficulty);
  const isDiffHovered = hoverRegion && hoverRegion.type === 'difficulty';
  const isSpeedHovered = hoverRegion && hoverRegion.type === 'speedrun';

  drawTitleToggle(
    ctx,
    layout.difficultyChip,
    'DIFF',
    difficulty.toUpperCase(),
    diffColor,
    false,
    isDiffHovered,
  );
  drawTitleToggle(
    ctx,
    layout.speedrunChip,
    'SPD',
    speedrunEnabled ? 'ON' : 'OFF',
    speedrunEnabled ? TITLE_MENU_COLORS.highlight : TITLE_MENU_COLORS.text,
    speedrunEnabled,
    isSpeedHovered,
  );
}

/**
 * Renders the right panel with main action buttons (Start, Settings, etc).
 */
function drawTitleActionPanel(
  ctx,
  layout,
  activeIndex,
  hoverRegion,
  menuOptions,
  tick,
) {
  // Action panel border (cleaner, no background for floaty feel)
  drawPixelBorder(
    ctx,
    layout.actionPanel.x,
    layout.actionPanel.y,
    layout.actionPanel.w,
    layout.actionPanel.h,
    TITLE_MENU_COLORS.border,
    TITLE_MENU_COLORS.muted,
    'rgba(0,0,0,0)',
    1,
  );

  // Header (Subtle)
  drawPixelText(
    ctx,
    'OPTIONS',
    layout.actionPanel.x + 6,
    layout.actionPanel.y + 6,
    TITLE_MENU_COLORS.muted,
    1,
  );

  // Draw each button
  for (let i = 0; i < layout.buttons.length; i++) {
    const option = layout.buttons[i];
    const isSelected = i === activeIndex;
    const isHovered = hoverRegion && hoverRegion.type === 'menu' && hoverRegion.selection === option.selection;
    
    drawTitleButton(ctx, option, option.isPrimary, isSelected || isHovered, tick);
  }

  // Visual guide at bottom
  const dotX = layout.actionPanel.x + (layout.actionPanel.w / 2 | 0);
  const dotY = layout.actionPanel.y + layout.actionPanel.h - 8;
  drawPixelRect(ctx, dotX - 10, dotY, 20, 1, TITLE_MENU_COLORS.muted);
}

/**
 * Renders a single button with primary/secondary styling.
 */
function drawTitleButton(ctx, option, isPrimary, isSelected, tick = 0) {
  const isFocused = isSelected;
  
  // Primary button has a gentle pulse effect if it's the first option or specifically marked
  let pulse = 0;
  if (isPrimary) {
    pulse = Math.sin(tick * 0.1) * 0.15;
  }

  // Button styling
  const fillColor = isFocused
    ? TITLE_MENU_COLORS.highlight
    : isPrimary 
      ? `rgba(200, 168, 50, ${0.1 + pulse})` // Subtle glow for primary when not focused
      : TITLE_MENU_COLORS.panelBg;
      
  const textColor = isFocused
    ? TITLE_MENU_COLORS.ink
    : TITLE_MENU_COLORS.highlight;
    
  const borderColor = isFocused
    ? TITLE_MENU_COLORS.highlight
    : isPrimary
      ? TITLE_MENU_COLORS.text
      : TITLE_MENU_COLORS.muted;
      
  const borderWidth = isFocused ? 2 : 1;

  // Draw button background and border
  drawPixelBorder(
    ctx,
    option.x,
    option.y,
    option.w,
    option.h,
    borderColor,
    TITLE_MENU_COLORS.muted,
    fillColor,
    borderWidth,
  );

  // Draw directional marker (▶) for selected
  if (isFocused) {
    const markerY = option.y + (((option.h - 7) / 2) | 0);
    drawPixelText(ctx, '▶', option.x + 4, markerY, textColor, 1);
  }

  // Button label and subtitle
  const labelY = option.y + (((option.h - 7) / 2) | 0) - 4;
  const labelX = isFocused ? option.x + 12 : option.x + 6;

  drawPixelText(ctx, option.label, labelX, labelY, textColor, 1);

  // Subtitle text (only shown on focus/hover or for primary)
  if (isFocused || isPrimary) {
    const subtitleY = labelY + 10;
    const subtitleColor = isFocused
      ? 'rgba(13,10,0,0.7)'
      : TITLE_MENU_COLORS.muted;
    drawPixelText(ctx, option.subtitle, labelX, subtitleY, subtitleColor, 1);
  }
}

/**
 * Renders the bottom panel with progression stats and hover tooltips.
 */
function drawTitleFooterPanel(ctx, layout, hoverRegion, activeOption) {
  // Footer panel: Horizontal line separator instead of a full box
  drawPixelRect(
    ctx,
    layout.footerPanel.x,
    layout.footerPanel.y,
    layout.footerPanel.w,
    1,
    TITLE_MENU_COLORS.border,
  );

  // Get progression data
  const unlockedAchievements = progressionSystem.getUnlockedAchievements().length;
  const totalAchievements = progressionSystem.getAllAchievements().length;
  const unlockedSkins = progressionSystem.getUnlockedSkins().length;

  // Draw stats in a single clean row
  let statX = layout.footerStats.x;
  const statY = layout.footerStats.y;

  const stats = [
    { label: 'LVL', value: '1' },
    { label: 'BADGES', value: `${unlockedAchievements}/${totalAchievements}` },
    { label: 'SKINS', value: `${unlockedSkins}` },
  ];

  for (let i = 0; i < stats.length; i++) {
    const stat = stats[i];
    statX += drawTitleFooterStat(
      ctx,
      statX,
      statY,
      stat.label,
      stat.value,
      TITLE_MENU_COLORS.muted,
    );

    if (i < stats.length - 1) {
      drawPixelText(ctx, '·', statX + 4, statY, TITLE_MENU_COLORS.dimGold, 1);
      statX += 12;
    }
  }

  // Tooltip content (Dynamic hint line)
  const difficulty = difficultySystem.getDifficulty();
  const speedrunEnabled = speedrunSystem.isEnabled();
  const tooltip = getTitleTooltipContent(
    { hoverRegion },
    layout,
    activeOption,
    difficulty,
    speedrunEnabled,
  );

  // Calculate available space for the hint to prevent overlap with stats
  const footerRightEdge = layout.footerPanel.x + layout.footerPanel.w - 8;
  const statsRightEdge = statX + 16; // statX is where the last stat ended + padding
  const maxHintWidth = footerRightEdge - statsRightEdge;

  // Draw tooltip title (active region) or helpful hint
  let hintText = hoverRegion 
    ? `${tooltip.title}: ${tooltip.lines[0]}` 
    : 'Hover options for details · ESC to exit';
  
  // Ellipsize if it's too long for the remaining space
  if (measurePixelText(hintText, 1) > maxHintWidth) {
    // If it's still too long, try just the line without the title if hovered
    if (hoverRegion && tooltip.lines && tooltip.lines.length > 0) {
      hintText = tooltip.lines[0];
      if (measurePixelText(hintText, 1) > maxHintWidth) {
        hintText = ellipsizePixelText(hintText, maxHintWidth, 1);
      }
    } else {
      hintText = ellipsizePixelText(hintText, maxHintWidth, 1);
    }
  }

  const hintW = measurePixelText(hintText, 1);
  
  // Right-aligned hint text
  drawPixelText(
    ctx,
    hintText,
    footerRightEdge - hintW,
    statY,
    hoverRegion ? TITLE_MENU_COLORS.highlight : TITLE_MENU_COLORS.muted,
    1,
  );
}

function drawBgGears(ctx, tick, palette = null) {
  const gears = [
    { cx: 28, cy: 26, r: 16, dir: 1, teeth: 8 },
    { cx: 292, cy: 24, r: 12, dir: -1, teeth: 6 },
    { cx: 22, cy: 156, r: 12, dir: -1, teeth: 6 },
    { cx: 292, cy: 154, r: 18, dir: 1, teeth: 10 },
  ];
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (const g of gears) {
    const ang = tick * 0.005 * g.dir;
    ctx.fillStyle = palette && palette.outer ? palette.outer : COLORS.TILE_MID;
    for (let i = 0; i < g.teeth; i++) {
      const a = ang + (i / g.teeth) * Math.PI * 2;
      const x = g.cx + Math.cos(a) * g.r;
      const y = g.cy + Math.sin(a) * g.r;
      ctx.fillRect((x - 1) | 0, (y - 1) | 0, 3, 3);
    }
    ctx.fillStyle = palette && palette.inner ? palette.inner : COLORS.TILE_DARK;
    for (let a = 0; a < 20; a++) {
      const aa = (a / 20) * Math.PI * 2 + ang * 0.5;
      const outerX = g.cx + Math.cos(aa) * (g.r - 4);
      const outerY = g.cy + Math.sin(aa) * (g.r - 4);
      if (a % 2 === 0) {
        ctx.fillRect(outerX | 0, outerY | 0, 1, 1);
      }
    }
    ctx.fillRect((g.cx - 2) | 0, (g.cy - 2) | 0, 4, 4);
  }
  ctx.restore();
}

function drawGearWatermark(ctx, cx, cy, tick) {
  // Draw a subtle gear watermark in the hero panel
  const r = 24;
  const teeth = 12;
  const ang = tick * 0.003;

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = TITLE_MENU_COLORS.border;

  // Draw gear teeth
  for (let i = 0; i < teeth; i++) {
    const a = ang + (i / teeth) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    ctx.fillRect((x - 1) | 0, (y - 1) | 0, 3, 3);
  }

  // Draw inner circle
  for (let a = 0; a < 24; a++) {
    const aa = (a / 24) * Math.PI * 2 + ang * 0.5;
    const outerX = cx + Math.cos(aa) * (r - 6);
    const outerY = cy + Math.sin(aa) * (r - 6);
    if (a % 2 === 0) {
      ctx.fillRect(outerX | 0, outerY | 0, 1, 1);
    }
  }

  // Center hub
  ctx.fillRect((cx - 3) | 0, (cy - 3) | 0, 6, 6);

  ctx.restore();
}

export function drawLevelClear(ctx, levelDeaths, totalDeaths, tick) {
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.7)');

  const t = 'YOU DID IT.';
  const tw = measurePixelText(t, 3);
  drawPixelText(
    ctx,
    t,
    ((SCREEN_W - tw) / 2) | 0,
    SCREEN_H / 2 - 30,
    COLORS.GLOW_WARM,
    3,
  );

  // ─── Level Clear Judge ───
  const judgeMsg = getLevelClearJudge(levelDeaths);
  const jw = measurePixelText(judgeMsg, 1);
  // Color based on death tier
  let judgeColor = COLORS.GLOW_WARM;
  if (levelDeaths > 50) judgeColor = COLORS.GAUGE_LOW;
  else if (levelDeaths > 30) judgeColor = COLORS.SPARK_2;
  else if (levelDeaths > 15) judgeColor = COLORS.METAL_LIGHT;
  drawPixelText(
    ctx,
    judgeMsg,
    ((SCREEN_W - jw) / 2) | 0,
    SCREEN_H / 2 - 4,
    judgeColor,
    1,
  );

  const sub1 = 'DEATHS THIS LEVEL: ' + levelDeaths;
  const sw1 = measurePixelText(sub1, 1);
  drawPixelText(
    ctx,
    sub1,
    ((SCREEN_W - sw1) / 2) | 0,
    SCREEN_H / 2 + 14,
    COLORS.UI_MUTED,
    1,
  );

  const sub2 = 'TOTAL: ' + totalDeaths;
  const sw2 = measurePixelText(sub2, 1);
  drawPixelText(
    ctx,
    sub2,
    ((SCREEN_W - sw2) / 2) | 0,
    SCREEN_H / 2 + 26,
    COLORS.UI_MUTED,
    1,
  );

  if (Math.floor(tick / 30) % 2 === 0) {
    const s = 'PRESS SPACE';
    const sw = measurePixelText(s, 1);
    drawPixelText(
      ctx,
      s,
      ((SCREEN_W - sw) / 2) | 0,
      SCREEN_H - 20,
      COLORS.UI_MUTED,
      1,
    );
  }
}

export function drawGameOver(ctx, tick) {
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.7)');
  const pw = 200,
    ph = 60;
  const px = ((SCREEN_W - pw) / 2) | 0;
  const py = ((SCREEN_H - ph) / 2) | 0;
  drawPixelBorder(
    ctx,
    px,
    py,
    pw,
    ph,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );
  const t = 'WOUND DOWN...';
  const tw = measurePixelText(t, 2);
  drawPixelText(
    ctx,
    t,
    ((SCREEN_W - tw) / 2) | 0,
    py + 14,
    COLORS.GAUGE_LOW,
    2,
  );
  if (Math.floor(tick / 30) % 2 === 0) {
    const s = 'PRESS R TO RETRY';
    const sw = measurePixelText(s, 1);
    drawPixelText(
      ctx,
      s,
      ((SCREEN_W - sw) / 2) | 0,
      py + 40,
      COLORS.UI_MUTED,
      1,
    );
  }
}

export function drawPaused(ctx, tick, selectedOption = 0) {
  // 1. Soft Backdrop
  ctx.fillStyle = 'rgba(10, 7, 5, 0.85)';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // 2. Main Floating Card (UX Focused)
  const cardW = 200;
  const cardH = 170; // Increased from 150 to accommodate 4 menu options
  const cardX = ((SCREEN_W - cardW) / 2) | 0;
  const cardY = ((SCREEN_H - cardH) / 2) | 0;

  // Glass-like panel with subtle border
  drawPixelBorder(
    ctx,
    cardX,
    cardY,
    cardW,
    cardH,
    'rgba(255, 208, 128, 0.3)',
    'rgba(0, 0, 0, 0.5)',
    'rgba(20, 15, 10, 0.95)',
    1
  );

  // Header Section
  const t = 'GAME PAUSED';
  const tw = measurePixelText(t, 1);
  drawPixelText(ctx, t, ((SCREEN_W - tw) / 2) | 0, cardY + 8, COLORS.GLOW_WARM, 1);
  drawPixelRect(ctx, cardX + 20, cardY + 20, cardW - 40, 1, COLORS.UI_BORDER_D);

  // 3. Simplified Difficulty Selector (User-Friendly)
  const difficulty = difficultySystem.getDifficulty();
  const diffY = cardY + 28;
  
  const diffLabel = 'DIFFICULTY:';
  const dlW = measurePixelText(diffLabel, 1);
  drawPixelText(ctx, diffLabel, cardX + 15, diffY, COLORS.UI_MUTED, 1);

  const diffColor =
    difficulty === 'Casual' ? COLORS.GLOW_WARM : 
    difficulty === 'Normal' ? COLORS.UI_TEXT : COLORS.GAUGE_LOW;
  
  const diffText = difficulty.toUpperCase();
  const dtW = measurePixelText(diffText, 1);
  
  // Highlighting the difficulty value
  const bgX = cardX + cardW - dtW - 25;
  drawPixelRect(ctx, bgX - 2, diffY - 1, dtW + 4, 10, 'rgba(0,0,0,0.4)');
  drawPixelText(ctx, diffText, bgX, diffY, diffColor, 1);

  // Difficulty switch hints
  const arrowAlpha = 0.5 + 0.5 * Math.sin(tick * 0.1);
  ctx.globalAlpha = arrowAlpha;
  drawPixelText(ctx, '<', bgX - 8, diffY, COLORS.UI_MUTED, 1);
  drawPixelText(ctx, '>', bgX + dtW + 2, diffY, COLORS.UI_MUTED, 1);
  ctx.globalAlpha = 1.0;

  // 4. Action Menu with Icons (UX Improvement)
  const menuOptions = [
    { text: 'RESUME', icon: '▶' },
    { text: 'SETTINGS', icon: '⚙' },
    { text: 'LEADERBOARD', icon: '★' },
    { text: 'MAIN MENU', icon: '◄' },
  ];

  const menuStartY = cardY + 55;
  const menuLineH = 20;

  for (let i = 0; i < menuOptions.length; i++) {
    const opt = menuOptions[i];
    const isSelected = i === selectedOption;
    const optY = menuStartY + i * menuLineH;
    const optW = 170;
    const optX = ((SCREEN_W - optW) / 2) | 0;

    if (isSelected) {
      // Bold selection highlight
      drawPixelRect(ctx, optX, optY - 4, optW, 18, 'rgba(255, 208, 128, 0.1)');
      drawPixelRect(ctx, optX, optY - 4, 2, 18, COLORS.GLOW_WARM);
      
      // Glow text
      drawPixelText(ctx, opt.icon, optX + 10, optY, COLORS.GLOW_WARM, 1);
      drawPixelText(ctx, opt.text, optX + 30, optY, COLORS.GLOW_WARM, 1);
      
      // Visual pulse
      const pulse = Math.sin(tick * 0.2) * 2;
      drawPixelText(ctx, '>', optX + optW - 15 + pulse, optY, COLORS.GLOW_WARM, 1);
    } else {
      drawPixelText(ctx, opt.icon, optX + 10, optY, COLORS.UI_MUTED, 1);
      drawPixelText(ctx, opt.text, optX + 30, optY, COLORS.UI_TEXT, 1);
    }
  }

  // Footer Navigation (Clean)
  const footerY = cardY + cardH - 12;
  const hint = '↑↓: NAVIGATE   ENTER: CONFIRM   ESC: BACK';
  const hintW = measurePixelText(hint, 0.5);
  drawPixelText(ctx, hint, ((SCREEN_W - hintW) / 2) | 0, footerY, COLORS.UI_MUTED, 0.5);
}

export function getPauseMenuInteraction(x, y) {
  const cardW = 200;
  const cardH = 170;
  const cardX = ((SCREEN_W - cardW) / 2) | 0;
  const cardY = ((SCREEN_H - cardH) / 2) | 0;

  // Check difficulty selector
  const diffY = cardY + 28;
  const diffH = 12;
  if (y >= diffY && y <= diffY + diffH && x >= cardX && x <= cardX + cardW) {
    return { type: 'difficulty', x: x };
  }

  // Check menu options
  const menuOptions = 4;
  const menuStartY = cardY + 55;
  const menuLineH = 20;
  const optW = 170;
  const optX = ((SCREEN_W - optW) / 2) | 0;

  for (let i = 0; i < menuOptions; i++) {
    const optY = menuStartY + i * menuLineH;
    if (x >= optX && x <= optX + optW && y >= optY - 4 && y <= optY + 14) {
      return { type: 'menu', selection: i };
    }
  }

  return null;
}

export function drawWindPrompt(ctx, target, camX, camY, tick) {
  if (!target) return;
  const cx = (target.centerX() - camX) | 0;
  const cy = (target.y - camY - 4 + Math.sin(tick * 0.08) * 2) | 0;
  drawSpeechBubble(ctx, '[E] WIND', cx, cy);
}

export function drawTransition(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

export function drawFlashOverlay(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(255,255,240,${alpha})`;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

export function drawGearToken(ctx, token, camX, camY, tick) {
  if (token.collected) return;
  const cx = (token.x - camX) | 0;
  const cy = (token.y - camY) | 0;
  const ang = token.angle || 0;
  const teeth = 6;
  const bob = Math.sin(tick * 0.08 + token.x * 0.1) * 1;
  ctx.save();
  ctx.translate(cx + 4, cy + 4 + bob);
  ctx.rotate(ang);
  ctx.fillStyle = COLORS.METAL_LIGHT;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const tx = Math.cos(a) * 3;
    const ty = Math.sin(a) * 3;
    ctx.fillRect((tx - 1) | 0, (ty - 1) | 0, 2, 2);
  }
  ctx.fillStyle = COLORS.GLOW_WARM;
  ctx.fillRect(-2, -2, 4, 4);
  ctx.fillStyle = COLORS.METAL_DARK;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
  if ((tick + token.x) % 40 < 2) {
    ctx.fillStyle = COLORS.SPARK_1;
    ctx.fillRect(cx + 3, cy - 1 + (bob | 0), 1, 1);
  }
}

export function drawLockedDoor(ctx, goal, camX, camY, tick, unlocked) {
  if (!goal) return;
  const sx = goal.x - camX;
  const sy = goal.y - camY;
  drawPixelRect(ctx, sx, sy, goal.w, goal.h, COLORS.UI_BG);
  if (unlocked) {
    const pulse = Math.abs(Math.sin(tick * 0.08));
    const edge = pulse > 0.5 ? COLORS.GLOW_WARM : COLORS.METAL_LIGHT;
    drawPixelBorder(
      ctx,
      sx,
      sy,
      goal.w,
      goal.h,
      edge,
      COLORS.METAL_DARK,
      COLORS.TILE_MID,
      1,
    );
    drawPixelRect(ctx, sx + goal.w / 2 - 1, sy + 2, 2, goal.h - 4, edge);
    for (let i = 0; i < 4; i++) {
      const py = sy - i * 3 - (tick % 12);
      drawPixelRect(ctx, sx + goal.w / 2 - 1, py, 2, 2, COLORS.SPARK_1);
    }
  } else {
    drawPixelBorder(
      ctx,
      sx,
      sy,
      goal.w,
      goal.h,
      COLORS.METAL_DARK,
      COLORS.UI_BG,
      COLORS.LOCKED_DOOR,
      1,
    );
    drawPixelRect(
      ctx,
      sx + goal.w / 2 - 2,
      sy + goal.h / 2 - 2,
      4,
      4,
      COLORS.GAUGE_LOW,
    );
    drawPixelRect(
      ctx,
      sx + goal.w / 2 - 1,
      sy + goal.h / 2 - 1,
      2,
      2,
      COLORS.UI_BG,
    );
  }
}

// ═══════ MASOCORE UI ADDITIONS ═══════

/**
 * Draw ghost Mira (alpha 0.4, METAL_MID tint) replaying best attempt.
 * Drawn BEHIND live Mira. Ghost ahead = doing worse. Ghost behind = beating yourself.
 * Enhanced visual distinction (Requirement 5.8)
 */
export function drawGhostMira(ctx, ghostFrame, camX, camY) {
  if (!ghostFrame) return;
  const sx = (ghostFrame.x - camX) | 0;
  const sy = (ghostFrame.y - camY) | 0;

  ctx.save();
  // Increased alpha from 0.3 to 0.4 for better visibility
  ctx.globalAlpha = 0.4;

  // Determine frame based on stored anim info
  let frame;
  const animFrame = ghostFrame.animFrame || 0;
  const anim = ghostFrame.anim || 'idle';

  if (anim === 'idle') {
    frame = animFrame % 2 === 0 ? MIRA.idle_0 : MIRA.idle_1;
  } else if (anim === 'walk') {
    const frames = [MIRA.walk_0, MIRA.walk_1, MIRA.walk_2, MIRA.walk_3];
    frame = frames[animFrame % 4];
  } else {
    frame = MIRA.idle_0;
  }

  // Draw with a muted tint by using reduced-alpha palette
  const facing = ghostFrame.facing || 1;
  if (facing < 0) {
    drawPixelSpriteFlipped(ctx, frame, sx, sy, MIRA_PALETTE, 1);
  } else {
    drawPixelSprite(ctx, frame, sx, sy, MIRA_PALETTE, 1);
  }

  ctx.restore();

  // Add subtle glow outline for better distinction
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = COLORS.METAL_MID;
  ctx.lineWidth = 1;
  ctx.strokeRect(sx, sy, 8, 12);
  ctx.restore();
}

/**
 * Draw close-call indicator above Mira.
 * type 'close': "!" for 20 frames
 * type 'extreme': "!!" for 30 frames + white flash
 */
export function drawCloseCallIndicator(
  ctx,
  player,
  camX,
  camY,
  closeCallType,
  closeCallTimer,
) {
  if (closeCallTimer <= 0 || !closeCallType) return;
  const sx = (player.x - camX + 4) | 0;
  const sy = (player.y - camY - 8) | 0;

  const text = closeCallType === 'extreme' ? '!!' : '!';
  const tw = measurePixelText(text, 1);
  const alpha = Math.min(1, closeCallTimer / 5); // fade out at end

  ctx.save();
  ctx.globalAlpha = alpha;
  drawPixelText(ctx, text, sx - tw / 2, sy, COLORS.SPARK_1, 1);
  ctx.restore();

  // White flash for extreme close call
  if (closeCallType === 'extreme' && closeCallTimer > 25) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
}

/**
 * Draw checkpoint (brass clock on wall).
 * Active checkpoints show sparkle effect.
 */
export function drawCheckpoint(ctx, checkpoint, camX, camY, tick) {
  if (!checkpoint) return;
  const sx = (checkpoint.x - camX) | 0;
  const sy = (checkpoint.y - camY) | 0;

  // Brass clock body
  const activated = checkpoint.activated || false;
  const bodyColor = activated ? COLORS.GLOW_WARM : COLORS.METAL_MID;
  const faceColor = activated ? COLORS.IVORY : COLORS.METAL_LIGHT;

  // Clock body (12x12)
  drawPixelRect(ctx, sx, sy, 12, 12, COLORS.METAL_DARK);
  drawPixelRect(ctx, sx + 1, sy + 1, 10, 10, bodyColor);

  // Clock face (8x8 centered)
  drawPixelRect(ctx, sx + 2, sy + 2, 8, 8, faceColor);
  drawPixelRect(ctx, sx + 5, sy + 5, 2, 2, COLORS.METAL_DARK);

  // Clock hands
  if (activated) {
    const ang = tick * 0.03;
    const hx = sx + 6 + Math.cos(ang) * 2;
    const hy = sy + 6 + Math.sin(ang) * 2;
    ctx.fillStyle = COLORS.METAL_DARK;
    ctx.fillRect(hx | 0, hy | 0, 1, 1);
  } else {
    // Static hands
    ctx.fillStyle = COLORS.METAL_DARK;
    ctx.fillRect(sx + 6, sy + 3, 1, 3);
    ctx.fillRect(sx + 6, sy + 5, 2, 1);
  }

  // Sparkle effect when activated
  if (activated && tick % 20 < 3) {
    ctx.fillStyle = COLORS.SPARK_1;
    ctx.fillRect(sx + 1, sy - 2, 1, 1);
    ctx.fillRect(sx + 10, sy - 1, 1, 1);
    ctx.fillRect(sx + 6, sy - 3, 1, 1);
  }
}

/**
 * Draw Color Betrayal tile (Troll 3) — green-tinted wall
 */
export function drawColorBetrayalTile(ctx, zone, camX, camY) {
  const sx = (zone.x - camX) | 0;
  const sy = (zone.y - camY) | 0;
  const w = zone.w || 16;
  const h = zone.h || 16;

  // Draw the betrayal zone with green-tinted color
  drawPixelRect(ctx, sx, sy, w, h, zone.color || COLORS.COLOR_BETRAYAL);

  // Add subtle "exit-like" styling to look inviting
  if (w >= 12 && h >= 12) {
    drawPixelRect(ctx, sx + 2, sy + 2, w - 4, h - 4, '#6B7B30');
  }
  if (w >= 8 && h >= 8) {
    drawPixelRect(ctx, sx + 4, sy + 4, w - 8, h - 8, '#7B8B40');
  }
  // Subtle glow in center
  if (w >= 12 && h >= 12) {
    const glowW = Math.max(4, w - 12);
    const glowH = Math.max(4, h - 12);
    drawPixelRect(ctx, sx + 6, sy + 6, glowW, glowH, '#8B9B50');
  }
}

/**
 * Draw mercy hints for obstacles that have killed the player 5+ times.
 * Hints are subtle visual cues showing safe positions or patterns.
 */
export function drawMercyHints(ctx, obstacles, deathSystem, camX, camY, tick) {
  const { getObstacleDeathCount } = deathSystem;
  const MERCY_THRESHOLD = 5;

  for (const obstacle of obstacles) {
    if (!obstacle.id) continue;

    const deathCount = getObstacleDeathCount(obstacle.id);
    if (deathCount < MERCY_THRESHOLD) continue;

    // Obstacle has killed player 5+ times - show mercy hint
    const type = obstacle.type;

    switch (type) {
      case 'PISTON':
        drawPistonMercyHint(ctx, obstacle, camX, camY);
        break;

      case 'ORBIT_SPHERE':
        drawOrbitSphereMercyHint(ctx, obstacle, camX, camY);
        break;

      case 'GEAR_SPINNER':
        drawGearSpinnerMercyHint(ctx, obstacle, camX, camY, tick);
        break;

      case 'PENDULUM':
        drawPendulumMercyHint(ctx, obstacle, camX, camY);
        break;

      case 'BOUNCING_BALL':
        // For bouncing ball, extend ghost trail (handled in obstacle itself)
        if (!obstacle.ghostTrailFrames || obstacle.ghostTrailFrames < 6) {
          obstacle.ghostTrailFrames = 6;
        }
        break;
    }
  }
}

/**
 * Draw faint dust particles at piston's safe position (when fully retracted)
 */
function drawPistonMercyHint(ctx, obstacle, camX, camY) {
  // Safe position is at (ax, ay) when piston is fully retracted
  const safeX = (obstacle.ax - camX) | 0;
  const safeY = (obstacle.ay - camY) | 0;

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = COLORS.METAL_MID;

  // Draw small dust particles in a cluster
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 2 + Math.random() * 2;
    const px = safeX + Math.cos(angle) * radius;
    const py = safeY + Math.sin(angle) * radius;
    ctx.fillRect(px | 0, py | 0, 1, 1);
  }

  ctx.restore();
}

/**
 * Draw faint arc showing the full orbit path of the sphere
 */
function drawOrbitSphereMercyHint(ctx, obstacle, camX, camY) {
  const cx = (obstacle.cx - camX) | 0;
  const cy = (obstacle.cy - camY) | 0;
  const radius = obstacle.orbitRadius || 20;

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = COLORS.METAL_MID;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Highlight the 1px gap between gear teeth
 */
function drawGearSpinnerMercyHint(ctx, obstacle, camX, camY, tick) {
  const cx = (obstacle.x - camX) | 0;
  const cy = (obstacle.y - camY) | 0;
  const radius = obstacle.radius || 16;
  const teeth = obstacle.teeth || 8;

  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = COLORS.GLOW_WARM;

  // Highlight gaps between teeth
  const angle = obstacle.angle || 0;
  for (let i = 0; i < teeth; i++) {
    const gapAngle = angle + (i / teeth) * Math.PI * 2 + Math.PI / teeth;
    const gapX = cx + Math.cos(gapAngle) * radius;
    const gapY = cy + Math.sin(gapAngle) * radius;

    // Draw a small highlight at the gap
    ctx.fillRect((gapX - 1) | 0, (gapY - 1) | 0, 2, 2);
  }

  ctx.restore();
}

/**
 * Draw 1px arc showing the full swing range of the pendulum
 */
function drawPendulumMercyHint(ctx, obstacle, camX, camY) {
  const px = (obstacle.x - camX) | 0;
  const py = (obstacle.y - camY) | 0;
  const length = obstacle.length || 40;
  const amplitude = obstacle.amplitude || 1.0;

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = COLORS.METAL_MID;
  ctx.lineWidth = 1;

  // Draw arc showing swing range
  const maxAngle = amplitude;
  ctx.beginPath();
  ctx.arc(px, py, length, -Math.PI / 2 - maxAngle, -Math.PI / 2 + maxAngle);
  ctx.stroke();

  ctx.restore();
}
/**
 * Draw unlock notification (skins, achievements)
 * Displays at top-center of screen with fade in/out animation
 */
export function drawUnlockNotification(ctx, game) {
  const notification = progressionSystem.getCurrentNotification();
  if (!notification) return;

  const alpha = progressionSystem.getNotificationAlpha();
  if (alpha <= 0) return;

  // Notification panel dimensions
  const panelWidth = 240;
  const panelHeight = 60;
  const panelX = (SCREEN_W - panelWidth) / 2;
  const panelY = 20;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Draw panel background with border
  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    2,
  );

  // Draw title
  const titleColor =
    notification.type === 'skin' ? COLORS.GLOW_WARM : COLORS.SPARK_1;
  const titleWidth = measurePixelText(notification.title, 1);
  const titleX = panelX + (panelWidth - titleWidth) / 2;
  drawPixelText(ctx, notification.title, titleX, panelY + 8, titleColor, 1);

  // Draw item name
  const nameWidth = measurePixelText(notification.name, 1);
  const nameX = panelX + (panelWidth - nameWidth) / 2;
  drawPixelText(ctx, notification.name, nameX, panelY + 22, COLORS.UI_TEXT, 1);

  // Draw description
  const descWidth = measurePixelText(notification.description, 1);
  const descX = panelX + (panelWidth - descWidth) / 2;
  drawPixelText(
    ctx,
    notification.description,
    descX,
    panelY + 36,
    COLORS.UI_MUTED,
    1,
  );

  // Draw icon based on type
  const iconX = panelX + 8;
  const iconY = panelY + 20;

  if (notification.type === 'skin') {
    // Draw skin icon (small Mira sprite)
    ctx.fillStyle = COLORS.GLOW_WARM;
    ctx.fillRect(iconX, iconY, 8, 8);
    ctx.fillStyle = COLORS.MIRA_DRESS;
    ctx.fillRect(iconX + 2, iconY + 2, 4, 4);
  } else if (notification.type === 'achievement') {
    // Draw achievement icon based on rarity
    let iconColor = COLORS.UI_TEXT;
    switch (notification.rarity) {
      case 'common':
        iconColor = COLORS.UI_TEXT;
        break;
      case 'uncommon':
        iconColor = COLORS.METAL_LIGHT;
        break;
      case 'rare':
        iconColor = COLORS.GLOW_WARM;
        break;
      case 'epic':
        iconColor = COLORS.SPARK_1;
        break;
    }

    // Draw achievement badge
    ctx.fillStyle = iconColor;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = iconX + 4 + Math.cos(angle) * 3;
      const y = iconY + 4 + Math.sin(angle) * 3;
      ctx.fillRect(x | 0, y | 0, 2, 2);
    }
    ctx.fillRect(iconX + 2, iconY + 2, 4, 4);
  }

  // Draw sparkle effect around notification
  const sparkleCount = 6;
  const time = game.tick * 0.1;
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (i / sparkleCount) * Math.PI * 2 + time;
    const radius = 30 + Math.sin(time + i) * 5;
    const sparkleX = panelX + panelWidth / 2 + Math.cos(angle) * radius;
    const sparkleY = panelY + panelHeight / 2 + Math.sin(angle) * radius;

    const sparkleAlpha = (Math.sin(time * 2 + i) + 1) * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha * sparkleAlpha * 0.6;
    ctx.fillStyle = COLORS.GLOW_WARM;
    ctx.fillRect(sparkleX | 0, sparkleY | 0, 2, 2);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draw progress bar with percentage display
 * Requirements: 4.5, 4.8
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Bar width
 * @param {number} height - Bar height
 * @param {number} progress - Progress value (0.0 to 1.0)
 * @param {string} label - Label text
 * @param {string} color - Fill color
 */
export function drawProgressBar(
  ctx,
  x,
  y,
  width,
  height,
  progress,
  label,
  color,
) {
  // Draw background
  drawPixelRect(ctx, x, y, width, height, COLORS.GAUGE_BG);

  // Draw fill
  const fillWidth = Math.round(width * progress);
  if (fillWidth > 0) {
    drawPixelRect(ctx, x, y, fillWidth, height, color);
  }

  // Draw border
  ctx.strokeStyle = COLORS.UI_BORDER_D;
  ctx.strokeRect(x, y, width, height);

  // Draw label if provided
  if (label) {
    const labelWidth = measurePixelText(label, 1);
    const labelX = x + (width - labelWidth) / 2;
    const labelY = y - 8;
    drawPixelText(ctx, label, labelX, labelY, COLORS.UI_TEXT, 1);
  }
}

/**
 * Draw progress tracker UI in HUD
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} game - Game state object
 */
export function drawProgressTracker(ctx, game) {
  return; // DISABLED as per user request
  if (!game.progressTracker || (game.levelData && game.levelData.isTutorial)) return;

  const tracker = game.progressTracker;
  const state = tracker.getState();
  const levelId = game.level;
  const personalBest = tracker.getPersonalBest(levelId);

  // Calculate distances
  const currentDistance = state.currentDistance;
  const distanceToExit = tracker.calculateDistanceToExit(
    game.player,
    game.levelData.goalTrigger,
  );
  const progress = tracker.getProgressPercentage(
    game.player,
    game.lastSpawn,
    game.levelData.goalTrigger,
  );

  // Progress tracker panel position (bottom-left, above wind gauge)
  const panelX = 4;
  const panelY = SCREEN_H - 48;
  const panelWidth = 120;
  const panelHeight = 24;

  // Draw panel background
  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Draw progress bar (0-100%)
  const barX = panelX + 4;
  const barY = panelY + 4;
  const barWidth = panelWidth - 8;
  const barHeight = 6;

  drawPixelRect(ctx, barX, barY, barWidth, barHeight, COLORS.GAUGE_BG);
  const fillWidth = Math.round(barWidth * (progress / 100));
  const barColor = state.isNewBest ? COLORS.GLOW_WARM : COLORS.GAUGE_FULL;
  if (fillWidth > 0) {
    drawPixelRect(ctx, barX, barY, fillWidth, barHeight, barColor);
  }

  // Draw percentage text
  const percentText = Math.floor(progress) + '%';
  const percentWidth = measurePixelText(percentText, 1);
  drawPixelText(
    ctx,
    percentText,
    barX + barWidth - percentWidth,
    barY - 1,
    COLORS.UI_TEXT,
    1,
  );

  // Draw distance information
  const distY = panelY + 14;

  // Current distance (highlight if new best)
  const currentText = 'Dist: ' + Math.floor(currentDistance);
  const currentColor = state.isNewBest ? COLORS.GLOW_WARM : COLORS.UI_TEXT;
  drawPixelText(ctx, currentText, panelX + 4, distY, currentColor, 1);

  // Personal best
  if (personalBest > 0) {
    const bestText = 'Best: ' + Math.floor(personalBest);
    const bestWidth = measurePixelText(bestText, 1);
    drawPixelText(
      ctx,
      bestText,
      panelX + panelWidth - bestWidth - 4,
      distY,
      COLORS.UI_MUTED,
      1,
    );
  }

  // Draw "NEW BEST!" message when surpassing previous best
  if (state.showNewBestMessage) {
    const messageText = 'NEW BEST!';
    const messageWidth = measurePixelText(messageText, 1);
    const messageX = panelX + (panelWidth - messageWidth) / 2;
    const messageY = panelY - 10;

    ctx.save();
    ctx.globalAlpha = state.newBestAlpha;
    drawPixelText(ctx, messageText, messageX, messageY, COLORS.GLOW_WARM, 1);
    ctx.restore();
  }
}

/**
 * Update and draw progression status in HUD
 */
export function drawProgressionStatus(ctx, game) {
  // Draw skin unlock progress for currently tracked skins
  const currentDeaths = game.deathCount || 0;

  // Golden skin progress (50 deaths)
  if (currentDeaths < 50 && !progressionSystem.isUnlocked('golden')) {
    const progress = progressionSystem.getSkinProgress('golden');
    drawProgressBar(
      ctx,
      4,
      SCREEN_H - 32,
      80,
      6,
      progress.progress / 100,
      `Golden: ${progress.current}/${progress.target}`,
      COLORS.GLOW_WARM,
    );
  }

  // Ghost skin progress (100 deaths)
  if (
    currentDeaths >= 50 &&
    currentDeaths < 100 &&
    !progressionSystem.isUnlocked('ghost')
  ) {
    const progress = progressionSystem.getSkinProgress('ghost');
    drawProgressBar(
      ctx,
      4,
      SCREEN_H - 32,
      80,
      6,
      progress.progress / 100,
      `Ghost: ${progress.current}/${progress.target}`,
      COLORS.SPARK_1,
    );
  }
}

/**
 * Draw ghost replay ahead/behind indicator
 * Requirements: 5.2, 5.3, 5.4
 * Shows whether the live player is ahead or behind the ghost replay
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} player - Player object
 * @param {number} camX - Camera X position
 * @param {number} camY - Camera Y position
 * @param {string} status - 'ahead' or 'behind'
 */
export function drawGhostAheadBehindIndicator(ctx, player, camX, camY, status) {
  if (!status || status === 'even') return;

  const sx = (player.x - camX + 4) | 0;
  const sy = (player.y - camY - 18) | 0;

  let text, color;

  if (status === 'ahead') {
    // Ahead of ghost = doing better (Requirement 5.3)
    text = '↑ AHEAD';
    color = COLORS.GLOW_WARM;
  } else {
    // Behind ghost = doing worse (Requirement 5.4)
    text = '↓ BEHIND';
    color = COLORS.GAUGE_LOW;
  }

  const tw = measurePixelText(text, 1);

  ctx.save();
  ctx.globalAlpha = 0.8;
  drawPixelText(ctx, text, sx - tw / 2, sy, color, 1);
  ctx.restore();
}

/**
 * Draw speedrun timer and split information (Requirements 6.1, 6.2, 6.3, 6.4)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} speedrunSystem - Speedrun system instance
 * @param {number} tick - Current game tick
 */
export function drawSpeedrunTimer(ctx, speedrunSystem, tick) {
  if (!speedrunSystem.isEnabled() || !speedrunSystem.active) return;

  // Timer panel dimensions
  const panelWidth = 140;
  const panelHeight = 40;
  const panelX = (SCREEN_W - panelWidth) / 2;
  const panelY = 4;

  // Draw panel background
  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Draw timer label
  drawPixelText(ctx, 'TIME', panelX + 4, panelY + 4, COLORS.UI_MUTED, 1);

  // Draw current time (MM:SS.mmm format - Requirement 6.1)
  const timeString = speedrunSystem.getCurrentTimeString();
  const timeWidth = measurePixelText(timeString, 2);
  const timeX = panelX + (panelWidth - timeWidth) / 2;
  drawPixelText(ctx, timeString, timeX, panelY + 14, COLORS.GLOW_WARM, 2);

  // Draw best time if available
  const bestTime = speedrunSystem.getBestTimeString();
  if (bestTime) {
    const bestLabel = 'BEST: ' + bestTime;
    const bestWidth = measurePixelText(bestLabel, 1);
    const bestX = panelX + (panelWidth - bestWidth) / 2;
    drawPixelText(ctx, bestLabel, bestX, panelY + 30, COLORS.UI_MUTED, 1);
  }

  // Paused indicator
  if (speedrunSystem.isPaused) {
    if (Math.floor(tick / 30) % 2 === 0) {
      const pausedText = 'PAUSED';
      const pausedWidth = measurePixelText(pausedText, 1);
      const pausedX = panelX + (panelWidth - pausedWidth) / 2;
      drawPixelText(ctx, pausedText, pausedX, panelY + 30, COLORS.GAUGE_LOW, 1);
    }
  }
}

/**
 * Draw split information on level clear screen (Requirements 6.2, 6.3, 6.4)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} speedrunSystem - Speedrun system instance
 * @param {number} level - Level that was just completed
 */
export function drawSpeedrunSplit(ctx, speedrunSystem, level) {
  if (!speedrunSystem.isEnabled()) return;

  const splitInfo = speedrunSystem.getSplitInfo(level);
  if (!splitInfo) return;

  // Split panel dimensions
  const panelWidth = 200;
  const panelHeight = 50;
  const panelX = (SCREEN_W - panelWidth) / 2;
  const panelY = SCREEN_H / 2 + 50;

  // Draw panel background
  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Draw split label
  drawPixelText(ctx, 'SPLIT TIME', panelX + 4, panelY + 4, COLORS.UI_MUTED, 1);

  // Draw split time
  const timeWidth = measurePixelText(splitInfo.time, 1);
  const timeX = panelX + (panelWidth - timeWidth) / 2;
  drawPixelText(ctx, splitInfo.time, timeX, panelY + 16, COLORS.UI_TEXT, 1);

  // Draw delta (Requirement 6.3)
  if (splitInfo.delta !== null) {
    const deltaWidth = measurePixelText(splitInfo.delta, 1);
    const deltaX = panelX + (panelWidth - deltaWidth) / 2;

    // Highlight faster splits in GLOW_WARM (Requirement 6.4)
    const deltaColor = splitInfo.isFaster ? COLORS.GLOW_WARM : COLORS.GAUGE_LOW;
    drawPixelText(ctx, splitInfo.delta, deltaX, panelY + 28, deltaColor, 1);

    // Add indicator for faster/slower
    const indicator = splitInfo.isFaster ? '▼ FASTER' : '▲ SLOWER';
    const indWidth = measurePixelText(indicator, 1);
    const indX = panelX + (panelWidth - indWidth) / 2;
    drawPixelText(ctx, indicator, indX, panelY + 38, deltaColor, 1);
  }
}

/**
 * Draw speedrun mode toggle on title screen (Requirement 6.8)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} speedrunSystem - Speedrun system instance
 * @param {number} tick - Current game tick
 */
export function drawSpeedrunToggle(ctx, speedrunSystem, tick) {
  const panelWidth = 88;
  const panelHeight = 14;
  const panelX = SCREEN_W - panelWidth - 12;
  const panelY = 10;
  const enabled = speedrunSystem.isEnabled();
  const stateColor = enabled ? COLORS.GLOW_WARM : COLORS.UI_MUTED;

  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );
  drawPixelText(ctx, 'T SPD', panelX + 5, panelY + 3, COLORS.UI_MUTED, 1);

  const state = enabled ? 'ON' : 'OFF';
  const stateW = measurePixelText(state, 1);
  drawPixelText(
    ctx,
    state,
    panelX + panelWidth - stateW - 6,
    panelY + 3,
    stateColor,
    1,
  );

  if (enabled && Math.floor(tick / 20) % 2 === 0) {
    drawPixelRect(
      ctx,
      panelX + panelWidth - 16,
      panelY + 3,
      2,
      8,
      COLORS.GLOW_WARM,
    );
  }
}

/**
 * Draw speedrun splits list (for pause menu or post-run summary)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} speedrunSystem - Speedrun system instance
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export function drawSpeedrunSplitsList(ctx, speedrunSystem, x, y) {
  if (!speedrunSystem.isEnabled()) return;

  const splits = speedrunSystem.getAllSplits();
  if (splits.length === 0) return;

  // Draw header
  drawPixelText(ctx, 'SPLITS', x, y, COLORS.UI_TEXT, 1);

  let currentY = y + 12;

  // Draw each split
  for (const split of splits) {
    // Level number
    const levelText = `L${split.level}`;
    drawPixelText(ctx, levelText, x, currentY, COLORS.UI_MUTED, 1);

    // Split time
    drawPixelText(ctx, split.time, x + 24, currentY, COLORS.UI_TEXT, 1);

    // Delta
    if (split.delta !== null) {
      const deltaX = x + 100;
      drawPixelText(ctx, split.delta, deltaX, currentY, split.color, 1);
    }

    currentY += 10;
  }
}

/**
 * Draw speedrun ghost Mira (for speedrun mode ghost replay - Requirement 6.5)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} ghostFrame - Ghost frame data
 * @param {number} camX - Camera X position
 * @param {number} camY - Camera Y position
 */
export function drawSpeedrunGhost(ctx, ghostFrame, camX, camY) {
  if (!ghostFrame) return;

  const sx = (ghostFrame.x - camX) | 0;
  const sy = (ghostFrame.y - camY) | 0;

  ctx.save();
  // Speedrun ghost has different alpha/tint than regular ghost
  ctx.globalAlpha = 0.5;

  // Determine frame based on stored anim info
  let frame;
  const animFrame = ghostFrame.animFrame || 0;
  const anim = ghostFrame.anim || 'idle';

  if (anim === 'idle') {
    frame = MIRA.idle_0;
  } else if (anim === 'walk') {
    frame = animFrame === 0 ? MIRA.walk_0 : MIRA.walk_1;
  } else if (anim === 'jump') {
    frame = MIRA.jump;
  } else if (anim === 'fall') {
    frame = MIRA.fall;
  } else {
    frame = MIRA.idle_0;
  }

  // Draw with speedrun-specific tint (golden tint for speedrun ghost)
  const facing = ghostFrame.facing || 1;

  // Draw the sprite with golden tint overlay
  if (facing < 0) {
    drawPixelSpriteFlipped(ctx, frame, sx, sy, MIRA_PALETTE, 1);
  } else {
    drawPixelSprite(ctx, frame, sx, sy, MIRA_PALETTE, 1);
  }

  ctx.restore();

  // Add golden glow outline for speedrun ghost
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = COLORS.GLOW_WARM;
  ctx.lineWidth = 2;
  ctx.strokeRect(sx - 1, sy - 1, 10, 14);
  ctx.restore();
}

/**
 * Draw leaderboard panel (Requirements 7.3, 7.6, 7.7, 7.8)
 *
 * Displays top 10 entries for the current level with rank, score, and date.
 * Supports filtering by metric: deaths, time, completion rate.
 * Highlights the player's current rank.
 * Accessible from pause menu via 'L' key.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} leaderboardSystem - LeaderboardSystem instance
 * @param {number} levelId - Current level ID
 * @param {string} levelName - Current level name
 * @param {string} activeFilter - Active filter: 'deaths', 'time', or 'completion'
 * @param {number} tick - Current game tick (for animations)
 * @param {number|null} currentDeaths - Player's current death count (for rank highlight)
 * @param {number|null} currentTime - Player's current time in ms (for rank highlight)
 */
export function drawLeaderboard(
  ctx,
  leaderboardSystem,
  levelId,
  levelName,
  activeFilter,
  tick,
  currentDeaths,
  currentTime,
) {
  // ─── Full-screen dark overlay ───
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.85)');

  // ─── Main panel ───
  const panelW = 280;
  const panelH = 160;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = ((SCREEN_H - panelH) / 2) | 0;

  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    2,
  );

  // ─── Title ───
  const title = 'LEADERBOARD';
  const titleW = measurePixelText(title, 2);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    panelY + 6,
    COLORS.GLOW_WARM,
    2,
  );

  // ─── Level name ───
  const levelLabel =
    'LVL ' + String(levelId).padStart(2, '0') + ': ' + (levelName || 'UNKNOWN');
  const levelLabelW = measurePixelText(levelLabel, 1);
  drawPixelText(
    ctx,
    levelLabel,
    ((SCREEN_W - levelLabelW) / 2) | 0,
    panelY + 22,
    COLORS.UI_MUTED,
    1,
  );

  // ─── Filter tabs (Requirement 7.7) ───
  const filters = [
    { key: 'deaths', label: 'DEATHS' },
    { key: 'time', label: 'TIME' },
    { key: 'completion', label: 'COMPLETION' },
  ];
  const tabY = panelY + 32;
  const tabW = 72;
  const tabH = 10;
  const tabStartX = (panelX + (panelW - filters.length * tabW) / 2) | 0;

  for (let i = 0; i < filters.length; i++) {
    const f = filters[i];
    const tx = tabStartX + i * tabW;
    const isActive = activeFilter === f.key;

    // Tab background
    const tabBg = isActive ? COLORS.UI_BORDER_D : COLORS.UI_BG;
    drawPixelRect(ctx, tx, tabY, tabW - 2, tabH, tabBg);

    // Tab border
    const borderColor = isActive ? COLORS.GLOW_WARM : COLORS.UI_BORDER_D;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, tabY, tabW - 2, tabH);

    // Tab label
    const labelColor = isActive ? COLORS.GLOW_WARM : COLORS.UI_MUTED;
    const lw = measurePixelText(f.label, 1);
    drawPixelText(
      ctx,
      f.label,
      (tx + (tabW - 2 - lw) / 2) | 0,
      tabY + 2,
      labelColor,
      1,
    );
  }

  // ─── Column headers ───
  const tableY = tabY + tabH + 4;
  const colRankX = panelX + 6;
  const colScoreX = panelX + 36;
  const colDateX = panelX + 180;

  drawPixelText(ctx, '#', colRankX, tableY, COLORS.UI_MUTED, 1);
  drawPixelText(
    ctx,
    activeFilter === 'deaths'
      ? 'DEATHS'
      : activeFilter === 'time'
        ? 'TIME'
        : 'RATE',
    colScoreX,
    tableY,
    COLORS.UI_MUTED,
    1,
  );
  drawPixelText(ctx, 'DATE', colDateX, tableY, COLORS.UI_MUTED, 1);

  // Separator line
  drawPixelRect(ctx, panelX + 4, tableY + 9, panelW - 8, 1, COLORS.UI_BORDER_D);

  // ─── Leaderboard entries ───
  const rowH = 10;
  const maxRows = 8;
  const rowStartY = tableY + 12;

  let entries = [];
  let playerCurrentRank = null;

  if (activeFilter === 'deaths') {
    entries = leaderboardSystem.getLeaderboard(levelId, 'deaths');
    if (currentDeaths !== null && currentDeaths !== undefined) {
      playerCurrentRank = leaderboardSystem.getPlayerRank(
        levelId,
        'deaths',
        currentDeaths,
      );
    }
  } else if (activeFilter === 'time') {
    entries = leaderboardSystem.getLeaderboard(levelId, 'time');
    if (currentTime !== null && currentTime !== undefined) {
      playerCurrentRank = leaderboardSystem.getPlayerRank(
        levelId,
        'time',
        currentTime,
      );
    }
  } else if (activeFilter === 'completion') {
    // Completion rate view: show death entries with completion rate info
    entries = leaderboardSystem.getLeaderboard(levelId, 'deaths');
    const completionRate = leaderboardSystem.getCompletionRate(levelId);
    // Show completion rate as a single stat row
    const rateText = 'COMPLETION RATE: ' + completionRate + '%';
    const rateW = measurePixelText(rateText, 1);
    drawPixelText(
      ctx,
      rateText,
      ((SCREEN_W - rateW) / 2) | 0,
      rowStartY + 2,
      completionRate >= 50 ? COLORS.GLOW_WARM : COLORS.GAUGE_LOW,
      1,
    );
  }

  if (activeFilter !== 'completion') {
    if (entries.length === 0) {
      // No data yet
      const noDataText = 'NO ENTRIES YET';
      const noDataW = measurePixelText(noDataText, 1);
      drawPixelText(
        ctx,
        noDataText,
        ((SCREEN_W - noDataW) / 2) | 0,
        rowStartY + 20,
        COLORS.UI_MUTED,
        1,
      );
    } else {
      for (let i = 0; i < Math.min(entries.length, maxRows); i++) {
        const entry = entries[i];
        const ry = rowStartY + i * rowH;
        const rank = entry.rank || i + 1;

        // Highlight player's current rank (Requirement 7.8)
        const isPlayerRank =
          playerCurrentRank !== null && rank === playerCurrentRank;
        if (isPlayerRank) {
          drawPixelRect(
            ctx,
            panelX + 4,
            ry - 1,
            panelW - 8,
            rowH - 1,
            'rgba(255,208,128,0.15)',
          );
        }

        // Rank number
        const rankColor =
          rank === 1
            ? COLORS.GLOW_WARM
            : rank === 2
              ? COLORS.METAL_LIGHT
              : rank === 3
                ? COLORS.SPARK_2
                : isPlayerRank
                  ? COLORS.GLOW_WARM
                  : COLORS.UI_TEXT;
        drawPixelText(ctx, String(rank), colRankX, ry, rankColor, 1);

        // Score value
        let scoreText;
        if (activeFilter === 'deaths') {
          scoreText = String(entry.deaths).padStart(3, '0') + ' deaths';
        } else {
          // Format time as MM:SS.m
          const ms = entry.time || 0;
          const mins = Math.floor(ms / 60000);
          const secs = Math.floor((ms % 60000) / 1000);
          const tenths = Math.floor((ms % 1000) / 100);
          scoreText =
            String(mins).padStart(2, '0') +
            ':' +
            String(secs).padStart(2, '0') +
            '.' +
            tenths;
        }
        drawPixelText(
          ctx,
          scoreText,
          colScoreX,
          ry,
          isPlayerRank ? COLORS.GLOW_WARM : COLORS.UI_TEXT,
          1,
        );

        // Date (short format: MM/DD)
        if (entry.date) {
          try {
            const d = new Date(entry.date);
            const dateStr =
              String(d.getMonth() + 1).padStart(2, '0') +
              '/' +
              String(d.getDate()).padStart(2, '0');
            drawPixelText(ctx, dateStr, colDateX, ry, COLORS.UI_MUTED, 1);
          } catch (e) {
            drawPixelText(ctx, '--/--', colDateX, ry, COLORS.UI_MUTED, 1);
          }
        }
      }
    }
  }

  // ─── Current player rank display (Requirement 7.8) ───
  if (playerCurrentRank !== null && activeFilter !== 'completion') {
    const rankLine = 'YOUR RANK: #' + playerCurrentRank;
    const rankLineW = measurePixelText(rankLine, 1);
    const rankLineY = panelY + panelH - 20;
    drawPixelRect(ctx, panelX + 4, rankLineY - 2, panelW - 8, 12, COLORS.UI_BG);
    drawPixelText(
      ctx,
      rankLine,
      ((SCREEN_W - rankLineW) / 2) | 0,
      rankLineY,
      COLORS.GLOW_WARM,
      1,
    );
  }

  // ─── Navigation hint ───
  const hintY = panelY + panelH - 8;
  const hint1 = 'TAB: FILTER';
  const hint2 = 'ESC/L: CLOSE';
  drawPixelText(ctx, hint1, panelX + 6, hintY, COLORS.UI_MUTED, 1);
  const hint2W = measurePixelText(hint2, 1);
  drawPixelText(
    ctx,
    hint2,
    panelX + panelW - hint2W - 6,
    hintY,
    COLORS.UI_MUTED,
    1,
  );
}

/**
 * Draw the post-level death heatmap analysis screen.
 * Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {DeathHeatmap} deathHeatmap - heatmap system instance
 * @param {string[]} tiles - level tilemap rows
 * @param {number} levelId - current level number
 * @param {object} levelData - level data object (for name)
 * @param {number} tick - game tick for animations
 * @param {number} heatmapTimer - frames elapsed in heatmap state
 */
export function drawHeatmapScreen(
  ctx,
  deathHeatmap,
  tiles,
  levelId,
  levelData,
  tick,
  heatmapTimer,
) {
  // ─── Full-screen dark overlay ───
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.92)');

  // ─── Title ───
  const title = 'DEATH ANALYSIS';
  const titleW = measurePixelText(title, 2);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    6,
    COLORS.GAUGE_LOW,
    2,
  );

  const levelName = levelData ? levelData.name : 'LEVEL ' + levelId;
  const nameW = measurePixelText(levelName, 1);
  drawPixelText(
    ctx,
    levelName,
    ((SCREEN_W - nameW) / 2) | 0,
    22,
    COLORS.UI_MUTED,
    1,
  );

  // ─── Tilemap overlay area ───
  // Render a minimap of the level tilemap, then overlay death dots on top.
  // The minimap is scaled to fit within a fixed panel.
  const PANEL_X = 4;
  const PANEL_Y = 32;
  const PANEL_W = 200;
  const PANEL_H = 120;

  // Draw panel border
  drawPixelBorder(
    ctx,
    PANEL_X,
    PANEL_Y,
    PANEL_W,
    PANEL_H,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Calculate tilemap dimensions
  const tileRows = tiles ? tiles.length : 0;
  const tileCols = tileRows > 0 ? tiles[0].length : 0;

  if (tileRows > 0 && tileCols > 0) {
    // Scale factor to fit tilemap into panel (with 2px inner padding)
    const innerW = PANEL_W - 4;
    const innerH = PANEL_H - 4;
    const scaleX = innerW / tileCols;
    const scaleY = innerH / tileRows;
    const scale = Math.min(scaleX, scaleY);

    const mapW = Math.round(tileCols * scale);
    const mapH = Math.round(tileRows * scale);
    const mapOffX = PANEL_X + 2 + (((innerW - mapW) / 2) | 0);
    const mapOffY = PANEL_Y + 2 + (((innerH - mapH) / 2) | 0);

    // ─── Draw tilemap (Requirement 8.5) ───
    for (let ty = 0; ty < tileRows; ty++) {
      const row = tiles[ty];
      for (let tx = 0; tx < tileCols; tx++) {
        const ch = row[tx];
        if (ch === '.' || ch === 'P') continue;
        const px = mapOffX + Math.round(tx * scale);
        const py = mapOffY + Math.round(ty * scale);
        const pw = Math.max(1, Math.round(scale));
        const ph = Math.max(1, Math.round(scale));
        let tileColor;
        if (ch === 'W') tileColor = COLORS.TILE_MID;
        else if (ch === 'F') tileColor = COLORS.TILE_LIGHT;
        else if (ch === 'D') tileColor = COLORS.METAL_MID;
        else tileColor = COLORS.TILE_DARK;
        drawPixelRect(ctx, px, py, pw, ph, tileColor);
      }
    }

    // ─── Draw death dots (Requirements 8.3, 8.4) ───
    const mergedData = deathHeatmap.getMergedData();
    if (mergedData.length > 0) {
      // Find max count for opacity/size scaling
      const maxCount = mergedData[0].count; // sorted descending

      // Tile size in world pixels (16px per tile)
      const TILE_SIZE = 16;

      for (const entry of mergedData) {
        // Convert world position to minimap position
        const wx = entry.x / TILE_SIZE; // tile-space x
        const wy = entry.y / TILE_SIZE; // tile-space y
        const dotX = mapOffX + Math.round(wx * scale);
        const dotY = mapOffY + Math.round(wy * scale);

        // Skip dots outside the panel
        if (
          dotX < PANEL_X ||
          dotX >= PANEL_X + PANEL_W ||
          dotY < PANEL_Y ||
          dotY >= PANEL_Y + PANEL_H
        )
          continue;

        // Opacity scales with frequency (Requirement 8.3)
        const ratio = maxCount > 1 ? entry.count / maxCount : 1;
        const alpha = 0.3 + ratio * 0.7; // 0.3 min, 1.0 max

        // Dot size scales with frequency (Requirement 8.4)
        // 1px for single death, up to 4px for hotspot
        const dotSize = Math.max(1, Math.min(4, Math.round(1 + ratio * 3)));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS.GAUGE_LOW; // red
        ctx.fillRect(
          (dotX - Math.floor(dotSize / 2)) | 0,
          (dotY - Math.floor(dotSize / 2)) | 0,
          dotSize,
          dotSize,
        );
        ctx.restore();
      }
    }
  }

  // ─── Statistics panel (Requirement 8.6) ───
  const STATS_X = PANEL_X + PANEL_W + 6;
  const STATS_Y = PANEL_Y;
  const STATS_W = SCREEN_W - STATS_X - 4;
  const STATS_H = PANEL_H;

  drawPixelBorder(
    ctx,
    STATS_X,
    STATS_Y,
    STATS_W,
    STATS_H,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  const totalDeaths = deathHeatmap.getTotalDeaths();
  const currentDeaths = deathHeatmap.getCurrentDeathCount();

  // Header
  const statsTitle = 'STATS';
  drawPixelText(ctx, statsTitle, STATS_X + 4, STATS_Y + 4, COLORS.UI_TEXT, 1);

  // Total deaths this session
  drawPixelText(
    ctx,
    'THIS RUN:',
    STATS_X + 4,
    STATS_Y + 16,
    COLORS.UI_MUTED,
    1,
  );
  drawPixelText(
    ctx,
    String(currentDeaths),
    STATS_X + 4,
    STATS_Y + 24,
    COLORS.GAUGE_LOW,
    1,
  );

  // Total deaths all time for this level
  drawPixelText(
    ctx,
    'ALL TIME:',
    STATS_X + 4,
    STATS_Y + 36,
    COLORS.UI_MUTED,
    1,
  );
  drawPixelText(
    ctx,
    String(totalDeaths),
    STATS_X + 4,
    STATS_Y + 44,
    COLORS.METAL_LIGHT,
    1,
  );

  // Most deadly zone coordinates
  const hotspot = deathHeatmap.getMostDeadlyZone();
  if (hotspot) {
    drawPixelText(
      ctx,
      'DEADLIEST:',
      STATS_X + 4,
      STATS_Y + 56,
      COLORS.UI_MUTED,
      1,
    );
    const coordText = 'X:' + hotspot.x + ' Y:' + hotspot.y;
    drawPixelText(
      ctx,
      coordText,
      STATS_X + 4,
      STATS_Y + 64,
      COLORS.GAUGE_LOW,
      1,
    );
    const deathsText = hotspot.totalDeaths + ' DEATHS';
    drawPixelText(
      ctx,
      deathsText,
      STATS_X + 4,
      STATS_Y + 74,
      COLORS.SPARK_2,
      1,
    );
  } else {
    drawPixelText(
      ctx,
      'NO DATA',
      STATS_X + 4,
      STATS_Y + 56,
      COLORS.UI_MUTED,
      1,
    );
  }

  // ─── Skip hint (Requirement 8.7) ───
  const skipY = PANEL_Y + PANEL_H + 8;
  if (Math.floor(tick / 30) % 2 === 0) {
    const skipText = 'PRESS SPACE TO CONTINUE';
    const skipW = measurePixelText(skipText, 1);
    drawPixelText(
      ctx,
      skipText,
      ((SCREEN_W - skipW) / 2) | 0,
      skipY,
      COLORS.UI_TEXT,
      1,
    );
  }

  // ─── Legend ───
  const legendY = skipY + 12;
  const legendX = ((SCREEN_W / 2) | 0) - 30;
  // Draw small hazard stripe for legend
  drawPixelRect(ctx, legendX, legendY + 2, 2, 4, COLORS.GAUGE_LOW);
  drawPixelRect(ctx, legendX + 2, legendY + 2, 2, 4, '#2A1810');
  
  drawPixelText(
    ctx,
    '= DEATH ZONE',
    legendX + 6,
    legendY,
    COLORS.UI_MUTED,
    1,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY CHALLENGE UI (Requirements 9.7, 9.8, 9.9)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Draw the Daily Challenge menu screen.
 * Shows today's challenge info, modifier description, and completion status.
 * Requirement 9.9
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {DailyChallengeSystem} dailyChallengeSystem
 * @param {number} tick
 */
export function drawDailyChallengeMenu(ctx, dailyChallengeSystem, tick) {
  // Full-screen dark overlay
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.92)');

  // ─── Title ───
  const title = 'DAILY CHALLENGE';
  const titleW = measurePixelText(title, 2);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    12,
    COLORS.GLOW_WARM,
    2,
  );

  // ─── Today's challenge info ───
  const challenge = dailyChallengeSystem.getTodayChallenge();
  const modDef = challenge.modifierDef;

  // Date
  const dateText = challenge.date;
  const dateW = measurePixelText(dateText, 1);
  drawPixelText(
    ctx,
    dateText,
    ((SCREEN_W - dateW) / 2) | 0,
    34,
    COLORS.UI_MUTED,
    1,
  );

  // Modifier panel
  const panelW = 260;
  const panelH = 80;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = 44;
  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Modifier icon
  const iconText = '[' + modDef.icon + ']';
  const iconW = measurePixelText(iconText, 2);
  drawPixelText(ctx, iconText, panelX + 8, panelY + 8, COLORS.SPARK_1, 2);

  // Modifier name
  const modName = modDef.name.toUpperCase();
  const modNameW = measurePixelText(modName, 1);
  drawPixelText(
    ctx,
    modName,
    panelX + 8 + iconW + 6,
    panelY + 10,
    COLORS.GLOW_WARM,
    1,
  );

  // Modifier description
  const modDesc = modDef.description.toUpperCase();
  const modDescW = measurePixelText(modDesc, 1);
  drawPixelText(
    ctx,
    modDesc,
    ((SCREEN_W - modDescW) / 2) | 0,
    panelY + 30,
    COLORS.UI_TEXT,
    1,
  );

  // Rules (first rule only, to fit)
  if (modDef.rules && modDef.rules.length > 0) {
    const rule = modDef.rules[0].toUpperCase();
    const ruleW = measurePixelText(rule, 1);
    drawPixelText(
      ctx,
      rule,
      ((SCREEN_W - ruleW) / 2) | 0,
      panelY + 44,
      COLORS.UI_MUTED,
      1,
    );
  }
  if (modDef.rules && modDef.rules.length > 1) {
    const rule2 = modDef.rules[1].toUpperCase();
    const rule2W = measurePixelText(rule2, 1);
    drawPixelText(
      ctx,
      rule2,
      ((SCREEN_W - rule2W) / 2) | 0,
      panelY + 54,
      COLORS.UI_MUTED,
      1,
    );
  }

  // ─── Completion status (Requirement 9.7) ───
  const status = dailyChallengeSystem.getTodayStatus();
  const statusY = panelY + panelH + 8;

  if (status.completed) {
    const completedText = 'COMPLETED!';
    const completedW = measurePixelText(completedText, 1);
    drawPixelText(
      ctx,
      completedText,
      ((SCREEN_W - completedW) / 2) | 0,
      statusY,
      COLORS.GLOW_WARM,
      1,
    );

    if (status.bestScore !== null) {
      const bestText = 'BEST SCORE: ' + status.bestScore + ' DEATHS';
      const bestW = measurePixelText(bestText, 1);
      drawPixelText(
        ctx,
        bestText,
        ((SCREEN_W - bestW) / 2) | 0,
        statusY + 10,
        COLORS.METAL_LIGHT,
        1,
      );
    }

    const attemptsText = 'ATTEMPTS: ' + status.attempts;
    const attemptsW = measurePixelText(attemptsText, 1);
    drawPixelText(
      ctx,
      attemptsText,
      ((SCREEN_W - attemptsW) / 2) | 0,
      statusY + 20,
      COLORS.UI_MUTED,
      1,
    );
  } else if (status.attempts > 0) {
    const failedText = 'NOT COMPLETED YET';
    const failedW = measurePixelText(failedText, 1);
    drawPixelText(
      ctx,
      failedText,
      ((SCREEN_W - failedW) / 2) | 0,
      statusY,
      COLORS.GAUGE_LOW,
      1,
    );

    const attemptsText = 'ATTEMPTS: ' + status.attempts;
    const attemptsW = measurePixelText(attemptsText, 1);
    drawPixelText(
      ctx,
      attemptsText,
      ((SCREEN_W - attemptsW) / 2) | 0,
      statusY + 10,
      COLORS.UI_MUTED,
      1,
    );
  } else {
    const newText = 'NEW CHALLENGE!';
    const newW = measurePixelText(newText, 1);
    drawPixelText(
      ctx,
      newText,
      ((SCREEN_W - newW) / 2) | 0,
      statusY,
      COLORS.SPARK_1,
      1,
    );
  }

  // ─── Navigation hints ───
  const hintY = SCREEN_H - 24;
  if (Math.floor(tick / 30) % 2 === 0) {
    const startText = 'PRESS SPACE TO START';
    const startW = measurePixelText(startText, 1);
    drawPixelText(
      ctx,
      startText,
      ((SCREEN_W - startW) / 2) | 0,
      hintY,
      COLORS.UI_TEXT,
      1,
    );
  }
  const backText = 'PRESS R TO GO BACK';
  const backW = measurePixelText(backText, 1);
  drawPixelText(
    ctx,
    backText,
    ((SCREEN_W - backW) / 2) | 0,
    hintY + 10,
    COLORS.UI_MUTED,
    1,
  );
}

/**
 * Draw the Daily Challenge start screen.
 * Shows modifier explanation before the challenge begins.
 * Requirement 9.9
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {DailyChallengeSystem} dailyChallengeSystem
 * @param {number} tick
 */
export function drawDailyChallengeStart(ctx, dailyChallengeSystem, tick) {
  // Full-screen dark overlay
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.92)');

  // ─── Title ───
  const title = 'CHALLENGE BEGINS';
  const titleW = measurePixelText(title, 2);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    10,
    COLORS.GLOW_WARM,
    2,
  );

  // ─── Modifier info ───
  const challenge = dailyChallengeSystem.getTodayChallenge();
  const modDef = challenge.modifierDef;

  // Modifier name (large)
  const modName = modDef.name.toUpperCase();
  const modNameW = measurePixelText(modName, 2);
  drawPixelText(
    ctx,
    modName,
    ((SCREEN_W - modNameW) / 2) | 0,
    34,
    COLORS.SPARK_1,
    2,
  );

  // Modifier icon (pulsing)
  const pulse = Math.abs(Math.sin(tick * 0.08));
  const iconColor = pulse > 0.5 ? COLORS.GLOW_WARM : COLORS.SPARK_2;
  const iconText = '[' + modDef.icon + ']';
  const iconW = measurePixelText(iconText, 3);
  drawPixelText(ctx, iconText, ((SCREEN_W - iconW) / 2) | 0, 52, iconColor, 3);

  // ─── Rules panel ───
  const panelW = 280;
  const panelH = 70;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = 90;
  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  const rulesTitle = 'RULES:';
  drawPixelText(ctx, rulesTitle, panelX + 6, panelY + 6, COLORS.UI_TEXT, 1);

  if (modDef.rules) {
    for (let i = 0; i < Math.min(modDef.rules.length, 3); i++) {
      const rule = ('- ' + modDef.rules[i]).toUpperCase();
      const ruleW = measurePixelText(rule, 1);
      drawPixelText(
        ctx,
        rule,
        panelX + 6,
        panelY + 18 + i * 14,
        COLORS.UI_MUTED,
        1,
      );
    }
  }

  // ─── Warning for one_life modifier ───
  if (challenge.modifier === 'one_life') {
    const warnText = '! ONE DEATH = CHALLENGE OVER !';
    const warnW = measurePixelText(warnText, 1);
    const warnColor =
      Math.floor(tick / 15) % 2 === 0 ? COLORS.GAUGE_LOW : COLORS.SPARK_2;
    drawPixelText(
      ctx,
      warnText,
      ((SCREEN_W - warnW) / 2) | 0,
      panelY + panelH + 8,
      warnColor,
      1,
    );
  }

  // ─── Navigation hints ───
  const hintY = SCREEN_H - 24;
  if (Math.floor(tick / 30) % 2 === 0) {
    const startText = 'PRESS SPACE TO BEGIN';
    const startW = measurePixelText(startText, 1);
    drawPixelText(
      ctx,
      startText,
      ((SCREEN_W - startW) / 2) | 0,
      hintY,
      COLORS.GLOW_WARM,
      1,
    );
  }
  const backText = 'PRESS R TO GO BACK';
  const backW = measurePixelText(backText, 1);
  drawPixelText(
    ctx,
    backText,
    ((SCREEN_W - backW) / 2) | 0,
    hintY + 10,
    COLORS.UI_MUTED,
    1,
  );
}

/**
 * Draw the Daily Challenge completion screen.
 * Shows score, new best indicator, and return to title option.
 * Requirement 9.7
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} game - Game state
 * @param {DailyChallengeSystem} dailyChallengeSystem
 * @param {number} tick
 */
export function drawDailyChallengeComplete(
  ctx,
  game,
  dailyChallengeSystem,
  tick,
) {
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.85)');

  // ─── Title ───
  const title = 'CHALLENGE COMPLETE!';
  const titleW = measurePixelText(title, 2);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    14,
    COLORS.GLOW_WARM,
    2,
  );

  // ─── Modifier used ───
  const challenge = dailyChallengeSystem.getTodayChallenge();
  const modDef = challenge.modifierDef;
  const modText = 'MODIFIER: ' + modDef.name.toUpperCase();
  const modW = measurePixelText(modText, 1);
  drawPixelText(
    ctx,
    modText,
    ((SCREEN_W - modW) / 2) | 0,
    38,
    COLORS.SPARK_1,
    1,
  );

  // ─── Score panel ───
  const panelW = 220;
  const panelH = 70;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = 52;
  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Deaths score
  const deathsLabel = 'DEATHS:';
  drawPixelText(ctx, deathsLabel, panelX + 10, panelY + 10, COLORS.UI_MUTED, 1);
  const deathsVal = String(game.dailyChallenge.completionDeaths);
  const deathsValW = measurePixelText(deathsVal, 2);
  drawPixelText(
    ctx,
    deathsVal,
    panelX + panelW - deathsValW - 10,
    panelY + 8,
    COLORS.UI_TEXT,
    2,
  );

  // New best indicator
  if (game.dailyChallenge.isNewBest) {
    const newBestText = 'NEW BEST!';
    const newBestW = measurePixelText(newBestText, 1);
    const newBestColor =
      Math.floor(tick / 15) % 2 === 0 ? COLORS.GLOW_WARM : COLORS.SPARK_1;
    drawPixelText(
      ctx,
      newBestText,
      ((SCREEN_W - newBestW) / 2) | 0,
      panelY + 32,
      newBestColor,
      1,
    );
  } else {
    // Show best score
    const status = dailyChallengeSystem.getTodayStatus();
    if (status.bestScore !== null) {
      const bestLabel = 'BEST: ' + status.bestScore + ' DEATHS';
      const bestW = measurePixelText(bestLabel, 1);
      drawPixelText(
        ctx,
        bestLabel,
        ((SCREEN_W - bestW) / 2) | 0,
        panelY + 32,
        COLORS.METAL_LIGHT,
        1,
      );
    }
  }

  // Attempts
  const status = dailyChallengeSystem.getTodayStatus();
  const attemptsText = 'ATTEMPTS TODAY: ' + status.attempts;
  const attemptsW = measurePixelText(attemptsText, 1);
  drawPixelText(
    ctx,
    attemptsText,
    ((SCREEN_W - attemptsW) / 2) | 0,
    panelY + 50,
    COLORS.UI_MUTED,
    1,
  );

  // ─── Judge message ───
  const deaths = game.dailyChallenge.completionDeaths;
  let judgeMsg;
  if (deaths === 0) judgeMsg = 'FLAWLESS. THE MACHINE IS IMPRESSED.';
  else if (deaths <= 5) judgeMsg = 'NEARLY PERFECT. NEARLY.';
  else if (deaths <= 15) judgeMsg = 'THE MACHINE ACKNOWLEDGES YOUR SKILL.';
  else if (deaths <= 30) judgeMsg = 'PERSISTENCE REWARDED.';
  else judgeMsg = 'YOU SURVIVED. THAT IS ENOUGH.';

  const judgeW = measurePixelText(judgeMsg, 1);
  drawPixelText(
    ctx,
    judgeMsg,
    ((SCREEN_W - judgeW) / 2) | 0,
    panelY + panelH + 10,
    COLORS.UI_MUTED,
    1,
  );

  // ─── Navigation hint ───
  const hintY = SCREEN_H - 16;
  if (Math.floor(tick / 30) % 2 === 0) {
    const hintText = 'PRESS SPACE TO RETURN';
    const hintW = measurePixelText(hintText, 1);
    drawPixelText(
      ctx,
      hintText,
      ((SCREEN_W - hintW) / 2) | 0,
      hintY,
      COLORS.UI_TEXT,
      1,
    );
  }
}

/**
 * Draw the Daily Challenge failed screen (one_life mode: first death ends challenge).
 * Requirement 9.4
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} game - Game state
 * @param {DailyChallengeSystem} dailyChallengeSystem
 * @param {number} tick
 */
export function drawDailyChallengeFailed(
  ctx,
  game,
  dailyChallengeSystem,
  tick,
) {
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.85)');

  // ─── Title ───
  const title = 'CHALLENGE FAILED';
  const titleW = measurePixelText(title, 2);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    14,
    COLORS.GAUGE_LOW,
    2,
  );

  // ─── Modifier used ───
  const challenge = dailyChallengeSystem.getTodayChallenge();
  const modDef = challenge.modifierDef;
  const modText = 'MODIFIER: ' + modDef.name.toUpperCase();
  const modW = measurePixelText(modText, 1);
  drawPixelText(
    ctx,
    modText,
    ((SCREEN_W - modW) / 2) | 0,
    38,
    COLORS.SPARK_1,
    1,
  );

  // ─── Failure message panel ───
  const panelW = 220;
  const panelH = 60;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = 52;
  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  const failMsg1 = 'ONE LIFE. ONE CHANCE.';
  const failMsg1W = measurePixelText(failMsg1, 1);
  drawPixelText(
    ctx,
    failMsg1,
    ((SCREEN_W - failMsg1W) / 2) | 0,
    panelY + 12,
    COLORS.GAUGE_LOW,
    1,
  );

  const failMsg2 = 'THE MACHINE WINS TODAY.';
  const failMsg2W = measurePixelText(failMsg2, 1);
  drawPixelText(
    ctx,
    failMsg2,
    ((SCREEN_W - failMsg2W) / 2) | 0,
    panelY + 26,
    COLORS.UI_MUTED,
    1,
  );

  // Attempts
  const status = dailyChallengeSystem.getTodayStatus();
  const attemptsText = 'ATTEMPTS TODAY: ' + status.attempts;
  const attemptsW = measurePixelText(attemptsText, 1);
  drawPixelText(
    ctx,
    attemptsText,
    ((SCREEN_W - attemptsW) / 2) | 0,
    panelY + 42,
    COLORS.UI_MUTED,
    1,
  );

  // ─── Encouragement ───
  const encText = 'TRY AGAIN TOMORROW.';
  const encW = measurePixelText(encText, 1);
  drawPixelText(
    ctx,
    encText,
    ((SCREEN_W - encW) / 2) | 0,
    panelY + panelH + 10,
    COLORS.UI_MUTED,
    1,
  );

  // ─── Navigation hint ───
  const hintY = SCREEN_H - 16;
  if (Math.floor(tick / 30) % 2 === 0) {
    const hintText = 'PRESS SPACE TO RETURN';
    const hintW = measurePixelText(hintText, 1);
    drawPixelText(
      ctx,
      hintText,
      ((SCREEN_W - hintW) / 2) | 0,
      hintY,
      COLORS.UI_TEXT,
      1,
    );
  }
}

/**
 * Draw the Daily Challenge HUD overlay during gameplay.
 * Shows active modifier and current death count.
 * Requirement 9.7
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} game - Game state
 * @param {DailyChallengeSystem} dailyChallengeSystem
 * @param {number} tick
 */
export function drawDailyChallengeHUD(ctx, game, dailyChallengeSystem, tick) {
  if (!dailyChallengeSystem.isActive()) return;

  const modifier = dailyChallengeSystem.getActiveModifier();
  if (!modifier) return;

  const modDef = dailyChallengeSystem.getModifierDef(modifier);
  if (!modDef) return;

  // ─── Modifier badge (top-left, below level info) ───
  const badgeX = 4;
  const badgeY = 26;
  const badgeW = 80;
  const badgeH = 12;

  drawPixelBorder(
    ctx,
    badgeX,
    badgeY,
    badgeW,
    badgeH,
    COLORS.SPARK_2,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Pulsing icon
  const pulse = Math.abs(Math.sin(tick * 0.1));
  const iconColor = pulse > 0.5 ? COLORS.SPARK_1 : COLORS.GLOW_WARM;
  drawPixelText(ctx, modDef.icon, badgeX + 3, badgeY + 2, iconColor, 1);

  // Modifier name (abbreviated)
  const shortName = modDef.name.toUpperCase().substring(0, 10);
  drawPixelText(ctx, shortName, badgeX + 14, badgeY + 2, COLORS.UI_TEXT, 1);

  // ─── "DAILY" label ───
  const dailyLabel = 'DAILY';
  drawPixelText(ctx, dailyLabel, badgeX + 3, badgeY - 8, COLORS.GLOW_WARM, 1);
}

/**
 * Draw level editor UI
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {LevelEditor} editor - Level editor instance
 * @param {number} tick - Current game tick
 */
export function drawLevelEditor(ctx, editor, tick) {
  // Editor renders itself
  editor.render(ctx, tick);

  // Draw instructions at bottom
  const instructions = [
    'W/F/D/.: Tiles',
    '1: Obstacle',
    '2: Gear',
    '3: Exit',
    '4: Spawn',
    'X: Erase',
    'P: Playtest',
    'E: Export',
    'I: Import',
    'C: Clear',
    'ESC: Exit',
  ];

  let instrY = SCREEN_H - 12;
  let instrX = 4;

  for (const instr of instructions) {
    const width = measurePixelText(instr, 1);
    drawPixelText(ctx, instr, instrX, instrY, COLORS.UI_MUTED, 1);
    instrX += width + 8;

    // Wrap to next line if needed
    if (instrX > SCREEN_W - 60) {
      instrX = 4;
      instrY -= 10;
    }
  }
}

/**
 * Draw accessibility settings panel (Requirement 13.6)
 * Shows current accessibility settings and instructions for changing them
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} tick - Current game tick
 * @param {number} selectedOption - Currently selected option (0-4)
 */
export function drawAccessibilitySettings(ctx, tick, selectedOption = 0) {
  // Full-screen dark overlay
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.85)');

  // Title
  const title = 'ACCESSIBILITY SETTINGS';
  const titleW = measurePixelText(title, 2);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    20,
    COLORS.GLOW_WARM,
    2,
  );

  // Settings panel
  const panelW = 280;
  const panelH = 140;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = 50;

  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Get current settings
  const settings = accessibilitySystem.getSettings();

  // Option list
  const options = [
    {
      label: 'COLORBLIND MODE',
      value: settings.colorblindMode ? 'ON' : 'OFF',
      key: 'C',
    },
    {
      label: 'REDUCE MOTION',
      value: settings.reduceMotion ? 'ON' : 'OFF',
      key: 'M',
    },
    { label: 'TEXT SCALE', value: `${settings.textScale}X`, key: 'T' },
    {
      label: 'HIGH CONTRAST',
      value: settings.highContrast ? 'ON' : 'OFF',
      key: 'H',
    },
    { label: 'REMAP CONTROLS', value: 'PRESS K', key: 'K' },
  ];

  let optionY = panelY + 10;
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const isSelected = i === selectedOption;

    // Selection indicator
    if (isSelected) {
      drawPixelRect(
        ctx,
        panelX + 4,
        optionY - 1,
        panelW - 8,
        12,
        COLORS.METAL_DARK,
      );
    }

    // Option label
    const labelColor = isSelected ? COLORS.GLOW_WARM : COLORS.UI_TEXT;
    drawPixelText(ctx, option.label, panelX + 8, optionY + 2, labelColor, 1);

    // Option value
    const valueW = measurePixelText(option.value, 1);
    const valueColor = isSelected ? COLORS.GLOW_WARM : COLORS.UI_MUTED;
    drawPixelText(
      ctx,
      option.value,
      panelX + panelW - valueW - 8,
      optionY + 2,
      valueColor,
      1,
    );

    optionY += 14;
  }

  // Instructions
  const instructions = [
    'ARROW KEYS: NAVIGATE',
    'SPACE/ENTER: TOGGLE',
    'ESC: BACK TO PAUSE MENU',
  ];

  let instrY = panelY + panelH + 10;
  for (const instr of instructions) {
    const instrW = measurePixelText(instr, 1);
    drawPixelText(
      ctx,
      instr,
      ((SCREEN_W - instrW) / 2) | 0,
      instrY,
      COLORS.UI_MUTED,
      1,
    );
    instrY += 10;
  }
}

/**
 * Draw control remapping UI (Requirement 13.6)
 * Shows current control mappings and allows remapping
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} tick - Current game tick
 * @param {number} selectedAction - Currently selected action index
 * @param {boolean} waitingForKey - Whether waiting for key press
 */
export function drawControlRemapping(
  ctx,
  tick,
  selectedAction = 0,
  waitingForKey = false,
) {
  // Full-screen dark overlay
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.85)');

  // Title
  const title = 'CONTROL REMAPPING';
  const titleW = measurePixelText(title, 2);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    20,
    COLORS.GLOW_WARM,
    2,
  );

  // Settings panel
  const panelW = 280;
  const panelH = 120;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = 50;

  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Get current remapped controls
  const remappedControls = accessibilitySystem.getAllRemappedControls();

  // Action list
  const actions = [
    { name: 'MOVE LEFT', action: 'LEFT', default: 'A/ARROW' },
    { name: 'MOVE RIGHT', action: 'RIGHT', default: 'D/ARROW' },
    { name: 'JUMP', action: 'UP', default: 'W/SPACE' },
    { name: 'WIND UP', action: 'WIND', default: 'E' },
    { name: 'RETRY', action: 'RETRY', default: 'R' },
    { name: 'PAUSE', action: 'PAUSE', default: 'P/ESC' },
  ];

  let actionY = panelY + 10;
  for (let i = 0; i < actions.length && i < 6; i++) {
    const action = actions[i];
    const isSelected = i === selectedAction;

    // Selection indicator
    if (isSelected) {
      drawPixelRect(
        ctx,
        panelX + 4,
        actionY - 1,
        panelW - 8,
        12,
        COLORS.METAL_DARK,
      );
    }

    // Action name
    const nameColor = isSelected ? COLORS.GLOW_WARM : COLORS.UI_TEXT;
    drawPixelText(ctx, action.name, panelX + 8, actionY + 2, nameColor, 1);

    // Current key
    const currentKey = remappedControls[action.action] || action.default;
    const keyW = measurePixelText(currentKey, 1);
    const keyColor = isSelected ? COLORS.GLOW_WARM : COLORS.UI_MUTED;
    drawPixelText(
      ctx,
      currentKey,
      panelX + panelW - keyW - 8,
      actionY + 2,
      keyColor,
      1,
    );

    actionY += 14;
  }

  // Waiting for key indicator
  if (waitingForKey && Math.floor(tick / 15) % 2 === 0) {
    const waitText = 'PRESS NEW KEY...';
    const waitW = measurePixelText(waitText, 1);
    drawPixelText(
      ctx,
      waitText,
      ((SCREEN_W - waitW) / 2) | 0,
      panelY + panelH + 10,
      COLORS.GLOW_WARM,
      1,
    );
  }

  // Instructions
  const instructions = [
    'ARROW KEYS: NAVIGATE',
    'SPACE/ENTER: REMAP KEY',
    'DELETE: RESET TO DEFAULT',
    'ESC: BACK',
  ];

  let instrY = panelY + panelH + 25;
  for (const instr of instructions) {
    const instrW = measurePixelText(instr, 1);
    drawPixelText(
      ctx,
      instr,
      ((SCREEN_W - instrW) / 2) | 0,
      instrY,
      COLORS.UI_MUTED,
      1,
    );
    instrY += 10;
  }
}

// ═══════ ONBOARDING FLOW UI (Requirement 19) ═══════

/**
 * Draw onboarding welcome screen (Requirement 19.2)
 * Displays game introduction for first-time players
 */
export function drawOnboardingWelcome(ctx, tick) {
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, COLORS.BACKGROUND);

  // Background gears (reuse from title screen)
  drawBgGears(ctx, tick);

  // Title
  const t1 = 'WELCOME TO';
  const t2 = 'BROKEN CLOCKWORK';
  const t1w = measurePixelText(t1, 2);
  const t2w = measurePixelText(t2, 3);
  drawPixelText(ctx, t1, ((SCREEN_W - t1w) / 2) | 0, 20, COLORS.UI_MUTED, 2);
  drawPixelText(ctx, t2, ((SCREEN_W - t2w) / 2) | 0, 40, COLORS.METAL_LIGHT, 3);

  // Introduction panel
  const panelW = 280;
  const panelH = 100;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = 70;

  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Introduction text
  const introLines = [
    'A CLOCKWORK DOLL NAMED MIRA',
    'MUST NAVIGATE DEADLY TRAPS',
    'IN A STEAMPUNK FACTORY.',
    '',
    'WIND UP MECHANISMS,',
    'COLLECT GEARS,',
    'AND SURVIVE THE MACHINE.',
    '',
    'DEATH IS FREQUENT.',
    'PERSISTENCE IS REWARDED.',
  ];

  let lineY = panelY + 8;
  for (const line of introLines) {
    if (line === '') {
      lineY += 6; // Spacing for empty lines
      continue;
    }
    const lineW = measurePixelText(line, 1);
    const lineX = ((SCREEN_W - lineW) / 2) | 0;
    drawPixelText(ctx, line, lineX, lineY, COLORS.UI_TEXT, 1);
    lineY += 9;
  }

  // Instructions
  if (Math.floor(tick / 30) % 2 === 0) {
    const continueText = 'PRESS SPACE TO CONTINUE';
    const continueW = measurePixelText(continueText, 1);
    drawPixelText(
      ctx,
      continueText,
      ((SCREEN_W - continueW) / 2) | 0,
      180,
      COLORS.GLOW_WARM,
      1,
    );
  }

  const skipText = 'PRESS ESCAPE TO SKIP';
  const skipW = measurePixelText(skipText, 1);
  drawPixelText(
    ctx,
    skipText,
    ((SCREEN_W - skipW) / 2) | 0,
    192,
    COLORS.UI_MUTED,
    1,
  );
}

/**
 * Draw onboarding difficulty selection screen (Requirement 19.3)
 * Prompts new player to select difficulty before starting
 */
export function drawOnboardingDifficulty(ctx, tick, selectedDifficulty) {
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, COLORS.BACKGROUND);

  // Background gears
  drawBgGears(ctx, tick);

  // Title
  const title = 'SELECT DIFFICULTY';
  const titleW = measurePixelText(title, 2);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    20,
    COLORS.METAL_LIGHT,
    2,
  );

  // Subtitle
  const subtitle = 'CHOOSE YOUR CHALLENGE LEVEL';
  const subtitleW = measurePixelText(subtitle, 1);
  drawPixelText(
    ctx,
    subtitle,
    ((SCREEN_W - subtitleW) / 2) | 0,
    40,
    COLORS.UI_MUTED,
    1,
  );

  // Difficulty options
  const difficulties = ['Casual', 'Normal', 'Hardcore'];
  const descriptions = [
    'SLOWER OBSTACLES, MORE FORGIVING',
    'BALANCED EXPERIENCE',
    'FASTER OBSTACLES, NO ASSISTANCE',
  ];

  const optionY = 60;
  const optionSpacing = 35;

  for (let i = 0; i < difficulties.length; i++) {
    const difficulty = difficulties[i];
    const description = descriptions[i];
    const isSelected = difficulty === selectedDifficulty;

    const y = optionY + i * optionSpacing;

    // Selection panel
    const panelW = 260;
    const panelH = 28;
    const panelX = ((SCREEN_W - panelW) / 2) | 0;

    if (isSelected) {
      // Highlighted selection
      drawPixelBorder(
        ctx,
        panelX,
        y,
        panelW,
        panelH,
        COLORS.GLOW_WARM,
        COLORS.METAL_DARK,
        COLORS.METAL_DARK,
        1,
      );
    } else {
      // Normal option
      drawPixelBorder(
        ctx,
        panelX,
        y,
        panelW,
        panelH,
        COLORS.UI_BORDER_L,
        COLORS.UI_BORDER_D,
        COLORS.UI_BG,
        1,
      );
    }

    // Difficulty name
    const nameColor = isSelected ? COLORS.GLOW_WARM : COLORS.UI_TEXT;
    const nameW = measurePixelText(difficulty, 1);
    drawPixelText(
      ctx,
      difficulty,
      ((SCREEN_W - nameW) / 2) | 0,
      y + 4,
      nameColor,
      1,
    );

    // Description
    const descColor = isSelected ? COLORS.UI_TEXT : COLORS.UI_MUTED;
    const descW = measurePixelText(description, 1);
    drawPixelText(
      ctx,
      description,
      ((SCREEN_W - descW) / 2) | 0,
      y + 16,
      descColor,
      1,
    );
  }

  // Instructions
  const instructions = [
    'ARROW KEYS: SELECT',
    'SPACE: CONFIRM',
    'ESC: SKIP ONBOARDING',
  ];

  let instrY = 170;
  for (const instr of instructions) {
    const instrW = measurePixelText(instr, 1);
    const color =
      instr.includes('SPACE') && Math.floor(tick / 30) % 2 === 0
        ? COLORS.GLOW_WARM
        : COLORS.UI_MUTED;
    drawPixelText(ctx, instr, ((SCREEN_W - instrW) / 2) | 0, instrY, color, 1);
    instrY += 10;
  }
}

/**
 * Draw onboarding completion screen (Requirement 19.5)
 * Displays congratulations message after tutorial completion
 */
export function drawOnboardingComplete(ctx, tick) {
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, COLORS.BACKGROUND);

  // Background gears
  drawBgGears(ctx, tick);

  // Congratulations title
  const title = 'CONGRATULATIONS!';
  const titleW = measurePixelText(title, 3);
  drawPixelText(
    ctx,
    title,
    ((SCREEN_W - titleW) / 2) | 0,
    30,
    COLORS.GLOW_WARM,
    3,
  );

  // Completion panel
  const panelW = 280;
  const panelH = 80;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = 70;

  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    1,
  );

  // Completion message
  const messages = [
    'YOU HAVE COMPLETED',
    'THE TUTORIAL!',
    '',
    'LEVEL 1 IS NOW UNLOCKED.',
    '',
    'THE MACHINE AWAITS.',
  ];

  let msgY = panelY + 12;
  for (const msg of messages) {
    if (msg === '') {
      msgY += 6;
      continue;
    }
    const msgW = measurePixelText(msg, 1);
    const msgX = ((SCREEN_W - msgW) / 2) | 0;
    const color = msg.includes('LEVEL 1') ? COLORS.GLOW_WARM : COLORS.UI_TEXT;
    drawPixelText(ctx, msg, msgX, msgY, color, 1);
    msgY += 10;
  }

  // Continue instruction
  if (Math.floor(tick / 30) % 2 === 0) {
    const continueText = 'PRESS SPACE TO BEGIN';
    const continueW = measurePixelText(continueText, 1);
    drawPixelText(
      ctx,
      continueText,
      ((SCREEN_W - continueW) / 2) | 0,
      170,
      COLORS.GLOW_WARM,
      1,
    );
  }
}

/**
 * Draw loading indicator screen (Requirement 17.4)
 * Displayed when loading saved data on startup
 */
export function drawLoading(ctx, tick) {
  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, COLORS.BACKGROUND);

  // Background gears (subtle)
  drawBgGears(ctx, tick);

  // Loading panel
  const panelW = 160;
  const panelH = 40;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;
  const panelY = ((SCREEN_H - panelH) / 2) | 0;

  drawPixelBorder(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    COLORS.UI_BORDER_L,
    COLORS.UI_BORDER_D,
    COLORS.UI_BG,
    2,
  );

  // Animated dots (cycles every 30 frames)
  const dotCount = Math.floor(tick / 20) % 4;
  const dots = '.'.repeat(dotCount);
  const loadingText = 'LOADING' + dots;
  const textW = measurePixelText(loadingText, 1);
  drawPixelText(
    ctx,
    loadingText,
    ((SCREEN_W - textW) / 2) | 0,
    panelY + 10,
    COLORS.GLOW_WARM,
    1,
  );

  // Progress bar (animated)
  const barW = panelW - 20;
  const barH = 4;
  const barX = panelX + 10;
  const barY = panelY + 26;
  drawPixelRect(ctx, barX, barY, barW, barH, COLORS.GAUGE_BG);

  // Animated fill using tick
  const fillProgress = (tick * 2) % (barW + 1);
  if (fillProgress > 0) {
    drawPixelRect(ctx, barX, barY, fillProgress | 0, barH, COLORS.GAUGE_FULL);
  }
}

export function getOnboardingDifficultyInteraction(x, y) {
  const optionY = 60;
  const optionSpacing = 35;
  const panelW = 260;
  const panelH = 28;
  const panelX = ((SCREEN_W - panelW) / 2) | 0;

  const difficulties = ['Casual', 'Normal', 'Hardcore'];
  for (let i = 0; i < difficulties.length; i++) {
    const optY = optionY + i * optionSpacing;
    if (x >= panelX && x <= panelX + panelW && y >= optY && y <= optY + panelH) {
      return { type: 'difficulty', selection: difficulties[i] };
    }
  }
  return null;
}

export function getDailyChallengeInteraction(x, y) {
  // Simple check for the large modifier panel or the "START" hint at bottom
  if (y > SCREEN_H - 40) return { type: 'start' };
  if (y > 40 && y < 140) return { type: 'start' }; // The modifier panel
  return null;
}
