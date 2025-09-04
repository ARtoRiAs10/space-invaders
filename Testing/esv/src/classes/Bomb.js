// Enhanced Bomb System with Physics and Visual Effects
// Handles various bomb types including player bombs, enemy mines, and special explosives

import { Particle } from './Particle.js';
import { GameConfig } from '../config.js';

export class Bomb {
    constructor({ position, velocity = { x: 0, y: 0 }, type = 'player', bombType = 'standard', damage = 50, radius = 80, owner = 'player' }) {
        // Basic properties
        this.position = { ...position };
        this.velocity = { ...velocity };
        this.originalVelocity = { ...velocity };
        
        // Bomb properties
        this.type = type; // player, enemy, mine, cluster, etc.
        this.bombType = bombType; // standard, cluster, incendiary, emp, nuclear
        this.owner = owner; // 'player' or 'enemy'
        this.damage = damage;
        this.explosionRadius = radius;
        
        // Visual properties
        this.width = 16;
        this.height = 16;
        this.scale = 1;
        this.rotation = 0;
        this.opacity = 1;
        this.glowEffect = true;
        
        // Physics
        this.gravity = 0.15;
        this.friction = 0.98;
        this.bounceDecay = 0.7;
        this.maxBounces = 3;
        this.bounceCount = 0;
        
        // State management
        this.state = 'falling'; // falling, armed, warning, exploding, exploded
        this.armed = false;
        this.exploded = false;
        this.destroyed = false;
        
        // Timing
        this.fuseTime = 3000; // 3 seconds default
        this.warningTime = 1000; // Warning phase duration
        this.age = 0;
        this.armingDelay = 500; // Time before bomb becomes active
        
        // Special properties
        this.proximityTrigger = false;
        this.proximityRadius = 40;
        this.timerTrigger = true;
        this.impactTrigger = false;
        this.chainReaction = false;
        
        // Visual effects
        this.particles = [];
        this.warningParticles = [];
        this.flashEffect = false;
        this.flashTimer = 0;
        this.pulseEffect = true;
        
        // Audio
        this.tickingSound = false;
        this.lastTickTime = 0;
        this.tickInterval = 500;
        
        // Collision
        this.collisionRadius = Math.max(this.width, this.height) / 2;
        
        // Setup based on bomb type
        this.setupBombType();
        
        // Initialize visual effects
        this.initializeEffects();
    }
    
    setupBombType() {
        const bombConfigs = {
            standard: {
                damage: 50,
                radius: 80,
                fuseTime: 3000,
                color: '#ff8800',
                particles: 'explosion',
                chainReaction: false
            },
            
            cluster: {
                damage: 30,
                radius: 60,
                fuseTime: 2500,
                color: '#ff4444',
                particles: 'cluster',
                chainReaction: true,
                subBombs: 4
            },
            
            incendiary: {
                damage: 40,
                radius: 100,
                fuseTime: 4000,
                color: '#ff6600',
                particles: 'fire',
                lingering: true,
                lingeringDuration: 5000,
                lingeringDamage: 5
            },
            
            emp: {
                damage: 20,
                radius: 120,
                fuseTime: 2000,
                color: '#0088ff',
                particles: 'energy',
                empEffect: true,
                disableDuration: 3000
            },
            
            nuclear: {
                damage: 100,
                radius: 150,
                fuseTime: 5000,
                color: '#00ff88',
                particles: 'nuclear',
                chainReaction: true,
                radiation: true,
                radiationDuration: 8000
            },
            
            mine: {
                damage: 60,
                radius: 70,
                fuseTime: 0, // Instant when triggered
                color: '#888888',
                particles: 'mine',
                proximityTrigger: true,
                timerTrigger: false,
                stealthMode: true
            },
            
            smoke: {
                damage: 0,
                radius: 100,
                fuseTime: 1000,
                color: '#666666',
                particles: 'smoke',
                smokeScreen: true,
                smokeDuration: 10000
            }
        };
        
        const config = bombConfigs[this.bombType] || bombConfigs.standard;
        
        // Apply configuration
        Object.keys(config).forEach(key => {
            this[key] = config[key];
        });
        
        // Adjust properties based on owner
        if (this.owner === 'enemy') {
            this.damage *= 0.8; // Enemy bombs slightly less damaging
            this.fuseTime *= 1.2; // Longer fuse time
        }
    }
    
    initializeEffects() {
        // Set up visual effects based on bomb type
        if (this.bombType === 'mine') {
            this.opacity = 0.7; // Mines are semi-transparent
            this.pulseEffect = false;
        }
        
        if (this.bombType === 'nuclear') {
            this.glowIntensity = 1.5;
            this.tickInterval = 200; // Faster ticking
        }
        
        // Initialize particle trail for falling bombs
        if (this.state === 'falling') {
            this.trailEnabled = true;
        }
    }
    
    update(deltaTime) {
        // Update age
        this.age += deltaTime;
        
        // Update state machine
        this.updateState(deltaTime);
        
        // Update physics (if not exploded)
        if (!this.exploded) {
            this.updatePhysics(deltaTime);
        }
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update proximity detection
        if (this.proximityTrigger && this.armed) {
            this.updateProximityDetection();
        }
        
        // Update audio effects
        this.updateAudioEffects(deltaTime);
        
        // Check boundaries
        this.checkBoundaries();
    }
    
    updateState(deltaTime) {
        switch (this.state) {
            case 'falling':
                if (this.age >= this.armingDelay) {
                    this.arm();
                }
                break;
                
            case 'armed':
                if (this.timerTrigger && this.age >= this.fuseTime - this.warningTime) {
                    this.enterWarningPhase();
                }
                break;
                
            case 'warning':
                if (this.age >= this.fuseTime) {
                    this.explode();
                }
                break;
                
            case 'exploding':
                // Explosion animation phase
                if (this.explosionTimer >= this.explosionDuration) {
                    this.state = 'exploded';
                    this.destroyed = true;
                }
                break;
        }
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
        
        // Update rotation based on velocity
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            this.rotation += 0.05;
        }
    }
    
    updateVisualEffects(deltaTime) {
        // Pulsing effect
        if (this.pulseEffect) {
            const pulseSpeed = this.state === 'warning' ? 0.03 : 0.01;
            this.scale = 1 + Math.sin(this.age * pulseSpeed) * 0.2;
        }
        
        // Flash effect during warning
        if (this.state === 'warning') {
            this.flashTimer += deltaTime;
            const flashInterval = Math.max(100, this.warningTime - (this.age - (this.fuseTime - this.warningTime)));
            
            if (this.flashTimer >= flashInterval) {
                this.flashEffect = !this.flashEffect;
                this.flashTimer = 0;
            }
        }
        
        // Generate particles based on state
        this.generateStateParticles();
    }
    
    updateParticles(deltaTime) {
        // Update regular particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);
            
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update warning particles
        for (let i = this.warningParticles.length - 1; i >= 0; i--) {
            const particle = this.warningParticles[i];
            particle.update(deltaTime);
            
            if (particle.isDead()) {
                this.warningParticles.splice(i, 1);
            }
        }
    }
    
    updateProximityDetection() {
        // Would check for nearby targets
        if (window.game) {
            const targets = this.owner === 'player' ? 
                (window.game.grid ? window.game.grid.getInvaders() : []) :
                (window.game.player ? [window.game.player] : []);
            
            targets.forEach(target => {
                if (this.isInProximity(target)) {
                    this.explode();
                }
            });
        }
    }
    
    updateAudioEffects(deltaTime) {
        // Ticking sound effect
        if (this.tickingSound && this.armed && !this.exploded) {
            const now = Date.now();
            if (now - this.lastTickTime >= this.tickInterval) {
                this.playTickSound();
                this.lastTickTime = now;
                
                // Faster ticking as explosion approaches
                if (this.state === 'warning') {
                    this.tickInterval = Math.max(50, this.tickInterval * 0.9);
                }
            }
        }
    }
    
    checkBoundaries() {
        const canvas = { width: 1024, height: 576 }; // Would be passed in
        
        // Bounce off ground and walls
        if (this.position.y + this.height >= canvas.height) {
            if (this.bounceCount < this.maxBounces) {
                this.position.y = canvas.height - this.height;
                this.velocity.y = -this.velocity.y * this.bounceDecay;
                this.bounceCount++;
                this.createBounceEffect();
                
                // Impact trigger
                if (this.impactTrigger && this.armed) {
                    this.explode();
                }
            } else {
                // Stop bouncing
                this.position.y = canvas.height - this.height;
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        }
        
        // Side walls
        if (this.position.x <= 0 || this.position.x + this.width >= canvas.width) {
            if (this.bounceCount < this.maxBounces) {
                this.velocity.x = -this.velocity.x * this.bounceDecay;
                this.position.x = Math.max(0, Math.min(canvas.width - this.width, this.position.x));
                this.bounceCount++;
                this.createBounceEffect();
            }
        }
    }
    
    generateStateParticles() {
        switch (this.state) {
            case 'falling':
                if (this.trailEnabled && Math.random() < 0.5) {
                    this.createTrailParticle();
                }
                break;
                
            case 'warning':
                if (Math.random() < 0.3) {
                    this.createWarningParticle();
                }
                break;
        }
    }
    
    // State transitions
    arm() {
        this.state = 'armed';
        this.armed = true;
        
        if (this.bombType === 'mine') {
            // Mines become invisible when armed
            this.opacity = 0.3;
        }
        
        this.createArmingEffect();
        console.log(`💣 Bomb armed: ${this.bombType}`);
    }
    
    enterWarningPhase() {
        this.state = 'warning';
        this.tickingSound = true;
        
        this.createWarningEffect();
        console.log(`⚠️ Bomb warning: ${this.bombType}`);
    }
    
    explode() {
        if (this.exploded) return;
        
        this.state = 'exploding';
        this.exploded = true;
        this.explosionTimer = 0;
        this.explosionDuration = 500;
        
        // Create explosion effects
        this.createExplosionEffects();
        
        // Apply damage
        this.applyExplosionDamage();
        
        // Special bomb effects
        this.applySpecialEffects();
        
        // Chain reactions
        if (this.chainReaction) {
            this.triggerChainReaction();
        }
        
        console.log(`💥 Bomb exploded: ${this.bombType} (${this.damage} damage, ${this.explosionRadius} radius)`);
    }
    
    // Explosion effects
    createExplosionEffects() {
        // Main explosion
        const explosionParticles = Particle.createExplosion(
            {
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height / 2
            },
            this.color,
            Math.floor(this.explosionRadius / 4)
        );
        this.particles.push(...explosionParticles);
        
        // Type-specific effects
        switch (this.bombType) {
            case 'cluster':
                this.createClusterExplosion();
                break;
            case 'incendiary':
                this.createIncendiaryExplosion();
                break;
            case 'emp':
                this.createEMPExplosion();
                break;
            case 'nuclear':
                this.createNuclearExplosion();
                break;
            case 'smoke':
                this.createSmokeExplosion();
                break;
        }
        
        // Screen effects
        this.createScreenEffects();
    }
    
    createClusterExplosion() {
        // Create sub-bombs
        const subBombCount = this.subBombs || 4;
        
        for (let i = 0; i < subBombCount; i++) {
            const angle = (i / subBombCount) * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            
            const subBomb = new Bomb({
                position: {
                    x: this.position.x + Math.cos(angle) * distance,
                    y: this.position.y + Math.sin(angle) * distance
                },
                velocity: {
                    x: Math.cos(angle) * 2,
                    y: Math.sin(angle) * 2
                },
                type: 'cluster_sub',
                bombType: 'standard',
                damage: this.damage * 0.4,
                radius: this.explosionRadius * 0.6,
                owner: this.owner
            });
            
            subBomb.fuseTime = 500 + Math.random() * 500;
            
            // Add to game (would be handled by game system)
            if (window.game && window.game.addBomb) {
                window.game.addBomb(subBomb);
            }
        }
    }
    
    createIncendiaryExplosion() {
        // Fire particles
        const fireParticles = [];
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.explosionRadius;
            
            fireParticles.push(new Particle({
                position: {
                    x: this.position.x + Math.cos(angle) * distance,
                    y: this.position.y + Math.sin(angle) * distance
                },
                velocity: {
                    x: Math.cos(angle) * (1 + Math.random()),
                    y: Math.sin(angle) * (1 + Math.random()) - 1
                },
                radius: 3 + Math.random() * 4,
                color: '#ff6600',
                life: 100 + Math.random() * 80,
                fades: true,
                type: 'fire'
            }));
        }
        this.particles.push(...fireParticles);
        
        // Create lingering fire area
        if (this.lingering) {
            this.createLingeringFire();
        }
    }
    
    createEMPExplosion() {
        // Electric energy burst
        const empBurst = Particle.createEnergyBurst(
            {
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height / 2
            },
            '#0088ff',
            25
        );
        this.particles.push(...empBurst);
        
        // EMP ring effect
        this.createEMPRing();
    }
    
    createNuclearExplosion() {
        // Massive explosion with multiple rings
        for (let ring = 0; ring < 3; ring++) {
            const ringRadius = this.explosionRadius * (0.5 + ring * 0.3);
            const ringParticles = Math.floor(ringRadius / 3);
            
            for (let i = 0; i < ringParticles; i++) {
                const angle = (i / ringParticles) * Math.PI * 2;
                
                this.particles.push(new Particle({
                    position: {
                        x: this.position.x + Math.cos(angle) * ringRadius,
                        y: this.position.y + Math.sin(angle) * ringRadius
                    },
                    velocity: {
                        x: Math.cos(angle) * (2 + ring),
                        y: Math.sin(angle) * (2 + ring)
                    },
                    radius: 4 + ring * 2,
                    color: ring === 0 ? '#ffffff' : ring === 1 ? '#ffff00' : '#ff8800',
                    life: 60 + ring * 20,
                    fades: true,
                    glow: true
                }));
            }
        }
        
        // Mushroom cloud effect
        this.createMushroomCloud();
    }
    
    createSmokeExplosion() {
        // Dense smoke particles
        const smokeParticles = Particle.createSmoke(
            {
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height / 2
            },
            '#666666',
            30
        );
        this.particles.push(...smokeParticles);
    }
    
    createScreenEffects() {
        // Screen shake
        if (window.game && window.game.addScreenShake) {
            const shakeIntensity = Math.min(15, this.explosionRadius / 10);
            const shakeDuration = Math.min(500, this.explosionRadius * 3);
            window.game.addScreenShake(shakeIntensity, shakeDuration);
        }
        
        // Screen flash
        if (window.game && window.game.addScreenFlash) {
            const flashColor = this.bombType === 'nuclear' ? '#ffffff' : this.color;
            const flashIntensity = Math.min(0.8, this.explosionRadius / 200);
            window.game.addScreenFlash(flashColor, flashIntensity, 200);
        }
    }
    
    applyExplosionDamage() {
        // Apply area damage
        if (window.game && window.game.applyAreaDamage) {
            const explosion = {
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height / 2
                },
                radius: this.explosionRadius,
                damage: this.damage,
                owner: this.owner,
                type: this.bombType
            };
            
            window.game.applyAreaDamage(explosion);
        }
    }
    
    applySpecialEffects() {
        switch (this.bombType) {
            case 'emp':
                this.applyEMPEffect();
                break;
            case 'incendiary':
                this.applyIncendiaryEffect();
                break;
            case 'nuclear':
                this.applyRadiationEffect();
                break;
            case 'smoke':
                this.applySmokeEffect();
                break;
        }
    }
    
    triggerChainReaction() {
        // Find nearby bombs and trigger them
        if (window.game && window.game.bombs) {
            window.game.bombs.forEach(bomb => {
                if (bomb !== this && !bomb.exploded) {
                    const dx = bomb.position.x - this.position.x;
                    const dy = bomb.position.y - this.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= this.explosionRadius * 0.8) {
                        setTimeout(() => bomb.explode(), Math.random() * 200);
                    }
                }
            });
        }
    }
    
    // Helper methods
    isInProximity(target) {
        if (!target || !target.position) return false;
        
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= this.proximityRadius;
    }
    
    createTrailParticle() {
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
    
    createWarningParticle() {
        const particle = new Particle({
            position: {
                x: this.position.x + Math.random() * this.width,
                y: this.position.y + Math.random() * this.height
            },
            velocity: {
                x: (Math.random() - 0.5) * 2,
                y: -Math.random() * 3 - 1
            },
            radius: 1 + Math.random(),
            color: '#ff0000',
            life: 30 + Math.random() * 20,
            fades: true,
            glow: true
        });
        
        this.warningParticles.push(particle);
    }
    
    createBounceEffect() {
        // Bounce sparks
        for (let i = 0; i < 5; i++) {
            const particle = new Particle({
                position: { ...this.position },
                velocity: {
                    x: (Math.random() - 0.5) * 3,
                    y: -Math.random() * 2 - 1
                },
                radius: Math.random() + 0.5,
                color: '#ffaa00',
                life: 15 + Math.random() * 10,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    createArmingEffect() {
        // Arming glow
        const glowRings = 3;
        for (let i = 0; i < glowRings; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height / 2
                },
                velocity: { x: 0, y: 0 },
                radius: (i + 1) * 8,
                color: this.color,
                life: 20 + i * 10,
                fades: true,
                glow: true
            });
            
            this.particles.push(particle);
        }
    }
    
    createWarningEffect() {
        // Warning flash effect would be implemented
    }
    
    playTickSound() {
        // Sound effect would be played here
        console.log('tick');
    }
    
    // Rendering
    draw(ctx) {
        if (!ctx || this.destroyed || this.state === 'exploded') return;
        
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
        
        // Flash effect
        if (this.flashEffect) {
            ctx.globalAlpha = 1;
        }
        
        // Draw bomb based on type
        this.drawBomb(ctx);
        
        // Draw warning indicators
        if (this.state === 'warning') {
            this.drawWarningIndicators(ctx);
        }
        
        // Draw proximity range for mines
        if (this.bombType === 'mine' && GameConfig.debug.showCollisionBoxes) {
            this.drawProximityRange(ctx);
        }
        
        ctx.restore();
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(ctx));
        this.warningParticles.forEach(particle => particle.draw(ctx));
        
        // Draw explosion radius in debug mode
        if (GameConfig.debug.showExplosionRadius) {
            this.drawExplosionRadius(ctx);
        }
    }
    
    drawBomb(ctx) {
        // Main bomb body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Bomb details based on type
        switch (this.bombType) {
            case 'cluster':
                this.drawClusterDetails(ctx);
                break;
            case 'nuclear':
                this.drawNuclearDetails(ctx);
                break;
            case 'mine':
                this.drawMineDetails(ctx);
                break;
            default:
                this.drawStandardDetails(ctx);
                break;
        }
    }
    
    drawStandardDetails(ctx) {
        // Simple bomb with fuse
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -this.height / 2 - 4, 4, 4); // Fuse
        
        // Highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width / 4, -this.height / 4, 2, 2);
    }
    
    drawClusterDetails(ctx) {
        // Multiple segments
        const segments = 4;
        const segmentHeight = this.height / segments;
        
        for (let i = 0; i < segments; i++) {
            if (i % 2 === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-this.width / 2 + 1, -this.height / 2 + i * segmentHeight, this.width - 2, 1);
            }
        }
    }
    
    drawNuclearDetails(ctx) {
        // Radiation symbol
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(0, 0, 4, angle - 0.3, angle + 0.3);
            ctx.stroke();
        }
    }
    
    drawMineDetails(ctx) {
        // Spikes
        const spikes = 6;
        for (let i = 0; i < spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2;
            const spikeLength = 4;
            
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength);
            ctx.stroke();
        }
    }
    
    drawGlow(ctx) {
        const glowRadius = Math.max(this.width, this.height) * 2;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        gradient.addColorStop(0, this.color + '40');
        gradient.addColorStop(0.5, this.color + '20');
        gradient.addColorStop(1, this.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-glowRadius, -glowRadius, glowRadius * 2, glowRadius * 2);
    }
    
    drawWarningIndicators(ctx) {
        // Pulsing warning circle
        const warningRadius = Math.max(this.width, this.height) * 1.5;
        const pulse = Math.sin(this.age * 0.02) * 0.5 + 0.5;
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.globalAlpha = pulse;
        
        ctx.beginPath();
        ctx.arc(0, 0, warningRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.globalAlpha = this.opacity;
    }
    
    drawProximityRange(ctx) {
        ctx.strokeStyle = '#ffff0060';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.proximityRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.setLineDash([]);
    }
    
    drawExplosionRadius(ctx) {
        ctx.strokeStyle = '#ff000040';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.arc(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2,
            this.explosionRadius,
            0,
            Math.PI * 2
        );
        ctx.stroke();
        
        ctx.setLineDash([]);
    }
    
    // Public API
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
    
    getExplosionBounds() {
        return {
            centerX: this.position.x + this.width / 2,
            centerY: this.position.y + this.height / 2,
            radius: this.explosionRadius
        };
    }
    
    isExploded() {
        return this.exploded;
    }
    
    isDestroyed() {
        return this.destroyed;
    }
    
    isArmed() {
        return this.armed;
    }
    
    getRemainingTime() {
        return Math.max(0, this.fuseTime - this.age);
    }
    
    // Manual triggers
    manualExplode() {
        if (this.armed && !this.exploded) {
            this.explode();
        }
    }
    
    defuse() {
        if (!this.exploded) {
            this.state = 'defused';
            this.armed = false;
            this.destroyed = true;
            
            // Create defuse effect
            this.createDefuseEffect();
        }
    }
    
    createDefuseEffect() {
        // Gentle sparks when defused
        for (let i = 0; i < 8; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height / 2
                },
                velocity: {
                    x: (Math.random() - 0.5) * 2,
                    y: -Math.random() * 3 - 1
                },
                radius: Math.random() + 0.5,
                color: '#00ff00',
                life: 30 + Math.random() * 20,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    // Static factory methods
    static createPlayerBomb(position, bombType = 'standard') {
        return new Bomb({
            position: { ...position },
            velocity: { x: 0, y: 2 },
            type: 'player',
            bombType,
            damage: 50,
            radius: 80,
            owner: 'player'
        });
    }
    
    static createEnemyMine(position) {
        return new Bomb({
            position: { ...position },
            velocity: { x: 0, y: 1 },
            type: 'enemy',
            bombType: 'mine',
            damage: 60,
            radius: 70,
            owner: 'enemy'
        });
    }
    
    static createClusterBomb(position, owner = 'player') {
        return new Bomb({
            position: { ...position },
            velocity: { x: 0, y: 3 },
            type: 'cluster',
            bombType: 'cluster',
            damage: 30,
            radius: 60,
            owner
        });
    }
}