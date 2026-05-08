var currency_unit = null;
var colorMap = null;
var allTransactions = [];
var openingBalance = 0;
var activeMonth = 'all';
var searchTerm = '';

var txCount       = null;
var txTotalCredit = null;
var txTotalDebit  = null;
var txNet         = null;
var txPanelSub    = null;
var monthFilter   = null;
var tbody         = null;
var txEmpty       = null;
var txSearch      = null;


// ─── Update functions ─────────────────────────────────────────────────────────

function updateSummaryStrip(transactions) {
    let totalCredit = 0, totalDebit = 0;
    transactions.forEach(tx => {
        if (tx.amount > 0) totalCredit += tx.amount;
        else totalDebit += Math.abs(tx.amount);
    });
    const net = totalCredit - totalDebit;

    txCount.textContent       = `${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`;
    txTotalCredit.textContent = priceFormatter(totalCredit);
    txTotalDebit.textContent  = priceFormatter(totalDebit);
    txNet.textContent         = priceFormatter(net);

    txNet.classList.remove('income', 'expense');
    if (net > 0) txNet.classList.add('income');
    else if (net < 0) txNet.classList.add('expense');

    txPanelSub.textContent = activeMonth === 'all'
        ? `Showing all ${transactions.length} transactions`
        : `Showing ${transactions.length} transactions for ${getMonthLabel(activeMonth)}`;
}

function updateMonthFilter(transactions) {
    const months = [...new Set(transactions.map(tx => getMonthKey(tx.date)))]
        .sort().reverse();
    months.forEach(monthKey => {
        const opt = document.createElement('option');
        opt.value = monthKey;
        opt.textContent = getMonthLabel(monthKey);
        monthFilter.appendChild(opt);
    });
}

function updateTransactionTable(transactions) {
    tbody.innerHTML = '';
    if (transactions.length === 0) { txEmpty.style.display = 'block'; return; }
    txEmpty.style.display = 'none';

    const displayList = [...transactions].reverse();
    displayList.forEach(tx => {
        const isCredit = tx.amount > 0;
        const debit    = isCredit ? '' : priceFormatter(Math.abs(tx.amount));
        const credit   = isCredit ? priceFormatter(tx.amount) : '';
        const category = capitalize(tx.category);
        const dotColor = colorMap[tx.category]?.color || colorMap['other'].color;

        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td class="col-date">${formatDate(tx.date)}</td>
                <td class="col-tx">
                    <div class="tx-cell">
                        <span class="tx-cell-dot" style="background:${dotColor}"></span>
                        <div>
                            <div class="tx-cell-desc">${escapeHTML(tx.description)}</div>
                            <div class="tx-cell-cat">${category}</div>
                        </div>
                    </div>
                </td>
                <td class="col-num debit">${debit}</td>
                <td class="col-num credit">${credit}</td>
                <td class="col-num balance">${priceFormatter(tx.balance)}</td>
            </tr>`);
    });
}


// ─── Main update entry point ──────────────────────────────────────────────────

export function updateTransactionsPage(data) {
    if (data) {
        currency_unit  = data.currency_unit || 'USD';
        openingBalance = data.opening_balance || 0;
        allTransactions = withRunningBalance(data.transaction_history, openingBalance);
        updateMonthFilter(allTransactions);
    }
    const filtered = getFilteredTransactions();
    updateTransactionTable(filtered);
    updateSummaryStrip(filtered);
}


// ─── Utilities ───────────────────────────────────────────────────────────────

function priceFormatter(amount) {
    return (amount || 0).toLocaleString('en-US', { style: 'currency', currency: currency_unit || 'USD' });
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMonthKey(dateStr) { return dateStr.slice(0, 7); }

function getMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-');
    return new Date(parseInt(year), parseInt(month) - 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function withRunningBalance(transactions, startingBalance) {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let balance = startingBalance;
    return sorted.map(tx => { balance += tx.amount; return { ...tx, balance }; });
}

function getFilteredTransactions() {
    return allTransactions.filter(tx => {
        const monthMatch  = activeMonth === 'all' || getMonthKey(tx.date) === activeMonth;
        const searchMatch = searchTerm === '' ||
            tx.description.toLowerCase().includes(searchTerm) ||
            tx.category.toLowerCase().includes(searchTerm);
        return monthMatch && searchMatch;
    });
}




// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    txCount       = document.getElementById('tx-count');
    txTotalCredit = document.getElementById('tx-total-credit');
    txTotalDebit  = document.getElementById('tx-total-debit');
    txNet         = document.getElementById('tx-net');
    txPanelSub    = document.getElementById('tx-panel-sub');
    monthFilter   = document.getElementById('month-filter');
    tbody         = document.getElementById('tx-tbody');
    txEmpty       = document.getElementById('tx-empty');
    txSearch      = document.getElementById('tx-search');

    monthFilter.addEventListener('change', (e) => { activeMonth = e.target.value; updateTransactionsPage(); });
    txSearch.addEventListener('input',    (e) => { searchTerm  = e.target.value.trim().toLowerCase(); updateTransactionsPage(); });

    colorMap = {
        food:          { color: '#F97316', bg: '#FFEDD5' },
        transport:     { color: '#0EA5E9', bg: '#E0F2FE' },
        utilities:     { color: '#EAB308', bg: '#FEF9C3' },
        rent:          { color: '#DC2626', bg: '#FEE2E2' },
        healthcare:    { color: '#10B981', bg: '#D1FAE5' },
        shopping:      { color: '#EC4899', bg: '#FCE7F3' },
        entertainment: { color: '#8B5CF6', bg: '#EDE9FE' },
        education:     { color: '#3B82F6', bg: '#DBEAFE' },
        insurance:     { color: '#475569', bg: '#F1F5F9' },
        subscriptions: { color: '#06B6D4', bg: '#CFFAFE' },
        fuel:          { color: '#78350F', bg: '#FEF3C7' },
        salary:        { color: '#16A34A', bg: '#DCFCE7' },
        other:         { color: '#94A3B8', bg: '#F1F5F9' }
    };

    try {
        // authFetch is defined in base.html — adds token + handles 401
        const res = await authFetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_date: startStr, end_date: endStr })
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();

        const normalizedData = {
            currency_unit:       'USD',
            opening_balance:     0,
            transaction_history: Array.isArray(data.transactions)
                ? data.transactions.map(tx => {
                    const category = (tx.category || 'other').toLowerCase();
                    let amount = Number(tx.amount) || 0;
                    amount = category === 'income' ? Math.abs(amount) : -Math.abs(amount);
                    return {
                        amount,
                        description: tx.description || capitalize(category),
                        category,
                        date: tx.date
                    };
                })
                : []
        };

        updateTransactionsPage(normalizedData);
    } catch (err) {
        console.error('Failed to load transactions:', err);
        txPanelSub.textContent  = 'Unable to load transactions';
        txEmpty.style.display   = 'block';
        tbody.innerHTML         = '';
    }
});