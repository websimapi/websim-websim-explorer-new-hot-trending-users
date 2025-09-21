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
let currentUser = null, nextCursor = null, isLoading = false, hasMore = true;

async function fetchProjects(cursor = null) {
  if (isLoading || !hasMore) return; isLoading = true; loader.classList.add('visible');
  try {
    if (!currentUser) {
      const user = await window.websim.getCreator();
      if (!user || !user.username) { userProfileContainer.innerHTML = '<h1>Creator not found</h1>'; projectsGrid.innerHTML = '<h2>Could not load creator profile.</h2>'; hasMore = false; loader.style.display = 'none'; return; }
      currentUser = user; displayUserProfile(currentUser);
    }
    let url = `/api/v1/users/${currentUser.username}/projects?posted=true&first=12`; if (cursor) url += `&after=${cursor}`;
    const data = await fetchApiJson(url); const { projects } = data;
    if (projects?.data?.length) {
      const frag = document.createDocumentFragment();
      projects.data.forEach(item => { const el = createProjectCard(item); if (el) frag.appendChild(el); });
      projectsGrid.appendChild(frag); nextCursor = projects.meta?.end_cursor; hasMore = !!projects.meta?.has_next_page;
    } else { hasMore = false; }
  } catch (e) {
    console.error('Error fetching projects:', e); projectsGrid.innerHTML += '<p>Failed to load projects. Please try again later.</p>'; hasMore = false;
  } finally { isLoading = false; if (!hasMore) loader.style.display = 'none'; else loader.classList.remove('visible'); }
}

function displayUserProfile(user) {
  const u = user?.username || 'Anonymous'; const profileLink = `https://websim.com/@${u}`; const avatarUrl = `https://images.websim.com/avatar/${u}`;
  userProfileContainer.innerHTML = `<a class="link" href="${profileLink}" target="_blank" rel="noopener" title="View profile on websim.com">
    <img src="${avatarUrl}" alt="${u}'s profile picture" class="user-avatar" style="width:48px;height:48px;border-radius:50%;vertical-align:middle;margin-right:10px;">
    <h1 style="display:inline-block;margin:0;vertical-align:middle;">@${u}'s Projects</h1></a>`;
}

function createProjectCard({ project, project_revision, site }) {
  if (!project || !project_revision || !site) return null;
  const card = document.createElement('div'); card.className = 'project-card'; card.dataset.iframeSrc = `https://websim.com${site.link_url}`;
  const thumbnailUrl = `https://images.websim.com/v1/site/${site.id}/600`;
  const date = new Date(project.created_at).toLocaleDateString('en-US',{ year:'numeric', month:'short', day:'numeric' });
  card.innerHTML = `<div class="thumbnail"><img src="${thumbnailUrl}" alt="${project.title || 'Project thumbnail'}" loading="lazy"></div>
    <div class="card-content"><h3 class="title" title="${project.title || 'Untitled Project'}">${project.title || 'Untitled Project'}</h3>
    <p class="date">Created: ${date}</p>
    <div class="stats"><span>👁️ ${(project.stats?.views||0).toLocaleString()}</span>
    <span>❤️ ${(project.stats?.likes||0).toLocaleString()}</span><span>🤖 ${project_revision.version}</span></div></div>`;
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

document.addEventListener('DOMContentLoaded', ()=>{ fetchProjects(); setupInfiniteScroll(); });