# JH PROJECT ARCHIVE

Personal project library for games, calculators, tools, and experiments.

- Production site target: `https://comicman081-collab.github.io/jh-project-archive/`
- Authentication: Firebase Authentication (Email/Password)
- Member profiles/access: Cloud Firestore
- Registration: age 14+ confirmation and privacy consent required
- Hosting target: GitHub Pages, `main` / `/(root)`
- Cost policy: free tiers only; no paid domain, paid hosting, or paid database

The Firebase web configuration stored in `auth/firebase-config.js` is browser-side Firebase connection metadata. Access control is enforced with Firebase Authentication and the Firestore rules in `auth/firestore.rules`.
