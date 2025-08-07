// =================================================================================
// MÓDULO: UTILITÁRIOS E SERVIÇOS AUXILIARES
// =================================================================================
import { auth, db } from './firebase-config.js';
import { DataService } from './services.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================================
// DOM UTILS
// =================================================================================
export const DOM = {
    qs: (selector, parent = document) => parent.querySelector(selector),
    qsa: (selector, parent = document) => parent.querySelectorAll(selector),
    render: (selector, html) => {
        const element = DOM.qs(selector);
        if (element) element.innerHTML = html;
    },
    showToast: (message, type = 'success') => {
        const toast = DOM.qs('#toast-notification');
        if (!toast) return;
        
        const toastIcon = DOM.qs('#toast-icon');
        const toastMessage = DOM.qs('#toast-message');
        
        if (toastMessage) toastMessage.textContent = message;
        
        // Reset classes
        toast.className = 'fixed top-5 right-5 px-6 py-4 rounded-lg shadow-lg z-[2000] flex items-center gap-3';
        if (toastIcon) toastIcon.className = '';
        
        const types = {
            success: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', icon: 'fas fa-check-circle' },
            error: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', icon: 'fas fa-times-circle' },
            info: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', icon: 'fas fa-info-circle' },
            warning: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', icon: 'fas fa-exclamation-triangle' }
        };
        
        const selectedType = types[type] || types.success;
        toast.classList.add(selectedType.bg, selectedType.border, selectedType.text);
        if (toastIcon) toastIcon.classList.add(...selectedType.icon.split(' '));
        
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 4000);
    },
    toggleFabs: (show) => {
        const fabs = DOM.qsa('.fab');
        fabs.forEach(fab => {
            fab.style.display = show ? 'flex' : 'none';
        });
    }
};

// =================================================================================
// OFFLINE SERVICE (DEXIE)
// =================================================================================
export const OfflineService = {
    db: null,
    
    init() {
        if (typeof Dexie !== 'undefined') {
            this.db = new Dexie('SGMOfflineDB');
            this.db.version(1).stores({
                collections: 'name,data,updatedAt',
                syncQueue: 'id,collection,operation,data,timestamp'
            });
        }
    },
    
    async cacheCollection(name, data) {
        if (!this.db) return;
        try {
            await this.db.collections.put({
                name,
                data: JSON.stringify(data),
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Erro ao cachear coleção:', error);
        }
    },
    
    async getCollection(name) {
        if (!this.db) return [];
        try {
            const cached = await this.db.collections.get(name);
            return cached ? JSON.parse(cached.data) : [];
        } catch (error) {
            console.error('Erro ao obter coleção cacheada:', error);
            return [];
        }
    },
    
    async addToSyncQueue(collection, operation, docId, data) {
        if (!this.db) return;
        try {
            await this.db.syncQueue.add({
                id: `${operation}_${docId}_${Date.now()}`,
                collection,
                operation,
                data: JSON.stringify(data),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Erro ao adicionar à fila de sincronização:', error);
        }
    },
    
    async processSyncQueue() {
        if (!this.db || !navigator.onLine) return;
        
        try {
            const queue = await this.db.syncQueue.toArray();
            for (const item of queue) {
                try {
                    const data = JSON.parse(item.data);
                    switch (item.operation) {
                        case 'add':
                            await DataService.addDocument(item.collection, data);
                            break;
                        case 'update':
                            await DataService.updateDocument(item.collection, item.id, data);
                            break;
                        case 'delete':
                            await DataService.deleteDocument(item.collection, item.id);
                            break;
                    }
                    await this.db.syncQueue.delete(item.id);
                } catch (error) {
                    console.error('Erro ao processar item da fila:', error);
                }
            }
            if (queue.length > 0) {
                DOM.showToast(`${queue.length} operações sincronizadas!`, 'success');
            }
        } catch (error) {
            console.error('Erro ao processar fila de sincronização:', error);
        }
    }
};

// =================================================================================
// NOTIFICATION SERVICE
// =================================================================================
export const NotificationService = {
    notifications: [],
    
    async requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    },
    
    checkAllNotifications(data) {
        const notifications = [];
        
        // Verificar estoque baixo
        const lowStock = data.estoque?.filter(item => item.qtd <= item.qtdMin) || [];
        if (lowStock.length > 0) {
            notifications.push({
                id: 'low-stock',
                icon: 'fa-exclamation-triangle',
                title: 'Estoque Baixo',
                description: `${lowStock.length} item(s) com estoque baixo`,
                action: () => window.App.onNavigate('Estoque')
            });
        }
        
        // Verificar higienizações vencidas
        const overdueHygiene = data.usuarios?.filter(user => {
            if (!user.ultimaHigienizacao) return false;
            const lastHygiene = user.ultimaHigienizacao.toDate();
            const fourMonthsAgo = new Date();
            fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
            return lastHygiene < fourMonthsAgo;
        }) || [];
        
        if (overdueHygiene.length > 0) {
            notifications.push({
                id: 'overdue-hygiene',
                icon: 'fa-clock',
                title: 'Higienizações Vencidas',
                description: `${overdueHygiene.length} usuário(s) com higienização vencida`,
                action: () => window.App.onNavigate('Higienizacao')
            });
        }
        
        // Verificar vencimentos próximos
        const nearExpiry = data.usuarios?.filter(user => {
            if (!user.dataTeste && !user.vencimentoMascara) return false;
            const now = new Date();
            const oneMonthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            
            const testExpiry = user.dataTeste?.toDate();
            const maskExpiry = user.vencimentoMascara?.toDate();
            
            return (testExpiry && testExpiry < oneMonthFromNow) || 
                   (maskExpiry && maskExpiry < oneMonthFromNow);
        }) || [];
        
        if (nearExpiry.length > 0) {
            notifications.push({
                id: 'near-expiry',
                icon: 'fa-calendar-alt',
                title: 'Vencimentos Próximos',
                description: `${nearExpiry.length} usuário(s) com vencimento próximo`,
                action: () => window.App.onNavigate('GestaoUsuarios')
            });
        }
        
        this.notifications = notifications;
        return notifications;
    },
    
    showLocalNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });
        }
    }
};

// =================================================================================
// PRESENCE SERVICE
// =================================================================================
export const PresenceService = {
    userStatusRef: null,
    unsubscribe: null,
    
    init() {
        if (!auth.currentUser) return;
        
        this.userStatusRef = doc(db, `artifacts/gcontroledehgutl/public/data/userStatus/${auth.currentUser.uid}`);
        this.updateStatus('online');
        
        // Listen for auth changes
        this.unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                this.updateStatus('online');
            } else {
                this.updateStatus('offline');
            }
        });
        
        // Update status when page becomes visible/hidden
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.updateStatus('online');
            } else {
                this.updateStatus('away');
            }
        });
    },
    
    async updateStatus(status) {
        if (!this.userStatusRef || !auth.currentUser) return;
        
        try {
            await setDoc(this.userStatusRef, {
                status,
                lastSeen: serverTimestamp(),
                email: auth.currentUser.email
            }, { merge: true });
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    },
    
    stop() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.updateStatus('offline');
    }
};

// =================================================================================
// ASSISTANT SERVICE (C.J.7)
// =================================================================================
export const AssistantService = {
    recognition: null,
    isListening: false,
    
    init() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'pt-BR';
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.processCommand(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Erro de reconhecimento de voz:', event.error);
                this.isListening = false;
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
            };
        }
    },
    
    toggleListening() {
        if (!this.recognition) {
            DOM.showToast('Reconhecimento de voz não disponível', 'error');
            return;
        }
        
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
            this.isListening = true;
        }
    },
    
    processCommand(transcript) {
        console.log('Comando de voz:', transcript);
        
        // Navegação
        if (transcript.includes('ir para') || transcript.includes('vai para')) {
            const views = ['dashboard', 'higienização', 'cadastros', 'estoque', 'usuários', 'relatórios'];
            for (const view of views) {
                if (transcript.includes(view)) {
                    const viewMap = {
                        'dashboard': 'Dashboard',
                        'higienização': 'Higienizacao',
                        'cadastros': 'Cadastros',
                        'estoque': 'Estoque',
                        'usuários': 'GestaoUsuarios',
                        'relatórios': 'Relatorios'
                    };
                    window.App.onNavigate(viewMap[view]);
                    this.speak(`Navegando para ${view}`);
                    return;
                }
            }
        }
        
        // Busca de usuários
        if (transcript.includes('buscar usuário') || transcript.includes('procurar usuário')) {
            const name = transcript.replace(/buscar usuário|procurar usuário/gi, '').trim();
            if (name) {
                window.App.onNavigate('GestaoUsuarios', { searchTerm: name });
                this.speak(`Buscando usuário ${name}`);
                return;
            }
        }
        
        // Registro de higienização
        if (transcript.includes('registrar higienização')) {
            const name = transcript.replace(/registrar higienização de|registrar higienização/gi, '').trim();
            if (name) {
                window.App.onNavigate('Higienizacao');
                this.speak(`Registrando higienização para ${name}`);
                return;
            }
        }
        
        // Ajuda
        if (transcript.includes('ajuda') || transcript.includes('comandos')) {
            this.speak('Comandos disponíveis: navegar para, buscar usuário, registrar higienização, ajuda');
            return;
        }
        
        this.speak('Comando não reconhecido. Diga ajuda para ver os comandos disponíveis.');
    },
    
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            speechSynthesis.speak(utterance);
        }
    }
};

// =================================================================================
// MODAL SERVICE
// =================================================================================
export const ModalService = {
    showConfirmation({ title, message, onConfirm, onCancel }) {
        const modalHtml = `
            <div id="confirmationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000]">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 class="text-lg font-bold mb-4">${title}</h3>
                    <p class="text-gray-600 mb-6">${message}</p>
                    <div class="flex justify-end gap-3">
                        <button id="modal-btn-cancel" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button id="modal-btn-confirm" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Confirmar</button>
                    </div>
                </div>
            </div>
        `;
        
        DOM.render('#modal-container', modalHtml);
        
        const modal = DOM.qs('#confirmationModal');
        const confirmBtn = DOM.qs('#modal-btn-confirm');
        const cancelBtn = DOM.qs('#modal-btn-cancel');
        
        confirmBtn.addEventListener('click', () => {
            onConfirm();
            this.close();
        });
        
        cancelBtn.addEventListener('click', () => {
            if (onCancel) onCancel();
            this.close();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (onCancel) onCancel();
                this.close();
            }
        });
    },
    
    showAssistant(processCommand) {
        const modalHtml = `
            <div id="assistantModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000]">
                <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold">Assistente C.J.7</h3>
                        <button id="assistant-close" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="assistant-conversation" class="mb-4 space-y-3 max-h-96 overflow-y-auto">
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <i class="fas fa-robot text-white text-sm"></i>
                            </div>
                            <div class="bg-gray-100 rounded-lg p-3 flex-1">
                                <p class="text-sm">Olá! Sou o C.J.7, seu assistente de voz. Como posso ajudá-lo hoje?</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <button id="assistant-mic" class="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                            <i class="fas fa-microphone"></i>
                            <span>Falar</span>
                        </button>
                        <button id="assistant-help" class="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            <i class="fas fa-question"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        DOM.render('#modal-container', modalHtml);
        
        const modal = DOM.qs('#assistantModal');
        const closeBtn = DOM.qs('#assistant-close');
        const micBtn = DOM.qs('#assistant-mic');
        const helpBtn = DOM.qs('#assistant-help');
        const conversation = DOM.qs('#assistant-conversation');
        
        closeBtn.addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
        
        micBtn.addEventListener('click', () => {
            AssistantService.toggleListening();
            micBtn.innerHTML = AssistantService.isListening ? 
                '<i class="fas fa-stop"></i><span>Parar</span>' : 
                '<i class="fas fa-microphone"></i><span>Falar</span>';
        });
        
        helpBtn.addEventListener('click', () => {
            const helpText = 'Comandos disponíveis: "ir para dashboard", "buscar usuário João", "registrar higienização", "ajuda"';
            this.addMessageToConversation('user', 'Ajuda');
            this.addMessageToConversation('assistant', helpText);
        });
    },
    
    addMessageToConversation(sender, message) {
        const conversation = DOM.qs('#assistant-conversation');
        if (!conversation) return;
        
        const messageHtml = `
            <div class="flex items-start gap-3 ${sender === 'user' ? 'flex-row-reverse' : ''}">
                <div class="w-8 h-8 ${sender === 'user' ? 'bg-green-500' : 'bg-blue-500'} rounded-full flex items-center justify-center">
                    <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'} text-white text-sm"></i>
                </div>
                <div class="bg-${sender === 'user' ? 'green' : 'gray'}-100 rounded-lg p-3 flex-1">
                    <p class="text-sm">${message}</p>
                </div>
            </div>
        `;
        
        conversation.insertAdjacentHTML('beforeend', messageHtml);
        conversation.scrollTop = conversation.scrollHeight;
    },
    
    showFeedbackModal(onSubmit) {
        const modalHtml = `
            <div id="feedbackModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000]">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 class="text-lg font-bold mb-4">Enviar Feedback</h3>
                    <textarea id="feedback-text" class="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none" placeholder="Digite seu feedback aqui..."></textarea>
                    <div class="flex justify-end gap-3 mt-4">
                        <button id="feedback-cancel" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button id="feedback-submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enviar</button>
                    </div>
                </div>
            </div>
        `;
        
        DOM.render('#modal-container', modalHtml);
        
        const modal = DOM.qs('#feedbackModal');
        const submitBtn = DOM.qs('#feedback-submit');
        const cancelBtn = DOM.qs('#feedback-cancel');
        const textarea = DOM.qs('#feedback-text');
        
        submitBtn.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (text) {
                onSubmit(text);
                this.close();
            }
        });
        
        cancelBtn.addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    },
    
    showMaskVerificationScanner({ getLocalData }) {
        const modalHtml = `
            <div id="scannerModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000]">
                <div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
                    <h3 class="text-lg font-bold mb-4">Verificar Máscara</h3>
                    <div id="scanner-container" class="w-full h-64 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                        <p class="text-gray-500">Scanner QR Code</p>
                    </div>
                    <div class="flex justify-end gap-3">
                        <button id="scanner-cancel" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button id="scanner-start" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Iniciar Scanner</button>
                    </div>
                </div>
            </div>
        `;
        
        DOM.render('#modal-container', modalHtml);
        
        const modal = DOM.qs('#scannerModal');
        const cancelBtn = DOM.qs('#scanner-cancel');
        const startBtn = DOM.qs('#scanner-start');
        
        cancelBtn.addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
        
        startBtn.addEventListener('click', async () => {
            // Implementar scanner QR code aqui
            DOM.showToast('Funcionalidade de scanner em desenvolvimento', 'info');
        });
    },
    
    close() {
        const modal = DOM.qs('#modal-container');
        if (modal) modal.innerHTML = '';
    }
};

// =================================================================================
// REPORT SERVICE
// =================================================================================
export const ReportService = {
    generatePDF(data, type) {
        // Implementar geração de PDF
        DOM.showToast('Geração de PDF em desenvolvimento', 'info');
    },
    
    generateExcel(data, type) {
        // Implementar geração de Excel
        DOM.showToast('Geração de Excel em desenvolvimento', 'info');
    }
};

// =================================================================================
// UTILITÁRIOS GERAIS
// =================================================================================
export const getUserStatus = (user) => {
    const getStatus = (timestamp) => {
        if (!timestamp || typeof timestamp.toDate !== 'function') {
            return { text: 'N/A', class: 'bg-gray-100 text-gray-500', key: 'na' };
        }
        const date = timestamp.toDate();
        const now = new Date();
        const oneMonthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        if (date < now) return { text: 'Vencido', class: 'bg-red-100 text-red-700', key: 'vencido' };
        if (date < oneMonthFromNow) return { text: 'Vence em breve', class: 'bg-yellow-100 text-yellow-700', key: 'breve' };
        return { text: 'Válido', class: 'bg-green-100 text-green-700', key: 'valido' };
    };
    return {
        test: getStatus(user.dataTeste),
        mask: getStatus(user.vencimentoMascara)
    };
};

// Inicializar serviços
document.addEventListener('DOMContentLoaded', () => {
    OfflineService.init();
    AssistantService.init();
});
