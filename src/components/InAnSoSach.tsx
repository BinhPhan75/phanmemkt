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
  const [selectedBook, setSelectedBook] = useState<'NKC' | 'SOCAI' | 'SCT' | 'SCT_131' | 'SCT_331' | 'TH_131' | 'TH_331' | 'CTGS'>('NKC');
  const [selectedAccCode, setSelectedAccCode] = useState<string>('1121'); // default to 1121 as requested
  const [selectedPartnerCode, setSelectedPartnerCode] = useState<string>('131-BINHMINH'); // default customer partner
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [ctgsDirection, setCtgsDirection] = useState<'CO' | 'NO'>('CO');

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

  // Calculate specific partner's opening balance up to (excluding) startDate
  const getPartnerOpeningBalance = (partnerCode: string, accCode: '131' | '331') => {
    const partner = partners.find((p: any) => p.code === partnerCode);
    let openingDebit = 0;
    let openingCredit = 0;

    if (partner) {
      openingDebit = partner.openingDebit || 0;
      openingCredit = partner.openingCredit || 0;
    }

    // Get all transactions BEFORE startDate
    transactions.forEach(tx => {
      const dbDate = tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT;
      if (dbDate >= startDate) return;

      const isTxThisPartner = (tx.type === 'HOADON' && tx.maKH === partnerCode) ||
                             (tx.type === 'PHIEUKT' && tx.maKH === partnerCode);
      if (!isTxThisPartner) return;

      if (tx.type === 'HOADON') {
        const totalBase = tx.items.reduce((s, i) => s + i.thanhTien, 0);
        const totalTax = tx.items.reduce((s, i) => s + i.tienThue, 0);
        const totalValue = totalBase + totalTax;

        if (accCode === '131' && tx.loaiHD === 'BR') {
          openingDebit += totalValue;
        } else if (accCode === '331' && tx.loaiHD === 'MV') {
          openingCredit += totalValue;
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

  // Generate detailed rows with real-time running balance for Sổ Chi Tiết Công Nợ Phải Thu/Phải Trả
  const getPartnerDetailRows = (partnerCode: string, accCode: '131' | '331') => {
    const { openingDebit, openingCredit } = getPartnerOpeningBalance(partnerCode, accCode);
    let runningBalance = accCode === '131' ? (openingDebit - openingCredit) : (openingCredit - openingDebit);

    const rows: any[] = [];

    // Filter transactions inside the date range and extract double entries matching partner
    transactions.forEach(tx => {
      const dbDate = tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT;
      if (dbDate < startDate || dbDate > endDate) return;

      const isTxThisPartner = (tx.type === 'HOADON' && tx.maKH === partnerCode) ||
                             (tx.type === 'PHIEUKT' && tx.maKH === partnerCode);
      if (!isTxThisPartner) return;

      if (tx.type === 'HOADON') {
        const totalBase = tx.items.reduce((s, i) => s + i.thanhTien, 0);
        const totalTax = tx.items.reduce((s, i) => s + i.tienThue, 0);
        const totalValue = totalBase + totalTax;

        if (accCode === '131' && tx.loaiHD === 'BR') {
          rows.push({
            date: dbDate,
            docNo: tx.soHD,
            description: tx.dienGiai,
            recAcc: tx.tkCo || '511',
            debit: totalValue,
            credit: 0
          });
        } else if (accCode === '331' && tx.loaiHD === 'MV') {
          rows.push({
            date: dbDate,
            docNo: tx.soHD,
            description: tx.dienGiai,
            recAcc: tx.tkNo || '152',
            debit: 0,
            credit: totalValue
          });
        }
      } else {
        // Journal Voucher (PHIEUKT)
        tx.lines.forEach(l => {
          if (l.soTK === accCode || l.soTK.startsWith(accCode)) {
            const correspondingLines = tx.lines.filter(oth => oth.loaiTK !== l.loaiTK);
            const corAcc = correspondingLines.map(c => c.soTK).join('/');
            
            rows.push({
              date: dbDate,
              docNo: tx.soCT,
              description: l.dienGiai || tx.dienGiai,
              recAcc: corAcc || '111',
              debit: l.psNo,
              credit: l.psCo
            });
          }
        });
      }
    });

    // Sort by date
    rows.sort((a, b) => a.date.localeCompare(b.date));

    // Compute running values step-by-step
    const calculatedRows = rows.map(e => {
      if (accCode === '131') {
        runningBalance += e.debit - e.credit;
      } else {
        runningBalance += e.credit - e.debit;
      }
      return {
        ...e,
        balance: runningBalance
      };
    });

    const initialBalance = accCode === '131' ? (openingDebit - openingCredit) : (openingCredit - openingDebit);
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    const finalBalance = runningBalance;

    return {
      rows: calculatedRows,
      initialDebit: openingDebit,
      initialCredit: openingCredit,
      initialBalance,
      totalDebit,
      totalCredit,
      finalBalance
    };
  };

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

  // Calculate dynamic "Chứng từ ghi sổ" structures for our customized CTGS printing template
  const getCtgsData = () => {
    const inRangeEntries = doubleEntries.filter(e => e.date >= startDate && e.date <= endDate);
    const matchesMain = (acc: string) => acc === selectedAccCode || acc.startsWith(selectedAccCode);
    const isCreditMain = ctgsDirection === 'CO';

    const mainEntries = inRangeEntries.filter(e => {
      return isCreditMain ? matchesMain(e.creditAcc) : matchesMain(e.debitAcc);
    });

    const offsetAccSet = new Set<string>();
    mainEntries.forEach(e => {
      const offset = isCreditMain ? e.debitAcc : e.creditAcc;
      if (offset) offsetAccSet.add(offset);
    });
    const offsetAccounts = Array.from(offsetAccSet).sort();

    const detailRowMap: Record<string, {
      date: string;
      docNo: string;
      description: string;
      values: Record<string, number>;
      total: number;
    }> = {};

    mainEntries.forEach(e => {
      const key = `${e.date}_${e.docNo}`;
      const offset = isCreditMain ? e.debitAcc : e.creditAcc;
      if (!detailRowMap[key]) {
        detailRowMap[key] = {
          date: e.date,
          docNo: e.docNo,
          description: e.description,
          values: {},
          total: 0
        };
      }
      detailRowMap[key].values[offset] = (detailRowMap[key].values[offset] || 0) + e.amount;
      detailRowMap[key].total += e.amount;
    });

    const detailRows = Object.values(detailRowMap).sort((a, b) => a.date.localeCompare(b.date) || a.docNo.localeCompare(b.docNo));

    const summaryRows = offsetAccounts.map(offset => {
      const matchingEntries = mainEntries.filter(e => {
        const oInput = isCreditMain ? e.debitAcc : e.creditAcc;
        return oInput === offset;
      });

      const totalAmount = matchingEntries.reduce((sum, e) => sum + e.amount, 0);
      const targetAcc = accounts.find(a => a.code === offset);
      const description = `Ghi nhận đối ứng TK ${offset} - ${targetAcc?.name || ''}`;

      return {
        description,
        debitAcc: isCreditMain ? offset : selectedAccCode,
        creditAcc: isCreditMain ? selectedAccCode : offset,
        amount: totalAmount,
        note: `${offset}_CTGS`
      };
    });

    const totalSum = summaryRows.reduce((s, r) => s + r.amount, 0);

    return {
      offsetAccounts,
      detailRows,
      summaryRows,
      totalSum
    };
  };

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
        <div className="flex flex-col xl:flex-row gap-4 bg-slate-150/40 p-2.5 rounded-2xl border border-slate-200 w-full xl:w-auto">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">I. Sổ hạch toán tổng hợp</span>
            <div className="flex bg-white/60 p-1 rounded-xl gap-1 flex-wrap">
              <button
                onClick={() => setSelectedBook('NKC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBook === 'NKC' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="switch-book-nkc"
              >
                Nhật Ký Chung
              </button>
              <button
                onClick={() => setSelectedBook('SOCAI')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBook === 'SOCAI' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="switch-book-socai"
              >
                Sổ Cái TK
              </button>
              <button
                onClick={() => {
                  setSelectedBook('SCT');
                  if (selectedAccCode === '111') {
                    setSelectedAccCode('1121');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBook === 'SCT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="switch-book-sct"
              >
                Sổ Chi Tiết TK
              </button>
              <button
                onClick={() => {
                  setSelectedBook('CTGS');
                  setSelectedAccCode('331');
                  setCtgsDirection('CO');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBook === 'CTGS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="switch-book-ctgs"
              >
                Chứng từ ghi sổ (CTGS)
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">II. Sổ sách & báo cáo công nợ</span>
            <div className="flex bg-white/60 p-1 rounded-xl gap-1 flex-wrap">
              <button
                onClick={() => {
                  setSelectedBook('SCT_131');
                  setSelectedPartnerCode('131-BINHMINH');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBook === 'SCT_131' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="switch-book-sct131"
              >
                Sổ CT Phải Thu (131)
              </button>
              <button
                onClick={() => {
                  setSelectedBook('SCT_331');
                  const vend = partners.find(p => p.type === 'VENDOR' || p.type === 'BOTH');
                  setSelectedPartnerCode(vend?.code || '331-HOALAM');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBook === 'SCT_331' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="switch-book-sct331"
              >
                Sổ CT Phải Trả (331)
              </button>
              <button
                onClick={() => setSelectedBook('TH_131')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBook === 'TH_131' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="switch-book-th131"
              >
                T.Hợp Phải Thu (131)
              </button>
              <button
                onClick={() => setSelectedBook('TH_331')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBook === 'TH_331' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="switch-book-th331"
              >
                T.Hợp Phải Trả (331)
              </button>
            </div>
          </div>
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
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-755 bg-slate-50 focus:outline-none focus:border-slate-800 font-bold"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-755 bg-slate-50 focus:outline-none focus:border-slate-800 font-bold"
            />
          </div>

          {(selectedBook === 'SOCAI' || selectedBook === 'SCT' || selectedBook === 'CTGS') && (
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

          {selectedBook === 'CTGS' && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1">Cơ chế kết chuyển đối ứng</label>
              <select
                value={ctgsDirection}
                onChange={(e) => setCtgsDirection(e.target.value as 'CO' | 'NO')}
                className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                id="select-ctgs-direction"
              >
                <option value="CO">Lấy các phát sinh GHI CÓ của TK {selectedAccCode}</option>
                <option value="NO">Lấy các phát sinh GHI NỢ của TK {selectedAccCode}</option>
              </select>
            </div>
          )}

          {(selectedBook === 'SCT_131' || selectedBook === 'SCT_331') && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1">Chọn đối tác hạch toán</label>
              <select
                value={selectedPartnerCode}
                onChange={(e) => setSelectedPartnerCode(e.target.value)}
                className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-850 font-bold focus:outline-none focus:border-indigo-600"
                id="select-debt-partner"
              >
                {partners
                  .filter(p => {
                    if (selectedBook === 'SCT_131') return p.type === 'CUSTOMER' || p.type === 'BOTH';
                    return p.type === 'VENDOR' || p.type === 'BOTH';
                  })
                  .map(p => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name}
                    </option>
                  ))
                }
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

      {/* 5D. SỔ CHI TIẾT CÔNG NỢ 131 OR 331 */}
      {(selectedBook === 'SCT_131' || selectedBook === 'SCT_331') && (() => {
        const accCode = selectedBook === 'SCT_131' ? '131' : '331';
        const data = getPartnerDetailRows(selectedPartnerCode, accCode);
        const partnerName = partners.find((p: any) => p.code === selectedPartnerCode)?.name || '';
        
        return (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in" id="partner-sct-print-sheet">
            <div className="p-6 border-b border-indigo-100 bg-indigo-50/10 text-center space-y-1">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">
                SỔ CHI TIẾT CÔNG NỢ {accCode === '131' ? 'PHẢI THU' : 'PHẢI TRẢ'}
              </h3>
              <p className="text-xs font-mono font-bold text-indigo-700">Tài khoản hạch toán: {accCode} • Đối tác: {selectedPartnerCode} - {partnerName}</p>
              <p className="text-xs text-slate-500 italic">Kỳ sổ sách: từ {startDate} đến {endDate}</p>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] text-center">
                    <th className="py-2.5 px-3 border border-slate-200 w-24">Ngày HT</th>
                    <th className="py-2.5 px-3 border border-slate-200 w-24">Ngày CT</th>
                    <th className="py-2.5 px-3 border border-slate-200 w-24">Số CT</th>
                    <th className="py-2.5 px-4 border border-slate-200 text-left">Diễn giải nội dung hạch toán</th>
                    <th className="py-2.5 px-2 border border-slate-200 w-20">đối ứng</th>
                    <th className="py-2.5 px-3 border border-slate-200 text-right w-28">Ghi NỢ (+)</th>
                    <th className="py-2.5 px-3 border border-slate-200 text-right w-28">Ghi CÓ (-)</th>
                    <th className="py-2.5 px-3 border border-slate-200 text-right w-32">Dư cuối kỳ</th>
                  </tr>
                  
                  {/* Opening Balance Row */}
                  <tr className="bg-amber-50/40 text-slate-700 font-bold text-[11px]">
                    <td colSpan={3} className="py-2 px-3 border border-slate-200 text-center text-slate-400 font-mono">-</td>
                    <td className="py-2 px-4 border border-slate-200 italic font-serif">Số dư đầu kỳ hạch toán thực tế:</td>
                    <td className="py-2 px-2 border border-slate-200 text-center text-slate-400 font-mono">-</td>
                    <td className="py-2 px-3 border border-slate-200 text-right font-mono text-emerald-800">
                      {accCode === '131' && data.initialBalance >= 0 ? data.initialBalance.toLocaleString() : '-'}
                    </td>
                    <td className="py-2 px-3 border border-slate-200 text-right font-mono text-rose-800">
                      {(accCode === '331' || data.initialBalance < 0) ? Math.abs(data.initialBalance).toLocaleString() : '-'}
                    </td>
                    <td className="py-2 px-3 border border-slate-200 text-right font-mono text-indigo-800">
                      {data.initialBalance.toLocaleString()} đ
                    </td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-750 font-semibold">
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-normal font-sans bg-slate-50/30">
                        Chưa phát sinh bất kỳ nghiệp vụ kinh tế cụ thể nào với đối tác {selectedPartnerCode} trong thời kỳ lọc sổ.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-2 px-3 border border-slate-200 text-center font-mono text-slate-500">{row.date}</td>
                        <td className="py-2 px-3 border border-slate-200 text-center font-mono text-slate-500">{row.date}</td>
                        <td className="py-2 px-3 border border-slate-200 text-center">
                          <span className="font-bold text-slate-800 bg-slate-100 px-1 py-0.5 rounded-sm block text-center truncate">{row.docNo}</span>
                        </td>
                        <td className="py-2 px-4 border border-slate-200 font-normal text-slate-600 max-w-xs truncate">{row.description}</td>
                        <td className="py-2 px-2 border border-slate-200 text-center font-mono font-bold text-indigo-600 bg-indigo-50/40">{row.recAcc}</td>
                        <td className="py-2 px-3 border border-slate-200 text-right font-mono text-emerald-600">
                          {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 border border-slate-200 text-right font-mono text-rose-600">
                          {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 border border-slate-200 text-right font-mono font-black text-indigo-700">
                          {row.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="font-bold bg-slate-50 font-mono text-[11px] text-slate-800">
                  {/* Summary row */}
                  <tr className="border border-slate-200">
                    <td colSpan={5} className="py-3 px-4 border border-slate-200 text-right font-serif text-slate-500 text-sm">Cộng phát sinh hạch toán trong kỳ:</td>
                    <td className="py-3 px-3 border border-slate-200 text-right text-emerald-800 font-black">{data.totalDebit.toLocaleString()} đ</td>
                    <td className="py-3 px-3 border border-slate-200 text-right text-rose-800 font-black">{data.totalCredit.toLocaleString()} đ</td>
                    <td className="py-3 px-3 border border-slate-200 text-right text-slate-400 font-mono">-</td>
                  </tr>
                  
                  {/* Closing balance row */}
                  <tr className="border border-slate-200 bg-indigo-50/20 text-indigo-950">
                    <td colSpan={5} className="py-3.5 px-4 border border-slate-200 text-right font-serif text-slate-700 text-sm">Số dư cuối kỳ báo cáo kết chuyển:</td>
                    <td className="py-3.5 px-3 border border-slate-200 text-right text-slate-400 font-mono">-</td>
                    <td className="py-3.5 px-3 border border-slate-200 text-right text-slate-400 font-mono">-</td>
                    <td className="py-3.5 px-3 border border-slate-200 text-right text-indigo-900 font-extrabold text-xs">
                      {data.finalBalance.toLocaleString()} đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 5E. BẢNG TỔNG HỢP CÔNG NỢ */}
      {(selectedBook === 'TH_131' || selectedBook === 'TH_331') && (() => {
        const accCode = selectedBook === 'TH_131' ? '131' : '331';
        
        // Filter appropriate partners
        const targetPartners = partners.filter((p: any) => {
          if (accCode === '131') return p.type === 'CUSTOMER' || p.type === 'BOTH';
          return p.type === 'VENDOR' || p.type === 'BOTH';
        });

        const partnersData = targetPartners.map((p: any) => {
          const detail = getPartnerDetailRows(p.code, accCode);
          return {
            partner: p,
            initialBalance: detail.initialBalance,
            totalDebit: detail.totalDebit,
            totalCredit: detail.totalCredit,
            finalBalance: detail.finalBalance
          };
        });

        const totalInitBal = partnersData.reduce((s, p) => s + p.initialBalance, 0);
        const totalDebits = partnersData.reduce((s, p) => s + p.totalDebit, 0);
        const totalCredits = partnersData.reduce((s, p) => s + p.totalCredit, 0);
        const totalFinalBal = partnersData.reduce((s, p) => s + p.finalBalance, 0);

        return (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in" id="summary-debt-sheet">
            <div className="p-6 border-b border-indigo-100 bg-indigo-50/10 text-center space-y-1">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">
                BẢNG TỔNG HỢP CÔNG NỢ {accCode === '131' ? 'PHẢI THU (MÃ TK 131)' : 'PHẢI TRẢ (MÃ TK 331)'}
              </h3>
              <p className="text-xs text-slate-500 italic">Kỳ tổng hợp tổng quát doanh nghiệp: từ {startDate} đến {endDate}</p>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] text-center">
                    <th className="py-3 px-4 border border-slate-200 w-12">STT</th>
                    <th className="py-3 px-4 border border-slate-200 w-36">Mã đối tác</th>
                    <th className="py-3 px-6 border border-slate-200 text-left">Tên đơn vị khách hàng / Nhà cung cấp</th>
                    <th className="py-3 px-4 border border-slate-200 text-right w-36">Dư đầu kỳ (đ)</th>
                    <th className="py-3 px-4 border border-slate-200 text-right w-36">Lũy kế NỢ (đ)</th>
                    <th className="py-3 px-4 border border-slate-200 text-right w-36">Lũy kế CÓ (đ)</th>
                    <th className="py-3 px-4 border border-slate-200 text-right w-36">Dư cuối kỳ (đ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-755 font-semibold">
                  {partnersData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-normal bg-slate-50/30">
                        Không phát sinh đối tác hoặc đối tượng công nợ nào trong kỳ hạch toán tương ứng.
                      </td>
                    </tr>
                  ) : (
                    partnersData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 border border-slate-200 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 border border-slate-200 font-bold font-mono text-slate-800 text-center">{row.partner.code}</td>
                        <td className="py-3 px-6 border border-slate-200 font-semibold">{row.partner.name}</td>
                        <td className={`py-3 px-4 border border-slate-200 text-right font-mono font-bold ${row.initialBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {row.initialBalance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 border border-slate-200 text-right font-mono text-slate-650">
                          {row.totalDebit > 0 ? row.totalDebit.toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-4 border border-slate-200 text-right font-mono text-slate-650">
                          {row.totalCredit > 0 ? row.totalCredit.toLocaleString() : '-'}
                        </td>
                        <td className={`py-3 px-4 border border-slate-200 text-right font-mono font-black ${row.finalBalance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                          {row.finalBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="font-extrabold bg-slate-100 font-mono text-[11px] text-slate-850">
                  {/* Total row */}
                  <tr className="border border-slate-300">
                    <td colSpan={3} className="py-3.5 px-6 border border-slate-200 text-right font-serif text-sm">TỔNG CỘNG TOÀN DOANH NGHIỆP:</td>
                    <td className={`py-3.5 px-4 border border-slate-200 text-right ${totalInitBal >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {totalInitBal.toLocaleString()} đ
                    </td>
                    <td className="py-3.5 px-4 border border-slate-200 text-right text-indigo-900">{totalDebits.toLocaleString()} đ</td>
                    <td className="py-3.5 px-4 border border-slate-200 text-right text-indigo-900">{totalCredits.toLocaleString()} đ</td>
                    <td className={`py-3.5 px-4 border border-slate-200 text-right text-indigo-950 ${totalFinalBal >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                      {totalFinalBal.toLocaleString()} đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 5F. CHỨNG TỪ GHI SỔ (CTGS) */}
      {selectedBook === 'CTGS' && (() => {
        const data = getCtgsData();
        const mainAccName = accounts.find(a => a.code === selectedAccCode)?.name || '';
        const isCreditMain = ctgsDirection === 'CO';
        const yearStr = startDate ? startDate.substring(0, 4) : '2026';

        return (
          <div className="space-y-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-fade-in" id="ctgs-print-sheet">
            {/* Header / Info Block */}
            <div className="relative text-center border-b border-dashed border-slate-200 pb-6">
              <div className="absolute top-0 left-0 text-left space-y-0.5 hidden sm:block">
                <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">Đơn vị: CT CP Dệt may Việt Nam</p>
                <p className="text-[10px] font-bold text-slate-400">Địa chỉ: Hòa Khánh, Liên Chiểu, Đà Nẵng</p>
              </div>

              <div className="absolute top-0 right-0 text-right space-y-0.5 hidden sm:block">
                <p className="text-[10px] border border-slate-200 font-bold px-2 py-0.5 rounded text-slate-500 w-fit ml-auto">Mẫu số S11-DN</p>
                <p className="text-[9px] text-slate-400 italic">(Ban hành theo TT số 133/2016/TT-BTC)</p>
              </div>

              <div className="pt-8">
                <h3 className="text-2xl font-black text-slate-800 tracking-wide uppercase">CHỨNG TỪ GHI SỔ</h3>
                <p className="text-sm font-bold text-indigo-700 mt-1">Số hạch toán: CTGS/{selectedAccCode}/{yearStr}</p>
                <p className="text-xs text-slate-500 italic mt-0.5">Kỳ sổ sách hạch toán: từ {startDate} đến {endDate}</p>
              </div>
            </div>

            {/* PART 1: PHẦN TỔNG HỢP GOM THEO TK ĐỐI ỨNG (Upper Table) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  I. PHẦN TỔNG HỢP GOM THEO TÀI KHOẢN ĐỐI ỨNG
                </h4>
                <span className="text-[9px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded-sm uppercase">Tổng hợp</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] text-center border-b border-slate-300">
                      <th className="py-2.5 px-4 border border-slate-200 text-left">Diễn giải nội dung hạch toán</th>
                      <th className="py-2.5 px-4 border border-slate-200 w-32">Nợ TK (Debit)</th>
                      <th className="py-2.5 px-4 border border-slate-200 w-32">Có TK (Credit)</th>
                      <th className="py-2.5 px-4 border border-slate-200 text-right w-44">Số tiền hạch toán</th>
                      <th className="py-2.5 px-4 border border-slate-200 w-32 text-center text-slate-400">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700 font-semibold">
                    {data.summaryRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-normal bg-slate-50/20">
                          Chưa phát sinh bất kỳ nghiệp vụ kinh tế nào khớp với điều kiện lọc hạch toán của tài khoản này!
                        </td>
                      </tr>
                    ) : (
                      data.summaryRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-4 border border-slate-200 text-slate-600 font-normal">{row.description}</td>
                          <td className="py-2.5 px-4 border border-slate-200 font-mono font-bold text-center text-indigo-600 bg-indigo-50/10">{row.debitAcc}</td>
                          <td className="py-2.5 px-4 border border-slate-200 font-mono font-bold text-center text-emerald-600 bg-emerald-50/10">{row.creditAcc}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-mono font-bold text-slate-800">
                            {row.amount.toLocaleString()} đ
                          </td>
                          <td className="py-2.5 px-4 border border-slate-200 text-center text-[10px] font-mono text-slate-400">{row.note}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {data.summaryRows.length > 0 && (
                    <tfoot className="font-extrabold bg-slate-50 font-mono text-[11px] text-slate-800 border-t border-slate-300">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 border border-slate-200 text-right font-serif text-slate-500 font-bold">TỔNG CỘNG HOẠT ĐỘNG PHÁT SINH (PART I):</td>
                        <td className="py-3 px-4 border border-slate-200 text-right text-indigo-800 font-black text-sm bg-indigo-50/30">
                          {data.totalSum.toLocaleString()} đ
                        </td>
                        <td className="py-3 px-4 border border-slate-200 text-center text-slate-400">x</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* PART 2: PHẦN CHI TIẾT TÀI KHOẢN ĐỐI ỨNG (Lower Table) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  II. PHẦN CHI TIẾT THEO TÀI KHOẢN ĐỐI ỨNG
                </h4>
                <span className="text-[9px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded-sm uppercase">Chi tiết</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 space-y-1">
                <p className="text-[11px] uppercase font-bold text-indigo-900 leading-normal">
                  {isCreditMain ? (
                    `TÀI KHOẢN ĐỐI ỨNG, GHI CÓ TK ${selectedAccCode} (${mainAccName}), GHI NỢ CÁC TK:`
                  ) : (
                    `TÀI KHOẢN ĐỐI ỨNG, GHI NỢ TK ${selectedAccCode} (${mainAccName}), GHI CÓ CÁC TK:`
                  )}
                </p>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px] text-slate-505">
                  <span className="font-medium text-slate-500">Các TK đối ứng trong kỳ hạch toán:</span>
                  {data.offsetAccounts.map(o => (
                    <span key={o} className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-1 rounded">{o}</span>
                  ))}
                  {data.offsetAccounts.length === 0 && <span className="italic text-slate-400">Không có đối ứng nào</span>}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] text-center border-b border-slate-300">
                      <th className="py-2.5 px-3 border border-slate-200 w-28 text-center">Ngày hạch toán</th>
                      <th className="py-2.5 px-3 border border-slate-200 w-28 text-center">Số chứng từ</th>
                      <th className="py-2.5 px-4 border border-slate-200 text-left">Diễn giải nội dung hạch toán chi tiết</th>
                      {data.offsetAccounts.map(acc => (
                        <th key={acc} className="py-2.5 px-3 border border-slate-200 font-mono text-[10px] text-indigo-700 w-24">
                          TK {acc}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 border border-slate-200 text-right w-28 font-semibold">Tổng cộng (đ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-755 font-semibold">
                    {data.detailRows.length === 0 ? (
                      <tr>
                        <td colSpan={data.offsetAccounts.length + 4} className="py-12 text-center text-slate-400 font-normal bg-slate-50/20">
                          Chưa phát sinh bất kỳ nghiệp vụ chi tiết nào trong kỳ hạch toán tương ứng!
                        </td>
                      </tr>
                    ) : (
                      data.detailRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono text-slate-500">{row.date}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-bold text-slate-800">{row.docNo}</td>
                          <td className="py-2.5 px-4 border border-slate-200 font-normal text-slate-600 max-w-xs truncate">{row.description}</td>
                          {data.offsetAccounts.map(acc => {
                            const val = row.values[acc] || 0;
                            return (
                              <td key={acc} className="py-2.5 px-3 border border-slate-200 text-right font-mono text-slate-650">
                                {val > 0 ? val.toLocaleString() : '-'}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 border border-slate-200 text-right font-mono font-black text-indigo-700 bg-indigo-50/10">
                            {row.total.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {data.detailRows.length > 0 && (
                    <tfoot className="font-extrabold bg-slate-50 font-mono text-[11px] text-slate-800 border-t border-slate-300">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 border border-slate-200 text-right font-serif text-slate-500 font-bold">CỘNG TỔNG CÁC PHÁT SINH (PART II):</td>
                        {data.offsetAccounts.map(acc => {
                          const colTotal = data.detailRows.reduce((sum, r) => sum + (r.values[acc] || 0), 0);
                          return (
                            <td key={acc} className="py-3 px-3 border border-slate-200 text-right text-indigo-700 bg-indigo-50/5">
                              {colTotal.toLocaleString()} đ
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 border border-slate-200 text-right text-indigo-800 font-black text-sm bg-indigo-50/20">
                          {data.totalSum.toLocaleString()} đ
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs font-semibold text-slate-700">
              <div className="space-y-16">
                <p className="font-bold uppercase tracking-widest text-slate-400 text-[10px]">Người lập phiếu</p>
                <div>
                  <p className="font-black text-slate-800 text-sm">Vũ Thị Lan</p>
                  <p className="text-[10px] text-slate-400 italic font-normal">(Ký, ghi rõ họ tên)</p>
                </div>
              </div>
              <div className="space-y-16">
                <p className="font-bold uppercase tracking-widest text-slate-400 text-[10px]">Kế toán trưởng</p>
                <div>
                  <p className="font-black text-slate-800 text-sm">Phan Như Bình</p>
                  <p className="text-[10px] text-slate-400 italic font-normal">(Ký, ghi rõ họ tên)</p>
                </div>
              </div>
              <div className="space-y-16">
                <p className="font-bold uppercase tracking-widest text-slate-400 text-[10px]">Giám đốc kiểm duyệt</p>
                <div>
                  <p className="font-black text-slate-800 text-sm">Phạm Hoàng Nam</p>
                  <p className="text-[10px] text-slate-400 italic font-normal">(Ký, đóng dấu tròn)</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
