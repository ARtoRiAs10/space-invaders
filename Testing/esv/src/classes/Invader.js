// Enhanced Invader Class with AI Behaviors and Visual Effects
// Extends the original invader with modern features

import { GameConfig } from '../config.js';
import { Particle } from './Particle.js';

export class Invader {
    constructor({ position, velocity, game, type = 'basic', level = 1 }) {
        // Basic properties
        this.position = { ...position };
        this.velocity = { ...velocity };
        this.originalVelocity = { ...velocity };
        this.game = game;
        
        // Type and stats
        this.type = type;
        this.level = level;
        this.setupTypeProperties();
        
        // Visual properties
        this.width = 40;
        this.height = 30;
        this.scale = 1;
        this.rotation = 0;
        this.opacity = 1;
        
        // Animation
        this.animationFrame = 0;
        this.animationSpeed = 200;
        this.lastAnimationUpdate = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        
        // Combat properties
        this.maxHealth = this.baseHealth;
        this.health = this.maxHealth;
        this.lastShotTime = 0;
        this.shotCooldown = 1500 + Math.random() * 1000;
        
        // AI properties
        this.aiState = 'patrol';
        this.targetPosition = null;
        this.pathPoints = [];
        this.currentPathIndex = 0;
        this.reactionTime = 200 + Math.random() * 300;
        this.lastPlayerPosition = null;
        
        // Status effects
        this.statusEffects = new Map();
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        
        // Visual effects
        this.particles = [];
        this.glowEffect = false;
        this.trailEffect = false;
        
        // Scoring
        this.baseScore = GameConfig.scoring.enemies[this.type] || 100;
        this.scoreMultiplier = 1 + (level - 1) * 0.2;
        
        // Collision
        this.collisionRadius = Math.min(this.width, this.height) * 0.4;
        
        // Load image
        this.image = null;
        this.loadImage();
    }
    
    setupTypeProperties() {
        const typeConfigs = {
            basic: {
                baseHealth: 1,
                speed: 1.0,
                fireRate: 0.3,
                points: 100,
                color: '#ff4444',
                behavior: 'simple'
            },
            fast: {
                baseHealth: 1,
                speed: 1.8,
                fireRate: 0.5,
                points: 150,
                color: '#ff8844',
                behavior: 'aggressive'
            },
            armored: {
                baseHealth: 3,
                speed: 0.8,
                fireRate: 0.2,
                points: 200,
                color: '#4444ff',
                behavior: 'defensive'
            },
            quantum: {
                baseHealth: 2,
                speed: 1.5,
                fireRate: 0.4,
                points: 300,
                color: '#ff44ff',
                behavior: 'unpredictable',
                special: 'phase'
            },
            supreme: {
                baseHealth: 5,
                speed: 1.2,
                fireRate: 0.6,
                points: 500,
                color: '#ffff44',
                behavior: 'tactical',
                special: 'shield'
            }
        };
        
        const config = typeConfigs[this.type] || typeConfigs.basic;
        
        // Apply level scaling
        this.baseHealth = Math.floor(config.baseHealth * (1 + (this.level - 1) * 0.3));
        this.speed = config.speed * (1 + (this.level - 1) * 0.1);
        this.fireRate = config.fireRate * (1 + (this.level - 1) * 0.15);
        this.points = Math.floor(config.points * (1 + (this.level - 1) * 0.5));
        this.color = config.color;
        this.behavior = config.behavior;
        this.special = config.special;
    }
    
    async loadImage() {
        const imagePaths = {
            basic: './public/assets/images/invader.png',
            fast: './public/assets/images/invader.png', // Could have different sprites
            armored: './public/assets/images/invader.png',
            quantum: './public/assets/images/invader.png',
            supreme: './public/assets/images/invader.png'
        };
        
        try {
            this.image = new Image();
            this.image.src = imagePaths[this.type] || imagePaths.basic;
            
            this.image.onload = () => {
                this.imageLoaded = true;
            };
            
            this.image.onerror = () => {
                console.warn(`Failed to load invader image: ${imagePaths[this.type]}`);
                this.imageLoaded = false;
            };
            
        } catch (error) {
            console.warn('Error loading invader image:', error);
            this.imageLoaded = false;
        }
    }
    
    update(deltaTime) {
        // Update AI behavior
        this.updateAI(deltaTime);
        
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update status effects
        this.updateStatusEffects(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update shooting
        this.updateShooting(deltaTime);
        
        // Check boundaries
        this.checkBoundaries();
    }
    
    updateAI(deltaTime) {
        switch (this.behavior) {
            case 'simple':
                this.updateSimpleBehavior(deltaTime);
                break;
            case 'aggressive':
                this.updateAggressiveBehavior(deltaTime);
                break;
            case 'defensive':
                this.updateDefensiveBehavior(deltaTime);
                break;
            case 'unpredictable':
                this.updateUnpredictableBehavior(deltaTime);
                break;
            case 'tactical':
                this.updateTacticalBehavior(deltaTime);
                break;
        }
    }
    
    updateSimpleBehavior(deltaTime) {
        // Basic side-to-side movement with occasional direction changes
        if (Math.random() < 0.01) { // 1% chance per frame to change direction
            this.velocity.x *= -1;
        }
    }
    
    updateAggressiveBehavior(deltaTime) {
        // More active movement, tries to get closer to player
        const player = this.game.player;
        if (player && Math.random() < 0.02) {
            const dx = player.position.x - this.position.x;
            
            if (Math.abs(dx) > 100) {
                this.velocity.x = dx > 0 ? Math.abs(this.velocity.x) : -Math.abs(this.velocity.x);
            }
            
            // Occasionally move forward
            if (Math.random() < 0.005) {
                this.velocity.y = Math.abs(this.velocity.y) * 0.5;
            }
        }
    }
    
    updateDefensiveBehavior(deltaTime) {
        // Slower, more methodical movement
        // Tries to maintain formation and avoid player fire
        const player = this.game.player;
        if (player) {
            const dx = player.position.x - this.position.x;
            const distance = Math.abs(dx);
            
            // Move away if too close
            if (distance < 150 && Math.random() < 0.03) {
                this.velocity.x = dx > 0 ? -Math.abs(this.velocity.x) : Math.abs(this.velocity.x);
            }
        }
    }
    
    updateUnpredictableBehavior(deltaTime) {
        // Random movement changes and special abilities
        if (Math.random() < 0.015) {
            this.velocity.x *= -1 + (Math.random() - 0.5) * 0.5;
            this.velocity.y *= 1 + (Math.random() - 0.5) * 0.3;
        }
        
        // Quantum phase ability
        if (this.special === 'phase' && Math.random() < 0.002) {
            this.activatePhase();
        }
    }
    
    updateTacticalBehavior(deltaTime) {
        // Smart movement based on game state
        const player = this.game.player;
        if (!player) return;
        
        const dx = player.position.x - this.position.x;
        const dy = player.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Tactical positioning
        if (distance > 200) {
            // Move closer to engage
            if (Math.random() < 0.02) {
                this.velocity.x = dx > 0 ? Math.abs(this.velocity.x) : -Math.abs(this.velocity.x);
                this.velocity.y = Math.abs(this.velocity.y) * 0.3;
            }
        } else if (distance < 100) {
            // Maintain safe distance
            if (Math.random() < 0.025) {
                this.velocity.x = dx > 0 ? -Math.abs(this.velocity.x) : Math.abs(this.velocity.x);
            }
        }
        
        // Shield activation for supreme type
        if (this.special === 'shield' && this.health < this.maxHealth * 0.5 && Math.random() < 0.001) {
            this.activateShield();
        }
    }
    
    updateMovement(deltaTime) {
        const dt = deltaTime * 0.016; // 60fps normalization
        
        // Apply velocity
        this.position.x += this.velocity.x * this.speed * dt;
        this.position.y += this.velocity.y * this.speed * dt;
        
        // Add slight bobbing motion
        this.bobOffset += dt * 2;
        const bobAmount = Math.sin(this.bobOffset) * 0.5;
        this.position.y += bobAmount;
        
        // Rotation based on movement
        this.rotation = this.velocity.x * 0.02;
    }
    
    updateAnimation(deltaTime) {
        this.lastAnimationUpdate += deltaTime;
        
        if (this.lastAnimationUpdate >= this.animationSpeed) {
            this.animationFrame = (this.animationFrame + 1) % 2;
            this.lastAnimationUpdate = 0;
        }
        
        // Scale pulsing for special types
        if (this.special) {
            this.scale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
        }
    }
    
    updateStatusEffects(deltaTime) {
        // Update invulnerability
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
            this.invulnerable = this.invulnerabilityTime > 0;
            this.opacity = this.invulnerable ? 0.5 + Math.sin(Date.now() * 0.02) * 0.3 : 1;
        }
        
        // Update other status effects
        this.statusEffects.forEach((effect, name) => {
            effect.duration -= deltaTime;
            
            if (effect.duration <= 0) {
                this.removeStatusEffect(name);
            } else {
                this.applyStatusEffect(name, effect, deltaTime);
            }
        });
    }
    
    updateVisualEffects(deltaTime) {
        // Update glow effect
        if (this.glowEffect) {
            this.glowIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
        }
        
        // Generate trail particles
        if (this.trailEffect && Math.random() < 0.3) {
            const particle = new Particle({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height
                },
                velocity: {
                    x: (Math.random() - 0.5) * 1,
                    y: Math.random() * 2 + 1
                },
                radius: 1 + Math.random(),
                color: this.color,
                life: 20 + Math.random() * 10,
                fades: true
            });
            
            this.particles.push(particle);
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
    
    updateShooting(deltaTime) {
        const now = Date.now();
        
        if (now - this.lastShotTime >= this.shotCooldown && Math.random() < this.fireRate * 0.01) {
            this.shoot();
            this.lastShotTime = now;
        }
    }
    
    checkBoundaries() {
        const canvas = this.game.canvas;
        
        // Horizontal boundaries
        if (this.position.x <= 0 || this.position.x + this.width >= canvas.width) {
            this.velocity.x *= -1;
            this.position.y += 10; // Move down when hitting side
        }
        
        // Keep within screen
        this.position.x = Math.max(0, Math.min(canvas.width - this.width, this.position.x));
    }
    
    // Combat methods
    shoot() {
        if (!this.game.addEnemyProjectile) return;
        
        const projectileTypes = {
            basic: { speed: 3, damage: 1, color: '#ff4444' },
            fast: { speed: 4, damage: 1, color: '#ff8844' },
            armored: { speed: 2, damage: 2, color: '#4444ff' },
            quantum: { speed: 3.5, damage: 1.5, color: '#ff44ff', special: 'homing' },
            supreme: { speed: 4, damage: 2, color: '#ffff44', special: 'explosive' }
        };
        
        const config = projectileTypes[this.type] || projectileTypes.basic;
        
        const projectile = {
            position: {
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height
            },
            velocity: {
                x: 0,
                y: config.speed
            },
            damage: config.damage,
            color: config.color,
            special: config.special,
            owner: 'enemy'
        };
        
        this.game.addEnemyProjectile(projectile);
        
        // Create muzzle flash
        this.createMuzzleFlash();
    }
    
    takeDamage(amount = 1, source = null) {
        if (this.invulnerable) return false;
        
        this.health -= amount;
        
        // Create damage particles
        this.createDamageParticles(amount);
        
        // Flash effect
        this.invulnerable = true;
        this.invulnerabilityTime = 100;
        
        // Check if destroyed
        if (this.health <= 0) {
            this.destroy();
            return true;
        }
        
        return false;
    }
    
    destroy() {
        // Create explosion particles
        this.createExplosionParticles();
        
        // Award points
        const points = Math.floor(this.points * this.scoreMultiplier);
        if (this.game.addScore) {
            this.game.addScore(points);
        }
        
        // Special destruction effects
        this.createDestructionEffects();
        
        // Mark for removal
        this.destroyed = true;
    }
    
    // Special abilities
    activatePhase() {
        this.addStatusEffect('phase', {
            duration: 2000,
            type: 'visual',
            effect: () => {
                this.opacity = 0.3;
                this.invulnerable = true;
            }
        });
    }
    
    activateShield() {
        this.addStatusEffect('shield', {
            duration: 5000,
            type: 'defensive',
            effect: () => {
                this.invulnerable = true;
                this.glowEffect = true;
            }
        });
    }
    
    addStatusEffect(name, effect) {
        this.statusEffects.set(name, effect);
        
        if (effect.effect) {
            effect.effect();
        }
    }
    
    removeStatusEffect(name) {
        const effect = this.statusEffects.get(name);
        if (effect && effect.cleanup) {
            effect.cleanup();
        }
        
        this.statusEffects.delete(name);
        
        // Reset properties
        if (name === 'phase') {
            this.opacity = 1;
            this.invulnerable = false;
        } else if (name === 'shield') {
            this.invulnerable = false;
            this.glowEffect = false;
        }
    }
    
    applyStatusEffect(name, effect, deltaTime) {
        // Continuous effect application
        switch (name) {
            case 'poison':
                if (Math.random() < 0.1) {
                    this.takeDamage(1);
                }
                break;
            case 'slow':
                this.speed *= 0.5;
                break;
        }
    }
    
    // Particle effects
    createMuzzleFlash() {
        const colors = ['#ffffff', '#ffff88', this.color];
        
        for (let i = 0; i < 3; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height
                },
                velocity: {
                    x: (Math.random() - 0.5) * 2,
                    y: Math.random() * 2 + 1
                },
                radius: Math.random() * 2 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 15 + Math.random() * 10,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    createDamageParticles(damage) {
        const particleCount = Math.min(damage * 3, 15);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + Math.random() * this.width,
                    y: this.position.y + Math.random() * this.height
                },
                velocity: {
                    x: (Math.random() - 0.5) * 4,
                    y: (Math.random() - 0.5) * 4
                },
                radius: Math.random() * 2 + 1,
                color: '#ff4444',
                life: 30 + Math.random() * 20,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    createExplosionParticles() {
        // Main explosion
        const mainExplosion = Particle.createExplosion(
            {
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height / 2
            },
            this.color,
            20
        );
        
        this.particles.push(...mainExplosion);
        
        // Secondary effects based on type
        if (this.type === 'quantum') {
            const quantumBurst = Particle.createEnergyBurst(
                {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height / 2
                },
                '#ff44ff',
                15
            );
            this.particles.push(...quantumBurst);
        }
        
        if (this.type === 'armored') {
            const debris = Particle.createDebris(
                {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height / 2
                },
                8
            );
            this.particles.push(...debris);
        }
    }
    
    createDestructionEffects() {
        // Screen shake for bigger enemies
        if (this.type === 'supreme' || this.type === 'armored') {
            if (this.game.addScreenShake) {
                this.game.addScreenShake(5, 200);
            }
        }
        
        // Sound effect trigger
        if (this.game.playSound) {
            this.game.playSound('enemyDestroy');
        }
    }
    
    // Rendering
    draw(ctx) {
        if (!ctx) return;
        
        ctx.save();
        
        // Apply transformations
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.opacity;
        
        // Draw glow effect
        if (this.glowEffect) {
            this.drawGlow(ctx);
        }
        
        // Draw main sprite
        if (this.imageLoaded && this.image) {
            this.drawSprite(ctx);
        } else {
            this.drawFallback(ctx);
        }
        
        // Draw health bar if damaged
        if (this.health < this.maxHealth) {
            this.drawHealthBar(ctx);
        }
        
        // Draw status effects
        this.drawStatusEffects(ctx);
        
        ctx.restore();
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(ctx));
        
        // Debug info
        if (GameConfig.debug.showCollisionBoxes) {
            this.drawDebugInfo(ctx);
        }
    }
    
    drawSprite(ctx) {
        const frameOffset = this.animationFrame * this.width;
        
        ctx.drawImage(
            this.image,
            frameOffset, 0, this.width, this.height,
            -this.width / 2, -this.height / 2, this.width, this.height
        );
        
        // Type-specific color overlay
        if (this.type !== 'basic') {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.globalAlpha = this.opacity;
        }
    }
    
    drawFallback(ctx) {
        // Simple colored rectangle as fallback
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Add some detail
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }
    
    drawGlow(ctx) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width);
        gradient.addColorStop(0, this.color + '80');
        gradient.addColorStop(0.5, this.color + '40');
        gradient.addColorStop(1, this.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width, -this.height, this.width * 2, this.height * 2);
    }
    
    drawHealthBar(ctx) {
        const barWidth = this.width * 0.8;
        const barHeight = 4;
        const barY = -this.height / 2 - 10;
        
        // Background
        ctx.fillStyle = '#444444';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        const healthColor = healthPercent > 0.6 ? '#00ff00' : 
                           healthPercent > 0.3 ? '#ffff00' : '#ff4444';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
    }
    
    drawStatusEffects(ctx) {
        let iconY = -this.height / 2 - 25;
        
        this.statusEffects.forEach((effect, name) => {
            const icon = this.getStatusIcon(name);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(icon, 0, iconY);
            
            iconY -= 15;
        });
    }
    
    getStatusIcon(statusName) {
        const icons = {
            phase: '👻',
            shield: '🛡️',
            poison: '☠️',
            slow: '🐌',
            freeze: '❄️'
        };
        
        return icons[statusName] || '?';
    }
    
    drawDebugInfo(ctx) {
        // Collision circle
        ctx.strokeStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(0, 0, this.collisionRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // AI state
        ctx.fillStyle = 'white';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.aiState, 0, this.height / 2 + 20);
        ctx.fillText(`H:${this.health}/${this.maxHealth}`, 0, this.height / 2 + 30);
    }
    
    // Collision detection
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height,
            centerX: this.position.x + this.width / 2,
            centerY: this.position.y + this.height / 2,
            radius: this.collisionRadius
        };
    }
    
    isCollidingWith(other) {
        const bounds1 = this.getBounds();
        const bounds2 = other.getBounds ? other.getBounds() : other;
        
        // Circle collision for more accurate detection
        const dx = bounds1.centerX - bounds2.centerX;
        const dy = bounds1.centerY - bounds2.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (bounds1.radius + (bounds2.radius || 10));
    }
    
    // Getters
    isDestroyed() {
        return this.destroyed || this.health <= 0;
    }
    
    getScore() {
        return Math.floor(this.points * this.scoreMultiplier);
    }
    
    getType() {
        return this.type;
    }
    
    getHealth() {
        return this.health;
    }
    
    getMaxHealth() {
        return this.maxHealth;
    }
}