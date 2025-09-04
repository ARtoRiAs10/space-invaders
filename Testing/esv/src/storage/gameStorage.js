// Game Storage Manager
// Handles local storage operations for game data persistence

import { GameConfig } from '../config.js';

export class GameStorage {
    constructor() {
        this.storageKeys = GameConfig.storage;
        this.isAvailable = this.checkStorageAvailability();
    }
    
    checkStorageAvailability() {
        try {
            const test = 'localStorage_test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.warn('localStorage not available:', error);
            return false;
        }
    }
    
    // Generic storage methods
    saveData(key, data) {
        if (!this.isAvailable) return false;
        
        try {
            const serializedData = JSON.stringify({
                data,
                timestamp: Date.now(),
                version: '2.0.0'
            });
            localStorage.setItem(key, serializedData);
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            return false;
        }
    }
    
    loadData(key) {
        if (!this.isAvailable) return null;
        
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            
            // Version compatibility check
            if (parsed.version && parsed.version !== '2.0.0') {
                console.warn(`Data version mismatch for ${key}: ${parsed.version}`);
                // Could implement migration logic here
            }
            
            return parsed.data;
        } catch (error) {
            console.error('Failed to load data:', error);
            return null;
        }
    }
    
    removeData(key) {
        if (!this.isAvailable) return false;
        
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove data:', error);
            return false;
        }
    }
    
    // Game-specific storage methods
    saveSettings(settings) {
        return this.saveData(this.storageKeys.settings, settings);
    }
    
    loadSettings() {
        return this.loadData(this.storageKeys.settings);
    }
    
    saveProgress(progress) {
        return this.saveData(this.storageKeys.progress, progress);
    }
    
    loadProgress() {
        return this.loadData(this.storageKeys.progress);
    }
    
    saveHighScores(scores) {
        return this.saveData(this.storageKeys.highScores, scores);
    }
    
    loadHighScores() {
        const defaultScores = {
            local: [],
            global: [],
            daily: [],
            weekly: []
        };
        
        return this.loadData(this.storageKeys.highScores) || defaultScores;
    }
    
    saveGameState(gameState) {
        return this.saveData(this.storageKeys.gameState, gameState);
    }
    
    loadGameState() {
        return this.loadData(this.storageKeys.gameState);
    }
    
    // High score management
    addHighScore(score, level, difficulty, playerName = 'Anonymous') {
        const highScores = this.loadHighScores();
        
        const newScore = {
            score,
            level,
            difficulty,
            playerName,
            date: new Date().toISOString(),
            id: Date.now().toString()
        };
        
        // Add to local scores
        highScores.local.push(newScore);
        
        // Sort by score (descending)
        highScores.local.sort((a, b) => b.score - a.score);
        
        // Keep only top 10
        highScores.local = highScores.local.slice(0, 10);
        
        this.saveHighScores(highScores);
        
        // Return position (1-based index)
        const position = highScores.local.findIndex(s => s.id === newScore.id) + 1;
        return position <= 10 ? position : null;
    }
    
    getTopScores(count = 10, type = 'local') {
        const highScores = this.loadHighScores();
        return highScores[type]?.slice(0, count) || [];
    }
    
    // Progress tracking
    updateLevelProgress(level, completed = false, score = 0, stars = 0) {
        const progress = this.loadProgress() || {};
        
        if (!progress.levels) {
            progress.levels = {};
        }
        
        const levelKey = `level_${level}`;
        const existingData = progress.levels[levelKey] || {};
        
        progress.levels[levelKey] = {
            ...existingData,
            level,
            unlocked: true,
            completed: completed || existingData.completed || false,
            bestScore: Math.max(score, existingData.bestScore || 0),
            stars: Math.max(stars, existingData.stars || 0),
            attempts: (existingData.attempts || 0) + 1,
            lastPlayed: new Date().toISOString()
        };
        
        // Update overall progress
        progress.overallProgress = {
            currentLevel: Math.max(level, progress.overallProgress?.currentLevel || 1),
            totalScore: (progress.overallProgress?.totalScore || 0) + score,
            totalPlayTime: progress.overallProgress?.totalPlayTime || 0,
            gamesPlayed: (progress.overallProgress?.gamesPlayed || 0) + 1,
            lastUpdated: new Date().toISOString()
        };
        
        this.saveProgress(progress);
        return progress;
    }
    
    getLevelProgress(level = null) {
        const progress = this.loadProgress() || {};
        
        if (level !== null) {
            return progress.levels?.[`level_${level}`] || null;
        }
        
        return progress;
    }
    
    unlockLevel(level) {
        const progress = this.loadProgress() || {};
        
        if (!progress.levels) {
            progress.levels = {};
        }
        
        const levelKey = `level_${level}`;
        
        if (!progress.levels[levelKey]) {
            progress.levels[levelKey] = {
                level,
                unlocked: true,
                completed: false,
                bestScore: 0,
                stars: 0,
                attempts: 0,
                lastPlayed: null
            };
        } else {
            progress.levels[levelKey].unlocked = true;
        }
        
        this.saveProgress(progress);
        return true;
    }
    
    getUnlockedLevels() {
        const progress = this.loadProgress() || {};
        const unlockedLevels = [1]; // Level 1 always unlocked
        
        if (progress.levels) {
            Object.values(progress.levels).forEach(levelData => {
                if (levelData.unlocked && !unlockedLevels.includes(levelData.level)) {
                    unlockedLevels.push(levelData.level);
                }
            });
        }
        
        return unlockedLevels.sort((a, b) => a - b);
    }
    
    // Statistics tracking
    updateStatistics(stats) {
        const current = this.loadStatistics();
        const updated = {
            ...current,
            ...stats,
            lastUpdated: new Date().toISOString()
        };
        
        // Calculate derived statistics
        if (updated.totalShots && updated.totalHits) {
            updated.accuracy = updated.totalHits / updated.totalShots;
        }
        
        if (updated.gamesPlayed && updated.totalScore) {
            updated.averageScore = updated.totalScore / updated.gamesPlayed;
        }
        
        this.saveData('statistics', updated);
        return updated;
    }
    
    loadStatistics() {
        return this.loadData('statistics') || {
            gamesPlayed: 0,
            totalScore: 0,
            totalPlayTime: 0,
            enemiesDestroyed: 0,
            bossesDefeated: 0,
            powerUpsCollected: 0,
            totalShots: 0,
            totalHits: 0,
            accuracy: 0,
            averageScore: 0,
            levelsCompleted: 0,
            achievementsUnlocked: 0,
            firstPlayed: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    }
    
    // Achievement system
    saveAchievements(achievements) {
        return this.saveData('achievements', achievements);
    }
    
    loadAchievements() {
        return this.loadData('achievements') || {
            unlocked: [],
            progress: {},
            lastUnlocked: null
        };
    }
    
    unlockAchievement(achievementId, progress = null) {
        const achievements = this.loadAchievements();
        
        if (!achievements.unlocked.includes(achievementId)) {
            achievements.unlocked.push(achievementId);
            achievements.lastUnlocked = {
                id: achievementId,
                date: new Date().toISOString()
            };
        }
        
        if (progress) {
            achievements.progress[achievementId] = progress;
        }
        
        this.saveAchievements(achievements);
        return true;
    }
    
    updateAchievementProgress(achievementId, progress) {
        const achievements = this.loadAchievements();
        achievements.progress[achievementId] = progress;
        this.saveAchievements(achievements);
    }
    
    hasAchievement(achievementId) {
        const achievements = this.loadAchievements();
        return achievements.unlocked.includes(achievementId);
    }
    
    // User preferences
    saveUserPreferences(preferences) {
        return this.saveData('userPreferences', preferences);
    }
    
    loadUserPreferences() {
        return this.loadData('userPreferences') || {
            theme: 'dark',
            language: 'en',
            notifications: true,
            autoSave: true,
            showTutorials: true,
            graphicsQuality: 'high',
            particleEffects: true,
            screenShake: true,
            showFPS: false,
            showDebugInfo: false
        };
    }
    
    // Backup and restore
    exportGameData() {
        if (!this.isAvailable) return null;
        
        const data = {
            settings: this.loadSettings(),
            progress: this.loadProgress(),
            highScores: this.loadHighScores(),
            statistics: this.loadStatistics(),
            achievements: this.loadAchievements(),
            preferences: this.loadUserPreferences(),
            exportDate: new Date().toISOString(),
            version: '2.0.0'
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    importGameData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validate data structure
            if (!data.version || !data.exportDate) {
                throw new Error('Invalid backup data format');
            }
            
            // Import each data type
            if (data.settings) this.saveSettings(data.settings);
            if (data.progress) this.saveProgress(data.progress);
            if (data.highScores) this.saveHighScores(data.highScores);
            if (data.statistics) this.saveData('statistics', data.statistics);
            if (data.achievements) this.saveAchievements(data.achievements);
            if (data.preferences) this.saveUserPreferences(data.preferences);
            
            return true;
        } catch (error) {
            console.error('Failed to import game data:', error);
            return false;
        }
    }
    
    // Storage cleanup
    clearGameData() {
        if (!this.isAvailable) return false;
        
        try {
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Clear additional data keys
            ['statistics', 'achievements', 'userPreferences'].forEach(key => {
                localStorage.removeItem(key);
            });
            
            return true;
        } catch (error) {
            console.error('Failed to clear game data:', error);
            return false;
        }
    }
    
    // Storage information
    getStorageInfo() {
        if (!this.isAvailable) {
            return {
                available: false,
                used: 0,
                remaining: 0,
                total: 0
            };
        }
        
        try {
            let used = 0;
            
            // Calculate used space
            Object.values(this.storageKeys).forEach(key => {
                const item = localStorage.getItem(key);
                if (item) {
                    used += item.length;
                }
            });
            
            // Estimate total available (usually ~5-10MB)
            const total = 5 * 1024 * 1024; // 5MB estimate
            
            return {
                available: true,
                used,
                remaining: total - used,
                total,
                usedMB: (used / (1024 * 1024)).toFixed(2),
                totalMB: (total / (1024 * 1024)).toFixed(2)
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return {
                available: false,
                used: 0,
                remaining: 0,
                total: 0
            };
        }
    }
    
    // Utility methods
    isStorageAvailable() {
        return this.isAvailable;
    }
    
    // Migration utilities
    migrateFromOldVersion() {
        // Check for old version data and migrate if necessary
        const oldData = localStorage.getItem('spaceInvaders_score');
        if (oldData) {
            console.log('Migrating data from old version...');
            
            try {
                const oldScore = parseInt(oldData);
                if (!isNaN(oldScore)) {
                    this.addHighScore(oldScore, 1, 'normal', 'Legacy Player');
                }
                
                // Remove old data
                localStorage.removeItem('spaceInvaders_score');
                console.log('Migration completed');
            } catch (error) {
                console.error('Migration failed:', error);
            }
        }
    }
}