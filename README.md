# Kasir Cafe — Aplikasi POS Restoran & Kafe

Aplikasi kasir (Point of Sale) untuk restoran/kafe. Web app untuk kasir & owner,
plus fitur self-order pelanggan via QR meja. Dibangun mengikuti dokumen
[`rancangan-aplikasi-kasir-restoran.md`](rancangan-aplikasi-kasir-restoran.md).

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** + **shadcn/ui** (komponen dasar)
- **Supabase** — auth, PostgreSQL, realtime (`@supabase/supabase-js`, `@supabase/ssr`)
- **next-themes** — dark mode

## Halaman

| Route | Fungsi | Login? |
|---|---|---|
| `/login` | Login staf pakai PIN 4 digit | — |
| `/kasir` | Layar order utama (menu kiri, keranjang kanan) | staf |
| `/meja` | Denah & status meja | staf |
| `/menu` | CRUD menu & kategori | staf |
| `/laporan` | Dashboard laporan penjualan | staf |
| `/order/[table_id]` | Self-order pelanggan via QR (mobile) | tidak |

> Catatan: halaman ini masih **skeleton UI** dengan data contoh
> (`src/lib/mock-data.ts`). Logic penuh & query Supabase belum disambungkan.

## Struktur Folder

```
src/
  app/
    (app)/              # route group yang dibungkus AppShell (sidebar + header)
      layout.tsx
      kasir/page.tsx
      meja/page.tsx
      menu/page.tsx
      laporan/page.tsx
    login/page.tsx      # keypad PIN, tanpa shell
    order/[table_id]/   # self-order mobile, tanpa shell & tanpa login
      page.tsx
    layout.tsx          # root: ThemeProvider + font
    globals.css         # design tokens (warna semantik + dark mode)
    page.tsx            # redirect -> /login
  components/
    ui/                 # shadcn: button, input, dialog, table, card, badge
    app-shell.tsx       # navigasi sidebar/mobile
    theme-provider.tsx
    theme-toggle.tsx
  lib/
    supabase/client.ts  # browser client
    supabase/server.ts  # server client (App Router)
    utils.ts            # cn(), formatRupiah()
    mock-data.ts        # data contoh untuk skeleton
supabase/
  migrations/
    0001_init.sql       # semua tabel (dok. bagian 8 & 10.4)
```

## Menjalankan (Development)

```bash
npm install
npm run dev      # http://localhost:3000
```

## Langkah Manual yang Perlu Anda Lakukan

1. **Buat project Supabase** di https://supabase.com.
2. **Isi environment variable**: salin `.env.local.example` → `.env.local`,
   lalu isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (dari Supabase Dashboard → Project Settings → API).
3. **Jalankan migration**: buka Supabase Dashboard → SQL Editor, tempel isi
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   lalu Run. (Atau pakai Supabase CLI: `supabase db push`.)
4. Restart `npm run dev` agar env terbaca.

## Menambah Komponen shadcn/ui Lain

`components.json` sudah dikonfigurasi, jadi bisa langsung:

```bash
npx shadcn@latest add dropdown-menu select toast
```
