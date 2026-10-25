# MediFind (lean build)
Run: `npm install && npm start` then open http://localhost:3000
Demo pharmacy login: owner@demo.com / demo1234 (edit stock, it becomes "verified now").
All stock is DEMO DATA. Data is in memory and resets on restart.
Added: CSV import (preview + commit), admin dashboard (approve/reject/suspend, audit log). Admin login: admin@demo.com / admin1234. Demo pharmacy p5 starts as "pending" and is hidden from public search until approved.
Not yet included: MongoDB, TypeScript/React, AI search, Tamil UI, tests, report docs.
Set JWT_SECRET in .env for real use (see .env.example).
