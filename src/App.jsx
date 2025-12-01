import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 

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
    // If Supabase isn't configured, show the Setup screen
    if (!supabase) {
      setView('setup_required');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setView('auth');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setView('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && view !== 'auth' && supabase) fetchData();
  }, [session, view]);

  const fetchProfile = async (userId) => {
    if (!supabase) return;
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
    if (!supabase) return;
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

    if (profile?.is_admin) {
      const { data: users } = await supabase.from('profiles').select('*');
      setAllProfiles(users || []);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthLoading(true); setAuthError('');
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!fullName) throw new Error("Please enter your name.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const toggleClassEnrollment = async (classId) => {
    if (!profile || !supabase) return;
    let current = profile.enrolled_classes || [];
    let updated = current.includes(classId) 
      ? current.filter(id => id !== classId)
      : [...current, classId];

    setProfile({ ...profile, enrolled_classes: updated });

    await supabase.from('profiles').update({ enrolled_classes: updated }).eq('id', session.user.id);
  };

  const submitAssignment = async (e) => {
    e.preventDefault();
    if (!newItem.classId || !newItem.title || !newItem.date || !supabase) return;

    const status = (profile.is_admin || !moderationEnabled) ? 'approved' : 'pending';

    await supabase.from('assignments').insert({
      title: newItem.title,
      class_id: newItem.classId,
      due_date: newItem.date,
      due_time: newItem.time,
      suggested_by: profile.full_name,
      status: status
    });

    setNewItem({ title: '', classId: '', date: '', time: '' });
    fetchData();
    alert(status === 'approved' ? "Assignment Added!" : "Assignment submitted for review.");
  };

  const suggestClass = async (e) => {
    e.preventDefault();
    if (!newClass.name || !supabase) return;
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

  const updatePersonalState = async (assignmentId, updates) => {
    if (!supabase) return;
    const oldState = personalStates[assignmentId] || {};
    const newState = { ...oldState, ...updates, assignment_id: assignmentId, user_id: session.user.id };
    setPersonalStates(prev => ({ ...prev, [assignmentId]: newState }));

    const { error } = await supabase.from('user_assignment_states').upsert(newState, { onConflict: 'user_id, assignment_id' });
    if (error) console.error(error);
  };

  const updateAssignmentStatus = async (id, status) => {
    if (!supabase) return;
    if (status === 'deleted') {
      await supabase.from('assignments').delete().eq('id', id);
    } else {
      await supabase.from('assignments').update({ status }).eq('id', id);
    }
    fetchData();
  };

  const updateClassStatus = async (id, status) => {
    if (!supabase) return;
    if (status === 'deleted') await supabase.from('classes').delete().eq('id', id);
    else await supabase.from('classes').update({ status }).eq('id', id);
    fetchData();
  };

  const toggleUserBan = async (userId, currentStatus) => {
    if (!supabase) return;
    await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
    fetchData();
  };

  const toggleModeration = async () => {
    if (!supabase) return;
    const newValue = !moderationEnabled;
    setModerationEnabled(newValue);
    await supabase.from('app_settings').update({ moderation_enabled: newValue }).eq('id', 1);
  };

  // --- RENDERING ---
  const sortedClasses = [...classes].sort((a, b) => {
    const aEnrolled = profile?.enrolled_classes?.includes(a.id);
    const bEnrolled = profile?.enrolled_classes?.includes(b.id);
    if (aEnrolled && !bEnrolled) return -1;
    if (!aEnrolled && bEnrolled) return 1;
    return a.name.localeCompare(b.name);
  });

  const myAssignments = assignments.filter(a => {
    if (!profile) return false;
    if (a.status !== 'approved') return false;
    if (personalStates[a.id]?.is_completed) return false;
    return profile.enrolled_classes?.includes(a.class_id);
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const completedAssignments = assignments.filter(a => {
    return personalStates[a.id]?.is_completed && profile.enrolled_classes?.includes(a.class_id);
  });

  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const pendingClasses = classes.filter(c => c.status === 'pending');

  if (view === 'loading') return <div className="h-screen flex items-center justify-center text-gray-500">Connecting to ClassSync...</div>;

  // --- MISSING CONFIGURATION VIEW ---
  if (view === 'setup_required') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg border border-red-100">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 p-4 rounded-full">
              <Settings className="text-red-600 w-10 h-10" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuration Missing</h1>
          <p className="text-gray-600 mb-6">
            The app cannot connect to the database because the API keys are missing.
          </p>
          
          <div className="text-left bg-gray-900 text-gray-200 p-4 rounded-lg text-sm font-mono overflow-x-auto mb-6">
            <p className="text-gray-500 mb-2"># Add these to your .env file or Vercel Settings:</p>
            <p>VITE_SUPABASE_URL=https://your-project.supabase.co</p>
            <p>VITE_SUPABASE_ANON_KEY=your-anon-key-here</p>
          </div>

          <p className="text-sm text-gray-500">
            Once you add these environment variables, refresh the page.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'banned') return <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-red-800"><Shield className="w-16 h-16 mb-4" /><h1 className="text-3xl font-bold">Access Restricted</h1><p>Your account has been suspended by the administrator.</p></div>;

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-600 p-3 rounded-full">
              <BookOpen className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">ClassSync</h1>
          <form onSubmit={handleAuth} className="space-y-4 mt-8">
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input type="text" required className="w-full p-3 border rounded-lg outline-none focus:border-indigo-500" 
                  value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" required className="w-full p-3 border rounded-lg outline-none focus:border-indigo-500" 
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" required minLength={6} className="w-full p-3 border rounded-lg outline-none focus:border-indigo-500" 
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{authError}</div>}
            <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50">
              {authLoading ? 'Processing...' : (isLoginMode ? 'Log In' : 'Sign Up')}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} className="text-indigo-600 hover:underline text-sm">
              {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl text-indigo-900 cursor-pointer" onClick={()=>setView('dashboard')}>
            <BookOpen className="w-6 h-6" /> <span className="hidden sm:inline">ClassSync</span>
          </div>
          <nav className="flex items-center gap-1 md:gap-4 overflow-x-auto no-scrollbar">
            <NavBtn label="Tasks" active={view==='dashboard'} onClick={()=>setView('dashboard')} />
            <NavBtn label="Classes" active={view==='classes'} onClick={()=>setView('classes')} />
            <NavBtn label="History" active={view==='history'} onClick={()=>setView('history')} />
            {profile?.is_admin && <NavBtn label="Admin" active={view==='admin'} onClick={()=>setView('admin')} alert={pendingAssignments.length + pendingClasses.length} />}
            <button onClick={handleLogout} className="ml-2"><LogOut className="w-5 h-5 text-gray-400 hover:text-red-500 transition" /></button>
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
                <div className="bg-white p-12 rounded-xl text-center text-gray-500 border">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-200" />
                  <p>No pending assignments! Relax or check History.</p>
                </div>
              ) : (
                myAssignments.map(a => <AssignmentCard key={a.id} assignment={a} classes={classes} state={personalStates[a.id]} onUpdate={updatePersonalState} />)
              )}
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-xl border shadow-sm sticky top-24">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-700"><Plus className="w-5 h-5 text-indigo-600" /> Add Task</h3>
                <form onSubmit={submitAssignment} className="space-y-3">
                  <select className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-1 ring-indigo-500" value={newItem.classId} onChange={e=>setNewItem({...newItem, classId: e.target.value})}>
                    <option value="">Select Class...</option>
                    {classes.filter(c => profile.enrolled_classes?.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-1 ring-indigo-500" placeholder="Read Chapter 5..." value={newItem.title} onChange={e=>setNewItem({...newItem, title: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-1 ring-indigo-500" value={newItem.date} onChange={e=>setNewItem({...newItem, date: e.target.value})} />
                    <input type="time" className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-1 ring-indigo-500" value={newItem.time} onChange={e=>setNewItem({...newItem, time: e.target.value})} />
                  </div>
                  <button disabled={!profile.enrolled_classes?.length} className="w-full bg-indigo-600 text-white p-2 rounded font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                    {profile.is_admin || !moderationEnabled ? 'Post Task' : 'Suggest Task'}
                  </button>
                  {!profile.enrolled_classes?.length && <p className="text-xs text-red-500 text-center">Enroll in a class first.</p>}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- HISTORY --- */}
        {view === 'history' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Completed Assignments</h2>
            {completedAssignments.length === 0 ? <p className="text-gray-500 italic">No completed tasks yet.</p> : (
              completedAssignments.map(a => (
                <div key={a.id} className="bg-gray-50 p-4 rounded-lg border mb-2 flex justify-between items-center opacity-75">
                  <span className="line-through text-gray-600">{a.title}</span>
                  <button onClick={() => updatePersonalState(a.id, { is_completed: false })} className="text-indigo-600 hover:underline text-sm flex items-center gap-1 font-medium">
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
                  <div key={c.id} onClick={()=>toggleClassEnrollment(c.id)} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${enrolled ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white hover:border-gray-400'}`}>
                    <div><h3 className="font-bold text-gray-800">{c.name}</h3><p className="text-sm text-gray-500">{c.teacher}</p></div>
                    {enrolled && <CheckCircle className="text-indigo-600 w-6 h-6" />}
                  </div>
                )
              })}
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl border">
              <h3 className="font-bold mb-4 text-gray-700">Don't see your class?</h3>
              <form onSubmit={suggestClass} className="flex gap-2">
                <input className="flex-1 p-2 border rounded outline-none focus:ring-1 ring-indigo-500" placeholder="Class Name" value={newClass.name} onChange={e=>setNewClass({...newClass, name: e.target.value})} />
                <input className="flex-1 p-2 border rounded outline-none focus:ring-1 ring-indigo-500" placeholder="Teacher" value={newClass.teacher} onChange={e=>setNewClass({...newClass, teacher: e.target.value})} />
                <button className="bg-gray-800 text-white px-4 rounded font-medium hover:bg-black transition">Add</button>
              </form>
            </div>
          </div>
        )}

        {/* --- ADMIN --- */}
        {view === 'admin' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex gap-4">
                <button onClick={()=>setAdminTab('assignments')} className={`font-bold ${adminTab==='assignments' ? 'text-indigo-600 underline' : 'text-gray-500'}`}>Assignments ({pendingAssignments.length})</button>
                <button onClick={()=>setAdminTab('classes')} className={`font-bold ${adminTab==='classes' ? 'text-indigo-600 underline' : 'text-gray-500'}`}>Classes ({pendingClasses.length})</button>
                <button onClick={()=>setAdminTab('users')} className={`font-bold ${adminTab==='users' ? 'text-indigo-600 underline' : 'text-gray-500'}`}>Users</button>
              </div>
              <button onClick={toggleModeration} className={`px-3 py-1 rounded text-xs font-bold border flex items-center gap-2 ${moderationEnabled ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                {moderationEnabled ? <Lock size={12}/> : <Unlock size={12}/>} Strict Mode: {moderationEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {adminTab === 'assignments' && (
              <div className="space-y-2">
                {pendingAssignments.length === 0 && <p className="text-gray-400 italic">No pending assignments.</p>}
                {pendingAssignments.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded border flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold">{p.title} <span className="text-xs font-normal text-gray-500">for {classes.find(c=>c.id===p.class_id)?.name}</span></p>
                      <p className="text-xs text-gray-400">By: {p.suggested_by} • {new Date(p.due_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>updateAssignmentStatus(p.id, 'approved')} className="p-2 bg-green-100 rounded text-green-700 hover:bg-green-200"><Check size={16} /></button>
                      <button onClick={()=>updateAssignmentStatus(p.id, 'deleted')} className="p-2 bg-red-100 rounded text-red-700 hover:bg-red-200"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {adminTab === 'classes' && (
              <div className="space-y-2">
                {pendingClasses.map(c => (
                  <div key={c.id} className="bg-white p-4 rounded border flex justify-between items-center shadow-sm">
                    <div><p className="font-bold">{c.name}</p><p className="text-sm text-gray-500">{c.teacher}</p></div>
                    <div className="flex gap-2">
                      <button onClick={()=>updateClassStatus(c.id, 'approved')} className="p-2 bg-green-100 rounded text-green-700 hover:bg-green-200"><Check size={16} /></button>
                      <button onClick={()=>updateClassStatus(c.id, 'deleted')} className="p-2 bg-red-100 rounded text-red-700 hover:bg-red-200"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {/* List Active Classes for Deletion */}
                <h3 className="font-bold mt-8 mb-2 text-gray-700">Active Classes</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {classes.filter(c => c.status === 'approved').map(c => (
                     <div key={c.id} className="bg-gray-50 p-3 rounded border flex justify-between items-center">
                       <span className="text-sm font-medium">{c.name} <span className="text-gray-500 font-normal">({c.teacher})</span></span>
                       <button onClick={()=>updateClassStatus(c.id, 'deleted')} className="text-red-500 text-xs hover:underline bg-white px-2 py-1 border rounded hover:bg-red-50">Remove</button>
                     </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'users' && (
              <div className="bg-white rounded border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 font-bold text-gray-600">
                    <tr><th className="p-3">Name</th><th className="p-3 hidden sm:table-cell">Email</th><th className="p-3">Status</th><th className="p-3">Action</th></tr>
                  </thead>
                  <tbody>
                    {allProfiles.map(u => (
                      <tr key={u.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{u.full_name} {u.is_admin && <span className="bg-purple-100 text-purple-800 text-[10px] px-1 rounded ml-1">ADMIN</span>}</div>
                          <div className="text-xs text-gray-400 sm:hidden">{u.email}</div>
                        </td>
                        <td className="p-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                        <td className="p-3">{u.is_banned ? <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">BANNED</span> : <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">ACTIVE</span>}</td>
                        <td className="p-3">
                          {!u.is_admin && (
                            <button onClick={()=>toggleUserBan(u.id, u.is_banned)} className={`px-2 py-1 rounded text-xs font-bold transition ${u.is_banned ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
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
      {alert > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{alert}</span>}
    </button>
  )
}

function AssignmentCard({ assignment: a, classes, state, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const cls = classes.find(c => c.id === a.class_id);
  const urgency = getUrgencyStyles(a.due_date, a.due_time);
  
  return (
    <div className={`bg-white border-l-4 ${urgency.border} rounded-r-xl shadow-sm border-y border-r transition-all hover:shadow-md`}>
      <div className="p-4 flex gap-4">
        {/* Checkbox */}
        <button 
          onClick={() => onUpdate(a.id, { is_completed: true })}
          className="w-6 h-6 mt-1 border-2 border-gray-300 rounded-full hover:border-green-500 hover:bg-green-50 transition flex items-center justify-center flex-shrink-0 group"
        >
          <Check className="w-3 h-3 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
        </button>
        
        {/* Content */}
        <div className="flex-1 cursor-pointer" onClick={()=>setExpanded(!expanded)}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${urgency.bg} ${urgency.text}`}>{urgency.label}</span>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{cls?.name}</span>
          </div>
          <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{a.title}</h3>
          <div className="flex items-center text-sm text-gray-500 gap-3">
            <span className={`font-medium ${urgency.text}`}>{new Date(a.due_date).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}</span>
            {a.due_time && <span className="flex items-center bg-gray-50 px-1.5 py-0.5 rounded text-xs"><Clock size={12} className="mr-1"/> {new Date(`2000-01-01T${a.due_time}`).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</span>}
          </div>
        </div>
      </div>

      {/* Expanded Personal Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t bg-gray-50 rounded-br-xl animate-in slide-in-from-top-1">
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 bg-white p-2 rounded border focus-within:ring-1 ring-indigo-300 shadow-sm">
              <FileText size={16} className="text-gray-400" />
              <input 
                className="flex-1 text-sm outline-none bg-transparent" 
                placeholder="Add personal notes (private)..." 
                value={state?.personal_note || ''} 
                onChange={e => onUpdate(a.id, { personal_note: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded border focus-within:ring-1 ring-indigo-300 shadow-sm">
              <LinkIcon size={16} className="text-gray-400" />
              <input 
                className="flex-1 text-sm outline-none bg-transparent" 
                placeholder="Paste Google Doc link (private)..." 
                value={state?.personal_link || ''} 
                onChange={e => onUpdate(a.id, { personal_link: e.target.value })}
              />
              {state?.personal_link && (
                <a href={state.personal_link.startsWith('http') ? state.personal_link : `https://${state.personal_link}`} target="_blank" rel="noreferrer" className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">OPEN</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}