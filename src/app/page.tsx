'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PAGES, NAV_GROUPS, MOCK_DATA, Person, PageConfig } from '@/lib/mock-data';
import {
  Phone, Mail, MessageCircle, MapPin, Cake,
  Wrench, FileText, Plus, Trash2, Search, Filter, X,
  Users, Lock, LogOut
} from 'lucide-react';

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';
const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || '1234';

export default function Dashboard() {
  const [currentPageId, setCurrentPageId] = useState('branch');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [db, setDb] = useState<Record<string, Person[]>>(MOCK_DATA);
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>(PAGES);
  const [isLoading, setIsLoading] = useState(true);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingPerson, setEditingPerson] = useState<Partial<Person> | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  // 0. Initial Session Check
  useEffect(() => {
    const savedSession = localStorage.getItem('isLoggedIn');
    if (savedSession === 'true') {
      setIsAuthenticated(true);
    }
    setIsAuthLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError(false);
      localStorage.setItem('isLoggedIn', 'true');
    } else {
      setAuthError(true);
      setAuthPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isLoggedIn');
  };

  // 0.1. Helper: Convert Google Drive links to direct image URLs
  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/);
      const id = match ? (match[1] || match[2]) : null;
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return url;
  };

  // 1. Fetch Data from Sheets
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const result = await response.json();

      const configs = result.configs && result.configs.length > 0 ? result.configs : pageConfigs;
      if (result.configs && result.configs.length > 0) {
        setPageConfigs(result.configs);
      }

      // Organize flat data into page-based database
      const organizedData: Record<string, Person[]> = {};
      configs.forEach((p: PageConfig) => organizedData[p.id] = []);

      const members = result.members || [];
      members.forEach((p: Person & { pageId: string }) => {
        if (!organizedData[p.pageId]) organizedData[p.pageId] = [];
        organizedData[p.pageId].push(p);
      });

      setDb(organizedData);
    } catch (e) {
      console.error('Failed to fetch from Sheets', e);
      // Fallback to localStorage if offline or error
      const savedDb = localStorage.getItem('multiPageDB');
      if (savedDb) setDb(JSON.parse(savedDb));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // 2. Save Data to Sheets
  const callGAS = async (payload: any) => {
    setIsLoading(true);
    try {
      // Use no-cors for POST to Apps Script to avoid preflight issues if necessary, 
      // but here we try regular fetch first.
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script doesn't support CORS for JSON gracefully
        body: JSON.stringify(payload),
      });
      // Since no-cors can't read response, we just wait a bit and refresh
      setTimeout(refreshData, 1000);
    } catch (e) {
      console.error('GAS Error', e);
      setIsLoading(false);
    }
  };

  const currentPage = useMemo(() =>
    pageConfigs.find(p => p.id === currentPageId) || pageConfigs[0],
    [currentPageId, pageConfigs]);

  const currentData = useMemo(() => {
    if (currentPageId === 'branch') {
      // Aggregate everyone for the Master List
      return Object.values(db).flat();
    }
    return db[currentPageId] || [];
  }, [db, currentPageId]);

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return currentData.filter(p => {
      const matchSearch = !q || [p.fname, p.lname, p.job, p.province, ...(p.skills || []), p.gen]
        .join(' ')
        .toLowerCase()
        .includes(q);

      const matchGroup = !groupFilter || (
        currentPageId === 'branch'
          ? (p.province || '').trim() === groupFilter.trim()
          : (p.group || '').trim() === groupFilter.trim()
      );

      return matchSearch && matchGroup;
    });
  }, [currentData, searchQuery, groupFilter, currentPageId, currentPage.groups]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentPage.groups.forEach(g => {
      const targetGroup = g.trim();
      if (currentPageId === 'branch') {
        counts[g] = currentData.filter(p => (p.province || '').trim() === targetGroup).length;
      } else {
        counts[g] = currentData.filter(p => (p.group || '').trim() === targetGroup).length;
      }
    });
    return counts;
  }, [currentPage, currentData, currentPageId]);

  // Helper: Format Phone (Add leading zero if missing)
  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    let p = phone.toString().trim();
    if (p.length === 9 && (p.startsWith('8') || p.startsWith('9') || p.startsWith('6'))) {
      return '0' + p;
    }
    return p;
  };

  // Group Actions
  const handleAddGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    if (currentPage.groups.includes(newGroupName)) {
      alert('ชื่อนี้มีอยู่แล้ว');
      return;
    }

    const newConfigs = pageConfigs.map(p => {
      if (p.id === currentPageId) {
        return { ...p, groups: [...p.groups, newGroupName] };
      }
      return p;
    });

    setPageConfigs(newConfigs);
    callGAS({ action: 'save_configs', configs: newConfigs });
    setIsGroupModalOpen(false);
    setNewGroupName('');
  };

  const handleDeleteGroup = (groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`ยืนยันการลบ ${currentPage.groupLabel} "${groupName}"?\n(สมาชิกในกลุ่มนี้จะถูกย้ายไปที่ "ไม่ระบุ")`)) return;

    const newConfigs = pageConfigs.map(p => {
      if (p.id === currentPageId) {
        return { ...p, groups: p.groups.filter(g => g !== groupName) };
      }
      return p;
    });

    // Move members visually first
    const newPageData = currentData.map(p => {
      if (p.group === groupName) return { ...p, group: 'ไม่ระบุ' };
      return p;
    });

    setPageConfigs(newConfigs);
    setDb({ ...db, [currentPageId]: newPageData });

    // Save both config and updated members
    callGAS({ action: 'save_configs', configs: newConfigs });
    // In a real app, you'd update each affected member row too. 
    // For now, save_configs is prioritized.
  };

  // Member Actions
  const handleAdd = () => {
    setEditingPerson({ group: currentPage.groups[0] || 'ไม่ระบุ' });
    setIsModalOpen(true);
  };

  const handleEdit = (person: Person) => {
    setEditingPerson(person);
    setIsModalOpen(true);
    setIsDetailOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!confirm('ยืนยันในการลบข้อมูล?')) return;
    callGAS({ action: 'delete_person', id: id });
    setIsDetailOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson?.fname || !editingPerson?.lname) {
      alert('กรุณากรอกชื่อและนามสกุล');
      return;
    }

    const personToSave = {
      ...editingPerson,
      pageId: currentPageId,
      // If in Branch page, sync province with the selected group (Branch)
      province: currentPageId === 'branch' ? editingPerson?.group : editingPerson?.province,
      id: editingPerson?.id || Date.now(),
      skills: typeof editingPerson?.skills === 'string'
        ? (editingPerson.skills as string).split(',').map(s => s.trim()).filter(Boolean)
        : (editingPerson?.skills || [])
    };

    callGAS({ action: 'save_person', data: personToSave });
    setIsModalOpen(false);
    setEditingPerson(null);
  };

  if (isAuthLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="login-screen-container">
        <style jsx>{`
          .login-screen-container {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            z-index: 9999;
            padding: 20px;
          }
          .login-card {
            width: 100%;
            max-width: 400px;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .login-logo {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
          }
          .login-title {
            color: white;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .login-subtitle {
            color: #94a3b8;
            font-size: 14px;
            margin-bottom: 32px;
          }
          .login-input-group {
            position: relative;
            margin-bottom: 20px;
          }
          .login-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 14px 16px 14px 44px;
            color: white;
            font-size: 16px;
            transition: all 0.2s;
            outline: none;
            letter-spacing: 0.1em;
          }
          .login-input:focus {
            background: rgba(255, 255, 255, 0.08);
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
          }
          .login-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
          }
          .login-btn {
            width: 100%;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 12px;
            padding: 14px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .login-btn:hover {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .login-btn:active {
            transform: translateY(0);
          }
          .error-msg {
            color: #ef4444;
            font-size: 13px;
            margin-top: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            animation: shake 0.4s;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
        `}</style>

        <div className="login-card">
          <div className="login-logo">
            <Lock color="white" size={32} />
          </div>
          <h1 className="login-title">ระบบฐานข้อมูล</h1>
          <p className="login-subtitle">กรุณาใส่รหัสผ่านเพื่อเข้าสู่ระบบ</p>

          <form onSubmit={handleLogin}>
            <div className="login-input-group">
              <Lock className="login-icon" size={18} />
              <input
                type="password"
                className="login-input"
                placeholder="ระบุรหัสผ่าน..."
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoFocus
                required
              />
            </div>

            <button type="submit" className="login-btn">
              เข้าสู่ระบบ
            </button>

            {authError && (
              <div className="error-msg">
                <X size={14} /> รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="premium-spinner"></div>
          <div className="loading-text">กำลังซิงค์ข้อมูลกับ Google Sheets...</div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-title">ระบบฐานข้อมูล</div>
          <div className="sidebar-sub">บุคลากรและทำเนียบค่าย</div>
        </div>
        <nav className="nav-container">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="nav-section">
              <div className="nav-label">{group.label}</div>
              {group.ids.map(id => {
                const pg = pageConfigs.find(p => p.id === id)!;
                const count = id === 'branch'
                  ? Object.values(db).flat().length
                  : (db[id] || []).length;
                const label = pg.id === 'branch' ? 'บุคลากรสาขา' : pg.label.replace('ทำเนียบน้องค่าย', 'น้อง').replace('ทำเนียบพี่ค่าย', 'พี่');
                return (
                  <div
                    key={id}
                    className={`nav-item ${currentPageId === id ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentPageId(id);
                      setGroupFilter('');
                      setSearchQuery('');
                    }}
                  >
                    <div className="nav-dot" style={{ backgroundColor: pg.color }} />
                    <span>{label}</span>
                    <span className="nav-count">{count}</span>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="nav-section" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div
              className="nav-item"
              onClick={handleLogout}
              style={{ color: '#ff4d4d' }}
            >
              <LogOut size={18} />
              <span>ออกจากระบบ</span>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <h2 style={{ fontSize: '18px', fontWeight: 600, flex: 1 }}>{currentPage.label}</h2>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาชื่อ, อาชีพ, จังหวัด, ทักษะ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">ทุก{currentPage.groupLabel}</option>
            {currentPage.groups.map(g => <option key={g} value={g}>{g}</option>)}
            {currentData.some(p => !currentPage.groups.includes(p.group)) && <option value="ไม่ระบุ">ไม่ระบุ</option>}
          </select>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-outline" onClick={() => setIsGroupModalOpen(true)}>
              <Plus size={16} /> เพิ่ม{currentPage.groupLabel}
            </button>
            <button className="btn-primary" onClick={handleAdd}>
              <Plus size={16} /> เพิ่มข้อมูล
            </button>
          </div>
        </header>

        {/* Stats Bar */}
        <section className="stats-grid">
          <div
            className={`stat-card ${!groupFilter ? 'active' : ''}`}
            onClick={() => setGroupFilter('')}
            style={!groupFilter ? { borderColor: currentPage.color, borderLeft: `4px solid ${currentPage.color}` } : {}}
          >
            <div className="stat-value" style={!groupFilter ? { color: currentPage.color } : {}}>{currentData.length}</div>
            <div className="stat-label">ทั้งหมด</div>
          </div>
          {currentPage.groups.map(g => (
            <div
              key={g}
              className={`stat-card ${groupFilter === g ? 'active' : ''}`}
              onClick={() => setGroupFilter(g)}
              style={groupFilter === g ? { borderColor: currentPage.color, borderLeft: `4px solid ${currentPage.color}` } : {}}
            >
              <div className="stat-value" style={groupFilter === g ? { color: currentPage.color } : {}}>{groupCounts[g] || 0}</div>
              <div className="stat-label">{g}</div>
            </div>
          ))}
        </section>

        {/* Member Grid */}
        <section className="content-section">
          {filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
              ไม่พบข้อมูลที่ค้นหา
            </div>
          ) : (
            <>
              <div className="section-header">
                รายชื่อทั้งหมด ({filteredData.length} คน)
              </div>
              <div className="member-grid">
                {filteredData.map(person => (
                  <div
                    key={person.id}
                    className="member-card fade-in"
                    onClick={() => {
                      setSelectedPerson(person);
                      setIsDetailOpen(true);
                    }}
                  >
                    <div className="card-top" onClick={(e) => {
                      if (person.photo) {
                        e.stopPropagation();
                        setPreviewImage(getDirectImageUrl(person.photo));
                      }
                    }}>
                      <div className="avatar" style={{ backgroundColor: currentPage.bg, color: currentPage.color, cursor: person.photo ? 'zoom-in' : 'default' }}>
                        {person.photo ? (
                          <img src={getDirectImageUrl(person.photo)} alt={person.fname} />
                        ) : (
                          <span>{person.fname[0]}{person.lname[0]}</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="member-name">{person.fname} {person.lname}</div>
                        <div className="member-job">{person.job || 'ไม่ระบุอาชีพ'}</div>
                        {currentPageId === 'branch' && person.pageId !== 'branch' && (
                          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7, fontStyle: 'italic' }}>
                            จาก: {pageConfigs.find(pg => pg.id === person.pageId)?.label.replace('ทำเนียบ', '')}
                          </div>
                        )}
                      </div>
                    </div>
                    <hr className="divider" />
                    <div className="member-info">
                      <div className="member-info-item"><Phone size={14} color={currentPage.color} /> {formatPhone(person.phone)}</div>
                      <div className="member-info-item"><Users size={14} color={currentPage.color} /> {person.fb || '-'}</div>
                      <div className="member-info-item"><MapPin size={14} color={currentPage.color} /> {person.province}</div>
                    </div>
                    <div className="tag-list">
                      {person.skills?.slice(0, 3).map(skill => (
                        <span key={skill} className="tag">{skill}</span>
                      ))}
                      {(person.skills?.length || 0) > 3 && <span className="tag">+{person.skills!.length - 3}</span>}
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <span className="badge" style={{ backgroundColor: currentPage.bg, color: currentPage.color }}>
                        {person.group}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Modal: Add/Edit Person */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingPerson?.id ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">ชื่อ *</label>
                  <input type="text" className="form-input" required value={editingPerson?.fname || ''} onChange={e => setEditingPerson({ ...editingPerson, fname: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">นามสกุล *</label>
                  <input type="text" className="form-input" required value={editingPerson?.lname || ''} onChange={e => setEditingPerson({ ...editingPerson, lname: e.target.value })} />
                </div>

                <div className="form-field">
                  <label className="form-label">เบอร์โทรศัพท์</label>
                  <input type="text" className="form-input" value={editingPerson?.phone || ''} onChange={e => setEditingPerson({ ...editingPerson, phone: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">อีเมล</label>
                  <input type="email" className="form-input" value={editingPerson?.email || ''} onChange={e => setEditingPerson({ ...editingPerson, email: e.target.value })} />
                </div>

                <div className="form-field">
                  <label className="form-label">Facebook</label>
                  <input type="text" className="form-input" placeholder="เช่น Hanif Tuanmiden" value={editingPerson?.fb || ''} onChange={e => setEditingPerson({ ...editingPerson, fb: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Line ID</label>
                  <input type="text" className="form-input" value={editingPerson?.line || ''} onChange={e => setEditingPerson({ ...editingPerson, line: e.target.value })} />
                </div>

                <div className="form-field full">
                  <label className="form-label">ลิงก์รูปภาพ (URL)</label>
                  <input type="text" className="form-input" placeholder="https://..." value={editingPerson?.photo || ''} onChange={e => setEditingPerson({ ...editingPerson, photo: e.target.value })} />
                </div>

                <div className="form-field">
                  <label className="form-label">{currentPage.groupLabel} *</label>
                  <select
                    className="form-select"
                    required
                    value={editingPerson?.group || ''}
                    onChange={e => setEditingPerson({ ...editingPerson, group: e.target.value })}
                  >
                    <option value="">เลือก{currentPage.groupLabel}</option>
                    {currentPage.groups.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="ไม่ระบุ">ไม่ระบุ</option>
                  </select>
                </div>
                {/* Only show extra Province selector in Camp pages (where group is 'Edition') */}
                {currentPageId !== 'branch' ? (
                  <div className="form-field">
                    <label className="form-label">จังหวัด / สาขา *</label>
                    <select
                      className="form-select"
                      required
                      value={editingPerson?.province?.trim() || ''}
                      onChange={e => setEditingPerson({ ...editingPerson, province: e.target.value })}
                    >
                      <option value="">เลือกจังหวัด</option>
                      {(pageConfigs.find(p => p.id === 'branch')?.groups || []).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-field">
                    <label className="form-label">วันเดือนปีเกิด</label>
                    <input type="date" className="form-input" value={editingPerson?.gen ? new Date(editingPerson.gen).toISOString().split('T')[0] : ''} onChange={e => setEditingPerson({ ...editingPerson, gen: e.target.value })} />
                  </div>
                )}

                <div className="form-field">
                  <label className="form-label">อาชีพ</label>
                  <input type="text" className="form-input" value={editingPerson?.job || ''} onChange={e => setEditingPerson({ ...editingPerson, job: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">การศึกษา (Edu)</label>
                  <input type="text" className="form-input" placeholder="เช่น ม.อ. / ปริญญาตรี" value={editingPerson?.edu || ''} onChange={e => setEditingPerson({ ...editingPerson, edu: e.target.value })} />
                </div>

                {/* Show Gen/DOB here if not already shown in the Province slot above (i.e. in Camp pages) */}
                {currentPageId !== 'branch' && (
                  <div className="form-field">
                    <label className="form-label">วันเดือนปีเกิด</label>
                    <input type="date" className="form-input" value={editingPerson?.gen ? new Date(editingPerson.gen).toISOString().split('T')[0] : ''} onChange={e => setEditingPerson({ ...editingPerson, gen: e.target.value })} />
                  </div>
                )}

                <div className="form-field full">
                  <label className="form-label">ทักษะ / ความสามารถ (คั่นด้วย ,)</label>
                  <input type="text" className="form-input" placeholder="เช่น กิจกรรม workshop บรรยาย" value={Array.isArray(editingPerson?.skills) ? editingPerson.skills.join(', ') : editingPerson?.skills || ''} onChange={e => setEditingPerson({ ...editingPerson, skills: e.target.value as any })} />
                </div>
                <div className="form-field full">
                  <label className="form-label">หมายเหตุ</label>
                  <textarea className="form-textarea" rows={3} value={editingPerson?.note || ''} onChange={e => setEditingPerson({ ...editingPerson, note: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn-primary">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Group/Edition */}
      {isGroupModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGroupModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">เพิ่ม{currentPage.groupLabel}ใหม่</h3>
            </div>
            <form onSubmit={handleAddGroupSubmit}>
              <div className="form-field">
                <label className="form-label">ชื่อ{currentPage.groupLabel}</label>
                <input
                  type="text"
                  className="form-input"
                  autoFocus
                  required
                  placeholder={`เช่น ${currentPage.groups[0] || 'หัวข้อใหม่'}`}
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsGroupModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn-primary">ตกลง</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailOpen && selectedPerson && (
        <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'start' }}>
              <div
                className="avatar"
                style={{ width: '80px', height: '80px', fontSize: '24px', backgroundColor: currentPage.bg, color: currentPage.color, cursor: selectedPerson.photo ? 'zoom-in' : 'default' }}
                onClick={() => selectedPerson.photo && setPreviewImage(getDirectImageUrl(selectedPerson.photo))}
              >
                {selectedPerson.photo ? <img src={getDirectImageUrl(selectedPerson.photo)} alt="" /> : <span>{selectedPerson.fname[0]}{selectedPerson.lname[0]}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '22px', fontWeight: 600 }}>{selectedPerson.fname} {selectedPerson.lname}</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{selectedPerson.job || 'ไม่ระบุอาชีพ'}</p>
                <div style={{ marginTop: '12px' }}>
                  <span className="badge" style={{ backgroundColor: currentPage.bg, color: currentPage.color }}>{selectedPerson.group}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'grid', gap: '16px' }}>
              {[
                { label: 'เบอร์โทรศัพท์', value: formatPhone(selectedPerson.phone), icon: <Phone size={16} color={currentPage.color} /> },
                { label: 'อีเมล', value: selectedPerson.email, icon: <Mail size={16} color={currentPage.color} /> },
                { label: 'Facebook', value: selectedPerson.fb, icon: <Users size={16} color={currentPage.color} /> },
                { label: 'Line ID', value: selectedPerson.line, icon: <MessageCircle size={16} color={currentPage.color} /> },
                { label: 'จังหวัด', value: selectedPerson.province, icon: <MapPin size={16} color={currentPage.color} /> },
                {
                  label: 'วันเดือนปีเกิด',
                  value: selectedPerson.gen ? new Date(selectedPerson.gen).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
                  icon: <Cake size={16} color={currentPage.color} />
                },
                { label: 'ความสามารถ', value: selectedPerson.skills?.join(', '), icon: <Wrench size={16} color={currentPage.color} /> },
                { label: 'หมายเหตุ', value: selectedPerson.note, icon: <FileText size={16} color={currentPage.color} /> },
              ].filter(i => i.value).map(item => (
                <div key={item.label} style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div style={{ width: '130px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.icon} {item.label}
                  </div>
                  <div style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
                    {item.value || '-'}
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn-danger" onClick={() => handleDelete(selectedPerson.id)}>ลบข้อมูล</button>
              <button className="btn-secondary" onClick={() => handleEdit(selectedPerson)}>แก้ไข</button>
              <button className="btn-primary" onClick={() => setIsDetailOpen(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div className="modal-overlay" style={{ zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={() => setPreviewImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            />
            <button
              style={{ position: 'absolute', top: '-40px', right: '-40px', background: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setPreviewImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
