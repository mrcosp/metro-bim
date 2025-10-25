import React, { useState } from 'react';
import './ConstructionHistory.css';

function ConstructionHistory({ projectName, onBack }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [constructionData, setConstructionData] = useState({
    projectName: projectName || 'Canteiro Obra A',
    images: [
      {
        id: 1,
        url: 'https://via.placeholder.com/600x400/001871/FFFFFF?text=Obra+Inicial',
        date: '2024-01-01',
        description: 'Fase inicial - Preparação do terreno',
        progress: 10
      },
      {
        id: 2,
        url: 'https://via.placeholder.com/600x400/0033A0/FFFFFF?text=Fundacao',
        date: '2024-02-15',
        description: 'Fundações concluídas',
        progress: 30
      },
      {
        id: 3,
        url: 'https://via.placeholder.com/600x400/0050C8/FFFFFF?text=Estrutura',
        date: '2024-03-20',
        description: 'Estrutura em andamento',
        progress: 50
      },
      {
        id: 4,
        url: 'https://via.placeholder.com/600x400/0066FF/FFFFFF?text=Atual',
        date: '2024-04-10',
        description: 'Estado atual da obra',
        progress: 70
      }
    ],
    summary: {
      totalArea: '15.000 m²',
      startDate: '2024-01-01',
      expectedCompletion: '2024-12-31',
      currentProgress: 70,
      responsible: 'Eng. João Silva',
      status: 'Em Andamento'
    }
  });

  const [selectedFile, setSelectedFile] = useState(null);

  const handleNext = () => {
    setCurrentImageIndex(prev => 
      prev === constructionData.images.length - 1 ? 0 : prev + 1
    );
  };

  const handlePrev = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? constructionData.images.length - 1 : prev - 1
    );
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      const newImage = {
        id: constructionData.images.length + 1,
        url: URL.createObjectURL(selectedFile),
        date: new Date().toISOString().split('T')[0],
        description: 'Nova imagem enviada',
        progress: constructionData.summary.currentProgress
      };

      setConstructionData(prev => ({
        ...prev,
        images: [...prev.images, newImage]
      }));

      setSelectedFile(null);
      document.getElementById('file-input').value = '';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getProgressColor = (progress) => {
    if (progress < 30) return '#ff4444';
    if (progress < 60) return '#ffaa00';
    if (progress < 90) return '#00aaff';
    return '#00cc66';
  };

  const currentImage = constructionData.images[currentImageIndex];

  return (
    <div className="history-container">
      <header className="history-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>
        <h1 className="project-title">{constructionData.projectName}</h1>
        <div className="header-actions">
          <span className="progress-badge">
            Progresso: {constructionData.summary.currentProgress}%
          </span>
        </div>
      </header>

      <div className="history-content">
        <div className="image-section">
          <div className="image-container">
            <img 
              src={currentImage.url} 
              alt={`Obra ${formatDate(currentImage.date)}`}
              className="construction-image"
            />
            
            <button className="nav-button prev-button" onClick={handlePrev}>
              ‹
            </button>
            <button className="nav-button next-button" onClick={handleNext}>
              ›
            </button>

            <div className="image-overlay">
              <div className="image-info">
                <h3>{formatDate(currentImage.date)}</h3>
                <p>{currentImage.description}</p>
                <div className="progress-indicator">
                  <div 
                    className="progress-bar"
                    style={{
                      width: `${currentImage.progress}%`,
                      backgroundColor: getProgressColor(currentImage.progress)
                    }}
                  ></div>
                  <span>{currentImage.progress}% concluído</span>
                </div>
              </div>
            </div>
          </div>

          <div className="timeline-section">
            <h3>Linha do tempo da obra</h3>
            <div className="timeline-scroll">
              {constructionData.images.map((image, index) => (
                <div 
                  key={image.id}
                  className={`timeline-item ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img 
                    src={image.url} 
                    alt={`Thumb ${formatDate(image.date)}`}
                    className="timeline-thumb"
                  />
                  <div className="timeline-date">
                    {formatDate(image.date)}
                  </div>
                  <div className="timeline-progress">
                    {image.progress}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-card">
            <h2>Sumário da obra</h2>
            
            <div className="summary-item">
              <label>Área total:</label>
              <span>{constructionData.summary.totalArea}</span>
            </div>

            <div className="summary-item">
              <label>Data início:</label>
              <span>{formatDate(constructionData.summary.startDate)}</span>
            </div>

            <div className="summary-item">
              <label>Previsão término:</label>
              <span>{formatDate(constructionData.summary.expectedCompletion)}</span>
            </div>

            <div className="summary-item">
              <label>Progresso atual:</label>
              <div className="progress-display">
                <div 
                  className="progress-circle"
                  style={{
                    background: `conic-gradient(${getProgressColor(constructionData.summary.currentProgress)} ${constructionData.summary.currentProgress * 3.6}deg, #e0e0e0 0deg)`
                  }}
                >
                  <span>{constructionData.summary.currentProgress}%</span>
                </div>
              </div>
            </div>

            <div className="summary-item">
              <label>Responsável:</label>
              <span>{constructionData.summary.responsible}</span>
            </div>

            <div className="summary-item">
              <label>Status:</label>
              <span className={`status-badge ${constructionData.summary.status.toLowerCase().replace(' ', '-')}`}>
                {constructionData.summary.status}
              </span>
            </div>
          </div>

          <div className="upload-section">
            <h3>Adicionar nova imagem</h3>
            <div className="upload-area">
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
              />
              <label htmlFor="file-input" className="upload-button">
                📷 Selecionar imagem
              </label>
              
              {selectedFile && (
                <div className="selected-file">
                  <span>{selectedFile.name}</span>
                  <button onClick={handleUpload} className="confirm-upload">
                    📤 Enviar
                  </button>
                </div>
              )}
            </div>
            <p className="upload-hint">
              Formatos: JPG, PNG, GIF (Máx: 10MB)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConstructionHistory;