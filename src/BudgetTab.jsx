import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Home, Zap, Car, ShoppingCart, Radio, CreditCard, Smile, PiggyBank, MoreHorizontal, TrendingUp, ChevronRight, ChevronDown, Download, Info, Wallet, Target, DollarSign, Layers, AlertCircle, CheckCircle, X } from 'lucide-react';
import {
  BUDGET_CATEGORIES,
  calculateMonthlyBudget,
  calculateMonthlyActuals,
  calculateVariance,
  calculateSavingsOverview,
  calculateAnnualBudgetProjection,
} from './logic/BudgetCalculator';

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

const fmt = (n, dp = 2) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const categoryIcons = {
  housing: <Home size={16} />,
  utilities: <Zap size={16} />,
  transport: <Car size={16} />,
  food: <ShoppingCart size={16} />,
  subscriptions: <Radio size={16} />,
  debt: <CreditCard size={16} />,
  discretionary: <Smile size={16} />,
  savings: <PiggyBank size={16} />,
  other: <MoreHorizontal size={16} />,
};

const categoryColors = {
  housing: '#6366f1',
  utilities: '#f59e0b',
  transport: '#10b981',
  food: '#ef4444',
  subscriptions: '#8b5cf6',
  debt: '#f43f5e',
  discretionary: '#06b6d4',
  savings: '#22c55e',
  other: '#6b7280',
};

const HelperInfo = ({ id, text, activeId, setActiveId, setActiveText }) => {
  const isOpen = activeId === id;
  return (
    <div style={{ display: 'inline-block', marginLeft: '0.4rem', verticalAlign: 'middle', position: 'relative' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setActiveId(isOpen ? null : id); if (!isOpen) setActiveText(text); }}
        className="btn-icon"
        style={{ color: isOpen ? 'var(--primary)' : 'var(--text-muted)', opacity: isOpen ? 1 : 0.6, background: isOpen ? 'var(--primary-light)' : 'transparent', padding: '4px', borderRadius: '6px', transition: 'all 0.2s' }}
        title="More Information"
      >
        <Info size={18} />
      </button>
    </div>
  );
};

const DonutChart = ({ data }) => {
  const total = data.reduce((s, i) => s + i.value, 0);
  if (total === 0) return <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.4 }}>No data</div>;
  const getCoords = (p) => [Math.cos(2 * Math.PI * p), Math.sin(2 * Math.PI * p)];
  return (
    <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', maxWidth: '200px', margin: '0 auto', display: 'block' }}>
      {data.map((slice, i) => {
        const sliceP = slice.value / total;
        const startP = data.slice(0, i).reduce((s, item) => s + (item.value / total), 0);
        const endP = startP + sliceP;
        const [sx, sy] = getCoords(startP);
        const [ex, ey] = getCoords(endP);
        const large = sliceP > 0.5 ? 1 : 0;
        return <path key={i} d={`M ${sx} ${sy} A 1 1 0 ${large} 1 ${ex} ${ey} L 0 0`} fill={slice.color} stroke="var(--bg-dark)" strokeWidth="0.01" />;
      })}
      <circle cx="0" cy="0" r="0.6" fill="var(--bg-dark)" />
    </svg>
  );
};

export default function BudgetTab({
  budgetConfig,
  onUpdateBudgetConfig,
  budgetActuals,
  onUpdateBudgetActuals,
  netMonthlyPay,
  activeHelperId,
  setActiveHelperId,
  setActiveText,
}) {
  const [subTab, setSubTab] = useState('overview'); // overview, budget, savings, tracking
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    let idx = now.getMonth() - 3;
    return idx < 0 ? idx + 12 : idx;
  });
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [spendModalData, setSpendModalData] = useState(null);

  const items = budgetConfig?.budgetedItems || [];
  const accounts = budgetConfig?.savingsAccounts || [];
  const actuals = budgetActuals || Array(12).fill(null).map(() => ({ spends: [] }));

  // --- Helpers ---
  const updateBudgetConfig = (updates) => {
    onUpdateBudgetConfig({ ...(budgetConfig || {}), ...updates });
  };

  const updateActualsForMonth = (monthIdx, newSpends) => {
    const updated = [...actuals];
    updated[monthIdx] = { ...updated[monthIdx], spends: newSpends };
    onUpdateBudgetActuals(updated);
  };

  // --- Calculations ---
  const budgeted = useMemo(() => calculateMonthlyBudget(budgetConfig), [budgetConfig]);
  const variance = useMemo(() => calculateVariance(budgetConfig, actuals, selectedMonth), [budgetConfig, actuals, selectedMonth]);
  const savingsOverview = useMemo(() => calculateSavingsOverview(accounts), [accounts]);
  const annualProjection = useMemo(() => calculateAnnualBudgetProjection(budgetConfig, actuals), [budgetConfig, actuals]);
  const monthlyDisposable = netMonthlyPay - budgeted.totalMonthly - variance.totalActual;
  const totalAnnualOutgoings = (budgeted.totalMonthly * 12) + (variance.totalActual > 0 ? (variance.totalActual / (actuals.filter(m => m?.spends?.length > 0).length || 1)) * 12 : 0);

  // --- Handlers ---
  const openAddItem = () => {
    setModalData({ id: null, name: '', category: 'other', amount: '', frequency: 'monthly' });
    setShowItemModal(true);
  };

  const openEditItem = (item) => {
    setModalData({ ...item });
    setShowItemModal(true);
  };

  const saveItem = () => {
    const idToUse = modalData.id || Date.now().toString();
    const newItem = { id: idToUse, name: modalData.name || 'Unnamed', category: modalData.category, amount: Number(modalData.amount) || 0, frequency: modalData.frequency };
    if (modalData.id) {
      updateBudgetConfig({ budgetedItems: items.map(i => i.id === idToUse ? newItem : i) });
    } else {
      updateBudgetConfig({ budgetedItems: [...items, newItem] });
    }
    setShowItemModal(false);
  };

  const removeItem = (id) => {
    updateBudgetConfig({ budgetedItems: items.filter(i => i.id !== id) });
    setShowItemModal(false);
  };

  const openAddAccount = () => {
    setModalData({ id: null, name: '', balance: '', monthlyContribution: '', goal: '' });
    setShowAccountModal(true);
  };

  const openEditAccount = (acct) => {
    setModalData({ ...acct });
    setShowAccountModal(true);
  };

  const saveAccount = () => {
    const idToUse = modalData.id || Date.now().toString();
    const newAccount = { id: idToUse, name: modalData.name || 'Account', balance: Number(modalData.balance) || 0, monthlyContribution: Number(modalData.monthlyContribution) || 0, goal: Number(modalData.goal) || 0 };
    if (modalData.id) {
      updateBudgetConfig({ savingsAccounts: accounts.map(a => a.id === idToUse ? newAccount : a) });
    } else {
      updateBudgetConfig({ savingsAccounts: [...accounts, newAccount] });
    }
    setShowAccountModal(false);
  };

  const removeAccount = (id) => {
    updateBudgetConfig({ savingsAccounts: accounts.filter(a => a.id !== id) });
    setShowAccountModal(false);
  };

  const openAddSpend = () => {
    setSpendModalData({ id: null, budgetItemId: items[0]?.id || '', amount: '' });
    setShowSpendModal(true);
  };

  const openEditSpend = (spend) => {
    setSpendModalData({ ...spend });
    setShowSpendModal(true);
  };

  const saveSpend = () => {
    const idToUse = spendModalData.id || Date.now().toString();
    const newSpend = { id: idToUse, budgetItemId: spendModalData.budgetItemId, amount: Number(spendModalData.amount) || 0 };
    const currentSpends = actuals[selectedMonth]?.spends || [];
    let updatedSpends;
    if (spendModalData.id) {
      updatedSpends = currentSpends.map(s => s.id === idToUse ? newSpend : s);
    } else {
      updatedSpends = [...currentSpends, newSpend];
    }
    updateActualsForMonth(selectedMonth, updatedSpends);
    setShowSpendModal(false);
  };

  const removeSpend = (id) => {
    const currentSpends = actuals[selectedMonth]?.spends || [];
    updateActualsForMonth(selectedMonth, currentSpends.filter(s => s.id !== id));
    setShowSpendModal(false);
  };

  // --- Sub-tabs ---
  const subTabs = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={16} /> },
    { id: 'budget', label: 'Budget', icon: <Layers size={16} /> },
    { id: 'savings', label: 'Savings', icon: <PiggyBank size={16} /> },
  ];

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Summary cards */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={20} color="var(--primary)" /> Budget & Savings
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.25rem' }}>Monthly Net Pay</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--success)' }}>£{fmt(netMonthlyPay)}</div>
          </div>
          <div style={{ background: 'rgba(244,63,94,0.1)', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid rgba(244,63,94,0.2)' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.25rem' }}>Monthly Outgoings</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--error)' }}>£{fmt(budgeted.totalMonthly + variance.totalActual)}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Budgeted: £{fmt(budgeted.totalMonthly)}{budgeted.savingsContributions > 0 ? ` (inc £${fmt(budgeted.savingsContributions)} savings)` : ''}</div>
          </div>
          <div style={{ background: 'rgba(99,102,241,0.1)', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.25rem' }}>Disposable Income</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: monthlyDisposable >= 0 ? 'var(--success)' : 'var(--error)' }}>£{fmt(monthlyDisposable)}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Net after all outgoings</div>
          </div>
          <div style={{ background: 'rgba(251,191,36,0.1)', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid rgba(251,191,36,0.2)' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.25rem' }}>Savings Total</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fbbf24' }}>£{fmt(savingsOverview.totalBalance)}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>+£{fmt(savingsOverview.totalMonthly)}/mo</div>
          </div>
        </div>
      </div>

      {/* Sub-tab nav */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.75rem', padding: '0.25rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ flex: 1, padding: '0.6rem 0.25rem', background: subTab === t.id ? 'var(--primary)' : 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: subTab === t.id ? 'white' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: subTab === t.id ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', transition: 'all 0.15s ease' }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW TAB === */}
      {subTab === 'overview' && (
        <div>
          {/* Disposable income card */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(16,185,129,0.05) 100%)' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--primary)" /> Your Financial Picture
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Monthly Income</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>£{fmt(netMonthlyPay)}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>Take-home pay</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Monthly Outgoings</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--error)' }}>£{fmt(budgeted.totalMonthly + variance.totalActual)}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>Budgeted: £{fmt(budgeted.totalMonthly)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Disposable</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: monthlyDisposable >= 0 ? 'var(--success)' : 'var(--error)' }}>£{fmt(monthlyDisposable)}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>Per month after all costs</div>
              </div>
            </div>
          </div>

          {/* Annual projection */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={16} color="var(--primary)" /> Annual Projection
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                <span>Projected Outgoings</span>
                <span>£{fmt(annualProjection.annualBudgeted)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', opacity: 0.7 }}>
                <span>Income (Annual Net)</span>
                <span>£{fmt(netMonthlyPay * 12)}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
                <span>Annual Surplus</span>
                <span style={{ color: (netMonthlyPay * 12 - annualProjection.annualBudgeted) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  £{fmt(netMonthlyPay * 12 - annualProjection.annualBudgeted)}
                </span>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="glass-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} color="var(--primary)" /> Budget Breakdown
              </h3>
              {Object.keys(budgeted.byCategory).length === 0 && (
                <p style={{ fontSize: '0.8rem', opacity: 0.4, textAlign: 'center', padding: '1rem' }}>
                  No budget items yet. Add your outgoings in the Budget tab.
                </p>
              )}
              {Object.entries(budgeted.byCategory).map(([cat, amt]) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '0.4rem', padding: '0.25rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: categoryColors[cat] || '#6b7280' }}>{categoryIcons[cat] || <MoreHorizontal size={16} />}</span>
                    <span style={{ opacity: 0.7 }}>{BUDGET_CATEGORIES.find(c => c.value === cat)?.label || cat}</span>
                  </div>
                  <span style={{ fontWeight: 600 }}>£{fmt(amt)}</span>
                </div>
              ))}
              {Object.keys(budgeted.byCategory).length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span>Total</span>
                  <span>£{fmt(budgeted.totalMonthly)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === BUDGET TAB === */}
      {subTab === 'budget' && (
        <div>
          {/* Budgeted items */}
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} color="var(--primary)" /> Budgeted Outgoings
              </h3>
              <button className="btn-add" onClick={openAddItem}><Plus size={16} /></button>
            </div>
            {items.length === 0 && (
              <p style={{ opacity: 0.4, textAlign: 'center', padding: '1.5rem 0' }}>No budget items. Tap + to add your outgoings.</p>
            )}
            {items.map(item => (
              <div key={item.id} className="overtime-line glass-card clickable" style={{ borderLeft: `4px solid ${categoryColors[item.category] || '#6b7280'}`, marginBottom: '0.75rem', padding: '0.75rem', cursor: 'pointer' }}
                onClick={() => openEditItem(item)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: categoryColors[item.category] || '#6b7280' }}>{categoryIcons[item.category] || <MoreHorizontal size={16} />}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{BUDGET_CATEGORIES.find(c => c.value === item.category)?.label || item.category} • {item.frequency === 'annual' ? 'Annual' : 'Monthly'}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--error)', fontSize: '1rem' }}>-£{fmt(item.amount)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Month selector + Actuals tracking */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} color="var(--primary)" /> Actual Spends — {MONTHS[selectedMonth]}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select className="input-field" style={{ width: 'auto', padding: '0.3rem', fontSize: '0.8rem' }} value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <button className="btn-add" onClick={openAddSpend} disabled={items.length === 0} title={items.length === 0 ? 'Add budget items first' : 'Log spend'}><Plus size={16} /></button>
              </div>
            </div>

            {/* Variance summary */}
            {(variance.totalBudgeted > 0 || variance.totalActual > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.1)', borderRadius: '0.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Budgeted</div>
                  <div style={{ fontWeight: 700 }}>£{fmt(variance.totalBudgeted)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Actual</div>
                  <div style={{ fontWeight: 700 }}>£{fmt(variance.totalActual)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Variance</div>
                  <div style={{ fontWeight: 700, color: variance.isOverbudget ? 'var(--error)' : 'var(--success)' }}>
                    {variance.isOverbudget ? '+' : ''}£{fmt(variance.totalVariance)}
                  </div>
                </div>
              </div>
            )}

            {/* Spends list */}
            {(actuals[selectedMonth]?.spends || []).length === 0 && (
              <p style={{ opacity: 0.4, textAlign: 'center', padding: '1rem 0', fontSize: '0.85rem' }}>No spends logged for {MONTHS[selectedMonth]}. Tap + to add one.</p>
            )}
            {(actuals[selectedMonth]?.spends || []).map(spend => {
              const budgetItem = items.find(i => i.id === spend.budgetItemId);
              const budgetedAmount = budgetItem ? (budgetItem.frequency === 'annual' ? (budgetItem.amount || 0) / 12 : (budgetItem.amount || 0)) : 0;
              const actualAmt = Number(spend.amount) || 0;
              const diff = actualAmt - budgetedAmount;
              return (
                <div key={spend.id} className="overtime-line glass-card clickable" style={{ borderLeft: `4px solid ${diff > 0 ? 'var(--error)' : 'var(--success)'}`, marginBottom: '0.6rem', padding: '0.65rem', cursor: 'pointer' }}
                  onClick={() => openEditSpend(spend)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {budgetItem && <span style={{ color: categoryColors[budgetItem.category] || '#6b7280' }}>{categoryIcons[budgetItem.category] || <MoreHorizontal size={14} />}</span>}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{budgetItem?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>Budget: £{fmt(budgetedAmount)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>£{fmt(actualAmt)}</div>
                      {diff !== 0 && (
                        <div style={{ fontSize: '0.65rem', color: diff > 0 ? 'var(--error)' : 'var(--success)', fontWeight: 600 }}>
                          {diff > 0 ? '+' : ''}£{fmt(diff)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === SAVINGS TAB === */}
      {subTab === 'savings' && (
        <div>
          {/* Savings summary */}
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PiggyBank size={18} color="var(--primary)" /> Savings Accounts
              </h3>
              <button className="btn-add" onClick={openAddAccount}><Plus size={16} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '0.6rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase' }}>Total Saved</div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--success)' }}>£{fmt(savingsOverview.totalBalance)}</div>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.1)', padding: '0.75rem', borderRadius: '0.6rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase' }}>Monthly Saving</div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>£{fmt(savingsOverview.totalMonthly)}</div>
              </div>
              {savingsOverview.totalGoals > 0 && (
                <div style={{ background: 'rgba(251,191,36,0.1)', padding: '0.75rem', borderRadius: '0.6rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase' }}>Goal Progress</div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fbbf24' }}>{savingsOverview.totalProgress}%</div>
                </div>
              )}
            </div>

            {accounts.length === 0 && (
              <p style={{ opacity: 0.4, textAlign: 'center', padding: '1rem 0' }}>No savings accounts. Tap + to add one.</p>
            )}
            {accounts.map(acct => {
              const progress = acct.goal > 0 ? Math.min(100, Math.round((acct.balance / acct.goal) * 100)) : 0;
              return (
                <div key={acct.id} className="glass-card clickable" style={{ marginBottom: '0.75rem', padding: '1rem', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
                  onClick={() => openEditAccount(acct)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{acct.name}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>+£{fmt(acct.monthlyContribution)}/month</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--success)' }}>£{fmt(acct.balance)}</div>
                      {acct.goal > 0 && <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Goal: £{fmt(acct.goal)}</div>}
                    </div>
                  </div>
                  {acct.goal > 0 && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', height: '6px', marginTop: '0.5rem', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, background: 'var(--primary)', height: '100%', borderRadius: '1rem', transition: 'width 0.3s' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Projection */}
          {savingsOverview.totalMonthly > 0 && (
            <div className="glass-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} color="var(--primary)" /> 12-Month Savings Projection
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ opacity: 0.7 }}>Current Balance</span>
                <span style={{ fontWeight: 600 }}>£{fmt(savingsOverview.totalBalance)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ opacity: 0.7 }}>Annual Contributions</span>
                <span style={{ fontWeight: 600 }}>£{fmt(savingsOverview.totalMonthly * 12)}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
                <span>Projected (12 months)</span>
                <span style={{ color: 'var(--success)' }}>£{fmt(savingsOverview.totalBalance + savingsOverview.totalMonthly * 12)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === ITEM MODAL === */}
      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{modalData.id ? 'Edit Outgoing' : 'Add Outgoing'}</h2>
              <button className="btn-icon" onClick={() => setShowItemModal(false)}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="stat-label">Name</label>
                <input className="input-field" value={modalData.name} onChange={e => setModalData({ ...modalData, name: e.target.value })} placeholder="e.g. Mortgage" />
              </div>
              <div>
                <label className="stat-label">Category</label>
                <select className="input-field" value={modalData.category} onChange={e => setModalData({ ...modalData, category: e.target.value })}>
                  {BUDGET_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="stat-label">Amount (£)</label>
                  <input type="number" className="input-field" value={modalData.amount} onChange={e => setModalData({ ...modalData, amount: e.target.value })} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="stat-label">Frequency</label>
                  <select className="input-field" value={modalData.frequency} onChange={e => setModalData({ ...modalData, frequency: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              {modalData.id && (
                <button className="btn-secondary" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => removeItem(modalData.id)}>
                  Delete
                </button>
              )}
              <button className="btn-primary" style={{ flex: 1 }} onClick={saveItem}>
                {modalData.id ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === ACCOUNT MODAL === */}
      {showAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{modalData.id ? 'Edit Account' : 'Add Savings Account'}</h2>
              <button className="btn-icon" onClick={() => setShowAccountModal(false)}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="stat-label">Account Name</label>
                <input className="input-field" value={modalData.name} onChange={e => setModalData({ ...modalData, name: e.target.value })} placeholder="e.g. Help to Buy ISA" />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="stat-label">Current Balance</label>
                  <input type="number" className="input-field" value={modalData.balance} onChange={e => setModalData({ ...modalData, balance: e.target.value })} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="stat-label">Monthly Contribution</label>
                  <input type="number" className="input-field" value={modalData.monthlyContribution} onChange={e => setModalData({ ...modalData, monthlyContribution: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="stat-label">Savings Goal (optional)</label>
                <input type="number" className="input-field" value={modalData.goal} onChange={e => setModalData({ ...modalData, goal: e.target.value })} placeholder="0 = no goal" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              {modalData.id && (
                <button className="btn-secondary" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => removeAccount(modalData.id)}>
                  Delete
                </button>
              )}
              <button className="btn-primary" style={{ flex: 1 }} onClick={saveAccount}>
                {modalData.id ? 'Save Changes' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === SPEND MODAL === */}
      {showSpendModal && (
        <div className="modal-overlay" onClick={() => setShowSpendModal(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{spendModalData.id ? 'Edit Spend' : 'Log Actual Spend'}</h2>
              <button className="btn-icon" onClick={() => setShowSpendModal(false)}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="stat-label">Category</label>
                <select className="input-field" value={spendModalData.budgetItemId} onChange={e => setSpendModalData({ ...spendModalData, budgetItemId: e.target.value })}>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (Budget: £{fmt(item.frequency === 'annual' ? (item.amount || 0) / 12 : (item.amount || 0))})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label">Actual Amount (£)</label>
                <input type="number" className="input-field" value={spendModalData.amount} onChange={e => setSpendModalData({ ...spendModalData, amount: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              {spendModalData.id && (
                <button className="btn-secondary" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => removeSpend(spendModalData.id)}>
                  Delete
                </button>
              )}
              <button className="btn-primary" style={{ flex: 1 }} onClick={saveSpend}>
                {spendModalData.id ? 'Save Changes' : 'Add Spend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
