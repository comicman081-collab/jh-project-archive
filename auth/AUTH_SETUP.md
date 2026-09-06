# JH PROJECT ARCHIVE — Zero-cost member auth setup

This build uses **Firebase Authentication + Cloud Firestore on the Firebase Spark plan**. Do not attach a billing account. No GitHub Actions are required for auth.

## 1. Create the free Firebase project

1. Firebase Console → Create project.
2. Keep the project on **Spark (no-cost)**. Do **not** enable Blaze / Cloud Billing.
3. Analytics is not required.
4. Add a **Web app** named `JH Project Archive`.
5. Copy the Web config into `jh-project-archive/auth/firebase-config.js`.

The Firebase Web config (`apiKey`, `authDomain`, `projectId`, `appId`) is public application metadata. Do not put private service-account keys in GitHub.

## 2. Enable email/password auth

Firebase Console → Authentication → Sign-in method → enable **Email/Password**.

Authentication → Settings → Authorized domains → add:

- `comicman081-collab.github.io`

The site sends Firebase's built-in **email verification** and **password reset** messages. No separate paid email service is needed.

## 3. Create Firestore in Seoul

Firebase Console → Firestore Database → Create database → Production mode.

Preferred location: **`asia-northeast3` (Seoul)**.

Paste `firestore.rules` from this folder into Firestore → Rules → Publish.

## 4. Bootstrap the administrator once

1. Sign up normally on JH PROJECT ARCHIVE with the owner's account.
2. Firebase Console → Authentication → Users → copy that user's UID.
3. Firestore → create collection `admins` → document ID = the UID.
4. Add field `active` = boolean `true`.

After that, `/jh-project-archive/admin.html` becomes the admin console for that account.

## 5. Full Access codes

The admin console creates a random high-entropy code and stores only its SHA-256 hash in `access_codes/<hash>`.
The plaintext code is displayed once to the administrator. Members enter the code in **My Account**, and Firestore Security Rules permit `fullAccess: true` only when the hashed code exists and is active.

## 6. Member flow

- Sign up: username + nickname + email + password.
- Mandatory checkbox: **14 years or older**.
- Mandatory privacy consent.
- Firebase creates account and sends verification email.
- Login persistence: Local when “keep me signed in” is checked, browser-session otherwise.
- Password forgotten: Firebase sends reset email.
- Full Access is stored on the member profile and survives future logins.
- Account deletion removes the username/profile and Firebase Auth user after recent-password reauthentication.

## 7. Free-only guardrail

Keep Firebase on **Spark** and do not link Cloud Billing. The site is intentionally designed to stop at free quotas rather than become metered billing.
