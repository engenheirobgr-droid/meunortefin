import React from 'react';

export default function SettingsModal({
    apiKey,
    appBuildStamp,
    appVersion,
    onApiKeyChange,
    onClose,
    onExportData,
    onResetDatabase,
    onSave,
    Download,
    Key,
    Settings,
    Trash2,
    X
}) {
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-card w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-slide-up relative">
                <div className="flex justify-between mb-6">
                    <h3 className="font-bold text-xl flex gap-2 text-white">
                        <Settings className="text-indigo-400" /> Configuracoes
                    </h3>
                    <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-400 ml-1">Chave API Google (IA)</label>
                        <div className="relative mt-1">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => onApiKeyChange(e.target.value)}
                                placeholder="Cole a chave..."
                                className="w-full bg-slate-800/50 border border-white/10 p-4 pl-10 rounded-xl font-bold outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                            />
                            <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>
                    </div>
                    <button onClick={onSave} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-500 transition-colors">
                        Salvar Configuracao
                    </button>
                    <button onClick={onExportData} className="w-full border border-white/10 text-slate-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                        <Download size={18} /> Exportar Dados (Excel)
                    </button>

                    <div className="px-1">
                        <p className="text-[11px] text-slate-500">
                            Versao {appVersion}
                        </p>
                        <p className="text-[11px] text-slate-600 break-all">
                            Build {appBuildStamp}
                        </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10">
                        <button onClick={onResetDatabase} className="w-full bg-rose-500/10 text-rose-400 border border-rose-500/20 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-colors">
                            <Trash2 size={18} /> Reiniciar Banco de Dados
                        </button>
                        <p className="text-xs text-center text-slate-500 mt-2">Apaga tudo e restaura o padrao de fabrica.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
