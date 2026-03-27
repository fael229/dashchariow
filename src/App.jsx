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
    { id: 'messages', icon: '💬', label: 'Messages' },
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

// === MAIN APP ===
export default function App() {
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

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} status={status} />
      <main className="main-content">
        {page === 'dashboard' && (
          <DashboardPage status={status} stats={stats} phone={phone} qr={qr}
            onRestart={handleRestart} onDeleteSession={handleDeleteSession} toast={showToast} />
        )}
        {page === 'messages' && (
          <MessagesPage config={config} onSave={handleSaveConfig} toast={showToast} />
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
