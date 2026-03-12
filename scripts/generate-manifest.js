const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const MANIFEST_PATH = path.join(POSTS_DIR, 'manifest.json');

function parseFrontmatter(content) {
  const fm = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return fm;

  const lines = match[1].split('\n');
  for (const line of lines) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      fm[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return fm;
}

function generateSlug(headline, filename) {
  if (headline) {
    return headline
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  return filename.replace('.md', '');
}

function generateManifest() {
  const years = fs.readdirSync(POSTS_DIR).filter(item => {
    return fs.statSync(path.join(POSTS_DIR, item)).isDirectory();
  });

  const posts = [];

  for (const year of years) {
    const yearDir = path.join(POSTS_DIR, year);
    const files = fs.readdirSync(yearDir).filter(file => file.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(yearDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = parseFrontmatter(content);
      
      const slug = fm.slug || generateSlug(fm.headline, file);
      
      posts.push({
        slug,
        year,
        path: `${year}/${file}`
      });
    }
  }

  posts.sort((a, b) => b.slug.localeCompare(a.slug));

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(posts, null, 2) + '\n');
  console.log(`Generated manifest.json with ${posts.length} posts`);
}

generateManifest();
