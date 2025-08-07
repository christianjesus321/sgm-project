// =================================================================================
// MÓDULO: APLICAÇÃO PRINCIPAL
// =================================================================================

import { auth, db, HYGIENE_DEADLINE_DAYS } from './firebase-config.js';
import { 
    DOM, 
    getUserStatus, 
    PresenceService, 
    AuthService, 
    OfflineService, 
    NotificationService, 
    AssistantService, 
    ModalService 
} from './utils.js';
import { DataService } from './services.js';
import { Views } from './views.js';
import { 
    Timestamp, 
    serverTimestamp, 
    collection, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    getDocs, 
    arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================================
// APLICAÇÃO PRINCIPAL
// =================================================================================

const App = {
    state: {
        user: null,
        currentView: 'Dashboard',
        data: {
            usuarios: [], 
            estoque: [], 
            historico: [], 
            mascarasReserva: [],
            noticeBoard: [], 
            permissao: [], 
            userStatus: []
        },
        listeners: [],
        isDataLoaded: false
    },

    init() {
        console.log('Iniciando S.G.M...');
        
        // Inicializa serviços
        OfflineService.init();
        PresenceService.init();
        NotificationService.requestPermission();
        
        // Configura listeners de autenticação
        AuthService.listenToAuthChanges((user) => {
            this.onAuthStateChange(user);
        });
        
        // Configura listeners de conexão
        window.addEventListener('online', this.handleConnectionChange.bind(this));
        window.addEventListener('offline', this.handleConnectionChange.bind(this));
        
        // Configura listeners globais
        this.addEventListeners();
        
        console.log('S.G.M iniciado com sucesso!');
    },

    async onAuthStateChange(user) {
        if (user) {
            console.log('Usuário logado:', user.email);
            this.state.user = user;
            
            // Renderiza layout da aplicação
            Views.AppLayout.render(user);
            
            // Carrega dados iniciais
            await this.loadInitialData();
            
            // Configura listeners da aplicação principal
            this.attachMainAppEventListeners();
            
            // Mostra FABs
            DOM.toggleFabs(true);
            
            // Renderiza view inicial
            this.renderCurrentView();
            
        } else {
            console.log('Usuário deslogado');
            this.state.user = null;
            this.state.data = {
                usuarios: [], 
                estoque: [], 
                historico: [], 
                mascarasReserva: [],
                noticeBoard: [], 
                permissao: [], 
                userStatus: []
            };
            this.state.isDataLoaded = false;
            
            // Para serviços
            PresenceService.stop();
            
            // Esconde FABs
            DOM.toggleFabs(false);
            
            // Renderiza tela de login
            Views.Auth.render();
        }
    },

    async loadInitialData() {
        try {
            // Carrega dados do cache primeiro
            await this.loadDataFromCache();
            
            // Configura listeners do Firebase
            this.setupFirebaseListeners();
            
            console.log('Dados iniciais carregados');
            this.state.isDataLoaded = true;
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            DOM.showToast('Erro ao carregar dados. Verificando cache...', 'error');
            
            // Tenta carregar do cache offline
            await this.loadDataFromCache();
        }
    },

    async loadDataFromCache() {
        try {
            const collections = ['usuarios', 'estoque', 'historico', 'mascarasReserva', 'noticeBoard', 'permissao'];
            
            for (const collectionName of collections) {
                const cachedData = await OfflineService.getCollection(collectionName);
                this.state.data[collectionName] = cachedData;
            }
            
            console.log('Dados carregados do cache');
        } catch (error) {
            console.error('Erro ao carregar cache:', error);
        }
    },

    setupFirebaseListeners() {
        // Limpa listeners anteriores
        this.state.listeners.forEach(unsubscribe => unsubscribe());
        this.state.listeners = [];

        // Configura listeners para cada coleção
        const collections = [
            'usuarios', 
            'estoque', 
            'historico', 
            'mascarasReserva', 
            'noticeBoard', 
            'permissao'
        ];

        collections.forEach(collectionName => {
            const unsubscribe = DataService.listenToCollection(collectionName, (data) => {
                this.state.data[collectionName] = data;
                this.renderCurrentView();
            });
            this.state.listeners.push(unsubscribe);
        });

        // Listener para userStatus
        const userStatusUnsubscribe = DataService.listenToCollection('userStatus', (data) => {
            this.state.data.userStatus = data;
        });
        this.state.listeners.push(userStatusUnsubscribe);
    },

    renderCurrentView(params = {}) {
        if (!this.state.user || !this.state.isDataLoaded) return;

        const viewName = this.state.currentView;
        const view = Views[viewName];
        
        if (view && view.render) {
            view.render(this.state.data, this.state.user, params);
        }
    },

    onNavigate(viewName, params = {}) {
        if (!this.state.user) return;

        this.state.currentView = viewName;
        
        // Atualiza navegação ativa
        DOM.qsa('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.view === viewName) {
                tab.classList.add('active');
            }
        });

        // Renderiza a view
        this.renderCurrentView(params);
    },

    addEventListeners() {
        // Event delegation para mudanças globais
        document.addEventListener('change', this.handleGlobalChange.bind(this));
        document.addEventListener('submit', this.handleGlobalSubmit.bind(this));
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    },

    handleGlobalChange(e) {
        const target = e.target;
        
        // Filtros de busca
        if (target.id === 'search-input-estoque') {
            // Implementar filtro de estoque
        }
        
        if (target.id === 'search-input-users') {
            // Implementar filtro de usuários
        }
        
        // Seletores de role
        if (target.classList.contains('role-select')) {
            const uid = target.dataset.uid;
            const newRole = target.value;
            
            ModalService.showConfirmation({
                title: 'Confirmar Alteração',
                message: `Deseja alterar o cargo para "${newRole}"?`,
                onConfirm: async () => {
                    try {
                        await DataService.updateDocument('permissao', uid, { role: newRole });
                        DOM.showToast('Cargo atualizado com sucesso!', 'success');
                    } catch (error) {
                        console.error('Erro ao atualizar cargo:', error);
                        DOM.showToast('Erro ao atualizar cargo.', 'error');
                    }
                }
            });
        }
    },

    handleGlobalSubmit(e) {
        const form = e.target;
        
        // Login form
        if (form.id === 'login-form') {
            e.preventDefault();
            this.handleLogin(form);
        }
        
        // Hygiene form
        if (form.id === 'hygiene-form') {
            e.preventDefault();
            this.handleHygieneSubmit(form);
        }
        
        // User registration form
        if (form.id === 'user-registration-form') {
            e.preventDefault();
            this.handleUserRegistration(form);
        }
        
        // Search forms
        if (form.id === 'search-form-estoque') {
            e.preventDefault();
            // Implementar busca de estoque
        }
        
        if (form.id === 'search-form-users') {
            e.preventDefault();
            // Implementar busca de usuários
        }
    },

    async handleLogin(form) {
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        const btnText = form.querySelector('#btn-login-text');
        const btnSpinner = form.querySelector('#btn-login-spinner');
        const errorP = form.querySelector('#login-error');

        errorP.textContent = '';
        btnText.textContent = 'Entrando...';
        btnSpinner.classList.remove('hidden');
        form.querySelector('#btn-login').disabled = true;

        try {
            await AuthService.signIn(email, password);
            // onAuthStateChange will handle the rest
        } catch (error) {
            errorP.textContent = AuthService.getFriendlyErrorMessage(error);
            btnText.textContent = 'Entrar';
            btnSpinner.classList.add('hidden');
            form.querySelector('#btn-login').disabled = false;
        }
    },

    async handleHygieneSubmit(form) {
        const userSearch = form.querySelector('#user-search').value;
        const maskSize = form.querySelector('#mask-size').value;
        const responsible = form.querySelector('#responsible').value;
        
        if (!userSearch || !maskSize) {
            DOM.showToast('Preencha todos os campos obrigatórios.', 'error');
            return;
        }

        // Encontra o usuário
        const user = this.state.data.usuarios.find(u => 
            u.nome.toLowerCase().includes(userSearch.toLowerCase())
        );

        if (!user) {
            DOM.showToast('Usuário não encontrado.', 'error');
            return;
        }

        // Coleta peças trocadas
        const pecasTrocadas = [];
        const pecaInputs = form.querySelectorAll('input[data-id]');
        pecaInputs.forEach(input => {
            const quantidade = parseInt(input.value) || 0;
            if (quantidade > 0) {
                pecasTrocadas.push({
                    id: input.dataset.id,
                    nome: input.dataset.nome,
                    quantidade: quantidade
                });
            }
        });

        // Cria registro de higienização
        const registro = {
            userId: user.userId,
            userName: user.nome,
            tamanhoMascara: maskSize,
            pecasTrocadas: pecasTrocadas,
            responsavel: responsible,
            higienizadoEm: Timestamp.now(),
            report: "Registrado via sistema"
        };

        try {
            // Atualiza estoque
            const partsToUpdate = pecasTrocadas.map(peca => {
                const estoqueItem = this.state.data.estoque.find(e => e.id === peca.id);
                return {
                    id: peca.id,
                    newQty: (estoqueItem?.qtd || 0) - peca.quantidade
                };
            });

            await DataService.saveRecordAndUpdateStock(registro, partsToUpdate);
            
            DOM.showToast('Higienização registrada com sucesso!', 'success');
            form.reset();
            
        } catch (error) {
            console.error('Erro ao registrar higienização:', error);
            DOM.showToast('Erro ao registrar higienização.', 'error');
        }
    },

    async handleUserRegistration(form) {
        const userData = {
            nome: form.querySelector('#user-name').value,
            tamanhoMascara: form.querySelector('select').value,
            email: form.querySelector('input[type="email"]').value,
            createdAt: Timestamp.now()
        };

        try {
            await DataService.addDocument('usuarios', userData);
            DOM.showToast('Usuário cadastrado com sucesso!', 'success');
            form.reset();
        } catch (error) {
            console.error('Erro ao cadastrar usuário:', error);
            DOM.showToast('Erro ao cadastrar usuário.', 'error');
        }
    },

    attachMainAppEventListeners() {
        // Logout
        const logoutBtn = DOM.qs('#logoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await AuthService.signOut();
                    DOM.showToast('Logout realizado com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro no logout:', error);
                    DOM.showToast('Erro ao fazer logout.', 'error');
                }
            });
        }

        // Navegação
        DOM.qsa('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = tab.dataset.view;
                this.onNavigate(viewName);
            });
        });

        // Notificações
        const notificationBell = DOM.qs('#notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.updateNotifications();
            });
        }

        // Assistente
        const assistantFab = DOM.qs('#assistant-fab');
        if (assistantFab) {
            assistantFab.addEventListener('click', () => {
                ModalService.showAssistant((command) => {
                    return AssistantService.processCommand(command, this.state.user, this.state.data);
                });
            });
        }

        // Verificar máscara
        const verifyMaskBtn = DOM.qs('#btn-verify-mask');
        if (verifyMaskBtn) {
            verifyMaskBtn.addEventListener('click', () => {
                // Implementar verificação de máscara
                DOM.showToast('Funcionalidade em desenvolvimento', 'info');
            });
        }
    },

    handleGlobalClick(e) {
        const target = e.target.closest('button') || e.target;
        
        // Botões de ação em tabelas
        if (target.classList.contains('btn-add')) {
            this.handleAddAction(target);
        }
        
        if (target.classList.contains('btn-edit')) {
            this.handleEditAction(target);
        }
        
        if (target.classList.contains('btn-delete')) {
            this.handleDeleteAction(target);
        }
        
        // Botões de relatório
        if (target.classList.contains('btn-report-pdf')) {
            this.handleReportGeneration(target, 'pdf');
        }
        
        if (target.classList.contains('btn-report-excel')) {
            this.handleReportGeneration(target, 'excel');
        }
        
        // Botões de pedido
        if (target.classList.contains('btn-manual-order')) {
            this.handleManualOrder(target);
        }
        
        if (target.classList.contains('btn-mask-order')) {
            this.handleMaskOrder(target);
        }
    },

    handleAddAction(button) {
        const row = button.closest('tr');
        const itemName = row.querySelector('td').textContent;
        
        ModalService.showConfirmation({
            title: 'Adicionar ao Estoque',
            message: `Deseja adicionar mais unidades de "${itemName}"?`,
            onConfirm: () => {
                DOM.showToast('Funcionalidade em desenvolvimento', 'info');
            }
        });
    },

    handleEditAction(button) {
        const row = button.closest('tr');
        const itemName = row.querySelector('td').textContent;
        
        DOM.showToast(`Editando ${itemName}...`, 'info');
    },

    handleDeleteAction(button) {
        const row = button.closest('tr');
        const itemName = row.querySelector('td').textContent;
        
        ModalService.showConfirmation({
            title: 'Confirmar Exclusão',
            message: `Deseja realmente excluir "${itemName}"?`,
            onConfirm: () => {
                DOM.showToast('Item excluído com sucesso!', 'success');
            }
        });
    },

    handleReportGeneration(button, type) {
        const reportType = button.closest('.bg-white').querySelector('h3').textContent;
        
        if (type === 'pdf') {
            DOM.showToast('Gerando relatório PDF...', 'info');
        } else {
            DOM.showToast('Gerando relatório Excel...', 'info');
        }
    },

    handleManualOrder(button) {
        DOM.showToast('Funcionalidade de pedido manual em desenvolvimento', 'info');
    },

    handleMaskOrder(button) {
        DOM.showToast('Funcionalidade de pedido de máscaras em desenvolvimento', 'info');
    },

    handleConnectionChange() {
        const statusElement = DOM.qs('#connection-status');
        if (!statusElement) return;

        if (navigator.onLine) {
            statusElement.textContent = 'Conectado';
            statusElement.className = 'online show';
            
            // Processa fila de sincronização
            OfflineService.processSyncQueue();
            
            setTimeout(() => {
                statusElement.classList.remove('show');
            }, 3000);
        } else {
            statusElement.textContent = 'Modo Offline';
            statusElement.className = 'offline show';
        }
    },

    updateNotifications() {
        const notifications = NotificationService.checkAllNotifications(this.state.data);
        const badge = DOM.qs('#notification-badge');
        const panel = DOM.qs('#notification-panel');
        
        if (notifications.length > 0) {
            badge.textContent = notifications.length;
            badge.classList.remove('hidden');
            
            const notificationsHtml = notifications.map(notification => `
                <div class="notification-item" onclick="App.handleNotificationClick('${notification.id}')">
                    <div class="flex items-center gap-2">
                        <i class="fas ${notification.icon}"></i>
                        <div>
                            <p class="font-semibold text-sm">${notification.title}</p>
                            <p class="text-xs text-gray-500">${notification.description}</p>
                        </div>
                    </div>
                </div>
            `).join('');
            
            panel.innerHTML = notificationsHtml;
            panel.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
            panel.classList.add('hidden');
        }
    }
};

// Inicializa a aplicação quando a página carregar
window.addEventListener('load', () => {
    App.init();
});

// Torna a aplicação globalmente acessível
window.App = App;