import removeBackground from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const chooseImgBtn = document.getElementById('chooseImgBtn');
const heroSection = document.getElementById('hero');
const editorSection = document.getElementById('editor-section');

const renderCanvas = document.getElementById('renderCanvas');
const ctx = renderCanvas.getContext('2d');
const checkerboardBg = document.getElementById('checkerboardBg');
const processingOverlay = document.getElementById('processingOverlay');
const processStatusText = document.getElementById('processStatusText');
const processSubText = document.getElementById('processSubText');
const progressBarFill = document.getElementById('progressBarFill');

const actionPanel = document.getElementById('actionPanel');
const customizerPanel = document.getElementById('customizerPanel');
const removeBgBtn = document.getElementById('removeBgBtn');
const reprocessBtn = document.getElementById('reprocessBtn');
const clearImageBtn = document.getElementById('clearImageBtn');

const imageFileName = document.getElementById('imageFileName');
const imageDimensions = document.getElementById('imageDimensions');

// View & Zoom controls
const tabProcessed = document.getElementById('tabProcessed');
const tabOriginal = document.getElementById('tabOriginal');
const tabCompare = document.getElementById('tabCompare');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomResetBtn = document.getElementById('zoomReset');
const zoomLevelText = document.getElementById('zoomLevel');

// Background Customizer controls
const bgTypeBtns = document.querySelectorAll('.bg-type-btn');
const solidControlGroup = document.getElementById('solidControlGroup');
const gradientControlGroup = document.getElementById('gradientControlGroup');
const customBgControlGroup = document.getElementById('customBgControlGroup');
const colorPresets = document.querySelectorAll('.color-preset');
const customColorPicker = document.getElementById('customColorPicker');
const gradientPresets = document.querySelectorAll('.gradient-preset');
const uploadBgImgBtn = document.getElementById('uploadBgImgBtn');
const bgImageInput = document.createElement('input');
bgImageInput.type = 'file';
bgImageInput.accept = 'image/*';

// Export Buttons
const downloadPngBtn = document.getElementById('downloadPngBtn');
const downloadJpgBtn = document.getElementById('downloadJpgBtn');
const downloadWebpBtn = document.getElementById('downloadWebpBtn');

// App State
let originalImageFile = null;
let originalImageObj = null;
let foregroundImgBitmap = null; // Foreground image after BG removal
let currentZoom = 1;
let currentView = 'processed'; // 'processed', 'original', 'compare'
let backgroundType = 'transparent'; // 'transparent', 'solid', 'gradient', 'custom'
let solidColor = '#ffffff';
let currentGradient = 'linear-gradient(135deg, #38bdf8, #818cf8)';
let customBgImgObj = null;

// --- Theme Toggle ---
themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
});

// --- File Selection & Drag Drop ---
chooseImgBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', (e) => {
    if(e.target.tagName !== 'BUTTON') fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageSelection(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        handleImageSelection(e.target.files[0]);
    }
});

function handleImageSelection(file) {
    if (!file.type.match('image.*')) {
        alert('Please select a valid image file (JPEG, PNG, WebP).');
        return;
    }
    if (file.size > 15 * 1024 * 1024) {
        alert('File size exceeds 15MB limit.');
        return;
    }

    originalImageFile = file;
    imageFileName.innerHTML = `<i class="fa-solid fa-image"></i> ${file.name}`;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            originalImageObj = img;
            imageDimensions.textContent = `${img.naturalWidth} x ${img.naturalHeight} px`;
            
            // Switch UI views
            editorSection.classList.remove('hidden');
            editorSection.scrollIntoView({ behavior: 'smooth' });
            
            // Reset state
            foregroundImgBitmap = null;
            actionPanel.classList.remove('hidden');
            customizerPanel.classList.add('hidden');
            
            // Display original on canvas initially
            currentView = 'original';
            updateActiveTab();
            drawCanvas();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// --- AI Background Removal ---
removeBgBtn.addEventListener('click', async () => {
    if (!originalImageFile) return;

    // Disable button & show loader
    removeBgBtn.disabled = true;
    processingOverlay.classList.add('active');
    processStatusText.textContent = 'Initializing AI Model...';
    processSubText.textContent = 'Downloading ONNX WebAssembly weights (First run only).';
    progressBarFill.style.width = '10%';

    try {
        const config = {
            progress: (key, current, total) => {
                const percent = Math.round((current / total) * 90);
                progressBarFill.style.width = `${Math.max(10, percent)}%`;
                processStatusText.textContent = `Downloading AI Assets... (${key})`;
                processSubText.textContent = `${current} of ${total} bytes downloaded`;
            },
            debug: false
        };

        processStatusText.textContent = 'Running AI Segmentation...';
        const blob = await removeBackground(originalImageFile, config);
        
        progressBarFill.style.width = '100%';
        
        const foregroundUrl = URL.createObjectURL(blob);
        const fgImg = new Image();
        fgImg.onload = () => {
            foregroundImgBitmap = fgImg;
            processingOverlay.classList.remove('active');
            actionPanel.classList.add('hidden');
            customizerPanel.classList.remove('hidden');
            currentView = 'processed';
            updateActiveTab();
            drawCanvas();
            removeBgBtn.disabled = false;
        };
        fgImg.src = foregroundUrl;

    } catch (error) {
        console.error('AI Background Removal Error:', error);
        alert('Failed to remove background: ' + (error.message || 'Unknown error'));
        processingOverlay.classList.remove('active');
        removeBgBtn.disabled = false;
    }
});

// --- Canvas Drawing & Compositing ---
function drawCanvas() {
    if (!originalImageObj) return;

    let targetImg = originalImageObj;
    if (currentView === 'processed' && foregroundImgBitmap) {
        targetImg = foregroundImgBitmap;
    }

    renderCanvas.width = targetImg.naturalWidth || targetImg.width;
    renderCanvas.height = targetImg.naturalHeight || targetImg.height;

    ctx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);

    // If viewing processed or custom background, render background first
    if (currentView === 'processed' && foregroundImgBitmap) {
        if (backgroundType === 'solid') {
            ctx.fillStyle = solidColor;
            ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
        } else if (backgroundType === 'gradient') {
            // Draw gradient parser
            const grad = parseCSSGradient(currentGradient, renderCanvas.width, renderCanvas.height);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
        } else if (backgroundType === 'custom' && customBgImgObj) {
            ctx.drawImage(customBgImgObj, 0, 0, renderCanvas.width, renderCanvas.height);
        }
        // If 'transparent', checkerboard handles visual transparency
    }

    // Draw foreground image
    ctx.drawImage(targetImg, 0, 0, renderCanvas.width, renderCanvas.height);

    // Update checkerboard visibility
    if (currentView === 'processed' && backgroundType === 'transparent') {
        checkerboardBg.style.display = 'block';
    } else {
        checkerboardBg.style.display = 'none';
    }

    // Apply zoom transform
    renderCanvas.style.transform = `scale(${currentZoom})`;
}

// Helper to convert CSS gradient string to Canvas CanvasGradient
function parseCSSGradient(cssGrad, width, height) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (cssGrad.includes('#38bdf8')) {
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(1, '#818cf8');
    } else if (cssGrad.includes('#f43f5e')) {
        grad.addColorStop(0, '#f43f5e');
        grad.addColorStop(1, '#fb923c');
    } else if (cssGrad.includes('#10b981')) {
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(1, '#3b82f6');
    } else {
        grad.addColorStop(0, '#8b5cf6');
        grad.addColorStop(1, '#ec4899');
    }
    return grad;
}

// --- View & Zoom Handlers ---
tabProcessed.addEventListener('click', () => {
    if (!foregroundImgBitmap) return;
    currentView = 'processed';
    updateActiveTab();
    drawCanvas();
});

tabOriginal.addEventListener('click', () => {
    currentView = 'original';
    updateActiveTab();
    drawCanvas();
});

tabCompare.addEventListener('click', () => {
    currentView = 'original';
    updateActiveTab();
    drawCanvas();
    // Quick toggle back and forth or show original
});

function updateActiveTab() {
    [tabProcessed, tabOriginal, tabCompare].forEach(btn => btn.classList.remove('active'));
    if (currentView === 'processed') tabProcessed.classList.add('active');
    if (currentView === 'original') tabOriginal.classList.add('active');
}

zoomInBtn.addEventListener('click', () => {
    currentZoom = Math.min(3, currentZoom + 0.25);
    zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
    renderCanvas.style.transform = `scale(${currentZoom})`;
});

zoomOutBtn.addEventListener('click', () => {
    currentZoom = Math.max(0.5, currentZoom - 0.25);
    zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
    renderCanvas.style.transform = `scale(${currentZoom})`;
});

zoomResetBtn.addEventListener('click', () => {
    currentZoom = 1;
    zoomLevelText.textContent = '100%';
    renderCanvas.style.transform = `scale(${currentZoom})`;
});

// --- Background Customizer Controls ---
bgTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        bgTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        backgroundType = btn.getAttribute('data-bg');

        solidControlGroup.style.display = backgroundType === 'solid' ? 'block' : 'none';
        gradientControlGroup.style.display = backgroundType === 'gradient' ? 'block' : 'none';
        customBgControlGroup.style.display = backgroundType === 'custom' ? 'block' : 'none';

        drawCanvas();
    });
});

colorPresets.forEach(preset => {
    preset.addEventListener('click', () => {
        colorPresets.forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        solidColor = preset.getAttribute('data-color');
        drawCanvas();
    });
});

customColorPicker.addEventListener('input', (e) => {
    solidColor = e.target.value;
    drawCanvas();
});

gradientPresets.forEach(preset => {
    preset.addEventListener('click', () => {
        gradientPresets.forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        currentGradient = preset.getAttribute('data-grad');
        drawCanvas();
    });
});

uploadBgImgBtn.addEventListener('click', () => bgImageInput.click());
bgImageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const bgImg = new Image();
            bgImg.onload = () => {
                customBgImgObj = bgImg;
                drawCanvas();
            };
            bgImg.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

// --- Clear & Reprocess ---
clearImageBtn.addEventListener('click', resetApp);
reprocessBtn.addEventListener('click', () => {
    editorSection.classList.add('hidden');
    heroSection.scrollIntoView({ behavior: 'smooth' });
});

function resetApp() {
    originalImageFile = null;
    originalImageObj = null;
    foregroundImgBitmap = null;
    customBgImgObj = null;
    fileInput.value = '';
    editorSection.classList.add('hidden');
    heroSection.scrollIntoView({ behavior: 'smooth' });
}

// --- Export & Download ---
downloadPngBtn.addEventListener('click', () => {
    // If transparent is selected, export transparent canvas cleanly
    if (backgroundType === 'transparent' && foregroundImgBitmap) {
        // Redraw strictly transparent
        ctx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
        ctx.drawImage(foregroundImgBitmap, 0, 0);
    }
    triggerDownload('image/png', 'bg-gayeb-koro-hd.png');
    if (backgroundType === 'transparent' && foregroundImgBitmap) drawCanvas();
});

downloadJpgBtn.addEventListener('click', () => {
    if (backgroundType === 'transparent') {
        // Force white background for JPG
        const prevBg = backgroundType;
        backgroundType = 'solid';
        solidColor = '#ffffff';
        drawCanvas();
        triggerDownload('image/jpeg', 'bg-gayeb-koro.jpg', 0.95);
        backgroundType = prevBg;
        drawCanvas();
    } else {
        triggerDownload('image/jpeg', 'bg-gayeb-koro.jpg', 0.95);
    }
});

downloadWebpBtn.addEventListener('click', () => {
    triggerDownload('image/webp', 'bg-gayeb-koro.webp', 0.95);
});

function triggerDownload(mimeType, filename, quality = 1.0) {
    const dataUrl = renderCanvas.toDataURL(mimeType, quality);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
