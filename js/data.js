export let data = {
  settings: { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 },
  days: [],
  progress: []
};

export function saveData() {
  localStorage.setItem('gymAppData', JSON.stringify(data));
}

export function loadData() {
  const stored = localStorage.getItem('gymAppData');
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    Object.keys(data).forEach(k => delete data[k]);
    Object.assign(data, parsed);
    if (!data.progress) data.progress = [];
    if (!data.settings) data.settings = { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 };
    if (!data.settings.restTime) data.settings.restTime = 90;
    if (!data.settings.lastSetTime) data.settings.lastSetTime = 60;
    if (!data.settings.defaultSets) data.settings.defaultSets = 3;
    if (!data.settings.defaultReps) data.settings.defaultReps = 10;
    data.progress.forEach(function(p) {
      if (p.weightKg !== undefined && p.bodyWeightKg === undefined) {
        p.bodyWeightKg = p.weightKg;
        delete p.weightKg;
      }
    });
    saveData();
  } catch(e) {
    Object.keys(data).forEach(k => delete data[k]);
    Object.assign(data, {
      settings: { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 },
      days: [],
      progress: []
    });
    saveData();
  }
}
