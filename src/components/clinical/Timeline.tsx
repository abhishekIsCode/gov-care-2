import React from 'react';
import { motion } from 'motion/react';
import { Building2, Calendar, FileText, User, MapPin, ExternalLink, History } from 'lucide-react';
import { HealthRecord } from '../../types';

interface TimelineProps {
  records: HealthRecord[];
}

export default function Timeline({ records }: TimelineProps) {
  return (
    <div className="max-w-5xl space-y-12">
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-stone-100/10 border border-dashed border-teal-500/10 rounded-3xl">
          <History className="w-12 h-12 text-stone-700/50 mb-4" />
          <p className="text-teal-700 font-medium  tracking-wide text-sm italic">Clinical history currently empty</p>
          <p className="text-stone-700 mt-2 text-xs">Healthcare events will sprout here automatically.</p>
        </div>
      ) : (
        <div className="relative space-y-12">
          {/* Timeline central line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-teal-500/10 hidden sm:block"></div>

          {records.map((record, index) => (
            <motion.div 
              key={record.id}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative flex flex-col sm:flex-row gap-8 items-start group"
            >
              {/* Timeline Dot */}
              <div className="hidden sm:flex absolute left-8 -translate-x-1/2 w-4 h-4 rounded-full border border-teal-950 bg-teal-500 z-10 group-hover:scale-150 transition-transform"></div>

              <div className="min-w-[120px] sm:pl-16">
                <p className="text-teal-600 font-medium text-xs  tracking-wide pt-1">
                  {record.date?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-teal-600/40 text-[10px] font-medium  mt-1">
                  {record.date?.toDate().getFullYear()}
                </p>
              </div>

              <div className="flex-grow bg-stone-100/20 backdrop-blur-sm border border-teal-500/10 p-8 rounded-3xl hover:bg-stone-100/30 transition-all hover:border-teal-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-800/40 rounded-xl flex items-center justify-center group-hover:bg-teal-500 transition-colors">
                      {record.type === 'Checkup' && <User className="w-6 h-6 text-teal-600 group-hover:text-stone-800" />}
                      {record.type === 'Surgery' && <Activity className="w-6 h-6 text-red-600 group-hover:text-stone-800" />}
                      {record.type === 'Prescription' && <FileText className="w-6 h-6 text-teal-600 group-hover:text-stone-800" />}
                      {(record.type === 'Lab Result' || record.type === 'Specialist Visit') && <Building2 className="w-6 h-6 text-amber-600 group-hover:text-stone-800" />}
                    </div>
                    <div>
                      <h4 className="text-xl font-medium text-stone-800 leading-tight group-hover:text-teal-50 transition-colors">{record.type}</h4>
                      <div className="flex items-center gap-2 text-teal-500/60 text-sm mt-1">
                        <Building2 className="w-3 h-3" />
                        <span className="font-medium">{record.facilityName}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-3 py-1 bg-teal-500/10 rounded-full flex items-center gap-2 border border-teal-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></div>
                    <span className="text-[10px] font-medium  text-teal-600 tracking-wider">Verified Record</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-8 pt-6 border-t border-teal-500/5">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-teal-500/60 font-medium  tracking-wide mb-1 italic">Clinical Findings</p>
                      <p className="text-stone-700/60 text-sm leading-relaxed">{record.diagnosis || record.notes}</p>
                    </div>
                    {record.medications && (
                      <div>
                        <p className="text-[10px] text-teal-600/60 font-medium  tracking-wide mb-1 italic">Prescribed Path</p>
                        <p className="bg-teal-500/5 p-4 rounded-xl text-teal-700 font-mono text-xs leading-relaxed border border-teal-500/10">
                          {record.medications}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-4 p-4 bg-stone-50/40 rounded-2xl border border-teal-500/5">
                      <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-teal-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-teal-700 font-medium  tracking-wide">Practitioner</p>
                        <p className="text-stone-700 text-sm font-medium">{record.doctorName || 'National Specialist'}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 p-4 bg-stone-50/40 rounded-2xl border border-teal-500/5">
                      <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center shrink-0">
                        <Hospital className="w-5 h-5 text-teal-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-teal-700 font-medium  tracking-wide">Facility Level</p>
                        <p className="text-stone-700 text-sm font-medium">{record.facilityName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Activity(props: any) {
  return (
    <ActivityIcon {...props} />
  );
}

import { Activity as ActivityIcon } from 'lucide-react';
import { Hospital } from 'lucide-react';
