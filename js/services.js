// MÓDULO: SERVIÇOS DA APLICAÇÃO (DADOS, AUTH, MODAIS, ETC.)

import { auth, db } from './firebase-config.js';
import { DOM, getUserStatus } from './utils.js';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    deleteDoc, 
    writeBatch, 
    Timestamp, 
    updateDoc, 
    setDoc, 
    getDoc, 
    serverTimestamp, 
    query, 
    orderBy, 
    limit, 
    where, 
    getDocs, 
    arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- SERVIÇO DE AUTENTICAÇÃO ---
export const AuthService = {
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signOut: async () => {
        // Idealmente, o status de presença seria atualizado aqui também
        return firebaseSignOut(auth);
    },
    listenToAuthChanges: (callback) => {
        return onAuthStateChanged(auth, async (user) => {
            if (user) {
                let role = 'auditor'; // Papel padrão
                try {
                    const roleDocRef = doc(db, 'permissao', user.uid);
                    const roleDoc = await getDoc(roleDocRef);
                    if (roleDoc.exists()) {
                        role = roleDoc.data().role;
                    }
                } catch (error) {
                    console.error("Erro ao buscar cargo, usando 'auditor'.", error);
                }
                const userData = { uid: user.uid, email: user.email, isAdmin: (role === 'administrador' || role === 'desenvolvedor'), role };
                callback(userData);
            } else {
                callback(null);
            }
        });
    },
    getFriendlyErrorMessage: (error) => {
        switch (error.code) {
            case 'auth/user-not-found': case 'auth/invalid-credential': return 'Credenciais inválidas.';
            case 'auth/wrong-password': return 'Senha incorreta.';
            case 'auth/invalid-email': return 'O formato do e-mail é inválido.';
            case 'auth/email-already-in-use': return 'Este e-mail já está em uso.';
            default: return 'Ocorreu um erro. Tente novamente.';
        }
    }
};

// --- SERVIÇO DE DADOS (FIRESTORE) ---
export const DataService = {
    listenToCollection: (collectionName, callback) => {
        const path = collectionName === 'permissao' ? collectionName : `artifacts/gcontroledehgutl/public/data/${collectionName}`;
        const q = query(collection(db, path));
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            callback(data);
        }, (error) => {
            console.error(`Erro ao ouvir ${collectionName}:`, error);
            DOM.showToast(`Falha ao carregar dados de ${collectionName}.`, 'error');
        });
    },
    addDocument: (collectionName, data) => {
        const path = `artifacts/gcontroledehgutl/public/data/${collectionName}`;
        return addDoc(collection(db, path), data);
    },
    updateDocument: (collectionName, docId, data, customPath = null) => {
        const path = customPath || `artifacts/gcontroledehgutl/public/data/${collectionName}`;
        return updateDoc(doc(db, path, docId), data);
    },
    deleteDocument: (collectionName, docId, customPath = null) => {
        const path = customPath || `artifacts/gcontroledehgutl/public/data/${collectionName}`;
        return deleteDoc(doc(db, path, docId));
    },
    saveRecordAndUpdateStock: (recordData, partsToUpdate) => {
        const batch = writeBatch(db);
        const historyRef = doc(collection(db, `artifacts/gcontroledehgutl/public/data/historico`));
        batch.set(historyRef, recordData);
        partsToUpdate.forEach(part => {
            const stockRef = doc(db, `artifacts/gcontroledehgutl/public/data/estoque`, part.id);
            batch.update(stockRef, { qtd: part.newQty });
        });
        return batch.commit();
    }
};

// --- SERVIÇO DE MODAIS ---
export const ModalService = {
    showConfirmation: ({ title, message, onConfirm }) => {
        const modalHtml = `
        <div id="confirmationModal" class="modal-overlay active">
            <div class="modal-content p-6 text-center">
                <h3 class="text-xl font-bold mb-4">${title}</h3>
                <p class="mb-6 text-gray-600">${message}</p>
                <div class="flex justify-center gap-4">
                    <button id="modal-btn-cancel" class="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button id="modal-btn-confirm" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirmar</button>
                </div>
            </div>
        </div>`;
        DOM.render('#modal-container', modalHtml);
        DOM.qs('#modal-btn-cancel').addEventListener('click', () => ModalService.close());
        DOM.qs('#modal-btn-confirm').addEventListener('click', () => {
            onConfirm();
            ModalService.close();
        });
    },
    // Adicione aqui todos os outros métodos do ModalService do seu arquivo original
    // showRecipientModal, showAssistant, showQRCode, etc.
    // ...
    close: () => {
        DOM.render('#modal-container', '');
    }
};

// --- SERVIÇO DE NOTIFICAÇÕES ---
export const NotificationService = {
    notifications: [],
    requestPermission: async () => {
        if ("Notification" in window && Notification.permission !== "granted") {
            await Notification.requestPermission();
        }
    },
    checkAllNotifications: (data) => {
        // Lógica completa de checkAllNotifications aqui
        return []; // Retorno de exemplo
    }
};
