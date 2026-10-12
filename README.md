Web sử dụng trực tiếp: https://hocbaicungcon.github.io/CHAM_THI/

# Chấm phiếu trắc nghiệm trên GitHub Pages

Web tĩnh chạy hoàn toàn trong trình duyệt, dựa trên `template/PHIEU_CHAM_TN.png`. Nhận bài từ ảnh, PDF nhiều trang hoặc camera điện thoại; nhập đáp án từ Excel/PDF/Word/ảnh QR; tự căn chỉnh và chấm; xuất bảng điểm Excel/PDF và PDF bài làm đã đánh dấu.

## Cách sử dụng

1. **Nhập đáp án** bằng nút **Nhập Excel**, **Nhập PDF / Word** hoặc **Nhập ảnh QR** trên mobile. Các file mẫu trong `template/` dùng được trực tiếp; máy tính có nút **Tạo ảnh QR** để chia sẻ đáp án. Cũng có thể nhập/sửa đáp án bằng các ô văn bản.
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

### Excel YoungMix / SmartTest

`template/BGD-2025-YoungMix.xlsx` có mã đề ở cột A; một hàng cho mỗi mã đề. Hàng tiêu đề có phần I `1…40`, phần II `1a…8d`, phần III `1…6`. Web bỏ các câu trống ở cuối từng phần, giữ nguyên vị trí câu bên trong.

`template/BGD-2025-SmartTest.xlsx` đặt mã đề theo cột, hàng đầu là `Câu\Mã đề`. Các hàng câu liên tiếp gồm phần I (A/B/C/D), phần II (bốn ý Đ/S/O/X viết liền), rồi phần III (đáp án số). Web tự nhận cấu trúc, giữ dấu phẩy thập phân và mã đề có số 0 đầu. File mẫu có 4 mã đề, mỗi mã gồm 12 câu phần I, 5 câu phần II và 4 câu phần III.

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

### Đáp án phần I mở rộng
Mỗi câu ngăn cách bằng dấu cách hoặc dấu phẩy. `AB`, `ABC` chấp nhận một trong các phương án ghi liền nhau; `O` chấp nhận A/B/C/D, `X` bỏ qua câu và loại điểm tối đa của câu. Bỏ trống hoặc tô nhiều không được điểm với `O`. Excel nhập mỗi câu một ô. QR cũ giữ chuỗi một ký tự/câu; QR có đáp án mở rộng dùng `_` để phân tách câu, ví dụ `AB_ABC_O_X##`. Sửa đáp án cập nhật điểm và báo cáo của tất cả bài cùng mã đề. Vòng xanh: lựa chọn đúng; đỏ: lựa chọn sai; vàng: đáp án được chấp nhận khi chọn sai.

### Đúng/sai O và X
Mỗi câu đủ 4 ký tự, ví dụ `ĐSOX`. `O` chấp nhận một lựa chọn Đ hoặc S; bỏ trống/tô cả hai không được điểm. `X` bỏ qua ý; điểm chia lại cho các ý còn lại để đúng đủ vẫn đạt điểm tối đa câu. Theo mức điểm: quy đổi tỷ lệ ý đúng về 4 ý và nội suy các mốc. `XXXX` không tính điểm, giảm điểm tối đa bài tương ứng. Excel/QR cùng dùng O/X. Ý X hiện trung tính trên giao diện, không khoanh đúng/sai và ghi “Bỏ qua (X)” trong Excel.

Phần III cũng nhận `O` (mọi đáp án số hợp lệ, không nhận bỏ trống) và `X` (bỏ qua câu, loại điểm tối đa câu). Đáp án E phần I đã lưu trong trình duyệt được chuyển sang X khi mở phiên bản mới.

### Nhập mã đề thủ công và bám mốc camera
Có ô mã đề (1–4 chữ số) và nút “Lưu mã đề & đáp án” để thêm hoặc cập nhật bộ đáp án. Khi gõ mã mới, đáp án đang sửa được giữ riêng, không ghi đè mã cũ trước khi lưu. Bộ đọc phân biệt nét tô trong lòng ô với viền in, dùng thêm mốc phụ ở mép/bên trong mẫu, hiệu chỉnh độ lệch cục bộ và kiểm chứng lại mốc ở mỗi khung hình trước khi bám nhanh camera. Kiểm tra PDF riêng trong `data` chỉ chạy cục bộ nếu file tồn tại và có Poppler; dữ liệu bài làm không thuộc mã nguồn xuất bản.

### Lưu tạm và sử dụng khi mất mạng

Ảnh gốc, góc căn chỉnh, kết quả nhận dạng, đáp án đã sửa, SBD và mã đề của từng bài được tự động lưu trong IndexedDB trên thiết bị. Cấu hình và đáp án vẫn lưu trong trình duyệt. Mở lại trang sẽ khôi phục danh sách bài và hiển thị bài đã chấm. Đợi thông báo “Đã lưu cục bộ” trước khi đóng trang. “Xóa danh sách” cũng xóa bản lưu tạm của danh sách đó.

Lần mở đầu cần mạng để tải bộ nhớ đệm. Khi xuất hiện “Sẵn sàng dùng khi mất mạng”, trang có thể mở lại, chấm ảnh/PDF và xuất kết quả ngoại tuyến. Dữ liệu lưu trên cùng trình duyệt và thiết bị; xóa dữ liệu website hoặc dùng chế độ riêng tư có thể làm mất bản lưu. Nếu bộ nhớ đầy/không khả dụng, ứng dụng hiển thị lỗi lưu và vẫn cho xuất kết quả.

Khi cập nhật tài nguyên web, chạy `node scripts/build-offline-assets.cjs` để tạo lại `offline-assets.json` và tăng phiên bản cache trong `sw.js`. Không đưa bài học sinh vào danh sách cache hay Git. Cache mới kích hoạt sau khi tải đủ tài nguyên; tải lại trang để nhận phiên bản mới. Dữ liệu IndexedDB không bị xóa khi cập nhật cache.

### Xem bài toàn màn hình

Bấm ảnh bài đã chấm sau khi dừng quét hoặc ảnh thu nhỏ trong danh sách kết quả. Vuốt lên/phải để xem bài tiếp; vuốt xuống/trái để xem bài trước. Có nút chuyển bài, phím mũi tên và nút đóng; tới đầu/cuối danh sách sẽ dừng. Nút “Xóa dữ liệu bài chấm” xóa ảnh, kết quả, bản lưu tạm và bộ đếm camera để bắt đầu đợt mới, giữ lại đáp án/thang điểm.

Bộ đọc PDF dùng JavaScript và worker thường lưu cục bộ. Nếu trình duyệt không mở được worker, ứng dụng chuyển sang xử lý trong trang. Khi nhận thấy một phương án tô rất đậm bên cạnh dấu tô mờ, phần I có thể nhận phương án đậm nhưng vẫn gắn cờ kiểm tra; hai phương án rõ vẫn không tự chọn một.

### Tốc độ nhận dạng

Camera xác nhận tối thiểu 3 khung hình đồng nhất trong 160 ms, kiểm tra lại sau
30 ms kể từ khi xử lý xong khung trước. Kết quả đọc của khung được dùng trực tiếp
để chấm; lưu ảnh vào IndexedDB chạy tiếp trong nền. Trạng thái lưu cục bộ vẫn báo
khi hoàn tất hoặc khi gặp lỗi. Thời gian preview 0,1–5 giây được tính riêng.

Thuật toán căn phiếu dùng lưới không gian để tìm chấm định vị và phép chọn trung
vị cục bộ không cần sắp xếp. Không thay đổi ngưỡng đọc nét tô. Đo trên 25 trang
mẫu ở cạnh dài 1697 px bằng Node trên máy phát triển: căn + đọc 47–118 ms,
trung vị 66 ms. Đây chưa phải phép đo camera trên điện thoại; mục tiêu dưới
500 ms phụ thuộc thiết bị, độ phân giải, ánh sáng và độ ổn định của phiếu.

Đo lại bằng `node scripts/benchmark-omr.cjs /path/to/page.png` (có thể truyền nhiều
ảnh PNG RGB/RGBA). Thời gian này chưa gồm giải mã PDF, vẽ preview và lưu ảnh.

### Một chấm góc bị lóa và nét tô có vệt tẩy

Khi một chấm góc không còn đọc được, thuật toán thử khôi phục bằng ba chấm góc
hiện có và một chấm phụ, rồi kiểm chứng với ít nhất 12 chấm phụ phân bố trên
phiếu (tối thiểu 80% mẫu chấm phụ phải khớp). Camera bám phiếu cũng kiểm chứng
lại các chấm trong từng khung hình. Chấm góc được khôi phục hiện viền vàng nét
đứt; các chấm quan sát được giữ viền thường.

So sánh thêm độ tương phản chì chưa bị giới hạn ở mức tối đa để phân biệt nét
tô đậm với vệt tẩy nhạt. Các kết quả chọn nét đậm cạnh vệt nhạt vẫn có cảnh báo
kiểm tra; hai nét tô rõ không được tự chọn. Áp dụng cho phần I, đúng/sai và cột
chữ số; vòng đánh dấu chữ số trên bài chấm dùng cùng quy tắc. Khi nhập lại bài
đã chấm, các nét xanh/đỏ của vòng đánh dấu được loại khỏi vùng đo, đọc các pixel
chì còn lại. Quy tắc này hướng tới bài dùng chì/mực tối, không phải phiếu tô
bằng các màu đánh dấu của ứng dụng.


## Nhập đáp án PDF / Word

Nút **Nhập PDF / Word** đọc PDF có lớp văn bản và tài liệu Word `.docx`, hoàn toàn cục bộ. Hỗ trợ bảng mã đề theo cột, bảng đúng/sai viết liền hoặc từng ý a–d, bảng hai mã đề đặt cạnh nhau, bảng nối qua trang và cột đề GỐC (mã 000). Đã đối chiếu cả năm mẫu trong `template/Dap an`. PDF chỉ có ảnh chưa hỗ trợ đọc đáp án tự động; tài liệu `.doc` cần lưu lại thành `.docx`. Thang điểm vẫn theo cấu hình của người dùng. Đáp án thiếu, trùng khác nhau hoặc sai cấu trúc sẽ báo lỗi và giữ bộ đáp án đang dùng.

## Xuất ảnh / PDF nhỏ gọn

Chọn **Nhỏ gọn**, **Cân bằng** hoặc **Ưu tiên nét rõ** ở phần Kết quả. Mặc định ảnh bài chấm dùng JPEG chất lượng 0,72, cạnh dài tối đa 1800 px; các mức còn lại dùng 0,82 / 2200 px và 0,92 / 2600 px, không phóng lớn ảnh. PDF bài chấm dùng cùng ảnh nén, xử lý từng trang và tránh chuỗi base64 lớn. PDF bảng điểm dùng ảnh PNG không mất chi tiết chữ; Excel bật nén ZIP. Nút **Xuất ảnh bài đang xem** tải JPEG có điểm và đánh dấu đáp án. Việc nén chỉ áp dụng file xuất, không giảm chất lượng ảnh nhận dạng hoặc ảnh gốc đã lưu.

## Mốc mờ và camera thấp nét

Nếu lượt dò mốc thông thường không đủ tin cậy, bộ căn chỉnh thử ngưỡng tương phản thấp và yêu cầu ít nhất 80% mốc phụ khớp hình học. Ba mốc góc còn nhìn thấy nhưng nhạt màu vẫn có thể được đọc; mốc mất hoàn toàn vẫn tuân theo giới hạn khôi phục một góc. Không ghép mốc cũ từ khung hình trước để tự chấm. Kiểm thử ảnh 480 / 640 px ngang, làm nhòe và làm nhạt ba mốc góc, kiểm tra tọa độ, đáp án tô và các ô trống. Camera có thể chấm khi cạnh ngắn của phiếu đạt 300 px và mốc đủ kích thước; dưới 420 px hoặc dò mốc nhạt cần năm lần đọc nhất quán trong ít nhất 240 ms. Camera điện thoại thực tế vẫn cần kiểm tra theo thiết bị.

## Chia sẻ đáp án bằng QR

Máy tính dùng **Tạo ảnh QR**: tạo toàn bộ bộ đáp án hoặc chỉ mã đề đang chọn, đặt `logo.svg` ở giữa và tải ảnh PNG. QR dùng mức sửa lỗi H; web tự đọc lại ảnh có logo, chỉ cho tải khi dữ liệu đúng. Bộ lớn được chia nhiều QR. Trên mobile, **Nhập ảnh QR** mở lựa chọn chụp camera sau hoặc thư viện ảnh. Nhập QR bổ sung/cập nhật mã đề vào bộ hiện có, để nhập lần lượt đủ các QR; mã đề cùng số nhưng khác số 0 đầu được coi là cùng mã. Thư viện tạo QR, giải mã và logo đều được lưu ngoại tuyến cùng web.
