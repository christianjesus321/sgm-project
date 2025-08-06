# S.G.M - Sistema de Gestão de Máscaras

Este projeto foi refatorado de um arquivo único HTML para uma estrutura modular e organizada, pronta para versionamento Git, hospedagem GitHub e publicação no Netlify.

## Estrutura do Projeto

```
novo SGM/
├── index.html              # Arquivo HTML principal (apenas estrutura)
├── style.css               # Estilos CSS extraídos
├── README.md               # Documentação do projeto
├── .gitignore              # Arquivos e pastas a serem ignorados pelo Git
├── js/                     # Módulos JavaScript
│   ├── main.js             # Ponto de entrada principal da aplicação
│   ├── firebase-config.js  # Configuração do Firebase
│   ├── services.js         # AuthService e DataService
│   ├── utils.js            # Utilitários, DOM, ModalService, etc.
│   └── views.js            # Componentes de visualização
└── assets/                 # Recursos estáticos (imagens, etc.)
```

## Configuração para Produção

### 1. Configuração do Firebase

No arquivo `js/firebase-config.js`, substitua os placeholders pelas suas chaves reais do Firebase:

```javascript
const firebaseConfig = {
    apiKey: "sua-api-key-aqui",
    authDomain: "seu-auth-domain.firebaseapp.com",
    projectId: "seu-project-id",
    storageBucket: "seu-storage-bucket.appspot.com",
    messagingSenderId: "seu-messaging-sender-id",
    appId: "seu-app-id"
};
```

### 2. Variáveis de Ambiente no Netlify

Para maior segurança, configure as seguintes variáveis de ambiente no painel do Netlify:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

E modifique o `firebase-config.js` para usar essas variáveis.

## Deploy no Netlify

1. **Conecte seu repositório GitHub ao Netlify**
2. **Configure as variáveis de ambiente** (opcional, mas recomendado)
3. **Deploy automático** será ativado a cada push para a branch principal

### Configurações de Build (se necessário)

- **Build command**: `# deixe vazio para sites estáticos`
- **Publish directory**: `# raiz do projeto`

## Desenvolvimento Local

1. Clone o repositório
2. Configure as chaves do Firebase no arquivo `firebase-config.js`
3. Abra o `index.html` em um servidor local (ex: Live Server no VSCode)

## Funcionalidades

- ✅ **Sistema de autenticação** completo
- ✅ **Dashboard** com métricas e gráficos
- ✅ **Gestão de usuários** com paginação
- ✅ **Controle de estoque** de peças
- ✅ **Higienização** com scanner QR
- ✅ **Máscaras de reserva** com rastreamento
- ✅ **Relatórios** em PDF e Excel
- ✅ **Sistema offline** com sincronização
- ✅ **Notificações** em tempo real
- ✅ **Assistente por voz** (C.J.7)
- ✅ **Interface responsiva** para mobile

## Arquitetura Modular

### Principais Módulos

- **firebase-config.js**: Configuração e inicialização do Firebase
- **services.js**: AuthService (autenticação) e DataService (dados)
- **utils.js**: Utilitários, DOM, serviços de UI e lógica offline
- **views.js**: Componentes de renderização de telas
- **main.js**: Orquestração principal da aplicação

### Benefícios da Refatoração

1. **Manutenibilidade**: Código organizado em módulos lógicos
2. **Escalabilidade**: Fácil adição de novas funcionalidades
3. **Versionamento**: Pronto para Git e colaboração
4. **Deploy**: Otimizado para hospedagem na web
5. **Performance**: Carregamento modular de JavaScript

## Próximos Passos

1. **Implementar testes** unitários e de integração
2. **Adicionar Service Worker** para melhor experiência offline
3. **Otimizar bundle** com ferramentas de build
4. **Adicionar CI/CD** com GitHub Actions
5. **Implementar monitoramento** de erros

## Suporte

Para dúvidas ou problemas, consulte a documentação do Firebase e Netlify, ou entre em contato com a equipe de desenvolvimento.