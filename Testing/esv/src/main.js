// Main Entry Point - Enhanced Space Invaders
// This file initializes the complete game system with all enhancements

import { EnhancedSpaceInvaders } from './EnhancedSpaceInvaders.js';
import { GameConfig } from './config.js';

// Global game instance
let game = null;

// Initialize the enhanced game
async function initializeGame() {
    try {
        console.log('🚀 Initializing Enhanced Space Invaders...');
        
        // Get canvas and context
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        if (!canvas || !ctx) {
            throw new Error('Canvas not found. Make sure you have a canvas element with id="gameCanvas"');
        }
        
        // Set canvas size
        canvas.width = GameConfig.canvas.width;
        canvas.height = GameConfig.canvas.height;
        
        // Create enhanced game instance
        game = new EnhancedSpaceInvaders(canvas, ctx);
        
        // Initialize all game systems
        await game.initialize();
        
        // Set up error handling
        setupErrorHandling();
        
        // Set up performance monitoring
        setupPerformanceMonitoring();
        
        console.log('✅ Enhanced Space Invaders initialized successfully');
        
        // Start the game menu
        game.showMainMenu();
        
    } catch (error) {
        console.error('❌ Failed to initialize Enhanced Space Invaders:', error);
        showErrorScreen(error.message);
    }
}

// Error handling system
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Game Error:', event.error);
        if (game) {
            game.handleError(event.error);
        }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
        if (game) {
            game.handleError(event.reason);
        }
    });
}

// Performance monitoring
function setupPerformanceMonitoring() {
    if (GameConfig.debug.showPerformance) {
        setInterval(() => {
            if (game) {
                const metrics = game.getPerformanceMetrics();
                console.log('Performance:', metrics);
            }
        }, 5000);
    }
}

// Show error screen to user
function showErrorScreen(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="error-message">
                <h2>⚠️ Game Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-button">
                    Reload Game
                </button>
            </div>
        `;
        errorContainer.style.display = 'flex';
    }
}

// Loading screen management
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

// API key validation
function validateApiKeys() {
    const warnings = [];
    
    // Check Clerk keys
    if (!window.CLERK_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
        warnings.push('Clerk authentication will be disabled (no publishable key found)');
    }
    
    // Check Groq key
    if (!window.GROQ_API_KEY && !process.env.GROQ_API_KEY) {
        warnings.push('AI boss behavior will use fallback mode (no Groq API key found)');
    }
    
    if (warnings.length > 0) {
        console.warn('⚠️ API Key Warnings:');
        warnings.forEach(warning => console.warn(`  - ${warning}`));
        console.warn('  See README.md for setup instructions');
    }
    
    return warnings;
}

// Game lifecycle management
function startGame() {
    if (game) {
        game.start();
    }
}

function pauseGame() {
    if (game) {
        game.pause();
    }
}

function resumeGame() {
    if (game) {
        game.resume();
    }
}

function restartGame() {
    if (game) {
        game.restart();
    }
}

// Visibility API handling
document.addEventListener('visibilitychange', () => {
    if (game) {
        if (document.hidden) {
            game.handleVisibilityChange(false);
        } else {
            game.handleVisibilityChange(true);
        }
    }
});

// Fullscreen API
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn('Could not enable fullscreen mode:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Mobile device detection and handling
function setupMobileHandling() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile-device');
        
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Prevent pull-to-refresh
        document.body.addEventListener('touchstart', e => {
            if (e.touches.length === 1 && e.touches[0].clientY <= 30) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Lock orientation to landscape if supported
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {
                console.log('Could not lock orientation');
            });
        }
    }
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Don't handle shortcuts if typing in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.code) {
            case 'F11':
                event.preventDefault();
                toggleFullscreen();
                break;
                
            case 'KeyP':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (game) {
                        game.togglePause();
                    }
                }
                break;
                
            case 'KeyR':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (confirm('Restart the game?')) {
                        restartGame();
                    }
                }
                break;
                
            case 'KeyM':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (game) {
                        game.toggleMute();
                    }
                }
                break;
                
            case 'Escape':
                if (game) {
                    game.showPauseMenu();
                }
                break;
        }
    });
}

// Browser compatibility check
function checkBrowserCompatibility() {
    const requirements = {
        localStorage: typeof Storage !== 'undefined',
        canvas: !!document.createElement('canvas').getContext,
        webgl: !!document.createElement('canvas').getContext('webgl'),
        fetch: typeof fetch !== 'undefined',
        promise: typeof Promise !== 'undefined',
        es6: typeof Symbol !== 'undefined'
    };
    
    const unsupported = Object.entries(requirements)
        .filter(([feature, supported]) => !supported)
        .map(([feature]) => feature);
    
    if (unsupported.length > 0) {
        console.warn('⚠️ Browser compatibility issues:', unsupported);
        showCompatibilityWarning(unsupported);
        return false;
    }
    
    return true;
}

function showCompatibilityWarning(unsupportedFeatures) {
    const warning = document.createElement('div');
    warning.className = 'compatibility-warning';
    warning.innerHTML = `
        <div class="warning-content">
            <h3>⚠️ Browser Compatibility Warning</h3>
            <p>Your browser doesn't support some features required for the best experience:</p>
            <ul>
                ${unsupportedFeatures.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            <p>Please update your browser or try a different one.</p>
            <button onclick="this.parentElement.parentElement.remove()">Continue Anyway</button>
        </div>
    `;
    document.body.appendChild(warning);
}

// Development helpers
function setupDevelopmentHelpers() {
    if (GameConfig.debug.enabled) {
        // Expose game instance to window for debugging
        window.game = game;
        
        // Add debug panel
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.innerHTML = `
            <div class="debug-controls">
                <h4>Debug Controls</h4>
                <button onclick="game.toggleDebugMode()">Toggle Debug</button>
                <button onclick="game.skipToLevel(2)">Skip to Level 2</button>
                <button onclick="game.addScore(10000)">Add Score</button>
                <button onclick="game.toggleGodMode()">God Mode</button>
                <button onclick="game.spawnBoss()">Spawn Boss</button>
            </div>
        `;
        
        if (GameConfig.debug.showDebugPanel) {
            document.body.appendChild(debugPanel);
        }
        
        // Console commands
        console.log('🔧 Debug mode enabled. Available commands:');
        console.log('  - game.skipToLevel(n)');
        console.log('  - game.toggleGodMode()');
        console.log('  - game.addScore(points)');
        console.log('  - game.spawnBoss()');
        console.log('  - game.getGameData()');
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🎮 Enhanced Space Invaders v2.0.0');
        console.log('   AI-Powered Boss Battles');
        console.log('   Multi-Level Progression'); 
        console.log('   User Authentication');
        console.log('   Modern UI/UX');
        
        // Show loading screen
        showLoadingScreen();
        
        // Check browser compatibility
        if (!checkBrowserCompatibility()) {
            hideLoadingScreen();
            return;
        }
        
        // Validate API keys
        validateApiKeys();
        
        // Setup mobile handling
        setupMobileHandling();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Initialize the game
        await initializeGame();
        
        // Setup development helpers
        setupDevelopmentHelpers();
        
        // Hide loading screen
        hideLoadingScreen();
        
    } catch (error) {
        console.error('Failed to initialize:', error);
        hideLoadingScreen();
        showErrorScreen(error.message);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (game) {
        game.destroy();
    }
});

// Export for module systems
export { 
    game, 
    startGame, 
    pauseGame, 
    resumeGame, 
    restartGame, 
    toggleFullscreen 
};