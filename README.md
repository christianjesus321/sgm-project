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

## 🔧 Configuração e Deploy

### ⚡ Configuração Rápida (Desenvolvimento Local)

**Opção 1: Script Automático**
```bash
node setup-local.js
```

**Opção 2: Manual**
```bash
# 1. Copie o arquivo de exemplo
cp env.example .env

# 2. Edite o arquivo .env com suas credenciais do Firebase
# (obtenha em https://console.firebase.google.com/)

# 3. Inicie um servidor local
npx serve .
# ou use Live Server no VSCode
```

### 🚀 Deploy no Netlify

#### Método 1: Via Git (Recomendado)
1. **Push para GitHub** (já feito ✅)
2. **Conecte ao Netlify**:
   - Acesse [netlify.com](https://netlify.com)
   - "New site from Git" → Escolha seu repositório
   - Deploy settings: deixe padrão (detecta automaticamente via `netlify.toml`)

3. **Configure variáveis de ambiente**:
   ```
   Site Settings → Environment Variables → Add Variable
   ```
   
   Adicione estas variáveis:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

#### Método 2: Deploy Manual
```bash
# Instale o Netlify CLI
npm install -g netlify-cli

# Deploy manual
netlify deploy --prod
```

### 🔒 Segurança e Boas Práticas

#### ✅ Implementações de Segurança

1. **🔐 Variáveis de Ambiente**
   - Credenciais Firebase protegidas
   - Arquivo `.env` não versionado
   - Validação automática de configuração

2. **🛡️ Cabeçalhos de Segurança** (via `netlify.toml`)
   - Content Security Policy (CSP)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer Policy restritiva

3. **🚫 Proteção de Arquivos Sensíveis**
   - `.gitignore` abrangente
   - Redirecionamentos de segurança no Netlify
   - Bloqueio de acesso a arquivos de configuração

#### ⚠️ Configurações Importantes no Firebase

**1. Authentication Rules**
```javascript
// Firebase Auth - Configure domínios autorizados
// Console → Authentication → Settings → Authorized domains
```

**2. Firestore Security Rules**
```javascript
// Console → Firestore → Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Apenas usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Regras específicas por coleção
    match /artifacts/gcontroledehgutl/public/data/{collection}/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.email in ['admin@empresa.com']; // Ajuste conforme necessário
    }
  }
}
```

**3. Storage Rules** (se usar)
```javascript
// Console → Storage → Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### 🔍 Monitoramento

1. **Firebase Console**
   - Monitore uso de quota
   - Analise logs de segurança
   - Configure alertas de uso

2. **Netlify Analytics**
   - Monitore tráfego
   - Analise performance
   - Detecte tentativas de acesso indevido

## 💻 Desenvolvimento Local

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

## 🐛 Troubleshooting

### Problemas Comuns

#### ❌ Erro: "Firebase configuration incomplete"
```bash
# Solução:
1. Verifique se o arquivo .env existe
2. Confirme se todas as variáveis estão preenchidas
3. Execute: node setup-local.js
```

#### ❌ Erro: "Auth domain not authorized"
```bash
# Solução:
1. Acesse Firebase Console → Authentication → Settings
2. Adicione seu domínio em "Authorized domains"
3. Para Netlify: adicione seu-site.netlify.app
```

#### ❌ Erro: "Permission denied" no Firestore
```bash
# Solução:
1. Verifique as Security Rules no Firestore
2. Confirme se o usuário está autenticado
3. Ajuste as regras conforme necessário
```

#### ❌ CORS errors
```bash
# Solução:
1. Use um servidor local (não file://)
2. Execute: npx serve . 
3. Acesse via http://localhost:3000
```

### 📊 Logs e Debug

```javascript
// Adicione ao console do navegador para debug:
console.log('Firebase Config:', window.firebaseConfig);
console.log('User Auth:', window.auth?.currentUser);
console.log('Environment:', import.meta.env);
```

## 🚀 Próximos Passos

### Melhorias Recomendadas

1. **🧪 Testes**
   ```bash
   # Adicionar testes unitários
   npm install --save-dev jest
   npm install --save-dev @testing-library/dom
   ```

2. **📱 PWA (Progressive Web App)**
   - Service Worker para offline
   - Manifest.json para instalação
   - Cache strategy

3. **⚡ Performance**
   - Lazy loading de módulos
   - Compression no Netlify
   - Image optimization

4. **🔄 CI/CD**
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to Netlify
   on: [push]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: netlify/actions/cli@master
   ```

5. **📈 Monitoramento**
   - Error tracking (Sentry)
   - Performance monitoring
   - User analytics

### Recursos Adicionais

- 📖 [Firebase Documentation](https://firebase.google.com/docs)
- 🌐 [Netlify Documentation](https://docs.netlify.com)
- 🔒 [Web Security Guidelines](https://owasp.org/www-project-top-ten/)
- ⚡ [Web Performance Best Practices](https://web.dev/performance/)

## 📞 Suporte

### 🆘 Precisa de Ajuda?

1. **Documentação**: Consulte este README.md
2. **Issues**: Abra uma issue no GitHub
3. **Firebase**: [Console do Firebase](https://console.firebase.google.com)
4. **Netlify**: [Dashboard do Netlify](https://app.netlify.com)

### 🤝 Contribuição

1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça commit das alterações
4. Abra um Pull Request

---

**🎉 Projeto pronto para produção com segurança enterprise!**

Made with ❤️ for secure web applications