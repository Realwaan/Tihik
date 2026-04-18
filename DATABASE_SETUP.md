# PostgreSQL Setup Guide for Trackit

## Quick Start (3 Steps)

### 1️⃣ Install PostgreSQL
Run: `install-postgresql.bat`

Or download manually from: https://www.postgresql.org/download/windows/

**Installation Settings:**
- Password: `Choose a strong password` (you'll need this!)
- Port: `5432` (default)
- Locale: `Default`
- ✅ Start PostgreSQL automatically with Windows

### 2️⃣ Configure Auto-Start
Run: `setup-postgresql.bat`

This will:
- ✅ Detect your PostgreSQL installation
- ✅ Enable automatic startup
- ✅ Start the service if it's not running

### 3️⃣ Create Database
After PostgreSQL is installed, create the database:

```bash
# Connect to PostgreSQL (you'll be prompted for postgres password)
psql -U postgres

# Run these commands:
CREATE USER trackit_user WITH PASSWORD 'secure_password_123';
CREATE DATABASE trackit_db OWNER trackit_user;
GRANT ALL PRIVILEGES ON DATABASE trackit_db TO trackit_user;
\q
```

### 4️⃣ Run Migrations
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5️⃣ Start Development Server
```bash
# Option 1: Simple start
npm run dev

# Option 2: Auto-start everything (PostgreSQL + Server + Browser)
start-dev.bat
```

`npm run dev` now tries to start PostgreSQL first when the service is available. If the database service cannot be started automatically, the command stops with a message so you can start PostgreSQL manually and retry.

---

## Manual Commands

### Check if PostgreSQL is running:
```bash
sc query postgresql-x64-16
```

### Start PostgreSQL manually:
```bash
net start postgresql-x64-16
```

### Stop PostgreSQL:
```bash
net stop postgresql-x64-16
```

### Enable auto-start:
```bash
sc config postgresql-x64-16 start= auto
```

### Connect to database:
```bash
psql -U postgres
psql -U trackit_user -d trackit_db
```

---

## Troubleshooting

### "psql: command not found"
PostgreSQL is not in your PATH. Add this to your system PATH:
```
C:\Program Files\PostgreSQL\16\bin
```

### "Connection refused" error
PostgreSQL service is not running:
```bash
net start postgresql-x64-16
```

### "password authentication failed"
Check your DATABASE_URL in `.env`:
```
DATABASE_URL="postgresql://trackit_user:secure_password_123@localhost:5432/trackit_db?schema=public"
```

### Port 5432 already in use
Another PostgreSQL instance is running. Check with:
```bash
netstat -ano | findstr :5432
```

### Migration errors
Reset and recreate:
```bash
npx prisma migrate reset
npx prisma migrate dev
```

---

## Alternative: Use SQLite (No Server Needed)

If PostgreSQL is too complex, you can switch to SQLite:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

2. Update `.env`:
```env
DATABASE_URL="file:./dev.db"
```

3. Run migrations:
```bash
npm run prisma:migrate
```

**Note:** SQLite doesn't support all features (like enums), so schema changes may be needed.

---

## OpenAI Assistant Setup

To enable the in-app AI assistant, add this to your `.env` file:

```env
OPENAI_API_KEY="your_openai_api_key"
OPENAI_MODEL="gpt-4o-mini"
```

Then restart the dev server.
