const showFoldersBtn = document.getElementById('showFolders');
const showUploadBtn = document.getElementById('showUpload');
const foldersDiv = document.querySelector('.folders');
const imagesDiv = document.querySelector('.images');
const uploadDiv = document.querySelector('.upload');
const foldersList = document.getElementById('foldersList');
const imagesGrid = document.getElementById('imagesGrid');
const folderTitle = document.getElementById('folderTitle');
const backToFoldersBtn = document.getElementById('backToFolders');
const enableDeleteBtn = document.getElementById('enableDelete');
const fileInput = document.getElementById('fileInput');
const previewDiv = document.getElementById('preview');
const uploadForm = document.getElementById('uploadForm');
const folderSelect = document.getElementById('folderSelect');
const newFolderInput = document.getElementById('newFolder');

let deleteMode = false;
let selectedImages = new Set();

// Mostrar/ocultar seções
showFoldersBtn.onclick = () => {
  foldersDiv.classList.remove('hidden');
  uploadDiv.classList.add('hidden');
  imagesDiv.classList.add('hidden');
  enableDeleteBtn.classList.add('hidden');
};

showUploadBtn.onclick = () => {
  uploadDiv.classList.remove('hidden');
  foldersDiv.classList.add('hidden');
  imagesDiv.classList.add('hidden');
  enableDeleteBtn.classList.add('hidden');
};

// Monta lista de pastas
const folders = JSON.parse(document.body.dataset.folders);
folders.forEach(folder => {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.textContent = folder;
  btn.onclick = () => loadFolder(folder);
  li.appendChild(btn);
  foldersList.appendChild(li);
});

// Voltar para pastas
backToFoldersBtn.onclick = () => {
  foldersDiv.classList.remove('hidden');
  imagesDiv.classList.add('hidden');
  enableDeleteBtn.classList.add('hidden');
  deleteMode = false;
  selectedImages.clear();
};

// Carregar imagens de uma pasta
function loadFolder(folderName) {
  fetch(`/folder/${folderName}`)
    .then(res => res.json())
    .then(images => {
      folderTitle.textContent = folderName;
      imagesGrid.innerHTML = '';
      selectedImages.clear();
      deleteMode = false;
      enableDeleteBtn.classList.remove('hidden');

      images.forEach(img => {
        const div = document.createElement('div');
        div.classList.add('item');
        div.dataset.id = img.id;

        const imageEl = document.createElement('img');
        imageEl.src = `/image/${img.id}`;
        imageEl.alt = img.name;
        imageEl.onclick = () => {
          if(deleteMode) toggleSelect(img.id, imageEl);
        };
        div.appendChild(imageEl);

        const p = document.createElement('p');
        p.textContent = img.name;
        div.appendChild(p);

        imagesGrid.appendChild(div);
      });

      foldersDiv.classList.add('hidden');
      imagesDiv.classList.remove('hidden');
      uploadDiv.classList.add('hidden');
    });
}

// Habilitar modo deletar
enableDeleteBtn.onclick = () => {
  deleteMode = !deleteMode;
  enableDeleteBtn.textContent = deleteMode ? 'Cancelar Exclusão' : 'Excluir Imagens';
  if(deleteMode) {
    alert("Clique nas imagens que deseja deletar. Confirme no botão 'Excluir Selecionadas'.");
    const confirmBtn = document.createElement('button');
    confirmBtn.id = 'confirmDelete';
    confirmBtn.textContent = 'Excluir Selecionadas';
    confirmBtn.onclick = confirmDelete;
    document.body.appendChild(confirmBtn);
  } else {
    const btn = document.getElementById('confirmDelete');
    if(btn) btn.remove();
    document.querySelectorAll('img.selected').forEach(img => img.classList.remove('selected'));
    selectedImages.clear();
  }
};

// Seleciona/desseleciona imagens
function toggleSelect(id, imgEl) {
  if(selectedImages.has(id)) {
    selectedImages.delete(id);
    imgEl.classList.remove('selected');
  } else {
    selectedImages.add(id);
    imgEl.classList.add('selected');
  }
}

// Confirmar exclusão
function confirmDelete() {
  if(selectedImages.size === 0) return alert("Nenhuma imagem selecionada");
  if(!confirm(`Deseja realmente deletar ${selectedImages.size} imagem(ns)?`)) return;

  selectedImages.forEach(id => {
    fetch(`/delete/${id}`, { method: 'DELETE' })
      .then(res => {
        if(res.ok) {
          document.querySelector(`.item[data-id='${id}']`).remove();
        } else {
          alert("Erro ao deletar imagem");
        }
      });
  });

  selectedImages.clear();
  deleteMode = false;
  enableDeleteBtn.textContent = 'Excluir Imagens';
  const btn = document.getElementById('confirmDelete');
  if(btn) btn.remove();
}

// Pré-visualização de arquivos selecionados
fileInput.addEventListener('change', () => {
  previewDiv.innerHTML = '';
  const files = Array.from(fileInput.files);
  files.forEach(file => {
    const div = document.createElement('div');
    div.style.display = 'inline-block';
    div.style.margin = '5px';
    div.style.textAlign = 'center';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = '100px';
    img.style.maxHeight = '100px';
    img.style.border = '1px solid #ccc';
    img.style.padding = '3px';

    const p = document.createElement('p');
    p.textContent = file.name;
    p.style.fontSize = '12px';
    p.style.marginTop = '2px';

    div.appendChild(img);
    div.appendChild(p);
    previewDiv.appendChild(div);
  });
});

// Validação de pasta obrigatória no frontend
uploadForm.addEventListener('submit', (e) => {
  if(!folderSelect.value && !newFolderInput.value.trim()) {
    e.preventDefault();
    alert("Por favor, escolha uma pasta existente ou digite o nome de uma nova pasta!");
  }
});
