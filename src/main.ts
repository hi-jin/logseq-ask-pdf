import "@logseq/libs";
import settingUI from "./settings";
import { Buffer } from 'buffer'
import { invoke, readOpenAiAPIKey, storePdfOnVectorStore } from "./openai";
import { findPageProperty } from "./page";
import { findHighlightFromEdnByUuid, findUuidOfCurrentLine, getPdfAndEdnByPdfPath, test } from "./pdf";

globalThis.Buffer = Buffer


async function main() {
    settingUI();

    logseq.Editor.registerSlashCommand(
        "test",
        async function (_) {
            test();
        }
    )

    logseq.Editor.registerSlashCommand(
        "ask pdf",
        async () => {
            const currentBlock = await logseq.Editor.getCurrentBlock();
            if (currentBlock == null) return;

            ///////////////////////////////
            // check openai api key exist in settings
            ///////////////////////////////
            const openaiApiKey = readOpenAiAPIKey();
            if (!openaiApiKey) {
                await logseq.UI.showMsg("OpenAI API key is not set. Please set it in the plugin settings.", "error")
                return
            }

            ///////////////////////////////
            // find pdf
            ///////////////////////////////
            const currentPage = await logseq.Editor.getCurrentPage();
            const pdfPath = findPageProperty(currentPage, "askPdfPath");
            if (!pdfPath) {
                await logseq.UI.showMsg(`Before using the plugin, set 'ask-pdf-path' property.`, "warning")
                return;
            }

            const pdfInfo = await getPdfAndEdnByPdfPath(pdfPath);
            if (!pdfInfo) {
                await logseq.UI.showMsg(`Please check whether the pdfPath is valid.`, "warning");
                return;
            }

            const { pdf, edn } = pdfInfo;

            ///////////////////////////////
            // parse current block & find highlights
            ///////////////////////////////
            const uuid = findUuidOfCurrentLine(currentBlock.content);
            if (!uuid) {
                await logseq.UI.showMsg(`Please check whether the highlight uuid is on current line.`, "warning");
                return;
            }

            const highlight = findHighlightFromEdnByUuid(uuid, edn);
            if (!highlight) {
                await logseq.UI.showMsg(`Please check whether the highlight uuid is on current line.`, "warning");
                return;
            }

            ///////////////////////////////
            // upload pdf to langchain vec db
            ///////////////////////////////
            const vectorStore = await storePdfOnVectorStore(pdf, openaiApiKey);

            ///////////////////////////////
            // ask to gpt
            ///////////////////////////////

            const chatResponse = await invoke(highlight, pdf, openaiApiKey, vectorStore);
            if (!chatResponse) {
                await logseq.UI.showMsg(`Please retry`, "error");
                return;
            }

            ///////////////////////////////
            // write the answer under the current block
            ///////////////////////////////
            for (const line of chatResponse.answer.split("\n")) {
                if (line.trim() === "") continue;
                await logseq.Editor.insertBlock(currentBlock.uuid, line);
            }
        },
    )
}

logseq.ready(main).catch(console.error)