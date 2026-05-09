import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Hospital, Users, Plus, Trash2, MapPin, Loader2, LogOut } from 'lucide-react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Facility, UserProfile } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { seedPatients } from '../../lib/seed';

export default function AdminPortal() {
  const { logout } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const triggerSeed = async () => {
    if (confirm("Seed patient database?")) {
      await seedPatients();
      alert("Seeding complete.");
    }
  };
  
  // New Facility Form
  const [fName, setFName] = useState('');
  const [fType, setFType] = useState('Hospital');
  const [fAddress, setFAddress] = useState('');
  const [fLat, setFLat] = useState(28.6139);
  const [fLng, setFLng] = useState(77.2090);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const fSnap = await getDocs(collection(db, 'facilities'));
      setFacilities(fSnap.docs.map(d => ({ id: d.id, ...d.data() } as Facility)));
      
      const dSnap = await getDocs(collection(db, 'users'));
      setDoctors(dSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)).filter(u => u.role === 'doctor'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'facilities'), {
        name: fName,
        type: fType,
        address: fAddress,
        lat: Number(fLat),
        lng: Number(fLng)
      });
      setFName('');
      setFAddress('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFacility = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'facilities', id));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-6 sm:p-12 relative overflow-hidden">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=2600")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'opacity(0.1) saturate(0.6)'
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <ShieldCheck className="w-8 h-8 text-teal-500" />
               <h1 className="text-3xl font-medium text-stone-800 tracking-tight">System Administration</h1>
            </div>
            <p className="text-teal-500/60 font-medium tracking-wide">Central Health Oversight</p>
          </div>
          <button onClick={triggerSeed} className="flex items-center gap-3 px-6 py-3 bg-white text-stone-800/60 rounded-xl font-medium hover:bg-yellow-500 hover:text-stone-800 transition-all text-sm border border-stone-200">
            <Plus className="w-5 h-5" />
            Seed Patients
          </button>
          <button onClick={() => logout()} className="flex items-center gap-3 px-6 py-3 bg-white text-stone-800/60 rounded-xl font-medium hover:bg-red-500 hover:text-stone-800 transition-all text-sm border border-stone-200">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Manage Facilities */}
           <div className="lg:col-span-8 space-y-8">
              <section className="bg-stone-100/10 border border-teal-500/10 p-8 rounded-3xl">
                <h3 className="text-xl font-medium text-stone-800 mb-6 flex items-center gap-2">
                  <Hospital className="w-5 h-5 text-teal-500" />
                  Facility Directory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {facilities.map(f => (
                    <div key={f.id} className="bg-white/20 border border-stone-200 p-6 rounded-2xl flex justify-between items-center group hover:border-teal-500/30 transition-all">
                      <div>
                        <h4 className="font-medium text-stone-800">{f.name}</h4>
                        <p className="text-xs text-stone-800/40 font-mono mt-1">{f.address}</p>
                      </div>
                      <button onClick={() => deleteFacility(f.id)} className="text-stone-800/10 hover:text-red-600 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-stone-100/10 border border-teal-500/10 p-8 rounded-3xl">
                <h3 className="text-xl font-medium text-stone-800 mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-teal-500" />
                  Register Facility
                </h3>
                <form onSubmit={addFacility} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Facility Name" className="w-full bg-white border border-stone-200 p-4 rounded-xl text-stone-800 outline-none focus:ring-2 focus:ring-teal-500 font-medium" required />
                    <select value={fType} onChange={e => setFType(e.target.value)} className="w-full bg-white border border-stone-200 p-4 rounded-xl text-stone-800 outline-none">
                      <option value="Hospital" className="bg-stone-50 text-stone-800">General Hospital</option>
                      <option value="Clinic" className="bg-stone-50 text-stone-800">Public Clinic</option>
                      <option value="Diagnostic" className="bg-stone-50 text-stone-800">Diagnostic Center</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <input value={fAddress} onChange={e => setFAddress(e.target.value)} placeholder="Full Address" className="w-full bg-white border border-stone-200 p-4 rounded-xl text-stone-800 outline-none focus:ring-2 focus:ring-teal-500" required />
                    <div className="flex gap-4">
                      <input type="number" step="any" value={fLat} onChange={e => setFLat(Number(e.target.value))} placeholder="Lat" className="flex-grow bg-white border border-stone-200 p-4 rounded-xl text-stone-800 font-mono" />
                      <input type="number" step="any" value={fLng} onChange={e => setFLng(Number(e.target.value))} placeholder="Lng" className="flex-grow bg-white border border-stone-200 p-4 rounded-xl text-stone-800 font-mono" />
                    </div>
                  </div>
                  <button type="submit" className="col-span-full py-5 bg-teal-500 text-stone-800 font-medium rounded-xl hover:bg-teal-400 transition-all shadow-md shadow-teal-500/10">
                    Register Facility
                  </button>
                </form>
              </section>
           </div>

           {/* Manage Doctors */}
           <div className="lg:col-span-4 space-y-8">
              <section className="bg-stone-100/10 border border-teal-500/10 p-8 rounded-3xl">
                <h3 className="text-xl font-medium text-stone-800 mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-500" />
                  Registered Clinicians
                </h3>
                <div className="space-y-4">
                  {doctors.map(d => (
                    <div key={d.uid} className="bg-white/20 border border-stone-200 p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
                         <Users className="w-5 h-5 text-teal-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-stone-800">{d.fullName}</h4>
                        <p className="text-xs text-stone-800/30 font-medium tracking-wide">{d.specialization || 'Clinical Staff'}</p>
                      </div>
                    </div>
                  ))}
                  {doctors.length === 0 && <p className="text-center text-stone-800/10 italic text-sm">No clinicians registered yet.</p>}
                </div>
              </section>
           </div>
        </div>
      </div>
    </div>
  );
}
