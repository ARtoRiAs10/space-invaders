// Enhanced Player Class with Power-ups and Modern Features
// Maintains compatibility with original while adding new capabilities

import { GameConfig } from '../config.js';
import { Projectile } from './Projectile.js';
import { Particle } from './Particle.js';

export class Player {
    constructor({ canvas, config }) {
        // Basic properties
        this.canvas = canvas;
        this.config = config || GameConfig;
        
        // Position and movement
        this.velocity = { x: 0, y: 0 };
        this.rotation = 0;
        this.scale = 1;
        
        // Combat properties
        this.health = 1;
        this.maxHealth = 1;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.lastShotTime = 0;
        this.fireRate = 250; // ms between shots
        
        // Power-up system
        this.powerUp = null;
        this.powerUpTimer = 0;
        this.powerUpDuration = 0;
        
        // Visual effects
        this.opacity = 1;
        this.flashTimer = 0;
        this.particles = [];
        this.thrusterParticles = [];
        
        // Statistics
        this.stats = {
            shotsFired: 0,
            shotsHit: 0,
            powerUpsCollected: 0,
            distanceTraveled: 0
        };
        
        // Image loading
        this.image = new Image();
        this.imageLoaded = false;
        this.loadImage();
        
        // Initialize position after image loads
        this.initializePosition();
    }
    
    loadImage() {
        this.image.src = './public/assets/images/spaceship.png';
        this.image.onload = () => {
            this.imageLoaded = true;
            this.calculateDimensions();
        };
        
        // Fallback to original image path
        this.image.onerror = () => {
            this.image.src = './img/spaceship.png';
            this.image.onload = () => {
                this.imageLoaded = true;
                this.calculateDimensions();
            };
        };
    }
    
    calculateDimensions() {
        const scale = 0.15;
        this.width = this.image.width * scale;
        this.height = this.image.height * scale;
        this.initializePosition();
    }
    
    initializePosition() {
        if (this.width && this.height && this.canvas) {
            this.position = {
                x: this.canvas.width / 2 - this.width / 2,
                y: this.canvas.height - this.height - 20
            };
        } else {
            // Default dimensions if image not loaded
            this.width = 40;
            this.height = 40;
            this.position = {
                x: this.canvas.width / 2 - this.width / 2,
                y: this.canvas.height - this.height - 20
            };
        }
    }
    
    update(deltaTime) {
        // Update timers
        this.updateTimers(deltaTime);
        
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Generate thruster particles
        this.generateThrusterParticles();
    }
    
    updateTimers(deltaTime) {
        // Invulnerability timer
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
            this.invulnerable = this.invulnerabilityTime > 0;
        }
        
        // Power-up timer
        if (this.powerUpTimer > 0) {
            this.powerUpTimer -= deltaTime;
            if (this.powerUpTimer <= 0) {
                this.removePowerUp();
            }
        }
        
        // Flash timer
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }
    }
    
    updateMovement(deltaTime) {
        // Apply velocity
        const oldX = this.position.x;
        this.position.x += this.velocity.x * deltaTime * 0.016; // 60fps normalization
        this.position.y += this.velocity.y * deltaTime * 0.016;
        
        // Track distance traveled
        this.stats.distanceTraveled += Math.abs(this.position.x - oldX);
        
        // Apply rotation damping
        this.rotation *= 0.9;
        
        // Scale effects
        if (this.powerUp) {
            this.scale = 1.0 + Math.sin(Date.now() * 0.01) * 0.05;
        } else {
            this.scale = 1.0;
        }
    }
    
    updateVisualEffects(deltaTime) {
        // Invulnerability flashing
        if (this.invulnerable) {
            this.opacity = 0.3 + Math.sin(Date.now() * 0.02) * 0.3;
        } else {
            this.opacity = 1.0;
        }
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
        
        // Update thruster particles
        for (let i = this.thrusterParticles.length - 1; i >= 0; i--) {
            const particle = this.thrusterParticles[i];
            particle.update(deltaTime);
            
            if (particle.isDead()) {
                this.thrusterParticles.splice(i, 1);
            }
        }
    }
    
    generateThrusterParticles() {
        // Only generate when moving or periodically for idle
        const moving = Math.abs(this.velocity.x) > 0.1;
        const shouldGenerate = moving || Math.random() < 0.3;
        
        if (!shouldGenerate) return;
        
        // Create thruster particles
        const particleCount = moving ? 2 : 1;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + this.width / 2 + (Math.random() - 0.5) * 10,
                    y: this.position.y + this.height
                },
                velocity: {
                    x: (Math.random() - 0.5) * 1.5,
                    y: 1.4 + Math.random() * 0.5
                },
                radius: Math.random() * 2 + 1,
                color: this.getThrusterColor(),
                life: 30 + Math.random() * 20,
                fades: true
            });
            
            this.thrusterParticles.push(particle);
        }
        
        // Limit thruster particles for performance
        if (this.thrusterParticles.length > 50) {
            this.thrusterParticles.splice(0, this.thrusterParticles.length - 50);
        }
    }
    
    getThrusterColor() {
        if (this.powerUp) {
            switch (this.powerUp) {
                case 'MachineGun': return '#ffff00';
                case 'Spread': return '#ff8800';
                case 'Laser': return '#ff0080';
                case 'Shield': return '#00ff80';
                default: return '#00ddff';
            }
        }
        return '#00ddff';
    }
    
    // Shooting system
    shoot() {
        const now = Date.now();
        const fireRate = this.powerUp === 'MachineGun' ? 100 : this.fireRate;
        
        if (now - this.lastShotTime < fireRate) {
            return [];
        }
        
        this.lastShotTime = now;
        this.stats.shotsFired++;
        
        const projectiles = [];
        
        switch (this.powerUp) {
            case 'MachineGun':
                projectiles.push(...this.shootMachineGun());
                break;
            case 'Spread':
                projectiles.push(...this.shootSpread());
                break;
            case 'Laser':
                projectiles.push(...this.shootLaser());
                break;
            default:
                projectiles.push(this.shootSingle());
                break;
        }
        
        // Create muzzle flash effect
        this.createMuzzleFlash();
        
        return projectiles;
    }
    
    shootSingle() {
        return new Projectile({
            position: {
                x: this.position.x + this.width / 2,
                y: this.position.y
            },
            velocity: {
                x: 0,
                y: -this.config.projectiles.player.speed
            },
            damage: this.config.projectiles.player.damage,
            color: this.config.projectiles.player.color,
            owner: 'player'
        });
    }
    
    shootMachineGun() {
        const projectiles = [];
        const spread = 5;
        
        for (let i = 0; i < 2; i++) {
            projectiles.push(new Projectile({
                position: {
                    x: this.position.x + this.width / 2 + (i - 0.5) * spread,
                    y: this.position.y
                },
                velocity: {
                    x: (i - 0.5) * 0.5,
                    y: -this.config.projectiles.player.speed * 1.2
                },
                damage: this.config.projectiles.player.damage * 0.8,
                color: '#ffff00',
                owner: 'player'
            }));
        }
        
        return projectiles;
    }
    
    shootSpread() {
        const projectiles = [];
        const angles = [-20, 0, 20]; // degrees
        
        angles.forEach(angle => {
            const radians = angle * Math.PI / 180;
            const speed = this.config.projectiles.player.speed;
            
            projectiles.push(new Projectile({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y
                },
                velocity: {
                    x: Math.sin(radians) * speed,
                    y: -Math.cos(radians) * speed
                },
                damage: this.config.projectiles.player.damage * 0.7,
                color: '#ff8800',
                owner: 'player'
            }));
        });
        
        return projectiles;
    }
    
    shootLaser() {
        return new Projectile({
            position: {
                x: this.position.x + this.width / 2,
                y: this.position.y
            },
            velocity: {
                x: 0,
                y: -this.config.projectiles.player.speed * 1.5
            },
            damage: this.config.projectiles.player.damage * 2,
            color: '#ff0080',
            radius: 6,
            owner: 'player',
            piercing: true
        });
    }
    
    createMuzzleFlash() {
        const colors = ['#ffffff', '#ffff88', '#88ffff'];
        
        for (let i = 0; i < 3; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y - 5
                },
                velocity: {
                    x: (Math.random() - 0.5) * 4,
                    y: -Math.random() * 3 - 1
                },
                radius: Math.random() * 3 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 10 + Math.random() * 10,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    // Power-up system
    applyPowerUp(type, config) {
        this.powerUp = type;
        this.powerUpTimer = config?.duration || this.config.player.powerUpDuration;
        this.powerUpDuration = this.powerUpTimer;
        this.stats.powerUpsCollected++;
        
        // Apply immediate effects
        switch (type) {
            case 'Shield':
                this.activateShield();
                break;
            case 'Health':
                this.heal(1);
                break;
        }
        
        console.log(`Power-up activated: ${type} for ${this.powerUpTimer}ms`);
    }
    
    removePowerUp() {
        if (this.powerUp) {
            console.log(`Power-up expired: ${this.powerUp}`);
            
            // Remove specific power-up effects
            switch (this.powerUp) {
                case 'Shield':
                    this.deactivateShield();
                    break;
            }
            
            this.powerUp = null;
            this.powerUpTimer = 0;
        }
    }
    
    activateShield() {
        this.invulnerable = true;
        this.invulnerabilityTime = this.powerUpTimer;
    }
    
    deactivateShield() {
        if (this.powerUp === 'Shield') {
            this.invulnerable = false;
            this.invulnerabilityTime = 0;
        }
    }
    
    // Health system
    takeDamage(amount = 1) {
        if (this.invulnerable) return false;
        
        this.health -= amount;
        this.flashTimer = 500;
        
        // Create damage particles
        this.createDamageParticles();
        
        return true;
    }
    
    heal(amount = 1) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        // Create healing particles
        this.createHealingParticles();
    }
    
    createDamageParticles() {
        const colors = ['#ff4444', '#ff8844', '#ffaa44'];
        
        for (let i = 0; i < 10; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + Math.random() * this.width,
                    y: this.position.y + Math.random() * this.height
                },
                velocity: {
                    x: (Math.random() - 0.5) * 6,
                    y: (Math.random() - 0.5) * 6
                },
                radius: Math.random() * 3 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 40 + Math.random() * 20,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    createHealingParticles() {
        const colors = ['#44ff44', '#88ff88', '#aaffaa'];
        
        for (let i = 0; i < 8; i++) {
            const particle = new Particle({
                position: {
                    x: this.position.x + this.width / 2,
                    y: this.position.y + this.height / 2
                },
                velocity: {
                    x: (Math.random() - 0.5) * 2,
                    y: -Math.random() * 4 - 1
                },
                radius: Math.random() * 2 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 60 + Math.random() * 30,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    // Invulnerability system
    setInvulnerable(duration) {
        this.invulnerable = true;
        this.invulnerabilityTime = duration;
    }
    
    isInvulnerable() {
        return this.invulnerable;
    }
    
    // Movement and boundaries
    checkBoundaries(canvas) {
        // Left boundary
        if (this.position.x < 0) {
            this.position.x = 0;
            this.velocity.x = 0;
        }
        
        // Right boundary
        if (this.position.x + this.width > canvas.width) {
            this.position.x = canvas.width - this.width;
            this.velocity.x = 0;
        }
        
        // Top boundary (prevent going too high)
        if (this.position.y < canvas.height * 0.6) {
            this.position.y = canvas.height * 0.6;
            this.velocity.y = Math.max(0, this.velocity.y);
        }
        
        // Bottom boundary
        if (this.position.y + this.height > canvas.height) {
            this.position.y = canvas.height - this.height;
            this.velocity.y = Math.min(0, this.velocity.y);
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
        if (this.flashTimer > 0 || this.invulnerable) {
            const flashAlpha = this.invulnerable ? 
                0.3 + Math.sin(Date.now() * 0.02) * 0.3 : 
                0.5 + Math.sin(this.flashTimer * 0.1) * 0.5;
            ctx.globalAlpha = flashAlpha;
        } else {
            ctx.globalAlpha = this.opacity;
        }
        
        // Apply transformations
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        // Draw player ship
        ctx.drawImage(
            this.image,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );
        
        ctx.restore();
        
        // Draw shield effect
        if (this.powerUp === 'Shield' || this.invulnerable) {
            this.drawShield(ctx);
        }
        
        // Draw power-up effects
        this.drawPowerUpEffects(ctx);
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(ctx));
        this.thrusterParticles.forEach(particle => particle.draw(ctx));
        
        // Draw debug info
        if (this.config.debug.showCollisionBoxes) {
            this.drawDebugInfo(ctx);
        }
    }
    
    drawPlaceholder(ctx) {
        // Draw a simple ship shape as placeholder
        ctx.fillStyle = '#00ffff';
        ctx.save();
        ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        // Draw simple triangle ship
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    drawShield(ctx) {
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        const radius = Math.max(this.width, this.height) * 0.8;
        
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
        ctx.strokeStyle = '#00ff80';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = Date.now() * 0.01;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawPowerUpEffects(ctx) {
        if (!this.powerUp) return;
        
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        
        ctx.save();
        ctx.globalAlpha = 0.4;
        
        switch (this.powerUp) {
            case 'MachineGun':
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    this.position.x - 2,
                    this.position.y - 2,
                    this.width + 4,
                    this.height + 4
                );
                break;
                
            case 'Spread':
                ctx.strokeStyle = '#ff8800';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, Math.max(this.width, this.height) * 0.6, 0, Math.PI * 2);
                ctx.stroke();
                break;
                
            case 'Laser':
                ctx.strokeStyle = '#ff0080';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(centerX, this.position.y);
                ctx.lineTo(centerX, this.position.y - 20);
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
    
    drawDebugInfo(ctx) {
        // Collision box
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
        
        // Velocity vector
        ctx.strokeStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(this.position.x + this.width / 2, this.position.y + this.height / 2);
        ctx.lineTo(
            this.position.x + this.width / 2 + this.velocity.x * 2,
            this.position.y + this.height / 2 + this.velocity.y * 2
        );
        ctx.stroke();
        
        // Status text
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText(`PowerUp: ${this.powerUp || 'None'}`, this.position.x, this.position.y - 25);
        ctx.fillText(`Timer: ${Math.round(this.powerUpTimer)}`, this.position.x, this.position.y - 15);
        ctx.fillText(`Invuln: ${this.invulnerable}`, this.position.x, this.position.y - 5);
    }
    
    // Collision detection
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height,
            centerX: this.position.x + this.width / 2,
            centerY: this.position.y + this.height / 2
        };
    }
    
    // Statistics and data
    getStats() {
        return {
            ...this.stats,
            accuracy: this.stats.shotsFired > 0 ? this.stats.shotsHit / this.stats.shotsFired : 0,
            health: this.health,
            maxHealth: this.maxHealth,
            powerUp: this.powerUp,
            powerUpTimeRemaining: this.powerUpTimer
        };
    }
    
    // Getters for compatibility
    get width() {
        return this._width || 40;
    }
    
    set width(value) {
        this._width = value;
    }
    
    get height() {
        return this._height || 40;
    }
    
    set height(value) {
        this._height = value;
    }
}