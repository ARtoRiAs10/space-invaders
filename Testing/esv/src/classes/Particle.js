// Enhanced Particle System
// Handles visual effects, explosions, and particle animations

export class Particle {
    constructor({ position, velocity, radius, color, life, fades = false, gravity = 0, friction = 1, glow = false }) {
        // Position and movement
        this.position = { ...position };
        this.velocity = { ...velocity };
        this.acceleration = { x: 0, y: gravity };
        
        // Visual properties
        this.radius = radius;
        this.color = color;
        this.originalRadius = radius;
        this.friction = friction;
        this.glow = glow;
        
        // Life cycle
        this.life = life;
        this.maxLife = life;
        this.fades = fades;
        this.opacity = 1;
        this.dead = false;
        
        // Animation properties
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.scale = 1;
        this.scaleSpeed = 0;
        
        // Special effects
        this.trail = [];
        this.trailLength = 0;
        this.bounce = false;
        this.bounceDecay = 0.8;
        
        // Type-specific properties
        this.type = 'default';
        this.special = null;
    }
    
    update(deltaTime) {
        if (this.dead) return;
        
        // Update life
        this.life -= deltaTime * 0.016; // 60fps normalization
        
        if (this.life <= 0) {
            this.dead = true;
            return;
        }
        
        // Update opacity if fading
        if (this.fades) {
            this.opacity = this.life / this.maxLife;
        }
        
        // Update physics
        this.updatePhysics(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update trail
        this.updateTrail();
        
        // Type-specific updates
        this.updateSpecialEffects(deltaTime);
    }
    
    updatePhysics(deltaTime) {
        const dt = deltaTime * 0.016;
        
        // Apply acceleration
        this.velocity.x += this.acceleration.x * dt;
        this.velocity.y += this.acceleration.y * dt;
        
        // Apply friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        
        // Update position
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        
        // Bounce off boundaries if enabled
        if (this.bounce && this.checkBoundaries()) {
            this.handleBounce();
        }
    }
    
    updateVisualEffects(deltaTime) {
        const dt = deltaTime * 0.016;
        
        // Update rotation
        this.rotation += this.rotationSpeed * dt;
        
        // Update scale
        this.scale += this.scaleSpeed * dt;
        this.scale = Math.max(0.1, this.scale);
        
        // Update radius based on scale
        this.radius = this.originalRadius * this.scale;
    }
    
    updateTrail() {
        if (this.trailLength > 0) {
            // Add current position to trail
            this.trail.push({ 
                x: this.position.x, 
                y: this.position.y,
                time: Date.now()
            });
            
            // Remove old trail points
            const maxAge = 500; // 0.5 seconds
            const now = Date.now();
            this.trail = this.trail.filter(point => now - point.time < maxAge);
            
            // Limit trail length
            if (this.trail.length > this.trailLength) {
                this.trail.shift();
            }
        }
    }
    
    updateSpecialEffects(deltaTime) {
        switch (this.type) {
            case 'spark':
                this.updateSparkEffect(deltaTime);
                break;
            case 'smoke':
                this.updateSmokeEffect(deltaTime);
                break;
            case 'fire':
                this.updateFireEffect(deltaTime);
                break;
            case 'energy':
                this.updateEnergyEffect(deltaTime);
                break;
            case 'debris':
                this.updateDebrisEffect(deltaTime);
                break;
        }
    }
    
    updateSparkEffect(deltaTime) {
        // Sparks shrink over time and have gravity
        const ageRatio = 1 - (this.life / this.maxLife);
        this.scale = 1 - ageRatio * 0.5;
        this.acceleration.y = 0.1 + ageRatio * 0.2;
    }
    
    updateSmokeEffect(deltaTime) {
        // Smoke expands and fades
        const ageRatio = 1 - (this.life / this.maxLife);
        this.scale = 1 + ageRatio * 2;
        this.velocity.y -= 0.05; // Float upward
        this.friction = 0.99; // Air resistance
    }
    
    updateFireEffect(deltaTime) {
        // Fire flickers and rises
        const ageRatio = 1 - (this.life / this.maxLife);
        this.scale = 1 + Math.sin(Date.now() * 0.01) * 0.2;
        this.velocity.y -= 0.1 + Math.random() * 0.05;
        this.velocity.x += (Math.random() - 0.5) * 0.02;
    }
    
    updateEnergyEffect(deltaTime) {
        // Energy particles pulse and have electrical movement
        this.scale = 1 + Math.sin(Date.now() * 0.02) * 0.3;
        this.velocity.x += Math.sin(Date.now() * 0.01) * 0.1;
        this.velocity.y += Math.cos(Date.now() * 0.015) * 0.1;
    }
    
    updateDebrisEffect(deltaTime) {
        // Debris has gravity and rotation
        this.acceleration.y = 0.15;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }
    
    checkBoundaries() {
        // Assuming canvas boundaries - would be passed in real implementation
        const canvasWidth = 1024;
        const canvasHeight = 576;
        
        return (
            this.position.x - this.radius <= 0 ||
            this.position.x + this.radius >= canvasWidth ||
            this.position.y - this.radius <= 0 ||
            this.position.y + this.radius >= canvasHeight
        );
    }
    
    handleBounce() {
        const canvasWidth = 1024;
        const canvasHeight = 576;
        
        // Left/right boundaries
        if (this.position.x - this.radius <= 0) {
            this.position.x = this.radius;
            this.velocity.x = -this.velocity.x * this.bounceDecay;
        } else if (this.position.x + this.radius >= canvasWidth) {
            this.position.x = canvasWidth - this.radius;
            this.velocity.x = -this.velocity.x * this.bounceDecay;
        }
        
        // Top/bottom boundaries
        if (this.position.y - this.radius <= 0) {
            this.position.y = this.radius;
            this.velocity.y = -this.velocity.y * this.bounceDecay;
        } else if (this.position.y + this.radius >= canvasHeight) {
            this.position.y = canvasHeight - this.radius;
            this.velocity.y = -this.velocity.y * this.bounceDecay;
        }
    }
    
    draw(ctx) {
        if (this.dead || this.opacity <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // Draw trail if enabled
        if (this.trail.length > 1) {
            this.drawTrail(ctx);
        }
        
        // Apply transformations
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        // Draw glow effect
        if (this.glow) {
            this.drawGlow(ctx);
        }
        
        // Draw particle based on type
        this.drawParticle(ctx);
        
        ctx.restore();
    }
    
    drawParticle(ctx) {
        switch (this.type) {
            case 'spark':
                this.drawSpark(ctx);
                break;
            case 'smoke':
                this.drawSmoke(ctx);
                break;
            case 'fire':
                this.drawFire(ctx);
                break;
            case 'energy':
                this.drawEnergy(ctx);
                break;
            case 'debris':
                this.drawDebris(ctx);
                break;
            default:
                this.drawDefault(ctx);
                break;
        }
    }
    
    drawDefault(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    
    drawSpark(ctx) {
        // Draw as a line with motion blur effect
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(-this.velocity.x * 0.5, -this.velocity.y * 0.5);
        ctx.lineTo(this.velocity.x * 0.5, this.velocity.y * 0.5);
        ctx.stroke();
    }
    
    drawSmoke(ctx) {
        // Draw as multiple overlapping circles for cloud effect
        const numCircles = 3;
        ctx.fillStyle = this.color;
        
        for (let i = 0; i < numCircles; i++) {
            const angle = (i / numCircles) * Math.PI * 2;
            const offsetRadius = this.radius * 0.3;
            const x = Math.cos(angle) * offsetRadius;
            const y = Math.sin(angle) * offsetRadius;
            
            ctx.globalAlpha = this.opacity * (0.3 + Math.random() * 0.4);
            ctx.beginPath();
            ctx.arc(x, y, this.radius * (0.8 + Math.random() * 0.4), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawFire(ctx) {
        // Draw flame shape
        const flameHeight = this.radius * 2;
        const flameWidth = this.radius;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, flameHeight / 2);
        
        // Create flame shape with curves
        ctx.quadraticCurveTo(-flameWidth / 2, 0, 0, -flameHeight / 2);
        ctx.quadraticCurveTo(flameWidth / 2, 0, 0, flameHeight / 2);
        
        ctx.fill();
        
        // Add inner flame
        ctx.globalAlpha = this.opacity * 0.8;
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawEnergy(ctx) {
        // Draw pulsing energy orb
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add energy corona
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = this.opacity * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    drawDebris(ctx) {
        // Draw as rectangle debris
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        
        // Add some detail lines
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-this.radius, 0);
        ctx.lineTo(this.radius, 0);
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(0, this.radius);
        ctx.stroke();
    }
    
    drawGlow(ctx) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        gradient.addColorStop(0, this.color + '80'); // Semi-transparent center
        gradient.addColorStop(0.5, this.color + '40');
        gradient.addColorStop(1, this.color + '00'); // Transparent edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 0.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x - this.position.x, this.trail[0].y - this.position.y);
        
        for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            const alpha = i / this.trail.length;
            ctx.globalAlpha = this.opacity * alpha * 0.5;
            ctx.lineTo(point.x - this.position.x, point.y - this.position.y);
        }
        
        ctx.stroke();
    }
    
    // Utility methods
    isDead() {
        return this.dead;
    }
    
    kill() {
        this.dead = true;
    }
    
    reset(newProperties = {}) {
        this.dead = false;
        this.life = this.maxLife;
        this.opacity = 1;
        this.scale = 1;
        this.rotation = 0;
        
        // Apply new properties
        Object.assign(this, newProperties);
    }
    
    // Static factory methods for common particle types
    static createExplosion(position, color = '#ff4444', count = 15) {
        const particles = [];
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            
            particles.push(new Particle({
                position: { ...position },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                radius: 2 + Math.random() * 3,
                color: color,
                life: 60 + Math.random() * 40,
                fades: true,
                type: 'spark',
                gravity: 0.05
            }));
        }
        
        return particles;
    }
    
    static createSmoke(position, color = '#888888', count = 8) {
        const particles = [];
        
        for (let i = 0; i < count; i++) {
            particles.push(new Particle({
                position: {
                    x: position.x + (Math.random() - 0.5) * 20,
                    y: position.y + (Math.random() - 0.5) * 20
                },
                velocity: {
                    x: (Math.random() - 0.5) * 0.5,
                    y: -Math.random() * 1 - 0.5
                },
                radius: 5 + Math.random() * 10,
                color: color,
                life: 120 + Math.random() * 80,
                fades: true,
                type: 'smoke',
                friction: 0.98
            }));
        }
        
        return particles;
    }
    
    static createSparks(position, direction = { x: 0, y: -1 }, count = 10) {
        const particles = [];
        
        for (let i = 0; i < count; i++) {
            const spread = 0.5;
            const speed = 3 + Math.random() * 2;
            
            particles.push(new Particle({
                position: { ...position },
                velocity: {
                    x: direction.x * speed + (Math.random() - 0.5) * spread,
                    y: direction.y * speed + (Math.random() - 0.5) * spread
                },
                radius: 1 + Math.random() * 2,
                color: '#ffff88',
                life: 30 + Math.random() * 20,
                fades: true,
                type: 'spark',
                gravity: 0.1,
                glow: true
            }));
        }
        
        return particles;
    }
    
    static createEnergyBurst(position, color = '#00ffff', count = 20) {
        const particles = [];
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            
            particles.push(new Particle({
                position: { ...position },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                radius: 3 + Math.random() * 2,
                color: color,
                life: 40 + Math.random() * 30,
                fades: true,
                type: 'energy',
                glow: true,
                trailLength: 5
            }));
        }
        
        return particles;
    }
    
    static createDebris(position, count = 12) {
        const particles = [];
        const colors = ['#666666', '#999999', '#444444', '#bbbbbb'];
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            
            particles.push(new Particle({
                position: { ...position },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                radius: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 90 + Math.random() * 60,
                fades: true,
                type: 'debris',
                gravity: 0.08,
                bounce: true,
                bounceDecay: 0.7,
                friction: 0.99
            }));
        }
        
        return particles;
    }
}