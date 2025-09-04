// User Progress Tracking System
// Handles detailed progress tracking, statistics, and achievements

export class UserProgress {
    constructor(storage, auth) {
        this.storage = storage;
        this.auth = auth;
        
        // Progress data
        this.currentSession = {
            startTime: Date.now(),
            score: 0,
            level: 1,
            lives: 3,
            shotsFired: 0,
            shotsHit: 0,
            enemiesDestroyed: 0,
            powerUpsCollected: 0,
            maxCombo: 0,
            damagesTaken: 0
        };
        
        // Achievement tracking
        this.achievementProgress = new Map();
        this.unlockedAchievements = [];
        
        // Statistics tracking
        this.sessionStats = {
            playTime: 0,
            accuracy: 0,
            efficiency: 0,
            survival: 0
        };
        
        // Level tracking
        this.levelProgress = new Map();
        this.completedLevels = new Set();
        
        // Event tracking
        this.eventHistory = [];
        this.maxEventHistory = 1000;
        
        this.initialize();
    }
    
    initialize() {
        console.log('📊 Initializing User Progress...');
        
        // Load existing progress
        this.loadProgress();
        
        // Initialize achievement system
        this.initializeAchievements();
        
        // Start session tracking
        this.startSession();
        
        console.log('✅ User Progress initialized');
    }
    
    loadProgress() {
        // Load level progress
        const levelData = this.storage.getAllLevelProgress();
        levelData.forEach(level => {
            this.levelProgress.set(level.level, level);
            if (level.completed) {
                this.completedLevels.add(level.level);
            }
        });
        
        // Load achievements
        this.unlockedAchievements = this.storage.loadAchievements();
        
        // Load achievement progress
        const achievementProgress = this.storage.getItem('achievementProgress');
        if (achievementProgress) {
            this.achievementProgress = new Map(Object.entries(achievementProgress));
        }
    }
    
    initializeAchievements() {
        // Initialize tracking for all achievements
        const achievements = [
            // Combat achievements
            { id: 'first_kill', type: 'enemies_destroyed', target: 1 },
            { id: 'hunter', type: 'enemies_destroyed', target: 100 },
            { id: 'destroyer', type: 'enemies_destroyed', target: 1000 },
            { id: 'annihilator', type: 'enemies_destroyed', target: 10000 },
            
            // Score achievements
            { id: 'score_1k', type: 'score', target: 1000 },
            { id: 'score_10k', type: 'score', target: 10000 },
            { id: 'score_50k', type: 'score', target: 50000 },
            { id: 'score_100k', type: 'score', target: 100000 },
            { id: 'score_500k', type: 'score', target: 500000 },
            
            // Accuracy achievements
            { id: 'sharpshooter', type: 'accuracy', target: 0.9, minShots: 100 },
            { id: 'marksman', type: 'accuracy', target: 0.8, minShots: 500 },
            { id: 'sniper', type: 'accuracy', target: 0.95, minShots: 200 },
            
            // Combo achievements
            { id: 'combo_10', type: 'combo', target: 10 },
            { id: 'combo_25', type: 'combo', target: 25 },
            { id: 'combo_50', type: 'combo', target: 50 },
            { id: 'combo_100', type: 'combo', target: 100 },
            
            // Survival achievements
            { id: 'untouchable', type: 'no_damage_level', target: 1 },
            { id: 'iron_will', type: 'no_damage_level', target: 3 },
            { id: 'immortal', type: 'no_damage_complete', target: 1 },
            
            // Boss achievements
            { id: 'boss_slayer', type: 'bosses_defeated', target: 1 },
            { id: 'boss_hunter', type: 'bosses_defeated', target: 5 },
            { id: 'boss_master', type: 'bosses_defeated', target: 10 },
            
            // Level completion achievements
            { id: 'graduate', type: 'levels_completed', target: 1 },
            { id: 'veteran', type: 'levels_completed', target: 3 },
            { id: 'master', type: 'levels_completed', target: 5 },
            
            // Star achievements
            { id: 'star_collector', type: 'total_stars', target: 5 },
            { id: 'star_master', type: 'total_stars', target: 10 },
            { id: 'perfect_score', type: 'total_stars', target: 15 },
            
            // Power-up achievements
            { id: 'collector', type: 'powerups_collected', target: 20 },
            { id: 'hoarder', type: 'powerups_collected', target: 100 },
            
            // Special achievements
            { id: 'speedrun', type: 'level_time', target: 120000, level: 1 }, // 2 minutes
            { id: 'efficiency', type: 'shots_per_enemy', target: 2.0 },
            { id: 'dedication', type: 'play_sessions', target: 10 }
        ];
        
        achievements.forEach(achievement => {
            if (!this.achievementProgress.has(achievement.id)) {
                this.achievementProgress.set(achievement.id, {
                    ...achievement,
                    progress: 0,
                    unlocked: this.unlockedAchievements.some(a => a.id === achievement.id)
                });
            }
        });
    }
    
    startSession() {
        this.currentSession = {
            startTime: Date.now(),
            score: 0,
            level: 1,
            lives: 3,
            shotsFired: 0,
            shotsHit: 0,
            enemiesDestroyed: 0,
            powerUpsCollected: 0,
            maxCombo: 0,
            damagesTaken: 0,
            bossesDefeated: 0,
            levelTime: 0
        };
        
        this.sessionStats = {
            playTime: 0,
            accuracy: 0,
            efficiency: 0,
            survival: 0
        };
        
        this.recordEvent('session_start', { timestamp: Date.now() });
    }
    
    endSession() {
        const sessionDuration = Date.now() - this.currentSession.startTime;
        
        // Calculate final session stats
        this.sessionStats.playTime = sessionDuration;
        this.sessionStats.accuracy = this.currentSession.shotsFired > 0 ? 
            this.currentSession.shotsHit / this.currentSession.shotsFired : 0;
        this.sessionStats.efficiency = this.currentSession.enemiesDestroyed > 0 ? 
            this.currentSession.shotsFired / this.currentSession.enemiesDestroyed : 0;
        this.sessionStats.survival = this.currentSession.damagesTaken === 0 ? 1 : 0;
        
        // Update global statistics
        this.updateGlobalStatistics();
        
        // Check achievements
        this.checkAllAchievements();
        
        this.recordEvent('session_end', { 
            duration: sessionDuration,
            stats: this.sessionStats,
            session: this.currentSession
        });
        
        // Save progress
        this.saveProgress();
    }
    
    // Progress tracking methods
    recordScore(score) {
        const oldScore = this.currentSession.score;
        this.currentSession.score = score;
        
        this.updateAchievementProgress('score', score);
        
        this.recordEvent('score_update', { 
            oldScore, 
            newScore: score,
            delta: score - oldScore
        });
    }
    
    recordShot(hit = false) {
        this.currentSession.shotsFired++;
        
        if (hit) {
            this.currentSession.shotsHit++;
        }
        
        // Update accuracy achievement progress
        if (this.currentSession.shotsFired >= 100) {
            const accuracy = this.currentSession.shotsHit / this.currentSession.shotsFired;
            this.updateAchievementProgress('accuracy', accuracy);
        }
        
        this.recordEvent('shot_fired', { hit });
    }
    
    recordEnemyDestroyed() {
        this.currentSession.enemiesDestroyed++;
        
        this.updateAchievementProgress('enemies_destroyed', this.currentSession.enemiesDestroyed);
        
        // Check efficiency
        if (this.currentSession.enemiesDestroyed > 0) {
            const efficiency = this.currentSession.shotsFired / this.currentSession.enemiesDestroyed;
            this.updateAchievementProgress('shots_per_enemy', efficiency);
        }
        
        this.recordEvent('enemy_destroyed');
    }
    
    recordBossDefeated(bossName, level) {
        this.currentSession.bossesDefeated++;
        
        this.updateAchievementProgress('bosses_defeated', this.currentSession.bossesDefeated);
        
        this.recordEvent('boss_defeated', { bossName, level });
    }
    
    recordCombo(combo) {
        this.currentSession.maxCombo = Math.max(this.currentSession.maxCombo, combo);
        
        this.updateAchievementProgress('combo', combo);
        
        this.recordEvent('combo_achieved', { combo });
    }
    
    recordDamage() {
        this.currentSession.damagesTaken++;
        this.currentSession.lives = Math.max(0, this.currentSession.lives - 1);
        
        this.recordEvent('damage_taken', { 
            remainingLives: this.currentSession.lives 
        });
    }
    
    recordPowerUpCollected(powerUpType) {
        this.currentSession.powerUpsCollected++;
        
        this.updateAchievementProgress('powerups_collected', this.currentSession.powerUpsCollected);
        
        this.recordEvent('powerup_collected', { type: powerUpType });
    }
    
    recordLevelStart(level) {
        this.currentSession.level = level;
        this.currentSession.levelStartTime = Date.now();
        
        this.recordEvent('level_start', { level });
    }
    
    recordLevelComplete(level, score, stars, noDamage = false) {
        const levelTime = Date.now() - (this.currentSession.levelStartTime || this.currentSession.startTime);
        
        // Update level progress
        const existingProgress = this.levelProgress.get(level) || {};
        const newProgress = {
            level,
            completed: true,
            bestScore: Math.max(existingProgress.bestScore || 0, score),
            stars: Math.max(existingProgress.stars || 0, stars),
            bestTime: existingProgress.bestTime ? 
                Math.min(existingProgress.bestTime, levelTime) : levelTime,
            timesCompleted: (existingProgress.timesCompleted || 0) + 1,
            lastCompleted: Date.now()
        };
        
        this.levelProgress.set(level, newProgress);
        this.completedLevels.add(level);
        
        // Save to storage
        this.storage.updateLevelProgress(level, true, score, stars);
        
        // Update achievements
        this.updateAchievementProgress('levels_completed', this.completedLevels.size);
        
        // Calculate total stars
        const totalStars = Array.from(this.levelProgress.values())
            .reduce((sum, progress) => sum + (progress.stars || 0), 0);
        this.updateAchievementProgress('total_stars', totalStars);
        
        // Check time-based achievements
        if (level === 1 && levelTime <= 120000) { // 2 minutes
            this.updateAchievementProgress('level_time', levelTime, level);
        }
        
        // Check no-damage achievements
        if (noDamage) {
            this.updateAchievementProgress('no_damage_level', 1);
        }
        
        this.recordEvent('level_complete', { 
            level, 
            score, 
            stars, 
            time: levelTime,
            noDamage 
        });
    }
    
    recordGameComplete(totalScore, totalTime) {
        // Check for complete game achievements
        const allLevelsCompleted = this.completedLevels.size >= 5; // Assuming 5 levels
        
        if (allLevelsCompleted && this.currentSession.damagesTaken === 0) {
            this.updateAchievementProgress('no_damage_complete', 1);
        }
        
        this.recordEvent('game_complete', { 
            totalScore, 
            totalTime,
            allLevelsCompleted
        });
    }
    
    // Achievement system
    updateAchievementProgress(type, value, context = null) {
        this.achievementProgress.forEach((achievement, id) => {
            if (achievement.type === type && !achievement.unlocked) {
                this.checkAchievement(id, achievement, value, context);
            }
        });
    }
    
    checkAchievement(id, achievement, value, context = null) {
        let shouldUnlock = false;
        
        switch (achievement.type) {
            case 'score':
            case 'enemies_destroyed':
            case 'bosses_defeated':
            case 'levels_completed':
            case 'total_stars':
            case 'powerups_collected':
            case 'combo':
                achievement.progress = Math.max(achievement.progress, value);
                shouldUnlock = achievement.progress >= achievement.target;
                break;
                
            case 'accuracy':
                if (this.currentSession.shotsFired >= (achievement.minShots || 0)) {
                    achievement.progress = value;
                    shouldUnlock = value >= achievement.target;
                }
                break;
                
            case 'level_time':
                if (context === achievement.level) {
                    shouldUnlock = value <= achievement.target;
                }
                break;
                
            case 'shots_per_enemy':
                achievement.progress = value;
                shouldUnlock = value <= achievement.target;
                break;
                
            case 'no_damage_level':
            case 'no_damage_complete':
                achievement.progress += value;
                shouldUnlock = achievement.progress >= achievement.target;
                break;
                
            case 'play_sessions':
                // This would be tracked globally
                break;
        }
        
        if (shouldUnlock) {
            this.unlockAchievement(id);
        }
    }
    
    unlockAchievement(achievementId) {
        const achievement = this.achievementProgress.get(achievementId);
        if (!achievement || achievement.unlocked) return;
        
        // Mark as unlocked
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
        
        // Add to unlocked list
        this.unlockedAchievements.push({
            id: achievementId,
            unlockedAt: achievement.unlockedAt
        });
        
        // Save to storage
        this.storage.addAchievement({
            id: achievementId,
            unlockedAt: achievement.unlockedAt
        });
        
        // Emit event
        const event = new CustomEvent('achievementUnlocked', {
            detail: { achievementId, achievement }
        });
        window.dispatchEvent(event);
        
        this.recordEvent('achievement_unlocked', { achievementId });
        
        console.log(`🏆 Achievement unlocked: ${achievementId}`);
    }
    
    checkAllAchievements() {
        // Check session-based achievements
        const globalStats = this.storage.loadStatistics();
        
        // Update global achievement progress
        this.updateAchievementProgress('play_sessions', globalStats.gamesPlayed + 1);
        
        // Recalculate all achievements based on global stats
        this.updateAchievementProgress('enemies_destroyed', globalStats.enemiesDestroyed);
        this.updateAchievementProgress('score', globalStats.totalScore);
    }
    
    updateGlobalStatistics() {
        const globalStats = this.storage.loadStatistics();
        
        const updatedStats = {
            gamesPlayed: globalStats.gamesPlayed + 1,
            totalScore: Math.max(globalStats.totalScore, this.currentSession.score),
            totalPlayTime: globalStats.totalPlayTime + this.sessionStats.playTime,
            enemiesDestroyed: globalStats.enemiesDestroyed + this.currentSession.enemiesDestroyed,
            shotsFired: globalStats.shotsFired + this.currentSession.shotsFired,
            shotsHit: globalStats.shotsHit + this.currentSession.shotsHit,
            accuracy: Math.max(globalStats.accuracy, this.sessionStats.accuracy),
            maxCombo: Math.max(globalStats.maxCombo, this.currentSession.maxCombo),
            levelsCompleted: this.completedLevels.size,
            totalStars: Array.from(this.levelProgress.values())
                .reduce((sum, progress) => sum + (progress.stars || 0), 0),
            achievementsUnlocked: this.unlockedAchievements.length,
            bossesDefeated: globalStats.bossesDefeated + this.currentSession.bossesDefeated
        };
        
        this.storage.updateStatistics(updatedStats);
    }
    
    recordEvent(type, data = {}) {
        const event = {
            type,
            timestamp: Date.now(),
            gameTime: Date.now() - this.currentSession.startTime,
            level: this.currentSession.level,
            score: this.currentSession.score,
            ...data
        };
        
        this.eventHistory.push(event);
        
        // Limit history size
        if (this.eventHistory.length > this.maxEventHistory) {
            this.eventHistory = this.eventHistory.slice(-this.maxEventHistory / 2);
        }
    }
    
    saveProgress() {
        // Save achievement progress
        const achievementProgressObj = {};
        this.achievementProgress.forEach((value, key) => {
            achievementProgressObj[key] = value;
        });
        
        this.storage.setItem('achievementProgress', achievementProgressObj);
        
        // Save event history (last 100 events)
        this.storage.setItem('recentEvents', this.eventHistory.slice(-100));
    }
    
    // Analytics and insights
    getProgressSummary() {
        const totalStars = Array.from(this.levelProgress.values())
            .reduce((sum, progress) => sum + (progress.stars || 0), 0);
            
        const completionRate = this.completedLevels.size / 5; // Assuming 5 levels
        
        return {
            completedLevels: this.completedLevels.size,
            totalStars,
            completionRate,
            achievementsUnlocked: this.unlockedAchievements.length,
            currentSession: { ...this.currentSession },
            sessionStats: { ...this.sessionStats }
        };
    }
    
    getAchievementProgress() {
        const progress = [];
        
        this.achievementProgress.forEach((achievement, id) => {
            progress.push({
                id,
                name: achievement.name || id,
                progress: achievement.progress,
                target: achievement.target,
                unlocked: achievement.unlocked,
                percentage: achievement.target > 0 ? 
                    Math.min(100, (achievement.progress / achievement.target) * 100) : 0
            });
        });
        
        return progress.sort((a, b) => b.percentage - a.percentage);
    }
    
    getRecentEvents(limit = 10) {
        return this.eventHistory.slice(-limit).reverse();
    }
    
    getLevelStatistics(level) {
        const progress = this.levelProgress.get(level);
        if (!progress) return null;
        
        const events = this.eventHistory.filter(e => e.level === level);
        
        return {
            ...progress,
            eventCount: events.length,
            averageScore: progress.bestScore, // Could calculate average from multiple plays
            playCount: progress.timesCompleted || 1
        };
    }
    
    // Public getters
    getCurrentSession() {
        return { ...this.currentSession };
    }
    
    getSessionStats() {
        return { ...this.sessionStats };
    }
    
    isLevelCompleted(level) {
        return this.completedLevels.has(level);
    }
    
    getLevelProgress(level) {
        return this.levelProgress.get(level) || null;
    }
    
    isAchievementUnlocked(achievementId) {
        const achievement = this.achievementProgress.get(achievementId);
        return achievement ? achievement.unlocked : false;
    }
    
    // Reset methods
    resetSession() {
        this.startSession();
    }
    
    resetProgress() {
        this.levelProgress.clear();
        this.completedLevels.clear();
        this.achievementProgress.clear();
        this.unlockedAchievements = [];
        this.eventHistory = [];
        
        this.initializeAchievements();
        this.saveProgress();
        
        console.log('🔄 User progress reset');
    }
    
    // Cleanup
    destroy() {
        this.saveProgress();
        console.log('📊 User Progress destroyed');
    }
}