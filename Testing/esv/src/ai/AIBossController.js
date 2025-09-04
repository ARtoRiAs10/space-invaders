// AI-Powered Boss Controller
// This class handles the AI decision-making for boss enemies using LLM integration

import { LLMIntegration } from './LLMIntegration.js';
import { BehaviorPatterns } from './BehaviorPatterns.js';
import { GameConfig } from '../config.js';

export class AIBossController {
    constructor(boss, gameState) {
        this.boss = boss;
        this.gameState = gameState;
        this.llm = new LLMIntegration();
        this.patterns = new BehaviorPatterns();
        
        // AI state
        this.currentPattern = null;
        this.patternTimer = 0;
        this.decisionCooldown = 0;
        this.lastDecision = null;
        
        // Player analysis
        this.playerTracker = {
            position: { x: 0, y: 0 },
            lastPositions: [],
            movementPattern: 'neutral',
            accuracy: 0.5,
            aggressiveness: 0.5
        };
        
        // Boss state
        this.bossState = {
            health: boss.health,
            maxHealth: boss.maxHealth,
            phase: 1,
            enraged: false,
            lastDamageTime: 0
        };
        
        // AI configuration
        this.config = {
            updateInterval: GameConfig.ai.updateInterval,
            maxHistoryLength: 10,
            adaptiveThreshold: 0.3,
            personalityWeight: 0.7
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize LLM connection
            await this.llm.init();
            
            // Set initial behavior pattern
            this.currentPattern = this.getInitialPattern();
            
            console.log(`🤖 AI Boss Controller initialized for ${this.boss.name}`);
        } catch (error) {
            console.warn('AI initialization failed, using fallback behaviors:', error);
            this.useFallbackMode();
        }
    }
    
    update(deltaTime, playerPosition, gameEvents) {
        // Update timers
        this.patternTimer += deltaTime;
        this.decisionCooldown -= deltaTime;
        
        // Track player behavior
        this.updatePlayerTracking(playerPosition, gameEvents);
        
        // Update boss state
        this.updateBossState();
        
        // Make AI decisions
        if (this.shouldMakeDecision()) {
            this.makeAIDecision();
        }
        
        // Execute current pattern
        this.executeCurrentPattern(deltaTime);
        
        // Handle phase transitions
        this.checkPhaseTransition();
    }
    
    updatePlayerTracking(position, events) {
        // Update position history
        this.playerTracker.lastPositions.push({
            x: position.x,
            y: position.y,
            time: Date.now()
        });
        
        // Keep only recent positions
        if (this.playerTracker.lastPositions.length > this.config.maxHistoryLength) {
            this.playerTracker.lastPositions.shift();
        }
        
        // Analyze movement pattern
        this.analyzeMovementPattern();
        
        // Track player performance
        this.updatePlayerStats(events);
        
        this.playerTracker.position = position;
    }
    
    analyzeMovementPattern() {
        if (this.playerTracker.lastPositions.length < 3) return;
        
        const positions = this.playerTracker.lastPositions;
        const recent = positions.slice(-3);
        
        // Calculate movement vectors
        const movements = [];
        for (let i = 1; i < recent.length; i++) {
            movements.push({
                dx: recent[i].x - recent[i-1].x,
                dy: recent[i].y - recent[i-1].y
            });
        }
        
        // Determine pattern
        const avgMovement = movements.reduce((acc, mov) => ({
            dx: acc.dx + mov.dx / movements.length,
            dy: acc.dy + mov.dy / movements.length
        }), { dx: 0, dy: 0 });
        
        const speed = Math.sqrt(avgMovement.dx ** 2 + avgMovement.dy ** 2);
        
        if (speed < 1) {
            this.playerTracker.movementPattern = 'stationary';
        } else if (Math.abs(avgMovement.dx) > Math.abs(avgMovement.dy) * 2) {
            this.playerTracker.movementPattern = 'horizontal';
        } else if (Math.abs(avgMovement.dy) > Math.abs(avgMovement.dx) * 2) {
            this.playerTracker.movementPattern = 'vertical';
        } else {
            this.playerTracker.movementPattern = 'diagonal';
        }
    }
    
    updatePlayerStats(events) {
        if (events.playerFired) {
            // Track accuracy
            if (events.playerHit) {
                this.playerTracker.accuracy = Math.min(1.0, this.playerTracker.accuracy + 0.05);
            } else {
                this.playerTracker.accuracy = Math.max(0.0, this.playerTracker.accuracy - 0.02);
            }
        }
        
        // Track aggressiveness based on fire rate
        if (events.playerFired) {
            this.playerTracker.aggressiveness = Math.min(1.0, this.playerTracker.aggressiveness + 0.03);
        } else {
            this.playerTracker.aggressiveness = Math.max(0.0, this.playerTracker.aggressiveness - 0.01);
        }
    }
    
    updateBossState() {
        const healthPercent = this.boss.health / this.boss.maxHealth;
        
        // Update phase based on health
        if (healthPercent > 0.66) {
            this.bossState.phase = 1;
        } else if (healthPercent > 0.33) {
            this.bossState.phase = 2;
        } else {
            this.bossState.phase = 3;
        }
        
        // Check if boss should be enraged
        this.bossState.enraged = healthPercent < 0.25;
        
        // Track damage timing
        if (this.boss.health < this.bossState.health) {
            this.bossState.lastDamageTime = Date.now();
            this.bossState.health = this.boss.health;
        }
    }
    
    shouldMakeDecision() {
        // Decision conditions
        const timeBased = this.decisionCooldown <= 0;
        const healthBased = this.boss.health !== this.bossState.health;
        const patternComplete = this.patternTimer > this.currentPattern?.duration || 5000;
        const playerBehaviorChange = this.hasPlayerBehaviorChanged();
        
        return timeBased && (healthBased || patternComplete || playerBehaviorChange);
    }
    
    hasPlayerBehaviorChanged() {
        // Simple heuristic: if player position has changed significantly
        const lastDecisionPos = this.lastDecision?.playerPosition;
        if (!lastDecisionPos) return false;
        
        const distance = Math.sqrt(
            (this.playerTracker.position.x - lastDecisionPos.x) ** 2 +
            (this.playerTracker.position.y - lastDecisionPos.y) ** 2
        );
        
        return distance > 100; // Threshold for "significant" movement
    }
    
    async makeAIDecision() {
        try {
            this.decisionCooldown = this.config.updateInterval;
            
            // Gather context for AI
            const context = this.buildAIContext();
            
            // Get AI decision
            let decision;
            if (this.llm.isAvailable()) {
                decision = await this.llm.getBossDecision(context);
            } else {
                decision = this.getFallbackDecision(context);
            }
            
            // Apply decision
            this.applyAIDecision(decision);
            
            // Store decision for analysis
            this.lastDecision = {
                ...decision,
                timestamp: Date.now(),
                playerPosition: { ...this.playerTracker.position }
            };
            
            if (GameConfig.debug.showAIDecisions) {
                console.log('🧠 AI Decision:', decision);
            }
            
        } catch (error) {
            console.warn('AI decision failed, using fallback:', error);
            this.applyFallbackDecision();
        }
    }
    
    buildAIContext() {
        return {
            // Boss information
            boss: {
                name: this.boss.name,
                health: this.boss.health,
                maxHealth: this.boss.maxHealth,
                healthPercent: this.boss.health / this.boss.maxHealth,
                position: this.boss.position,
                phase: this.bossState.phase,
                enraged: this.bossState.enraged,
                personality: this.boss.aiPersonality
            },
            
            // Player information
            player: {
                position: this.playerTracker.position,
                movementPattern: this.playerTracker.movementPattern,
                accuracy: this.playerTracker.accuracy,
                aggressiveness: this.playerTracker.aggressiveness,
                distance: this.calculatePlayerDistance()
            },
            
            // Game state
            game: {
                difficulty: this.gameState.difficulty,
                level: this.gameState.level,
                score: this.gameState.score,
                timeElapsed: this.gameState.timeElapsed
            },
            
            // Available patterns
            availablePatterns: this.boss.attackPatterns,
            currentPattern: this.currentPattern?.name,
            patternTimer: this.patternTimer
        };
    }
    
    calculatePlayerDistance() {
        const dx = this.playerTracker.position.x - this.boss.position.x;
        const dy = this.playerTracker.position.y - this.boss.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    applyAIDecision(decision) {
        // Set new attack pattern
        if (decision.attackPattern && this.boss.attackPatterns.includes(decision.attackPattern)) {
            this.currentPattern = this.patterns.getPattern(decision.attackPattern, this.boss);
            this.patternTimer = 0;
        }
        
        // Adjust boss movement
        if (decision.movement) {
            this.boss.setMovementTarget(decision.movement.target);
            this.boss.setSpeed(decision.movement.speed || this.boss.baseSpeed);
        }
        
        // Special actions
        if (decision.specialAction) {
            this.executeSpecialAction(decision.specialAction);
        }
        
        // Adaptive difficulty
        if (decision.adaptDifficulty) {
            this.adaptDifficulty(decision.adaptDifficulty);
        }
    }
    
    getFallbackDecision(context) {
        // Rule-based fallback decisions
        const healthPercent = context.boss.healthPercent;
        const playerDistance = context.player.distance;
        const phase = context.boss.phase;
        
        let attackPattern = 'straight';
        
        // Health-based decisions
        if (healthPercent < 0.25) {
            attackPattern = 'spiral'; // Desperate attack
        } else if (healthPercent < 0.5) {
            attackPattern = 'spread'; // Aggressive attack
        }
        
        // Distance-based adjustments
        if (playerDistance < 100) {
            attackPattern = 'mines'; // Close range
        } else if (playerDistance > 300) {
            attackPattern = 'homing'; // Long range
        }
        
        // Phase-based patterns
        if (phase === 3) {
            attackPattern = 'storm'; // Final phase
        }
        
        return {
            attackPattern,
            movement: {
                target: this.calculateOptimalPosition(context),
                speed: this.boss.baseSpeed * (1 + healthPercent * 0.5)
            },
            reasoning: 'Fallback rule-based decision'
        };
    }
    
    calculateOptimalPosition(context) {
        const canvas = GameConfig.canvas;
        const playerPos = context.player.position;
        
        // Stay away from player but maintain attack angle
        const targetX = playerPos.x < canvas.width / 2 ? canvas.width * 0.8 : canvas.width * 0.2;
        const targetY = Math.max(50, Math.min(canvas.height * 0.3, playerPos.y - 100));
        
        return { x: targetX, y: targetY };
    }
    
    applyFallbackDecision() {
        const fallbackPatterns = GameConfig.ai.fallbackBehaviors;
        const pattern = fallbackPatterns[`pattern${this.bossState.phase}`] || fallbackPatterns.pattern1;
        const randomPattern = pattern[Math.floor(Math.random() * pattern.length)];
        
        this.currentPattern = this.patterns.getPattern(randomPattern, this.boss);
        this.patternTimer = 0;
    }
    
    executeCurrentPattern(deltaTime) {
        if (!this.currentPattern) return;
        
        this.currentPattern.execute(deltaTime, this.boss, this.playerTracker.position);
        
        // Check if pattern is complete
        if (this.patternTimer >= this.currentPattern.duration) {
            this.currentPattern = null;
        }
    }
    
    executeSpecialAction(action) {
        switch (action.type) {
            case 'teleport':
                this.boss.teleport(action.position);
                break;
            case 'shield':
                this.boss.activateShield(action.duration);
                break;
            case 'heal':
                this.boss.heal(action.amount);
                break;
            case 'summon':
                this.boss.summonMinions(action.count);
                break;
            case 'rage':
                this.boss.activateRage(action.multiplier);
                break;
        }
    }
    
    adaptDifficulty(adaptation) {
        // Increase difficulty if player is doing too well
        if (adaptation.increase && this.playerTracker.accuracy > 0.8) {
            this.boss.damageMultiplier *= 1.1;
            this.boss.speedMultiplier *= 1.05;
        }
        
        // Decrease difficulty if player is struggling
        if (adaptation.decrease && this.playerTracker.accuracy < 0.3) {
            this.boss.damageMultiplier *= 0.95;
            this.boss.speedMultiplier *= 0.98;
        }
    }
    
    checkPhaseTransition() {
        const oldPhase = this.bossState.phase;
        this.updateBossState();
        
        if (this.bossState.phase !== oldPhase) {
            this.onPhaseTransition(oldPhase, this.bossState.phase);
        }
    }
    
    onPhaseTransition(oldPhase, newPhase) {
        console.log(`🔄 Boss phase transition: ${oldPhase} → ${newPhase}`);
        
        // Force new AI decision on phase change
        this.decisionCooldown = 0;
        
        // Phase-specific behaviors
        switch (newPhase) {
            case 2:
                this.boss.activatePhase2();
                break;
            case 3:
                this.boss.activatePhase3();
                break;
        }
    }
    
    getInitialPattern() {
        const patterns = this.boss.attackPatterns;
        const initialPattern = patterns[0] || 'straight';
        return this.patterns.getPattern(initialPattern, this.boss);
    }
    
    useFallbackMode() {
        console.log('🤖 Using fallback AI behaviors');
        this.llm.setAvailable(false);
        this.currentPattern = this.getInitialPattern();
    }
    
    // Public methods for external interaction
    takeDamage(amount, source) {
        // React to taking damage
        this.bossState.lastDamageTime = Date.now();
        
        // Immediate reaction pattern
        if (amount > this.boss.maxHealth * 0.1) {
            // Significant damage, react aggressively
            this.decisionCooldown = 0;
        }
    }
    
    getDebugInfo() {
        return {
            currentPattern: this.currentPattern?.name,
            patternTimer: this.patternTimer,
            phase: this.bossState.phase,
            enraged: this.bossState.enraged,
            playerPattern: this.playerTracker.movementPattern,
            playerAccuracy: this.playerTracker.accuracy,
            aiAvailable: this.llm.isAvailable()
        };
    }
    
    destroy() {
        // Cleanup
        this.llm.cleanup();
        this.currentPattern = null;
        this.playerTracker = null;
    }
}