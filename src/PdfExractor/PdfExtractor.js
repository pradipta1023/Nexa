import * as pdfJsLib from "pdfjs-dist/legacy/build/pdf.mjs";

class PdfExtractor {

  async #getPageInfo(pageNumber, pdf) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(chunk => chunk.str || "\n").join(" ");

    return { text, pageNumber };
  }
  async extract({ fileName }) {
    if (!fileName) throw new Error("Filename must be provided");
    try {
      const loadingTask = pdfJsLib.getDocument({ url: fileName });
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