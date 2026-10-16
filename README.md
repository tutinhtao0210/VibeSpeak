# PinkEnglish

Website học tiếng Anh: giao diện `index.html`, máy chủ `server.js` (REST API) và cơ sở dữ liệu SQLite.

## Chạy
Yêu cầu Node.js 22.5 trở lên (dùng `node:sqlite` có sẵn, không cần `npm install`).
Với Node từ 22.5 đến 22.12, chạy `node --experimental-sqlite server.js`.

    npm start            # http://localhost:3000   (biến môi trường: PORT, DB_FILE)

Lần chạy đầu tiên server tự tạo `pinkenglish.db`, chạy các file trong `migrations/` và nạp dữ liệu từ `seed.json`
(415 câu hỏi cố định có id ổn định, 68 từ vựng, 20 tình huống, 60 đoạn văn song ngữ).

## API chính (JSON)
| Nhóm | Endpoint |
|---|---|
| Nội dung | `GET /api/content`, `GET/POST/PUT/DELETE /api/questions[/:id]` |
| Đoạn văn | `GET /api/passages/next?user_id&tab=write\|read` (không lặp theo từng tab), `GET /api/passages/:id` |
| Người học | `POST /api/users`, `PATCH/DELETE /api/users/:id`, `GET /api/state`, `GET /api/leaderboard` |
| Kết quả | `/api/attempts`, `/api/answers`, `/api/days`, `/api/writings`, `/api/speeches`, `/api/notes` (đủ tạo, đọc, sửa, xóa) |
| Chống trùng | `POST/DELETE /api/seen`, `POST/DELETE /api/wrong` |
