import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Edit3, 
  Settings, 
  LogOut, 
  Eye, 
  Upload,
  Users,
  Save,
  FileText,
  Share2,
  Code,
  Copy,
  Check,
  Image as ImageIcon,
  ExternalLink,
  Info,
  Ship,
  Trash2,
  Plus,
  Download,
  X,
  FileSpreadsheet,
  FileType,
  Printer,
  Folder,
  ChevronDown,
  Filter,
  AlertTriangle,
  Menu
} from 'lucide-react';
import { AppSettings, Lead, User, FormConfig } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SYSTEM_CONFIG, DEFAULT_SETTINGS } from '../constants';

// Extending window for external libraries loaded via CDN
declare global {
  interface Window {
    XLSX: any;
    jspdf: any;
  }
}

interface AdminPanelProps {
  user: User | null;
  // Multi-Form Props
  forms: FormConfig[];
  currentFormId: string;
  onChangeForm: (id: string) => void;
  onCreateForm: (name: string) => void;
  onDeleteForm: (id: string) => void;
  onUpdateForm: (form: FormConfig) => void;

  leads: Lead[];
  onAddLead: (lead: Omit<Lead, 'id' | 'capturedAt'>) => void;
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onDeleteMultipleLeads: (ids: string[]) => void;
  onLogout: () => void;
  onPreview: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  user,
  forms,
  currentFormId,
  onChangeForm,
  onCreateForm,
  onDeleteForm,
  onUpdateForm,
  leads, 
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onDeleteMultipleLeads,
  onLogout,
  onPreview
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'settings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // CRITICAL FIX: Fallback to DEFAULT_SETTINGS if forms is empty to prevent crash
  // Safe access to forms array
  const safeForms = Array.isArray(forms) ? forms : [];
  const activeForm = safeForms.find(f => f.id === currentFormId) || safeForms[0];
  
  // Ensure we always have valid settings to render, even if activeForm is undefined
  const safeInitialSettings: AppSettings = activeForm || {
    ...DEFAULT_SETTINGS,
    id: 'temp',
    title: 'Carregando...',
    createdAt: new Date().toISOString()
  } as unknown as FormConfig;

  const [localSettings, setLocalSettings] = useState<AppSettings>(safeInitialSettings);
  
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showDataWarning, setShowDataWarning] = useState(true);

  // Table State
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  
  // Dashboard Lead Filters (Multi-Select)
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
  // Init filters with ALL forms + consolidated
  useEffect(() => {
    const allIds = safeForms.map(f => f.id).concat(['consolidated']);
    setSelectedFilterIds(allIds);
  }, [forms]);

  // Lead Modal
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [modalForm, setModalForm] = useState({ name: '', email: '', whatsapp: '' });

  // Create Form Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [newFormName, setNewFormName] = useState('');

  // Delete Form Modal (Safety)
  const [isDeleteFormModalOpen, setIsDeleteFormModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Sync local state when active form changes
  useEffect(() => {
    if (activeForm) {
      setLocalSettings(activeForm);
    }
  }, [activeForm]);

  // --- Derived Data ---

  // Filter leads based on Multi-Select Dashboard Filter
  const filteredLeads = useMemo(() => {
    return leads.filter(l => selectedFilterIds.includes(l.formId));
  }, [leads, selectedFilterIds]);

  // Is "All" context selected for Editing?
  const isAllForms = currentFormId === 'all';

  // --- Handlers for Leads ---

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);
  };

  const handleOpenLeadModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setModalForm({ name: lead.name, email: lead.email, whatsapp: lead.whatsapp });
    } else {
      setEditingLead(null);
      setModalForm({ name: '', email: '', whatsapp: '' });
    }
    setIsLeadModalOpen(true);
  };

  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      onUpdateLead({ ...editingLead, ...modalForm });
    } else {
      // If "All" is selected in sidebar, we can't create a lead without knowing the form.
      // But button should be disabled in that case.
      // If specific form selected, use it.
      onAddLead({ ...modalForm, formId: currentFormId });
    }
    setIsLeadModalOpen(false);
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Tem certeza que deseja apagar ${selectedLeads.size} leads?`)) {
      onDeleteMultipleLeads(Array.from(selectedLeads));
      setSelectedLeads(new Set());
    }
  };

  // --- Handlers for Filters ---
  const toggleFilter = (id: string) => {
    if (selectedFilterIds.includes(id)) {
      // Don't allow deselecting everything? Or maybe allow empty state.
      setSelectedFilterIds(selectedFilterIds.filter(fid => fid !== id));
    } else {
      setSelectedFilterIds([...selectedFilterIds, id]);
    }
  };

  const selectAllFilters = () => {
    const allIds = safeForms.map(f => f.id).concat(['consolidated']);
    setSelectedFilterIds(allIds);
  };

  // --- Handlers for Forms ---

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFormName.trim()) {
      onCreateForm(newFormName);
      setNewFormName('');
      setIsFormModalOpen(false);
    }
  };

  const handleDeleteFormConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation === 'EXCLUIR') {
       onDeleteForm(currentFormId);
       setIsDeleteFormModalOpen(false);
       setDeleteConfirmation('');
       // The App component will switch context to 'all'
    }
  };

  // --- Export Logic ---

  const getLeadsToExport = () => {
    if (selectedLeads.size > 0) {
      return filteredLeads.filter(l => selectedLeads.has(l.id));
    }
    return filteredLeads;
  };

  const getFormName = (formId: string) => {
    if (formId === 'consolidated') return 'Leads Consolidados (Sem formulário)';
    return safeForms.find(f => f.id === formId)?.title || 'Desconhecido';
  };

  const exportCSV = () => {
    const data = getLeadsToExport();
    const headers = ['Nome,Email,Whatsapp,Formulario,Data Captura'];
    const rows = data.map(l => {
      const formName = getFormName(l.formId);
      return `"${l.name}","${l.email}","${l.whatsapp}","${formName}","${new Date(l.capturedAt).toLocaleString('pt-BR')}"`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    const data = getLeadsToExport().map(l => ({
      Nome: l.name,
      Email: l.email,
      WhatsApp: l.whatsapp,
      Origem: getFormName(l.formId),
      'Data Captura': new Date(l.capturedAt).toLocaleString('pt-BR')
    }));

    if (window.XLSX) {
      const ws = window.XLSX.utils.json_to_sheet(data);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Leads");
      window.XLSX.writeFile(wb, `leads_export.xlsx`);
    } else {
      alert("Biblioteca Excel não carregada.");
    }
  };

  const exportPDF = () => {
    const data = getLeadsToExport();
    
    if (window.jspdf) {
       const { jsPDF } = window.jspdf;
       const doc = new jsPDF();
       
       const tableColumn = ["Nome", "Email", "WhatsApp", "Origem", "Data"];
       const tableRows = [];

       data.forEach(lead => {
         const formName = getFormName(lead.formId);
         const leadData = [
           lead.name,
           lead.email,
           lead.whatsapp,
           formName,
           new Date(lead.capturedAt).toLocaleString('pt-BR'),
         ];
         tableRows.push(leadData);
       });

       doc.text(`${SYSTEM_CONFIG.appName} - Relatório de Leads`, 14, 15);
       
       if ((doc as any).autoTable) {
           (doc as any).autoTable({
               head: [tableColumn],
               body: tableRows,
               startY: 28,
           });
       }

       doc.save("leads_export.pdf");
    }
  };

  const handleSaveSettings = () => {
    if (activeForm) {
      onUpdateForm({
        ...activeForm,
        ...localSettings
      });
      alert('Configurações salvas com sucesso!');
    }
  };

  // Upload handlers
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalSettings({ ...localSettings, fileName: file.name });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        alert('A imagem é muito grande. Use < 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings({ ...localSettings, heroImageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { 
        alert('A logo é muito grande. Use < 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings({ ...localSettings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Link Generation
  const userIdParam = user ? `u=${user.id}` : '';
  const formIdParam = !isAllForms ? `&f=${currentFormId}` : '';
  const publicLink = `${window.location.origin}${window.location.pathname}#/?${userIdParam}${formIdParam}`;
  
  const encodedUrl = encodeURIComponent(publicLink);
  const encodedText = encodeURIComponent(activeForm?.headline || "Confira!");

  const copyEmbedCode = () => {
    const code = `<iframe src="${publicLink}" width="100%" height="600" frameborder="0" style="border:none; overflow:hidden;"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  // Prepare data for chart
  const chartData = React.useMemo(() => {
    const counts: {[key: string]: number} = {};
    filteredLeads.forEach(lead => {
      const date = new Date(lead.capturedAt).toLocaleDateString('pt-BR');
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.keys(counts).map(date => ({ date, count: counts[date] }));
  }, [filteredLeads]);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center text-center gap-2">
          {/* Sidebar Logo */}
          {logoError ? (
            <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
              <Ship className="h-8 w-8 text-blue-500" />
            </div>
          ) : (
            <img 
              src={SYSTEM_CONFIG.logoUrl} 
              alt="Logo" 
              className="h-16 w-auto object-contain mb-2"
              onError={() => setLogoError(true)} 
            />
          )}
          <h2 className="text-lg font-bold text-indigo-900 leading-tight">
             {SYSTEM_CONFIG.appName}
          </h2>
        </div>

        {/* Form Selector in Sidebar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
           <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Editar Formulário:</label>
           <div className="relative">
             <select 
                value={currentFormId}
                onChange={(e) => onChangeForm(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 text-sm font-medium"
             >
               <option value="all">📂 Visão Geral (Todos)</option>
               <optgroup label="Meus Formulários">
                 {safeForms.map(f => (
                   <option key={f.id} value={f.id}>{f.title}</option>
                 ))}
               </optgroup>
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
               <ChevronDown className="h-4 w-4" />
             </div>
           </div>
           
           <button 
              onClick={() => setIsFormModalOpen(true)}
              className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 py-1.5 rounded transition"
           >
              <Plus className="w-3 h-3"/> Criar Novo Formulário
           </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          
          <button 
            disabled={isAllForms}
            onClick={() => setActiveTab('editor')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'editor' ? 'bg-indigo-50 text-indigo-700 font-medium' : isAllForms ? 'opacity-50 cursor-not-allowed text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            title={isAllForms ? "Selecione um formulário específico para editar" : ""}
          >
            <Edit3 className="w-5 h-5" /> Editor Visual
          </button>
          
          <button 
            disabled={isAllForms}
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700 font-medium' : isAllForms ? 'opacity-50 cursor-not-allowed text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
             title={isAllForms ? "Selecione um formulário específico para configurar" : ""}
          >
            <Settings className="w-5 h-5" /> Configurações
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
           {!isAllForms && (
              <button 
                onClick={onPreview}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Eye className="w-4 h-4" /> Ver Página
              </button>
           )}
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header with Enhanced Menu */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b z-30 p-4 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <button 
                   onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                   className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                   {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                
                {/* Mobile Logo with Fallback */}
                {logoError ? (
                  <Ship className="h-6 w-6 text-blue-500" />
                ) : (
                  <img 
                    src={SYSTEM_CONFIG.logoUrl} 
                    alt="Logo" 
                    className="h-8 w-auto object-contain" 
                    onError={() => setLogoError(true)}
                  />
                )}
             </div>
             
             {/* Small status indicator */}
             <div className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600 max-w-[100px] truncate">
                {isAllForms ? 'Geral' : activeForm?.title || 'Selecionar'}
             </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {isMobileMenuOpen && (
             <div className="absolute top-full left-0 w-full bg-white border-b shadow-xl p-4 flex flex-col gap-2 z-40 animate-fade-in">
                 <button 
                    onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50'} text-left`}
                 >
                    <LayoutDashboard size={20} /> Dashboard
                 </button>
                 <button 
                    disabled={isAllForms}
                    onClick={() => { setActiveTab('editor'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'editor' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50'} ${isAllForms ? 'opacity-50' : ''} text-left`}
                 >
                    <Edit3 size={20} /> Editor Visual
                 </button>
                 <button 
                    disabled={isAllForms}
                    onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50'} ${isAllForms ? 'opacity-50' : ''} text-left`}
                 >
                    <Settings size={20} /> Configurações
                 </button>
                 
                 <div className="border-t my-2 pt-2 grid grid-cols-2 gap-2">
                     {!isAllForms && (
                        <button onClick={onPreview} className="flex items-center justify-center gap-2 p-3 bg-green-100 text-green-700 rounded-lg">
                           <Eye size={18}/> Ver Página
                        </button>
                     )}
                     <button onClick={onLogout} className="flex items-center justify-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg col-span-2">
                        <LogOut size={18}/> Sair
                     </button>
                 </div>
             </div>
          )}

          {/* Mobile Form Selector */}
          <select 
                value={currentFormId}
                onChange={(e) => onChangeForm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-700 py-2 px-3 rounded text-sm"
             >
               <option value="all">📂 Visão Geral (Todos)</option>
               {safeForms.map(f => (
                 <option key={f.id} value={f.id}>{f.title}</option>
               ))}
          </select>
          <button 
              onClick={() => setIsFormModalOpen(true)}
              className="w-full flex items-center justify-center gap-1 text-xs text-indigo-600 bg-indigo-50 py-2 rounded"
           >
              <Plus className="w-3 h-3"/> Criar Novo Formulário
           </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-36 md:mt-0 relative">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">
                   {isAllForms 
                     ? "Visão unificada de todas as suas campanhas." 
                     : `Gerenciando: ${activeForm?.title || 'Formulário'}`}
                </p>
              </div>
            </header>

            {/* Local Storage Warning */}
            {showDataWarning && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg shadow-sm flex justify-between items-start">
                 <div className="flex gap-3">
                   <Info className="text-yellow-600 shrink-0 mt-0.5" />
                   <div>
                     <p className="font-bold text-yellow-700 text-sm">Atenção: Modo Local</p>
                     <p className="text-yellow-600 text-sm">
                       Este aplicativo armazena dados no seu navegador (LocalStorage). 
                       Se você limpar o cache ou trocar de dispositivo, os dados podem ser perdidos. 
                       Recomendamos exportar seus leads frequentemente.
                     </p>
                   </div>
                 </div>
                 <button onClick={() => setShowDataWarning(false)} className="text-yellow-500 hover:text-yellow-700">
                    <X size={16} />
                 </button>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Exibindo ({filteredLeads.length} leads)
                    </p>
                    <h3 className="text-3xl font-bold">{filteredLeads.length}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                    {isAllForms ? <Folder className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      {isAllForms ? 'Formulários Ativos' : 'Arquivo Configurado'}
                    </p>
                    <h3 className="text-lg font-bold truncate max-w-[200px]">
                      {isAllForms ? safeForms.length : activeForm?.fileName || '-'}
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
              <h3 className="text-lg font-semibold mb-6">Evolução de Cadastros</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Lead List Actions Bar */}
            <div className="bg-white rounded-t-xl shadow-sm border border-gray-100 border-b-0 p-4 flex flex-col gap-4">
               
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
                 <div className="flex flex-col">
                    <h3 className="text-lg font-semibold">Lista de Leads</h3>
                    <span className="text-xs text-gray-500">
                      {selectedLeads.size > 0 ? `${selectedLeads.size} selecionados` : 'Selecione para ações em massa'}
                    </span>
                 </div>

                 {/* MULTI-SELECT FILTER */}
                 <div className="relative group">
                    <button 
                      onClick={() => setFilterOpen(!filterOpen)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition"
                    >
                      <Filter size={16} /> 
                      Filtrar Origem ({selectedFilterIds.length})
                      <ChevronDown size={14} />
                    </button>
                    
                    {filterOpen && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-2">
                         <div className="flex justify-between items-center px-2 pb-2 border-b mb-2">
                           <span className="text-xs font-bold text-gray-500 uppercase">Mostrar Leads de:</span>
                           <button onClick={selectAllFilters} className="text-xs text-blue-600 hover:underline">Todos</button>
                         </div>
                         <div className="max-h-60 overflow-y-auto space-y-1">
                            {/* Consolidated Special Option */}
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 checked={selectedFilterIds.includes('consolidated')}
                                 onChange={() => toggleFilter('consolidated')}
                                 className="rounded text-indigo-600"
                               />
                               <span className="text-sm text-gray-700 italic">Leads Consolidados (Sem formulário)</span>
                            </label>
                            
                            {/* Forms Options */}
                            {safeForms.map(f => (
                              <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 checked={selectedFilterIds.includes(f.id)}
                                 onChange={() => toggleFilter(f.id)}
                                 className="rounded text-indigo-600"
                               />
                               <span className="text-sm text-gray-700 truncate">{f.title}</span>
                            </label>
                            ))}
                         </div>
                         <div className="pt-2 border-t mt-2 text-center">
                            <button 
                              onClick={() => setFilterOpen(false)} 
                              className="text-xs text-gray-500 hover:text-gray-800 w-full py-1"
                            >
                              Fechar Filtros
                            </button>
                         </div>
                      </div>
                    )}
                    {/* Backdrop to close */}
                    {filterOpen && (
                      <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)}></div>
                    )}
                 </div>
               </div>
               
               <div className="flex flex-wrap items-center gap-2 justify-end w-full border-t pt-3">
                 
                 {/* Delete Selected Button */}
                 {selectedLeads.size > 0 && (
                   <button 
                     onClick={handleDeleteSelected}
                     className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-medium animate-fade-in"
                   >
                     <Trash2 size={16} /> Apagar
                   </button>
                 )}

                 {/* New Lead Button - Only if a specific form is selected */}
                 {!isAllForms && (
                   <button 
                      onClick={() => handleOpenLeadModal()}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm font-medium"
                    >
                      <Plus size={16} /> Novo Lead Manual
                   </button>
                 )}

                 {/* Export Dropdown */}
                 <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg ml-auto">
                    <button onClick={exportExcel} className="p-2 hover:bg-white rounded text-gray-600 hover:text-green-700 transition" title="Exportar Excel">
                      <FileSpreadsheet size={18} />
                    </button>
                    <button onClick={exportCSV} className="p-2 hover:bg-white rounded text-gray-600 hover:text-blue-700 transition" title="Exportar CSV">
                      <FileType size={18} />
                    </button>
                    <button onClick={exportPDF} className="p-2 hover:bg-white rounded text-gray-600 hover:text-red-700 transition" title="Exportar PDF">
                      <Printer size={18} />
                    </button>
                 </div>
               </div>
            </div>

            {/* Lead List Table */}
            <div className="bg-white rounded-b-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-6 py-3 w-10">
                        <input 
                          type="checkbox" 
                          onChange={handleSelectAll}
                          checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 font-medium">Nome</th>
                      <th className="px-6 py-3 font-medium">E-mail</th>
                      <th className="px-6 py-3 font-medium">WhatsApp</th>
                      <th className="px-6 py-3 font-medium">Origem</th>
                      <th className="px-6 py-3 font-medium">Data</th>
                      <th className="px-6 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLeads.length === 0 ? (
                       <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                         {leads.length === 0 ? "Nenhum lead capturado ainda." : "Nenhum lead corresponde ao filtro selecionado."}
                       </td></tr>
                    ) : filteredLeads.slice(0, 50).map(lead => (
                      <tr key={lead.id} className={`hover:bg-gray-50 ${selectedLeads.has(lead.id) ? 'bg-indigo-50/50' : ''}`}>
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedLeads.has(lead.id)}
                            onChange={() => handleSelectLead(lead.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{lead.name}</td>
                        <td className="px-6 py-4">{lead.email}</td>
                        <td className="px-6 py-4">{lead.whatsapp}</td>
                        <td className="px-6 py-4 text-xs">
                             {lead.formId === 'consolidated' ? (
                                <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-bold">Consolidado</span>
                             ) : (
                                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                   {safeForms.find(f => f.id === lead.formId)?.title || "Desconhecido"}
                                </span>
                             )}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{new Date(lead.capturedAt).toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleOpenLeadModal(lead)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition"
                              title="Editar"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm("Apagar este lead permanentemente?")) onDeleteLead(lead.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 transition"
                              title="Apagar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredLeads.length > 50 && (
                <div className="px-6 py-3 bg-gray-50 border-t text-xs text-center text-gray-500">
                   Exibindo os 50 mais recentes. Exporte para ver todos.
                </div>
              )}
            </div>

            {/* Sharing Section - Only visible if specific form selected */}
            {!isAllForms && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-indigo-50 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-indigo-900">Divulgação e Incorporação</h3>
                </div>
                
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Social Share */}
                  <div>
                     <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Link da Página</h4>
                     <div className="mb-4">
                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-600 break-all">
                           <ExternalLink className="w-4 h-4 shrink-0"/> {publicLink}
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <a 
                          href={`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                        >
                          WhatsApp
                        </a>
                        <a 
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                          Facebook
                        </a>
                     </div>
                  </div>

                  {/* Embed Code */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                      <Code className="w-4 h-4"/> HTML (Iframe)
                    </h4>
                    <div className="relative group">
                      <textarea 
                        readOnly
                        className="w-full h-24 p-3 bg-gray-800 text-green-400 font-mono text-xs rounded-lg resize-none focus:outline-none"
                        value={`<iframe src="${publicLink}" width="100%" height="600" frameborder="0" style="border:none; overflow:hidden;"></iframe>`}
                      />
                      <button 
                        onClick={copyEmbedCode}
                        className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-colors backdrop-blur-sm"
                        title="Copiar código"
                      >
                        {copiedEmbed ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* EDITOR TAB */}
        {activeTab === 'editor' && !isAllForms && (
          <div className="max-w-4xl space-y-8 animate-fade-in mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Editor Visual</h1>
                <p className="text-gray-500">Editando: <span className="font-semibold text-indigo-600">{activeForm?.title || 'Formulário'}</span></p>
              </div>
              <button onClick={handleSaveSettings} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm w-full md:w-auto justify-center">
                <Save className="w-4 h-4" /> Salvar Alterações
              </button>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2"><Edit3 className="w-4 h-4"/> Textos</h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Interno do Formulário</label>
                  <input 
                    type="text" 
                    value={activeForm?.title || ''} 
                    onChange={e => activeForm && onUpdateForm({...activeForm, title: e.target.value})}
                    className="w-full bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" 
                  />
                  <p className="text-xs text-gray-400 mt-1">Este nome aparece apenas no seu painel.</p>
                </div>
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título Principal (Headline)</label>
                  <input 
                    type="text" 
                    value={localSettings.headline} 
                    onChange={e => setLocalSettings({...localSettings, headline: e.target.value})}
                    className="w-full bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                  <textarea 
                    rows={3}
                    value={localSettings.subheadline} 
                    onChange={e => setLocalSettings({...localSettings, subheadline: e.target.value})}
                    className="w-full bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Botão (CTA)</label>
                  <input 
                    type="text" 
                    value={localSettings.ctaText} 
                    onChange={e => setLocalSettings({...localSettings, ctaText: e.target.value})}
                    className="w-full bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Imagens</h3>
              
              <div className="grid grid-cols-1 gap-8">
                {/* Hero Image Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Imagem de Destaque</label>
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-1/2 aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group">
                      {localSettings.heroImageUrl ? (
                         <img src={localSettings.heroImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">Sem imagem</div>
                      )}
                    </div>
                    
                    <div className="flex-1 w-full">
                       <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                          <input 
                            type="file" 
                            onChange={handleImageUpload} 
                            accept="image/png, image/jpeg, image/webp"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm font-medium text-gray-900">Clique para fazer upload</p>
                       </div>
                       <div className="mt-4">
                         <label className="block text-xs font-medium text-gray-500 mb-1">Ou URL externa:</label>
                         <input 
                            type="text" 
                            value={localSettings.heroImageUrl} 
                            onChange={e => setLocalSettings({...localSettings, heroImageUrl: e.target.value})}
                            className="w-full bg-white text-gray-900 text-sm border-gray-300 rounded-lg shadow-sm p-2 border" 
                          />
                       </div>
                       {/* Helper Text */}
                       <p className="text-xs text-gray-400 mt-2">
                          Recomendado: 1920x1080px (16:9) ou 800x600px (4:3).<br/>
                          Máximo: 2MB. Formatos: PNG, JPG, WEBP.
                       </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-40 h-24 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center relative group overflow-hidden">
                       {localSettings.logoUrl ? (
                          <img src={localSettings.logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain p-2" />
                       ) : (
                          <span className="text-xs text-gray-400">Sem Logo</span>
                       )}
                    </div>

                    <div className="flex-1 w-full space-y-3">
                       <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors text-gray-600">
                          <Upload className="w-5 h-5" />
                          <span className="font-medium text-sm">Fazer Upload da Logo</span>
                          <input type="file" onChange={handleLogoUpload} accept="image/*" className="hidden" />
                       </label>
                       <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Ou URL da imagem:</label>
                         <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={localSettings.logoUrl} 
                              onChange={e => setLocalSettings({...localSettings,logoUrl: e.target.value})}
                              className="flex-1 bg-white text-gray-900 text-sm border-gray-300 rounded-lg shadow-sm p-2 border" 
                            />
                         </div>
                       </div>
                       {/* Helper Text */}
                       <p className="text-xs text-gray-400 mt-2">
                          Recomendado: Fundo transparente. Altura aprox. 100px.<br/>
                          Máximo: 500KB. Formatos: PNG, SVG.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">Cores</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cor Primária</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={localSettings.primaryColor} 
                      onChange={e => setLocalSettings({...localSettings, primaryColor: e.target.value})}
                      className="h-10 w-20 rounded border border-gray-300 cursor-pointer" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cor de Fundo</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={localSettings.backgroundColor} 
                      onChange={e => setLocalSettings({...localSettings, backgroundColor: e.target.value})}
                      className="h-10 w-20 rounded border border-gray-300 cursor-pointer" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Texto</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={localSettings.textColor} 
                      onChange={e => setLocalSettings({...localSettings, textColor: e.target.value})}
                      className="h-10 w-20 rounded border border-gray-300 cursor-pointer" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && !isAllForms && (
          <div className="max-w-4xl space-y-8 animate-fade-in mx-auto">
             <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Configurações de Entrega</h1>
                <p className="text-gray-500">Formulário: {activeForm?.title}</p>
              </div>
              <button onClick={handleSaveSettings} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm w-full md:w-auto justify-center">
                <Save className="w-4 h-4" /> Salvar Configurações
              </button>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">Arquivo para Download/Envio</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Arquivo Atual: <span className="font-semibold text-indigo-600">{localSettings.fileName}</span>
                </p>
                <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 inline-block shadow-sm">
                  <span>Selecionar Novo Arquivo</span>
                  <input type="file" className="hidden" onChange={handleDocumentUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
                </label>
                <p className="text-xs text-gray-400 mt-2">Suporta PDF, Word, Excel, PowerPoint.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">Redirecionamento Pós-Captura</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de Destino</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    https://
                  </span>
                  <input
                    type="text"
                    value={localSettings.redirectUrl.replace(/^https?:\/\//, '')}
                    onChange={(e) => setLocalSettings({...localSettings, redirectUrl: `https://${e.target.value}`})}
                    className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full bg-white text-gray-900 rounded-none rounded-r-md sm:text-sm border-gray-300 p-2 border"
                    placeholder="www.seusite.com/obrigado"
                  />
                </div>
              </div>
            </div>

            {/* DANGER ZONE */}
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 mt-12">
               <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-red-600" />
                  <h3 className="text-lg font-bold text-red-700">Zona de Perigo</h3>
               </div>
               <p className="text-sm text-red-600 mb-4">
                 Excluir este formulário removerá o acesso a página pública. <br/>
                 <b>Importante:</b> Os leads já capturados <u>NÃO SERÃO EXCLUÍDOS</u>. Eles serão movidos para a pasta "Leads Consolidados".
               </p>
               <button 
                   onClick={() => setIsDeleteFormModalOpen(true)}
                   disabled={safeForms.length <= 1}
                   className="px-4 py-2 bg-white text-red-600 border border-red-200 hover:bg-red-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   title={safeForms.length <= 1 ? "Você precisa ter pelo menos um formulário." : ""}
                 >
                   Excluir Formulário "{activeForm?.title}"
               </button>
            </div>

          </div>
        )}
      </main>

      {/* LEAD Modal */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingLead ? 'Editar Lead' : 'Novo Lead'}</h3>
              <button onClick={() => setIsLeadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitLead} className="p-6 space-y-4">
              {/* Only show form warning if creating new */}
              {!editingLead && (
                 <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded mb-2">
                    Será adicionado ao formulário: <b>{activeForm?.title || 'Selecionado'}</b>
                 </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                  value={modalForm.name}
                  onChange={e => setModalForm({...modalForm, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input 
                  required
                  type="email" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                  value={modalForm.email}
                  onChange={e => setModalForm({...modalForm, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input 
                  required
                  type="tel" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                  value={modalForm.whatsapp}
                  onChange={e => setModalForm({...modalForm, whatsapp: e.target.value})}
                />
              </div>
              <div className="pt-2 flex gap-3">
                 <button 
                  type="button" 
                  onClick={() => setIsLeadModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingLead ? 'Salvar Alterações' : 'Criar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE FORM Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
             <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Criar Novo Formulário</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateForm} className="p-6">
               <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Formulário</label>
               <input 
                  autoFocus
                  required
                  type="text" 
                  placeholder="Ex: E-book de Verão 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 mb-4 bg-white text-gray-900"
                  value={newFormName}
                  onChange={e => setNewFormName(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Criar e Acessar
                </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE FORM CONFIRMATION MODAL */}
      {isDeleteFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in border-2 border-red-500">
             <div className="p-4 border-b bg-red-50 flex justify-between items-center">
              <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={18}/> Excluir Formulário</h3>
              <button onClick={() => setIsDeleteFormModalOpen(false)} className="text-red-400 hover:text-red-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDeleteFormConfirm} className="p-6">
               <p className="text-sm text-gray-600 mb-4">
                  Você está prestes a excluir o formulário <b>"{activeForm?.title}"</b>.
                  <br/><br/>
                  Para confirmar, digite <b>EXCLUIR</b> na caixa abaixo:
               </p>
               <input 
                  autoFocus
                  required
                  type="text" 
                  placeholder="EXCLUIR"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500 mb-4 bg-white text-gray-900"
                  value={deleteConfirmation}
                  onChange={e => setDeleteConfirmation(e.target.value)}
                />
                <div className="flex gap-2">
                   <button 
                    type="button" 
                    onClick={() => setIsDeleteFormModalOpen(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={deleteConfirmation !== 'EXCLUIR'}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};