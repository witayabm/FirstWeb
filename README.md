# Stock Dashboard

เว็บ Node.js แบบแยก frontend/static server และ backend API proxy สำหรับแสดง dashboard หุ้นจาก Financial Modeling Prep (FMP) พร้อม Yahoo Finance fallback เมื่อ FMP ใช้งานไม่ได้

## สิ่งที่มีในโปรเจกต์

- Frontend static server ที่ `http://localhost:3000`
- Backend API proxy ที่ `http://localhost:3001`
- หน้า dashboard เป็นหน้าหลักที่ `http://localhost:3000`
- Dashboard ใช้ API:
  - `GET /api/fmp/profile?symbol=AAPL`
  - `GET /api/fmp/historical-price-eod?symbol=AAPL&limit=30`

## วิธีรัน

ต้องมี Node.js เวอร์ชัน 18 ขึ้นไป

เปิด Command Prompt หน้าต่างที่ 1 สำหรับ backend:

```cmd
cd C:\Users\bmwit\Project
npm run backend
```

เปิด Command Prompt หน้าต่างที่ 2 สำหรับ frontend:

```cmd
cd C:\Users\bmwit\Project
npm run frontend
```

จากนั้นเปิด:

```text
http://localhost:3000
```

## การตั้งค่า API key

ค่าเริ่มต้นอยู่ใน `server.js` และสามารถ override ด้วย environment variable ได้:

```cmd
set FMP_API_KEY=your_api_key_here
npm run backend
```

## การเปลี่ยน Port

เปลี่ยน backend port:

```cmd
set BACKEND_PORT=4001
npm run backend
```

ถ้า backend เปลี่ยน port ให้บอก frontend ด้วย:

```cmd
set API_BASE_URL=http://localhost:4001
npm run frontend
```

เปลี่ยน frontend port:

```cmd
set FRONTEND_PORT=4000
npm run frontend
```

## การใช้งาน Git และ GitHub

ถ้ายังไม่เคยตั้งค่า Git ในเครื่อง ให้ตั้งชื่อและอีเมลก่อน:

```cmd
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"
```

เข้า folder โปรเจกต์:

```cmd
cd C:\Users\bmwit\Project
```

ทำให้ folder นี้เป็น Git repository:

```cmd
git init
```

ตรวจสอบไฟล์ที่ Git เห็น:

```cmd
git status
```

เพิ่มไฟล์ทั้งหมดเข้า staging:

```cmd
git add .
```

สร้าง commit แรก:

```cmd
git commit -m "Initial commit"
```

สร้าง repository ใหม่บน GitHub แบบไม่ต้องเลือกสร้าง README, .gitignore หรือ license จากนั้นคัดลอก URL ของ repository เช่น:

```text
https://github.com/witayabm/FirstWeb.git
```

เชื่อมโปรเจกต์ในเครื่องกับ repository บน GitHub:

```cmd
git remote add origin https://github.com/witayabm/FirstWeb.git
```

เปลี่ยนชื่อ branch หลักเป็น `main`:

```cmd
git branch -M main
```

push commit ขึ้น GitHub:

```cmd
git push -u origin main
```

ครั้งต่อไปหลังแก้ไฟล์ ให้ใช้ชุดคำสั่งนี้:

```cmd
git status
git add .
git commit -m "Describe your change"
git push
```

## โครงสร้างไฟล์

```text
server.js              Backend API proxy
frontend-server.js     Frontend static server
package.json           npm scripts และข้อมูลโปรเจกต์
README.md              เอกสารการใช้งาน
public/index.html      หน้า dashboard หลัก
public/app.js          JavaScript ของ dashboard
public/styles.css      CSS ของ dashboard
```
