import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, QrCode, ShieldCheck, ArrowRight, User, Loader2, Hospital, History, MapPin, Search, FileText, Lock, Leaf, Activity } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { extractIdFromPhoto } from '../lib/gemini';
import { cn } from '../lib/utils';
import Dashboard from './Dashboard';
import DoctorPortal from './doctor/DoctorPortal';
import AdminPortal from './admin/AdminPortal';
import CameraCapture from './clinical/CameraCapture';
import LoginPortal from './auth/LoginPortal';

type AuthStep = 'welcome' | 'auth' | 'method' | 'scanning' | 'processing' | 'manual' | 'sync';

export default function HealthPortal() {
  const { user, profile, loading, logout } = useAuth();
  const [authStep, setAuthStep] = useState<AuthStep>('welcome');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [pendingIdentity, setPendingIdentity] = useState<{ healthId: string; fullName: string } | null>(null);

  // Logic to determine if we need to show ID verification
  const needsVerification = user && (!profile || !profile.healthId || profile.healthId.startsWith('PENDING-'));

  const handleAIPhotoData = async (base64: string, mimeType: string = "image/jpeg") => {
    try {
      setIsProcessing(true);
      setAuthStep('processing');
      const data = await extractIdFromPhoto(base64, mimeType);
      setPendingIdentity(data);
      setAuthStep('sync');
    } catch (err: any) {
      setError(err.message || "AI failed to read identity. Please ensure a clear Health Card or QR is visible.");
      setAuthStep('method');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = file.type;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(mimeType)) {
      setError("Unsupported file format. Please upload an image (JPG, PNG) or PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      handleAIPhotoData(base64, mimeType);
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.length < 5) return;
    setPendingIdentity({ healthId: manualId, fullName: profile?.fullName || 'Citizen' }); 
    setAuthStep('sync');
  };

  const handleIdentityLink = async () => {
    if (!user || !pendingIdentity) return;
    try {
      setIsProcessing(true);
      await updateDoc(doc(db, 'users', user.uid), {
        healthId: pendingIdentity.healthId,
        fullName: pendingIdentity.fullName || profile?.fullName || 'Citizen',
        updatedAt: serverTimestamp(),
      });
      // Profile will auto-update via useAuth listener
    } catch (err: any) {
      setError("Failed to link identity: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 text-stone-800 p-6">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
        <p className="text-teal-600/60 font-medium tracking-wide  text-[10px]">Initializing Health Nodes</p>
      </div>
    );
  }

  // Role Dispatcher
  if (user && profile && profile.healthId && !profile.healthId.startsWith('PENDING-')) {
    if (profile.role === 'doctor') return <DoctorPortal />;
    if (profile.role === 'admin') return <AdminPortal />;
    return <Dashboard />;
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Amazon Forest Background */}
      <div 
        className="absolute inset-0 z-0 scale-105"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=2600")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'opacity(0.12) saturate(0.8)'
        }}
      />
      <div className="absolute inset-0 bg-stone-50/80 z-[1]" />

      <div className="relative z-10 max-w-2xl w-full">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 mb-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <Activity className="w-12 h-12 text-stone-800/40 mb-2" />
            <span className="text-7xl font-medium tracking-tight text-stone-800 font-serif leading-none">GovCare</span>
          </div>
          <p className="text-stone-800/30 text-[10px] font-medium tracking-wide  mt-4">Security • Integrity • Health</p>
        </div>

        <AnimatePresence mode="wait">
          {(!user && authStep === 'welcome') && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-12 text-center sm:text-left"
            >
              <div className="space-y-6">
                <h2 className="text-5xl sm:text-7xl font-medium tracking-tight text-stone-800 leading-tight">
                  Modern health<br />
                  <span className="text-teal-500">Simplified.</span>
                </h2>
                <p className="text-stone-800/60 text-lg leading-relaxed max-w-lg font-medium mx-auto sm:mx-0">
                  Enjoy a seamless connection to your medical records, designed with clarity and simplicity.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setAuthStep('auth')}
                  className="group flex flex-grow items-center justify-between px-10 py-6 bg-teal-500 text-stone-800 text-xl font-medium rounded-3xl hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/20"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {(!user && authStep === 'auth') && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <LoginPortal isCitizenOnly onLoginSuccess={() => setAuthStep('method')} />
              <button 
                onClick={() => setAuthStep('welcome')}
                className="w-full mt-8 text-xs font-medium text-stone-800/40 hover:text-stone-800 transition-colors tracking-wide "
              >
                ← Back to overview
              </button>
            </motion.div>
          )}

          {needsVerification && (authStep === 'method' || authStep === 'welcome') && (
            <motion.div
              key="method"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="col-span-full mb-8 text-center sm:text-left">
                <div className="bg-teal-500/10 border border-teal-500/20 p-6 rounded-2xl mb-8">
                  <h3 className="text-3xl font-medium text-stone-800 tracking-tight">Identity Synchronization</h3>
                  <p className="text-teal-500/60 text-sm font-medium tracking-wide mt-2">Account created. Please link your National Health ID to access records.</p>
                </div>
              </div>

              <MethodCard 
                icon={<Camera />} 
                title="AI Verification" 
                desc="Link with ID Card Photo" 
                onClick={() => setAuthStep('scanning')}
                wide
              />
              <MethodCard 
                icon={<FileText />} 
                title="Record Sync" 
                desc="Import History Document" 
                isLabel
                onChange={handlePhotoUpload}
              />
              <MethodCard 
                icon={<User />} 
                title="Health Code" 
                desc="Enter manual GH-Code" 
                onClick={() => setAuthStep('manual')}
              />

              <div className="col-span-full mt-8 flex flex-col items-center gap-4">
                <button 
                  onClick={() => setAuthStep('welcome')}
                  className="text-xs font-medium text-stone-800/40 hover:text-stone-800 transition-colors tracking-wide "
                >
                  ← Back
                </button>
                <button 
                  onClick={() => logout()}
                  className="text-[10px] font-medium text-red-500/40 hover:text-red-500 transition-colors  tracking-wide"
                >
                  Sign Out of Account
                </button>
              </div>
            </motion.div>
          )}


          {authStep === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <CameraCapture onCapture={handleAIPhotoData} onCancel={() => setAuthStep('method')} />
            </motion.div>
          )}

          {authStep === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 bg-white/40 backdrop-blur-3xl border border-stone-200 rounded-3xl space-y-8"
            >
              <h3 className="text-2xl font-medium text-stone-800  tracking-tight">Manual Linkage</h3>
              <form onSubmit={handleManualSubmit} className="space-y-8">
                <input 
                  type="text" 
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="GH-CODE-XXXX"
                  className="w-full bg-stone-50/20 border border-stone-200 p-6 rounded-2xl text-stone-800 font-mono text-2xl focus:border-teal-500 outline-none transition-all placeholder:text-zinc-800"
                  required
                />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setAuthStep('method')} className="px-8 font-medium text-teal-500  tracking-wide text-[10px]">Back</button>
                  <button type="submit" className="flex-grow py-5 bg-teal-500 text-stone-800 font-medium rounded-2xl  tracking-wide text-xs shadow-md">Verify Health ID</button>
                </div>
              </form>
            </motion.div>
          )}

          {authStep === 'sync' && (
            <motion.div
              key="sync"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 bg-stone-50/80 backdrop-blur-3xl border border-stone-200 rounded-3xl space-y-8 text-center"
            >
              <div className="w-20 h-20 bg-stone-50 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                <ShieldCheck className="w-10 h-10 text-teal-600" />
              </div>
              <div>
                <h3 className="text-3xl font-medium text-stone-800  tracking-tight">Health ID</h3>
                <p className="text-teal-600 font-medium font-mono tracking-wide mt-2">{pendingIdentity?.healthId}</p>
              </div>
              
              {user ? (
                <div className="space-y-6">
                   <p className="text-stone-800/60 text-sm">Synchronizing <span className="text-stone-800 font-medium">{pendingIdentity?.fullName}</span> with your secure account.</p>
                   <button 
                    onClick={handleIdentityLink}
                    disabled={isProcessing}
                    className="w-full py-6 bg-teal-500 text-stone-800 font-medium rounded-2xl hover:bg-teal-400 transition-all shadow-md shadow-teal-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                     Commit Identity Link
                   </button>
                </div>
              ) : (
                <LoginPortal initialHealthId={pendingIdentity?.healthId} isCitizenOnly onLoginSuccess={() => setAuthStep('welcome')} />
              )}
              
              <button 
                onClick={() => setAuthStep('method')}
                className="text-[10px] font-medium text-stone-800/40  tracking-wide"
              >
                Wrong Identity? Reset Hardware
              </button>
            </motion.div>
          )}

          {authStep === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 space-y-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-teal-500 blur-3xl opacity-20 animate-pulse"></div>
                <Loader2 className="w-24 h-24 text-teal-500 animate-spin relative" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-medium text-stone-800  tracking-tight">Synaptic Analysis</h3>
                <p className="text-teal-500/60 text-[10px] font-medium  tracking-wide">AI is extracting health credentials</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="mt-12 p-6 bg-red-400/5 border border-red-400/10 rounded-2xl text-red-600 text-xs font-medium  tracking-wide text-center"
          >
            System Fault: {error}
          </motion.div>
        )}
      </div>

      
    </div>
  );
}

function MethodCard({ icon, title, desc, onClick, isLabel, onChange, wide }: any) {
  const content = (
    <div className="relative z-10 space-y-3">
      <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center group-hover:bg-teal-500 transition-colors">
        {React.cloneElement(icon, { className: 'w-6 h-6 text-teal-500 group-hover:text-stone-800 transition-colors' })}
      </div>
      <div>
        <h4 className="font-medium text-stone-800 text-xs  tracking-wide">{title}</h4>
        <p className="text-teal-500/40 text-[9px]  tracking-wider font-medium italic">{desc}</p>
      </div>
    </div>
  );

  const className = cn(
    "group relative overflow-hidden bg-white backdrop-blur-xl border border-stone-200 p-8 rounded-3xl hover:border-teal-500/40 hover:bg-white/10 cursor-pointer transition-all",
    wide && "sm:col-span-2"
  );

  if (isLabel) {
    return (
      <label className={className}>
        <input type="file" accept="image/*" onChange={onChange} className="hidden" />
        {content}
      </label>
    );
  }

  return (
    <div onClick={onClick} className={className}>
      {content}
    </div>
  );
}
