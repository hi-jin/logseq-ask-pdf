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

export async function storePdfOnVectorStore(pdf: Blob, openaiApiKey: string, embeddingModelHost: string | null, embeddingModel: string, pdfPath: string) {
    // 캐시에서 벡터 스토어 확인
    if (vectorStoreCache[pdfPath] && vectorStoreCache[pdfPath][embeddingModel]) {
        console.log("Using cached vector store");
        return vectorStoreCache[pdfPath][embeddingModel];
    }

    console.log("Creating new vector store");
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: openaiApiKey,
        model: embeddingModel,
        configuration: embeddingModelHost ? {
            baseURL: embeddingModelHost,
        } : undefined
    });
    const loader = new PDFLoader(pdf, {
        pdfjs: () => pdfjs as any,
    });
    const docs = await loader.load()

    const vectorStore = await MemoryVectorStore.fromDocuments(
        docs,
        embeddings,
    );

    // 캐시에 벡터 스토어 저장
    if (!vectorStoreCache[pdfPath]) {
        vectorStoreCache[pdfPath] = {};
    }
    vectorStoreCache[pdfPath][embeddingModel] = vectorStore;

    return vectorStore;
}

export async function invoke(highlight: Highlight, pdf: Blob, openaiApiKey: string, llmModelHost: string | null, llmModel: string, vectorStore: MemoryVectorStore) {
    const llm = new ChatOpenAI({
        openAIApiKey: openaiApiKey,
        model: llmModel,
        configuration: llmModelHost ? {
            basePath: llmModelHost,
        } : undefined
    });

    if (!highlight.content.image) {
        let promptTemplate = ChatPromptTemplate.fromTemplate(
            (logseq.settings as any)["promptTemplateForText"] ?? logseq.settings?.["promptTemplateForText"] ?? `Context:\n{context}\n---\nExplain following concept and write in markdown format: {input}`
        );
        let input = highlight.content.text;

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
        const llm = new ChatOpenAI({
            openAIApiKey: openaiApiKey,
            model: llmModel,
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
