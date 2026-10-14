# PRD: VibeSpeak — Luyện Nói & Kỹ Năng

## 1. Tên sản phẩm
VibeSpeak — Luyện Nói & Kỹ Năng

## 2. Mục tiêu & đối tượng
- Đối tượng: Người lớn tự học tiếng Anh, muốn cải thiện giao tiếp và kỹ năng nghề nghiệp (phỏng vấn, thuyết trình, email).
- Mục tiêu: Ứng dụng web đơn giản, giao diện đẹp, ấn tượng, tập trung vào luyện nói và kiểm tra kiến thức nhanh (MCQ + đọc aloud). Triển khai nhanh trên Vibe Host bằng một file HTML/CSS/JS.

## 3. Điểm khác biệt (Unique Selling Points)
- Kết hợp trắc nghiệm kiến thức + bài đọc aloud (ghi âm) trong cùng một bài luyện.
- Chấm điểm phát âm tức thì trên trình duyệt (không cần upload) bằng Web Speech API + phân tích âm lượng để có điểm tương đối đáng tin cậy.
- Thiết kế "bài luyện ngày" (daily practice) nâng dần độ khó — tạo thói quen, chuỗi (streak) và xếp hạng (leaderboard).
- Giao diện hiện đại, tương phản, animation mượt, tối ưu cho desktop & mobile.
- MVP đơn giản: chạy hoàn toàn client-side (localStorage) để dễ triển khai; mở rộng lên backend nếu cần leaderboard toàn cầu và lưu file audio.

## 4. MVP Scope
- One-page app (index.html) hiển thị:
  - Đăng nhập tên (local).
  - Bài luyện 20 câu MCQ + mỗi câu có target sentence để đọc.
  - Ghi âm phát âm, playback.
  - Tự động chấm điểm MCQ + chấm "phát âm" bằng bản chấm client-side.
  - Lưu kết quả, streak, leaderboard cục bộ (localStorage).
  - Nút "Nghe mẫu" dùng SpeechSynthesis.

## 5. Chức năng chi tiết
- Landing / Login tên người dùng.
- Bắt đầu bài luyện (20 câu).
- Mỗi câu:
  - Hiện câu hỏi + 4 lựa chọn (MCQ).
  - Khi chọn, hiện đáp án đúng/sai.
  - Hiển thị câu mẫu để đọc (target sentence).
  - Nút Record / Stop / Play.
  - Tự động nhận dạng câu nói (SpeechRecognition) và hiển thị transcript.
  - Hiển thị điểm phát âm (0–100) và phân tích (tỉ lệ từ đúng, mức âm).
- Sau bài: tổng hợp điểm MCQ, điểm phát âm, tổng điểm, cập nhật streak, hiển thị leaderboard cục bộ.
- Lưu lịch sử attempt (ngày, điểm).
- Settings: reset data, chỉnh sensitivity mic (nếu cần).

## 6. Tech stack (MVP)
- Frontend: HTML / CSS / JavaScript (vanilla).
- Browser APIs:
  - getUserMedia + MediaRecorder (ghi âm & playback).
  - Web Speech API (SpeechRecognition) — để chuyển lời nói thành transcript.
  - SpeechSynthesis — phát mẫu.
  - Web Audio API AnalyserNode — đo mức âm lượng để ước tính clarity.
- Storage: localStorage (MVP). Optional: REST API + DB nếu cần lưu global leaderboard.
- Hosting: Vibe Host (chỉ upload index.html).

## 7. Database Schema (đề xuất server-side)
- users
  - id (uuid), name, email, created_at, last_active
- questions
  - id, text, options (json), correct_option, target_sentence, difficulty
- attempts
  - id, user_id, date, mcq_score, speaking_scores (json per question), total_score
- recordings
  - id, attempt_id, question_id, file_url, duration, transcript, score
- leaderboard (materialized)
  - user_id, best_score, streak, last_active

MVP localStorage keys:
- user: {name, id}
- questions: [ ... ]
- attempts: [ {date, total, details} ]
- leaderboard: derived from attempts

## 8. Workflow người dùng
1. Người dùng vào trang, nhập tên.
2. Bấm "Start daily test" → hiển thị câu 1.
3. Người dùng trả lời MCQ → nhận feedback.
4. Người dùng nghe mẫu (nếu muốn) → bấm Record → đọc target sentence → Stop.
5. Ứng dụng chạy SpeechRecognition (song song) và ghi âm bằng MediaRecorder; tính điểm phát âm từ transcript và mức âm.
6. Hiển thị điểm, lưu attempt, cập nhật streak.
7. Sau 20 câu, hiển thị tổng kết + xếp hạng.
8. Người dùng có thể xem lịch sử/đổi tên/reset.

## 9. Acceptance Criteria (mốc chấm)
- Có 20 câu MCQ + target sentences.
- Ghi âm và phát lại hoạt động trên Chrome/Edge (Web Speech API có thể hạn chế trên Safari).
- SpeechRecognition trả transcript; app tính điểm phát âm hiển thị rõ ràng.
- Streak được lưu và cập nhật đúng khi người dùng luyện hàng ngày.
- UI responsive, sạch, deploy được bằng upload index.html lên Vibe Host.

## 10. Kế hoạch triển khai (2 tuần MVP)
- Ngày 1–2: Thiết kế UI / chuẩn bị câu hỏi.
- Ngày 3–5: Lập trình core quiz + MCQ logic + localStorage.
- Ngày 6–8: Thêm ghi âm, playback, SpeechRecognition, scoring.
- Ngày 9–11: UX polish, animations, leaderboard, streak logic.
- Ngày 12–14: Test cross-browser, chỉnh lỗi, deploy lên Vibe Host.

## 11. Mở rộng sau MVP
- Backend + storage audio, global leaderboard.
- Tích hợp pronunciation scoring service (Google/DeepSpeech/3rd-party) để có điểm chính xác hơn.
- Thống kê tiến bộ theo tuần/tháng, bài học đề xuất.
