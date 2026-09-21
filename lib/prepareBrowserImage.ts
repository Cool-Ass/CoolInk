/** Keep multipart requests below the hosting limit; server still decodes every image. */
export async function prepareBrowserImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Wybierz JPG, PNG lub WEBP do 8 MB.");
  if (file.size < 3 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Nie udało się przygotować zdjęcia.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.size > 3 * 1024 * 1024) throw new Error("Zdjęcie jest zbyt duże. Wybierz mniejszy plik.");
    return new File([blob], "inspiracja.webp", { type: blob.type });
  } finally { bitmap.close(); }
}
