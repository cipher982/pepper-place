# Umami Analytics Setup for Pepper Place

## Deploy Umami on Cube

1. **Generate secrets**:
```bash
# On your local machine
openssl rand -base64 32  # For UMAMI_APP_SECRET
openssl rand -base64 32  # For UMAMI_DB_PASSWORD
```

2. **Create .env file on cube**:
```bash
ssh cube
mkdir -p ~/umami
cat > ~/umami/.env << 'ENVFILE'
UMAMI_APP_SECRET=your-generated-secret-here
UMAMI_DB_PASSWORD=your-generated-password-here
ENVFILE
```

3. **Deploy**:
```bash
# Copy docker-compose file to cube
scp umami-docker-compose.yml cube:~/umami/docker-compose.yml

# Start Umami
ssh cube "cd ~/umami && docker-compose up -d"
```

4. **Access Umami**:
- URL: http://cube-ip:3002 or via Tailscale
- Default login: admin / umami
- **Change password immediately**

5. **Set up Cloudflare tunnel** (optional, for remote access):
```bash
# Or add to your existing tunnel config
# Expose: umami.drose.io → cube:3002
```

---

## Add Tracking to Pepper Place

1. **In Umami UI**:
   - Add Website → pepper.drose.io
   - Copy tracking script

2. **Add to index.html**:
```html
<!-- Add before </head> -->
<script async src="https://umami.drose.io/script.js" data-website-id="your-website-id"></script>
```

3. **Redeploy** pepper-place

---

## What You'll Track

- Page views
- Unique visitors
- Referrers (where visitors come from)
- Geographic data
- Devices/browsers
- Real-time visitors

**Privacy-friendly**: No cookies, no personal data, GDPR compliant

---

## Alternative: Skip Umami, Use Cloudflare

Since pepper.drose.io is under drose.io in Cloudflare:

Cloudflare Analytics already tracks:
- Requests
- Bandwidth
- Geographic distribution
- Bot vs human traffic

**Access**: Cloudflare Dashboard → drose.io → Analytics → Filter by subdomain

This might be enough for a personal project.
