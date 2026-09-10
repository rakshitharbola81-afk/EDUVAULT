const API_URL = 'http://localhost:5000/api/notes';
let allNotes = [];
function openUploadModal() {
    document.getElementById('uploadModal').classList.remove('hidden');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
}
document.getElementById('pdfFile')?.addEventListener('change', (e) => {
    const fileName = e.target.files[0]?.name || "Attach PDF Document";
    document.getElementById('fileLabel').innerText = fileName;
});
async function fetchNotes() {
    try {
        const response = await fetch(API_URL);
        allNotes = await response.json();
        renderNotes(allNotes);
    } catch (err) {
        console.error("Connection Error:", err);
    }
}

function renderNotes(notes, selectedSem = 'all') {
    const grid = document.getElementById('notesGrid');
    const title = document.getElementById('libraryTitle');
    grid.innerHTML = '';

    title.innerText = selectedSem === 'all' ? 'Notes Library' : `Semester ${selectedSem} Resources`;

    if (notes.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 text-center glass-panel rounded-3xl border border-dashed border-gray-800 fade-in">
                <h3 class="text-xl font-bold text-gray-400">No resources available</h3>
                <p class="text-sm text-gray-600 mt-2">There are currently no notes uploaded for this criteria.</p>
                <button onclick="openUploadModal()" class="mt-6 text-brand-primary hover:underline text-sm font-medium">Be the first to contribute!</button>
            </div>`;
        return;
    }

    notes.forEach((note, index) => {
        const nameParts = note.author ? note.author.trim().split(' ') : ['?'];
        const initials = nameParts.length > 1
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : nameParts[0][0].toUpperCase();

        const card = `
            <div class="note-card glass-panel rounded-3xl p-6 transition-all duration-300 glow-card flex flex-col group fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="flex justify-between items-start mb-5">
                    <div class="flex items-center gap-3">
                        <div class="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </div>
                        <div class="overflow-hidden">
                            <h4 class="text-lg font-bold text-white group-hover:text-brand-primary transition truncate">${note.title}</h4>
                            <p class="text-[10px] text-gray-500 uppercase tracking-widest">${note.department} • SEM ${note.semester}</p>
                        </div>
                    </div>
                    <button onclick="deleteNote('${note._id}')" class="text-gray-600 hover:text-red-500 transition-colors p-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
                <p class="text-sm text-gray-400 mb-6 flex-grow line-clamp-3">${note.description || 'No additional details provided.'}</p>
                <div class="flex items-center justify-between gap-4 pt-5 border-t border-gray-800/50 mt-auto">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-[10px] font-bold border border-brand-primary/40 text-brand-primary">${initials}</div>
                        <p class="text-xs font-semibold text-gray-200">${note.author || 'Contributor'}</p>
                    </div>
                    <a href="http://localhost:5000/${note.fileUrl}" target="_blank" class="p-2.5 bg-gray-800/50 rounded-xl text-gray-400 hover:bg-brand-primary hover:text-white transition duration-300">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </a>
                </div>
            </div>`;
        grid.innerHTML += card;
    });
}
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerText = "Processing...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('author', document.getElementById('author').value);
    formData.append('department', document.getElementById('department').value);
    formData.append('semester', document.getElementById('semester').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('pdf', document.getElementById('pdfFile').files[0]);

    try {
        const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
        if (response.ok) {
            closeUploadModal();
            fetchNotes();
            document.getElementById('uploadForm').reset();
            document.getElementById('fileLabel').innerText = "Attach PDF Document";
        }
    } catch (err) {
        console.error("Upload failed:", err);
    } finally {
        btn.innerText = "Post Content";
        btn.disabled = false;
    }
});
async function deleteNote(id) {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            fetchNotes();
        } else {
            alert("Error deleting the note.");
        }
    } catch (err) {
        console.error("Delete Error:", err);
    }
}
function filterBySem(sem) {
    const buttons = document.querySelectorAll('.sem-btn');
    buttons.forEach(btn => {
        btn.classList.remove('sem-btn-active');
        if (sem === 'all' && btn.innerText.includes('All')) btn.classList.add('sem-btn-active');
        else if (btn.innerText.includes(`Sem ${sem}`)) btn.classList.add('sem-btn-active');
    });

    const filtered = (sem === 'all') ? allNotes : allNotes.filter(n => n.semester == sem);
    renderNotes(filtered, sem);
}

document.getElementById('notesSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.note-card');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? 'flex' : 'none';
    });
});
fetchNotes();