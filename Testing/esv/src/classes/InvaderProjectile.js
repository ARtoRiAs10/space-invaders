// Enemy Projectile System
// Handles projectiles fired by invaders with AI targeting and special effects

import { Projectile } from './Projectile.js';
import { Particle } from './Particle.js';
import { GameConfig } from '../config.js';

export class InvaderProjectile extends Projectile {
    constructor({ position, velocity, damage = 1, color = '#ff4444', type = 'basic', invaderType = 'basic', level = 1, target = null }) {
        // Initialize base projectile
        super({
            position,
            velocity,
            damage,
            color,
            owner: 'enemy',
            type,
            special: null
        });
        
        // Enemy-specific properties
        this.invaderType = invaderType;
        this.level = level;
        this.originalTarget = target;
        
        // AI targeting
        this.targetingMode = 'straight'; // straight, predictive, homing, area
        this.predictionAccuracy = 0.5; // How well it predicts player movement
        this.trackingStrength = 0;
        
        // Enemy projectile behaviors
        this.splitCount = 0; // Number of times it can split
        this.childProjectiles = [];
        this.magneticPull = false;
        this.phaseAbility = false;
        this.reflectable = true; // Can player reflect this back?
        
        // Visual enhancements
        this.enemyGlow = true;
        this.warningPhase = false;
        this.warningDuration = 0;
        
        // Difficulty scaling
        this.difficultyMultiplier = 1 + (level - 1) * 0.15;
        
        // Setup based on invader type
        this.setupInvaderProjectile();
        
        // Apply difficulty scaling
        this.applyDifficultyScaling();
    }
    
    setupInvaderProjectile() {
        const projectileConfigs = {
            basic: {
                damage: 1,
                color: '#ff4444',
                speed: 3,
                targetingMode: 'straight',
                width: 4,
                height: 10,
                trailEnabled: false,
                glowEffect: true
            },
            
            fast: {
                damage: 1,
                color: '#ff8844',
                speed: 4.5,
                targetingMode: 'predictive',
                width: 3,
                height: 12,
                trailEnabled: true,
                glowEffect: true,
                predictionAccuracy: 0.7
            },
            
            armored: {
                damage: 2,
                color: '#4444ff',
                speed: 2.5,
                targetingMode: 'straight',
                width: 6,
                height: 8,
                trailEnabled: false,
                glowEffect: true,
                piercing: true
            },
            
            quantum: {
                damage: 1.5,
                color: '#ff44ff',
                speed: 4,
                targetingMode: 'homing',
                width: 5,
                height: 10,
                trailEnabled: true,
                glowEffect: true,
                phaseAbility: true,
                trackingStrength: 0.08
            },
            
            supreme: {
                damage: 2.5,
                color: '#ffff44',
                speed: 5,
                targetingMode: 'area',
                width: 8,
                height: 12,
                trailEnabled: true,
                glowEffect: true,
                splitCount: 2,
                explosionRadius: 25
            }
        };
        
        const config = projectileConfigs[this.invaderType] || projectileConfigs.basic;
        
        // Apply configuration
        Object.keys(config).forEach(key => {
            this[key] = config[key];
        });
        
        // Adjust velocity based on speed
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (currentSpeed > 0) {
            const speedRatio = config.speed / currentSpeed;
            this.velocity.x *= speedRatio;
            this.velocity.y *= speedRatio;
        }
        
        // Set up targeting
        this.setupTargeting();
        
        // Initialize special abilities
        this.initializeSpecialAbilities();
    }
    
    setupTargeting() {
        if (!this.originalTarget) return;
        
        switch (this.targetingMode) {
            case 'predictive':
                this.calculatePredictiveTarget();
                break;
                
            case 'homing':
                this.target = this.originalTarget;
                this.homingStrength = this.trackingStrength;
                break;
                
            case 'area':
                this.calculateAreaTarget();
                break;
                
            default: // straight
                // Keep original velocity
                break;
        }
    }
    
    calculatePredictiveTarget() {
        if (!this.originalTarget || !this.originalTarget.velocity) return;
        
        const target = this.originalTarget;
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Predict where target will be
        const timeToTarget = distance / this.speed;
        const predictedX = target.position.x + target.velocity.x * timeToTarget * this.predictionAccuracy;
        const predictedY = target.position.y + target.velocity.y * timeToTarget * this.predictionAccuracy;
        
        // Adjust velocity to hit predicted position
        const newDx = predictedX - this.position.x;
        const newDy = predictedY - this.position.y;
        const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
        
        if (newDistance > 0) {
            this.velocity.x = (newDx / newDistance) * this.speed;
            this.velocity.y = (newDy / newDistance) * this.speed;
        }
    }
    
    calculateAreaTarget() {
        if (!this.originalTarget) return;
        
        const target = this.originalTarget;
        
        // Add some randomness for area effect
        const spread = 50;
        const targetX = target.position.x + (Math.random() - 0.5) * spread;
        const targetY = target.position.y + (Math.random() - 0.5) * spread;
        
        const dx = targetX - this.position.x;
        const dy = targetY - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.velocity.x = (dx / distance) * this.speed;
            this.velocity.y = (dy / distance) * this.speed;
        }
    }
    
    initializeSpecialAbilities() {
        // Phase ability setup
        if (this.phaseAbility) {
            this.phaseTimer = 0;
            this.phaseInterval = 1000; // Phase every second
            this.phaseDuration = 500; // Phase lasts 0.5 seconds
            this.phasing = false;
        }
        
        // Warning phase for powerful projectiles
        if (this.damage >= 2) {
            this.warningPhase = true;
            this.warningDuration = 800;
            this.warningTimer = 0;
            this.originalSpeed = this.speed;
            this.speed = 0.5; // Move slowly during warning
        }
    }
    
    applyDifficultyScaling() {
        // Scale properties based on level
        this.damage = Math.ceil(this.damage * this.difficultyMultiplier);
        this.speed *= (1 + (this.level - 1) * 0.1);
        this.predictionAccuracy = Math.min(0.95, this.predictionAccuracy + (this.level - 1) * 0.05);
        
        // Higher levels get more special abilities
        if (this.level >= 3) {
            this.reflectable = false; // Can't be reflected at higher levels
        }
        
        if (this.level >= 4) {
            this.magneticPull = true;
        }
    }
    
    update(deltaTime) {
        // Update warning phase
        if (this.warningPhase) {
            this.updateWarningPhase(deltaTime);
        }
        
        // Update special abilities
        this.updateSpecialAbilities(deltaTime);
        
        // Update magnetic pull
        if (this.magneticPull) {
            this.updateMagneticPull(deltaTime);
        }
        
        // Call parent update
        super.update(deltaTime);
        
        // Update child projectiles
        this.updateChildProjectiles(deltaTime);
    }
    
    updateWarningPhase(deltaTime) {
        this.warningTimer += deltaTime;
        
        if (this.warningTimer >= this.warningDuration) {
            // End warning phase
            this.warningPhase = false;
            this.speed = this.originalSpeed;
            
            // Create warning end effect
            this.createWarningEndEffect();
        } else {
            // Pulsing effect during warning
            const pulseIntensity = Math.sin(this.warningTimer * 0.02) * 0.5 + 0.5;
            this.scale = 1 + pulseIntensity * 0.5;
            this.opacity = 0.7 + pulseIntensity * 0.3;
        }
    }
    
    updateSpecialAbilities(deltaTime) {
        // Phase ability
        if (this.phaseAbility) {
            this.phaseTimer += deltaTime;
            
            if (this.phaseTimer >= this.phaseInterval) {
                this.startPhase();
                this.phaseTimer = 0;
            }
            
            if (this.phasing && this.phaseTimer >= this.phaseDuration) {
                this.endPhase();
            }
        }
    }
    
    updateMagneticPull(deltaTime) {
        // Slightly pull toward player
        if (this.originalTarget) {
            const target = this.originalTarget;
            const dx = target.position.x - this.position.x;
            const dy = target.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < 150) {
                const pullStrength = 0.02;
                this.velocity.x += (dx / distance) * pullStrength;
                this.velocity.y += (dy / distance) * pullStrength;
            }
        }
    }
    
    updateChildProjectiles(deltaTime) {
        for (let i = this.childProjectiles.length - 1; i >= 0; i--) {
            const child = this.childProjectiles[i];
            child.update(deltaTime);
            
            if (child.isDestroyed()) {
                this.childProjectiles.splice(i, 1);
            }
        }
    }
    
    startPhase() {
        this.phasing = true;
        this.opacity = 0.3;
        this.invulnerable = true;
        
        // Create phase effect
        this.createPhaseEffect();
    }
    
    endPhase() {
        this.phasing = false;
        this.opacity = 1;
        this.invulnerable = false;
        
        // Create unphase effect
        this.createUnphaseEffect();
    }
    
    // Override collision handling
    handleCollision(target) {
        if (this.phasing || this.invulnerable) return;
        
        // Special collision effects for enemy projectiles
        if (target.owner === 'player') {
            // Hit player
            this.onPlayerHit(target);
        } else if (target.reflectable && this.reflectable) {
            // Player reflected this projectile
            this.reflect(target);
            return;
        }
        
        // Handle splitting
        if (this.splitCount > 0 && !this.hasAlreadySplit) {
            this.createSplitProjectiles();
        }
        
        // Call parent collision handling
        super.handleCollision(target);
    }
    
    onPlayerHit(player) {
        // Create impact effect
        this.createPlayerImpactEffect(player.position);
        
        // Apply special effects based on type
        switch (this.invaderType) {
            case 'quantum':
                // Quantum projectiles can cause temporary screen distortion
                this.createQuantumEffect();
                break;
                
            case 'supreme':
                // Supreme projectiles cause powerful screen shake
                if (window.game && window.game.addScreenShake) {
                    window.game.addScreenShake(8, 300);
                }
                break;
        }
    }
    
    reflect(reflector) {
        // Change ownership to player
        this.owner = 'player';
        this.color = '#00ffff'; // Change color to indicate reflection
        
        // Reverse velocity with some randomness
        this.velocity.x = -this.velocity.x + (Math.random() - 0.5) * 2;
        this.velocity.y = -this.velocity.y + (Math.random() - 0.5) * 2;
        
        // Increase damage
        this.damage *= 1.5;
        
        // Create reflection effect
        this.createReflectionEffect();
        
        // Mark as reflected so it can now hit enemies
        this.reflected = true;
    }
    
    createSplitProjectiles() {
        this.hasAlreadySplit = true;
        const splitCount = this.splitCount;
        
        for (let i = 0; i < splitCount; i++) {
            const angle = (i / splitCount) * Math.PI * 2;
            const speed = this.speed * 0.8;
            
            const childProjectile = new InvaderProjectile({
                position: { ...this.position },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                damage: Math.ceil(this.damage * 0.6),
                color: this.color,
                type: 'basic',
                invaderType: this.invaderType,
                level: this.level,
                target: this.originalTarget
            });
            
            // Child projectiles don't split further
            childProjectile.splitCount = 0;
            childProjectile.scale = 0.7;
            
            this.childProjectiles.push(childProjectile);
        }
    }
    
    // Visual effects
    createWarningEndEffect() {
        const colors = ['#ffffff', '#ffff00', this.color];
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            
            const particle = new Particle({
                position: { ...this.position },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                radius: Math.random() * 2 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 20 + Math.random() * 15,
                fades: true,
                glow: true
            });
            
            this.particles.push(particle);
        }
    }
    
    createPhaseEffect() {
        // Phase particles
        for (let i = 0; i < 6; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + (Math.random() - 0.5) * this.width,
                    y: this.position.y + (Math.random() - 0.5) * this.height
                },
                velocity: {
                    x: (Math.random() - 0.5) * 1,
                    y: (Math.random() - 0.5) * 1
                },
                radius: Math.random() + 0.5,
                color: '#ff44ff',
                life: 30 + Math.random() * 20,
                fades: true,
                type: 'energy'
            });
            
            this.particles.push(particle);
        }
    }
    
    createUnphaseEffect() {
        // Unphase flash
        const flash = new Particle({
            position: { ...this.position },
            velocity: { x: 0, y: 0 },
            radius: this.width * 2,
            color: '#ffffff',
            life: 8,
            fades: true,
            glow: true
        });
        
        this.particles.push(flash);
    }
    
    createPlayerImpactEffect(playerPosition) {
        // Enhanced impact effect when hitting player
        const impactParticles = Particle.createSparks(playerPosition, { x: 0, y: -1 }, 12);
        this.particles.push(...impactParticles);
        
        // Screen flash effect would be handled by game
        if (window.game && window.game.addScreenFlash) {
            window.game.addScreenFlash('#ff4444', 0.3, 200);
        }
    }
    
    createQuantumEffect() {
        // Quantum distortion particles
        const quantumBurst = Particle.createEnergyBurst(this.position, '#ff44ff', 10);
        this.particles.push(...quantumBurst);
    }
    
    createReflectionEffect() {
        // Reflection sparkle effect
        for (let i = 0; i < 10; i++) {
            const particle = new Particle({
                position: { ...this.position },
                velocity: {
                    x: (Math.random() - 0.5) * 3,
                    y: (Math.random() - 0.5) * 3
                },
                radius: Math.random() * 2 + 1,
                color: '#00ffff',
                life: 25 + Math.random() * 15,
                fades: true,
                glow: true
            });
            
            this.particles.push(particle);
        }
    }
    
    // Override drawing to add enemy-specific effects
    draw(ctx) {
        if (!ctx || this.destroyed) return;
        
        ctx.save();
        
        // Warning phase visual
        if (this.warningPhase) {
            this.drawWarningVisual(ctx);
        }
        
        // Phase visual
        if (this.phasing) {
            this.drawPhaseVisual(ctx);
        }
        
        // Enhanced enemy glow
        if (this.enemyGlow) {
            this.drawEnemyGlow(ctx);
        }
        
        ctx.restore();
        
        // Call parent draw
        super.draw(ctx);
        
        // Draw child projectiles
        this.childProjectiles.forEach(child => child.draw(ctx));
        
        // Draw targeting preview in debug mode
        if (GameConfig.debug.showTargeting && this.targetingMode !== 'straight') {
            this.drawTargetingDebug(ctx);
        }
    }
    
    drawWarningVisual(ctx) {
        // Pulsing warning indicator
        const pulse = Math.sin(this.warningTimer * 0.02) * 0.5 + 0.5;
        const warningRadius = this.width * 2 + pulse * 10;
        
        const gradient = ctx.createRadialGradient(
            this.position.x, this.position.y, 0,
            this.position.x, this.position.y, warningRadius
        );
        gradient.addColorStop(0, '#ff0000' + '00');
        gradient.addColorStop(0.7, '#ff0000' + '40');
        gradient.addColorStop(1, '#ff0000' + '80');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, warningRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawPhaseVisual(ctx) {
        // Ghostly phase effect
        ctx.globalAlpha = 0.3;
        
        // Draw multiple overlapping copies with slight offsets
        for (let i = 0; i < 3; i++) {
            const offsetX = Math.sin(Date.now() * 0.005 + i) * 3;
            const offsetY = Math.cos(Date.now() * 0.007 + i) * 3;
            
            ctx.fillStyle = this.color + '60';
            ctx.fillRect(
                this.position.x + offsetX - this.width / 2,
                this.position.y + offsetY - this.height / 2,
                this.width,
                this.height
            );
        }
        
        ctx.globalAlpha = 1;
    }
    
    drawEnemyGlow(ctx) {
        // Enhanced glow for enemy projectiles
        const glowRadius = this.width * 3;
        const gradient = ctx.createRadialGradient(
            this.position.x, this.position.y, 0,
            this.position.x, this.position.y, glowRadius
        );
        gradient.addColorStop(0, this.color + '60');
        gradient.addColorStop(0.5, this.color + '30');
        gradient.addColorStop(1, this.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawTargetingDebug(ctx) {
        if (!this.originalTarget) return;
        
        // Draw targeting line
        ctx.strokeStyle = '#ffff0060';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(this.originalTarget.position.x, this.originalTarget.position.y);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // Show targeting mode
        ctx.fillStyle = 'white';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.targetingMode, this.position.x, this.position.y - 15);
    }
    
    // Getters for child projectiles
    getAllProjectiles() {
        return [this, ...this.childProjectiles];
    }
    
    getActiveChildCount() {
        return this.childProjectiles.filter(child => !child.isDestroyed()).length;
    }
    
    // Static factory methods for different invader types
    static createBasicShot(invaderPosition, target = null) {
        return new InvaderProjectile({
            position: { 
                x: invaderPosition.x + 20, 
                y: invaderPosition.y + 30 
            },
            velocity: { x: 0, y: 3 },
            damage: 1,
            color: '#ff4444',
            type: 'basic',
            invaderType: 'basic',
            level: 1,
            target
        });
    }
    
    static createFastShot(invaderPosition, target, level = 1) {
        return new InvaderProjectile({
            position: { 
                x: invaderPosition.x + 20, 
                y: invaderPosition.y + 30 
            },
            velocity: { x: 0, y: 4 },
            damage: 1,
            color: '#ff8844',
            type: 'fast',
            invaderType: 'fast',
            level,
            target
        });
    }
    
    static createArmoredShot(invaderPosition, target, level = 1) {
        return new InvaderProjectile({
            position: { 
                x: invaderPosition.x + 20, 
                y: invaderPosition.y + 30 
            },
            velocity: { x: 0, y: 2.5 },
            damage: 2,
            color: '#4444ff',
            type: 'armored',
            invaderType: 'armored',
            level,
            target
        });
    }
    
    static createQuantumShot(invaderPosition, target, level = 1) {
        return new InvaderProjectile({
            position: { 
                x: invaderPosition.x + 20, 
                y: invaderPosition.y + 30 
            },
            velocity: { x: 0, y: 3.5 },
            damage: 1.5,
            color: '#ff44ff',
            type: 'quantum',
            invaderType: 'quantum',
            level,
            target
        });
    }
    
    static createSupremeShot(invaderPosition, target, level = 1) {
        return new InvaderProjectile({
            position: { 
                x: invaderPosition.x + 20, 
                y: invaderPosition.y + 30 
            },
            velocity: { x: 0, y: 4 },
            damage: 2.5,
            color: '#ffff44',
            type: 'supreme',
            invaderType: 'supreme',
            level,
            target
        });
    }
    
    // Override destroy to handle child projectiles
    destroy() {
        // Destroy child projectiles
        this.childProjectiles.forEach(child => child.destroy());
        this.childProjectiles = [];
        
        // Call parent destroy
        super.destroy();
    }
}