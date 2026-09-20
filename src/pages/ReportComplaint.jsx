import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import AddJourneyModal from '../components/common/AddJourneyModal';
import { journeyService } from '../services/journeyService';
import { referenceService } from '../services/referenceService';
import { complaintService } from '../services/complaintService';
import { attachmentService } from '../services/attachmentService';

const ReportComplaint = () => {
  const [searchParams] = useSearchParams();
  const preJourneyId = searchParams.get('journeyId') || '';
  const { user, t } = useAuth();
  const navigate = useNavigate();

  const [journeys, setJourneys] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form states
  const [journeyId, setJourneyId] = useState(preJourneyId);
  const [departmentCode, setDepartmentCode] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [journeyModalOpen, setJourneyModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [journeysRes, deptsRes] = await Promise.all([
        journeyService.getAll(),
        referenceService.getDepartments()
      ]);
      if (journeysRes.success) setJourneys(journeysRes.data.journeys || []);
      if (deptsRes.success) setDepartments(deptsRes.data.departments || []);
    } catch (err) {
      console.error("Failed to fetch reference data", err);
      setError("Failed to load required data. Please try again later.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update category options when department changes
  const selectedDept = departments.find(d => d.code === departmentCode);
  const permittedCategories = selectedDept?.permittedCategories || [];

  useEffect(() => {
    if (permittedCategories.length > 0 && !permittedCategories.includes(category)) {
      setCategory(permittedCategories[0]);
    }
  }, [departmentCode, permittedCategories, category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!journeyId || !departmentCode || !category || !title || !description) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const incidentDateTime = new Date().toISOString();

      const payload = {
        journeyId,
        departmentCode,
        category,
        title,
        description,
        incidentDateTime
      };

      const res = await complaintService.create(payload);
      
      if (res.success) {
        const complaintId = res.data.complaint._id || res.data.complaint.id;
        
        // If there is an attachment, upload it
        if (photo) {
          try {
            await attachmentService.upload(complaintId, photo);
          } catch (uploadErr) {
            console.error("Failed to upload attachment", uploadErr);
            // Optionally notify user that complaint was created but attachment failed
          }
        }
        
        navigate(`/track?id=${complaintId}`);
      }
    } catch (err) {
      console.error("Failed to create complaint", err);
      setError(err.message || "Failed to submit grievance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-margin py-8">
      {/* Header card */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-xl mb-8 transition-colors">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed dark:bg-orange-950 text-on-primary-fixed dark:text-orange-200 text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          {t('lodgeGrievanceBadge')}
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white tracking-tight">
          {t('lodgeGrievanceHeader')}
        </h1>
        <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium mt-1">
          {t('lodgeGrievanceNotice')}
        </p>
      </div>

      {loadingData ? (
        <div className="text-center py-10">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-4">refresh</span>
          <p className="text-on-surface dark:text-white font-bold text-sm">Loading form data...</p>
        </div>
      ) : journeys.length === 0 ? (
        /* A complaint is always filed against a journey the passenger owns, so
           explain the blocker rather than silently disabling the form. */
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-lg text-center transition-colors">
          <span className="material-symbols-outlined text-4xl text-primary mb-3">train</span>
          <h2 className="text-base font-extrabold text-on-surface dark:text-white mb-2">
            No journey found. Add a journey to report a grievance.
          </h2>
          <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium mb-5 max-w-md mx-auto">
            Every grievance is linked to one of your journeys, so we can route it to the right
            department and track it against your travel record.
          </p>
          <button
            type="button"
            onClick={() => setJourneyModalOpen(true)}
            className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>{t('addJourneyBtn', 'Add Journey')}</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-lg space-y-6 transition-colors">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}
          
          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">Select Journey</label>
            <select
              required
              value={journeyId}
              onChange={(e) => setJourneyId(e.target.value)}
              className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
            >
              <option value="">Select a journey</option>
              {journeys.map(j => (
                <option key={j._id} value={j._id}>
                  {new Date(j.travelDate).toLocaleDateString()} - {j.trainId?.trainName} ({j.boardingStationId?.code} to {j.destinationStationId?.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">Department</label>
              <select
                required
                value={departmentCode}
                onChange={(e) => setDepartmentCode(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
              >
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('categoryLabel')}</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!departmentCode || permittedCategories.length === 0}
                className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all disabled:opacity-50"
              >
                <option value="">Select Category</option>
                {permittedCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('issueHeadlineLabel')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AC unit blowing warm air above berth 24"
              className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('detailedDescLabel')}</label>
            <textarea
              rows="4"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('detailedDescPlaceholder')}
              className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl p-4 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
            ></textarea>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('uploadPhotoLabel')}</label>
            <div className="relative flex items-center bg-surface-container-low dark:bg-slate-800 border border-dashed border-outline dark:border-slate-700 rounded-2xl px-4 py-2.5 cursor-pointer hover:bg-surface-container dark:hover:bg-slate-750 transition-colors">
              <span className="material-symbols-outlined text-outline dark:text-slate-400 text-[20px] mr-2">cloud_upload</span>
              <span className="text-xs font-bold text-on-surface-variant dark:text-slate-300 truncate">
                {photo ? photo.name : t('photoPlaceholder')}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setPhoto(e.target.files[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-extrabold text-sm py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">send</span>
            )}
            <span>{submitting ? 'Submitting...' : t('submitGrievanceBtn') + ' \u2192'}</span>
          </button>
        </form>
      )}

      <AddJourneyModal
        isOpen={journeyModalOpen}
        onClose={() => setJourneyModalOpen(false)}
        onCreated={(journey) => {
          setJourneyModalOpen(false);
          // Preselect the journey that was just created, then refresh so the
          // dropdown label carries the populated train/station names.
          setJourneyId(journey._id);
          fetchData();
        }}
      />
    </div>
  );
};

export default ReportComplaint;
