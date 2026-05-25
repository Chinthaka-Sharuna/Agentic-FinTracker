var currency_unit = null;
const today = new Date();
const date = today.toDateString().split(' ');
var colorMap = null;

// DOM refs
var billingDate                = null;
var remainingBalance           = null;
var remainingBalancePercentage = null;
var spentAmount                = null;
var spentPercentage            = null;
var incomeAmount               = null;
var incomeMonthName            = null;
var lastLoggedIncomeDate       = null;
var totalBalance               = null;
var totalBalancePercentageChange = null;
var pieChartMonth              = null;
var pieChartCanvas             = null;
var recentTransactionHistory   = null;
var headingDateLine            = null;
var welcomeMessage             = null;
var progressBar                = null;


// ─── Update functions ─────────────────────────────────────────────────────────

function updateRemainingCard(remainingBudget, income, billDate = 1) {
    billingDate.textContent = `Until ${date[1]} ${billDate}`;
    let fmt = priceFormatter(remainingBudget).split('.');
    remainingBalance.innerHTML = `${fmt[0]}<span class="cents">.${fmt[1]}</span>`;
    remainingBalancePercentage.textContent = `${getPercentage(remainingBudget, income, 0)}% remaining`;
}

function updateSpentCard(amount, income) {
    let spentPercentageNum= getPercentage(amount, income, 0)
    spentPercentage.textContent = `${spentPercentageNum}% used`;
    let fmt = priceFormatter(amount).split('.');
    spentAmount.innerHTML = `${fmt[0]}<span class="cents">.${fmt[1]}</span>`;
    progressBar.style.width=`${spentPercentageNum}%`
}

function updateIncomeCard(amount, lastLoggedDate) {
    const dateObj = new Date(lastLoggedDate);
    const formattedDate = isNaN(dateObj.getTime())
        ? 'Not recorded yet'
        : dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    incomeMonthName.textContent      = `${date[1]} Income`;
    lastLoggedIncomeDate.textContent = `Logged ${formattedDate}`;

    let fmt = priceFormatter(amount).split('.');
    incomeAmount.innerHTML = `${fmt[0]}<span class="cents">.${fmt[1]}</span>`;
}

function updateTotalBalanceCard(totalBalanceAmount, percentageChange) {
    let fmt = priceFormatter(totalBalanceAmount || 0.00).split('.');
    totalBalance.innerHTML = `${fmt[0]}<span class="cents">.${fmt[1]}</span>`;
    if (percentageChange > 0) {
        totalBalancePercentageChange.textContent = `↑ ${percentageChange}%`;
        totalBalancePercentageChange.classList.replace('down', 'up');
    } else if (percentageChange < 0) {
        totalBalancePercentageChange.textContent = `↓ ${Math.abs(percentageChange)}%`;
        totalBalancePercentageChange.classList.replace('up', 'down');
    } else {
        totalBalancePercentageChange.textContent = `0%`;
        totalBalancePercentageChange.classList.remove('up', 'down');
    }
}

function updatePieChartCard(data, elementId) {
    if (!data || data.length === 0 || data.length === 1) {
        pieChartMonth.textContent = date[1].toUpperCase();
        elementId.parentElement.innerHTML = `
            <div style="
                display:flex;flex-direction:column;align-items:center;
                justify-content:center;padding:40px 20px;gap:8px;text-align:center;
            ">
                <div style="font-size:32px;">📊</div>
                <p style="font-size:14px;font-weight:600;color:var(--ink);margin:0;">No spending data</p>
                <p style="font-size:12px;color:var(--ink-muted);margin:0;">Your spending breakdown will appear here once you log some expenses.</p>
            </div>`;
        return;
    }

    pieChartMonth.textContent = date[1].toUpperCase();
    const chartData = prepareChartData(data);
    Chart.register(ChartDataLabels);

    new Chart(elementId, {
        type: 'pie',
        data: {
            labels: chartData.labels,
            datasets: [{ data: chartData.data, backgroundColor: chartData.colors }]
        },
        options: {
            layout: { padding: { left: 0, right: 0, top: 30, bottom: 20 } },
            plugins: {
                legend: { display: false },  // disabled — using custom HTML legend
                datalabels: {
                    color: (ctx) => ctx.dataset.backgroundColor[ctx.dataIndex],
                    font: { size: 11, weight: 'bold' },
                    formatter: (value, ctx) => {
                        const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        return Math.round(value / total * 100) + '%';
                    },
                    anchor: 'end', align: 'end', offset: 15
                }
            }
        }
    });

    // Build custom HTML legend in separate div
    const legendEl = document.getElementById('pie-chart-legend');
    if (legendEl) {
        legendEl.innerHTML = chartData.labels.map((label, i) => `
            <div class="pie-legend-item">
                <div class="pie-legend-box" style="background:${chartData.colors[i]}"></div>
                <span>${label}</span>
            </div>
        `).join('');
    }
}

function updateGreeting() {
    const user = JSON.parse(localStorage.getItem('ft_user') || '{}');
    const fullName = user.username || 'there';
    const firstName = fullName.split(' ')[0];
    welcomeMessage.innerHTML = `Welcome back, <span>${capitalize(firstName)}</span>.`;
}

function updateDateLine() {
    headingDateLine.textContent =
        `${today.toLocaleDateString('en-US', { weekday: 'long' })} · ${date[1]} ${date[2]}, ${date[3]}`;
}

function updateRecentTransactions(transactions) {
    recentTransactionHistory.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        recentTransactionHistory.innerHTML = `
            <li style="
                display:flex;flex-direction:column;align-items:center;
                justify-content:center;padding:40px 20px;gap:8px;text-align:center;
                list-style:none;
            ">
                <div style="font-size:32px;">📭</div>
                <p style="font-size:14px;font-weight:600;color:var(--ink);margin:0;">No transactions yet</p>
                <p style="font-size:12px;color:var(--ink-muted);margin:0;">Log an expense or upload a bank statement to get started.</p>
            </li>`;
        return;
    }

    const slice = transactions.length > 9 ? transactions.slice(0, 9) : transactions;
    slice.forEach(tx => {
        const category = capitalize(tx.category);
        recentTransactionHistory.insertAdjacentHTML('beforeend', `
            <li>
                <div class="tx-icon" style="background:${colorMap[tx.category]?.bg || colorMap['other'].bg};color:${colorMap[tx.category]?.color || colorMap['other'].color}">${category.charAt(0)}</div>
                <div class="tx-info">
                    <div class="tx-cat">${category}</div>
                    <div class="tx-desc">${tx.description} · ${new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                ${category === 'Salary'
                    ? `<div class="tx-amt income">+${priceFormatter(tx.amount)}</div>`
                    : `<div class="tx-amt">−${priceFormatter(tx.amount)}</div>`}
            </li>`);
    });
}


// ─── Main update entry point ──────────────────────────────────────────────────

export function updateDashboard(data) {
    updateRemainingCard(data.summary.remaining_budget, data.summary.total_income, data.next_bill_date);
    updateSpentCard(data.summary.spent_amount, data.summary.total_income);
    updateIncomeCard(data.summary.total_income, data.last_logged_income_date);
    updateTotalBalanceCard(data.summary.total_balance, data.summary.total_balance_percentage_change);
    updatePieChartCard(data.category, pieChartCanvas);
    updateRecentTransactions(data.transaction_history);
    updateGreeting();
    updateDateLine();
}


// ─── Utilities ───────────────────────────────────────────────────────────────

function priceFormatter(amount) {
    return (amount || 0).toLocaleString('en-US', { style: 'currency', currency: currency_unit || 'USD' });
}

function getPercentage(partialValue, totalValue, decimalPlaces = 0) {
    if (!totalValue) return '0';
    return ((partialValue / totalValue) * 100).toFixed(decimalPlaces);
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function prepareChartData(categories) {
    return {
        labels: categories.map(c => capitalize(c.category)),
        colors: categories.map(c => colorMap[c.category.toLowerCase()]?.color || colorMap['other'].color),
        data:   categories.map(c => c.percentage)
    };
}

async function initPage() {
    billingDate                = document.getElementById('billing-date');
    remainingBalance           = document.getElementById('remaining-balance');
    remainingBalancePercentage = document.getElementById('remaining-balance-percentage');
    spentAmount                = document.getElementById('spent-amount');
    spentPercentage            = document.getElementById('spent-percentage');
    incomeAmount               = document.getElementById('income-amount');
    incomeMonthName            = document.getElementById('income-month-name');
    lastLoggedIncomeDate       = document.getElementById('last-logged-income-date');
    totalBalance               = document.getElementById('account-total-balance');
    totalBalancePercentageChange = document.getElementById('total-balance-percentage-change');
    pieChartMonth              = document.getElementById('pie-chart-month-name');
    pieChartCanvas             = document.getElementById('pie-chart-month');
    recentTransactionHistory   = document.getElementById('recent-transaction-history');
    headingDateLine            = document.getElementById('heading-date-line');
    welcomeMessage             = document.getElementById('welcome-message');
    progressBar                = document.getElementById("progress-fill");

    colorMap = {
        "food":          { color: '#F97316', bg: '#FFEDD5' },
        "transport":     { color: '#0EA5E9', bg: '#E0F2FE' },
        "utilities":     { color: '#EAB308', bg: '#FEF9C3' },
        "rent":          { color: '#DC2626', bg: '#FEE2E2' },
        "healthcare":    { color: '#10B981', bg: '#D1FAE5' },
        "shopping":      { color: '#EC4899', bg: '#FCE7F3' },
        "entertainment": { color: '#8B5CF6', bg: '#EDE9FE' },
        "education":     { color: '#3B82F6', bg: '#DBEAFE' },
        "insurance":     { color: '#475569', bg: '#F1F5F9' },
        "subscriptions": { color: '#06B6D4', bg: '#CFFAFE' },
        "fuel":          { color: '#78350F', bg: '#FEF3C7' },
        "other":         { color: '#94A3B8', bg: '#F1F5F9' }
    };

    authFetch('/api/dashboard', { method: 'POST' })
        .then(res => {
            if (!res.ok) throw new Error('Could not fetch dashboard data');
            return res.json();
        })
        .then(data => {
            currency_unit = data.currency_unit || 'USD';
            updateDashboard(data);
        })
        .catch(err => {
            console.error('Dashboard fetch failed:', err);
        });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initPage);
window.addEventListener('pagerefresh', initPage);