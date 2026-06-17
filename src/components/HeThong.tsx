/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  HelpCircle,
  Building
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
    resetToDefault,
    companyInfo,
    updateCompanyInfo,
    currentUser,
    setCurrentUser
  } = useAccounting() as any;

  // Local state for company profile form fields
  const [compName, setCompName] = useState(companyInfo?.name || '');
  const [compAddress, setCompAddress] = useState(companyInfo?.address || '');
  const [compPhone, setCompPhone] = useState(companyInfo?.phone || '');
  const [compBankAccount, setCompBankAccount] = useState(companyInfo?.bankAccount || '');
  const [compBankName, setCompBankName] = useState(companyInfo?.bankName || '');
  const [compRepresentative, setCompRepresentative] = useState(companyInfo?.representative || '');
  const [compTaxCode, setCompTaxCode] = useState(companyInfo?.taxCode || '');
  const [compProvince, setCompProvince] = useState(companyInfo?.province || '');
  const [compEmail, setCompEmail] = useState(companyInfo?.email || '');
  const [compZalo, setCompZalo] = useState(companyInfo?.zalo || '');
  const [compFacebook, setCompFacebook] = useState(companyInfo?.facebook || '');
  const [compPosition, setCompPosition] = useState(companyInfo?.position || '');
  const [compStartDate, setCompStartDate] = useState(companyInfo?.startDate || '2025-01-01');
  const [compEndDate, setCompEndDate] = useState(companyInfo?.endDate || '2026-12-31');

  // Quiet sync when companyInfo changes (e.g. from restore backup or reset)
  useEffect(() => {
    if (companyInfo) {
      setCompName(companyInfo.name || '');
      setCompAddress(companyInfo.address || '');
      setCompPhone(companyInfo.phone || '');
      setCompBankAccount(companyInfo.bankAccount || '');
      setCompBankName(companyInfo.bankName || '');
      setCompRepresentative(companyInfo.representative || '');
      setCompTaxCode(companyInfo.taxCode || '');
      setCompProvince(companyInfo.province || '');
      setCompEmail(companyInfo.email || '');
      setCompZalo(companyInfo.zalo || '');
      setCompFacebook(companyInfo.facebook || '');
      setCompPosition(companyInfo.position || '');
      setCompStartDate(companyInfo.startDate || '2025-01-01');
      setCompEndDate(companyInfo.endDate || '2026-12-31');
    }
  }, [companyInfo]);

  const handleSaveCompanyInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'ADMIN') {
      alert('🔒 Thao tác bị từ chối! Chỉ người dùng có vai trò [ADMIN] mới được phép sửa đổi cấu hình và thông tin doanh nghiệp.');
      return;
    }
    updateCompanyInfo({
      name: compName,
      address: compAddress,
      phone: compPhone,
      bankAccount: compBankAccount,
      bankName: compBankName,
      representative: compRepresentative,
      taxCode: compTaxCode,
      province: compProvince,
      email: compEmail,
      zalo: compZalo,
      facebook: compFacebook,
      position: compPosition,
      startDate: compStartDate,
      endDate: compEndDate
    });
    alert('Đã cập nhật cấu hình thông tin doanh nghiệp thành công trên hệ thống!');
  };

  const [newYearInput, setNewYearInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleCreateNewYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'ADMIN') {
      alert('🔒 Thao tác bị từ chối! Chỉ người dùng có vai trò [ADMIN] mới được phép khởi tạo năm hạch toán mới.');
      return;
    }
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

      {/* PHÂN QUYỀN VÀ USER ACCOUNT MAPPING TO SUPABASE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 font-sans" id="section-phan-quyen-nguoi-dung">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold font-mono">Table: accounting_users</span>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Phân quyền & Tài khoản người dùng (Supabase Auth/Roles)</h3>
          </div>
          <span className="text-[10px] text-amber-600 font-extrabold font-mono bg-amber-50 border border-amber-150 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Phân quyền hạch toán
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
          Bảng <code className="bg-slate-100 px-1 py-0.5 text-slate-700 font-mono text-[10px] rounded">accounting_users</code> trên Supabase quản lý danh sách người dùng và vai trò để phân tách quyền hạn (Role-based access controls):
          <br />• <strong className="text-slate-800">ADMIN (Quản trị viên)</strong>: Toàn quyền cấu hình kết nối API, tạo/khóa niên độ hạch toán, khôi phục hoặc đặt lại dữ liệu hạch toán ban đầu.
          <br />• <strong className="text-slate-800">ACCOUNTANT (Kế toán viên)</strong>: Thao tác lập phiếu hạch toán (Hóa đơn, Phiếu thu/chi quỹ, Báo nợ/có) thường nhật nhưng bị đóng băng các lệnh quản lý cấu hình lõi hệ thống.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* User selector list */}
          <div className="border border-slate-150 rounded-xl p-4 space-y-3 bg-slate-50/40">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Chọn tài khoản người dùng hạch toán:</span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentUser({
                    id: 'usr-001',
                    username: 'admin_binh',
                    email: 'binhphan.222720@gmail.com',
                    fullName: 'Bình Phan (Quản trị viên)',
                    role: 'ADMIN'
                  });
                }}
                className={`w-full p-2.5 rounded-xl text-left transition text-xs flex justify-between items-center border cursor-pointer ${
                  currentUser?.id === 'usr-001'
                    ? 'bg-indigo-50 border-indigo-255 text-indigo-900 font-bold shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                }`}
              >
                <div>
                  <p className="font-bold text-slate-800">admin_binh (Bình Phan)</p>
                  <p className="text-[10px] text-slate-400 font-normal">Email: binhphan.222720@gmail.com</p>
                </div>
                <span className="px-2 py-0.5 bg-indigo-600 text-white font-extrabold text-[8px] rounded-md uppercase tracking-wider">ADMIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentUser({
                    id: 'usr-002',
                    username: 'ketoan_lan',
                    email: 'lan.nguyen@example.com',
                    fullName: 'Nguyễn Thị Lan (Kế toán)',
                    role: 'ACCOUNTANT'
                  });
                }}
                className={`w-full p-2.5 rounded-xl text-left transition text-xs flex justify-between items-center border cursor-pointer ${
                  currentUser?.id === 'usr-002'
                    ? 'bg-emerald-50 border-emerald-255 text-emerald-950 font-bold shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                }`}
              >
                <div>
                  <p className="font-bold text-slate-800">ketoan_lan (Nguyễn Thị Lan)</p>
                  <p className="text-[10px] text-slate-400 font-normal">Email: lan.nguyen@example.com</p>
                </div>
                <span className="px-2 py-0.5 bg-teal-600 text-white font-extrabold text-[8px] rounded-md uppercase tracking-wider">ACCOUNTANT</span>
              </button>
            </div>
          </div>

          {/* Current Selection Status info */}
          <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Trạng thái phân quyền hệ thống:</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-extrabold text-xs text-slate-800">{currentUser?.fullName}</span>
                <span className={`px-2 py-0.5 font-mono text-[8px] font-extrabold rounded-md uppercase ${
                  currentUser?.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-150 text-emerald-800'
                }`}>
                  {currentUser?.role}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-600 mt-2 leading-relaxed">
                {currentUser?.role === 'ADMIN' 
                  ? '✓ Bạn có quyền quản trị tối cao của hệ thống. Bạn được phép thay đổi thông tin doanh nghiệp, mở niên độ, khóa sổ tài chính năm học hạch toán, sao lưu và đồng bộ đẩy/tải dữ liệu trực tiếp với dịch vụ Supabase Cloud.'
                  : '⚠ Bạn đang truy cập với quyền kế toán hành sự. Chức năng sửa cấu hình lõi hệ thống đã khóa để tránh làm hỏng tệp sổ gốc. Hệ thống cho phép bạn toàn quyền hạch hóa hóa đơn, phiếu thu chi quỹ, và xuất sổ kế toán.'}
              </p>
            </div>
            
            <div className="text-[9px] text-indigo-600 italic font-medium flex items-center gap-1 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Đồng nhất với schema DDL Supabase và chính sách Row Level Security (RLS)
            </div>
          </div>
        </div>
      </div>

      {/* THÔNG TIN DOANH NGHIỆP SECTION */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4" id="section-thong-tin-doanh-nghiep">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Cấu hình Thông tin doanh nghiệp</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold font-mono bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md">TT 133/2016/TT-BTC</span>
        </div>

        <form onSubmit={handleSaveCompanyInfo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            
            {/* Cột trái */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tên doanh nghiệp:
                </label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold text-slate-800"
                  placeholder="CÔNG TY TNHH THƯƠNG MẠI TỔNG HỢP ABC"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Địa chỉ:
                </label>
                <input
                  type="text"
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-700"
                  placeholder="TP Đà Nẵng"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Số điện thoại:
                </label>
                <input
                  type="text"
                  value={compPhone}
                  onChange={(e) => setCompPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium font-mono text-slate-700"
                  placeholder="Nhập số điện thoại..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tài khoản ngân hàng:
                </label>
                <input
                  type="text"
                  value={compBankAccount}
                  onChange={(e) => setCompBankAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold font-mono text-slate-800"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tên Ngân hàng:
                </label>
                <input
                  type="text"
                  value={compBankName}
                  onChange={(e) => setCompBankName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold text-slate-700"
                  placeholder="NH XXXXX"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Người đại diện:
                </label>
                <input
                  type="text"
                  value={compRepresentative}
                  onChange={(e) => setCompRepresentative(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-700"
                  placeholder="Tên người đại diện..."
                />
              </div>
            </div>

            {/* Cột phải */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Mã số thuế:
                </label>
                <input
                  type="text"
                  value={compTaxCode}
                  onChange={(e) => setCompTaxCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold font-mono text-slate-800"
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tỉnh/TP:
                </label>
                <input
                  type="text"
                  value={compProvince}
                  onChange={(e) => setCompProvince(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold text-slate-700"
                  placeholder="Quảng Nam"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Email:
                </label>
                <input
                  type="text"
                  value={compEmail}
                  onChange={(e) => setCompEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-750"
                  placeholder="xxxgmail.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Zalo:
                </label>
                <input
                  type="text"
                  value={compZalo}
                  onChange={(e) => setCompZalo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold font-mono text-slate-700"
                  placeholder="949595969"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Facebook:
                </label>
                <input
                  type="text"
                  value={compFacebook}
                  onChange={(e) => setCompFacebook(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-700"
                  placeholder="Nhập link trang cá nhân/doanh nghiệp..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Chức vụ:
                </label>
                <input
                  type="text"
                  value={compPosition}
                  onChange={(e) => setCompPosition(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold text-slate-700"
                  placeholder="Giám đốc"
                />
              </div>
            </div>
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chu kỳ hạch toán từ ngày:</label>
              <input
                type="date"
                value={compStartDate}
                onChange={(e) => setCompStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Đến ngày:</label>
              <input
                type="date"
                value={compEndDate}
                onChange={(e) => setCompEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-bold font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer hover:shadow-md active:scale-95"
              id="btn-save-company-info"
            >
              <CheckCircle2 className="w-4 h-4" />
              Lưu cấu hình thông tin doanh nghiệp
            </button>
          </div>
        </form>
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
                        onClick={() => {
                          if (currentUser?.role !== 'ADMIN') {
                            alert('🔒 Thao tác bị từ chối! Chỉ người dùng có vai trò [ADMIN] mới được phép khóa/mở khóa sổ kế toán của năm.');
                            return;
                          }
                          closeYear(year);
                        }}
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
              onClick={() => {
                if (currentUser?.role !== 'ADMIN') {
                  alert('🔒 Thao tác bị từ chối! Chỉ người dùng có vai trò [ADMIN] mới được phép reset dữ liệu gốc hạch toán.');
                  return;
                }
                if (window.confirm('Cảnh báo! Bạn có chắc chắn muốn xóa sạch dữ liệu hiện tại để đưa về cấu hình ban đầu không?')) {
                  resetToDefault();
                }
              }}
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
