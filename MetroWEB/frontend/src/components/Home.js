import React, { useState, useEffect } from 'react';
import './Home.css';
import ConstructionHistory from './ConstructionHistory';
import UsersManagement from './UsersManagement';

function Home({ onLogout }) {
  const [folders, setFolders] = useState([
    // { 
    //   id: 1, 
    //   name: 'Relatórios Mensais', 
    //   date: '2024-01-15', 
    //   isEditing: false,
    //   type: 'folder',
    //   preview: '📊'
    // },
    // { 
    //   id: 2, 
    //   name: 'Canteiro Obra A', 
    //   date: '2024-01-14', 
    //   isEditing: false,
    //   type: 'folder',
    //   preview: '🏗️'
    // },
    // { 
    //   id: 3, 
    //   name: 'Documentos Técnicos', 
    //   date: '2024-01-13', 
    //   isEditing: false,
    //   type: 'folder',
    //   preview: '📋'
    // },
    // { 
    //   id: 4, 
    //   name: 'Projetos em Andamento', 
    //   date: '2024-01-12', 
    //   isEditing: false,
    //   type: 'folder',
    //   preview: '🚧'
    // },
    // { 
    //   id: 5, 
    //   name: 'Licitações', 
    //   date: '2024-01-11', 
    //   isEditing: false,
    //   type: 'folder',
    //   preview: '📑'
    // },
    // { 
    //   id: 6, 
    //   name: 'Fiscalização', 
    //   date: '2024-01-10', 
    //   isEditing: false,
    //   type: 'folder',
    //   preview: '👷'
    // },
  ]);
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
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [currentView, setCurrentView] = useState('home'); // 'home', 'history', 'users'
  const [selectedProject, setSelectedProject] = useState(null);

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

  const handleCreateNewProject = async () => {
    if (newProjectName.trim() === '') return;
  
    try {
      const res = await fetch('http://localhost:3000/api/captures/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeObra: newProjectName,
          descricao: 'Projeto criado via web',
          gps: {},
          orientacao: {},
          imageBase64: '' // vazio, cria o registro da pasta
        })
      });
  
      if (res.ok) {
        // Recarrega a lista de pastas
        const foldersRes = await fetch('http://localhost:3000/api/folders');
        const foldersData = await foldersRes.json();
        setFolders(foldersData);
        setNewProjectName('');
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

  // Se não estiver na view home, renderiza a tela correspondente
  if (currentView === 'users') {
    return <UsersManagement onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'history') {
    return (
      <ConstructionHistory 
        projectName={selectedProject} 
        onBack={() => setCurrentView('home')}
      />
    );
  }

  // View home (padrão)
  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="header-left">
          <div className="header-logo">
            <span className="metro-text">METRO</span>
            <span className="bim-text">BIM</span>
          </div>
        </div>

        <nav className="header-nav">
          <a href="#relatorios" className="nav-link">Relatórios</a>
          <a href="#canteiros" className="nav-link">Seleção de Canteiros</a>
        </nav>

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
                <button className="dropdown-item">Meu Perfil</button>
                <button className="dropdown-item" onClick={onLogout}>Sair</button>
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
              Novo Projeto
            </button>
          </div>
        </div>

        <div className="folders-grid">
          {filteredFolders.map(folder => (
            <div 
              key={folder.id} 
              className="folder-item"
              onClick={() => {
                setSelectedProject(folder.name);
                setCurrentView('history');
              }}
            >
              <div className="folder-preview">
                {folder.preview}
              </div>
              
              <div className="folder-content">
                {folder.isEditing ? (
                  <input
                    type="text"
                    value={folder.name}
                    onChange={(e) => handleFolderNameEdit(folder.id, e.target.value)}
                    onBlur={() => handleFolderNameEdit(folder.id, folder.name)}
                    onKeyPress={(e) => e.key === 'Enter' && handleFolderNameEdit(folder.id, folder.name)}
                    className="folder-name-input"
                    autoFocus
                    onClick={(e) => e.stopPropagation()} // Impede que o clique no input mude de tela
                  />
                ) : (
                  <div 
                    className="folder-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation(); // Impede que o duplo clique mude de tela
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
                  e.stopPropagation(); // Impede que o clique no botão mude de tela
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
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Criar Novo Projeto</h3>
              <button 
                className="modal-close"
                onClick={() => setShowNewProjectModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <input
                type="text"
                placeholder="Digite o nome do projeto..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="modal-input"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateNewProject()}
                autoFocus
              />
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-btn cancel"
                onClick={() => setShowNewProjectModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn confirm"
                onClick={handleCreateNewProject}
                disabled={!newProjectName.trim()}
              >
                Criar Projeto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;