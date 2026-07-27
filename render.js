const { img, slugify } = require('./tmdb');

const SITE_NAME = 'ซีนีบ็อกซ์';
const DEFAULT_TITLE = 'ซีนีบ็อกซ์ · หนังและซีรีส์ยอดนิยมล่าสุด เรื่องย่อ เรตติ้ง นักแสดง ตัวอย่างหนัง สรุปครบ';
const DEFAULT_DESC = 'ซีนีบ็อกซ์รวมเรื่องย่อ นักแสดง เรตติ้ง และตัวอย่างหนังอย่างเป็นทางการของหนังและซีรีส์ยอดนิยมล่าสุด ครบทุกซีซั่นและตอน';
const DEFAULT_OG_IMAGE = 'https://placehold.co/1200x630/17171b/8d8a92?text=CineBox';

// TODO: ganti dengan kode verifikasi Google Search Console milik domain Thailand ini
// (kode punya cinebox-kr TIDAK bisa dipakai ulang -- itu terikat ke domain yang berbeda).
const GOOGLE_SITE_VERIFICATION = 'GANTI_DENGAN_KODE_VERIFIKASI_DOMAIN_INI';

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

// ---------- Iklan: PLACEHOLDER ----------
// PENTING: jangan pakai ulang key/zone Adsterra milik cinebox-kr di sini.
// Buat zone iklan BARU di dashboard Adsterra khusus untuk domain Thailand ini,
// lalu ganti key di bawah. Struktur & penempatan sengaja disamakan dengan versi Korea.
function bannerScript(key, width, height) {
  return `<script>atOptions = { 'key' : '${key}', 'format' : 'iframe', 'height' : ${height}, 'width' : ${width}, 'params' : {} };</script><script src="https://www.highperformanceformat.com/${key}/invoke.js"></script>`;
}
function topBannerAd() {
  return `
    <div class="ad-slot ad-desktop-only">${bannerScript('GANTI_KEY_728x90', 728, 90)}</div>
    <div class="ad-slot ad-mobile-only">${bannerScript('GANTI_KEY_320x50', 320, 50)}</div>
  `;
}
function sideBannerAd() {
  return `<div class="ad-slot ad-desktop-only">${bannerScript('GANTI_KEY_160x600', 160, 600)}</div>`;
}
function nativeBannerAd() {
  return `
    <div class="ad-slot ad-native">
      <script async data-cfasync="false" src="https://GANTI_DOMAIN_NATIVE_INVOKE.js"></script>
      <div id="container-GANTI_ID_NATIVE"></div>
    </div>
  `;
}
function socialBarScript() {
  return `<script src="https://GANTI_DOMAIN_SOCIALBAR_INVOKE.js"></script>`;
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
</body>
</html>`;
}

function posterCard(item, type) {
  const title = item.title || item.name;
  const date = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '-';
  const slug = slugify(title);
  return `
    <a class="poster-card" href="/${type}/${item.id}/${encodeURIComponent(slug)}">
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
    <div class="cast-card">
      <img src="${img(c.profile_path, 'w185')}" alt="${escapeHtml(c.name)}" loading="lazy">
      <div class="cast-name">${escapeHtml(c.name)}</div>
      <div class="cast-role">${escapeHtml(c.character || '')}</div>
    </div>
  `).join('')}</div>`;
}

module.exports = { head, layout, posterCard, genreRow, trailerBlock, castGrid, escapeHtml, movieJsonLd, tvJsonLd, sideBannerAd, nativeBannerAd, DEFAULT_TITLE, DEFAULT_DESC, SITE_NAME };
