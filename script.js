/*js/main.js
   Implementación simple y comentada para Torre de Control (colas, pila, ordenamiento)
*/

/* -------------------------------
   1) Estructuras: Queue y Stack
   ------------------------------- */

// Cola simple FIFO con métodos básicos
class Queue {
  constructor() {
    this.items = [];
  }
  //Agrega un elemento al final de la cola
  enqueue(item) {
    this.items.push(item);
  }
  //Elimina y retorna el primer elemento de la cola
  dequeue() {
    return this.items.shift();
  }
  //Retorna el primer elemento sin eliminarlo
  peek() {
    return this.items[0];
  }
  //Indica si la cola esta vacia
  isEmpty() {
    return this.items.length === 0;
  }
  //Retorna el numero de elementos en la cola
  size() {
    return this.items.length;
  }
  //Devuelve una copia de la cola 
  toArray() {
    return [...this.items];
  }
  // Remplaza los elementos de la cola con un nuevo arreglo
  fromArray(arr) {
    this.items = [...arr];
  }
}
//Clase stack, se usa para almacenar el historial de vuelos asignados con una pila LIFO (Last in, firts out)
// Pila LIFO simple
class Stack {
  constructor() {
    this.items = [];
  }
  //Agrega un elemento al tope de la fila
  push(item) {
    this.items.push(item);
  }
  //Elimina y retorna el ultimo elemento de la pila
  pop() {
    return this.items.pop();
  }
  //Retorna el ultimo elemento sin eliminarlo
  peek() {
    return this.items[this.items.length - 1];
  }
  //Indica si la pila esta vacia
  isEmpty() {
    return this.items.length === 0;
  }
  //Devuelve la cantidad de elementos almacenados
  size() {
    return this.items.length;
  }
  //Devuelve una copia del contenido de la pila
  toArray() {
    return [...this.items];
  }
}

/* -------------------------------
   2) Modelo Flight (vuelo)
   Repr4esenta un vuelo dentro del sistema de la torre de control
   Cada uno de los vuelos tiene un odentificador tipo (Aterrizaje/Despeje)
   Prioridad y despeje del combustible y una marca a tiempo
   ------------------------------- */

class Flight {
  constructor(id, tipo, prioridad, combustible) {
    this.id = id; // string // Identificador para el vuelo (ej: AVA-101)
    this.tipo = tipo; // "ATERRIZAJE" o "DESPEGUE" (Tipo de vuelo)
    this.prioridad = prioridad; // "EMERGENCIA","COMBUSTIBLE","VIP","CARGA","COMERCIAL" (Novel de prioridad)
    this.combustible = Number(combustible); // número (Nivel de combustible)
    this.timestamp = Date.now(); // para desempatar FIFO (Es decir fecha y hora de creacion para desempate por orden)
  }
}

/* -------------------------------
   3) Comparador de prioridades
   ------------------------------- */

/*
 Regla:
 1. Ordenar por categoría según un ranking:
    EMERGENCIA > COMBUSTIBLE > VIP > CARGA > COMERCIAL
 2. Si ambas categorías iguales y es COMBUSTIBLE, gana menor combustible.
 3. Si aún empatan, desempatar por timepo (más antiguo primero).
 Minetras mayor sea el numero, mas urgente es el vuelo
*/

const PRIORITY_ORDER = {
  "EMERGENCIA": 5,
  "COMBUSTIBLE": 4,
  "VIP": 3,
  "CARGA": 2,
  "COMERCIAL": 1
};

function compareFlights(a, b) {
  // devuelve -1 si a debe ir antes que b, 1 si después, 0 si iguales
  const pa = PRIORITY_ORDER[a.prioridad] || 0;
  const pb = PRIORITY_ORDER[b.prioridad] || 0;
  if (pa > pb) return -1; // a tiene mayor prioridad
  if (pa < pb) return 1;

  // mismas categorías
  if (a.prioridad === "COMBUSTIBLE" && b.prioridad === "COMBUSTIBLE") {
    if (a.combustible < b.combustible) return -1; // menos combustible = más urgente
    if (a.combustible > b.combustible) return 1;
  }

  // desempate por timestamp (más antiguo primero)
  if (a.timestamp < b.timestamp) return -1;
  if (a.timestamp > b.timestamp) return 1;

  return 0;
}

/* -------------------------------
   4) App state: colas y pila
   Aqui se guardan los vuelos y en que orden se estan procesando
   ------------------------------- */

const landingQueue = new Queue();    // cola de aterrizaje
const takeoffQueue = new Queue();    // cola de despegue
const historyStack = new Stack();    // historial (pila) de asignaciones

/* -------------------------------
   5) Conexión con DOM (render)
   Esta es la conexion con los botones del html, para que los botones funcionen 
   ------------------------------- */

const listaAterrizajeEl = document.getElementById("listaAterrizaje");
const listaDespegueEl = document.getElementById("listaDespegue");
const historialEl = document.getElementById("historial");

const btnAgregar = document.getElementById("btnAgregar");
const btnOrdenar = document.getElementById("btnOrdenar");
const btnAsignar = document.getElementById("btnAsignar");
const btnDeshacer = document.getElementById("btnDeshacer");
const algoritmoSelect = document.getElementById("algoritmoSelect");

// Controles para la reproducción de pasos de ordenamiento
let sortSteps = [];   // array de snapshots {arr, compared: [i,j], swapped: boolean}
let currentStep = 0;
let sortIntervalId = null;

/* --------------------------------------------------
   6) Funciones de render para mostrar las tarjetas
   -------------------------------------------------- */

function getColorByPriority(p) {
  switch (p) {
    case "EMERGENCIA": return "#ff6b6b"; // rojo
    case "COMBUSTIBLE": return "#ff9f43"; // naranja
    case "VIP": return "#ffd166"; // dorado
    case "CARGA": return "#74c0fc"; // azul claro
    case "COMERCIAL": return "#bdbdbd"; // gris
    default: return "#e0e0e0";
  }
}
//Esta funcion es la que le coloca el color a las tarjeticas segun la prioridad del vuelo

function createFlightCard(flight) {
  const card = document.createElement("div");
  card.className = "flight-card";
  card.style.background = getColorByPriority(flight.prioridad);
  card.innerHTML = `
    <div style="font-weight:bold">${flight.id}</div>
    <div style="font-size:0.9rem">${flight.tipo} • ${flight.prioridad}</div>
    <div style="font-size:0.8rem">Comb: ${flight.combustible}</div>
  `;
  return card;
}
//Esta funcion es para crear la tarjeta en html para los vuelos con la informacion princpal

function renderQueues() {
  // Render aterrizaje, convierte la cola en arreglo, limpia contenedor html, recorre cada vuelo y agega tarjeta en DOM
  listaAterrizajeEl.innerHTML = "";
  landingQueue.toArray().forEach(f => {
    listaAterrizajeEl.appendChild(createFlightCard(f));
  });

  // Render despegue, convierte la cola en arrgelo, limpia contenedor html, recorre cada vuelo y agrega tarjeta
  listaDespegueEl.innerHTML = "";
  takeoffQueue.toArray().forEach(f => {
    listaDespegueEl.appendChild(createFlightCard(f));
  });

  // Render historial como pila (último arriba)
  historialEl.innerHTML = "";
  // mostramos de arriba hacia abajo el arreglo de la pila (último en el final del array)
  const histArr = historyStack.toArray().slice().reverse();
  histArr.forEach(f => {
    const el = document.createElement("div");
    el.className = "hist-item";
    el.textContent = `${f.id} • ${f.tipo} • ${f.prioridad}`;
    historialEl.appendChild(el);
  });
}
  // Este ayuda con el historial visual, convierte la pila en arreglo, la revierte, y crea un elemento div en html para cada vuelo y lo agrega

/* -------------------------------
   7) Agregar vuelo (usa prompt para simplicidad)
   ------------------------------- */

function agregarVueloInteractivo() {
  //Aquí usamos prompts para simplicidad, este permite crear un nuevo vueloy agregarlo a la cola correspondiente, solicitando los datos y agregandolos
  const id = prompt("ID del vuelo (ej: AVA-101):");
  if (!id) return alert("ID obligatorio");

  const tipoRaw = prompt("Tipo: escribe 'A' para Aterrizaje o 'D' para Despegue").toUpperCase();
  const tipo = (tipoRaw === "A") ? "ATERRIZAJE" : "DESPEGUE";

  const prioridadRaw = prompt("Prioridad (EMERGENCIA, COMBUSTIBLE, VIP, CARGA, COMERCIAL):").toUpperCase();
  if (!PRIORITY_ORDER[prioridadRaw]) return alert("Prioridad no válida");

  const combustibleRaw = prompt("Combustible (número):");
  const combustible = Number(combustibleRaw);
  if (Number.isNaN(combustible)) return alert("Combustible debe ser número");

  const flight = new Flight(id, tipo, prioridadRaw, combustible);

  if (flight.tipo === "ATERRIZAJE") landingQueue.enqueue(flight);
  else takeoffQueue.enqueue(flight);

  renderQueues();
}

/* -------------------------------
   8) Asignar pista (dequeue y push a historial)
   ------------------------------- */

function asignarPista() {
  // regla sencilla: priorizamos la cola de aterrizaje si no está vacía
  let vuelo;
  if (!landingQueue.isEmpty()) vuelo = landingQueue.dequeue();
  else if (!takeoffQueue.isEmpty()) vuelo = takeoffQueue.dequeue();
  else {
    alert("No hay vuelos en ninguna cola");
    return;
  }

  historyStack.push(vuelo);
  renderQueues();
}
//Verifica si ahy vuelos en cola, si no hay revisa los de despeje, guarda el vuelo atendido en historial y actualiza pantalla


/* -------------------------------
   9) Deshacer (pop de historial y re-enqueue)
   ------------------------------- */

function deshacerAsignacion() {
  if (historyStack.isEmpty()) {
    alert("Historial vacío (nada que deshacer)");
    return;
  }
  const vuelo = historyStack.pop();
  // regresar a su cola original (al final)
  if (vuelo.tipo === "ATERRIZAJE") landingQueue.enqueue(vuelo);
  else takeoffQueue.enqueue(vuelo);
  renderQueues();
}
//Revisa si hay vuelos en el historial, saca el ulitmo vuelo atendido, lo devuelve a su cola original y refresca la vista

/* -------------------------------
   10) Bubble Sort que registra pasos
   ------------------------------- */

/*
  El algoritmo no cambia la cola original directamente: trabaja sobre una copia
  y genera snapshots (arr, compared indices, swapped flag).
  Cada snapshot guarda un arreglo de objetos Flight (clon superficial).
*/

function bubbleSortWithSteps(arr, comparator) {
  const steps = []; //Aqui se guardan todos los pasos
  const a = arr.slice() //Copia del arreglo iniciañ
  const n = a.length; //Numero de elementos 
  //arr: Lista de vuelos que se quiere ordenar, comparator: funcion para comparar dos vuelos haber cual tiene mas prioridad


  // estado inicial (snapshot sin comparaciones)
  steps.push({
    arr: a.map(x => x), // shallow copy de referencias (está bien para mostrar)
    compared: null,
    swapped: false,
    i: -1,
    j: -1
  });


  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({
        arr: a.map(x => x),
        compared: [j, j+1],
        swapped: false,
        i, j
      });
      //Aqui se empieza a comparar los elementos de dos en dos y se guarda paso de comparacion


      //i devuelve > 0, significa que a[j] debe ir después de a[j+1]
      if (comparator(a[j], a[j+1]) > 0) {
        const tmp = a[j];
        a[j] = a[j+1];
        a[j+1] = tmp;

        steps.push({
          arr: a.map(x => x),
          compared: [j, j+1],
          swapped: true,
          i, j
        });
      }
    }
  }//Se guarda el paso despues del intercambio

  // final snapshot
  steps.push({
    arr: a.map(x => x),
    compared: null,
    swapped: false,
    i: -1,
    j: -1
  });
   //Aqui ya se guarda el estado ordenado completo
  return steps; // Aqui retorna nevamente los pasos
}


/* -------------------------------
   11) Control de reproducción de pasos
   ------------------------------- */

function startSortPlayback(steps, targetQueue) {
  // steps: array de snapshots
  // targetQueue: referencia a la cola que se debe actualizar al terminar
  sortSteps = steps;
  currentStep = 0;
  //Guarda los pasos y empieza desde el primero

  // Contola y evita que se superpongan animaciones
  if (sortIntervalId) clearInterval(sortIntervalId);

  // función para mostrar paso actual en el DOM:
  function showStep(index) {
    const s = sortSteps[index];
    // mostramos el arreglo del paso en la cola correspondiente
    // reemplazamos temporalmente la representación visual de la cola elegida
    const containerEl = (targetQueue === landingQueue) ? listaAterrizajeEl : listaDespegueEl;
    containerEl.innerHTML = ""; 

    s.arr.forEach((f, idx) => {
      const card = createFlightCard(f);
      // resaltamos si está siendo comparado
      if (s.compared && (idx === s.compared[0] || idx === s.compared[1])) {
        card.style.boxShadow = "0 0 10px rgba(0,0,0,0.35)";
        card.style.transform = "scale(1.03)";
      }
      if (s.swapped) {
        // si hubo swap, aplicamos una pequeña animación CSS (se gestiona con class)
        card.classList.add("swapped");
        // se elimina después de un timeout pequeño para no acumular clases
        setTimeout(() => card.classList.remove("swapped"), 400);
      }
      containerEl.appendChild(card);
    });
  }

  // autoplay cada 700ms (puedes ajustar o conectar a controles)
  sortIntervalId = setInterval(() => {
    if (currentStep >= sortSteps.length) {
      clearInterval(sortIntervalId);
      sortIntervalId = null;
      // al finalizar, actualizamos la cola real con el resultado ordenado
      targetQueue.fromArray(sortSteps[sortSteps.length - 1].arr);
      renderQueues();
      return;
    }
    showStep(currentStep);
    currentStep++;
  }, 700);
}//Este arreglo funciona para la animacion en general de la cola

/* -------------------------------
   12) Handler: ordenar cola seleccionada
   ------------------------------- */

function ordenarColaSeleccionada() {
  const algo = algoritmoSelect.value;
  if (!algo) return alert("Selecciona un algoritmo del menú");
  //Aquí el usuario selecciona el algoritmo que desea utilizar

  // Pedimos al usuario que elija qué cola ordenar: 'A' o 'D'
  const which = prompt("Qué cola ordenar? 'A' para Aterrizaje, 'D' para Despegue").toUpperCase();
  const targetQueue = (which === "A") ? landingQueue : takeoffQueue;

  if (targetQueue.isEmpty()) {
    alert("La cola seleccionada está vacía");
    return;
  }

  // Creamos una copia del arreglo para no modificar directamente la cola
  const arrCopy = targetQueue.toArray();
  let steps = [];

  // Dependiendo del algoritmo seleccionado, ejecutamos el correspondiente
  if (algo === "burbuja") {
    steps = bubbleSortWithSteps(arrCopy, compareFlights);
  } else if (algo === "insercion") {
    steps = insertionSortWithSteps(arrCopy, compareFlights);
  } else if (algo === "seleccion") {
    steps = selectionSortWithSteps(arrCopy, compareFlights);
  } else if (algo === "rapido") {
    steps = quickSortWithSteps(arrCopy, compareFlights);
  } else {
    alert("Algoritmo no reconocido");
    return;
  }

  // En todos los casos mostramos la animación paso a paso
  startSortPlayback(steps, targetQueue);
}

/* -------------------------------
   13) Eventos de botones
   ------------------------------- */

btnAgregar.addEventListener("click", () => agregarVueloInteractivo());
btnAsignar.addEventListener("click", () => asignarPista());
btnDeshacer.addEventListener("click", () => deshacerAsignacion());
btnOrdenar.addEventListener("click", () => ordenarColaSeleccionada());
//Aqui lo que hace es que los botones funcionen

/* -------------------------------
   14) Iniciar con algunos vuelos de ejemplo (opcional)
   ------------------------------- */

function seedExample() {
  const examples = [
    new Flight("AVA-101", "ATERRIZAJE", "COMERCIAL", 65),
    new Flight("SAM-333", "ATERRIZAJE", "COMBUSTIBLE", 12),
    new Flight("VIP-01", "DESPEGUE", "VIP", 80),
    new Flight("EMG-1", "ATERRIZAJE", "EMERGENCIA", 50),
    new Flight("CG-77", "DESPEGUE", "CARGA", 90)
  ];
  examples.forEach(f => {
    if (f.tipo === "ATERRIZAJE") landingQueue.enqueue(f);
    else takeoffQueue.enqueue(f);
  });
  renderQueues();
}//Aqui hay algunos vuelos de prueba mientras el usuario empieza a agregar por consola

// ejecuta seedExample si quieres datos iniciales
seedExample();

/* -------------------------------
   15) Insertion Sort (Inserción)
   ------------------------------- */

/*
  Este algoritmo recorre el arreglo desde el segundo elemento
  e inserta cada vuelo en su posición correcta dentro de la parte ordenada.
  También genera snapshots similares al de burbuja para la animación.
*/

function insertionSortWithSteps(arr, comparator) {
  const steps = [];
  const a = arr.slice();

  // snapshot inicial
  steps.push({
    arr: a.map(x => x),
    compared: null,
    swapped: false,
    i: -1,
    j: -1
  });

  for (let i = 1; i < a.length; i++) {
    let key = a[i];
    let j = i - 1;

    while (j >= 0 && comparator(a[j], key) > 0) {
      steps.push({
        arr: a.map(x => x),
        compared: [j, j + 1],
        swapped: false,
        i, j
      });

      a[j + 1] = a[j];
      j--;

      steps.push({
        arr: a.map(x => x),
        compared: [j + 1, j + 2],
        swapped: true,
        i, j
      });
    }

    a[j + 1] = key;
  }

  // snapshot final
  steps.push({
    arr: a.map(x => x),
    compared: null,
    swapped: false,
    i: -1,
    j: -1
  });

  return steps;
}


/* -------------------------------
   16) Selection Sort (Selección)
   ------------------------------- */

/*
  Este algoritmo busca el vuelo con mayor prioridad en la parte
  no ordenada y lo coloca al inicio. También genera snapshots paso a paso.
*/

function selectionSortWithSteps(arr, comparator) {
  const steps = [];
  const a = arr.slice();

  steps.push({
    arr: a.map(x => x),
    compared: null,
    swapped: false,
    i: -1,
    j: -1
  });

  for (let i = 0; i < a.length - 1; i++) {
    let minIndex = i;
    for (let j = i + 1; j < a.length; j++) {
      steps.push({
        arr: a.map(x => x),
        compared: [minIndex, j],
        swapped: false,
        i, j
      });

      if (comparator(a[minIndex], a[j]) > 0) {
        minIndex = j;
      }
    }

    if (minIndex !== i) {
      const temp = a[i];
      a[i] = a[minIndex];
      a[minIndex] = temp;

      steps.push({
        arr: a.map(x => x),
        compared: [i, minIndex],
        swapped: true,
        i, j: minIndex
      });
    }
  }

  steps.push({
    arr: a.map(x => x),
    compared: null,
    swapped: false,
    i: -1,
    j: -1
  });

  return steps;
}


/* -------------------------------
   17) Quick Sort (Rápido)
   ------------------------------- */

/*
  QuickSort elige un pivote y divide el arreglo en dos partes:
  los vuelos de mayor prioridad a un lado y los de menor al otro.
  Luego ordena recursivamente cada mitad. Se guardan snapshots
  para mostrar la evolución del proceso.
*/

function quickSortWithSteps(arr, comparator) {
  const steps = [];
  const a = arr.slice();

  function quicksortRecursive(a, left, right) {
    if (left >= right) return;

    const pivotIndex = partition(a, left, right);
    quicksortRecursive(a, left, pivotIndex - 1);
    quicksortRecursive(a, pivotIndex + 1, right);
  }

  function partition(a, left, right) {
    const pivot = a[right];
    let i = left - 1;

    for (let j = left; j < right; j++) {
      steps.push({
        arr: a.map(x => x),
        compared: [j, right],
        swapped: false,
        i: left,
        j: right
      });

      if (comparator(a[j], pivot) < 0) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
        steps.push({
          arr: a.map(x => x),
          compared: [i, j],
          swapped: true,
          i, j
        });
      }
    }

    [a[i + 1], a[right]] = [a[right], a[i + 1]];
    steps.push({
      arr: a.map(x => x),
      compared: [i + 1, right],
      swapped: true,
      i, j: right
    });

    return i + 1;
  }

  steps.push({
    arr: a.map(x => x),
    compared: null,
    swapped: false,
    i: -1,
    j: -1
  });

  quicksortRecursive(a, 0, a.length - 1);

  steps.push({
    arr: a.map(x => x),
    compared: null,
    swapped: false,
    i: -1,
    j: -1
  });

  return steps;
}
