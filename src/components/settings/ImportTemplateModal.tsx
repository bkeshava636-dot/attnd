import React, { useState, useEffect } from 'react';
import {
  Upload,
  Check,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Clock,
  BookOpen,
  CalendarDays,
  FileCheck,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import type { ClassSetupTemplate, TemplateApplyOptions } from '../../types';

interface ImportTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: ClassSetupTemplate | null;
}

export const ImportTemplateModal: React.FC<ImportTemplateModalProps> = ({
  isOpen,
  onClose,
  initialTemplate,
}) => {
  const { applyClassTemplate } = useApp();

  const [template, setTemplate] = useState<ClassSetupTemplate | null>(initialTemplate || null);
  const [rawPastedJson, setRawPastedJson] = useState('');
  const [applyOptions, setApplyOptions] = useState<TemplateApplyOptions>({
    applySemesterSettings: true,
    applySubjectsAndTimetable: true,
    applyClassTimings: true,
    applySaturdayRules: true,
    applyAcademicEvents: true,
    applyHolidays: true,
    preserveExistingAttendance: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate);
      setApplyOptions({
        applySemesterSettings: !!initialTemplate.semesterSettings,
        applySubjectsAndTimetable: !!(initialTemplate.subjects && initialTemplate.subjects.length > 0),
        applyClassTimings: !!initialTemplate.classTimingSettings,
        applySaturdayRules: !!(initialTemplate.saturdayRules && initialTemplate.saturdayRules.length > 0),
        applyAcademicEvents: !!(initialTemplate.academicEvents && initialTemplate.academicEvents.length > 0),
        applyHolidays: !!(initialTemplate.holidays && initialTemplate.holidays.length > 0),
        preserveExistingAttendance: true,
      });
      setErrorMessage(null);
    } else {
      setTemplate(null);
    }
  }, [initialTemplate, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed.isTemplate) {
          throw new Error('Selected file is not an Attnd Class Setup Template.');
        }
        setTemplate(parsed);
        setApplyOptions({
          applySemesterSettings: !!parsed.semesterSettings,
          applySubjectsAndTimetable: !!(parsed.subjects && parsed.subjects.length > 0),
          applyClassTimings: !!parsed.classTimingSettings,
          applySaturdayRules: !!(parsed.saturdayRules && parsed.saturdayRules.length > 0),
          applyAcademicEvents: !!(parsed.academicEvents && parsed.academicEvents.length > 0),
          applyHolidays: !!(parsed.holidays && parsed.holidays.length > 0),
          preserveExistingAttendance: true,
        });
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleParsePastedJson = () => {
    if (!rawPastedJson.trim()) return;
    try {
      const parsed = JSON.parse(rawPastedJson.trim());
      if (!parsed.isTemplate) {
        throw new Error('Pasted content is not an Attnd Class Setup Template.');
      }
      setTemplate(parsed);
      setApplyOptions({
        applySemesterSettings: !!parsed.semesterSettings,
        applySubjectsAndTimetable: !!(parsed.subjects && parsed.subjects.length > 0),
        applyClassTimings: !!parsed.classTimingSettings,
        applySaturdayRules: !!(parsed.saturdayRules && parsed.saturdayRules.length > 0),
        applyAcademicEvents: !!(parsed.academicEvents && parsed.academicEvents.length > 0),
        applyHolidays: !!(parsed.holidays && parsed.holidays.length > 0),
        preserveExistingAttendance: true,
      });
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid JSON format.');
    }
  };

  const handleApply = async () => {
    if (!template) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await applyClassTemplate(template, applyOptions);
      alert('Class setup template applied successfully!');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to apply template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={template ? 'Apply Class Template' : 'Import Class Template'}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* If no template loaded yet, provide file picker and paste area */}
        {!template && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-gotham-400">
              Load a class setup template file (.json) or paste the template code shared by your classmate.
            </p>

            <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gotham-700 bg-slate-50 dark:bg-gotham-850 text-center">
              <label className="cursor-pointer inline-flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-bat-accent/10 flex items-center justify-center mb-2">
                  <Upload size={20} className="text-bat-accent" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Choose Template File
                </span>
                <span className="text-[11px] text-slate-500 dark:text-gotham-400 mt-0.5">
                  attnd-template-*.json
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-gotham-300 uppercase tracking-wider">
                Or Paste Template JSON
              </label>
              <textarea
                rows={4}
                value={rawPastedJson}
                onChange={e => setRawPastedJson(e.target.value)}
                placeholder='Paste {"isTemplate": true, ...} here'
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-gotham-700 bg-white dark:bg-gotham-900 font-mono text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-bat-accent"
              />
              <button
                type="button"
                onClick={handleParsePastedJson}
                disabled={!rawPastedJson.trim()}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 dark:bg-gotham-800 hover:bg-slate-700 dark:hover:bg-gotham-750 text-xs font-bold text-white transition-all disabled:opacity-50"
              >
                Inspect Template Code
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* If template is loaded, show preview and apply options */}
        {template && (
          <div className="space-y-4">
            {/* Template Header Badge */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gotham-850 border border-slate-200 dark:border-gotham-750 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-bat-accent/10 flex items-center justify-center text-bat-accent font-bold">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {template.templateName}
                    </h4>
                    <span className="text-[10px] text-slate-400 dark:text-gotham-500 font-mono">
                      Exported on {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplate(null)}
                  className="text-[11px] text-bat-accent hover:underline font-medium"
                >
                  Change
                </button>
              </div>

              {template.description && (
                <p className="text-[11px] text-slate-600 dark:text-gotham-300 italic pt-1 border-t border-slate-200 dark:border-gotham-750">
                  "{template.description}"
                </p>
              )}
            </div>

            {/* Select what to apply */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-2">
                Settings To Apply
              </span>

              <div className="space-y-2">
                {template.semesterSettings && (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyOptions.applySemesterSettings}
                      onChange={e =>
                        setApplyOptions(prev => ({
                          ...prev,
                          applySemesterSettings: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Calendar size={13} className="text-bat-accent" /> Semester Settings
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-gotham-400 block mt-0.5">
                        {template.semesterSettings.semesterName} (Target: {template.semesterSettings.defaultTarget}%)
                      </span>
                    </div>
                  </label>
                )}

                {template.subjects && template.subjects.length > 0 && (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyOptions.applySubjectsAndTimetable}
                      onChange={e =>
                        setApplyOptions(prev => ({
                          ...prev,
                          applySubjectsAndTimetable: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                        <BookOpen size={13} className="text-blue-400" /> Subjects & Timetable
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-gotham-400 block mt-0.5">
                        {template.subjects.length} subjects & {template.timetable?.length || 0} timetable slots
                      </span>
                    </div>
                  </label>
                )}

                {template.classTimingSettings && (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyOptions.applyClassTimings}
                      onChange={e =>
                        setApplyOptions(prev => ({
                          ...prev,
                          applyClassTimings: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-400" /> Period Timings & Breaks
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-gotham-400 block mt-0.5">
                        {template.classTimingSettings.defaultTiming?.periods?.length || 0} periods, {template.classTimingSettings.defaultTiming?.breaks?.length || 0} breaks
                      </span>
                    </div>
                  </label>
                )}

                {((template.saturdayRules && template.saturdayRules.length > 0) ||
                  (template.dateSpecificSaturdayRules && template.dateSpecificSaturdayRules.length > 0)) && (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyOptions.applySaturdayRules}
                      onChange={e =>
                        setApplyOptions(prev => ({
                          ...prev,
                          applySaturdayRules: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                        <CalendarDays size={13} className="text-purple-400" /> Saturday Working Rules
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-gotham-400 block mt-0.5">
                        {template.saturdayRules?.length || 0} occurrence rules, {template.dateSpecificSaturdayRules?.length || 0} circular dates
                      </span>
                    </div>
                  </label>
                )}

                {template.academicEvents && template.academicEvents.length > 0 && (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyOptions.applyAcademicEvents}
                      onChange={e =>
                        setApplyOptions(prev => ({
                          ...prev,
                          applyAcademicEvents: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                        <FileCheck size={13} className="text-rose-400" /> Academic Events & Exams
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-gotham-400 block mt-0.5">
                        {template.academicEvents.length} calendar events / exam periods
                      </span>
                    </div>
                  </label>
                )}

                {((template.holidays && template.holidays.length > 0) ||
                  (template.dateOverrides && template.dateOverrides.length > 0)) && (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyOptions.applyHolidays}
                      onChange={e =>
                        setApplyOptions(prev => ({
                          ...prev,
                          applyHolidays: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Sparkles size={13} className="text-emerald-400" /> Holidays & Day Shifts
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-gotham-400 block mt-0.5">
                        {template.holidays?.length || 0} holidays, {template.dateOverrides?.length || 0} timetable shift overrides
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Attendance Protection Option (ABSOLUTE DATA SAFETY) */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyOptions.preserveExistingAttendance}
                  onChange={e =>
                    setApplyOptions(prev => ({
                      ...prev,
                      preserveExistingAttendance: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded border-emerald-500 text-emerald-500 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>Preserve My Attendance Records (Recommended)</span>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 leading-relaxed">
                    Safely keeps all your marked attendance history, baseline stats, and personal tasks. Only the schedule and rules will update.
                  </p>
                </div>
              </label>

              {!applyOptions.preserveExistingAttendance && (
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-[11px] flex items-center gap-1.5 mt-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>
                    Warning: Disabling this will erase your past attendance marks and start fresh.
                  </span>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleApply}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-bat-accent hover:bg-bat-accent/90 text-gotham-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Check size={16} />
                <span>{isSubmitting ? 'Applying Template...' : 'Apply Class Template'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-gotham-700 bg-transparent hover:bg-slate-100 dark:hover:bg-gotham-800 text-xs font-bold text-slate-700 dark:text-gotham-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
