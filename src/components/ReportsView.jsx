import React from 'react';
import SimpleHistoryChart from './SimpleHistoryChart.jsx';

export default function ReportsView({
    analysisData,
    BANKS,
    Banknote,
    BarChart3,
    dashboardMode,
    data,
    daysInMonth,
    Download,
    exportData,
    formatCurrency,
    Heart,
    PieChart,
    setPricesModal,
    Sparkles,
    TrendingUp,
    Trophy,
    viewMode,
    Wallet
}) {
    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="glass-card text-white p-5 rounded-3xl shadow-lg relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 p-6 opacity-5"><Heart size={120} /></div>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 relative z-10 uppercase tracking-wider">
                    <Sparkles className="text-yellow-400" />
                    {dashboardMode === 'statement' ? 'Saude do Mes' : 'Raio-X Patrimonial'}
                </h3>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                    {dashboardMode === 'statement' ? (
                        <>
                            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-slate-500">
                                <p className="text-xs text-slate-300 font-bold uppercase mb-1">Taxa de Poupanca</p>
                                <p className={`text-xl font-extrabold ${data.analysis.health.savingsRate > 20 ? 'text-emerald-400' : data.analysis.health.savingsRate > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                                    {data.analysis.health.savingsRate.toFixed(0)}%
                                </p>
                                <p className="text-xs text-slate-400">Meta ideal: &gt;20%</p>
                            </div>
                            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-slate-500">
                                <p className="text-xs text-slate-300 font-bold uppercase mb-1">Poder de Aporte</p>
                                <p className="text-xl font-extrabold text-indigo-400">
                                    {data.analysis.health.investRate.toFixed(0)}%
                                </p>
                                <p className="text-xs text-slate-400">da renda foi investida</p>
                            </div>
                            <div className="col-span-2 bg-white/5 p-3 rounded-2xl border border-slate-500 flex justify-between items-center mt-1">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase">
                                        {viewMode === 'joint' ? 'Custo p/ Pessoa' : 'Sobras (Saldo)'}
                                    </p>
                                    <p className="text-lg font-bold text-white">
                                        {viewMode === 'joint' ? formatCurrency(data.exp / 2) : formatCurrency(data.bal)}
                                    </p>
                                </div>
                                <div className="h-8 w-[1px] bg-white/10"></div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Custo de Vida/Dia</p>
                                    <p className="text-lg font-bold text-white">{formatCurrency(data.analysis.health.burnRate / daysInMonth)}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="col-span-2 bg-gradient-to-r from-slate-800/60 to-slate-900/60 p-4 rounded-2xl border border-slate-700 shadow-lg mb-2">
                                {viewMode === 'joint' ? (
                                    <>
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-2">
                                            <Trophy size={12} className="text-yellow-400" /> Total Acumulado (Casal)
                                        </p>
                                        <p className="text-2xl font-extrabold text-white tracking-tight">
                                            {formatCurrency(data.investData.totalCurrent)}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Total bruto em carteira (Sem descontar gastos)
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-2">
                                            <Wallet size={12} /> Patrimonio Global (Pessoal)
                                        </p>
                                        <p className="text-2xl font-extrabold text-white tracking-tight">
                                            {formatCurrency(data.analysis.health.totalNetWorth)}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Saldo em Conta ({formatCurrency(data.previousBalance + data.bal)}) + Investimentos ({formatCurrency(data.investData.totalCurrent)})
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-slate-500">
                                <p className="text-xs text-slate-300 font-bold uppercase mb-1">Liberdade Fin.</p>
                                <p className="text-xl font-extrabold text-amber-400">
                                    {data.analysis.health.freedom.toFixed(2)}%
                                </p>
                                <p className="text-xs text-slate-400">Pagos por dividendos</p>
                            </div>
                            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-slate-500">
                                <p className="text-xs text-slate-300 font-bold uppercase mb-1">Sobrevivencia</p>
                                <p className="text-xl font-extrabold text-emerald-400">
                                    {data.analysis.health.coverage.toFixed(1)} <span className="text-sm font-normal text-slate-300">meses</span>
                                </p>
                                <p className="text-xs text-slate-400">Sem renda ativa</p>
                            </div>

                            <div className="col-span-2 mt-2 bg-slate-800/40 rounded-2xl border border-slate-500 overflow-hidden relative">
                                <div className="flex justify-between items-center p-3 pb-2 border-b border-slate-500">
                                    <p className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1.5 tracking-wider">
                                        <TrendingUp size={14} className="text-indigo-400" /> Rentabilidade
                                    </p>
                                    <button onClick={() => setPricesModal(true)} className="p-1.5 -mr-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-yellow-400 transition-colors">
                                        <Sparkles size={14} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 relative h-20">
                                    <div className="absolute left-1/2 top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

                                    <div className="flex flex-col justify-center items-center hover:bg-white/[0.02] transition-colors relative">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-wider">Capital</span>
                                        <div className="flex flex-col items-center">
                                            <span className={`text-sm font-bold ${data.investData.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {data.investData.profit >= 0 ? '+' : ''}{formatCurrency(data.investData.profit)}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-medium">({data.investData.yieldPct.toFixed(1)}%)</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center items-center bg-white/[0.02] relative group cursor-default">
                                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className="text-[10px] text-indigo-300/80 font-bold uppercase mb-1 tracking-wider flex items-center gap-1">
                                            Total <Sparkles size={8} className="text-amber-400" />
                                        </span>
                                        <div className="flex flex-col items-center relative z-10">
                                            <span className={`text-base font-extrabold ${data.investData.profit + (data.investData.totalDividends || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {data.investData.profit + (data.investData.totalDividends || 0) >= 0 ? '+' : ''}{formatCurrency(data.investData.profit + (data.investData.totalDividends || 0))}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                ({data.investData.totalInvested > 0 ? (((data.investData.profit + (data.investData.totalDividends || 0)) / data.investData.totalInvested) * 100).toFixed(1) : '0.0'}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {dashboardMode === 'statement' ? (
                    <>
                        <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                            <p className="text-xs text-emerald-400 font-bold uppercase mb-1">Entradas</p>
                            <p className="text-lg font-extrabold text-emerald-100">{formatCurrency(data.inc)}</p>
                        </div>
                        <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                            <p className="text-xs text-rose-400 font-bold uppercase mb-1">Saidas Totais</p>
                            <p className="text-lg font-extrabold text-rose-100">{formatCurrency(data.analysis.health.totalOutflows)}</p>
                            <p className="text-xs text-rose-300/70 font-bold">(Despesas + Aportes)</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
                            <p className="text-xs text-indigo-400 font-bold uppercase mb-1">Aporte Mes</p>
                            <p className="text-lg font-extrabold text-indigo-100">{formatCurrency(data.analysis.health.strictScopeInv)}</p>
                        </div>
                        <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                            <p className="text-xs text-amber-400 font-bold uppercase mb-1">Dividendos</p>
                            <p className="text-lg font-extrabold text-amber-100">{formatCurrency(data.investData.dividends || 0)}</p>
                        </div>
                    </>
                )}
            </div>

            <div className="glass-card p-5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-white uppercase tracking-wider"><BarChart3 className="text-indigo-400" /> Evolucao (6 Meses)</h3>
                <SimpleHistoryChart data={data.analysis.history} mode={dashboardMode} viewMode={viewMode} formatCurrency={formatCurrency} />
            </div>

            <div className="glass-card p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white uppercase tracking-wider">
                    <Banknote className="text-indigo-400" />
                    {dashboardMode === 'statement' ? 'Fluxo de Contas' : 'Carteira por Corretora (Custo)'}
                </h3>
                <div>
                    {Object.entries(analysisData.bankFlow).sort(([, a], [, b]) => b - a).map(([bankName, value], i, arr) => (
                        <div key={i} className={`flex justify-between items-center py-3 ${i < arr.length - 1 ? 'border-b border-slate-600' : ''}`}>
                            <span className="text-sm text-slate-300 font-bold">{BANKS.find((bank) => bank.id === bankName)?.name || bankName}</span>
                            <span className={`text-sm font-bold ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{value > 0 ? '+' : ''}{formatCurrency(value)}</span>
                        </div>
                    ))}
                    {Object.keys(analysisData.bankFlow).length === 0 && <p className="text-slate-500 text-xs">Sem dados para este periodo.</p>}
                </div>
            </div>

            <div className="glass-card p-5">
                <h3 className="font-bold flex gap-2 mb-4 text-white uppercase tracking-wider">
                    <PieChart size={20} className="text-indigo-400" />
                    {dashboardMode === 'statement' ? 'Maiores Despesas' : 'Alocacao por Tipo'}
                </h3>
                {analysisData.charts.length > 0 ? analysisData.charts.map((chart, i, arr) => (
                    <div key={i} className={`py-3 ${i < arr.length - 1 ? 'border-b border-slate-600' : ''}`}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex gap-2 items-center"><span className="text-lg">{chart.icon}</span><span className="text-sm font-bold text-slate-300">{chart.name}</span></div>
                            <span className="font-bold text-xs text-white">{formatCurrency(chart.amount)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-700/50 rounded-full"><div className={`h-full rounded-full ${chart.color}`} style={{ width: `${chart.pct}%` }} /></div>
                    </div>
                )) : <p className="text-slate-500 text-xs">Sem dados para exibir.</p>}
            </div>

            <button onClick={exportData} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Download size={18} /> Exportar Relatorio Excel</button>
        </div>
    );
}
