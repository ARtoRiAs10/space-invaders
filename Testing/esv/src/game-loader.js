// Game Loader - Simplified initialization without complex module dependencies
// This loads and starts the basic game functionality

// Simple game configuration
const GameConfig = {
    canvas: {
        width: 1024,
        height: 576
    },
    debug: {
        enabled: true,
        showFPS: true,
        showCollisionBoxes: false
    },
    player: {
        speed: 5,
        fireRate: 200, // milliseconds between shots
        maxLives: 3
    },
    enemies: {
        speed: 1,
        fireRate: 0.002 // probability per frame
    }
};

// Simple Player class
class SimplePlayer {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 40;
        this.height = 30;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = GameConfig.player.speed;
        this.lives = GameConfig.player.maxLives;
        
        // Movement
        this.keys = {};
        this.lastShotTime = 0;
        
        // Setup controls
        this.setupControls();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    update(deltaTime, game) {
        // Movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.x = Math.max(0, this.x - this.speed);
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.x = Math.min(this.canvas.width - this.width, this.x + this.speed);
        }
        
        // Shooting
        if (this.keys['Space']) {
            this.shoot(game);
        }
    }
    
    shoot(game) {
        const now = Date.now();
        if (now - this.lastShotTime >= GameConfig.player.fireRate) {
            game.addPlayerProjectile({
                x: this.x + this.width / 2 - 2,
                y: this.y,
                width: 4,
                height: 12,
                speed: 8
            });
            this.lastShotTime = now;
        }
    }
    
    draw(ctx) {
        // Simple player ship
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + this.width/2 - 3, this.y + 5, 6, 8);
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

// Simple Enemy class
class SimpleEnemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 20;
        this.speed = GameConfig.enemies.speed;
        this.destroyed = false;
        this.lastShotTime = 0;
    }
    
    update(deltaTime, game) {
        // Simple AI - occasionally shoot
        if (Math.random() < GameConfig.enemies.fireRate) {
            game.addEnemyProjectile({
                x: this.x + this.width / 2 - 2,
                y: this.y + this.height,
                width: 4,
                height: 8,
                speed: 3
            });
        }
    }
    
    draw(ctx) {
        if (this.destroyed) return;
        
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y + 5, 4, 4);
        ctx.fillRect(this.x + this.width - 9, this.y + 5, 4, 4);
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    
    destroy() {
        this.destroyed = true;
    }
}

// Simple Projectile class
class SimpleProjectile {
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.width = config.width;
        this.height = config.height;
        this.speed = config.speed;
        this.owner = config.owner || 'player';
        this.destroyed = false;
    }
    
    update(deltaTime) {
        if (this.owner === 'player') {
            this.y -= this.speed;
        } else {
            this.y += this.speed;
        }
        
        // Remove if off screen
        if (this.y < -this.height || this.y > 600) {
            this.destroyed = true;
        }
    }
    
    draw(ctx) {
        if (this.destroyed) return;
        
        ctx.fillStyle = this.owner === 'player' ? '#ffff00' : '#ff8844';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

// Simple Game class
class SimpleGame {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Game objects
        this.player = new SimplePlayer(canvas);
        this.enemies = [];
        this.playerProjectiles = [];
        this.enemyProjectiles = [];
        
        // Game state
        this.score = 0;
        this.gameState = 'playing'; // playing, paused, gameOver
        this.lastFrameTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Initialize enemies
        this.createEnemies();
        
        // Start game loop
        this.startGameLoop();
    }
    
    createEnemies() {
        const rows = 5;
        const cols = 10;
        const spacing = 60;
        const startX = 100;
        const startY = 50;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * spacing;
                const y = startY + row * 40;
                this.enemies.push(new SimpleEnemy(x, y));
            }
        }
    }
    
    addPlayerProjectile(config) {
        config.owner = 'player';
        this.playerProjectiles.push(new SimpleProjectile(config));
    }
    
    addEnemyProjectile(config) {
        config.owner = 'enemy';
        this.enemyProjectiles.push(new SimpleProjectile(config));
    }
    
    startGameLoop() {
        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            
            // Update FPS
            this.updateFPS(currentTime);
            
            // Update game
            this.update(deltaTime);
            
            // Render game
            this.render();
            
            if (this.gameState === 'playing') {
                requestAnimationFrame(gameLoop);
            }
        };
        
        requestAnimationFrame(gameLoop);
    }
    
    updateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Update player
        this.player.update(deltaTime, this);
        
        // Update enemies
        this.enemies.forEach(enemy => {
            if (!enemy.destroyed) {
                enemy.update(deltaTime, this);
            }
        });
        
        // Update projectiles
        this.playerProjectiles.forEach(projectile => projectile.update(deltaTime));
        this.enemyProjectiles.forEach(projectile => projectile.update(deltaTime));
        
        // Remove destroyed projectiles
        this.playerProjectiles = this.playerProjectiles.filter(p => !p.destroyed);
        this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.destroyed);
        
        // Check collisions
        this.checkCollisions();
        
        // Remove destroyed enemies
        this.enemies = this.enemies.filter(enemy => !enemy.destroyed);
        
        // Check win/lose conditions
        this.checkGameState();
    }
    
    checkCollisions() {
        // Player projectiles vs enemies
        this.playerProjectiles.forEach(projectile => {
            this.enemies.forEach(enemy => {
                if (!enemy.destroyed && !projectile.destroyed && this.isColliding(projectile, enemy)) {
                    enemy.destroy();
                    projectile.destroyed = true;
                    this.score += 100;
                }
            });
        });
        
        // Enemy projectiles vs player
        this.enemyProjectiles.forEach(projectile => {
            if (!projectile.destroyed && this.isColliding(projectile, this.player)) {
                projectile.destroyed = true;
                this.player.lives--;
                if (this.player.lives <= 0) {
                    this.gameState = 'gameOver';
                }
            }
        });
    }
    
    isColliding(obj1, obj2) {
        const bounds1 = obj1.getBounds();
        const bounds2 = obj2.getBounds();
        
        return bounds1.x < bounds2.x + bounds2.width &&
               bounds1.x + bounds1.width > bounds2.x &&
               bounds1.y < bounds2.y + bounds2.height &&
               bounds1.y + bounds1.height > bounds2.y;
    }
    
    checkGameState() {
        // Check if all enemies destroyed
        if (this.enemies.length === 0) {
            this.score += 1000;
            this.createEnemies(); // Create new wave
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000022';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars background
        this.drawStars();
        
        if (this.gameState === 'playing') {
            // Draw game objects
            this.player.draw(this.ctx);
            
            this.enemies.forEach(enemy => enemy.draw(this.ctx));
            this.playerProjectiles.forEach(projectile => projectile.draw(this.ctx));
            this.enemyProjectiles.forEach(projectile => projectile.draw(this.ctx));
            
            // Draw UI
            this.drawUI();
        } else if (this.gameState === 'gameOver') {
            this.drawGameOver();
        }
        
        // Draw debug info
        if (GameConfig.debug.showFPS) {
            this.drawDebugInfo();
        }
    }
    
    drawStars() {
        this.ctx.fillStyle = 'white';
        for (let i = 0; i < 100; i++) {
            const x = (i * 97) % this.canvas.width; // Pseudo-random but consistent
            const y = (i * 73) % this.canvas.height;
            const size = (i % 3) + 1;
            this.ctx.fillRect(x, y, size, size);
        }
    }
    
    drawUI() {
        // Score
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 24px Orbitron, monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
        
        // Lives
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Orbitron, monospace';
        this.ctx.fillText(`LIVES: ${this.player.lives}`, 20, 70);
        
        // Instructions
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('ARROW KEYS / WASD: Move', this.canvas.width - 20, this.canvas.height - 40);
        this.ctx.fillText('SPACE: Shoot', this.canvas.width - 20, this.canvas.height - 20);
    }
    
    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = 'bold 48px Orbitron, monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Orbitron, monospace';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Reload page to play again', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }
    
    drawDebugInfo() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`FPS: ${this.fps}`, 10, this.canvas.height - 80);
        this.ctx.fillText(`Enemies: ${this.enemies.length}`, 10, this.canvas.height - 60);
        this.ctx.fillText(`Player Projectiles: ${this.playerProjectiles.length}`, 10, this.canvas.height - 40);
        this.ctx.fillText(`Enemy Projectiles: ${this.enemyProjectiles.length}`, 10, this.canvas.height - 20);
    }
}

// Export the initialization function
export async function initializeGame() {
    console.log('🎮 Starting Simple Space Invaders...');
    
    try {
        // Get canvas
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        if (!canvas || !ctx) {
            throw new Error('Canvas not found or context not available');
        }
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        // Create and start game
        const game = new SimpleGame(canvas, ctx);
        
        // Make game globally available for debugging
        window.game = game;
        
        console.log('✅ Game initialized successfully');
        
        return game;
        
    } catch (error) {
        console.error('❌ Game initialization failed:', error);
        throw error;
    }
}