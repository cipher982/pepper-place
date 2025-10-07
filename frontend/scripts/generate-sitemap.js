const fs = require('fs');
const path = require('path');

/**
 * Generates sitemap.xml from manifest.json
 *
 * Usage:
 *   node generate-sitemap.js [manifest-path] [base-url]
 *
 * Defaults:
 *   manifest-path: ./public/manifest.json
 *   base-url: https://pepperplace.com
 */

const manifestPath = process.argv[2] || './public/manifest.json';
const baseUrl = process.argv[3] || process.env.PUBLIC_URL || 'https://pepperplace.com';
const outputPath = './public/sitemap.xml';

function generateSitemap() {
  // Check if manifest exists
  if (!fs.existsSync(manifestPath)) {
    console.warn(`⚠️  Manifest not found at ${manifestPath}`);
    console.log('Creating basic sitemap without photo data...');

    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
</urlset>`;

    fs.writeFileSync(outputPath, basicSitemap);
    console.log(`✅ Generated basic sitemap at ${outputPath}`);
    return;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const urls = [
      {
        loc: baseUrl,
        changefreq: 'weekly',
        priority: 1.0,
        lastmod: new Date().toISOString().split('T')[0]
      }
    ];

    // If manifest has timeline data, add year pages
    if (manifest.timeline && Array.isArray(manifest.timeline)) {
      manifest.timeline.forEach(period => {
        urls.push({
          loc: `${baseUrl}/#year-${period.year}`,
          changefreq: 'monthly',
          priority: 0.8,
          lastmod: new Date().toISOString().split('T')[0]
        });
      });
    }

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
    <lastmod>${url.lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>`;

    fs.writeFileSync(outputPath, xml);
    console.log(`✅ Generated sitemap with ${urls.length} URLs at ${outputPath}`);

    if (manifest.photos && Array.isArray(manifest.photos)) {
      console.log(`   Including ${manifest.photos.length} photos from manifest`);
    }
  } catch (error) {
    console.error('❌ Error generating sitemap:', error.message);
    process.exit(1);
  }
}

generateSitemap();
