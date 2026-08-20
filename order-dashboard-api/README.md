# Order Dashboard API

Backend for the Order Dashboard (Super Admin + Cafe/Restaurant POS). Node.js + Express + TypeScript + Prisma + PostgreSQL.

## Setup

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL / JWT_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

The API listens on `http://localhost:4000` by default (`PORT` in `.env`).

Seeded accounts (password for both: `password123`):

- Super Admin: `owner@orderdashboard.example`
- Cafe staff (tenant "Tanvir's Cafe"): `staff@tanvirscafe.example`

## Auth

`POST /api/auth/login` with `{ email, password }` returns `{ token, user }`. Send the token as
`Authorization: Bearer <token>` on every other request.

- Super Admin routes (`/api/tenants`, `/api/platform-settings`) require role `SUPER_ADMIN`.
- Every other route requires a logged-in user with a `tenantId` (cafe staff) and scopes all
  data to that tenant automatically — one tenant's data is never visible to another's.

## Routes

| Module | Base path |
| --- | --- |
| Auth | `/api/auth` |
| Tenants (Super Admin) | `/api/tenants` |
| Platform Settings (Super Admin) | `/api/platform-settings` |
| Menu (categories + items) | `/api/menu` |
| Tables | `/api/tables` |
| Customers | `/api/customers` |
| Orders | `/api/orders` |
| Kitchen / KOT | `/api/kitchen` |
| Billing / Invoices | `/api/billing` |
| Inventory | `/api/inventory` |
| Expenses | `/api/expenses` |
| Staff & Roles | `/api/staff` |
| Settings (per-tenant) | `/api/settings` |
| Reports (per-tenant) | `/api/reports` |

## Notes

- Recipes (auto stock deduction on order) isn't wired up yet — same as the frontend, it's a
  placeholder for now.
- `npm run build && npm start` for production; `npx prisma migrate deploy` to apply migrations
  without the interactive dev flow.
