// =================================================================================
// MÓDULO: VIEWS - RENDERIZAÇÃO DE TELAS DA APLICAÇÃO
// =================================================================================
import { DOM, ModalService, getUserStatus, ReportService } from './utils.js';
import { AuthService, DataService } from './services.js';
import { Timestamp, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const Views = {
    // Auth View: Renders the login screen
    Auth: {
        render() {
            const html = `
            <div class="flex items-center justify-center min-h-full p-4 fade-in">
                <div class="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
                    <div class="text-center mb-8">
                        <i class="fas fa-shield-virus text-5xl text-blue-600"></i>
                        <h1 class="text-3xl font-bold text-gray-800 mt-4">S.G.M</h1>
                        <p class="text-gray-500">Sistema de Gestão de Máscaras</p>
                    </div>
                    <form id="login-form">
                        <div class="mb-4">
                            <label for="email" class="block text-gray-700 font-semibold mb-2">E-mail</label>
                            <input type="email" id="email" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="seu.email@exemplo.com">
                        </div>
                        <div class="mb-6">
                            <label for="password" class="block text-gray-700 font-semibold mb-2">Senha</label>
                            <input type="password" id="password" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="********">
                        </div>
                        <button type="submit" id="btn-login" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center justify-center">
                            <span id="btn-login-text">Entrar</span>
                            <i id="btn-login-spinner" class="fas fa-spinner fa-spin ml-2 hidden"></i>
                        </button>
                        <p id="login-error" class="text-red-500 text-center mt-4 text-sm"></p>
                    </form>
                </div>
            </div>`;
            DOM.render('#app', html);
            this.addEventListeners();
        },
        addEventListeners() {
            DOM.qs('#login-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = DOM.qs('#email').value;
                const password = DOM.qs('#password').value;
                const btnText = DOM.qs('#btn-login-text');
                const btnSpinner = DOM.qs('#btn-login-spinner');
                const errorP = DOM.qs('#login-error');

                errorP.textContent = '';
                btnText.textContent = 'Entrando...';
                btnSpinner.classList.remove('hidden');
                DOM.qs('#btn-login').disabled = true;

                try {
                    await AuthService.signIn(email, password);
                    // onAuthStateChange will handle the rest
                } catch (error) {
                    errorP.textContent = AuthService.getFriendlyErrorMessage(error);
                    btnText.textContent = 'Entrar';
                    btnSpinner.classList.add('hidden');
                    DOM.qs('#btn-login').disabled = false;
                }
            });
        }
    },

    // AppLayout View: Renders the main shell of the application after login
    AppLayout: {
        render(user) {
            const { isAdmin, role } = user;
            const isDev = role === 'desenvolvedor';
            const canWrite = role === 'colaborador' || isAdmin;

            const navItems = [
                { view: 'Dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard', show: true },
                { view: 'Higienizacao', icon: 'fa-pump-soap', label: 'Higienização', show: canWrite },
                { view: 'Cadastros', icon: 'fa-user-plus', label: 'Cadastros', show: isAdmin },
                { view: 'Estoque', icon: 'fa-boxes-stacked', label: 'Estoque', show: true },
                { view: 'MascarasReserva', icon: 'fa-people-carry-box', label: 'Másc. Reserva', show: true },
                { view: 'GestaoUsuarios', icon: 'fa-users-cog', label: 'Usuários', show: true },
                { view: 'Relatorios', icon: 'fa-file-alt', label: 'Relatórios', show: true },
                { view: 'Pedidos', icon: 'fa-clipboard-list', label: 'Pedidos', show: isAdmin },
                { view: 'QuadroDeAvisos', icon: 'fa-bullhorn', label: 'Avisos', show: true },
                { view: 'Permissoes', icon: 'fa-user-shield', label: 'Permissões', show: isDev },
            ];

            const navHtml = navItems
                .filter(item => item.show)
                .map(item => `
                <a href="#" class="nav-tab px-3 py-4 text-sm font-semibold text-gray-500 hover:text-blue-600" data-view="${item.view}">
                    <i class="fas ${item.icon} mr-2 hidden sm:inline-block"></i>${item.label}
                </a>`).join('');

            const html = `
            <div id="sticky-header" class="bg-gray-50/80 backdrop-blur-sm shadow-sm">
                <header class="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-shield-virus text-2xl text-blue-600"></i>
                        <h1 class="text-xl font-bold text-gray-800 hidden md:block">S.G.M</h1>
                    </div>
                    <div class="flex items-center gap-4">
                        <button id="btn-verify-mask" title="Verificar Máscara por QR Code" class="h-10 w-10 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 text-gray-600">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <div id="notification-bell">
                            <i class="fas fa-bell text-xl text-gray-600"></i>
                            <span id="notification-badge" class="hidden">0</span>
                            <div id="notification-panel" class="hidden"></div>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-gray-800 text-sm">${user.email}</p>
                            <p class="text-xs text-gray-500 capitalize">${user.role}</p>
                        </div>
                        <button id="logoutButton" title="Sair" class="h-10 w-10 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </header>
                <nav class="container mx-auto px-4 flex border-b border-gray-200 overflow-x-auto tabs">
                    ${navHtml}
                </nav>
            </div>
            <main id="view-content" class="container mx-auto p-4 flex-grow fade-in"></main>
            `;
            DOM.render('#app', html);
        }
    },
    
    // Views Completas
    Dashboard: {
        chart: null,
        updateInterval: null,
        render(data, user) {
            const { usuarios, estoque, historico, mascarasReserva } = data;

            const totalUsers = usuarios.length;
            const lowStockItems = estoque.filter(i => i.qtd <= i.qtdMin).length;
            const availableMasks = mascarasReserva.filter(m => m.status === 'Disponível').length;
            
            const pendingUsersList = [];
            usuarios.forEach(u => {
                if (!u.createdAt || !u.createdAt.toDate) return;

                const lastSanitization = historico
                    .filter(h => h.userId === u.userId)
                    .sort((a, b) => b.higienizadoEm.toDate() - a.higienizadoEm.toDate())[0];
                
                const referenceDate = lastSanitization ? lastSanitization.higienizadoEm.toDate() : u.createdAt.toDate();
                
                const deadline = new Date();
                deadline.setMonth(deadline.getMonth() - 4);

                if (referenceDate < deadline) {
                    pendingUsersList.push(u.nome);
                }
            });
            const pendingSanitizations = pendingUsersList.length;

            const complianceIndex = totalUsers > 0 ? Math.round(((totalUsers - pendingSanitizations) / totalUsers) * 100) : 100;
            const getComplianceClass = (index) => {
                if (index < 70) return 'text-red-500';
                if (index < 90) return 'text-yellow-500';
                return 'text-green-500';
            };

            const pendingUsersHtml = pendingUsersList.length > 0
                ? `<ul class="list-disc list-inside text-sm text-gray-600 mt-2">${pendingUsersList.map(name => `<li>${name}</li>`).join('')}</ul>`
                : '<p class="text-sm text-gray-500 mt-2">Nenhum usuário com pendências.</p>';

            const html = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-500">Índice de Conformidade</p>
                            <p class="text-3xl font-bold ${getComplianceClass(complianceIndex)}">${complianceIndex}%</p>
                        </div>
                        <i class="fas fa-check-circle text-4xl text-gray-200"></i>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-500">Status do Estoque</p>
                            <p class="text-3xl font-bold ${lowStockItems > 0 ? 'text-red-500' : 'text-green-500'}">${lowStockItems}</p>
                            <p class="text-xs text-gray-400">Itens com estoque baixo</p>
                        </div>
                        <i class="fas fa-boxes-stacked text-4xl text-gray-200"></i>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-500">Máscaras de Reserva</p>
                            <p class="text-3xl font-bold text-blue-500">${availableMasks}</p>
                            <p class="text-xs text-gray-400">Disponíveis para uso</p>
                        </div>
                        <i class="fas fa-people-carry-box text-4xl text-gray-200"></i>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-500">Higienizações Pendentes</p>
                            <p class="text-3xl font-bold ${pendingSanitizations > 0 ? 'text-yellow-500' : 'text-green-500'}">${pendingSanitizations}</p>
                             <p class="text-xs text-gray-400">Vencidas há mais de 4 meses</p>
                        </div>
                        <i class="fas fa-pump-soap text-4xl text-gray-200"></i>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    <div class="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                        <h3 class="font-bold text-lg mb-4">Higienizações nos Últimos 7 Dias</h3>
                        <canvas id="hygieneChart"></canvas>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-md">
                        <h3 class="font-bold text-lg mb-4">Usuários com Pendências</h3>
                        <div class="max-h-80 overflow-y-auto">
                            ${pendingUsersHtml}
                        </div>
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
            this.renderChart(historico);
        },
        renderChart(historico) {
            if (this.chart) {
                this.chart.destroy();
            }
            const ctx = DOM.qs('#hygieneChart')?.getContext('2d');
            if (!ctx) return;

            const labels = [];
            const dataPoints = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }));
                
                const dayStart = new Date(d);
                dayStart.setHours(0,0,0,0);
                const dayEnd = new Date(d);
                dayEnd.setHours(23,59,59,999);

                const count = historico.filter(h => {
                    const hDate = h.higienizadoEm.toDate();
                    return hDate >= dayStart && hDate <= dayEnd;
                }).length;
                dataPoints.push(count);
            }

            this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Higienizações Realizadas',
                        data: dataPoints,
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    },
    Higienizacao: { 
        render(data, user) {
            const { estoque } = data;
            const partsHtml = estoque.map(peca => `
                <div class="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                    <label for="peca-${peca.id}" class="font-medium">${peca.nome}</label>
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-500">(Disp: ${peca.qtd})</span>
                        <input type="number" id="peca-${peca.id}" data-id="${peca.id}" data-nome="${peca.nome}" class="w-20 p-1 border rounded text-center" min="0" max="${peca.qtd}" placeholder="0">
                    </div>
                </div>
            `).join('');

            const html = `
                <div class="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
                    <h2 class="text-2xl font-bold mb-6 text-gray-800">Registrar Higienização</h2>
                    <form id="formHigienizacao" class="space-y-6">
                        <div class="relative">
                            <label for="search-hig-usuario" class="block font-semibold mb-1">Usuário</label>
                            <div class="flex">
                                <input type="text" id="search-hig-usuario" class="w-full p-3 border-gray-300 border rounded-l-lg focus:ring-2 focus:ring-blue-500" placeholder="Digite para buscar ou escaneie o QR Code" autocomplete="off">
                                <button type="button" id="btn-scan-user" class="bg-gray-200 px-4 rounded-r-lg hover:bg-gray-300"><i class="fas fa-qrcode"></i></button>
                            </div>
                            <div id="autocomplete-results" class="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg hidden"></div>
                            <input type="hidden" id="selected-user-id">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label for="hig-tamanho" class="block font-semibold mb-1">Tamanho da Máscara</label>
                                <input type="text" id="hig-tamanho" class="w-full p-3 bg-gray-100 border rounded-lg" readonly>
                            </div>
                            <div>
                                <label for="hig-responsavel" class="block font-semibold mb-1">Responsável</label>
                                <input type="text" id="hig-responsavel" class="w-full p-3 bg-gray-100 border rounded-lg" value="${user.email}" readonly>
                            </div>
                        </div>
                        <div>
                            <h3 class="font-semibold mb-2">Peças Trocadas</h3>
                            <div class="space-y-3 max-h-60 overflow-y-auto p-2 border rounded-lg">${partsHtml}</div>
                        </div>
                        <div>
                            <label for="hig-report" class="block font-semibold mb-1">Relatório de Danos/Observações</label>
                            <textarea id="hig-report" class="w-full p-3 border-gray-300 border rounded-lg" rows="3" placeholder="Descreva qualquer dano encontrado..."></textarea>
                        </div>
                        <div class="text-right">
                            <button type="submit" class="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">Registrar</button>
                        </div>
                    </form>
                </div>
            `;
            DOM.render('#view-content', html);
            this.addEventListeners(data.usuarios);
        },
        addEventListeners(usuarios) {
            const searchInput = DOM.qs('#search-hig-usuario');
            const resultsContainer = DOM.qs('#autocomplete-results');
            const selectedUserIdInput = DOM.qs('#selected-user-id');
            const tamanhoInput = DOM.qs('#hig-tamanho');

            searchInput.addEventListener('input', () => {
                const term = searchInput.value.toLowerCase();
                if (term.length < 2) {
                    resultsContainer.innerHTML = '';
                    resultsContainer.classList.add('hidden');
                    return;
                }
                const filtered = usuarios.filter(u => u.nome.toLowerCase().includes(term));
                resultsContainer.innerHTML = filtered.map(u => `<div class="p-3 hover:bg-gray-100 cursor-pointer" data-id="${u.userId}" data-nome="${u.nome}" data-tamanho="${u.tamanhoMascara}">${u.nome}</div>`).join('');
                resultsContainer.classList.remove('hidden');
            });

            resultsContainer.addEventListener('click', (e) => {
                if (e.target.matches('[data-id]')) {
                    searchInput.value = e.target.dataset.nome;
                    selectedUserIdInput.value = e.target.dataset.id;
                    tamanhoInput.value = e.target.dataset.tamanho;
                    resultsContainer.classList.add('hidden');
                }
            });

            DOM.qs('#formHigienizacao').addEventListener('submit', async (e) => {
                e.preventDefault();
                const userId = selectedUserIdInput.value;
                if (!userId) {
                    DOM.showToast('Por favor, selecione um usuário.', 'error');
                    return;
                }
                
                const pecasTrocadas = [...DOM.qsa('#formHigienizacao input[type="number"]')]
                    .filter(input => parseInt(input.value, 10) > 0)
                    .map(input => ({
                        id: input.dataset.id,
                        nome: input.dataset.nome,
                        qtd: parseInt(input.value, 10)
                    }));
                
                const allStock = App.state.data.estoque;
                const partsToUpdate = pecasTrocadas.map(p => {
                    const stockItem = allStock.find(s => s.id === p.id);
                    return { id: p.id, newQty: stockItem.qtd - p.qtd };
                });

                const registro = {
                    userId: userId,
                    userName: searchInput.value,
                    tamanhoMascara: tamanhoInput.value,
                    pecasTrocadas: pecasTrocadas,
                    responsavel: DOM.qs('#hig-responsavel').value,
                    higienizadoEm: Timestamp.now(),
                    report: DOM.qs('#hig-report').value
                };
                
                try {
                    await DataService.saveRecordAndUpdateStock(registro, partsToUpdate);
                    DOM.showToast('Higienização registrada com sucesso!');
                    e.target.reset();
                } catch (error) {
                    console.error("Erro ao salvar registro:", error);
                    DOM.showToast('Erro ao salvar o registro.', 'error');
                }
            });
        }
    },
    // Add other views as needed - Cadastros, Estoque, etc.
    // For brevity, I'll include a simplified version of some key views
    Estoque: {
        render(data, user, params = {}) {
            const { isAdmin } = user;
            let { estoque } = data;
            if (params.searchTerm) {
                const term = params.searchTerm.toLowerCase();
                estoque = estoque.filter(p => p.nome.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term));
            }
            
            const getStatusClass = (peca) => {
                if (peca.qtd <= 0) return 'bg-red-100 text-red-700';
                if (peca.qtd <= peca.qtdMin) return 'bg-yellow-100 text-yellow-700';
                return 'bg-green-100 text-green-700';
            };

            const tableRows = estoque.map(peca => `
                <tr class="border-b">
                    <td data-label="Peça" class="p-3 font-medium">${peca.nome}</td>
                    <td data-label="Código" class="p-3 text-gray-500">${peca.codigo}</td>
                    <td data-label="Qtd. Atual" class="p-3 font-bold">${peca.qtd}</td>
                    <td data-label="Qtd. Mínima" class="p-3 text-gray-500">${peca.qtdMin}</td>
                    <td data-label="Status" class="p-3"><span class="px-2 py-1 text-xs font-bold rounded-full ${getStatusClass(peca)}">${peca.qtd <= peca.qtdMin ? 'BAIXO' : 'OK'}</span></td>
                    <td data-label="Ações" class="p-3 text-right">
                        ${isAdmin ? `
                        <button title="Adicionar quantidade" class="btn-add-stock text-green-500 hover:text-green-700 p-2" data-id="${peca.id}"><i class="fas fa-plus-circle"></i></button>
                        <button title="Editar item" class="btn-edit-stock text-blue-500 hover:text-blue-700 p-2" data-id="${peca.id}"><i class="fas fa-edit"></i></button>
                        <button title="Excluir item" class="btn-delete-stock text-red-500 hover:text-red-700 p-2" data-id="${peca.id}"><i class="fas fa-trash"></i></button>
                        ` : '<span class="text-xs text-gray-400">N/A</span>'}
                    </td>
                </tr>
            `).join('');

            const html = `
                <div class="bg-white p-6 rounded-2xl shadow-lg">
                    <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                        <h2 class="text-2xl font-bold">Controle de Estoque</h2>
                        <div class="flex gap-2 w-full md:w-auto">
                            <form id="search-form-estoque" class="flex-grow"><input type="search" id="search-input-estoque" placeholder="Buscar peça..." class="w-full p-2 border rounded-lg"></form>
                            ${isAdmin ? '<button id="btn-add-peca" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 whitespace-nowrap"><i class="fas fa-plus mr-2"></i>Nova Peça</button>' : ''}
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full responsive-table">
                            <thead class="bg-gray-50"><tr>
                                <th class="p-3 text-left font-semibold">Peça</th><th class="p-3 text-left font-semibold">Código</th><th class="p-3 text-left font-semibold">Qtd. Atual</th><th class="p-3 text-left font-semibold">Qtd. Mínima</th><th class="p-3 text-left font-semibold">Status</th><th class="p-3 text-right font-semibold">Ações</th>
                            </tr></thead>
                            <tbody>${tableRows || '<tr><td colspan="6" class="text-center p-4">Nenhuma peça encontrada.</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    },
    // Simplified versions of other views...
    GestaoUsuarios: {
        currentPage: 1,
        itemsPerPage: 10,
        render(data, user, params = {}) {
            // Simplified user management view
            const html = `
                <div class="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">Gestão de Usuários</h2>
                    <p class="text-gray-600">Interface de usuários será implementada aqui.</p>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    }
    // Add other simplified views as needed...
};