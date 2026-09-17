// Mirrors the existing upload limits; this only validates the local selection.
export const MAX_FILES = 20;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_FORMATS = ['pdf', 'docx', 'txt', 'csv'];
export const fileKey = (file: File) => JSON.stringify([file.name, file.size, file.lastModified]);

export function appendFiles(current: File[], incoming: File[]) {
  const files = [...current];
  const keys = new Set(current.map(fileKey));
  const messages: string[] = [];
  for (const file of incoming) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!file.name.includes('.') || !FILE_FORMATS.includes(extension)) {
      messages.push(`${file.name}: unsupported format. Choose PDF, DOCX, TXT, or CSV.`);
    } else if (file.size > MAX_FILE_BYTES) {
      messages.push(`${file.name}: exceeds 10 MB. Choose a smaller file.`);
    } else if (keys.has(fileKey(file))) {
      messages.push(`${file.name}: already in your queue.`);
    } else if (files.length >= MAX_FILES) {
      messages.push(`${file.name}: queue is full. Upload or remove files before adding more (20 maximum).`);
    } else {
      files.push(file);
      keys.add(fileKey(file));
    }
  }
  return {files, messages};
}
