import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import useAuth from '../../hooks/useAuth';
import { referenceService } from '../../services/referenceService';
import { journeyService } from '../../services/journeyService';

/**
 * Collects the fields POST /api/journeys requires and creates a real journey.
 * Train and station options come from GET /api/reference/trains and
 * /api/reference/stations — no hardcoded ids anywhere.
 *
 * onCreated(journey) is called with the journey document the backend returned,
 * so the caller can make it selectable immediately without a full refetch.
 */
const AddJourneyModal = ({ isOpen, onClose, onCreated }) => {
  const { t } = useAuth();

  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [refError, setRefError] = useState(null);

  const [trainId, setTrainId] = useState('');
  const [boardingStationId, setBoardingStationId] = useState('');
  const [destinationStationId, setDestinationStationId] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [pnr, setPnr] = useState('');
  const [coach, setCoach] = useState('');
  const [seat, setSeat] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchRefs = async () => {
      try {
        setLoadingRefs(true);
        setRefError(null);
        const [trainsRes, stationsRes] = await Promise.all([
          referenceService.getTrains(),
          referenceService.getStations(),
        ]);
        if (trainsRes.success) setTrains(trainsRes.data.trains || []);
        if (stationsRes.success) setStations(stationsRes.data.stations || []);
      } catch (err) {
        console.error('Failed to load reference data', err);
        setRefError(err.message || 'Could not load trains and stations.');
      } finally {
        setLoadingRefs(false);
      }
    };

    fetchRefs();
  }, [isOpen]);

  const resetForm = () => {
    setTrainId('');
    setBoardingStationId('');
    setDestinationStationId('');
    setTravelDate('');
    setPnr('');
    setCoach('');
    setSeat('');
    setError(null);
    setSuccess(null);
  };

  const validate = () => {
    if (!trainId) return 'Select a train.';
    if (!boardingStationId) return 'Select a boarding station.';
    if (!destinationStationId) return 'Select a destination station.';
    if (boardingStationId === destinationStationId) {
      return 'Boarding and destination stations must be different.';
    }
    if (!travelDate) return 'Select a travel date.';
    if (Number.isNaN(Date.parse(travelDate))) return 'Enter a valid travel date.';
    // PNR is optional on the backend, but if given it should look like one.
    if (pnr && !/^\d{10}$/.test(pnr.trim())) {
      return 'PNR must be 10 digits, or leave it blank.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        trainId,
        boardingStationId,
        destinationStationId,
        // Backend parses this with Date.parse; send a full ISO timestamp.
        travelDate: new Date(travelDate).toISOString(),
        pnr: pnr.trim() || null,
        coach: coach.trim() || null,
        seat: seat.trim() || null,
      };

      const res = await journeyService.create(payload);

      if (res.success && res.data?.journey) {
        setSuccess('Journey added successfully.');
        onCreated?.(res.data.journey);
        resetForm();
        setSuccess('Journey added successfully.');
      } else {
        setError('Journey could not be created. Please try again.');
      }
    } catch (err) {
      console.error('Failed to create journey', err);
      setError(err.message || 'Failed to create journey.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const inputClass =
    'w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('addJourneyTitle', 'Enter Journey Details')}>
      {loadingRefs ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary mb-3">refresh</span>
          <p className="text-on-surface dark:text-white font-bold text-sm">Loading trains and stations...</p>
        </div>
      ) : refError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm font-bold">
          {refError}
        </div>
      ) : trains.length === 0 || stations.length === 0 ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 p-4 rounded-xl text-xs font-bold">
          No trains or stations are available yet. Ask an administrator to run the reference data seed
          (<span className="font-mono">npm run seed</span>) on the Express backend.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs font-bold">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 p-3 rounded-xl text-xs font-bold">
              {success}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
              {t('trainLabel', 'Train')}
            </label>
            <select required value={trainId} onChange={(e) => setTrainId(e.target.value)} className={inputClass}>
              <option value="">Select a train</option>
              {trains.map((tr) => (
                <option key={tr._id} value={tr._id}>
                  {tr.trainNumber} — {tr.trainName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
                {t('boardingStationLabel', 'Boarding Station')}
              </label>
              <select
                required
                value={boardingStationId}
                onChange={(e) => setBoardingStationId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select station</option>
                {stations.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.code} — {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
                {t('destinationStationLabel', 'Destination Station')}
              </label>
              <select
                required
                value={destinationStationId}
                onChange={(e) => setDestinationStationId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select station</option>
                {stations
                  .filter((st) => st._id !== boardingStationId)
                  .map((st) => (
                    <option key={st._id} value={st._id}>
                      {st.code} — {st.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
              {t('travelDateLabel', 'Travel Date')}
            </label>
            <input
              type="date"
              required
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
                {t('pnrNumber')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={pnr}
                onChange={(e) => setPnr(e.target.value)}
                placeholder="2489105839"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
                {t('coachWord')}
              </label>
              <input
                type="text"
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
                placeholder="B4"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
                {t('seatWord')}
              </label>
              <input
                type="text"
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
                placeholder="24"
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant/60 dark:border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-slate-800 rounded-full cursor-pointer"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-extrabold text-on-primary bg-primary hover:bg-primary-container disabled:opacity-50 rounded-full shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">add</span>
              )}
              <span>{submitting ? 'Saving...' : t('addJourneyBtn', 'Add Journey')}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default AddJourneyModal;
