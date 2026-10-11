import React from 'react';
import { Check, X, Ban, Trash2, Calendar } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import type { SubjectAttendanceStats, AttendanceStatus } from '../../types';

interface SubjectAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SubjectAttendanceStats | null;
}

export const SubjectAuditModal: React.FC<SubjectAuditModalProps> = ({
  isOpen,
  onClose,
  stats,
}) => {
  const { attendanceRecords, recordAttendance, deleteAttendanceRecord } = useApp();

  if (!stats) return null;

  const subjectRecords = attendanceRecords
    .filter((r) => r.subjectId === stats.subject.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.periodNumber - a.periodNumber);

  const handleStatusChange = async (
    date: string,
    periodNumber: number,
    status: AttendanceStatus,
    source: any,
    sourceRefId?: string
  ) => {
    await recordAttendance(date, periodNumber, stats.subject.id, status, source, sourceRefId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Audit Log: ${stats.subject.name}`} maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Metric Summary Card */}
        <div className="p-4 rounded-2xl bg-gotham-900 border border-gotham-750 text-white shadow-md">
          <div className="flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] font-bold text-gotham-400 uppercase tracking-widest">
                CURRENT TELEMETRY
              </span>
              <div className="text-3xl font-black text-white mt-0.5">
                {stats.percentage.toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gotham-400 uppercase tracking-widest">
                CONDUCTED
              </span>
              <div className="text-lg font-black text-bat-accent">
                {stats.present} / {stats.conducted}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-gotham-750 font-mono text-center">
            <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
              <div className="text-[10px] text-emerald-400 font-black uppercase">Present</div>
              <div className="text-sm font-black text-white">{stats.present}</div>
            </div>
            <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/40">
              <div className="text-[10px] text-rose-400 font-black uppercase">Absent</div>
              <div className="text-sm font-black text-white">{stats.absent}</div>
            </div>
            <div className="p-2 rounded-xl bg-gotham-800 border border-gotham-700">
              <div className="text-[10px] text-gotham-300 font-black uppercase">Cancelled</div>
              <div className="text-sm font-black text-white">{stats.cancelled}</div>
            </div>
            <div className="p-2 rounded-xl bg-gotham-800 border border-gotham-700">
              <div className="text-[10px] text-bat-accent font-black uppercase">Baseline</div>
              <div className="text-xs font-black text-white">
                {stats.subject.initialPresent}/{stats.subject.initialPresent + stats.subject.initialAbsent}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log / History List */}
        <div>
          <div className="flex items-center justify-between mb-2 font-mono">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gotham-400">
              Recorded Logs ({subjectRecords.length})
            </h4>
            <span className="text-[10px] text-bat-accent">Tap status to correct</span>
          </div>

          {subjectRecords.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-gotham-400 border border-dashed border-gotham-750 rounded-xl">
              No individual attendance logs recorded yet for this subject.
              {stats.subject.initialPresent > 0 && (
                <p className="mt-1 font-semibold text-gotham-300">
                  (Operating from baseline of {stats.subject.initialPresent} present, {stats.subject.initialAbsent} absent)
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {subjectRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-gotham-750 bg-white dark:bg-gotham-850 text-xs shadow-sm font-mono"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <Calendar size={13} className="text-bat-accent" />
                      <span>{r.date}</span>
                      <span className="text-gotham-400 font-normal">
                        • {r.source === 'extra' ? 'EXTRA' : `P${r.periodNumber}`}
                      </span>
                    </div>
                    {r.note && (
                      <p className="text-[11px] text-gotham-400 mt-0.5">{r.note}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        handleStatusChange(
                          r.date,
                          r.periodNumber,
                          'present',
                          r.source,
                          r.sourceRefId
                        )
                      }
                      className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg font-bold transition-all ${
                        r.status === 'present'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-gotham-400 hover:text-emerald-400 hover:bg-gotham-800'
                      }`}
                      title="Present"
                      aria-label="Mark Present"
                    >
                      <Check size={15} strokeWidth={2.5} />
                    </button>

                    <button
                      onClick={() =>
                        handleStatusChange(
                          r.date,
                          r.periodNumber,
                          'absent',
                          r.source,
                          r.sourceRefId
                        )
                      }
                      className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg font-bold transition-all ${
                        r.status === 'absent'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-gotham-400 hover:text-rose-400 hover:bg-gotham-800'
                      }`}
                      title="Absent"
                      aria-label="Mark Absent"
                    >
                      <X size={15} strokeWidth={2.5} />
                    </button>

                    <button
                      onClick={() =>
                        handleStatusChange(
                          r.date,
                          r.periodNumber,
                          'cancelled',
                          r.source,
                          r.sourceRefId
                        )
                      }
                      className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg font-bold transition-all ${
                        r.status === 'cancelled'
                          ? 'bg-gotham-700 text-white shadow'
                          : 'text-gotham-400 hover:text-amber-400 hover:bg-gotham-800'
                      }`}
                      title="Cancelled"
                      aria-label="Mark Cancelled"
                    >
                      <Ban size={15} strokeWidth={2.5} />
                    </button>

                    <button
                      onClick={() => deleteAttendanceRecord(r.id)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gotham-400 hover:text-rose-500 hover:bg-rose-950/40 transition-colors ml-1"
                      title="Delete Record"
                      aria-label="Delete Record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 min-h-[44px] text-xs font-mono font-bold rounded-xl bg-slate-100 dark:bg-gotham-800 text-slate-700 dark:text-gotham-200 hover:bg-slate-200 dark:hover:bg-gotham-700"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
