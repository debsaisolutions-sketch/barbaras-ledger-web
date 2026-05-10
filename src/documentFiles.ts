import { getDocumentSignedUrl } from "./store";

export async function openDocumentInNewTab(storagePath: string): Promise<boolean> {
  const url = await getDocumentSignedUrl(storagePath, 3600);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export async function downloadDocumentFile(
  storagePath: string,
  fileName: string
): Promise<boolean> {
  const url = await getDocumentSignedUrl(storagePath, 3600);
  if (!url) return false;
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "document";
  a.rel = "noopener";
  a.target = "_blank";
  a.click();
  return true;
}
