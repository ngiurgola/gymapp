import { data, saveData } from './data.js';
import { showModal } from './modal.js';
import { showToast } from './toast.js';

export let EXERCISE_DB = [
  { name:'Panca piana (bilanciere)', muscle:'Petto', secondary:'Tricipiti, Deltoidi anteriori', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Tieni le scapole retratte e i piedi a terra. Abbassa il bilanciere controllato fino al petto.' },
  { name:'Panca inclinata (bilanciere)', muscle:'Petto', secondary:'Deltoidi anteriori, Tricipiti', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Inclinazione 30-45°. Colpisce la parte alta del petto.' },
  { name:'Panca piana (manubri)', muscle:'Petto', secondary:'Tricipiti, Deltoidi', equipment:'Manubri', difficulty:'Intermedio', tips:'Maggiore range of motion rispetto al bilanciere. Tieni i polsi neutri.' },
  { name:'Croci con manubri', muscle:'Petto', secondary:'Deltoidi anteriori', equipment:'Manubri', difficulty:'Principiante', tips:'Leggera flessione dei gomiti fissa per tutta la ripetizione. Pensa a "abbracciare un albero".' },
  { name:'Dip (petto)', muscle:'Petto', secondary:'Tricipiti, Deltoidi', equipment:'Parallele', difficulty:'Intermedio', tips:'Inclinati leggermente in avanti per enfatizzare il petto.' },
  { name:'Push-up', muscle:'Petto', secondary:'Tricipiti, Core', equipment:'Corpo libero', difficulty:'Principiante', tips:'Corpo rigido come una tavola. Variante wide per più petto, stretta per tricipiti.' },
  { name:'Cable crossover', muscle:'Petto', secondary:'Deltoidi anteriori', equipment:'Cavi', difficulty:'Intermedio', tips:'Incrocia leggermente le mani a fine movimento per massima contrazione.' },
  { name:'Trazioni (Pull-up)', muscle:'Schiena', secondary:'Bicipiti, Core', equipment:'Sbarra', difficulty:'Avanzato', tips:'Inizia con le braccia completamente distese. Punta il petto verso la sbarra.' },
  { name:'Lat machine presa larga', muscle:'Schiena', secondary:'Bicipiti, Romboidi', equipment:'Macchina', difficulty:'Principiante', tips:'Abbassa il bilanciere fino al mento, non dietro la testa.' },
  { name:'Rematore con bilanciere', muscle:'Schiena', secondary:'Bicipiti, Trapezio', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Schiena parallela al suolo, spingi i gomiti verso il soffitto.' },
  { name:'Rematore con manubrio (un braccio)', muscle:'Schiena', secondary:'Bicipiti, Core', equipment:'Manubri', difficulty:'Principiante', tips:'Appoggia il ginocchio sulla panca. Porta il gomito verso il soffitto, non di lato.' },
  { name:'Stacco da terra', muscle:'Schiena', secondary:'Glutei, Quadricipiti, Core', equipment:'Bilanciere', difficulty:'Avanzato', tips:'Schiena neutra, barre vicino alle gambe. Spingi il pavimento via da te.' },
  { name:'Facepull', muscle:'Schiena', secondary:'Deltoidi posteriori, Rotatori', equipment:'Cavi', difficulty:'Principiante', tips:'Tira verso il viso con i gomiti alti. Ottimo per la salute delle spalle.' },
  { name:'Pulley basso', muscle:'Schiena', secondary:'Bicipiti, Romboidi', equipment:'Cavi', difficulty:'Principiante', tips:"Tira verso l'ombelico, mantieni il busto fermo." },
  { name:'Lento avanti (bilanciere)', muscle:'Spalle', secondary:'Tricipiti, Trapezio', equipment:'Bilanciere', difficulty:'Intermedio', tips:"Non inarcare eccessivamente la schiena. Premi attivamente il core." },
  { name:'Lento avanti (manubri)', muscle:'Spalle', secondary:'Tricipiti, Trapezio', equipment:'Manubri', difficulty:'Principiante', tips:'Parti con i manubri ad altezza spalle, palme in avanti.' },
  { name:'Alzate laterali', muscle:'Spalle', secondary:'Trapezio', equipment:'Manubri', difficulty:'Principiante', tips:'Leggera flessione dei gomiti. Alzate fino a 90°, non oltre.' },
  { name:'Alzate frontali', muscle:'Spalle', secondary:'Deltoidi anteriori', equipment:'Manubri', difficulty:'Principiante', tips:'Alza un braccio alla volta o entrambi. Arriva ad altezza spalle.' },
  { name:'Alzate posteriori (reverse fly)', muscle:'Spalle', secondary:'Romboidi, Trapezio', equipment:'Manubri', difficulty:'Principiante', tips:'Busto piegato a 90°. Apri le braccia come ali.' },
  { name:'Arnold press', muscle:'Spalle', secondary:'Tricipiti, Deltoidi', equipment:'Manubri', difficulty:'Intermedio', tips:'Rotazione delle palme durante il movimento. Coinvolge tutto il deltoide.' },
  { name:'Curl bilanciere', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Bilanciere', difficulty:'Principiante', tips:'Gomiti fermi ai fianchi. Non dondolare il busto.' },
  { name:'Curl manubri alternati', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Manubri', difficulty:'Principiante', tips:'Ruota il polso durante la salita (supinazione) per massima attivazione.' },
  { name:'Curl martello', muscle:'Bicipiti', secondary:'Brachiale, Avambracci', equipment:'Manubri', difficulty:'Principiante', tips:'Presa neutra (pollice in alto). Colpisce il brachioradiale.' },
  { name:'Curl cavi bassi', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Cavi', difficulty:'Principiante', tips:'Tensione costante durante tutto il movimento.' },
  { name:'Curl concentrato', muscle:'Bicipiti', secondary:'-', equipment:'Manubri', difficulty:'Principiante', tips:'Gomito appoggiato alla coscia. Massima concentrazione sul bicipite.' },
  { name:'French press (skullcrusher)', muscle:'Tricipiti', secondary:'Deltoidi', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Gomiti puntati verso il soffitto. Abbassa alla fronte controllato.' },
  { name:'Dip (tricipiti)', muscle:'Tricipiti', secondary:'Petto, Deltoidi', equipment:'Parallele', difficulty:'Intermedio', tips:'Busto eretto per enfatizzare i tricipiti.' },
  { name:'Pushdown cavi (presa stretta)', muscle:'Tricipiti', secondary:'-', equipment:'Cavi', difficulty:'Principiante', tips:'Gomiti fermi ai fianchi. Estendi completamente le braccia.' },
  { name:'Overhead tricep extension', muscle:'Tricipiti', secondary:'-', equipment:'Manubri', difficulty:'Principiante', tips:'Porta il manubrio dietro la testa. Gomiti rivolti verso il soffitto.' },
  { name:'Kickback tricipiti', muscle:'Tricipiti', secondary:'-', equipment:'Manubri', difficulty:'Principiante', tips:'Braccio parallelo al pavimento. Estendi completamente il gomito.' },
  { name:'Squat (bilanciere)', muscle:'Gambe', secondary:'Glutei, Core', equipment:'Bilanciere', difficulty:'Avanzato', tips:'Scendi fino a quando le cosce sono parallele al suolo. Ginocchia in linea con le punte.' },
  { name:'Leg press', muscle:'Gambe', secondary:'Glutei', equipment:'Macchina', difficulty:'Principiante', tips:'Non bloccare completamente le ginocchia in estensione. Piedi alla larghezza delle spalle.' },
  { name:'Affondi (lunges)', muscle:'Gambe', secondary:'Glutei, Core', equipment:'Corpo libero / Manubri', difficulty:'Principiante', tips:'Ginocchio anteriore non oltre la punta del piede. Schiena dritta.' },
  { name:'Leg curl (sdraiato)', muscle:'Gambe', secondary:'Glutei', equipment:'Macchina', difficulty:'Principiante', tips:'Movimento lento e controllato. Isola i bicipiti femorali.' },
  { name:'Leg extension', muscle:'Gambe', secondary:'-', equipment:'Macchina', difficulty:'Principiante', tips:'Estendi completamente. Tieni la posizione 1 secondo in cima.' },
  { name:'Romanian deadlift', muscle:'Gambe', secondary:'Schiena bassa, Glutei', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Schiena neutra, piega i fianchi non le ginocchia. Senti lo stretch nei femorali.' },
  { name:'Hip thrust', muscle:'Glutei', secondary:'Femorali, Core', equipment:'Bilanciere', difficulty:'Principiante', tips:'Spingi attraverso i talloni. Strizza i glutei in cima al movimento.' },
  { name:'Calf raise in piedi', muscle:'Polpacci', secondary:'-', equipment:'Macchina / Corpo libero', difficulty:'Principiante', tips:'Massima estensione in punta e massima discesa del tallone.' },
  { name:'Plank', muscle:'Core', secondary:'Spalle, Glutei', equipment:'Corpo libero', difficulty:'Principiante', tips:'Corpo in linea retta. Non alzare o abbassare i fianchi.' },
  { name:'Crunch', muscle:'Core', secondary:'-', equipment:'Corpo libero', difficulty:'Principiante', tips:"Solleva solo le scapole, non il collo. Contrai l'addome." },
  { name:'Russian twist', muscle:'Core', secondary:'Obliqui', equipment:'Corpo libero / Peso', difficulty:'Principiante', tips:'Piedi sollevati da terra per maggiore difficoltà.' },
  { name:'Leg raise', muscle:'Core', secondary:'Flessori anca', equipment:'Corpo libero', difficulty:'Principiante', tips:'Schiena ben aderente al suolo. Controlla la discesa.' },
  { name:'Ab wheel rollout', muscle:'Core', secondary:'Dorsali, Spalle', equipment:'Ruota addominali', difficulty:'Avanzato', tips:'Inizia con range ridotto. Mantieni il core contratto per tutto il movimento.' },
  { name:'Pallof press', muscle:'Core', secondary:'Obliqui, Spalle', equipment:'Cavi', difficulty:'Principiante', tips:'Resisti alla rotazione. Più sei lontano dal cavo, più è difficile.' },
  { name:'Panca declinata (bilanciere)', muscle:'Petto', secondary:'Tricipiti', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Inclinazione negativa 15-30°. Colpisce la parte bassa del petto. Attento al collo.' },
  { name:'Pullover con manubrio', muscle:'Petto', secondary:'Schiena, Tricipiti', equipment:'Manubri', difficulty:'Intermedio', tips:'Tieni i gomiti leggermente flessi. Allunga bene nella fase di discesa.' },
  { name:'Chest press (macchina)', muscle:'Petto', secondary:'Tricipiti, Deltoidi', equipment:'Macchina', difficulty:'Principiante', tips:'Ottimo per isolare il petto in sicurezza. Regola il sedile ad altezza petto.' },
  { name:'Trazioni (Chin-up)', muscle:'Schiena', secondary:'Bicipiti', equipment:'Sbarra', difficulty:'Intermedio', tips:'Presa supina (palme verso di te). Coinvolge più i bicipiti rispetto al pull-up.' },
  { name:'T-bar row', muscle:'Schiena', secondary:'Bicipiti, Trapezio', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Mantieni la schiena parallela al suolo. Stringi le scapole a fine movimento.' },
  { name:'Shrug (alzate spalle)', muscle:'Schiena', secondary:'Trapezio', equipment:'Manubri', difficulty:'Principiante', tips:'Alza le spalle verso le orecchie. Non ruotare. Mantieni il collo neutro.' },
  { name:'Iperextension (schiena)', muscle:'Schiena', secondary:'Glutei, Bicipiti femorali', equipment:'Panca apposita', difficulty:'Principiante', tips:'Non iperestendere la schiena in cima. Ottimo per il rinforzo lombare.' },
  { name:'Lat machine presa stretta', muscle:'Schiena', secondary:'Bicipiti', equipment:'Macchina', difficulty:'Principiante', tips:'Presa neutra ravvicinata. Tira verso il mento, gomiti lungo i fianchi.' },
  { name:'Upright row', muscle:'Spalle', secondary:'Trapezio, Bicipiti', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Tira verso il mento con i gomiti alti. Attenzione: può stressare la cuffia dei rotatori.' },
  { name:'Face pull con corda', muscle:'Spalle', secondary:'Romboidi, Rotatori', equipment:'Cavi', difficulty:'Principiante', tips:'Usa la corda, tira verso il viso aprendo i gomiti. Fondamentale per la salute delle spalle.' },
  { name:'Military press (in piedi)', muscle:'Spalle', secondary:'Tricipiti, Core', equipment:'Bilanciere', difficulty:'Avanzato', tips:'Spingi il bilanciere in linea retta sopra la testa. Attiva il core per proteggere la schiena.' },
  { name:'Curl su panca inclinata', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Manubri', difficulty:'Intermedio', tips:'La posizione inclinata allunga il bicipite prima della contrazione. Massimo stretch.' },
  { name:'Curl EZ-bar', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Bilanciere EZ', difficulty:'Principiante', tips:'La presa semi-prona riduce lo stress sui polsi rispetto al bilanciere dritto.' },
  { name:'Curl cavi alti (cable curl)', muscle:'Bicipiti', secondary:'Deltoidi anteriori', equipment:'Cavi', difficulty:'Principiante', tips:'Tieni i gomiti fissi ad altezza spalle. Tensione costante sul picco del bicipite.' },
  { name:'Tricep pushdown (corda)', muscle:'Tricipiti', secondary:'-', equipment:'Cavi', difficulty:'Principiante', tips:'Usa la corda per aprire le mani in basso. Gomiti fissi ai fianchi, massima contrazione.' },
  { name:'Close grip bench press', muscle:'Tricipiti', secondary:'Petto, Deltoidi', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Presa stretta (circa spalle). Abbassa il bilanciere sul basso petto, gomiti vicini al corpo.' },
  { name:'Squat goblet', muscle:'Gambe', secondary:'Glutei, Core', equipment:'Manubri', difficulty:'Principiante', tips:'Tieni il manubrio al petto. Ottimo per imparare la meccanica dello squat.' },
  { name:'Hack squat (macchina)', muscle:'Gambe', secondary:'Glutei', equipment:'Macchina', difficulty:'Intermedio', tips:'Piedi posizionati in alto per più glutei, in basso per più quadricipiti.' },
  { name:'Bulgarian split squat', muscle:'Gambe', secondary:'Glutei, Core', equipment:'Manubri', difficulty:'Avanzato', tips:'Piede posteriore su una panca. Scendi in verticale, non in avanti. Ottimo per il monopodalico.' },
  { name:'Stacco sumo', muscle:'Gambe', secondary:'Glutei, Schiena, Ischiocrurali', equipment:'Bilanciere', difficulty:'Avanzato', tips:'Piedi larghi e punte verso fuori. Coinvolge di più i glutei e gli adduttori rispetto al classico.' },
  { name:'Leg press (piedi alti)', muscle:'Gambe', secondary:'Glutei', equipment:'Macchina', difficulty:'Principiante', tips:'Piedi nella parte alta della pedana per enfatizzare glutei e bicipiti femorali.' },
  { name:'Calf raise seduto', muscle:'Polpacci', secondary:'-', equipment:'Macchina', difficulty:'Principiante', tips:'Colpisce il soleo più del gastrocnemio. Ginocchia a 90°, range of motion completo.' },
  { name:'Adductor machine', muscle:'Gambe', secondary:'Adduttori', equipment:'Macchina', difficulty:'Principiante', tips:"Movimento lento e controllato. Ottimo per la stabilità dell'anca." },
  { name:'Abductor machine', muscle:'Gambe', secondary:'Glutei medi', equipment:'Macchina', difficulty:'Principiante', tips:'Allena i glutei medi, fondamentali per la stabilità del ginocchio.' },
  { name:'Hip thrust (manubrio)', muscle:'Glutei', secondary:'Ischiocrurali', equipment:'Manubri', difficulty:'Principiante', tips:"Spalle sulla panca, manubrio sull'anca. Spingi verso il soffitto contraendo i glutei." },
  { name:'Glute kickback (cavo)', muscle:'Glutei', secondary:'Ischiocrurali', equipment:'Cavi', difficulty:'Principiante', tips:'Ancora il cavo alla caviglia. Calcia indietro mantenendo il core stabile.' },
  { name:'Sumo squat (manubrio)', muscle:'Glutei', secondary:'Adduttori, Quadricipiti', equipment:'Manubri', difficulty:'Principiante', tips:'Piedi larghi, punte aperte. Tieni il manubrio verticale tra le gambe.' },
  { name:'Crunch inverso', muscle:'Core', secondary:'-', equipment:'Corpo libero', difficulty:'Principiante', tips:'Porta le ginocchia verso il petto sollevando il bacino. Evita slanci.' },
  { name:'Mountain climber', muscle:'Core', secondary:'Spalle, Gambe', equipment:'Corpo libero', difficulty:'Principiante', tips:'Mantieni i fianchi bassi e il core attivo. Alterna rapidamente le gambe.' },
  { name:'Hollow body hold', muscle:'Core', secondary:'Spalle', equipment:'Corpo libero', difficulty:'Intermedio', tips:'Schiena piatta a terra, gambe e spalle sollevate. Tieni la posizione statica.' },
  { name:'Cable crunch', muscle:'Core', secondary:'-', equipment:'Cavi', difficulty:'Principiante', tips:'Inchinati verso il pavimento contraendo gli addominali, non piegando i fianchi.' },
  { name:'Side plank', muscle:'Core', secondary:'Glutei medi', equipment:'Corpo libero', difficulty:'Principiante', tips:'Corpo in linea retta di lato. Tieni i fianchi sollevati per tutto il tempo.' },
];

export let MUSCLE_GROUPS = [...new Set(EXERCISE_DB.map(function(e){ return e.muscle; }))];

// Carica esercizi personalizzati da localStorage
(function() {
  try {
    const customs = JSON.parse(localStorage.getItem('gymCustomExercises') || '[]');
    customs.forEach(function(ex) {
      if (!EXERCISE_DB.find(function(e){ return e.name === ex.name; })) {
        EXERCISE_DB.push(ex);
      }
    });
    MUSCLE_GROUPS.length = 0;
    [...new Set(EXERCISE_DB.map(function(e){ return e.muscle; }))].forEach(function(m){ MUSCLE_GROUPS.push(m); });
  } catch(e) {}
})();

const B = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const EXERCISE_IMAGES = {
  'Panca piana (bilanciere)':       B+'Barbell_Bench_Press_-_Medium_Grip/0.jpg',
  'Panca inclinata (bilanciere)':   B+'Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg',
  'Panca piana (manubri)':          B+'Dumbbell_Bench_Press/0.jpg',
  'Croci con manubri':              B+'Dumbbell_Flyes/0.jpg',
  'Dip (petto)':                    B+'Dips_-_Chest_Version/0.jpg',
  'Push-up':                        B+'Push-up_/0.jpg',
  'Cable crossover':                B+'Cable_Crossover/0.jpg',
  'Trazioni (Pull-up)':             B+'Pull-Up/0.jpg',
  'Lat machine presa larga':        B+'Wide-Grip_Front_Lat_Pulldown/0.jpg',
  'Rematore con bilanciere':        B+'Bent_Over_Barbell_Row/0.jpg',
  'Rematore con manubrio (un braccio)': B+'One-Arm_Dumbbell_Row/0.jpg',
  'Stacco da terra':                B+'Barbell_Deadlift/0.jpg',
  'Facepull':                       B+'Face_Pull/0.jpg',
  'Pulley basso':                   B+'Seated_Cable_Rows/0.jpg',
  'Lento avanti (bilanciere)':      B+'Barbell_Shoulder_Press/0.jpg',
  'Lento avanti (manubri)':         B+'Dumbbell_Shoulder_Press/0.jpg',
  'Alzate laterali':                B+'Side_Lateral_Raise/0.jpg',
  'Alzate frontali':                B+'Front_Dumbbell_Raise/0.jpg',
  'Alzate posteriori (reverse fly)':B+'Reverse_Flyes/0.jpg',
  'Arnold press':                   B+'Arnold_Dumbbell_Press/0.jpg',
  'Curl bilanciere':                B+'Barbell_Curl/0.jpg',
  'Curl manubri alternati':         B+'Dumbbell_Alternate_Bicep_Curl/0.jpg',
  'Curl martello':                  B+'Hammer_Curls/0.jpg',
  'Curl cavi bassi':                B+'Cable_Hammer_Curls_-_Rope_Attachment/0.jpg',
  'Curl concentrato':               B+'Concentration_Curls/0.jpg',
  'French press (skullcrusher)':    B+'EZ-Bar_Skullcrusher/0.jpg',
  'Dip (tricipiti)':                B+'Dips_-_Triceps_Version/0.jpg',
  'Pushdown cavi (presa stretta)':  B+'Triceps_Pushdown_-_Rope_Attachment/0.jpg',
  'Overhead tricep extension':      B+'Cable_Rope_Overhead_Triceps_Extension/0.jpg',
  'Kickback tricipiti':             B+'Tricep_Dumbbell_Kickback/0.jpg',
  'Squat (bilanciere)':             B+'Barbell_Full_Squat/0.jpg',
  'Leg press':                      B+'Leg_Press/0.jpg',
  'Affondi (lunges)':               B+'Barbell_Lunge/0.jpg',
  'Leg curl (sdraiato)':            B+'Lying_Leg_Curls/0.jpg',
  'Leg extension':                  B+'Leg_Extensions/0.jpg',
  'Romanian deadlift':              B+'Romanian_Deadlift/0.jpg',
  'Hip thrust':                     B+'Barbell_Hip_Thrust/0.jpg',
  'Calf raise in piedi':            B+'Standing_Calf_Raises/0.jpg',
  'Plank':                          B+'Plank/0.jpg',
  'Crunch':                         B+'Crunch/0.jpg',
  'Russian twist':                  B+'Russian_Twist/0.jpg',
  'Leg raise':                      B+'Hanging_Leg_Raise/0.jpg',
  'Ab wheel rollout':               B+'Ab_Roller/0.jpg',
  'Pallof press':                   B+'Pallof_Press/0.jpg',
  'Panca declinata (bilanciere)':   B+'Decline_Barbell_Bench_Press/0.jpg',
  'Pullover con manubrio':          B+'Bent-Arm_Dumbbell_Pullover/0.jpg',
  'Chest press (macchina)':         B+'Smith_Machine_Bench_Press/0.jpg',
  'Trazioni (Chin-up)':             B+'Chin-Up/0.jpg',
  'T-bar row':                      B+'Lying_T-Bar_Row/0.jpg',
  'Shrug (alzate spalle)':          B+'Barbell_Shrug/0.jpg',
  'Iperextension (schiena)':        B+'Hyperextensions_Back_Extensions/0.jpg',
  'Lat machine presa stretta':      B+'Close-Grip_Front_Lat_Pulldown/0.jpg',
  'Upright row':                    B+'Upright_Barbell_Row/0.jpg',
  'Face pull con corda':            B+'Face_Pull/0.jpg',
  'Military press (in piedi)':      B+'Barbell_Shoulder_Press/0.jpg',
  'Curl su panca inclinata':        B+'Incline_Dumbbell_Curl/0.jpg',
  'Curl EZ-bar':                    B+'EZ-Bar_Curl/0.jpg',
  'Curl cavi alti (cable curl)':    B+'High_Cable_Curls/0.jpg',
  'Tricep pushdown (corda)':        B+'Triceps_Pushdown_-_Rope_Attachment/0.jpg',
  'Close grip bench press':         B+'Close-Grip_Barbell_Bench_Press/0.jpg',
  'Squat goblet':                   B+'Goblet_Squat/0.jpg',
  'Hack squat (macchina)':          B+'Hack_Squat/0.jpg',
  'Bulgarian split squat':          B+'Split_Squat_with_Dumbbells/0.jpg',
  'Stacco sumo':                    B+'Sumo_Deadlift/0.jpg',
  'Leg press (piedi alti)':         B+'Leg_Press/0.jpg',
  'Calf raise seduto':              B+'Seated_Calf_Raise/0.jpg',
  'Adductor machine':               B+'Adductor/0.jpg',
  'Abductor machine':               B+'Thigh_Abductor/0.jpg',
  'Hip thrust (manubrio)':          B+'Barbell_Hip_Thrust/0.jpg',
  'Glute kickback (cavo)':          B+'Glute_Kickback/0.jpg',
  'Sumo squat (manubrio)':          B+'Barbell_Full_Squat/0.jpg',
  'Crunch inverso':                 B+'Reverse_Crunch/0.jpg',
  'Mountain climber':               B+'Mountain_Climbers/0.jpg',
  'Hollow body hold':               B+'Plank/0.jpg',
  'Cable crunch':                   B+'Cable_Crunch/0.jpg',
  'Side plank':                     B+'Push_Up_to_Side_Plank/0.jpg',
};

export function showExerciseInfo(btn) {
  const name = btn.getAttribute('data-exname');
  const ex = EXERCISE_DB.find(function(e){ return e.name === name; });
  if (!ex) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:22px;max-width:360px;width:100%;max-height:88vh;overflow-y:auto;';

  const imgWrap = document.createElement('div');
  imgWrap.style.cssText = 'width:100%;height:190px;background:rgba(255,255,255,0.04);border-radius:12px;margin-bottom:16px;overflow:hidden;display:flex;align-items:center;justify-content:center;';
  imgWrap.innerHTML = '<span style="color:#555;font-size:0.7rem;">⏳ Caricamento immagine...</span>';
  box.appendChild(imgWrap);

  const infoDiv = document.createElement('div');
  infoDiv.innerHTML =
    '<div style="font-size:1rem;font-weight:800;color:#fff;margin-bottom:4px;">' + ex.name + '</div>' +
    '<div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">' + ex.muscle + (ex.secondary && ex.secondary !== '-' ? ' · ' + ex.secondary : '') + '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">' +
      '<span style="background:rgba(255,255,255,0.06);border-radius:8px;padding:4px 10px;font-size:0.72rem;color:#aaa;">🏋️ ' + ex.equipment + '</span>' +
      '<span style="background:rgba(255,255,255,0.06);border-radius:8px;padding:4px 10px;font-size:0.72rem;color:#aaa;">📊 ' + ex.difficulty + '</span>' +
    '</div>' +
    (ex.tips ? '<div style="font-size:0.8rem;color:#ccc;line-height:1.5;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">' + ex.tips + '</div>' : '');
  box.appendChild(infoDiv);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Chiudi';
  closeBtn.style.cssText = 'margin-top:16px;width:100%;background:rgba(255,255,255,0.06);color:#aaa;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px;font-size:0.78rem;font-weight:700;';
  closeBtn.onclick = function() { overlay.remove(); };
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  overlay.onclick = function(e){ if(e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);

  const imgUrl = EXERCISE_IMAGES[ex.name];
  if (imgUrl) {
    const img = document.createElement('img');
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
    img.alt = ex.name;
    img.onload = function() {
      imgWrap.innerHTML = '';
      imgWrap.style.background = 'rgba(255,255,255,0.02)';
      imgWrap.appendChild(img);
    };
    img.onerror = function() {
      imgWrap.innerHTML = '<span style="color:#555;font-size:0.7rem;">Immagine non disponibile</span>';
    };
    img.src = imgUrl;
  } else {
    imgWrap.style.display = 'none';
  }
}

export function showExerciseDB() {
  window.scrollTo(0,0);
  const main = document.getElementById('mainContent');
  main.innerHTML = '';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = function() { window.showSettings(); };
  main.appendChild(backBtn);
  const title = document.createElement('h2');
  title.textContent = 'Database Esercizi';
  main.appendChild(title);

  const filterDiv = document.createElement('div');
  filterDiv.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;';
  let muscleOpts = '<option value="all">Tutti i muscoli</option>';
  MUSCLE_GROUPS.forEach(function(m){ muscleOpts += '<option value="'+m+'">'+m+'</option>'; });
  const allEquipment = [...new Set(EXERCISE_DB.map(function(e){ return e.equipment; }))].sort();
  let equipOpts = '<option value="all">Tutta l\'attrezzatura</option>';
  allEquipment.forEach(function(eq){ equipOpts += '<option value="'+eq+'">'+eq+'</option>'; });
  const diffOpts = '<option value="all">Qualsiasi difficoltà</option><option value="Principiante">Principiante</option><option value="Intermedio">Intermedio</option><option value="Avanzato">Avanzato</option>';
  filterDiv.innerHTML =
    '<div><label>Muscolo</label><select id="dbMuscleFilter" style="width:100%">'+muscleOpts+'</select></div>' +
    '<div><label>Attrezzatura</label><select id="dbEquipFilter" style="width:100%">'+equipOpts+'</select></div>' +
    '<div><label>Difficoltà</label><select id="dbDiffFilter" style="width:100%">'+diffOpts+'</select></div>' +
    '<div><label>Cerca</label><input type="text" id="dbSearch" placeholder="🔍 Nome esercizio..." style="width:100%;box-sizing:border-box;"></div>';
  main.appendChild(filterDiv);

  const listDiv = document.createElement('div');
  listDiv.id = 'dbList';
  main.appendChild(listDiv);

  const muscleColors = {'Petto':'#e63946','Schiena':'#4361ee','Spalle':'#f39c12','Bicipiti':'#2ecc71','Tricipiti':'#9b59b6','Gambe':'#4cc9f0','Glutei':'#e67e22','Polpacci':'#1abc9c','Core':'#e91e8c'};
  const diffColors = {'principiante':'#2ecc71','intermedio':'#f39c12','avanzato':'#e63946'};

  function renderDB() {
    const filter = document.getElementById('dbMuscleFilter').value;
    const equipFilter = document.getElementById('dbEquipFilter').value;
    const diffFilter = document.getElementById('dbDiffFilter').value;
    const search = document.getElementById('dbSearch').value.toLowerCase().trim();
    const filtered = EXERCISE_DB.filter(function(e){
      return (filter === 'all' || e.muscle === filter) &&
             (equipFilter === 'all' || e.equipment === equipFilter) &&
             (diffFilter === 'all' || e.difficulty === diffFilter) &&
             (!search || e.name.toLowerCase().includes(search) || e.muscle.toLowerCase().includes(search) || e.equipment.toLowerCase().includes(search));
    });
    listDiv.innerHTML = '';
    if(filtered.length === 0){ listDiv.innerHTML = '<p>Nessun esercizio trovato.</p>'; return; }
    const frag = document.createDocumentFragment();
    filtered.forEach(function(ex) {
      const color = muscleColors[ex.muscle] || '#888';
      const diffColor = diffColors[ex.difficulty.toLowerCase()] || '#888';
      const card = document.createElement('div');
      card.className = 'exercise-card';
      card.style.borderLeft = '3px solid ' + color;
      card.style.marginBottom = '10px';
      const nameEl = document.createElement('strong');
      nameEl.textContent = ex.name;
      card.appendChild(nameEl);
      const metaDiv = document.createElement('div');
      metaDiv.className = 'ex-meta-row';
      metaDiv.style.marginBottom = '6px';
      metaDiv.innerHTML =
        '<span class="pr-badge" style="color:'+color+';background:'+color+'18;border-color:'+color+'33">'+ex.muscle+'</span>' +
        '<span class="orm-badge" style="color:#888;background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1)">'+ex.equipment+'</span>' +
        '<span class="pr-badge" style="color:'+diffColor+';background:'+diffColor+'18;border-color:'+diffColor+'33">'+ex.difficulty+'</span>';
      card.appendChild(metaDiv);
      if(ex.secondary && ex.secondary !== '-') {
        const sec = document.createElement('div');
        sec.style.cssText = 'font-size:0.72rem;color:#888;margin-bottom:6px;';
        sec.textContent = 'Secondari: ' + ex.secondary;
        card.appendChild(sec);
      }
      const tips = document.createElement('div');
      tips.style.cssText = 'font-size:0.76rem;color:#aaa;margin-bottom:10px;line-height:1.5;';
      tips.textContent = '💡 ' + ex.tips;
      card.appendChild(tips);
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;';

      const infoBtn = document.createElement('button');
      infoBtn.setAttribute('data-exname', ex.name);
      infoBtn.style.cssText = 'background:rgba(255,255,255,0.05);color:#aaa;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:6px 12px;font-size:0.72rem;font-weight:700;';
      infoBtn.textContent = 'ℹ Dettagli';
      infoBtn.onclick = (function(b){ return function(){ showExerciseInfo(b); }; })(infoBtn);

      const addBtn = document.createElement('button');
      addBtn.style.cssText = 'flex:1;background:rgba(46,204,113,0.08);color:#2ecc71;border:1px solid rgba(46,204,113,0.2);border-radius:10px;padding:6px 14px;font-size:0.72rem;font-weight:700;';
      addBtn.textContent = '+ Aggiungi a scheda';
      addBtn.onclick = (function(name){ return function(){ showAddToDay(name); }; })(ex.name);

      btnRow.appendChild(infoBtn);
      btnRow.appendChild(addBtn);
      card.appendChild(btnRow);
      frag.appendChild(card);
    });
    listDiv.appendChild(frag);
  }

  document.getElementById('dbMuscleFilter').onchange = renderDB;
  document.getElementById('dbEquipFilter').onchange = renderDB;
  document.getElementById('dbDiffFilter').onchange = renderDB;
  document.getElementById('dbSearch').oninput = renderDB;
  renderDB();

  const addCustomBtn = document.createElement('button');
  addCustomBtn.style.cssText = 'margin-top:16px;width:100%;background:rgba(46,204,113,0.08);color:#2ecc71;border:1px solid rgba(46,204,113,0.2);border-radius:12px;padding:10px;font-size:0.78rem;font-weight:700;';
  addCustomBtn.textContent = '+ Aggiungi esercizio personalizzato';
  addCustomBtn.onclick = function() { addCustomBtn.style.display = 'none'; customForm.style.display = 'flex'; };
  main.appendChild(addCustomBtn);

  const customForm = document.createElement('div');
  customForm.className = 'card form-card';
  customForm.style.cssText = 'display:none;margin-top:12px;';
  const muscleOptions = MUSCLE_GROUPS.map(function(m){ return '<option value="'+m+'">'+m+'</option>'; }).join('');
  customForm.innerHTML =
    '<div style="font-size:0.78rem;font-weight:700;color:#2ecc71;margin-bottom:8px;">✏️ Nuovo esercizio</div>' +
    '<label>Nome</label><input type="text" id="customExName" placeholder="es. Curl manubri"><br>' +
    '<label>Muscolo principale</label>' +
    '<select id="customExMuscle" style="width:100%;margin-bottom:6px;">'+muscleOptions+'</select>' +
    '<label>Muscoli secondari (opzionale)</label><input type="text" id="customExSecondary" placeholder="es. Avambracci"><br>' +
    '<label>Attrezzatura</label><input type="text" id="customExEquip" placeholder="es. Manubri"><br>' +
    '<label>Difficoltà</label>' +
    '<select id="customExDiff" style="width:100%;margin-bottom:6px;"><option>Principiante</option><option>Intermedio</option><option>Avanzato</option></select>' +
    '<label>Consiglio tecnico (opzionale)</label><input type="text" id="customExTips" placeholder="es. Tieni i gomiti fermi">';

  const formBtns = document.createElement('div');
  formBtns.style.cssText = 'display:flex;gap:8px;margin-top:10px;width:100%;';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Annulla';
  cancelBtn.style.cssText = 'flex:1;';
  cancelBtn.onclick = function() { customForm.style.display = 'none'; addCustomBtn.style.display = 'block'; };

  const saveCustomBtn = document.createElement('button');
  saveCustomBtn.textContent = 'Salva';
  saveCustomBtn.style.cssText = 'flex:1;background:rgba(46,204,113,0.12);color:#2ecc71;border-color:rgba(46,204,113,0.3);';
  saveCustomBtn.onclick = function() {
    const name = document.getElementById('customExName').value.trim();
    if (!name) { showToast('Inserisci un nome.', 'error'); return; }
    const newEx = {
      name: name,
      muscle: document.getElementById('customExMuscle').value,
      secondary: document.getElementById('customExSecondary').value.trim() || '-',
      equipment: document.getElementById('customExEquip').value.trim() || '-',
      difficulty: document.getElementById('customExDiff').value,
      tips: document.getElementById('customExTips').value.trim() || '',
      custom: true
    };
    EXERCISE_DB.push(newEx);
    MUSCLE_GROUPS.length = 0;
    [...new Set(EXERCISE_DB.map(function(e){ return e.muscle; }))].forEach(function(m){ MUSCLE_GROUPS.push(m); });
    const customs = EXERCISE_DB.filter(function(e){ return e.custom; });
    localStorage.setItem('gymCustomExercises', JSON.stringify(customs));
    showToast('Esercizio aggiunto!');
    customForm.style.display = 'none';
    addCustomBtn.style.display = 'block';
    renderDB();
  };

  formBtns.appendChild(cancelBtn);
  formBtns.appendChild(saveCustomBtn);
  customForm.appendChild(formBtns);
  main.appendChild(customForm);
}

export function showAddToDay(exName) {
  if(!data.days || data.days.length === 0){ showToast('Crea prima una scheda!','error'); return; }
  showModal({
    title: '+ Aggiungi a scheda',
    message: '"' + exName + '"',
    inputs: [
      {id:'dbDay',    label:'Scheda', type:'select', options: data.days.map(function(d,i){ return {value:String(i), label:d.name}; })},
      {id:'dbSets',   label:'Serie',       type:'number', value: data.settings.defaultSets||3,  min:1},
      {id:'dbReps',   label:'Ripetizioni', type:'number', value: data.settings.defaultReps||10, min:1},
      {id:'dbWeight', label:'Peso (kg)',   type:'number', value: 0, min:0, step:0.5},
    ],
    buttons: [{label:'Annulla',cls:'btn-modal-cancel',value:'cancel'},{label:'Aggiungi',cls:'btn-modal-confirm',value:'add'}],
    onClose: function(val, vals) {
      if(val === 'cancel') return;
      const dayIdx = parseInt(vals['dbDay']);
      if(isNaN(dayIdx) || dayIdx < 0 || dayIdx >= data.days.length){ showToast('Scheda non valida.','error'); return; }
      data.days[dayIdx].exercises.push({
        name: exName,
        sets: parseInt(vals['dbSets'])||3,
        reps: parseInt(vals['dbReps'])||10,
        weight: parseFloat(String(vals['dbWeight']).replace(',','.'))||0,
      });
      saveData();
      showToast('"'+exName+'" aggiunto a '+data.days[dayIdx].name+'!');
    }
  });
}
