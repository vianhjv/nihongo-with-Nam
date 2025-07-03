function filterTable() {
    // Lấy các element cần thiết
    const searchInput = document.getElementById('searchInput');
    const lessonFilter = document.getElementById('lessonFilter');
    const table = document.getElementById('kanjiTable');
    const tr = table.getElementsByTagName('tr');

    // Lấy giá trị từ các bộ lọc
    const filterText = searchInput.value.toUpperCase();
    const selectedLesson = lessonFilter.value;

    // Lặp qua tất cả các dòng của bảng (bỏ qua dòng tiêu đề thead)
    for (let i = 1; i < tr.length; i++) {
        const row = tr[i];
        
        // Bỏ qua nếu dòng không có trong tbody (đề phòng)
        if (!row) continue;

        // Kiểm tra xem dòng có khớp với bộ lọc bài học không
        const rowLesson = row.dataset.lesson;
        const lessonMatch = (selectedLesson === 'all' || rowLesson === selectedLesson);

        // Kiểm tra xem dòng có khớp với bộ lọc văn bản không
        let textMatch = false;
        if (filterText === "") {
            textMatch = true; // Nếu ô tìm kiếm trống, coi như mọi dòng đều khớp
        } else {
            const rowText = row.textContent || row.innerText;
            if (rowText.toUpperCase().indexOf(filterText) > -1) {
                textMatch = true;
            }
        }
        
        // Một dòng sẽ được hiển thị NẾU VÀ CHỈ NẾU nó khớp với CẢ HAI bộ lọc
        if (lessonMatch && textMatch) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}