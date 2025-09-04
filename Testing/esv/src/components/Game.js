// Core Game Logic Controller
// This class manages the main game loop, entities, and game state

import { GameConfig, ConfigUtils } from '../config.js';
import { Player } from '../classes/Player.js';
import { BossInvader } from '../classes/BossInvader.js';
import { Invader } from '../classes/Invader.js';
import { Grid } from '../classes/Grid.js';
import { Level } from '../classes/Level.js';
import { GameState } from '../classes/GameState.js';
import { Projectile } from '../classes/Projectile.js';
import { InvaderProjectile } from '../classes/InvaderProjectile.js';
import { Particle } from '../classes/Particle.js';
import { Bomb } from '../classes/Bomb.js';
import { PowerUp } from '../classes/PowerUp.js';

export class Game {
    constructor(canvas, ctx, config) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.config = config;
        
        // Game entities
        this.player = null;
        this.grids = [];
        this.boss = null;
        this.projectiles = [];
        this.invaderProjectiles = [];
        this.particles = [];
        this.bombs = [];
        this.powerUps = [];
        
        // Game state management
        this.gameState = new GameState();
        this.currentLevel = null;
        this.levelData = null;
        
        // Input handling
        this.keys = {
            a: { pressed: false },
            d: { pressed: false },
            space: { pressed: false },
            ArrowLeft: { pressed: false },
            ArrowRight: { pressed: false }
        };
        
        // Game timing
        this.lastTime = 0;
        this.frames = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTime = 0;
        
        // Game mechanics
        this.spawnTimer = 0;
        this.powerUpTimer = 0;
        this.bombTimer = 0;
        this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
        
        // Background elements
        this.stars = [];
        this.initializeStars();
        
        // Audio context (will be set by main game)
        this.audio = null;
        
        // Performance monitoring
        this.performanceMetrics = {
            entityCount: 0,
            particleCount: 0,
            drawCalls: 0,
            updateTime: 0,
            renderTime: 0
        };
    }
    
    async loadAssets() {
        // This would typically load images and sounds
        // For now, we'll use placeholder loading
        return new Promise((resolve) => {
            setTimeout(resolve, 100); // Simulate loading time
        });
    }
    
    async startLevel(levelNumber) {
        try {
            // Reset game state
            this.reset();
            
            // Load level data
            this.currentLevel = new Level(levelNumber);
            this.levelData = await this.currentLevel.load();
            
            // Initialize player
            this.player = new Player({
                canvas: this.canvas,
                config: this.config
            });
            
            // Set initial game state
            this.gameState.setLevel(levelNumber);
            this.gameState.setGameState('playing');
            this.gameState.setLives(this.config.player.maxLives);
            
            // Start spawning enemies
            this.spawnEnemyWave();
            
            console.log(`🎮 Level ${levelNumber} started: ${this.levelData.name}`);
            
        } catch (error) {
            console.error('Failed to start level:', error);
            throw error;
        }
    }
    
    reset() {
        // Clear all entities
        this.grids = [];
        this.boss = null;
        this.projectiles = [];
        this.invaderProjectiles = [];
        this.particles = [];
        this.bombs = [];
        this.powerUps = [];
        
        // Reset timers
        this.frames = 0;
        this.spawnTimer = 0;
        this.powerUpTimer = 0;
        this.bombTimer = 0;
        
        // Reset screen effects
        this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
        
        // Reset game state
        this.gameState.reset();
    }
    
    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Skip frame if game is not active
        if (this.gameState.getGameState() !== 'playing') return;
        
        const updateStart = performance.now();
        
        // Update frame counter
        this.frames++;
        this.updateFPS(deltaTime);
        
        // Update game entities
        this.updatePlayer(deltaTime);
        this.updateProjectiles(deltaTime);
        this.updateInvaderProjectiles(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateBoss(deltaTime);
        this.updateParticles(deltaTime);
        this.updateBombs(deltaTime);
        this.updatePowerUps(deltaTime);
        
        // Update game mechanics
        this.updateSpawning(deltaTime);
        this.updateCollisions(deltaTime);
        this.updateScreenShake(deltaTime);
        
        // Check game conditions
        this.checkGameConditions();
        
        // Update performance metrics
        this.performanceMetrics.updateTime = performance.now() - updateStart;
        this.performanceMetrics.entityCount = this.getTotalEntityCount();
    }
    
    render() {
        const renderStart = performance.now();
        
        // Clear canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply screen shake
        this.ctx.save();
        if (this.screenShake.duration > 0) {
            this.ctx.translate(this.screenShake.x, this.screenShake.y);
        }
        
        // Render background
        this.renderBackground();
        
        // Render game entities
        this.renderParticles();
        this.renderBombs();
        this.renderPowerUps();
        this.renderEnemies();
        this.renderBoss();
        this.renderProjectiles();
        this.renderInvaderProjectiles();
        this.renderPlayer();
        
        // Render effects
        this.renderScreenEffects();
        
        // Restore context
        this.ctx.restore();
        
        // Render UI overlays
        this.renderDebugInfo();
        
        // Update performance metrics
        this.performanceMetrics.renderTime = performance.now() - renderStart;
        this.performanceMetrics.drawCalls++;
    }
    
    // Entity update methods
    updatePlayer(deltaTime) {
        if (!this.player) return;
        
        // Handle input
        this.handlePlayerInput();
        
        // Update player
        this.player.update(deltaTime);
        
        // Check boundaries
        this.player.checkBoundaries(this.canvas);
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            // Remove if off screen
            if (projectile.position.y < -projectile.radius) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    updateInvaderProjectiles(deltaTime) {
        for (let i = this.invaderProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.invaderProjectiles[i];
            projectile.update(deltaTime);
            
            // Remove if off screen
            if (projectile.position.y > this.canvas.height + projectile.height) {
                this.invaderProjectiles.splice(i, 1);
            }
        }
    }
    
    updateEnemies(deltaTime) {
        for (let i = this.grids.length - 1; i >= 0; i--) {
            const grid = this.grids[i];
            grid.update(deltaTime, this.canvas);
            
            // Remove empty grids
            if (grid.invaders.length === 0) {
                this.grids.splice(i, 1);
            }
            
            // Enemy shooting
            if (this.frames % 100 === 0 && grid.invaders.length > 0) {
                const randomInvader = grid.invaders[Math.floor(Math.random() * grid.invaders.length)];
                randomInvader.shoot(this.invaderProjectiles);
            }
        }
    }
    
    updateBoss(deltaTime) {
        if (!this.boss) return;
        
        const playerPosition = this.player ? this.player.position : { x: this.canvas.width / 2, y: this.canvas.height - 100 };
        const gameEvents = this.gatherGameEvents();
        
        this.boss.update(deltaTime, playerPosition, gameEvents, this.invaderProjectiles);
        
        // Check if boss is defeated
        if (this.boss.isDefeated()) {
            this.onBossDefeated();
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
        
        // Limit particle count for performance
        if (this.particles.length > this.config.performance.maxParticles) {
            this.particles.splice(0, this.particles.length - this.config.performance.maxParticles);
        }
    }
    
    updateBombs(deltaTime) {
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.update(deltaTime);
            
            if (bomb.isExpired()) {
                this.bombs.splice(i, 1);
            }
        }
    }
    
    updatePowerUps(deltaTime) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(deltaTime);
            
            // Remove if off screen
            if (powerUp.position.x > this.canvas.width + powerUp.radius) {
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    // Game mechanics
    updateSpawning(deltaTime) {
        this.spawnTimer += deltaTime;
        this.powerUpTimer += deltaTime;
        this.bombTimer += deltaTime;
        
        // Spawn enemy waves
        if (this.shouldSpawnEnemyWave()) {
            this.spawnEnemyWave();
        }
        
        // Spawn boss
        if (this.shouldSpawnBoss()) {
            this.spawnBoss();
        }
        
        // Spawn power-ups
        if (this.powerUpTimer > 10000) { // Every 10 seconds
            this.spawnPowerUp();
            this.powerUpTimer = 0;
        }
        
        // Spawn bombs
        if (this.bombTimer > 8000 && this.bombs.length < 3) { // Every 8 seconds, max 3
            this.spawnBomb();
            this.bombTimer = 0;
        }
    }
    
    updateCollisions(deltaTime) {
        this.checkProjectileEnemyCollisions();
        this.checkProjectileBossCollisions();
        this.checkProjectileBombCollisions();
        this.checkPlayerEnemyCollisions();
        this.checkPlayerProjectileCollisions();
        this.checkPlayerPowerUpCollisions();
        this.checkPlayerBombCollisions();
    }
    
    updateScreenShake(deltaTime) {
        if (this.screenShake.duration > 0) {
            this.screenShake.duration -= deltaTime;
            
            if (this.screenShake.duration <= 0) {
                this.screenShake.x = 0;
                this.screenShake.y = 0;
                this.screenShake.intensity = 0;
            } else {
                const intensity = this.screenShake.intensity * (this.screenShake.duration / 1000);
                this.screenShake.x = (Math.random() - 0.5) * intensity;
                this.screenShake.y = (Math.random() - 0.5) * intensity;
            }
        }
    }
    
    // Collision detection methods
    checkProjectileEnemyCollisions() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            for (let j = this.grids.length - 1; j >= 0; j--) {
                const grid = this.grids[j];
                
                for (let k = grid.invaders.length - 1; k >= 0; k--) {
                    const invader = grid.invaders[k];
                    
                    if (this.checkCollision(projectile, invader)) {
                        // Handle collision
                        this.onEnemyHit(invader, projectile, grid, k);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
                
                if (i >= this.projectiles.length) break; // Projectile was removed
            }
        }
    }
    
    checkProjectileBossCollisions() {
        if (!this.boss) return;
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            if (this.checkCollision(projectile, this.boss)) {
                const damage = projectile.damage || this.config.projectiles.player.damage;
                
                if (this.boss.takeDamage(damage, 'player')) {
                    this.onBossHit(this.boss, projectile, damage);
                    this.projectiles.splice(i, 1);
                }
            }
        }
    }
    
    checkPlayerProjectileCollisions() {
        if (!this.player) return;
        
        for (let i = this.invaderProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.invaderProjectiles[i];
            
            if (this.checkCollision(this.player, projectile)) {
                this.onPlayerHit(projectile);
                this.invaderProjectiles.splice(i, 1);
            }
        }
    }
    
    checkPlayerPowerUpCollisions() {
        if (!this.player) return;
        
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (this.checkCollision(this.player, powerUp)) {
                this.onPowerUpCollected(powerUp);
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    // Collision event handlers
    onEnemyHit(invader, projectile, grid, index) {
        // Add score
        const score = invader.scoreValue || this.config.enemies.basic.score;
        this.gameState.addScore(score);
        
        // Create explosion effect
        this.createExplosion(invader.position, 'enemy');
        
        // Remove invader
        grid.invaders.splice(index, 1);
        
        // Update grid bounds
        grid.updateBounds();
        
        // Play sound
        if (this.audio) {
            this.audio.playSound('explode');
        }
        
        // Screen shake
        this.addScreenShake(3, 200);
        
        console.log(`Enemy destroyed! Score: +${score}`);
    }
    
    onBossHit(boss, projectile, damage) {
        // Create damage effect
        this.createExplosion(projectile.position, 'boss');
        
        // Screen shake based on damage
        this.addScreenShake(Math.min(damage / 5, 8), 300);
        
        // Play sound
        if (this.audio) {
            this.audio.playSound('explode');
        }
        
        console.log(`Boss hit for ${damage} damage! Health: ${boss.health}/${boss.maxHealth}`);
    }
    
    onBossDefeated() {
        // Add boss score
        const score = this.boss.getScoreValue();
        this.gameState.addScore(score);
        
        // Create massive explosion
        this.createExplosion(this.boss.position, 'boss', 3.0);
        
        // Screen shake
        this.addScreenShake(15, 1000);
        
        // Complete level
        this.gameState.setGameState('levelComplete');
        
        // Play victory sound
        if (this.audio) {
            this.audio.playSound('victory');
        }
        
        console.log(`🎉 Boss defeated! Level complete! Score: +${score}`);
        
        // Clean up boss
        this.boss = null;
    }
    
    onPlayerHit(projectile) {
        if (this.player.isInvulnerable()) return;
        
        // Reduce lives
        this.gameState.reduceLives();
        
        // Create explosion
        this.createExplosion(this.player.position, 'player');
        
        // Make player invulnerable temporarily
        this.player.setInvulnerable(this.config.player.invulnerabilityTime);
        
        // Screen shake
        this.addScreenShake(10, 500);
        
        // Play sound
        if (this.audio) {
            this.audio.playSound('playerHit');
        }
        
        // Check game over
        if (this.gameState.getLives() <= 0) {
            this.gameState.setGameState('gameOver');
        }
        
        console.log(`Player hit! Lives remaining: ${this.gameState.getLives()}`);
    }
    
    onPowerUpCollected(powerUp) {
        // Apply power-up effect
        this.player.applyPowerUp(powerUp.type, powerUp.config);
        
        // Add score
        this.gameState.addScore(500);
        
        // Create collection effect
        this.createExplosion(powerUp.position, 'powerUp');
        
        // Play sound
        if (this.audio) {
            this.audio.playSound('bonus');
        }
        
        console.log(`Power-up collected: ${powerUp.type}`);
    }
    
    // Spawning methods
    shouldSpawnEnemyWave() {
        return this.grids.length === 0 && !this.boss && this.spawnTimer > 2000;
    }
    
    shouldSpawnBoss() {
        return this.grids.length === 0 && !this.boss && this.gameState.getCurrentWave() >= this.levelData.waveCount;
    }
    
    spawnEnemyWave() {
        const wave = this.gameState.getCurrentWave();
        const difficulty = ConfigUtils.getDifficultyMultiplier(this.config.difficulty, 'spawnRateMultiplier');
        
        // Create enemy grid
        const grid = new Grid({
            level: this.gameState.getLevel(),
            wave: wave,
            difficulty: difficulty,
            canvas: this.canvas,
            enemyTypes: this.levelData.enemyTypes
        });
        
        this.grids.push(grid);
        this.gameState.nextWave();
        this.spawnTimer = 0;
        
        console.log(`Wave ${wave} spawned with ${grid.invaders.length} enemies`);
    }
    
    spawnBoss() {
        const level = this.gameState.getLevel();
        
        this.boss = new BossInvader({
            position: { 
                x: this.canvas.width / 2 - 60, 
                y: 50 
            },
            level: level,
            canvas: this.canvas
        });
        
        console.log(`Boss spawned: ${this.boss.getName()}`);
        
        // Play boss music
        if (this.audio) {
            this.audio.playBossMusic();
        }
    }
    
    spawnPowerUp() {
        const powerUpTypes = ['machineGun', 'spread', 'laser', 'shield'];
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        const powerUp = new PowerUp({
            position: { x: -30, y: Math.random() * (this.canvas.height * 0.6) + 50 },
            velocity: { x: 3, y: 0 },
            type: randomType,
            config: this.config.powerUps[randomType]
        });
        
        this.powerUps.push(powerUp);
    }
    
    spawnBomb() {
        const bomb = new Bomb({
            position: {
                x: Math.random() * (this.canvas.width - 100) + 50,
                y: Math.random() * (this.canvas.height * 0.5) + 50
            },
            velocity: {
                x: (Math.random() - 0.5) * 4,
                y: (Math.random() - 0.5) * 4
            }
        });
        
        this.bombs.push(bomb);
    }
    
    // Input handling
    handlePlayerInput() {
        if (!this.player) return;
        
        const leftPressed = this.keys.a.pressed || this.keys.ArrowLeft.pressed;
        const rightPressed = this.keys.d.pressed || this.keys.ArrowRight.pressed;
        
        if (leftPressed && this.player.position.x > 0) {
            this.player.velocity.x = -this.config.player.speed;
            this.player.rotation = -0.1;
        } else if (rightPressed && this.player.position.x + this.player.width < this.canvas.width) {
            this.player.velocity.x = this.config.player.speed;
            this.player.rotation = 0.1;
        } else {
            this.player.velocity.x = 0;
            this.player.rotation = 0;
        }
        
        if (this.keys.space.pressed) {
            this.handlePlayerShooting();
        }
    }
    
    handlePlayerShooting() {
        if (!this.player) return;
        
        const projectiles = this.player.shoot();
        if (projectiles.length > 0) {
            this.projectiles.push(...projectiles);
            
            // Play shoot sound
            if (this.audio) {
                this.audio.playSound('shoot');
            }
        }
    }
    
    handleKeyDown(event) {
        const key = event.code || event.key;
        
        if (this.keys.hasOwnProperty(key) || this.keys.hasOwnProperty(event.key)) {
            const keyName = this.keys.hasOwnProperty(key) ? key : event.key;
            this.keys[keyName].pressed = true;
        }
        
        // Prevent default browser behavior
        event.preventDefault();
    }
    
    handleKeyUp(event) {
        const key = event.code || event.key;
        
        if (this.keys.hasOwnProperty(key) || this.keys.hasOwnProperty(event.key)) {
            const keyName = this.keys.hasOwnProperty(key) ? key : event.key;
            this.keys[keyName].pressed = false;
        }
        
        event.preventDefault();
    }
    
    // Utility methods
    checkCollision(obj1, obj2) {
        // Simple AABB collision detection
        return obj1.position.x < obj2.position.x + obj2.width &&
               obj1.position.x + obj1.width > obj2.position.x &&
               obj1.position.y < obj2.position.y + obj2.height &&
               obj1.position.y + obj1.height > obj2.position.y;
    }
    
    createExplosion(position, type, scale = 1.0) {
        const config = this.config.effects.particles.explosion;
        const colors = config.colors;
        const count = Math.floor(config.count * scale);
        
        for (let i = 0; i < count; i++) {
            const particle = new Particle({
                position: {
                    x: position.x + (Math.random() - 0.5) * 20 * scale,
                    y: position.y + (Math.random() - 0.5) * 20 * scale
                },
                velocity: {
                    x: (Math.random() - 0.5) * config.speed * scale,
                    y: (Math.random() - 0.5) * config.speed * scale
                },
                radius: Math.random() * 4 * scale + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: config.life * scale,
                fades: true
            });
            
            this.particles.push(particle);
        }
    }
    
    addScreenShake(intensity, duration) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
        this.screenShake.duration = Math.max(this.screenShake.duration, duration);
    }
    
    gatherGameEvents() {
        return {
            playerFired: this.keys.space.pressed,
            playerHit: false, // Would be set by collision detection
            enemiesDestroyed: 0, // Would be tracked per frame
            bossPhaseChange: false // Would be set by boss state
        };
    }
    
    // Rendering methods
    renderBackground() {
        // Render animated stars
        this.ctx.fillStyle = 'white';
        for (const star of this.stars) {
            this.ctx.globalAlpha = star.opacity;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
            
            // Move stars down
            star.y += star.speed;
            if (star.y > this.canvas.height) {
                star.y = -star.size;
                star.x = Math.random() * this.canvas.width;
            }
        }
        this.ctx.globalAlpha = 1;
    }
    
    renderPlayer() {
        if (this.player) {
            this.player.draw(this.ctx);
        }
    }
    
    renderEnemies() {
        this.grids.forEach(grid => {
            grid.draw(this.ctx);
        });
    }
    
    renderBoss() {
        if (this.boss) {
            this.boss.draw(this.ctx);
        }
    }
    
    renderProjectiles() {
        this.projectiles.forEach(projectile => {
            projectile.draw(this.ctx);
        });
    }
    
    renderInvaderProjectiles() {
        this.invaderProjectiles.forEach(projectile => {
            projectile.draw(this.ctx);
        });
    }
    
    renderParticles() {
        this.particles.forEach(particle => {
            particle.draw(this.ctx);
        });
    }
    
    renderBombs() {
        this.bombs.forEach(bomb => {
            bomb.draw(this.ctx);
        });
    }
    
    renderPowerUps() {
        this.powerUps.forEach(powerUp => {
            powerUp.draw(this.ctx);
        });
    }
    
    renderScreenEffects() {
        // Flash effect for damage
        if (this.gameState.getLives() < this.config.player.maxLives) {
            const flashIntensity = Math.sin(this.frames * 0.3) * 0.1 + 0.1;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${flashIntensity})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    renderDebugInfo() {
        if (!this.config.debug.showFPS && !this.config.debug.showCollisionBoxes) return;
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        
        if (this.config.debug.showFPS) {
            this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
            this.ctx.fillText(`Entities: ${this.performanceMetrics.entityCount}`, 10, 35);
            this.ctx.fillText(`Particles: ${this.particles.length}`, 10, 50);
        }
    }
    
    // Initialization
    initializeStars() {
        const starCount = this.config.effects.particles.stars.count;
        
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
    }
    
    updateFPS(deltaTime) {
        this.fpsTime += deltaTime;
        this.fpsCounter++;
        
        if (this.fpsTime >= 1000) {
            this.fps = Math.round(this.fpsCounter * 1000 / this.fpsTime);
            this.fpsTime = 0;
            this.fpsCounter = 0;
        }
    }
    
    getTotalEntityCount() {
        let count = 0;
        count += this.grids.reduce((sum, grid) => sum + grid.invaders.length, 0);
        count += this.projectiles.length;
        count += this.invaderProjectiles.length;
        count += this.bombs.length;
        count += this.powerUps.length;
        if (this.boss) count++;
        if (this.player) count++;
        return count;
    }
    
    checkGameConditions() {
        // Check if level is complete
        if (this.grids.length === 0 && !this.boss && this.gameState.getGameState() === 'playing') {
            if (this.gameState.getCurrentWave() >= this.levelData.waveCount) {
                this.gameState.setGameState('levelComplete');
            }
        }
    }
    
    // Public interface
    getGameData() {
        return {
            score: this.gameState.getScore(),
            level: this.gameState.getLevel(),
            lives: this.gameState.getLives(),
            wave: this.gameState.getCurrentWave(),
            gameState: this.gameState.getGameState(),
            boss: this.boss ? {
                name: this.boss.getName(),
                health: this.boss.health,
                maxHealth: this.boss.maxHealth,
                isActive: true
            } : null,
            levelTime: this.gameState.getLevelTime(),
            accuracy: this.gameState.getAccuracy()
        };
    }
    
    getGameState() {
        return this.gameState.serialize();
    }
    
    setAudioManager(audio) {
        this.audio = audio;
    }
    
    pause() {
        this.gameState.setGameState('paused');
    }
    
    resume() {
        this.gameState.setGameState('playing');
    }
    
    destroy() {
        // Clean up resources
        this.grids = [];
        this.projectiles = [];
        this.invaderProjectiles = [];
        this.particles = [];
        this.bombs = [];
        this.powerUps = [];
        this.boss = null;
        this.player = null;
    }
}