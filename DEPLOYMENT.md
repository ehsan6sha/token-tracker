# Deploying to GitHub Pages

This guide shows how to deploy the Sales Tracker app to GitHub Pages.

## Prerequisites

- GitHub repository created at `https://github.com/YOUR_USERNAME/sales-tracker`
- Node.js and npm installed
- Code pushed to GitHub

## Setup Steps

### 1. Update package.json

Replace `YOUR_GITHUB_USERNAME` in `package.json` with your actual GitHub username:

```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/sales-tracker"
```

### 2. Install dependencies

```bash
npm install
```

This will install `gh-pages` which is already added to devDependencies.

### 3. Build and Deploy

Run the deploy command:

```bash
npm run deploy
```

This will:
1. Build the app (`npm run build`)
2. Deploy the `dist` folder to the `gh-pages` branch
3. Push to GitHub

### 4. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
4. Click **Save**

### 5. Access Your App

After a few minutes, your app will be live at:
```
https://YOUR_GITHUB_USERNAME.github.io/sales-tracker
```

## Important Notes

### API Keys
⚠️ **Security Warning**: Your Alchemy API key will be visible in the deployed app's JavaScript bundle.

**Recommendations:**
1. Use a **separate API key** for production with rate limits
2. Set up **allowed origins** in Alchemy dashboard to restrict to your GitHub Pages domain
3. Consider using a backend proxy for API calls in production

### Environment Variables
For better security, you can:
1. Create a simple backend (Vercel/Netlify Functions)
2. Store API keys server-side
3. Have the frontend call your backend, which then calls Alchemy

### LocalStorage
The app uses localStorage for:
- API configuration
- Wallet labels
- Analysis history

This data stays in the user's browser and is not shared.

## Updating the Deployment

To update your deployed app:

```bash
npm run deploy
```

This rebuilds and redeploys automatically.

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to the `public` folder with your domain:
   ```
   yourdomain.com
   ```

2. Configure DNS:
   - Add a CNAME record pointing to `YOUR_USERNAME.github.io`

3. In GitHub Settings → Pages, enter your custom domain

## Troubleshooting

### Blank page after deployment
- Check browser console for errors
- Verify `base: '/sales-tracker/'` in `vite.config.ts` matches your repo name
- Ensure `homepage` in `package.json` is correct

### 404 errors
- Make sure GitHub Pages is enabled and using `gh-pages` branch
- Wait a few minutes for deployment to complete
- Clear browser cache

### API not working
- Check Alchemy API key is configured in the app
- Verify API key has correct permissions
- Check browser console for CORS errors

## Alternative Hosting Options

If GitHub Pages doesn't meet your needs:

### Vercel (Recommended for production)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Cloudflare Pages
- Connect GitHub repo in Cloudflare dashboard
- Build command: `npm run build`
- Output directory: `dist`

These platforms support:
- Environment variables (secure API keys)
- Serverless functions (API proxy)
- Custom domains
- Automatic deployments on git push

## Security Best Practices for Production

1. **Never commit API keys** to git
2. **Use environment variables** for sensitive data
3. **Implement rate limiting** on API calls
4. **Add domain restrictions** in Alchemy dashboard
5. **Consider a backend proxy** for API calls
6. **Use HTTPS** (GitHub Pages provides this automatically)

## Development vs Production

### Development (localhost)
```bash
npm run dev
```
- Uses `http://localhost:5173`
- API keys from localStorage
- Hot reload enabled

### Production (GitHub Pages)
```bash
npm run deploy
```
- Uses `https://YOUR_USERNAME.github.io/sales-tracker`
- API keys from localStorage (user must configure)
- Optimized build

## Monitoring

After deployment, monitor:
- Alchemy API usage in dashboard
- Browser console for errors
- GitHub Pages build status

## Support

For issues:
1. Check browser console
2. Verify API configuration
3. Test on localhost first
4. Check GitHub Actions logs (if using workflows)
