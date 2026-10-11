Web sử dụng trực tiếp: https://hocbaicungcon.github.io/CHAM_THI/

# Chấm phiếu trắc nghiệm trên GitHub Pages

Web tĩnh chạy hoàn toàn trong trình duyệt, dựa trên `template/PHIEU_CHAM_TN.png`. Nhận bài từ ảnh, PDF nhiều trang hoặc camera điện thoại; nhập đáp án từ Excel/ảnh QR; tự căn chỉnh và chấm; xuất bảng điểm Excel/PDF và PDF bài làm đã đánh dấu.

## Cách sử dụng

1. **Nhập đáp án** bằng nút **Nhập Excel** hoặc **Nhập ảnh QR**. Hai file mẫu trong `template/` dùng được trực tiếp. Cũng có thể nhập/sửa đáp án bằng các ô văn bản.
2. **Chọn số câu và thang điểm** từng phần. Khi nhập file đáp án, số câu được cập nhật theo những câu có đáp án; thang điểm giữ theo cấu hình đang dùng.
3. **Tải bài làm** qua **Chọn ảnh / PDF**. Có thể chọn nhiều file cùng lúc. Mỗi trang PDF trở thành một bài trong danh sách. Các lần tải tiếp theo thêm bài vào danh sách hiện tại.
4. Web **tự tìm bốn mốc vuông đen**, nhận hướng phiếu, căn phối cảnh và đọc các ô tô ngay khi tải xong. SBD và mã đề được đọc từ ô số; mã đề sẽ khớp với bộ đáp án đã nhập. Ví dụ mã `0101` trên phiếu khớp mã `101` trong mẫu.
5. **Kiểm tra bài đang xem** bằng bộ chọn bài/trang hoặc bấm tên bài trong bảng. Có thể sửa SBD, chọn lại mã đề, sửa từng đáp án. Nếu thiếu mốc, chọn bốn góc trên trái → trên phải → dưới phải → dưới trái rồi bấm **Đọc ô tô**. Các ô không rõ được đánh dấu để kiểm tra.
6. **Xuất kết quả**:
   - **Xuất điểm Excel**: file `.xlsx` gồm bảng điểm, chi tiết từng câu và cấu hình chấm.
   - **Xuất bảng điểm PDF**: bảng điểm của tất cả bài/trang trong danh sách.
   - **Xuất bài đã chấm PDF**: mỗi bài một trang PDF, có tổng điểm, điểm từng phần, SBD, mã đề và đánh dấu trực tiếp trên phiếu.
   - **Xuất CSV**: chi tiết của bài đang xem.

Bấm **Xem bài đã đánh dấu** để xem trước các dấu chấm. Dấu ✓ xanh là câu/ý đúng; × đỏ là sai; vòng xanh nét đứt chỉ đáp án chuẩn khi bài làm sai hoặc bỏ trống. Phần III có nhãn đúng/sai cho từng câu, kèm đáp án chuẩn khi sai.

Bài chưa có đủ mốc hoặc chưa có đáp án đúng mã đề vẫn được giữ trong danh sách và file xuất với trạng thái **chưa chấm**, không bị loại bỏ âm thầm. Nếu mã đề đọc rõ nhưng chưa có trong bộ đáp án, web yêu cầu chọn mã đề trước khi tính điểm.

## Camera điện thoại

- **Mở camera** sử dụng camera sau khi có thể, cho xem trực tiếp; bấm **Chụp & chấm** để xử lý ảnh.
- **Chụp bằng điện thoại** sử dụng trình chọn/chụp ảnh của thiết bị, phù hợp khi camera trực tiếp không khả dụng.
- Camera trực tiếp cần HTTPS (GitHub Pages có HTTPS) hoặc localhost và quyền camera của trình duyệt. Tắt camera khi chụp xong, khi bấm **Tắt camera** hoặc khi rời trang.
- Giữ điện thoại thẳng và lấy đủ bốn mốc đen ở góc phiếu; nên dùng ảnh sáng, rõ, nét, tô bằng chì hoặc mực xanh/đen.

## Nhập đáp án theo mẫu

### Excel YoungMix

`template/TLTN-BGD-2025-YoungMix.xlsx` có mã đề ở cột A; một hàng cho mỗi mã đề. Hàng tiêu đề có phần I `1…40`, phần II `1a…8d`, phần III `1…6`. Web bỏ các câu trống ở cuối từng phần, giữ nguyên vị trí câu bên trong.

File mẫu chứa 25 mã đề, mỗi đề có 18 câu phần I, 4 câu phần II và 6 câu phần III. Chữ `D` ở phần II được đổi thành `Đ`. Chấp nhận `.xlsx` và `.xls` có cấu trúc này.

### Ảnh QR

`template/QR mau.png` chứa 9 mã đề. Dữ liệu JSON có dạng:

```json
{"101":"ABCD#ĐSĐS_ĐĐSS#1.25_-2_0","success":true,"type":6}
```

Ba phần ngăn cách bằng `#`; các câu đúng/sai và đáp án số ngăn cách bằng `_`. Các trường phụ như `success`, `type` được bỏ qua. QR là dữ liệu đáp án, không phải đường dẫn web.

## Số câu và thang điểm

- Phần I: 0–40 câu; phần II: 0–8 câu, mỗi câu 4 ý; phần III: 0–6 câu.
- Chấm các câu từ câu 1 đến số câu được chọn. Số câu bằng 0 nghĩa là bỏ phần đó.
- Nhập **tổng điểm của phần** hoặc **điểm mỗi câu**. Khi đổi cách nhập, web chuyển đổi giá trị để giữ nguyên tổng điểm hiện tại.
- Phần II: chia đều theo từng ý đúng; chỉ có điểm khi đúng đủ 4 ý; hoặc chấm theo mức 1–4 ý đúng. Tỷ lệ mặc định 10%, 25%, 50%, 100% điểm tối đa của câu, có thể chỉnh.
- Thay đổi cấu hình sẽ cập nhật điểm của tất cả bài đã tải. Các câu vượt số câu được chọn được giữ lại nhưng không tính điểm và không xuất chi tiết.
- Khi thiếu đáp án hợp lệ, kết quả được ghi rõ **điểm tạm tính**.

## Xử lý cục bộ và thư viện

Không tải bài làm lên máy chủ hoặc gửi dữ liệu tới API nhận dạng. Đáp án và cấu hình được lưu bằng `localStorage`; ảnh và bài chấm nằm trong bộ nhớ của trang. Tải lại/đóng trang sẽ xóa danh sách bài đang chấm, vì vậy hãy xuất kết quả trước khi đóng.

- `js/omr.js`: tìm mốc, căn phối cảnh, đọc ô tô, SBD và mã đề.
- `js/grading.js`: kiểm tra cấu hình và tính điểm.
- `js/inputs.js`: nhập Excel/QR và đọc từng trang PDF.
- `js/reports.js`: bảng điểm và PDF bài đã đánh dấu.
- `vendor/`: SheetJS, jsQR, PDF.js (kèm worker, font, bảng ký tự, WASM), pdf-lib. Toàn bộ thư viện được lưu cùng web, không dùng CDN lúc chạy. Phiên bản/giấy phép nằm trong `vendor/README.md`.

Các đường dẫn đều tương đối, hỗ trợ trang dự án như `https://<tài-khoản>.github.io/<repo>/`. Giữ cả thư mục `js/`, `vendor/` và `template/` khi triển khai.

## GitHub Pages và chạy cục bộ

Vào **Settings → Pages → Build and deployment**, chọn **Deploy from a branch**, chọn nhánh và thư mục `/ (root)`, rồi lưu.

Chạy thử cục bộ bằng `python3 -m http.server 8080`, truy cập `http://localhost:8080`. Đọc PDF dùng worker/module nên cần HTTP/HTTPS; không dùng `file://` cho luồng PDF.

Chạy kiểm tra: `node --test tests/*.test.js`.

## Giới hạn

Mẫu phiếu khác, ảnh bị mất mốc, bóng tối nặng, giấy cong hoặc vết bẩn có thể khiến việc tự căn/đọc ô thất bại. Web cho căn và sửa thủ công. Nhận dạng chữ viết tay/họ tên chưa được hỗ trợ. PDF có mật khẩu cần được mở khóa trước khi tải. Kiểm tra các ô không rõ, SBD và mã đề trước khi dùng kết quả.

Camera thật cần kiểm tra trên điện thoại và trình duyệt đang sử dụng. Kiểm thử trong môi trường phát triển đã xác nhận Excel/QR mẫu, căn phiếu xoay 0/90/180/270°, ảnh bài làm, PDF nhiều trang, xuất Excel và hai loại PDF; chưa kiểm thử phần cứng camera điện thoại.

Tài liệu thư viện: [PDF.js](https://mozilla.github.io/pdf.js/examples/index.html), [SheetJS](https://docs.sheetjs.com/docs/demos/local/file/), [jsQR](https://github.com/cozmo/jsQR), [pdf-lib](https://pdf-lib.js.org/docs/api/classes/pdfdocument), [camera trên MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

### Giao diện điện thoại

Màn hình rộng tối đa 600px dùng thanh điều hướng cố định: **Chấm bài**, **Đáp án**, **Kết quả**. Đáp án và thang điểm nằm cùng một màn hình; chuyển mục giữ nguyên bài và dữ liệu đang nhập. Nút thao tác lớn, ô nhập chữ 16px và khoảng đệm vùng an toàn hỗ trợ màn hình có tai thỏ. Máy tính tiếp tục hiển thị toàn bộ khu vực làm việc.

### Nhận dạng trong điều kiện ánh sáng thay đổi

Bộ đọc ước lượng độ sáng giấy quanh từng ô và dùng ngưỡng tương phản cục bộ, giúp đọc nét tô nhạt và hạn chế nhầm bóng đổ thành đáp án. Mốc căn chỉnh cũng dùng tương phản với vùng giấy xung quanh. Ô tô nhiều hoặc không đủ rõ vẫn được đánh dấu để kiểm tra. Đã kiểm tra bằng ảnh mô phỏng độ tương phản thấp, vùng tối, ánh sáng thay đổi theo chiều ngang và ảnh phiếu mẫu; chưa có bộ ảnh chụp thực tế đủ lớn để công bố tỷ lệ chính xác.

### Camera quét liên tiếp và hai mẫu phiếu

Bấm **Mở camera** để mở màn hình quét phủ toàn bộ vùng hiển thị web. Viền xanh bám theo phiếu; bốn ô vuông định vị được highlight. Viền vàng yêu cầu đưa máy gần hơn hoặc làm rõ nét tô. Giữ phiếu ổn định khoảng một giây để tự lưu, căn chỉnh và chấm; màn hình tiếp tục quét phiếu sau. Có nút **Tạm dừng quét**, **Chụp thủ công** và đóng camera.

Trong một lượt mở camera, SBD/mã đề đã đọc rõ được dùng để tránh quét trùng. Phiếu thiếu SBD cần đưa ra khỏi camera trước khi quét bài khác có cùng đáp án; nút chụp thủ công cho phép lưu lại khi cần. Đóng camera hoặc chuyển ứng dụng sẽ tắt luồng camera; bài đã lưu vẫn ở trong danh sách của phiên trình duyệt.

Web tự phân biệt mẫu ảnh YoungMix và `template/PHIEU TLTN CHUAN.pdf`, sử dụng vị trí mốc/ô riêng cho từng mẫu; PDF bài đã chấm cũng đặt dấu đúng/sai theo đúng mẫu. Bộ tìm mốc chấp nhận ô vuông xoay nghiêng và tinh chỉnh tâm mốc trên ảnh gốc để giảm lệch do thu nhỏ. Các kiểm tra đã dùng phiếu nghiêng 18 độ trên nền bàn có vật gây nhiễu và video mô phỏng quét hai mẫu liên tiếp. Camera điện thoại thực tế vẫn cần kiểm tra thêm; không công bố tỷ lệ chính xác từ các mô phỏng này.

### Nút thao tác và icon

Panel quét dùng nút thao tác cao tối thiểu 48px, nhóm nhập bài, đọc/xem bài và thao tác đặt lại/xóa riêng. Các nút chưa sử dụng được sẽ khóa khi danh sách trống. Nút tải file hỗ trợ bàn phím và chạm. Toàn bộ icon giao diện dùng SVG phẳng cục bộ trong một sprite, chia sẻ cả đường nét dấu đúng/sai cho ảnh/PDF bài chấm.
