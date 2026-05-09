import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Calendar, Activity, Search, QrCode, LogOut, 
  Plus, CheckCircle2, XCircle, FileText, Pill, Stethoscope, Loader2 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { HealthRecord, Appointment, UserProfile } from '../../types';
import { Scanner } from '@yudiel/react-qr-scanner';

import { cn } from '../../lib/utils';

export default function DoctorPortal() {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointments' | 'patients' | 'records'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // New Record Form
  const [diagnosis, setDiagnosis] = useState('');
  const [meds, setMeds] = useState('');
  const [recordType, setRecordType] = useState<HealthRecord['type']>('Checkup');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchAppointments();
  }, [profile]);

  const fetchAppointments = async () => {
    try {
      const q = query(
        collection(db, 'appointments'),
        where('doctorId', '==', profile?.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientScan = async (healthId: string) => {
    try {
      const q = query(collection(db, 'users'), where('healthId', '==', healthId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSelectedPatient({ uid: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile);
        setIsScanning(false);
        setActiveTab('records');
      } else {
        alert("Patient not found in national registry.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveRecord = async () => {
    if (!selectedPatient || !profile) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'users', selectedPatient.uid, 'records'), {
        userId: selectedPatient.uid,
        facilityName: profile.associatedHospitalId || 'National Clinic',
        doctorName: profile.fullName,
        doctorId: profile.uid,
        date: serverTimestamp(),
        diagnosis,
        medications: meds,
        notes: diagnosis,
        type: recordType,
        createdAt: serverTimestamp()
      });
      
      // Update appointment if exists
      const apt = appointments.find(a => a.patientId === selectedPatient.uid && a.status !== 'completed');
      if (apt) {
        await updateDoc(doc(db, 'appointments', apt.id), { status: 'completed' });
      }

      alert("Record synchronized successfully.");
      setDiagnosis('');
      setMeds('');
      fetchAppointments();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 relative overflow-hidden">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=2600")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'opacity(0.12) saturate(0.6)'
        }}
      />
      {/* Sidebar / Nav */}
      <nav className="relative z-10 fixed left-0 top-0 bottom-0 w-24 bg-white/40 backdrop-blur-3xl border-r border-stone-200 flex flex-col items-center py-10 gap-10">
        <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Stethoscope className="w-6 h-6 text-stone-800" />
        </div>
        
        <div className="flex-grow flex flex-col gap-6">
          <NavItem icon={Calendar} active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} label="Apts" />
          <NavItem icon={Users} active={activeTab === 'patients'} onClick={() => setActiveTab('patients')} label="Patients" />
          <NavItem icon={Activity} active={activeTab === 'records'} onClick={() => setActiveTab('records')} label="Clinical" />
        </div>

        <button onClick={() => logout()} className="p-4 rounded-2xl text-teal-500/40 hover:text-red-600 hover:bg-red-400/10 transition-all">
          <LogOut className="w-6 h-6" />
        </button>
      </nav>

      <main className="pl-24 p-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-6xl md:text-7xl font-serif text-stone-800 tracking-tight leading-none mb-1">Welcome</h1>
            <h2 className="text-6xl md:text-7xl font-serif italic text-stone-700/90 tracking-tight leading-none">Dr. {profile?.fullName}</h2>
          </div>
          <button 
            onClick={() => setIsScanning(true)}
            className="flex items-center gap-3 bg-white/10 border border-stone-200 text-stone-800 px-8 py-4 rounded-2xl font-medium text-sm tracking-tight hover:bg-white/20 transition-all shadow-md shadow-white/5"
          >
            <QrCode className="w-5 h-5" />
            Verify Patient ID
          </button>
        </header>

        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto bg-white/40 backdrop-blur-3xl p-8 rounded-3xl border border-stone-200"
            >
              <h3 className="text-xl font-medium text-stone-800 mb-6 text-center">Verify Identity via real-time QR Scan</h3>
              <div className="rounded-3xl overflow-hidden border border-teal-500/20 aspect-square md:aspect-video bg-black relative shadow-lg">
                <Scanner 
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      handlePatientScan(result[0].rawValue);
                    }
                  }}
                  onError={(error) => console.log(error instanceof Error ? error.message : String(error))}
                />
              </div>
              <div className="mt-8 flex justify-center">
                 <button 
                  onClick={() => setIsScanning(false)}
                  className="px-8 py-4 bg-stone-100/40 text-stone-800 font-medium rounded-xl hover:bg-stone-100 transition-colors shadow-lg"
                 >
                   Cancel Scan
                 </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {activeTab === 'appointments' && (
                <div className="lg:col-span-12 space-y-6">
                  <h3 className="text-xs font-semibold  tracking-wider text-teal-500/60">Today's Appointments</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                       <Loader2 className="animate-spin" />
                    ) : appointments.length === 0 ? (
                       <div className="col-span-full py-20 text-center opacity-20 italic font-medium">No pending appointments found.</div>
                    ) : appointments.map(apt => (
                      <div key={apt.id} className="bg-stone-100/10 border border-teal-500/10 p-6 rounded-3xl hover:border-teal-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-teal-800/40 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-teal-600" />
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-medium  tracking-wider ${
                            apt.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                            apt.status === 'confirmed' ? 'bg-teal-500/20 text-teal-500' :
                            'bg-stone-100/20 text-stone-700'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-stone-800 mb-1">{apt.patientName}</h4>
                        <p className="text-teal-500/60 text-xs font-mono mb-4">{apt.date}</p>
                        <p className="text-stone-700/40 text-xs font-medium mb-6 line-clamp-2">" {apt.reason} "</p>
                        <div className="flex gap-2">
                           <button 
                            onClick={() => setActiveTab('records')}
                            className="flex-grow py-3 bg-teal-500 text-stone-800 text-xs font-medium rounded-xl hover:bg-teal-400 transition-all shadow-lg"
                           >
                             View Records
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'records' && (
                <div className="lg:col-span-12 space-y-6">
                  <div className="bg-stone-100/20 border border-teal-500/10 p-8 rounded-3xl shadow-lg">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-2xl font-medium text-stone-800">Clinical Encounter</h3>
                        <p className="text-teal-500/60 text-sm italic">Documentation for legal health repository.</p>
                      </div>
                      {selectedPatient ? (
                        <div className="bg-teal-500/10 px-6 py-3 rounded-2xl border border-teal-500/20 flex items-center gap-4">
                          <div>
                            <p className="text-[8px] font-medium text-teal-500  tracking-wide">Active Patient</p>
                            <p className="text-stone-800 font-medium">{selectedPatient.fullName}</p>
                          </div>
                          <button onClick={() => setSelectedPatient(null)} className="text-stone-700/20 hover:text-red-600">
                             <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-amber-600/60 text-xs italic bg-amber-400/5 px-4 py-2 rounded-lg border border-amber-400/10">Please scan patient ID to unlock clinical file.</p>
                      )}
                    </div>

                    {selectedPatient && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-medium text-teal-500/50  tracking-wide">Clinical Diagnosis</label>
                          <textarea 
                            value={diagnosis}
                            onChange={e => setDiagnosis(e.target.value)}
                            className="w-full bg-stone-50/40 border border-teal-500/10 p-6 rounded-2xl text-teal-50 outline-none focus:ring-2 focus:ring-teal-500 min-h-[150px] font-medium"
                            placeholder="Enter detailed clinical findings..."
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="block text-[10px] font-medium text-teal-500/50  tracking-wide">Prescribed Medications</label>
                          <textarea 
                            value={meds}
                            onChange={e => setMeds(e.target.value)}
                            className="w-full bg-stone-50/40 border border-teal-500/10 p-6 rounded-2xl text-teal-50 outline-none focus:ring-2 focus:ring-teal-500 min-h-[150px] font-mono text-sm"
                            placeholder="Dosage, Frequency, Duration..."
                          />
                        </div>
                        <div className="col-span-full flex justify-end gap-4 mt-4">
                          <select 
                            value={recordType}
                            onChange={e => setRecordType(e.target.value as any)}
                            className="bg-stone-100/40 text-teal-700 font-medium px-6 py-4 rounded-2xl border border-teal-500/20 outline-none"
                          >
                            <option value="Checkup">General Checkup</option>
                            <option value="Specialist Visit">Specialist Visit</option>
                            <option value="Prescription">Prescription Update</option>
                            <option value="Surgery">Surgical Note</option>
                          </select>
                          <button 
                            disabled={isSaving || !diagnosis}
                            onClick={saveRecord}
                            className="flex items-center gap-3 bg-teal-500 text-stone-800 px-12 py-4 rounded-2xl font-medium text-sm hover:bg-teal-400 transition-all shadow-md disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            Update Record
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, active, onClick, label }: { icon: any, active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative group w-12 h-12 flex items-center justify-center transition-all",
        active ? 'text-teal-500' : 'text-teal-500/30 hover:text-teal-600'
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="absolute left-full ml-4 px-2 py-1 bg-teal-800 text-stone-700 text-[8px] font-medium  tracking-wide rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="nav-glow" 
          className="absolute inset-[-8px] bg-teal-500/5 rounded-2xl blur-md -z-10" 
        />
      )}
    </button>
  );
}
