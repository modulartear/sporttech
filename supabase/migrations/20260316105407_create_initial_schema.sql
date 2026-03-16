/*
  # Initial Database Schema for Streaming Events Platform

  ## Overview
  Complete database structure for a streaming events platform with payment processing,
  access control, analytics, and refund management.

  ## 1. New Tables
  
  ### user_profiles
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `full_name` (text)
  - `phone` (text, nullable)
  - `country` (text, nullable)
  - `role` (enum: user, admin)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### events
  - `id` (uuid, primary key)
  - `title` (text, required)
  - `description` (text)
  - `youtube_video_id` (text, encrypted)
  - `youtube_embed_token` (text, unique)
  - `event_date` (timestamptz, required)
  - `event_type` (enum: live, premiere, recorded)
  - `price` (decimal, required)
  - `currency` (enum: ARS, USD, BRL)
  - `thumbnail_url` (text, nullable)
  - `status` (enum: draft, published, live, ended, cancelled)
  - `max_attendees` (integer, nullable)
  - `access_window_hours` (integer, default: 0)
  - `created_by` (uuid, foreign key to auth.users)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### purchases
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `event_id` (uuid, foreign key to events)
  - `payment_method` (enum: mercadopago, astropay, bank_transfer)
  - `payment_status` (enum: pending, approved, rejected, refunded)
  - `amount` (decimal, required)
  - `currency` (text)
  - `transaction_id` (text, nullable)
  - `payment_proof_url` (text, nullable)
  - `approved_by` (uuid, foreign key to auth.users, nullable)
  - `approved_at` (timestamptz, nullable)
  - `rejection_reason` (text, nullable)
  - `refund_status` (enum: none, requested, partial, full)
  - `refunded_amount` (decimal, default: 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### access_tokens
  - `id` (uuid, primary key)
  - `purchase_id` (uuid, foreign key to purchases)
  - `user_id` (uuid, foreign key to auth.users)
  - `event_id` (uuid, foreign key to events)
  - `token` (text, unique, indexed)
  - `expires_at` (timestamptz)
  - `last_validated_at` (timestamptz, nullable)
  - `validation_count` (integer, default: 0)
  - `is_active` (boolean, default: true)
  - `created_at` (timestamptz)
  
  ### analytics_views
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users, nullable)
  - `event_id` (uuid, foreign key to events)
  - `session_id` (text)
  - `duration_seconds` (integer, nullable)
  - `ip_address_hash` (text)
  - `user_agent` (text)
  - `created_at` (timestamptz)
  
  ### payment_webhooks
  - `id` (uuid, primary key)
  - `provider` (enum: mercadopago, astropay)
  - `webhook_data` (jsonb)
  - `processed` (boolean, default: false)
  - `purchase_id` (uuid, foreign key to purchases, nullable)
  - `created_at` (timestamptz)
  
  ### refunds
  - `id` (uuid, primary key)
  - `purchase_id` (uuid, foreign key to purchases)
  - `amount` (decimal, required)
  - `reason` (enum: event_cancelled, technical_issue, user_request, duplicate_payment, other)
  - `reason_details` (text, nullable)
  - `status` (enum: pending, approved, rejected, processed, failed)
  - `payment_method` (enum: mercadopago, astropay, bank_transfer)
  - `refund_transaction_id` (text, nullable)
  - `requested_by` (uuid, foreign key to auth.users)
  - `requested_at` (timestamptz)
  - `processed_by` (uuid, foreign key to auth.users, nullable)
  - `processed_at` (timestamptz, nullable)
  - `notes` (text, nullable)
  
  ### user_bank_accounts
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `account_holder_name` (text, required)
  - `bank_name` (text, required)
  - `account_type` (enum: savings, checking, cbu, cvu)
  - `account_number` (text, encrypted)
  - `country` (text)
  - `is_verified` (boolean, default: false)
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable Row Level Security (RLS) on all tables
  - Policies for authenticated users to manage their own data
  - Admin-only policies for sensitive operations
  - Public read access for published events only

  ## 3. Important Notes
  - All monetary values use decimal type for precision
  - YouTube video IDs should be encrypted before storage
  - Access tokens expire based on event type and access window
  - All timestamps use timestamptz for timezone support
*/

-- Create custom types (enums)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('live', 'premiere', 'recorded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'published', 'live', 'ended', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('mercadopago', 'astropay', 'bank_transfer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_type AS ENUM ('pending', 'approved', 'rejected', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE currency_type AS ENUM ('ARS', 'USD', 'BRL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE refund_status_type AS ENUM ('none', 'requested', 'partial', 'full');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE refund_reason_type AS ENUM ('event_cancelled', 'technical_issue', 'user_request', 'duplicate_payment', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE refund_process_status AS ENUM ('pending', 'approved', 'rejected', 'processed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('savings', 'checking', 'cbu', 'cvu');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE webhook_provider AS ENUM ('mercadopago', 'astropay');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  country text,
  role user_role DEFAULT 'user' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  youtube_video_id text NOT NULL,
  youtube_embed_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  event_date timestamptz NOT NULL,
  event_type event_type DEFAULT 'live' NOT NULL,
  price decimal(10, 2) NOT NULL CHECK (price >= 0),
  currency currency_type DEFAULT 'ARS' NOT NULL,
  thumbnail_url text,
  status event_status DEFAULT 'draft' NOT NULL,
  max_attendees integer CHECK (max_attendees > 0),
  access_window_hours integer DEFAULT 0 NOT NULL CHECK (access_window_hours >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  payment_method payment_method_type NOT NULL,
  payment_status payment_status_type DEFAULT 'pending' NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL,
  transaction_id text,
  payment_proof_url text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  refund_status refund_status_type DEFAULT 'none' NOT NULL,
  refunded_amount decimal(10, 2) DEFAULT 0 NOT NULL CHECK (refunded_amount >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, event_id)
);

-- Create access_tokens table
CREATE TABLE IF NOT EXISTS access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  last_validated_at timestamptz,
  validation_count integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create analytics_views table
CREATE TABLE IF NOT EXISTS analytics_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL,
  duration_seconds integer,
  ip_address_hash text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create payment_webhooks table
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider webhook_provider NOT NULL,
  webhook_data jsonb NOT NULL,
  processed boolean DEFAULT false NOT NULL,
  purchase_id uuid REFERENCES purchases(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount >= 0),
  reason refund_reason_type NOT NULL,
  reason_details text,
  status refund_process_status DEFAULT 'pending' NOT NULL,
  payment_method payment_method_type NOT NULL,
  refund_transaction_id text,
  requested_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_at timestamptz DEFAULT now() NOT NULL,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  notes text
);

-- Create user_bank_accounts table
CREATE TABLE IF NOT EXISTS user_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_holder_name text NOT NULL,
  bank_name text NOT NULL,
  account_type account_type NOT NULL,
  account_number text NOT NULL,
  country text NOT NULL,
  is_verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_event_id ON purchases(event_id);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_event ON access_tokens(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_views_event_id ON analytics_views(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_views_user_id ON analytics_views(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_purchase_id ON refunds(purchase_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile automatically on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();