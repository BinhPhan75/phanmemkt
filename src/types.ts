/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Account {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balanceType: 'DEBIT' | 'CREDIT' | 'DUAL';
  parentCode?: string;
  openingDebit?: number;
  openingCredit?: number;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  bankAccount: string;
  bankName: string;
  representative: string;
  taxCode: string;
  province: string;
  email: string;
  zalo: string;
  facebook: string;
  position: string;
  startDate: string;
  endDate: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'CÔNG TY TNHH THƯƠNG MẠI TỔNG HỢP ABC',
  address: 'TP Đà Nẵng',
  phone: '',
  bankAccount: '0',
  bankName: 'NH XXXXX',
  representative: '',
  taxCode: '123456789',
  province: 'Quảng Nam',
  email: 'xxxgmail.com',
  zalo: '949595969',
  facebook: '',
  position: 'Giám đốc',
  startDate: '2025-01-01',
  endDate: '2026-12-31'
};

export interface Partner {
  id: string; // matches code
  code: string; // e.g. 131-BINHMINH
  name: string;
  taxCode: string;
  address: string;
  type: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  openingDebit?: number;
  openingCredit?: number;
}

export interface InventoryItem {
  id: string; // matches code
  code: string; // e.g. CHI202.300
  name: string;
  unit: string;
  account: string; // e.g. 152 or 156
  openingQty: number;
  openingValue: number;
}

export interface InvoiceItem {
  maHang: string;
  tenHang: string;
  dvt: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  thueSuat: number; // e.g. 0, 5, 8, 10
  tienThue: number;
}

export interface BudgetAllocation {
  id: string;
  name: string;
  type: 'COST_DEPRECIATION' | 'PREPAID_EXPENSE';
  totalValue: number;
  periodMonths: number;
  allocatedValue: number;
  remainingValue: number;
  debitAcc: string;
  creditAcc: string;
}

export type InvoiceType = 'BR' | 'MV'; // BR = Ban Ra (Sales), MV = Mua Vao (Purchase)

export interface AccountingInvoice {
  id: string;
  type: 'HOADON';
  loaiHD: InvoiceType;
  soHD: string;
  ngayHD: string;
  kyHieuHD: string;
  maKH: string;
  dienGiai: string;
  tkNo: string;
  tkCo: string;
  tkGiaVonNo?: string;
  tkGiaVonCo?: string;
  khoanMucCP?: string;
  items: InvoiceItem[];
}

export interface JournalLine {
  id: string;
  loaiTK: 'No' | 'Co';
  soTK: string;
  tenTK: string;
  psNo: number;
  psCo: number;
  dienGiai: string;
}

export interface JournalVoucher {
  id: string;
  type: 'PHIEUKT';
  ngayCT: string;
  ngayGS: string;
  soCT: string;
  maKH?: string;
  dienGiai: string;
  lines: JournalLine[];
}

export type AccountingTransaction = AccountingInvoice | JournalVoucher;

// List of standard default accounts under MoF Circular 133
export const DEFAULT_ACCOUNTS: Account[] = [
  { code: '111', name: 'Tiền mặt', type: 'ASSET', balanceType: 'DEBIT', openingDebit: 154000000 },
  { code: '1111', name: 'Tiền Việt Nam', type: 'ASSET', balanceType: 'DEBIT', parentCode: '111' },
  { code: '112', name: 'Tiền gửi ngân hàng', type: 'ASSET', balanceType: 'DEBIT', openingDebit: 320000000 },
  { code: '1121', name: 'Tiền Việt Nam gửi ngân hàng', type: 'ASSET', balanceType: 'DEBIT', parentCode: '112' },
  { code: '131', name: 'Phải thu của khách hàng', type: 'ASSET', balanceType: 'DUAL', openingDebit: 45000000 },
  { code: '133', name: 'Thuế giá trị gia tăng được khấu trừ', type: 'ASSET', balanceType: 'DEBIT' },
  { code: '1331', name: 'Thuế GTGT được khấu trừ của hàng hóa, dịch vụ', type: 'ASSET', balanceType: 'DEBIT', parentCode: '133' },
  { code: '152', name: 'Nguyên liệu, vật liệu', type: 'ASSET', balanceType: 'DEBIT', openingDebit: 36000000 },
  { code: '156', name: 'Hàng hóa', type: 'ASSET', balanceType: 'DEBIT', openingDebit: 45000000 },
  { code: '211', name: 'Tài sản cố định hữu hình', type: 'ASSET', balanceType: 'DEBIT', openingDebit: 500000000 },
  { code: '214', name: 'Hao mòn tài sản cố định', type: 'ASSET', balanceType: 'CREDIT', openingCredit: 120000000 },
  { code: '331', name: 'Phải trả cho người bán', type: 'LIABILITY', balanceType: 'DUAL', openingCredit: 65000000 },
  { code: '333', name: 'Thuế và các khoản phải nộp Nhà nước', type: 'LIABILITY', balanceType: 'DUAL' },
  { code: '3331', name: 'Thuế GTGT phải nộp', type: 'LIABILITY', balanceType: 'DUAL', parentCode: '333' },
  { code: '33311', name: 'Thuế GTGT đầu ra', type: 'LIABILITY', balanceType: 'DUAL', parentCode: '3331' },
  { code: '411', name: 'Vốn đầu tư của chủ sở hữu', type: 'EQUITY', balanceType: 'CREDIT', openingCredit: 800000000 },
  { code: '421', name: 'Lợi nhuận sau thuế chưa phân phối', type: 'EQUITY', balanceType: 'DUAL', openingCredit: 75000000 },
  { code: '4212', name: 'Lợi nhuận sau thuế chưa phân phối năm nay', type: 'EQUITY', balanceType: 'DUAL', parentCode: '421' },
  { code: '511', name: 'Doanh thu bán hàng và cung cấp dịch vụ', type: 'REVENUE', balanceType: 'CREDIT' },
  { code: '5111', name: 'Doanh thu bán hàng hóa', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '511' },
  { code: '632', name: 'Giá vốn hàng bán', type: 'EXPENSE', balanceType: 'DEBIT' },
  { code: '642', name: 'Chi phí quản lý doanh nghiệp', type: 'EXPENSE', balanceType: 'DEBIT' },
  { code: '6421', name: 'Chi phí bán hàng', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '642' },
  { code: '6422', name: 'Chi phí quản lý doanh nghiệp', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '642' }
];

export const DEFAULT_PARTNERS: Partner[] = [
  {
    id: '131-BINHMINH',
    code: '131-BINHMINH',
    name: 'Cty TNHH May trang phục TT Bình Minh',
    taxCode: '3200738960',
    address: 'Thị trấn Diên Sanh, Hải Lăng, Quảng Trị',
    type: 'CUSTOMER',
    openingDebit: 45000000,
    openingCredit: 0
  },
  {
    id: '131-DONGHAI',
    code: '131-DONGHAI',
    name: 'Cty Cổ phần Thương mại Đông Hải',
    taxCode: '0102030405',
    address: 'Láng Hạ, Đống Đa, Hà Nội',
    type: 'CUSTOMER',
    openingDebit: 0,
    openingCredit: 0
  },
  {
    id: '331-HOALAM',
    code: '331-HOALAM',
    name: 'Cty TNHH Hóa phẩm Hoa Lâm',
    taxCode: '3700123456',
    address: 'KCN Sóng Thần, Dĩ An, Bình Dương',
    type: 'VENDOR',
    openingDebit: 0,
    openingCredit: 25000000
  },
  {
    id: '331-VIETSOV',
    code: '331-VIETSOV',
    name: 'Tổng cty Nhập khẩu Vật tư VietSov',
    taxCode: '0200987654',
    address: 'Bạch Đằng, Hồng Bàng, Hải Phòng',
    type: 'VENDOR',
    openingDebit: 0,
    openingCredit: 40000000
  }
];

export const DEFAULT_INVENTORIES: InventoryItem[] = [
  {
    id: 'CHI202.300',
    code: 'CHI202.300',
    name: 'Chỉ may Polyester 20/2 3000n',
    unit: 'Cuộn',
    account: '152',
    openingQty: 1000,
    openingValue: 12000000 // 12,000 VND average
  },
  {
    id: 'HOACHAT',
    code: 'HOACHAT',
    name: 'Hóa chất nhuộm tẩy',
    unit: 'Lít',
    account: '152',
    openingQty: 200,
    openingValue: 24000000 // 120,000 VND average
  },
  {
    id: 'VAIDUMI',
    code: 'VAIDUMI',
    name: 'Vải Kaki Dumi Hàn Quốc',
    unit: 'Mét',
    account: '156',
    openingQty: 500,
    openingValue: 45000000 // 90,000 VND average
  }
];

export const DEFAULT_TRANSACTIONS: AccountingTransaction[] = [
  {
    id: 'TX-001',
    type: 'PHIEUKT',
    ngayCT: '2026-06-01',
    ngayGS: '2026-06-01',
    soCT: 'PKT/2026/001',
    maKH: '131-BINHMINH',
    dienGiai: 'Nhận góp vốn bổ sung kinh doanh từ thành viên bằng Tiền Mặt',
    lines: [
      { id: 'L-1', loaiTK: 'No', soTK: '111', tenTK: 'Tiền mặt', psNo: 100000000, psCo: 0, dienGiai: 'Nhận góp vốn bổ sung' },
      { id: 'L-2', loaiTK: 'Co', soTK: '411', tenTK: 'Vốn đầu tư của chủ sở hữu', psNo: 0, psCo: 100000000, dienGiai: 'Nhận góp vốn bổ sung' }
    ]
  },
  {
    id: 'TX-002',
    type: 'PHIEUKT',
    ngayCT: '2026-06-02',
    ngayGS: '2026-06-02',
    soCT: 'PT/2026/001',
    maKH: '331-HOALAM',
    dienGiai: 'Rút tiền gửi ngân hàng về nộp quỹ tiền mặt',
    lines: [
      { id: 'L-3', loaiTK: 'No', soTK: '111', tenTK: 'Tiền mặt', psNo: 15120000, psCo: 0, dienGiai: 'Rút TGNH về nhập quỹ' },
      { id: 'L-4', loaiTK: 'Co', soTK: '112', tenTK: 'Tiền gửi ngân hàng', psNo: 0, psCo: 15120000, dienGiai: 'Rút TGNH về nhập quỹ' }
    ]
  },
  {
    id: 'TX-003',
    type: 'HOADON',
    loaiHD: 'MV',
    soHD: '0001245',
    ngayHD: '2026-06-03',
    kyHieuHD: 'ML/26P',
    maKH: '331-HOALAM',
    dienGiai: 'Mua hóa chất nhuộm của Cty Hoa Lâm nhập kho chưa thanh toán',
    tkNo: '152',
    tkCo: '331',
    items: [
      { maHang: 'HOACHAT', tenHang: 'Hóa chất nhuộm tẩy', dvt: 'Lít', soLuong: 50, donGia: 120000, thanhTien: 6000000, thueSuat: 10, tienThue: 600000 }
    ]
  },
  {
    id: 'TX-004',
    type: 'PHIEUKT',
    ngayCT: '2026-06-05',
    ngayGS: '2026-06-05',
    soCT: 'PC/2026/001',
    maKH: '331-HOALAM',
    dienGiai: 'Chi tiền mặt thanh toán nợ mua hóa chất cho Cty Hoa Lâm',
    lines: [
      { id: 'L-5', loaiTK: 'No', soTK: '331', tenTK: 'Phải trả cho người bán', psNo: 6600000, psCo: 0, dienGiai: 'Thanh toán tiền mua hóa chất' },
      { id: 'L-6', loaiTK: 'Co', soTK: '111', tenTK: 'Tiền mặt', psNo: 0, psCo: 6600000, dienGiai: 'Thanh toán tiền mua hóa chất' }
    ]
  },
  {
    id: 'TX-005',
    type: 'HOADON',
    loaiHD: 'BR',
    soHD: '0000081',
    ngayHD: '2026-06-10',
    kyHieuHD: 'BM/26E',
    maKH: '131-BINHMINH',
    dienGiai: 'Xuất bán tinh gọn chỉ may Polyester cho Cty Bình Minh',
    tkNo: '131',
    tkCo: '511',
    tkGiaVonNo: '632',
    tkGiaVonCo: '152',
    items: [
      { maHang: 'CHI202.300', tenHang: 'Chỉ may Polyester 20/2 3000n', dvt: 'Cuộn', soLuong: 200, donGia: 18000, thanhTien: 3600000, thueSuat: 8, tienThue: 288000 }
    ]
  },
  {
    id: 'TX-006',
    type: 'PHIEUKT',
    ngayCT: '2026-06-12',
    ngayGS: '2026-06-12',
    soCT: 'BC/2026/002',
    maKH: '131-BINHMINH',
    dienGiai: 'Công ty Bình Minh thanh toán nợ mua hàng qua chuyển khoản ngân hàng',
    lines: [
      { id: 'L-7', loaiTK: 'No', soTK: '112', tenTK: 'Tiền gửi ngân hàng', psNo: 3888000, psCo: 0, dienGiai: 'Thu nợ tiền bán hàng qua ngân hàng' },
      { id: 'L-8', loaiTK: 'Co', soTK: '131', tenTK: 'Phải thu của khách hàng', psNo: 0, psCo: 3888000, dienGiai: 'Thu nợ tiền bán hàng qua ngân hàng' }
    ]
  },
  {
    id: 'TX-007',
    type: 'PHIEUKT',
    ngayCT: '2026-06-15',
    ngayGS: '2026-06-15',
    soCT: 'PC/2026/002',
    dienGiai: 'Chi tiền mặt thanh toán chi phí internet và điện nước phục vụ quản lý kì này',
    lines: [
      { id: 'L-9', loaiTK: 'No', soTK: '642', tenTK: 'Chi phí quản lý doanh nghiệp', psNo: 4500000, psCo: 0, dienGiai: 'Thanh toán tiền điện nước internet' },
      { id: 'L-10', loaiTK: 'Co', soTK: '111', tenTK: 'Tiền mặt', psNo: 0, psCo: 4500000, dienGiai: 'Thanh toán tiền điện nước internet' }
    ]
  }
];

export const DEFAULT_ALLOCATIONS: BudgetAllocation[] = [
  {
    id: 'ALLOC-001',
    name: 'Khấu hao Máy may Công nghiệp Juki',
    type: 'COST_DEPRECIATION',
    totalValue: 36000000,
    periodMonths: 36,
    allocatedValue: 12000000,
    remainingValue: 24000000,
    debitAcc: '642',
    creditAcc: '214'
  },
  {
    id: 'ALLOC-002',
    name: 'Phân bổ Chi phí thuê nhà xưởng trả trước',
    type: 'PREPAID_EXPENSE',
    totalValue: 60000000,
    periodMonths: 12,
    allocatedValue: 25000000,
    remainingValue: 35000000,
    debitAcc: '642',
    creditAcc: '211'
  }
];
