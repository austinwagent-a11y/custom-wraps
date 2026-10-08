import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStudio = create(
  persist(
    (set, get) => ({
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

      setWrapId: (wrapId) => {
        get().clearCustom()
        set({ wrapId, panel: 'films' })
      },
      setVehicle: (vehicle) => set({ vehicle, ...(vehicle === 'model3' ? { coverage: 'full' } : {}) }),
      setFinish: (finish) => set({ finish }),
      setCoverage: (coverage) => set({ coverage }),
      setCategory: (category) => set({ category }),
      setPanel: (panel) => set({ panel }),
      setAutoRotate: (autoRotate) => set({ autoRotate }),
      setCustomSrc: (customSrc) => {
        if (get().customSrc) URL.revokeObjectURL(get().customSrc)
        set({ customSrc, customFit: { x: 0, y: 0, scale: 1 } })
      },
      setCustomFit: (customFit) => set({ customFit }),
      clearCustom: () => get().setCustomSrc(null),
      setUpload: (upload) => {
        if (get().upload?.url) URL.revokeObjectURL(get().upload.url)
        set({ upload })
      },
      clearUpload: () => get().setUpload(null),
      setToast: (toast) => set({ toast }),
    }),
    {
      name: 'ad-wrap-studio',
      merge: (saved, current) => ({
        ...current,
        ...saved,
        ...(saved?.vehicle === 'model3' ? { coverage: 'full' } : {}),
      }),
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
