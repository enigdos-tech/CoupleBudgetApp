// ═══════════════════════════════════════════════════════════════
//  COUPLE BUDGET APP — app.js
//  All data stored in localStorage. No backend required.
// ═══════════════════════════════════════════════════════════════

// ─── AUTH ────────────────────────────────────────────────────────────
const AUTH = (() => {
    const USER_LIST_KEY = 'cba_users';
    const SESSION_KEY = 'cba_session';

    // Simple hash: not cryptographic, but enough for personal use
    function hash(pin) {
        let h = 0;
        for (let i = 0; i < pin.length; i++) {
            h = Math.imul(31, h) + pin.charCodeAt(i) | 0;
        }
        return (h >>> 0).toString(36);
    }

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(USER_LIST_KEY) || '[]'); } catch { return []; }
    }
    function saveUsers(u) { localStorage.setItem(USER_LIST_KEY, JSON.stringify(u)); }

    function getCurrent() {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
    }
    function setCurrent(user) {
        if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        else sessionStorage.removeItem(SESSION_KEY);
    }

    return {
        get current() { return getCurrent(); },
        prefix() {
            const u = getCurrent();
            return u ? 'cba_' + u.username + '_' : 'cba_';
        },
        listUsers() { return getUsers(); },
        createUser(username, pinRaw, coupleName, p1Name, p2Name) {
            const users = getUsers();
            if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
                return { ok: false, msg: 'Username already taken. Choose another.' };
            }
            const user = { username, pinHash: hash(String(pinRaw)), coupleName, p1Name, p2Name };
            users.push(user);
            saveUsers(users);
            setCurrent(user);
            return { ok: true };
        },
        login(username, pinRaw) {
            const users = getUsers();
            const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (!user) return { ok: false, msg: 'User not found.' };
            if (user.pinHash !== hash(String(pinRaw))) return { ok: false, msg: 'Incorrect PIN.' };
            setCurrent(user);
            return { ok: true, user };
        },
        logout() { setCurrent(null); },
        isOnboarded() {
            try { return !!localStorage.getItem(AUTH.prefix() + 'onboarded'); } catch { return false; }
        },
        markOnboarded() { localStorage.setItem(AUTH.prefix() + 'onboarded', '1'); }
    };
})();

// ─── ONBOARDING ──────────────────────────────────────────────────────
const ONBOARDING = (() => {
    let step = 1;
    const TOTAL = 3;

    function show(s) {
        step = s;
        document.querySelectorAll('.ob-step').forEach(el => el.classList.remove('active'));
        const active = document.getElementById('ob-step-' + s);
        if (active) active.classList.add('active');
        // progress dots
        document.querySelectorAll('.ob-dot').forEach((d, i) => {
            d.classList.toggle('active', i < s);
        });
    }

    function finish() {
        // Save partner names from onboarding into income data so Income tab pre-fills
        const user = AUTH.current;
        if (user) {
            const inc = DB.get('income', {});
            if (!inc.p1Name) inc.p1Name = user.p1Name || '';
            if (!inc.p2Name) inc.p2Name = user.p2Name || '';
            DB.set('income', inc);
        }
        AUTH.markOnboarded();
        document.getElementById('onboardingOverlay').style.display = 'none';
        launchApp();
    }

    return {
        start() {
            document.getElementById('onboardingOverlay').style.display = 'flex';
            const user = AUTH.current;
            if (user) {
                document.getElementById('obCoupleName').textContent = user.coupleName || 'Your Couple';
                document.getElementById('obP1').textContent = user.p1Name || 'Partner 1';
                document.getElementById('obP2').textContent = user.p2Name || 'Partner 2';
            }
            show(1);
        },
        next() { if (step < TOTAL) show(step + 1); },
        prev() { if (step > 1) show(step - 1); },
        finish
    };
})();

// ─── CONSTANTS ───────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
    { id: 'housing', emoji: '🏠', name: 'Housing', desc: 'Condo fees, maintenance, insurance' },
    { id: 'groceries', emoji: '🛒', name: 'Groceries & Supplies', desc: 'Food, household items, cleaning' },
    { id: 'transport', emoji: '🚗', name: 'Transportation', desc: 'Car payment, gas, transit, parking' },
    { id: 'dining', emoji: '🍽️', name: 'Dining & Entertainment', desc: 'Restaurants, movies, events, subscriptions' },
    { id: 'health', emoji: '💊', name: 'Health & Wellness', desc: 'Gym, dental, prescriptions, massage' },
    { id: 'utilities', emoji: '⚡', name: 'Utilities & Tech', desc: 'Hydro, internet, mobile plans' },
    { id: 'clothing', emoji: '👗', name: 'Clothing & Personal', desc: 'Clothes, haircuts, beauty, personal care' },
    { id: 'travel', emoji: '✈️', name: 'Travel & Vacation', desc: 'Savings for trips, hotels, flights' },
    { id: 'education', emoji: '📚', name: 'Education & Growth', desc: 'Courses, books, professional development' },
    { id: 'kidsAndPets', emoji: '🐾', name: 'Kids & Pets', desc: 'Pet care, childcare, activities, supplies' },
];

const CHEERS = [
    "You're crushing it! 🎉", "Budget goals = love goals! 💑", "High five! Keep it up! 🙌",
    "Look at you being financially fabulous! ✨", "Savings = dreams loading... 🚀",
    "Partner-powered wealth building! 💪", "Every dollar saved is a step forward! 👣",
    "You two are a powerhouse couple! 🔥", "Smart money moves right here! 💸",
    "Future-you is smiling! 😊"
];

const CONFETTI_COLORS = ['#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#fb923c', '#fff'];

// ─── STORAGE ──────────────────────────────────────────────────────────
const DB = {
    get(key, def = null) {
        try { const v = localStorage.getItem(AUTH.prefix() + key); return v ? JSON.parse(v) : def; } catch { return def; }
    },
    set(key, val) { localStorage.setItem(AUTH.prefix() + key, JSON.stringify(val)); },
    pushHistory(section, field, oldVal, newVal) {
        const hist = DB.get('history_' + section, []);
        hist.unshift({ ts: Date.now(), field, old: oldVal, new: newVal });
        if (hist.length > 200) hist.pop();
        DB.set('history_' + section, hist);
    }
};


// ─── UTILS ────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n || 0);
const fmtFull = (n) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(n || 0);
const pct = (n) => (n || 0).toFixed(1) + '%';
const fmtDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
};
const randCheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerHTML = `<span>🎊</span> ${msg}`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
}

function launchConfetti() {
    const burst = document.createElement('div');
    burst.className = 'confetti-burst';
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.cssText = `
      left: ${Math.random() * 100}vw;
      background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
      animation-delay: ${Math.random() * 1.5}s;
      animation-duration: ${2 + Math.random() * 1.5}s;
      transform: rotate(${Math.random() * 360}deg);
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
        burst.appendChild(p);
    }
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 4000);
}

// ─── TAB NAVIGATION ───────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            if (btn.dataset.tab === 'tab-dashboard') renderDashboard();
            if (btn.dataset.tab === 'tab-projections') renderProjections();
            if (btn.dataset.tab === 'tab-simulator') renderSimulator();
            if (btn.dataset.tab === 'tab-advice') renderAdvice();
            if (btn.dataset.tab === 'tab-accounts') renderBankAccounts();
            if (btn.dataset.tab === 'tab-checkins') renderCheckIns();
        });
    });
}

// ─── INCOME MODULE ────────────────────────────────────────────────────
function initIncome() {
    const income = DB.get('income', { p1Name: 'Partner 1', p1Amount: 0, p2Name: 'Partner 2', p2Amount: 0 });
    document.getElementById('p1Name').value = income.p1Name;
    document.getElementById('p1Amount').value = income.p1Amount || '';
    document.getElementById('p2Name').value = income.p2Name;
    document.getElementById('p2Amount').value = income.p2Amount || '';

    document.getElementById('incomeForm').addEventListener('submit', e => {
        e.preventDefault();
        const old = DB.get('income', {});
        const fresh = {
            p1Name: document.getElementById('p1Name').value || 'Partner 1',
            p1Amount: parseFloat(document.getElementById('p1Amount').value) || 0,
            p2Name: document.getElementById('p2Name').value || 'Partner 2',
            p2Amount: parseFloat(document.getElementById('p2Amount').value) || 0,
        };
        if (old.p1Amount !== fresh.p1Amount) DB.pushHistory('income', fresh.p1Name + ' Income', old.p1Amount, fresh.p1Amount);
        if (old.p2Amount !== fresh.p2Amount) DB.pushHistory('income', fresh.p2Name + ' Income', old.p2Amount, fresh.p2Amount);
        DB.set('income', fresh);
        renderIncomeHistoryPanel();
        updateIncomeCards();
        showToast(randCheer());
        launchConfetti();
    });
    updateIncomeCards();
    renderIncomeHistoryPanel();
    setupHistoryToggle('incomeHistoryToggle', 'incomeHistoryList');
}

function updateIncomeCards() {
    const inc = DB.get('income', { p1Name: 'Partner 1', p1Amount: 0, p2Name: 'Partner 2', p2Amount: 0 });
    const total = (inc.p1Amount || 0) + (inc.p2Amount || 0);
    document.getElementById('incomeP1Card').innerHTML = `<div class="stat-icon">💼</div><div class="stat-label">${inc.p1Name}</div><div class="stat-value purple">${fmt(inc.p1Amount)}</div><div class="stat-sub">per month</div>`;
    document.getElementById('incomeP2Card').innerHTML = `<div class="stat-icon">💼</div><div class="stat-label">${inc.p2Name}</div><div class="stat-value purple">${fmt(inc.p2Amount)}</div><div class="stat-sub">per month</div>`;
    document.getElementById('incomeTotalCard').innerHTML = `<div class="stat-icon">🏦</div><div class="stat-label">Combined Monthly</div><div class="stat-value positive">${fmt(total)}</div><div class="stat-sub">= ${fmt(total * 12)} / year</div>`;
}

function renderIncomeHistoryPanel() {
    const hist = DB.get('history_income', []);
    const list = document.getElementById('incomeHistoryList');
    if (!hist.length) { list.innerHTML = '<p class="text-muted text-sm" style="padding:10px 0">No history yet. Save your income to start tracking! 📝</p>'; return; }
    list.innerHTML = hist.slice(0, 30).map(h => `
    <div class="history-entry">
      <div class="history-dot"></div>
      <div class="history-time">${fmtDate(h.ts)}</div>
      <div class="history-text">${h.field}: <span class="old">${fmt(h.old)}</span> → <span class="new">${fmt(h.new)}</span></div>
    </div>
  `).join('');
}

// ─── EXPENSES MODULE ──────────────────────────────────────────────────
function initExpenses() {
    const expenses = DB.get('expenses', {});
    const container = document.getElementById('expenseList');
    container.innerHTML = EXPENSE_CATEGORIES.map(cat => `
    <div class="expense-item" id="exp-row-${cat.id}">
      <div style="display:flex;align-items:center;flex:1">
        <span class="expense-emoji">${cat.emoji}</span>
        <div>
          <div class="expense-name">${cat.name}</div>
          <div class="expense-desc">${cat.desc}</div>
        </div>
      </div>
      <div class="expense-input-wrap">
        <span style="color:var(--text-muted);font-size:0.9rem">CA$</span>
        <input class="expense-input" id="exp-${cat.id}" type="number" min="0" placeholder="0"
               value="${expenses[cat.id] || ''}" onchange="saveExpense('${cat.id}','${cat.name}')" />
      </div>
    </div>
  `).join('');
    updateExpenseSummary();
    renderExpenseHistoryPanel();
    setupHistoryToggle('expenseHistoryToggle', 'expenseHistoryList');
}

function saveExpense(id, name) {
    const old = DB.get('expenses', {})[id] || 0;
    const newVal = parseFloat(document.getElementById('exp-' + id).value) || 0;
    const expenses = DB.get('expenses', {});
    if (old !== newVal) DB.pushHistory('expenses', name, old, newVal);
    expenses[id] = newVal;
    DB.set('expenses', expenses);
    updateExpenseSummary();
    renderExpenseHistoryPanel();
    showToast('Expense updated! ' + randCheer());
}

function updateExpenseSummary() {
    const exp = DB.get('expenses', {});
    const total = Object.values(exp).reduce((a, b) => a + (b || 0), 0);
    const income = DB.get('income', { p1Amount: 0, p2Amount: 0 });
    const totalIncome = (income.p1Amount || 0) + (income.p2Amount || 0);
    const savingsRate = totalIncome > 0 ? Math.max(0, (totalIncome - total) / totalIncome * 100) : 0;
    document.getElementById('expenseTotalCard').innerHTML = `<div class="stat-icon">💸</div><div class="stat-label">Monthly Expenses</div><div class="stat-value" style="color:var(--accent5)">${fmt(total)}</div><div class="stat-sub">= ${fmt(total * 12)} / year</div>`;
    document.getElementById('expenseSavingsCard').innerHTML = `<div class="stat-icon">🌱</div><div class="stat-label">Savings Rate</div><div class="stat-value ${savingsRate >= 20 ? 'positive' : 'negative'}">${pct(savingsRate)}</div><div class="stat-sub">${savingsRate >= 20 ? '🔥 Excellent! Keep going!' : '⚠️ Aim for 20%+'}</div>`;
}

function renderExpenseHistoryPanel() {
    const hist = DB.get('history_expenses', []);
    const list = document.getElementById('expenseHistoryList');
    if (!hist.length) { list.innerHTML = '<p class="text-muted text-sm" style="padding:10px 0">No changes tracked yet. Start entering expenses! 💚</p>'; return; }
    list.innerHTML = hist.slice(0, 30).map(h => `
    <div class="history-entry">
      <div class="history-dot" style="background:var(--accent5)"></div>
      <div class="history-time">${fmtDate(h.ts)}</div>
      <div class="history-text">${h.field}: <span class="old">${fmt(h.old)}</span> → <span class="new">${fmt(h.new)}</span></div>
    </div>
  `).join('');
}

// ─── LOANS MODULE ─────────────────────────────────────────────────────
function initLoans() {
    renderLoanList();
    document.getElementById('addLoanBtn').addEventListener('click', showAddLoanForm);
    document.getElementById('cancelLoanBtn').addEventListener('click', hideAddLoanForm);
    document.getElementById('addLoanForm').addEventListener('submit', saveLoan);
    document.getElementById('loanType').addEventListener('change', toggleMortgageFields);
}

function toggleMortgageFields() {
    const isMortgage = document.getElementById('loanType').value === 'mortgage';
    document.getElementById('mortgageFields').style.display = isMortgage ? 'block' : 'none';
}

function showAddLoanForm() {
    document.getElementById('loanFormWrap').style.display = 'block';
    document.getElementById('addLoanBtn').style.display = 'none';
}
function hideAddLoanForm() {
    document.getElementById('loanFormWrap').style.display = 'none';
    document.getElementById('addLoanBtn').style.display = 'inline-flex';
    document.getElementById('addLoanForm').reset();
    document.getElementById('mortgageFields').style.display = 'none';
}

function saveLoan(e) {
    e.preventDefault();
    const loans = DB.get('loans', []);
    const type = document.getElementById('loanType').value;
    const loan = {
        id: Date.now(),
        type,
        name: document.getElementById('loanName').value,
        balance: parseFloat(document.getElementById('loanBalance').value) || 0,
        rate: parseFloat(document.getElementById('loanRate').value) || 0,
        monthly: parseFloat(document.getElementById('loanMonthly').value) || 0,
        term: parseInt(document.getElementById('loanTerm').value) || 0,
    };
    if (type === 'mortgage') {
        loan.purchasePrice = parseFloat(document.getElementById('purchasePrice').value) || 0;
        loan.frequency = document.getElementById('paymentFreq').value;
        loan.amortization = parseInt(document.getElementById('amortization').value) || 25;
    }
    loans.push(loan);
    DB.set('loans', loans);
    renderLoanList();
    hideAddLoanForm();
    showToast('Loan added! You\'ve got this. 💪');
}

function deleteLoan(id) {
    const loans = DB.get('loans', []).filter(l => l.id !== id);
    DB.set('loans', loans);
    renderLoanList();
}

function renderLoanList() {
    const loans = DB.get('loans', []);
    const container = document.getElementById('loanList');
    const totalDebt = loans.reduce((a, l) => a + (l.balance || 0), 0);
    const totalMonthly = loans.reduce((a, l) => a + (l.monthly || 0), 0);

    document.getElementById('loanSummaryDebt').textContent = fmt(totalDebt);
    document.getElementById('loanSummaryPayment').textContent = fmt(totalMonthly);

    if (!loans.length) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:3rem">🎉</div><p>No loans yet! Debt-free life! Add one if needed.</p></div>`;
        return;
    }

    const badges = { mortgage: 'badge-mortgage', car: 'badge-car', personal: 'badge-personal', heloc: 'badge-heloc', student: 'badge-student' };
    const icons = { mortgage: '🏠', car: '🚗', personal: '💳', heloc: '🏗️', student: '🎓' };

    container.innerHTML = loans.map(l => {
        const paidPct = l.purchasePrice ? Math.min(100, ((l.purchasePrice - l.balance) / l.purchasePrice * 100)) : 0;
        const monthsLeft = l.monthly > 0 ? Math.ceil(l.balance / l.monthly) : 0;
        const interest = ((l.balance * l.rate / 100) / 12).toFixed(0);
        return `
    <div class="loan-card">
      <div class="loan-card-header">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:2rem">${icons[l.type] || '💰'}</span>
          <div>
            <div style="font-weight:800;font-size:1.1rem">${l.name}</div>
            <span class="loan-type-badge ${badges[l.type] || 'badge-personal'}">${l.type.toUpperCase()}</span>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteLoan(${l.id})">✕ Remove</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">
        <div class="loan-stat"><div class="loan-stat-val" style="color:var(--danger)">${fmt(l.balance)}</div><div class="loan-stat-lbl">Balance</div></div>
        <div class="loan-stat"><div class="loan-stat-val" style="color:var(--accent3)">${l.rate}%</div><div class="loan-stat-lbl">Interest Rate</div></div>
        <div class="loan-stat"><div class="loan-stat-val" style="color:var(--accent2)">${fmt(l.monthly)}</div><div class="loan-stat-lbl">Monthly Pay</div></div>
        <div class="loan-stat"><div class="loan-stat-val" style="color:var(--primary)">${fmt(interest)}</div><div class="loan-stat-lbl">Monthly Interest</div></div>
        ${l.term ? `<div class="loan-stat"><div class="loan-stat-val" style="color:var(--accent4)">${l.term} yr</div><div class="loan-stat-lbl">Term</div></div>` : ''}
        ${monthsLeft ? `<div class="loan-stat"><div class="loan-stat-val">${monthsLeft} mo</div><div class="loan-stat-lbl">Est. Left</div></div>` : ''}
        ${l.amortization ? `<div class="loan-stat"><div class="loan-stat-val">${l.amortization} yr</div><div class="loan-stat-lbl">Amortization</div></div>` : ''}
        ${l.frequency ? `<div class="loan-stat"><div class="loan-stat-val" style="font-size:0.85rem">${l.frequency}</div><div class="loan-stat-lbl">Pay Frequency</div></div>` : ''}
      </div>
      ${l.purchasePrice ? `
        <div class="loan-progress">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.78rem;color:var(--text-muted)">
            <span>Equity built</span><span style="color:var(--accent2)">${pct(paidPct)}</span>
          </div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${paidPct}%"></div></div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">Purchase price: ${fmt(l.purchasePrice)}</div>
        </div>` : ''}
    </div>`;
    }).join('');
}

// ─── PROJECTIONS MODULE ───────────────────────────────────────────────
let projChart = null;

function computeProjections(viewType = 'yearly') {
    const income = DB.get('income', { p1Amount: 0, p2Amount: 0 });
    const totalIncome = (income.p1Amount || 0) + (income.p2Amount || 0);
    const expenses = DB.get('expenses', {});
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + (b || 0), 0);
    const loans = DB.get('loans', []);
    const totalLoanPayments = loans.reduce((a, l) => a + (l.monthly || 0), 0);

    const INFLATION = 0.025;
    const RETURN = 0.05;
    const MONTHS = 84;

    let netWorth = 0, savings = 0;
    // Rough starting equity from loans
    loans.forEach(l => { if (l.purchasePrice) netWorth += (l.purchasePrice - l.balance); });

    const labels = [], netWorthData = [], savingsData = [], debtData = [];
    let debt = loans.reduce((a, l) => a + (l.balance || 0), 0);
    let cumSavings = 0;

    for (let m = 1; m <= MONTHS; m++) {
        const yr = Math.floor((m - 1) / 12);
        const monthlyExpenses = totalExpenses * Math.pow(1 + INFLATION, yr);
        const monthlySavings = totalIncome - monthlyExpenses - totalLoanPayments;
        cumSavings += Math.max(0, monthlySavings);
        // Apply investment return monthly
        cumSavings *= (1 + RETURN / 12);
        // Reduce debt
        const loanPrincipal = loans.reduce((a, l) => {
            const interest = l.balance > 0 ? (l.balance * l.rate / 100 / 12) : 0;
            return a + Math.max(0, (l.monthly || 0) - interest);
        }, 0);
        debt = Math.max(0, debt - loanPrincipal);
        const nw = cumSavings + netWorth - debt + (loans.reduce((a, l) => a + ((l.purchasePrice || 0) * (INFLATION / 12) * m), 0));

        if (viewType === 'monthly') {
            labels.push(`Mo ${m}`);
            netWorthData.push(Math.round(nw));
            savingsData.push(Math.round(cumSavings));
            debtData.push(Math.round(debt));
        } else if (m % 12 === 0) {
            labels.push(`Year ${m / 12}`);
            netWorthData.push(Math.round(nw));
            savingsData.push(Math.round(cumSavings));
            debtData.push(Math.round(debt));
        }
    }
    return { labels, netWorthData, savingsData, debtData, totalIncome, totalExpenses, totalLoanPayments };
}

function renderProjections() {
    const viewType = document.getElementById('projFilter')?.value || 'yearly';
    const { labels, netWorthData, savingsData, debtData } = computeProjections(viewType);

    const ctx = document.getElementById('projChart').getContext('2d');
    if (projChart) projChart.destroy();

    projChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Net Worth', data: netWorthData, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.12)', fill: true, tension: 0.35, pointRadius: 3 },
                { label: 'Savings + Investments', data: savingsData, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', fill: true, tension: 0.35, pointRadius: 3 },
                { label: 'Remaining Debt', data: debtData, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', fill: true, tension: 0.35, pointRadius: 3 },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#9d9bbf', font: { family: 'Outfit', size: 12, weight: '600' } } },
                tooltip: {
                    backgroundColor: 'rgba(23,22,42,0.95)', titleColor: '#f0eeff', bodyColor: '#9d9bbf',
                    borderColor: 'rgba(167,139,250,0.3)', borderWidth: 1,
                    callbacks: { label: ctx => ' ' + fmt(ctx.raw) }
                }
            },
            scales: {
                x: { ticks: { color: '#9d9bbf', font: { family: 'Outfit' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: {
                    ticks: { color: '#9d9bbf', font: { family: 'Outfit' }, callback: v => fmt(v) },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

// ─── SIMULATOR MODULE ─────────────────────────────────────────────────
let simChart = null;

function renderSimulator() {
    updateSimResults();
}

function getSimInputs() {
    return {
        incomeMod: parseFloat(document.getElementById('simIncome').value) / 100,
        expenseMod: parseFloat(document.getElementById('simExpense').value) / 100,
        returnMod: parseFloat(document.getElementById('simReturn').value) / 100,
        extraSavings: parseFloat(document.getElementById('simExtra').value) || 0,
    };
}

function updateSimResults() {
    const sim = getSimInputs();
    const income = DB.get('income', { p1Amount: 0, p2Amount: 0 });
    const totalIncome = ((income.p1Amount || 0) + (income.p2Amount || 0)) * (1 + sim.incomeMod);
    const expenses = DB.get('expenses', {});
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + (b || 0), 0) * (1 + sim.expenseMod);
    const loans = DB.get('loans', []);
    const totalLoanPayments = loans.reduce((a, l) => a + (l.monthly || 0), 0);
    const returnRate = 0.05 + sim.returnMod;
    const INFLATION = 0.025;

    let netWorthStart = loans.reduce((a, l) => l.purchasePrice ? a + (l.purchasePrice - l.balance) : a, 0);

    function calcNW(years) {
        let debt = loans.reduce((a, l) => a + (l.balance || 0), 0);
        let savings = 0;
        for (let m = 1; m <= years * 12; m++) {
            const yr = Math.floor((m - 1) / 12);
            const monthExp = totalExpenses * Math.pow(1 + INFLATION, yr);
            const monthlySavings = totalIncome - monthExp - totalLoanPayments + sim.extraSavings;
            savings += Math.max(0, monthlySavings);
            savings *= (1 + returnRate / 12);
            const loanPrincipal = loans.reduce((a, l) => {
                const int = l.balance > 0 ? (l.balance * l.rate / 100 / 12) : 0;
                return a + Math.max(0, (l.monthly || 0) - int);
            }, 0);
            debt = Math.max(0, debt - loanPrincipal);
        }
        return savings + netWorthStart + (netWorthStart * INFLATION * years);
    }

    const nw1 = calcNW(1), nw3 = calcNW(3), nw5 = calcNW(5);
    document.getElementById('sim1yr').textContent = fmt(nw1);
    document.getElementById('sim3yr').textContent = fmt(nw3);
    document.getElementById('sim5yr').textContent = fmt(nw5);

    // Update slider display values
    document.getElementById('simIncomeDisplay').textContent = (sim.incomeMod >= 0 ? '+' : '') + (sim.incomeMod * 100).toFixed(0) + '%';
    document.getElementById('simExpenseDisplay').textContent = (sim.expenseMod >= 0 ? '+' : '') + (sim.expenseMod * 100).toFixed(0) + '%';
    document.getElementById('simReturnDisplay').textContent = ((0.05 + sim.returnMod) * 100).toFixed(1) + '%';
    document.getElementById('simExtraDisplay').textContent = fmt(sim.extraSavings);

    // Mini bar chart
    const ctx2 = document.getElementById('simChart').getContext('2d');
    if (simChart) simChart.destroy();
    simChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['1 Year', '3 Years', '5 Years'],
            datasets: [{
                label: 'Projected Net Worth',
                data: [nw1, nw3, nw5],
                backgroundColor: ['rgba(167,139,250,0.6)', 'rgba(52,211,153,0.6)', 'rgba(251,191,36,0.6)'],
                borderColor: ['#a78bfa', '#34d399', '#fbbf24'],
                borderWidth: 2, borderRadius: 10,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(23,22,42,0.95)', titleColor: '#f0eeff', bodyColor: '#9d9bbf',
                    callbacks: { label: ctx => ' ' + fmt(ctx.raw) }
                }
            },
            scales: {
                x: { ticks: { color: '#9d9bbf', font: { family: 'Outfit' } }, grid: { display: false } },
                y: { ticks: { color: '#9d9bbf', font: { family: 'Outfit' }, callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// ─── ADVICE ENGINE ────────────────────────────────────────────────────
function renderAdvice() {
    const income = DB.get('income', { p1Amount: 0, p2Amount: 0 });
    const totalIncome = (income.p1Amount || 0) + (income.p2Amount || 0);
    const expenses = DB.get('expenses', {});
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + (b || 0), 0);
    const loans = DB.get('loans', []);
    const totalLoanPayments = loans.reduce((a, l) => a + (l.monthly || 0), 0);
    const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses - totalLoanPayments) / totalIncome * 100 : 0;
    const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome * 100 : 0;
    const debtRatio = totalIncome > 0 ? totalLoanPayments / totalIncome * 100 : 0;
    const highRateLoan = loans.find(l => l.rate > 5);
    const dining = expenses['dining'] || 0;
    const travel = expenses['travel'] || 0;

    const tips = [];

    if (totalIncome === 0) {
        tips.push({ icon: '👋', title: 'Welcome! Start with your income', body: 'Head to the Income tab and enter both partners\' monthly income. This unlocks all projections and advice!', tag: 'tip', tagLabel: 'Get Started' });
    } else {
        if (savingsRate >= 30) tips.push({ icon: '🚀', title: 'Incredible savings rate!', body: `You're saving ${pct(savingsRate)} of your income. That's elite level! Consider maxing out your TFSAs and RRSP contributions to supercharge tax-free growth.`, tag: 'great', tagLabel: '🔥 Elite Saver' });
        else if (savingsRate >= 20) tips.push({ icon: '✨', title: 'Excellent savings habit!', body: `${pct(savingsRate)} savings rate — you're well above the Canadian average! Keep contributing to your TFSA (limit: $7,000/yr each in 2025) and RRSP.`, tag: 'great', tagLabel: '✅ On Track' });
        else if (savingsRate >= 10) tips.push({ icon: '📈', title: 'Good start — push to 20%!', body: `You're saving ${pct(savingsRate)} monthly. Try the 1% challenge: increase savings by just 1% each month. With ${fmt(totalIncome * 0.2 - (totalIncome - totalExpenses))} more saved monthly, you'd hit 20%.`, tag: 'warn', tagLabel: '⚡ Room to Grow' });
        else tips.push({ icon: '⚠️', title: 'Savings rate needs attention', body: `At ${pct(savingsRate)}, you're spending more than you should. Target: spend max 50% on needs, 30% on wants, 20% savings. Review dining and entertainment first.`, tag: 'alert', tagLabel: '🚨 Action Needed' });

        if (debtRatio > 35) tips.push({ icon: '💳', title: 'Debt payments are high', body: `Your loan payments consume ${pct(debtRatio)} of income. Aim to keep debt payments below 35%. Consider bi-weekly mortgage payments to shave years off your amortization.`, tag: 'alert', tagLabel: '🚨 High Debt Load' });
        else if (debtRatio > 20) tips.push({ icon: '💡', title: 'Debt is manageable — optimize it', body: `${pct(debtRatio)} in debt payments is acceptable. Try paying an extra $${Math.round(loans[0]?.monthly * 0.1 || 200)} on your highest-rate loan monthly to save thousands in interest.`, tag: 'warn', tagLabel: '⚡ Optimize' });
        else if (debtRatio > 0) tips.push({ icon: '🎯', title: 'Great debt-to-income ratio!', body: `Only ${pct(debtRatio)} goes to debt. You\'re in a healthy zone. Consider using the "debt avalanche" method — pay extra on highest-rate loans first.`, tag: 'great', tagLabel: '✅ Healthy' });

        if (highRateLoan) tips.push({ icon: '🔥', title: `High-interest loan alert — ${highRateLoan.name}`, body: `${highRateLoan.name} at ${highRateLoan.rate}% is costing you ${fmt(highRateLoan.balance * highRateLoan.rate / 100 / 12)}/month in interest. Refinancing or making lump-sum payments could save you significantly.`, tag: 'alert', tagLabel: '🎯 Priority Payoff' });

        if (dining > totalIncome * 0.10) tips.push({ icon: '🍽️', title: 'Dining budget is high', body: `You're spending ${pct(dining / totalIncome * 100)} on dining out. The Canadian average is 5-7%. Meal prepping 2-3 dinners a week could save ${fmt(dining * 0.3)}/month.`, tag: 'warn', tagLabel: '💡 Tip' });
        else tips.push({ icon: '🥗', title: 'Great food spending discipline!', body: `Your dining spend of ${fmt(dining)}/month is healthy. Consider a weekly "date night budget" to maintain balance without overspending.`, tag: 'tip', tagLabel: '💚 Nice!' });

        tips.push({ icon: '🏦', title: 'Use your TFSA to the fullest', body: `In Canada, couples can contribute up to $14,000/year combined to TFSAs (2025). All growth and withdrawals are tax-free. If you have unused room, prioritize this before non-registered investing.`, tag: 'tip', tagLabel: '🇨🇦 Canada Tip' });

        tips.push({ icon: '🏠', title: 'Condo living advantage', body: `Condo fees are predictable vs house maintenance. Use this predictability: automate your savings on payday so the "lifestyle creep" never kicks in. Set up auto-transfers to savings.`, tag: 'tip', tagLabel: '🏡 Condo Tip' });

        if (travel > 0) tips.push({ icon: '✈️', title: 'Smart travel saving!', body: `You're saving ${fmt(travel)}/month for travel. Look into an Aeroplan or Scotiabank Passport Visa card for travel points — you could save 20-40% on flights as a couple.`, tag: 'tip', tagLabel: '✈️ Travel Hack' });

        tips.push({ icon: '📅', title: 'Schedule monthly money dates', body: `The best financial habit for a couple: a monthly 30-min "money date." Review this app together, celebrate wins 🎉, and adjust one category each month. Small tweaks compound over years!`, tag: 'tip', tagLabel: '💑 Couple Tip' });
    }

    document.getElementById('adviceContainer').innerHTML = tips.map(t => `
    <div class="advice-card">
      <div class="advice-icon">${t.icon}</div>
      <div>
        <div class="advice-title">${t.title}</div>
        <div class="advice-body">${t.body}</div>
        <span class="advice-tag tag-${t.tag}">${t.tagLabel}</span>
      </div>
    </div>
  `).join('');
}

// ─── DASHBOARD ────────────────────────────────────────────────────────
function renderDashboard() {
    const income = DB.get('income', { p1Name: 'Partner 1', p1Amount: 0, p2Name: 'Partner 2', p2Amount: 0 });
    const totalIncome = (income.p1Amount || 0) + (income.p2Amount || 0);
    const expenses = DB.get('expenses', {});
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + (b || 0), 0);
    const loans = DB.get('loans', []);
    const totalLoan = loans.reduce((a, l) => a + (l.monthly || 0), 0);
    const totalDebt = loans.reduce((a, l) => a + (l.balance || 0), 0);
    const accounts = DB.get('accounts', []);
    const totalCash = accounts.reduce((a, acc) => a + (acc.balance || 0), 0);
    const monthly = totalIncome - totalExpenses - totalLoan;
    const savingsRate = totalIncome > 0 ? Math.max(0, monthly / totalIncome * 100) : 0;
    const annualSavings = Math.max(0, monthly) * 12;
    const equity = loans.reduce((a, l) => l.purchasePrice ? a + (l.purchasePrice - l.balance) : a, 0);
    const netWorthNow = totalCash + equity;

    document.getElementById('dashNet').textContent = fmt(monthly);
    document.getElementById('dashNet').className = 'stat-value ' + (monthly >= 0 ? 'positive' : 'negative');
    document.getElementById('dashIncome').textContent = fmt(totalIncome);
    document.getElementById('dashExpenses').textContent = fmt(totalExpenses + totalLoan);
    document.getElementById('dashSavingsRate').textContent = pct(savingsRate);
    document.getElementById('dashAnnual').textContent = fmt(annualSavings);
    document.getElementById('dashDebt').textContent = fmt(totalDebt);
    document.getElementById('dashCash').textContent = fmt(totalCash);
    document.getElementById('dashNetWorthNow').textContent = fmt(netWorthNow);

    // Random encouraging message
    const msgs = [
        `💑 You two are building something amazing together!`,
        `🌟 Every month you budget = one step closer to your dreams!`,
        `🎯 Small steps, big dreams — you've got this!`,
        `🚀 Your future selves will thank you for starting today!`,
        `💚 Love your budget = love your future life!`
    ];
    document.getElementById('dashCheer').textContent = msgs[Math.floor(Math.random() * msgs.length)];

    // Top expense categories
    const topCats = EXPENSE_CATEGORIES
        .map(c => ({ ...c, amount: expenses[c.id] || 0 }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    document.getElementById('dashTopExpenses').innerHTML = topCats.map(c => {
        const w = totalExpenses > 0 ? (c.amount / totalExpenses * 100) : 0;
        return `
    <div style="margin-bottom:12px">
      <div class="flex-between mb-4" style="margin-bottom:6px">
        <span>${c.emoji} ${c.name}</span>
        <span class="fw-800" style="color:var(--accent3)">${fmt(c.amount)}</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${w}%;background:linear-gradient(90deg,var(--accent5),var(--accent3))"></div></div>
    </div>`;
    }).join('');
}

// ─── HISTORY TOGGLE HELPER ────────────────────────────────────────────
function setupHistoryToggle(btnId, listId) {
    document.getElementById(btnId).addEventListener('click', () => {
        const list = document.getElementById(listId);
        list.classList.toggle('open');
        document.getElementById(btnId).querySelector('.toggle-arrow').textContent = list.classList.contains('open') ? '▲' : '▼';
    });
}

// ─── BANK ACCOUNTS MODULE ─────────────────────────────────────────────
const ACCOUNT_TYPES = [
    { id: 'chequing', emoji: '🏦', name: 'Chequing Account', color: 'var(--accent4)' },
    { id: 'savings', emoji: '🐷', name: 'Savings Account', color: 'var(--accent2)' },
    { id: 'tfsa', emoji: '🍁', name: 'TFSA', color: 'var(--primary)' },
    { id: 'rrsp', emoji: '🏔️', name: 'RRSP', color: 'var(--accent1)' },
    { id: 'investment', emoji: '📈', name: 'Investment Account', color: 'var(--accent3)' },
    { id: 'emergency', emoji: '🛡️', name: 'Emergency Fund', color: 'var(--accent5)' },
    { id: 'hfsa', emoji: '💊', name: 'Health Spending Acct', color: 'var(--accent1)' },
    { id: 'other', emoji: '💳', name: 'Other / GIC / FHSA', color: 'var(--text-muted)' },
];

function initBankAccounts() {
    renderBankAccounts();
    document.getElementById('addAccountBtn').addEventListener('click', () => {
        document.getElementById('accountFormWrap').style.display = 'block';
        document.getElementById('addAccountBtn').style.display = 'none';
    });
    document.getElementById('cancelAccountBtn').addEventListener('click', () => {
        document.getElementById('accountFormWrap').style.display = 'none';
        document.getElementById('addAccountBtn').style.display = 'inline-flex';
        document.getElementById('addAccountForm').reset();
    });
    document.getElementById('addAccountForm').addEventListener('submit', saveAccount);
}

function saveAccount(e) {
    e.preventDefault();
    const accounts = DB.get('accounts', []);
    const type = document.getElementById('accType').value;
    const typeDef = ACCOUNT_TYPES.find(a => a.id === type) || ACCOUNT_TYPES[7];
    const acc = {
        id: Date.now(),
        type,
        emoji: typeDef.emoji,
        institution: document.getElementById('accInstitution').value,
        name: document.getElementById('accName').value || typeDef.name,
        balance: parseFloat(document.getElementById('accBalance').value) || 0,
        owner: document.getElementById('accOwner').value,
        lastUpdated: Date.now(),
    };
    accounts.push(acc);
    DB.set('accounts', accounts);
    DB.pushHistory('accounts', acc.name, 0, acc.balance);
    renderBankAccounts();
    document.getElementById('accountFormWrap').style.display = 'none';
    document.getElementById('addAccountBtn').style.display = 'inline-flex';
    document.getElementById('addAccountForm').reset();
    showToast('Account added! 🏦 ' + randCheer());
    launchConfetti();
}

function updateAccountBalance(id) {
    const accounts = DB.get('accounts', []);
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) return;
    const old = accounts[idx].balance;
    const newVal = parseFloat(document.getElementById('acc-bal-' + id).value) || 0;
    DB.pushHistory('accounts', accounts[idx].name + ' Balance', old, newVal);
    accounts[idx].balance = newVal;
    accounts[idx].lastUpdated = Date.now();
    DB.set('accounts', accounts);
    renderBankAccounts();
    showToast('Balance updated! 💰 ' + randCheer());
}

function deleteAccount(id) {
    const accounts = DB.get('accounts', []).filter(a => a.id !== id);
    DB.set('accounts', accounts);
    renderBankAccounts();
}

function renderBankAccounts() {
    const accounts = DB.get('accounts', []);
    const hist = DB.get('history_accounts', []);
    const totalCash = accounts.reduce((a, acc) => a + (acc.balance || 0), 0);
    const loans = DB.get('loans', []);
    const equity = loans.reduce((a, l) => l.purchasePrice ? a + (l.purchasePrice - l.balance) : a, 0);
    const totalDebt = loans.reduce((a, l) => a + (l.balance || 0), 0);
    const netWorthNow = totalCash + equity;

    document.getElementById('accTotalCash').textContent = fmt(totalCash);
    document.getElementById('accEquity').textContent = fmt(equity);
    document.getElementById('accNetWorth').textContent = fmt(netWorthNow);
    document.getElementById('accTotalDebt').textContent = fmt(totalDebt);

    const container = document.getElementById('accountList');
    if (!accounts.length) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:3rem">🏦</div><p>No accounts yet! Add one to see your real net worth.</p></div>`;
    } else {
        const income = DB.get('income', { p1Name: 'Partner 1', p2Name: 'Partner 2' });
        container.innerHTML = accounts.map(acc => {
            const typeDef = ACCOUNT_TYPES.find(a => a.id === acc.type) || ACCOUNT_TYPES[7];
            return `
            <div class="loan-card" style="border-left: 3px solid ${typeDef.color}">
              <div class="loan-card-header">
                <div style="display:flex;align-items:center;gap:12px">
                  <span style="font-size:2rem">${acc.emoji}</span>
                  <div>
                    <div style="font-weight:800;font-size:1rem">${acc.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">${acc.institution || ''} · ${acc.owner || 'Joint'} · Updated ${fmtDate(acc.lastUpdated)}</div>
                  </div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deleteAccount(${acc.id})">✕</button>
              </div>
              <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
                <div class="loan-stat" style="flex:1;min-width:140px">
                  <div class="loan-stat-val" style="color:${typeDef.color};font-size:1.5rem">${fmt(acc.balance)}</div>
                  <div class="loan-stat-lbl">Current Balance</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px">
                  <span style="color:var(--text-muted);font-size:0.85rem">Update:</span>
                  <input class="expense-input" id="acc-bal-${acc.id}" type="number" value="${acc.balance}" placeholder="0" style="width:140px" />
                  <button class="btn btn-success btn-sm" onclick="updateAccountBalance(${acc.id})">✓ Save</button>
                </div>
              </div>
            </div>`;
        }).join('');
    }

    // History
    const histEl = document.getElementById('accountHistoryList');
    if (!hist.length) {
        histEl.innerHTML = '<p class="text-muted text-sm" style="padding:10px 0">No balance changes tracked yet.</p>';
    } else {
        histEl.innerHTML = hist.slice(0, 40).map(h => `
            <div class="history-entry">
              <div class="history-dot" style="background:var(--accent4)"></div>
              <div class="history-time">${fmtDate(h.ts)}</div>
              <div class="history-text">${h.field}: <span class="old">${fmt(h.old)}</span> → <span class="new">${fmt(h.new)}</span></div>
            </div>`).join('');
    }
}

// ─── CHECK-INS MODULE ─────────────────────────────────────────────────
let checkInDevChart = null;

function initCheckIns() {
    renderCheckIns();
    document.getElementById('addCheckInBtn').addEventListener('click', () => {
        document.getElementById('checkInFormWrap').style.display = 'block';
        document.getElementById('addCheckInBtn').style.display = 'none';
    });
    document.getElementById('cancelCheckInBtn').addEventListener('click', () => {
        document.getElementById('checkInFormWrap').style.display = 'none';
        document.getElementById('addCheckInBtn').style.display = 'inline-flex';
        document.getElementById('addCheckInForm').reset();
    });
    document.getElementById('addCheckInForm').addEventListener('submit', saveCheckIn);
    document.getElementById('logActualForm').addEventListener('submit', logActual);
    // Auto-generate upcoming check-ins from today if none exist
    if (!DB.get('checkins', []).length) autoGenerateCheckIns();
}

function autoGenerateCheckIns() {
    const now = new Date();
    const milestones = [
        { label: '3-Month Check-in 🌱', months: 3 },
        { label: '6-Month Mid-Year 🎯', months: 6 },
        { label: '1-Year Anniversary 🎉', months: 12 },
        { label: '2-Year Milestone 🚀', months: 24 },
        { label: '3-Year Review 💎', months: 36 },
        { label: '5-Year Vision 👑', months: 60 },
    ];
    const { netWorthData } = computeProjections('yearly');
    const checkins = milestones.map((m, i) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() + m.months);
        const projectedNW = netWorthData[Math.floor(m.months / 12) - 1] || 0;
        return {
            id: Date.now() + i,
            label: m.label,
            date: d.toISOString().split('T')[0],
            projectedNetWorth: projectedNW,
            projectedSavings: projectedNW * 0.6,
            actualNetWorth: null,
            actualSavings: null,
            notes: '',
            done: false,
        };
    });
    DB.set('checkins', checkins);
}

function saveCheckIn(e) {
    e.preventDefault();
    const checkins = DB.get('checkins', []);
    const { netWorthData } = computeProjections('yearly');
    const dateVal = document.getElementById('ciDate').value;
    const monthsDiff = Math.round((new Date(dateVal) - new Date()) / (1000 * 60 * 60 * 24 * 30));
    const yearIdx = Math.max(0, Math.round(monthsDiff / 12) - 1);
    const projNW = netWorthData[yearIdx] || 0;
    checkins.push({
        id: Date.now(),
        label: document.getElementById('ciLabel').value,
        date: dateVal,
        projectedNetWorth: projNW,
        projectedSavings: projNW * 0.6,
        actualNetWorth: null,
        actualSavings: null,
        notes: '',
        done: false,
    });
    checkins.sort((a, b) => new Date(a.date) - new Date(b.date));
    DB.set('checkins', checkins);
    renderCheckIns();
    document.getElementById('checkInFormWrap').style.display = 'none';
    document.getElementById('addCheckInBtn').style.display = 'inline-flex';
    document.getElementById('addCheckInForm').reset();
    showToast('Check-in scheduled! 📅 Looking forward!');
}

function logActual(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('logActualId').value);
    const checkins = DB.get('checkins', []);
    const idx = checkins.findIndex(c => c.id === id);
    if (idx === -1) return;
    const actualNW = parseFloat(document.getElementById('logNW').value) || 0;
    const actualSav = parseFloat(document.getElementById('logSav').value) || 0;
    const notes = document.getElementById('logNotes').value;
    checkins[idx].actualNetWorth = actualNW;
    checkins[idx].actualSavings = actualSav;
    checkins[idx].notes = notes;
    checkins[idx].done = true;
    DB.set('checkins', checkins);
    document.getElementById('logActualModal').style.display = 'none';
    renderCheckIns();
    const devNW = actualNW - (checkins[idx].projectedNetWorth || 0);
    const emoji = devNW >= 0 ? '🎉' : '📊';
    showToast(`${emoji} Check-in logged! ${devNW >= 0 ? 'You beat the projection!' : 'Keep going!'} `);
    if (devNW >= 0) launchConfetti();
}

function openLogActual(id) {
    const checkins = DB.get('checkins', []);
    const ci = checkins.find(c => c.id === id);
    if (!ci) return;
    document.getElementById('logActualId').value = id;
    document.getElementById('logActualLabel').textContent = ci.label + ' — ' + ci.date;
    document.getElementById('logNW').value = ci.actualNetWorth || '';
    document.getElementById('logSav').value = ci.actualSavings || '';
    document.getElementById('logNotes').value = ci.notes || '';
    document.getElementById('logActualModal').style.display = 'flex';
}

function deleteCheckIn(id) {
    const checkins = DB.get('checkins', []).filter(c => c.id !== id);
    DB.set('checkins', checkins);
    renderCheckIns();
}

function renderCheckIns() {
    const checkins = DB.get('checkins', []);
    const today = new Date();
    const container = document.getElementById('checkInList');
    const done = checkins.filter(c => c.done);
    const upcoming = checkins.filter(c => !c.done);

    container.innerHTML = checkins.map(ci => {
        const ciDate = new Date(ci.date);
        const isPast = ciDate < today;
        const daysAway = Math.round((ciDate - today) / (1000 * 60 * 60 * 24));
        const devNW = ci.done ? (ci.actualNetWorth - (ci.projectedNetWorth || 0)) : null;
        const devPct = ci.done && ci.projectedNetWorth ? (devNW / ci.projectedNetWorth * 100) : null;
        const status = ci.done
            ? (devNW >= 0 ? '✅ Ahead' : '⚠️ Behind')
            : (isPast ? '🔴 Overdue' : `📅 In ${daysAway} days`);
        const statusColor = ci.done
            ? (devNW >= 0 ? 'var(--accent2)' : 'var(--accent3)')
            : (isPast ? 'var(--danger)' : 'var(--primary)');

        return `
        <div class="loan-card" style="border-left:3px solid ${statusColor}">
          <div class="loan-card-header">
            <div>
              <div style="font-weight:800;font-size:1rem">${ci.label}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">${ci.date} · <span style="color:${statusColor};font-weight:700">${status}</span></div>
            </div>
            <div style="display:flex;gap:8px">
              ${!ci.done ? `<button class="btn btn-primary btn-sm" onclick="openLogActual(${ci.id})">📝 Log Actual</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="deleteCheckIn(${ci.id})">✕</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
            <div class="loan-stat">
              <div class="loan-stat-val" style="color:var(--primary)">${fmt(ci.projectedNetWorth)}</div>
              <div class="loan-stat-lbl">🔮 Projected Net Worth</div>
            </div>
            ${ci.done ? `
            <div class="loan-stat">
              <div class="loan-stat-val" style="color:${devNW >= 0 ? 'var(--accent2)' : 'var(--danger)'}">${fmt(ci.actualNetWorth)}</div>
              <div class="loan-stat-lbl">✅ Actual Net Worth</div>
            </div>
            <div class="loan-stat">
              <div class="loan-stat-val" style="color:${devNW >= 0 ? 'var(--accent2)' : 'var(--danger)'}">${devNW >= 0 ? '+' : ''}${fmt(devNW)}</div>
              <div class="loan-stat-lbl">${devNW >= 0 ? '📈 Ahead by' : '📉 Behind by'}</div>
            </div>
            <div class="loan-stat">
              <div class="loan-stat-val" style="color:${devNW >= 0 ? 'var(--accent2)' : 'var(--danger)'}">${devNW >= 0 ? '+' : ''}${pct(devPct)}</div>
              <div class="loan-stat-lbl">Deviation</div>
            </div>
            ` : ''}
          </div>
          ${ci.notes ? `<div style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:0.82rem;color:var(--text-muted)">📝 ${ci.notes}</div>` : ''}
        </div>`;
    }).join('') || `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:3rem">📅</div><p>No check-ins yet!</p></div>`;

    // Summary stats
    document.getElementById('ciTotalScheduled').textContent = checkins.length;
    document.getElementById('ciDone').textContent = done.length;
    document.getElementById('ciUpcoming').textContent = upcoming.length;

    // Deviation chart (only if at least 1 completed)
    const doneItems = checkins.filter(c => c.done);
    const devChartWrap = document.getElementById('devChartWrap');
    if (doneItems.length >= 1) {
        devChartWrap.style.display = 'block';
        const ctx = document.getElementById('devChart').getContext('2d');
        if (checkInDevChart) checkInDevChart.destroy();
        checkInDevChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: doneItems.map(c => c.label.split(' ').slice(0, 2).join(' ')),
                datasets: [
                    { label: '🔮 Projected NW', data: doneItems.map(c => c.projectedNetWorth), backgroundColor: 'rgba(167,139,250,0.5)', borderColor: '#a78bfa', borderWidth: 2, borderRadius: 8 },
                    { label: '✅ Actual NW', data: doneItems.map(c => c.actualNetWorth), backgroundColor: 'rgba(52,211,153,0.5)', borderColor: '#34d399', borderWidth: 2, borderRadius: 8 },
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#9d9bbf', font: { family: 'Outfit', weight: '600' } } },
                    tooltip: { backgroundColor: 'rgba(23,22,42,0.95)', callbacks: { label: c => ' ' + fmt(c.raw) } }
                },
                scales: {
                    x: { ticks: { color: '#9d9bbf', font: { family: 'Outfit' } }, grid: { display: false } },
                    y: { ticks: { color: '#9d9bbf', font: { family: 'Outfit' }, callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    } else {
        devChartWrap.style.display = 'none';
    }
}

// ─── INIT ─────────────────────────────────────────────────────────────

/** Fully initialise all app modules — called AFTER user is logged in */
function launchApp() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('onboardingOverlay').style.display = 'none';
    document.getElementById('appWrapper').style.display = '';

    renderUserBadge();
    initTabs();
    initIncome();
    initExpenses();
    initLoans();
    initBankAccounts();
    initCheckIns();
    renderDashboard();

    // Projection filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('projFilter').value = btn.dataset.view;
            renderProjections();
        });
    });

    // Simulator sliders
    ['simIncome', 'simExpense', 'simReturn', 'simExtra'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateSimResults);
    });

    // Close modal on backdrop click
    document.getElementById('logActualModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
    document.getElementById('modalCloseBtn').addEventListener('click', () => {
        document.getElementById('logActualModal').style.display = 'none';
    });

    // Welcome animation
    const user = AUTH.current;
    setTimeout(() => {
        showToast(`Welcome back, ${user?.coupleName || 'lovebirds'}! 💑`);
    }, 600);

    // Update date header
    const now = new Date();
    document.getElementById('headerDate').textContent =
        now.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/** Render the logged-in user badge in the header */
function renderUserBadge() {
    const user = AUTH.current;
    const badge = document.getElementById('userBadge');
    if (!badge || !user) return;
    badge.innerHTML = `
        <span class="user-avatar">${user.coupleName ? user.coupleName[0].toUpperCase() : '💑'}</span>
        <span class="user-name">${user.coupleName}</span>
        <button class="btn btn-ghost btn-sm" id="logoutBtn" style="padding:5px 12px;font-size:0.78rem">🚪 Logout</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => {
        AUTH.logout();
        location.reload();
    });
}

/** Render users on the login screen */
function renderUserList() {
    const users = AUTH.listUsers();
    const wrap = document.getElementById('loginUserList');
    if (!wrap) return;
    if (!users.length) {
        wrap.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center">No accounts yet — create one above! 👆</p>`;
        return;
    }
    wrap.innerHTML = users.map(u => `
        <button class="login-user-pill" data-username="${u.username}">
            <span class="user-avatar">${u.coupleName ? u.coupleName[0].toUpperCase() : '💑'}</span>
            <span>
                <div style="font-weight:700;font-size:0.9rem">${u.coupleName}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">@${u.username}</div>
            </span>
        </button>
    `).join('');

    wrap.querySelectorAll('.login-user-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            // Pre-fill username field and focus PIN
            const usernameInput = document.getElementById('loginUsername');
            if (usernameInput) {
                usernameInput.value = btn.dataset.username;
                document.getElementById('loginPin')?.focus();
            }
            // Scroll to sign-in form
            document.getElementById('loginFormWrap')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

/** Initialise the login screen */
function initLogin() {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const pin = document.getElementById('loginPin').value.trim();
        const errEl = document.getElementById('loginError');
        const res = AUTH.login(username, pin);
        if (!res.ok) {
            errEl.textContent = res.msg;
            errEl.style.display = 'block';
            return;
        }
        errEl.style.display = 'none';
        if (AUTH.isOnboarded()) {
            launchApp();
        } else {
            ONBOARDING.start();
        }
    });

    // Create account form
    document.getElementById('createAccountForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('caUsername').value.trim();
        const pin = document.getElementById('caPin').value.trim();
        const pinConfirm = document.getElementById('caPinConfirm').value.trim();
        const coupleName = document.getElementById('caCoupleName').value.trim();
        const p1Name = document.getElementById('caP1Name').value.trim();
        const p2Name = document.getElementById('caP2Name').value.trim();
        const errEl = document.getElementById('createError');

        if (pin.length < 4 || !/^\d{4,6}$/.test(pin)) {
            errEl.textContent = 'PIN must be 4–6 digits.'; errEl.style.display = 'block'; return;
        }
        if (pin !== pinConfirm) {
            errEl.textContent = 'PINs do not match.'; errEl.style.display = 'block'; return;
        }
        const res = AUTH.createUser(username, pin, coupleName, p1Name, p2Name);
        if (!res.ok) {
            errEl.textContent = res.msg; errEl.style.display = 'block'; return;
        }
        errEl.style.display = 'none';
        // First-time user → onboarding
        ONBOARDING.start();
    });

    // Toggle between Sign In / Create Account
    document.getElementById('showCreateBtn')?.addEventListener('click', () => {
        document.getElementById('loginFormWrap').style.display = 'none';
        document.getElementById('createFormWrap').style.display = '';
    });
    document.getElementById('showLoginBtn')?.addEventListener('click', () => {
        document.getElementById('loginFormWrap').style.display = '';
        document.getElementById('createFormWrap').style.display = 'none';
    });

    // Onboarding nav
    document.getElementById('obNext1')?.addEventListener('click', () => ONBOARDING.next());
    document.getElementById('obPrev2')?.addEventListener('click', () => ONBOARDING.prev());
    document.getElementById('obFinish')?.addEventListener('click', () => {
        // Collect any accounts added during onboarding step 2
        const rows = document.querySelectorAll('.ob-acc-row');
        const accounts = DB.get('accounts', []);
        rows.forEach(row => {
            const nameEl = row.querySelector('.ob-acc-name');
            const balEl = row.querySelector('.ob-acc-bal');
            const typeEl = row.querySelector('.ob-acc-type');
            if (!nameEl || !balEl || !balEl.value) return;
            accounts.push({
                id: Date.now() + Math.random(),
                type: typeEl?.value || 'savings',
                name: nameEl.value.trim(),
                institution: '',
                balance: parseFloat(balEl.value) || 0,
                owner: 'Joint',
                createdAt: Date.now()
            });
        });
        DB.set('accounts', accounts);
        ONBOARDING.finish();
    });

    // Add account row in onboarding
    document.getElementById('obAddAccBtn')?.addEventListener('click', addObAccountRow);

    renderUserList();
}

function addObAccountRow() {
    const wrap = document.getElementById('obAccounts');
    const row = document.createElement('div');
    row.className = 'ob-acc-row';
    row.style.cssText = 'display:flex;gap:10px;margin-bottom:10px;align-items:center';
    row.innerHTML = `
        <select class="form-select ob-acc-type" style="flex:0 0 140px;font-size:0.85rem">
            <option value="chequing">🏦 Chequing</option>
            <option value="savings">🐷 Savings</option>
            <option value="tfsa">🍁 TFSA</option>
            <option value="rrsp">🏔️ RRSP</option>
            <option value="investment">📈 Investment</option>
            <option value="emergency">🛡️ Emergency</option>
            <option value="other">💳 Other</option>
        </select>
        <input class="form-input ob-acc-name" type="text"   placeholder="Account label" style="flex:1;font-size:0.85rem">
        <input class="form-input ob-acc-bal"  type="number" placeholder="Balance $"     style="flex:0 0 120px;font-size:0.85rem" min="0">
        <button type="button" class="btn btn-danger btn-sm ob-rem-btn" style="padding:6px 10px">✕</button>
    `;
    row.querySelector('.ob-rem-btn').addEventListener('click', () => row.remove());
    wrap.appendChild(row);
}

document.addEventListener('DOMContentLoaded', () => {
    const appWrapper = document.getElementById('appWrapper');
    if (appWrapper) appWrapper.style.display = 'none';

    initLogin();

    // If already logged in from this session, resume directly
    if (AUTH.current) {
        if (AUTH.isOnboarded()) {
            launchApp();
        } else {
            ONBOARDING.start();
        }
    }
});

