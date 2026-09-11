# English Zone

منصة تعليم اللغة الإنجليزية للأستاذ Abdelrahman Mohamed، مبنية بواجهة React/Vite وطبقة بيانات Supabase PostgreSQL.

## الحالة الحالية

يتضمن المشروع الواجهة العامة، التسجيل، مسارات دخول الطالب والمعلم، لوحتي التحكم المتجاوبتين، قائمة التعلم وشجرة الدروس، ومخطط قاعدة البيانات مع علاقات وRLS. الواجهة تعمل بدون مفاتيح Supabase لأغراض المعاينة، وتعرض حالة الاتصال بدل الادعاء بحفظ دائم غير مفعّل.

لتحويل النماذج إلى عمليات إنتاجية دائمة، يجب تشغيل مخطط `supabase/schema.sql` ثم ربط عمليات المصادقة وCRUD في `src/App.tsx` بعميل Supabase. لا تضع رمز المعلم أو أي مفتاح Service Role في الواجهة.

## المتطلبات

- Node.js 20 أو أحدث
- مشروع Supabase مجاني
- حساب Vercel للنشر الاختياري

## التشغيل المحلي

```bash
npm install
cp .env.example .env.local
npm run dev
```

## إعداد Supabase

1. أنشئ مشروعًا جديدًا من Supabase.
2. افتح SQL Editor وشغّل محتوى `supabase/schema.sql`.
3. فعّل Email provider من Authentication، وأضف معلمًا يدويًا في `profiles` بعد إنشاء حسابه.
4. انسخ Project URL و`anon` key إلى `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`anon` key آمن للواجهة مع RLS. لا تستخدم `service_role` في Vite أو GitHub.

## قاعدة البيانات

المخطط يغطي `profiles`, `courses`, `lessons`, `enrollments`, `payments`, `attendance`, `exams`, `questions`, `exam_submissions`, `student_lesson_progress`, `announcements`, و`settings`، ويضع سياسات تمنع الطالب من قراءة بيانات طالب آخر أو إدارة بيانات المعلم.

## Vercel

ارفع المستودع إلى GitHub، ثم استورده في Vercel وأضف متغيري البيئة نفسيهما من إعدادات المشروع. استخدم أمر البناء `npm run build` ومجلد الإخراج `dist`. لا يعتمد التطبيق على localhost، وتبقى البيانات في Supabase بعد إعادة النشر.

## أوامر مفيدة

```bash
npm run build
npm run preview
```
