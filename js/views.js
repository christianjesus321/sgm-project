// =================================================================================
// MÓDULO: COMPONENTES DE TELA (VIEWS)
// =================================================================================
import { DOM, getUserStatus } from './utils.js';

export const Views = {
    // Tela de Login
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

    // Layout Principal
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
                .map(item => `<a href="#" class="nav-tab px-3 py-4 text-sm font-semibold text-gray-500 hover:text-blue-600" data-view="${item.view}"><i class="fas ${item.icon} mr-2 hidden sm:inline-block"></i>${item.label}</a>`).join('');

            const html = `
            <div id="sticky-header" class="bg-gray-50/80 backdrop-blur-sm shadow-sm">
                <header class="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-shield-virus text-2xl text-blue-600"></i>
                        <h1 class="text-xl font-bold text-gray-800 hidden md:block">S.G.M</h1>
                    </div>
                    <div class="flex items-center gap-4">
                        <button id="btn-verify-mask" title="Verificar Máscara por QR Code" class="h-10 w-10 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 text-gray-600"><i class="fas fa-qrcode"></i></button>
                        <div id="notification-bell" class="relative cursor-pointer"><i class="fas fa-bell text-xl text-gray-600"></i><span id="notification-badge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span><div id="notification-panel" class="hidden absolute right-0 top-8 w-80 bg-white rounded-lg shadow-lg border z-50"></div></div>
                        <div class="text-right"><p class="font-semibold text-gray-800 text-sm">${user.email}</p><p class="text-xs text-gray-500 capitalize">${user.role}</p></div>
                        <button id="logoutButton" title="Sair" class="h-10 w-10 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200"><i class="fas fa-sign-out-alt"></i></button>
                    </div>
                </header>
                <nav class="container mx-auto px-4 flex border-b border-gray-200 overflow-x-auto tabs">${navHtml}</nav>
            </div>
            <main id="view-content" class="container mx-auto p-4 flex-grow fade-in"></main>`;
            DOM.render('#app', html);
        }
    },

    // Dashboard
    Dashboard: {
        render(data, user) {
            const { usuarios, estoque, historico } = data;
            
            const totalUsers = usuarios.length;
            const lowStockItems = estoque.filter(item => item.qtd <= item.qtdMin).length;
            const recentHygiene = historico.filter(h => {
                const date = h.timestamp?.toDate() || new Date();
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date > weekAgo;
            }).length;

            const html = `
            <div class="space-y-6">
                <h1 class="text-2xl font-bold text-gray-800">Dashboard</h1>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="bg-white p-6 rounded-lg shadow-sm border">
                        <div class="flex items-center">
                            <div class="p-2 bg-green-100 rounded-lg">
                                <i class="fas fa-users text-green-600"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Total de Usuários</p>
                                <p class="text-2xl font-bold text-gray-900">${totalUsers}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow-sm border">
                        <div class="flex items-center">
                            <div class="p-2 bg-yellow-100 rounded-lg">
                                <i class="fas fa-exclamation-triangle text-yellow-600"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Estoque Baixo</p>
                                <p class="text-2xl font-bold text-gray-900">${lowStockItems}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow-sm border">
                        <div class="flex items-center">
                            <div class="p-2 bg-blue-100 rounded-lg">
                                <i class="fas fa-pump-soap text-blue-600"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Higienizações (7 dias)</p>
                                <p class="text-2xl font-bold text-gray-900">${recentHygiene}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow-sm border">
                        <div class="flex items-center">
                            <div class="p-2 bg-purple-100 rounded-lg">
                                <i class="fas fa-shield-virus text-purple-600"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Conformidade</p>
                                <p class="text-2xl font-bold text-gray-900">100%</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 class="text-lg font-semibold mb-4">Higienizações nos Últimos 7 Dias</h3>
                        <div class="h-64 flex items-end justify-between">
                            ${Array.from({length: 7}, (_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (6 - i));
                                const dayHygiene = historico.filter(h => {
                                    const hDate = h.timestamp?.toDate() || new Date();
                                    return hDate.toDateString() === date.toDateString();
                                }).length;
                                return `<div class="flex flex-col items-center">
                                    <div class="bg-blue-500 rounded-t w-8" style="height: ${Math.max(dayHygiene * 20, 4)}px"></div>
                                    <span class="text-xs text-gray-500 mt-1">${date.toLocaleDateString('pt-BR', {weekday: 'short', day: 'numeric'})}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 class="text-lg font-semibold mb-4">Usuários com Pendências</h3>
                        <div class="text-center text-gray-500 py-8">
                            <i class="fas fa-check-circle text-4xl text-green-500 mb-2"></i>
                            <p>Nenhum usuário com pendências.</p>
                        </div>
                    </div>
                </div>
            </div>`;
            
            DOM.render('#view-content', html);
        }
    },

    // Estoque
    Estoque: {
        render(data, user, params = {}) {
            const { estoque } = data;
            const { searchTerm = '' } = params;
            
            const filteredEstoque = estoque.filter(item => 
                !searchTerm || item.nome.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-gray-800">Estoque</h1>
                    <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Nova Peça
                    </button>
                </div>
                
                <form id="search-form-estoque" class="flex gap-4">
                    <input type="text" id="search-input-estoque" placeholder="Buscar peça..." 
                           class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                           value="${searchTerm}">
                    <button type="submit" class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700">
                        <i class="fas fa-search"></i>
                    </button>
                </form>
                
                <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peça</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. Atual</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. Mínima</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${filteredEstoque.map(item => `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.nome}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.codigo || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${item.qtd}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.qtdMin || 0}</td>
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
            </div>`;
            
            DOM.render('#view-content', html);
        }
    },

    // Outras views básicas
    Higienizacao: {
        render(data, user) {
            DOM.render('#view-content', `
                <div class="max-w-4xl mx-auto">
                    <h1 class="text-2xl font-bold text-gray-800 mb-6">Registrar Higienização</h1>
                    <div class="bg-white rounded-lg shadow-sm border p-6">
                        <form id="hygiene-form">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
                                    <input type="text" id="user-search" placeholder="Digite para buscar ou escaneie o QR Code" 
                                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Tamanho da Máscara</label>
                                    <input type="text" id="mask-size" placeholder="P, M, G" 
                                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
                                <input type="text" id="responsible" value="${user.email}" readonly 
                                       class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                            </div>
                            <div class="flex justify-end">
                                <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                    Registrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `);
        }
    },

    Cadastros: {
        render(data, user) {
            DOM.render('#view-content', `
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
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Setores</label>
                                    <div class="space-y-2">
                                        <label class="flex items-center"><input type="checkbox" class="mr-2"> Ectos</label>
                                        <label class="flex items-center"><input type="checkbox" class="mr-2"> Endos</label>
                                        <label class="flex items-center"><input type="checkbox" class="mr-2"> EAR Tag</label>
                                        <label class="flex items-center"><input type="checkbox" class="mr-2"> Outros</label>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Data De Vencimento do Teste De Vedação</label>
                                    <input type="date" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Vencimento da Máscara</label>
                                    <input type="date" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                </div>
                            </div>
                            <div class="flex justify-end">
                                <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Cadastrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            `);
        }
    },

    GestaoUsuarios: {
        currentPage: 1,
        itemsPerPage: 10,
        
        render(data, user, params = {}) {
            const { usuarios } = data;
            const { searchTerm = '' } = params;
            
            const filteredUsers = usuarios.filter(u => 
                !searchTerm || u.nome.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            const totalPages = Math.ceil(filteredUsers.length / this.itemsPerPage);
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const currentUsers = filteredUsers.slice(startIndex, endIndex);

            const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-gray-800">Gestão de Usuários</h1>
                    <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Novo Usuário
                    </button>
                </div>
                
                <form id="search-form-users" class="flex gap-4">
                    <input type="text" id="search-input-users" placeholder="Buscar usuário..." 
                           class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                           value="${searchTerm}">
                    <button type="submit" class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700">
                        <i class="fas fa-search"></i>
                    </button>
                </form>
                
                <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setores</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Teste</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Máscara</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${currentUsers.map(user => {
                                const status = getUserStatus(user);
                                return `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.nome}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.setores?.join(', ') || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.test.class}">
                                            ${status.test.text}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.mask.class}">
                                            ${status.mask.text}
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
                
                ${totalPages > 1 ? `
                <div class="flex justify-between items-center">
                    <p class="text-sm text-gray-700">Página ${this.currentPage} de ${totalPages}</p>
                    <div class="flex space-x-2">
                        <button onclick="Views.GestaoUsuarios.previousPage()" 
                                class="px-3 py-1 border border-gray-300 rounded text-sm ${this.currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}">
                            Anterior
                        </button>
                        <button onclick="Views.GestaoUsuarios.nextPage()" 
                                class="px-3 py-1 border border-gray-300 rounded text-sm ${this.currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}">
                            Próximo
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>`;
            
            DOM.render('#view-content', html);
        },
        
        previousPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render(window.App.state.data, window.App.state.user);
            }
        },
        
        nextPage() {
            const { usuarios } = window.App.state.data;
            const totalPages = Math.ceil(usuarios.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.render(window.App.state.data, window.App.state.user);
            }
        }
    },

    // Views básicas para outras seções
    MascarasReserva: {
        render(data, user) {
            DOM.render('#view-content', `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h1 class="text-2xl font-bold text-gray-800">Máscaras de Reserva</h1>
                        <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Nova Máscara
                        </button>
                    </div>
                    <div class="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
                        <i class="fas fa-people-carry-box text-4xl mb-4"></i>
                        <p>Funcionalidade em desenvolvimento</p>
                    </div>
                </div>
            `);
        }
    },

    Relatorios: {
        render(data, user) {
            DOM.render('#view-content', `
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
            `);
        }
    },

    Pedidos: {
        render(data, user) {
            DOM.render('#view-content', `
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
            `);
        }
    },

    QuadroDeAvisos: {
        render(data, user) {
            DOM.render('#view-content', `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h1 class="text-2xl font-bold text-gray-800">Quadro de Avisos</h1>
                        <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Novo Aviso
                        </button>
                    </div>
                    <div class="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
                        <i class="fas fa-bullhorn text-4xl mb-4"></i>
                        <p>Nenhum aviso publicado.</p>
                    </div>
                </div>
            `);
        }
    },

    Permissoes: {
        render(data, user) {
            DOM.render('#view-content', `
                <div class="space-y-6">
                    <h1 class="text-2xl font-bold text-gray-800">Gestão de Permissões</h1>
                    <div class="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
                        <i class="fas fa-user-shield text-4xl mb-4"></i>
                        <p>Funcionalidade em desenvolvimento</p>
                    </div>
                </div>
            `);
        }
    }
};
