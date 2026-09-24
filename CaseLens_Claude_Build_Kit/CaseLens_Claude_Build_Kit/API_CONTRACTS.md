# API / Server Contracts

Prefer Next.js route handlers or typed server actions. All inputs validated with Zod.

## Search

`GET /api/search?q=&court=&year=&act=&section=&page=`

Returns:
- results[]
- facets
- pagination
- query_time_ms

## Case

`GET /api/cases/:id`

Returns full dossier shell.

`GET /api/cases/:id/timeline`

`GET /api/cases/:id/relationships?depth=1&type=CITES`

`GET /api/cases/:id/paragraphs?q=`

## Investigations

`POST /api/investigations`

`GET /api/investigations/:id`

`POST /api/investigations/:id/nodes`

`PATCH /api/investigations/:id/nodes/:nodeId`

`POST /api/investigations/:id/edges`

## Document verification

`POST /api/documents/upload`

Returns document ID + upload/extraction status.

`POST /api/documents/:id/analyze`

Stages:
- EXTRACTING
- CITATIONS_DETECTED
- METADATA_CHECKED
- PARAGRAPHS_CHECKED
- PROPOSITIONS_CHECKED
- COMPLETE

`GET /api/documents/:id/analysis`

## Research synthesis

`POST /api/research/synthesize`

Input:
- question
- selected case IDs / investigation ID

Output must include:
- answer
- claims[]
- source IDs
- supporting paragraph IDs
- confidence/limitations

## Reports

`POST /api/reports/investigation`

`POST /api/reports/integrity`

## Error shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Readable message",
    "details": {}
  }
}
```
