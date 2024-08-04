import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import Highlight from "./types/highlight";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { captureImageFromPDF } from "./pdf";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

export function readOpenAiAPIKey(): string | null {
    const openaiApiKey = (logseq.settings as any)["openaiApiKey"] ?? logseq.settings?.["openaiApiKey"] ?? null;

    return openaiApiKey;
}

export async function storePdfOnVectorStore(pdf: Blob, openaiApiKey: string) {
    const embeddings = new OpenAIEmbeddings({ openAIApiKey: openaiApiKey, model: "text-embedding-3-small" });
    const loader = new PDFLoader(pdf, {
        pdfjs: () => pdfjs as any,
    });
    const docs = await loader.load()

    const vectorStore = await MemoryVectorStore.fromDocuments(
        docs,
        embeddings,
    );

    return vectorStore;
}

export async function invoke(highlight: Highlight, pdf: Blob, openaiApiKey: string, vectorStore: MemoryVectorStore) {
    const llm = new ChatOpenAI({
        openAIApiKey: openaiApiKey,
        model: "gpt-4o-mini",
    });

    let promptTemplate, input;
    if (!highlight.content.image) {
        promptTemplate = ChatPromptTemplate.fromTemplate(
            `Context:\n{context}\n---\nExplain following concept and write in markdown format: {input}`
        );
        input = highlight.content.text;
    } else {
        promptTemplate = ChatPromptTemplate.fromMessages([
            [
                "human",
                [
                    {
                        type: "text",
                        text: `Context:\n{context}\n---\nExplain following concept and write in markdown format.`,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            "url": "data:image/jpeg;base64,{input}",
                            "detail": "low",
                        },
                    },
                ],
            ]
        ]);
        input = await captureImageFromPDF(pdf, highlight.position);
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
}
