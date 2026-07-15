import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { Plus, Trash2, Calculator, TrendingUp, Download, Info, AlertTriangle, Calendar, Clock, Receipt, Settings, RefreshCw, LayoutDashboard, CheckSquare, Square, ExternalLink, BarChart3, PieChart as PieChartIcon, ShieldCheck, Printer, Landmark, Copy, Briefcase, BookOpen, Sun, Moon, Bot, Smartphone, Car, Gauge, ClipboardList, X, ChevronRight, ChevronDown, CloudUpload, CloudDownload, AlertCircle, Wallet } from 'lucide-react';
import { calculateTax, calculateCumulativeTax, projectAnnual, getTaxTrapSummary, calculateOvertime, calculateStandardTaxCode } from './logic/TaxCalculator';
import { getProfiles, saveProfiles, markFirebaseMigrationComplete, exportBackup, importBackup, getLastBackupDate, shouldShowBackupReminder, dismissBackupReminder } from './services/LocalStorageService';
import PurchaseService from './services/PurchaseService';
import { Share } from '@capacitor/share';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import SelfEmployedTab from './SelfEmployedTab';
import GuideTab from './GuideTab';
import SetupWizard from './SetupWizard';
import FullGuideModal from './FullGuideModal';
import GettingStartedModal from './GettingStartedModal';
import { calculateSEProfit, calculateMileageAllowance, calculateSelfAssessment } from './logic/SelfAssessmentCalculator';
import BudgetTab from './BudgetTab';

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
const getCurrentTaxYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  // UK tax year starts April 6th
  const isAfterTaxStart = (now.getMonth() > 3) || (now.getMonth() === 3 && now.getDate() >= 6);
  return isAfterTaxStart ? `${year}/${(year + 1).toString().slice(-2)}` : `${year - 1}/${year.toString().slice(-2)}`;
};

const DonutChart = ({ data }) => {
  const total = data.reduce((s, i) => s + i.value, 0);

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', maxWidth: '200px', margin: '0 auto', display: 'block' }}>
      {data.map((slice, i) => {
        const slicePercent = slice.value / total;
        // Pre-calculate cumulative percent for this slice without mutation
        const startPercent = data.slice(0, i).reduce((acc, s) => acc + (s.value / total), 0);
        const endPercent = startPercent + slicePercent;
        
        const [startX, startY] = getCoordinatesForPercent(startPercent);
        const [endX, endY] = getCoordinatesForPercent(endPercent);
        const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
        const pathData = [
          `M ${startX} ${startY}`,
          `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          `L 0 0`,
        ].join(' ');
        return <path key={i} d={pathData} fill={slice.color} stroke="var(--bg-dark)" strokeWidth="0.01" />;
      })}
      <circle cx="0" cy="0" r="0.6" fill="var(--bg-dark)" />
    </svg>
  );
};

// --- Components ---
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

const AnalyticsTab = ({ 
  analyticsData, 
  taxYear, 
  chartKey, 
  leaseConfig, 
  setMileageLogs, 
  setChartKey, 
  mileageLogs,
  exportFullAnnualReport,
  workMode
}) => {
  const [showSacrificeDetail, setShowSacrificeDetail] = useState(false);
  const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#8b5cf6'];
  
  return (
    <div className="analytics-view" id="analytics-content">
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        {/* Projections Card */}
        <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="var(--primary)" /> Year-End Forecast ({taxYear})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div className="stat-label">{workMode === 'se' ? 'Total SE Revenue' : 'Total Gross Income'}</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>£{(analyticsData.projections.gross + analyticsData.seProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              {workMode === 'both' && (
                <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>
                  PAYE: £{analyticsData.projections.gross.toLocaleString()} | SE: £{analyticsData.seProfit.toLocaleString()}
                </div>
              )}
            </div>
            <div>
              <div className="stat-label">{workMode === 'se' ? 'Taxable Profit (ANI)' : 'Taxable Annual Pay (ANI)'}</div>
              <div className="stat-value" style={{ color: 'var(--primary)', fontSize: '1.4rem' }}>£{analyticsData.projections.taxableIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>
                {workMode === 'se' ? 'Your profit after expenses and allowances.' : 'This is your income after all pre-tax deductions.'}
              </div>
            </div>
            <div>
              <div className="stat-label">Total Effective Tax</div>
              <div className="stat-value" style={{ color: 'var(--error)', fontSize: '1.4rem' }}>£{analyticsData.totalTaxNI.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>
                PAYE IT/NI: £{analyticsData.projections.totalTaxNI.toLocaleString()} | SA Bill: £{analyticsData.seSABill.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="stat-label">Total Annual Net</div>
              <div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.4rem' }}>£{analyticsData.totalTakeHome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="stat-label">Overall Tax Rate</div>
              <div className="stat-value" style={{ color: 'var(--warning)', fontSize: '1.4rem' }}>
                {((analyticsData.totalTaxNI / (analyticsData.projections.gross + analyticsData.seProfit)) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="stat-card">
              <label className="stat-label">Pension Pot Growth</label>
              <div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.4rem' }}>£{analyticsData.projections.pensionContribution.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        </div>

        {/* Breakdown Card - Pie Chart v63 */}
        <div className="glass-card">
          <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChartIcon size={20} color="var(--primary)" /> Net Pay Breakdown
          </h2>
          <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Net Pay', value: analyticsData.totalTakeHome, color: 'var(--success)' },
                    { name: 'Income Tax', value: analyticsData.projections.incomeTax + analyticsData.seSABill, color: 'var(--error)' },
                    { name: 'Nat. Insurance', value: analyticsData.projections.ni, color: '#fbbf24' },
                    { name: 'Pension', value: analyticsData.projections.pensionContribution, color: '#10b981' },
                    { name: 'Student Loan', value: analyticsData.projections.studentLoan, color: '#06b6d4' },
                  ].filter(i => i.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[
                    { color: 'var(--success)' },
                    { color: 'var(--error)' },
                    { color: '#fbbf24' },
                    { color: '#10b981' },
                    { color: '#06b6d4' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)' }}
                  formatter={(value) => `£${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salary Sacrifice Savings Breakdown - NEW v63 */}
        {(analyticsData.sacrificeItemsSavings > 0 || analyticsData.restoredAllowance > 0) && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                <ShieldCheck size={20} /> Salary Sacrifice Efficiency
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ padding: '0.4rem 0.8rem', background: 'var(--success)', color: 'white', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  Tax Saved: £{(analyticsData.sacrificeItemsSavings + (analyticsData.restoredAllowance * 0.4)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                {analyticsData.itemizedSacrifices?.length > 0 && (
                  <button 
                    onClick={() => setShowSacrificeDetail(!showSacrificeDetail)}
                    className="btn-icon"
                    style={{ 
                      background: 'rgba(16, 185, 129, 0.2)', 
                      color: 'var(--success)', 
                      padding: '0.4rem', 
                      borderRadius: '0.5rem',
                      transform: showSacrificeDetail ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.3s'
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Direct Tax Savings</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>Income Tax (Saved)</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>+£{analyticsData.ssTaxSaved.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem' }}>Nat. Insurance (Saved)</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>+£{analyticsData.ssNiSaved.toLocaleString()}</span>
                </div>
              </div>

              {analyticsData.restoredAllowance > 0 && (
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--primary)' }}>60% Tax Trap Recovery</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>Allowance Restored</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>£{analyticsData.restoredAllowance.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem' }}>Effective Saving</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>£{(analyticsData.restoredAllowance * 0.4).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Efficiency Rating</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                  {Math.round(((analyticsData.sacrificeItemsSavings + (analyticsData.restoredAllowance * 0.4)) / (analyticsData.projections.salarySacrifice + (analyticsData.pensionType === 'salary_sacrifice' ? analyticsData.projections.pensionContribution : 0))) * 100)}%
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Percent of sacrifice recovered in tax savings.</div>
              </div>
            </div>

            {showSacrificeDetail && analyticsData.itemizedSacrifices?.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(16, 185, 129, 0.2)', animation: 'fadeIn 0.3s ease' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--success)', opacity: 0.8 }}>ITEMIZED SACRIFICES (ANNUAL)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {analyticsData.itemizedSacrifices.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{item.name}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>£{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mileage / Car Lease Tool - v20.8 Fixed */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Car size={20} color="var(--primary)" /> Lease Mileage Tracker
            </h2>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase' }}>Lease Progress</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{analyticsData.mileage?.daysElapsed || 0} Days</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.2rem', borderRadius: '1rem' }}>
              <div className="stat-label" style={{ marginBottom: '0.5rem' }}>Current vs Target</div>
              <div className="stat-value" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {(analyticsData.mileage?.actualMileage || 0).toLocaleString()}
                <span style={{ fontSize: '0.8rem', opacity: 0.4 }}>/ {(analyticsData.mileage?.targetMileage || 0).toLocaleString()}</span>
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                color: analyticsData.mileage?.status === 'over' ? 'var(--error)' : 'var(--success)',
                marginTop: '0.4rem'
              }}>
                {analyticsData.mileage?.status === 'over' ? 'Over' : 'Under'} by {(analyticsData.mileage?.difference || 0).toLocaleString()} mi
              </div>
            </div>

            <div style={{ background: 'rgba(255,165,0,0.05)', padding: '1.2rem', borderRadius: '1rem', border: '1px solid rgba(255,165,0,0.1)' }}>
              <div className="stat-label" style={{ marginBottom: '0.5rem' }}>End of Lease Projection</div>
              <div className="stat-value" style={{ color: (analyticsData.mileage?.projection || 0) > leaseConfig.totalAllowedMiles ? 'var(--error)' : 'var(--success)' }}>
                {Math.round(analyticsData.mileage?.projection || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.4rem' }}>
                Estimated total miles
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Limit: {leaseConfig.totalAllowedMiles.toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1.2rem', borderRadius: '1rem', border: '1px solid rgba(99, 102, 241, 0.2)', gridColumn: '1 / -1' }}>
              <div className="stat-label" style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)' }}>
                <Gauge size={14} /> Record Current Odometer
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="e.g. 12500"
                  id="mileage-input"
                  className="input-field"
                  style={{ flex: 1, height: '3.5rem', fontSize: '1.2rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      const reading = Number(e.target.value);
                      if (!isNaN(reading)) {
                        const newLog = { id: Date.now(), date: new Date().toISOString().split('T')[0], reading };
                        setMileageLogs([...mileageLogs, newLog]);
                        e.target.value = '';
                        setChartKey(prev => prev + 1);
                      }
                    }
                  }}
                />
                  <button 
                  className="btn-primary" 
                  style={{ width: '160px', height: '3.5rem', borderRadius: '0.75rem', fontWeight: 'bold' }}
                  onClick={() => {
                    const input = document.getElementById('mileage-input');
                    const reading = Number(input.value);
                    if (!isNaN(reading) && input.value) {
                      const newLog = { id: Date.now(), date: new Date().toISOString().split('T')[0], reading };
                      setMileageLogs([...mileageLogs, newLog]);
                      input.value = '';
                      setChartKey(prev => prev + 1);
                    }
                  }}
                >
                  Update Odometer
                </button>
              </div>
              <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '0.5rem', textAlign: 'center' }}>
                Charts will update instantly upon entry.
              </div>
            </div>
          </div>

          <div style={{ height: '300px', width: '100%', marginTop: '1.5rem' }}>
            <ResponsiveContainer width="100%" height="100%" key={`mileage-${chartKey}`}>
              <LineChart data={analyticsData.mileage.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.2)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-main)" fontSize={12} opacity={0.6} hide={window.innerWidth < 500} />
                <YAxis stroke="var(--text-main)" fontSize={12} opacity={0.6} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)' }} />
                <Legend />
                <Line type="monotone" dataKey="planned" name="Contracted Miles" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="actual" name="Recorded Miles" stroke="#10b981" strokeWidth={4} connectNulls dot={{ r: 6, fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 8 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Annual Export Section v17.0 */}
          <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={20} color="var(--primary)" /> Reports & Annual Exports
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <button className="btn-secondary" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} onClick={exportFullAnnualReport}>
                <Download size={20} />
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Export Annual Summary (CSV)</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Includes itemised OT & monthly totals.</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



function App() {
  // --- Core Lifecycle & Auth State ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [profiles, setProfiles] = useState({});
  const isBootingRef = useRef(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const lastSavedHashRef = useRef('');

  // --- UI State ---
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, overtime, config
  const [otFilterClaimed, setOtFilterClaimed] = useState('all'); // all, claimed, unclaimed
  const [showClaimedOT, setShowClaimedOT] = useState(false); // collapsed by default
  const [otFilterMonth, setOtFilterMonth] = useState('all');
  const [sourceYearForCopy, setSourceYearForCopy] = useState('2024/25');
  const [targetYearForCopy, setTargetYearForCopy] = useState('2025/26');
  const [showOtModal, setShowOtModal] = useState(false);
  const [otModalData, setOtModalData] = useState({ monthIdx: 0, hours: '', multiplier: 1.5, reason: '', date: new Date().toISOString().split('T')[0] });
  const [showBaseModifierModal, setShowBaseModifierModal] = useState(false);
  const [baseModifierModalData, setBaseModifierModalData] = useState({ id: null, type: 'enhancement', name: '', amount: '', frequency: 'annual', sacrificeType: 'salary_sacrifice', includeInPension: false, enhancementType: 'income' });

  // --- Persistent State ---
  const [taxCode, setTaxCode] = useState('1257L');
  const [baseSalary, setBaseSalary] = useState(45000);
  const [contractedHours, setContractedHours] = useState(37.5);
  const [pensionPercent, setPensionPercent] = useState(5);
  const [pensionType, setPensionType] = useState('standard'); // 'standard' | 'salary_sacrifice'
  const [taxYear, setTaxYear] = useState(getCurrentTaxYear());
  const [studentLoanPlans, setStudentLoanPlans] = useState([]); // plan1, plan2, plan4, plan5, pgl
  const [childBenefitCount, setChildBenefitCount] = useState(0);
  const [holidaySupplementPercent, setHolidaySupplementPercent] = useState(8.3);

  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxSalary, setSandboxSalary] = useState(null);
  const [sandboxPension, setSandboxPension] = useState(null);
  const [sandboxOvertime, setSandboxOvertime] = useState(null);
  const [sandboxSacrifice, setSandboxSacrifice] = useState(null);
  const [sandboxSEProfit, setSandboxSEProfit] = useState(null);
  const [sandboxSipp, setSandboxSipp] = useState(null);
  const [sandboxGiftAid, setSandboxGiftAid] = useState(null);
  const [sandboxSEAllowance, setSandboxSEAllowance] = useState(null);

  const [baseEnhancements, setBaseEnhancements] = useState([]);
  const [baseSacrifices, setBaseSacrifices] = useState([]);
  const [sandboxBaselineNet, setSandboxBaselineNet] = useState(null);

  // --- Self-Employment State ---
  const [workMode, setWorkMode] = useState('paye'); // 'paye' | 'se' | 'both'
  const [seData, setSEData] = useState({ months: Array(12).fill(null).map(() => ({ invoices: [], expenses: [], mileage: [] })), vatRegistered: false, useTradingAllowance: false });

  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const [months, setMonths] = useState(Array(12).fill(null).map(() => ({ income: [], overtime: [], deductions: [] })));

  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    return localStorage.getItem('taxsense_tour_complete') === 'true';
  });
  const [subscriptionTier, setSubscriptionTier] = useState('free'); // 'free' | 'annual' | 'monthly'
  const isPremium = subscriptionTier !== 'free';
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showFullGuide, setShowFullGuide] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const [leaseConfig, setLeaseConfig] = useState({ startDate: '', termMonths: 36, totalAllowedMiles: 30000 });
  const [mileageLogs, setMileageLogs] = useState([]);
  const [budgetConfig, setBudgetConfig] = useState({ budgetedItems: [], savingsAccounts: [] });
  const [budgetActuals, setBudgetActuals] = useState(Array(12).fill(null).map(() => ({ spends: [] })));
  const [chartKey, setChartKey] = useState(0);
  const [activeHelperId, setActiveHelperId] = useState(null);
  const [activeHelperText, setActiveHelperText] = useState(null);

  // Backup & Restore State
  const [backupStatus, setBackupStatus] = useState(null); // { type: 'success'|'error', message: string }

  // --- Helpers ---
  const getMonthlyValue = useCallback((amount, frequency) => {
    if (frequency === 'monthly') return Number(amount) || 0;
    if (frequency === 'annual') return (Number(amount) || 0) / 12;
    if (frequency === 'hourly') return ((Number(amount) || 0) * contractedHours * 52) / 12;
    return Number(amount) || 0;
  }, [contractedHours]);

  // --- Memoized Derived Data ---
  // (Note: useMemo/useCallback come after state declarations)

  const DEFAULT_PROFILE = useCallback((year = getCurrentTaxYear()) => ({
    taxYear: year,
    taxCode: '1257L',
    baseSalary: 0,
    contractedHours: 37.5,
    pensionPercent: 0,
    pensionType: 'standard',
    holidaySupplementPercent: 0,
    studentLoanPlans: [],
    childBenefitCount: 0,
    baseEnhancements: [],
    baseSacrifices: [],
    months: Array(12).fill(null).map(() => ({ income: [], overtime: [], deductions: [] })),
    workMode: 'paye',
    seData: { months: Array(12).fill(null).map(() => ({ invoices: [], expenses: [], mileage: [] })), assets: [], sippContributions: [], vatRegistered: false, useTradingAllowance: false },
    hasCompletedTour: true,
    leaseConfig: { startDate: '', termMonths: 36, totalAllowedMiles: 30000 },
    mileageLogs: [],
    subscriptionTier: 'free',
    budgetConfig: { budgetedItems: [], savingsAccounts: [] },
    budgetActuals: Array(12).fill(null).map(() => ({ spends: [] })),
  }), []);

  const resetAllStates = useCallback(() => {
    const fresh = DEFAULT_PROFILE();
    setTaxCode(fresh.taxCode);
    setBaseSalary(fresh.baseSalary);
    setContractedHours(fresh.contractedHours);
    setPensionPercent(fresh.pensionPercent);
    setPensionType(fresh.pensionType);
    setHolidaySupplementPercent(fresh.holidaySupplementPercent);
    setStudentLoanPlans(fresh.studentLoanPlans);
    setChildBenefitCount(fresh.childBenefitCount);
    setBaseEnhancements(fresh.baseEnhancements);
    setBaseSacrifices(fresh.baseSacrifices);
    setMonths(fresh.months);
    setWorkMode(fresh.workMode);
    setSEData(fresh.seData);
    setHasCompletedTour(true);
    setSubscriptionTier(fresh.subscriptionTier || 'free');
    setLeaseConfig(fresh.leaseConfig);
    setMileageLogs(fresh.mileageLogs);
    setProfiles({});
  }, [DEFAULT_PROFILE]);

  const applyProfile = useCallback((prof) => {
    setTaxCode(prof.taxCode || '1257L');
    setBaseSalary(prof.baseSalary !== undefined ? prof.baseSalary : 0);
    setContractedHours(prof.contractedHours !== undefined ? prof.contractedHours : 37.5);
    setPensionPercent(prof.pensionPercent !== undefined ? prof.pensionPercent : 0);
    setPensionType(prof.pensionType || 'standard');
    setHolidaySupplementPercent(prof.holidaySupplementPercent !== undefined ? prof.holidaySupplementPercent : 0);
    setStudentLoanPlans(prof.studentLoanPlans || []);
    setChildBenefitCount(prof.childBenefitCount !== undefined ? prof.childBenefitCount : 0);
    setBaseEnhancements(prof.baseEnhancements || []);
    setBaseSacrifices(prof.baseSacrifices || []);
    setMonths(prof.months || Array(12).fill(null).map(() => ({ income: [], overtime: [], deductions: [] })));
    setWorkMode(prof.workMode || 'paye');
    setSEData(prof.seData || { months: Array(12).fill(null).map(() => ({ invoices: [], expenses: [], mileage: [] })), assets: [], sippContributions: [], vatRegistered: false, useTradingAllowance: false });
    setHasCompletedTour(prof.hasCompletedTour !== undefined ? prof.hasCompletedTour : true);
    setSubscriptionTier(prof.subscriptionTier || (prof.isPremium ? 'annual' : 'free')); 
    setLeaseConfig(prof.leaseConfig || { startDate: '', termMonths: 36, totalAllowedMiles: 30000 });
    setMileageLogs(prof.mileageLogs || []);
    setBudgetConfig(prof.budgetConfig || { budgetedItems: [], savingsAccounts: [] });
    setBudgetActuals(prof.budgetActuals || Array(12).fill(null).map(() => ({ spends: [] })));
  }, []);





  // --- Migration: Ghost Item Cleanup (v53 fix) ---
  // Any items stuck in 'income' from previous scans are uneditable. 
  // We move them to 'deductions' with type 'income' so they are editable.
  useEffect(() => {
    if (!isLoaded || !months) return;
    
    let hasChanges = false;
    const newMonths = months.map(m => {
      if (m.income && m.income.length > 0) {
        hasChanges = true;
        const migrated = m.income.map(inc => ({
          id: inc.id || `migrated_${Date.now()}_${Math.random()}`,
          name: inc.name || inc.label || "Migrated Item",
          amount: String(inc.amount),
          type: 'income'
        }));
        return {
          ...m,
          income: [], // Clear out the ghost array
          deductions: [...(m.deductions || []), ...migrated]
        };
      }
      return m;
    });

    if (hasChanges) {
      console.log("TaxSense: Migrated ghost items to editable deductions list.");
      setMonths(newMonths);
    }
  }, [isLoaded, months]);

  // Set default month on mount/boot
  useEffect(() => {
    if (isLoaded) {
      const now = new Date();
      let currentMonth = now.getMonth();
      let taxMonthIdx = currentMonth - 3;
      if (taxMonthIdx < 0) taxMonthIdx += 12;
      setSelectedMonthIdx(taxMonthIdx);
    }
  }, [isLoaded]);

  // Force chart re-calculation when arriving at Analytics tab
  useLayoutEffect(() => {
    if (activeTab === 'analytics') {
      // Small delay to ensure DOM is settled/visible
      const timer = setTimeout(() => {
        setChartKey(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // PDF generation removed

  const exportFullAnnualReport = () => {
    // 1. Headers & Basic Info
    const rows = [
      ['TaxSense - Full Annual Summary Report', '', '', '', '', '', '', '', ''],
      ['Version', 'v1.2.0 (Build 52)', '', '', '', '', '', '', ''],
      ['Tax Year', taxYear, '', '', '', '', '', '', ''],
      ['Profile', workMode.toUpperCase(), '', '', '', '', '', '', ''],
      ['Subscription', subscriptionTier.toUpperCase(), '', '', '', '', '', '', ''],
      [],
      ['PAYE MONTHLY SUMMARY', '', '', '', '', '', '', '', ''],
      ['Month', 'Gross Income', 'Pension', 'Salary Sacrifice', 'Tax Free Exp', 'Net Pay', 'Income Tax', 'NI', 'Student Loan'],
    ];

    // 2. Add Monthly Data
    analyticsData.timeline.forEach((m, i) => {
      rows.push([
        MONTHS[i],
        m.gross.toFixed(2),
        m.pension.toFixed(2),
        (months[i].deductions?.filter(d => d.type === 'salary_sacrifice').reduce((s, it) => s + Number(it.amount || 0), 0) || 0).toFixed(2),
        (m.taxFree || 0).toFixed(2),
        m.net.toFixed(2),
        m.tax.toFixed(2),
        m.ni.toFixed(2),
        m.sl.toFixed(2)
      ]);
    });

    // 3. Add Annual Projections
    rows.push([]);
    rows.push(['ANNUAL PAYE PROJECTIONS', '', '', '', '', '', '', '', '']);
    rows.push(['Metric', 'Value', '', '', '', '', '', '', '']);
    rows.push(['Total Gross', analyticsData.projections.gross.toFixed(2)]);
    rows.push(['Taxable Income', analyticsData.projections.taxableIncome.toFixed(2)]);
    rows.push(['Income Tax', analyticsData.projections.incomeTax.toFixed(2)]);
    rows.push(['National Insurance', analyticsData.projections.ni.toFixed(2)]);
    rows.push(['Annual Take Home', analyticsData.projections.annualTakeHome.toFixed(2)]);

    // 4. Itemised Overtime
    rows.push([]);
    rows.push(['ITEMISED OVERTIME ENTRIES', '', '', '', '', '', '', '', '']);
    rows.push(['Date', 'Month Paid', 'Hours', 'Multiplier', 'Amount (£)', 'Reason', 'Claimed', '', '']);
    
    months.forEach((m, mIdx) => {
      (m.overtime || []).forEach(o => {
        const amt = calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier);
        rows.push([
          o.date || '-',
          MONTHS[mIdx],
          o.hours,
          `${o.multiplier}x`,
          amt.toFixed(2),
          o.reason || '-',
          o.claimed ? 'YES' : 'NO',
          '',
          ''
        ]);
      });
    });

    // 5. Self-Employed Summary (if data exists)
    if (workMode !== 'paye') {
      rows.push([]);
      rows.push(['SELF-EMPLOYED SUMMARY', '', '', '', '', '', '', '', '']);
      rows.push(['Invoiced Income', 'Expenses', 'Profit', 'Estimated Tax (SA)', 'NI Class 4', 'NI Class 2', 'Total SE Bill', '', '']);
      
      let totalSEIncome = 0;
      let totalSEExp = 0;
      seData.months.forEach(m => {
        (m.invoices || []).forEach(inv => { if (inv.paid) totalSEIncome += Number(inv.amount || 0); });
        (m.expenses || []).forEach(exp => { totalSEExp += Number(exp.amount || 0); });
      });

      rows.push([
        totalSEIncome.toFixed(2),
        totalSEExp.toFixed(2),
        analyticsData.seProfit.toFixed(2),
        analyticsData.seSABill.toFixed(2),
        (analyticsData.saDetails?.niClass4 || 0).toFixed(2),
        (analyticsData.saDetails?.niClass2 || 0).toFixed(2),
        (analyticsData.seSABill).toFixed(2)
      ]);

      // 6. Assets
      rows.push([]);
      rows.push(['SELF-EMPLOYED ASSETS', '', '', '', '', '', '', '', '']);
      rows.push(['Name', 'Purchase Date', 'Cost', 'Type', 'Capital Allowance', '', '', '', '']);
      (seData.assets || []).forEach(a => {
        rows.push([
          a.name, 
          a.date, 
          Number(a.cost || 0).toFixed(2), 
          a.type,
          (Number(a.cost || 0) * (a.type === 'computer' ? 1 : 0.18)).toFixed(2) // Rough estimate for report
        ]);
      });

      // 7. SE Mileage
      rows.push([]);
      rows.push(['SELF-EMPLOYED MILEAGE LOGS', '', '', '', '', '', '', '', '']);
      rows.push(['Date', 'Description', 'Miles', 'Rate', 'Claim Value', '', '', '', '']);
      let totalSEMiles = 0;
      seData.months.forEach(m => {
        (m.mileage || []).forEach(ml => {
          const rate = totalSEMiles < 10000 ? 0.45 : 0.25;
          const val = ml.miles * rate;
          rows.push([ml.date, ml.description, ml.miles, rate, val.toFixed(2)]);
          totalSEMiles += ml.miles;
        });
      });
    }

    const csvContent = rows.map(e => e.map(cell => `"${cell || ''}"`).join(",")).join("\n");
    const filename = `TaxSense_Report_${taxYear.replace('/', '-')}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    if (navigator.share && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      const file = new File([blob], filename, { type: 'text/csv' });
      navigator.share({
        files: [file],
        title: 'TaxSense Annual Report',
        text: `Full tax summary report for ${taxYear}`
      }).catch(err => {
        console.error('Sharing failed:', err);
        // Fallback to download
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
      });
    } else {
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Export as text removed

  // --- Components ---




  // Theme moved to top

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    console.log("[BOOT: LOCAL_INIT] Starting local-only mode...");
    isBootingRef.current = true;
    
    const initLocal = async () => {
      try {
        // Check for Firebase migration
        const needsMigration = !localStorage.getItem('taxSense_migrated_from_firebase');
        let loadedProfiles = {};
        
        // Try to load existing local data
        const localData = await getProfiles('local-user');
        
        if (needsMigration) {
          console.log("[BOOT: MIGRATION_CHECK] Checking for old Firebase data...");
          // Check for old Firebase data in localStorage
          const oldFirebaseData = localStorage.getItem('taxSenseData_Profiles') || 
                                  localStorage.getItem('taxTrackerDataV14_Profiles');
          
          if (oldFirebaseData) {
            console.log("[BOOT: MIGRATION] Found old Firebase data, migrating...");
            try {
              const parsed = JSON.parse(oldFirebaseData);
              loadedProfiles = parsed;
              await saveProfiles(loadedProfiles, 'local-user');
            } catch (e) {
              console.error("[BOOT: MIGRATION_ERROR] Failed to migrate:", e);
            }
          }
          markFirebaseMigrationComplete();
        }
        
        // Merge: localData takes precedence, fallback to migrated data
        loadedProfiles = { ...loadedProfiles, ...localData };
        
        const current = getCurrentTaxYear();
        setTaxYear(current);
        
        if (!loadedProfiles[current]) {
          loadedProfiles[current] = DEFAULT_PROFILE(current);
        }
        
        applyProfile(loadedProfiles[current]);
        setProfiles(loadedProfiles);
        
        console.log("[BOOT: READY] Local mode initialized.");
      } catch (e) {
        console.error("[BOOT: ERROR]", e);
        // Fallback to defaults
        const current = getCurrentTaxYear();
        setTaxYear(current);
        applyProfile(DEFAULT_PROFILE(current));
      } finally {
        setIsLoaded(true);
        isBootingRef.current = false;
      }
    };
    
    initLocal();
  }, [DEFAULT_PROFILE, applyProfile]); 


  // --- Backup & Restore Handlers ---
  const handleExportBackup = async () => {
    try {
      setBackupStatus({ type: 'info', message: 'Preparing backup...' });
      const json = await exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const filename = `TaxSense_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      // Try Share API first (iOS native)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })) {
        const file = new File([blob], filename, { type: 'application/json' });
        await navigator.share({
          files: [file],
          title: 'TaxSense Backup',
          text: `TaxSense backup from ${new Date().toLocaleDateString()}`
        });
        setBackupStatus({ type: 'success', message: 'Backup shared successfully!' });
      } else {
        // Fallback download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.visibility = 'hidden';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setBackupStatus({ type: 'success', message: 'Backup downloaded successfully!' });
      }
    } catch (e) {
      console.error('Backup export failed:', e);
      setBackupStatus({ type: 'error', message: 'Backup failed: ' + (e.message || 'Unknown error') });
    }
    
    // Clear status after 4s
    setTimeout(() => setBackupStatus(null), 4000);
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setBackupStatus({ type: 'info', message: 'Reading backup file...' });
      const text = await file.text();
      const result = await importBackup(text);
      
      if (result.success) {
        setBackupStatus({ type: 'success', message: `Restored ${result.profileCount} year(s) successfully! Reloading...` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setBackupStatus({ type: 'error', message: 'Restore failed: ' + result.error });
      }
    } catch (e) {
      console.error('Backup import failed:', e);
      setBackupStatus({ type: 'error', message: 'Restore failed: Invalid file format' });
    }
    
    // Reset input
    e.target.value = '';
    setTimeout(() => setBackupStatus(null), 5000);
  };



  // Cloud save - debounced on any data change
  useEffect(() => {
  if (!isLoaded) return;

    const timeoutIdx = setTimeout(async () => {
      const activeData = {
        taxCode, baseSalary, contractedHours, pensionPercent, pensionType, holidaySupplementPercent,
        taxYear, studentLoanPlans, childBenefitCount, baseEnhancements, baseSacrifices, months,
        workMode, seData, hasCompletedTour, leaseConfig, mileageLogs, budgetConfig, budgetActuals
      };

      // Simple hash check to prevent redundant saves (and loops)
      const dataString = JSON.stringify(activeData);
      if (dataString === lastSavedHashRef.current) return;
      lastSavedHashRef.current = dataString;

      console.log(`[CLOUD_SAVE] Saving data for ${taxYear}...`);
      
      // Update local storage first (immediate feedback/backup)
      localStorage.setItem('taxSenseData_v2_Profiles', JSON.stringify({
        ...profiles,
        [taxYear]: activeData
      }));
      localStorage.setItem('taxSense_activeYear', taxYear);

      // Save to local storage
      try {
        const currentProfiles = await getProfiles('local-user');
        const updatedProfiles = {
          ...currentProfiles,
          [taxYear]: activeData
        };
        await saveProfiles(updatedProfiles, 'local-user');
        
        // Also save active tax year
        localStorage.setItem('taxSense_activeYear', taxYear);
        
        // Update profiles state without triggering loop
        setProfiles(prev => ({ ...prev, [taxYear]: activeData }));
      } catch (e) {
        console.error("[LOCAL_SAVE_ERROR]", e);
      }
    }, 2000); // 2s debounce for stability

    return () => clearTimeout(timeoutIdx);
  }, [taxCode, baseSalary, contractedHours, pensionPercent, pensionType, holidaySupplementPercent, studentLoanPlans, childBenefitCount, baseEnhancements, baseSacrifices, months, workMode, seData, hasCompletedTour, isLoaded, taxYear, leaseConfig, mileageLogs, profiles]);

  // Switch Year Handler
  const handleYearSwitch = (newYear) => {
    setTaxYear(newYear);
    const activeProf = profiles[newYear];
    applyProfile(activeProf || {});
    setSandboxMode(false);
  };


  // --- Helpers ---

  const handleNumericInput = (val, setter) => {
    if (val === '') {
      setter('');
      return;
    }
    const num = Number(val);
    if (!isNaN(num)) setter(num);
  };

  const handleDecimalInput = (val, setter) => {
    if (val === '') {
      setter('');
      return;
    }
    // Allow typing decimals in-progress (e.g. "12.", "0.5") without snapping to Number
    if (/^\d*\.?\d*$/.test(val)) {
      setter(val);
    }
  };

  // --- RevenueCat Initialization ---
  useEffect(() => {
    const initPurchases = async () => {
      await PurchaseService.initialize();
      // Identify user FIRST, then check subscription — ensures purchase is found for the right user
      await PurchaseService.identifyUser('local-user');
      const status = await PurchaseService.checkSubscriptionStatus();
      setSubscriptionTier(status);
    };
    initPurchases();
  }, []);

  const handleUpgrade = async (planIndex = 0) => {
    if (!PurchaseService.isInitialized) {
      alert('Subscription service is still loading. Please wait a moment and try again.');
      return;
    }
    const status = await PurchaseService.purchasePro(planIndex);
    setSubscriptionTier(status);
    if (status !== 'free') {
      setShowPremiumModal(false);
    }
  };

  const handleRestore = async () => {
    // Never downgrade — only upgrade if a purchase is found
    try {
      const status = await PurchaseService.restorePurchases();
      if (status && status !== 'free') {
        setSubscriptionTier(status);
        alert('Purchases restored successfully!');
      } else {
        // Don't downgrade — if user is already premium, just confirm their status
        if (isPremium) {
          alert('Your subscription is active.');
        } else {
          alert('No active subscriptions found to restore.');
        }
      }
    } catch (e) {
      console.error('Restore purchases error (ignored):', e);
    }
  };

  // --- Auth & Data Loading ---

  // 1. Recurring Base for future projection
  const futureBaseData = useMemo(() => {
    const monthlyBaseSalary = (sandboxMode && sandboxSalary !== null ? sandboxSalary : baseSalary) / 12;
    const baseEnhancementMonthly = baseEnhancements.reduce((s, e) => s + getMonthlyValue(e.amount, e.frequency), 0);
    const baseBikMonthly = baseEnhancements.filter(e => e.enhancementType === 'bik').reduce((s, e) => s + getMonthlyValue(e.amount, e.frequency), 0);
    const grossBaseSacrificeMonthly = baseSacrifices.filter(d => d.type !== 'net_sacrifice').reduce((s, d) => s + getMonthlyValue(d.amount, d.frequency), 0) + (sandboxMode && sandboxSacrifice !== null ? sandboxSacrifice / 12 : 0);
    const netBaseSacrificeMonthly = baseSacrifices.filter(d => d.type === 'net_sacrifice').reduce((s, d) => s + getMonthlyValue(d.amount, d.frequency), 0);

    const grossForPension = monthlyBaseSalary + baseEnhancements.filter(e => e.includeInPension && e.enhancementType !== 'bik').reduce((s, e) => s + getMonthlyValue(e.amount, e.frequency), 0);
    const pension = grossForPension * ((sandboxMode && sandboxPension !== null ? sandboxPension : pensionPercent) / 100);

    return {
      gross: monthlyBaseSalary + baseEnhancementMonthly + (sandboxMode && sandboxOvertime !== null ? sandboxOvertime / 12 : 0),
      bik: baseBikMonthly,
      pension: pension,
      grossSacrifice: grossBaseSacrificeMonthly,
      netSacrifice: netBaseSacrificeMonthly,
      taxFree: 0
    };
  }, [baseSalary, baseEnhancements, baseSacrifices, pensionPercent, sandboxMode, sandboxSalary, sandboxPension, sandboxOvertime, sandboxSacrifice, getMonthlyValue]);

  // 2. Prepare Actual Month Data (April to selected month)
  const monthsActualData = useMemo(() => {
    const monthlyBaseSalary = (sandboxMode && sandboxSalary !== null ? sandboxSalary : baseSalary) / 12;
    const sandboxOtMonthly = (sandboxMode && sandboxOvertime !== null ? sandboxOvertime / 12 : 0);

    return (months || []).map((m, monthIdx) => {
      if (!m) return {}; // Safety guard

      const ot15 = (m.overtime || []).filter(o => o.claimed && o.multiplier === 1.5).reduce((s, o) => s + calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier), 0);
      const ot20 = (m.overtime || []).filter(o => o.claimed && o.multiplier === 2.0).reduce((s, o) => s + calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier), 0);
      const otTotal = ot15 + ot20 + sandboxOtMonthly;

      const holidaySupplementAmount = otTotal > 0 ? (otTotal * (holidaySupplementPercent / 100)) : 0;

      const varGrossIncome = (m.income || []).reduce((s, i) => s + (Number(i.amount) || 0), 0) + (m.deductions || []).filter(d => d.type === 'income').reduce((s, d) => s + (Number(d.amount) || 0), 0) + holidaySupplementAmount;

      const baseEnhancementMonthlyTotal = (baseEnhancements || []).reduce((s, e) => s + getMonthlyValue(e.amount, e.frequency), 0);
      const baseBikMonthlyTotal = (baseEnhancements || []).filter(e => e.enhancementType === 'bik').reduce((s, e) => s + getMonthlyValue(e.amount, e.frequency), 0);
      const totalMonthlyGrossForPension = monthlyBaseSalary + (baseEnhancements || []).filter(e => e.includeInPension && e.enhancementType !== 'bik').reduce((s, e) => s + getMonthlyValue(e.amount, e.frequency), 0);
      const pension = totalMonthlyGrossForPension * ((sandboxMode && sandboxPension !== null ? sandboxPension : pensionPercent) / 100);

      const varTaxFree = (m.deductions || []).filter(d => d.type === 'tax_free').reduce((s, d) => s + (Number(d.amount) || 0), 0);

      // Map recurring items into specific lines
      const mappedEnhancements = (baseEnhancements || []).map(e => ({ name: e.name || 'Enhancement', amount: getMonthlyValue(e.amount, e.frequency), enhancementType: e.enhancementType || 'income' }));
      const mappedSacrifices = (baseSacrifices || []).map(s => ({ name: s.name || 'Sacrifice', amount: getMonthlyValue(s.amount, s.frequency), type: s.type }));

      // Add sandbox sacrifice if exists
      if (sandboxMode && sandboxSacrifice > 0) {
        mappedSacrifices.push({ name: 'Sandbox Exp.', amount: sandboxSacrifice / 12, type: 'salary_sacrifice' });
      }

      const otRows = [{ name: 'Overtime', amount: otTotal }];
      if (holidaySupplementAmount > 0) {
        otRows.push({ name: `OT Holiday Supp. (${holidaySupplementPercent}%)`, amount: holidaySupplementAmount });
      }

      return {
        month: MONTHS[monthIdx] || 'Month',
        monthIdx: monthIdx,
        gross: monthlyBaseSalary + baseEnhancementMonthlyTotal + otTotal + varGrossIncome,
        bik: baseBikMonthlyTotal,
        ot: otTotal,
        ot15,
        ot20,
        holidaySupplement: holidaySupplementAmount,
        pension: pension,
        taxFree: varTaxFree,
        incomeItems: mappedEnhancements,
        deductionItems: mappedSacrifices,
        rawMonthsActual: m
      };
    });
  }, [months, baseSalary, contractedHours, pensionPercent, baseEnhancements, baseSacrifices, holidaySupplementPercent, sandboxMode, sandboxSalary, sandboxPension, sandboxOvertime, sandboxSacrifice, getMonthlyValue]);

  // 3. Analytics & Projections Data
  const analyticsData = useMemo(() => {
    // Current trajectory (Projected Annual)
    const options = {
      taxYear,
      studentLoanPlans,
      childBenefitCount,
      pensionIsSS: pensionType === 'salary_sacrifice'
    };

    const currentProjected = projectAnnual(monthsActualData, futureBaseData, selectedMonthIdx, taxCode, options);

    // --- SE Integration ---
    let seProfitAmt = 0;
    let seSABill = 0;
    let totalMiles = 0;
    let totalSEInvoicedIncome = 0;
    let totalSEExpenses = 0;
    let seSipp = sandboxMode ? (sandboxSipp || 0) : 0;
    let seGiftAid = sandboxMode ? (sandboxGiftAid || 0) : 0;

    if (workMode !== 'paye' || sandboxMode) {
      if (sandboxMode && sandboxSEProfit !== null) {
        seProfitAmt = sandboxSEProfit;
      } else {
        seData.months.forEach(m => {
          (m.invoices || []).forEach(inv => { if (inv.paid) totalSEInvoicedIncome += Number(inv.amount || 0); });
          (m.expenses || []).forEach(exp => { totalSEExpenses += Number(exp.amount || 0); });
          (m.mileage || []).forEach(ml => { totalMiles += Number(ml.miles || 0); });
        });

        const mileageCalc = calculateMileageAllowance(totalMiles, taxYear);
        const profitCalc = calculateSEProfit({
          grossIncome: totalSEInvoicedIncome,
          totalExpenses: totalSEExpenses,
          mileageAllowance: mileageCalc.totalAllowance,
          useTradingAllowance: sandboxMode ? sandboxSEAllowance : seData.useTradingAllowance,
          taxYear
        });
        seProfitAmt = profitCalc.profit;
      }

      const sa = calculateSelfAssessment({
        payeANI: currentProjected.taxableIncome,
        payeIncomeTaxPaid: currentProjected.incomeTax,
        seProfit: seProfitAmt,
        taxCode,
        taxYear,
        sipp: seSipp,
        giftAid: seGiftAid,
        studentLoanPlans,
        payeStudentLoanPaid: currentProjected.studentLoan
      });
      seSABill = sa.totalSABill;
    }

    // --- Marginal Savings Calculation ---
    const baselineOptions = { ...options, pensionIsSS: false, omitAllSacrifice: true };
    const baselineProjected = projectAnnual(monthsActualData, futureBaseData, selectedMonthIdx, taxCode, baselineOptions);

    const ssTaxSaved = Math.max(0, baselineProjected.incomeTax - currentProjected.incomeTax);
    const ssNiSaved = Math.max(0, baselineProjected.ni - currentProjected.ni);
    const sacrificeItemsSavings = ssTaxSaved + ssNiSaved;
    
    // Itemized Sacrifices for Breakdown Dropdown
    const itemizedSacrifices = [];
    if (pensionType === 'salary_sacrifice' && currentProjected.pensionContribution > 0) {
      itemizedSacrifices.push({ name: 'Pension (SalSac)', amount: currentProjected.pensionContribution });
    }
    baseSacrifices.filter(s => s.type !== 'net_sacrifice').forEach(s => {
      itemizedSacrifices.push({ 
        name: s.name || 'Salary Sacrifice', 
        amount: Number(s.amount) * (s.frequency === 'monthly' ? 12 : 1) 
      });
    });
    // Add sandbox sacrifice if active
    if (sandboxMode && sandboxSacrifice > 0) {
      itemizedSacrifices.push({ name: 'Sandbox Adjustment', amount: sandboxSacrifice });
    }
    
    // Tax Trap Logic
    const isInTaxTrap = currentProjected.taxableIncome > 100000;
    const restoredAllowance = isInTaxTrap ? Math.min(12570, (baselineProjected.taxableIncome - currentProjected.taxableIncome) / 2) : 0;

    // Monthly Timeline (Cumulative UK Tax Logic)
    let ytdGross = 0;
    let ytdPension = 0;
    let ytdTaxPaid = 0;

    const timeline = monthsActualData.map((m, i) => {
      const currentTaxCode = m.rawMonthsActual.taxCodeOverride || taxCode;

      // Calculate non-cumulative items (NI, SL, HICBC) on purely this month's pay
      const monthResult = calculateTax(m.gross * 12, m.pension * 12, 0, currentTaxCode, 0, options);

      // Calculate cumulative Income Tax
      ytdGross += m.gross;
      ytdPension += m.pension;

      const annualizedYtdGross = (ytdGross / (i + 1)) * 12;
      const annualizedYtdPension = (ytdPension / (i + 1)) * 12;

      const ytdResults = calculateTax(annualizedYtdGross, annualizedYtdPension, 0, currentTaxCode, 0, options);

      // Target YTD tax: total tax due on annualized YTD, divided by 12, multiplied by months elapsed
      const targetYtdTax = (ytdResults.incomeTax / 12) * (i + 1);

      // Tax to pay THIS month is the difference between target YTD tax and what we've already paid
      const taxThisMonth = targetYtdTax - ytdTaxPaid;
      ytdTaxPaid += taxThisMonth;

      const nonCumulativeTax = monthResult.incomeTax / 12;
      const accurateNet = (monthResult.annualTakeHome / 12) + nonCumulativeTax - taxThisMonth + m.taxFree;

      return {
        name: m.month.substring(0, 3),
        gross: m.gross,
        net: accurateNet,
        tax: taxThisMonth,
        ni: monthResult.ni / 12,
        sl: monthResult.studentLoan / 12,
        hicbc: monthResult.hicbc / 12,
        ot: m.ot,
        pension: m.pension,
        taxFree: m.taxFree
      };
    });

    // Universal Insights & Tax Pot
    const recommendedCode = calculateStandardTaxCode(currentProjected.taxableIncome);
    const recommendedResults = calculateTax(currentProjected.gross, currentProjected.pensionContribution, currentProjected.salarySacrifice, recommendedCode, currentProjected.netDeductions, options);
    const payeUnderpayment = Math.max(0, recommendedResults.incomeTax - currentProjected.incomeTax);

    // Tax Pot Calculation (Monthly Set Aside)
    // 1. SE Tax + NI
    const seMonthlyTaxPot = seSABill / 12;
    // 2. PAYE Underpayment (Spread over remaining months or full year)
    const monthsRemaining = 12 - (selectedMonthIdx + 1);
    const payeMonthlyShortfall = payeUnderpayment / (monthsRemaining > 0 ? monthsRemaining : 12);

    const totalMonthlyTaxPot = Math.max(0, seMonthlyTaxPot + payeMonthlyShortfall);

    // Marriage Allowance
    // isMarriageAllowanceLikely removed as it was unused and causing lint errors

    const isKCode = taxCode.toUpperCase().trim().startsWith('K');
    const isCodeMismatch = !isKCode && taxCode.toUpperCase().trim() !== recommendedCode.toUpperCase().trim();

    // Final result adjustments for SE-only mode
    const finalProjections = { ...currentProjected };
    if (workMode === 'se') {
      finalProjections.gross = 0;
      finalProjections.taxableIncome = 0;
      finalProjections.incomeTax = 0;
      finalProjections.ni = 0;
      finalProjections.studentLoan = 0;
      finalProjections.pensionContribution = 0;
    }

    return {
      version: '1.2.2',
      timeline: workMode === 'se' ? [] : timeline,
      projections: finalProjections,
      seProfit: seProfitAmt,
      seSABill,
      seSipp,
      seGiftAid,
      totalTaxNI: currentProjected.totalTaxNI + seSABill,
      totalTakeHome: currentProjected.finalTakeHome + seProfitAmt - seSABill,
      totalBik: currentProjected.totalBik || 0,
      sacrificeItemsSavings,
      payeUnderpayment,
      totalMonthlyTaxPot,
      isMarriageAllowanceLikely: (currentProjected.gross + seProfitAmt) > 12570 && (currentProjected.gross + seProfitAmt) < 50270,
      isCodeMismatch,
      isKCode,
      recommendedCode,
      ssTaxSaved,
      ssNiSaved,
      restoredAllowance,
      isInTaxTrap,
      itemizedSacrifices,
      savings: {
        tax: ssTaxSaved,
        ni: ssNiSaved,
        total: ssTaxSaved + ssNiSaved
      },
      mileage: (() => {
        if (!leaseConfig.startDate || !leaseConfig.totalAllowedMiles) return { isConfigured: false };
        const start = new Date(leaseConfig.startDate);
        if (isNaN(start.getTime())) return { isConfigured: false };
        
        const now = new Date();
        const totalDays = Math.max(1, leaseConfig.termMonths * 30.44);
        const daysElapsed = Math.max(1, Math.round((now - start) / (1000 * 60 * 60 * 24))); 
        const targetMileage = Math.round((leaseConfig.totalAllowedMiles / totalDays) * daysElapsed);
        
        const sortedLogs = [...mileageLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
        const latestLog = sortedLogs[sortedLogs.length - 1];
        const actualMileage = latestLog ? Number(latestLog.reading) : 0;
        const projectedMiles = Math.round((actualMileage / daysElapsed) * totalDays);
        
        const chartData = [];
        for (let i = 0; i <= leaseConfig.termMonths; i++) {
          const monthPoints = i * 30.44;
          const planned = (leaseConfig.totalAllowedMiles / totalDays) * monthPoints;
          
          const logAtMonth = [...sortedLogs].reverse().find(l => {
            const logDays = (new Date(l.date) - start) / (1000 * 60 * 60 * 24);
            return logDays <= monthPoints;
          });

          chartData.push({
            month: `M${i}`,
            planned: Math.round(planned),
            actual: logAtMonth ? Number(logAtMonth.reading) : (i === 0 ? 0 : null)
          });
        }

        return {
          isConfigured: true,
          daysElapsed,
          targetMileage,
          actualMileage,
          projection: projectedMiles,
          chartData
        };
      })()
    };
  }, [monthsActualData, futureBaseData, selectedMonthIdx, taxCode, taxYear, studentLoanPlans, childBenefitCount, pensionType, seData, workMode, sandboxMode, sandboxSEProfit, sandboxSEAllowance, sandboxSipp, sandboxGiftAid, mileageLogs, leaseConfig, baseSacrifices, sandboxSacrifice]);

  // Analytics Tab Component


  // 3. Projections
  const projection = projectAnnual(monthsActualData, futureBaseData, selectedMonthIdx, taxCode, {
    taxYear,
    studentLoanPlans,
    childBenefitCount,
    pensionIsSS: pensionType === 'salary_sacrifice'
  });

  // 4. Current Selected Month Summary Logic
  const currentMonthFull = monthsActualData[selectedMonthIdx];
  const monthlyGross = currentMonthFull.gross;
  const monthlyPension = currentMonthFull.pension;
  const monthlyGrossSacrifice = currentMonthFull.deductionItems.filter(d => d.type === 'salary_sacrifice').reduce((s, i) => s + Number(i.amount || 0), 0) + currentMonthFull.rawMonthsActual.deductions.filter(d => d.type === 'salary_sacrifice').reduce((s, i) => s + Number(i.amount || 0), 0);
  const monthlyNetSacrifice = currentMonthFull.deductionItems.filter(d => d.type === 'net_sacrifice').reduce((s, i) => s + Number(i.amount || 0), 0) + currentMonthFull.rawMonthsActual.deductions.filter(d => d.type === 'net_sacrifice').reduce((s, i) => s + Number(i.amount || 0), 0);

  const monthlyBik = currentMonthFull.bik || 0;
  const monthlyTaxableIncome = (monthlyGross + monthlyBik) - monthlyPension - monthlyGrossSacrifice;
  // Tax is calculated on FULL gross (including BiK) — HMRC taxes the benefit
  const monthlyResultsAnnualized = calculateTax(
    monthlyGross * 12,
    monthlyPension * 12,
    monthlyGrossSacrifice * 12,
    taxCode,
    monthlyNetSacrifice * 12,
    { taxYear, studentLoanPlans, childBenefitCount, pensionIsSS: pensionType === 'salary_sacrifice' }
  );
  // For net pay: employee never receives BiK money, so take-home = (gross - BiK) minus tax
  // Tax is still on full gross, so we need (gross - BiK) - tax - NI - etc
  // Which equals: takeHome_on_full_gross - BiK
  // But takeHome_on_full_gross includes BiK minus extra_tax, so:
  // net = (takeHome_full_gross/12) - monthlyBik is WRONG (over-subtracts)
  // Correct: net = ((gross-BiK)*12 - tax - NI - etc) / 12 + taxFree
  // Simplest: recalculate tax on (gross-BiK) for take-home, display tax from full gross
  const monthlyResultsMinusBik = monthlyBik > 0 ? calculateTax(
    (monthlyGross - monthlyBik) * 12,
    monthlyPension * 12,
    monthlyGrossSacrifice * 12,
    taxCode,
    monthlyNetSacrifice * 12,
    { taxYear, studentLoanPlans, childBenefitCount, pensionIsSS: pensionType === 'salary_sacrifice' }
  ) : null;
  // v15.0: Cumulative PAYE Tax Calculation for Monthly Summary
  // Uses proper UK cumulative tax: tax on YTD income minus tax already paid
  const cumulativeTax = (() => {
    if (!monthsActualData || monthsActualData.length === 0) return null;
    
    // Build cumulative months data for calculateCumulativeTax
    const cumMonths = monthsActualData.map((m, i) => {
      const monthSS = m.deductionItems.filter(d => d.type === 'salary_sacrifice').reduce((s, item) => s + Number(item.amount || 0), 0) + m.rawMonthsActual.deductions.filter(d => d.type === 'salary_sacrifice').reduce((s, item) => s + Number(item.amount || 0), 0);
      const monthNet = m.deductionItems.filter(d => d.type === 'net_sacrifice').reduce((s, item) => s + Number(item.amount || 0), 0) + m.rawMonthsActual.deductions.filter(d => d.type === 'net_sacrifice').reduce((s, item) => s + Number(item.amount || 0), 0);
      return {
        gross: m.gross + (m.bik || 0), // BiK is a separate taxable benefit added on top of gross
        pension: m.pension,
        salarySacrifice: monthSS,
        netDeductions: monthNet,
        taxFree: m.taxFree,
        bik: m.bik || 0
      };
    });
    
    return calculateCumulativeTax(cumMonths, taxCode, {
      taxYear,
      studentLoanPlans,
      childBenefitCount,
      pensionIsSS: pensionType === 'salary_sacrifice'
    }, selectedMonthIdx);
  })();
  
  // Use cumulative tax for summary display if available
  const monthlyIncomeTax = cumulativeTax ? cumulativeTax.currentMonth.incomeTax : (monthlyResultsAnnualized.incomeTax / 12);
  const monthlyNI = cumulativeTax ? cumulativeTax.currentMonth.ni : (monthlyResultsAnnualized.ni / 12);
  const monthlyStudentLoan = cumulativeTax ? cumulativeTax.currentMonth.studentLoan : (monthlyResultsAnnualized.studentLoan / 12);
  const monthlyHICBC = cumulativeTax ? cumulativeTax.currentMonth.hicbc : (monthlyResultsAnnualized.hicbc / 12);
  
  // Use cumulative net pay when available (v15.0: proper UK cumulative PAYE)
  const totalMonthlyNet = cumulativeTax
    ? cumulativeTax.currentMonth.netPay
    : (monthlyBik > 0
      ? monthlyResultsMinusBik.annualTakeHome / 12
      : monthlyResultsAnnualized.annualTakeHome / 12
    ) + currentMonthFull.taxFree;
  // Legacy reference (same as totalMonthlyNet when no cumulative data)
  const totalMonthlyNetCumulative = totalMonthlyNet;

  // Deduction breakdown for UI display
  const totalPreTax = monthlyGrossSacrifice + (pensionType === 'salary_sacrifice' ? monthlyPension : 0);
  const totalStatutory = monthlyIncomeTax + monthlyNI + monthlyStudentLoan + monthlyHICBC + (pensionType !== 'salary_sacrifice' ? monthlyPension : 0);
  const totalPostTax = monthlyNetSacrifice;

  /* const chartData = [
    { name: 'Net Pay', value: monthlyResultsAnnualized.annualTakeHome / 12, color: 'var(--success)' },
    { name: 'Income Tax', value: monthlyResultsAnnualized.incomeTax / 12, color: 'var(--error)' },
    { name: 'NI', value: monthlyResultsAnnualized.ni / 12, color: '#f59e0b' },
    { name: 'Student Loan', value: monthlyResultsAnnualized.studentLoan / 12, color: '#06b6d4' },
    { name: 'Pension', value: monthlyResultsAnnualized.pensionContribution / 12, color: 'var(--primary)' },
    { name: 'Other', value: monthlyResultsAnnualized.hicbc / 12 + monthlyResultsAnnualized.netDeductions / 12, color: '#6b7280' }
  ].filter(i => i.value > 0); */

  // Overtime Processing
  const allOvertime = useMemo(() => {
    return months.flatMap((m, idx) => m.overtime.map(o => ({ ...o, monthIdx: idx, monthName: MONTHS[idx] })));
  }, [months]);

  const ytdOTTotal = allOvertime.reduce((acc, o) => acc + calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier), 0);

  // Marginal rate on overtime (additional income tax + NI based on tax band & tax code)
  const marginalOTRate = useMemo(() => {
    const ani = projection.taxableIncome || 0;
    const otAmt = ytdOTTotal || 0;
    if (otAmt <= 0) return 0;

    const cleanCode = (taxCode || '1257L').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

    // Special fixed-rate codes
    if (cleanCode === 'NT') return 0;             // No tax
    if (cleanCode.startsWith('D1')) return 0.45 + 0.02;  // Additional rate
    if (cleanCode.startsWith('D0')) return 0.40 + 0.02;  // Higher rate
    if (cleanCode.startsWith('BR')) return 0.20 + 0.08;  // All at basic rate (assume basic NI)

    // Determine effective personal allowance from tax code
    let effectivePA = 12570; // default 1257L
    if (cleanCode.startsWith('0T')) effectivePA = 0;
    else if (cleanCode.startsWith('K')) {
      // K code: negative allowance — adds income
      const kMatch = cleanCode.match(/-?(\d+)/);
      const kVal = kMatch ? parseInt(kMatch[1]) * 10 : 0;
      effectivePA = -kVal;
    } else {
      const codeMatch = cleanCode.match(/-?(\d+)/);
      if (codeMatch) effectivePA = parseInt(codeMatch[1]) * 10;
    }

    // Effective ANI for marginal rate = actual ANI + effect of code (negative PA = more taxable)
    // If PA is negative (K code), the effective income is ANI + |PA|
    // If PA is reduced, the effective income is shifted accordingly
    const paShortfall = Math.max(0, 12570 - effectivePA);
    const effectiveAni = ani + paShortfall;

    // NI rate — based on total income (including overtime)
    const totalForNI = ani + otAmt;
    const niRate = totalForNI <= 50270 ? 0.08 : (ani < 50270 ? 0.08 : 0.02);

    // Determine IT rate based on effective ANI
    if (effectiveAni > 125140) return 0.45 + niRate;               // Additional rate
    if (effectiveAni > 100000) return 0.60 + niRate;               // 60% trap (PA tapering)
    if (effectiveAni > 50270) return 0.40 + niRate;                // Higher rate
    if (effectiveAni <= effectivePA) return 0;                     // Below personal allowance
    return 0.20 + niRate;                                          // Basic rate
  }, [projection, ytdOTTotal, taxCode]);

  const ytdOTNet = ytdOTTotal * (1 - marginalOTRate);
  const unclaimedOTNet = allOvertime.filter(o => !o.claimed)
    .reduce((s, o) => s + calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier), 0) * (1 - marginalOTRate);

  const filteredOT = allOvertime.filter(o => {
    if (otFilterClaimed === 'claimed' && !o.claimed) return false;
    if (otFilterClaimed === 'unclaimed' && o.claimed) return false;
    if (otFilterMonth !== 'all' && Number(otFilterMonth) !== o.monthIdx) return false;
    return true;
  }).sort((a, b) => {
    if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
    return new Date(a.date) - new Date(b.date);
  });

  // Tax Insights (Using analyticsData.recommendedCode now)
  const trapAdvice = getTaxTrapSummary(projection.taxableIncome, pensionPercent, baseSalary, taxCode);



  // --- Handlers ---






  const removeBaseItem = (type, id) => {
    if (type === 'enhancement') setBaseEnhancements(baseEnhancements.filter(i => i.id !== id));
    else setBaseSacrifices(baseSacrifices.filter(i => i.id !== id));
  };

  const handleCopyTaxYearData = async (sourceYear, targetYear) => {
    const confirmMessage = `Are you sure you want to copy all settings and monthly data FROM ${sourceYear} TO ${targetYear}? This will overwrite existing data for ${targetYear}.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const allProfiles = await getProfiles('local-user');
      const sourceProfileData = allProfiles[sourceYear];

      if (!sourceProfileData) {
        alert(`No data found for the tax year ${sourceYear}. Make sure you have entered some data for that year first.`);
        return;
      }

      // Copy the source profile into the target year, keeping the taxYear field correct
      const updatedProfiles = {
        ...allProfiles,
        [targetYear]: {
          ...sourceProfileData,
          taxYear: targetYear // Ensure the target profile knows what year it belongs to
        }
      };

      await saveProfiles(updatedProfiles, 'local-user');
      alert(`Successfully copied data from ${sourceYear} to ${targetYear}. Page will now reload.`);
      window.location.reload();
    } catch (err) {
      console.error('Error copying tax year data:', err);
      alert('Failed to copy data. Check console for details.');
    }
  };

  const addMonthItem = (monthIdx, type) => {
    if (!isPremium) {
      if (type === 'overtime' && months[monthIdx].overtime.length >= 2) {
        alert("Free Version Limit: Up to 2 overtime entries per month. Upgrade to TaxSense Pro for unlimited logging.");
        setShowPremiumModal(true);
        return;
      }
      if (type === 'income' && months[monthIdx].income.length >= 2) {
        alert("Free Version Limit: Up to 2 additional income items. Upgrade to TaxSense Pro for more.");
        setShowPremiumModal(true);
        return;
      }
    }
    const n = [...months];
    const newItem = type === 'overtime'
      ? { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], reason: '', hours: '', multiplier: 1.5, claimed: false }
      : { id: Date.now().toString(), name: 'Item', amount: '', type: type === 'deductions' ? 'salary_sacrifice' : 'other' };
    n[monthIdx][type].push(newItem);
    setMonths(n);
  };

  const updateMonthItem = (monthIdx, type, id, field, val) => {
    const n = [...months];
    n[monthIdx][type] = n[monthIdx][type].map(i => i.id === id ? { ...i, [field]: val } : i);
    setMonths(n);
  };

  const removeMonthItem = (monthIdx, type, id) => {
    const n = [...months];
    n[monthIdx][type] = n[monthIdx][type].filter(i => i.id !== id);
    setMonths(n);
  };





  const exportToCSV = async () => {
    // 1. Monthly Summary Section
    const summaryHeaders = ['Month', 'Gross Income', 'Pension', 'Salary Sacrifice', 'Tax Free Expenses', 'Net Pay', 'Income Tax', 'NI', 'Student Loan'];
    const summaryRows = monthsActualData.map((m, i) => {
      const timelineMonth = analyticsData.timeline[i] || {};
      return [
        MONTHS[i],
        m.gross.toFixed(2),
        m.pension.toFixed(2),
        (m.deductionItems.filter(d => d.type === 'salary_sacrifice').reduce((s, item) => s + Number(item.amount || 0), 0) + m.rawMonthsActual.deductions.filter(d => d.type === 'salary_sacrifice').reduce((s, item) => s + Number(item.amount || 0), 0)).toFixed(2),
        m.taxFree.toFixed(2),
        (timelineMonth.net || 0).toFixed(2),
        (timelineMonth.tax || 0).toFixed(2),
        (timelineMonth.ni || 0).toFixed(2),
        (timelineMonth.sl || 0).toFixed(2)
      ];
    });

    // 2. Itemized Overtime Section
    const otTitle = ['ITEMIZED OVERTIME ENTRIES', '', '', '', '', '', '', '', ''];
    const otColumnNames = ['Date', 'Month Paid', 'Hours', 'Multiplier', 'Amount (£)', 'Reason', 'Claimed', '', ''];
    
    const otRows = [];
    months.forEach((m, mIdx) => {
      (m.overtime || []).forEach(o => {
        const amt = calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier);
        otRows.push([
          o.date || '-',
          MONTHS[mIdx],
          o.hours,
          `${o.multiplier}x`,
          amt.toFixed(2),
          o.reason || '-',
          o.claimed ? 'YES' : 'NO',
          '',
          ''
        ]);
      });
    });

    const csvContent = [
      ['MONTHLY SUMMARY REPORT', '', '', '', '', '', '', '', ''],
      summaryHeaders,
      ...summaryRows,
      ['', '', '', '', '', '', '', '', ''],
      otTitle,
      otColumnNames,
      ...otRows
    ].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");

    const filename = `TaxSense_EOY_Export_${taxYear.replace('/', '-')}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Try Share API first (Native Mobile/iOS)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'text/csv' })] })) {
      try {
        const file = new File([blob], filename, { type: 'text/csv' });
        await navigator.share({
          files: [file],
          title: 'TaxSense Export',
          text: `End of Year Export for ${taxYear}`
        });
        return;
      } catch (err) {
        console.log("Share failed, falling back to download", err);
      }
    }

    // Fallback to Download
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportUnclaimedOT = async () => {
    const headers = ['Month', 'Date', 'Reason', 'Hours', 'Multiplier', 'Estimated Value (£)'];
    const unclaimed = allOvertime.filter(o => !o.claimed);

    const rows = unclaimed.map(o => {
      return [o.monthName, o.date, `"${o.reason}"`, o.hours, o.multiplier, calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier).toFixed(2)];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const filename = `TaxSense_Unclaimed_OT_${taxYear.replace('/', '-')}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Try Share API first (Native Mobile)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'text/csv' })] })) {
      try {
        const file = new File([blob], filename, { type: 'text/csv' });
        await navigator.share({
          files: [file],
          title: 'TaxSense OT Export',
          text: `Unclaimed Overtime Export for ${taxYear}`
        });
        return;
      } catch (err) {
        console.log("Share failed, falling back to download", err);
      }
    }

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Show loading spinner while data loads
  if (!isLoaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at top, #1a1f3e 0%, #0a0d1a 100%)', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '300px' }}>
          <div style={{ width: '2rem', height: '2rem', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' }} />
          <p style={{ color: 'var(--text-main)', opacity: 0.8, fontSize: '0.8rem', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>PREPARING YOUR DASHBOARD</p>
          <p style={{ color: 'var(--text-main)', opacity: 0.4, fontSize: '0.65rem', marginTop: '0.25rem' }}>Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {false && (
        <SetupWizard
          workMode={workMode} setWorkMode={setWorkMode}
          baseSalary={baseSalary} setBaseSalary={setBaseSalary}
          contractedHours={contractedHours} setContractedHours={setContractedHours}
          taxCode={taxCode} setTaxCode={setTaxCode}
          taxYear={taxYear} setTaxYear={setTaxYear}
          studentLoanPlans={studentLoanPlans} setStudentLoanPlans={setStudentLoanPlans}
          pensionPercent={pensionPercent} setPensionPercent={setPensionPercent}
          pensionType={pensionType} setPensionType={setPensionType}
          childBenefitCount={childBenefitCount} setChildBenefitCount={setChildBenefitCount}
          setHasCompletedTour={setHasCompletedTour}
        />
      )}
    <div className="app-container">
      <header style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '1rem', paddingTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
          <Landmark size={32} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))' }} />
          <h1 style={{
            margin: 0,
            fontSize: '2rem',
            background: 'var(--primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
            fontWeight: 800
          }}>
            TaxSense
            {isPremium && <span style={{ marginLeft: '0.6rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', WebkitTextFillColor: 'white', fontSize: '0.6rem', padding: '0.15rem 0.5rem', borderRadius: '2rem', verticalAlign: 'middle', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)' }}>Pro</span>}
          </h1>
        </div>

        <button
          onClick={() => {
            if (!sandboxMode) {
              setSandboxSalary(baseSalary);
              setSandboxPension(pensionPercent);
              // Initialize SE sandbox values
              if (workMode !== 'paye') {
                setSandboxSEProfit(analyticsData.seProfit);
                setSandboxSEAllowance(seData.useTradingAllowance);
              }
              setSandboxSipp(0);
              setSandboxGiftAid(0);
              // Capture baseline net pay for comparison
              setSandboxBaselineNet(analyticsData.totalTakeHome);
            } else {
              setSandboxBaselineNet(null);
            }
            setSandboxMode(!sandboxMode);
          }}
          className={`btn-primary ${sandboxMode ? 'active' : ''}`}
          style={{
            width: '100%',
            background: sandboxMode ? 'var(--primary)' : 'var(--glass-bg)',
            color: sandboxMode ? 'white' : 'var(--text-main)',
            border: sandboxMode ? 'none' : '1px solid var(--glass-border)',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1rem',
            boxShadow: sandboxMode ? '0 0 15px rgba(99, 102, 241, 0.3)' : 'none'
          }}
        >
          <Calculator size={20} />
          <span>{sandboxMode ? 'Exit What-If Scenario Mode' : 'Enter What-If Sandbox'}</span>
        </button>
      </header>



      {sandboxMode && (
        <div className="glass-card" style={{ border: '2px dashed var(--primary)', marginBottom: '2rem', background: 'rgba(99, 102, 241, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} /> What-If Scenario Mode
            </h3>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Experimental: Changes here won't save to your main data.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Landmark size={14} /> Hypothetical Salary (£)</label>
              <input
                type="range" min={Math.max(0, baseSalary - 20000)} max={baseSalary + 50000} step={500}
                value={sandboxSalary !== null ? sandboxSalary : baseSalary}
                onChange={(e) => setSandboxSalary(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
              <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '0.4rem' }}>£{(sandboxSalary !== null ? sandboxSalary : baseSalary).toLocaleString()}</div>
            </div>
            <div>
              <label className="stat-label">Hypothetical Pension %</label>
              <input
                type="range" min={0} max={50} step={1}
                value={sandboxPension !== null ? sandboxPension : pensionPercent}
                onChange={(e) => setSandboxPension(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
              <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '0.4rem' }}>{sandboxPension !== null ? sandboxPension : pensionPercent}%</div>
            </div>
            {workMode !== 'paye' && (
              <>
                <div>
                  <label className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Briefcase size={14} /> Hypothetical SE Profit (£)</label>
                  <input
                    type="range" min={0} max={100000} step={1000}
                    value={sandboxSEProfit !== null ? sandboxSEProfit : 0}
                    onChange={(e) => setSandboxSEProfit(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '0.4rem' }}>£{(sandboxSEProfit !== null ? sandboxSEProfit : 0).toLocaleString()}</div>
                </div>
                <div>
                  <label className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ShieldCheck size={14} /> Hypothetical SIPP (£)</label>
                  <input
                    type="range" min={0} max={40000} step={500}
                    value={sandboxSipp !== null ? sandboxSipp : 0}
                    onChange={(e) => setSandboxSipp(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '0.4rem' }}>£{(sandboxSipp !== null ? sandboxSipp : 0).toLocaleString()}</div>
                </div>
              </>
            )}
            <div>
              <label className="stat-label">Extra Overtime (Annual £)</label>
              <input
                type="range" min={0} max={20000} step={500}
                value={sandboxOvertime !== null ? sandboxOvertime : 0}
                onChange={(e) => setSandboxOvertime(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
              <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '0.4rem' }}>£{(sandboxOvertime !== null ? sandboxOvertime : 0).toLocaleString()}</div>
            </div>
            <div>
              <label className="stat-label">Extra Sacrifice (Annual £)</label>
              <input
                type="range" min={0} max={20000} step={500}
                value={sandboxSacrifice !== null ? sandboxSacrifice : 0}
                onChange={(e) => setSandboxSacrifice(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
              <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '0.4rem' }}>£{(sandboxSacrifice !== null ? sandboxSacrifice : 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Comparison Row */}
          {sandboxBaselineNet !== null && (
            <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Original Net</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>£{sandboxBaselineNet.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <div style={{ fontSize: '1.5rem', opacity: 0.2 }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Hypothetical Net</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--primary)' }}>£{analyticsData.totalTakeHome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <div style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '2rem',
                background: (analyticsData.totalTakeHome - sandboxBaselineNet) >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: (analyticsData.totalTakeHome - sandboxBaselineNet) >= 0 ? '#10b981' : '#f43f5e',
                fontWeight: 800,
                fontSize: '1rem',
                border: '1px solid currentColor',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {(analyticsData.totalTakeHome - sandboxBaselineNet) >= 0 ? '+' : ''}£{(analyticsData.totalTakeHome - sandboxBaselineNet).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Diff
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.8rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#f87171', textAlign: 'center' }}>
              <Info size={14} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
              Sandbox changes are for simulation only and cannot be applied to your main data to prevent accidental overwriting.
            </p>
          </div>
        </div>
      )}

      {trapAdvice.active && (
        <div className="glass-card" style={{ border: '2px solid var(--primary)', marginBottom: '2rem', background: 'var(--glass-bg)' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1rem' }}>
                <TrendingUp color="var(--primary)" />
                <strong>Contribution Illustrator (ANI-Reduction)</strong>
              </div>
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{trapAdvice.message}</p>
              <div style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span>Excess to Sacrifice:</span>
                  <strong style={{ color: 'var(--primary)' }}>£{trapAdvice.excessAmount.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span>Personal Allowance Lost:</span>
                  <strong style={{ color: 'var(--error)' }}>£{trapAdvice.allowanceLost.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Potential Tax Saving:</span>
                  <strong style={{ color: 'var(--success)' }}>£{trapAdvice.potentialSaving.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div style={{ flex: '2 1 400px' }}>
              <div className="stat-label">Illustrative Strategies:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', marginTop: '0.5rem' }}>
                {trapAdvice.options.map(opt => (
                  <div key={opt.label} style={{
                    background: opt.highlight ? 'rgba(248, 113, 113, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: opt.highlight ? '1px solid var(--error)' : '1px solid var(--glass-border)',
                    padding: '0.75rem',
                    borderRadius: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: opt.highlight ? 'var(--error)' : 'var(--primary)', marginBottom: '0.25rem' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{opt.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main style={{ paddingBottom: '5rem' }}>
        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Universal Advisor Card - Conditional based on mismatch/underpayment OR SE income OR Personal Allowance Trap */}
            {(analyticsData.isCodeMismatch || analyticsData.isKCode || analyticsData.payeUnderpayment > 50 || analyticsData.seSABill > 0 || (analyticsData.projections.taxableIncome + analyticsData.seProfit > 100000)) && (
              <div className="glass-card" id="tour-advisor" style={{ gridColumn: '1 / -1', border: '1px solid var(--primary)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0) 100%)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: (analyticsData.isCodeMismatch || analyticsData.isKCode || analyticsData.payeUnderpayment > 50 || analyticsData.seSABill > 0 || (analyticsData.projections.taxableIncome + analyticsData.seProfit > 100000)) ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: '2rem' }}>
                  {/* Tax Pot Advisor - Only if mismatch/K-code/underpayment OR SE income */}
                  {(analyticsData.isCodeMismatch || analyticsData.isKCode || analyticsData.payeUnderpayment > 50 || analyticsData.seSABill > 0) && (
                    <div>
                      <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--primary)' }}>
                        <ShieldCheck size={20} /> Smart Tax Pot Projection
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>Monthly Set-Aside</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)' }}>£{analyticsData.totalMonthlyTaxPot.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                          <div style={{ marginBottom: '0.25rem' }}>Safe-to-Spend: <span style={{ color: 'var(--success)', fontWeight: 600 }}>£{(totalMonthlyNet + (analyticsData.seProfit / 12) - analyticsData.totalMonthlyTaxPot).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> /mo</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Covers SE tax & PAYE shortfalls</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ borderLeft: (analyticsData.isCodeMismatch || analyticsData.isKCode || analyticsData.payeUnderpayment > 50 || analyticsData.seSABill > 0) ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingLeft: (analyticsData.isCodeMismatch || analyticsData.isKCode || analyticsData.payeUnderpayment > 50 || analyticsData.seSABill > 0) ? '1rem' : '0' }}>
                    <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--primary)' }}>
                      <AlertTriangle size={20} /> Tax Insights
                    </h3>
                    {analyticsData.isKCode ? (
                      <div>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#f59e0b' }}>
                          ℹ️ <strong>K Tax Code Detected</strong>: Your code <strong>{taxCode}</strong> means HMRC has <strong>reduced your tax-free allowance</strong> because you owe tax from a previous year or benefit in kind. This is <strong>not an error</strong> — do not change to a standard code without checking with HMRC first.
                        </p>
                        <p style={{ margin: '0', fontSize: '0.75rem', opacity: 0.7 }}>
                          K codes add unpaid tax to your income rather than giving you an allowance. Your take-home will be lower because HMRC is collecting what you owe through PAYE. The calculation above accounts for this correctly.
                        </p>
                      </div>
                    ) : analyticsData.payeUnderpayment > 50 || analyticsData.isCodeMismatch ? (
                      <div>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--error)' }}>
                          ⚠️ <strong>Tax Code Variance</strong>: Your code <strong>{taxCode}</strong> {analyticsData.isCodeMismatch ? `differs from standard ${analyticsData.recommendedCode}` : `is mathematically under-taxing you by ~£${analyticsData.payeUnderpayment.toLocaleString()} per year`}.
                        </p>
                      </div>
                    ) : null}
                    {analyticsData.projections.taxableIncome + analyticsData.seProfit > 100000 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.4rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        ⚠️ <strong>Personal Allowance Trap</strong>: Consider SIPP/Sacrifice to restore your allowance.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="glass-card" id="tour-summary">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Monthly Summary</h2>
                <select className="input-field" style={{ width: 'auto', fontSize: '1.2rem' }} value={selectedMonthIdx} onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </div>

              {/* INCOME LINES */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.45, textTransform: 'uppercase', marginBottom: '0.6rem' }}>Payments</div>
                {currentMonthFull.incomeItems.filter(i => Number(i.amount) !== 0).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: 0.75 }}>{item.name}{item.enhancementType === 'bik' ? <span style={{ marginLeft: '0.4rem', fontSize: '0.6rem', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: 600 }}>BiK</span> : null}</span>
                    <span style={{ color: item.enhancementType === 'bik' ? '#f59e0b' : 'var(--success)', fontWeight: 500 }}>{item.enhancementType === 'bik' ? '≈' : '+'}£{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {currentMonthFull.rawMonthsActual.income.filter(i => Number(i.amount) !== 0).map((item, idx) => (
                  <div key={`raw-income-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: 0.75 }}>{item.name}</span>
                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>+£{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {currentMonthFull.rawMonthsActual.deductions.filter(d => d.type === 'income' && Number(d.amount) !== 0).map((item, idx) => (
                  <div key={`raw-deduction-income-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: 0.75 }}>{item.name}</span>
                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>+£{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {currentMonthFull.ot15 > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: 0.75 }}>1.5x Overtime</span>
                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>+£{currentMonthFull.ot15.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {currentMonthFull.ot20 > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: 0.75 }}>2.0x Overtime</span>
                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>+£{currentMonthFull.ot20.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {currentMonthFull.holidaySupplement > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: 0.75 }}>OT Holiday Supp. ({holidaySupplementPercent}%)</span>
                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>+£{currentMonthFull.holidaySupplement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  <span style={{ opacity: 0.75 }}>Base Salary</span>
                  <span style={{ color: 'var(--success)', fontWeight: 500 }}>+£{((sandboxMode && sandboxSalary !== null ? sandboxSalary : baseSalary) / 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* BiK NOTE */}
              {analyticsData.totalBik > 0 && (
                <div style={{ margin: '0.5rem 0 1rem 0', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.25rem' }}>⚠️ Benefit in Kind Impact</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: '1.4' }}>
                    BiK items add £{analyticsData.totalBik.toLocaleString()} to your taxable income but do NOT increase your take-home pay. You're taxed on the benefit value but the employer pays for the benefit directly.
                  </div>
                </div>
              )}

              {/* GROSS SACRIFICE / PRE-TAX DEDUCTION LINES */}
              {(currentMonthFull.deductionItems.filter(d => d.type === 'salary_sacrifice' && Number(d.amount) !== 0).length > 0 || currentMonthFull.rawMonthsActual.deductions.filter(d => d.type === 'salary_sacrifice' && Number(d.amount) !== 0).length > 0 || (pensionType === 'salary_sacrifice' && monthlyPension > 0)) && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.45, textTransform: 'uppercase', marginBottom: '0.6rem' }}>Pre-Tax Deductions</div>
                  {pensionType === 'salary_sacrifice' && monthlyPension > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      <span style={{ opacity: 0.75 }}>Pension (Salary Sacrifice)</span>
                      <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{monthlyPension.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {currentMonthFull.deductionItems.filter(d => d.type === 'salary_sacrifice' && Number(d.amount) !== 0).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      <span style={{ opacity: 0.75 }}>{item.name}</span>
                      <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  {currentMonthFull.rawMonthsActual.deductions.filter(d => d.type === 'salary_sacrifice' && Number(d.amount) !== 0).map((item, idx) => (
                    <div key={`raw-ss-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      <span style={{ opacity: 0.75 }}>{item.name}</span>
                      <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAX / NI / STATUTORY DEDUCTIONS */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.45, textTransform: 'uppercase', marginBottom: '0.6rem' }}>Statutory Deductions</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  <span style={{ opacity: 0.75 }}>Income Tax</span>
                  <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{monthlyIncomeTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  <span style={{ opacity: 0.75 }}>National Insurance</span>
                  <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{monthlyNI.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {pensionType !== 'salary_sacrifice' && monthlyPension > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: 0.75 }}>Pension (EE)</span>
                    <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{monthlyPension.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {monthlyStudentLoan > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: 0.75 }}>Student Loan</span>
                    <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{monthlyStudentLoan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {monthlyHICBC > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: 0.75 }}>HICBC (Child Benefit)</span>
                    <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{monthlyHICBC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* NET (POST-TAX) DEDUCTIONS */}
              {(currentMonthFull.deductionItems.filter(d => d.type === 'net_sacrifice' && Number(d.amount) !== 0).length > 0 || currentMonthFull.rawMonthsActual.deductions.filter(d => d.type === 'net_sacrifice' && Number(d.amount) !== 0).length > 0) && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.45, textTransform: 'uppercase', marginBottom: '0.6rem' }}>Post-Tax Deductions</div>
                  {currentMonthFull.deductionItems.filter(d => d.type === 'net_sacrifice' && Number(d.amount) !== 0).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      <span style={{ opacity: 0.75 }}>{item.name}</span>
                      <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  {currentMonthFull.rawMonthsActual.deductions.filter(d => d.type === 'net_sacrifice' && Number(d.amount) !== 0).map((item, idx) => (
                    <div key={`raw-net-sac-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      <span style={{ opacity: 0.75 }}>{item.name}</span>
                      <span style={{ color: 'var(--error)', fontWeight: 500 }}>-£{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              )}


              {/* MONTHLY VARIABLE ITEMS INPUT */}
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Custom Adjustments (This Month Only)</span>
                  <button className="btn-add" onClick={() => addMonthItem(selectedMonthIdx, 'deductions')} title="Add Variable Item">
                    <Plus size={16} />
                  </button>
                </div>
                {months[selectedMonthIdx].deductions.map(d => (
                  <div key={d.id} className="income-line">
                    <input placeholder="Name" value={d.name} onChange={(e) => updateMonthItem(selectedMonthIdx, 'deductions', d.id, 'name', e.target.value)} className="input-field" />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        placeholder="Amt"
                        value={d.amount}
                        onChange={(e) => handleDecimalInput(e.target.value, (v) => updateMonthItem(selectedMonthIdx, 'deductions', d.id, 'amount', v))}
                        className="input-field"
                      />
                      <select value={d.type} onChange={(e) => updateMonthItem(selectedMonthIdx, 'deductions', d.id, 'type', e.target.value)} className="input-field">
                        <option value="salary_sacrifice">Gross Sacrifice</option>
                        <option value="net_sacrifice">Net Sacrifice</option>
                        <option value="tax_free">Expense</option>
                        <option value="income">Income</option>
                      </select>
                      <button className="btn-icon" style={{ color: 'var(--error)' }} onClick={() => removeMonthItem(selectedMonthIdx, 'deductions', d.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* MID-YEAR TAX CODE OVERRIDE */}
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--glass-bg)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={!!months[selectedMonthIdx].taxCodeOverride}
                    onChange={(e) => {
                      const newMonths = [...months];
                      if (e.target.checked) newMonths[selectedMonthIdx].taxCodeOverride = taxCode;
                      else delete newMonths[selectedMonthIdx].taxCodeOverride;
                      setMonths(newMonths);
                    }}
                  />
                  Override Tax Code for {MONTHS[selectedMonthIdx]} onwards (Cumulative change)
                </label>
                {months[selectedMonthIdx].taxCodeOverride !== undefined && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', opacity: 0.8, color: 'var(--text-main)' }}>New Code active this month:</span>
                    <input
                      className="input-field"
                      style={{ width: '100px', padding: '0.4rem', border: '1px solid var(--primary)' }}
                      value={months[selectedMonthIdx].taxCodeOverride}
                      onChange={(e) => {
                        const newMonths = [...months];
                        newMonths[selectedMonthIdx].taxCodeOverride = e.target.value.toUpperCase();
                        setMonths(newMonths);
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem', opacity: 0.6 }}>
                  <span>Total Gross</span>
                  <span>£{monthlyGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem', opacity: 0.6 }}>
                  <span>Taxable Income</span>
                  <span>£{monthlyTaxableIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {totalPreTax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem', opacity: 0.6 }}>
                    <span>Pre-Tax Deductions</span>
                    <span style={{ color: 'var(--error)' }}>-£{totalPreTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {totalStatutory > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem', opacity: 0.6 }}>
                    <span>Statutory Deductions</span>
                    <span style={{ color: 'var(--error)' }}>-£{totalStatutory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {totalPostTax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.75rem', opacity: 0.6 }}>
                    <span>Post-Tax Deductions</span>
                    <span style={{ color: 'var(--error)' }}>-£{totalPostTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-label" style={{ margin: 0 }}>Estimated Net Pay:</span>
                  <strong style={{ fontSize: '1.5rem', color: 'var(--success)' }}>£{totalMonthlyNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>



            {/* Annual Forecast removed from Monthly Summary per user request */}
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            analyticsData={analyticsData} 
            taxYear={taxYear} 
            chartKey={chartKey}
            leaseConfig={leaseConfig}
            setMileageLogs={setMileageLogs}
            setChartKey={setChartKey}
            mileageLogs={mileageLogs}
            exportFullAnnualReport={exportFullAnnualReport}
            workMode={workMode}
          />
        )}

        {activeTab === 'selfemployed' && (
          <SelfEmployedTab
            seData={seData}
            onUpdateSEData={setSEData}
            taxYear={taxYear}
            payeANI={analyticsData.projections.taxableIncome}
            payeIncomeTaxPaid={analyticsData.projections.incomeTax}
            taxCode={taxCode}
            
            subscriptionTier={subscriptionTier}
            setShowPremiumModal={setShowPremiumModal}
            onUpgrade={handleUpgrade}
            activeHelperId={activeHelperId}
            setActiveHelperId={setActiveHelperId}
            setActiveText={setActiveHelperText}
          />
        )}

        {activeTab === 'guide' && <GuideTab taxYear={taxYear} workMode={workMode} />}

        {activeTab === 'budget' && (
          <BudgetTab
            budgetConfig={budgetConfig}
            onUpdateBudgetConfig={setBudgetConfig}
            budgetActuals={budgetActuals}
            onUpdateBudgetActuals={setBudgetActuals}
            netMonthlyPay={totalMonthlyNet}
            activeHelperId={activeHelperId}
            setActiveHelperId={setActiveHelperId}
            setActiveText={setActiveHelperText}
          />
        )}

        {activeTab === 'overtime' && (
          <div id="ot-report-content">
            <div className="glass-card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <button
                className="btn-primary btn-full btn-add btn-prominent"
                style={{ height: '3.5rem', fontSize: '1.1rem' }}
                onClick={() => {
                  setOtModalData({ id: null, date: new Date().toISOString().split('T')[0], hours: '', multiplier: 1.5, reason: '', monthIdx: selectedMonthIdx });
                  setShowOtModal(true);
                }}
              >
                <Plus size={24} /> Add Overtime Entry
              </button>
            </div>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Overtime Summary</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginTop: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.6rem', border: '1px solid rgba(99, 102, 241, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--primary)', marginBottom: '0.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>YTD Earned (Gross)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>£{ytdOTTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.6rem', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--success)', marginBottom: '0.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>YTD Net (After Tax)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>£{ytdOTNet.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: '0.55rem', opacity: 0.5, marginTop: '0.1rem' }}>@{Math.round(marginalOTRate * 100)}% marginal rate</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '0.6rem', border: '1px solid rgba(251, 191, 36, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: '#fbbf24', marginBottom: '0.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unclaimed (Gross)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>£{allOvertime.filter(o => !o.claimed).reduce((s, o) => s + calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(251, 191, 36, 0.15)', borderRadius: '0.6rem', border: '1px solid rgba(251, 191, 36, 0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: '#f59e0b', marginBottom: '0.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unclaimed (Net)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>£{unclaimedOTNet.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.7 }}>OT Summary</h3>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <select className="input-field" style={{ width: 'auto', padding: '0.3rem', fontSize: '0.8rem' }} value={otFilterMonth} onChange={(e) => setOtFilterMonth(e.target.value)}>
                    <option value="all">All Months</option>
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select className="input-field" style={{ width: 'auto', padding: '0.3rem', fontSize: '0.8rem' }} value={otFilterClaimed} onChange={(e) => setOtFilterClaimed(e.target.value)}>
                    <option value="all">All</option>
                    <option value="claimed">Claimed</option>
                    <option value="unclaimed">Unclaimed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overtime-list">
              {/* Unclaimed overtime — always visible */}
              {filteredOT.filter(o => !o.claimed).map(o => (
                <div key={o.id} className="overtime-line glass-card clickable" style={{ borderLeft: '4px solid var(--error)', marginBottom: '1rem', padding: '1rem' }} onClick={() => { setOtModalData({ id: o.id, date: o.date || '', hours: o.hours, multiplier: o.multiplier, reason: o.reason || '', monthIdx: o.monthIdx, originalMonthIdx: o.monthIdx }); setShowOtModal(true); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); updateMonthItem(o.monthIdx, 'overtime', o.id, 'claimed', !o.claimed); }} title="Tick once you've claimed this overtime">
                          <Square size={20} opacity={0.4} />
                        </button>
                        <span style={{ fontSize: '0.6rem', opacity: 0.5, lineHeight: 1 }}>Mark as<br/>claimed</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{o.hours}h @ {o.multiplier}x</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                          {o.date} • {MONTHS[o.monthIdx]}
                          <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>#OT-{String(o.id).slice(-6)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>£{calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '2px' }}>
                        → £{(calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier) * (1 - marginalOTRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} net
                      </div>
                      <button className="btn-icon" style={{ color: 'var(--error)', marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); removeMonthItem(o.monthIdx, 'overtime', o.id); }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {o.reason && <div style={{ fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '0.4rem', marginTop: '0.5rem', borderLeft: '2px solid rgba(255,255,255,0.05)' }}>{o.reason}</div>}
                </div>
              ))}

              {/* Claimed overtime — collapsible */}
              {(() => {
                const claimed = filteredOT.filter(o => o.claimed);
                if (claimed.length === 0) return null;
                const claimedTotal = claimed.reduce((s, o) => s + calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier), 0);
                return (
                  <>
                    <button
                      onClick={() => setShowClaimedOT(!showClaimedOT)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        marginBottom: showClaimedOT ? '0.5rem' : '1rem',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        borderRadius: '0.75rem',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckSquare size={16} color="var(--success)" />
                        Claimed Overtime ({claimed.length})
                        <span style={{ opacity: 0.6, fontWeight: 400 }}>— £{claimedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gross</span>
                        <span style={{ opacity: 0.5, fontWeight: 400, fontSize: '0.75rem' }}>→ £{(claimedTotal * (1 - marginalOTRate)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} net</span>
                      </span>
                      <ChevronDown size={16} style={{ transform: showClaimedOT ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                    </button>
                    {showClaimedOT && claimed.map(o => (
                      <div key={o.id} className="overtime-line glass-card clickable" style={{ borderLeft: '4px solid var(--success)', marginBottom: '1rem', padding: '1rem', opacity: 0.7 }} onClick={() => { setOtModalData({ id: o.id, date: o.date || '', hours: o.hours, multiplier: o.multiplier, reason: o.reason || '', monthIdx: o.monthIdx, originalMonthIdx: o.monthIdx }); setShowOtModal(true); }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); updateMonthItem(o.monthIdx, 'overtime', o.id, 'claimed', !o.claimed); }} title="Unmark as claimed">
                              <CheckSquare size={20} color="var(--success)" />
                            </button>
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{o.hours}h @ {o.multiplier}x</div>
                              <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                {o.date} • {MONTHS[o.monthIdx]}
                                <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>#OT-{String(o.id).slice(-6)}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, color: 'var(--success)' }}>£{calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '2px' }}>
                              → £{(calculateOvertime(baseSalary, contractedHours, o.hours, o.multiplier) * (1 - marginalOTRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} net
                            </div>
                            <button className="btn-icon" style={{ color: 'var(--error)', marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); removeMonthItem(o.monthIdx, 'overtime', o.id); }}><Trash2 size={16} /></button>
                          </div>
                        </div>
                        {o.reason && <div style={{ fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '0.4rem', marginTop: '0.5rem', borderLeft: '2px solid rgba(255,255,255,0.05)' }}>{o.reason}</div>}
                      </div>
                    ))}
                  </>
                );
              })()}

              {filteredOT.length === 0 && <p style={{ textAlign: 'center', opacity: 0.4, padding: '2rem 0' }}>No overtime logged.</p>}
              <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
                <button onClick={exportUnclaimedOT} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
                  <Download size={14} style={{ marginRight: '0.4rem' }} /> Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div>
            <div className="glass-card" style={{ padding: '2rem' }}>
{/* === GETTING STARTED BUTTON === */}
              <div style={{ marginBottom: '1.5rem' }}>
                <button 
                  onClick={() => setShowGettingStarted(true)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '0.75rem',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ClipboardList size={22} color="var(--primary)" />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.15rem' }}>Getting Started Guide</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Quick walkthrough to set up your profile and start using TaxSense.</div>
                    </div>
                  </div>
                  <ChevronRight size={18} opacity={0.5} />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={20} /> Annual Configuration</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setShowFullGuide(true)} className="btn-secondary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <BookOpen size={16} /> Full Guide
                    </button>
                    <button onClick={handleRestore} className="btn-secondary" style={{ fontSize: '0.8rem' }}>Restore Purchases</button>
                    <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="btn-secondary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                </div>
              </div>

              {/* Subscription Status Removed for Paid App Launch */}

              <div className="settings-box">
                <h3><Info size={16} style={{ verticalAlign: '-2px', marginRight: '0.4rem' }} /> Basic Details</h3>
                <div className="dashboard-grid" style={{ marginTop: 0 }}>
                  <div><label className="stat-label">Tax Year</label> <HelperInfo id="taxYear" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="The UK tax year runs from April 6th to April 5th. Select the year you are currently earning in to ensure correct rates." />
                    <select value={taxYear} onChange={(e) => handleYearSwitch(e.target.value)} className="input-field">
                      {[...Array(17)].map((_, i) => {
                        const y1 = 2024 + i;
                        const y2 = String(y1 + 1).slice(-2);
                        const yrString = `${y1}/${y2}`;
                        const isCurrent = yrString === getCurrentTaxYear();
                        return <option key={yrString} value={yrString}>{yrString}{isCurrent ? ' (Current)' : ''}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="stat-label">Work Mode</label> <HelperInfo id="workMode" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="Choose how you earn: Salaried (PAYE), Freelance (Self-Employed), or both. This unlocks specific tools for each income stream." />
                    <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="input-field">
                      <option value="paye">PAYE Only</option>
                      <option value="se">Self-Employed Only</option>
                      <option value="both">PAYE + Self-Employed</option>
                    </select>
                  </div>
                  {workMode !== 'se' && (
                    <>
                      <div><label className="stat-label">Annual Salary (£)</label> <HelperInfo id="baseSalary" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="Your total annual gross pay before any deductions. Refer to your P60 or employment contract for this figure." /><input type="number" value={baseSalary} onChange={(e) => handleNumericInput(e.target.value, setBaseSalary)} className="input-field" /></div>
                      <div><label className="stat-label">Contracted Hours (wk)</label> <HelperInfo id="contractedHours" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="Average weekly hours from your contract. This is used to calculate your 'true' hourly rate for overtime calculations." /><input type="number" value={contractedHours} onChange={(e) => handleNumericInput(e.target.value, setContractedHours)} className="input-field" /></div>
                    </>
                  )}
                  <div><label className="stat-label">Tax Code</label> <HelperInfo id="taxCode" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="Found on your payslip (e.g., 1257L). This determines your tax-free allowance. K codes (e.g., K100) mean HMRC has reduced your allowance to collect tax you owe — do not change a K code to a standard code without contacting HMRC first." /><input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} className="input-field" /></div>
                </div>
              </div>

              {workMode !== 'se' && (
                <div className="settings-box">
                  <h3><Car size={16} style={{ verticalAlign: '-2px', marginRight: '0.4rem' }} /> Lease Contract Details</h3>
                  <div className="dashboard-grid" style={{ marginTop: 0 }}>
                    <div>
                      <label className="stat-label">Lease Start Date</label> <HelperInfo id="leaseStart" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="The date your vehicle lease contract began." />
                      <input type="date" className="input-field" value={leaseConfig.startDate} onChange={(e) => setLeaseConfig({ ...leaseConfig, startDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="stat-label">Lease Term (Months)</label> <HelperInfo id="leaseTerm" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="The total duration of your lease agreement in months." />
                      <input type="number" className="input-field" value={leaseConfig.termMonths} onChange={(e) => handleNumericInput(e.target.value, (v) => setLeaseConfig({ ...leaseConfig, termMonths: v }))} />
                    </div>
                    <div>
                      <label className="stat-label">Total Allowed Miles</label> <HelperInfo id="leaseMiles" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="The total mileage limit for the duration of your lease contract." />
                      <input type="number" className="input-field" value={leaseConfig.totalAllowedMiles} onChange={(e) => handleNumericInput(e.target.value, (v) => setLeaseConfig({ ...leaseConfig, totalAllowedMiles: v }))} />
                    </div>
                  </div>
                </div>
              )}

              {/* Pension & Allowances */}
              <div className="settings-box">
                <h3><Landmark size={16} style={{ verticalAlign: '-2px', marginRight: '0.4rem' }} /> Pension & Allowances</h3>
                <div className="dashboard-grid" style={{ marginTop: 0 }}>
                  {workMode !== 'se' && (
                    <>
                      <div><label className="stat-label">Base Pension %</label> <HelperInfo id="basePension" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="Your contribution percentage. Usually matched or exceeded by your employer." /><input type="number" value={pensionPercent} onChange={(e) => handleNumericInput(e.target.value, setPensionPercent)} className="input-field" /></div>
                      <div>
                        <label className="stat-label">Pension Type</label> <HelperInfo id="pensionType" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="Salary Sacrifice reduces your gross pay, saving both Tax and National Insurance." />
                        <select value={pensionType} onChange={(e) => setPensionType(e.target.value)} className="input-field">
                          <option value="standard">Standard (Relief at Source)</option>
                          <option value="salary_sacrifice">Salary Sacrifice (Pension SS)</option>
                        </select>
                      </div>
                      <div><label className="stat-label">OT Holiday Supp. %</label> <HelperInfo id="holidaySupp" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="Percentage paid on top of overtime to account for holiday pay (Rolled Up Holiday Pay)." /><input type="number" step="0.1" value={holidaySupplementPercent} onChange={(e) => handleNumericInput(e.target.value, setHolidaySupplementPercent)} className="input-field" /></div>
                    </>
                  )}
                  <div><label className="stat-label">Children</label> <HelperInfo id="childBenefit" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="Number of children you claim child benefit for. Used to calculate HICBC traps." /><input type="number" value={childBenefitCount} onChange={(e) => handleNumericInput(e.target.value, setChildBenefitCount)} className="input-field" /></div>
                </div>
              </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <label className="stat-label">Student Loan Plans</label> <HelperInfo id="studentLoans" activeId={activeHelperId} setActiveId={setActiveHelperId} setActiveText={setActiveHelperText} text="Select all plans that apply to you. Thresholds are automatically applied based on the selected tax year." />
                  <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {['plan1', 'plan2', 'plan4', 'plan5', 'pgl'].map(plan => (
                      <label key={plan} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: studentLoanPlans.includes(plan) ? '1px solid var(--primary)' : '1px solid transparent' }}>
                        <input
                          type="checkbox"
                          checked={studentLoanPlans.includes(plan)}
                          onChange={(e) => {
                            if (e.target.checked) setStudentLoanPlans([...studentLoanPlans, plan]);
                            else setStudentLoanPlans(studentLoanPlans.filter(p => p !== plan));
                          }}
                          style={{ display: 'none' }}
                        />
                        <span style={{ color: studentLoanPlans.includes(plan) ? 'var(--primary)' : 'inherit' }}>{plan.toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>




              <div className="settings-box">
                <h3><Calculator size={16} style={{ verticalAlign: '-2px', marginRight: '0.4rem' }} /> Recurring Salary Modifiers</h3>
                <div className="dashboard-grid" style={{ marginTop: 0 }}>
                  <div>
                    <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                      Recurring Enhancements
                      <button className="btn-add" onClick={() => {
                        if (!isPremium && baseEnhancements.length >= 1) {
                          alert("Free Version Limit: 1 recurring enhancement. Upgrade to TaxSense Pro to add more.");
                          setShowPremiumModal(true); return;
                        }
                        setBaseModifierModalData({ id: null, type: 'enhancement', name: '', amount: '', frequency: 'annual', sacrificeType: 'salary_sacrifice', includeInPension: false, enhancementType: 'income' });
                        setShowBaseModifierModal(true);
                      }} title="Add Enhancement">
                        <Plus size={16} />
                      </button>
                    </div>
                    {baseEnhancements.map(e => (
                      <div key={e.id} className="overtime-line glass-card clickable" style={{ borderLeft: '4px solid var(--success)', marginBottom: '0.75rem', padding: '0.75rem', cursor: 'pointer' }} onClick={() => {
                        setBaseModifierModalData({ id: e.id, type: 'enhancement', name: e.name, amount: e.amount, frequency: e.frequency || 'monthly', sacrificeType: e.type || 'income', includeInPension: e.includeInPension || false, enhancementType: e.enhancementType || e.type || 'income' });
                        setShowBaseModifierModal(true);
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{e.name}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{e.frequency.charAt(0).toUpperCase() + e.frequency.slice(1)}</div>
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--success)' }}>+£{Number(e.amount).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                    {baseEnhancements.length === 0 && <p style={{ fontSize: '0.8rem', opacity: 0.5, textAlign: 'center', marginTop: '1rem' }}>No enhancements.</p>}
                  </div>
                  <div>
                    <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                      Recurring Sacrifices
                      <button className="btn-add" onClick={() => {
                        if (!isPremium && baseSacrifices.length >= 1) {
                          alert("Free Version Limit: 1 recurring sacrifice. Upgrade to TaxSense Pro to add more.");
                          setShowPremiumModal(true); return;
                        }
                        setBaseModifierModalData({ id: null, type: 'sacrifice', name: '', amount: '', frequency: 'annual', sacrificeType: 'salary_sacrifice', includeInPension: false });
                        setShowBaseModifierModal(true);
                      }} title="Add Sacrifice">
                        <Plus size={16} />
                      </button>
                    </div>
                    {baseSacrifices.map(d => (
                      <div key={d.id} className="overtime-line glass-card clickable" style={{ borderLeft: '4px solid var(--error)', marginBottom: '0.75rem', padding: '0.75rem', cursor: 'pointer' }} onClick={() => {
                        setBaseModifierModalData({ id: d.id, type: 'sacrifice', name: d.name, amount: d.amount, frequency: d.frequency || 'monthly', sacrificeType: d.type || 'salary_sacrifice' });
                        setShowBaseModifierModal(true);
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{d.name}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{d.frequency.charAt(0).toUpperCase() + d.frequency.slice(1)} • {d.type === 'salary_sacrifice' ? 'Gross' : 'Net'}</div>
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--error)' }}>-£{Number(d.amount).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                    {baseSacrifices.length === 0 && <p style={{ fontSize: '0.8rem', opacity: 0.5, textAlign: 'center', marginTop: '1rem' }}>No sacrifices.</p>}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '0.8rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Copy size={18} /> Data Management
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="stat-label">Copy Settings From:</label>
                    <select value={sourceYearForCopy} onChange={(e) => setSourceYearForCopy(e.target.value)} className="input-field">
                      {[...Array(17)].map((_, i) => {
                        const y1 = 2024 + i;
                        const y2 = String(y1 + 1).slice(-2);
                        const yrString = `${y1}/${y2}`;
                        return <option key={yrString} value={yrString}>{yrString}</option>;
                      })}
                    </select>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="stat-label">Copy Settings To:</label>
                    <select value={targetYearForCopy} onChange={(e) => setTargetYearForCopy(e.target.value)} className="input-field">
                      {[...Array(17)].map((_, i) => {
                        const y1 = 2024 + i;
                        const y2 = String(y1 + 1).slice(-2);
                        const yrString = `${y1}/${y2}`;
                        return <option key={yrString} value={yrString}>{yrString}</option>;
                      })}
                    </select>
                  </div>
                  <button
                    onClick={() => handleCopyTaxYearData(sourceYearForCopy, targetYearForCopy)}
                    className="btn-secondary"
                    style={{ gridColumn: '1 / -1', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
                    disabled={sourceYearForCopy === targetYearForCopy}
                  >
                    Duplicate Settings To {targetYearForCopy}
                  </button>
                </div>
                <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.75rem', opacity: 0.5 }}>
                  This will duplicate all salary settings, pensions, recurring items, and monthly logs from the source year into the selected target year profile.
                </p>
              </div>

              <div className="card" style={{ marginTop: '1.5rem', opacity: 0.5 }}>
                <div style={{ fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <p>© 2026 taxsense.uk - Intelligent Tax Planning optimized for 25/26 guidelines.</p>
                </div>
              </div>

              <div style={{ marginTop: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <button onClick={exportToCSV} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
                  <Download size={18} style={{ marginRight: '0.5rem' }} /> Export Year to CSV
                </button>
              </div>

              {/* Backup & Restore Section */}
              <div className="settings-box" style={{ marginTop: '2rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CloudUpload size={18} color="var(--primary)" /> Backup & Restore
                </h3>
                
                {/* Backup reminder banner */}
                {shouldShowBackupReminder() && (
                  <div style={{ 
                    padding: '0.75rem 1rem', 
                    background: 'rgba(251, 191, 36, 0.1)', 
                    borderRadius: '0.5rem', 
                    border: '1px solid rgba(251, 191, 36, 0.3)', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <AlertCircle size={18} color="#fbbf24" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24' }}>Weekly Backup Reminder</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.2rem' }}>Protect your data with a regular backup. Your data is stored locally on this device.</div>
                    </div>
                    <button 
                      className="btn-icon" 
                      style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                      onClick={() => dismissBackupReminder()}
                      title="Dismiss for 7 days"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Last backup info */}
                  {(() => {
                    const lastDate = getLastBackupDate();
                    if (lastDate) {
                      return (
                        <div style={{ fontSize: '0.8rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={14} />
                          Last backup: {lastDate.toLocaleDateString()} at {lastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      );
                    }
                    return (
                      <div style={{ fontSize: '0.8rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={14} />
                        No backup found. Tap "Create Backup" to export your data.
                      </div>
                    );
                  })()}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <button 
                      onClick={handleExportBackup} 
                      className="btn-primary"
                      style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <CloudDownload size={18} />
                      <span>Create Backup</span>
                    </button>
                    
                    <label 
                      className="btn-secondary"
                      style={{ 
                        padding: '0.75rem 1.5rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.5rem',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <CloudUpload size={18} />
                      <span>Restore from Backup</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportBackup}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.5rem' }}>
                    Backups include all your tax profiles, settings, and receipt photo metadata. Receipt images remain on-device and are backed up via iCloud if enabled.
                  </div>
                  
                  {/* Status message */}
                  {backupStatus && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      marginTop: '0.5rem',
                      fontSize: '0.85rem',
                      background: backupStatus.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                                  backupStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                                  'rgba(99, 102, 241, 0.1)',
                      border: `1px solid ${backupStatus.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 
                                            backupStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 
                                            'rgba(99, 102, 241, 0.3)'}`,
                      color: backupStatus.type === 'error' ? '#f87171' : 
                             backupStatus.type === 'success' ? '#34d399' : 
                             'var(--primary)'
                    }}>
                      {backupStatus.message}
                    </div>
                  )}
                </div>
              </div>


            </div>
          </div>

        )}

        {/* Global Footer */}
        <footer style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          paddingBottom: '3rem'
        }}>
          {!isPremium && (
            <div 
              onClick={() => setShowPremiumModal(true)}
              className="glass-card clickable"
              style={{
                width: '100%',
                maxWidth: '500px',
                padding: '1.25rem',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
                border: '1px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                marginBottom: '1rem',
                animation: 'pulse 2s infinite'
              }}
            >
              <div style={{ background: 'var(--primary)', padding: '0.75rem', borderRadius: '1rem' }}>
                <Bot size={24} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Upgrade to TaxSense Pro</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Unlock SE Tracking & Unlimited Logs</div>
              </div>
              <ChevronRight size={20} opacity={0.5} />
            </div>
          )}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={14} color="var(--success)" /> UK Tax Year {taxYear} - Professional Grade
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--input-bg)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--glass-border)' }}>
          </div>
        </footer>
      </main>
      <nav className="nav-bar">
        <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </div>
        <div className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <BarChart3 size={20} />
          <span>Stats</span>
        </div>
        {workMode !== 'se' && (
          <div className={`nav-item ${activeTab === 'overtime' ? 'active' : ''}`} onClick={() => setActiveTab('overtime')}>
            <Clock size={20} />
            <span>OT</span>
          </div>
        )}
        {workMode !== 'paye' && (
          <div className={`nav-item ${activeTab === 'selfemployed' ? 'active' : ''}`} onClick={() => setActiveTab('selfemployed')}>
            <Briefcase size={20} />
            <span>SE</span>
          </div>
        )}
        {workMode !== 'paye' && (
          <div className={`nav-item ${activeTab === 'guide' ? 'active' : ''}`} onClick={() => setActiveTab('guide')}>
            <BookOpen size={20} />
            <span>Guide</span>
          </div>
        )}
        <div className={`nav-item ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => setActiveTab('budget')}>
          <Wallet size={20} />
          <span>Budget</span>
        </div>
        <div className={`nav-item ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
          <Settings size={20} />
          <span>Settings</span>
        </div>
      </nav>

      {/* AI Action Bridge - Handled in useEffect */}

      {
        showBaseModifierModal && (
          <div className="modal-overlay" onClick={() => setShowBaseModifierModal(false)}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{baseModifierModalData.id ? `Edit ${baseModifierModalData.type === 'enhancement' ? 'Enhancement' : 'Sacrifice'}` : `Add ${baseModifierModalData.type === 'enhancement' ? 'Enhancement' : 'Sacrifice'}`}</h2>
                <button className="btn-icon" onClick={() => setShowBaseModifierModal(false)}><Trash2 size={24} style={{ transform: 'rotate(45deg)' }} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 0 }}>
                <div>
                  <label className="stat-label">Description / Name</label>
                  <input className="input-field" value={baseModifierModalData.name} onChange={e => setBaseModifierModalData({ ...baseModifierModalData, name: e.target.value })} placeholder="e.g. Car Allowance" />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="stat-label">Amount (£)</label>
                    <input type="number" className="input-field" value={baseModifierModalData.amount} onChange={e => handleNumericInput(e.target.value, (v) => setBaseModifierModalData({ ...baseModifierModalData, amount: v }))} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="stat-label">Frequency</label>
                    <select className="input-field" value={baseModifierModalData.frequency} onChange={e => setBaseModifierModalData({ ...baseModifierModalData, frequency: e.target.value })}>
                      <option value="annual">Annual</option>
                      <option value="monthly">Monthly</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                </div>
                {baseModifierModalData.type === 'sacrifice' && (
                  <div>
                    <label className="stat-label">Sacrifice Type</label>
                    <select className="input-field" value={baseModifierModalData.sacrificeType} onChange={e => setBaseModifierModalData({ ...baseModifierModalData, sacrificeType: e.target.value })}>
                      <option value="salary_sacrifice">Gross / Pre-Tax</option>
                      <option value="net_sacrifice">Net / Post-Tax</option>
                    </select>
                  </div>
                )}
                {baseModifierModalData.type === 'enhancement' && (
                  <div style={{ marginTop: '1rem' }}>
                    <label className="stat-label">Enhancement Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: baseModifierModalData.enhancementType !== 'bik' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${baseModifierModalData.enhancementType !== 'bik' ? '#10b981' : 'transparent'}`, borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => setBaseModifierModalData({ ...baseModifierModalData, enhancementType: 'income' })}
                      >
                        <div style={{ color: baseModifierModalData.enhancementType !== 'bik' ? '#10b981' : 'var(--text-muted)' }}>
                          {baseModifierModalData.enhancementType !== 'bik' ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Income</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>Increases take-home pay</div>
                        </div>
                      </div>
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: baseModifierModalData.enhancementType === 'bik' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${baseModifierModalData.enhancementType === 'bik' ? '#f59e0b' : 'transparent'}`, borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => setBaseModifierModalData({ ...baseModifierModalData, enhancementType: 'bik' })}
                      >
                        <div style={{ color: baseModifierModalData.enhancementType === 'bik' ? '#f59e0b' : 'var(--text-muted)' }}>
                          {baseModifierModalData.enhancementType === 'bik' ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Benefit in Kind</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>Taxable, not in take-home</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: '0.75rem', lineHeight: '1.5' }}>
                      <strong>Income:</strong> Car allowance, bonus, overtime uplift — increases your gross pay and take-home.<br/>
                      <strong>Benefit in Kind:</strong> Private healthcare, company car, life insurance — adds to taxable income but does NOT increase take-home pay. The employer pays the benefit, but you're taxed on it.
                    </div>
                  </div>
                )}
                {baseModifierModalData.type === 'enhancement' && (
                  <div style={{ marginTop: '1rem' }}>
                    <label className="stat-label">Pension Contribution Rule</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: baseModifierModalData.includeInPension ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${baseModifierModalData.includeInPension ? 'var(--primary)' : 'transparent'}`, borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => setBaseModifierModalData({ ...baseModifierModalData, includeInPension: true })}
                      >
                        <div style={{ color: baseModifierModalData.includeInPension ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {baseModifierModalData.includeInPension ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Include</div>
                      </div>
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: !baseModifierModalData.includeInPension ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${!baseModifierModalData.includeInPension ? 'var(--error)' : 'transparent'}`, borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => setBaseModifierModalData({ ...baseModifierModalData, includeInPension: false })}
                      >
                        <div style={{ color: !baseModifierModalData.includeInPension ? 'var(--error)' : 'var(--text-muted)' }}>
                          {!baseModifierModalData.includeInPension ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Exclude</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.75rem', lineHeight: '1.4' }}>
                      <strong>Included:</strong> Added to base salary for pension calculations.<br/>
                      <strong>Excluded:</strong> Not counted towards pension contributions.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                {baseModifierModalData.id && (
                  <button
                    className="btn-secondary"
                    style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                    onClick={() => {
                      removeBaseItem(baseModifierModalData.type, baseModifierModalData.id);
                      setShowBaseModifierModal(false);
                    }}
                  >
                    Delete
                  </button>
                )}
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const idToUse = baseModifierModalData.id || Date.now().toString();
                    const newItem = {
                      id: idToUse,
                      name: baseModifierModalData.name || 'Unnamed',
                      amount: Number(baseModifierModalData.amount) || 0,
                      frequency: baseModifierModalData.frequency,
                      includeInPension: baseModifierModalData.includeInPension,
                      type: baseModifierModalData.type === 'sacrifice' ? baseModifierModalData.sacrificeType : (baseModifierModalData.enhancementType || 'income'),
                      enhancementType: baseModifierModalData.type === 'enhancement' ? (baseModifierModalData.enhancementType || 'income') : undefined
                    };

                    if (baseModifierModalData.type === 'enhancement') {
                      if (baseModifierModalData.id) {
                        setBaseEnhancements(baseEnhancements.map(i => i.id === idToUse ? newItem : i));
                      } else {
                        if (!isPremium && baseEnhancements.length >= 1) {
                          alert("Free Version Limit: 1 recurring enhancement. Upgrade to TaxSense Pro for unlimited recurring items.");
                          setShowPremiumModal(true);
                          return;
                        }
                        setBaseEnhancements([...baseEnhancements, newItem]);
                      }
                    } else {
                      if (baseModifierModalData.id) {
                        setBaseSacrifices(baseSacrifices.map(i => i.id === idToUse ? newItem : i));
                      } else {
                        if (!isPremium && baseSacrifices.length >= 1) {
                          alert("Free Version Limit: 1 recurring sacrifice. Upgrade to TaxSense Pro for unlimited recurring items.");
                          setShowPremiumModal(true);
                          return;
                        }
                        setBaseSacrifices([...baseSacrifices, newItem]);
                      }
                    }
                    setShowBaseModifierModal(false);
                  }}
                >
                  {baseModifierModalData.id ? 'Save Changes' : 'Add Modifier'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        showOtModal && (
          <div className="modal-overlay" onClick={() => setShowOtModal(false)}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{otModalData.id ? 'Edit Overtime Entry' : 'Add Overtime'}</h2>
                <button className="btn-icon" onClick={() => setShowOtModal(false)}><Trash2 size={24} style={{ transform: 'rotate(45deg)' }} /></button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button className="preset-button" onClick={() => setOtModalData({ ...otModalData, hours: 4, multiplier: 1.5 })}>4h @ 1.5x</button>
                <button className="preset-button" onClick={() => setOtModalData({ ...otModalData, hours: 12, multiplier: 2.0 })}>12h @ 2.0x</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 0 }}>
                <div>
                  <label className="stat-label">Month Paid</label>
                  <select className="input-field" value={otModalData.monthIdx} onChange={e => setOtModalData({ ...otModalData, monthIdx: Number(e.target.value) })}>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="stat-label">Date Worked</label>
                  <input type="date" className="input-field" value={otModalData.date} onChange={e => setOtModalData({ ...otModalData, date: e.target.value })} />
                </div>
                <div>
                  <label className="stat-label">Hours</label>
                  <input type="number" className="input-field" value={otModalData.hours} onChange={e => handleNumericInput(e.target.value, (v) => setOtModalData({ ...otModalData, hours: v }))} placeholder="0" />
                </div>
                <div>
                  <label className="stat-label">Multiplier</label>
                  <select className="input-field" value={otModalData.multiplier} onChange={e => setOtModalData({ ...otModalData, multiplier: Number(e.target.value) })}>
                    <option value={1.5}>1.5x</option>
                    <option value={2.0}>2.0x</option>
                    <option value={1.0}>1.0x</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="stat-label">Reason / Reference</label>
                  <input className="input-field" value={otModalData.reason} onChange={e => setOtModalData({ ...otModalData, reason: e.target.value })} placeholder="e.g. Weekend Coverage" />
                </div>
              </div>

              <button
                className="btn-primary btn-full"
                style={{ marginTop: '2rem' }}
                onClick={() => {
                  const newMonths = [...months];
                  if (otModalData.id) {
                    // Edit mode
                    const origIdx = otModalData.originalMonthIdx !== undefined ? otModalData.originalMonthIdx : otModalData.monthIdx;
                    const currentMonthItems = newMonths[origIdx].overtime;
                    const itemIndex = currentMonthItems.findIndex(i => i.id === otModalData.id);
                    if (itemIndex > -1) {
                      const updatedItem = { ...currentMonthItems[itemIndex], date: otModalData.date, reason: otModalData.reason, hours: Number(otModalData.hours) || 0, multiplier: otModalData.multiplier, monthIdx: otModalData.monthIdx };
                      if (origIdx !== otModalData.monthIdx) {
                        newMonths[origIdx].overtime = currentMonthItems.filter(i => i.id !== otModalData.id);
                        newMonths[otModalData.monthIdx].overtime = [updatedItem, ...newMonths[otModalData.monthIdx].overtime];
                      } else {
                        currentMonthItems[itemIndex] = updatedItem;
                      }
                    }
                  } else {
                    // Add mode
                    if (!isPremium && newMonths[otModalData.monthIdx].overtime.length >= 2) {
                      alert("Free plan is limited to 2 overtime entries per month. Upgrade to Pro for unlimited logging!");
                      setShowPremiumModal(true);
                      return;
                    }
                    const newItem = {
                      id: Date.now(),
                      date: otModalData.date,
                      reason: otModalData.reason,
                      hours: Number(otModalData.hours) || 0,
                      multiplier: otModalData.multiplier,
                      claimed: false,
                      monthIdx: otModalData.monthIdx
                    };
                    newMonths[otModalData.monthIdx].overtime = [newItem, ...newMonths[otModalData.monthIdx].overtime];
                  }
                  setMonths(newMonths);
                  setShowOtModal(false);
                  setOtModalData({ id: null, date: new Date().toISOString().split('T')[0], hours: '', multiplier: 1.5, reason: '', monthIdx: selectedMonthIdx });
                }}
              >
                {otModalData.id ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        )
      }





      {showPremiumModal && (
        <div className="modal-overlay" onClick={() => setShowPremiumModal(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <div style={{
              width: '4rem', height: '4rem', borderRadius: '1.2rem', background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
              boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)'
            }}>
              <Bot size={32} color="white" />
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Unlock TaxSense Pro</h2>
            <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Choose the plan that fits your tax situation:
            </p>

            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              <div 
                className="glass-card clickable" 
                style={{ padding: '1rem', border: '1px solid var(--primary-light)', textAlign: 'left', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => handleUpgrade(1)}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--primary)' }}>PAYE Pro</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0' }}>£2.99<span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.6 }}>/year</span></div>
                <ul style={{ fontSize: '0.75rem', padding: 0, listStyle: 'none', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                  <li>✅ Unlimited Overtime & Entries</li>
                  <li>✅ Full PAYE Analytics</li>
                  <li>✅ Year-end CSV Exports</li>
                </ul>
              </div>
              
              <div 
                className="glass-card clickable" 
                style={{ padding: '1rem', border: '1.5px solid var(--primary)', textAlign: 'left', position: 'relative', background: 'var(--primary-light)', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => handleUpgrade(0)}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ position: 'absolute', top: '-10px', right: '10px', background: 'var(--primary)', color: 'white', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '1rem', fontWeight: 800 }}>MOST POPULAR</div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--primary)' }}>Ultimate Power Pack</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0' }}>£2.99<span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.6 }}>/month</span></div>
                <ul style={{ fontSize: '0.75rem', padding: 0, listStyle: 'none', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                  <li>✅ Everything in PAYE Pro</li>
                  <li>✅ Full Self-Employed Suite</li>
                  <li>✅ VAT Monitor & SIPP Growth Tracker</li>
                </ul>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '1rem', fontWeight: 600 }}
              onClick={() => handleUpgrade(0)}
            >
              Unlock Ultimate Pro Now
            </button>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', opacity: 0.5, marginTop: '1rem', cursor: 'pointer', fontSize: '0.8rem' }}
              onClick={() => setShowPremiumModal(false)}
            >
              Maybe Later
            </button>

          </div>
        </div>
      )}
      {/* Global Helper Overlay */}
      {activeHelperId && activeHelperText && (
        <div 
          onClick={() => {
            setActiveHelperId(null);
            setActiveHelperText(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay-bg)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30000,
            padding: '1.5rem',
            animation: 'modalEnter 0.2s ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--primary)',
              padding: '2.5rem 2rem 2rem',
              borderRadius: '1.5rem',
              width: '100%',
              maxWidth: '380px',
              fontSize: '1rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              color: 'var(--text-main)',
              lineHeight: '1.6',
              textTransform: 'none',
              fontWeight: '500',
              position: 'relative'
            }}
          >
            <button 
              type="button"
              onClick={() => {
                setActiveHelperId(null);
                setActiveHelperText(null);
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                transition: 'all 0.2s',
                zIndex: 2
              }}
            >
              <X size={20} />
            </button>
            {activeHelperText}
          </div>
        </div>
      )}

      {/* Full Guide Modal */}
      {showFullGuide && (
        <FullGuideModal 
          onClose={() => setShowFullGuide(false)} 
          taxYear={taxYear}
          workMode={workMode}
        />
      )}

      {/* Getting Started Modal */}
      {showGettingStarted && (
        <GettingStartedModal 
          onClose={() => setShowGettingStarted(false)}
          workMode={workMode}
        />
      )}

      <footer style={{ textAlign: 'center', padding: '2rem 1rem', opacity: 0.3, fontSize: '0.7rem', borderTop: '1px solid var(--glass-border)', marginTop: '2rem' }}>
        <p>© 2026 TaxSense UK. For informational purposes only. This app provides mathematical estimates and illustrative projections based on current UK tax rates. It does not constitute financial, legal, or professional tax advice. Always consult with HMRC or a qualified professional for your personal circumstances.</p>
      </footer>
    </div>
    </>
  );
}

export default App;
