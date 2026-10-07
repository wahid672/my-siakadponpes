export type InvoiceStatus = 'draft' | 'unpaid' | 'pending' | 'paid' | 'expired' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'expired';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  discount?: number;
  tax?: number;
  total: number;
}

export interface CustomerProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  organization: string | null;
  pic?: string | null;
  address: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  status?: 'active' | 'disabled';
  created_at: string;
  role?: 'admin' | 'user';
}

export interface InvoiceDetail {
  id: string;
  invoice_number: string;
  user_id: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  payment_status?: PaymentStatus;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  discount: number;
  total: number;
  currency?: string;
  notes?: string | null;
  terms_conditions?: string | null;
  public_token?: string | null;
  paid_at?: string | null;
  created_at?: string;
  customer_name?: string;
  customer_email?: string;
  customer_organization?: string;
  customer_address?: string;
  profile?: CustomerProfile | null;
}

export interface PaymentTransaction {
  id: string;
  invoice_id: string;
  user_id: string;
  tripay_reference?: string | null;
  merchant_ref?: string | null;
  payment_channel: string;
  payment_method?: string;
  amount: number;
  fee?: number;
  total_amount: number;
  status: PaymentStatus;
  checkout_url?: string | null;
  pay_code?: string | null;
  qr_url?: string | null;
  instructions?: string | null;
  expired_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  invoice_number?: string;
  customer_name?: string;
}

export interface PaymentChannelItem {
  code: string;
  name: string;
  group: 'Virtual Account' | 'E-Wallet' | 'Convenience Store' | 'QRIS' | 'Bank Transfer';
  type: string;
  fee_merchant: { flat: number; percent: number };
  fee_customer: { flat: number; percent: number };
  total_fee: { flat: number; percent: number };
  minimum_fee?: number;
  maximum_fee?: number;
  icon_url?: string;
  active: boolean;
}

export interface GatewaySettings {
  tripay_mode: 'sandbox' | 'production';
  tripay_merchant_code: string;
  tripay_api_key: string;
  tripay_private_key: string;
  is_enabled: boolean;
  invoice_prefix: string;
  institution_name: string;
  institution_address: string;
  institution_phone: string;
}

export interface AuditLogEntry {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: string;
  created_at: string;
}
