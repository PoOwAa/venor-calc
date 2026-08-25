function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    image.src = url;
  });
}

export async function preprocessImage(file: File): Promise<HTMLCanvasElement> {
  const image = await loadImage(file);

  const scale = 4;

  const canvas = document.createElement("canvas");
  canvas.width = image.width * scale;
  canvas.height = image.height * scale;

  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    const value = brightness > 135 ? 255 : 0;

    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
    pixels[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}
