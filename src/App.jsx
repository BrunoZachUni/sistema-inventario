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
    runTransaction,
    query,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { LayoutDashboard, Package, ArrowRightLeft, History, PackagePlus, Users, Building, ChevronDown, CheckCircle, XCircle, FileSignature, Clock, HardDrive, Megaphone, PenSquare, Copy, Laptop, ShieldCheck, User, UserCog, LogIn, ShoppingCart, Send, Hourglass, ThumbsUp, ThumbsDown, LogOut, Mail, Lock, Menu } from 'lucide-react';

// --- Configuração do Firebase ---
// vvvvv  COLE A CONFIGURAÇÃO DO SEU PROJETO FIREBASE AQUI  vvvvv
//
// 1. Acesse seu projeto no Firebase: https://console.firebase.google.com/
// 2. Clique na engrenagem (⚙️) > Configurações do projeto.
// 3. Na aba "Geral", role para baixo até "Seus apps".
// 4. Se não houver um app web, crie um clicando no ícone (</>).
// 5. Clique no seu app e em "Configuração do SDK", selecione "Config".
// 6. Copie o objeto 'firebaseConfig' inteiro e cole no lugar do objeto de exemplo abaixo.
//
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


const appId = firebaseConfig.projectId || 'default-inventory-app-v3';

// --- Main App Component ---
export default function App() {
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [authStatus, setAuthStatus] = useState({ loading: true, user: null, role: null });

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firebaseAuth = getAuth(app);
            const firestoreDb = getFirestore(app);
            setAuth(firebaseAuth);
            setDb(firestoreDb);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (authUser) => {
                if (authUser) {
                    const userDocRef = doc(firestoreDb, `users/${authUser.uid}`);
                    const userDocSnap = await getDoc(userDocRef);
                    const role = userDocSnap.exists() ? userDocSnap.data().role : 'user';
                    setAuthStatus({ loading: false, user: authUser, role: role });
                } else {
                    setAuthStatus({ loading: false, user: null, role: null });
                }
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setAuthStatus({ loading: false, user: null, role: null });
        }
    }, []);

    if (authStatus.loading) {
        return <LoadingScreen />;
    }

    if (!authStatus.user) {
        return <LoginScreen auth={auth} db={db} />;
    }
    
    if (authStatus.role === 'admin') {
        return <AdminLayout db={db} auth={auth} appId={appId} adminUser={authStatus.user} />;
    }

    return <UserLayout db={db} auth={auth} appId={appId} currentUser={authStatus.user} />;
}

// --- Loading & Login Screens ---
const LoadingScreen = () => (
    <div className="bg-gray-900 min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-300">Carregando sistema...</p>
    </div>
);

const LoginScreen = ({ auth, db }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCredential.user.uid), {
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
                    setError('Credenciais inválidas. Verifique seu e-mail e senha.');
                    break;
                case 'auth/email-already-in-use':
                    setError('Este e-mail já está em uso por outra conta.');
                    break;
                case 'auth/weak-password':
                    setError('A senha é muito fraca. Use pelo menos 6 caracteres.');
                    break;
                case 'auth/operation-not-allowed':
                    setError('Operação não permitida. Verifique se o método de login "E-mail/senha" está ativado no seu projeto Firebase.');
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
                <p className="text-gray-400 mb-8">{isLoginView ? 'Acesse o sistema com suas credenciais.' : 'Crie uma nova conta para começar.'}</p>
                <form onSubmit={handleAuthAction} className="space-y-4">
                    <InputField type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" icon={Mail} />
                    <InputField type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" icon={Lock} />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-green-600/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
                        <LogIn size={20}/> {isLoginView ? 'Entrar' : 'Registrar'}
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
function AdminLayout({ db, auth, appId, adminUser }) {
    const [department, setDepartment] = useState('TI');
    const [activeView, setActiveView] = useState('dashboard');
    const [items, setItems] = useState([]);
    const [logs, setLogs] = useState([]);
    const [requests, setRequests] = useState([]);
    const [modalState, setModalState] = useState({ type: null, log: null });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const departmentColors = useMemo(() => ({
        TI: { name: 'TI', icon: HardDrive, bg: 'bg-blue-600', hoverBg: 'hover:bg-blue-700', ring: 'focus:ring-blue-500', border: 'border-blue-500/50', text: 'text-blue-300', lightBg: 'bg-blue-900/50', shadow: 'shadow-blue-500/50' },
        Marketing: { name: 'Marketing', icon: Megaphone, bg: 'bg-orange-600', hoverBg: 'hover:bg-orange-700', ring: 'focus:ring-orange-500', border: 'border-orange-500/50', text: 'text-orange-300', lightBg: 'bg-orange-900/50', shadow: 'shadow-orange-500/50' },
    }), []);
    const colors = departmentColors[department];

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

    const handleResolvePendingClick = (log) => {
        setModalState({ type: 'resolve_options', log: log });
    };
    
    const renderView = () => {
        const viewProps = { items, logs, requests, colors, db, appId, department, onResolvePendingClick, adminUser };
        switch (activeView) {
            case 'dashboard': return <AdminDashboardView {...viewProps} />;
            case 'inventory': return <AdminInventoryView {...viewProps} />;
            case 'requests': return <AdminRequestsView {...viewProps} />;
            case 'history': return <AdminHistoryView {...viewProps} />;
            default: return <AdminDashboardView {...viewProps} />;
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 to-slate-800 min-h-screen flex text-gray-200 font-sans">
            {modalState.type && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />}
            {modalState.type === 'resolve_options' && <ResolveOptionsModal onClose={() => setModalState({ type: null, log: null })} onLocalSign={() => setModalState({ type: 'local', log: modalState.log })} onRemoteSign={() => setModalState({ type: 'remote', log: modalState.log })} onManualConfirm={() => setModalState({ type: 'manual_confirm', log: modalState.log })} />}
            {modalState.type === 'local' && <SignatureModal log={modalState.log} onClose={() => setModalState({ type: null, log: null })} db={db} appId={appId} department={department} />}
            {modalState.type === 'remote' && <RemoteSignatureModal term={{ logId: modalState.log.id, department: department, receiver: modalState.log.receiver, itemName: modalState.log.itemName }} onClose={() => setModalState({ type: null, log: null })} />}
            {modalState.type === 'manual_confirm' && <ManualConfirmationModal log={modalState.log} onClose={() => setModalState({ type: null, log: null })} db={db} appId={appId} department={department} />}
            
            <AdminSidebar activeView={activeView} setActiveView={setActiveView} department={department} setDepartment={setDepartment} colors={colors} departmentOptions={departmentColors} pendingRequests={requests.filter(r => r.status === 'pending').length} auth={auth} adminUser={adminUser} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            
            <div className="flex-1 flex flex-col">
                <header className="md:hidden p-4 bg-gray-900/50 backdrop-blur-lg flex items-center justify-between ring-1 ring-white/10">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2">
                        <Menu size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-white">Admin</h1>
                </header>
                <main className="flex-1 p-6 md:p-10 overflow-y-auto">{renderView()}</main>
            </div>
        </div>
    );
}

function AdminSidebar({ activeView, setActiveView, department, setDepartment, colors, departmentOptions, pendingRequests, auth, adminUser, isOpen, setIsOpen }) {
    const navItems = [
        { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventário', icon: Package },
        { id: 'requests', label: 'Solicitações', icon: ArrowRightLeft, badge: pendingRequests },
        { id: 'history', label: 'Histórico', icon: History },
    ];

    const handleNavClick = (viewId) => {
        setActiveView(viewId);
        setIsOpen(false);
    };

    const sidebarContent = (
        <>
            <div className="flex items-center justify-between mb-10">
                <h1 className="text-2xl font-bold text-white tracking-wider">Inventário</h1>
                <button onClick={() => setIsOpen(false)} className="md:hidden p-2">
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
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Admin Menu</label>
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
                <p className="text-sm text-gray-400">Logado como:</p>
                <p className="font-semibold text-white truncate">{adminUser.email}</p>
                <button onClick={() => signOut(auth)} className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-red-600/50 hover:bg-red-500/50 text-red-300 rounded-lg text-sm font-semibold transition-colors">
                    <LogOut size={16} /> Sair
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Sidebar */}
            <div className={`fixed inset-0 z-50 transform md:hidden transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="w-64 bg-gray-900/70 backdrop-blur-lg h-full p-4 ring-1 ring-white/10 flex flex-col">
                    {sidebarContent}
                </div>
            </div>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)}></div>}

            {/* Desktop Sidebar */}
            <aside className="w-64 flex-col p-4 hidden md:flex">
                {sidebarContent}
            </aside>
        </>
    );
}

function AdminDashboardView({ items, logs, requests, colors, onResolvePendingClick }) {
    const totalStock = items.reduce((acc, item) => acc + item.quantity, 0);
    const pendingRequests = requests.filter(r => r.status === 'pending');
    return (
        <div>
            <ViewHeader title="Visão Geral do Admin" subtitle={`Resumo do inventário de ${colors.name} e atividades.`} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <InfoCard title="Tipos de Itens" value={items.length} icon={Package} colors={colors} />
                <InfoCard title="Itens em Estoque" value={totalStock} icon={PackagePlus} colors={colors} />
                <InfoCard title="Solicitações Pendentes" value={pendingRequests.length} icon={Hourglass} colors={colors} />
            </div>
            <DataCard title="Atividade Recente" icon={<History className={colors.text} size={24}/>} colors={colors}>
                <div className="space-y-4">
                    {logs.slice(0, 5).map(log => <LogItem key={log.id} log={log} onResolvePendingClick={onResolvePendingClick} />)}
                    {logs.length === 0 && <p className="text-gray-400 text-center py-4">Nenhuma atividade recente.</p>}
                </div>
            </DataCard>
        </div>
    );
}

function AdminInventoryView({ items, db, appId, department, colors }) {
    const [newItemName, setNewItemName] = useState('');
    const [newItemStock, setNewItemStock] = useState('');
    const showNotification = (message, type = 'success') => { /* Placeholder */ };
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
            <ViewHeader title="Inventário" subtitle={`Gerencie e adicione itens para o setor de ${department}`} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <DataCard title="Lista de Itens" icon={<Package className={colors.text} size={24}/>} colors={colors}>
                        <div className="space-y-3">
                            {items.map(item => (<div key={item.id} className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg ring-1 ring-white/5"><span className="font-medium text-gray-200">{item.name}</span><span className={`font-bold text-lg px-3 py-1 rounded-full ${colors.lightBg} ${colors.text} ring-1 ring-inset ring-white/10`}>{item.quantity}</span></div>))}
                        </div>
                    </DataCard>
                </div>
                <div>
                    <FormCard title="Adicionar Novo Item" icon={<PackagePlus className={colors.text} size={24}/>} colors={colors}>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <InputField label="Nome do Item" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Ex: Mouse sem fio" colors={colors} />
                            <InputField label="Estoque Inicial" type="number" value={newItemStock} onChange={(e) => setNewItemStock(e.target.value)} placeholder="Ex: 50" colors={colors} />
                            <button type="submit" className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ${colors.bg} ${colors.hoverBg} ${colors.ring} shadow-lg ${colors.shadow} hover:scale-105 transform`}>Adicionar</button>
                        </form>
                    </FormCard>
                </div>
            </div>
        </div>
    );
}

function AdminRequestsView({ requests, db, appId, department, adminUser }) {
    const pending = requests.filter(r => r.status === 'pending');
    const approved = requests.filter(r => r.status === 'approved');
    const denied = requests.filter(r => r.status === 'denied');

    const handleApprove = async (request) => {
        const itemRef = doc(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_items`, request.itemId);
        const requestRef = doc(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_requests`, request.id);
        const logsCollection = collection(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_logs`);

        try {
            await runTransaction(db, async (transaction) => {
                const itemDoc = await transaction.get(itemRef);
                if (!itemDoc.exists()) throw "Item não encontrado!";
                
                const currentQuantity = itemDoc.data().quantity;
                if (currentQuantity < request.quantity) throw "Estoque insuficiente!";

                const newQuantity = currentQuantity - request.quantity;
                transaction.update(itemRef, { quantity: newQuantity });
                transaction.update(requestRef, { status: 'approved' });
                
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
            // Show notification to user
        }
    };

    const handleDeny = async (request) => {
        const requestRef = doc(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_requests`, request.id);
        await updateDoc(requestRef, { status: 'denied' });
    };

    const RequestCard = ({ request }) => (
        <div className="bg-gray-800/50 p-4 rounded-lg ring-1 ring-white/10">
            <p className="font-bold text-white">{request.quantity}x {request.itemName}</p>
            <p className="text-sm text-gray-400">Solicitado por: {request.userName}</p>
            <p className="text-xs text-gray-500">Em: {request.timestamp ? new Date(request.timestamp.toDate()).toLocaleString('pt-BR') : '...'}</p>
            {request.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApprove(request)} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-bold py-2 px-3 rounded-md transition-colors">Aprovar</button>
                    <button onClick={() => handleDeny(request)} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-bold py-2 px-3 rounded-md transition-colors">Negar</button>
                </div>
            )}
        </div>
    );

    return (
        <div>
            <ViewHeader title="Solicitações de Itens" subtitle={`Gerencie os pedidos do setor de ${department}`} />
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
            <ViewHeader title="Histórico Completo" subtitle="Todas as movimentações registradas no sistema." />
            <DataCard title="Registros" icon={<History className="text-gray-400" size={24}/>} colors={{border: 'border-gray-600/50'}}>
                 <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {logs.map(log => <LogItem key={log.id} log={log} onResolvePendingClick={onResolvePendingClick} />)}
                 </div>
            </DataCard>
        </div>
    );
}

// --- USER SECTION ---
function UserLayout({ db, auth, appId, currentUser }) {
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
        if (cart.length === 0) return;
        const requestsCollection = collection(db, `/artifacts/${appId}/public/data/${department.toLowerCase()}_requests`);
        
        const requestPromises = cart.map(item => {
            return addDoc(requestsCollection, {
                userId: currentUser.uid,
                userName: currentUser.email, // Use email as name for simplicity
                itemId: item.id,
                itemName: item.name,
                quantity: item.quantity,
                status: 'pending',
                timestamp: serverTimestamp(),
                department: department
            });
        });

        await Promise.all(requestPromises);
        setCart([]);
        // Add notification
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
                    <h1 className="text-xl font-bold text-white">Portal do Usuário</h1>
                    <p className="text-sm text-gray-400">Bem-vindo, {currentUser.email}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveView('catalog')} className={`font-semibold transition-colors ${activeView === 'catalog' ? colors.text : 'text-gray-400 hover:text-white'}`}>Catálogo</button>
                    <button onClick={() => setActiveView('requests')} className={`font-semibold transition-colors ${activeView === 'requests' ? colors.text : 'text-gray-400 hover:text-white'}`}>Minhas Solicitações</button>
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
                {items.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
        </div>
    );
}

function UserMyRequestsView({ db, appId, currentUser }) {
    const [requests, setRequests] = useState([]);
    useEffect(() => {
        const tiPath = `/artifacts/${appId}/public/data/ti_requests`;
        const mktPath = `/artifacts/${appId}/public/data/marketing_requests`;
        
        const qTi = query(collection(db, tiPath), where("userId", "==", currentUser.uid));
        const qMkt = query(collection(db, mktPath), where("userId", "==", currentUser.uid));

        const unsubTi = onSnapshot(qTi, snap => setRequests(prev => [...prev.filter(r => r.department !== 'TI'), ...snap.docs.map(d => ({id: d.id, ...d.data()}))]));
        const unsubMkt = onSnapshot(qMkt, snap => setRequests(prev => [...prev.filter(r => r.department !== 'Marketing'), ...snap.docs.map(d => ({id: d.id, ...d.data()}))]));

        return () => { unsubTi(); unsubMkt(); };
    }, [db, appId, currentUser]);

    const sortedRequests = requests.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

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
            <ViewHeader title="Minhas Solicitações" subtitle="Acompanhe o status dos seus pedidos." />
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
            </div>
        </div>
    );
}


// --- Reusable UI Components from previous version (adapted for new structure) ---
const ModalWrapper = ({ children }) => ( <div className="fixed inset-0 z-50 flex justify-center items-center p-4"><div className="bg-gray-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-8 max-w-lg w-full ring-1 ring-white/10 animate-fade-in-up">{children}</div></div>);
const ResolveOptionsModal = ({ onClose, onLocalSign, onRemoteSign, onManualConfirm }) => (<ModalWrapper><h3 className="text-2xl font-bold text-gray-100 mb-2">Resolver Pendência</h3><p className="text-gray-300 mb-6">Como você deseja registrar a confirmação?</p><div className="flex flex-col md:flex-row gap-4"><button onClick={onLocalSign} className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-200 text-center ring-1 ring-white/10 transform hover:scale-105"><Laptop size={32} className="mb-2 text-blue-400" /><span className="font-bold text-lg text-white">Assinatura Local</span><span className="text-sm text-gray-400">A pessoa assina neste computador.</span></button><button onClick={onRemoteSign} className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-200 text-center ring-1 ring-white/10 transform hover:scale-105"><Copy size={32} className="mb-2 text-orange-400" /><span className="font-bold text-lg text-white">Assinatura Remota</span><span className="text-sm text-gray-400">Copiar texto para enviar.</span></button><button onClick={onManualConfirm} className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-200 text-center ring-1 ring-white/10 transform hover:scale-105"><ShieldCheck size={32} className="mb-2 text-green-400" /><span className="font-bold text-lg text-white">Confirmar Manualmente</span><span className="text-sm text-gray-400">Recebi a confirmação por fora.</span></button></div><button onClick={onClose} className="mt-8 w-full text-center text-gray-400 hover:underline">Cancelar</button></ModalWrapper>);
const SignatureModal = ({ log, onClose, db, appId, department }) => {
    const [signerName, setSignerName] = useState('');
    const handleSign = async () => {
        if (!signerName.trim()) return;
        try {
            const logPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_logs/${log.id}`;
            await updateDoc(doc(db, logPath), { signatureStatus: 'signed', signature: signerName.trim(), signatureTimestamp: serverTimestamp() });
            onClose();
        } catch (e) { console.error("Error signing document:", e); }
    };
    return (<ModalWrapper><div className="flex items-center mb-6"><FileSignature className="text-gray-400 mr-4" size={40} /><div><h2 className="text-2xl font-bold text-white">Termo de {log.type === 'distribuição' ? 'Responsabilidade' : 'Devolução'}</h2><p className="text-gray-400">ID: {log.id}</p></div></div><div className="space-y-4 text-gray-300 border-y border-white/10 py-6 my-6"><p>Confirmo a seguinte operação:</p><ul className="list-disc list-inside bg-gray-900/70 p-4 rounded-lg space-y-2 ring-1 ring-white/10"><li><strong>Item:</strong> {log.itemName}</li><li><strong>Quantidade:</strong> {log.quantity}</li><li><strong>Para:</strong> {log.receiver}</li></ul></div><div className="space-y-4"><p className="text-sm text-gray-400">Para confirmar, a pessoa que {log.type === 'distribuição' ? 'recebeu' : 'devolveu'} deve digitar o nome completo abaixo.</p><InputField label="Nome Completo (Assinatura Digital)" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Digite o nome completo aqui" colors={{ring: 'focus:ring-green-500'}} /><div className="flex space-x-4 pt-2"><button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-3 px-4 rounded-lg">Cancelar</button><button onClick={handleSign} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">Assinar e Confirmar</button></div></div></ModalWrapper>);
};
const RemoteSignatureModal = ({ term, onClose }) => {
    const emailBody = `Assunto: Confirmação de Recebimento - ${term.itemName}\n\nOlá, ${term.receiver}.\n\nPara registrar a entrega do item "${term.itemName}", por favor, responda a este e-mail com a frase "Confirmo o recebimento".\n\nObrigado.`;
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
    return (<ModalWrapper><div className="flex items-center mb-4"><Copy className="text-blue-400" size={24} /><h3 className="text-2xl font-bold ml-3 text-gray-100">Informações para Envio</h3></div><p className="text-gray-300 mb-6">Copie o texto abaixo e cole no seu programa de e-mail para enviar a solicitação de confirmação.</p><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-300 mb-1">Modelo de E-mail</label><textarea readOnly value={emailBody} className="w-full p-3 h-32 bg-gray-900/70 border border-gray-600 rounded-lg text-gray-200 focus:outline-none ring-1 ring-white/10" /></div><button onClick={() => copyToClipboard(emailBody)} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg">{copied ? 'Copiado!' : 'Copiar Modelo de E-mail'}</button></div><button onClick={onClose} className="mt-6 w-full text-center text-gray-400 hover:underline">Fechar</button></ModalWrapper>);
};
const ManualConfirmationModal = ({ log, onClose, db, appId, department }) => {
    const handleConfirm = async () => {
        try {
            const logPath = `/artifacts/${appId}/public/data/${department.toLowerCase()}_logs/${log.id}`;
            await updateDoc(doc(db, logPath), { signatureStatus: 'confirmed_manually', signature: 'Confirmado manualmente via e-mail', signatureTimestamp: serverTimestamp() });
            onClose();
        } catch (e) { console.error("Error confirming manually:", e); }
    };
    return (<ModalWrapper><div className="flex items-center mb-4"><ShieldCheck className="text-green-400" size={24} /><h3 className="text-2xl font-bold ml-3 text-gray-100">Confirmar Manualmente</h3></div><p className="text-gray-300 mb-6">Você confirma que recebeu a prova de recebimento (ex: por resposta de e-mail) para a movimentação do item <strong className="text-white">{log.itemName}</strong> para <strong className="text-white">{log.receiver}</strong>?</p><div className="flex space-x-4 pt-2"><button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-3 px-4 rounded-lg">Cancelar</button><button onClick={handleConfirm} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">Sim, Confirmar Recebimento</button></div></ModalWrapper>);
};
const InfoCard = ({ title, value, icon: Icon, colors }) => <div className={`bg-gray-800/50 backdrop-blur-lg p-6 rounded-xl ring-1 ring-white/10 border-l-4 ${colors.border} transition-all duration-300 hover:bg-gray-700/50 hover:shadow-2xl hover:-translate-y-1`}><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-400">{title}</p><p className="text-3xl font-bold text-white">{value}</p></div><div className={`p-3 rounded-full ${colors.lightBg} ring-1 ring-white/10`}><Icon className={colors.text} size={24} /></div></div></div>;
const LogItem = ({ log, onResolvePendingClick }) => {
    const isDistribution = log.type === 'distribuição';
    const isSigned = log.signatureStatus === 'signed';
    const isManual = log.signatureStatus === 'confirmed_manually';
    return (
        <div className={`p-4 rounded-lg border-l-4 ${isDistribution ? 'border-red-500/50' : 'border-green-500/50'} bg-gray-800/50 ring-1 ring-white/5`}>
            <div className="flex justify-between items-start"><p className="font-bold text-gray-100">{log.quantity}x {log.itemName}</p><span className="text-xs text-gray-400">{log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString('pt-BR') : '...'}</span></div>
            <p className={`text-sm font-semibold ${isDistribution ? 'text-red-400' : 'text-green-400'}`}>{log.type.charAt(0).toUpperCase() + log.type.slice(1)}</p>
            <div className="text-sm text-gray-300 mt-2 space-y-1"><div className="flex items-center"><Users size={14} className="mr-2 text-gray-400" /><span>Por: {log.distributor}</span></div>{isDistribution && <div className="flex items-center"><Building size={14} className="mr-2 text-gray-400" /><span>Para: {log.receiver}</span></div>}</div>
            <div className={`mt-3 pt-3 border-t border-white/10 flex items-center text-sm ${isSigned || isManual ? 'text-green-400' : 'text-amber-400'}`}>
                {isSigned ? (<><CheckCircle size={16} className="mr-2" /><span>Assinado por {log.signature}</span></>) : 
                 isManual ? (<><ShieldCheck size={16} className="mr-2" /><span>{log.signature}</span></>) :
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
const Notification = ({ message, type }) => (<div className={`fixed top-5 right-5 flex items-center p-4 rounded-lg shadow-lg text-white z-50 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}{message}</div>);
const FormCard = ({ title, icon, children, colors }) => <div className={`bg-gray-800/50 backdrop-blur-lg p-6 rounded-xl ring-1 ring-white/10 border-t-4 ${colors.border}`}><div className="flex items-center mb-4">{icon}<h2 className="text-xl font-bold ml-3 text-gray-100">{title}</h2></div>{children}</div>;
const DataCard = ({ title, icon, children, colors }) => <div className={`bg-gray-800/50 backdrop-blur-lg p-6 rounded-xl ring-1 ring-white/10 border-t-4 ${colors.border}`}><div className="flex items-center mb-4">{icon}<h2 className="text-xl font-bold ml-3 text-gray-100">{title}</h2></div>{children}</div>;
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
const SelectField = ({ label, value, onChange, options, colors }) => (<div><label className="block text-sm font-medium text-gray-300 mb-1">{label}</label><div className="relative"><select value={value} onChange={onChange} className={`w-full p-3 bg-gray-700/50 border border-gray-600/50 rounded-lg appearance-none text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${colors.ring}`}><option value="">Selecione um item...</option>{options.map(item => <option key={item.id} value={item.id} className="bg-gray-700 text-gray-100">{item.name}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /></div></div>);
const ViewHeader = ({ title, subtitle }) => (
    <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{title}</h2>
        <p className="text-gray-400 mt-1">{subtitle}</p>
    </div>
);
