import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";

export default function settingUI() {
    /* https://logseq.github.io/plugins/types/SettingSchemaDesc.html */
    const settings: SettingSchemaDesc[] = [
        {
            key: "openaiApiKey",
            type: "string",
            title: "OpenAI API Key",
            description: "To ask your pdf to gpt, you need to enter the openai api key",
            default: ""
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
        }
    ];
    logseq.useSettingsSchema(settings);
}