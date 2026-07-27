# ย้าย AI Voice LINE Announcer ไป Google Cloud Run

คู่มือนี้ใช้บริการ 4 ส่วน:

- Cloud Run: รันเว็บและ LINE Webhook
- Secret Manager: เก็บ Gemini key, LINE token/secret และ Admin API key
- Cloud Storage: เก็บไฟล์เสียงที่ LINE เปิดผ่าน HTTPS ได้
- Firestore: เก็บ Activity Logs และป้องกัน LINE Webhook เดิมทำงานซ้ำ

> อย่านำค่าคีย์จริงใส่ `.env`, GitHub หรือไฟล์ `cloudbuild.yaml`

## 1. เตรียม Google Cloud

ติดตั้ง `gcloud` และล็อกอิน จากนั้นกำหนดค่าต่อไปนี้ให้ตรงกับโปรเจกต์ของคุณ:

```bash
export PROJECT_ID="your-google-cloud-project-id"
export REGION="asia-southeast1"
export SERVICE="ai-voice-line-announcer"
export REPOSITORY="ai-voice-line-announcer"
export AUDIO_BUCKET="${PROJECT_ID}-line-audio"

gcloud config set project "$PROJECT_ID"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com

gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION"
```

สร้าง Firestore แบบ Native mode ใน Console โดยเลือก Location ที่เหมาะสมกับผู้ใช้
และ Cloud Run เช่น `asia-southeast1`

## 2. สร้าง Cloud Storage สำหรับเสียง

ไฟล์ต้องเปิดอ่านแบบสาธารณะ เพราะ LINE ต้องดาวน์โหลด Audio Message จาก URL โดยตรง
ใช้ bucket แยกสำหรับเสียงเท่านั้น และตั้งลบไฟล์อัตโนมัติหลัง 7 วัน:

```bash
gcloud storage buckets create "gs://${AUDIO_BUCKET}" \
  --location="$REGION" \
  --uniform-bucket-level-access

gcloud storage buckets add-iam-policy-binding "gs://${AUDIO_BUCKET}" \
  --member="allUsers" \
  --role="roles/storage.objectViewer"

gcloud storage buckets update "gs://${AUDIO_BUCKET}" \
  --lifecycle-file=deploy/storage-lifecycle.json
```

หากนโยบายองค์กรห้าม public bucket ต้องเปลี่ยนโค้ดไปใช้ signed URL หรือ CDN
ก่อนเปิดใช้งาน LINE Audio Message

## 3. สร้าง Secrets

สร้าง Secret ผ่าน Google Cloud Console หรือคำสั่งด้านล่าง โดยแทนค่าตัวอย่างด้วยค่าจริง:

```bash
printf '%s' 'GEMINI_KEY_VALUE' | gcloud secrets create gemini-api-key --data-file=-
printf '%s' 'LINE_ACCESS_TOKEN_VALUE' | gcloud secrets create line-channel-access-token --data-file=-
printf '%s' 'LINE_CHANNEL_SECRET_VALUE' | gcloud secrets create line-channel-secret --data-file=-
printf '%s' 'LONG_RANDOM_ADMIN_KEY' | gcloud secrets create admin-api-key --data-file=-
```

ถ้ามี Secret ชื่อนั้นอยู่แล้ว ให้เพิ่มเวอร์ชันด้วย:

```bash
printf '%s' 'NEW_VALUE' | gcloud secrets versions add SECRET_NAME --data-file=-
```

ให้ Service Account ของ Cloud Run อ่าน Secret และเขียน Storage/Firestore:

```bash
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user"
```

## 4. Build และ Deploy

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=${REGION},_SERVICE=${SERVICE},_REPOSITORY=${REPOSITORY},_AUDIO_BUCKET=${AUDIO_BUCKET}"
```

บัญชีที่ Cloud Build ใช้ต้องมีสิทธิ์ push ไป Artifact Registry, deploy Cloud Run
และ actAs Service Account ของ Cloud Run หากพบ `PERMISSION_DENIED` ให้ตรวจ IAM ของ
Cloud Build Service Account ใน Google Cloud Console

ดู URL หลัง deploy:

```bash
export SERVICE_URL="$(gcloud run services describe "$SERVICE" \
  --region="$REGION" \
  --format='value(status.url)')"
curl "${SERVICE_URL}/healthz"
```

ควรได้ผลลัพธ์ `{"ok":true}` จากนั้นเปิดหน้าเว็บ ใส่ค่า `ADMIN_API_KEY`
ในหน้า LINE Bot Portal เพื่อใช้หน้า Simulator และดู Logs

## 5. เชื่อมต่อ LINE

1. เข้า LINE Developers Console และเลือก Messaging API Channel
2. ตั้ง Webhook URL เป็น `${SERVICE_URL}/api/line/webhook`
3. กด Verify และเปิด **Use webhook**
4. เปิด **Allow bot to join group chats**
5. เชิญ Official Account เข้ากลุ่ม
6. พิมพ์ `@แจ้งข่าว ตามด้วยเนื้อหาประกาศ`

ระบบตอบกลับเฉพาะข้อความที่ขึ้นต้นด้วย `@แจ้งข่าว` และส่งกลับไปยัง Group/Room/User
ต้นทางเดียวกัน

## หมายเหตุด้านการทำงาน

- Endpoint Webhook เป็น public ตามข้อกำหนดของ LINE แต่จะประมวลผลเฉพาะ request
  ที่ลายเซ็นถูกต้อง
- Endpoint ตั้งค่า, Logs, Simulator และตรวจ Token ต้องมี header `x-admin-key`
- Cloud Run ใช้ `--no-cpu-throttling` เพื่อให้ขั้นตอนสร้างเสียงที่ทำหลังตอบรับ Webhook
  ทำงานต่อได้ ควรตรวจค่าใช้จ่ายตามปริมาณใช้งาน
- ตั้ง Firestore TTL policy ที่ field `expiresAt` ของ collection
  `line_webhook_events` เพื่อเก็บ Event deduplication 7 วันแล้วลบอัตโนมัติ
- ถ้า LINE ส่ง Event เดิมซ้ำ Firestore จะกันไม่ให้สร้างและส่งเสียงซ้ำ
