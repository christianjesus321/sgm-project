// =================================================================================
// MÓDULO: SERVIÇOS DE COMUNICAÇÃO COM BACKEND (Firebase)
// =================================================================================
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot, addDoc, doc, deleteDoc, writeBatch, Timestamp, updateDoc, setDoc, getDoc, serverTimestamp, query, where, getDocs, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { OfflineService } from './utils.js'; // Importe o OfflineService
import { DOM } from './utils.js'; // Importe o DOM para os toasts

export const AuthService = {
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signOut: async () => {
        // PresenceService will be called from main.js before signOut
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
                    } else {
                        console.warn(`Documento de permissão não encontrado para UID: ${user.uid}. Atribuindo cargo de 'auditor'.`);
                    }
                } catch (error) {
                    console.error("Erro ao buscar cargo do usuário. Atribuindo cargo de 'auditor'.", error);
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
            case 'auth/user-not-found': case 'auth/invalid-credential': return 'Credenciais inválidas. Verifique o e-mail e a senha.';
            case 'auth/wrong-password': return 'Senha incorreta. Por favor, tente novamente.';
            case 'auth/invalid-email': return 'O formato do e-mail é inválido.';
            case 'auth/email-already-in-use': return 'Este e-mail já está em uso por outra conta.';
            default: return 'Ocorreu um erro. Tente novamente.';
        }
    }
};

export const DataService = {
    listenToCollection: (collectionName, callback, customQuery = null) => {
        const path = collectionName === 'permissao' ? collectionName : `artifacts/gcontroledehgutl/public/data/${collectionName}`;
        const finalQuery = customQuery ? customQuery : collection(db, path);
        return onSnapshot(finalQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            if (!['userStatus'].includes(collectionName)) {
                OfflineService.cacheCollection(collectionName, data);
            }
            callback(data);
        }, async (error) => {
            console.error(`Erro ao ouvir a coleção ${collectionName}:`, error);
            const cachedData = await OfflineService.getCollection(collectionName);
            callback(cachedData);
            DOM.showToast(`Falha ao carregar dados de ${collectionName}. Exibindo dados locais.`, 'error');
        });
    },
    async addDocument(collectionName, data, customPath = null) {
        if (!navigator.onLine) {
            const tempId = `offline_${crypto.randomUUID()}`;
            const payload = { ...data, id: tempId, pendingSync: true };
            await OfflineService.addToSyncQueue(collectionName, 'add', tempId, data);
            return payload;
        }
        const path = customPath || `artifacts/gcontroledehgutl/public/data/${collectionName}`;
        const docRef = await addDoc(collection(db, path), data);
        return { ...data, id: docRef.id };
    },
    async updateDocument(collectionName, docId, data, customPath = null) {
         if (!navigator.onLine) {
            if(data.observacoes && data.observacoes.isUnion) {
                await OfflineService.addToSyncQueue(collectionName, 'update', docId, data);
            } else {
                await OfflineService.addToSyncQueue(collectionName, 'update', docId, data);
            }
            return { ...data, id: docId, pendingSync: true };
        }
        if (data.observacoes && data.observacoes.isUnion) {
             const path = customPath || `artifacts/gcontroledehgutl/public/data/${collectionName}`;
             await updateDoc(doc(db, path, docId), { observacoes: arrayUnion(...data.observacoes.elements) });
        } else {
            const path = customPath || `artifacts/gcontroledehgutl/public/data/${collectionName}`;
            await updateDoc(doc(db, path, docId), data);
        }

        return { ...data, id: docId };
    },
    async deleteDocument(collectionName, docId, customPath = null) {
        const path = customPath ? customPath : `artifacts/gcontroledehgutl/public/data/${collectionName}`;
        if (!navigator.onLine && customPath !== 'permissao') { // Ações de permissão não devem ser feitas offline
            await OfflineService.addToSyncQueue(collectionName, 'delete', docId, {});
            return { id: docId, pendingSync: true };
        }
        await deleteDoc(doc(db, path, docId));
        return { id: docId };
    },
    async saveRecordAndUpdateStock(recordData, partsToUpdate) {
        if (!navigator.onLine) {
            DOM.showToast('Função indisponível offline. As alterações não serão salvas.', 'error');
            throw new Error("Batch operations not supported offline in this version.");
        }
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