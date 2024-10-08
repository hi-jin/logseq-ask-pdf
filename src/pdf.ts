import { parseEDNString } from "edn-data";
import Highlight from "./types/highlight";
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;


export async function getPdfAndEdnByPdfPath(pdfPath: string) {
    const assetPath = await logseq.Assets.makeUrl(pdfPath);
    const filePath = assetPath.replace("assets", "file");
    const ednPath = filePath.replace(".pdf", ".edn");

    let fileResponse;
    let ednResponse;

    try {
        fileResponse = await fetch(filePath);
        ednResponse = await fetch(ednPath);
    } catch {
        return null;
    }

    const fileArrayBuffer = await fileResponse.arrayBuffer();
    const fileUint8Array = new Uint8Array(fileArrayBuffer);
    const pdf = new Blob([fileUint8Array], { type: "application/pdf" });
    const edn = parseEDNString(
        await ednResponse.text(),
        { mapAs: "object", keywordAs: "string" },
    ) as { "highlights": [] };

    return { pdf, edn };
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
    const resizedCanvas = resizeCanvas(canvas, 250000);
    return resizedCanvas.toDataURL('image/jpeg');
}

export async function captureImageFromPDF(pdfBlob: Blob, position: Highlight['position']) {
    const pdf = await pdfjs.getDocument(await pdfBlob.arrayBuffer()).promise;
    const page = await pdf.getPage(position.page);

    // 캡처 시점의 PDF 크기
    const captureWidth = position.bounding.width;
    const captureHeight = position.bounding.height;

    // 렌더링 스케일 (고해상도를 위해)
    const renderScale = 2;

    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    if (!context) return null;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const { x1, y1, x2, y2 } = position.bounding;

    // 상대 좌표 계산
    const relativeX1 = x1 / captureWidth;
    const relativeY1 = y1 / captureHeight;
    const relativeX2 = x2 / captureWidth;
    const relativeY2 = y2 / captureHeight;

    // 렌더링된 캔버스에서의 실제 좌표 계산
    const startX = relativeX1 * viewport.width;
    const startY = relativeY1 * viewport.height; // Y축 좌표 수정
    const width = (relativeX2 - relativeX1) * viewport.width;
    const height = (relativeY2 - relativeY1) * viewport.height;

    const extractedCanvas = document.createElement('canvas');
    extractedCanvas.width = width;
    extractedCanvas.height = height;
    const extractedContext = extractedCanvas.getContext('2d');
    if (!extractedContext) return null;

    // 이미지 추출
    extractedContext.drawImage(
        canvas,
        startX, startY, width, height,
        0, 0, width, height
    );

    return canvasToBase64(extractedCanvas);
}