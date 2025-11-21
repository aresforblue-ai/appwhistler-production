# Branding Setup Guide

This guide explains how to integrate your extracted video frames into the AppWhistler frontend.

## Current Status

✅ **Completed:**
- Created directory structure (`public/assets/images/` and `public/assets/videos/`)
- Created frame extraction script (`scripts/extract-frames.js`)
- Implemented "Coming Soon" section for GovWhistler and NewsWhistler
- Currently using emoji placeholders (🛡️, 🏛️, 📰)

⏳ **Next Steps:**
- Copy video files to project
- Extract PNG frames using the script
- Update frontend to use extracted images

---

## Step 1: Copy Video Files and Extract Frames

### 1.1 Copy Videos to Project

In PowerShell (from project root `C:\appwhistler-production`):

```powershell
# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path ".\public\assets\videos"
New-Item -ItemType Directory -Force -Path ".\public\assets\images"

# Copy video files
Copy-Item "C:\Users\tyler\Videos\AppWhistler.mp4" -Destination ".\public\assets\videos\"
Copy-Item "C:\Users\tyler\Videos\GovWhistler.mp4" -Destination ".\public\assets\videos\"
Copy-Item "C:\Users\tyler\Videos\NewsWhistler.mp4" -Destination ".\public\assets\videos\"

# Verify files were copied
Get-ChildItem .\public\assets\videos\
```

### 1.2 Install FFmpeg (if not already installed)

Check if FFmpeg is installed:
```powershell
ffmpeg -version
```

If not installed, install via winget:
```powershell
winget install FFmpeg.FFmpeg
```

Or via Chocolatey:
```powershell
choco install ffmpeg
```

**Important:** Restart PowerShell after installing FFmpeg.

### 1.3 Extract PNG Frames

Run the extraction script:
```powershell
node scripts/extract-frames.js
```

You should see output like:
```
✅ FFmpeg is installed

[1/3] Processing Main logo...
  ✅ Extracted successfully (234.56 KB)

[2/3] Processing GovWhistler coming soon badge...
  ✅ Extracted successfully (189.23 KB)

[3/3] Processing NewsWhistler coming soon badge...
  ✅ Extracted successfully (198.45 KB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
  ✅ Successful: 3
  ❌ Failed: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Frame extraction complete!
```

---

## Step 2: Update Frontend to Use Extracted Images

After extracting the frames, update `src/App.jsx` to use the actual images instead of emojis.

### 2.1 Update AppWhistler Logo (Header)

**Find this code (around line 54-56):**
```jsx
<div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 hover:scale-110 hover:rotate-3">
  <span className="text-2xl animate-pulse">🛡️</span>
  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-xs shadow-lg animate-bounce">✓</div>
</div>
```

**Replace with:**
```jsx
<div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 hover:scale-110 hover:rotate-3">
  <img
    src="/assets/images/appwhistler-logo.png"
    alt="AppWhistler Logo"
    className="w-full h-full object-cover"
  />
  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-xs shadow-lg animate-bounce">✓</div>
</div>
```

### 2.2 Update GovWhistler Badge

**Find this code (around line 194-196):**
```jsx
<div className="w-32 h-32 mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-2xl shadow-emerald-500/50 group-hover:shadow-emerald-500/70 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
  <span className="text-6xl">🏛️</span>
</div>
```

**Replace with:**
```jsx
<div className="w-32 h-32 mb-6 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/50 group-hover:shadow-emerald-500/70 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 bg-white dark:bg-slate-800">
  <img
    src="/assets/images/govwhistler-badge.png"
    alt="GovWhistler"
    className="w-full h-full object-cover"
  />
</div>
```

### 2.3 Update NewsWhistler Badge

**Find this code (around line 222-224):**
```jsx
<div className="w-32 h-32 mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-orange-500/50 group-hover:shadow-orange-500/70 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
  <span className="text-6xl">📰</span>
</div>
```

**Replace with:**
```jsx
<div className="w-32 h-32 mb-6 rounded-2xl overflow-hidden shadow-2xl shadow-orange-500/50 group-hover:shadow-orange-500/70 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 bg-white dark:bg-slate-800">
  <img
    src="/assets/images/newswhistler-badge.png"
    alt="NewsWhistler"
    className="w-full h-full object-cover"
  />
</div>
```

---

## Step 3: Test the Changes

### 3.1 Restart Development Server

If your dev server is running, restart it to ensure new assets are loaded:

```powershell
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### 3.2 Verify in Browser

1. Open http://localhost:3000
2. Check the header logo (top-left) - should show AppWhistler logo
3. Scroll to the bottom - should see GovWhistler and NewsWhistler cards with their badges
4. Test dark mode toggle - images should look good in both themes
5. Hover over the badges - should have smooth animations

---

## Troubleshooting

### Images Not Showing

**Symptom:** Broken image icons or emojis still showing

**Solutions:**
1. Check file paths are correct:
   ```powershell
   Get-ChildItem .\public\assets\images\
   ```
   Should show:
   - `appwhistler-logo.png`
   - `govwhistler-badge.png`
   - `newswhistler-badge.png`

2. Clear browser cache:
   - Chrome: Ctrl+Shift+Delete → Clear cache
   - Or hard refresh: Ctrl+Shift+R

3. Check browser console (F12) for 404 errors

### Image Quality Issues

**Symptom:** Blurry or pixelated images

**Solutions:**
1. Extract at higher quality - edit `scripts/extract-frames.js`:
   ```javascript
   const command = `ffmpeg -ss ${video.timestamp} -i "${inputPath}" -frames:v 1 -q:v 1 -y "${outputPath}"`;
   // Changed -q:v 2 to -q:v 1 for maximum quality
   ```

2. Re-run extraction:
   ```powershell
   node scripts/extract-frames.js
   ```

### Wrong Frame Extracted

**Symptom:** The extracted frame isn't the best one

**Solutions:**
1. Find the best timestamp manually - play video and note the time
2. Update timestamp in `scripts/extract-frames.js`:
   ```javascript
   {
     input: 'AppWhistler.mp4',
     output: 'appwhistler-logo.png',
     timestamp: '00:00:03' // Changed from 00:00:01 to 3 seconds
   }
   ```

3. Re-run extraction

---

## Optional: Image Optimization

For better performance, optimize the extracted PNGs:

### Using Sharp (already installed in backend)

Create `scripts/optimize-images.js`:

```javascript
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'assets', 'images');

const images = ['appwhistler-logo.png', 'govwhistler-badge.png', 'newswhistler-badge.png'];

async function optimizeImages() {
  console.log('🖼️  Optimizing images...\n');

  for (const image of images) {
    const inputPath = path.join(IMAGES_DIR, image);
    const outputPath = path.join(IMAGES_DIR, `optimized-${image}`);

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  ${image} not found, skipping...`);
      continue;
    }

    try {
      await sharp(inputPath)
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);

      const originalSize = fs.statSync(inputPath).size;
      const optimizedSize = fs.statSync(outputPath).size;
      const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

      console.log(`✅ ${image}`);
      console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
      console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(2)} KB`);
      console.log(`   Savings: ${savings}%\n`);

      // Replace original with optimized
      fs.renameSync(outputPath, inputPath);
    } catch (error) {
      console.error(`❌ Failed to optimize ${image}:`, error.message);
    }
  }

  console.log('🎉 Image optimization complete!');
}

optimizeImages();
```

Run it:
```powershell
cd backend
node ../scripts/optimize-images.js
cd ..
```

---

## Future Enhancements

### Adding Links to Sister Apps

When GovWhistler and NewsWhistler launch, update the cards to be clickable:

```jsx
{/* GovWhistler Card - Make it a link */}
<a
  href="https://govwhistler.com"
  target="_blank"
  rel="noopener noreferrer"
  className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/90 to-white/70 dark:from-slate-800/90 dark:to-slate-900/70 backdrop-blur-xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 block"
>
  {/* Rest of the card content */}
</a>
```

### App Store / Play Store Buttons

Replace "Coming Soon" badge with store buttons:

```jsx
<div className="flex gap-3">
  <a
    href="https://apps.apple.com/app/govwhistler"
    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white font-medium text-sm hover:scale-105 transition-all"
  >
    <span>📱</span> App Store
  </a>
  <a
    href="https://play.google.com/store/apps/details?id=com.govwhistler"
    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white font-medium text-sm hover:scale-105 transition-all"
  >
    <span>🤖</span> Play Store
  </a>
</div>
```

---

## Summary

After completing all steps:

✅ Video files copied to `public/assets/videos/`
✅ PNG frames extracted to `public/assets/images/`
✅ Frontend updated to use extracted images
✅ Development server restarted
✅ Changes verified in browser

Your AppWhistler branding is now fully integrated! 🎉
