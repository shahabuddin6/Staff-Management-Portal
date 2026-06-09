import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Lock, Eye, EyeOff, User, Building2, ChevronDown,
  Users, Calendar as CalendarIcon, DollarSign, PieChart, Menu, X, Moon, Sun, Plus, Edit2, Trash2, Check, Printer, FileText, LogOut, BookOpen, ShieldCheck, AlertCircle, CheckCircle2, MessageSquare, AlertOctagon, FileBarChart, Award, Star, AlertTriangle, Send, Camera, CreditCard
} from 'lucide-react';

// --- ADD THESE FIREBASE IMPORTS RIGHT HERE ---
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc // <--- Ensure comma is there before this line
} from 'firebase/firestore';
// ==========================================================
// MAIN APPLICATION (FIREBASE REMOVED - LOCAL STATE MANAGED)
// ==========================================================
export default function App() {
  const [authSession, setAuthSession] = useState(null); 
  const [authLoading, setAuthLoading] = useState(true); // Added for state check
  const [darkMode, setDarkMode] = useState(false);

  // --- FIREBASE LIVE DATABASE STATES ---
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [fines, setFines] = useState([]);
  const [warnings, setWarnings] = useState([]);
  // --- LIVE FIREBASE REAL-TIME SYNC SYSTEM ---
  useEffect(() => {
    // If the user isn't logged in, or doesn't have a workspaceId, don't run listeners
    if (!authSession?.workspaceId) return;

    // 1. Sync Live Teachers Collection
    const unsubscribeTeachers = onSnapshot(
      collection(db, "teachers"),
      (snapshot) => {
        const liveTeachers = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(t => t.workspaceId === authSession.workspaceId);
        setTeachers(liveTeachers);
      },
      (error) => console.error("Teachers Sync Error:", error)
    );

    // 2. Sync Live Attendance Collection
    const unsubscribeAttendance = onSnapshot(
      collection(db, "attendance"),
      (snapshot) => {
        const liveAttendance = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(a => a.workspaceId === authSession.workspaceId);
        setAttendance(liveAttendance);
      },
      (error) => console.error("Attendance Sync Error:", error)
    );

    // 3. Sync Live Fines Collection
    const unsubscribeFines = onSnapshot(
      collection(db, "fines"),
      (snapshot) => {
        const liveFines = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(f => f.workspaceId === authSession.workspaceId);
        setFines(liveFines);
      },
      (error) => console.error("Fines Sync Error:", error)
    );

    // 4. Sync Live Warnings Collection
    const unsubscribeWarnings = onSnapshot(
      collection(db, "warnings"),
      (snapshot) => {
        const liveWarnings = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(w => w.workspaceId === authSession.workspaceId);
        setWarnings(liveWarnings);
      },
      (error) => console.error("Warnings Sync Error:", error)
    );

    // Clean up connections automatically when the user logs out
    return () => {
      unsubscribeTeachers();
      unsubscribeAttendance();
      unsubscribeFines();
      unsubscribeWarnings();
    };
  }, [authSession]);

  // --- AUTH SESSION LISTENER EFFECT ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "accounts", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAuthSession({ id: user.uid, ...docSnap.data() });
        } else {
          setAuthSession({ id: user.uid, email: user.email, role: 'Admin' });
        }
      } else {
        setAuthSession(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- LIVE FIRESTORE COLLECTIONS STREAM EFFECT ---
  useEffect(() => {
    if (!authSession) return;

    const unsubscribeTeachers = onSnapshot(collection(db, "teachers"), (snapshot) => {
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeFines = onSnapshot(collection(db, "fines"), (snapshot) => {
      setFines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeWarnings = onSnapshot(collection(db, "warnings"), (snapshot) => {
      setWarnings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeTeachers();
      unsubscribeAttendance();
      unsubscribeFines();
      unsubscribeWarnings();
    };
  }, [authSession]);

  // --- DARK MODE EFFECT ---
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- LOADING BLANK-SCREEN STOPPER ---
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-500 font-bold">
        Connecting to Firebase Securely...
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {!authSession ? (
        <AuthSystem 
          onLogin={setAuthSession} 
          darkMode={darkMode} 
          setDarkMode={setDarkMode}
          registeredAccounts={[]} // Handled by Firebase Auth now
          setAccounts={() => {}}
          passwordResets={[]}
          setPasswordResets={() => {}}
        />
      ) : (
        <DashboardSystem 
          userSession={authSession} 
          onLogout={async () => {
            try {
              await signOut(auth);
            } catch (err) {
              console.error(err);
            }
          }} 
          darkMode={darkMode} 
          setDarkMode={setDarkMode}
          db={{ teachers, attendance, fines, warnings }}
          setDb={{ setTeachers, setAttendance, setFines, setWarnings }}
        />
      )}
    </div>
  );
}

// ==========================================================
// MODULE 1: AUTHENTICATION SYSTEM
// ==========================================================
function AuthSystem({ onLogin, darkMode, setDarkMode, registeredAccounts, setAccounts, passwordResets, setPasswordResets }) {
  const [currentView, setCurrentView] = useState('signin');
  const [alert, setAlert] = useState(null);
  const [resetTokenData, setResetTokenData] = useState(null);

  const showAlert = (message, type = 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  return (
    <div className="min-h-screen flex w-full relative">
      <button onClick={() => setDarkMode(!darkMode)} className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 sm:p-3 rounded-full bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-300 dark:border-slate-700 hover:bg-slate-300/50 transition-all shadow-sm">
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-indigo-600 dark:bg-indigo-900 relative overflow-hidden items-center justify-center p-12">
        <div className="relative z-10 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-xl"><BookOpen size={40} /></div>
            <h1 className="text-4xl lg:text-5xl font-bold">Staff Management</h1>
          </div>
          <h2 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">Secure School<br/>Management.</h2>
          <p className="text-lg lg:text-xl text-indigo-100 mb-10">Data is 100% private and isolated. Log in to your secure portal to manage staff, attendance, and payroll.</p>
        </div>
      </div>

      {/* Right Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative overflow-y-auto h-screen">
        <div className="w-full max-w-md relative my-auto">
          {alert && (
            <div className={`absolute -top-20 left-0 right-0 p-4 rounded-xl flex items-center gap-3 shadow-lg z-50 ${alert.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
              {alert.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10">
            {currentView === 'signin' && <SignInForm setView={setCurrentView} showAlert={showAlert} onLogin={onLogin} registeredAccounts={registeredAccounts} />}
            {currentView === 'signup' && <SignUpForm setView={setCurrentView} showAlert={showAlert} onLogin={onLogin} registeredAccounts={registeredAccounts} setAccounts={setAccounts} />}
            {currentView === 'forgot' && <ForgotPasswordForm setView={setCurrentView} showAlert={showAlert} registeredAccounts={registeredAccounts} setPasswordResets={setPasswordResets} setResetTokenData={setResetTokenData} />}
            {currentView === 'reset' && <ResetPasswordForm setView={setCurrentView} showAlert={showAlert} resetTokenData={resetTokenData} passwordResets={passwordResets} setPasswordResets={setPasswordResets} registeredAccounts={registeredAccounts} setAccounts={setAccounts} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInForm({ setView, showAlert, onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Log in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Fetch the logged-in institution profile from your Cloud Firestore Database
      const docRef = doc(db, "accounts", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        showAlert('Login Successful!', 'success');
        // 3. THIS TRANSITION LINE GOES TO THE DASHBOARD PAGE INSTANTLY
        onLogin({ id: user.uid, ...docSnap.data() });
      } else {
        // Fallback user state configuration
        onLogin({ id: user.uid, email: user.email, role: 'Admin' });
      }
    } catch (err) {
      showAlert('Invalid email or password. Please try again.', 'error');
      console.error("Firebase Login Error: ", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-900 dark:text-white">Institute Login</h2>
      <p className="text-slate-500 mb-8 text-sm">Please enter your registered credentials.</p>
      
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="admin@school.com" className="w-full pl-11 pr-4 py-3.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-base sm:text-sm" />
          </div>
        </div>
        <div>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <input required type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="password123" className="w-full pl-11 pr-11 py-3.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-base sm:text-sm" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 p-1 hover:text-slate-600 transition-colors">
              {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-5 mb-3">
          <button type="button" onClick={() => setView('forgot')} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
            Forgot password?
          </button>
        </div>

        <button type="submit" disabled={isLoading} className="w-full py-4 sm:py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg mt-2 flex justify-center items-center gap-2 disabled:opacity-50">
          {isLoading ? 'Processing...' : 'Secure Sign In'}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">Register a new isolated Institute? <button onClick={() => setView('signup')} className="text-indigo-600 font-bold hover:underline">Sign up</button></p>
    </div>
  );
}
function SignUpForm({ setView, showAlert, onLogin }) {
  const [formData, setFormData] = useState({ instituteName: '', adminName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 1. Create account authentication profile in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Generate an isolated school workspace code
      const generatedWorkspaceId = 'inst_' + Date.now().toString(36);

      // 3. Build user custom data details
      const newAccountDetails = {
        adminName: formData.adminName,
        instituteName: formData.instituteName,
        email: formData.email,
        workspaceId: generatedWorkspaceId,
        role: 'Admin',
        createdAt: new Date().toISOString()
      };

      // 4. Save into your Cloud Firestore database collection
      await setDoc(doc(db, "accounts", user.uid), newAccountDetails);
      
      showAlert('Institution Registered Successfully!', 'success');
      onLogin({ id: user.uid, ...newAccountDetails });
    } catch (err) {
      showAlert(err.message.replace('Firebase: ', ''), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <h2 className="text-2xl sm:text-3xl font-bold mb-1 text-slate-900 dark:text-white">Register Institution</h2>
      <p className="text-slate-500 mb-6 text-sm">Create an isolated secure workspace for your institution.</p>
      
      <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
        <div>
          <div className="relative">
            <Building2 size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <input required type="text" placeholder="Institution Name" value={formData.instituteName} onChange={e => setFormData({ ...formData, instituteName: e.target.value })} className="w-full pl-11 pr-4 py-3.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm" />
          </div>
        </div>
        <div>
          <div className="relative">
            <User size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <input required type="text" placeholder="Administrator Name" value={formData.adminName} onChange={e => setFormData({ ...formData, adminName: e.target.value })} className="w-full pl-11 pr-4 py-3.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm" />
          </div>
        </div>
        <div>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <input required type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full pl-11 pr-4 py-3.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm" />
          </div>
        </div>
        <div>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <input required type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full pl-11 pr-11 py-3.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 p-1 hover:text-slate-600 transition-colors">
              {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="w-full py-4 sm:py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg mt-4 disabled:opacity-50">
          {isLoading ? 'Registering Workspace...' : 'Register Institution'}
        </button>
      </form>
      
      <p className="text-center text-sm pt-4 text-slate-600 dark:text-slate-400">
        Already registered? <button onClick={() => setView('signin')} className="text-indigo-600 font-bold hover:underline">Log in</button>
      </p>
    </div>
  );
}


function ForgotPasswordForm({ setView, showAlert, registeredAccounts, setPasswordResets, setResetTokenData }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [simulatedEmail, setSimulatedEmail] = useState(null);

  const handleSendLink = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      const account = registeredAccounts.find(acc => acc?.email?.toLowerCase() === email.toLowerCase());
      
      if (!account) {
         setIsLoading(false);
         return showAlert("If this email exists, a reset link was sent.", "success");
      }

      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = Date.now() + (15 * 60 * 1000); 

      setPasswordResets(prev => [...prev, {
        id: 'reset_' + Date.now(),
        email: account.email,
        token: token,
        expiresAt: expiresAt,
        used: false
      }]);
        
      setIsLoading(false);
      setSimulatedEmail({ email: account.email, token: token });
    }, 800);
  };

  if (simulatedEmail) {
    return (
      <div className="animate-in fade-in bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-800 text-center">
         <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
           <Mail className="text-indigo-500" size={32} />
         </div>
         <h3 className="font-bold text-xl mb-2 text-slate-900 dark:text-white">Simulated Email Inbox</h3>
         <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
           In a real production environment, a secure link is sent to <strong>{simulatedEmail.email}</strong>. 
           For this frontend demo, please click the secure link below to reset your password. The link will expire in 15 minutes.
         </p>
         <button 
           onClick={() => {
             setResetTokenData(simulatedEmail);
             setView('reset');
           }}
           className="bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-indigo-700 w-full shadow-md transition-all flex items-center justify-center gap-2"
         >
           <Lock size={18} /> Click Here to Reset Password
         </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-900 dark:text-white">Reset Password</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
        Enter your registered email address. We will send a secure password reset link valid for 15 minutes.
      </p>
      
      <form onSubmit={handleSendLink}>
        <div className="relative mb-6">
          <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@institute.com" 
            className="w-full pl-11 pr-4 py-3.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm" 
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full py-4 sm:py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isLoading ? 'Generating Link...' : 'Send Secure Reset Link'}
        </button>
      </form>
      
      <button onClick={() => setView('signin')} className="mt-6 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 w-full p-2 transition-colors">
        Back to Secure Login
      </button>
    </div>
  );
}

function ResetPasswordForm({ setView, showAlert, resetTokenData, passwordResets, setPasswordResets, registeredAccounts, setAccounts }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return showAlert("Passwords do not match!", "error");
    if (newPassword.length < 6) return showAlert("Password must be at least 6 characters.", "error");

    setIsLoading(true);
    setTimeout(() => {
      const dbToken = passwordResets.find(r => r.token === resetTokenData.token);
      
      if (!dbToken) { setIsLoading(false); return showAlert("Invalid or corrupted reset link.", "error"); }
      if (dbToken.used) { setIsLoading(false); return showAlert("This link has already been used.", "error"); }
      if (Date.now() > dbToken.expiresAt) { setIsLoading(false); return showAlert("This reset link has expired.", "error"); }

      const userDoc = registeredAccounts.find(a => a.email === resetTokenData.email);
      if (!userDoc) { setIsLoading(false); return showAlert("User account not found.", "error"); }

      setAccounts(prev => prev.map(a => a.id === userDoc.id ? { ...a, password: newPassword } : a));
      setPasswordResets(prev => prev.map(r => r.id === dbToken.id ? { ...r, used: true } : r));

      showAlert("Password updated successfully! You can now log in.", "success");
      setIsLoading(false);
      setView('signin');
      
    }, 800);
  };

  return (
    <div className="animate-in fade-in">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-900 dark:text-white">Create New Password</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
        Set a strong password for <strong className="text-indigo-600 dark:text-indigo-400">{resetTokenData?.email}</strong>.
      </p>

      <form onSubmit={handlePasswordReset} className="space-y-4">
        <div>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              placeholder="New Password" 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)} 
              className="w-full pl-11 pr-11 py-3.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm" 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 p-1 hover:text-slate-600 transition-colors">
              {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
        </div>

        <div>
          <div className="relative">
            <CheckCircle2 size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              placeholder="Confirm New Password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} 
              className="w-full pl-11 pr-4 py-3.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-sm" 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full py-4 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md mt-4 disabled:opacity-50"
        >
          {isLoading ? 'Updating Password...' : 'Save Password & Login'}
        </button>
      </form>
    </div>
  );
}

// ==========================================================
// MODULE 2: ISOLATED DASHBOARD SYSTEM
// ==========================================================
function DashboardSystem({ userSession, onLogout, darkMode, setDarkMode, db, setDb }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('teachers'); 
  const [notification, setNotification] = useState(null);

  const teachers = useMemo(() => db.teachers.filter(t => t?.workspaceId === userSession?.workspaceId), [db.teachers, userSession]);
  const attendance = useMemo(() => db.attendance.filter(a => a?.workspaceId === userSession?.workspaceId), [db.attendance, userSession]);
  const fines = useMemo(() => db.fines.filter(f => f?.workspaceId === userSession?.workspaceId), [db.fines, userSession]);
  const warnings = useMemo(() => db.warnings.filter(w => w?.workspaceId === userSession?.workspaceId), [db.warnings, userSession]);

  const showNotice = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const safeInitials = userSession?.instituteName ? userSession.instituteName.charAt(0).toUpperCase() : 'S';
  const safeInstName = userSession?.instituteName || 'Staff Management';
  const safeAdminName = userSession?.adminName || 'Admin User';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* MOBILE OVERLAY */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setSidebarOpen(false)} />}

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto sm:min-w-[300px] z-50 px-6 py-4 sm:py-3 rounded-2xl shadow-2xl flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'} animate-in slide-in-from-top-4`}>
          {notification.type === 'error' ? <AlertCircle size={22} className="shrink-0" /> : <CheckCircle2 size={22} className="shrink-0" />}
          <span className="font-semibold text-sm">{notification.message}</span>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[280px] lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-out flex flex-col shrink-0 ${sidebarOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-black text-xl tracking-tight">
            <BookOpen className="w-6 h-6" /> <span>Staff Management</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"><X size={24}/></button>
        </div>

        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">{safeInitials}</div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold truncate text-slate-900 dark:text-white">{safeInstName}</h4>
              <p className="text-xs font-medium text-slate-500 truncate">{safeAdminName}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', icon: PieChart, label: 'Dashboard' },
            { id: 'teachers', icon: Users, label: 'Manage Staff' },
            { id: 'attendance', icon: Check, label: 'Daily Attendance' },
            { id: 'star', icon: Award, label: 'Star of the Year' }, 
            { id: 'fine', icon: AlertOctagon, label: 'Manage Fines' },
            { id: 'deduction-report', icon: FileBarChart, label: 'Overall Deductions' },
            { id: 'salary', icon: DollarSign, label: 'Payroll & Salary' }
          ].map(tab => (
            <button key={tab.id} onClick={() => {setActiveTab(tab.id); setSidebarOpen(false);}} className={`w-full flex items-center gap-3.5 text-left px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 shadow-sm' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
              <tab.icon size={20} className={activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} /> {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />} Toggle Theme
          </button>
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold rounded-xl text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors">
            <LogOut size={18} /> Secure Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* MOBILE HEADER */}
        <header className="h-16 flex items-center justify-between lg:justify-end px-4 sm:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold capitalize text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-500" /> {activeTab === 'teachers' ? 'Manage Staff' : activeTab.replace('-', ' ')}
            </h2>
          </div>
          
          {/* DESKTOP HEADER INFO */}
          <div className="hidden lg:flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
             <CalendarIcon size={18}/> {new Date().toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <OverviewTab teachers={teachers} attendance={attendance} session={userSession} />}
            {activeTab === 'teachers' && <TeachersTab teachers={teachers} setTeachers={setDb.setTeachers} workspaceId={userSession?.workspaceId} showNotice={showNotice} instituteName={safeInstName} />}
            {activeTab === 'attendance' && <AttendanceTab teachers={teachers} attendance={attendance} setAttendance={setDb.setAttendance} workspaceId={userSession?.workspaceId} showNotice={showNotice} />}
            {activeTab === 'fine' && <FineTab teachers={teachers} fines={fines} setFines={setDb.setFines} workspaceId={userSession?.workspaceId} showNotice={showNotice} />}
            {activeTab === 'deduction-report' && <DeductionReportTab teachers={teachers} attendance={attendance} fines={fines} />}
            {activeTab === 'salary' && <SalaryTab teachers={teachers} attendance={attendance} fines={fines} warnings={warnings} setWarnings={setDb.setWarnings} workspaceId={userSession?.workspaceId} instituteName={safeInstName} showNotice={showNotice} />}
            {activeTab === 'star' && <StarOfTheYearTab teachers={teachers} attendance={attendance} instituteName={safeInstName} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Dashboard Sub-Components ---
function OverviewTab({ teachers, attendance, session }) {
  const today = new Date().toISOString().split('T')[0];
  const activeTeachers = teachers.filter(t => t?.status === 'Active');
  const todayAttendance = attendance.filter(a => a?.date === today);

  const present = todayAttendance.filter(a => a?.status === 'Present').length;
  const absent = todayAttendance.filter(a => ['Absent', 'Leave'].includes(a?.status)).length;
  const late = todayAttendance.filter(a => a?.status === 'Late').length;
  
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="p-6 sm:p-8 lg:p-10 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-3">Welcome, {session?.adminName || 'Admin'}!</h2>
          <p className="text-indigo-200 text-sm sm:text-base max-w-2xl leading-relaxed">
            Managing records securely for <strong className="text-white">{session?.instituteName || 'Institute'}</strong>. Your workspace is fully optimized for daily operations.
          </p>
        </div>
        <Building2 size={160} className="absolute -right-8 -bottom-8 text-indigo-500 opacity-20 transform rotate-12" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0"><Users size={28}/></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff</p><h4 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{activeTeachers.length}</h4></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0"><Check size={28}/></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Present Today</p><h4 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{present}</h4></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600 dark:text-red-400 shrink-0"><AlertCircle size={28}/></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Absent Today</p><h4 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{absent}</h4></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 dark:text-orange-400 shrink-0"><CalendarIcon size={28}/></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Late Today</p><h4 className="text-3xl font-black mt-1 text-slate-800 dark:text-white">{late}</h4></div>
        </div>
      </div>
    </div>
  );
}

// --- MANAGE STAFF TAB (WITH RED & YELLOW PROFESSIONAL ID CARD) ---
function TeachersTab({ teachers, setTeachers, workspaceId, showNotice, instituteName }) {
  const [modalObj, setModalObj] = useState(null);
  const [viewRemarksObj, setViewRemarksObj] = useState(null); 
  const [idCardData, setIdCardData] = useState(null); 
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showRemarkInput, setShowRemarkInput] = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleDropdown = (e) => {
    e.stopPropagation(); 
    setDropdownOpen(!dropdownOpen);
  };

  const handleEditClick = (t) => {
    setModalObj(t || {});
    setPhotoPreview(t?.photo || "");
    setDropdownOpen(false);
    setShowRemarkInput(false);
    setRemarkText("");
  };


const handleSave = async (e) => {
   e.preventDefault();
    
    let updatedRemarks = modalObj.id ? (modalObj.salaryRemarksList || []) : [];
    if (remarkText.trim() !== "") {
      updatedRemarks = [...updatedRemarks, { text: remarkText, date: new Date().toISOString() }];
    }

    // 1. Live form se direct image file nikalte hain
    const imageInput = e.target.querySelector('input[type="file"]');
    const imageFile = imageInput?.files[0];
    let base64Photo = photoPreview || ""; // Agar pehle se koi photo ka preview hai

    // 2. Agar user ne nayi file select ki hai, toh submit ke waqt convert hone ka wait karega
    if (imageFile) {
      base64Photo = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => resolve(reader.result);
      });
    }

    // 3. Ab aapka data object jo 100% photo lekar Firebase mein jayega
    const data = {
      name: e.target.name.value, 
      email: e.target.email.value || "", 
      phone: e.target.phone.value, 
      subject: e.target.subject.value, 
      salary: Number(e.target.salary.value) || 0, 
      joiningDate: e.target.joiningDate.value, 
      status: e.target.status.value,
      salaryRemarksList: updatedRemarks || [], 
      photo: base64Photo, // <--- Ab isme 100% image ka data jayega!
      workspaceId: workspaceId 
    };
    try {
      if (modalObj.id) {
        // --- UPDATE EXISTING TEACHER IN FIREBASE ---
        const teacherRef = doc(db, "teachers", modalObj.id);
        await updateDoc(teacherRef, data);
        showNotice('Staff member updated successfully');
      } else {
        // --- ADD NEW TEACHER TO FIREBASE ---
        await addDoc(collection(db, "teachers"), {
          ...data,
          createdAt: new Date().toISOString()
        });
        showNotice('Staff member added successfully');
      }
      setModalObj(null);
    } catch (error) {
      console.error("Error saving teacher:", error);
      showNotice('Failed to save staff member', 'error');
    }
  };

 const confirmDelete = async () => {
    if (!teacherToDelete) return;

    try {
      // Dono suraton mein ID nikalne ki koshish karte hain
      const teacherId = typeof teacherToDelete === 'object' ? teacherToDelete.id : teacherToDelete;
      
      console.log("Deleting teacher with ID:", teacherId); // <-- Yeh check karne ke liye

      if (!teacherId) {
        showNotice('Invalid Teacher ID', 'error');
        return;
      }

      // --- DELETE FROM FIREBASE ---
      const teacherRef = doc(db, "teachers", teacherId);
      await deleteDoc(teacherRef);
      
      showNotice('Teacher deleted successfully');
      setTeacherToDelete(null); 
    } catch (error) {
      console.error("Firebase Delete Error Detail:", error); // <-- Yeh asli error batayega
      showNotice('Failed to delete teacher', 'error');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Staff Directory</h2>
          <p className="text-sm text-slate-500">Manage profiles and print professional ID cards.</p>
        </div>
        <button onClick={() => handleEditClick(null)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all">
          <Plus size={18}/> Add New Staff Member
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-1/3">Name & Contact</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-1/5">Subject / Role</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-1/4">Salary (PKR)</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-1/6">Status</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {teachers.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 sm:p-5 align-middle">
                    <div className="flex items-center gap-4">
                      {t.photo ? (
                        <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 shadow-sm shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 text-indigo-600 dark:text-indigo-300 font-black flex items-center justify-center text-lg shadow-sm border border-indigo-50 dark:border-indigo-800/50 shrink-0">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-base text-slate-900 dark:text-white leading-snug">{t.name}</p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                           {t.phone} {t.email ? `• ${t.email}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-slate-700 dark:text-slate-300 align-middle font-medium">{t.subject}</td>
                  <td className="p-4 sm:p-5 align-middle">
                    <div className="font-black text-slate-900 dark:text-white text-base">
                      {Number(t.salary || 0).toLocaleString()}
                    </div>
                    {t.salaryRemarksList && t.salaryRemarksList.length > 0 && (
                      <button 
                        onClick={() => setViewRemarksObj(t)}
                        className="mt-2 p-1.5 px-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800 dark:text-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors border border-indigo-100 dark:border-indigo-900"
                        title="View Messages"
                      >
                        <MessageSquare size={13} /> 
                        <span className="text-[11px] font-bold uppercase tracking-wider">{t.salaryRemarksList.length} Remarks</span>
                      </button>
                    )}
                  </td>
                  <td className="p-4 sm:p-5 align-middle">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${t.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>{t.status}</span>
                  </td>
                  <td className="p-4 sm:p-5 text-right space-x-2 align-middle">
                    <button onClick={() => setIdCardData(t)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors font-bold" title="Print Professional ID Card"><CreditCard size={18}/></button>
                    <button onClick={() => handleEditClick(t)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors font-bold" title="Edit Profile"><Edit2 size={18}/></button>
                    <button onClick={() => setTeacherToDelete(t)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors font-bold" title="Delete"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-slate-500 font-medium">No staff found. Click "Add New Staff Member" to begin.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Staff Add/Edit Modal */}
      {modalObj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 custom-scrollbar">
            <h3 className="font-bold text-2xl mb-4">{modalObj.id ? 'Edit' : 'Add'} Staff Record</h3>
            
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="relative w-24 h-24">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full rounded-full object-cover border-4 border-indigo-50 dark:border-indigo-900 shadow-md" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <User size={40} />
                  </div>
                )}
                <label 
  htmlFor="teacher-photo-input" 
  className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95"
>
  <Camera size={16} />
  <input 
    id="teacher-photo-input"
    name="photo" // <-- Iski wajah se database mein save hogi
    type="file" 
    accept="image/*" 
    onChange={handlePhotoUpload} 
    className="sr-only" // <-- 'hidden' ki jagah 'sr-only' lagaya taake click block na ho!
  />
</label>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Upload Photo (Max 1.2MB)</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Full Name</label><input required name="name" defaultValue={modalObj.name} className="w-full px-4 py-3 sm:py-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" /></div>
              
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email <span className="text-[10px] text-slate-400 font-normal lowercase">(Optional)</span></label><input type="email" name="email" defaultValue={modalObj.email} placeholder="email@example.com (Optional)" className="w-full px-4 py-3 sm:py-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" /></div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone</label><input required name="phone" defaultValue={modalObj.phone} className="w-full px-4 py-3 sm:py-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Subject / Role</label><input required name="subject" defaultValue={modalObj.subject} placeholder="e.g. Science Teacher" className="w-full px-4 py-3 sm:py-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" /></div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Monthly Salary (PKR)</label>
                <div className="flex gap-2 relative">
                  <input required type="number" name="salary" defaultValue={modalObj.salary} className="w-full px-4 py-3 sm:py-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-indigo-700 dark:text-indigo-400" />
                  <div className="relative shrink-0">
                    <button type="button" onClick={toggleDropdown} className="h-full px-3.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <ChevronDown size={20} />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl z-50 p-1" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => { setShowRemarkInput(true); setDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 rounded-lg transition-colors">
                          Write Salary Remark
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {showRemarkInput && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                    <textarea 
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="Reason for salary change? (Optional)" 
                      rows="2" 
                      className="w-full px-4 py-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium resize-none bg-indigo-50/30 dark:bg-indigo-900/10"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Joining Date</label><input required type="date" name="joiningDate" defaultValue={modalObj.joiningDate || new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 sm:py-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label><select name="status" defaultValue={modalObj.status || 'Active'} className="w-full px-4 py-3 sm:py-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"><option>Active</option><option>Inactive</option></select></div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-5 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button type="button" onClick={() => setModalObj(null)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READ-ONLY POPUP FOR SALARY MESSAGES */}
      {viewRemarksObj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg leading-tight">Salary Remarks</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">History for {viewRemarksObj.name}</p>
              </div>
              <button onClick={() => setViewRemarksObj(null)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {viewRemarksObj.salaryRemarksList && viewRemarksObj.salaryRemarksList.length > 0 ? (
                viewRemarksObj.salaryRemarksList.slice().reverse().map((msg, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative">
                    <span className="absolute top-3.5 right-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {new Date(msg.date).toLocaleDateString()}
                    </span>
                    <MessageSquare size={16} className="text-indigo-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      "{msg.text}"
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm font-medium text-slate-500 py-6">No messages recorded yet.</p>
              )}
            </div>
            
            <button onClick={() => setViewRemarksObj(null)} className="w-full mt-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl transition-colors">
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* ID CARD GENERATOR MODAL (RED & YELLOW PROFESSIONAL DESIGN) */}
      {idCardData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 print:p-0 print:bg-white">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 print:shadow-none print:border-none print:w-[320px] print:mx-auto">
            
            {/* Header Controls (Hidden on Print) */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 print:hidden bg-slate-50 dark:bg-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><CreditCard size={18} className="text-red-600"/> Setup ID Card</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md">
                  <Printer size={14}/> Print
                </button>
                <button onClick={() => setIdCardData(null)} className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"><X size={16}/></button>
              </div>
            </div>
            
            {/* ACTUAL ID CARD UI - RED & YELLOW DESIGN */}
            <div className="p-8 print:p-0 flex justify-center bg-slate-100 dark:bg-slate-950 print:bg-white">
               <div className="w-[320px] h-[480px] bg-yellow-400 border border-red-700 rounded-xl shadow-2xl flex flex-col items-center text-center relative overflow-hidden print:shadow-none print:border-[3px] print:border-red-700">
                  
                  {/* Header - Red */}
                  <div className="w-full bg-red-700 text-white py-5 px-4 z-10 shadow-md shrink-0">
                     <h2 className="text-[17px] font-black uppercase tracking-widest leading-tight">
                        {instituteName || 'Staff Management'}
                     </h2>
                  </div>
                  
                  {/* Photo */}
                  <div className="mt-6 w-32 h-32 rounded-xl border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center z-10 shrink-0">
                     {idCardData.photo ? 
                       <img src={idCardData.photo} alt={idCardData.name} className="w-full h-full object-cover" /> : 
                       <span className="text-6xl font-black text-slate-300">{idCardData.name.charAt(0).toUpperCase()}</span>
                     }
                  </div>
                  
                  {/* Details Box */}
                  <div className="mt-5 w-11/12 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-5 z-10 flex flex-col gap-2">
                    <div>
                       <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-0.5">Name</p>
                       <h3 className="text-xl font-black text-slate-900 leading-tight uppercase">{idCardData.name}</h3>
                    </div>
                    
                    <div className="w-full h-px bg-slate-200 my-1"></div>

                    <div>
                       <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-0.5">Designation</p>
                       <p className="text-sm font-bold text-slate-700 uppercase">{idCardData.subject}</p>
                    </div>

                    <div className="w-full h-px bg-slate-200 my-1"></div>

                    <div>
                       <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-0.5">Phone No</p>
                       <p className="text-[13px] font-bold text-slate-700 font-mono tracking-wider">{idCardData.phone || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Background Decorative Elements */}
                  <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-red-600 rounded-full opacity-[0.08] pointer-events-none"></div>
                  <div className="absolute top-16 -right-16 w-36 h-36 bg-white rounded-full opacity-30 pointer-events-none"></div>
                  
                  {/* Footer - Red Strip */}
                  <div className="absolute bottom-0 w-full h-5 bg-red-700 flex items-center justify-center z-10">
                      <span className="text-[9px] text-white/80 font-bold tracking-widest uppercase">Official Staff Identity Card</span>
                  </div>
               </div>
            </div>

            {/* Print Instruction Footer */}
            <div className="p-4 bg-yellow-50 text-yellow-800 text-[11px] font-bold text-center print:hidden border-t border-yellow-100">
               ⚠️ For best print quality, enable <span className="bg-yellow-200 px-1 rounded">Background Graphics</span> in print settings.
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {teacherToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center z-[70]">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full shrink-0">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">Delete Staff Member?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Are you sure you want to permanently delete <strong>{teacherToDelete.name}</strong>? All their associated records will be lost.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8">
              <button onClick={() => setTeacherToDelete(null)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 sm:border-0">
                Cancel
              </button>
              <button onClick={confirmDelete} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-200 dark:shadow-none">
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- ATTENDANCE TAB ---
function AttendanceTab({ teachers, attendance, setAttendance, workspaceId, showNotice }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const activeTeachers = teachers.filter(t => t?.status === 'Active');
  const todayAtt = useMemo(() => attendance.filter(a => a?.date === date), [attendance, date]);

  const [leaveModal, setLeaveModal] = useState(null);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveStatusMark, setLeaveStatusMark] = useState('Leave');
  const [viewReasonText, setViewReasonText] = useState(null); 

const mark = async (teacherId, status, reason = "") => {
    const existing = todayAtt.find(a => a?.teacherId === teacherId);
    
    const data = {
      teacherId,
      date,
      status,
      workspaceId,
      leaveReason: status === 'Leave' || status === 'Absent' ? reason : ""
    };

    try {
      if (existing) {
        // --- UPDATE EXISTING ATTENDANCE RECORD IN FIREBASE ---
        const attRef = doc(db, "attendance", existing.id);
        await updateDoc(attRef, data);
      } else {
        // --- CREATE NEW ATTENDANCE RECORD IN FIREBASE ---
        await addDoc(collection(db, "attendance"), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      showNotice(`Marked as ${status}`);
    } catch (error) {
      console.error("Error saving attendance:", error);
      showNotice('Failed to mark attendance', 'error');
    }
  };

  const handleLeaveClick = (t, statusType) => {
    const existing = todayAtt.find(a => a?.teacherId === t.id);
    setLeaveStatusMark(statusType);
    setLeaveReason(existing?.leaveReason || "");
    setLeaveModal(t);
  };

  const submitLeave = (e) => {
    e.preventDefault();
    mark(leaveModal.id, leaveStatusMark, leaveReason);
    setLeaveModal(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Daily Attendance</h2>
          <p className="text-sm text-slate-500 mt-1">Select date to mark presence, leave, or lateness.</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full sm:w-auto px-5 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 shadow-sm" />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-2/5">Staff Name</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-1/5">Current Status</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300">Quick Mark Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {activeTeachers.map(t => {
                const attRecord = todayAtt.find(a => a?.teacherId === t.id);
                const status = attRecord?.status || 'Unmarked';
                const currentLeaveReason = attRecord?.leaveReason || "";

                return (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 sm:p-5 align-middle">
                      <div className="flex items-center gap-3">
                        {t.photo ? (
                          <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-sm border border-slate-200 dark:border-slate-700 shrink-0">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-base text-slate-900 dark:text-white">{t.name}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 align-middle">
                       <div className="flex flex-col items-start gap-2">
                         <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                           status === 'Present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : 
                           status === 'Absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' : 
                           status === 'Late' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' :
                           status === 'Leave' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400' :
                           'bg-slate-100 text-slate-500 dark:bg-slate-800'
                         }`}>{status}</span>
                         
                         {status === 'Leave' && currentLeaveReason && (
                           <button 
                             onClick={() => setViewReasonText({ name: t.name, reason: currentLeaveReason, status: status })}
                             className="inline-flex items-center gap-1.5 p-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors border border-indigo-100 dark:border-indigo-800/50"
                           >
                             <MessageSquare size={12} /> Reason
                           </button>
                         )}
                       </div>
                    </td>
                    <td className="p-4 sm:p-5 flex flex-wrap gap-2 align-middle">
                      {['Present', 'Half Day', 'Late'].map(s => (
                        <button key={s} onClick={() => mark(t.id, s)} className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${status===s ? 'bg-indigo-600 text-white border-indigo-600 shadow-md':'hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{s}</button>
                      ))}
                      <button onClick={() => mark(t.id, 'Absent')} className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${status==='Absent' ? 'bg-red-600 text-white border-red-600 shadow-md':'hover:bg-red-50 text-red-600 border-red-200 dark:border-red-900/50 dark:text-red-400'}`}>
                        Absent
                      </button>
                      <button onClick={() => handleLeaveClick(t, 'Leave')} className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${status==='Leave' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md':'hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        Leave
                      </button>
                    </td>
                  </tr>
                )
              })}
              {activeTeachers.length === 0 && <tr><td colSpan="3" className="p-12 text-center text-slate-500 font-medium">No active staff to mark.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEAVE REASON INPUT MODAL */}
      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex gap-4 items-center bg-indigo-50/50 dark:bg-slate-800/50">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <CalendarIcon size={24} />
              </div>
              <div>
                 <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">{leaveStatusMark} Application</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{leaveModal.name}</p>
              </div>
            </div>
            <form onSubmit={submitLeave} className="p-6 space-y-5">
              <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Reason (Optional)</label>
                 <textarea 
                   rows="3" 
                   value={leaveReason}
                   onChange={(e) => setLeaveReason(e.target.value)}
                   placeholder="e.g., Medical emergency, Family event..."
                   className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium resize-none"
                 />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
                <button type="button" onClick={() => setLeaveModal(null)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 sm:border-0">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md">Mark {leaveStatusMark}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP FOR VIEWING LEAVE REASON */}
      {viewReasonText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-lg text-slate-900 dark:text-white">{viewReasonText.status} Reason</h4>
                <button onClick={() => setViewReasonText(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"><X size={20} /></button>
             </div>
             
             <div className="mb-5">
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee Name</p>
               <p className="font-black text-slate-900 dark:text-white text-lg">{viewReasonText.name}</p>
             </div>
             
             <div>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stated Reason Message</p>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                  <p className="text-sm italic text-slate-800 dark:text-slate-200 leading-relaxed font-medium">"{viewReasonText.reason}"</p>
               </div>
             </div>
             
             <button onClick={() => setViewReasonText(null)} className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-colors text-sm">Close Window</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FineTab({ teachers, fines, setFines, workspaceId, showNotice }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [editFineObj, setEditFineObj] = useState(null);
  const [fineToDelete, setFineToDelete] = useState(null); 
  const [viewReasonText, setViewReasonText] = useState(null);

  const activeTeachers = teachers.filter(t => t?.status === 'Active');
  const sortedFines = [...fines].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleSaveFine = async (e) => {
    e.preventDefault();
    if (!selectedTeacher || !amount) return showNotice("Please fill required fields", "error");

    const data = {
      teacherId: selectedTeacher, 
      date, 
      amount: Number(amount),
      reason: reason || "No specific reason provided.", 
      workspaceId,
      createdAt: new Date().toISOString()
    };

    try {
      // --- ADD NEW FINE TO FIREBASE ---
      await addDoc(collection(db, "fines"), data);
      showNotice('Fine recorded successfully!');
      setSelectedTeacher(""); setAmount(""); setReason("");
    } catch (error) {
      console.error("Error saving fine:", error);
      showNotice('Failed to record fine', 'error');
    }
  };

  const handleUpdateFine = async (e) => {
    e.preventDefault();
    
    const data = {
      date: e.target.editDate.value, 
      amount: Number(e.target.editAmount.value), 
      reason: e.target.editReason.value 
    };

    try {
      // --- UPDATE EXISTING FINE IN FIREBASE ---
      const fineRef = doc(db, "fines", editFineObj.id);
      await updateDoc(fineRef, data);
      showNotice('Fine updated successfully!'); 
      setEditFineObj(null);
    } catch (error) {
      console.error("Error updating fine:", error);
      showNotice('Failed to update fine', 'error');
    }
  };

  const confirmDeleteFine = async () => {
    try {
      // --- DELETE FINE FROM FIREBASE ---
      const fineRef = doc(db, "fines", fineToDelete);
      await deleteDoc(fineRef);
      showNotice('Fine deleted successfully');
      setFineToDelete(null);
    } catch (error) {
      console.error("Error deleting fine:", error);
      showNotice('Failed to delete fine', 'error');
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center shrink-0">
            <AlertOctagon size={28} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Add Manual Fine / Penalty</h2>
            <p className="text-sm text-slate-500 mt-1">Record a deduction that will automatically apply to this month's salary.</p>
          </div>
        </div>

        <form onSubmit={handleSaveFine} className="space-y-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Select Employee</label>
              <div className="relative">
                <select required value={selectedTeacher} onChange={e=>setSelectedTeacher(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium appearance-none">
                  <option value="" disabled>-- Select a staff member --</option>
                  {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Date of Fine</label>
              <input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Fine Amount (PKR)</label>
              <input required type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 500" className="w-full px-4 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-red-600 dark:text-red-400" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Reason / Message</label>
              <input required type="text" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why is this fine being applied?" className="w-full px-4 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={activeTeachers.length === 0} className="w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-200 dark:shadow-none disabled:opacity-50">
              Apply Fine Penalty
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30"><h3 className="font-bold text-lg">Recent Fines History</h3></div>
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-1/6">Date</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-1/4">Employee</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-1/5">Amount (PKR)</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 w-1/4">Reason</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-right w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {sortedFines.map(f => {
                const tInfo = teachers.find(t => t.id === f.teacherId);
                return (
                  <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 sm:p-5 text-slate-500 font-medium align-middle">{new Date(f.date).toLocaleDateString()}</td>
                    <td className="p-4 sm:p-5 font-bold text-slate-900 dark:text-white align-middle">{tInfo ? tInfo.name : 'Unknown Employee'}</td>
                    <td className="p-4 sm:p-5 text-red-600 font-black align-middle">- {Number(f.amount).toLocaleString()}</td>
                    
                    <td className="p-4 sm:p-5 align-middle">
                      {f.reason && (
                         <button 
                           onClick={() => setViewReasonText({ name: tInfo ? tInfo.name : 'Unknown Employee', reason: f.reason, date: f.date })}
                           className="inline-flex items-center gap-1.5 p-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors border border-indigo-100 dark:border-indigo-800/50"
                         >
                           <MessageSquare size={13} /> Reason
                         </button>
                      )}
                    </td>

                    <td className="p-4 sm:p-5 text-right space-x-2 align-middle">
                      <button onClick={() => setEditFineObj({ ...f, teacherName: tInfo ? tInfo.name : 'Unknown' })} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors font-bold"><Edit2 size={18}/></button>
                      <button onClick={() => setFineToDelete(f.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors font-bold"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                )
              })}
              {sortedFines.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-slate-500 font-medium">No fines recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT FINE MODAL */}
      {editFineObj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-2xl mb-1 text-slate-900 dark:text-white">Edit Fine Record</h3>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Updating penalty for <strong className="text-slate-600 dark:text-slate-200">{editFineObj.teacherName}</strong></p>
            
            <form onSubmit={handleUpdateFine} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Date of Fine</label><input required type="date" name="editDate" defaultValue={editFineObj.date} className="w-full px-4 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Fine Amount (PKR)</label><input required type="number" name="editAmount" min="0" defaultValue={editFineObj.amount} className="w-full px-4 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-red-600" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Reason / Message</label><textarea required name="editReason" defaultValue={editFineObj.reason} rows="3" className="w-full px-4 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium resize-none" /></div>
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button type="button" onClick={() => setEditFineObj(null)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 sm:border-0">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md">Update Fine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP FOR VIEWING FINE REASON */}
      {viewReasonText && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-lg text-slate-900 dark:text-white">Fine Reason</h4>
                <button onClick={() => setViewReasonText(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"><X size={20} /></button>
             </div>
             
             <div className="mb-5">
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee Name</p>
               <p className="font-black text-slate-900 dark:text-white text-lg">{viewReasonText.name}</p>
               <p className="text-xs font-medium text-slate-500 mt-1">Date: {new Date(viewReasonText.date).toLocaleDateString()}</p>
             </div>
             
             <div>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stated Reason Message</p>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                  <p className="text-sm italic text-slate-800 dark:text-slate-200 leading-relaxed font-medium">"{viewReasonText.reason}"</p>
               </div>
             </div>
             
             <button onClick={() => setViewReasonText(null)} className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-colors text-sm">Close Window</button>
          </div>
        </div>
      )}

      {/* NEW CUSTOM DELETE FINE MODAL */}
      {fineToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center z-[70]">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full shrink-0">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">Delete Fine?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Are you sure you want to permanently delete this fine record? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8">
              <button onClick={() => setFineToDelete(null)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 sm:border-0">
                Cancel
              </button>
              <button onClick={confirmDeleteFine} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-200 dark:shadow-none">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeductionReportTab({ teachers, attendance, fines }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const reportStats = useMemo(() => {
    const [y, m] = month.split('-');
    const daysInMonth = new Date(y, m, 0).getDate();

    let totalLeaveDeductions = 0;
    let totalLateDeductions = 0;
    let totalManualFines = 0;
    let breakdown = [];

    teachers.forEach(t => {
      const tAtt = attendance.filter(a => a?.teacherId === t.id && a?.date && a.date.startsWith(month));
      const tFines = fines.filter(f => f?.teacherId === t.id && f?.date && f.date.startsWith(month));

      let absents = 0, leaves = 0, halfDays = 0, lates = 0;
      tAtt.forEach(a => {
        if (a.status === 'Absent') absents++;
        if (a.status === 'Leave') leaves++;
        if (a.status === 'Half Day') halfDays += 0.5;
        if (a.status === 'Late') lates++;
      });

      const totalLeavesTaken = absents + leaves;
      const unpaidLeavesCount = Math.max(0, totalLeavesTaken - 1);
      const penaltyDays = unpaidLeavesCount + halfDays;

      const perDaySalary = (Number(t.salary) || 0) / daysInMonth;
      
      const leaveDed = penaltyDays * perDaySalary;
      const lateDed = lates * 100;
      const manualFine = tFines.reduce((sum, f) => sum + Number(f.amount), 0);

      totalLeaveDeductions += leaveDed;
      totalLateDeductions += lateDed;
      totalManualFines += manualFine;

      if (leaveDed > 0 || lateDed > 0 || manualFine > 0) {
        breakdown.push({
           id: t.id,
           name: t.name,
           subject: t.subject,
           photo: t.photo || "",
           leaveDed, 
           lateDed, 
           manualFine,
           total: leaveDed + lateDed + manualFine
        });
      }
    });

    return {
       totalLeaveDeductions,
       totalLateDeductions,
       totalManualFines,
       grandTotal: totalLeaveDeductions + totalLateDeductions + totalManualFines,
       breakdown: breakdown.sort((a,b) => b.total - a.total)
    };
  }, [teachers, attendance, fines, month]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Total Collections / Deductions</h2>
          <p className="text-sm text-slate-500 mt-1">Summary of all money collected from staff penalties this month.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full sm:w-auto px-5 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 flex-1 md:flex-none" />
          <button onClick={() => window.print()} className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 shrink-0 transition-colors">
             <Printer size={18}/> <span className="hidden sm:inline">Print Total</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-red-50 dark:bg-red-900/10 p-6 sm:p-8 rounded-3xl border border-red-100 dark:border-red-900/30 text-red-900 dark:text-red-300 shadow-sm">
           <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider mb-2 opacity-70">From Absents & Leaves</p>
           <h3 className="text-3xl sm:text-4xl font-black">PKR {reportStats.totalLeaveDeductions.toFixed(0)}</h3>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 p-6 sm:p-8 rounded-3xl border border-amber-100 dark:border-amber-900/30 text-amber-900 dark:text-amber-300 shadow-sm">
           <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider mb-2 opacity-70">From Late Penalties</p>
           <h3 className="text-3xl sm:text-4xl font-black">PKR {reportStats.totalLateDeductions.toFixed(0)}</h3>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/10 p-6 sm:p-8 rounded-3xl border border-purple-100 dark:border-purple-900/30 text-purple-900 dark:text-purple-300 shadow-sm">
           <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider mb-2 opacity-70">From Manual Fines</p>
           <h3 className="text-3xl sm:text-4xl font-black">PKR {reportStats.totalManualFines.toFixed(0)}</h3>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-8 sm:p-10 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden mt-6">
        <div className="relative z-10 text-center md:text-left">
           <p className="text-indigo-300 font-bold uppercase tracking-widest text-sm mb-3">Grand Total Collected</p>
           <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-emerald-400">PKR {reportStats.grandTotal.toFixed(0)}</h2>
        </div>
        <div className="relative z-10 opacity-20 md:opacity-60">
           <DollarSign size={100} className="text-emerald-400" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden mt-8">
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
           <h3 className="font-bold text-lg">Staff Deduction Breakdown</h3>
        </div>
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[850px]">
            <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300">Employee</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-right">Leaves Ded.</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-right">Late Pen.</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-right">Fines</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-right">Total Contributed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {reportStats.breakdown.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 sm:p-5 align-middle">
                    <div className="flex items-center gap-3">
                      {r.photo ? (
                        <img src={r.photo} alt={r.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-sm border border-slate-200 dark:border-slate-700 shrink-0">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-base text-slate-900 dark:text-white block">{r.name}</span>
                        <span className="text-xs font-medium text-slate-500 block mt-0.5">{r.subject}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-right text-red-500 font-bold align-middle">{r.leaveDed > 0 ? `PKR ${r.leaveDed.toFixed(0)}` : '-'}</td>
                  <td className="p-4 sm:p-5 text-right text-amber-500 font-bold align-middle">{r.lateDed > 0 ? `PKR ${r.lateDed.toFixed(0)}` : '-'}</td>
                  <td className="p-4 sm:p-5 text-right text-purple-500 font-bold align-middle">{r.manualFine > 0 ? `PKR ${r.manualFine.toFixed(0)}` : '-'}</td>
                  <td className="p-4 sm:p-5 text-right font-black text-slate-800 dark:text-white text-base align-middle">PKR {r.total.toFixed(0)}</td>
                </tr>
              ))}
              {reportStats.breakdown.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-slate-500 font-medium">No deductions recorded for this month.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1.2 * 1024 * 1024) {
        showNotice("Image size must be less than 1.2MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        // 1. Yeh screen par photo ka preview dikhaye ga
        setPhotoPreview(reader.result); 
        
        // 2. YEH LINE JAADU KAREGI: Yeh aapke form ke andar chupi hui photo input mein 
        // direct converted text daal degi taake submit hote waqt photo automatically chali jaye!
        const photoInput = document.querySelector('input[type="file"][accept="image/*"]');
        if (photoInput) {
          photoInput.setAttribute('data-base64', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
function SalaryTab({ teachers, attendance, fines, warnings, setWarnings, workspaceId, instituteName, showNotice }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [slipData, setSlipData] = useState(null);
  
  const [warningModalObj, setWarningModalObj] = useState(null);
  const [warningText, setWarningText] = useState("");

  const reportData = useMemo(() => {
    const [y, m] = month.split('-');
    const daysInMonth = new Date(y, m, 0).getDate();
    
    const monthAtt = attendance.filter(a => a?.date && a.date.startsWith(month));
    const monthFines = fines.filter(f => f?.date && f.date.startsWith(month));
    const monthWarnings = warnings.filter(w => w?.month === month);

    return teachers.map(t => {
      const tAtt = monthAtt.filter(a => a?.teacherId === t.id);
      const tFines = monthFines.filter(f => f?.teacherId === t.id);
      const tWarn = monthWarnings.find(w => w?.teacherId === t.id);
      
      let absentCount = 0;
      let leaveCount = 0;
      let halfDayCount = 0;
      let lateCount = 0;

 tAtt.forEach(r => {
        if(r.status === 'Absent') absentCount++;
        if(r.status === 'Leave') leaveCount++;
        if(r.status === 'Half Day') halfDayCount += 0.5;
        if(r.status === 'Late') lateCount++;
      });

      // 1. Total chuttian kitni haseel keen (Absent + Leave)
      const totalLeavesTaken = absentCount + leaveCount;
      
      // 2. YAHAN 1 CHUTTI ALLOWED KA LOGIC HAI:
      // Agar total chuttian 1 se zyada hain, toh 1 minus ho jayegi.
      // Yani pehli chutti free, doosri chutti se deduction shuru!
      const unpaidLeavesCount = Math.max(0, totalLeavesTaken - 1); 
      
      // 3. Total deduction days mein unpaid chuttian aur Half Day jama honge
      const totalDeductionDays = unpaidLeavesCount + halfDayCount;
      
      const base = Number(t.salary) || 0;
      const perDaySalary = base / daysInMonth;
      const leavesDeductionAmount = totalDeductionDays * perDaySalary;
      
      const lateDeductionAmount = lateCount * 100;
      const manualFineAmount = tFines.reduce((sum, f) => sum + Number(f.amount), 0);
      
      const totalDeduction = leavesDeductionAmount + lateDeductionAmount + manualFineAmount;
      const payable = Math.max(0, base - totalDeduction);

      return { 
        ...t, absentCount, leaveCount, totalLeavesTaken, unpaidLeavesCount, totalDeductionDays,
        lateCount, leavesDeductionAmount, lateDeductionAmount, manualFineAmount,
        tFines, totalDeduction, payable, base,
        warningRecord: tWarn 
      };
    });
  }, [teachers, attendance, fines, warnings, month]);

 const handleSaveWarning = async (e) => {
    e.preventDefault();
    
    const data = {
      teacherId: warningModalObj.id,
      month,
      message: warningText,
      workspaceId,
      updatedAt: new Date().toISOString()
    };

    try {
      if (warningModalObj.warningRecord?.id) {
        // --- UPDATE EXISTING WARNING RECORD IN FIREBASE ---
        const warnRef = doc(db, "warnings", warningModalObj.warningRecord.id);
        await updateDoc(warnRef, { message: warningText, updatedAt: data.updatedAt });
      } else {
        // --- CREATE NEW WARNING RECORD IN FIREBASE ---
        await addDoc(collection(db, "warnings"), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      showNotice('Warning message saved!');
      setWarningModalObj(null);
    } catch (error) {
      console.error("Error saving warning:", error);
      showNotice('Failed to save warning', 'error');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Payroll & Staff Salary</h2>
          <p className="text-sm text-slate-500 mt-1">Calculates Daily Wage Basis leave deductions after 1 allowed free leave.</p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full sm:w-auto px-5 py-3 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 shadow-sm" />
      </div>
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[950px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300">Staff Employee</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-center">Total Off Days</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-center">Warning</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-right">Total Penalty</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-right">Net Salary</th>
                <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {reportData.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 sm:p-5 align-middle">
                    <div className="flex items-center gap-3">
                      {r.photo ? (
                        <img src={r.photo} alt={r.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-sm border border-slate-200 dark:border-slate-700 shrink-0">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-base text-slate-900 dark:text-white block">{r.name}</span>
                        <span className="text-xs text-slate-500">Base: PKR {r.base.toLocaleString()}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-center font-medium align-middle">
                    <span className={r.totalLeavesTaken > 1 ? "text-red-600 dark:text-red-400 font-black text-base" : "text-slate-700 dark:text-slate-300 font-bold text-base"}>{r.totalLeavesTaken} Off</span><br/>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mt-0.5">(1 Free Allowed)</span>
                  </td>

                  <td className="p-4 sm:p-5 text-center align-middle">
                    {(r.totalLeavesTaken > 1) ? (
                      <button 
                        onClick={() => {
                          setWarningModalObj(r);
                          setWarningText(r.warningRecord?.message || "");
                        }}
                        className={`p-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 mx-auto ${r.warningRecord ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'}`}
                        title="Issue or View Warning"
                      >
                        <AlertTriangle size={16} /> 
                        <span className="text-xs font-bold uppercase tracking-wider">{r.warningRecord ? 'Warned' : 'Warning'}</span>
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  <td className="p-4 sm:p-5 text-right text-red-600 dark:text-red-400 font-black align-middle text-base">- PKR {r.totalDeduction.toFixed(0)}</td>
                  <td className="p-4 sm:p-5 text-right font-black text-emerald-600 dark:text-emerald-400 text-lg align-middle">PKR {r.payable.toFixed(0)}</td>
                  <td className="p-4 sm:p-5 text-center align-middle">
                    <button onClick={() => setSlipData({month, ...r})} className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold transition-colors shadow-sm border border-indigo-100 dark:border-indigo-800/50">View Slip</button>
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-slate-500 font-medium">No payroll data generated yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {warningModalObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-slate-900 dark:text-white animate-in zoom-in-95">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex gap-3 items-center bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                <AlertTriangle size={24} />
                <div>
                   <h3 className="font-bold text-lg leading-tight">Official Warning Notice</h3>
                   <p className="text-xs font-medium opacity-80">For {warningModalObj.name}</p>
                </div>
             </div>
             <form onSubmit={handleSaveWarning} className="p-6 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 text-amber-900 dark:text-amber-300 text-sm mb-4 font-medium">
                  This employee exceeded the 1-leave limit. Daily Wage salary rate has been deducted for <strong className="font-black">{warningModalObj.unpaidLeavesCount} days.</strong>
                </div>

                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Official Warning Message</label>
                   <textarea 
                     required
                     rows="4" 
                     value={warningText}
                     onChange={(e) => setWarningText(e.target.value)}
                     placeholder="Type official warning to the employee here..."
                     className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium resize-none"
                   />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 mt-2">
                  <button type="button" onClick={() => setWarningModalObj(null)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 sm:border-0">Cancel</button>
                  <button type="submit" className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-200 dark:shadow-none flex items-center justify-center gap-2">
                     <Send size={16}/> Save & Issue Warning
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {slipData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-900 animate-in zoom-in-95 max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none custom-scrollbar">
            <div className="print:hidden flex justify-between items-center p-5 border-b bg-slate-50">
              <h3 className="font-bold text-lg">Official Salary Slip</h3>
              <div className="flex gap-3">
                <button onClick={() => window.print()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 transition-colors hover:bg-indigo-700">
                  <Printer size={16}/> Print PDF
                </button>
                <button onClick={() => setSlipData(null)} className="p-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors text-slate-700"><X size={20}/></button>
              </div>
            </div>
            
            <div className="p-6 sm:p-10 bg-white">
              <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-slate-900">{instituteName}</h1>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-2 font-bold tracking-widest uppercase">Official Salary Statement</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between gap-6 text-sm mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                <div className="space-y-1.5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {slipData.photo ? (
                    <img src={slipData.photo} alt={slipData.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-md mx-auto sm:mx-0" />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-100 font-black text-indigo-700 text-3xl flex items-center justify-center border-4 border-white shadow-md mx-auto sm:mx-0">
                      {slipData.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-center sm:text-left mt-2 sm:mt-0">
                    <p className="font-black text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider mb-1">Employee Details</p>
                    <p className="font-black text-xl sm:text-2xl text-slate-900 leading-tight">{slipData.name}</p>
                    <p className="text-slate-600 font-semibold mt-1">Role: <span className="font-bold text-slate-900">{slipData.subject}</span></p>
                  </div>
                </div>
                <div className="text-center sm:text-right space-y-1.5 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-slate-200">
                  <p className="font-black text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider mb-2">Billing Period</p>
                  <p className="font-black text-lg text-slate-900">{new Date(slipData.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                  <p className="text-slate-500 font-semibold text-xs">Generated: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {slipData.warningRecord && (
                 <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-2xl flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                    <AlertTriangle size={28} className="text-red-600 shrink-0 mt-1" />
                    <div>
                       <p className="text-xs font-black text-red-600 uppercase tracking-wider mb-1">Official Warning Notice</p>
                       <p className="text-sm font-bold text-red-900 italic leading-relaxed">"{slipData.warningRecord.message}"</p>
                    </div>
                 </div>
              )}
              
              <div className="border border-slate-200 rounded-2xl text-sm mb-8 overflow-hidden shadow-sm">
                <div className="bg-slate-900 text-white p-4 px-6 font-black uppercase tracking-wider text-xs flex justify-between">
                  <span>Earnings & Deductions</span>
                  <span>Amount (PKR)</span>
                </div>
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="flex justify-between items-center p-2">
                    <span className="font-bold text-slate-700 text-base sm:text-lg">Basic Monthly Salary</span> 
                    <span className="font-black text-xl">{slipData.base.toLocaleString()}</span>
                  </div>
                  
                  {slipData.leavesDeductionAmount > 0 && (
                    <div className="flex justify-between items-center text-red-600 bg-red-50/80 p-4 sm:p-5 rounded-xl border border-red-100">
                      <div>
                        <span className="font-black block text-sm sm:text-base">Leaves/Absents Deduction (Daily Wage)</span>
                        <span className="text-[11px] sm:text-xs font-bold opacity-80 mt-1 block">
                          Total {slipData.totalLeavesTaken} taken. 1 allowed free. Deducting for {slipData.totalDeductionDays} days.
                        </span>
                      </div>
                      <span className="font-black text-lg">- {slipData.leavesDeductionAmount.toFixed(0)}</span>
                    </div>
                  )}

                  {slipData.lateDeductionAmount > 0 && (
                    <div className="flex justify-between items-center text-amber-700 bg-amber-50/80 p-4 sm:p-5 rounded-xl border border-amber-100">
                      <div>
                        <span className="font-black block text-sm sm:text-base">Late Arrival Penalty</span>
                        <span className="text-[11px] sm:text-xs font-bold opacity-80 mt-1 block">
                          Deduction for {slipData.lateCount} Late Day(s)
                        </span>
                      </div>
                      <span className="font-black text-lg">- {slipData.lateDeductionAmount.toFixed(0)}</span>
                    </div>
                  )}

                  {slipData.tFines && slipData.tFines.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {slipData.tFines.map(f => (
                        <div key={f.id} className="flex justify-between items-center text-purple-700 bg-purple-50/80 p-4 sm:p-5 rounded-xl border border-purple-100">
                          <div>
                            <span className="font-black block text-sm sm:text-base">Manual Fine / Penalty</span>
                            <span className="text-[11px] sm:text-xs font-bold opacity-80 mt-1 block italic">
                              "{f.reason}" ({new Date(f.date).toLocaleDateString()})
                            </span>
                          </div>
                          <span className="font-black text-lg">- {Number(f.amount).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="bg-emerald-50 border-t-2 border-emerald-200 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
                  <span className="text-emerald-900 font-black uppercase tracking-wider text-sm sm:text-base">Net Payable Salary</span> 
                  <span className="text-emerald-600 font-black text-4xl sm:text-5xl">PKR {slipData.payable.toFixed(0)}</span>
                </div>
              </div>

              <div className="mt-20 sm:mt-32 flex flex-col sm:flex-row justify-between gap-16 sm:gap-4 px-4 sm:px-10 text-xs text-slate-400 uppercase font-bold tracking-wider">
                <div className="text-center w-full sm:w-auto">
                  <div className="w-48 border-t-2 border-slate-300 mb-3 mx-auto"></div>
                  Authorized Signature
                </div>
                <div className="text-center w-full sm:w-auto">
                  <div className="w-48 border-t-2 border-slate-300 mb-3 mx-auto"></div>
                  Employee Signature
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StarOfTheYearTab({ teachers, attendance, instituteName }) {
  const currentYearNum = new Date().getFullYear();
  const [year, setYear] = useState(currentYearNum.toString());

  const yearsOptions = useMemo(() => {
    const startYear = 2024;
    const endYear = currentYearNum + 5; 
    const years = [];
    for (let y = endYear; y >= startYear; y--) {
      years.push(y.toString());
    }
    return years;
  }, [currentYearNum]);

  const starTeachers = useMemo(() => {
    return teachers.map(t => {
      const tAttYear = attendance.filter(a => a?.teacherId === t.id && a?.date && a.date.startsWith(year));
      let presentCount = 0, absentCount = 0, leaveCount = 0, halfDayCount = 0, lateCount = 0;
      tAttYear.forEach(r => {
        if (r.status === 'Present') presentCount++;
        if (r.status === 'Absent') absentCount++;
        if (r.status === 'Leave') leaveCount++;
        if (r.status === 'Half Day') halfDayCount += 0.5;
        if (r.status === 'Late') lateCount++;
      });
      const totalOff = absentCount + leaveCount + halfDayCount;
      const isStar = (totalOff === 0 && lateCount === 0 && presentCount > 0);
      return { ...t, presentCount, totalOff, lateCount, isStar };
    }).filter(t => t.isStar).sort((a, b) => b.presentCount - a.presentCount);
  }, [teachers, attendance, year]);

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-amber-500 to-orange-500 p-8 sm:p-10 rounded-3xl shadow-xl border border-amber-400 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 flex items-center gap-4">
            <Award size={40} className="text-yellow-200" /> Star of the Year
          </h2>
          <p className="text-amber-100 text-sm sm:text-lg font-medium max-w-xl">
            Recognizing excellence! The hall of fame for staff members with zero absences and zero lates in the entire year.
          </p>
        </div>
        <Star size={180} className="absolute -right-10 -bottom-10 text-yellow-300 opacity-20 transform rotate-12" />
        <Star size={100} className="absolute right-40 top-4 text-yellow-300 opacity-20 transform -rotate-12" />
        <div className="relative z-10 w-full md:w-auto">
          <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full md:w-auto px-6 py-4 bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-xl font-bold text-lg outline-none cursor-pointer appearance-none transition-colors shadow-sm">
            {yearsOptions.map(y => <option key={y} value={y} className="text-slate-900">{y} Year</option>)}
          </select>
        </div>
      </div>

      {starTeachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {starTeachers.map((t) => (
            <div key={t.id} className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl shadow-amber-500/5 border-2 border-amber-200 dark:border-amber-900/50 relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
              <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-400 to-orange-500 text-white p-5 rounded-bl-3xl shadow-md"><Award size={32} /></div>
              
              <div className="mb-8 flex justify-center">
                {t.photo ? (
                  <img src={t.photo} alt={t.name} className="w-28 h-28 rounded-full object-cover border-4 border-amber-400 shadow-xl group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-28 h-28 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center shadow-inner border-2 border-amber-300 dark:border-amber-800 group-hover:scale-110 transition-transform duration-500">
                    <span className="text-5xl font-black text-amber-600 dark:text-amber-400">
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <h3 className="text-3xl font-black text-slate-900 dark:text-white text-center mb-2 leading-tight">{t.name}</h3>
              <p className="text-slate-500 font-bold text-center mb-8 text-sm uppercase tracking-wider">{t.subject} Department</p>
              
              <div className="space-y-3 bg-amber-50/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-amber-100 dark:border-slate-800">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Presents Recorded</span><span className="text-sm font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg">{t.presentCount} Days</span></div>
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Absents / Leaves</span><span className="text-sm font-black text-slate-700 dark:text-slate-300">0</span></div>
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Late Arrivals</span><span className="text-sm font-black text-slate-700 dark:text-slate-300">0</span></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 shadow-sm border border-slate-200 dark:border-slate-800 text-center mt-8">
          <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-slate-100 dark:border-slate-700"><Star size={60} className="text-slate-300 dark:text-slate-600" /></div>
          <h3 className="text-3xl font-black text-slate-700 dark:text-slate-300 mb-3">No Stars Found Yet for {year}</h3>
          <p className="text-slate-500 max-w-lg mx-auto font-medium text-lg leading-relaxed">No employee has met the strict 100% attendance criteria for this academic year yet. Keep motivating your staff!</p>
        </div>
      )}
    </div>
  );
}