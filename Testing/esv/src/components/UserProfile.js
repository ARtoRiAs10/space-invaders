// User Profile Component
// Handles user profile display, statistics, and achievements

import { GameConfig } from '../config.js';

export class UserProfile {
    constructor(auth, storage) {
        this.auth = auth;
        this.storage = storage;
        
        // Profile data
        this.userStats = null;
        this.achievements = [];
        this.levelProgress = [];
        this.preferences = null;
        
        // UI state
        this.currentTab = 'overview'; // overview, stats, achievements, settings
        this.isInitialized = false;
        
        // Layout
        this.tabs = ['overview', 'stats', 'achievements', 'settings'];
        this.tabWidth = 200;
        this.tabHeight = 50;
        
        // Animation
        this.fadeOpacity = 1;
        this.scrollOffset = 0;
    }
    
    async initialize() {
        try {
            console.log('👤 Initializing User Profile...');
            
            // Load user data
            await this.loadUserData();
            
            // Load achievements
            this.loadAchievements();
            
            // Load preferences
            this.loadPreferences();
            
            this.isInitialized = true;
            console.log('✅ User Profile initialized');
            
        } catch (error) {
            console.error('Failed to initialize User Profile:', error);
            throw error;
        }
    }
    
    async loadUserData(user = null) {
        const currentUser = user || this.auth.getUser();
        
        if (currentUser) {
            // Load authenticated user data
            this.userStats = await this.auth.getUserStats();
            this.levelProgress = await this.auth.getLevelProgress();
        } else {
            // Load local user data
            this.userStats = this.storage.loadStatistics();
            this.levelProgress = this.storage.getAllLevelProgress();
        }
        
        // Ensure default values
        this.userStats = {
            gamesPlayed: 0,
            totalScore: 0,
            totalPlayTime: 0,
            enemiesDestroyed: 0,
            shotsFired: 0,
            shotsHit: 0,
            accuracy: 0,
            maxCombo: 0,
            levelsCompleted: 0,
            totalStars: 0,
            achievementsUnlocked: 0,
            ...this.userStats
        };
    }
    
    loadAchievements() {
        this.achievements = this.storage.loadAchievements();
        
        // Add achievement metadata
        this.achievements = this.achievements.map(achievement => ({
            ...achievement,
            ...this.getAchievementMetadata(achievement.id)
        }));
    }
    
    loadPreferences() {
        this.preferences = this.storage.loadUserPreferences();
    }
    
    getAchievementMetadata(achievementId) {
        const metadata = {
            'first_kill': {
                name: 'First Blood',
                description: 'Destroy your first enemy',
                icon: '🎯',
                rarity: 'common'
            },
            'score_1k': {
                name: 'Space Cadet',
                description: 'Score 1,000 points',
                icon: '⭐',
                rarity: 'common'
            },
            'score_10k': {
                name: 'Ace Pilot',
                description: 'Score 10,000 points',
                icon: '🏆',
                rarity: 'uncommon'
            },
            'score_50k': {
                name: 'Space Commander',
                description: 'Score 50,000 points',
                icon: '👑',
                rarity: 'rare'
            },
            'score_100k': {
                name: 'Galactic Hero',
                description: 'Score 100,000 points',
                icon: '🌟',
                rarity: 'epic'
            },
            'sharpshooter': {
                name: 'Sharpshooter',
                description: 'Achieve 90% accuracy with 100+ shots',
                icon: '🎯',
                rarity: 'rare'
            },
            'combo_master': {
                name: 'Combo Master',
                description: 'Achieve a 50+ hit combo',
                icon: '⚡',
                rarity: 'epic'
            },
            'boss_slayer': {
                name: 'Boss Slayer',
                description: 'Defeat 5 bosses',
                icon: '⚔️',
                rarity: 'rare'
            },
            'untouchable': {
                name: 'Untouchable',
                description: 'Complete a level without taking damage',
                icon: '🛡️',
                rarity: 'epic'
            },
            'collector': {
                name: 'Power Collector',
                description: 'Collect 20 power-ups',
                icon: '💎',
                rarity: 'uncommon'
            }
        };
        
        return metadata[achievementId] || {
            name: achievementId,
            description: 'Achievement unlocked',
            icon: '🏆',
            rarity: 'common'
        };
    }
    
    update(deltaTime) {
        // Update any animations or dynamic elements
        this.updateAnimations(deltaTime);
    }
    
    updateAnimations(deltaTime) {
        // Smooth transitions, fades, etc.
    }
    
    render(ctx) {
        // Clear background
        this.renderBackground(ctx);
        
        // Render header
        this.renderHeader(ctx);
        
        // Render tabs
        this.renderTabs(ctx);
        
        // Render current tab content
        this.renderCurrentTab(ctx);
        
        // Render back button
        this.renderBackButton(ctx);
    }
    
    renderBackground(ctx) {
        // Dark gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 576);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(1, '#000011');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 576);
        
        // Subtle pattern overlay
        this.renderPatternOverlay(ctx);
    }
    
    renderPatternOverlay(ctx) {
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#00ffff';
        
        // Grid pattern
        for (let x = 0; x < 1024; x += 50) {
            for (let y = 0; y < 576; y += 50) {
                ctx.fillRect(x, y, 1, 1);
            }
        }
        
        ctx.globalAlpha = 1;
    }
    
    renderHeader(ctx) {
        // User info
        const user = this.auth.getUser();
        const userName = this.auth.getUserName();
        
        // Avatar area
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(50, 30, 80, 80);
        
        // User name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Orbitron, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(userName, 150, 60);
        
        // Status/rank
        const rank = this.calculateRank();
        ctx.fillStyle = '#00aaaa';
        ctx.font = '16px Arial';
        ctx.fillText(rank, 150, 85);
        
        // Quick stats
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Arial';
        ctx.fillText(`Level ${this.getHighestCompletedLevel()} • ${this.userStats.totalStars} Stars`, 150, 105);
    }
    
    renderTabs(ctx) {
        const startX = 50;
        const startY = 140;
        
        this.tabs.forEach((tab, index) => {
            const x = startX + index * (this.tabWidth + 10);
            const y = startY;
            const isActive = tab === this.currentTab;
            
            // Tab background
            ctx.fillStyle = isActive ? '#003366' : '#002244';
            ctx.fillRect(x, y, this.tabWidth, this.tabHeight);
            
            // Tab border
            ctx.strokeStyle = isActive ? '#00ffff' : '#004466';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, this.tabWidth, this.tabHeight);
            
            // Tab text
            ctx.fillStyle = isActive ? '#00ffff' : '#ffffff';
            ctx.font = '16px Orbitron, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.capitalizeFirst(tab), x + this.tabWidth / 2, y + 32);
        });
    }
    
    renderCurrentTab(ctx) {
        const contentY = 220;
        
        switch (this.currentTab) {
            case 'overview':
                this.renderOverviewTab(ctx, contentY);
                break;
            case 'stats':
                this.renderStatsTab(ctx, contentY);
                break;
            case 'achievements':
                this.renderAchievementsTab(ctx, contentY);
                break;
            case 'settings':
                this.renderSettingsTab(ctx, contentY);
                break;
        }
    }
    
    renderOverviewTab(ctx, startY) {
        const leftCol = 80;
        const rightCol = 550;
        let currentY = startY;
        
        // Recent Activity
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 20px Orbitron, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Recent Activity', leftCol, currentY);
        currentY += 40;
        
        // Level progress
        this.renderLevelProgress(ctx, leftCol, currentY);
        
        // Recent achievements (right column)
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 20px Orbitron, monospace';
        ctx.fillText('Recent Achievements', rightCol, startY);
        
        this.renderRecentAchievements(ctx, rightCol, startY + 40);
    }
    
    renderLevelProgress(ctx, x, y) {
        const levels = this.levelProgress.slice(0, 5); // Show first 5 levels
        
        levels.forEach((level, index) => {
            const levelY = y + index * 50;
            
            // Level card background
            ctx.fillStyle = level.completed ? '#003333' : '#222222';
            ctx.fillRect(x, levelY, 400, 40);
            
            // Level info
            ctx.fillStyle = level.completed ? '#00ff00' : '#666666';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`Level ${level.level}: ${level.name || 'Unknown'}`, x + 10, levelY + 25);
            
            // Stars
            if (level.completed) {
                this.renderLevelStars(ctx, x + 300, levelY + 25, level.stars || 0);
            }
            
            // Score
            if (level.bestScore) {
                ctx.fillStyle = '#ffff00';
                ctx.font = '12px Arial';
                ctx.fillText(`${level.bestScore.toLocaleString()}`, x + 350, levelY + 15);
            }
        });
    }
    
    renderRecentAchievements(ctx, x, y) {
        const recentAchievements = this.achievements
            .sort((a, b) => b.unlockedAt - a.unlockedAt)
            .slice(0, 5);
        
        recentAchievements.forEach((achievement, index) => {
            const achievementY = y + index * 40;
            
            // Achievement icon
            ctx.font = '24px Arial';
            ctx.fillText(achievement.icon, x, achievementY);
            
            // Achievement name
            ctx.fillStyle = this.getRarityColor(achievement.rarity);
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(achievement.name, x + 35, achievementY - 5);
            
            // Achievement description
            ctx.fillStyle = '#cccccc';
            ctx.font = '12px Arial';
            ctx.fillText(achievement.description, x + 35, achievementY + 15);
        });
    }
    
    renderStatsTab(ctx, startY) {
        const leftCol = 100;
        const rightCol = 550;
        let leftY = startY;
        let rightY = startY;
        
        // Combat Stats
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 18px Orbitron, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Combat Statistics', leftCol, leftY);
        leftY += 40;
        
        const combatStats = [
            { label: 'Games Played', value: this.userStats.gamesPlayed },
            { label: 'Total Score', value: this.userStats.totalScore.toLocaleString() },
            { label: 'Enemies Destroyed', value: this.userStats.enemiesDestroyed.toLocaleString() },
            { label: 'Shots Fired', value: this.userStats.shotsFired.toLocaleString() },
            { label: 'Shots Hit', value: this.userStats.shotsHit.toLocaleString() },
            { label: 'Accuracy', value: `${(this.userStats.accuracy * 100).toFixed(1)}%` },
            { label: 'Max Combo', value: this.userStats.maxCombo }
        ];
        
        combatStats.forEach(stat => {
            this.renderStatLine(ctx, leftCol, leftY, stat.label, stat.value);
            leftY += 30;
        });
        
        // Progress Stats
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 18px Orbitron, monospace';
        ctx.fillText('Progress Statistics', rightCol, rightY);
        rightY += 40;
        
        const progressStats = [
            { label: 'Levels Completed', value: this.userStats.levelsCompleted },
            { label: 'Total Stars', value: this.userStats.totalStars },
            { label: 'Achievements', value: this.userStats.achievementsUnlocked },
            { label: 'Play Time', value: this.formatTime(this.userStats.totalPlayTime) },
            { label: 'Favorite Level', value: this.getFavoriteLevel() },
            { label: 'Best Accuracy', value: `${(this.userStats.bestAccuracy * 100 || 0).toFixed(1)}%` }
        ];
        
        progressStats.forEach(stat => {
            this.renderStatLine(ctx, rightCol, rightY, stat.label, stat.value);
            rightY += 30;
        });
    }
    
    renderAchievementsTab(ctx, startY) {
        const cols = 2;
        const achievementWidth = 400;
        const achievementHeight = 80;
        const spacing = 20;
        
        let currentY = startY - this.scrollOffset;
        
        // Header
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 20px Orbitron, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Achievements (${this.achievements.length} unlocked)`, 50, startY - 20);
        
        // Achievement grid
        this.achievements.forEach((achievement, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const x = 80 + col * (achievementWidth + spacing);
            const y = currentY + row * (achievementHeight + spacing);
            
            if (y > -achievementHeight && y < 576) {
                this.renderAchievement(ctx, achievement, x, y, achievementWidth, achievementHeight);
            }
        });
    }
    
    renderAchievement(ctx, achievement, x, y, width, height) {
        // Background
        const rarityColor = this.getRarityColor(achievement.rarity);
        ctx.fillStyle = 'rgba(0, 30, 30, 0.8)';
        ctx.fillRect(x, y, width, height);
        
        // Rarity border
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Icon
        ctx.font = '32px Arial';
        ctx.fillText(achievement.icon, x + 15, y + 45);
        
        // Name
        ctx.fillStyle = rarityColor;
        ctx.font = 'bold 16px Orbitron, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(achievement.name, x + 65, y + 25);
        
        // Description
        ctx.fillStyle = '#cccccc';
        ctx.font = '12px Arial';
        ctx.fillText(achievement.description, x + 65, y + 45);
        
        // Date unlocked
        ctx.fillStyle = '#888888';
        ctx.font = '10px Arial';
        const date = new Date(achievement.unlockedAt).toLocaleDateString();
        ctx.fillText(`Unlocked: ${date}`, x + 65, y + 65);
        
        // Rarity label
        ctx.fillStyle = rarityColor;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(achievement.rarity.toUpperCase(), x + width - 10, y + 15);
    }
    
    renderSettingsTab(ctx, startY) {
        let currentY = startY;
        
        // Settings sections
        const sections = [
            {
                title: 'Game Settings',
                settings: [
                    { name: 'Difficulty', value: GameConfig.difficulty, type: 'select' },
                    { name: 'Show FPS', value: GameConfig.debug.showFPS, type: 'toggle' },
                    { name: 'Particle Effects', value: this.preferences.particleEffects, type: 'toggle' }
                ]
            },
            {
                title: 'Audio Settings',
                settings: [
                    { name: 'Master Volume', value: this.preferences.masterVolume, type: 'slider' },
                    { name: 'Music Volume', value: this.preferences.musicVolume, type: 'slider' },
                    { name: 'SFX Volume', value: this.preferences.sfxVolume, type: 'slider' }
                ]
            }
        ];
        
        sections.forEach(section => {
            currentY = this.renderSettingsSection(ctx, section, 80, currentY);
            currentY += 30;
        });
    }
    
    renderSettingsSection(ctx, section, x, y) {
        // Section title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 18px Orbitron, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(section.title, x, y);
        
        let currentY = y + 30;
        
        section.settings.forEach(setting => {
            this.renderSetting(ctx, setting, x + 20, currentY);
            currentY += 40;
        });
        
        return currentY;
    }
    
    renderSetting(ctx, setting, x, y) {
        // Setting name
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(setting.name, x, y);
        
        // Setting control
        const controlX = x + 200;
        
        switch (setting.type) {
            case 'toggle':
                this.renderToggle(ctx, controlX, y - 10, setting.value);
                break;
            case 'slider':
                this.renderSlider(ctx, controlX, y - 10, setting.value);
                break;
            case 'select':
                this.renderSelect(ctx, controlX, y - 10, setting.value);
                break;
        }
    }
    
    renderToggle(ctx, x, y, value) {
        // Toggle background
        ctx.fillStyle = value ? '#00aa00' : '#aa0000';
        ctx.fillRect(x, y, 60, 20);
        
        // Toggle handle
        ctx.fillStyle = '#ffffff';
        const handleX = value ? x + 35 : x + 5;
        ctx.fillRect(handleX, y + 2, 20, 16);
    }
    
    renderSlider(ctx, x, y, value) {
        // Slider track
        ctx.fillStyle = '#444444';
        ctx.fillRect(x, y + 8, 150, 4);
        
        // Slider fill
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(x, y + 8, 150 * value, 4);
        
        // Slider handle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + 150 * value, y + 10, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderSelect(ctx, x, y, value) {
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, 120, 20);
        
        ctx.strokeStyle = '#666666';
        ctx.strokeRect(x, y, 120, 20);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(value.toString(), x + 5, y + 14);
    }
    
    renderBackButton(ctx) {
        const button = {
            x: 60,
            y: 30,
            width: 80,
            height: 30,
            text: 'BACK'
        };
        
        ctx.fillStyle = '#003333';
        ctx.fillRect(button.x - button.width/2, button.y - button.height/2, button.width, button.height);
        
        ctx.strokeStyle = '#006666';
        ctx.lineWidth = 2;
        ctx.strokeRect(button.x - button.width/2, button.y - button.height/2, button.width, button.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(button.text, button.x, button.y);
    }
    
    // Helper rendering methods
    renderStatLine(ctx, x, y, label, value) {
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(label + ':', x, y);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(value.toString(), x + 150, y);
    }
    
    renderLevelStars(ctx, x, y, starCount) {
        const starSize = 12;
        const spacing = 15;
        
        for (let i = 0; i < 3; i++) {
            const starX = x + i * spacing;
            const filled = i < starCount;
            
            ctx.fillStyle = filled ? '#ffff00' : '#444444';
            ctx.font = `${starSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('⭐', starX, y);
        }
    }
    
    // Input handling
    handleClick(x, y) {
        // Check tab clicks
        const tabY = 140;
        const tabStartX = 50;
        
        for (let i = 0; i < this.tabs.length; i++) {
            const tabX = tabStartX + i * (this.tabWidth + 10);
            
            if (this.isPointInRect(x, y, tabX, tabY, this.tabWidth, this.tabHeight)) {
                this.currentTab = this.tabs[i];
                return true;
            }
        }
        
        // Check back button
        if (this.isPointInRect(x, y, 20, 15, 80, 30)) {
            this.onBack();
            return true;
        }
        
        return false;
    }
    
    handleScroll(deltaY) {
        if (this.currentTab === 'achievements') {
            this.scrollOffset = Math.max(0, this.scrollOffset + deltaY);
        }
    }
    
    onBack() {
        const event = new CustomEvent('showMainMenu');
        window.dispatchEvent(event);
    }
    
    // Utility methods
    isPointInRect(px, py, x, y, w, h) {
        return px >= x && px <= x + w && py >= y && py <= y + h;
    }
    
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    calculateRank() {
        const totalScore = this.userStats.totalScore;
        
        if (totalScore >= 1000000) return 'Galactic Legend';
        if (totalScore >= 500000) return 'Space Admiral';
        if (totalScore >= 100000) return 'Star Commander';
        if (totalScore >= 50000) return 'Ace Pilot';
        if (totalScore >= 10000) return 'Veteran';
        if (totalScore >= 1000) return 'Cadet';
        return 'Recruit';
    }
    
    getHighestCompletedLevel() {
        return this.levelProgress.reduce((max, level) => {
            return level.completed ? Math.max(max, level.level) : max;
        }, 0);
    }
    
    getFavoriteLevel() {
        // Level with most plays or highest score
        const favorite = this.levelProgress.reduce((best, level) => {
            return level.bestScore > (best.bestScore || 0) ? level : best;
        }, { level: 1 });
        
        return `Level ${favorite.level}`;
    }
    
    getRarityColor(rarity) {
        const colors = {
            common: '#ffffff',
            uncommon: '#00ff00',
            rare: '#0080ff',
            epic: '#8000ff',
            legendary: '#ff8000'
        };
        return colors[rarity] || colors.common;
    }
    
    formatTime(milliseconds) {
        const hours = Math.floor(milliseconds / 3600000);
        const minutes = Math.floor((milliseconds % 3600000) / 60000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
    
    // Public API
    refresh() {
        this.loadUserData();
        this.loadAchievements();
    }
    
    updateStats(newStats) {
        this.userStats = { ...this.userStats, ...newStats };
    }
    
    clearUserData() {
        this.userStats = null;
        this.achievements = [];
        this.levelProgress = [];
    }
    
    // Cleanup
    destroy() {
        // Clean up any resources
    }
}