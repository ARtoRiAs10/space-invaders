// Enhanced Projectile System with Visual Effects and Special Abilities
// Handles various projectile types including homing, explosive, and energy weapons

import { Particle } from './Particle.js';
import { GameConfig } from '../config.js';

export class Projectile {
    constructor({ position, velocity, damage = 1, color = '#ffffff', owner = 'player', type = 'basic', special = null }) {
        // Basic properties
        this.position = { ...position };
        this.velocity = { ...velocity };
        this.originalVelocity = { ...velocity };
        
        // Combat properties
        this.damage = damage;
        this.owner = owner; // 'player' or 'enemy'
        this.type = type; // basic, laser, homing, explosive, etc.
        this.special = special; // Special behavior modifier
        
        // Visual properties
        this.color = color;
        this.width = 4;
        this.height = 12;
        this.scale = 1;
        this.rotation = 0;
        this.opacity = 1;
        this.glowEffect = false;
        
        // Physics
        this.speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        this.acceleration = { x: 0, y: 0 };
        this.maxSpeed = this.speed * 2;
        this.friction = 1;
        
        // Collision
        this.collisionRadius = Math.max(this.width, this.height) / 2;
        this.piercing = false;
        this.targetsPierced = [];
        
        // Lifetime
        this.age = 0;
        this.maxAge = 5000; // 5 seconds
        this.destroyed = false;
        
        // Special properties
        this.target = null;
        this.homingStrength = 0;
        this.explosionRadius = 0;
        this.bounceCount = 0;
        this.maxBounces = 0;
        
        // Visual effects
        this.particles = [];
        this.trailEnabled = false;
        this.trailLength = 5;
        this.trail = [];
        
        // Animation
        this.animationFrame = 0;
        this.animationSpeed = 100;
        this.lastAnimationTime = 0;
        
        // Setup based on type
        this.setupProjectileType();
        
        // Sound effect
        this.playFireSound();
    }
    
    setupProjectileType() {
        const typeConfigs = {
            basic: {
                damage: 1,
                color: '#ffffff',
                width: 3,
                height: 12,
                trailEnabled: false,
                glowEffect: false
            },
            
            laser: {
                damage: 2,
                color: '#ff0000',
                width: 2,
                height: 20,
                trailEnabled: true,
                glowEffect: true,
                piercing: true,
                maxPiercing: 3
            },
            
            plasma: {
                damage: 1.5,
                color: '#00ffff',
                width: 6,
                height: 10,
                trailEnabled: true,
                glowEffect: true,
                explosionRadius: 20
            },
            
            homing: {
                damage: 1.5,
                color: '#ff8800',
                width: 4,
                height: 8,
                trailEnabled: true,
                glowEffect: true,
                homingStrength: 0.1,
                maxSpeed: 8
            },
            
            explosive: {
                damage: 3,
                color: '#ffff00',
                width: 8,
                height: 6,
                trailEnabled: true,
                glowEffect: true,
                explosionRadius: 50
            },
            
            energy: {
                damage: 2,
                color: '#8800ff',
                width: 5,
                height: 15,
                trailEnabled: true,
                glowEffect: true,
                piercing: true
            },
            
            bounce: {
                damage: 1,
                color: '#00ff88',
                width: 4,
                height: 8,
                maxBounces: 3,
                trailEnabled: true
            },
            
            spread: {
                damage: 0.8,
                color: '#ff4488',
                width: 3,
                height: 10,
                trailEnabled: false
            }
        };
        
        const config = typeConfigs[this.type] || typeConfigs.basic;
        
        // Apply configuration
        Object.keys(config).forEach(key => {
            if (key !== 'damage') { // Don't override explicitly set damage
                this[key] = config[key];
            }
        });
        
        // Apply special modifiers
        this.applySpecialModifiers();
    }
    
    applySpecialModifiers() {
        switch (this.special) {
            case 'homing':
                this.homingStrength = 0.15;
                this.trailEnabled = true;
                this.glowEffect = true;
                break;
                
            case 'explosive':
                this.explosionRadius = 40;
                this.glowEffect = true;
                break;
                
            case 'piercing':
                this.piercing = true;
                this.maxPiercing = 5;
                break;
                
            case 'bouncing':
                this.maxBounces = 2;
                break;
                
            case 'seeking':
                this.homingStrength = 0.08;
                this.maxSpeed = this.speed * 1.5;
                break;
        }
    }
    
    playFireSound() {
        // Sound would be played here
        // Different sounds for different projectile types
    }
    
    update(deltaTime) {
        const dt = deltaTime * 0.016; // 60fps normalization
        
        // Update age
        this.age += deltaTime;
        
        // Check lifetime
        if (this.age > this.maxAge) {
            this.destroy();
            return;
        }
        
        // Update special behaviors
        this.updateSpecialBehaviors(dt);
        
        // Apply physics
        this.updatePhysics(dt);
        
        // Update position
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update trail
        this.updateTrail();
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Check boundaries
        this.checkBoundaries();
        
        // Update rotation
        this.updateRotation();
    }
    
    updateSpecialBehaviors(dt) {
        // Homing behavior
        if (this.homingStrength > 0 && this.target) {
            this.updateHoming(dt);
        } else if (this.homingStrength > 0) {
            this.findTarget();
        }
        
        // Age-based effects
        this.updateAgeEffects();
    }
    
    updateHoming(dt) {
        if (!this.target || this.target.isDestroyed()) {
            this.findTarget();
            return;
        }
        
        const targetCenter = {
            x: this.target.position.x + (this.target.width || 0) / 2,
            y: this.target.position.y + (this.target.height || 0) / 2
        };
        
        const dx = targetCenter.x - this.position.x;
        const dy = targetCenter.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Calculate desired velocity
            const desiredVelX = (dx / distance) * this.maxSpeed;
            const desiredVelY = (dy / distance) * this.maxSpeed;
            
            // Apply steering force
            this.velocity.x += (desiredVelX - this.velocity.x) * this.homingStrength;
            this.velocity.y += (desiredVelY - this.velocity.y) * this.homingStrength;
            
            // Limit speed
            const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (currentSpeed > this.maxSpeed) {
                this.velocity.x = (this.velocity.x / currentSpeed) * this.maxSpeed;
                this.velocity.y = (this.velocity.y / currentSpeed) * this.maxSpeed;
            }
        }
    }
    
    findTarget() {
        // Find nearest enemy or player depending on owner
        let targets = [];
        
        if (this.owner === 'player') {
            // Target enemies
            if (window.game && window.game.grid) {
                targets = window.game.grid.getInvaders();
            }
        } else {
            // Target player
            if (window.game && window.game.player) {
                targets = [window.game.player];
            }
        }
        
        if (targets.length === 0) return;
        
        // Find closest target
        let closestTarget = null;
        let closestDistance = Infinity;
        
        targets.forEach(target => {
            if (target.isDestroyed && target.isDestroyed()) return;
            
            const dx = target.position.x - this.position.x;
            const dy = target.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = target;
            }
        });
        
        // Only target if within reasonable range
        if (closestDistance < 300) {
            this.target = closestTarget;
        }
    }
    
    updateAgeEffects() {
        const ageRatio = this.age / this.maxAge;
        
        // Fade out near end of life
        if (ageRatio > 0.8) {
            this.opacity = 1 - (ageRatio - 0.8) * 5;
        }
        
        // Some projectiles get faster with age
        if (this.type === 'energy' && ageRatio < 0.5) {
            const speedMultiplier = 1 + ageRatio * 0.5;
            const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            const targetSpeed = this.speed * speedMultiplier;
            
            if (currentSpeed > 0) {
                this.velocity.x = (this.velocity.x / currentSpeed) * targetSpeed;
                this.velocity.y = (this.velocity.y / currentSpeed) * targetSpeed;
            }
        }
    }
    
    updatePhysics(dt) {
        // Apply acceleration
        this.velocity.x += this.acceleration.x * dt;
        this.velocity.y += this.acceleration.y * dt;
        
        // Apply friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
    }
    
    updateVisualEffects(deltaTime) {
        // Update animation
        this.lastAnimationTime += deltaTime;
        if (this.lastAnimationTime >= this.animationSpeed) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.lastAnimationTime = 0;
        }
        
        // Generate trail particles
        if (this.trailEnabled && Math.random() < 0.8) {
            this.createTrailParticle();
        }
        
        // Pulsing glow effect
        if (this.glowEffect) {
            this.scale = 1 + Math.sin(this.age * 0.01) * 0.1;
        }
    }
    
    updateTrail() {
        if (this.trailEnabled) {
            // Add current position to trail
            this.trail.push({
                x: this.position.x,
                y: this.position.y,
                time: Date.now()
            });
            
            // Remove old trail points
            const maxAge = 200; // Trail lasts 200ms
            const now = Date.now();
            this.trail = this.trail.filter(point => now - point.time < maxAge);
            
            // Limit trail length
            if (this.trail.length > this.trailLength) {
                this.trail.shift();
            }
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
        const margin = 50;
        
        // Check for bouncing projectiles
        if (this.maxBounces > this.bounceCount) {
            let bounced = false;
            
            if (this.position.x <= 0 || this.position.x >= canvas.width) {
                this.velocity.x *= -0.8; // Energy loss on bounce
                this.position.x = Math.max(0, Math.min(canvas.width, this.position.x));
                bounced = true;
            }
            
            if (this.position.y <= 0 || this.position.y >= canvas.height) {
                this.velocity.y *= -0.8;
                this.position.y = Math.max(0, Math.min(canvas.height, this.position.y));
                bounced = true;
            }
            
            if (bounced) {
                this.bounceCount++;
                this.createBounceEffect();
            }
        }
        
        // Destroy if out of bounds
        if (this.position.x < -margin || this.position.x > canvas.width + margin ||
            this.position.y < -margin || this.position.y > canvas.height + margin) {
            this.destroy();
        }
    }
    
    updateRotation() {
        // Rotate based on velocity direction
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            this.rotation = Math.atan2(this.velocity.y, this.velocity.x) + Math.PI / 2;
        }
        
        // Add spin for certain types
        if (this.type === 'energy' || this.type === 'plasma') {
            this.rotation += 0.1;
        }
    }
    
    // Collision handling
    checkCollision(target) {
        if (!target || this.destroyed) return false;
        
        // Get bounds
        const projectileBounds = this.getBounds();
        const targetBounds = target.getBounds ? target.getBounds() : target;
        
        // Circle collision detection
        const dx = projectileBounds.centerX - targetBounds.centerX;
        const dy = projectileBounds.centerY - targetBounds.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (projectileBounds.radius + targetBounds.radius);
    }
    
    handleCollision(target) {
        if (this.destroyed) return;
        
        // Check if already pierced this target
        if (this.piercing && this.targetsPierced.includes(target)) {
            return;
        }
        
        // Apply damage
        if (target.takeDamage) {
            const damageDealt = target.takeDamage(this.damage, this);
            
            // Track for piercing
            if (this.piercing) {
                this.targetsPierced.push(target);
                
                // Destroy if max piercing reached
                if (this.targetsPierced.length >= (this.maxPiercing || 1)) {
                    this.destroy();
                }
            } else {
                this.destroy();
            }
        } else {
            this.destroy();
        }
        
        // Create hit effect
        this.createHitEffect(target);
    }
    
    destroy() {
        if (this.destroyed) return;
        
        this.destroyed = true;
        
        // Create destruction effects
        this.createDestructionEffects();
        
        // Explosive projectiles create area damage
        if (this.explosionRadius > 0) {
            this.createExplosion();
        }
    }
    
    // Visual effects
    createTrailParticle() {
        const particle = new Particle({
            position: { ...this.position },
            velocity: {
                x: -this.velocity.x * 0.1 + (Math.random() - 0.5) * 1,
                y: -this.velocity.y * 0.1 + (Math.random() - 0.5) * 1
            },
            radius: Math.random() + 0.5,
            color: this.color,
            life: 15 + Math.random() * 10,
            fades: true
        });
        
        this.particles.push(particle);
    }
    
    createHitEffect(target) {
        const hitPosition = {
            x: target.position.x + (target.width || 0) / 2,
            y: target.position.y + (target.height || 0) / 2
        };
        
        // Sparks
        const sparks = Particle.createSparks(hitPosition, { x: 0, y: -1 }, 8);
        this.particles.push(...sparks);
        
        // Impact flash
        const flash = new Particle({
            position: hitPosition,
            velocity: { x: 0, y: 0 },
            radius: 10,
            color: '#ffffff',
            life: 10,
            fades: true,
            glow: true
        });
        this.particles.push(flash);
    }
    
    createBounceEffect() {
        // Bounce sparks
        for (let i = 0; i < 5; i++) {
            const particle = new Particle({
                position: { ...this.position },
                velocity: {
                    x: (Math.random() - 0.5) * 3,
                    y: (Math.random() - 0.5) * 3
                },
                radius: Math.random() + 1,
                color: this.color,
                life: 20 + Math.random() * 10,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    createDestructionEffects() {
        // Small explosion based on projectile type
        let particleCount = 5;
        let particleColor = this.color;
        
        if (this.type === 'explosive') {
            particleCount = 15;
            particleColor = '#ffaa00';
        } else if (this.type === 'energy') {
            particleCount = 10;
            particleColor = '#8800ff';
        }
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            
            const particle = new Particle({
                position: { ...this.position },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                radius: Math.random() * 2 + 1,
                color: particleColor,
                life: 30 + Math.random() * 20,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    createExplosion() {
        // Area damage explosion
        if (window.game) {
            const explosion = {
                position: { ...this.position },
                radius: this.explosionRadius,
                damage: this.damage,
                owner: this.owner
            };
            
            // Create explosion visual
            const explosionParticles = Particle.createExplosion(
                this.position,
                '#ffaa00',
                Math.floor(this.explosionRadius / 3)
            );
            this.particles.push(...explosionParticles);
            
            // Apply area damage would be handled by game
            if (window.game.applyAreaDamage) {
                window.game.applyAreaDamage(explosion);
            }
        }
    }
    
    // Rendering
    draw(ctx) {
        if (!ctx || this.destroyed) return;
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // Draw trail
        if (this.trailEnabled && this.trail.length > 1) {
            this.drawTrail(ctx);
        }
        
        // Draw glow effect
        if (this.glowEffect) {
            this.drawGlow(ctx);
        }
        
        // Draw main projectile
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        this.drawProjectile(ctx);
        
        ctx.restore();
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(ctx));
        
        // Debug visualization
        if (GameConfig.debug.showCollisionBoxes) {
            this.drawDebugInfo(ctx);
        }
    }
    
    drawTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.strokeStyle = this.color + '80'; // Semi-transparent
        ctx.lineWidth = this.width / 2;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        
        for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            const alpha = i / this.trail.length;
            
            ctx.globalAlpha = this.opacity * alpha * 0.5;
            ctx.lineTo(point.x, point.y);
        }
        
        ctx.stroke();
        ctx.globalAlpha = this.opacity;
    }
    
    drawGlow(ctx) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width * 2);
        gradient.addColorStop(0, this.color + '80');
        gradient.addColorStop(0.5, this.color + '40');
        gradient.addColorStop(1, this.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width * 2, -this.height * 2, this.width * 4, this.height * 4);
    }
    
    drawProjectile(ctx) {
        switch (this.type) {
            case 'laser':
                this.drawLaser(ctx);
                break;
            case 'plasma':
                this.drawPlasma(ctx);
                break;
            case 'energy':
                this.drawEnergy(ctx);
                break;
            default:
                this.drawBasic(ctx);
                break;
        }
    }
    
    drawBasic(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Add a bright tip
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width / 4, -this.height / 2, this.width / 2, 2);
    }
    
    drawLaser(ctx) {
        // Bright core
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Outer glow
        ctx.fillStyle = this.color + '80';
        ctx.fillRect(-this.width, -this.height / 2 - 2, this.width * 2, this.height + 4);
        
        // Center line
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-0.5, -this.height / 2, 1, this.height);
    }
    
    drawPlasma(ctx) {
        // Pulsing plasma ball
        const pulseScale = 1 + Math.sin(this.age * 0.02) * 0.3;
        
        ctx.scale(pulseScale, pulseScale);
        
        // Outer plasma
        ctx.fillStyle = this.color + '60';
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // White hot center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawEnergy(ctx) {
        // Rotating energy bolt
        const segments = 6;
        const segmentHeight = this.height / segments;
        
        for (let i = 0; i < segments; i++) {
            const offset = Math.sin(this.age * 0.01 + i) * 2;
            const alpha = (i % 2) * 0.5 + 0.5;
            
            ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.fillRect(
                -this.width / 2 + offset, 
                -this.height / 2 + i * segmentHeight,
                this.width, 
                segmentHeight
            );
        }
    }
    
    drawDebugInfo(ctx) {
        // Collision circle
        ctx.strokeStyle = this.owner === 'player' ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.collisionRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Velocity vector
        ctx.strokeStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(
            this.position.x + this.velocity.x * 5,
            this.position.y + this.velocity.y * 5
        );
        ctx.stroke();
    }
    
    // Utility methods
    getBounds() {
        return {
            x: this.position.x - this.width / 2,
            y: this.position.y - this.height / 2,
            width: this.width,
            height: this.height,
            centerX: this.position.x,
            centerY: this.position.y,
            radius: this.collisionRadius
        };
    }
    
    isDestroyed() {
        return this.destroyed;
    }
    
    getOwner() {
        return this.owner;
    }
    
    getDamage() {
        return this.damage;
    }
    
    getType() {
        return this.type;
    }
    
    // Static factory methods for common projectile types
    static createPlayerBullet(position) {
        return new Projectile({
            position: { ...position },
            velocity: { x: 0, y: -8 },
            damage: 1,
            color: '#ffff00',
            owner: 'player',
            type: 'basic'
        });
    }
    
    static createEnemyBullet(position, targetPosition = null) {
        let velocity = { x: 0, y: 4 };
        
        if (targetPosition) {
            const dx = targetPosition.x - position.x;
            const dy = targetPosition.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const speed = 4;
                velocity = {
                    x: (dx / distance) * speed,
                    y: (dy / distance) * speed
                };
            }
        }
        
        return new Projectile({
            position: { ...position },
            velocity,
            damage: 1,
            color: '#ff4444',
            owner: 'enemy',
            type: 'basic'
        });
    }
    
    static createHomingMissile(position, target, owner = 'player') {
        return new Projectile({
            position: { ...position },
            velocity: { x: 0, y: owner === 'player' ? -6 : 6 },
            damage: 2,
            color: '#ff8800',
            owner,
            type: 'homing',
            special: 'homing'
        });
    }
    
    static createLaserBeam(position, owner = 'player') {
        return new Projectile({
            position: { ...position },
            velocity: { x: 0, y: owner === 'player' ? -12 : 8 },
            damage: 2,
            color: '#ff0000',
            owner,
            type: 'laser',
            special: 'piercing'
        });
    }
    
    static createExplosiveRocket(position, velocity, owner = 'player') {
        return new Projectile({
            position: { ...position },
            velocity: { ...velocity },
            damage: 3,
            color: '#ffaa00',
            owner,
            type: 'explosive',
            special: 'explosive'
        });
    }
}