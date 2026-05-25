var currency_unit = 'USD';
var goals = [];
var editingId = null;

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
function renderGoals() {
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
        const pct           = Math.min(Math.round((goal.saved_amount / goal.target_amount) * 100), 100);
        const remaining     = goal.target_amount - goal.saved_amount;
        const months        = monthsUntil(goal.deadline);
        const monthlyNeeded = remaining > 0 ? remaining / months : 0;
        const days          = daysUntil(goal.deadline);
        const icon          = CATEGORY_ICONS[goal.category] || '🎯';

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
            <div class="goal-card status-${goal.status}" data-id="${goal.reference_id}">
                <div class="goal-card-header">
                    <div class="goal-card-icon">${icon}</div>
                    <div class="goal-card-title-group">
                        <p class="goal-card-title">${goal.goal_name}</p>
                        <p class="goal-card-deadline">${deadlineText}</p>
                    </div>
                    <div class="goal-card-actions">
                        <button class="goal-card-btn edit" onclick="openEditGoalModal(${goal.reference_id})" title="Edit">✏️</button>
                        <button class="goal-card-btn delete" onclick="deleteGoal(${goal.reference_id})" title="Delete">🗑</button>
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

                ${goal.goal_notes ? `<div class="goal-card-notes">"${goal.goal_notes}"</div>` : ''}
            </div>
        `);
    });
}

function updateSummary(goals) {
    const onTrack     = goals.filter(g => g.status === 'on-track' || g.status === 'achieved').length;
    const atRisk      = goals.filter(g => g.status === 'at-risk' || g.status === 'not-feasible').length;
    const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
    const totalSaved  = goals.reduce((sum, g) => sum + g.saved_amount,  0);

    totalGoalsEl.textContent  = goals.length;
    onTrackEl.textContent     = onTrack;
    atRiskEl.textContent      = atRisk;
    totalTargetEl.textContent = priceFormatter(totalTarget);
    totalSavedEl.textContent  = priceFormatter(totalSaved);
}

// ── Refresh goals from server ─────────────────────────────────────────────────
async function refreshGoals() {
    try {
        const res  = await authFetch('/api/goals', { method: 'POST' });
        const data = await res.json();
        goals = data?.goals || [];
        renderGoals();
    } catch (err) {
        console.error('Failed to refresh goals:', err);
    }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openAddGoalModal() {
    editingId = null;
    modalTitle.textContent   = 'New Goal';
    modalSaveBtn.textContent = 'Save Goal';
    clearForm();
    // set default deadline to 6 months from now
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    document.getElementById('goal-deadline').value = formatDateForInput(sixMonths);
    modalOverlay.classList.add('open');
}

function formatDateForInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function openEditGoalModal(reference_id) {
    const goal = goals.find(g => g.reference_id === reference_id);
    if (!goal) return;
    editingId = reference_id;
    modalTitle.textContent   = 'Edit Goal';
    modalSaveBtn.textContent = 'Update Goal';

    document.getElementById('goal-title').value    = goal.goal_name;
    document.getElementById('goal-target').value   = goal.target_amount;
    document.getElementById('goal-saved').value    = goal.saved_amount;
    document.getElementById('goal-saved').disabled = true;
    document.getElementById('goal-deadline').value = goal.deadline;
    document.getElementById('goal-category').value = goal.category;
    document.getElementById('goal-notes').value    = goal.goal_notes || '';

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
    document.getElementById('goal-saved').disabled = true;
    document.getElementById('goal-category').value = 'savings';
    document.getElementById('goal-notes').value    = '';
}

async function saveGoal(forceCreation = false) {
    const title    = document.getElementById('goal-title').value.trim();
    const target   = parseFloat(document.getElementById('goal-target').value);
    const saved    = parseFloat(document.getElementById('goal-saved').value) || 0;
    const deadline = document.getElementById('goal-deadline').value;
    const category = document.getElementById('goal-category').value;
    const notes    = document.getElementById('goal-notes').value.trim();

    if (!title)              { alert('Please enter a goal title.');           return; }
    if (!target || target<=0){ alert('Please enter a valid target amount.');  return; }
    if (!deadline)           { alert('Please select a deadline.');            return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(deadline) <= today) {
        alert('Deadline must be a future date.');
        return;
    }

    const endpoint = editingId !== null ? '/api/goals/update' : '/api/goals/create';
    const body     = {
        goal_name:      title,
        target_amount:  target,
        saved_amount:   saved,
        deadline,
        category,
        goal_notes:     notes,
        force_creation: forceCreation
    };
    if (editingId !== null) body.reference_id = editingId;

    try {
        const res  = await authFetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.status === 'warning') {
            // reasoning model flagged this as risky — ask user to confirm
            showRiskWarning(data.message, () => saveGoal(true));  // retry with force=true
            return;
        }

        if (data.status === 'success') {
            closeModal();
            await refreshGoals();  // refresh goals from server
            showToast('Goal saved successfully!', 'success');
            return;
        }

        showToast(data.message || 'Something went wrong.', 'error');

    } catch (err) {
        console.error('Save goal error:', err);
        showToast('Failed to save goal. Please try again.', 'error');
    }
}

async function deleteGoal(reference_id) {
    if (!confirm('Delete this goal?')) return;

    try {
        const res  = await authFetch('/api/goals/delete', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ reference_id: reference_id })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.message || 'Failed to delete goal');
            return;
        }

        goals = goals.filter(g => g.reference_id !== reference_id);
        renderGoals();

    } catch (err) {
        console.error('Delete failed:', err);
        alert('Something went wrong. Please try again.');
    }
}

function showRiskWarning(message, onConfirm) {
    // remove any existing warning
    document.getElementById('risk-warning-overlay')?.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div id="risk-warning-overlay" style="
            position:fixed;inset:0;background:rgba(15,23,42,0.5);
            backdrop-filter:blur(4px);z-index:2000;
            display:flex;align-items:center;justify-content:center;
        ">
            <div style="
                background:var(--surface);border:1px solid #fef3c7;
                border-radius:16px;max-width:440px;width:90%;margin:20px;
                box-shadow:0 24px 60px rgba(15,23,42,0.2);
                animation:modal-in 0.2s ease;
            ">
                <div style="padding:24px 24px 0 24px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                        <div style="
                            width:40px;height:40px;border-radius:10px;
                            background:#fef3c7;display:flex;align-items:center;
                            justify-content:center;font-size:20px;flex-shrink:0;
                        ">⚠️</div>
                        <div>
                            <p style="font-size:15px;font-weight:700;color:var(--ink);margin:0;">
                                Goal Feasibility Warning
                            </p>
                            <p style="font-size:12px;color:var(--ink-muted);margin:2px 0 0 0;
                                font-family:'JetBrains Mono',monospace;">
                                Based on your current financial state
                            </p>
                        </div>
                    </div>
                    <p style="font-size:14px;color:var(--ink-soft);line-height:1.6;margin:0 0 20px 0;">
                        ${message}
                    </p>
                </div>
                <div style="
                    display:flex;justify-content:flex-end;gap:10px;
                    padding:16px 24px;border-top:1px solid var(--line);
                ">
                    <button onclick="document.getElementById('risk-warning-overlay').remove()"
                        style="
                            padding:9px 18px;border:1px solid var(--line);
                            border-radius:9px;background:var(--bg);
                            color:var(--ink-soft);font-family:inherit;
                            font-size:13.5px;font-weight:600;cursor:pointer;
                        ">
                        Cancel
                    </button>
                    <button id="risk-confirm-btn"
                        style="
                            padding:9px 18px;border:none;border-radius:9px;
                            background:#f59e0b;color:white;font-family:inherit;
                            font-size:13.5px;font-weight:600;cursor:pointer;
                        ">
                        Proceed Anyway
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('risk-confirm-btn').addEventListener('click', () => {
        document.getElementById('risk-warning-overlay').remove();
        onConfirm();  // calls saveGoal(true) — retries with force_creation=true
    });
}


function showToast(message, type = 'success') {
    document.getElementById('goal-toast')?.remove();
    const color = type === 'success' ? 'var(--good)' : 'var(--bad)';
    document.body.insertAdjacentHTML('beforeend', `
        <div id="goal-toast" style="
            position:fixed;bottom:24px;right:24px;z-index:3000;
            background:var(--surface);border:1px solid ${color};
            border-radius:10px;padding:12px 18px;
            font-size:13.5px;font-weight:600;color:var(--ink);
            box-shadow:0 8px 24px rgba(15,23,42,0.12);
            animation:modal-in 0.2s ease;
        ">${message}</div>
    `);
    setTimeout(() => document.getElementById('goal-toast')?.remove(), 3000);
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('add-goal-btn').addEventListener('click', openAddGoalModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-save').addEventListener('click', () => saveGoal());
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

function initPage(){
    document.getElementById('goal-saved').disabled = true;
    refreshGoals();
}


// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initPage)

// ── Expose functions to global scope for inline onclick handlers ──────────────
window.openEditGoalModal = openEditGoalModal;
window.deleteGoal        = deleteGoal;
window.openAddGoalModal  = openAddGoalModal;