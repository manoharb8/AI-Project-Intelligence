/** Content hashes are kept only in memory for this app session. */
function readBytes(file: File): Promise<ArrayBuffer> {
  if (file.arrayBuffer) return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
export async function uploadIdentity(file: File): Promise<string | null> {
  // If secure hashing is unavailable, do not guess from name or size: a same-name
  // update is valid project content and must remain uploadable.
  if (!globalThis.crypto?.subtle) return null;
  try {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', await readBytes(file));
    const hex = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    return `${file.name.split('.').pop()?.toLowerCase()}:${hex}`;
  } catch {return null;}
}
