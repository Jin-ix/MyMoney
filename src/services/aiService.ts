import { format, subDays, getDaysInMonth, getDate, parseISO } from 'date-fns';
import type { Transaction, Budget, Account, SavingsGoal, RecurringPayment, UserSettings } from '@/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, getCategoryById } from '@/lib/categories';
import { formatCurrency, isInMonth } from '@/lib/utils';
import { calculateNetWorth } from '@/lib/finance/netWorth';
import { calculateCashFlow, isInternalTransfer } from '@/lib/finance/cashFlow';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'log_transaction';
    payload: {
      type: 'expense' | 'income';
      amount: number;
      category: string;
      description: string;
      paymentMethod: string;
      accountId: string;
      date: string;
    };
    executed?: boolean;
  };
  metrics?: {
    title: string;
    value: string;
    change?: string;
    tone?: 'positive' | 'negative' | 'neutral';
  }[];
}

export interface AppFinancialContext {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  recurringPayments: RecurringPayment[];
  settings: UserSettings;
  currentMonth: string;
}

const GEMINI_STORAGE_KEY = 'mymoney_gemini_api_key';

export function getStoredGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// 1. Natural Language Intent & Parsing Engine (Offline Local Intelligence)
// ---------------------------------------------------------------------------

interface ParsedTransactionIntent {
  type: 'expense' | 'income';
  amount: number;
  category: string;
  description: string;
  paymentMethod: string;
  accountId: string;
  date: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    'food', 'lunch', 'dinner', 'breakfast', 'coffee', 'tea', 'swiggy', 'zomato',
    'cafe', 'restaurant', 'burger', 'pizza', 'biryani', 'snack', 'snacks', 'eat',
    'eating', 'drinks', 'mcdonalds', 'kfc', 'starbucks', 'chai', 'meal', 'meals'
  ],
  transport: [
    'uber', 'ola', 'auto', 'petrol', 'diesel', 'fuel', 'bus', 'train', 'metro',
    'cab', 'taxi', 'rapido', 'fare', 'toll', 'flight', 'ticket', 'gasoline'
  ],
  groceries: [
    'grocery', 'groceries', 'milk', 'vegetables', 'fruits', 'supermarket',
    'blinkit', 'zepto', 'instamart', 'bigbasket', 'ration', 'veggies', 'bread'
  ],
  shopping: [
    'amazon', 'flipkart', 'clothes', 'shirt', 'shoes', 'shopping', 'myntra',
    'dress', 'jeans', 'watch', 'electronics', 'gadget', 't-shirt', 'zara', 'h&m'
  ],
  bills: [
    'bill', 'bills', 'electricity', 'water', 'wifi', 'broadband', 'recharge',
    'gas', 'mobile recharge', 'power', 'dth', 'utility', 'utilities'
  ],
  health: [
    'doctor', 'medicine', 'pharmacy', 'hospital', 'clinic', 'health', 'meds',
    'chemist', 'dental', 'gym', 'fitness', 'protein'
  ],
  entertainment: [
    'movie', 'movies', 'cinema', 'game', 'gaming', 'party', 'outing', 'concert',
    'show', 'theatre', 'club', 'pub', 'steam', 'playstation'
  ],
  education: [
    'book', 'books', 'course', 'courses', 'tuition', 'fee', 'fees', 'school',
    'college', 'udemy', 'coursera', 'exam', 'stationary'
  ],
  rent: [
    'rent', 'house rent', 'pg', 'flat rent', 'room rent', 'maintenance'
  ],
  insurance: [
    'insurance', 'lic', 'policy', 'premium', 'health insurance', 'term plan'
  ],
  subscriptions: [
    'netflix', 'spotify', 'prime', 'youtube', 'subscription', 'hotstar',
    'apple', 'icloud', 'disney', 'chatgpt', 'gym membership'
  ],
  salary: [
    'salary', 'stipend', 'paycheck', 'wages', 'credited'
  ],
  freelance: [
    'freelance', 'client', 'gig', 'upwork', 'fiverr', 'contract'
  ],
  investment: [
    'dividend', 'interest', 'stock', 'stocks', 'crypto', 'profit', 'mutual fund',
    'shares', 'sip', 'trading'
  ],
  gift: [
    'gift', 'bonus', 'reward', 'present'
  ],
  refund: [
    'refund', 'cashback', 'reimbursement', 'reimbursed'
  ],
};

export function parseTransactionFromText(text: string, context: AppFinancialContext): ParsedTransactionIntent | null {
  const lower = text.toLowerCase().trim();

  // Check if text looks like a transaction logging command
  const hasLogKeywords =
    /\b(spent|spend|paid|pay|bought|purchased|got|received|earned|added|credited|debited|add|log|record)\b/i.test(lower) ||
    /^[₹$€£]?\s*\d+(\.\d+)?\s*(for|on|in|to|via|by|from)/i.test(lower) ||
    /(food|groceries|lunch|dinner|petrol|fuel|uber|auto|swiggy|zomato|coffee|tea|rent|salary|recharge)\s+[₹$€£]?\s*\d+/i.test(lower);

  if (!hasLogKeywords) {
    return null;
  }

  // Determine type: Income vs Expense
  const isIncome = /\b(received|got|earned|credited|salary|freelance|bonus|dividend|refund|cashback|income|added to bank)\b/i.test(lower) &&
    !/\b(spent|paid for|bought|purchased)\b/i.test(lower);

  const txType: 'expense' | 'income' = isIncome ? 'income' : 'expense';

  // Extract Amount: matches ₹500, 500rs, 500.50, 1.5k, etc.
  let amount = 0;
  const kMatch = lower.match(/(\d+(\.\d+)?)\s*k\b/i);
  if (kMatch) {
    amount = parseFloat(kMatch[1]) * 1000;
  } else {
    const amtMatch = lower.match(/(?:₹|\$|€|£|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (amtMatch) {
      amount = parseFloat(amtMatch[1].replace(/,/g, ''));
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return null;
  }

  // Determine Category
  let detectedCategory = txType === 'income' ? 'other_income' : 'other_expense';
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(lower))) {
      detectedCategory = catId;
      break;
    }
  }

  // Determine Payment Method
  let paymentMethod = 'upi';
  if (/\b(cash|notes|wallet)\b/i.test(lower)) {
    paymentMethod = 'cash';
  } else if (/\b(credit|cc)\b/i.test(lower)) {
    paymentMethod = 'credit';
  } else if (/\b(debit|card|atm)\b/i.test(lower)) {
    paymentMethod = 'debit';
  } else if (/\b(bank|transfer|neft|imps|rtgs|netbanking|hdfc|sbi|icici|axis)\b/i.test(lower)) {
    paymentMethod = 'bank_transfer';
  } else if (/\b(upi|gpay|phonepe|paytm|bhim)\b/i.test(lower)) {
    paymentMethod = 'upi';
  }

  // Determine Account ID
  let accountId = context.accounts[0]?.id || '';
  for (const acc of context.accounts) {
    const accNameLower = acc.name.toLowerCase();
    if (lower.includes(accNameLower)) {
      accountId = acc.id;
      break;
    }
    if (acc.type === 'cash' && paymentMethod === 'cash') {
      accountId = acc.id;
      break;
    }
    if ((acc.type === 'checking' || acc.type === 'savings') && (paymentMethod === 'bank_transfer' || paymentMethod === 'upi')) {
      accountId = acc.id;
    }
  }

  // Determine Date: today vs yesterday vs custom
  let txDate = format(new Date(), 'yyyy-MM-dd');
  if (/\byesterday\b/i.test(lower)) {
    txDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  }

  // Clean description
  let description = text
    .replace(/(?:spent|spend|paid|pay|bought|purchased|got|received|earned|added|credited|debited|log|record)\b/gi, '')
    .replace(/(?:₹|\$|€|£|rs\.?|inr)?\s*\d+(\.\d+)?\s*(k)?/gi, '')
    .replace(/\b(via|using|by|through|with|from|to|for|on|in|yesterday|today|upi|gpay|phonepe|paytm|cash|card|bank)\b/gi, '')
    .trim();

  if (!description) {
    const catName = getCategoryById(detectedCategory)?.name || (txType === 'income' ? 'Income' : 'Expense');
    description = catName;
  } else {
    // Capitalize first letter
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return {
    type: txType,
    amount,
    category: detectedCategory,
    description,
    paymentMethod,
    accountId,
    date: txDate,
  };
}

// ---------------------------------------------------------------------------
// 2. Intelligent Local Response Generator (Zero API Key needed)
// ---------------------------------------------------------------------------

export function generateLocalBotResponse(
  userText: string,
  context: AppFinancialContext
): { text: string; action?: ChatMessage['suggestedAction']; metrics?: ChatMessage['metrics'] } {
  const lower = userText.toLowerCase().trim();
  const symbol = context.settings.currencySymbol || '₹';
  const currentMonth = context.currentMonth;

  // 1. Check if user is trying to log an expense or income
  const parsedTx = parseTransactionFromText(userText, context);
  if (parsedTx) {
    const catObj = getCategoryById(parsedTx.category);
    const catName = catObj ? catObj.name : parsedTx.category;
    const isYesterday = parsedTx.date === format(subDays(new Date(), 1), 'yyyy-MM-dd');

    return {
      text: `I've prepared this ${parsedTx.type} for you:\n\n**${formatCurrency(parsedTx.amount, symbol)}** for **${parsedTx.description || catName}** (${catName})\nPayment: **${parsedTx.paymentMethod.toUpperCase()}** • Date: **${isYesterday ? 'Yesterday' : 'Today'}**\n\nClick below to confirm and save it instantly to your records!`,
      action: {
        type: 'log_transaction',
        payload: parsedTx,
      },
    };
  }

  // Calculate current month statistics
  const monthTransactions = context.transactions.filter(
    (t) => isInMonth(t.date, currentMonth)
  );
  const cashFlow = calculateCashFlow(monthTransactions);
  const totalIncome = cashFlow.operatingIncome;
  const totalExpenses = cashFlow.operatingExpenses;
  const netSavings = cashFlow.netCashFlow;

  const nw = calculateNetWorth(context.accounts);
  const liquidBalance = nw.liquidBalance;
  const totalNetWorth = nw.netWorth;

  // 2. Spending Summary / "How much did I spend" / "Month summary"
  if (
    /\b(spend|spent|spending|summary|overview|expenses?|month summary)\b/i.test(lower) &&
    !/\b(food|groceries|shopping|transport|bill|health|rent)\b/i.test(lower) &&
    !/\b(afford|can i buy)\b/i.test(lower)
  ) {
    const highestExpense = monthTransactions
      .filter((t) => t.type === 'expense' && !isInternalTransfer(t))
      .sort((a, b) => b.amount - a.amount)[0];

    const highestText = highestExpense
      ? `\n• **Highest Single Expense**: ${formatCurrency(highestExpense.amount, symbol)} (${highestExpense.description || highestExpense.category})`
      : '';

    return {
      text: `Here is your financial summary for **${format(new Date(currentMonth + '-01'), 'MMMM yyyy')}**:\n\n` +
        `• **Operating Expenses**: ${formatCurrency(totalExpenses, symbol)}\n` +
        `• **Operating Income**: ${formatCurrency(totalIncome, symbol)}\n` +
        `• **Net Cashflow**: ${totalIncome >= totalExpenses ? '🟢 +' : '🔴 -'}${formatCurrency(Math.abs(netSavings), symbol)}\n` +
        `• **Liquid Spendable Cash**: ${formatCurrency(liquidBalance, symbol)}\n` +
        `• **Total Net Worth**: ${formatCurrency(totalNetWorth, symbol)}` +
        highestText +
        `\n\n${totalExpenses === 0 ? "You haven't logged any operating expenses yet this month." : totalExpenses > totalIncome && totalIncome > 0 ? "⚠️ You are currently spending more than your recorded income for this month." : "✨ Your savings rate is healthy this month!"}`,
      metrics: [
        { title: 'Expenses', value: formatCurrency(totalExpenses, symbol), tone: 'negative' },
        { title: 'Income', value: formatCurrency(totalIncome, symbol), tone: 'positive' },
        { title: 'Liquid Cash', value: formatCurrency(liquidBalance, symbol), tone: 'neutral' },
      ],
    };
  }

  // 3. Balance Queries ("balance", "how much money do I have", "bank balance", "net worth")
  if (/\b(balance|net worth|how much (money|cash) do i have|accounts?)\b/i.test(lower)) {
    const accountsBreakdown = context.accounts.length > 0
      ? context.accounts.map((a) => `• **${a.name}** (${a.type}): ${formatCurrency(a.balance, symbol)}`).join('\n')
      : `• Net Cashflow: ${formatCurrency(liquidBalance, symbol)}`;

    return {
      text: `Here is your current wealth and balance status:\n\n` +
        `• **Spendable Liquid Cash**: ${formatCurrency(liquidBalance, symbol)}\n` +
        `• **Total Assets**: ${formatCurrency(nw.totalAssets, symbol)}\n` +
        `• **Total Liabilities (Debt)**: ${formatCurrency(nw.totalLiabilities, symbol)}\n` +
        `• **Net Worth**: ${formatCurrency(totalNetWorth, symbol)}\n\n` +
        `**Account Breakdown**:\n${accountsBreakdown}\n\nAll accounts sync in real-time with your transactions and Supabase database.`,
      metrics: [
        { title: 'Liquid Cash', value: formatCurrency(liquidBalance, symbol), tone: 'positive' },
        { title: 'Net Worth', value: formatCurrency(totalNetWorth, symbol), tone: 'neutral' },
      ],
    };
  }

  // 4. Category-specific queries (e.g. "how much did I spend on food?", "groceries spending")
  for (const cat of EXPENSE_CATEGORIES) {
    const catKeywords = CATEGORY_KEYWORDS[cat.id] || [cat.name.toLowerCase(), cat.id];
    if (catKeywords.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(lower))) {
      const catExpenses = monthTransactions
        .filter((t) => t.type === 'expense' && t.category === cat.id);
      const catSpent = catExpenses.reduce((sum, t) => sum + t.amount, 0);

      const budget = context.budgets.find(
        (b) => b.category === cat.id && b.month === currentMonth
      );

      let budgetMsg = 'No budget limit set for this category.';
      if (budget && budget.allocated > 0) {
        const remaining = budget.allocated - catSpent;
        const pct = Math.round((catSpent / budget.allocated) * 100);
        budgetMsg = `Budget: ${formatCurrency(budget.allocated, symbol)} (${pct}% used, ${remaining >= 0 ? `${formatCurrency(remaining, symbol)} left` : `⚠️ Over by ${formatCurrency(Math.abs(remaining), symbol)}`})`;
      }

      const recentItems = catExpenses.slice(0, 3).map(
        (t) => `• ${t.date.slice(8, 10)} ${format(new Date(t.date), 'MMM')}: ${formatCurrency(t.amount, symbol)} - ${t.description || cat.name}`
      ).join('\n');

      return {
        text: `Here is your **${cat.name}** spending for this month:\n\n` +
          `• **Total Spent**: ${formatCurrency(catSpent, symbol)} across ${catExpenses.length} transactions\n` +
          `• **Budget Status**: ${budgetMsg}\n\n` +
          (recentItems ? `**Recent Entries**:\n${recentItems}` : 'No recent transactions in this category.'),
      };
    }
  }

  // 5. Affordability / "Can I afford X?" / "Should I buy X?"
  const affordMatch = lower.match(/(?:afford|buy|purchase|spend)\s+(?:a|an)?\s*(?:[₹$€£]|rs\.?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (affordMatch || /\b(can i afford|should i buy)\b/i.test(lower)) {
    const targetAmt = affordMatch ? parseFloat(affordMatch[1].replace(/,/g, '')) : 0;

    if (targetAmt > 0) {
      const remainingLiquid = liquidBalance - targetAmt;
      const canAfford = remainingLiquid >= 0;
      const safeBuffer = liquidBalance * 0.2; // 20% safety margin

      let verdict = '';
      if (!canAfford) {
        verdict = `❌ **Not recommended right now.** Buying this for ${formatCurrency(targetAmt, symbol)} would exceed your spendable liquid balance (${formatCurrency(liquidBalance, symbol)}) by ${formatCurrency(Math.abs(remainingLiquid), symbol)}.`;
      } else if (remainingLiquid < safeBuffer) {
        verdict = `⚠️ **Proceed with caution.** You have enough funds (${formatCurrency(liquidBalance, symbol)}), but this purchase leaves you with only ${formatCurrency(remainingLiquid, symbol)}, which is below a recommended emergency safety margin.`;
      } else {
        verdict = `✅ **Yes, you can comfortably afford this!** You will still have **${formatCurrency(remainingLiquid, symbol)}** remaining in your accounts.`;
      }

      return {
        text: `### Affordability Check for ${formatCurrency(targetAmt, symbol)}\n\n` +
          verdict +
          `\n\n• Current Liquid Cash: **${formatCurrency(liquidBalance, symbol)}**\n` +
          `• Post-purchase Liquid Balance: **${formatCurrency(remainingLiquid, symbol)}**\n` +
          `• Total Expenses This Month: **${formatCurrency(totalExpenses, symbol)}**`,
      };
    }
  }

  // 6. Roast My Spending (Cleo-style witty critique)
  if (/\b(roast|roast me|roast my spending)\b/i.test(lower)) {
    const catTotals: Record<string, number> = {};
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      });

    const topCategoryKey = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0];
    const topCategoryObj = topCategoryKey ? getCategoryById(topCategoryKey) : null;
    const topCatName = topCategoryObj ? topCategoryObj.name : 'mystery expenses';
    const topCatAmount = catTotals[topCategoryKey] || 0;

    let roastMsg = '';
    if (totalExpenses === 0) {
      roastMsg = `I tried to roast your spending, but you haven't logged any expenses yet! Either you're surviving on sunlight and rainwater, or you're hiding your receipts from me. 🕵️‍♂️`;
    } else if (totalExpenses > totalIncome && totalIncome > 0) {
      roastMsg = `🔥 **Roast Alert: Defcon 1 Spending!**\n\nYou've spent **${formatCurrency(totalExpenses, symbol)}** while only bringing in **${formatCurrency(totalIncome, symbol)}** this month. You're treating your bank account like it's an unlimited cheat code in GTA! 🚗💨\n\nEspecially **${topCatName}** where **${formatCurrency(topCatAmount, symbol)}** just evaporated. Are food delivery drivers on your speed dial? Put down the phone and cook some instant noodles before your wallet calls the authorities!`;
    } else {
      roastMsg = `🔥 **Roast Alert: Reality Check!**\n\nAlright, let's talk about **${topCatName}**... **${formatCurrency(topCatAmount, symbol)}** this month?! That's ${(totalExpenses > 0 ? Math.round((topCatAmount / totalExpenses) * 100) : 0)}% of everything you spent! 🍔🛍️\n\nYour savings account is weeping in the corner while your UPI app gets a daily workout. Next time you feel that impulse click, do 10 pushups first!`;
    }

    return {
      text: roastMsg,
      metrics: [
        { title: 'Total Burnt', value: formatCurrency(totalExpenses, symbol), tone: 'negative' },
        { title: 'Top Culprit', value: topCatName, tone: 'negative' },
      ],
    };
  }

  // 7. Hype My Savings (Supportive cheerleader mode)
  if (/\b(hype|hype me|praise|how am i doing|celebrate)\b/i.test(lower)) {
    let hypeMsg = '';
    if (netSavings > 0) {
      hypeMsg = `🎉 **LET'S GO! Financial Discipline Mode: ON!**\n\nYou're running a positive cashflow of **+${formatCurrency(netSavings, symbol)}** this month! That's real money saved and working for you, not disappearing into impulse buys.\n\nYou're in the top tier of disciplined savers right now. Keep this exact pace and your future self is going to thank you profusely! 🚀💎`;
    } else {
      hypeMsg = `💪 **Every financial journey starts with awareness!**\n\nEven when the month is tight, the fact that you are actively tracking every rupee here puts you ahead of 90% of people who bury their head in the sand. You've got this—one mindful decision today turns the whole month around! ✨`;
    }
    return {
      text: hypeMsg,
      metrics: [
        { title: 'Net Cashflow', value: formatCurrency(netSavings, symbol), tone: 'positive' },
        { title: 'Liquid Wealth', value: formatCurrency(liquidBalance, symbol), tone: 'positive' },
      ],
    };
  }

  // 8. Yesterday's Spending
  if (/\byesterday('s)?\s*(spent|spending|expenses?)\b/i.test(lower) || lower === 'yesterday') {
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const yesterdayTxs = context.transactions.filter((t) => t.date === yesterdayStr);
    const yesterdaySpent = yesterdayTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const yesterdayIncome = yesterdayTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const list = yesterdayTxs.map(
      (t) => `• **${formatCurrency(t.amount, symbol)}** - ${t.description || t.category} (${t.type}) via ${t.paymentMethod.toUpperCase()}`
    ).join('\n');

    return {
      text: `### Yesterday's Spending (${yesterdayStr})\n\n` +
        `• **Total Spent**: ${formatCurrency(yesterdaySpent, symbol)}\n` +
        (yesterdayIncome > 0 ? `• **Income Received**: ${formatCurrency(yesterdayIncome, symbol)}\n` : '') +
        `• **Transactions Logged**: ${yesterdayTxs.length}\n\n` +
        (list ? `**Entries**:\n${list}` : '_No transactions were logged for yesterday._'),
    };
  }

  // 9. Upcoming Bills & Subscriptions
  if (/\b(bills?|subscriptions?|recurring|upcoming)\b/i.test(lower)) {
    const activeRecurring = context.recurringPayments.filter((p) => p.isActive);
    const totalRecurringMonthly = activeRecurring.reduce((sum, p) => sum + p.amount, 0);

    const billsList = activeRecurring.map(
      (p) => `• **${p.name}**: ${formatCurrency(p.amount, symbol)} (Due: ${p.nextDate}, ${p.frequency})`
    ).join('\n');

    return {
      text: `### Recurring Bills & Subscriptions\n\n` +
        `You have **${activeRecurring.length}** active recurring payments totaling **${formatCurrency(totalRecurringMonthly, symbol)}/month**:\n\n` +
        (billsList || '_No active subscriptions recorded._') +
        `\n\n💡 *Tip: Audit your subscriptions quarterly to cancel streaming services or apps you haven't used this month.*`,
    };
  }

  // 10. Savings Goals Progress
  if (/\b(goals?|targets?|savings goals?)\b/i.test(lower)) {
    if (context.savingsGoals.length === 0) {
      return {
        text: `You haven't set up any savings goals yet! Head to the **Savings Goals** tab to set a target for an Emergency Fund, Vacation, or New Gadget! 🎯`,
      };
    }

    const goalsSummary = context.savingsGoals.map((g) => {
      const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      return `• **${g.name}**: ${formatCurrency(g.currentAmount, symbol)} / ${formatCurrency(g.targetAmount, symbol)} (**${pct}%** done, ${formatCurrency(remaining, symbol)} to go)`;
    }).join('\n');

    return {
      text: `### 🎯 Savings Goals Progress\n\n${goalsSummary}\n\nKeep contributing regularly to reach your targets on time!`,
    };
  }

  // 11. Savings Tips / "How to save money" / "Advice"
  if (/\b(tips?|save|saving|advice|improve|financial health|goals?)\b/i.test(lower)) {
    // Find top expense category
    const catTotals: Record<string, number> = {};
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      });

    const topCategoryKey = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0];
    const topCategoryObj = topCategoryKey ? getCategoryById(topCategoryKey) : null;
    const topCategoryName = topCategoryObj ? topCategoryObj.name : 'discretionary purchases';

    return {
      text: `💡 **Smart Financial Insights for You**:\n\n` +
        `1. **Top Spending Focus**: Your largest expenditure this month is **${topCategoryName}** (${formatCurrency(catTotals[topCategoryKey] || 0, symbol)}). Setting a strict weekly cap here is the fastest way to increase your savings.\n\n` +
        `2. **The 50/30/20 Rule**: Aim for 50% on Needs (Rent, Utilities, Groceries), 30% on Wants (Dining, Entertainment), and 20% directly into Savings/Investments.\n\n` +
        `3. **Micro-Expense Awareness**: Small frequent UPI transactions (coffee, snacks, auto rides) often accumulate into large monthly totals. Try reviewing your transaction history weekly.\n\n` +
        `4. **Set Category Budgets**: Head to the **Budgets** tab to assign spending limits for food and shopping to receive proactive threshold warnings!`,
    };
  }

  // 12. General fallback / help guide
  return {
    text: `I'm **Artha AI**, your personal wealth guardian! 💎 Here are some things you can ask me:\n\n` +
      `• **Log an expense/income**: *"Spent ₹180 on lunch via UPI"* or *"Added ₹25,000 salary to Bank"*\n` +
      `• **Check spending**: *"How much did I spend on food this month?"* or *"Yesterday's spending"*\n` +
      `• **Roast my spending**: *"Roast my spending"* 🔥 (Cleo-style reality check)\n` +
      `• **Hype my savings**: *"Hype me"* 🎉 (Celebrate positive cash flow)\n` +
      `• **Check balances**: *"What is my account balance?"*\n` +
      `• **Bills & Subscriptions**: *"Upcoming bills"* or *"Savings goals"*\n` +
      `• **Affordability**: *"Can I afford to buy a ₹4,500 gadget?"*\n` +
      `• **Advice**: *"Give me tips to save money this month"*\n\n` +
      `💡 *Tip: Connect your free Google Gemini API key in the top settings key icon for unlimited conversational reasoning!*`,
  };
}

// ---------------------------------------------------------------------------
// 3. Gemini API Client (Optional Free API Key)
// ---------------------------------------------------------------------------

export async function askGeminiAssistant(
  userText: string,
  history: ChatMessage[],
  context: AppFinancialContext,
  apiKey: string
): Promise<{ text: string; action?: ChatMessage['suggestedAction']; metrics?: ChatMessage['metrics'] }> {
  // Always check if it's a quick transaction logging command first so execution is instantaneous!
  const quickTx = parseTransactionFromText(userText, context);
  if (quickTx) {
    return generateLocalBotResponse(userText, context);
  }

  const symbol = context.settings.currencySymbol || '₹';
  const currentMonth = context.currentMonth;

  // Build condensed JSON financial state
  const monthTransactions = context.transactions.filter((t) => isInMonth(t.date, currentMonth));
  const cfSnapshot = calculateCashFlow(monthTransactions);
  const totalIncome = cfSnapshot.operatingIncome;
  const totalExpenses = cfSnapshot.operatingExpenses;

  const nwSnapshot = calculateNetWorth(context.accounts);
  const netBalance = nwSnapshot.liquidBalance;

  const categoryTotals: Record<string, number> = {};
  monthTransactions
    .filter((t) => t.type === 'expense' && !isInternalTransfer(t))
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const financialSnapshot = {
    currentDate: format(new Date(), 'yyyy-MM-dd'),
    currentMonth,
    currencySymbol: symbol,
    totalLiquidBalance: netBalance,
    totalNetWorth: nwSnapshot.netWorth,
    totalAssets: nwSnapshot.totalAssets,
    totalLiabilities: nwSnapshot.totalLiabilities,
    thisMonthIncome: totalIncome,
    thisMonthExpenses: totalExpenses,
    accounts: context.accounts.map((a) => ({ name: a.name, type: a.type, balance: a.balance })),
    budgets: context.budgets.filter((b) => b.month === currentMonth).map((b) => ({
      category: b.category,
      allocated: b.allocated,
      spent: b.spent,
    })),
    topExpenseCategories: Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => ({ category: cat, amount: amt })),
    recentTransactions: context.transactions.slice(0, 8).map((t) => ({
      date: t.date,
      type: t.type,
      amount: t.amount,
      category: t.category,
      description: t.description,
      paymentMethod: t.paymentMethod,
    })),
    savingsGoals: context.savingsGoals.map((g) => ({
      name: g.name,
      target: g.targetAmount,
      saved: g.currentAmount,
    })),
    recurringPayments: context.recurringPayments.filter(p => p.isActive).map(p => ({
      name: p.name,
      amount: p.amount,
      frequency: p.frequency,
      nextDate: p.nextDate,
    })),
  };

  const systemInstruction = `You are "Artha AI" (named after 'Artha' - the ancient Sanskrit principle of wealth, purpose, and prosperity), an expert, witty, and deeply empathetic AI financial guardian embedded inside MyMoney Personal Finance app.
The user is managing their personal money.
Your Core Principles:
1. Always be concise, encouraging, and highly specific with real numbers from their financial data provided below.
2. If the user asks to "roast" their spending, deliver a sharp, humorous, Cleo-style reality check on their highest expenses and takeout habits!
3. If the user asks to "hype" their savings, celebrate their positive cash flow enthusiastically.
4. If they ask about affordability, check both their current liquid balance AND upcoming recurring bills before giving a clear green/yellow/red verdict.
5. Format your responses with clean GitHub Markdown (bold amounts, bullet points, concise paragraphs).
6. Do not fabricate numbers; strictly reference the real snapshot provided below:

User Financial Snapshot:
${JSON.stringify(financialSnapshot, null, 2)}

Keep answers under 3 concise paragraphs or easy-to-read bullet points unless asked for an in-depth breakdown.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    // Prepare previous conversational turns
    const contents: Array<{ role: 'user' | 'model'; parts: { text: string }[] }> = [];

    // Add last 4 chat messages for context
    const recentHistory = history.slice(-4);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      });
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: userText }],
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error('No response text received from Gemini');
    }

    return {
      text: replyText,
    };
  } catch (err: unknown) {
    console.warn('Gemini API call failed, falling back to local intelligence:', err);
    // Graceful fallback to local response
    const local = generateLocalBotResponse(userText, context);
    const errMessage = err instanceof Error ? err.message : String(err);
    return {
      text: `${local.text}\n\n*(Note: Gemini cloud API returned an error: "${errMessage.slice(0, 80)}". Switched to offline financial intelligence).*`,
      action: local.action,
      metrics: local.metrics,
    };
  }
}

