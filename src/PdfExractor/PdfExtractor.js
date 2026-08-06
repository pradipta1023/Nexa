import * as pdfJsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import path from 'path';

class PdfExtractor {

  async #getPageInfo(pageNumber, pdf) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(chunk => chunk.str || "\n").join(" ");

    return { text, pageNumber };
  }
  async extract({ fileName, pdfData }) {
    if (!fileName && !pdfData) throw new Error("Filename or pdfData must be provided");
    try {
      const source = pdfData ? { data: new Uint8Array(pdfData) } : { url: fileName };
      source.standardFontDataUrl = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/';
      const loadingTask = pdfJsLib.getDocument(source);
      const pdf = await loadingTask.promise;
      const pages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const pageInfo = await this.#getPageInfo(pageNumber, pdf);
        pages.push(pageInfo);
      }

      return pages;
    } catch (error) {
      throw new Error(`Failed to extract PDF: ${error.message}`);
    }
  }
}

export default PdfExtractor;