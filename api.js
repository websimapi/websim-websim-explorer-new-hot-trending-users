// Generic API helpers wrapping window.websim.fetchApi with graceful fallbacks
async function fetchApiJson(url, options = {}) {
  const res = await window.websim.fetchApi({ url, options: { method: "GET", ...options } });
  if (!res || res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res?.status}`);
  const reader = res.body.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const blob = new Blob(chunks, { type: "application/json" });
  return JSON.parse(await blob.text());
}

// Attempt multiple known/likely endpoints for each category
const PROJECT_ENDPOINTS = {
  new: [
    "/api/v1/projects/new",
    "/api/v1/sites/new",
    "/api/v1/trending?type=new"
  ],
  hot: [
    "/api/v1/projects/hot",
    "/api/v1/trending?type=hot"
  ],
  trending: [
    "/api/v1/projects/trending",
    "/api/v1/trending"
  ]
};

const USER_ENDPOINTS = [
  "/api/v1/users/trending",
  "/api/v1/users/popular"
];

function firstTruthy(arr) {
  return arr.find((x) => x != null);
}

export async function fetchProjects(kind = "trending") {
  const list = PROJECT_ENDPOINTS[kind] || PROJECT_ENDPOINTS.trending;
  let lastErr;
  for (const url of list) {
    try {
      const body = await fetchApiJson(url);
      // Try common shapes:
      const items =
        body?.projects?.data ||
        body?.projects ||
        body?.sites?.data ||
        body?.sites ||
        body?.data ||
        body;
      if (Array.isArray(items)) return items;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No endpoint worked");
}

export async function fetchUsers() {
  let lastErr;
  for (const url of USER_ENDPOINTS) {
    try {
      const body = await fetchApiJson(url);
      const items = body?.users?.data || body?.users || body?.data || body;
      if (Array.isArray(items)) return items;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No user endpoint worked");
}

// Normalizers to a consistent UI model
export function normalizeProject(x) {
  const site = firstTruthy([x.site, x]);
  const creator = firstTruthy([x.creator, x.user, x.author]);
  return {
    title: x.title || site?.title || "Untitled",
    projectId: x.id && String(x.id).startsWith("p_") ? x.id : (x.project_id || null),
    siteId: site?.id || x.site_id || (x.site && x.site.id) || null,
    creator: creator ? { username: creator.username || creator.handle || creator.name || "unknown" } : { username: "unknown" },
    createdAt: x.created_at || x.createdAt || site?.created_at || null,
    likes: x.likes_count ?? x.likes ?? x.hearts ?? 0,
    comments: x.comments_count ?? x.comments ?? 0,
    views: x.views_count ?? x.views ?? 0,
    kind: x.kind || (x.project_id ? "project" : "site")
  };
}

export function normalizeUser(u) {
  return {
    id: u.id,
    username: u.username || u.handle || "unknown",
    stats: {
      projects: u.projects_count ?? u.projects ?? 0,
      likes: u.likes_count ?? u.likes ?? 0
    }
  };
}

