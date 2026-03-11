const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const MANIFEST_PATH = path.join(POSTS_DIR, 'manifest.json');

function generateManifest() {
  const years = fs.readdirSync(POSTS_DIR).filter(item => {
    return fs.statSync(path.join(POSTS_DIR, item)).isDirectory();
  });

  const posts = [];

  for (const year of years) {
    const yearDir = path.join(POSTS_DIR, year);
    const files = fs.readdirSync(yearDir).filter(file => file.endsWith('.md'));

    for (const file of files) {
      const slug = file.replace('.md', '');
      posts.push({
        slug,
        year,
        path: `posts/${year}/${file}`
      });
    }
  }

  posts.sort((a, b) => b.slug.localeCompare(a.slug));

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(posts, null, 2) + '\n');
  console.log(`Generated manifest.json with ${posts.length} posts`);
}

generateManifest();
