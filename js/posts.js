const PostLoader = {
  async fetchPosts() {
    try {
      const response = await fetch('posts/manifest.json');
      if (!response.ok) {
        console.error('Failed to load manifest.json');
        return [];
      }
      const files = await response.json();
      const posts = [];

      for (const file of files) {
        const post = await this.fetchPost(file.path);
        if (post) posts.push(post);
      }

      posts.sort((a, b) => new Date(b.date) - new Date(a.date));
      return posts;
    } catch (e) {
      console.error('Failed to fetch posts:', e);
      return [];
    }
  },

  async fetchPost(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) return null;

      const content = await response.text();
      return this.parsePost(content, path);
    } catch (e) {
      console.error(`Failed to load post: ${path}`, e);
      return null;
    }
  },

  parsePost(content, path) {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) return null;

    const frontmatter = this.parseFrontmatter(fmMatch[1]);
    const markdown = fmMatch[2];
    const slug = path.split('/').pop().replace('.md', '');

    return {
      slug,
      headline: frontmatter.headline || 'Untitled',
      date: frontmatter.date || '',
      datetime: frontmatter.datetime || '',
      readTime: frontmatter.readTime || '5 min read',
      teaser: frontmatter.teaser || '',
      content: marked.parse(markdown),
      path
    };
  },

  parseFrontmatter(text) {
    const fm = {};
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        fm[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
    return fm;
  },

  renderPostList(posts, container) {
    if (!posts.length) {
      container.innerHTML = '<p>No posts yet.</p>';
      return;
    }

      container.innerHTML = posts.map(post => `
        <li>
          <div class="post-item">
            <a href="${post.path.replace('.md', '').replace(/^\//, '')}" class="post-link">
            <h3>${post.headline}</h3>
          </a>
          <div class="post-meta">
            <span class="date">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="7" width="16" height="14" rx="2"></rect>
                <path d="M16 3v4"></path>
                <path d="M8 3v4"></path>
                <path d="M4 11h16"></path>
              </svg>
              <time datetime="${post.datetime}">${this.formatDate(post.date)}</time>
            </span>
            <span class="read-time">- ${post.readTime}</span>
          </div>
          <p>${post.teaser}</p>
        </div>
      </li>
    `).join('');
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
  },

  async loadPostPage() {
    const path = window.location.pathname;
    // Match /webproj/posts/2026/openclaw or /posts/2026/openclaw
    const match = path.match(/^(?:\/webproj)?\/posts\/(\d{4})\/([^/]+)$/);
    if (!match) return null;

    const post = await this.fetchPost(`posts/${match[1]}/${match[2]}.md`);
    if (!post) return null;

    document.title = post.headline;
    return post;
  }
};

if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true
  });
}
