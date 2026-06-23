# Architecture decision records

## 001. Use PostgreSQL
Status: Accepted

Chosen for reliability and JSONB support.

## 002. Stateful session tokens
Status: Accepted

Tokens are stored server-side in `sessions` so they can be revoked instantly.
