import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 

import { 
  BookOpen, CheckCircle, Clock, Plus, Shield, 
  LogOut, AlertCircle, Check, X, Lock, Unlock, Settings 
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- HELPER FUNCTIONS ---
const getUrgencyStatus = (dateStr, timeStr) => {
  if (!dateStr) return { color: 'bg-gray-100 border-gray-300', text: 'No Date' };

  const due = new Date(`${dateStr}T${timeStr || '23:59'}`);
  const now = new Date();
  const dueDay = new Date(due).setHours(0,0,0,0);
  const today = new Date().setHours(0,0,0,0);
  const diffTime = due - now;
  const diffDays = (dueDay - today) / (1000 * 60 * 60 * 24);

  if (diffTime < 0) return { color: 'bg-red-100 border-red-500 text-red-800', dot: 'bg-red-600', label: 'Overdue' };
  if (diffDays === 0) return { color: 'bg-orange-100 border-orange-400 text-orange-800', dot: 'bg-orange-500', label: 'Due Today' };
  if (diffDays === 1) return { color: 'bg-yellow-50 border-yellow-400 text-yellow-800', dot: 'bg-yellow-500', label: 'Due Tomorrow' };
  if (diffDays > 1 && diffDays <= 7) return { color: 'bg-lime-50 border-lime-400 text-lime-800', dot: 'bg-lime-500', label: 'This Week' };
  return { color: 'bg-blue-50 border-blue-300 text-blue-800', dot: 'bg-blue-500', label: 'Upcoming' };
};

export default function ClassSyncApp() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('loading');
  const [moderationEnabled, setModerationEnabled] = useState(true);
  
  // Data
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // Forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // New Assignment
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignClass, setNewAssignClass] = useState('');
  const [newAssignDate, setNewAssignDate] = useState('');
  const [newAssignTime, setNewAssignTime] = useState('');

  // --- SAFE INITIALIZATION ---
  useEffect(() => {
    // If Supabase isn't configured, stop here. The UI will handle showing the error.
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) console.error('Error fetching profile:', error);
    else {
      setProfile(data); // 'is_admin' is now coming directly from Supabase
      setView('dashboard');
    }
  };

  const fetchData = async () => {
    if (!supabase) return;
    const { data: cls } = await supabase.from('classes').select('*');
    setClasses(cls || []);

    const { data: asgs } = await supabase.from('assignments').select('*');
    setAssignments(asgs || []);

    const { data: settings } = await supabase.from('app_settings').select('*').single();
    if (settings) setModerationEnabled(settings.moderation_enabled);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthError('');
    setAuthLoading(true);

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
    if (!newAssignClass || !newAssignTitle || !newAssignDate || !supabase) return;

    // Use database is_admin flag
    const status = (profile.is_admin || !moderationEnabled) ? 'approved' : 'pending';

    const { error } = await supabase.from('assignments').insert({
      title: newAssignTitle,
      class_id: newAssignClass,
      due_date: newAssignDate,
      due_time: newAssignTime,
      suggested_by: profile.full_name,
      status: status
    });

    if (error) {
      alert("Error adding assignment: " + error.message);
    } else {
      setNewAssignTitle('');
      setNewAssignDate('');
      setNewAssignTime('');
      fetchData();
      alert(status === 'approved' ? "Assignment Added!" : "Assignment submitted for review.");
    }
  };

  const updateAssignmentStatus = async (id, newStatus) => {
    if (!supabase) return;
    if (newStatus === 'deleted') {
      await supabase.from('assignments').delete().eq('id', id);
    } else {
      await supabase.from('assignments').update({ status: newStatus }).eq('id', id);
    }
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
    return profile.enrolled_classes?.includes(a.class_id);
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const pendingAssignments = assignments.filter(a => a.status === 'pending');

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2" onClick={() => setView('dashboard')}>
            <div className="bg-indigo-600 p-2 rounded-lg cursor-pointer">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-gray-800 hidden md:block cursor-pointer">ClassSync</span>
          </div>
          <nav className="flex items-center gap-1 md:gap-4">
            <button onClick={() => setView('dashboard')} className={`px-3 py-2 rounded-md text-sm font-medium ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>Assignments</button>
            <button onClick={() => setView('classes')} className={`px-3 py-2 rounded-md text-sm font-medium ${view === 'classes' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>My Classes</button>
            {profile?.is_admin && (
              <button onClick={() => setView('admin')} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 ${view === 'admin' ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
                {pendingAssignments.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingAssignments.length}</span>}
              </button>
            )}
            <button onClick={handleLogout} className="ml-2 p-2 text-gray-400 hover:text-red-500 transition"><LogOut className="w-5 h-5" /></button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4">
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-end">
                <h2 className="text-2xl font-bold text-gray-800">My Assignments</h2>
                <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
              </div>
              
              {!profile.enrolled_classes || profile.enrolled_classes.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">No Classes Selected</h3>
                  <button onClick={() => setView('classes')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">Enroll Now</button>
                </div>
              ) : myAssignments.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
                  <h3 className="text-lg font-medium text-gray-800">All caught up!</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {myAssignments.map(assignment => {
                    const cls = classes.find(c => c.id === assignment.class_id);
                    const urgency = getUrgencyStatus(assignment.due_date, assignment.due_time);
                    return (
                      <div key={assignment.id} className={`bg-white border-l-4 ${urgency.color.split(' ')[1]} shadow-sm rounded-r-lg rounded-l-none border-y border-r p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${urgency.dot.replace('bg-', 'bg-opacity-90 bg-')}`}>{urgency.label}</span>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{cls?.name}</span>
                            {cls?.teacher && <span className="text-xs text-gray-400">({cls.teacher})</span>}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">{assignment.title}</h3>
                          {assignment.due_time && <div className="flex items-center text-gray-500 text-sm mt-1"><Clock className="w-3 h-3 mr-1" />{assignment.due_time}</div>}
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gray-700 block">{new Date(assignment.due_date).getDate()}</span>
                          <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-24">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-600" /> Add Assignment</h3>
                <form onSubmit={submitAssignment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Class</label>
                    <select required className="w-full p-2 bg-gray-50 border rounded-lg text-sm outline-none" value={newAssignClass} onChange={e => setNewAssignClass(e.target.value)}>
                      <option value="">Select a Class...</option>
                      {classes.filter(c => profile.enrolled_classes?.includes(c.id)).map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.teacher})</option>
                      ))}
                    </select>
                    {(!profile.enrolled_classes || profile.enrolled_classes.length === 0) && <p className="text-xs text-red-500 mt-1">Enroll in classes first.</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assignment</label>
                    <input required type="text" placeholder="Read Chapter 4..." className="w-full p-2 bg-gray-50 border rounded-lg text-sm outline-none" value={newAssignTitle} onChange={e => setNewAssignTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</label><input required type="date" className="w-full p-2 bg-gray-50 border rounded-lg text-sm outline-none" value={newAssignDate} onChange={e => setNewAssignDate(e.target.value)} /></div>
                    <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Time</label><input type="time" className="w-full p-2 bg-gray-50 border rounded-lg text-sm outline-none" value={newAssignTime} onChange={e => setNewAssignTime(e.target.value)} /></div>
                  </div>
                  <button type="submit" disabled={!profile.enrolled_classes || profile.enrolled_classes.length === 0} className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                    {profile.is_admin ? 'Add Assignment' : (moderationEnabled ? 'Suggest Assignment' : 'Post Assignment')}
                  </button>
                  {profile.is_admin && <p className="text-xs text-center text-gray-400 mt-2">Posting as Admin (Always Approved)</p>}
                  {!profile.is_admin && <p className="text-xs text-center text-gray-400 mt-2">{moderationEnabled ? "Moderation is ON: Approval needed." : "Moderation is OFF: Posts instantly."}</p>}
                </form>
              </div>
            </div>
          </div>
        )}

        {view === 'classes' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Manage Classes</h2>
            <div className="space-y-3">
              {sortedClasses.map(cls => {
                const isEnrolled = profile.enrolled_classes?.includes(cls.id);
                return (
                  <div key={cls.id} onClick={() => toggleClassEnrollment(cls.id)} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${isEnrolled ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                    <div><h3 className={`font-bold ${isEnrolled ? 'text-indigo-900' : 'text-gray-700'}`}>{cls.name}</h3><p className={`text-sm ${isEnrolled ? 'text-indigo-600' : 'text-gray-500'}`}>{cls.teacher}</p></div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isEnrolled ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>{isEnrolled && <Check className="w-4 h-4 text-white" />}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
              <button onClick={toggleModeration} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition ${moderationEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                {moderationEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {moderationEnabled ? "Strict Mode ON" : "Strict Mode OFF"}
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700 flex justify-between"><span>Pending Suggestions</span><span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">{pendingAssignments.length} items</span></div>
              {pendingAssignments.length === 0 ? <div className="p-12 text-center text-gray-500">No pending suggestions.</div> : (
                <div className="divide-y">{pendingAssignments.map(p => {
                    const cls = classes.find(c => c.id === p.class_id);
                    return (
                      <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{cls?.name}</span><span className="text-xs text-gray-400">Suggested by {p.suggested_by}</span></div><h4 className="font-medium text-gray-800">{p.title}</h4><p className="text-sm text-gray-500">Due: {p.due_date} {p.due_time}</p></div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateAssignmentStatus(p.id, 'approved')} className="p-2 bg-green-100 text-green-700 rounded-lg"><Check className="w-5 h-5" /></button>
                          <button onClick={() => updateAssignmentStatus(p.id, 'deleted')} className="p-2 bg-red-100 text-red-700 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                      </div>
                    );
                })}</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}