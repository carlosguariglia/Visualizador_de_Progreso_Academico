/*
 Lógica de progreso por carga horaria y estado.
 Estados y ponderaciones:
 - no cursada: 0
 - cursando: 0.25
 - cursada aprobada: 0.75
 - final aprobado / equivalencia: 1

 Valor materia = cargaHoraria (horas) -> se usa directamente como "puntos".
 Progreso % = (puntosActuales / puntosTotales) * 100

 Guardado en localStorage con clave 'studentProgressDemo'
*/

/*
  Contract & notes (short):
  - Inputs: JSON data (array of materias OR { nombre_carrera, materias }) via fetch/import or localStorage.
  - Outputs: UI updates (progress bar, climber position, subject list) and localStorage payload { nombre_carrera, materias }.
  - Error modes: malformed JSON on import (user sees alert), fetch failure falls back to localStorage/defaults.
  - Success criteria: load() -> subjects populated; save() -> localStorage contains payload; updateAll() reflects % and triggers flag/confetti at 100%.
  Edge cases handled: empty subject list (totalPoints=0), legacy array-only storage, viewport resizes that reposition climber.
*/

const STORAGE_KEY_PREFIX = 'studentProgress_'
const SELECTED_CAREER_KEY = 'selectedCareer'

const DEFAULT_SUBJECTS = [
  {id: 's1', name: 'Programación I', hours: 80, state: 'final'},
  {id: 's2', name: 'Matemática', hours: 60, state: 'cursada'},
  {id: 's3', name: 'Arquitectura de Computadoras', hours: 48, state: 'no'},
  {id: 's4', name: 'Sistemas Operativos', hours: 64, state: 'no'},
  {id: 's5', name: 'Base de Datos', hours: 72, state: 'cursando'},
  {id: 's6', name: 'Análisis de Sistemas', hours: 90, state: 'cursada'}
]

const STATE_WEIGHT = {
  'no': 0,
  'cursando': 0.25,
  'cursada': 0.75,
  'final': 1,
  'equivalencia': 1
}

let subjects = []
let carreraNombre = null
let selectedCareerFile = null
const subtitleEl = document.querySelector('.subtitle')
const defaultSubtitle = subtitleEl ? subtitleEl.textContent : ''

// Set the displayed name of the career (subtitle) and keep it in memory.
// Accepts null/undefined to reset to the default subtitle.
function setCarreraNombre(n){
  carreraNombre = n || null
  if (subtitleEl) subtitleEl.textContent = carreraNombre || defaultSubtitle
}

// elementos DOM
const subjectsContainer = document.getElementById('subjectsContainer')
const yearTabs = document.getElementById('yearTabs')

const SELECTED_YEAR_KEY = 'selectedYear'
let selectedYear = localStorage.getItem(SELECTED_YEAR_KEY) || null
const progressBar = document.getElementById('progressBar')
const percentageLabel = document.getElementById('percentage')
const pointsLabel = document.getElementById('points')
const climberG = document.getElementById('climberG')
const mountain = document.getElementById('mountain')
const mountainSVG = document.getElementById('mountainSVG')
const completionFlag = document.getElementById('completionFlag')
const confettiContainer = document.getElementById('confetti')
let confettiTimeout = null

// Simple confetti launcher (CSS-based)
// Creates `count` divs with random colors/positions and lets CSS animations handle the fall.
// Kept intentionally simple and dependency-free; for a more realistic effect use a
// canvas-based confetti library.
function launchConfetti(count = 30){
  if (!confettiContainer) return
  confettiContainer.innerHTML = ''
  const colors = ['#ef4444','#f59e0b','#fbbf24','#16a34a','#2b8ae2','#7c3aed']
  for (let i=0;i<count;i++){
    const el = document.createElement('div')
    el.className = 'confetti-piece'
    const left = Math.random()*100
    el.style.left = left + '%'
    el.style.background = colors[Math.floor(Math.random()*colors.length)]
    el.style.transform = `translateY(${Math.random()*-40-10}px) rotate(${Math.random()*360}deg)`
    el.style.animationDuration = (1200 + Math.random()*800) + 'ms'
    el.style.opacity = 0.95
    confettiContainer.appendChild(el)
  }
  // remove after animation
  if (confettiTimeout) clearTimeout(confettiTimeout)
  confettiTimeout = setTimeout(()=>{ if (confettiContainer) confettiContainer.innerHTML = '' }, 2000)
}

// botones
const exportBtn = document.getElementById('exportBtn')
const importBtn = document.getElementById('importBtn')
const importFile = document.getElementById('importFile')

function setStatus(msg){
  const statusEl = document.getElementById('loadStatus')
  if (statusEl) statusEl.textContent = msg
}

/*
 load(careerFile)
 - Carga el archivo de carrera especificado (ej: 'materias_TecAnaSistemas151.json')
 - Si ya existe progreso guardado en localStorage para esa carrera, lo usa
 - Si no, carga el archivo JSON base de la carrera
 - Acepta dos formatos de JSON:
     1) Array plano: [ {id,name,hours,state,year}, ... ]  (formato antiguo)
     2) Objeto: { nombre_carrera: '...', materias: [ ... ] } (recomendado)
*/
async function load(careerFile = null) {
  if (!careerFile) {
    // Intentar cargar la última carrera seleccionada
    careerFile = localStorage.getItem(SELECTED_CAREER_KEY)
    if (!careerFile) {
      subjects = []
      setStatus('Por favor, selecciona una carrera')
      return
    }
  }

  selectedCareerFile = careerFile
  localStorage.setItem(SELECTED_CAREER_KEY, careerFile)
  
  const storageKey = STORAGE_KEY_PREFIX + careerFile
  
  // Primero intentar cargar progreso guardado en localStorage
  const savedProgress = localStorage.getItem(storageKey)
  if (savedProgress) {
    try {
      const parsed = JSON.parse(savedProgress)
      if (Array.isArray(parsed)) {
        subjects = parsed
      } else if (parsed && Array.isArray(parsed.materias)) {
        subjects = parsed.materias
        if (parsed.nombre_carrera) setCarreraNombre(parsed.nombre_carrera)
      }
      setStatus('Progreso cargado desde tu almacenamiento local')
      return
    } catch (e) {
      // Si hay error, cargar desde archivo
    }
  }

  // Si no hay progreso guardado, cargar el archivo base de la carrera
  try {
    const resp = await fetch(careerFile, { cache: 'no-store' })
    if (resp.ok) {
      const data = await resp.json()
      let loaded = null
      if (Array.isArray(data)) {
        loaded = data
      } else if (data && Array.isArray(data.materias)) {
        loaded = data.materias
        if (data.nombre_carrera) setCarreraNombre(data.nombre_carrera)
      }
      if (loaded) {
        subjects = loaded
        save() // Guardar en localStorage para esta carrera
        setStatus('Carrera cargada correctamente')
        return
      }
    }
  } catch (err) {
    setStatus('Error al cargar el archivo de carrera')
    console.error('Error cargando carrera:', err)
  }

  // Si todo falla, usar valores por defecto
  subjects = DEFAULT_SUBJECTS
  setStatus('Usando valores por defecto')
}

function save() {
  if (!selectedCareerFile) return
  
  // Guardar materias junto con el nombre de la carrera (si está disponible)
  // Guardamos un objeto con dos propiedades para preservar metadatos (nombre_carrera)
  // Cada carrera tiene su propio espacio en localStorage
  const payload = {
    nombre_carrera: carreraNombre || null,
    materias: subjects
  }
  const storageKey = STORAGE_KEY_PREFIX + selectedCareerFile
  localStorage.setItem(storageKey, JSON.stringify(payload))
}

function calcTotals() {
  // totalPoints: suma de horas de todas las materias (base para el %)
  const totalPoints = subjects.reduce((s, x) => s + x.hours, 0)
  // actualPoints: horas ponderadas por el estado de cada materia (0,0.25,0.75,1)
  const actualPoints = subjects.reduce((s, x) => s + x.hours * (STATE_WEIGHT[x.state] || 0), 0)
  // porcentaje = (actual / total) * 100, con protección contra división por cero
  const pct = totalPoints === 0 ? 0 : (actualPoints / totalPoints) * 100
  return { totalPoints, actualPoints, pct }
}

function renderTabs(years){
  yearTabs.innerHTML = ''
  for (const y of years){
    const b = document.createElement('button')
    b.type = 'button'
    b.className = (String(y) === String(selectedYear)) ? 'active' : ''
    b.textContent = `Año ${y}`
    b.addEventListener('click', ()=>{
      selectedYear = String(y)
      localStorage.setItem(SELECTED_YEAR_KEY, selectedYear)
      renderTabs(years)
      renderSubjects()
    })
    yearTabs.appendChild(b)
  }
}

function renderSubjects() {
  subjectsContainer.innerHTML = ''
  const byYear = subjects.reduce((acc, s) => {
    (acc[s.year] = acc[s.year] || []).push(s)
    return acc
  }, {})
  const years = Object.keys(byYear).sort((a,b)=>a-b)
  // establecer año seleccionado por defecto si no hay
  if (!selectedYear && years.length>0) selectedYear = String(years[0])
  // render tabs
  renderTabs(years)

  // mostrar solo el año seleccionado
  const y = selectedYear
  const list = byYear[y] || []
  const sect = document.createElement('div')
  sect.className = 'year-section'
  const totalHours = list.reduce((s,i)=>s + (i.hours||0), 0)
  const title = document.createElement('div')
  title.className = 'year-title'
  title.innerHTML = `<strong>Año ${y}</strong><small>${list.length} materias — ${totalHours} h</small>`
  sect.appendChild(title)

  const listDiv = document.createElement('div')
  listDiv.className = 'year-list'
  for (const sub of list){
    const row = document.createElement('div')
    row.className = 'sub-row'
    const colName = document.createElement('div')
    colName.className = 'col-name'
    colName.textContent = sub.name
    const colHours = document.createElement('div')
    colHours.className = 'col-hours'
    colHours.textContent = sub.hours + ' h'
    const colState = document.createElement('div')
    colState.className = 'col-state'
    const sel = document.createElement('select')
    for (const k of Object.keys(STATE_WEIGHT)){
      const opt = document.createElement('option')
      opt.value = k
      opt.textContent = stateLabel(k)
      if (k === sub.state) opt.selected = true
      sel.appendChild(opt)
    }
    sel.addEventListener('change', (e)=>{
      sub.state = e.target.value
      save()
      updateAll()
    })
    colState.appendChild(sel)
    const colValue = document.createElement('div')
    colValue.className = 'col-value'
    colValue.textContent = `${Math.round(sub.hours * (STATE_WEIGHT[sub.state] || 0))} pts`

    row.appendChild(colName)
    row.appendChild(colHours)
    row.appendChild(colState)
    row.appendChild(colValue)
    listDiv.appendChild(row)
  }
  sect.appendChild(listDiv)
  subjectsContainer.appendChild(sect)
}

function stateLabel(k){
  switch(k){
    case 'no': return 'No cursada'
    case 'cursando': return 'Cursando'
    case 'cursada': return 'Cursada aprobada'
    case 'final': return 'Final aprobada'
    case 'equivalencia': return 'Equivalencia'
    default: return k
  }
}

function updateAll(){
  // updateAll: single reconciliation point. Renders subjects, recalculates totals, updates
  // progress UI, repositions the climber and toggles the completion flag/confetti.
  // This ensures consistent UI after any state change.
  renderSubjects()
  const {totalPoints, actualPoints, pct} = calcTotals()
  progressBar.style.width = pct + '%'
  percentageLabel.textContent = `${pct.toFixed(1)}%`
  pointsLabel.textContent = `${Math.round(actualPoints)} / ${Math.round(totalPoints)} puntos`
  moveClimberToPercent(pct)
  // show completion flag when percentage reaches 100%
  try {
    if (completionFlag) {
      if (Math.round(pct) >= 100) {
        const wasVisible = completionFlag.classList.contains('visible')
        completionFlag.classList.add('visible')
        completionFlag.setAttribute('aria-hidden', 'false')
        // launch confetti only when becoming visible
        if (!wasVisible) launchConfetti(36)
      } else {
        completionFlag.classList.remove('visible')
        completionFlag.setAttribute('aria-hidden', 'true')
        if (confettiContainer) confettiContainer.innerHTML = ''
      }
    }
  } catch (e) {
    // ignore
  }
}

function moveClimberToPercent(pct){
  /*
   moveClimberToPercent(pct)
   - Si existe un `path#trail` en el inline SVG, posiciona el grupo `#climberG` a lo largo
     del path en la longitud correspondiente al porcentaje.
   - Calcula también una tangente muestreando un punto ligeramente adelantado para rotar
     el sprite y que siga la pendiente.
   - Si no hay SVG/path, usa un fallback que posiciona el sprite verticalmente dentro
     del contenedor `.mountain`.
  */
  // If we have an inline SVG with a trail path, position the climber along that path.
  try {
    if (mountainSVG) {
      const path = mountainSVG.querySelector('#trail')
      const climber = mountainSVG.querySelector('#climberG')
      if (path && climber) {
        // I/O: reads path geometry (getTotalLength/getPointAtLength) and writes `transform` on #climberG.
        // Performance: sampling delta uses a small fraction of total length; kept minimal to avoid jank.
        const total = path.getTotalLength()
        const len = Math.max(0, Math.min(total, (pct/100) * total))
        const pt = path.getPointAtLength(len)
        // compute tangent for angle: sample slightly ahead
        const delta = Math.max(1, total * 0.005)
  const ahead = path.getPointAtLength(Math.min(total, len + delta))
  let angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI
  // special-case: keep the climber horizontal at the very first position (pct ~= 0)
  if (pct <= 0.5) angle = 0
  // offsets to better align the climber graphic (tune if needed)
  const offsetX = 0
  const offsetY = 4
        // animate by setting transform on the group: translate then rotate around approximate anchor
        climber.setAttribute('transform', `translate(${pt.x - offsetX}, ${pt.y - offsetY}) rotate(${angle})`)
        return
      }
    }
  } catch (err) {
    console.warn('No se pudo posicionar el escalador sobre el path:', err && err.message)
  }

  // Fallback: previous vertical positioning when no SVG path available
  const mountRect = mountain.getBoundingClientRect()
  const mountHeight = mountRect.height
  const minBottom = 8
  const maxBottom = mountHeight - 64 - 24 // climber height - padding
  const newBottom = Math.round(minBottom + (pct/100) * (maxBottom - minBottom))
  // if climber is not an inline group, try to set style; otherwise set transform on group
  const domClimber = document.getElementById('climber')
  if (domClimber) {
    domClimber.style.bottom = newBottom + 'px'
    domClimber.style.transform = `translateX(-50%) rotate(${Math.min(20, pct/5)}deg)`
  } else if (climberG) {
    // move climberG vertically inside the mountain container
    climberG.setAttribute('transform', `translate(50, ${mountHeight - newBottom - 24})`)
  }
}

// Nota: la acción de "resetear" fue eliminada (botón quitado del DOM)

// Export Progress as Image
const exportImageBtn = document.getElementById('exportImageBtn')
if (exportImageBtn) {
  exportImageBtn.addEventListener('click', async ()=>{
    try {
      await exportProgressImage()
    } catch (err) {
      console.error('Error al exportar imagen:', err)
      alert('❌ Error al exportar la imagen. Por favor, intenta nuevamente.')
    }
  })
}

async function exportProgressImage() {
  setStatus('Generando imagen...')
  
  // Get current progress
  const {pct} = calcTotals()
  const careerName = carreraNombre || 'Mi Carrera'
  
  // Clone the SVG
  const originalSVG = document.getElementById('mountainSVG')
  if (!originalSVG) {
    throw new Error('SVG de montaña no encontrado')
  }
  
  const svgClone = originalSVG.cloneNode(true)
  svgClone.setAttribute('width', '600')
  svgClone.setAttribute('height', '800')
  
  // Convert images to base64 if needed (for CORS issues)
  await embedImagesAsBase64(svgClone)
  
  // Add progress info overlay
  const infoGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  infoGroup.setAttribute('id', 'progressInfo')
  
  // Background box
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bgRect.setAttribute('x', '20')
  bgRect.setAttribute('y', '20')
  bgRect.setAttribute('width', '560')
  bgRect.setAttribute('height', '100')
  bgRect.setAttribute('fill', 'white')
  bgRect.setAttribute('opacity', '0.95')
  bgRect.setAttribute('rx', '12')
  bgRect.setAttribute('stroke', '#2b8ae2')
  bgRect.setAttribute('stroke-width', '2')
  infoGroup.appendChild(bgRect)
  
  // Career name
  const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  nameText.setAttribute('x', '40')
  nameText.setAttribute('y', '55')
  nameText.setAttribute('font-size', '20')
  nameText.setAttribute('font-weight', '600')
  nameText.setAttribute('fill', '#0f172a')
  nameText.setAttribute('font-family', 'Inter, system-ui, sans-serif')
  nameText.textContent = careerName
  infoGroup.appendChild(nameText)
  
  // Progress percentage
  const pctText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  pctText.setAttribute('x', '40')
  pctText.setAttribute('y', '95')
  pctText.setAttribute('font-size', '36')
  pctText.setAttribute('font-weight', 'bold')
  pctText.setAttribute('fill', '#2b8ae2')
  pctText.setAttribute('font-family', 'Inter, system-ui, sans-serif')
  pctText.textContent = `Progreso: ${pct.toFixed(1)}%`
  infoGroup.appendChild(pctText)
  
  // Date stamp
  const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  dateText.setAttribute('x', '300')
  dateText.setAttribute('y', '770')
  dateText.setAttribute('font-size', '14')
  dateText.setAttribute('fill', '#6b7280')
  dateText.setAttribute('font-family', 'Inter, system-ui, sans-serif')
  dateText.setAttribute('text-anchor', 'middle')
  const now = new Date().toLocaleDateString('es-ES')
  dateText.textContent = `Generado el ${now}`
  infoGroup.appendChild(dateText)
  
  svgClone.appendChild(infoGroup)
  
  // Serialize SVG to string
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svgClone)
  
  // Create canvas and convert to image
  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 800
  const ctx = canvas.getContext('2d')
  
  // Create blob from SVG string
  const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'})
  const url = URL.createObjectURL(svgBlob)
  
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      // Draw white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw SVG
      ctx.drawImage(img, 0, 0)
      
      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Error al crear la imagen'))
          return
        }
        
        const downloadUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const fileName = `progreso-${careerName.replace(/[^a-zA-Z0-9]/g, '-')}-${pct.toFixed(0)}pct.png`
        link.download = fileName
        link.href = downloadUrl
        link.click()
        
        // Cleanup
        URL.revokeObjectURL(url)
        URL.revokeObjectURL(downloadUrl)
        
        setStatus(`✅ Imagen exportada: ${fileName}`)
        resolve()
      }, 'image/png', 1.0)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Error al cargar el SVG'))
    }
    
    img.src = url
  })
}

async function embedImagesAsBase64(svgElement) {
  // Find all image elements in the SVG
  const images = svgElement.querySelectorAll('image')
  
  for (const img of images) {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href')
    if (!href || href.startsWith('data:')) continue
    
    try {
      // Try to load and convert to base64
      const response = await fetch(href)
      const blob = await response.blob()
      const base64 = await blobToBase64(blob)
      img.setAttribute('href', base64)
    } catch (err) {
      console.warn(`No se pudo convertir imagen: ${href}`, err)
      // Continue anyway, might work if CORS allows
    }
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

exportBtn.addEventListener('click', ()=>{
  // Exportar incluyendo nombre de la carrera si está disponible
  const exportObj = {
    nombre_carrera: carreraNombre || defaultSubtitle || 'Mi carrera',
    materias: subjects
  }
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'progreso.json'
  a.click()
  URL.revokeObjectURL(url)
})

// Safe attach for import controls: check DOM existence before wiring events
if (importBtn) {
  if (importFile) {
    importBtn.addEventListener('click', ()=> importFile.click())
    // applyImportedData(data): normalize and apply imported file data.
    // Accepts: array OR { nombre_carrera, materias }.
    // If local data exists and differs, asks the user before overwriting.
    function applyImportedData(data){
      // aceptar tanto array plano como objeto con { nombre_carrera, materias }
      let normalized = null
      if (Array.isArray(data)) normalized = data
      else if (data && Array.isArray(data.materias)) {
        normalized = data.materias
        if (data.nombre_carrera) setCarreraNombre(data.nombre_carrera)
      } else {
        throw new Error('Formato inválido')
      }

      if (selectedCareerFile) {
        const storageKey = STORAGE_KEY_PREFIX + selectedCareerFile
        const existingRaw = localStorage.getItem(storageKey)
        if (existingRaw) {
          try {
            const existing = JSON.parse(existingRaw)
            const existingNorm = Array.isArray(existing) ? existing : (existing && Array.isArray(existing.materias) ? existing.materias : null)
            if (existingNorm && JSON.stringify(existingNorm) !== JSON.stringify(normalized)) {
              const ok = confirm('Se detectaron datos guardados localmente. Al importar se sobrescribirán. ¿Desea continuar?')
              if (!ok) return
            }
          } catch (e) {
            // parse error: continuar y sobrescribir
          }
        }
      }
      subjects = normalized
      save()
      updateAll()
      setStatus('Datos importados')
    }
    importFile.addEventListener('change', (e)=>{
      const f = e.target.files && e.target.files[0]
      if (!f) return
      const fr = new FileReader()
      fr.onload = ()=>{
        try{
          const data = JSON.parse(fr.result)
          applyImportedData(data)
        }catch(err){
          alert('Archivo inválido: ' + err.message)
        }
      }
      fr.readAsText(f)
    })
  } else {
    console.warn('Elemento #importFile no encontrado en el DOM; la función de import no estará disponible.')
    importBtn.addEventListener('click', ()=> alert('Elemento de importación no disponible en esta página.'))
  }
}

// Career selector
const careerSelector = document.getElementById('careerSelector')
const CUSTOM_CAREERS_KEY = 'customCareers'
let customCareers = []
let editingCareer = null

// Load custom careers from localStorage
function loadCustomCareers() {
  try {
    const stored = localStorage.getItem(CUSTOM_CAREERS_KEY)
    customCareers = stored ? JSON.parse(stored) : []
    updateCareerSelector()
  } catch (e) {
    customCareers = []
  }
}

// Save custom careers to localStorage
function saveCustomCareers() {
  localStorage.setItem(CUSTOM_CAREERS_KEY, JSON.stringify(customCareers))
}

// Update the career selector with custom careers
function updateCareerSelector() {
  if (!careerSelector) return
  
  const currentValue = careerSelector.value
  
  // Remove all custom career options (those starting with 'custom_')
  Array.from(careerSelector.options).forEach(opt => {
    if (opt.value.startsWith('custom_')) {
      opt.remove()
    }
  })
  
  // Add custom careers to the selector
  customCareers.forEach((career, index) => {
    const opt = document.createElement('option')
    opt.value = `custom_${index}`
    opt.textContent = `${career.name} (Personalizada)`
    careerSelector.appendChild(opt)
  })
  
  // Restore selection if it still exists
  if (currentValue && Array.from(careerSelector.options).some(opt => opt.value === currentValue)) {
    careerSelector.value = currentValue
  }
  
  updateCareerButtons()
}

// Update visibility of career management buttons
function updateCareerButtons() {
  const createBtn = document.getElementById('createCareerBtn')
  const editBtn = document.getElementById('editCareerBtn')
  const duplicateBtn = document.getElementById('duplicateCareerBtn')
  const deleteBtn = document.getElementById('deleteCareerBtn')
  
  const selectedValue = careerSelector?.value || ''
  const isCustom = selectedValue.startsWith('custom_')
  const hasSelection = selectedValue !== ''
  
  if (editBtn) editBtn.style.display = isCustom ? 'inline-block' : 'none'
  if (duplicateBtn) duplicateBtn.style.display = hasSelection ? 'inline-block' : 'none'
  if (deleteBtn) deleteBtn.style.display = isCustom ? 'inline-block' : 'none'
}

if (careerSelector) {
  loadCustomCareers()
  
  // Restaurar la selección previa
  const savedCareer = localStorage.getItem(SELECTED_CAREER_KEY)
  if (savedCareer) {
    careerSelector.value = savedCareer
  }
  
  careerSelector.addEventListener('change', async (e)=>{
    const selectedFile = e.target.value
    if (selectedFile.startsWith('custom_')) {
      // Load custom career
      const index = parseInt(selectedFile.split('_')[1])
      const career = customCareers[index]
      if (career) {
        subjects = career.subjects || []
        setCarreraNombre(career.name)
        selectedCareerFile = selectedFile
        localStorage.setItem(SELECTED_CAREER_KEY, selectedFile)
        save()
        updateAll()
        setStatus('Carrera personalizada cargada')
      }
    } else if (selectedFile) {
      await load(selectedFile)
      updateAll()
    } else {
      subjects = []
      setCarreraNombre(null)
      updateAll()
      setStatus('Por favor, selecciona una carrera')
    }
    updateCareerButtons()
  })
  
  updateCareerButtons()
}

// Career Editor Modal
const careerEditorModal = document.getElementById('careerEditorModal')
const careerEditorOverlay = document.getElementById('careerEditorOverlay')
const careerNameInput = document.getElementById('careerNameInput')
const subjectsEditorList = document.getElementById('subjectsEditorList')
const createCareerBtn = document.getElementById('createCareerBtn')
const editCareerBtn = document.getElementById('editCareerBtn')
const duplicateCareerBtn = document.getElementById('duplicateCareerBtn')
const deleteCareerBtn = document.getElementById('deleteCareerBtn')
const addSubjectBtn = document.getElementById('addSubjectBtn')
const saveCareerBtn = document.getElementById('saveCareerBtn')
const cancelCareerBtn = document.getElementById('cancelCareerBtn')

let tempSubjects = []
let subjectIdCounter = 0

function openCareerEditor(mode = 'create', careerData = null) {
  if (!careerEditorModal || !careerEditorOverlay) return
  
  editingCareer = careerData
  tempSubjects = []
  subjectIdCounter = 0
  
  const titleEl = document.getElementById('careerEditorTitle')
  if (titleEl) {
    titleEl.textContent = mode === 'edit' ? 'Editar Carrera Personalizada' : 
                         mode === 'duplicate' ? 'Duplicar Carrera' : 
                         'Crear Carrera Personalizada'
  }
  
  if (careerData) {
    careerNameInput.value = mode === 'duplicate' ? `${careerData.name} (Copia)` : careerData.name
    tempSubjects = JSON.parse(JSON.stringify(careerData.subjects || []))
  } else {
    careerNameInput.value = ''
    tempSubjects = []
  }
  
  renderSubjectsEditor()
  
  // Hide help text when opening modal
  const helpText = document.getElementById('careerHelpText')
  const helpBtn = document.getElementById('careerHelpBtn')
  if (helpText) helpText.hidden = true
  if (helpBtn) helpBtn.classList.remove('active')
  
  careerEditorOverlay.hidden = false
  careerEditorModal.hidden = false
  careerNameInput.focus()
}

function closeCareerEditor() {
  if (!careerEditorModal || !careerEditorOverlay) return
  careerEditorModal.hidden = true
  careerEditorOverlay.hidden = true
  editingCareer = null
  tempSubjects = []
  
  // Hide help text when closing
  const helpText = document.getElementById('careerHelpText')
  const helpBtn = document.getElementById('careerHelpBtn')
  if (helpText) helpText.hidden = true
  if (helpBtn) helpBtn.classList.remove('active')
}

function renderSubjectsEditor() {
  if (!subjectsEditorList) return
  
  subjectsEditorList.innerHTML = ''
  
  if (tempSubjects.length === 0) {
    const emptyMsg = document.createElement('p')
    emptyMsg.className = 'empty-subjects-msg'
    emptyMsg.textContent = 'No hay materias agregadas. Haz clic en "Agregar Materia" para comenzar.'
    subjectsEditorList.appendChild(emptyMsg)
    return
  }
  
  tempSubjects.forEach((subject, index) => {
    const row = document.createElement('div')
    row.className = 'subject-editor-row'
    
    row.innerHTML = `
      <input type="text" class="form-input subject-name" placeholder="Nombre de la materia" value="${subject.name || ''}" data-index="${index}" />
      <input type="number" class="form-input subject-year" placeholder="Año" min="1" max="6" value="${subject.year || 1}" data-index="${index}" />
      <input type="number" class="form-input subject-hours" placeholder="Horas" min="1" value="${subject.hours || 64}" data-index="${index}" />
      <button type="button" class="btn-icon btn-delete" data-index="${index}" title="Eliminar materia">🗑️</button>
    `
    
    subjectsEditorList.appendChild(row)
  })
  
  // Add event listeners
  subjectsEditorList.querySelectorAll('.subject-name').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index)
      tempSubjects[idx].name = e.target.value
    })
  })
  
  subjectsEditorList.querySelectorAll('.subject-year').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index)
      tempSubjects[idx].year = parseInt(e.target.value) || 1
    })
  })
  
  subjectsEditorList.querySelectorAll('.subject-hours').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index)
      tempSubjects[idx].hours = parseInt(e.target.value) || 64
    })
  })
  
  subjectsEditorList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index)
      tempSubjects.splice(idx, 1)
      renderSubjectsEditor()
    })
  })
}

function addNewSubject() {
  tempSubjects.push({
    id: `custom_s${subjectIdCounter++}`,
    name: '',
    year: 1,
    hours: 64,
    state: 'no'
  })
  renderSubjectsEditor()
  
  // Focus on the new subject name input
  setTimeout(() => {
    const inputs = subjectsEditorList.querySelectorAll('.subject-name')
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus()
    }
  }, 50)
}

function saveCareer() {
  const name = careerNameInput.value.trim()
  
  if (!name) {
    alert('⚠️ Por favor, ingresa un nombre para la carrera.')
    careerNameInput.focus()
    return
  }
  
  if (tempSubjects.length === 0) {
    alert('⚠️ Por favor, agrega al menos una materia.\n\nHaz clic en "+ Agregar Materia" para comenzar.')
    return
  }
  
  // Validate subjects
  for (let i = 0; i < tempSubjects.length; i++) {
    if (!tempSubjects[i].name || !tempSubjects[i].name.trim()) {
      alert(`⚠️ Por favor, completa el nombre de la materia #${i + 1}.`)
      // Focus on the empty input
      const inputs = document.querySelectorAll('.subject-name')
      if (inputs[i]) inputs[i].focus()
      return
    }
    if (!tempSubjects[i].hours || tempSubjects[i].hours < 1) {
      alert(`⚠️ Por favor, ingresa una carga horaria válida para "${tempSubjects[i].name}".\n\nLas horas deben ser mayor a 0.`)
      return
    }
    if (!tempSubjects[i].year || tempSubjects[i].year < 1) {
      alert(`⚠️ Por favor, ingresa un año válido para "${tempSubjects[i].name}".\n\nEl año debe ser mayor a 0.`)
      return
    }
  }
  
  const careerData = {
    name: name,
    subjects: tempSubjects.map(s => ({
      ...s,
      name: s.name.trim()
    }))
  }
  
  if (editingCareer && editingCareer.mode === 'edit') {
    // Update existing career
    const index = editingCareer.index
    customCareers[index] = careerData
  } else {
    // Add new career (create or duplicate)
    customCareers.push(careerData)
  }
  
  saveCustomCareers()
  updateCareerSelector()
  
  // Select the newly created/edited career
  const careerIndex = editingCareer && editingCareer.mode === 'edit' ? editingCareer.index : customCareers.length - 1
  const careerKey = `custom_${careerIndex}`
  careerSelector.value = careerKey
  
  // Load it
  subjects = JSON.parse(JSON.stringify(careerData.subjects))
  setCarreraNombre(careerData.name)
  selectedCareerFile = careerKey
  localStorage.setItem(SELECTED_CAREER_KEY, careerKey)
  save()
  updateAll()
  updateCareerButtons()
  
  closeCareerEditor()
  
  // Show success message
  const action = editingCareer && editingCareer.mode === 'edit' ? 'actualizada' : 'creada'
  setStatus(`✅ Carrera ${action} correctamente: "${careerData.name}"`)
}

function deleteCareer() {
  const selectedValue = careerSelector?.value || ''
  if (!selectedValue.startsWith('custom_')) return
  
  const careerIndex = parseInt(selectedValue.split('_')[1])
  const careerName = customCareers[careerIndex]?.name || 'esta carrera'
  
  if (!confirm(`🗑️ ¿Estás seguro de que deseas eliminar "${careerName}"?\n\nEsta acción no se puede deshacer y se perderá todo tu progreso en esta carrera.`)) {
    return
  }
  
  customCareers.splice(careerIndex, 1)
  saveCustomCareers()
  updateCareerSelector()
  
  // Clear selection
  careerSelector.value = ''
  subjects = []
  setCarreraNombre(null)
  selectedCareerFile = null
  localStorage.removeItem(SELECTED_CAREER_KEY)
  updateAll()
  updateCareerButtons()
  setStatus('Carrera eliminada')
}

async function duplicateCurrentCareer() {
  const selectedValue = careerSelector?.value || ''
  if (!selectedValue) return
  
  let careerData = null
  
  if (selectedValue.startsWith('custom_')) {
    // Duplicate custom career
    const index = parseInt(selectedValue.split('_')[1])
    careerData = {
      name: customCareers[index].name,
      subjects: JSON.parse(JSON.stringify(customCareers[index].subjects))
    }
  } else {
    // Duplicate built-in career
    try {
      const resp = await fetch(selectedValue, { cache: 'no-store' })
      if (resp.ok) {
        const data = await resp.json()
        careerData = {
          name: data.nombre_carrera || carreraNombre || 'Carrera',
          subjects: data.materias || data || []
        }
      }
    } catch (err) {
      alert('Error al cargar la carrera para duplicar.')
      return
    }
  }
  
  if (careerData) {
    openCareerEditor('duplicate', careerData)
  }
}

// Event listeners for career management
if (createCareerBtn) {
  createCareerBtn.addEventListener('click', () => openCareerEditor('create'))
}

if (editCareerBtn) {
  editCareerBtn.addEventListener('click', () => {
    const selectedValue = careerSelector?.value || ''
    if (selectedValue.startsWith('custom_')) {
      const index = parseInt(selectedValue.split('_')[1])
      const careerData = {
        name: customCareers[index].name,
        subjects: JSON.parse(JSON.stringify(customCareers[index].subjects))
      }
      openCareerEditor('edit', { ...careerData, mode: 'edit', index })
    }
  })
}

if (duplicateCareerBtn) {
  duplicateCareerBtn.addEventListener('click', duplicateCurrentCareer)
}

if (deleteCareerBtn) {
  deleteCareerBtn.addEventListener('click', deleteCareer)
}

if (addSubjectBtn) {
  addSubjectBtn.addEventListener('click', addNewSubject)
}

if (saveCareerBtn) {
  saveCareerBtn.addEventListener('click', saveCareer)
}

if (cancelCareerBtn) {
  cancelCareerBtn.addEventListener('click', closeCareerEditor)
}

if (careerEditorOverlay) {
  careerEditorOverlay.addEventListener('click', closeCareerEditor)
}

// Career Editor Help Button
const careerHelpBtn = document.getElementById('careerHelpBtn')
const careerHelpText = document.getElementById('careerHelpText')

if (careerHelpBtn && careerHelpText) {
  careerHelpBtn.addEventListener('click', () => {
    careerHelpText.hidden = !careerHelpText.hidden
    careerHelpBtn.classList.toggle('active')
  })
}

// inic
(async ()=>{
  await load()
  updateAll()
})()

// Accessibility: resize handler recalculates position
window.addEventListener('resize', ()=> updateAll())

// Help modal behavior
const helpBtn = document.getElementById('helpBtn')
const helpModal = document.getElementById('helpModal')
const helpOverlay = document.getElementById('helpOverlay')
const closeHelp = document.getElementById('closeHelp')

function openHelp(){
  if (!helpModal || !helpOverlay) return
  helpOverlay.hidden = false
  helpModal.hidden = false
  // move focus into dialog
  const btn = document.getElementById('closeHelp')
  if (btn) btn.focus()
}
function closeHelpModal(){
  if (!helpModal || !helpOverlay) return
  helpModal.hidden = true
  helpOverlay.hidden = true
  if (helpBtn) helpBtn.focus()
}

if (helpBtn){
  helpBtn.addEventListener('click', ()=> openHelp())
}
if (closeHelp){
  closeHelp.addEventListener('click', ()=> closeHelpModal())
}
if (helpOverlay){
  helpOverlay.addEventListener('click', ()=> closeHelpModal())
}

// Handle Escape key for both modals
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape') {
    // Close career editor if open
    if (careerEditorModal && !careerEditorModal.hidden) {
      closeCareerEditor()
    }
    // Close help modal if open
    else if (helpModal && !helpModal.hidden) {
      closeHelpModal()
    }
  }
})
