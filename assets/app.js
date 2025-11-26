const STORAGE_KEYS = {
  orders: 'zarbiti_orders',
  production: 'zarbiti_production',
  parcels: 'zarbiti_parcels',
  payments: 'zarbiti_payments'
};

function loadList(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback.slice();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback.slice();
  } catch (err) {
    console.warn('Unable to parse storage', key, err);
    return fallback.slice();
  }
}

function saveList(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });
}

function statusPill(status) {
  const normalized = (status || '').toLowerCase();
  let cls = 'status-info';
  if (['livré', 'payé', 'collecté', 'validé', 'terminé'].some(s => normalized.includes(s))) cls = 'status-success';
  else if (['annulé', 'retour'].some(s => normalized.includes(s))) cls = 'status-danger';
  else if (['en attente', 'à confirmer'].some(s => normalized.includes(s))) cls = 'status-warning';
  return `<span class="status-pill ${cls}">${status || '—'}</span>`;
}

function setNavActive() {
  const current = document.body.dataset.page;
  if (!current) return;
  document.querySelectorAll('nav a').forEach(link => {
    if (link.dataset.page === current) link.classList.add('active');
  });
}

function renderTable(tableId, rows, columns) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${columns.length}" class="empty">Aucune donnée pour le moment.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(row => {
    const cells = columns.map(col => {
      const raw = typeof col.render === 'function' ? col.render(row) : row[col.key];
      return `<td>${raw ?? ''}</td>`;
    });
    return `<tr>${cells.join('')}</tr>`;
  }).join('');
}

function initHomePage() {
  const cards = {
    orders: document.getElementById('count-orders'),
    production: document.getElementById('count-production'),
    parcels: document.getElementById('count-parcels'),
    payments: document.getElementById('count-payments'),
    paymentsTotal: document.getElementById('total-payments')
  };
  if (!cards.orders) return;

  const orders = loadList(STORAGE_KEYS.orders);
  const production = loadList(STORAGE_KEYS.production);
  const parcels = loadList(STORAGE_KEYS.parcels);
  const payments = loadList(STORAGE_KEYS.payments);

  cards.orders.textContent = orders.length;
  cards.production.textContent = production.length;
  cards.parcels.textContent = parcels.length;
  cards.payments.textContent = payments.length;
  cards.paymentsTotal.textContent = formatCurrency(payments.reduce((sum, p) => sum + Number(p.amount || 0), 0));

  const activity = document.getElementById('activity');
  if (activity) {
    const events = [];
    orders.slice(0, 5).forEach(o => events.push({ when: o.createdAt, label: `Commande ${o.client || o.customer_name || 'client'} – ${o.status}` }));
    production.slice(0, 5).forEach(p => events.push({ when: p.createdAt, label: `Production ${p.product || p.reference} – ${p.status}` }));
    parcels.slice(0, 5).forEach(p => events.push({ when: p.createdAt, label: `Colis ${p.tracking || p.orderRef} – ${p.status}` }));
    payments.slice(0, 5).forEach(p => events.push({ when: p.createdAt, label: `Paiement ${p.customer || p.orderRef} – ${p.status}` }));
    events.sort((a, b) => (new Date(b.when)) - (new Date(a.when)));
    activity.innerHTML = events.slice(0, 6).map(ev => `
      <div class="card">
        <div class="section-title" style="margin-bottom:6px;">
          <span class="badge">${formatDateTime(ev.when)}</span>
          <span>${statusPill(ev.label.split('–')[1]?.trim())}</span>
        </div>
        <div>${ev.label}</div>
      </div>`).join('') || '<div class="empty">Aucune activité enregistrée pour l’instant.</div>';
  }
}

function initOrdersPage() {
  const form = document.getElementById('order-form');
  if (!form) return;
  const statusFilter = document.getElementById('filter-status');
  let orders = loadList(STORAGE_KEYS.orders);

  const statuses = [
    'Nouveau', 'À confirmer', 'Confirmé', 'En production', 'Prêt', 'En livraison', 'Livré', 'Retour', 'Annulé'
  ];

  function render() {
    const filtered = statusFilter.value ? orders.filter(o => o.status === statusFilter.value) : orders;
    renderTable('orders-table', filtered, [
      { key: 'createdAt', render: (o) => formatDate(o.createdAt) },
      { key: 'client', render: (o) => `<strong>${o.client}</strong><div class="badge">${o.city || 'Ville inconnue'}</div>` },
      { key: 'product' },
      { key: 'dimension' },
      { key: 'quantity' },
      { key: 'price', render: (o) => o.price ? formatCurrency(o.price) : '—' },
      { key: 'status', render: (o) => statusPill(o.status) }
    ]);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const entry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      source: data.get('source') || 'Direct',
      client: data.get('client') || 'Client inconnu',
      phone: data.get('phone') || '',
      city: data.get('city') || '',
      product: data.get('product') || '',
      dimension: data.get('dimension') || '',
      quantity: Number(data.get('quantity') || 1),
      price: Number(data.get('price') || 0),
      status: data.get('status') || statuses[0],
      notes: data.get('notes') || ''
    };
    orders.unshift(entry);
    saveList(STORAGE_KEYS.orders, orders);
    form.reset();
    render();
  });

  document.getElementById('clear-orders').addEventListener('click', () => {
    if (confirm('Supprimer toutes les commandes ?')) {
      orders = [];
      saveList(STORAGE_KEYS.orders, orders);
      render();
    }
  });

  statusFilter.addEventListener('change', render);
  render();
}

function initProductionPage() {
  const form = document.getElementById('production-form');
  if (!form) return;
  let production = loadList(STORAGE_KEYS.production);

  function render() {
    const orders = loadList(STORAGE_KEYS.orders);
    const activeOrders = orders.filter(o => ['En production', 'Prêt', 'En livraison'].includes(o.status));
    const summary = document.getElementById('production-summary');
    if (summary) {
      summary.innerHTML = `
        <div class="card"><div class="big">${activeOrders.length}</div><p>Commandes en fabrication ou prêtes</p></div>
        <div class="card"><div class="big">${production.length}</div><p>Lots de production suivis</p></div>
        <div class="card"><div class="big">${activeOrders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0)}</div><p>Quantité totale en cours</p></div>`;
    }

    renderTable('production-table', production, [
      { key: 'createdAt', render: (p) => formatDate(p.createdAt) },
      { key: 'reference' },
      { key: 'product' },
      { key: 'deadline', render: (p) => formatDate(p.deadline) },
      { key: 'status', render: (p) => statusPill(p.status) },
      { key: 'notes' }
    ]);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const entry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      reference: data.get('reference') || 'Lot sans référence',
      product: data.get('product') || '',
      deadline: data.get('deadline') || '',
      status: data.get('status') || 'Planifié',
      notes: data.get('notes') || ''
    };
    production.unshift(entry);
    saveList(STORAGE_KEYS.production, production);
    form.reset();
    render();
  });

  document.getElementById('clear-production').addEventListener('click', () => {
    if (confirm('Effacer les lots de production ?')) {
      production = [];
      saveList(STORAGE_KEYS.production, production);
      render();
    }
  });

  render();
}

function initParcelsPage() {
  const form = document.getElementById('parcel-form');
  if (!form) return;
  let parcels = loadList(STORAGE_KEYS.parcels);

  function render() {
    renderTable('parcels-table', parcels, [
      { key: 'createdAt', render: (p) => formatDate(p.createdAt) },
      { key: 'orderRef' },
      { key: 'carrier' },
      { key: 'city' },
      { key: 'status', render: (p) => statusPill(p.status) },
      { key: 'tracking' }
    ]);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const entry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      orderRef: data.get('orderRef') || 'Ref inconnue',
      carrier: data.get('carrier') || '—',
      city: data.get('city') || '—',
      tracking: data.get('tracking') || '—',
      status: data.get('status') || 'Préparé'
    };
    parcels.unshift(entry);
    saveList(STORAGE_KEYS.parcels, parcels);
    form.reset();
    render();
  });

  document.getElementById('clear-parcels').addEventListener('click', () => {
    if (confirm('Vider le registre des colis ?')) {
      parcels = [];
      saveList(STORAGE_KEYS.parcels, parcels);
      render();
    }
  });

  render();
}

function initPaymentsPage() {
  const form = document.getElementById('payment-form');
  if (!form) return;
  let payments = loadList(STORAGE_KEYS.payments);

  function render() {
    const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const collected = payments.filter(p => (p.status || '').toLowerCase().includes('collect')).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const cards = document.getElementById('payments-summary');
    if (cards) {
      cards.innerHTML = `
        <div class="card"><div class="big">${payments.length}</div><p>Transactions suivies</p></div>
        <div class="card"><div class="big">${formatCurrency(total)}</div><p>Montant total</p></div>
        <div class="card"><div class="big">${formatCurrency(collected)}</div><p>Montant collecté</p></div>`;
    }

    renderTable('payments-table', payments, [
      { key: 'createdAt', render: (p) => formatDate(p.createdAt) },
      { key: 'customer' },
      { key: 'method' },
      { key: 'status', render: (p) => statusPill(p.status) },
      { key: 'amount', render: (p) => formatCurrency(p.amount) },
      { key: 'notes' }
    ]);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const entry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      customer: data.get('customer') || 'Client',
      method: data.get('method') || 'COD',
      status: data.get('status') || 'En attente',
      amount: Number(data.get('amount') || 0),
      notes: data.get('notes') || ''
    };
    payments.unshift(entry);
    saveList(STORAGE_KEYS.payments, payments);
    form.reset();
    render();
  });

  document.getElementById('clear-payments').addEventListener('click', () => {
    if (confirm('Supprimer toutes les transactions ?')) {
      payments = [];
      saveList(STORAGE_KEYS.payments, payments);
      render();
    }
  });

  render();
}

document.addEventListener('DOMContentLoaded', () => {
  setNavActive();
  initHomePage();
  initOrdersPage();
  initProductionPage();
  initParcelsPage();
  initPaymentsPage();
});
