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

  const [projectData, setProjectData] = useState({
    name: '',
    totalArea: '',
    startDate: '',
    expectedCompletion: '',
    responsible: '',
    description: ''
  });

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

  useEffect(() => {
    async function fetchFolders() {
      try {
        const response = await fetch('http://localhost:3000/api/folders');
        const data = await response.json();
        setFolders(data);
      } catch (err) {
        console.error('Erro ao buscar pastas:', err);
      }
    }
    fetchFolders();
    
    loadUserProfile();
  }, []);

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

  const handleImageUpload = async (event) => {
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

  const handleRemoveImage = () => {
    setProfileImage(null);
    localStorage.removeItem('userProfileImage');
    setUploadStatus('Foto removida com sucesso!');
    setTimeout(() => setUploadStatus(''), 3000);
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFolderNameEdit = (id, newName) => {
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

  const startEditing = (id) => {
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

  const handleCreateNewProject = async () => {
    if (projectData.name.trim() === '') return;
  
    try {
      const res = await fetch('http://localhost:3000/api/captures/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeObra: projectData.name,
          descricao: projectData.description || 'Projeto criado via web',
          gps: {},
          orientacao: {},
          imageBase64: '',
          totalArea: projectData.totalArea,
          startDate: projectData.startDate,
          expectedCompletion: projectData.expectedCompletion,
          responsible: projectData.responsible
        })
      });
  
      if (res.ok) {
        const foldersRes = await fetch('http://localhost:3000/api/folders');
        const foldersData = await foldersRes.json();
        setFolders(foldersData);
        
        setProjectData({
          name: '',
          totalArea: '',
          startDate: '',
          expectedCompletion: '',
          responsible: '',
          description: ''
        });
        setShowNewProjectModal(false);
      } else {
        console.error('Erro ao criar projeto');
      }
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const ProfileModal = () => (
    <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
      <div className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
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
              key={folder.id} 
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
                    onPress={(e) => e.key === 'Enter' && handleFolderNameEdit(folder.id, folder.name)}
                    className="folder-name-input"
                    autoFocus
                    onClick={(e) => e.stopPropagation()} 
                  />
                ) : (
                  <div 
                    className="folder-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation(); 
                      startEditing(folder.id);
                    }}
                    title="Duplo clique para editar"
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
                  startEditing(folder.id);
                }}
                title="Editar nome"
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

      {showNewProjectModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowNewProjectModal(false);
            setProjectData({
              name: '',
              totalArea: '',
              startDate: '',
              expectedCompletion: '',
              responsible: '',
              description: ''
            });
          }
        }}>
          <div className="modal large-modal">
            <div className="modal-header">
              <h3>Criar novo projeto</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowNewProjectModal(false);
                  setProjectData({
                    name: '',
                    totalArea: '',
                    startDate: '',
                    expectedCompletion: '',
                    responsible: '',
                    description: ''
                  });
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="project-name">Nome do projeto *</label>
                  <input
                    type="text"
                    id="project-name"
                    name="name"
                    value={projectData.name}
                    onChange={handleInputChange}
                    placeholder="Digite o nome do projeto"
                    className="modal-input"
                    autoFocus
                  />
                </div>

                <div className="form-group">
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
                  setProjectData({
                    name: '',
                    totalArea: '',
                    startDate: '',
                    expectedCompletion: '',
                    responsible: '',
                    description: ''
                  });
                }}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn confirm1"
                onClick={handleCreateNewProject}
                disabled={!projectData.name.trim()}
              >
                Criar projeto
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