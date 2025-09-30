# Setup Instructions

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 18
- TypeScript
- Ethers.js (for blockchain interaction)
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)

### 2. Configure for GitHub Pages (Important!)

Before deploying, update the `base` path in `vite.config.ts` to match your repository name:

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/your-repository-name/', // Change this!
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

For example, if your repo is at `github.com/username/token-tracker`, set:
```typescript
base: '/token-tracker/',
```

If deploying to a custom domain or root, use:
```typescript
base: '/',
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5173

### 4. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

### 5. Preview Production Build

```bash
npm run preview
```

## Deployment to GitHub Pages

### Method 1: Automatic Deployment (Recommended)

1. Push your code to GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Enable GitHub Pages:
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Build and deployment", select **GitHub Actions** as the source
   - The workflow file `.github/workflows/deploy.yml` is already configured

3. Every push to `main` will automatically deploy to GitHub Pages

4. Your site will be available at:
   `https://yourusername.github.io/your-repo-name/`

### Method 2: Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting provider

## Project Structure

```
sales-tracker/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment
├── public/
│   └── vite.svg               # Favicon
├── src/
│   ├── components/
│   │   ├── AnalysisForm.tsx   # Main analysis form
│   │   ├── ConfigurationModal.tsx  # API config
│   │   ├── ResultsView.tsx    # Results display
│   │   └── WalletLabelsModal.tsx   # Wallet labeling
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   ├── utils/
│   │   ├── blockchain.ts      # Blockchain service
│   │   ├── storage.ts         # LocalStorage utils
│   │   └── tracker.ts         # Token tracking logic
│   ├── App.tsx                # Main app component
│   ├── index.css              # Global styles
│   ├── main.tsx               # Entry point
│   └── vite-env.d.ts          # Vite types
├── .eslintrc.cjs              # ESLint config
├── .gitignore                 # Git ignore rules
├── index.html                 # HTML template
├── package.json               # Dependencies
├── postcss.config.js          # PostCSS config
├── tailwind.config.js         # Tailwind config
├── tsconfig.json              # TypeScript config
├── tsconfig.node.json         # TypeScript node config
├── vite.config.ts             # Vite config
├── README.md                  # Documentation
├── QUICKSTART.md              # Quick start guide
└── SETUP.md                   # This file
```

## Environment Variables

This app doesn't use environment variables. All configuration (API keys, wallet labels) is stored in the browser's localStorage for security and convenience.

**Important**: API keys are stored locally in your browser and never sent to any server except the blockchain RPC provider you configure.

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Troubleshooting

### Build Errors

If you get TypeScript errors:
```bash
npm run build -- --mode development
```

### Port Already in Use

If port 5173 is busy:
```bash
npm run dev -- --port 3000
```

### Module Not Found

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### GitHub Pages 404

Make sure:
1. The `base` path in `vite.config.ts` matches your repo name
2. GitHub Pages is enabled in repository settings
3. The workflow has run successfully (check Actions tab)

## Development Tips

### Hot Module Replacement

Vite provides instant hot reload. Changes to components will update without full page refresh.

### TypeScript Strict Mode

The project uses strict TypeScript. This catches errors early but may require explicit typing.

### Tailwind CSS

Use Tailwind utility classes for styling. The config includes custom colors for the dark theme.

### Adding New Features

1. Create components in `src/components/`
2. Add types in `src/types/index.ts`
3. Add utilities in `src/utils/`
4. Import and use in `App.tsx`

## Performance Optimization

The app is optimized for:
- **Code splitting**: Vite automatically splits code
- **Tree shaking**: Unused code is removed
- **Lazy loading**: Components load on demand
- **Caching**: API responses can be cached
- **Block limits**: Respects RPC provider limits

## Security Notes

- API keys are stored in localStorage (browser only)
- No backend server required
- All blockchain queries go directly to your RPC provider
- No data is sent to third parties
- Open source and auditable

## Support

For issues or questions:
1. Check the README.md
2. Check the QUICKSTART.md
3. Open an issue on GitHub
4. Review the code - it's well commented!

## License

MIT License - Free to use and modify
