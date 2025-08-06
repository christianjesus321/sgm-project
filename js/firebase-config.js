// =================================================================================
// MÓDULO: CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// =================================================================================
console.log('🔥 SGM Debug: firebase-config.js carregando...');

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log('🔥 SGM Debug: Firebase imports carregados');

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

// Configuração do Firebase - TEMPORÁRIA PARA TESTE
// Em produção, use variáveis de ambiente
const firebaseConfig = {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyAdCrzegeV4i3tCVzaiDKqzRljtZA7Dh2A'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'gcontroledehgutl.firebaseapp.com'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'gcontroledehgutl'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'gcontroledehgutl.appspot.com'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '520957417418'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID', '1:520957417418:web:b9694a3ef04d0477826133')
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
        
        // Removido throw para permitir execução em desenvolvimento
        console.warn('⚠️ Continuando com configuração padrão para desenvolvimento...');
    }
};

// Valida a configuração ao carregar
validateConfig();

console.log('🔥 SGM Debug: Inicializando Firebase App...');
const firebaseApp = initializeApp(firebaseConfig);

console.log('🔥 SGM Debug: Configurando Auth e Firestore...');
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

console.log('✅ SGM Debug: Firebase configurado com sucesso!');

// Constantes da aplicação
export const HYGIENE_DEADLINE_DAYS = 120; // 4 meses