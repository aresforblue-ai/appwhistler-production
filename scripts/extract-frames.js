// scripts/extract-frames.js
// Script to extract PNG frames from video files for branding

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const VIDEOS_DIR = path.join(__dirname, '..', 'public', 'assets', 'videos');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'assets', 'images');

const videos = [
  {
    input: 'AppWhistler.mp4',
    output: 'appwhistler-logo.png',
    description: 'Main logo',
    timestamp: '00:00:01' // Extract frame at 1 second
  },
  {
    input: 'GovWhistler.mp4',
    output: 'govwhistler-badge.png',
    description: 'GovWhistler coming soon badge',
    timestamp: '00:00:01'
  },
  {
    input: 'NewsWhistler.mp4',
    output: 'newswhistler-badge.png',
    description: 'NewsWhistler coming soon badge',
    timestamp: '00:00:01'
  }
];

// Ensure directories exist
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  console.log('✅ Created videos directory:', VIDEOS_DIR);
}

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  console.log('✅ Created images directory:', IMAGES_DIR);
}

console.log('\n📹 Video Frame Extractor\n');
console.log('This script will extract PNG frames from your video files.\n');

// Check if ffmpeg is installed
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  console.log('✅ FFmpeg is installed\n');
} catch (error) {
  console.error('❌ FFmpeg is not installed!');
  console.error('\nPlease install FFmpeg:');
  console.error('Windows: Download from https://ffmpeg.org/download.html');
  console.error('Or use chocolatey: choco install ffmpeg');
  console.error('Or use winget: winget install FFmpeg.FFmpeg\n');
  process.exit(1);
}

// Process each video
let successCount = 0;
let failCount = 0;

videos.forEach((video, index) => {
  const inputPath = path.join(VIDEOS_DIR, video.input);
  const outputPath = path.join(IMAGES_DIR, video.output);

  console.log(`[${index + 1}/${videos.length}] Processing ${video.description}...`);
  console.log(`  Input:  ${inputPath}`);
  console.log(`  Output: ${outputPath}`);

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    console.log(`  ⚠️  Video file not found. Please copy ${video.input} to ${VIDEOS_DIR}`);
    failCount++;
    console.log();
    return;
  }

  try {
    // Extract frame using ffmpeg
    // -ss: seek to timestamp
    // -i: input file
    // -frames:v 1: extract only one frame
    // -q:v 2: high quality (2 is very high quality, 31 is lowest)
    const command = `ffmpeg -ss ${video.timestamp} -i "${inputPath}" -frames:v 1 -q:v 2 -y "${outputPath}"`;

    execSync(command, { stdio: 'ignore' });

    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`  ✅ Extracted successfully (${(stats.size / 1024).toFixed(2)} KB)`);
      successCount++;
    } else {
      console.log(`  ❌ Failed to create output file`);
      failCount++;
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    failCount++;
  }

  console.log();
});

// Summary
console.log('━'.repeat(60));
console.log('Summary:');
console.log(`  ✅ Successful: ${successCount}`);
console.log(`  ❌ Failed: ${failCount}`);
console.log('━'.repeat(60));

if (successCount > 0) {
  console.log('\n🎉 Frame extraction complete!');
  console.log('\nExtracted images are located in:');
  console.log(`  ${IMAGES_DIR}`);
  console.log('\nYou can now use these images in your application.');
} else {
  console.log('\n⚠️  No frames were extracted.');
  console.log('\nNext steps:');
  console.log('1. Copy your video files to:');
  console.log(`   ${VIDEOS_DIR}`);
  console.log('2. Run this script again: node scripts/extract-frames.js');
}
