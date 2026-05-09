import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Activity, Plus, X, HeartPulse, AlertCircle, Calendar } from 'lucide-react';
import { Appointment } from '../../types';
import DocumentScanner from './DocumentScanner';

export default function MedicalProfile({ appointments }: { appointments: Appointment[] }) {
  const { profile } = useAuth();
  const [medicalDetails, setMedicalDetails] = useState<string>(profile?.medicalDetails || '');
  const [loading, setLoading] = useState(false);

  const handleDocumentScan = async (data: any) => {
    if (data.extractedText) {
      const newDetails = medicalDetails ? `${medicalDetails}\n\n--- Scanned Additional Info ---\n${data.extractedText}` : data.extractedText;
      setMedicalDetails(newDetails);
      await saveProfile(newDetails);
    }
  };

  const saveProfile = async (detailsToSave?: string) => {
    if (!profile) return;
    setLoading(true);
    
    const finalDetails = detailsToSave ?? medicalDetails;
    
    try {
      if (profile.uid === 'demo-local-user') {
         const newProfile = { ...profile, medicalDetails: finalDetails };
         localStorage.setItem('demo_user_profile', JSON.stringify(newProfile));
         window.location.reload();
         return;
      }
      await updateDoc(doc(db, 'users', profile.uid), {
        medicalDetails: finalDetails
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sort appointments into past and future
  const now = new Date();
  const pastAppointments = appointments.filter(a => {
    if (!a.date) return false;
    const d = new Date(typeof a.date === 'string' ? a.date : a.date?.toDate?.() || a.date);
    return d < now;
  }).sort((a,b) => {
      const dA = new Date(typeof a.date === 'string' ? a.date : a.date?.toDate?.() || a.date);
      const dB = new Date(typeof b.date === 'string' ? b.date : b.date?.toDate?.() || b.date);
      return dB.getTime() - dA.getTime();
  });
  
  const futureAppointments = appointments.filter(a => {
    if (!a.date) return false;
    const d = new Date(typeof a.date === 'string' ? a.date : a.date?.toDate?.() || a.date);
    return d >= now;
  }).sort((a,b) => {
      const dA = new Date(typeof a.date === 'string' ? a.date : a.date?.toDate?.() || a.date);
      const dB = new Date(typeof b.date === 'string' ? b.date : b.date?.toDate?.() || b.date);
      return dA.getTime() - dB.getTime();
  });

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-8">
        <DocumentScanner onResult={handleDocumentScan} />
        
        <div className="bg-stone-50/40 border border-teal-500/10 p-8 rounded-3xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-teal-500/10 text-teal-600 rounded-2xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-stone-800 tracking-wider">Comprehensive Medical Records</h3>
              <p className="text-sm text-stone-800/50">Edit manually or scan documents to extract</p>
            </div>
          </div>
          <textarea
            value={medicalDetails}
            onChange={(e) => setMedicalDetails(e.target.value)}
            placeholder="No records documented yet. Add yours manually or by scanning a medical document..."
            className="w-full h-80 bg-white/40 border border-stone-200 rounded-2xl p-6 outline-none focus:border-teal-500/50 text-stone-800 resize-none"
          />
          <div className="mt-4">
            <button 
               onClick={() => saveProfile()} 
               disabled={loading}
               className="w-full py-4 bg-teal-500 text-stone-800 font-medium rounded-2xl hover:bg-teal-400 transition-all font-mono tracking-wide shadow-md shadow-teal-500/20 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Medical Profile'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-stone-50/40 border border-teal-500/10 p-8 rounded-3xl">
           <div className="flex items-center gap-4 mb-6">
             <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
               <Calendar className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-medium text-stone-800  tracking-wider">Next Appointment</h3>
           </div>
           {futureAppointments.length > 0 ? (
             <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl text-blue-800">
               <p className="font-medium text-xl mb-1">{futureAppointments[0].doctorName}</p>
               <p className="text-sm font-medium opacity-80 mb-4">{futureAppointments[0].facilityName}</p>
               <p className="font-mono bg-blue-500/20 inline-block px-3 py-1 rounded-full text-xs">{
                 typeof futureAppointments[0].date === 'string' ? futureAppointments[0].date : futureAppointments[0].date?.toDate?.()?.toLocaleString() 
               }</p>
               <p className="mt-4 text-sm italic opacity-60">Reason: {futureAppointments[0].reason}</p>
             </div>
           ) : (
             <p className="text-stone-800/40 italic">No upcoming appointments scheduled.</p>
           )}
        </div>

        <div className="bg-stone-50/40 border border-teal-500/10 p-8 rounded-3xl">
           <div className="flex items-center gap-4 mb-6">
             <div className="p-3 bg-teal-500/10 text-teal-600 rounded-2xl">
               <Activity className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-medium text-stone-800  tracking-wider">Previous Appointments</h3>
           </div>
           <div className="space-y-4">
             {pastAppointments.length > 0 ? pastAppointments.map(apt => (
               <div key={apt.id} className="bg-white/30 border border-stone-200 p-4 rounded-2xl">
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="font-medium text-stone-800">{apt.doctorName}</p>
                     <p className="text-xs text-stone-800/50">{apt.facilityName}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-teal-600 font-mono">
                       {typeof apt.date === 'string' ? apt.date : apt.date?.toDate?.()?.toLocaleDateString()}
                     </p>
                     <span className={`text-[8px] font-medium  tracking-wide px-2 py-0.5 rounded-full ${
                       apt.status === 'completed' ? 'bg-teal-500/20 text-teal-700' : 
                       apt.status === 'cancelled' ? 'bg-red-500/20 text-red-700' : 'bg-white/10 text-stone-800/60'
                     }`}>
                       {apt.status}
                     </span>
                   </div>
                 </div>
               </div>
             )) : (
               <p className="text-stone-800/40 italic">No past appointments found.</p>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
