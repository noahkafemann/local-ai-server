// Konfigurierbare API URL - kann über localStorage überschrieben werden
let API_BASE = localStorage.getItem('lmstudio_api_base') || 'http://192.168.2.28:1234';
let API_VERSION = localStorage.getItem('lmstudio_api_version') || 'v1';

function getChatCompletionsUrl() {
    return `${API_BASE}/${API_VERSION}/chat/completions`;
}

function getModelsUrl() {
    return `${API_BASE}/${API_VERSION}/models`;
}

let currentChatId = generateChatId();
let chats = loadChats();
let currentModel = null;
let isStreaming = false;
let abortController = null;
let lastError = null;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const newChatBtn = document.getElementById('newChatBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const chatHistory = document.getElementById('chatHistory');
const chatContainer = document.getElementById('chatContainer');
const messagesDiv = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcomeScreen');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const modelNameEl = document.getElementById('modelName');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Add API config to header
function setupAPIConfig() {
    const headerInfo = document.querySelector('.header-info');
    const configBtn = document.createElement('button');
    configBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319A1.873 1.873 0 0010.7 2.965l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 00.52 1.255l.319.094c.835.246.835 1.428 0 1.674l-.319.094a1.873.873 0 00-.52 1.255l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873.873 0 00-1.255.52l-.094.319c-.246.835-1.428.835-1.674 0l-.094-.319a1.873.873 0 00-1.255-.52l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 003.81 9.62l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873.873 0 003.81 6.067l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873.873 0 001.255-.52l.094-.319z"/>
        </svg>
    `;
    configBtn.className = 'config-btn';
    configBtn.title = 'API URL konfigurieren';
    configBtn.style.cssText = `
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-secondary);
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    `;
    configBtn.onmouseover = () => {
        configBtn.style.background = 'var(--bg-hover)';
        configBtn.style.color = 'var(--text-primary)';
    };
    configBtn.onmouseout = () => {
        configBtn.style.background = 'transparent';
        configBtn.style.color = 'var(--text-secondary)';
    };
    configBtn.onclick = showAPIConfig;
    headerInfo.appendChild(configBtn);
    
    updateServerUrlDisplay();
}

// Update server URL display
function updateServerUrlDisplay() {
    const display = document.getElementById('serverUrlDisplay');
    if (display) {
        display.textContent = `${API_BASE}/${API_VERSION}`;
    }
}

// Show API settings dialog
function showAPIConfig() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); z-index: 1000;
        display: flex; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; min-width: 420px; color: var(--text-primary);">
            <h3 style="margin-top: 0; color: var(--text-primary);">Einstellungen</h3>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary);">LM Studio Basis-URL</label>
                <input type="text" id="settingApiBase" value="${API_BASE}" style="width: 100%; padding: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-family: monospace;">
                <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">z.B. http://192.168.2.28:1234 (ohne /v1 am Ende)</div>
            </div>
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-top: 8px;">
                <h4 style="margin-top: 0; color: var(--accent-color); font-size: 13px;">Wichtig bei Verbindungsfehlern:</h4>
                <ul style="font-size: 12px; color: var(--text-secondary); margin: 8px 0; padding-left: 20px;">
                    <li>Öffne die Datei <code>index.html</code> direkt im Browser (Datei → Öffnen)</li>
                    <li>Oder starte lokal: <code>python -m http.server 8080</code> und öffne <code>http://localhost:8080</code></li>
                    <li>GitHub Pages (HTTPS) blockiert HTTP-Anfragen an lokale Server (Mixed Content)</li>
                    <li>In LM Studio: Developer → Local Server muss auf <code>192.168.2.28:1234</code> laufen</li>
                </ul>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
                <button id="settingsCancel" style="padding: 8px 16px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); cursor: pointer;">Schließen</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('settingsCancel').onclick = () => document.body.removeChild(modal);
    
    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };
}

// Initialize app
async function init() {
    // Clean up old proxy settings
    localStorage.removeItem('lmstudio_use_cors_proxy');
    localStorage.removeItem('lmstudio_cors_proxy');
    setupEventListeners();
    setupAPIConfig();
    await fetchModel();
    renderChatHistory();
    loadCurrentChat();
    setupTextareaAutoResize();
    checkConnection();
}

// Setup event listeners
function setupEventListeners() {
    newChatBtn.addEventListener('click', startNewChat);
    clearAllBtn.addEventListener('click', clearAllChats);
    sidebarToggle.addEventListener('click', toggleSidebar);
    mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    
    sendBtn.addEventListener('click', handleSendMessage);
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    messageInput.addEventListener('input', () => {
        updateSendButtonState();
    });
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// Setup textarea auto-resize
function setupTextareaAutoResize() {
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });
}

// Update send button state
function updateSendButtonState() {
    const hasText = messageInput.value.trim().length > 0;
    sendBtn.disabled = !hasText || isStreaming;
}

// Generate chat ID
function generateChatId() {
    return 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// Load chats from localStorage
function loadChats() {
    try {
        const stored = localStorage.getItem('local-ai-chats');
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

// Save chats to localStorage
function saveChats() {
    try {
        localStorage.setItem('local-ai-chats', JSON.stringify(chats));
    } catch (e) {
        // Ignore localStorage errors
    }
}

// Fetch model from LM Studio
async function fetchModel() {
    try {
        const response = await fetchWithCors(getModelsUrl(), { method: 'GET' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            currentModel = data.data[0].id;
            modelNameEl.textContent = currentModel;
            updateConnectionStatus(true);
        } else {
            modelNameEl.textContent = 'Kein Modell gefunden';
            updateConnectionStatus(false);
        }
    } catch (error) {
        console.error('Error fetching model:', error);
        modelNameEl.textContent = 'Verbindungsfehler';
        updateConnectionStatus(false);
    }
}

// Fetch with CORS handling
async function fetchWithCors(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                ...options.headers,
            },
        });
        return response;
    } catch (error) {
        throw error;
    }
}

// Test connection with detailed diagnostics
async function testConnection() {
    try {
        console.log('Testing connection to:', getModelsUrl());
        const response = await fetchWithCors(getModelsUrl(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Models response:', data);
        if (response.ok && data.data && data.data.length > 0) {
            currentModel = data.data[0].id;
            modelNameEl.textContent = currentModel;
        }
        updateConnectionStatus(response.ok);
        return response.ok;
    } catch (error) {
        console.error('Connection test failed:', error);
        updateConnectionStatus(false);
        return false;
    }
}

// Check connection
async function checkConnection() {
    try {
        await testConnection();
    } catch (error) {
        updateConnectionStatus(false);
    }
}

// Update connection status
function updateConnectionStatus(connected) {
    if (connected) {
        statusDot.classList.remove('error');
        statusDot.classList.add('connected');
        statusText.textContent = 'Verbunden';
    } else {
        statusDot.classList.remove('connected');
        statusDot.classList.add('error');
        statusText.textContent = 'Nicht erreichbar';
    }
}

// Toggle sidebar
function toggleSidebar() {
    sidebar.classList.toggle('open');
}

// Toggle mobile sidebar
function toggleMobileSidebar() {
    sidebar.classList.toggle('open');
}

// Start new chat
function startNewChat() {
    if (chats[currentChatId] && chats[currentChatId].messages && chats[currentChatId].messages.length > 0) {
        saveChats();
    }
    
    currentChatId = generateChatId();
    if (!chats[currentChatId]) {
        chats[currentChatId] = {
            id: currentChatId,
            title: 'Neuer Chat',
            messages: [],
            createdAt: Date.now()
        };
    }
    
    renderChatHistory();
    loadCurrentChat();
    messageInput.focus();
    
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

// Clear all chats
function clearAllChats() {
    if (confirm('Möchtest du wirklich alle Chats löschen?')) {
        chats = {};
        saveChats();
        currentChatId = generateChatId();
        chats[currentChatId] = {
            id: currentChatId,
            title: 'Neuer Chat',
            messages: [],
            createdAt: Date.now()
        };
        renderChatHistory();
        loadCurrentChat();
    }
}

// Render chat history
function renderChatHistory() {
    chatHistory.innerHTML = '';
    
    const chatIds = Object.keys(chats).sort((a, b) => {
        return (chats[b].createdAt || 0) - (chats[a].createdAt || 0);
    });
    
    for (const chatId of chatIds) {
        const chat = chats[chatId];
        const item = document.createElement('button');
        item.className = 'chat-history-item';
        if (chatId === currentChatId) {
            item.classList.add('active');
        }
        item.textContent = chat.title || 'Neuer Chat';
        item.title = chat.title || 'Neuer Chat';
        item.onclick = () => switchChat(chatId);
        chatHistory.appendChild(item);
    }
}

// Switch chat
function switchChat(chatId) {
    if (chats[currentChatId] && chats[currentChatId].messages && chats[currentChatId].messages.length > 0) {
        saveChats();
    }
    
    currentChatId = chatId;
    renderChatHistory();
    loadCurrentChat();
    
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

// Load current chat
function loadCurrentChat() {
    const chat = chats[currentChatId];
    if (!chat) {
        chats[currentChatId] = {
            id: currentChatId,
            title: 'Neuer Chat',
            messages: [],
            createdAt: Date.now()
        };
    }
    
    messagesDiv.innerHTML = '';
    
    if (chats[currentChatId].messages.length === 0) {
        welcomeScreen.style.display = 'block';
    } else {
        welcomeScreen.style.display = 'none';
        for (const msg of chats[currentChatId].messages) {
            renderMessage(msg.role, msg.content, false);
        }
        scrollToBottom();
    }
}

// Render message
function renderMessage(role, content, animate = true) {
    welcomeScreen.style.display = 'none';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
    if (!animate) {
        messageDiv.style.animation = 'none';
    }
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'Du' : 'KI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const roleDiv = document.createElement('div');
    roleDiv.className = 'message-role';
    roleDiv.textContent = role === 'user' ? 'Du' : 'Assistent';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    
    if (role === 'assistant') {
        textDiv.innerHTML = marked.parse(content || '');
        textDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } else {
        textDiv.textContent = content;
    }
    
    contentDiv.appendChild(roleDiv);
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    
    if (animate) {
        scrollToBottom();
    }
}

// Add loading indicator
function addLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant-message';
    loadingDiv.id = 'loadingIndicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'KI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const roleDiv = document.createElement('div');
    roleDiv.className = 'message-role';
    roleDiv.textContent = 'Assistent';
    
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    indicator.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div>';
    
    contentDiv.appendChild(roleDiv);
    contentDiv.appendChild(indicator);
    loadingDiv.appendChild(avatar);
    loadingDiv.appendChild(contentDiv);
    messagesDiv.appendChild(loadingDiv);
    scrollToBottom();
}

// Remove loading indicator
function removeLoadingIndicator() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
        loading.remove();
    }
}

// Handle send message
async function handleSendMessage() {
    const message = messageInput.value.trim();
    if (!message || isStreaming) return;
    
    if (chats[currentChatId].messages.length === 0) {
        chats[currentChatId].title = message.length > 50 ? message.substring(0, 47) + '...' : message;
        renderChatHistory();
    }
    
    chats[currentChatId].messages.push({
        role: 'user',
        content: message
    });
    
    renderMessage('user', message);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateSendButtonState();
    
    saveChats();
    
    await getAIResponse();
}

// Get AI response with streaming
async function getAIResponse() {
    isStreaming = true;
    updateSendButtonState();
    sendBtn.disabled = true;
    
    const messages = chats[currentChatId].messages.map(m => ({
        role: m.role,
        content: m.content
    }));
    
    addLoadingIndicator();
    
    try {
        abortController = new AbortController();
        
        const response = await fetchWithCors(getChatCompletionsUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                model: currentModel,
                messages: messages,
                stream: true,
                temperature: 0.7,
            }),
            signal: abortController.signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        removeLoadingIndicator();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'KI';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const roleDiv = document.createElement('div');
        roleDiv.className = 'message-role';
        roleDiv.textContent = 'Assistent';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        contentDiv.appendChild(roleDiv);
        contentDiv.appendChild(textDiv);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        messagesDiv.appendChild(messageDiv);
        
        let fullContent = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content || '';
                        if (content) {
                            fullContent += content;
                            textDiv.innerHTML = marked.parse(fullContent);
                            textDiv.querySelectorAll('pre code').forEach((block) => {
                                hljs.highlightElement(block);
                            });
                            scrollToBottom();
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
        
        if (fullContent) {
            chats[currentChatId].messages.push({
                role: 'assistant',
                content: fullContent
            });
            saveChats();
        }
        
    } catch (error) {
        console.error('Error getting AI response:', error);
        removeLoadingIndicator();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message assistant-message';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'KI';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const roleDiv = document.createElement('div');
        roleDiv.className = 'message-role';
        roleDiv.textContent = 'Fehler';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.style.color = 'var(--error-color)';
        
        let errorMsg = '';
        if (error.name === 'AbortError') {
            errorMsg = 'Anfrage abgebrochen.';
        } else if (error.message && error.message.includes('NetworkError')) {
            errorMsg = 'Netzwerkfehler. ';
            if (window.location.protocol === 'https:') {
                errorMsg += 'GitHub Pages (HTTPS) blockiert HTTP-Anfragen an lokale Server. ';
                errorMsg += 'Öffne index.html direkt im Browser oder nutze einen lokalen Server (python -m http.server).';
            } else {
                errorMsg += 'Stelle sicher, dass LM Studio läuft und erreichbar ist.';
            }
        } else if (error.message && error.message.includes('HTTP')) {
            errorMsg = `Server-Fehler: ${error.message}. LM Studio antwortet, aber mit einem Fehler.`;
        } else {
            errorMsg = `Verbindungsfehler: ${error.message || 'Unbekannter Fehler'}. `;
            errorMsg += 'Stelle sicher, dass LM Studio läuft und erreichbar ist.';
        }
        
        textDiv.textContent = errorMsg;
        
        contentDiv.appendChild(roleDiv);
        contentDiv.appendChild(textDiv);
        errorDiv.appendChild(avatar);
        errorDiv.appendChild(contentDiv);
        messagesDiv.appendChild(errorDiv);
        scrollToBottom();
    } finally {
        isStreaming = false;
        updateSendButtonState();
        abortController = null;
    }
}

// Scroll to bottom
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
