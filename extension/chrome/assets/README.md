# Extension Icons

## Quick Icon Generation

### Option 1: Use Emoji Favicon (Easiest)
1. Go to: https://favicon.io/emoji-favicons/trumpet/
2. Download ZIP
3. Rename files:
   - `favicon-16x16.png` → `whistle-16.png`
   - `favicon-32x32.png` → `whistle-48.png`
   - `android-chrome-192x192.png` → `whistle-128.png`
4. Place in this directory

### Option 2: Use HTML Generator
1. Open `generate-icons.html` in browser
2. Right-click each canvas
3. Save as PNG with correct name

### Option 3: Use ImageMagick
```bash
# If you have a whistle.png image:
convert whistle.png -resize 16x16 whistle-16.png
convert whistle.png -resize 48x48 whistle-48.png
convert whistle.png -resize 128x128 whistle-128.png
```

## Required Files
- `whistle-16.png` (16x16)
- `whistle-48.png` (48x48)
- `whistle-128.png` (128x128)

## Temporary Placeholders
If you need to test immediately, create simple colored squares:
```bash
# Blue square placeholders
convert -size 16x16 xc:#3b82f6 whistle-16.png
convert -size 48x48 xc:#3b82f6 whistle-48.png
convert -size 128x128 xc:#3b82f6 whistle-128.png
```
