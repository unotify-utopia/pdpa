import React, { useState, useEffect } from 'react';
import type { User, RopaMasterData, RopaActivity } from '../types';
import RopaDashboard from './RopaDashboard';
import RopaBuilder from './RopaBuilder';
import { Loader2 } from 'lucide-react';


interface RopaManagerProps {
  activeUser: User;
}

export default function RopaManager({ activeUser }: RopaManagerProps) {
  const [view, setView] = useState<'dashboard' | 'builder' | 'detail'>('dashboard');
  const [masterData, setMasterData] = useState<RopaMasterData | null>(null);
  const [activities, setActivities] = useState<RopaActivity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [masterRes, activitiesRes] = await Promise.all([
        fetch('http://localhost:3001/api/ropa/master-data', { headers }),
        fetch('http://localhost:3001/api/ropa/activities', { headers })
      ]);
      
      const masterDataRes = await masterRes.json();
      const activitiesDataRes = await activitiesRes.json();

      if (masterDataRes.success) setMasterData(masterDataRes.data);
      if (activitiesDataRes.success) setActivities(activitiesDataRes.data);
    } catch (error) {
      console.error("Failed to fetch RoPA data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedActivityId(null);
    setView('builder');
  };

  const handleEdit = (id: string) => {
    setSelectedActivityId(id);
    setView('builder');
  };

  const handleBack = () => {
    fetchData();
    setView('dashboard');
  };

  if (loading || !masterData) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col relative">
      {view === 'dashboard' && (
        <RopaDashboard 
          activeUser={activeUser}
          activities={activities}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onRefresh={fetchData}
        />
      )}
      
      {view === 'builder' && (
        <RopaBuilder 
          activeUser={activeUser}
          masterData={masterData}
          activityId={selectedActivityId}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
