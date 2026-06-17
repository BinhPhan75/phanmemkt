/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAccounting } from '../utils/accountingState';
import { InventoryItem } from '../types';
import { Box, FileText, Download, Upload, Plus, Printer, AlertCircle, ShoppingBag } from 'lucide-react';

export default function KhoVatTu() {
  const { items, transactions, addItem } = useAccounting();
  const [selectedItemCode, setSelectedItemCode] = useState<string>('CHI202.300');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [printDocument, setPrintDocument] = useState<any | null>(null);

  // New item form state
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({
    code: '',
    name: '',
    unit: '',
    account: '152',
    openingQty: 0,
    openingValue: 0
  });

  // Calculate Moving Average ledger for a single item
  const getItemLedger = (itemCode: string) => {
    const item = items.find(i => i.code === itemCode);
    if (!item) return { lines: [], openingQty: 0, openingValue: 0, currentQty: 0, currentValue: 0, avgPrice: 0 };

    let currentQty = item.openingQty;
    let currentValue = item.openingValue;

    const lines: Array<{
      date: string;
      docNo: string;
      type: 'NHAP' | 'XUAT';
      description: string;
      qty: number;
      price: number;
      value: number;
      stockQtyAfter: number;
      stockValAfter: number;
      originalTx: any;
    }> = [];

    // Collect all invoice lines where item is included
    const records: Array<{
      date: string;
      docNo: string;
      loaiHD: 'MV' | 'BR';
      description: string;
      qty: number;
      price: number;
      originalTx: any;
    }> = [];

    transactions.forEach(tx => {
      if (tx.type === 'HOADON') {
        tx.items.forEach(lineItem => {
          if (lineItem.maHang === itemCode) {
            records.push({
              date: tx.ngayHD,
              docNo: tx.soHD,
              loaiHD: tx.loaiHD,
              description: tx.dienGiai,
              qty: lineItem.soLuong,
              price: lineItem.donGia,
              originalTx: tx
            });
          }
        });
      }
    });

    // Sort transactions chronologically
    records.sort((a, b) => a.date.localeCompare(b.date));

    // Evaluate stock balances step by step (Moving Average)
    records.forEach(rec => {
      if (rec.loaiHD === 'MV') {
        // Purchase: Increases stock with actual purchase cost
        const purchaseVal = rec.qty * rec.price;
        currentQty += rec.qty;
        currentValue += purchaseVal;

        lines.push({
          date: rec.date,
          docNo: `PNK-${rec.docNo}`,
          type: 'NHAP',
          description: rec.description,
          qty: rec.qty,
          price: rec.price,
          value: purchaseVal,
          stockQtyAfter: currentQty,
          stockValAfter: currentValue,
          originalTx: rec.originalTx
        });
      } else {
        // Sale: Decreases stock. Cost price evaluated dynamically via cumulative average
        const avgPrice = currentQty > 0 ? (currentValue / currentQty) : 0;
        const cogsVal = rec.qty * avgPrice;

        currentQty -= rec.qty;
        currentValue -= cogsVal;

        lines.push({
          date: rec.date,
          docNo: `PXK-${rec.docNo}`,
          type: 'XUAT',
          description: rec.description,
          qty: rec.qty,
          price: avgPrice,
          value: cogsVal,
          stockQtyAfter: currentQty,
          stockValAfter: currentValue,
          originalTx: rec.originalTx
        });
      }
    });

    const finalAvg = currentQty > 0 ? (currentValue / currentQty) : (item.openingQty > 0 ? item.openingValue / item.openingQty : 0);

    return {
      lines,
      openingQty: item.openingQty,
      openingValue: item.openingValue,
      currentQty,
      currentValue,
      avgPrice: finalAvg
    };
  };

  // Compile overall Inventory Balances list
  const getOverallInventorySummary = () => {
    return items.map(item => {
      const { lines, openingQty, openingValue, currentQty, currentValue } = getItemLedger(item.code);
      
      const totalImportQty = lines.filter(l => l.type === 'NHAP').reduce((s, l) => s + l.qty, 0);
      const totalImportVal = lines.filter(l => l.type === 'NHAP').reduce((s, l) => s + l.value, 0);

      const totalExportQty = lines.filter(l => l.type === 'XUAT').reduce((s, l) => s + l.qty, 0);
      const totalExportVal = lines.filter(l => l.type === 'XUAT').reduce((s, l) => s + l.value, 0);

      return {
        item,
        openingQty,
        openingValue,
        importQty: totalImportQty,
        importValue: totalImportVal,
        exportQty: totalExportQty,
        exportValue: totalExportVal,
        endingQty: currentQty,
        endingValue: currentValue
      };
    });
  };

  const inventorySummary = getOverallInventorySummary();
  const selectedLedger = selectedItemCode ? getItemLedger(selectedItemCode) : null;
  const activeItemItem = items.find(i => i.code === selectedItemCode);

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.code || !newItem.name || !newItem.unit) {
      alert('Vui lòng điền đầy đủ mã hàng, tên và ĐVT!');
      return;
    }

    addItem({
      id: newItem.code,
      ...newItem,
      openingQty: Number(newItem.openingQty) || 0,
      openingValue: Number(newItem.openingValue) || 0
    });

    setNewItem({
      code: '',
      name: '',
      unit: '',
      account: '152',
      openingQty: 0,
      openingValue: 0
    });

    setShowAddItemModal(false);
    alert('Thêm vật tư hàng hóa thành công!');
  };

  // Trigger print document modal representation
  const handlePrintDocument = (line: any) => {
    const isNhap = line.type === 'NHAP';
    const tx = line.originalTx;

    const printData = {
      isNhap,
      title: isNhap ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO',
      docNo: line.docNo,
      date: line.date,
      itemName: activeItemItem?.name || 'Vật tư',
      unit: activeItemItem?.unit || 'Đơn vị',
      qty: line.qty,
      price: line.price,
      value: line.value,
      description: line.description,
      partnerName: tx?.maKH ? tx.maKH : 'Không rõ',
    };

    setPrintDocument(printData);
  };

  return (
    <div className="space-y-6" id="ketoan-kho-panel">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Box className="w-6 h-6" />
            </span>
            Kế toán Kho & Nguyên Vật Liệu, Hàng Hóa
          </h2>
          <p className="text-sm text-slate-500 mt-1 mt-0.5">Phân hệ quản lý kho nguyên vật liệu (152) và hàng hóa (156) theo phương pháp giá xuất bình quân liên hoàn</p>
        </div>

        <button
          onClick={() => setShowAddItemModal(true)}
          className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-100"
          id="add-new-item-btn"
        >
          <Plus className="w-4 h-4" />
          Khai báo Vật tư, Hàng hóa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Columns - Summarization Stock of all goods */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-500" />
              Bảng Tổng Hợp Tồn Kho Vật Tư - Hàng Hóa
            </h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Mã Vật Tư</th>
                  <th className="py-3 px-4">Tên hàng hóa, vật tư</th>
                  <th className="py-3 px-2 text-center">ĐVT</th>
                  <th className="py-3 px-3 text-right">Dư đầu kỳ (Số lượng / Giá trị)</th>
                  <th className="py-3 px-3 text-right">Nhập trong kỳ</th>
                  <th className="py-3 px-3 text-right">Xuất trong kỳ</th>
                  <th className="py-3 px-4 text-right">Tồn cuối kỳ (Số lượng / Giá trị)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-sm">
                {inventorySummary.map((row, idx) => {
                  const isSelected = selectedItemCode === row.item.code;
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/70 transition cursor-pointer ${
                        isSelected ? 'bg-emerald-50/40 text-emerald-950 border-l-4 border-l-emerald-600' : ''
                      }`}
                      onClick={() => setSelectedItemCode(row.item.code)}
                    >
                      <td className="py-4 px-4 font-mono text-xs">{row.item.code}</td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-800 block">{row.item.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">TK Kho: {row.item.account}</span>
                      </td>
                      <td className="py-4 px-2 text-center text-slate-500">{row.item.unit}</td>
                      
                      <td className="py-4 px-3 text-right font-mono">
                        <div className="font-bold text-slate-700">{row.openingQty.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">{row.openingValue.toLocaleString()} đ</div>
                      </td>

                      <td className="py-4 px-3 text-right font-mono text-emerald-600">
                        <div>+{row.importQty.toLocaleString()}</div>
                        <div className="text-[10px]">+{row.importValue.toLocaleString()} đ</div>
                      </td>

                      <td className="py-4 px-3 text-right font-mono text-rose-600">
                        <div>-{row.exportQty.toLocaleString()}</div>
                        <div className="text-[10px]">-{row.exportValue.toLocaleString()} đ</div>
                      </td>

                      <td className="py-4 px-4 text-right font-mono">
                        <div className="font-bold text-emerald-800">{row.endingQty.toLocaleString()}</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">{row.endingValue.toLocaleString()} đ</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column - Stock Card and Voucher details */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-emerald-100 bg-emerald-50/30">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Sổ Chi Tiết & Thẻ Kho Vật Tư
            </h3>
            <p className="text-xs text-slate-500 mt-1">Chọn vật tư ở bảng trái để hiển thị thẻ kho chi tiết</p>
          </div>

          {selectedLedger && activeItemItem ? (
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="bg-slate-100 p-4 rounded-xl text-xs space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">{activeItemItem.name}</h4>
                  <p className="text-slate-500"><strong>Đơn vị tính:</strong> {activeItemItem.unit} | <strong>Tài khoản:</strong> {activeItemItem.account}</p>
                  <p className="text-slate-500"><strong>Đơn giá bình quân di động:</strong> {Math.round(selectedLedger.avgPrice).toLocaleString()} đ/đv</p>
                </div>

                <div className="mt-4 space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nhật ký Nhập - Xuất kho</h5>
                  
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {selectedLedger.lines.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400 font-normal">
                        Vật tư này chưa phát sinh nhập xuất trong kỳ.
                      </div>
                    ) : (
                      selectedLedger.lines.map((line, lidx) => (
                        <div key={lidx} className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg transition text-xs flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                                line.type === 'NHAP' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>{line.type}</span>
                              <span className="font-bold text-slate-700">{line.docNo}</span>
                            </div>
                            <div className="text-slate-500 font-normal max-w-[170px] truncate">{line.description}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ngày: {line.date}</div>
                          </div>

                          <div className="text-right font-mono">
                            <div className="font-bold text-slate-800">{line.qty} {activeItemItem.unit}</div>
                            <div className="text-[10px] text-slate-400">{Math.round(line.price).toLocaleString()} đ</div>
                            <button
                              onClick={() => handlePrintDocument(line)}
                              className="text-[10px] text-blue-600 block hover:underline font-sans font-bold cursor-pointer mt-1"
                              id={`print-stock-doc-${lidx}`}
                            >
                              In phiếu {line.type === 'NHAP' ? 'nhập' : 'xuất'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Total Card and info */}
              <div className="pt-4 border-t border-slate-100 bg-emerald-50/50 p-4 rounded-xl text-xs space-y-1.5 mt-4">
                <div className="flex justify-between text-slate-600">
                  <span>Tồn đầu kỳ:</span>
                  <span className="font-mono">{selectedLedger.openingQty.toLocaleString()} {activeItemItem.unit}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Nhập trong kỳ:</span>
                  <span className="font-mono text-emerald-600">
                    +{selectedLedger.lines.filter(l => l.type === 'NHAP').reduce((s,l)=> s+l.qty, 0).toLocaleString()} {activeItemItem.unit}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Xuất trong kỳ:</span>
                  <span className="font-mono text-rose-600">
                    -{selectedLedger.lines.filter(l => l.type === 'XUAT').reduce((s,l)=> s+l.qty, 0).toLocaleString()} {activeItemItem.unit}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-800 pt-1.5 border-t border-dashed border-emerald-200">
                  <span>Tồn cuối kỳ kho:</span>
                  <span className="font-mono text-emerald-800">{selectedLedger.currentQty.toLocaleString()} {activeItemItem.unit}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-normal">
                  <span>Trị giá tồn kho cuối:</span>
                  <span className="font-mono text-emerald-700 font-semibold">{selectedLedger.currentValue.toLocaleString()} đ</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 italic font-normal flex-1 flex flex-col justify-center items-center gap-2">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              Chọn một dòng mặt hàng ở bảng trái để hiển thị Thẻ kho và hạch toán giá vốn chi tiết.
            </div>
          )}
        </div>
      </div>

      {/* NEW ITEM MODAL */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 font-bold text-slate-800 text-sm">
              Khai báo và Đăng ký Vật tư / Hàng hóa kho
            </div>
            
            <form onSubmit={handleAddItemSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Mã hàng / Mã Vật tư</label>
                <input
                  type="text"
                  required
                  placeholder="VD: VAIDUTY.KO"
                  value={newItem.code}
                  onChange={(e) => setNewItem(item => ({ ...item, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Tên vật tư, hàng hóa chi tiết</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Vải Kaki chống thấm Hàn Quốc"
                  value={newItem.name}
                  onChange={(e) => setNewItem(item => ({ ...item, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Đơn vị tính (ĐVT)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cuộn, Mét, Kg..."
                    value={newItem.unit}
                    onChange={(e) => setNewItem(item => ({ ...item, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Tài khoản kho</label>
                  <select
                    value={newItem.account}
                    onChange={(e) => setNewItem(item => ({ ...item, account: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="152">Nguyên vật liệu (152)</option>
                    <option value="156">Hàng hóa thương mại (156)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Số lượng đầu kỳ</label>
                  <input
                    type="number"
                    value={newItem.openingQty}
                    onChange={(e) => setNewItem(item => ({ ...item, openingQty: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Trị giá đầu kỳ (đ)</label>
                  <input
                    type="number"
                    value={newItem.openingValue}
                    onChange={(e) => setNewItem(item => ({ ...item, openingValue: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 transition flex-1 cursor-pointer"
                  id="submit-new-item"
                >
                  Ghi sổ và Tạo mặt hàng
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs hover:bg-slate-200 transition cursor-pointer"
                  id="cancel-add-item"
                >
                  Hủy bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT SLIP PREVIEW MODAL */}
      {printDocument && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden" id="print-stock-modal">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Xem thử bản in phiếu kho</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In Phiếu
                </button>
                <button
                  onClick={() => setPrintDocument(null)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300 transition cursor-pointer"
                  id="close-print-stock-modal"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Slip Sheet content */}
            <div className="p-8 pb-12 font-serif text-slate-800 bg-white" id="stock-print-area">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h4 className="font-bold text-[11px] text-slate-950 font-sans uppercase">CÔNG TY TNHH BÌNH PHAN PHÁT</h4>
                  <p className="text-[9px] font-sans text-slate-400">Thị trấn Diên Sanh, Hải Lăng, Quảng Trị</p>
                </div>
                <div className="text-right">
                  <h5 className="font-bold text-[9px] uppercase font-sans">Mẫu số 02-VT / 03-VT</h5>
                  <p className="text-[8px] font-sans text-slate-400 italic">(Ban hành theo Thông tư 133/2016/TT-BTC)</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center my-6 space-y-1">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide">{printDocument.title}</h3>
                <p className="text-[11px] text-slate-500 italic">Ngày thực hiện: {printDocument.date}</p>
                <p className="text-xs font-mono font-bold text-slate-700">Mã Chứng từ: {printDocument.docNo}</p>
              </div>

              {/* Core tables */}
              <div className="text-xs space-y-2.5 mt-4">
                <div className="flex">
                  <span className="w-40 text-slate-500 italic">Đơn vị nhận / gửi giao dịch:</span>
                  <span className="font-bold border-b border-dotted border-slate-300 flex-1">{printDocument.partnerName}</span>
                </div>
                <div className="flex">
                  <span className="w-40 text-slate-500 italic">Lý do kho bãi:</span>
                  <span className="border-b border-dotted border-slate-300 flex-1">{printDocument.description}</span>
                </div>
              </div>

              {/* Goods Grid table for slip */}
              <table className="w-full text-left text-xs border border-slate-300 mt-6 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 font-sans font-semibold text-slate-700">
                    <th className="p-2 border-r border-slate-300">Tên vật tư, hàng hóa</th>
                    <th className="p-2 border-r border-slate-300 text-center">ĐVT</th>
                    <th className="p-2 border-r border-slate-300 text-center">Số lượng</th>
                    <th className="p-2 border-r border-slate-300 text-right">Đơn giá</th>
                    <th className="p-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-normal font-sans">
                    <td className="p-2 border-r border-slate-300 font-bold text-slate-850">{printDocument.itemName}</td>
                    <td className="p-2 border-r border-slate-300 text-center text-slate-500">{printDocument.unit}</td>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">{printDocument.qty}</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{Math.round(printDocument.price).toLocaleString()}</td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">{Math.round(printDocument.value).toLocaleString()} đ</td>
                  </tr>
                </tbody>
              </table>

              <div className="text-right text-xs mt-4 font-sans font-semibold">
                Thành tiền bằng chữ: <em className="text-slate-600">Đại diện thanh toán kho bãi theo giá xuất kho liên hoàn.</em>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-4 gap-2 mt-12 text-center text-[10px] font-sans pt-3 border-t border-slate-100">
                <div className="space-y-10">
                  <span className="font-bold text-slate-800 block">Thủ trưởng Đơn vị</span>
                  <span className="text-slate-400 italic block">(Ký, đóng dấu)</span>
                </div>
                <div className="space-y-10">
                  <span className="font-bold text-slate-800 block">Kế toán trưởng</span>
                  <span className="text-slate-400 italic block">(Ký, họ tên)</span>
                </div>
                <div className="space-y-10">
                  <span className="font-bold text-slate-800 block">Người Giao / Nhận</span>
                  <span className="text-slate-400 italic block">(Ký, họ tên)</span>
                </div>
                <div className="space-y-10">
                  <span className="font-bold text-slate-800 block">Thủ kho ký nhận</span>
                  <span className="text-slate-400 italic block">(Ký, họ tên)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
