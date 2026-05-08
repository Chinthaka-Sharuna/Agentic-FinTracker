var currency_unit = 'USD';

// DOM refs
const goalsGrid      = document.getElementById('goals-grid');
const goalsEmpty     = document.getElementById('goals-empty');
const totalGoalsEl   = document.getElementById('total-goals');
const onTrackEl      = document.getElementById('goals-on-track');
const atRiskEl       = document.getElementById('goals-at-risk');
const totalTargetEl  = document.getElementById('goals-total-target');
const totalSavedEl   = document.getElementById('goals-total-saved');
const modalOverlay   = document.getElementById('modal-overlay');
const modalTitle     = document.getElementById('modal-title');
const modalSaveBtn   = document.getElementById('modal-save');

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
    savings:   '💰',
    travel:    '✈️',
    education: '📚',
    home:      '🏠',
    vehicle:   '🚗',
    health:    '❤️',
    tech:      '💻',
    other:     '🎯'
};

// ── Utilities ─────────────────────────────────────────────────────────────────
function priceFormatter(amount) {
    return (amount || 0).toLocaleString('en-US', { style: 'currency', currency: currency_unit });
}

function daysUntil(dateStr) {
    const today    = new Date();
    const deadline = new Date(dateStr);
    return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

function monthsUntil(dateStr) {
    const today    = new Date();
    const deadline = new Date(dateStr);
    return Math.max(1,
        (deadline.getFullYear() - today.getFullYear()) * 12 +
        (deadline.getMonth() - today.getMonth())
    );
}

function formatDeadline(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderGoals(goals) {
    goalsGrid.innerHTML = '';

    if (goals.length === 0) {
        goalsEmpty.style.display = 'flex';
        goalsGrid.style.display  = 'none';
        updateSummary([]);
        return;
    }

    goalsEmpty.style.display = 'none';
    goalsGrid.style.display  = 'grid';
    updateSummary(goals);

    goals.forEach(goal => {
        const pct          = Math.min(Math.round((goal.saved_amount / goal.target_amount) * 100), 100);
        const remaining    = goal.target_amount - goal.saved_amount;
        const months       = monthsUntil(goal.deadline);
        const monthlyNeeded = remaining > 0 ? remaining / months : 0;
        const days         = daysUntil(goal.deadline);
        const icon         = CATEGORY_ICONS[goal.category] || '🎯';

        const statusLabels = {
            'on-track':     'On Track',
            'at-risk':      'At Risk',
            'achieved':     'Achieved ✓',
            'not-feasible': 'Not Feasible'
        };

        const deadlineText = goal.status === 'achieved'
            ? 'Goal completed!'
            : days < 0
                ? `${Math.abs(days)} days overdue`
                : `${days} days left · ${formatDeadline(goal.deadline)}`;

        goalsGrid.insertAdjacentHTML('beforeend', `
            <div class="goal-card status-${goal.status}" data-id="${goal.id}">
                <div class="goal-card-header">
                    <div class="goal-card-icon">${icon}</div>
                    <div class="goal-card-title-group">
                        <p class="goal-card-title">${goal.title}</p>
                        <p class="goal-card-deadline">${deadlineText}</p>
                    </div>
                    <div class="goal-card-actions">
                        <button class="goal-card-btn edit" onclick="openEditGoalModal(${goal.id})" title="Edit">✏️</button>
                        <button class="goal-card-btn delete" onclick="deleteGoal(${goal.id})" title="Delete">🗑</button>
                    </div>
                </div>

                <div class="goal-card-amounts">
                    <span class="goal-card-saved">${priceFormatter(goal.saved_amount)}</span>
                    <span class="goal-card-target">of ${priceFormatter(goal.target_amount)}</span>
                </div>

                <div class="goal-card-bar">
                    <div class="goal-card-fill ${goal.status}" style="width:${pct}%"></div>
                </div>

                <div class="goal-card-footer">
                    <span class="goal-card-pct">${pct}% complete</span>
                    <span class="goal-card-status ${goal.status}">${statusLabels[goal.status] || goal.status}</span>
                </div>

                ${goal.status !== 'achieved' && remaining > 0 ? `
                <div class="goal-card-monthly">
                    Save <strong>${priceFormatter(monthlyNeeded)}/month</strong> to reach your goal on time.
                </div>` : ''}

                ${goal.notes ? `<div class="goal-card-notes">"${goal.notes}"</div>` : ''}
            </div>
        `);
    });
}

function updateSummary(goals) {
    const onTrack    = goals.filter(g => g.status === 'on-track' || g.status === 'achieved').length;
    const atRisk     = goals.filter(g => g.status === 'at-risk' || g.status === 'not-feasible').length;
    const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
    const totalSaved  = goals.reduce((sum, g) => sum + g.saved_amount,  0);

    totalGoalsEl.textContent  = goals.length;
    onTrackEl.textContent     = onTrack;
    atRiskEl.textContent      = atRisk;
    totalTargetEl.textContent = priceFormatter(totalTarget);
    totalSavedEl.textContent  = priceFormatter(totalSaved);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openAddGoalModal() {
    editingId = null;
    modalTitle.textContent = 'New Goal';
    modalSaveBtn.textContent = 'Save Goal';
    clearForm();
    // set default deadline to 6 months from now
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    document.getElementById('goal-deadline').value = sixMonths.toISOString().split('T')[0];
    modalOverlay.classList.add('open');
}

function openEditGoalModal(id) {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    editingId = id;
    modalTitle.textContent = 'Edit Goal';
    modalSaveBtn.textContent = 'Update Goal';

    document.getElementById('goal-title').value    = goal.title;
    document.getElementById('goal-target').value   = goal.target_amount;
    document.getElementById('goal-saved').value    = goal.saved_amount;
    document.getElementById('goal-deadline').value = goal.deadline;
    document.getElementById('goal-category').value = goal.category;
    document.getElementById('goal-notes').value    = goal.notes || '';

    modalOverlay.classList.add('open');
}

function closeModal() {
    modalOverlay.classList.remove('open');
    editingId = null;
    clearForm();
}

function clearForm() {
    document.getElementById('goal-title').value    = '';
    document.getElementById('goal-target').value   = '';
    document.getElementById('goal-saved').value    = '0';
    document.getElementById('goal-deadline').value = '';
    document.getElementById('goal-category').value = 'savings';
    document.getElementById('goal-notes').value    = '';
}

function saveGoal() {
    const title    = document.getElementById('goal-title').value.trim();
    const target   = parseFloat(document.getElementById('goal-target').value);
    const saved    = parseFloat(document.getElementById('goal-saved').value) || 0;
    const deadline = document.getElementById('goal-deadline').value;
    const category = document.getElementById('goal-category').value;
    const notes    = document.getElementById('goal-notes').value.trim();

    if (!title)    { alert('Please enter a goal title.');    return; }
    if (!target || target <= 0) { alert('Please enter a valid target amount.'); return; }
    if (!deadline) { alert('Please select a deadline.');     return; }

    // determine status based on simple feasibility
    const pct    = (saved / target) * 100;
    let status;
    if (pct >= 100)                     status = 'achieved';
    else if (daysUntil(deadline) < 0)   status = 'not-feasible';
    else if (pct >= 50)                 status = 'on-track';
    else if (daysUntil(deadline) < 60)  status = 'at-risk';
    else                                status = 'on-track';

    if (editingId !== null) {
        // update existing
        const idx = goals.findIndex(g => g.id === editingId);
        if (idx !== -1) {
            goals[idx] = { ...goals[idx], title, target_amount: target, saved_amount: saved, deadline, category, notes, status };
        }
    } else {
        // add new
        const newId = goals.length > 0 ? Math.max(...goals.map(g => g.id)) + 1 : 1;
        goals.push({ id: newId, title, target_amount: target, saved_amount: saved, deadline, category, notes, status });
    }

    closeModal();
    renderGoals();
}

function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    goals = goals.filter(g => g.id !== id);
    renderGoals();
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('add-goal-btn').addEventListener('click', openAddGoalModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-save').addEventListener('click', saveGoal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    var data=null;
    try {
        const res = await authFetch('/api/goals', {
            method: 'POST'
        });
        if (!res.ok) throw new Error('Failed to fetch goals');
        data = await res.json();
    } catch (err) {
        console.error('Failed to load goals:', err);
    }
    renderGoals(data.goals || []);
});