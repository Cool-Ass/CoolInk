# Private media revocation boundary — 2026-10-03

Isolated HTTP regression 37109631857 confirmed that a quarantined identity
is rejected by the SQL guard, a fresh Supabase object read (400), and an upload.
The same URL previously fetched with the same JWT returned a CDN HIT (200),
even with an upload metadata Cache-Control of no-store/max-age=0.
No credential, private body or customer identity was logged.

Do not claim that RLS revokes bytes already cached or downloaded. The regression
requires denial at the origin and on uploads; a successful uncached read remains
a failure. Previously cached responses are explicitly distinguished, not treated
as evidence of authorization. Provider documentation:
https://supabase.com/docs/guides/storage/cdn/fundamentals

Production uploads now require the separate PRIVATE_BLOB store and fail closed
if it is unavailable. They cannot silently fall back to Supabase or public CMS.
Application media reads verify the current CRM owner, use uncached private Blob
reads or a fresh legacy Supabase origin URL, and return private/no-store.
Erasure deletes only individually selected files; retained evidence remains
private. No system can erase a client's previously saved copy.

Source private-reference coverage was zero in the earlier full restore evidence;
repeat the saved-artifact proof and retain its actual aggregate counts before
publishing. Do not relabel disposable restored fixtures as real customer media.
