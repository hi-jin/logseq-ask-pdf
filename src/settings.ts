import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";
import { ChatOpenAI } from "@langchain/openai";
import { clearAllVectorStoresFromDB } from "./utils/indexedDB";

export default function settingUI() {
    /* https://logseq.github.io/plugins/types/SettingSchemaDesc.html */
    const settings: SettingSchemaDesc[] = [
        {
            key: "openaiApiKey",
            type: "string",
            title: "API Key",
            description: "Enter your OpenAI or OpenRouter API Key",
            default: ""
        },
        {
            key: "apiBaseUrl",
            type: "string",
            title: "API Base URL",
            description: "Base URL for the API. Leave empty for OpenAI default. For OpenRouter, use 'https://openrouter.ai/api/v1'",
            default: ""
        },
        {
            key: "checkApiKey",
            type: "boolean",
            title: "Check API Key",
            description: "Click to verify if your API key is valid.",
            default: false,
        },
        {
            key: "promptTemplateForText",
            type: "string",
            title: "Prompt Template for Text",
            description: "Prompt Template for text highlights.\n{context} and {input} are placeholders for the context and input text.",
            default: `Context:\n{context}\n---\nExplain following concept and write in markdown format: {input}`,
            inputAs: "textarea",
        },
        {
            key: "promptTemplateForImage",
            type: "string",
            title: "Prompt Template for Image",
            description: "Prompt Template for image highlights.\n{context} and {input} are placeholders for the context and input image.",
            default: `Context:\n{context}\n---\nExplain following described image and write in markdown format: {input}`,
            inputAs: "textarea",
        },
        {
            key: "embeddingModelHost",
            type: "string",
            title: "Embedding Model Host",
            description: "Host URL for the embedding model API",
            default: null
        },
        {
            key: "embeddingModel",
            type: "string",
            title: "Embedding Model",
            description: "Name of the embedding model to use",
            default: "text-embedding-3-small"
        },
        {
            key: "llmModelHost",
            type: "string",
            title: "LLM Model Host",
            description: "Host URL for the LLM API",
            default: null
        },
        {
            key: "llmModel",
            type: "string",
            title: "LLM Model",
            description: "Name of the LLM model to use",
            default: "gpt-4o-mini"
        },
        {
            key: "clearCache",
            type: "boolean",
            title: "Clear Vector Store Cache",
            description: "Clear all cached vector stores from IndexedDB. This will force re-indexing of all PDFs.",
            default: false,
        }
    ];
    logseq.useSettingsSchema(settings);

    logseq.onSettingsChanged(async (newSettings, oldSettings) => {
        if (newSettings.clearCache === true && oldSettings.clearCache === false) {
            await clearAllVectorStoresFromDB();
            logseq.updateSettings({ clearCache: false });
            logseq.UI.showMsg("Vector store cache cleared successfully.");
        }

        if (newSettings.checkApiKey === true && oldSettings.checkApiKey === false) {
            logseq.updateSettings({ checkApiKey: false });
            const apiKey = newSettings.openaiApiKey;
            if (!apiKey) {
                logseq.UI.showMsg("Please enter an OpenAI API key first.", "error");
                return;
            }

            try {
                const configuration = newSettings.apiBaseUrl ? {
                    baseURL: newSettings.apiBaseUrl,
                } : undefined;

                const model = new ChatOpenAI({
                    openAIApiKey: apiKey,
                    modelName: "gpt-3.5-turbo", // Use a cheap model for checking
                    maxTokens: 5,
                    configuration,
                });
                await model.invoke("Hello");
                logseq.UI.showMsg("API Key is valid!", "success");
            } catch (e: any) {
                console.error(e);
                logseq.UI.showMsg(`API Key check failed: ${e.message}`, "error");
            }
        }
    });
}