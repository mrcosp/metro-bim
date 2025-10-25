import React, { useState } from 'react';
import './UsersManagement.css';

function UsersManagement({ onBack }) {
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'João Silva',
      role: 'Engenheiro Civil',
      email: 'joao.silva@metro.com',
      active: true
    },
    {
      id: 2,
      name: 'Maria Santos',
      role: 'Arquiteta',
      email: 'maria.santos@metro.com',
      active: true
    },
    {
      id: 3,
      name: 'Pedro Oliveira',
      role: 'Coordenador de Obras',
      email: 'pedro.oliveira@metro.com',
      active: false
    },
    {
      id: 4,
      name: 'Ana Costa',
      role: 'Fiscal de Obras',
      email: 'ana.costa@metro.com',
      active: true
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    active: true
  });

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      role: '',
      email: '',
      active: true
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      role: user.role,
      email: user.email,
      active: user.active
    });
    setShowModal(true);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleSaveUser = () => {
    if (!formData.name || !formData.role || !formData.email) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (editingUser) {
      setUsers(users.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...formData }
          : user
      ));
    } else {
      const newUser = {
        id: Math.max(...users.map(u => u.id)) + 1,
        ...formData
      };
      setUsers([...users, newUser]);
    }

    setShowModal(false);
    setFormData({
      name: '',
      role: '',
      email: '',
      active: true
    });
  };

  const toggleUserStatus = (userId) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, active: !user.active }
        : user
    ));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="users-container">
      <header className="users-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>
        <h1 className="users-title">Gerenciamento de Usuários</h1>
        <div className="header-actions">
          <button className="new-user-btn" onClick={handleNewUser}>
            + Cadastrar Novo Usuário
          </button>
        </div>
      </header>

      <main className="users-main">
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={user.active ? '' : 'inactive'}>
                  <td className="user-name">{user.name}</td>
                  <td className="user-role">{user.role}</td>
                  <td className="user-email">{user.email}</td>
                  <td className="user-status">
                    <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                      {user.active ? 'Ativo' : 'Inativo'}
                    </span>
                    <button 
                      className="toggle-status-btn"
                      onClick={() => toggleUserStatus(user.id)}
                      title={user.active ? 'Desativar usuário' : 'Ativar usuário'}
                    >
                      {user.active ? '⏸️' : '▶️'}
                    </button>
                  </td>
                  <td className="user-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditUser(user)}
                      title="Editar usuário"
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteUser(user.id)}
                      title="Remover usuário"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="no-users">
              <p>Nenhum usuário cadastrado</p>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="name">Nome *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Digite o nome completo"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Cargo *</label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="Digite o cargo"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">E-mail *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Digite o e-mail"
                  className="form-input"
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="checkbox-input"
                  />
                  <span className="checkmark"></span>
                  Usuário ativo
                </label>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-btn cancel"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn confirm"
                onClick={handleSaveUser}
              >
                {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersManagement;