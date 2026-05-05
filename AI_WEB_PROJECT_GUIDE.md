# AI Web Project Guide

คู่มือนี้ใช้เป็น prompt/brief สำหรับให้ AI เริ่มสร้างโปรเจกต์เว็บใหม่ที่มี frontend, backend และ Docker ตั้งแต่ต้น โดยให้ AI ทำงานแบบอ่านบริบทก่อน ออกแบบโครงสร้างให้ชัด และส่งมอบโปรเจกต์ที่รันได้จริง

## เป้าหมายของโปรเจกต์

สร้างเว็บแอปที่มีองค์ประกอบหลักครบถ้วน:

- Frontend สำหรับหน้าเว็บและประสบการณ์ผู้ใช้
- Backend สำหรับ API, business logic และการเชื่อมต่อบริการภายนอก
- Docker สำหรับรันโปรเจกต์ซ้ำได้บนเครื่องอื่นหรือ server
- เอกสารวิธีรัน วิธีตั้งค่า และวิธี deploy ขั้นพื้นฐาน

## Prompt เริ่มต้นสำหรับ AI

คัดลอกข้อความนี้ไปใช้กับ AI ในโปรเจกต์ถัดไป:

```text
ช่วยสร้างโปรเจกต์เว็บใหม่ให้ครบทั้ง frontend, backend และ Docker

ความต้องการหลัก:
- Frontend ต้องเป็นหน้าเว็บที่ใช้งานได้จริง ไม่ใช่แค่ landing page เปล่า
- Backend ต้องมี API endpoints ที่ frontend เรียกใช้งานได้
- แยก config ที่เปลี่ยนตาม environment ออกเป็น environment variables
- มี Dockerfile และ docker-compose.yml สำหรับ build/run
- มี README.md อธิบายวิธีติดตั้ง รันแบบ local รันด้วย Docker และตัวอย่าง .env
- โค้ดต้องอ่านง่าย โครงสร้าง folder ชัดเจน และมี error handling พื้นฐาน

ก่อนเริ่มเขียนโค้ด:
1. อ่านไฟล์ในโปรเจกต์ก่อน ถ้ามีไฟล์เดิมอยู่แล้วให้รักษา pattern เดิมเท่าที่เหมาะสม
2. สรุป architecture สั้น ๆ ว่าจะมี service อะไรบ้าง
3. สร้างหรือแก้ไฟล์ให้โปรเจกต์รันได้จริง
4. ทดสอบคำสั่งที่สำคัญ เช่น install, start, build หรือ docker compose config ถ้าทำได้
5. สรุปไฟล์ที่สร้าง/แก้ และบอกวิธีรันสุดท้ายให้ชัดเจน
```

## โครงสร้างไฟล์ที่แนะนำ

เลือกโครงสร้างให้เหมาะกับเทคโนโลยีที่ใช้ แต่โดยทั่วไปควรมีไฟล์ประมาณนี้:

```text
project-name/
  public/
    index.html
    styles.css
    app.js
  src/
    server.js
    routes/
    services/
    config/
  .env.example
  .dockerignore
  Dockerfile
  docker-compose.yml
  package.json
  README.md
```

ถ้าเป็นโปรเจกต์ที่ใช้ framework เช่น React, Vue, Next.js หรือ SvelteKit ให้ AI ปรับโครงสร้างตาม framework นั้น แต่ยังต้องคงแนวคิดเดิมคือ frontend, backend, config, Docker และ docs ต้องครบ

## Frontend Checklist

- มีหน้าแรกที่ใช้งานได้จริงและแสดงข้อมูลจาก backend
- แยก HTML, CSS และ JavaScript หรือใช้ component structure ตาม framework
- รองรับ loading state, empty state และ error state
- ใช้ responsive layout สำหรับ desktop และ mobile
- ไม่ hardcode URL ของ backend ถ้าควรอ่านจาก config หรือใช้ relative path เช่น `/api/...`
- ตั้งชื่อปุ่ม label และข้อความบนหน้าจอให้สื่อความหมาย

## Backend Checklist

- มี health check endpoint เช่น `GET /health`
- มี API endpoint สำหรับข้อมูลหลักของแอป เช่น `GET /api/items`
- validate input จาก client ก่อนใช้งาน
- handle error ด้วย response ที่อ่านได้ เช่น `{ "error": "message" }`
- ใช้ environment variables สำหรับ port, API key, database URL หรือ secret
- ไม่ commit secret จริงลง repo
- แยก route/service/config เมื่อ logic เริ่มยาว

## Docker Checklist

ควรมีไฟล์เหล่านี้:

- `Dockerfile` สำหรับ build image ของแอป
- `docker-compose.yml` สำหรับรัน local แบบ container
- `.dockerignore` เพื่อลดขนาด build context
- `.env.example` เพื่อบอกตัวแปรที่ต้องตั้งค่า

ตัวอย่างหลักการที่ควรให้ AI ทำ:

- ใช้ base image ที่เหมาะสม เช่น `node:20-alpine`
- install dependencies ก่อน copy source ทั้งหมด เพื่อให้ Docker cache ทำงานดี
- expose เฉพาะ port ที่ต้องใช้
- ใช้ `CMD` หรือ entrypoint ที่ชัดเจน
- ถ้ามีหลาย service เช่น app + database ให้กำหนด network และ volume ใน compose

## Environment Variables ที่ควรมี

```text
NODE_ENV=development
PORT=3000
BACKEND_PORT=3001
API_BASE_URL=http://localhost:3001
DATABASE_URL=
API_KEY=
```

ปรับรายการนี้ตามโปรเจกต์จริง ถ้าไม่มี database หรือ external API ก็ไม่ต้องใส่ค่าที่ไม่ใช้

## README ที่ต้องมี

ให้ AI เขียน README.md อย่างน้อยตามหัวข้อนี้:

- ชื่อโปรเจกต์และคำอธิบายสั้น ๆ
- Tech stack
- Project structure
- Requirements เช่น Node.js version หรือ Docker version
- วิธีติดตั้ง dependencies
- วิธีรันแบบ local
- วิธีรันด้วย Docker
- รายการ environment variables
- API endpoints ที่สำคัญ
- Troubleshooting เบื้องต้น

## คำสั่งที่ควรทดสอบ

ขึ้นกับ stack ที่เลือก แต่สำหรับ Node.js project มักควรทดสอบ:

```sh
npm install
npm run start
npm run dev
docker compose config
docker compose up --build
```

ถ้ารันคำสั่งใดไม่ได้ ให้ AI บอกเหตุผลชัดเจน เช่น ขาด Docker daemon, port ถูกใช้แล้ว หรือไม่มี dependency บางตัว

## เกณฑ์งานเสร็จ

ถือว่าโปรเจกต์เริ่มต้นสมบูรณ์เมื่อ:

- เปิดหน้าเว็บได้
- frontend เรียก backend ได้
- backend มี endpoint สำคัญและ health check
- config สำคัญอยู่ใน `.env.example`
- build/run ด้วย Docker ได้ หรือมีคำอธิบายชัดเจนว่าติด blocker อะไร
- README มีวิธีใช้งานครบพอให้คนอื่น clone แล้วรันต่อได้

## ข้อกำชับสำหรับ AI

- อย่าใส่ secret จริงลงไฟล์
- อย่าสร้าง abstraction เยอะเกินจำเป็นในโปรเจกต์เริ่มต้น
- ถ้า repo มี pattern เดิม ให้ใช้ pattern เดิมก่อน
- ถ้าแก้ไฟล์เดิม ให้สรุปว่าแก้อะไรและทำไม
- ถ้ามี test อยู่แล้ว ให้รัน test หลังแก้
- ถ้าไม่มี test ให้ตรวจอย่างน้อยด้วยการรันคำสั่ง start/build ที่เกี่ยวข้อง
