const express = require('express');
const path = require('path');
const { tmdb, img, slugify } = require('./lib/tmdb');
const { head, layout, posterCard, genreRow, trailerBlock, castGrid, escapeHtml, movieJsonLd, tvJsonLd, sideBannerAd, nativeBannerAd, DEFAULT_TITLE, DEFAULT_DESC, SITE_NAME } = require('./lib/render');

const app = express();
const PORT = process.env.PORT || 3000;

// TODO: ganti dengan domain final Thailand Anda setelah deploy di Railway
const SITE_URL = process.env.SITE_URL || 'https://cinebox-th.up.railway.app';

app.use(express.static(path.join(__dirname, 'public')));

const ROWS = {
  movie: [
    { key: '01', title: 'หนังมาแรงตอนนี้', path: '/trending/movie/week' },
    { key: '02', title: 'หนังยอดนิยม', path: '/movie/popular' },
    { key: '03', title: 'หนังเรตติ้งสูงสุด', path: '/movie/top_rated' },
    { key: '04', title: 'หนังที่จะเข้าฉายเร็วๆ นี้', path: '/movie/upcoming' },
  ],
  tv: [
    { key: '01', title: 'ซีรีส์มาแรงตอนนี้', path: '/trending/tv/week' },
    { key: '02', title: 'ซีรีส์ยอดนิยม', path: '/tv/popular' },
    { key: '03', title: 'ซีรีส์เรตติ้งสูงสุด', path: '/tv/top_rated' },
    { key: '04', title: 'ซีรีส์ที่กำลังฉาย', path: '/tv/on_the_air' },
  ],
};

// ---------- Pola judul & deskripsi SEO (sama untuk SEMUA halaman detail) ----------
function seoTitle(kind, title, year) {
  return `(ดูหนังใหม่‼️)▷ "${title}" (${year || ''}) เต็มเรื่อง ซับไทย ดูฟรี`;
}

function seoDescription(title, year, genreNames) {
  return `ดู ${title} (${year || ''}) เต็มเรื่อง ซับไทย HD ฟรี พร้อมเรื่องย่อ นักแสดง คะแนนรีวิว และตัวอย่างภาพยนตร์ล่าสุด อัปเดตทุกวัน`;
}

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
          <div class="hero-eyebrow">มาแรงประจำสัปดาห์</div>
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

    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)} ชม. ${data.runtime % 60} นาที` : 'ไม่ทราบข้อมูล';
    const bodyHtml = `
      <a class="back-btn" href="/movie">← กลับ</a>

<nav class="breadcrumb">
<a href="/">หน้าแรก</a> /
<a href="/movie">หนัง</a> /
<span>${escapeHtml(data.title)}</span>
</nav>

<div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="โปสเตอร์ ${escapeHtml(data.title)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">หนัง</div>
          <h1 class="detail-title">${escapeHtml(data.title)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_title)} · ${(data.release_date || '').slice(0, 4) || 'ไม่ทราบปี'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${runtime}</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
            <div class="detail-overview">
<h2>เรื่องย่อ</h2>
<p>${escapeHtml(data.overview || 'ไม่มีเรื่องย่อ')}</p>
</div>
          ${genreRow(data.genres)}
          
<div class="action-buttons">

<a href="javascript:void(0)"
   class="btn-trailer"
   onclick="document.getElementById('trailer')?.scrollIntoView({behavior:'smooth'})">
   🎬 ตัวอย่าง
</a>

<a href="https://www.themoviedb.org/movie/${data.id}"
   target="_blank"
   class="btn-tmdb">
   TMDB
</a>

<button
 class="btn-share"
 onclick="navigator.share ? navigator.share({
 title:'${escapeHtml(data.title)}',
 url:window.location.href
 }) : navigator.clipboard.writeText(window.location.href)">
 แชร์
</button>
</div>
</div>
        </div>
      </div>
      
      ${nativeBannerAd()}
      <div id="trailer" class="section-block trailer-wrap"><h3>ตัวอย่างหนัง</h3>${trailerBlock(videos)}</div>
      <div class="watch-section">
  <a href="https://zeromovies4k.net/th/movie/${data.id}/end"
     class="btn-watch-bottom"
     target="_blank"
     rel="noopener noreferrer">
     ▶ ดูหนังเต็มเรื่อง
  </a>
</div>
      <div class="section-block"><h3>นักแสดง</h3>${castGrid(credits)}</div>
      ${sideBannerAd()}

<div class="section-block">
<h3>หนังที่คล้ายกัน</h3>
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

    const headHtml = head({
      title: seoTitle('movie', data.title, (data.release_date || '').slice(0, 4)),
      description: seoDescription(data.title, (data.release_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.movie',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({
        title: 'ไม่พบข้อมูลหนัง · ซีนีบ็อกซ์',
        description: DEFAULT_DESC,
        url: `${SITE_URL}/movie/${id}`,
        robots: 'noindex, nofollow',
      }),
      bodyHtml: `<a class="back-btn" href="/movie">← กลับ</a><div class="empty">ไม่พบข้อมูลหนังเรื่องนี้</div>`,
      activeTab: 'movie',
    }));
  }
});

// ---------- DETAIL: /tv/:id/:slug? ----------
app.get('/tv/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos] = await Promise.all([
      tmdb(`/tv/${id}`),
      tmdb(`/tv/${id}/credits`),
      tmdb(`/tv/${id}/videos`),
    ]);
    const correctSlug = slugify(data.name);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/tv/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const seasons = (data.seasons || []).filter(s => s.season_number >= 0);
    const seasonsHtml = seasons.map(s => `
      <div class="season-item" data-season="${s.season_number}" data-tv="${id}">
        <div class="season-head">
          <img src="${img(s.poster_path, 'w92')}" alt="${escapeHtml(s.name)}">
          <div>
            <div class="s-title">${escapeHtml(s.name)}</div>
            <div class="s-meta">${s.episode_count} ตอน · ${(s.air_date || '').slice(0, 4) || 'ไม่ทราบปี'}</div>
          </div>
          <div class="chev">▶</div>
        </div>
        <div class="episode-panel"></div>
      </div>
    `).join('');

    const bodyHtml = `
      <a class="back-btn" href="/tv">← กลับ</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="โปสเตอร์ ${escapeHtml(data.name)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">ซีรีส์</div>
          <h1 class="detail-title">${escapeHtml(data.name)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_name)} · ${(data.first_air_date || '').slice(0, 4) || 'ไม่ทราบปี'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${data.number_of_seasons || '-'} ซีซั่น</span>
            <span class="m-item">${data.number_of_episodes || '-'} ตอน</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          ${genreRow(data.genres)}
        </div>
      </div>
      <div class="section-block"><h3>เรื่องย่อ</h3><div class="bio-text">${escapeHtml(data.overview) || 'ยังไม่มีเรื่องย่อ'}</div></div>
      ${nativeBannerAd()}
      <div class="section-block"><h3>ตัวอย่างหนัง</h3>${trailerBlock(videos)}</div>
      <div class="section-block"><h3>นักแสดง</h3>${castGrid(credits)}</div>
      <div class="section-block">
        <h3>ซีซั่นและตอน</h3>
        <div class="season-list" id="season-list">${seasonsHtml}</div>
      </div>
      ${sideBannerAd()}
      ${tvJsonLd(data, `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const headHtml = head({
      title: seoTitle('tv', data.name, (data.first_air_date || '').slice(0, 4)),
      description: seoDescription(data.name, (data.first_air_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.tv_show',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'tv' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({
        title: 'ไม่พบข้อมูลซีรีส์ · ซีนีบ็อกซ์',
        description: DEFAULT_DESC,
        url: `${SITE_URL}/tv/${id}`,
        robots: 'noindex, nofollow',
      }),
      bodyHtml: `<a class="back-btn" href="/tv">← กลับ</a><div class="empty">ไม่พบข้อมูลซีรีส์นี้</div>`,
      activeTab: 'tv',
    }));
  }
});

// ---------- API proxy ----------
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json({ results: [] });
    const data = await tmdb('/search/multi', { query: q });
    const results = data.results
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 8)
      .map(r => ({
        id: r.id,
        type: r.media_type,
        title: r.title || r.name,
        year: (r.release_date || r.first_air_date || '').slice(0, 4),
        poster: img(r.poster_path, 'w92'),
        slug: slugify(r.title || r.name),
      }));
    res.json({ results });
  } catch (e) {
    res.status(500).json({ results: [], error: true });
  }
});

app.get('/api/season/:tvId/:seasonNumber', async (req, res) => {
  try {
    const { tvId, seasonNumber } = req.params;
    const data = await tmdb(`/tv/${tvId}/season/${seasonNumber}`);
    const episodes = (data.episodes || []).map(ep => ({
      number: ep.episode_number,
      name: ep.name,
      airDate: ep.air_date,
      rating: ep.vote_average ? ep.vote_average.toFixed(1) : '-',
      overview: ep.overview,
      still: img(ep.still_path, 'w300'),
    }));
    res.json({ episodes });
  } catch (e) {
    res.status(500).json({ episodes: [], error: true });
  }
});

// ---------- sitemap.xml ----------
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [mp, mt, tp, tt] = await Promise.all([
      tmdb('/movie/popular'),
      tmdb('/movie/top_rated'),
      tmdb('/tv/popular'),
      tmdb('/tv/top_rated'),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${SITE_URL}/movie`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/tv`, priority: '1.0', changefreq: 'daily' },
      ...[...mp.results, ...mt.results].map(m => ({ loc: `${SITE_URL}/movie/${m.id}/${encodeURIComponent(slugify(m.title))}`, priority: '0.7', changefreq: 'weekly' })),
      ...[...tp.results, ...tt.results].map(t => ({ loc: `${SITE_URL}/tv/${t.id}/${encodeURIComponent(slugify(t.name))}`, priority: '0.7', changefreq: 'weekly' })),
    ];
    const uniq = [...new Map(urls.map(u => [u.loc, u])).values()];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniq.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) {
    res.status(500).send('');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.listen(PORT, () => {
  console.log(`ซีนีบ็อกซ์ (TH) เซิร์ฟเวอร์ทำงานที่: http://localhost:${PORT}`);
});
