// ==========================================
// KHAI BÁO BIẾN GIAO DIỆN & HỆ THỐNG
// ==========================================
const setupScreen = document.getElementById('setup-screen');
const readingScreen = document.getElementById('reading-screen');

const fileInput = document.getElementById('file-input');
const scriptTitle = document.getElementById('script-title');
const scriptContent = document.getElementById('script-content');
const dropdown = document.getElementById('saved-scripts-dropdown');
const btnSave = document.getElementById('btn-save-script');
const btnDelete = document.getElementById('btn-delete-saved');
const btnStart = document.getElementById('btn-start-reading');

const textDisplay = document.getElementById('text-display');
const btnBack = document.getElementById('btn-back');
const btnPlay = document.getElementById('btn-play');
const btnRecord = document.getElementById('btn-record'); 
const btnRecordSetup = document.getElementById('btn-record-setup'); 

const sizeSlider = document.getElementById('size-slider');
const wpmSlider = document.getElementById('wpm-slider');
const wpmDisplay = document.getElementById('wpm-display');

// Biến cho Thuật toán Âm tiết & Cuộn
let isPlaying = false;
let animationFrameId;
let spm = 120; // Syllables Per Minute
let karaokeTimeout;

// KIẾN TRÚC MỚI: CHUNKING & VIRTUAL SCROLLING
let masterWords = []; // Lưu trữ thô toàn bộ dữ liệu (Không gây nặng máy)
let chunksData = [];  // Mảng chứa các cụm từ
const CHUNK_SIZE = 200; // Cứ 200 từ tạo thành 1 cụm để tối ưu RAM
let currentWordIndex = 0;
let currentY = window.innerHeight; 
let targetY = window.innerHeight;  

// Biến cho Ghi hình/Ghi âm
let mediaRecorder; let recordedChunks = []; let isRecording = false;
const btnRecordAudio = document.getElementById('btn-record-audio');
const btnRecordAudioSetup = document.getElementById('btn-record-audio-setup');
let audioRecorder; let audioChunks =[]; let isAudioRecording = false; let audioStreamGlobal;

// ==========================================
// 1. QUẢN LÝ DỮ LIỆU & FILE TXT (GIỮ NGUYÊN)
// ==========================================
function getAllScripts() {
    let userScripts = JSON.parse(localStorage.getItem('kinhList')) || {};
    return { ...defaultSutras, ...userScripts }; 
}

function loadSavedScripts() {
    dropdown.innerHTML = '<option value="">-- Chọn bản kinh --</option>'; 
    let allScripts = getAllScripts();
    for (let title in allScripts) {
        let option = document.createElement('option');
        option.value = title; 
        option.textContent = defaultSutras[title] ? "📖 " + title : "📁 " + title;
        dropdown.appendChild(option);
    }
}

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        scriptContent.value = e.target.result; scriptTitle.value = file.name.replace('.txt', ''); 
    }; reader.readAsText(file);
});

btnSave.addEventListener('click', () => {
    let title = scriptTitle.value.trim(); let content = scriptContent.value.trim();
    if (!title || !content) { alert("Vui lòng nhập tên và nội dung!"); return; }
    if (defaultSutras[title]) { alert("Tên trùng với kinh hệ thống!"); return; }

    let userScripts = JSON.parse(localStorage.getItem('kinhList')) || {};
    userScripts[title] = content; localStorage.setItem('kinhList', JSON.stringify(userScripts));
    localStorage.setItem('lastReadTitle', title); 
    alert("Đã lưu bản kinh!"); loadSavedScripts(); dropdown.value = title;
});

dropdown.addEventListener('change', (e) => {
    let title = e.target.value;
    if (!title) { scriptTitle.value = ''; scriptContent.value = ''; return; }
    scriptTitle.value = title; scriptContent.value = getAllScripts()[title];
    localStorage.setItem('lastReadTitle', title);
});

btnDelete.addEventListener('click', () => {
    let title = dropdown.value; if(!title) return;
    if (defaultSutras[title]) { alert("Không thể xóa bản kinh hệ thống!"); return; }
    if(confirm(`Xóa bản kinh: ${title}?`)) {
        let userScripts = JSON.parse(localStorage.getItem('kinhList')) || {};
        delete userScripts[title]; localStorage.setItem('kinhList', JSON.stringify(userScripts));
        scriptTitle.value = ''; scriptContent.value = ''; loadSavedScripts();
    }
});

loadSavedScripts();
let lastRead = localStorage.getItem('lastReadTitle');
if (lastRead) { dropdown.value = lastRead; dropdown.dispatchEvent(new Event('change')); }

// TRÁI TIM CỦA ỨNG DỤNG - THUẬT TOÁN ĐẾM ÂM TIẾT PALI/ANH/VIỆT (GIỮ NGUYÊN)
function countSyllables(word) {
    const vowelRegex = /[aeiouyāīūáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]+/gi;
    const matches = word.match(vowelRegex);
    return matches ? matches.length : 1;
}

// ==========================================
// 2. CỖ MÁY SÂN KHẤU ẢO (VIRTUAL CHUNKING)
// ==========================================

// ==========================================
// 2. CỖ MÁY SÂN KHẤU ẢO (VIRTUAL CHUNKING) - ĐÃ FIX XUỐNG DÒNG
// ==========================================

// Trạm gác không gian (Intersection Observer) - Tái chế giao diện tự động
const chunkObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const chunkDiv = entry.target;
        const chunkId = parseInt(chunkDiv.dataset.id);
        
        if (entry.isIntersecting) {
            // Khi Cụm tiến vào màn hình: Bơm chữ và KHOẢNG TRẮNG/XUỐNG DÒNG vào
            if (chunkDiv.innerHTML === '') {
                chunkDiv.style.height = 'auto'; // Trả lại chiều cao tự nhiên
                let html = '';
                
                chunksData[chunkId].forEach(item => {
                    if (item.isWord) {
                        // Nếu là chữ thật -> Bọc thẻ span để chạy Karaoke
                        html += `<span class="word" data-index="${item.globalWordIndex}" id="word-${item.globalWordIndex}">${item.text}</span>`;
                    } else {
                        // Nếu là khoảng trắng, Tab hoặc Xuống dòng -> Bơm thẳng vào HTML để giữ đúng định dạng
                        html += item.text;
                    }
                });
                
                chunkDiv.innerHTML = html;
                
                // Khôi phục trạng thái màu sắc chữ
                chunksData[chunkId].forEach(item => {
                    if (item.isWord) {
                        let el = document.getElementById(`word-${item.globalWordIndex}`);
                        if (el) {
                            if (item.globalWordIndex < currentWordIndex) el.classList.add('read');
                            if (item.globalWordIndex === currentWordIndex) el.classList.add('highlight');
                        }
                    }
                });
            }
        } else {

// Khi Cụm rời khỏi màn hình: Hút sạch chữ để giải phóng RAM
            if (chunkDiv.innerHTML !== '') {
                // SỬA Ở ĐÂY: Dùng scrollHeight để lấy chiều cao chính xác hơn kể cả khi padding/margin bị ảnh hưởng
                const exactHeight = chunkDiv.scrollHeight;
                chunkDiv.style.height = exactHeight + 'px'; // Đóng băng chiều cao (Chống giật)
                chunkDiv.innerHTML = ''; // Rút chữ
            }
        }
           

    });
}, { rootMargin: '1000px 0px 1000px 0px' }); 

btnStart.addEventListener('click', () => {
    let content = scriptContent.value; // KHÔNG dùng .trim() ở đây để giữ lại lề của đoạn đầu tiên
    if (!content.trim()) { alert("Nội dung trống!"); return; }
    
    // Reset hệ thống
    textDisplay.innerHTML = ''; masterWords = []; chunksData = []; currentWordIndex = 0; 
    
    // SỬA LỚN NHẤT Ở ĐÂY: Tách văn bản nhưng GIỮ LẠI toàn bộ khoảng trắng, dấu tab, dấu xuống dòng
    let tokens = content.split(/(\s+)/); 

    let currentChunk = [];
    let globalWordCounter = 0; // Chỉ đếm những chữ thật sự, không đếm khoảng trắng

    tokens.forEach((token, index) => {
        if (token === '') return; // Bỏ qua mảng rỗng do thuật toán split tạo ra

        let isWord = token.trim() !== ''; // Kiểm tra xem đây là Chữ hay là Khoảng trắng/Xuống dòng
        
        let itemObj = { 
            text: token, 
            isWord: isWord,
            chunkId: Math.floor(index / CHUNK_SIZE) 
        };

        // Nếu là Chữ, đưa vào danh sách masterWords để Karaoke đếm nhịp
        if (isWord) {
            itemObj.syllables = countSyllables(token);
            itemObj.globalWordIndex = globalWordCounter;
            masterWords.push(itemObj);
            globalWordCounter++;
        }

        currentChunk.push(itemObj);
        
        // Cắt cụm dựa trên tổng số token (Chữ + Khoảng trắng)
        if (currentChunk.length === CHUNK_SIZE || index === tokens.length - 1) {
            // Cập nhật đúng chunkId cho toàn bộ phần tử trong cụm này
            let currentChunkId = chunksData.length;
            currentChunk.forEach(i => i.chunkId = currentChunkId);
            
            chunksData.push(currentChunk);
            currentChunk = [];
        }
    });

    // Tạo các "Chiếc hộp rỗng" cho Sân khấu ảo
    chunksData.forEach((chunk, i) => {
        let chunkDiv = document.createElement('div');
        chunkDiv.className = 'word-chunk';
        chunkDiv.dataset.id = i;
        textDisplay.appendChild(chunkDiv);
        chunkObserver.observe(chunkDiv); // Giao cho Trạm gác quản lý
    });
    
    setupScreen.classList.remove('active'); readingScreen.classList.add('active');
    currentY = window.innerHeight; targetY = window.innerHeight;
    textDisplay.style.transform = `translateY(${currentY}px) translateZ(0)`; 
});



// Xử lý Click-to-Jump hiệu suất cao (Ủy quyền sự kiện)
textDisplay.addEventListener('click', (e) => {
    if (e.target.classList.contains('word')) {
        isPlaying = false; btnPlay.textContent = "Bắt đầu đọc"; clearTimeout(karaokeTimeout);
        
        let clickedIndex = parseInt(e.target.dataset.index);
        let clickedChunkId = masterWords[clickedIndex].chunkId;
        let chunkDiv = document.querySelector(`.word-chunk[data-id="${clickedChunkId}"]`);
        
        targetY = (window.innerHeight / 2) - chunkDiv.offsetTop - e.target.offsetTop - (e.target.offsetHeight / 2);

        // Xóa màu cũ, tô màu mới
        document.querySelectorAll('.word').forEach(el => {
            el.classList.remove('highlight', 'read');
            let idx = parseInt(el.dataset.index);
            if(idx < clickedIndex) el.classList.add('read');
        });
        e.target.classList.add('highlight');
        currentWordIndex = clickedIndex;
    }
});

// Điều khiển cuộn tay mượt mà
window.addEventListener('wheel', (e) => {
    if (readingScreen.classList.contains('active')) {
        if (isPlaying) { isPlaying = false; btnPlay.textContent = "Tiếp tục đọc"; clearTimeout(karaokeTimeout); }
        targetY -= e.deltaY;
    }
});

let touchStartY = 0;
window.addEventListener('touchstart', (e) => {
    if (readingScreen.classList.contains('active')) touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (readingScreen.classList.contains('active')) {
        if (isPlaying) { isPlaying = false; btnPlay.textContent = "Tiếp tục đọc"; clearTimeout(karaokeTimeout); }
        let deltaY = touchStartY - e.touches[0].clientY;
        targetY -= deltaY * 1.5; touchStartY = e.touches[0].clientY; 
    }
}, { passive: true });

// Thuật toán cuộn Nội suy tuyến tính bám đuổi (Lerp) - Chống giật mắt
function autoScrollToActiveWord() {
    currentY += (targetY - currentY) * 0.05; // 0.05 tạo độ mượt tuyệt đối
    textDisplay.style.transform = `translateY(${currentY}px) translateZ(0)`;
    animationFrameId = requestAnimationFrame(autoScrollToActiveWord);
}
requestAnimationFrame(autoScrollToActiveWord);

// Tính thời gian Karaoke bám sát Âm tiết
function playNextWord() {
    if (currentWordIndex < masterWords.length) {
        let currentWordObj = masterWords[currentWordIndex];
        
        // Tìm chữ hiện tại trên giao diện ảo
        let currentEl = document.getElementById(`word-${currentWordIndex}`);
        let chunkDiv = document.querySelector(`.word-chunk[data-id="${currentWordObj.chunkId}"]`);
        
        if (currentEl && chunkDiv) {
            // Tọa độ Toàn cục = Tọa độ Cụm + Tọa độ Chữ
            targetY = (window.innerHeight / 2) - chunkDiv.offsetTop - currentEl.offsetTop - (currentEl.offsetHeight / 2);
            
            let prevEl = document.getElementById(`word-${currentWordIndex - 1}`);
            if (prevEl) { prevEl.classList.remove('highlight'); prevEl.classList.add('read'); }
            currentEl.classList.add('highlight');
        }

        const msPerSyllable = 60000 / spm; 
        const durationForThisWord = currentWordObj.syllables * msPerSyllable;

        currentWordIndex++;
        karaokeTimeout = setTimeout(playNextWord, durationForThisWord);
    } else {
        isPlaying = false; btnPlay.textContent = "Đọc xong";
    }
}

btnPlay.addEventListener('click', () => {
    isPlaying = !isPlaying;
    btnPlay.textContent = isPlaying ? "Tạm dừng" : "Bắt đầu đọc";
    if (isPlaying) { playNextWord(); } else { clearTimeout(karaokeTimeout); }
});

btnBack.addEventListener('click', () => {
    isPlaying = false; btnPlay.textContent = "Bắt đầu đọc";
    cancelAnimationFrame(animationFrameId); clearTimeout(karaokeTimeout);
    readingScreen.classList.remove('active'); setupScreen.classList.add('active');
});

sizeSlider.addEventListener('input', (e) => { 
    textDisplay.style.fontSize = e.target.value + 'px'; 
    document.getElementById('size-display').textContent = e.target.value; 
    
    // Cập nhật lại chiều cao cho các cụm đang bị đóng băng để tránh giật khi cuộn
    document.querySelectorAll('.word-chunk').forEach(chunk => {
        if (chunk.innerHTML === '') {
            chunk.style.height = 'auto'; // Cho phép tự tính lại chiều cao khi xuất hiện
        }
    });
});


wpmSlider.addEventListener('input', (e) => { spm = parseInt(e.target.value); document.getElementById('wpm-display').textContent = spm; });

// ==========================================
// 3 & 4. RECORDING AUDIO/VIDEO (GIỮ NGUYÊN HOÀN TOÀN TỪ CODE CŨ CỦA BẠN)
// ==========================================
// Mọi code thu âm và quay hình ở dưới đây được giữ y hệt bản cũ không tác động
async function toggleRecording() { /* Khối code quay màn hình cũ */ 
    if (!isRecording) {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const tracks = [...screenStream.getTracks(), ...audioStream.getAudioTracks()];
            const combinedStream = new MediaStream(tracks);
            mediaRecorder = new MediaRecorder(combinedStream);
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob); const a = document.createElement('a');
                a.href = url; a.download = 'BanKinh_Record.webm'; a.click(); 
                recordedChunks = []; tracks.forEach(track => track.stop());
            };
            mediaRecorder.start(); isRecording = true;
            btnRecord.textContent = "⏹ Dừng Ghi Hình"; btnRecord.style.backgroundColor = "#ff0000";
            if(btnRecordSetup) { btnRecordSetup.textContent = "⏹ Dừng Ghi Hình"; btnRecordSetup.style.backgroundColor = "#ff0000"; }
        } catch (err) { alert("Lỗi cấp quyền"); }
    } else {
        mediaRecorder.stop(); isRecording = false;
        btnRecord.textContent = "🔴 Ghi Hình"; btnRecord.style.backgroundColor = "#8b0000";
        if(btnRecordSetup) { btnRecordSetup.textContent = "🔴 Ghi Hình"; btnRecordSetup.style.backgroundColor = "#8b0000"; }
    }
}
btnRecord.addEventListener('click', toggleRecording);
if(btnRecordSetup) btnRecordSetup.addEventListener('click', toggleRecording);

async function toggleAudioRecording() { /* Khối code thu âm cũ */ 
    if (!isAudioRecording) {
        try {
            audioStreamGlobal = await navigator.mediaDevices.getUserMedia({ audio: true });
            let options = {}; let extension = 'webm'; 
            if (MediaRecorder.isTypeSupported('audio/mp4')) { options = { mimeType: 'audio/mp4' }; extension = 'm4a'; } 
            else if (MediaRecorder.isTypeSupported('audio/webm')) { options = { mimeType: 'audio/webm' }; }
            audioRecorder = new MediaRecorder(audioStreamGlobal, options);
            audioRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
            audioRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: options.mimeType || 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `BanKinh_Audio.${extension}`; a.click(); 
                audioChunks =[]; audioStreamGlobal.getTracks().forEach(track => track.stop());
            }; 
            audioRecorder.start(); isAudioRecording = true;
            if (btnRecordAudio) { btnRecordAudio.textContent = "⏹ Dừng Ghi Âm"; btnRecordAudio.style.backgroundColor = "#ff0000"; }
            if (btnRecordAudioSetup) { btnRecordAudioSetup.textContent = "⏹ Dừng Ghi Âm"; btnRecordAudioSetup.style.backgroundColor = "#ff0000"; }
        } catch (err) { alert("Lỗi Micro"); }
    } else {
        audioRecorder.stop(); isAudioRecording = false;
        if (btnRecordAudio) { btnRecordAudio.textContent = "🎙️ Ghi Âm"; btnRecordAudio.style.backgroundColor = "#2e8b57"; }
        if (btnRecordAudioSetup) { btnRecordAudioSetup.textContent = "🎙️ Ghi Âm"; btnRecordAudioSetup.style.backgroundColor = "#2e8b57"; }
    }
}
if (btnRecordAudio) btnRecordAudio.addEventListener('click', toggleAudioRecording);
if (btnRecordAudioSetup) btnRecordAudioSetup.addEventListener('click', toggleAudioRecording);