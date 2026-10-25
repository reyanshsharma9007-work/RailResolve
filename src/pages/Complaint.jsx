import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { complaintService } from '../services/complaintService';
import { attachmentService } from '../services/attachmentService';

import Icon from '../components/common/Icon';
const Complaint = () => {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const { user, t } = useAuth();
  const navigate = useNavigate();

  const [complaintData, setComplaintData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const [userRating, setUserRating] = useState(5);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    const fetchComplaint = async () => {
      if (!queryId) {
        setError("No complaint ID provided.");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);

        // The backend looks complaints up by Mongo ObjectId only. Users arrive
        // here with a reference number (RR-…) just as often, so resolve that to
        // an id first via the list endpoint they already have access to.
        let targetId = queryId;
        if (!/^[a-f\d]{24}$/i.test(queryId)) {
          const listRes = await complaintService.getAll({ limit: 100 });
          const match = (listRes?.data?.complaints || []).find(
            (c) => c.referenceNumber?.toLowerCase() === queryId.toLowerCase()
          );
          if (!match) {
            setError(`No grievance found for reference ${queryId}.`);
            setLoading(false);
            return;
          }
          targetId = match._id;
        }

        const res = await complaintService.getById(targetId);
        if (res.success) {
          setComplaintData(res.data);
        } else {
          setError("Failed to load complaint details.");
        }
      } catch (err) {
        console.error("Failed to fetch complaint", err);
        setError("Error loading complaint. You might not have permission to view it.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchComplaint();
  }, [queryId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !complaintData?.complaint) return;
    
    try {
      setSendingMessage(true);
      const res = await complaintService.addComment(complaintData.complaint._id, {
        message: chatInput,
        isInfoRequest: false
      });
      
      if (res.success) {
        // Optimistically update the comments
        const newComment = {
          _id: Date.now().toString(),
          message: chatInput,
          authorId: {
            _id: user?._id || user?.id,
            name: user?.name,
            role: user?.role
          },
          createdAt: new Date().toISOString()
        };
        
        setComplaintData(prev => ({
          ...prev,
          comments: [...prev.comments, newComment]
        }));
        setChatInput('');
      }
    } catch (err) {
      console.error("Failed to send message", err);
      // Could add toast notification here
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!complaintData?.complaint) return;
    
    try {
      setSubmittingFeedback(true);
      const res = await complaintService.close(complaintData.complaint._id, {
        rating: userRating,
        comment: "Closed by passenger"
      });
      
      if (res.success) {
        setFeedbackSubmitted(true);
        // Update local status
        setComplaintData(prev => ({
          ...prev,
          complaint: {
            ...prev.complaint,
            status: 'CLOSED'
          }
        }));
      }
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Icon name="refresh" className="animate-spin text-4xl text-primary mb-4" />
        <p className="text-on-surface dark:text-white font-bold text-sm">Loading grievance details...</p>
      </div>
    );
  }

  if (error || !complaintData || !complaintData.complaint) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-on-surface dark:text-white">{t('noGrievanceFound')}</h2>
        <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-2">
          {error || t('noGrievanceSub')}
        </p>
        <Link to="/" className="mt-4 inline-block px-4 py-2 bg-primary text-on-primary rounded-full text-xs font-bold">
          {t('returnOverview')}
        </Link>
      </div>
    );
  }

  const { complaint, aiAnalysis, statusHistory, comments, attachments } = complaintData;
  const isResolved = complaint.status === 'RESOLVED' || complaint.status === 'CLOSED';
  
  // Transform backend status history to frontend timeline
  const generateTimeline = () => {
    const defaultTimeline = [
      { stage: 'SUBMITTED', title: 'Submitted', time: 'Pending', desc: 'Complaint filed via RailResolve', completed: false, current: false },
      { stage: 'IN_PROGRESS', title: 'Assigned / In Progress', time: 'Pending', desc: 'Working on resolution', completed: false, current: false },
      { stage: 'RESOLVED', title: 'Resolved', time: 'Pending', desc: 'Awaiting passenger confirmation', completed: false, current: false },
      { stage: 'CLOSED', title: 'Closed', time: 'Pending', desc: 'Grievance closed', completed: false, current: false }
    ];
    
    // Map actual history over default timeline
    const stages = ['SUBMITTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const currentStageIndex = stages.indexOf(complaint.status) >= 0 ? stages.indexOf(complaint.status) : 1; // Default to in_progress if other status
    
    return defaultTimeline.map((step, idx) => {
      const historyItem = statusHistory.find(h => h.status === step.stage);
      
      if (historyItem) {
        step.completed = true;
        step.time = new Date(historyItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (historyItem.note) step.desc = historyItem.note;
      }
      
      if (idx === currentStageIndex) {
        step.current = true;
        step.completed = true;
        // Override time with latest update time if we don't have a specific history item
        if (!historyItem) {
          step.time = new Date(complaint.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
      
      return step;
    });
  };

  const timeline = generateTimeline();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-margin py-8">
      {/* Breadcrumb strip */}
      <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant dark:text-slate-400 mb-6">
        <Link to="/" className="hover:text-primary transition-colors">{t('overview')}</Link>
        <span>/</span>
        <span className="text-on-surface dark:text-slate-200">{t('grievanceTelemetryLifecycle')}</span>
        <span>/</span>
        <span className="text-primary font-mono">{complaint.referenceNumber || complaint._id}</span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-xl md:text-2xl font-black text-on-surface dark:text-white tracking-tight">
              {complaint.referenceNumber || complaint._id}
            </span>
            <StatusBadge status={complaint.status} />
            <StatusBadge priority={complaint.priority} />
          </div>
          <h1 className="text-base md:text-lg font-bold text-on-surface dark:text-white">
            {complaint.title}
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium mt-1">
            {t('loggedOn', 'Logged on')} {new Date(complaint.createdAt).toLocaleString()} • {t('categoryLabel')}: <span className="font-bold text-primary">{complaint.category}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-4 py-2 rounded-2xl bg-orange-50 dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-left">
            <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase block">{t('guaranteedSlaTarget')}</span>
            <span className="text-sm font-black text-primary font-mono flex items-center gap-1">
              <Icon name="timer" className="text-[16px]" />
              SLA Tracked
            </span>
          </div>
          <button
            type="button"
            onClick={() => setChatModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Icon name="chat" className="text-[18px]" />
            <span>{t('liveChatCaptain')}</span>
          </button>
        </div>
      </div>

      {/* 5-Step Lifecycle Timeline Stepper */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-lg mb-8 transition-colors">
        <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-6 flex items-center gap-2">
          <Icon name="timeline" className="text-primary text-[20px]" />
          {t('resolutionProgressLifecycle')}
        </h3>

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {timeline.map((step, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  step.current
                    ? 'bg-orange-50/70 dark:bg-orange-950/60 border-primary ring-2 ring-primary/20 shadow-md'
                    : step.completed
                    ? 'bg-surface-container-low dark:bg-slate-800 border-outline-variant/60 dark:border-slate-700'
                    : 'bg-surface-container-lowest dark:bg-slate-900 border-outline-variant/40 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.completed
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container dark:bg-slate-700 text-on-surface-variant dark:text-slate-300'
                    }`}
                  >
                    {step.completed ? '✓' : idx + 1}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-on-surface-variant dark:text-slate-400">
                    {step.time}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-on-surface dark:text-white">{step.title}</h4>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-300 mt-1 leading-snug font-medium">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: Telemetry & Details */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
              <Icon name="description" className="text-primary text-[20px]" />
              {t('detailedDescEvidence')}
            </h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-300 font-medium leading-relaxed mb-4">
              {complaint.description}
            </p>
            <div className="p-4 bg-surface-container-low dark:bg-slate-800 rounded-2xl border border-outline-variant/60 dark:border-slate-700 text-xs">
              <span className="font-bold text-on-surface dark:text-white block mb-2">
                {t('attachmentsPhotos')} ({attachments?.length || 0})
              </span>
              <div className="flex flex-wrap gap-2">
                {(attachments || []).map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => attachmentService.openInNewTab(a._id)}
                    className="text-primary font-bold flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest dark:bg-slate-700 border border-outline-variant/60 dark:border-slate-600 hover:border-primary transition-colors cursor-pointer"
                  >
                    <Icon name="photo_library" className="text-[16px]" />
                    <span className="truncate max-w-[10rem]">{a.originalFilename || t('viewPhotos')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI analysis produced by the FastAPI processing service. It is
              written asynchronously after submission, so PENDING/FAILED are
              both normal states here and must never look like an error. */}
          {aiAnalysis && aiAnalysis.processingStatus === 'SUCCESS' && (
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
                <Icon name="auto_awesome" className="text-primary text-[20px]" />
                AI Analysis
              </h3>
              {aiAnalysis.summary && (
                <p className="text-xs text-on-surface-variant dark:text-slate-300 font-medium leading-relaxed mb-3">
                  {aiAnalysis.summary}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {aiAnalysis.issueType && (
                  <span className="text-[10px] font-bold text-primary bg-primary-fixed dark:bg-orange-950 dark:text-orange-200 px-2.5 py-1 rounded-full">
                    {aiAnalysis.issueType}
                  </span>
                )}
                {(aiAnalysis.keywords || []).map((kw) => (
                  <span
                    key={kw}
                    className="text-[10px] font-bold text-on-surface-variant dark:text-slate-300 bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 px-2.5 py-1 rounded-full"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {aiAnalysis && aiAnalysis.processingStatus === 'PENDING' && (
            <div className="bg-surface-container-low dark:bg-slate-800 p-4 rounded-2xl border border-outline-variant/60 dark:border-slate-700 text-xs font-bold text-on-surface-variant dark:text-slate-300 flex items-center gap-2">
              <Icon name="refresh" className="animate-spin text-[18px] text-primary" />
              AI analysis in progress — refresh in a moment.
            </div>
          )}

          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
              <Icon name="support_agent" className="text-primary text-[20px]" />
              {t('assignedCrewLog')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface-container-low dark:bg-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface dark:text-white">{t('assignedExecutive')}</p>
                  <p className="text-primary font-extrabold">{complaint.assignedOfficerId ? complaint.assignedOfficerId.name : 'Pending Assignment'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setChatModalOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-primary text-on-primary font-bold text-[11px] hover:bg-primary-container transition-colors cursor-pointer"
                >
                  {t('chatNow')}
                </button>
              </div>
              <div className="p-3 bg-surface-container-low dark:bg-slate-800 rounded-xl">
                <p className="font-bold text-on-surface dark:text-white">{t('controlRoom')}</p>
                <p className="text-on-surface-variant dark:text-slate-300 font-medium">{complaint.departmentId?.name || t('controlRoomVal')}</p>
              </div>
            </div>
          </div>

          {/* Feedback Form (Only show if RESOLVED) */}
          {complaint.status === 'RESOLVED' && (
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-2">
                {t('passengerSatisfaction')}
              </h3>
              <p className="text-xs text-on-surface-variant dark:text-slate-300 mb-4 font-medium">
                Please rate your experience to help us improve.
              </p>
              {feedbackSubmitted ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-center">
                  {t('ratingThankYou')}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setUserRating(star)}
                        className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${
                          star <= userRating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitFeedback}
                    disabled={submittingFeedback}
                    className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-full shadow-xs hover:bg-primary-container active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingFeedback ? 'Submitting...' : t('submitRating')}
                  </button>
                </div>
              )}
            </div>
          )}
          {complaint.status === 'CLOSED' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-center mt-4">
              This grievance has been marked as closed. Thank you!
            </div>
          )}
        </div>

        {/* Right 4 Cols: Train & Journey Telemetry */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
              <Icon name="train" className="text-primary text-[20px]" />
              {t('journeyTelemetry')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-outline-variant/40 dark:border-slate-700">
                <span className="text-on-surface-variant dark:text-slate-400">Department</span>
                <span className="font-bold text-on-surface dark:text-white">{complaint.departmentId?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-outline-variant/40 dark:border-slate-700">
                <span className="text-on-surface-variant dark:text-slate-400">Escalated</span>
                <span className="font-bold text-on-surface dark:text-white">{complaint.isEscalated ? 'Yes' : 'No'}</span>
              </div>
              {/* Other journey details would be fetched via populated journey info if available, but backend only populates passenger and department by default in getComplaintById unless we add journey populating */}
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-slate-900 border border-orange-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-xs transition-colors">
            <h4 className="font-extrabold text-on-surface dark:text-white mb-2 flex items-center gap-2">
              <Icon name="headset_mic" className="text-primary" />
              {t('needEmergencyHelp')}
            </h4>
            <p className="text-on-surface-variant dark:text-slate-300 font-medium mb-3">
              {t('emergencyDesc')}
            </p>
            <a
              href="tel:139"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-on-primary font-extrabold shadow-sm hover:bg-primary-container transition-all"
            >
              <Icon name="call" className="text-[18px]" />
              <span>{t('dialRailMadad')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Live Chat Modal */}
      {chatModalOpen && (
        <Modal
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          title={`${t('liveChatHeader')} • ${complaint.referenceNumber || complaint._id}`}
        >
          <div className="flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-surface-container-low dark:bg-slate-800 rounded-2xl mb-4 border border-outline-variant/60 dark:border-slate-700">
              {comments?.length === 0 ? (
                <p className="text-xs text-on-surface-variant dark:text-slate-400 text-center py-8">
                  {t('noMessages')}
                </p>
              ) : (
                comments?.map((msg, idx) => {
                  const isPassenger = msg.authorId?.role === 'PASSENGER' || msg.authorId?._id === (user?._id || user?.id);
                  
                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex flex-col ${
                        isPassenger ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium ${
                          isPassenger
                            ? 'bg-primary text-on-primary rounded-br-none'
                            : msg.isInfoRequest
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-bl-none'
                            : 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface dark:text-white border border-outline-variant/60 dark:border-slate-600 rounded-bl-none'
                        }`}
                      >
                        {!isPassenger && (
                          <span className="text-[10px] font-bold block mb-1 opacity-80">
                            {msg.authorId?.name || 'Support Executive'}
                          </span>
                        )}
                        <p>{msg.message}</p>
                        <span className="text-[9px] opacity-75 mt-1 block text-right">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t('typeMessagePlaceholder')}
                disabled={sendingMessage || isResolved}
                className="flex-1 bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sendingMessage || isResolved || !chatInput.trim()}
                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-2xl hover:bg-primary-container shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {t('sendBtn')}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Complaint;
