# NotesNexa

A personal notes/tasks workspace with a cream, black and orange interface, animated sign-in, Markdown and visible rich-text editing, Cloudinary images, MongoDB storage and task-reminder emails.

**Vercel Free setup:** [VERCEL.md](VERCEL.md) has the exact environment variables, deployment settings, migration steps and free scheduler setup. No live deployment or external credentials have been supplied by this project.

## Local run

```powershell
npm install
npm run build
npm start
```

Open http://127.0.0.1:3000. The configured SUPER_EMAIL/SUPER_PASSWORD account opens directly, without OTP. Regular signup verifies email using SMTP; DEV_OTP_LOG is development-only. The existing `.env` is preserved, with new blank MongoDB/Cloudinary variables added. Restart after editing it.

Without MONGODB_URI, development uses the existing JSON file. Vercel/production requires MongoDB. If migrating existing notes, run `npm run migrate:mongo` before starting against a new MongoDB database, as explained in VERCEL.md. The JSON source stays unchanged.

## Editing and images

- **Write:** select text and click Bold/Italic to see real formatting immediately; Ctrl/Cmd+B and Ctrl/Cmd+I work. Headings, lists, code, undo/redo and Markdown paste are supported.
- **Markdown:** edit the raw source; toolbar and keyboard shortcuts insert Markdown formatting.
- **Preview:** styled headings, lists, tables, links, images, code blocks with a copy action and blockquotes. Raw HTML does not execute.
- **Split:** Markdown source and rendered preview together; stacks on narrow screens.
- Import `.md`/`.txt` up to 256 KB; export the note as Markdown. Changes save automatically and expose retry/error state.
- Upload an image (or paste an image in Write mode) using Cloudinary, or insert an HTTPS image URL. Credentials stay server-side. Images are public delivery assets, not private attachments.

## Reminders, PWA and deployment

Reminder emails go to the account's email using SMTP. The durable queue handles leases/retries and skips completed/deleted/removed reminders. Vercel Free needs an external scheduler for minute-wise checks; this is configured in VERCEL.md. No in-process timer or WebSocket server is required on Vercel. Browser refresh/notifications poll the authenticated API.

The PWA installs over HTTPS/localhost and caches the app shell/fonts. Editing, account data and remote images need connectivity. Email reminders can run with the app closed once the scheduler is configured; Web Push is not included.

## Source

- `src/Auth.jsx`, `src/Sculpture.jsx`: animated authentication and optional 3D art, with pause and reduced motion.
- `src/NoteEditor.jsx`, `src/RichText.jsx`: Tiptap visual editing, Markdown source/preview, images and autosave.
- `src/Workspace.jsx`, `src/editors.jsx`: notes/tasks, collections, reminders, mobile navigation and task completion.
- `server/app.js`, `server/store.js`, `server/reminders.js`: API, MongoDB/local development repository and email queue.
- `api/index.js`, `vercel.json`: lazy serverless API initialization and deployment routing.
- `scripts/build.js`, `scripts/build-sw.js`: frontend build and versioned PWA assets.

## Verification

`npm test` checks API/account isolation, durable reminders and actual local SMTP transport. `npm run test:mongo` checks a temporary real MongoDB instance, concurrent updates, cold-instance persistence, Cloudinary signing and protected reminder dispatch. `npm run test:browser` checks visible bold/italic, Markdown/images/import/export, account/task flows, responsive layouts, themes and offline PWA. Cloudinary's external response is mocked in browser tests; real provider delivery is checked only after credentials are added.

Design references remain the user-selected [Impeccable gallery](https://impeccable.style/gallery/view/7425f4a6c67b9b48/), [GetLayers Gravity](https://www.getlayers.ai/layer/gravity-webgl), [Emil Kowalski skills](https://github.com/emilkowalski/skills) and [Taste Skill](https://github.com/Leonxlnx/taste-skill). Source is editable React/Vite with a Node/Express API; the original site's private backend was never copied.
