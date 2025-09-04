const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const ui = document.getElementById('ui');

const KEY = { LEFT: 37, RIGHT: 39, SPACE: 32 };
const keysPressed = new Set();

window.addEventListener('keydown', e => keysPressed.add(e.keyCode));
window.addEventListener('keyup', e => keysPressed.delete(e.keyCode));

// Load images (simulated with colored rectangles for simplicity)
function loadSprite(color, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const context = c.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, w, h);
  return c;
}

const SPRITES = {
  player: loadSprite('#0ff', 40, 30),
  enemy1: loadSprite('#f44', 40, 35),
  enemy2: loadSprite('#4f4', 40, 35),
  enemy3: loadSprite('#44f', 40, 35),
  bulletPlayer: loadSprite('#ff0', 4, 12),
  bulletEnemy: loadSprite('#f80', 4, 12),
  blocker: loadSprite('#388', 10, 10),
  mystery: loadSprite('#fff', 75, 35),
};

// Entity classes
class Entity {
  constructor(x, y, sprite) {
    this.x = x; this.y = y; this.sprite = sprite;
    this.width = sprite.width; this.height = sprite.height;
    this.destroyed = false;
  }
  draw() { if (!this.destroyed) ctx.drawImage(this.sprite, this.x, this.y); }
  getBounds() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
}

class Player extends Entity {
  constructor() {
    super(canvas.width / 2 - 20, canvas.height - 50, SPRITES.player);
    this.speed = 5; this.lives = 3; this.score = 0; this.lastShot = 0; this.shootDelay = 300;
  }
  update(delta) {
    if (keysPressed.has(KEY.LEFT)) this.x = Math.max(10, this.x - this.speed);
    if (keysPressed.has(KEY.RIGHT)) this.x = Math.min(canvas.width - this.width - 10, this.x + this.speed);
  }
  canShoot() {
    const now = performance.now();
    if (now - this.lastShot > this.shootDelay) {
      this.lastShot = now;
      return true;
    }
    return false;
  }
}

class Projectile extends Entity {
  constructor(x, y, speed, owner) {
    super(x, y, owner === 'player' ? SPRITES.bulletPlayer : SPRITES.bulletEnemy);
    this.speed = speed; this.owner = owner;
  }
  update(delta) {
    this.y += this.speed * delta / 16;
    if (this.y < -this.height || this.y > canvas.height + this.height) this.destroyed = true;
  }
}

class Enemy extends Entity {
  constructor(x, y, row, col) {
    super(x, y, SPRITES.enemy1);
    this.row = row; this.col = col;
    this.moveDirection = 1; this.moveSpeed = 10;
    this.animationTimer = 0;
  }
  update(delta, formationX, formationY) {
    this.x = formationX + this.col * 50;
    this.y = formationY + this.row * 45;
    // Animate sprite
    this.animationTimer += delta;
    if (this.animationTimer > 500) {
      this.sprite = this.sprite === SPRITES.enemy1 ? SPRITES.enemy2 : SPRITES.enemy1;
      this.animationTimer = 0;
    }
  }
}

// Blocker, Mystery, Explosion can be similarly created (omitted here for briefness)

class Game {
  constructor() {
    this.player = new Player();
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.formationX = 100;
    this.formationY = 60;
    this.formationDirection = 1;
    this.formationSpeed = 1;
    this.lastFormationMove = 0;
    this.formationMoveInterval = 60;
    this.gameOver = false;
    this.lastEnemyShoot = 0;
    this.enemyShootInterval = 700;
    this.spawnEnemies();
  }
  spawnEnemies() {
    this.enemies = [];
    for(let r = 0; r < 5; r++) {
      for(let c = 0; c < 10; c++) {
        this.enemies.push(new Enemy(this.formationX + c * 50, this.formationY + r * 45, r, c));
      }
    }
  }
  update(delta) {
    if (this.gameOver) return;
    this.player.update(delta);
    // Move enemy formation
    this.lastFormationMove += delta;
    if (this.lastFormationMove > this.formationMoveInterval) {
      this.formationX += this.formationDirection * this.formationSpeed;
      if (this.formationX < 0 || this.formationX > canvas.width - 500) {
        this.formationDirection *= -1;
        this.formationY += 35;
      }
      this.lastFormationMove = 0;
    }
    // Update enemies
    this.enemies.forEach(enemy => enemy.update(delta, this.formationX, this.formationY));
    // Update projectiles
    this.playerProjectiles.forEach(p => p.update(delta));
    this.enemyProjectiles.forEach(p => p.update(delta));
    // Enemy shooting
    let now = performance.now();
    if (now - this.lastEnemyShoot > this.enemyShootInterval && this.enemies.length) {
      const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      this.enemyProjectiles.push(new Projectile(shooter.x + shooter.width / 2, shooter.y + shooter.height, 5, 'enemy'));
      this.lastEnemyShoot = now;
    }
    // Check collisions
    this.checkCollisions();
    // Remove destroyed projectiles/enemies
    this.playerProjectiles = this.playerProjectiles.filter(p => !p.destroyed);
    this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.destroyed);
    this.enemies = this.enemies.filter(e => !e.destroyed);

    // Game over if enemies reach bottom
    if (this.enemies.some(e => e.y + e.height >= this.player.y)) this.gameOver = true;
  }
  checkCollisions() {
    // Player bullets hit enemies
    this.playerProjectiles.forEach(proj => {
      this.enemies.forEach(enemy => {
        if (!proj.destroyed && this.rectIntersect(proj.getBounds(), enemy.getBounds())) {
          proj.destroyed = true;
          enemy.destroyed = true;
          this.player.score += 100;
        }
      });
    });
    // Enemy bullets hit player
    this.enemyProjectiles.forEach(proj => {
      if (!proj.destroyed && this.rectIntersect(proj.getBounds(), this.player.getBounds())) {
        proj.destroyed = true;
        this.player.lives--;
        if (this.player.lives <= 0) this.gameOver = true;
      }
    });
  }
  rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
      r2.x + r2.width < r1.x ||
      r2.y > r1.y + r1.height ||
      r2.y + r2.height < r1.y);
  }
  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Background
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000033');
    gradient.addColorStop(1, '#000011');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw player/enemies/projectiles
    this.player.draw();
    this.enemies.forEach(e => e.draw());
    this.playerProjectiles.forEach(p => p.draw());
    this.enemyProjectiles.forEach(p => p.draw());
    // UI: Score & Lives
    ctx.fillStyle = '#0ff';
    ctx.font = '24px monospace';
    ctx.fillText(`Score: ${this.player.score}`, 20, 40);
    ctx.fillText(`Lives: ${this.player.lives}`, 20, 80);
    // Game over message
    if (this.gameOver) {
      ctx.fillStyle = '#f00';
      ctx.font = '48px monospace';
      ctx.fillText('GAME OVER', canvas.width / 2 - 140, canvas.height / 2);
    }
  }
  shootPlayerBullet() {
    if (this.player.canShoot()) {
      this.playerProjectiles.push(new Projectile(
        this.player.x + this.player.width / 2 - 2,
        this.player.y, -10, 'player'
      ));
    }
  }
}

const game = new Game();

function gameLoop(timestamp = 0) {
  const delta = timestamp - (game.lastTimestamp || 0);
  game.lastTimestamp = timestamp;
  game.update(delta);
  game.draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
  if (e.keyCode === KEY.SPACE) game.shootPlayerBullet();
});

requestAnimationFrame(gameLoop);

