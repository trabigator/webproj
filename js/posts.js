const PostLoader = {
  getPathInfo() {
    const pathname = window.location.pathname;
    const pathParts = pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    
    const isRoot = pathParts.length === 0;
    const isPostsPage = pathParts.includes('posts') && (lastPart === 'index.html' || lastPart === 'posts' || lastPart === '');
    const isSearchPage = pathParts.includes('search') && (lastPart === 'index.html' || lastPart === 'search' || lastPart === '');
    const isAboutPage = pathParts.includes('about') && (lastPart === 'index.html' || lastPart === 'about' || lastPart === '');
    
    return { isRoot, isPostsPage, isSearchPage, isAboutPage, pathParts };
  },

  async fetchPosts() {
    try {
      const { isRoot, isPostsPage, isSearchPage, isAboutPage } = this.getPathInfo();
      const isSubDir = isSearchPage || isAboutPage;
      
      let manifestPath;
      if (isPostsPage) {
        manifestPath = 'manifest.json';
      } else if (isSubDir) {
        manifestPath = '../posts/manifest.json';
      } else {
        manifestPath = 'posts/manifest.json';
      }
      
      const response = await fetch(manifestPath);
      if (!response.ok) {
        console.error('Failed to load manifest.json');
        return [];
      }
      const files = await response.json();
      const posts = [];

      for (const file of files) {
        const post = await this.fetchPost(file.path);
        if (post) {
          post.year = file.year;
          posts.push(post);
        }
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
      const { isRoot, isPostsPage, isSearchPage, isAboutPage } = this.getPathInfo();
      const isSubDir = isSearchPage || isAboutPage;
      
      let fullPath;
      if (isPostsPage) {
        fullPath = path;
      } else if (isSubDir) {
        fullPath = `../posts/${path}`;
      } else {
        fullPath = `posts/${path}`;
      }
      
      const response = await fetch(fullPath);
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

    const { isRoot, isPostsPage, isSearchPage, isAboutPage } = this.getPathInfo();
    const isSubDir = isPostsPage || isSearchPage || isAboutPage;
    const postBase = isSubDir ? '../post.html' : 'post.html';

      container.innerHTML = posts.map(post => `
        <li>
          <div class="post-item">
            <a href="${postBase}?year=${post.year}&slug=${post.slug}" class="post-link">
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

  renderGroupedPosts(posts, container) {
    if (!posts.length) {
      container.innerHTML = '<p>No posts yet.</p>';
      return;
    }

    const { isRoot, isPostsPage, isSearchPage, isAboutPage } = this.getPathInfo();
    const isSubDir = isPostsPage || isSearchPage || isAboutPage;
    const postBase = isSubDir ? '../post.html' : 'post.html';

    const grouped = this.groupPostsByYearMonth(posts);
    const sortedYears = Object.entries(grouped).sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
    
    let html = '';
    for (const [year, months] of sortedYears) {
      const yearCount = months.reduce((sum, m) => sum + m.posts.length, 0);
      html += `<div class="year-group">
        <h2 class="year-header">${year} <span class="year-count">${yearCount}</span></h2>`;
      
      for (const monthData of months) {
        html += `<div class="month-group">
          <h3 class="month-header">${monthData.monthName} <span class="month-count">${monthData.posts.length}</span></h3>
          <ul class="month-posts">`;
        
        for (const post of monthData.posts) {
          html += `<li>
            <a href="${postBase}?year=${post.year}&slug=${post.slug}" class="post-link">
              <h3>${post.headline}</h3>
            </a>
            <div class="post-meta">
              <span class="date">${this.formatDate(post.date)}</span>
              <span class="read-time">- ${post.readTime}</span>
            </div>
            ${post.teaser ? `<p>${post.teaser}</p>` : ''}
          </li>`;
        }
        
        html += `</ul>
        </div>`;
      }
      
      html += `</div>`;
    }

    container.innerHTML = html;
  },

  groupPostsByYearMonth(posts) {
    const groups = {};
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    for (const post of posts) {
      const date = new Date(post.date);
      const year = date.getFullYear().toString();
      const monthIndex = date.getMonth();
      
      if (!groups[year]) {
        groups[year] = [];
      }
      
      let monthGroup = groups[year].find(m => m.monthIndex === monthIndex);
      if (!monthGroup) {
        monthGroup = { monthIndex, monthName: monthNames[monthIndex], posts: [] };
        groups[year].push(monthGroup);
      }
      
      monthGroup.posts.push(post);
    }

    for (const year of Object.keys(groups)) {
      groups[year].sort((a, b) => b.monthIndex - a.monthIndex);
    }

    return groups;
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
  },

  async loadPostPage() {
    const params = new URLSearchParams(window.location.search);
    const year = params.get('year');
    const slug = params.get('slug');
    
    if (!year || !slug) return null;

    const post = await this.fetchPost(`${year}/${slug}.md`);
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
