# Mr Snex — Coming Soon

Static coming-soon page for Mr Snex (snack boxes at SoCal gas stations + Burbank, CA shop).

- `index.html` — the page
- `img/` — brand assets

## Email signups
- Forms POST to `/api/subscribe`, which saves each email (deduped) to the private Vercel Blob store `mr-snex-signups`.
- Download all signups as CSV: `/api/export?key=EXPORT_KEY` (count only: add `&format=count`).
- `EXPORT_KEY` and `BLOB_READ_WRITE_TOKEN` are set in the Vercel project's environment variables.
