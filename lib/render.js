const { img, slugify } = require('./tmdb');

const SITE_NAME = 'ซีนีบ็อกซ์';
const DEFAULT_TITLE = 'ดูหนังใหม่ 2026 หนังใหม่ HD พากย์ไทย ซับไทย ดูฟรี | ซีนีบ็อกซ์';
const DEFAULT_DESC = 'ดูหนังใหม่ 2026 หนังใหม่ชนโรง หนังไทย หนังฝรั่ง ซีรีส์เกาหลี และซีรีส์ยอดนิยม พากย์ไทย ซับไทย HD ดูฟรี อัปเดตทุกวัน';
const DEFAULT_OG_IMAGE = 'https://placehold.co/1200x630/17171b/8d8a92?text=CineBox';

// Kode verifikasi Google Search Console
const GOOGLE_SITE_VERIFICATION = 'M-_SCpf4h0A8JcaYgk3_kEfeagIFV6cKmqsg0iROtiI';

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function head({ title, description, url, image, type = 'website', robots = 'index, follow' }) {
  const t = escapeHtml(title || DEFAULT_TITLE);
  const d = escapeHtml((description || DEFAULT_DESC).slice(0, 160));
  const ogImg = image || DEFAULT_OG_IMAGE;
  return `
  <title>${t}</title>
  <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}" />
  <meta name="description" content="${d}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImg}">
  <meta property="og:locale" content="th_TH">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${ogImg}">
  `;
}

function movieJsonLd(data, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: data.title,
    description: (data.overview || '').slice(0, 300),
    url,
    image: img(data.poster_path || data.backdrop_path, 'w780'),
    datePublished: data.release_date || undefined,
    genre: (data.genres || []).map(g => g.name),
  };
  if (data.vote_average && data.vote_count) {
    payload.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.vote_average.toFixed(1),
      ratingCount: data.vote_count,
      bestRating: '10',
      worstRating: '0',
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function tvJsonLd(data, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: data.name,
    description: (data.overview || '').slice(0, 300),
    url,
    image: img(data.poster_path || data.backdrop_path, 'w780'),
    datePublished: data.first_air_date || undefined,
    genre: (data.genres || []).map(g => g.name),
    numberOfSeasons: data.number_of_seasons || undefined,
    numberOfEpisodes: data.number_of_episodes || undefined,
  };
  if (data.vote_average && data.vote_count) {
    payload.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.vote_average.toFixed(1),
      ratingCount: data.vote_count,
      bestRating: '10',
      worstRating: '0',
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function personJsonLd(data, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.name,
    description: (data.biography || '').slice(0, 300),
    url,
    image: img(data.profile_path, 'w780'),
    birthDate: data.birthday || undefined,
    birthPlace: data.place_of_birth || undefined,
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

// ---------- Iklan Adsterra ----------
function bannerScript(key, width, height) {
  return `<script>atOptions = { 'key' : '${key}', 'format' : 'iframe', 'height' : ${height}, 'width' : ${width}, 'params' : {} };</script><script src="https://www.highperformanceformat.com/${key}/invoke.js"></script>`;
}
function topBannerAd() {
  return `
    <div class="ad-slot ad-desktop-only">${bannerScript('9eab15e2d0d97de74e3ee971fe615a5e', 728, 90)}</div>
    <div class="ad-slot ad-mobile-only">${bannerScript('374f3cbadfdea331b749dcfc79f79f2c', 320, 50)}</div>
  `;
}
function sideBannerAd() {
  return `<div class="ad-slot ad-desktop-only">${bannerScript('25247fde261d8f76e06b91b9d74945f4', 160, 600)}</div>`;
}
function nativeBannerAd() {
  return `
    <div class="ad-slot ad-native">
      <script async data-cfasync="false" src="https://pl30557737.effectivecpmnetwork.com/6f7b03feb080b4884047d6210ed8268e/invoke.js"></script>
      <div id="container-6f7b03feb080b4884047d6210ed8268e"></div>
    </div>
  `;
}
function socialBarScript() {
  return `<script src="https://pl30557736.effectivecpmnetwork.com/af/c1/6d/afc16d8a70f1f493abf2098939fca8f7.js"></script>`;
}
function popunderScript() {
  return `<script src="https://pl30557735.effectivecpmnetwork.com/51/65/ed/5165ed7649b06fc95e9d3bbc1839dcd9.js"></script>`;
}
function histatsScript() {
  return `
    <div id="histats_counter"></div>
    <script type="text/javascript">var _Hasync= _Hasync|| [];
    _Hasync.push(['Histats.start', '1,5014113,4,1,120,40,00011111']);
    _Hasync.push(['Histats.fasi', '1']);
    _Hasync.push(['Histats.track_hits', '']);
    (function() {
    var hs = document.createElement('script'); hs.type = 'text/javascript'; hs.async = true;
    hs.src = ('//s10.histats.com/js15_as.js');
    (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
    })();</script>
    <noscript><a href="/" target="_blank"><img src="//sstatic1.histats.com/0.gif?5014113&101" alt="" border="0"></a></noscript>
  `;
}

function layout({ headHtml, bodyHtml, activeTab = 'movie' }) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${headHtml}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<style>
  .ad-slot { display: flex; justify-content: center; align-items: center; margin: 20px auto; overflow: hidden; }
  .ad-mobile-only { display: none; }
  @media (max-width: 768px) {
    .ad-desktop-only { display: none; }
    .ad-mobile-only { display: flex; }
  }
  #histats_counter { display: none; }

  /* Style tambahan untuk Tombol Watch Premium & Halaman Aktor */
  .premium-watch-box {
    margin: 30px 0;
    text-align: center;
  }
  .btn-watch-glow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    max-width: 500px;
    padding: 18px 28px;
    background: linear-gradient(135deg, #e50914 0%, #ff2d55 100%);
    color: #ffffff;
    font-size: 22px;
    font-weight: 800;
    border-radius: 50px;
    text-decoration: none;
    box-shadow: 0 10px 25px rgba(229, 9, 20, 0.5);
    transition: all 0.3s ease;
    animation: pulseGlow 2s infinite;
  }
  .btn-watch-glow:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 15px 35px rgba(229, 9, 20, 0.7);
    color: #fff;
  }
  .watch-badge-group {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 10px;
    font-size: 13px;
    color: #aaa;
  }
  .watch-badge {
    background: rgba(255, 255, 255, 0.1);
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
  @keyframes pulseGlow {
    0% { box-shadow: 0 0 0 0 rgba(229, 9, 20, 0.6); }
    70% { box-shadow: 0 0 0 18px rgba(229, 9, 20, 0); }
    100% { box-shadow: 0 0 0 0 rgba(229, 9, 20, 0); }
  }
  .cast-card {
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease;
    display: block;
    cursor: pointer;
  }
  .cast-card:hover {
    transform: translateY(-5px);
  }
  .cast-card:hover .cast-name {
    color: #ff2d55;
  }
  .person-profile-header {
    display: flex;
    gap: 30px;
    margin-bottom: 40px;
    flex-wrap: wrap;
  }
  .person-img {
    width: 220px;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    object-fit: cover;
  }
  .person-details {
    flex: 1;
    min-width: 280px;
  }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <a class="logo" href="/movie">ซีนี<span>บ็อกซ์</span></a>
    <nav class="tabs">
      <a class="tab-btn ${activeTab === 'movie' ? 'active' : ''}" href="/movie">หนัง</a>
      <a class="tab-btn ${activeTab === 'tv' ? 'active' : ''}" href="/tv">ซีรีส์</a>
    </nav>
    <div class="search-wrap">
      <input id="search-input" type="text" placeholder="ค้นหาชื่อเรื่อง..." autocomplete="off">
      <div class="search-results" id="search-results"></div>
    </div>
  </div>
</header>
${topBannerAd()}
<main>
${bodyHtml}
</main>
<footer>
  <p>ซีนีบ็อกซ์ — เว็บไซต์ข้อมูลหนังและซีรีส์จากข้อมูลสาธารณะของ TMDB (ไม่ใช่บริการสตรีมมิ่ง) · Powered by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a></p>
</footer>
<script src="/app.js"></script>
${socialBarScript()}
${popunderScript()}
${histatsScript()}
</body>
</html>`;
}

function posterCard(item, type) {
  const title = item.title || item.name;
  const date = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '-';
  const mediaType = type || item.media_type || 'movie';
  const slug = slugify(title);
  return `
  <a class="poster-card" href="/${mediaType}/${item.id}/${encodeURIComponent(slug)}">
    <div class="poster-frame">
      <img src="${img(item.poster_path)}" alt="${escapeHtml(title)}" loading="lazy">
      <div class="poster-badge">★ ${rating}</div>
    </div>
    <div class="poster-title">${escapeHtml(title)}</div>
    <div class="poster-sub">${date || 'ไม่ทราบปี'}</div>
  </a>
  `;
}

function genreRow(genres) {
  if (!genres || !genres.length) return '';
  return `<div class="genre-row">${genres.map(g => `<span class="genre-pill">${escapeHtml(g.name)}</span>`).join('')}</div>`;
}

function trailerBlock(videos) {
  const list = (videos && videos.results) || [];
  const trailer = list.find(v => v.site === 'YouTube' && v.type === 'Trailer') || list.find(v => v.site === 'YouTube');
  if (!trailer) return `<div class="no-trailer">ยังไม่มีตัวอย่างหนัง</div>`;
  return `
  <div class="trailer-wrap">
    <iframe src="https://www.youtube.com/embed/${trailer.key}" title="trailer" allowfullscreen loading="lazy"></iframe>
  </div>
  `;
}

function castGrid(credits) {
  const cast = ((credits && credits.cast) || []).slice(0, 12);
  if (!cast.length) return `<div class="empty">ไม่มีข้อมูลนักแสดง</div>`;
  return `<div class="cast-grid">${cast.map(c => `
    <a class="cast-card" href="/person/${c.id}/${encodeURIComponent(slugify(c.name))}">
      <img src="${img(c.profile_path, 'w185')}" alt="${escapeHtml(c.name)}" loading="lazy">
      <div class="cast-name">${escapeHtml(c.name)}</div>
      <div class="cast-role">${escapeHtml(c.character || '')}</div>
    </a>
  `).join('')}</div>`;
}

module.exports = { 
  head, 
  layout, 
  posterCard, 
  genreRow, 
  trailerBlock, 
  castGrid, 
  escapeHtml, 
  movieJsonLd, 
  tvJsonLd, 
  personJsonLd,
  sideBannerAd, 
  nativeBannerAd, 
  DEFAULT_TITLE, 
  DEFAULT_DESC, 
  SITE_NAME 
};
