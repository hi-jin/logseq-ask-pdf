import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";

const DB_NAME = "logseq-ask-pdf-db";
const STORE_NAME = "vector-stores";
const DB_VERSION = 1;

interface StoredVectorStore {
    id: string; // pdfPath + embeddingModel
    vectors: number[][];
    documents: Document[];
    timestamp: number;
}

export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", event);
            reject("IndexedDB error");
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
    });
}

export async function saveVectorStoreToDB(
    key: string,
    vectorStore: MemoryVectorStore
): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // MemoryVectorStore exposes memoryVectors but it's protected/private in TS definition
        // We need to access it to serialize.
        // In LangChain JS MemoryVectorStore, the data is stored in `memoryVectors`
        // Each item has { content: string, embedding: number[], metadata: object }
        
        // However, MemoryVectorStore doesn't have a direct export method that gives us everything easily for reconstruction
        // without re-embedding.
        // But we can access `memoryVectors` by casting to any.
        
        const memoryVectors = (vectorStore as any).memoryVectors;
        
        // We need to store documents and vectors.
        // Actually MemoryVectorStore.fromDocuments creates vectors from documents.
        // If we want to avoid re-embedding, we need to save the embeddings.
        // MemoryVectorStore.fromVectors(vectors, documents, embeddings) is what we want to use for restoration.
        
        const vectors = memoryVectors.map((v: any) => v.embedding);
        const documents = memoryVectors.map((v: any) => new Document({
            pageContent: v.content,
            metadata: v.metadata,
        }));

        const data: StoredVectorStore = {
            id: key,
            vectors,
            documents,
            timestamp: Date.now(),
        };

        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function loadVectorStoreFromDB(
    key: string,
    embeddings: any
): Promise<MemoryVectorStore | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = async () => {
            const data = request.result as StoredVectorStore;
            if (!data) {
                resolve(null);
                return;
            }

            try {
                // Reconstruct MemoryVectorStore without re-embedding
                const vectorStore = new MemoryVectorStore(embeddings);
                await vectorStore.addVectors(data.vectors, data.documents);
                resolve(vectorStore);
            } catch (e) {
                console.error("Error reconstructing vector store:", e);
                resolve(null);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

export async function clearVectorStoreFromDB(key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function clearAllVectorStoresFromDB(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
export async function calculateFileHash(file: Blob): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}