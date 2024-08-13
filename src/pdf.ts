import { parseEDNString } from "edn-data";
import Highlight from "./types/highlight";
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;


export async function getPdfAndEdnByPdfPath(pdfPath: string): Promise<{ pdf: Blob; edn: any } | null> {
    const fileInput = document.createElement("input");
    const btn = document.createElement("button");

    fileInput.type = "file";
    fileInput.style.display = "none";
    fileInput.webkitdirectory = true;
    document.body.appendChild(fileInput);

    // Extract filename from file path
    const fileName = pdfPath.split('/').pop()?.split('.')[0];
    if (!fileName) {
        console.error("Invalid file path");
        return null;
    }

    const readFile = (file: File): Promise<ArrayBuffer> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target!.result as ArrayBuffer);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    };

    return new Promise((resolve) => {
        fileInput.onchange = async () => {
            const files = Array.from(fileInput.files!);
            const pdfFile = files.find(file => file.name.includes(fileName) && file.name.endsWith('.pdf'));
            const ednFile = files.find(file => file.name.includes(fileName) && file.name.endsWith('.edn'));

            if (pdfFile && ednFile) {
                try {
                    // Process PDF file
                    const pdfArrayBuffer = await readFile(pdfFile);
                    const pdf = new Blob([new Uint8Array(pdfArrayBuffer)], { type: "application/pdf" });

                    // Process EDN file
                    const ednArrayBuffer = await readFile(ednFile);
                    const ednText = new TextDecoder().decode(ednArrayBuffer);
                    const edn = parseEDNString(ednText, { mapAs: "object", keywordAs: "string" }) as { "highlights": [] };

                    resolve({ pdf, edn });
                } catch (error) {
                    console.error("Error reading files:", error);
                    resolve(null);
                }
            } else {
                alert(`Please check if the pdfPath is valid.`);
                resolve(null);
            }

            // Clean up
            document.body.removeChild(fileInput);
            document.body.removeChild(btn);
        };

        btn.style.display = "none";
        document.body.appendChild(btn);
        btn.addEventListener("click", () => {
            fileInput.click();
        });

        // Show alert to user before opening file dialog
        alert(`Select 'assets' folder under your logseq directory.`);

        // Programmatically click the button
        btn.click();
    });
}

export function findUuidOfCurrentLine(line: string) {
    const regex = /\(\((.*?)\)\)/;
    const match = line.match(regex);
    return match ? match[1] : null;
}

export function findHighlightFromEdnByUuid(uuid: string, edn: { "highlights": Highlight[] }) {
    const highlights = edn["highlights"];
    for (const highlight of highlights) {
        if (highlight["id"]["val"] === uuid) {
            return highlight;
        }
    }
    return null;
}

// 이미지 크기를 조정하는 함수
function resizeCanvas(canvas: HTMLCanvasElement, maxArea: number): HTMLCanvasElement {
    let width = canvas.width;
    let height = canvas.height;
    const aspectRatio = width / height;

    // 이미지 면적이 maxArea를 초과하는 경우 크기 조정
    if (width * height > maxArea) {
        width = Math.sqrt(maxArea * aspectRatio);
        height = width / aspectRatio;
    }

    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = width;
    resizedCanvas.height = height;
    const ctx = resizedCanvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height);
    }

    return resizedCanvas;
}

// Canvas를 base64로 변환하는 함수
function canvasToBase64(canvas: HTMLCanvasElement): string {
    const resizedCanvas = resizeCanvas(canvas, 15000);
    return resizedCanvas.toDataURL('image/jpeg').split(',')[1];
}

export async function captureImageFromPDF(pdfBlob: Blob, position: Highlight['position']) {
    const pdf = await pdfjs.getDocument(await pdfBlob.arrayBuffer()).promise;
    const page = await pdf.getPage(position.page);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const { x1, y1, x2, y2 } = position.bounding;
    const width = x2 - x1;
    const height = y2 - y1;
    const extractedCanvas = document.createElement('canvas');
    extractedCanvas.width = width;
    extractedCanvas.height = height;
    const extractedContext = extractedCanvas.getContext('2d');
    if (!extractedContext) return null;
    extractedContext.drawImage(canvas, x1, y1, width, height, 0, 0, width, height);
    return canvasToBase64(extractedCanvas);
}