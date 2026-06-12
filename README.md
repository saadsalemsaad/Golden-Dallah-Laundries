# 🧺 نظام المغسلة — Laundry Management System

## Stack
- React + Vite
- Tailwind CSS
- Supabase (Auth + Postgres)
- Netlify (Deploy)

---

## خطوات التشغيل

### 1. Supabase
1. سجّل على [supabase.com](https://supabase.com) وعمل project جديد
2. روح **SQL Editor** والصق محتوى `supabase_schema.sql` وشغّله
3. روح **Authentication → Users** وأضف يوزر لكل فرع
4. بعد إضافة كل يوزر، اضغط عليه وعدّل `user_metadata` وحط:
   ```json
   { "branch": "الفرع الأول" }
   ```
5. خذ الـ keys من **Settings → API**:
   - `Project URL`
   - `anon public key`

### 2. Local Setup
```bash
# Clone أو فك الضغط على المجلد
cd laundry-system

# نسخ ملف البيئة
cp .env.example .env

# حط keys من Supabase في .env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_key

# تثبيت الحزم
npm install

# تشغيل محلي
npm run dev
```

### 3. Deploy على Netlify
```bash
# Build
npm run build

# رفع مجلد dist على netlify.com
# أو ربط GitHub repo
```

**أو من Netlify Dashboard:**
1. اسحب مجلد `dist` على netlify.com/drop
2. أو ربط GitHub واختار `dist` كـ publish directory

**Environment Variables في Netlify:**
Site settings → Environment variables → أضف:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## هيكل الملفات
```
src/
├── context/AuthContext.jsx   # Auth state
├── hooks/useLaundry.js       # كل عمليات الداتا بيز
├── lib/
│   ├── supabase.js           # Supabase client
│   └── constants.js          # الأصناف والأسعار
├── pages/
│   ├── LoginPage.jsx
│   ├── EntryPage.jsx         # الإدخال اليومي
│   ├── LogPage.jsx           # السجل
│   ├── SettlementPage.jsx    # التسوية الشهرية
│   └── PricesPage.jsx        # الأسعار
└── components/
    └── layout/DashboardLayout.jsx
```

---

## الفروع
كل فرع له:
- يوزر منفصل في Supabase Auth
- بيانات منفصلة تماماً (RLS على مستوى الداتا بيز)
- أسعار منفصلة
