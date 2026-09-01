// Konfigurasi Supabase
const SUPABASE_URL = "https://vvwqdbzehzddyarhfntg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5baFfm3y3K85sfLVzAIt2A_dgAQGIAd";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const fileContainer = document.getElementById('fileContainer');
const fileCount = document.getElementById('fileCount');

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
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) {
    return svg('<rect x="3" y="3" width="18" height="18" rx="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 15l-5-5L5 21"/>');
  }
  if (ext === 'pdf') {
    return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 2v5h5M9 13h1.5a1.5 1.5 0 010 3H9v-3zm0 3v2m5-5v5m0-5h1.3a1.2 1.2 0 010 2.4H14"/>');
  }
  if (['zip','rar','7z','tar','gz'].includes(ext)) {
    return svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 4v4M14 8v2M10 10v2M14 12v2M10 16v2"/>');
  }
  if (['mp3','wav','flac','m4a'].includes(ext)) {
    return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>');
  }
  if (['mp4','mov','mkv','webm'].includes(ext)) {
    return svg('<rect x="2" y="5" width="15" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 9l5-3v12l-5-3"/>');
  }
  if (['doc','docx','txt','md'].includes(ext)) {
    return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 2v5h5M8 13h8M8 17h8M8 9h3"/>');
  }
  return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 2v5h5"/>');
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = `<span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function renderEmpty() {
  fileCount.textContent = '';
  fileContainer.innerHTML = `
    <div class="state-block">
      <svg class="state-icon" width="28" height="28" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" fill="none">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
      </svg>
      <p>Belum ada file di sini. Upload file pertama dari perangkat ini.</p>
      <a href="upload.html" class="btn btn-dark">Upload File</a>
    </div>`;
}

function renderError(message) {
  fileCount.textContent = '';
  fileContainer.innerHTML = `
    <div class="state-block state-error">
      <svg class="state-icon" width="28" height="28" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" fill="none">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
      <p>File gagal dimuat: ${message}</p>
      <button type="button" class="btn btn-outline" id="retryBtn">Coba Lagi</button>
    </div>`;
  document.getElementById('retryBtn').addEventListener('click', loadFiles);
}

async function loadFiles() {
  fileCount.textContent = '';
  fileContainer.innerHTML = `
    <div class="state-block">
      <svg class="state-icon spin" width="24" height="24" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" fill="none">
        <path stroke-linecap="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
      </svg>
      <p>Mencari file...</p>
    </div>`;

  try {
    const { data, error } = await supabaseClient
      .storage
      .from('files')
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) throw error;

    const files = (data || []).filter(item => item.name !== '.emptyFolderPlaceholder');

    if (files.length === 0) {
      renderEmpty();
      return;
    }

    fileCount.textContent = `${files.length} file`;
    fileContainer.innerHTML = '';

    files.forEach((item, idx) => {
      const isTemp = item.name.startsWith('temp_30d_');
      const cleanName = item.name.replace(/^(temp_30d_|perm_)\d+_/, '');
      const fileSize = item.metadata ? formatBytes(item.metadata.size) : 'Ukuran tidak diketahui';
      const uploadDate = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      // Penting: minta URL versi "download" ke Supabase (bukan public URL biasa).
      // Ini membuat server mengirim header Content-Disposition: attachment,
      // sehingga file benar-benar terunduh, bukan cuma dibuka di tab baru
      // (atribut `download` di tag <a> diabaikan browser untuk link cross-origin).
      const { data: urlData } = supabaseClient
        .storage
        .from('files')
        .getPublicUrl(item.name, { download: cleanName });

      const card = document.createElement('div');
      card.className = 'file-card';
      card.style.animationDelay = `${Math.min(idx, 8) * 45}ms`;
      card.innerHTML = `
        <div class="file-icon">${iconForFile(cleanName)}</div>
        <div class="file-info">
          <div class="file-name" title="${cleanName}">${cleanName}</div>
          <div class="file-meta">
            <span class="badge ${isTemp ? 'badge-temp' : 'badge-perm'}">${isTemp ? 'Hapus 30 Hari' : 'Permanen'}</span>
            <span>${fileSize}</span>
            <span>${uploadDate}</span>
          </div>
        </div>
        <div class="file-actions">
          <button type="button" class="btn-icon copy-link" aria-label="Salin tautan" title="Salin tautan">
            <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 10-7.07-7.07L11.5 4.5M14 11a5 5 0 00-7.07 0l-2.83 2.83a5 5 0 107.07 7.07L12.5 19.5"/></svg>
          </button>
          <a href="${urlData.publicUrl}" class="btn-icon" download="${cleanName}" aria-label="Unduh ${cleanName}" title="Unduh">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </a>
        </div>
      `;
      card.querySelector('.copy-link').addEventListener('click', async () => {
        try {
          // Untuk share link, pakai public URL biasa (tanpa forced download)
          const { data: shareUrl } = supabaseClient.storage.from('files').getPublicUrl(item.name);
          await navigator.clipboard.writeText(shareUrl.publicUrl);
          showToast('Tautan disalin');
        } catch {
          showToast('Gagal menyalin tautan');
        }
      });
      fileContainer.appendChild(card);
    });

  } catch (error) {
    renderError(error.message);
  }
}

loadFiles();