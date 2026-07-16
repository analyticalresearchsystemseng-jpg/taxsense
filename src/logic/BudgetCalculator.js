/* Budget & Savings data structures for TaxSense profile */

export const BUDGET_CATEGORIES = [
  { value: 'housing', label: 'Housing', icon: 'Home', examples: 'Mortgage/rent, council tax, home insurance' },
  { value: 'utilities', label: 'Utilities', icon: 'Zap', examples: 'Electric, gas, water, broadband' },
  { value: 'transport', label: 'Transport', icon: 'Car', examples: 'Car finance, fuel, insurance, train' },
  { value: 'food', label: 'Food & Groceries', icon: 'ShoppingCart', examples: 'Supermarket, meal deliveries' },
  { value: 'subscriptions', label: 'Subscriptions', icon: 'Radio', examples: 'Streaming, gym, phone, software' },
  { value: 'debt', label: 'Debt', icon: 'CreditCard', examples: 'Loan payment, credit card, overdraft' },
  { value: 'discretionary', label: 'Discretionary', icon: 'Smile', examples: 'Eating out, hobbies, shopping' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal', examples: 'Anything else' },
];

export const DEFAULT_BUDGET_CONFIG = {
  budgetedItems: [],
  savingsAccounts: [],
};

export const DEFAULT_BUDGET_MONTH = {
  spends: [],
};

export function createDefaultBudgetMonth() {
  return { spends: [] };
}

export function createDefaultBudgetConfig() {
  return {
    budgetedItems: [],
    savingsAccounts: [],
  };
}

/**
 * Calculate monthly totals from budgeted items (including savings contributions)
 */
export function calculateMonthlyBudget(budgetConfig) {
  const items = budgetConfig?.budgetedItems || [];
  const savingsAccounts = budgetConfig?.savingsAccounts || [];
  
  const byCategory = {};
  let totalMonthly = 0;
  
  // Budgeted outgoings
  items.forEach(item => {
    const monthly = item.frequency === 'annual' ? (item.amount || 0) / 12 : (item.amount || 0);
    byCategory[item.category] = (byCategory[item.category] || 0) + monthly;
    totalMonthly += monthly;
  });

  // Savings contributions (treated as budgeted outgoings — they reduce disposable income)
  const savingsTotal = savingsAccounts.reduce((s, a) => s + Number(a.monthlyContribution || 0), 0);
  if (savingsTotal > 0) {
    byCategory['savings'] = (byCategory['savings'] || 0) + savingsTotal;
    totalMonthly += savingsTotal;
  }

  return { byCategory, totalMonthly, itemCount: items.length, savingsContributions: savingsTotal };
}

/**
 * Calculate actual spends for a given month
 */
export function calculateMonthlyActuals(budgetConfig, budgetActuals, monthIdx) {
  const monthData = budgetActuals?.[monthIdx];
  const items = budgetConfig?.budgetedItems || [];
  const spends = monthData?.spends || [];

  const byCategory = {};
  let totalActual = 0;
  let spendCount = 0;

  spends.forEach(spend => {
    const item = items.find(i => i.id === spend.budgetItemId);
    if (!item) return;
    const category = item.category || 'other';
    const amount = Number(spend.amount) || 0;
    byCategory[category] = (byCategory[category] || 0) + amount;
    totalActual += amount;
    spendCount++;
  });

  return { byCategory, totalActual, spendCount };
}

/**
 * Calculate variance (budgeted vs actual) for a month
 */
export function calculateVariance(budgetConfig, budgetActuals, monthIdx) {
  const budgeted = calculateMonthlyBudget(budgetConfig);
  const actuals = calculateMonthlyActuals(budgetConfig, budgetActuals, monthIdx);

  const byCategory = {};
  let totalVariance = 0;

  const allCategories = new Set([
    ...Object.keys(budgeted.byCategory),
    ...Object.keys(actuals.byCategory),
  ]);

  allCategories.forEach(cat => {
    const b = budgeted.byCategory[cat] || 0;
    const a = actuals.byCategory[cat] || 0;
    byCategory[cat] = { budgeted: b, actual: a, variance: a - b };
    totalVariance += a - b;
  });

  return {
    byCategory,
    totalBudgeted: budgeted.totalMonthly,
    totalActual: actuals.totalActual,
    totalVariance,
    isOverbudget: totalVariance > 0,
  };
}

/**
 * Calculate savings overview
 */
export function calculateSavingsOverview(savingsAccounts) {
  const accounts = savingsAccounts || [];
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalMonthly = accounts.reduce((s, a) => s + Number(a.monthlyContribution || 0), 0);
  const totalGoals = accounts.reduce((s, a) => s + Number(a.goal || 0), 0);
  const totalProgress = totalGoals > 0 ? Math.min(100, Math.round((totalBalance / totalGoals) * 100)) : 0;

  return { accounts, totalBalance, totalMonthly, totalGoals, totalProgress };
}

/**
 * Calculate annual projection
 */
export function calculateAnnualBudgetProjection(budgetConfig, budgetActuals) {
  const budgeted = calculateMonthlyBudget(budgetConfig);
  
  // Average actuals across months with data
  const actualMonths = (budgetActuals || []).filter(m => m?.spends?.length > 0);
  let avgActual = 0;
  if (actualMonths.length > 0) {
    const totalActual = actualMonths.reduce((s, m) => {
      return s + (m.spends || []).reduce((s2, sp) => s2 + Number(sp.amount || 0), 0);
    }, 0);
    avgActual = totalActual / actualMonths.length;
  }

  return {
    annualBudgeted: budgeted.totalMonthly * 12,
    annualActual: avgActual * 12,
    monthlyBudgeted: budgeted.totalMonthly,
    monthlyActual: avgActual,
  };
}
