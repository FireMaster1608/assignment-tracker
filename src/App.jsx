import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 

import { 
  BookOpen, CheckCircle, Clock, Plus, Shield, LogOut, AlertCircle, 
  Check, X, Lock, Unlock, Settings, Link as LinkIcon, FileText, 
  Trash2, UserX, Users, GraduationCap, Undo, Palette, 
  ExternalLink, Calendar
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null; 

// --- UTILS ---
// Updated to Pastel Colors
const COLORS = {
  blue: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-700' },
  red: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-400', btn: 'bg-rose-500 hover:bg-rose-600' },
  green: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-600' },
  purple: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-400', btn: 'bg-violet-500 hover:bg-violet-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400', btn: 'bg-orange-500 hover:bg-orange-600' },
  pink: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-400', btn: 'bg-fuchsia-500 hover:bg-fuchsia-600' },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400', btn: 'bg-amber-500 hover:bg-amber-600' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-400', btn: 'bg-teal-500 hover:bg-teal-600' },
};

const getUrgencyStyles = (dateStr, timeStr) => {
  if (!dateStr) return { color: 'text-gray-400', label: 'No Date', border: 'border-l-gray-300' };
  
  const due = new Date(`${dateStr}T${timeStr || '23:59'}`);
  const now = new Date();
  
  const diffHours = (due - now) / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffHours / 24);

  if (diffHours < 0) return { color: 'text-red-600 font-extrabold', label: 'Overdue', border: 'border-l-red-600' };
  if (diffHours < 24) return { color: 'text-orange-600 font-bold', label: 'Due Today', border: 'border-l-orange-400' };
  if (diffDays <= 1) return { color: 'text-amber-600 font-bold', label: 'Tomorrow', border: 'border-l-amber-400' };
  if (diffDays <= 3) return { color: 'text-lime-600', label: 'Soon', border: 'border-l-lime-400' };
  if (diffDays <= 7) return { color: 'text-emerald-600', label: 'This Week', border: 'border-l-emerald-400' };
  
  return { color: 'text-indigo-600', label: 'Upcoming', border: 'border-l-indigo-300' };
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
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${active ? `${COLORS[accent].bg} ${COLORS[accent].text}` : 'text-gray-500 hover:bg-gray-100'}`}>
    {label}
    {alert > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{alert}</span>}
  </button>
);

const AssignmentCard = ({ assignment: a, classes, personalStates, updatePersonalState, accent, classColors }) => {
  const [expanded, setExpanded] = useState(false);
  const cls = classes.find(c => c.id === a.class_id);
  const state = personalStates[a.id];
  const urgency = getUrgencyStyles(a.due_date, a.due_time);
  
  // Class tag color (Defaults to gray if not set)
  const classColorKey = classColors[a.class_id] || 'blue';
  const classTheme = COLORS[classColorKey]; 
  
  const notes = state?.personal_note ? state.personal_note.split('\n') : [];

  return (
    <div className={`bg-white border-l-[6px] ${urgency.border} rounded-r-2xl shadow-sm border-y border-r transition-all hover:shadow-md mb-4 group`}>
      <div className="p-5 flex gap-5">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            updatePersonalState(a.id, { is_completed: true });
          }}
          className="w-6 h-6 mt-1 border-2 border-gray-300 rounded-full hover:border-emerald-500 hover:bg-emerald-50 transition flex items-center justify-center flex-shrink-0 group-hover:scale-110"
        >
          <Check className="w-3 h-3 text-emerald-500 opacity-0 hover:opacity-100 transition-opacity"/>
        </button>
        
        <div className="flex-1 cursor-pointer" onClick={()=>setExpanded(!expanded)}>
          {/* Header: Date & Time */}
          <div className="flex justify-between items-start mb-1">
             <div className="flex items-center gap-3">
               <span className={`text-sm font-semibold flex items-center gap-1 ${urgency.color}`}>
                 <Calendar size={14}/>
                 {new Date(a.due_date).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}
               </span>
               {a.due_time && (
                 <span className={`flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${urgency.color.includes('red') ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                   <Clock size={12} className="mr-1"/> 
                   {new Date(`2000-01-01T${a.due_time}`).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}
                 </span>
               )}
             </div>
             {urgency.label === 'Overdue' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">LATE</span>}
          </div>

          {/* Body: Title & Class */}
          <div className="mb-2">
            <h3 className="font-bold text-gray-800 text-xl leading-tight">{a.title}</h3>
            <span className={`inline-block mt-1 text-[11px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wide ${classTheme.bg} ${classTheme.text}`}>
              {cls?.name}
            </span>
          </div>
          
          {/* Notes Preview */}
          {!expanded && notes.length > 0 && (
            <div className="mt-2 pl-3 border-l-2 border-gray-200 space-y-1">
              {notes.map((n, i) => <p key={i} className="text-sm text-gray-500 line-clamp-1">• {n}</p>)}
            </div>
          )}
        </div>
      </div>

      {/* Link Bar (Always visible at bottom if link exists) */}
      {state?.personal_link && !expanded && (
        <a 
          href={state.personal_link.startsWith('http') ? state.personal_link : `https://${state.personal_link}`} 
          target="_blank" 
          rel="noreferrer"
          className="block bg-gray-50 px-5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-colors border-t border-gray-100 rounded-br-2xl"
        >
          <div className="flex items-center gap-2">
            <LinkIcon size={12} /> 
            OPEN RESOURCE: {getDomain(state.personal_link)}
          </div>
        </a>
      )}

      {/* Expanded Edit View */}
      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t bg-gray-50/50 rounded-br-2xl animate-in slide-in-from-top-1">
          <div className="space-y-4">
            <div className="bg-white p-3 rounded-lg border shadow-sm focus-within:ring-2 ring-indigo-100 transition-all">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider"><FileText size={14} /> Personal Notes</label>
              <textarea 
                className="w-full text-base text-gray-700 outline-none bg-transparent resize-none placeholder-gray-300" 
                rows={3}
                placeholder="• Type notes here... (Press Enter for new line)" 
                value={state?.personal_note || ''} 
                onChange={e => updatePersonalState(a.id, { personal_note: e.target.value })}
              />
            </div>

            <div className="bg-white p-3 rounded-lg border shadow-sm focus-within:ring-2 ring-indigo-100 transition-all">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider"><LinkIcon size={14} /> Attachment</label>
              <div className="flex gap-2">
                <input 
                  className="flex-1 text-sm outline-none bg-transparent text-gray-600 placeholder-gray-300" 
                  placeholder="Paste link here..." 
                  value={state?.personal_link || ''} 
                  onChange={e => updatePersonalState(a.id, { personal_link: e.target.value })}
                />
                {state?.personal_link && (
                  <a href={state.personal_link.startsWith('http') ? state.personal_link : `https://${state.personal_link}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1 rounded hover:bg-indigo-100 transition-colors">
                    OPEN <ExternalLink size={12} />
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
  const [view, setView] = useState(localStorage.getItem('cs_last_view') || 'loading');
  
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]); 
  const [personalStates, setPersonalStates] = useState({}); 
  const [moderationEnabled, setModerationEnabled] = useState(true);

  // Simplified Personalization
  const [accent, setAccent] = useState(localStorage.getItem('cs_accent') || 'blue');
  const [classColors, setClassColors] = useState(JSON.parse(localStorage.getItem('cs_class_colors') || '{}'));
  const [showSettings, setShowSettings] = useState(false);
  const [undoTask, setUndoTask] = useState(null);
  const [selectedClassForColor, setSelectedClassForColor] = useState(null); // New state for easier color picking

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [newItem, setNewItem] = useState({ title: '', classId: '', date: '', time: '' });
  const [newClass, setNewClass] = useState({ name: '', teacher: '' });
  const [adminTab, setAdminTab] = useState('assignments');

  useEffect(() => {
    localStorage.setItem('cs_accent', accent);
    localStorage.setItem('cs_class_colors', JSON.stringify(classColors));
  }, [accent, classColors]);

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
    return profile.enrolled_classes?.includes(a.class_id);
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const completedAssignments = assignments.filter(a => {
    return personalStates[a.id]?.is_completed && profile.enrolled_classes?.includes(a.class_id);
  });

  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const pendingClasses = classes.filter(c => c.status === 'pending');

  if (view === 'setup_required') return <div className="h-screen flex items-center justify-center p-6 text-center"><h1 className="text-xl font-bold text-red-600">Config Missing in .env</h1></div>;
  if (view === 'banned') return <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-red-800"><Shield className="w-16 h-16 mb-4" /><h1 className="text-3xl font-bold">Access Restricted</h1></div>;
  
  if (view === 'auth') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6"><div className={`${COLORS[accent].btn} p-3 rounded-full text-white`}><BookOpen className="w-8 h-8" /></div></div>
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">ClassSync</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLoginMode && <input className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} />}
          <input className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button disabled={authLoading} className={`w-full ${COLORS[accent].btn} text-white p-3 rounded font-bold hover:opacity-90 transition`}>{authLoading ? '...' : (isLoginMode ? 'Log In' : 'Sign Up')}</button>
        </form>
        <button onClick={()=>setIsLoginMode(!isLoginMode)} className={`w-full text-center text-sm ${COLORS[accent].text.replace('800','600')} mt-4 hover:underline`}>{isLoginMode ? 'Create Account' : 'Have an account?'}</button>
        {authError && <p className="text-red-500 text-center mt-2 text-sm">{authError}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900">
      
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={()=>setView('dashboard')}>
            <span className={`${COLORS[accent].text}`}><BookOpen className="w-6 h-6" /></span> <span className="hidden sm:inline">ClassSync</span>
          </div>
          <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <NavBtn label="Tasks" active={view==='dashboard'} onClick={()=>setView('dashboard')} accent={accent} />
            <NavBtn label="Classes" active={view==='classes'} onClick={()=>setView('classes')} accent={accent} />
            <NavBtn label="History" active={view==='history'} onClick={()=>setView('history')} accent={accent} />
            {profile?.is_admin && <NavBtn label="Admin" active={view==='admin'} onClick={()=>setView('admin')} alert={pendingAssignments.length + pendingClasses.length} accent={accent} />}
            
            <button onClick={()=>setShowSettings(!showSettings)} className="p-2 ml-2 text-gray-400 hover:text-gray-600 transition"><Palette size={20} /></button>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition"><LogOut className="w-5 h-5" /></button>
          </nav>
        </div>
      </header>

      {/* NEW COLOR PICKER */}
      {showSettings && (
        <div className="bg-white border-b p-4 shadow-md animate-in slide-in-from-top-2">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Main Accent */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">App Accent</h3>
              <div className="flex gap-2">
                {Object.keys(COLORS).map(c => (
                  <button key={c} onClick={()=>setAccent(c)} className={`w-8 h-8 rounded-full ${COLORS[c].bg.replace('100','500')} ${accent===c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''} transition-all`} />
                ))}
              </div>
            </div>

            {/* Right: Smart Class Coloring */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Class Colors</h3>
              
              {/* Step 1: Click a Class */}
              <div className="flex flex-wrap gap-2 mb-3">
                {classes.filter(c => profile.enrolled_classes?.includes(c.id)).map(c => {
                  const isActive = selectedClassForColor === c.id;
                  const currentColor = classColors[c.id] || 'blue'; // Default to blue if unset
                  return (
                    <button 
                      key={c.id} 
                      onClick={()=>setSelectedClassForColor(isActive ? null : c.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${isActive ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-70 hover:opacity-100'} ${COLORS[currentColor].bg} ${COLORS[currentColor].text} ${COLORS[currentColor].border}`}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>

              {/* Step 2: Show Colors Only If Class Selected */}
              {selectedClassForColor ? (
                <div className="flex gap-2 animate-in fade-in slide-in-from-left-2">
                  <span className="text-xs text-gray-400 self-center mr-2">Pick Color:</span>
                  {Object.keys(COLORS).map(c => (
                    <button 
                      key={c} 
                      onClick={() => setClassColors({...classColors, [selectedClassForColor]: c})} 
                      className={`w-6 h-6 rounded-full ${COLORS[c].bg.replace('100','500')} hover:scale-110 transition-transform`} 
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Click a class above to change its color.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 relative">
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">My Assignments</h2>
              {myAssignments.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center text-gray-400 border border-dashed border-gray-300">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>All caught up!</p>
                </div>
              ) : (
                myAssignments.map(a => <AssignmentCard key={a.id} assignment={a} classes={classes} personalStates={personalStates} updatePersonalState={updatePersonalState} accent={accent} classColors={classColors} />)
              )}
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl border shadow-sm sticky top-24">
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${COLORS[accent].text}`}><Plus className="w-5 h-5" /> Add Task</h3>
                <form onSubmit={suggestAssignment} className="space-y-4">
                  <select className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm" value={newItem.classId} onChange={e=>setNewItem({...newItem, classId: e.target.value})}>
                    <option value="">Select Class...</option>
                    {classes.filter(c => profile.enrolled_classes?.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm" placeholder="Enter task name..." value={newItem.title} onChange={e=>setNewItem({...newItem, title: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm" value={newItem.date} onChange={e=>setNewItem({...newItem, date: e.target.value})} />
                    <input type="time" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm" value={newItem.time} onChange={e=>setNewItem({...newItem, time: e.target.value})} />
                  </div>
                  <button disabled={!profile.enrolled_classes?.length} className={`w-full ${COLORS[accent].btn} text-white p-3 rounded-lg font-bold shadow-md transition disabled:opacity-50 disabled:shadow-none`}>
                    {profile.is_admin || !moderationEnabled ? 'Publish Task' : 'Suggest Task'}
                  </button>
                  {!profile.enrolled_classes?.length && <p className="text-xs text-red-500 text-center">Enroll in a class first.</p>}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ... (History, Classes, Admin views logic remains functionally identical but inherits the new light theme) ... */}
        
        {/* --- HISTORY VIEW --- */}
        {view === 'history' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Completed Assignments</h2>
            {completedAssignments.length === 0 ? <p className="text-gray-500 italic">No completed tasks yet.</p> : (
              completedAssignments.map(a => (
                <div key={a.id} className="bg-white p-4 rounded-lg border mb-2 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                  <span className="line-through text-gray-500">{a.title}</span>
                  <button onClick={() => updatePersonalState(a.id, { is_completed: false })} className={`${COLORS[accent].text} hover:underline text-sm flex items-center gap-1 font-medium`}>
                    <Undo className="w-4 h-4" /> Revive
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- CLASSES VIEW --- */}
        {view === 'classes' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Manage Classes</h2>
            <div className="grid gap-3 mb-8">
              {classes.filter(c => c.status === 'approved').map(c => {
                const enrolled = profile.enrolled_classes?.includes(c.id);
                // Use the custom class color if set, otherwise default to gray/accent
                const colorKey = classColors[c.id] || 'blue';
                const theme = COLORS[colorKey];
                
                return (
                  <div key={c.id} onClick={()=>toggleClassEnrollment(c.id)} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${enrolled ? `${theme.bg} ${theme.border}` : 'bg-white hover:border-gray-300'}`}>
                    <div><h3 className={`font-bold ${enrolled ? theme.text : 'text-gray-700'}`}>{c.name}</h3><p className={`text-sm ${enrolled ? theme.text : 'text-gray-500'}`}>{c.teacher}</p></div>
                    {enrolled && <CheckCircle className={`${theme.text} w-6 h-6`} />}
                  </div>
                )
              })}
            </div>
            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold mb-4 text-gray-700">Don't see your class?</h3>
              <form onSubmit={suggestClass} className="flex gap-2">
                <input className="flex-1 p-2 border rounded bg-gray-50 outline-none focus:ring-1 ring-indigo-500" placeholder="Class Name" value={newClass.name} onChange={e=>setNewClass({...newClass, name: e.target.value})} />
                <input className="flex-1 p-2 border rounded bg-gray-50 outline-none focus:ring-1 ring-indigo-500" placeholder="Teacher" value={newClass.teacher} onChange={e=>setNewClass({...newClass, teacher: e.target.value})} />
                <button className="bg-gray-800 text-white px-4 rounded font-medium hover:bg-black transition">Add</button>
              </form>
            </div>
          </div>
        )}

        {/* --- ADMIN VIEW --- */}
        {view === 'admin' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex gap-4">
                <button onClick={()=>setAdminTab('assignments')} className={`font-bold ${adminTab==='assignments' ? `${COLORS[accent].text} underline` : 'text-gray-500'}`}>Assignments ({pendingAssignments.length})</button>
                <button onClick={()=>setAdminTab('classes')} className={`font-bold ${adminTab==='classes' ? `${COLORS[accent].text} underline` : 'text-gray-500'}`}>Classes ({pendingClasses.length})</button>
                <button onClick={()=>setAdminTab('users')} className={`font-bold ${adminTab==='users' ? `${COLORS[accent].text} underline` : 'text-gray-500'}`}>Users</button>
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
            
            {/* Same admin layout for classes/users as previous version, just ensuring bg-white is there */}
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

        {/* --- UNDO TOAST --- */}
        {undoTask && (
          <div className="fixed bottom-6 left-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300 z-50">
            <span className="text-sm font-medium">Task Completed</span>
            <button onClick={handleUndo} className="text-blue-400 font-bold text-sm hover:underline flex items-center gap-1">
              <Undo size={14} /> UNDO
            </button>
          </div>
        )}
      </main>
    </div>
  );
}