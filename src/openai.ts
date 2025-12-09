import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import Highlight from "./types/highlight";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { captureImageFromPDF } from "./pdf";
import { HumanMessage } from "@langchain/core/messages";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
import { calculateFileHash, loadVectorStoreFromDB, saveVectorStoreToDB } from "./utils/indexedDB";

// 캐시를 위한 인터페이스 정의
interface VectorStoreCache {
    [key: string]: {
        [embeddingModel: string]: MemoryVectorStore;
    };
}

// 전역 캐시 객체 선언
let vectorStoreCache: VectorStoreCache = {};

export function readOpenAiAPIKey(): string | null {
    return (logseq.settings as any)["openaiApiKey"] ?? logseq.settings?.["openaiApiKey"] ?? null;
}

export function readEmbeddingModelHost(): string | null {
    return (logseq.settings as any)["embeddingModelHost"] ?? logseq.settings?.["embeddingModelHost"];
}

export function readEmbeddingModel(): string {
    return (logseq.settings as any)["embeddingModel"] ?? logseq.settings?.["embeddingModel"] ?? "text-embedding-3-small";
}

export function readLLMModelHost(): string | null {
    return (logseq.settings as any)["llmModelHost"] ?? logseq.settings?.["llmModelHost"];
}

export function readLLMModel(): string {
    return (logseq.settings as any)["llmModel"] ?? logseq.settings?.["llmModel"] ?? "gpt-4o-mini";
}

export function readAPIBaseUrl(): string | null {
    return (logseq.settings as any)["apiBaseUrl"] ?? logseq.settings?.["apiBaseUrl"] ?? null;
}

export async function storePdfOnVectorStore(
    pdf: Blob,
    openaiApiKey: string,
    embeddingModelHost: string | null,
    embeddingModel: string,
    pdfPath: string,
    onProgress?: (message: string) => void
) {
    // 1. Check in-memory cache first
    if (vectorStoreCache[pdfPath] && vectorStoreCache[pdfPath][embeddingModel]) {
        console.log("Using in-memory cached vector store");
        onProgress?.("Using cached data...");
        return vectorStoreCache[pdfPath][embeddingModel];
    }

    const apiBaseUrl = readAPIBaseUrl();
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: openaiApiKey,
        model: embeddingModel,
        configuration: embeddingModelHost ? {
            baseURL: embeddingModelHost,
        } : apiBaseUrl ? {
            baseURL: apiBaseUrl,
        } : undefined
    });

    // 2. Check IndexedDB cache
    const fileHash = await calculateFileHash(pdf);
    const cacheKey = `${fileHash}-${embeddingModel}`;
    
    try {
        onProgress?.("Checking local cache...");
        const cachedVectorStore = await loadVectorStoreFromDB(cacheKey, embeddings);
        if (cachedVectorStore) {
            console.log("Using IndexedDB cached vector store");
            onProgress?.("Loaded from local cache.");
            
            // Update in-memory cache
            if (!vectorStoreCache[pdfPath]) {
                vectorStoreCache[pdfPath] = {};
            }
            vectorStoreCache[pdfPath][embeddingModel] = cachedVectorStore;
            
            return cachedVectorStore;
        }
    } catch (e) {
        console.error("Failed to load from IndexedDB", e);
    }

    console.log("Creating new vector store");
    onProgress?.("Parsing PDF...");
    const loader = new PDFLoader(pdf, {
        pdfjs: () => pdfjs as any,
    });
    const docs = await loader.load()

    onProgress?.(`Embedding ${docs.length} pages...`);
    
    // Process in batches to show progress and avoid timeouts
    const batchSize = 5; // Process 5 pages at a time
    const vectorStore = new MemoryVectorStore(embeddings);
    
    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        const progress = Math.min(i + batchSize, docs.length);
        onProgress?.(`Embedding ${progress}/${docs.length} pages...`);
        
        try {
            await vectorStore.addDocuments(batch);
        } catch (e) {
            console.error("Error embedding batch:", e);
            throw new Error(`Failed to embed pages ${i + 1}-${progress}. Please check your API key and connection.`);
        }
    }

    // 3. Save to in-memory cache
    if (!vectorStoreCache[pdfPath]) {
        vectorStoreCache[pdfPath] = {};
    }
    vectorStoreCache[pdfPath][embeddingModel] = vectorStore;

    // 4. Save to IndexedDB
    try {
        onProgress?.("Saving to local cache...");
        await saveVectorStoreToDB(cacheKey, vectorStore);
        console.log("Saved vector store to IndexedDB");
    } catch (e) {
        console.error("Failed to save to IndexedDB", e);
    }

    return vectorStore;
}

export async function invoke(
    inputData: Highlight | string,
    pdf: Blob,
    openaiApiKey: string,
    llmModelHost: string | null,
    llmModel: string,
    vectorStore: MemoryVectorStore
) {
    const apiBaseUrl = readAPIBaseUrl();
    const llm = new ChatOpenAI({
        openAIApiKey: openaiApiKey,
        model: llmModel,
        configuration: llmModelHost ? {
            baseURL: llmModelHost,
        } : apiBaseUrl ? {
            baseURL: apiBaseUrl,
        } : undefined
    });

    // Check if inputData is a string (free text question) or Highlight object
    const isHighlight = typeof inputData !== 'string';
    
    if (!isHighlight || (isHighlight && !(inputData as Highlight).content.image)) {
        let promptTemplate = ChatPromptTemplate.fromTemplate(
            (logseq.settings as any)["promptTemplateForText"] ?? logseq.settings?.["promptTemplateForText"] ?? `Context:\n{context}\n---\nExplain following concept and write in markdown format: {input}`
        );
        
        let input = "";
        if (typeof inputData === 'string') {
            input = inputData;
        } else {
            input = (inputData as Highlight).content.text;
        }

        const combineDocsChain = await createStuffDocumentsChain({
            llm,
            prompt: promptTemplate,
        });
        const retriever = vectorStore.asRetriever();
        const retrievalChain = await createRetrievalChain({
            combineDocsChain,
            retriever,
        });

        if (!input) {
            return null;
        }

        try {
            return retrievalChain.invoke({
                input: input,
            });
        } catch (e) {
            console.log(e);
            logseq.UI.showMsg(e as any, "error");
            return null;
        }
    } else {
        const highlight = inputData as Highlight;
        // with image
        // directly using the image as the query for vector store is not supported (TODO)
        const image = await captureImageFromPDF(pdf, highlight.position);
        if (!image) {
            logseq.UI.showMsg("Failed to capture image from PDF", "error");
            return null;
        }

        console.log(image);

        // template for image description
        const imageDescriptionMessage = new HumanMessage({
            content: [
                {
                    "type": "text",
                    "text": "Please describe the image below:",
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": image,
                    }
                },
            ]
        });

        // ask the model to describe the image
        const apiBaseUrl = readAPIBaseUrl();
        const llm = new ChatOpenAI({
            openAIApiKey: openaiApiKey,
            model: llmModel,
            configuration: llmModelHost ? {
                baseURL: llmModelHost,
            } : apiBaseUrl ? {
                baseURL: apiBaseUrl,
            } : undefined
        });

        const imageDescription = await llm.invoke([imageDescriptionMessage]);
        console.log(`Image description: ${imageDescription.content}`);

        // query the vector store with the image description
        const promptTemplate = ChatPromptTemplate.fromTemplate(
            (logseq.settings as any)["promptTemplateForImage"] ?? logseq.settings?.["promptTemplateForImage"] ?? `Context:\n{context}\n---\nExplain following described image and write in markdown format: {input}`
        );

        const combineDocsChain = await createStuffDocumentsChain({
            llm,
            prompt: promptTemplate,
        });

        const retriever = vectorStore.asRetriever();

        const retrievalChain = await createRetrievalChain({
            combineDocsChain,
            retriever,
        });

        try {
            return retrievalChain.invoke({
                input: imageDescription.content as string,
            });
        } catch (e) {
            console.log(e);
            logseq.UI.showMsg(e as any, "error");
            return null;
        }
    }
}
