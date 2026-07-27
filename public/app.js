// ---------- SEARCH ----------
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchTimeout;

if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (!q) { searchResults.classList.remove('show'); return; }
    searchTimeout = setTimeout(() => doSearch(q), 350);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) searchResults.classList.remove('show');
  });
}

async function doSearch(q) {
  try {
    const res = await fetch('/api/search?q=' + encodeURIComponent(q));
    const data = await res.json();
    if (!data.results.length) {
      searchResults.innerHTML = `<div class="empty" style="padding:16px;">검색 결과가 없습니다.</div>`;
    } else {
      searchResults.innerHTML = data.results.map(item => `
        <a class="sr-item" href="/${item.type}/${item.id}/${item.slug}">
          <img src="${item.poster}" alt="${item.title}">
          <div>
            <div class="sr-title">${item.title}</div>
            <div class="sr-meta">${item.type === 'movie' ? '영화' : '시리즈'} · ${item.year || '연도 미상'}</div>
          </div>
        </a>
      `).join('');
    }
    searchResults.classList.add('show');
  } catch (e) { /* diamkan, biarkan hasil kosong */ }
}

// ---------- SEASON / EPISODE TOGGLE ----------
document.querySelectorAll('.season-head').forEach(head => {
  head.addEventListener('click', () => toggleSeason(head));
});

async function toggleSeason(headEl) {
  const item = headEl.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.season-item.open').forEach(el => {
    if (el !== item) el.classList.remove('open');
  });
  item.classList.toggle('open');
  if (isOpen) return;

  const panel = item.querySelector('.episode-panel');
  const tvId = item.dataset.tv;
  const seasonNum = item.dataset.season;
  if (panel.dataset.loaded === '1') return;

  panel.innerHTML = `<div class="loading">불러오는 중...</div>`;
  try {
    const res = await fetch(`/api/season/${tvId}/${seasonNum}`);
    const data = await res.json();
    panel.innerHTML = (data.episodes || []).map(ep => `
      <div class="episode-row">
        <img src="${ep.still}" alt="${ep.name || ''}">
        <div>
          <div class="ep-num">EP ${ep.number}</div>
          <div class="ep-title">${ep.name || ''}</div>
          <div class="ep-meta">${ep.airDate || '방영일 미상'} · ★ ${ep.rating}</div>
          <div class="ep-overview">${ep.overview || '등록된 소개가 없습니다.'}</div>
        </div>
      </div>
    `).join('') || `<div class="empty">에피소드 정보가 없습니다.</div>`;
    panel.dataset.loaded = '1';
  } catch (e) {
    panel.innerHTML = `<div class="empty">에피소드를 불러오지 못했습니다.</div>`;
  }
}
