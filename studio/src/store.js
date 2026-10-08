import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStudio = create(
  persist(
    (set) => ({
      wrapId: 'khaki',
      vehicle: 'cybertruck',
      finish: 'satin',
      coverage: 'full',
      category: 'all',
      panel: 'films', // films | tune | yours
      autoRotate: false,
      customSrc: null,
      customFit: { x: 0, y: 0, scale: 1 },
      upload: null,
      toast: null,

      setWrapId: (wrapId) => set({ wrapId, panel: 'films' }),
      setVehicle: (vehicle) => set({ vehicle }),
      setFinish: (finish) => set({ finish }),
      setCoverage: (coverage) => set({ coverage }),
      setCategory: (category) => set({ category }),
      setPanel: (panel) => set({ panel }),
      setAutoRotate: (autoRotate) => set({ autoRotate }),
      setCustomSrc: (customSrc) => set({ customSrc }),
      setCustomFit: (customFit) => set({ customFit }),
      clearCustom: () => set({ customSrc: null, customFit: { x: 0, y: 0, scale: 1 } }),
      setUpload: (upload) => set({ upload }),
      clearUpload: () => set({ upload: null }),
      setToast: (toast) => set({ toast }),
    }),
    {
      name: 'ad-wrap-studio',
      partialize: (s) => ({
        wrapId: s.wrapId,
        vehicle: s.vehicle,
        finish: s.finish,
        coverage: s.coverage,
        autoRotate: s.autoRotate,
      }),
    },
  ),
)
