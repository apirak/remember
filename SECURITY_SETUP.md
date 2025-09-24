# Security Setup for GitHub Pages Deployment

## Step 1: Add GitHub Repository Secrets

ไปที่ GitHub repository Settings → Secrets and variables → Actions และเพิ่ม secrets ต่อไปนี้:

```
FIREBASE_API_KEY = AIzaSyDPQE3fesCq9nN84-zVBYHJRyMUR-pWgLk
FIREBASE_AUTH_DOMAIN = remember-me-c8da6.firebaseapp.com
FIREBASE_PROJECT_ID = remember-me-c8da6
FIREBASE_STORAGE_BUCKET = remember-me-c8da6.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID = 818564421697
FIREBASE_APP_ID = 1:818564421697:web:f2abcf83ca42a9c3978ec0
FIREBASE_MEASUREMENT_ID = G-ZK2QES54E1
```

## Step 2: Update GitHub Actions Workflow

การปรับ `.github/workflows/astro.yml` เพื่อใช้ secrets:

```yaml
- name: Build with Astro
  env:
    PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
    PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
    PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
    PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
    PUBLIC_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
    PUBLIC_FIREBASE_MEASUREMENT_ID: ${{ secrets.FIREBASE_MEASUREMENT_ID }}
  run: |
    ${{ steps.detect-package-manager.outputs.runner }} astro build \
      --site "${{ steps.pages.outputs.origin }}" \
      --base "${{ steps.pages.outputs.base_path }}"
```

## Step 3: Firebase Security Settings

### Domain Authorization
ไปที่ Firebase Console → Authentication → Settings → Authorized domains:
- เพิ่ม GitHub Pages domain: `your-username.github.io`
- ลบ unauthorized domains

### API Key Restrictions  
ไปที่ Google Cloud Console → APIs & Services → Credentials:
- จำกัด API key ให้ใช้ได้เฉพาะ authorized domains
- เปิดใช้เฉพาะ Firebase services ที่จำเป็น

## Step 4: Replace Current Firestore Rules

แทนที่ firestore.rules ด้วยเนื้อหาจาก firestore.rules.secure เพื่อปิดช่องโหว่ด้านความปลอดภัย
