import { jest } from "@jest/globals";
const getDocument = jest.fn();
jest.unstable_mockModule("pdfjs-dist/legacy/build/pdf.mjs", () => ({ getDocument }));
const { default: PdfExtractor } = await import("./PdfExtractor.js");

const pdfJsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

describe("PdfExtractor", () => {
  let pdfExtractor;

  beforeEach(() => {
    pdfExtractor = new PdfExtractor();
    jest.clearAllMocks();
  });

  test("should throw when file name is not provided", async () => {
    await expect(pdfExtractor.extract({}))
      .rejects.toThrow("Filename or pdfData must be provided");
  });

  test("should extract text from a single page pdf", async () => {
    const mockPdf = {
      numPages: 1,
      getPage: jest.fn().mockResolvedValue({
        getTextContent: jest.fn().mockResolvedValue({
          items: [
            { str: "React" },
            { str: "" },
            { str: "Hooks" },
          ],
        }),
      }),
    };

    pdfJsLib.getDocument.mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });

    const result = await pdfExtractor.extract({ fileName: "./react.pdf", });

    expect(pdfJsLib.getDocument).toHaveBeenCalledWith(expect.objectContaining({ url: "./react.pdf" }));

    expect(result).toEqual([{ pageNumber: 1, text: "React \n Hooks", },]);
  });

  test("should extract text from multiple pages", async () => {
    const mockPdf = {
      numPages: 3,
      getPage: jest
        .fn()
        .mockResolvedValueOnce({
          getTextContent: jest.fn().mockResolvedValue({
            items: [{ str: "Page One" }],
          }),
        })
        .mockResolvedValueOnce({
          getTextContent: jest.fn().mockResolvedValue({
            items: [{ str: "Page Two" }],
          }),
        })
        .mockResolvedValueOnce({
          getTextContent: jest.fn().mockResolvedValue({
            items: [{ str: "Page Three" }],
          }),
        }),
    };

    pdfJsLib.getDocument.mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });

    const result = await pdfExtractor.extract({
      fileName: "./react.pdf",
    });

    expect(result).toEqual([
      {
        pageNumber: 1,
        text: "Page One",
      },
      {
        pageNumber: 2,
        text: "Page Two",
      },
      {
        pageNumber: 3,
        text: "Page Three",
      },
    ]);

    expect(mockPdf.getPage).toHaveBeenCalledTimes(3);
    expect(mockPdf.getPage).toHaveBeenNthCalledWith(1, 1);
    expect(mockPdf.getPage).toHaveBeenNthCalledWith(2, 2);
    expect(mockPdf.getPage).toHaveBeenNthCalledWith(3, 3);
  });

  test("should throw when pdfjs fails to load pdf", async () => {
    pdfJsLib.getDocument.mockReturnValue({
      promise: Promise.reject(new Error("File not found")),
    });

    await expect(pdfExtractor.extract({ fileName: "./missing.pdf", })).rejects.toThrow("Failed to extract PDF: File not found");
  });
});