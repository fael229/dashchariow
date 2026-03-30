import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import './index.css';

// === QR CODE COMPONENT (génère localement, pas d'API externe) ===
function QRCodeDisplay({ value }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: 260,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).catch(err => console.error('QR error:', err));
    }
  }, [value]);
  return <canvas ref={canvasRef} />;
}

// === API BASE URL ===
// En dev local, pointe vers le proxy Render ou directement le bot
const API_BASE = import.meta.env.VITE_API_URL || '';

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  return res.json();
}

// === TOAST ===
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
}

// === SIDEBAR ===
function Sidebar({ page, setPage, status }) {
  const nav = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'messages', icon: '💬', label: 'Messages' },
    { id: 'product_messages', icon: '🎁', label: 'Produits (Nouveau)' },
    { id: 'agent_ia', icon: '🤖', label: 'Agent IA' },
    { id: 'media', icon: '📸', label: 'Médias' },
    { id: 'logs', icon: '📋', label: 'Logs' },
  ];

  const statusLabels = {
    connected: 'Connecté',
    disconnected: 'Déconnecté',
    waiting_qr: 'En attente du QR...',
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🤖</div>
        <h1>ChariBot<span>Dashboard v2</span></h1>
      </div>

      <nav className="sidebar-nav">
        {nav.map(n => (
          <button
            key={n.id}
            className={`nav-item ${page === n.id ? 'active' : ''}`}
            onClick={() => setPage(n.id)}
          >
            <span className="icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <div className={`status-dot ${status}`} />
          <span>{statusLabels[status] || 'Inconnu'}</span>
        </div>
      </div>
    </aside>
  );
}

// === DASHBOARD PAGE ===
function DashboardPage({ status, stats, phone, qr, onRestart, onDeleteSession, toast }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-reset confirmation after 5 seconds
  useEffect(() => {
    if (confirmDelete) {
      const t = setTimeout(() => setConfirmDelete(false), 5000);
      return () => clearTimeout(t);
    }
  }, [confirmDelete]);

  const handleNewQR = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    setLoading(true);
    await onDeleteSession();
    setLoading(false);
  };

  const handleReconnect = async () => {
    setLoading(true);
    await onRestart();
    setLoading(false);
  };

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Vue d'ensemble de votre bot WhatsApp</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-value">{stats.messages_sent || 0}</div>
            <div className="stat-label">Messages envoyés</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">❌</div>
          <div>
            <div className="stat-value">{stats.messages_failed || 0}</div>
            <div className="stat-label">Échecs</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">🔄</div>
          <div>
            <div className="stat-value">{stats.abandoned_sent || 0}</div>
            <div className="stat-label">Relances abandons</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📱</div>
          <div>
            <div className="stat-value" style={{ fontSize: 16 }}>{phone || '—'}</div>
            <div className="stat-label">Numéro WhatsApp</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Connexion WhatsApp</div>
          </div>

          {status === 'connected' && (
            <div className="qr-container">
              <div className="connected-badge">✅ WhatsApp est connecté</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
                Le bot envoie les messages depuis le numéro <strong>{phone}</strong>
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn btn-secondary btn-sm" onClick={handleReconnect} disabled={loading}>
                  {loading ? '⏳...' : '🔄 Reconnecter'}
                </button>
                <button className={`btn ${confirmDelete ? 'btn-danger' : 'btn-danger'} btn-sm`}
                  onClick={handleNewQR} disabled={loading}
                  style={confirmDelete ? { animation: 'pulse 1s infinite' } : {}}>
                  {loading ? '⏳...' : confirmDelete ? '⚠️ Confirmer la suppression ?' : '🗑️ Nouveau QR'}
                </button>
              </div>
              {confirmDelete && <p style={{ color: 'var(--accent-orange)', fontSize: 11, marginTop: 8 }}>Cliquez à nouveau pour confirmer (5s)</p>}
            </div>
          )}

          {status === 'waiting_qr' && qr && (
            <div className="qr-container">
              <p style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>📱 Scannez ce QR code avec WhatsApp</p>
              <div className="qr-image">
                <QRCodeDisplay value={qr} />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                Sur votre téléphone : Appareils liés → Lier un appareil
              </p>
            </div>
          )}

          {status === 'disconnected' && !qr && (
            <div className="qr-container">
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>📵</p>
                <p style={{ color: 'var(--accent-red)', fontWeight: 600, marginBottom: 16 }}>WhatsApp est déconnecté</p>
                <button className="btn btn-primary" onClick={handleReconnect} disabled={loading}>
                  {loading ? '⏳ Connexion...' : '🔄 Reconnecter'}
                </button>
                <br/>
                <button className="btn btn-danger btn-sm" style={{ marginTop: 8 }} onClick={handleNewQR} disabled={loading}>
                  {loading ? '⏳...' : confirmDelete ? '⚠️ Confirmer ?' : '🗑️ Réinitialiser (nouveau QR)'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Guide rapide</div>
          </div>
          <div style={{ lineHeight: 2, fontSize: 14, color: 'var(--text-secondary)' }}>
            <p>1. Scannez le QR code avec votre WhatsApp</p>
            <p>2. Configurez vos messages dans l'onglet <strong style={{color:'var(--text-primary)'}}>💬 Messages</strong></p>
            <p>3. Ajoutez votre image/audio dans <strong style={{color:'var(--text-primary)'}}>📸 Médias</strong></p>
            <p>4. Configurez le webhook Chariow avec l'URL :</p>
            <code style={{
              display: 'block', background: 'var(--bg-primary)', padding: '10px 14px',
              borderRadius: 8, fontSize: 12, marginTop: 8, wordBreak: 'break-all',
              border: '1px solid var(--border)'
            }}>
              POST /webhook/chariow
            </code>
            <p style={{ marginTop: 16 }}>5. Suivez les envois dans l'onglet <strong style={{color:'var(--text-primary)'}}>📋 Logs</strong></p>
          </div>
        </div>
      </div>
    </>
  );
}

// === ANALYTICS PAGE ===
function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let query = '';
      if (dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = `?start=${today}&end=${today}`;
      } else if (dateRange === '7d' || dateRange === '30d') {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - (dateRange === '7d' ? 7 : 30));
        query = `?start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`;
      } else if (dateRange === 'custom' && customStart && customEnd) {
        query = `?start=${customStart}&end=${customEnd}`;
      }

      const res = await api(`/api/analytics${query}`);
      if (res.success) setData(res.analytics);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { 
    if (dateRange !== 'custom') fetchAnalytics(); 
  }, [dateRange]);

  if (loading && !data) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Chargement des données...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Aucune donnée disponible.</div>;

  const { chariow, facebook, roas, roi_net } = data;

  return (
    <>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2>Analytics (Tracker ROAS)</h2>
            <p>Synchronisation en direct avec Chariow et Facebook Ads</p>
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-control" style={{ width: 'auto', padding: '6px 12px' }} value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option value="today">Aujourd'hui</option>
              <option value="all">Tout le temps</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="custom">Personnalisé...</option>
            </select>
            
            {dateRange === 'custom' && (
              <>
                <input type="date" className="form-control" style={{ width: 'auto', padding: '5px' }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
                <span style={{color: 'var(--text-secondary)'}}>au</span>
                <input type="date" className="form-control" style={{ width: 'auto', padding: '5px' }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </>
            )}
            
            <button className="btn btn-secondary btn-sm" onClick={fetchAnalytics} disabled={loading}>
              {loading ? '⏳' : '🔄 Actualiser'}
            </button>
          </div>
        </div>
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderTop: '3px solid #00f2fe' }}>
          <div className="stat-icon" style={{ background: '#00f2fe22' }}>💰</div>
          <div>
            <div className="stat-value">{chariow.revenue.toLocaleString()} {chariow.currency}</div>
            <div className="stat-label">Chiffre d'Affaires Brut</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid #ff4b2b' }}>
          <div className="stat-icon" style={{ background: '#ff4b2b22' }}>💸</div>
          <div>
            <div className="stat-value">{facebook.spend.toLocaleString()} {chariow.currency}</div>
            <div className="stat-label">Dépense (Facebook Ads)</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid #f9d423' }}>
          <div className="stat-icon" style={{ background: '#f9d42322' }}>🚀</div>
          <div>
            <div className="stat-value" style={{ color: roas >= 2 ? '#4caf50' : 'inherit' }}>x{roas}</div>
            <div className="stat-label">Vrai ROAS (Retour)</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid #4facfe' }}>
          <div className="stat-icon" style={{ background: '#4facfe22' }}>💎</div>
          <div>
            <div className="stat-value" style={{ color: roi_net > 0 ? '#4caf50' : '#f44336' }}>
              {roi_net > 0 ? '+' : ''}{roi_net.toLocaleString()} {chariow.currency}
            </div>
            <div className="stat-label">Profit Net Estimé</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">🛍️ Chariow Stats</div></div>
          <div style={{ lineHeight: 2, fontSize: 14 }}>
            <p><strong>Ventes Totales :</strong> <span style={{ float: 'right', fontWeight: 600 }}>{chariow.sales} commandes</span></p>
            <p><strong>Panier Moyen :</strong> <span style={{ float: 'right', fontWeight: 600 }}>{chariow.sales > 0 ? Math.round(chariow.revenue / chariow.sales).toLocaleString() : 0} {chariow.currency}</span></p>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">🎯 Facebook Ads Stats</div></div>
          <div style={{ lineHeight: 2, fontSize: 14 }}>
            <p><strong>Impressions :</strong> <span style={{ float: 'right', fontWeight: 600 }}>{facebook.impressions.toLocaleString()} vues</span></p>
            <p><strong>Clics :</strong> <span style={{ float: 'right', fontWeight: 600 }}>{facebook.clicks.toLocaleString()} visiteurs</span></p>
            <p><strong>Coût Par Clic (CPC) :</strong> <span style={{ float: 'right', fontWeight: 600 }}>{facebook.clicks > 0 ? (facebook.spend / facebook.clicks).toFixed(2) : 0} {chariow.currency}</span></p>
          </div>
        </div>
      </div>
    </>
  );
}

// === MESSAGES PAGE ===
function MessagesPage({ config, onSave, toast }) {
  const [saleText, setSaleText] = useState('');
  const [abandonText, setAbandonText] = useState('');
  const [abandonEnabled, setAbandonEnabled] = useState(true);
  const [abandonDelay, setAbandonDelay] = useState(30);
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setSaleText(config.messages?.successful_sale?.text || '');
      setAbandonText(config.messages?.abandoned_sale?.text || '');
      setAbandonEnabled(config.messages?.abandoned_sale?.enabled ?? true);
      setAbandonDelay(config.messages?.abandoned_sale?.delay_minutes || 30);
      setCompanyName(config.branding?.company_name || '');
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      branding: { company_name: companyName },
      messages: {
        successful_sale: { text: saleText },
        abandoned_sale: { text: abandonText, enabled: abandonEnabled, delay_minutes: parseInt(abandonDelay) }
      }
    });
    setSaving(false);
  };

  // Preview with fake data
  const preview = (template) => {
    return template
      .replace(/{prenom}/g, 'Amina')
      .replace(/{nom}/g, 'Koné')
      .replace(/{email}/g, 'amina@gmail.com')
      .replace(/{produit}/g, 'Pack Formation Trading')
      .replace(/{montant}/g, '25 000 FCFA')
      .replace(/{lien_produit}/g, 'https://ma-boutique.chariow.shop/produit')
      .replace(/{entreprise}/g, companyName || 'Mon Entreprise');
  };

  return (
    <>
      <div className="page-header">
        <h2>Messages</h2>
        <p>Personnalisez les messages envoyés automatiquement</p>
      </div>

      <div className="form-group">
        <label className="form-label">Nom de l'entreprise</label>
        <input className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)}
          placeholder="Ex: Elite Digital Academy" />
      </div>

      <div className="grid-2">
        {/* Sale message */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">✅ Vente Réussie</div>
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea className="form-textarea" value={saleText} onChange={e => setSaleText(e.target.value)}
              placeholder="Utilisez {prenom}, {produit}, {montant}, {email}, {entreprise}..." />
          </div>
          <label className="form-label">Prévisualisation</label>
          <div className="msg-preview">{preview(saleText)}</div>
        </div>

        {/* Abandoned message */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🛒 Achat Abandonné</div>
          </div>
          <div className="toggle-row">
            <span style={{ fontSize: 14 }}>Activer les messages d'abandon</span>
            <button className={`toggle ${abandonEnabled ? 'active' : ''}`}
              onClick={() => setAbandonEnabled(!abandonEnabled)} />
          </div>
          {abandonEnabled && (
            <>
              <div className="form-group">
                <label className="form-label">Délai avant envoi (minutes)</label>
                <input className="form-input" type="number" min="1" max="1440"
                  value={abandonDelay} onChange={e => setAbandonDelay(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" value={abandonText} onChange={e => setAbandonText(e.target.value)}
                  placeholder="Utilisez {prenom}, {produit}, {montant}, {lien_produit}..." />
              </div>
              <label className="form-label">Prévisualisation</label>
              <div className="msg-preview">{preview(abandonText)}</div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
        </button>
      </div>
    </>
  );
}

// === MEDIA PAGE ===
function MediaPage({ config, onSave, toast }) {
  const [saleImage, setSaleImage] = useState('');
  const [saleAudio, setSaleAudio] = useState('');
  const [abandonImage, setAbandonImage] = useState('');
  const [abandonAudio, setAbandonAudio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setSaleImage(config.messages?.successful_sale?.image_url || '');
      setSaleAudio(config.messages?.successful_sale?.audio_url || '');
      setAbandonImage(config.messages?.abandoned_sale?.image_url || '');
      setAbandonAudio(config.messages?.abandoned_sale?.audio_url || '');
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      messages: {
        successful_sale: { image_url: saleImage, audio_url: saleAudio },
        abandoned_sale: { image_url: abandonImage, audio_url: abandonAudio }
      }
    });
    setSaving(false);
  };

  return (
    <>
      <div className="page-header">
        <h2>Médias</h2>
        <p>Configurez les images et notes vocales</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">✅ Vente Réussie — Médias</div></div>
          <div className="form-group">
            <label className="form-label">🖼️ URL de l'image</label>
            <input className="form-input" value={saleImage} onChange={e => setSaleImage(e.target.value)}
              placeholder="https://files.catbox.moe/image.jpg" />
            {saleImage && <img src={saleImage} alt="preview" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 12 }} onError={e => e.target.style.display='none'} />}
          </div>
          <div className="form-group">
            <label className="form-label">🎙️ URL de la note vocale</label>
            <input className="form-input" value={saleAudio} onChange={e => setSaleAudio(e.target.value)}
              placeholder="https://files.catbox.moe/audio.ogg" />
            {saleAudio && <audio controls src={saleAudio} style={{ width: '100%', marginTop: 8 }} />}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">🛒 Achat Abandonné — Médias</div></div>
          <div className="form-group">
            <label className="form-label">🖼️ URL de l'image</label>
            <input className="form-input" value={abandonImage} onChange={e => setAbandonImage(e.target.value)}
              placeholder="Laisser vide si pas d'image" />
          </div>
          <div className="form-group">
            <label className="form-label">🎙️ URL de la note vocale</label>
            <input className="form-input" value={abandonAudio} onChange={e => setAbandonAudio(e.target.value)}
              placeholder="Laisser vide si pas d'audio" />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Enregistrement...' : '💾 Enregistrer les médias'}
        </button>
      </div>
    </>
  );
}

// === PRODUCT MESSAGES PAGE ===
function ProductMessagesPage({ config, onSave, toast }) {
  const [products, setProducts] = useState({});
  const [companyName, setCompanyName] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setProducts(config.product_messages || {});
      setCompanyName(config.branding?.company_name || '');
    }
  }, [config]);

  const handleAddProduct = () => {
    if (!newProductName.trim()) return;
    const name = newProductName.trim();
    if (products[name]) {
      toast("Un message pour ce produit existe déjà", "error");
      return;
    }
    const updated = {
      ...products,
      [name]: { text: '', image_url: '', audio_url: '' }
    };
    setProducts(updated);
    setSelectedProduct(name);
    setNewProductName('');
  };

  const handleDeleteProduct = (name) => {
    const updated = { ...products };
    delete updated[name];
    setProducts(updated);
    if (selectedProduct === name) setSelectedProduct(null);
  };

  const updateSelectedProduct = (field, value) => {
    setProducts({
      ...products,
      [selectedProduct]: {
        ...products[selectedProduct],
        [field]: value
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ product_messages: products });
    setSaving(false);
  };

  const preview = (template) => {
    return (template || '')
      .replace(/{prenom}/g, 'Amina')
      .replace(/{nom}/g, 'Koné')
      .replace(/{email}/g, 'amina@gmail.com')
      .replace(/{produit}/g, selectedProduct || 'Le Produit')
      .replace(/{montant}/g, '25 000 FCFA')
      .replace(/{entreprise}/g, companyName || 'Mon Entreprise');
  };

  return (
    <>
      <div className="page-header">
        <h2>Messages par Produit</h2>
        <p>Définissez un texte ou une note vocale spécifique selon l'article acheté</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Vos produits</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input 
            className="form-input" 
            placeholder="Nom EXACT du produit sur Chariow (respectez les majuscules)" 
            value={newProductName}
            onChange={e => setNewProductName(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={handleAddProduct}>+ Ajouter au bot</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(products).length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucun produit personnalisé pour le moment.</p>}
          {Object.keys(products).map(p => (
            <div 
              key={p} 
              style={{
                padding: '8px 12px', 
                background: selectedProduct === p ? 'var(--accent-blue)' : 'var(--bg-lighter)',
                color: selectedProduct === p ? '#fff' : 'inherit',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
              onClick={() => setSelectedProduct(p)}
            >
              {p}
              <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p); }} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>✖</button>
            </div>
          ))}
        </div>
      </div>

      {selectedProduct && products[selectedProduct] && (
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Message pour: {selectedProduct}</div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Texte du message</label>
              <textarea className="form-textarea" rows="8"
                value={products[selectedProduct].text || ''} 
                onChange={e => updateSelectedProduct('text', e.target.value)}
                placeholder="Utilisez {prenom}, {produit}, {montant}, {email}, {entreprise}..." />
            </div>

            <div className="form-group">
              <label className="form-label">URL Image (Optionnel)</label>
              <input className="form-input" 
                value={products[selectedProduct].image_url || ''} 
                onChange={e => updateSelectedProduct('image_url', e.target.value)} 
                placeholder="Lien de l'image (Catbox.moe)" />
            </div>

            <div className="form-group">
              <label className="form-label">URL Audio (Optionnel)</label>
              <input className="form-input" 
                value={products[selectedProduct].audio_url || ''} 
                onChange={e => updateSelectedProduct('audio_url', e.target.value)} 
                placeholder="Lien de la note vocale (Catbox.moe ogg)" />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Aperçu pour le client</div></div>
            <div className="msg-preview">{preview(products[selectedProduct].text)}</div>
            
            {products[selectedProduct].image_url && (
              <img src={products[selectedProduct].image_url} alt="img preview" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 12 }} onError={e => e.target.style.display='none'} />
            )}
            {products[selectedProduct].audio_url && (
              <audio controls src={products[selectedProduct].audio_url} style={{ width: '100%', marginTop: 12 }} />
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Enregistrement...' : '💾 Sauvegarder les produits'}
        </button>
      </div>
    </>
  );
}

// === LOGS PAGE ===
function LogsPage({ logs, onRefresh }) {
  return (
    <>
      <div className="page-header">
        <h2>Logs</h2>
        <p>Historique des messages envoyés</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Derniers envois</div>
          <button className="btn btn-secondary btn-sm" onClick={onRefresh}>🔄 Rafraîchir</button>
        </div>

        {logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            Aucun message envoyé pour le moment. Les logs apparaîtront ici automatiquement.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="log-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Destinataire</th>
                  <th>Produit</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i}>
                    <td>{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                    <td>
                      {log.type === 'successful_sale' ? '✅ Vente' :
                       log.type === 'abandoned_sale' ? '🛒 Abandon' : '📤 Manuel'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{log.to}</td>
                    <td>{log.product || '—'}</td>
                    <td><span className={`badge ${log.status}`}>{log.status === 'sent' ? '✅ Envoyé' : '❌ Échoué'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// === AGENT IA PAGE ===
function AgentIAPage({ config, onSave }) {
  const [tab, setTab] = useState('config');
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [knowledge, setKnowledge] = useState([]);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [saving, setSaving] = useState(false);

  // Training
  const [trainingExamples, setTrainingExamples] = useState([]);
  const [waExport, setWaExport] = useState('');
  const [importing, setImporting] = useState(false);
  const [manualIn, setManualIn] = useState('');
  const [manualOut, setManualOut] = useState('');

  // Conversations
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [learnedIdx, setLearnedIdx] = useState(new Set());

  useEffect(() => {
    if (config?.ai_agent) {
      setEnabled(config.ai_agent.enabled || false);
      setApiKey(config.ai_agent.api_key || '');
      setSystemPrompt(config.ai_agent.system_prompt || '');
      setKnowledge(config.ai_agent.knowledge_base || []);
      setTrainingExamples(config.ai_agent.training_examples || []);
    }
    api('/api/ai-conversations').then(d => setConversations(d.conversations || [])).catch(() => {});
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ai_agent: { enabled, api_key: apiKey, system_prompt: systemPrompt, knowledge_base: knowledge } });
    setSaving(false);
  };

  const addKnowledge = () => {
    if (!newQ.trim() || !newA.trim()) return;
    setKnowledge([...knowledge, { question: newQ.trim(), answer: newA.trim() }]);
    setNewQ(''); setNewA('');
  };
  const deleteKnowledge = (i) => setKnowledge(knowledge.filter((_, idx) => idx !== i));

  // Parse WhatsApp export and extract Q/A pairs (consecutive user→bot)
  const importWhatsApp = () => {
    if (!waExport.trim()) return;
    setImporting(true);
    // Format: [DD/MM/YYYY, HH:MM:SS] Name: message
    const lines = waExport.split('\n');
    const parsed = [];
    const lineRe = /^\[?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\]?\s*[-–]?\s*(.+?):\s(.+)$/;
    lines.forEach(line => {
      const m = line.match(lineRe);
      if (m) parsed.push({ name: m[1].trim(), text: m[2].trim() });
    });

    // Extract consecutive pairs: any msg followed by a msg from a different person
    const pairs = [];
    const names = [...new Set(parsed.map(p => p.name))];
    // Assume the "you" is the name that appears last (or most) — heuristic
    const meCandidates = names.slice().sort((a, b) =>
      parsed.filter(p => p.name === b).length - parsed.filter(p => p.name === a).length
    );
    const meName = meCandidates[meCandidates.length - 1] || names[1] || '';

    for (let i = 0; i < parsed.length - 1; i++) {
      if (parsed[i].name !== meName && parsed[i + 1].name === meName) {
        pairs.push({ input: parsed[i].text, output: parsed[i + 1].text });
      }
    }

    // Save valid pairs via API
    let saved = 0;
    Promise.all(pairs.map(p =>
      api('/api/ai-training', { method: 'POST', body: JSON.stringify(p) })
        .then(r => { if (r.success) saved++; })
        .catch(() => {})
    )).then(() => {
      setWaExport('');
      setImporting(false);
      // Reload
      api('/api/config').then(c => setTrainingExamples(c?.ai_agent?.training_examples || []));
      alert(`✅ ${saved} échanges importés comme exemples d'entraînement !`);
    });
  };

  const addManualExample = () => {
    if (!manualIn.trim() || !manualOut.trim()) return;
    api('/api/ai-training', { method: 'POST', body: JSON.stringify({ input: manualIn.trim(), output: manualOut.trim() }) })
      .then(r => {
        if (r.success) {
          setTrainingExamples(prev => [{ input: manualIn.trim(), output: manualOut.trim() }, ...prev]);
          setManualIn(''); setManualOut('');
        }
      });
  };

  const deleteExample = (i) => {
    api(`/api/ai-training/${i}`, { method: 'DELETE' }).then(() => {
      setTrainingExamples(prev => prev.filter((_, idx) => idx !== i));
    });
  };

  const learnFromMsg = (userMsg, aiMsg, pairKey) => {
    api('/api/ai-training', { method: 'POST', body: JSON.stringify({ input: userMsg, output: aiMsg }) })
      .then(r => {
        if (r.success) {
          setLearnedIdx(prev => new Set([...prev, pairKey]));
          setTrainingExamples(prev => [{ input: userMsg, output: aiMsg }, ...prev]);
        }
      });
  };

  const tabStyle = (t) => ({
    padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    background: tab === t ? 'var(--accent-blue)' : 'var(--bg-lighter)',
    color: tab === t ? '#fff' : 'var(--text-secondary)',
    border: 'none', transition: 'all 0.2s'
  });

  return (
    <>
      <div className="page-header">
        <h2>Agent IA 🤖</h2>
        <p>L'IA apprend de vos vraies conversations pour répondre comme vous</p>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('config')} onClick={() => setTab('config')}>⚙️ Configuration</button>
        <button style={tabStyle('training')} onClick={() => setTab('training')}>
          🧠 Entraînement {trainingExamples.length > 0 && <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 10, padding: '1px 7px', marginLeft: 6, fontSize: 12 }}>{trainingExamples.length}</span>}
        </button>
        <button style={tabStyle('convs')} onClick={() => { setTab('convs'); api('/api/ai-conversations').then(d => setConversations(d.conversations || [])); }}>💬 Conversations</button>
      </div>

      {/* ===== TAB: CONFIG ===== */}
      {tab === 'config' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">Activation</div></div>
            <div className="toggle-row">
              <span style={{ fontSize: 14 }}>{enabled ? '✅ Agent IA activé' : '❌ Agent IA désactivé'}</span>
              <button className={`toggle ${enabled ? 'active' : ''}`} onClick={() => setEnabled(!enabled)} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">🔑 Clé API Gemini (Gratuit)</div></div>
            {/* Champ fantôme invisible pour tromper l'autofill du navigateur */}
            <input type="password" style={{ display: 'none' }} autoComplete="current-password" readOnly />
            <div className="form-group">
              <label className="form-label">→ <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>aistudio.google.com/apikey</a></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                  name="gemini-api-key"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="btn btn-secondary"
                  style={{ flexShrink: 0, padding: '0 14px' }}
                >
                  {showKey ? '🙈 Masquer' : '👁️ Voir'}
                </button>
              </div>
              {apiKey && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>✅ Clé saisie ({apiKey.length} caractères)</p>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">🎭 Personnalité de l'IA</div></div>
            <div className="form-group">
              <label className="form-label">Décrivez le rôle et le ton de votre agent</label>
              <textarea className="form-textarea" rows="5" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Ex: Tu es Sara, assistante d'Elite Digital Academy. Tu réponds en français, de façon chaleureuse..." />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">📚 FAQ (réponses fixes)</div></div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Pour les infos précises que l'IA doit toujours donner exactement (prix, lien, etc.)</p>
            {knowledge.map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-lighter)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Q: {item.question}</div>
                  <div>R: {item.answer}</div>
                </div>
                <button onClick={() => deleteKnowledge(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <input className="form-input" placeholder="Question" value={newQ} onChange={e => setNewQ(e.target.value)} />
              <input className="form-input" placeholder="Réponse exacte" value={newA} onChange={e => setNewA(e.target.value)} />
              <button className="btn btn-secondary" onClick={addKnowledge} style={{ alignSelf: 'flex-start' }}>+ Ajouter</button>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳...' : '💾 Sauvegarder'}
          </button>
        </>
      )}

      {/* ===== TAB: TRAINING ===== */}
      {tab === 'training' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">📲 Importer une conversation WhatsApp exportée</div></div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Dans WhatsApp → ouvrez une conversation → ⋮ → "Exporter la discussion" → sans médias → copiez-collez le texte ici
            </p>
            <textarea className="form-textarea" rows="6" value={waExport} onChange={e => setWaExport(e.target.value)}
              placeholder={"[28/03/2026, 14:23] Client: Bonjour, c'est combien le pack?\n[28/03/2026, 14:24] Vous: Bonjour ! Le pack est à 25 000 FCFA..."} />
            <button className="btn btn-primary" onClick={importWhatsApp} disabled={importing || !waExport.trim()} style={{ marginTop: 10 }}>
              {importing ? '⏳ Import en cours...' : '⬆️ Importer et entraîner l\'IA'}
            </button>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">✏️ Ajouter un exemple manuellement</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea className="form-textarea" rows="2" placeholder="Message du client..." value={manualIn} onChange={e => setManualIn(e.target.value)} />
              <textarea className="form-textarea" rows="2" placeholder="Votre réponse idéale..." value={manualOut} onChange={e => setManualOut(e.target.value)} />
              <button className="btn btn-secondary" onClick={addManualExample} style={{ alignSelf: 'flex-start' }}>+ Ajouter cet exemple</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">🧠 Exemples enregistrés ({trainingExamples.length}/50)</div>
            </div>
            {trainingExamples.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Aucun exemple. Importez une conversation ou ajoutez-en un manuellement.</p>
            ) : trainingExamples.map((ex, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--bg-lighter)', padding: '10px 0', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, flex: 1 }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>👤 {ex.input}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>🤖 {ex.output}</div>
                </div>
                <button onClick={() => deleteExample(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 16, alignSelf: 'flex-start' }}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== TAB: CONVERSATIONS ===== */}
      {tab === 'convs' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">💬 Conversations en direct</div>
            <button className="btn btn-secondary btn-sm" onClick={() => api('/api/ai-conversations').then(d => setConversations(d.conversations || []))}>🔄 Actualiser</button>
          </div>
          {conversations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>Aucune conversation active pour le moment.</p>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              {conversations.map(conv => (
                <div key={conv.jid} onClick={() => setSelectedConv(selectedConv?.jid === conv.jid ? null : conv)}
                  style={{ padding: '8px 14px', background: selectedConv?.jid === conv.jid ? 'var(--accent-blue)' : 'var(--bg-lighter)', color: selectedConv?.jid === conv.jid ? '#fff' : 'inherit', borderRadius: 8, cursor: 'pointer' }}>
                  📱 {conv.phone} ({conv.messages.length} msgs)
                </div>
              ))}
            </div>
          )}

          {selectedConv && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 440, overflowY: 'auto' }}>
              {selectedConv.messages.map((m, i) => {
                const isAI = m.role === 'model';
                const prevMsg = i > 0 ? selectedConv.messages[i - 1] : null;
                const pairKey = `${selectedConv.jid}_${i}`;
                const learned = learnedIdx.has(pairKey);
                return (
                  <div key={i} style={{ alignSelf: isAI ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, textAlign: isAI ? 'right' : 'left' }}>
                      {isAI ? '🤖 Agent IA' : '👤 Client'}
                    </div>
                    <div style={{ padding: '9px 13px', background: isAI ? 'rgba(59,130,246,0.18)' : 'var(--bg-lighter)', borderRadius: 10, fontSize: 13 }}>
                      {m.parts[0].text}
                    </div>
                    {isAI && prevMsg && (
                      <button onClick={() => learnFromMsg(prevMsg.parts[0].text, m.parts[0].text, pairKey)}
                        disabled={learned}
                        style={{ marginTop: 4, background: 'none', border: `1px solid ${learned ? 'var(--accent-green)' : 'var(--accent-blue)'}`, color: learned ? 'var(--accent-green)' : 'var(--accent-blue)', borderRadius: 6, padding: '2px 10px', fontSize: 11, cursor: learned ? 'default' : 'pointer', float: 'right' }}>
                        {learned ? '✅ Appris !' : '👍 Apprendre de ça'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// === LOGIN PAGE ===
function LoginPage({ onLogin }) {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  // Configurable via Render / Vercel Environment Variables
  const ACTUAL_PWD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'admin123';

  const submit = (e) => {
    e.preventDefault();
    if (pwd === ACTUAL_PWD) {
      onLogin();
    } else {
      setErr('Mot de passe incorrect');
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
      <div className="card" style={{ maxWidth: 400, width: '90%', padding: 32, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 8 }}>🔒 Accès Restreint</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Veuillez entrer le mot de passe pour accéder au Dashboard ChariBot.</p>
        <form onSubmit={submit}>
          <input 
            type="password" 
            value={pwd} 
            onChange={e=>setPwd(e.target.value)} 
            className="form-input" 
            placeholder="Mot de passe" 
            style={{ marginBottom: 16 }} 
          />
          {err && <p style={{color: 'var(--accent-red)', marginBottom: 16, fontSize: 14}}>{err}</p>}
          <button type="submit" className="btn btn-primary" style={{width: '100%'}}>Se connecter</button>
        </form>
      </div>
    </div>
  )
}

// === MAIN APP ===
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [status, setStatus] = useState('disconnected');
  const [stats, setStats] = useState({});
  const [phone, setPhone] = useState(null);
  const [qr, setQr] = useState(null);
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (message, type = 'success') => setToastMsg({ message, type });

  // Polling for status + QR code
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const s = await api('/api/status');
        setStatus(s.whatsapp);
        setStats(s.stats || {});
        setPhone(s.phone);

        const q = await api('/api/qrcode');
        setQr(q.qr);
      } catch (e) { /* offline */ }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  // Load config on mount
  useEffect(() => {
    api('/api/config').then(c => setConfig(c)).catch(() => {});
  }, []);

  const fetchLogs = async () => {
    try {
      const l = await api('/api/logs');
      setLogs(l.logs || []);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (page === 'logs') fetchLogs();
  }, [page]);

  const handleSaveConfig = async (partial) => {
    try {
      const result = await api('/api/config', { method: 'POST', body: JSON.stringify(partial) });
      if (result.success) {
        setConfig(result.config);
        showToast('✅ Configuration sauvegardée !');
      } else {
        showToast('❌ Erreur: ' + result.error, 'error');
      }
    } catch (e) {
      showToast('❌ Impossible de sauvegarder', 'error');
    }
  };

  const handleRestart = async () => {
    try {
      await api('/api/restart', { method: 'POST', body: '{}' });
      showToast('🔄 Reconnexion en cours...');
    } catch (e) {
      showToast('❌ Erreur de reconnexion', 'error');
    }
  };

  const handleDeleteSession = async () => {
    try {
      showToast('🔄 Suppression de la session...');
      const result = await api('/api/restart', { method: 'POST', body: JSON.stringify({ deleteSession: true }) });
      if (result.success) {
        showToast('🗑️ Session supprimée. Le QR code va apparaître...');
        setStatus('disconnected');
        setQr(null);
      } else {
        showToast('❌ ' + (result.error || 'Erreur'), 'error');
      }
    } catch (e) {
      showToast('❌ Impossible de contacter le serveur', 'error');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('chariow_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => {
      localStorage.setItem('chariow_auth', 'true');
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} status={status} />
      <main className="main-content">
        {page === 'dashboard' && (
          <DashboardPage status={status} stats={stats} phone={phone} qr={qr}
            onRestart={handleRestart} onDeleteSession={handleDeleteSession} toast={showToast} />
        )}
        {page === 'analytics' && <AnalyticsPage />}
        {page === 'messages' && (
          <MessagesPage config={config} onSave={handleSaveConfig} toast={showToast} />
        )}
        {page === 'product_messages' && (
          <ProductMessagesPage config={config} onSave={handleSaveConfig} toast={showToast} />
        )}
        {page === 'agent_ia' && (
          <AgentIAPage config={config} onSave={handleSaveConfig} />
        )}
        {page === 'media' && (
          <MediaPage config={config} onSave={handleSaveConfig} toast={showToast} />
        )}
        {page === 'logs' && (
          <LogsPage logs={logs} onRefresh={fetchLogs} />
        )}
      </main>
      {toastMsg && <Toast message={toastMsg.message} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
