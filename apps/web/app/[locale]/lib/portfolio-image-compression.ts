export const PORTFOLIO_MAX_FILES = 10;
export const PORTFOLIO_MAX_FILE_BYTES = 300 * 1024;

const ALLOWED_PORTFOLIO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
          : reject(new Error("Unable to compress portfolio image")),
      "image/jpeg",
      quality,
    );
  });
}

export async function compressPortfolioImage(file: File): Promise<File> {
  if (!ALLOWED_PORTFOLIO_TYPES.has(file.type)) {
    throw new Error(`${file.name} is not a supported portfolio image`);
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
