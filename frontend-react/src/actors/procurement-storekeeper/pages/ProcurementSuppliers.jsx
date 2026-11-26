import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import {
  fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, selectAllSuppliers
} from '../../../features/procurement/procurementSlice';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';

const blank = { name: '', contactPerson: '', phone: '', email: '', gstin: '', address: '', materials: '' };

export default function ProcurementSuppliers() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const suppliers = useAppSelector(selectAllSuppliers);
  const error = useAppSelector((state) => state.procurement.suppliers.error) || '';
  const [editing, setEditing] = useState(null); // 'new' | supplier
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useLoad([fetchSuppliers]);

  /** Dispatches one supplier change; the list in the store updates itself. Returns false on failure. */
  async function run(action, onError = (msg) => toast.error(msg)) {
    setBusy(true);
    try {
      await dispatch(action).unwrap();
      return true;
    } catch (err) {
      onError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function open(s) {
    setForm(s === 'new' ? blank : { ...blank, ...Object.fromEntries(Object.entries(s).filter(([k]) => k in blank).map(([k, v]) => [k, v || ''])) });
    setFormError('');
    setEditing(s);
  }

  async function save(e) {
    e.preventDefault();
    setFormError('');
    if (form.name.trim().length < 2) return setFormError('Enter the supplier name.');
    if (form.phone && !/^\d{10}$/.test(form.phone)) return setFormError('Phone number must be exactly 10 digits.');
    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin)) return setFormError('GSTIN must be 15 characters (capital letters and digits).');
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]).filter(([k, v]) => k === 'name' || v !== ''));
    const ok = await run(editing === 'new' ? createSupplier(payload) : updateSupplier({ id: editing.id, changes: payload }), setFormError);
    if (!ok) return;
    toast.success(editing === 'new' ? 'Supplier added.' : 'Supplier updated.');
    setEditing(null);
  }

  async function toggle(s) {
    await run(updateSupplier({ id: s.id, changes: { status: s.status === 'active' ? 'inactive' : 'active' } }));
  }

  async function remove() {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (await run(deleteSupplier(target.id))) toast.success('Supplier deleted.');
  }

  const set = (k) => (e) => setForm({ ...form, [k]: k === 'gstin' ? e.target.value.toUpperCase() : e.target.value });
  const columns = [
    { key: 'name', label: 'Supplier', render: (s) => <div><strong>{s.name}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.materials}</div></div> },
    { key: 'contact', label: 'Contact', render: (s) => <div>{s.contactPerson}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.phone}{s.email ? ` · ${s.email}` : ''}</div></div> },
    { key: 'gstin', label: 'GSTIN', render: (s) => s.gstin || '—' },
    { key: 'status', label: 'Status', render: (s) => <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{s.status}</span> },
    {
      key: 'act',
      label: '',
      render: (s) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); open(s); }}><Pencil size={13} /> Edit</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); toggle(s); }}>{s.status === 'active' ? 'Deactivate' : 'Activate'}</button>
          <button type="button" className="btn btn-danger btn-sm" aria-label={`Delete ${s.name}`} onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}><Trash2 size={13} /></button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Suppliers</h1>
          <p>Your company's supplier directory. Purchase orders are placed with active suppliers.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => open('new')}><Plus size={15} /> Add supplier</button>
      </div>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
      <div className="card"><DataTable data={suppliers} columns={columns} emptyMessage="No suppliers yet. Add the first one." /></div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add supplier' : 'Edit supplier'} size="md">
        <form onSubmit={save}>
          {formError && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{formError}</div>}
          <div className="form-group"><label className="form-label">Name <span className="req">*</span></label><input className="form-input" aria-label="Supplier name" maxLength={120} value={form.name} onChange={set('name')} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Contact person</label><input className="form-input" maxLength={80} value={form.contactPerson} onChange={set('contactPerson')} /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} /></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={set('email')} /></div>
            <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" maxLength={15} value={form.gstin} onChange={set('gstin')} /></div>
          </div>
          <div className="form-group"><label className="form-label">Address</label><input className="form-input" maxLength={200} value={form.address} onChange={set('address')} /></div>
          <div className="form-group"><label className="form-label">Usually supplies</label><input className="form-input" maxLength={200} value={form.materials} onChange={set('materials')} placeholder="Cement, steel, sand..." /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save supplier'}</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete supplier?"
        size="sm"
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="btn btn-danger" onClick={remove}>Delete</button></>}
      >
        {deleteTarget && <p>"{deleteTarget.name}" will be removed. Suppliers that already have purchase orders cannot be deleted; deactivate them instead.</p>}
      </Modal>
    </div>
  );
}
