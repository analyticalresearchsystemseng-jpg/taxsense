import React from 'react';
import { X, BookOpen, Calculator, Calendar, Receipt, Car, Users, AlertTriangle, HelpCircle, ExternalLink, ChevronRight, Landmark, FileText, TrendingUp, Briefcase } from 'lucide-react';

const Section = ({ icon, title, badge, children }) => {
    const [open, setOpen] = React.useState(false);
    return (
        <div style={{ marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', overflow: 'hidden', background: '#1e293b' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem', background: open ? '#1e293b' : '#0f172a',
                    border: 'none', color: '#e2e8f0', cursor: 'pointer', textAlign: 'left', gap: '0.75rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                    <span style={{ color: '#818cf8' }}>{icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>{title}</span>
                    {badge && (
                        <span style={{ fontSize: '0.65rem', background: '#6366f1', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '0.3rem' }}>{badge}</span>
                    )}
                </div>
                {open ? <ChevronRight size={16} color="#94a3b8" style={{ transform: 'rotate(90deg)' }} /> : <ChevronRight size={16} color="#94a3b8" />}
            </button>
            {open && (
                <div style={{ padding: '1rem 1.1rem 1.1rem', fontSize: '0.87rem', lineHeight: 1.65, color: '#cbd5e1', borderTop: '1px solid rgba(255,255,255,0.1)', background: '#0f172a' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

const Link = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
        {children} <ExternalLink size={11} />
    </a>
);

const Table = ({ rows }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.83rem' }}>
        <tbody>
            {rows.map(([a, b], i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap', color: '#94a3b8' }}>{a}</td>
                    <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600, color: '#e2e8f0' }}>{b}</td>
                </tr>
            ))}
        </tbody>
    </table>
);

const Tip = ({ children }) => (
    <div style={{ background: '#1e293b', border: '1px solid #6366f1', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
        💡 {children}
    </div>
);

const Warn = ({ children }) => (
    <div style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#fbbf24' }}>
        ⚠️ {children}
    </div>
);

export default function FullGuideModal({ onClose, taxYear, workMode }) {
    const startYear = parseInt((taxYear || '2025/26').split('/')[0]);
    const filingDeadline = `31 January ${startYear + 2}`;
    const poa2 = `31 July ${startYear + 2}`;
    const onlineFiling = `31 January ${startYear + 2}`;

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
            }}>
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', color: '#e2e8f0' }}>
                    <BookOpen size={24} color="#818cf8" /> TaxSense Complete Guide
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
                    <X size={18} /> Close Guide
                </button>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
                {/* Intro */}
                <div className="glass-card" style={{ marginBottom: '1.5rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: '#cbd5e1' }}>
                        Welcome to the complete TaxSense guide. This covers everything you need to know about UK tax, 
                        Self Assessment, PAYE, and how to get the most out of this app. Tap any section to expand it.
                    </p>
                </div>

                {/* === QUICK START === */}
                <Section icon={<TrendingUp size={17} />} title="Quick Start — Getting Started">
                    <p style={{color: '#cbd5e1'}}><strong style={{color: '#e2e8f0'}}>Step 1:</strong> Go to Settings and select your Work Mode (PAYE, Self-Employed, or Both).</p>
                    <p style={{ marginTop: '0.5rem', color: '#cbd5e1' }}><strong style={{color: '#e2e8f0'}}>Step 2:</strong> Enter your basic details — salary, tax code, contracted hours.</p>
                    <p style={{ marginTop: '0.5rem', color: '#cbd5e1' }}><strong style={{color: '#e2e8f0'}}>Step 3:</strong> Add any recurring enhancements or sacrifices (car allowance, pension, etc.).</p>
                    <p style={{ marginTop: '0.5rem', color: '#cbd5e1' }}><strong style={{color: '#e2e8f0'}}>Step 4:</strong> Log your monthly income and overtime in the Dashboard.</p>
                    <p style={{ marginTop: '0.5rem', color: '#cbd5e1' }}><strong style={{color: '#e2e8f0'}}>Step 5:</strong> Check the Stats tab for year-end projections and tax breakdowns.</p>
                    <Tip>If you're self-employed, use the SE tab to log invoices, expenses, and mileage.</Tip>
                </Section>

                {/* === SELF ASSESSMENT === */}
                <Section icon={<Calculator size={17} />} title="What is Self Assessment?" badge={workMode !== 'paye' ? 'SE' : null}>
                    <p style={{color: '#cbd5e1'}}>Self Assessment (SA) is how HMRC collects tax from people whose income isn't fully taxed at source. If you're self-employed, a company director, or have income over £100,000, you must file a tax return each year.</p>
                    <p style={{ marginTop: '0.75rem', color: '#cbd5e1' }}>You tell HMRC what you earned, they work out what you owe, and you pay it — usually all at once in January.</p>
                    <Table rows={[
                        ['Register by', '5 October after the tax year ends'],
                        ['Online filing deadline', onlineFiling],
                        ['Payment deadline', filingDeadline],
                        ['Paper filing deadline', `31 October ${startYear + 1}`],
                        ['Penalty (late filing)', '£100 immediately; more after 3 months'],
                    ]} />
                    <Tip>You can file any time after 5 April. Filing early avoids the January rush and lets you budget for the bill months in advance.</Tip>
                </Section>

                {/* === KEY DATES === */}
                <Section icon={<Calendar size={17} />} title={`Your Key Dates — ${taxYear}`}>
                    <Table rows={[
                        ['5 April', `Tax year ${taxYear} ends`],
                        ['6 April', 'New tax year begins'],
                        ['31 July', poa2],
                        ['5 October', `Register for SA (if not already) for ${taxYear}`],
                        ['31 October', `Paper return deadline for ${taxYear}`],
                        ['31 January', filingDeadline],
                    ]} />
                    <Warn>The January deadline is the same date you file your return AND pay any balance — and in year 1, also the 1st Payment on Account. It can all hit at once.</Warn>
                </Section>

                {/* === TRADING ALLOWANCE === */}
                <Section icon={<Receipt size={17} />} title="Trading Allowance" badge="SE">
                    <p style={{color: '#cbd5e1'}}>The Trading Allowance is a £1,000 tax-free amount for self-employed income. If your total self-employed income is under £1,000 for the year, you don't even need to report it to HMRC.</p>
                    <p style={{ marginTop: '0.75rem', color: '#cbd5e1' }}>If your income is <strong style={{color: '#e2e8f0'}}>over £1,000</strong>, you have a choice each year:</p>
                    <Table rows={[
                        ['Option A — Trading Allowance', 'Deduct a flat £1,000. Simple, no receipts needed.'],
                        ['Option B — Actual Expenses', 'Deduct what you actually spent (requires records).'],
                    ]} />
                    <Warn>You cannot claim both. If your real expenses exceed £1,000, using Option B (actual expenses) generally provides a larger deduction and thus may result in a lower tax bill.</Warn>
                    <Tip>The Trading Allowance is best for people with very low overheads — e.g. a tutor who only buys pens and books.</Tip>
                </Section>

                {/* === PAYMENTS ON ACCOUNT === */}
                <Section icon={<Calendar size={17} />} title="Payments on Account" badge="SE">
                    <p style={{color: '#cbd5e1'}}>If your Self Assessment bill is over <strong style={{color: '#e2e8f0'}}>£1,000</strong>, HMRC requires you to make advance payments toward <em>next</em> year's estimated bill — these are called Payments on Account.</p>
                    <p style={{ marginTop: '0.75rem', color: '#cbd5e1' }}>Each payment is <strong style={{color: '#e2e8f0'}}>50% of your current bill</strong>.</p>
                    <Table rows={[
                        ['1st Payment on Account', `31 January ${startYear + 2} (same day as your bill!)`],
                        ['2nd Payment on Account', `31 July ${startYear + 2}`],
                        ['Balancing payment', `31 January ${startYear + 3} (actual bill minus PoA paid)`],
                    ]} />
                    <Warn><strong style={{color: '#e2e8f0'}}>Year 1 shock:</strong> In your first year, you owe your full bill PLUS 50% advance in January — potentially 150% of your tax bill in one payment. Budget early.</Warn>
                    <Tip>If your income drops significantly, you can apply to HMRC to reduce your Payments on Account. Don't just ignore them — they still charge interest if you underpay.</Tip>
                </Section>

                {/* === ALLOWABLE EXPENSES === */}
                <Section icon={<Receipt size={17} />} title="Allowable Expenses" badge="SE">
                    <p style={{color: '#cbd5e1'}}>You can deduct allowable business expenses from your income to reduce your taxable profit. Keep receipts for everything.</p>
                    <Table rows={[
                        ['✅ Office costs', 'Stationery, ink, printer paper, software'],
                        ['✅ Travel', 'Business journeys (not commuting), hotels on work trips'],
                        ['✅ Equipment', 'Laptop, tools, work phone — if used for business'],
                        ['✅ Marketing', 'Ads, website, business cards, social media costs'],
                        ['✅ Professional fees', 'Accountant, solicitor, professional subscriptions'],
                        ['✅ Clothing', 'Uniforms and protective clothing ONLY'],
                        ['❌ Commuting', 'Travel from home to your regular workplace'],
                        ['❌ Personal items', 'Anything with mixed business/personal use (unless split)'],
                        ['❌ Client entertainment', 'HMRC does not allow entertaining costs'],
                    ]} />
                    <Tip>If something is used partly for work (e.g. a phone), you can claim the work-use proportion — e.g. 60% if you use it 60% for work.</Tip>
                </Section>

                {/* === MILEAGE === */}
                <Section icon={<Car size={17} />} title="Mileage Rules" badge="SE">
                    <p style={{color: '#cbd5e1'}}>Instead of claiming actual vehicle costs (fuel, insurance, repairs), most sole traders use the HMRC Approved Mileage Rate — it's simpler and often more generous.</p>
                    <Table rows={[
                        ['First 10,000 miles', '45p per mile'],
                        ['Over 10,000 miles', '25p per mile'],
                        ['Motorcycles', '24p per mile (flat rate)'],
                        ['Bicycles', '20p per mile (flat rate)'],
                    ]} />
                    <Warn>HMRC requires you to keep a mileage log — date, destination, reason, and miles — and can ask to see it. The log in this app is designed to help you maintain these records.</Warn>
                    <Tip>Once you've started claiming mileage on a vehicle, you generally have to continue using it (rather than switching to actual costs) for that vehicle's lifetime.</Tip>
                </Section>

                {/* === CLASS 2 & 4 NI === */}
                <Section icon={<Calculator size={17} />} title="Class 2 & Class 4 NI" badge="SE">
                    <p style={{color: '#cbd5e1'}}>As a sole trader you don't pay the usual Class 1 NI (that's for employees). Instead you pay two types via your Self Assessment return:</p>
                    <Table rows={[
                        ['Class 2 NI', '£3.45/week if profit > £12,570 (2025/26)'],
                        ['Class 2 credits', 'Profit between £6,725-£12,570: no payment but NI credit given'],
                        ['Class 4 NI (main)', '6% on profit from £12,570 to £50,270'],
                        ['Class 4 NI (upper)', '2% on profit above £50,270'],
                    ]} />
                    <Tip>Class 2 NI counts toward your State Pension entitlement — so it's worth paying even if your profit is low, as long as you're above the Small Profits Threshold.</Tip>
                </Section>

                {/* === PAYE + SE COMBINED === */}
                {workMode === 'both' && (
                    <Section icon={<Users size={17} />} title="PAYE + Self-Employed Combined" badge="Important">
                        <p style={{color: '#cbd5e1'}}>HMRC taxes your <strong style={{color: '#e2e8f0'}}>total income from all sources</strong>. Your PAYE salary and self-employed profit are added together for income tax purposes.</p>
                        <Table rows={[
                            ['Band stacking', 'Your PAYE salary fills tax bands first. SE profit is taxed at the next rate up.'],
                            ['Personal Allowance', 'Your employer already uses your full £12,570 allowance via PAYE — SE profit is often taxed from £0.'],
                            ['NI', 'You pay Class 1 via payslip AND Class 2/4 on SE profit via SA — these are separate.'],
                            ['£100k trap', 'Combined income counts — £80k PAYE + £22k SE = £102k total, entering the 60% trap zone.'],
                            ['Student Loan', 'Repayments based on total income from both sources.'],
                        ]} />
                        <Warn>If your combined income is approaching £100,000, extra SE pension contributions (SIPP) may reduce your SE profit and could help pull your total income back below the threshold where Personal Allowance is withdrawn.</Warn>
                    </Section>
                )}

                {/* === VAT === */}
                <Section icon={<Calculator size={17} />} title="VAT" badge="SE">
                    <p style={{color: '#cbd5e1'}}>VAT (Value Added Tax) is charged at 20% on most goods and services in the UK. You may only need to worry about VAT if your turnover is high.</p>
                    <Table rows={[
                        ['Registration threshold', '£90,000 turnover in any 12-month period (2024/25+)'],
                        ['Voluntary registration', 'You can register even below the threshold — useful if clients are VAT registered'],
                        ['Standard rate', '20% on most goods and services'],
                        ['Zero rate', "0% on food, children's clothing, books"],
                        ['VAT returns', "Usually quarterly, filed via HMRC's Making Tax Digital (MTD) service"],
                    ]} />
                    <Warn>HMRC checks your turnover on a rolling 12-month basis. If you hit £90k at any point in any 12-month period, you must register within 30 days.</Warn>
                </Section>

                {/* === TAX CODES === */}
                <Section icon={<FileText size={17} />} title="Understanding Tax Codes" badge="PAYE">
                    <p style={{color: '#cbd5e1'}}>Your tax code tells your employer how much tax-free income you get. The most common code is <strong style={{color: '#e2e8f0'}}>1257L</strong>:</p>
                    <Table rows={[
                        ['1257L', 'Standard code — £12,570 tax-free allowance, spread evenly'],
                        ['1257L W1/M1', 'Week 1/Month 1 — emergency code, no cumulative calculation'],
                        ['K codes (e.g. K500)', 'You owe tax from previous years — deducted from pay'],
                        ['BR', 'All income taxed at Basic Rate (20%), no allowance'],
                        ['D0', 'All income taxed at Higher Rate (40%), no allowance'],
                        ['NT', 'No tax deducted — used for specific circumstances'],
                    ]} />
                    <Tip>If your code changes mid-year, check with HMRC. Wrong codes mean wrong tax — you'll either underpay (bill later) or overpay (refund later).</Tip>
                </Section>

                {/* === STUDENT LOANS === */}
                <Section icon={<Landmark size={17} />} title="Student Loan Repayments" badge="PAYE">
                    <p style={{color: '#cbd5e1'}}>Student loan repayments are taken automatically via PAYE if you're on Plan 1, 2, 4, or 5. Postgraduate loans (PGL) are separate.</p>
                    <Table rows={[
                        ['Plan 1', '9% on earnings above £24,360 (2025/26)'],
                        ['Plan 2', '9% on earnings above £27,660 (2025/26)'],
                        ['Plan 4', '9% on earnings above £31,925 (2025/26)'],
                        ['Plan 5', '9% on earnings above £25,000 (2025/26)'],
                        ['Postgraduate', '6% on earnings above £21,000 (2025/26)'],
                    ]} />
                    <Warn>You can have multiple plans at once (e.g. Plan 2 + PGL). The app calculates all applicable repayments. Self-employed repayments are calculated via Self Assessment.</Warn>
                </Section>

                {/* === £100K TAX TRAP === */}
                <Section icon={<AlertTriangle size={17} />} title="The £100K Tax Trap" badge="Important">
                    <p style={{color: '#cbd5e1'}}>When your income hits £100,000, your <strong style={{color: '#e2e8f0'}}>Personal Allowance starts disappearing</strong>. For every £2 you earn over £100k, you lose £1 of allowance.</p>
                    <p style={{ marginTop: '0.75rem', color: '#cbd5e1' }}>At £125,140, your entire £12,570 allowance is gone. This creates an effective <strong style={{color: '#e2e8f0'}}>60% tax rate</strong> between £100k and £125k.</p>
                    <Table rows={[
                        ['£100,000', 'Full £12,570 allowance intact'],
                        ['£110,000', '£7,570 allowance left — effective rate ~57%'],
                        ['£125,140', 'Zero allowance — back to 40% rate'],
                    ]} />
                    <Tip>Ways to avoid the trap: Pension contributions (salary sacrifice or SIPP), charitable donations (Gift Aid), or income splitting with a spouse.</Tip>
                </Section>

                {/* === PENSION CONTRIBUTIONS === */}
                <Section icon={<Landmark size={17} />} title="Pension Contributions" badge="PAYE">
                    <p style={{color: '#cbd5e1'}}>Pension contributions reduce your taxable income. There are two main ways they work:</p>
                    <Table rows={[
                        ['Relief at Source', 'You contribute from net pay, HMRC adds 20% basic rate relief automatically. Higher-rate taxpayers claim extra via tax return.'],
                        ['Salary Sacrifice', 'You agree to reduce gross salary. Employer pays the difference into pension. Saves Tax + NI.'],
                    ]} />
                    <Tip>The annual pension allowance is £60,000 (2025/26). Contributions above this may trigger a tax charge. Unused allowance can be carried forward up to 3 years.</Tip>
                </Section>

                {/* === CHILD BENEFIT CHARGE === */}
                <Section icon={<Users size={17} />} title="Child Benefit High Income Charge (HICBC)">
                    <p style={{color: '#cbd5e1'}}>If you or your partner earn over <strong style={{color: '#e2e8f0'}}>£60,000</strong> and you claim Child Benefit, you may have to pay some or all of it back via the High Income Child Benefit Charge.</p>
                    <Table rows={[
                        ['£60,000 or below', 'Full child benefit, no charge'],
                        ['£60,001 - £79,999', '1% charge per £100 over £60k — partial clawback'],
                        ['£80,000 or above', '100% charge — all benefit clawed back'],
                    ]} />
                    <Warn>The charge is based on the <strong style={{color: '#e2e8f0'}}>highest earner's income</strong> in the household, not combined income. If you're the higher earner at £70k and your partner earns £20k, you still pay the charge.</Warn>
                    <Tip>You can opt out of Child Benefit to avoid the charge, but it's often better to keep claiming (protects NI credits for the stay-at-home parent) and just pay the charge via tax return.</Tip>
                </Section>

                {/* === OVERTIME CALCULATIONS === */}
                <Section icon={<Briefcase size={17} />} title="Overtime & Holiday Supplement" badge="PAYE">
                    <p style={{color: '#cbd5e1'}}>The app calculates your overtime true hourly rate by:</p>
                    <ol style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', color: '#cbd5e1' }}>
                        <li>Taking your annual salary and dividing by contracted hours × 52 weeks</li>
                        <li>Multiplying by your overtime multiplier (1.5x, 2.0x, etc.)</li>
                        <li>Adding holiday supplement % if applicable (Rolled Up Holiday Pay)</li>
                    </ol>
                    <Tip>Holiday supplement is common in industries where holiday pay is "rolled up" into the hourly rate rather than paid during time off.</Tip>
                </Section>

                {/* === EXPORTING DATA === */}
                <Section icon={<FileText size={17} />} title="Exporting Your Data">
                    <p style={{color: '#cbd5e1'}}>TaxSense lets you export your data in multiple ways:</p>
                    <Table rows={[
                        ['CSV Export', 'Full year data — monthly income, overtime, deductions, summaries'],
                        ['GDPR Export', 'All your personal data in JSON format — everything stored in the app'],
                        ['Mileage Log', 'Export mileage entries for your accountant or HMRC records'],
                        ['SE Invoice/Expense', 'Detailed breakdown of self-employed transactions'],
                    ]} />
                    <Tip>Export regularly as backup. The app stores data locally and in the cloud (if logged in), but it's your data — keep copies.</Tip>
                </Section>

                {/* === APP FEATURES === */}
                <Section icon={<HelpCircle size={17} />} title="App Features & Tips">
                    <Table rows={[
                        ['Dashboard', 'Monthly income logging with overtime and deductions'],
                        ['Stats', 'Year-end projections, tax breakdowns, pie charts'],
                        ['OT Tab', 'Overtime logging with date, hours, multiplier, and notes'],
                        ['SE Tab', 'Self-employed invoicing, expenses, mileage, assets, SIPP'],
                        ['Guide', 'This guide — tap sections to expand/collapse'],
                        ['Settings', 'Tax year, work mode, salary, pension, student loans, theme'],
                    ]} />
                    <Tip>Switch between tax years in Settings to plan ahead. Copy settings from one year to another to save time.</Tip>
                </Section>

                {/* === USEFUL LINKS === */}
                <Section icon={<HelpCircle size={17} />} title="Useful Links">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                        <Link href="https://www.gov.uk/self-assessment-tax-returns">HMRC: Self Assessment overview</Link>
                        <Link href="https://www.gov.uk/register-for-self-assessment">Register for Self Assessment</Link>
                        <Link href="https://www.gov.uk/self-employed-national-insurance-rates">Self-employed NI rates</Link>
                        <Link href="https://www.gov.uk/expenses-if-youre-self-employed">Allowable expenses guide (HMRC)</Link>
                        <Link href="https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim75005">HMRC mileage rates</Link>
                        <Link href="https://www.gov.uk/vat-registration">VAT registration</Link>
                        <Link href="https://www.gov.uk/tax-codes/how-to-update-your-tax-code">How to update your PAYE tax code</Link>
                        <Link href="https://www.gov.uk/estimate-self-assessment-penalties">Estimate penalties for late filing</Link>
                        <Link href="https://www.gov.uk/student-finance">Student loan repayment info</Link>
                        <Link href="https://www.gov.uk/child-benefit">Child Benefit and HICBC</Link>
                    </div>
                </Section>

                {/* Disclaimer */}
                <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.6, padding: '0 1rem' }}>
                    This guide is for <strong style={{color: '#94a3b8'}}>general informational purposes only</strong>. It does not constitute financial, legal, or professional tax advice. Tax rules are complex and change regularly — always verify calculations and rules with HMRC or a qualified professional for your specific personal situation.
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
