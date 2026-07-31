# AI Voice LINE Announcer — Firebase & Google Cloud Architecture Plan

## เป้าหมาย

ปรับระบบให้พร้อมใช้งานจริง โดยใช้ Firebase และ Google Cloud เป็นโครงสร้างหลักสำหรับรับคำสั่งจาก LINE กลุ่ม สังเคราะห์เสียง จัดเก็บไฟล์ และบริหารผู้ใช้งานผ่านเว็บแอดมิน

## สถาปัตยกรรมเป้าหมาย

```text
LINE Group
  -> LINE Messaging API Webhook
  -> Google Cloud Run (Express API)
  -> Verify X-Line-Signature
  -> Firestore event lock / history
  -> Gemini API or Google Cloud Text-to-Speech
  -> FFmpeg conversion
  -> Cloud Storage audio bucket
  -> LINE Reply API
  -> Firebase Hosting Admin Web
```

## การแบ่งหน้าที่ของบริการ

### Firebase

- Firebase Authentication: เข้าสู่ระบบหน้าแอดมิน
- Cloud Firestore: ประวัติข้อความ งานสังเคราะห์เสียง การตั้งค่าทั่วไป และสิทธิ์ผู้ใช้
- Firebase Hosting: เผยแพร่หน้าเว็บแอดมิน
- Firebase App Check: ลดการเรียก API จากไคลเอนต์ที่ไม่ได้รับอนุญาต

### Google Cloud

- Cloud Run: LINE Webhook และ Backend API
- Secret Manager: LINE Channel Secret, Access Token, Gemini API Key และคีย์บริการอื่น
- Cloud Storage: เก็บไฟล์เสียงและไฟล์ประกอบ
- Artifact Registry: เก็บ Docker image
- Cloud Build: Build และ Deploy
- Cloud Logging / Error Reporting: ตรวจสอบข้อผิดพลาด
- Gemini API หรือ Vertex AI: เรียบเรียงข้อความและสร้างเสียง
- Cloud Scheduler: งานดูแลระบบตามเวลา หากจำเป็น

## หลักการสำคัญ

1. ห้ามเก็บ LINE Token หรือ Secret ในหน้าเว็บ, Firestore หรือ GitHub
2. Backend อ่าน Secret จาก Google Secret Manager เท่านั้น
3. ตรวจสอบ LINE signature จาก raw request body ก่อนอ่าน event
4. ใช้ event ID ป้องกัน webhook ซ้ำ
5. เก็บไฟล์เสียงใน Cloud Storage ไม่เก็บบน local filesystem ของ Cloud Run
6. จำกัดสิทธิ์ Service Account ตาม Least Privilege
7. หน้าแอดมินเรียก API ผ่าน Firebase ID Token
8. แยก development และ production environment

## Firestore Collections

### users/{uid}

- displayName
- email
- role: admin | operator | viewer
- active
- createdAt
- updatedAt

### announcements/{announcementId}

- source: line | admin
- sourceType: group | room | user | dashboard
- sourceIdHash
- originalText
- processedText
- status: received | processing | completed | failed
- voice
- provider
- audioStoragePath
- audioPublicUrl
- durationMs
- lineEventId
- errorCode
- errorMessage
- createdAt
- completedAt

### lineEvents/{eventId}

- eventId
- receivedAt
- processedAt
- status
- announcementId
- expiresAt

### appSettings/general

- commandPrefix
- defaultVoice
- defaultProvider
- enabled
- maxTextLength
- updatedAt
- updatedBy

### auditLogs/{logId}

- userId
- action
- targetType
- targetId
- metadata
- createdAt

## Cloud Storage Structure

```text
audio/
  yyyy/
    mm/
      announcement-id/
        original.wav
        line.m4a
        metadata.json
```

ไฟล์ควรเป็น private โดยค่าเริ่มต้น และสร้าง Signed URL เมื่อจำเป็น

## API Routes

### Public LINE endpoint

- POST /api/line/webhook

### Authenticated Admin API

- GET /api/health
- GET /api/announcements
- GET /api/announcements/:id
- POST /api/announcements/generate
- POST /api/announcements/:id/retry
- DELETE /api/announcements/:id
- GET /api/settings
- PUT /api/settings

## Environment Secrets

- LINE_CHANNEL_SECRET
- LINE_CHANNEL_ACCESS_TOKEN
- GEMINI_API_KEY
- ADMIN_API_KEY (temporary migration only)
- AUDIO_BUCKET
- FIREBASE_PROJECT_ID
- GOOGLE_CLOUD_PROJECT

## แผนการพัฒนา

### Phase 1 — Foundation & Security

- สร้าง Firebase project / ตรวจ project ปัจจุบัน
- เปิด Firebase Authentication และ Firestore
- สร้าง Cloud Storage bucket
- สร้าง Secret Manager secrets
- ปรับ Backend ไม่ให้บันทึก token ลงไฟล์
- เพิ่ม environment validation
- เพิ่ม health endpoint

ผลลัพธ์: Backend พร้อม deploy อย่างปลอดภัย

### Phase 2 — LINE Webhook Production

- ปรับ webhook ให้ใช้ raw body อย่างถูกต้อง
- ตรวจ LINE signature
- รองรับ Verify ที่ events ว่าง
- ป้องกัน event ซ้ำด้วย Firestore transaction
- รองรับ group, room และ user message
- บันทึก announcement status

ผลลัพธ์: LINE Verify สำเร็จและรับ @แจ้งข่าว ได้จริง

### Phase 3 — Audio Pipeline

- แยก service สังเคราะห์ข้อความและเสียง
- รองรับ Gemini / Google TTS provider
- แปลง WAV เป็น M4A/AAC สำหรับ LINE
- อัปโหลด Cloud Storage
- ตรวจ duration และขนาดไฟล์
- ส่ง Audio Message และ Flex Message กลับห้องเดิม

ผลลัพธ์: พิมพ์ @แจ้งข่าว แล้วได้รับเสียงตอบกลับ

### Phase 4 — Firebase Admin Dashboard

- Firebase Authentication
- Role-based access
- ประวัติประกาศ
- เล่น ดาวน์โหลด และสร้างเสียงใหม่
- ตั้งค่า command prefix และเสียงเริ่มต้น
- แสดงสถานะและ error logs

ผลลัพธ์: จัดการระบบผ่านเว็บได้

### Phase 5 — Google Drive Export

- เพิ่ม Google OAuth authorization code flow
- ใช้ scope drive.file
- เข้ารหัส refresh token ก่อนจัดเก็บ
- เลือกโฟลเดอร์ปลายทาง
- Export ไฟล์เสียงจาก Cloud Storage ไป Drive

ผลลัพธ์: ผู้ใช้ส่งสำเนาไฟล์ไป Google Drive ได้โดยสมัครใจ

### Phase 6 — Production Hardening

- Firebase App Check
- Rate limiting
- Structured logging
- Monitoring / alerting
- Retry และ dead-letter workflow
- Retention policy
- Backup และ disaster recovery
- Cost budget alerts

ผลลัพธ์: พร้อมใช้งานระยะยาว

## เกณฑ์เสร็จสมบูรณ์ขั้นต่ำ

- LINE Webhook Verify สำเร็จ
- คำสั่ง @แจ้งข่าว จากกลุ่มถูกประมวลผลหนึ่งครั้งต่อ event
- ได้เสียงที่ LINE รองรับและเล่นได้
- ประวัติถูกเก็บใน Firestore
- ไฟล์อยู่ใน Cloud Storage
- Token ทั้งหมดอยู่ใน Secret Manager
- หน้าแอดมินต้องล็อกอินก่อนใช้งาน
- ไม่มี secret ใน Git history หรือ browser bundle

## ลำดับดำเนินการถัดไป

1. ตรวจและปรับโค้ด Backend ปัจจุบันให้ใช้ Secret Manager/environment เท่านั้น
2. ลบการพึ่งพา local JSON และ local audio directory สำหรับ production
3. สร้าง Firestore repository layer
4. สร้าง Cloud Storage audio repository
5. เพิ่ม Firebase ID token middleware สำหรับ Admin API
6. สร้าง deployment configuration สำหรับ Cloud Run และ Firebase Hosting
