import React from 'react';
import { filterCardInvoiceItemForPayment, isCardExpenseTransaction } from '../domain/finance/cashflow.js';

export default function HomeView(props) {
    const {
        activeBar,
        analysisData,
        ArrowRightLeft,
        Banknote,
        BarChart3,
        Briefcase,
        Check,
        CheckCircle,
        ChevronDown,
        data,
        dashboardMode,
        deleteSelected,
        expandedTxId,
        extratoMode,
        Eye,
        EyeOff,
        fSettleBank,
        formatCurrency,
        handlePayCardInvoice,
        handleEdit,
        handleQuickDividend,
        handleQuickInvest,
        hideValues,
        isForecast,
        ListIcon,
        listFilterBank,
        listFilterSearch,
        listFilterType,
        Minus,
        PieChart,
        Plus,
        profile,
        Search,
        selectedIds,
        selectedMonth,
        selectionMode,
        setSelectedAssetHistory,
        setActiveBar,
        setExpandedTxId,
        setExtratoMode,
        setFSettleBank,
        setHideValues,
        setIsForecast,
        setListFilterBank,
        setListFilterSearch,
        setListFilterType,
        setPricesModal,
        setSelectedIds,
        setSelectionMode,
        setSettleAmount,
        settleAmount,
        settleDebt,
        tab,
        toggleSelection,
        Trash2,
        TrendingDown,
        TrendingUp,
        uniqueBanks,
        USER_CONFIG,
        Users,
        viewMode,
        FIXED_INCOME_CATEGORIES,
        X
    } = props;

    return (
        <>
                    {tab === 'home' && (
                        <div className="pt-4 mb-2 relative z-20 shrink-0 animate-fade-in">
                            {/* --- NOVO LAYOUT HERO (Imagem 5) --- */}
                            <div className="px-1 relative z-10">

                                {/* 1. LABEL SUPERIOR + CONTROLES */}
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm text-slate-400 font-normal uppercase tracking-wide">{dashboardMode === 'investment' ? 'Total na Carteira' : 'Saldo Disponível'}</p>

                                    <div className="flex items-center gap-3">
                                        {/* Seletor Real/Previsto (Estilo Texto) */}
                                        <button
                                            onClick={() => setIsForecast(!isForecast)}
                                            className="text-sm text-slate-400 font-normal flex items-center hover:text-white transition-colors"
                                        >
                                            {isForecast ? 'Prev' : 'Real'} <ChevronDown size={14} className="ml-0.5 opacity-70" />
                                        </button>

                                        {/* Olho (Toggle Visibilidade) */}
                                        <button onClick={() => setHideValues(!hideValues)} className="text-slate-400 hover:text-white transition-colors">
                                            {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* 2. SALDO GIGANTE + VARIAÇÃO */}
                                <div className="flex items-baseline gap-3 mb-2">
                                    <h2 className="text-4xl font-bold text-white tracking-tighter drop-shadow-lg">
                                        {hideValues ? '••••••' : (
                                            dashboardMode === 'investment'
                                                ? formatCurrency(data.investData.totalCurrent)
                                                : formatCurrency(data.previousBalance + data.bal)
                                        )}
                                    </h2>

                                    {/* Variação % (Seta + Valor) */}
                                    {!hideValues && (() => {
                                        const investDiff = data.investData.totalCurrent - data.investData.previousTotal;
                                        const investPct = data.investData.previousTotal !== 0
                                            ? (investDiff / data.investData.previousTotal) * 100
                                            : 0;
                                        const isInvestPositive = investDiff >= 0;

                                        return (
                                            <div className={`flex items-center text-lg font-medium ${(dashboardMode === 'statement' ? data.bal >= 0 : isInvestPositive) ? 'text-emerald-500' : 'text-rose-400'}`}>
                                                {(dashboardMode === 'statement' ? data.bal >= 0 : isInvestPositive) ? <TrendingUp size={20} className="mr-1" /> : <TrendingDown size={20} className="mr-1" />}
                                                {dashboardMode === 'statement'
                                                    ? (data.previousBalance !== 0 ? Math.abs((data.bal / data.previousBalance) * 100).toFixed(1) : '0.0')
                                                    : Math.abs(investPct).toFixed(1)
                                                }%
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* 3. SUB-INFORMAÇÕES (Espaçamento Reduzido ao Máximo) */}
                                <div className="space-y-0.5 mb-0">
                                    <p className="text-sm text-slate-300 font-medium">
                                        Mês Anterior: <span className="text-slate-400 font-normal">
                                            {hideValues ? '••••' : formatCurrency(
                                                dashboardMode === 'investment'
                                                    ? data.investData.previousTotal
                                                    : data.previousBalance
                                            )}
                                        </span>
                                    </p>
                                    <p className="text-sm text-slate-300 font-medium">
                                        Mês Atual: <span className={`font-normal ${(dashboardMode === 'investment'
                                            ? (data.investData.totalCurrent - data.investData.previousTotal)
                                            : data.bal) >= 0
                                            ? 'text-emerald-400' : 'text-rose-400'
                                            }`}>
                                            {hideValues ? '••••' : formatCurrency(
                                                dashboardMode === 'investment'
                                                    ? (data.investData.totalCurrent - data.investData.previousTotal)
                                                    : data.bal
                                            )}
                                        </span>
                                    </p>
                                </div>

                                {/* 4. GRID DE RESUMO (Subindo mais para o topo) */}
                                <div className="grid grid-cols-3 border-y border-slate-500 py-3 mt-2 mb-4">
                                    {/* Receita */}
                                    <div className="text-center border-r border-slate-500">
                                        <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Receita</p>
                                        <p className="text-lg font-bold text-emerald-400 tracking-tight">
                                            {hideValues ? '•••' : formatCurrency(data.inc)}
                                        </p>
                                    </div>

                                    {/* Despesa + Extrato */}
                                    <div className="text-center border-r border-slate-500">
                                        <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Despesa</p>
                                        <p className="text-lg font-bold text-rose-400 tracking-tight">
                                            {hideValues ? '•••' : formatCurrency(data.exp)}
                                        </p>
                                        {/* BOTÃO EXTRATO DE VOLTA */}
                                        {/* BOTÃO EXTRATO DE VOLTA */}
                                        <button onClick={() => setExtratoMode(extratoMode === 'list' ? 'chart' : 'list')} className="flex justify-center items-center gap-1 text-xs text-blue-400 mt-1 opacity-80 hover:opacity-100 transition-opacity active:scale-95 w-full">
                                            {extratoMode === 'list' ? 'Ver Gráficos' : 'Ver Extrato'} <ArrowRightLeft size={8} />
                                        </button>
                                    </div>

                                    {/* Investimentos */}
                                    <div className="text-center flex flex-col justify-center">
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                                            {dashboardMode === 'statement' ? 'Aportes Líquidos' : 'Investimentos'}
                                        </p>

                                        {/* Líquido (Grande) */}
                                        <p className="text-lg font-bold text-white tracking-tight leading-none mb-1">
                                            {hideValues ? '•••' : formatCurrency(dashboardMode === 'investment' ? data.investData.totalInvested : ((data.inv || 0) - (data.resg || 0)))}
                                        </p>

                                        {/* Mini breakdown Aporte/Resgate */}
                                        <div className="flex justify-center gap-1 text-[9px] font-bold">
                                            <span className="text-indigo-400 bg-indigo-500/10 px-1 py-px rounded" title="Aportes">+{hideValues ? '•••' : formatCurrency(dashboardMode === 'investment' ? (data.investData.allTimeInv || 0) : data.inv)}</span>
                                            <span className="text-emerald-400 bg-emerald-500/10 px-1 py-px rounded" title="Resgates">-{hideValues ? '•••' : formatCurrency(dashboardMode === 'investment' ? (data.investData.allTimeResgCost || 0) : data.resg)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BARRA FLUTUANTE DE EXCLUSÃO (Agora com botão Fechar) */}
                    {selectionMode && (
                        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white pl-6 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-4 animate-pop">
                            <span className="font-bold text-sm whitespace-nowrap">{selectedIds.size} selecionados</span>

                            <div className="flex items-center gap-2">
                                <button onClick={deleteSelected} className="flex items-center gap-2 font-bold text-xs bg-rose-800 px-3 py-2 rounded-xl active:scale-95 transition-transform">
                                    <Trash2 size={14} /> Excluir
                                </button>

                                {/* Botão Cancelar/Sair do Modo Seleção */}
                                <button
                                    onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                                    className="w-8 h-8 flex items-center justify-center bg-rose-700 rounded-full hover:bg-rose-800 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- IMPLEMENTAÇÃO ITENS 7 e 8 (CARDS NOSSO NORTE) --- */}
                    {tab === 'home' && dashboardMode === 'statement' && viewMode === 'joint' && (
                        <div className="space-y-4 mb-6 animate-slide-up">

                            {/* ITEM 8: CARD DE ACERTO (Quem deve quem) */}
                            <div className={`p-5 rounded-3xl shadow-sm border relative overflow-hidden ${Math.abs(data.coupleBal) < 1 ? 'bg-emerald-900/20 border-emerald-500/20' : 'bg-slate-900/60 border-indigo-500/20'}`}>
                                <div className="flex justify-between items-center relative z-10">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                                            <ArrowRightLeft size={10} /> Situação do Acerto
                                        </p>
                                        {/* CENÁRIO 1: TUDO QUITADO */}
                                        {Math.abs(data.coupleBal) < 1 ? (
                                            <div className="relative">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-emerald-400 text-sm mb-1">Tudo quitado! 🎉</p>

                                                    {/* SELO DE PAGAMENTO (Só aparece se houve acerto no mês) */}
                                                    {data.list.some(t => t.isSettlement) && (
                                                        <div className="border-[3px] border-emerald-500/40 text-emerald-500 text-[10px] font-black uppercase px-3 py-1 rounded-lg -rotate-12 tracking-widest opacity-80 animate-pop select-none shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-500/5 backdrop-blur-sm transform origin-center">
                                                            Mês Quitado
                                                        </div>
                                                    )}
                                                </div>

                                                {/* HISTÓRICO DO MÊS (Novo Recurso) */}
                                                {data.list.filter(t => t.isSettlement).length > 0 && (
                                                    <div className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded-lg border border-white/5 mt-2 min-w-[200px]">
                                                        <p className="font-bold text-emerald-500 uppercase mb-1 border-b border-white/5 pb-0.5">Histórico do Mês:</p>
                                                        {data.list.filter(t => t.isSettlement).map(t => (
                                                            <div key={t.id} className="flex justify-between gap-4 py-0.5">
                                                                <span>{t.date.split('-')[2]}/{t.date.split('-')[1]} • {t.title.replace(' de Acerto', '')}</span>
                                                                <span className={`font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {formatCurrency(t.amount)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* CENÁRIO 2: DÍVIDA PENDENTE */
                                            <div>
                                                {/* Valor principal: Até o mês selecionado */}
                                                <div className="cursor-pointer group/main" onClick={() => setSettleAmount(Math.abs(data.coupleBal).toFixed(2))}>
                                                    <p className="text-xs text-slate-500 font-bold uppercase mb-0.5 flex items-center gap-1">
                                                        Até {selectedMonth}
                                                        <span className="text-[9px] text-slate-600 opacity-0 group-hover/main:opacity-100 transition-opacity">(toque para preencher)</span>
                                                    </p>
                                                    <p className="text-lg font-extrabold text-white">
                                                        {data.coupleBal > 0 ? 'Você tem a receber' : 'Você deve pagar'}
                                                    </p>
                                                    <p className={`text-2xl font-black ${data.coupleBal > 0 ? 'text-emerald-400' : 'text-rose-400'} group-hover/main:brightness-125 transition-all`}>
                                                        {hideValues ? '••••••' : formatCurrency(Math.abs(data.coupleBal))}
                                                    </p>
                                                </div>
                                                {/* Valor secundário: Dívida Total (incluindo parcelas futuras) */}
                                                {Math.abs(data.totalCoupleBal - data.coupleBal) >= 1 && (
                                                    <div
                                                        className="cursor-pointer group/total mt-1 border-t border-white/5 pt-1"
                                                        onClick={() => setSettleAmount(Math.abs(data.totalCoupleBal).toFixed(2))}
                                                    >
                                                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                                            Dívida Total: <span className={`font-bold ${data.totalCoupleBal > 0 ? 'text-emerald-400' : 'text-rose-400'} group-hover/total:brightness-125 transition-all`}>
                                                                {hideValues ? '••••' : `${data.totalCoupleBal > 0 ? 'Receber' : 'Pagar'} ${formatCurrency(Math.abs(data.totalCoupleBal))}`}
                                                            </span>
                                                            <span className="text-[9px] text-slate-600 opacity-0 group-hover/total:opacity-100 transition-opacity">(toque)</span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* INPUT DE PAGAMENTO PARCIAL */}
                                    {Math.abs(data.coupleBal) >= 1 && (
                                        <div className="flex flex-col gap-2 items-stretch min-w-[140px]">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">R$</span>
                                                <input
                                                    type="number"
                                                    value={settleAmount}
                                                    onChange={e => setSettleAmount(e.target.value)}
                                                    placeholder={Math.abs(data.coupleBal).toFixed(2)}
                                                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-3 pl-8 pr-3 text-right font-bold text-white outline-none focus:border-indigo-500/50 transition-colors text-sm placeholder-slate-600"
                                                />
                                                {/* Banco do acerto — M1 */}
                                                <select
                                                  value={fSettleBank}
                                                  onChange={e => setFSettleBank(e.target.value)}
                                                  className="w-full text-xs font-bold bg-slate-900/50 text-slate-300 p-2 rounded-lg border border-white/10 outline-none mt-2"
                                                >
                                                  <option value="">Conta / Banco (opcional)</option>
                                                  {uniqueBanks.map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                  ))}
                                                </select>
                                            </div>

                                            <button
                                                onClick={settleDebt}
                                                className={`px-4 py-3 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/10
                                            ${data.coupleBal > 0
                                                        ? 'bg-emerald-600 text-white shadow-emerald-500/30 hover:bg-emerald-500' // Emerald para Receber
                                                        : 'bg-indigo-600 text-white shadow-indigo-500/30 hover:bg-indigo-500'}`} // Indigo para Pagar
                                            >
                                                {data.coupleBal > 0 ? <CheckCircle size={16} /> : <Banknote size={16} />}
                                                {data.coupleBal > 0 ? 'Confirmar' : 'Pagar'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ITEM 7: CARD COMPARATIVO (Gastos Ele vs Ela) */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* CARD BRUNO */}
                                <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 ${USER_CONFIG['bruno'].color.replace('bg-', 'bg-opacity-10 bg-').replace('text-white', '')} border-gray-100`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm text-white ${USER_CONFIG['bruno'].color}`}>
                                        {USER_CONFIG['bruno'].avatar}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold uppercase text-gray-400">Bruno gastou</p>
                                        <p className="font-bold text-slate-800">{hideValues ? '•••' : formatCurrency(data.sharedSpends?.bruno || 0)}</p>
                                    </div>
                                </div>

                                {/* CARD MAIARA */}
                                <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 ${USER_CONFIG['maiara'].color.replace('bg-', 'bg-opacity-10 bg-').replace('text-white', '')} border-gray-100`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm text-white ${USER_CONFIG['maiara'].color}`}>
                                        {USER_CONFIG['maiara'].avatar}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold uppercase text-gray-400">Maiara gastou</p>
                                        <p className="font-bold text-slate-800">{hideValues ? '•••' : formatCurrency(data.sharedSpends?.maiara || 0)}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                    {/* --- FIM ITENS 7 e 8 --- */}


                    {tab === 'home' && dashboardMode === 'statement' && (
                        <>
                            {extratoMode === 'list' ? (
                                // AJUSTE: Removemos 'space-y-4' e adicionamos o estilo de Container Único (borda única, fundo único)
                                <div className="animate-fade-in -mt-4 bg-slate-900/40 rounded-3xl overflow-hidden shadow-sm">
                                    {/* BANNER DE FATURA (só no mês da fatura, com Previsão ON) */}
                                        {(() => {
                                            // Busca em fullList (todas as datas) pois a compra está no mês da compra,
                                            // não no mês da fatura. O helper também respeita o escopo pessoal/compartilhado.
                                            const cardItems = data.fullList.filter(t =>
                                                t.invoiceMonth === selectedMonth &&
                                                filterCardInvoiceItemForPayment(t, { profile, viewMode })
                                            );
                                        if (!isForecast || cardItems.length === 0) return null;
                                        const total = cardItems.reduce((s, t) => s + Number(t.amount), 0);
                                        return (
                                            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-sky-500/10 border-b border-sky-500/20">
                                                <div className="flex items-center gap-2 text-sky-300 text-xs font-bold">
                                                    <span>💳</span>
                                                    <span>Fatura {selectedMonth}: <span className="text-white">{formatCurrency(total)}</span></span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handlePayCardInvoice(selectedMonth)}
                                                    className="shrink-0 px-3 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all hover:bg-sky-400 shadow">
                                                    Pagar Agora
                                                </button>
                                            </div>
                                        );
                                    })()}
                                    {(() => {
                                        const filteredList = (data?.list || []).filter(t => {
                                            if (listFilterType !== 'all' && t.type !== listFilterType) return false;
                                            if (listFilterBank !== 'all' && t.bank !== listFilterBank) return false;
                                            if (listFilterSearch.trim()) {
                                                const q = listFilterSearch.toLowerCase();
                                                const match = (t.title || '').toLowerCase().includes(q)
                                                    || (t.category || '').toLowerCase().includes(q)
                                                    || (t.market || '').toLowerCase().includes(q);
                                                if (!match) return false;
                                            }
                                            return true;
                                        });

                                        return (
                                            <>
                                                {/* FILTRO DE LISTA */}
                                                <div className="flex flex-col gap-2 mb-3">
                                                    {/* Linha 1: busca por texto */}
                                                    <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2 border border-white/20">
                                                        <Search size={14} className="text-slate-400 shrink-0" />
                                                        <input
                                                            type="text"
                                                            value={listFilterSearch}
                                                            onChange={e => setListFilterSearch(e.target.value)}
                                                            placeholder="Buscar por título, categoria ou local..."
                                                            className="bg-transparent text-sm text-white outline-none w-full placeholder-slate-500"
                                                        />
                                                        {listFilterSearch && (
                                                            <button onClick={() => setListFilterSearch('')} className="text-slate-400 hover:text-white">
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {/* Linha 2: chips de tipo + banco */}
                                                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                                                        {/* Tipo */}
                                                        {[
                                                            { val: 'all',        label: 'Todos' },
                                                            { val: 'expense',    label: '↓ Despesa' },
                                                            { val: 'income',     label: '↑ Receita' },
                                                            { val: 'investment', label: '⟳ Invest.' },
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.val}
                                                                onClick={() => setListFilterType(opt.val)}
                                                                className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                                                                    listFilterType === opt.val
                                                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                                                        : 'bg-white/5 text-slate-400 border-slate-600 hover:bg-white/10'
                                                                }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                        {/* Separador visual */}
                                                        <div className="w-px bg-white/10 shrink-0" />
                                                        {/* Banco — gerado dinamicamente de uniqueBanks */}
                                                        <button
                                                            onClick={() => setListFilterBank('all')}
                                                            className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                                                                listFilterBank === 'all'
                                                                    ? 'bg-indigo-600 text-white border-indigo-500'
                                                                    : 'bg-white/5 text-slate-400 border-slate-600 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            Todos os bancos
                                                        </button>
                                                        {uniqueBanks.map(bank => (
                                                            <button
                                                                key={bank}
                                                                onClick={() => setListFilterBank(bank)}
                                                                className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                                                                    listFilterBank === bank
                                                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                                                        : 'bg-white/5 text-slate-400 border-slate-600 hover:bg-white/10'
                                                                }`}
                                                            >
                                                                {bank}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Linha 3: contador de resultados — só aparece se algum filtro estiver ativo */}
                                                    {(listFilterType !== 'all' || listFilterBank !== 'all' || listFilterSearch.trim()) && (
                                                        <p className="text-xs text-slate-500 text-right">
                                                            {filteredList.length} resultado{filteredList.length !== 1 ? 's' : ''}
                                                            {' '}·{' '}
                                                            <button
                                                                onClick={() => { setListFilterType('all'); setListFilterBank('all'); setListFilterSearch(''); }}
                                                                className="text-indigo-400 hover:text-indigo-300 font-bold"
                                                            >
                                                                limpar filtros
                                                            </button>
                                                        </p>
                                                    )}
                                                </div>
                                                {filteredList.map(t => {
                                                    // Lógica de Long Press (Segurar)
                                        let pressTimer;
                                        const handleIconPressStart = () => {
                                            pressTimer = setTimeout(() => {
                                                if (!selectionMode) {
                                                    setSelectionMode(true);
                                                    toggleSelection(t.id);
                                                }
                                            }, 800);
                                        };
                                        const handleIconPressEnd = () => clearTimeout(pressTimer);

                                        return (
                                            <div key={t.id}
                                                // AJUSTE: Aumentamos contraste da borda e removemos hover de botão
                                                className={`relative flex items-center justify-between p-4 transition-all
                                                    ${selectionMode && selectedIds.has(t.id)
                                                        ? 'bg-indigo-900/50'
                                                        : 'border-b border-slate-600 last:border-0'
                                                    } ${t.isProjection ? 'opacity-50 italic' : ''}`}
                                            >

                                                {/* 1. ÍCONE INTERATIVO */}
                                                <div
                                                    className="relative shrink-0 mr-4 cursor-pointer group"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (selectionMode) toggleSelection(t.id);
                                                        else handleEdit(t);
                                                    }}
                                                    onMouseDown={handleIconPressStart}
                                                    onMouseUp={handleIconPressEnd}
                                                    onTouchStart={handleIconPressStart}
                                                    onTouchEnd={handleIconPressEnd}
                                                >
                                                    {/* Círculo do Ícone (Levemente menor e mais integrado) */}
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90
                                                            ${selectionMode && selectedIds.has(t.id) ? 'bg-indigo-500 text-white' : 'bg-slate-800/80 text-slate-300 group-hover:bg-slate-700'}`}>

                                                        {selectionMode && selectedIds.has(t.id)
                                                            ? <Check size={18} />
                                                            : ((t.type === 'income' || (t.type === 'investment' && Number(t.quantity || 0) < 0)) ? <TrendingUp size={18} className="text-emerald-500" /> :
                                                                t.type === 'investment' ? <PieChart size={18} className="text-indigo-400" /> :
                                                                    t.type === 'p2p' ? <ArrowRightLeft size={18} className="text-blue-400" /> :
                                                                            t.isSettlement ? <ArrowRightLeft size={18} className="text-amber-400" /> :
                                                                        <span className="text-lg">🏷️</span>)
                                                        }
                                                    </div>

                                                    {/* Indicador de "Quem Pagou" */}
                                                    {viewMode === 'joint' && !selectionMode && (
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-slate-900 overflow-hidden z-10">
                                                            {(() => {
                                                                const isCreatorPayer = t.payer === 'me';
                                                                const payerId = isCreatorPayer ? t.ownerId : (t.ownerId === 'bruno' ? 'maiara' : 'bruno');
                                                                const payerConfig = USER_CONFIG[payerId];
                                                                return (
                                                                    <div className={`w-full h-full flex items-center justify-center text-[8px] ${payerConfig?.color || 'bg-gray-500'}`}>
                                                                        {payerConfig?.avatar}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 2. DADOS PRINCIPAIS (AGORA APENAS LEITURA) */}
                                                <div className="flex-1 min-w-0 select-none">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <h4 className={`font-bold text-sm truncate pr-4 flex items-center gap-2 ${t.type === 'expense' ? 'text-slate-100' : 'text-slate-200'}`}>
                                                            {t.isShared && !t.isSettlement && <Users size={14} className="text-indigo-400 shrink-0" />}
                                                            {t.displayTitle || t.title}
                                                        </h4>
                                                        {(() => {
                                                            // p2p: sinal depende de quem pagou (iPaid)
                                                            if (t.type === 'p2p') {
                                                                const iPaid = t.payer === 'me'
                                                                    ? t.ownerId === profile
                                                                    : t.ownerId !== profile;
                                                                return (
                                                                    <span className={`font-bold text-sm whitespace-nowrap ${iPaid ? 'text-rose-400' : 'text-emerald-500'}`}>
                                                                        {iPaid ? '-' : '+'} {formatCurrency(t.amount)}
                                                                    </span>
                                                                );
                                                            }
                                                            const isPositive = t.type === 'income' || (t.type === 'investment' && Number(t.quantity || 0) < 0);
                                                            return (
                                                                <span className={`font-bold text-sm whitespace-nowrap ${isPositive ? 'text-emerald-500' : 'text-rose-400'}`}>
                                                                    {isPositive ? '+' : '-'} {formatCurrency(t.amount)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>

                                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                                        <div className="flex gap-2 truncate items-center">
                                                            <span>{t.date.split('-')[2]}/{t.date.split('-')[1]}</span>
                                                            <span className="opacity-30">•</span>
                                                            <span className="truncate max-w-[150px]">{t.category} {t.subCategory ? `(${t.subCategory})` : ''}</span>
                                                             {isCardExpenseTransaction(t) && t.invoiceMonth && (
                                                                <span className="text-sky-400 shrink-0 whitespace-nowrap">
                                                                    💳 Fat: {(() => { const [y,m] = t.invoiceMonth.split('-'); return new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}); })()}
                                                                </span>
                                                             )}
                                                        </div>
                                                        {t.market && (
                                                            <span className="text-slate-600 truncate max-w-[100px] italic">
                                                                {t.market}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                                })}
                                                {filteredList.length === 0 && (
                                                    <div className="text-center text-slate-500 py-12">
                                                        <ListIcon className="mx-auto mb-3 opacity-20" size={40} />
                                                        <p className="text-sm font-medium opacity-60">Sem movimentações este mês.</p>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                /* --- NOVO MODO: VISÃO GRÁFICA --- */
                                <div className="space-y-4 animate-fade-in -mt-4">

                                    {/* GRÁFICO 1: MAIORES GASTOS (Barras Horizontais) */}
                                    <div className="bg-slate-900/40 rounded-3xl p-5 border border-white/5">
                                        <h3 className="font-bold text-sm text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider"><PieChart size={16} className="text-rose-400" /> {dashboardMode === 'investment' ? 'Por Classe de Ativo' : 'Maiores Gastos'}</h3>
                                        <div className="space-y-3">
                                            {analysisData.charts.map((c, i) => (
                                                <div key={i} className="group">
                                                    <div className="flex justify-between text-xs font-bold mb-1">
                                                        <span className="flex items-center gap-1.5">{c.icon} {c.name}</span>
                                                        <span className="text-rose-400">{formatCurrency(c.amount)}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-1000 ${c.color}`} style={{ width: `${c.pct}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                            {analysisData.charts.length === 0 && <p className="text-xs text-slate-500 text-center">Sem dados suficientes.</p>}
                                        </div>
                                    </div>

                                    {/* GRÁFICO 2: TRANSAÇÕES POR SEMANA (Linhas Múltiplas) */}
                                    <div className="bg-slate-900/40 rounded-3xl p-5 border border-white/5">
                                        <h3 className="font-bold text-sm text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider"><BarChart3 size={16} className="text-indigo-400" /> Fluxo Semanal</h3>

                                        {(() => {
                                            // Agrupamento Semanal Direto (Isolado da Lógica Principal)
                                            const [year, month] = selectedMonth.split('-').map(Number);
                                            const daysInMonthLocal = new Date(year, month, 0).getDate();
                                            const weeks = [1, 2, 3, 4];
                                            const weekData = weeks.map(w => {
                                                const startDay = (w - 1) * 7 + 1;
                                                const endDay = w === 4 ? daysInMonthLocal : w * 7;
                                                const txsInWeek = data.list.filter(t => {
                                                    const day = parseInt(t.date.split('-')[2]);
                                                    return day >= startDay && day <= endDay;
                                                });
                                                return {
                                                    week: w,
                                                    label: `Sem ${w}`,
                                                    exp: txsInWeek.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0),
                                                    inc: txsInWeek.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0),
                                                    inv: txsInWeek.filter(t => t.type === 'investment' && Number(t.quantity || 0) >= 0).reduce((acc, t) => acc + Number(t.amount), 0),
                                                    resg: txsInWeek.filter(t => t.type === 'investment' && Number(t.quantity || 0) < 0).reduce((acc, t) => acc + Number(t.amount), 0),
                                                };
                                            });
                                            const maxVal = Math.max(...weekData.map(d => Math.max(d.exp, d.inc, d.inv)), 1);

                                            return (
                                                <div onClick={() => setActiveBar(null)}>
                                                    {/* Legenda */}
                                                    <div className="flex justify-center flex-wrap gap-4 mb-4 text-xs font-bold">
                                                        <span className="flex items-center gap-1 text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Receita</span>
                                                        <span className="flex items-center gap-1 text-rose-500"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Despesa</span>
                                                        <span className="flex items-center gap-1 text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-400"></span>Aporte</span>
                                                        <span className="flex items-center gap-1 text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Resgate</span>
                                                    </div>

                                                    {/* Gráfico SVG Customizado Interativo */}
                                                    <div className="flex items-end justify-between h-40 pt-4 border-b border-slate-700/50 pb-2 relative">
                                                        {weekData.map((d, i) => {
                                                            const hExp = (d.exp / maxVal) * 100;
                                                            const hInc = (d.inc / maxVal) * 100;
                                                            const hInv = (d.inv / maxVal) * 100;
                                                            const hResg = (d.resg / maxVal) * 100;

                                                            const isIncActive = activeBar && activeBar.index === i && activeBar.type === 'inc';
                                                            const isExpActive = activeBar && activeBar.index === i && activeBar.type === 'exp';
                                                            const isInvActive = activeBar && activeBar.index === i && activeBar.type === 'inv';
                                                            const isResgActive = activeBar && activeBar.index === i && activeBar.type === 'resg';

                                                            return (
                                                                <div key={i} className="flex flex-col items-center flex-1 relative z-10">
                                                                    <div className="w-full flex justify-center items-end gap-1 h-32 relative">
                                                                        {/* Receita */}
                                                                        <div
                                                                            onClick={(e) => { e.stopPropagation(); setActiveBar({ index: i, type: 'inc' }); }}
                                                                            style={{ height: `${hInc}%` }}
                                                                            className={`w-2 rounded-t-sm transition-all duration-300 cursor-pointer ${isIncActive ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)] scale-110' : 'bg-emerald-500 hover:bg-emerald-400'}`}
                                                                        >
                                                                            {isIncActive && <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-emerald-900 border border-emerald-500 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap z-20 animate-pop">{formatCurrency(d.inc)}</div>}
                                                                        </div>
                                                                        {/* Despesa */}
                                                                        <div
                                                                            onClick={(e) => { e.stopPropagation(); setActiveBar({ index: i, type: 'exp' }); }}
                                                                            style={{ height: `${hExp}%` }}
                                                                            className={`w-2 rounded-t-sm transition-all duration-300 cursor-pointer ${isExpActive ? 'bg-rose-300 shadow-[0_0_10px_rgba(253,164,175,0.8)] scale-110' : 'bg-rose-500 hover:bg-rose-400'}`}
                                                                        >
                                                                            {isExpActive && <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-rose-900 border border-rose-500 text-rose-300 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap z-20 animate-pop">{formatCurrency(d.exp)}</div>}
                                                                        </div>
                                                                        {/* Aporte */}
                                                                        <div
                                                                            onClick={(e) => { e.stopPropagation(); setActiveBar({ index: i, type: 'inv' }); }}
                                                                            style={{ height: `${hInv}%` }}
                                                                            className={`w-2 rounded-t-sm transition-all duration-300 cursor-pointer relative ${isInvActive ? 'bg-indigo-300 shadow-[0_0_10px_rgba(165,180,252,0.8)] scale-110 z-20' : 'bg-indigo-500 hover:bg-indigo-400'}`}
                                                                        >
                                                                            {isInvActive && <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-indigo-900 border border-indigo-500 text-indigo-300 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap z-30 animate-pop">{formatCurrency(d.inv)}</div>}
                                                                        </div>
                                                                        {/* Resgate (Nova Coluna Lateral) */}
                                                                        <div
                                                                            onClick={(e) => { e.stopPropagation(); setActiveBar({ index: i, type: 'resg' }); }}
                                                                            style={{ height: `${hResg}%` }}
                                                                            className={`w-2 rounded-t-sm transition-all duration-300 cursor-pointer relative ${isResgActive ? 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.8)] scale-110 z-20' : 'bg-amber-500 hover:bg-amber-400'}`}
                                                                        >
                                                                            {isResgActive && <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-amber-900 border border-amber-500 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap z-30 animate-pop">-{formatCurrency(d.resg)}</div>}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs text-slate-500 font-bold mt-2">{d.label}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'home' && dashboardMode === 'investment' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Distribuição por Instituição */}
                            <div className="glass-card p-5">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white uppercase tracking-wider"><Briefcase className="text-indigo-400" /> Por Instituição</h3>
                                <div className="space-y-3">
                                    {Object.entries(data.investData.byBank || {}).sort(([, a], [, b]) => b - a).map(([name, val], i) => (
                                        <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-800/50 border border-white/5">
                                            <span className="font-bold text-sm text-slate-200">{name}</span>
                                            <span className="font-bold text-sm text-indigo-400">{formatCurrency(val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Distribuição por Tipo */}
                            <div className="glass-card p-5">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white uppercase tracking-wider"><PieChart className="text-indigo-400" /> Por Classe de Ativo</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(data.investData.byType || {}).sort(([, a], [, b]) => b - a).map(([name, val], i) => (
                                        <div key={i} className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                            <p className="text-xs font-bold text-indigo-300 uppercase mb-1">{name}</p>
                                            <p className="font-bold text-slate-200">{formatCurrency(val)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Minha Carteira (Migrado) */}
                            <div className="glass-card p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2 text-white uppercase tracking-wider"><PieChart className="text-indigo-400" /> Minha Carteira</h3>
                                    <button onClick={(e) => { e.stopPropagation(); setPricesModal(true); }} className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
                                        Atualizar Cotações
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {data.investData.portfolio.map((asset, i) => {
                                        // CORREÇÃO: Usa pureBalance em Renda Fixa para não causar Falsa Rentabilidade Negativa
                                        const isRF = FIXED_INCOME_CATEGORIES.includes(asset.category);
                                        const baseCalc = isRF ? asset.pureBalance : asset.totalCost;
                                        const assetProfit = asset.currentTotal - baseCalc;
                                        const assetYield = baseCalc > 0 ? (assetProfit / baseCalc) * 100 : 0;

                                        return (
                                            <div 
                                                key={i} 
                                                className="flex justify-between items-center border-b border-slate-600 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-white/5 transition-colors p-2 -mx-2 rounded-lg"
                                                onClick={() => setSelectedAssetHistory(asset.name)}
                                            >
                                                <div>
                                                    <p className="font-bold text-sm text-slate-200 flex items-center gap-2">
                                                        {asset.name}
                                                        {(asset.qty > 0 || (FIXED_INCOME_CATEGORIES.includes(asset.category) && asset.pureBalance > 0)) && (
                                                            <div className="flex bg-slate-800 rounded-lg border border-white/5 overflow-hidden">
                                                                <button onClick={(e) => { e.stopPropagation(); handleQuickInvest(asset.name, false); }} className="px-2 py-0.5 hover:bg-indigo-500 hover:text-white transition-colors text-slate-400 text-xs flex items-center justify-center border-r border-white/5" title="Aportar +"><Plus size={10} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleQuickInvest(asset.name, true); }} className="px-2 py-0.5 hover:bg-rose-500 hover:text-white transition-colors text-slate-400 text-xs flex items-center justify-center border-r border-white/5" title="Resgatar -"><Minus size={10} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleQuickDividend(asset.name); }} className="px-2 py-0.5 hover:bg-emerald-500 hover:text-white transition-colors text-slate-400 text-xs flex items-center justify-center" title="Lançar Rendimento/Dividendo"><Banknote size={10} /></button>
                                                            </div>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {FIXED_INCOME_CATEGORIES.includes(asset.category)
                                                            ? `Custo Líquido: ${formatCurrency(asset.pureBalance)}`
                                                            : ((asset.qty > 0 || asset.totalCost > 0) ? `${asset.qty} cotas • PM ${formatCurrency(asset.avgPrice)}` : 'Saldo Financeiro')
                                                        }
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm text-slate-200">{formatCurrency(asset.currentTotal)}</p>
                                                    {(asset.qty > 0 || isRF) && (
                                                        <div className="flex flex-col items-end">
                                                            {/* Rentabilidade Capital */}
                                                            <span className={`text-xs font-bold ${assetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {assetProfit >= 0 ? '+' : ''}{assetYield.toFixed(1)}% <span className="text-[9px] opacity-70">Cap.</span>
                                                            </span>
                                                            {/* Rentabilidade Total (Se tiver dividendos) */}
                                                            {(asset.dividends || 0) > 0 && (
                                                                <span className={`text-[10px] font-bold ${assetProfit + asset.dividends >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                                                    Total: {((assetProfit + asset.dividends) / baseCalc * 100).toFixed(1)}% <span className="opacity-70">({formatCurrency(assetProfit + asset.dividends)})</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {data.investData.portfolio.length === 0 && <p className="text-center text-slate-400 text-xs py-2">Nenhum ativo na carteira.</p>}
                                </div>
                            </div>
                        </div>
                    )}

        </>
    );
}
