import React, { useState, useEffect } from 'react';
import './Home.css';
import ConstructionHistory from './ConstructionHistory';
import UsersManagement from './UsersManagement';

function Home({ onLogout }) {
  const [folders, setFolders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // --- MUDANÇA: Novo estado para o dropdown de áreas do IFC ---
  const [ifcAreas, setIfcAreas] = useState([]);
  const [ifcAreaError, setIfcAreaError] = useState(null);
  const [isLoadingIfcAreas, setIsLoadingIfcAreas] = useState(false);

  const [projectData, setProjectData] = useState({
    name: '',
    // --- MUDANÇA: Novo campo para o <select> ---
    ifcAreaName: '', 
    description: '',
    // (Campos do seu formulário antigo)
    totalArea: '',
    startDate: '',
    expectedCompletion: '',
    responsible: ''
  });

  // (Estados do seu modal de perfil)
  const [userProfile, setUserProfile] = useState({
    name: 'Usuário',
    email: 'usuario@exemplo.com',
    role: 'Usuário',
    registrationDate: '2024-01-01',
    lastLogin: new Date().toISOString()
  });
  const [profileImage, setProfileImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Busca as pastas quando o componente carrega
  useEffect(() => {
    async function fetchFolders() {
      try {
        const response = await fetch('/api/folders'); // (URL relativa é melhor)
        const data = await response.json();
        setFolders(data);
      } catch (err) {
        console.error('Erro ao buscar pastas:', err);
      }
    }
    fetchFolders();
    loadUserProfile();
  }, []);

  // --- MUDANÇA: Novo useEffect para buscar as áreas do IFC ---
  useEffect(() => {
    // Busca as áreas do IFC apenas quando o modal for aberto
    if (showNewProjectModal) {
      async function fetchIfcAreas() {
        setIsLoadingIfcAreas(true); // Mostra "Carregando..."
        setIfcAreaError(null); // Limpa erros antigos
        try {
          const res = await fetch('/api/ifc/areas');
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Falha ao carregar áreas do BIM');
          }
          const data = await res.json();
          setIfcAreas(data);
        } catch (err) {
          console.error(err);
          setIfcAreaError(err.message);
        } finally {
          setIsLoadingIfcAreas(false); // Para de carregar
        }
      }
      fetchIfcAreas();
    }
  }, [showNewProjectModal]); // Roda toda vez que o modal é aberto

  const loadUserProfile = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('userProfile')) || {
        name: 'João Silva',
        email: 'joao.silva@empresa.com',
        role: 'Engenheiro',
        registrationDate: '2024-01-15',
        lastLogin: new Date().toISOString()
      };
      setUserProfile(userData);
      const savedImage = localStorage.getItem('userProfileImage');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const handleImageUpload = async (event) => { /* ... (Seu código - sem mudanças) ... */ 
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadStatus('Erro: Por favor, selecione uma imagem.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus('Erro: A imagem deve ter menos de 5MB.');
      return;
    }
    setIsUploading(true);
    setUploadStatus('Enviando imagem...');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target.result;
        setProfileImage(imageDataUrl);
        localStorage.setItem('userProfileImage', imageDataUrl);
        setUploadStatus('Foto atualizada com sucesso!');
        setIsUploading(false);
        setTimeout(() => setUploadStatus(''), 3000);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      setUploadStatus('Erro ao fazer upload da imagem.');
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => { /* ... (Seu código - sem mudanças) ... */ 
    setProfileImage(null);
    localStorage.removeItem('userProfileImage');
    setUploadStatus('Foto removida com sucesso!');
    setTimeout(() => setUploadStatus(''), 3000);
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFolderNameEdit = (id, newName) => { /* ... (Seu código - sem mudanças) ... */ 
    if (newName.trim() !== '') {
      setFolders(folders.map(folder => 
        folder.id === id ? { ...folder, name: newName, isEditing: false } : folder
      ));
    } else {
      setFolders(folders.map(folder => 
        folder.id === id ? { ...folder, isEditing: false } : folder
      ));
    }
  };

  const startEditing = (id) => { /* ... (Seu código - sem mudanças) ... */ 
    setFolders(folders.map(folder => 
      folder.id === id ? { ...folder, isEditing: true } : folder
    ));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // --- MUDANÇA: handleCreateNewProject agora envia 'ifcAreaName' ---
  const handleCreateNewProject = async () => {
    // Validação
    if (projectData.name.trim() === '') {
        alert("O nome do projeto é obrigatório.");
        return;
    }
    if (projectData.ifcAreaName.trim() === '') {
        alert("Você deve selecionar uma Área do BIM correspondente.");
        return;
    }
  
    try {
      // (Usa a rota /api/captures/upload que você corrigiu)
      const res = await fetch('/api/captures/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          
          folder: projectData.name, // O nome amigável
          nomeObra: projectData.name,
          ifcAreaName: projectData.ifcAreaName, // O nome técnico do IFC
          
          descricao: projectData.description || 'Projeto criado via web',
          imageBase64: null, // Indica que é uma criação de pasta
          
          // (Dados que o seu 'main' enviava)
          gps: {},
          orientacao: {},
          
          // (Estes campos não são usados no backend de criação de pasta,
          //  mas podemos enviá-los se o schema 'Image' os aceitar)
          // totalArea: projectData.totalArea,
          // startDate: projectData.startDate,
          // expectedCompletion: projectData.expectedCompletion,
          // responsible: projectData.responsible
        })
      });
  
      const responseData = await res.json();

      if (res.ok) {
        // Atualiza a lista de pastas
        const foldersRes = await fetch('/api/folders');
        const foldersData = await foldersRes.json();
        setFolders(foldersData);
        
        // Limpa o formulário e fecha o modal
        setProjectData({
          name: '',
          ifcAreaName: '',
          description: '',
          totalArea: '',
          startDate: '',
          expectedCompletion: '',
          responsible: ''
        });
        setShowNewProjectModal(false);
      } else {
        console.error('Erro ao criar projeto:', responseData.message);
        alert(`Erro: ${responseData.message}`);
      }
    } catch (err) {
      console.error('Erro ao criar projeto (Catch):', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const ProfileModal = () => (
    <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
      <div className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* ... (Seu JSX do Modal de Perfil - sem mudanças) ... */}
        <div className="modal-header">
          <h3>Meu perfil</h3>
          <button 
            className="modal-close"
            onClick={() => setShowProfileModal(false)}
          >
            ×
          </button>
        </div>
        
        <div className="profile-content">
          <div className="profile-picture-section">
            <div className="profile-picture">
              {profileImage ? (
                <img src={profileImage} alt="Foto do perfil" />
              ) : (
                <div className="profile-picture-placeholder">
                  👤
                </div>
              )}
            </div>
            
            <input
              type="file"
              id="profile-image-upload"
              className="file-input"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <label htmlFor="profile-image-upload" className="upload-btn">
                {isUploading ? <div className="loading-spinner"></div> : '📷'}
                {isUploading ? 'Enviando...' : 'Alterar Foto'}
              </label>
              
              {profileImage && (
                <button 
                  className="upload-btn"
                  onClick={handleRemoveImage}
                  style={{ background: 'linear-gradient(135deg, #dc3545, #c82333)' }}
                >
                  🗑️ Remover
                </button>
              )}
            </div>
            
            <div className={`upload-status ${uploadStatus.includes('sucesso') ? 'upload-success' : uploadStatus.includes('Erro') ? 'upload-error' : ''}`}>
              {uploadStatus}
            </div>
          </div>
          
          <div className="profile-info">
            <div className="info-section">
              <h4>Informações pessoais</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Nome:</span>
                  <span className="info-value">{userProfile.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{userProfile.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Cargo:</span>
                  <span className="info-value">{userProfile.role}</span>
                </div>
              </div>
            </div>
            
            <div className="info-section">
              <h4>Informações da conta</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Data de cadastro:</span>
                  <span className="info-value">
                    {new Date(userProfile.registrationDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Último login:</span>
                  <span className="info-value">
                    {new Date(userProfile.lastLogin).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );

  if (currentView === 'users') {
    return <UsersManagement onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'history') {
    return (
      <ConstructionHistory 
        projectName={selectedProject?.name} 
        projectData={selectedProject}
        onBack={() => setCurrentView('home')}
      />
    );
  }

  // (Componente principal HOME)
  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-left">
          <div className="header-logo">
            <span className="metro-text">METRO</span>
            <span className="bim-text">BIM</span>
          </div>
        </div>

        <div className="header-right">
          <button 
            className="icon-button settings-button"
            onClick={() => setCurrentView('users')}
            title="Gerenciar Usuários"
          >
            ⚙️
          </button>
          <div className="user-menu">
            <button 
              className="icon-button user-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              👤
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowProfileModal(true);
                  }}
                >
                  👤 Meu perfil
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                >
                  🚪 Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="toolbar">
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="toolbar-buttons">
            <button 
              className="new-project-btn"
              onClick={() => setShowNewProjectModal(true)}
            >
              <span className="btn-icon">+</span>
              Novo projeto
            </button>
          </div>
        </div>

        <div className="folders-grid">
          {filteredFolders.map(folder => (
            <div 
              key={folder.id || folder.name} // (Usa 'name' como fallback)
              className="folder-item"
              onClick={() => {
                setSelectedProject(folder);
                setCurrentView('history');
              }}
            >
              <div className="folder-preview">
                {folder.preview || '📁'}
              </div>
              
              <div className="folder-content">
                {folder.isEditing ? (
                  <input
                    type="text"
                    value={folder.name}
                    onChange={(e) => handleFolderNameEdit(folder.id, e.target.value)}
                    onBlur={() => handleFolderNameEdit(folder.id, folder.name)}
                    onKeyPress={(e) => e.key === 'Enter' && handleFolderNameEdit(folder.id, folder.name)} // (Corrigido para 'onKeyPress')
                    className="folder-name-input"
                    autoFocus
                    onClick={(e) => e.stopPropagation()} 
                  />
                ) : (
                  <div 
                    className="folder-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation(); 
                      // startEditing(folder.id); // (Desabilitado pois 'id' pode não existir ainda)
                    }}
                    title="Nome da pasta" // (Removido 'Duplo clique')
                  >
                    {folder.name}
                  </div>
                )}
                
                <div className="folder-date">
                  {formatDate(folder.date)}
                </div>
              </div>
              
              <button 
                className="folder-edit-button"
                onClick={(e) => {
                  e.stopPropagation();
                  // startEditing(folder.id); // (Desabilitado)
                }}
                title="Editar nome"
                style={{display: 'none'}} // (Esconde o botão de editar)
              >
                ✏️
              </button>
            </div>
          ))}
        </div>

        {filteredFolders.length === 0 && (
          <div className="no-results">
            <p>Nenhum projeto encontrado para "{searchTerm}"</p>
          </div>
        )}
      </main>

      {/* --- MUDANÇA: O Modal de Novo Projeto agora tem o dropdown --- */}
      {showNewProjectModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowNewProjectModal(false);
            setProjectData({ name: '', ifcAreaName: '', description: '', totalArea: '', startDate: '', expectedCompletion: '', responsible: '' });
          }
        }}>
          <div className="modal large-modal">
            <div className="modal-header">
              <h3>Criar novo projeto</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowNewProjectModal(false);
                  setProjectData({ name: '', ifcAreaName: '', description: '', totalArea: '', startDate: '', expectedCompletion: '', responsible: '' });
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                
                {/* Campo 1: Nome do Projeto (Amigável) */}
                <div className="form-group">
                  <label htmlFor="project-name">Nome do projeto (Pasta) *</label>
                  <input
                    type="text"
                    id="project-name"
                    name="name" // O nome do campo no estado
                    value={projectData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Plataforma - Inspeção 1"
                    className="modal-input"
                    autoFocus
                  />
                </div>

                {/* Campo 2: Área do BIM (O "Tradutor") */}
                <div className="form-group">
                  <label htmlFor="ifc-area">Área do BIM correspondente *</label>
                  <select
                    id="ifc-area"
                    name="ifcAreaName" // O nome do campo no estado
                    value={projectData.ifcAreaName}
                    onChange={handleInputChange}
                    className="modal-input"
                    disabled={isLoadingIfcAreas || ifcAreaError}
                  >
                    <option value="">
                      {ifcAreaError ? `Erro: ${ifcAreaError}` : 
                       isLoadingIfcAreas ? "Carregando áreas do BIM..." : 
                       "-- Selecione a área técnica --"}
                    </option>
                    
                    {ifcAreas.map(area => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Campo 3: Descrição */}
                <div className="form-group span-two">
                  <label htmlFor="project-description">Descrição</label>
                  <textarea
                    id="project-description"
                    name="description"
                    value={projectData.description}
                    onChange={handleInputChange}
                    placeholder="Descreva o projeto..."
                    className="modal-textarea"
                    rows="3"
                  />
                </div>
                
                {/* (Seus outros campos - mantidos) */}
                <div className="form-group">
                  <label htmlFor="total-area">Área total (m²)</label>
                  <input
                    type="text"
                    id="total-area"
                    name="totalArea"
                    value={projectData.totalArea}
                    onChange={handleInputChange}
                    placeholder="Ex: 15.000"
                    className="modal-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="start-date">Data de início</label>
                  <input
                    type="date"
                    id="start-date"
                    name="startDate"
                    value={projectData.startDate}
                    onChange={handleInputChange}
                    className="modal-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="expected-completion">Previsão de término</label>
                  <input
                    type="date"
                    id="expected-completion"
                    name="expectedCompletion"
                    value={projectData.expectedCompletion}
                    onChange={handleInputChange}
                    className="modal-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="responsible">Responsável</label>
                  <input
                    type="text"
                    id="responsible"
                    name="responsible"
                    value={projectData.responsible}
                    onChange={handleInputChange}
                    placeholder="Nome do responsável"
                    className="modal-input"
                  />
                </div>

              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-btn cancel1"
                onClick={() => {
                  setShowNewProjectModal(false);
                  setProjectData({ name: '', ifcAreaName: '', description: '', totalArea: '', startDate: '', expectedCompletion: '', responsible: '' });
                }}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn confirm1"
                onClick={handleCreateNewProject}
                disabled={!projectData.name.trim() || !projectData.ifcAreaName.trim()}
              >
                Criar projeto e Gerar Plano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil */}
      {showProfileModal && <ProfileModal />}
    </div>
  );
}

export default Home;