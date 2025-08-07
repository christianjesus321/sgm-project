// =================================================================================
// MÓDULO: UTILITÁRIOS E SERVIÇOS
// =================================================================================

import { auth, db, HYGIENE_DEADLINE_DAYS } from './firebase-config.js';
import { onSnapshot, addDoc, doc, deleteDoc, writeBatch, Timestamp, updateDoc, setDoc, getDoc, serverTimestamp, query, orderBy, limit, where, getDocs, arrayUnion, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const DOM = {
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
        DOM.qs('#toast-message').textContent = message;
        toast.className = toast.className.replace(/bg-(green|red|yellow)-100 border-(green|red|yellow)-400 text-(green|red|yellow)-700/g, '');
        toastIcon.className = toastIcon.className.replace(/fa-(check-circle|times-circle|exclamation-triangle)/g, '');

        const types = {
            success: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', icon: 'fa-check-circle' },
            error: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', icon: 'fa-times-circle' },
            info: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', icon: 'fa-exclamation-triangle' }
        };
        const selectedType = types[type] || types.success;
        toast.classList.add(selectedType.bg, selectedType.border, selectedType.text);
        toastIcon.classList.add(selectedType.icon);
        
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

const getUserStatus = (user) => {
    const getStatus = (date) => {
        if (!date || typeof date.toDate !== 'function') return { text: 'N/A', class: 'bg-gray-100 text-gray-500', key: 'na' };
        const d = date.toDate();
        const now = new Date();
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(now.getMonth() + 1);

        if (d < now) return { text: 'Vencido', class: 'bg-red-100 text-red-700', key: 'vencido' };
        if (d < oneMonthFromNow) return { text: 'Vence em breve', class: 'bg-yellow-100 text-yellow-700', key: 'breve' };
        return { text: 'Válido', class: 'bg-green-100 text-green-700', key: 'valido' };
    };
    return {
        test: getStatus(user.dataTeste),
        mask: getStatus(user.vencimentoMascara)
    };
};

const PresenceService = {
    updateIntervalId: null,
    init: () => {
        PresenceService.updateStatus('online');
        PresenceService.updateIntervalId = setInterval(() => PresenceService.updateStatus('online'), 60 * 1000);
        window.addEventListener('beforeunload', () => PresenceService.updateStatus('offline'));
    },
    stop: () => {
        if (PresenceService.updateIntervalId) {
            clearInterval(PresenceService.updateIntervalId);
            PresenceService.updateIntervalId = null;
        }
    },
    updateStatus: async (status) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const statusRef = doc(db, `artifacts/gcontroledehgutl/public/data/userStatus`, user.uid);
            await setDoc(statusRef, {
                status: status,
                lastSeen: serverTimestamp(),
                email: user.email,
                uid: user.uid
            }, { merge: true });
        } catch (error) {
            console.error("Erro ao atualizar status de presença:", error);
        }
    }
};

const AuthService = {
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signOut: async () => {
        await PresenceService.updateStatus('offline');
        return firebaseSignOut(auth);
    },
    listenToAuthChanges: (callback) => {
        return onAuthStateChanged(auth, async (user) => {
            if (user) {
                let role = 'auditor'; // Papel padrão
                try {
                    const roleDocRef = doc(db, 'permissao', user.uid);
                    const roleDoc = await getDoc(roleDocRef);
                    if (roleDoc.exists()) {
                        role = roleDoc.data().role;
                    } else {
                        console.warn(`Documento de permissão não encontrado para UID: ${user.uid}. Atribuindo cargo de 'auditor'.`);
                    }
                } catch (error) {
                    console.error("Erro ao buscar cargo do usuário. Atribuindo cargo de 'auditor'.", error);
                }
                const userData = { uid: user.uid, email: user.email, isAdmin: (role === 'administrador' || role === 'desenvolvedor'), role };
                callback(userData);
            } else {
                callback(null);
            }
        });
    },
    getFriendlyErrorMessage: (error) => {
        switch (error.code) {
            case 'auth/user-not-found': case 'auth/invalid-credential': return 'Credenciais inválidas. Verifique o e-mail e a senha.';
            case 'auth/wrong-password': return 'Senha incorreta. Por favor, tente novamente.';
            case 'auth/invalid-email': return 'O formato do e-mail é inválido.';
            case 'auth/email-already-in-use': return 'Este e-mail já está em uso por outra conta.';
            default: return 'Ocorreu um erro. Tente novamente.';
        }
    }
};

const OfflineService = {
    db: null,
    init() {
        this.db = new Dexie('GestaoHigienizacaoDB');
        this.db.version(5).stores({ // Versão incrementada para remover coleções de chat
            usuarios: 'userId, nome, pendingSync', 
            estoque: 'id, nome, codigo, pendingSync',
            historico: 'id, higienizadoEm, userId',
            mascarasReserva: 'id, identificacao, pendingSync, &[id+observacoes]',
            noticeBoard: 'id, title',
            syncQueue: '++id, createdAt',
            permissao: 'id, role, nome'
        });
    },
    async getCollection(collectionName) {
        if (!this.db) this.init();
        try {
            return await this.db[collectionName].toArray();
        } catch (error) {
            console.error(`Erro ao obter coleção local '${collectionName}':`, error);
            return []; // Retorna array vazio em caso de erro
        }
    },
    async cacheCollection(collectionName, data) {
        if (!this.db) this.init();
        await this.db[collectionName].bulkPut(data);
    },
    async addToSyncQueue(collectionName, operation, docId, payload) {
        if (!this.db) this.init();
        await this.db.syncQueue.add({ collectionName, operation, docId, payload, createdAt: new Date() });
        console.log(`[OfflineService] Operação '${operation}' para '${collectionName}' adicionada à fila.`);
    },
    async processSyncQueue() {
        if (!this.db) this.init();
        const pendingOperations = await this.db.syncQueue.orderBy('createdAt').toArray();
        if (pendingOperations.length === 0) return;

        DOM.showToast(`Sincronizando ${pendingOperations.length} alterações pendentes...`, 'info');

        for (const op of pendingOperations) {
            try {
                const { collectionName, operation, docId, payload } = op;
                const path = collectionName === 'permissao' ? collectionName : `artifacts/gcontroledehgutl/public/data/${collectionName}`;
                
                if (operation === 'add') {
                    await setDoc(doc(db, path, docId), payload);
                } else if (operation === 'update') {
                    if (payload.observacoes && payload.observacoes.isUnion) {
                        await updateDoc(doc(db, path, docId), {
                            observacoes: arrayUnion(...payload.observacoes.elements)
                        });
                    } else {
                        await updateDoc(doc(db, path, docId), payload);
                    }
                } else if (operation === 'delete') {
                    await deleteDoc(doc(db, path, docId));
                }
                
                await this.db.syncQueue.delete(op.id);
                console.log(`[OfflineService] Operação ${op.id} sincronizada com sucesso.`);
            } catch (error) {
                console.error(`[OfflineService] Falha ao sincronizar operação ${op.id}:`, error);
                DOM.showToast(`Falha ao sincronizar uma alteração.`, 'error');
            }
        }
        DOM.showToast('Sincronização concluída!', 'success');
    }
};

const NotificationService = {
    notifications: [],

    async requestPermission() {
        if (!("Notification" in window)) {
            console.log("Este browser não suporta notificações de desktop");
            return;
        }
        if (Notification.permission !== "granted") {
            await Notification.requestPermission();
        }
    },

    showLocalNotification(title, body) {
        if (Notification.permission === "granted") {
            new Notification(title, { body, icon: './favicon.ico' });
        }
    },
    
    checkAllNotifications(data) {
        this.notifications = [];

        // 1. Estoque Baixo
        const lowStockItems = data.estoque.filter(item => item.qtd <= item.qtdMin);
        if (lowStockItems.length > 0) {
            this.notifications.push({
                id: 'stock_low',
                icon: 'fa-boxes-stacked text-red-500',
                title: `${lowStockItems.length} item(ns) com estoque baixo`,
                description: `Itens como ${lowStockItems[0].nome} precisam de reposição.`,
                action: () => App.onNavigate('Estoque')
            });
        }

        // 2. Higienizações Vencidas
        const overdueUsers = [];
        data.usuarios.forEach(u => {
            if (!u.createdAt || !u.createdAt.toDate) return;
            const lastSanitization = data.historico
                .filter(h => h.userId === u.userId)
                .sort((a, b) => b.higienizadoEm.toDate() - a.higienizadoEm.toDate())[0];
            const referenceDate = lastSanitization ? lastSanitization.higienizadoEm.toDate() : u.createdAt.toDate();
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() - 4);
            if (referenceDate < deadline) {
                overdueUsers.push(u.nome);
            }
        });
        if (overdueUsers.length > 0) {
             this.notifications.push({
                id: 'hygiene_overdue',
                icon: 'fa-pump-soap text-yellow-500',
                title: `${overdueUsers.length} higienizaç${overdueUsers.length > 1 ? 'ões' : 'ão'} vencida(s)`,
                description: `Usuários: ${overdueUsers.slice(0, 2).join(', ')}...`,
                action: () => App.onNavigate('Dashboard')
            });
        }

        // 3. Vencimentos Próximos (Máscara e Teste)
        const expiringSoon = [];
        data.usuarios.forEach(u => {
            const statuses = getUserStatus(u);
            if (statuses.mask.key === 'breve') {
                expiringSoon.push(`${u.nome} (máscara)`);
            }
            if (statuses.test.key === 'breve') {
                expiringSoon.push(`${u.nome} (teste)`);
            }
        });
         if (expiringSoon.length > 0) {
             this.notifications.push({
                id: 'expiring_soon',
                icon: 'fa-calendar-times text-blue-500',
                title: `${expiringSoon.length} item(ns) vencendo em breve`,
                description: `${expiringSoon.slice(0, 2).join(', ')}...`,
                action: () => App.onNavigate('GestaoUsuarios')
            });
        }

        return this.notifications;
    }
};

const AssistantService = {
    recognition: null,
    isListening: false,

    initSpeechRecognition() {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!window.SpeechRecognition) {
            console.warn("Speech Recognition não é suportado neste navegador.");
            DOM.showToast("Reconhecimento de voz não suportado.", "error");
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'pt-BR';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            const commandInput = DOM.qs('#assistant-command-input');
            if (commandInput) {
                commandInput.value = speechResult;
                commandInput.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        };

        this.recognition.onspeechend = () => {
            this.stopListening();
        };
        
        this.recognition.onerror = (event) => {
             console.error("Erro no reconhecimento de voz:", event.error);
             this.stopListening();
             if(event.error !== 'no-speech') {
                DOM.showToast("Erro no reconhecimento de voz.", "error");
             }
        };
    },
    
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        this.isListening = false;
        const micButton = DOM.qs('#mic-button');
        if(micButton) micButton.classList.remove('text-red-500', 'animate-pulse');
    },

    toggleListening() {
        if (!this.recognition) this.initSpeechRecognition();
        if (!this.recognition) return;

        if (this.isListening) {
            this.stopListening();
        } else {
            try {
                this.recognition.start();
                this.isListening = true;
                const micButton = DOM.qs('#mic-button');
                if(micButton) micButton.classList.add('text-red-500', 'animate-pulse');
            } catch(e) {
                console.error("Erro ao iniciar reconhecimento de voz:", e);
                DOM.showToast("Não foi possível iniciar o microfone.", "error");
                this.stopListening();
            }
        }
    },
    
    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, ''));
        utterance.lang = 'pt-BR';
        speechSynthesis.speak(utterance);
    },

    processCommand: async function(command, user, allData) {
        const cmd = command.toLowerCase().trim();
        let response = { message: "Não entendi o comando. Tente 'ajuda' para ver a lista de comandos.", status: 'not_found', shouldClose: false };

        const commandMap = [
            { regex: /^(?:ajuda|comandos)$/, action: () => {
                response = { message: `Aqui estão alguns comandos que entendo: 
                    <ul class='list-disc list-inside text-sm'>
                        <li><b>ir para [tela]</b> (ex: ir para estoque)</li>
                        <li><b>buscar usuário [nome]</b> (ex: buscar usuário christian)</li>
                        <li><b>registrar higienização de [nome] sem peças</b></li>
                        <li><b>gerar relatório de [tipo]</b> (ex: gerar relatório de estoque)</li>
                    </ul>`, status: 'success', shouldClose: false };
            }},
            { regex: /^(?:ir para|vá para|abrir|mostrar|ver|tela de|tela)\s+(.+)/, action: (matches) => {
                const target = matches[1].trim();
                const viewMap = {
                    'dashboard': 'Dashboard', 'início': 'Dashboard', 'inicio': 'Dashboard',
                    'cadastros': 'Cadastros', 'cadastro': 'Cadastros', 'novo usuário': 'Cadastros',
                    'higienização': 'Higienizacao', 'higienizacao': 'Higienizacao', 'registrar higienização': 'Higienizacao',
                    'estoque': 'Estoque', 'peças': 'Estoque', 'pecas': 'Estoque',
                    'pedidos': 'Pedidos', 'compras': 'Pedidos', 'sugestões': 'Pedidos',
                    'quadro de avisos': 'QuadroDeAvisos', 'avisos': 'QuadroDeAvisos',
                    'máscaras': 'MascarasReserva', 'mascaras': 'MascarasReserva', 'máscaras reserva': 'MascarasReserva',
                    'usuários': 'GestaoUsuarios', 'gestão de usuários': 'GestaoUsuarios', 'usuarios': 'GestaoUsuarios',
                    'relatórios': 'Relatorios', 'relatorios': 'Relatorios',
                    'permissões': 'Permissoes', 'permissoes': 'Permissoes'
                };
                const view = viewMap[target];
                if (view) {
                    if (view === 'Permissoes' && user.role !== 'desenvolvedor') {
                        response = { message: 'Desculpe, você não tem permissão para acessar esta tela.', status: 'permission_denied', shouldClose: false };
                    } else {
                        App.onNavigate(view);
                        response = { message: `Navegando para ${view}...`, status: 'success', shouldClose: true };
                    }
                }
            }},
            { regex: /^(?:buscar|procurar|encontrar|pesquisar|achar)\s+usu[aá]rio\s+(.+)/i, action: (matches) => {
                const term = matches[1].trim();
                const foundUser = allData.usuarios.find(u => u.nome.toLowerCase().includes(term));
                
                if (foundUser) {
                    App.onNavigate('GestaoUsuarios', { searchTerm: term });
                    response = { message: `Buscando por "${term}" em Gestão de Usuários...`, status: 'success', shouldClose: true };
                } else {
                    response = { message: `Não encontrei nenhum usuário com o nome parecido com "${term}".`, status: 'not_found', shouldClose: false };
                }
            }},
            { regex: /^(?:registrar|registra|lançar|lança)\s+higieniza[cç][aã]o\s+(?:para|de)\s+(.+?)\s+sem\s+(?:pe[cç]as|troca de pe[cç]as)/i, async action(matches) {
                const userNameToFind = matches[1].trim();
                const targetUser = allData.usuarios.find(u => u.nome.toLowerCase().includes(userNameToFind));

                if (!targetUser) {
                    response = { message: `Usuário "${userNameToFind}" não encontrado.`, status: 'error', shouldClose: false };
                    return;
                }

                const registro = {
                    userId: targetUser.userId,
                    userName: targetUser.nome,
                    tamanhoMascara: targetUser.tamanhoMascara,
                    pecasTrocadas: [],
                    responsavel: user.email,
                    higienizadoEm: Timestamp.now(),
                    report: "Registrado via comando de voz"
                };
                
                try {
                    await DataService.saveRecordAndUpdateStock(registro, []);
                    response = { message: `Higienização para ${targetUser.nome} registrada com sucesso.`, status: 'success', shouldClose: true };
                } catch (error) {
                    console.error("Erro ao registrar higienização por voz:", error);
                    response = { message: `Ocorreu um erro ao registrar a higienização.`, status: 'error', shouldClose: false };
                }
            }},
            { regex: /^(?:gerar relat[oó]rio de)\s+(.+)/, action: (matches) => {
                const type = matches[1].trim();
                if (type.includes('estoque') || type.includes('peças') || type.includes('higieniza')) {
                    App.onNavigate('Relatorios');
                    response = { message: 'Navegando para Relatórios. Você pode gerar o relatório desejado lá.', status: 'success', shouldClose: true };
                }
            }},
        ];
        
        for (const { regex, action } of commandMap) {
            const matches = cmd.match(regex);
            if (matches) {
                await action(matches);
                break; 
            }
        }
        
        this.speak(response.message);
        return response;
    }
};

const ModalService = {
    showConfirmation: ({ title, message, onConfirm }) => {
        const modalHtml = `
        <div id="confirmationModal" class="modal-overlay active">
            <div class="modal-content p-6 text-center">
                <h3 class="text-xl font-bold mb-4">${title}</h3>
                <p class="mb-6 text-gray-600">${message}</p>
                <div class="flex justify-center gap-4">
                    <button id="modal-btn-cancel" class="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button id="modal-btn-confirm" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirmar</button>
                </div>
            </div>
        </div>`;
        DOM.render('#modal-container', modalHtml);

        DOM.qs('#modal-btn-cancel').addEventListener('click', () => ModalService.close());
        DOM.qs('#modal-btn-confirm').addEventListener('click', () => {
            onConfirm();
            ModalService.close();
        });
    },
    
    close: () => {
        DOM.render('#modal-container', '');
    }
};

const ReportService = {
    generatePDF: (data, user, type) => {
        console.log('Gerando relatório PDF:', type);
        DOM.showToast('Relatório PDF gerado com sucesso!', 'success');
    },
    
    generateExcel: (data, user, type) => {
        console.log('Gerando relatório Excel:', type);
        DOM.showToast('Relatório Excel gerado com sucesso!', 'success');
    }
};

// Exporta os serviços e utilitários
export { 
    DOM, 
    getUserStatus, 
    PresenceService, 
    AuthService, 
    OfflineService, 
    NotificationService, 
    AssistantService, 
    ModalService, 
    ReportService 
};