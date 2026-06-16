import React from 'react';
import { APP_ID, auth, db } from './services/firebase.js';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    calculateMonthlyCashFlow,
    calculatePreviousBalance,
    filterCardInvoiceItemForPayment,
    isCardExpenseTransaction,
    isGeneratedGhostTransaction,
    isPersistedTransaction,
    filterTransactionByUniverse,
    normalizeSettlementsForCurrentMonth
} from './domain/finance/cashflow.js';
import { buildDetailedPortfolio, calculatePortfolioTotal, FIXED_INCOME_CATEGORIES } from './domain/finance/portfolio.js';
import './styles.css';
import AssetHistoryModal from './components/AssetHistoryModal.jsx';
import BottomNavigation from './components/BottomNavigation.jsx';
import BudgetModal from './components/BudgetModal.jsx';
import ChoresView from './components/ChoresView.jsx';
import DreamModal from './components/DreamModal.jsx';
import { Icons } from './components/AppIcons.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import PlanningView from './components/PlanningView.jsx';
import HomeView from './components/HomeView.jsx';
import PricesModal from './components/PricesModal.jsx';
import ReportsView from './components/ReportsView.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import TransactionModal from './components/TransactionModal.jsx';
import { BANKS, CATEGORIES, DEFAULT_BUDGETS, DEFAULT_CHORES, P2P_CATEGORY, USER_CONFIG } from './config/appData.js';
import { BRAPI_TOKEN, DEFAULT_GEMINI_API_KEY, GEMINI_MODELS_TO_TRY, MONTH_NAMES_EN_SHORT } from './config/appSettings.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const { useState, useEffect, useMemo, useRef } = React;
const APP_VERSION = __APP_VERSION__;
const APP_BUILD_STAMP = __APP_BUILD_STAMP__;

const getRelativeMonthKey = (monthKey, offset) => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1 + offset, 1).toISOString().slice(0, 7);
};

const normalizePriceSnapshot = (snapshot) => snapshot?.prices || snapshot || {};

const {
    Plus, Wallet, X, Users, ArrowRightLeft, User, PiggyBank, Target,
    PieChart, ListIcon, BarChart3, Home, Settings, LogOut,
    Moon, Sun, Sunrise, ChevronLeft, Heart, Check, FileText, Upload,
    Sparkles, Key, CheckSquare, Trash2, ChevronDown, ChevronUp,
    ShoppingCart, Search, TrendingDown, CreditCard, Calendar, MapPin, Banknote, Briefcase, Download, TrendingUp,
    Broom, RefreshCw, Trophy, Trash, Eye, EyeOff, Compass,
    Type, CheckCircle, Minus, Tag
} = Icons;

const formatCurrency = (val) => {
    const num = Number(val);
    return isNaN(num) ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const formatDate = (dateStr) => {
    if (typeof dateStr !== 'string' || !dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
};

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 5) return { t: 'Boa madrugada', i: <Moon size={16} /> };
    if (h < 12) return { t: 'Bom dia', i: <Sunrise size={16} /> };
    if (h < 18) return { t: 'Boa tarde', i: <Sun size={16} /> };
    return { t: 'Boa noite', i: <Moon size={16} /> };
};

// --- APP ---
    function App() {
        const [user, setUser] = useState(null);
        const [profile, setProfile] = useState(null);
        const [txs, setTxs] = useState([]);

        // --- CORREÇÃO: ADICIONE ESTA LINHA ABAIXO ---
        const [shoppingList, setShoppingList] = useState([]);

        const [budgets, setBudgets] = useState(DEFAULT_BUDGETS);
        const [viewMode, setViewMode] = useState('personal'); // 'personal' | 'joint'
        const [tab, setTab] = useState('home');

        // --- FILTRO DE LISTA ---
        const [listFilterType, setListFilterType] = useState('all'); // 'all' | 'expense' | 'income' | 'investment'
        const [listFilterBank, setListFilterBank] = useState('all'); // 'all' | string do banco
        const [listFilterSearch, setListFilterSearch] = useState(''); // texto livre

        // Filtros de Data
        const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

        // Estado para alternar entre Lista e Gráficos na Home
        const [extratoMode, setExtratoMode] = useState('list'); // 'list' | 'chart'

        // Dashboard Context Mode (Dia a Dia vs Investimentos) - Global para todas as abas
        const [dashboardMode, setDashboardMode] = useState('statement'); // 'statement' | 'investment'

        // --- ESTADO DE VISIBILIDADE (OLHO) ---
        const [hideValues, setHideValues] = useState(false);

        // --- NOVO: MODO DE VISUALIZAÇÃO (REAL vs PREVISTO) ---
        const [isForecast, setIsForecast] = useState(true); // Padrão: Previsão ligada
        // -----------------------------------------------------

        const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || DEFAULT_GEMINI_API_KEY || '');
        const [menuOpen, setMenuOpen] = useState(false);
        const [modalOpen, setModalOpen] = useState(false);
        const [budgetModal, setBudgetModal] = useState(false);
        const [settingsModal, setSettingsModal] = useState(false);
        const [isProcessingAI, setIsProcessingAI] = useState(false);
        const [selectedAssetHistory, setSelectedAssetHistory] = useState(null); // Estado gerencia o Modal de Histórico de Ativos

        // Novos estados para Revisão, Seleção e Expansão
        const [reviewData, setReviewData] = useState([]);
        const [isReviewOpen, setIsReviewOpen] = useState(false);
        const [importScope, setImportScope] = useState('month'); // 'month' | 'all'
        const [selectionMode, setSelectionMode] = useState(false);
        const [selectedIds, setSelectedIds] = useState(new Set());
        const [expandedReviewId, setExpandedReviewId] = useState(null);
        const [expandedTxId, setExpandedTxId] = useState(null);

        // FORM STATES
        const [fTitle, setFTitle] = useState('');
        const [fAmount, setFAmount] = useState('');
        const [fType, setFType] = useState('expense');
        const [isSell, setIsSell] = useState(false); // NOVO: Controle de Venda/Resgate
        const [fCat, setFCat] = useState('');
        const [fShared, setFShared] = useState(false);
        const [formPayer, setFormPayer] = useState('me');
        const [isInstallment, setIsInstallment] = useState(false);
        const [installments, setInstallments] = useState(2);
        const [fDate, setFDate] = useState(new Date().toISOString().split('T')[0]);
        const [fBank, setFBank] = useState('');
        const [fMarket, setFMarket] = useState('');
        const [fInvestType, setFInvestType] = useState('');

        // --- NOVO (FASE 2): Subcategoria ---
        const [fSubCat, setFSubCat] = useState('');

        // --- NOVO (FASE 3): Recorrência e Sonhos ---
        const [fRecurrent, setFRecurrent] = useState(false);
        const [fRecurrenceEndMode, setFRecurrenceEndMode] = useState('forever'); // 'forever' | 'date' | 'count'
        const [fRecurrenceEndDate, setFRecurrenceEndDate] = useState('');
        const [fRecurrenceCount, setFRecurrenceCount] = useState(12);

        const [fDreamId, setFDreamId] = useState('');
        const [dreams, setDreams] = useState([]);
        const [dreamModal, setDreamModal] = useState(false);

        // Estados do Modal de Sonho (Atualizado Melhoria 4)
        const [dTitle, setDTitle] = useState('');
        const [dTarget, setDTarget] = useState('');
        const [dEmoji, setDEmoji] = useState('✈️');
        const [dScope, setDScope] = useState('personal'); // 'personal' | 'joint'

        // --- NOVO: Estado para Edição ---
        const [editingId, setEditingId] = useState(null);
        const [fIsProjection, setFIsProjection] = useState(false); // NOVO: Flag para desativar recorrência em ghosts
        // Cartão de Crédito
        const [fIsCard, setFIsCard] = useState(false);
        const [fInvoiceMonth, setFInvoiceMonth] = useState('');
        // NOVO: Estado para Edição de Sonho
        const [editingDreamId, setEditingDreamId] = useState(null);

        const [editBudgets, setEditBudgets] = useState([]);
        const [budgetSearch, setBudgetSearch] = useState(''); // NOVO: Filtro de Orçamento

        // Novos estados para o contexto da importação

        // Novos estados para o contexto da importação
        const [importMarket, setImportMarket] = useState('');
        const [importBank, setImportBank] = useState('');

        // --- NOVO: ESTADOS PARA TAREFAS ---
        const [chores, setChores] = useState([]);
        const [weekCycle, setWeekCycle] = useState(0); // 0 = Par, 1 = Ímpar
        // Estado para controlar os menus dropdown do topo ('scope' | 'context' | null)
        const [activeDropdown, setActiveDropdown] = useState(null);

        // NOVOS ESTADOS PARA INVESTIMENTOS (CARTEIRA)
        const [currentPrices, setCurrentPrices] = useState({}); // Mapa: Ticker -> Preço Atual
        const [priceSnapshots, setPriceSnapshots] = useState({});
        const persistedPricesRef = useRef({});
        const [pricesModal, setPricesModal] = useState(false);
        const [isFetchingPrices, setIsFetchingPrices] = useState(false); // Loading state para IA
        const [fQty, setFQty] = useState('');
        const [fUnitPrice, setFUnitPrice] = useState('');

        // --- CHART INTERACTION STATE ---
        const [activeBar, setActiveBar] = useState(null); // { index: number, type: 'inc' | 'exp' | 'inv' }

        // --- NOVO: ESTADO PARA PAGAMENTO PARCIAL ---
        const [settleAmount, setSettleAmount] = useState('');
        const [fSettleBank, setFSettleBank] = useState(''); // M1

        const fileInputRef = useRef(null);

        // AUTOCOMPLETE DATA MEMOS
        const uniqueTitles = useMemo(() => [...new Set(txs.map(t => t.title))].sort(), [txs]);
        const uniqueBanks = useMemo(() => [...new Set(txs.map(t => t.bank).filter(Boolean))].sort(), [txs]); // M1
        const uniqueMarkets = useMemo(() => [...new Set(txs.map(t => t.market).filter(Boolean))].sort(), [txs]);

        useEffect(() => {
            const localProfile = localStorage.getItem('fincontrol_profile');
            if (localProfile && USER_CONFIG[localProfile]) {
                setProfile(localProfile);
            } else {
                localStorage.removeItem('fincontrol_profile');
                setProfile(null);
            }
            auth.signInAnonymously().catch(console.error);
            auth.onAuthStateChanged(setUser);
        }, []);

        useEffect(() => {
            if (!user) return;
            const unsubTx = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('transactions')
                .onSnapshot(snap => {
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    setTxs(list);
                });
            // FASE 2: Orçamentos (Separado por Perfil + Conjunto)
            const unsubPersonal = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings').doc(`budgets_${profile}`)
                .onSnapshot(s => {
                    if (s.exists) {
                        setBudgets(prev => ({ ...prev, personal: s.data().personal || [] }));
                    }
                });

            const unsubJoint = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings').doc('budgets_joint')
                .onSnapshot(s => {
                    if (s.exists) {
                        setBudgets(prev => ({ ...prev, joint: s.data().joint || [] }));
                    }
                });

            // FASE 3: Carregar Sonhos (CORRIGIDO)
            const unsubDreams = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('dreams')
                .onSnapshot(snap => {
                    setDreams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                });

            // Carregar Cotações Manuais (Carteira)
            const unsubPrices = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings').doc('assetPrices')
                .onSnapshot(s => {
                    if (s.exists) {
                        const prices = s.data();
                        persistedPricesRef.current = prices;
                        setCurrentPrices(prices);
                    }
                });

            const unsubPriceSnapshots = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings').doc('assetPriceSnapshots')
                .onSnapshot(s => { setPriceSnapshots(s.exists ? (s.data().months || {}) : {}); });

            // --- NOVO: CARREGAR TAREFAS ---
            const unsubChores = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('chores')
                .onSnapshot(snap => {
                    if (snap.empty) setChores(DEFAULT_CHORES);
                    else setChores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                });

            // <--- ADICIONAR ESTE BLOCO (LISTENER DA LISTA DE COMPRAS) ---
            const unsubShopping = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('shopping_list')
                .onSnapshot(snap => {
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    // Ordena: Pendentes primeiro, depois os comprados
                    list.sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
                    setShoppingList(list);
                });

            const unsubChoreSettings = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings').doc('chores')
                .onSnapshot(s => { if (s.exists) setWeekCycle(s.data().weekCycle || 0); });

            return () => { unsubTx(); unsubPersonal(); unsubJoint(); unsubDreams(); unsubPrices(); unsubPriceSnapshots(); unsubChores(); unsubShopping(); unsubChoreSettings(); }; // <--- ADICIONE unsubShopping() NO RETURN
        }, [user]);

        // --- BLOCO DE DADOS CORRIGIDO (v27) ---
        const data = useMemo(() => {
            if (!profile) return null;

            let fullList = [...txs];

            // --- CORREÇÃO v41: Busca de Pendências Isolada e Segura ---
            // Agora buscamos pendências em TODO o histórico, independente de mês ou filtro
            const pendingSettlements = fullList.filter(t =>
                t.isSettlement &&
                t.status === 'pending' &&
                t.ownerId !== profile // Só mostro se EU preciso confirmar (ou seja, não fui eu que criei)
            );

            // --- 1. PROJEÇÃO (Mantido) ---
            const today = new Date();
            const currentMonthStr = today.toISOString().slice(0, 7);
            const isFutureView = selectedMonth > currentMonthStr;

            if (isFutureView) {
                // ... (Lógica de projeção continua igual aqui ...)
                const recurrenceMap = new Map();
                txs.forEach(t => { if (t.isRecurrent && !t.isSettlement) recurrenceMap.set(t.groupId || t.id, t); });

                // PERFORMANCE FIX: Substituição do .some loop O(N*M) por um Set O(1) de cache para busca rápida
                const existingRecurrencesThisMonth = new Set();
                txs.forEach(t => {
                    if (t.date.startsWith(selectedMonth)) {
                        if (t.groupId) existingRecurrencesThisMonth.add(t.groupId);
                        existingRecurrencesThisMonth.add(t.title.toLowerCase().trim());
                    }
                });

                recurrenceMap.forEach(template => {
                    const existsInMonth = existingRecurrencesThisMonth.has(template.groupId || template.id) || existingRecurrencesThisMonth.has(template.title.toLowerCase().trim());
                    if (!existsInMonth) {
                        // --- LÓGICA DE FIM DA RECORRÊNCIA (NOVO) ---
                        let shouldProject = true;
                        if (template.recurrenceEndMode === 'date' && template.recurrenceEndDate) {
                            if (selectedMonth > template.recurrenceEndDate.slice(0, 7)) shouldProject = false;
                        }
                        else if (template.recurrenceEndMode === 'count' && template.recurrenceCount) {
                            const start = new Date(template.date);
                            const current = new Date(selectedMonth + '-01');
                            const diffMonths = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
                            if (diffMonths >= template.recurrenceCount) shouldProject = false;
                        }

                        if (shouldProject) {
                            const dayStr = template.date.split('-')[2] || '05';
                            const [year, month] = selectedMonth.split('-').map(Number);
                            const daysInMonth = new Date(year, month, 0).getDate();
                            const validDay = Math.min(Number(dayStr), daysInMonth).toString().padStart(2, '0');
                            fullList.push({ ...template, id: 'ghost_' + template.id, date: `${selectedMonth}-${validDay}`, isProjection: true, displayTitle: template.title + ' (Previsto)' });
                        }
                    }
                });
            }

            // --- 2. FILTROS DE UNIVERSO (Lógica Financeira Blindada v42) ---
            const filterByUniverse = (t) => filterTransactionByUniverse(t, { profile, viewMode });

            // --- FASE 3: CÁLCULO DE SALDO ACUMULADO ---
            const startOfSelectedMonth = `${selectedMonth}-01`;
            // ... (resto do código igual)

            // Filtra tudo que aconteceu ANTES deste mês, respeitando o mesmo filtro de mundo (Segurança Total)
            const previousTxs = fullList
                .filter(t => t.date < startOfSelectedMonth && (!t.isProjection || (isForecast && isCardExpenseTransaction(t)))) // Em prev, inclui despesas de cartão (fantasmas intencionais)
                .filter(filterByUniverse); // Aplica a regra: Só soma o que é MEU (se pessoal) ou NOSSO (se conjunto)

            // Calcula o saldo historico
            const { previousBalance, accumInvest } = calculatePreviousBalance(previousTxs, { profile, viewMode });

            const todayStr = new Date().toISOString().split('T')[0];
            const monthBaseList = fullList
                .filter(filterByUniverse)
                .filter(t => t.date.startsWith(selectedMonth));

            // Cenário 1: PREVISTO (Tudo: Realizado + Futuro + Fantasmas)
            const listForecast = normalizeSettlementsForCurrentMonth(monthBaseList, { profile });

            // Cenário 2: REALIZADO (Apenas passado/hoje e SEM projeções)
            const listReal = listForecast.filter(t => !t.isProjection);

            // Define qual lista usar baseado no botão
            const currentMonthList = isForecast ? listForecast : listReal;
            // --- FIM DA ALTERAÇÃO ---

            // --- 3. CÁLCULOS DE CAIXA (Saldos e Relatórios) ---
            // --- 3. CÁLCULOS DE CAIXA (Saldos e Relatórios) ---
            const {
                inc, exp, earningIncome, spendingExp, inv, resg, strictScopeInv, strictScopeResg,
                dailyCatMap, incomeCatMap, dailyBankFlow, monthlyDividends,
                sharedSpends, bal, totalOutflows
            } = calculateMonthlyCashFlow(currentMonthList, { profile, viewMode });


            // --- 4. CÁLCULO DO ACERTO CASAL (CORREÇÃO v60: Regime de Caixa Estrito) ---
            let cumulativeCredit = 0, cumulativeDebt = 0; // Acumulado da Vida (Para saber o Total)
            let upToMonthCredit = 0, upToMonthDebt = 0;   // Acumulado ATÉ o fim do mês selecionado
            let monthlyCredit = 0, monthlyDebt = 0;       // Estrito do Mês (Para o Acerto Mensal)
            let economicExp = 0;

            // Define data limite (último dia do mês selecionado)
            const [selYear, selMonth] = selectedMonth.split('-').map(Number);
            const lastDayOfMonth = new Date(selYear, selMonth, 0).toISOString().split('T')[0];
            const firstDayOfMonth = new Date(selYear, selMonth - 1, 1).toISOString().split('T')[0];

            fullList.forEach(t => {
                const val = Number(t.amount);
                const isFuture = t.date > lastDayOfMonth;
                const isGhost = t.isProjection;

                // Verifica se a transação pertence estritamente ao mês selecionado
                // (Usado para o Saldo Mensal Estrito)
                const isCurrentMonth = t.date >= firstDayOfMonth && t.date <= lastDayOfMonth;

                if (!isForecast && isGhost) return;

                // p2p (Empréstimo entre o casal): 100% do valor sem divisão
                if (t.type === 'p2p') {
                    const iPaid = t.payer === 'me'
                        ? t.ownerId === profile
                        : t.ownerId !== profile;
                    const fullVal = val; // sem divisão — 100% da dívida

                    // 1. Global (sempre, inclui futuro)
                    if (iPaid) cumulativeCredit += fullVal;
                    else cumulativeDebt += fullVal;

                    // 2. Acumulado até o mês selecionado (exclui futuro)
                    if (!isFuture) {
                        if (iPaid) upToMonthCredit += fullVal;
                        else upToMonthDebt += fullVal;
                    }

                    // 3. Apenas o mês atual
                    if (isCurrentMonth) {
                        if (iPaid) monthlyCredit += fullVal;
                        else monthlyDebt += fullVal;
                    }

                    return; // ← CRÍTICO: impede que o p2p entre no bloco isShared abaixo
                }

                // Lógica Econômica (Gasto Real)
                if (!isFuture && !isGhost && t.ownerId === profile && t.type === 'expense') {
                    if (t.isShared) economicExp += val / 2; else economicExp += val;
                }

                if (t.isShared && !t.isSettlement) {
                    const half = val / 2;
                    let realPayerId = t.ownerId;
                    if (t.payer === 'partner') realPayerId = t.ownerId === profile ? 'partner_placeholder' : profile;
                    const iPaid = (t.ownerId === profile && t.payer === 'me') || (t.ownerId !== profile && t.payer === 'partner');

                    // CORREÇÃO: Lógica de Acerto depende se é Entrada ou Saída
                    // Se for DESPESA (ou Compra de Investimento), quem pagou tem CRÉDITO (Paguei pelos dois).
                    // Se for RECEITA (ou Venda de Investimento), quem recebeu tem DÉBITO (Recebi pelos dois, devo a metade).
                    const isExpenseLike = t.type === 'expense' || (t.type === 'investment' && (Number(t.quantity || 0) >= 0));

                    // 1. Soma no Total Global (Sempre - inclui futuro)
                    if (isExpenseLike) {
                        if (iPaid) cumulativeCredit += half; else cumulativeDebt += half;
                    } else {
                        if (iPaid) cumulativeDebt += half; else cumulativeCredit += half;
                    }

                    // 2. Soma no Acumulado ATÉ o mês selecionado (Passado + Presente, exclui futuro)
                    if (!isFuture) {
                        if (isExpenseLike) {
                            if (iPaid) upToMonthCredit += half; else upToMonthDebt += half;
                        } else {
                            if (iPaid) upToMonthDebt += half; else upToMonthCredit += half;
                        }
                    }

                    // 3. Soma no Mês (Apenas se for DO MÊS)
                    if (isCurrentMonth) {
                        if (isExpenseLike) {
                            if (iPaid) monthlyCredit += half; else monthlyDebt += half;
                        } else {
                            if (iPaid) monthlyDebt += half; else monthlyCredit += half;
                        }
                    }
                }

                if (t.isSettlement) {
                    // CORREÇÃO: Só processar acertos CONFIRMADOS no cálculo de acerto
                    if (t.status !== 'confirmed') return;

                    const isExpense = t.type === 'expense';
                    const effectivePayerIsMe = (t.ownerId === profile && isExpense) || (t.ownerId !== profile && !isExpense);

                    // Acertos impactam o Global (Sempre)
                    if (effectivePayerIsMe) {
                        cumulativeCredit += val;
                    } else {
                        cumulativeDebt += val;
                    }

                    // Acertos impactam o Acumulado ATÉ o mês (Se não é futuro)
                    if (!isFuture) {
                        if (effectivePayerIsMe) upToMonthCredit += val; else upToMonthDebt += val;
                    }

                    // Acertos impactam o Mês apenas se ocorreram NESTE MÊS
                    if (isCurrentMonth) {
                        if (effectivePayerIsMe) monthlyCredit += val; else monthlyDebt += val;
                    }
                }
            });

            // Saldo Estrito do Mês (Regime de Caixa)
            const rawCoupleBal = monthlyCredit - monthlyDebt;

            // Saldo Real da Vida (Tudo que devo - Tudo que paguei, inclui parcelas futuras)
            const totalCoupleBal = cumulativeCredit - cumulativeDebt;

            // Saldo Acumulado ATÉ o mês selecionado (Exclui parcelas futuras)
            const upToMonthCoupleBal = upToMonthCredit - upToMonthDebt;

            // O card principal mostra o acumulado ATÉ o mês.
            // Ex: Fev=900, Mar(sem pagar)=850
            let coupleBal = upToMonthCoupleBal;

            // --- 5. INVESTIMENTOS (Carteira) ---
            const investments = txs.filter(t => {
                if (t.type !== 'investment') return false;
                if (viewMode === 'joint') return t.isShared; // Nosso Mundo: Só compartilhados
                return !t.isShared && t.ownerId === profile; // Meu Mundo: Só MEUS e PRIVADOS
            });

            // CORREÇÃO: Filtrar investimentos até a data selecionada para o Dashboard
            // Se não, mostra o valor ATUAL (Futuro) em meses passados
            const historicalInvestments = investments.filter(t => t.date <= lastDayOfMonth);

            // CORREÇÃO: Calcular valor HISTÓRICO do mês anterior para o Dashboard "Mês Anterior"
            const lastDayOfPrevMonth = new Date(selYear, selMonth - 1, 0).toISOString().split('T')[0];
            const prevInvestments = investments.filter(t => t.date <= lastDayOfPrevMonth);

            let totalInvested = 0;
            let totalRealizedProfit = 0; // AUTO-CURA

            // CÁLCULO DE DIVIDENDOS TOTAIS (Para Rentabilidade Real)
            // Filtra 'income' com categoria/titulo de dividendos, respeitando o escopo e data
            const totalDividends = fullList
                .filter(t => t.type === 'income' && t.date <= lastDayOfMonth)
                .filter(t => {
                    if (viewMode === 'joint') return t.isShared;
                    return !t.isShared && t.ownerId === profile;
                })
                .filter(t => (t.title || '').toLowerCase().includes('dividendo') || t.category === 'Dividendos')
                .reduce((acc, t) => acc + Number(t.amount), 0);

            // MAPA DE DIVIDENDOS POR ATIVO (Para exibir no card de cada ativo)
            const dividendsByAsset = {};
            fullList.forEach(t => {
                if (t.type !== 'income') return;
                if (t.date > lastDayOfMonth) return; // Respeita data do dashboard

                // Filtro de Escopo
                const belongsToScope = viewMode === 'joint' ? t.isShared : (!t.isShared && t.ownerId === profile);
                if (!belongsToScope) return;

                // Filtro de Categoria/Título
                if ((t.title || '').toLowerCase().includes('dividendo') || t.category === 'Dividendos') {
                    const assetName = t.market || 'Outros'; // Tenta vincular pelo campo Market
                    dividendsByAsset[assetName] = (dividendsByAsset[assetName] || 0) + Number(t.amount);
                }
            });

            let portfolio = {};
            let portfolioCurrentTotal = 0;
            let portfolioPreviousTotal = 0; // Novo Total do Mês Anterior

            let investBankFlow = {};
            let investCatMap = {};

            const getPricesForMonth = (monthKey) => {
                const snapshot = normalizePriceSnapshot(priceSnapshots[monthKey]);
                return Object.keys(snapshot).length > 0 ? snapshot : currentPrices;
            };

            const calculateScopedPortfolioTotal = (investmentList, prices = currentPrices) =>
                calculatePortfolioTotal(investmentList, { currentPrices: prices, viewMode });

            // Calcula Totais
            portfolioPreviousTotal = calculateScopedPortfolioTotal(
                prevInvestments,
                getPricesForMonth(getRelativeMonthKey(selectedMonth, -1))
            );

            const detailedPortfolio = buildDetailedPortfolio(historicalInvestments, {
                currentPrices,
                viewMode,
                dividendsByAsset
            });
            portfolio = detailedPortfolio.portfolioMap;
            portfolioCurrentTotal = detailedPortfolio.portfolioCurrentTotal;
            totalInvested = detailedPortfolio.totalInvested;
            totalRealizedProfit = detailedPortfolio.totalRealizedProfit;
            investBankFlow = detailedPortfolio.investBankFlow;
            investCatMap = detailedPortfolio.investCatMap;

            const profit = portfolioCurrentTotal - totalInvested + totalRealizedProfit; // AUTO-CURA
            const yieldPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
            const allTimeInv = historicalInvestments.reduce((acc, t) => acc + (Number(t.quantity || 0) >= 0 ? Number(t.amount) : 0), 0);
            const allTimeResgCost = allTimeInv - totalInvested;

            // --- INÍCIO DA ALTERAÇÃO ---
            // 1. Patrimônio Real (Meu Mundo): Soma Saldo Acumulado + Investimentos
            const accumulatedCash = previousBalance + bal;
            const netWorth = accumulatedCash + portfolioCurrentTotal;

            // 2. Dados para a Legenda (Nosso Mundo):
            // Total investido que compõe o saldo (Histórico + Mês Atual)
            const totalInvestInBalance = accumInvest + inv;
            // O "Gasto Líquido" é o Saldo Total descontando o que foi guardado
            const operationalBalance = (previousBalance + bal) + totalInvestInBalance;
            // --- FIM DA ALTERAÇÃO ---

            // --- SONHOS e METAS (Mantido) ---
            const filteredDreams = dreams.filter(d => {
                if (viewMode === 'joint') return d.scope === 'joint';
                // Sonho pessoal: só aparece para o dono
                return (d.scope === 'personal' || !d.scope) && d.ownerId === profile;
            });
            const dreamsProgress = filteredDreams.map(d => {
                // 1. Identifica transações vinculadas a este sonho
                const dreamTxs = txs.filter(t => {
                    if (t.type !== 'investment' || t.dreamId !== d.id) return false;
                    // Sonho pessoal: só conta aportes do dono
                    if (d.scope !== 'joint') return t.ownerId === profile;
                    // Sonho conjunto: conta aportes compartilhados
                    return t.isShared;
                });

                // 2. Agrupa por Ativo e Calcula Quantidade
                const assetQtyMap = {};
                dreamTxs.forEach(t => {
                    const assetName = t.market || t.category || 'Outros';
                    // Resgate COM dreamId = usado para o sonho, não desconta
                    // Resgate SEM dreamId de mesmo ativo = dinheiro escapou, desconta
                    const isRedemption = Number(t.quantity) < 0;
                    const qty = isRedemption ? 0 : Number(t.quantity);
                    assetQtyMap[assetName] = (assetQtyMap[assetName] || 0) + qty;
                });

                // Resgates do mesmo ativo SEM dreamId descontam o progresso
                const unlinkedRedemptions = txs.filter(t =>
                    t.type === 'investment' &&
                    Number(t.quantity) < 0 &&
                    !t.dreamId &&
                    Object.keys(assetQtyMap).includes(t.market || t.category || 'Outros')
                );
                unlinkedRedemptions.forEach(t => {
                    const assetName = t.market || t.category || 'Outros';
                    assetQtyMap[assetName] = (assetQtyMap[assetName] || 0) + Number(t.quantity); // qty negativo subtrai
                });

                // 3. Marcação a Mercado (Usa preço atual do Portfolio)
                let currentValue = 0;
                Object.entries(assetQtyMap).forEach(([name, qty]) => {
                    if (qty <= 0.000001) return; // Ignora ativos zerados/vendidos

                    // Busca o ativo no objeto de Portfolio já calculado acima
                    const portAsset = portfolio[name];
                    if (portAsset) {
                        const isFixed = FIXED_INCOME_CATEGORIES.includes(portAsset.category);
                        if (isFixed) {
                            // Apenas aportes COM dreamId compõem o custo investido para o sonho
                            const historicCost = dreamTxs
                                .filter(t => (t.market || t.category || 'Outros') === name && Number(t.quantity) >= 0)
                                .reduce((acc, t) => acc + Number(t.amount), 0);

                            // Resgates COM dreamId = valor já realizado do sonho (soma como conquistado)
                            const redeemedForDream = dreamTxs
                                .filter(t => (t.market || t.category || 'Outros') === name && Number(t.quantity) < 0)
                                .reduce((acc, t) => acc + Number(t.amount), 0);

                            // safeCost limita a proporção a no máximo 100% do ativo
                            const safeCost = Math.min(historicCost, portAsset.totalCost);
                            currentValue += (portAsset.totalCost > 0
                                ? (safeCost / portAsset.totalCost) * portAsset.currentTotal
                                : safeCost) + redeemedForDream;
                        } else {
                            const price = portAsset.currentPrice > 0
                                ? Number(portAsset.currentPrice)
                                : portAsset.avgPrice;

                            // Cotas resgatadas COM dreamId (já realizadas para o sonho)
                            const qtySold = dreamTxs
                                .filter(t => (t.market || t.category || 'Outros') === name && Number(t.quantity) < 0)
                                .reduce((acc, t) => acc + Math.abs(Number(t.quantity)), 0);

                            // Cotas que ainda estão aplicadas no ativo para este sonho
                            const qtyRemaining = Math.max(qty - qtySold, 0);

                            // Valor já sacado para o sonho (ao preço histórico do resgate)
                            const redeemedForDream = dreamTxs
                                .filter(t => (t.market || t.category || 'Outros') === name && Number(t.quantity) < 0)
                                .reduce((acc, t) => acc + Number(t.amount), 0);

                            // Cotas restantes a mercado + valor já realizado
                            currentValue += qtyRemaining * price + redeemedForDream;
                        }
                    } else {
                        // Fallback: Se não achou no portfólio (ex: erro de arredondamento ou ativo removido),
                        // tenta estimar pelo custo histórico das txs (melhor que zero)
                        const historicCost = dreamTxs
                            .filter(t => (t.market || t.category || 'Outros') === name)
                            .reduce((acc, t) => acc + (Number(t.quantity) < 0 ? -Number(t.amount) : Number(t.amount)), 0);
                        currentValue += historicCost;
                    }
                });

                // totalRedeemed agora = resgates COM dreamId (intencionais = realizei o sonho)
                const totalRedeemed = dreamTxs
                    .filter(t => Number(t.quantity) < 0)
                    .reduce((acc, t) => acc + Number(t.amount), 0);
                const isCompleted = d.targetAmount > 0 && totalRedeemed >= d.targetAmount;

                let pct = d.targetAmount > 0 ? (currentValue / d.targetAmount) * 100 : 0;

                if (isCompleted) {
                    pct = 100;
                }

                // Após concluído, congela o valor exibido na meta
                const displayValue = isCompleted
                    ? Math.max(currentValue, d.targetAmount)
                    : Math.min(currentValue, d.targetAmount * 1.5); // evita barra estourar demais antes de concluir
                return { ...d, currentAmount: displayValue, pct, isCompleted };
            });

            // Orçamentos (Mantido)
            const currentBudgets = budgets[viewMode] || [];
            const rawBudgets = currentBudgets.filter(b => {
                const isInvestContext = CATEGORIES.investment.some(c => c.name === b.category) || b.category === 'Dividendos';
                if (dashboardMode === 'statement') return !isInvestContext && Number(b.limit) >= 0;
                return isInvestContext && Number(b.limit) >= 0;
            });

            let planning = rawBudgets.map(b => {
                let realized = 0; let type = 'out';
                const isIncome = CATEGORIES.income.some(c => c.name === b.category) || CATEGORIES.income.some(c => c.subcategories?.includes(b.category)) || b.category === 'Dividendos';
                if (isIncome) {
                    type = 'in';
                    if (b.category === 'Dividendos') realized = monthlyDividends;
                    else realized = currentMonthList
                        .filter(t => !t.isSettlement && t.type === 'income' && (t.category === b.category || t.subCategory === b.category))
                        .reduce((acc, t) => acc + Number(t.amount), 0);
                } else {
                    type = 'out';
                    realized = currentMonthList
                        .filter(t => !t.isSettlement && (t.type === 'expense' || t.type === 'investment') && (t.category === b.category || t.subCategory === b.category))
                        .reduce((acc, t) => acc + Number(t.amount), 0);
                }
                let icon = '🎯';
                [...CATEGORIES.expense, ...CATEGORIES.income, ...CATEGORIES.investment].forEach(c => {
                    if (c.name === b.category) icon = c.icon;
                    if (c.subcategories && c.subcategories.includes(b.category)) icon = '↳';
                });
                if (b.category === 'Dividendos') icon = '💵';
                return { ...b, realized, limit: Number(b.limit), type, icon };
            });
            planning = planning.map(p => ({ ...p, pct: Math.min(p.limit > 0 ? (p.realized / p.limit) * 100 : 0, 100), rawPct: p.limit > 0 ? (p.realized / p.limit) * 100 : 0 })).filter(p => p.limit > 0 || p.realized > 0);

            // Charts
            // 1. Mapeia todas as categorias presentes nos lançamentos
            const allCharts = Object.keys(dailyCatMap).map(k => ({
                name: k,
                amount: dailyCatMap[k],
                pct: spendingExp > 0 ? (dailyCatMap[k] / spendingExp) * 100 : 0,
                icon: CATEGORIES.expense.find(c => c.name === k)?.icon || '🏷️',
                color: CATEGORIES.expense.find(c => c.name === k)?.barColor || 'bg-gray-500'
            })).sort((a, b) => b.amount - a.amount);

            // 2. Extrai o Top 5
            const top5 = allCharts.slice(0, 5);

            // 3. Calcula o resíduo (do 6º item em diante)
            const remainder = allCharts.slice(5);

            if (remainder.length > 0) {
                const othersAmount = remainder.reduce((sum, item) => sum + item.amount, 0);
                top5.push({
                    name: 'Outros',
                    amount: othersAmount,
                    pct: spendingExp > 0 ? (othersAmount / spendingExp) * 100 : 0,
                    icon: '📦',
                    color: 'bg-slate-500' // Cor neutra para o resíduo
                });
            }

            const dailyCharts = top5;
            const totalPortfolioCost = Object.values(investCatMap).reduce((a, b) => a + b, 0);
            const investCharts = Object.keys(investCatMap).map(k => ({ name: k, amount: investCatMap[k], pct: totalPortfolioCost > 0 ? (investCatMap[k] / totalPortfolioCost) * 100 : 0, icon: CATEGORIES.investment.find(c => c.name === k)?.icon || '📈', color: CATEGORIES.investment.find(c => c.name === k)?.barColor || 'bg-indigo-500' })).sort((a, b) => b.amount - a.amount);

            // ====================================================================
            // GRÁFICO EVOLUÇÃO 6 MESES (REESCRITO - Limpo e Consistente)
            // ====================================================================
            // PRINCÍPIO: Usar a MESMA fonte de dados (fullList) e os MESMOS filtros
            // que o Dashboard utiliza para que não haja divergência entre os cards
            // e o tooltip do gráfico.
            // ====================================================================

            const historyMap = {};

            // 1. Usar fullList (inclui projeções recorrentes) com os mesmos filtros
            //    do dashboard: filterByUniverse + isForecast.
            const historyTxs = fullList
                .filter(filterByUniverse)
                .filter(t => isForecast ? true : !t.isProjection)
                .map(t => {
                    // Inverter tipo de Acertos do parceiro (mesma lógica do listForecast)
                    if (t.isSettlement && t.ownerId !== profile) {
                        return { ...t, type: t.type === 'expense' ? 'income' : 'expense' };
                    }
                    return t;
                });

            // 2. Agrupar transações por mês
            historyTxs.forEach(t => {
                const m = t.date.slice(0, 7);
                if (!historyMap[m]) historyMap[m] = {
                    month: m, income: 0, expense: 0, resg: 0,
                    investedFlow: 0,  // Fluxo de caixa (compras - vendas)
                    investedAsset: 0, // Saldo de ativos no escopo (strict)
                    investedGross: 0  // Apenas aportes brutos no escopo (sem descontar resgates)
                };

                // Acertos: Só confirmados
                if (t.isSettlement) {
                    if (t.status !== 'confirmed') return;
                    if (t.type === 'expense') historyMap[m].expense += Number(t.amount);
                    else historyMap[m].income += Number(t.amount);
                    return;
                }

                if (t.type === 'income') historyMap[m].income += Number(t.amount);
                else if (t.type === 'expense') historyMap[m].expense += Number(t.amount);
                else if (t.type === 'investment') {
                    const val = Number(t.amount);
                    const isRedemption = Number(t.quantity) < 0;

                    // CORREÇÃO: Alinhar com a lógica do Dashboard (appfinancasnossonorte_v53.html ~linha 1580)
                    if (isRedemption) {
                        // Segregar resgate para não inflar artificialmente a receita
                        historyMap[m].resg += val;
                    } else {
                        // Aporte: sai como despesa de investimento
                        historyMap[m].investedFlow += val;

                        // Apenas do escopo
                        const belongsToScope = viewMode === 'joint' ? t.isShared : !t.isShared;
                        if (belongsToScope) {
                            historyMap[m].investedGross += val;
                        }
                    }

                    // Patrimônio de Ativos (InvestedAsset) precisa do net flow do escopo
                    const belongsToScopeAsset = viewMode === 'joint' ? t.isShared : !t.isShared;
                    if (belongsToScopeAsset) {
                        const flow = isRedemption ? -val : val;
                        historyMap[m].investedAsset += flow;
                    }
                }
            });

            // 3. Ordenar cronologicamente
            let historyArray = Object.values(historyMap)
                .sort((a, b) => a.month.localeCompare(b.month));

            // ====================================================================
            // 4. Calcular Acumulados Históricos (O Segredo do Gráfico Estável)
            // ====================================================================
            // Em vez de acumular um fluxo ou usar um `yieldRatio` mágico que muda 
            // dependo do mês, usamos uma "Máquina do Tempo" para cada ponto do gráfico.
            // Para cada mês histórico, calculamos a Fotografia exata do Portfólio 
            // e do Caixa até o último dia daquele mês.
            // Isso garante que se Janeiro de 2026 tinha R$ 250 de Patrimônio,
            // essa barra vai ser R$ 250 pra sempre, independente do mês atual selecionado!

            const fullHistoryWithTotals = historyArray.map(h => {
                const [hYear, hMonth] = h.month.split('-').map(Number);
                const lastDayOfH = new Date(hYear, hMonth, 0).toISOString().split('T')[0];

                // FOTOGRAFIA 1: Dinheiro em Caixa (Saldo Acumulado REAL até este mês)
                let trueCashBalance = 0;
                fullList
                    .filter(t => t.date <= lastDayOfH && !t.isProjection)
                    .filter(filterByUniverse)
                    .forEach(t => {
                        const val = Number(t.amount);
                        if (t.isSettlement) {
                            if (t.status !== 'confirmed') return;
                            const isMySettlement = t.ownerId === profile;
                            const effectiveType = isMySettlement ? t.type : (t.type === 'expense' ? 'income' : 'expense');
                            if (effectiveType === 'expense') trueCashBalance -= val;
                            else trueCashBalance += val;
                            return;
                        }
                        // p2p: afeta o caixa histórico mas NÃO some em inc/exp
                        if (t.type === 'p2p') {
                            const iPaid = t.payer === 'me'
                                ? t.ownerId === profile
                                : t.ownerId !== profile;
                            if (iPaid) trueCashBalance -= val; // saí dinheiro do meu bolso
                            else trueCashBalance += val;       // recebi dinheiro de volta
                            return;
                        }
                        if (t.type === 'income') trueCashBalance += val;
                        else if (t.type === 'expense') trueCashBalance -= val;
                        else if (t.type === 'investment') {
                            if (Number(t.quantity) < 0) trueCashBalance += val; // Resgate volta
                            else trueCashBalance -= val; // Aporte sai
                        }
                    });

                // FOTOGRAFIA 2: Investimentos (Valor da Carteira REAL até este mês)
                // IMPORTANTE: Usa `txs` (dados crus do Firebase) e NÃO filtra por status,
                // exatamente como a variável `investments` do Dashboard (linha 1726).
                const investmentsToDate = txs.filter(t => {
                    if (t.type !== 'investment') return false;
                    if (t.date > lastDayOfH) return false;
                    if (viewMode === 'joint') return t.isShared;
                    return !t.isShared && t.ownerId === profile;
                });

                // Usando a função oficial do Dashboard para avaliar os ativos que tínhamos na época
                const truePatrimony = calculateScopedPortfolioTotal(investmentsToDate, getPricesForMonth(h.month));

                return {
                    ...h,
                    runningBalance: trueCashBalance,
                    runningPatrimony: truePatrimony,
                    runningNetWorth: trueCashBalance + truePatrimony,
                    invested: dashboardMode === 'investment' ? h.investedGross : h.investedFlow
                };
            });

            // 5. Últimos 6 meses
            const finalHistory = fullHistoryWithTotals.slice(-6);

            // CORREÇÃO: O override do mês selecionado continua aqui como garantia total 
            // para que o mês selecionado não diverja 1 centavo dos cards por causa de
            // projeções (isForecast) do mês atual, que não foram pro passado.
            const selectedEntry = finalHistory.find(h => h.month === selectedMonth);
            if (selectedEntry) {
                const accumulatedCash = previousBalance + bal;
                selectedEntry.runningBalance = accumulatedCash;
                selectedEntry.runningPatrimony = portfolioCurrentTotal;
                selectedEntry.runningNetWorth = accumulatedCash + portfolioCurrentTotal;
                selectedEntry.invested = dashboardMode === 'investment' ? strictScopeInv : inv;
                selectedEntry.income = inc;
                selectedEntry.expense = exp;
            }

            return {
                list: currentMonthList, fullList, bal, inc, exp, inv, resg,
                strictScopeInv, strictScopeResg, // <--- EXPOSTO PARA DASHBOARD DE INVESTIMENTO
                previousBalance,
                sharedSpends, // <--- ADICIONADO AQUI
                coupleBal, rawCoupleBal, totalCoupleBal, upToMonthCoupleBal,
                totalInvestInBalance,
                operationalBalance,
                pendingSettlements,
                planning, dreamsProgress, netWorth, economicExp,
                // CORREÇÃO FINAL: totalNetWorth agora reflete Saldo + Valor Atual (Marked to Market)
                analysis: { daily: { charts: dailyCharts, bankFlow: dailyBankFlow }, invest: { charts: investCharts, bankFlow: investBankFlow }, history: finalHistory, health: { savingsRate: earningIncome > 0 ? ((earningIncome - spendingExp) / earningIncome) * 100 : 0, burnRate: spendingExp, coverage: spendingExp > 0 ? (portfolioCurrentTotal / spendingExp) : 0, freedom: spendingExp > 0 ? (monthlyDividends / spendingExp) * 100 : 0, investRate: earningIncome > 0 ? (inv / earningIncome) * 100 : 0, totalNetWorth: (previousBalance + bal) + portfolioCurrentTotal, totalOutflows: totalOutflows, strictScopeInv: strictScopeInv } },
                investData: { totalInvested, allTimeInv, allTimeResgCost, totalCurrent: portfolioCurrentTotal, previousTotal: portfolioPreviousTotal, profit, yieldPct, byBank: investBankFlow, byType: investCatMap, dividends: monthlyDividends, totalDividends, portfolio: Object.values(portfolio).sort((a, b) => b.currentTotal - a.currentTotal) }
            };
            // --- CORREÇÃO: ADICIONADO 'isForecast' NAS DEPENDÊNCIAS ABAIXO ---
            // --- CORREÇÃO: ADICIONADO 'isForecast' e 'fullList' NAS DEPENDÊNCIAS ABAIXO ---
        }, [txs, profile, viewMode, budgets, selectedMonth, dashboardMode, currentPrices, priceSnapshots, dreams, isForecast]);

        // --- EXPORTAR EXCEL ---
        const exportData = () => {
            if (!data || !data.fullList.length) return alert("Nada para exportar");

            const exportList = data.fullList.map(t => ({
                Data: t.date,
                Titulo: t.title,
                Valor: t.amount,
                Tipo: t.type === 'expense' ? 'Despesa' : t.type === 'income' ? 'Receita' : 'Investimento',
                Categoria: t.category,
                Banco: t.bank ? (BANKS.find(b => b.id === t.bank)?.name || t.bank) : '',
                Local: t.market || '',
                Compartilhado: t.isShared ? 'Sim' : 'Não',
                QuemPagou: (() => {
                  const owner = t.ownerId || profile;
                  const partner = owner === 'bruno' ? 'maiara' : 'bruno';
                  const realPayerId = t.payer
                    ? (t.payer === 'me' ? owner : partner)
                    : partner;
                  return realPayerId === 'bruno' ? 'Bruno' : 'Maiara';
                })()
            }));

            const ws = XLSX.utils.json_to_sheet(exportList);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
            XLSX.writeFile(wb, `NossoNorte_${new Date().toISOString().split('T')[0]}.xlsx`);
        };

        // --- UNIVERSAL IA HANDLER ---
        const askGemini = async (prompt, inlineData) => {
            if (!apiKey) { alert("Chave API não configurada! Vá em Configurações."); return null; }
            const tryModel = async (modelName) => {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: modelName });
                // Filter out null values to prevent SDK errors
                const contentParts = [prompt, inlineData].filter(Boolean);
                const result = await model.generateContent(contentParts);
                return result.response.text();
            };

            // Fallback robusto alinhado às novas versões do Gemini (V2.5, V3 e V3.1)
            const modelsToTry = GEMINI_MODELS_TO_TRY;
            let lastError = null;

            for (const modelName of modelsToTry) {
                try {
                    const text = await tryModel(modelName);
                    return JSON.parse(text.replace(/```json|```/g, '').trim());
                } catch (e) {
                    console.warn(`[IA] Falha ao tentar o modelo ${modelName}:`, e.message);
                    lastError = e;
                }
            }
            alert("Erro na IA: Nenhum modelo disponível funcionou. Detalhe: " + (lastError?.message || "Erro desconhecido"));
            return null;
        };

        const handleUniversalUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setIsProcessingAI(true);
            setMenuOpen(false);

            // Prompt Matrix-Aware
            // CORREÇÃO: Lê o mês/ano que o usuário DEIXOU SELECIONADO NA TELA (selectedMonth),
            // em vez do mês real vigente (new Date()). Assim ele consegue subir planilhas velhas.
            const [selYear, selMonthStr] = selectedMonth.split('-');
            const selMonthZeroIdx = Number(selMonthStr) - 1; // 0-11
            const months = MONTH_NAMES_EN_SHORT;
            const currentMonthName = months[selMonthZeroIdx];

            const promptBase = `
                    ATENÇÃO: Você é um assistente financeiro contábil experiente.
                    Sua missão: Ler este arquivo e extrair despesas/receitas relativas a faturas, extratos ou recibos.
                    
                    REGRAS CRÍTICAS:
                    1. EXTRAÇÃO DE VALORES (MUITO IMPORTANTE): Os valores podem aparecer de várias formas: com ou sem "R$" (ex: "R$ 1.234,50", "1234.50" ou "1,234.50"), e usando ponto ou vírgula como decimal. Você DEVE ser inteligente para limpar a string (remover "R$" e caracteres de formatação de milhar), padronizar o separador decimal como PONTO, e sempre converter para número final (float puro, ex: 1234.50 ou -3565.29). NUNCA retorne null se o valor existir na tela/tabela.
                    2. Se houver detalhamento de itens (ex: lista de produtos no mercado), extraia-os no campo 'items'. 
                       IMPORTANTE: Tente identificar a QUANTIDADE (qty), PREÇO UNITÁRIO (unitPrice) e UNIDADE (unit - ex: kg, un, l).
                       Formato: items: [{name: 'Queijo', value: 20.00, qty: 0.5, unitPrice: 40.00, unit: 'kg'}, ...].
                    3. ${importScope === 'all'
                        ? `Leia TODO o conteúdo fornecido. É expressamente proibido resumir ou omitir transações. Retorne TODAS as linhas de TODOS os meses com as suas respetivas datas originais. Se o ficheiro tiver mais transações do que cabem numa única resposta, retorne o máximo possível em ordem cronológica, do mais antigo para o mais recente. Nunca agregues nem omitas linhas.
                     /* NOTA TÉCNICA: o limite de tokens do modelo pode truncar históricos muito longos — isso é esperado e não é um bug */`
                        : `Se for uma PLANILHA MATRIZ (meses nas colunas): IGNORE colunas de outros meses. Foque APENAS na coluna referente a ${currentMonthName}.`}
                    4. IGNORE linhas de "Total", "Saldo", "Pagamentos Validos" (se for o pagamento da fatura, ok, mas evite duplicidade).
                    5. Tente identificar o nome do ESTABELECIMENTO (Loja, Mercado, etc) e coloque no campo 'market' ou no 'title'.
                    6. Se for possível identificar o BANCO/CONTA de origem, coloque no campo 'bank' (ex: Nubank, Itaú, XP).
                    7. Se o arquivo relatar "Parcela" (ex: "5 de 6"), mantenha-o no título, se relevante.
                    8. COMPARTILHAMENTO E PAGADOR:
                       - Se houver coluna 'Compartilhado' (ou similar: 'Divisão', 'Conjunto', 'Casal'):
                         Valor 'Sim', 'S', 'X', 'yes', 'true' → isShared: true
                         Qualquer outro valor → isShared: false
                       - Se houver coluna 'QuemPagou' (ou 'Pagador', 'Responsável'):
                         Retorne o NOME EXATO em minúsculas no campo 'payerName'
                         (ex: 'bruno' ou 'maiara').
                         NÃO retorne 'me' ou 'partner' — apenas o nome bruto.
                       - Se a coluna 'QuemPagou' estiver ausente: retorne payerName: null.
                      9. INVESTIMENTOS
                      A coluna que define o tipo da operacao pode se chamar
                      Tipo, Operacao, Movimentacao ou similar.
                      Mapeie o VALOR dessa coluna conforme abaixo. ATENCAO: retorne o
                      tipo EXATO indicado, nao generalize para investment:

                      - Valor Aporte, Compra, Aplicacao, Subscricao -> retorne
                        type: aporte, quantity: valor POSITIVO das cotas (coluna Cotas
                        ou Quantidade), amount: positivo.

                      - Valor Resgate, Venda, Saque, Retirada -> retorne
                        type: resgate, quantity: valor POSITIVO das cotas (coluna Cotas
                        ou Quantidade), amount: positivo.
                        IMPORTANTE: para Resgates, retorne quantity SEMPRE POSITIVO -
                        o sistema aplica o sinal negativo automaticamente.
                        NUNCA retorne quantity negativo.

                      - Valor Dividendos, Dividendo, JCP, Juros sobre Capital
                        Proprio, Rendimentos, Rendimento, Provento, Proventos
                        -> retorne type: income, category: Dividendos, quantity: 0,
                        amount: positivo.

                      - O campo amount deve ser sempre POSITIVO. NUNCA retorne quantity
                        negativo para nenhum tipo.
                      - Se o campo Valor contiver uma formula (ex: =D2*E2) ou estiver
                        vazio, calcule: amount = Cotas x Preco medio.
                      - Se houver coluna Cotas ou Quantidade, retorne o valor
                        POSITIVO no campo quantity.
                      - Se houver coluna Preco medio, Preco unitario ou Cotacao,
                        retorne o valor no campo unitPrice.
                      - O ticker/codigo do ativo (coluna Ativo, Ticker, Local ou
                        Titulo) retorne no campo market.
                       - Para definir o campo category, use a coluna Investimento,
                         Tipo de Ativo ou Classe e normalize o valor encontrado usando
                         obrigatoriamente o mapeamento abaixo. NUNCA retorne o valor
                         bruto da planilha.
                         ESTA REGRA NAO SE APLICA a linhas cujo Tipo seja Dividendos,
                         JCP, Rendimentos, Provento ou similares: nessas linhas
                         mantenha category Dividendos conforme definido acima,
                         ignorando as colunas Investimento e Categoria.
                         Mapeamento obrigatorio para Aportes, Resgates e Compras
                         (normalize sem excecao):
                         - Acao, Acoes, Acao BR, Acoes BR -> retorne: Acoes BR
                         - FII, FIIs, Fundo Imobiliario -> retorne: FIIs
                         - Renda fixa, Renda Fixa, CDB, Tesouro, LCI, LCA
                           -> retorne: Renda Fixa CDB/Tesouro
                         - Fundo de investimento, Fundos, Fundo -> retorne: Fundos
                         - Acoes EUA, Acao EUA, BDR, Internacional -> retorne: Acoes EUA
                         - Cripto, Crypto, Bitcoin -> retorne: Cripto
                         - Reserva Emergencia, Reserva -> retorne: Reserva Emergencia
                         - Qualquer outro valor nao mapeado -> retorne: Fundos
                         - Se a coluna Investimento estiver ausente, infira pelo ticker:
                           terminado em 11 -> FIIs;
                           4 letras + 1 numero -> Acoes BR;
                           CDB/LCI/LCA/Tesouro no titulo -> Renda Fixa CDB/Tesouro;
                           senao -> Fundos.
                       - Se houver coluna Categoria com valores de setor ou subsetor
                         (ex: Logistica, Shoppings, Financeiro, Consumo nao ciclico,
                         etc.), retorne o valor EXATO no campo subCategory.
                    SAÍDA OBRIGATÓRIA (JSON puro sem markdown):
                    {
                        "transactions": [
                            { 
                                "date": "YYYY-MM-DD", 
                                "title": "Nome da transação", 
                                "amount": 0.00, 
                                "type": "expense", 
                                "category": "Alimentação",
                                "subCategory": "",
                                "market": "Nome da Loja ou Ticker",
                                "bank": "Nome do Banco",
                                "isShared": false,
                                "payerName": "bruno",
                                "quantity": 0,
                                "unitPrice": 0.00,
                                "items": [] 
                            }
                        ]
                    }
                `;

            try {
                // Lógica V7 Recuperada
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onloadend = async () => {
                        const base64 = reader.result.split(',')[1];
                        const data = await askGemini(promptBase, { inlineData: { data: base64, mimeType: file.type } });
                        processAIResponse(data);
                    };
                    return;
                }
                else if (file.type === 'application/pdf') {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                    let fullText = '';
                    const maxPages = Math.min(pdf.numPages, 3);
                    for (let i = 1; i <= maxPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                    }
                    // Para texto, não usamos inlineData, mandamos no prompt
                    const data = await askGemini(promptBase + "\n\nCONTEÚDO TEXTO:\n" + fullText, null);
                    processAIResponse(data);
                    return;
                }
                else {
                    // Tentar ler como planilha (XLSX/CSV)
                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                        const bstr = evt.target.result;
                        const wb = XLSX.read(bstr, { type: 'binary' });
                        let allText = "";
                        wb.SheetNames.forEach(name => {
                            const ws = wb.Sheets[name];
                            allText += `\n--- ABA: ${name} ---\n` + XLSX.utils.sheet_to_csv(ws);
                        });
                        const data = await askGemini(promptBase + "\n\nDADOS CSV:\n" + allText.substring(0, 30000), null);
                        processAIResponse(data);
                    };
                    reader.readAsBinaryString(file);
                    return;
                }
            } catch (error) {
                console.error(error);
                alert("Erro leitura arquivo: " + error.message);
                setIsProcessingAI(false);
            }
        };

        const processAIResponse = (respData) => {
            if (respData && respData.transactions && respData.transactions.length > 0) {
                const INVEST_CAT_NORM = {
                    'acao': 'A\u00e7\u00f5es BR', 'acoes': 'A\u00e7\u00f5es BR',
                    'acao br': 'A\u00e7\u00f5es BR', 'acoes br': 'A\u00e7\u00f5es BR',
                    'fii': 'FIIs', 'fiis': 'FIIs',
                    'fundo imobiliario': 'FIIs',
                    'renda fixa': 'Renda Fixa CDB/Tesouro',
                    'renda fixa cdb tesouro': 'Renda Fixa CDB/Tesouro',
                    'renda fixa cdbtesouro': 'Renda Fixa CDB/Tesouro',
                    'cdb': 'Renda Fixa CDB/Tesouro',
                    'tesouro': 'Renda Fixa CDB/Tesouro',
                    'lci': 'Renda Fixa CDB/Tesouro',
                    'lca': 'Renda Fixa CDB/Tesouro',
                    'fundo de investimento': 'Fundos',
                    'fundos': 'Fundos', 'fundo': 'Fundos',
                    'acoes eua': 'A\u00e7\u00f5es EUA', 'acao eua': 'A\u00e7\u00f5es EUA',
                    'bdr': 'A\u00e7\u00f5es EUA', 'internacional': 'A\u00e7\u00f5es EUA',
                    'cripto': 'Cripto', 'crypto': 'Cripto',
                    'bitcoin': 'Cripto',
                    'reserva emergencia': 'Reserva Emerg\u00eancia',
                    'reserva': 'Reserva Emerg\u00eancia',
                };
                const normCatKey = raw => (raw ?? '') // --- FIX v82 ---
                    .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9 ]/g, '')
                        .trim();

                let prepared = respData.transactions.map((t, idx) => {
                    const resolvedPayer = t.payerName?.toLowerCase() || profile.toLowerCase();
                    const rawType = String(t.type || '').toLowerCase().trim();

                    const isResgate = ['resgate','venda','saque','retirada',
                        'redemption','resgate/venda'].includes(rawType);

                    const isAporte = ['aporte','compra','aplicação','aplicacao',
                        'investment','investimento','compra/aporte','subscrição','subscricao',
                        'subscricão'].includes(rawType);

                    const isProvento = [
                        'dividendos','dividendo','jcp',
                        'juros sobre capital próprio','juros sobre capital proprio',
                        'rendimentos','rendimento','provento','proventos'
                    ].includes(rawType);

                    const normalizedType =
                        ['income','receita'].includes(rawType) || isProvento ? 'income' :
                        (isAporte || isResgate)                              ? 'investment' :
                        ['expense','despesa'].includes(rawType)              ? 'expense' :
                        'expense';

                    const rawQty = Math.abs(Number(t.quantity) || 0);
                    const normalizedQty = normalizedType === 'investment'
                        ? (isResgate ? -rawQty : rawQty)
                        : 0;
                    return {
                        ...t,
                         id:        idx,
                         type:      normalizedType,
                         category:  (() => {
                             if (isProvento) return 'Dividendos';
                             if (normalizedType === 'investment') {
                                 return INVEST_CAT_NORM[normCatKey(t.category)] || t.category || 'Outros';
                             }
                             return t.category || 'Outros';
                         })(),
                         isShared:  t.isShared === true
                                    || t.isShared === 'true'
                                    || ['sim', 's', 'x', 'yes'].includes(
                                         String(t.isShared).toLowerCase()),
                        ownerId:   profile,   // sempre o usuário logado — nunca o da IA
                        payer:     resolvedPayer !== profile.toLowerCase()
                                   ? 'partner' : 'me',
                        amount:    Number(t.amount),
                        date:      (t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date))
                                       ? t.date
                                       : new Date().toISOString().split('T')[0],
                        quantity:  normalizedQty,
                        unitPrice: t.unitPrice || 0,
                        items:     t.items  || [],
                        market:    t.market || '',
                        bank:      t.bank   || '',
                    };
                });

                // Filtro de privacidade: descarta transações individuais do parceiro
                prepared = prepared.filter(t => {
                    if (t.isShared === false && t.payer === 'partner') return false;
                    return true;
                });

                if (prepared.length === 0) {
                    alert(
                        'As transações encontradas pertencem individualmente ao seu ' +
                        'parceiro e foram ignoradas por segurança.'
                    );
                    setIsProcessingAI(false);
                    return;
                }

                setReviewData(prepared); setIsReviewOpen(true); setIsProcessingAI(false);
            } else {
                alert("Não encontrei transações."); setIsProcessingAI(false);
            }
        };

        // --- RADAR DE DUPLICIDADE (Etapa 2 v84 — apenas visual, nunca deleta automaticamente) ---
        const isDuplicate = (newTx, existingTxs, newTxId) => {
            const newTitle = (newTx.title || '').toLowerCase().trim();
            return existingTxs.some(ex => {
                if (ex.id === newTxId) return false; // ignora auto-match
                const exTitle = (ex.title || '').toLowerCase().trim();
                const sameDate   = ex.date   === newTx.date;
                const sameAmount = Number(ex.amount) === Number(newTx.amount);
                const sameType   = ex.type   === newTx.type;
                const similarName = newTitle.includes(exTitle) || exTitle.includes(newTitle);
                return sameDate && sameAmount && sameType && similarName;
            });
        };

        // --- LIQUIDAÇÃO DE FATURA EM LOTE (v84) ---
        // Após a liquidação, o saldo dos meses anteriores ao invoiceMonth
        // será recalculado retroativamente para refletir a saída do dinheiro — comportamento esperado.
        const handlePayCardInvoice = async (invoiceMonth) => {
            const collRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('transactions');
            try {
                const snap = await collRef
                    .where('invoiceMonth', '==', invoiceMonth)
                    .where('ownerId', '==', profile)
                    .where('isProjection', '==', true)
                    .get();
                const docsToPay = snap.docs.filter(doc =>
                    filterCardInvoiceItemForPayment(doc.data(), { profile, viewMode })
                );
                if (docsToPay.length === 0) return;
                // Máx 500 docs por batch (limite do Firestore). Se houver mais, múltiplos batches sequenciais.
                const chunks = [];
                for (let i = 0; i < docsToPay.length; i += 500) chunks.push(docsToPay.slice(i, i + 500));
                for (const chunk of chunks) {
                    const b = db.batch();
                    chunk.forEach(doc => b.update(doc.ref, { isProjection: false }));
                    await b.commit();
                }
            } catch (err) {
                console.error('Erro ao liquidar fatura:', err);
                // --- FIX v82 ---
                if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
                    alert('Erro de índice no banco. Abra o console do Firebase e crie o índice composto sugerido no link do erro.');
                } else {
                    alert('Erro ao pagar fatura: ' + err.message);
                }
            }
        };

        const confirmImport = async () => {
            const batch = db.batch();
            reviewData.forEach(t => {
                const ref = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('transactions').doc();
                const { id, ...dataToSave } = t;
                const finalMarket = t.market || importMarket;
                const finalBank   = t.bank   || importBank;

                const payload = {
                    ...dataToSave,
                    title:        t.title     || 'Importado',
                    amount:       Number(t.amount),
                    type:         t.type      || 'expense',
                    category:     t.category  || 'Outros',
                    market:       finalMarket,
                    bank:         finalBank,
                    isShared:     t.isShared === true,
                    ownerId:      profile,
                    payer:        t.payer     || 'me',
                    quantity:     Number(t.quantity)  || 0,
                    unitPrice:    Number(t.unitPrice) || 0,
                    items:        t.items     || [],
                    isProjection: false,
                    isRecurrent:  false,
                    isSettlement: false,
                    subCategory:  t.subCategory || '',
                    createdAt:    new Date().toISOString(),
                    userId:       user?.uid   || 'anon',
                };
                Object.keys(payload).forEach(key => {
                    if (payload[key] === undefined) delete payload[key];
                });
                batch.set(ref, payload);
            });
            await batch.commit();
            setIsReviewOpen(false);
            setReviewData([]);
            setImportMarket(''); // Limpa o campo
            setImportBank('');   // Limpa o campo
            alert("Importação concluída!");
        };

        // --- MASSIVE DELETE ACTIONS ---
        const toggleSelection = (id) => {
            const newSet = new Set(selectedIds);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setSelectedIds(newSet);
        };

        const deleteSelected = async () => {
            // 1. Identifica transações selecionadas na lista completa (para pegar o groupId)
            const selectedTxs = txs.filter(t => selectedIds.has(t.id));

            // Projeções recorrentes puras não existem no banco, mas compras de cartão
            // são salvas como projeções intencionais até a liquidação da fatura.
            const realTxs = selectedTxs.filter(isPersistedTransaction);

            // Se só houver ghosts selecionados, apenas limpa a seleção e sai (eles "somem" visualmente)
            if (realTxs.length === 0) {
                setSelectedIds(new Set());
                setSelectionMode(false);
                return;
            }

            // 2. Verifica se há grupos (Recorrência/Parcelamento)
            const groupIds = new Set(realTxs.map(t => t.groupId).filter(Boolean));
            let deleteScope = 'selected'; // 'selected' | 'future' | 'series'

            // Se houver itens que pertencem a uma série, pergunta o que fazer
            if (groupIds.size > 0) {
                const msg = `Você selecionou ${realTxs.length} ite${realTxs.length > 1 ? 'ns' : 'm'} reais.\n` +
                    `Detectamos que parte deles pertence a uma série recorrente ou parcelada.\n\n` +
                    `Como deseja apagar?\n` +
                    `[1] = Apenas Selecionados\n` +
                    `[2] = Daqui para a Frente (Futuro)\n` +
                    `[3] = Toda a Série (Passado e Futuro)`;

                const choice = prompt(msg, "1");

                if (choice === '3') deleteScope = 'series';
                else if (choice === '2') deleteScope = 'future';
                else if (choice === '1') deleteScope = 'selected';
                else return; // Cancelou se não digitou 1, 2 ou 3 (ou fechou o prompt)
            } else {
                // Confirmação Padrão (Sem séries envolvidas)
                if (!confirm(`Excluir ${realTxs.length} itens selecionados permanentemente?`)) return;
            }

            // 3. Prepara IDs para deletar
            const finalIdsToDelete = new Set(realTxs.map(t => t.id));

            if (deleteScope === 'series') {
                // Busca TODAS as transações que possuem os mesmos groupIds detectados
                const relatedTxs = txs.filter(t => t.groupId && groupIds.has(t.groupId));
                relatedTxs.forEach(t => finalIdsToDelete.add(t.id));
            }
            else if (deleteScope === 'future') {
                // Busca transações da mesma série com DATA >= Data referência
                // Referência: Menor data da seleção atual (para garantir coerência)
                const refDate = realTxs.reduce((min, t) => t.date < min ? t.date : min, realTxs[0].date);

                const relatedTxs = txs.filter(t =>
                    t.groupId &&
                    groupIds.has(t.groupId) &&
                    t.date >= refDate // Daqui pra frente (inclusive)
                );
                relatedTxs.forEach(t => finalIdsToDelete.add(t.id));
            }

            // 4. Executa Batch Delete
            const batch = db.batch();
            finalIdsToDelete.forEach(id => {
                const ref = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('transactions').doc(id);
                batch.delete(ref);
            });

            await batch.commit();

            // Reset
            setSelectedIds(new Set());
            setSelectionMode(false);

            let feedbackMsg = `Exclusão concluída! (${finalIdsToDelete.size} itens removidos)`;
            if (deleteScope === 'series') feedbackMsg = `Série COMPLETA apagada! (${finalIdsToDelete.size} itens removidos)`;
            if (deleteScope === 'future') feedbackMsg = `Itens FUTUROS apagados! (${finalIdsToDelete.size} itens removidos)`;

            alert(feedbackMsg);
        };

        const addReviewItem = (index) => {
            const name = prompt("Nome do item:");
            const val = Number(prompt("Valor:"));
            if (name && !isNaN(val)) {
                const n = [...reviewData];
                // Garante que o array items existe
                if (!n[index].items) n[index].items = [];
                n[index].items.push({ name, value: val });
                // Opcional: Somar ao total da transação se desejar, 
                // mas manteremos apenas o registro do item conforme v7
                setReviewData(n);
            }
        };

        // --- ACTIONS ---
        // NOVO: Quick Invest/Redeem
        // --- ACTIONS ---
        // NOVO: Quick Invest/Redeem (Smart Pre-fill)
        const handleQuickInvest = (assetName, sellMode = false) => {
            // Fase 2: Buscar última transação para preencher dados
            // CORREÇÃO: Filtrar pelo viewMode para herdar dados bancários corretos do escopo
            const lastTx = txs.find(t => (t.market === assetName || t.category === assetName) && (viewMode === 'joint' ? t.isShared : !t.isShared));

            if (lastTx) {
                setFBank(lastTx.bank || '');
                setFCat(lastTx.category || '');
                setFTitle(lastTx.title || '');
                setFSubCat(lastTx.subCategory || '');
                setFDreamId(lastTx.dreamId || '');
            } else {
                // Limpa se não achar
                setFBank('');
                setFCat('Investimentos');
                setFTitle(`Aporte ${assetName}`);
                setFSubCat('');
            }

            setFType('investment');
            setFMarket(assetName);
            setIsSell(sellMode);
            setFShared(viewMode === 'joint'); // <--- CORREÇÃO: Força a flag de divisão

            // Limpa valores numéricos para o user digitar o novo
            setFQty('');
            setFUnitPrice('');
            setFAmount('');

            setModalOpen(true);
        };

        // FASE 3: Novo Atalho "Lançar Dividendo/Rendimento"
        const handleQuickDividend = (assetName) => {
            // Busca apenas para saber o banco de origem/destino do escopo correto
            const lastTx = txs.find(t => (t.market === assetName || t.category === assetName) && (viewMode === 'joint' ? t.isShared : !t.isShared));

            setFType('income');
            setFCat('Dividendos');
            setFTitle('Rendimento ' + assetName);
            setFMarket(assetName);
            setFBank(lastTx ? lastTx.bank : '');
            setFShared(viewMode === 'joint'); // <--- CORREÇÃO: Força a flag de divisão

            setFAmount(''); // User digita o valor
            setModalOpen(true);
        };

        // NOVO: Função para abrir modal de edição de sonho
        const handleEditDream = (dream) => {
            setDTitle(dream.title);
            setDTarget(dream.targetAmount);
            setDEmoji(dream.emoji);
            setDScope(dream.scope || 'personal');
            setEditingDreamId(dream.id);
            setDreamModal(true);
        };

        // NOVO: Função para carregar edição
        const handleEdit = (tx) => {
            if (tx.isSettlement) return; // GUARD: acertos não são editáveis pelo form
            // FASE 2: Se for projeção (Fantasma), id vira null (cria novo), mas mantém os dados para facilitar o lançamento
            // Card expenses are intentional ghosts — they ARE editable. Only block pure projection ghosts (recurring).
            setEditingId(isGeneratedGhostTransaction(tx) ? null : tx.id);

            setFTitle(tx.title);
            setFAmount(tx.amount);
            setFType(tx.type);
            setFCat(tx.category);
            setFSubCat(tx.subCategory || '');

            // FASE 3: Recorrência e Sonho
            setFRecurrent(tx.isRecurrent || false);
            setFRecurrenceEndMode(tx.recurrenceEndMode || 'forever');
            setFRecurrenceEndDate(tx.recurrenceEndDate || '');
            setFRecurrenceCount(tx.recurrenceCount || 12);
            setFDreamId(tx.dreamId || '');

            setFIsProjection(isGeneratedGhostTransaction(tx) || isCardExpenseTransaction(tx)); // Ghost gerado ou despesa de cartão persistida
            setFIsCard(isCardExpenseTransaction(tx)); // Cartão de crédito
            setFInvoiceMonth(tx.invoiceMonth || '');

            // CORREÇÃO: Ghosts NÃO herdam recorrência
            if (tx.isProjection) {
                setFRecurrent(false);
                setFRecurrenceEndMode('forever');
                setFRecurrenceCount(1);
            } else {
                setFRecurrent(tx.isRecurrent || false);
                setFRecurrenceEndMode(tx.recurrenceEndMode || 'forever');
                setFRecurrenceCount(tx.recurrenceCount || 12);
            }

            setFShared(tx.isShared || false);

            // CORREÇÃO: Lógica deve espelhar a da lista para casos antigos (undefined)
            // Se undefined, a lista assume Partner (inverso do Owner). Aqui devemos fazer o mesmo.
            // CORREÇÃO ROBUSTA 2.0: Payer Relativo (Owner) -> Payer Relativo (Viewer)
            // 1. Descobrir quem REALMENTE pagou (ID absoluto)
            const owner = tx.ownerId;
            const partner = owner === 'bruno' ? 'maiara' : 'bruno';

            // Lógica da Lista:
            // - Payer 'me' -> Owner pagou
            // - Payer 'partner' -> Partner pagou
            // - Payer undefined -> Partner pagou (Inverso do Owner)

            const realPayerId = tx.payer
                ? (tx.payer === 'me' ? owner : partner)
                : partner;

            // 2. Mapear para o formulário (Relativo ao Profile Logado)
            // Se quem pagou sou eu (Profile), formPayer = 'me'. 
            // Se não, formPayer = 'partner'.
            setFormPayer(realPayerId === profile ? 'me' : 'partner');
            setFDate(tx.date);
            setFBank(tx.bank || '');
            setFMarket(tx.market || '');

            if (tx.type === 'investment') {
                const q = Number(tx.quantity || 0);
                setIsSell(q < 0); // Se negativo, é venda
                setFQty(Math.abs(q));
                setFUnitPrice(tx.unitPrice || '');
            }

            setModalOpen(true);
        };

        const saveTx = async (e) => {
            e.preventDefault();
            try {
                const batch = db.batch();
                const collectionRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('transactions');

                // FASE 2: GERAÇÃO DE DNA (GroupId)
                // Se for recorrente ou parcelado (mais de 1x), cria um ID de grupo único
                const newGroupId = (fRecurrent || (isInstallment && installments > 1))
                    ? `grp_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`
                    : null;

                // Payload base (Dados comuns)
                const payload = {
                    title: fTitle || 'Sem título',
                    amount: Number(fAmount) || 0,
                    type: fType || 'expense',
                    category: fCat || 'Outros',
                    subCategory: fSubCat || '',
                    date: fDate || new Date().toISOString().split('T')[0],
                    isShared: fShared || false,
                    payer: formPayer || 'me',
                    ownerId: profile,
                    userId: user ? user.uid : 'anon',
                    isSettlement: false,
                    market: fMarket || '',
                    bank: fBank || '',
                    quantity: fType === 'investment'
                        ? (FIXED_INCOME_CATEGORIES.includes(fCat) ? (isSell ? -1 : 1) : (isSell ? -Math.abs(Number(fQty) || 0) : Math.abs(Number(fQty) || 0)))
                        : 0,
                    unitPrice: fType === 'investment'
                        ? (FIXED_INCOME_CATEGORIES.includes(fCat) ? (Number(fAmount) || 0) : (Number(fUnitPrice) || 0))
                        : 0,

                    // FASE 3: Novos Campos
                    isRecurrent: fRecurrent || false,
                    recurrenceEndMode: fRecurrent ? (fRecurrenceEndMode || 'forever') : null,
                    recurrenceEndDate: fRecurrent && fRecurrenceEndMode === 'date' ? (fRecurrenceEndDate || null) : null,
                    recurrenceCount: fRecurrent && fRecurrenceEndMode === 'count' ? (Number(fRecurrenceCount) || 12) : null,
                    dreamId: fType === 'investment' ? (fDreamId || '') : '', // Só salva vínculo se for investimento
                    groupId: newGroupId, // <--- SALVA O DNA NO BANCO
                    // Cartão de Crédito: isProjection = true até liquidação da fatura
                    isProjection: fIsCard ? true : (fIsProjection || false),
                    isCardExpense: fIsCard || false,
                    invoiceMonth: fIsCard ? fInvoiceMonth : null,
                };

                // Remove undefined keys just in case
                Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

                if (editingId) {
                    const docRef = collectionRef.doc(editingId);

                    // --- 4. TRATAMENTO DE EDIÇÃO (COM ESCOPO) ---
                    const originalTx = txs.find(t => t.id === editingId);
                    const siblings = (originalTx && originalTx.groupId) ? txs.filter(t => t.groupId === originalTx.groupId) : [];

                    // Detecta Mudança Estrutural (Resize ou Conversão Single -> Installment)
                    // É Resize se: É parcelado E (não tinha grupo OU contagem mudou)
                    const isStructuralChange = isInstallment && (!originalTx?.groupId || siblings.length !== Number(installments));

                    if (isStructuralChange && installments > 1) {
                        // --- FLUXO DE RESIZE/RECRIAÇÃO (Mantido) ---
                        // Se mudou a estrutura (ex: 3x para 5x), apaga tudo e recria.
                        if (originalTx && originalTx.groupId) {
                            siblings.filter(s => s.id !== editingId).forEach(s => batch.delete(collectionRef.doc(s.id)));
                        }
                        const valPerInst = Number(fAmount) / installments;
                        const [y, m, d] = fDate.split('-').map(Number);

                        const firstPayload = {
                            ...payload,
                            title: `${fTitle} (1/${installments})`,
                            amount: valPerInst,
                        };
                        batch.update(docRef, firstPayload);

                        for (let i = 1; i < installments; i++) {
                            const newDocRef = collectionRef.doc();
                            const dateObj = new Date(y, (m - 1) + i, d);
                            const nextPayload = {
                                ...payload,
                                title: `${fTitle} (${i + 1}/${installments})`,
                                amount: valPerInst,
                                date: dateObj.toISOString().split('T')[0],
                                createdAt: new Date().toISOString(),
                                items: []
                            };
                            Object.keys(nextPayload).forEach(key => nextPayload[key] === undefined && delete nextPayload[key]);
                            batch.set(newDocRef, nextPayload);
                        }

                    } else {
                        // --- EDIÇÃO DE CONTEÚDO (COM PERGUNTA DE ESCOPO) ---
                        let editScope = 'single';

                        // Se pertence a um grupo, pergunta o escopo
                        if (originalTx && originalTx.groupId && siblings.length > 0) {
                            const msg = `Editar Transação em Série:\n` +
                                `[1] Apenas esta\n` +
                                `[2] Daqui para a Frente\n` +
                                `[3] Todas da Série`;
                            const choice = prompt(msg, "1");
                            if (choice === '2') editScope = 'future';
                            else if (choice === '3') editScope = 'all';
                            else if (choice !== '1') return; // Cancelar
                        }

                        // Prepara payload de atualização (Remove groupId novo para não quebrar o link existente)
                        const { groupId, ...baseUpdate } = payload;

                        // Executa baseada no escopo
                        if (editScope === 'single') {
                            // Edita só esta (Mantém groupId original)
                            batch.update(docRef, baseUpdate);
                        } else {
                            // Edita em Lote
                            const targets = editScope === 'all'
                                ? siblings
                                : siblings.filter(t => t.date >= originalTx.date);

                            targets.forEach(t => {
                                // Preserva índice do título se for parcelado
                                let newTitle = fTitle;
                                if (t.title.match(/\(\d+\/\d+\)$/)) {
                                    const match = t.title.match(/\((\d+)\/(\d+)\)$/);
                                    if (match) newTitle = `${fTitle} (${match[1]}/${match[2]})`;
                                }

                                const batchUpdate = { ...baseUpdate, title: newTitle };

                                // PROTEÇÃO DE DATA:
                                // Não altera a data dos irmãos, apenas do editado (se mudou)
                                if (t.id !== editingId) {
                                    delete batchUpdate.date;
                                }

                                batch.update(collectionRef.doc(t.id), batchUpdate);
                            });
                        }
                    }
                } else {
                    if (isInstallment && installments > 1) {
                        const valPerInst = Number(fAmount) / installments;
                        const [y, m, d] = fDate.split('-').map(Number);
                        for (let i = 0; i < installments; i++) {
                            const docRef = collectionRef.doc();
                            const dateObj = new Date(y, (m - 1) + i, d);
                            batch.set(docRef, {
                                ...payload,
                                title: `${fTitle} (${i + 1}/${installments})`,
                                amount: valPerInst,
                                date: dateObj.toISOString().split('T')[0],
                                createdAt: new Date().toISOString(),
                                items: []
                            });
                        }
                    } else {
                        const docRef = collectionRef.doc();
                        batch.set(docRef, { ...payload, createdAt: new Date().toISOString(), items: [] });
                    }
                }

                await batch.commit();

                // REQUIREMENT 3: Atualizar currentPrice customizado se for Renda Fixa para não perder rendimento
                if (!editingId && fType === 'investment' && FIXED_INCOME_CATEGORIES.includes(fCat) && fMarket) {
                    try {
                        const assetKeyStr = `${fMarket}@@${viewMode}`;
                        const pricesRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings').doc('assetPrices');

                        const nextPrices = { ...currentPrices };

                        const existingVal = nextPrices[assetKeyStr] !== undefined ? nextPrices[assetKeyStr] : nextPrices[fMarket];

                        if (existingVal !== undefined && Number(existingVal) > 0) {
                            const shiftAmount = isSell ? -Number(fAmount) : Number(fAmount);
                            let newVal = Number(existingVal) + shiftAmount;
                            if (newVal < 0) newVal = 0;

                            nextPrices[assetKeyStr] = newVal;
                            if (nextPrices[fMarket] !== undefined) delete nextPrices[fMarket]; // upgrade para escopo

                            await pricesRef.set(nextPrices);
                            setCurrentPrices(nextPrices);
                        }
                        // Se não tem cotação manual, não faz nada (pureBalance assume a física financeira naturalmente)
                    } catch (err) {
                        console.error("Erro ao atualizar currentPrice para Renda Fixa", err);
                    }
                }

                setModalOpen(false);
                // Reset do Form COMPLETO (Evita travar na anterior)
                setEditingId(null);
                setFTitle(''); setFQty(''); setFUnitPrice(''); setFAmount(''); setIsInstallment(false); setFDate(new Date().toISOString().split('T')[0]);
                setFSubCat(''); setFRecurrent(false); setFDreamId('');
                setFRecurrenceEndMode('forever'); setFRecurrenceEndDate(''); setFRecurrenceCount(12);
                setFIsProjection(false); // Reset
                setFIsCard(false); setFInvoiceMonth(''); // Reset cartão crédito
                setFormPayer('me'); setFShared(false); setFType('expense'); setFCat('Outros'); setIsSell(false); // Reset v53 Fix
            } catch (error) {
                console.error("Erro ao salvar transação:", error);
                alert("Erro ao salvar: " + error.message);
            }
        };

        // FASE 3: Salvar Sonho (Atualizado com Escopo e Edição)
        const saveDream = async () => {
            if (!dTitle || !dTarget) return alert("Preencha título e valor");

            const dreamData = {
                title: dTitle,
                targetAmount: Number(dTarget),
                emoji: dEmoji,
                scope: dScope, // Salva se é 'personal' ou 'joint'
                ownerId: profile,
                createdAt: new Date().toISOString()
            };

            if (editingDreamId) {
                // Modo Edição
                await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('dreams').doc(editingDreamId).update(dreamData);
            } else {
                // Modo Criação
                await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('dreams').add(dreamData);
            }

            setDreamModal(false); setDTitle(''); setDTarget(''); setEditingDreamId(null);
        };

        const deleteDream = async (id) => {
            if (confirm("Apagar este sonho?")) {
                await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('dreams').doc(id).delete();
                setDreamModal(false);
                setEditingDreamId(null);
            }
        }

        // --- FASE 4: EXCLUSÃO INTELIGENTE (CASCATA + TARA) ---
        // --- NOVA FUNÇÃO: Rejeitar/Excluir Pagamento não recebido ---
        const rejectSettlement = async (id) => {
            if (confirm("O dinheiro não caiu? Ao rejeitar, este lançamento será apagado.")) {
                await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('transactions').doc(id).delete();
            }
        };

        const confirmSettlement = async (tx) => {
            await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('transactions').doc(tx.id).update({
                status: 'confirmed'
            });
        };

        // CORREÇÃO INTELIGENTE (Pagar vs Receber)
        const settleDebt = async () => {
            // Aceita o valor do input (parcial) ou o total se o input estiver vazio (segurança)
            const rawSettle = String(settleAmount).trim();
            const inputVal = rawSettle ? Number(rawSettle) : 0; // --- FIX v82 ---
            if (rawSettle && (!inputVal || inputVal <= 0)) return; // --- FIX B2 v83 ---

            // CORREÇÃO: O valor digitado é apenas a MAGNITUDE. 
            // A direção (Pagar vs Receber) é determinada pelo estado atual da Dívida.
            const isPayer = data.coupleBal < 0; // Se saldo negativo, EU DEVO -> EU PAGO.

            const val = inputVal !== 0 ? Math.abs(inputVal) : Math.abs(data.coupleBal);

            if (val === 0) return;

            // 1. Define quem é você na transação

            // 2. Define Tipo e Título
            const type = isPayer ? 'expense' : 'income';
            const title = isPayer ? 'Pagamento de Acerto' : 'Recebimento de Acerto';

            // 3. CORREÇÃO: SEMPRE nasce 'pending' (Parceiro SEMPRE precisa confirmar)
            // Evita que alguém confirme unilateralmente e a conta fique inconsistente.
            const initialStatus = 'pending';

            await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('transactions').add({
                title: title,
                amount: val,
                type: type,
                category: 'Ajuste/Reembolso',
                date: new Date().toISOString().split('T')[0],
                isShared: false,
                isSettlement: true,
                bank: fSettleBank || '', // M1
                status: initialStatus,
                payer: 'me',
                ownerId: profile,
                userId: user.uid,
                createdAt: new Date().toISOString()
            });

            // Feedback visual (Sempre requer confirmação do parceiro)
            alert("Acerto registrado! Aguardando o parceiro confirmar.");

            setSettleAmount(''); // Limpa o input após pagar
            setFSettleBank(''); // M1
        };

        const openBudget = () => {
            // FASE 3 FIX (Melhorias 1 e 2): Lista expandida com Subcategorias e Investimentos
            let list = [];

            // --- ALTERAÇÃO 2: Carrega categorias baseadas no MODO ATUAL (Com Dividendos no Invest) ---
            if (dashboardMode === 'statement') {
                // MODO DIA A DIA: Carrega Despesas e Receitas (EXCETO Dividendos)
                [...CATEGORIES.expense, ...CATEGORIES.income].forEach(cat => {
                    if (cat.name === 'Dividendos') return; // Pula dividendos aqui

                    list.push({ id: cat.name, name: cat.name, type: 'main', icon: cat.icon });
                    if (cat.subcategories) {
                        cat.subcategories.forEach(sub => {
                            list.push({ id: sub, name: `${cat.name} > ${sub}`, type: 'sub', parent: cat.name, icon: '↳' });
                        });
                    }
                });
            } else {
                // MODO INVESTIMENTOS:
                // 1. Meta de Rentabilidade (Inflow)
                list.push({ id: 'Dividendos', name: 'Dividendos (Meta de Renda)', type: 'invest-in', icon: '💵' });

                // 2. Metas de Aporte (Outflow)
                CATEGORIES.investment.forEach(cat => {
                    list.push({ id: cat.name, name: cat.name, type: 'invest-out', icon: cat.icon });
                });
            }
            // --------------------------------------------------------------

            const current = budgets[viewMode] || [];

            setEditBudgets(list.map(c => ({
                category: c.id,
                displayName: c.name,
                limit: current.find(b => b.category === c.id)?.limit || 0,
                icon: c.icon,
                // CRÍTICO: Estas propriedades estavam sendo perdidas na versão anterior
                parent: c.parent,
                type: c.type
            })));

            setBudgetSearch('');
            setBudgetModal(true);
        };

        // --- CORREÇÃO 1: Função saveBudget Blindada ---
        const saveBudget = async () => {
            try {
                const current = budgets[viewMode] || [];

                // --- ALTERAÇÃO 3: Merge Inteligente (Considerando Dividendos como Investimento) ---
                const otherBudgets = current.filter(b => {
                    // Verifica se o item pertence ao contexto de Investimentos
                    const isInvestContext = CATEGORIES.investment.some(cat => cat.name === b.category) || b.category === 'Dividendos';

                    // Se estou no modo DIA A DIA, preservo tudo que é Investimento (incluindo Dividendos)
                    if (dashboardMode === 'statement') return isInvestContext;
                    // Se estou no modo INVESTIMENTO, preservo tudo que NÃO é Investimento
                    return !isInvestContext;
                });

                // Remove também duplicatas visuais que estamos editando agora (segurança extra)
                const finalPreserved = otherBudgets.filter(b => !editBudgets.some(e => e.category === b.category));
                // ------------------------------------------------------------------

                // 2. Prepara os novos itens para salvar (SANITIZAÇÃO E SOMA DE PAIS)
                const newItems = editBudgets
                    .map(b => {
                        let finalLimit = Number(b.limit);

                        // Se for Pai, recalcula a soma dos filhos para salvar o valor total correto
                        if (b.type === 'main') {
                            const childrenSum = editBudgets
                                .filter(child => child.parent === b.category)
                                .reduce((sum, child) => sum + (Number(child.limit) || 0), 0);

                            // Se tiver filhos somando algo, o limite do pai assume essa soma
                            if (childrenSum > 0) finalLimit = childrenSum;
                        }

                        return {
                            category: b.category,
                            limit: finalLimit
                        };
                    })
                    .filter(b => b.limit > 0 && !isNaN(b.limit)); // Só salva metas maiores que zero

                const updatedBudgets = [...otherBudgets, ...newItems];

                const newB = { ...budgets, [viewMode]: updatedBudgets };

                // Determina o documento de destino (Pessoal ou Conjunto)
                const budgetDocId = viewMode === 'joint' ? 'budgets_joint' : `budgets_${profile}`;

                // Salva apenas a parte correspondente no respectivo documento
                // Nota: Mantemos a estrutura { [viewMode]: [...] } para compatibilidade com o listener
                await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings').doc(budgetDocId).set({
                    [viewMode]: updatedBudgets
                });

                setBudgets(newB);
                setBudgetModal(false);
            } catch (error) {
                console.error("Erro ao salvar orçamento:", error);
                alert("Erro ao salvar: " + error.message);
            }
        };

        // --- FUNÇÃO DE HARD RESET (LIMPEZA TOTAL) ---
        const resetDatabase = async () => {
            if (!confirm("⚠️ PERIGO: HARD RESET\n\nIsso apagará TODAS as transações, sonhos e configurações de orçamento.\nO app voltará ao estado original.\n\nDeseja continuar?")) return;

            // Segunda confirmação de segurança
            if (!confirm("Tem certeza absoluta? Essa ação é irreversível.")) return;

            setIsProcessingAI(true); // Usa o spinner de loading

            try {
                const batch = db.batch();
                const basePath = db.collection('artifacts').doc(APP_ID).collection('public').doc('data');

                // 1. Coletar e Deletar Transações
                const txSnapshot = await basePath.collection('transactions').get();
                txSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                // 2. Coletar e Deletar Sonhos
                const dreamsSnapshot = await basePath.collection('dreams').get();
                dreamsSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                // 3. Resetar Orçamentos para o Padrão (Separado por Perfil + Conjunto)
                // Isso garante que a estrutura volte limpa, sem duplicatas
                batch.set(basePath.collection('settings').doc(`budgets_${profile}`), DEFAULT_BUDGETS);
                batch.set(basePath.collection('settings').doc('budgets_joint'), DEFAULT_BUDGETS);
                
                // Limpeza: Apaga o documento antigo 'budgets' se ele ainda existir
                batch.delete(basePath.collection('settings').doc('budgets'));

                // 4. Apagar Cotações Manuais e outras configs
                batch.delete(basePath.collection('settings').doc('assetPrices'));
                batch.delete(basePath.collection('settings').doc('assetPriceSnapshots'));

                // Executar tudo
                await batch.commit();

                alert("✅ Sistema reiniciado com sucesso! A página será recarregada.");
                window.location.reload();

            } catch (error) {
                console.error("Erro no reset:", error);
                alert("Erro ao resetar: " + error.message);
                setIsProcessingAI(false);
            }
        };

        // --- NOVO: LÓGICA DE TAREFAS DOMÉSTICAS (CORRIGIDA v32) ---
        const addChore = async (choreData) => { await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('chores').add(choreData); };

        const toggleChore = async (id) => {
            const chore = chores.find(c => c.id === id);
            if (chore) {
                // CORREÇÃO: Aumentamos a régua para 20 caracteres. 
                // IDs manuais (ex: 'dishes') são menores que 20, então entram no 'if' para serem CRIADOS.
                // IDs do Firebase são 20 chars, então vão para o 'else' para serem ATUALIZADOS.
                if (!chore.id || chore.id.length < 20) {
                    const { id: _, ...rest } = chore;
                    // Cria a tarefa no banco pela primeira vez ao clicar
                    await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('chores').add({ ...rest, done: !chore.done });
                } else {
                    await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('chores').doc(id).update({ done: !chore.done });
                }
            }
        };

        const deleteChore = async (id) => {
            if (confirm("Remover tarefa?")) {
                // Se for item de exemplo (ID curto), filtramos localmente (gambiarra visual) ou apenas ignoramos pois não está no banco
                // O ideal é recarregar a página ou ele sumirá sozinho se não salvou.
                // Mas se já salvou (ID longo), deleta do banco.
                if (id.length >= 20) {
                    await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('chores').doc(id).delete();
                } else {
                    // Se tentar deletar um exemplo não salvo, removemos da lista visualmente forçando um reload ou filtrando o estado
                    setChores(chores.filter(c => c.id !== id));
                }
            }
        };

        const rotateChores = async () => {
            if (!confirm("Encerrar a semana?\n\n1. Tarefas rotativas trocarão de dono.\n2. O ciclo quinzenal irá avançar.\n3. Todas as tarefas serão desmarcadas.")) return;
            const batch = db.batch();
            const nextCycle = weekCycle + 1;

            // Atualiza ciclo
            batch.set(db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings').doc('chores'), { weekCycle: nextCycle }, { merge: true });

            // Gira tarefas
            chores.forEach(c => {
                // Só processa quem já é "real" no banco (ID longo)
                if (c.id && c.id.length >= 20) {
                    const ref = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('chores').doc(c.id);
                    let update = { done: false };
                    if (c.isRotating) update.assignee = c.assignee === 'bruno' ? 'maiara' : 'bruno';
                    batch.update(ref, update);
                }
            });
            await batch.commit();
            alert(`Ciclo avançado! Estamos na Semana #${nextCycle}.`);
        };

        const resetDailyChores = async () => {
            if (!confirm("Resetar apenas as tarefas DIÁRIAS?")) return;
            const batch = db.batch();
            chores.filter(c => c.frequency === 'daily').forEach(c => {
                // Só reseta quem já está no banco
                if (c.id && c.id.length >= 20) {
                    batch.update(db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('chores').doc(c.id), { done: false });
                }
            });
            await batch.commit();
        };

        // --- FUNÇÃO DE BUSCA DE PREÇOS COM BRAPI ---
        const fetchBrapiPrices = async () => {
            setIsFetchingPrices(true);
            try {
                // 1. Identificar ativos com saldo
                const assets = data.investData.portfolio.filter(a => a.qty > 0).map(a => a.name);

                // NOVO: Filtrar apenas os que parecem ser Tickers da B3 (Letras + Números no final)
                // Exemplo: ITUB4, MXRF11, BOVA11. Ignora "Tesouro Direto", "CDB Itaú", etc.
                const b3Tickers = assets.filter(name => /^[A-Z]{4}\d{1,2}$/i.test(name));

                if (b3Tickers.length === 0) {
                    alert("Você não possui ativos de Bolsa (ações/FIIs) válidos na carteira para atualizar.");
                    setIsFetchingPrices(false);
                    return;
                }

                const token = BRAPI_TOKEN; // Token fornecido pelo usuário

                // 2. Chamar a API Brapi para cada ticker, ignorando silenciosamente os 400 Bad Request de tickers zumbis
                const sanitizedPrices = {};
                let successCount = 0;

                for (const ticker of b3Tickers) {
                    try {
                        const response = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${token}`);
                        if (response.ok) {
                            const responseData = await response.json();
                            if (responseData && responseData.results && responseData.results.length > 0) {
                                const stock = responseData.results[0];
                                const symbol = stock.symbol;
                                const price = stock.regularMarketPrice;

                                // Tenta casar a resposta (PETR4) com o nome salvo no portfolio (ex: PETR4 ou PETR4F)
                                const match = assets.find(a => a.toUpperCase() === symbol.toUpperCase() || a.toUpperCase().startsWith(symbol.toUpperCase()));

                                if (match && price !== undefined && price !== null) {
                                    sanitizedPrices[match] = Number(price).toFixed(2);
                                    successCount++;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`Erro ao buscar ticker ${ticker} na Brapi, ignorando.`, e);
                    }
                }

                if (successCount > 0) {
                    await saveAssetPrices({ ...currentPrices, ...sanitizedPrices });
                    alert(`✅ Preços atualizados para ${successCount} ativos (Tempo Real via B3)!`);
                } else {
                    alert("⚠️ A API conectou, mas não encontrou esses tickers na nuvem da B3. Verifique se os nomes (ex: ITSA4) estão exatos.");
                }
            } catch (error) {
                console.error("Erro Brapi:", error);
                alert("Erro ao buscar cotações ao vivo: " + error.message);
            } finally {
                setIsFetchingPrices(false);
            }
        };

        const saveAssetPrices = async (nextPrices) => {
            const currentMonthKey = new Date().toISOString().slice(0, 7);
            const previousMonthKey = getRelativeMonthKey(currentMonthKey, -1);
            const updatedAt = new Date().toISOString();
            const nextSnapshots = { ...priceSnapshots };
            const previousPersistedPrices = persistedPricesRef.current || {};

            if (!nextSnapshots[previousMonthKey] && Object.keys(previousPersistedPrices).length > 0) {
                nextSnapshots[previousMonthKey] = {
                    prices: { ...previousPersistedPrices },
                    updatedAt
                };
            }

            nextSnapshots[currentMonthKey] = {
                prices: { ...nextPrices },
                updatedAt
            };

            const settingsRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings');
            const batch = db.batch();
            batch.set(settingsRef.doc('assetPrices'), nextPrices);
            batch.set(settingsRef.doc('assetPriceSnapshots'), { months: nextSnapshots }, { merge: true });
            await batch.commit();

            setCurrentPrices(nextPrices);
            persistedPricesRef.current = nextPrices;
            setPriceSnapshots(nextSnapshots);
        };

        // UI HELPERS
        const userConfig = profile ? USER_CONFIG[profile] : null;
        if (!profile || !userConfig) {
            return (
                <LoginScreen
                    USER_CONFIG={USER_CONFIG}
                    ChevronLeft={ChevronLeft}
                    Heart={Heart}
                    X={X}
                    onLoginSuccess={(p) => { setProfile(p); localStorage.setItem('fincontrol_profile', p); }}
                />
            );
        }
        if (!data) return <div className="h-full flex items-center justify-center bg-slate-900 text-white">Carregando...</div>;
        const greeting = getGreeting();

        // PREPARAÇÃO DADOS PARA UI
        const analysisData = dashboardMode === 'statement' ? data.analysis.daily : data.analysis.invest;

        // Taxa de Poupança (Para análise de dia a dia)
        const daysInMonth = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate();
        const dailyAvg = data.exp / new Date().getDate(); // Média até hoje

        return (
            <div className="h-full flex flex-col font-sans text-slate-900 animate-fade-in relative">
                {/* MODALS - MANTIDOS */}
                {isProcessingAI && <div className="absolute inset-0 z-50 bg-slate-900/90 flex items-center justify-center text-white"><Sparkles className="animate-spin mb-2" /> Analisando...</div>}

                {/* MODAL REVISÃO - MANTIDO (Conteúdo oculto para brevidade, mas ele existe no seu código) */}
                {isReviewOpen && (
                    <div className="fixed inset-0 z-[70] bg-slate-900/95 backdrop-blur-sm flex flex-col animate-fade-in p-2 md:p-6">
                        <div className="glass-card mt-10 rounded-[2rem] flex-1 flex flex-col overflow-hidden border border-white/10 shadow-2xl max-w-2xl mx-auto w-full">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-800/80">
                                <h3 className="font-bold text-xl flex gap-2 text-white"><CheckSquare className="text-emerald-400" /> Revisar Importação</h3>
                                <button onClick={() => { setIsReviewOpen(false); setReviewData([]); }} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent scrollbar-hide">
                                {reviewData.map((item, index) => {
                                    const dupFound = isDuplicate(item, data.fullList, item.id);
                                    return (
                                    <div key={index} className={`p-5 rounded-2xl shadow-sm flex flex-col gap-4 border transition-colors
                                        ${dupFound
                                            ? 'bg-yellow-500/10 border-yellow-500/40'
                                            : 'bg-slate-800/60 border-white/10'}`}>
                                        {dupFound && (
                                            <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                                                ⚠️ Possível duplicata — verifique antes de confirmar
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start gap-4">
                                            <input
                                                className="font-bold text-lg text-white bg-transparent border-b border-dashed border-white/20 focus:border-emerald-500 outline-none w-full"
                                                value={item.title}
                                                onChange={e => setReviewData(prev =>
                                                    prev.map((t, i) =>
                                                        i === index ? { ...t, title: e.target.value } : t
                                                    )
                                                )}
                                            />
                                            <button onClick={() => {
                                                const newData = reviewData.filter((_, i) => i !== index);
                                                setReviewData(newData);
                                            }} className="text-rose-400 hover:text-rose-300 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1">Valor do Item</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="p-3 bg-slate-900/80 rounded-xl text-white font-bold text-lg border border-white/10 focus:border-emerald-500 outline-none w-full"
                                                    value={item.amount !== undefined ? item.amount : ''}
                                                    onChange={e => setReviewData(prev =>
                                                        prev.map((t, i) =>
                                                            i === index
                                                                ? { ...t, amount: e.target.value !== '' ? Number(e.target.value) : t.amount }
                                                                : t
                                                        )
                                                    )}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1">Data</span>
                                                <input
                                                    type="date"
                                                    className="p-3 bg-slate-900/80 rounded-xl text-white text-sm border border-white/10 focus:border-emerald-500 outline-none w-full"
                                                    value={item.date}
                                                    onChange={e => setReviewData(prev =>
                                                        prev.map((t, i) =>
                                                            i === index ? { ...t, date: e.target.value } : t
                                                        )
                                                    )}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1">Responsável</span>
                                                <select
                                                    className="p-3 bg-slate-900/80 rounded-xl text-white text-sm border border-white/10 focus:border-emerald-500 outline-none w-full [&>option]:bg-slate-800"
                                                    value={item.payer === 'partner' ? (profile === 'bruno' ? 'maiara' : 'bruno') : profile}
                                                    onChange={(e) =>
                                                        setReviewData(prev =>
                                                            prev.map((t, i) =>
                                                                i === index
                                                                    ? { ...t, payer: e.target.value === profile ? 'me' : 'partner' }
                                                                    : t
                                                            )
                                                        )
                                                    }
                                                >
                                                    <option value="bruno">Bruno</option>
                                                    <option value="maiara">Maiara</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1">Tipo</span>
                                                <select
                                                    className="p-3 bg-slate-900/80 rounded-xl text-white text-sm border border-white/10 focus:border-emerald-500 outline-none w-full [&>option]:bg-slate-800"
                                                    value={
                                                        item.type !== 'investment'
                                                            ? item.type
                                                            : Number(item.quantity) >= 0
                                                                ? 'investment_aporte'
                                                                : 'investment_resgate'
                                                    }
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const isResgate = val === 'investment_resgate';
                                                        const isInvest = val.startsWith('investment');
                                                        const rawQty = Math.abs(Number(item.quantity) || 0);
                                                        setReviewData(prev =>
                                                            prev.map((t, i) => i === index ? {
                                                                ...t,
                                                                type: isInvest ? 'investment' : val,
                                                                quantity: isInvest
                                                                    ? (isResgate ? -rawQty : rawQty)
                                                                    : 0,
                                                                category: ''
                                                            } : t)
                                                        );
                                                    }}
                                                >
                                                    <option value="expense">💸 Despesa</option>
                                                    <option value="income">💰 Receita</option>
                                                    <option value="investment_aporte">📈 Investimento — Aporte</option>
                                                    <option value="investment_resgate">📉 Investimento — Resgate</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1">Categoria</span>
                                                <select
                                                    className="p-3 bg-slate-900/80 rounded-xl text-white text-sm border border-white/10 focus:border-emerald-500 outline-none w-full [&>option]:bg-slate-800"
                                                    value={item.category}
                                                    onChange={e => setReviewData(prev =>
                                                        prev.map((t, i) =>
                                                            i === index ? { ...t, category: e.target.value } : t
                                                        )
                                                    )}
                                                >
                                                    <option value="">Categoria...</option>
                                                    {CATEGORIES[item.type === 'income' ? 'income' : item.type === 'investment' ? 'investment' : 'expense']?.map(c => (
                                                        <option key={c.id} value={c.name}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {(() => {
                                                const catKey = item.type === 'income' ? 'income' : item.type === 'investment' ? 'investment' : 'expense';
                                                const subcats = CATEGORIES[catKey]?.find(c => c.name === item.category)?.subcategories;
                                                if (!subcats || subcats.length === 0) return null;
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1">Subcategoria</span>
                                                        <select
                                                            className="p-3 bg-slate-900/80 rounded-xl text-white text-sm border border-white/10 focus:border-emerald-500 outline-none w-full [&>option]:bg-slate-800"
                                                            value={item.subCategory || ''}
                                                            onChange={e => setReviewData(prev =>
                                                                prev.map((t, i) =>
                                                                    i === index ? { ...t, subCategory: e.target.value } : t
                                                                )
                                                            )}
                                                        >
                                                            <option value="">Subcategoria...</option>
                                                            {subcats.map(sub => (
                                                                <option key={sub} value={sub}>{sub}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                );
                                            })()}
                                            <div className="flex flex-col col-span-2">
                                                <label className="flex items-center gap-2 cursor-pointer mt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.isShared === true}
                                                        onChange={() =>
                                                            setReviewData(prev =>
                                                                prev.map((t, idx) =>
                                                                    idx === index ? { ...t, isShared: !t.isShared } : t
                                                                )
                                                            )
                                                        }
                                                        className="w-4 h-4 accent-indigo-500"
                                                    />
                                                    <span className="text-xs font-bold text-slate-400">
                                                        Compartilhado
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                                {reviewData.length === 0 && (
                                    <div className="text-center text-slate-400 mt-10">
                                        Nenhum item para revisar.
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-slate-800/90 border-t border-white/10 flex gap-4 safe-pb relative z-10">
                                <button onClick={() => { setIsReviewOpen(false); setReviewData([]); }} className="flex-1 py-4 bg-white/10 text-white font-bold rounded-2xl active:scale-95 transition-all hover:bg-white/20 border border-white/10">Cancelar</button>
                                <button onClick={confirmImport} disabled={reviewData.length === 0} className="flex-1 py-4 bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-2xl active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:brightness-110">Importar {reviewData.length} itens</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* NOTIFICAÇÃO DE ACERTO - MANTIDA */}
                {data && data.pendingSettlements && data.pendingSettlements.length > 0 && (
                    <div className="bg-amber-100 border-b border-amber-200 px-6 py-4 flex flex-col gap-3 animate-slide-up sticky top-0 z-50">
                        <div className="flex items-center gap-2 text-amber-800 font-bold">
                            <span className="bg-amber-200 p-1.5 rounded-full"><ArrowRightLeft size={16} /></span>
                            <span>Confirmação Pendente</span>
                        </div>
                        {data.pendingSettlements.map(tx => (
                            <div key={tx.id} className="glass-card p-3 rounded-xl flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="text-xs text-amber-500 mb-0.5">
                                        {USER_CONFIG[tx.ownerId]?.name || 'Parceiro'} {tx.type === 'expense' ? 'informou pagamento' : 'informou recebimento'}:
                                    </p>
                                    <p className="font-bold text-lg text-emerald-400">{formatCurrency(tx.amount)}</p>
                                </div>
                                <div className="flex gap-2">
                                    {/* Botão Rejeitar */}
                                    <button onClick={() => rejectSettlement(tx.id)} className="glass-card text-rose-400 border border-rose-500/30 px-3 py-2 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition-transform hover:bg-rose-500/10 flex items-center gap-1">
                                        <X size={14} /> Não
                                    </button>
                                    {/* Botão Confirmar (Texto dinâmico) */}
                                    <button onClick={() => confirmSettlement(tx)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition-transform flex items-center gap-2 hover:bg-emerald-500">
                                        <Check size={14} /> {tx.type === 'expense' ? 'Sim, recebi' : 'Sim, paguei'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- HEADER SÓLIDO (TOPO) --- */}
                <div className="pt-4 pb-4 px-5 shrink-0 z-40 relative text-white bg-slate-900 shadow-xl shadow-black/20 border-b border-white/5">
                    <div className="flex justify-between items-center relative z-10 gap-4">

                        {/* ESQUERDA: Perfil Limpo (Sem ícones de tempo) */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ring-2 ring-white/10 shadow-lg shrink-0 ${USER_CONFIG[profile].color}`}>
                                {USER_CONFIG[profile].avatar}
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-medium">{greeting.t}</p>
                                <h1 className="font-bold text-lg md:text-xl leading-none truncate">{USER_CONFIG[profile].name}</h1>
                            </div>
                        </div>

                        {/* DIREITA: Data + Config (Botão de Seleção REMOVIDO) */}
                        <div className="flex gap-2 items-center shrink-0">
                            {/* DATA */}
                            <div className="relative flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors cursor-pointer">
                                <input type="month" value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setListFilterType('all'); setListFilterBank('all'); setListFilterSearch(''); }} className="absolute inset-0 opacity-0 cursor-pointer z-50 w-full h-full" />
                                <Calendar size={16} className="text-emerald-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-200 tracking-wide">
                                    {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
                                </span>
                            </div>

                            {/* CONFIG */}
                            <button onClick={() => setSettingsModal(true)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-slate-300">
                                <Settings size={20} />
                            </button>
                            {/* SAIR */}
                            <button onClick={() => { localStorage.removeItem('fincontrol_profile'); setProfile(null); }} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-rose-400 hover:text-rose-300">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- MENU CONTEXTUAL FLUTUANTE (FUNDO DO APP) --- */}
                <div className="px-2 py-2 shrink-0 z-30 relative flex gap-4 w-full border-b border-white/20">

                    {/* 1. ESCOPO (TEXTO PURO + SETA) */}
                    <div className="relative flex-1 min-w-0">
                        <button
                            onClick={() => setActiveDropdown(activeDropdown === 'scope' ? null : 'scope')}
                            className="flex items-center gap-2 text-white group w-full"
                        >
                            <div className={`p-1.5 rounded-full shrink-0 ${viewMode === 'personal' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-pink-500/20 text-pink-400'}`}>
                                {viewMode === 'personal' ? <User size={14} strokeWidth={3} /> : <Users size={14} strokeWidth={3} />}
                            </div>
                            {/* AJUSTE: text-sm (mobile) md:text-base (desktop) e 'truncate' para evitar quebra de layout */}
                            <span className="font-bold text-sm md:text-base tracking-tight text-white drop-shadow-md truncate">
                                {viewMode === 'personal' ? 'Meu Norte' : 'Nosso Norte'}
                            </span>
                            <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${activeDropdown === 'scope' ? 'rotate-180' : ''}`} />
                        </button>
                        {/* Dropdown 1 */}
                        {activeDropdown === 'scope' && (
                            <div className="absolute top-full left-0 w-48 md:w-56 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-[100]">
                                <button onClick={() => { setViewMode('personal'); setActiveDropdown(null); }} className="w-full text-left px-4 py-4 hover:bg-white/5 flex items-center gap-3 border-b border-white/5">
                                    <User size={16} className="text-indigo-400" /> <span className="font-bold text-sm text-slate-200">Meu Norte</span>
                                </button>
                                <button onClick={() => { setViewMode('joint'); setActiveDropdown(null); }} className="w-full text-left px-4 py-4 hover:bg-white/5 flex items-center gap-3">
                                    <Users size={16} className="text-pink-400" /> <span className="font-bold text-sm text-slate-200">Nosso Norte</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2. CONTEXTO (TEXTO PURO + SETA) */}
                    <div className="relative flex-1 min-w-0">
                        <button
                            onClick={() => setActiveDropdown(activeDropdown === 'context' ? null : 'context')}
                            className="flex items-center gap-2 text-white group w-full"
                        >
                            <div className={`p-1.5 rounded-full shrink-0 ${dashboardMode === 'statement' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {dashboardMode === 'statement' ? <Banknote size={14} strokeWidth={3} /> : <TrendingUp size={14} strokeWidth={3} />}
                            </div>
                            {/* AJUSTE: text-sm (mobile) md:text-base (desktop) */}
                            <span className="font-bold text-sm md:text-base tracking-tight text-white drop-shadow-md truncate">
                                {dashboardMode === 'statement' ? 'Dia a dia' : 'Carteira'}
                            </span>
                            <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${activeDropdown === 'context' ? 'rotate-180' : ''}`} />
                        </button>
                        {/* Dropdown 2 */}
                        {activeDropdown === 'context' && (
                            <div className="absolute top-full left-0 w-56 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-[100]">
                                <button onClick={() => { setDashboardMode('statement'); setActiveDropdown(null); }} className="w-full text-left px-4 py-4 hover:bg-white/5 flex items-center gap-3 border-b border-white/5">
                                    <Banknote size={16} className="text-indigo-400" /> <span className="font-bold text-sm text-slate-200">Dia a dia</span>
                                </button>
                                <button onClick={() => { setDashboardMode('investment'); setActiveDropdown(null); }} className="w-full text-left px-4 py-4 hover:bg-white/5 flex items-center gap-3">
                                    <TrendingUp size={16} className="text-emerald-400" /> <span className="font-bold text-sm text-slate-200">Investimentos</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content (Área de Rolagem - ONDE O CARD VIVE AGORA) */}
                {/* Usamos px-5 aqui para alinhar tudo com o cabeçalho */}
                <div className="flex-1 overflow-y-auto px-2 pb-32 scrollbar-hide relative bg-subtle-filter">


                    {/* --- CARD PRINCIPAL (Agora dentro da rolagem) --- */}
                    {tab === 'home' && (
                        <HomeView
                            activeBar={activeBar}
                            analysisData={analysisData}
                            ArrowRightLeft={ArrowRightLeft}
                            Banknote={Banknote}
                            BarChart3={BarChart3}
                            Briefcase={Briefcase}
                            Check={Check}
                            CheckCircle={CheckCircle}
                            ChevronDown={ChevronDown}
                            data={data}
                            dashboardMode={dashboardMode}
                            deleteSelected={deleteSelected}
                            expandedTxId={expandedTxId}
                            extratoMode={extratoMode}
                            Eye={Eye}
                            EyeOff={EyeOff}
                            fSettleBank={fSettleBank}
                            formatCurrency={formatCurrency}
                            handlePayCardInvoice={handlePayCardInvoice}
                            handleEdit={handleEdit}
                            handleQuickDividend={handleQuickDividend}
                            handleQuickInvest={handleQuickInvest}
                            hideValues={hideValues}
                            isForecast={isForecast}
                            ListIcon={ListIcon}
                            listFilterBank={listFilterBank}
                            listFilterSearch={listFilterSearch}
                            listFilterType={listFilterType}
                            Minus={Minus}
                            PieChart={PieChart}
                            Plus={Plus}
                            profile={profile}
                            Search={Search}
                            selectedIds={selectedIds}
                            selectedMonth={selectedMonth}
                            selectionMode={selectionMode}
                            setSelectedAssetHistory={setSelectedAssetHistory}
                            setActiveBar={setActiveBar}
                            setExpandedTxId={setExpandedTxId}
                            setExtratoMode={setExtratoMode}
                            setFSettleBank={setFSettleBank}
                            setHideValues={setHideValues}
                            setIsForecast={setIsForecast}
                            setListFilterBank={setListFilterBank}
                            setListFilterSearch={setListFilterSearch}
                            setListFilterType={setListFilterType}
                            setPricesModal={setPricesModal}
                            setSelectedIds={setSelectedIds}
                            setSelectionMode={setSelectionMode}
                            setSettleAmount={setSettleAmount}
                            settleAmount={settleAmount}
                            settleDebt={settleDebt}
                            tab={tab}
                            toggleSelection={toggleSelection}
                            Trash2={Trash2}
                            TrendingDown={TrendingDown}
                            TrendingUp={TrendingUp}
                            uniqueBanks={uniqueBanks}
                            USER_CONFIG={USER_CONFIG}
                            Users={Users}
                            viewMode={viewMode}
                            FIXED_INCOME_CATEGORIES={FIXED_INCOME_CATEGORIES}
                            X={X}
                        />
                    )}

                    {/* --- ABA DE TAREFAS UNIFICADA --- */}
                    {tab === 'chores' && (
                        <ChoresView
                            APP_ID={APP_ID}
                            Broom={Broom}
                            Check={Check}
                            CheckSquare={CheckSquare}
                            MarketIcons={{ Check, Plus, Search, ShoppingCart, Target, TrendingDown, X }}
                            Plus={Plus}
                            RefreshCw={RefreshCw}
                            ShoppingCart={ShoppingCart}
                            Sun={Sun}
                            Trash={Trash}
                            chores={chores}
                            data={data}
                            db={db}
                            formatCurrency={formatCurrency}
                            onToggle={toggleChore}
                            onAdd={addChore}
                            onDelete={deleteChore}
                            onRotateCycle={rotateChores}
                            onResetDaily={resetDailyChores}
                            shoppingList={shoppingList}
                            userConfig={USER_CONFIG}
                            weekCycle={weekCycle}
                        />
                    )}

                    {tab === 'planning' && (
                        <PlanningView
                            dashboardMode={dashboardMode}
                            data={data}
                            formatCurrency={formatCurrency}
                            onEditDream={handleEditDream}
                            onOpenBudget={openBudget}
                            onOpenDreamModal={() => setDreamModal(true)}
                            Plus={Plus}
                            Settings={Settings}
                            Sparkles={Sparkles}
                            Target={Target}
                            viewMode={viewMode}
                        />
                    )}

                    {tab === 'reports' && (
                        <ReportsView
                            analysisData={analysisData}
                            BANKS={BANKS}
                            Banknote={Banknote}
                            BarChart3={BarChart3}
                            dashboardMode={dashboardMode}
                            data={data}
                            daysInMonth={daysInMonth}
                            Download={Download}
                            exportData={exportData}
                            formatCurrency={formatCurrency}
                            Heart={Heart}
                            PieChart={PieChart}
                            setPricesModal={setPricesModal}
                            Sparkles={Sparkles}
                            TrendingUp={TrendingUp}
                            Trophy={Trophy}
                            viewMode={viewMode}
                            Wallet={Wallet}
                        />
                    )}
                </div>

                {/* Nav */}
                <BottomNavigation
                    BarChart3={BarChart3}
                    FileText={FileText}
                    Home={Home}
                    importScope={importScope}
                    menuOpen={menuOpen}
                    onFileImport={() => fileInputRef.current.click()}
                    onOpenManual={() => { setMenuOpen(false); setModalOpen(true); }}
                    onSetImportScope={setImportScope}
                    onSetTab={setTab}
                    onToggleMenu={() => setMenuOpen(!menuOpen)}
                    Sparkles={Sparkles}
                    tab={tab}
                    Target={Target}
                    Wallet={Wallet}
                />

                <input type="file" ref={fileInputRef} onChange={handleUniversalUpload} accept="image/*,.pdf,.csv,.xlsx,.xls" className="hidden" />

                <input type="file" ref={fileInputRef} onChange={handleUniversalUpload} accept="image/*,.pdf,.csv,.xlsx,.xls" className="hidden" />

                {/* Modal Settings */}
                {
                    settingsModal && (
                        <SettingsModal
                            apiKey={apiKey}
                            appBuildStamp={APP_BUILD_STAMP}
                            appVersion={APP_VERSION}
                            onApiKeyChange={setApiKey}
                            onClose={() => setSettingsModal(false)}
                            onExportData={exportData}
                            onResetDatabase={resetDatabase}
                            onSave={() => {
                                localStorage.setItem('gemini_api_key', apiKey);
                                alert('Salvo!');
                                setSettingsModal(false);
                            }}
                            Download={Download}
                            Key={Key}
                            Settings={Settings}
                            Trash2={Trash2}
                            X={X}
                        />
                    )
                }

                {/* Modal Add (Manual) - VERSAO FINAL */}
                {
                    modalOpen && (
                        <TransactionModal
                            BANKS={BANKS}
                            Banknote={Banknote}
                            Calendar={Calendar}
                            CATEGORIES={CATEGORIES}
                            CheckCircle={CheckCircle}
                            data={data}
                            FIXED_INCOME_CATEGORIES={FIXED_INCOME_CATEGORIES}
                            fAmount={fAmount}
                            fBank={fBank}
                            fCat={fCat}
                            fDate={fDate}
                            fDreamId={fDreamId}
                            fInvoiceMonth={fInvoiceMonth}
                            fIsCard={fIsCard}
                            fIsProjection={fIsProjection}
                            fMarket={fMarket}
                            formPayer={formPayer}
                            formatCurrency={formatCurrency}
                            fQty={fQty}
                            fRecurrent={fRecurrent}
                            fRecurrenceCount={fRecurrenceCount}
                            fRecurrenceEndDate={fRecurrenceEndDate}
                            fRecurrenceEndMode={fRecurrenceEndMode}
                            fShared={fShared}
                            fSubCat={fSubCat}
                            fTitle={fTitle}
                            fType={fType}
                            fUnitPrice={fUnitPrice}
                            installments={installments}
                            isInstallment={isInstallment}
                            isSell={isSell}
                            MapPin={MapPin}
                            onClose={() => setModalOpen(false)}
                            onSubmit={saveTx}
                            P2P_CATEGORY={P2P_CATEGORY}
                            PieChart={PieChart}
                            profile={profile}
                            RefreshCw={RefreshCw}
                            setFAmount={setFAmount}
                            setFBank={setFBank}
                            setFCat={setFCat}
                            setFDate={setFDate}
                            setFDreamId={setFDreamId}
                            setFInvoiceMonth={setFInvoiceMonth}
                            setFIsCard={setFIsCard}
                            setFMarket={setFMarket}
                            setFQty={setFQty}
                            setFRecurrent={setFRecurrent}
                            setFRecurrenceCount={setFRecurrenceCount}
                            setFRecurrenceEndDate={setFRecurrenceEndDate}
                            setFRecurrenceEndMode={setFRecurrenceEndMode}
                            setFShared={setFShared}
                            setFSubCat={setFSubCat}
                            setFTitle={setFTitle}
                            setFType={setFType}
                            setFUnitPrice={setFUnitPrice}
                            setFormPayer={setFormPayer}
                            setInstallments={setInstallments}
                            setIsInstallment={setIsInstallment}
                            setIsSell={setIsSell}
                            Sparkles={Sparkles}
                            Tag={Tag}
                            TrendingDown={TrendingDown}
                            TrendingUp={TrendingUp}
                            Type={Type}
                            uniqueMarkets={uniqueMarkets}
                            uniqueTitles={uniqueTitles}
                            User={User}
                            USER_CONFIG={USER_CONFIG}
                            Users={Users}
                            viewMode={viewMode}
                            X={X}
                        />
                    )
                }

                {/* Modal Budget (Atualizado v23: Soma Automatica de Filhos) */}
                {
                    budgetModal && (
                        <BudgetModal
                            budgetSearch={budgetSearch}
                            editBudgets={editBudgets}
                            onBudgetSearchChange={setBudgetSearch}
                            onClose={() => setBudgetModal(false)}
                            onSave={saveBudget}
                            onUpdateBudgetLimit={(category, value) => {
                                const realIndex = editBudgets.findIndex((budget) => budget.category === category);
                                const nextBudgets = [...editBudgets];
                                nextBudgets[realIndex].limit = Number(value);
                                setEditBudgets(nextBudgets);
                            }}
                            Search={Search}
                            Sparkles={Sparkles}
                            Target={Target}
                            X={X}
                        />
                    )
                }

                {/* NOVO MODAL: Atualizar Cota??es (Por Ativo) */}
                {
                    pricesModal && (
                        <PricesModal
                            currentPrices={currentPrices}
                            formatCurrency={formatCurrency}
                            isFetchingPrices={isFetchingPrices}
                            onChangePrice={(priceKey, value) => setCurrentPrices({ ...currentPrices, [priceKey]: value })}
                            onClose={() => setPricesModal(false)}
                            onFetchPrices={fetchBrapiPrices}
                            onOpenAssetHistory={setSelectedAssetHistory}
                            onSave={async () => {
                                await saveAssetPrices(currentPrices);
                                setPricesModal(false);
                            }}
                            portfolio={data.investData.portfolio}
                            Sparkles={Sparkles}
                            TrendingUp={TrendingUp}
                            X={X}
                            viewMode={viewMode}
                        />
                    )
                }

                {/* MODAL NOVO SONHO (Atualizado) */}
                {
                    dreamModal && (
                        <DreamModal
                            dEmoji={dEmoji}
                            dScope={dScope}
                            dTarget={dTarget}
                            dTitle={dTitle}
                            editingDreamId={editingDreamId}
                            onClose={() => { setDreamModal(false); setEditingDreamId(null); }}
                            onDelete={deleteDream}
                            onEmojiChange={setDEmoji}
                            onSave={saveDream}
                            onScopeChange={setDScope}
                            onTargetChange={setDTarget}
                            onTitleChange={setDTitle}
                            Sparkles={Sparkles}
                            Trash2={Trash2}
                            X={X}
                        />
                    )
                }

                {/* MODAL HIST?RICO DE ATIVO (Extrato) */}
                {
                    selectedAssetHistory && (
                        <AssetHistoryModal
                            assetName={selectedAssetHistory}
                            Banknote={Banknote}
                            formatCurrency={formatCurrency}
                            Minus={Minus}
                            onClose={() => setSelectedAssetHistory(null)}
                            PieChart={PieChart}
                            Plus={Plus}
                            profile={profile}
                            transactions={txs}
                            viewMode={viewMode}
                            X={X}
                        />
                    )
                }

            </div >
        );
    }

export default App;
