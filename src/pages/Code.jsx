import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
} from 'lucide-react';
import PillButton from '../components/ui/PillButton';
import SnapshotHistoryModal from '../components/ui/SnapshotHistoryModal';
import CodeProjectCard from '../components/ui/CodeProjectCard';
import GitPushReviewModal from '../components/ui/GitPushReviewModal';
import { useCodeProjects } from '../hooks/useCodeProjects';
import { useToast } from '../context/ToastContext';
import { runLocalCodeAction } from '../api/localCodeControl';

export default function Code() {
  const {
    projects,
    loading,
    removeProject,
    getSnapshots,
    error,
    refetch,
    refreshSnapshots,
  } = useCodeProjects();
  const { showToast } = useToast();

  const [activeProjectForSnapshots, setActiveProjectForSnapshots] = useState(null);
  const [pushReview, setPushReview] = useState(null);
  const [busyProjectId, setBusyProjectId] = useState(null);
  const [pushActivity, setPushActivity] = useState(null);
  const pushReviewRequestRef = useRef(0);

  useEffect(() => {
    if (!activeProjectForSnapshots) return undefined;
    const refresh = () => refreshSnapshots(activeProjectForSnapshots.id).catch((err) => showToast(err.message, 'error'));
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [activeProjectForSnapshots, refreshSnapshots, showToast]);

  const handlePush = async (project) => {
    if (busyProjectId) return;
    const requestId = ++pushReviewRequestRef.current;
    setPushReview({ projectId: project.id, projectName: project.name, loading: true });
    setPushActivity({ projectId: project.id, phase: 'reviewing' });
    setBusyProjectId(project.id);
    try {
      const review = await runLocalCodeAction(project.id, 'push-review');
      if (requestId !== pushReviewRequestRef.current) return;
      setPushReview({ ...review, projectId: project.id, projectName: project.name });
      setPushActivity({ projectId: project.id, phase: 'ready' });
    } catch (err) {
      if (requestId !== pushReviewRequestRef.current) return;
      setPushReview({ projectId: project.id, projectName: project.name, error: err.message || 'Could not review this project for push' });
      setPushActivity(null);
    } finally {
      if (requestId === pushReviewRequestRef.current) setBusyProjectId(null);
    }
  };

  const handleClosePushReview = () => {
    if (busyProjectId && !pushReview?.loading) return;
    pushReviewRequestRef.current += 1;
    setPushReview(null);
    setPushActivity(null);
    setBusyProjectId(null);
  };

  const handleToggleWatch = async (project) => {
    if (busyProjectId) return;
    setBusyProjectId(project.id);
    const action = project.watchStatus === 'watching' ? 'pause' : 'watch';
    try {
      await runLocalCodeAction(project.id, action);
      await refetch();
      showToast(action === 'watch' ? `Watching "${project.name}".` : `Paused "${project.name}".`, 'success');
    } catch (err) {
      showToast(err.message || `Could not ${action} this project`, 'error');
    } finally {
      setBusyProjectId(null);
    }
  };

  const handleConfirmPush = async ({ message, warningsAcknowledged }) => {
    if (!pushReview || busyProjectId) return;
    setPushActivity({ projectId: pushReview.projectId, phase: 'pushing' });
    setBusyProjectId(pushReview.projectId);
    try {
      if (pushReview.pendingPush) {
        await runLocalCodeAction(pushReview.projectId, 'push-retry');
      } else {
        await runLocalCodeAction(pushReview.projectId, 'push', {
          reviewId: pushReview.reviewId,
          remote: pushReview.remote,
          message,
          warningsAcknowledged,
        });
      }
      setPushReview(null);
      await refetch();
      setPushActivity({ projectId: pushReview.projectId, phase: 'success' });
      window.setTimeout(() => {
        setPushActivity((current) => current?.projectId === pushReview.projectId && current.phase === 'success' ? null : current);
      }, 1900);
      showToast('Git push completed.', 'success');
    } catch (err) {
      showToast(err.message || 'Git push failed', 'error');
      setPushActivity({ projectId: pushReview.projectId, phase: 'ready' });
      try {
        const next = await runLocalCodeAction(pushReview.projectId, 'push-review');
        setPushReview({ ...next, projectId: pushReview.projectId, projectName: pushReview.projectName });
      } catch { /* Keep the current review visible. */ }
    } finally {
      setBusyProjectId(null);
    }
  };

  const handlePushRemoteChange = async (remote) => {
    if (!pushReview || busyProjectId) return;
    const requestId = ++pushReviewRequestRef.current;
    const previousReview = pushReview;
    setPushReview({ projectId: pushReview.projectId, projectName: pushReview.projectName, loading: true });
    setBusyProjectId(pushReview.projectId);
    try {
      const next = await runLocalCodeAction(pushReview.projectId, 'push-review', { remote });
      if (requestId !== pushReviewRequestRef.current) return;
      setPushReview({ ...next, projectId: pushReview.projectId, projectName: pushReview.projectName });
    } catch (err) {
      if (requestId !== pushReviewRequestRef.current) return;
      setPushReview(previousReview);
      showToast(err.message || 'Could not review this Git remote', 'error');
    } finally {
      if (requestId === pushReviewRequestRef.current) setBusyProjectId(null);
    }
  };

  const handleRemoveProject = async (project) => {
    try {
      if (project.watchStatus === 'watching' || project.watchStatus === 'stale') {
        await runLocalCodeAction(project.id, 'pause');
      }
      await removeProject(project.id);
      showToast(`Removed "${project.name}" from the dashboard. The local shadow repository remains.`, 'info');
    }
    catch (err) { showToast(err.message || 'Could not remove project', 'error'); }
  };

  return (
    <div className="flex flex-col gap-6">

      {error && <div role="alert" className="dm-notice">Code projects could not be loaded: {error} <button className="ml-2 underline" onClick={() => refetch().catch(() => {})}>Retry</button></div>}
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted font-medium">
          {projects.length} tracked projects with shadow snapshotting
        </span>

        <PillButton
          variant="solid"
          size="sm"
          icon={Plus}
          onClick={() => showToast('Run dockmore initialize from the project directory to set up local tracking.', 'info')}
        >
          Set Up Project in CLI
        </PillButton>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-sm text-muted">
            Loading code projects...
          </div>
        ) : (
          projects.map((project) => (
            <CodeProjectCard
              key={project.id}
              project={project}
              busy={busyProjectId === project.id}
              pushPhase={pushActivity?.projectId === project.id ? pushActivity.phase : 'idle'}
              onPushToGitHub={handlePush}
              onToggleWatch={handleToggleWatch}
              onViewSnapshots={(proj) => setActiveProjectForSnapshots(proj)}
              onRemoveProject={handleRemoveProject}
            />
          ))
        )}

        
        <button
          type="button"
          onClick={() => showToast('Run dockmore initialize from the project directory to set up local tracking.', 'info')}
          className="group cursor-pointer"
          style={{
            borderRadius: '14px',
            border: '1px solid #D1D1D1',
            background: '#E9E9E9',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '12px',
            minHeight: '260px',
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#8C8C8C';
            e.currentTarget.style.background = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#D1D1D1';
            e.currentTarget.style.background = '#E9E9E9';
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#E9E9E9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#303030',
              transition: 'background 0.15s ease',
            }}
          >
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">Set Up in CLI</h4>
            <p className="text-xs text-muted max-w-[200px] mt-1">
              Run dockmore initialize in the repository directory.
            </p>
          </div>
        </button>
      </div>

      
      
      <SnapshotHistoryModal
        isOpen={Boolean(activeProjectForSnapshots)}
        project={activeProjectForSnapshots}
        snapshots={
          activeProjectForSnapshots
            ? getSnapshots(activeProjectForSnapshots.id)
            : []
        }
        onClose={() => setActiveProjectForSnapshots(null)}
      />
      <GitPushReviewModal
        review={pushReview}
        busy={Boolean(busyProjectId) && !pushReview?.loading}
        onClose={handleClosePushReview}
        onConfirm={handleConfirmPush}
        onRemoteChange={handlePushRemoteChange}
        onRetry={() => handlePush({ id: pushReview.projectId, name: pushReview.projectName })}
      />
    </div>
  );
}
