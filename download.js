// Konfigurasi Supabase
const SUPABASE_URL = "https://vvwqdbzehzddyarhfntg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5baFfm3y3K85sfLVzAIt2A_dgAQGIAd";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ipGateSection = document.getElementById('ipGateSection');
const fileWorkspaceSection = document.getElementById('fileWorkspaceSection');
const ipForm = document.getElementById('ipForm');
const ipInput = document.getElementById('ipInput');
const currentIpText = document.getElementById('currentIpText');
const changeIpBtn = document.getElementById('changeIpBtn');

const fileContainer = document.getElementById('fileContainer');
const fileCount = document.getElementById('fileCount');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const refreshBtn = document.getElementById('refreshBtn');

const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 jam
let currentIp = null;
let cachedFiles = [];

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024, dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function iconForFile(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const svg = (path) => `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">${path}</svg>`;
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return svg('<rect x="3" y="3" width="18" height="18" rx="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 15l-5-5L5 21"/>');
  if (ext === 'pdf') return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 2v5h5M9 13h1.5a1.5 1.5 0 010 3H9v-3zm0 3v2m5-5v5m0-5h1.3a1.2 1.2 0 010 2.4H14"/>');
  if (['zip','rar','7z','tar','gz'].includes(ext)) return svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 4v4M14 8v2M10 10v2M14 12v2M10 16v2"/>');
  if (['mp3','wav','flac','m4a'].includes(ext)) return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>');
  if (['mp4','mov','mkv','webm'].includes(ext)) return svg('<rect x="2" y="5" width="15" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 9l5-3v12l-5-3"/>');
  if (['doc','docx','txt','md'].includes(ext)) return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 2v5h5M8 13h8M8 17h8M8 9h3"/>');
  return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 2v5h5"/>');
}

let toastTimer = null;
function showToast(message, kind = 'info') {
  const toast = document.getElementById("toast");
  if (!toast) return;
  const icons = {
    success: '<svg width="18" height="18" fill="none" stroke="#2bd1ac" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
    error: '<svg width="18" height="18" fill="none" stroke="#e0685a" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
    info: ''
  };
  toast.innerHTML = `${icons[kind] || ''}<span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function timeRemaining(createdAt) {
  const expiresAt = new Date(createdAt).getTime() + RETENTION_MS;
  const diffMs = expiresAt - Date.now();
  if (diffMs <= 0) return 'Kedaluwarsa';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `Tersisa ${hours} jam ${minutes} mnt`;
  }
  return `Tersisa ${minutes} mnt`;
}

function renderEmpty(message = 'Belum ada file di storage IP ini.') {
  fileCount.textContent = '0 file';
  fileContainer.innerHTML = `<div class="state-block"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p>${message}</p><a href="upload.html" class="btn btn-primary btn-compact">Upload file baru</a></div>`;
}

function renderError(message) {
  fileCount.textContent = '';
  fileContainer.innerHTML = `<div class="state-block state-error"><p>Gagal memuat storage: ${message}</p><button type="button" class="btn btn-secondary btn-compact" id="retryBtn">Coba Lagi</button></div>`;
  document.getElementById('retryBtn').addEventListener('click', () => loadFiles(currentIp));
}

function renderLoading() {
  fileContainer.innerHTML = `<div class="state-block"><div class="loader"></div><p>Menghubungkan ke storage IP ${currentIp}...</p></div>`;
}

function renderFiles(files) {
  const query = searchInput.value.trim().toLowerCase();
  const sorted = [...files].sort((a, b) => {
    const diff = new Date(a.created_at) - new Date(b.created_at);
    return sortSelect.value === 'oldest' ? diff : -diff;
  });
  const visible = sorted.filter(item => item.name.toLowerCase().includes(query));

  fileCount.textContent = `${visible.length} file${visible.length === 1 ? '' : 's'}`;
  if (!visible.length) {
    renderEmpty(query ? 'Tidak ada file yang cocok dengan pencarian.' : 'Belum ada file di storage IP ini.');
    return;
  }

  fileContainer.innerHTML = '';
  visible.forEach((item, idx) => {
    const fileName = item.name;
    const fileSize = item.metadata ? formatBytes(item.metadata.size) : 'Ukuran tidak diketahui';
    const uploadDate = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const remainingStr = timeRemaining(item.created_at);
    const fullPath = `${currentIp}/${fileName}`;
    const { data: urlData } = supabaseClient.storage.from('files').getPublicUrl(fullPath, { download: fileName });

    const card = document.createElement('div');
    card.className = 'file-card';
    card.style.animationDelay = `${Math.min(idx, 8) * 45}ms`;
    card.innerHTML = `<div class="file-icon">${iconForFile(fileName)}</div><div class="file-info"><div class="file-name" title="${fileName}">${fileName}</div><div class="file-meta"><span class="badge badge-temp">${remainingStr}</span><span>${fileSize}</span><span>${uploadDate}</span></div></div><div class="file-actions"><button type="button" class="btn-icon copy-link" aria-label="Salin tautan" title="Salin tautan"><svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 10-7.07-7.07L11.5 4.5M14 11a5 5 0 00-7.07 0l-2.83 2.83a5 5 0 107.07 7.07L12.5 19.5"/></svg></button><a href="${urlData.publicUrl}" class="btn-icon" download="${fileName}" aria-label="Unduh ${fileName}" title="Unduh"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></a></div>`;

    card.querySelector('.copy-link').addEventListener('click', async () => {
      try {
        const { data: shareUrl } = supabaseClient.storage.from('files').getPublicUrl(fullPath);
        await navigator.clipboard.writeText(shareUrl.publicUrl);
        showToast('Tautan disalin', 'success');
      } catch { showToast('Gagal menyalin tautan', 'error'); }
    });
    fileContainer.appendChild(card);
  });
}

async function loadFiles(ip) {
  currentIp = ip;
  currentIpText.textContent = ip;
  ipGateSection.style.display = 'none';
  fileWorkspaceSection.style.display = 'block';

  renderLoading();
  refreshBtn.classList.add('loading');
  try {
    const { data, error } = await supabaseClient.storage.from('files').list(ip, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) throw error;
    cachedFiles = (data || []).filter(item => item.name !== '.emptyFolderPlaceholder');
    renderFiles(cachedFiles);
  } catch (error) { 
    renderError(error.message); 
  } finally { 
    refreshBtn.classList.remove('loading'); 
  }
}

ipForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const ipVal = ipInput.value.trim();
  if (!ipVal) return;
  loadFiles(ipVal);
  const newUrl = `${window.location.pathname}?ip=${ipVal}`;
  window.history.pushState({ ip: ipVal }, '', newUrl);
});

changeIpBtn.addEventListener('click', () => {
  fileWorkspaceSection.style.display = 'none';
  ipGateSection.style.display = 'block';
  ipInput.value = '';
  ipInput.focus();
  window.history.pushState({}, '', window.location.pathname);
});

searchInput.addEventListener('input', () => renderFiles(cachedFiles));
sortSelect.addEventListener('change', () => renderFiles(cachedFiles));
refreshBtn.addEventListener('click', () => loadFiles(currentIp));

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { 
    e.preventDefault(); 
    if (fileWorkspaceSection.style.display !== 'none') {
      searchInput.focus(); 
      searchInput.select(); 
    }
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const ipParam = params.get('ip');
  if (ipParam) {
    ipInput.value = ipParam;
    loadFiles(ipParam);
  }
});