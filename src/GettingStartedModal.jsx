import React from 'react';
import { X, ClipboardList } from 'lucide-react';

export default function GettingStartedModal({ onClose, workMode }) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0f172a',
            zIndex: 9999,
            overflow: 'auto',
            padding: '1rem'
        }}>
            {/* Header */}
            <div style={{
                position: 'sticky',
                top: 0,
                background: '#0f172a',
                zIndex: 10,
                padding: '1rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}
            >
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', color: '#e2e8f0' }}>
                    <ClipboardList size={24} color="#818cf8" /> Getting Started Guide
                </h1>
                <button 
                    onClick={onClose}
                    style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid #6366f1',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.9rem'
                    }}
                >
                    <X size={18} /> Close
                </button>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
                <div style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem', 
                    background: '#1e293b',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '0.75rem'
                }}
                >
                    <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#94a3b8' }}>Quick walkthrough to set up your profile and start using TaxSense.</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                        {/* PAYE Setup */}
                        <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#818cf8' }}>🏢 PAYE (Employed)</h4>
                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div><strong style={{color: '#e2e8f0'}}>1.</strong> Enter your <strong style={{color: '#e2e8f0'}}>Annual Salary</strong>, <strong style={{color: '#e2e8f0'}}>Contracted Hours</strong>, and <strong style={{color: '#e2e8f0'}}>Tax Code</strong> below ↓</div>
                                <div><strong style={{color: '#e2e8f0'}}>2.</strong> Tick your <strong style={{color: '#e2e8f0'}}>Student Loan Plans</strong> if you have one</div>
                                <div><strong style={{color: '#e2e8f0'}}>3.</strong> Set <strong style={{color: '#e2e8f0'}}>Pension %</strong> — choose <em>Salary Sacrifice</em> to save Tax + NI</div>
                                <div><strong style={{color: '#e2e8f0'}}>4.</strong> Add <strong style={{color: '#e2e8f0'}}>Child Benefit</strong> count for HICBC trap alerts</div>
                                <div><strong style={{color: '#e2e8f0'}}>5.</strong> (Optional) Add <strong style={{color: '#e2e8f0'}}>Recurring Modifiers</strong> (bonuses, car allowance, cycle scheme)</div>
                                <div><strong style={{color: '#e2e8f0'}}>6.</strong> Check <strong style={{color: '#e2e8f0'}}>Dashboard</strong> — see your monthly take-home pay instantly</div>
                                <div><strong style={{color: '#e2e8f0'}}>7.</strong> Log <strong style={{color: '#e2e8f0'}}>Overtime</strong> on the Overtime tab</div>
                            </div>
                        </div>
                        
                        {/* SE Setup */}
                        <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#818cf8' }}>💼 Self-Employed</h4>
                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div><strong style={{color: '#e2e8f0'}}>1.</strong> Set <strong style={{color: '#e2e8f0'}}>Work Mode</strong> to Self-Employed or Both</div>
                                <div><strong style={{color: '#e2e8f0'}}>2.</strong> Go to <strong style={{color: '#e2e8f0'}}>Self-Employed tab</strong> → Add Income (invoices)</div>
                                <div><strong style={{color: '#e2e8f0'}}>3.</strong> Track <strong style={{color: '#e2e8f0'}}>Expenses</strong> by category (office, travel, marketing…)</div>
                                <div><strong style={{color: '#e2e8f0'}}>4.</strong> 📸 <strong style={{color: '#e2e8f0'}}>Snap receipts</strong> — tap camera when adding expenses</div>
                                <div><strong style={{color: '#e2e8f0'}}>5.</strong> Add <strong style={{color: '#e2e8f0'}}>Assets</strong> for Capital Allowances (AIA 100%)</div>
                                <div><strong style={{color: '#e2e8f0'}}>6.</strong> Log <strong style={{color: '#e2e8f0'}}>Mileage</strong> — 45p/mile up to 10,000 miles</div>
                                <div><strong style={{color: '#e2e8f0'}}>7.</strong> ⚡ Use <strong style={{color: '#e2e8f0'}}>Power Pack</strong> — SIPP, VAT monitor, more</div>
                                <div><strong style={{color: '#e2e8f0'}}>8.</strong> Check <strong style={{color: '#e2e8f0'}}>Summary</strong> for estimated Self Assessment bill</div>
                            </div>
                        </div>
                        
                        {/* General Tips */}
                        <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.6rem', gridColumn: '1 / -1', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#818cf8' }}>💡 Quick Tips</h4>
                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                <span>📤 <strong style={{color: '#e2e8f0'}}>CSV Export</strong> — Overtime & SE data exportable</span>
                                <span>☁️ <strong style={{color: '#e2e8f0'}}>iCloud Backup</strong> — Backup & Restore below</span>
                                <span>📊 <strong style={{color: '#e2e8f0'}}>Analytics</strong> — Full-year projections & tax breakdowns</span>
                                <span>📅 <strong style={{color: '#e2e8f0'}}>Multi-year support</strong> — Switch tax years in settings</span>
                                <span>🔄 <strong style={{color: '#e2e8f0'}}>Sandbox Mode</strong> — Test "what if" scenarios safely</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#fbbf24' }}>
                        ⚠️ <strong style={{color: '#fbbf24'}}>Combined Income Warning:</strong> PAYE salary fills tax bands first. SE profit is taxed at your highest rate. Watch out for the £100k Personal Allowance trap.
                    </div>
                </div>

                {/* Close button at bottom */}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid #6366f1',
                            borderRadius: '0.5rem',
                            padding: '0.75rem 2rem',
                            color: '#e2e8f0',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <X size={18} /> Close Guide
                    </button>
                </div>
            </div>
        </div>
    );
}
