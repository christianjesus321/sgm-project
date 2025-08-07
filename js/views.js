// =================================================================================
// MÓDULO: VIEWS - COMPONENTES DE RENDERIZAÇÃO
// =================================================================================

import { DOM, getUserStatus } from './utils.js';

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
                <div class="space-y-6">
                    <h1 class="text-2xl font-bold text-gray-800">Registrar Higienização</h1>
                    
                    <form id="hygiene-form" class="bg-white rounded-lg shadow-sm border p-6 space-y-6">
                        <div>
                            <label for="user-search" class="block text-sm font-medium text-gray-700 mb-2">Buscar Usuário</label>
                            <input type="text" id="user-search" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Digite o nome do usuário..." required>
                        </div>
                        
                        <div>
                            <label for="mask-size" class="block text-sm font-medium text-gray-700 mb-2">Tamanho da Máscara</label>
                            <select id="mask-size" class="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                                <option value="">Selecione o tamanho</option>
                                <option value="P">Pequeno (P)</option>
                                <option value="M">Médio (M)</option>
                                <option value="G">Grande (G)</option>
                            </select>
                        </div>
                        
                        <div>
                            <label for="responsible" class="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
                            <input type="text" id="responsible" class="w-full px-4 py-2 border border-gray-300 rounded-lg" value="${user.email}" readonly>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Peças Trocadas</label>
                            <div class="space-y-2">
                                ${partsHtml}
                            </div>
                        </div>
                        
                        <button type="submit" class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
                            Registrar Higienização
                        </button>
                    </form>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    },

    Cadastros: {
        render(data, user) {
            const html = `
                <div class="space-y-6">
                    <h1 class="text-2xl font-bold text-gray-800">Cadastros</h1>
                    
                    <div class="bg-white rounded-lg shadow-sm border p-6">
                        <h2 class="text-lg font-semibold mb-4">Cadastrar Novo Usuário</h2>
                        <form id="user-registration-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                                <input type="text" id="user-name" name="nome" class="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Tamanho da Máscara</label>
                                    <select class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                        <option>P</option>
                                        <option>M</option>
                                        <option>G</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input type="email" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                </div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                Cadastrar Usuário
                            </button>
                        </form>
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    },

    Estoque: {
        render(data, user) {
            const { estoque } = data;
            
            const html = `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h1 class="text-2xl font-bold text-gray-800">Estoque</h1>
                        <form id="search-form-estoque" class="flex gap-2">
                            <input type="text" id="search-input-estoque" placeholder="Buscar item..." class="px-4 py-2 border border-gray-300 rounded-lg">
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                <i class="fas fa-search"></i>
                            </button>
                        </form>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 responsive-table">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mínimo</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${estoque.map(item => `
                                        <tr>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-label="Item">${item.nome}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Código">${item.codigo || 'N/A'}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-label="Quantidade">${item.qtd}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Mínimo">${item.qtdMin || 0}</td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.qtd > (item.qtdMin || 0) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                    ${item.qtd > (item.qtdMin || 0) ? 'OK' : 'BAIXO'}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div class="flex space-x-2">
                                                    <button class="btn-add text-green-600 hover:text-green-900" title="Adicionar ao estoque"><i class="fas fa-plus"></i></button>
                                                    <button class="btn-edit text-blue-600 hover:text-blue-900" title="Editar item"><i class="fas fa-edit"></i></button>
                                                    <button class="btn-delete text-red-600 hover:text-red-900" title="Excluir item"><i class="fas fa-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    },

    GestaoUsuarios: {
        currentPage: 1,
        render(data, user) {
            const { usuarios, userStatus } = data;
            
            const html = `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h1 class="text-2xl font-bold text-gray-800">Gestão de Usuários</h1>
                        <form id="search-form-users" class="flex gap-2">
                            <input type="text" id="search-input-users" placeholder="Buscar usuário..." class="px-4 py-2 border border-gray-300 rounded-lg">
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                <i class="fas fa-search"></i>
                            </button>
                        </form>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 responsive-table">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamanho Máscara</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Máscara</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Teste</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${usuarios.map(user => {
                                        const status = getUserStatus(user);
                                        return `
                                            <tr>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-label="Nome">${user.nome}</td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Tamanho Máscara">${user.tamanhoMascara || 'N/A'}</td>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.mask.class}">
                                                        ${status.mask.text}
                                                    </span>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.test.class}">
                                                        ${status.test.text}
                                                    </span>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div class="flex space-x-2">
                                                        <button class="text-blue-600 hover:text-blue-900" title="Sincronizar"><i class="fas fa-sync-alt"></i></button>
                                                        <button class="text-green-600 hover:text-green-900" title="Ver detalhes"><i class="fas fa-th"></i></button>
                                                        <button class="btn-edit text-yellow-600 hover:text-yellow-900" title="Editar usuário"><i class="fas fa-edit"></i></button>
                                                        <button class="btn-delete text-red-600 hover:text-red-900" title="Excluir usuário"><i class="fas fa-trash"></i></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    },

    MascarasReserva: {
        render(data, user) {
            const { mascarasReserva } = data;
            
            const html = `
                <div class="space-y-6">
                    <h1 class="text-2xl font-bold text-gray-800">Máscaras de Reserva</h1>
                    
                    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 responsive-table">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identificação</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observações</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${mascarasReserva.map(mask => `
                                        <tr>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-label="Identificação">${mask.identificacao}</td>
                                            <td class="px-6 py-4 whitespace-nowrap" data-label="Status">
                                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mask.status === 'Disponível' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                    ${mask.status}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 text-sm text-gray-500" data-label="Observações">${mask.observacoes || 'Nenhuma'}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div class="flex space-x-2">
                                                    <button class="text-blue-600 hover:text-blue-900" title="Ver QR Code"><i class="fas fa-qrcode"></i></button>
                                                    <button class="btn-edit text-yellow-600 hover:text-yellow-900" title="Editar máscara"><i class="fas fa-edit"></i></button>
                                                    <button class="btn-delete text-red-600 hover:text-red-900" title="Excluir máscara"><i class="fas fa-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    },

    Relatorios: {
        render(data, user) {
            const html = `
                <div class="space-y-6">
                    <h1 class="text-2xl font-bold text-gray-800">Relatórios</h1>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="bg-white rounded-lg shadow-sm border p-6">
                            <h3 class="text-lg font-semibold mb-4">Relatório de Higienizações</h3>
                            <div class="flex space-x-2">
                                <button class="btn-report-pdf flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                                    <i class="fas fa-file-pdf mr-2"></i>PDF
                                </button>
                                <button class="btn-report-excel flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                    <i class="fas fa-file-excel mr-2"></i>Excel
                                </button>
                            </div>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border p-6">
                            <h3 class="text-lg font-semibold mb-4">Relatório de Estoque</h3>
                            <div class="flex space-x-2">
                                <button class="btn-report-pdf flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                                    <i class="fas fa-file-pdf mr-2"></i>PDF
                                </button>
                                <button class="btn-report-excel flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                    <i class="fas fa-file-excel mr-2"></i>Excel
                                </button>
                            </div>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border p-6">
                            <h3 class="text-lg font-semibold mb-4">Relatório de Usuários</h3>
                            <div class="flex space-x-2">
                                <button class="btn-report-pdf flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                                    <i class="fas fa-file-pdf mr-2"></i>PDF
                                </button>
                                <button class="btn-report-excel flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                    <i class="fas fa-file-excel mr-2"></i>Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    },

    Pedidos: {
        render(data, user) {
            const html = `
                <div class="space-y-6">
                    <h1 class="text-2xl font-bold text-gray-800">Pedidos</h1>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="bg-white rounded-lg shadow-sm border p-6">
                            <h3 class="text-lg font-semibold mb-4">Sugestão de Compra de Peças</h3>
                            <p class="text-gray-600 mb-4">Nenhum item com estoque baixo.</p>
                            <button class="btn-manual-order bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                                <i class="fas fa-clipboard-list mr-2"></i>Pedido Manual
                            </button>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border p-6">
                            <h3 class="text-lg font-semibold mb-4">Pedido de Novas Máscaras</h3>
                            <p class="text-gray-600 mb-4">Crie um pedido de compra manual para novas máscaras de proteção.</p>
                            <button class="btn-mask-order bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                                <i class="fas fa-plus mr-2"></i>Criar Pedido de Máscaras
                            </button>
                        </div>
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    },

    QuadroDeAvisos: {
        render(data, user) {
            const { noticeBoard } = data;
            
            const html = `
                <div class="space-y-6">
                    <h1 class="text-2xl font-bold text-gray-800">Quadro de Avisos</h1>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${noticeBoard.map(notice => `
                            <div class="bg-white rounded-lg shadow-sm border p-6">
                                <h3 class="text-lg font-semibold mb-2">${notice.title}</h3>
                                <p class="text-gray-600 text-sm">${notice.content || 'Sem conteúdo'}</p>
                                <div class="mt-4 flex justify-between items-center">
                                    <span class="text-xs text-gray-500">${notice.createdAt ? new Date(notice.createdAt.toDate()).toLocaleDateString() : 'Data não disponível'}</span>
                                    <button class="text-blue-600 hover:text-blue-800 text-sm">Ver detalhes</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    },

    Permissoes: {
        render(data, user) {
            const { permissao, userStatus } = data;
            
            const html = `
                <div class="space-y-6">
                    <h1 class="text-2xl font-bold text-gray-800">Gestão de Permissões</h1>
                    
                    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 responsive-table">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${permissao.map(perm => {
                                        const userInfo = userStatus.find(u => u.uid === perm.id);
                                        return `
                                            <tr>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-label="Nome">${perm.nome || 'N/A'}</td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Email">${userInfo?.email || 'N/A'}</td>
                                                <td class="px-6 py-4 whitespace-nowrap" data-label="Cargo">
                                                    <select class="role-select border border-gray-300 rounded px-2 py-1 text-sm" data-uid="${perm.id}">
                                                        <option value="auditor" ${perm.role === 'auditor' ? 'selected' : ''}>Auditor</option>
                                                        <option value="colaborador" ${perm.role === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                                                        <option value="administrador" ${perm.role === 'administrador' ? 'selected' : ''}>Administrador</option>
                                                        <option value="desenvolvedor" ${perm.role === 'desenvolvedor' ? 'selected' : ''}>Desenvolvedor</option>
                                                    </select>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div class="flex space-x-2">
                                                        <button class="btn-edit-permission-name text-blue-600 hover:text-blue-900" data-id="${perm.id}" title="Editar nome">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button class="btn-delete text-red-600 hover:text-red-900" title="Excluir permissão">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="flex justify-end">
                        <button id="btn-new-system-user" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Adicionar Usuário do Sistema
                        </button>
                    </div>
                </div>
            `;
            DOM.render('#view-content', html);
        }
    }
};
