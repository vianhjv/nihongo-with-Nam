const translations = {
  vi: {
    title: "Học tiếng Nhật với Nam",
    videoTitle: "🎥 Video bài giảng",
    videoText: "N4 | N3 | N2 | N1 (Link video TikTok)",
    lessonTitle: "📚 Nội dung bài học",
    lessonText: "Tổng hợp bài học từ bài 1 đến 30",
    summaryTitle: "🧠 Ngữ pháp - Từ vựng - Kanji",
    summaryText: "Tài liệu học tập theo từng cấp độ JLPT"
  },
  en: {
    title: "Learn Japanese with Nam",
    videoTitle: "🎥 Video Lessons",
    videoText: "N4 | N3 | N2 | N1 (TikTok video links)",
    lessonTitle: "📚 Lesson Contents",
    lessonText: "Lessons from 1 to 30",
    summaryTitle: "🧠 Grammar - Vocabulary - Kanji",
    summaryText: "Study materials by JLPT levels"
  }
};

let currentLang = "vi";
function toggleLanguage() {
  currentLang = currentLang === "vi" ? "en" : "vi";
  const t = translations[currentLang];
  document.getElementById("title").textContent = t.title;
  document.getElementById("videoTitle").textContent = t.videoTitle;
  document.getElementById("videoText").textContent = t.videoText;
  document.getElementById("lessonTitle").textContent = t.lessonTitle;
  document.getElementById("lessonText").textContent = t.lessonText;
  document.getElementById("summaryTitle").textContent = t.summaryTitle;
  document.getElementById("summaryText").textContent = t.summaryText;
}
