# Application rules

- Protect ID-based synchronized lists with an atomic database merge and explicit deletion markers; client-only merging cannot prevent outdated browsers from replacing cloud data.
- Resolve email-based access against the authenticated account's confirmed email, and evaluate trial dates from server-controlled profiles; browser state is not an authorization boundary.
- Recover missing ID-based records from the latest historical version per account/key/item, preserving current records and explicit deletion markers; never replace a user's entire dataset during recovery.