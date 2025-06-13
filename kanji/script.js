/**
 * Lọc bảng Kanji dựa trên từ khóa nhập vào.
 * Ẩn/hiện các hàng (<tr>) và các tiêu đề nhóm (.category-header)
 * dựa trên sự khớp của nội dung trong các ô (<td>) với từ khóa.
 */
function searchTable() {
    // Lấy đối tượng input và giá trị filter
    const input = document.querySelector('.search-input');
    const filter = input.value.toUpperCase(); // Chuyển từ khóa thành chữ hoa để tìm kiếm không phân biệt hoa thường

    // Lấy đối tượng bảng và tất cả các hàng (tr) trong tbody
    const table = document.getElementById('kanjiTable');
    const tr = table.getElementsByTagName('tr'); // Lấy cả thead và tbody, nên cần cẩn thận

    // Lặp qua tất cả các hàng của bảng để quyết định ẩn hay hiện
    for (let i = 0; i < tr.length; i++) {
        // Bỏ qua hàng tiêu đề của bảng (thead > tr)
        if (tr[i].parentNode.nodeName === 'THEAD') {
            continue;
        }

        // Xử lý hàng là tiêu đề nhóm (.category-header)
        if (tr[i].classList.contains('category-header')) {
            // Sẽ xử lý ẩn/hiện category header ở vòng lặp thứ hai sau khi các hàng con đã được xử lý
            continue; 
        } else {
            // Xử lý các hàng dữ liệu Kanji thông thường
            const tdCells = tr[i].getElementsByTagName('td');
            let foundInRow = false; // Cờ để kiểm tra xem từ khóa có được tìm thấy trong hàng này không

            if (tdCells.length > 0) {
                // Lặp qua tất cả các ô (td) trong hàng hiện tại
                for (let j = 0; j < tdCells.length; j++) {
                    if (tdCells[j]) {
                        const txtValue = tdCells[j].textContent || tdCells[j].innerText;
                        // Nếu tìm thấy từ khóa trong ô
                        if (txtValue.toUpperCase().indexOf(filter) > -1) {
                            foundInRow = true;
                            break; // Không cần kiểm tra các ô khác trong hàng này nữa
                        }
                    }
                }
            }

            // Hiển thị hàng nếu tìm thấy từ khóa hoặc nếu không có filter (hiển thị tất cả)
            if (foundInRow || filter === "") {
                tr[i].style.display = '';
            } else {
                tr[i].style.display = 'none';
            }
        }
    }

    // Vòng lặp thứ hai: Cập nhật hiển thị cho các category-header
    // Điều này đảm bảo rằng category-header chỉ hiển thị nếu có ít nhất một hàng con của nó đang hiển thị
    for (let i = 0; i < tr.length; i++) {
         // Bỏ qua hàng tiêu đề của bảng (thead > tr)
        if (tr[i].parentNode.nodeName === 'THEAD') {
            continue;
        }
        
        if (tr[i].classList.contains('category-header')) {
            let categoryShouldBeVisible = false;
            let nextSibling = tr[i].nextElementSibling;

            // Kiểm tra các hàng con (cho đến khi gặp category-header tiếp theo hoặc hết bảng)
            while (nextSibling && !nextSibling.classList.contains('category-header')) {
                // Nếu một hàng con đang được hiển thị (không phải display: none)
                if (window.getComputedStyle(nextSibling).display !== 'none') {
                    categoryShouldBeVisible = true;
                    break; 
                }
                nextSibling = nextSibling.nextElementSibling;
            }

            // Hiển thị category-header nếu có hàng con hiển thị hoặc không có filter
            if (filter === "" || categoryShouldBeVisible) {
                tr[i].style.display = '';
            } else {
                // Nếu không có hàng con nào khớp, thử khớp với chính category header
                let headerText = tr[i].textContent || tr[i].innerText;
                if (headerText.toUpperCase().indexOf(filter) > -1) {
                    tr[i].style.display = '';
                } else {
                    tr[i].style.display = 'none';
                }
            }
        }
    }
}
