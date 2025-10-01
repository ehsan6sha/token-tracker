# GitHub Pages 404 Fix

## What I Fixed

The 404 error was caused by a mismatch between the base path in `vite.config.ts` and your actual repository name.

### Changes Made:

1. **Updated `vite.config.ts`**:
   - Changed from hardcoded `base: '/sales-tracker/'`
   - To dynamic: `base: process.env.VITE_BASE_PATH ? '/${process.env.VITE_BASE_PATH}/' : '/'`
   - This automatically uses your repository name

2. **Updated `.github/workflows/deploy.yml`**:
   - Added environment variable: `VITE_BASE_PATH: ${{ github.event.repository.name }}`
   - This passes the repo name to Vite during build

3. **Added `public/.nojekyll`**:
   - Prevents GitHub Pages from ignoring files starting with underscore
   - Required for Vite builds

## How to Deploy

### Commit and push these changes:

```bash
git add .
git commit -m "Fix GitHub Pages 404 error"
git push origin main
```

The GitHub Action will automatically:
1. Build the app with the correct base path
2. Deploy to GitHub Pages

## Verify Deployment

1. **Check GitHub Actions**:
   - Go to your repo → Actions tab
   - Wait for the "Deploy to GitHub Pages" workflow to complete (green checkmark)

2. **Check GitHub Pages Settings**:
   - Go to Settings → Pages
   - Should show: "Your site is live at https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/"

3. **Access Your App**:
   - Click the URL or visit it directly
   - Should load without 404 errors

## Common Issues & Solutions

### Issue 1: Still getting 404 after deployment

**Check:**
- Is the workflow completed successfully? (Green checkmark in Actions tab)
- Is GitHub Pages enabled? (Settings → Pages → Source should be "GitHub Actions")
- Wait 2-3 minutes after deployment completes

**Fix:**
```bash
# Clear browser cache or try incognito mode
# Or force a new deployment:
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

### Issue 2: Assets (CSS/JS) not loading

**Symptoms:**
- Page loads but looks broken
- Console shows 404 for `.js` and `.css` files

**Fix:**
This should be fixed by the changes above. If still happening:
1. Check that `public/.nojekyll` file exists
2. Verify `vite.config.ts` has the dynamic base path

### Issue 3: Wrong repository name in URL

**If your repo is named differently:**

Option A: Update `package.json`:
```json
"homepage": "https://YOUR_USERNAME.github.io/YOUR_ACTUAL_REPO_NAME"
```

Option B: Rename your repository:
1. Go to Settings → General
2. Scroll to "Repository name"
3. Rename to match the URL you want

### Issue 4: Using a custom domain

If you want to use a custom domain (e.g., `myapp.com`):

1. Add `CNAME` file to `public/` folder:
   ```
   myapp.com
   ```

2. Update `vite.config.ts`:
   ```typescript
   base: process.env.VITE_BASE_PATH ? `/${process.env.VITE_BASE_PATH}/` : '/',
   ```
   becomes:
   ```typescript
   base: '/',  // Root path for custom domain
   ```

3. Configure DNS:
   - Add CNAME record pointing to `YOUR_USERNAME.github.io`

4. In GitHub Settings → Pages:
   - Enter your custom domain
   - Enable "Enforce HTTPS"

## Testing Locally

To test the production build locally:

```bash
# Build with production settings
npm run build

# Preview the build
npx vite preview
```

This will serve the built files at `http://localhost:4173` (or similar).

## Alternative: Deploy to Root Domain

If you want your app at `https://YOUR_USERNAME.github.io/` (root, not `/repo-name/`):

1. Rename your repository to `YOUR_USERNAME.github.io`
2. Update `vite.config.ts`:
   ```typescript
   base: '/',
   ```
3. Push changes

## Debugging Checklist

- [ ] GitHub Actions workflow completed successfully
- [ ] GitHub Pages is enabled (Settings → Pages)
- [ ] Source is set to "GitHub Actions" (not a branch)
- [ ] `public/.nojekyll` file exists
- [ ] `vite.config.ts` has dynamic base path
- [ ] Waited 2-3 minutes after deployment
- [ ] Tried in incognito/private browsing mode
- [ ] Checked browser console for specific errors

## GitHub Pages Settings

Your Pages settings should look like this:

```
Build and deployment
├─ Source: GitHub Actions
└─ Custom domain: (empty, unless using custom domain)

Your site is live at:
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

## Need More Help?

1. **Check the Actions log**:
   - Go to Actions tab
   - Click on the latest workflow run
   - Check "Build" and "Deploy" steps for errors

2. **Check browser console**:
   - Open DevTools (F12)
   - Look for 404 errors
   - Note which files are missing

3. **Verify the build**:
   - Download the artifact from Actions
   - Check if `index.html` references correct paths

## Success Indicators

✅ GitHub Action shows green checkmark
✅ Pages settings shows "Your site is live"
✅ Visiting the URL loads the app
✅ No 404 errors in browser console
✅ App functions correctly (can configure API, trace tokens)

## Next Steps After Successful Deployment

1. **Configure your API key** in the deployed app
2. **Test token tracing** with a known transaction
3. **Share the URL** with others
4. **Monitor Alchemy API usage** in your dashboard

Remember: Your Alchemy API key will be visible in the deployed JavaScript. Use a separate key with rate limits for production!
