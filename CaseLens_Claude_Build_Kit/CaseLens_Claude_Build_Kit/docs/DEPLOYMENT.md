# Deployment

## Recommended hackathon path

- Next.js app: Vercel or Google Cloud Run.
- PostgreSQL: managed Postgres with pgvector.
- Object storage: Google Cloud Storage or compatible S3 store.
- Gemini: server-side API integration.

## Environment separation

- local
- preview
- production

## Production checklist

- migrations applied;
- seed corpus imported;
- storage CORS configured;
- API keys server-only;
- rate limits enabled;
- CSP configured;
- demo account/data available;
- Playwright golden path passing;
- source links verified.
