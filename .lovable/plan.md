

## Fix GitHub Actions Node.js 20 deprecation warning

### Problem

The GitHub Actions workflow uses `actions/checkout@v4` and `supabase/setup-cli@v1` which run on Node.js 20, now deprecated.

### Solution

Update `.github/workflows/supabase.yml`:

| Action | Current | Updated |
|--------|---------|---------|
| `actions/checkout` | `@v4` | `@v5` |
| `supabase/setup-cli` | `@v1` | `@v2` |

### File change

**`.github/workflows/supabase.yml`** — Update action versions on lines 13 and 16.

