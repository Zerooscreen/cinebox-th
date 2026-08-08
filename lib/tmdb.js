const fetch = require('node-fetch');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function tmdb(endpoint, params = {}) {
  const urlParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'th-TH', // Menggunakan bahasa Thailand untuk cinebox-th
    ...params,
  });

  const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${urlParams}`);
  if (!res.ok) {
    throw new Error(`TMDB Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function img(path, size = 'w500') {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

module.exports = { tmdb, img, slugify };
