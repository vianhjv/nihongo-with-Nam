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
// ==========================================
// 1. QUẢN LÝ DỮ LIỆU KIẾN TRÚC MỚI (LAZY FETCHING)
// ==========================================
let systemCatalog = {}; // Lưu mục lục JSON
let currentSystemScriptContent = ""; // Giữ văn bản khổng lồ trong RAM, không nhét vào Textarea

// 1.1 Tải Mục Lục và Đưa vào Dropdown
async function initDataSystem() {
    try {
        // Tải file JSON mục lục
        const response = await fetch('kinh-catalog.json');
        systemCatalog = await response.json();
    } catch (error) {
        console.error("Lỗi không tìm thấy file kinh-catalog.json", error);
    }
    loadSavedScriptsUI();
    
    // Khôi phục bản kinh đang đọc dở lần trước
    let lastRead = localStorage.getItem('lastReadTitle');
    if (lastRead) { 
        dropdown.value = lastRead; 
        dropdown.dispatchEvent(new Event('change')); 
    }
}

// 1.2 Vẽ giao diện Dropdown
function loadSavedScriptsUI() {
    dropdown.innerHTML = '<option value="">-- Chọn bản kinh --</option>'; 
    
    // Đưa Kinh Hệ Thống (từ JSON) vào
    for (let title in systemCatalog) {
        let option = document.createElement('option');
        option.value = `SYSTEM|${title}`; // Gắn cờ SYSTEM để dễ phân biệt
        option.textContent = "📖 " + title;
        dropdown.appendChild(option);
    }

    // Đưa Kinh của người dùng tự lưu (từ LocalStorage) vào
    let userScripts = JSON.parse(localStorage.getItem('kinhList')) || {};
    for (let title in userScripts) {
        let option = document.createElement('option');
        option.value = `USER|${title}`; // Gắn cờ USER
        option.textContent = "📁 " + title;
        dropdown.appendChild(option);
    }
}

// 1.3 Xử lý khi chọn một bản kinh (Phép màu chống đơ máy ở đây)
dropdown.addEventListener('change', async (e) => {
    let selectedValue = e.target.value;
    if (!selectedValue) { 
        scriptTitle.value = ''; scriptContent.value = ''; 
        scriptContent.disabled = false; currentSystemScriptContent = ""; 
        return; 
    }

    let [type, title] = selectedValue.split('|'); // Tách cờ và Tên
    localStorage.setItem('lastReadTitle', selectedValue);

    if (type === 'USER') {
        // Nếu là file người dùng lưu: Nội dung ngắn, cứ cho vào textarea bình thường để họ sửa
        let userScripts = JSON.parse(localStorage.getItem('kinhList')) || {};
        scriptTitle.value = title; 
        scriptContent.value = userScripts[title] || '';
        scriptContent.disabled = false;
        currentSystemScriptContent = "";
    } 
    else if (type === 'SYSTEM') {
        // Nếu là Kinh hệ thống (Rất dài): Tuyệt đối không nhét vào Textarea
        scriptTitle.value = title;
        scriptContent.value = "Đang tải dữ liệu siêu tốc...";
        scriptContent.disabled = true; // Khóa ô chữ lại chống đơ
        btnStart.disabled = true;      // Khóa nút Bắt đầu chờ tải xong

        try {
            let filePath = systemCatalog[title];
            let response = await fetch(filePath);
            currentSystemScriptContent = await response.text(); // Lưu thẳng vào RAM
            
            // Chỉ hiện thông báo lên màn hình
            scriptContent.value = `[Hệ thống] Đã tải xong bản kinh: "${title}".\n\n(Văn bản quá dài nên được ẩn khỏi ô này để tránh giật lag máy tính. \nHãy bấm "BẮT ĐẦU TỤNG KINH" để vào màn hình đọc).`;
        } catch (err) {
            scriptContent.value = "❌ Lỗi: Không thể tải file " + filePath;
        } finally {
            btnStart.disabled = false; // Mở lại nút Bắt đầu
        }
    }
});

// 1.4 Chức năng xóa bản kinh (Chỉ cho phép xóa kinh USER)
btnDelete.addEventListener('click', () => {
    let selectedValue = dropdown.value; if(!selectedValue) return;
    let [type, title] = selectedValue.split('|');

    if (type === 'SYSTEM') { alert("Không thể xóa bản kinh mặc định của hệ thống!"); return; }
    
    if(confirm(`Xóa bản kinh: ${title}?`)) {
        let userScripts = JSON.parse(localStorage.getItem('kinhList')) || {};
        delete userScripts[title]; 
        localStorage.setItem('kinhList', JSON.stringify(userScripts));
        scriptTitle.value = ''; scriptContent.value = ''; 
        loadSavedScriptsUI(); // Render lại dropdown
    }
});

// Khởi chạy
initDataSystem();




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

// ==========================================
// CẬP NHẬT: XỬ LÝ DỮ LIỆU KHÔNG ĐỒNG BỘ (CHỐNG ĐƠ MÁY)
// ==========================================
btnStart.addEventListener('click', async () => {
    let content = "";
    let selectedValue = dropdown.value;
    
    // 1. Lấy dữ liệu
    if (selectedValue && selectedValue.startsWith('SYSTEM|')) {
        content = currentSystemScriptContent; 
    } else {
        content = scriptContent.value;
    }

    if (!content.trim()) { alert("Nội dung trống!"); return; }
    
    // 2. Hiện trạng thái Đang tải (Giúp người dùng không bị hoang mang)
    const originalText = btnStart.textContent;
    btnStart.textContent = "⏳ Đang chuẩn bị sân khấu...";
    btnStart.disabled = true;
    btnStart.style.backgroundColor = "#555";
    
    // Cho phép trình duyệt nghỉ 50 mili-giây để vẽ lại cái nút hiển thị chữ "Đang chuẩn bị"
    await new Promise(resolve => setTimeout(resolve, 50)); 

    // Reset hệ thống
    textDisplay.innerHTML = ''; masterWords = []; chunksData = []; currentWordIndex = 0; 
    
    // Tách văn bản giữ nguyên khoảng trắng
    let tokens = content.split(/(\s+)/); 
    let currentChunk = [];
    let globalWordCounter = 0;

    // 3. THUẬT TOÁN "NHAI TỪNG MIẾNG" (YIELDING BATCH PROCESSING)
    // Cứ xử lý 1000 token, chúng ta cho máy tính nghỉ 1 mili-giây để tránh treo trình duyệt
    const BATCH_SIZE = 1000; 
    
    for (let index = 0; index < tokens.length; index++) {
        let token = tokens[index];
        if (token === '') continue; 

        let isWord = token.trim() !== ''; 
        let itemObj = { 
            text: token, 
            isWord: isWord,
            chunkId: Math.floor(index / CHUNK_SIZE) 
        };

        if (isWord) {
            itemObj.syllables = countSyllables(token); // Đếm âm tiết
            itemObj.globalWordIndex = globalWordCounter;
            masterWords.push(itemObj);
            globalWordCounter++;
        }

        currentChunk.push(itemObj);
        
        if (currentChunk.length === CHUNK_SIZE || index === tokens.length - 1) {
            let currentChunkId = chunksData.length;
            currentChunk.forEach(i => i.chunkId = currentChunkId);
            chunksData.push(currentChunk);
            currentChunk = [];
        }

        // Bí quyết chống đơ: Cứ 1000 vòng lặp thì nhường quyền cho trình duyệt thở
        if (index % BATCH_SIZE === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    // 4. Tạo các Chiếc hộp rỗng siêu tốc
    let fragment = document.createDocumentFragment();
    chunksData.forEach((chunk, i) => {
        let chunkDiv = document.createElement('div');
        chunkDiv.className = 'word-chunk';
        chunkDiv.dataset.id = i;
        fragment.appendChild(chunkDiv);
    });
    textDisplay.appendChild(fragment);
    
    // Đưa Trạm gác vào quan sát
    document.querySelectorAll('.word-chunk').forEach(div => chunkObserver.observe(div));

    // 5. Mở màn hình đọc kinh
    setupScreen.classList.remove('active'); 
    readingScreen.classList.add('active');
    currentY = window.innerHeight; targetY = window.innerHeight;
    textDisplay.style.transform = `translateY(${currentY}px) translateZ(0)`; 

    // Phục hồi lại nút
    btnStart.textContent = originalText;
    btnStart.disabled = false;
    btnStart.style.backgroundColor = "";
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


// ==========================================
// 5. GIAI ĐOẠN 2: AI VOICE TRACKING (ADAPTIVE SLIDING WINDOW - CHỐNG NHẢY CÓC)
// ==========================================

const btnAITrack = document.getElementById('btn-ai-track');
let recognition;
let isAITracking = false;

// 5.1. BỘ LỌC TIẾNG VIỆT
function normalizeText(str) {
    if (!str) return "";
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/^x/, "s");
    str = str.replace(/^gi/, "d").replace(/^r/, "d").replace(/^v/, "d");
    str = str.replace(/^tr/, "ch");
    str = str.replace(/[.,!?;:()\[\]"']/g, "");
    return str.trim();
}

const windowSpeech = window.SpeechRecognition || window.webkitSpeechRecognition;

if (windowSpeech) {
    recognition = new windowSpeech();
    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.lang = 'vi-VN';

    recognition.onstart = function() { console.log("🟢 AI Đã kết nối Mic."); };

    recognition.onresult = function(event) {
        let interimTranscript = ''; let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            else interimTranscript += event.results[i][0].transcript;
        }
        let currentSpokenText = finalTranscript || interimTranscript;
        if (currentSpokenText.trim()) processFuzzyMatching(currentSpokenText);
    };

    recognition.onerror = function(event) {
        console.warn("⚠️ AI Cảnh báo:", event.error);
        if(event.error === 'network' && isAITracking) {
            setTimeout(() => { try { recognition.start(); } catch(e){} }, 1000);
        }
    };

    recognition.onend = function() {
        if (isAITracking) { try { recognition.start(); } catch(e){} }
    };
} else {
    btnAITrack.style.display = 'none';
}

btnAITrack.addEventListener('click', () => {
    if (!windowSpeech) return alert("Trình duyệt không hỗ trợ AI. Hãy dùng Chrome!");
    isAITracking = !isAITracking;
    if (isAITracking) {
        btnAITrack.textContent = "🛑 Tắt AI Bám Chữ"; btnAITrack.style.backgroundColor = "#ff4500";
        try { recognition.start(); } catch(e){}
        if (isPlaying) { isPlaying = false; btnPlay.textContent = "Bắt đầu cuộn"; clearTimeout(karaokeTimeout); }
        moveStageToCurrentWord();
    } else {
        btnAITrack.textContent = "🎙️ Đọc bằng AI"; btnAITrack.style.backgroundColor = "#4B0082";
        recognition.stop();
    }
});


// ==========================================
// 5.2. THUẬT TOÁN SO KHỚP CHỐNG NHẢY CÓC (ADAPTIVE N-GRAM)
// ==========================================
let lastMatchedText = ""; 

function processFuzzyMatching(spokenText) {
    if (currentWordIndex >= masterWords.length) return;
    if (spokenText === lastMatchedText) return; 

    let spokenWordsRaw = spokenText.split(' ').filter(w => w.length > 0);
    // Tăng bộ nhớ ngắn hạn lên 10 từ để bắt được các cụm 3-4 từ dài
    let recentSpokenWords = spokenWordsRaw.slice(-10).map(w => normalizeText(w)); 
    if (recentSpokenWords.length < 2) return;

    let lookAheadWindow = 15; // Tầm nhìn xa
    let scriptWords = [];
    
    for (let i = currentWordIndex; i < currentWordIndex + lookAheadWindow; i++) {
        if (masterWords[i]) {
            scriptWords.push({ index: i, text: normalizeText(masterWords[i].text) });
        }
    }

    let matchedScriptIndex = -1;

    // ƯU TIÊN 1: Tìm cụm 4 từ liên tiếp (Nếu khớp, cho phép nhảy cực xa trong phạm vi 15 từ)
    if (matchedScriptIndex === -1 && recentSpokenWords.length >= 4) {
        for (let i = 0; i < recentSpokenWords.length - 3; i++) {
            let quadToMatch = recentSpokenWords[i] + " " + recentSpokenWords[i+1] + " " + recentSpokenWords[i+2] + " " + recentSpokenWords[i+3];
            for (let j = 0; j < scriptWords.length - 3; j++) {
                let scriptQuad = scriptWords[j].text + " " + scriptWords[j+1].text + " " + scriptWords[j+2].text + " " + scriptWords[j+3].text;
                if (quadToMatch === scriptQuad) { matchedScriptIndex = scriptWords[j + 3].index; break; }
            }
            if (matchedScriptIndex !== -1) break;
        }
    }

    // ƯU TIÊN 2: Tìm cụm 3 từ liên tiếp (Vẫn cho phép nhảy xa 15 từ)
    if (matchedScriptIndex === -1 && recentSpokenWords.length >= 3) {
        for (let i = 0; i < recentSpokenWords.length - 2; i++) {
            let trioToMatch = recentSpokenWords[i] + " " + recentSpokenWords[i+1] + " " + recentSpokenWords[i+2];
            for (let j = 0; j < scriptWords.length - 2; j++) {
                let scriptTrio = scriptWords[j].text + " " + scriptWords[j+1].text + " " + scriptWords[j+2].text;
                if (trioToMatch === scriptTrio) { matchedScriptIndex = scriptWords[j + 2].index; break; }
            }
            if (matchedScriptIndex !== -1) break;
        }
    }

    // ƯU TIÊN 3: Tìm cụm 2 từ liên tiếp (CHỈ CHO PHÉP TÌM TRONG 4 TỪ GẦN NHẤT ĐỂ CHỐNG NHẢY CÓC)
    if (matchedScriptIndex === -1) {
        for (let i = 0; i < recentSpokenWords.length - 1; i++) {
            let pairToMatch = recentSpokenWords[i] + " " + recentSpokenWords[i+1];
            
            // LƯỚI BẢO VỆ CHỐNG NHẢY CÓC: Chỉ quét 4 từ kế tiếp, không quét sâu xuống dưới
            let safeWindowLimit = Math.min(4, scriptWords.length - 1); 
            
            for (let j = 0; j < safeWindowLimit; j++) {
                let scriptPair = scriptWords[j].text + " " + scriptWords[j+1].text;
                if (pairToMatch === scriptPair) { matchedScriptIndex = scriptWords[j + 1].index; break; }
            }
            if (matchedScriptIndex !== -1) break;
        }
    }

    if (matchedScriptIndex !== -1 && matchedScriptIndex > currentWordIndex) {
        currentWordIndex = matchedScriptIndex;
        lastMatchedText = spokenText; // Khóa bộ nhớ
        moveStageToCurrentWord(); 
    }
}

// ==========================================
// 5.3. DỊCH CHUYỂN VÀ TÔ MÀU 
// ==========================================
function moveStageToCurrentWord() {
    if (currentWordIndex >= masterWords.length) return;

    let leadIndex1 = currentWordIndex + 1; 
    let leadIndex2 = currentWordIndex + 2; 
    let leadIndex3 = currentWordIndex + 3; 
    
    if (leadIndex1 >= masterWords.length) leadIndex1 = currentWordIndex;

    let targetWordObj = masterWords[leadIndex1];
    let targetEl = document.getElementById(`word-${leadIndex1}`);
    
    let chunkDiv = null;
    if(targetWordObj) {
        chunkDiv = document.querySelector(`.word-chunk[data-id="${targetWordObj.chunkId}"]`);
    }
    
    if (targetEl && chunkDiv) {
        targetY = (window.innerHeight / 2) - chunkDiv.offsetTop - targetEl.offsetTop - (targetEl.offsetHeight / 2);
        
        document.querySelectorAll('.word').forEach(el => {
            el.classList.remove('highlight', 'upcoming', 'read');
            let idx = parseInt(el.dataset.index);
            
            if (idx <= currentWordIndex) el.classList.add('read');
            else if (idx === leadIndex1 || idx === leadIndex2 || idx === leadIndex3) el.classList.add('highlight');
        });
    }
}
