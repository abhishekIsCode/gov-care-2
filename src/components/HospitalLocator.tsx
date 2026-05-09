import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { Hospital, MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import { Facility } from '../types';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

export default function HospitalLocator() {
  if (!API_KEY) {
    return (
      <div className="bg-stone-50/40 backdrop-blur-3xl p-10 rounded-3xl border border-stone-200">
        <h3 className="text-xl font-medium text-stone-800  tracking-wider mb-8">Registered Facilities (Demo Mode)</h3>
        <p className="text-teal-600 italic mb-6">Google Maps API Key not detected.</p>
        <p className="text-stone-800 mb-6 font-medium">To see live hospitals:</p>
        <ul className="text-stone-700 list-disc pl-6 space-y-2 mb-6">
          <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right)</li>
          <li>Select <strong>Secrets</strong></li>
          <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name, press <strong>Enter</strong></li>
          <li>Paste your API key as the value, press <strong>Enter</strong></li>
        </ul>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <HospitalLocatorInner />
    </APIProvider>
  );
}

function HospitalLocatorInner() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Location error:", err)
      );
    } else {
      // Fallback location if geolocation is blocked or unavailable
      setUserLocation({ lat: 28.6139, lng: 77.2090 });
    }
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[700px]">
      <HospitalPlacesSearch 
        userLocation={userLocation} 
        onPlacesFound={(places) => {
          setFacilities(places);
          setLoading(false);
        }} 
      />
      {/* List */}
      <div className="lg:col-span-4 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        <div className="sticky top-0 bg-stone-50 pb-4 z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/40" />
            <input 
              type="text" 
              placeholder="Searching nearby hospitals..."
              className="w-full bg-stone-100/20 border border-teal-500/10 p-4 pl-12 rounded-2xl text-stone-800 outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              disabled
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-teal-600/50">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-teal-500" />
            <p className="text-xs font-medium  tracking-wide">Locating Hospitals...</p>
          </div>
        ) : (
          facilities.map(f => (
            <motion.div
              key={f.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedFacility(f)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                selectedFacility?.id === f.id ? 'bg-teal-500 border-teal-400' : 'bg-stone-100/20 border-teal-500/10 hover:border-teal-500/30'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`p-3 rounded-xl ${selectedFacility?.id === f.id ? 'bg-teal-400 text-stone-800' : 'bg-teal-500/10 text-teal-600'}`}>
                  <Hospital className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium  tracking-wide opacity-60">{f.type}</span>
              </div>
              <h4 className={`font-medium mb-1 ${selectedFacility?.id === f.id ? 'text-stone-800' : 'text-stone-800'}`}>{f.name}</h4>
              <p className={`text-xs ${selectedFacility?.id === f.id ? 'text-stone-800/60' : 'text-teal-500/60'}`}>{f.address}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Map */}
      <div className="lg:col-span-8 rounded-3xl overflow-hidden bg-stone-100/20 border border-teal-500/10 relative shadow-lg">
          <Map
            defaultCenter={userLocation || { lat: 28.6139, lng: 77.2090 }}
            defaultZoom={11}
            mapId="HEALTH_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            colorScheme="DARK"
          >
            {facilities.map(f => (
              <MarkerWithInfo 
                key={f.id} 
                facility={f} 
                isSelected={selectedFacility?.id === f.id}
                onSelect={() => setSelectedFacility(f)}
              />
            ))}
            {userLocation && (
              <AdvancedMarker position={userLocation}>
                <div className="relative">
                   <div className="w-4 h-4 bg-blue-500 rounded-full border border-stone-200 shadow-lg animate-pulse" />
                   <div className="absolute inset-x-[-10px] top-[-10px] w-8 h-8 bg-blue-500/20 rounded-full blur-sm" />
                </div>
              </AdvancedMarker>
            )}
          </Map>
        
        {!selectedFacility && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-stone-50/80 backdrop-blur-md px-6 py-3 rounded-full border border-teal-500/20 text-stone-700/60 text-xs font-medium  tracking-wide flex items-center gap-3">
             <Navigation className="w-4 h-4 text-teal-500" />
             Synchronizing satellite data...
          </div>
        )}
      </div>
    </div>
  );
}

function HospitalPlacesSearch({
  userLocation,
  onPlacesFound
}: {
  userLocation: { lat: number, lng: number } | null,
  onPlacesFound: (facilities: Facility[]) => void
}) {
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!placesLib || !userLocation) return;
    
    let isMounted = true;
    
    placesLib.Place.searchNearby({
      locationRestriction: {
        center: userLocation,
        radius: 10000 // 10km radius
      },
      includedTypes: ['hospital', 'medical_clinic'],
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'primaryType'],
      maxResultCount: 15
    }).then(({ places }) => {
      if (isMounted && places) {
        const facilities = places.map(p => ({
          id: p.id,
          name: p.displayName,
          address: p.formattedAddress,
          lat: p.location?.lat() || 0,
          lng: p.location?.lng() || 0,
          capacity: Math.floor(Math.random() * 100) + 20,
          availableBeds: Math.floor(Math.random() * 20),
          type: p.primaryType?.replace(/_/g, ' ') || 'medical facility'
        } as Facility));
        onPlacesFound(facilities);
      }
    }).catch(err => {
      console.error('Error fetching hospitals via Places API', err);
    });

    return () => { isMounted = false; };
  }, [placesLib, userLocation]);

  return null;
}

function MarkerWithInfo({ facility, isSelected, onSelect }: { facility: Facility, isSelected: boolean, onSelect: () => void }) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (isSelected) setShowInfo(true);
  }, [isSelected]);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: facility.lat, lng: facility.lng }}
        onClick={() => {
          onSelect();
          setShowInfo(!showInfo);
        }}
      >
        <Pin 
          background={isSelected ? "#10b981" : "#064e3b"} 
          glyphColor="#fff" 
          borderColor={isSelected ? "#fff" : "#10b981"} 
        />
      </AdvancedMarker>
      {showInfo && (
        <InfoWindow anchor={marker} onCloseClick={() => setShowInfo(false)}>
          <div className="p-2 min-w-[150px]">
             <h5 className="font-medium text-stone-800 text-sm mb-1">{facility.name}</h5>
             <p className="text-[10px] text-teal-700 bg-stone-50 px-2 py-0.5 rounded-full inline-block mb-2 font-medium  tracking-wide">{facility.type}</p>
             <button className="w-full py-2 bg-teal-600 text-stone-800 rounded-lg text-[10px] font-medium  tracking-wide hover:bg-teal-500 transition-colors">
               BOOK APPOINTMENT
             </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
