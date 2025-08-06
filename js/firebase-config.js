// =================================================================================
// MÓDULO: CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Função para obter variáveis de ambiente (funciona tanto no Netlify quanto localmente)
const getEnvVar = (name, fallback = null) => {
    // No Netlify, as variáveis são injetadas globalmente em import.meta.env
    if (typeof import !== 'undefined' && import.meta && import.meta.env) {
        return import.meta.env[name] || fallback;
    }
    
    // Para desenvolvimento local sem build tool, pode usar um objeto global
    if (typeof window !== 'undefined' && window.ENV) {
        return window.ENV[name] || fallback;
    }
    
    // Fallback para desenvolvimento
    return fallback;
};

// Configuração segura do Firebase usando variáveis de ambiente
const firebaseConfig = {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'SUA_API_KEY'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'SUA_AUTH_DOMAIN'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'SUA_PROJECT_ID'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'SUA_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', 'SUA_MESSAGING_SENDER_ID'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID', 'SUA_APP_ID')
};

// Validação das configurações
const validateConfig = () => {
    const requiredVars = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingVars = requiredVars.filter(key => 
        !firebaseConfig[key] || firebaseConfig[key].startsWith('SUA_')
    );
    
    if (missingVars.length > 0) {
        console.error('⚠️ CONFIGURAÇÃO FIREBASE INCOMPLETA!');
        console.error('Variáveis não configuradas:', missingVars);
        console.error('');
        console.error('📋 INSTRUÇÕES:');
        console.error('1. Copie o arquivo env.example para .env');
        console.error('2. Preencha as variáveis com suas credenciais do Firebase');
        console.error('3. Para Netlify, configure as variáveis no painel de ambiente');
        console.error('');
        console.error('🔗 Mais informações: consulte o README.md');
        
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Firebase não configurado corretamente para produção');
        }
    }
};

// Valida a configuração ao carregar
validateConfig();

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Constantes da aplicação
export const HYGIENE_DEADLINE_DAYS = 120; // 4 meses