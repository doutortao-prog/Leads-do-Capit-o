import React, { useState, useEffect } from 'react';
import { PublicPage } from './components/PublicPage';
import { AdminPanel } from './components/AdminPanel';
import { ADMIN_CREDENTIALS, SYSTEM_CONFIG } from './constants';
import * as storage from './services/storageService';
import { AppSettings, Lead, User, FormConfig } from './types';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Ship } from 'lucide-react';

const App: React.FC = () => {
  // Global State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [currentFormId, setCurrentFormId] = useState<string>('all'); 
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // Preview Mode State
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Initialize Auth & Storage
  useEffect(() => {
    storage.initializeStorage(); // Ensure admin user exists
    const user = storage.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadUserData(user.id);
    }
  }, []);

  const loadUserData = (userId: string) => {
    let userForms = storage.getForms(userId);
    
    // AUTO-RECOVERY: If no forms found (empty array), create default immediately
    // This prevents the "White Screen of Death" caused by activeForm being undefined
    if (userForms.length === 0) {
       console.warn("No forms found for user. Auto-creating default form to prevent crash.");
       const newForm = storage.createForm(userId, "Meu Primeiro Formulário");
       userForms = [newForm];
    }

    setForms(userForms);
    
    // Select first form by default if not 'all', or keep 'all' if desired
    // For better UX, let's default to 'all' to show dashboard overview
    setCurrentFormId('all');

    setLeads(storage.getAllLeads(userId));
  };

  // --- FORM HANDLERS ---

  const handleCreateForm = (name: string) => {
    if (currentUser) {
      const newForm = storage.createForm(currentUser.id, name);
      setForms(storage.getForms(currentUser.id));
      setCurrentFormId(newForm.id); // Switch to new form immediately
    }
  };

  const handleUpdateForm = (updatedForm: FormConfig) => {
    if (currentUser) {
      storage.updateForm(currentUser.id, updatedForm);
      setForms(storage.getForms(currentUser.id));
    }
  };

  const handleDeleteForm = (formId: string) => {
    if (currentUser) {
      storage.deleteForm(currentUser.id, formId);
      const updatedForms = storage.getForms(currentUser.id);
      
      // Auto-recovery if user deletes their last form
      if (updatedForms.length === 0) {
         const newForm = storage.createForm(currentUser.id, "Novo Formulário");
         setForms([newForm]);
      } else {
         setForms(updatedForms);
      }
      
      setCurrentFormId('all'); // Reset to all
      // Important: Reload leads because they might have been migrated to 'consolidated'
      setLeads(storage.getAllLeads(currentUser.id));
    }
  };

  // --- LEAD HANDLERS ---

  const handleAddLead = (leadData: Omit<Lead, 'id' | 'capturedAt'>) => {
    if (currentUser && currentFormId !== 'all') {
      storage.saveLead(currentUser.id, currentFormId, leadData);
      setLeads(storage.getAllLeads(currentUser.id));
    } else {
      alert("Selecione um formulário específico para adicionar leads manualmente.");
    }
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    if (currentUser) {
      storage.updateLead(currentUser.id, updatedLead);
      setLeads(storage.getAllLeads(currentUser.id));
    }
  };

  const handleDeleteLead = (leadId: string) => {
    if (currentUser) {
      storage.deleteLead(currentUser.id, leadId);
      setLeads(storage.getAllLeads(currentUser.id));
    }
  };
  
  const handleDeleteMultipleLeads = (leadIds: string[]) => {
    if (currentUser) {
      storage.deleteMultipleLeads(currentUser.id, leadIds);
      setLeads(storage.getAllLeads(currentUser.id));
    }
  };

  const handleLogout = () => {
    storage.logoutUser();
    setCurrentUser(null);
    setIsPreviewMode(false);
  };

  // Auth Component (Login/Register)
  const AuthScreen = () => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [imgError, setImgError] = useState(false);

    if (currentUser) return <Navigate to="/admin/dashboard" />;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (mode === 'login') {
        const user = storage.loginUser(formData.email, formData.password);
        if (user) {
          setCurrentUser(user);
          loadUserData(user.id);
        } else {
          setError('Credenciais inválidas.');
        }
      } else {
        if (!formData.name) { setError('Nome é obrigatório'); return; }
        const newUser = storage.registerUser(formData.name, formData.email, formData.password);
        if (newUser) {
          setCurrentUser(newUser);
          loadUserData(newUser.id);
        } else {
          setError('E-mail já cadastrado.');
        }
      }
    };

    const handleSocialLogin = (provider: string) => {
      alert(`Login com ${provider} simulado! Em um ambiente real, isso abriria a janela de OAuth.`);
      // Simulating a successful login for demo purposes
      const fakeEmail = `demo.${provider.toLowerCase()}@example.com`;
      let user = storage.loginUser(fakeEmail, 'demo123');
      if (!user) {
         user = storage.registerUser(`Usuário ${provider}`, fakeEmail, 'demo123');
      }
      if (user) {
        setCurrentUser(user);
        loadUserData(user.id);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="text-center mb-8 flex flex-col items-center">
             {/* LOGOTIPO */}
             <div className="h-40 w-full flex items-center justify-center mb-4">
                {imgError ? (
                  <div className="h-32 w-32 bg-blue-50 rounded-full flex items-center justify-center border-4 border-blue-100">
                    <Ship className="h-16 w-16 text-blue-500" />
                  </div>
                ) : (
                  <img 
                    src={SYSTEM_CONFIG.logoUrl} 
                    alt="Logo" 
                    className="h-full w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                    onError={() => setImgError(true)} 
                  />
                )}
             </div>
             <h2 className="text-3xl font-bold text-gray-800">{SYSTEM_CONFIG.appName}</h2>
             <p className="text-gray-500">Gerencie suas páginas de captura</p>
          </div>

          <div className="flex mb-6 border-b">
             <button 
               className={`flex-1 pb-2 font-medium transition-colors ${mode === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
               onClick={() => setMode('login')}
             >
               Entrar
             </button>
             <button 
               className={`flex-1 pb-2 font-medium transition-colors ${mode === 'register' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
               onClick={() => setMode('register')}
             >
               Cadastrar
             </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input 
                  type="text" 
                  required={mode === 'register'}
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input 
                type="text" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input 
                type="password" 
                required
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md">
              {mode === 'login' ? 'Acessar Painel' : 'Criar Conta Grátis'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Ou continue com</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => handleSocialLogin('Google')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Google
              </button>
              <button 
                type="button" 
                onClick={() => handleSocialLogin('Facebook')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Facebook
              </button>
            </div>
          </div>
          
          <div className="mt-6 text-center">
             <Link to="/" className="text-sm text-blue-500 hover:underline">Voltar para a página inicial</Link>
          </div>
        </div>
      </div>
    );
  };

  // Protected Admin Route
  const ProtectedAdmin = () => {
    if (!currentUser) return <Navigate to="/admin" />;
    
    // Find the current form configuration object
    const activeFormConfig = forms.find(f => f.id === currentFormId) || forms[0];

    if (isPreviewMode && activeFormConfig) {
      return (
        <PublicPage 
          settings={activeFormConfig} 
          isPreview={true} 
          onExitPreview={() => setIsPreviewMode(false)}
        />
      );
    }

    return (
      <AdminPanel 
        user={currentUser}
        
        forms={forms}
        currentFormId={currentFormId}
        onChangeForm={setCurrentFormId}
        onCreateForm={handleCreateForm}
        onDeleteForm={handleDeleteForm}
        onUpdateForm={handleUpdateForm}

        leads={leads}
        onAddLead={handleAddLead}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={handleDeleteLead}
        onDeleteMultipleLeads={handleDeleteMultipleLeads}
        onLogout={handleLogout}
        onPreview={() => setIsPreviewMode(true)}
      />
    );
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/admin" element={<AuthScreen />} />
        <Route path="/admin/dashboard" element={<ProtectedAdmin />} />
      </Routes>
    </HashRouter>
  );
};

export default App;