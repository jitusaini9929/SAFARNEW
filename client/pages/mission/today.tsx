import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Target,
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  RefreshCcw,
  Sparkles,
  Zap,
  Activity,
  History,
  ShieldAlert,
  Flame,
  LayoutDashboard
} from 'lucide-react';

const userFirstName = "Aspirant";
const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const examCountdownDays = 45;

const navigationItems = [
  { name: 'Today', active: true, icon: LayoutDashboard },
  { name: 'Mission Plan', active: false, icon: Target },
  { name: 'Revision', active: false, icon: RefreshCcw },
  { name: 'Mocks', active: false, icon: Activity },
  { name: 'Progress', active: false, icon: TrendingUp },
];

const TopNavigation = () => (
  <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-8 border-b border-slate-800 pb-4">
    {navigationItems.map(item => (
      <button key={item.name} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${item.active ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
        <item.icon className="w-4 h-4" />
        {item.name}
      </button>
    ))}
  </div>
);

const BacklogBanner = ({ backlogState }: { backlogState: any }) => {
  if (!backlogState || !backlogState.isBehind) return null;
  return (
    <div className="mb-8 w-full bg-red-950/40 border border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
          <ShieldAlert className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h3 className="text-red-400 font-bold text-sm md:text-base">You are slipping behind</h3>
          <p className="text-red-300/80 text-xs mt-0.5">{backlogState.tasksSkipped} tasks skipped • {backlogState.revisionsOverdue} revisions overdue.</p>
        </div>
      </div>
      <button className="mt-4 md:mt-0 w-full md:w-auto px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-colors text-sm shrink-0 whitespace-nowrap">
        Rebuild Plan Now
      </button>
    </div>
  );
};

const TodayHeader = () => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 space-y-4 md:space-y-0">
    <div>
      <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
        Good morning, {userFirstName} <Sparkles className="w-6 h-6 text-yellow-400" />
      </h1>
      <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-semibold">{todayDate}</p>
    </div>
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-3 backdrop-blur-md shadow-inner flex items-center gap-4">
      <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-400/30">
        <Target className="w-5 h-5 text-indigo-400" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Final Exam</p>
        <p className="text-lg font-bold text-white"><span className="text-indigo-400">{examCountdownDays}</span> Days left</p>
      </div>
    </div>
  </div>
);

const ReadinessSnapshotCard = ({ readinessData }: { readinessData: any }) => {
  if (!readinessData) return null;
  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex shrink-0 items-center justify-center">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" />
            <motion.circle 
              initial={{ strokeDasharray: "0 251.2" }}
              animate={{ strokeDasharray: `${(readinessData.score / 100) * 251.2} 251.2` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
              className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" 
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black text-white">{readinessData.score}</span>
          </div>
        </div>
        
        <div className="flex-1 text-center md:text-left w-full">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">Readiness Snapshot</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30">
              {readinessData.band}
            </span>
          </div>
          <p className="text-slate-300 text-sm">{readinessData.reason}</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button className="text-sm bg-slate-800 hover:bg-white hover:text-black py-2 px-4 rounded-xl font-bold transition-all mx-auto md:mx-0 shadow-lg">
              See Why Score Changed
              </button>
              <button className="text-sm text-green-400 hover:text-green-300 font-semibold flex items-center justify-center gap-1 transition-colors mx-auto md:mx-0">
              View full progress <ArrowRight className="w-4 h-4" />
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActiveSessionBanner = ({ activeTask }: { activeTask: any }) => {
  if (!activeTask) return null;
  return (
    <div className="mb-6 w-full bg-blue-900/20 border-2 border-blue-500/40 rounded-3xl p-5 backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center group">
       <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />
       
       <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex flex-col items-center justify-center border border-blue-500/30 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <Flame className="w-6 h-6 animate-pulse" />
        </div>
        <div>
            <p className="text-xs uppercase tracking-widest font-bold text-blue-400 mb-1">Active Session</p>
            <h3 className="text-lg font-bold text-white leading-tight">{activeTask.topic_name}</h3>
            <p className="text-xs text-blue-300/80 font-medium">Focusing deeply</p>
        </div>
       </div>

       <button className="mt-4 md:mt-0 relative z-10 w-full md:w-auto px-8 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2">
            <PlayCircle className="w-5 h-5" /> Resume Session
       </button>
    </div>
  );
};

const TaskMetadataBadge = ({ origin, isHighPriority }: { origin: string, isHighPriority: boolean }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {isHighPriority && <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">High Priority</span>}
      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-700/50 text-slate-400 border border-slate-600/50">
        {origin?.replace(/_/g, ' ')}
      </span>
    </div>
  );
};

const TaskStatusBadge = ({ status, isRevision }: { status: string, isRevision: boolean }) => {
  return (
    <div className="flex gap-2">
        {isRevision && <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">REV</span>}
        {status === 'in_progress' ? 
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30"><PlayCircle className="w-3 h-3" /> In Progress</span> :
            status === 'done' ? 
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30"><CheckCircle2 className="w-3 h-3" /> Done</span> :
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-700/50 text-slate-300 border border-slate-600/50">To Do</span>
        }
    </div>
  );
};

const TodayMissionCardStack = ({ topTasks = [] }: { topTasks: any[] }) => {
  const activeTask = topTasks.find(t => t.status === 'in_progress');
  const mainCtaText = activeTask ? `Resume ${activeTask.topic_name}` : "Start First Task";

  return (
    <div className="flex flex-col h-full gap-4">
      <ActiveSessionBanner activeTask={activeTask} />

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" /> Today's Mission Sequence
          </h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            {topTasks.reduce((acc, t) => acc + (t.estimated_minutes || 0), 0)} mins total
          </span>
        </div>
        
        <div className="space-y-4 flex-1">
          {topTasks.map((task) => {
            const isActive = task.status === 'in_progress';
            return (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                key={task.id} 
                className={`p-5 rounded-2xl border ${isActive ? 'bg-blue-950/30 border-blue-500/40 opacity-50' : 'bg-slate-800/80 border-slate-700/60'} transition-all`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <TaskMetadataBadge origin={task.source} isHighPriority={task.priority === 'high'} />
                    <h3 className={`text-lg font-bold ${isActive ? 'text-blue-200' : 'text-white'}`}>{task.topic_name}</h3>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{task.subject}</p>
                    
                    <div className="flex items-center gap-3 mt-4">
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-bold bg-slate-900/50 px-2 py-1 rounded-md"><Clock className="w-3 h-3" /> {task.estimated_minutes}m</span>
                      <TaskStatusBadge status={task.status} isRevision={task.task_type === 'revision'} />
                    </div>
                  </div>

                  {!isActive && (
                      <button className="shrink-0 ml-4 px-4 py-2 mt-2 rounded-xl bg-slate-700 text-white font-bold hover:bg-white hover:text-black transition-colors text-sm border border-slate-600 hover:border-white">
                        Start Task
                      </button>
                  )}
                </div>
                {/* Productive Density Block */}
                {!isActive && task.nextAction && (
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs">
                    <p className="text-slate-400 font-medium">Outcome: <span className="text-slate-300">{task.nextAction}</span></p>
                </div>
                )}
              </motion.div>
            )
          })}
        </div>
        
        {topTasks.length > 0 && (
            <button className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-lg transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]">
            {mainCtaText}
            </button>
        )}
      </div>
    </div>
  );
};

const RevisionDueCard = ({ revisionDue = [] }: { revisionDue: any[] }) => {
  if (revisionDue.length === 0) return null;
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <RefreshCcw className="w-5 h-5 text-amber-400" /> Revision Queue
        </h2>
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
          {revisionDue.length} Actionable
        </span>
      </div>
      <div className="space-y-4">
        {revisionDue.map((rev: any) => (
          <div key={rev.id} className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex flex-col gap-3">
            <div>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{rev.subject}</span>
                  {rev.risk_level === 'high' ? (
                  <span className="text-[10px] text-red-300 bg-red-900/30 px-2 py-0.5 rounded font-bold border border-red-800/50 flex items-center gap-1"><AlertOctagon className="w-3 h-3"/> URGENT</span>
                  ) : (
                  <span className="text-[10px] text-amber-300 bg-amber-900/30 px-2 py-0.5 rounded font-bold border border-amber-800/50 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> DUE</span>
                  )}
                </div>
                <p className="text-base font-bold text-white leading-tight">{rev.topic_name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                    <p className={`text-xs font-bold ${rev.risk_level === 'high' ? 'text-red-400' : 'text-amber-400'}`}>• {rev.due_reason}</p>
                    <span className="text-xs text-slate-400 font-medium">({rev.estimated_minutes} mins)</span>
                </div>
            </div>
            <button className={`w-full py-2 rounded-xl text-sm font-bold transition-colors ${
                rev.riskLevel === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-black'
            }`}>
                Revise Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockRecoveryCard = ({ mockRecoveryContext }: { mockRecoveryContext: any }) => {
  if (!mockRecoveryContext) return null;
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md mt-6 h-full flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="mb-4 relative z-10">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" /> Mock Recovery
        </h2>
        <p className="text-xs text-emerald-400 font-bold mt-1 uppercase tracking-widest">{mockRecoveryContext.activePlan}</p>
      </div>

      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 mb-5 relative z-10">
          <p className="text-sm font-medium text-slate-300 leading-relaxed italic border-l-2 border-emerald-500 pl-3">
              "{mockRecoveryContext.diagnosis}"
          </p>
      </div>

      <div className="space-y-3 relative z-10 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Today's Repair Sessions</p>
        {mockRecoveryContext.repairActions?.map((action: any) => (
          <div key={action.id} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">{action.topic}</p>
              <p className="text-xs text-slate-400 mt-0.5">{action.type} • {action.suggestedMinutes}m</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-auto relative z-10">
          <button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors">
              Start Recovery
          </button>
          <button className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-600 transition-colors text-sm">
              3-Day Plan
          </button>
      </div>
    </div>
  );
};


export default function SafarVictoryModeToday() {
  const [missionData, setMissionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Safar Victory Mode | Today";
    fetch('/api/mission/today')
      .then(res => res.json())
      .then(data => {
         setMissionData(data);
         setLoading(false);
      })
      .catch(err => {
         console.error(err);
         setLoading(false);
      });
  }, []);

  if (loading) {
    return (
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="flex flex-col items-center gap-4">
                <Target className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Mission Control...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] relative selection:bg-indigo-500/30 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient light effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10 w-full h-full">
        <TopNavigation />
        <TodayHeader />
        
        {missionData?.backlog_alert && (
            <BacklogBanner backlogState={missionData.backlog_alert} />
        )}
        
        <div className="mb-6">
          <ReadinessSnapshotCard readinessData={missionData?.readiness_snapshot} />
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pb-12">
          
          {/* Main Mission Column */}
          <div className="lg:col-span-8 flex flex-col h-full">
            <TodayMissionCardStack topTasks={missionData?.tasks || []} />
          </div>

          {/* Side Panels Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <RevisionDueCard revisionDue={missionData?.due_revisions} />
            <MockRecoveryCard mockRecoveryContext={missionData?.active_recovery} />
          </div>

        </div>
      </main>
    </div>
  );
}
