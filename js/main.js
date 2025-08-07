// =================================================================================
// MÓDULO PRINCIPAL DA APLICAÇÃO (App) - PONTO DE ENTRADA
// =================================================================================
import { AuthService, DataService } from './services.js';
import { DOM, ModalService, NotificationService, AssistantService, OfflineService, PresenceService, ReportService } from './utils.js';
import { Views } from './views.js';
import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Timestamp, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const App = {
    state: {
        user: null,
        currentView: 'Dashboard',
        data: {
            usuarios: [], estoque: [], historico: [], mascarasReserva: [],
            noticeBoard: [], permissao: [], userStatus: []
        },
        listeners: [],
        isDataLoaded: false
    },

    init() {
        DOM.render('#app', '<div class="flex items-center justify-center h-screen"><i class="fas fa-spinner fa-spin text-blue-500 text-4xl"></i></div>');
        DOM.qs('#footer-text').textContent = `S.G.M © ${new Date().getFullYear()}`;
        DOM.toggleFabs(false);
        OfflineService.init();
        this.addEventListeners();
        this.handleConnectionChange();
        AuthService.listenToAuthChanges(this.onAuthStateChange.bind(this));
    },

    async onAuthStateChange(user) {
        if (this.state.user && !user) { 
            this.state.listeners.forEach(unsubscribe => unsubscribe());
            this.state.listeners = [];
            if(Views.Dashboard && Views.Dashboard.stopAutoUpdate) Views.Dashboard.stopAutoUpdate();
            PresenceService.stop();
        }
        
        this.state.user = user;
        
        if (user) {
            Views.AppLayout.render(user);
            this.attachMainAppEventListeners();
            await this.loadInitialData();
            PresenceService.init();
            NotificationService.requestPermission();
            DOM.toggleFabs(true);
        } else {
            Views.Auth.render();
            DOM.toggleFabs(false);
        }
    },

    async loadInitialData() {
        await this.loadDataFromCache();
        this.setupFirebaseListeners();
    },

    async loadDataFromCache() {
        const collections = ['usuarios', 'estoque', 'historico', 'mascarasReserva', 'noticeBoard', 'permissao'];
        for (const name of collections) {
            this.state.data[name] = await OfflineService.getCollection(name);
        }
        this.state.isDataLoaded = true;
        this.renderCurrentView();
    },
    
    setupFirebaseListeners() {
        const collections = ['usuarios', 'estoque', 'historico', 'mascarasReserva', 'noticeBoard', 'permissao', 'userStatus'];
        collections.forEach(name => {
            const unsubscribe = DataService.listenToCollection(name, (data) => {
                this.state.data[name] = data;
                if(this.state.isDataLoaded) {
                    this.updateNotifications();
                    if(!(name === 'userStatus' && this.state.currentView === 'Cadastros')) {
                        this.renderCurrentView();
                    }
                }
            });
            this.state.listeners.push(unsubscribe);
        });
    },

    renderCurrentView(params = {}) {
        const viewName = this.state.currentView;
        const view = Views[viewName]; 
        if (view && typeof view.render === 'function') {
            DOM.qsa('.nav-tab').forEach(tab => tab.classList.remove('active'));
            const activeTab = DOM.qs(`.nav-tab[data-view="${viewName}"]`);
            if (activeTab) activeTab.classList.add('active');
            
            view.render(this.state.data, this.state.user, params);
        } else {
            console.error(`View ${viewName} não encontrada ou não tem método render.`);
            DOM.render('#view-content', `<div class="p-6 bg-red-100 text-red-700 rounded-lg">
                <h2 class="font-bold">Erro de Carregamento</h2>
                <p>A visualização solicitada ('${viewName}') não foi encontrada ou não pôde ser renderizada. Por favor, contate o suporte.</p>
            </div>`);
        }
    },

    onNavigate(viewName, params = {}) {
        if (Views.Dashboard && typeof Views.Dashboard.stopAutoUpdate === 'function') {
            Views.Dashboard.stopAutoUpdate();
        }
        // Reset page to 1 when navigating to user management
        if (viewName === 'GestaoUsuarios') {
            Views.GestaoUsuarios.currentPage = 1;
        }
        this.state.currentView = viewName;
        this.renderCurrentView(params);
    },
    
    addEventListeners() {
        window.addEventListener('online', this.handleConnectionChange.bind(this));
        window.addEventListener('offline', this.handleConnectionChange.bind(this));
        document.body.addEventListener('click', this.handleGlobalClick.bind(this));
        document.body.addEventListener('change', this.handleGlobalChange.bind(this));
        document.body.addEventListener('submit', this.handleGlobalSubmit.bind(this));
    },
    
    handleGlobalChange(e) {
        if (e.target.matches('.role-select')) {
            const select = e.target;
            const uid = select.dataset.uid;
            const newRole = select.value;
            const originalPermission = this.state.data.permissao.find(p => p.id === uid);
            const originalRole = originalPermission.role;

            const currentUser = this.state.user;

            // Regras de permissão
            if (currentUser.role === 'desenvolvedor' && currentUser.uid !== uid) {
                DOM.showToast('Desenvolvedores só podem alterar o próprio cargo.', 'error');
                select.value = originalRole;
                return;
            }

            if (currentUser.role === 'administrador') {
                if (newRole === 'desenvolvedor') {
                    DOM.showToast('Administradores não podem designar desenvolvedores.', 'error');
                    select.value = originalRole;
                    return;
                }
                if (originalRole === 'desenvolvedor') {
                    DOM.showToast('Administradores não podem alterar o cargo de desenvolvedores.', 'error');
                    select.value = originalRole;
                    return;
                }
            }

            select.disabled = true;

            ModalService.showConfirmation({
                title: 'Confirmar Alteração de Cargo',
                message: `Deseja realmente alterar o cargo deste usuário para ${newRole}?`,
                onConfirm: async () => {
                    try {
                        await DataService.updateDocument('permissao', uid, { role: newRole }, 'permissao');
                        DOM.showToast('Cargo atualizado com sucesso!', 'success');
                    } catch (error) {
                        console.error("Erro ao atualizar cargo:", error);
                        DOM.showToast('Falha ao atualizar o cargo.', 'error');
                        select.value = originalRole;
                    } finally {
                        select.disabled = false;
                    }
                },
            });
             
            const modal = DOM.qs('#confirmationModal');
            if (modal) {
                modal.addEventListener('click', (ev) => {
                    if (ev.target.id === 'modal-btn-cancel' || !modal.contains(ev.target)) {
                        select.value = originalRole;
                        select.disabled = false;
                    }
                });
            }
        }
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
            Views.GestaoUsuarios.currentPage = 1; // Reset page on new search
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

    attachMainAppEventListeners() {
        const appContainer = DOM.qs('#app');
        if (!appContainer) return;

        appContainer.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.closest('#logoutButton')) {
                PresenceService.updateStatus('offline');
                AuthService.signOut();
            }
            
            const navTab = target.closest('.nav-tab');
            if (navTab) this.onNavigate(navTab.dataset.view);

            const btnVerifyMask = target.closest('#btn-verify-mask');
            if (btnVerifyMask) {
                ModalService.showMaskVerificationScanner({
                    getLocalData: async () => ({
                        mascaras: await OfflineService.getCollection('mascarasReserva'),
                        usuarios: await OfflineService.getCollection('usuarios'),
                        historico: await OfflineService.getCollection('historico')
                    })
                });
            }

            const notificationBell = target.closest('#notification-bell');
            if (notificationBell) {
                const panel = DOM.qs('#notification-panel');
                if (panel) panel.classList.toggle('hidden');
            }
        });

        DOM.qs('#assistant-fab').addEventListener('click', () => {
            ModalService.showAssistant(AssistantService.processCommand.bind(AssistantService));
        });
        
        DOM.qs('#btn-feedback').addEventListener('click', () => {
             ModalService.showFeedbackModal(async (text) => {
                try {
                    await DataService.addDocument('feedback', {
                        text,
                        userEmail: this.state.user.email,
                        timestamp: serverTimestamp()
                    });
                    DOM.showToast('Feedback enviado com sucesso. Obrigado!');
                } catch (error) {
                    DOM.showToast('Erro ao enviar feedback.', 'error');
                }
            });
        });
    },

    handleConnectionChange() {
        const statusDiv = DOM.qs('#connection-status');
        if (navigator.onLine) {
            statusDiv.textContent = 'Online';
            statusDiv.className = 'online show';
            OfflineService.processSyncQueue();
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
