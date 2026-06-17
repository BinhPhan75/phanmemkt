/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAccounting } from '../utils/accountingState';
import { InventoryItem, Partner, AccountingTransaction } from '../types';
import { PlusCircle, FileSpreadsheet, Trash2, CheckCircle2, AlertTriangle, ListCollapse } from 'lucide-react';

export default function NhapLieu() {
  const { partners, items, accounts, addTransaction } = useAccounting();

  const [activeEntryType, setActiveEntryType] = useState<'HOADON' | 'PHIEUKT'>('HOADON');

  // ==========================================
  // Form state for: DATA ENTRY - INVOICES (HOADON)
  // ==========================================
  const [loaiHD, setLoaiHD] = useState<'BR' | 'MV'>('BR');
  const [soHD, setSoHD] = useState('');
  const [kyHieuHD, setKyHieuHD] = useState('BM/26E');
  const [ngayHD, setNgayHD] = useState('2026-06-17');
  const [maKH, setMaKH] = useState('');
  const [dienGiaiHD, setDienGiaiHD] = useState('');
  
  // Standard account mapping presets
  const [tkNoHD, setTkNoHD] = useState('131');
  const [tkCoHD, setTkCoHD] = useState('511');
  
  // Cost of goods sold presets (for Sales invoice)
  const [tkGiaVonNo, setTkGiaVonNo] = useState('632');
  const [tkGiaVonCo, setTkGiaVonCo] = useState('156');

  // List of items in current Invoice
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
    const updated = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(updated);
  };

  const handleUpdateInvoiceItem = (index: number, field: string, value: any) => {
    const nextLine = { ...invoiceItems[index], [field]: value };
    
    // Auto calculate aggregates
    if (field === 'maHang') {
      const selectedItem = items.find(i => i.code === value);
      if (selectedItem) {
        // Fallback standard average price if any
        nextLine.donGia = 25000; 
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
    if (!soHD) {
      alert('Vui lòng nhập số hóa đơn!');
      return;
    }
    if (!maKH) {
      alert('Vui lòng chọn đối tác!');
      return;
    }
    if (invoiceItems.some(i => !i.maHang || i.soLuong <= 0)) {
      alert('Vui lòng kiểm tra lại danh sách vật tư mặt hàng (Mã và số lượng phải lớn hơn 0)!');
      return;
    }

    const newTx: AccountingTransaction = {
      id: `TX-${Date.now()}`,
      type: 'HOADON',
      loaiHD,
      soHD,
      kyHieuHD,
      ngayHD,
      maKH,
      dienGiai: dienGiaiHD || (loaiHD === 'BR' ? `Xuất hóa đơn bán lẻ bán hàng - ${soHD}` : `Nhận hóa đơn vật tư mua vào - ${soHD}`),
      tkNo: tkNoHD,
      tkCo: tkCoHD,
      tkGiaVonNo: loaiHD === 'BR' ? tkGiaVonNo : undefined,
      tkGiaVonCo: loaiHD === 'BR' ? tkGiaVonCo : undefined,
      items: invoiceItems
    };

    addTransaction(newTx);
    alert('Hạch toán Ghi sổ Hóa đơn mua bán thành công!');
    
    // Clear form
    setSoHD('');
    setDienGiaiHD('');
    setInvoiceItems([{ maHang: 'CHI202.300', soLuong: 100, donGia: 25000, thueSuat: 10, thanhTien: 2500000, tienThue: 250000 }]);
  };


  // ==========================================
  // Form state for: DATA ENTRY - JOURNAL VOUCHERS (PHIEUKT)
  // ==========================================
  const [soCT, setSoCT] = useState('');
  const [ngayCT, setNgayCT] = useState('2026-06-17');
  const [dienGiaiCT, setDienGiaiCT] = useState('');
  const [maKH_CT, setMaKH_CT] = useState('');

  // Sub entries lines
  const [voucherLines, setVoucherLines] = useState<Array<{
    soTK: string;
    loaiTK: 'No' | 'Co';
    psNo: number;
    psCo: number;
    dienGiai?: string;
  }>>([
    { soTK: '6422', loaiTK: 'No', psNo: 1500000, psCo: 0, dienGiai: 'Chi điện văn phòng' },
    { soTK: '111', loaiTK: 'Co', psNo: 0, psCo: 1500000, dienGiai: 'Chi điện bằng tiền mặt tại quỹ' }
  ]);

  const handleAddVoucherLine = () => {
    setVoucherLines([...voucherLines, { soTK: '', loaiTK: 'No', psNo: 0, psCo: 0, dienGiai: '' }]);
  };

  const handleRemoveVoucherLine = (index: number) => {
    setVoucherLines(voucherLines.filter((_, i) => i !== index));
  };

  const handleUpdateVoucherLine = (index: number, field: string, value: any) => {
    const nextLine = { ...voucherLines[index], [field]: value };
    
    if (field === 'loaiTK') {
      if (value === 'No') {
        nextLine.psCo = 0;
      } else {
        nextLine.psNo = 0;
      }
    }

    if (field === 'psNo') {
      nextLine.psCo = 0;
      nextLine.psNo = Number(value) || 0;
    }
    if (field === 'psCo') {
      nextLine.psNo = 0;
      nextLine.psCo = Number(value) || 0;
    }

    const updated = [...voucherLines];
    updated[index] = nextLine;
    setVoucherLines(updated);
  };

  // Check double entry balance validity
  const sumDebits = voucherLines.filter(l => l.loaiTK === 'No').reduce((s, l) => s + l.psNo, 0);
  const sumCredits = voucherLines.filter(l => l.loaiTK === 'Co').reduce((s, l) => s + l.psCo, 0);
  const isBalanced = sumDebits === sumCredits && sumDebits > 0;

  const handleJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soCT) {
      alert('Vui lòng điền số chứng từ hạch toán!');
      return;
    }
    if (!isBalanced) {
      alert('Phát sinh hạch toán kép bị lệch! Tổng Nợ phải bằng Tổng Có và lớn hơn 0.');
      return;
    }

    const mappedLines = voucherLines.map((l, lIdx) => {
      const parentTkObj = accounts.find(a => a.code === l.soTK);
      return {
        id: `line-${Date.now()}-${lIdx}`,
        loaiTK: l.loaiTK,
        soTK: l.soTK,
        tenTK: parentTkObj ? parentTkObj.name : 'Tài khoản hạch toán',
        psNo: l.psNo,
        psCo: l.psCo,
        dienGiai: l.dienGiai || dienGiaiCT
      };
    });

    const newTx: AccountingTransaction = {
      id: `TX-${Date.now()}`,
      type: 'PHIEUKT',
      soCT,
      ngayCT,
      ngayGS: ngayCT,
      dienGiai: dienGiaiCT,
      maKH: maKH_CT || undefined,
      lines: mappedLines
    };

    addTransaction(newTx);
    alert('Hạch toán Ghi sổ Chứng từ kế toán tổng hợp thành công!');
    
    // Clear Form
    setSoCT('');
    setDienGiaiCT('');
    setVoucherLines([
      { soTK: '6422', loaiTK: 'No', psNo: 0, psCo: 0, dienGiai: '' },
      { soTK: '111', loaiTK: 'Co', psNo: 0, psCo: 0, dienGiai: '' }
    ]);
  };

  return (
    <div className="space-y-6" id="giao-dien-nhap-lieu">
      {/* Header with Selector tab of entry modes */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <PlusCircle className="w-6 h-6" />
            </span>
            Khai báo hạch toán & Nhập liệu Chứng từ
          </h2>
          <p className="text-sm text-slate-500 mt-1">Phân hệ nhập hóa đơn, định khoản công nợ, luân chuyển kho bãi, chi tiêu, kết chuyển sổ cái</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveEntryType('HOADON')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeEntryType === 'HOADON' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="tab-invoice-entry"
          >
            A. Ghi Sổ Hóa Đơn Vạt Tư (MV / BR)
          </button>
          <button
            onClick={() => setActiveEntryType('PHIEUKT')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeEntryType === 'PHIEUKT' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="tab-journal-entry"
          >
            B. Chứng Từ Kế Toán Phức Hợp (Phiếu KT)
          </button>
        </div>
      </div>

      {activeEntryType === 'HOADON' ? (
        // ========================
        // 1. FORM NHẬP HÓA ĐƠN CORES
        // ========================
        <form onSubmit={handleInvoiceSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="font-bold text-slate-800 text-base">Hóa đơn mua vào - bán ra hàng hóa, vật tư</h3>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleSwitchInvoiceType('BR')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                  loaiHD === 'BR' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-800'
                }`}
                id="switch-invoice-br"
              >
                Hóa đơn Bán ra (Doanh Thu)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchInvoiceType('MV')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                  loaiHD === 'MV' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-800'
                }`}
                id="switch-invoice-mv"
              >
                Hóa đơn Mua vào (Vật tư - Chi phí)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Ký hiệu sê-ri</label>
              <input
                type="text"
                required
                placeholder="VD: BM/26E"
                value={kyHieuHD}
                onChange={(e) => setKyHieuHD(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Số hóa đơn</label>
              <input
                type="text"
                required
                placeholder="VD: 0000045"
                value={soHD}
                onChange={(e) => setSoHD(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Ngày hóa đơn</label>
              <input
                type="date"
                required
                value={ngayHD}
                onChange={(e) => setNgayHD(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Đối tác giao dịch</label>
              <select
                required
                value={maKH}
                onChange={(e) => setMaKH(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Chọn khách hàng / NCC --</option>
                {partners.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nội dung diễn giải</label>
            <input
              type="text"
              placeholder={loaiHD === 'BR' ? 'Xuất bán lẻ hàng hóa, dịch vụ theo thỏa thuận' : 'Mua nguyên vật liệu chế biến may mặc chính'}
              value={dienGiaiHD}
              onChange={(e) => setDienGiaiHD(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {/* Account setups */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Thiết lập tài khoản hạch toán</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Tài khoản Nợ (Debit)</label>
                <select
                  value={tkNoHD}
                  onChange={(e) => setTkNoHD(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono font-bold"
                >
                  {accounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Tài khoản Có (Credit)</label>
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
                    <label className="text-xs font-semibold text-slate-500">TK Nợ Giá vốn</label>
                    <select
                      value={tkGiaVonNo}
                      onChange={(e) => setTkGiaVonNo(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono font-bold"
                    >
                      {accounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">TK Có Giá vốn</label>
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

          {/* Lines Table item inputs */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">
              <span className="font-bold">Danh sách Vật tư, Mặt hàng chi tiết</span>
              <button
                type="button"
                onClick={handleAddInvoiceItemLine}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                id="add-invoice-line-btn"
              >
                + Thêm dòng vật tư
              </button>
            </div>

            <div className="space-y-3">
              {invoiceItems.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100 items-end">
                  
                  {/* Select item */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Chọn hàng hóa</label>
                    <select
                      required
                      value={line.maHang}
                      onChange={(e) => handleUpdateInvoiceItem(idx, 'maHang', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-md text-xs"
                    >
                      <option value="">-- Hàng hóa --</option>
                      {items.map(i => (
                        <option key={i.code} value={i.code}>{i.code} - {i.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Qty */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Số lượng</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={line.soLuong}
                      onChange={(e) => handleUpdateInvoiceItem(idx, 'soLuong', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-xs text-right"
                    />
                  </div>

                  {/* Price */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Đơn giá (đ)</label>
                    <input
                      type="number"
                      required
                      value={line.donGia}
                      onChange={(e) => handleUpdateInvoiceItem(idx, 'donGia', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-xs text-right"
                    />
                  </div>

                  {/* VAT tax rate */}
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

                  {/* Math sum calculations */}
                  <div className="md:col-span-2 space-y-1 text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Giá trị hạch toán</span>
                    <span className="text-xs font-mono font-bold block">{line.thanhTien.toLocaleString()} đ</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Thuế: {line.tienThue.toLocaleString()} đ</span>
                  </div>

                  {/* Remove line */}
                  <div className="md:col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveInvoiceItemLine(idx)}
                      disabled={invoiceItems.length === 1}
                      className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                      id={`remove-invoice-line-${idx}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Form action */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              Tổng giá trị: <strong className="text-slate-800 text-sm font-mono">{invoiceItems.reduce((s,i)=>s+i.thanhTien, 0).toLocaleString()} đ</strong> | Thuế GTGT: <strong className="text-slate-800 text-sm font-mono">{invoiceItems.reduce((s,i)=>s+i.tienThue, 0).toLocaleString()} đ</strong>
            </div>
            
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              id="submit-invoice-button"
            >
              <CheckCircle2 className="w-4 h-4" />
              Ghi Sổ Chứng Từ Hóa Đơn
            </button>
          </div>
        </form>
      ) : (
        // ==========================
        // 2. FORM PHIẾU KẾ TOÁN (PHIEUKT)
        // ==========================
        <form onSubmit={handleJournalSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="font-bold text-slate-800 text-base">Chứng từ kế toán tổng hợp (Phiếu hạch toán kép)</h3>
            <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Double entry balanced manual ledger</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Mã số chứng từ</label>
              <input
                type="text"
                required
                placeholder="VD: PKT-05"
                value={soCT}
                onChange={(e) => setSoCT(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Ngày hạch toán</label>
              <input
                type="date"
                required
                value={ngayCT}
                onChange={(e) => setNgayCT(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Đối tác liên quan (Không bắt buộc)</label>
              <select
                value={maKH_CT}
                onChange={(e) => setMaKH_CT(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Không hạch công nợ đối tác --</option>
                {partners.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nội dung diễn giải chứng từ</label>
            <input
              type="text"
              required
              placeholder="Hạch toán trích khấu hao tài sản cố định hoặc chi tiêu tiền khác..."
              value={dienGiaiCT}
              onChange={(e) => setDienGiaiCT(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {/* Balanced Entry post table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">
              <span>Bút toán định khoản (Debit & Credit rows)</span>
              <button
                type="button"
                onClick={handleAddVoucherLine}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                id="add-voucher-line-btn"
              >
                + Thêm bút định khoản
              </button>
            </div>

            <div className="space-y-3">
              {voucherLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100 items-end">
                  
                  {/* TK */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tài khoản</label>
                    <select
                      required
                      value={line.soTK}
                      onChange={(e) => handleUpdateVoucherLine(idx, 'soTK', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono font-bold"
                    >
                      <option value="">-- TK --</option>
                      {accounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>

                  {/* LoaiTK (Debit / Credit) */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Tính chất</label>
                    <select
                      value={line.loaiTK}
                      onChange={(e) => handleUpdateVoucherLine(idx, 'loaiTK', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-sans"
                    >
                      <option value="No">Ghi NỢ (Debit)</option>
                      <option value="Co">Ghi CÓ (Credit)</option>
                    </select>
                  </div>

                  {/* Debit Amount */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Số tiền NỢ (Đ)</label>
                    <input
                      type="number"
                      disabled={line.loaiTK === 'Co'}
                      value={line.psNo}
                      onChange={(e) => handleUpdateVoucherLine(idx, 'psNo', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-xs font-mono text-right text-emerald-800 disabled:opacity-40"
                    />
                  </div>

                  {/* Credit Amount */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Số tiền CÓ (Đ)</label>
                    <input
                      type="number"
                      disabled={line.loaiTK === 'No'}
                      value={line.psCo}
                      onChange={(e) => handleUpdateVoucherLine(idx, 'psCo', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-xs font-mono text-right text-rose-800 disabled:opacity-40"
                    />
                  </div>

                  {/* Description for specific line */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Chi tiết nghiệp vụ</label>
                    <input
                      type="text"
                      placeholder="Chi tiết phụ..."
                      value={line.dienGiai || ''}
                      onChange={(e) => handleUpdateVoucherLine(idx, 'dienGiai', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-xs"
                    />
                  </div>

                  {/* Drop line */}
                  <div className="md:col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveVoucherLine(idx)}
                      disabled={voucherLines.length <= 2}
                      className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                      id={`remove-voucher-line-${idx}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Validation balanced check block */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-slate-100 pt-5 gap-4">
            <div className="flex gap-4 text-xs font-mono">
              <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
                Hiệu ứng Nợ: <strong>{sumDebits.toLocaleString()} đ</strong>
              </div>
              <div className="bg-rose-50 text-rose-800 p-2.5 rounded-lg border border-rose-200">
                Hiệu ứng Có: <strong>{sumCredits.toLocaleString()} đ</strong>
              </div>
            </div>

            {isBalanced ? (
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                Cân đối bút toán thành công!
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100">
                <AlertTriangle className="w-4 h-4" />
                Độ chênh lệch hạch toán: {Math.abs(sumDebits - sumCredits).toLocaleString()} đ
              </div>
            )}

            <button
              type="submit"
              disabled={!isBalanced}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
              id="submit-journal-button"
            >
              Ghi sổ chứng từ phức kép
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
