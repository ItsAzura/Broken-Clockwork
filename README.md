# BROKEN CLOCKWORK

**Broken Clockwork** là một trò chơi giải đố nền tảng (puzzle-platformer) mang phong cách steampunk, nơi bạn điều khiển nhân vật chính sử dụng một chiếc chìa khóa lên dây cót để kích hoạt máy móc và vượt qua các thử thách.

## ⚙️ Cách Khởi Chạy Trò Chơi

Vì trò chơi sử dụng JavaScript Modules (`type="module"`), bạn **không thể** mở trực tiếp file `index.html` từ trình duyệt bằng cách click đúp. Bạn cần chạy một máy chủ local (local server).

### Cách 1: Sử dụng VS Code (Khuyên dùng)
1. Cài đặt extension **Live Server**.
2. Chuột phải vào file `index.html` và chọn **Open with Live Server**.

### Cách 2: Sử dụng NodeJS
Nếu bạn đã cài đặt NodeJS, hãy chạy lệnh sau trong thư mục dự án:
```bash
npx serve .
```
Sau đó truy cập địa chỉ được cung cấp (thường là `http://localhost:3000`).

---

## 🎮 Điều Khiển

| Phím | Hành động |
|------|-----------|
| **W, A, S, D** hoặc **Phím mũi tên** | Di chuyển / Nhảy |
| **Space** hoặc **Enter** | Nhảy / Xác nhận |
| **E** | Lên dây cót (Wind up) máy móc |
| **P** hoặc **Esc** | Tạm dừng (Pause) |
| **R** | Thử lại (Retry) |

---

## 🛠️ Cơ Chế Trò Chơi

- **Lên dây cót:** Thế giới xung quanh bạn đã ngừng hoạt động. Bạn phải sử dụng chìa khóa của mình để nạp năng lượng cho các nền tảng di động, quạt gió, thang máy và các thiết bị khác.
- **Thanh năng lượng (Gauge):** Việc lên dây cót sẽ tiêu tốn năng lượng. Hãy quản lý tài nguyên của bạn thật tốt để không bị mắc kẹt.
- **Vượt chướng ngại vật:** Sử dụng sự khéo léo và tư duy logic để kích hoạt các cỗ máy đúng lúc, tạo lối đi tới đích.

## 📁 Cấu trúc thư mục

- `index.html`: Điểm bắt đầu của ứng dụng.
- `css/`: Chứa các file định dạng giao diện.
- `js/`:
  - `main.js`: Lõi của trò chơi và vòng lặp chính.
  - `input.js`: Xử lý sự kiện bàn phím.
  - `constants.js`: Các thông số thiết lập của game (mình có thể chỉnh độ khó ở đây).
  - `WindableObject.js`: Định nghĩa các vật thể có thể lên dây cót.
  - ... và các module hỗ trợ khác.

---

Chúc bạn có những giây phút trải nghiệm thú vị với **BROKEN CLOCKWORK**! 🕰️✨
# Broken-Clockwork
