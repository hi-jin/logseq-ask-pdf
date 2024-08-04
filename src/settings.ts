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
        }
    ];
    logseq.useSettingsSchema(settings);
};