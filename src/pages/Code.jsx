import React, { useState } from 'react';
import {
  Plus,
  Loader2,
} from 'lucide-react';
import PillButton from '../components/ui/PillButton';
import TrackProjectModal from '../components/ui/TrackProjectModal';
import SnapshotHistoryModal from '../components/ui/SnapshotHistoryModal';
import CodeProjectCard from '../components/ui/CodeProjectCard';
import { useCodeProjects } from '../hooks/useCodeProjects';
import { useToast } from '../context/ToastContext';

export default function Code() {
  const {
    projects,
    loading,
    addProject,
    removeProject,
    pushToGitHub,
    toggleWatch,
    updateProjectBackupAccount,
    getSnapshots,
  } = useCodeProjects();
  const { showToast } = useToast();

  const [showTrackModal, setShowTrackModal] = useState(false);
  const [activeProjectForSnapshots, setActiveProjectForSnapshots] = useState(null);

  const handleTrackProject = async (formData) => {
    const newProj = await addProject(formData);
    showToast(`Started tracking "${newProj.name}" in shadow git`, 'success');
  };

  const handlePush = async (project) => {
    try {
      await pushToGitHub(project.id);
      showToast(
        `Pushed 1 clean commit to GitHub for "${project.name}"`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to push to GitHub', 'error');
    }
  };

  const handleToggleWatch = (project) => {
    toggleWatch(project.id);
  };

  const handleUpdateBackupAccount = (project, accountData) => {
    updateProjectBackupAccount(project.id, accountData);
  };

  const handleRemoveProject = (project) => {
    removeProject(project.id);
    showToast(`Removed "${project.name}" from tracking`, 'info');
  };

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted font-medium">
          {projects.length} tracked projects with shadow snapshotting
        </span>

        <PillButton
          variant="solid"
          size="sm"
          icon={Plus}
          onClick={() => setShowTrackModal(true)}
        >
          Track New Project
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
              onPushToGitHub={handlePush}
              onToggleWatch={handleToggleWatch}
              onViewSnapshots={(proj) => setActiveProjectForSnapshots(proj)}
              onRemoveProject={handleRemoveProject}
              onChangeBackupAccount={handleUpdateBackupAccount}
            />
          ))
        )}

        
        <button
          type="button"
          onClick={() => setShowTrackModal(true)}
          className="group cursor-pointer"
          style={{
            borderRadius: '20px',
            border: '2px dashed #D9D8D6',
            background: 'transparent',
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
            e.currentTarget.style.borderColor = '#8A8785';
            e.currentTarget.style.background = 'rgba(250,250,249,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#D9D8D6';
            e.currentTarget.style.background = 'transparent';
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
            <h4 className="text-sm font-bold text-ink">Track New Project</h4>
            <p className="text-xs text-muted max-w-[200px] mt-1">
              Initialize shadow git snapshots and cloud mirroring for a repo.
            </p>
          </div>
        </button>
      </div>

      
      <TrackProjectModal
        isOpen={showTrackModal}
        onClose={() => setShowTrackModal(false)}
        onTrackProject={handleTrackProject}
      />

      
      <SnapshotHistoryModal
        isOpen={Boolean(activeProjectForSnapshots)}
        project={activeProjectForSnapshots}
        snapshots={
          activeProjectForSnapshots
            ? getSnapshots(activeProjectForSnapshots.id)
            : []
        }
        onClose={() => setActiveProjectForSnapshots(null)}
        onPushToGitHub={handlePush}
      />
    </div>
  );
}
