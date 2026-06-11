import React from 'react';

export default function TransactionModal({
    BANKS,
    Banknote,
    Calendar,
    CATEGORIES,
    CheckCircle,
    data,
    FIXED_INCOME_CATEGORIES,
    fAmount,
    fBank,
    fCat,
    fDate,
    fDreamId,
    fInvoiceMonth,
    fIsCard,
    fIsProjection,
    fMarket,
    formPayer,
    formatCurrency,
    fQty,
    fRecurrent,
    fRecurrenceCount,
    fRecurrenceEndDate,
    fRecurrenceEndMode,
    fShared,
    fSubCat,
    fTitle,
    fType,
    fUnitPrice,
    installments,
    isInstallment,
    isSell,
    MapPin,
    onClose,
    onSubmit,
    P2P_CATEGORY,
    PieChart,
    profile,
    RefreshCw,
    setFAmount,
    setFBank,
    setFCat,
    setFDate,
    setFDreamId,
    setFInvoiceMonth,
    setFIsCard,
    setFMarket,
    setFQty,
    setFRecurrent,
    setFRecurrenceCount,
    setFRecurrenceEndDate,
    setFRecurrenceEndMode,
    setFShared,
    setFSubCat,
    setFTitle,
    setFType,
    setFUnitPrice,
    setFormPayer,
    setInstallments,
    setIsInstallment,
    setIsSell,
    Sparkles,
    Tag,
    TrendingDown,
    TrendingUp,
    Type,
    uniqueMarkets,
    uniqueTitles,
    User,
    USER_CONFIG,
    Users,
    viewMode,
    X
}) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end justify-center animate-fade-in">
            <div className="w-full bg-[#1e293b] rounded-t-[2.5rem] p-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-slide-up max-h-[95vh] overflow-y-auto border-t border-white/10">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nova Movimentacao</p>
                        <h3 className="font-bold text-xl text-white flex items-center gap-2">
                            {fType === 'expense' ? <TrendingDown size={20} className="text-rose-500" /> : fType === 'income' ? <TrendingUp size={20} className="text-emerald-500" /> : <PieChart size={20} className="text-indigo-500" />}
                            {fType === 'expense' ? 'Nova Despesa' : fType === 'income' ? 'Nova Receita' : 'Novo Aporte'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><X size={24} /></button>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="bg-[#0f172a] p-1.5 rounded-2xl flex flex-wrap gap-1 relative border border-white/5">
                        {['expense', 'income', 'investment'].map((type) => (
                            <button type="button" key={type} onClick={() => { setFType(type); setFCat(''); setIsSell(false); }} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${fType === type ? (type === 'expense' ? 'bg-rose-600 text-white shadow-lg' : type === 'income' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-indigo-600 text-white shadow-lg') : 'text-slate-500 hover:text-slate-300'}`}>
                                {type === 'expense' ? 'Despesa' : type === 'income' ? 'Receita' : 'Investir'}
                            </button>
                        ))}
                        <button type="button" onClick={() => { setFType('p2p'); setFCat('Empréstimo/Acerto'); setIsSell(false); }} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${fType === 'p2p' ? 'bg-slate-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                            Emprestar/Devolver
                        </button>
                    </div>

                    {fType === 'investment' ? (
                        <div className={`p-4 rounded-3xl border space-y-3 transition-colors ${isSell ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#0f172a] border-white/5'}`}>
                            <div className="flex bg-slate-900/50 p-1 rounded-xl mb-2">
                                <button type="button" onClick={() => setIsSell(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${!isSell ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Comprar (Aporte)</button>
                                <button type="button" onClick={() => setIsSell(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${isSell ? 'bg-amber-500 text-slate-900 shadow' : 'text-slate-500 hover:text-slate-300'}`}>Vender (Resgate)</button>
                            </div>

                            {FIXED_INCOME_CATEGORIES.includes(fCat) ? (
                                <div className="relative py-2">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-600 text-xl">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={fAmount}
                                        onChange={(e) => {
                                            setFAmount(e.target.value);
                                            setFQty(1);
                                            setFUnitPrice(e.target.value);
                                        }}
                                        placeholder="0,00"
                                        className="w-full bg-[#020617] p-5 pl-14 rounded-3xl text-4xl font-black text-white outline-none border border-white/5 placeholder-slate-700 text-center shadow-inner"
                                        required
                                    />
                                    <p className="text-center text-xs text-slate-400 mt-2 font-bold uppercase">Valor Financeiro (Sem Cotas)</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Quantidade</label>
                                            <input type="number" step="0.000001" value={fQty} onChange={(e) => { const q = e.target.value; setFQty(q); if (fUnitPrice) setFAmount((Number(q) * Number(fUnitPrice)).toFixed(2)); }} placeholder="0" className="w-full bg-[#020617] p-3 rounded-xl text-white font-bold outline-none border border-slate-700 focus:border-indigo-500 shadow-inner" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Preco Unit.</label>
                                            <input type="number" step="0.01" value={fUnitPrice} onChange={(e) => { const p = e.target.value; setFUnitPrice(p); if (fQty) setFAmount((Number(fQty) * Number(p)).toFixed(2)); }} placeholder="R$ 0,00" className="w-full bg-[#020617] p-3 rounded-xl text-white font-bold outline-none border border-slate-700 focus:border-indigo-500 shadow-inner" />
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-white/5 flex justify-between items-center px-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Total Estimado</span>
                                        <span className="text-xl font-black text-white">R$ {fAmount || '0.00'}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="relative py-2">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-600 text-xl">R$</span>
                            <input type="number" step="0.01" value={fAmount} onChange={(e) => setFAmount(e.target.value)} placeholder="0,00" className="w-full bg-[#020617] p-5 pl-14 rounded-3xl text-4xl font-black text-white outline-none border border-white/5 placeholder-slate-700 text-center shadow-inner" required />
                        </div>
                    )}

                    <div className="relative">
                        <input type="text" list="marketOptions" value={fMarket} onChange={(e) => setFMarket(e.target.value)} placeholder={fType === 'investment' ? 'Codigo do Ativo (Ex: PETR4, CDB Nubank)' : 'Local / Mercado'} className="w-full bg-[#020617] p-3 pl-10 rounded-xl text-white font-bold text-sm outline-none border border-slate-700 shadow-inner" />
                        {fType === 'investment' ? <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /> : <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />}
                        <datalist id="marketOptions">{uniqueMarkets.map((market) => <option key={market} value={market} />)}</datalist>
                    </div>

                    <div className="relative">
                        <input type="text" list="titleOptions" value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Descricao (ex: Almoco, Salario)" className="w-full bg-[#020617] p-4 pl-12 rounded-xl text-white font-bold outline-none border border-slate-700 focus:border-indigo-500 shadow-inner" required />
                        <Type size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <datalist id="titleOptions">{uniqueTitles.map((title) => <option key={title} value={title} />)}</datalist>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="w-full bg-[#020617] p-3 pl-10 rounded-xl text-white font-bold text-sm outline-none border border-slate-700 shadow-inner" />
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>
                        <div className="flex-1 relative">
                            <input list="bankOptions" value={fBank} onChange={(e) => setFBank(e.target.value)} placeholder="Conta/Banco" className="w-full bg-[#020617] p-3 pl-10 rounded-xl text-white font-bold text-sm outline-none border border-slate-700 shadow-inner" />
                            <Banknote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <datalist id="bankOptions">{BANKS.map((bank) => <option key={bank.id} value={bank.name} />)}</datalist>
                        </div>
                    </div>

                    {fType === 'investment' && data.dreamsProgress.length > 0 && (
                        <div className="relative mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Vincular a um Sonho</label>
                            <div className="relative">
                                <select value={fDreamId} onChange={(e) => setFDreamId(e.target.value)} className="w-full bg-[#020617] p-3 pl-10 rounded-xl text-white font-bold text-sm outline-none border border-slate-700 shadow-inner appearance-none">
                                    <option value="" className="text-slate-500">Nao vincular (Carteira Geral)</option>
                                    {data.dreamsProgress.map((dream) => <option key={dream.id} value={dream.id}>{dream.emoji} {dream.title}</option>)}
                                </select>
                                <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500" />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        <div onClick={() => { if (!fIsProjection) { setFRecurrent(!fRecurrent); setIsInstallment(false); } }} className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all gap-1 ${fIsProjection ? 'opacity-50 cursor-not-allowed bg-slate-800/50 border-slate-700 text-slate-500' : (fRecurrent ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-[#1e293b] border-slate-700 text-slate-500 hover:bg-slate-800')}`}>
                            <div className={`p-2 rounded-full mb-1 ${fRecurrent ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'}`}><RefreshCw size={18} /></div>
                            <span className="text-xs font-bold uppercase">{fIsProjection ? 'Projecao (unica)' : 'Recorrencia'}</span>
                            {fRecurrent && <span className="text-[10px] bg-amber-500 text-slate-900 px-1.5 rounded-full absolute top-2 right-2 font-bold">On</span>}
                        </div>
                        <div onClick={() => setFShared(!fShared)} className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all gap-1 ${fShared ? 'bg-pink-500/10 border-pink-500 text-pink-500' : 'bg-[#1e293b] border-slate-700 text-slate-500 hover:bg-slate-800'}`}>
                            <div className={`p-2 rounded-full mb-1 ${fShared ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{fShared ? <Users size={18} /> : <User size={18} />}</div>
                            <span className="text-xs font-bold uppercase">Divisao</span>
                        </div>
                        <div onClick={() => { setIsInstallment(!isInstallment); setFRecurrent(false); }} className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all gap-1 ${isInstallment ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-[#1e293b] border-slate-700 text-slate-500 hover:bg-slate-800'}`}>
                            <div className={`p-2 rounded-full mb-1 ${isInstallment ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}><Calendar size={18} /></div>
                            <span className="text-xs font-bold uppercase">Parcelado</span>
                            {isInstallment && <span className="text-[10px] bg-blue-500 text-white px-1.5 rounded-full absolute top-2 right-2">{installments}x</span>}
                        </div>
                    </div>

                    {fType === 'expense' && (
                        <div className="animate-slide-up">
                            <div onClick={() => { setFIsCard(!fIsCard); if (!fIsCard && !fInvoiceMonth) { const d = new Date(); d.setMonth(d.getMonth() + 1); setFInvoiceMonth(d.toISOString().slice(0, 7)); } }} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${fIsCard ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-[#1e293b] border-slate-700 text-slate-500 hover:bg-slate-800'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">Cartao</span>
                                    <span className="text-xs font-bold uppercase">Cartao de Credito</span>
                                </div>
                                <div className={`w-8 h-4 rounded-full transition-all relative ${fIsCard ? 'bg-sky-500' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${fIsCard ? 'left-4' : 'left-0.5'}`}></div>
                                </div>
                            </div>
                            {fIsCard && (
                                <div className="mt-2 bg-sky-500/5 border border-sky-500/20 rounded-xl p-3 animate-slide-up">
                                    <p className="text-[10px] font-bold uppercase text-sky-400 mb-2">Mes da Fatura</p>
                                    <select value={fInvoiceMonth} onChange={(e) => setFInvoiceMonth(e.target.value)} className="w-full p-2.5 bg-slate-900/80 rounded-xl text-white text-sm border border-sky-500/30 focus:border-sky-500 outline-none [&>option]:bg-slate-800">
                                        {(() => {
                                            const opts = [];
                                            const now = new Date();
                                            for (let i = 1; i <= 6; i++) {
                                                const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                                                const val = d.toISOString().slice(0, 7);
                                                const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                                opts.push(<option key={val} value={val}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>);
                                            }
                                            return opts;
                                        })()}
                                    </select>
                                    <p className="text-[10px] text-sky-400/60 mt-2">A compra aparece agora, o saldo so cai ao pagar a fatura.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {fRecurrent && (
                        <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 animate-slide-up flex flex-col gap-2 mt-2">
                            <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg">
                                {['forever', 'date', 'count'].map((mode) => (
                                    <button key={mode} type="button" onClick={() => setFRecurrenceEndMode(mode)} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-colors ${fRecurrenceEndMode === mode ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}>
                                        {mode === 'forever' ? 'Sempre' : mode === 'date' ? 'Ate Data' : 'X Vezes'}
                                    </button>
                                ))}
                            </div>

                            {fRecurrenceEndMode === 'date' && (
                                <div className="flex items-center gap-2 animate-fade-in">
                                    <label className="text-xs font-bold text-amber-500/70 uppercase whitespace-nowrap">Ate:</label>
                                    <input type="month" value={fRecurrenceEndDate} onChange={(e) => setFRecurrenceEndDate(e.target.value)} className="w-full bg-slate-900 p-2 rounded-lg text-white font-bold text-xs border border-amber-500/30 outline-none" />
                                </div>
                            )}

                            {fRecurrenceEndMode === 'count' && (
                                <div className="flex items-center gap-2 animate-fade-in">
                                    <label className="text-xs font-bold text-amber-500/70 uppercase whitespace-nowrap">Repetir:</label>
                                    <input type="number" min="2" max="60" value={fRecurrenceCount} onChange={(e) => setFRecurrenceCount(e.target.value)} className="flex-1 bg-slate-900 p-2 rounded-lg text-white font-bold text-xs border border-amber-500/30 outline-none text-center" />
                                    <span className="text-xs font-bold text-amber-500/70">meses</span>
                                </div>
                            )}
                        </div>
                    )}

                    {isInstallment && (
                        <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30 animate-slide-up flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-blue-200 uppercase whitespace-nowrap">N Parcelas:</label>
                                <input type="number" min="2" max="60" value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-full bg-[#020617] p-2 rounded-lg text-center font-bold text-white border border-blue-500/30 outline-none focus:border-blue-500 shadow-inner" />
                            </div>
                            {fAmount > 0 && (
                                <div className="bg-blue-950/50 p-2 rounded-lg border border-blue-500/20 text-center">
                                    <p className="text-sm font-bold text-blue-300">
                                        {installments}x de <span className="text-white">{formatCurrency(fAmount / installments)}</span>
                                    </p>
                                    {fShared && <p className="text-xs text-pink-300 mt-1 font-bold border-t border-blue-500/20 pt-1">(Casal: {formatCurrency((fAmount / installments) / 2)} para cada)</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {(fShared || viewMode === 'joint' || fType === 'p2p') && (
                        <div className="bg-[#1e293b] p-3 rounded-xl border border-slate-700 flex items-center justify-between animate-slide-up">
                            <span className="text-xs font-bold text-slate-400 uppercase ml-1">{fType === 'income' ? 'Quem Recebeu?' : 'Quem Pagou?'}</span>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setFormPayer('me')} className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${formPayer === 'me' ? 'border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)] grayscale-0' : 'border-slate-700 grayscale opacity-50 scale-90'}`}>
                                    <div className={`w-full h-full rounded-full flex items-center justify-center text-xl ${USER_CONFIG[profile]?.color || 'bg-gray-500'} border-2 border-[#1e293b]`}>
                                        {USER_CONFIG[profile]?.avatar}
                                    </div>
                                    {formPayer === 'me' && <div className="absolute -bottom-2 text-xs font-bold text-blue-400 bg-slate-900 px-2 rounded-full border border-blue-500/30">Eu</div>}
                                </button>
                                <button type="button" onClick={() => setFormPayer('partner')} className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${formPayer === 'partner' ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)] grayscale-0' : 'border-slate-700 grayscale opacity-50 scale-90'}`}>
                                    <div className={`w-full h-full rounded-full flex items-center justify-center text-xl ${USER_CONFIG[profile === 'bruno' ? 'maiara' : 'bruno']?.color || 'bg-gray-500'} border-2 border-[#1e293b]`}>
                                        {USER_CONFIG[profile === 'bruno' ? 'maiara' : 'bruno']?.avatar}
                                    </div>
                                    {formPayer === 'partner' && <div className="absolute -bottom-2 text-xs font-bold text-white bg-slate-900 px-2 rounded-full border border-white/30">{profile === 'bruno' ? 'Maiara' : 'Bruno'}</div>}
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Categoria</p>
                        <div className="grid grid-cols-3 gap-2">
                            {(fType === 'p2p' ? [P2P_CATEGORY] : (CATEGORIES[fType] ?? [])).map((category) => (
                                <button type="button" key={category.id} onClick={() => { setFCat(category.name); setFSubCat(''); }} className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all active:scale-95 ${fCat === category.name ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/5 bg-[#1e293b] text-slate-400 hover:bg-[#283548]'}`}>
                                    <span className="text-xl">{category.icon}</span>
                                    <span className="text-[8px] font-bold uppercase text-center leading-tight">{category.name.slice(0, 10)}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {(() => {
                        const currentCategories = fType === 'p2p' ? [P2P_CATEGORY] : (CATEGORIES[fType] ?? []);
                        return fCat && currentCategories.find((category) => category.name === fCat)?.subcategories?.length > 0 && (
                            <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-700 animate-slide-up">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Detalhe da Categoria</label>
                                <select value={fSubCat} onChange={(e) => setFSubCat(e.target.value)} className="w-full bg-transparent font-bold text-sm outline-none text-white appearance-none">
                                    <option value="" className="bg-slate-900 text-slate-500">Selecione uma opcao...</option>
                                    {currentCategories.find((category) => category.name === fCat).subcategories.map((sub) => <option key={sub} value={sub} className="bg-slate-900 text-white">{sub}</option>)}
                                </select>
                            </div>
                        );
                    })()}

                    <button type="submit" className="w-full btn-gradient text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/20 active:scale-95 transition-transform mt-2 flex items-center justify-center gap-2 border border-white/10">
                        <CheckCircle size={20} /> Confirmar
                    </button>
                </form>
            </div>
        </div>
    );
}
