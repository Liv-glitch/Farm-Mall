# Database migrations (raw SQL)

The FarmMall schema for Namecheap cPanel is managed as plain **`.sql` files** that you import through **phpMyAdmin**. This avoids needing shell access or a migration runner on shared hosting.

## Files

- **`schema.sql`** — the baseline. Builds the entire schema on a **fresh** database. Import this first.
- **`seed.sql`** — initial **admin user** + reference crop varieties (the four Kenya potato varieties with cost data). Import after `schema.sql`. Edit the admin email and change the temporary password (`ChangeMe!2026`) — see the comments in the file.
- Subsequent changes are added as new numbered files, applied in filename order, e.g.:
  - `0002-add-x-column.sql`
  - `0003-create-y-table.sql`

Use a zero-padded numeric prefix so files sort in apply order. Each file should be self-contained (`ALTER TABLE …`, `CREATE TABLE …`, etc.) and safe to run once on a database that already has every earlier file applied. There is no automatic tracking — keep note of which files a given database has had applied (a simple convention: the newest filename you imported).

## How to import (phpMyAdmin / cPanel)

1. cPanel → **MySQL® Databases**: create the database + user and grant the user **ALL PRIVILEGES** (see root `DEPLOYMENT.md`).
2. cPanel → **phpMyAdmin** → select your database in the left sidebar.
3. **Import** tab → **Choose File** → select `schema.sql` (then later, the next numbered file) → **Go**.
4. Verify the tables appear under the database. For schema changes later, import only the new file(s), in order.

> Tip: if an import fails partway, fix the file and re-run on a clean database (drop and recreate, or drop the affected tables). `schema.sql` assumes an empty database — it uses `CREATE TABLE` (not `IF NOT EXISTS`), so re-importing it over existing tables will error by design.

## Notes / conventions

- Engine **InnoDB**, charset **utf8mb4** (required for foreign keys + emoji-safe text).
- UUID id/foreign-key columns are `CHAR(36)`; the application generates the UUIDs, so `id` has no DB default.
- `JSON` columns have no DB default; the app supplies defaults on insert.
- Most tables use `snake_case` columns; **`media`** and **`media_associations`** intentionally use `camelCase` — do not "normalize" them.
- Seed data: import `seed.sql` after `schema.sql` for the reference crop varieties. (The Sequelize seeders, `npm run seed`, remain available if you have shell access and want the full sample dataset.)
- The previous PostgreSQL migrations remain archived under `src/migrations/_postgres-legacy/` for historical reference only; they are not used.
