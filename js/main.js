// =================================================================================
// APLICAÇÃO PRINCIPAL - S.G.M
// =================================================================================

import { auth, db } from './firebase-config.js';
import { DataService } from './services.js';
import { 
    DOM, 
    getUserStatus, 
    PresenceService, 
    AuthService, 
    OfflineService, 
    NotificationService, 
    AssistantService, 
    ModalService, 
    ReportService 
} from './utils.js';
import { Views } from './views.js';

// Torna os serviços disponíveis globalmente para compatibilidade
window.DOM = DOM;
window.OfflineService = OfflineService;
window.DataService = DataService;

// =================================================================================
// APLICAÇÃO PRINCIPAL
// =================================================================================
const App = {
    state: {
        user: null,
        data: {
            usuarios: [],
            estoque: [],
            historico: [],
            mascarasReserva: [],
            noticeBoard: [],
            userStatus: [],
            permissao: []
        },
        listeners: {},
        currentView: 'Dashboard',
        isDataLoaded: false
    },

    async init() {
        console.log('🚀 Iniciando S.G.M...');
        
        // Inicializar serviços
        OfflineService.init();
        AssistantService.initSpeechRecognition();
        
        // Configurar listeners
        this.setupAuthListener();
        this.addEventListeners();
        
        // Verificar status de conexão inicial
        this.handleConnectionChange();
        
        console.log('✅ S.G.M iniciado com sucesso!');
    },

    setupAuthListener() {
        AuthService.listenToAuthChanges((user) => {
            if (user) {
                this.state.user = user;
                this.onUserLogin();
            } else {
                this.state.user = null;
                this.onUserLogout();
            }
        });
    },

    async onUserLogin() {
        console.log('👤 Usuário logado:', this.state.user.email);
        
        // Inicializar serviços que precisam de autenticação
        PresenceService.init();
        await NotificationService.requestPermission();
        
        // Configurar listeners de dados
        this.setupDataListeners();
        
        // Renderizar interface principal
        this.renderMainInterface();
        this.attachMainAppEventListeners();
        
        // Mostrar FABs
        DOM.toggleFabs(true);
    },

    onUserLogout() {
        console.log('👤 Usuário deslogado');
        
        // Parar serviços
        PresenceService.stop();
        this.stopDataListeners();
        
        // Esconder FABs
        DOM.toggleFabs(false);
        
        // Renderizar tela de login
        this.renderLoginScreen();
    },

    setupDataListeners() {
        const collections = ['usuarios', 'estoque', 'historico', 'mascarasReserva', 'noticeBoard', 'userStatus', 'permissao'];
        
        collections.forEach(collectionName => {
            this.state.listeners[collectionName] = DataService.listenToCollection(
                collectionName, 
                (data) => {
                    this.state.data[collectionName] = data;
                    this.onDataUpdate();
                }
            );
        });
    },

    stopDataListeners() {
        Object.values(this.state.listeners).forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') unsubscribe();
        });
        this.state.listeners = {};
    },

    onDataUpdate() {
        // Verificar se todos os dados foram carregados pelo menos uma vez
        const requiredCollections = ['usuarios', 'estoque', 'historico'];
        const isLoaded = requiredCollections.every(col => this.state.data[col].length >= 0);
        
        if (isLoaded && !this.state.isDataLoaded) {
            this.state.isDataLoaded = true;
            console.log('📊 Dados iniciais carregados');
        }
        
        // Atualizar notificações
        this.updateNotifications();
        
        // Re-renderizar view atual se necessário
        this.renderCurrentView();
    },

    renderLoginScreen() {
        DOM.render('#app', `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div class="max-w-md w-full space-y-8">
                    <div>
                        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            S.G.M
                        </h2>
                        <p class="mt-2 text-center text-sm text-gray-600">
                            Sistema de Gestão de Máscaras
                        </p>
                    </div>
                    <form id="login-form" class="mt-8 space-y-6">
                        <div id="login-error" class="text-red-600 text-sm text-center"></div>
                        <div class="rounded-md shadow-sm -space-y-px">
                            <div>
                                <input id="email" name="email" type="email" autocomplete="email" required 
                                       class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                                       placeholder="Email">
                            </div>
                            <div>
                                <input id="password" name="password" type="password" autocomplete="current-password" required 
                                       class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                                       placeholder="Senha">
                            </div>
                        </div>
                        <div>
                            <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                <span id="btn-login-spinner" class="hidden">
                                    <i class="fas fa-spinner fa-spin mr-2"></i>
                                </span>
                                Entrar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `);
    },

    renderMainInterface() {
        DOM.render('#app', `
            <div id="sticky-header" class="bg-gray-50 border-b border-gray-200">
                <header class="mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center py-6">
                        <div class="flex items-center">
                            <h1 class="text-2xl font-bold text-gray-900">S.G.M</h1>
                            <span class="ml-3 text-sm text-gray-500">Sistema de Gestão de Máscaras</span>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div id="notification-bell" class="relative">
                                <i class="fas fa-bell text-xl text-gray-600 hover:text-gray-800 cursor-pointer"></i>
                                <span id="notification-badge" class="hidden"></span>
                                <div id="notification-panel" class="hidden"></div>
                            </div>
                            <span class="text-sm text-gray-600">Olá, ${this.state.user.email}</span>
                            <button id="logoutButton" class="text-sm text-red-600 hover:text-red-800">Sair</button>
                        </div>
                    </div>
                </header>
                
                <nav class="border-t border-gray-200">
                    <div class="mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex space-x-8 overflow-x-auto tabs">
                            <button class="nav-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" data-view="Dashboard">Dashboard</button>
                            <button class="nav-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" data-view="Higienizacao">Higienização</button>
                            <button class="nav-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" data-view="Cadastros">Cadastros</button>
                            <button class="nav-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" data-view="Estoque">Estoque</button>
                            <button class="nav-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" data-view="MascarasReserva">Máscaras Reserva</button>
                            <button class="nav-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" data-view="Relatorios">Relatórios</button>
                            <button class="nav-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" data-view="Pedidos">Pedidos</button>
                            <button class="nav-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" data-view="QuadroDeAvisos">Quadro de Avisos</button>
                            ${this.state.user.role === 'desenvolvedor' ? '<button class="nav-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" data-view="Permissoes">Permissões</button>' : ''}
                        </div>
                    </div>
                </nav>
            </div>
            
            <main class="flex-1 overflow-auto">
                <div id="view-content" class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 fade-in">
                    <!-- Conteúdo da view atual será renderizado aqui -->
                </div>
            </main>
        `);
        
        this.renderCurrentView();
        this.updateActiveTab();
    },

    renderCurrentView(params = {}) {
        if (!this.state.isDataLoaded) {
            DOM.render('#view-content', `
                <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                        <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600">Carregando dados...</p>
                    </div>
                </div>
            `);
            return;
        }

        const view = Views[this.state.currentView];
        if (view && typeof view.render === 'function') {
            view.render(this.state.data, this.state.user, params);
        } else {
            DOM.render('#view-content', `
                <div class="text-center py-12">
                    <i class="fas fa-construction text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Em Desenvolvimento</h3>
                    <p class="text-gray-600">Esta funcionalidade está sendo desenvolvida.</p>
                </div>
            `);
        }
    },

    updateActiveTab() {
        DOM.qsa('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.view === this.state.currentView) {
                tab.classList.add('active');
            }
        });
    },

    onNavigate(viewName, params = {}) {
        this.state.currentView = viewName;
        this.renderCurrentView(params);
        this.updateActiveTab();
    },

    addEventListeners() {
        window.addEventListener('online', this.handleConnectionChange.bind(this));
        window.addEventListener('offline', this.handleConnectionChange.bind(this));
        document.body.addEventListener('click', this.handleGlobalClick.bind(this));
        document.body.addEventListener('change', this.handleGlobalChange.bind(this));
        document.body.addEventListener('submit', this.handleGlobalSubmit.bind(this));
    },

    handleGlobalChange(e) {
        // Implementar handlers de mudança aqui se necessário
    },

    handleGlobalSubmit(e) {
        e.preventDefault();
        
        // Login form
        if (e.target.id === 'login-form') {
            const email = DOM.qs('#email').value;
            const password = DOM.qs('#password').value;
            const btnSpinner = DOM.qs('#btn-login-spinner');
            const loginError = DOM.qs('#login-error');
            
            if (btnSpinner) btnSpinner.classList.remove('hidden');
            if (loginError) loginError.textContent = '';
            
            AuthService.signIn(email, password).catch(error => {
                if (loginError) loginError.textContent = AuthService.getFriendlyErrorMessage(error);
                if (btnSpinner) btnSpinner.classList.add('hidden');
            });
            return;
        }
        
        // Search forms
        if (e.target.id === 'search-form-estoque') {
            const searchTerm = DOM.qs('#search-input-estoque').value;
            this.onNavigate('Estoque', { searchTerm });
        }
        if (e.target.id === 'search-form-users') {
            const searchTerm = DOM.qs('#search-input-users').value;
            this.onNavigate('GestaoUsuarios', { searchTerm });
        }
        
        // Hygiene form
        if (e.target.id === 'hygiene-form') {
            this.handleHygieneSubmit(e);
        }
        
        // User registration form
        if (e.target.id === 'user-registration-form') {
            this.handleUserRegistration(e);
        }
    },

    async handleGlobalClick(e) {
        if (!this.state.user) return; 

        const target = e.target;
        
        // Ações de Notificação
        const notificationItem = target.closest('.notification-item');
        if (notificationItem) {
            const id = notificationItem.dataset.notificationId;
            const notification = NotificationService.notifications.find(n => n.id === id);
            if (notification && notification.action) {
                notification.action();
                DOM.qs('#notification-panel').classList.add('hidden');
            }
        }

        // Botões de ação nas tabelas
        if (target.closest('.btn-edit')) {
            this.handleEditAction(target);
        }
        
        if (target.closest('.btn-delete')) {
            this.handleDeleteAction(target);
        }
        
        if (target.closest('.btn-add')) {
            this.handleAddAction(target);
        }
        
        // Botões de relatório
        if (target.matches('.btn-report-pdf') || target.closest('.btn-report-pdf')) {
            this.handleReportGeneration('pdf', target);
        }
        
        if (target.matches('.btn-report-excel') || target.closest('.btn-report-excel')) {
            this.handleReportGeneration('excel', target);
        }
        
        // Botões de pedidos
        if (target.matches('.btn-manual-order') || target.closest('.btn-manual-order')) {
            this.handleManualOrder();
        }
        
        if (target.matches('.btn-mask-order') || target.closest('.btn-mask-order')) {
            this.handleMaskOrder();
        }
    },

    attachMainAppEventListeners() {
        const appContainer = DOM.qs('#app');
        if (!appContainer) return;

        appContainer.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.closest('#logoutButton')) AuthService.signOut();
            
            const navTab = target.closest('.nav-tab');
            if (navTab) this.onNavigate(navTab.dataset.view);

            const notificationBell = target.closest('#notification-bell');
            if (notificationBell) {
                const panel = DOM.qs('#notification-panel');
                if (panel) panel.classList.toggle('hidden');
            }
        });

        const assistantFab = DOM.qs('#assistant-fab');
        if (assistantFab) {
            assistantFab.addEventListener('click', () => {
                ModalService.showAssistant(AssistantService.processCommand.bind(AssistantService));
            });
        }
        
        const feedbackBtn = DOM.qs('#btn-feedback');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => {
                DOM.showToast('Funcionalidade de feedback em desenvolvimento', 'info');
            });
        }
    },

    handleConnectionChange() {
        const statusDiv = DOM.qs('#connection-status');
        if (navigator.onLine) {
            statusDiv.textContent = 'Online';
            statusDiv.className = 'online show';
            if (OfflineService.processSyncQueue) {
                OfflineService.processSyncQueue();
            }
        } else {
            statusDiv.textContent = 'Offline';
            statusDiv.className = 'offline show';
        }
        setTimeout(() => statusDiv.classList.remove('show'), 3000);
    },
    
    updateNotifications() {
        const notifications = NotificationService.checkAllNotifications(this.state.data);
        const badge = DOM.qs('#notification-badge');
        const panel = DOM.qs('#notification-panel');

        if (!badge || !panel) return;

        if (notifications.length > 0) {
            badge.textContent = notifications.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        panel.innerHTML = notifications.length > 0 ? notifications.map(n => `
            <div class="notification-item flex items-start gap-3" data-notification-id="${n.id}">
                <i class="fas ${n.icon} mt-1"></i>
                <div>
                    <p class="font-semibold text-sm">${n.title}</p>
                    <p class="text-xs text-gray-500">${n.description}</p>
                </div>
            </div>
        `).join('') : '<p class="p-4 text-sm text-center text-gray-500">Nenhuma notificação.</p>';
    },

    handleHygieneSubmit(e) {
        const userSearch = DOM.qs('#user-search').value;
        const maskSize = DOM.qs('#mask-size').value;
        const responsible = DOM.qs('#responsible').value;
        
        if (!userSearch || !maskSize) {
            DOM.showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }
        
        DOM.showToast('Higienização registrada com sucesso!', 'success');
        // Aqui você adicionaria a lógica para salvar no Firebase
    },
    
    handleUserRegistration(e) {
        const form = e.target;
        const formData = new FormData(form);
        
        DOM.showToast('Usuário cadastrado com sucesso!', 'success');
        form.reset();
        // Aqui você adicionaria a lógica para salvar no Firebase
    },
    
    handleEditAction(target) {
        DOM.showToast('Funcionalidade de edição em desenvolvimento', 'info');
    },
    
    handleDeleteAction(target) {
        ModalService.showConfirmation({
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja excluir este item?',
            onConfirm: () => {
                DOM.showToast('Item excluído com sucesso!', 'success');
                // Aqui você adicionaria a lógica para excluir do Firebase
            }
        });
    },
    
    handleAddAction(target) {
        DOM.showToast('Funcionalidade de adição em desenvolvimento', 'info');
    },
    
    handleReportGeneration(type, target) {
        const reportType = type.toUpperCase();
        DOM.showToast(`Gerando relatório ${reportType}...`, 'info');
        
        // Simular geração de relatório
        setTimeout(() => {
            DOM.showToast(`Relatório ${reportType} gerado com sucesso!`, 'success');
        }, 2000);
    },
    
    handleManualOrder() {
        DOM.showToast('Funcionalidade de pedido manual em desenvolvimento', 'info');
    },
    
    handleMaskOrder() {
        DOM.showToast('Funcionalidade de pedido de máscaras em desenvolvimento', 'info');
    }
};

// Make App available globally for other modules
window.App = App;

// =================================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =================================================================================
window.addEventListener('load', () => {
    App.init();
});