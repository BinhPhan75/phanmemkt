/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAccounting } from './utils/accountingState';
import QuyTienMat from './components/QuyTienMat';
import CongNo from './components/CongNo';
import KhoVatTu from './components/KhoVatTu';
import KeToanThue from './components/KeToanThue';
import InAnSoSach from './components/InAnSoSach';
import BaoCaoTaiChinh from './components/BaoCaoTaiChinh';
import NhapLieu from './components/NhapLieu';
import HeThong from './components/HeThong';
import { getSupabaseConfig, saveSupabaseConfig, getSupabaseSQLScript } from './utils/supabaseService';

import { 
  Briefcase, 
  Wallet, 
  Users, 
  Box, 
  Percent, 
  BookOpen, 
  TrendingUp, 
  PlusCircle, 
  CloudLightning, 
  Database, 
  Check, 
  Copy, 
  Settings, 
  X,
  FileSpreadsheet,
  ChevronDown,
  Menu
} from 'lucide-react';

export default function App() {
  const { 
    syncWithCloud,
    currentFiscalYear
  } = useAccounting();

  const [activeTab, setActiveTab] = useState<'QUY' | 'CONG_NO' | 'KHO' | 'THUE' | 'SO_SACH' | 'BCTC' | 'NHAP_LIEU' | 'HE_THONG'>('NHAP_LIEU');
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  
  // Supabase Settings overlay drawer state
  const [showSettings, setShowSettings] = useState(false);
  
  const initialConfig = getSupabaseConfig();
  const [urlInput, setUrlInput] = useState(initialConfig?.url || '');
  const [keyInput, setKeyInput] = useState(initialConfig?.anonKey || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  // Auto generated Supabase table definition script (for user's easy onboarding)
  const ddlSetupSql = getSupabaseSQLScript();

  const handleCopySql = () => {
    navigator.clipboard.writeText(ddlSetupSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig({ url: urlInput, anonKey: keyInput });
    setSyncStatusMsg('Đã cấu hình Supabase cục bộ thành công!');
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  const handlePushCloud = async () => {
    setSyncStatusMsg('Đang đóng gói và đẩy đồng bộ dữ liệu lên Cloud...');
    const ok = await syncWithCloud('upload');
    if (ok) {
      setSyncStatusMsg('Đồng bộ Cloud thành công! Dữ liệu đã an toàn.');
    } else {
      setSyncStatusMsg('Lỗi đồng bộ. Hãy kiểm tra kết nối API Supabase.');
    }
    setTimeout(() => setSyncStatusMsg(''), 4000);
  };

  const handlePullCloud = async () => {
    setSyncStatusMsg('Đang tải dữ liệu từ Supabase về trình duyệt...');
    const ok = await syncWithCloud('download');
    if (ok) {
      setSyncStatusMsg('Đã kết chuyển hoàn tất cơ sở dữ liệu từ Cloud!');
    } else {
      setSyncStatusMsg('Không tìm thấy dữ liệu hoặc cấu hình lỗi.');
    }
    setTimeout(() => setSyncStatusMsg(''), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans" id="erp-accounting-app">
      
      {/* Dynamic Alert Banner */}
      {syncStatusMsg && (
        <div className="bg-indigo-600 text-white text-xs font-bold py-2.5 px-4 text-center sticky top-0 z-50 shadow-md animate-slide-down flex items-center justify-center gap-1.5 transition-all">
          <CloudLightning className="w-4 h-4 animate-bounce" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Main ERP Navigation Header bar */}
      <header className="bg-white border-b border-slate-200/85 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-2xl shadow-md">
            <span className="font-extrabold text-lg tracking-wider">BM</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Phần mềm Kế toán Doanh nghiệp vừa & nhỏ (TT133)
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">Bản quyền hạch toán vĩnh viễn • Niên khóa {currentFiscalYear}</p>
          </div>
        </div>

        {/* Dynamic syncing indicators & tools */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1.5 text-xs font-bold text-slate-600">
            <button
              onClick={handlePullCloud}
              className="px-3 py-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              title="Tải cơ sở dữ liệu từ Supabase"
              id="pull-supabase-btn"
            >
              <Database className="w-3.5 h-3.5" />
              Kết chuyển từ Cloud
            </button>
            <button
              onClick={handlePushCloud}
              className="px-3 py-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              title="Gửi lưu dữ liệu lên Supabase"
              id="push-supabase-btn"
            >
              <CloudLightning className="w-3.5 h-3.5 text-indigo-600" />
              Lưu trữ lên Cloud
            </button>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            id="open-settings-drawer-btn"
            title="Cấu hình kết nối Supabase"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Primary Tab Bar Row - Now structured as a beautiful, clean dropdown menu & active tab info */}
      <div className="bg-slate-900 text-slate-200 px-6 py-2 shadow-md relative z-40">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Active Tab Showcase and Toggle Button */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mr-1">
              Phân hệ đang mở:
            </span>
            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700/50 shadow-inner">
              {(() => {
                const IconComp = activeTab === 'NHAP_LIEU' ? PlusCircle :
                                 activeTab === 'QUY' ? Wallet :
                                 activeTab === 'CONG_NO' ? Users :
                                 activeTab === 'KHO' ? Box :
                                 activeTab === 'THUE' ? Percent :
                                 activeTab === 'SO_SACH' ? BookOpen :
                                 activeTab === 'BCTC' ? TrendingUp : Settings;
                return <IconComp className="w-4 h-4 text-indigo-400" />;
              })()}
              <span className="text-xs font-black tracking-wide text-white font-sans">
                {activeTab === 'NHAP_LIEU' && '1. Nhập liệu Chứng từ'}
                {activeTab === 'QUY' && '2. Kế toán quỹ & Ngân hàng'}
                {activeTab === 'CONG_NO' && '3. Kế toán công nợ'}
                {activeTab === 'KHO' && '4. Kế toán kho & Vật tư'}
                {activeTab === 'THUE' && '5. Kế toán thuế VAT'}
                {activeTab === 'SO_SACH' && '6. Sổ sách & In ấn'}
                {activeTab === 'BCTC' && '7. Báo cáo tài chính'}
                {activeTab === 'HE_THONG' && '8. Hệ thống & Phân quyền'}
              </span>
            </div>
          </div>

          {/* Interactive Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-between sm:justify-start gap-2.5 transition active:scale-95 shadow-md cursor-pointer"
              id="dropdown-menu-trigger"
            >
              <Menu className="w-4 h-4" />
              <span>Chuyển Phân Hệ Hạch Toán</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showMenuDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Content Panel */}
            {showMenuDropdown && (
              <>
                {/* Backdrop overlay to close when click outside */}
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setShowMenuDropdown(false)} 
                />
                
                {/* Float Card */}
                <div 
                  className="absolute right-0 top-full mt-2 w-full sm:w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-150 z-50 p-3 flex flex-col divide-y divide-slate-100 animate-slide-down"
                  id="dropdown-menu-panel"
                >
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 pb-2 block">
                    Danh Sách Phân Hệ - Chọn để truy xuất:
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
                    {[
                      { 
                        id: 'NHAP_LIEU', 
                        num: '1', 
                        label: 'Nhập liệu Chứng từ', 
                        desc: 'Lập hóa đơn, hạch toán định khoản kép', 
                        icon: PlusCircle, 
                        bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        activeBg: 'bg-emerald-600 text-white border-emerald-600'
                      },
                      { 
                        id: 'QUY', 
                        num: '2', 
                        label: 'Kế toán quỹ & Ngân hàng', 
                        desc: 'Thu/Chi tiền mặt, báo nợ, báo có tiền gửi', 
                        icon: Wallet, 
                        bg: 'bg-amber-50 text-amber-700 border-amber-100',
                        activeBg: 'bg-amber-600 text-white border-amber-600'
                      },
                      { 
                        id: 'CONG_NO', 
                        num: '3', 
                        label: 'Kế toán công nợ', 
                        desc: 'Theo dõi, đối chiếu nợ khách hàng, đối tác', 
                        icon: Users, 
                        bg: 'bg-blue-50 text-blue-700 border-blue-100',
                        activeBg: 'bg-blue-600 text-white border-blue-600'
                      },
                      { 
                        id: 'KHO', 
                        num: '4', 
                        label: 'Kế toán kho & Vật tư', 
                        desc: 'Báo cáo tồn kho, luân chuyển vật tư kho bãi', 
                        icon: Box, 
                        bg: 'bg-rose-50 text-rose-700 border-rose-100',
                        activeBg: 'bg-rose-600 text-white border-rose-600'
                      },
                      { 
                        id: 'THUE', 
                        num: '5', 
                        label: 'Kế toán thuế VAT', 
                        desc: 'Hóa đơn suất, bảng kê VAT mua bán, tờ khai', 
                        icon: Percent, 
                        bg: 'bg-purple-50 text-purple-700 border-purple-100',
                        activeBg: 'bg-purple-600 text-white border-purple-600'
                      },
                      { 
                        id: 'SO_SACH', 
                        num: '6', 
                        label: 'Sổ sách & In ấn', 
                        desc: 'Nhật ký chung, sổ cái TK, sổ quỹ chi tiết', 
                        icon: BookOpen, 
                        bg: 'bg-teal-50 text-teal-700 border-teal-100',
                        activeBg: 'bg-teal-600 text-white border-teal-600'
                      },
                      { 
                        id: 'BCTC', 
                        num: '7', 
                        label: 'Báo cáo tài chính', 
                        desc: 'Cân đối phát sinh, Bảng cân đối kế toán B01a', 
                        icon: TrendingUp, 
                        bg: 'bg-cyan-50 text-cyan-700 border-cyan-100',
                        activeBg: 'bg-cyan-600 text-white border-cyan-600'
                      },
                      { 
                        id: 'HE_THONG', 
                        num: '8', 
                        label: 'Hệ thống & Phân quyền', 
                        desc: 'Khóa niên độ, phân quyền, lưu trữ Supabase API', 
                        icon: Settings, 
                        bg: 'bg-slate-100 text-slate-700 border-slate-200',
                        activeBg: 'bg-slate-800 text-white border-slate-800'
                      }
                    ].map((m) => {
                      const IconComponent = m.icon;
                      const isActive = activeTab === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setActiveTab(m.id as any);
                            setShowMenuDropdown(false);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition duration-150 flex gap-2.5 items-start cursor-pointer hover:shadow-xs group h-[68px] ${
                            isActive 
                              ? m.activeBg
                              : 'bg-white border-slate-150 hover:bg-slate-50/70 hover:border-slate-300'
                          }`}
                        >
                          <span className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'bg-white/20 border-white/10 text-white' : m.bg
                          }`}>
                            <IconComponent className="w-3.5 h-3.5" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="text-[11.5px] font-extrabold tracking-tight truncate">
                              {m.num}. {m.label}
                            </p>
                            <p className={`text-[9.5px] leading-tight font-medium mt-0.5 line-clamp-2 ${isActive ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-500'}`}>
                              {m.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Main Workspace content container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full pb-16 animate-fade-in" id="primary-workspace">
        
        {activeTab === 'NHAP_LIEU' && <NhapLieu />}

        {activeTab === 'QUY' && <QuyTienMat />}

        {activeTab === 'CONG_NO' && <CongNo />}

        {activeTab === 'KHO' && <KhoVatTu />}

        {activeTab === 'THUE' && <KeToanThue />}

        {activeTab === 'SO_SACH' && <InAnSoSach />}

        {activeTab === 'BCTC' && <BaoCaoTaiChinh />}

        {activeTab === 'HE_THONG' && <HeThong />}

      </main>

      {/* CLOUD CONNECTIONS AND OVER onboarding CONFIG DRAWERS */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 p-0 transition-all">
          <div className="bg-white shadow-2xl max-w-lg w-full h-full border-l border-slate-200 overflow-y-auto flex flex-col justify-between" id="settings-supabase-drawer">
            <div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <CloudLightning className="w-5 h-5 text-indigo-600" />
                    Đồng bộ hóa dữ liệu với Supabase
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Cấu hình API kết nối trực tiếp đến Cloud của bạn</p>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 rounded-xl transition cursor-pointer"
                  id="close-settings-drawer-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Save connection creds */}
                <form onSubmit={handleSaveConfig} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Supabase Project URL</label>
                    <input
                      type="url"
                      placeholder="https://xyzabcdefg.supabase.co"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Supabase Anon Key</label>
                    <input
                      type="text"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey..."
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    id="save-supabase-config-btn"
                  >
                    Lưu cấu hình API cục bộ
                  </button>
                </form>

                {/* SQL Installer section */}
                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Kích hoạt bảng dữ liệu Supabase Sql</span>
                    <button
                      onClick={handleCopySql}
                      className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? 'Đã sao chép' : 'Sao chép DDL'}
                    </button>
                  </div>
                  
                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal">Để Supabase hoạt động lưu giữ dữ liệu an toàn, xin nhấp vào <strong>"SQL Editor"</strong> trên trang kiểm soát Supabase của bạn, dán đoạn mã SQL dưới dây và nhấn <strong>Run</strong> để tự động khởi tạo!</p>
                  
                  <pre className="p-3 bg-slate-900 text-amber-400 font-mono text-[9px] rounded-lg overflow-x-auto max-h-[140px] leading-relaxed">
                    {ddlSetupSql}
                  </pre>
                </div>

              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 text-center">
              <span className="text-[10px] text-slate-400 font-serif font-bold italic mt-1 block">Phần mềm Kế toán Doanh nghiệp TT133 • Powered by Google DeepMind</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
