// Enhanced UI System
// Handles all user interface elements and interactions

import { GameConfig } from '../config.js';

export class UI {
    constructor(canvas, auth, storage) {
        this.canvas = canvas;
        this.auth = auth;
        this.storage = storage;
        
        // UI state
        this.currentMenu = 'main';
        this.notifications = [];
        this.dialogs = [];
        
        // UI elements
        this.elements = new Map();
        
        // Animation state
        this.animations = [];
        
        // Input handling
        this.mousePosition = { x: 0, y: 0 };
        this.touchPosition = { x: 0, y: 0 };
        
        // Themes and styling
        this.theme = this.storage.loadUserPreferences().theme || 'dark';
        
        // Initialize UI elements
        this.initializeElements();
    }
    
    async initialize() {
        console.log('🎨 Initializing UI system...');
        
        // Load UI assets
        await this.loadAssets();
        
        // Setup responsive handling
        this.setupResponsiveHandling();
        
        // Setup theme
        this.applyTheme(this.theme);
        
        console.log('✅ UI system initialized');
    }
    
    async loadAssets() {
        // Load UI images
        this.assets = {
            button: await this.loadImage('./public/assets/images/button.png'),
            background: await this.loadImage('./public/assets/images/space-bg.png'),
            logo: await this.createTextLogo()
        };
    }
    
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn(`Failed to load UI asset: ${src}`);
                resolve(null);
            };
            img.src = src;
        });
    }
    
    createTextLogo() {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        
        // Draw text logo
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 36px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SPACE INVADERS', 200, 35);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Orbitron, monospace';
        ctx.fillText('ENHANCED EDITION', 200, 65);
        
        return canvas;
    }
    
    initializeElements() {
        // Main menu buttons
        this.elements.set('startButton', {
            type: 'button',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: 200,
            height: 50,
            text: 'START GAME',
            onClick: () => this.onStartGame(),
            visible: true,
            menu: 'main'
        });
        
        this.elements.set('levelsButton', {
            type: 'button',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + 70,
            width: 200,
            height: 50,
            text: 'SELECT LEVEL',
            onClick: () => this.onSelectLevel(),
            visible: true,
            menu: 'main'
        });
        
        this.elements.set('profileButton', {
            type: 'button',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + 140,
            width: 200,
            height: 50,
            text: 'PROFILE',
            onClick: () => this.onShowProfile(),
            visible: true,
            menu: 'main'
        });
        
        this.elements.set('settingsButton', {
            type: 'button',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + 210,
            width: 200,
            height: 50,
            text: 'SETTINGS',
            onClick: () => this.onShowSettings(),
            visible: true,
            menu: 'main'
        });
        
        // Pause menu buttons
        this.elements.set('resumeButton', {
            type: 'button',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            width: 180,
            height: 45,
            text: 'RESUME',
            onClick: () => this.onResume(),
            visible: false,
            menu: 'pause'
        });
        
        this.elements.set('mainMenuButton', {
            type: 'button',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + 20,
            width: 180,
            height: 45,
            text: 'MAIN MENU',
            onClick: () => this.onMainMenu(),
            visible: false,
            menu: 'pause'
        });
        
        // Auth buttons
        this.elements.set('authButton', {
            type: 'authButton',
            x: this.canvas.width - 120,
            y: 30,
            width: 100,
            height: 40,
            visible: true,
            menu: 'overlay'
        });
    }
    
    setupResponsiveHandling() {
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Handle orientation changes on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100);
        });
    }
    
    handleResize() {
        // Update element positions for new canvas size
        const scaleX = this.canvas.width / 1024;
        const scaleY = this.canvas.height / 576;
        
        this.elements.forEach(element => {
            if (element.originalX === undefined) {
                element.originalX = element.x;
                element.originalY = element.y;
            }
            
            element.x = element.originalX * scaleX;
            element.y = element.originalY * scaleY;
        });
    }
    
    update(deltaTime) {
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Update notifications
        this.updateNotifications(deltaTime);
        
        // Update dialogs
        this.updateDialogs(deltaTime);
    }
    
    updateAnimations(deltaTime) {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const animation = this.animations[i];
            animation.update(deltaTime);
            
            if (animation.isComplete()) {
                this.animations.splice(i, 1);
            }
        }
    }
    
    updateNotifications(deltaTime) {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            notification.timer -= deltaTime;
            
            if (notification.timer <= 0) {
                this.notifications.splice(i, 1);
            }
        }
    }
    
    updateDialogs(deltaTime) {
        this.dialogs.forEach(dialog => {
            if (dialog.update) {
                dialog.update(deltaTime);
            }
        });
    }
    
    // Rendering methods
    renderMainMenu(ctx) {
        this.currentMenu = 'main';
        
        // Draw background
        this.drawBackground(ctx);
        
        // Draw logo
        if (this.assets.logo) {
            const logoX = this.canvas.width / 2 - this.assets.logo.width / 2;
            const logoY = 80;
            ctx.drawImage(this.assets.logo, logoX, logoY);
        }
        
        // Draw version info
        ctx.fillStyle = '#666666';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('v2.0.0 - Enhanced Edition', this.canvas.width / 2, this.canvas.height - 20);
        
        // Draw menu buttons
        this.renderMenuButtons(ctx, 'main');
        
        // Draw auth button
        this.renderAuthButton(ctx);
    }
    
    renderGameHUD(ctx) {
        // Game HUD overlay
        this.drawHUDBackground(ctx);
        
        // Score, lives, level, etc. would be passed from game state
        this.drawScore(ctx, 0); // Placeholder
        this.drawLives(ctx, 3);
        this.drawLevel(ctx, 1);
        this.drawCombo(ctx, 0);
        
        // Boss health bar (if boss active)
        // this.drawBossHealthBar(ctx, boss);
    }
    
    renderPauseMenu(ctx) {
        this.currentMenu = 'pause';
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Pause title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 48px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 100);
        
        // Draw pause menu buttons
        this.renderMenuButtons(ctx, 'pause');
    }
    
    renderGameOver(ctx) {
        // Game over screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Game Over title
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 48px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // Final score
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Orbitron, monospace';
        ctx.fillText('Final Score: 0', this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        // Continue button
        this.renderButton(ctx, {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + 80,
            width: 150,
            height: 40,
            text: 'CONTINUE',
            onClick: () => this.onMainMenu()
        });
    }
    
    renderMenuButtons(ctx, menu) {
        this.elements.forEach(element => {
            if (element.menu === menu && element.visible) {
                this.renderElement(ctx, element);
            }
        });
    }
    
    renderElement(ctx, element) {
        switch (element.type) {
            case 'button':
                this.renderButton(ctx, element);
                break;
            case 'authButton':
                this.renderAuthButton(ctx);
                break;
            case 'slider':
                this.renderSlider(ctx, element);
                break;
            case 'text':
                this.renderText(ctx, element);
                break;
        }
    }
    
    renderButton(ctx, button) {
        const isHovered = this.isElementHovered(button);
        const isPressed = this.isElementPressed(button);
        
        // Button background
        ctx.fillStyle = isPressed ? '#004444' : isHovered ? '#006666' : '#003333';
        ctx.fillRect(
            button.x - button.width / 2, 
            button.y - button.height / 2, 
            button.width, 
            button.height
        );
        
        // Button border
        ctx.strokeStyle = isHovered ? '#00ffff' : '#006666';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            button.x - button.width / 2, 
            button.y - button.height / 2, 
            button.width, 
            button.height
        );
        
        // Button text
        ctx.fillStyle = isHovered ? '#00ffff' : '#ffffff';
        ctx.font = '16px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.text, button.x, button.y);
        
        // Glow effect for hovered buttons
        if (isHovered) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 10;
            ctx.strokeRect(
                button.x - button.width / 2, 
                button.y - button.height / 2, 
                button.width, 
                button.height
            );
            ctx.shadowBlur = 0;
        }
    }
    
    renderAuthButton(ctx) {
        const authElement = this.elements.get('authButton');
        if (!authElement) return;
        
        if (this.auth.isSignedIn()) {
            // Show user info
            const user = this.auth.getUser();
            const userName = this.auth.getUserName();
            
            // User avatar (simplified)
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(authElement.x - 50, authElement.y - 15, 30, 30);
            
            // User name
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(userName, authElement.x - 15, authElement.y);
        } else {
            // Sign in button
            this.renderButton(ctx, {
                x: authElement.x,
                y: authElement.y,
                width: authElement.width,
                height: authElement.height,
                text: 'SIGN IN',
                onClick: () => this.auth.signIn()
            });
        }
    }
    
    renderNotifications(ctx) {
        let yOffset = 50;
        
        this.notifications.forEach(notification => {
            this.renderNotification(ctx, notification, yOffset);
            yOffset += 80;
        });
    }
    
    renderNotification(ctx, notification, yOffset) {
        const x = this.canvas.width - 250;
        const width = 240;
        const height = 60;
        
        // Notification background
        ctx.fillStyle = 'rgba(0, 50, 50, 0.9)';
        ctx.fillRect(x, yOffset, width, height);
        
        // Border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, yOffset, width, height);
        
        // Title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(notification.title, x + 10, yOffset + 20);
        
        // Message
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(notification.message, x + 10, yOffset + 40);
    }
    
    // Drawing helpers
    drawBackground(ctx) {
        if (this.assets.background) {
            ctx.drawImage(this.assets.background, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#000033');
            gradient.addColorStop(1, '#000011');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    drawHUDBackground(ctx) {
        // Top HUD bar
        const gradient = ctx.createLinearGradient(0, 0, 0, 80);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, 80);
    }
    
    drawScore(ctx, score) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 24px Orbitron, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${score.toLocaleString()}`, 20, 35);
    }
    
    drawLives(ctx, lives) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Orbitron, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`LIVES: ${lives}`, 20, 60);
        
        // Draw life icons
        for (let i = 0; i < lives; i++) {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(100 + i * 25, 48, 20, 15);
        }
    }
    
    drawLevel(ctx, level) {
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 18px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${level}`, this.canvas.width / 2, 35);
    }
    
    drawCombo(ctx, combo) {
        if (combo > 1) {
            ctx.fillStyle = '#ff8800';
            ctx.font = 'bold 16px Orbitron, monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`COMBO x${combo}`, this.canvas.width - 20, 35);
        }
    }
    
    drawBossHealthBar(ctx, boss) {
        if (!boss) return;
        
        const barWidth = this.canvas.width * 0.8;
        const barHeight = 20;
        const x = (this.canvas.width - barWidth) / 2;
        const y = 100;
        
        // Background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health
        const healthPercent = boss.health / boss.maxHealth;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Boss name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(boss.name, this.canvas.width / 2, y - 10);
    }
    
    // Input handling
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.mousePosition = { x, y };
        
        // Check for button clicks
        this.elements.forEach(element => {
            if (element.visible && element.menu === this.currentMenu) {
                if (this.isPointInElement(x, y, element)) {
                    if (element.onClick) {
                        element.onClick();
                    }
                }
            }
        });
    }
    
    handleTouch(event) {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = event.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.touchPosition = { x, y };
        
        // Treat as click
        this.handleClick({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    handleKeyDown(event) {
        switch (event.code) {
            case 'Escape':
                if (this.currentMenu === 'main') {
                    // Could show exit confirmation
                } else {
                    this.onMainMenu();
                }
                break;
        }
    }
    
    handleKeyUp(event) {
        // Handle key up events
    }
    
    // Utility methods
    isPointInElement(x, y, element) {
        return x >= element.x - element.width / 2 &&
               x <= element.x + element.width / 2 &&
               y >= element.y - element.height / 2 &&
               y <= element.y + element.height / 2;
    }
    
    isElementHovered(element) {
        return this.isPointInElement(this.mousePosition.x, this.mousePosition.y, element);
    }
    
    isElementPressed(element) {
        // Would track mouse/touch press state
        return false;
    }
    
    // UI Actions
    onStartGame() {
        console.log('Start game clicked');
        // Would emit event to start game
        const event = new CustomEvent('startGame', { detail: { level: 1 } });
        window.dispatchEvent(event);
    }
    
    onSelectLevel() {
        console.log('Select level clicked');
        const event = new CustomEvent('showLevelSelector');
        window.dispatchEvent(event);
    }
    
    onShowProfile() {
        console.log('Profile clicked');
        const event = new CustomEvent('showProfile');
        window.dispatchEvent(event);
    }
    
    onShowSettings() {
        console.log('Settings clicked');
        this.showSettingsDialog();
    }
    
    onResume() {
        console.log('Resume clicked');
        const event = new CustomEvent('resumeGame');
        window.dispatchEvent(event);
    }
    
    onMainMenu() {
        console.log('Main menu clicked');
        const event = new CustomEvent('showMainMenu');
        window.dispatchEvent(event);
    }
    
    // Notifications
    showNotification(title, message, duration = 3000) {
        this.notifications.push({
            title,
            message,
            timer: duration
        });
    }
    
    showAchievementNotification(achievementId) {
        this.showNotification(
            'Achievement Unlocked!',
            `You earned: ${achievementId}`,
            5000
        );
    }
    
    // Dialogs
    showErrorDialog(message) {
        this.showNotification('Error', message, 5000);
    }
    
    showSettingsDialog() {
        // Would show settings dialog
        console.log('Settings dialog would open');
    }
    
    showLevelCompleteScreen(data) {
        this.showNotification(
            'Level Complete!',
            `Score: ${data.score} | Stars: ${data.stars}`,
            4000
        );
    }
    
    showGameOverScreen(data) {
        // Game over screen is rendered in renderGameOver
    }
    
    // Theme management
    applyTheme(themeName) {
        this.theme = themeName;
        // Would update colors based on theme
    }
    
    updateAuthUI(user) {
        // Update auth button based on user state
        const authElement = this.elements.get('authButton');
        if (authElement) {
            authElement.user = user;
        }
    }
    
    // Cleanup
    destroy() {
        this.notifications = [];
        this.dialogs = [];
        this.animations = [];
        this.elements.clear();
    }
}