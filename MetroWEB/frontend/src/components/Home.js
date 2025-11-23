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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [folderToEdit, setFolderToEdit] = useState(null);

  const [ifcAreas, setIfcAreas] = useState([]);
  const [ifcAreaError, setIfcAreaError] = useState(null);
  const [isLoadingIfcAreas, setIsLoadingIfcAreas] = useState(false);

  const [projectData, setProjectData] = useState({
    name: '',
    ifcAreaName: '', 
    description: '',
    totalArea: '',
    startDate: '',
    expectedCompletion: '',
    responsible: ''
  });

  const [editData, setEditData] = useState({
    name: ''
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
        const response = await fetch('/api/folders');
        const data = await response.json();
        setFolders(data);
      } catch (err) {
        console.error('Erro ao buscar pastas:', err);
      }
    }
    fetchFolders();
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (showNewProjectModal) {
      async function fetchIfcAreas() {
        setIsLoadingIfcAreas(true);
        setIfcAreaError(null);
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
          setIsLoadingIfcAreas(false);
        }
      }
      fetchIfcAreas();
    }
  }, [showNewProjectModal]);

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

  const confirmDelete = (folder, e) => {
    e.stopPropagation();
    setFolderToDelete(folder);
    setShowDeleteModal(true);
  };

  const openEditModal = (folder, e) => {
    e.stopPropagation();
    setFolderToEdit(folder);
    setEditData({
      name: folder.name
    });
    setShowEditModal(true);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    
    try {
      const response = await fetch(`/api/folders/${folderToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setFolders(folders.filter(folder => folder.id !== folderToDelete.id));
        setShowDeleteModal(false);
        setFolderToDelete(null);
        console.log(`Pasta ${folderToDelete.name} deletada com sucesso`);
      } else {
        console.error('Erro ao deletar pasta');
        alert('Erro ao deletar pasta');
      }
    } catch (error) {
      console.error('Erro ao deletar pasta:', error);
      alert('Erro ao deletar pasta');
    }
  };

  const handleEditFolder = async () => {
    if (!folderToEdit) return;
    
    try {
      const response = await fetch(`/api/folders/${folderToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData)
      });
      
      if (response.ok) {
        setFolders(folders.map(folder => 
          folder.id === folderToEdit.id ? { ...folder, ...editData } : folder
        ));
        setShowEditModal(false);
        setFolderToEdit(null);
        console.log(`Pasta ${folderToEdit.name} atualizada com sucesso`);
      } else {
        console.error('Erro ao editar pasta');
        alert('Erro ao editar pasta');
      }
    } catch (error) {
      console.error('Erro ao editar pasta:', error);
      alert('Erro ao editar pasta');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateNewProject = async () => {
    if (projectData.name.trim() === '') {
        alert("O nome do projeto é obrigatório.");
        return;
    }
    if (projectData.ifcAreaName.trim() === '') {
        alert("Você deve selecionar uma Área do BIM correspondente.");
        return;
    }
  
    try {
      const res = await fetch('/api/captures/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: projectData.name,
          nomeObra: projectData.name,
          ifcAreaName: projectData.ifcAreaName,
          descricao: projectData.description || 'Projeto criado via web',
          imageBase64: null,
          gps: {},
          orientacao: {},
        })
      });
  
      const responseData = await res.json();

      if (res.ok) {
        const foldersRes = await fetch('/api/folders');
        const foldersData = await foldersRes.json();
        setFolders(foldersData);
        
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

  const DeleteConfirmationModal = () => (
    <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Confirmar exclusão</h3>
          <button 
            className="modal-close"
            onClick={() => setShowDeleteModal(false)}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <p>Tem certeza que deseja excluir a pasta <strong>"{folderToDelete?.name}"</strong>?</p>
          <p className="warning-text">⚠️ Esta ação não pode ser desfeita.</p>
        </div>
        
        <div className="modal-footer">
          <button 
            className="modal-btn cancel1"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancelar
          </button>
          <button 
            className="modal-btn delete-btn"
            onClick={handleDeleteFolder}
          >
            🗑️ Excluir
          </button>
        </div>
      </div>
    </div>
  );

  const EditModal = () => (
    <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Editar nome da pasta</h3>
          <button 
            className="modal-close"
            onClick={() => setShowEditModal(false)}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="edit-name">Nome da pasta *</label>
            <input
              type="text"
              id="edit-name"
              name="name"
              value={editData.name}
              onChange={handleEditInputChange}
              placeholder="Nome da pasta"
              className="modal-input"
              autoFocus
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="modal-btn cancel1"
            onClick={() => setShowEditModal(false)}
          >
            Cancelar
          </button>
          <button 
            className="modal-btn confirm1"
            onClick={handleEditFolder}
            disabled={!editData.name.trim()}
          >
            💾 Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );

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

      <main className="home-main right-scroll">
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
              key={folder.id || folder.name}
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
                <div 
                  className="folder-name"
                  title="Nome da pasta"
                >
                  {folder.name}
                </div>
                
                <div className="folder-date">
                  {formatDate(folder.date)}
                </div>
              </div>
              
              <div className="folder-actions">
                <button 
                  className="folder-edit-button"
                  onClick={(e) => openEditModal(folder, e)}
                  title="Editar projeto"
                >
                  <span>✏️</span>
                </button>
                
                <button 
                  className="folder-delete-button"
                  onClick={(e) => confirmDelete(folder, e)}
                  title="Excluir pasta"
                >
                  <span>🗑️</span>
                </button>
              </div>
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
                
                <div className="form-group">
                  <label htmlFor="project-name">Nome do projeto (Pasta) *</label>
                  <input
                    type="text"
                    id="project-name"
                    name="name"
                    value={projectData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Plataforma - Inspeção 1"
                    className="modal-input"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ifc-area">Área do BIM correspondente *</label>
                  <select
                    id="ifc-area"
                    name="ifcAreaName"
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

      {showDeleteModal && <DeleteConfirmationModal />}

      {showEditModal && <EditModal />}

      {showProfileModal && <ProfileModal />}
    </div>
  );
}

export default Home;