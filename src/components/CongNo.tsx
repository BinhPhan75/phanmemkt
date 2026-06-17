/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAccounting } from '../utils/accountingState';
import { Partner } from '../types';
import { Users, FileMinus, FilePlus, ChevronRight, BookOpen, AlertCircle, Plus, Search, Building } from 'lucide-react';

export default function CongNo() {
  const { partners, transactions, addPartner } = useAccounting();
  const [selectedAcc, setSelectedAcc] = useState<'131' | '331'>('131');
  const [selectedPartnerCode, setSelectedPartnerCode] = useState<string>('');
  const [selectedSubTab, setSelectedSubTab] = useState<'TONG_HOP' | 'CHI_TIET'>('TONG_HOP');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  
  // Modal states for creating a new partner
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [newPartner, setNewPartner] = useState<Omit<Partner, 'id'>>({
    code: '',
    name: '',
    taxCode: '',
    address: '',
    type: 'CUSTOMER',
    openingDebit: 0,
    openingCredit: 0
  });

  // Filter partners based on accounts type (131 = Customers, 331 = Vendors)
  const currentPartners = partners.filter(p => {
    if (selectedAcc === '131') return p.type === 'CUSTOMER' || p.type === 'BOTH';
    return p.type === 'VENDOR' || p.type === 'BOTH';
  });

  // Generate detailed rows with real-time running balance for Sổ Chi Tiết Công Nợ
  const getPartnerLedgerDetailed = (partnerCode: string) => {
    const lines: Array<{
      date: string;
      docNo: string;
      description: string;
      tkCongNo: string;
      tkDoiUng: string;
      debit: number;
      credit: number;
      balDebit: number;
      balCredit: number;
    }> = [];

    const partner = partners.find(p => p.code === partnerCode);
    if (!partner) return { rows: [], initialDebit: 0, initialCredit: 0, finalBalDebit: 0, finalBalCredit: 0, totalDebit: 0, totalCredit: 0 };

    // Determine initial balances
    const initialDebit = (selectedAcc === '131' ? partner.openingDebit : 0) || 0;
    const initialCredit = (selectedAcc === '331' ? partner.openingCredit : 0) || 0;

    let runningBal = initialDebit - initialCredit;

    transactions.forEach(tx => {
      const dbDate = tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT;
      const dbDocNo = tx.type === 'HOADON' ? tx.soHD : tx.soCT;

      if (tx.type === 'HOADON') {
        if (tx.maKH !== partnerCode) return;

        const totalBase = tx.items.reduce((sum, item) => sum + item.thanhTien, 0);
        const totalTax = tx.items.reduce((sum, item) => sum + item.tienThue, 0);
        const totalValue = totalBase + totalTax;

        if (tx.loaiHD === 'BR') {
          // Sales: Debits 131, Credits 511 + 33311
          if (tx.tkNo === selectedAcc) {
            lines.push({
              date: dbDate,
              docNo: dbDocNo,
              description: tx.dienGiai,
              tkCongNo: tx.tkNo,
              tkDoiUng: tx.tkCo || '511',
              debit: totalBase,
              credit: 0,
              balDebit: 0,
              balCredit: 0
            });
            if (totalTax > 0) {
              lines.push({
                date: dbDate,
                docNo: dbDocNo,
                description: `Thuế GTGT đầu ra - ${dbDocNo}`,
                tkCongNo: tx.tkNo,
                tkDoiUng: '33311',
                debit: totalTax,
                credit: 0,
                balDebit: 0,
                balCredit: 0
              });
            }
          }
        } else {
          // Purchase: Credits 331, Debits 152/156/642 + 1331
          if (tx.tkCo === selectedAcc) {
            lines.push({
              date: dbDate,
              docNo: dbDocNo,
              description: tx.dienGiai,
              tkCongNo: tx.tkCo,
              tkDoiUng: tx.tkNo || '156',
              debit: 0,
              credit: totalBase,
              balDebit: 0,
              balCredit: 0
            });
            if (totalTax > 0) {
              lines.push({
                date: dbDate,
                docNo: dbDocNo,
                description: `Thuế GTGT đầu vào - ${dbDocNo}`,
                tkCongNo: tx.tkCo,
                tkDoiUng: '1331',
                debit: 0,
                credit: totalTax,
                balDebit: 0,
                balCredit: 0
              });
            }
          }
        }
      } else {
        // Journal Voucher (PHIEUKT)
        if (tx.maKH !== partnerCode) return;

        const debits = tx.lines.filter(l => l.loaiTK === 'No');
        const credits = tx.lines.filter(l => l.loaiTK === 'Co');

        tx.lines.forEach(line => {
          if (line.soTK.startsWith(selectedAcc)) {
            let tkDoiUng = '';
            if (line.loaiTK === 'No') {
              tkDoiUng = credits.length > 0 ? credits[0].soTK : '111';
            } else {
              tkDoiUng = debits.length > 0 ? debits[0].soTK : '111';
            }

            lines.push({
              date: dbDate,
              docNo: dbDocNo,
              description: line.dienGiai || tx.dienGiai,
              tkCongNo: line.soTK,
              tkDoiUng: tkDoiUng,
              debit: line.psNo,
              credit: line.psCo,
              balDebit: 0,
              balCredit: 0
            });
          }
        });
      }
    });

    // Sort by date
    lines.sort((a,b) => a.date.localeCompare(b.date));

    // Calculate running balance row by row
    const rows = lines.map(l => {
      runningBal += l.debit - l.credit;
      return {
        ...l,
        balDebit: runningBal >= 0 ? runningBal : 0,
        balCredit: runningBal < 0 ? Math.abs(runningBal) : 0
      };
    });

    const finalBalDebit = runningBal >= 0 ? runningBal : 0;
    const finalBalCredit = runningBal < 0 ? Math.abs(runningBal) : 0;
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

    return {
      rows,
      initialDebit,
      initialCredit,
      finalBalDebit,
      finalBalCredit,
      totalDebit,
      totalCredit
    };
  };

  // Compute a detailed summary calculation of ALL partners
  const getPartnersSummaryDetailed = () => {
    return currentPartners.map(p => {
      const detailed = getPartnerLedgerDetailed(p.code);
      const totalDebit = detailed.rows.reduce((sum, r) => sum + r.debit, 0);
      const totalCredit = detailed.rows.reduce((sum, r) => sum + r.credit, 0);

      const net = (detailed.initialDebit + totalDebit) - (detailed.initialCredit + totalCredit);

      return {
        partner: p,
        openingDebit: detailed.initialDebit,
        openingCredit: detailed.initialCredit,
        debit: totalDebit,
        credit: totalCredit,
        endingDebit: net >= 0 ? net : 0,
        endingCredit: net < 0 ? Math.abs(net) : 0
      };
    });
  };

  const summaryData = getPartnersSummaryDetailed();
  const activePartner = partners.find(p => p.code === selectedPartnerCode) || currentPartners[0] || null;
  const activePartnerCode = activePartner ? activePartner.code : '';
  const selectedPartnerSummary = activePartnerCode ? getPartnerLedgerDetailed(activePartnerCode) : null;

  const handleAddNewPartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.code || !newPartner.name) {
      alert('Vui lòng điền mã đối tác và tên đối tác!');
      return;
    }
    
    addPartner({
      id: newPartner.code,
      ...newPartner,
      openingDebit: Number(newPartner.openingDebit) || 0,
      openingCredit: Number(newPartner.openingCredit) || 0
    });

    setNewPartner({
      code: '',
      name: '',
      taxCode: '',
      address: '',
      type: selectedAcc === '131' ? 'CUSTOMER' : 'VENDOR',
      openingDebit: 0,
      openingCredit: 0
    });
    
    setShowAddPartnerModal(false);
    alert('Thêm đối tác thành công!');
  };

  return (
    <div className="space-y-6" id="ketoan-congno-panel">
      {/* Header and selector tab */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-6 h-6" />
            </span>
            Kế toán Công nợ Phải Thu - Phải Trả
          </h2>
          <p className="text-sm text-slate-500 mt-1">Phân hệ theo dõi công nợ chi tiết, quản lý danh sách nhà cung cấp (331) và khách hàng (131) theo TT 133</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => {
              setSelectedAcc('131');
              setSelectedPartnerCode('');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              selectedAcc === '131' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="switch-ar-131"
          >
            Nợ Phải Thu Khách Hàng (TK 131)
          </button>
          <button
            onClick={() => {
              setSelectedAcc('331');
              setSelectedPartnerCode('');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              selectedAcc === '331' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="switch-ap-331"
          >
            Nợ Phải Trả Nhà Cung Cấp (TK 331)
          </button>
        </div>
      </div>

      {/* Sub-tab Switcher Bar */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-xs max-w-2xl">
        <button
          onClick={() => setSelectedSubTab('TONG_HOP')}
          className={`flex-1 transition-all duration-200 py-2.5 px-4 rounded-lg text-xs font-bold cursor-pointer text-center ${
            selectedSubTab === 'TONG_HOP'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          id="subtab-tong-hop"
        >
          {selectedAcc === '131' ? 'Bảng Tổng Hợp Công Nợ Phải Thu (131)' : 'Bảng Tổng Hợp Công Nợ Phải Trả (331)'}
        </button>
        <button
          onClick={() => {
            setSelectedSubTab('CHI_TIET');
            if (!selectedPartnerCode && currentPartners.length > 0) {
              setSelectedPartnerCode(currentPartners[0].code);
            }
          }}
          className={`flex-1 transition-all duration-200 py-2.5 px-4 rounded-lg text-xs font-bold cursor-pointer text-center ${
            selectedSubTab === 'CHI_TIET'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          id="subtab-chi-tiet"
        >
          {selectedAcc === '131' ? 'Sổ Chi Tiết Công Nợ Khách Hàng (131)' : 'Sổ Chi Tiết Công Nợ Nhà Cung Cấp (331)'}
        </button>
      </div>

      {/* RENDER CONDITIONAL 1: BẢNG TỔNG HỢP CÔNG NỢ */}
      {selectedSubTab === 'TONG_HOP' && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col" id="ar-ap-tonghop-sheet">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">CÔNG TY TNHH THƯƠNG MẠI TỔNG HỢP ABC</div>
              <div className="text-[11px] text-slate-400 font-normal">TP Đà Nẵng</div>
              
              <h3 className="text-xl font-black text-slate-800 tracking-wider uppercase mt-3">
                {selectedAcc === '131' 
                  ? 'BẢNG TỔNG HỢP CÔNG NỢ PHẢI THU KHÁCH HÀNG' 
                  : 'BẢNG TỔNG HỢP CÔNG NỢ PHẢI TRẢ NHÀ CUNG CẤP'}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Tài khoản hạch toán: {selectedAcc} - Năm tài chính 2026</p>
            </div>

            <button
              onClick={() => {
                setNewPartner(prev => ({
                  ...prev,
                  type: selectedAcc === '131' ? 'CUSTOMER' : 'VENDOR'
                }));
                setShowAddPartnerModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer self-start md:self-center shadow-xs"
              id="add-new-partner-tonghop-btn"
            >
              <Plus className="w-4 h-4" />
              Thêm mới khách hàng
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200 text-slate-700">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-center uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-3 px-4 border border-slate-200" rowSpan={2}>Mã ĐT</th>
                  <th className="py-3 px-4 border border-slate-200 text-left" rowSpan={2} style={{ minWidth: '220px' }}>Tên đối tượng hạch toán</th>
                  <th className="py-2.5 px-3 border border-slate-200" colSpan={2}>Số dư đầu kỳ</th>
                  <th className="py-2.5 px-3 border border-slate-200" colSpan={2}>Số phát sinh trong kỳ</th>
                  <th className="py-2.5 px-3 border border-slate-200" colSpan={2}>Số dư cuối kỳ</th>
                  <th className="py-3 px-3 border border-slate-200" rowSpan={2}>Tác vụ</th>
                </tr>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-250 font-bold text-[9px] uppercase">
                  <th className="py-2 px-3 border border-slate-200 text-right w-24">Nợ</th>
                  <th className="py-2 px-3 border border-slate-200 text-right w-24">Có</th>
                  <th className="py-2 px-3 border border-slate-200 text-right w-24">Nợ</th>
                  <th className="py-2 px-3 border border-slate-200 text-right w-24">Có</th>
                  <th className="py-2 px-3 border border-slate-200 text-right w-32">Nợ</th>
                  <th className="py-2 px-3 border border-slate-200 text-right w-32">Có</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs text-slate-800">
                {summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-normal bg-slate-50/50">
                      Chưa khai báo đối tác hoặc phát sinh hạch toán công nợ nào thuộc tài khoản này.
                    </td>
                  </tr>
                ) : (
                  summaryData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 border border-slate-200 font-mono text-center font-bold text-slate-600">
                        {row.partner.code}
                      </td>
                      <td className="py-3 px-4 border border-slate-200">
                        <div className="font-semibold text-slate-900">{row.partner.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">MST: {row.partner.taxCode || 'N/A'} - ĐC: {row.partner.address || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-3 border border-slate-200 text-right font-mono text-slate-600">
                        {row.openingDebit > 0 ? row.openingDebit.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-3 border border-slate-200 text-right font-mono text-slate-600">
                        {row.openingCredit > 0 ? row.openingCredit.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-3 border border-slate-200 text-right font-mono text-emerald-600 font-semibold">
                        {row.debit > 0 ? `+${row.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-3 border border-slate-200 text-right font-mono text-rose-600 font-semibold">
                        {row.credit > 0 ? `-${row.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-3 border border-slate-200 text-right font-mono text-indigo-700 font-bold bg-indigo-50/10">
                        {row.endingDebit > 0 ? row.endingDebit.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-3 border border-slate-200 text-right font-mono text-rose-700 font-bold bg-rose-50/10">
                        {row.endingCredit > 0 ? row.endingCredit.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-3 border border-slate-200 text-center">
                        <button
                          onClick={() => {
                            setSelectedPartnerCode(row.partner.code);
                            setSelectedSubTab('CHI_TIET');
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition"
                        >
                          Sổ chi tiết
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold font-mono text-xs text-slate-900">
                <tr className="border border-slate-200">
                  <td colSpan={2} className="py-3 px-4 text-right text-slate-600 font-serif text-sm">
                    Cộng cộng dòng tổng hợp lũy kế:
                  </td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-slate-700">
                    {summaryData.reduce((s, r) => s + r.openingDebit, 0) > 0 
                      ? summaryData.reduce((s, r) => s + r.openingDebit, 0).toLocaleString() 
                      : '-'}
                  </td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-slate-700">
                    {summaryData.reduce((s, r) => s + r.openingCredit, 0) > 0 
                      ? summaryData.reduce((s, r) => s + r.openingCredit, 0).toLocaleString() 
                      : '-'}
                  </td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-emerald-800">
                    {summaryData.reduce((s, r) => s + r.debit, 0) > 0 
                      ? summaryData.reduce((s, r) => s + r.debit, 0).toLocaleString() 
                      : '-'}
                  </td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-rose-800">
                    {summaryData.reduce((s, r) => s + r.credit, 0) > 0 
                      ? summaryData.reduce((s, r) => s + r.credit, 0).toLocaleString() 
                      : '-'}
                  </td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-indigo-900 text-sm font-extrabold bg-indigo-50/20">
                    {summaryData.reduce((s, r) => s + r.endingDebit, 0) > 0 
                      ? summaryData.reduce((s, r) => s + r.endingDebit, 0).toLocaleString() 
                      : '-'}
                  </td>
                  <td className="py-3 px-3 border border-slate-200 text-right text-rose-900 text-sm font-extrabold bg-rose-50/20">
                    {summaryData.reduce((s, r) => s + r.endingCredit, 0) > 0 
                      ? summaryData.reduce((s, r) => s + r.endingCredit, 0).toLocaleString() 
                      : '-'}
                  </td>
                  <td className="py-3 px-3 border border-slate-200 bg-slate-50 text-slate-400 font-mono font-normal text-center">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* RENDER CONDITIONAL 2: SỔ CHI TIẾT CÔNG NỢ */}
      {selectedSubTab === 'CHI_TIET' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left panel: Quick partner selector / LISTBOX */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">Listbox đối tác công nợ</h4>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
                {currentPartners.length} tổng
              </span>
            </div>

            {/* Listbox Search Input Block */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm tên, mã, MST..."
                value={partnerSearchQuery}
                onChange={(e) => setPartnerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-50/50 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition"
              />
              {partnerSearchQuery && (
                <button
                  onClick={() => setPartnerSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Listbox Container list */}
            <div 
              className="space-y-1.5 overflow-y-auto max-h-[500px] pr-1" 
              id="partner-ledger-listbox"
              style={{ scrollbarWidth: 'thin' }}
            >
              {currentPartners.filter(p => {
                const query = partnerSearchQuery.trim().toLowerCase();
                if (!query) return true;
                return p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query) || (p.taxCode && p.taxCode.toLowerCase().includes(query));
              }).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium space-y-1">
                  <p>Không tìm thấy đối tác nào</p>
                  <p className="text-[10px] font-normal opacity-75">Vui lòng kiểm tra lại từ khóa</p>
                </div>
              ) : (
                currentPartners.filter(p => {
                  const query = partnerSearchQuery.trim().toLowerCase();
                  if (!query) return true;
                  return p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query) || (p.taxCode && p.taxCode.toLowerCase().includes(query));
                }).map((p, idx) => {
                  const isSelected = activePartnerCode === p.code;
                  
                  // Compute brief balance info for each listbox item
                  const detailed = getPartnerLedgerDetailed(p.code);
                  const is131 = selectedAcc === '131';
                  const balance131 = detailed.finalBalDebit - detailed.finalBalCredit;
                  const balance331 = detailed.finalBalCredit - detailed.finalBalDebit;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedPartnerCode(p.code)}
                      className={`w-full text-left p-2.5 rounded-xl transition cursor-pointer flex flex-col gap-1 border ${
                        isSelected 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                          : 'hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`font-mono text-[10px] font-bold tracking-tight ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                          {p.code}
                        </span>
                        
                        {/* Outstanding balance badge inside Listbox item */}
                        {is131 ? (
                          balance131 !== 0 ? (
                            <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded ${
                              isSelected
                                ? balance131 > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                : balance131 > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {balance131 > 0 ? `Thu: ${balance131.toLocaleString()}đ` : `Dư: ${Math.abs(balance131).toLocaleString()}đ`}
                            </span>
                          ) : (
                            <span className={`text-[9px] font-mono opacity-50 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>0đ</span>
                          )
                        ) : (
                          balance331 !== 0 ? (
                            <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded ${
                              isSelected
                                ? balance331 > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                                : balance331 > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {balance331 > 0 ? `Trả: ${balance331.toLocaleString()}đ` : `Dư: ${Math.abs(balance331).toLocaleString()}đ`}
                            </span>
                          ) : (
                            <span className={`text-[9px] font-mono opacity-50 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>0đ</span>
                          )
                        )}
                      </div>
                      
                      <div className={`text-[11px] font-bold leading-normal line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {p.name}
                      </div>

                      <div className={`text-[9px] flex items-center gap-1 opacity-70 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        <Building className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{p.address || 'Không có địa chỉ'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Full Excel-themed printable ledger sheet as requested in Image 2 & 3 */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col">
            {selectedPartnerSummary && activePartner ? (
              <div>
                <div className="p-6 border-b border-indigo-100 bg-indigo-50/5 relative">
                  <div className="absolute top-5 left-6 text-xs text-slate-500 font-bold space-y-0.5">
                    <div className="subtitle-logo uppercase tracking-wider">CÔNG TY TNHH THƯƠNG MẠI TỔNG HỢP ABC</div>
                    <div className="text-slate-400 font-normal">TP Đà Nẵng</div>
                  </div>

                  <div className="text-center pt-8 pb-3 space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 tracking-wider font-sans uppercase">
                      SỔ CHI TIẾT CÔNG NỢ KHÁCH HÀNG (131)
                    </h3>
                    <p className="text-xs font-mono text-indigo-700 font-bold">
                      Tài khoản liên kết: {selectedAcc} - Năm 2026
                    </p>
                    <div className="text-[11px] text-slate-500 italic max-w-md mx-auto line-clamp-1">
                      Khách hàng: <span className="font-bold font-sans text-xs underline text-slate-800">{activePartner.name}</span> (Mã {activePartner.code})
                    </div>
                  </div>

                  <div className="mt-4 bg-slate-100 p-3 rounded-lg text-[11px] text-slate-600 font-serif grid grid-cols-2 gap-3 max-w-xl mx-auto">
                    <div><strong>Mã số thuế:</strong> {activePartner.taxCode || 'N/A'}</div>
                    <div><strong>Đại diện / Địa chỉ giao dịch:</strong> {activePartner.address || 'N/A'}</div>
                  </div>
                </div>

                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-900 text-white border-b border-slate-700 text-center font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-2.5 border border-slate-700 w-24">Ngày hạch toán</th>
                        <th className="py-2.5 px-2.5 border border-slate-700 w-24">Ngày chứng từ</th>
                        <th className="py-2.5 px-2.5 border border-slate-700 w-20">Số chứng từ</th>
                        <th className="py-2.5 px-3 border border-slate-700 text-left">Nội dung diễn giải chi tiết</th>
                        <th className="py-2.5 px-2 border border-slate-700 w-14">TK công nợ</th>
                        <th className="py-2.5 px-2 border border-slate-700 w-14">TK đối ứng</th>
                        <th className="py-2.5 px-2.5 border border-slate-700 text-right w-24">Phát sinh Nợ</th>
                        <th className="py-2.5 px-2.5 border border-slate-700 text-right w-24">Phát sinh Có</th>
                        <th className="py-2.5 px-2.5 border border-slate-700 text-right w-24">Số dư Nợ</th>
                        <th className="py-2.5 px-2.5 border border-slate-700 text-right w-24">Số dư Có</th>
                      </tr>

                      {/* Opening Balance Row */}
                      <tr className="bg-amber-50 text-amber-950 font-bold border border-slate-200">
                        <td className="py-2 px-2.5 border border-slate-200 text-center font-mono opacity-50">-</td>
                        <td className="py-2 px-2.5 border border-slate-200 text-center font-mono opacity-50">-</td>
                        <td className="py-2 px-2.5 border border-slate-200 text-center font-mono opacity-50">-</td>
                        <td className="py-2 px-3 border border-slate-200 italic font-serif text-slate-700">
                          Số dư công nợ tích lũy đầu kỳ kết chuyển
                        </td>
                        <td className="py-2 px-2 border border-slate-200 text-center font-mono text-slate-500 font-normal">{selectedAcc}</td>
                        <td className="py-2 px-2 border border-slate-200 text-center font-mono opacity-50">-</td>
                        <td className="py-2 px-2.5 border border-slate-200 text-right opacity-50 font-mono">-</td>
                        <td className="py-2 px-2.5 border border-slate-200 text-right opacity-50 font-mono">-</td>
                        <td className="py-2 px-2.5 border border-slate-200 text-right text-emerald-800 font-mono font-black">
                          {selectedPartnerSummary.initialDebit > 0 ? selectedPartnerSummary.initialDebit.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-200 text-right text-rose-840 font-mono font-black">
                          {selectedPartnerSummary.initialCredit > 0 ? selectedPartnerSummary.initialCredit.toLocaleString() : '-'}
                        </td>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedPartnerSummary.rows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400 font-normal bg-slate-50/50">
                            Không phát sinh giao dịch công nợ phải thu/trả nào đối với đối tác này trong kỳ hạch toán.
                          </td>
                        </tr>
                      ) : (
                        selectedPartnerSummary.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-2 px-2.5 border border-slate-200 text-center font-mono text-slate-400 text-[10px]">
                              {row.date}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-200 text-center font-mono text-slate-400 text-[10px]">
                              {row.date}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-200">
                              <span className="font-bold text-slate-800 text-[9px] bg-slate-100 px-1 py-0.5 rounded-sm block text-center truncate">
                                {row.docNo}
                              </span>
                            </td>
                            <td className="py-2 px-3 border border-slate-200 max-w-xs truncate font-normal">
                              {row.description}
                            </td>
                            <td className="py-2 px-2 border border-slate-200 text-center font-mono text-slate-500 font-bold">
                              {row.tkCongNo}
                            </td>
                            <td className="py-2 px-2 border border-slate-200 text-center font-mono text-indigo-700 bg-indigo-50/55 font-black text-[10px]">
                              {row.tkDoiUng}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-200 text-right font-mono text-emerald-600">
                              {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-200 text-right font-mono text-rose-600">
                              {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-200 text-right font-mono text-emerald-700 bg-emerald-50/20">
                              {row.balDebit > 0 ? row.balDebit.toLocaleString() : '-'}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-200 text-right font-mono text-rose-700 bg-rose-50/20">
                              {row.balCredit > 0 ? row.balCredit.toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>

                    <tfoot className="font-bold text-slate-900 font-mono text-xs bg-slate-50 text-[11px]">
                      {/* Period Debits Sum */}
                      <tr className="border border-slate-200">
                        <td colSpan={6} className="py-2.5 px-3 border border-slate-200 text-right text-slate-500 font-serif">
                          Cộng phát sinh trong kỳ hạch toán:
                        </td>
                        <td className="py-2.5 px-2.5 border border-slate-200 text-right text-emerald-700">
                          {selectedPartnerSummary.totalDebit.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2.5 border border-slate-200 text-right text-rose-700">
                          {selectedPartnerSummary.totalCredit.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2.5 border border-slate-200 text-right text-slate-400 font-mono font-normal">-</td>
                        <td className="py-2.5 px-2.5 border border-slate-200 text-right text-slate-400 font-mono font-normal">-</td>
                      </tr>

                      {/* Period Ending Balance */}
                      <tr className="border border-slate-200 bg-slate-100/50">
                        <td colSpan={6} className="py-3 px-3 border border-slate-200 text-right font-serif text-slate-800">
                          Số dư cuối kỳ báo cáo kết chuyển:
                        </td>
                        <td className="py-3 px-2.5 border border-slate-200 text-right text-slate-400 font-mono font-normal">-</td>
                        <td className="py-3 px-2.5 border border-slate-200 text-right text-slate-400 font-mono font-normal">-</td>
                        <td className="py-3 px-2.5 border border-slate-200 text-right text-emerald-800 font-black text-xs">
                          {selectedPartnerSummary.finalBalDebit > 0 ? selectedPartnerSummary.finalBalDebit.toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-2.5 border border-slate-200 text-right text-rose-800 font-black text-xs">
                          {selectedPartnerSummary.finalBalCredit > 0 ? selectedPartnerSummary.finalBalCredit.toLocaleString() : '-'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 italic font-normal flex flex-col justify-center items-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-300" />
                Vui lòng nhấp chọn một đối tác bên cột trái để khởi động màn hình đối chiếu chi tiết.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL THÊM ĐỐI TÁC MỚI */}
      {showAddPartnerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 font-bold text-slate-800 text-base">
              Khai báo đối tác (Khách hàng / Nhà cung cấp)
            </div>
            
            <form onSubmit={handleAddNewPartnerSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Mã đối tác</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 131-THANHPHONG"
                    value={newPartner.code}
                    onChange={(e) => setNewPartner(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Phân loại ĐT</label>
                  <select
                    value={newPartner.type}
                    onChange={(e: any) => setNewPartner(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="CUSTOMER">Khách hàng (TK 131)</option>
                    <option value="VENDOR">Nhà cung cấp (TK 331)</option>
                    <option value="BOTH">Cả hai (Khách + NCC)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Tên đối tác hoặc Đơn vị</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Công ty TNHH Thiết bị Phong Vũ"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1 flex-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Mã số thuế (MST)</label>
                <input
                  type="text"
                  placeholder="VD: 3200123456"
                  value={newPartner.taxCode}
                  onChange={(e) => setNewPartner(p => ({ ...p, taxCode: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Địa chỉ</label>
                <input
                  type="text"
                  placeholder="Vương Thừa Vũ, Thanh Xuân, Hà Nội"
                  value={newPartner.address}
                  onChange={(e) => setNewPartner(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Dư nợ đầu kỳ</label>
                  <input
                    type="number"
                    value={newPartner.openingDebit}
                    onChange={(e) => setNewPartner(p => ({ ...p, openingDebit: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Dư có đầu kỳ</label>
                  <input
                    type="number"
                    value={newPartner.openingCredit}
                    onChange={(e) => setNewPartner(p => ({ ...p, openingCredit: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition flex-1 cursor-pointer"
                  id="submit-new-partner"
                >
                  Ghi sổ và khai báo ĐT
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs hover:bg-slate-200 transition cursor-pointer"
                  id="cancel-add-partner"
                >
                  Hủy bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
