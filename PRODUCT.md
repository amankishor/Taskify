# Product
<!-- impeccable:product-schema 1 -->
## Platform
web
## Users
Aman is evaluating a personal notes and tasks workspace. Super account email supplied by the user and kept in .env. A full multi-user administration console was not requested in the clarification response.
## Product Purpose
Capture notes, write Markdown, keep task lists, and organize personal work.
## Operating Context
Local Windows workspace, Node backend, browser and installable PWA. A direct configured email/password account avoids OTP during evaluation; regular accounts retain email verification.
## Capabilities and Constraints
Preserve notes, search, Markdown write/preview/split/import/export, automatic saves, favorites, archive, trash/restore, reminder dates, task completion and importance, theme switching, and live updates. Existing API and durable JSON data remain compatible. Credentials stay server-side. Closed-app push notifications are outside the current implementation.
## Brand Commitments
NotesNexa name retained. User explicitly requests cream, black, orange; supplied GetLayers, Impeccable gallery, Emil Kowalski and Taste Skill references. User delegated the detailed aesthetic choice, provided it looks good.
## Evidence on Hand
Existing compiled replica and backend, original public reference assets, gallery captures in ../reference. No testimonials, customer figures, ranking or performance claims supplied.
## Product Principles
Keep writing and task actions fast. Preserve user data. Design for mobile and keyboard use. Decorative motion must have reduced-motion and fallback states.

## Dashboard and organization
User requested a reference-inspired dashboard in the established palette, plus persistent custom groups for notes and task lists. Default groups: Personal, Work, Others. Existing items remain intact and appear under Others until moved.

## Reference-based collection pages
Notes retain Markdown editing and organization behind the new card layout. Individual tasks now persist status (To Do, In Progress, Review, Done), progress, priority and due date. Existing task lists are retained at /task?lists=1. Standalone reminders are user-scoped in the events collection and share the reminder view with note/list/task dates. Repeats support one-time, daily, weekly and Mon?Fri. Email opt-out is respected; a configured SMTP provider and running scheduler are required for email delivery.
