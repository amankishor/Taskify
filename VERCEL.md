# Vercel Free deployment

This project is prepared for a Vercel static frontend plus one Node API function, MongoDB Atlas, Cloudinary images and SMTP email. It has not been deployed to your account yet. No credentials are embedded in the frontend.

## 1. Fill environment variables

Use `.env` for local development. In Vercel, add the same values under Project → Settings → Environment Variables, for Production and any Preview environment you want to use. Never upload or commit the `.env` file.

| Variable | Value |
|---|---|
| `MONGODB_URI` | MongoDB Atlas driver connection string, including your database user/password. URL-encode special characters in that password. |
| `MONGODB_DB` | `notesnexa` or your chosen database name |
| `JWT_SECRET` | A random string of 32+ characters; keep it stable between deployments |
| `SUPER_EMAIL`, `SUPER_PASSWORD`, `SUPER_NAME` | Your existing direct owner account; password must be 12+ characters |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary product environment cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret; server-only |
| `CLOUDINARY_UPLOAD_PRESET` | Optional **signed** image preset; set a 10 MB maximum file size and permitted image formats in Cloudinary |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Your mail provider's SMTP settings; usually 587/false or 465/true |
| `SMTP_USER`, `SMTP_PASS` | SMTP credentials. For Gmail, use an App Password when required by your account, not the normal sign-in password. |
| `SMTP_FROM` | A sender address accepted/verified by your mail provider |
| `APP_URL` | Your final production origin, e.g. `https://your-project.vercel.app`, with no trailing slash |
| `CRON_SECRET` | A random secret of 32+ characters, also used by your scheduler |
| `DEV_OTP_LOG` | `false` in production |

MongoDB needs a database user with read/write access to the selected database and Atlas Network Access that allows the deployment to connect. Configure allowed outbound addresses or the Atlas/Vercel integration. If using a broad network allowlist for dynamic hosting, retain strong credentials and TLS. JSON-file storage is intentionally refused on Vercel: serverless disk is not the database.

Cloudinary uploads use a signed request scoped to the authenticated user's note. Files go directly from the browser to Cloudinary, avoiding the Vercel request-body limit. Supported images: JPEG, PNG, WebP, GIF and AVIF, up to 10 MB in the UI. Cloudinary public delivery URLs are stored in Markdown; these images are not private attachments. An optional signed preset can enforce your account's upload-size restrictions server-side.

## 2. Import and deploy

1. Push your source to your own GitHub repository. Include `src/`, `static/`, `server/`, `api/`, `scripts/`, `package.json`, `package-lock.json`, `index.html`, `vite.config.js` and `vercel.json`. Do not include `.env`, `data/`, local screenshots, browser profiles or `node_modules/`.
2. Vercel → Add New Project → import the repository.
3. Set **Root Directory** to `taskify` if the repository contains that folder; use the repository root if you pushed its contents directly.
4. Framework preset: **Other**. Build command: `npm run build`. Output directory: `public`. The checked-in `vercel.json` declares these and routes `/api/*` to `api/index.js`; all other application routes open the SPA.
5. Set the environment variables, deploy, then set `APP_URL` to the resulting domain and redeploy if needed.
6. Open `/api/health`: it should return `status: "ok"` and `storage: "mongodb"`.
7. Sign in with the configured owner email/password. Create a note, format text, upload an image, reload and verify persistence.

Production connections are cached per warm function instance. Notes and task updates use revision checks to prevent concurrent edits from silently overwriting a newer database document. Cross-tab refresh uses polling instead of an in-process WebSocket server.

## 3. Enable reminder emails on Free

Vercel Hobby's built-in cron runs at most once per day, so this configuration intentionally includes **no minute-wise Vercel cron**. For task-time email delivery, use an external scheduler such as cron-job.org:

1. Create a scheduler account and a new HTTP job.
2. URL: `https://YOUR-DOMAIN/api/cron/reminders`.
3. Method: `GET`. Schedule: every minute.
4. Add a request header named `Authorization`, value `Bearer YOUR_CRON_SECRET` (the exact secret configured in Vercel).
5. Disable saving response bodies if your scheduler offers that option. Enable failure alerts.
6. Use Test Run. An authenticated run should return JSON with `sent`, `failed` and `cancelled`; an unauthenticated request should return 401.
7. Create a task with an unfinished todo, set a reminder a few minutes ahead, close the app, and check the account email after the scheduler runs. Check spam and the SMTP provider's delivery logs if needed.

Emails go to the account's own email address. Completed task lists, removed reminders, deleted items and trashed notes are skipped. Jobs persist in MongoDB, are claimed with a lease, retry temporary failures with backoff up to five attempts, and retain their sent status. Delivery depends on the scheduler and mail provider, and is not guaranteed at an exact second. A rare crash after SMTP accepts mail but before sent status is stored can produce a duplicate; SMTP has no universal exactly-once guarantee. The message ID is stable for a reminder.

If Vercel Deployment Protection restricts your production URL, allow the scheduler through using the provider-supported automation bypass, or use a production URL that the job can reach. Keep `CRON_SECRET` enabled either way.

In local `npm start` development, a 30-second timer processes reminders while the server is running and SMTP is configured. On Vercel, the authenticated scheduler endpoint does that work; no background timer is relied upon.

## 4. Move existing local notes to MongoDB

If you have existing local data, migrate **before the first owner login against a new MongoDB database**, so account IDs remain the same:

```powershell
# Set MONGODB_URI and MONGODB_DB in .env first.
npm run migrate:mongo
```

The script leaves the source JSON untouched, skips IDs already present, imports users/notes/tasks and queues their reminders. It stops on an email/username collision with another ID rather than binding notes to the wrong account. If an empty MongoDB owner account was already created, resolve that collision before importing; do not delete accounts holding real data without a backup.

## 5. PWA and checks

HTTPS on the deployed domain enables installation through the browser's Install App/Add to Home Screen action. The shell and fonts are available offline; account APIs are never cached. Remote images and edits still need a connection. This implements email reminders and in-app reminders, not Web Push.

```powershell
npm run build
npm test
npm run test:mongo
npm run test:browser
```

Mongo tests use a temporary real MongoDB server; first run downloads its binary. Browser tests use a temporary database and a mocked Cloudinary provider, so they never upload test files to your real account. SMTP tests deliver only to a local test server. Actual Cloudinary credentials, Atlas networking, real mail-provider delivery and a live Vercel deployment must be checked after you supply the credentials.

Sources: [Vercel Express](https://vercel.com/docs/frameworks/backend/express), [Vercel cron limits](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing), [Vercel cron authentication](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs), [Cloudinary uploads](https://cloudinary.com/documentation/upload_images), [cron-job.org scheduling and custom headers](https://cron-job.org/en/).
Local startup: leave MONGODB_URI empty in .env to use data/database.json. A URI containing YOUR_CLUSTER_HOST is a template, not a working database address. For Atlas, paste the real connection string (with a database user and correctly encoded password). A deployed production instance still requires a valid MongoDB URI; local fallback is never used in production.

Dashboard: open /home?view=dashboard. It includes real summary counts, seven-day creation history, task filters, shared note/task-list groups, a month calendar with agenda and IST clock, a persistent focus timer, and quick creation/reminder/file-import actions. Image upload uses the configured Cloudinary account; Markdown/text import works locally.

Standalone reminders use the MongoDB `events` collection. Task-card due dates are also queued for email; completing a task cancels its pending reminder. Repeating standalone reminders advance to their next date after sending or manual completion. Keep the external reminder scheduler configured on Vercel Free; the UI clock and repeat controls do not run a server scheduler while the app is closed. The migration command includes events as well as users, notes and task lists.
