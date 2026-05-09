import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, User, Hospital, Clock, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Facility } from '../../types';
import { useAuth } from '../../hooks/useAuth';

export default function AppointmentBooking() {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<UserProfile | null>(null);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const fSnap = await getDocs(collection(db, 'facilities'));
      setFacilities(fSnap.docs.map(d => ({ id: d.id, ...d.data() } as Facility)));
      
      const dSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'doctor')));
      setDoctors(dSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!profile || !selectedFacility || !selectedDoctor || !date) return;
    setBooking(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        patientId: profile.uid,
        patientName: profile.fullName,
        doctorId: selectedDoctor.uid,
        doctorName: selectedDoctor.fullName,
        facilityId: selectedFacility.id,
        facilityName: selectedFacility.name,
        date: date,
        time: '10:00 AM', // Simplified
        status: 'pending',
        reason,
        createdAt: serverTimestamp()
      });
      setStep(4);
    } catch (err) {
      console.error(err);
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-10 overflow-x-auto gap-4 pb-2">
         {[1, 2, 3].map(s => (
           <div key={s} className="flex items-center gap-3 min-w-fit">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs ${step >= s ? 'bg-teal-500 text-stone-800 shadow-lg' : 'bg-stone-100/40 text-teal-500/40'}`}>
                {s}
              </div>
              <span className={`text-[10px] font-medium  tracking-wide ${step >= s ? 'text-stone-800' : 'text-teal-500/30'}`}>
                {s === 1 ? 'Choose Facility' : s === 2 ? 'Select Expert' : 'Confirm Access'}
              </span>
              {s < 3 && <ArrowRight className={`w-4 h-4 ${step > s ? 'text-teal-500' : 'text-teal-500/20'}`} />}
           </div>
         ))}
      </div>

      <div className="bg-stone-100/20 backdrop-blur-xl border border-teal-500/10 p-10 rounded-3xl shadow-lg">
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h3 className="text-2xl font-medium text-stone-800 mb-2">Select Health Node</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {facilities.map(f => (
                <div 
                  key={f.id}
                  onClick={() => setSelectedFacility(f)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer group ${
                    selectedFacility?.id === f.id ? 'bg-teal-500 border-teal-400' : 'bg-stone-50/40 border-teal-500/10 hover:border-teal-500/30'
                  }`}
                >
                  <Hospital className={`w-6 h-6 mb-4 ${selectedFacility?.id === f.id ? 'text-stone-800' : 'text-teal-600 group-hover:scale-110'}`} />
                  <h4 className={`font-medium ${selectedFacility?.id === f.id ? 'text-stone-800' : 'text-stone-800'}`}>{f.name}</h4>
                  <p className={`text-xs mt-1 ${selectedFacility?.id === f.id ? 'text-stone-800/60' : 'text-teal-500/60'}`}>{f.address}</p>
                </div>
              ))}
            </div>
            <div className="pt-6 flex justify-end">
              <button 
                disabled={!selectedFacility}
                onClick={() => setStep(2)}
                className="px-10 py-4 bg-teal-500 text-stone-800 rounded-2xl font-medium text-xs  tracking-wide hover:bg-teal-400 disabled:opacity-50 transition-all shadow-md shadow-teal-500/20"
              >
                PROCEED TO SPECIALIST
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h3 className="text-2xl font-medium text-stone-800 mb-2">Choose Registered Practitioner</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.filter(d => !selectedFacility || !d.associatedHospitalId || d.associatedHospitalId === selectedFacility.id).map(d => (
                <div 
                  key={d.uid}
                  onClick={() => setSelectedDoctor(d)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer group ${
                    selectedDoctor?.uid === d.uid ? 'bg-teal-500 border-teal-400' : 'bg-stone-50/40 border-teal-500/10 hover:border-teal-500/30'
                  }`}
                >
                  <div className="flex gap-4 items-center mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedDoctor?.uid === d.uid ? 'bg-teal-400 text-stone-800' : 'bg-teal-500/10 text-teal-500'}`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className={`font-medium ${selectedDoctor?.uid === d.uid ? 'text-stone-800' : 'text-stone-800'}`}>Dr. {d.fullName}</h4>
                      <p className={`text-[10px] font-medium  tracking-wide ${selectedDoctor?.uid === d.uid ? 'text-stone-800/60' : 'text-teal-500/60'}`}>{d.specialization || 'General Physician'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-6 flex justify-between">
              <button 
                onClick={() => setStep(1)}
                className="px-8 py-4 bg-stone-100/40 text-stone-700 rounded-2xl font-medium text-xs  transition-all"
              >
                BACK
              </button>
              <button 
                disabled={!selectedDoctor}
                onClick={() => setStep(3)}
                className="px-10 py-4 bg-teal-500 text-stone-800 rounded-2xl font-medium text-xs  tracking-wide hover:bg-teal-400 disabled:opacity-50 transition-all shadow-md shadow-teal-500/20"
              >
                SCHEDULE CONSULTATION
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <h3 className="text-2xl font-medium text-stone-800 mb-2">Final Validation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4 font-medium">
                  <div className="bg-stone-100/40 p-6 rounded-3xl border border-teal-500/10">
                     <p className="text-[10px] text-teal-500/60  tracking-wide mb-1">Appointment Date</p>
                     <input 
                      type="date" 
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-transparent text-stone-800 outline-none cursor-pointer"
                     />
                  </div>
                  <div className="bg-stone-100/40 p-6 rounded-3xl border border-teal-500/10">
                     <p className="text-[10px] text-teal-500/60  tracking-wide mb-1">Reason for Visit</p>
                     <input 
                      type="text" 
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full bg-transparent text-stone-800 outline-none placeholder:text-stone-700/20"
                      placeholder="Symptoms, follow-up, etc."
                     />
                  </div>
               </div>

               <div className="bg-teal-500/10 p-8 rounded-3xl border border-teal-500/20 space-y-6">
                  <div className="flex gap-4">
                     <Hospital className="w-5 h-5 text-teal-500" />
                     <div>
                        <p className="text-[8px] font-medium text-teal-500/60 ">Hospital Node</p>
                        <p className="text-stone-800 text-sm font-medium">{selectedFacility?.name}</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <Clock className="w-5 h-5 text-teal-500" />
                     <div>
                        <p className="text-[8px] font-medium text-teal-500/60 ">Clinician</p>
                        <p className="text-stone-800 text-sm font-medium">Dr. {selectedDoctor?.fullName}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-6 flex justify-between">
              <button 
                onClick={() => setStep(2)}
                className="px-8 py-4 bg-stone-100/40 text-stone-700 rounded-2xl font-medium text-xs "
              >
                BACK
              </button>
              <button 
                disabled={booking || !date}
                onClick={handleBook}
                className="px-12 py-5 bg-teal-500 text-stone-800 rounded-2xl font-medium text-xs  tracking-wide hover:bg-teal-400 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/40"
              >
                {booking ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "COMPLETE BOOKING"}
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-6">
             <div className="w-24 h-24 bg-teal-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
                <CheckCircle2 className="w-12 h-12 text-stone-800" />
             </div>
             <h3 className="text-3xl font-medium text-stone-800">Engagement Confirmed</h3>
             <p className="text-stone-700/60 max-w-sm mx-auto italic font-medium">Your request for clinical access has been registered and is pending practitioner confirmation.</p>
             <button 
              onClick={() => setStep(1)}
              className="px-10 py-4 bg-stone-100/40 text-teal-600 font-medium text-xs  tracking-wide rounded-2xl border border-teal-500/10 hover:text-stone-800 transition-all"
             >
               BACK TO PORTAL
             </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
