import { create } from 'zustand';


export const useUIStateStore = create((set) => ({
  selectedTFs: new Map(/**rowId: [...tfNames]*/),
  
  setSelectedTF: (rowId, tfName, selected) => set((state) => {
    console.log('setSelectedTF', rowId, tfName, selected);
    const selectedTFs = new Map(state.selectedTFs);
    if (selected) {
      if (selectedTFs.has(rowId)) {
        selectedTFs.get(rowId).add(tfName);
      } else {
        selectedTFs.set(rowId, new Set([tfName]));
      }
    } else {
      if (selectedTFs.has(rowId)) {
        selectedTFs.get(rowId).delete(tfName);
        if (selectedTFs.get(rowId).size === 0) {
          selectedTFs.delete(rowId);
        }
      }
    }
    console.log('selectedTFs', selectedTFs);
    return { selectedTFs };
  }),
}));
