/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Account,
  Partner,
  InventoryItem,
  AccountingTransaction,
  BudgetAllocation,
  DEFAULT_ACCOUNTS,
  DEFAULT_PARTNERS,
  DEFAULT_INVENTORIES,
  DEFAULT_TRANSACTIONS,
  DEFAULT_ALLOCATIONS
} from '../types';
import { getSupabaseConfig, uploadAccounts, uploadPartners, uploadItems, uploadTransactions, uploadAllocations, fetchAllFromSupabase } from './supabaseService';

interface AccountingState {
  accounts: Account[];
  partners: Partner[];
  items: InventoryItem[];
  transactions: AccountingTransaction[];
  allocations: BudgetAllocation[];
  activeModule: string;
  setActiveModule: (module: string) => void;
  
  fiscalYears: string[];
  currentFiscalYear: string;
  closedYears: string[];
  setCurrentFiscalYear: (year: string) => void;
  closeYear: (year: string) => void;
  openNewYear: (year: string) => void;
  backupDatabase: () => void;
  restoreDatabase: (data: any) => boolean;

  addTransaction: (tx: AccountingTransaction) => void;
  deleteTransaction: (id: string) => void;
  addPartner: (partner: Partner) => void;
  addItem: (item: InventoryItem) => void;
  addAllocation: (allocation: BudgetAllocation) => void;
  updateAllocation: (allocation: BudgetAllocation) => void;
  resetToDefault: () => void;
  
  cloudSyncStatus: {
    loading: boolean;
    error: string | null;
    success: string | null;
  };
  syncWithCloud: (direction: 'upload' | 'download') => Promise<boolean>;
  importState: (data: any) => void;
}

const AccountingContext = createContext<AccountingState | undefined>(undefined);

export function useAccounting() {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
}

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('smartaccount_accounts');
    return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
  });

  const [partners, setPartners] = useState<Partner[]>(() => {
    const saved = localStorage.getItem('smartaccount_partners');
    return saved ? JSON.parse(saved) : DEFAULT_PARTNERS;
  });

  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('smartaccount_items');
    return saved ? JSON.parse(saved) : DEFAULT_INVENTORIES;
  });

  const [allTransactions, setAllTransactions] = useState<AccountingTransaction[]>(() => {
    const saved = localStorage.getItem('smartaccount_transactions');
    return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
  });

  const [fiscalYears, setFiscalYears] = useState<string[]>(() => {
    const saved = localStorage.getItem('smartaccount_fiscal_years');
    return saved ? JSON.parse(saved) : ['2025', '2026', '2027'];
  });

  const [currentFiscalYear, setCurrentFiscalYear] = useState<string>(() => {
    return localStorage.getItem('smartaccount_current_fiscal_year') || '2026';
  });

  const [closedYears, setClosedYears] = useState<string[]>(() => {
    const saved = localStorage.getItem('smartaccount_closed_years');
    return saved ? JSON.parse(saved) : [];
  });

  const [allocations, setAllocations] = useState<BudgetAllocation[]>(() => {
    const saved = localStorage.getItem('smartaccount_allocations');
    return saved ? JSON.parse(saved) : DEFAULT_ALLOCATIONS;
  });

  const [activeModule, setActiveModule] = useState<string>('MENU');

  const [cloudSyncStatus, setCloudSyncStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: string | null;
  }>({ loading: false, error: null, success: null });

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem('smartaccount_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('smartaccount_partners', JSON.stringify(partners));
  }, [partners]);

  useEffect(() => {
    localStorage.setItem('smartaccount_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('smartaccount_transactions', JSON.stringify(allTransactions));
  }, [allTransactions]);

  useEffect(() => {
    localStorage.setItem('smartaccount_fiscal_years', JSON.stringify(fiscalYears));
  }, [fiscalYears]);

  useEffect(() => {
    localStorage.setItem('smartaccount_current_fiscal_year', currentFiscalYear);
  }, [currentFiscalYear]);

  useEffect(() => {
    localStorage.setItem('smartaccount_closed_years', JSON.stringify(closedYears));
  }, [closedYears]);

  useEffect(() => {
    localStorage.setItem('smartaccount_allocations', JSON.stringify(allocations));
  }, [allocations]);

  // Dynamically compute transactions of the active fiscal year
  const transactions = allTransactions.filter(tx => {
    const date = tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT;
    return date ? date.startsWith(currentFiscalYear) : true;
  });

  const addTransaction = (tx: AccountingTransaction) => {
    const txYear = (tx.type === 'HOADON' ? tx.ngayHD : tx.ngayCT)?.substring(0, 4);
    if (txYear && closedYears.includes(txYear)) {
      alert(`Không thể hạch toán! Năm tài chính ${txYear} đã bị KHÓA SỔ kế toán.`);
      return;
    }
    setAllTransactions(prev => [tx, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    const foundTx = allTransactions.find(tx => tx.id === id);
    if (foundTx) {
      const txYear = (foundTx.type === 'HOADON' ? foundTx.ngayHD : foundTx.ngayCT)?.substring(0, 4);
      if (txYear && closedYears.includes(txYear)) {
        alert(`Không thể xóa chứng từ vì năm tài chính ${txYear} đã bị KHÓA SỔ hạch toán.`);
        return;
      }
    }
    setAllTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const addPartner = (partner: Partner) => {
    setPartners(prev => {
      if (prev.some(p => p.code === partner.code)) return prev;
      return [...prev, partner];
    });
  };

  const addItem = (item: InventoryItem) => {
    setItems(prev => {
      if (prev.some(i => i.code === item.code)) return prev;
      return [...prev, item];
    });
  };

  const addAllocation = (allocation: BudgetAllocation) => {
    setAllocations(prev => [...prev, allocation]);
  };

  const updateAllocation = (updated: BudgetAllocation) => {
    setAllocations(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const resetToDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu kế toán về mặc định ban đầu không?')) {
      setAccounts(DEFAULT_ACCOUNTS);
      setPartners(DEFAULT_PARTNERS);
      setItems(DEFAULT_INVENTORIES);
      setAllTransactions(DEFAULT_TRANSACTIONS);
      setAllocations(DEFAULT_ALLOCATIONS);
      setFiscalYears(['2025', '2026', '2027']);
      setCurrentFiscalYear('2026');
      setClosedYears([]);
      alert('Đã đặt lại dữ liệu thành công!');
    }
  };

  const closeYear = (year: string) => {
    if (closedYears.includes(year)) {
      setClosedYears(prev => prev.filter(y => y !== year));
      alert(`Đã mở khóa sổ thành công cho niên độ kế toán ${year}!`);
    } else {
      setClosedYears(prev => [...prev, year]);
      alert(`Đã khóa sổ kế toán thành công cho niên độ khóa ${year}. Các chứng từ hạch toán của niên độ này đã được đưa vào chế độ chỉ đọc để đảm bảo tính pháp lý.`);
    }
  };

  const openNewYear = (year: string) => {
    if (!year || isNaN(Number(year))) {
      alert('Năm hạch toán không hợp lệ!');
      return;
    }
    if (fiscalYears.includes(year)) {
      alert(`Năm tài khóa ${year} đã tồn tại trong hệ thống.`);
      return;
    }
    setFiscalYears(prev => [...prev, year].sort());
    setCurrentFiscalYear(year);
    alert(`Đã tạo thành công năm nhập liệu hạch toán ${year} và tự động chuyển đổi sang niên khóa này!`);
  };

  const backupDatabase = () => {
    const backupData = {
      accounts,
      partners,
      items,
      transactions: allTransactions,
      allocations,
      fiscalYears,
      currentFiscalYear,
      closedYears,
      version: '1.0.1_TT133',
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartaccount_backup_all_${currentFiscalYear}_${new Date().toISOString().substring(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const restoreDatabase = (data: any): boolean => {
    try {
      if (!data || typeof data !== 'object') {
        alert('File dữ liệu không đúng hoặc bị lỗi định dạng!');
        return false;
      }
      if (data.accounts) setAccounts(data.accounts);
      if (data.partners) setPartners(data.partners);
      if (data.items) setItems(data.items);
      if (data.transactions) setAllTransactions(data.transactions);
      if (data.allocations) setAllocations(data.allocations);
      if (data.fiscalYears) setFiscalYears(data.fiscalYears);
      if (data.currentFiscalYear) setCurrentFiscalYear(data.currentFiscalYear);
      if (data.closedYears) setClosedYears(data.closedYears);
      alert('Phục hồi dữ liệu hệ thống từ tệp tin sao lưu thành công!');
      return true;
    } catch (e) {
      console.error(e);
      alert('Phục hồi thất bại: ' + String(e));
      return false;
    }
  };

  const importState = (data: any) => {
    if (data.accounts) setAccounts(data.accounts);
    if (data.partners) setPartners(data.partners);
    if (data.items) setItems(data.items);
    if (data.transactions) setAllTransactions(data.transactions);
    if (data.allocations) setAllocations(data.allocations);
  };

  // Sync state between LocalStorage and Supabase backend
  const syncWithCloud = async (direction: 'upload' | 'download'): Promise<boolean> => {
    const config = getSupabaseConfig();
    if (!config || !config.url || !config.anonKey) {
      setCloudSyncStatus({
        loading: false,
        error: 'Chưa cấu hình tài khoản kết nối Supabase Cloud. Vui lòng vào phân hệ Cấu hình để thiết lập.',
        success: null
      });
      return false;
    }

    setCloudSyncStatus({ loading: true, error: null, success: null });
    try {
      if (direction === 'upload') {
        // Core updates to Supabase
        await uploadAccounts(config, accounts);
        await uploadPartners(config, partners);
        await uploadItems(config, items);
        await uploadTransactions(config, allTransactions);
        await uploadAllocations(config, allocations);
        
        setCloudSyncStatus({
          loading: false,
          error: null,
          success: `Đồng bộ lên đám mây Supabase thành công lúc ${new Date().toLocaleTimeString()}! Đã tải lên ${accounts.length} TK, ${partners.length} đối tác, ${items.length} vật tư, ${allTransactions.length} chứng từ.`
        });
      } else {
        // Download updates from Supabase
        const cloudData = await fetchAllFromSupabase(config);
        
        setAccounts(cloudData.accounts);
        setPartners(cloudData.partners);
        setItems(cloudData.items);
        setAllTransactions(cloudData.transactions);
        setAllocations(cloudData.allocations);

        setCloudSyncStatus({
          loading: false,
          error: null,
          success: `Đồng bộ từ đám mây Supabase về máy thành công lúc ${new Date().toLocaleTimeString()}! Đã tải xuống ${cloudData.accounts.length} TK, ${cloudData.partners.length} đối tác, ${cloudData.items.length} vật tư và ${cloudData.transactions.length} chứng từ hạch toán.`
        });
      }
      return true;
    } catch (err: any) {
      console.error(err);
      setCloudSyncStatus({
        loading: false,
        error: `Đồng bộ thất bại: ${err?.message || 'Có lỗi kết nối diễn ra'}`,
        success: null
      });
      return false;
    }
  };

  return (
    <AccountingContext.Provider value={{
      accounts,
      partners,
      items,
      transactions,
      allocations,
      activeModule,
      setActiveModule,
      fiscalYears,
      currentFiscalYear,
      closedYears,
      setCurrentFiscalYear,
      closeYear,
      openNewYear,
      backupDatabase,
      restoreDatabase,
      addTransaction,
      deleteTransaction,
      addPartner,
      addItem,
      addAllocation,
      updateAllocation,
      resetToDefault,
      cloudSyncStatus,
      syncWithCloud,
      importState
    }}>
      {children}
    </AccountingContext.Provider>
  );
};
