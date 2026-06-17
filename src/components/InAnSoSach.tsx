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
  const [selectedBook, setSelectedBook] = useState<'NKC' | 'SOCAI' | 'SCT'>('NKC');
  const [selectedAccCode, setSelectedAccCode] = useState<string>('1121'); // default to 1121 as requested
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  // Calculate account balances up to (excluding) startDate to compute true Opening Balance for the period
  const getTrueOpeningBalanceForAccount = (accCode: string) => {
    const acc = accounts.find(a => a.code === accCode);
    let openingDebit = acc?.openingDebit || 0;
    let openingCredit = acc?.openingCredit || 0;

    // Get all transactions BEFORE startDate
    transactions.forEach(tx => {
      const dbDate = tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT;
      if (dbDate >= startDate) return; // only interested in historical values before active period

      if (tx.type === 'HOADON') {
        const totalBase = tx.items.reduce((s, i) => s + i.thanhTien, 0);
        const totalTax = tx.items.reduce((s, i) => s + i.tienThue, 0);
        const totalValue = totalBase + totalTax;

        if (tx.loaiHD === 'BR') {
          // Debit tkNo, Credit tkCo (511)
          if (tx.tkNo === accCode || tx.tkNo.startsWith(accCode)) {
            openingDebit += totalValue;
          }
          if (tx.tkCo === accCode || tx.tkCo.startsWith(accCode)) {
            openingCredit += totalValue;
          }
          if (totalTax > 0) {
            if ('33311' === accCode || '33311'.startsWith(accCode)) {
              openingCredit += totalTax;
            }
          }
          if (tx.tkGiaVonNo && tx.tkGiaVonCo) {
            const standardCost = Math.round(totalBase * 0.65);
            if (tx.tkGiaVonNo === accCode || tx.tkGiaVonNo.startsWith(accCode)) {
              openingDebit += standardCost;
            }
            if (tx.tkGiaVonCo === accCode || tx.tkGiaVonCo.startsWith(accCode)) {
              openingCredit += standardCost;
            }
          }
        } else {
          // MV Purchase: Debit tkNo, Credit tkCo
          if (tx.tkNo === accCode || tx.tkNo.startsWith(accCode)) {
            openingDebit += totalBase;
          }
          if (tx.tkCo === accCode || tx.tkCo.startsWith(accCode)) {
            openingCredit += totalBase;
          }
          if (totalTax > 0) {
            if ('1331' === accCode || '1331'.startsWith(accCode)) {
              openingDebit += totalTax;
            }
          }
        }
      } else {
        // Journal Voucher (PHIEUKT)
        tx.lines.forEach(l => {
          if (l.soTK === accCode || l.soTK.startsWith(accCode)) {
            openingDebit += l.psNo;
            openingCredit += l.psCo;
          }
        });
      }
    });

    return { openingDebit, openingCredit };
  };

  // Generate detailed rows with real-time running balance for Sổ Chi Tiết các Tài Khoản (SCT)
  const getDetailedLedgerData = () => {
    // 1. Get true opening balance up to (excluding) startDate
    const { openingDebit, openingCredit } = getTrueOpeningBalanceForAccount(selectedAccCode);
    let runningBalance = openingDebit - openingCredit;

    const activeEntries: Array<{
      date: string;
      docNo: string;
      description: string;
      acc: string;
      recAcc: string;
      debit: number;
      credit: number;
      balDebit: number;
      balCredit: number;
    }> = [];

    // Temporary array before calculation
    const rawEntries: any[] = [];

    // Filter transactions inside the date range and extract double entries
    transactions.forEach(tx => {
      const dbDate = tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT;
      if (dbDate < startDate || dbDate > endDate) return;

      if (tx.type === 'HOADON') {
        const totalBase = tx.items.reduce((s, i) => s + i.thanhTien, 0);
        const totalTax = tx.items.reduce((s, i) => s + i.tienThue, 0);
        const totalValue = totalBase + totalTax;

        if (tx.loaiHD === 'BR') {
          // Sales: Debit tkNo, Credit 511, Credit 33311
          if (tx.tkNo === selectedAccCode || tx.tkNo.startsWith(selectedAccCode)) {
            rawEntries.push({
              date: dbDate,
              docNo: tx.soHD,
              description: tx.dienGiai,
              acc: tx.tkNo,
              recAcc: tx.tkCo || '511',
              debit: totalValue,
              credit: 0
            });
          }
          if (tx.tkCo === selectedAccCode || tx.tkCo.startsWith(selectedAccCode)) {
            rawEntries.push({
              date: dbDate,
              docNo: tx.soHD,
              description: tx.dienGiai,
              acc: tx.tkCo,
              recAcc: tx.tkNo,
              debit: 0,
              credit: totalBase
            });
          }
          if (totalTax > 0 && (selectedAccCode === '33311' || '33311'.startsWith(selectedAccCode))) {
            rawEntries.push({
              date: dbDate,
              docNo: tx.soHD,
              description: `Thuế GTGT đầu ra - ${tx.soHD}`,
              acc: '33311',
              recAcc: tx.tkNo,
              debit: 0,
              credit: totalTax
            });
          }
          // COGS
          if (tx.tkGiaVonNo && tx.tkGiaVonCo) {
            const standardCost = Math.round(totalBase * 0.65);
            if (tx.tkGiaVonNo === selectedAccCode || tx.tkGiaVonNo.startsWith(selectedAccCode)) {
              rawEntries.push({
                date: dbDate,
                docNo: `XKC-${tx.soHD}`,
                description: `Giá vốn hàng bán - ${tx.soHD}`,
                acc: tx.tkGiaVonNo,
                recAcc: tx.tkGiaVonCo,
                debit: standardCost,
                credit: 0
              });
            }
            if (tx.tkGiaVonCo === selectedAccCode || tx.tkGiaVonCo.startsWith(selectedAccCode)) {
              rawEntries.push({
                date: dbDate,
                docNo: `XKC-${tx.soHD}`,
                description: `Giá vốn hàng bán - ${tx.soHD}`,
                acc: tx.tkGiaVonCo,
                recAcc: tx.tkGiaVonNo,
                debit: 0,
                credit: standardCost
              });
            }
          }
        } else {
          // MV Purchase: Debit tkNo, Debit 1331, Credit tkCo
          if (tx.tkNo === selectedAccCode || tx.tkNo.startsWith(selectedAccCode)) {
            rawEntries.push({
              date: dbDate,
              docNo: tx.soHD,
              description: tx.dienGiai,
              acc: tx.tkNo,
              recAcc: tx.tkCo,
              debit: totalBase,
              credit: 0
            });
          }
          if (tx.tkCo === selectedAccCode || tx.tkCo.startsWith(selectedAccCode)) {
            rawEntries.push({
              date: dbDate,
              docNo: tx.soHD,
              description: tx.dienGiai,
              acc: tx.tkCo,
              recAcc: tx.tkNo,
              debit: 0,
              credit: totalValue
            });
          }
          if (totalTax > 0 && (selectedAccCode === '1331' || '1331'.startsWith(selectedAccCode))) {
            rawEntries.push({
              date: dbDate,
              docNo: tx.soHD,
              description: `Thuế GTGT đầu vào khấu trừ - ${tx.soHD}`,
              acc: '1331',
              recAcc: tx.tkCo,
              debit: totalTax,
              credit: 0
            });
          }
        }
      } else {
        // Journal Voucher (PHIEUKT)
        const debits = tx.lines.filter(l => l.loaiTK === 'No');
        const credits = tx.lines.filter(l => l.loaiTK === 'Co');

        debits.forEach(d => {
          credits.forEach(c => {
            const matchedAmount = d.psNo > 0 ? d.psNo : c.psCo;
            if (d.soTK === selectedAccCode || d.soTK.startsWith(selectedAccCode)) {
              rawEntries.push({
                date: dbDate,
                docNo: tx.soCT,
                description: d.dienGiai || tx.dienGiai,
                acc: d.soTK,
                recAcc: c.soTK,
                debit: matchedAmount,
                credit: 0
              });
            }
            if (c.soTK === selectedAccCode || c.soTK.startsWith(selectedAccCode)) {
              rawEntries.push({
                date: dbDate,
                docNo: tx.soCT,
                description: c.dienGiai || tx.dienGiai,
                acc: c.soTK,
                recAcc: d.soTK,
                debit: 0,
                credit: matchedAmount
              });
            }
          });
        });
      }
    });

    // Sort raw entries by date
    rawEntries.sort((a, b) => a.date.localeCompare(b.date));

    // Compute running values step-by-step
    const rows = rawEntries.map(e => {
      runningBalance += e.debit - e.credit;
      return {
        ...e,
        balDebit: runningBalance >= 0 ? runningBalance : 0,
        balCredit: runningBalance < 0 ? Math.abs(runningBalance) : 0
      };
    });

    const initialBalDebit = (openingDebit - openingCredit) >= 0 ? (openingDebit - openingCredit) : 0;
    const initialBalCredit = (openingDebit - openingCredit) < 0 ? Math.abs(openingDebit - openingCredit) : 0;

    const totalDebit = rawEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = rawEntries.reduce((s, e) => s + e.credit, 0);

    const finalBalDebit = runningBalance >= 0 ? runningBalance : 0;
    const finalBalCredit = runningBalance < 0 ? Math.abs(runningBalance) : 0;

    return {
      rows,
      initialBalDebit,
      initialBalCredit,
      totalDebit,
      totalCredit,
      finalBalDebit,
      finalBalCredit
    };
  };

  const sctData = getDetailedLedgerData();

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
          <button
            onClick={() => {
              setSelectedBook('SCT');
              if (selectedAccCode === '111') {
                setSelectedAccCode('1121'); // default to cash in bank for high fidelity
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              selectedBook === 'SCT' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="switch-book-sct"
          >
            Sổ Chi Tiết Tài Khoản (SCT)
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

          {(selectedBook === 'SOCAI' || selectedBook === 'SCT') && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1">Chọn tài khoản xem Sổ</label>
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

      {/* 5C. SỔ CHI TIẾT CÁC TÀI KHOẢN SHEET */}
      {selectedBook === 'SCT' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="sct-print-sheet">
          {/* Organization & Header Metadata as shown in Image 1 */}
          <div className="p-6 border-b border-emerald-100 bg-emerald-50/5 relative">
            <div className="absolute top-5 left-6 text-xs text-slate-500 font-bold space-y-0.5">
              <div className="uppercase tracking-wider">CÔNG TY TNHH THƯƠNG MẠI TỔNG HỢP ABC</div>
              <div className="text-slate-400 font-normal">TP Đà Nẵng</div>
            </div>

            <div className="text-center pt-8 pb-4 space-y-1">
              <h3 className="text-2xl font-black text-emerald-950 uppercase tracking-widest font-sans">
                SỔ CHI TIẾT CÁC TÀI KHOẢN
              </h3>
              <p className="text-xs text-emerald-700 font-mono font-bold">
                Tài khoản: {selectedAccCode} - {accounts.find(a => a.code === selectedAccCode)?.name}; Năm 2026
              </p>
              <p className="text-[11px] text-slate-400 italic">Kỳ báo cáo chi tiết: từ {startDate} đến {endDate}</p>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-emerald-800 text-white border border-emerald-800 text-center font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 border border-emerald-700 w-24">Ngày hạch toán</th>
                  <th className="py-3 px-3 border border-emerald-700 w-24">Ngày chứng từ</th>
                  <th className="py-3 px-3 border border-emerald-700 w-24">Số chứng từ</th>
                  <th className="py-3 px-4 border border-emerald-700 text-left">Diễn giải nội dung bút toán</th>
                  <th className="py-3 px-2 border border-emerald-700 w-16">Tài khoản</th>
                  <th className="py-3 px-2 border border-emerald-700 w-16">TK đối ứng</th>
                  <th className="py-3 px-3 border border-emerald-700 text-right w-28">Phát sinh Nợ</th>
                  <th className="py-3 px-3 border border-emerald-700 text-right w-28">Phát sinh Có</th>
                  <th className="py-3 px-3 border border-emerald-700 text-right w-28">Dư Nợ</th>
                  <th className="py-3 px-3 border border-emerald-700 text-right w-28">Dư Có</th>
                </tr>

                {/* Beginning Balance Row as shown in Image 1 */}
                <tr className="bg-amber-50/70 font-semibold border border-slate-200 text-slate-800">
                  <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400 font-mono">-</td>
                  <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400 font-mono">-</td>
                  <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400 font-mono">-</td>
                  <td className="py-2.5 px-4 border border-slate-200 text-slate-800 italic font-serif text-sm">
                    Số dư đầu kỳ hạch toán kết chuyển
                  </td>
                  <td className="py-2.5 px-2 border border-slate-200 text-center font-mono text-emerald-800 font-bold">
                    {selectedAccCode}
                  </td>
                  <td className="py-2.5 px-2 border border-slate-200 text-center text-slate-400 font-mono">-</td>
                  <td className="py-2.5 px-3 border border-slate-200 text-right text-slate-400 font-mono">-</td>
                  <td className="py-2.5 px-3 border border-slate-200 text-right text-slate-400 font-mono">-</td>
                  <td className="py-2.5 px-3 border border-slate-200 text-right font-mono text-emerald-700 text-xs font-bold">
                    {sctData.initialBalDebit > 0 ? sctData.initialBalDebit.toLocaleString() : '-'}
                  </td>
                  <td className="py-2.5 px-3 border border-slate-200 text-right font-mono text-rose-700 text-xs font-bold">
                    {sctData.initialBalCredit > 0 ? sctData.initialBalCredit.toLocaleString() : '-'}
                  </td>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {sctData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-normal font-sans bg-slate-50/50">
                      Không phát sinh bất kỳ nghiệp vụ kinh tế nào đối với tài khoản này trong kỳ lọc sổ.
                    </td>
                  </tr>
                ) : (
                  sctData.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-3 border border-slate-200 text-center font-mono text-slate-400 text-[10px]">
                        {row.date}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center font-mono text-slate-400 text-[10px]">
                        {row.date}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200">
                        <span className="font-bold text-slate-800 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-sm block text-center truncate">
                          {row.docNo}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 border border-slate-200 font-normal text-slate-650 max-w-xs truncate">
                        {row.description}
                      </td>
                      <td className="py-2.5 px-2 border border-slate-200 text-center font-mono font-bold text-slate-600 text-[10px]">
                        {row.acc}
                      </td>
                      <td className="py-2.5 px-2 border border-slate-200 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40 text-[10px]">
                        {row.recAcc}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-right font-mono text-emerald-600">
                        {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-right font-mono text-rose-600">
                        {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-right font-mono text-emerald-700">
                        {row.balDebit > 0 ? row.balDebit.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-right font-mono text-rose-700">
                        {row.balCredit > 0 ? row.balCredit.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot className="font-bold border-t border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-800">
                {/* Cộng phát sinh trong kỳ */}
                <tr className="border border-slate-200">
                  <td colSpan={6} className="py-3 px-4 border border-slate-200 text-right text-slate-500 font-serif text-sm">
                    Cộng phát sinh lũy kế trong kỳ hạch toán:
                  </td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-emerald-700 font-black">
                    {sctData.totalDebit.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-rose-700 font-black">
                    {sctData.totalCredit.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-slate-400 font-mono">-</td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-slate-400 font-mono">-</td>
                </tr>

                {/* Số dư cuối kỳ */}
                <tr className="border border-slate-200 bg-emerald-50/30 text-emerald-950">
                  <td colSpan={6} className="py-3.5 px-4 border border-slate-200 text-right font-serif text-slate-800 text-sm">
                    Số dư cuối kỳ hạch toán kết chuyển:
                  </td>
                  <td className="py-3.5 px-3 border border-slate-200 text-right text-slate-400 font-mono">-</td>
                  <td className="py-3.5 px-3 border border-slate-200 text-right text-slate-400 font-mono">-</td>
                  <td className="py-3.5 px-3 border border-slate-200 text-right text-emerald-900 text-xs font-extrabold">
                    {sctData.finalBalDebit > 0 ? sctData.finalBalDebit.toLocaleString() : '-'}
                  </td>
                  <td className="py-3.5 px-3 border border-slate-200 text-right text-rose-900 text-xs font-extrabold">
                    {sctData.finalBalCredit > 0 ? sctData.finalBalCredit.toLocaleString() : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
