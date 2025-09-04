// User Management System
// Handles user data, progress synchronization, and profile management

export class UserManager {
    constructor(auth, storage) {
        this.auth = auth;
        this.storage = storage;
        
        // User state
        this.currentUser = null;
        this.isSignedIn = false;
        
        // Data synchronization
        this.syncInProgress = false;
        this.lastSyncTime = 0;
        this.syncInterval = 300000; // 5 minutes
        
        // Offline queue
        this.offlineQueue = [];
        
        // Event listeners
        this.eventListeners = new Map();
        
        this.initialize();
    }
    
    async initialize() {
        console.log('👥 Initializing User Manager...');
        
        // Check for existing user
        await this.checkAuthState();
        
        // Set up auth event listeners
        this.setupAuthEventListeners();
        
        // Set up sync timer
        this.setupSyncTimer();
        
        // Process offline queue
        await this.processOfflineQueue();
        
        console.log('✅ User Manager initialized');
    }
    
    async checkAuthState() {
        try {
            this.currentUser = await this.auth.getCurrentUser();
            this.isSignedIn = !!this.currentUser;
            
            if (this.isSignedIn) {
                await this.onUserSignedIn(this.currentUser);
            }
        } catch (error) {
            console.warn('Auth state check failed:', error);
            this.isSignedIn = false;
        }
    }
    
    setupAuthEventListeners() {
        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            this.handleAuthStateChange(user);
        });
        
        // Listen for sign-in
        this.auth.onSignIn((user) => {
            this.onUserSignedIn(user);
        });
        
        // Listen for sign-out
        this.auth.onSignOut(() => {
            this.onUserSignedOut();
        });
    }
    
    setupSyncTimer() {
        // Auto-sync every 5 minutes if signed in
        setInterval(() => {
            if (this.isSignedIn && !this.syncInProgress) {
                this.syncUserData();
            }
        }, this.syncInterval);
    }
    
    async handleAuthStateChange(user) {
        const wasSignedIn = this.isSignedIn;
        this.currentUser = user;
        this.isSignedIn = !!user;
        
        if (this.isSignedIn && !wasSignedIn) {
            await this.onUserSignedIn(user);
        } else if (!this.isSignedIn && wasSignedIn) {
            this.onUserSignedOut();
        }
        
        // Emit auth state changed event
        this.emit('authStateChanged', { user, isSignedIn: this.isSignedIn });
    }
    
    async onUserSignedIn(user) {
        console.log('👤 User signed in:', user.primaryEmailAddress?.emailAddress || user.id);
        
        try {
            // Load user profile
            await this.loadUserProfile(user);
            
            // Sync local data with cloud
            await this.syncUserData();
            
            // Emit sign-in event
            this.emit('userSignedIn', { user });
            
        } catch (error) {
            console.error('Error handling user sign-in:', error);
        }
    }
    
    onUserSignedOut() {
        console.log('👤 User signed out');
        
        // Clear user data
        this.currentUser = null;
        this.isSignedIn = false;
        
        // Emit sign-out event
        this.emit('userSignedOut', {});
    }
    
    async loadUserProfile(user) {
        try {
            // Load user metadata from Clerk
            const userMetadata = await this.auth.getUserMetadata();
            
            // Merge with local data
            const localProfile = this.storage.loadUserProfile();
            
            const profile = {
                id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                name: this.getUserDisplayName(user),
                avatar: user.imageUrl,
                createdAt: user.createdAt,
                lastSignIn: user.lastSignInAt,
                ...localProfile,
                ...userMetadata
            };
            
            // Save merged profile
            this.storage.saveUserProfile(profile);
            
            return profile;
            
        } catch (error) {
            console.error('Failed to load user profile:', error);
            throw error;
        }
    }
    
    async syncUserData() {
        if (this.syncInProgress || !this.isSignedIn) return;
        
        console.log('🔄 Syncing user data...');
        this.syncInProgress = true;
        
        try {
            // Get local data
            const localData = {
                gameProgress: this.storage.getAllLevelProgress(),
                statistics: this.storage.loadStatistics(),
                achievements: this.storage.loadAchievements(),
                preferences: this.storage.loadUserPreferences(),
                highScores: this.storage.getHighScores()
            };
            
            // Get cloud data
            const cloudData = await this.auth.getUserData();
            
            // Merge data (local takes precedence for newer data)
            const mergedData = this.mergeUserData(localData, cloudData);
            
            // Save merged data locally
            this.saveMergedData(mergedData);
            
            // Upload to cloud
            await this.auth.saveUserData(mergedData);
            
            this.lastSyncTime = Date.now();
            console.log('✅ User data synced successfully');
            
        } catch (error) {
            console.error('Failed to sync user data:', error);
        } finally {
            this.syncInProgress = false;
        }
    }
    
    mergeUserData(localData, cloudData) {
        if (!cloudData) return localData;
        
        return {
            gameProgress: this.mergeLevelProgress(localData.gameProgress, cloudData.gameProgress),
            statistics: this.mergeStatistics(localData.statistics, cloudData.statistics),
            achievements: this.mergeAchievements(localData.achievements, cloudData.achievements),
            preferences: { ...cloudData.preferences, ...localData.preferences },
            highScores: this.mergeHighScores(localData.highScores, cloudData.highScores)
        };
    }
    
    mergeLevelProgress(local, cloud) {
        if (!cloud) return local;
        
        const merged = [...local];
        
        cloud.forEach(cloudLevel => {
            const localIndex = merged.findIndex(l => l.level === cloudLevel.level);
            
            if (localIndex >= 0) {
                const localLevel = merged[localIndex];
                
                // Keep best score and highest stars
                merged[localIndex] = {
                    ...cloudLevel,
                    bestScore: Math.max(localLevel.bestScore || 0, cloudLevel.bestScore || 0),
                    stars: Math.max(localLevel.stars || 0, cloudLevel.stars || 0),
                    completed: localLevel.completed || cloudLevel.completed,
                    lastPlayed: Math.max(localLevel.lastPlayed || 0, cloudLevel.lastPlayed || 0)
                };
            } else {
                merged.push(cloudLevel);
            }
        });
        
        return merged;
    }
    
    mergeStatistics(local, cloud) {
        if (!cloud) return local;
        
        return {
            gamesPlayed: (local.gamesPlayed || 0) + (cloud.gamesPlayed || 0),
            totalScore: Math.max(local.totalScore || 0, cloud.totalScore || 0),
            totalPlayTime: (local.totalPlayTime || 0) + (cloud.totalPlayTime || 0),
            enemiesDestroyed: (local.enemiesDestroyed || 0) + (cloud.enemiesDestroyed || 0),
            shotsFired: (local.shotsFired || 0) + (cloud.shotsFired || 0),
            shotsHit: (local.shotsHit || 0) + (cloud.shotsHit || 0),
            accuracy: Math.max(local.accuracy || 0, cloud.accuracy || 0),
            maxCombo: Math.max(local.maxCombo || 0, cloud.maxCombo || 0),
            levelsCompleted: Math.max(local.levelsCompleted || 0, cloud.levelsCompleted || 0),
            totalStars: Math.max(local.totalStars || 0, cloud.totalStars || 0),
            achievementsUnlocked: Math.max(local.achievementsUnlocked || 0, cloud.achievementsUnlocked || 0)
        };
    }
    
    mergeAchievements(local, cloud) {
        if (!cloud) return local;
        
        const merged = [...local];
        const localIds = local.map(a => a.id);
        
        cloud.forEach(cloudAchievement => {
            if (!localIds.includes(cloudAchievement.id)) {
                merged.push(cloudAchievement);
            }
        });
        
        return merged;
    }
    
    mergeHighScores(local, cloud) {
        if (!cloud) return local;
        
        const merged = [...local, ...cloud];
        
        // Remove duplicates and sort by score
        return merged
            .filter((score, index, arr) => 
                arr.findIndex(s => s.id === score.id) === index
            )
            .sort((a, b) => b.score - a.score)
            .slice(0, 100); // Keep top 100
    }
    
    saveMergedData(data) {
        // Save each data type
        if (data.gameProgress) {
            data.gameProgress.forEach(level => {
                this.storage.updateLevelProgress(
                    level.level, 
                    level.completed, 
                    level.bestScore, 
                    level.stars
                );
            });
        }
        
        if (data.statistics) {
            this.storage.updateStatistics(data.statistics);
        }
        
        if (data.achievements) {
            this.storage.saveAchievements(data.achievements);
        }
        
        if (data.preferences) {
            this.storage.saveUserPreferences(data.preferences);
        }
        
        if (data.highScores) {
            this.storage.setHighScores(data.highScores);
        }
    }
    
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;
        
        console.log(`📡 Processing ${this.offlineQueue.length} offline actions...`);
        
        for (const action of this.offlineQueue) {
            try {
                await this.processOfflineAction(action);
            } catch (error) {
                console.error('Failed to process offline action:', error);
            }
        }
        
        this.offlineQueue = [];
    }
    
    async processOfflineAction(action) {
        switch (action.type) {
            case 'levelComplete':
                await this.updateLevelProgress(
                    action.level,
                    action.completed,
                    action.score,
                    action.stars
                );
                break;
                
            case 'achievementUnlocked':
                await this.unlockAchievement(action.achievementId);
                break;
                
            case 'statisticsUpdate':
                await this.updateStatistics(action.statistics);
                break;
        }
    }
    
    // Public API methods
    async updateLevelProgress(level, completed, score, stars) {
        // Update locally first
        this.storage.updateLevelProgress(level, completed, score, stars);
        
        if (this.isSignedIn) {
            try {
                // Sync to cloud
                await this.auth.updateLevelProgress(level, completed, score, stars);
            } catch (error) {
                console.warn('Failed to sync level progress to cloud:', error);
                this.addToOfflineQueue('levelComplete', { level, completed, score, stars });
            }
        } else {
            this.addToOfflineQueue('levelComplete', { level, completed, score, stars });
        }
        
        this.emit('levelProgressUpdated', { level, completed, score, stars });
    }
    
    async unlockAchievement(achievementId) {
        // Check if already unlocked
        const achievements = this.storage.loadAchievements();
        if (achievements.find(a => a.id === achievementId)) {
            return;
        }
        
        const achievement = {
            id: achievementId,
            unlockedAt: Date.now()
        };
        
        // Update locally
        this.storage.addAchievement(achievement);
        
        if (this.isSignedIn) {
            try {
                // Sync to cloud
                await this.auth.unlockAchievement(achievementId);
            } catch (error) {
                console.warn('Failed to sync achievement to cloud:', error);
                this.addToOfflineQueue('achievementUnlocked', { achievementId });
            }
        } else {
            this.addToOfflineQueue('achievementUnlocked', { achievementId });
        }
        
        this.emit('achievementUnlocked', { achievementId, achievement });
    }
    
    async updateStatistics(newStats) {
        // Update locally
        this.storage.updateStatistics(newStats);
        
        if (this.isSignedIn) {
            try {
                // Sync to cloud
                await this.auth.updateStatistics(newStats);
            } catch (error) {
                console.warn('Failed to sync statistics to cloud:', error);
                this.addToOfflineQueue('statisticsUpdate', { statistics: newStats });
            }
        } else {
            this.addToOfflineQueue('statisticsUpdate', { statistics: newStats });
        }
        
        this.emit('statisticsUpdated', { statistics: newStats });
    }
    
    addToOfflineQueue(type, data) {
        this.offlineQueue.push({
            type,
            data,
            timestamp: Date.now()
        });
    }
    
    // User info methods
    getUserDisplayName(user = this.currentUser) {
        if (!user) return 'Anonymous Player';
        
        if (user.firstName && user.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        
        if (user.firstName) {
            return user.firstName;
        }
        
        if (user.username) {
            return user.username;
        }
        
        if (user.primaryEmailAddress?.emailAddress) {
            return user.primaryEmailAddress.emailAddress.split('@')[0];
        }
        
        return 'Player';
    }
    
    getUserAvatar(user = this.currentUser) {
        return user?.imageUrl || null;
    }
    
    getUserId(user = this.currentUser) {
        return user?.id || null;
    }
    
    // Event system
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
        
        // Also emit as window event for other components
        const customEvent = new CustomEvent(event, { detail: data });
        window.dispatchEvent(customEvent);
    }
    
    // Getters
    isUserSignedIn() {
        return this.isSignedIn;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getLastSyncTime() {
        return this.lastSyncTime;
    }
    
    isSyncInProgress() {
        return this.syncInProgress;
    }
    
    getOfflineQueueSize() {
        return this.offlineQueue.length;
    }
    
    // Manual sync trigger
    async forcSync() {
        if (this.isSignedIn) {
            await this.syncUserData();
        }
    }
    
    // Data export/import for backup
    exportUserData() {
        return {
            gameProgress: this.storage.getAllLevelProgress(),
            statistics: this.storage.loadStatistics(),
            achievements: this.storage.loadAchievements(),
            preferences: this.storage.loadUserPreferences(),
            highScores: this.storage.getHighScores(),
            exportDate: Date.now()
        };
    }
    
    async importUserData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid user data format');
        }
        
        // Validate data structure
        this.validateUserData(data);
        
        // Merge with existing data
        const existingData = this.exportUserData();
        const mergedData = this.mergeUserData(existingData, data);
        
        // Save merged data
        this.saveMergedData(mergedData);
        
        // Sync to cloud if signed in
        if (this.isSignedIn) {
            await this.syncUserData();
        }
        
        this.emit('userDataImported', { imported: data, merged: mergedData });
    }
    
    validateUserData(data) {
        const requiredKeys = ['gameProgress', 'statistics', 'achievements', 'preferences'];
        
        for (const key of requiredKeys) {
            if (!(key in data)) {
                throw new Error(`Missing required data key: ${key}`);
            }
        }
        
        // Additional validation could be added here
    }
    
    // Cleanup
    destroy() {
        // Clear timers
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        
        // Clear event listeners
        this.eventListeners.clear();
        
        console.log('👥 User Manager destroyed');
    }
}