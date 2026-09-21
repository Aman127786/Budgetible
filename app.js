// --- STATE MANAGEMENT ---
let currentAuthMode = 'login'; // 'login' or 'signup'
let currentUser = null;

// LocalStorage helpers
function getUsers() {
  try {
    const raw = localStorage.getItem('ledger_users');
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading users from storage', err);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem('ledger_users', JSON.stringify(users));
}

function getSession() {
  try {
    const raw = localStorage.getItem('ledger_session');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error reading session from storage', err);
    return null;
  }
}

function setSession(user) {
  localStorage.setItem('ledger_session', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('ledger_session');
}

// Transaction data per user
function getUserTransactions(email) {
  try {
    const raw = localStorage.getItem(`ledger_tx_${email.toLowerCase().trim()}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading transactions', err);
    return [];
  }
}

function saveUserTransactions(email, transactions) {
  localStorage.setItem(`ledger_tx_${email.toLowerCase().trim()}`, JSON.stringify(transactions));
}

// --- AUTH SWITCH & SUBMISSION ---
function switchAuthTab(mode) {
  currentAuthMode = mode;
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const nameGroup = document.getElementById('group-name');
  const submitBtn = document.getElementById('auth-submit-btn');
  const forgotLink = document.getElementById('forgot-password-link');
  const errEl = document.getElementById('auth-error');

  if (errEl) errEl.style.display = 'none';

  if (mode === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    nameGroup.classList.add('hidden');
    submitBtn.innerText = 'Log In';
    if (forgotLink) forgotLink.style.display = 'inline';
  } else {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    nameGroup.classList.remove('hidden');
    submitBtn.innerText = 'Create Account';
    if (forgotLink) forgotLink.style.display = 'none';
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();

  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value.trim();
  const nameInput = document.getElementById('auth-name');
  const name = nameInput ? nameInput.value.trim() : '';

  const users = getUsers();

  if (currentAuthMode === 'signup') {
    if (!name) {
      showAuthError('Please enter your full name.');
      return;
    }
    if (password.length < 6) {
      showAuthError('Password must be at least 6 characters long.');
      return;
    }

    const existing = users.find(u => u.email.trim().toLowerCase() === email);
    if (existing) {
      showAuthError('An account with this email already exists. Please Log In.');
      return;
    }

    const newUser = { name, email, password };
    users.push(newUser);
    saveUsers(users);
    initDashboard(newUser);
  } else {
    const account = users.find(u => u.email.trim().toLowerCase() === email);

    if (!account) {
      showAuthError('No account found with this email. Please Sign Up first.');
      return;
    }

    if (account.password.trim() !== password) {
      showAuthError('Incorrect password. Please try again.');
      return;
    }

    initDashboard(account);
  }
}

// --- FORGOT / RESET PASSWORD MODAL LOGIC ---
function openResetModal() {
  const modal = document.getElementById('reset-modal');
  const authEmail = document.getElementById('auth-email').value.trim();
  const resetEmail = document.getElementById('reset-email');
  const errEl = document.getElementById('reset-error');
  const successEl = document.getElementById('reset-success');

  if (authEmail) {
    resetEmail.value = authEmail;
  }

  errEl.style.display = 'none';
  successEl.style.display = 'none';
  modal.classList.remove('hidden');
}

function closeResetModal() {
  const modal = document.getElementById('reset-modal');
  document.getElementById('reset-form').reset();
  modal.classList.add('hidden');
}

function handleResetPassword(e) {
  e.preventDefault();

  const email = document.getElementById('reset-email').value.trim().toLowerCase();
  const newPass = document.getElementById('reset-new-pass').value.trim();
  const confirmPass = document.getElementById('reset-confirm-pass').value.trim();
  const errEl = document.getElementById('reset-error');
  const successEl = document.getElementById('reset-success');

  errEl.style.display = 'none';
  successEl.style.display = 'none';

  if (newPass.length < 6) {
    errEl.innerText = 'New password must be at least 6 characters long.';
    errEl.style.display = 'block';
    return;
  }

  if (newPass !== confirmPass) {
    errEl.innerText = 'Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }

  const users = getUsers();
  const userIndex = users.findIndex(u => u.email.trim().toLowerCase() === email);

  if (userIndex === -1) {
    errEl.innerText = 'No account registered with this email.';
    errEl.style.display = 'block';
    return;
  }

  // Update password
  users[userIndex].password = newPass;
  saveUsers(users);

  successEl.innerText = 'Password updated successfully! Redirecting to login...';
  successEl.style.display = 'block';

  setTimeout(() => {
    closeResetModal();
    // Prefill login input
    document.getElementById('auth-email').value = email;
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-password').focus();
    switchAuthTab('login');
  }, 1200);
}

function quickDemoLogin() {
  const demoEmail = 'demo@ledgerflow.local';
  const demoPassword = 'demopassword';

  const users = getUsers();
  let demoUser = users.find(u => u.email === demoEmail);

  if (!demoUser) {
    demoUser = {
      name: 'Demo User',
      email: demoEmail,
      password: demoPassword
    };
    users.push(demoUser);
    saveUsers(users);

    const sampleData = [
      { id: '1', desc: 'Monthly Salary', amount: 45000, type: 'income', category: 'Salary', date: 'Just now' },
      { id: '2', desc: 'Groceries & Supermarket', amount: 3200, type: 'expense', category: 'Groceries', date: 'Yesterday' },
      { id: '3', desc: 'Electric & Wi-Fi Bill', amount: 1850, type: 'expense', category: 'Bills', date: '3 days ago' }
    ];
    saveUserTransactions(demoUser.email, sampleData);
  }

  initDashboard(demoUser);
}

function showAuthError(msg) {
  const errEl = document.getElementById('auth-error');
  if (errEl) {
    errEl.innerText = msg;
    errEl.style.display = 'block';
  }
}

function initDashboard(user) {
  currentUser = user;
  setSession(user);

  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');

  document.getElementById('current-user-name').innerText = user.name;
  document.getElementById('current-user-email').innerText = user.email;

  document.getElementById('auth-form').reset();

  renderTransactions();
  updateCalculations();
}

function logout() {
  clearSession();
  currentUser = null;

  document.getElementById('auth-form').reset();
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('dashboard-section').classList.add('hidden');
  switchAuthTab('login');
}

// --- TRANSACTIONS & CALCULATIONS ---
function handleNewTx(e) {
  e.preventDefault();
  if (!currentUser) return;

  const descInput = document.getElementById('tx-desc');
  const amountInput = document.getElementById('tx-amount');
  const typeInput = document.getElementById('tx-type');
  const categoryInput = document.getElementById('tx-category');

  const desc = descInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeInput.value;
  const category = categoryInput.value;

  if (!desc || isNaN(amount) || amount <= 0) return;

  const transactions = getUserTransactions(currentUser.email);
  const newTx = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    desc,
    amount,
    type,
    category,
    date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  };

  transactions.unshift(newTx);
  saveUserTransactions(currentUser.email, transactions);

  descInput.value = '';
  amountInput.value = '';

  renderTransactions();
  updateCalculations();
}

function removeTx(id) {
  if (!currentUser) return;
  let transactions = getUserTransactions(currentUser.email);
  transactions = transactions.filter(t => t.id !== id);
  saveUserTransactions(currentUser.email, transactions);

  renderTransactions();
  updateCalculations();
}

function updateCalculations() {
  if (!currentUser) return;
  const transactions = getUserTransactions(currentUser.email);

  const totals = transactions.reduce((acc, curr) => {
    if (curr.type === 'income') acc.income += curr.amount;
    if (curr.type === 'expense') acc.expense += curr.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  document.getElementById('balance-val').innerText = `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('income-val').innerText = `+₹${totals.income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('expense-val').innerText = `-₹${totals.expense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function renderTransactions() {
  if (!currentUser) return;
  const listEl = document.getElementById('tx-list');
  const searchQuery = (document.getElementById('filter-search').value || '').toLowerCase().trim();
  const filterType = document.getElementById('filter-type').value;

  let transactions = getUserTransactions(currentUser.email);

  if (filterType !== 'all') {
    transactions = transactions.filter(t => t.type === filterType);
  }

  if (searchQuery) {
    transactions = transactions.filter(t => 
      t.desc.toLowerCase().includes(searchQuery) || 
      t.category.toLowerCase().includes(searchQuery)
    );
  }

  listEl.innerHTML = '';

  if (transactions.length === 0) {
    listEl.innerHTML = `<li class="empty-state">No transactions found.</li>`;
    return;
  }

  transactions.forEach(t => {
    const li = document.createElement('li');
    li.className = `tx-item ${t.type}`;
    const prefix = t.type === 'income' ? '+' : '-';

    li.innerHTML = `
      <div class="tx-info">
        <h5>${t.desc}</h5>
        <span>${t.category} • ${t.date}</span>
      </div>
      <div class="tx-amount">
        <strong class="${t.type}">${prefix}₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        <button class="del-btn" title="Delete" onclick="removeTx('${t.id}')">&times;</button>
      </div>
    `;
    listEl.appendChild(li);
  });
}

// Initial session check
window.addEventListener('DOMContentLoaded', () => {
  const activeSession = getSession();
  if (activeSession) {
    initDashboard(activeSession);
  }
});