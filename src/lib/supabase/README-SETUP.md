# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and choose a name (e.g., `dc-finefoods-dashboard`)
3. Set a strong database password and choose a region close to you
4. Wait for the project to finish provisioning

## 2. Get Your API Keys

1. Go to **Project Settings** → **API**
2. Copy the **Project URL** (e.g., `https://abc123.supabase.co`)
3. Copy the **anon/public** key

## 3. Set Environment Variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Run the Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql`
4. Click "Run" to create all tables, policies, and seed data

## 5. Enable Email Auth

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. For development, you can disable "Confirm email" under **Authentication** → **Settings**

## 6. Create Your First Manager Account

1. Start the app with `npm run dev`
2. Go to `/signup`
3. Create an account with role "Manager"
4. This gives you full access to all features

## Roles

| Role | Can View | Can Create/Edit | Special |
|------|----------|----------------|---------|
| Worker | All pipeline data | Records in their stage | Mobile-friendly forms |
| Manager | Everything | Everything | Approve QC, manage users |
| Stakeholder | Everything | Nothing | Read-only dashboards |
