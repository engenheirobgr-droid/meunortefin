import React from 'react';

export default function BottomNavigation({
    BarChart3,
    FileText,
    Home,
    importScope,
    menuOpen,
    onFileImport,
    onOpenManual,
    onSetImportScope,
    onSetTab,
    onToggleMenu,
    Sparkles,
    tab,
    Target,
    Wallet
}) {
    return (
        <>
            {menuOpen && (
                <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 items-center animate-pop w-64 px-4">
                    <div className="w-full bg-slate-900/80 backdrop-blur-lg p-3 rounded-2xl border border-white/10 flex flex-col gap-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400 text-center tracking-wider">Ambito da Importacao</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => onSetImportScope('month')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${importScope === 'month' ? 'bg-indigo-600 text-white border-indigo-500 shadow' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}>
                                Mes atual
                            </button>
                            <button type="button" onClick={() => onSetImportScope('all')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${importScope === 'all' ? 'bg-emerald-600 text-white border-emerald-500 shadow' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}>
                                Historico
                            </button>
                        </div>
                    </div>

                    <button onClick={onFileImport} className="w-full bg-slate-800/95 backdrop-blur-lg text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center gap-3 font-bold text-sm active:scale-95 transition-all hover:bg-slate-700">
                        <Sparkles size={20} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                        <span>Arquivo com IA</span>
                    </button>

                    <button onClick={onOpenManual} className="w-full bg-blue-600/95 backdrop-blur-lg text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center gap-3 font-bold text-sm active:scale-95 transition-all hover:bg-blue-500">
                        <FileText size={20} className="text-white" />
                        <span>Lancar Manual</span>
                    </button>
                </div>
            )}

            <div className="fixed bottom-0 w-full z-40">
                <div className="h-6 bg-gradient-to-t from-[#0f172a] to-transparent pointer-events-none absolute bottom-full w-full"></div>
                <div className="bg-[#0f172a] border-t border-white/10 pb-2 pt-2 px-6 shadow-2xl">
                    <div className="grid grid-cols-5 items-end relative">
                        <button onClick={() => onSetTab('home')} className={`flex flex-col items-center gap-0.5 group ${tab === 'home' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                            <div className={`p-1 rounded-full transition-all ${tab === 'home' ? 'bg-emerald-400/10' : ''}`}>
                                <Wallet size={18} strokeWidth={tab === 'home' ? 2.5 : 2} className="group-active:scale-90 transition-transform" />
                            </div>
                            {tab === 'home' && <span className="text-[8px] font-medium tracking-wide opacity-90 animate-fade-in">Norte</span>}
                        </button>

                        <button onClick={() => onSetTab('chores')} className={`flex flex-col items-center gap-0.5 group ${tab === 'chores' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                            <div className={`p-1 rounded-full transition-all ${tab === 'chores' ? 'bg-emerald-400/10' : ''}`}>
                                <Home size={18} strokeWidth={tab === 'chores' ? 2.5 : 2} className="group-active:scale-90 transition-transform" />
                            </div>
                            {tab === 'chores' && <span className="text-[8px] font-medium tracking-wide opacity-90 animate-fade-in">Casa</span>}
                        </button>

                        <div className="relative -top-6 flex justify-center">
                            <button onClick={onToggleMenu} className={`w-14 h-14 rounded-full flex items-center justify-center relative shadow-2xl shadow-black/50 transition-all duration-500 ${menuOpen ? 'scale-105' : 'active:scale-95 hover:-translate-y-0.5'}`}>
                                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border-[1.5px] border-slate-500"></div>
                                <div className={`relative w-10 h-10 transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${menuOpen ? 'rotate-[225deg]' : 'rotate-0'}`}>
                                    <svg viewBox="0 0 100 100" className={`w-full h-full drop-shadow-[0_0_3px_rgba(16,185,129,0.3)] transition-colors duration-500 ${menuOpen ? 'text-emerald-400' : 'text-slate-300'}`}>
                                        <path d="M50 10 L58 42 L90 50 L58 58 L50 90 L42 58 L10 50 L42 42 Z" fill="currentColor" opacity="0.9" />
                                        <path d="M50 10 L58 42 L50 50 Z" fill="#ef4444" />
                                        <path d="M50 10 L42 42 L50 50 Z" fill="#b91c1c" />
                                        <path d="M50 50 L65 35 L50 50 L80 65 L50 50 L35 80 L50 50 L20 35 Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                                        <circle cx="50" cy="50" r="4" fill="#0f172a" stroke="currentColor" strokeWidth="1.5" />
                                    </svg>
                                </div>
                            </button>
                        </div>

                        <button onClick={() => onSetTab('planning')} className={`flex flex-col items-center gap-0.5 group ${tab === 'planning' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                            <div className={`p-1 rounded-full transition-all ${tab === 'planning' ? 'bg-emerald-400/10' : ''}`}>
                                <Target size={18} strokeWidth={tab === 'planning' ? 2.5 : 2} className="group-active:scale-90 transition-transform" />
                            </div>
                            {tab === 'planning' && <span className="text-[8px] font-medium tracking-wide opacity-90 animate-fade-in">Metas</span>}
                        </button>

                        <button onClick={() => onSetTab('reports')} className={`flex flex-col items-center gap-0.5 group ${tab === 'reports' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                            <div className={`p-1 rounded-full transition-all ${tab === 'reports' ? 'bg-emerald-400/10' : ''}`}>
                                <BarChart3 size={18} strokeWidth={tab === 'reports' ? 2.5 : 2} className="group-active:scale-90 transition-transform" />
                            </div>
                            {tab === 'reports' && <span className="text-[8px] font-medium tracking-wide opacity-90 animate-fade-in">Analise</span>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
