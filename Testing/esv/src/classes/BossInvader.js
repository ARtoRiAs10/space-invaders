// Enhanced Boss Invader with AI Integration
// This class represents AI-powered boss enemies with dynamic behavior

import { AIBossController } from '../ai/AIBossController.js';
import { GameConfig } from '../config.js';
import { Particle } from './Particle.js';
import { InvaderProjectile } from './InvaderProjectile.js';

export class BossInvader {
    constructor({ position, level, canvas }) {
        // Get boss configuration for this level
        const bossConfig = GameConfig.bosses[level] || GameConfig.bosses[1];
        
        // Basic properties
        this.position = { ...position };
        this.level = level;
        this.canvas = canvas;
        this.name = bossConfig.name;
        
        // Health and damage
        this.maxHealth = bossConfig.health;
        this.health = this.maxHealth;
        this.isAlive = true;
        
        // Movement
        this.velocity = { x: 0, y: 0 };
        this.baseSpeed = bossConfig.speed;
        this.speed = this.baseSpeed;
        this.speedMultiplier = 1.0;
        
        // Dimensions
        this.width = bossConfig.width;
        this.height = bossConfig.height;
        
        // Combat
        this.attackPatterns = bossConfig.attackPatterns;
        this.aiPersonality = bossConfig.aiPersonality;
        this.damageMultiplier = 1.0;
        this.lastAttackTime = 0;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        
        // Visual effects
        this.opacity = 1;
        this.rotation = 0;
        this.scale = 1;
        this.flashTimer = 0;
        this.particles = [];
        
        // Special abilities
        this.shield = {
            active: false,
            health: 0,
            maxHealth: 100,
            regeneration: 1
        };
        this.rage = {
            active: false,
            multiplier: 1.0,
            duration: 0
        };
        this.teleportCooldown = 0;
        
        // Phase system
        this.currentPhase = 1;
        this.phaseTransitions = [0.66, 0.33]; // Health percentages for phase changes
        
        // Score value
        this.scoreValue = bossConfig.score;
        
        // AI Controller
        this.aiController = null;
        
        // Image loading
        this.image = new Image();
        this.imageLoaded = false;
        this.loadImage(level);
        
        // Initialize AI
        this.initializeAI();
    }
    
    loadImage(level) {
        this.image.src = `./public/assets/images/boss${level}.png`;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
        
        // Fallback to default boss image
        this.image.onerror = () => {
            this.image.src = './public/assets/images/boss1.png';
            this.image.onload = () => {
                this.imageLoaded = true;
            };
        };
    }
    
    async initializeAI() {
        try {
            // Create AI controller with game state context
            const gameState = {
                level: this.level,
                difficulty: GameConfig.difficulty,
                score: 0,
                timeElapsed: 0
            };
            
            this.aiController = new AIBossController(this, gameState);
            
            console.log(`🤖 AI initialized for boss: ${this.name}`);
        } catch (error) {
            console.warn('Failed to initialize AI for boss:', error);
        }
    }
    
    update(deltaTime, playerPosition, gameEvents, projectiles) {
        if (!this.isAlive) return;
        
        // Update timers
        this.updateTimers(deltaTime);
        
        // Update AI controller
        if (this.aiController) {
            this.aiController.update(deltaTime, playerPosition, gameEvents);
        }
        
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update special abilities
        this.updateSpecialAbilities(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Check boundaries
        this.checkBoundaries();
        
        // Update phase
        this.updatePhase();
        
        // Handle attacks
        this.handleAttacks(deltaTime, projectiles);
    }
    
    updateTimers(deltaTime) {
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
            this.invulnerable = this.invulnerabilityTime > 0;
        }
        
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }
        
        if (this.teleportCooldown > 0) {
            this.teleportCooldown -= deltaTime;
        }
        
        if (this.rage.duration > 0) {
            this.rage.duration -= deltaTime;
            if (this.rage.duration <= 0) {
                this.deactivateRage();
            }
        }
    }
    
    updateMovement(deltaTime) {
        // Apply velocity
        this.position.x += this.velocity.x * deltaTime * 0.016; // 60fps normalization
        this.position.y += this.velocity.y * deltaTime * 0.016;
        
        // Apply rotation and scale effects
        if (this.rage.active) {
            this.rotation += 0.02;
            this.scale = 1.0 + Math.sin(Date.now() * 0.01) * 0.1;
        } else {
            this.rotation *= 0.95; // Damping
            this.scale = 1.0;
        }
    }
    
    updateSpecialAbilities(deltaTime) {
        // Shield regeneration
        if (this.shield.active && this.shield.health < this.shield.maxHealth) {
            this.shield.health += this.shield.regeneration * deltaTime * 0.016;
            this.shield.health = Math.min(this.shield.health, this.shield.maxHealth);
        }
        
        // Rage effects
        if (this.rage.active) {
            this.damageMultiplier = this.rage.multiplier;
            this.speedMultiplier = this.rage.multiplier * 0.8;
        } else {
            this.damageMultiplier = 1.0;
            this.speedMultiplier = 1.0;
        }
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);
            
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    checkBoundaries() {
        const margin = 50;
        
        if (this.position.x < margin) {
            this.position.x = margin;
            this.velocity.x = Math.abs(this.velocity.x);
        } else if (this.position.x + this.width > this.canvas.width - margin) {
            this.position.x = this.canvas.width - this.width - margin;
            this.velocity.x = -Math.abs(this.velocity.x);
        }
        
        if (this.position.y < margin) {
            this.position.y = margin;
            this.velocity.y = Math.abs(this.velocity.y);
        } else if (this.position.y + this.height > this.canvas.height * 0.5) {
            this.position.y = this.canvas.height * 0.5 - this.height;
            this.velocity.y = -Math.abs(this.velocity.y);
        }
    }
    
    updatePhase() {
        const healthPercent = this.health / this.maxHealth;
        const newPhase = healthPercent > 0.66 ? 1 : healthPercent > 0.33 ? 2 : 3;
        
        if (newPhase !== this.currentPhase) {
            this.onPhaseChange(this.currentPhase, newPhase);
            this.currentPhase = newPhase;
        }
    }
    
    onPhaseChange(oldPhase, newPhase) {
        console.log(`Boss ${this.name} entering phase ${newPhase}`);
        
        // Phase-specific effects
        switch (newPhase) {
            case 2:
                this.activatePhase2();
                break;
            case 3:
                this.activatePhase3();
                break;
        }
        
        // Create visual effect
        this.createPhaseTransitionEffect();
    }
    
    activatePhase2() {
        // Increase attack speed and add shield
        this.baseSpeed *= 1.2;
        this.activateShield(300);
        this.createParticleExplosion('yellow');
    }
    
    activatePhase3() {
        // Final phase - maximum difficulty
        this.baseSpeed *= 1.5;
        this.activateRage(2.0, 10000); // 10 seconds of rage
        this.createParticleExplosion('red');
    }
    
    handleAttacks(deltaTime, projectiles) {
        // This would be controlled by AI patterns
        // The actual attack execution is handled by the AI controller
    }
    
    // Combat methods
    takeDamage(amount, source) {
        if (this.invulnerable || !this.isAlive) return false;
        
        let actualDamage = amount;
        
        // Shield absorption
        if (this.shield.active && this.shield.health > 0) {
            if (this.shield.health >= actualDamage) {
                this.shield.health -= actualDamage;
                actualDamage = 0;
            } else {
                actualDamage -= this.shield.health;
                this.shield.health = 0;
                this.shield.active = false;
            }
        }
        
        // Apply remaining damage
        if (actualDamage > 0) {
            this.health -= actualDamage;
            this.flashTimer = 200; // Flash effect duration
            
            // Create damage particles
            this.createDamageParticles(actualDamage);
            
            // Inform AI controller
            if (this.aiController) {
                this.aiController.takeDamage(actualDamage, source);
            }
        }
        
        // Check if boss is defeated
        if (this.health <= 0) {
            this.destroy();
        }
        
        return true;
    }
    
    shoot(projectiles, pattern = 'straight') {
        const now = Date.now();
        if (now - this.lastAttackTime < 500) return; // Attack cooldown
        
        this.lastAttackTime = now;
        
        switch (pattern) {
            case 'straight':
                this.shootStraight(projectiles);
                break;
            case 'spread':
                this.shootSpread(projectiles);
                break;
            case 'spiral':
                this.shootSpiral(projectiles);
                break;
            case 'homing':
                this.shootHoming(projectiles);
                break;
            case 'laser':
                this.shootLaser(projectiles);
                break;
            case 'mines':
                this.shootMines(projectiles);
                break;
            default:
                this.shootStraight(projectiles);
        }
    }
    
    shootStraight(projectiles) {
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height;
        
        projectiles.push(new InvaderProjectile({
            position: { x: centerX, y: centerY },
            velocity: { x: 0, y: 5 * this.damageMultiplier },
            damage: 2 * this.damageMultiplier
        }));
    }
    
    shootSpread(projectiles) {
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height;
        const angles = [-30, 0, 30];
        
        angles.forEach(angle => {
            const radians = angle * Math.PI / 180;
            const vx = Math.sin(radians) * 5 * this.damageMultiplier;
            const vy = Math.cos(radians) * 5 * this.damageMultiplier;
            
            projectiles.push(new InvaderProjectile({
                position: { x: centerX, y: centerY },
                velocity: { x: vx, y: vy },
                damage: 1.5 * this.damageMultiplier
            }));
        });
    }
    
    shootSpiral(projectiles) {
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height;
        const time = Date.now() * 0.01;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i * 45) + time;
            const radians = angle * Math.PI / 180;
            const vx = Math.cos(radians) * 4 * this.damageMultiplier;
            const vy = Math.sin(radians) * 4 * this.damageMultiplier;
            
            projectiles.push(new InvaderProjectile({
                position: { x: centerX, y: centerY },
                velocity: { x: vx, y: vy },
                damage: 1 * this.damageMultiplier
            }));
        }
    }
    
    // Special abilities
    activateShield(health) {
        this.shield.active = true;
        this.shield.health = health;
        this.shield.maxHealth = health;
        console.log(`${this.name} activated shield (${health} HP)`);
    }
    
    activateRage(multiplier, duration) {
        this.rage.active = true;
        this.rage.multiplier = multiplier;
        this.rage.duration = duration;
        console.log(`${this.name} activated rage (${multiplier}x for ${duration}ms)`);
    }
    
    deactivateRage() {
        this.rage.active = false;
        this.rage.multiplier = 1.0;
        console.log(`${this.name} rage ended`);
    }
    
    teleport(targetPosition) {
        if (this.teleportCooldown > 0) return false;
        
        // Create teleport effect at current position
        this.createTeleportEffect(this.position);
        
        // Move to new position
        this.position.x = targetPosition.x;
        this.position.y = targetPosition.y;
        
        // Create teleport effect at new position
        this.createTeleportEffect(this.position);
        
        // Set cooldown
        this.teleportCooldown = 3000; // 3 seconds
        
        console.log(`${this.name} teleported to (${targetPosition.x}, ${targetPosition.y})`);
        return true;
    }
    
    heal(amount) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        const actualHeal = this.health - oldHealth;
        
        if (actualHeal > 0) {
            this.createHealParticles(actualHeal);
            console.log(`${this.name} healed for ${actualHeal} HP`);
        }
        
        return actualHeal;
    }
    
    // Movement control for AI
    setMovementTarget(target) {
        const canvas = GameConfig.canvas;
        let targetPos;
        
        switch (target) {
            case 'left':
                targetPos = { x: canvas.width * 0.2, y: this.position.y };
                break;
            case 'right':
                targetPos = { x: canvas.width * 0.8, y: this.position.y };
                break;
            case 'center':
                targetPos = { x: canvas.width * 0.5, y: this.position.y };
                break;
            case 'player':
                // This would need player position passed in
                targetPos = { x: canvas.width * 0.5, y: this.position.y };
                break;
            default:
                return;
        }
        
        // Calculate velocity to reach target
        const dx = targetPos.x - this.position.x;
        const dy = targetPos.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 10) {
            this.velocity.x = (dx / distance) * this.speed * this.speedMultiplier;
            this.velocity.y = (dy / distance) * this.speed * this.speedMultiplier;
        } else {
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
    }
    
    setSpeed(speed) {
        this.speed = speed;
    }
    
    // Visual effects
    createDamageParticles(damage) {
        const count = Math.min(10, Math.floor(damage / 5) + 3);
        
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle({
                position: {
                    x: this.position.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                    y: this.position.y + this.height / 2 + (Math.random() - 0.5) * this.height
                },
                velocity: {
                    x: (Math.random() - 0.5) * 4,
                    y: (Math.random() - 0.5) * 4
                },
                radius: Math.random() * 3 + 1,
                color: '#ff4444',
                life: 60,
                fades: true
            }));
        }
    }
    
    createHealParticles(amount) {
        const count = Math.floor(amount / 10) + 5;
        
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height / 2
                },
                velocity: {
                    x: (Math.random() - 0.5) * 2,
                    y: -Math.random() * 3 - 1
                },
                radius: Math.random() * 2 + 1,
                color: '#44ff44',
                life: 90,
                fades: true
            }));
        }
    }
    
    createTeleportEffect(position) {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle({
                position: {
                    x: position.x + this.width / 2,
                    y: position.y + this.height / 2
                },
                velocity: {
                    x: (Math.random() - 0.5) * 8,
                    y: (Math.random() - 0.5) * 8
                },
                radius: Math.random() * 4 + 2,
                color: '#8844ff',
                life: 30,
                fades: true
            }));
        }
    }
    
    createPhaseTransitionEffect() {
        this.createParticleExplosion('white');
        this.flashTimer = 1000; // Long flash for phase transition
    }
    
    createParticleExplosion(color) {
        for (let i = 0; i < 30; i++) {
            this.particles.push(new Particle({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height / 2
                },
                velocity: {
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 10
                },
                radius: Math.random() * 5 + 2,
                color: color,
                life: 60,
                fades: true
            }));
        }
    }
    
    // Rendering
    draw(ctx) {
        if (!this.imageLoaded) {
            this.drawPlaceholder(ctx);
            return;
        }
        
        ctx.save();
        
        // Apply flash effect
        if (this.flashTimer > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(this.flashTimer * 0.5) * 0.5;
        } else {
            ctx.globalAlpha = this.opacity;
        }
        
        // Apply transformations
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        // Draw boss
        ctx.drawImage(
            this.image,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );
        
        ctx.restore();
        
        // Draw shield
        if (this.shield.active && this.shield.health > 0) {
            this.drawShield(ctx);
        }
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(ctx));
        
        // Draw health bar
        this.drawHealthBar(ctx);
        
        // Debug info
        if (GameConfig.debug.showCollisionBoxes) {
            this.drawDebugInfo(ctx);
        }
    }
    
    drawPlaceholder(ctx) {
        // Draw a placeholder rectangle while image loads
        ctx.fillStyle = '#8844ff';
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        
        // Draw boss name
        ctx.fillStyle = 'white';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.name,
            this.position.x + this.width / 2,
            this.position.y + this.height / 2
        );
    }
    
    drawShield(ctx) {
        const shieldRadius = Math.max(this.width, this.height) * 0.6;
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        
        ctx.save();
        ctx.globalAlpha = 0.3 + (this.shield.health / this.shield.maxHealth) * 0.4;
        ctx.strokeStyle = '#44ddff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    
    drawHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 8;
        const barX = this.position.x;
        const barY = this.position.y - 15;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : 
                       healthPercent > 0.25 ? '#ffff44' : '#ff4444';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#666666';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    drawDebugInfo(ctx) {
        // Collision box
        ctx.strokeStyle = '#ff0000';
        ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
        
        // AI info
        if (this.aiController) {
            const debugInfo = this.aiController.getDebugInfo();
            ctx.fillStyle = 'white';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            
            const infoText = [
                `Pattern: ${debugInfo.currentPattern}`,
                `Phase: ${debugInfo.phase}`,
                `AI: ${debugInfo.aiAvailable ? 'ON' : 'OFF'}`
            ];
            
            infoText.forEach((text, i) => {
                ctx.fillText(text, this.position.x, this.position.y - 30 + (i * 15));
            });
        }
    }
    
    // Collision detection
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
    }
    
    // Destruction
    destroy() {
        this.isAlive = false;
        this.createDeathExplosion();
        
        if (this.aiController) {
            this.aiController.destroy();
        }
        
        console.log(`💀 Boss ${this.name} destroyed`);
    }
    
    createDeathExplosion() {
        // Create massive particle explosion
        for (let i = 0; i < 50; i++) {
            this.particles.push(new Particle({
                position: {
                    x: this.position.x + Math.random() * this.width,
                    y: this.position.y + Math.random() * this.height
                },
                velocity: {
                    x: (Math.random() - 0.5) * 15,
                    y: (Math.random() - 0.5) * 15
                },
                radius: Math.random() * 8 + 3,
                color: ['#ff4444', '#ff8844', '#ffff44', '#ffffff'][Math.floor(Math.random() * 4)],
                life: 120,
                fades: true
            }));
        }
    }
    
    // Getters for game state
    getHealthPercent() {
        return this.health / this.maxHealth;
    }
    
    isDefeated() {
        return !this.isAlive;
    }
    
    getScoreValue() {
        return this.scoreValue;
    }
    
    getName() {
        return this.name;
    }
    
    getCurrentPhase() {
        return this.currentPhase;
    }
}