// =================================================================================
// SERVIÇOS DE AUTENTICAÇÃO E DADOS
// =================================================================================

import { auth, db } from './firebase-config.js';
import { 
    collection,
    onSnapshot,
    addDoc,
    doc,
    deleteDoc,
    updateDoc,
    getDoc,
    setDoc,
    serverTimestamp,
    query,
    orderBy,
    where,
    writeBatch,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================================
// SERVIÇO DE DADOS
// =================================================================================
export const DataService = {
    listenToCollection: (collectionName, callback, customQuery = null) => {
        const path = collectionName === 'permissao' ? collectionName : `artifacts/gcontroledehgutl/public/data/${collectionName}`;
        const finalQuery = customQuery ? customQuery : collection(db, path);
        return onSnapshot(finalQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            if (!['userStatus'].includes(collectionName)) {
                // Cache offline se disponível
                if (window.OfflineService) {
                    window.OfflineService.cacheCollection(collectionName, data);
                }
            }
            callback(data);
        }, async (error) => {
            console.error(`Erro ao ouvir a coleção ${collectionName}:`, error);
            // Tenta buscar dados do cache offline se disponível
            if (window.OfflineService) {
                const cachedData = await window.OfflineService.getCollection(collectionName);
                callback(cachedData);
                if (window.DOM) {
                    window.DOM.showToast(`Falha ao carregar dados de ${collectionName}. Exibindo dados locais.`, 'error');
                }
            } else {
                callback([]);
            }
        });
    },
    
    async addDocument(collectionName, data, customPath = null) {
        if (!navigator.onLine && window.OfflineService) {
            const tempId = `offline_${crypto.randomUUID()}`;
            const payload = { ...data, id: tempId, pendingSync: true };
            await window.OfflineService.addToSyncQueue(collectionName, 'add', tempId, data);
            return payload;
        }
        const path = customPath || `artifacts/gcontroledehgutl/public/data/${collectionName}`;
        const docRef = await addDoc(collection(db, path), data);
        return { ...data, id: docRef.id };
    },
    
    async updateDocument(collectionName, docId, data, customPath = null) {
        if (!navigator.onLine && window.OfflineService) {
            await window.OfflineService.addToSyncQueue(collectionName, 'update', docId, data);
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
        if (!navigator.onLine && customPath !== 'permissao' && window.OfflineService) {
            await window.OfflineService.addToSyncQueue(collectionName, 'delete', docId, {});
            return { id: docId, pendingSync: true };
        }
        await deleteDoc(doc(db, path, docId));
        return { id: docId };
    },
    
    async saveRecordAndUpdateStock(recordData, partsToUpdate) {
        if (!navigator.onLine) {
            if (window.DOM) {
                window.DOM.showToast('Função indisponível offline. As alterações não serão salvas.', 'error');
            }
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