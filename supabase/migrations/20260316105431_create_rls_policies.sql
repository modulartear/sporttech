/*
  # Row Level Security Policies

  ## Overview
  Comprehensive RLS policies for all tables to ensure data security.

  ## Security Model
  - Users can read their own data
  - Admins have full access to most tables
  - Public can read published events only
  - Strict controls on financial data (purchases, refunds)
  - Analytics are restricted to admins

  ## 1. User Profiles Policies
  - Users can read and update their own profile
  - Admins can read all profiles
  
  ## 2. Events Policies
  - Public can read published events
  - Admins can create, update, and delete events
  - Users can read events they purchased
  
  ## 3. Purchases Policies
  - Users can read their own purchases
  - Users can create their own purchases
  - Admins can read and update all purchases
  
  ## 4. Access Tokens Policies
  - Users can read their own active tokens
  - System can create and update tokens (via service role)
  
  ## 5. Analytics Policies
  - Only admins can read analytics
  - System can insert analytics (via service role)
  
  ## 6. Payment Webhooks Policies
  - Only admins can read webhooks
  - System can insert webhooks (via service role)
  
  ## 7. Refunds Policies
  - Users can request refunds for their purchases
  - Users can read their own refund requests
  - Admins can process all refunds
  
  ## 8. Bank Accounts Policies
  - Users can manage their own bank accounts
  - Admins can read bank accounts (for refund processing)
*/

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USER PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE user_id = auth.uid()));

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- EVENTS POLICIES
-- ============================================

-- Public can read published events
CREATE POLICY "Public can read published events"
  ON events
  FOR SELECT
  TO authenticated
  USING (status IN ('published', 'live', 'ended'));

-- Admins can read all events (including drafts)
CREATE POLICY "Admins can read all events"
  ON events
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can create events
CREATE POLICY "Admins can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update events
CREATE POLICY "Admins can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete events
CREATE POLICY "Admins can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- PURCHASES POLICIES
-- ============================================

-- Users can read their own purchases
CREATE POLICY "Users can read own purchases"
  ON purchases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own purchases
CREATE POLICY "Users can create own purchases"
  ON purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read all purchases
CREATE POLICY "Admins can read all purchases"
  ON purchases
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can update purchases (for approval/rejection)
CREATE POLICY "Admins can update purchases"
  ON purchases
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- ACCESS TOKENS POLICIES
-- ============================================

-- Users can read their own active access tokens
CREATE POLICY "Users can read own access tokens"
  ON access_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND is_active = true);

-- Admins can read all access tokens
CREATE POLICY "Admins can read all access tokens"
  ON access_tokens
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- ============================================
-- ANALYTICS VIEWS POLICIES
-- ============================================

-- Admins can read all analytics
CREATE POLICY "Admins can read all analytics"
  ON analytics_views
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- ============================================
-- PAYMENT WEBHOOKS POLICIES
-- ============================================

-- Admins can read all webhooks
CREATE POLICY "Admins can read all webhooks"
  ON payment_webhooks
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- ============================================
-- REFUNDS POLICIES
-- ============================================

-- Users can read their own refund requests
CREATE POLICY "Users can read own refunds"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM purchases
      WHERE purchases.id = refunds.purchase_id
      AND purchases.user_id = auth.uid()
    )
  );

-- Users can request refunds for their own purchases
CREATE POLICY "Users can request refunds"
  ON refunds
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM purchases
      WHERE purchases.id = refunds.purchase_id
      AND purchases.user_id = auth.uid()
      AND purchases.payment_status = 'approved'
    )
  );

-- Admins can read all refunds
CREATE POLICY "Admins can read all refunds"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can update refunds (for processing)
CREATE POLICY "Admins can update refunds"
  ON refunds
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- USER BANK ACCOUNTS POLICIES
-- ============================================

-- Users can read their own bank accounts
CREATE POLICY "Users can read own bank accounts"
  ON user_bank_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own bank accounts
CREATE POLICY "Users can create own bank accounts"
  ON user_bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own bank accounts
CREATE POLICY "Users can update own bank accounts"
  ON user_bank_accounts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own bank accounts
CREATE POLICY "Users can delete own bank accounts"
  ON user_bank_accounts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all bank accounts (for refund processing)
CREATE POLICY "Admins can read all bank accounts"
  ON user_bank_accounts
  FOR SELECT
  TO authenticated
  USING (is_admin());