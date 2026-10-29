// Konfigurasi Supabase
const SUPABASE_URL = "https://vvwqdbzehzddyarhfntg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5baFfm3y3K85sfLVzAIt2A_dgAQGIAd";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ambil elemen DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const uploadBtn = document.getElementById('uploadBtn');
const uploadBtnLabel = document.getElementById('uploadBtnLabel');
const selectedFilesContainer = document.getElementById('selectedFilesContainer');
const selectedFilesCount = document.getElementById('selectedFilesCount');
const selectedFilesList = document.getElementById('selectedFilesList');
const clearAllBtn = document.getElementById('clearAllBtn');

const progressTrack = document.getElementById('progressTrack');
const progressStatus = document.getElementById('progressStatus');
const progressSpeed = document.getElementById('progressSpeed');
const progressFill = document.getElementById('progressFill');
const progressStatsText = document.getElementById('progressStatsText');
const progressEtaText = document.getElementById('progressEtaText');

const uploadControls = document.getElementById('uploadControls');
const successState = document.getElementById('successState');
const successSummary = document.getElementById('successSummary');
const panelHeadDefault = document.getElementById('panelHeadDefault');
const copyIpBtn = document.getElementById('copyIpBtn');
const uploadedFilesPreview = document.getElementById('uploadedFilesPreview');

let selectedFiles = [];
let dragCounter = 0;

// Generate IP numerik acak dengan format IPv4 asli (contoh: 192.168.x.x atau acak penuh)
function generateIPv4() {
  const octet1 = Math.floor(Math.random() * 254) + 1; // 1-254
  const octet2 = Math.floor(Math.random() * 256);     // 0-255
  const octet3 = Math.floor(Math.random() * 256);     // 0-255
  const octet4 = Math.floor(Math.random() * 254) + 1; // 1-254
  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

// Ikon berdasarkan tipe file
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
  if (['doc','docx','txt','md','xls','xlsx','ppt','pptx'].includes(ext)) {
    return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 2v5h5M8 13h8M8 17h8M8 9h3"/>');
  }
  return svg('<path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 2v5h5"/>');
}

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024, dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec) {
  if (!+bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${Math.round(bytesPerSec / 1024)} KB/s`;
}

let toastTimer = null;
function showToast(message, kind = 'info') {
  const toast = document.getElementById("toast");
  const icons = {
    success: '<svg width="18" height="18" fill="none" stroke="#2bd1ac" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
    error: '<svg width="18" height="18" fill="none" stroke="#e0685a" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
    info: ''
  };
  toast.innerHTML = `${icons[kind] || ''}<span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// Klik & keyboard untuk memilih file
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFilesSelected(Array.from(e.target.files));
  }
});

dropZone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragover', (e) => e.preventDefault());
dropZone.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropZone.classList.remove('dragover');
  }
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFilesSelected(Array.from(e.dataTransfer.files));
  }
});

function handleFilesSelected(newFiles) {
  if (!newFiles || newFiles.length === 0) return;

  // Hindari duplikasi file dengan memeriksa nama, ukuran, dan waktu modifikasi
  newFiles.forEach(nf => {
    const exists = selectedFiles.some(f => f.name === nf.name && f.size === nf.size && f.lastModified === nf.lastModified);
    if (!exists) {
      selectedFiles.push(nf);
    }
  });

  renderSelectedFiles();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  if (selectedFiles.length === 0) {
    clearSelection();
  } else {
    renderSelectedFiles();
  }
}

function clearSelection() {
  selectedFiles = [];
  fileInput.value = '';
  dropZone.classList.remove('has-file');
  fileNameDisplay.textContent = 'Tarik file ke sini';
  selectedFilesContainer.style.display = 'none';
  selectedFilesList.innerHTML = '';
  uploadBtn.disabled = true;
  uploadBtnLabel.textContent = 'Mulai upload';
}

clearAllBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearSelection();
});

function renderSelectedFiles() {
  if (selectedFiles.length === 0) {
    clearSelection();
    return;
  }

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  dropZone.classList.add('has-file');
  fileNameDisplay.textContent = `${selectedFiles.length} file dipilih`;
  selectedFilesCount.textContent = `${selectedFiles.length} file dipilih (${formatBytes(totalBytes)})`;
  selectedFilesContainer.style.display = 'flex';
  uploadBtn.disabled = false;
  uploadBtnLabel.textContent = `Mulai upload (${selectedFiles.length} file)`;

  selectedFilesList.innerHTML = '';
  selectedFiles.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'selected-file-item';
    item.innerHTML = `
      <div class="f-icon">${iconForFile(file.name)}</div>
      <div class="f-info">
        <div class="f-name" title="${file.name}">${file.name}</div>
        <div class="f-size">${formatBytes(file.size)}</div>
      </div>
      <button type="button" class="f-remove" aria-label="Hapus ${file.name}">
        <svg viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    `;
    item.querySelector('.f-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(idx);
    });
    selectedFilesList.appendChild(item);
  });
}

// Upload file individual dengan tracking progress realtime via XMLHttpRequest (dengan fallback)
function uploadSingleFile(file, filePath, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const url = `${SUPABASE_URL}/storage/v1/object/files/${encodedPath}`;
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'true');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        // Fallback ke Supabase JS Client jika endpoint XHR spesifik ditolak
        supabaseClient.storage.from('files').upload(filePath, file, { upsert: true })
          .then(({ data, error }) => {
            if (error) reject(new Error(xhr.responseText || error.message));
            else resolve(data);
          })
          .catch(reject);
      }
    };

    xhr.onerror = () => {
      // Fallback ke Supabase JS Client saat network / CORS issue
      supabaseClient.storage.from('files').upload(filePath, file, { upsert: true })
        .then(({ data, error }) => {
          if (error) reject(new Error(error.message));
          else resolve(data);
        })
        .catch(reject);
    };

    xhr.send(file);
  });
}

// Proses Upload ke Supabase
uploadBtn.addEventListener('click', async () => {
  if (!selectedFiles || selectedFiles.length === 0) return;

  const filesToUpload = [...selectedFiles];
  const totalFiles = filesToUpload.length;
  const totalBytes = filesToUpload.reduce((acc, f) => acc + f.size, 0);

  // Kunci antarmuka
  uploadBtn.disabled = true;
  uploadBtnLabel.textContent = 'Mengunggah...';
  dropZone.style.pointerEvents = 'none';
  clearAllBtn.style.pointerEvents = 'none';
  document.querySelectorAll('.f-remove').forEach(btn => btn.style.display = 'none');
  
  progressTrack.classList.add('active');
  progressFill.style.width = '0%';
  progressSpeed.textContent = '⚡ 0 KB/s';
  progressStatsText.textContent = `0% (0 / ${formatBytes(totalBytes)})`;
  progressEtaText.textContent = 'Menghitung waktu...';

  const ipCode = generateIPv4();
  let uploadedBytesBeforeCurrent = 0;
  let lastTimestamp = performance.now();
  let lastBytesLoadedTotal = 0;
  let smoothedSpeed = 0;

  try {
    for (let i = 0; i < totalFiles; i++) {
      const file = filesToUpload[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${ipCode}/${safeName}`;

      progressStatus.textContent = `Mengunggah (${i + 1}/${totalFiles}): ${file.name}`;

      await uploadSingleFile(file, filePath, (fileLoaded, fileTotal) => {
        const totalLoadedSoFar = uploadedBytesBeforeCurrent + fileLoaded;
        const percent = Math.min(99, Math.round((totalLoadedSoFar / totalBytes) * 100));
        progressFill.style.width = `${percent}%`;
        progressStatsText.textContent = `${percent}% (${formatBytes(totalLoadedSoFar)} / ${formatBytes(totalBytes)})`;

        // Hitung kecepatan realtime
        const now = performance.now();
        const timeDelta = (now - lastTimestamp) / 1000; // dalam detik
        if (timeDelta >= 0.25) {
          const bytesDelta = totalLoadedSoFar - lastBytesLoadedTotal;
          const instantSpeed = bytesDelta / timeDelta;
          smoothedSpeed = smoothedSpeed === 0 ? instantSpeed : (smoothedSpeed * 0.65 + instantSpeed * 0.35);
          lastTimestamp = now;
          lastBytesLoadedTotal = totalLoadedSoFar;

          progressSpeed.textContent = `⚡ ${formatSpeed(smoothedSpeed)}`;

          if (smoothedSpeed > 0) {
            const remainingBytes = Math.max(0, totalBytes - totalLoadedSoFar);
            const etaSec = Math.round(remainingBytes / smoothedSpeed);
            progressEtaText.textContent = etaSec < 60 ? `Sisa: ~${etaSec} dtk` : `Sisa: ~${Math.ceil(etaSec / 60)} mnt`;
          }
        }
      });

      uploadedBytesBeforeCurrent += file.size;
    }

    // 100% Selesai
    progressFill.style.width = '100%';
    progressStatsText.textContent = `100% (${formatBytes(totalBytes)} / ${formatBytes(totalBytes)})`;
    progressSpeed.textContent = `⚡ Selesai`;
    progressEtaText.textContent = '0 dtk';
    progressStatus.textContent = 'Semua file berhasil diunggah!';

    setTimeout(() => {
      progressTrack.classList.remove('active');
      showToast(`${totalFiles} file berhasil diunggah!`, 'success');

      // Tampilkan UI Sukses
      uploadControls.style.display = 'none';
      panelHeadDefault.style.display = 'none';
      successState.style.display = 'block';

      document.getElementById('generatedIpDisplay').textContent = ipCode;
      successSummary.textContent = `${totalFiles} file (${formatBytes(totalBytes)}) siap dibagikan melalui IP storage di bawah.`;
      
      // Tampilkan daftar preview file yang diupload
      if (uploadedFilesPreview) {
        uploadedFilesPreview.innerHTML = filesToUpload.map(f => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span style="font-weight: 500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">${f.name}</span>
            <span style="font-size: 11px; color: var(--accent);">${formatBytes(f.size)}</span>
          </div>
        `).join('');
      }

      document.getElementById('goToDownloadBtn').href = `download.html?ip=${ipCode}`;

      // Fungsional Salin IP
      copyIpBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(ipCode);
          showToast('IP berhasil disalin', 'success');
        } catch (err) {
          showToast('Gagal menyalin IP', 'error');
        }
      };
    }, 500);

  } catch (error) {
    progressTrack.classList.remove('active');
    showToast('Upload gagal: ' + error.message, 'error');
    uploadBtn.disabled = false;
    uploadBtnLabel.textContent = `Mulai upload (${selectedFiles.length} file)`;
    dropZone.style.pointerEvents = 'auto';
    clearAllBtn.style.pointerEvents = 'auto';
    document.querySelectorAll('.f-remove').forEach(btn => btn.style.display = 'grid');
  }
});
