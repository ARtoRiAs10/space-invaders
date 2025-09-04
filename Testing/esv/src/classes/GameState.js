// Game State Management Class
// Handles scoring, lives, level progression, and game state

export class GameState {
    constructor() {
        // Core game state
        this.gameState = 'menu'; // menu, playing, paused, gameOver, levelComplete
        this.level = 1;
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        
        // Timing
        this.startTime = 0;
        this.levelStartTime = 0;
        this.pausedTime = 0;
        this.totalPausedTime = 0;
        
        // Statistics
        this.stats = {
            shotsFired: 0,
            shotsHit: 0,
            enemiesDestroyed: 0,
            bossesDefeated: 0,
            powerUpsCollected: 0,
            distanceTraveled: 0,
            timeAlive: 0,
            accuracy: 0,
            levelTime: 0
        };
        
        // Multipliers
        this.scoreMultiplier = 1.0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        
        // Level progression
        this.levelProgress = {
            wavesCompleted: 0,
            totalWaves: 3,
            bossDefeated: false,
            objectives: []
        };
        
        // Events and achievements
        this.events = [];
        this.achievements = [];
        
        this.reset();
    }
    
    reset() {
        this.gameState = 'menu';
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.scoreMultiplier = 1.0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        
        // Reset timing
        this.startTime = Date.now();
        this.levelStartTime = Date.now();
        this.pausedTime = 0;
        this.totalPausedTime = 0;
        
        // Reset statistics
        this.stats = {
            shotsFired: 0,
            shotsHit: 0,
            enemiesDestroyed: 0,
            bossesDefeated: 0,
            powerUpsCollected: 0,
            distanceTraveled: 0,
            timeAlive: 0,
            accuracy: 0,
            levelTime: 0
        };
        
        // Reset level progress
        this.levelProgress = {
            wavesCompleted: 0,
            totalWaves: 3,
            bossDefeated: false,
            objectives: []
        };
        
        // Clear events
        this.events = [];
    }
    
    // Game state management
    setGameState(state) {
        const oldState = this.gameState;
        this.gameState = state;
        
        // Handle state transitions
        this.onStateChange(oldState, state);
        
        this.addEvent('stateChange', { from: oldState, to: state });
    }
    
    getGameState() {
        return this.gameState;
    }
    
    onStateChange(oldState, newState) {
        const now = Date.now();
        
        switch (newState) {
            case 'playing':
                if (oldState === 'paused') {
                    // Resume from pause
                    this.totalPausedTime += now - this.pausedTime;
                } else if (oldState === 'menu') {
                    // Start new game
                    this.levelStartTime = now;
                }
                break;
                
            case 'paused':
                this.pausedTime = now;
                break;
                
            case 'gameOver':
                this.calculateFinalStats();
                break;
                
            case 'levelComplete':
                this.calculateLevelStats();
                break;
        }
    }
    
    // Level management
    setLevel(level) {
        this.level = level;
        this.wave = 1;
        this.levelStartTime = Date.now();
        this.levelProgress.wavesCompleted = 0;
        this.levelProgress.bossDefeated = false;
        
        this.addEvent('levelStart', { level });
    }
    
    getLevel() {
        return this.level;
    }
    
    nextWave() {
        this.wave++;
        this.levelProgress.wavesCompleted++;
        
        this.addEvent('waveComplete', { 
            wave: this.wave - 1, 
            level: this.level 
        });
    }
    
    getCurrentWave() {
        return this.wave;
    }
    
    // Score management
    addScore(points, source = 'enemy') {
        const basePoints = points;
        const multipliedPoints = Math.floor(basePoints * this.scoreMultiplier);
        
        this.score += multipliedPoints;
        
        // Update combo system
        this.updateCombo(source);
        
        this.addEvent('scoreAdded', { 
            basePoints, 
            multipliedPoints, 
            source,
            combo: this.comboCount 
        });
        
        return multipliedPoints;
    }
    
    getScore() {
        return this.score;
    }
    
    updateCombo(source) {
        if (source === 'enemy' || source === 'boss') {
            this.comboCount++;
            this.comboTimer = 3000; // 3 seconds to maintain combo
            this.maxCombo = Math.max(this.maxCombo, this.comboCount);
            
            // Increase score multiplier based on combo
            this.scoreMultiplier = 1.0 + (this.comboCount * 0.1);
        }
    }
    
    updateComboTimer(deltaTime) {
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }
    }
    
    resetCombo() {
        this.comboCount = 0;
        this.scoreMultiplier = 1.0;
        this.comboTimer = 0;
    }
    
    // Lives management
    setLives(lives) {
        this.lives = lives;
    }
    
    getLives() {
        return this.lives;
    }
    
    reduceLives(amount = 1) {
        this.lives = Math.max(0, this.lives - amount);
        
        this.addEvent('livesReduced', { 
            amount, 
            remaining: this.lives 
        });
        
        // Reset combo on death
        this.resetCombo();
    }
    
    addLife() {
        this.lives++;
        
        this.addEvent('lifeGained', { 
            total: this.lives 
        });
    }
    
    // Statistics tracking
    recordShot() {
        this.stats.shotsFired++;
        this.updateAccuracy();
    }
    
    recordHit() {
        this.stats.shotsHit++;
        this.updateAccuracy();
    }
    
    recordEnemyDestroyed() {
        this.stats.enemiesDestroyed++;
    }
    
    recordBossDefeated() {
        this.stats.bossesDefeated++;
        this.levelProgress.bossDefeated = true;
    }
    
    recordPowerUpCollected() {
        this.stats.powerUpsCollected++;
    }
    
    recordDistanceTraveled(distance) {
        this.stats.distanceTraveled += distance;
    }
    
    updateAccuracy() {
        this.stats.accuracy = this.stats.shotsFired > 0 ? 
            this.stats.shotsHit / this.stats.shotsFired : 0;
    }
    
    // Time management
    getGameTime() {
        if (this.gameState === 'paused') {
            return this.pausedTime - this.startTime - this.totalPausedTime;
        }
        return Date.now() - this.startTime - this.totalPausedTime;
    }
    
    getLevelTime() {
        if (this.gameState === 'paused') {
            return this.pausedTime - this.levelStartTime - this.totalPausedTime;
        }
        return Date.now() - this.levelStartTime - this.totalPausedTime;
    }
    
    getTimeAlive() {
        return this.getGameTime();
    }
    
    // Level progression
    setTotalWaves(count) {
        this.levelProgress.totalWaves = count;
    }
    
    getWaveProgress() {
        return {
            current: this.levelProgress.wavesCompleted,
            total: this.levelProgress.totalWaves,
            percentage: this.levelProgress.wavesCompleted / this.levelProgress.totalWaves
        };
    }
    
    isLevelComplete() {
        return this.levelProgress.wavesCompleted >= this.levelProgress.totalWaves && 
               this.levelProgress.bossDefeated;
    }
    
    // Objectives system
    addObjective(objective) {
        this.levelProgress.objectives.push({
            ...objective,
            completed: false,
            startTime: Date.now()
        });
    }
    
    completeObjective(objectiveId) {
        const objective = this.levelProgress.objectives.find(obj => obj.id === objectiveId);
        if (objective && !objective.completed) {
            objective.completed = true;
            objective.completionTime = Date.now();
            
            this.addEvent('objectiveCompleted', { objectiveId, objective });
            
            // Award bonus points
            if (objective.bonusPoints) {
                this.addScore(objective.bonusPoints, 'objective');
            }
        }
    }
    
    getObjectives() {
        return this.levelProgress.objectives;
    }
    
    getCompletedObjectives() {
        return this.levelProgress.objectives.filter(obj => obj.completed);
    }
    
    // Achievement system
    checkAchievements() {
        // Check various achievement conditions
        this.checkScoreAchievements();
        this.checkCombatAchievements();
        this.checkTimeAchievements();
        this.checkSpecialAchievements();
    }
    
    checkScoreAchievements() {
        const scoreAchievements = [
            { id: 'score_1k', threshold: 1000, title: 'Space Cadet' },
            { id: 'score_10k', threshold: 10000, title: 'Ace Pilot' },
            { id: 'score_50k', threshold: 50000, title: 'Space Commander' },
            { id: 'score_100k', threshold: 100000, title: 'Galactic Hero' }
        ];
        
        scoreAchievements.forEach(achievement => {
            if (this.score >= achievement.threshold && !this.hasAchievement(achievement.id)) {
                this.unlockAchievement(achievement.id, achievement.title);
            }
        });
    }
    
    checkCombatAchievements() {
        // Accuracy achievements
        if (this.stats.accuracy >= 0.9 && this.stats.shotsFired >= 100) {
            this.unlockAchievement('sharpshooter', 'Sharpshooter');
        }
        
        // Combo achievements
        if (this.maxCombo >= 50) {
            this.unlockAchievement('combo_master', 'Combo Master');
        }
        
        // Boss achievements
        if (this.stats.bossesDefeated >= 5) {
            this.unlockAchievement('boss_slayer', 'Boss Slayer');
        }
    }
    
    checkTimeAchievements() {
        const gameTime = this.getGameTime();
        
        // Survival time achievements
        if (gameTime >= 300000) { // 5 minutes
            this.unlockAchievement('survivor', 'Survivor');
        }
        
        if (gameTime >= 600000) { // 10 minutes
            this.unlockAchievement('endurance', 'Endurance');
        }
    }
    
    checkSpecialAchievements() {
        // No damage achievement
        if (this.lives === 3 && this.stats.enemiesDestroyed >= 100) {
            this.unlockAchievement('untouchable', 'Untouchable');
        }
        
        // Power-up collector
        if (this.stats.powerUpsCollected >= 20) {
            this.unlockAchievement('collector', 'Power Collector');
        }
    }
    
    unlockAchievement(id, title) {
        if (!this.hasAchievement(id)) {
            this.achievements.push({
                id,
                title,
                unlockedAt: Date.now(),
                level: this.level,
                score: this.score
            });
            
            this.addEvent('achievementUnlocked', { id, title });
        }
    }
    
    hasAchievement(id) {
        return this.achievements.some(achievement => achievement.id === id);
    }
    
    getAchievements() {
        return this.achievements;
    }
    
    // Event system
    addEvent(type, data = {}) {
        this.events.push({
            type,
            data,
            timestamp: Date.now(),
            gameTime: this.getGameTime(),
            level: this.level,
            score: this.score
        });
        
        // Keep only recent events for performance
        if (this.events.length > 1000) {
            this.events = this.events.slice(-500);
        }
    }
    
    getEvents(type = null, limit = null) {
        let filteredEvents = type ? 
            this.events.filter(event => event.type === type) : 
            this.events;
            
        if (limit) {
            filteredEvents = filteredEvents.slice(-limit);
        }
        
        return filteredEvents;
    }
    
    getRecentEvents(seconds = 10) {
        const cutoffTime = Date.now() - (seconds * 1000);
        return this.events.filter(event => event.timestamp >= cutoffTime);
    }
    
    // Performance metrics
    calculateFinalStats() {
        this.stats.timeAlive = this.getGameTime();
        this.stats.levelTime = this.getLevelTime();
        
        // Calculate additional metrics
        this.stats.scorePerMinute = this.stats.timeAlive > 0 ? 
            (this.score / (this.stats.timeAlive / 60000)) : 0;
            
        this.stats.enemiesPerMinute = this.stats.timeAlive > 0 ? 
            (this.stats.enemiesDestroyed / (this.stats.timeAlive / 60000)) : 0;
            
        this.stats.survivalTime = this.stats.timeAlive;
        this.stats.maxCombo = this.maxCombo;
        
        // Check for final achievements
        this.checkAchievements();
    }
    
    calculateLevelStats() {
        this.stats.levelTime = this.getLevelTime();
        
        // Calculate level-specific bonuses
        const timeBonus = Math.max(0, 60000 - this.stats.levelTime) * 0.1;
        const accuracyBonus = this.stats.accuracy * 1000;
        const comboBonus = this.maxCombo * 50;
        
        const totalBonus = Math.floor(timeBonus + accuracyBonus + comboBonus);
        
        if (totalBonus > 0) {
            this.addScore(totalBonus, 'levelBonus');
        }
        
        return {
            timeBonus,
            accuracyBonus,
            comboBonus,
            totalBonus
        };
    }
    
    // Data serialization
    serialize() {
        return {
            gameState: this.gameState,
            level: this.level,
            score: this.score,
            lives: this.lives,
            wave: this.wave,
            stats: { ...this.stats },
            scoreMultiplier: this.scoreMultiplier,
            comboCount: this.comboCount,
            maxCombo: this.maxCombo,
            levelProgress: { ...this.levelProgress },
            achievements: [...this.achievements],
            gameTime: this.getGameTime(),
            levelTime: this.getLevelTime()
        };
    }
    
    deserialize(data) {
        if (!data) return;
        
        this.gameState = data.gameState || 'menu';
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.lives = data.lives || 3;
        this.wave = data.wave || 1;
        this.stats = { ...this.stats, ...data.stats };
        this.scoreMultiplier = data.scoreMultiplier || 1.0;
        this.comboCount = data.comboCount || 0;
        this.maxCombo = data.maxCombo || 0;
        this.levelProgress = { ...this.levelProgress, ...data.levelProgress };
        this.achievements = data.achievements || [];
    }
    
    // Summary for UI
    getSummary() {
        return {
            score: this.score,
            level: this.level,
            lives: this.lives,
            wave: this.wave,
            gameState: this.gameState,
            accuracy: Math.round(this.stats.accuracy * 100),
            combo: this.comboCount,
            maxCombo: this.maxCombo,
            scoreMultiplier: this.scoreMultiplier.toFixed(1),
            gameTime: this.formatTime(this.getGameTime()),
            levelTime: this.formatTime(this.getLevelTime()),
            achievements: this.achievements.length,
            waveProgress: this.getWaveProgress()
        };
    }
    
    // Utility methods
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Getters for common values
    getAccuracy() {
        return this.stats.accuracy;
    }
    
    getCombo() {
        return this.comboCount;
    }
    
    getScoreMultiplier() {
        return this.scoreMultiplier;
    }
    
    // Update method for continuous updates
    update(deltaTime) {
        // Update combo timer
        this.updateComboTimer(deltaTime);
        
        // Update time-based statistics
        this.stats.timeAlive = this.getGameTime();
        
        // Check achievements periodically
        if (this.getGameTime() % 5000 < deltaTime) { // Every 5 seconds
            this.checkAchievements();
        }
    }
}