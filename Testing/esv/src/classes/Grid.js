// Enhanced Grid System for Managing Invader Formations
// Handles formation patterns, AI coordination, and wave management

import { Invader } from './Invader.js';
import { GameConfig } from '../config.js';

export class Grid {
    constructor(game, levelData) {
        this.game = game;
        this.levelData = levelData;
        
        // Grid properties
        this.invaders = [];
        this.formation = 'grid'; // grid, diamond, spiral, etc.
        this.rows = 5;
        this.cols = 11;
        this.spacing = { x: 60, y: 50 };
        this.position = { x: 100, y: 50 };
        
        // Movement properties
        this.velocity = { x: 50, y: 0 };
        this.moveDown = false;
        this.moveDownAmount = 40;
        this.lastMoveTime = 0;
        this.moveInterval = 1000; // milliseconds
        
        // AI coordination
        this.coordinatedBehavior = false;
        this.formationMode = 'maintain'; // maintain, scatter, attack
        this.leaderInvader = null;
        
        // Wave management
        this.currentWave = 1;
        this.totalWaves = levelData?.waveCount || 3;
        this.waveData = levelData?.enemyWaves || [];
        this.waveComplete = false;
        
        // Special abilities
        this.specialAbilities = new Map();
        this.abilityTimers = new Map();
        
        // Performance optimization
        this.visibleInvaders = [];
        this.lastVisibilityCheck = 0;
        
        // Statistics
        this.stats = {
            invadersCreated: 0,
            invadersDestroyed: 0,
            formation: this.formation,
            waveStartTime: Date.now()
        };
        
        this.initialize();
    }
    
    initialize() {
        console.log(`🔲 Initializing Grid for level ${this.levelData?.level || 1}`);
        
        // Set up first wave
        this.setupWave(1);
        
        // Initialize special abilities
        this.initializeSpecialAbilities();
        
        console.log(`✅ Grid initialized with ${this.invaders.length} invaders`);
    }
    
    setupWave(waveNumber) {
        this.currentWave = waveNumber;
        this.waveComplete = false;
        this.invaders = [];
        this.stats.waveStartTime = Date.now();
        
        const waveData = this.getWaveData(waveNumber);
        
        if (waveData) {
            this.createWaveFromData(waveData);
        } else {
            this.createDefaultWave(waveNumber);
        }
        
        // Set formation based on wave data
        this.setFormation(waveData.formation || 'grid');
        
        // Update difficulty
        this.updateDifficulty(waveNumber);
        
        console.log(`🌊 Wave ${waveNumber} setup complete`);
    }
    
    getWaveData(waveNumber) {
        return this.waveData.find(wave => wave.wave === waveNumber);
    }
    
    createWaveFromData(waveData) {
        let invaderIndex = 0;
        
        waveData.enemies.forEach(enemyGroup => {
            for (let i = 0; i < enemyGroup.count; i++) {
                const position = this.getFormationPosition(invaderIndex, enemyGroup.formation);
                
                const invader = new Invader({
                    position,
                    velocity: { x: this.velocity.x, y: this.velocity.y },
                    game: this.game,
                    type: enemyGroup.type,
                    level: this.levelData?.level || 1
                });
                
                // Apply group-specific modifications
                invader.speed *= enemyGroup.speed || 1.0;
                invader.formationRole = enemyGroup.formation;
                invader.groupIndex = i;
                
                this.invaders.push(invader);
                invaderIndex++;
            }
        });
        
        this.stats.invadersCreated = this.invaders.length;
    }
    
    createDefaultWave(waveNumber) {
        const difficulty = Math.min(waveNumber * 0.3, 2.0);
        const invaderCount = Math.floor(15 + waveNumber * 5);
        
        for (let i = 0; i < invaderCount; i++) {
            const row = Math.floor(i / this.cols);
            const col = i % this.cols;
            
            const position = {
                x: this.position.x + col * this.spacing.x,
                y: this.position.y + row * this.spacing.y
            };
            
            // Determine type based on position and difficulty
            let type = 'basic';
            if (row === 0) type = 'fast';
            else if (row === 1) type = 'armored';
            else if (waveNumber > 3 && Math.random() < 0.2) type = 'quantum';
            
            const invader = new Invader({
                position,
                velocity: { x: this.velocity.x, y: this.velocity.y },
                game: this.game,
                type,
                level: this.levelData?.level || 1
            });
            
            this.invaders.push(invader);
        }
        
        this.stats.invadersCreated = this.invaders.length;
    }
    
    getFormationPosition(index, formation = 'grid') {
        switch (formation) {
            case 'grid':
                return this.getGridPosition(index);
            case 'diamond':
                return this.getDiamondPosition(index);
            case 'spiral':
                return this.getSpiralPosition(index);
            case 'V':
                return this.getVFormationPosition(index);
            case 'circle':
                return this.getCirclePosition(index);
            case 'wall':
                return this.getWallPosition(index);
            case 'swarm':
                return this.getSwarmPosition(index);
            default:
                return this.getGridPosition(index);
        }
    }
    
    getGridPosition(index) {
        const row = Math.floor(index / this.cols);
        const col = index % this.cols;
        
        return {
            x: this.position.x + col * this.spacing.x,
            y: this.position.y + row * this.spacing.y
        };
    }
    
    getDiamondPosition(index) {
        const center = { x: this.position.x + 300, y: this.position.y + 150 };
        const radius = 100 + (index % 3) * 50;
        const angle = (index / this.invaders.length) * Math.PI * 2;
        
        return {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius * 0.6
        };
    }
    
    getSpiralPosition(index) {
        const center = { x: this.position.x + 250, y: this.position.y + 100 };
        const spiralTightness = 30;
        const angle = index * 0.5;
        const radius = angle * spiralTightness;
        
        return {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
        };
    }
    
    getVFormationPosition(index) {
        const center = { x: this.position.x + 300, y: this.position.y };
        const row = Math.floor(index / 5);
        const col = index % 5;
        const wingSpread = 80;
        
        return {
            x: center.x + (col - 2) * wingSpread + (Math.abs(col - 2) * row * 20),
            y: center.y + row * this.spacing.y
        };
    }
    
    getCirclePosition(index) {
        const center = { x: this.position.x + 300, y: this.position.y + 150 };
        const totalInvaders = Math.min(this.invaders.length, 20); // Limit for circle
        const radius = 120;
        const angle = (index / totalInvaders) * Math.PI * 2;
        
        return {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius * 0.7
        };
    }
    
    getWallPosition(index) {
        const col = index % 15; // Wide wall
        const row = Math.floor(index / 15);
        
        return {
            x: this.position.x + col * 50,
            y: this.position.y + row * 40
        };
    }
    
    getSwarmPosition(index) {
        // Random but clustered positions
        const clusterCenter = {
            x: this.position.x + 300 + (Math.random() - 0.5) * 200,
            y: this.position.y + 100 + (Math.random() - 0.5) * 100
        };
        
        const spread = 150;
        
        return {
            x: clusterCenter.x + (Math.random() - 0.5) * spread,
            y: clusterCenter.y + (Math.random() - 0.5) * spread
        };
    }
    
    setFormation(formationType) {
        this.formation = formationType;
        
        // Rearrange existing invaders if needed
        if (this.invaders.length > 0) {
            this.invaders.forEach((invader, index) => {
                const newPosition = this.getFormationPosition(index, formationType);
                invader.targetPosition = newPosition;
            });
        }
    }
    
    updateDifficulty(waveNumber) {
        // Increase speed
        this.velocity.x *= 1 + (waveNumber - 1) * 0.1;
        this.moveInterval = Math.max(300, this.moveInterval - waveNumber * 50);
        
        // Enable coordination for later waves
        this.coordinatedBehavior = waveNumber > 2;
        
        // Special abilities for advanced waves
        if (waveNumber > 3) {
            this.enableSpecialAbility('synchronized_fire');
        }
        
        if (waveNumber > 4) {
            this.enableSpecialAbility('formation_shift');
        }
    }
    
    initializeSpecialAbilities() {
        // Define available special abilities
        this.specialAbilities.set('synchronized_fire', {
            cooldown: 8000,
            duration: 3000,
            effect: this.activateSynchronizedFire.bind(this)
        });
        
        this.specialAbilities.set('formation_shift', {
            cooldown: 12000,
            duration: 2000,
            effect: this.activateFormationShift.bind(this)
        });
        
        this.specialAbilities.set('defensive_maneuver', {
            cooldown: 15000,
            duration: 5000,
            effect: this.activateDefensiveManeuver.bind(this)
        });
    }
    
    enableSpecialAbility(abilityName) {
        if (this.specialAbilities.has(abilityName)) {
            this.abilityTimers.set(abilityName, 0);
        }
    }
    
    update(deltaTime) {
        // Update invaders
        this.updateInvaders(deltaTime);
        
        // Update grid movement
        this.updateGridMovement(deltaTime);
        
        // Update coordination
        if (this.coordinatedBehavior) {
            this.updateCoordination(deltaTime);
        }
        
        // Update special abilities
        this.updateSpecialAbilities(deltaTime);
        
        // Check wave completion
        this.checkWaveCompletion();
        
        // Performance optimization
        this.updateVisibilityOptimization();
    }
    
    updateInvaders(deltaTime) {
        for (let i = this.invaders.length - 1; i >= 0; i--) {
            const invader = this.invaders[i];
            
            invader.update(deltaTime);
            
            // Remove destroyed invaders
            if (invader.isDestroyed()) {
                this.onInvaderDestroyed(invader);
                this.invaders.splice(i, 1);
                this.stats.invadersDestroyed++;
            }
        }
    }
    
    updateGridMovement(deltaTime) {
        const now = Date.now();
        
        if (now - this.lastMoveTime >= this.moveInterval) {
            this.moveGrid();
            this.lastMoveTime = now;
        }
    }
    
    moveGrid() {
        if (this.moveDown) {
            // Move all invaders down
            this.invaders.forEach(invader => {
                invader.position.y += this.moveDownAmount;
                invader.velocity.x *= -1; // Reverse horizontal direction
            });
            
            this.moveDown = false;
        } else {
            // Check if any invader hit the edge
            const hitEdge = this.invaders.some(invader => {
                return invader.position.x <= 0 || 
                       invader.position.x + invader.width >= this.game.canvas.width;
            });
            
            if (hitEdge) {
                this.moveDown = true;
                this.velocity.x *= -1;
            }
            
            // Move all invaders horizontally
            this.invaders.forEach(invader => {
                invader.velocity.x = this.velocity.x;
            });
        }
    }
    
    updateCoordination(deltaTime) {
        if (this.invaders.length === 0) return;
        
        // Select a leader if none exists
        if (!this.leaderInvader || this.leaderInvader.isDestroyed()) {
            this.selectNewLeader();
        }
        
        // Coordinate behaviors
        switch (this.formationMode) {
            case 'maintain':
                this.maintainFormation();
                break;
            case 'scatter':
                this.scatterFormation();
                break;
            case 'attack':
                this.attackFormation();
                break;
        }
    }
    
    selectNewLeader() {
        // Select the frontmost invader as leader
        this.leaderInvader = this.invaders.reduce((leader, invader) => {
            return invader.position.y > leader.position.y ? invader : leader;
        });
        
        if (this.leaderInvader) {
            this.leaderInvader.isLeader = true;
        }
    }
    
    maintainFormation() {
        // Keep invaders in their assigned positions
        this.invaders.forEach((invader, index) => {
            const targetPos = this.getFormationPosition(index, this.formation);
            const dx = targetPos.x - invader.position.x;
            const dy = targetPos.y - invader.position.y;
            
            if (Math.abs(dx) > 5) {
                invader.velocity.x += Math.sign(dx) * 0.1;
            }
            if (Math.abs(dy) > 5) {
                invader.velocity.y += Math.sign(dy) * 0.1;
            }
        });
    }
    
    scatterFormation() {
        // Break formation and spread out
        this.invaders.forEach(invader => {
            invader.velocity.x += (Math.random() - 0.5) * 0.5;
            invader.velocity.y += (Math.random() - 0.5) * 0.5;
        });
    }
    
    attackFormation() {
        // Move aggressively toward player
        const player = this.game.player;
        if (!player) return;
        
        this.invaders.forEach(invader => {
            const dx = player.position.x - invader.position.x;
            const dy = player.position.y - invader.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                invader.velocity.x += (dx / distance) * 0.2;
                invader.velocity.y += (dy / distance) * 0.1;
            }
        });
    }
    
    updateSpecialAbilities(deltaTime) {
        this.abilityTimers.forEach((timer, abilityName) => {
            timer += deltaTime;
            
            const ability = this.specialAbilities.get(abilityName);
            if (ability && timer >= ability.cooldown) {
                this.useSpecialAbility(abilityName);
                this.abilityTimers.set(abilityName, 0);
            } else {
                this.abilityTimers.set(abilityName, timer);
            }
        });
    }
    
    useSpecialAbility(abilityName) {
        const ability = this.specialAbilities.get(abilityName);
        if (ability && this.invaders.length > 0) {
            console.log(`🚀 Grid using special ability: ${abilityName}`);
            ability.effect();
        }
    }
    
    activateSynchronizedFire() {
        // All invaders fire at once
        this.invaders.forEach(invader => {
            if (Math.random() < 0.7) { // 70% of invaders participate
                invader.shoot();
            }
        });
    }
    
    activateFormationShift() {
        // Change to a new random formation
        const formations = ['diamond', 'spiral', 'V', 'circle'];
        const newFormation = formations[Math.floor(Math.random() * formations.length)];
        
        if (newFormation !== this.formation) {
            this.setFormation(newFormation);
        }
    }
    
    activateDefensiveManeuver() {
        // Temporarily scatter and increase invulnerability
        this.formationMode = 'scatter';
        
        this.invaders.forEach(invader => {
            invader.addStatusEffect('defensive', {
                duration: 3000,
                effect: () => {
                    invader.speed *= 1.5;
                    invader.invulnerabilityTime = 200;
                }
            });
        });
        
        // Return to formation after maneuver
        setTimeout(() => {
            this.formationMode = 'maintain';
        }, 5000);
    }
    
    updateVisibilityOptimization() {
        const now = Date.now();
        
        // Update visibility check every 100ms for performance
        if (now - this.lastVisibilityCheck > 100) {
            this.visibleInvaders = this.invaders.filter(invader => {
                return invader.position.x > -invader.width &&
                       invader.position.x < this.game.canvas.width &&
                       invader.position.y > -invader.height &&
                       invader.position.y < this.game.canvas.height;
            });
            
            this.lastVisibilityCheck = now;
        }
    }
    
    checkWaveCompletion() {
        if (this.invaders.length === 0 && !this.waveComplete) {
            this.waveComplete = true;
            this.onWaveComplete();
        }
    }
    
    onInvaderDestroyed(invader) {
        // Handle individual invader destruction
        if (invader === this.leaderInvader) {
            this.leaderInvader = null;
        }
        
        // Trigger reactions in nearby invaders
        if (this.coordinatedBehavior) {
            this.triggerDestructionReaction(invader);
        }
    }
    
    triggerDestructionReaction(destroyedInvader) {
        const reactionRadius = 100;
        
        this.invaders.forEach(invader => {
            const dx = invader.position.x - destroyedInvader.position.x;
            const dy = invader.position.y - destroyedInvader.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= reactionRadius) {
                // Nearby invaders become more aggressive
                invader.fireRate *= 1.2;
                invader.speed *= 1.1;
                
                // Chance to change formation
                if (Math.random() < 0.3) {
                    this.formationMode = 'attack';
                }
            }
        });
    }
    
    onWaveComplete() {
        const waveTime = Date.now() - this.stats.waveStartTime;
        
        console.log(`🌊 Wave ${this.currentWave} completed in ${waveTime}ms`);
        
        // Emit wave completion event
        const event = new CustomEvent('waveComplete', {
            detail: {
                wave: this.currentWave,
                time: waveTime,
                invadersDestroyed: this.stats.invadersDestroyed
            }
        });
        window.dispatchEvent(event);
        
        // Check if all waves complete
        if (this.currentWave >= this.totalWaves) {
            this.onAllWavesComplete();
        } else {
            // Setup next wave after delay
            setTimeout(() => {
                this.setupWave(this.currentWave + 1);
            }, 2000);
        }
    }
    
    onAllWavesComplete() {
        console.log('🏆 All waves completed!');
        
        const event = new CustomEvent('allWavesComplete', {
            detail: {
                totalWaves: this.totalWaves,
                totalTime: Date.now() - this.stats.waveStartTime
            }
        });
        window.dispatchEvent(event);
    }
    
    // Rendering
    draw(ctx) {
        // Only draw visible invaders for performance
        this.visibleInvaders.forEach(invader => {
            invader.draw(ctx);
        });
        
        // Draw formation guides in debug mode
        if (GameConfig.debug.showFormation) {
            this.drawFormationGuides(ctx);
        }
        
        // Draw grid statistics
        if (GameConfig.debug.showGridStats) {
            this.drawGridStats(ctx);
        }
    }
    
    drawFormationGuides(ctx) {
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        // Draw formation outline
        this.invaders.forEach((invader, index) => {
            const targetPos = this.getFormationPosition(index, this.formation);
            
            ctx.beginPath();
            ctx.moveTo(invader.position.x + invader.width/2, invader.position.y + invader.height/2);
            ctx.lineTo(targetPos.x + invader.width/2, targetPos.y + invader.height/2);
            ctx.stroke();
        });
        
        ctx.setLineDash([]);
    }
    
    drawGridStats(ctx) {
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        
        const stats = [
            `Wave: ${this.currentWave}/${this.totalWaves}`,
            `Invaders: ${this.invaders.length}`,
            `Formation: ${this.formation}`,
            `Mode: ${this.formationMode}`,
            `Visible: ${this.visibleInvaders.length}`
        ];
        
        stats.forEach((stat, index) => {
            ctx.fillText(stat, 10, 120 + index * 15);
        });
    }
    
    // Public API
    getInvaders() {
        return [...this.invaders];
    }
    
    getInvaderCount() {
        return this.invaders.length;
    }
    
    getCurrentWave() {
        return this.currentWave;
    }
    
    getTotalWaves() {
        return this.totalWaves;
    }
    
    isWaveComplete() {
        return this.waveComplete;
    }
    
    getAllInvadersDestroyed() {
        return this.invaders.length === 0;
    }
    
    getStats() {
        return {
            ...this.stats,
            currentInvaders: this.invaders.length,
            visibleInvaders: this.visibleInvaders.length,
            currentWave: this.currentWave,
            totalWaves: this.totalWaves
        };
    }
    
    // Control methods
    changeFormation(newFormation) {
        this.setFormation(newFormation);
    }
    
    setFormationMode(mode) {
        this.formationMode = mode;
    }
    
    forceWaveAdvance() {
        // Debug method to advance to next wave
        this.invaders = [];
        this.checkWaveCompletion();
    }
    
    // Cleanup
    destroy() {
        this.invaders.forEach(invader => {
            if (invader.destroy) {
                invader.destroy();
            }
        });
        
        this.invaders = [];
        this.visibleInvaders = [];
        this.specialAbilities.clear();
        this.abilityTimers.clear();
        
        console.log('🔲 Grid destroyed');
    }
}