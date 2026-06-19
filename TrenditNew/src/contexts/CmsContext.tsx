import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';

export type SectionId = 'Hero' | 'Categories' | 'FeaturedProducts' | 'LocalStores' | 'Banner' | 'WhyShop';

export interface CmsSection {
  id: SectionId;
  name: string;
  type: string;
  active: boolean;
}

interface CmsContextType {
  sections: CmsSection[];
  primaryColor: string;
  fontFamily: string;
  loading: boolean;
  moveSectionUp: (index: number) => void;
  moveSectionDown: (index: number) => void;
  toggleSectionStatus: (id: SectionId) => void;
  setPrimaryColor: (color: string) => void;
  setFontFamily: (font: string) => void;
  saveConfig: () => Promise<void>;
}

const defaultSections: CmsSection[] = [
  { id: 'Hero', name: 'Hero Banner', type: 'Image/Text', active: true },
  { id: 'Categories', name: 'Shop Categories Grid', type: 'Collection', active: true },
  { id: 'FeaturedProducts', name: 'Featured Products Slider', type: 'Products', active: true },
  { id: 'Banner', name: 'Promotional Timer Banner', type: 'Text/Timer', active: true },
  { id: 'LocalStores', name: 'Local Lebanese Stores', type: 'Cards', active: true },
  { id: 'WhyShop', name: 'Value Propositions', type: 'Cards', active: true },
];

const CmsContext = createContext<CmsContextType | undefined>(undefined);

export const CmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sections, setSections] = useState<CmsSection[]>(defaultSections);
  const [primaryColor, setPrimaryColor] = useState('#0452C8');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'cms', 'config'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.sections) setSections(data.sections);
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
        if (data.fontFamily) setFontFamily(data.fontFamily);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'cms/config');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', primaryColor);
    document.documentElement.style.setProperty('--color-primary-hover', primaryColor);
    document.documentElement.style.setProperty('--font-sans', `${fontFamily}, ui-sans-serif, system-ui, sans-serif`);
    document.documentElement.style.setProperty('--font-display', `${fontFamily}, ui-sans-serif, system-ui, sans-serif`);
  }, [primaryColor, fontFamily]);

  const saveConfig = async () => {
    try {
      await setDoc(doc(db, 'cms', 'config'), {
        sections,
        primaryColor,
        fontFamily,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cms/config');
    }
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    setSections((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return;
    setSections((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const toggleSectionStatus = (id: SectionId) => {
    setSections((prev) => 
      prev.map(sec => sec.id === id ? { ...sec, active: !sec.active } : sec)
    );
  };

  return (
    <CmsContext.Provider value={{
      sections,
      primaryColor,
      fontFamily,
      loading,
      moveSectionUp,
      moveSectionDown,
      toggleSectionStatus,
      setPrimaryColor,
      setFontFamily,
      saveConfig
    }}>
      {children}
    </CmsContext.Provider>
  );
};

export const useCms = () => {
  const context = useContext(CmsContext);
  if (!context) throw new Error("useCms must be used within CmsProvider");
  return context;
};
