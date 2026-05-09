import React from 'react';
import { X, ClipboardList, BookOpen } from 'lucide-react';

export default function GettingStartedModal({ onClose, workMode }) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.98)',
            zIndex: 9999,
            overflow: 'auto',
            padding: '1rem'
        }}>
            {/* Header */}
            <div style={{
                position: 'sticky',
                top: 0,
                background: 'var(--bg-dark)',
                zIndex: 10,
                padding: '1rem 0',
                borderBottom: '1px solid var(--glass-border)',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                    <ClipboardList size={24} color="var(--primary)" /> Getting Started Guide
                </h1>
                <button 
                    onClick={onClose}
                    className="btn-icon"
                    style={{
                        background: 'var(--primary-light)',
                        border: '1px solid var(--primary)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        color: 'var(--primary)',
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
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '0.75rem'
                }}
                >
                    <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', opacity: 0.7 }}>Quick walkthrough to set up your profile and start using TaxSense.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                        {/* PAYE Setup */}
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '0.6rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--primary)' }}>🏢 PAYE (Employed)</h4>
                            <div style={{ fontSize: '0.78rem', opacity: 0.85, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div><strong>1.</strong> Enter your <strong>Annual Salary</strong>, <strong>Contracted Hours</strong>, and <strong>Tax Code</strong> below ↓</div>
                                <div><strong>2.</strong> Tick your <strong>Student Loan Plans</strong> if you have one</div>
                                <div><strong>3.</strong> Set <strong>Pension %</strong> — choose <em>Salary Sacrifice</em> to save Tax + NI</div>
                                <div><strong>4.</strong> Add <strong>Child Benefit</strong> count for HICBC trap alerts</div>
                                <div><strong>5.</strong> (Optional) Add <strong>Recurring Modifiers</strong> (bonuses, car allowance, cycle scheme)</div>
                                <div><strong>6.</strong> Check <strong>Dashboard</strong> — see your monthly take-home pay instantly</div>
                                <div><strong>7.</strong> Log <strong>Overtime</strong> on the Overtime tab</div>
                            </div>
                        </div>
                        
                        {/* SE Setup */}
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '0.6rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--primary)' }}>💼 Self-Employed</h4>
                            <div style={{ fontSize: '0.78rem', opacity: 0.85, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div><strong>1.</strong> Set <strong>Work Mode</strong> to Self-Employed or Both</div>
                                <div><strong>2.</strong> Go to <strong>Self-Employed tab</strong> → Add Income (invoices)</div>
                                <div><strong>3.</strong> Track <strong>Expenses</strong> by category (office, travel, marketing…)</div>
                                <div><strong>4.</strong> 📸 <strong>Snap receipts</strong> — tap camera when adding expenses</div>
                                <div><strong>5.</strong> Add <strong>Assets</strong> for Capital Allowances (AIA 100%)</div>
                                <div><strong>6.</strong> Log <strong>Mileage</strong> — 45p/mile up to 10,000 miles</div>
                                <div><strong>7.</strong> ⚡ Use <strong>Power Pack</strong> — SIPP, VAT monitor, more</div>
                                <div><strong>8.</strong> Check <strong>Summary</strong> for estimated Self Assessment bill</div>
                            </div>
                        </div>
                        
                        {/* General Tips */}
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '0.6rem', gridColumn: '1 / -1' }}>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--primary)' }}>💡 Quick Tips</h4>
                            <div style={{ fontSize: '0.78rem', opacity: 0.85, lineHeight: 1.6, display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                <span>📤 <strong>CSV Export</strong> — Overtime & SE data exportable</span>
                                <span>☁️ <strong>iCloud Backup</strong> — Backup & Restore below</span>
                                <span>📊 <strong>Analytics</strong> — Full-year projections & tax breakdowns</span>
                                <span>📅 <strong>Multi-year support</strong> — Switch tax years in settings</span>
                                <span>{String.fromCodePoint(0x1F504)} <strong>Sandbox Mode</strong> — Test "what if" scenarios safely</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '0.5rem', fontSize: '0.78rem', color: '#fbbf24' }}>
                        ⚠️ <strong>Combined Income Warning:</strong> PAYE salary fills tax bands first. SE profit is taxed at your highest rate. Watch out for the £100k Personal Allowance trap.
                    </div>
                </div>

                {/* Close button at bottom */}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button 
                        onClick={onClose}
                        className="btn-primary"
                        style={{ padding: '0.75rem 2rem' }}
                    >
                        <X size={18} style={{ marginRight: '0.5rem' }} /> Close Guide
                    </button>
                </div>
            </div>
        </div>
    );
}
