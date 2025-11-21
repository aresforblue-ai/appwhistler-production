# Video Frame Extraction Instructions

This guide will help you extract PNG frames from your video files for use in the AppWhistler application.

## Prerequisites

1. **FFmpeg** must be installed on your Windows machine:
   - Download from: https://ffmpeg.org/download.html
   - Or install via Chocolatey: `choco install ffmpeg`
   - Or install via winget: `winget install FFmpeg.FFmpeg`

2. Verify FFmpeg is installed by running in PowerShell:
   ```powershell
   ffmpeg -version
   ```

## Step-by-Step Instructions

### 1. Copy Video Files

Copy your three video files from `C:\Users\tyler\Videos\` to the project:

```powershell
# In PowerShell, from your project root (C:\appwhistler-production)
Copy-Item "C:\Users\tyler\Videos\AppWhistler.mp4" -Destination ".\public\assets\videos\"
Copy-Item "C:\Users\tyler\Videos\GovWhistler.mp4" -Destination ".\public\assets\videos\"
Copy-Item "C:\Users\tyler\Videos\NewsWhistler.mp4" -Destination ".\public\assets\videos\"
```

### 2. Extract PNG Frames

Run the extraction script:

```powershell
# From project root
node scripts/extract-frames.js
```

This will create three PNG files in `public/assets/images/`:
- `appwhistler-logo.png` - Main application logo
- `govwhistler-badge.png` - GovWhistler "Coming Soon" badge
- `newswhistler-badge.png` - NewsWhistler "Coming Soon" badge

### 3. Verify Extraction

Check that the images were created:

```powershell
Get-ChildItem .\public\assets\images\
```

You should see all three PNG files listed.

## Customization

If you want to extract frames from a different timestamp in the video, edit `scripts/extract-frames.js` and change the `timestamp` value:

```javascript
{
  input: 'AppWhistler.mp4',
  output: 'appwhistler-logo.png',
  timestamp: '00:00:02' // Changed from 1 second to 2 seconds
}
```

## Troubleshooting

### "FFmpeg is not installed"
- Make sure ffmpeg is installed and added to your system PATH
- Restart PowerShell after installation
- Try running `ffmpeg -version` to verify

### "Video file not found"
- Make sure you copied the video files to `public/assets/videos/`
- Check the file names match exactly (case-sensitive)

### Poor image quality
- Edit the script and change `-q:v 2` to `-q:v 1` for even higher quality
- Lower numbers = higher quality (range: 1-31)

## Next Steps

After extracting the frames, the frontend will automatically display:
- AppWhistler logo in the header
- GovWhistler and NewsWhistler "Coming Soon" badges at the bottom of the page

Restart your development server to see the changes:
```powershell
npm run dev
```
