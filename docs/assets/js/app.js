const LOCALES_PATH = './locales';
const NEWS_PATH = './data/news.json';
const DEFAULT_LANG = 'en';
const REFRESH_INTERVAL_MS = 60000; // 1 minute

let state = {
  lang: localStorage.getItem('adi_lang') || DEFAULT_LANG,
  news: [],
  locales: {},
  activeCategory: 'all'
};

async function loadLocales() {
  // discover locale files we bundled
  const languages = ['en','ur'];
  for (const l of languages) {
    try {
      const res = await fetch(`${LOCALES_PATH}/${l}.json`);
      if (!res.ok) throw new Error('no');
      state.locales[l] = await res.json();
    } catch (e) {
      console.warn('Locale load failed', l, e);
    }
  }
}

async function loadNews(){
  try{
    const res = await fetch(NEWS_PATH + '?t=' + Date.now());
    state.news = await res.json();
    document.getElementById('last-updated').textContent = (state.locales[state.lang]||{}).lastUpdated + ': ' + new Date().toLocaleString();
    renderCategories();
    renderNews();
  }catch(e){
    console.error('Failed to load news',e);
  }
}

function renderLanguageSelector(){
  const sel = document.getElementById('language-select');
  sel.innerHTML = '';
  Object.keys(state.locales).forEach(l => {
    const opt = document.createElement('option');
    opt.value = l; opt.textContent = state.locales[l].langName || l;
    if(l===state.lang) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ state.lang = sel.value; localStorage.setItem('adi_lang', state.lang); applyLocale(); renderNews(); };
}

function applyLocale(){
  const loc = state.locales[state.lang] || {};
  document.getElementById('site-title').textContent = loc.siteTitle || 'AdiPak News';
  document.getElementById('categories-title').textContent = loc.categories || 'Categories';
  document.getElementById('lang-label').textContent = loc.language || 'Language:';
  document.getElementById('refresh-btn').textContent = loc.refresh || 'Refresh';
}

function renderCategories(){
  const ul = document.getElementById('categories');
  ul.innerHTML = '';
  const cats = new Set(['all']);
  state.news.forEach(n=>cats.add(n.category));
  [...cats].forEach(cat => {
    const li = document.createElement('li');
    li.textContent = cat === 'all' ? (state.locales[state.lang]?.allCategories || 'All') : cat;
    li.className = (state.activeCategory===cat)?'active':'';
    li.onclick = ()=>{ state.activeCategory = cat; renderCategories(); renderNews(); };
    ul.appendChild(li);
  });
}

function renderNews(){
  const list = document.getElementById('news-list');
  list.innerHTML = '';
  const filtered = state.news.filter(n => state.activeCategory==='all' || n.category === state.activeCategory);
  if(filtered.length===0){
    const empty = document.createElement('p');
    empty.textContent = state.locales[state.lang]?.noNews || 'No news available';
    list.appendChild(empty);
    return;
  }
  filtered.sort((a,b)=> new Date(b.published_at) - new Date(a.published_at));
  filtered.forEach(n=>{
    const li = document.createElement('li');
    li.className = 'news-card';
    const title = n.title[state.lang] || n.title['en'] || 'Untitled';
    const body = n.content[state.lang] || n.content['en'] || '';
    li.innerHTML = `<h3>${escapeHtml(title)}</h3><p class="news-meta">${n.category} • ${new Date(n.published_at).toLocaleString()}</p><p>${escapeHtml(body)}</p>`;
    list.appendChild(li);
  });
}

function escapeHtml(s){ return String(s).replace(/[&<>\