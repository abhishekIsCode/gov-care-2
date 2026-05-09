import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, History, MapPin, Search, Compass, LogOut, 
  ChevronRight, Calendar, Building2, UserCircle, ShieldCheck,
  TrendingUp, Activity, Bell, FileText, Loader2, Hospital, Clock, AlertTriangle, Menu, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { HealthRecord, Facility, Appointment } from '../types';
import Timeline from './clinical/Timeline';
import EmergencyLocator from './clinical/EmergencyLocator';
import MedicalProfile from './clinical/MedicalProfile';
import AppointmentBooking from './clinical/AppointmentBooking';
import QRCode from 'react-qr-code';
import { getHealthSuggestions, extractMedicalDataFromDocument, getHospitalRecommendation } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';

import { cn } from '../lib/utils';

type Tab = 'vault' | 'timeline' | 'locator' | 'navigator' | 'appointments' | 'emergency';

export default function Dashboard() {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('vault');
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [hospitalRec, setHospitalRec] = useState<any>(null);
  const [isFindingCare, setIsFindingCare] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [extractedDoc, setExtractedDoc] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!profile) return;
    
    // Listen for Records
    const qRecords = query(
      collection(db, 'users', profile.uid, 'records'),
      orderBy('date', 'desc')
    );
    const unsubRecords = onSnapshot(qRecords, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${profile.uid}/records`);
    });

    // Listen for Appointments
    const qApts = query(
      collection(db, 'appointments'),
      where('patientId', '==', profile.uid)
    );
    const unsubApts = onSnapshot(qApts, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    });

    return () => {
      unsubRecords();
      unsubApts();
    };
  }, [profile]);

  const loadRecommendations = async () => {
    if (records.length === 0 && (!profile || !profile.medicalDetails)) return;
    setIsNavigating(true);
    try {
      const recs = await getHealthSuggestions(records, profile?.medicalDetails);
      setRecommendations(recs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsNavigating(false);
    }
  };

  const handleFindCare = async () => {
    if (!symptoms.trim()) return;
    setIsFindingCare(true);
    try {
      const rec = await getHospitalRecommendation(symptoms, records);
      setHospitalRec(rec);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFindingCare(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const mimeType = file.type;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(mimeType)) {
      alert("Unsupported file format. Please upload an image (JPG, PNG) or PDF.");
      return;
    }

    setIsProcessingDoc(true);
    setRecords(prev => prev); // Trigger re-render if needed
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const data = await extractMedicalDataFromDocument(base64, mimeType);
        setExtractedDoc(data);
      } catch (err) {
        console.error("AI Document Extraction Error:", err);
      } finally {
        setIsProcessingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmSaveDoc = async () => {
    if (!extractedDoc || !profile) return;
    
    try {
      setIsProcessingDoc(true);
      let dateObj = new Date();
      if (extractedDoc.date) {
        const parsedDate = new Date(extractedDoc.date);
        if (!isNaN(parsedDate.getTime())) {
          dateObj = parsedDate;
        }
      }

      await addDoc(collection(db, 'users', profile.uid, 'records'), {
        ...extractedDoc,
        date: Timestamp.fromDate(dateObj),
        createdAt: Timestamp.now(),
        status: 'verified'
      });
      setExtractedDoc(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingDoc(false);
    }
  };

  const menuItems = [
    { id: 'vault', label: 'Identity Vault', icon: QrCode },
    { id: 'emergency', label: 'Emergency SOS', icon: AlertTriangle, isHot: true },
    { id: 'timeline', label: 'Clinical History', icon: History },
    { id: 'appointments', label: 'Make Appointment', icon: Calendar },
    { id: 'navigator', label: 'Health Path AI', icon: Compass },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-600 bg-amber-400/10 border-amber-400/20';
      case 'confirmed': return 'text-teal-600 bg-teal-400/10 border-teal-400/20';
      default: return 'text-stone-700/40 bg-stone-100/5 border-teal-100/10';
    }
  };

  return (
    <div className="relative min-h-screen bg-stone-50 text-stone-800 flex flex-col sm:flex-row overflow-hidden font-sans">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=2600")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'opacity(0.08) saturate(0.7)'
        }}
      />
      {/* Side Navigation */}
      <nav className={cn("relative z-10 bg-white/40 backdrop-blur-3xl border-b sm:border-b-0 sm:border-r border-stone-200 p-6 flex flex-col h-screen sticky top-0 overflow-hidden transition-all duration-300 ease-in-out", isSidebarOpen ? "w-full sm:w-80" : "w-full sm:w-24 items-center px-4")}>
        <div className="flex items-center justify-between gap-3 mb-10 w-full">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-teal-500/80 shrink-0" />
            {isSidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0">
                <h1 className="font-medium text-stone-800 tracking-tight text-3xl font-serif truncate">GovCare</h1>
                <p className="text-[10px] text-stone-800/30 font-mono tracking-wide">Abhishek Sharma</p>
              </motion.div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl text-stone-400 hover:bg-stone-100/50 hover:text-stone-800 transition-all hidden sm:block shrink-0"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <div className="space-y-2 flex-grow px-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              title={!isSidebarOpen ? item.label : undefined}
              className={cn(
                "w-full flex items-center p-4 rounded-2xl font-semibold text-sm transition-all duration-300",
                isSidebarOpen ? "justify-start" : "justify-center",
                item.isHot && activeTab !== item.id ? "text-red-500 hover:bg-red-500/10" : "",
                item.isHot && activeTab === item.id ? "bg-red-500 text-white shadow-md shadow-red-500/10" : "",
                !item.isHot && activeTab === item.id ? "bg-teal-500 text-stone-800 shadow-md shadow-teal-500/10" : "",
                !item.isHot && activeTab !== item.id ? "text-stone-800/40 hover:bg-white hover:text-stone-800" : ""
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0 transition-all", isSidebarOpen ? "mr-4" : "")} />
              {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-stone-200 w-full shrink-0 flex flex-col items-center">
          <div className={cn("flex items-center gap-4 mb-6 w-full", isSidebarOpen ? "justify-start" : "justify-center")}>
            <div className="w-10 h-10 shrink-0 rounded-xl bg-white flex items-center justify-center border border-stone-200">
              <UserCircle className="w-6 h-6 text-teal-600" />
            </div>
            {isSidebarOpen && (
              <div className="flex-grow min-w-0">
                <p className="font-medium text-stone-800 truncate text-xs tracking-tight">{profile?.fullName}</p>
                <p className="text-[10px] text-teal-500/60 truncate font-mono">{profile?.email}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => logout()}
            className={cn(
              "flex items-center p-4 bg-red-400/5 hover:bg-red-400/10 text-red-500/40 hover:text-red-600 font-medium text-[10px] tracking-wide rounded-xl transition-all w-full",
              isSidebarOpen ? "justify-start gap-3" : "justify-center"
            )}
            title={!isSidebarOpen ? "Terminated Session" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="truncate">Terminated Session</span>}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow p-6 sm:p-12 overflow-y-auto">
        <header className="mb-12">
          <p className="text-teal-500/60 text-xs font-semibold tracking-wider  mb-2">Patient Dashboard</p>
          <h2 className="text-4xl font-medium text-stone-800 tracking-tight sm:text-5xl">
            {activeTab === 'vault' && "Identity Vault"}
            {activeTab === 'timeline' && "Clinical Records"}
            {activeTab === 'appointments' && "Appointment Schedule"}
            {activeTab === 'navigator' && "AI Health Insights"}
            {activeTab === 'emergency' && "Emergency Services"}
          </h2>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'vault' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="bg-stone-50/40 backdrop-blur-3xl p-10 rounded-3xl flex flex-col items-center justify-center shadow-lg border border-stone-200">
                  <div className="p-8 bg-white rounded-3xl mb-8 shadow-lg">
                    <QRCode value="HID-12345" size={200} fgColor="#000000" />
                  </div>
                  <h3 className="text-stone-800 text-2xl font-medium  tracking-tight">Your Health ID</h3>
                  <p className="text-teal-600 font-mono text-xl tracking-wide mt-2">HID-12345</p>
                </div>

                <div className="space-y-6 flex flex-col">
                  <div className="bg-stone-50/20 backdrop-blur-xl border border-stone-200 p-10 rounded-3xl flex-grow">
                    <h4 className="text-[10px] font-medium text-teal-500  tracking-wide mb-8">Verified Credentials</h4>
                    <div className="space-y-6">
                      <InfoRow label="Legal Identity" value={profile?.fullName} />
                      <InfoRow label="Citizen Status" value="Authorized" highlight />
                      <InfoRow label="Security Clearance" value={profile?.role.toUpperCase()} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="mt-4 mb-12">
                 <h2 className="text-3xl font-medium text-stone-800 tracking-tight mb-8">Medical Profile</h2>
                 <MedicalProfile appointments={appointments} />
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 mt-12">
                <div className="space-y-1">
                  <h3 className="text-2xl font-medium text-stone-800 tracking-tight">Clinical Timeline</h3>
                  <p className="text-stone-800/40 text-sm">Synthetic ledger of your medical history</p>
                </div>
                <label className="group flex items-center gap-4 bg-teal-500 text-stone-800 px-8 py-5 rounded-2xl font-medium text-sm cursor-pointer hover:bg-teal-400 transition-all shadow-md shadow-teal-500/20 active:scale-95">
                  <input type="file" accept="image/*" onChange={handleDocumentUpload} className="hidden" disabled={isProcessingDoc} />
                  {isProcessingDoc ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Activity className="w-5 h-5" />
                  )}
                  {isProcessingDoc ? "AI Context Analysis..." : "AI Sync Document"}
                </label>
              </div>

              {extractedDoc && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-teal-500/10 border border-teal-500/20 p-8 rounded-3xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6">
                    <span className="bg-teal-500 text-stone-800 text-[10px] font-medium px-3 py-1 rounded-full  tracking-wide">AI Preview</span>
                  </div>
                  <h4 className="text-teal-500 font-medium mb-6 text-lg">Record Formatted by AI</h4>
                  <div className="grid sm:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-stone-800/40 font-medium  tracking-wide mb-1">Type</p>
                        <p className="text-stone-800 font-medium">{extractedDoc.type}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-800/40 font-medium  tracking-wide mb-1">Diagnosis</p>
                        <p className="text-stone-800/80">{extractedDoc.diagnosis}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-800/40 font-medium  tracking-wide mb-1">Medications</p>
                        <p className="text-teal-600 font-mono text-sm">{extractedDoc.medications}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-stone-800/40 font-medium  tracking-wide mb-1">Facility</p>
                        <p className="text-stone-800 font-medium">{extractedDoc.facilityName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-800/40 font-medium  tracking-wide mb-1">Practitioner</p>
                        <p className="text-stone-800 font-medium">{extractedDoc.doctorName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-800/40 font-medium  tracking-wide mb-1">Inferred Date</p>
                        <p className="text-stone-800 font-mono">{extractedDoc.date}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setExtractedDoc(null)} className="flex-grow py-4 bg-white text-stone-800/60 font-medium rounded-xl hover:bg-white/10 transition-all">Discard</button>
                    <button onClick={confirmSaveDoc} className="flex-[2] py-4 bg-teal-500 text-stone-800 font-medium rounded-xl hover:bg-teal-400 transition-all shadow-lg">Commit to Timeline</button>
                  </div>
                </motion.div>
              )}

              <Timeline records={records} />
            </motion.div>
          )}

          {activeTab === 'appointments' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
               <div className="space-y-4">
                 <h3 className="text-xl font-medium text-stone-800 tracking-tight">Next Appointment</h3>
                 {appointments.filter(a => a.status === 'confirmed').length === 0 ? (
                    <p className="text-stone-700/60 italic">No upcoming appointments scheduled.</p>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {appointments.filter(a => a.status === 'confirmed').map(apt => (
                        <div key={apt.id} className="bg-stone-100/20 border border-teal-500/10 p-8 rounded-3xl relative overflow-hidden">
                           <span className={cn("absolute top-6 right-6 px-4 py-1 rounded-full text-[8px] font-medium  tracking-wide border", getStatusColor(apt.status))}>
                              {apt.status}
                           </span>
                           <div className="flex gap-4 mb-6">
                              <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center text-teal-700">
                                 <Clock className="w-6 h-6" />
                              </div>
                              <div>
                                 <h4 className="text-stone-800 font-medium">{apt.doctorName}</h4>
                                 <p className="text-[10px] text-teal-500/60 font-medium  tracking-wide">{apt.facilityName}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 text-stone-700 font-medium mb-4">
                              <Calendar className="w-4 h-4 text-teal-500" />
                              {apt.date}
                           </div>
                           <p className="text-xs text-stone-700/40 italic">" {apt.reason} "</p>
                        </div>
                      ))}
                    </div>
                 )}
               </div>

               <div className="space-y-4">
                 <h3 className="text-xl font-medium text-stone-800 tracking-tight">Previous Appointments</h3>
                 {appointments.filter(a => a.status !== 'confirmed').length === 0 ? (
                    <p className="text-stone-700/60 italic">No past appointments found.</p>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {appointments.filter(a => a.status !== 'confirmed').map(apt => (
                        <div key={apt.id} className="bg-stone-100/20 border border-stone-200 p-8 rounded-3xl relative overflow-hidden opacity-60">
                           <span className={cn("absolute top-6 right-6 px-4 py-1 rounded-full text-[8px] font-medium  tracking-wide border", getStatusColor(apt.status))}>
                              {apt.status}
                           </span>
                           <div className="flex gap-4 mb-6">
                              <div className="w-12 h-12 bg-stone-100/50 rounded-xl flex items-center justify-center text-stone-500">
                                 <History className="w-6 h-6" />
                              </div>
                              <div>
                                 <h4 className="text-stone-800 font-medium">{apt.doctorName}</h4>
                                 <p className="text-[10px] text-stone-500 font-medium tracking-wide">{apt.facilityName}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 text-stone-700 font-medium mb-4">
                              <Calendar className="w-4 h-4 text-stone-500" />
                              {apt.date}
                           </div>
                           <p className="text-xs text-stone-700/40 italic">" {apt.reason} "</p>
                        </div>
                      ))}
                    </div>
                 )}
               </div>
               
               <div className="pt-12 border-t border-teal-500/10">
                 <h3 className="text-2xl font-medium text-stone-800 mb-8 tracking-tight">Request New Clinical Access</h3>
                 <AppointmentBooking />
               </div>
            </motion.div>
          )}

          {activeTab === 'navigator' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 max-w-4xl">
               <div className="bg-stone-50/40 border border-teal-500/10 p-12 rounded-3xl space-y-8">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-teal-500/20 rounded-2xl flex items-center justify-center">
                        <Activity className="w-8 h-8 text-teal-600" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-medium text-stone-800 tracking-tight">Symptom Checker & Nearest Care</h3>
                        <p className="text-stone-800/60 text-sm font-medium">Find the right hospital based on what you share</p>
                     </div>
                  </div>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="E.g., I have been feeling a sharp pain in my lower abdomen since yesterday..."
                    className="w-full h-32 bg-white border border-stone-200 rounded-2xl p-6 outline-none focus:border-teal-500/50 text-stone-800 resize-none font-medium"
                  />
                  <button 
                    onClick={handleFindCare}
                    disabled={isFindingCare || !symptoms.trim()}
                    className="w-full py-4 bg-teal-500 text-stone-800 font-medium rounded-2xl hover:bg-teal-400 transition-all font-mono tracking-wide shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isFindingCare ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                    {isFindingCare ? 'Finding Care...' : 'Find Appropriate Care'}
                  </button>

                  {hospitalRec && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-6 bg-white rounded-2xl border border-teal-500/20 space-y-4">
                      <h4 className="text-lg font-medium text-stone-800 border-b border-stone-100 pb-4">Recommended Facility</h4>
                      <div className="space-y-2">
                        <p className="text-stone-800 font-medium"><span className="text-stone-400 text-sm mr-2">Hospital:</span> {hospitalRec.facilityName}</p>
                        <p className="text-stone-800 font-medium"><span className="text-stone-400 text-sm mr-2">Doctor:</span> {hospitalRec.doctorName}</p>
                        <div className="mt-4 p-4 bg-stone-50 rounded-xl">
                          <p className="text-sm text-stone-700/80 italic">{hospitalRec.reason}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
               </div>

               <div className="bg-stone-100/20 border border-teal-500/10 p-12 rounded-3xl space-y-8">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <Compass className="w-8 h-8 text-stone-800" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-medium text-stone-800  tracking-tight">AI Wellness Path</h3>
                        <p className="text-teal-500/60 text-sm font-medium">Diagnostic History Synthesis</p>
                     </div>
                  </div>
                  <p className="text-stone-700/40 text-lg leading-relaxed italic">
                    Our AI synthesizes your clinical history to suggest specialized health focus areas and recommended screenings.
                  </p>
                  <button 
                    onClick={loadRecommendations}
                    disabled={isNavigating || (records.length === 0 && (!profile || (!profile.medicalDetails)))}
                    className="px-12 py-5 bg-teal-500 text-stone-800 font-medium rounded-2xl hover:bg-teal-400 transition-all shadow-md disabled:opacity-50"
                  >
                    {isNavigating ? <Loader2 className="animate-spin w-6 h-6" /> : "GENERATE HEALTH INSIGHTS"}
                  </button>
               </div>

               {recommendations && (
                 <div className="bg-stone-100/10 border border-teal-500/5 p-12 rounded-3xl prose prose-invert max-w-none">
                    <ReactMarkdown>{recommendations}</ReactMarkdown>
                 </div>
               )}
            </motion.div>
          )}

          {activeTab === 'emergency' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <EmergencyLocator />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string, value: any, highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-teal-500/5 last:border-0">
      <span className="text-[10px] font-medium text-teal-500/40  tracking-wide">{label}</span>
      <span className={cn("font-medium", highlight ? "text-teal-600" : "text-stone-800")}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-stone-100/40 border border-teal-500/10 p-6 rounded-3xl">
      <div className="flex justify-between items-start mb-4">
        <div className="text-teal-500">{icon}</div>
      </div>
      <p className="text-[9px] font-medium text-teal-500/40  tracking-wide">{label}</p>
      <p className="text-3xl font-medium text-stone-800 tracking-wide">{value}</p>
    </div>
  );
}
