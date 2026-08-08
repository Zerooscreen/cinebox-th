const SITE_NAME = 'Cinemath';
const DEFAULT_TITLE = 'ดูหนังใหม่ 2026 หนังใหม่ HD พากย์ไทย ซับไทย ฟรี';
const DEFAULT_DESC = 'เว็บดูหนังใหม่และซีรีส์ออนไลน์ฟรี อัปเดตความบันเทิงครบรส ทั้งพากย์ไทยและซับไทย คมชัดระดับ HD';

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function head({ title, description, url, image, type = 'website', robots = 'index, follow' }) {
  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title || DEFAULT_TITLE)}</title>
    <meta name="description" content="${escapeHtml(description || DEFAULT_DESC)}">
    <meta name="robots" content="${robots}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="${type}">
    <meta property="og:title" content="${escapeHtml(title || DEFAULT_TITLE)}">
    <meta property="og:description" content="${escapeHtml(description || DEFAULT_DESC)}">
    <meta property="og:url" content="${url}">
    ${image ? `<meta property="og:image" content="${image}">` : ''}
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%%><text y=%22.9em%22 font-size=%2290%%></text></svg>">
  `;
}

function layout({ headHtml, bodyHtml, activeTab }) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
${headHtml}
</head>
<body>
  <header id="header">
    <div class="header-inner">
      <a class="logo" href="/">Cinema <span style="color:var(--accent);">th</span></a>
      <nav class="nav-tabs">
        <a href="/movie" class="${activeTab === 'movie' ? 'active' : ''}">หนัง</a>
        <a href="/tv" class="${activeTab === 'tv' ? 'active' : ''}">ซีรีส์</a>
      </nav>
      <div class="search-box">
        <input type="text" id="search-input" placeholder="ค้นหาชื่อเรื่อง...">
        <div id="search-results" class="search-dropdown"></div>
      </div>
    </div>
  </header>
  <main id="main">
    ${bodyHtml}
  </main>
  <footer id="footer">
    <div class="footer-inner">
      <p>${SITE_NAME} — เว็บไซต์ข้อมูลหนังและซีรีส์จากข้อมูลสาธารณะของ TMDB (ไม่ใช่บริการสตรีมมิ่ง) · Powered by TMDB</p>
    </div>
  </footer>
  <script src="/app.js"></script>
</body>
</html>`;
}

function posterCard(item, type) {
  const title = item.title || item.name || '';
  const date = item.release_date || item.first_air_date || '';
  const year = date ? date.slice(0, 4) : '';
  const slug = item.title || item.name ? item.title || item.name : 'media';
  const sluggedUrl = `/${type}/${item.id}/${encodeURIComponent(slugify(slug) || 'film')}`;
  const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Image';

  return `
    <a class="card" href="${sluggedUrl}">
      <div class="card-img-wrap">
        <img src="${posterUrl}" alt="${escapeHtml(title)}" loading="lazy">
        <span class="card-rating">★ ${item.vote_average ? item.vote_average.toFixed(1) : '-'}</span>
      </div>
      <div class="card-content">
        <div class="card-title">${escapeHtml(title)}</div>
        <div class="card-sub">${year}</div>
      </div>
    </a>
  `;
}

function genreRow(genres) {
  if (!genres || !genres.length) return '';
  return `<div class="genre-row">${genres.map(g => `<span class="genre-tag">${escapeHtml(g.name)}</span>`).join('')}</div>`;
}

function watchButtonBlock(id, title, type) {
  return `
    <div class="action-buttons">
      <a href="#trailer" class="btn btn-primary">▶ ดูตัวอย่าง</a>
    </div>
  `;
}

function trailerBlock(videos) {
  if (!videos || !videos.results) return '';
  const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videos.results[0];
  if (!trailer) return '';
  return `
    <div class="section-block" id="trailer">
      <h3>ตัวอย่างภาพยนตร์</h3>
      <div class="video-container">
        <iframe src="https://www.youtube.com/embed/${trailer.key}" title="YouTube trailer" frameborder="0" allowfullscreen></iframe>
      </div>
    </div>
  `;
}

function castGrid(credits) {
  if (!credits || !credits.cast || !credits.cast.length) return '<div class="empty">ไม่มีข้อมูลนักแสดง</div>';
  const cards = credits.cast.slice(0, 6).map(person => {
    const profileUrl = person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image';
    const slug = slugify(person.name) || 'actor';
    return `
      <a class="cast-card" href="/person/${person.id}/${slug}">
        <img src="${profileUrl}" alt="${escapeHtml(person.name)}" loading="lazy">
        <div class="cast-name">${escapeHtml(person.name)}</div>
        <div class="cast-char">${escapeHtml(person.character || '')}</div>
      </a>
    `;
  }).join('');
  return `<div class="cast-grid">${cards}</div>`;
}

function similarGrid(items, type) {
  if (!items || !items.length) return '';
  const cards = items.slice(0, 6).map(item => posterCard(item, type)).join('');
  return `
    <div class="section-block">
      <h3>เรื่องที่คุณอาจชอบ</h3>
      <div class="grid">${cards}</div>
    </div>
  `;
}

function banner728x90() {
  return `
    <div class="ad-banner banner-728">
      <script type="text/javascript">
        // Placeholder banner iklan 728x90
      </script>
      <div style="background:var(--card-bg); color:var(--text-dim); text-align:center; padding:15px; font-size:12px; border:1px dashed var(--border-color);">Advertisement 728x90</div>
    </div>
  `;
}

function banner468x60() {
  return `
    <div class="ad-banner banner-468">
      <div style="background:var(--card-bg); color:var(--text-dim); text-align:center; padding:10px; font-size:12px; border:1px dashed var(--border-color);">Advertisement 468x60</div>
    </div>
  `;
}

function nativeBannerAd() {
  return `
    <div class="ad-banner native-banner">
      <div style="background:var(--card-bg); color:var(--text-dim); text-align:center; padding:20px; font-size:12px; border:1px dashed var(--border-color);">Native Banner Advertisement</div>
    </div>
  `;
}

function detailTitle(data, type) {
  const name = data.title || data.name || '';
  const year = (data.release_date || data.first_air_date || '').slice(0, 4);
  return `${name} ${year ? `(${year})` : ''} พากย์ไทย ซับไทย HD`;
}

function movieJsonLd(data, url) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": data.title,
    "description": data.overview,
    "image": data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
    "datePublished": data.release_date,
    "url": url
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function tvJsonLd(data, url) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": data.name,
    "description": data.overview,
    "image": data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
    "datePublished": data.first_air_date,
    "url": url
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function personJsonLd(person, url) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": person.name,
    "description": person.biography,
    "image": person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : undefined,
    "url": url
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

module.exports = {
  head,
  layout,
  posterCard,
  genreRow,
  watchButtonBlock,
  trailerBlock,
  castGrid,
  similarGrid,
  escapeHtml,
  movieJsonLd,
  tvJsonLd,
  personJsonLd,
  banner728x90,
  banner468x60,
  nativeBannerAd,
  detailTitle,
  DEFAULT_TITLE,
  DEFAULT_DESC,
  SITE_NAME
};
