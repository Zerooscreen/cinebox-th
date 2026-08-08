const express = require('express');
const path = require('path');
const { tmdb, img, slugify } = require('./lib/tmdb');
const { 
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
} = require('./lib/render');

const app = express();
const PORT = process.env.PORT || 3000;

// URL resmi tanpa www sesuai permintaan
const SITE_URL = process.env.SITE_URL || 'https://cinemath.duckdns.org';

// ==========================================
// KONFIGURASI FILE STATIS
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ROWS = {
  movie: [
    { key: '01', title: 'หนังมาแรง', path: '/trending/movie/week' },
    { key: '02', title: 'หนังยอดนิยม', path: '/movie/popular' },
    { key: '03', title: 'คะแนนสูงสุด', path: '/movie/top_rated' },
    { key: '04', title: 'ภาพยนตร์ที่กำลังจะเข้าฉาย', path: '/movie/upcoming' },
  ],
  tv: [
    { key: '01', title: 'ซีรี่ย์มาแรง', path: '/trending/tv/week' },
    { key: '02', title: 'ซีรี่ย์ยอดนิยม', path: '/tv/popular' },
    { key: '03', title: 'ซีรี่ย์คะแนนสูงสุด', path: '/tv/top_rated' },
    { key: '04', title: 'ซีรี่ย์กำลังออนแอร์', path: '/tv/on_the_air' },
  ],
};

// ---------- HOME (/, /movie, /tv) ----------
async function renderHome(req, res, tab) {
  try {
    const heroData = await tmdb(tab === 'movie' ? '/trending/movie/week' : '/trending/tv/week');
    const hero = heroData.results[0];
    const heroTitle = hero ? (hero.title || hero.name) : SITE_NAME;
    const heroOverview = hero ? (hero.overview || '') : '';

    const rowsHtml = [];
    for (const def of ROWS[tab]) {
      const data = await tmdb(def.path);
      const cards = data.results.slice(0, 12).map(item => posterCard(item, tab)).join('');
      rowsHtml.push(`
        <section class="row">
          <div class="row-head"><span class="row-num">${def.key}</span><h2>${def.title}</h2></div>
          <div class="grid">${cards}</div>
        </section>
      `);
    }

    const heroHtml = hero ? `
      <div id="hero">
        <div class="hero-bg" style="background-image:url('${img(hero.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="hero-content">
          <div class="hero-eyebrow">แนะนำประจำสัปดาห์</div>
          <div class="hero-title">${escapeHtml(heroTitle)}</div>
          <div class="hero-overview">${escapeHtml(heroOverview).slice(0, 180)}${heroOverview.length > 180 ? '…' : ''}</div>
          <a class="hero-btn" href="/${tab}/${hero.id}/${encodeURIComponent(slugify(heroTitle))}">ดูรายละเอียด ▸</a>
        </div>
      </div>` : '';

    const bodyHtml = heroHtml + `<div id="rows">${rowsHtml.join('')}</div>`;

    const headHtml = head({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      url: `${SITE_URL}/${tab}`,
      image: hero ? img(hero.backdrop_path, 'w780') : null,
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: tab }));
  } catch (e) {
    res.status(500).send(layout({
      headHtml: head({ title: DEFAULT_TITLE, description: DEFAULT_DESC, url: `${SITE_URL}/${tab}` }),
      bodyHtml: `<div class="empty">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</div>`,
      activeTab: tab,
    }));
  }
}

app.get('/', (req, res) => renderHome(req, res, 'movie'));
app.get('/movie', (req, res) => renderHome(req, res, 'movie'));
app.get('/tv', (req, res) => renderHome(req, res, 'tv'));

// ---------- DETAIL: /movie/:id/:slug? ----------
app.get('/movie/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos, similar] = await Promise.all([
      tmdb(`/movie/${id}`),
      tmdb(`/movie/${id}/credits`),
      tmdb(`/movie/${id}/videos`),
      tmdb(`/movie/${id}/similar`),
    ]);
    const correctSlug = slugify(data.title);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/movie/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)} ชม. ${data.runtime % 60} นาที` : 'ไม่ระบุ';
    const englishSlug = slugify(data.original_title || data.title);

    const bodyHtml = `
      <a class="back-btn" href="/movie">← กลับหน้าหลัก</a>
      <nav class="breadcrumb">
        <a href="/">หน้าแรก</a> /
        <a href="/movie">ภาพยนตร์</a> /
        <span>${escapeHtml(data.title)}</span>
      </nav>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="โปสเตอร์ ${escapeHtml(data.title)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">ภาพยนตร์</div>
          <h1 class="detail-title">${escapeHtml(data.title)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_title)} · ${(data.release_date || '').slice(0, 4) || '2026'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${runtime}</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          <div class="detail-overview">
            <h2>เรื่องย่อ</h2>
            <p>${escapeHtml(data.overview || 'ไม่มีเรื่องย่อ')}</p>
          </div>
          ${genreRow(data.genres)}
          <div class="action-buttons">
            <a href="javascript:void(0)" class="btn-trailer" onclick="document.getElementById('trailer')?.scrollIntoView({behavior:'smooth'})">🎬 ตัวอย่าง</a>
            <a href="https://www.themoviedb.org/movie/${data.id}" target="_blank" class="btn-tmdb">TMDB</a>
            <button class="btn-share" onclick="navigator.share ? navigator.share({title:'${escapeHtml(data.title)}',url:window.location.href}) : navigator.clipboard.writeText(window.location.href)">แชร์</button>
          </div>
        </div>
      </div>
      <div class="premium-watch-box">
        <a href="/watch/${id}/${englishSlug}" class="btn-watch-glow"><span>▶</span> ดูหนังเต็มเรื่อง HD</a>
        <div class="watch-badge-group">
          <span class="watch-badge">⚡ พากย์ไทย / ซับไทย</span>
          <span class="watch-badge">🎬 Ultra HD 4K</span>
          <span class="watch-badge">🔥 ดูฟรีไม่มีสะดุด</span>
        </div>
      </div>
      ${nativeBannerAd()}
      <div id="trailer" class="section-block trailer-wrap"><h3>ตัวอย่างภาพยนตร์</h3>${trailerBlock(videos)}</div>
      <div class="section-block">
        <h3>นักแสดง (คลิกที่นักแสดงเพื่อดูผลงานทั้งหมด)</h3>
        ${castGrid(credits)}
      </div>
      ${sideBannerAd()}
      <div class="section-block">
        <h3>ภาพยนตร์ที่เกี่ยวข้อง</h3>
        <div class="similar-grid">
        ${(similar.results || []).slice(0,8).map(m => `
          <a class="poster-card" href="/movie/${m.id}/${encodeURIComponent(slugify(m.title))}">
            <img src="${img(m.poster_path)}" alt="${escapeHtml(m.title)}" loading="lazy">
            <div class="poster-title">${escapeHtml(m.title)}</div>
          </a>
        `).join('')}
        </div>
      </div>
      ${movieJsonLd(data, `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const movieSeoTitle = `(ดูหนังใหม่‼️)▷ "${data.title}" (${(data.release_date || '').slice(0, 4) || '2026'}) เต็มเรื่อง ซับไทย ดูฟรี!`;
    const headHtml = head({
      title: movieSeoTitle,
      description: data.overview || DEFAULT_DESC,
      url: `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.movie',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({ title: 'ไม่พบภาพยนตร์', description: DEFAULT_DESC, url: `${SITE_URL}/movie/${id}` }),
      bodyHtml: `<div class="empty">ไม่พบภาพยนตร์ที่คุณต้องการ</div>`,
      activeTab: 'movie',
    }));
  }
});

// ... (Bagian rute TV, Watch, Person, Sitemaps tetap sama)

// ---------- SITEMAP & ROBOTS ----------
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [mp, mt, tp, tt] = await Promise.all([
      tmdb('/movie/popular').catch(() => ({ results: [] })),
      tmdb('/movie/top_rated').catch(() => ({ results: [] })),
      tmdb('/tv/popular').catch(() => ({ results: [] })),
      tmdb('/tv/top_rated').catch(() => ({ results: [] })),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/movie`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/tv`, priority: '1.0', changefreq: 'daily' },
      ...[...(mp.results || []), ...(mt.results || [])].map(m => ({ 
        loc: `${SITE_URL}/movie/${m.id}/${encodeURIComponent(slugify(m.title) || 'film')}`, 
        priority: '0.7', changefreq: 'weekly' 
      })),
      ...[...(tp.results || []), ...(tt.results || [])].map(t => ({ 
        loc: `${SITE_URL}/tv/${t.id}/${encodeURIComponent(slugify(t.name) || 'serial')}`, 
        priority: '0.7', changefreq: 'weekly' 
      })),
    ];

    const uniq = [...new Map(urls.map(u => [u.loc, u])).values()];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniq.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.type('application/xml').send(xml);
  } catch (e) {
    res.status(500).send('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.listen(PORT, () => {
  console.log(`CineBox (TH) Server running on: ${SITE_URL}`);
});
