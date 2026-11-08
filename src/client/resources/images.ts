export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  name: string;
}

export function normalizeExternalImageUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function prepareImage(file: File, maxSize = 1800, quality = 0.84): Promise<PreparedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo no es una imagen."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve({
                  blob,
                  width,
                  height,
                  name: file.name.replace(/\.[^.]+$/u, "") + ".jpg",
                })
              : reject(new Error("No se pudo comprimir la imagen.")),
          "image/jpeg",
          quality,
        );
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
