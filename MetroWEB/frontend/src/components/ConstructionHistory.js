import React, { useState, useEffect } from 'react';
import './ConstructionHistory.css';

function ConstructionHistory({ projectName, onBack }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isApplyingAI, setIsApplyingAI] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [aiProcessedImage, setAiProcessedImage] = useState(null);
  
  // Buscar imagens do backend
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(`/folder/${projectName}`);
        const data = await res.json();

        if (data.length > 0) {
          setImages(data.map((img, i) => ({
            id: img.id,
            url: img.base64,
            date: img.criado_em,
            description: img.descricao || 'Sem descrição',
            progress: Math.min(100, 10 + i * 20)
          })));

          setSummary({
            totalArea: '15.000 m²',
            startDate: data[0].criado_em,
            expectedCompletion: '2025-12-31',
            currentProgress: Math.min(100, data.length * 15),
            responsible: 'Eng. Responsável',
            status: 'Em andamento'
          });
        }
      } catch (err) {
        console.error('Erro ao buscar imagens:', err);
      }
    };
    fetchImages();
  }, [projectName]);

  // Determina se são poucas ou muitas imagens
  const hasFewImages = images.length <= 4;
  const timelineClass = `timeline-scroll ${hasFewImages ? 'few-images' : 'many-images'}`;

  const handleNext = () =>
    setCurrentImageIndex(prev =>
      prev === images.length - 1 ? 0 : prev + 1
    );

  const handlePrev = () =>
    setCurrentImageIndex(prev =>
      prev === 0 ? images.length - 1 : prev - 1
    );

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
  
    const toBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  
    const imageBase64 = await toBase64(selectedFile);
  
    const payload = {
      nomeObra: projectName,
      folder: projectName, 
      pontoDeVista: 'Frontal',
      descricao: selectedFile.name,
      gps: { latitude: 0, longitude: 0 },
      orientacao: { azimute_graus: 0, pitch_graus: 0, roll_graus: 0 },
      imageBase64
    };
  
    try {
      const res = await fetch('/api/captures/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Imagem enviada com sucesso!');
        setSelectedFile(null);
  
        const updated = await fetch(`/folder/${projectName}`);
        const imagesData = await updated.json();
        setImages(imagesData.map((img, i) => ({
          id: img.id,
          url: img.base64,
          date: img.criado_em,
          description: img.descricao || 'Sem descrição',
          progress: Math.min(100, 10 + i * 20)
        })));
      } else {
        alert('Erro: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar a imagem.');
    }
  };

  const handleExportReport = async () => {
    try {
      // Simular geração de relatório
      alert('Gerando relatório BIM...');
      
      // Aqui você implementaria a lógica real de exportação
      const response = await fetch('/api/export/bim-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName,
          images: images.length,
          summary
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `relatorio-bim-${projectName}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        alert('Relatório exportado com sucesso!');
      } else {
        alert('Erro ao exportar relatório');
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      alert('Erro ao exportar relatório');
    }
  };

  const handleApplyAI = async () => {
    if (!currentImage) return;
    
    setIsApplyingAI(true);
    try {
      const response = await fetch(`/inference/${currentImage.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: currentImage.id,
          projectName
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Usar a imagem overlay retornada pelo servidor
        const processedImageData = {
          url: result.overlay, 
          date: new Date().toISOString(),
          description: `Análise IA: ${currentImage.description}`,
          progress: currentImage.progress
        };
        
        setAiProcessedImage(processedImageData);
        setShowComparison(true);
      } else {
        alert('Erro na análise de IA');
      }
    } catch (error) {
      console.error('Erro ao aplicar IA:', error);
      alert('Erro ao aplicar IA');
    } finally {
      setIsApplyingAI(false);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('pt-BR');

  const getProgressColor = (progress) => {
    if (progress < 30) return '#ff4444';
    if (progress < 60) return '#ffaa00';
    if (progress < 90) return '#00aaff';
    return '#00cc66';
  };

  const currentImage = images[currentImageIndex];

  if (!currentImage) {
    return (
      <div className="history-container">
        <header className="history-header">
          <button className="back-button" onClick={onBack}>← Voltar</button>
          <h1 className="project-title">{projectName}</h1>
        </header>
        <p className="text-center mt-8">Nenhuma imagem encontrada.</p>
      </div>
    );
  }

  return (
    <div className="history-container">
      <header className="history-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>
        <h1 className="project-title">{projectName}</h1>
        <div className="header-actions">
          <button className="export-report-btn" onClick={handleExportReport}>
            📊 Exportar relatório BIM
          </button>
          <span className="progress-badge">
            Progresso: {summary?.currentProgress || 0}%
          </span>
        </div>
      </header>

      <div className="history-content">
        <div className="image-section">
          <div className={`image-container ${showComparison ? 'comparison-mode' : ''}`}>
            <div className={`image-wrapper`}>
              <img
                src={currentImage.url}
                alt={`Obra ${formatDate(currentImage.date)}`}
                className="construction-image"
              />
              {!showComparison && (
                <>
                  <button className="nav-button prev-button" onClick={handlePrev}>‹</button>
                  <button className="nav-button next-button" onClick={handleNext}>›</button>
                </>
              )}
              <div className="image-label">Original</div>
            </div>

            {showComparison && aiProcessedImage && (
              <div className="image-wrapper">
                <img
                  src={aiProcessedImage.url || '/api/placeholder/800/600'} // URL da imagem processada
                  alt={`Processado por IA ${formatDate(currentImage.date)}`}
                  className="construction-image"
                />
                <div className="image-label">Análise IA</div>
              </div>
            )}

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
                  <button 
                    className={`ai-analysis-btn ${showComparison ? 'comparison-active' : ''}`}
                    onClick={handleApplyAI}
                    disabled={isApplyingAI}
                  >
                    {isApplyingAI ? '🔄 Aplicando IA...' : 
                      showComparison ? '🔄 Nova Análise' : '🤖 Aplicar IA'}
                  </button>
                  {showComparison && (
                    <button 
                      className="close-comparison-btn"
                      onClick={() => setShowComparison(false)}
                    >
                      ✕ Voltar para vista única
                    </button> 
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="timeline-section">
            <h3>Linha do tempo da obra</h3>
            <div className={timelineClass}>
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className={`timeline-item ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img src={image.url} alt={`Thumb ${formatDate(image.date)}`} className="timeline-thumb" />
                  <div className="timeline-date">{formatDate(image.date)}</div>
                  <div className="timeline-progress">{image.progress}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {summary && (
          <div className="summary-section">
            <div className="summary-card">
              <h2>Sumário da obra</h2>
              <div className="summary-item">
                <label>Área total:</label>
                <span>{summary.totalArea}</span>
              </div>
              <div className="summary-item">
                <label>Data início:</label>
                <span>{formatDate(summary.startDate)}</span>
              </div>
              <div className="summary-item">
                <label>Previsão término:</label>
                <span>{formatDate(summary.expectedCompletion)}</span>
              </div>
              <div className="summary-item">
                <label>Responsável:</label>
                <span>{summary.responsible}</span>
              </div>
              <div className="summary-item">
                <label>Status:</label>
                <span className={`status-badge ${summary.status.toLowerCase().replace(' ', '-')}`}>
                  {summary.status}
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
                Formatos: JPG, PNG (Máx: 10MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConstructionHistory;