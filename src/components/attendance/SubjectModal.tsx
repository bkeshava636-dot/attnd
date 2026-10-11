import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import type { Subject, ClassType } from '../../types';
import { calculateFromPercentage } from './ManualAdjustModal';
import { Percent, Hash } from 'lucide-react';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: Subject) => Promise<void>;
  subjectToEdit?: Subject | null;
  totalSubjects: number;
}

const COLOR_PALETTES = [
  '#eab308', // bat gold
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#64748b', // slate
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjectToEdit,
  totalSubjects,
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<ClassType>('lecture');
  const [color, setColor] = useState('#eab308');
  const [initialPresent, setInitialPresent] = useState('0');
  const [initialAbsent, setInitialAbsent] = useState('0');
  const [isMiddleSemester, setIsMiddleSemester] = useState(false);
  const [baselineMode, setBaselineMode] = useState<'counts' | 'percentage'>('counts');
  const [initialPercentage, setInitialPercentage] = useState('85');
  const [initialTotalClasses, setInitialTotalClasses] = useState('20');

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setShortName(subjectToEdit.shortName);
      setCode(subjectToEdit.code || '');
      setType(subjectToEdit.type);
      setColor(subjectToEdit.color || '#eab308');
      setInitialPresent(subjectToEdit.initialPresent.toString());
      setInitialAbsent(subjectToEdit.initialAbsent.toString());
      const hasBaseline = subjectToEdit.initialPresent > 0 || subjectToEdit.initialAbsent > 0;
      setIsMiddleSemester(hasBaseline);
      if (hasBaseline) {
        const total = subjectToEdit.initialPresent + subjectToEdit.initialAbsent;
        const pct = total > 0 ? Math.round((subjectToEdit.initialPresent / total) * 10000) / 100 : 85;
        setInitialPercentage(pct.toString());
        setInitialTotalClasses(total.toString());
      }
    } else {
      setName('');
      setShortName('');
      setCode('');
      setType('lecture');
      setColor(COLOR_PALETTES[totalSubjects % COLOR_PALETTES.length]);
      setInitialPresent('0');
      setInitialAbsent('0');
      setIsMiddleSemester(false);
      setBaselineMode('counts');
      setInitialPercentage('85');
      setInitialTotalClasses('20');
    }
  }, [subjectToEdit, isOpen, totalSubjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let p = 0;
    let a = 0;
    if (isMiddleSemester) {
      if (baselineMode === 'percentage') {
        const pct = parseFloat(initialPercentage) || 0;
        const tot = parseInt(initialTotalClasses, 10);
        const res = calculateFromPercentage(pct, tot > 0 ? tot : undefined);
        p = res.present;
        a = res.absent;
      } else {
        p = Math.max(0, parseInt(initialPresent, 10) || 0);
        a = Math.max(0, parseInt(initialAbsent, 10) || 0);
      }
    }

    const sub: Subject = {
      id: subjectToEdit?.id || `sub_${Date.now()}`,
      name: name.trim(),
      shortName: shortName.trim() || name.trim().slice(0, 4).toUpperCase(),
      code: code.trim() || undefined,
      type,
      color,
      isActive: subjectToEdit?.isActive ?? true,
      initialPresent: p,
      initialAbsent: a,
      order: subjectToEdit?.order ?? totalSubjects + 1,
      createdAt: subjectToEdit?.createdAt || new Date().toISOString(),
    };

    await onSave(sub);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={subjectToEdit ? 'Edit Subject' : 'Add New Subject'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Subject Name *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!shortName && e.target.value.length <= 6) {
                setShortName(e.target.value.toUpperCase());
              }
            }}
            placeholder="e.g. Database Management Systems"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-bat-gold min-h-[44px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
              Short Code
            </label>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. DBMS"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-bat-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
              Code (Optional)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CS302"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-bat-gold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
              Class Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ClassType)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-bat-gold"
            >
              <option value="lecture">Lecture</option>
              <option value="lab">Lab</option>
              <option value="tutorial">Tutorial</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
              Color Accent
            </label>
            <div className="flex items-center gap-1.5 pt-1">
              {COLOR_PALETTES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-bat-gold ring-offset-2 dark:ring-offset-gotham-900' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Middle of Semester Initial Attendance Option */}
        <div className="pt-2 border-t border-slate-200 dark:border-gotham-750">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isMiddleSemester}
              onChange={(e) => setIsMiddleSemester(e.target.checked)}
              className="w-4 h-4 rounded text-bat-gold focus:ring-bat-gold border-slate-300 dark:border-gotham-700 bg-gotham-900"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-gotham-200">
              Already have existing attendance (mid-semester start)?
            </span>
          </label>

          {isMiddleSemester && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-gotham-900 rounded-xl border border-slate-200 dark:border-gotham-750 space-y-3 font-mono">
              <div className="flex p-0.5 bg-slate-200 dark:bg-gotham-950 rounded-lg border border-slate-300 dark:border-gotham-750 gap-1">
                <button
                  type="button"
                  onClick={() => setBaselineMode('counts')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
                    baselineMode === 'counts'
                      ? 'bg-bat-gold text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-gotham-400'
                  }`}
                >
                  <Hash size={12} />
                  <span>By Class Counts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBaselineMode('percentage')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
                    baselineMode === 'percentage'
                      ? 'bg-bat-gold text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-gotham-400'
                  }`}
                >
                  <Percent size={12} />
                  <span>By Percentage (%)</span>
                </button>
              </div>

              {baselineMode === 'percentage' ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-bat-accent mb-1">
                        OFFICIAL %
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={initialPercentage}
                        onChange={(e) => setInitialPercentage(e.target.value)}
                        placeholder="e.g. 85"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-850 text-slate-900 dark:text-white font-bold min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-gotham-300 mb-1">
                        TOTAL CLASSES
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={initialTotalClasses}
                        onChange={(e) => setInitialTotalClasses(e.target.value)}
                        placeholder="e.g. 20"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-850 text-slate-900 dark:text-white font-bold min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-slate-400">Presets:</span>
                    {[75, 80, 85, 90, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setInitialPercentage(preset.toString())}
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          parseFloat(initialPercentage) === preset
                            ? 'bg-bat-gold/20 text-bat-accent border-bat-gold'
                            : 'bg-white dark:bg-gotham-800 text-slate-500 border-slate-300 dark:border-gotham-700'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      ALREADY ATTENDED
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={initialPresent}
                      onChange={(e) => setInitialPresent(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-850 text-slate-900 dark:text-white font-bold min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                      ALREADY ABSENT
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={initialAbsent}
                      onChange={(e) => setInitialAbsent(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-850 text-slate-900 dark:text-white font-bold min-h-[44px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-gotham-750">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-wider rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 shadow-bat-glow-sm"
          >
            {subjectToEdit ? 'Save Changes' : 'Add Subject'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
