# AI Voice LINE Announcer

AI Voice Studio ที่รับคำสั่ง `@แจ้งข่าว` จากกลุ่มหรือห้องแชท LINE แล้วใช้ Gemini
เรียบเรียงข้อความและสร้างเสียง ก่อนตอบกลับด้วย LINE Audio Message และ Flex Message

## การทำงานของ LINE Bot

1. LINE ส่ง Webhook มาที่ `/api/line/webhook`
2. Backend ตรวจ `X-Line-Signature` ด้วย Channel Secret
3. รับเฉพาะข้อความที่ขึ้นต้นด้วย `@แจ้งข่าว`
4. Gemini เรียบเรียงข้อความและสร้างเสียง
5. FFmpeg แปลง WAV เป็น M4A/AAC สำหรับ LINE
6. เก็บไฟล์เสียง ประวัติ และ Event ID ใน Supabase
7. ตอบกลับห้องเดิมด้วย Audio Message และ Flex Message

คำแนะนำการติดตั้งฉบับเต็มอยู่ที่ [KOYEB_SUPABASE_DEPLOYMENT.md](KOYEB_SUPABASE_DEPLOYMENT.md)

## พัฒนาในเครื่อง

```bash
cp .env.example .env
npm ci
npm run dev
```

ตรวจสอบก่อนเผยแพร่:

```bash
npm run lint
npm run build
```
