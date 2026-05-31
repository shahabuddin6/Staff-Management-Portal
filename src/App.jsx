import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar as CalendarIcon, DollarSign, Settings, 
  Menu, X, Plus, Edit2, Trash2, CheckCircle, XCircle, 
  AlertCircle, Clock, FileText, Printer, LogOut, Moon, Sun, Search,
  Lock, Mail, User, Phone, Check, ArrowLeft
} from 'lucide-react';

// Import the configured Firebase instances you created in src/firebase.js
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

// Helper to get current date in YYYY-MM-DD
const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// --- CUSTOM HOOK FOR LOCAL STORAGE (Kept only for theme preference) ---
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
}

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useLocalStorage('tms_theme', 'light');

  // Listen to the global authentication state from Firebase (Syncs Mobile A & Mobile B instantly)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Pull the administrator's profile name from Firestore
          const docRef = doc(db, "admins", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setCurrentUser({ uid: user.uid, ...docSnap.data() });
          } else {
            setCurrentUser({ uid: user.uid, email: user.email, name: "School Admin" });
          }
        } catch (err) {
          console.error("Error fetching admin profile:", err);
          setCurrentUser({ uid: user.uid, email: user.email, name: "School Admin" });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
        <div className="text-center space-y-2">
          <Clock className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm font-medium">Connecting to Cloud Server...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthContainer 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
    );
  }

  return (
    <MainDashboard 
      onLogout={() => signOut(auth)} 
      currentUser={currentUser}
      theme={theme} 
      toggleTheme={toggleTheme} 
    />
  );
}

// --- AUTH CONTAINER STATE MACHINE ---
function AuthContainer({ theme, toggleTheme }) {
  const [authView, setAuthView] = useState('signin'); // 'signin', 'signup', 'forgot'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200 px-4 relative">
      <div className="absolute top-4 right-4">
        <button onClick={toggleTheme} className="p-2.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-all hover:scale-105">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 transition-all">
        {authView === 'signin' && (
          <SignInForm 
            setAuthView={setAuthView} 
          />
        )}
        {authView === 'signup' && (
          <SignUpForm 
            setAuthView={setAuthView} 
          />
        )}
        {authView === 'forgot' && (
          <ForgotPasswordForm 
            setAuthView={setAuthView} 
          />
        )}
      </div>
    </div>
  );
}

// --- 1. SIGN IN FORM ---
function SignInForm({ setAuthView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Direct Firebase Cloud verification
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password configuration.');
      } else {
        setError(err.message.replace("Firebase:", ""));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 mb-4 text-blue-600 dark:text-blue-400">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">EduManage Portal Access</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl text-sm border border-rose-200 dark:border-rose-800/50 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="email" 
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@school.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="password" 
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex items-center justify-end text-sm">
          <button 
            type="button" 
            onClick={() => setAuthView('forgot')}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Forgot Password?
          </button>
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25">
          Sign In
        </button>
      </form>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <button onClick={() => setAuthView('signup')} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}

// --- 2. SIGN UP FORM ---
function SignUpForm({ setAuthView }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      // 1. Create credential user globally inside Firebase Auth backend
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Set structural administrative dynamic metadata profiles inside Cloud Firestore
      await setDoc(doc(db, "admins", user.uid), {
        name: name,
        email: email.toLowerCase(),
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => {
        setAuthView('signin');
      }, 2000);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else {
        setError(err.message.replace("Firebase:", ""));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">Register as a school administrator</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl text-sm border border-rose-200 dark:border-rose-800/50 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm border border-emerald-200 dark:border-emerald-800/50 flex items-center space-x-2">
          <Check size={16} />
          <span>Account created successfully! Redirecting to Sign In...</span>
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Professor Ali"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="email" 
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ali@school.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Confirm</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/10">
          Register Administrator
        </button>
      </form>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 text-center">
        <button onClick={() => setAuthView('signin')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm flex items-center justify-center space-x-1 mx-auto font-medium">
          <ArrowLeft size={16} /> <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
}

// --- 3. FORGOT PASSWORD FORM (Uses Simulation) ---
function ForgotPasswordForm({ setAuthView }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const simulatedOTP = "123456";

  const handleSendOTP = (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage(`A security simulation reset OTP has been triggered. Please use simulated OTP: ${simulatedOTP}`);
    setStep(2);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setError('');
    if (otp !== simulatedOTP) {
      setError('Incorrect OTP. Try entering 123456');
      return;
    }
    setInfoMessage('');
    setStep(3);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    setInfoMessage('Password updated successfully via application simulation!');
    setTimeout(() => {
      setAuthView('signin');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recover Password</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">Step {step} of 3</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl text-sm border border-rose-200 dark:border-rose-800/50 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm border border-blue-200 dark:border-blue-800/50">
          {infoMessage}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Register Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.com"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all">
            Send Recovery Code
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Enter 6-Digit OTP</label>
            <input 
              type="text" 
              required
              maxLength="6"
              className="w-full text-center tracking-widest text-xl font-bold py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all">
            Verify Code
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">New Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Confirm New Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all">
            Update Password
          </button>
        </form>
      )}

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 text-center">
        <button onClick={() => setAuthView('signin')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm flex items-center justify-center space-x-1 mx-auto font-medium">
          <ArrowLeft size={16} /> <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
}

// --- MAIN DASHBOARD LAYOUT ---
function MainDashboard({ onLogout, currentUser, theme, toggleTheme }) {
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hook up real-time server streams. Updates made on Mobile A show up instantly on Mobile B!
  useEffect(() => {
    // 1. Listen for real-time changes to the teachers collection
    const unsubscribeTeachers = onSnapshot(collection(db, "teachers"), (snapshot) => {
      const teachersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeachers(teachersList);
    }, (error) => console.error("Teachers sync error:", error));

    // 2. Listen for real-time changes to the attendance collection
    const unsubscribeAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
      const attendanceList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAttendance(attendanceList);
    }, (error) => console.error("Attendance sync error:", error));

    return () => {
      unsubscribeTeachers();
      unsubscribeAttendance();
    };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: CalendarIcon },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CheckCircle },
    { id: 'salary', label: 'Salary & Payroll', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 print:hidden">
        <div className="p-6 flex items-center space-x-3 border-b border-gray-100 dark:border-gray-700">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold block leading-none">EduManage</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">School Admin Portal</span>
          </div>
        </div>
        
        {/* User Info */}
        <div className="p-4 mx-4 my-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Signed In As</p>
          <p className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-0.5 truncate">{currentUser?.name || "School Administrator"}</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/60'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button onClick={toggleTheme} className="w-full flex items-center space-x-3 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-50 print:hidden">
        <span className="text-xl font-bold">EduManage</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40 print:hidden shadow-lg">
          <nav className="p-4 space-y-2">
            <div className="px-4 py-2 border-b dark:border-gray-700 mb-2">
              <span className="text-xs text-gray-400">User Profile</span>
              <p className="font-bold text-gray-850 dark:text-white">{currentUser?.name || "School Administrator"}</p>
            </div>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                  activeTab === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
            <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-red-600">
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-0 print:m-0 print:p-0">
        <div className="max-w-6xl mx-auto print:max-w-none">
          {activeTab === 'dashboard' && <DashboardView teachers={teachers} attendance={attendance} />}
          {activeTab === 'teachers' && <TeachersView teachers={teachers} />}
          {activeTab === 'attendance' && <AttendanceView teachers={teachers} attendance={attendance} />}
          {activeTab === 'salary' && <SalaryView teachers={teachers} attendance={attendance} />}
        </div>
      </main>
    </div>
  );
}

// --- DASHBOARD SUB-VIEW ---
function DashboardView({ teachers, attendance }) {
  const today = getTodayString();
  const activeTeachers = teachers.filter(t => t.status === 'Active');
  
  const todaysAttendance = attendance.filter(a => a.date === today);
  const presentCount = todaysAttendance.filter(a => a.status === 'Present').length;
  const absentCount = todaysAttendance.filter(a => a.status === 'Absent' || a.status === 'Leave').length;
  const unmarkedCount = activeTeachers.length - todaysAttendance.length;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const notifications = useMemo(() => {
    const alerts = [];
    activeTeachers.forEach(teacher => {
      const leavesThisMonth = attendance.filter(a => 
        a.teacherId === teacher.id && 
        a.date.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`) &&
        (a.status === 'Leave' || a.status === 'Absent' || a.status === 'Half Day')
      );
      
      let leaveScore = 0;
      leavesThisMonth.forEach(l => {
        if (l.status === 'Half Day') leaveScore += 0.5;
        else leaveScore += 1;
      });

      if (leaveScore > 2) {
        alerts.push(`${teacher.name} has exceeded paid leaves (${leaveScore} taken). Salary deductions will apply.`);
      }
    });
    return alerts;
  }, [attendance, activeTeachers, currentMonth, currentYear]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Teachers" value={activeTeachers.length} icon={Users} color="bg-blue-500" />
        <StatCard title="Present Today" value={presentCount} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard title="Absent/Leave" value={absentCount} icon={XCircle} color="bg-rose-500" />
        <StatCard title="Pending Marking" value={unmarkedCount} icon={Clock} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center space-x-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full dark:bg-indigo-900/50 dark:text-indigo-400">
                  <ScanLine size={24} />
                </div>
                <div>
                  <h3 className="font-medium">Biometric Sync</h3>
                  <p className="text-xs text-gray-500">Ready for integration</p>
                </div>
             </div>
             <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center space-x-4">
                <div className="p-3 bg-teal-100 text-teal-600 rounded-full dark:bg-teal-900/50 dark:text-teal-400">
                  <QrCode size={24} />
                </div>
                <div>
                  <h3 className="font-medium">QR Scanner</h3>
                  <p className="text-xs text-gray-500">Ready for integration</p>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center"><AlertCircle className="w-5 h-5 mr-2 text-amber-500"/> System Alerts</h2>
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((note, idx) => (
                <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm rounded-lg border border-amber-200 dark:border-amber-800/50">
                  {note}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No active alerts at this time.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center space-x-4">
      <div className={`${color} text-white p-3 rounded-lg`}>
        <Icon size={24} />
      </div>
      <div>
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

// Custom simple SVGs
function ScanLine(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>;
}
function QrCode(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>;
}

// --- TEACHERS VIEW (Uses Cloud Firestore Writes) ---
function TeachersView({ teachers }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', subject: '', monthlySalary: '', joiningDate: '', status: 'Active'
  });

  const filteredTeachers = teachers.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (teacher = null) => {
    if (teacher) {
      setFormData(teacher);
      setEditingId(teacher.id);
    } else {
      setFormData({ name: '', phone: '', email: '', subject: '', monthlySalary: '', joiningDate: '', status: 'Active' });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const teacherId = editingId || Date.now().toString();
      // Write the data payload directly to Cloud Firestore collection "teachers"
      await setDoc(doc(db, "teachers", teacherId), {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        subject: formData.subject,
        monthlySalary: Number(formData.monthlySalary),
        joiningDate: formData.joiningDate,
        status: formData.status
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving teacher profile to Firestore:", err);
      alert("Failed to save teacher to cloud storage. Please check permissions.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to remove this teacher globally from the cloud?')) {
      try {
        await deleteDoc(doc(db, "teachers", id));
      } catch (err) {
        console.error("Deletion error:", err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Manage Staff</h1>
        <div className="flex w-full sm:w-auto space-x-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search teachers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={() => openModal()} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
            <Plus size={18} /> <span>Add Teacher</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 font-semibold text-sm">Name</th>
                <th className="px-6 py-4 font-semibold text-sm">Subject</th>
                <th className="px-6 py-4 font-semibold text-sm">Contact</th>
                <th className="px-6 py-4 font-semibold text-sm">Salary (PKR)</th>
                <th className="px-6 py-4 font-semibold text-sm">Status</th>
                <th className="px-6 py-4 font-semibold text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTeachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{teacher.name}</div>
                    <div className="text-xs text-gray-500">Joined: {teacher.joiningDate}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {teacher.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>{teacher.phone}</div>
                    <div className="text-xs">{teacher.email}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">Rs. {Number(teacher.monthlySalary).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      teacher.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {teacher.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openModal(teacher)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(teacher.id)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No teachers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Teacher' : 'Add New Teacher'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input required type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <input required type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Salary (PKR)</label>
                  <input required type="number" min="0" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.monthlySalary} onChange={e => setFormData({...formData, monthlySalary: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Joining Date</label>
                  <input required type="date" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Teacher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- ATTENDANCE VIEW (Uses Cloud Firestore Writes) ---
function AttendanceView({ teachers, attendance }) {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const activeTeachers = teachers.filter(t => t.status === 'Active');

  const handleStatusChange = async (teacherId, status) => {
    try {
      // Create a unique composite reference key based on teacher ID and date
      const recordId = `${teacherId}_${selectedDate}`;
      await setDoc(doc(db, "attendance", recordId), {
        teacherId,
        date: selectedDate,
        status
      });
    } catch (err) {
      console.error("Firestore writing error during attendance marking:", err);
    }
  };

  const getStatus = (teacherId) => {
    const record = attendance.find(a => a.teacherId === teacherId && a.date === selectedDate);
    return record ? record.status : '';
  };

  const markAll = async (status) => {
    try {
      // Loop through all active records and update Firestore
      const promises = activeTeachers.map(teacher => {
        const recordId = `${teacher.id}_${selectedDate}`;
        return setDoc(doc(db, "attendance", recordId), {
          teacherId: teacher.id,
          date: selectedDate,
          status
        });
      });
      await Promise.all(promises);
    } catch (err) {
      console.error("Batch update error:", err);
    }
  };

  const statuses = [
    { value: 'Present', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50' },
    { value: 'Absent', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50' },
    { value: 'Late', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50' },
    { value: 'Half Day', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50' },
    { value: 'Leave', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold">Daily Attendance</h1>
          <p className="text-sm text-gray-500">Select date and mark staff status</p>
        </div>
        <div className="flex items-center space-x-4">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <h2 className="font-semibold">Staff List ({activeTeachers.length})</h2>
          <div className="space-x-2 text-sm">
            <span className="text-gray-500">Quick Mark All:</span>
            <button onClick={() => markAll('Present')} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-md hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 transition-colors">Present</button>
            <button onClick={() => markAll('Absent')} className="px-3 py-1 bg-rose-100 text-rose-800 rounded-md hover:bg-rose-200 dark:bg-rose-900/50 dark:text-rose-300 transition-colors">Absent</button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {activeTeachers.map(teacher => {
            const currentStatus = getStatus(teacher.id);
            return (
              <div key={teacher.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
                    {teacher.name ? teacher.name.charAt(0) : 'T'}
                  </div>
                  <div>
                    <div className="font-medium">{teacher.name}</div>
                    <div className="text-xs text-gray-500">{teacher.subject}</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {statuses.map(s => (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(teacher.id, s.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        currentStatus === s.value 
                          ? `${s.color} ring-2 ring-offset-1 ring-opacity-50 ring-blue-500 dark:ring-offset-gray-800` 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                      }`}
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {activeTeachers.length === 0 && (
            <div className="p-8 text-center text-gray-500">No active teachers found. Add teachers first.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- SALARY & PAYROLL VIEW ---
function SalaryView({ teachers, attendance }) {
  const currentYear = new Date().getFullYear(); 

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [slipData, setSlipData] = useState(null); 

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const calculatePayroll = () => {
    const activeTeachers = teachers.filter(t => t.status === 'Active');
    const daysInMonth = new Date(year, month, 0).getDate();
    
    return activeTeachers.map(teacher => {
      const recordsThisMonth = attendance.filter(a => 
        a.teacherId === teacher.id && 
        a.date?.startsWith(`${year}-${String(month).padStart(2, '0')}`)
      );

      let leaveScore = 0; 
      let presentDays = 0;

      recordsThisMonth.forEach(record => {
        if (record.status === 'Leave' || record.status === 'Absent') leaveScore += 1;
        else if (record.status === 'Half Day') leaveScore += 0.5;
        else if (record.status === 'Present' || record.status === 'Late') presentDays += 1; 
      });

      const paidLeavesAllowed = 2;
      const paidLeavesUsed = Math.min(leaveScore, paidLeavesAllowed);
      const extraUnpaidLeaves = Math.max(leaveScore - paidLeavesAllowed, 0);

      const baseSalary = Number(teacher.monthlySalary) || 0;
      const perDaySalary = baseSalary / daysInMonth;
      const deductionAmount = extraUnpaidLeaves * perDaySalary;
      const finalSalary = baseSalary - deductionAmount;

      return {
        ...teacher,
        daysInMonth,
        presentDays,
        totalLeavesTaken: leaveScore,
        paidLeavesUsed,
        extraUnpaidLeaves,
        perDaySalary,
        deductionAmount,
        finalSalary
      };
    });
  };

  const payrollData = calculatePayroll();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Payroll & Salary</h1>
          <p className="text-sm text-gray-500">Auto-calculation based on leave policy (2 paid leaves/month)</p>
        </div>
        <div className="flex space-x-3 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium dark:text-white"
          >
            {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium dark:text-white border-l border-gray-300 dark:border-gray-600 pl-3"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-4 font-semibold">Teacher</th>
                <th className="px-4 py-4 font-semibold text-right">Base Salary</th>
                <th className="px-4 py-4 font-semibold text-center font-medium bg-gray-50/10">Leaves Taken</th>
                <th className="px-4 py-4 font-semibold text-center text-emerald-600">Paid Lvs Used</th>
                <th className="px-4 py-4 font-semibold text-center text-rose-600">Unpaid Lvs</th>
                <th className="px-4 py-4 font-semibold text-right text-rose-600">Deduction</th>
                <th className="px-4 py-4 font-semibold text-right text-blue-600 font-bold">Net Payable</th>
                <th className="px-4 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {payrollData.map((data, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4 font-medium">{data.name}</td>
                  <td className="px-4 py-4 text-right">Rs. {Number(data.monthlySalary).toLocaleString()}</td>
                  <td className="px-4 py-4 text-center font-medium bg-gray-50/50 dark:bg-gray-800/50">{data.totalLeavesTaken}</td>
                  <td className="px-4 py-4 text-center text-emerald-600">{data.paidLeavesUsed}</td>
                  <td className="px-4 py-4 text-center text-rose-600 font-medium">{data.extraUnpaidLeaves > 0 ? data.extraUnpaidLeaves : '-'}</td>
                  <td className="px-4 py-4 text-right text-rose-600">{data.deductionAmount > 0 ? `-Rs. ${Math.round(data.deductionAmount).toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-4 text-right font-bold text-blue-600 dark:text-blue-400 text-lg">Rs. {Math.round(data.finalSalary).toLocaleString()}</td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => setSlipData(data)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                    >
                      <FileText size={14} /> <span>Slip</span>
                    </button>
                  </td>
                </tr>
              ))}
              {payrollData.length === 0 && (
                <tr><td colSpan="8" className="p-8 text-center text-gray-500">No active teachers to generate payroll for.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {slipData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:block print:relative print:z-auto">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:w-full print:max-w-none print:dark:bg-white print:text-black">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 print:hidden">
              <h2 className="font-bold text-lg">Salary Slip Preview</h2>
              <div className="flex space-x-3">
                <button onClick={() => window.print()} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  <Printer size={18} /> <span>Print PDF</span>
                </button>
                <button onClick={() => setSlipData(null)} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-8 print:p-10 text-gray-900 print:text-black">
              <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
                <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900 print:text-black dark:text-white">EduManage Institute</h1>
                <p className="text-gray-500 dark:text-gray-400 print:text-gray-600 mt-1">123 Education Lane, City Center</p>
                <h2 className="text-xl font-semibold mt-4 text-blue-600 dark:text-blue-400 print:text-black bg-blue-50 dark:bg-blue-900/20 print:bg-gray-100 inline-block px-6 py-2 rounded-full font-bold">
                  Salary Slip - {months[month-1]} {year}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 dark:bg-gray-700/30 print:bg-transparent p-4 rounded-lg border border-gray-200 dark:border-gray-600 print:border-none">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 mb-1">Employee Name</p>
                  <p className="font-bold text-lg dark:text-white print:text-black">{slipData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 mb-1">Designation/Subject</p>
                  <p className="font-semibold dark:text-white print:text-black">{slipData.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 mb-1">Employee ID</p>
                  <p className="font-semibold dark:text-white print:text-black">EMP-{slipData.id?.slice(-4)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 mb-1">Joining Date</p>
                  <p className="font-semibold dark:text-white print:text-black">{slipData.joiningDate}</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-bold border-b border-gray-200 dark:border-gray-700 print:border-gray-300 pb-2 mb-4 dark:text-white print:text-black">Attendance Summary</h3>
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 print:bg-gray-50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-600">Total Days</p>
                    <p className="font-bold text-xl dark:text-white print:text-black">{slipData.daysInMonth}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-600">Leaves Taken</p>
                    <p className="font-bold text-xl dark:text-white print:text-black">{slipData.totalLeavesTaken}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-emerald-600 print:text-black">Paid Leaves</p>
                    <p className="font-bold text-xl text-emerald-600 print:text-black">{slipData.paidLeavesUsed} <span className="text-xs font-normal">(of 2)</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-rose-600 print:text-black">Unpaid Leaves</p>
                    <p className="font-bold text-xl text-rose-600 print:text-black">{slipData.extraUnpaidLeaves}</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                 <h3 className="font-bold border-b border-gray-200 dark:border-gray-700 print:border-gray-300 pb-2 mb-4 dark:text-white print:text-black">Earnings & Deductions</h3>
                 <table className="w-full text-left">
                   <tbody>
                     <tr className="border-b border-gray-100 dark:border-gray-700 print:border-gray-200">
                       <td className="py-3 dark:text-white print:text-black">Basic Salary</td>
                       <td className="py-3 text-right font-medium dark:text-white print:text-black">PKR {Number(slipData.monthlySalary).toLocaleString()}</td>
                     </tr>
                     {slipData.extraUnpaidLeaves > 0 && (
                       <tr className="border-b border-gray-100 dark:border-gray-700 print:border-gray-200 text-rose-600 print:text-black">
                         <td className="py-3">
                           Leave Deductions <br/>
                           <span className="text-xs text-gray-500 print:text-gray-600">({slipData.extraUnpaidLeaves} days @ PKR {Math.round(slipData.perDaySalary).toLocaleString()}/day)</span>
                         </td>
                         <td className="py-3 text-right font-medium">- PKR {Math.round(slipData.deductionAmount).toLocaleString()}</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>

              <div className="bg-gray-900 text-white print:bg-gray-100 print:text-black p-4 rounded-lg flex justify-between items-center mb-12">
                <span className="font-bold text-lg">Net Payable Amount</span>
                <span className="font-bold text-2xl">PKR {Math.round(slipData.finalSalary).toLocaleString()}</span>
              </div>

              <div className="flex justify-between mt-16 pt-8 border-t border-gray-200 print:border-gray-300">
                <div className="text-center w-40">
                  <div className="border-b border-gray-400 print:border-gray-600 mb-2 h-8"></div>
                  <p className="text-sm font-medium dark:text-gray-300 print:text-gray-600">Employee Signature</p>
                </div>
                <div className="text-center w-40">
                  <div className="border-b border-gray-400 print:border-gray-600 mb-2 h-8"></div>
                  <p className="text-sm font-medium dark:text-gray-300 print:text-gray-600">Director/Admin</p>
                </div>
              </div>

              <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t">
                Generated automatically by EduManage Payroll System on {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}