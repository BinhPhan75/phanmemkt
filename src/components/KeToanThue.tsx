/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAccounting } from '../utils/accountingState';
import { Percent, Clipboard, ClipboardCheck, ArrowUpRight, ArrowDownRight, Printer } from 'lucide-react';

export default function KeToanThue() {
  const { transactions, partners } = useAccounting();
  const [activeSubTab, setActiveSubTab] = useState<'TOTHAI' | 'PL_BANRA' | 'PL_MUAVAO' | 'BC26'>('TOTHAI');

  // Filter Sales Invoices for PL Bán Ra
  const salesInvoices = transactions.filter(t => t.type === 'HOADON' && t.loaiHD === 'BR') as any[];
  
  // Filter Purchase Invoices for PL Mua Vào
  const purchaseInvoices = transactions.filter(t => t.type === 'HOADON' && t.loaiHD === 'MV') as any[];

  // Calculate parameters for VAT Main Return (Tờ Khai)
  const calcVatReturn = () => {
    // Input Purchases
    let purchaseValue = 0;
    let inputTaxValue = 0;
    purchaseInvoices.forEach(inv => {
      inv.items.forEach((item: any) => {
        purchaseValue += item.thanhTien;
        inputTaxValue += item.tienThue;
      });
    });

    // Output Sales splitting by rates
    let salesValue0 = 0;
    let salesValue5 = 0;
    let salesValue8 = 0;
    let salesValue10 = 0;

    let tax0 = 0;
    let tax5 = 0;
    let tax8 = 0;
    let tax10 = 0;

    salesInvoices.forEach(inv => {
      inv.items.forEach((item: any) => {
        const rate = item.thueSuat;
        if (rate === 0) {
          salesValue0 += item.thanhTien;
        } else if (rate === 5) {
          salesValue5 += item.thanhTien;
          tax5 += item.tienThue;
        } else if (rate === 8) {
          salesValue8 += item.thanhTien;
          tax8 += item.tienThue;
        } else {
          salesValue10 += item.thanhTien;
          tax10 += item.tienThue;
        }
      });
    });

    const totalSalesValue = salesValue0 + salesValue5 + salesValue8 + salesValue10;
    const totalOutputTax = tax0 + tax5 + tax8 + tax10;

    const openingInputCarrier = 12000000; // Standard carryover from previous month [22]
    const deductibleInputTaxCur = inputTaxValue; // Standard assuming 100% is deductible [25]

    // Net VAT formulation
    // [36] = [35] - [25] - [22] where [35] is totalOutputTax
    const netPayable = totalOutputTax - deductibleInputTaxCur - openingInputCarrier;

    return {
      openingInputCarrier,
      purchaseValue,
      inputTaxValue,
      deductibleInputTaxCur,
      salesValue0,
      salesValue5,
      salesValue8,
      salesValue10,
      tax0,
      tax5,
      tax8,
      tax10,
      totalSalesValue,
      totalOutputTax,
      netPayable: netPayable > 0 ? netPayable : 0,
      netCarryover: netPayable < 0 ? Math.abs(netPayable) : 0
    };
  };

  const vat = calcVatReturn();

  return (
    <div className="space-y-6" id="ketoan-thue-panel">
      {/* Header and selector sub-tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Percent className="w-6 h-6" />
            </span>
            Kế toán Thuế Giá trị gia tăng (VAT)
          </h2>
          <p className="text-sm text-slate-500 mt-1">Phân hệ tập hợp hóa đơn mua bán, truy xuất tờ khai thuế GTGT và BC26/AC theo Thông tư 133</p>
        </div>

        {/* Sub task tabs */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('TOTHAI')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'TOTHAI' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="sub-vat-return"
          >
            Tờ Khai Chính
          </button>
          <button
            onClick={() => setActiveSubTab('PL_BANRA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'PL_BANRA' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="sub-sales-pl"
          >
            PL Bán Ra (01-1/GTGT)
          </button>
          <button
            onClick={() => setActiveSubTab('PL_MUAVAO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'PL_MUAVAO' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="sub-purchases-pl"
          >
            PL Mua Vào (01-2/GTGT)
          </button>
          <button
            onClick={() => setActiveSubTab('BC26')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'BC26' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
            }`}
            id="sub-bc26-ac"
          >
            BC Hóa Đơn (BC26/AC)
          </button>
        </div>
      </div>

      {/* 1. TỜ KHAI CHÍNH VIEW */}
      {activeSubTab === 'TOTHAI' && (
        <div className="space-y-6">
          {/* Quick stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-emerald-50/70 p-5 rounded-xl border border-emerald-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Tổng VAT đầu vào khẩu trừ [25]</span>
                <span className="text-xl font-black font-mono text-emerald-900 block mt-1">
                  {vat.deductibleInputTaxCur.toLocaleString()} đ
                </span>
              </div>
              <ArrowDownRight className="w-8 h-8 text-emerald-600/40" />
            </div>

            <div className="bg-amber-50/70 p-5 rounded-xl border border-amber-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Tổng VAT đầu ra phát sinh [35]</span>
                <span className="text-xl font-black font-mono text-amber-900 block mt-1">
                  {vat.totalOutputTax.toLocaleString()} đ
                </span>
              </div>
              <ArrowUpRight className="w-8 h-8 text-amber-600/40" />
            </div>

            <div className="bg-red-50/70 p-5 rounded-xl border border-red-100 flex justify-between items-center">
              <div>
                {vat.netPayable > 0 ? (
                  <>
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Thuế GTGT phải nộp kỳ này [36]</span>
                    <span className="text-xl font-black font-mono text-red-900 block mt-1">{vat.netPayable.toLocaleString()} đ</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Thuế GTGT còn được khấu trừ [43]</span>
                    <span className="text-xl font-black font-mono text-blue-900 block mt-1">{vat.netCarryover.toLocaleString()} đ</span>
                  </>
                )}
              </div>
              <ClipboardCheck className="w-8 h-8 text-red-600/40" />
            </div>
          </div>

          {/* Detailed VAT Declaration Sheet layout */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 max-w-4xl mx-auto font-sans text-slate-800" id="vat-form-print">
            <div className="text-center border-b border-double pb-4 space-y-1">
              <h3 className="font-bold text-sm text-slate-900 uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
              <p className="text-xs text-slate-600 uppercase font-semibold">Độc lập - Tự do - Hạnh phúc</p>
              <div className="pt-2">
                <h4 className="text-xl font-black text-rose-700 uppercase tracking-wide">TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG</h4>
                <p className="text-xs text-slate-500 italic">(Dành cho người nộp thuế khai thuế theo phương pháp khấu trừ)</p>
                <p className="text-xs font-bold text-slate-700 mt-1">Kỳ tính thuế: Tháng 06 năm 2026</p>
              </div>
            </div>

            {/* Taxpayer Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p><strong>[01] Người nộp thuế:</strong> Công ty TNHH Bình Phan Phát</p>
              <p><strong>[02] Mã số thuế:</strong> 3200112233</p>
              <p><strong>[03] Địa chỉ:</strong> Thị trấn Diên Sanh, Hải Lăng, Quảng Trị</p>
              <p><strong>[04] Cơ quan thuế quản lý:</strong> Chi cục Thuế tỉnh Quảng Trị</p>
            </div>

            {/* Main grid inputs */}
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                    <th className="p-2 border-r border-slate-300 w-12 text-center">Chỉ tiêu</th>
                    <th className="p-2 border-r border-slate-300">Nội dung chỉ tiêu kê khai</th>
                    <th className="p-2 border-r border-slate-300 text-right w-36">Giá trị hàng hóa, DV</th>
                    <th className="p-2 text-right w-36">Thuế GTGT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="font-bold">
                    <td className="p-2 border-r border-slate-300 text-center">[22]</td>
                    <td className="p-2 border-r border-slate-300 text-slate-800">Thuế GTGT còn được khấu trừ kỳ trước chuyển sang</td>
                    <td className="p-2 border-r border-slate-300 text-right text-slate-400">-</td>
                    <td className="p-2 text-right text-indigo-700 font-mono">{vat.openingInputCarrier.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">[23]</td>
                    <td className="p-2 border-r border-slate-300">Giá trị và thuế GTGT mua vào trong nước</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono font-semibold">{vat.purchaseValue.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono font-semibold">{vat.inputTaxValue.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 border-r border-slate-300 text-center">[25]</td>
                    <td className="p-2 border-r border-slate-300">Tổng số thuế GTGT đầu vào được khấu trừ kỳ này</td>
                    <td className="p-2 border-r border-slate-300 text-right text-slate-400">-</td>
                    <td className="p-2 text-right text-emerald-700 font-mono">{vat.deductibleInputTaxCur.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">[26]</td>
                    <td className="p-2 border-r border-slate-300">Doanh thu bán ra không chịu thuế GTGT</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">0</td>
                    <td className="p-2 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">[29]</td>
                    <td className="p-2 border-r border-slate-300">Hàng hóa, dịch vụ bán ra chịu thuế suất 0%</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{vat.salesValue0.toLocaleString()}</td>
                    <td className="p-2 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">[30]</td>
                    <td className="p-2 border-r border-slate-300">Hàng hóa, dịch vụ bán ra chịu thuế suất 5%</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{vat.salesValue5.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">{vat.tax5.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">[32]</td>
                    <td className="p-2 border-r border-slate-300 text-slate-800">Hàng hóa, dịch vụ bán ra chịu thuế suất 10% (kèm miễn giảm 8%)</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{(vat.salesValue8 + vat.salesValue10).toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">{(vat.tax8 + vat.tax10).toLocaleString()}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 border-r border-slate-300 text-center">[35]</td>
                    <td className="p-2 border-r border-slate-300 text-slate-900">Tổng doanh thu và thuế GTGT bán ra trong kỳ</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{vat.totalSalesValue.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono text-amber-700">{vat.totalOutputTax.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-red-50 font-bold border-t border-slate-400 text-slate-900">
                    <td className="p-2 border-r border-slate-300 text-center">[36]</td>
                    <td className="p-2 border-r border-slate-300 text-red-800">Thuế GTGT phát sinh phải nộp trong kỳ ([35] - [25] - [22] &gt; 0)</td>
                    <td className="p-2 border-r border-slate-300 text-right text-slate-400">-</td>
                    <td className="p-2 text-right font-mono text-red-700">{vat.netPayable.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-blue-50 font-bold text-slate-900">
                    <td className="p-2 border-r border-slate-300 text-center">[43]</td>
                    <td className="p-2 border-r border-slate-300 text-blue-800">Thuế GTGT còn được khấu trừ tiếp tục chuyển sang kỳ sau</td>
                    <td className="p-2 border-r border-slate-300 text-right text-slate-400">-</td>
                    <td className="p-2 text-right font-mono text-blue-700">{vat.netCarryover.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Print trigger footer inside form */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                In Tờ Khai Thuế GTGT (Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PL BÁN RA 01-1/GTGT */}
      {activeSubTab === 'PL_BANRA' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Bảng kê Hóa đơn, Chứng từ Hàng hóa dịch vụ bán ra (Phụ lục 01-1/GTGT)</h3>
            <span className="text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 p-1 px-2.5 rounded-full font-bold">
              Lũy kế thuế: {vat.totalOutputTax.toLocaleString()} đ
            </span>
          </div>

          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-semibold">
                  <th className="p-4 px-6 text-center w-12">STT</th>
                  <th className="p-4 px-4">Số Hóa Đơn</th>
                  <th className="p-4 px-4">Ký Hiệu</th>
                  <th className="p-4 px-4">Ngày Xuất</th>
                  <th className="p-4 px-6">Khách hàng nhận</th>
                  <th className="p-4 px-4 text-center">Thuế suất</th>
                  <th className="p-4 px-6 text-right">Doanh thu trước thuế</th>
                  <th className="p-4 px-6 text-right">Thuế GTGT đầu ra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {salesInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-normal">
                      Chưa phát sinh hóa đơn bán ra nào trong kỳ.
                    </td>
                  </tr>
                ) : (
                  salesInvoices.map((inv, idx) => {
                    const baseAmount = inv.items.reduce((s: number, item: any) => s + item.thanhTien, 0);
                    const taxAmount = inv.items.reduce((s: number, item: any) => s + item.tienThue, 0);
                    const rateStr = inv.items.map((i: any) => `${i.thueSuat}%`).join(', ');
                    const partnerName = partners.find(p => p.code === inv.maKH)?.name || inv.maKH;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 px-6 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="p-4 px-4 font-bold text-indigo-700">{inv.soHD}</td>
                        <td className="p-4 px-4 font-mono text-xs font-semibold text-slate-600">{inv.kyHieuHD}</td>
                        <td className="p-4 px-4 font-mono text-xs text-slate-500">{inv.ngayHD}</td>
                        <td className="p-4 px-6 max-w-xs truncate">{partnerName}</td>
                        <td className="p-4 px-4 text-center font-mono text-xs text-amber-700 font-bold bg-amber-50 rounded-md py-0.5 w-fit mx-auto block">{rateStr}</td>
                        <td className="p-4 px-6 text-right font-mono text-slate-700">{baseAmount.toLocaleString()}</td>
                        <td className="p-4 px-6 text-right font-mono text-rose-700 font-bold">{taxAmount.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PL MUA VÀO 01-2/GTGT */}
      {activeSubTab === 'PL_MUAVAO' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Bảng kê Hóa đơn, Chứng từ Hàng hóa dịch vụ mua vào (Phụ lục 01-2/GTGT)</h3>
            <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 p-1 px-2.5 rounded-full font-bold">
              Công trừ VAT: {vat.inputTaxValue.toLocaleString()} đ
            </span>
          </div>

          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-semibold">
                  <th className="p-4 px-6 text-center w-12">STT</th>
                  <th className="p-4 px-4">Số Hóa Đơn</th>
                  <th className="p-4 px-4">Ký Hiệu</th>
                  <th className="p-4 px-4">Ngày Nhật</th>
                  <th className="p-4 px-6">Nhà cung cấp xuất</th>
                  <th className="p-4 px-4 text-center">Thuế suất</th>
                  <th className="p-4 px-6 text-right">Giá trị trước thuế</th>
                  <th className="p-4 px-6 text-right">Thuế GTGT đầu vào</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {purchaseInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-normal">
                      Chưa phát sinh hóa đơn mua vào nào trong kỳ.
                    </td>
                  </tr>
                ) : (
                  purchaseInvoices.map((inv, idx) => {
                    const baseAmount = inv.items.reduce((s: number, item: any) => s + item.thanhTien, 0);
                    const taxAmount = inv.items.reduce((s: number, item: any) => s + item.tienThue, 0);
                    const rateStr = inv.items.map((i: any) => `${i.thueSuat}%`).join(', ');
                    const partnerName = partners.find(p => p.code === inv.maKH)?.name || inv.maKH;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 px-6 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="p-4 px-4 font-bold text-emerald-800">{inv.soHD}</td>
                        <td className="p-4 px-4 font-mono text-xs font-semibold text-slate-600">{inv.kyHieuHD}</td>
                        <td className="p-4 px-4 font-mono text-xs text-slate-500">{inv.ngayHD}</td>
                        <td className="p-4 px-6 max-w-xs truncate">{partnerName}</td>
                        <td className="p-4 px-4 text-center font-mono text-xs text-emerald-700 font-bold bg-emerald-50 rounded-md py-0.5 w-fit mx-auto block">{rateStr}</td>
                        <td className="p-4 px-6 text-right font-mono text-slate-700">{baseAmount.toLocaleString()}</td>
                        <td className="p-4 px-6 text-right font-mono text-emerald-700 font-bold">{taxAmount.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BÁO CÁO TÌNH HÌNH SỬ DỤNG HÓA ĐƠN BC26/AC */}
      {activeSubTab === 'BC26' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Báo cáo tình hình sử dụng hóa đơn (Mẫu BC26/AC)</h3>
            <p className="text-xs text-slate-500 mt-1">Phân hệ tự động tập hợp từ hoạt động phát hành hóa đơn tự in ký hiệu BM/26E ký trong tháng 06/2026</p>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold text-center">
                  <th className="p-2 border border-slate-200 row-span-2 text-center" rowSpan={2}>STT</th>
                  <th className="p-2 border border-slate-200 text-center" rowSpan={2}>Ký hiệu HĐ</th>
                  <th className="p-2 border border-slate-200 text-center" rowSpan={2}>Tổng số mua trong kỳ</th>
                  <th className="p-2 border border-slate-200" colSpan={2}>Số tồn đầu kỳ</th>
                  <th className="p-2 border border-slate-200" colSpan={4}>Tình hình sử dụng trong kỳ</th>
                  <th className="p-2 border border-slate-200" colSpan={2}>Số tồn cuối kỳ</th>
                </tr>
                <tr className="bg-slate-100 text-slate-700 font-bold text-center">
                  <th className="p-2 border border-slate-200">Từ số</th>
                  <th className="p-2 border border-slate-200">Đến số</th>
                  
                  <th className="p-2 border border-slate-200 text-emerald-700">Đã sử dụng</th>
                  <th className="p-2 border border-slate-200 text-amber-700">Xóa bỏ</th>
                  <th className="p-2 border border-slate-200 text-rose-700">Mất</th>
                  <th className="p-2 border border-slate-200 text-red-700">Hủy</th>
                  
                  <th className="p-2 border border-slate-200">Từ số</th>
                  <th className="p-2 border border-slate-200">Đến số</th>
                </tr>
              </thead>
              <tbody className="text-center font-medium font-sans">
                <tr>
                  <td className="p-3 border border-slate-200 text-slate-500">1</td>
                  <td className="p-3 border border-slate-200 font-mono font-bold text-indigo-700">BM/26E</td>
                  <td className="p-3 border border-slate-200 font-mono">100</td>
                  <td className="p-3 border border-slate-200 font-mono">0000001</td>
                  <td className="p-3 border border-slate-200 font-mono">0000100</td>
                  
                  <td className="p-3 border border-slate-200 font-mono text-emerald-600 font-black">{salesInvoices.length}</td>
                  <td className="p-3 border border-slate-200 font-mono text-amber-500">0</td>
                  <td className="p-3 border border-slate-200 font-mono text-rose-500">0</td>
                  <td className="p-3 border border-slate-200 font-mono text-red-500">0</td>
                  
                  {/* Ending formula */}
                  <td className="p-3 border border-slate-200 font-mono">{(salesInvoices.length + 1).toString().padStart(7, '0')}</td>
                  <td className="p-3 border border-slate-200 font-mono">0000100</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3">
            <Clipboard className="w-5 h-5 text-indigo-500" />
            <span className="text-xs text-slate-500 font-medium">Báo cáo tự động tính toán số sê-ri hóa đơn kế tiếp dựa trên cơ sở dữ liệu hóa đơn bán hàng trực thuộc hệ thống.</span>
          </div>
        </div>
      )}

    </div>
  );
}
