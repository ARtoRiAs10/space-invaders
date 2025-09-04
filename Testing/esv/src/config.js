// Game Configuration and Constants
export const GameConfig = {
    // Canvas dimensions
    canvas: {
        width: 1024,
        height: 576
    },
    
    // Game settings
    maxLevels: 5,
    difficulty: 'normal', // easy, normal, hard, insane
    
    // Difficulty multipliers
    difficultySettings: {
        easy: {
            enemySpeedMultiplier: 0.7,
            enemyHealthMultiplier: 0.8,
            playerDamageMultiplier: 1.3,
            spawnRateMultiplier: 0.8
        },
        normal: {
            enemySpeedMultiplier: 1.0,
            enemyHealthMultiplier: 1.0,
            playerDamageMultiplier: 1.0,
            spawnRateMultiplier: 1.0
        },
        hard: {
            enemySpeedMultiplier: 1.3,
            enemyHealthMultiplier: 1.5,
            playerDamageMultiplier: 0.8,
            spawnRateMultiplier: 1.4
        },
        insane: {
            enemySpeedMultiplier: 1.8,
            enemyHealthMultiplier: 2.0,
            playerDamageMultiplier: 0.6,
            spawnRateMultiplier: 2.0
        }
    },
    
    // Player settings
    player: {
        speed: 7,
        maxLives: 3,
        invulnerabilityTime: 2000, // ms
        powerUpDuration: 5000 // ms
    },
    
    // Projectile settings
    projectiles: {
        player: {
            speed: 10,
            damage: 25,
            radius: 4,
            color: '#00ffff'
        },
        enemy: {
            speed: 5,
            damage: 1,
            width: 3,
            height: 10,
            color: '#ff0000'
        }
    },
    
    // Enemy settings
    enemies: {
        basic: {
            health: 25,
            speed: 3,
            score: 100,
            width: 30,
            height: 30
        },
        fast: {
            health: 15,
            speed: 5,
            score: 150,
            width: 25,
            height: 25
        },
        heavy: {
            health: 50,
            speed: 2,
            score: 200,
            width: 35,
            height: 35
        }
    },
    
    // Boss settings
    bosses: {
        1: {
            name: "Guardian Sentinel",
            health: 500,
            speed: 2,
            score: 5000,
            width: 80,
            height: 80,
            attackPatterns: ['straight', 'spread', 'spiral'],
            aiPersonality: 'aggressive'
        },
        2: {
            name: "Void Destroyer",
            health: 750,
            speed: 3,
            score: 7500,
            width: 90,
            height: 90,
            attackPatterns: ['homing', 'laser', 'mines'],
            aiPersonality: 'tactical'
        },
        3: {
            name: "Cosmic Overlord",
            health: 1000,
            speed: 2.5,
            score: 10000,
            width: 120,
            height: 120,
            attackPatterns: ['all'],
            aiPersonality: 'adaptive'
        },
        4: {
            name: "Quantum Annihilator",
            health: 1500,
            speed: 4,
            score: 15000,
            width: 100,
            height: 100,
            attackPatterns: ['teleport', 'clone', 'storm'],
            aiPersonality: 'unpredictable'
        },
        5: {
            name: "The Final Protocol",
            health: 2500,
            speed: 3,
            score: 25000,
            width: 150,
            height: 150,
            attackPatterns: ['ultimate'],
            aiPersonality: 'supreme'
        }
    },
    
    // Power-up settings
    powerUps: {
        machineGun: {
            duration: 5000,
            fireRate: 2, // frames between shots
            color: '#ffff00'
        },
        spread: {
            duration: 8000,
            shots: 3,
            spread: 30, // degrees
            color: '#ff8800'
        },
        laser: {
            duration: 10000,
            damage: 50,
            width: 8,
            color: '#ff0080'
        },
        shield: {
            duration: 15000,
            color: '#00ff80'
        },
        nuke: {
            radius: 200,
            damage: 200,
            color: '#ffffff'
        }
    },
    
    // Audio settings
    audio: {
        masterVolume: 0.5,
        musicVolume: 0.3,
        sfxVolume: 0.7,
        sounds: {
            shoot: './public/assets/audio/shoot.wav',
            enemyShoot: './public/assets/audio/enemyShoot.wav',
            explode: './public/assets/audio/explode.wav',
            bomb: './public/assets/audio/bomb.mp3',
            bonus: './public/assets/audio/bonus.mp3',
            gameOver: './public/assets/audio/gameOver.mp3',
            victory: './public/assets/audio/victory.mp3',
            select: './public/assets/audio/select.mp3',
            start: './public/assets/audio/start.mp3',
            backgroundMusic: './public/assets/audio/backgroundMusic.wav',
            bossMusic: './public/assets/audio/bossMusic.wav'
        }
    },
    
    // Visual effects settings
    effects: {
        particles: {
            explosion: {
                count: 15,
                speed: 2,
                colors: ['#ff4444', '#ff8844', '#ffff44'],
                life: 60 // frames
            },
            trail: {
                count: 5,
                speed: 1,
                colors: ['#00ffff', '#0088ff'],
                life: 30
            },
            stars: {
                count: 100,
                speed: 0.3,
                colors: ['#ffffff', '#cccccc'],
                life: Infinity
            }
        },
        screen: {
            shake: {
                intensity: 5,
                duration: 30 // frames
            },
            flash: {
                color: '#ffffff',
                opacity: 0.5,
                duration: 10 // frames
            }
        }
    },
    
    // Level progression settings
    levels: {
        1: {
            name: "Outer Perimeter",
            description: "The invasion begins...",
            waveCount: 3,
            enemyTypes: ['basic'],
            bossEnabled: true,
            background: 'space1'
        },
        2: {
            name: "Defense Grid",
            description: "They've adapted to your tactics",
            waveCount: 4,
            enemyTypes: ['basic', 'fast'],
            bossEnabled: true,
            background: 'space2'
        },
        3: {
            name: "Core Systems",
            description: "The heart of their fleet",
            waveCount: 5,
            enemyTypes: ['basic', 'fast', 'heavy'],
            bossEnabled: true,
            background: 'space3'
        },
        4: {
            name: "Command Center",
            description: "Their strongest defenses await",
            waveCount: 6,
            enemyTypes: ['fast', 'heavy'],
            bossEnabled: true,
            background: 'space4'
        },
        5: {
            name: "The Final Stand",
            description: "Face the ultimate threat",
            waveCount: 7,
            enemyTypes: ['heavy'],
            bossEnabled: true,
            background: 'space5'
        }
    },
    
    // AI LLM settings
    ai: {
        groqApiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile', // Free model from Groq
        maxTokens: 150,
        temperature: 0.7,
        
        // Boss behavior prompts
        prompts: {
            aggressive: "You are an aggressive space boss. You favor direct attacks and overwhelming firepower. Respond with attack patterns that are relentless and straightforward.",
            tactical: "You are a tactical space boss. You analyze the player's movements and adapt your strategy accordingly. Use calculated attacks and defensive maneuvers.",
            adaptive: "You are an adaptive space boss that learns from the player's behavior. Change your attack patterns based on the player's performance and position.",
            unpredictable: "You are an unpredictable space boss. Your attack patterns should be erratic and surprising, keeping the player guessing.",
            supreme: "You are the ultimate space boss. Combine all strategies and use the most challenging attack patterns available."
        },
        
        // Behavior update frequency
        updateInterval: 3000, // ms between AI decisions
        
        // Fallback behaviors if AI is unavailable
        fallbackBehaviors: {
            pattern1: ['straight', 'spread', 'straight'],
            pattern2: ['spread', 'spiral', 'spread'],
            pattern3: ['spiral', 'homing', 'spiral'],
            pattern4: ['mines', 'laser', 'teleport'],
            pattern5: ['storm', 'clone', 'ultimate']
        }
    },
    
    // Performance settings
    performance: {
        targetFPS: 60,
        maxParticles: 200,
        cullingDistance: 100, // pixels outside canvas to cull objects
        enableVSync: true
    },
    
    // Debug settings
    debug: {
        showFPS: false,
        showCollisionBoxes: false,
        showAIDecisions: false,
        godMode: false,
        unlockAllLevels: false
    },
    
    // Storage keys
    storage: {
        settings: 'spaceInvaders_settings',
        progress: 'spaceInvaders_progress',
        highScores: 'spaceInvaders_highScores',
        gameState: 'spaceInvaders_gameState'
    },
    
    // Authentication settings
    auth: {
        clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
        features: {
            saveProgress: true,
            leaderboards: true,
            achievements: true,
            socialFeatures: false
        }
    }
};

// Utility functions for configuration
export const ConfigUtils = {
    getDifficultyMultiplier(difficulty, stat) {
        return GameConfig.difficultySettings[difficulty]?.[stat] || 1.0;
    },
    
    getBossConfig(level) {
        return GameConfig.bosses[level] || GameConfig.bosses[1];
    },
    
    getLevelConfig(level) {
        return GameConfig.levels[level] || GameConfig.levels[1];
    },
    
    getCanvasSize() {
        return {
            width: GameConfig.canvas.width,
            height: GameConfig.canvas.height
        };
    },
    
    applyDifficulty(baseValue, multiplier, difficulty = GameConfig.difficulty) {
        const diffMult = GameConfig.difficultySettings[difficulty]?.[multiplier] || 1.0;
        return Math.round(baseValue * diffMult);
    }
};