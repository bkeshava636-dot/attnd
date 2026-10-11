import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Download,
  Check,
  ShieldCheck,
  Calendar,
  Clock,
  BookOpen,
  CalendarDays,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import type { TemplateIncludeOptions } from '../../types';

interface ShareTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareTemplateModal: React.FC<ShareTemplateModalProps> = ({ isOpen, onClose }) => {
  const {
    semesterSettings,
    subjects,
    timetable,
    classTimingSettings,
    saturdayRules,
    dateSpecificSaturdayRules,
    academicEvents,
    holidays,
    dateOverrides,
    exportClassTemplate,
    shareClassTemplate,
  } = useApp();

  const [templateName, setTemplateName] = useState(
    () => `${semesterSettings?.semesterName || 'Class'} Setup`
  );
  const [description, setDescription] = useState('');
  const [includeOptions, setIncludeOptions] = useState<TemplateIncludeOptions>({
    semesterSettings: true,
    subjectsAndTimetable: true,
    classTimings: true,
    saturdayRules: true,
    academicEvents: true,
    holidays: true,
  });

  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleOption = (key: keyof TemplateIncludeOptions) => {
    setIncludeOptions(prev => ({ ...prev, [key]: !prev[key] }));
    setErrorMessage(null);
  };

  const hasAtLeastOneSelected = Object.values(includeOptions).some(Boolean);

  const handleShare = async () => {
    if (!hasAtLeastOneSelected) {
      setErrorMessage('Please select at least one setting to share.');
      return;
    }
    setIsSharing(true);
    setErrorMessage(null);
    try {
      const template = await exportClassTemplate(
        includeOptions,
        templateName.trim() || 'Class Setup Template',
        description.trim() || undefined
      );
      await shareClassTemplate(template);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to share template');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!hasAtLeastOneSelected) {
      setErrorMessage('Please select at least one setting to share.');
      return;
    }
    setErrorMessage(null);
    try {
      const template = await exportClassTemplate(
        includeOptions,
        templateName.trim() || 'Class Setup Template',
        description.trim() || undefined
      );
      await navigator.clipboard.writeText(JSON.stringify(template, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to copy template code');
    }
  };

  // Summary counts
  const periodsCount = classTimingSettings?.defaultTiming?.periods?.length || 0;
  const breaksCount = classTimingSettings?.defaultTiming?.breaks?.length || 0;
  const satRulesCount = (saturdayRules?.length || 0) + (dateSpecificSaturdayRules?.length || 0);
  const holidayTotalCount = (holidays?.length || 0) + (dateOverrides?.length || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Class Setup Template"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Subtitle / intro */}
        <p className="text-xs text-slate-500 dark:text-gotham-400 leading-relaxed">
          Share your schedule, timings, and rules with your classmates so everyone has the exact same setup in one click.
        </p>

        {/* Template metadata inputs */}
        <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-gotham-850 border border-slate-200 dark:border-gotham-750">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gotham-200 uppercase tracking-wider mb-1">
              Template Title *
            </label>
            <input
              type="text"
              required
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g. 5th Sem CSE - Section A"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gotham-700 bg-white dark:bg-gotham-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-bat-accent focus:ring-1 focus:ring-bat-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-gotham-300 mb-1">
              Note / Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Updated with lab slots and midterm exam schedule"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gotham-700 bg-white dark:bg-gotham-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-bat-accent focus:ring-1 focus:ring-bat-accent"
            />
          </div>
        </div>

        {/* Settings selection list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300">
              Select Settings To Share
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setIncludeOptions({
                    semesterSettings: true,
                    subjectsAndTimetable: true,
                    classTimings: true,
                    saturdayRules: true,
                    academicEvents: true,
                    holidays: true,
                  })
                }
                className="text-[11px] text-bat-accent hover:underline font-medium"
              >
                Select all
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* 1. Semester details */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                includeOptions.semesterSettings
                  ? 'border-bat-accent/50 bg-bat-accent/5 dark:bg-bat-accent/10'
                  : 'border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 opacity-70'
              }`}
            >
              <input
                type="checkbox"
                checked={includeOptions.semesterSettings}
                onChange={() => toggleOption('semesterSettings')}
                className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <Calendar size={13} className="text-bat-accent" />
                  <span>Semester Details</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gotham-400 mt-0.5">
                  Semester designation ({semesterSettings?.semesterName || 'Current'}), start date, target ({semesterSettings?.defaultTarget || 85}%)
                </p>
              </div>
            </label>

            {/* 2. Subjects & Timetable */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                includeOptions.subjectsAndTimetable
                  ? 'border-bat-accent/50 bg-bat-accent/5 dark:bg-bat-accent/10'
                  : 'border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 opacity-70'
              }`}
            >
              <input
                type="checkbox"
                checked={includeOptions.subjectsAndTimetable}
                onChange={() => toggleOption('subjectsAndTimetable')}
                className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <BookOpen size={13} className="text-blue-400" />
                  <span>Subjects & Weekly Timetable</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gotham-400 mt-0.5">
                  {subjects.length} subjects and {timetable.length} weekly timetable slots
                </p>
              </div>
            </label>

            {/* 3. Class Timings */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                includeOptions.classTimings
                  ? 'border-bat-accent/50 bg-bat-accent/5 dark:bg-bat-accent/10'
                  : 'border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 opacity-70'
              }`}
            >
              <input
                type="checkbox"
                checked={includeOptions.classTimings}
                onChange={() => toggleOption('classTimings')}
                className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <Clock size={13} className="text-amber-400" />
                  <span>Class Timings & Breaks</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gotham-400 mt-0.5">
                  {periodsCount > 0 ? `${periodsCount} period timings & ${breaksCount} break slots` : 'Configured period times and intervals'}
                </p>
              </div>
            </label>

            {/* 4. Saturday Rules */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                includeOptions.saturdayRules
                  ? 'border-bat-accent/50 bg-bat-accent/5 dark:bg-bat-accent/10'
                  : 'border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 opacity-70'
              }`}
            >
              <input
                type="checkbox"
                checked={includeOptions.saturdayRules}
                onChange={() => toggleOption('saturdayRules')}
                className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <CalendarDays size={13} className="text-purple-400" />
                  <span>Saturday Rules</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gotham-400 mt-0.5">
                  {satRulesCount} odd/even Saturday rules and circular order mappings
                </p>
              </div>
            </label>

            {/* 5. Academic Events & Exams */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                includeOptions.academicEvents
                  ? 'border-bat-accent/50 bg-bat-accent/5 dark:bg-bat-accent/10'
                  : 'border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 opacity-70'
              }`}
            >
              <input
                type="checkbox"
                checked={includeOptions.academicEvents}
                onChange={() => toggleOption('academicEvents')}
                className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <FileCheck size={13} className="text-rose-400" />
                  <span>Academic Events & Exams</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gotham-400 mt-0.5">
                  {academicEvents.length} calendar events, tests, and exam intervals
                </p>
              </div>
            </label>

            {/* 6. Holidays & Overrides */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                includeOptions.holidays
                  ? 'border-bat-accent/50 bg-bat-accent/5 dark:bg-bat-accent/10'
                  : 'border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900 opacity-70'
              }`}
            >
              <input
                type="checkbox"
                checked={includeOptions.holidays}
                onChange={() => toggleOption('holidays')}
                className="mt-0.5 rounded border-slate-300 text-bat-accent focus:ring-bat-accent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <Sparkles size={13} className="text-emerald-400" />
                  <span>Holidays & Schedule Overrides</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gotham-400 mt-0.5">
                  {holidayTotalCount} college holidays and schedule shift overrides
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Data Privacy Guarantee */}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-snug">
            <strong>Privacy Protected:</strong> Your personal attendance records, baseline marks, and personal tasks are <strong>never</strong> shared.
          </p>
        </div>

        {/* Error notice */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing || !hasAtLeastOneSelected}
            className="w-full py-3 px-4 rounded-xl bg-bat-accent hover:bg-bat-accent/90 text-gotham-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Share2 size={15} />
            <span>{isSharing ? 'Preparing...' : 'Share Template With Class'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!hasAtLeastOneSelected}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-gotham-700 bg-white dark:bg-gotham-850 hover:bg-slate-50 dark:hover:bg-gotham-800 text-xs font-bold text-slate-800 dark:text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-bat-accent" />}
              <span>{isCopied ? 'Copied Code!' : 'Copy Code'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing || !hasAtLeastOneSelected}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-gotham-700 bg-white dark:bg-gotham-850 hover:bg-slate-50 dark:hover:bg-gotham-800 text-xs font-bold text-slate-800 dark:text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Download size={14} className="text-bat-accent" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
