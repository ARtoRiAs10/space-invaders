// Enhanced Space Invaders Main Game Class
// This is the main game controller that orchestrates all systems

import { Game } from './components/Game.js';
import { UI } from './components/UI.js';
import { LevelSelector } from './components/LevelSelector.js';
import { UserProfile } from './components/UserProfile.js';
import { ClerkAuth } from './auth/clerk.js';
import { GameStorage } from './storage/gameStorage.js';
import { GameConfig } from './config.js';

export class EnhancedSpaceInvaders {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Core systems
        this.game = null;
        this.ui = null;
        this.levelSelector = null;
        this.userProfile = null;
        
        // Services
        this.auth = new ClerkAuth();
        this.storage = new GameStorage();
        
        // Game state
        this.currentState = 'loading'; // loading, menu, playing, paused, gameOver
        this.currentLevel = 1;
        this.isInitialized = false;
        
        // Animation and timing
        this.animationId = null;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        
        // Performance monitoring
        this.performanceMetrics = {
            fps: 0,
            frameCount: 0,
            lastFpsUpdate: 0,
            updateTime: 0,
            renderTime: 0
        };
        
        // Audio system (placeholder for now)
        this.audio = null;
        
        // Input handling
        this.inputHandlers = new Map();
        this.setupInputHandling();
    }
    
    async initialize() {
        try {
            console.log('🎮 Initializing Enhanced Space Invaders systems...');
            
            // Initialize authentication
            await this.auth.init();
            
            // Initialize storage
            this.storage.migrateFromOldVersion();
            
            // Initialize UI system
            this.ui = new UI(this.canvas, this.auth, this.storage);
            await this.ui.initialize();
            
            // Initialize level selector
            this.levelSelector = new LevelSelector(this.storage, this.auth);
            await this.levelSelector.initialize();
            
            // Initialize user profile
            this.userProfile = new UserProfile(this.auth, this.storage);
            await this.userProfile.initialize();
            
            // Initialize core game
            this.game = new Game(this.canvas, this.ctx, GameConfig);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start the main game loop
            this.startGameLoop();
            
            this.isInitialized = true;
            console.log('✅ All systems initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            throw error;
        }
    }
    
    setupInputHandling() {
        // Keyboard event handlers
        this.inputHandlers.set('keydown', (event) => {
            if (this.game && this.currentState === 'playing') {
                this.game.handleKeyDown(event);
            }
            this.ui.handleKeyDown(event);
        });
        
        this.inputHandlers.set('keyup', (event) => {
            if (this.game && this.currentState === 'playing') {
                this.game.handleKeyUp(event);
            }
            this.ui.handleKeyUp(event);
        });
        
        // Mouse/touch event handlers
        this.inputHandlers.set('click', (event) => {
            this.ui.handleClick(event);
        });
        
        this.inputHandlers.set('touchstart', (event) => {
            this.ui.handleTouch(event);
        });
        
        // Add event listeners
        this.inputHandlers.forEach((handler, eventType) => {
            document.addEventListener(eventType, handler);
        });
    }
    
    setupEventListeners() {
        // Authentication state changes
        window.addEventListener('authStateChanged', (event) => {
            this.onAuthStateChanged(event.detail.user);
        });
        
        // Achievement unlocked
        window.addEventListener('achievementUnlocked', (event) => {
            this.ui.showAchievementNotification(event.detail.achievementId);
        });
        
        // Level complete
        window.addEventListener('levelComplete', (event) => {
            this.onLevelComplete(event.detail);
        });
        
        // Game over
        window.addEventListener('gameOver', (event) => {
            this.onGameOver(event.detail);
        });
    }
    
    // Game loop
    startGameLoop() {
        const gameLoop = (currentTime) => {
            this.deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            
            // Update performance metrics
            this.updatePerformanceMetrics(currentTime);
            
            // Update game systems
            this.update(this.deltaTime);
            
            // Render everything
            this.render();
            
            // Continue the loop
            this.animationId = requestAnimationFrame(gameLoop);
        };
        
        this.animationId = requestAnimationFrame(gameLoop);
    }
    
    update(deltaTime) {
        // Update based on current state
        switch (this.currentState) {
            case 'menu':
                this.ui.update(deltaTime);
                break;
                
            case 'playing':
                if (this.game) {
                    this.game.update(deltaTime);
                }
                this.ui.update(deltaTime);
                break;
                
            case 'paused':
                this.ui.update(deltaTime);
                break;
                
            case 'gameOver':
                this.ui.update(deltaTime);
                break;
        }
        
        // Update user profile
        if (this.userProfile) {
            this.userProfile.update(deltaTime);
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render based on current state
        switch (this.currentState) {
            case 'menu':
                this.ui.renderMainMenu(this.ctx);
                break;
                
            case 'playing':
                if (this.game) {
                    this.game.render();
                }
                this.ui.renderGameHUD(this.ctx);
                break;
                
            case 'paused':
                if (this.game) {
                    this.game.render();
                }
                this.ui.renderPauseMenu(this.ctx);
                break;
                
            case 'gameOver':
                this.ui.renderGameOver(this.ctx);
                break;
                
            case 'levelSelector':
                this.levelSelector.render(this.ctx);
                break;
                
            case 'userProfile':
                this.userProfile.render(this.ctx);
                break;
        }
        
        // Always render notifications on top
        this.ui.renderNotifications(this.ctx);
        
        // Debug information
        if (GameConfig.debug.showFPS) {
            this.renderDebugInfo();
        }
    }
    
    renderDebugInfo() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`FPS: ${this.performanceMetrics.fps}`, 10, 25);
        this.ctx.fillText(`State: ${this.currentState}`, 10, 45);
        this.ctx.fillText(`Level: ${this.currentLevel}`, 10, 65);
    }
    
    updatePerformanceMetrics(currentTime) {
        this.performanceMetrics.frameCount++;
        
        if (currentTime - this.performanceMetrics.lastFpsUpdate >= 1000) {
            this.performanceMetrics.fps = Math.round(
                this.performanceMetrics.frameCount * 1000 / 
                (currentTime - this.performanceMetrics.lastFpsUpdate)
            );
            this.performanceMetrics.frameCount = 0;
            this.performanceMetrics.lastFpsUpdate = currentTime;
        }
    }
    
    // State management
    setState(newState) {
        const oldState = this.currentState;
        this.currentState = newState;
        
        console.log(`State changed: ${oldState} -> ${newState}`);
        
        // Handle state transitions
        this.onStateChange(oldState, newState);
    }
    
    onStateChange(oldState, newState) {
        // Save state when leaving playing
        if (oldState === 'playing' && this.game) {
            this.storage.saveGameState(this.game.getGameState());
        }
        
        // Handle new state
        switch (newState) {
            case 'menu':
                this.showMainMenu();
                break;
            case 'playing':
                // Start or resume game
                break;
            case 'paused':
                // Game is paused
                break;
            case 'gameOver':
                this.handleGameOver();
                break;
        }
    }
    
    // Public API methods
    showMainMenu() {
        this.setState('menu');
    }
    
    async startLevel(levelNumber) {
        try {
            this.currentLevel = levelNumber;
            
            if (!this.game) {
                this.game = new Game(this.canvas, this.ctx, GameConfig);
            }
            
            await this.game.startLevel(levelNumber);
            this.setState('playing');
            
            console.log(`🎮 Started level ${levelNumber}`);
            
        } catch (error) {
            console.error('Failed to start level:', error);
            this.ui.showErrorDialog('Failed to start level: ' + error.message);
        }
    }
    
    pauseGame() {
        if (this.currentState === 'playing') {
            this.setState('paused');
        }
    }
    
    resumeGame() {
        if (this.currentState === 'paused') {
            this.setState('playing');
        }
    }
    
    restartGame() {
        if (this.game) {
            this.game.reset();
            this.setState('playing');
        }
    }
    
    togglePause() {
        if (this.currentState === 'playing') {
            this.pauseGame();
        } else if (this.currentState === 'paused') {
            this.resumeGame();
        }
    }
    
    showLevelSelector() {
        this.setState('levelSelector');
    }
    
    showUserProfile() {
        this.setState('userProfile');
    }
    
    // Event handlers
    onAuthStateChanged(user) {
        console.log('Auth state changed:', user ? 'Signed in' : 'Signed out');
        
        if (user) {
            // User signed in
            this.userProfile.loadUserData(user);
            this.ui.updateAuthUI(user);
        } else {
            // User signed out
            this.userProfile.clearUserData();
            this.ui.updateAuthUI(null);
        }
    }
    
    onLevelComplete(data) {
        console.log('Level completed:', data);
        
        // Save progress
        this.storage.updateLevelProgress(data.level, true, data.score, data.stars);
        
        // Update user profile
        if (this.auth.isSignedIn()) {
            this.auth.saveGameProgress({
                level: data.level,
                completed: true,
                score: data.score,
                stars: data.stars
            });
        }
        
        // Show level complete screen
        this.ui.showLevelCompleteScreen(data);
    }
    
    onGameOver(data) {
        console.log('Game over:', data);
        
        // Save high score if applicable
        const isNewHighScore = this.storage.addHighScore(
            data.score, 
            data.level, 
            GameConfig.difficulty,
            this.auth.getUserName()
        );
        
        // Update statistics
        this.storage.updateStatistics({
            gamesPlayed: this.storage.loadStatistics().gamesPlayed + 1,
            totalScore: this.storage.loadStatistics().totalScore + data.score
        });
        
        // Show game over screen
        this.ui.showGameOverScreen({
            ...data,
            isNewHighScore
        });
        
        this.setState('gameOver');
    }
    
    handleGameOver() {
        // Additional game over handling
        if (this.game) {
            // Final statistics
            const gameData = this.game.getGameData();
            
            // Clean up game
            this.game.destroy();
            this.game = null;
        }
    }
    
    // Utility methods
    handleError(error) {
        console.error('Game error:', error);
        this.ui.showErrorDialog(error.message || 'An unexpected error occurred');
    }
    
    handleVisibilityChange(visible) {
        if (visible) {
            // Tab/window became visible
            if (this.currentState === 'playing') {
                // Resume if not manually paused
            }
        } else {
            // Tab/window became hidden
            if (this.currentState === 'playing') {
                this.pauseGame();
            }
        }
    }
    
    toggleMute() {
        if (this.audio) {
            this.audio.toggleMute();
        }
    }
    
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    getGameData() {
        return this.game ? this.game.getGameData() : null;
    }
    
    // Debug methods
    toggleDebugMode() {
        GameConfig.debug.enabled = !GameConfig.debug.enabled;
        console.log('Debug mode:', GameConfig.debug.enabled ? 'ON' : 'OFF');
    }
    
    skipToLevel(level) {
        if (level >= 1 && level <= GameConfig.maxLevels) {
            this.startLevel(level);
        }
    }
    
    addScore(points) {
        if (this.game && this.game.gameState) {
            this.game.gameState.addScore(points);
        }
    }
    
    toggleGodMode() {
        if (this.game && this.game.player) {
            this.game.player.godMode = !this.game.player.godMode;
            console.log('God mode:', this.game.player.godMode ? 'ON' : 'OFF');
        }
    }
    
    spawnBoss() {
        if (this.game) {
            this.game.spawnBoss();
        }
    }
    
    // Cleanup
    destroy() {
        // Stop game loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Remove event listeners
        this.inputHandlers.forEach((handler, eventType) => {
            document.removeEventListener(eventType, handler);
        });
        
        // Destroy systems
        if (this.game) {
            this.game.destroy();
        }
        
        if (this.ui) {
            this.ui.destroy();
        }
        
        if (this.auth) {
            this.auth.destroy();
        }
        
        console.log('🎮 Enhanced Space Invaders destroyed');
    }
}