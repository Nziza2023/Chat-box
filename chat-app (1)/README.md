# Chatly — Private Two-Person Messenger

Next.js + NestJS + Socket.IO + Prisma + PostgreSQL.

**This is a private messenger for exactly two people.** There is no public
registration, no user directory, and no way to start a conversation with
anyone else — it's enforced on the backend (see "Locking it to two people"
below), not just hidden in the UI.

This README has **every command** you need, in order, from an empty Windows 11 machine to a fully working chat app running in your browser.

---

## 0. Install these first (skip any you already have)

| Tool | Download | Verify with |
|---|---|---|
| Node.js (LTS) | https://nodejs.org | `node --version` |
| PostgreSQL | https://www.postgresql.org/download/windows/ | `psql --version` |
| Git (optional) | https://git-scm.com/download/win | `git --version` |
| VS Code (optional) | https://code.visualstudio.com | — |

While installing PostgreSQL, **write down the password** you set for the `postgres` user — you'll need it below.

---

## 1. Create the database

Open **pgAdmin 4** (installed with PostgreSQL) or run this in Command Prompt:

```bash
psql -U postgres
```

Enter your password, then at the `postgres=#` prompt run:

```sql
CREATE DATABASE chatapp;
\q
```

*(Alternative: if you'd rather use Docker instead of installing PostgreSQL directly, run `docker compose up -d` from the `chat-app/` folder — it creates the same database automatically. Only do one or the other, not both.)*

---

## 2. Backend setup

```bash
cd chat-app/backend
npm install
```

This reads `package.json` and downloads every library the backend needs into a `node_modules` folder (NestJS, Prisma, Socket.IO, etc.). This can take a minute or two.

**Create your real environment file:**

```bash
copy .env.example .env
```

Open `backend/.env` in VS Code and edit these two lines:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/chatapp?schema=public"
```
Replace `YOUR_PASSWORD` with the PostgreSQL password you set in step 0.

```
JWT_ACCESS_SECRET="replace-with-a-long-random-string"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-string"
```
Replace both with any long random text (20+ random characters each — mash your keyboard). These two must be **different** from each other.

**Set the two authorized users** — see "Locking it to two people" below for
how to find their ids. Without this, nobody can log in at all:
```
AUTHORIZED_USER_IDS="first-user-id,second-user-id"
```

**Create the actual database tables from our schema:**

```bash
npx prisma migrate dev --name init
```

Expected output: it prints each table it created (User, Conversation, Message, etc.) and ends with `Your database is now in sync with your schema.`

**Start the backend:**

```bash
npm run start:dev
```

Expected output:
```
Backend running on http://localhost:4000
```

Leave this terminal window open and running. Test it worked by opening this URL in your browser:
```
http://localhost:4000/api/auth/login
```
You should see a JSON error like `{"message":["identifier must be a string", ...]}` — that's correct! It means the server is alive and correctly rejecting an empty request.

---

## 3. Frontend setup

Open a **second** terminal window (keep the backend one running).

```bash
cd chat-app/frontend
npm install
```

**Create your environment file:**

```bash
copy .env.local.example .env.local
```

The default values already match the backend (`http://localhost:4000`), so no editing needed unless you changed the backend's port.

**Start the frontend:**

```bash
npm run dev
```

Expected output:
```
- Local:        http://localhost:3000
```

Open **http://localhost:3000** in your browser. You should land on the login page.

---

## 4. Test the whole thing end-to-end

There's no sign-up screen — both accounts must already exist and be listed in
`AUTHORIZED_USER_IDS` (see below).

1. Log in as the first authorized user in one browser.
2. You'll land straight in the one private conversation (no conversation list to pick from).
3. Open a **second browser** (or an Incognito/Private window) to `http://localhost:3000` and log in as the second authorized user.
4. Type "Hello!" and press Enter.
5. Switch to the first window — the message should appear **instantly**, no refresh needed.
6. Try: reacting with an emoji, replying, editing your own message, deleting a message, pinning/starring a message, and watch the "typing..." indicator when the other person types.
7. **Confirm the lockdown**: try visiting `/register` — it should say registration is disabled rather than showing a signup form. Try logging in with any other account (if one exists in the database) — it should fail with "Invalid credentials" even with the correct password, because it isn't in `AUTHORIZED_USER_IDS`.

If real-time messages don't appear instantly, check the backend terminal for errors, and make sure both `npm run start:dev` and `npm run dev` are still running.

---

## Locking it to two people

Chatly no longer lets anyone sign up. Instead, exactly two **existing**
user accounts are allowed in, controlled by one environment variable on the
backend: `AUTHORIZED_USER_IDS`. This is checked on every login, every API
request, and every Socket.IO connection — not just hidden in the UI.

**You need the two accounts to already exist in the database** (created back
when registration was still open). If you don't have two accounts yet, you
will need to insert them directly in the database once, since the app itself
can no longer create them.

**To find the two existing user ids:**

- **Supabase**: open your project → **Table Editor** → `users` table → copy
  the value in the `id` column for each of the two people you want to allow.
- **Or via SQL** (Supabase → SQL Editor, or `psql`):
  ```sql
  SELECT id, username, email FROM users;
  ```

**Set the variable:**

```
AUTHORIZED_USER_IDS=3f29a1e2-1111-2222-3333-aaaaaaaaaaaa,9b7c4d01-4444-5555-6666-bbbbbbbbbbbb
```

- Comma-separated, no spaces, no quotes needed.
- Locally: add this line to `backend/.env`, then restart `npm run start:dev`.
- On Render (or wherever the backend is deployed): add it under
  **Environment** as a new variable, same as `DATABASE_URL` and the JWT
  secrets were added earlier, then redeploy.

**What happens if it's missing or wrong:** the backend fails *closed*, not
open — if `AUTHORIZED_USER_IDS` is empty or doesn't have exactly two ids,
every request from everyone is rejected, and the backend logs a clear error
on startup explaining why. It will never silently become public.

**Nothing else needs to be done for this** — once the variable is set, the
backend already enforces it everywhere: `/auth/login` only accepts those two
ids, `/auth/register` always refuses, every REST route checks the allowlist
before running, and the Socket.IO connection is dropped immediately for
anyone else.

---

## Everyday commands (after the first-time setup above)

Every time you come back to work on this project:

```bash
# Terminal 1
cd chat-app/backend
npm run start:dev

# Terminal 2
cd chat-app/frontend
npm run dev
```

If PostgreSQL isn't already running as a Windows service, start it from the Start Menu ("pgAdmin" or "Services" app), or run `docker compose up -d` from `chat-app/` if you're using Docker.

## Useful Prisma commands

```bash
# Open a visual database browser in your browser at localhost:5555
npx prisma studio

# After you edit prisma/schema.prisma, apply the changes to your database
npx prisma migrate dev --name describe_your_change
```

## Project structure

```
chat-app/
├── backend/            NestJS API + WebSocket server (port 4000)
│   ├── prisma/schema.prisma   Database table definitions
│   ├── src/
│   │   ├── authorization/      The two-person allowlist — single source of truth
│   │   ├── auth/                 Login, JWT, refresh tokens (register disabled)
│   │   ├── users/                 Profile only — no public search/directory
│   │   ├── conversations/         The one private conversation, pin/mute
│   │   ├── messages/               Send/edit/delete/react/pin/star/forward
│   │   ├── stories/                 24h status updates (visible only to the other authorized user)
│   │   ├── search/                   Search within the shared conversation
│   │   ├── websocket/                Real-time Socket.IO gateway (allowlist-checked)
│   │   ├── files/                     File/image/voice upload
│   │   └── notifications/            In-app notifications
│   └── uploads/                        Uploaded images/files land here
│
├── frontend/           Next.js app (port 3000)
│   ├── app/               Pages — login, register (disabled notice), chat
│   ├── components/       UI building blocks
│   ├── hooks/               Real-time data hooks
│   ├── context/            Auth + theme + toast providers
│   └── lib/                    API client + socket connection
│
└── docker-compose.yml   Optional: run PostgreSQL in Docker instead
```
