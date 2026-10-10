# CivicLink — Premium Civic Platform Design System (v1)

## Intent
Editorial, trustworthy public-service experience. No invented data, faux-live status charts or testimonials. The design belongs to the CivicLink portfolio prototype and does not claim government affiliation.

## Visual foundations
- Evergreen ink `#193B34` / deep green `#173F35` for navigation and primary actions
- Warm paper `#F7F7F1` and off-white `#FFFEFA` for backgrounds
- Light sage `#DCE7D0` and quiet line `#D8DFD5` for surfaces/separators
- Restrained copper `#BD7452` for editorial emphasis, not error indicators
- Sans-serif `Inter` (already loaded in existing `index.css`) for body/UI; `Georgia` for select display phrases only
- Square-ish 4–5px primary button corners and restrained 1px rules; avoid generic gradients and excessive floating cards
- Accessible keyboard focus and reduced-motion preference, mobile breakpoint at 600px; tablet breakpoint at 890px

## Implementation decisions
- All CSS is scoped under `.cl-shell` to protect legacy Staff/Admin screens while being redesigned separately.
- The landing page does **not** import `mockData.ts`, render fake statistics, claim a live feed, or invent complaint resolution promises.
- Example workflow statuses reference the ASP.NET Core `ComplaintStatus` values: Submitted, UnderReview, InProgress, Resolved. Rejected and Withdrawn are also possible.
- Generic category examples are not treated as an enum. The API receives a category string.
- Links use existing routes `/register`, `/login`, `/about`, `/faq`, `/contact`. Registration/login routes currently simulate actions: finish API integration before public launch.
- The global fake tracking ID input and placeholder public map are deliberately not promoted from the new landing page. The backend currently identifies complaints by authenticated GUID, not a public KMC tracking-code API.
- The main header and footer replace unverified municipal identity, contact details and social links.

## Components and future extension
`PublicLayout` imports the scoped design sheet; `LandingPage` uses semantic sections and existing router/icons. The old `Logo`, auth context, and dashboard components remain intact. Extend the same tokens to Sign-in/Register and Citizen pages after those are wired to backend DTOs.

## Stage 2 checklist (not implemented in this starter)
1. Add `VITE_API_BASE_URL` with typed API client using actual ASP.NET Core DTOs.
2. Replace demo auth with `POST /api/auth/login`, `POST /api/auth/register` and `GET /api/auth/me`.
3. Citizen list -> `/api/complaints/my/paged`; Staff -> `/api/complaints/assigned-to-me/paged`.
4. Remove or disable any unsupported frontend actions (public tracking, anonymous submissions, department management, real-time chat/AI, verification emails) until implemented.
5. Resolve dependency security advisories and consider route-based code splitting.

## Smoke test
From project root (after copying files):

```
cd frontend
npm run build
npm run dev
```

Review desktop (~1440px) and mobile (~390px). Confirm the Login and Register links navigate, footer renders, keyboard focus is visible, and the developer console is clear. Backend integration remains separate.
