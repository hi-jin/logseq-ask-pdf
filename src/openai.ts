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
            model: "gpt-4o-mini",
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
