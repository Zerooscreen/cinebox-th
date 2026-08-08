const express = require('express');
const path = require('path');
const { tmdb, img, slugify } = require('./lib/tmdb');
const { head, layout, posterCard, genreRow, watchButtonBlock, trailerBlock, castGrid, similarGrid, escapeHtml, movieJsonLd, tvJsonLd, personJsonLd, banner728x90, banner468x60, nativeBannerAd, detailTitle, DEFAULT_TITLE, DEFAULT_DESC, SITE_NAME } = require('./lib/render');

const app = express();
const SITE_URL = process.env.SITE_URL || 'https://www.cinemath.duckdns.org';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ROWS = {
  movie: [
    { key: '01', title: 'หนังมาแรง', path: '/trending/movie/week' },
    { key: '02', title: 'หนังยอดนิยม', path: '/movie/popular' },
    { key: '03', title: 'คะแนนสูงสุด', path: '/movie/top_rated' },
    { key: '04', title: 'เร็วๆ นี้ในโรงภาพยนตร์', path: '/movie/upcoming' },
  ],
  tv: [
    { key: '01', title: 'ซีรีส์มาแรง', path: '/trending/tv/week' },
    { key: '02', title: 'ซีรีส์ยอดนิยม', path: '/tv/popular' },
    { key: '03', title: 'ซีรีส์คะแนนสูงสุด', path: '/tv/top_rated' },
    { key: '04', title: 'ซีรีส์ที่กำลังฉาย', path: '/tv/on_the_air' },
  ],
};

function seoDescription(title, year, genreNames) {
  const yearPart = year ? `${year}, ` : '';
  const genrePart = genreNames ? `ประเภท ${genreNames}, ` : '';
  return `เรื่องย่อ นักแสดง เรตติ้ง และตัวอย่างอย่างเป็นทางการของ ${title} ${genrePart}${yearPart}ข้อมูลทั้งหมดในที่เดียว`;
}

async function renderHome(req, res, tab) {
  try {
    const heroData = await tmdb(tab === 'movie' ? '/trending/movie/week' : '/trending/tv/week');
    const hero = heroData && heroData.results ? heroData.results[0] : null;
    const heroTitle = hero ? (hero.title || hero.name) : SITE_NAME;
    const heroOverview = hero ? (hero.overview || '') : '';

    const rowsHtml = [];
    for (const def of ROWS[tab]) {
      try {
        const data = await tmdb(def.path);
        const cards = (data && data.results ? data.results : []).slice(0, 12).map(item => posterCard(item, tab)).join('');
        rowsHtml.push(`
          <section class="row">
            <div class="row-head"><span class="row-num">${def.key}</span><h2>${def.title}</h2></div>
            <div class="grid">${cards}</div>
          </section>
        `);
      } catch (err) {
        console.error(`Error loading row ${def.path}:`, err.message);
      }
    }

    const heroHtml = hero ? `
      <div id="hero">
        <div class="hero-bg" style="background-image:url('${img(hero.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="hero-content">
          <div class="hero-eyebrow">มาแรงประจำสัปดาห์</div>
          <div class="hero-title">${escapeHtml(heroTitle)}</div>
          <div class="hero-overview">${escapeHtml(heroOverview).slice(0, 180)}${heroOverview.length > 180 ? '…' : ''}</div>
          <a class="hero-btn" href="/${tab}/${hero.id}/${encodeURIComponent(slugify(heroTitle) || 'film')}">ดูเพิ่มเติม ▸</a>
        </div>
      </div>` : '';

    const bodyHtml = heroHtml + banner468x60() + `<div id="rows">${rowsHtml.join('')}</div>`;
    const headHtml = head({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      url: `${SITE_URL}/${tab}`,
      image: hero ? img(hero.backdrop_path, 'w780') : null,
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: tab }));
  } catch (e) {
    console.error('RenderHome Error:', e.message);
    res.status(500).send(layout({
      headHtml: head({ title: DEFAULT_TITLE, description: DEFAULT_DESC, url: `${SITE_URL}/${tab}` }),
      bodyHtml: `<div class="empty">ไม่สามารถโหลดข้อมูลได้ โปรดตรวจสอบ TMDB_API_KEY Anda di Vercel. (${escapeHtml(e.message)})</div>`,
      activeTab: tab,
    }));
  }
}

app.get('/', (req, res) => renderHome(req, res, 'movie'));
app.get('/movie', (req, res) => renderHome(req, res, 'movie'));
app.get('/tv', (req, res) => renderHome(req, res, 'tv'));

app.get('/movie/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await tmdb(`/movie/${id}`);
    const [credits, videos, similar] = await Promise.all([
      tmdb(`/movie/${id}/credits`).catch(() => ({ cast: [], crew: [] })),
      tmdb(`/movie/${id}/videos`).catch(() => ({ results: [] })),
      tmdb(`/movie/${id}/similar`).catch(() => ({ results: [] })),
    ]);

    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)} ชม. ${data.runtime % 60} น.` : 'ไม่มีข้อมูล';
    const correctSlug = slugify(data.title) || 'film';

    const bodyHtml = `
      <a class="back-btn" href="/movie">← กลับ</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="โปสเตอร์ ${escapeHtml(data.title)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">ภาพยนตร์</div>
          <h1 class="detail-title">${escapeHtml(data.title)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_title)} · ${(data.release_date || '').slice(0, 4) || 'ไม่ทราบ'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${runtime}</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          ${genreRow(data.genres)}
          ${watchButtonBlock(data.id, data.title, 'movie')}
        </div>
      </div>
      <div class="section-block"><h3>เรื่องย่อ</h3><div class="bio-text">${escapeHtml(data.overview) || 'ไม่มีเรื่องย่อ'}</div></div>
      ${trailerBlock(videos)}
      ${banner728x90()}
      <div class="section-block"><h3>นักแสดง</h3>${castGrid(credits)}</div>
      ${nativeBannerAd()}
      ${similarGrid(similar.results, 'movie')}
      ${banner468x60()}
      ${movieJsonLd(data, `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const headHtml = head({
      title: detailTitle(data, 'movie'),
      description: seoDescription(data.title, (data.release_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.movie',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({ title: 'ไม่พบภาพยนตร์', description: DEFAULT_DESC, url: `${SITE_URL}/movie/${id}`, robots: 'noindex, nofollow' }),
      bodyHtml: `<a class="back-btn" href="/movie">← กลับ</a><div class="empty">ไม่พบภาพยนตร์เรื่องนี้</div>`,
      activeTab: 'movie',
    }));
  }
});

app.get('/tv/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos, similar] = await Promise.all([
      tmdb(`/tv/${id}`),
      tmdb(`/tv/${id}/credits`).catch(() => ({ cast: [], crew: [] })),
      tmdb(`/tv/${id}/videos`).catch(() => ({ results: [] })),
      tmdb(`/tv/${id}/similar`).catch(() => ({ results: [] })),
    ]);

    if (!data || !data.id) throw new Error('TV show not found');

    const correctSlug = slugify(data.name) || 'serial';
    const seasons = (data.seasons || []).filter(s => s.season_number >= 0);
    const seasonsHtml = seasons.map(s => `
      <div class="season-item" data-season="${s.season_number}" data-tv="${id}">
        <div class="season-head">
          <img src="${img(s.poster_path, 'w92')}" alt="${escapeHtml(s.name)}">
          <div>
            <div class="s-title">${escapeHtml(s.name)}</div>
            <div class="s-meta">${s.episode_count} ตอน · ${(s.air_date || '').slice(0, 4) || 'ไม่ทราบ'}</div>
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
          <div class="detail-orig">${escapeHtml(data.original_name)} · ${(data.first_air_date || '').slice(0, 4) || 'ไม่ทราบ'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${data.number_of_seasons || '-'} ซีซั่น</span>
            <span class="m-item">${data.number_of_episodes || '-'} ตอน</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          ${genreRow(data.genres)}
          ${watchButtonBlock(data.id, data.name, 'tv')}
        </div>
      </div>
      <div class="section-block"><h3>เรื่องย่อ</h3><div class="bio-text">${escapeHtml(data.overview) || 'ไม่มีเรื่องย่อ'}</div></div>
      ${trailerBlock(videos)}
      ${banner728x90()}
      <div class="section-block"><h3>นักแสดง</h3>${castGrid(credits)}</div>
      ${nativeBannerAd()}
      <div class="section-block">
        <h3>ซีซั่นและตอนทั้งหมด</h3>
        <div class="season-list" id="season-list">${seasonsHtml}</div>
      </div>
      ${similarGrid(similar.results, 'tv')}
      ${banner468x60()}
      ${tvJsonLd(data, `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const headHtml = head({
      title: detailTitle(data, 'tv'),
      description: seoDescription(data.name, (data.first_air_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.tv_show',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'tv' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({ title: 'ไม่พบซีรีส์', description: DEFAULT_DESC, url: `${SITE_URL}/tv/${id}`, robots: 'noindex, nofollow' }),
      bodyHtml: `<a class="back-btn" href="/tv">← กลับ</a><div class="empty">ไม่พบซีรีส์เรื่องนี้</div>`,
      activeTab: 'tv',
    }));
  }
});

app.get('/person/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [person, credits] = await Promise.all([
      tmdb(`/person/${id}`),
      tmdb(`/person/${id}/movie_credits`).catch(() => ({ cast: [] })),
    ]);

    if (!person || !person.id) throw new Error('Person not found');

    const correctSlug = slugify(person.name) || 'actor';
    const movies = (credits.cast || []).sort((a, b) => new Date(b.release_date || '1970') - new Date(a.release_date || '1970'));
    const cards = movies.map(item => posterCard(item, 'movie')).join('');

    const bodyHtml = `
      <a class="back-btn" href="javascript:history.back()">← กลับ</a>
      <div class="person-profile-header">
        <img class="person-img" src="${img(person.profile_path, 'h632')}" alt="${escapeHtml(person.name)}">
        <div class="person-details">
          <div class="detail-eyebrow">นักแสดง</div>
          <h1 class="detail-title">${escapeHtml(person.name)}</h1>
          <div class="detail-meta">
            ${person.birthday ? `<span class="m-item">วันเกิด: ${person.birthday}</span>` : ''}
            ${person.place_of_birth ? `<span class="m-item">${escapeHtml(person.place_of_birth)}</span>` : ''}
          </div>
          <div class="bio-text" style="margin-top: 20px;">${escapeHtml(person.biography || 'ไม่มีประวัติส่วนตัว')}</div>
        </div>
      </div>
      <div class="section-block">
        <h3>ผลงานภาพยนตร์</h3>
        <div class="grid">${cards || '<div class="empty">ไม่พบภาพยนตร์</div>'}</div>
      </div>
      ${personJsonLd(person, `${SITE_URL}/person/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const headHtml = head({
      title: `${person.name} - ผลงานภาพยนตร์ ประวัติ และข้อมูล`,
      description: (person.biography || `สำรวจผลงานภาพยนตร์และประวัติของ ${person.name}`).slice(0, 160),
      url: `${SITE_URL}/person/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(person.profile_path, 'w780'),
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({ title: 'ไม่พบข้อมูลบุคคล', description: DEFAULT_DESC, url: `${SITE_URL}/person/${id}`, robots: 'noindex, nofollow' }),
      bodyHtml: `<a class="back-btn" href="javascript:history.back()">← กลับ</a><div class="empty">ไม่พบข้อมูลบุคคลนี้</div>`,
      activeTab: 'movie',
    }));
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json({ results: [] });
    const data = await tmdb('/search/multi', { query: q });
    const results = (data && data.results ? data.results : [])
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 8)
      .map(r => ({
        id: r.id,
        type: r.media_type,
        title: r.title || r.name,
        year: (r.release_date || r.first_air_date || '').slice(0, 4),
        poster: img(r.poster_path, 'w92'),
        slug: slugify(r.title || r.name) || 'media',
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
    const episodes = (data && data.episodes ? data.episodes : []).map(ep => ({
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

app.get('/sitemap.xml', async (req, res) => {
  try {
    const [mp, mt, tp, tt] = await Promise.all([
      tmdb('/movie/popular').catch(() => ({ results: [] })),
      tmdb('/movie/top_rated').catch(() => ({ results: [] })),
      tmdb('/tv/popular').catch(() => ({ results: [] })),
      tmdb('/tv/top_rated').catch(() => ({ results: [] })),
    ]);

    const movieCreditsPromises = (mp && mp.results ? mp.results : []).slice(0, 5).reverse().map(m => tmdb(`/movie/${m.id}/credits`).catch(() => ({ cast: [] })));
    const creditsResults = await Promise.all(movieCreditsPromises);
    const actors = [];
    creditsResults.forEach(c => {
      if (c && c.cast) {
        c.cast.slice(0, 5).forEach(actor => actors.push(actor));
      }
    });

    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${SITE_URL}/movie`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/tv`, priority: '1.0', changefreq: 'daily' },
      ...[...(mp && mp.results ? mp.results : []), ...(mt && mt.results ? mt.results : [])].map(m => ({ loc: `${SITE_URL}/movie/${m.id}/${encodeURIComponent(slugify(m.title) || 'film')}`, priority: '0.7', changefreq: 'weekly' })),
      ...[...(tp && tp.results ? tp.results : []), ...(tt && tt.results ? tt.results : [])].map(t => ({ loc: `${SITE_URL}/tv/${t.id}/${encodeURIComponent(slugify(t.name) || 'serial')}`, priority: '0.7', changefreq: 'weekly' })),
      ...actors.map(a => ({ loc: `${SITE_URL}/person/${a.id}/${encodeURIComponent(slugify(a.name) || 'actor')}`, priority: '0.5', changefreq: 'weekly' })),
    ];

    const uniq = [...new Map(urls.map(u => [u.loc, u])).values()];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniq.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

    res.type('application/xml').send(xml);
  } catch (e) {
    res.status(500).send('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = (req, res) => {
  return app(req, res);
};
