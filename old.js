// Helper to fetch JSON via Websim API
async function fetchApiJson(url) {
  const res = await window.websim.fetchApi({ url, options: { method: "GET" } });
  if (!res || res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res?.status}`);
  const reader = res.body.getReader(); const chunks = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
  const blob = new Blob(chunks, { type: "application/json" }); return JSON.parse(await blob.text());
}

const projectsGrid = document.getElementById('projects-grid');
const loader = document.getElementById('loader');
const userProfileContainer = document.getElementById('user-profile');
const iframeModal = document.getElementById('iframe-modal');
const projectIframe = document.getElementById('project-iframe');
const closeIframeBtn = document.getElementById('close-iframe');
let currentUser = null, nextCursor = 0, isLoading = false, hasMore = true;

async function fetchProjects(cursor = 0) {
  if (isLoading || !hasMore) return; isLoading = true; loader.classList.add('visible');
  try {
    const url = `/api/v1/search/top?limit=36&offset=${cursor||0}`;
    const body = await fetchApiJson(url);
    const items = body?.results || body?.data || body?.items || [];
    if (items.length) {
      const frag = document.createDocumentFragment();
      items.forEach(item => { const el = createProjectCard(item); if (el) frag.appendChild(el); });
      projectsGrid.appendChild(frag); nextCursor = (cursor||0) + items.length; hasMore = items.length >= 36;
    } else { hasMore = false; }
  } catch (e) {
    console.error('Error fetching projects:', e); projectsGrid.innerHTML += '<p>Failed to load projects. Please try again later.</p>'; hasMore = false;
  } finally { isLoading = false; if (!hasMore) loader.style.display = 'none'; else loader.classList.remove('visible'); }
}

function createProjectCard(item) {
  const site = item?.site || item; const project = item?.project || item?.revision?.project || item;
  const link = site?.link_url ? `https://websim.com${site.link_url}` : (site?.id ? `https://websim.com/c/${site.id}` : null);
  if (!site?.id || !link) return null;
  const title = project?.title || site?.title || 'Untitled Project';
  const thumb = `https://images.websim.com/v1/site/${site.id}/600`;
  const createdAt = project?.created_at || site?.created_at; const date = createdAt ? new Date(createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}) : '';
  const likes = (project?.stats?.likes ?? item?.stats?.likes ?? 0); const views = (project?.stats?.views ?? item?.stats?.views ?? 0);
  const ver = item?.project_revision?.version ?? item?.revision?.version;
  const card = document.createElement('div'); card.className = 'project-card'; card.dataset.iframeSrc = link;
  card.innerHTML = `<div class="thumbnail"><img src="${thumb}" alt="${title}" loading="lazy"></div>
    <div class="card-content"><h3 class="title" title="${title}">${title}</h3>
    <p class="date">${date ? `Created: ${date}` : ''}</p>
    <div class="stats"><span>👁️ ${Number(views).toLocaleString()}</span><span>❤️ ${Number(likes).toLocaleString()}</span>${ver?`<span>🤖 ${ver}</span>`:''}</div></div>`;
  return card;
}

function setupInfiniteScroll() {
  const observer = new IntersectionObserver((entries)=>{ if (entries[0].isIntersecting && !isLoading) fetchProjects(nextCursor); },{ rootMargin:'400px' });
  observer.observe(loader);
}

function openProjectInIframe(src) { if (!src) return; projectIframe.src = src; iframeModal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeProjectIframe() { projectIframe.src = 'about:blank'; iframeModal.classList.add('hidden'); document.body.style.overflow = ''; }

projectsGrid.addEventListener('click', (e)=>{ const card = e.target.closest('.project-card'); if (card?.dataset.iframeSrc) openProjectInIframe(card.dataset.iframeSrc); });
closeIframeBtn.addEventListener('click', closeProjectIframe);
iframeModal.addEventListener('click', (e)=>{ if (e.target === iframeModal) closeProjectIframe(); });
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && !iframeModal.classList.contains('hidden')) closeProjectIframe(); });

document.addEventListener('DOMContentLoaded', ()=>{ fetchProjects(0); setupInfiniteScroll(); });