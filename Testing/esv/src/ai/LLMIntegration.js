// LLM Integration for AI Boss Behavior
// This class handles communication with free open-source LLM APIs (Groq)

import { GameConfig } from '../config.js';

export class LLMIntegration {
    constructor() {
        this.apiUrl = GameConfig.ai.groqApiUrl;
        this.model = GameConfig.ai.model;
        this.apiKey = this.getApiKey();
        this.available = false;
        this.requestQueue = [];
        this.lastRequestTime = 0;
        this.rateLimitDelay = 1000; // 1 second between requests
        
        this.conversationHistory = [];
        this.maxHistoryLength = 5;
    }
    
    getApiKey() {
        // Try to get API key from various sources
        return (
            process.env.GROQ_API_KEY ||
            localStorage.getItem('groq_api_key') ||
            window.GROQ_API_KEY ||
            null
        );
    }
    
    async init() {
        if (!this.apiKey) {
            console.warn('⚠️ No Groq API key found. Using fallback behaviors.');
            this.available = false;
            return;
        }
        
        try {
            // Test API connectivity
            await this.testConnection();
            this.available = true;
            console.log('✅ LLM integration initialized successfully');
        } catch (error) {
            console.warn('⚠️ LLM initialization failed:', error.message);
            this.available = false;
        }
    }
    
    async testConnection() {
        const testPrompt = "Respond with 'OK' if you can hear me.";
        
        const response = await this.makeRequest([
            {
                role: 'user',
                content: testPrompt
            }
        ]);
        
        if (!response || !response.content) {
            throw new Error('Invalid response from LLM API');
        }
        
        return true;
    }
    
    async getBossDecision(context) {
        if (!this.available) {
            throw new Error('LLM not available');
        }
        
        // Rate limiting
        const now = Date.now();
        if (now - this.lastRequestTime < this.rateLimitDelay) {
            await new Promise(resolve => 
                setTimeout(resolve, this.rateLimitDelay - (now - this.lastRequestTime))
            );
        }
        
        try {
            const prompt = this.buildBossPrompt(context);
            const messages = this.buildConversation(prompt);
            
            const response = await this.makeRequest(messages);
            const decision = this.parseDecision(response.content, context);
            
            // Update conversation history
            this.updateConversationHistory(messages, response);
            
            this.lastRequestTime = Date.now();
            return decision;
            
        } catch (error) {
            console.error('LLM request failed:', error);
            throw error;
        }
    }
    
    buildBossPrompt(context) {
        const { boss, player, game } = context;
        
        // Get personality-specific prompt
        const personalityPrompt = GameConfig.ai.prompts[boss.personality] || 
                                GameConfig.ai.prompts.aggressive;
        
        const situationDescription = `
Current Situation:
- Boss: ${boss.name} (Health: ${Math.round(boss.healthPercent * 100)}%, Phase: ${boss.phase})${boss.enraged ? ' [ENRAGED]' : ''}
- Player: Distance ${Math.round(player.distance)}px, Moving ${player.movementPattern}, Accuracy ${Math.round(player.accuracy * 100)}%
- Game: Level ${game.level}, Difficulty ${game.difficulty}, Time ${Math.round(game.timeElapsed/1000)}s

Available attack patterns: ${context.availablePatterns.join(', ')}
Current pattern: ${context.currentPattern || 'None'} (${Math.round(context.patternTimer/1000)}s active)

${personalityPrompt}

Based on this situation, what should be your next action? Consider:
1. Which attack pattern to use
2. Where to move (relative to player position)
3. Any special actions needed
4. Whether to adapt difficulty based on player performance

Respond in this JSON format:
{
  "attackPattern": "pattern_name",
  "movement": {"target": "left/right/center/player", "speed": 1.0},
  "specialAction": {"type": "action_type", "parameters": {}},
  "adaptDifficulty": {"increase": false, "decrease": false},
  "reasoning": "brief explanation"
}`;
        
        return situationDescription;
    }
    
    buildConversation(prompt) {
        const messages = [
            {
                role: 'system',
                content: `You are an AI controlling a space boss enemy in a retro-style game. 
Your goal is to provide challenging but fair gameplay. 
Always respond with valid JSON containing your decision.
Be creative but stay within the game's mechanics.`
            }
        ];
        
        // Add conversation history for context
        messages.push(...this.conversationHistory.slice(-this.maxHistoryLength));
        
        // Add current prompt
        messages.push({
            role: 'user',
            content: prompt
        });
        
        return messages;
    }
    
    async makeRequest(messages) {
        const requestBody = {
            model: this.model,
            messages: messages,
            max_tokens: GameConfig.ai.maxTokens,
            temperature: GameConfig.ai.temperature,
            stream: false
        };
        
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0]) {
            throw new Error('Invalid API response format');
        }
        
        return {
            content: data.choices[0].message.content,
            usage: data.usage
        };
    }
    
    parseDecision(content, context) {
        try {
            // Clean up the response (remove any markdown formatting)
            let jsonStr = content.trim();
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.slice(7);
            }
            if (jsonStr.endsWith('```')) {
                jsonStr = jsonStr.slice(0, -3);
            }
            
            const decision = JSON.parse(jsonStr);
            
            // Validate and sanitize the decision
            return this.validateDecision(decision, context);
            
        } catch (error) {
            console.warn('Failed to parse LLM decision:', error.message);
            
            // Attempt to extract key information using regex
            return this.extractDecisionFromText(content, context);
        }
    }
    
    validateDecision(decision, context) {
        const validated = {
            attackPattern: null,
            movement: null,
            specialAction: null,
            adaptDifficulty: null,
            reasoning: decision.reasoning || 'AI decision'
        };
        
        // Validate attack pattern
        if (decision.attackPattern && context.availablePatterns.includes(decision.attackPattern)) {
            validated.attackPattern = decision.attackPattern;
        } else {
            // Default to a valid pattern
            validated.attackPattern = context.availablePatterns[0] || 'straight';
        }
        
        // Validate movement
        if (decision.movement && typeof decision.movement === 'object') {
            validated.movement = {
                target: this.validateMovementTarget(decision.movement.target),
                speed: Math.max(0.5, Math.min(2.0, decision.movement.speed || 1.0))
            };
        }
        
        // Validate special action
        if (decision.specialAction && typeof decision.specialAction === 'object') {
            const validActions = ['teleport', 'shield', 'heal', 'summon', 'rage'];
            if (validActions.includes(decision.specialAction.type)) {
                validated.specialAction = decision.specialAction;
            }
        }
        
        // Validate difficulty adaptation
        if (decision.adaptDifficulty && typeof decision.adaptDifficulty === 'object') {
            validated.adaptDifficulty = {
                increase: Boolean(decision.adaptDifficulty.increase),
                decrease: Boolean(decision.adaptDifficulty.decrease)
            };
        }
        
        return validated;
    }
    
    validateMovementTarget(target) {
        const validTargets = ['left', 'right', 'center', 'player', 'random'];
        return validTargets.includes(target) ? target : 'center';
    }
    
    extractDecisionFromText(content, context) {
        // Fallback text parsing for when JSON parsing fails
        const decision = {
            attackPattern: context.availablePatterns[0] || 'straight',
            movement: { target: 'center', speed: 1.0 },
            reasoning: 'Extracted from text response'
        };
        
        // Try to extract attack pattern
        for (const pattern of context.availablePatterns) {
            if (content.toLowerCase().includes(pattern.toLowerCase())) {
                decision.attackPattern = pattern;
                break;
            }
        }
        
        // Try to extract movement intent
        const movementKeywords = {
            'left': ['left', 'retreat', 'back'],
            'right': ['right', 'advance', 'forward'],
            'player': ['chase', 'follow', 'target'],
            'center': ['center', 'middle', 'central']
        };
        
        for (const [target, keywords] of Object.entries(movementKeywords)) {
            if (keywords.some(keyword => content.toLowerCase().includes(keyword))) {
                decision.movement.target = target;
                break;
            }
        }
        
        return decision;
    }
    
    updateConversationHistory(messages, response) {
        // Add the user message and AI response to history
        const userMessage = messages[messages.length - 1];
        this.conversationHistory.push(userMessage);
        this.conversationHistory.push({
            role: 'assistant',
            content: response.content
        });
        
        // Keep only the most recent conversations
        while (this.conversationHistory.length > this.maxHistoryLength * 2) {
            this.conversationHistory.shift();
        }
    }
    
    // Alternative free LLM APIs (fallback options)
    async tryAlternativeAPIs(prompt) {
        const alternatives = [
            {
                name: 'Hugging Face',
                url: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
                headers: { 'Authorization': `Bearer ${process.env.HF_API_KEY}` }
            },
            {
                name: 'OpenRouter',
                url: 'https://openrouter.ai/api/v1/chat/completions',
                headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
            }
        ];
        
        for (const api of alternatives) {
            try {
                if (!api.headers.Authorization.includes('undefined')) {
                    const response = await this.makeAlternativeRequest(api, prompt);
                    if (response) return response;
                }
            } catch (error) {
                console.warn(`Alternative API ${api.name} failed:`, error.message);
            }
        }
        
        throw new Error('All alternative APIs failed');
    }
    
    async makeAlternativeRequest(api, prompt) {
        // Implementation would depend on specific API requirements
        // This is a placeholder for alternative API integrations
        console.log(`Trying alternative API: ${api.name}`);
        return null;
    }
    
    // Utility methods
    isAvailable() {
        return this.available;
    }
    
    setAvailable(available) {
        this.available = available;
    }
    
    getUsageStats() {
        return {
            requestCount: this.conversationHistory.length / 2,
            available: this.available,
            lastRequestTime: this.lastRequestTime
        };
    }
    
    clearHistory() {
        this.conversationHistory = [];
    }
    
    // Setup API key from user input (for dynamic configuration)
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('groq_api_key', apiKey);
        
        // Re-test connection
        this.init();
    }
    
    // Get configuration for UI
    getConfiguration() {
        return {
            hasApiKey: Boolean(this.apiKey),
            available: this.available,
            model: this.model,
            rateLimitDelay: this.rateLimitDelay
        };
    }
    
    cleanup() {
        this.conversationHistory = [];
        this.requestQueue = [];
        this.available = false;
    }
}