// AI Behavior Patterns for Boss Enemies
// Defines different attack patterns and movement behaviors

export class BehaviorPatterns {
    constructor() {
        this.patterns = new Map();
        this.initializePatterns();
    }
    
    initializePatterns() {
        // Define all available attack patterns
        this.patterns.set('straight', {
            name: 'Straight Shot',
            duration: 2000,
            cooldown: 1000,
            execute: this.executeStraightPattern.bind(this)
        });
        
        this.patterns.set('spread', {
            name: 'Spread Fire',
            duration: 3000,
            cooldown: 1500,
            execute: this.executeSpreadPattern.bind(this)
        });
        
        this.patterns.set('spiral', {
            name: 'Spiral Barrage',
            duration: 4000,
            cooldown: 2000,
            execute: this.executeSpiralPattern.bind(this)
        });
        
        this.patterns.set('homing', {
            name: 'Homing Missiles',
            duration: 3000,
            cooldown: 2500,
            execute: this.executeHomingPattern.bind(this)
        });
        
        this.patterns.set('laser', {
            name: 'Laser Beam',
            duration: 2500,
            cooldown: 3000,
            execute: this.executeLaserPattern.bind(this)
        });
        
        this.patterns.set('mines', {
            name: 'Mine Field',
            duration: 1000,
            cooldown: 4000,
            execute: this.executeMinesPattern.bind(this)
        });
        
        this.patterns.set('teleport', {
            name: 'Teleport Strike',
            duration: 1500,
            cooldown: 5000,
            execute: this.executeTeleportPattern.bind(this)
        });
        
        this.patterns.set('clone', {
            name: 'Shadow Clone',
            duration: 5000,
            cooldown: 8000,
            execute: this.executeClonePattern.bind(this)
        });
        
        this.patterns.set('storm', {
            name: 'Projectile Storm',
            duration: 6000,
            cooldown: 3000,
            execute: this.executeStormPattern.bind(this)
        });
        
        this.patterns.set('ultimate', {
            name: 'Ultimate Attack',
            duration: 8000,
            cooldown: 15000,
            execute: this.executeUltimatePattern.bind(this)
        });
    }
    
    getPattern(patternName, boss) {
        const patternDef = this.patterns.get(patternName);
        if (!patternDef) {
            console.warn(`Unknown pattern: ${patternName}, using straight`);
            return this.getPattern('straight', boss);
        }
        
        return {
            ...patternDef,
            boss: boss,
            startTime: Date.now(),
            active: true,
            patternTimer: 0
        };
    }
    
    // Pattern Implementations
    
    executeStraightPattern(deltaTime, boss, playerPosition) {
        const interval = 500; // Fire every 500ms
        
        if (this.patternTimer % interval < deltaTime * 0.016) {
            this.createStraightProjectiles(boss, playerPosition);
        }
    }
    
    executeSpreadPattern(deltaTime, boss, playerPosition) {
        const interval = 800;
        
        if (this.patternTimer % interval < deltaTime * 0.016) {
            this.createSpreadProjectiles(boss, playerPosition);
        }
    }
    
    executeSpiralPattern(deltaTime, boss, playerPosition) {
        const interval = 150; // Very frequent for spiral effect
        
        if (this.patternTimer % interval < deltaTime * 0.016) {
            this.createSpiralProjectiles(boss, this.patternTimer);
        }
    }
    
    executeHomingPattern(deltaTime, boss, playerPosition) {
        const interval = 1000;
        
        if (this.patternTimer % interval < deltaTime * 0.016) {
            this.createHomingProjectiles(boss, playerPosition);
        }
    }
    
    executeLaserPattern(deltaTime, boss, playerPosition) {
        // Laser is a continuous beam
        this.createLaserBeam(boss, playerPosition, deltaTime);
    }
    
    executeMinesPattern(deltaTime, boss, playerPosition) {
        const interval = 200;
        
        if (this.patternTimer % interval < deltaTime * 0.016) {
            this.createMine(boss);
        }
    }
    
    executeTeleportPattern(deltaTime, boss, playerPosition) {
        const phase = Math.floor(this.patternTimer / 500) % 3;
        
        switch (phase) {
            case 0: // Disappear
                boss.opacity = 0.3;
                break;
            case 1: // Teleport
                this.teleportBoss(boss, playerPosition);
                break;
            case 2: // Attack and reappear
                boss.opacity = 1.0;
                this.createTeleportAttack(boss, playerPosition);
                break;
        }
    }
    
    executeClonePattern(deltaTime, boss, playerPosition) {
        // Create shadow clones that mirror boss attacks
        if (this.patternTimer < 100) { // First frame
            this.createShadowClones(boss);
        }
        
        // Clones attack in sequence
        const cloneInterval = 600;
        if (this.patternTimer % cloneInterval < deltaTime * 0.016) {
            this.cloneAttack(boss, playerPosition);
        }
    }
    
    executeStormPattern(deltaTime, boss, playerPosition) {
        // Intense barrage of projectiles
        const baseInterval = 100;
        const intensity = 1 + Math.sin(this.patternTimer * 0.01) * 0.5; // Variable intensity
        const interval = baseInterval / intensity;
        
        if (this.patternTimer % interval < deltaTime * 0.016) {
            this.createStormProjectiles(boss, playerPosition);
        }
    }
    
    executeUltimatePattern(deltaTime, boss, playerPosition) {
        // Combination of multiple patterns
        const phase = Math.floor(this.patternTimer / 2000) % 4;
        
        switch (phase) {
            case 0:
                this.executeSpiralPattern(deltaTime, boss, playerPosition);
                break;
            case 1:
                this.executeSpreadPattern(deltaTime, boss, playerPosition);
                break;
            case 2:
                this.executeHomingPattern(deltaTime, boss, playerPosition);
                break;
            case 3:
                this.executeLaserPattern(deltaTime, boss, playerPosition);
                break;
        }
    }
    
    // Projectile Creation Methods
    
    createStraightProjectiles(boss, playerPosition) {
        const centerX = boss.position.x + boss.width / 2;
        const centerY = boss.position.y + boss.height;
        
        // Calculate direction to player
        const dx = playerPosition.x - centerX;
        const dy = playerPosition.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speed = 5;
            const velocityX = (dx / distance) * speed;
            const velocityY = (dy / distance) * speed;
            
            boss.shoot([{
                position: { x: centerX, y: centerY },
                velocity: { x: velocityX, y: velocityY },
                damage: 2,
                color: '#ff4444'
            }]);
        }
    }
    
    createSpreadProjectiles(boss, playerPosition) {
        const centerX = boss.position.x + boss.width / 2;
        const centerY = boss.position.y + boss.height;
        const angles = [-30, -15, 0, 15, 30];
        const speed = 4;
        
        angles.forEach(angle => {
            const radians = angle * Math.PI / 180;
            const velocityX = Math.sin(radians) * speed;
            const velocityY = Math.cos(radians) * speed;
            
            boss.shoot([{
                position: { x: centerX, y: centerY },
                velocity: { x: velocityX, y: velocityY },
                damage: 1.5,
                color: '#ff6600'
            }]);
        });
    }
    
    createSpiralProjectiles(boss, patternTimer) {
        const centerX = boss.position.x + boss.width / 2;
        const centerY = boss.position.y + boss.height;
        const time = patternTimer * 0.01;
        const numArms = 6;
        const speed = 3;
        
        for (let i = 0; i < numArms; i++) {
            const angle = (i * (360 / numArms)) + time * 50;
            const radians = angle * Math.PI / 180;
            const velocityX = Math.cos(radians) * speed;
            const velocityY = Math.sin(radians) * speed;
            
            boss.shoot([{
                position: { x: centerX, y: centerY },
                velocity: { x: velocityX, y: velocityY },
                damage: 1,
                color: '#8844ff'
            }]);
        }
    }
    
    createHomingProjectiles(boss, playerPosition) {
        const centerX = boss.position.x + boss.width / 2;
        const centerY = boss.position.y + boss.height;
        const count = 3;
        
        for (let i = 0; i < count; i++) {
            const spread = (i - 1) * 20;
            const angle = Math.atan2(
                playerPosition.y - centerY, 
                playerPosition.x - centerX
            ) + spread * Math.PI / 180;
            
            boss.shoot([{
                position: { x: centerX, y: centerY },
                velocity: { 
                    x: Math.cos(angle) * 3, 
                    y: Math.sin(angle) * 3 
                },
                damage: 2.5,
                color: '#ff00ff',
                homing: true,
                target: playerPosition
            }]);
        }
    }
    
    createLaserBeam(boss, playerPosition, deltaTime) {
        // Laser warning first, then beam
        const centerX = boss.position.x + boss.width / 2;
        const centerY = boss.position.y + boss.height;
        
        if (this.patternTimer < 1000) {
            // Warning phase - draw targeting line
            this.drawLaserWarning(boss, playerPosition);
        } else {
            // Beam phase - create damaging laser
            boss.shoot([{
                position: { x: centerX, y: centerY },
                velocity: { x: 0, y: 8 },
                damage: 5,
                color: '#00ffff',
                width: 20,
                height: 400,
                type: 'laser'
            }]);
        }
    }
    
    createMine(boss) {
        const canvas = { width: 1024, height: 576 }; // Would be passed in
        const x = Math.random() * (canvas.width - 100) + 50;
        const y = Math.random() * (canvas.height * 0.6) + 50;
        
        boss.shoot([{
            position: { x, y },
            velocity: { x: 0, y: 0 },
            damage: 4,
            color: '#ff8800',
            type: 'mine',
            timer: 3000, // Explodes after 3 seconds
            radius: 30
        }]);
    }
    
    createStormProjectiles(boss, playerPosition) {
        const centerX = boss.position.x + boss.width / 2;
        const centerY = boss.position.y + boss.height;
        const count = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            
            boss.shoot([{
                position: { 
                    x: centerX + (Math.random() - 0.5) * boss.width,
                    y: centerY 
                },
                velocity: { 
                    x: Math.cos(angle) * speed, 
                    y: Math.sin(angle) * speed 
                },
                damage: 1.5,
                color: `hsl(${Math.random() * 60 + 300}, 70%, 60%)` // Random purple/pink
            }]);
        }
    }
    
    // Special Effect Methods
    
    teleportBoss(boss, playerPosition) {
        // Create teleport effect at current position
        this.createTeleportEffect(boss.position);
        
        // Move boss to new position (away from player but still threatening)
        const canvas = { width: 1024, height: 576 };
        const newX = playerPosition.x < canvas.width / 2 ? 
            canvas.width * 0.8 - boss.width : 
            canvas.width * 0.2;
        const newY = 50 + Math.random() * 100;
        
        boss.position.x = newX;
        boss.position.y = newY;
        
        // Create teleport effect at new position
        this.createTeleportEffect(boss.position);
    }
    
    createTeleportEffect(position) {
        // Create particle effect (would integrate with particle system)
        console.log(`Teleport effect at (${position.x}, ${position.y})`);
    }
    
    createTeleportAttack(boss, playerPosition) {
        // Powerful attack after teleporting
        this.createSpreadProjectiles(boss, playerPosition);
        this.createStraightProjectiles(boss, playerPosition);
    }
    
    createShadowClones(boss) {
        // Create visual clones (would be implemented in boss class)
        boss.shadowClones = [
            { 
                x: boss.position.x - 100, 
                y: boss.position.y,
                opacity: 0.6 
            },
            { 
                x: boss.position.x + 100, 
                y: boss.position.y,
                opacity: 0.6 
            }
        ];
    }
    
    cloneAttack(boss, playerPosition) {
        // Each clone attacks
        if (boss.shadowClones) {
            boss.shadowClones.forEach(clone => {
                // Attack from clone position
                const dx = playerPosition.x - clone.x;
                const dy = playerPosition.y - clone.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    const speed = 4;
                    boss.shoot([{
                        position: { x: clone.x, y: clone.y },
                        velocity: { 
                            x: (dx / distance) * speed, 
                            y: (dy / distance) * speed 
                        },
                        damage: 1.5,
                        color: '#666666'
                    }]);
                }
            });
        }
    }
    
    drawLaserWarning(boss, playerPosition) {
        // Visual warning for laser attack (would be implemented in rendering)
        const centerX = boss.position.x + boss.width / 2;
        const centerY = boss.position.y + boss.height;
        
        console.log(`Laser warning from (${centerX}, ${centerY}) to (${playerPosition.x}, ${playerPosition.y})`);
    }
    
    // Pattern Selection AI
    
    selectPatternByPersonality(personality, playerBehavior, bossHealth) {
        const healthRatio = bossHealth.current / bossHealth.max;
        
        switch (personality) {
            case 'aggressive':
                return this.selectAggressivePattern(playerBehavior, healthRatio);
                
            case 'tactical':
                return this.selectTacticalPattern(playerBehavior, healthRatio);
                
            case 'adaptive':
                return this.selectAdaptivePattern(playerBehavior, healthRatio);
                
            case 'unpredictable':
                return this.selectUnpredictablePattern(healthRatio);
                
            case 'supreme':
                return this.selectSupremePattern(playerBehavior, healthRatio);
                
            default:
                return 'straight';
        }
    }
    
    selectAggressivePattern(playerBehavior, healthRatio) {
        if (healthRatio < 0.3) {
            return 'storm';
        } else if (healthRatio < 0.6) {
            return Math.random() < 0.7 ? 'spread' : 'spiral';
        } else {
            return Math.random() < 0.5 ? 'straight' : 'spread';
        }
    }
    
    selectTacticalPattern(playerBehavior, healthRatio) {
        if (playerBehavior.movementPattern === 'stationary') {
            return 'homing';
        } else if (playerBehavior.accuracy > 0.8) {
            return 'teleport';
        } else if (healthRatio < 0.4) {
            return 'mines';
        } else {
            return Math.random() < 0.6 ? 'laser' : 'spread';
        }
    }
    
    selectAdaptivePattern(playerBehavior, healthRatio) {
        // Adapts based on player's recent performance
        if (playerBehavior.recentDamage > 50) {
            // Player is doing well, increase difficulty
            return healthRatio < 0.5 ? 'ultimate' : 'storm';
        } else if (playerBehavior.accuracy < 0.4) {
            // Player struggling, ease up slightly
            return Math.random() < 0.7 ? 'straight' : 'spread';
        } else {
            // Balanced approach
            const patterns = ['spread', 'spiral', 'homing', 'laser'];
            return patterns[Math.floor(Math.random() * patterns.length)];
        }
    }
    
    selectUnpredictablePattern(healthRatio) {
        const allPatterns = [
            'straight', 'spread', 'spiral', 'homing', 
            'laser', 'mines', 'teleport', 'clone'
        ];
        
        if (healthRatio < 0.25) {
            allPatterns.push('storm', 'ultimate');
        }
        
        return allPatterns[Math.floor(Math.random() * allPatterns.length)];
    }
    
    selectSupremePattern(playerBehavior, healthRatio) {
        if (healthRatio < 0.2) {
            return 'ultimate';
        } else if (healthRatio < 0.5) {
            const advancedPatterns = ['storm', 'clone', 'teleport', 'mines'];
            return advancedPatterns[Math.floor(Math.random() * advancedPatterns.length)];
        } else {
            const basicPatterns = ['spiral', 'homing', 'laser'];
            return basicPatterns[Math.floor(Math.random() * basicPatterns.length)];
        }
    }
    
    // Utility methods
    
    getPatternList() {
        return Array.from(this.patterns.keys());
    }
    
    getPatternInfo(patternName) {
        const pattern = this.patterns.get(patternName);
        return pattern ? {
            name: pattern.name,
            duration: pattern.duration,
            cooldown: pattern.cooldown
        } : null;
    }
    
    isPatternAvailable(patternName) {
        return this.patterns.has(patternName);
    }
}