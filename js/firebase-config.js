// =================================================================================
// MÓDULO: CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Função para obter variáveis de ambiente
const getEnvVar = (name, fallback = null) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[name] || fallback;
    }
    
    if (typeof window !== 'undefined' && window.ENV) {
        return window.ENV[name] || fallback;
    }
    
    return fallback;
};

// Configuração do Firebase
const firebaseConfig = {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID')
};

// Validação das configurações
const validateConfig = () => {
    const requiredVars = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingVars = requiredVars.filter(key => 
        !firebaseConfig[key] || firebaseConfig[key].startsWith('sua_')
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
        
        throw new Error('Configuração Firebase incompleta. Verifique as variáveis de ambiente.');
    }
};

// Valida a configuração ao carregar
validateConfig();

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Constantes da aplicação
export const HYGIENE_DEADLINE_DAYS = 120; // 4 meses