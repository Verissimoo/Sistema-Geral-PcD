const store = (key) => {
  const getAll = () => JSON.parse(localStorage.getItem(key) || '[]');
  const saveAll = (items) => localStorage.setItem(key, JSON.stringify(items));
  return {
    list: () => Promise.resolve(getAll()),
    get: (id) => Promise.resolve(getAll().find(i => i.id === id) || null),
    create: (data) => {
      const items = getAll();
      const newItem = { ...data, id: crypto.randomUUID(), created_date: new Date().toISOString() };
      saveAll([...items, newItem]);
      return Promise.resolve(newItem);
    },
    update: (id, data) => {
      const items = getAll().map(i => i.id === id ? { ...i, ...data } : i);
      saveAll(items);
      return Promise.resolve(items.find(i => i.id === id));
    },
    delete: (id) => {
      saveAll(getAll().filter(i => i.id !== id));
      return Promise.resolve({ success: true });
    },
    filter: (query) => Promise.resolve(
      getAll().filter(item => Object.entries(query).every(([k, v]) => item[k] === v))
    ),
  };
};

export const localClient = {
  entities: {
    Contractor: store('pcd_contractors'),
    Project: store('pcd_projects'),
    Ritual: store('pcd_rituals'),
  }
};
