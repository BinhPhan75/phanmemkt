/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAccounting } from '../utils/accountingState';
import { InventoryItem, Partner, AccountingTransaction, JournalLine } from '../types';
import { PlusCircle, FileSpreadsheet, Trash2, CheckCircle2, AlertTriangle, Users, X, RefreshCw, Layers } from 'lucide-react';

export default function NhapLieu() {
  const { partners, items, accounts, addTransaction, addPartner, addItem, currentFiscalYear } = useAccounting();

  // Mode state: unified on one screen where the user selects the transaction type
  const [entryMode, setEntryMode] = useState<'KT_GOP' | 'HOA_DON'>('KT_GOP');

  // Quick add partner states
  const [showQuickAddPartner, setShowQuickAddPartner] = useState(false);
  const [newPartnerCode, setNewPartnerCode] = useState('');
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerTaxCode, setNewPartnerTaxCode] = useState('');
  const [newPartnerAddress, setNewPartnerAddress] = useState('');
  const [newPartnerType, setNewPartnerType] = useState<'CUSTOMER' | 'VENDOR' | 'BOTH'>('CUSTOMER');
  const [newPartnerOpeningDebit, setNewPartnerOpeningDebit] = useState(0);
  const [newPartnerOpeningCredit, setNewPartnerOpeningCredit] = useState(0);
  const [quickAddError, setQuickAddError] = useState('');

  // Quick add item/materials states
  const [showQuickAddItem, setShowQuickAddItem] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('Cuộn');
  const [newItemAccount, setNewItemAccount] = useState('152');
  const [newItemOpeningQty, setNewItemOpeningQty] = useState(0);
  const [newItemOpeningValue, setNewItemOpeningValue] = useState(0);
  const [quickAddItemError, setQuickAddItemError] = useState('');
  const [quickAddItemTargetIndex, setQuickAddItemTargetIndex] = useState<number | null>(null);

  const handleQuickAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode.trim()) {
      setQuickAddItemError('Vui lòng nhập mã vật tư!');
      return;
    }
    if (!newItemName.trim()) {
      setQuickAddItemError('Vui lòng nhập tên vật tư/hàng hóa!');
      return;
    }
    if (!newItemUnit.trim()) {
      setQuickAddItemError('Vui lòng nhập đơn vị tính!');
      return;
    }

    const duplicated = items.some(i => i.code.toLowerCase() === newItemCode.trim().toLowerCase());
    if (duplicated) {
      setQuickAddItemError(`Mã vật tư/hàng hóa "${newItemCode.trim()}" đã tồn tại!`);
      return;
    }

    const itemPayload: InventoryItem = {
      id: newItemCode.trim().toUpperCase(),
      code: newItemCode.trim().toUpperCase(),
      name: newItemName.trim(),
      unit: newItemUnit.trim(),
      account: newItemAccount,
      openingQty: Number(newItemOpeningQty) || 0,
      openingValue: Number(newItemOpeningValue) || 0
    };

    addItem(itemPayload);

    // Auto-select in invoice line
    if (quickAddItemTargetIndex !== null) {
      const updated = [...invoiceItems];
      updated[quickAddItemTargetIndex] = {
        ...updated[quickAddItemTargetIndex],
        maHang: itemPayload.code
      };
      setInvoiceItems(updated);
    }

    // Reset quick add inputs
    setNewItemCode('');
    setNewItemName('');
    setNewItemUnit('Cuộn');
    setNewItemAccount('152');
    setNewItemOpeningQty(0);
    setNewItemOpeningValue(0);
    setQuickAddItemError('');
    setShowQuickAddItem(false);
    setQuickAddItemTargetIndex(null);
  };

  const handleQuickAddPartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerCode.trim()) {
      setQuickAddError('Vui lòng nhập mã đối tác!');
      return;
    }
    if (!newPartnerName.trim()) {
      setQuickAddError('Vui lòng nhập tên đối tác!');
      return;
    }
    
    const duplicated = partners.some(p => p.code.toLowerCase() === newPartnerCode.trim().toLowerCase());
    if (duplicated) {
      setQuickAddError(`Mã đối tác "${newPartnerCode.trim()}" đã tồn tại!`);
      return;
    }

    const partnerPayload: Partner = {
      id: newPartnerCode.trim().toUpperCase(),
      code: newPartnerCode.trim().toUpperCase(),
      name: newPartnerName.trim(),
      taxCode: newPartnerTaxCode.trim(),
      address: newPartnerAddress.trim(),
      type: newPartnerType,
      openingDebit: Number(newPartnerOpeningDebit) || 0,
      openingCredit: Number(newPartnerOpeningCredit) || 0
    };

    addPartner(partnerPayload);

    // Auto-select in the main form
    setMaKH(partnerPayload.code);

    // Reset quick add inputs
    setNewPartnerCode('');
    setNewPartnerName('');
    setNewPartnerTaxCode('');
    setNewPartnerAddress('');
    setNewPartnerType('CUSTOMER');
    setNewPartnerOpeningDebit(0);
    setNewPartnerOpeningCredit(0);
    setQuickAddError('');
    setShowQuickAddPartner(false);
  };

  // ==========================================
  // SHARED HEADER STATES FOR DATA ENTRY
  // ==========================================
  const [soDoc, setSoDoc] = useState(''); // Unified number (soCT / soHD)
  const [ngayDoc, setNgayDoc] = useState(`${currentFiscalYear}-06-17`);
  const [maKH, setMaKH] = useState('');
  const [dienGiaiChung, setDienGiaiChung] = useState('');

  // Sereal code for Invoice Mode
  const [kyHieuHD, setKyHieuHD] = useState(`BM/${currentFiscalYear.substring(2)}E`);

  useEffect(() => {
    setNgayDoc(`${currentFiscalYear}-06-17`);
    setKyHieuHD(`BM/${currentFiscalYear.substring(2)}E`);
  }, [currentFiscalYear]);

  // ==========================================
  // MULTI-LINE ACCOUNTING ENTRIES (KT_GOP)
  // Allows unlimited Debit/Credit rows ("Nhiều Nợ Nhiều Có")
  // ==========================================
  const [voucherLines, setVoucherLines] = useState<Array<{
    soTK: string;
    loaiTK: 'No' | 'Co';
    soTien: number;
    dienGiaiDong: string;
  }>>([
    { soTK: '6422', loaiTK: 'No', soTien: 1500000, dienGiaiDong: 'Chi tiền điện phục vụ quản lý văn phòng' },
    { soTK: '111', loaiTK: 'Co', soTien: 1500000, dienGiaiDong: 'Rút tiền mặt chi trả tiền điện nước k1' }
  ]);

  const handleAddVoucherLine = (type: 'No' | 'Co') => {
    // Intelligently guess the opposite amount to help balance the entry
    const debitsTotal = voucherLines.filter(l => l.loaiTK === 'No').reduce((s, l) => s + l.soTien, 0);
    const creditsTotal = voucherLines.filter(l => l.loaiTK === 'Co').reduce((s, l) => s + l.soTien, 0);
    const diff = Math.abs(debitsTotal - creditsTotal);

    setVoucherLines([
      ...voucherLines,
      {
        soTK: type === 'No' ? '6422' : '111',
        loaiTK: type,
        soTien: diff > 0 ? diff : 0,
        dienGiaiDong: dienGiaiChung || ''
      }
    ]);
  };

  const handleRemoveVoucherLine = (index: number) => {
    if (voucherLines.length <= 2) {
      alert('Một chứng từ định khoản kép cần tối thiểu phải có 2 dòng (Tài khoản hạch toán)!');
      return;
    }
    setVoucherLines(voucherLines.filter((_, i) => i !== index));
  };

  const handleUpdateVoucherLine = (index: number, field: string, value: any) => {
    const updated = [...voucherLines];
    updated[index] = { ...updated[index], [field]: value };
    setVoucherLines(updated);
  };

  // Perform dynamic trial checks for Debits vs Credits (Tổng Nợ must equal Tổng Có)
  const sumDebits = voucherLines.filter(l => l.loaiTK === 'No').reduce((s, l) => s + l.soTien, 0);
  const sumCredits = voucherLines.filter(l => l.loaiTK === 'Co').reduce((s, l) => s + l.soTien, 0);
  const isBalanced = sumDebits === sumCredits && sumDebits > 0;

  const handleVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soDoc.trim()) {
      alert('Vui lòng điền mã số chứng từ!');
      return;
    }
    if (!isBalanced) {
      alert('Chứng từ đang bị lệch hạch toán! Tổng tiền Ghi Nợ phải bằng Tổng tiền Ghi Có và lớn hơn 0.');
      return;
    }
    if (voucherLines.some(l => !l.soTK)) {
      alert('Vui lòng điền đầy đủ số tài khoản cho các dòng định khoản!');
      return;
    }

    // Map rows into compliant JournalVoucher lines
    const mappedLines: JournalLine[] = voucherLines.map((l, idx) => {
      const parentAccObj = accounts.find(a => a.code === l.soTK);
      return {
        id: `line-${Date.now()}-${idx}`,
        loaiTK: l.loaiTK,
        soTK: l.soTK,
        tenTK: parentAccObj ? parentAccObj.name : 'Tài khoản hạch toán',
        psNo: l.loaiTK === 'No' ? l.soTien : 0,
        psCo: l.loaiTK === 'Co' ? l.soTien : 0,
        dienGiai: l.dienGiaiDong || dienGiaiChung || 'Nghiệp vụ kế toán tổng hợp'
      };
    });

    const newTx: AccountingTransaction = {
      id: `TX-${Date.now()}`,
      type: 'PHIEUKT',
      soCT: soDoc.toUpperCase(),
      ngayCT: ngayDoc,
      ngayGS: ngayDoc,
      dienGiai: dienGiaiChung || 'Định khoản tổng hợp đa tk',
      maKH: maKH || undefined,
      lines: mappedLines
    };

    addTransaction(newTx);
    alert('Khởi tạo Ghi sổ Chứng từ tổng hợp thành công!');
    
    // Clear form inputs
    setSoDoc('');
    setDienGiaiChung('');
    setVoucherLines([
      { soTK: '6422', loaiTK: 'No', soTien: 0, dienGiaiDong: '' },
      { soTK: '111', loaiTK: 'Co', soTien: 0, dienGiaiDong: '' }
    ]);
  };


  // ==========================================
  // INVOICE-SPECIFIC SETUP (HOA_DON)
  // ==========================================
  const [loaiHD, setLoaiHD] = useState<'BR' | 'MV'>('BR');
  const [tkNoHD, setTkNoHD] = useState('131');
  const [tkCoHD, setTkCoHD] = useState('511');
  const [tkGiaVonNo, setTkGiaVonNo] = useState('632');
  const [tkGiaVonCo, setTkGiaVonCo] = useState('156');

  // List of raw materials item rows inside current Invoice
  const [invoiceItems, setInvoiceItems] = useState<Array<{
    maHang: string;
    soLuong: number;
    donGia: number;
    thueSuat: number;
    thanhTien: number;
    tienThue: number;
  }>>([
    { maHang: 'CHI202.300', soLuong: 100, donGia: 25000, thueSuat: 10, thanhTien: 2500000, tienThue: 250000 }
  ]);

  const handleAddInvoiceItemLine = () => {
    setInvoiceItems([...invoiceItems, { maHang: '', soLuong: 0, donGia: 0, thueSuat: 10, thanhTien: 0, tienThue: 0 }]);
  };

  const handleRemoveInvoiceItemLine = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleUpdateInvoiceItem = (index: number, field: string, value: any) => {
    const nextLine = { ...invoiceItems[index], [field]: value };
    
    if (field === 'maHang') {
      const selectedItem = items.find(i => i.code === value);
      if (selectedItem) {
        nextLine.donGia = 25000; // standard default average preset
      }
    }

    if (field === 'soLuong' || field === 'donGia' || field === 'thueSuat' || field === 'maHang') {
      const qty = field === 'soLuong' ? Number(value) : nextLine.soLuong;
      const price = field === 'donGia' ? Number(value) : nextLine.donGia;
      const rate = field === 'thueSuat' ? Number(value) : nextLine.thueSuat;

      nextLine.thanhTien = qty * price;
      nextLine.tienThue = Math.round((qty * price * rate) / 100);
    }

    const updated = [...invoiceItems];
    updated[index] = nextLine;
    setInvoiceItems(updated);
  };

  const handleSwitchInvoiceType = (type: 'BR' | 'MV') => {
    setLoaiHD(type);
    if (type === 'BR') {
      setTkNoHD('131');
      setTkCoHD('511');
    } else {
      setTkNoHD('152');
      setTkCoHD('331');
    }
  };

  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soDoc.trim()) {
      alert('Vui lòng nhập Số hóa đơn!');
      return;
    }
    if (!maKH) {
      alert('Vui lòng chọn Đối tác cho hóa đơn này!');
      return;
    }
    if (invoiceItems.some(i => !i.maHang || i.soLuong <= 0)) {
      alert('Vui lòng kiểm tra lại danh sách vật tư mặt hàng (Mã và số lượng phải lớn hơn 0)!');
      return;
    }

    // Auto calculate aggregates on items to build real InvoiceItems
    const processedItems = invoiceItems.map(raw => {
      const matchingInventory = items.find(i => i.code === raw.maHang);
      return {
        maHang: raw.maHang,
        tenHang: matchingInventory ? matchingInventory.name : 'Vật tư chưa phân loại',
        dvt: matchingInventory ? matchingInventory.unit : 'Cuộn',
        soLuong: raw.soLuong,
        donGia: raw.donGia,
        thanhTien: raw.thanhTien,
        thueSuat: raw.thueSuat,
        tienThue: raw.tienThue
      };
    });

    const newTx: AccountingTransaction = {
      id: `TX-${Date.now()}`,
      type: 'HOADON',
      loaiHD,
      soHD: soDoc.toUpperCase(),
      kyHieuHD,
      ngayHD: ngayDoc,
      maKH,
      dienGiai: dienGiaiChung || (loaiHD === 'BR' ? `Xuất hóa đơn bán lẻ bán hàng - ${soDoc}` : `Nhận hóa đơn vật tư mua vào - ${soDoc}`),
      tkNo: tkNoHD,
      tkCo: tkCoHD,
      tkGiaVonNo: loaiHD === 'BR' ? tkGiaVonNo : undefined,
      tkGiaVonCo: loaiHD === 'BR' ? tkGiaVonCo : undefined,
      items: processedItems
    };

    addTransaction(newTx);
    alert('Hạch toán Ghi sổ Hóa đơn vật tư thành công!');
    
    // Clear inputs
    setSoDoc('');
    setDienGiaiChung('');
    setInvoiceItems([{ maHang: 'CHI202.300', soLuong: 100, donGia: 25000, thueSuat: 10, thanhTien: 2500000, tienThue: 250000 }]);
  };


  return (
    <div className="space-y-6" id="giao-dien-nhap-lieu">
      {/* Title block with explanation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </span>
            Khai báo Hạch Toán / Nhập Liệu
          </h2>
          <p className="text-xs text-slate-500 leading-normal">
            Giao diện hạch toán thông tin chứng từ. Hỗ trợ nhập liệu đa tài khoản Nợ/Có đối ứng linh hoạt cho mọi loại nghiệp vụ kế toán doanh nghiệp.
          </p>
        </div>

        {/* Entry type controller: embedded directly in the main layout */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit shrink-0 border border-slate-200">
          <button
            type="button"
            onClick={() => setEntryMode('KT_GOP')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              entryMode === 'KT_GOP'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            id="switch-entry-general"
          >
            <PlusCircle className="w-4 h-4" />
            Bút toán đa Nợ/Có (Tổng hợp)
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('HOA_DON')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              entryMode === 'HOA_DON'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            id="switch-entry-invoice"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Hóa đơn vật tư (Kho & Thuế)
          </button>
        </div>
      </div>

      {/* COMPREHENSIVE DATA ENTRY FORM CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
        {/* Section 1: COMMON DOCUMENT/VOUCHER HEADER INFORMATION */}
        <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-150 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-dashed border-slate-200 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Niên khóa {currentFiscalYear}</span>
              <h3 className="font-extrabold text-slate-800 text-base">
                {entryMode === 'KT_GOP' 
                  ? 'Chứng từ hạch toán gộp kế toán (Nhiều Nợ / Nhiều Có)' 
                  : 'Ghi nhận Hóa đơn mua-bán vật tư hàng hóa chi tiết'
                }
              </h3>
            </div>
            {entryMode === 'HOA_DON' && (
              <div className="flex bg-slate-200 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleSwitchInvoiceType('BR')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                    loaiHD === 'BR' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-800'
                  }`}
                  id="tab-invoice-sales"
                >
                  Bán ra (Doanh Thu)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchInvoiceType('MV')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                    loaiHD === 'MV' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-800'
                  }`}
                  id="tab-invoice-purchases"
                >
                  Mua vào (Vật tư - Chi phí)
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Ky hieu - shown only if Invoice Mode */}
            {entryMode === 'HOA_DON' ? (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Ký hiệu sê-ri</label>
                <input
                  type="text"
                  required
                  placeholder="VD: BM/26E"
                  value={kyHieuHD}
                  onChange={(e) => setKyHieuHD(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-550"
                  id="input-kyhieu-id"
                />
              </div>
            ) : null}

            {/* Document / Invoice ID number */}
            <div className={`space-y-1 ${entryMode === 'KT_GOP' ? 'md:col-span-2' : ''}`}>
              <label className="text-xs font-bold text-slate-500 uppercase">
                {entryMode === 'HOA_DON' ? 'Số hóa đơn' : 'Mã số chứng từ'}
              </label>
              <input
                type="text"
                required
                placeholder={entryMode === 'HOA_DON' ? 'VD: 0000045' : 'VD: PT-001, PC-002, PKT-12'}
                value={soDoc}
                onChange={(e) => setSoDoc(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-550 placeholder:text-slate-350"
                id="input-document-no"
              />
            </div>

            {/* Posting date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Ngày hạch toán</label>
              <input
                type="date"
                required
                value={ngayDoc}
                onChange={(e) => setNgayDoc(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-550"
                id="input-posting-date"
              />
            </div>

            {/* Partner selector */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                <span>Đối tác liên đới</span>
                <button
                  type="button"
                  onClick={() => {
                    const prefix = entryMode === 'HOA_DON' ? (loaiHD === 'BR' ? 'KH' : 'NCC') : 'DT';
                    const randomSuffix = Math.floor(100 + Math.random() * 900);
                    setNewPartnerCode(`${prefix}-${randomSuffix}`);
                    setNewPartnerType('BOTH');
                    setShowQuickAddPartner(true);
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                  id="quick-add-partner-trigger"
                >
                  + Khai mới
                </button>
              </div>
              <select
                value={maKH}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    const prefix = entryMode === 'HOA_DON' ? (loaiHD === 'BR' ? 'KH' : 'NCC') : 'DT';
                    const randomSuffix = Math.floor(100 + Math.random() * 900);
                    setNewPartnerCode(`${prefix}-${randomSuffix}`);
                    setNewPartnerType('BOTH');
                    setShowQuickAddPartner(true);
                  } else {
                    setMaKH(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-550"
                id="select-partner"
              >
                <option value="">
                  {entryMode === 'HOA_DON' ? '-- Chọn đối tác hạch toán --' : '-- Không hạch công nợ đối tác (Tùy chọn) --'}
                </option>
                <option value="__add_new__" className="text-indigo-600 font-bold">+ Khai báo nhanh đối tác mới...</option>
                {partners.map(p => {
                  const typeLabel = p.type === 'CUSTOMER' ? 'KH' : p.type === 'VENDOR' ? 'NCC' : 'KH/NCC';
                  return (
                    <option key={p.code} value={p.code}>
                      [{typeLabel}] {p.code} - {p.name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nội dung diễn giải chung</label>
            <input
              type="text"
              placeholder={entryMode === 'HOA_DON' 
                ? (loaiHD === 'BR' ? 'Xuất bán lẻ vải may mặc / chỉ may kì này' : 'Mua nguyên vật liệu chế biến may mặc chính nhập kho')
                : 'Nhận góp vốn bổ sung, chuyển tiền, trích phân bổ khấu hao tài sản cố định...'
              }
              value={dienGiaiChung}
              onChange={(e) => setDienGiaiChung(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-550 font-sans"
              id="input-general-description"
            />
          </div>
        </div>

        {/* Section 2: DETAIL ENTRIES SHOWN CONDITIONALLY BASE ON SELECTION */}
        {entryMode === 'KT_GOP' ? (
          // ==========================
          // DYNAMIC TRIAL LEDGER ROWS (Many-to-Many Debits & Credits)
          // ==========================
          <form onSubmit={handleVoucherSubmit} className="p-6 md:p-8 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  Bút toán định khoản chi tiết (Dynamic Double Entries Grid)
                </span>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddVoucherLine('No')}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1"
                    id="add-debit-line"
                  >
                    + Thêm tài khoản NỢ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddVoucherLine('Co')}
                    className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1"
                    id="add-credit-line"
                  >
                    + Thêm tài khoản CÓ
                  </button>
                </div>
              </div>

              {/* Dynamic spreadsheet lines */}
              <div className="space-y-3">
                {voucherLines.map((line, idx) => {
                  const isDebit = line.loaiTK === 'No';
                  return (
                    <div 
                      key={idx} 
                      className={`grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-xl border items-end transition-all ${
                        isDebit 
                          ? 'bg-indigo-50/15 border-indigo-100/70 hover:border-indigo-200' 
                          : 'bg-emerald-50/10 border-emerald-100/60 hover:border-emerald-200'
                      }`}
                    >
                      {/* Account column */}
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-slate-505 uppercase flex items-center gap-1">
                          <span>Tài khoản</span>
                          <span className={`text-[9px] px-1 rounded-sm uppercase ${
                            isDebit ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isDebit ? 'Nợ' : 'Có'}
                          </span>
                        </label>
                        <select
                          required
                          value={line.soTK}
                          onChange={(e) => handleUpdateVoucherLine(idx, 'soTK', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Tài khoản --</option>
                          {accounts.map(a => (
                            <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Side nature selection (No / Co) */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Tính chất vế</label>
                        <select
                          value={line.loaiTK}
                          onChange={(e) => handleUpdateVoucherLine(idx, 'loaiTK', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500"
                        >
                          <option value="No">Ghi NỢ (Debit)</option>
                          <option value="Co">Ghi CÓ (Credit)</option>
                        </select>
                      </div>

                      {/* Number input for Amount */}
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">
                          {isDebit ? 'Số tiền Ghi Nợ (Đ)' : 'Số tiền Ghi Có (Đ)'}
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="Số tiền vnđ"
                          value={line.soTien || ''}
                          onChange={(e) => handleUpdateVoucherLine(idx, 'soTien', Math.abs(Number(e.target.value)) || 0)}
                          className={`w-full px-2.5 py-1 border border-slate-200 bg-white rounded-lg text-xs font-mono text-right font-extrabold focus:outline-none focus:border-indigo-500 ${
                            isDebit ? 'text-indigo-750' : 'text-emerald-750'
                          }`}
                        />
                      </div>

                      {/* Memo of current row */}
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Diễn giải hạch toán dòng</label>
                        <input
                          type="text"
                          placeholder={dienGiaiChung || "Chi tiết phát sinh dòng..."}
                          value={line.dienGiaiDong}
                          onChange={(e) => handleUpdateVoucherLine(idx, 'dienGiaiDong', e.target.value)}
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Delete button */}
                      <div className="md:col-span-1 text-center pb-0.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveVoucherLine(idx)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          id={`btn-remove-line-${idx}`}
                          title="Xóa dòng định khoản"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trial Balance validator indicators */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-slate-100 pt-5 gap-4">
              <div className="flex gap-4 text-xs font-mono">
                <div className="bg-indigo-50 text-indigo-900 p-3 rounded-xl border border-indigo-200">
                  Tổng vế Nợ: <strong className="text-sm px-1 font-black">{sumDebits.toLocaleString()} đ</strong>
                </div>
                <div className="bg-emerald-50 text-emerald-900 p-3 rounded-xl border border-emerald-200">
                  Tổng vế Có: <strong className="text-sm px-1 font-black">{sumCredits.toLocaleString()} đ</strong>
                </div>
              </div>

              {isBalanced ? (
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-extrabold bg-emerald-50/70 px-4 py-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Trạng thái: Trùng khớp cân đối tài chính!
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Độ hạch lệch cán cân: {Math.abs(sumDebits - sumCredits).toLocaleString()} đ</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!isBalanced}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all font-sans uppercase tracking-wider"
                id="btn-save-general-voucher"
              >
                Ghi sổ chứng từ hạch toán
              </button>
            </div>
          </form>
        ) : (
          // ==========================
          // MATERIAL INVOICE SCHEME (HOA_DON)
          // ==========================
          <form onSubmit={handleInvoiceSubmit} className="p-6 md:p-8 space-y-6">
            {/* Account presets */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest block">Thiết lập tài khoản hạch toán chính</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tài khoản Nợ (Debit)</label>
                  <select
                    value={tkNoHD}
                    onChange={(e) => setTkNoHD(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono font-bold"
                  >
                    {accounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tài khoản Có (Credit)</label>
                  <select
                    value={tkCoHD}
                    onChange={(e) => setTkCoHD(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono font-bold"
                  >
                    {accounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                  </select>
                </div>

                {loaiHD === 'BR' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">TK Nợ Giá vốn</label>
                      <select
                        value={tkGiaVonNo}
                        onChange={(e) => setTkGiaVonNo(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono font-bold"
                      >
                        {accounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">TK Có Giá vốn</label>
                      <select
                        value={tkGiaVonCo}
                        onChange={(e) => setTkGiaVonCo(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono font-bold"
                      >
                        {accounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Inventory table item rows */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">
                <span className="font-bold">Danh sách nguyên vật liệu, hàng hóa xuất nhập</span>
                <button
                  type="button"
                  onClick={handleAddInvoiceItemLine}
                  className="text-xs font-bold text-indigo-650 hover:underline flex items-center gap-1 cursor-pointer"
                  id="add-invoice-item-trigger"
                >
                  + Thêm dòng vật tư
                </button>
              </div>

              <div className="space-y-3">
                {invoiceItems.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50/50 p-3 rounded-xl border border-slate-150 items-end">
                    {/* Select item code */}
                    <div className="md:col-span-3 space-y-1 font-sans">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                        <span>Mã hàng hóa vật tư</span>
                        <button
                          type="button"
                          onClick={() => {
                            const rand = Math.floor(100 + Math.random() * 900);
                            setNewItemCode(`VT-${rand}`);
                            setQuickAddItemTargetIndex(idx);
                            setShowQuickAddItem(true);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                          id={`quick-add-item-trigger-${idx}`}
                        >
                          + Mới
                        </button>
                      </div>
                      <select
                        required
                        value={line.maHang}
                        onChange={(e) => {
                          if (e.target.value === '__add_new_item__') {
                            const rand = Math.floor(100 + Math.random() * 900);
                            setNewItemCode(`VT-${rand}`);
                            setQuickAddItemTargetIndex(idx);
                            setShowQuickAddItem(true);
                          } else {
                            handleUpdateInvoiceItem(idx, 'maHang', e.target.value);
                          }
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-bold text-slate-850"
                      >
                        <option value="">-- Chọn hàng hóa --</option>
                        <option value="__add_new_item__" className="text-indigo-650 font-bold">+ Khai báo vật tư mới...</option>
                        {items.map(i => (
                          <option key={i.code} value={i.code}>{i.code} - {i.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Số lượng</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={line.soLuong || ''}
                        onChange={(e) => handleUpdateInvoiceItem(idx, 'soLuong', Math.abs(Number(e.target.value)) || 0)}
                        className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-xs text-right font-mono"
                      />
                    </div>

                    {/* Price */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Đơn giá (đ)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={line.donGia || ''}
                        onChange={(e) => handleUpdateInvoiceItem(idx, 'donGia', Math.abs(Number(e.target.value)) || 0)}
                        className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-xs text-right font-mono"
                      />
                    </div>

                    {/* VAT rate option select */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Thuế suất %</label>
                      <select
                        value={line.thueSuat}
                        onChange={(e) => handleUpdateInvoiceItem(idx, 'thueSuat', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-md text-xs"
                      >
                        <option value={0}>0% (K.thụ)</option>
                        <option value={5}>5%</option>
                        <option value={8}>8% (Miễn giảm)</option>
                        <option value={10}>10% (TM)</option>
                      </select>
                    </div>

                    {/* Computations result info */}
                    <div className="md:col-span-2 space-y-1 text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Giá trị thực hạch</span>
                      <span className="text-xs font-mono font-bold block">{line.thanhTien.toLocaleString()} đ</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Thuế GTGT: {line.tienThue.toLocaleString()} đ</span>
                    </div>

                    {/* Drop row */}
                    <div className="md:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveInvoiceItemLine(idx)}
                        disabled={invoiceItems.length === 1}
                        className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                        id={`btn-remove-invoice-item-${idx}`}
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action panel */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Tổng tiền chưa thuế: <strong className="text-slate-800 text-sm font-mono">{invoiceItems.reduce((s,i)=>s+i.thanhTien, 0).toLocaleString()} đ</strong> | Thuế GTGT: <strong className="text-slate-800 text-sm font-mono">{invoiceItems.reduce((s,i)=>s+i.tienThue, 0).toLocaleString()} đ</strong>
              </div>
              
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md font-sans uppercase tracking-wider"
                id="btn-save-invoice"
              >
                <CheckCircle2 className="w-4 h-4" />
                Ghi sổ Hóa đơn Chứng từ
              </button>
            </div>
          </form>
        )}
      </div>

      {/* QUICK ADD PARTNER MODAL DIALOG */}
      {showQuickAddPartner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Đăng ký Đối tác giao dịch mới</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Bổ sung nhanh thông tin khách hàng, nhà cung cấp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuickAddPartner(false);
                  setQuickAddError('');
                }}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-650 rounded-xl transition cursor-pointer"
                id="btn-close-quickadd-partner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleQuickAddPartnerSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {quickAddError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-650 flex items-center gap-1.5 font-medium animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{quickAddError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mã đối tác <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="VD: KH-STC"
                    value={newPartnerCode}
                    onChange={(e) => {
                      setNewPartnerCode(e.target.value.toUpperCase());
                      setQuickAddError('');
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-550 font-bold"
                  />
                  <span className="text-[9px] text-slate-400 block font-normal">Duy nhất, không dấu cách</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Phân loại đối tác</label>
                  <select
                    value={newPartnerType}
                    onChange={(e) => setNewPartnerType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs focus:outline-none focus:border-indigo-550 font-medium"
                  >
                    <option value="CUSTOMER">Khách hàng (131)</option>
                    <option value="VENDOR">Nhà cung cấp (331)</option>
                    <option value="BOTH">Cả hai (Khách + NCC)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tên đối tác / Doanh nghiệp <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Công ty TNHH Giải pháp Phần mềm BK"
                  value={newPartnerName}
                  onChange={(e) => {
                    setNewPartnerName(e.target.value);
                    setQuickAddError('');
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs focus:outline-none focus:border-indigo-550"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Mã số thuế</label>
                <input
                  type="text"
                  placeholder="0102030405-001"
                  value={newPartnerTaxCode}
                  onChange={(e) => setNewPartnerTaxCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-550"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Địa chỉ trụ sở</label>
                <input
                  type="text"
                  placeholder="Số 45, Đường Giải Phóng, Hai Bà Trưng, Hà Nội"
                  value={newPartnerAddress}
                  onChange={(e) => setNewPartnerAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs focus:outline-none focus:border-indigo-550"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 mt-1 grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Số dư NỢ đầu kỳ (vnđ)</label>
                  <input
                    type="number"
                    min={0}
                    value={newPartnerOpeningDebit}
                    onChange={(e) => setNewPartnerOpeningDebit(Math.abs(Number(e.target.value)))}
                    className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-[11px] text-right font-mono text-emerald-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Số dư CÓ đầu kỳ (vnđ)</label>
                  <input
                    type="number"
                    min={0}
                    value={newPartnerOpeningCredit}
                    onChange={(e) => setNewPartnerOpeningCredit(Math.abs(Number(e.target.value)))}
                    className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-[11px] text-right font-mono text-rose-800"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddPartner(false);
                    setQuickAddError('');
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs transition cursor-pointer"
                  id="btn-quick-add-cancel"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
                  id="btn-quick-add-submit"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đăng ký & Chọn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD INVENTORY ITEM MODAL DIALOG */}
      {showQuickAddItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="modal-quick-add-item">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Đăng ký Vật tư / Hàng hóa mới</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Bổ sung nhanh mã danh mục vật tư hàng hóa vào kho</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuickAddItem(false);
                  setQuickAddItemError('');
                  setQuickAddItemTargetIndex(null);
                }}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-650 rounded-xl transition cursor-pointer"
                id="btn-close-quickadd-item"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleQuickAddItemSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {quickAddItemError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-650 flex items-center gap-1.5 font-medium animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{quickAddItemError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mã vật tư <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CHIPOLY.400"
                    value={newItemCode}
                    onChange={(e) => {
                      setNewItemCode(e.target.value.toUpperCase());
                      setQuickAddItemError('');
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-550 font-bold"
                  />
                  <span className="text-[9px] text-slate-400 block font-normal">Duy nhất, viết liền không dấu</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tài khoản kho hạch toán</label>
                  <select
                    value={newItemAccount}
                    onChange={(e) => setNewItemAccount(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs focus:outline-none focus:border-indigo-300 font-medium"
                  >
                    <option value="152">152 - Nguyên liệu, vật liệu</option>
                    <option value="156">156 - Hàng hóa</option>
                    <option value="155">155 - Thành phẩm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tên vật tư / Hàng hóa <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chỉ may Polyester 40/2 bền chắc"
                    value={newItemName}
                    onChange={(e) => {
                      setNewItemName(e.target.value);
                      setQuickAddItemError('');
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs focus:outline-none focus:border-indigo-300"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Đơn vị tính <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cuộn, Mét, Kg"
                    value={newItemUnit}
                    onChange={(e) => {
                      setNewItemUnit(e.target.value);
                      setQuickAddItemError('');
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs focus:outline-none focus:border-indigo-300"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-1 grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Số lượng đầu kỳ</label>
                  <input
                    type="number"
                    min={0}
                    value={newItemOpeningQty}
                    onChange={(e) => setNewItemOpeningQty(Math.abs(Number(e.target.value)))}
                    className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-[11px] text-right font-mono text-emerald-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Giá trị tồn đầu kỳ (vnđ)</label>
                  <input
                    type="number"
                    min={0}
                    value={newItemOpeningValue}
                    onChange={(e) => setNewItemOpeningValue(Math.abs(Number(e.target.value)))}
                    className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-[11px] text-right font-mono text-indigo-800"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddItem(false);
                    setQuickAddItemError('');
                    setQuickAddItemTargetIndex(null);
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs transition cursor-pointer"
                  id="btn-quick-add-item-cancel"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
                  id="btn-quick-add-item-submit"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đăng ký & Chọn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
