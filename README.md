

# HỆ THỐNG THEO DÕI VÀ QUẢN LÝ ĐƠN HÀNG SHOPEE TỰ ĐỘNG

Hệ thống tự động hóa được xây dựng trên nền tảng Google Apps Script, giúp theo dõi, trích xuất và quản lý tập trung dữ liệu đơn hàng Shopee từ nhiều tài khoản khác nhau thông qua hộp thư Gmail. Dữ liệu sau khi xử lý sẽ được đồng bộ hóa trực tiếp vào Google Sheets và gửi thông báo đến người dùng qua Telegram Bot.

Mã nguồn được thiết kế nghiêm túc, tuân thủ chặt chẽ các nguyên lý SOLID để đảm bảo tính đơn nhiệm, dễ dàng mở rộng và bảo trì.

---


Bạn có thể nhanh chóng sử dụng bot bằng cách Copy toàn bộ file BotCore.js để chjay bot, ngoài ra nếu bạn tách file ra làm các class khác Google App Script (GAS) vẫn sẽ chạy bình thường mà thôi.

HÌnh ảnh minh hoạ bot hoạt động:






## 1. Tính năng cốt lõi

* **Quản lý đa tài khoản (Multi-account Tracking):** Biểu diễn và phân loại chính xác các đơn hàng thuộc về các tài khoản Shopee khác nhau dựa trên tên đăng nhập trích xuất từ email.
* **Xử lý trùng lặp thông minh (Data Deduplication & Enrichment):** Khi nhận được nhiều email cho cùng một đơn hàng (như xác nhận thanh toán và thông báo giao hàng), hệ thống không ghi chèn dòng mới mà tự động cập nhật, gộp trạng thái và thời gian vào đúng dòng dữ liệu cũ để phản ánh đúng tiến độ mà không làm sai lệch báo cáo tài chính.
* **Giải mã và làm sạch dữ liệu (Quoted-Printable Decoding):** Bộ giải mã mã hóa đặc thù của Gmail giúp chuyển đổi các chuỗi ký tự kỹ thuật về văn bản UTF-8 thuần túy, bảo đảm hoàn toàn tính chính xác của tiếng Việt.
* **Hiển thị hình ảnh trực quan (Inline Image Rendering):** Trích xuất đường dẫn ảnh sản phẩm gốc từ Shopee và render tự động vào ô tính bằng hàm `=IMAGE()`.
* **Quản lý trạng thái luồng thư (Gmail State Management):** Tự động khởi tạo và gắn nhãn (Label) `Shopee_Tracker` cho các email đã xử lý thành công, ngăn ngừa tuyệt đối việc quét lại và tối ưu tài nguyên hệ thống.

---

## 2. Kiến trúc mã nguồn và Nguyên lý SOLID

Mã nguồn được phân chia thành các thành phần độc lập, mỗi lớp chỉ đảm nhận một trách nhiệm duy nhất (Single Responsibility Principle):

1. **`QuotedPrintableDecoder`**: Chịu trách nhiệm phân giải mã hóa Quoted-Printable và làm sạch các thẻ HTML thô để trả về văn bản thô vào mảng dữ liệu thuần.
2. **`ShopeeOrderData`**: Lớp đối tượng trung chuyển dữ liệu (Data Transfer Object - DTO), định nghĩa cấu trúc phẳng của một đơn hàng và chuyển đổi đối tượng thành mảng một chiều để nạp vào Google Sheets.
3. **`ShopeeEmailParser`**: Lớp thực thi phân tích (Parser), áp dụng các biểu thức chính quy (Regular Expression) có giới hạn biên để trùng khớp chính xác các trường thông tin cố định trong thư.
4. **`ShopeeSpreadsheetStorage`**: Lớp tương tác với cơ sở dữ liệu Google Sheets, phụ trách kiểm tra, khởi tạo bảng tiêu đề và thực hiện thuật toán tra cứu mã đơn hàng để quyết định ghi mới hoặc cập nhật.
5. **`TelegramNotifier`**: Bộ phát thông báo độc lập, đóng gói logic giao tiếp với Telegram Bot API qua phương thức POST JSON.

---

## 3. Hướng dẫn cài đặt và Triển khai

### Bước 1: Chuẩn bị Google Sheets

1. Truy cập vào Google Drive và tạo một file Google Sheets mới.
2. Trên thanh công cụ, chọn **Tiện ích mở rộng** (Extensions) > **Apps Script**.

### Bước 2: Cấu hình mã nguồn

1. Xóa toàn bộ mã nguồn mặc định trong trình soạn thảo `Code.gs`.
2. Sao chép toàn bộ mã nguồn hệ thống phiên bản mới nhất và dán vào file.
3. Tiến hành chỉnh sửa hằng số `CONFIG` ở đầu file:
* Nếu chưa sử dụng Telegram, giữ nguyên các giá trị mặc định.
* Thay đổi `SHEET_NAME` nếu bạn muốn đặt tên khác cho trang tính.



### Bước 3: Cấp quyền và Chạy kiểm tra

1. Tại thanh menu điều khiển của Apps Script, chọn hàm `testSingleLatestEmail`.
2. Bấm nút **Chạy** (Run).
3. Google sẽ hiển thị một hộp thoại yêu cầu cấp quyền truy cập Gmail và Google Sheets. Bấm **Xem quyền hỗ trợ** > Chọn tài khoản của bạn > **Nâng cao** (Advanced) > **Đi tới dự án (Không an toàn)** > Chọn **Cho phép** (Allow).
4. Kiểm tra nhật ký thực thi (Execution Log) để xác nhận dữ liệu đã được trích xuất thành công. Sau đó kiểm tra Google Sheets để thấy dòng dữ liệu đầu tiên kèm ảnh sản phẩm được render.

### Bước 4: Thiết lập trình kích hoạt tự động (Time-driven Trigger)

Để hệ thống tự động vận hành ngầm 24/7 mà không cần thực thi thủ công:

1. Tại menu bên trái của giao diện Google Apps Script, bấm chọn biểu tượng đồng hồ (**Trình kích hoạt** / Triggers).
2. Bấm nút **Thêm trình kích hoạt** (Add Trigger) ở góc dưới bên phải.
3. Cấu hình các tham số:
* Chọn hàm muốn chạy: `autoScanShopeeEmails`
* Chọn phiên bản muốn triển khai: `Head`
* Chọn nguồn sự kiện: `Theo thời gian` (Time-driven)
* Chọn loại trình kích hoạt theo thời gian: `Trình kích hoạt theo phút` (Minutes timer)
* Chọn khoảng thời gian: `Mỗi 10 phút` hoặc `Mỗi 15 phút` (tùy thuộc vào tần suất mua hàng).


4. Bấm **Lưu** (Save).

---

## 4. Giải thích logic xử lý chi tiết

### Logic Trích xuất chuỗi kiên cố (Bulletproof Extraction)

Để tránh tình trạng gãy chuỗi do dính các ký tự xuống dòng ẩn trong HTML hoặc do Shopee thay đổi biểu mẫu giữa các loại thông báo, lớp `ShopeeEmailParser` sử dụng kỹ thuật kẹp mốc (Lookahead Boundary):

* **Tên sản phẩm:** Được trích xuất bằng cách tìm vùng văn bản nằm cố định giữa hai từ khóa `Người bán:` và `Mẫu mã:` (hoặc `Số lượng:`). Luồng thông tin này sau đó được bóc sạch các số thứ tự dư thừa ở đầu.
* **Thời gian:** Tối ưu bằng cách kẹp vị trí giữa `Ngày đặt hàng:` và `Người bán:`. Nếu thuộc loại email giao hàng thông báo không có giờ, hệ thống sẽ thực hiện trích xuất đúng định dạng ngày thô thuần túy từ Shopee mà không tự ý can thiệp vào dữ liệu gốc của người bán.

### Logic Xử lý trùng lặp và Cập nhật vùng ô tính (Append-to-Cell Logic)

Khi thực thi hàm `saveOrUpdateOrder`, hệ thống hoạt động như sau:

1. Thực hiện quét độc lập toàn bộ cột C (Mã đơn hàng) để tìm kiếm chuỗi mã đơn hiện tại.
2. Nếu trả về chỉ số index hợp lệ (`existingRow > -1`), hệ thống dùng phương thức `getRange().getValue()` để lấy chuỗi trạng thái và thời gian cũ.
3. Code thực hiện so sánh chuỗi an toàn. Nếu đơn hàng chưa tồn tại trạng thái mới này, chuỗi mới sẽ được nối vào dưới dạng chuỗi xuống dòng (`currentText + "\n" + newText`).
4. Phương thức `setWrap(true)` được gọi để Google Sheets tự động hiển thị các dòng text gọn gàng trong phạm vi một ô tính duy nhất.

---

## 5. Cảnh báo an ninh về thông tin nhạy cảm (Security & Sensitive Data)

Trước khi chia sẻ mã nguồn này lên các nền tảng lưu trữ công khai như GitHub, bạn cần lưu ý các vấn đề an ninh an toàn thông tin đặc biệt quan trọng sau:

1. **Telegram Token và Chat ID:** Đối tượng `CONFIG` có chứa hai trường giá trị `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`. Nếu bạn đã điền thông tin Bot thực tế của mình vào đây, **tuyệt đối không được push mã nguồn lên GitHub**. Nếu kẻ xấu nắm giữ Bot Token của bạn, họ có thể chiếm quyền điều khiển Bot và gửi tin nhắn rác hoặc khai thác thông tin trái phép.
2. **Thông tin cá nhân trong Email Test:** Trong quá trình phát triển, nếu bạn có tạo các hàm test kiểm tra văn bản thô vào biến chuỗi (giống như `sampleMailPayment` ở các phiên bản thử nghiệm trước đó), hãy đảm bảo xóa bỏ hoàn toàn các đoạn text chứa Tên thật, Số điện thoại thật và Địa chỉ nhà thật của bạn trước khi public.
3. **Giải pháp bảo mật khi public GitHub:**
* Hãy giữ hai trường `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` luôn là các chuỗi trống hoặc chuỗi giữ chỗ placeholder (ví dụ: `"ĐIỀN_TOKEN_CỦA_BẠN_TẠI_ĐÂY"`).
* Nếu muốn chạy thực tế kèm theo chia sẻ code sạch, bạn nên sử dụng lớp biểu diễn thuộc tính hệ thống của Google Apps Script `PropertiesService.getScriptProperties().getProperty('TG_TOKEN')` để lưu các khóa bí mật vào môi trường Script của riêng bạn mà không lo can thiệp vào file mã nguồn cứng.