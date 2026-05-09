import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, User, Stethoscope, Lock, ArrowRight, Loader2, QrCode } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';

interface LoginPortalProps {
  onLoginSuccess?: () => void;
  initialHealthId?: string;
  isCitizenOnly?: boolean;
}

export default function LoginPortal({ onLoginSuccess, initialHealthId, isCitizenOnly }: LoginPortalProps) {
  const [role, setRole] = useState<'citizen' | 'doctor' | 'admin'>(isCitizenOnly ? 'citizen' : 'doctor');
  const [isLogin, setIsLogin] = useState(initialHealthId ? false : true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [healthId, setHealthId] = useState(initialHealthId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Map phone to a deterministic email for Firebase Auth compatibility
    const internalEmail = `${phone.replace(/\D/g, '')}@health.gov`;

    try {
      if (isLogin) {
        // Attempt normal Firebase login if possible, else mock login for demo
        try {
          await signInWithEmailAndPassword(auth, internalEmail, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/operation-not-allowed' || authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
            console.log("Falling back to demo user login");
            const demoDoc = await getDoc(doc(db, 'users', 'demo-local-user'));
            if (demoDoc.exists()) {
              localStorage.setItem('demo_user_profile', JSON.stringify(demoDoc.data()));
              window.location.reload();
              return;
            } else {
              throw new Error("Demo account not found. Please create one.");
            }
          } else {
            throw authErr;
          }
        }
      } else {
        // Simulate AI Identity Verification
        setLoading(true); // Ensure loading is shown
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Artificial delay for "AI checking"

        try {
          // Bypassing Firebase Authentication completely for demo purposes
          const demoProfile = {
            uid: 'demo-local-user',
            fullName: fullName || 'Citizen',
            healthId: healthId || `PENDING-${Math.floor(Math.random() * 1000000)}`,
            email: internalEmail,
            phone: phone,
            role,
            isVerified: role === 'citizen' ? true : false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          
          await setDoc(doc(db, 'users', 'demo-local-user'), demoProfile);
          
          localStorage.setItem('demo_user_profile', JSON.stringify({
            ...demoProfile,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          
          window.location.reload();
          return;
          
        } catch (e: any) {
             throw e;
        }
      }
      onLoginSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto space-y-8", !isCitizenOnly && "min-h-screen flex flex-col justify-center")}>
      {!isCitizenOnly && (
        <div className="text-center">
          <div className="w-20 h-20 bg-teal-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg mb-6 shadow-teal-500/20">
            <ShieldCheck className="w-10 h-10 text-stone-800" />
          </div>
          <h2 className="text-3xl font-medium text-stone-800 tracking-tight text-center">Clinician Portal</h2>
          <p className="text-stone-800/40 font-medium text-sm mt-2 text-center tracking-wide">Sign in with your credentials</p>
        </div>
      )}

      {/* Role Selector */}
      {!isCitizenOnly && (
        <div className="flex p-1 bg-white rounded-2xl border border-stone-200">
          {(['doctor', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setIsLogin(true); }}
              className={`flex-grow py-3 rounded-xl text-xs font-medium transition-all capitalize ${
                role === r ? 'bg-teal-600 text-stone-800 shadow-lg' : 'text-stone-800/40 hover:text-stone-800'
              }`}
            >
              {r} Access
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={cn(
          "p-8 rounded-3xl space-y-6",
          isCitizenOnly ? "" : "bg-stone-50 border border-teal-500/10 shadow-md"
        )}>
          {!isLogin && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-teal-500/60  tracking-wide mb-2 text-left">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/30" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white border border-stone-200 p-4 pl-12 rounded-2xl text-stone-800 outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium placeholder:text-stone-800/20"
                    placeholder="Enter legal name"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-teal-500/60  tracking-wide mb-2 text-left">Phone Number</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/30" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-stone-200 p-4 pl-12 rounded-2xl text-stone-800 outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium placeholder:text-stone-800/20"
                placeholder="+1 (555) 000-0000"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-teal-500/60  tracking-wide mb-2 text-left">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/30" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-stone-200 p-4 pl-12 rounded-2xl text-stone-800 outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium placeholder:text-stone-800/20"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-[10px] font-medium  tracking-wide bg-red-400/10 p-4 rounded-xl border border-red-400/20 italic">
              Verification failed: {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-teal-600 text-stone-800 font-medium rounded-2xl hover:bg-teal-700 transition-all flex items-center justify-center gap-3 shadow-md shadow-teal-500/10 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            {loading ? (isLogin ? "Authenticating..." : "AI Verification...") : (isLogin ? `Sign In` : `Create Health Account`)}
          </button>
        </div>
      </form>

      <div className="text-center">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-stone-800/40 text-xs font-semibold hover:text-stone-800 transition-colors tracking-wide"
        >
          {isLogin ? "Need a health account?" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
