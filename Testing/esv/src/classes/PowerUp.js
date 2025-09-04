// Enhanced PowerUp System with Visual Effects and Advanced Abilities
// Handles various power-up types with temporary and permanent effects

import { Particle } from './Particle.js';
import { GameConfig } from '../config.js';

export class PowerUp {
    constructor({ position, velocity = { x: 0, y: 1 }, type = 'machineGun', rarity = 'common', duration = 10000 }) {
        // Basic properties
        this.position = { ...position };
        this.velocity = { ...velocity };
        this.originalVelocity = { ...velocity };
        
        // PowerUp properties
        this.type = type;
        this.rarity = rarity; // common, uncommon, rare, epic, legendary
        this.duration = duration; // Effect duration in milliseconds
        this.permanent = false;
        
        // Visual properties
        this.width = 24;
        this.height = 24;
        this.scale = 1;
        this.rotation = 0;
        this.opacity = 1;
        this.collected = false;
        this.destroyed = false;
        
        // Animation
        this.bobOffset = Math.random() * Math.PI * 2;
        this.bobSpeed = 0.02;
        this.bobAmount = 3;
        this.rotationSpeed = 0.05;
        self.pulseSpeed = 0.03;
        
        // Physics
        this.gravity = 0.05;
        this.friction = 0.99;
        this.magneticRange = 60; // Range at which it's attracted to player
        this.magneticStrength = 0.1;
        
        // Lifetime
        this.age = 0;
        this.maxAge = 15000; // 15 seconds before disappearing
        this.fadeStartAge = 12000; // Start fading at 12 seconds
        
        // Visual effects
        this.particles = [];
        this.glowEffect = true;
        self.auraEffect = false;
        this.trailEffect = false;
        
        // Audio
        this.collectSound = null;
        this.spawnSound = null;
        
        // Collision
        this.collisionRadius = Math.max(this.width, this.height) / 2;
        
        // Setup based on type and rarity
        this.setupPowerUpType();
        this.setupRarityEffects();
        
        // Initialize visual effects
        this.initializeEffects();
        
        // Play spawn sound
        this.playSpawnSound();
    }
    
    setupPowerUpType() {
        const powerUpConfigs = {
            // Weapon power-ups
            machineGun: {
                name: 'Machine Gun',
                description: 'Rapid fire weapon',
                color: '#ffaa00',
                icon: '🔫',
                duration: 8000,
                stackable: false,
                effect: 'weapon_change',
                value: 'machineGun'
            },
            
            spread: {
                name: 'Spread Shot',
                description: 'Fire multiple projectiles',
                color: '#ff6600',
                icon: '📡',
                duration: 10000,
                stackable: false,
                effect: 'weapon_change',
                value: 'spread'
            },
            
            laser: {
                name: 'Laser Cannon',
                description: 'Piercing laser beam',
                color: '#ff0000',
                icon: '⚡',
                duration: 12000,
                stackable: false,
                effect: 'weapon_change',
                value: 'laser'
            },
            
            homing: {
                name: 'Homing Missiles',
                description: 'Auto-targeting projectiles',
                color: '#ff44ff',
                icon: '🎯',
                duration: 15000,
                stackable: false,
                effect: 'weapon_change',
                value: 'homing'
            },
            
            // Enhancement power-ups
            rapidFire: {
                name: 'Rapid Fire',
                description: 'Increases firing rate',
                color: '#ffff00',
                icon: '⚡',
                duration: 8000,
                stackable: true,
                effect: 'fire_rate_boost',
                value: 2.0
            },
            
            doubleDamage: {
                name: 'Double Damage',
                description: 'Doubles weapon damage',
                color: '#ff8800',
                icon: '💥',
                duration: 10000,
                stackable: true,
                effect: 'damage_boost',
                value: 2.0
            },
            
            tripleShot: {
                name: 'Triple Shot',
                description: 'Fire 3 projectiles at once',
                color: '#8844ff',
                icon: '🔱',
                duration: 12000,
                stackable: false,
                effect: 'multi_shot',
                value: 3
            },
            
            // Defensive power-ups
            shield: {
                name: 'Energy Shield',
                description: 'Absorbs incoming damage',
                color: '#0088ff',
                icon: '🛡️',
                duration: 0, // Shield has health instead of time
                stackable: false,
                effect: 'shield',
                value: 3 // 3 hits
            },
            
            invulnerability: {
                name: 'Invulnerability',
                description: 'Temporary immunity to damage',
                color: '#00ffff',
                icon: '✨',
                duration: 5000,
                stackable: false,
                effect: 'invulnerability',
                value: true
            },
            
            // Utility power-ups
            bomb: {
                name: 'Smart Bomb',
                description: 'Clears screen of enemies',
                color: '#ff4444',
                icon: '💣',
                duration: 0, // Instant effect
                stackable: true,
                effect: 'smart_bomb',
                value: 1
            },
            
            slowMotion: {
                name: 'Slow Motion',
                description: 'Slows down time',
                color: '#4488ff',
                icon: '⏰',
                duration: 8000,
                stackable: false,
                effect: 'slow_motion',
                value: 0.5
            },
            
            magnet: {
                name: 'Magnet',
                description: 'Attracts other power-ups',
                color: '#ff0088',
                icon: '🧲',
                duration: 20000,
                stackable: false,
                effect: 'magnet',
                value: 150 // Attraction range
            },
            
            // Score power-ups
            scoreMultiplier: {
                name: 'Score Multiplier',
                description: 'Multiplies score gained',
                color: '#ffff88',
                icon: '💰',
                duration: 15000,
                stackable: true,
                effect: 'score_multiplier',
                value: 2.0
            },
            
            extraLife: {
                name: 'Extra Life',
                description: 'Gain an additional life',
                color: '#00ff00',
                icon: '❤️',
                duration: 0, // Permanent
                stackable: true,
                effect: 'extra_life',
                value: 1,
                permanent: true
            },
            
            // Advanced power-ups
            timeFreeze: {
                name: 'Time Freeze',
                description: 'Freezes all enemies',
                color: '#88ddff',
                icon: '❄️',
                duration: 6000,
                stackable: false,
                effect: 'time_freeze',
                value: true
            },
            
            piercing: {
                name: 'Piercing Shots',
                description: 'Projectiles go through enemies',
                color: '#ffaa88',
                icon: '🏹',
                duration: 12000,
                stackable: false,
                effect: 'piercing',
                value: 5 // Max enemies to pierce
            },
            
            ghostMode: {
                name: 'Ghost Mode',
                description: 'Pass through enemy projectiles',
                color: '#ccccff',
                icon: '👻',
                duration: 8000,
                stackable: false,
                effect: 'ghost_mode',
                value: true
            },
            
            // Legendary power-ups
            godMode: {
                name: 'God Mode',
                description: 'Ultimate power combination',
                color: '#ffffff',
                icon: '⭐',
                duration: 10000,
                stackable: false,
                effect: 'god_mode',
                value: true
            },
            
            quantumPower: {
                name: 'Quantum Power',
                description: 'Phase between dimensions',
                color: '#ff44ff',
                icon: '🌟',
                duration: 15000,
                stackable: false,
                effect: 'quantum_power',
                value: true
            }
        };
        
        const config = powerUpConfigs[this.type] || powerUpConfigs.machineGun;
        
        // Apply configuration
        Object.keys(config).forEach(key => {
            this[key] = config[key];
        });
    }
    
    setupRarityEffects() {
        const rarityConfigs = {
            common: {
                glowIntensity: 1.0,
                particleCount: 1,
                bobAmount: 3,
                durationMultiplier: 1.0,
                valueMultiplier: 1.0,
                auraEffect: false,
                trailEffect: false
            },
            
            uncommon: {
                glowIntensity: 1.2,
                particleCount: 2,
                bobAmount: 4,
                durationMultiplier: 1.2,
                valueMultiplier: 1.1,
                auraEffect: false,
                trailEffect: false
            },
            
            rare: {
                glowIntensity: 1.5,
                particleCount: 3,
                bobAmount: 5,
                durationMultiplier: 1.5,
                valueMultiplier: 1.25,
                auraEffect: true,
                trailEffect: false
            },
            
            epic: {
                glowIntensity: 2.0,
                particleCount: 4,
                bobAmount: 6,
                durationMultiplier: 2.0,
                valueMultiplier: 1.5,
                auraEffect: true,
                trailEffect: true
            },
            
            legendary: {
                glowIntensity: 3.0,
                particleCount: 6,
                bobAmount: 8,
                durationMultiplier: 2.5,
                valueMultiplier: 2.0,
                auraEffect: true,
                trailEffect: true
            }
        };
        
        const rarityConfig = rarityConfigs[this.rarity] || rarityConfigs.common;
        
        // Apply rarity modifiers
        Object.keys(rarityConfig).forEach(key => {
            this[key] = rarityConfig[key];
        });
        
        // Modify duration and value based on rarity
        if (this.duration > 0) {
            this.duration *= this.durationMultiplier;
        }
        
        if (typeof this.value === 'number') {
            this.value *= this.valueMultiplier;
        }
        
        // Set rarity colors
        const rarityColors = {
            common: '#ffffff',
            uncommon: '#00ff00',
            rare: '#0080ff',
            epic: '#8000ff',
            legendary: '#ff8000'
        };
        
        this.rarityColor = rarityColors[this.rarity] || rarityColors.common;
    }
    
    initializeEffects() {
        // Initialize particle generation
        this.lastParticleTime = 0;
        this.particleInterval = 200;
        
        // Initialize audio
        this.collectSound = `powerup_${this.type}`;
        this.spawnSound = `powerup_spawn_${this.rarity}`;
    }
    
    update(deltaTime) {
        if (this.collected || this.destroyed) return;
        
        // Update age
        this.age += deltaTime;
        
        // Check lifetime
        if (this.age >= this.maxAge) {
            this.destroy();
            return;
        }
        
        // Update physics
        this.updatePhysics(deltaTime);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update magnetic attraction
        this.updateMagneticAttraction(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Check boundaries
        this.checkBoundaries();
        
        // Update fade effect near end of life
        this.updateFadeEffect();
    }
    
    updatePhysics(deltaTime) {
        const dt = deltaTime * 0.016; // 60fps normalization
        
        // Apply gravity
        this.velocity.y += this.gravity * dt;
        
        // Apply friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        
        // Update position
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
    }
    
    updateAnimation(deltaTime) {
        const dt = deltaTime * 0.016;
        
        // Bobbing animation
        this.bobOffset += this.bobSpeed * dt;
        
        // Rotation animation
        this.rotation += this.rotationSpeed * dt;
        
        // Pulsing scale
        this.scale = 1 + Math.sin(this.age * self.pulseSpeed) * 0.1;
    }
    
    updateMagneticAttraction(deltaTime) {
        // Check for nearby player
        if (window.game && window.game.player) {
            const player = window.game.player;
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Magnetic attraction
            if (distance <= this.magneticRange && distance > 0) {
                const attractionForce = this.magneticStrength * (1 - distance / this.magneticRange);
                const dt = deltaTime * 0.016;
                
                this.velocity.x += (dx / distance) * attractionForce * dt;
                this.velocity.y += (dy / distance) * attractionForce * dt;
                
                // Create attraction particles
                if (Math.random() < 0.3) {
                    this.createAttractionParticle(dx, dy, distance);
                }
            }
        }
    }
    
    updateVisualEffects(deltaTime) {
        // Generate ambient particles
        if (this.age - this.lastParticleTime >= this.particleInterval) {
            this.generateAmbientParticles();
            this.lastParticleTime = this.age;
        }
        
        // Trail effect for rare+ power-ups
        if (this.trailEffect && Math.random() < 0.5) {
            this.createTrailParticle();
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
        const canvas = { width: 1024, height: 576 }; // Would be passed in
        
        // Remove if goes off bottom of screen
        if (this.position.y > canvas.height + 50) {
            this.destroy();
        }
        
        // Bounce off sides
        if (this.position.x <= 0 || this.position.x + this.width >= canvas.width) {
            this.velocity.x *= -0.8;
            this.position.x = Math.max(0, Math.min(canvas.width - this.width, this.position.x));
        }
    }
    
    updateFadeEffect() {
        if (this.age >= this.fadeStartAge) {
            const fadeProgress = (this.age - this.fadeStartAge) / (this.maxAge - this.fadeStartAge);
            this.opacity = Math.max(0.2, 1 - fadeProgress);
        }
    }
    
    // Particle generation
    generateAmbientParticles() {
        const particlesToGenerate = Math.min(this.particleCount, 3);
        
        for (let i = 0; i < particlesToGenerate; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                    y: this.position.y + this.height / 2 + (Math.random() - 0.5) * this.height
                },
                velocity: {
                    x: (Math.random() - 0.5) * 1,
                    y: -Math.random() * 2 - 0.5
                },
                radius: Math.random() * 1.5 + 0.5,
                color: Math.random() < 0.7 ? this.color : this.rarityColor,
                life: 40 + Math.random() * 30,
                fades: true,
                glow: true
            });
            
            this.particles.push(particle);
        }
    }
    
    createTrailParticle() {
        const particle = new Particle({
            position: {
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height / 2
            },
            velocity: {
                x: -this.velocity.x * 0.3 + (Math.random() - 0.5) * 0.5,
                y: -this.velocity.y * 0.3 + (Math.random() - 0.5) * 0.5
            },
            radius: Math.random() * 2 + 1,
            color: this.rarityColor,
            life: 30 + Math.random() * 20,
            fades: true,
            glow: true
        });
        
        this.particles.push(particle);
    }
    
    createAttractionParticle(dx, dy, distance) {
        const particle = new Particle({
            position: {
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height / 2
            },
            velocity: {
                x: (dx / distance) * 2,
                y: (dy / distance) * 2
            },
            radius: 1,
            color: '#ffffff',
            life: 20,
            fades: true
        });
        
        this.particles.push(particle);
    }
    
    // Collection handling
    collect(player) {
        if (this.collected) return false;
        
        this.collected = true;
        
        // Create collection effect
        this.createCollectionEffect();
        
        // Play collection sound
        this.playCollectionSound();
        
        // Apply power-up effect to player
        this.applyEffect(player);
        
        // Mark for destruction
        this.destroy();
        
        console.log(`💎 Power-up collected: ${this.name} (${this.rarity})`);
        
        return true;
    }
    
    applyEffect(player) {
        if (!player) return;
        
        switch (this.effect) {
            case 'weapon_change':
                player.changeWeapon(this.value, this.duration);
                break;
                
            case 'fire_rate_boost':
                player.addFireRateBoost(this.value, this.duration);
                break;
                
            case 'damage_boost':
                player.addDamageBoost(this.value, this.duration);
                break;
                
            case 'multi_shot':
                player.addMultiShot(this.value, this.duration);
                break;
                
            case 'shield':
                player.addShield(this.value);
                break;
                
            case 'invulnerability':
                player.addInvulnerability(this.duration);
                break;
                
            case 'smart_bomb':
                player.addSmartBombs(this.value);
                break;
                
            case 'slow_motion':
                player.addSlowMotion(this.value, this.duration);
                break;
                
            case 'magnet':
                player.addMagnet(this.value, this.duration);
                break;
                
            case 'score_multiplier':
                player.addScoreMultiplier(this.value, this.duration);
                break;
                
            case 'extra_life':
                player.addLife(this.value);
                break;
                
            case 'time_freeze':
                player.addTimeFreeze(this.duration);
                break;
                
            case 'piercing':
                player.addPiercing(this.value, this.duration);
                break;
                
            case 'ghost_mode':
                player.addGhostMode(this.duration);
                break;
                
            case 'god_mode':
                player.addGodMode(this.duration);
                break;
                
            case 'quantum_power':
                player.addQuantumPower(this.duration);
                break;
        }
        
        // Emit power-up collected event
        const event = new CustomEvent('powerUpCollected', {
            detail: {
                type: this.type,
                name: this.name,
                rarity: this.rarity,
                effect: this.effect,
                duration: this.duration,
                value: this.value
            }
        });
        window.dispatchEvent(event);
    }
    
    createCollectionEffect() {
        // Burst of particles matching power-up colors
        const burstParticles = [];
        const particleCount = 15 + this.particleCount * 3;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const color = Math.random() < 0.5 ? this.color : this.rarityColor;
            
            burstParticles.push(new Particle({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height / 2
                },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                radius: Math.random() * 2 + 1,
                color: color,
                life: 40 + Math.random() * 30,
                fades: true,
                glow: true
            }));
        }
        
        this.particles.push(...burstParticles);
        
        // Screen flash for legendary power-ups
        if (this.rarity === 'legendary' && window.game && window.game.addScreenFlash) {
            window.game.addScreenFlash(this.rarityColor, 0.3, 300);
        }
    }
    
    playSpawnSound() {
        // Play spawn sound based on rarity
        if (window.game && window.game.playSound) {
            window.game.playSound(this.spawnSound);
        }
    }
    
    playCollectionSound() {
        // Play collection sound
        if (window.game && window.game.playSound) {
            window.game.playSound(this.collectSound);
        }
    }
    
    destroy() {
        this.destroyed = true;
    }
    
    // Collision detection
    checkCollision(target) {
        if (this.collected || this.destroyed) return false;
        
        const bounds = this.getBounds();
        const targetBounds = target.getBounds ? target.getBounds() : target;
        
        // Circle collision
        const dx = bounds.centerX - targetBounds.centerX;
        const dy = bounds.centerY - targetBounds.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (bounds.radius + targetBounds.radius);
    }
    
    // Rendering
    draw(ctx) {
        if (!ctx || this.collected || this.destroyed) return;
        
        ctx.save();
        
        // Apply transformations
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2 + Math.sin(this.bobOffset) * this.bobAmount;
        
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.opacity;
        
        // Draw aura effect for rare+ power-ups
        if (this.auraEffect) {
            this.drawAura(ctx);
        }
        
        // Draw glow effect
        if (this.glowEffect) {
            this.drawGlow(ctx);
        }
        
        // Draw main power-up
        this.drawPowerUp(ctx);
        
        // Draw rarity indicator
        this.drawRarityIndicator(ctx);
        
        ctx.restore();
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(ctx));
        
        // Draw debug info
        if (GameConfig.debug.showCollisionBoxes) {
            this.drawDebugInfo(ctx);
        }
    }
    
    drawPowerUp(ctx) {
        // Main power-up body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Border
        ctx.strokeStyle = this.rarityColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Icon/symbol in center
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon || '?', 0, 0);
        
        // Type indicator
        ctx.fillStyle = this.rarityColor;
        ctx.font = '8px Arial';
        ctx.fillText(this.type.charAt(0).toUpperCase(), 0, this.height / 2 - 4);
    }
    
    drawGlow(ctx) {
        const glowRadius = Math.max(this.width, this.height) * 2 * this.glowIntensity;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        gradient.addColorStop(0, this.color + '60');
        gradient.addColorStop(0.5, this.color + '30');
        gradient.addColorStop(1, this.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-glowRadius, -glowRadius, glowRadius * 2, glowRadius * 2);
    }
    
    drawAura(ctx) {
        // Rotating aura rings for rare+ power-ups
        const auraRadius = Math.max(this.width, this.height) * 1.8;
        const ringCount = this.rarity === 'legendary' ? 3 : 2;
        
        for (let i = 0; i < ringCount; i++) {
            const radius = auraRadius * (0.8 + i * 0.2);
            const rotationOffset = this.rotation * (i + 1);
            
            ctx.strokeStyle = this.rarityColor + '40';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            
            ctx.save();
            ctx.rotate(rotationOffset);
            
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
        }
        
        ctx.setLineDash([]);
    }
    
    drawRarityIndicator(ctx) {
        // Small dots indicating rarity level
        const rarityLevels = {
            common: 1,
            uncommon: 2,
            rare: 3,
            epic: 4,
            legendary: 5
        };
        
        const level = rarityLevels[this.rarity] || 1;
        const dotSize = 1.5;
        const spacing = 4;
        
        for (let i = 0; i < level; i++) {
            const x = (i - (level - 1) / 2) * spacing;
            const y = this.height / 2 + 8;
            
            ctx.fillStyle = this.rarityColor;
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawDebugInfo(ctx) {
        // Collision circle
        ctx.strokeStyle = '#00ff0060';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.collisionRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Magnetic range
        if (this.magneticRange > 0) {
            ctx.strokeStyle = '#ffff0030';
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.magneticRange, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Info text
        ctx.fillStyle = 'white';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.type} (${this.rarity})`, centerX, centerY + 30);
        ctx.fillText(`Age: ${Math.floor(this.age / 1000)}s`, centerX, centerY + 40);
    }
    
    // Utility methods
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
    
    isCollected() {
        return this.collected;
    }
    
    isDestroyed() {
        return this.destroyed;
    }
    
    getRemainingTime() {
        return Math.max(0, this.maxAge - this.age);
    }
    
    getInfo() {
        return {
            type: this.type,
            name: this.name,
            description: this.description,
            rarity: this.rarity,
            duration: this.duration,
            effect: this.effect,
            value: this.value,
            icon: this.icon
        };
    }
    
    // Static factory methods
    static createRandom(position, level = 1) {
        const powerUpTypes = [
            'machineGun', 'spread', 'laser', 'rapidFire', 'doubleDamage',
            'shield', 'bomb', 'scoreMultiplier', 'magnet', 'piercing'
        ];
        
        // Higher level = chance for better power-ups
        if (level >= 3) {
            powerUpTypes.push('homing', 'tripleShot', 'invulnerability', 'slowMotion');
        }
        
        if (level >= 5) {
            powerUpTypes.push('timeFreeze', 'ghostMode', 'extraLife');
        }
        
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        const rarity = PowerUp.generateRandomRarity(level);
        
        return new PowerUp({
            position: { ...position },
            type: randomType,
            rarity: rarity
        });
    }
    
    static generateRandomRarity(level = 1) {
        const rarityChances = {
            1: { common: 0.7, uncommon: 0.25, rare: 0.05, epic: 0, legendary: 0 },
            2: { common: 0.6, uncommon: 0.3, rare: 0.09, epic: 0.01, legendary: 0 },
            3: { common: 0.5, uncommon: 0.35, rare: 0.12, epic: 0.03, legendary: 0 },
            4: { common: 0.4, uncommon: 0.35, rare: 0.18, epic: 0.06, legendary: 0.01 },
            5: { common: 0.3, uncommon: 0.35, rare: 0.22, epic: 0.10, legendary: 0.03 }
        };
        
        const chances = rarityChances[Math.min(level, 5)] || rarityChances[1];
        const random = Math.random();
        
        let cumulative = 0;
        for (const [rarity, chance] of Object.entries(chances)) {
            cumulative += chance;
            if (random <= cumulative) {
                return rarity;
            }
        }
        
        return 'common';
    }
    
    static createSpecific(position, type, rarity = 'common') {
        return new PowerUp({
            position: { ...position },
            type: type,
            rarity: rarity
        });
    }
    
    // Preset factory methods for common power-ups
    static createWeaponUpgrade(position, weaponType = 'machineGun') {
        return new PowerUp({
            position: { ...position },
            type: weaponType,
            rarity: 'uncommon'
        });
    }
    
    static createShield(position, strength = 3) {
        const powerUp = new PowerUp({
            position: { ...position },
            type: 'shield',
            rarity: 'rare'
        });
        
        powerUp.value = strength;
        return powerUp;
    }
    
    static createBomb(position) {
        return new PowerUp({
            position: { ...position },
            type: 'bomb',
            rarity: 'uncommon'
        });
    }
    
    static createExtraLife(position) {
        return new PowerUp({
            position: { ...position },
            type: 'extraLife',
            rarity: 'epic'
        });
    }
}