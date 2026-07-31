# Deploy AI Voice LINE Announcer ด้วย Koyeb + Supabase

ระบบใช้ Koyeb รันเว็บไซต์และ LINE Webhook ส่วน Supabase เก็บไฟล์เสียง Activity Logs
และ Event ID สำหรับป้องกันการประกาศซ้ำ คีย์ลับทั้งหมดเก็บใน Koyeb Environment Variables

> ห้ามนำค่าคีย์จริงใส่ `.env`, GitHub หรือโค้ดฝั่ง Browser

## 1. สร้าง Supabase Project

สร้าง Project ใหม่ชื่อ `ai-voice-line-announcer` และเลือก Region ใกล้ประเทศไทย
จากนั้นเปิด SQL Editor แล้วรันไฟล์:

```text
supabase/migrations/20260729000000_line_announcer_storage.sql
```

ไฟล์นี้จะสร้าง:

- `line_webhook_logs`
- `line_webhook_events`
- Storage bucket `line-audio`
- RLS และการปิดสิทธิ์อ่าน/เขียนตารางจาก `anon` และ `authenticated`

Bucket เปิดอ่านสาธารณะเฉพาะไฟล์เสียง เพราะ LINE ต้องดาวน์โหลดไฟล์ผ่าน HTTPS
แต่การอัปโหลดและลบไฟล์ทำได้เฉพาะ Backend ที่ใช้ Service Role

## 2. เตรียมค่าตั้งค่า

เก็บค่าต่อไปนี้ไว้สำหรับใส่ใน Koyeb:

```text
GEMINI_API_KEY
LINE_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET
ADMIN_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_AUDIO_BUCKET=line-audio
NODE_ENV=production
PORT=8080
```

สร้าง `ADMIN_API_KEY` เป็นข้อความสุ่มยาวอย่างน้อย 32 ตัวอักษร ห้ามใช้รหัสผ่านทั่วไป
และห้ามนำ `SUPABASE_SERVICE_ROLE_KEY` ไปใส่ใน Frontend

## 3. Deploy บน Koyeb

1. เข้า Koyeb และเลือก **Create Web Service**
2. เลือก GitHub Repository `aodxx/ai-voice-line-announcer`
3. เลือก Branch ที่ต้องการ Deploy
4. เลือก Builder แบบ **Dockerfile**
5. ตั้ง Exposed port เป็น `8080` และ Health check path เป็น `/healthz`
6. เพิ่ม Environment Variables จากหัวข้อก่อนหน้า
7. กด Deploy และรอจนสถานะ Healthy
8. คัดลอก Public URL ของบริการ แล้วเพิ่ม:

```text
APP_URL=https://ชื่อบริการของคุณ.koyeb.app
```

จากนั้น Redeploy หนึ่งครั้ง และเปิด:

```text
https://ชื่อบริการของคุณ.koyeb.app/healthz
```

ควรได้ `{"ok":true}`

## 4. เชื่อมต่อ LINE

1. เข้า LINE Developers Console และเลือก Messaging API Channel
2. ตั้ง Webhook URL เป็น `https://ชื่อบริการของคุณ.koyeb.app/api/line/webhook`
3. กด Verify และเปิด **Use webhook**
4. เปิด **Allow bot to join group chats**
5. เชิญ Official Account เข้ากลุ่ม
6. พิมพ์ `@แจ้งข่าว ตามด้วยเนื้อหาประกาศ`

ระบบตอบกลับเฉพาะข้อความที่ขึ้นต้นด้วย `@แจ้งข่าว` และส่งกลับไปยัง Group/Room/User
ต้นทางเดียวกัน

## 5. ทดสอบจริง

เปิดหน้าเว็บ Koyeb URL แล้วใส่ `ADMIN_API_KEY` ในหน้า LINE Bot Portal จากนั้น:

1. กดทดสอบ Channel Access Token
2. ส่ง Simulator หนึ่งครั้ง
3. ตรวจว่า Supabase Storage มีไฟล์ `.m4a`
4. ตรวจว่า `line_webhook_logs` มีข้อมูล
5. ส่งข้อความจริงในกลุ่ม: `@แจ้งข่าว พรุ่งนี้เวลา 10 นาฬิกา ขอเชิญสมาชิกประชุม`
6. ตรวจว่า LINE ได้ Audio Message และ Flex Message เพียงหนึ่งชุด

## หมายเหตุด้านการทำงาน

- Endpoint Webhook เป็น public ตามข้อกำหนดของ LINE แต่จะประมวลผลเฉพาะ request
  ที่ลายเซ็นถูกต้อง
- Endpoint ตั้งค่า, Logs, Simulator และตรวจ Token ต้องมี header `x-admin-key`
- Koyeb ต้องรัน Container ที่มี FFmpeg ซึ่ง `Dockerfile` เตรียมไว้แล้ว
- ถ้า LINE ส่ง Event เดิมซ้ำ Primary Key ใน Supabase จะกันไม่ให้สร้างและส่งเสียงซ้ำ
- ควรลบไฟล์เสียงเก่าและ Event ที่หมดอายุเป็นระยะเพื่อควบคุมพื้นที่ Free Tier
