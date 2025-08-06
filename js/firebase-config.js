// =================================================================================
// MÓDULO: CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// IMPORTANTE: Para produção no Netlify, configure estas variáveis como variáveis de ambiente:
// VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc.
// e substitua os valores abaixo por process.env.VITE_FIREBASE_API_KEY, etc.
const firebaseConfig = {
    apiKey: "SUA_API_KEY", // Substituir por variável de ambiente no Netlify
    authDomain: "SUA_AUTH_DOMAIN", // Substituir por variável de ambiente no Netlify
    projectId: "SUA_PROJECT_ID", // Substituir por variável de ambiente no Netlify
    storageBucket: "SUA_STORAGE_BUCKET", // Substituir por variável de ambiente no Netlify
    messagingSenderId: "SUA_MESSAGING_SENDER_ID", // Substituir por variável de ambiente no Netlify
    appId: "SUA_APP_ID" // Substituir por variável de ambiente no Netlify
};

// Para desenvolvimento local, você pode usar os valores reais temporariamente:
// Descomente as linhas abaixo e comente o objeto acima para desenvolvimento local
/*
const firebaseConfig = {
    apiKey: "AIzaSyAdCrzegeV4i3tCVzaiDKqzRljtZA7Dh2A",
    authDomain: "gcontroledehgutl.firebaseapp.com",
    projectId: "gcontroledehgutl",
    storageBucket: "gcontroledehgutl.appspot.com",
    messagingSenderId: "520957417418",
    appId: "1:520957417418:web:b9694a3ef04d0477826133"
};
*/

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Constantes da aplicação
export const HYGIENE_DEADLINE_DAYS = 120; // 4 meses