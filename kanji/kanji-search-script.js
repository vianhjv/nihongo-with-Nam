/**
 * Script tối ưu cho việc tìm kiếm Kanji trong bảng
 * Sử dụng kỹ thuật Debouncing để cải thiện hiệu suất.
 */
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const kanjiTable = document.getElementById('kanjiTable');
    // Lấy tất cả các hàng trong tbody để xử lý
    const allRows = kanjiTable.querySelectorAll('tbody tr'); 
    let debounceTimer;

    /**
     * Hàm thực hiện logic tìm kiếm và hiển thị.
     * @param {string} filterText - Từ khóa tìm kiếm.
     */
    const performSearch = (filterText) => {
        const filter = filterText.toUpperCase();

        // Lặp qua tất cả các hàng (bao gồm cả category header)
        allRows.forEach(row => {
            // Chỉ tìm kiếm trên các hàng dữ liệu (không phải category header)
            if (!row.classList.contains('category-header')) {
                const rowText = row.textContent || row.innerText;
                if (rowText.toUpperCase().indexOf(filter) > -1) {
                    row.style.display = ''; // Hiển thị hàng nếu khớp
                } else {
                    row.style.display = 'none'; // Ẩn hàng nếu không khớp
                }
            }
        });

        // Vòng lặp thứ hai để xử lý việc hiển thị các category header
        allRows.forEach(row => {
            if (row.classList.contains('category-header')) {
                let nextSibling = row.nextElementSibling;
                let hasVisibleChildren = false;

                // Kiểm tra các hàng con tiếp theo cho đến khi gặp category header khác
                while (nextSibling && !nextSibling.classList.contains('category-header')) {
                    // Nếu có ít nhất một hàng con đang hiển thị
                    if (nextSibling.style.display !== 'none') {
                        hasVisibleChildren = true;
                        break; // Dừng kiểm tra vì đã biết category này cần hiển thị
                    }
                    nextSibling = nextSibling.nextElementSibling;
                }

                // Hiển thị category header nếu nó có hàng con hiển thị
                if (hasVisibleChildren) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    };

    // Lắng nghe sự kiện 'input' trên ô tìm kiếm
    searchInput.addEventListener('input', function () {
        // Hủy bộ đếm thời gian cũ (nếu có)
        clearTimeout(debounceTimer);
        
        const searchText = this.value;

        // Nếu ô tìm kiếm trống, hiển thị lại toàn bộ bảng ngay lập tức
        if (searchText === "") {
            allRows.forEach(row => {
                row.style.display = '';
            });
            return;
        }

        // Đặt một bộ đếm thời gian mới. Hàm tìm kiếm sẽ chỉ chạy sau 300ms
        debounceTimer = setTimeout(() => {
            performSearch(searchText);
        }, 300); // 300 mili-giây là khoảng thời gian chờ hợp lý
    });
});