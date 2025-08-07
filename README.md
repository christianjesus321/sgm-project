# S.G.M - Sistema de Gestão de Máscaras

Sistema fechado para gestão de máscaras com autenticação Firebase e interface responsiva.

## 🚀 Configuração Rápida

### 1. Configurar Firebase
```bash
# Copie o arquivo de exemplo
cp env.example .env

# Edite com suas credenciais do Firebase
# Obtenha em: https://console.firebase.google.com/
```

### 2. Executar Localmente
```bash
# Use um servidor local
npx serve .
# ou Live Server no VSCode
```

### 3. Deploy no Netlify
1. Conecte seu repositório GitHub ao Netlify
2. Configure as variáveis de ambiente no painel do Netlify
3. Deploy automático a cada push

## 📁 Estrutura do Projeto

```
novo SGM/
├── index.html              # Página principal
├── style.css               # Estilos
├── js/
│   ├── main.js             # Aplicação principal
│   ├── firebase-config.js  # Configuração Firebase
│   ├── services.js         # Serviços de dados
│   ├── utils.js            # Utilitários
│   └── views.js            # Componentes de tela
├── env.example             # Template de variáveis
└── netlify.toml           # Configuração Netlify
```

## 🔧 Variáveis de Ambiente

Configure no Netlify ou arquivo `.env`:

```
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-project-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789
```

## 🔒 Segurança Firebase

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        request.auth.token.email in ['admin@empresa.com'];
    }
    
    match /artifacts/gcontroledehgutl/public/data/{collection}/{document} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

### Authentication
- Configure domínios autorizados no Firebase Console
- Ative Email/Password authentication
- Configure as regras de segurança acima

## 🐛 Troubleshooting

### Erro de Configuração Firebase
- Verifique se todas as variáveis estão configuradas
- Confirme se o domínio está autorizado no Firebase

### Erro de Permissão
- Verifique as Firestore Rules
- Confirme se o usuário está autenticado

### CORS Errors
- Use servidor local (não file://)
- Execute: `npx serve .`

## 📞 Suporte

Para problemas técnicos, verifique:
1. Console do navegador para erros
2. Firebase Console para logs
3. Netlify Dashboard para deploy

## 🔄 Git e GitHub

O projeto já está configurado com Git e conectado ao GitHub:
- Repositório: https://github.com/christianjesus321/sgm-project.git
- Deploy automático no Netlify configurado
- Variáveis de ambiente configuradas no Netlify