# Spec: Authentication

- Login issues a session token stored in the `sessions` table.
- Tokens expire after 24 hours.
- Expired tokens must be rejected with HTTP 401.
