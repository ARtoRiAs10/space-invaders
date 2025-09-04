// Phase 1: Enhanced Space Invaders base game

const CONFIG = {
  canvas: { width: 1024, height: 576 },
  player: { speed: 3, fireRate: 300, maxLives: 3, width: 40, height: 30 },
  enemy: { speed: 0.5, fireRate: 0.0008, width: 30, height: 20, rows: 5, cols: 10, spacing: 60, moveDownAmount: 20 },
  projectile: { playerSpeed: 5, enemySpeed: 2, width: 4, height: 12 }
};

class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = CONFIG.player.width;
    this.height = CONFIG.player.height;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - this.height - 20;
    this.speed = CONFIG.player.speed;
    this.lives = CONFIG.player.maxLives;
    this.score = 0;
    this.keys = {};
    this.lastShotTime = 0;
    this.invulnerable = false;
    this.invulnerabilityTime = 0;
    this.setupControls();
  }

  setupControls() {
    document.addEventListener('keydown', (e) => { this.keys[e.code] = true; e.preventDefault(); });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; e.preventDefault(); });
  }

  update(deltaTime, game) {
    if (this.invulnerable) {
      this.invulnerabilityTime -= deltaTime;
      if (this.invulnerabilityTime <= 0) this.invulnerable = false;
    }
    const moveSpeed = this.speed * (deltaTime / 16);
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.x = Math.max(0, this.x - moveSpeed);
    if (this.keys['ArrowRight'] || this.keys['KeyD']) this.x = Math.min(this.canvas.width - this.width, this.x + moveSpeed);
    if (this.keys['Space']) this.shoot(game);
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
    if (this.invulnerable) return false;
    this.lives--;
    this.invulnerable = true;
    this.invulnerabilityTime = 2000;
    return this.lives <= 0;
  }

  addScore(points) {
    this.score += points;
  }

  draw(ctx) {
    if (this.invulnerable && Math.floor(Date.now() / 100) % 2) return; // flashing
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x + this.width / 2 - 3, this.y + 5, 6, 8);
    ctx.fillStyle = '#0088cc';
    ctx.fillRect(this.x + 5, this.y + this.height - 8, 8, 8);
    ctx.fillRect(this.x + this.width - 13, this.y + this.height - 8, 8, 8);
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}

class Enemy {
  constructor(x, y, row, col) {
    this.x = x;
    this.y = y;
    this.row = row;
    this.col = col;
    this.width = CONFIG.enemy.width;
    this.height = CONFIG.enemy.height;
    this.speed = CONFIG.enemy.speed;
    this.destroyed = false;
    this.lastShotTime = 0;
    this.animationFrame = 0;
    this.lastAnimationTime = 0;
    this.points = 100;
  }

  update(deltaTime, game, formation) {
    this.lastAnimationTime += deltaTime;
    if (this.lastAnimationTime >= 500) {
      this.animationFrame = (this.animationFrame + 1) % 2;
      this.lastAnimationTime = 0;
    }
    if (formation) {
      this.x = formation.x + this.col * CONFIG.enemy.spacing;
      this.y = formation.y + this.row * 50;
    }
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
    ctx.fillStyle = this.animationFrame === 0 ? '#ff4444' : '#ff6666';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x + 5, this.y + 4, 3, 3);
    ctx.fillRect(this.x + this.width - 8, this.y + 4, 3, 3);
    ctx.fillStyle = '#cc2222';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(this.x + 5 + i * 8, this.y + this.height, 2, 4);
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  destroy() {
    this.destroyed = true;
  }
}

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
    const moveAmount = this.speed * (deltaTime / 16);
    if (this.owner === 'player') this.y -= moveAmount;
    else this.y += moveAmount;
    if (this.y < -this.height || this.y > CONFIG.canvas.height + this.height)
      this.destroyed = true;
  }

  draw(ctx) {
    if (this.destroyed) return;
    if (this.owner === 'player') {
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x, this.y, this.width, 2);
    } else {
      ctx.fillStyle = '#ff8844';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = '#cc4422';
      ctx.fillRect(this.x, this.y + this.height - 2, this.width, 2);
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}

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
    this.alpha = this.life / this.maxLife;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

class EnemyFormation {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.direction = 1;
    this.speed = CONFIG.enemy.speed;
    this.lastMoveTime = 0;
    this.moveInterval = 60;
  }

  update(deltaTime, canvas) {
    this.lastMoveTime += deltaTime;
    if (this.lastMoveTime >= this.moveInterval) {
      this.x += this.direction * this.speed;
      this.lastMoveTime = 0;
    }
    const leftEdge = this.x;
    const rightEdge = this.x + (CONFIG.enemy.cols - 1) * CONFIG.enemy.spacing + CONFIG.enemy.width;
    if (leftEdge <= 0 || rightEdge >= canvas.width) {
      this.direction *= -1;
      this.y += CONFIG.enemy.moveDownAmount;
    }
  }
}

class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.player = new Player(canvas);
    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.particles = [];
    this.formation = new EnemyFormation(100, 80);
    this.gameState = 'playing';
    this.wave = 1;
    this.lastFrameTime = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.stars = this.generateStars(100);
    this.createEnemyWave();
  }

  generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.2 + 0.1
      });
    }
    return stars;
  }

  createEnemyWave() {
    this.enemies = [];
    this.formation = new EnemyFormation(100, 80);
    for (let row = 0; row < CONFIG.enemy.rows; row++) {
      for (let col = 0; col < CONFIG.enemy.cols; col++) {
        const x = this.formation.x + col * CONFIG.enemy.spacing;
        const y = this.formation.y + row * 50;
        this.enemies.push(new Enemy(x, y, row, col));
      }
    }
  }

  addPlayerProjectile(config) {
    this.playerProjectiles.push(new Projectile(config));
  }

  addEnemyProjectile(config) {
    this.enemyProjectiles.push(new Projectile(config));
  }

  createExplosion(x, y, color = '#ffaa00', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      const colorArr = ['#ffaa00', '#ff6600', '#ff0000'];
      const color = colorArr[Math.floor(Math.random() * colorArr.length)];
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1, color, 500 + Math.random() * 300));
    }
  }

  start() {
    requestAnimationFrame(this.gameLoop.bind(this));
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
    this.player.update(deltaTime, this);
    this.formation.update(deltaTime, this.canvas);
    this.enemies.forEach((e) => { if (!e.destroyed) e.update(deltaTime, this, this.formation); });
    this.playerProjectiles.forEach((p) => p.update(deltaTime));
    this.enemyProjectiles.forEach((p) => p.update(deltaTime));
    this.particles.forEach((p) => p.update(deltaTime));
    this.stars.forEach((star) => {
      star.y += star.speed;
      star.twinkle += 0.02;
      if (star.y > this.canvas.height) {
        star.y = -star.size;
        star.x = Math.random() * this.canvas.width;
      }
    });
    this.playerProjectiles = this.playerProjectiles.filter((p) => !p.destroyed);
    this.enemyProjectiles = this.enemyProjectiles.filter((p) => !p.destroyed);
    this.particles = this.particles.filter((p) => !p.isDead());
    this.checkCollisions();
    this.enemies = this.enemies.filter((e) => !e.destroyed);
    this.checkGameState();
  }

  isColliding(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  checkCollisions() {
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      let proj = this.playerProjectiles[i];
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        let enemy = this.enemies[j];
        if (!proj.destroyed && !enemy.destroyed && this.isColliding(proj.getBounds(), enemy.getBounds())) {
          this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
          enemy.destroy();
          proj.destroyed = true;
          this.player.addScore(enemy.points);
          break;
        }
      }
    }
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      let proj = this.enemyProjectiles[i];
      if (!proj.destroyed && this.isColliding(proj.getBounds(), this.player.getBounds())) {
        this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#ff4444', 15);
        proj.destroyed = true;
        if (this.player.takeDamage()) this.gameState = 'gameOver';
      }
    }
  }

  checkGameState() {
    if (this.enemies.length === 0) {
      this.wave++;
      this.player.addScore(1000);
      setTimeout(() => {
        if (this.gameState === 'playing') this.createEnemyWave();
      }, 2000);
    }
    const lowestEnemy = this.enemies.reduce((lowest, e) => (e.y > (lowest?.y || -1) ? e : lowest), null);
    if (lowestEnemy && lowestEnemy.y + lowestEnemy.height >= this.player.y) this.gameState = 'gameOver';
  }

  render() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#000033');
    gradient.addColorStop(1, '#000011');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawStars();
    if (this.gameState === 'playing') {
      this.player.draw(ctx);
      this.enemies.forEach((e) => e.draw(ctx));
      this.playerProjectiles.forEach((p) => p.draw(ctx));
      this.enemyProjectiles.forEach((p) => p.draw(ctx));
      this.particles.forEach((p) => p.draw(ctx));
      this.drawUI();
    } else if (this.gameState === 'gameOver') this.drawGameOver();
    this.drawDebugInfo();
  }

  drawStars() {
    this.ctx.fillStyle = 'white';
    this.stars.forEach((star) => {
      const twinkleAlpha = (Math.sin(star.twinkle) + 1) * 0.5;
      this.ctx.save();
      this.ctx.globalAlpha = star.brightness * twinkleAlpha * 0.8;
      this.ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
      this.ctx.restore();
    });
  }

  drawUI() {
    this.ctx.fillStyle = '#00ffff';
    this.ctx.font = 'bold 24px Orbitron, monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.player.score}`, 20, 40);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px Orbitron, monospace';
    this.ctx.fillText(`LIVES: ${this.player.lives}`, 20, 70);
    this.ctx.fillText(`WAVE: ${this.wave}`, 20, 100);
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
    this.ctx.fillText(`Final Score: ${this.player.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
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
    debugInfo.forEach((info, idx) => this.ctx.fillText(info, 10, this.canvas.height - 80 + idx * 15));
  }

  gameLoop(currentTime = 0) {
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.updateFPS(currentTime);
    this.update(deltaTime);
    this.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

export async function startGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  if (!canvas || !ctx) throw new Error('Canvas or context not found');
  const game = new Game(canvas, ctx);
  game.start();
  return game;
}
