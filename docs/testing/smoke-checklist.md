# Manual smoke checklist

Run before every merge to `main` that touches UI, services or rules. About 15 minutes. Use only the emulator and the fictional accounts (see [emulator.md](emulator.md)); never test against production.

Setup: `npm run emulators`, `npm run seed`, `npm run dev:emu`, open http://localhost:8090. Check once on desktop (≥1280 px) and once in mobile size (390 × 844 in DevTools, or a phone). Keep the browser console open: any red error counts as a failure.

Report each item as ✓, ✗ (with steps, expected, actual, severity) or "not tested".

## 1. Login and roles
- [ ] `/login` as `coach@ez.test` → lands on `/admin`, dashboard shows 4 athletes, 1 team, today's activity.
- [ ] Logout from the user menu → back to the public site or login; `/admin` now redirects to login.
- [ ] `/login` as `ana@ez.test` → lands on `/athlete`, "Today" shows the swim workout.
- [ ] As Ana, open `/admin` → blocked (redirect, no coach data).
- [ ] Wrong password → clear error message, no crash.

## 2. Coach: assign a workout
- [ ] Dashboard → Quick assign (or Calendar): assign "Bike: endurance Z2" to Ana and Bruno for tomorrow.
- [ ] Calendar shows it on the right day for both.
- [ ] Log in as Ana → it appears under the right day in Home and Calendar (same calendar day, no timezone shift).
- [ ] Team page "Equipe Tri Demo" lists Ana, Bruno and Carla; the group chat opens.

## 3. Athlete: strength session
- [ ] As Ana, open tomorrow's "Força B" → exercises and target sets/reps/rest are listed.
- [ ] Start the session: log 2 sets with reps and load (try a comma decimal, e.g. `42,5`), start and finish a rest timer.
- [ ] Reload mid-session → progress is kept (draft restored).
- [ ] Finish with RPE and a note → workout shows as completed with time and volume.
- [ ] Share to the feed → post shows the summary card; as coach the post and the RPE/note are visible.

## 4. Endurance log
- [ ] As Ana, open today's swim → log distance in metres and time → pace shows per 100 m.
- [ ] Open the activity detail → distance shows in metres (known bug: shows ×1000, see `activityFormat.test.ts`).

## 5. Chat
- [ ] As coach, open Ana's chat (has 1 unread) → unread badge clears; send a message.
- [ ] As Ana, the message appears without reload; reply → coach sees it.
- [ ] Group chat: message from coach reaches Ana and Carla.
- Push is not testable locally (no FCM, no `/api/notify`).

## 6. Feed
- [ ] Like and unlike a post; comment; reply to a comment; delete your own comment.
- [ ] Ana cannot delete or edit Bruno's post from the UI.
- [ ] Notifications bell: Ana sees "like" and "comment" from the coach.

## 7. Public site (logged out)
- [ ] `/`, `/about`, `/contact`, `/blog` load without console errors in EN and PT.
- [ ] Blog lists the 2 published posts, not the draft; an article opens by slug.
- [ ] Testimonials show the 2 approved ones, not Ana's pending one.
- [ ] `/join/demo-invite-token` shows the team join page.
- [ ] Mobile: menu opens and closes, no horizontal scroll.

## Not covered here
Push notifications, Cloudinary photo upload, Vercel functions (`/api/*`), the installed PWA and offline mode. Test those on a preview deploy with the EZ Lead's approval.
