/** Hide other TradeDeskPro contractor folders. EasyLedger uses the same DocuSeal account. */
export function visibleDocuSealFolder(folderName: string, allowedFolder = ""): boolean {
  const folder = folderName.trim();
  const allowed = allowedFolder.trim();
  if (allowed) return folder === allowed;
  return !folder.startsWith("tdp-");
}
