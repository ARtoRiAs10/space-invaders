// Level Configuration and Management
// Handles level data, objectives, and progression

import { GameConfig } from '../config.js';

export class Level {
    constructor(levelNumber) {
        this.levelNumber = levelNumber;
        this.data = null;
        this.objectives = [];
        this.isLoaded = false;
        
        // Level state
        this.startTime = 0;
        this.completionTime = 0;
        this.completed = false;
        this.score = 0;
        this.bonusScore = 0;
        
        // Performance tracking
        this.playerStats = {
            accuracy: 0,
            enemiesDestroyed: 0,
            damagesTaken: 0,
            powerUpsCollected: 0,
            timeBonus: 0
        };
    }
    
    async load() {
        try {
            // Load level configuration
            this.data = await this.loadLevelData(this.levelNumber);
            
            // Initialize objectives
            this.initializeObjectives();
            
            this.isLoaded = true;
            return this.data;
            
        } catch (error) {
            console.error(`Failed to load level ${this.levelNumber}:`, error);
            // Fallback to default level configuration
            this.data = this.getDefaultLevelData();
            this.isLoaded = true;
            return this.data;
        }
    }
    
    async loadLevelData(levelNumber) {
        // Try to load from JSON file first
        try {
            const response = await fetch(`./src/levels/level${levelNumber}.json`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn(`Could not load level${levelNumber}.json, using config`);
        }
        
        // Fallback to config data
        const levelConfig = GameConfig.levels[levelNumber];
        if (levelConfig) {
            return this.expandLevelConfig(levelConfig, levelNumber);
        }
        
        // Final fallback
        return this.getDefaultLevelData();
    }
    
    expandLevelConfig(config, levelNumber) {
        return {
            level: levelNumber,
            name: config.name,
            description: config.description,
            waveCount: config.waveCount,
            enemyTypes: config.enemyTypes,
            bossEnabled: config.bossEnabled,
            background: config.background,
            
            // Expanded properties
            objectives: this.generateObjectives(levelNumber),
            difficulty: {
                enemySpeed: 1.0 + (levelNumber - 1) * 0.2,
                enemyHealth: 1.0 + (levelNumber - 1) * 0.3,
                spawnRate: 1.0 + (levelNumber - 1) * 0.1,
                projectileSpeed: 1.0 + (levelNumber - 1) * 0.15
            },
            rewards: {
                baseScore: levelNumber * 1000,
                timeBonus: levelNumber * 500,
                accuracyBonus: levelNumber * 300,
                perfectBonus: levelNumber * 2000
            },
            music: {
                background: `level${levelNumber}.mp3`,
                boss: `boss${levelNumber}.mp3`
            },
            environment: {
                starDensity: Math.min(100 + levelNumber * 20, 200),
                nebula: levelNumber > 2,
                asteroids: levelNumber > 3,
                particleEffects: true
            }
        };
    }
    
    getDefaultLevelData() {
        return {
            level: this.levelNumber,
            name: `Level ${this.levelNumber}`,
            description: "Defend against the alien invasion",
            waveCount: 3 + Math.floor(this.levelNumber / 2),
            enemyTypes: ['basic'],
            bossEnabled: true,
            background: 'space1',
            objectives: [
                {
                    id: 'survive',
                    description: 'Complete the level',
                    type: 'survive',
                    required: true
                }
            ],
            difficulty: {
                enemySpeed: 1.0,
                enemyHealth: 1.0,
                spawnRate: 1.0,
                projectileSpeed: 1.0
            },
            rewards: {
                baseScore: 1000,
                timeBonus: 500,
                accuracyBonus: 300,
                perfectBonus: 2000
            }
        };
    }
    
    generateObjectives(levelNumber) {
        const objectives = [
            {
                id: 'survive',
                description: 'Complete the level',
                type: 'survive',
                required: true,
                progress: 0,
                target: 1
            }
        ];
        
        // Add level-specific objectives
        switch (levelNumber) {
            case 1:
                objectives.push({
                    id: 'accuracy_70',
                    description: 'Maintain 70% accuracy',
                    type: 'accuracy',
                    required: false,
                    progress: 0,
                    target: 0.7,
                    bonusScore: 500
                });
                break;
                
            case 2:
                objectives.push({
                    id: 'no_damage',
                    description: 'Take no damage',
                    type: 'health',
                    required: false,
                    progress: 0,
                    target: 0,
                    bonusScore: 1000
                });
                break;
                
            case 3:
                objectives.push({
                    id: 'combo_20',
                    description: 'Achieve 20+ combo',
                    type: 'combo',
                    required: false,
                    progress: 0,
                    target: 20,
                    bonusScore: 750
                });
                break;
                
            case 4:
                objectives.push({
                    id: 'time_limit',
                    description: 'Complete in under 3 minutes',
                    type: 'time',
                    required: false,
                    progress: 0,
                    target: 180000, // 3 minutes in ms
                    bonusScore: 1500
                });
                break;
                
            case 5:
                objectives.push({
                    id: 'perfect',
                    description: 'Perfect run: No damage, 90% accuracy',
                    type: 'perfect',
                    required: false,
                    progress: 0,
                    target: 1,
                    bonusScore: 5000
                });
                break;
        }
        
        return objectives;
    }
    
    initializeObjectives() {
        if (!this.data.objectives) return;
        
        this.objectives = this.data.objectives.map(obj => ({
            ...obj,
            completed: false,
            startTime: null,
            completionTime: null,
            progress: 0
        }));
    }
    
    // Level progression
    start() {
        this.startTime = Date.now();
        this.completed = false;
        this.score = 0;
        this.bonusScore = 0;
        
        // Start objective tracking
        this.objectives.forEach(obj => {
            obj.startTime = this.startTime;
            obj.completed = false;
            obj.progress = 0;
        });
        
        console.log(`🎮 Level ${this.levelNumber} started: ${this.data.name}`);
    }
    
    complete(gameStats) {
        this.completionTime = Date.now();
        this.completed = true;
        
        // Store player performance
        this.playerStats = { ...gameStats };
        
        // Calculate final score and bonuses
        this.calculateScore(gameStats);
        
        // Complete objectives
        this.completeObjectives(gameStats);
        
        console.log(`✅ Level ${this.levelNumber} completed!`);
        
        return this.getLevelResults();
    }
    
    calculateScore(gameStats) {
        const levelTime = this.completionTime - this.startTime;
        const rewards = this.data.rewards;
        
        // Base score
        this.score = rewards.baseScore;
        
        // Time bonus (faster = more bonus)
        const maxTime = 300000; // 5 minutes
        const timeRatio = Math.max(0, (maxTime - levelTime) / maxTime);
        const timeBonus = Math.floor(rewards.timeBonus * timeRatio);
        
        // Accuracy bonus
        const accuracyBonus = Math.floor(rewards.accuracyBonus * (gameStats.accuracy || 0));
        
        // Perfect run bonus
        const perfectBonus = (gameStats.damagesTaken === 0 && gameStats.accuracy >= 0.9) ? 
            rewards.perfectBonus : 0;
        
        // Objective bonuses
        const objectiveBonus = this.objectives
            .filter(obj => obj.completed && obj.bonusScore)
            .reduce((sum, obj) => sum + obj.bonusScore, 0);
        
        this.bonusScore = timeBonus + accuracyBonus + perfectBonus + objectiveBonus;
        this.score += this.bonusScore;
        
        return {
            baseScore: rewards.baseScore,
            timeBonus,
            accuracyBonus,
            perfectBonus,
            objectiveBonus,
            totalScore: this.score
        };
    }
    
    completeObjectives(gameStats) {
        this.objectives.forEach(objective => {
            if (objective.completed) return;
            
            let completed = false;
            
            switch (objective.type) {
                case 'survive':
                    completed = true;
                    objective.progress = 1;
                    break;
                    
                case 'accuracy':
                    objective.progress = gameStats.accuracy || 0;
                    completed = objective.progress >= objective.target;
                    break;
                    
                case 'health':
                    objective.progress = gameStats.damagesTaken || 0;
                    completed = objective.progress <= objective.target;
                    break;
                    
                case 'combo':
                    objective.progress = gameStats.maxCombo || 0;
                    completed = objective.progress >= objective.target;
                    break;
                    
                case 'time':
                    const levelTime = this.completionTime - this.startTime;
                    objective.progress = levelTime;
                    completed = levelTime <= objective.target;
                    break;
                    
                case 'perfect':
                    const isPerfect = (gameStats.damagesTaken === 0) && 
                                    (gameStats.accuracy >= 0.9);
                    objective.progress = isPerfect ? 1 : 0;
                    completed = isPerfect;
                    break;
            }
            
            if (completed) {
                objective.completed = true;
                objective.completionTime = Date.now();
                console.log(`🎯 Objective completed: ${objective.description}`);
            }
        });
    }
    
    // Objective tracking during gameplay
    updateObjectiveProgress(type, value) {
        this.objectives.forEach(objective => {
            if (objective.type === type && !objective.completed) {
                switch (type) {
                    case 'accuracy':
                    case 'combo':
                        objective.progress = Math.max(objective.progress, value);
                        break;
                    case 'health':
                        objective.progress = value;
                        break;
                    case 'time':
                        objective.progress = Date.now() - this.startTime;
                        break;
                }
                
                // Check if objective is now complete
                if (this.checkObjectiveCompletion(objective)) {
                    objective.completed = true;
                    objective.completionTime = Date.now();
                    console.log(`🎯 Objective completed during play: ${objective.description}`);
                }
            }
        });
    }
    
    checkObjectiveCompletion(objective) {
        switch (objective.type) {
            case 'accuracy':
            case 'combo':
                return objective.progress >= objective.target;
            case 'health':
                return objective.progress <= objective.target;
            case 'time':
                return objective.progress <= objective.target;
            default:
                return false;
        }
    }
    
    // Star rating system
    calculateStarRating() {
        let stars = 1; // Base star for completion
        
        // Additional stars based on objectives
        const completedObjectives = this.objectives.filter(obj => obj.completed);
        const bonusObjectives = this.objectives.filter(obj => !obj.required && obj.completed);
        
        if (bonusObjectives.length > 0) stars++;
        if (bonusObjectives.length === this.objectives.filter(obj => !obj.required).length) stars++;
        
        // Perfect run gets 3 stars
        if (this.playerStats.damagesTaken === 0 && this.playerStats.accuracy >= 0.9) {
            stars = 3;
        }
        
        return Math.min(3, stars);
    }
    
    // Results and data
    getLevelResults() {
        return {
            level: this.levelNumber,
            name: this.data.name,
            completed: this.completed,
            score: this.score,
            bonusScore: this.bonusScore,
            stars: this.calculateStarRating(),
            time: this.completionTime - this.startTime,
            objectives: this.objectives.map(obj => ({
                id: obj.id,
                description: obj.description,
                completed: obj.completed,
                progress: obj.progress,
                target: obj.target,
                bonusScore: obj.bonusScore || 0
            })),
            playerStats: { ...this.playerStats },
            scoreBreakdown: this.calculateScore(this.playerStats)
        };
    }
    
    getSummary() {
        return {
            level: this.levelNumber,
            name: this.data?.name || `Level ${this.levelNumber}`,
            description: this.data?.description || '',
            completed: this.completed,
            stars: this.completed ? this.calculateStarRating() : 0,
            bestScore: this.score,
            objectives: this.objectives.length,
            completedObjectives: this.objectives.filter(obj => obj.completed).length
        };
    }
    
    // Getters
    getName() {
        return this.data?.name || `Level ${this.levelNumber}`;
    }
    
    getDescription() {
        return this.data?.description || '';
    }
    
    getObjectives() {
        return this.objectives;
    }
    
    getWaveCount() {
        return this.data?.waveCount || 3;
    }
    
    getEnemyTypes() {
        return this.data?.enemyTypes || ['basic'];
    }
    
    hasBoss() {
        return this.data?.bossEnabled || false;
    }
    
    getDifficulty() {
        return this.data?.difficulty || {
            enemySpeed: 1.0,
            enemyHealth: 1.0,
            spawnRate: 1.0,
            projectileSpeed: 1.0
        };
    }
    
    isLoaded() {
        return this.isLoaded;
    }
    
    // Static methods
    static async loadAllLevels() {
        const levels = [];
        const maxLevels = GameConfig.maxLevels || 5;
        
        for (let i = 1; i <= maxLevels; i++) {
            const level = new Level(i);
            await level.load();
            levels.push(level);
        }
        
        return levels;
    }
    
    static createLevelSummaries() {
        const summaries = [];
        const maxLevels = GameConfig.maxLevels || 5;
        
        for (let i = 1; i <= maxLevels; i++) {
            const levelConfig = GameConfig.levels[i];
            summaries.push({
                level: i,
                name: levelConfig?.name || `Level ${i}`,
                description: levelConfig?.description || '',
                unlocked: false, // Will be updated by progress system
                completed: false,
                stars: 0,
                bestScore: 0
            });
        }
        
        return summaries;
    }
}