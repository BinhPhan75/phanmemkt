/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAccounting } from '../utils/accountingState';
import { Account, AccountingTransaction } from '../types';
import { FileText, Printer, Search, Calendar, FileCheck, RefreshCw } from 'lucide-react';

export default function InAnSoSach() {
  const { transactions, accounts, partners } = useAccounting();
  const [selectedBook, setSelectedBook] = useState<'NKC' | 'SOCAI'>('NKC');
  const [selectedAccCode, setSelectedAccCode] = useState<string>('111');
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  // Decompose all transactions into individual double-entry bookkeeping lines
  // Returns: { date, docNo, description, debitAcc, creditAcc, amount }
  const getDoubleEntries = (): Array<{
    date: string;
    docNo: string;
    description: string;
    debitAcc: string;
    creditAcc: string;
    amount: number;
    partnerCode?: string;
  }> => {
    const entries: any[] = [];

    transactions.forEach(tx => {
      const dbDate = tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT;
      if (dbDate < startDate || dbDate > endDate) return;

      if (tx.type === 'HOADON') {
        const totalBase = tx.items.reduce((s, i) => s + i.thanhTien, 0);
        const totalTax = tx.items.reduce((s, i) => s + i.tienThue, 0);
        const totalValue = totalBase + totalTax;

        if (tx.loaiHD === 'BR') {
          // Sale Posting:
          // 1. Debit tkNo (131/111/112), Credit 511 (Base Amount)
          entries.push({
            date: dbDate,
            docNo: tx.soHD,
            description: tx.dienGiai,
            debitAcc: tx.tkNo,
            creditAcc: tx.tkCo || '511',
            amount: totalBase,
            partnerCode: tx.maKH
          });

          // 2. Debit tkNo (131/111/112), Credit 33311 (VAT Output Amount)
          if (totalTax > 0) {
            entries.push({
              date: dbDate,
              docNo: tx.soHD,
              description: `Thuế GTGT đầu ra bán lẻ hạch toán - ${tx.soHD}`,
              debitAcc: tx.tkNo,
              creditAcc: '33311',
              amount: totalTax,
              partnerCode: tx.maKH
            });
          }

          // 3. COGS: Debit 632, Credit 152/156 (If configured)
          if (tx.tkGiaVonNo && tx.tkGiaVonCo) {
            // Assume 65% of sale price is standard material cost for demo purposes
            const standardCost = Math.round(totalBase * 0.65);
            entries.push({
              date: dbDate,
              docNo: `XKC-${tx.soHD}`,
              description: `Giá vốn hàng cơ bản bán ra - ${tx.soHD}`,
              debitAcc: tx.tkGiaVonNo,
              creditAcc: tx.tkGiaVonCo,
              amount: standardCost,
              partnerCode: tx.maKH
            });
          }
        } else {
          // Purchase Posting:
          // 1. Debit Product tkNo (152/156/642), Credit tkCo (331/111/112)
          entries.push({
            date: dbDate,
            docNo: tx.soHD,
            description: tx.dienGiai,
            debitAcc: tx.tkNo,
            creditAcc: tx.tkCo,
            amount: totalBase,
            partnerCode: tx.maKH
          });

          // 2. Debit 1331 (Vat Input), Credit tkCo (331)
          if (totalTax > 0) {
            entries.push({
              date: dbDate,
              docNo: tx.soHD,
              description: `Thuế GTGT đầu vào khấu trừ - ${tx.soHD}`,
              debitAcc: '1331',
              creditAcc: tx.tkCo,
              amount: totalTax,
              partnerCode: tx.maKH
            });
          }
        }
      } else {
        // Journal Voucher (Double entries directly on lines)
        // Group lines by debit and credit to match double entry
        const debits = tx.lines.filter(l => l.loaiTK === 'No');
        const credits = tx.lines.filter(l => l.loaiTK === 'Co');

        // Match simple & multi-line allocations
        debits.forEach(d => {
          credits.forEach(c => {
            // Distribute amount proportionally or direct match
            const matchedAmount = d.psNo > 0 ? d.psNo : c.psCo;
            entries.push({
              date: dbDate,
              docNo: tx.soCT,
              description: d.dienGiai || tx.dienGiai,
              debitAcc: d.soTK,
              creditAcc: c.soTK,
              amount: matchedAmount,
              partnerCode: tx.maKH
            });
          });
        });
      }
    });

    return entries.sort((a,b) => a.date.localeCompare(b.date));
  };

  const doubleEntries = getDoubleEntries();

  // Create General Ledger (Sổ Cái) lines for the selected account
  const getGeneralLedgerData = () => {
    const acc = accounts.find(a => a.code === selectedAccCode);
    const openingDebit = acc?.openingDebit || 0;
    const openingCredit = acc?.openingCredit || 0;

    const lines: Array<{
      date: string;
      docNo: string;
      description: string;
      recAcc: string; // Corresponding account
      debit: number;
      credit: number;
    }> = [];

    doubleEntries.forEach(ent => {
      if (ent.debitAcc === selectedAccCode || ent.debitAcc.startsWith(selectedAccCode)) {
        lines.push({
          date: ent.date,
          docNo: ent.docNo,
          description: ent.description,
          recAcc: ent.creditAcc,
          debit: ent.amount,
          credit: 0
        });
      } else if (ent.creditAcc === selectedAccCode || ent.creditAcc.startsWith(selectedAccCode)) {
        lines.push({
          date: ent.date,
          docNo: ent.docNo,
          description: ent.description,
          recAcc: ent.debitAcc,
          debit: 0,
          credit: ent.amount
        });
      }
    });

    const totalDebit = lines.reduce((s,l)=> s + l.debit, 0);
    const totalCredit = lines.reduce((s,l)=> s + l.credit, 0);

    // Compute closing balance matching normal balance type of account
    let closingDebit = 0;
    let closingCredit = 0;

    const isDebitBalance = acc?.balanceType === 'DEBIT' || acc?.type === 'ASSET' || acc?.type === 'EXPENSE';
    
    if (isDebitBalance) {
      const balance = openingDebit - openingCredit + totalDebit - totalCredit;
      if (balance > 0) closingDebit = balance;
      else closingCredit = Math.abs(balance);
    } else {
      const balance = openingCredit - openingDebit + totalCredit - totalDebit;
      if (balance > 0) closingCredit = balance;
      else closingDebit = Math.abs(balance);
    }

    return {
      lines: lines.sort((a,b)=> a.date.localeCompare(b.date)),
      openingDebit,
      openingCredit,
      totalDebit,
      totalCredit,
      closingDebit,
      closingCredit
    };
  };

  const ledgerData = getGeneralLedgerData();

  return (
    <div className="space-y-6" id="ketoan-so-book">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <FileText className="w-6 h-6" />
            </span>
            Sổ Sách & Báo Cáo Kế Toán In Ấn
          </h2>
          <p className="text-sm text-slate-500 mt-1">Truy xuất Sổ Nhật Ký chung, Sổ Cái chi tiết các tài khoản đối ứng, kết chuyển chứng từ ghi sổ theo TT 133</p>
        </div>

        {/* Book switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setSelectedBook('NKC')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              selectedBook === 'NKC' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="switch-book-nkc"
          >
            Nhật Ký Chung (NKC)
          </button>
          <button
            onClick={() => setSelectedBook('SOCAI')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              selectedBook === 'SOCAI' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="switch-book-socai"
          >
            Sổ Cái Tài Khoản
          </button>
        </div>
      </div>

      {/* Date Filters Row */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 mb-1">Kỳ hạch toán từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-755 bg-slate-50 focus:outline-none focus:border-slate-800"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-755 bg-slate-50 focus:outline-none focus:border-slate-800"
            />
          </div>

          {selectedBook === 'SOCAI' && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1">Chọn tài khoản xem Sổ Cái</label>
              <select
                value={selectedAccCode}
                onChange={(e) => setSelectedAccCode(e.target.value)}
                className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 font-mono font-bold focus:outline-none focus:border-slate-800"
                id="select-ledger-account"
              >
                {accounts.map(acc => (
                  <option key={acc.code} value={acc.code} className="font-mono">
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Printer className="w-4 h-4" />
          In Toàn Bộ Sổ Sách (PDF)
        </button>
      </div>

      {/* 5A. NHẬT KÝ CHUNG TABLE SHEET */}
      {selectedBook === 'NKC' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="nkc-print-sheet">
          <div className="p-6 border-b border-slate-100 text-center space-y-1">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">SỔ NHẬT KÝ CHUNG</h3>
            <p className="text-xs text-slate-500 italic">Kỳ sổ sách: từ {startDate} đến {endDate}</p>
            <p className="text-[10px] text-slate-400">Đơn vị hạch toán hằng ngày theo Bút toán kép Thông tư 133</p>
          </div>

          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6 text-center w-12">STT</th>
                  <th className="py-3 px-4">Ngày ghi sổ</th>
                  <th className="py-3 px-4">Số chứng từ</th>
                  <th className="py-3 px-6">Diễn giải nội dung bút toán</th>
                  <th className="py-3 px-4 text-center">Tài khoản Nợ</th>
                  <th className="py-3 px-4 text-center">Tài khoản Có</th>
                  <th className="py-3 px-6 text-right">Số tiền hạch toán (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {doubleEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                      Chưa phát sinh nghiệp vụ kinh tế nào trong kỳ lọc sổ.
                    </td>
                  </tr>
                ) : (
                  doubleEntries.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-6 text-center font-mono text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-xs font-normal text-slate-500">{row.date}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded-sm">{row.docNo}</span>
                      </td>
                      <td className="py-3 px-6 font-normal text-slate-650 max-w-sm truncate">{row.description}</td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-emerald-700 font-black">{row.debitAcc}</td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-rose-700 font-black">{row.creditAcc}</td>
                      <td className="py-3 px-6 text-right font-mono text-indigo-700 text-sm font-bold">{row.amount.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr className="font-mono text-slate-800 text-sm">
                  <td colSpan={6} className="py-4 px-6 text-right text-slate-500 font-serif">Tổng phát sinh Nhật ký chung trong kỳ:</td>
                  <td className="py-4 px-6 text-right text-indigo-800 text-base">
                    {doubleEntries.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 5B. SỔ CÁI TÀI KHOẢN SHEET */}
      {selectedBook === 'SOCAI' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="socai-print-sheet">
          <div className="p-6 border-b border-indigo-100 text-center space-y-2 bg-indigo-50/10">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">SỔ CÁI TÀI KHOẢN</h3>
            <div className="font-mono text-sm font-bold text-indigo-700 underline">Số hiệu TK: {selectedAccCode} - {accounts.find(a => a.code === selectedAccCode)?.name}</div>
            <p className="text-xs text-slate-500 italic">Kỳ kết toán: từ {startDate} đến {endDate}</p>
          </div>

          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                {/* Beginning Balance row */}
                <tr className="bg-amber-50 text-amber-950 font-bold text-xs font-mono border-b border-amber-100">
                  <th colSpan={4} className="py-3 px-6 italic text-slate-600 font-serif text-sm">Số dư đầu kỳ hạch toán kết chuyển:</th>
                  <th className="py-3 px-6 text-right text-emerald-800">NỢ: {ledgerData.openingDebit.toLocaleString()} đ</th>
                  <th className="py-3 px-6 text-right text-rose-800" colSpan={2}>CÓ: {ledgerData.openingCredit.toLocaleString()} đ</th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Ngày lập</th>
                  <th className="py-3.5 px-4">Số chứng từ Code</th>
                  <th className="py-3.5 px-6">Nội dung hạch toán Sổ Cái đối xứng</th>
                  <th className="py-3.5 px-4 text-center">TK Đối ứng</th>
                  <th className="py-3.5 px-6 text-right">Phát sinh ghi NỢ (+)</th>
                  <th className="py-3.5 px-6 text-right" colSpan={2}>Phát sinh ghi CÓ (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {ledgerData.lines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                      Tài khoản này chưa phát sinh luân chuyển nợ nào trong kỳ lọc sổ.
                    </td>
                  </tr>
                ) : (
                  ledgerData.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-6 font-mono text-xs font-normal text-slate-500">{line.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-xs">{line.docNo}</td>
                      <td className="py-3.5 px-6 font-normal text-slate-600 max-w-sm truncate">{line.description}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-indigo-600 font-bold bg-indigo-50/60 rounded-md py-0.5 mx-auto block w-fit">{line.recAcc}</td>
                      <td className="py-3.5 px-6 text-right font-mono text-emerald-600">
                        {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-rose-600" colSpan={2}>
                        {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot className="divide-y divide-slate-150 font-bold border-t border-slate-200 text-sm font-mono text-slate-800">
                <tr className="bg-slate-50/50">
                  <td colSpan={4} className="py-3 px-6 text-right text-slate-500 font-serif">Cộng phát sinh lũy kế kỳ này:</td>
                  <td className="py-3 px-6 text-right text-emerald-700 font-black">{ledgerData.totalDebit.toLocaleString()} đ</td>
                  <td className="py-3 px-6 text-right text-rose-700 font-black" colSpan={2}>{ledgerData.totalCredit.toLocaleString()} đ</td>
                </tr>
                <tr className="bg-indigo-50/50 text-indigo-950">
                  <td colSpan={4} className="py-4 px-6 text-right text-indigo-950 font-serif">Số dư cuối kỳ kết toán:</td>
                  <td className="py-4 px-6 text-right text-emerald-800 text-base font-black">NỢ: {ledgerData.closingDebit.toLocaleString()} đ</td>
                  <td className="py-4 px-6 text-right text-rose-800 text-base font-black" colSpan={2}>CÓ: {ledgerData.closingCredit.toLocaleString()} đ</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
