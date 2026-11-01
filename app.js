const API_BASE = 'http://192.168.2.28:1234/v1';
const API_CHAT_COMPLETIONS = `${API_BASE}/chat/completions`;
const API_MODELS = `${API_BASE}/models`;

let currentChatId = generateChatId();
let chats = loadChats();
let currentModel = null;
let isStreaming = false;
let abortController = null;

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

// Initialize app
async function init() {
    setupEventListeners();
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
    
    // Close sidebar when clicking outside on mobile
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
        const response = await fetch(API_MODELS);
        if (!response.ok) throw new Error('Failed to fetch models');
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

// Check connection
async function checkConnection() {
    try {
        const response = await fetch(API_MODELS, { method: 'GET' });
        updateConnectionStatus(response.ok);
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
    // Save current chat if it has messages
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
    
    // Close mobile sidebar
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
        // Render markdown
        textDiv.innerHTML = marked.parse(content || '');
        // Apply syntax highlighting
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
    
    // Update chat title if it's the first message
    if (chats[currentChatId].messages.length === 0) {
        chats[currentChatId].title = message.length > 50 ? message.substring(0, 47) + '...' : message;
        renderChatHistory();
    }
    
    // Add user message
    chats[currentChatId].messages.push({
        role: 'user',
        content: message
    });
    
    renderMessage('user', message);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateSendButtonState();
    
    // Save chats
    saveChats();
    
    // Start streaming response
    await getAIResponse();
}

// Get AI response with streaming
async function getAIResponse() {
    isStreaming = true;
    updateSendButtonState();
    sendBtn.disabled = true;
    
    // Prepare messages for API (send full conversation history)
    const messages = chats[currentChatId].messages.map(m => ({
        role: m.role,
        content: m.content
    }));
    
    addLoadingIndicator();
    
    try {
        abortController = new AbortController();
        
        const response = await fetch(API_CHAT_COMPLETIONS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
        
        // Create assistant message element
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
                            // Render incrementally as markdown
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
        
        // Save assistant message
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
        
        // Show error message
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
        
        let errorMsg = 'Verbindungsfehler. ';
        if (error.name === 'AbortError') {
            errorMsg += 'Anfrage abgebrochen.';
        } else if (window.location.protocol === 'https:' && API_BASE.startsWith('http:')) {
            errorMsg += 'Gemischter Inhalt (HTTPS zu HTTP) wird von Browsern blockiert. Siehe README für Lösungen.';
        } else {
            errorMsg += 'Stelle sicher, dass LM Studio läuft und unter http://192.168.2.28:1234 erreichbar ist.';
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
