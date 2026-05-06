// ==========================================
// KHAI BÁO BIẾN GIAO DIỆN
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
const btnRecord = document.getElementById('btn-record'); // Nút ghi hình màn 2
const btnRecordSetup = document.getElementById('btn-record-setup'); // Nút ghi hình màn 1

const sizeSlider = document.getElementById('size-slider');
const wpmSlider = document.getElementById('wpm-slider');
const wpmDisplay = document.getElementById('wpm-display');

// Biến cho Thuật toán Âm tiết & Cuộn
let isPlaying = false;
let animationFrameId;
let spm = 120; // Syllables Per Minute
let karaokeTimeout;
let currentWordIndex = 0;
let wordsArray = [];
let currentY = window.innerHeight; 
let targetY = window.innerHeight;  

// Biến cho Ghi hình
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// ==========================================
// 1. QUẢN LÝ NỘI DUNG & KINH MẶC ĐỊNH
// ==========================================

function getAllScripts() {
    let userScripts = JSON.parse(localStorage.getItem('kinhList')) || {};
    // Gộp defaultSutras (từ data.js) với userScripts
    return { ...defaultSutras, ...userScripts }; 
}

function loadSavedScripts() {
    dropdown.innerHTML = '<option value="">-- Chọn bản kinh --</option>'; 
    let allScripts = getAllScripts();
    
    for (let title in allScripts) {
        let option = document.createElement('option');
        option.value = title; 
        if (defaultSutras[title]) {
            option.textContent = "📖 " + title; // Kinh mặc định
        } else {
            option.textContent = "📁 " + title; // Kinh tự lưu
        }
        dropdown.appendChild(option);
    }
}

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        scriptContent.value = e.target.result; 
        scriptTitle.value = file.name.replace('.txt', ''); 
    };
    reader.readAsText(file);
});

btnSave.addEventListener('click', () => {
    let title = scriptTitle.value.trim(); let content = scriptContent.value.trim();
    if (!title || !content) { alert("Vui lòng nhập tên và nội dung!"); return; }
    
    if (defaultSutras[title]) {
        alert("Tên này trùng với kinh hệ thống. Vui lòng đặt tên khác!"); return;
    }

    let userScripts = JSON.parse(localStorage.getItem('kinhList')) || {};
    userScripts[title] = content; localStorage.setItem('kinhList', JSON.stringify(userScripts));
    localStorage.setItem('lastReadTitle', title); 
    
    alert("Đã lưu bản kinh vào danh sách!");
    loadSavedScripts(); dropdown.value = title;
});

dropdown.addEventListener('change', (e) => {
    let title = e.target.value;
    if (!title) { scriptTitle.value = ''; scriptContent.value = ''; return; }
    let allScripts = getAllScripts();
    scriptTitle.value = title; scriptContent.value = allScripts[title];
    localStorage.setItem('lastReadTitle', title);
});

btnDelete.addEventListener('click', () => {
    let title = dropdown.value; if(!title) return;
    
    if (defaultSutras[title]) {
        alert("Đây là bản kinh mặc định, không thể xóa!"); return;
    }

    if(confirm(`Xóa bản kinh: ${title}?`)) {
        let userScripts = JSON.parse(localStorage.getItem('kinhList')) || {};
        delete userScripts[title]; localStorage.setItem('kinhList', JSON.stringify(userScripts));
        scriptTitle.value = ''; scriptContent.value = ''; loadSavedScripts();
    }
});

// Khởi chạy khi mở web
loadSavedScripts();
let lastRead = localStorage.getItem('lastReadTitle');
if (lastRead) { dropdown.value = lastRead; dropdown.dispatchEvent(new Event('change')); }

function countSyllables(word) {
    const vowelRegex = /[aeiouyāīūáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]+/gi;
    const matches = word.match(vowelRegex);
    return matches ? matches.length : 1;
}

// ==========================================
// 2. ENGINE AUTO-FOLLOW, CLICK-TO-JUMP & KARAOKE
// ==========================================

btnStart.addEventListener('click', () => {
    let content = scriptContent.value.trim();
    if (!content) { alert("Nội dung trống!"); return; }
    
    textDisplay.innerHTML = ''; wordsArray = []; currentWordIndex = 0; 

    let words = content.split(/(\s+)/); 
    words.forEach(word => {
        if (word.trim() === '') {
            textDisplay.appendChild(document.createTextNode(word)); 
        } else {
            let span = document.createElement('span');
            span.className = 'word'; span.textContent = word;
            span.style.cursor = 'pointer'; 
            textDisplay.appendChild(span); 
            
            let wordObj = { element: span, syllables: countSyllables(word) };
            wordsArray.push(wordObj);

            // Bấm vào chữ để nhảy đến
           
          // Bấm vào chữ để nhảy đến
            span.addEventListener('click', () => {
                isPlaying = false; btnPlay.textContent = "Bắt đầu đọc"; clearTimeout(karaokeTimeout);
                
                // CHỐNG GIẬT LAG CHO NÚT BẤM: ĐỌC tọa độ trước!
                targetY = (window.innerHeight / 2) - span.offsetTop - (span.offsetHeight / 2);

                // Sau đó mới thay đổi màu sắc hàng loạt
                wordsArray.forEach(w => {
                    w.element.classList.remove('highlight'); w.element.classList.remove('read');
                });
                currentWordIndex = wordsArray.indexOf(wordObj);
                for(let i=0; i<currentWordIndex; i++) { wordsArray[i].element.classList.add('read'); }
                span.classList.add('highlight');
            });




        }
    });
    
    setupScreen.classList.remove('active'); readingScreen.classList.add('active');
    currentY = window.innerHeight; targetY = window.innerHeight;
    //textDisplay.style.top = currentY + 'px';
    // Đổi style.top thành style.transform
    textDisplay.style.transform = `translateY(${currentY}px)`;
});

// Lăn chuột
window.addEventListener('wheel', (e) => {
    if (readingScreen.classList.contains('active')) {
        if (isPlaying) { isPlaying = false; btnPlay.textContent = "Tiếp tục đọc"; clearTimeout(karaokeTimeout); }
        targetY -= e.deltaY;
    }
});

// Vuốt cảm ứng (Cho Mobile / iPad)
let touchStartY = 0;
window.addEventListener('touchstart', (e) => {
    if (readingScreen.classList.contains('active')) {
        touchStartY = e.touches[0].clientY;
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (readingScreen.classList.contains('active')) {
        if (isPlaying) { 
            isPlaying = false; 
            btnPlay.textContent = "Tiếp tục đọc"; 
            clearTimeout(karaokeTimeout); 
        }
        let touchCurrentY = e.touches[0].clientY;
        let deltaY = touchStartY - touchCurrentY;
        targetY -= deltaY * 1.5; // Nhân 1.5 để cảm giác vuốt trôi nhanh và tự nhiên hơn
        touchStartY = touchCurrentY; 
    }
}, { passive: true });



btnBack.addEventListener('click', () => {
    isPlaying = false; btnPlay.textContent = "Bắt đầu đọc";
    cancelAnimationFrame(animationFrameId); clearTimeout(karaokeTimeout);
    readingScreen.classList.remove('active'); setupScreen.classList.add('active');
});

// Cuộn bám đuổi nội suy (Lerp)
//function autoScrollToActiveWord() {
//    currentY += (targetY - currentY) * 0.1; 
//    textDisplay.style.top = currentY + 'px';
//    animationFrameId = requestAnimationFrame(autoScrollToActiveWord);
//}
//requestAnimationFrame(autoScrollToActiveWord); 

// phần sửa Mới !!!!! Cuộn bám đuổi nội suy (Lerp) bằng GPU (Transform) - Siêu mượt
function autoScrollToActiveWord() {
    currentY += (targetY - currentY) * 0.08; // Giảm hệ số xuống 0.08 để cuộn êm hơn, không bị gợn
    // Thay vì dùng .top, ta dùng transform: translateY
    textDisplay.style.transform = `translateY(${currentY}px)`;
    animationFrameId = requestAnimationFrame(autoScrollToActiveWord);
}
requestAnimationFrame(autoScrollToActiveWord);



// Tính thời gian Karaoke



// Tính thời gian Karaoke
function playNextWord() {
    if (currentWordIndex < wordsArray.length) {
        let currentWordObj = wordsArray[currentWordIndex];
        
        // SỬA LỖI GIẬT LAG TẠI ĐÂY:
        // ĐỌC tọa độ (offsetTop) TRƯỚC khi thay đổi màu chữ. Tránh ép CPU tính toán lại ngàn chữ.
        targetY = (window.innerHeight / 2) - currentWordObj.element.offsetTop - (currentWordObj.element.offsetHeight / 2);

        // GHI thay đổi màu sắc (DOM Write) SAU KHI đã đọc xong tọa độ.
        if (currentWordIndex > 0) {
            wordsArray[currentWordIndex - 1].element.classList.remove('highlight');
            wordsArray[currentWordIndex - 1].element.classList.add('read');
        }
        currentWordObj.element.classList.add('highlight');

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

sizeSlider.addEventListener('input', (e) => {
    textDisplay.style.fontSize = e.target.value + 'px';
    document.getElementById('size-display').textContent = e.target.value;
});

wpmSlider.addEventListener('input', (e) => {
    spm = parseInt(e.target.value); 
    document.getElementById('wpm-display').textContent = spm;
});

// ==========================================
// 3. TÍNH NĂNG GHI HÌNH VÀ THU ÂM TRỰC TIẾP
// ==========================================

async function toggleRecording() {
    if (!isRecording) {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const tracks = [...screenStream.getTracks(), ...audioStream.getAudioTracks()];
            const combinedStream = new MediaStream(tracks);

            mediaRecorder = new MediaRecorder(combinedStream);
            
            mediaRecorder.ondataavailable = e => { 
                if (e.data.size > 0) recordedChunks.push(e.data); 
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'BanKinh_Record.webm'; 
                a.click(); 
                recordedChunks = [];
                tracks.forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            
            btnRecord.textContent = "⏹ Dừng Ghi Hình";
            btnRecord.style.backgroundColor = "#ff0000";
            if(btnRecordSetup) {
                btnRecordSetup.textContent = "⏹ Dừng Ghi Hình";
                btnRecordSetup.style.backgroundColor = "#ff0000";
            }
            
        } catch (err) {
            console.error(err);
            alert("Không thể ghi hình. Vui lòng cấp quyền Micro và Chọn màn hình để quay!");
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        
        btnRecord.textContent = "🔴 Ghi Hình";
        btnRecord.style.backgroundColor = "#8b0000";
        if(btnRecordSetup) {
            btnRecordSetup.textContent = "🔴 Ghi Hình";
            btnRecordSetup.style.backgroundColor = "#8b0000";
        }
    }
}

// Gắn sự kiện cho 2 nút ghi hình
btnRecord.addEventListener('click', toggleRecording);
if(btnRecordSetup) {
    btnRecordSetup.addEventListener('click', toggleRecording);
}


// ==========================================
// 4. TÍNH NĂNG CHỈ GHI ÂM (AUDIO ONLY - FILE NHẸ)
// ==========================================

const btnRecordAudio = document.getElementById('btn-record-audio');
const btnRecordAudioSetup = document.getElementById('btn-record-audio-setup');

let audioRecorder;
let audioChunks =[];
let isAudioRecording = false;
let audioStreamGlobal; // Biến toàn cục để giữ stream và tắt micro sau khi dừng

async function toggleAudioRecording() {
    if (!isAudioRecording) {
        try {
            // CHỈ xin quyền Micro, KHÔNG gọi màn hình
            audioStreamGlobal = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Tối ưu định dạng file (Webm cho Chrome/Android, m4a cho Safari/iOS)
            let options = {};
            let extension = 'webm'; 
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options = { mimeType: 'audio/mp4' };
                extension = 'm4a'; 
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                options = { mimeType: 'audio/webm' };
            }

            audioRecorder = new MediaRecorder(audioStreamGlobal, options);
            
            audioRecorder.ondataavailable = e => { 
                if (e.data.size > 0) audioChunks.push(e.data); 
            };
            
            audioRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: options.mimeType || 'audio/webm' });
                const url = URL.createObjectURL(blob);
                
                // 1. Tự động tải file về máy
                const a = document.createElement('a');
                a.href = url;
                a.download = `BanKinh_Audio.${extension}`; 
                a.click(); 
                
                // 2. HIỂN THỊ TRÌNH NGHE LẠI NGAY TRÊN WEB
                let playerContainer = document.getElementById('audio-playback-container');
                if (!playerContainer) {
                    playerContainer = document.createElement('div');
                    playerContainer.id = 'audio-playback-container';
                    playerContainer.style.position = 'fixed';
                    playerContainer.style.bottom = '90px'; 
                    playerContainer.style.left = '50%';
                    playerContainer.style.transform = 'translateX(-50%)';
                    playerContainer.style.background = 'rgba(30, 30, 30, 0.95)';
                    playerContainer.style.padding = '15px';
                    playerContainer.style.borderRadius = '10px';
                    playerContainer.style.zIndex = '1000';
                    playerContainer.style.border = '1px solid #2e8b57';
                    playerContainer.style.boxShadow = '0px 4px 15px rgba(0,0,0,0.5)';
                    document.body.appendChild(playerContainer);
                }
                
                playerContainer.innerHTML = `
                    <div style="color: #2e8b57; margin-bottom: 8px; font-weight: bold; text-align: center; font-family: Arial;">Nghe lại bản thu âm:</div>
                    <audio controls src="${url}" style="outline: none;"></audio>
                    <div style="text-align: center; margin-top: 8px;">
                        <button onclick="this.parentElement.parentElement.remove()" style="background: #333; color: #fff; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer;">Đóng lại</button>
                    </div>
                `;

                // 3. Xóa mảng nhớ tạm và tắt hẳn đèn đỏ Micro trên trình duyệt
                audioChunks =[];
                audioStreamGlobal.getTracks().forEach(track => track.stop());
            }; // Kết thúc sự kiện onstop

            audioRecorder.start();
            isAudioRecording = true;
            
            // Đổi giao diện nút
            if (btnRecordAudio) {
                btnRecordAudio.textContent = "⏹ Dừng Ghi Âm";
                btnRecordAudio.style.backgroundColor = "#ff0000"; 
            }
            if (btnRecordAudioSetup) {
                btnRecordAudioSetup.textContent = "⏹ Dừng Ghi Âm";
                btnRecordAudioSetup.style.backgroundColor = "#ff0000";
            }
            
        } catch (err) {
            console.error(err);
            alert("Không thể ghi âm. Vui lòng kiểm tra lại quyền Micro!");
        }
    } else {
        // Dừng ghi âm
        audioRecorder.stop();
        isAudioRecording = false;
        
        // Trả lại giao diện nút
        if (btnRecordAudio) {
            btnRecordAudio.textContent = "🎙️ Ghi Âm";
            btnRecordAudio.style.backgroundColor = "#2e8b57"; 
        }
        if (btnRecordAudioSetup) {
            btnRecordAudioSetup.textContent = "🎙️ Ghi Âm";
            btnRecordAudioSetup.style.backgroundColor = "#2e8b57";
        }
    }
}

// Gắn sự kiện cho nút Ghi âm ở cả 2 màn hình (Kiểm tra xem nút có tồn tại không)
if (btnRecordAudio) {
    btnRecordAudio.addEventListener('click', toggleAudioRecording);
}
if (btnRecordAudioSetup) {
    btnRecordAudioSetup.addEventListener('click', toggleAudioRecording);
}