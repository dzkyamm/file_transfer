// Konfigurasi Supabase
const SUPABASE_URL = "https://vvwqdbzehzddyarhfntg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5baFfm3y3K85sfLVzAIt2A_dgAQGIAd";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ambil elemen DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const uploadBtn = document.getElementById('uploadBtn');
const selectedFileRow = document.getElementById('selectedFileRow');
const fName = document.getElementById('fName');
const fSize = document.getElementById('fSize');
const fIcon = document.getElementById('fIcon');
const fRemove = document.getElementById('fRemove');
const progressTrack = document.getElementById('progressTrack');
const uploadControls = document.getElementById('uploadControls');
const successState = document.getElementById('successState');
const panelHeadDefault = document.getElementById('panelHeadDefault');
const copyIpBtn = document.getElementById('copyIpBtn');

let selectedFile = null;
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
  if (['doc','docx','txt','md'].includes(ext)) {
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

fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

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
  if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
});

function handleFileSelect(file) {
  if (!file) return;
  selectedFile = file;
  dropZone.classList.add('has-file');
  fileNameDisplay.textContent = 'File dipilih';
  fIcon.innerHTML = iconForFile(file.name);
  fName.textContent = file.name;
  fName.title = file.name;
  fSize.textContent = formatBytes(file.size);
  selectedFileRow.style.display = 'flex';
  uploadBtn.disabled = false;
}

function clearSelection() {
  selectedFile = null;
  fileInput.value = '';
  dropZone.classList.remove('has-file');
  fileNameDisplay.textContent = 'Tarik file ke sini';
  selectedFileRow.style.display = 'none';
  uploadBtn.disabled = true;
}

fRemove.addEventListener('click', (e) => {
  e.stopPropagation();
  clearSelection();
});

// Proses Upload ke Supabase
uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Mengunggah...';
  dropZone.style.pointerEvents = 'none';
  fRemove.disabled = true;
  progressTrack.classList.add('active');

  const ipCode = generateIPv4();
  const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  // Simpan dalam folder path khusus berdasarkan IP
  const filePath = `${ipCode}/${safeName}`;

  try {
    const { error } = await supabaseClient.storage.from('files').upload(filePath, selectedFile);
    if (error) throw error;

    progressTrack.classList.remove('active');
    showToast(`Upload berhasil!`, 'success');
    
    // Tampilkan UI Sukses
    uploadControls.style.display = 'none';
    panelHeadDefault.style.display = 'none';
    successState.style.display = 'block';
    
    document.getElementById('generatedIpDisplay').textContent = ipCode;
    document.getElementById('goToDownloadBtn').href = `download.html?ip=${ipCode}`;
    
    // Fungsional Salin IP
    copyIpBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(ipCode);
        showToast('IP berhasil disalin', 'success');
      } catch (err) {
        showToast('Gagal menyalin tautan', 'error');
      }
    });

  } catch (error) {
    progressTrack.classList.remove('active');
    showToast('Upload gagal: ' + error.message, 'error');
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Mulai upload';
    dropZone.style.pointerEvents = 'auto';
    fRemove.disabled = false;
  }
});