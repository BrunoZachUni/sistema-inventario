import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    runTransaction,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { LayoutDashboard, Package, ArrowRightLeft, History, PackagePlus, Users, Building, ChevronDown, CheckCircle, XCircle, FileSignature, Clock, HardDrive, Megaphone, PenSquare, Copy, Laptop, ShieldCheck, User, LogIn, ShoppingCart, Send, Hourglass, ThumbsUp, ThumbsDown, LogOut, Mail, Lock, Menu, FileText, Trash2, AlertTriangle } from 'lucide-react';

// --- Configuração do Firebase ---
// vvvvv  COLE A CONFIGURAÇÃO DO SEU PROJETO FIREBASE AQUI  vvvvv
const firebaseConfig = {
  apiKey: "AIzaSyC82k2mHjA12ajhteIn2ffZPlFAvEdUatU",
  authDomain: "inventario-f37f6.firebaseapp.com",
  projectId: "inventario-f37f6",
  storageBucket: "inventario-f37f6.appspot.com",
  messagingSenderId: "1041178967755",
  appId: "1:1041178967755:web:1813ecf1d66ef95c52654e",
  measurementId: "G-ZE0SXNT6SP"
};
// ^^^^^  COLE A CONFIGURAÇÃO DO SEU PROJETO FIREBASE AQUI  ^^^^^


const appId = firebaseConfig.projectId || 'default-inventory-app-v5';

// --- Main App Component ---
export default function App() {
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [authStatus, setAuthStatus] = useState({ loading: true, user: null, profile: null });

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firebaseAuth = getAuth(app);
            const firestoreDb = getFirestore(app);
            setAuth(firebaseAuth);
            setDb(firestoreDb);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (authUser) => {
                try {
                    if (authUser) {
                        const userDocRef = doc(firestoreDb, `users/${authUser.uid}`);
                        const userDocSnap = await getDoc(userDocRef);
                        const userProfile = userDocSnap.exists() 
                            ? userDocSnap.data() 
                            : { role: 'user', name: 'Utilizador sem nome', email: authUser.email };
                        
                        setAuthStatus({ loading: false, user: authUser, profile: userProfile });
                    } else {
                        setAuthStatus({ loading: false, user: null, profile: null });
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    if(firebaseAuth) signOut(firebaseAuth);
                    setAuthStatus({ loading: false, user: null, profile: null });
                }
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setAuthStatus({ loading: false, user: null, profile: null });
        }
    }, []);

    if (authStatus.loading) {
        return <LoadingScreen />;
    }

    if (!authStatus.user) {
        return <LoginScreen auth={auth} db={db} />;
    }
    
    if (authStatus.profile?.role === 'admin') {
        return <AdminLayout db={db} auth={auth} appId={appId} adminUser={authStatus.user} adminProfile={authStatus.profile} />;
    }

    return <UserLayout db={db} auth={auth} appId={appId} currentUser={authStatus.user} userProfile={authStatus.profile} />;
}

// --- Loading & Login Screens ---
const LoadingScreen = () => (
    <div className="bg-gray-900 min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-300">A carregar o sistema...</p>
    </div>
);

const LoginScreen = ({ auth, db }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        if (!auth || !db) {
            setError("Sistema de autenticação não está pronto. Tente novamente em alguns segundos.");
            return;
        }
        try {
            if (isLoginView) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                if (!name.trim()) {
                    setError("Por favor, preencha o seu nome completo.");
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    name: name.trim(),
                    email: userCredential.user.email,
                    role: 'user',
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
             switch (err.code) {
                case 'auth/invalid-credential':
                case 'auth/wrong-password':
                case 'auth/user-not-found':
                    setError('Credenciais inválidas. Verifique o seu e-mail e palavra-passe.');
                    break;
                case 'auth/email-already-in-use':
                    setError('Este e-mail já está a ser utilizado por outra conta.');
                    break;
                case 'auth/weak-password':
                    setError('A palavra-passe é muito fraca. Utilize pelo menos 6 caracteres.');
                    break;
                case 'auth/operation-not-allowed':
                    setError('Operação não permitida. Verifique se o método de login "E-mail/palavra-passe" está ativado no seu projeto Firebase.');
                    break;
                default:
                    setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
                    console.error("Firebase Auth Error:", err);
                    break;
            }
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 to-slate-800 min-h-screen flex justify-center items-center p-4">
            <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 ring-1 ring-white/10 text-center animate-fade-in-up">
                <h1 className="text-3xl font-bold text-white mb-2">{isLoginView ? 'Login' : 'Criar Conta'}</h1>
                <p className="text-gray-400 mb-8">{isLoginView ? 'Aceda ao sistema com as suas credenciais.' : 'Crie uma nova conta para começar.'}</p>
                <form onSubmit={handleAuthAction} className="space-y-4">
                    {!isLoginView && (
                        <InputField label="Nome Completo" value={name} onChange={e => setName(e.target.value)} placeholder="O seu nome completo" icon={User} />
                    )}
                    <InputField type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" icon={Mail} />
                    <InputField type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="A sua palavra-passe" icon={Lock} />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-green-600/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
                        <LogIn size={20}/> {isLoginView ? 'Entrar' : 'Registar'}
                    </button>
                </form>
                <button onClick={() => setIsLoginView(!isLoginView)} className="mt-6 text-sm text-blue-400 hover:underline">
                    {isLoginView ? 'Não tem uma conta? Crie uma agora.' : 'Já tem uma conta? Faça login.'}
                </button>
            </div>
        </div>
    );
};

// --- ADMIN SECTION ---
function AdminLayout({ db, auth, appId, adminUser, adminProfile }) {
    const [department, setDepartment] = useState('TI');
    const [activeView, setActiveView] = useState('dashboard');
    const [items, setItems] = useState([]);
    const [logs, setLogs] = useState([]);
    const [requests, setRequests] = useState([]);
    const [modalState, setModalState] = useState({ type: null, data: null });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const departmentColors = useMemo(() => ({
        TI: { name: 'TI', icon: HardDrive, bg: 'bg-blue-600', hoverBg: 'hover:bg-blue-700', ring: 'focus:ring-blue-500', border: 'border-blue-500/50', text: 'text-blue-300', lightBg: 'bg-blue-900/50', shadow: 'shadow-blue-500/50' },
        Marketing: { name: 'Marketing', icon: Megaphone, bg: 'bg-orange-600', hoverBg: 'hover:bg-orange-700', ring: 'focus:ring-orange-500', border: 'border-orange-500/50', text: 'text-orange-300', lightBg: 'bg-orange-900/50', shadow: 'shadow-orange-500/50' },
    }), []);
    const colors = departmentColors[department];
    const departmentKeys = useMemo(() => Object.keys(departmentColors), [departmentColors]);

    useEffect(() => {
        if (!db) return;
        
        const itemsPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_items`;
        const logsPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_logs`;
        const requestsPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_requests`;

        const unsubItems = onSnapshot(query(collection(db, itemsPath)), (snapshot) => setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubLogs = onSnapshot(query(collection(db, logsPath)), (snapshot) => setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))));
        const unsubRequests = onSnapshot(query(collection(db, requestsPath)), (snapshot) => setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))));
        
        return () => { unsubItems(); unsubLogs(); unsubRequests(); };
    }, [department, db, appId]);

    const handleResolvePendingClick = (log) => setModalState({ type: 'resolve_options', data: log });
    const handleDeleteItemClick = (item) => setModalState({ type: 'confirm_delete', data: item });
    
    const openSidebar = () => setIsSidebarOpen(true);

    const renderView = () => {
        const viewProps = { items, logs, requests, colors, db, appId, department, onResolvePendingClick: handleResolvePendingClick, adminUser, adminProfile, onDeleteItemClick: handleDeleteItemClick };
        switch (activeView) {
            case 'dashboard': return <AdminDashboardView {...viewProps} />;
            case 'inventory': return <AdminInventoryView {...viewProps} />;
            case 'requests': return <AdminRequestsView {...viewProps} />;
            case 'history': return <AdminHistoryView {...viewProps} />;
            case 'reports': return <AdminReportsView db={db} appId={appId} departments={departmentKeys} />;
            default: return <AdminDashboardView {...viewProps} />;
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 to-slate-800 min-h-screen flex text-gray-200 font-sans">
            {modalState.type && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />}
            {modalState.type === 'resolve_options' && <ResolveOptionsModal onClose={() => setModalState({ type: null, data: null })} onLocalSign={() => setModalState({ type: 'local', data: modalState.data })} onRemoteSign={() => setModalState({ type: 'remote', data: modalState.data })} onManualConfirm={() => setModalState({ type: 'manual_confirm', data: modalState.data })} />}
            {modalState.type === 'local' && <SignatureModal log={modalState.data} onClose={() => setModalState({ type: null, data: null })} db={db} appId={appId} department={department} />}
            {modalState.type === 'remote' && modalState.data && <RemoteSignatureModal term={{ logId: modalState.data.id, department: department, receiver: modalState.data.receiver, itemName: modalState.data.itemName }} onClose={() => setModalState({ type: null, data: null })} />}
            {modalState.type === 'manual_confirm' && <ManualConfirmationModal log={modalState.data} onClose={() => setModalState({ type: null, data: null })} db={db} appId={appId} department={department} />}
            {modalState.type === 'confirm_delete' && <ConfirmDeleteModal item={modalState.data} onClose={() => setModalState({ type: null, data: null })} db={db} appId={appId} department={department} />}
            
            <AdminSidebar activeView={activeView} setActiveView={setActiveView} department={department} setDepartment={setDepartment} colors={colors} departmentOptions={departmentColors} pendingRequests={(requests || []).filter(r => r.status === 'pending').length} auth={auth} adminUser={adminUser} adminProfile={adminProfile} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col">
                <header className="md:hidden p-4 bg-gray-900/50 backdrop-blur-lg flex items-center justify-between ring-1 ring-white/10">
                    <button onClick={openSidebar} className="p-2">
                        <Menu size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-white">Admin</h1>
                </header>
                <main className="flex-1 p-6 md:p-10 overflow-y-auto">{renderView()}</main>
            </div>
        </div>
    );
}

function AdminSidebar({ activeView, setActiveView, department, setDepartment, colors, departmentOptions, pendingRequests, auth, adminUser, adminProfile, isOpen, setIsOpen }) {
    const navItems = [
        { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventário', icon: Package },
        { id: 'requests', label: 'Solicitações', icon: ArrowRightLeft, badge: pendingRequests },
        { id: 'history', label: 'Histórico', icon: History },
        { id: 'reports', label: 'Relatórios', icon: FileText },
    ];

    const handleNavClick = (viewId) => {
        setActiveView(viewId);
        if(setIsOpen) setIsOpen(false);
    };

    const sidebarContent = (
        <>
            <div className="flex items-center justify-between mb-10">
                <h1 className="text-2xl font-bold text-white tracking-wider">Inventário</h1>
                <button onClick={() => setIsOpen && setIsOpen(false)} className="md:hidden p-2">
                    <XCircle size={24} />
                </button>
            </div>
            <div className="mb-10">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Setor</label>
                <div className="mt-2 flex flex-col space-y-2">
                    {Object.entries(departmentOptions).map(([key, value]) => (
                        <button key={key} onClick={() => setDepartment(key)} className={`flex items-center w-full text-left p-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${department === key ? `${value.bg} text-white shadow-lg ${value.shadow}` : 'text-gray-300 hover:bg-gray-700/50'}`}>
                            <value.icon className="mr-3" size={20} />
                            <span className="font-semibold">{value.name}</span>
                        </button>
                    ))}
                </div>
            </div>
            <nav className="flex-1">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Menu Admin</label>
                <ul className="mt-2 space-y-2">
                    {navItems.map(item => (
                        <li key={item.id}>
                            <button onClick={() => handleNavClick(item.id)} className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200 ${activeView === item.id ? `bg-white/10 ${colors.text}` : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <item.icon className="mr-3" size={20} />
                                <span className="font-medium flex-1 text-left">{item.label}</span>
                                {item.badge > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{item.badge}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="mt-auto">
                <p className="text-sm text-gray-400">Sessão iniciada como:</p>
                <p className="font-semibold text-white truncate">{adminProfile?.name || adminUser?.email}</p>
                <button onClick={() => signOut(auth)} className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-red-600/50 hover:bg-red-500/50 text-red-300 rounded-lg text-sm font-semibold transition-colors">
                    <LogOut size={16} /> Sair
                </button>
            </div>
        </>
    );

    return (
        <>
            <div className={`fixed inset-0 z-50 transform md:hidden transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="w-64 bg-gray-900/70 backdrop-blur-lg h-full p-4 ring-1 ring-white/10 flex flex-col">{sidebarContent}</div></div>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen && setIsOpen(false)}></div>}
            <aside className="w-64 flex-col p-4 hidden md:flex">{sidebarContent}</aside>
        </>
    );
}

function AdminDashboardView({ items, logs, requests, colors, onResolvePendingClick }) {
    const totalStock = (items || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
    const pendingRequests = (requests || []).filter(r => r.status === 'pending');
    return (
        <div>
            <ViewHeader title="Visão Geral do Admin" subtitle={`Resumo do inventário de ${colors.name} e atividades.`} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <InfoCard title="Tipos de Itens" value={(items || []).length} icon={Package} colors={colors} />
                <InfoCard title="Itens em Stock" value={totalStock} icon={PackagePlus} colors={colors} />
                <InfoCard title="Solicitações Pendentes" value={pendingRequests.length} icon={Hourglass} colors={colors} />
            </div>
            <DataCard title="Atividade Recente" icon={<History className={colors.text} size={24}/>} colors={colors}>
                <div className="space-y-4">
                    {(logs || []).slice(0, 5).map(log => <LogItem key={log.id} log={log} onResolvePendingClick={onResolvePendingClick} />)}
                    {(logs || []).length === 0 && <p className="text-gray-400 text-center py-4">Nenhuma atividade recente.</p>}
                </div>
            </DataCard>
        </div>
    );
}

function AdminInventoryView({ items, db, appId, department, colors, onDeleteItemClick }) {
    const [newItemName, setNewItemName] = useState('');
    const [newItemStock, setNewItemStock] = useState('');
    
    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim() || !newItemStock || parseInt(newItemStock) <= 0) return;
        try {
            const itemsPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_items`;
            await addDoc(collection(db, itemsPath), { name: newItemName.trim(), quantity: parseInt(newItemStock) });
            setNewItemName(''); setNewItemStock('');
        } catch (error) { console.error("Erro ao adicionar item.", error); }
    };
    return (
        <div>
            <ViewHeader title="Inventário" subtitle={`Faça a gestão e adicione itens para o setor de ${department}`} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <DataCard title="Lista de Itens" icon={<Package className={colors.text} size={24}/>} colors={colors}>
                        <div className="space-y-3">
                            {(items || []).map(item => (
                                <div key={item.id} className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg ring-1 ring-white/5">
                                    <span className="font-medium text-gray-200">{item.name || 'Item sem nome'}</span>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-bold text-lg px-3 py-1 rounded-full ${colors.lightBg} ${colors.text} ring-1 ring-inset ring-white/10`}>{item.quantity || 0}</span>
                                        <button onClick={() => onDeleteItemClick(item)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DataCard>
                </div>
                <div>
                    <FormCard title="Adicionar Novo Item" icon={<PackagePlus className={colors.text} size={24}/>} colors={colors}>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <InputField label="Nome do Item" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Ex: Rato sem fios" colors={colors} />
                            <InputField label="Stock Inicial" type="number" value={newItemStock} onChange={(e) => setNewItemStock(e.target.value)} placeholder="Ex: 50" colors={colors} />
                            <button type="submit" className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ${colors.bg} ${colors.hoverBg} ${colors.ring} shadow-lg ${colors.shadow} hover:scale-105 transform`}>Adicionar</button>
                        </form>
                    </FormCard>
                </div>
            </div>
        </div>
    );
}

function AdminRequestsView({ requests, db, appId, department, adminUser }) {
    const pending = (requests || []).filter(r => r.status === 'pending');
    const approved = (requests || []).filter(r => r.status === 'approved');
    const denied = (requests || []).filter(r => r.status === 'denied');

    const handleApprove = async (request) => {
        const itemRef = doc(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_items`, request.itemId);
        const requestRef = doc(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_requests`, request.id);
        const logsCollection = collection(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_logs`);

        try {
            await runTransaction(db, async (transaction) => {
                const itemDoc = await transaction.get(itemRef);
                if (!itemDoc.exists()) throw "Item não encontrado!";
                
                const currentQuantity = itemDoc.data().quantity;
                if (currentQuantity < request.quantity) throw "Stock insuficiente!";

                const newQuantity = currentQuantity - request.quantity;
                transaction.update(itemRef, { quantity: newQuantity });
                transaction.update(requestRef, { 
                    status: 'approved',
                    processedBy: adminUser.email,
                    processedAt: serverTimestamp()
                });
                
                const newLog = {
                    type: 'distribuição',
                    itemName: request.itemName,
                    quantity: request.quantity,
                    distributor: adminUser.email,
                    receiver: request.userName,
                    timestamp: serverTimestamp(),
                    signatureStatus: 'pending',
                    signature: null,
                    signatureTimestamp: null,
                    requestId: request.id,
                };
                transaction.set(doc(logsCollection), newLog);
            });
        } catch (e) {
            console.error("Transaction failed: ", e);
        }
    };

    const handleDeny = async (request) => {
        try {
            const requestRef = doc(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_requests`, request.id);
            await updateDoc(requestRef, { 
                status: 'denied',
                processedBy: adminUser.email,
                processedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error denying request:", error);
        }
    };

    const RequestCard = ({ request }) => {
        if (!request) return null;
        return (
            <div className="bg-gray-800/50 p-4 rounded-lg ring-1 ring-white/10">
                <p className="font-bold text-white">{(request.quantity || 0)}x {request.itemName || 'Item desconhecido'}</p>
                <p className="text-sm text-gray-400">Solicitado por: {request.userName || 'Utilizador desconhecido'}</p>
                <p className="text-xs text-gray-500">Em: {formatFirebaseTimestamp(request.timestamp)}</p>
                {request.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                        <button onClick={() => handleApprove(request)} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-bold py-2 px-3 rounded-md transition-colors">Aprovar</button>
                        <button onClick={() => handleDeny(request)} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-bold py-2 px-3 rounded-md transition-colors">Negar</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            <ViewHeader title="Solicitações de Itens" subtitle={`Faça a gestão dos pedidos do setor de ${department}`} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                    <h3 className="font-bold text-lg mb-2 text-amber-400">Pendentes ({pending.length})</h3>
                    <div className="space-y-3">{pending.map(r => <RequestCard key={r.id} request={r} />)}</div>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-2 text-green-400">Aprovadas ({approved.length})</h3>
                    <div className="space-y-3">{approved.map(r => <RequestCard key={r.id} request={r} />)}</div>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-2 text-red-400">Negadas ({denied.length})</h3>
                    <div className="space-y-3">{denied.map(r => <RequestCard key={r.id} request={r} />)}</div>
                </div>
            </div>
        </div>
    );
}

function AdminHistoryView({ logs, onResolvePendingClick }) {
    return (
        <div>
            <ViewHeader title="Histórico Completo" subtitle="Todas as movimentações registadas no sistema." />
            <DataCard title="Registos" icon={<History className="text-gray-400" size={24}/>} colors={{border: 'border-gray-600/50'}}>
                 <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {(logs || []).map(log => <LogItem key={log.id} log={log} onResolvePendingClick={onResolvePendingClick} />)}
                 </div>
            </DataCard>
        </div>
    );
}

function AdminReportsView({ db, appId, departments }) {
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userReport, setUserReport] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!db) return;
            try {
                const usersCollection = collection(db, 'users');
                const usersSnapshot = await getDocs(usersCollection);
                const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllUsers(usersData);
            } catch (error) {
                console.error("Error fetching users for report. Check Firestore rules:", error);
                setAllUsers([]);
            }
        };
        fetchUsers();
    }, [db]);

    useEffect(() => {
        const generateReport = async () => {
            if (!selectedUserId || !db || !appId || !departments) {
                setUserReport([]);
                return;
            }
            setIsLoading(true);
            try {
                const reportPromises = departments.map(dept => {
                    const requestsPath = `/artifacts/${appId}/public/data/${dept.toLowerCase()}_requests`;
                    const q = query(
                        collection(db, requestsPath),
                        where("userId", "==", selectedUserId)
                    );
                    return getDocs(q);
                });

                const snapshots = await Promise.all(reportPromises);
                let combinedRequests = [];
                snapshots.forEach(snapshot => {
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.status === 'approved' || data.status === 'denied') {
                            combinedRequests.push({ id: doc.id, ...data });
                        }
                    });
                });

                combinedRequests.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
                setUserReport(combinedRequests);
            } catch (error) {
                console.error("Erro ao gerar relatório:", error);
                setUserReport([]);
            } finally {
                setIsLoading(false);
            }
        };

        generateReport();
    }, [selectedUserId, db, appId, departments]);

    const ReportStatusBadge = ({ status }) => {
        if (status === 'approved') {
            return <span className="flex items-center text-sm font-medium text-green-400"><ThumbsUp size={14} className="mr-1.5"/> Aprovado</span>;
        }
        return <span className="flex items-center text-sm font-medium text-red-400"><ThumbsDown size={14} className="mr-1.5"/> Negado</span>;
    };
    
    const selectedUserName = (allUsers.find(u => u.id === selectedUserId)?.name || '');

    return (
        <div>
            <ViewHeader title="Relatório por Utilizador" subtitle="Visualize todas as solicitações finalizadas de um utilizador específico." />
            <FormCard title="Gerar Relatório" icon={<Users className="text-gray-400" size={24}/>} colors={{border: 'border-gray-600/50'}}>
                <SelectField
                    label="Selecione um Utilizador"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    options={allUsers.map(u => ({ id: u.id, name: u.name || u.email }))}
                    placeholder="Selecione um utilizador..."
                />
            </FormCard>

            {isLoading && (
                <div className="flex justify-center items-center mt-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="ml-3 text-gray-300">A procurar registos...</p>
                </div>
            )}

            {!isLoading && selectedUserId && (
                <div className="mt-8">
                    <DataCard title={`Relatório para ${selectedUserName}`} icon={<History className="text-gray-400" size={24}/>} colors={{border: 'border-gray-600/50'}}>
                        {userReport.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left table-auto">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                                        <tr>
                                            <th className="p-3">Item</th>
                                            <th className="p-3">Data da Solicitação</th>
                                            <th className="p-3">Estado</th>
                                            <th className="p-3">Processado Por</th>
                                            <th className="p-3">Data da Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {userReport.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-800/40">
                                                <td className="p-3 font-medium text-white">{req.quantity || 0}x {req.itemName || 'Item desconhecido'}</td>
                                                <td className="p-3 text-gray-300">{formatFirebaseTimestamp(req.timestamp)}</td>
                                                <td className="p-3"><ReportStatusBadge status={req.status} /></td>
                                                <td className="p-3 text-gray-300">{req.processedBy || 'N/A'}</td>
                                                <td className="p-3 text-gray-300">{formatFirebaseTimestamp(req.processedAt, 'N/A')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-6">Nenhuma solicitação finalizada foi encontrada para este utilizador.</p>
                        )}
                    </DataCard>
                </div>
            )}
        </div>
    );
}


// --- USER SECTION ---
function UserLayout({ db, auth, appId, currentUser, userProfile }) {
    const [department, setDepartment] = useState('TI');
    const [activeView, setActiveView] = useState('catalog');
    const [cart, setCart] = useState([]);

    const departmentColors = useMemo(() => ({
        TI: { name: 'TI', icon: HardDrive, bg: 'bg-blue-600', hoverBg: 'hover:bg-blue-700', ring: 'focus:ring-blue-500', border: 'border-blue-500/50', text: 'text-blue-300', lightBg: 'bg-blue-900/50', shadow: 'shadow-blue-500/50' },
        Marketing: { name: 'Marketing', icon: Megaphone, bg: 'bg-orange-600', hoverBg: 'hover:bg-orange-700', ring: 'focus:ring-orange-500', border: 'border-orange-500/50', text: 'text-orange-300', lightBg: 'bg-orange-900/50', shadow: 'shadow-orange-500/50' },
    }), []);
    const colors = departmentColors[department];

    const addToCart = (item, quantity) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(i => i.id === item.id);
            if (existingItem) {
                return prevCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
            }
            return [...prevCart, { ...item, quantity }];
        });
    };
    
    const submitRequest = async () => {
        if (cart.length === 0 || !currentUser || !userProfile) return;
        const requestsCollection = collection(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_requests`);
        
        const requestPromises = cart.map(item => {
            return addDoc(requestsCollection, {
                userId: currentUser.uid,
                userName: userProfile.name,
                userEmail: currentUser.email,
                itemId: item.id,
                itemName: item.name,
                quantity: item.quantity,
                status: 'pending',
                timestamp: serverTimestamp(),
                department: department
            });
        });

        try {
            await Promise.all(requestPromises);
            setCart([]);
        } catch (error) {
            console.error("Error submitting requests:", error);
        }
    };

    const renderView = () => {
        switch (activeView) {
            case 'catalog': return <UserItemCatalogView db={db} appId={appId} department={department} onAddToCart={addToCart} />;
            case 'requests': return <UserMyRequestsView db={db} appId={appId} currentUser={currentUser} />;
            default: return <UserItemCatalogView db={db} appId={appId} department={department} onAddToCart={addToCart} />;
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 to-slate-800 min-h-screen text-gray-200 font-sans">
            <header className="p-4 flex justify-between items-center bg-gray-900/50 backdrop-blur-lg ring-1 ring-white/10">
                <div>
                    <h1 className="text-xl font-bold text-white">Portal do Utilizador</h1>
                    <p className="text-sm text-gray-400">Bem-vindo, {userProfile?.name || currentUser?.email}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveView('catalog')} className={`font-semibold transition-colors ${activeView === 'catalog' ? colors.text : 'text-gray-400 hover:text-white'}`}>Catálogo</button>
                    <button onClick={() => setActiveView('requests')} className={`font-semibold transition-colors ${activeView === 'requests' ? colors.text : 'text-gray-400 hover:text-white'}`}>As Minhas Solicitações</button>
                    <button onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300"><LogOut size={20} /></button>
                </div>
            </header>
            <main className="p-6 md:p-10">
                <div className="flex justify-center mb-6">
                    <div className="flex rounded-lg bg-gray-800/50 p-1 ring-1 ring-white/10">
                        {Object.entries(departmentColors).map(([key, value]) => (
                            <button key={key} onClick={() => setDepartment(key)} className={`px-4 py-2 rounded-md font-semibold transition-colors text-sm ${department === key ? `${value.bg} text-white` : 'text-gray-300'}`}>{value.name}</button>
                        ))}
                    </div>
                </div>
                {renderView()}
            </main>
            {cart.length > 0 && (
                <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/70 backdrop-blur-lg ring-1 ring-white/10 flex justify-between items-center">
                    <p className="font-semibold">{cart.reduce((acc, item) => acc + item.quantity, 0)} itens no carrinho</p>
                    <button onClick={submitRequest} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <Send size={16}/> Enviar Solicitação
                    </button>
                </footer>
            )}
        </div>
    );
}

function UserItemCatalogView({ db, appId, department, onAddToCart }) {
    const [items, setItems] = useState([]);
    useEffect(() => {
        if (!db) return;
        const itemsPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_items`;
        const q = query(collection(db, itemsPath), where("quantity", ">", 0));
        const unsub = onSnapshot(q, (snapshot) => setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        return unsub;
    }, [db, appId, department]);

    const ItemCard = ({ item }) => {
        const [quantity, setQuantity] = useState(1);
        return (
            <div className="bg-gray-800/50 backdrop-blur-lg p-4 rounded-xl ring-1 ring-white/10 flex flex-col">
                <p className="font-bold text-lg text-white flex-1">{item.name}</p>
                <div className="flex items-center gap-2 mt-4">
                    <InputField type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} colors={{ ring: 'focus:ring-blue-500' }}/>
                    <button onClick={() => onAddToCart(item, quantity)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-3 rounded-lg"><ShoppingCart size={20}/></button>
                </div>
            </div>
        );
    };

    return (
        <div>
            <ViewHeader title="Catálogo de Itens" subtitle={`Selecione os itens que deseja solicitar do setor de ${department}`} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(items || []).map(item => <ItemCard key={item.id} item={item} />)}
                {(items || []).length === 0 && <p className="text-gray-400 text-center py-4">Nenhum item disponível neste setor.</p>}
            </div>
        </div>
    );
}

function UserMyRequestsView({ db, appId, currentUser }) {
    const [tiRequests, setTiRequests] = useState([]);
    const [mktRequests, setMktRequests] = useState([]);

    useEffect(() => {
        if (!db || !currentUser?.uid) return;
        const tiPath = `/artifacts/${appId}/public/data/ti_requests`;
        const qTi = query(collection(db, tiPath), where("userId", "==", currentUser.uid));
        const unsubTi = onSnapshot(qTi, (snap) => {
            setTiRequests(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
        return () => unsubTi();
    }, [db, appId, currentUser]);

    useEffect(() => {
        if (!db || !currentUser?.uid) return;
        const mktPath = `/artifacts/${appId}/public/data/marketing_requests`;
        const qMkt = query(collection(db, mktPath), where("userId", "==", currentUser.uid));
        const unsubMkt = onSnapshot(qMkt, (snap) => {
            setMktRequests(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
        return () => unsubMkt();
    }, [db, appId, currentUser]);

    const sortedRequests = useMemo(() => 
        [...tiRequests, ...mktRequests].sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)),
        [tiRequests, mktRequests]
    );

    const StatusBadge = ({ status }) => {
        const styles = {
            pending: { icon: Hourglass, text: 'Pendente', color: 'text-amber-400' },
            approved: { icon: ThumbsUp, text: 'Aprovado', color: 'text-green-400' },
            denied: { icon: ThumbsDown, text: 'Negado', color: 'text-red-400' },
        };
        const current = styles[status] || styles.pending;
        return (
            <div className={`flex items-center gap-2 font-semibold ${current.color}`}>
                <current.icon size={16} /> {current.text}
            </div>
        );
    };

    return (
        <div>
            <ViewHeader title="As Minhas Solicitações" subtitle="Acompanhe o estado dos seus pedidos." />
            <div className="space-y-4">
                {sortedRequests.map(req => (
                    <div key={req.id} className="bg-gray-800/50 p-4 rounded-lg ring-1 ring-white/10 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-white">{req.quantity}x {req.itemName}</p>
                            <p className="text-sm text-gray-400">Setor: {req.department}</p>
                        </div>
                        <StatusBadge status={req.status} />
                    </div>
                ))}
                 {sortedRequests.length === 0 && <p className="text-gray-400 text-center py-4">Nenhuma solicitação encontrada.</p>}
            </div>
        </div>
    );
}


// --- Reusable UI Components & Helpers ---

const formatFirebaseTimestamp = (timestamp, fallback = '...') => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        try {
            return new Date(timestamp.toDate()).toLocaleString('pt-BR');
        } catch (error) {
            return fallback;
        }
    }
    return fallback;
};

const ModalWrapper = ({ children, onClose }) => ( 
    <div className="fixed inset-0 z-50 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-8 max-w-lg w-full ring-1 ring-white/10 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

const ConfirmDeleteModal = ({ item, onClose, db, appId, department }) => {
    const handleDelete = async () => {
        if(!item || !db || !appId || !department) return;
        try {
            const itemPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_items/${item.id}`;
            await deleteDoc(doc(db, itemPath));
            onClose();
        } catch (e) {
            console.error("Error deleting item:", e);
        }
    };

    return (
        <ModalWrapper onClose={onClose}>
            <div className="flex items-center mb-4">
                <AlertTriangle className="text-red-500" size={24} />
                <h3 className="text-2xl font-bold ml-3 text-gray-100">Confirmar Exclusão</h3>
            </div>
            <p className="text-gray-300 mb-6">
                Tem a certeza que deseja excluir o item <strong className="text-white">{item?.name || 'selecionado'}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex space-x-4 pt-2">
                <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-3 px-4 rounded-lg">Cancelar</button>
                <button onClick={handleDelete} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg">Sim, Excluir</button>
            </div>
        </ModalWrapper>
    );
};

const ResolveOptionsModal = ({ onClose, onLocalSign, onRemoteSign, onManualConfirm }) => (<ModalWrapper onClose={onClose}><h3 className="text-2xl font-bold text-gray-100 mb-2">Resolver Pendência</h3><p className="text-gray-300 mb-6">Como deseja registar a confirmação?</p><div className="flex flex-col md:flex-row gap-4"><button onClick={onLocalSign} className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-200 text-center ring-1 ring-white/10 transform hover:scale-105"><Laptop size={32} className="mb-2 text-blue-400" /><span className="font-bold text-lg text-white">Assinatura Local</span><span className="text-sm text-gray-400">A pessoa assina neste computador.</span></button><button onClick={onRemoteSign} className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-200 text-center ring-1 ring-white/10 transform hover:scale-105"><Copy size={32} className="mb-2 text-orange-400" /><span className="font-bold text-lg text-white">Assinatura Remota</span><span className="text-sm text-gray-400">Copiar texto para enviar.</span></button><button onClick={onManualConfirm} className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-200 text-center ring-1 ring-white/10 transform hover:scale-105"><ShieldCheck size={32} className="mb-2 text-green-400" /><span className="font-bold text-lg text-white">Confirmar Manualmente</span><span className="text-sm text-gray-400">Recebi a confirmação por fora.</span></button></div><button onClick={onClose} className="mt-8 w-full text-center text-gray-400 hover:underline">Cancelar</button></ModalWrapper>);
const SignatureModal = ({ log, onClose, db, appId, department }) => {
    const [signerName, setSignerName] = useState('');
    const handleSign = async () => {
        if (!signerName.trim() || !log) return;
        try {
            const logPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_logs/${log.id}`;
            await updateDoc(doc(db, logPath), { signatureStatus: 'signed', signature: signerName.trim(), signatureTimestamp: serverTimestamp() });
            onClose();
        } catch (e) { console.error("Error signing document:", e); }
    };
    return (<ModalWrapper onClose={onClose}><div className="flex items-center mb-6"><FileSignature className="text-gray-400 mr-4" size={40} /><div><h2 className="text-2xl font-bold text-white">Termo de {log?.type === 'distribuição' ? 'Responsabilidade' : 'Devolução'}</h2><p className="text-gray-400">ID: {log?.id}</p></div></div><div className="space-y-4 text-gray-300 border-y border-white/10 py-6 my-6"><p>Confirmo a seguinte operação:</p><ul className="list-disc list-inside bg-gray-900/70 p-4 rounded-lg space-y-2 ring-1 ring-white/10"><li><strong>Item:</strong> {log?.itemName}</li><li><strong>Quantidade:</strong> {log?.quantity}</li><li><strong>Para:</strong> {log?.receiver}</li></ul></div><div className="space-y-4"><p className="text-sm text-gray-400">Para confirmar, a pessoa que {log?.type === 'distribuição' ? 'recebeu' : 'devolveu'} deve digitar o nome completo abaixo.</p><InputField label="Nome Completo (Assinatura Digital)" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Digite o nome completo aqui" colors={{ring: 'focus:ring-green-500'}} /><div className="flex space-x-4 pt-2"><button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-3 px-4 rounded-lg">Cancelar</button><button onClick={handleSign} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">Assinar e Confirmar</button></div></div></ModalWrapper>);
};
const RemoteSignatureModal = ({ term, onClose }) => {
    const emailBody = `Assunto: Confirmação de Recebimento - ${term?.itemName}\n\nOlá, ${term?.receiver}.\n\nPara registar a entrega do item "${term?.itemName}", por favor, responda a este e-mail com a frase "Confirmo o recebimento".\n\nObrigado.`;
    const [copied, setCopied] = useState(false);
    const copyToClipboard = (text) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed'; textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus(); textArea.select();
        try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } 
        catch (err) { console.error('Fallback: Oops, unable to copy', err); }
        document.body.removeChild(textArea);
    };
    return (<ModalWrapper onClose={onClose}><div className="flex items-center mb-4"><Copy className="text-blue-400" size={24} /><h3 className="text-2xl font-bold ml-3 text-gray-100">Informações para Envio</h3></div><p className="text-gray-300 mb-6">Copie o texto abaixo e cole no seu programa de e-mail para enviar a solicitação de confirmação.</p><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-300 mb-1">Modelo de E-mail</label><textarea readOnly value={emailBody} className="w-full p-3 h-32 bg-gray-900/70 border border-gray-600 rounded-lg text-gray-200 focus:outline-none ring-1 ring-white/10" /></div><button onClick={() => copyToClipboard(emailBody)} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg">{copied ? 'Copiado!' : 'Copiar Modelo de E-mail'}</button></div><button onClick={onClose} className="mt-6 w-full text-center text-gray-400 hover:underline">Fechar</button></ModalWrapper>);
};
const ManualConfirmationModal = ({ log, onClose, db, appId, department }) => {
    const handleConfirm = async () => {
        if (!log) return;
        try {
            const logPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_logs/${log.id}`;
            await updateDoc(doc(db, logPath), { signatureStatus: 'confirmed_manually', signature: 'Confirmado manualmente via e-mail', signatureTimestamp: serverTimestamp() });
            onClose();
        } catch (e) { console.error("Error confirming manually:", e); }
    };
    return (<ModalWrapper onClose={onClose}><div className="flex items-center mb-4"><ShieldCheck className="text-green-400" size={24} /><h3 className="text-2xl font-bold ml-3 text-gray-100">Confirmar Manualmente</h3></div><p className="text-gray-300 mb-6">Confirma que recebeu a prova de recebimento (ex: por resposta de e-mail) para a movimentação do item <strong className="text-white">{log?.itemName}</strong> para <strong className="text-white">{log?.receiver}</strong>?</p><div className="flex space-x-4 pt-2"><button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-3 px-4 rounded-lg">Cancelar</button><button onClick={handleConfirm} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">Sim, Confirmar Recebimento</button></div></ModalWrapper>);
};

const InfoCard = ({ title, value, icon: Icon, colors = {} }) => (
    <div className={`bg-gray-800/50 backdrop-blur-lg p-6 rounded-xl ring-1 ring-white/10 border-l-4 ${colors.border || 'border-transparent'} transition-all duration-300 hover:bg-gray-700/50 hover:shadow-2xl hover:-translate-y-1`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${colors.lightBg || 'bg-gray-900/50'} ring-1 ring-white/10`}>
                {Icon && <Icon className={colors.text || 'text-gray-300'} size={24} />}
            </div>
        </div>
    </div>
);

const LogItem = ({ log, onResolvePendingClick }) => {
    if (!log || typeof log !== 'object') return null;

    const isDistribution = log.type === 'distribuição';
    const isSigned = log.signatureStatus === 'signed';
    const isManual = log.signatureStatus === 'confirmed_manually';
    const typeDisplay = (log.type || 'evento').charAt(0).toUpperCase() + (log.type || 'evento').slice(1);

    return (
        <div className={`p-4 rounded-lg border-l-4 ${isDistribution ? 'border-red-500/50' : 'border-green-500/50'} bg-gray-800/50 ring-1 ring-white/5`}>
            <div className="flex justify-between items-start"><p className="font-bold text-gray-100">{(log.quantity || 0)}x {log.itemName || 'Item desconhecido'}</p><span className="text-xs text-gray-400">{formatFirebaseTimestamp(log.timestamp)}</span></div>
            <p className={`text-sm font-semibold ${isDistribution ? 'text-red-400' : 'text-green-400'}`}>{typeDisplay}</p>
            <div className="text-sm text-gray-300 mt-2 space-y-1"><div className="flex items-center"><User size={14} className="mr-2 text-gray-400" /><span>Por: {log.distributor || 'Desconhecido'}</span></div>{isDistribution && <div className="flex items-center"><Building size={14} className="mr-2 text-gray-400" /><span>Para: {log.receiver || 'Desconhecido'}</span></div>}</div>
            <div className={`mt-3 pt-3 border-t border-white/10 flex items-center text-sm ${isSigned || isManual ? 'text-green-400' : 'text-amber-400'}`}>
                {isSigned ? (<><CheckCircle size={16} className="mr-2" /><span>Assinado por {log.signature || 'N/A'}</span></>) : 
                 isManual ? (<><ShieldCheck size={16} className="mr-2" /><span>{log.signature || 'Confirmado Manualmente'}</span></>) :
                 (<>
                    <Clock size={16} className="mr-2" />
                    <span className="flex-1">Assinatura Pendente</span>
                    <button onClick={() => onResolvePendingClick(log)} className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 px-3 py-1 text-xs font-semibold rounded-md flex items-center ring-1 ring-amber-500/30 transition-colors duration-200">
                        <PenSquare size={14} className="mr-1.5" />
                        Resolver
                    </button>
                 </>)
                }
            </div>
        </div>
    );
};

const FormCard = ({ title, icon, children, colors = {} }) => <div className={`bg-gray-800/50 backdrop-blur-lg p-6 rounded-xl ring-1 ring-white/10 border-t-4 ${colors.border || 'border-gray-600/50'}`}><div className="flex items-center mb-4">{icon}<h2 className="text-xl font-bold ml-3 text-gray-100">{title}</h2></div>{children}</div>;
const DataCard = ({ title, icon, children, colors = {} }) => <div className={`bg-gray-800/50 backdrop-blur-lg p-6 rounded-xl ring-1 ring-white/10 border-t-4 ${colors.border || 'border-gray-600/50'}`}><div className="flex items-center mb-4">{icon}<h2 className="text-xl font-bold ml-3 text-gray-100">{title}</h2></div>{children}</div>;

const InputField = ({ label, type = 'text', value, onChange, placeholder, colors, icon: Icon }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
        <div className="relative flex items-center">
            {Icon && (
                <span className="absolute left-3 pointer-events-none">
                    <Icon className="text-gray-400" size={20} />
                </span>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full p-3 ${Icon ? 'pl-10' : ''} bg-gray-700/50 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${colors?.ring || 'focus:ring-blue-500'}`}
                min={type === 'number' ? '1' : undefined}
            />
        </div>
    </div>
);

const SelectField = ({ label, value, onChange, options, placeholder, colors = {} }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <div className="relative">
            <select 
                value={value} 
                onChange={onChange} 
                className={`w-full p-3 bg-gray-700/50 border border-gray-600/50 rounded-lg appearance-none text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${colors.ring || 'focus:ring-blue-500'}`}
            >
                <option value="">{placeholder || 'Selecione uma opção...'}</option>
                {(options || []).map(item => (
                    <option key={item.id} value={item.id} className="bg-gray-700 text-gray-100">{item.name}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    </div>
);

const ViewHeader = ({ title, subtitle }) => (
    <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{title}</h2>
        <p className="text-gray-400 mt-1">{subtitle}</p>
    </div>
);
