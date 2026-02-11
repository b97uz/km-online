# Kelajak Mediklari MVP

Production-ready MVP monorepo:
- Telegram bot (`apps/bot`) - grammY
- Web admin panel (`apps/web`) - Next.js App Router + Tailwind
- DB (`packages/db`) - PostgreSQL + Prisma
- Shared utils (`packages/shared`)

## A) Folder structure

```txt
kelajak-mediklari/
  apps/
    web/                  # Admin + Curator panel
    bot/                  # Telegram bot
  packages/
    db/                   # Prisma schema, Prisma client, seed
    shared/               # Shared parser/types
  deploy/
    nginx-km.conf         # Nginx sample config
  ecosystem.config.cjs    # PM2 config
  .env.example
```

## B) Prisma schema

Asosiy schema: `packages/db/prisma/schema.prisma`

Muhim nuqtalar:
- Rollar: `ADMIN | CURATOR | STUDENT`
- 2 betlik test uchun: `Test` + `TestImage(pageNumber=1/2)`
- Studentga test ochish: `AccessWindow`
- Natija: `Submission` + `SubmissionDetail`
- Audit: `AuditLog`

## C) Bot contact auth flow

Asosiy fayl: `apps/bot/src/index.ts`

Flow:
1. `/start` -> faqat `requestContact` tugmasi bilan telefon yuborish
2. Qo'lda yozilgan telefon qabul qilinmaydi
3. DB da student + aktiv group bo'lsa davom etadi
4. Aktiv `AccessWindow` bo'lsa bitta tugma chiqadi: `Testni ochish`
5. Bot testning 2 ta rasmini yuboradi
6. Student `1A2B3C...` formatda yuboradi
7. Parser tekshiradi, score hisoblaydi, DB ga yozadi
8. Studentga faqat: `Qabul qilindi ✅`

## D) Admin/Curator minimal pages

- Login: `/login`
  - Admin: `username + password`
  - Curator: `phone + password`
- Admin panel: `/admin`
  - Kurator yaratish
  - Student registry (create/list/status update)
  - Group catalog (create/update/assign curator/filter)
  - Kitob+dars+test yaratish
- Curator panel: `/curator`
  - Faqat admin biriktirgan guruhlarni ko'rish
  - Studentni guruhga biriktirish / status update / remove
  - AccessWindow ochish

## E) Local setup (Mac) - step by step

## CRM API routes

- `POST /api/admin/students`
- `GET /api/admin/students?phone=`
- `PATCH /api/admin/students/:id`
- `POST /api/admin/groups`
- `PATCH /api/admin/groups/:id`
- `GET /api/curator/groups`
- `POST /api/curator/enrollments`
- `PATCH /api/curator/enrollments/:id`
- `DELETE /api/curator/enrollments/:id`

Muhim:
- Terminalga `#` bilan boshlanadigan izohli qatorlarni yubormang.
- Faqat pastdagi buyruqlarni nusxa ko'chiring.
- Eng oson yo'l: tayyor skriptlardan foydalaning.

### Tez start (recommended)
```bash
cd "/Users/sevinchkomiljonova/Documents/New project"
bash scripts/local_setup.sh
```

Postgres.app'da `Empty data directory` ko'rinsa:
1. `Initialize` tugmasini bosing
2. Server start bo'lganini kuting
3. `bash scripts/local_setup.sh` ni qayta ishga tushiring

Keyin 2 ta terminal oching:
```bash
cd "/Users/sevinchkomiljonova/Documents/New project"
bash scripts/local_run_web.sh
```

```bash
cd "/Users/sevinchkomiljonova/Documents/New project"
bash scripts/local_run_bot.sh
```

### 1) Kerakli dasturlarni o'rnating
1. [Node.js LTS](https://nodejs.org)
2. [pnpm](https://pnpm.io/installation):
   ```bash
   npm i -g pnpm
   ```
3. [PostgreSQL](https://postgresapp.com/) yoki brew orqali:
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```
4. Kod yozish uchun [VS Code](https://code.visualstudio.com)

### 2) Loyihani ochish
```bash
cd /Users/sevinchkomiljonova/Documents/New\ project
cp .env.example .env
```

### 3) `.env` ni to'ldiring
`BOT_TOKEN` va `JWT_SECRET` ni albatta to'ldiring.

### 4) Dependency o'rnatish
```bash
pnpm install
```

### 5) Prisma generate + migration
```bash
pnpm db:generate
pnpm --filter @km/db exec prisma migrate dev --name init
```

### 6) Birinchi admin yaratish (seed)
```bash
pnpm db:seed
```

### 7) Dasturlarni ishga tushirish
1-terminal:
```bash
pnpm --filter @km/web dev
```
2-terminal:
```bash
pnpm --filter @km/bot dev
```

Web: [http://localhost:3000](http://localhost:3000)

## Ubuntu VPS deployment (non-docker main path)

### 1) Serverga kirish
```bash
ssh root@YOUR_SERVER_IP
```

### 2) Node, pnpm, PostgreSQL, Nginx, PM2 o'rnatish
```bash
apt update && apt upgrade -y
apt install -y curl git nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm i -g pnpm pm2
```

### 3) PostgreSQL sozlash
```bash
sudo -u postgres psql
CREATE DATABASE kelajak_mediklari;
CREATE USER km_user WITH ENCRYPTED PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE kelajak_mediklari TO km_user;
\q
```

### 4) Loyihani serverga joylash
```bash
mkdir -p /var/www/kelajak-mediklari
cd /var/www/kelajak-mediklari
# git clone YOUR_REPO .
pnpm install
cp .env.example .env
```

`.env`:
- `DATABASE_URL=postgresql://km_user:strong_password@localhost:5432/kelajak_mediklari`
- `BOT_TOKEN=...`
- `WEB_BASE_URL=https://your-domain.uz`
- `BOT_WEBHOOK_URL=https://your-domain.uz`
- `BOT_WEBHOOK_PATH=/telegram/webhook`
- `JWT_SECRET=...`

### 5) DB migration + seed
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 6) Build + PM2
```bash
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 7) Nginx
```bash
cp deploy/nginx-km.conf /etc/nginx/sites-available/kelajak-mediklari
ln -s /etc/nginx/sites-available/kelajak-mediklari /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 8) SSL (Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.uz -d www.your-domain.uz
```

## Why webhook (best)

Sizda domen bor, shuning uchun production uchun webhook yaxshi:
- kamroq resource sarflaydi
- tezroq update qabul qiladi
- PM2 + Nginx bilan barqaror

Bu loyihada webhook sozlangan:
- `https://your-domain.uz/telegram/webhook` -> bot process (`:4000`)

## End-to-end checklist

1. `/login` ochiladi
2. Seed admin bilan tizimga kirish ishlaydi
3. Admin kurator yaratadi
4. Admin student yaratadi
5. Admin group catalog yaratadi va curatorga assign qiladi
6. Admin test yaratadi (2 ta image URL bilan)
7. Curator login qiladi
8. Curator assigned groupga studentni biriktiradi
9. Curator `AccessWindow` ochadi
10. Student botda `/start` qiladi
11. Telefonni faqat tugma orqali yuboradi
12. Bot bitta aktiv test tugmasini ko'rsatadi
13. Bot 2ta rasm yuboradi
14. Student javob yuboradi (`1A2B3C...`)
15. DB da `Submission` va `SubmissionDetail` yoziladi
16. Studentga faqat `Qabul qilindi ✅` chiqadi

## Curator flow (amaliy)

1. `/login` da `Kurator` tanlang, telefon+parol bilan kiring.
2. Admin sizga group biriktirganini tekshiring (`Menga biriktirilgan guruhlar`).
3. `Talabani guruhga qo'shish` bo'limida:
   - guruhni tanlang,
   - student telefonini kiriting (`+998...`),
   - `Qo'shish` ni bosing.
4. `Testlar ro'yxati (ID)` bo'limidan kerakli `Test ID` ni oling.
5. `Talabaga test oynasi ochish` bo'limida:
   - student telefoni,
   - test ID,
   - openFrom/openTo vaqtlarini kiriting,
   - `Oynani ochish` ni bosing.
6. Student botda `/start` qiladi, telefonini tugma orqali yuboradi va testni oladi.

Izoh:
- Local `scripts/local_run_bot.sh` botni `long-polling`da ishga tushiradi (webhook emas).
- Test image URL maydoni ham nisbiy (`/uploads/1.jpg`), ham to'liq (`https://...`) URL qabul qiladi.

## Future improvements

1. `/uploads` o'rniga S3/Cloudflare R2
2. Curator login uchun OTP/SMS
3. Rate limiting (bot + API)
4. Redis queue (high load)
5. Websocket live monitoring
6. Full RBAC + action-level permissions
7. Better report pages + CSV export

## Optional Docker (short)

MVP non-docker yo'l bilan berildi. Keyin xohlasangiz `Dockerfile + docker-compose` varianti ham qo'shib beraman.
