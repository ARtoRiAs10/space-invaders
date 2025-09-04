// Level Selection Component
// Handles level selection screen and progression

import { GameConfig } from '../config.js';
import { Level } from '../classes/Level.js';

export class LevelSelector {
    constructor(storage, auth) {
        this.storage = storage;
        this.auth = auth;
        
        // State
        this.levels = [];
        this.selectedLevel = 1;
        this.unlockedLevels = [1]; // Level 1 always unlocked
        this.isInitialized = false;
        
        // UI elements
        this.levelCards = [];
        
        // Animation
        this.scrollOffset = 0;
        this.targetScrollOffset = 0;
        
        // Layout
        this.cardWidth = 180;
        this.cardHeight = 240;
        this.cardSpacing = 20;
        this.columns = 3;
    }
    
    async initialize() {
        try {
            console.log('🎯 Initializing Level Selector...');
            
            // Load level data
            await this.loadLevels();
            
            // Load user progress
            this.loadProgress();
            
            // Initialize UI
            this.initializeUI();
            
            this.isInitialized = true;
            console.log('✅ Level Selector initialized');
            
        } catch (error) {
            console.error('Failed to initialize Level Selector:', error);
            throw error;
        }
    }
    
    async loadLevels() {
        this.levels = [];
        
        for (let i = 1; i <= GameConfig.maxLevels; i++) {
            try {
                const level = new Level(i);
                await level.load();
                this.levels.push(level);
            } catch (error) {
                console.warn(`Failed to load level ${i}:`, error);
                // Create default level
                this.levels.push(this.createDefaultLevel(i));
            }
        }
    }
    
    createDefaultLevel(levelNumber) {
        return {
            level: levelNumber,
            data: {
                name: `Level ${levelNumber}`,
                description: 'Defend against the alien invasion',
                objectives: [],
                background: 'space1'
            },
            isLoaded: true,
            completed: false,
            stars: 0,
            bestScore: 0,
            unlocked: levelNumber === 1
        };
    }
    
    loadProgress() {
        const progress = this.storage.getLevelProgress();
        this.unlockedLevels = this.storage.getUnlockedLevels();
        
        // Update level progress
        this.levels.forEach(level => {
            const levelProgress = this.storage.getLevelProgress(level.level);
            if (levelProgress) {
                level.completed = levelProgress.completed;
                level.stars = levelProgress.stars || 0;
                level.bestScore = levelProgress.bestScore || 0;
                level.unlocked = this.unlockedLevels.includes(level.level);
            } else {
                level.unlocked = level.level === 1;
            }
        });
    }
    
    initializeUI() {
        // Calculate layout
        this.calculateLayout();
        
        // Create level cards
        this.createLevelCards();
    }
    
    calculateLayout() {
        const totalWidth = this.columns * (this.cardWidth + this.cardSpacing) - this.cardSpacing;
        this.startX = (1024 - totalWidth) / 2; // Assuming canvas width
        this.startY = 120;
    }
    
    createLevelCards() {
        this.levelCards = [];
        
        this.levels.forEach((level, index) => {
            const row = Math.floor(index / this.columns);
            const col = index % this.columns;
            
            const x = this.startX + col * (this.cardWidth + this.cardSpacing);
            const y = this.startY + row * (this.cardHeight + this.cardSpacing);
            
            const card = {
                level: level.level,
                x,
                y,
                width: this.cardWidth,
                height: this.cardHeight,
                levelData: level,
                unlocked: level.unlocked,
                completed: level.completed,
                stars: level.stars,
                bestScore: level.bestScore,
                hovered: false,
                selected: level.level === this.selectedLevel
            };
            
            this.levelCards.push(card);
        });
    }
    
    update(deltaTime) {
        // Smooth scrolling
        if (Math.abs(this.targetScrollOffset - this.scrollOffset) > 1) {
            this.scrollOffset += (this.targetScrollOffset - this.scrollOffset) * 0.1;
        } else {
            this.scrollOffset = this.targetScrollOffset;
        }
        
        // Update card positions based on scroll
        this.updateCardPositions();
    }
    
    updateCardPositions() {
        this.levelCards.forEach(card => {
            card.currentY = card.y - this.scrollOffset;
        });
    }
    
    render(ctx) {
        // Clear background
        this.renderBackground(ctx);
        
        // Render header
        this.renderHeader(ctx);
        
        // Render level cards
        this.renderLevelCards(ctx);
        
        // Render back button
        this.renderBackButton(ctx);
        
        // Render scroll indicators if needed
        this.renderScrollIndicators(ctx);
    }
    
    renderBackground(ctx) {
        // Dark space background
        const gradient = ctx.createLinearGradient(0, 0, 0, 576);
        gradient.addColorStop(0, '#000033');
        gradient.addColorStop(1, '#000011');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 576);
        
        // Stars
        this.renderStars(ctx);
    }
    
    renderStars(ctx) {
        ctx.fillStyle = 'white';
        for (let i = 0; i < 100; i++) {
            const x = (i * 97) % 1024; // Pseudo-random but consistent
            const y = (i * 73) % 576;
            const size = (i % 3) + 1;
            ctx.fillRect(x, y, size, size);
        }
    }
    
    renderHeader(ctx) {
        // Title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 48px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT LEVEL', 512, 60);
        
        // Progress info
        const completedLevels = this.levels.filter(l => l.completed).length;
        const totalStars = this.levels.reduce((sum, l) => sum + l.stars, 0);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.fillText(`${completedLevels}/${this.levels.length} Completed`, 400, 90);
        ctx.fillText(`⭐ ${totalStars} Stars`, 600, 90);
    }
    
    renderLevelCards(ctx) {
        this.levelCards.forEach(card => {
            if (card.currentY + card.height > 0 && card.currentY < 576) {
                this.renderLevelCard(ctx, card);
            }
        });
    }
    
    renderLevelCard(ctx, card) {
        const x = card.x;
        const y = card.currentY;
        const w = card.width;
        const h = card.height;
        
        // Card background
        if (card.unlocked) {
            ctx.fillStyle = card.hovered ? '#004466' : '#002233';
        } else {
            ctx.fillStyle = '#111111';
        }
        ctx.fillRect(x, y, w, h);
        
        // Card border
        if (card.selected) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
        } else if (card.hovered && card.unlocked) {
            ctx.strokeStyle = '#00aaaa';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = card.unlocked ? '#666666' : '#333333';
            ctx.lineWidth = 1;
        }
        ctx.strokeRect(x, y, w, h);
        
        if (card.unlocked) {
            this.renderUnlockedCard(ctx, card, x, y, w, h);
        } else {
            this.renderLockedCard(ctx, card, x, y, w, h);
        }
    }
    
    renderUnlockedCard(ctx, card, x, y, w, h) {
        // Level number
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 36px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(card.level.toString(), x + w/2, y + 50);
        
        // Level name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(card.levelData.data.name, x + w/2, y + 80);
        
        // Description (truncated)
        ctx.fillStyle = '#cccccc';
        ctx.font = '11px Arial';
        const description = this.truncateText(ctx, card.levelData.data.description, w - 20);
        const lines = this.wrapText(ctx, description, w - 20);
        
        lines.forEach((line, index) => {
            if (index < 3) { // Max 3 lines
                ctx.fillText(line, x + w/2, y + 105 + index * 15);
            }
        });
        
        // Stars
        this.renderStars(ctx, x + w/2, y + 170, card.stars);
        
        // Best score
        if (card.bestScore > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px Arial';
            ctx.fillText(`Best: ${card.bestScore.toLocaleString()}`, x + w/2, y + 200);
        }
        
        // Completion indicator
        if (card.completed) {
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('✓', x + w - 25, y + 25);
        }
    }
    
    renderLockedCard(ctx, card, x, y, w, h) {
        // Lock icon
        ctx.fillStyle = '#666666';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🔒', x + w/2, y + h/2);
        
        // Level number (faded)
        ctx.fillStyle = '#444444';
        ctx.font = 'bold 24px Orbitron, monospace';
        ctx.fillText(card.level.toString(), x + w/2, y + h/2 + 40);
        
        // Unlock requirement
        ctx.fillStyle = '#888888';
        ctx.font = '10px Arial';
        ctx.fillText(`Complete Level ${card.level - 1}`, x + w/2, y + h - 20);
    }
    
    renderStars(ctx, centerX, centerY, starCount) {
        const starSize = 16;
        const spacing = 20;
        const startX = centerX - (spacing * 2) / 2;
        
        for (let i = 0; i < 3; i++) {
            const x = startX + i * spacing;
            const filled = i < starCount;
            
            ctx.fillStyle = filled ? '#ffff00' : '#444444';
            ctx.font = `${starSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('⭐', x, centerY);
        }
    }
    
    renderBackButton(ctx) {
        const button = {
            x: 60,
            y: 30,
            width: 100,
            height: 40,
            text: 'BACK'
        };
        
        // Button background
        ctx.fillStyle = '#003333';
        ctx.fillRect(button.x - button.width/2, button.y - button.height/2, button.width, button.height);
        
        // Button border
        ctx.strokeStyle = '#006666';
        ctx.lineWidth = 2;
        ctx.strokeRect(button.x - button.width/2, button.y - button.height/2, button.width, button.height);
        
        // Button text
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(button.text, button.x, button.y);
    }
    
    renderScrollIndicators(ctx) {
        // Only show if scrollable
        const totalHeight = Math.ceil(this.levels.length / this.columns) * (this.cardHeight + this.cardSpacing);
        if (totalHeight > 400) {
            // Scroll bar
            const scrollBarHeight = 200;
            const scrollBarY = 150;
            const scrollBarX = 1000;
            
            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(scrollBarX, scrollBarY, 10, scrollBarHeight);
            
            // Thumb
            const thumbHeight = Math.max(20, scrollBarHeight * (400 / totalHeight));
            const thumbY = scrollBarY + (this.scrollOffset / totalHeight) * (scrollBarHeight - thumbHeight);
            
            ctx.fillStyle = '#666666';
            ctx.fillRect(scrollBarX, thumbY, 10, thumbHeight);
        }
    }
    
    // Input handling
    handleClick(x, y) {
        // Check back button
        if (this.isPointInRect(x, y, 10, 10, 100, 40)) {
            this.onBack();
            return true;
        }
        
        // Check level cards
        for (const card of this.levelCards) {
            if (this.isPointInRect(x, y, card.x, card.currentY, card.width, card.height)) {
                this.onLevelClick(card);
                return true;
            }
        }
        
        return false;
    }
    
    handleScroll(deltaY) {
        const totalHeight = Math.ceil(this.levels.length / this.columns) * (this.cardHeight + this.cardSpacing);
        const maxScroll = Math.max(0, totalHeight - 400);
        
        this.targetScrollOffset = Math.max(0, Math.min(maxScroll, this.targetScrollOffset + deltaY));
    }
    
    handleMouseMove(x, y) {
        // Update hover states
        this.levelCards.forEach(card => {
            card.hovered = this.isPointInRect(x, y, card.x, card.currentY, card.width, card.height);
        });
    }
    
    // Event handlers
    onLevelClick(card) {
        if (!card.unlocked) {
            // Show unlock requirement
            this.showUnlockRequirement(card.level);
            return;
        }
        
        this.selectedLevel = card.level;
        
        // Update selection
        this.levelCards.forEach(c => {
            c.selected = c.level === this.selectedLevel;
        });
        
        // Start level after short delay
        setTimeout(() => {
            this.startLevel(card.level);
        }, 300);
    }
    
    onBack() {
        // Return to main menu
        const event = new CustomEvent('showMainMenu');
        window.dispatchEvent(event);
    }
    
    startLevel(levelNumber) {
        const event = new CustomEvent('startLevel', { 
            detail: { level: levelNumber } 
        });
        window.dispatchEvent(event);
    }
    
    showUnlockRequirement(levelNumber) {
        const requiredLevel = levelNumber - 1;
        console.log(`Level ${levelNumber} is locked. Complete Level ${requiredLevel} to unlock.`);
        
        // Could show notification
        const event = new CustomEvent('showNotification', {
            detail: {
                title: 'Level Locked',
                message: `Complete Level ${requiredLevel} to unlock this level`,
                duration: 3000
            }
        });
        window.dispatchEvent(event);
    }
    
    // Utility methods
    isPointInRect(px, py, x, y, w, h) {
        return px >= x && px <= x + w && py >= y && py <= y + h;
    }
    
    truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        
        return truncated + '...';
    }
    
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    // Public API
    refresh() {
        // Reload progress and update UI
        this.loadProgress();
        this.createLevelCards();
    }
    
    unlockLevel(levelNumber) {
        const level = this.levels.find(l => l.level === levelNumber);
        if (level) {
            level.unlocked = true;
            this.unlockedLevels.push(levelNumber);
            this.refresh();
        }
    }
    
    updateProgress(levelNumber, completed, stars, score) {
        const card = this.levelCards.find(c => c.level === levelNumber);
        if (card) {
            card.completed = completed;
            card.stars = stars;
            card.bestScore = Math.max(card.bestScore, score);
            
            // Unlock next level
            if (completed && levelNumber < this.levels.length) {
                this.unlockLevel(levelNumber + 1);
            }
        }
    }
    
    getSelectedLevel() {
        return this.selectedLevel;
    }
    
    // Cleanup
    destroy() {
        this.levels = [];
        this.levelCards = [];
    }
}