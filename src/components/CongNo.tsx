/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAccounting } from '../utils/accountingState';
import { Partner } from '../types';
import { Users, FileMinus, FilePlus, ChevronRight, BookOpen, AlertCircle, Plus } from 'lucide-react';

export default function CongNo() {
  const { partners, transactions, addPartner } = useAccounting();
  const [selectedAcc, setSelectedAcc] = useState<'131' | '331'>('131');
  const [selectedPartnerCode, setSelectedPartnerCode] = useState<string>('');
  
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

  // Calculate detailed transactions for a specific partner
  const getPartnerLedger = (partnerCode: string) => {
    const lines: Array<{
      date: string;
      docNo: string;
      description: string;
      debit: number;
      credit: number;
    }> = [];

    const partner = partners.find(p => p.code === partnerCode);
    if (!partner) return { lines: [], opening: 0 };

    const opening = (selectedAcc === '131' ? partner.openingDebit : partner.openingCredit) || 0;

    transactions.forEach(tx => {
      const dbDate = tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT;
      const dbDocNo = tx.type === 'HOADON' ? tx.soHD : tx.soCT;

      if (tx.type === 'HOADON') {
        if (tx.maKH !== partnerCode) return;

        const totalBase = tx.items.reduce((sum, item) => sum + item.thanhTien, 0);
        const totalTax = tx.items.reduce((sum, item) => sum + item.tienThue, 0);
        const totalValue = totalBase + totalTax;

        if (tx.loaiHD === 'BR') {
          // Sales: If debiting 131, it records a DEBIT on 131
          if (tx.tkNo === selectedAcc) {
            lines.push({
              date: dbDate,
              docNo: dbDocNo,
              description: tx.dienGiai,
              debit: totalValue,
              credit: 0
            });
          }
        } else {
          // Purchases: If crediting 331, it records a CREDIT on 331
          if (tx.tkCo === selectedAcc) {
            lines.push({
              date: dbDate,
              docNo: dbDocNo,
              description: tx.dienGiai,
              debit: 0,
              credit: totalValue
            });
          }
        }
      } else {
        // Journal Voucher double entry split lines
        if (tx.maKH !== partnerCode) return;

        tx.lines.forEach(line => {
          if (line.soTK.startsWith(selectedAcc)) {
            lines.push({
              date: dbDate,
              docNo: dbDocNo,
              description: line.dienGiai || tx.dienGiai,
              debit: line.psNo,
              credit: line.psCo
            });
          }
        });
      }
    });

    return {
      lines: lines.sort((a, b) => a.date.localeCompare(b.date)),
      opening
    };
  };

  // Compute a summary calculation of ALL partners
  const getPartnersSummary = () => {
    return currentPartners.map(p => {
      const { lines, opening } = getPartnerLedger(p.code);
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      
      const ending = selectedAcc === '131' 
        ? (opening + totalDebit - totalCredit)
        : (opening + totalCredit - totalDebit);

      return {
        partner: p,
        opening,
        debit: totalDebit,
        credit: totalCredit,
        ending: ending > 0 ? ending : 0,
        endingOpposite: ending < 0 ? Math.abs(ending) : 0
      };
    });
  };

  const summaryData = getPartnersSummary();
  const selectedPartnerSummary = selectedPartnerCode ? getPartnerLedger(selectedPartnerCode) : null;
  const activePartner = partners.find(p => p.code === selectedPartnerCode);

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
          <p className="text-sm text-slate-500 mt-1">Phân hệ theo dõi công nợ chi tiết, quản lý danh sách nhà cung cấp (331) và khách hàng (131)</p>
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

      {/* Grid of Summary Scorecards vs Directory selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Summary list of all partners */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Bảng Tổng Hợp Công Nợ (Tài khoản {selectedAcc})
            </h3>
            <button
              onClick={() => {
                setNewPartner(prev => ({
                  ...prev,
                  type: selectedAcc === '131' ? 'CUSTOMER' : 'VENDOR'
                }));
                setShowAddPartnerModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1 cursor-pointer"
              id="add-new-partner-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              Khai báo Đối tác
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Mã ĐT</th>
                  <th className="py-3 px-4">Tên đơn vị đối tác</th>
                  <th className="py-3 px-4 text-right">Dư đầu kỳ</th>
                  <th className="py-3 px-4 text-right">Phát sinh Tăng</th>
                  <th className="py-3 px-4 text-right">Phát sinh Giảm</th>
                  <th className="py-3 px-4 text-right">Dư cuối kỳ</th>
                  <th className="py-3 px-4 text-center">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-sm">
                {summaryData.map((row, idx) => {
                  const isSelected = selectedPartnerCode === row.partner.code;
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/70 transition cursor-pointer ${
                        isSelected ? 'bg-indigo-50/40 text-indigo-900 border-l-4 border-l-indigo-600' : ''
                      }`}
                      onClick={() => setSelectedPartnerCode(row.partner.code)}
                    >
                      <td className="py-3.5 px-4 font-mono text-xs">{row.partner.code}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 line-clamp-1">{row.partner.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">MST: {row.partner.taxCode || 'Chưa cập nhật'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">{row.opening.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-600">+{row.debit.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-600">-{row.credit.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-indigo-700 font-bold">{row.ending.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPartnerCode(row.partner.code);
                          }}
                          className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs cursor-pointer inline-flex items-center gap-1 font-sans"
                        >
                          Chi tiết
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Detailed ledger for the selected partner */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-indigo-100 bg-indigo-50/30">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Sổ Chi Tiết Công Nợ Đối Tác
            </h3>
            <p className="text-xs text-slate-500 mt-1">Chọn một dòng đối tác ở bên trái để theo dõi</p>
          </div>

          {selectedPartnerSummary && activePartner ? (
            <div className="p-5 space-y-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="bg-slate-100 p-4 rounded-xl space-y-1 text-xs">
                  <h4 className="font-bold text-slate-800 text-sm">{activePartner.name}</h4>
                  <p className="text-slate-500"><strong>Mã Số Thuế:</strong> {activePartner.taxCode}</p>
                  <p className="text-slate-500"><strong>Đại diện:</strong> {activePartner.address}</p>
                </div>

                <div className="mt-4 space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Các nghiệp vụ phát sinh</h5>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {selectedPartnerSummary.lines.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 font-normal">
                        Chưa phát sinh hạch toán nợ nào trong kỳ.
                      </div>
                    ) : (
                      selectedPartnerSummary.lines.map((line, lidx) => (
                        <div key={lidx} className="flex justify-between items-center bg-slate-50 p-2.5 hover:bg-slate-100 rounded-lg transition text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-indigo-700">{line.docNo}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{line.date}</span>
                            </div>
                            <div className="text-slate-500 font-normal max-w-[180px] truncate">{line.description}</div>
                          </div>
                          <div className="text-right font-mono">
                            {line.debit > 0 && <span className="text-emerald-600 block">+{line.debit.toLocaleString()}</span>}
                            {line.credit > 0 && <span className="text-rose-600 block">-{line.credit.toLocaleString()}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Summary box */}
              <div className="pt-4 border-t border-slate-100 bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Dư đầu kỳ:</span>
                  <span className="font-mono">{selectedPartnerSummary.opening.toLocaleString()} đ</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tổng phát sinh tăng:</span>
                  <span className="font-mono text-emerald-600">
                    +{selectedPartnerSummary.lines.reduce((s, l) => s + l.debit, 0).toLocaleString()} đ
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 font-normal">
                  <span>Tổng phát sinh giảm:</span>
                  <span className="font-mono text-rose-600">
                    -{selectedPartnerSummary.lines.reduce((s, l) => s + l.credit, 0).toLocaleString()} đ
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-800 pt-1.5 border-t border-dashed border-slate-200">
                  <span>Dư cuối kỳ hạch toán:</span>
                  <span className="font-mono text-indigo-700">
                    {(
                      selectedPartnerSummary.opening +
                      selectedPartnerSummary.lines.reduce((s, l) => s + (selectedAcc === '131' ? l.debit - l.credit : l.credit - l.debit), 0)
                    ).toLocaleString()} đ
                  </span>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 italic font-normal flex-1 flex flex-col justify-center items-center gap-2">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              Vui lòng nhấp chọn một đối tác bên cột trái để hiển thị chi tiết lịch sử mua bán và đối chiếu công nợ.
            </div>
          )}
        </div>
      </div>

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

              <div className="space-y-1">
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
