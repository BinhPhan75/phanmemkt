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
  syncWithCloud: (direction: 'upload' | 'download') => Promise<void>;
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

  const [transactions, setTransactions] = useState<AccountingTransaction[]>(() => {
    const saved = localStorage.getItem('smartaccount_transactions');
    return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
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
    localStorage.setItem('smartaccount_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('smartaccount_allocations', JSON.stringify(allocations));
  }, [allocations]);

  const addTransaction = (tx: AccountingTransaction) => {
    setTransactions(prev => [tx, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
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
      setTransactions(DEFAULT_TRANSACTIONS);
      setAllocations(DEFAULT_ALLOCATIONS);
      alert('Đã đặt lại dữ liệu thành công!');
    }
  };

  const importState = (data: any) => {
    if (data.accounts) setAccounts(data.accounts);
    if (data.partners) setPartners(data.partners);
    if (data.items) setItems(data.items);
    if (data.transactions) setTransactions(data.transactions);
    if (data.allocations) setAllocations(data.allocations);
  };

  // Sync state between LocalStorage and Supabase backend
  const syncWithCloud = async (direction: 'upload' | 'download') => {
    const config = getSupabaseConfig();
    if (!config || !config.url || !config.anonKey) {
      setCloudSyncStatus({
        loading: false,
        error: 'Chưa cấu hình tài khoản kết nối Supabase Cloud. Vui lòng vào phân hệ Cấu hình để thiết lập.',
        success: null
      });
      return;
    }

    setCloudSyncStatus({ loading: true, error: null, success: null });
    try {
      if (direction === 'upload') {
        // Core updates to Supabase
        await uploadAccounts(config, accounts);
        await uploadPartners(config, partners);
        await uploadItems(config, items);
        await uploadTransactions(config, transactions);
        await uploadAllocations(config, allocations);
        
        setCloudSyncStatus({
          loading: false,
          error: null,
          success: `Đồng bộ lên đám mây Supabase thành công lúc ${new Date().toLocaleTimeString()}! Đã tải lên ${accounts.length} TK, ${partners.length} đối tác, ${items.length} vật tư, ${transactions.length} chứng từ.`
        });
      } else {
        // Download updates from Supabase
        const cloudData = await fetchAllFromSupabase(config);
        
        setAccounts(cloudData.accounts);
        setPartners(cloudData.partners);
        setItems(cloudData.items);
        setTransactions(cloudData.transactions);
        setAllocations(cloudData.allocations);

        setCloudSyncStatus({
          loading: false,
          error: null,
          success: `Đồng bộ từ đám mây Supabase về máy thành công lúc ${new Date().toLocaleTimeString()}! Đã tải xuống ${cloudData.accounts.length} TK, ${cloudData.partners.length} đối tác, ${cloudData.items.length} vật tư và ${cloudData.transactions.length} chứng từ hạch toán.`
        });
      }
    } catch (err: any) {
      console.error(err);
      setCloudSyncStatus({
        loading: false,
        error: `Đồng bộ thất bại: ${err?.message || 'Có lỗi kết nối diễn ra'}`,
        success: null
      });
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
