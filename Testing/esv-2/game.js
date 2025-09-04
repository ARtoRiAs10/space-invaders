// Complete Working Space Invaders Game
// This is the main game file that contains all the game logic

// Game Configuration
const CONFIG = {
    canvas: {
        width: 1024,
        height: 576
    },
    player: {
        speed: 5,
        fireRate: 200,
        maxLives: 3,
        width: 40,
        height: 30
    },
    enemy: {
        speed: 1,
        fireRate: 0.002,
        width: 30,
        height: 20,
        rows: 5,
        cols: 10,
        spacing: 60
    },
    projectile: {
        playerSpeed: 8,
        enemySpeed: 3,
        width: 4,
        height: 12
    }
};

// Player Class
class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = CONFIG.player.width;
        this.height = CONFIG.player.height;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = CONFIG.player.speed;
        this.lives = CONFIG.player.maxLives;
        this.score = 0;
        
        // Input handling
        this.keys = {};
        this.lastShotTime = 0;
        
        this.setupControls();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            e.preventDefault();
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
        if (now - this.lastShotTime >= CONFIG.player.fireRate) {
            game.addPlayerProjectile({
                x: this.x + this.width / 2 - CONFIG.projectile.width / 2,
                y: this.y,
                width: CONFIG.projectile.width,
                height: CONFIG.projectile.height,
                speed: CONFIG.projectile.playerSpeed,
                owner: 'player'
            });
            this.lastShotTime = now;
        }
    }
    
    takeDamage() {
        this.lives--;
        return this.lives <= 0;
    }
    
    addScore(points) {
        this.score += points;
    }
    
    draw(ctx) {
        // Player ship body
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + this.width/2 - 3, this.y + 5, 6, 8);
        
        // Wings
        ctx.fillStyle = '#0088cc';
        ctx.fillRect(this.x + 5, this.y + this.height - 8, 8, 8);
        ctx.fillRect(this.x + this.width - 13, this.y + this.height - 8, 8, 8);
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

// Enemy Class
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.width = CONFIG.enemy.width;
        this.height = CONFIG.enemy.height;
        this.speed = CONFIG.enemy.speed;
        this.type = type;
        this.destroyed = false;
        this.animationFrame = 0;
        this.lastAnimationTime = 0;
        this.points = 100;
    }
    
    update(deltaTime, game) {
        // Simple animation
        this.lastAnimationTime += deltaTime;
        if (this.lastAnimationTime >= 500) {
            this.animationFrame = (this.animationFrame + 1) % 2;
            this.lastAnimationTime = 0;
        }
        
        // Occasional shooting
        if (Math.random() < CONFIG.enemy.fireRate) {
            game.addEnemyProjectile({
                x: this.x + this.width / 2 - CONFIG.projectile.width / 2,
                y: this.y + this.height,
                width: CONFIG.projectile.width,
                height: CONFIG.projectile.height,
                speed: CONFIG.projectile.enemySpeed,
                owner: 'enemy'
            });
        }
    }
    
    draw(ctx) {
        if (this.destroyed) return;
        
        // Enemy body
        ctx.fillStyle = this.animationFrame === 0 ? '#ff4444' : '#ff6666';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y + 4, 3, 3);
        ctx.fillRect(this.x + this.width - 8, this.y + 4, 3, 3);
        
        // Tentacles/legs
        ctx.fillStyle = '#cc2222';
        for (let i = 0; i < 3; i++) {
            const legX = this.x + 5 + i * 8;
            ctx.fillRect(legX, this.y + this.height, 2, 4);
        }
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

// Projectile Class
class Projectile {
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.width = config.width;
        this.height = config.height;
        this.speed = config.speed;
        this.owner = config.owner;
        this.destroyed = false;
    }
    
    update(deltaTime) {
        if (this.owner === 'player') {
            this.y -= this.speed;
        } else {
            this.y += this.speed;
        }
        
        // Remove if off screen
        if (this.y < -this.height || this.y > CONFIG.canvas.height + this.height) {
            this.destroyed = true;
        }
    }
    
    draw(ctx) {
        if (this.destroyed) return;
        
        if (this.owner === 'player') {
            // Player projectile - bright yellow/white
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Bright tip
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(this.x, this.y, this.width, 2);
        } else {
            // Enemy projectile - red/orange
            ctx.fillStyle = '#ff8844';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Darker tip
            ctx.fillStyle = '#cc4422';
            ctx.fillRect(this.x, this.y + this.height - 2, this.width, 2);
        }
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

// Particle Class for visual effects
class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = 2 + Math.random() * 2;
    }
    
    update(deltaTime) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= deltaTime * 0.001;
        
        // Fade out
        this.alpha = this.life / this.maxLife;
    }
    
    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.restore();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

// Main Game Class
class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Game objects
        this.player = new Player(canvas);
        this.enemies = [];
        this.playerProjectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        
        // Game state
        this.gameState = 'playing'; // playing, paused, gameOver, victory
        this.level = 1;
        this.wave = 1;
        
        // Performance tracking
        this.lastFrameTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Background stars
        this.stars = this.generateStars(150);
        
        // Initialize first wave
        this.createEnemyWave();
        
        // Start game loop
        this.startGameLoop();
    }
    
    generateStars(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.5,
                twinkle: Math.random() * Math.PI * 2
            });
        }
        return stars;
    }
    
    createEnemyWave() {
        this.enemies = [];
        const startX = 100;
        const startY = 50;
        
        for (let row = 0; row < CONFIG.enemy.rows; row++) {
            for (let col = 0; col < CONFIG.enemy.cols; col++) {
                const x = startX + col * CONFIG.enemy.spacing;
                const y = startY + row * 50;
                this.enemies.push(new Enemy(x, y));
            }
        }
    }
    
    addPlayerProjectile(config) {
        this.playerProjectiles.push(new Projectile(config));
    }
    
    addEnemyProjectile(config) {
        this.enemyProjectiles.push(new Projectile(config));
    }
    
    createExplosion(x, y, color = '#ffaa00') {
        // Create explosion particles
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const particle = new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                800 + Math.random() * 400
            );
            this.particles.push(particle);
        }
    }
    
    startGameLoop() {
        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            
            this.updateFPS(currentTime);
            this.update(deltaTime);
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
        
        // Update particles
        this.particles.forEach(particle => particle.update(deltaTime));
        
        // Remove destroyed objects
        this.playerProjectiles = this.playerProjectiles.filter(p => !p.destroyed);
        this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.destroyed);
        this.particles = this.particles.filter(p => !p.isDead());
        
        // Check collisions
        this.checkCollisions();
        
        // Remove destroyed enemies
        this.enemies = this.enemies.filter(enemy => !enemy.destroyed);
        
        // Check game state
        this.checkGameState();
    }
    
    checkCollisions() {
        // Player projectiles vs enemies
        this.playerProjectiles.forEach(projectile => {
            this.enemies.forEach(enemy => {
                if (!enemy.destroyed && !projectile.destroyed && 
                    this.isColliding(projectile.getBounds(), enemy.getBounds())) {
                    
                    // Create explosion
                    this.createExplosion(
                        enemy.x + enemy.width/2, 
                        enemy.y + enemy.height/2,
                        '#ffaa00'
                    );
                    
                    enemy.destroy();
                    projectile.destroyed = true;
                    this.player.addScore(enemy.points);
                }
            });
        });
        
        // Enemy projectiles vs player
        this.enemyProjectiles.forEach(projectile => {
            if (!projectile.destroyed && 
                this.isColliding(projectile.getBounds(), this.player.getBounds())) {
                
                // Create player hit effect
                this.createExplosion(
                    this.player.x + this.player.width/2,
                    this.player.y + this.player.height/2,
                    '#ff4444'
                );
                
                projectile.destroyed = true;
                const gameOver = this.player.takeDamage();
                
                if (gameOver) {
                    this.gameState = 'gameOver';
                }
            }
        });
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    checkGameState() {
        // Check if all enemies destroyed
        if (this.enemies.length === 0) {
            this.wave++;
            this.player.addScore(1000); // Bonus for clearing wave
            
            // Create new wave after short delay
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    this.createEnemyWave();
                }
            }, 2000);
        }
    }
    
    render() {
        // Clear canvas with gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000033');
        gradient.addColorStop(1, '#000011');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw animated stars
        this.drawStars();
        
        if (this.gameState === 'playing') {
            // Draw game objects
            this.player.draw(this.ctx);
            this.enemies.forEach(enemy => enemy.draw(this.ctx));
            this.playerProjectiles.forEach(projectile => projectile.draw(this.ctx));
            this.enemyProjectiles.forEach(projectile => projectile.draw(this.ctx));
            this.particles.forEach(particle => particle.draw(this.ctx));
            
            // Draw UI
            this.drawUI();
        } else if (this.gameState === 'gameOver') {
            this.drawGameOver();
        }
        
        // Draw debug info
        this.drawDebugInfo();
    }
    
    drawStars() {
        this.ctx.fillStyle = 'white';
        
        this.stars.forEach(star => {
            // Animate twinkle
            star.twinkle += 0.02;
            const twinkleAlpha = (Math.sin(star.twinkle) + 1) * 0.5;
            
            this.ctx.save();
            this.ctx.globalAlpha = star.brightness * twinkleAlpha;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
            this.ctx.restore();
        });
    }
    
    drawUI() {
        // Score
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 24px Orbitron, monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.player.score}`, 20, 40);
        
        // Lives
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Orbitron, monospace';
        this.ctx.fillText(`LIVES: ${this.player.lives}`, 20, 70);
        
        // Wave
        this.ctx.fillText(`WAVE: ${this.wave}`, 20, 100);
        
        // Instructions
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('MOVE: Arrow Keys / WASD', this.canvas.width - 20, this.canvas.height - 40);
        this.ctx.fillText('SHOOT: Space Bar', this.canvas.width - 20, this.canvas.height - 20);
    }
    
    drawGameOver() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Game Over text
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = 'bold 48px Orbitron, monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // Final score
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Orbitron, monospace';
        this.ctx.fillText(`Final Score: ${this.player.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText(`Wave Reached: ${this.wave}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        // Restart instruction
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Reload page to play again', this.canvas.width / 2, this.canvas.height / 2 + 100);
    }
    
    drawDebugInfo() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        
        const debugInfo = [
            `FPS: ${this.fps}`,
            `Enemies: ${this.enemies.length}`,
            `Player Bullets: ${this.playerProjectiles.length}`,
            `Enemy Bullets: ${this.enemyProjectiles.length}`,
            `Particles: ${this.particles.length}`
        ];
        
        debugInfo.forEach((info, index) => {
            this.ctx.fillText(info, 10, this.canvas.height - 80 + index * 15);
        });
    }
}

// Export function to start the game
export async function startGame() {
    console.log('🎮 Starting Space Invaders...');
    
    try {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        if (!canvas || !ctx) {
            throw new Error('Canvas not found');
        }
        
        // Create game instance
        const game = new Game(canvas, ctx);
        
        // Make game globally available for debugging
        window.game = game;
        
        console.log('✅ Space Invaders started successfully!');
        
        return game;
        
    } catch (error) {
        console.error('❌ Failed to start game:', error);
        throw error;
    }
}