/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAccounting } from '../utils/accountingState';
import { AccountingTransaction } from '../types';
import { FileDown, FileUp, Printer, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Users } from 'lucide-react';

export default function QuyTienMat() {
  const { transactions, partners } = useAccounting();
  const [selectedAcc, setSelectedAcc] = useState<'111' | '112'>('111');
  const [filterStartDate, setFilterStartDate] = useState('2026-06-01');
  const [filterEndDate, setFilterEndDate] = useState('2026-06-30');
  
  // Voucher Printing state
  const [printVoucher, setPrintVoucher] = useState<any | null>(null);

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
        <div className="p-6 border-b border-rose-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
            Nhật ký {selectedAcc === '111' ? 'Tiền Mặt Việt Nam (VND)' : 'Tiền Gửi Ngân Hàng'}
          </h3>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono">
            {currentLines.length} dòng phát sinh
          </span>
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
                    <td className="py-4 px-6 font-mono text-xs">{line.date}</td>
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
                  <h4 className="font-bold text-sm text-slate-900 font-sans tracking-wide uppercase">CÔNG TY TNHH BÌNH PHAN PHÁT</h4>
                  <p className="text-xs font-sans text-slate-500 mt-0.5">Địa chỉ: Thị trấn Diên Sanh, Hải Lăng, Quảng Trị</p>
                  <p className="text-xs font-sans text-slate-500">Mã số thuế: 3200112233</p>
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
                <p className="text-xs text-slate-500 italic">Ngày lập chứng từ: {printVoucher.date}</p>
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
