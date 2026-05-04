# Stock Dashboard

เว็บ Node.js แบบแยก frontend/static server และ backend API proxy สำหรับแสดง dashboard หุ้นจาก Financial Modeling Prep (FMP) พร้อม Yahoo Finance fallback เมื่อ FMP ใช้งานไม่ได้

## สิ่งที่มีในโปรเจกต์

- Frontend static server ที่ `http://localhost:3000`
- Backend API proxy ที่ `http://localhost:3001`
- หน้า dashboard เป็นหน้าหลักที่ `http://localhost:3000`
- `http://localhost:3000/dashboard.html` ยังเปิดได้สำหรับลิงก์เดิม
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

## โครงสร้างไฟล์

```text
server.js              Backend API proxy
frontend-server.js     Frontend static server
package.json           npm scripts และข้อมูลโปรเจกต์
README.md              เอกสารการใช้งาน
public/index.html      หน้า dashboard หลัก
public/dashboard.html  หน้า dashboard สำหรับ compatibility กับลิงก์เดิม
public/app.js          JavaScript ของ dashboard
public/styles.css      CSS ของ dashboard
```
