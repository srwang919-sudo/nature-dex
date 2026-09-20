# Security policy

## Supported versions

Only the latest release on the default branch is supported for security fixes while the project is in the early open-source phase.

## Reporting a vulnerability

Do not open a public issue for a suspected credential leak, authentication bypass, cross-user photo access, private storage exposure, or provider-secret disclosure. Contact the repository owner through the private security contact configured on GitHub and include a minimal reproduction without real user data.

If no private contact is configured yet, do not include secrets or personal data in a report; open a public issue asking for a private reporting channel.

## Security principles

- Never commit API keys or cloud credentials.
- Verify authenticated ownership in cloud functions; never trust client-supplied owner fields.
- Keep observation photos private and require explicit consent before upload.
- Treat provider output as untrusted input and expose only safe error codes to clients.
- Test cross-user isolation and deletion behavior before enabling a production provider.
