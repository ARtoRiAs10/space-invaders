// Clerk Authentication Integration
// This class handles user authentication using Clerk

export class ClerkAuth {
    constructor() {
        this.clerk = null;
        this.user = null;
        this.isInitialized = false;
        
        // Configuration
        this.publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 
                           import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
                           window.CLERK_PUBLISHABLE_KEY;
    }
    
    async init() {
        if (!this.publishableKey) {
            console.warn('⚠️ No Clerk publishable key found. Authentication disabled.');
            return;
        }
        
        try {
            // Check if Clerk is available globally
            if (typeof window.Clerk !== 'undefined') {
                this.clerk = window.Clerk;
            } else {
                console.warn('Clerk not loaded. Authentication features disabled.');
                return;
            }
            
            // Initialize Clerk
            await this.clerk.load({
                publishableKey: this.publishableKey
            });
            
            // Get current user
            this.user = this.clerk.user;
            this.isInitialized = true;
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('✅ Clerk authentication initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Clerk:', error);
        }
    }
    
    setupEventListeners() {
        if (!this.clerk) return;
        
        // Listen for sign-in events
        this.clerk.addListener('user', (user) => {
            this.user = user;
            this.onUserChange(user);
        });
        
        // Listen for sign-out events
        this.clerk.addListener('session', (session) => {
            if (!session) {
                this.user = null;
                this.onUserChange(null);
            }
        });
    }
    
    onUserChange(user) {
        // Emit custom event for game to handle
        const event = new CustomEvent('authStateChanged', {
            detail: { user }
        });
        window.dispatchEvent(event);
    }
    
    // Authentication methods
    async signIn() {
        if (!this.clerk) return null;
        
        try {
            await this.clerk.openSignIn();
        } catch (error) {
            console.error('Sign in failed:', error);
            throw error;
        }
    }
    
    async signUp() {
        if (!this.clerk) return null;
        
        try {
            await this.clerk.openSignUp();
        } catch (error) {
            console.error('Sign up failed:', error);
            throw error;
        }
    }
    
    async signOut() {
        if (!this.clerk) return;
        
        try {
            await this.clerk.signOut();
            this.user = null;
        } catch (error) {
            console.error('Sign out failed:', error);
            throw error;
        }
    }
    
    // User information
    getUser() {
        return this.user;
    }
    
    isSignedIn() {
        return Boolean(this.user);
    }
    
    getUserId() {
        return this.user?.id || null;
    }
    
    getUserName() {
        return this.user?.firstName || this.user?.username || 'Anonymous';
    }
    
    getUserEmail() {
        return this.user?.emailAddresses?.[0]?.emailAddress || null;
    }
    
    getUserAvatar() {
        return this.user?.profileImageUrl || null;
    }
    
    // User metadata for game features
    async updateUserMetadata(metadata) {
        if (!this.user) return;
        
        try {
            await this.user.update({
                publicMetadata: {
                    ...this.user.publicMetadata,
                    ...metadata
                }
            });
        } catch (error) {
            console.error('Failed to update user metadata:', error);
            throw error;
        }
    }
    
    getUserMetadata() {
        return this.user?.publicMetadata || {};
    }
    
    // Game-specific user data
    async saveGameProgress(progress) {
        if (!this.user) return;
        
        const gameData = {
            progress,
            lastUpdated: new Date().toISOString()
        };
        
        await this.updateUserMetadata({ gameProgress: gameData });
    }
    
    getGameProgress() {
        const metadata = this.getUserMetadata();
        return metadata.gameProgress?.progress || null;
    }
    
    async saveHighScore(score, level) {
        if (!this.user) return;
        
        const currentHighScores = this.getHighScores();
        const newScore = {
            score,
            level,
            date: new Date().toISOString()
        };
        
        // Update high scores
        if (!currentHighScores.best || score > currentHighScores.best.score) {
            currentHighScores.best = newScore;
        }
        
        // Add to recent scores
        if (!currentHighScores.recent) {
            currentHighScores.recent = [];
        }
        currentHighScores.recent.unshift(newScore);
        
        // Keep only top 10 recent scores
        currentHighScores.recent = currentHighScores.recent.slice(0, 10);
        
        await this.updateUserMetadata({ highScores: currentHighScores });
        
        return currentHighScores.best.score === score; // Return true if new high score
    }
    
    getHighScores() {
        const metadata = this.getUserMetadata();
        return metadata.highScores || { best: null, recent: [] };
    }
    
    async saveUserSettings(settings) {
        if (!this.user) return;
        
        await this.updateUserMetadata({ gameSettings: settings });
    }
    
    getUserSettings() {
        const metadata = this.getUserMetadata();
        return metadata.gameSettings || {};
    }
    
    // Achievement system
    async unlockAchievement(achievementId) {
        if (!this.user) return;
        
        const achievements = this.getAchievements();
        if (!achievements.includes(achievementId)) {
            achievements.push(achievementId);
            await this.updateUserMetadata({ achievements });
            
            // Emit achievement unlocked event
            const event = new CustomEvent('achievementUnlocked', {
                detail: { achievementId }
            });
            window.dispatchEvent(event);
        }
    }
    
    getAchievements() {
        const metadata = this.getUserMetadata();
        return metadata.achievements || [];
    }
    
    hasAchievement(achievementId) {
        return this.getAchievements().includes(achievementId);
    }
    
    // Level progression
    async unlockLevel(level) {
        if (!this.user) return;
        
        const unlockedLevels = this.getUnlockedLevels();
        if (!unlockedLevels.includes(level)) {
            unlockedLevels.push(level);
            unlockedLevels.sort((a, b) => a - b);
            await this.updateUserMetadata({ unlockedLevels });
        }
    }
    
    getUnlockedLevels() {
        const metadata = this.getUserMetadata();
        return metadata.unlockedLevels || [1]; // Level 1 is always unlocked
    }
    
    isLevelUnlocked(level) {
        return this.getUnlockedLevels().includes(level);
    }
    
    // Statistics tracking
    async updateStats(stats) {
        if (!this.user) return;
        
        const currentStats = this.getStats();
        const updatedStats = {
            ...currentStats,
            ...stats,
            lastUpdated: new Date().toISOString()
        };
        
        // Calculate derived statistics
        if (updatedStats.totalShots && updatedStats.totalHits) {
            updatedStats.accuracy = updatedStats.totalHits / updatedStats.totalShots;
        }
        
        await this.updateUserMetadata({ statistics: updatedStats });
    }
    
    getStats() {
        const metadata = this.getUserMetadata();
        return metadata.statistics || {
            gamesPlayed: 0,
            totalScore: 0,
            totalPlayTime: 0,
            enemiesDestroyed: 0,
            bossesDefeated: 0,
            totalShots: 0,
            totalHits: 0,
            accuracy: 0,
            levelsCompleted: 0
        };
    }
    
    // Profile management
    getProfileSummary() {
        const stats = this.getStats();
        const highScores = this.getHighScores();
        const achievements = this.getAchievements();
        const unlockedLevels = this.getUnlockedLevels();
        
        return {
            user: {
                id: this.getUserId(),
                name: this.getUserName(),
                email: this.getUserEmail(),
                avatar: this.getUserAvatar()
            },
            game: {
                highScore: highScores.best?.score || 0,
                gamesPlayed: stats.gamesPlayed,
                accuracy: Math.round((stats.accuracy || 0) * 100),
                achievementCount: achievements.length,
                maxLevelUnlocked: Math.max(...unlockedLevels),
                totalPlayTime: this.formatPlayTime(stats.totalPlayTime || 0)
            }
        };
    }
    
    formatPlayTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    // UI Helper methods
    renderAuthButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container || !this.clerk) return;
        
        container.innerHTML = '';
        
        if (this.isSignedIn()) {
            // Show user button
            const userButton = this.clerk.mountUserButton(container, {
                appearance: {
                    elements: {
                        userButtonAvatarBox: 'w-8 h-8',
                        userButtonPopoverCard: 'bg-gray-900 border border-cyan-400',
                        userButtonPopoverActionButton: 'text-cyan-400 hover:bg-gray-800'
                    }
                }
            });
        } else {
            // Show sign-in buttons
            const signInBtn = document.createElement('button');
            signInBtn.textContent = 'Sign In';
            signInBtn.className = 'retro-button mr-2';
            signInBtn.onclick = () => this.signIn();
            
            const signUpBtn = document.createElement('button');
            signUpBtn.textContent = 'Sign Up';
            signUpBtn.className = 'retro-button';
            signUpBtn.onclick = () => this.signUp();
            
            container.appendChild(signInBtn);
            container.appendChild(signUpBtn);
        }
    }
    
    // Cleanup
    destroy() {
        if (this.clerk) {
            this.clerk.removeAllListeners();
        }
        this.user = null;
        this.isInitialized = false;
    }
}