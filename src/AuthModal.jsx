import React, { useState } from 'react';

export default function AuthModal({ onShowLegal, onStart }) {
    const [agreed, setAgreed] = useState(false);

    const handleStart = () => {
        if (!agreed) return;
        onStart && onStart();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'var(--bg-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
        }}>
            {/* Background decorative circles */}
            <div style={{ position: 'absolute', top: '-10rem', right: '-10rem', width: '40rem', height: '40rem', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-8rem', left: '-8rem', width: '30rem', height: '30rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.06)', pointerEvents: 'none' }} />

            <div style={{
                background: 'var(--modal-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--primary-light)',
                borderRadius: '1.5rem',
                padding: '2.5rem',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                position: 'relative',
            }}>
                {/* Logo / Title */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
                        background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)',
                        margin: '0 auto 1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 'bold', color: 'white',
                    }}>S</div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>TaxSense</h1>
                    <p style={{ margin: '0.25rem 0 0', opacity: 0.7, fontSize: '0.85rem', color: 'var(--text-muted)' }}>UK Professional Grade</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                            Welcome to TaxSense. Your tax data is stored securely on your device — 
                            no cloud account needed.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginTop: '0.5rem' }}>
                        <input 
                            type="checkbox" 
                            id="agree" 
                            checked={agreed} 
                            onChange={e => setAgreed(e.target.checked)} 
                            style={{ marginTop: '0.2rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <label htmlFor="agree" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', cursor: 'pointer' }}>
                            I agree to the <button type="button" onClick={() => onShowLegal && onShowLegal('terms')} style={{ color: 'var(--primary)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>Terms of Service</button> & <button type="button" onClick={() => onShowLegal && onShowLegal('privacy')} style={{ color: 'var(--primary)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>Privacy Policy</button> and understand that TaxSense provides <strong>informational projections only</strong> and does not constitute professional advice.
                        </label>
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={!agreed}
                        className="btn-primary"
                        style={{ padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.5rem', opacity: !agreed ? 0.5 : 1, cursor: !agreed ? 'not-allowed' : 'pointer' }}
                    >
                        Get Started
                    </button>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.35, marginTop: '1.5rem', marginBottom: 0 }}>
                    Your data is stored securely on your device. No cloud account required.
                </p>
            </div>
        </div>
    );
}
