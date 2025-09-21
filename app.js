import dayjs from "dayjs";
import rel from "dayjs/relativeTime";
import { fetchProjects, fetchUsers, normalizeProject, normalizeUser } from "./api.js";
dayjs.extend(rel);

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const metaEl = document.getElementById("project-meta");

tabs.forEach((t) => t.addEventListener("click", () => activateTab(t.dataset.tab)));

function activateTab(name) {
  tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === name));
  panels.forEach((p) => p.classList.toggle("is-active", p.id === `panel-${name}`));
}

function setStatus(id, text) {
  const el = document.getElementById(`status-${id}`);
  el.textContent = text || "";
}

function projectCard(p) {
  const siteImg = p.siteId ? `https://images.websim.com/v1/site/${p.siteId}/600` : "";
  const link = p.projectId ? `https://websim.com/p/${p.projectId}` : (p.siteId ? `https://websim.com/c/${p.siteId}` : "#");
  return `
  <article class="card">
    <a class="link" href="${link}" target="_blank" rel="noopener">
      <img class="thumb" src="${siteImg}" alt="${p.title || "Project"}" loading="lazy" />
    </a>
    <div class="card-body">
      <h3 class="title"><a class="link" href="${link}" target="_blank" rel="noopener">${p.title || "Untitled"}</a></h3>
      <div class="row">
        <div class="meta">
          <img class="avatar" src="https://images.websim.com/avatar/${p.creator?.username || "unknown"}" alt="" />
          <a class="link" href="https://websim.com/@${p.creator?.username}" target="_blank" rel="noopener">@${p.creator?.username || "unknown"}</a>
          <span class="stat-dot"></span>
          <span title="${p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}">${p.createdAt ? dayjs(p.createdAt).fromNow() : ""}</span>
        </div>
        <span class="badge">${p.kind || "project"}</span>
      </div>
      <div class="stats">
        <span>❤ ${p.likes ?? 0}</span>
        <span>💬 ${p.comments ?? 0}</span>
        <span>👁 ${p.views ?? 0}</span>
      </div>
    </div>
  </article>`;
}

function userCard(u) {
  return `
  <article class="card user-card">
    <div class="user-row">
      <img class="user-avatar" src="https://images.websim.com/avatar/${u.username}" alt="" />
      <div>
        <div class="user-username"><a class="link" href="https://websim.com/@${u.username}" target="_blank" rel="noopener">@${u.username}</a></div>
        <div class="user-sub">${u.stats?.projects ?? 0} projects · ${u.stats?.likes ?? 0} likes</div>
      </div>
    </div>
  </article>`;
}

function renderList(containerId, items, renderItem) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = items.map(renderItem).join("");
}

function skeletonCards(containerId, count = 8) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = Array.from({ length: count }).map(() => `
    <article class="card">
      <div class="thumb skeleton"></div>
      <div class="card-body">
        <div class="title skeleton" style="height:18px;width:70%"></div>
        <div class="meta skeleton" style="height:14px;width:60%"></div>
        <div class="stats skeleton" style="height:12px;width:50%"></div>
      </div>
    </article>
  `).join("");
}

async function loadAll() {
  try {
    const current = await window.websim.getCurrentProject();
    if (current) metaEl.textContent = `Viewing from project: ${current.title}`;
  } catch {}

  // New
  skeletonCards("grid-new");
  setStatus("new", "Loading new projects…");
  try {
    const data = await fetchProjects("new");
    renderList("grid-new", data.map(normalizeProject), projectCard);
    setStatus("new", data.length ? "" : "No results");
  } catch (e) {
    setStatus("new", "Failed to load new projects.");
  }

  // Hot
  skeletonCards("grid-hot");
  setStatus("hot", "Loading hot projects…");
  try {
    const data = await fetchProjects("hot");
    renderList("grid-hot", data.map(normalizeProject), projectCard);
    setStatus("hot", data.length ? "" : "No results");
  } catch {
    setStatus("hot", "Failed to load hot projects.");
  }

  // Trending
  skeletonCards("grid-trending");
  setStatus("trending", "Loading trending projects…");
  try {
    const data = await fetchProjects("trending");
    renderList("grid-trending", data.map(normalizeProject), projectCard);
    setStatus("trending", data.length ? "" : "No results");
  } catch {
    setStatus("trending", "Failed to load trending projects.");
  }

  // Users
  skeletonCards("grid-users");
  setStatus("users", "Loading users…");
  try {
    const users = await fetchUsers();
    renderList("grid-users", users.map(normalizeUser), userCard);
    setStatus("users", users.length ? "" : "No results");
  } catch {
    setStatus("users", "Failed to load users.");
  }
}

loadAll();

