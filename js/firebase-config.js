// MÓDULO: CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Suas credenciais do Firebase.
const firebaseConfig = {
    apiKey: "AIzaSyAdCrzegeV4i3tCVzaiDKqzRljtZA7Dh2A",
    authDomain: "gcontroledehgutl.firebaseapp.com",
    projectId: "gcontroledehgutl",
    storageBucket: "gcontroledehgutl.appspot.com",
    messagingSenderId: "520957417418",
    appId: "1:520957417418:web:b9694a3ef04d0477826133"
};

// Inicializa o app e exporta os serviços para outros arquivos usarem
const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
