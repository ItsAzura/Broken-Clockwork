# BROKEN CLOCKWORK

**Broken Clockwork** là một trò chơi giải đố nền tảng (puzzle-platformer) mang phong cách steampunk với thiết kế "troll" lấy cảm hứng từ "World's Hardest Game". Bạn điều khiển nhân vật chính sử dụng một chiếc chìa khóa lên dây cót để kích hoạt máy móc và vượt qua các thử thách đầy lừa dối tâm lý.

## 🎯 Triết Lý Thiết Kế

Game được thiết kế theo nguyên tắc: **"Bẫy phải NHÌN THẤY được khi nhìn lại. Người chơi chết và ngay lập tức hiểu tại sao — nhưng không bao giờ thấy trước được lần đầu tiên."**

Độ khó không đến từ phản xạ hay kỹ năng, mà từ **sự lừa dối về mặt tâm lý**:
- Khu vực trông an toàn nhưng lại nguy hiểm
- Đường rộng trông dễ đi nhưng lại khó hơn đường hẹp
- Bánh răng trang trí có thể giết bạn
- Chuyển động đối xứng nhưng có độ lệch pha
- Chướng ngại vật tăng tốc âm thầm sau mỗi 3 lần chết

## ⚙️ Cách Khởi Chạy Trò Chơi

Vì trò chơi sử dụng JavaScript Modules (`type="module"`), bạn **không thể** mở trực tiếp file `index.html` từ trình duyệt bằng cách click đúp. Bạn cần chạy một máy chủ local (local server).

### 🖥️ Chạy Trên Local

#### Cách 1: Sử dụng VS Code (Khuyên dùng)
1. Cài đặt extension **Live Server** trong VS Code
2. Chuột phải vào file `index.html` và chọn **Open with Live Server**
3. Trình duyệt sẽ tự động mở game tại `http://localhost:5500`

#### Cách 2: Sử dụng NodeJS
Nếu bạn đã cài đặt NodeJS, chạy lệnh sau trong thư mục dự án:
```bash
npx serve .
```
Sau đó truy cập địa chỉ được cung cấp (thường là `http://localhost:3000`).

#### Cách 3: Sử dụng Python
Nếu bạn có Python đã cài đặt:

**Python 3:**
```bash
python -m http.server 8000
```

**Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

Sau đó truy cập `http://localhost:8000` trong trình duyệt.

### 🧪 Chạy Tests
Để chạy bộ test kiểm tra tính đúng đắn của game:
```bash
# Cài đặt dependencies (chỉ cần chạy 1 lần)
npm install

# Chạy tất cả tests
npm test

# Chạy tests ở chế độ watch (tự động chạy lại khi có thay đổi)
npm run test:watch
```

### 🔄 Cập Nhật Thư Mục Build (dist)

Sau khi bạn thực hiện các thay đổi trong code (thư mục `js/`, `css/`, v.v.), bạn cần cập nhật thư mục `dist/` để các thay đổi này có hiệu lực khi deploy hoặc chạy từ bản build:

**Sử dụng npm (Khuyên dùng):**
```bash
npm run build
```

**Hoặc chạy trực tiếp script PowerShell:**
```powershell
.\build.ps1
```

Script này sẽ:
1. Xóa thư mục `dist/` cũ.
2. Tạo cấu trúc thư mục mới.
3. Copy các file `index.html`, `css/` và toàn bộ logic game từ `js/` (loại bỏ các file test).

### 🚀 Deploy Lên Wavedash

Wavedash là nền tảng hosting game HTML5 miễn phí. Để deploy game lên Wavedash:

#### Bước 1: Cài Đặt Wavedash CLI
```bash
# Cài đặt Wavedash CLI toàn cục
npm install -g wavedash
```

#### Bước 2: Đăng Nhập Wavedash
```bash
# Đăng nhập vào tài khoản Wavedash của bạn
wavedash login
```

#### Bước 3: Build Game
Chạy script build để tạo thư mục `dist/` chứa các file game (không bao gồm tests và node_modules):

**Trên Windows (PowerShell):**
```powershell
.\build.ps1
```

**Trên Linux/Mac:**
```bash
# Tạo script build.sh tương tự hoặc chạy thủ công:
mkdir -p dist/css dist/js
cp index.html dist/
cp css/style.css dist/css/
cp js/*.js dist/js/ --exclude="*.test.js" --exclude="*.integration.test.js"
```

#### Bước 4: Deploy
```bash
# Deploy game lên Wavedash
wavedash deploy
```

Wavedash sẽ:
- Đọc cấu hình từ `wavedash.toml`
- Upload các file trong thư mục `dist/`
- Cung cấp URL để chơi game online

#### Cấu Hình Wavedash
File `wavedash.toml` chứa cấu hình deploy:
```toml
game_id = "j974v1beb094kvdcrnbkv5y4s585938v"  # ID game của bạn
upload_dir = "dist"                            # Thư mục chứa file build
entrypoint = "index.html"                      # File khởi đầu
```

#### Lưu Ý Khi Deploy
- ✅ Chỉ các file trong `dist/` được upload (không có tests, node_modules)
- ✅ Game ID đã được cấu hình sẵn trong `wavedash.toml`
- ✅ Luôn chạy `build.ps1` trước khi deploy để đảm bảo `dist/` được cập nhật
- ⚠️ Nếu bạn thay đổi code, nhớ build lại trước khi deploy

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

## 🛠️ Cơ Chế Trò Chơi Cơ Bản

- **Lên dây cót:** Thế giới xung quanh bạn đã ngừng hoạt động. Bạn phải sử dụng chìa khóa của mình để nạp năng lượng cho các nền tảng di động, quạt gió, thang máy và các thiết bị khác.
- **Thanh năng lượng (Gauge):** Việc lên dây cót sẽ tiêu tốn năng lượng. Hãy quản lý tài nguyên của bạn thật tốt để không bị mắc kẹt.
- **Thu thập bánh răng:** Mỗi màn có các bánh răng cần thu thập để mở cửa thoát.
- **Vượt chướng ngại vật:** Sử dụng sự khéo léo và tư duy logic để kích hoạt các cỗ máy đúng lúc, tạo lối đi tới đích.

---

## 🎭 8 Loại Bẫy Troll

### 1. **Trigger Tiles (Ô Kích Hoạt Ẩn)**
- **Cách hoạt động:** Ô sàn vô hình kích hoạt chướng ngại vật khi bạn bước lên
- **Âm thanh:** Tiếng "kích hoạt" khi bẫy được kích hoạt
- **Lời chế giễu khi chết:** "YOU TRIGGERED THAT.", "WATCH YOUR STEP."

### 2. **FAKE_SAFE_ZONE (Vùng An Toàn Giả)**
- **Cách hoạt động:** Khu vực trông an toàn nhưng chướng ngại vật sẽ lao vào sau 1-2 giây
- **Đặc điểm:** Trông giống hệt vùng an toàn thật
- **Lời chế giễu:** "THAT WASN'T SAFE.", "NOWHERE IS SAFE.", "THE SAFE ZONE LIED."

### 3. **TROLL_TOKEN (Bánh Răng Bẫy)**
Có 3 loại phụ:

#### a) ONE_WAY_PRISON (Nhà Tù Một Chiều)
- **Cách hoạt động:** Khi nhặt bánh răng, chướng ngại vật chặn đường quay lại
- **Hiệu ứng:** Bạn bị mắc kẹt, không thể quay đầu

#### b) RUSH_BAIT (Mồi Nhử Tốc Độ)
- **Cách hoạt động:** Khi nhặt bánh răng, tốc độ chướng ngại vật tăng 30-40%
- **Hiệu ứng:** Mọi thứ di chuyển nhanh hơn đột ngột

#### c) WIND_TRAP (Bẫy Sinh Quái)
- **Cách hoạt động:** Khi nhặt bánh răng, sinh thêm chướng ngại vật gần bạn
- **Hiệu ứng:** Quả bóng hoặc vật thể nguy hiểm xuất hiện bất ngờ

**Lời chế giễu chung:** "GREED KILLS.", "SHOULD'VE LEFT IT.", "THAT WAS A TRAP. OBVIOUSLY."

**UI đặc biệt:** Liar Counter (Bộ đếm nói dối) - Hiển thị số bánh răng sai trong 0.5 giây

### 4. **HIDDEN_KILL_GEAR (Bánh Răng Giết Người Ẩn)**
- **Cách hoạt động:** Giữa nhiều bánh răng trang trí, có 1 cái có hitbox gây chết
- **Âm thanh:** Tiếng "hum" nhỏ khi ở gần (càng gần càng to)
- **Đặc điểm:** Trông giống hệt bánh răng trang trí bình thường
- **Lời chế giễu:** "THAT ONE WAS REAL.", "NOT ALL GEARS ARE DECORATIVE.", "TRUST NOTHING."

### 5. **BAIT_PATH (Đường Mồi Nhử)**
- **Cách hoạt động:** Đường rộng trông dễ đi nhưng có NHIỀU chướng ngại vật hơn đường hẹp
- **Tâm lý:** Người chơi thường chọn đường rộng vì nghĩ nó an toàn hơn
- **Lời chế giễu:** "THE EASY PATH IS NEVER EASY.", "WIDE ROADS, NARROW CHANCES."

### 6. **ONE_FRAME_WINDOW (Cửa Sổ Một Khung Hình)**
- **Cách hoạt động:** Khoảng trống giữa các piston/pendulum chỉ có 0.1 giây hoặc ít hơn
- **Đặc điểm:** Có thể vượt qua được nhưng cần timing cực kỳ chính xác
- **Xuất hiện:** Chủ yếu ở Level 5 (HEART OF THE MACHINE)

### 7. **PHASE_SHIFT_OBSTACLE (Chướng Ngại Vật Dịch Pha)**
- **Cách hoạt động:** Tốc độ tăng 10% sau mỗi 3 lần chết
- **Đặc điểm:** Sự thay đổi rất tinh tế, khó nhận ra
- **Reset:** Tốc độ trở về bình thường khi reload màn
- **Xuất hiện:** Level 3, 4, 5

### 8. **ALMOST_MOMENT (Khoảnh Khắc Gần Thành Công)**
- **Cách hoạt động:** Khi nhặt bánh răng cuối cùng, chướng ngại vật chặn lối thoát
- **Âm thanh:** Tiếng "buzz" giả mạo của cửa thoát
- **Tâm lý:** Tạo căng thẳng ở thời điểm sắp chiến thắng
- **Lời chế giễu:** "SO CLOSE.", "VICTORY WAS RIGHT THERE.", "ALMOST DOESN'T COUNT."

### 9. **MIRROR_CORRIDOR (Hành Lang Gương)**
- **Cách hoạt động:** Hai chướng ngại vật trông đối xứng nhưng có độ lệch pha (phase offset)
- **Đặc điểm:** Chuyển động trông giống nhau nhưng timing khác nhau
- **Tâm lý:** Người chơi nghĩ chúng đồng bộ và dự đoán sai
- **Xuất hiện:** Level 2, 3, 4, 5

---

## 🗺️ Các Màn Chơi

### Level 1: FIRST TOCK (Giới Thiệu)
- **Mục đích:** Giới thiệu 4 loại bẫy cơ bản + ALMOST_MOMENT
- **Bẫy:** Fake Safe Zone, Troll Token (RUSH_BAIT), Hidden Kill Gear, Bait Path
- **Độ khó:** Nhẹ nhàng, dạy người chơi không tin vào vẻ ngoài

### Level 2: THE CAROUSEL (Lừa Dối Mẫu Hình)
- **Mục đích:** Thêm Mirror Corridor
- **Bẫy:** Tất cả bẫy Level 1 + Mirror Corridor với orbit spheres
- **Độ khó:** Khai thác khả năng nhận dạng mẫu hình của người chơi

### Level 3: THE SENTINEL (Độ Khó Động)
- **Mục đích:** Thêm Phase Shift Obstacle
- **Bẫy:** Tất cả bẫy Level 2 + Pendulum tăng tốc theo số lần chết
- **Độ khó:** Người chơi phải thích nghi với tốc độ thay đổi

### Level 4: THE CLOCK TOWER (Troll Dọc)
- **Mục đích:** Bẫy trong môi trường có trọng lực và leo trèo
- **Bẫy:** Tất cả bẫy Level 3 trong bố cục dọc
- **Độ khó:** Bẫy khai thác sự tập trung của người chơi vào việc leo

### Level 5: HEART OF THE MACHINE (Thử Thách Tối Thượng)
- **Mục đích:** Tất cả 8 loại bẫy kết hợp
- **Bẫy:** Bao gồm One Frame Window, nhiều Phase Shift, nhiều Mirror Corridor
- **Độ khó:** Cần thành thạo tất cả bài học trước đó
- **Đặc biệt:** Puzzle chuỗi với nhiều bẫy gây nhiễu tư duy

---

## � Hệ Thống Âm Thanh

Game sử dụng âm thanh để cung cấp manh mối tinh tế:

- **Piston Clunk:** Tiếng "clunk" khi piston di chuyển (giúp đếm timing)
- **Hidden Gear Hum:** Tiếng "hum" nhỏ khi gần bánh răng giết người (âm lượng tăng khi đến gần)
- **Trigger Activate:** Tiếng "activate" khi bẫy được kích hoạt
- **Fake Exit Buzz:** Tiếng "buzz" giả khi Almost Moment kích hoạt

**Lưu ý:** Âm thanh là manh mối quan trọng. Hãy bật âm thanh khi chơi!

---

## 💀 Hệ Thống Chết & Lời Chế Giễu

Mỗi loại bẫy có bộ lời chế giễu riêng khi bạn chết:

- **Fake Safe Zone:** "THAT WASN'T SAFE.", "NOWHERE IS SAFE."
- **Troll Token:** "GREED KILLS.", "SHOULD'VE LEFT IT."
- **Hidden Kill Gear:** "THAT ONE WAS REAL.", "TRUST NOTHING."
- **Bait Path:** "THE EASY PATH IS NEVER EASY.", "YOU CHOSE POORLY."
- **Almost Moment:** "SO CLOSE.", "VICTORY WAS RIGHT THERE."

Lời chế giễu giúp bạn hiểu **TẠI SAO** bạn chết, nhưng chỉ sau khi đã chết!

---

## 🧪 Kiểm Thử & Tính Đúng Đắn

Game được phát triển với phương pháp **Property-Based Testing** để đảm bảo tính đúng đắn:

### Chạy Tests
```bash
npm test
```

### Các Property Được Kiểm Tra

1. **Trigger Tile Collision Detection** - Phát hiện va chạm chính xác
2. **Fake Safe Zone Timing** - Độ trễ kích hoạt đúng thời gian
3. **Obstacle Behavior Preservation** - Chướng ngại vật giữ nguyên hành vi
4. **Troll Token Trap Activation** - Kích hoạt bẫy đúng loại
5. **Hidden Kill Gear Collision** - Va chạm và gây chết chính xác
6. **Distance-Based Volume** - Âm lượng tính theo khoảng cách
7. **Bait Path Obstacle Density** - Đường rộng có nhiều chướng ngại vật hơn
8. **One Frame Window Synchronization** - Đồng bộ timing chính xác
9. **Phase Shift Speed Calculation** - Tính tốc độ tăng đúng công thức
10. **Phase Shift Reset** - Reset tốc độ khi reload
11. **Almost Moment Activation** - Kích hoạt khi nhặt bánh răng cuối
12. **Mirror Corridor Symmetry** - Đối xứng vị trí chính xác
13. **Mirror Corridor Phase Offset** - Độ lệch pha đúng giá trị
14. **Trap-Specific Taunt Selection** - Chọn lời chế giễu đúng loại bẫy
15. **Liar Counter Timer** - Đếm ngược 0.5 giây chính xác
16. **Liar Counter Lie Calculation** - Hiển thị số sai ±1
17. **Proximity Trigger Activation** - Kích hoạt theo khoảng cách

**Tổng cộng:** 266 tests đảm bảo game hoạt động đúng!

---

## 📁 Cấu Trúc Thư Mục

```
broken-clockwork/
├── index.html              # Điểm bắt đầu
├── css/
│   └── style.css          # Giao diện
├── js/
│   ├── main.js            # Vòng lặp game chính
│   ├── input.js           # Xử lý bàn phím
│   ├── constants.js       # Cấu hình game
│   ├── player.js          # Logic nhân vật
│   ├── physics.js         # Vật lý (trọng lực, va chạm)
│   ├── draw.js            # Render đồ họa
│   ├── ui.js              # Giao diện người dùng
│   ├── audio.js           # Hệ thống âm thanh
│   ├── levels.js          # Cấu hình 5 màn chơi
│   ├── deathSystem.js     # Hệ thống chết & lời chế giễu
│   ├── trapSystem.js      # 8 loại bẫy troll
│   ├── liarCounter.js     # UI đếm bánh răng nói dối
│   ├── PhaseShiftObstacle.js    # Chướng ngại vật tăng tốc
│   ├── AutonomousObstacle.js    # Chướng ngại vật tự động
│   ├── WindableObject.js        # Vật thể lên dây cót
│   └── *.test.js          # Các file test
├── .kiro/
│   └── specs/
│       └── troll-level-redesign/  # Tài liệu thiết kế
│           ├── requirements.md     # Yêu cầu tính năng
│           ├── design.md          # Thiết kế chi tiết
│           └── tasks.md           # Kế hoạch triển khai
└── package.json           # Dependencies & scripts
```

---

## 🎓 Mẹo Chơi Game

1. **Không tin vào vẻ ngoài:** Khu vực trông an toàn có thể là bẫy
2. **Lắng nghe âm thanh:** Tiếng "hum" cảnh báo bánh răng nguy hiểm
3. **Đường hẹp có thể an toàn hơn:** Đừng luôn chọn đường rộng
4. **Đếm số lần chết:** Sau mỗi 3 lần chết, chướng ngại vật có thể nhanh hơn
5. **Quan sát kỹ sau khi chết:** Lời chế giễu và replay giúp bạn hiểu bẫy
6. **Cẩn thận với bánh răng cuối:** Có thể kích hoạt bẫy Almost Moment
7. **Đối xứng không có nghĩa là đồng bộ:** Mirror Corridor có độ lệch pha
8. **Bánh răng trang trí có thể giết bạn:** Nghe tiếng "hum" để phát hiện

---

## 🛠️ Phát Triển & Đóng Góp

### Cài Đặt Dependencies
```bash
npm install
```

### Chạy Tests
```bash
npm test              # Chạy tất cả tests
npm test -- --watch   # Chạy tests ở chế độ watch
```

### Cấu Trúc Test
- **Unit Tests:** Kiểm tra từng component riêng lẻ
- **Integration Tests:** Kiểm tra tương tác giữa các hệ thống
- **Property-Based Tests:** Kiểm tra tính đúng đắn với 100+ test cases ngẫu nhiên

### Thêm Màn Chơi Mới
1. Mở `js/levels.js`
2. Thêm cấu hình màn mới với các bẫy
3. Tham khảo Level 1-5 để biết cấu trúc
4. Viết integration test trong `js/levelX.integration.test.js`

### Thêm Loại Bẫy Mới
1. Thêm class mới vào `js/trapSystem.js`
2. Thêm property test để kiểm tra tính đúng đắn
3. Thêm lời chế giễu vào `js/deathSystem.js`
4. Thêm âm thanh (nếu cần) vào `js/audio.js`
5. Cập nhật tài liệu trong README

---

## 📚 Tài Liệu Thiết Kế

Chi tiết về thiết kế và triển khai có trong thư mục `.kiro/specs/troll-level-redesign/`:

- **requirements.md:** 20 yêu cầu chức năng với acceptance criteria
- **design.md:** Kiến trúc hệ thống, data models, 17 correctness properties
- **tasks.md:** 25 tasks triển khai (đã hoàn thành 100%)

---

## 🏆 Thành Tựu

- ✅ 266 tests passed
- ✅ 17 correctness properties validated
- ✅ 8 trap types implemented
- ✅ 5 levels redesigned
- ✅ Property-based testing methodology
- ✅ Trap-specific death taunts
- ✅ Audio cue system
- ✅ Liar Counter UI

---

Chúc bạn có những giây phút trải nghiệm thú vị (và bực bội) với **BROKEN CLOCKWORK**! 🕰️✨

*"The trap must be VISIBLE in hindsight. Player dies and immediately understands why — but never saw it coming the first time."*
