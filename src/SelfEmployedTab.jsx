import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Download, Printer, Car, Receipt, TrendingUp, FileText, AlertCircle, CheckCircle, Clock, Briefcase, ShieldCheck, X, Info, Camera, Image } from 'lucide-react';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import {
    calculateMileageAllowance,
    calculateSEProfit,
    calculateSelfAssessment,
    calculateCapitalAllowances
} from './logic/SelfAssessmentCalculator';

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

const EXPENSE_CATEGORIES = [
    { value: 'office', label: 'Office & Admin', examples: 'Stationery, software, broadband' },
    { value: 'travel', label: 'Travel', examples: 'Public transport, hotels, parking' },
    { value: 'equipment', label: 'Equipment', examples: 'Laptop, tools, phone, peripherals' },
    { value: 'marketing', label: 'Marketing', examples: 'Ads, website, social media' },
    { value: 'professional', label: 'Professional Fees', examples: 'Accountant, legal, subscriptions' },
    { value: 'clothing', label: 'Clothing', examples: 'Uniforms & protective clothing only' },
    { value: 'other', label: 'Other', examples: 'Any other allowable expense' },
];

const ASSET_TYPES = [
    { value: 'equipment', label: 'Equipment / Tools (AIA 100%)' },
    { value: 'van', label: 'Van (AIA 100%)' },
    { value: 'ev', label: 'Electric Car (FYA 100%)' },
    { value: 'car_low', label: 'Car <= 50g/km (WDA 18%)' },
    { value: 'car_high', label: 'Car > 50g/km (WDA 6%)' },
];

const fmt = (n, dp = 2) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const HelperInfo = ({ id, text, activeId, setActiveId, setActiveText }) => {
  const isOpen = activeId === id;

  return (
    <div style={{ display: 'inline-block', marginLeft: '0.4rem', verticalAlign: 'middle', position: 'relative' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setActiveId(isOpen ? null : id);
          if (!isOpen) setActiveText(text);
        }}
        className="btn-icon"
        style={{
          color: isOpen ? 'var(--primary)' : 'var(--text-muted)',
          opacity: isOpen ? 1 : 0.6,
          background: isOpen ? 'var(--primary-light)' : 'transparent',
          padding: '4px',
          borderRadius: '6px',
          display: 'flex',
          transition: 'all 0.2s'
        }}
        title="More Information"
      >
        <Info size={18} />
      </button>
    </div>
  );
};

export default function SelfEmployedTab({
    seData,
    onUpdateSEData,
    taxYear,
    payeANI,
    payeIncomeTaxPaid,
    taxCode,
    currentUser,
    workMode,
    subscriptionTier = 'free',
    setShowPremiumModal,
    onUpgrade,
    activeHelperId,
    setActiveHelperId,
    setActiveText
}) {
    const [subTab, setSubTab] = useState('income');
    const [selectedMonth, setSelectedMonth] = useState(0);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState(null); // { type: 'invoice|expense|asset|mileage', data: {...} }

    const months = seData?.months || Array(12).fill(null).map(() => ({ invoices: [], expenses: [], mileage: [] }));
    const assets = useMemo(() => seData?.assets || [], [seData?.assets]);
    const useTradingAllowance = seData?.useTradingAllowance || false;

    const updateMonth = (monthIdx, field, newArr) => {
        const updated = [...months];
        updated[monthIdx] = { ...updated[monthIdx], [field]: newArr };
        onUpdateSEData({ ...seData, months: updated });
    };

    const updateAssets = (newAssets) => {
        onUpdateSEData({ ...seData, assets: newAssets });
    };

    // --- Aggregated totals ---
    const totals = useMemo(() => {
        let totalIncome = 0, unpaidIncome = 0;
        let expensesByCategory = {};
        let totalExpenses = 0;
        let totalMiles = 0;

        months.forEach(m => {
            (m.invoices || []).forEach(inv => {
                const amt = Number(inv.amount || 0);
                if (inv.paid) totalIncome += amt;
                else unpaidIncome += amt;
            });
            (m.expenses || []).forEach(exp => {
                const amt = Number(exp.amount || 0);
                totalExpenses += amt;
                expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + amt;
            });
            (m.mileage || []).forEach(m2 => {
                totalMiles += Number(m2.miles || 0);
            });
        });

        const capitalAllowances = calculateCapitalAllowances(assets);
        const mileageCalc = calculateMileageAllowance(totalMiles, taxYear);
        const profitCalc = calculateSEProfit({
            grossIncome: totalIncome,
            totalExpenses,
            mileageAllowance: mileageCalc.totalAllowance,
            useTradingAllowance,
            capitalAllowances,
            taxYear
        });
        const sa = calculateSelfAssessment({ payeANI, payeIncomeTaxPaid, seProfit: profitCalc.profit, taxCode, taxYear });

        // Vehicle Comparison Logic: Mileage vs Actuals
        const vehicleActualCost = assets.filter(a => a.type?.includes('car') || a.type === 'van' || a.type === 'ev').reduce((s, a) => s + calculateCapitalAllowances([a]), 0) + (expensesByCategory['travel'] || 0);
        const betterMethod = mileageCalc.totalAllowance >= vehicleActualCost ? 'mileage' : 'actuals';

        // Power Pack: VAT Monitor
        const vatThreshold = 90000;
        const vatProgress = (totalIncome / vatThreshold) * 100;

        // Power Pack: SIPP Tracking
        const totalSIPP = (seData?.sippContributions || []).reduce((s, c) => s + Number(c.amount || 0), 0);
        const sippRelief = totalSIPP * 0.25; // 20% at source = 25% top up

        return { 
            totalIncome, 
            unpaidIncome, 
            totalExpenses, 
            expensesByCategory, 
            totalMiles, 
            mileageCalc, 
            capitalAllowances, 
            profitCalc, 
            sa, 
            betterMethod, 
            vehicleActualCost,
            vatProgress,
            vatThreshold,
            totalSIPP,
            sippRelief
        };
    }, [months, assets, taxYear, useTradingAllowance, payeANI, payeIncomeTaxPaid, taxCode, seData?.sippContributions]);

    const [photoPreview, setPhotoPreview] = useState(null);

    const openAddModal = (type) => {
        // subscription limits (trial mode for Free and Annual)
        if (subscriptionTier !== 'monthly') {
            const currentInvoices = months.reduce((acc, m) => acc + (m.invoices?.length || 0), 0);
            const currentExpenses = months.reduce((acc, m) => acc + (m.expenses?.length || 0), 0);
            const currentAssets = assets.length;

            if (type === 'invoice' && currentInvoices >= 3) {
                alert("Self-Employed Trial Limit Reached: You are allowed up to 3 invoices in your current tier. Please upgrade to Monthly Pro for unlimited access.");
                if (onUpgrade) onUpgrade();
                else if (setShowPremiumModal) setShowPremiumModal(true);
                return;
            }
            if (type === 'expense' && currentExpenses >= 3) {
                alert("Self-Employed Trial Limit Reached: You are allowed up to 3 expenses in your current tier. Please upgrade to Monthly Pro for unlimited access.");
                if (onUpgrade) onUpgrade();
                else if (setShowPremiumModal) setShowPremiumModal(true);
                return;
            }
            if (type === 'asset' && currentAssets >= 1) {
                alert("Self-Employed Trial Limit Reached: You are allowed 1 asset in your current tier. Please upgrade to Monthly Pro for unlimited access.");
                if (onUpgrade) onUpgrade();
                else if (setShowPremiumModal) setShowPremiumModal(true);
                return;
            }
        }

        let template = {};
        if (type === 'invoice') template = { invoiceNumber: '', client: '', amount: '', date: new Date().toISOString().split('T')[0], paid: false };
        else if (type === 'expense') template = { category: 'office', description: '', amount: '', date: new Date().toISOString().split('T')[0], receiptPhoto: null };
        else if (type === 'asset') template = { name: '', cost: '', assetType: 'equipment', date: new Date().toISOString().split('T')[0] };
        else if (type === 'mileage') template = { description: '', miles: '', date: new Date().toISOString().split('T')[0] };

        setPhotoPreview(null);
        setModalData({ type, id: null, ...template });
        setShowModal(true);
    };

    const openEditModal = (type, item) => {
        const editData = type === 'asset' ? { ...item, assetType: item.type } : item;
        setPhotoPreview(editData.receiptPhoto || null);
        setModalData({ type, ...editData });
        setShowModal(true);
    };

    const handleTakePhoto = async () => {
        try {
            // Check permission first
            const perm = await CapacitorCamera.checkPermissions();
            if (perm.camera === 'denied') {
                alert('Camera access is needed to snap receipt photos.\n\nTo enable:\n1. Open iOS Settings\n2. Scroll to TaxSense\n3. Turn Camera ON');
                return;
            }
            
            const image = await CapacitorCamera.getPhoto({
                quality: 70,
                allowEditing: false,
                resultType: 'base64',
                source: 'camera'
            });
            if (image.base64String) {
                const base64 = `data:image/jpeg;base64,${image.base64String}`;
                setPhotoPreview(base64);
                setModalData(prev => ({ ...prev, receiptPhoto: base64 }));
            }
        } catch (e) {
            console.warn('Camera error:', e);
            // Only show error if it's not a user cancel
            if (e.message && !e.message.includes('cancel') && !e.message.includes('User cancelled')) {
                alert('Camera access is needed to snap receipt photos.\n\nTo enable:\n1. Open iOS Settings\n2. Scroll to TaxSense\n3. Turn Camera ON');
            }
        }
    };

    const handleSelectPhoto = async () => {
        try {
            const perm = await CapacitorCamera.checkPermissions();
            if (perm.photos === 'denied') {
                alert('Photo library access is needed to attach receipts.\n\nTo enable:\n1. Open iOS Settings\n2. Scroll to TaxSense\n3. Turn Photos ON');
                return;
            }
            
            const image = await CapacitorCamera.getPhoto({
                quality: 70,
                allowEditing: false,
                resultType: 'base64',
                source: 'photos'
            });
            if (image.base64String) {
                const base64 = `data:image/jpeg;base64,${image.base64String}`;
                setPhotoPreview(base64);
                setModalData(prev => ({ ...prev, receiptPhoto: base64 }));
            }
        } catch (e) {
            console.warn('Photo library error:', e);
            if (e.message && !e.message.includes('cancel') && !e.message.includes('User cancelled')) {
                alert('Photo library access is needed to attach receipts.\n\nTo enable:\n1. Open iOS Settings\n2. Scroll to TaxSense\n3. Turn Photos ON');
            }
        }
    };

    const handleSaveModal = () => {
        const { type, ...data } = modalData;
        const idToUse = data.id || Date.now().toString();
        const finalData = { ...data, id: idToUse };

        if (type === 'asset') {
            const finalAsset = { ...data, id: idToUse, type: data.assetType || 'equipment' };
            const newAssets = data.id 
                ? assets.map(a => a.id === data.id ? finalAsset : a)
                : [...assets, finalAsset];
            updateAssets(newAssets);
        } else if (type === 'sipp') {
            const newSipp = data.id 
                ? seData.sippContributions.map(s => s.id === data.id ? finalData : s)
                : [...(seData.sippContributions || []), finalData];
            onUpdateSEData({ ...seData, sippContributions: newSipp });
        } else {
            const field = type === 'invoice' ? 'invoices' : type === 'expense' ? 'expenses' : 'mileage';
            const arr = [...(months[selectedMonth][field] || [])];
            if (data.id) {
                const idx = arr.findIndex(i => i.id === data.id);
                if (idx > -1) arr[idx] = finalData;
            } else {
                arr.push(finalData);
            }
            updateMonth(selectedMonth, field, arr);
        }
        setShowModal(false);
        setModalData(null);
    };

    const handleRemoveModal = () => {
        const { type, id } = modalData;
        if (type === 'asset') {
            const newAssets = assets.filter(a => a.id !== id);
            updateAssets(newAssets);
        } else {
            const field = type === 'invoice' ? 'invoices' : type === 'expense' ? 'expenses' : 'mileage';
            const arr = (months[selectedMonth][field] || []).filter(item => item.id !== id);
            updateMonth(selectedMonth, field, arr);
        }
        setShowModal(false);
        setModalData(null);
    };


    // PDF Export Removed

    const subTabs = [
        { id: 'income', label: 'Income', icon: <TrendingUp size={16} /> },
        { id: 'expenses', label: 'Expenses', icon: <Receipt size={16} /> },
        { id: 'assets', label: 'Assets', icon: <Briefcase size={16} /> },
        { id: 'mileage', label: 'Mileage', icon: <Car size={16} /> },
        ...(workMode === 'se' ? [{ id: 'powerpack', label: 'Power Pack', icon: <ShieldCheck size={16} /> }] : []),
        { id: 'summary', label: 'Summary', icon: <FileText size={16} /> },
    ];

    return (
        <div id="se-report-content" style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Briefcase size={20} color="var(--primary)" /> Self-Employment ({taxYear})
                        </h2>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', opacity: 0.5 }}>Sole Trader / Freelance Income Tracker</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Trading Allowance toggle */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: useTradingAllowance ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)' }}>
                            <input
                                type="checkbox"
                                checked={useTradingAllowance}
                                onChange={e => onUpdateSEData({ ...seData, useTradingAllowance: e.target.checked })}
                                style={{ display: 'none' }}
                            />
                            <span style={{ color: useTradingAllowance ? 'var(--primary)' : 'inherit' }}>
                                {useTradingAllowance ? '✓ ' : ''}Trading Allowance (£1k)
                            </span>
                        </label>
                    </div>
                </div>

                {/* Key YTD stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
                    {[
                        { label: 'Paid Income', value: `£${fmt(totals.totalIncome)}`, color: 'var(--success)' },
                        { label: 'Unpaid', value: `£${fmt(totals.unpaidIncome)}`, color: '#fbbf24' },
                        { label: 'Expenses', value: `£${fmt(totals.totalExpenses)}`, color: 'var(--error)' },
                        { label: 'Mileage', value: `${totals.totalMiles} mi`, color: 'var(--primary)' },
                        { label: 'Taxable Profit', value: `£${fmt(totals.profitCalc.profit)}`, color: 'var(--warning)' },
                        { label: 'SA Estimate', value: `£${fmt(totals.sa.totalSABill)}`, color: 'var(--error)' },
                    ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '0.25rem' }}>{s.label}</div>
                            <div style={{ fontWeight: 'bold', color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sub-tab navigation */}
            <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '1.5rem', 
                background: 'rgba(0,0,0,0.15)', 
                borderRadius: '0.75rem', 
                padding: '0.25rem',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
            }}>
                {subTabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSubTab(t.id)}
                        style={{
                            flex: 1,
                            padding: '0.6rem 0.25rem',
                            background: subTab === t.id ? 'var(--primary)' : 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            color: subTab === t.id ? 'white' : 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: subTab === t.id ? 700 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Month selector (for income/expenses/mileage/sipp) */}
            {['income', 'expenses', 'mileage', 'powerpack'].includes(subTab) && (
                <div style={{ marginBottom: '1rem' }}>
                    <select
                        className="input-field"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        style={{ width: '100%', fontSize: '1rem' }}
                    >
                        {MONTHS.map((m, i) => (
                            <option key={m} value={i}>{m}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* --- INCOME TAB --- */}
            {subTab === 'income' && (
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Invoices — {MONTHS[selectedMonth]}</h3>
                        <button className="btn-add" onClick={() => openAddModal('invoice')}>
                            <Plus size={16} />
                        </button>
                    </div>
                    {(months[selectedMonth].invoices || []).length === 0 && (
                        <p style={{ opacity: 0.4, textAlign: 'center', padding: '1.5rem 0' }}>No invoices for {MONTHS[selectedMonth]}. Tap + to add one.</p>
                    )}
                    {(months[selectedMonth].invoices || []).map(inv => (
                        <div 
                            key={inv.id} 
                            className="overtime-line glass-card clickable" 
                            style={{ borderLeft: `4px solid ${inv.paid ? 'var(--success)' : '#fbbf24'}`, marginBottom: '1rem', padding: '1rem', cursor: 'pointer' }}
                            onClick={() => openEditModal('invoice', inv)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 800 }}>{inv.client || 'Unnamed Client'}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.2rem' }}>{inv.invoiceNumber ? `Inv: ${inv.invoiceNumber} • ` : ''}{new Date(inv.date).toLocaleDateString()}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 800, color: inv.paid ? 'var(--success)' : '#fbbf24', fontSize: '1.1rem' }}>£{fmt(inv.amount)}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 700 }}>{inv.paid ? 'PAID' : 'UNPAID'}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', opacity: 0.7 }}>
                        <span>Month Total (Paid)</span>
                        <strong>£{fmt((months[selectedMonth].invoices || []).filter(i => i.paid).reduce((s, i) => s + Number(i.amount || 0), 0))}</strong>
                    </div>
                </div>
            )}

            {/* --- EXPENSES TAB --- */}
            {subTab === 'expenses' && (
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Expenses — {MONTHS[selectedMonth]}</h3>
                        <button className="btn-add" onClick={() => openAddModal('expense')}>
                            <Plus size={16} />
                        </button>
                    </div>
                    {useTradingAllowance && (
                        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid #fbbf24', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#fbbf24' }}>
                            ⚠️ <strong>Trading Allowance is active.</strong> Itemised expenses won't reduce your profit — they're replaced by the flat £1,000 allowance. Disable it in the header if you want to claim actual expenses.
                        </div>
                    )}
                    {(months[selectedMonth].expenses || []).length === 0 && (
                        <p style={{ opacity: 0.4, textAlign: 'center', padding: '1.5rem 0' }}>No expenses for {MONTHS[selectedMonth]}.</p>
                    )}
                    {(months[selectedMonth].expenses || []).map(exp => (
                        <div
                            key={exp.id}
                            className="overtime-line glass-card clickable"
                            style={{ borderLeft: '4px solid var(--error)', marginBottom: '1rem', padding: '1rem', cursor: 'pointer' }}
                            onClick={() => openEditModal('expense', exp)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {exp.receiptPhoto && (
                                        <img src={exp.receiptPhoto} alt="Receipt" style={{ width: '40px', height: '40px', borderRadius: '0.4rem', objectFit: 'cover', border: '1px solid var(--glass-border)' }} />
                                    )}
                                    <div>
                                        <div style={{ fontWeight: 800 }}>{exp.description || 'No description'}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.2rem' }}>{EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label || exp.category} • {new Date(exp.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 800, color: 'var(--error)', fontSize: '1.1rem' }}>-£{fmt(exp.amount)}</div>
                            </div>
                        </div>
                    ))}
                    {/* Category breakdown */}
                    {Object.keys(totals.expensesByCategory).length > 0 && (
                        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
                            <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Annual by Category</div>
                            {Object.entries(totals.expensesByCategory).map(([cat, amt]) => (
                                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                    <span style={{ opacity: 0.7 }}>{EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat}</span>
                                    <span>£{fmt(amt)}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                                <span>Total (Annual)</span>
                                <span>£{fmt(totals.totalExpenses)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- ASSETS TAB --- */}
            {subTab === 'assets' && (
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Assets & Capital Allowances</h3>
                        <button className="btn-add" onClick={() => openAddModal('asset')}>
                            <Plus size={16} />
                        </button>
                    </div>
                    <div style={{ fontSize: '0.82rem', opacity: 0.6, marginBottom: '1.25rem' }}>
                        Log equipment or vehicles to claim tax relief (Capital Allowances).
                    </div>
                    {assets.map(asset => (
                        <div 
                            key={asset.id} 
                            className="overtime-line glass-card clickable" 
                            style={{ borderLeft: '4px solid var(--primary)', marginBottom: '1rem', padding: '1rem', cursor: 'pointer' }}
                            onClick={() => openEditModal('asset', asset)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 800 }}>{asset.name || 'Unnamed Asset'}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.2rem' }}>{ASSET_TYPES.find(t => t.value === asset.type)?.label || asset.type} • {asset.date ? new Date(asset.date).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>£{fmt(asset.cost)}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>RELIEF: £{fmt(calculateCapitalAllowances([asset]))}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {assets.length === 0 && <p style={{ textAlign: 'center', opacity: 0.4, padding: '1.5rem 0' }}>No assets logged yet. Use these for 100% tax relief on gear.</p>}
                </div>
            )}

            {/* --- MILEAGE TAB --- */}
            {subTab === 'mileage' && (
                <div>
                    <div className="glass-card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Mileage Log — {MONTHS[selectedMonth]}</h3>
                            <button className="btn-add" onClick={() => openAddModal('mileage')}>
                                <Plus size={16} />
                            </button>
                        </div>
                        {(months[selectedMonth].mileage || []).length === 0 && (
                            <p style={{ opacity: 0.4, textAlign: 'center', padding: '1.5rem 0' }}>No mileage for {MONTHS[selectedMonth]}. Tap + to log a journey.</p>
                        )}
                        {(months[selectedMonth].mileage || []).map(ml => (
                            <div 
                                key={ml.id} 
                                className="overtime-line glass-card clickable" 
                                style={{ borderLeft: '4px solid #fbbf24', marginBottom: '1rem', padding: '1rem', cursor: 'pointer' }}
                                onClick={() => openEditModal('mileage', ml)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 800 }}>{ml.description || 'Unnamed Journey'}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.2rem' }}>{new Date(ml.date).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1.1rem' }}>{ml.miles} mi</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Vehicle Efficiency Advisor */}
                    <div className="glass-card" style={{ border: '1px solid var(--primary)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={18} color="var(--primary)" /> Vehicle Efficiency Comparison</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem' }}>
                                <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Mileage Method (45p)</div>
                                <div style={{ fontWeight: 'bold' }}>£{fmt(totals.mileageCalc.totalAllowance)}</div>
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem' }}>
                                <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Actual Methods (Costs + WDA)</div>
                                <div style={{ fontWeight: 'bold' }}>£{fmt(totals.vehicleActualCost)}</div>
                            </div>
                        </div>
                        <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', fontSize: '0.85rem' }}>
                            {totals.betterMethod === 'mileage' ? (
                                <p style={{ margin: 0 }}>🌟 <strong>Calculation:</strong> Using <strong>Mileage (Simplified Expenses)</strong> results in ~£{fmt(totals.mileageCalc.totalAllowance - totals.vehicleActualCost)} more in deductions based on entered data.</p>
                            ) : (
                                <p style={{ margin: 0 }}>🚗 <strong>Calculation:</strong> Using <strong>Actual Costs + Capital Allowances</strong> yields £{fmt(totals.vehicleActualCost - totals.mileageCalc.totalAllowance)} higher deductions in this scenario.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- POWER PACK TAB --- */}
            {subTab === 'powerpack' && (
                subscriptionTier !== 'monthly' ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--primary)' }}>
                        <div style={{ background: 'var(--primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'white', boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)' }}>
                            <ShieldCheck size={32} />
                        </div>
                        <h2 style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Professional Power Pack</h2>
                        <p style={{ opacity: 0.7, maxWidth: '440px', margin: '0 auto 2.5rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
                            Unlock advanced monitoring tools: VAT Threshold Tracking, SIPP Contribution Trackers, and Payment on Account projections.
                        </p>
                        <button className="btn-primary" style={{ padding: '1rem 3rem', borderRadius: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }} onClick={onUpgrade || (() => setShowPremiumModal && setShowPremiumModal(true))}>
                            Upgrade to Monthly Pro
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* VAT Monitor */}
                        <div className="glass-card" style={{ border: '1px solid var(--primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingUp size={20} color="var(--primary)" /> VAT Threshold Monitor
                                </h3>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Threshold (£90k)</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: totals.totalIncome > totals.vatThreshold ? 'var(--error)' : 'var(--success)' }}>
                                        {totals.vatProgress.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            <div style={{ height: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '1rem', overflow: 'hidden', marginBottom: '1rem' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${Math.min(100, totals.vatProgress)}%`, 
                                    background: totals.vatProgress > 85 ? 'var(--error)' : (totals.vatProgress > 70 ? 'var(--warning)' : 'var(--primary)'),
                                    transition: 'width 1s ease-out'
                                }} />
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>
                                Total rolling income: <strong>£{fmt(totals.totalIncome)}</strong>. 
                                {totals.vatProgress > 80 ? ' You are nearing the VAT registration threshold. You may wish to consult a professional.' : ' You are within the VAT threshold.'}
                            </p>
                        </div>

                        {/* SIPP Growth Tracker */}
                        <div className="glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ShieldCheck size={20} color="var(--success)" /> SIPP Relief Tracker
                                </h3>
                                <button className="btn-add" onClick={() => {
                                    setModalData({ type: 'sipp', date: new Date().toISOString().split('T')[0], amount: '' });
                                    setShowModal(true);
                                }}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1rem' }}>
                                Log your personal pension contributions (SIPP). We'll calculate the immediate 25% top-up and higher-rate relief.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '0.25rem' }}>Total Paid In</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>£{fmt(totals.totalSIPP)}</div>
                                </div>
                                <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginBottom: '0.25rem' }}>HMRC Top-up</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>+£{fmt(totals.sippRelief)}</div>
                                </div>
                            </div>
                            <div className="sipp-list">
                                {(seData?.sippContributions || []).map(c => (
                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>SIPP Contribution</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 'bold' }}>£{fmt(c.amount)}</div>
                                            <button className="btn-icon" style={{ color: 'var(--error)' }} onClick={() => {
                                                const updated = seData.sippContributions.filter(item => item.id !== c.id);
                                                onUpdateSEData({ ...seData, sippContributions: updated });
                                            }}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PoA Tracker */}
                        <div className="glass-card" style={{ border: '1px solid var(--warning)', background: 'rgba(251, 191, 36, 0.05)' }}>
                            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={20} color="var(--warning)" /> Payments on Account (PoA)
                            </h3>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', opacity: 0.8 }}>
                                Estimated payments due in Jan and July next year, based on current projections.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '0.25rem' }}>Jan 31st</div>
                                    <div style={{ fontWeight: 'bold' }}>£{fmt(totals.sa.totalSABill / 2)}</div>
                                </div>
                                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '0.25rem' }}>July 31st</div>
                                    <div style={{ fontWeight: 'bold' }}>£{fmt(totals.sa.totalSABill / 2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* --- SUMMARY TAB --- */}
            {subTab === 'summary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-card">
                        <h3 style={{ margin: '0 0 1.5rem 0' }}>Annual Profit Breakdown</h3>
                        
                        <div className="summary-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                                <span style={{ opacity: 0.7 }}>Total Income</span>
                                <span style={{ fontWeight: 'bold' }}>£{fmt(totals.totalIncome)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                                <span style={{ opacity: 0.7 }}>Business Expenses</span>
                                <span style={{ color: 'var(--error)' }}>-£{fmt(totals.totalExpenses)}</span>
                            </div>
                            {totals.capitalAllowances > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                                    <span style={{ opacity: 0.7 }}>Capital Allowances</span>
                                    <span style={{ color: 'var(--error)' }}>-£{fmt(totals.capitalAllowances)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', marginTop: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>Taxable Profit</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>£{fmt(totals.profitCalc.profit)}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <h4 style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Liabilities</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9rem' }}>Income Tax</span>
                                        <span style={{ fontWeight: 'bold' }}>£{fmt(totals.sa.incomeTax)}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                        <div style={{ height: '100%', width: `${Math.min(100, (totals.sa.incomeTax / Math.max(1, totals.sa.totalSABill)) * 100)}%`, background: 'var(--primary)', borderRadius: '2px' }} />
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9rem' }}>Class 4 NI</span>
                                        <span style={{ fontWeight: 'bold' }}>£{fmt(totals.sa.class4NI)}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                        <div style={{ height: '100%', width: `${Math.min(100, (totals.sa.class4NI / Math.max(1, totals.sa.totalSABill)) * 100)}%`, background: '#10b981', borderRadius: '2px' }} />
                                    </div>
                                </div>
                                {totals.sa.studentLoan > 0 && (
                                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Student Loan</span>
                                            <span style={{ fontWeight: 'bold' }}>£{fmt(totals.sa.studentLoan)}</span>
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.2)', marginTop: '0.5rem' }}>
                                    <span style={{ fontWeight: 'bold' }}>Total Due (Jan 31st)</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--primary)' }}>£{fmt(totals.sa.totalSABill)}</span>
                                </div>
                            </div>
                        </div>

                        <h3 style={{ margin: '0 0 1.5rem 0' }}>Annual Profit Breakdown</h3>
                    </div>

                    {/* Quick Advisor Card */}
                    <div className="glass-card" style={{ border: '1px solid var(--success)', background: 'rgba(16, 185, 129, 0.05)' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldCheck color="var(--success)" size={24} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, color: 'var(--success)' }}>Tax Savings Recommendation</h4>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
                                    {currentUser?.email ? `Hi ${currentUser.email.split('@')[0]}, based` : 'Based'} on your current profit, the calculated monthly set-aside would be <strong>£{fmt(Math.ceil(totals.sa.totalSABill / 12))}</strong>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL --- */}
            {showModal && modalData && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>{modalData.id ? 'Edit' : 'Add'} {modalData.type.charAt(0).toUpperCase() + modalData.type.slice(1)}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><Trash2 size={24} style={{ transform: 'rotate(45deg)' }} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {modalData.type === 'invoice' && (
                                <>
                                    <div><label className="stat-label">Client Name</label> <HelperInfo id="seClient" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Individual or business you are billing. Essential for tracking outstanding payments." /><input className="input-field" value={modalData.client} onChange={e => setModalData({ ...modalData, client: e.target.value })} /></div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}><label className="stat-label">Inv #</label> <HelperInfo id="seInvNum" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Sequential reference number (e.g. INV-001). HMRC requires clear record sequences." /><input className="input-field" value={modalData.invoiceNumber} onChange={e => setModalData({ ...modalData, invoiceNumber: e.target.value })} /></div>
                                        <div style={{ flex: 1 }}><label className="stat-label">Amount (£)</label> <HelperInfo id="seInvAmount" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Gross amount billed. If you are VAT registered, include the total including VAT." /><input type="number" className="input-field" value={modalData.amount} onChange={e => setModalData({ ...modalData, amount: e.target.value })} /></div>
                                    </div>
                                    <div><label className="stat-label">Date</label> <HelperInfo id="seInvDate" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="The date the invoice was issued to the client." /><input type="date" className="input-field" value={modalData.date} onChange={e => setModalData({ ...modalData, date: e.target.value })} /></div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        <input type="checkbox" checked={modalData.paid} onChange={e => setModalData({ ...modalData, paid: e.target.checked })} style={{ width: '1.2rem', height: '1.2rem' }} />
                                        <label className="stat-label" style={{ margin: 0 }}>Mark as Paid</label> <HelperInfo id="seInvPaid" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Under Cash Basis rules, only PAID items count toward profit. Income not received is excluded until paid." />
                                    </div>
                                </>
                            )}

                            {modalData.type === 'expense' && (
                                <>
                                    <div>
                                        <label className="stat-label">Category</label> <HelperInfo id="seExpCat" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Common categories for HMRC reporting. Correct categorization is helpful for maintaining accurate records and claiming relevant relief." />
                                        <select className="input-field" value={modalData.category} onChange={e => setModalData({ ...modalData, category: e.target.value })}>
                                            {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="stat-label">Description</label> <HelperInfo id="seExpDesc" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Briefly describe the purchase (e.g., 'MacBook battery', 'Broadband bill'). Clear descriptions are vital for matching with bank statements." /><input className="input-field" value={modalData.description} onChange={e => setModalData({ ...modalData, description: e.target.value })} /></div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}><label className="stat-label">Amount (£)</label> <HelperInfo id="seExpAmount" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="The total cost of the expense. TaxSense will handle the deduction logic based on your overall profit projection." /><input type="number" className="input-field" value={modalData.amount} onChange={e => setModalData({ ...modalData, amount: e.target.value })} /></div>
                                        <div style={{ flex: 1 }}><label className="stat-label">Date</label><input type="date" className="input-field" value={modalData.date} onChange={e => setModalData({ ...modalData, date: e.target.value })} /></div>
                                    </div>
                                    {/* Receipt Photo Capture */}
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <label className="stat-label">Receipt Photo</label>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                            <button type="button" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }} onClick={handleTakePhoto}>
                                                <Camera size={16} /> Take Photo
                                            </button>
                                            <button type="button" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }} onClick={handleSelectPhoto}>
                                                <Image size={16} /> Choose from Library
                                            </button>
                                        </div>
                                        {photoPreview && (
                                            <div style={{ marginTop: '0.75rem', position: 'relative', display: 'inline-block' }}>
                                                <img src={photoPreview} alt="Receipt preview" style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', objectFit: 'cover' }} />
                                                <button type="button" className="btn-icon" style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--error)', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setPhotoPreview(null); setModalData(prev => ({ ...prev, receiptPhoto: null })); }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {modalData.type === 'asset' && (
                                <>
                                    <div><label className="stat-label">Asset Name</label> <HelperInfo id="seAssetName" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Name the equipment or vehicle (e.g. 'MacBook Pro'). Assets last over a year and are treated via Capital Allowances." /><input className="input-field" value={modalData.name} onChange={e => setModalData({ ...modalData, name: e.target.value })} /></div>
                                        <label className="stat-label">Asset Type</label> <HelperInfo id="seAssetType" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Determines the tax relief rate. Most equipment qualifies for 100% AIA (Annual Investment Allowance) in year one." />
                                        <select className="input-field" value={modalData.assetType} onChange={e => setModalData({ ...modalData, assetType: e.target.value })} style={{ width: '100%' }}>
                                            {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}><label className="stat-label">Cost (£)</label> <HelperInfo id="seAssetCost" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="The full purchase price" /><input type="number" className="input-field" value={modalData.cost} onChange={e => setModalData({ ...modalData, cost: e.target.value })} /></div>
                                        <div style={{ flex: 1 }}><label className="stat-label">Purchase Date</label><input type="date" className="input-field" value={modalData.date} onChange={e => setModalData({ ...modalData, date: e.target.value })} /></div>
                                    </div>
                                </>
                            )}

                            {modalData.type === 'mileage' && (
                                <>
                                    <div><label className="stat-label">Journey / Description <HelperInfo id="seMilDesc" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Note the destination and business purpose. Remember: travel between home and your regular workplace is usually NOT claimable." /></label><input className="input-field" value={modalData.description} onChange={e => setModalData({ ...modalData, description: e.target.value })} /></div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}><label className="stat-label">Miles <HelperInfo id="seMilCount" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="Total business miles. HMRC allows 45p for the first 10,000 miles and 25p thereafter (Simplified Expenses)." /></label><input type="number" className="input-field" value={modalData.miles} onChange={e => setModalData({ ...modalData, miles: e.target.value })} /></div>
                                        <div style={{ flex: 1 }}><label className="stat-label">Date</label><input type="date" className="input-field" value={modalData.date} onChange={e => setModalData({ ...modalData, date: e.target.value })} /></div>
                                    </div>
                                </>
                            )}

                            {modalData.type === 'sipp' && (
                                <>
                                    <div><label className="stat-label">Contribution Amount (£) <HelperInfo id="seSippAmount" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveText} text="The net amount paid into your pension. HMRC adds 25% (basic rate relief) to this, which we track for your Self-Assessment total." /></label><input type="number" className="input-field" value={modalData.amount} onChange={e => setModalData({ ...modalData, amount: e.target.value })} /></div>
                                    <div><label className="stat-label">Date</label><input type="date" className="input-field" value={modalData.date} onChange={e => setModalData({ ...modalData, date: e.target.value })} /></div>
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            {modalData.id && (
                                <button className="btn-secondary" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} onClick={handleRemoveModal}>
                                    Delete
                                </button>
                            )}
                            <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveModal}>
                                {modalData.id ? 'Save Changes' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
