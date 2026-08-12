export const PORTFOLIO_MAX_FILES = 10;
export const PORTFOLIO_MAX_FILE_BYTES = 300 * 1024;
export const COMPANY_AFFIDAVIT_MAX_FILE_BYTES = 1024 * 1024;

const PORTFOLIO_PDF_TARGET_BYTES = 292 * 1024;
const PORTFOLIO_PDF_MAX_PAGES = 50;
const ALLOWED_PORTFOLIO_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const PORTFOLIO_PDF_TYPE = "application/pdf";

function configurePdfWorker(pdfjs: typeof import("pdfjs-dist")): void {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

async function validateReadablePdf(file: File): Promise<void> {
  const pdfjs = await import("pdfjs-dist");
  configurePdfWorker(pdfjs);

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
  });

  try {
    const source = await loadingTask.promise;
    if (source.numPages < 1) {
      throw new Error(`${file.name} has no readable pages`);
    }
    if (source.numPages > PORTFOLIO_PDF_MAX_PAGES) {
      throw new Error(
        `${file.name} has more than ${PORTFOLIO_PDF_MAX_PAGES} pages`,
      );
    }

    const firstPage = await source.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    if (viewport.width <= 0 || viewport.height <= 0) {
      throw new Error(`${file.name} has no readable pages`);
    }
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes("more than")) {
      throw cause;
    }
    throw new Error(
      `${file.name} is not a valid, unlocked PDF that can be reviewed.`,
    );
  } finally {
    await loadingTask.destroy();
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to read ${file.name}`));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Unable to compress portfolio file")),
      "image/jpeg",
      quality,
    );
  });
}

async function compressPdfFile(
  file: File,
  preserveReadability = false,
): Promise<File> {
  const [{ PDFDocument }, pdfjs] = await Promise.all([
    import("pdf-lib"),
    import("pdfjs-dist"),
  ]);

  configurePdfWorker(pdfjs);

  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;

  try {
    const optimized = await PDFDocument.load(sourceBytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    const optimizedBytes = await optimized.save({
      addDefaultPage: false,
      useObjectStreams: true,
      updateFieldAppearances: false,
    });
    if (optimizedBytes.byteLength <= PORTFOLIO_PDF_TARGET_BYTES) {
      return new File([Uint8Array.from(optimizedBytes)], file.name, {
        type: PORTFOLIO_PDF_TYPE,
        lastModified: file.lastModified,
      });
    }

    loadingTask = pdfjs.getDocument({
      data: sourceBytes,
      isEvalSupported: false,
    });
    const source = await loadingTask.promise;
    if (source.numPages > PORTFOLIO_PDF_MAX_PAGES) {
      throw new Error(
        `${file.name} has more than ${PORTFOLIO_PDF_MAX_PAGES} pages`,
      );
    }

    const readableAttempts = [
      { scale: 1.4, quality: 0.82 },
      { scale: 1.2, quality: 0.72 },
      { scale: 1, quality: 0.62 },
      { scale: 0.84, quality: 0.52 },
      { scale: 0.68, quality: 0.42 },
    ];
    const attempts = preserveReadability
      ? readableAttempts
      : [
          ...readableAttempts,
          { scale: 0.54, quality: 0.32 },
          { scale: 0.42, quality: 0.24 },
          { scale: 0.32, quality: 0.18 },
        ];

    for (const attempt of attempts) {
      const output = await PDFDocument.create();

      for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
        const sourcePage = await source.getPage(pageNumber);
        const outputViewport = sourcePage.getViewport({ scale: 1 });
        const renderViewport = sourcePage.getViewport({
          scale: attempt.scale,
        });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(renderViewport.width));
        canvas.height = Math.max(1, Math.ceil(renderViewport.height));
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("PDF compression is unavailable");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await sourcePage.render({
          canvasContext: context,
          viewport: renderViewport,
        }).promise;

        const jpeg = await canvasBlob(canvas, attempt.quality);
        const embedded = await output.embedJpg(await jpeg.arrayBuffer());
        const outputPage = output.addPage([
          outputViewport.width,
          outputViewport.height,
        ]);
        outputPage.drawImage(embedded, {
          x: 0,
          y: 0,
          width: outputViewport.width,
          height: outputViewport.height,
        });
        canvas.width = 1;
        canvas.height = 1;
      }

      const bytes = await output.save({
        addDefaultPage: false,
        useObjectStreams: true,
      });
      if (bytes.byteLength <= PORTFOLIO_PDF_TARGET_BYTES) {
        return new File([Uint8Array.from(bytes)], file.name, {
          type: PORTFOLIO_PDF_TYPE,
          lastModified: file.lastModified,
        });
      }
    }
  } catch (cause) {
    if (
      cause instanceof Error &&
      (cause.message.includes("pages") ||
        cause.message.includes("compression is unavailable"))
    ) {
      throw cause;
    }
    throw new Error(
      `${file.name} could not be compressed. Check that it is a valid, unlocked PDF.`,
    );
  } finally {
    if (loadingTask) {
      await loadingTask.destroy();
    }
  }

  throw new Error(`${file.name} cannot be compressed below 0.3 MB`);
}

export async function preparePortfolioFile(file: File): Promise<File> {
  if (file.type === PORTFOLIO_PDF_TYPE) {
    return file.size <= PORTFOLIO_MAX_FILE_BYTES ? file : compressPdfFile(file);
  }
  if (!ALLOWED_PORTFOLIO_IMAGE_TYPES.has(file.type)) {
    throw new Error(`${file.name} is not a supported portfolio file`);
  }
  if (file.size <= PORTFOLIO_MAX_FILE_BYTES) {
    return file;
  }

  const image = await loadImage(file);
  let scale = Math.min(
    1,
    2400 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  let quality = 0.86;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Image compression is unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasBlob(canvas, quality);
    if (blob.size <= PORTFOLIO_MAX_FILE_BYTES) {
      const baseName = file.name.replace(/\.[^.]+$/, "") || "portfolio";
      return new File([blob], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    }

    if (quality > 0.46) {
      quality -= 0.1;
    } else {
      scale *= 0.82;
      quality = 0.8;
    }
  }

  throw new Error(`${file.name} cannot be compressed below 0.3 MB`);
}

export async function prepareQualificationEvidenceFile(
  file: File,
): Promise<File> {
  if (file.type === PORTFOLIO_PDF_TYPE) {
    return file.size <= PORTFOLIO_MAX_FILE_BYTES
      ? file
      : compressPdfFile(file, true);
  }
  return preparePortfolioFile(file);
}

export async function prepareCompanyAffidavitFile(file: File): Promise<File> {
  if (file.type !== PORTFOLIO_PDF_TYPE) {
    return prepareQualificationEvidenceFile(file);
  }
  if (file.size <= PORTFOLIO_MAX_FILE_BYTES) {
    return file;
  }

  try {
    return await compressPdfFile(file, true);
  } catch (compressionError) {
    if (file.size > COMPANY_AFFIDAVIT_MAX_FILE_BYTES) {
      throw compressionError;
    }

    await validateReadablePdf(file);
    return file;
  }
}
