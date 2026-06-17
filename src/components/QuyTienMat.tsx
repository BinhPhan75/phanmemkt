/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAccounting } from '../utils/accountingState';
import { AccountingTransaction } from '../types';
import { FileDown, FileUp, Printer, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Users, Plus, X, CreditCard } from 'lucide-react';

export default function QuyTienMat() {
  const { transactions, partners, accounts, addTransaction, addPartner, companyInfo } = useAccounting() as any;
  const [selectedAcc, setSelectedAcc] = useState<'111' | '112'>('111');
  const [filterStartDate, setFilterStartDate] = useState('2026-06-01');
  const [filterEndDate, setFilterEndDate] = useState('2026-06-30');
  
  // Voucher Printing state
  const [printVoucher, setPrintVoucher] = useState<any | null>(null);

  // New voucher entry form state
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherType, setVoucherType] = useState<'PT' | 'PC' | 'BN' | 'BC'>('PT');
  const [formDate, setFormDate] = useState('2026-06-15');
  const [formPartnerCode, setFormPartnerCode] = useState('');
  const [formReciprocalAcc, setFormReciprocalAcc] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');

  // Quick Add Partner states
  const [showQuickAddPartner, setShowQuickAddPartner] = useState(false);
  const [newPartnerCode, setNewPartnerCode] = useState('');
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerAddress, setNewPartnerAddress] = useState('');
  const [newPartnerTaxCode, setNewPartnerTaxCode] = useState('');
  const [newPartnerType, setNewPartnerType] = useState<'CUSTOMER' | 'VENDOR' | 'BOTH'>('BOTH');

  const formatDateDMY = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // dd/mm/yyyy
    }
    return dateStr;
  };

  const generateVoucherNo = (prefix: 'PT' | 'PC' | 'BN' | 'BC') => {
    const currentYear = filterStartDate.split('-')[0] || '2026';
    const prefixFull = `${prefix}/${currentYear}/`; // e.g. "PT/2026/"
    
    let maxSeq = 0;
    transactions.forEach((tx: any) => {
      const code = tx.type === 'HOADON' ? tx.soHD : tx.soCT;
      if (code && code.startsWith(prefixFull)) {
        const part = code.substring(prefixFull.length);
        const parsed = parseInt(part, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      } else if (code && code.includes(`/${currentYear}/`)) {
        if (code.startsWith(prefix)) {
          const parts = code.split('/');
          const lastPart = parts[parts.length - 1];
          const parsed = parseInt(lastPart, 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }
    });
    
    const nextSeq = maxSeq + 1;
    const seqStr = nextSeq.toString().padStart(3, '0'); // e.g., "001", "002"
    return `${prefixFull}${seqStr}`;
  };

  const openVoucherModal = (type: 'PT' | 'PC' | 'BN' | 'BC') => {
    setVoucherType(type);
    setFormDate('2026-06-15');

    if (partners && partners.length > 0) {
      setFormPartnerCode(partners[0].code);
    } else {
      setFormPartnerCode('');
    }

    if (type === 'PT' || type === 'BC') {
      setFormReciprocalAcc('131');
    } else {
      setFormReciprocalAcc('331');
    }

    setFormAmount('');
    setFormDescription(
      type === 'PT' ? 'Thu tiền bán hàng / Khách hàng thanh toán' :
      type === 'PC' ? 'Chi thanh toán tiền hàng cho Nhà cung cấp' :
      type === 'BC' ? 'Báo có lãi tiền gửi / Khách hàng chuyển khoản' :
      'Thanh toán nợ vay / Chi thanh toán dịch vụ bằng TGNH'
    );
    setShowVoucherModal(true);
  };

  const handleAddVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      alert('Vui lòng nhập số tiền lớn hơn 0');
      return;
    }

    const typePrefix = voucherType;
    const generatedNo = generateVoucherNo(typePrefix);

    const isReceipt = (typePrefix === 'PT' || typePrefix === 'BC');
    const cashOrBankAcc = selectedAcc === '111' ? '111' : '112';
    const cashOrBankName = selectedAcc === '111' ? 'Tiền mặt' : 'Tiền gửi ngân hàng';
    const reciprocalAccName = accounts.find((a: any) => a.code === formReciprocalAcc)?.name || 'Tài khoản đối ứng';

    const newTx: any = {
      id: `TX-${Date.now()}`,
      type: 'PHIEUKT',
      ngayCT: formDate,
      ngayGS: formDate,
      soCT: generatedNo,
      maKH: formPartnerCode,
      dienGiai: formDescription,
      lines: [
        {
          id: `L-${Date.now()}-1`,
          loaiTK: isReceipt ? 'No' : 'Co',
          soTK: cashOrBankAcc,
          tenTK: cashOrBankName,
          psNo: isReceipt ? Number(formAmount) : 0,
          psCo: isReceipt ? 0 : Number(formAmount),
          dienGiai: formDescription
        },
        {
          id: `L-${Date.now()}-2`,
          loaiTK: isReceipt ? 'Co' : 'No',
          soTK: formReciprocalAcc,
          tenTK: reciprocalAccName,
          psNo: isReceipt ? 0 : Number(formAmount),
          psCo: isReceipt ? Number(formAmount) : 0,
          dienGiai: formDescription
        }
      ]
    };

    addTransaction(newTx);
    setShowVoucherModal(false);
    alert(`Đã lập thành công chứng từ ${generatedNo}!`);
  };

  // Derive ledger lines (Cash or Bank)
  const getLedgerLines = () => {
    const lines: Array<{
      date: string;
      docNo: string;
      description: string;
      partnerName: string;
      recAcc: string; // Corresponding Account
      debit: number;
      credit: number;
      originalTxRef: AccountingTransaction;
    }> = [];

    transactions.forEach(tx => {
      const dbDate = tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT;
      if (dbDate < filterStartDate || dbDate > filterEndDate) return;

      if (tx.type === 'HOADON') {
        const partnerObj = partners.find(p => p.code === tx.maKH);
        const partnerName = partnerObj ? partnerObj.name : tx.maKH;

        // Sum of all items in invoice
        const totalBase = tx.items.reduce((sum, item) => sum + item.thanhTien, 0);
        const totalTax = tx.items.reduce((sum, item) => sum + item.tienThue, 0);
        const totalValue = totalBase + totalTax;

        if (tx.loaiHD === 'BR') {
          // Sales: Debit tkNo (could be 111 or 112), Credit tkCo 511
          if (tx.tkNo.startsWith(selectedAcc)) {
            lines.push({
              date: dbDate,
              docNo: tx.soHD,
              description: tx.dienGiai,
              partnerName,
              recAcc: tx.tkCo,
              debit: totalValue,
              credit: 0,
              originalTxRef: tx
            });
          }
        } else {
          // Purchases: Debit 152/156/642, Credit tkCo (could be 111 or 112)
          if (tx.tkCo.startsWith(selectedAcc)) {
            lines.push({
              date: dbDate,
              docNo: tx.soHD,
              description: tx.dienGiai,
              partnerName,
              recAcc: tx.tkNo,
              debit: 0,
              credit: totalValue,
              originalTxRef: tx
            });
          }
        }
      } else {
        // Journal Voucher (Double entry matches per line)
        // Find if any line contains selectedAccount
        tx.lines.forEach(line => {
          if (line.soTK.startsWith(selectedAcc)) {
            // Find opposite account lines to show as Reciprocal Account (TK Đối ứng)
            const recs = tx.lines.filter(l => l.soTK !== line.soTK && l.loaiTK !== line.loaiTK);
            const recAccStr = recs.map(r => r.soTK).join(', ') || '331';

            const partnerObj = partners.find(p => p.code === tx.maKH);
            const partnerName = partnerObj ? partnerObj.name : tx.maKH || 'Không rõ';

            lines.push({
              date: dbDate,
              docNo: tx.soCT,
              description: line.dienGiai || tx.dienGiai,
              partnerName,
              recAcc: recAccStr,
              debit: line.psNo,
              credit: line.psCo,
              originalTxRef: tx
            });
          }
        });
      }
    });

    // Sort chronologically
    return lines.sort((a, b) => a.date.localeCompare(b.date));
  };

  const currentLines = getLedgerLines();

  // Financial Stats
  const openingBalance = selectedAcc === '111' ? 154000000 : 320000000;
  const totalDebit = currentLines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = currentLines.reduce((sum, l) => sum + l.credit, 0);
  const endingBalance = openingBalance + totalDebit - totalCredit;

  // Handle click to print a voucher
  const handlePrint = (line: any) => {
    const isThu = line.debit > 0;
    const printData = {
      isThu,
      title: isThu ? 'PHIẾU THU' : 'PHIẾU CHI',
      voucherNo: line.docNo,
      date: line.date,
      partnerName: line.partnerName,
      address: partners.find(p => p.name === line.partnerName)?.address || 'Hải Lăng, Quảng Trị',
      reason: line.description,
      amount: isThu ? line.debit : line.credit,
      accountNo: selectedAcc,
      reciprocalAcc: line.recAcc,
    };
    setPrintVoucher(printData);
  };

  // Convert numbers to text Viet phrase (Simplified standard Vietnamese currency converter)
  const numberToVietnameseWords = (num: number): string => {
    if (num === 0) return 'Không đồng';
    const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const places = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
    
    // Help helper function
    const numToWordsLessThanThousand = (val: number): string => {
      let text = '';
      const hundred = Math.floor(val / 100);
      const ten = Math.floor((val % 100) / 10);
      const unit = val % 10;
      
      if (hundred > 0) {
        text += units[hundred] + ' trăm ';
      }
      
      if (ten > 1) {
        text += units[ten] + ' mươi ';
        if (unit === 1) text += 'mốt';
        else if (unit === 5) text += 'lăm';
        else if (unit > 0) text += units[unit];
      } else if (ten === 1) {
        text += 'mười ';
        if (unit === 1) text += 'một';
        else if (unit === 5) text += 'lăm';
        else if (unit > 0) text += units[unit];
      } else if (ten === 0 && unit > 0) {
        if (hundred > 0) text += 'lẻ ';
        text += units[unit];
      }
      return text.trim();
    };

    let wordStr = '';
    let groupCount = 0;
    while (num > 0) {
      const part = num % 1000;
      if (part > 0) {
        const partText = numToWordsLessThanThousand(part);
        wordStr = partText + ' ' + places[groupCount] + ' ' + wordStr;
      }
      num = Math.floor(num / 1000);
      groupCount++;
    }
    
    // Capitalize first letter
    const finalStr = wordStr.trim().replace(/\s+/g, ' ') + ' đồng chẵn.';
    return finalStr.charAt(0).toUpperCase() + finalStr.slice(1);
  };

  return (
    <div className="space-y-6" id="qy-tien-mat-panel">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Wallet className="w-6 h-6" />
            </span>
            Kế toán Quỹ Tiền Mặt & Tiền Gửi Ngân Hàng
          </h2>
          <p className="text-sm text-slate-500 mt-1">Phân hệ theo dõi ngân lưu Thu/Chi, quản lý in phiếu và sổ quỹ theo Thông tư 133</p>
        </div>

        {/* Ledger Toggle Switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setSelectedAcc('111')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              selectedAcc === '111' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="switch-to-111"
          >
            Sổ Quỹ Tiền Mặt (TK 111)
          </button>
          <button
            onClick={() => setSelectedAcc('112')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              selectedAcc === '112' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="switch-to-112"
          >
            Sổ Quỹ Tiền Gửi (TK 112)
          </button>
        </div>
      </div>

      {/* Date Filters & Excel Export Buttons */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 mb-1">Từ Ngày</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 mb-1">Đến Ngày</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="text-sm font-mono text-slate-500 flex gap-2">
          <span>Khóa Sổ: Tháng 06/2026</span>
          <span className="text-emerald-500 font-semibold">• Đã cân đối</span>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-amber-50/75 p-5 rounded-2xl border border-amber-100 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Dư đầu kỳ</span>
          <span className="text-2xl font-bold font-mono text-amber-950 mt-1 block">
            {openingBalance.toLocaleString()} <span className="text-sm font-normal">đ</span>
          </span>
          <span className="text-xs text-amber-600 mt-2 block">Dữ liệu kết chuyển 31/05</span>
        </div>

        <div className="bg-emerald-50/75 p-5 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Phát sinh tăng (Thu)</span>
              <span className="text-2xl font-bold font-mono text-emerald-950 mt-1 block">
                {totalDebit.toLocaleString()} <span className="text-sm font-normal">đ</span>
              </span>
            </div>
            <ArrowUpRight className="w-5 h-5 text-emerald-600 bg-emerald-100 rounded-lg p-0.5" />
          </div>
          <span className="text-xs text-emerald-600 mt-2 block">Tổng cộng quỹ nạp</span>
        </div>

        <div className="bg-rose-50/75 p-5 rounded-2xl border border-rose-100 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block">Phát sinh giảm (Chi)</span>
              <span className="text-2xl font-bold font-mono text-rose-950 mt-1 block">
                {totalCredit.toLocaleString()} <span className="text-sm font-normal">đ</span>
              </span>
            </div>
            <ArrowDownRight className="w-5 h-5 text-rose-600 bg-rose-100 rounded-lg p-0.5" />
          </div>
          <span className="text-xs text-rose-600 mt-2 block">Tổng chi hạch toán kỳ</span>
        </div>

        <div className="bg-blue-50/75 p-5 rounded-2xl border border-blue-100 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">Dư cuối kỳ</span>
          <span className="text-2xl font-bold font-mono text-blue-950 mt-1 block">
            {endingBalance.toLocaleString()} <span className="text-sm font-normal">đ</span>
          </span>
          <span className="text-xs text-blue-600 mt-2 block font-semibold">Tồn quỹ hiện tại</span>
        </div>
      </div>

      {/* Ledger Table Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2" id="ledger-title-text">
              Nhật ký {selectedAcc === '111' ? 'Tiền Mặt Việt Nam (VND)' : 'Tiền Gửi Ngân Hàng (TGNH)'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Hiển thị các giao dịch phát sinh. Các số liệu ngày hiển thị dạng dd/mm/yyyy.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {selectedAcc === '111' ? (
              <>
                <button
                  onClick={() => openVoucherModal('PT')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer active:scale-95 animate-fade-in"
                  id="btn-lap-phieu-thu"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Lập Phiếu Thu
                </button>
                <button
                  onClick={() => openVoucherModal('PC')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer active:scale-95 animate-fade-in"
                  id="btn-lap-phieu-chi"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Lập Phiếu Chi
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openVoucherModal('BC')}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer active:scale-95 animate-fade-in"
                  id="btn-lap-bao-co"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Lập Báo Có
                </button>
                <button
                  onClick={() => openVoucherModal('BN')}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer active:scale-95 animate-fade-in"
                  id="btn-lap-bao-no"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Lập Báo Nợ
                </button>
              </>
            )}
            <span className="px-2.5 py-1 text-slate-600 bg-slate-100 rounded-lg text-xs font-mono font-bold">
              {currentLines.length} dòng
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 px-6">Ngày hạch toán</th>
                <th className="py-4 px-4">Số chứng từ (SCT)</th>
                <th className="py-4 px-6">Diễn giải nội dung hạch toán</th>
                <th className="py-4 px-6">Đối tác giao dịch</th>
                <th className="py-4 px-3 text-center">TK Đối ứng</th>
                <th className="py-4 px-6 text-right">Phát sinh Nợ (Thu)</th>
                <th className="py-4 px-6 text-right">Phát sinh Có (Chi)</th>
                <th className="py-4 px-6 text-center">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-700 font-medium">
              {currentLines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-normal">
                    Không có phát sinh thu chi nào trong kỳ lọc.
                  </td>
                </tr>
              ) : (
                currentLines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-mono text-xs text-slate-600">{formatDateDMY(line.date)}</td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs">{line.docNo}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-normal max-w-sm truncate">{line.description}</td>
                    <td className="py-4 px-6 font-normal truncate max-w-xs">{line.partnerName}</td>
                    <td className="py-4 px-3 text-center font-mono text-xs text-indigo-600 font-bold bg-indigo-50/50 rounded-md py-0.5 mx-auto block w-fit">
                      {line.recAcc}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-emerald-600">
                      {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-rose-600">
                      {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handlePrint(line)}
                        className="p-1 px-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
                        id={`print-${line.docNo}-${idx}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        In Phiếu
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Sum footer */}
            <tfoot className="bg-slate-50/75 border-t border-slate-100 font-bold font-mono text-slate-800 text-sm">
              <tr>
                <td colSpan={5} className="py-4 px-6 text-right text-slate-500 font-serif">Tổng cộng phát sinh lũy kế:</td>
                <td className="py-4 px-6 text-right text-emerald-700">{totalDebit.toLocaleString()}</td>
                <td className="py-4 px-6 text-right text-rose-700">{totalCredit.toLocaleString()}</td>
                <td></td>
              </tr>
              <tr className="border-t border-slate-200 bg-slate-100/50">
                <td colSpan={5} className="py-4 px-6 text-right text-slate-500 font-serif">Tồn quỹ cuối kỳ kết toán (A + B - C):</td>
                <td colSpan={2} className="py-4 px-6 text-right text-indigo-700 text-base">{endingBalance.toLocaleString()} đ</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* INPUT VOUCHER MODAL OVERLAY */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden" id="add-voucher-modal">
            {/* Header */}
            <div className={`p-4 border-b text-white flex items-center justify-between ${
              voucherType === 'PT' ? 'bg-emerald-600' :
              voucherType === 'PC' ? 'bg-rose-600' :
              voucherType === 'BC' ? 'bg-blue-600' : 'bg-indigo-600'
            }`}>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 animate-pulse" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  {voucherType === 'PT' ? 'Lập Phiếu Thu Tiền Mặt' :
                   voucherType === 'PC' ? 'Lập Phiếu Chi Tiền Mặt' :
                   voucherType === 'BC' ? 'Hạch toán Báo Có Ngân Hàng' : 'Hạch toán Báo Nợ Ngân Hàng'}
                </h3>
              </div>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="text-white/90 hover:text-white hover:bg-white/10 p-1 rounded-lg transition"
                id="close-add-voucher"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddVoucherSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Số Chứng Từ (Số Phiếu Tự Sinh):
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`${generateVoucherNo(voucherType)} (Tự sinh khi lưu)`}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 text-slate-600 rounded-lg border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Ngày Hạch Toán:
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 bg-slate-50 hover:bg-white focus:bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Tài khoản đối ứng:
                  </label>
                  <select
                    value={formReciprocalAcc}
                    onChange={(e) => setFormReciprocalAcc(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 bg-slate-50 hover:bg-white focus:bg-white font-bold"
                  >
                    {accounts.filter((acc: any) => acc.code !== '111' && acc.code !== '112').map((acc: any) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Giá trị Giao dịch (VND):
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-semibold font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 bg-slate-50 hover:bg-white focus:bg-white text-slate-800"
                  placeholder="Nhập số tiền phát sinh..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Đối tác giao dịch:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const willShow = !showQuickAddPartner;
                      setShowQuickAddPartner(willShow);
                      if (willShow && !newPartnerCode) {
                        const prefix = (voucherType === 'PT' || voucherType === 'BC') ? '131-' : '331-';
                        setNewPartnerCode(`${prefix}NEW-${Date.now().toString().slice(-4)}`);
                      }
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-0.5 cursor-pointer"
                  >
                    {showQuickAddPartner ? '× Đóng thêm nhanh' : '+ Thêm nhanh đối tác'}
                  </button>
                </div>
                <select
                  value={formPartnerCode}
                  onChange={(e) => setFormPartnerCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 bg-slate-50 hover:bg-white focus:bg-white font-medium"
                >
                  {partners.map((p: any) => (
                    <option key={p.code} value={p.code}>
                      [{p.code}] - {p.name}
                    </option>
                  ))}
                  <option value="KHAC">Đối tác Khác / Lẻ thường trú</option>
                </select>

                {showQuickAddPartner && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2.5 mt-2 animate-fade-in transition-all">
                    <div className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest pb-1 border-b border-indigo-100 flex items-center justify-between">
                      <span>Thêm nhanh đối tác mới</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Lập danh mục</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Mã đối tác (ID):</label>
                        <input
                          type="text"
                          value={newPartnerCode}
                          onChange={(e) => setNewPartnerCode(e.target.value.toUpperCase())}
                          placeholder="Ví dụ: 131-ANHDUONG"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Tên đối tác / Thương hiệu:</label>
                        <input
                          type="text"
                          value={newPartnerName}
                          onChange={(e) => setNewPartnerName(e.target.value)}
                          placeholder="Tên đối tác..."
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white font-semibold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Mã số thuế (nếu có):</label>
                        <input
                          type="text"
                          value={newPartnerTaxCode}
                          onChange={(e) => setNewPartnerTaxCode(e.target.value)}
                          placeholder="Mã số thuế..."
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Phân loại liên kết:</label>
                        <select
                          value={newPartnerType}
                          onChange={(e: any) => setNewPartnerType(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white font-bold"
                        >
                          <option value="CUSTOMER">Khách hàng (131)</option>
                          <option value="VENDOR">Nhà cung cấp (331)</option>
                          <option value="BOTH">Tất cả (BOTH)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Địa chỉ trụ sở:</label>
                      <input
                        type="text"
                        value={newPartnerAddress}
                        onChange={(e) => setNewPartnerAddress(e.target.value)}
                        placeholder="Nhập địa chỉ..."
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickAddPartner(false);
                          setNewPartnerCode('');
                          setNewPartnerName('');
                          setNewPartnerAddress('');
                          setNewPartnerTaxCode('');
                        }}
                        className="px-2.5 py-1 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 rounded font-bold transition cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newPartnerCode.trim() || !newPartnerName.trim()) {
                            alert('Vui lòng nhập đầy đủ Mã đối tác và Tên đối tác!');
                            return;
                          }
                          const duplicated = partners.some((p: any) => p.code.toLowerCase() === newPartnerCode.trim().toLowerCase());
                          if (duplicated) {
                            alert('Mã đối tác này đã tồn tại trong danh mục!');
                            return;
                          }
                          const freshPartner = {
                            id: newPartnerCode.trim().toUpperCase(),
                            code: newPartnerCode.trim().toUpperCase(),
                            name: newPartnerName.trim(),
                            address: newPartnerAddress.trim(),
                            taxCode: newPartnerTaxCode.trim(),
                            type: newPartnerType,
                            openingDebit: 0,
                            openingCredit: 0
                          };
                          addPartner(freshPartner);
                          setFormPartnerCode(freshPartner.code);
                          setShowQuickAddPartner(false);
                          setNewPartnerCode('');
                          setNewPartnerName('');
                          setNewPartnerAddress('');
                          setNewPartnerTaxCode('');
                          alert(`Đã thêm nhanh đối tác [${freshPartner.code}] thành công và tự động chọn.`);
                        }}
                        className="px-3 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded font-extrabold shadow-sm transition cursor-pointer"
                      >
                        Xác nhận thêm
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Diễn giải nội dung giao dịch:
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 bg-slate-50 hover:bg-white focus:bg-white text-slate-700 h-16 resize-none font-medium"
                  placeholder="Nhập nội dung cho chứng từ..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition text-xs font-bold cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-lg transition text-xs font-black shadow-xs cursor-pointer flex items-center gap-1 hover:shadow-md ${
                    voucherType === 'PT' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    voucherType === 'PC' ? 'bg-rose-600 hover:bg-rose-700' :
                    voucherType === 'BC' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                  id="btn-save-new-voucher"
                >
                  Lưu & Duyệt Chứng Từ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT DIALOG PREVIEW MODAL */}
      {printVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden" id="print-voucher-modal">
            {/* Modal actions */}
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Xem thử bản in chứng từ kế toán</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In Ngay (Print)
                </button>
                <button
                  onClick={() => setPrintVoucher(null)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300 transition cursor-pointer"
                  id="close-print-modal"
                >
                  Đóng lại
                </button>
              </div>
            </div>

            {/* Printing Sheet Section */}
            <div className="p-8 pb-12 font-serif text-slate-800 bg-white" id="voucher-print-area">
              <div className="flex justify-between items-start border-b border-dotted pb-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 font-sans uppercase">
                    {companyInfo?.name || 'CÔNG TY TNHH BÌNH PHAN PHÁT'}
                  </h4>
                  <p className="text-xs font-sans text-slate-500 mt-0.5">
                    Địa chỉ: {companyInfo?.address || 'Thị trấn Diên Sanh, Hải Lăng, Quảng Trị'}
                  </p>
                  <p className="text-xs font-sans text-slate-500">
                    Mã số thuế: {companyInfo?.taxCode || '3200112233'}
                  </p>
                </div>
                <div className="text-right">
                  <h5 className="font-bold text-xs uppercase font-sans">Mẫu số 01-TT</h5>
                  <p className="text-[10px] font-sans text-slate-400 leading-none italic">(Ban hành theo Thông tư số 133/2016/TT-BTC</p>
                  <p className="text-[10px] font-sans text-slate-400 italic">Ngày 26/08/2016 của Bộ Tài chính)</p>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center my-6 space-y-1">
                <h3 className="text-2xl font-bold text-slate-900 tracking-wide uppercase">{printVoucher.title}</h3>
                <p className="text-xs text-slate-500 italic">Ngày lập chứng từ: {formatDateDMY(printVoucher.date)}</p>
                <p className="text-xs font-mono font-bold text-slate-700">Quyển số: Q02/2026 | Số chứng từ: {printVoucher.voucherNo}</p>
              </div>

              {/* Voucher details block */}
              <div className="text-sm space-y-2 mt-4">
                <div className="flex">
                  <span className="w-48 text-slate-500 italic">Họ và tên người {printVoucher.isThu ? 'nộp tiền' : 'nhận tiền'}:</span>
                  <span className="font-bold border-b border-dotted border-slate-300 flex-1">{printVoucher.partnerName}</span>
                </div>
                <div className="flex">
                  <span className="w-48 text-slate-500 italic">Địa chỉ giao dịch:</span>
                  <span className="border-b border-dotted border-slate-300 flex-1">{printVoucher.address}</span>
                </div>
                <div className="flex">
                  <span className="w-48 text-slate-500 italic">Lý do giao dịch quỹ:</span>
                  <span className="border-b border-dotted border-slate-300 flex-1">{printVoucher.reason}</span>
                </div>
                <div className="flex">
                  <span className="w-48 text-slate-500 italic">Số tiền giao dịch:</span>
                  <span className="font-bold border-b border-dotted border-slate-300 flex-1 text-slate-900 text-base">
                    {printVoucher.amount.toLocaleString()} VND
                  </span>
                </div>
                <div className="flex">
                  <span className="w-48 text-slate-500 italic">Bằng chữ viết:</span>
                  <span className="font-semibold border-b border-dotted border-slate-300 flex-1 italic text-slate-700">
                    {numberToVietnameseWords(printVoucher.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-6 pt-1 text-xs font-sans text-slate-500">
                  <span>Tài khoản ghi Nợ: <strong className="text-slate-800 font-mono text-sm underline">{printVoucher.isThu ? printVoucher.accountNo : printVoucher.reciprocalAcc}</strong></span>
                  <span>Tài khoản ghi Có: <strong className="text-slate-800 font-mono text-sm underline">{printVoucher.isThu ? printVoucher.reciprocalAcc : printVoucher.accountNo}</strong></span>
                </div>
              </div>

              {/* Signatures Row */}
              <div className="grid grid-cols-4 gap-4 mt-8 text-center text-xs font-sans pt-4 border-t border-slate-100">
                <div className="space-y-12">
                  <span className="font-bold text-slate-800 uppercase block">Thủ trưởng Đơn vị</span>
                  <span className="text-slate-400 italic block">(Ký, họ và tên, đóng dấu)</span>
                </div>
                <div className="space-y-12">
                  <span className="font-bold text-slate-800 uppercase block">Kế toán Trưởng</span>
                  <span className="text-slate-400 italic block">(Ký, họ và tên)</span>
                </div>
                <div className="space-y-12">
                  <span className="font-bold text-slate-800 uppercase block">Người nộp/Nhận tiền</span>
                  <span className="text-slate-400 italic block">(Ký, họ và tên)</span>
                </div>
                <div className="space-y-12">
                  <span className="font-bold text-slate-800 uppercase block">Thủ quỹ / Kiểm ngân</span>
                  <span className="text-slate-400 italic block">(Ký, họ và tên, thủ quỹ chi)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
