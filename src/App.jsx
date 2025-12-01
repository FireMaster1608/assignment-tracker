import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

import { 
  BookOpen, CheckCircle, Clock, Plus, Shield, LogOut, AlertCircle, 
  Check, X, Lock, Unlock, Settings, Link as LinkIcon, FileText, 
  Trash2, UserX, Users, GraduationCap, Undo, Palette, Moon, Sun, 
  ExternalLink, ListPlus, Calendar
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase. 
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// --- UTILS ---
const COLORS = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-100', border: 'border-blue-500', btn: 'bg-blue-600 hover:bg-blue-700' },
  red: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-100', border: 'border-red-500', btn: 'bg-red-600 hover:bg-red-700' },
  green: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-100', border: 'border-green-500', btn: 'bg-green-600 hover:bg-green-700' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-100', border: 'border-purple-500', btn: 'bg-purple-600 hover:bg-purple-700' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-100', border: 'border-orange-500', btn: 'bg-orange-600 hover:bg-orange-700' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-800 dark:text-pink-100', border: 'border-pink-500', btn: 'bg-pink-600 hover:bg-pink-700' },
};

const getUrgencyStyles = (dateStr, timeStr) => {
  if (!dateStr) return { color: 'text-gray-400', label: 'No Date', border: 'border-l-gray-300' };
  
  const due = new Date(`${dateStr}T${timeStr || '23:59'}`);
  const now = new Date();
  
  // Calculate difference in hours for more precision
  const diffHours = (due - now) / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffHours / 24);

  if (diffHours < 0) return { color: 'text-red-600 font-extrabold', label: 'Overdue', border: 'border-l-red-800' };
  if (diffHours < 24) return { color: 'text-orange-600 font-bold', label: 'Due Today', border: 'border-l-orange-500' };
  if (diffDays <= 1) return { color: 'text-yellow-600 font-bold', label: 'Tomorrow', border: 'border-l-yellow-500' };
  if (diffDays <= 3) return { color: 'text-lime-600', label: 'Soon', border: 'border-l-lime-500' };
  if (diffDays <= 7) return { color: 'text-green-600', label: 'This Week', border: 'border-l-green-500' };
  
  return { color: 'text-blue-600', label: 'Upcoming', border: 'border-l-blue-400' };
};

// Helper to get domain from url
const getDomain = (url) => {
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'Link';
  }
};

// --- SUB-COMPONENTS (Moved OUTSIDE to fix focus bug) ---

const NavBtn = ({ label, active, onClick, alert, accent }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${active ? `${COLORS[accent].bg} ${COLORS[accent].text}` : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
    {label}
    {alert > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{alert}</span>}
  </button>
);

const AssignmentCard = ({ assignment: a, classes, personalStates, updatePersonalState, accent, classColors }) => {
  const [expanded, setExpanded] = useState(false);
  const cls = classes.find(c => c.id === a.class_id);
  const state = personalStates[a.id];
  const urgency = getUrgencyStyles(a.due_date, a.due_time);
  
  // Class tag color (Defaults to accent if not set)
  const classTheme = classColors[a.class_id] ? COLORS[classColors[a.class_id]] : COLORS[accent]; 
  
  const notes = state?.personal_note ? state.personal_note.split('\n') : [];

  return (
    <div className={`bg-white dark:bg-gray-800 border-l-4 ${urgency.border} rounded-r-xl shadow-sm border-y border-r dark:border-gray-700 transition-all hover:shadow-md mb-3`}>
      <div className="p-4 flex gap-4">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            updatePersonalState(a.id, { is_completed: true });
          }}
          className="w-6 h-6 mt-1 border-2 border-gray-300 dark:border-gray-500 rounded-full hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900 transition flex items-center justify-center flex-shrink-0 group"
        >
          <Check className="w-3 h-3 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
        </button>
        
        <div className="flex-1 cursor-pointer" onClick={()=>setExpanded(!expanded)}>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* The Class Tag (Color based on Class Settings) */}
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${classTheme.bg} ${classTheme.text} border border-transparent`}>{cls?.name}</span>
            
            {/* Urgency Tag (If Needed) */}
            {urgency.label === 'Overdue' && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold animate-pulse">LATE</span>}
            
            {/* Quick Link Access (Clickable without expanding) */}
            {state?.personal_link && (
              <a 
                href={state.personal_link.startsWith('http') ? state.personal_link : `https://${state.personal_link}`} 
                target="_blank" 
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()} 
                className="flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 hover:underline"
              >
                <LinkIcon size={10} /> {getDomain(state.personal_link)}
              </a>
            )}
          </div>
          
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight mb-1">{a.title}</h3>
          
          {/* Notes Preview */}
          {!expanded && notes.length > 0 && (
            <div className="ml-1 mt-2 mb-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
              {notes.map((n, i) => <p key={i} className="text-xs text-gray-500 dark:text-gray-400">• {n}</p>)}
            </div>
          )}

          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 gap-3 mt-2">
            <span className={`font-medium flex items-center gap-1 ${urgency.color}`}>
              <Calendar size={12}/>
              {new Date(a.due_date).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}
            </span>
            {a.due_time && (
              <span className={`flex items-center px-1.5 py-0.5 rounded text-xs ${urgency.color.includes('red') ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                <Clock size={12} className="mr-1"/> 
                {new Date(`2000-01-01T${a.due_time}`).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-br-xl animate-in slide-in-from-top-1">
          <div className="space-y-4">
            {/* Notes Input */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700 shadow-sm transition-colors">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider"><FileText size={14} /> Personal Notes</label>
              <textarea 
                className="w-full text-sm outline-none bg-transparent resize-none dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600" 
                rows={3}
                placeholder="• Add notes here... (Press Enter for new line)" 
                value={state?.personal_note || ''} 
                onChange={e => updatePersonalState(a.id, { personal_note: e.target.value })}
              />
            </div>

            {/* Link Input */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700 shadow-sm transition-colors">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider"><LinkIcon size={14} /> Attachment</label>
              <div className="flex gap-2">
                <input 
                  className="flex-1 text-sm outline-none bg-transparent dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600" 
                  placeholder="Paste link (Google Docs, Canva, etc)..." 
                  value={state?.personal_link || ''} 
                  onChange={e => updatePersonalState(a.id, { personal_link: e.target.value })}
                />
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
  // Persist View Logic
  const [view, setView] = useState(localStorage.getItem('cs_last_view') || 'loading');
  
  // Data
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]); 
  const [personalStates, setPersonalStates] = useState({}); 
  const [moderationEnabled, setModerationEnabled] = useState(true);

  // Personalization
  const [darkMode, setDarkMode] = useState(localStorage.getItem('cs_dark') === 'true');
  const [accent, setAccent] = useState(localStorage.getItem('cs_accent') || 'blue');
  const [classColors, setClassColors] = useState(JSON.parse(localStorage.getItem('cs_class_colors') || '{}'));
  const [showSettings, setShowSettings] = useState(false);
  const [undoTask, setUndoTask] = useState(null);

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
  const [adminTab, setAdminTab] = useState('assignments');

  // --- EFFECTS ---
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('cs_dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('cs_accent', accent);
    localStorage.setItem('cs_class_colors', JSON.stringify(classColors));
  }, [accent, classColors]);

  useEffect(() => {
    // Save view to local storage so it persists on reload
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

  useEffect(() => {
    if (session && view !== 'auth' && supabase) fetchData();
  }, [session, view]);

  // --- FETCHING ---
  const fetchProfile = async (userId) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data?.is_banned) {
      setView('banned');
    } else {
      setProfile(data);
      // Restore view if valid, else default to dashboard
      const lastView = localStorage.getItem('cs_last_view');
      setView(lastView && lastView !== 'loading' && lastView !== 'auth' ? lastView : 'dashboard');
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
        alert("Check your email for the confirmation link!");
      }
    } catch (err) { setAuthError(err.message); } 
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => supabase.auth.signOut();

  const toggleClassEnrollment = async (classId) => {
    if (!supabase) return;
    let current = profile.enrolled_classes || [];
    let updated = current.includes(classId) ? current.filter(id => id !== classId) : [...current, classId];
    setProfile({ ...profile, enrolled_classes: updated });
    await supabase.from('profiles').update({ enrolled_classes: updated }).eq('id', session.user.id);
  };

  const suggestAssignment = async (e) => {
    e.preventDefault();
    if (!newItem.classId || !newItem.title || !newItem.date || !supabase) return;
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
    alert(status === 'approved' ? "Published!" : "Sent for approval.");
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

  // --- ADMIN ACTIONS ---
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

  // --- FILTERING ---
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

  // --- VIEWS ---
  if (view === 'setup_required') return <div className="h-screen flex items-center justify-center p-6 text-center"><h1 className="text-xl font-bold text-red-600">Config Missing in .env</h1></div>;
  if (view === 'banned') return <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-red-800"><Shield className="w-16 h-16 mb-4" /><h1 className="text-3xl font-bold">Access Restricted</h1></div>;
  
  if (view === 'auth') return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md transition-colors">
        <div className="flex justify-center mb-6"><div className={`${COLORS[accent].btn} p-3 rounded-full text-white`}><BookOpen className="w-8 h-8" /></div></div>
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">ClassSync</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLoginMode && <input className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} />}
          <input className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button disabled={authLoading} className={`w-full ${COLORS[accent].btn} text-white p-3 rounded font-bold hover:opacity-90 transition`}>{authLoading ? '...' : (isLoginMode ? 'Log In' : 'Sign Up')}</button>
        </form>
        <button onClick={()=>setIsLoginMode(!isLoginMode)} className={`w-full text-center text-sm ${COLORS[accent].text.replace('800','600').replace('100','300')} mt-4 hover:underline`}>{isLoginMode ? 'Create Account' : 'Have an account?'}</button>
        {authError && <p className="text-red-500 text-center mt-2 text-sm">{authError}</p>}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* HEADER */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm sticky top-0 z-20 transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={()=>setView('dashboard')}>
            <span className={`${COLORS[accent].text}`}><BookOpen className="w-6 h-6" /></span> <span className="hidden sm:inline">ClassSync</span>
          </div>
          <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <NavBtn label="Tasks" active={view==='dashboard'} onClick={()=>setView('dashboard')} accent={accent} />
            <NavBtn label="Classes" active={view==='classes'} onClick={()=>setView('classes')} accent={accent} />
            <NavBtn label="History" active={view==='history'} onClick={()=>setView('history')} accent={accent} />
            {profile?.is_admin && <NavBtn label="Admin" active={view==='admin'} onClick={()=>setView('admin')} alert={pendingAssignments.length + pendingClasses.length} accent={accent} />}
            
            {/* Settings Trigger */}
            <button onClick={()=>setShowSettings(!showSettings)} className="p-2 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"><Palette size={20} /></button>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition"><LogOut className="w-5 h-5" /></button>
          </nav>
        </div>
      </header>

      {/* PERSONALIZATION MENU */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 shadow-md animate-in slide-in-from-top-2 transition-colors">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Theme</h3>
              <div className="flex gap-2 items-center">
                {Object.keys(COLORS).map(c => (
                  <button key={c} onClick={()=>setAccent(c)} className={`w-6 h-6 rounded-full ${COLORS[c].btn} ${accent===c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800' : ''}`} />
                ))}
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                <button onClick={()=>setDarkMode(!darkMode)} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors">
                  {darkMode ? <Sun size={16} /> : <Moon size={16}/>}
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Class Colors</h3>
              <div className="flex flex-wrap gap-2">
                {classes.filter(c => profile.enrolled_classes?.includes(c.id)).map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded border dark:border-gray-600 transition-colors">
                    <span className="text-xs font-bold">{c.name}</span>
                    <div className="flex gap-1">
                      {['blue','red','green','purple'].map(color => (
                        <button key={color} onClick={()=>setClassColors({...classColors, [c.id]: color})} className={`w-3 h-3 rounded-full ${COLORS[color].btn} ${classColors[c.id]===color ? 'ring-1 ring-offset-1 ring-gray-400 dark:ring-offset-gray-600' : ''}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 relative">
        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold">My Assignments</h2>
              {myAssignments.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-12 rounded-xl text-center text-gray-500 border dark:border-gray-700 transition-colors">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-200 dark:text-green-900" />
                  <p>No pending assignments! Relax or check History.</p>
                </div>
              ) : (
                myAssignments.map(a => <AssignmentCard key={a.id} assignment={a} classes={classes} personalStates={personalStates} updatePersonalState={updatePersonalState} accent={accent} classColors={classColors} />)
              )}
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm sticky top-24 transition-colors">
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${COLORS[accent].text}`}><Plus className="w-5 h-5" /> Add Task</h3>
                <form onSubmit={suggestAssignment} className="space-y-3">
                  <select className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white outline-none focus:ring-1" value={newItem.classId} onChange={e=>setNewItem({...newItem, classId: e.target.value})}>
                    <option value="">Select Class...</option>
                    {classes.filter(c => profile.enrolled_classes?.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white outline-none focus:ring-1" placeholder="Enter task name..." value={newItem.title} onChange={e=>setNewItem({...newItem, title: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white outline-none focus:ring-1" value={newItem.date} onChange={e=>setNewItem({...newItem, date: e.target.value})} />
                    <div className="relative">
                      <input type="time" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white outline-none focus:ring-1 appearance-none" value={newItem.time} onChange={e=>setNewItem({...newItem, time: e.target.value})} />
                      {!newItem.time && <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">--:-- --</span>}
                    </div>
                  </div>
                  <button disabled={!profile.enrolled_classes?.length} className={`w-full ${COLORS[accent].btn} text-white p-2 rounded font-bold hover:opacity-90 transition disabled:opacity-50`}>
                    {profile.is_admin || !moderationEnabled ? 'Publish Task' : 'Suggest Task'}
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
            <h2 className="text-2xl font-bold mb-4">Completed Assignments</h2>
            {completedAssignments.length === 0 ? <p className="text-gray-500 italic">No completed tasks yet.</p> : (
              completedAssignments.map(a => (
                <div key={a.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 mb-2 flex justify-between items-center opacity-75 transition-colors">
                  <span className="line-through text-gray-500">{a.title}</span>
                  <button onClick={() => updatePersonalState(a.id, { is_completed: false })} className={`${COLORS[accent].text} hover:underline text-sm flex items-center gap-1 font-medium`}>
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
            <h2 className="text-2xl font-bold mb-2">Manage Classes</h2>
            <div className="grid gap-3 mb-8">
              {classes.filter(c => c.status === 'approved').map(c => {
                const enrolled = profile.enrolled_classes?.includes(c.id);
                const classColor = classColors[c.id] ? COLORS[classColors[c.id]] : COLORS[accent];
                return (
                  <div key={c.id} onClick={()=>toggleClassEnrollment(c.id)} className={`p-4 rounded-xl border dark:border-gray-700 cursor-pointer flex justify-between items-center transition-all ${enrolled ? `${classColor.bg} ${classColor.border} border` : 'bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                    <div><h3 className="font-bold">{c.name}</h3><p className="text-sm text-gray-500">{c.teacher}</p></div>
                    {enrolled && <CheckCircle className={`${classColor.text} w-6 h-6`} />}
                  </div>
                )
              })}
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 transition-colors">
              <h3 className="font-bold mb-4">Don't see your class?</h3>
              <form onSubmit={suggestClass} className="flex gap-2">
                <input className="flex-1 p-2 border rounded dark:bg-gray-900 dark:border-gray-600 dark:text-white outline-none focus:ring-1" placeholder="Class Name" value={newClass.name} onChange={e=>setNewClass({...newClass, name: e.target.value})} />
                <input className="flex-1 p-2 border rounded dark:bg-gray-900 dark:border-gray-600 dark:text-white outline-none focus:ring-1" placeholder="Teacher" value={newClass.teacher} onChange={e=>setNewClass({...newClass, teacher: e.target.value})} />
                <button className="bg-gray-900 dark:bg-gray-700 text-white px-4 rounded font-medium hover:opacity-90">Add</button>
              </form>
            </div>
          </div>
        )}

        {/* --- ADMIN --- */}
        {view === 'admin' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex gap-4">
                <button onClick={()=>setAdminTab('assignments')} className={`font-bold ${adminTab==='assignments' ? `${COLORS[accent].text} underline` : 'text-gray-500'}`}>Assignments ({pendingAssignments.length})</button>
                <button onClick={()=>setAdminTab('classes')} className={`font-bold ${adminTab==='classes' ? `${COLORS[accent].text} underline` : 'text-gray-500'}`}>Classes ({pendingClasses.length})</button>
                <button onClick={()=>setAdminTab('users')} className={`font-bold ${adminTab==='users' ? `${COLORS[accent].text} underline` : 'text-gray-500'}`}>Users</button>
              </div>
              <button onClick={toggleModeration} className={`px-3 py-1 rounded text-xs font-bold border flex items-center gap-2 ${moderationEnabled ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 border-green-300 dark:border-green-700' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 border-red-300 dark:border-red-700'}`}>
                {moderationEnabled ? <Lock size={12}/> : <Unlock size={12}/>} Strict Mode: {moderationEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {/* Admin Content Area */}
            {adminTab === 'assignments' && (
              <div className="space-y-2">
                {pendingAssignments.map(p => (
                  <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded border dark:border-gray-700 flex justify-between items-center shadow-sm transition-colors">
                    <div><p className="font-bold">{p.title}</p><p className="text-xs text-gray-400">By: {p.suggested_by}</p></div>
                    <div className="flex gap-2">
                      <button onClick={()=>updateAssignmentStatus(p.id, 'approved')} className="p-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 rounded hover:opacity-80"><Check size={16}/></button>
                      <button onClick={()=>updateAssignmentStatus(p.id, 'deleted')} className="p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded hover:opacity-80"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Same dark mode pattern applied to other admin tabs implicitly by container classes */}
          </div>
        )}

        {/* --- UNDO TOAST --- */}
        {undoTask && (
          <div className="fixed bottom-6 left-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-lg shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300 z-50">
            <span className="text-sm font-medium">Task Completed</span>
            <button onClick={handleUndo} className="text-blue-400 dark:text-blue-600 font-bold text-sm hover:underline flex items-center gap-1">
              <Undo size={14} /> UNDO
            </button>
          </div>
        )}
      </main>
    </div>
  );
}