import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';

const STEPS = [
  'welcome',
  'taxyear',
  'workmode',
  'salary',
  'studentloans',
  'pension',
  'childbenefit',
  'done'
];

const getCurrentTaxYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const isAfterTaxStart = (now.getMonth() > 3) || (now.getMonth() === 3 && now.getDate() >= 6);
  return isAfterTaxStart ? `${year}/${(year + 1).toString().slice(-2)}` : `${year - 1}/${year.toString().slice(-2)}`;
};

export default function SetupWizard({
  workMode, setWorkMode,
  baseSalary, setBaseSalary,
  contractedHours, setContractedHours,
  taxCode, setTaxCode,
  taxYear, setTaxYear,
  studentLoanPlans, setStudentLoanPlans,
  pensionPercent, setPensionPercent,
  pensionType, setPensionType,
  childBenefitCount, setChildBenefitCount,
  setHasCompletedTour
}) {
  const [step, setStep] = useState('welcome');
  const stepIdx = STEPS.indexOf(step);

  const next = () => {
    const nextIdx = stepIdx + 1;
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx]);
  };
  const prev = () => {
    const prevIdx = stepIdx - 1;
    if (prevIdx >= 0) setStep(STEPS[prevIdx]);
  };

  const finish = () => {
    localStorage.setItem('taxsense_tour_complete', 'true');
    setHasCompletedTour(true);
  };

  const skipTo = (targetStep) => {
    setStep(targetStep);
  };

  // Skip salary + pension steps if work mode is SE only
  const salaryStep = STEPS.indexOf('salary');
  const pensionStep = STEPS.indexOf('pension');

  const getVisibleSteps = () => {
    if (workMode === 'se') {
      return STEPS.filter(s => s !== 'salary' && s !== 'pension');
    }
    return STEPS;
  };

  const visibleSteps = getVisibleSteps();
  const currentVisibleIdx = visibleSteps.indexOf(step);
  const progress = ((currentVisibleIdx + 1) / visibleSteps.length) * 100;

  // When next/prev is called, account for skipped steps
  const handleNext = () => {
    const currentIdx = visibleSteps.indexOf(step);
    const targetStep = visibleSteps[currentIdx + 1];
    if (targetStep === 'salary' && workMode === 'se') {
      // Already filtered out
      next();
    } else {
      setStep(targetStep || 'done');
    }
  };

  const handlePrev = () => {
    const currentIdx = visibleSteps.indexOf(step);
    if (currentIdx > 0) {
      setStep(visibleSteps[currentIdx - 1]);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧮</div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem' }}>Welcome to TaxSense</h2>
            <p style={{ opacity: 0.75, lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Your intelligent UK tax planner — covering PAYE <strong>and</strong> Self-Employed income.
              <br /><br />
              Let's spend 2 minutes setting up your profile. You'll get personalised tax insights, 
              overtime tracking, mileage logging, Self Assessment estimates, and more.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left' }}>
              {[
                { icon: '💷', text: 'Know your take-home pay before payday' },
                { icon: '📊', text: 'See your full-year tax forecast' },
                { icon: '🔔', text: 'Get alerts for tax traps and underpayments' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--glass-bg)', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid var(--glass-border)', fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--text-main)' }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{item.icon}</div>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        );

      case 'taxyear':
        return (
          <div style={{ padding: '0.5rem 0' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Select Tax Year</h3>
            <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              The UK tax year runs from <strong>6 April to 5 April</strong>. Choose the year you want to plan for.
            </p>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="input-field"
              style={{ fontSize: '1rem', padding: '0.75rem' }}
            >
              {[...Array(10)].map((_, i) => {
                const y1 = 2024 + i;
                const y2 = String(y1 + 1).slice(-2);
                const yrString = `${y1}/${y2}`;
                const isCurrent = yrString === getCurrentTaxYear();
                return <option key={yrString} value={yrString}>{yrString}{isCurrent ? ' (Current)' : ''}</option>;
              })}
            </select>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--primary-light)', borderRadius: '0.5rem', fontSize: '0.82rem', border: '1px solid var(--primary)', opacity: 0.9 }}>
              💡 You can add multiple tax years later in Settings.
            </div>
          </div>
        );

      case 'workmode':
        return (
          <div style={{ padding: '0.5rem 0' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>How Do You Earn?</h3>
            <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              This unlocks the right tools for your situation. You can change it anytime in Settings.
            </p>
            {[
              {
                id: 'paye',
                title: 'PAYE Only',
                desc: 'Employed with a regular salary. Tax deducted automatically from your payslip.',
                icon: '🏢'
              },
              {
                id: 'se',
                title: 'Self-Employed Only',
                desc: 'Freelancer, contractor, or sole trader. You handle your own tax via Self Assessment.',
                icon: '💼'
              },
              {
                id: 'both',
                title: 'PAYE + Self-Employed',
                desc: 'Employed AND running a side business. Tax is calculated across both income streams.',
                icon: '🏢+💼'
              }
            ].map(opt => (
              <div
                key={opt.id}
                onClick={() => setWorkMode(opt.id)}
                style={{
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  background: workMode === opt.id ? 'var(--primary-light)' : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${workMode === opt.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '1.8rem' }}>{opt.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{opt.title}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6, lineHeight: 1.4 }}>{opt.desc}</div>
                </div>
                {workMode === opt.id && <Check size={20} color="var(--primary)" />}
              </div>
            ))}
          </div>
        );

      case 'salary':
        return (
          <div style={{ padding: '0.5rem 0' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Your Salary Details</h3>
            <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              These form the foundation of your tax calculations. Find them on your payslip or contract.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="stat-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Annual Gross Salary (£)</label>
                <input
                  type="number"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                  className="input-field"
                  placeholder="e.g. 45000"
                />
              </div>
              <div>
                <label className="stat-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Contracted Hours per Week</label>
                <input
                  type="number"
                  value={contractedHours}
                  onChange={(e) => setContractedHours(Number(e.target.value) || 0)}
                  className="input-field"
                  placeholder="e.g. 37.5"
                />
              </div>
              <div>
                <label className="stat-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Tax Code</label>
                <input
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 1257L"
                />
                <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.3rem' }}>Found on your payslip. Usually 1257L for standard allowance.</div>
              </div>
            </div>
          </div>
        );

      case 'studentloans':
        return (
          <div style={{ padding: '0.5rem 0' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Student Loan Plans</h3>
            <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Tick any that apply. Repayments are calculated automatically at the correct thresholds.
            </p>
            {[
              { id: 'plan1', label: 'Plan 1', desc: 'Started before Sept 2012 (England/Wales)' },
              { id: 'plan2', label: 'Plan 2', desc: 'Started after Sept 2012 (England/Wales)' },
              { id: 'plan4', label: 'Plan 4', desc: 'Scottish students' },
              { id: 'plan5', label: 'Plan 5', desc: 'Started after Aug 2023 (England)' },
              { id: 'pgl', label: 'Postgraduate Loan', desc: 'Masters or doctoral loan' },
            ].map(plan => {
              const selected = studentLoanPlans.includes(plan.id);
              return (
                <div
                  key={plan.id}
                  onClick={() => {
                    if (selected) {
                      setStudentLoanPlans(studentLoanPlans.filter(p => p !== plan.id));
                    } else {
                      setStudentLoanPlans([...studentLoanPlans, plan.id]);
                    }
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    marginBottom: '0.5rem',
                    background: selected ? 'var(--primary-light)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selected ? 'var(--primary)' : 'var(--glass-border)'}`,
                    borderRadius: '0.6rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{plan.label}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{plan.desc}</div>
                  </div>
                  <div style={{
                    width: '20px', height: '20px',
                    borderRadius: '4px',
                    border: `2px solid ${selected ? 'var(--primary)' : 'var(--text-muted)'}`,
                    background: selected ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}>
                    {selected && <Check size={14} color="white" />}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'pension':
        return (
          <div style={{ padding: '0.5rem 0' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Pension Contributions</h3>
            <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Your workplace pension affects your take-home pay and tax calculations.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="stat-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Your Contribution (%)</label>
                <input
                  type="number"
                  value={pensionPercent}
                  onChange={(e) => setPensionPercent(Number(e.target.value) || 0)}
                  className="input-field"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="stat-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Pension Type</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[
                    { id: 'standard', label: 'Standard', desc: 'Relief at Source — tax relief only' },
                    { id: 'salary_sacrifice', label: 'Salary Sacrifice', desc: 'Pre-tax — saves Tax + NI' },
                  ].map(pt => (
                    <div
                      key={pt.id}
                      onClick={() => setPensionType(pt.id)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: pensionType === pt.id ? 'var(--primary-light)' : 'rgba(255,255,255,0.02)',
                        border: `2px solid ${pensionType === pt.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                        borderRadius: '0.6rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{pt.label}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5, lineHeight: 1.3 }}>{pt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--primary-light)', borderRadius: '0.5rem', fontSize: '0.8rem', border: '1px solid var(--primary)', opacity: 0.9 }}>
              💡 <strong>Salary Sacrifice</strong> reduces your gross pay before tax — you save both Income Tax <em>and</em> National Insurance.
            </div>
          </div>
        );

      case 'childbenefit':
        return (
          <div style={{ padding: '0.5rem 0' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Child Benefit</h3>
            <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              If you claim Child Benefit, tell us how many children. This helps detect the <strong>High Income Child Benefit Charge (HICBC)</strong> trap.
            </p>
            <input
              type="number"
              min="0"
              max="10"
              value={childBenefitCount}
              onChange={(e) => setChildBenefitCount(Number(e.target.value) || 0)}
              className="input-field"
              style={{ fontSize: '1.1rem', textAlign: 'center' }}
            />
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(251,191,36,0.08)', borderRadius: '0.5rem', border: '1px solid rgba(251,191,36,0.2)', fontSize: '0.8rem' }}>
              ⚠️ <strong>HICBC Warning:</strong> If your adjusted net income exceeds <strong>£60,000</strong>, Child Benefit is fully clawed back. Between £50k-£60k, it's gradually reduced. TaxSense will alert you if you're in the danger zone.
            </div>
          </div>
        );

      case 'done':
        return (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
              <Sparkles size={48} color="var(--primary)" style={{ display: 'inline' }} />
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem' }}>You're All Set!</h2>
            <p style={{ opacity: 0.7, lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '1rem' }}>
              Here's what we've configured:
            </p>
            <div style={{
              textAlign: 'left',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '0.75rem',
              padding: '1rem',
              border: '1px solid var(--glass-border)',
              marginBottom: '1.5rem'
            }}>
              {[
                ['Tax Year', taxYear],
                ['Work Mode', { paye: 'PAYE Only', se: 'Self-Employed Only', both: 'PAYE + Self-Employed' }[workMode]],
                ...(workMode !== 'se' ? [
                  ['Annual Salary', `£${baseSalary.toLocaleString()}`],
                  ['Weekly Hours', contractedHours],
                  ['Tax Code', taxCode],
                  ['Pension', `${pensionPercent}% (${pensionType === 'salary_sacrifice' ? 'Salary Sacrifice' : 'Standard'})`],
                ] : []),
                ['Student Loans', studentLoanPlans.length > 0 ? studentLoanPlans.map(p => ({plan1:'Plan 1',plan2:'Plan 2',plan4:'Plan 4',plan5:'Plan 5',pgl:'PGL'}[p])).join(', ') : 'None'],
                ['Children (CB)', childBenefitCount || 'None'],
              ].map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < 7 ? '1px solid var(--glass-border)' : 'none', fontSize: '0.85rem' }}>
                  <span style={{ opacity: 0.5 }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '1.5rem' }}>
              You can change all of this later in <strong>Settings</strong> →
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const isLastStep = currentVisibleIdx >= visibleSteps.length - 1;
  const isFirstStep = currentVisibleIdx === 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      background: 'var(--bg-dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      {/* Backdrop click to close on first/last step only */}
      <div style={{ position: 'absolute', inset: 0 }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '90vh',
        overflow: 'auto',
        background: 'var(--bg-dark)',
        border: '1px solid var(--glass-border)',
        borderRadius: '1rem',
        padding: '1.5rem',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)'
      }}>
        {/* Progress bar */}
        <div style={{
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          marginBottom: '1.5rem',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--primary)',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Step indicator */}
        <div style={{
          fontSize: '0.7rem',
          opacity: 0.4,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.5rem'
        }}>
          Step {currentVisibleIdx + 1} of {visibleSteps.length}
        </div>

        {/* Step content */}
        <div style={{ minHeight: '250px' }}>
          {renderStep()}
        </div>

        {/* Navigation buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1.5rem',
          gap: '0.75rem'
        }}>
          {isFirstStep ? (
            <div />
          ) : (
            <button
              className="btn-secondary"
              onClick={handlePrev}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}

          {!isFirstStep && !isLastStep && (
            <button
              className="btn-secondary"
              onClick={handleNext}
              style={{ fontSize: '0.75rem', opacity: 0.5 }}
            >
              Skip
            </button>
          )}

          {isLastStep ? (
            <button
              className="btn-primary"
              onClick={finish}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '1rem', padding: '0.75rem 2rem'
              }}
            >
              <Sparkles size={18} /> Start Using TaxSense
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleNext}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
