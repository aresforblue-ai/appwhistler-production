# File Upload System - IPFS/Pinata Documentation

AppWhistler uses **IPFS (InterPlanetary File System)** via **Pinata** for decentralized, permanent file storage. This aligns with the blockchain/truth-tech mission by ensuring uploaded content is immutable and censorship-resistant.

## Why IPFS Instead of S3/R2?

- **Permanent & Immutable** - Files cannot be deleted or altered (truth-preserving)
- **Content-Addressed** - Files identified by cryptographic hash (CID)
- **Decentralized** - No single point of failure or control
- **Cost-Effective** - Pinata free tier: 1GB storage, 100GB bandwidth/month
- **Blockchain-Friendly** - Store IPFS hashes on-chain for verification

## Supported Upload Types

1. **User Avatars** (256x256 WebP)
2. **App Icons** (512x512 WebP)
3. **Fact-Check Images** (up to 1920x1080 WebP)

All uploads include:
- Automatic optimization (WebP conversion, compression)
- Thumbnail generation (128x128)
- File validation (type, size, dimensions)
- IPFS hash storage for verification

## Upload Flow

```
User → REST API → Multer → Image Optimization → IPFS Upload → GraphQL Mutation → Database
```

### Step-by-Step Process

**1. Client uploads file to REST endpoint**
```javascript
POST /api/v1/upload/avatar
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

FormData:
  avatar: <file>
```

**2. Server processes and uploads to IPFS**
- Validates file type (JPEG, PNG, WebP, GIF)
- Checks file size (max 10MB)
- Optimizes image (resize, compress, convert to WebP)
- Generates thumbnail (128x128)
- Uploads both to Pinata IPFS
- Returns IPFS URLs and hashes

**3. Client calls GraphQL mutation to save URL**
```graphql
mutation {
  updateAvatar(
    avatarUrl: "https://gateway.pinata.cloud/ipfs/Qm..."
    thumbnailUrl: "https://gateway.pinata.cloud/ipfs/Qm..."
    ipfsHash: "Qm..."
  ) {
    id
    username
    avatarUrl
    avatarThumbnailUrl
  }
}
```

## API Endpoints

### 1. Upload Avatar

**Endpoint:** `POST /api/v1/upload/avatar`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `avatar` (file) - Image file (JPEG, PNG, WebP, GIF)

**Response:**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully to IPFS",
  "data": {
    "avatarUrl": "https://gateway.pinata.cloud/ipfs/QmXXX...",
    "thumbnailUrl": "https://gateway.pinata.cloud/ipfs/QmYYY...",
    "ipfsHash": "QmXXX...",
    "thumbnailIpfsHash": "QmYYY...",
    "size": 45678
  }
}
```

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const response = await fetch('http://localhost:5000/api/v1/upload/avatar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const result = await response.json();
console.log('Avatar URL:', result.data.avatarUrl);
```

**Example (curl):**
```bash
curl -X POST http://localhost:5000/api/v1/upload/avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "avatar=@/path/to/avatar.jpg"
```

---

### 2. Upload App Icon

**Endpoint:** `POST /api/v1/upload/app-icon`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `icon` (file) - Image file
- `appId` (string) - UUID of the app

**Response:**
```json
{
  "success": true,
  "message": "App icon uploaded successfully to IPFS",
  "data": {
    "iconUrl": "https://gateway.pinata.cloud/ipfs/QmXXX...",
    "thumbnailUrl": "https://gateway.pinata.cloud/ipfs/QmYYY...",
    "ipfsHash": "QmXXX...",
    "thumbnailIpfsHash": "QmYYY...",
    "size": 67890
  }
}
```

**Example:**
```javascript
const formData = new FormData();
formData.append('icon', fileInput.files[0]);
formData.append('appId', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');

const response = await fetch('http://localhost:5000/api/v1/upload/app-icon', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});
```

---

### 3. Upload Fact-Check Image

**Endpoint:** `POST /api/v1/upload/fact-check-image`

**Form Data:**
- `image` (file) - Image file
- `factCheckId` (string) - UUID of the fact-check

**Response:**
```json
{
  "success": true,
  "message": "Fact-check image uploaded successfully to IPFS",
  "data": {
    "imageUrl": "https://gateway.pinata.cloud/ipfs/QmXXX...",
    "thumbnailUrl": "https://gateway.pinata.cloud/ipfs/QmYYY...",
    "ipfsHash": "QmXXX...",
    "thumbnailIpfsHash": "QmYYY...",
    "size": 123456,
    "dimensions": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

---

## GraphQL Mutations

### Update Avatar

```graphql
mutation UpdateAvatar($avatarUrl: String!, $thumbnailUrl: String, $ipfsHash: String!) {
  updateAvatar(
    avatarUrl: $avatarUrl
    thumbnailUrl: $thumbnailUrl
    ipfsHash: $ipfsHash
  ) {
    id
    username
    avatarUrl
    avatarThumbnailUrl
    avatarUploadedAt
  }
}
```

**Variables:**
```json
{
  "avatarUrl": "https://gateway.pinata.cloud/ipfs/QmXXX...",
  "thumbnailUrl": "https://gateway.pinata.cloud/ipfs/QmYYY...",
  "ipfsHash": "QmXXX..."
}
```

---

## File Validation

### Allowed File Types
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

### Size Limits
- **Maximum file size:** 10MB
- **Avatar dimensions:** 256x256 (auto-resized)
- **App icon dimensions:** 512x512 (auto-resized)
- **Fact-check images:** Max 1920x1080 (preserves aspect ratio)
- **Thumbnails:** 128x128 (auto-generated)

### Image Optimization

All images are automatically optimized:

1. **Format Conversion** - Converted to WebP for 25-35% smaller file sizes
2. **Compression** - Quality set to 85 (avatars/images) or 75 (thumbnails)
3. **Resizing** - Intelligently resized to target dimensions
4. **Cropping** - Centered crop with `fit: cover` strategy

**Before/After Example:**
- Original: 4MB JPEG (3000x3000)
- Optimized: 45KB WebP (256x256)
- **Reduction: 98.9%**

---

## Security Features

### 1. Authentication Required
- All upload endpoints require valid JWT token
- Users can only upload for their own account

### 2. Rate Limiting
- **10 uploads per 15 minutes** per user
- Admins exempt from rate limiting

### 3. File Validation
- MIME type checking
- File size limits (10MB max)
- Magic number verification (prevents fake extensions)

### 4. Upload Tracking
- Every upload logged with:
  - Upload ID (unique identifier)
  - User ID
  - IP address
  - User agent
  - Timestamp

### 5. IPFS Content Verification
- Files identified by cryptographic hash (CID)
- Content cannot be altered without changing hash
- Immutable audit trail

---

## Database Schema

The `users` table includes:

```sql
avatar_url TEXT                    -- IPFS gateway URL (256x256)
avatar_thumbnail_url TEXT          -- Thumbnail URL (128x128)
avatar_ipfs_hash VARCHAR(100)      -- IPFS hash (CID) for verification
avatar_thumbnail_ipfs_hash VARCHAR(100)
avatar_uploaded_at TIMESTAMP       -- Upload timestamp
```

**Example Query:**
```sql
SELECT username, avatar_url, avatar_ipfs_hash, avatar_uploaded_at
FROM users
WHERE avatar_url IS NOT NULL
ORDER BY avatar_uploaded_at DESC;
```

---

## IPFS Gateway URLs

AppWhistler uses Pinata's public gateway:

**Format:** `https://gateway.pinata.cloud/ipfs/{CID}`

**Example:** `https://gateway.pinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`

### Dedicated Gateway (Optional)

For production, configure a dedicated gateway:

1. Create dedicated gateway in Pinata dashboard
2. Update `.env`:
   ```bash
   PINATA_DEDICATED_GATEWAY=https://appwhistler.mypinata.cloud
   ```
3. Use dedicated gateway for faster, more reliable access

---

## Error Handling

### Common Errors

**1. File Too Large (413)**
```json
{
  "error": "File too large",
  "message": "Maximum file size is 10MB"
}
```

**2. Invalid File Type (400)**
```json
{
  "error": "Upload validation failed",
  "message": "Invalid file type. Allowed types: image/jpeg, image/png, image/webp, image/gif"
}
```

**3. Rate Limit Exceeded (429)**
```json
{
  "error": "Too many uploads",
  "message": "Upload rate limit exceeded. Please try again later."
}
```

**4. Unauthorized (401)**
```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to upload files"
}
```

**5. IPFS Upload Failed (500)**
```json
{
  "error": "Upload failed",
  "message": "Failed to upload to IPFS: Connection timeout"
}
```

---

## Testing File Uploads

### 1. Test Avatar Upload (REST)

```bash
# 1. Login to get JWT token
TOKEN=$(curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(input: {email: \"test@example.com\", password: \"password123\"}) { token } }"}' \
  | jq -r '.data.login.token')

# 2. Upload avatar
curl -X POST http://localhost:5000/api/v1/upload/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@avatar.jpg"
```

### 2. Test GraphQL Mutation

```graphql
# After uploading, save to database
mutation {
  updateAvatar(
    avatarUrl: "https://gateway.pinata.cloud/ipfs/QmXXX"
    thumbnailUrl: "https://gateway.pinata.cloud/ipfs/QmYYY"
    ipfsHash: "QmXXX"
  ) {
    username
    avatarUrl
    avatarUploadedAt
  }
}
```

### 3. Verify Upload

```bash
# Check IPFS file is accessible
curl https://gateway.pinata.cloud/ipfs/QmXXX > downloaded.webp
file downloaded.webp
# Output: downloaded.webp: Web/P image
```

---

## Troubleshooting

### Problem: "Pinata not configured" error

**Solution:**
1. Check `.env` file has valid Pinata credentials
2. Get API key from [Pinata Dashboard](https://app.pinata.cloud/developers/api-keys)
3. Add to `.env`:
   ```bash
   PINATA_API_KEY=your_api_key_here
   PINATA_SECRET_KEY=your_secret_key_here
   ```

### Problem: Uploads timing out

**Causes:**
- Large file size (>10MB)
- Slow internet connection
- Pinata API issues

**Solutions:**
- Compress images before upload
- Check Pinata status: https://status.pinata.cloud
- Increase timeout in `ipfsUpload.js` (default: 30s)

### Problem: Images not displaying

**Causes:**
- IPFS gateway blocked by firewall/VPN
- Content not yet propagated across IPFS network

**Solutions:**
- Try alternative gateway: `https://ipfs.io/ipfs/{CID}`
- Wait 1-2 minutes for propagation
- Use dedicated Pinata gateway

### Problem: "Invalid file type" despite correct file

**Cause:** File extension doesn't match actual file content

**Solution:**
- Use actual image files (not renamed .txt files)
- Verify MIME type: `file --mime-type image.jpg`

---

## Production Checklist

Before going live:

- [ ] Pinata API keys configured (not test/dev keys)
- [ ] Dedicated gateway set up for faster access
- [ ] Rate limits adjusted for production traffic
- [ ] File size limits appropriate for use case
- [ ] Image optimization quality reviewed
- [ ] Tested upload flow end-to-end
- [ ] IPFS gateway URLs tested from multiple locations
- [ ] Error handling tested (large files, wrong types, etc.)
- [ ] Upload tracking/logging configured
- [ ] Backup strategy for IPFS hashes (database backups)

---

## Cost Estimation

### Pinata Free Tier
- **Storage:** 1GB
- **Bandwidth:** 100GB/month
- **Files:** Unlimited
- **Cost:** $0/month

### Example Usage (1000 users)
- **Avatars:** 1000 × 45KB = 45MB storage
- **Monthly views:** 1000 users × 10 pageviews × 45KB = 450MB bandwidth
- **Result:** Well within free tier

### Pinata Paid Plans (if needed)
- **Picnic:** $20/month - 100GB storage, 1TB bandwidth
- **Yacht Club:** $100/month - 1TB storage, 10TB bandwidth

---

## Future Enhancements

1. **Video Upload Support** - Add support for short video clips
2. **Batch Upload** - Upload multiple files at once
3. **Progress Tracking** - Real-time upload progress bars
4. **CDN Integration** - Cloudflare CDN for faster delivery
5. **Image Filters** - Apply filters/effects before upload
6. **Cropping UI** - Let users crop images before upload
7. **NFT Minting** - Mint uploaded images as NFTs
8. **IPFS Pinning Service** - Use multiple pinning services for redundancy

---

## Related Files

- [src/backend/utils/ipfsUpload.js](../src/backend/utils/ipfsUpload.js) - IPFS upload utility
- [src/backend/middleware/upload.js](../src/backend/middleware/upload.js) - Multer middleware
- [src/backend/routes/upload.js](../src/backend/routes/upload.js) - Upload REST endpoints
- [src/backend/resolvers.js](../src/backend/resolvers.js) - GraphQL mutations
- [src/backend/schema.js](../src/backend/schema.js) - GraphQL schema
- [database/migrations/001_add_avatar_url.sql](../database/migrations/001_add_avatar_url.sql) - Database migration

---

## Support

For Pinata issues:
- [Pinata Documentation](https://docs.pinata.cloud/)
- [Pinata Support](https://support.pinata.cloud/)
- [Pinata Status Page](https://status.pinata.cloud/)

For IPFS issues:
- [IPFS Documentation](https://docs.ipfs.tech/)
- [IPFS Community Forum](https://discuss.ipfs.tech/)
