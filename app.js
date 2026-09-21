// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDXWG_MFR_d_6BmOBKR0vCXAkrzqDwxD8s",
  authDomain: "my-budget-tracker-1db1a.firebaseapp.com",
  projectId: "my-budget-tracker-1db1a",
  storageBucket: "my-budget-tracker-1db1a.firebasestorage.app",
  messagingSenderId: "112656403654",
  appId: "1:112656403654:web:b949e53bad04fac0309bc7",
  measurementId: "G-DZ0VFDZ9YR"
};

// Initialize Firebase Services
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global State
let currentAuthMode = 'login';
let currentUser = null;
let currentTransactions = [];
let unsubscribeTransactions = null;

// --- 2. AUTH STATE LISTENER (CROSS-DEVICE SYNC) ---
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');

    document.getElementById('current-user-name').innerText = user.displayName || 'User';
    document.getElementById('current-user-email').innerText = user.email;

    listenToUserTransactions(user.uid);
  } else {
    currentUser = null;
    currentTransactions = [];
    if (unsubscribeTransactions) unsubscribeTransactions();

    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
  }
});

// --- 3. AUTHENTICATION ACTIONS ---
function switchAuthTab(mode) {
  currentAuthMode = mode;
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const nameGroup = document.getElementById('group-name');
  const submitBtn = document.getElementById('auth-submit-btn');
  const forgotLink = document.getElementById('forgot-password-link');
  const errEl = document.getElementById('auth-error');
  const succEl = document.getElementById('auth-success');

  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

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

async function handleAuthSubmit(e) {
  e.preventDefault();

  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value.trim();
  const nameInput = document.getElementById('auth-name');
  const name = nameInput ? nameInput.value.trim() : '';
  const errEl = document.getElementById('auth-error');
  const succEl = document.getElementById('auth-success');

  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

  try {
    if (currentAuthMode === 'signup') {
      if (!name) {
        showAuthError('Please enter your full name.');
        return;
      }
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });
      document.getElementById('auth-form').reset();
    } else {
      await auth.signInWithEmailAndPassword(email, password);
      document.getElementById('auth-form').reset();
    }
  } catch (error) {
    showAuthError(formatFirebaseError(error.code));
  }
}

async function handleForgotPassword() {
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const errEl = document.getElementById('auth-error');
  const succEl = document.getElementById('auth-success');

  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

  if (!email) {
    showAuthError('Please enter your email address in the email field first.');
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    succEl.innerText = 'Password reset email sent! Please check your inbox.';
    succEl.style.display = 'block';
  } catch (error) {
    showAuthError(formatFirebaseError(error.code));
  }
}

function logout() {
  auth.signOut();
}

function showAuthError(msg) {
  const errEl = document.getElementById('auth-error');
  if (errEl) {
    errEl.innerText = msg;
    errEl.style.display = 'block';
  }
}

function formatFirebaseError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account exists with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect password or credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please Log In.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return 'Authentication failed. Please check your network and details.';
  }
}

// --- 4. REAL-TIME TRANSACTIONS (FIRESTORE) ---
function listenToUserTransactions(uid) {
  // Syncs entries live across all connected devices
  unsubscribeTransactions = db.collection('users')
    .doc(uid)
    .collection('transactions')
    .orderBy('timestamp', 'desc')
    .onSnapshot((snapshot) => {
      currentTransactions = [];
      snapshot.forEach((doc) => {
        currentTransactions.push({ id: doc.id, ...doc.data() });
      });
      renderTransactions();
      updateCalculations();
    }, (error) => {
      console.error("Firestore sync error:", error);
    });
}

async function handleNewTx(e) {
  e.preventDefault();
  if (!currentUser) return;

  const descInput = document.getElementById('tx-desc');
  const amountInput = document.getElementById('tx-amount');
  const typeInput = document.getElementById('tx-type');
  const categoryInput = document.getElementById('tx-category');
  const submitBtn = document.getElementById('tx-submit-btn');

  const desc = descInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeInput.value;
  const category = categoryInput.value;

  if (!desc || isNaN(amount) || amount <= 0) return;

  submitBtn.disabled = true;

  try {
    await db.collection('users').doc(currentUser.uid).collection('transactions').add({
      desc,
      amount,
      type,
      category,
      date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    descInput.value = '';
    amountInput.value = '';
  } catch (err) {
    alert('Failed to save to cloud database. Please verify Firestore test mode is enabled.');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
}

async function removeTx(id) {
  if (!currentUser) return;
  try {
    await db.collection('users').doc(currentUser.uid).collection('transactions').doc(id).delete();
  } catch (err) {
    alert('Could not delete transaction. Try again.');
  }
}

// --- 5. METRICS & RENDERING ---
function updateCalculations() {
  const totals = currentTransactions.reduce((acc, curr) => {
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
  const listEl = document.getElementById('tx-list');
  const searchQuery = (document.getElementById('filter-search').value || '').toLowerCase().trim();
  const filterType = document.getElementById('filter-type').value;

  let filtered = [...currentTransactions];

  if (filterType !== 'all') {
    filtered = filtered.filter(t => t.type === filterType);
  }

  if (searchQuery) {
    filtered = filtered.filter(t => 
      (t.desc && t.desc.toLowerCase().includes(searchQuery)) || 
      (t.category && t.category.toLowerCase().includes(searchQuery))
    );
  }

  listEl.innerHTML = '';

  if (filtered.length === 0) {
    listEl.innerHTML = `<li class="empty-state">No transactions found.</li>`;
    return;
  }

  filtered.forEach(t => {
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
