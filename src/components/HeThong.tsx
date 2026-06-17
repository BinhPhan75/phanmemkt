/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useAccounting } from '../utils/accountingState';
import { 
  Lock, 
  Unlock, 
  CalendarPlus, 
  FolderDown, 
  FolderUp, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  RefreshCw,
  Archive,
  Calendar,
  Layers,
  HelpCircle
} from 'lucide-react';

export default function HeThong() {
  const {
    fiscalYears,
    currentFiscalYear,
    closedYears,
    setCurrentFiscalYear,
    closeYear,
    openNewYear,
    backupDatabase,
    restoreDatabase,
    allTransactions,
    resetToDefault
  } = useAccounting() as any;

  const [newYearInput, setNewYearInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleCreateNewYear = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanYear = newYearInput.trim();
    if (!cleanYear || isNaN(Number(cleanYear)) || cleanYear.length !== 4) {
      alert('Vui lòng nhập định dạng năm bằng 4 chữ số (ví dụ: 2027)!');
      return;
    }
    openNewYear(cleanYear);
    setNewYearInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        restoreDatabase(data);
      } catch (err) {
        alert('Tệp tin khôi phục không đúng định dạng JSON hoặc bị hỏng hóc!');
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target?.result as string);
          restoreDatabase(data);
        } catch (err) {
          alert('Tệp khôi phục không đúng cấu trúc hạch toán JSON của hệ thống!');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="panel-menu-he-thong">
      
      {/* Welcome Banner / Overview banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Database className="w-6 h-6 animate-pulse" />
            </span>
            Menu Quản trị Hệ Thống & Cơ sở dữ liệu
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Bảo trì niên độ hạch toán, phân bổ khóa sổ sổ sách năm, sao lưu an toàn và phục hồi cơ sở dữ liệu kế toán địa phương.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 py-1.5 px-3.5 rounded-full text-xs font-bold border border-emerald-100 shadow-xs">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span>Hệ thống hoạt động ổn định local</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. SECTION: FISCAL YEAR MANAGEMENT */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 flex flex-col justify-between" id="section-nien-do-ke-toan">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Niên khóa và Khởi tạo năm hạch toán</h3>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              Niên khóa hạch toán điều khiển tầm nhìn báo cáo và phân chia giao dịch. Khi đổi niên độ hạch toán, toàn bộ sổ sách quỹ và công nợ sẽ tự động lọc theo năm tương ứng.
            </p>

            {/* Selector list of Active Year */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase% tracking-widest block">Chọn năm hạch toán hiện hành</label>
              <div className="grid grid-cols-3 gap-2">
                {fiscalYears.map((year: string) => {
                  const isActive = currentFiscalYear === year;
                  const isLocked = closedYears.includes(year);
                  return (
                    <button
                      key={year}
                      onClick={() => setCurrentFiscalYear(year)}
                      type="button"
                      className={`relative p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isActive 
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 font-extrabold'
                          : 'border-slate-150 hover:border-slate-300 text-slate-600 bg-slate-50/20'
                      }`}
                      id={`choose-year-btn-${year}`}
                    >
                      <span className="text-sm">{year}</span>
                      {isLocked ? (
                        <div className="flex items-center gap-0.5 text-[8px] text-rose-600 font-black uppercase">
                          <Lock className="w-2 h-2" />
                          <span>Khóa</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 text-[8px] text-emerald-600 font-bold uppercase">
                          <Unlock className="w-2 h-2" />
                          <span>Mở</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick action to spawn a new year */}
            <form onSubmit={handleCreateNewYear} className="space-y-2 pt-2 border-t border-slate-50">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mở niên khóa nhập liệu mới</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Ví dụ: 2027"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-indigo-600 font-bold font-mono tracking-wider text-slate-800 shadow-inner"
                  id="new-year-input-field"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shrink-0 flex items-center gap-1 cursor-pointer shadow-sm"
                  id="submit-new-year-btn"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  Khởi tạo
                </button>
              </div>
            </form>
          </div>

          <div className="bg-slate-50 p-3.5 border border-slate-100 rounded-xl mt-4">
            <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-indigo-500 shrink-0" />
              Tại sao cần mở niên độ?
            </span>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal font-normal">
              Việc mở năm nhập liệu mới giúp tập trung dữ liệu từng năm, giảm thiểu rủi ro nhập đè hóa đơn cũ và phục vụ in ấn báo cáo tài chính hằng năm một cách bài bản.
            </p>
          </div>
        </div>

        {/* 2. SECTION: LOCK/CLOSE ACCOUNTING YEAR */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 flex flex-col justify-between" id="section-khoa-so-ke-toan">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Phân hệ Khóa sổ kế toán năm</h3>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              Khóa sổ kế toán đóng băng vĩnh viễn các chứng từ, hóa đơn phát sinh trong năm đó. Sau khi khóa sổ, kế toán viên không thể chỉnh sửa, xóa hoặc thêm mới giao dịch thuộc niên độ đó.
            </p>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Danh sách trạng thái khóa sổ các năm</label>
              
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {fiscalYears.map((year: string) => {
                  const isLocked = closedYears.includes(year);
                  return (
                    <div 
                      key={year}
                      className="flex items-center justify-between p-3 border border-slate-100 hover:bg-slate-50/50 rounded-xl transition"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">Niên độ {year}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => closeYear(year)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition ${
                          isLocked 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                        id={`toggle-lock-year-${year}`}
                      >
                        {isLocked ? (
                          <>
                            <Lock className="w-3 h-3 text-rose-500" />
                            <span>Mở khóa sổ</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 text-emerald-500" />
                            <span>Khóa sổ</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200/50 p-3.5 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold text-amber-800 uppercase">Khuyến nghị hạch toán pháp lý</h4>
              <p className="text-[10px] text-amber-700 leading-normal font-normal">
                Hãy chắc chắn báo cáo tài chính của năm đã được nộp cho cơ quan thuế trước khi tiến hành khóa sổ hạch toán.
              </p>
            </div>
          </div>
        </div>

        {/* 3. SECTION: BACKUP AND RESTORE */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 flex flex-col justify-between" id="section-sao-luu-khoi-phuc">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Archive className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Sao lưu & Khôi phục dữ liệu</h3>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              Vận hành an toàn thông tin kế toán của doanh nghiệp bằng cách sao lưu dự phòng định kỳ tệp tin cấu hình và dữ liệu hạch toán cục bộ.
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* Backup Button */}
              <button
                type="button"
                onClick={backupDatabase}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                id="btn-backup-hethong"
              >
                <FolderDown className="w-4 h-4" />
                Sao lưu dữ liệu xuống máy (.json)
              </button>

              {/* Restore Box */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed p-4 rounded-xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 min-h-[110px] ${
                  dragActive 
                    ? 'border-indigo-600 bg-indigo-50/30' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
                id="drop-zone-restore"
              >
                <FolderUp className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Khôi phục tệp sao lưu (.json)</span>
                <span className="text-[9px] text-slate-400">Kéo thả tệp sao lưu vào đây hoặc nhấp chuột để tải lên</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Reset to defaults Action */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold text-rose-800 uppercase block">Reset dữ liệu gốc</h4>
              <p className="text-[9px] text-slate-400 font-normal">Xóa toàn mảng và tải lại định mức ban đầu</p>
            </div>
            <button
              onClick={resetToDefault}
              type="button"
              className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 font-black text-[10px] uppercase rounded-lg transition cursor-pointer"
              id="btn-reset-data-default"
            >
              Đặt lại mẫu
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
