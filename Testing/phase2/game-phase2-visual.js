import { startGame as startBaseGame } from './game-base-fixed.js';

class SoundManager {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.enabled = true;
    } catch {
      this.enabled = false;
      console.warn('Web Audio API not supported, sound disabled.');
    }
  }

  playShoot() {
    if (!this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playEnemyShoot() {
    if (!this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playExplosion() {
    if (!this.enabled) return;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.2);
  }
}

class SpriteManager {
  constructor() {
    this.sprites = new Map();
    this.createSprites();
  }

  createSprites() {
    this.sprites.set('player', this.createPlayerSprite());
    this.sprites.set('enemy', this.createEnemySprite());
    this.sprites.set('playerBullet', this.createPlayerBulletSprite());
    this.sprites.set('enemyBullet', this.createEnemyBulletSprite());
  }

  createPlayerSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(15, 5, 10, 20);
    ctx.fillRect(5, 15, 30, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(17, 8, 6, 8);
    return canvas;
  }

  createEnemySprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(5, 3, 20, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 6, 3, 3);
    ctx.fillRect(19, 6, 3, 3);
    return canvas;
  }

  createPlayerBulletSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 12;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 12);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#ff8800');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 12);
    return canvas;
  }

  createEnemyBulletSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 12;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 12);
    gradient.addColorStop(0, '#ff8844');
    gradient.addColorStop(1, '#880000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 12);
    return canvas;
  }

  get(spriteName) {
    return this.sprites.get(spriteName);
  }
}

export async function startGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const baseGame = await startBaseGame();

  const spriteMgr = new SpriteManager();
  const soundMgr = new SoundManager();

  // Override some baseGame methods for enhanced visuals and sound
  const originalRender = baseGame.render.bind(baseGame);
  baseGame.render = () => {
    const ctx = baseGame.ctx;
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000033');
    gradient.addColorStop(1, '#000011');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw player sprite
    ctx.drawImage(spriteMgr.get('player'), baseGame.player.x, baseGame.player.y);

    // Draw enemies sprites
    baseGame.enemies.forEach(enemy => {
      if (!enemy.destroyed) {
        ctx.drawImage(spriteMgr.get('enemy'), enemy.x, enemy.y);
      }
    });

    // Draw player bullets
    baseGame.playerProjectiles.forEach(bullet => {
      if (!bullet.destroyed) {
        ctx.drawImage(spriteMgr.get('playerBullet'), bullet.x, bullet.y);
      }
    });

    // Draw enemy bullets
    baseGame.enemyProjectiles.forEach(bullet => {
      if (!bullet.destroyed) {
        ctx.drawImage(spriteMgr.get('enemyBullet'), bullet.x, bullet.y);
      }
    });

    // Draw UI (score, lives, wave)
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 24px Orbitron, monospace';
    ctx.fillText(`Score: ${baseGame.player.score}`, 20, 40);
    ctx.fillText(`Lives: ${baseGame.player.lives}`, 20, 70);
    ctx.fillText(`Wave: ${baseGame.wave}`, 20, 100);
  };

  // Override shooting method for sound effect
  const origShoot = baseGame.player.shoot.bind(baseGame.player);
  baseGame.player.shoot = () => {
    origShoot();
    soundMgr.playShoot();
  };

  // Override enemy shooting for sound
  baseGame.enemies.forEach(enemy => {
    const origEnemyUpdate = enemy.update.bind(enemy);
    enemy.update = (dt, game) => {
      origEnemyUpdate(dt, game);
      if (Math.random() < 0.002) soundMgr.playEnemyShoot();
    };
  });

  // Override explosion creation to play explosion sound
  const origCreateExplosion = baseGame.createExplosion.bind(baseGame);
  baseGame.createExplosion = (x, y, color) => {
    origCreateExplosion(x, y, color);
    soundMgr.playExplosion();
  };

  return baseGame;
}
