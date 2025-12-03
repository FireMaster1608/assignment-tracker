import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 

import { 
  BookOpen, CheckCircle, Clock, Plus, Shield, LogOut, AlertCircle, 
  Check, X, Lock, Unlock, Settings, Link as LinkIcon, FileText, 
  Trash2, UserX, Users, GraduationCap, Undo, Palette, 
  ExternalLink, Calendar, ChevronRight, WifiOff, Info, Asterisk
} from 'lucide-react';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// --- UTILS (Corrected Gradient & Colors) ---
const COLORS = {
  pink: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300', btn: 'bg-pink-500 hover:bg-pink-600', ring: 'ring-pink-400' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', btn: 'bg-orange-500 hover:bg-orange-600', ring: 'ring-orange-400' },
  red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', btn: 'bg-red-500 hover:bg-red-600', ring: 'ring-red-400' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', btn: 'bg-purple-500 hover:bg-purple-600', ring: 'ring-purple-400' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', btn: 'bg-blue-500 hover:bg-blue-600', ring: 'ring-blue-400' },
  green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', btn: 'bg-green-500 hover:bg-green-600', ring: 'ring-green-400' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', btn: 'bg-yellow-500 hover:bg-yellow-600', ring: 'ring-yellow-400' },
};

const getUrgencyStyles = (dateStr, timeStr) => {
  if (!dateStr) return { color: 'text-gray-400', label: 'No Date', border: 'border-l-gray-300' };
  
  const due = new Date(`${dateStr}T${timeStr || '23:59'}`);
  const now = new Date();
  
  const diffHours = (due - now) / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffHours / 24);

  if (diffHours < 0) return { color: 'text-red-600 font-extrabold', label: 'Overdue', border: 'border-l-red-500' };
  if (diffHours < 24) return { color: 'text-orange-600 font-bold', label: 'Due Today', border: 'border-l-orange-400' };
  if (diffDays <= 1) return { color: 'text-yellow-600 font-bold', label: 'Tomorrow', border: 'border-l-yellow-400' };
  if (diffDays <= 3) return { color: 'text-lime-600', label: 'Soon', border: 'border-l-lime-400' };
  if (diffDays <= 7) return { color: 'text-emerald-600', label: 'This Week', border: 'border-l-emerald-400' };
  
  return { color: 'text-blue-600', label: 'Upcoming', border: 'border-l-blue-400' };
};

const getDomain = (url) => {
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'Link';
  }
};

// --- SUB-COMPONENTS ---

const NavBtn = ({ label, active, onClick, alert, accent }) => (
  <button onClick={onClick} className={`px-5 py-2 rounded-2xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${active ? `${COLORS[accent].bg} ${COLORS[accent].text}` : 'text-gray-500 hover:bg-gray-100'}`}>
    {label}
    {alert > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse shadow-sm">{alert}</span>}
  </button>
);

const AssignmentCard = ({ assignment: a, classes, personalStates, updatePersonalState, accent, classColors, onShowLocalWarning }) => {  const [expanded, setExpanded] = useState(false);
  const cls = classes.find(c => c.id === a.class_id);
  const state = personalStates[a.id];
  const urgency = getUrgencyStyles(a.due_date, a.due_time);
  
  const classColorKey = classColors[a.class_id] || 'blue';
  const classTheme = COLORS[classColorKey]; 
  
  const notes = state?.personal_note ? state.personal_note.split('\n') : [];

  return (
    <div className={`bg-white border-l-[6px] ${urgency.border} rounded-r-3xl shadow-sm border-y border-r transition-all hover:shadow-md mb-5 group overflow-hidden`}>
      <div className="p-6 flex gap-5">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            updatePersonalState(a.id, { is_completed: true });
          }}
          className="w-7 h-7 mt-1 border-[3px] border-gray-200 rounded-full hover:border-emerald-400 hover:bg-emerald-50 transition flex items-center justify-center flex-shrink-0 group-hover:scale-105"
        >
          <Check className="w-3.5 h-3.5 text-emerald-500 opacity-0 hover:opacity-100 transition-opacity stroke-[4]"/>
        </button>
        
        <div className="flex-1 cursor-pointer" onClick={()=>setExpanded(!expanded)}>
          {/* Header: Date & Time */}
          <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-4">
               <span className={`text-sm font-bold flex items-center gap-1.5 ${urgency.color}`}>
                 <Calendar size={16} className="stroke-[2.5]"/>
                 {new Date(a.due_date).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}
               </span>
               {a.due_time && (
                 <span className={`flex items-center px-3 py-1 rounded-xl text-sm font-bold tracking-wide ${urgency.color.includes('red') ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                   {new Date(`2000-01-01T${a.due_time}`).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}
                 </span>
               )}
             </div>
             {urgency.label === 'Overdue' && <span className="text-[10px] bg-red-100 text-red-600 px-3 py-1 rounded-full font-black tracking-wider">LATE</span>}
          </div>

          {/* Body: Title & Class (Reduced Title Size) */}
          <div className="flex items-center flex-wrap gap-3 mb-3">
            <h3 className="font-extrabold text-gray-800 text-xl leading-tight tracking-tight">{a.title}</h3>
            {a.is_personal ? (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${classTheme.bg} ${classTheme.text}`}>
                Personal
                {a.store_local && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onShowLocalWarning(); }}
                    className="hover:scale-110 transition-transform"
                  >
                    <Asterisk size={12} className="stroke-[3]" />
                  </button>
                )}
              </span>
            ) : (
              <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${classTheme.bg} ${classTheme.text}`}>
                {cls?.name}
              </span>
            )}
          </div>
          
          {/* Notes Preview (Larger Font) */}
          {!expanded && notes.length > 0 && (
            <div className="mt-3 pl-4 border-l-4 border-gray-100 space-y-1">
              {notes.map((n, i) => <p key={i} className="text-base text-gray-600 font-medium">• {n}</p>)}
            </div>
          )}
        </div>
      </div>

      {/* Link Bar */}
      {state?.personal_link && !expanded && (
        <a 
          href={state.personal_link.startsWith('http') ? state.personal_link : `https://${state.personal_link}`} 
          target="_blank" 
          rel="noreferrer"
          className="block bg-slate-50 hover:bg-slate-100 px-6 py-3 border-t border-slate-100 transition-colors group/link"
        >
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
            <ExternalLink size={16} />
            <span className="group-hover/link:underline">{getDomain(state.personal_link)}</span>
            <span className="text-gray-400 text-xs font-normal ml-auto">Click to open</span>
          </div>
        </a>
      )}

      {/* Expanded Edit View */}
      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2">
          <div className="space-y-5">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 ring-indigo-100 transition-all">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-3 uppercase tracking-widest"><FileText size={14} /> Personal Notes</label>
              <textarea 
                className="w-full text-lg text-gray-700 font-medium outline-none bg-transparent resize-none placeholder-gray-300 leading-relaxed" 
                rows={3}
                placeholder="• Type notes here... (Press Enter for new line)" 
                value={state?.personal_note || ''} 
                onChange={e => updatePersonalState(a.id, { personal_note: e.target.value })}
              />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 ring-indigo-100 transition-all">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-3 uppercase tracking-widest"><LinkIcon size={14} /> Attachment</label>
              <div className="flex gap-3">
                <input 
                  className="flex-1 text-sm font-medium outline-none bg-transparent text-gray-600 placeholder-gray-300" 
                  placeholder="Paste URL here..." 
                  value={state?.personal_link || ''} 
                  onChange={e => updatePersonalState(a.id, { personal_link: e.target.value })}
                />
                {state?.personal_link && (
                  <a href={state.personal_link.startsWith('http') ? state.personal_link : `https://${state.personal_link}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 text-xs font-bold bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
                    OPEN <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
};

// --- MAIN APP ---

export default function ClassSyncApp() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('loading');
  
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]); 
  const [personalStates, setPersonalStates] = useState({}); 
  const [moderationEnabled, setModerationEnabled] = useState(true);

  // Personalization
  const [accent, setAccent] = useState(localStorage.getItem('cs_accent') || 'blue');
  const [classColors, setClassColors] = useState(JSON.parse(localStorage.getItem('cs_class_colors') || '{}'));
  const [showSettings, setShowSettings] = useState(false);
  const [undoTask, setUndoTask] = useState(null);
  const [selectedClassForColor, setSelectedClassForColor] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [showLocalWarning, setShowLocalWarning] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [newItem, setNewItem] = useState({ title: '', classId: '', date: '', time: '', isPersonal: false, storeLocal: true });
  const [newClass, setNewClass] = useState({ name: '', teacher: '' });
  const [adminTab, setAdminTab] = useState('assignments');

  useEffect(() => {
    localStorage.setItem('cs_accent', accent);
    localStorage.setItem('cs_class_colors', JSON.stringify(classColors));
  }, [accent, classColors]);
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowOfflineNotice(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowOfflineNotice(true);
    };
  
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (view !== 'loading' && view !== 'auth' && view !== 'setup_required') {
      localStorage.setItem('cs_last_view', view);
    }
  }, [view]);

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

  // Update FetchData dependency to run when Profile is loaded (Fixes Empty Admin Tabs)
  useEffect(() => {
    if (session && view !== 'auth' && supabase && profile) fetchData();
  }, [session, view, profile]);

  const fetchProfile = async (userId) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (error) throw error;
      
      if (data?.is_banned) {
        setView('banned');
      } else {
        setProfile(data);
        const lastView = localStorage.getItem('cs_last_view');
        setView(lastView && lastView !== 'loading' && lastView !== 'auth' ? lastView : 'dashboard');
        await supabase.from('profiles').update({ last_seen: new Date() }).eq('id', userId);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setView('dashboard');
    }
  };

  const fetchData = async () => {
    if (!supabase) return;
    const { data: cls } = await supabase.from('classes').select('*');
    setClasses(cls || []);
    
    const { data: asgs } = await supabase.from('assignments').select('*');
const localTasks = JSON.parse(localStorage.getItem('cs_personal_tasks') || '[]');

// Filter server personal tasks to only show current user's
const filteredAsgs = (asgs || []).filter(a => {
  if (a.is_personal) {
    return a.user_id === session.user.id; // Only show user's own personal tasks
  }
  return true; // Show all non-personal tasks
});

setAssignments([...filteredAsgs, ...localTasks]);

    const { data: states } = await supabase.from('user_assignment_states').select('*').eq('user_id', session.user.id);
    const stateMap = {};
    states?.forEach(s => stateMap[s.assignment_id] = s);
    setPersonalStates(stateMap);

    const { data: settings } = await supabase.from('app_settings').select('*').single();
    if (settings) setModerationEnabled(settings.moderation_enabled);

    // Now securely fetches admin data because we check profile.is_admin inside the effect dependency
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
        if (!fullName) throw new Error("Name required");
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      }
    } catch (err) { setAuthError(err.message); } 
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('auth');
  };

  const toggleClassEnrollment = async (classId) => {
    if (!supabase) return;
    let current = profile.enrolled_classes || [];
    let updated = current.includes(classId) ? current.filter(id => id !== classId) : [...current, classId];
    setProfile({ ...profile, enrolled_classes: updated });
    await supabase.from('profiles').update({ enrolled_classes: updated }).eq('id', session.user.id);
  };

  const suggestAssignment = async (e) => {
    e.preventDefault();
    if (!newItem.title || !newItem.date || !supabase) return;
    
    if (newItem.isPersonal) {
      // Handle personal task
      const personalTask = {
        title: newItem.title,
        class_id: 'personal',
        due_date: newItem.date,
        due_time: newItem.time,
        is_personal: true,
        store_local: newItem.storeLocal,
        user_id: session.user.id,
        status: 'approved'
      };
    
      if (newItem.storeLocal) {
        // Store in localStorage
        const localTasks = JSON.parse(localStorage.getItem('cs_personal_tasks') || '[]');
        personalTask.id = Date.now();
        localTasks.push(personalTask);
        localStorage.setItem('cs_personal_tasks', JSON.stringify(localTasks));
        setAssignments([...assignments, personalTask]);
      } else {
        // Store on server
        const { data, error } = await supabase.from('assignments').insert(personalTask).select();
        if (error) {
          console.error('Error saving personal task:', error);
          alert('Failed to save task: ' + error.message);
        } else if (data) {
          await fetchData(); // Refresh all data including the new task
        }
      }
      
      setNewItem({ title: '', classId: '', date: '', time: '', isPersonal: false, storeLocal: true });
      alert("Personal task added!");
    } 
      setNewItem({ title: '', classId: '', date: '', time: '', isPersonal: false, storeLocal: true });
      alert("Personal task added!");
    } else {
      // Handle school assignment
      if (!newItem.classId) return;
      const status = (profile.is_admin || !moderationEnabled) ? 'approved' : 'pending';
      
      await supabase.from('assignments').insert({
        title: newItem.title,
        class_id: newItem.classId,
        due_date: newItem.date,
        due_time: newItem.time,
        suggested_by: profile.full_name,
        status,
        is_personal: false
      });
      setNewItem({ title: '', classId: '', date: '', time: '', isPersonal: false, storeLocal: true });
      fetchData();
      alert(status === 'approved' ? "Published!" : "Sent for approval.");
    }
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
    if (updates.is_completed) {
      setUndoTask(assignmentId);
      setTimeout(() => setUndoTask(null), 5000);
    }
    const oldState = personalStates[assignmentId] || {};
    const newState = { ...oldState, ...updates, assignment_id: assignmentId, user_id: session.user.id };
    setPersonalStates(prev => ({ ...prev, [assignmentId]: newState }));
    const { error } = await supabase.from('user_assignment_states').upsert(newState, { onConflict: 'user_id, assignment_id' });
    if (error) console.error(error);
  };

  const handleUndo = () => {
    if (undoTask) {
      updatePersonalState(undoTask, { is_completed: false });
      setUndoTask(null);
    }
  };

  const updateAssignmentStatus = async (id, status) => {
    if (!supabase) return;
    if (status === 'deleted') await supabase.from('assignments').delete().eq('id', id);
    else await supabase.from('assignments').update({ status }).eq('id', id);
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
    const newVal = !moderationEnabled;
    setModerationEnabled(newVal);
    await supabase.from('app_settings').update({ moderation_enabled: newVal }).eq('id', 1);
  };

  const myAssignments = assignments.filter(a => {
    if (!profile) return false;
    if (a.status !== 'approved') return false;
    if (personalStates[a.id]?.is_completed) return false;
    if (a.is_personal && a.user_id === session.user.id) return true;
    return profile.enrolled_classes?.includes(a.class_id);
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const completedAssignments = assignments.filter(a => {
    if (!personalStates[a.id]?.is_completed) return false;
    if (a.is_personal && a.user_id === session.user.id) return true;
    return profile.enrolled_classes?.includes(a.class_id);
  });

  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const pendingClasses = classes.filter(c => c.status === 'pending');

  if (view === 'setup_required') return <div className="h-screen flex items-center justify-center p-6 text-center"><h1 className="text-xl font-bold text-red-600">Config Missing in .env</h1></div>;
  if (view === 'loading') return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><p className="text-slate-600 font-medium">Loading...</p></div></div>;
  if (view === 'banned') return <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-red-800"><Shield className="w-16 h-16 mb-4" /><h1 className="text-3xl font-bold">Access Restricted</h1></div>;
  
  if (view === 'auth') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="flex justify-center mb-8"><div className={`${COLORS[accent].btn} p-4 rounded-2xl text-white shadow-lg shadow-${accent}-200`}><BookOpen className="w-10 h-10" /></div></div>
        <h1 className="text-4xl font-extrabold text-center mb-8 text-gray-800 tracking-tight">ClassSync</h1>
        <form onSubmit={handleAuth} className="space-y-5">
          {!isLoginMode && <input className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-300 outline-none transition-all text-lg" placeholder="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} />}
          <input className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-300 outline-none transition-all text-lg" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-300 outline-none transition-all text-lg" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button disabled={authLoading} className={`w-full ${COLORS[accent].btn} text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-${accent}-100 hover:shadow-2xl hover:scale-[1.02] transition-all`}>{authLoading ? '...' : (isLoginMode ? 'Log In' : 'Sign Up')}</button>
        </form>
        <button onClick={()=>setIsLoginMode(!isLoginMode)} className={`w-full text-center text-sm font-bold ${COLORS[accent].text} mt-6 hover:underline opacity-80`}>{isLoginMode ? 'Create Account' : 'Have an account?'}</button>
        {authError && <p className="text-red-500 text-center mt-4 text-sm font-medium bg-red-50 p-2 rounded-lg">{authError}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-gray-900">
      
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 font-extrabold text-2xl cursor-pointer tracking-tight" onClick={()=>setView('dashboard')}>
            <span className={`${COLORS[accent].text}`}><BookOpen className="w-7 h-7" /></span> <span className="hidden sm:inline">ClassSync</span>
          </div>
          <nav className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <NavBtn label="Tasks" active={view==='dashboard'} onClick={()=>setView('dashboard')} accent={accent} />
            <NavBtn label="Classes" active={view==='classes'} onClick={()=>setView('classes')} accent={accent} />
            <NavBtn label="History" active={view==='history'} onClick={()=>setView('history')} accent={accent} />
            {profile?.is_admin && <NavBtn label="Admin" active={view==='admin'} onClick={()=>setView('admin')} alert={pendingAssignments.length + pendingClasses.length} accent={accent} />}
            
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            
{isOffline && (
  <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
    <WifiOff size={14} />
    <span className="hidden sm:inline">Offline</span>
  </div>
)}
            <button onClick={()=>setShowSettings(!showSettings)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><Palette size={20} /></button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"><LogOut className="w-5 h-5" /></button>
          </nav>
        </div>
      </header>

      {/* NEW COLOR PICKER (Cleaner, Pastel, Squircles) */}
      {showSettings && (
        <div className="bg-white border-b border-slate-100 p-6 shadow-sm animate-in slide-in-from-top-2 relative z-20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left: Main Accent */}
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">App Theme</h3>
              <div className="flex gap-3">
                {Object.keys(COLORS).map(c => (
                  <button 
                    key={c} 
                    onClick={()=>setAccent(c)} 
                    className={`w-10 h-10 rounded-2xl ${COLORS[c].bg.replace('100','500')} ${accent===c ? 'ring-4 ring-offset-2 ring-slate-200 scale-110' : 'hover:scale-105'} transition-all shadow-sm`} 
                  />
                ))}
              </div>
            </div>

            {/* Right: Smart Class Coloring */}
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Class Colors</h3>
              
              {/* Step 1: Click a Class */}
              <div className="flex flex-wrap gap-2 mb-4">
  <button 
    onClick={()=>setSelectedClassForColor('personal')}
    className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${selectedClassForColor === 'personal' ? 'ring-2 ring-offset-2 ring-slate-300 scale-105' : 'opacity-70 hover:opacity-100'} ${COLORS[classColors['personal'] || 'blue'].bg} ${COLORS[classColors['personal'] || 'blue'].text} ${COLORS[classColors['personal'] || 'blue'].border}`}
  >
    Personal
  </button>
  {classes.filter(c => profile.enrolled_classes?.includes(c.id)).map(c => {
                  const isActive = selectedClassForColor === c.id;
                  const currentColor = classColors[c.id] || 'blue';
                  return (
                    <button 
                      key={c.id} 
                      onClick={()=>setSelectedClassForColor(isActive ? null : c.id)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${isActive ? 'ring-2 ring-offset-2 ring-slate-300 scale-105' : 'opacity-70 hover:opacity-100'} ${COLORS[currentColor].bg} ${COLORS[currentColor].text} ${COLORS[currentColor].border}`}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>

              {/* Step 2: Show Colors Only If Class Selected */}
              {selectedClassForColor && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 items-center bg-slate-50 p-2 rounded-2xl w-fit">
                  <span className="text-xs font-bold text-slate-400 px-2">Pick:</span>
                  {Object.keys(COLORS).map(c => (
                    <button 
                      key={c} 
                      onClick={() => setClassColors({...classColors, [selectedClassForColor]: c})} 
                      className={`w-8 h-8 rounded-2xl ${COLORS[c].bg.replace('100','500')} hover:scale-110 transition-transform ${classColors[selectedClassForColor]===c ? 'ring-4 ring-offset-2 ring-slate-300 shadow-md' : ''}`} 
                    />
                  ))}
                </div>
              )}
              {!selectedClassForColor && <p className="text-xs text-slate-400 italic">Select a class tag above to customize its color.</p>}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 relative">
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">My Tasks</h2>
                <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{myAssignments.length} pending</span>
              </div>
              
              {myAssignments.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl text-center text-slate-400 border-2 border-dashed border-slate-200">
                  <CheckCircle className="w-16 h-16 mx-auto mb-6 opacity-20 text-slate-500" />
                  <p className="font-medium text-lg">All caught up! 🎉</p>
                  <p className="text-sm">Enjoy your free time.</p>
                </div>
              ) : (
                myAssignments.map(a => <AssignmentCard key={a.id} assignment={a} classes={classes} personalStates={personalStates} updatePersonalState={updatePersonalState} accent={accent} classColors={classColors} onShowLocalWarning={() => setShowLocalWarning(true)} />)              )}
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 sticky top-28">
              <h3 className={`font-extrabold text-xl mb-6 flex items-center gap-3 ${COLORS[accent].text}`}><Plus className="w-6 h-6" /> New Task</h3>
                <form onSubmit={suggestAssignment} className="space-y-4">
                 
                  {/* Storage Option (only for personal tasks) */}
                  {newItem.isPersonal && (
                    <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-800 uppercase tracking-wider">Storage Location</label>
                        <button 
                          type="button"
                          onClick={() => setShowStorageInfo(true)}
                          className="text-amber-600 hover:text-amber-800 transition-colors"
                        >
                          <Info size={16} />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setNewItem({...newItem, storeLocal: true})}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            newItem.storeLocal 
                              ? 'bg-amber-200 text-amber-900 border-2 border-amber-300' 
                              : 'bg-white text-amber-700 border-2 border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          On Device
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewItem({...newItem, storeLocal: false})}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            !newItem.storeLocal 
                              ? 'bg-amber-200 text-amber-900 border-2 border-amber-300' 
                              : 'bg-white text-amber-700 border-2 border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          On Server
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Class Selector (only for school tasks) */}
                  {!newItem.isPersonal && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Class</label>
                      <select className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white outline-none focus:border-indigo-300 transition-all text-sm font-medium" value={newItem.classId} onChange={e=>setNewItem({...newItem, classId: e.target.value})}>
                        <option value="">Select a Class...</option>
                        {classes.filter(c => profile.enrolled_classes?.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Task</label>
                    <input className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white outline-none focus:border-indigo-300 transition-all text-sm font-medium" placeholder="Enter task name..." value={newItem.title} onChange={e=>setNewItem({...newItem, title: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Due Date</label>
                      <input type="date" className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white outline-none focus:border-indigo-300 transition-all text-sm font-medium" value={newItem.date} onChange={e=>setNewItem({...newItem, date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Time (Opt)</label>
                      <input type="time" className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white outline-none focus:border-indigo-300 transition-all text-sm font-medium" value={newItem.time} onChange={e=>setNewItem({...newItem, time: e.target.value})} />
                    </div>
                  </div>
                   {/* Personal Task Toggle */}
                   <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newItem.isPersonal}
                        onChange={e => setNewItem({...newItem, isPersonal: e.target.checked, classId: e.target.checked ? 'personal' : ''})}
                        className="w-5 h-5 rounded accent-indigo-500"
                      />
                      <span className="font-bold text-sm text-slate-700">Make Personal Task</span>
                    </label>
                  </div>
                  <button disabled={!newItem.isPersonal && !profile.enrolled_classes?.length} className={`w-full ${COLORS[accent].btn} text-white p-4 rounded-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none mt-2`}>
                    {newItem.isPersonal ? 'Add Personal Task' : (profile.is_admin || !moderationEnabled ? 'Publish Task' : 'Suggest Task')}
                  </button>
                  {!newItem.isPersonal && !profile.enrolled_classes?.length && <p className="text-xs text-rose-500 text-center font-bold bg-rose-50 p-2 rounded-lg">Enroll in a class first!</p>}
                  </form>
              </div>
            </div>
          </div>
        )}

        {/* --- HISTORY VIEW --- */}
        {view === 'history' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Completed Assignments</h2>
            {completedAssignments.length === 0 ? <p className="text-slate-400 italic text-center mt-10">No completed tasks yet.</p> : (
              completedAssignments.map(a => (
                <div key={a.id} className="bg-white p-5 rounded-2xl border border-slate-100 mb-3 flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
                  <span className="line-through text-slate-500 font-medium">{a.title}</span>
                  <button onClick={() => updatePersonalState(a.id, { is_completed: false })} className={`${COLORS[accent].text} hover:underline text-sm flex items-center gap-1 font-bold bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm`}>
                    <Undo className="w-4 h-4" /> Revive
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- CLASSES VIEW --- */}
        {view === 'classes' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Manage Classes</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-10">
              {classes.filter(c => c.status === 'approved').map(c => {
                const enrolled = profile.enrolled_classes?.includes(c.id);
                const colorKey = classColors[c.id] || 'blue';
                const theme = COLORS[colorKey];
                
                return (
                  <div key={c.id} onClick={()=>toggleClassEnrollment(c.id)} className={`p-5 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition-all ${enrolled ? `${theme.bg} ${theme.border} border-2 shadow-sm` : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    <div><h3 className={`font-bold text-lg ${enrolled ? theme.text : 'text-slate-700'}`}>{c.name}</h3><p className={`text-sm font-medium ${enrolled ? theme.text : 'text-slate-400'}`}>{c.teacher}</p></div>
                    {enrolled ? <CheckCircle className={`${theme.text} w-6 h-6 fill-current`} /> : <div className="w-6 h-6 rounded-full border-2 border-slate-200"></div>}
                  </div>
                )
              })}
            </div>
            
            <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><GraduationCap /> Don't see your class?</h3>
              <form onSubmit={suggestClass} className="flex gap-3">
                <input className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 ring-indigo-500 outline-none transition-all" placeholder="Class Name" value={newClass.name} onChange={e=>setNewClass({...newClass, name: e.target.value})} />
                <input className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 ring-indigo-500 outline-none transition-all" placeholder="Teacher" value={newClass.teacher} onChange={e=>setNewClass({...newClass, teacher: e.target.value})} />
                <button className="bg-white text-slate-900 px-6 rounded-xl font-bold hover:bg-indigo-50 transition-colors">Add</button>
              </form>
            </div>
          </div>
        )}

        {/* --- ADMIN VIEW (Fixed Tabs) --- */}
        {view === 'admin' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex gap-2">
                {['assignments', 'classes', 'users'].map(tab => (
                  <button key={tab} onClick={()=>setAdminTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${adminTab===tab ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <button onClick={toggleModeration} className={`px-4 py-2 rounded-xl text-xs font-bold border-2 flex items-center gap-2 transition-all ${moderationEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {moderationEnabled ? <Lock size={14}/> : <Unlock size={14}/>} Strict Mode: {moderationEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {/* Assignments Tab */}
            {adminTab === 'assignments' && (
              <div className="space-y-3">
                {pendingAssignments.length === 0 && <div className="text-center py-20 text-slate-400">No pending assignments to review.</div>}
                {pendingAssignments.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-lg text-slate-800">{p.title}</p>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Suggested By: {p.suggested_by}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={()=>updateAssignmentStatus(p.id, 'approved')} className="p-3 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"><Check size={20}/></button>
                      <button onClick={()=>updateAssignmentStatus(p.id, 'deleted')} className="p-3 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-200 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Classes Tab */}
            {adminTab === 'classes' && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-3">Pending Requests</h3>
                {pendingClasses.length === 0 && <p className="text-sm text-slate-400 italic mb-8">No class requests.</p>}
                {pendingClasses.map(c => (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                    <div><p className="font-bold text-lg">{c.name}</p><p className="text-sm text-slate-500">{c.teacher}</p></div>
                    <div className="flex gap-3">
                      <button onClick={()=>updateClassStatus(c.id, 'approved')} className="p-3 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"><Check size={20}/></button>
                      <button onClick={()=>updateClassStatus(c.id, 'deleted')} className="p-3 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-200 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))}

                <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-3 mt-10">Active Classes</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {classes.filter(c => c.status === 'approved').map(c => (
                     <div key={c.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                       <span className="font-bold text-slate-700">{c.name} <span className="text-slate-400 font-normal">({c.teacher})</span></span>
                       <button onClick={()=>updateClassStatus(c.id, 'deleted')} className="text-rose-500 text-xs font-bold hover:underline bg-white px-3 py-1.5 border border-slate-200 rounded-lg">Remove</button>
                     </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {adminTab === 'users' && (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-xs">
                    <tr><th className="p-5">Name</th><th className="p-5 hidden sm:table-cell">Email</th><th className="p-5">Status</th><th className="p-5">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allProfiles.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5">
                          <div className="font-bold text-slate-800 text-base">{u.full_name} {u.is_admin && <span className="bg-violet-100 text-violet-700 text-[10px] px-2 py-0.5 rounded-full ml-2">ADMIN</span>}</div>
                          <div className="text-xs text-slate-400 sm:hidden mt-1">{u.email}</div>
                        </td>
                        <td className="p-5 text-slate-500 font-medium hidden sm:table-cell">{u.email}</td>
                        <td className="p-5">{u.is_banned ? <span className="text-rose-700 font-bold bg-rose-50 px-3 py-1 rounded-full text-xs">BANNED</span> : <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs">ACTIVE</span>}</td>
                        <td className="p-5">
                          {!u.is_admin && (
                            <button onClick={()=>toggleUserBan(u.id, u.is_banned)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${u.is_banned ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}>
                              {u.is_banned ? 'Unban User' : 'Ban User'}
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

        {/* --- UNDO TOAST --- */}
        {undoTask && (
          <div className="fixed bottom-8 left-8 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-300 z-50">
            <span className="text-sm font-bold">Task Completed</span>
            <button onClick={handleUndo} className="text-indigo-300 font-black text-xs hover:text-white transition-colors flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
              <Undo size={14} /> UNDO
            </button>
          </div>
        )}
{/* --- OFFLINE NOTICE --- */}
{showOfflineNotice && (
          <div className="fixed bottom-8 left-8 bg-rose-600 text-white px-6 py-4 rounded-2xl shadow-2xl max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300 z-50">
            <div className="flex items-start gap-4">
              <WifiOff className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm mb-1">You are offline</p>
                <p className="text-xs opacity-90 mb-3">Tasks may not be up to date and your changes may not be saved.</p>
                <button 
                  onClick={() => setShowOfflineNotice(false)} 
                  className="bg-white text-rose-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-50 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
{/* --- STORAGE INFO POPUP --- */}
{showStorageInfo && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 fade-in duration-200">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-blue-100 p-3 rounded-2xl">
          <Info className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Storage Options</h3>
          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-bold text-slate-800 mb-1">On Device</p>
              <p className="leading-relaxed">Your task is saved only on this device. More private and secure, but won't appear on your other devices.</p>
            </div>
            <div>
              <p className="font-bold text-slate-800 mb-1">On Server</p>
              <p className="leading-relaxed">Your task is saved to our server and syncs across all your devices. Less private as server administrators can see it.</p>
            </div>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => setShowStorageInfo(false)}
        className={`w-full px-4 py-3 ${COLORS[accent].btn} text-white rounded-xl font-bold transition-all`}
      >
        Got it
      </button>
    </div>
  </div>
)}

{/* --- LOCAL TASK WARNING POPUP --- */}
{showLocalWarning && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 fade-in duration-200">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-amber-100 p-3 rounded-2xl">
          <Asterisk className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Device-Only Task</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            This task is stored only on this device. It won't appear on your other devices and may be lost if you clear your browser data or lose access to this device.
          </p>
        </div>
      </div>
      
      <button 
        onClick={() => setShowLocalWarning(false)}
        className={`w-full px-4 py-3 ${COLORS[accent].btn} text-white rounded-xl font-bold transition-all`}
      >
        Understood
      </button>
    </div>
  </div>
)}
      </main>
    </div>
  );
}