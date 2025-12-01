import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; // <--- UNCOMMENT FOR STACKBLITZ/VERCEL

import { 
  BookOpen, CheckCircle, Clock, Plus, Shield, LogOut, AlertCircle, 
  Check, X, Lock, Unlock, Settings, Link as LinkIcon, FileText, 
  Trash2, UserX, Users, GraduationCap, Undo
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// --- URGENCY LOGIC (The Gradient) ---
const getUrgencyStyles = (dateStr, timeStr) => {
  if (!dateStr) return { border: 'border-l-gray-300', text: 'text-gray-500', label: 'No Date' };

  const due = new Date(`${dateStr}T${timeStr || '23:59'}`);
  const now = new Date();
  const dueDay = new Date(due).setHours(0,0,0,0);
  const today = new Date().setHours(0,0,0,0);
  
  const diffDays = (dueDay - today) / (1000 * 60 * 60 * 24);
  const isOverdue = now > due;

  if (isOverdue) return { border: 'border-l-red-900', text: 'text-red-700 font-bold', bg: 'bg-red-50', label: 'Overdue' };
  if (diffDays === 0) return { border: 'border-l-red-500', text: 'text-red-600', bg: 'bg-orange-50', label: 'Due Today' };
  if (diffDays === 1) return { border: 'border-l-orange-400', text: 'text-orange-600', bg: 'bg-yellow-50', label: 'Tomorrow' };
  if (diffDays <= 3) return { border: 'border-l-yellow-400', text: 'text-yellow-700', bg: 'bg-lime-50', label: 'Soon' };
  if (diffDays <= 7) return { border: 'border-l-lime-500', text: 'text-lime-700', bg: 'bg-green-50', label: 'This Week' };
  
  return { border: 'border-l-blue-400', text: 'text-blue-600', bg: 'bg-white', label: 'Upcoming' };
};

export default function ClassSyncApp() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('loading');
  
  // Data
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]); // For Admin User Management
  const [personalStates, setPersonalStates] = useState({}); // Stores notes/links/completed
  const [moderationEnabled, setModerationEnabled] = useState(true);

  // Forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Inputs
  const [newItem, setNewItem] = useState({ title: '', classId: '', date: '', time: '' });
  const [newClass, setNewClass] = useState({ name: '', teacher: '' });
  const [adminTab, setAdminTab] = useState('assignments'); // assignments, classes, users

  // --- INIT ---
  useEffect(() => {
    if (!supabase) { setView('setup_required'); return; }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setView('auth');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setView('auth'); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && view !== 'auth' && supabase) fetchData();
  }, [session, view]);

  // --- FETCHING ---
  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data?.is_banned) {
      setView('banned');
    } else {
      setProfile(data);
      setView('dashboard');
      // Update last seen
      await supabase.from('profiles').update({ last_seen: new Date() }).eq('id', userId);
    }
  };

  const fetchData = async () => {
    const { data: cls } = await supabase.from('classes').select('*');
    setClasses(cls || []);
    
    const { data: asgs } = await supabase.from('assignments').select('*');
    setAssignments(asgs || []);

    const { data: states } = await supabase.from('user_assignment_states').select('*').eq('user_id', session.user.id);
    const stateMap = {};
    states?.forEach(s => stateMap[s.assignment_id] = s);
    setPersonalStates(stateMap);

    const { data: settings } = await supabase.from('app_settings').select('*').single();
    if (settings) setModerationEnabled(settings.moderation_enabled);

    // Only fetch all profiles if admin
    if (profile?.is_admin) {
      const { data: users } = await supabase.from('profiles').select('*');
      setAllProfiles(users || []);
    }
  };

  // --- ACTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthLoading(true); setAuthError('');
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!fullName) throw new Error("Name required");
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        alert("Check your email!");
      }
    } catch (err) { setAuthError(err.message); } 
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => supabase.auth.signOut();

  const toggleClassEnrollment = async (classId) => {
    let current = profile.enrolled_classes || [];
    let updated = current.includes(classId) ? current.filter(id => id !== classId) : [...current, classId];
    setProfile({ ...profile, enrolled_classes: updated });
    await supabase.from('profiles').update({ enrolled_classes: updated }).eq('id', session.user.id);
  };

  const suggestAssignment = async (e) => {
    e.preventDefault();
    if (!newItem.classId || !newItem.title || !newItem.date) return;
    const status = (profile.is_admin || !moderationEnabled) ? 'approved' : 'pending';
    
    await supabase.from('assignments').insert({
      title: newItem.title,
      class_id: newItem.classId,
      due_date: newItem.date,
      due_time: newItem.time,
      suggested_by: profile.full_name,
      status
    });
    setNewItem({ title: '', classId: '', date: '', time: '' });
    fetchData();
    alert(status === 'approved' ? "Added!" : "Sent for approval.");
  };

  const suggestClass = async (e) => {
    e.preventDefault();
    if (!newClass.name) return;
    const status = (profile.is_admin) ? 'approved' : 'pending';
    
    await supabase.from('classes').insert({
      name: newClass.name,
      teacher: newClass.teacher,
      suggested_by: profile.full_name,
      status
    });
    setNewClass({ name: '', teacher: '' });
    fetchData();
    alert(status === 'approved' ? "Class Added!" : "Class suggested to Admin.");
  };

  // --- PERSONAL STATE ACTIONS (Done, Notes, Links) ---
  const updatePersonalState = async (assignmentId, updates) => {
    // Optimistic Update
    const oldState = personalStates[assignmentId] || {};
    const newState = { ...oldState, ...updates, assignment_id: assignmentId, user_id: session.user.id };
    setPersonalStates(prev => ({ ...prev, [assignmentId]: newState }));

    const { error } = await supabase.from('user_assignment_states').upsert(newState, { onConflict: 'user_id, assignment_id' });
    if (error) console.error(error);
  };

  // --- ADMIN ACTIONS ---
  const updateAssignmentStatus = async (id, status) => {
    if (status === 'deleted') await supabase.from('assignments').delete().eq('id', id);
    else await supabase.from('assignments').update({ status }).eq('id', id);
    fetchData();
  };

  const updateClassStatus = async (id, status) => {
    if (status === 'deleted') await supabase.from('classes').delete().eq('id', id);
    else await supabase.from('classes').update({ status }).eq('id', id);
    fetchData();
  };

  const toggleUserBan = async (userId, currentStatus) => {
    await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
    fetchData();
  };

  const toggleModeration = async () => {
    const newVal = !moderationEnabled;
    setModerationEnabled(newVal);
    await supabase.from('app_settings').update({ moderation_enabled: newVal }).eq('id', 1);
  };

  // --- FILTERING ---
  const myAssignments = assignments.filter(a => {
    if (!profile) return false;
    if (a.status !== 'approved') return false;
    // Hide if completed (unless in history view)
    if (personalStates[a.id]?.is_completed) return false;
    return profile.enrolled_classes?.includes(a.class_id);
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const completedAssignments = assignments.filter(a => {
    return personalStates[a.id]?.is_completed && profile.enrolled_classes?.includes(a.class_id);
  });

  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const pendingClasses = classes.filter(c => c.status === 'pending');

  // --- VIEWS ---
  if (view === 'setup_required') return <div className="h-screen flex items-center justify-center">Please configure Supabase Keys in .env</div>;
  if (view === 'banned') return <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-red-800"><Shield className="w-16 h-16 mb-4" /><h1 className="text-3xl font-bold">Access Restricted</h1><p>Your account has been suspended by the administrator.</p></div>;
  
  if (view === 'auth') return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">ClassSync</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLoginMode && <input className="w-full p-3 border rounded" placeholder="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} />}
          <input className="w-full p-3 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full p-3 border rounded" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button disabled={authLoading} className="w-full bg-indigo-600 text-white p-3 rounded font-bold">{authLoading ? '...' : (isLoginMode ? 'Log In' : 'Sign Up')}</button>
        </form>
        <button onClick={()=>setIsLoginMode(!isLoginMode)} className="w-full text-center text-sm text-indigo-600 mt-4">{isLoginMode ? 'Create Account' : 'Have an account?'}</button>
        {authError && <p className="text-red-500 text-center mt-2">{authError}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl text-indigo-900 cursor-pointer" onClick={()=>setView('dashboard')}>
            <BookOpen className="w-6 h-6" /> ClassSync
          </div>
          <nav className="flex items-center gap-1 md:gap-4 overflow-x-auto">
            <NavBtn label="Tasks" active={view==='dashboard'} onClick={()=>setView('dashboard')} />
            <NavBtn label="Classes" active={view==='classes'} onClick={()=>setView('classes')} />
            <NavBtn label="History" active={view==='history'} onClick={()=>setView('history')} />
            {profile.is_admin && <NavBtn label="Admin" active={view==='admin'} onClick={()=>setView('admin')} alert={pendingAssignments.length + pendingClasses.length} />}
            <button onClick={handleLogout}><LogOut className="w-5 h-5 text-gray-400 hover:text-red-500" /></button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4">
        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">My Assignments</h2>
              {myAssignments.length === 0 ? (
                <div className="bg-white p-12 rounded-xl text-center text-gray-500 border">No pending assignments! Relax or check History.</div>
              ) : (
                myAssignments.map(a => <AssignmentCard key={a.id} assignment={a} classes={classes} state={personalStates[a.id]} onUpdate={updatePersonalState} />)
              )}
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-xl border shadow-sm sticky top-24">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Add Task</h3>
                <form onSubmit={suggestAssignment} className="space-y-3">
                  <select className="w-full p-2 border rounded" value={newItem.classId} onChange={e=>setNewItem({...newItem, classId: e.target.value})}>
                    <option value="">Select Class...</option>
                    {classes.filter(c => profile.enrolled_classes?.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input className="w-full p-2 border rounded" placeholder="Read Chapter 5..." value={newItem.title} onChange={e=>setNewItem({...newItem, title: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="w-full p-2 border rounded" value={newItem.date} onChange={e=>setNewItem({...newItem, date: e.target.value})} />
                    <input type="time" className="w-full p-2 border rounded" value={newItem.time} onChange={e=>setNewItem({...newItem, time: e.target.value})} />
                  </div>
                  <button disabled={!profile.enrolled_classes?.length} className="w-full bg-indigo-600 text-white p-2 rounded font-bold hover:bg-indigo-700">
                    {profile.is_admin || !moderationEnabled ? 'Post Task' : 'Suggest Task'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- HISTORY --- */}
        {view === 'history' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Completed Assignments</h2>
            {completedAssignments.length === 0 ? <p className="text-gray-500">No completed tasks yet.</p> : (
              completedAssignments.map(a => (
                <div key={a.id} className="bg-gray-50 p-4 rounded-lg border mb-2 flex justify-between items-center opacity-75">
                  <span className="line-through text-gray-600">{a.title}</span>
                  <button onClick={() => updatePersonalState(a.id, { is_completed: false })} className="text-indigo-600 hover:underline text-sm flex items-center gap-1">
                    <Undo className="w-4 h-4" /> Revive
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- CLASSES --- */}
        {view === 'classes' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Manage Classes</h2>
            <div className="grid gap-3 mb-8">
              {classes.filter(c => c.status === 'approved').map(c => {
                const enrolled = profile.enrolled_classes?.includes(c.id);
                return (
                  <div key={c.id} onClick={()=>toggleClassEnrollment(c.id)} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center ${enrolled ? 'bg-indigo-50 border-indigo-500' : 'bg-white hover:border-gray-400'}`}>
                    <div><h3 className="font-bold">{c.name}</h3><p className="text-sm text-gray-500">{c.teacher}</p></div>
                    {enrolled && <CheckCircle className="text-indigo-600" />}
                  </div>
                )
              })}
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl border">
              <h3 className="font-bold mb-4">Don't see your class?</h3>
              <form onSubmit={suggestClass} className="flex gap-2">
                <input className="flex-1 p-2 border rounded" placeholder="Class Name" value={newClass.name} onChange={e=>setNewClass({...newClass, name: e.target.value})} />
                <input className="flex-1 p-2 border rounded" placeholder="Teacher" value={newClass.teacher} onChange={e=>setNewClass({...newClass, teacher: e.target.value})} />
                <button className="bg-gray-800 text-white px-4 rounded font-medium">Add</button>
              </form>
            </div>
          </div>
        )}

        {/* --- ADMIN --- */}
        {view === 'admin' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <button onClick={()=>setAdminTab('assignments')} className={`font-bold ${adminTab==='assignments' ? 'text-indigo-600 underline' : 'text-gray-500'}`}>Assignments ({pendingAssignments.length})</button>
                <button onClick={()=>setAdminTab('classes')} className={`font-bold ${adminTab==='classes' ? 'text-indigo-600 underline' : 'text-gray-500'}`}>Classes ({pendingClasses.length})</button>
                <button onClick={()=>setAdminTab('users')} className={`font-bold ${adminTab==='users' ? 'text-indigo-600 underline' : 'text-gray-500'}`}>Users</button>
              </div>
              <button onClick={toggleModeration} className={`px-3 py-1 rounded text-xs font-bold border ${moderationEnabled ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                Strict Mode: {moderationEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {adminTab === 'assignments' && (
              <div className="space-y-2">
                {pendingAssignments.length === 0 && <p className="text-gray-400 italic">No pending assignments.</p>}
                {pendingAssignments.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded border flex justify-between items-center">
                    <div>
                      <p className="font-bold">{p.title} <span className="text-xs font-normal text-gray-500">for {classes.find(c=>c.id===p.class_id)?.name}</span></p>
                      <p className="text-xs text-gray-400">By: {p.suggested_by}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>updateAssignmentStatus(p.id, 'approved')} className="p-2 bg-green-100 rounded text-green-700"><Check size={16} /></button>
                      <button onClick={()=>updateAssignmentStatus(p.id, 'deleted')} className="p-2 bg-red-100 rounded text-red-700"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {adminTab === 'classes' && (
              <div className="space-y-2">
                {pendingClasses.map(c => (
                  <div key={c.id} className="bg-white p-4 rounded border flex justify-between items-center">
                    <div><p className="font-bold">{c.name}</p><p className="text-sm text-gray-500">{c.teacher}</p></div>
                    <div className="flex gap-2">
                      <button onClick={()=>updateClassStatus(c.id, 'approved')} className="p-2 bg-green-100 rounded text-green-700"><Check size={16} /></button>
                      <button onClick={()=>updateClassStatus(c.id, 'deleted')} className="p-2 bg-red-100 rounded text-red-700"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {/* List Active Classes for Deletion */}
                <h3 className="font-bold mt-8 mb-2">Active Classes</h3>
                {classes.filter(c => c.status === 'approved').map(c => (
                   <div key={c.id} className="bg-gray-50 p-3 rounded border flex justify-between items-center mb-1">
                     <span>{c.name} ({c.teacher})</span>
                     <button onClick={()=>updateClassStatus(c.id, 'deleted')} className="text-red-500 text-xs hover:underline">Remove</button>
                   </div>
                ))}
              </div>
            )}

            {adminTab === 'users' && (
              <div className="bg-white rounded border overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 font-bold text-gray-600">
                    <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Action</th></tr>
                  </thead>
                  <tbody>
                    {allProfiles.map(u => (
                      <tr key={u.id} className="border-t">
                        <td className="p-3">{u.full_name} {u.is_admin && <span className="bg-purple-100 text-purple-800 text-xs px-1 rounded">Admin</span>}</td>
                        <td className="p-3 text-gray-500">{u.email}</td>
                        <td className="p-3">{u.is_banned ? <span className="text-red-600 font-bold">Banned</span> : <span className="text-green-600">Active</span>}</td>
                        <td className="p-3">
                          {!u.is_admin && (
                            <button onClick={()=>toggleUserBan(u.id, u.is_banned)} className={`px-2 py-1 rounded text-xs font-bold ${u.is_banned ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-600'}`}>
                              {u.is_banned ? 'Unban' : 'Ban'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function NavBtn({ label, active, onClick, alert }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>
      {label}
      {alert > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">{alert}</span>}
    </button>
  )
}

function AssignmentCard({ assignment: a, classes, state, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const cls = classes.find(c => c.id === a.class_id);
  const urgency = getUrgencyStyles(a.due_date, a.due_time);
  
  return (
    <div className={`bg-white border-l-4 ${urgency.border} rounded-r-xl shadow-sm border-y border-r transition-all`}>
      <div className="p-4 flex gap-4">
        {/* Checkbox */}
        <button 
          onClick={() => onUpdate(a.id, { is_completed: true })}
          className="w-6 h-6 mt-1 border-2 border-gray-300 rounded-full hover:border-green-500 hover:bg-green-50 transition flex items-center justify-center flex-shrink-0"
        />
        
        {/* Content */}
        <div className="flex-1 cursor-pointer" onClick={()=>setExpanded(!expanded)}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${urgency.bg} ${urgency.text}`}>{urgency.label}</span>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{cls?.name}</span>
          </div>
          <h3 className="font-bold text-gray-800 text-lg leading-tight">{a.title}</h3>
          <div className="flex items-center text-sm text-gray-500 mt-1 gap-3">
            <span className={`${urgency.text}`}>{new Date(a.due_date).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}</span>
            {a.due_time && <span className="flex items-center"><Clock size={14} className="mr-1"/> {new Date(`2000-01-01T${a.due_time}`).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</span>}
          </div>
        </div>
      </div>

      {/* Expanded Personal Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t bg-gray-50 rounded-br-xl">
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 bg-white p-2 rounded border focus-within:ring-1 ring-indigo-300">
              <FileText size={16} className="text-gray-400" />
              <input 
                className="flex-1 text-sm outline-none bg-transparent" 
                placeholder="Add personal notes..." 
                value={state?.personal_note || ''} 
                onChange={e => onUpdate(a.id, { personal_note: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded border focus-within:ring-1 ring-indigo-300">
              <LinkIcon size={16} className="text-gray-400" />
              <input 
                className="flex-1 text-sm outline-none bg-transparent" 
                placeholder="Paste Google Doc/Link..." 
                value={state?.personal_link || ''} 
                onChange={e => onUpdate(a.id, { personal_link: e.target.value })}
              />
              {state?.personal_link && (
                <a href={state.personal_link.startsWith('http') ? state.personal_link : `https://${state.personal_link}`} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">Open</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}