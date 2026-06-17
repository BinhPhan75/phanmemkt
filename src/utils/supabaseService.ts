/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Partner, InventoryItem, AccountingTransaction, BudgetAllocation } from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const CONFIG_KEY = 'smartaccount_supabase_config';

export function getSupabaseConfig(): SupabaseConfig | null {
  const data = localStorage.getItem(CONFIG_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearSupabaseConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

// Generate the exact DDL script for Supabase SQL Editor
export function getSupabaseSQLScript(): string {
  return `-- -------------------------------------------------------------------------
-- KỊCH BẢN THIẾT LẬP CƠ SỞ DỮ LIỆU SMARTACCOUNT TT133 TRÊN SUPABASE SQL EDITOR
-- Copy kịch bản này và chạy trực tiếp trong Supabase SQL Editor của bạn.
-- -------------------------------------------------------------------------

-- 1. Bảng Danh mục Tài khoản
CREATE TABLE IF NOT EXISTS accounting_accounts (
  code VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  balance_type VARCHAR(50) NOT NULL, -- DEBIT, CREDIT, DUAL
  parent_code VARCHAR(50),
  opening_debit NUMERIC DEFAULT 0,
  opening_credit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Bảng Danh mục Khách hàng - Nhà cung cấp
CREATE TABLE IF NOT EXISTS accounting_partners (
  id TEXT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  tax_code VARCHAR(100),
  address TEXT,
  type VARCHAR(50) NOT NULL, -- CUSTOMER, VENDOR, BOTH
  opening_debit NUMERIC DEFAULT 0,
  opening_credit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Bảng Danh mục Vật tư - Hàng hóa
CREATE TABLE IF NOT EXISTS accounting_items (
  id TEXT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  account VARCHAR(50) NOT NULL, -- 152, 156
  opening_qty NUMERIC DEFAULT 0,
  opening_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Bảng Chứng từ và Hạch toán (Lưu dưới dạng JSON để linh hoạt và tương thích cao nhất)
CREATE TABLE IF NOT EXISTS accounting_transactions (
  id TEXT PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- HOADON, PHIEUKT
  doc_date DATE NOT NULL,
  post_date DATE NOT NULL,
  doc_no VARCHAR(100) NOT NULL,
  partner_id TEXT,
  description TEXT,
  payload JSONB NOT NULL, -- Chứa toàn bộ chi tiết dòng hàng hóa hoặc định khoản Nợ/Có biệt lập
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. Bảng Phân bổ chi phí & Khấu hao
CREATE TABLE IF NOT EXISTS accounting_allocations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- COST_DEPRECIATION, PREPAID_EXPENSE
  total_value NUMERIC DEFAULT 0,
  period_months INT DEFAULT 1,
  allocated_value NUMERIC DEFAULT 0,
  remaining_value NUMERIC DEFAULT 0,
  debit_acc VARCHAR(50) NOT NULL,
  credit_acc VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 6. Bảng Người dùng và Phân quyền
CREATE TABLE IF NOT EXISTS accounting_users (
  id TEXT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100),
  full_name TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'ACCOUNTANT', -- ADMIN (Quản trị hệ thống), ACCOUNTANT (Kế toán viên)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Bật Row Level Security (RLS) hoặc cho phép truy cập nặc danh phục vụ demo
-- Để đơn giản trong quá trình kết nối nặc danh qua Service Key / Anon Key:
ALTER TABLE accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_users ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách cho phép mọi người đọc ghi qua anon key (SỬ DỤNG CHO DEMO VÀ PHÁT TRIỂN)
CREATE POLICY "Allow public select" ON accounting_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON accounting_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON accounting_accounts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON accounting_accounts FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON accounting_partners FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON accounting_partners FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON accounting_partners FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON accounting_partners FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON accounting_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON accounting_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON accounting_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON accounting_items FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON accounting_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON accounting_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON accounting_transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON accounting_transactions FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON accounting_allocations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON accounting_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON accounting_allocations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON accounting_allocations FOR DELETE USING (true);

-- Cho phép CRUD bảng người dùng công dụng kiểm tra phân quyền
CREATE POLICY "Allow public select" ON accounting_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON accounting_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON accounting_users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON accounting_users FOR DELETE USING (true);

-- Chêm dữ liệu người dùng mẫu
INSERT INTO accounting_users (id, username, email, full_name, role)
VALUES 
  ('usr-001', 'admin_binh', 'binhphan.222720@gmail.com', 'Bình Phan (Quản trị viên)', 'ADMIN'),
  ('usr-002', 'ketoan_lan', 'lan.nguyen@example.com', 'Nguyễn Thị Lan (Kế toán)', 'ACCOUNTANT')
ON CONFLICT (id) DO NOTHING;
`;
}

// Low-level fetch wrapper for Supabase REST API
async function supabaseRequest(config: SupabaseConfig, path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: any) {
  const cleanUrl = config.url.replace(/\/$/, '');
  const url = `${cleanUrl}/rest/v1/${path}`;
  
  const headers: HeadersInit = {
    'apikey': config.anonKey,
    'Authorization': `Bearer ${config.anonKey}`,
    'Content-Type': 'application/json',
  };

  if (method !== 'GET') {
    headers['Prefer'] = 'resolution=merge-duplicates'; // Merge / Upsert style support
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase API Error [${response.status}]: ${errText}`);
  }

  if (method === 'GET') {
    return await response.json();
  }
  return null;
}

// Sync operations
export async function testConnection(config: SupabaseConfig): Promise<boolean> {
  try {
    const results = await supabaseRequest(config, 'accounting_accounts?limit=1', 'GET');
    return Array.isArray(results);
  } catch (error) {
    console.error('Test connection failed', error);
    return false;
  }
}

export async function uploadAccounts(config: SupabaseConfig, accounts: Account[]) {
  const payload = accounts.map(a => ({
    code: a.code,
    name: a.name,
    type: a.type,
    balance_type: a.balanceType,
    parent_code: a.parentCode || null,
    opening_debit: a.openingDebit || 0,
    opening_credit: a.openingCredit || 0
  }));
  return await supabaseRequest(config, 'accounting_accounts', 'POST', payload);
}

export async function uploadPartners(config: SupabaseConfig, partners: Partner[]) {
  const payload = partners.map(p => ({
    id: p.id,
    code: p.code,
    name: p.name,
    tax_code: p.taxCode || null,
    address: p.address || null,
    type: p.type,
    opening_debit: p.openingDebit || 0,
    opening_credit: p.openingCredit || 0
  }));
  return await supabaseRequest(config, 'accounting_partners', 'POST', payload);
}

export async function uploadItems(config: SupabaseConfig, items: InventoryItem[]) {
  const payload = items.map(i => ({
    id: i.id,
    code: i.code,
    name: i.name,
    unit: i.unit,
    account: i.account,
    opening_qty: i.openingQty || 0,
    opening_value: i.openingValue || 0
  }));
  return await supabaseRequest(config, 'accounting_items', 'POST', payload);
}

export async function uploadTransactions(config: SupabaseConfig, txs: AccountingTransaction[]) {
  const payload = txs.map(t => {
    const docDate = t.type === 'HOADON' ? t.ngayHD : t.ngayCT;
    const postDate = t.type === 'HOADON' ? t.ngayHD : t.ngayGS;
    const docNo = t.type === 'HOADON' ? t.soHD : t.soCT;
    const partnerId = t.type === 'HOADON' ? t.maKH : t.maKH || null;
    
    return {
      id: t.id,
      type: t.type,
      doc_date: docDate,
      post_date: postDate,
      doc_no: docNo,
      partner_id: partnerId,
      description: t.dienGiai,
      payload: t // Store full nested entity in JSONB payload
    };
  });
  return await supabaseRequest(config, 'accounting_transactions', 'POST', payload);
}

export async function uploadAllocations(config: SupabaseConfig, allocations: BudgetAllocation[]) {
  const payload = allocations.map(a => ({
    id: a.id,
    name: a.name,
    type: a.type,
    total_value: a.totalValue,
    period_months: a.periodMonths,
    allocated_value: a.allocatedValue,
    remaining_value: a.remainingValue,
    debit_acc: a.debitAcc,
    credit_acc: a.creditAcc
  }));
  return await supabaseRequest(config, 'accounting_allocations', 'POST', payload);
}

export async function fetchAllFromSupabase(config: SupabaseConfig): Promise<{
  accounts: Account[];
  partners: Partner[];
  items: InventoryItem[];
  transactions: AccountingTransaction[];
  allocations: BudgetAllocation[];
}> {
  const [dbAccs, dbPartners, dbItems, dbTxs, dbAllocs] = await Promise.all([
    supabaseRequest(config, 'accounting_accounts', 'GET'),
    supabaseRequest(config, 'accounting_partners', 'GET'),
    supabaseRequest(config, 'accounting_items', 'GET'),
    supabaseRequest(config, 'accounting_transactions', 'GET'),
    supabaseRequest(config, 'accounting_allocations', 'GET')
  ]);

  const accounts: Account[] = dbAccs.map((a: any) => ({
    code: a.code,
    name: a.name,
    type: a.type,
    balanceType: a.balance_type,
    parentCode: a.parent_code || undefined,
    openingDebit: Number(a.opening_debit) || 0,
    openingCredit: Number(a.opening_credit) || 0
  }));

  const partners: Partner[] = dbPartners.map((p: any) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    taxCode: p.tax_code || '',
    address: p.address || '',
    type: p.type,
    openingDebit: Number(p.opening_debit) || 0,
    openingCredit: Number(p.opening_credit) || 0
  }));

  const items: InventoryItem[] = dbItems.map((i: any) => ({
    id: i.id,
    code: i.code,
    name: i.name,
    unit: i.unit,
    account: i.account,
    openingQty: Number(i.opening_qty) || 0,
    openingValue: Number(i.opening_value) || 0
  }));

  const allocations: BudgetAllocation[] = dbAllocs.map((a: any) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    totalValue: Number(a.total_value) || 0,
    periodMonths: Number(a.period_months) || 1,
    allocatedValue: Number(a.allocated_value) || 0,
    remainingValue: Number(a.remaining_value) || 0,
    debitAcc: a.debit_acc,
    creditAcc: a.credit_acc
  }));

  // Transactions are fully unmarshalled from the JSONB column "payload"
  const transactions: AccountingTransaction[] = dbTxs.map((t: any) => t.payload as AccountingTransaction);

  return { accounts, partners, items, transactions, allocations };
}
