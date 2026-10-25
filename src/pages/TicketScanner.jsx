import React, { useEffect, useMemo, useState } from 'react';
import { aiService } from '../services/aiService';
import { journeyService } from '../services/journeyService';
import { referenceService } from '../services/referenceService';
import Icon from '../components/common/Icon';

const TicketScanner = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [fields, setFields] = useState({});
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const updateField = (key, value) => setFields((current) => ({ ...current, [key]: value }));

  const scan = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    setResult(null);
    try {
      const res = await aiService.scanTicket(file);
      const data = res.data?.data || res.data;
      setResult(data);
      setFields(data?.extracted || {});
    } catch (err) {
      setError(err.message || 'Ticket scanner is currently unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [trainsRes, stationsRes] = await Promise.all([
          referenceService.getTrains(),
          referenceService.getStations(),
        ]);
        setTrains(trainsRes.data?.trains || []);
        setStations(stationsRes.data?.stations || []);
      } catch {
        // Reference data is only required when the passenger chooses to create a journey.
      }
    };
    loadReferences();
  }, []);

  const matchedTrain = useMemo(() => {
    const value = String(fields.trainNumber || '').trim().toLowerCase();
    return trains.find((train) => String(train.trainNumber).toLowerCase() === value);
  }, [fields.trainNumber, trains]);

  const matchedBoarding = useMemo(() => {
    const value = String(fields.source || '').trim().toLowerCase();
    return stations.find((station) =>
      [station.code, station.name].some((candidate) => String(candidate || '').toLowerCase() === value)
    );
  }, [fields.source, stations]);

  const matchedDestination = useMemo(() => {
    const value = String(fields.destination || '').trim().toLowerCase();
    return stations.find((station) =>
      [station.code, station.name].some((candidate) => String(candidate || '').toLowerCase() === value)
    );
  }, [fields.destination, stations]);

  const createJourney = async () => {
    setError(null);
    setMessage(null);

    if (!matchedTrain || !matchedBoarding || !matchedDestination) {
      setError('Please review the train, boarding station, and destination fields and select valid reference records.');
      return;
    }
    if (matchedBoarding._id === matchedDestination._id) {
      setError('Boarding and destination stations must be different.');
      return;
    }
    if (!fields.date) {
      setError('Please enter the journey date.');
      return;
    }

    const parsedDate = fields.date.includes('-')
      ? fields.date
      : (() => {
          const parts = fields.date.split(/[/-]/);
          if (parts.length !== 3) return '';
          const [day, month, year] = parts;
          return `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        })();

    if (!parsedDate || Number.isNaN(Date.parse(parsedDate))) {
      setError('Please correct the journey date.');
      return;
    }

    setCreating(true);
    try {
      const response = await journeyService.create({
        trainId: matchedTrain._id,
        boardingStationId: matchedBoarding._id,
        destinationStationId: matchedDestination._id,
        travelDate: new Date(parsedDate).toISOString(),
        pnr: fields.pnr?.trim() || null,
        coach: fields.coach?.trim() || null,
        seat: fields.seat?.trim() || null,
      });

      if (!response.success) throw new Error('Journey could not be created.');
      setMessage('Journey created successfully. The ticket was not stored.');
    } catch (err) {
      setError(err.message || 'Journey creation failed. Please correct the fields and try again.');
    } finally {
      setCreating(false);
    }
  };

  const editableKeys = ['pnr', 'trainNumber', 'trainName', 'passengerName', 'source', 'destination', 'date', 'coach', 'seat'];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-margin py-8">
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-xl">
        <h1 className="text-xl font-extrabold text-on-surface dark:text-white">Railway Ticket Scanner</h1>
        <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">
          OCR and rule-based extraction only. Review every field before creating a journey.
        </p>

        <div className="mt-6 border border-dashed border-outline rounded-2xl p-8 text-center">
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError(null);
              setMessage(null);
            }}
            className="block mx-auto text-sm dark:text-white"
          />
          <button disabled={!file || loading} onClick={scan} className="mt-5 px-6 py-3 rounded-2xl bg-primary text-on-primary font-extrabold disabled:opacity-50">
            {loading ? 'Scanning…' : 'Scan Ticket'}
          </button>
        </div>

        {error && <div className="mt-5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm font-bold">{error}</div>}
        {message && <div className="mt-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 p-4 rounded-xl text-sm font-bold">{message}</div>}

        {result && (
          <div className="mt-6 bg-surface-container-low dark:bg-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="document_scanner" className="text-primary" />
              <span className="font-extrabold dark:text-white">Review and edit extracted information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {editableKeys.map((key) => (
                <label key={key} className="text-xs font-bold text-on-surface dark:text-slate-200">
                  {key}
                  <input
                    value={fields[key] || ''}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="mt-1 w-full bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant rounded-xl px-3 py-2 text-sm dark:text-white"
                  />
                </label>
              ))}
            </div>

            {(result.warnings || []).map((warning, index) => (
              <p key={index} className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">{warning}</p>
            ))}

            <div className="mt-5 flex flex-col gap-2">
              <p className="text-[11px] font-bold text-primary">
                OCR never creates a journey automatically. The button below is the only journey-creation action.
              </p>
              <button
                type="button"
                disabled={creating || result.status === 'FAILED'}
                onClick={createJourney}
                className="px-6 py-3 rounded-2xl bg-primary text-on-primary font-extrabold disabled:opacity-50"
              >
                {creating ? 'Creating Journey…' : 'Confirm & Create Journey'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketScanner;
