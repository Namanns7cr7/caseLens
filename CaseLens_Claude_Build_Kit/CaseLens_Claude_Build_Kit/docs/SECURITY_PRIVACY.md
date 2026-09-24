# Security & Privacy

- All secrets server-only.
- Signed/object-storage URLs for private uploads.
- MIME/type/size validation.
- Malware scanning hook for uploads if available.
- SHA-256 duplicate detection.
- Rate-limit upload, AI, and search endpoints.
- No arbitrary remote URL fetching from user input.
- Sanitize rendered HTML from extracted documents.
- Use Content Security Policy.
- CSRF protection for mutations where relevant.
- Authorization checks on investigations/documents/reports.
- Avoid logging full private legal documents in application logs.
- Redact secrets and tokens from errors.
- Record model version and evidence IDs for AI verification outputs.
