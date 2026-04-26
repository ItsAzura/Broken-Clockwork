/*
 * levelEditor.js
 * Level Editor implementation for BROKEN CLOCKWORK
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9
 * 
 * Features:
 * - Drag-and-drop tile placement (W, F, D, .)
 * - Obstacle placement (PISTON, ORBIT_SPHERE, PENDULUM, GEAR_SPINNER, BOUNCING_BALL)
 * - Gear token and goal trigger placement
 * - Player spawn position setting
 * - Playtest mode with seamless transition
 * - Level validation (gear tokens, goal trigger requirements)
 * - Export/import as JSON string
 */

import { TILE, SCREEN_W, SCREEN_H, COLORS, AUTO, OBJ } from './constants.js';
import { drawPixelRect, drawPixelBorder, drawPixelText, measurePixelText } from './draw.js';

// Editor tool types
const TOOL_TYPES = Object.freeze({
    TILE: 'TILE',
    OBSTACLE: 'OBSTACLE',
    GEAR_TOKEN: 'GEAR_TOKEN',
    GOAL_TRIGGER: 'GOAL_TRIGGER',
    PLAYER_SPAWN: 'PLAYER_SPAWN',
    ERASER: 'ERASER',
});

// Tile types for placement
const TILE_TYPES = ['W', 'F', 'D', '.'];

// Obstacle types for placement (Requirement 10.2)
const OBSTACLE_TYPES = [
    AUTO.PISTON,
    AUTO.ORBIT_SPHERE,
    AUTO.PENDULUM,
    AUTO.GEAR_SPINNER,
    AUTO.BOUNCING_BALL,
];

/**
 * LevelEditor class
 * Manages level editor state and operations
 */
export class LevelEditor {
    constructor() {
        // Grid dimensions (16x16 tiles for 320x180 screen)
        this.gridWidth = 20;  // 320 / 16
        this.gridHeight = 11; // 180 / 16
        
        // Editor state
        this.tilemap = [];
        this.obstacles = [];
        this.gearTokens = [];
        this.goalTrigger = null;
        this.playerSpawn = null;
        
        // UI state
        this.currentTool = TOOL_TYPES.TILE;
        this.currentTileType = 'W';
        this.currentObstacleType = AUTO.PISTON;
        this.selectedObstacle = null;
        this.obstacleConfigMode = false;
        
        // Camera/scroll
        this.cameraX = 0;
        this.cameraY = 0;
        
        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.lastPlacedTile = null;
        
        // Tool palette state
        this.paletteVisible = true;
        this.paletteX = 4;
        this.paletteY = 4;
        this.paletteWidth = 80;
        
        // Export/import state
        this.exportVisible = false;
        this.exportText = '';
        this.importVisible = false;
        this.importText = '';
        
        // Validation state
        this.validationErrors = [];
        
        // ID counter for unique obstacle IDs
        this.obstacleIdCounter = 0;
        
        // Initialize empty tilemap
        this.initializeTilemap();
    }
    
    /**
     * Initialize empty tilemap with air tiles
     */
    initializeTilemap() {
        this.tilemap = [];
        for (let y = 0; y < this.gridHeight; y++) {
            let row = '';
            for (let x = 0; x < this.gridWidth; x++) {
                row += '.';
            }
            this.tilemap.push(row);
        }
    }
    
    /**
     * Get tile at grid position
     */
    getTile(gridX, gridY) {
        if (gridY < 0 || gridY >= this.tilemap.length) return '.';
        if (gridX < 0 || gridX >= this.tilemap[gridY].length) return '.';
        return this.tilemap[gridY][gridX];
    }
    
    /**
     * Set tile at grid position (Requirement 10.1)
     */
    setTile(gridX, gridY, tileType) {
        if (gridY < 0 || gridY >= this.tilemap.length) return;
        if (gridX < 0 || gridX >= this.gridWidth) return;
        
        const row = this.tilemap[gridY];
        this.tilemap[gridY] = row.substring(0, gridX) + tileType + row.substring(gridX + 1);
    }
    
    /**
     * Place obstacle at world position (Requirement 10.2)
     */
    placeObstacle(worldX, worldY, obstacleType) {
        // Create obstacle config based on type
        const obstacle = {
            type: obstacleType,
            id: `${obstacleType.toLowerCase()}_${Date.now()}_${this.obstacleIdCounter++}`,
            x: worldX,
            y: worldY,
        };
        
        // Add type-specific default properties
        switch (obstacleType) {
            case AUTO.PISTON:
                obstacle.ax = worldX;
                obstacle.ay = worldY;
                obstacle.bx = worldX;
                obstacle.by = worldY + 48;
                obstacle.w = 10;
                obstacle.h = 10;
                obstacle.speed = Math.PI;
                break;
                
            case AUTO.ORBIT_SPHERE:
                obstacle.cx = worldX;
                obstacle.cy = worldY;
                obstacle.orbitRadius = 20;
                obstacle.speed = 1.0;
                obstacle.radius = 6;
                break;
                
            case AUTO.PENDULUM:
                obstacle.length = 40;
                obstacle.amplitude = 1.0;
                obstacle.frequency = 0.8;
                obstacle.radius = 6;
                break;
                
            case AUTO.GEAR_SPINNER:
                obstacle.radius = 16;
                obstacle.teeth = 8;
                obstacle.speed = 1.0;
                break;
                
            case AUTO.BOUNCING_BALL:
                obstacle.radius = 6;
                obstacle.speed = 60;
                obstacle.bounds = { x: worldX - 32, y: worldY - 32, w: 64, h: 64 };
                break;
        }
        
        this.obstacles.push(obstacle);
        return obstacle;
    }
    
    /**
     * Place gear token at world position (Requirement 10.3)
     */
    placeGearToken(worldX, worldY) {
        this.gearTokens.push({ x: worldX, y: worldY, collected: false });
    }
    
    /**
     * Place goal trigger at world position (Requirement 10.3)
     */
    placeGoalTrigger(worldX, worldY) {
        this.goalTrigger = { x: worldX, y: worldY, w: 16, h: 16 };
    }
    
    /**
     * Set player spawn position (Requirement 10.4)
     */
    setPlayerSpawn(worldX, worldY) {
        this.playerSpawn = { x: worldX, y: worldY };
    }
    
    /**
     * Remove obstacle at position
     */
    removeObstacle(worldX, worldY) {
        const threshold = 16;
        this.obstacles = this.obstacles.filter(obs => {
            const dx = obs.x - worldX;
            const dy = obs.y - worldY;
            return Math.sqrt(dx * dx + dy * dy) > threshold;
        });
    }
    
    /**
     * Remove gear token at position
     */
    removeGearToken(worldX, worldY) {
        const threshold = 8;
        this.gearTokens = this.gearTokens.filter(token => {
            const dx = token.x - worldX;
            const dy = token.y - worldY;
            return Math.sqrt(dx * dx + dy * dy) > threshold;
        });
    }
    
    /**
     * Remove goal trigger
     */
    removeGoalTrigger() {
        this.goalTrigger = null;
    }
    
    /**
     * Validate level for export (Requirement 10.9)
     * Returns array of validation errors
     */
    validateLevel() {
        const errors = [];
        
        // Check for at least one gear token
        if (this.gearTokens.length === 0) {
            errors.push('Level must have at least one gear token');
        }
        
        // Check for goal trigger
        if (!this.goalTrigger) {
            errors.push('Level must have a goal trigger (exit door)');
        }
        
        // Check for player spawn
        if (!this.playerSpawn) {
            errors.push('Level must have a player spawn position');
        }
        
        return errors;
    }
    
    /**
     * Export level as JSON string (Requirement 10.7)
     */
    exportLevel() {
        const errors = this.validateLevel();
        if (errors.length > 0) {
            this.validationErrors = errors;
            return null;
        }
        
        const levelData = {
            id: 999, // Custom level ID
            name: 'CUSTOM LEVEL',
            tilemap: this.tilemap,
            objects: [], // No interactive objects in basic editor
            autonomousObstacles: this.obstacles,
            gearTokens: this.gearTokens,
            goalTrigger: this.goalTrigger,
            playerSpawn: this.playerSpawn,
        };
        
        return JSON.stringify(levelData, null, 2);
    }
    
    /**
     * Import level from JSON string (Requirement 10.8)
     */
    importLevel(jsonString) {
        try {
            const levelData = JSON.parse(jsonString);
            
            // Validate structure
            if (!levelData.tilemap || !Array.isArray(levelData.tilemap)) {
                throw new Error('Invalid tilemap structure');
            }
            
            // Import data
            this.tilemap = levelData.tilemap;
            this.obstacles = levelData.autonomousObstacles || [];
            this.gearTokens = levelData.gearTokens || [];
            this.goalTrigger = levelData.goalTrigger || null;
            this.playerSpawn = levelData.playerSpawn || null;
            
            this.validationErrors = [];
            return true;
        } catch (error) {
            this.validationErrors = ['Import failed: ' + error.message];
            return false;
        }
    }
    
    /**
     * Clear level
     */
    clearLevel() {
        this.initializeTilemap();
        this.obstacles = [];
        this.gearTokens = [];
        this.goalTrigger = null;
        this.playerSpawn = null;
        this.validationErrors = [];
    }
    
    /**
     * Handle mouse input for tile/object placement
     */
    handleMouseInput(mouseX, mouseY, mouseDown) {
        this.mouseX = mouseX;
        this.mouseY = mouseY;
        
        // Convert screen position to world position
        const worldX = mouseX + this.cameraX;
        const worldY = mouseY + this.cameraY;
        
        // Convert to grid position
        const gridX = Math.floor(worldX / TILE);
        const gridY = Math.floor(worldY / TILE);
        
        // Handle mouse down
        if (mouseDown && !this.mouseDown) {
            this.handlePlacement(gridX, gridY, worldX, worldY);
        }
        
        // Handle drag for tile placement
        if (mouseDown && this.currentTool === TOOL_TYPES.TILE) {
            const key = `${gridX},${gridY}`;
            if (this.lastPlacedTile !== key) {
                this.handlePlacement(gridX, gridY, worldX, worldY);
                this.lastPlacedTile = key;
            }
        } else if (!mouseDown) {
            this.lastPlacedTile = null;
        }
        
        this.mouseDown = mouseDown;
    }
    
    /**
     * Handle placement based on current tool
     */
    handlePlacement(gridX, gridY, worldX, worldY) {
        switch (this.currentTool) {
            case TOOL_TYPES.TILE:
                this.setTile(gridX, gridY, this.currentTileType);
                break;
                
            case TOOL_TYPES.OBSTACLE:
                this.placeObstacle(worldX, worldY, this.currentObstacleType);
                break;
                
            case TOOL_TYPES.GEAR_TOKEN:
                this.placeGearToken(worldX, worldY);
                break;
                
            case TOOL_TYPES.GOAL_TRIGGER:
                this.placeGoalTrigger(worldX, worldY);
                break;
                
            case TOOL_TYPES.PLAYER_SPAWN:
                this.setPlayerSpawn(worldX, worldY);
                break;
                
            case TOOL_TYPES.ERASER:
                this.setTile(gridX, gridY, '.');
                this.removeObstacle(worldX, worldY);
                this.removeGearToken(worldX, worldY);
                if (this.goalTrigger && 
                    Math.abs(this.goalTrigger.x - worldX) < 16 && 
                    Math.abs(this.goalTrigger.y - worldY) < 16) {
                    this.removeGoalTrigger();
                }
                break;
        }
    }
    
    /**
     * Select tool
     */
    selectTool(toolType) {
        this.currentTool = toolType;
        this.obstacleConfigMode = false;
        this.selectedObstacle = null;
    }
    
    /**
     * Select tile type
     */
    selectTileType(tileType) {
        this.currentTileType = tileType;
        this.currentTool = TOOL_TYPES.TILE;
    }
    
    /**
     * Select obstacle type
     */
    selectObstacleType(obstacleType) {
        this.currentObstacleType = obstacleType;
        this.currentTool = TOOL_TYPES.OBSTACLE;
    }
    
    /**
     * Render level editor
     */
    render(ctx, tick) {
        // Clear screen
        drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, COLORS.BACKGROUND);
        
        // Render grid
        this.renderGrid(ctx);
        
        // Render tilemap
        this.renderTilemap(ctx);
        
        // Render obstacles
        this.renderObstacles(ctx, tick);
        
        // Render gear tokens
        this.renderGearTokens(ctx, tick);
        
        // Render goal trigger
        this.renderGoalTrigger(ctx);
        
        // Render player spawn
        this.renderPlayerSpawn(ctx);
        
        // Render UI
        if (this.paletteVisible) {
            this.renderToolPalette(ctx, tick);
        }
        
        // Render validation errors
        if (this.validationErrors.length > 0) {
            this.renderValidationErrors(ctx);
        }
        
        // Render export/import UI
        if (this.exportVisible) {
            this.renderExportUI(ctx);
        }
        if (this.importVisible) {
            this.renderImportUI(ctx);
        }
    }
    
    /**
     * Render grid lines
     */
    renderGrid(ctx) {
        ctx.strokeStyle = 'rgba(122,96,64,0.2)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= this.gridWidth; x++) {
            const screenX = x * TILE - this.cameraX;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, SCREEN_H);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.gridHeight; y++) {
            const screenY = y * TILE - this.cameraY;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(SCREEN_W, screenY);
            ctx.stroke();
        }
    }
    
    /**
     * Render tilemap
     */
    renderTilemap(ctx) {
        for (let y = 0; y < this.tilemap.length; y++) {
            const row = this.tilemap[y];
            for (let x = 0; x < row.length; x++) {
                const tile = row[x];
                if (tile === '.') continue;
                
                const screenX = x * TILE - this.cameraX;
                const screenY = y * TILE - this.cameraY;
                
                let color;
                switch (tile) {
                    case 'W': color = COLORS.TILE_MID; break;
                    case 'F': color = COLORS.TILE_LIGHT; break;
                    case 'D': color = COLORS.METAL_MID; break;
                    default: color = COLORS.TILE_DARK;
                }
                
                drawPixelRect(ctx, screenX, screenY, TILE, TILE, color);
            }
        }
    }
    
    /**
     * Render obstacles
     */
    renderObstacles(ctx, tick) {
        for (const obs of this.obstacles) {
            const screenX = obs.x - this.cameraX;
            const screenY = obs.y - this.cameraY;
            
            // Simple visualization for each obstacle type
            ctx.fillStyle = COLORS.GAUGE_LOW;
            
            switch (obs.type) {
                case AUTO.PISTON:
                    drawPixelRect(ctx, screenX - 5, screenY - 5, obs.w || 10, obs.h || 10, COLORS.METAL_DARK);
                    break;
                    
                case AUTO.ORBIT_SPHERE:
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, obs.radius || 6, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case AUTO.PENDULUM:
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, obs.radius || 6, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case AUTO.GEAR_SPINNER:
                    const teeth = obs.teeth || 8;
                    const radius = obs.radius || 16;
                    for (let i = 0; i < teeth; i++) {
                        const angle = (i / teeth) * Math.PI * 2;
                        const tx = screenX + Math.cos(angle) * radius;
                        const ty = screenY + Math.sin(angle) * radius;
                        drawPixelRect(ctx, tx - 2, ty - 2, 4, 4, COLORS.METAL_LIGHT);
                    }
                    break;
                    
                case AUTO.BOUNCING_BALL:
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, obs.radius || 6, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
            
            // Draw label
            const label = obs.type.substring(0, 4);
            drawPixelText(ctx, label, screenX - 8, screenY - 12, COLORS.UI_MUTED, 1);
        }
    }
    
    /**
     * Render gear tokens
     */
    renderGearTokens(ctx, tick) {
        for (const token of this.gearTokens) {
            const screenX = token.x - this.cameraX;
            const screenY = token.y - this.cameraY;
            
            // Draw gear icon
            const teeth = 6;
            const radius = 4;
            ctx.fillStyle = COLORS.METAL_LIGHT;
            for (let i = 0; i < teeth; i++) {
                const angle = (i / teeth) * Math.PI * 2 + tick * 0.02;
                const tx = screenX + Math.cos(angle) * radius;
                const ty = screenY + Math.sin(angle) * radius;
                ctx.fillRect(tx - 1, ty - 1, 2, 2);
            }
            
            ctx.fillStyle = COLORS.GLOW_WARM;
            ctx.fillRect(screenX - 2, screenY - 2, 4, 4);
        }
    }
    
    /**
     * Render goal trigger
     */
    renderGoalTrigger(ctx) {
        if (!this.goalTrigger) return;
        
        const screenX = this.goalTrigger.x - this.cameraX;
        const screenY = this.goalTrigger.y - this.cameraY;
        
        drawPixelRect(ctx, screenX, screenY, this.goalTrigger.w, this.goalTrigger.h, COLORS.GLOW_WARM);
        drawPixelBorder(ctx, screenX, screenY, this.goalTrigger.w, this.goalTrigger.h,
            COLORS.METAL_LIGHT, COLORS.METAL_DARK, 'transparent', 1);
        
        drawPixelText(ctx, 'EXIT', screenX + 2, screenY + 4, COLORS.UI_BG, 1);
    }
    
    /**
     * Render player spawn
     */
    renderPlayerSpawn(ctx) {
        if (!this.playerSpawn) return;
        
        const screenX = this.playerSpawn.x - this.cameraX;
        const screenY = this.playerSpawn.y - this.cameraY;
        
        // Draw spawn marker
        ctx.fillStyle = COLORS.SPARK_1;
        ctx.fillRect(screenX - 4, screenY - 6, 8, 12);
        
        drawPixelText(ctx, 'P', screenX - 2, screenY - 4, COLORS.UI_BG, 1);
    }
    
    /**
     * Render tool palette
     */
    renderToolPalette(ctx, tick) {
        const px = this.paletteX;
        const py = this.paletteY;
        const pw = this.paletteWidth;
        const ph = 160;
        
        // Panel background
        drawPixelBorder(ctx, px, py, pw, ph, COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 1);
        
        // Title
        drawPixelText(ctx, 'TOOLS', px + 4, py + 4, COLORS.UI_TEXT, 1);
        
        let yOffset = py + 16;
        
        // Tile tools
        drawPixelText(ctx, 'TILES:', px + 4, yOffset, COLORS.UI_MUTED, 1);
        yOffset += 10;
        
        for (const tileType of TILE_TYPES) {
            const isSelected = this.currentTool === TOOL_TYPES.TILE && this.currentTileType === tileType;
            const color = isSelected ? COLORS.GLOW_WARM : COLORS.UI_TEXT;
            
            let label;
            switch (tileType) {
                case 'W': label = '[W] Wall'; break;
                case 'F': label = '[F] Floor'; break;
                case 'D': label = '[D] Door'; break;
                case '.': label = '[.] Air'; break;
            }
            
            drawPixelText(ctx, label, px + 8, yOffset, color, 1);
            yOffset += 10;
        }
        
        yOffset += 4;
        
        // Other tools
        const tools = [
            { key: '1', label: 'Obstacle', type: TOOL_TYPES.OBSTACLE },
            { key: '2', label: 'Gear', type: TOOL_TYPES.GEAR_TOKEN },
            { key: '3', label: 'Exit', type: TOOL_TYPES.GOAL_TRIGGER },
            { key: '4', label: 'Spawn', type: TOOL_TYPES.PLAYER_SPAWN },
            { key: 'X', label: 'Eraser', type: TOOL_TYPES.ERASER },
        ];
        
        for (const tool of tools) {
            const isSelected = this.currentTool === tool.type;
            const color = isSelected ? COLORS.GLOW_WARM : COLORS.UI_TEXT;
            drawPixelText(ctx, `[${tool.key}] ${tool.label}`, px + 8, yOffset, color, 1);
            yOffset += 10;
        }
        
        yOffset += 4;
        
        // Actions
        drawPixelText(ctx, '[E] Export', px + 8, yOffset, COLORS.UI_MUTED, 1);
        yOffset += 10;
        drawPixelText(ctx, '[I] Import', px + 8, yOffset, COLORS.UI_MUTED, 1);
        yOffset += 10;
        drawPixelText(ctx, '[P] Playtest', px + 8, yOffset, COLORS.GLOW_WARM, 1);
        yOffset += 10;
        drawPixelText(ctx, '[C] Clear', px + 8, yOffset, COLORS.GAUGE_LOW, 1);
    }
    
    /**
     * Render validation errors
     */
    renderValidationErrors(ctx) {
        const panelW = 240;
        const panelH = 60 + this.validationErrors.length * 10;
        const panelX = (SCREEN_W - panelW) / 2;
        const panelY = (SCREEN_H - panelH) / 2;
        
        drawPixelBorder(ctx, panelX, panelY, panelW, panelH,
            COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 2);
        
        drawPixelText(ctx, 'VALIDATION ERRORS', panelX + 8, panelY + 8, COLORS.GAUGE_LOW, 1);
        
        let yOffset = panelY + 24;
        for (const error of this.validationErrors) {
            drawPixelText(ctx, '- ' + error, panelX + 8, yOffset, COLORS.UI_TEXT, 1);
            yOffset += 10;
        }
        
        drawPixelText(ctx, 'Press ESC to close', panelX + 8, panelY + panelH - 16, COLORS.UI_MUTED, 1);
    }
    
    /**
     * Render export UI
     */
    renderExportUI(ctx) {
        const panelW = 280;
        const panelH = 140;
        const panelX = (SCREEN_W - panelW) / 2;
        const panelY = (SCREEN_H - panelH) / 2;
        
        drawPixelBorder(ctx, panelX, panelY, panelW, panelH,
            COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 2);
        
        drawPixelText(ctx, 'EXPORT LEVEL', panelX + 8, panelY + 8, COLORS.GLOW_WARM, 1);
        
        if (this.exportText) {
            drawPixelText(ctx, 'Level JSON (copy this):', panelX + 8, panelY + 24, COLORS.UI_TEXT, 1);
            
            // Show truncated JSON
            const lines = this.exportText.split('\n').slice(0, 8);
            let yOffset = panelY + 36;
            for (const line of lines) {
                const truncated = line.length > 40 ? line.substring(0, 40) + '...' : line;
                drawPixelText(ctx, truncated, panelX + 8, yOffset, COLORS.UI_MUTED, 1);
                yOffset += 10;
            }
            
            drawPixelText(ctx, '(Full JSON logged to console)', panelX + 8, panelY + panelH - 24, COLORS.UI_MUTED, 1);
        }
        
        drawPixelText(ctx, 'Press ESC to close', panelX + 8, panelY + panelH - 12, COLORS.UI_MUTED, 1);
    }
    
    /**
     * Render import UI
     */
    renderImportUI(ctx) {
        const panelW = 280;
        const panelH = 100;
        const panelX = (SCREEN_W - panelW) / 2;
        const panelY = (SCREEN_H - panelH) / 2;
        
        drawPixelBorder(ctx, panelX, panelY, panelW, panelH,
            COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 2);
        
        drawPixelText(ctx, 'IMPORT LEVEL', panelX + 8, panelY + 8, COLORS.GLOW_WARM, 1);
        
        drawPixelText(ctx, 'Paste JSON in browser console:', panelX + 8, panelY + 24, COLORS.UI_TEXT, 1);
        drawPixelText(ctx, 'window.editorImport(json)', panelX + 8, panelY + 36, COLORS.UI_MUTED, 1);
        
        drawPixelText(ctx, 'Or use browser dev tools', panelX + 8, panelY + 52, COLORS.UI_MUTED, 1);
        drawPixelText(ctx, 'to set importText directly', panelX + 8, panelY + 62, COLORS.UI_MUTED, 1);
        
        drawPixelText(ctx, 'Press ESC to close', panelX + 8, panelY + panelH - 12, COLORS.UI_MUTED, 1);
    }
}
