-- Extend barbara-documents bucket MIME allowlist for HEIC / HEIF / WEBP (Barbara Ledger only).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp'
]
WHERE id = 'barbara-documents';
